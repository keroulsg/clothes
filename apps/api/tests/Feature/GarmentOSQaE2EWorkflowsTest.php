<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\CustomerMaterialReceipt;
use App\Models\Employee;
use App\Models\ExternalOperation;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\JournalEntry;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\StoreOrder;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use Database\Seeders\GarmentOSQaSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GarmentOSQaE2EWorkflowsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(GarmentOSQaSeeder::class);
    }

    protected function asTenant(Tenant $tenant, User $user): void
    {
        app()->instance('current_tenant_id', $tenant->id);
        $this->actingAs($user);
    }

    /**
     * Journey A: Multi-Tenant and Role Isolation
     */
    public function test_journey_a_strict_multi_tenant_and_role_isolation(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $tenantB = Tenant::withoutGlobalScopes()->where('code', 'QA-EG902')->firstOrFail();

        $userA = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'company_owner')->firstOrFail();
        $userB = User::withoutGlobalScopes()->where('tenant_id', $tenantB->id)->where('role', 'company_owner')->firstOrFail();

        // 1. Act as Tenant A owner: can only see Tenant A's cutting orders
        $this->asTenant($tenantA, $userA);
        $cuttingOrdersA = CuttingOrder::all();
        $this->assertNotEmpty($cuttingOrdersA);
        foreach ($cuttingOrdersA as $co) {
            $this->assertEquals($tenantA->id, $co->tenant_id, "Tenant A user saw a non-Tenant A cutting order!");
        }

        // 2. Act as Tenant B owner: can only see Tenant B's cutting orders
        $this->asTenant($tenantB, $userB);
        $cuttingOrdersB = CuttingOrder::all();
        $this->assertNotEmpty($cuttingOrdersB);
        foreach ($cuttingOrdersB as $co) {
            $this->assertEquals($tenantB->id, $co->tenant_id, "Tenant B user saw a non-Tenant B cutting order!");
        }

        // 3. Mathematical proof of complete ID separation
        $idsA = $cuttingOrdersA->pluck('id')->all();
        $idsB = $cuttingOrdersB->pluck('id')->all();
        $this->assertEmpty(array_intersect($idsA, $idsB), "Tenant data leakage detected between Tenant A and B!");

        // 4. Fail-closed proof: when no tenant is bound, query returns empty
        app()->forgetInstance('current_tenant_id');
        $this->assertCount(0, CuttingOrder::all(), "TenantScope failed to fail-closed when current_tenant_id was unset!");
    }

    /**
     * Journey B: Procurement and 3-Way Matching
     */
    public function test_journey_b_procurement_grn_and_3way_matching(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $owner = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'company_owner')->firstOrFail();
        $this->asTenant($tenantA, $owner);

        $po = PurchaseOrder::where('po_number', 'QA_NILE-PO-2026-001')->firstOrFail();
        $this->assertEquals('approved', $po->status);
        $this->assertGreaterThan(0, $po->total_amount);

        // Verify GRN goods receipt
        $grn = \App\Models\GoodsReceiptNote::where('purchase_order_id', $po->id)->first();
        $this->assertNotNull($grn, "Purchase order must have a corresponding GRN goods receipt");
        $this->assertEquals('completed', $grn->status);

        // Verify 3-way matched supplier invoice
        $invoice = SupplierInvoice::where('purchase_order_id', $po->id)->firstOrFail();
        $this->assertEquals('matched', $invoice->matching_status);
        $this->assertEquals($po->total_amount, $invoice->total_amount, "Supplier invoice amount must match approved PO amount");
    }

    /**
     * Journey C: Fabric Inventory, GSM and Roll Meters
     */
    public function test_journey_c_fabric_inventory_gsm_and_immutable_ledger(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $custodian = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'inventory_custodian')->firstOrFail();
        $this->asTenant($tenantA, $custodian);

        $fabric = InventoryItem::where('code', 'QA_NILE-FAB-SJ-01')->firstOrFail();
        $this->assertEquals('fabric', $fabric->item_type);
        $this->assertEquals(180, $fabric->technical_specs['gsm']);
        $this->assertEquals(1.85, $fabric->technical_specs['usable_width']);

        // Verify immutable transaction log
        $tx = InventoryTransaction::where('inventory_item_id', $fabric->id)->firstOrFail();
        $this->assertEquals('IN', $tx->direction);
        $this->assertEquals(4500.0, $tx->balance_after);
        $this->assertEquals(0.0, $tx->balance_before);
    }

    /**
     * Journey D: Production Planning, BOMs, Cutting and Lay Optimization
     */
    public function test_journey_d_production_planning_bom_and_cutting_lays(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $prodMgr = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'production_manager')->firstOrFail();
        $this->asTenant($tenantA, $prodMgr);

        $prodOrder = ProductionOrder::where('order_number', 'QA_NILE-PO-2026-081')->firstOrFail();
        $this->assertEquals(1200, $prodOrder->total_planned_quantity);

        // Verify Cutting Order
        $cuttingOrder = CuttingOrder::where('production_order_id', $prodOrder->id)->firstOrFail();
        $this->assertEquals(88.4, $cuttingOrder->marker_efficiency_percent);
        $this->assertEquals(240, $cuttingOrder->total_cut_pieces);

        // Verify Serialized QR Bundles
        $bundles = CuttingBundle::where('cutting_order_id', $cuttingOrder->id)->get();
        $this->assertCount(3, $bundles);
        foreach ($bundles as $b) {
            $this->assertEquals(80, $b->quantity);
            $this->assertNotEmpty($b->bundle_code);
        }
    }

    /**
     * Journey E: Subcontracting, CMT, Customer Material Custody & Isolation
     */
    public function test_journey_e_cmt_customer_material_custody_and_isolation(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $owner = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'company_owner')->firstOrFail();
        $this->asTenant($tenantA, $owner);

        // Customer material receipt (CMR)
        $cmr = CustomerMaterialReceipt::where('receipt_number', 'QA_NILE-CMR-2026-01')->firstOrFail();
        $this->assertEquals(1250.0, $cmr->received_meters);

        // Job order
        $job = JobOrder::where('order_number', 'QA_NILE-JOB-2026-01')->firstOrFail();
        $this->assertEquals('customer_supplied', $job->fabric_source);

        // External operations dispatch (embroidery / print shop)
        $ext = ExternalOperation::where('job_order_id', $job->id)->firstOrFail();
        $this->assertEquals('dispatched', $ext->status);

        // Job Delivery Note and Service Fee Invoice (CMT)
        $dn = JobDeliveryNote::where('job_order_id', $job->id)->firstOrFail();
        $this->assertEquals(200, $dn->total_delivered_pieces);

        $jinv = JobInvoice::where('job_order_id', $job->id)->firstOrFail();
        $this->assertEquals(4218.0, $jinv->total_amount);
    }

    /**
     * Journey F: Piece-Rate Tracking, Work Logs, and Approved Payroll
     */
    public function test_journey_f_piece_rate_tracking_and_payroll_run(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $owner = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'company_owner')->firstOrFail();
        $this->asTenant($tenantA, $owner);

        $worker = Employee::where('employee_code', 'QA_NILE-EMP-01')->firstOrFail();
        $this->assertEquals('piece_rate', $worker->pay_type);

        $pieceRate = PieceRate::where('tenant_id', $tenantA->id)->firstOrFail();
        $this->assertEquals(3.75, $pieceRate->rate_per_piece);

        $workLog = PieceWorkLog::where('employee_id', $worker->id)->firstOrFail();
        $this->assertEquals(80, $workLog->completed_quantity);
        $this->assertEquals(300.0, $workLog->total_amount);

        // Payroll
        $payroll = Payroll::where('tenant_id', $tenantA->id)->firstOrFail();
        $this->assertEquals('approved', $payroll->status);

        $item = PayrollItem::where('payroll_id', $payroll->id)->firstOrFail();
        $this->assertEquals(300.0, $item->net_salary);
        $this->assertTrue($item->is_paid);
    }

    /**
     * Journey G: Financial Ledger, Costing, Double-Entry Balanced Entries
     */
    public function test_journey_g_balanced_double_entry_journal_vouchers(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $acct = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'financial_accountant')->firstOrFail();
        $this->asTenant($tenantA, $acct);

        $coas = ChartOfAccount::where('tenant_id', $tenantA->id)->get();
        $this->assertGreaterThanOrEqual(2, $coas->count());

        $jv = JournalEntry::where('entry_number', 'QA_NILE-JV-2026-001')->firstOrFail();
        $this->assertEquals($jv->total_debit, $jv->total_credit, "Journal entry is not mathematically balanced!");
        $this->assertEquals(129960.0, $jv->total_debit);

        $lines = $jv->lines;
        $this->assertCount(2, $lines);
        $this->assertEquals($lines->sum('debit'), $lines->sum('credit'));
    }

    /**
     * Journey H: Machine Maintenance and B2B Storefront Orders
     */
    public function test_journey_h_machine_maintenance_and_b2b_storefront(): void
    {
        $tenantA = Tenant::withoutGlobalScopes()->where('code', 'QA-EG901')->firstOrFail();
        $owner = User::withoutGlobalScopes()->where('tenant_id', $tenantA->id)->where('role', 'company_owner')->firstOrFail();
        $this->asTenant($tenantA, $owner);

        // Machine asset
        $machine = Machine::where('machine_code', 'QA_NILE-MCH-01')->firstOrFail();
        $this->assertEquals('operational', $machine->status);

        $mwo = MaintenanceWorkOrder::where('machine_id', $machine->id)->firstOrFail();
        $this->assertEquals('completed', $mwo->status);

        // Storefront
        $setting = TenantStoreSetting::where('tenant_id', $tenantA->id)->firstOrFail();
        $this->assertTrue($setting->is_store_enabled);

        $order = StoreOrder::where('tenant_id', $tenantA->id)->firstOrFail();
        $this->assertEquals('cod', $order->payment_method);
        $this->assertEquals(7590.0, $order->total_amount);
    }
}

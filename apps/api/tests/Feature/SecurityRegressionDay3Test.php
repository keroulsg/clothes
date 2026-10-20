<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\PieceRate;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\Quotation;
use App\Models\SalesOrder;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityRegressionDay3Test extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Branch $branchA;
    protected Branch $branchB;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected Customer $customerA;
    protected Customer $customerB;
    protected GarmentModel $modelA;
    protected GarmentModel $modelB;
    protected ProductVariant $variantA;
    protected ProductVariant $variantB;
    protected ChartOfAccount $accountA;
    protected ChartOfAccount $accountB;
    protected Employee $employeeA;
    protected Employee $employeeB;
    protected Machine $machineA;
    protected Machine $machineB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Tenant A Setup
        $this->tenantA = Tenant::create([
            'code' => 'TENANT-SEC-A',
            'name' => 'مصنع النيل للملابس',
            'subdomain' => 'nile-sec-a',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير النيل',
            'email' => 'admin@nile-sec-a.com',
            'password' => bcrypt('SecPass123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->branchA = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'فرع النيل الرئيسي',
            'code' => 'BR-NILE-01',
            'type' => 'factory',
        ]);

        $this->warehouseA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن النيل الرئيسي',
            'code' => 'WH-NILE-01',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
        ]);

        $this->customerA = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'عميل النيل الأول',
            'code' => 'CUST-A-01',
        ]);

        $this->modelA = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'فستان أطفال نيل',
            'code' => 'DRS-NILE-01',
            'category' => 'dresses',
            'wholesale_price' => 200.0,
            'retail_price' => 250.0,
        ]);

        $sizeA = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'سنة واحدة',
            'category' => 'kids',
            'sort_order' => 1,
        ]);

        $colorA = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر',
            'color_code' => '#FF0000',
        ]);

        $this->variantA = ProductVariant::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'size_id' => $sizeA->id,
            'color_id' => $colorA->id,
            'sku' => 'DRS-NILE-1Y-RED',
            'barcode' => '6221000000001',
            'wholesale_price' => 200.0,
            'retail_price' => 250.0,
        ]);

        $this->accountA = ChartOfAccount::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1010',
            'name' => 'خزينة النيل الرئيسية',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 1000.0,
            'is_active' => true,
        ]);

        $this->employeeA = Employee::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-NILE-01',
            'name' => 'عامل النيل',
            'department' => 'sewing',
            'job_title' => 'خياط',
            'pay_type' => 'piece_rate',
            'base_salary' => 3000.0,
            'is_active' => true,
        ]);

        $this->machineA = Machine::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'MCH-NILE-01',
            'name' => 'ماكينة خياطة جوكي نيل',
            'machine_type' => 'sewing',
            'status' => 'operational',
            'branch_id' => $this->branchA->id,
        ]);

        // 2. Tenant B Setup
        $this->tenantB = Tenant::create([
            'code' => 'TENANT-SEC-B',
            'name' => 'مصنع الأهرام للملابس',
            'subdomain' => 'ahram-sec-b',
            'status' => 'active',
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير الأهرام',
            'email' => 'admin@ahram-sec-b.com',
            'password' => bcrypt('SecPass123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->branchB = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'فرع الأهرام الرئيسي',
            'code' => 'BR-AHR-01',
            'type' => 'factory',
        ]);

        $this->warehouseB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مخزن الأهرام الرئيسي',
            'code' => 'WH-AHR-01',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
        ]);

        $this->customerB = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'عميل الأهرام الأول',
            'code' => 'CUST-B-01',
        ]);

        $this->modelB = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'قميص أهرام',
            'code' => 'SHT-AHR-01',
            'category' => 'shirts',
            'wholesale_price' => 150.0,
            'retail_price' => 190.0,
        ]);

        $sizeB = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'سنتان',
            'category' => 'kids',
            'sort_order' => 1,
        ]);

        $colorB = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'أزرق',
            'color_code' => '#0000FF',
        ]);

        $this->variantB = ProductVariant::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'garment_model_id' => $this->modelB->id,
            'size_id' => $sizeB->id,
            'color_id' => $colorB->id,
            'sku' => 'SHT-AHR-2Y-BLU',
            'barcode' => '6221000000002',
            'wholesale_price' => 150.0,
            'retail_price' => 190.0,
        ]);

        $this->accountB = ChartOfAccount::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'code' => '1010',
            'name' => 'خزينة الأهرام الرئيسية',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 2000.0,
            'is_active' => true,
        ]);

        $this->employeeB = Employee::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'employee_code' => 'EMP-AHR-01',
            'name' => 'عامل الأهرام',
            'department' => 'sewing',
            'job_title' => 'خياط',
            'pay_type' => 'piece_rate',
            'base_salary' => 3500.0,
            'is_active' => true,
        ]);

        $this->machineB = Machine::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'machine_code' => 'MCH-AHR-01',
            'name' => 'ماكينة خياطة الأهرام',
            'machine_type' => 'sewing',
            'status' => 'operational',
            'branch_id' => $this->branchB->id,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    /**
     * 1. IDOR Test: Tenant A cannot create a sales order referencing Tenant B's customer or variant
     */
    public function test_tenant_cannot_create_sales_order_with_foreign_customer_or_variant(): void
    {
        // Try referencing Tenant B's customer
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/sales/orders', [
                'customer_name' => 'Cross Tenant Test',
                'customer_id' => $this->customerB->id, // Tenant B
                'warehouse_id' => $this->warehouseA->id,
                'items' => [
                    [
                        'variant_id' => $this->variantA->id,
                        'ordered_quantity' => 10,
                        'unit_price' => 200,
                    ]
                ]
            ]);

        $response->assertStatus(404);

        // Try referencing Tenant B's product variant
        $response2 = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/sales/orders', [
                'customer_name' => 'Cross Tenant Test',
                'customer_id' => $this->customerA->id,
                'warehouse_id' => $this->warehouseA->id,
                'items' => [
                    [
                        'variant_id' => $this->variantB->id, // Tenant B
                        'ordered_quantity' => 10,
                        'unit_price' => 150,
                    ]
                ]
            ]);

        $response2->assertStatus(404);
    }

    /**
     * 2. IDOR Test: Tenant A cannot open a POS session with Tenant B's branch
     */
    public function test_tenant_cannot_open_pos_session_with_foreign_branch(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/pos/sessions/open', [
                'branch_id' => $this->branchB->id, // Tenant B
                'opening_cash' => 500.0,
            ]);

        $response->assertStatus(404);
    }

    /**
     * 3. IDOR Test: Tenant A cannot close Tenant B's POS session
     */
    public function test_tenant_cannot_close_foreign_pos_session(): void
    {
        $sessionB = PosSession::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'branch_id' => $this->branchB->id,
            'user_id' => $this->userB->id,
            'session_code' => 'POS-B-999',
            'opening_cash' => 500,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/pos/sessions/{$sessionB->id}/close", [
                'closing_cash' => 800,
            ]);

        $response->assertStatus(404);
    }

    /**
     * 4. Financial & IDOR Test: Payment voucher validates account ownership and updates balance accurately
     */
    public function test_payment_voucher_rejects_foreign_account_and_updates_balance_transactionally(): void
    {
        // Try using Tenant B's account
        $responseForeign = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/accounting/payment-vouchers', [
                'voucher_type' => 'receipt',
                'party_type' => 'customer',
                'party_name' => 'عميل محلي',
                'account_id' => $this->accountB->id, // Tenant B
                'amount' => 500.0,
                'payment_method' => 'cash',
            ]);

        $responseForeign->assertStatus(404);

        // Valid voucher on Tenant A's account (Receipt: +500)
        $responseValid = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/accounting/payment-vouchers', [
                'voucher_type' => 'receipt',
                'party_type' => 'customer',
                'party_name' => 'عميل محلي',
                'account_id' => $this->accountA->id,
                'amount' => 500.0,
                'payment_method' => 'cash',
            ]);

        $responseValid->assertStatus(201);
        $this->assertEquals(1500.0, (float)$this->accountA->fresh()->current_balance);

        // Valid voucher (Payment: -200)
        $responsePayment = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/accounting/payment-vouchers', [
                'voucher_type' => 'payment',
                'party_type' => 'other',
                'party_name' => 'مصروفات صيانة',
                'account_id' => $this->accountA->id,
                'amount' => 200.0,
                'payment_method' => 'cash',
            ]);

        $responsePayment->assertStatus(201);
        $this->assertEquals(1300.0, (float)$this->accountA->fresh()->current_balance);
    }

    /**
     * 5. Financial Integrity Test: Unbalanced journal entry is rejected
     */
    public function test_unbalanced_journal_entry_is_rejected(): void
    {
        $accountExpense = ChartOfAccount::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => '5010',
            'name' => 'تكلفة خامات',
            'type' => 'expense',
            'category' => 'direct_cost',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'قيد غير متوازن',
                'lines' => [
                    ['account_id' => $this->accountA->id, 'debit' => 1000.0, 'credit' => 0],
                    ['account_id' => $accountExpense->id, 'debit' => 0, 'credit' => 950.0], // Unbalanced!
                ]
            ]);

        $response->assertStatus(500); // InvalidArgumentException thrown and unposted
    }

    /**
     * 6. HR & Payroll Test: Piece rate cannot reference foreign garment model
     */
    public function test_cannot_create_piece_rate_with_foreign_garment_model(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/hr/piece-rates', [
                'stage_name' => 'sewing',
                'operation_name' => 'تركيب أزرار',
                'rate_per_piece' => 2.50,
                'garment_model_id' => $this->modelB->id, // Tenant B
            ]);

        $response->assertStatus(404);
    }

    /**
     * 7. Maintenance & Inventory Test: Spare part consumption from inventory updates inventory transactions
     */
    public function test_spare_part_consumption_verifies_tenant_and_records_inventory_transaction(): void
    {
        $sparePartItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'item_type' => 'spare_parts',
            'code' => 'SPR-NEEDLE-01',
            'name' => 'إبرة ماكينة جوكي رقم 14',
            'unit_of_measure' => 'pcs',
            'current_balance' => 50.0,
            'average_cost' => 15.0,
            'is_customer_owned' => false,
        ]);

        $workOrder = MaintenanceWorkOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'machine_id' => $this->machineA->id,
            'order_number' => 'MNT-WO-TEST-01',
            'work_type' => 'preventive',
            'priority' => 'medium',
            'status' => 'in_progress',
            'issue_description' => 'تغيير إبر وضبط كروشيه',
            'scheduled_date' => now()->toDateString(),
        ]);

        // Attempt consuming Tenant B's inventory item
        $foreignSpareItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'warehouse_id' => $this->warehouseB->id,
            'item_type' => 'spare_parts',
            'code' => 'SPR-FOREIGN-01',
            'name' => 'قطعة غيار أهرام',
            'unit_of_measure' => 'pcs',
            'current_balance' => 20.0,
            'average_cost' => 100.0,
            'is_customer_owned' => false,
        ]);

        $responseForeign = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/maintenance/work-orders/{$workOrder->id}/spare-parts", [
                'part_name' => 'قطعة أجنبية',
                'quantity' => 1,
                'unit_cost' => 100,
                'inventory_item_id' => $foreignSpareItem->id, // Tenant B
            ]);

        $responseForeign->assertStatus(404);

        // Valid spare part consumption from Tenant A's inventory
        $responseValid = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/maintenance/work-orders/{$workOrder->id}/spare-parts", [
                'part_name' => 'إبرة ماكينة جوكي رقم 14',
                'quantity' => 5,
                'unit_cost' => 15,
                'inventory_item_id' => $sparePartItem->id,
            ]);

        $responseValid->assertStatus(201);
        $this->assertEquals(45.0, (float)$sparePartItem->fresh()->current_balance);

        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $sparePartItem->id,
            'direction' => 'OUT',
            'transaction_type' => 'maintenance_consumption',
            'quantity' => 5,
        ]);
    }

    /**
     * 8. IDOR Test: Tenant cannot create quotation with foreign customer or variant
     */
    public function test_tenant_cannot_create_quotation_with_foreign_customer_or_variant(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/sales/quotations', [
                'customer_name' => 'Foreign Cust Quote',
                'customer_id' => $this->customerB->id, // Tenant B
                'items' => [
                    [
                        'variant_id' => $this->variantA->id,
                        'description' => 'Test Item',
                        'quantity' => 5,
                        'unit_price' => 100,
                    ]
                ]
            ]);

        $response->assertStatus(404);
    }

    /**
     * 9. IDOR Test: Tenant cannot create delivery note with foreign warehouse
     */
    public function test_tenant_cannot_create_delivery_note_with_foreign_warehouse(): void
    {
        $order = SalesOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'Local Cust',
            'order_number' => 'SO-DELIV-TEST-01',
            'status' => 'confirmed',
            'subtotal' => 1000,
            'total_amount' => 1000,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/sales/delivery-notes', [
                'sales_order_id' => $order->id,
                'warehouse_id' => $this->warehouseB->id, // Tenant B
            ]);

        $response->assertStatus(404);
    }

    /**
     * 10. IDOR Test: Tenant cannot create sales return with foreign warehouse or variant
     */
    public function test_tenant_cannot_create_sales_return_with_foreign_resources(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/sales/returns', [
                'warehouse_id' => $this->warehouseB->id, // Tenant B
                'reason' => 'Defect return',
                'items' => [
                    [
                        'variant_id' => $this->variantA->id,
                        'quantity' => 2,
                        'unit_price' => 100,
                    ]
                ]
            ]);

        $response->assertStatus(404);
    }

    /**
     * 11. IDOR Test: Machine cannot be registered under foreign branch
     */
    public function test_tenant_cannot_register_machine_with_foreign_branch(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/maintenance/machines', [
                'machine_code' => 'MCH-NEW-01',
                'name' => 'Sewing Machine New',
                'machine_type' => 'sewing',
                'branch_id' => $this->branchB->id, // Tenant B
            ]);

        $response->assertStatus(404);
    }

    /**
     * 12. Payroll Duplicate Prevention: Reject duplicate payroll generation on paid period
     */
    public function test_payroll_rejects_duplicate_generation_for_paid_period(): void
    {
        \App\Models\Payroll::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'payroll_period' => '2026-10',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
            'status' => 'paid',
            'total_gross' => 5000,
            'total_net' => 5000,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/hr/payrolls/generate', [
                'payroll_period' => '2026-10',
                'period_start' => '2026-10-01',
                'period_end' => '2026-10-31',
            ]);

        $response->assertStatus(500); // InvalidArgumentException thrown to block duplicate payouts
    }

    /**
     * 13. CMT Segregation Test: Customer-owned CMT fabric is strictly barred from factory sales reservation
     */
    public function test_customer_owned_materials_are_strictly_segregated_from_sales_reservation(): void
    {
        // Customer-owned fabric deposit (CMT)
        $customerItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'item_type' => 'fabric_raw',
            'code' => 'CMT-DEPOSIT-01',
            'name' => 'أمانة قماش قطن العميل',
            'unit_of_measure' => 'm',
            'current_balance' => 500.0,
            'average_cost' => 0.0,
            'is_customer_owned' => true, // Customer deposit
        ]);

        $salesOrder = SalesOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'Wholesale Client',
            'order_number' => 'SO-CMT-SEGREGATE-01',
            'status' => 'confirmed',
            'subtotal' => 5000,
            'total_amount' => 5000,
        ]);

        \App\Models\SalesOrderItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'sales_order_id' => $salesOrder->id,
            'variant_id' => $this->variantA->id,
            'ordered_quantity' => 50,
            'unit_price' => 100,
            'total_price' => 5000,
            'reserved_quantity' => 0,
            'fulfilled_quantity' => 0,
        ]);

        // Attempting to reserve factory stock should fail because only customer-owned deposit exists
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/sales/orders/{$salesOrder->id}/reserve");

        $response->assertStatus(500); // Throws InvalidArgumentException: customer materials are never reserved for sales
    }
}

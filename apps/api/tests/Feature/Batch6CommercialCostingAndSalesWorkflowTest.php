<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Batch6CommercialCostingAndSalesWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $owner;
    private User $accountant;
    private GarmentModel $model;
    private AccountingService $accountingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Al-Nour Kids Apparel',
            'code' => 'NOUR-KIDS',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->owner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Owner Nour',
            'email' => 'owner@alnour.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'status' => 'active',
        ]);

        $this->accountant = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cost Accountant',
            'email' => 'accountant@alnour.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'accountant',
            'status' => 'active',
        ]);

        $this->model = GarmentModel::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Summer Romper 2026',
            'code' => 'MOD-ROMPER-01',
            'category' => 'kids',
            'season' => 'Summer 2026',
            'status' => 'active',
        ]);

        $this->accountingService = app(AccountingService::class);
    }

    public function test_production_costing_calculates_net_materials_approved_labor_and_absorbs_scrap(): void
    {
        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-TEST-001',
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'status' => 'completed',
        ]);

        $warehouse = \App\Models\Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Fabric Store',
            'code' => 'WH-MAIN',
            'type' => 'fabric',
        ]);

        $item = \App\Models\InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'RAW-COTTON-01',
            'name' => 'Egyptian Cotton Fabric 100%',
            'item_type' => 'fabric_raw',
            'unit_of_measure' => 'meter',
            'current_balance' => 155,
            'average_cost' => 100.00,
        ]);

        $employee = \App\Models\Employee::create([
            'tenant_id' => $this->tenant->id,
            'employee_code' => 'EMP-01',
            'name' => 'Hassan Sewing Operator',
            'department' => 'sewing',
            'job_title' => 'Tailor',
            'pay_type' => 'piece_rate',
        ]);

        // 1. محاكاة صرف خامات (OUT) ومرتجع خامات (IN)
        DB::table('inventory_transactions')->insert([
            [
                'id' => (string)\Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'inventory_item_id' => $item->id,
                'warehouse_id' => $warehouse->id,
                'direction' => 'OUT',
                'quantity' => 50,
                'unit_cost' => 100.00, // 5000 EGP
                'balance_before' => 200,
                'balance_after' => 150,
                'transaction_type' => 'goods_issue',
                'reference_type' => 'production_orders',
                'reference_id' => $order->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => (string)\Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'inventory_item_id' => $item->id,
                'warehouse_id' => $warehouse->id,
                'direction' => 'IN', // مرتجع خامة غير مستهلكة
                'quantity' => 5,
                'unit_cost' => 100.00, // -500 EGP (Net = 4500 EGP)
                'balance_before' => 150,
                'balance_after' => 155,
                'transaction_type' => 'adjustment_positive',
                'reference_type' => 'production_orders',
                'reference_id' => $order->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 2. محاكاة أجور قطعة معتمدة وأجور قطعة مرفوضة
        PieceWorkLog::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'employee_id' => $employee->id,
            'work_date' => now()->toDateString(),
            'completed_quantity' => 90,
            'unit_rate' => 10.00,
            'total_amount' => 900.00,
            'status' => 'approved',
        ]);

        PieceWorkLog::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'employee_id' => $employee->id,
            'work_date' => now()->toDateString(),
            'completed_quantity' => 20,
            'unit_rate' => 10.00,
            'total_amount' => 200.00,
            'status' => 'rejected', // مرفوضة لا تحتسب في الأجور المعتمدة
        ]);

        // 3. محاكاة وجود 10 قطع هالك تالفة في صالة القص (Scrapped)
        $color = \App\Models\Color::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Blue Color',
            'color_code' => '#0000FF',
        ]);

        $size = \App\Models\Size::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'XL',
            'category' => 'adult',
        ]);

        $cuttingOrder = \App\Models\CuttingOrder::create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-TEST-' . uniqid(),
            'production_order_id' => $order->id,
            'warehouse_id' => $warehouse->id,
            'fabric_inventory_item_id' => $item->id,
            'lay_length_meters' => 2.0,
            'layers_count' => 50,
            'status' => 'cut_completed',
        ]);

        DB::table('cutting_bundles')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'bundle_code' => 'BND-TEST-SCRAP-01',
            'cutting_order_id' => $cuttingOrder->id,
            'production_order_id' => $order->id,
            'bundle_number' => 1,
            'color_id' => $color->id,
            'size_id' => $size->id,
            'quantity' => 10,
            'status' => 'scrapped',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // تنفيذ احتساب التكلفة الفعلية
        $costSheet = $this->accountingService->calculateProductionCost($order->id);

        // التحقق من الحسابات:
        // صافي الخامات: 5000 - 500 = 4500
        $this->assertEquals(4500.00, $costSheet->direct_materials_cost);

        // الأجور المعتمدة: 900 فقط (مع استبعاد 200 المرفوضة)
        $this->assertEquals(900.00, $costSheet->direct_labor_cost);

        // المصاريف غير المباشرة: (4500 + 900) * 0.15 = 810
        $this->assertEquals(810.00, $costSheet->allocated_overhead_cost);

        // إجمالي التكلفة: 4500 + 900 + 810 = 6210
        $this->assertEquals(6210.00, $costSheet->total_cost);

        // عدد القطع المقبولة المستوعبة للهالك: 100 - 10 = 90 قطعة
        $this->assertEquals(90, $costSheet->total_produced_pieces);

        // تكلفة القطعة السليمة الواحدة: 6210 / 90 = 69.00
        $this->assertEquals(69.00, $costSheet->cost_per_piece);

        // التحقق من إنشاء سجل التدقيق (Audit Log)
        $audit = AuditLog::where('tenant_id', $this->tenant->id)
            ->where('auditable_id', $costSheet->id)
            ->first();
        $this->assertNotNull($audit);
        $this->assertEquals('cost_sheet.calculated', $audit->action);
    }

    public function test_approved_cost_sheet_blocks_unauthorized_recalculation(): void
    {
        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-LOCKED-01',
            'total_planned_quantity' => 50,
            'total_completed_quantity' => 50,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'status' => 'completed',
        ]);

        $costSheet = ProductionCostSheet::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'garment_model_id' => $this->model->id,
            'total_produced_pieces' => 50,
            'direct_materials_cost' => 1000,
            'direct_labor_cost' => 500,
            'allocated_overhead_cost' => 225,
            'total_cost' => 1725,
            'cost_per_piece' => 34.50,
            'status' => 'approved', // معتمدة نهائياً
        ]);

        // عند محاولة إعادة الاحتساب بقيم مدخلة مختلفة دون force_recalculate، يجب الحفاظ على السجل المعتمد دون المساس به
        $recalculated = $this->accountingService->calculateProductionCost($order->id, [
            'direct_materials_cost' => 99999,
        ]);

        $this->assertEquals(1725.00, $recalculated->total_cost);
        $this->assertEquals(34.50, $recalculated->cost_per_piece);
    }

    public function test_customer_creation_editing_and_balance_statement_reconciliation(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@alnour.com',
            'password' => 'Secret123!',
        ]);
        $token = $loginRes->json('access_token');

        // 1. تسجيل عميل جديد
        $createRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/customers', [
                'code' => 'CUST-CAIRO-10',
                'name' => 'محلات السلام للملابس',
                'contact_person' => 'الحاج سلامة',
                'phone' => '01012345678',
                'credit_limit' => 60000,
            ]);
        $createRes->assertStatus(201);
        $custId = $createRes->json('customer.id');
        $this->assertNotEmpty($custId);

        // 2. تحديث بيانات العميل (Editing)
        $updateRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->putJson("/api/v1/customers/{$custId}", [
                'name' => 'شركة السلام الدولية للأزياء',
                'contact_person' => 'م. أحمد سلامة',
                'phone' => '01099998888',
                'notes' => 'خصم 5% للسداد النقدي الفوري',
            ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('شركة السلام الدولية للأزياء', $updateRes->json('customer.name'));
        $this->assertEquals('م. أحمد سلامة', $updateRes->json('customer.contact_person'));

        // 3. التحقق من كشف الحساب والرصيد
        $statementRes = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson("/api/v1/customers/{$custId}/statement");
        $statementRes->assertStatus(200);
        $this->assertEquals(0, $statementRes->json('current_balance'));
        $this->assertEquals('CUST-CAIRO-10', $statementRes->json('customer.code'));
    }
}

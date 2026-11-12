<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Color;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class Batch7RemainingModulesAndCostingEdgeCasesTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $accountant;
    private GarmentModel $model;
    private AccountingService $accountingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Delta Modern Garments',
            'code' => 'DELTA-MOD',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);

        $this->accountant = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Chief Cost Accountant',
            'email' => 'chief.cost@deltamod.com',
            'password' => bcrypt('DeltaPass2026!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->model = GarmentModel::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Industrial Safety Overall',
            'code' => 'MOD-IND-01',
            'category' => 'adult',
        ]);

        $this->accountingService = app(AccountingService::class);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenant->id);
    }

    /**
     * اختبار: منع احتساب تكلفة وحدة وهمية أو القسمة على صفر عند إتلاف كامل الأمر كهالك
     */
    public function test_costing_throws_validation_exception_when_accepted_quantity_is_zero(): void
    {
        app()->instance('current_tenant_id', $this->tenant->id);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-SCRAP-ALL-01',
            'total_planned_quantity' => 50,
            'total_completed_quantity' => 50,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(5)->toDateString(),
            'status' => 'in_progress',
        ]);

        $warehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Fabric Warehouse',
            'code' => 'WH-FAB-02',
            'type' => 'fabric',
        ]);

        $item = InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'DENIM-HD-01',
            'name' => 'Heavy Denim 14oz',
            'item_type' => 'fabric_raw',
            'unit_of_measure' => 'meter',
            'current_balance' => 500,
            'average_cost' => 80.00,
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Indigo Dark',
            'color_code' => '#1A237E',
        ]);

        $size = Size::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'XXL',
            'category' => 'adult',
        ]);

        $cuttingOrder = CuttingOrder::create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-DELTA-99',
            'production_order_id' => $order->id,
            'warehouse_id' => $warehouse->id,
            'fabric_inventory_item_id' => $item->id,
            'lay_length_meters' => 3.0,
            'layers_count' => 25,
            'status' => 'cut_completed',
        ]);

        // إتلاف كامل الكمية 50 قطعة كهالك في بطاقات الحزم
        DB::table('cutting_bundles')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'bundle_code' => 'BND-FULL-SCRAP',
            'cutting_order_id' => $cuttingOrder->id,
            'production_order_id' => $order->id,
            'bundle_number' => 1,
            'color_id' => $color->id,
            'size_id' => $size->id,
            'quantity' => 50, // 50 من 50 تالفة تماماً
            'status' => 'scrapped',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(ValidationException::class);

        $this->accountingService->calculateProductionCost($order->id);
    }

    /**
     * اختبار: منع اعتماد بطاقة تكلفة بكمية مقبولة صفر أو تكلفة وحدة غير محسوبة
     */
    public function test_cannot_approve_cost_sheet_with_zero_accepted_quantity(): void
    {
        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-ZERO-UNIT-01',
            'total_planned_quantity' => 20,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(5)->toDateString(),
            'status' => 'in_progress',
        ]);

        $costSheet = ProductionCostSheet::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'garment_model_id' => $this->model->id,
            'total_produced_pieces' => 0,
            'direct_materials_cost' => 1000,
            'direct_labor_cost' => 200,
            'allocated_overhead_cost' => 180,
            'total_cost' => 1380,
            'cost_per_piece' => 0,
            'status' => 'calculated',
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/v1/accounting/cost-sheets/{$costSheet->id}/approve");

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cost_sheet']);
    }

    /**
     * اختبار: اعتماد بطاقة التكلفة الصناعية السليمة وانتقال حالتها إلى approved مع تسجيل التدقيق الرقابي
     */
    public function test_approve_valid_cost_sheet_and_audit_log_creation(): void
    {
        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-VALID-COST-01',
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'status' => 'completed',
        ]);

        $costSheet = ProductionCostSheet::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'garment_model_id' => $this->model->id,
            'total_produced_pieces' => 100,
            'direct_materials_cost' => 4000,
            'direct_labor_cost' => 1000,
            'allocated_overhead_cost' => 750,
            'total_cost' => 5750,
            'cost_per_piece' => 57.50,
            'status' => 'calculated',
        ]);

        $response = $this->actingAs($this->accountant)
            ->postJson("/api/v1/accounting/cost-sheets/{$costSheet->id}/approve");

        $response->assertStatus(200);
        $this->assertEquals('approved', $costSheet->fresh()->status);

        // التحقق من إنشاء سجل التدقيق
        $audit = AuditLog::where('tenant_id', $this->tenant->id)
            ->where('auditable_type', ProductionCostSheet::class)
            ->where('auditable_id', $costSheet->id)
            ->where('action', 'cost_sheet.approved')
            ->first();

        $this->assertNotNull($audit);

        // محاولة إعادة الاعتماد لنفس البطاقة يجب أن تكون Idempotent وترجع 200 دون أخطاء
        $idempotentRes = $this->actingAs($this->accountant)
            ->postJson("/api/v1/accounting/cost-sheets/{$costSheet->id}/approve");
        $idempotentRes->assertStatus(200);
    }

    /**
     * اختبار: الحفاظ التام على بطاقات التكلفة المعتمدة تاريخياً ومنع تعديلها بالمحاولات المتكررة
     */
    public function test_duplicate_calculation_and_unauthorized_recalculation_preserves_historical_sheet(): void
    {
        app()->instance('current_tenant_id', $this->tenant->id);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-HISTORICAL-01',
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'status' => 'completed',
        ]);

        $approvedSheet = ProductionCostSheet::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'garment_model_id' => $this->model->id,
            'total_produced_pieces' => 100,
            'direct_materials_cost' => 5000,
            'direct_labor_cost' => 2000,
            'allocated_overhead_cost' => 1050,
            'total_cost' => 8050,
            'cost_per_piece' => 80.50,
            'status' => 'approved',
        ]);

        // محاولة إعادة احتساب مع تمرير قيم مخالفة دون force_recalculate
        $recalculated = $this->accountingService->calculateProductionCost($order->id, [
            'direct_materials_cost' => 99999,
            'direct_labor_cost' => 99999,
        ]);

        // يجب أن تظل القيم التاريخية المعتمدة كما هي دون أي تحوير
        $this->assertEquals(8050.00, (float)$recalculated->total_cost);
        $this->assertEquals(80.50, (float)$recalculated->cost_per_piece);
        $this->assertEquals('approved', $recalculated->status);
    }

    /**
     * اختبار: منع العد المزدوج بين الهالك والمردودات واقتصار الأجور على المعتمدة فقط
     */
    public function test_costing_prevents_double_counting_and_handles_material_returns(): void
    {
        app()->instance('current_tenant_id', $this->tenant->id);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->model->id,
            'order_number' => 'PO-DOUBLE-COUNT-01',
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'status' => 'in_progress',
        ]);

        $warehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Raw Materials WH',
            'code' => 'WH-RAW-09',
            'type' => 'fabric',
        ]);

        $item = InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'COTTON-COMBED-01',
            'name' => 'Combed Cotton Single Jersey',
            'item_type' => 'fabric_raw',
            'unit_of_measure' => 'meter',
            'current_balance' => 200,
            'average_cost' => 150.00,
        ]);

        $employee = Employee::create([
            'tenant_id' => $this->tenant->id,
            'employee_code' => 'EMP-DOUB-01',
            'name' => 'Saeed Tailor',
            'department' => 'assembly',
            'job_title' => 'Tailor',
            'pay_type' => 'piece_rate',
        ]);

        // صرف خامات بقيمة 15,000 ج.م
        DB::table('inventory_transactions')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'direction' => 'OUT',
            'quantity' => 100,
            'unit_cost' => 150.00,
            'balance_before' => 300,
            'balance_after' => 200,
            'transaction_type' => 'production_issue',
            'reference_type' => 'production_orders',
            'reference_id' => $order->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // مردود خامات متبقية غير مستهلكة بقيمة 3,000 ج.م (الصافي = 12,000 ج.م)
        DB::table('inventory_transactions')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'direction' => 'IN',
            'quantity' => 20,
            'unit_cost' => 150.00,
            'balance_before' => 200,
            'balance_after' => 220,
            'transaction_type' => 'production_return',
            'reference_type' => 'production_orders',
            'reference_id' => $order->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // أجور إنتاج معتمدة = 2,000 ج.م
        PieceWorkLog::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'employee_id' => $employee->id,
            'work_date' => now()->toDateString(),
            'completed_quantity' => 50,
            'unit_rate' => 40.00,
            'total_amount' => 2000.00,
            'status' => 'approved',
        ]);

        // أجور إنتاج مرفوضة = 1,000 ج.م (يجب ألا تُحسب)
        PieceWorkLog::create([
            'tenant_id' => $this->tenant->id,
            'production_order_id' => $order->id,
            'employee_id' => $employee->id,
            'work_date' => now()->toDateString(),
            'completed_quantity' => 25,
            'unit_rate' => 40.00,
            'total_amount' => 1000.00,
            'status' => 'rejected',
        ]);

        // هالك صالة القص = 10 قطع
        $color = Color::create(['tenant_id' => $this->tenant->id, 'name' => 'White', 'color_code' => '#FFFFFF']);
        $size = Size::create(['tenant_id' => $this->tenant->id, 'name' => 'M', 'category' => 'adult']);
        $cuttingOrder = CuttingOrder::create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-DOUB-01',
            'production_order_id' => $order->id,
            'warehouse_id' => $warehouse->id,
            'lay_length_meters' => 2.5,
            'layers_count' => 40,
        ]);

        DB::table('cutting_bundles')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'bundle_code' => 'BND-DOUB-SCRAP',
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

        // فحص جودة نهائي مستقل بدون بطاقة حزمة سابقة = 10 قطع هالك
        DB::table('quality_inspections')->insert([
            'id' => (string)\Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'inspection_number' => 'QC-INSP-99',
            'production_order_id' => $order->id,
            'cutting_bundle_id' => null, // مستقل دون تكرار
            'inspector_name' => 'QC Inspector Tarek',
            'inspection_type' => 'final_audit',
            'inspected_quantity' => 90,
            'passed_quantity' => 80,
            'rejected_quantity' => 10,
            'decision' => 'rejected',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $costSheet = $this->accountingService->calculateProductionCost($order->id, ['overhead_allocation_method' => 'materials_and_labor_pct']);

        // التحقق من أن صافي الخامات = 15000 - 3000 = 12000
        $this->assertEquals(12000.00, (float)$costSheet->direct_materials_cost);

        // التحقق من أن الأجور = 2000 فقط (دون احتساب 1000 المرفوضة)
        $this->assertEquals(2000.00, (float)$costSheet->direct_labor_cost);

        // المصاريف غير المباشرة: (12000 + 2000) * 0.15 = 2100
        $this->assertEquals(2100.00, (float)$costSheet->allocated_overhead_cost);

        // الإجمالي: 12000 + 2000 + 2100 = 16100
        $this->assertEquals(16100.00, (float)$costSheet->total_cost);

        // القطع السليمة المقبولة: 100 - (10 من الحزم + 10 من فحص الجودة المستقل) = 80 قطعة
        $this->assertEquals(80, $costSheet->total_produced_pieces);

        // تكلفة القطعة السليمة الواحدة: 16100 / 80 = 201.25 ج.م
        $this->assertEquals(201.25, (float)$costSheet->cost_per_piece);
    }
}

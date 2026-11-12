<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Color;
use App\Models\Customer;
use App\Models\CustomerMaterial;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\EmployeeAdjustment;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Models\ProductionStage;
use App\Models\QualityDefect;
use App\Models\QualityDefectAdjustment;
use App\Models\QualityInspection;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Batch3ProductionAndPayrollTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected User $ownerA;
    protected User $prodManagerA;
    protected User $accountantA;
    protected string $tokenA;
    protected string $tokenProdA;
    protected string $tokenAccountantA;

    protected Tenant $tenantB;
    protected User $ownerB;
    protected string $tokenB;

    protected Branch $branchA;
    protected Warehouse $warehouseA;
    protected GarmentModel $modelA;
    protected Color $colorBlue;
    protected Color $colorRed;
    protected Size $sizeM;
    protected Size $sizeL;
    protected InventoryItem $fabricItemA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. إعداد الشركة A مع مدير الإنتاج والمحاسب
        $this->tenantA = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع النيل للألبسة الجاهزة',
            'code' => 'TEN-NILE-' . uniqid(),
            'subdomain' => 'nile-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'الفرع الرئيسي',
            'code' => 'BR-BATCH3-MAIN',
            'type' => 'factory',
            'is_main' => true,
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمد مالك المصنع A',
            'email' => 'owner-a-' . uniqid() . '@garmentos.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenA = $this->ownerA->createToken('test')->plainTextToken;

        $this->prodManagerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'سامح مدير الإنتاج A',
            'email' => 'prod-a-' . uniqid() . '@garmentos.test',
            'password' => bcrypt('Password123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);
        $this->tokenProdA = $this->prodManagerA->createToken('test')->plainTextToken;
        $this->prodManagerA->branches()->sync([$this->branchA->id]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'عادل رئيس الحسابات A',
            'email' => 'acct-a-' . uniqid() . '@garmentos.test',
            'password' => bcrypt('Password123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $this->tokenAccountantA = $this->accountantA->createToken('test')->plainTextToken;
        $this->accountantA->branches()->sync([$this->branchA->id]);

        // 2. إعداد الشركة B لاختبار العزل التام للبيانات (Multi-Tenant Isolation)
        $this->tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'شركة الدلتا للصناعات النسيجية',
            'code' => 'TEN-DELTA-' . uniqid(),
            'subdomain' => 'delta-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'محمود مالك المصنع B',
            'email' => 'owner-b-' . uniqid() . '@garmentos.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenB = $this->ownerB->createToken('test')->plainTextToken;

        // مستودع وموديل وألوان وأصناف خام للشركة A
        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'name' => 'مستودع الأقمشة المركزي A',
            'code' => 'WH-FAB-A',
            'type' => 'fabric',
            'is_active' => true,
        ]);

        $this->modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSHIRT-01',
            'name' => 'تي شيرت رجالي قطن 100%',
            'category' => 't-shirt',
            'is_active' => true,
        ]);

        $this->colorBlue = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أزرق داكن',
            'hex_code' => '#000080',
        ]);

        $this->colorRed = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر قاني',
            'hex_code' => '#8B0000',
        ]);

        $this->sizeM = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Medium',
            'sort_order' => 2,
        ]);

        $this->sizeL = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Large',
            'sort_order' => 3,
        ]);

        $this->fabricItemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'code' => 'FAB-COT-SINGLE-01',
            'sku' => 'FAB-COT-SINGLE-01',
            'name' => 'قماش سنجل جيرسي قطن 100% كحلي',
            'item_type' => 'raw_material',
            'material_type' => 'fabric',
            'unit_of_measure' => 'meter',
            'current_stock' => 1000.0,
            'current_balance' => 1000.0,
            'average_cost' => 120.0,
            'is_active' => true,
        ]);
    }

    /**
     * Stage 3A: Production Orders CRUD, Search, Filter, Lifecycle, and Cancellation with Audit Log
     */
    public function test_production_orders_complete_lifecycle_and_cancellation(): void
    {
        // 1. إنشاء أمر إنتاج جديد
        $res = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/production-orders', [
                'garment_model_id' => $this->modelA->id,
                'planned_start_date' => date('Y-m-d'),
                'target_delivery_date' => date('Y-m-d', strtotime('+10 days')),
                'priority' => 'high',
                'responsible_person' => 'المهندس مصطفى كامل',
                'notes' => 'تشغيلة عاجلة للسوق المحلي',
                'items' => [
                    [
                        'color_id' => $this->colorBlue->id,
                        'size_id' => $this->sizeM->id,
                        'planned_quantity' => 100,
                    ],
                    [
                        'color_id' => $this->colorBlue->id,
                        'size_id' => $this->sizeL->id,
                        'planned_quantity' => 150,
                    ],
                ],
            ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total_planned_quantity', 250)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.priority', 'high');

        $orderId = $res->json('data.id');

        // 2. البحث والفلترة
        $listRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->getJson('/api/v1/production-orders?search=مصطفى&priority=high&page=1&per_page=10');

        $listRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.total', 1);

        // 3. تحديث أمر الإنتاج
        $updateRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->putJson("/api/v1/production-orders/{$orderId}", [
                'priority' => 'urgent',
                'responsible_person' => 'المهندس مصطفى كامل - تحديث',
                'notes' => 'تعديل تاريخ التسليم والأولوية',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.priority', 'urgent');

        // التحقق من توثيق سجل التدقيق
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenantA->id,
            'action' => 'production_order_updated',
            'auditable_id' => $orderId,
        ]);

        // 4. اعتماد أمر الإنتاج
        $approveRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/production-orders/{$orderId}/approve");

        $approveRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'approved');

        // 5. إلغاء أمر الإنتاج وتوثيق السبب
        $cancelRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/production-orders/{$orderId}/cancel", [
                'cancellation_reason' => 'إلغاء بناء على طلب العميل وتعديل المواصفات',
            ]);

        $cancelRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled')
            ->assertJsonPath('data.cancellation_reason', 'إلغاء بناء على طلب العميل وتعديل المواصفات');

        // التحقق من سجل التدقيق للإلغاء
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenantA->id,
            'action' => 'production_order_cancelled',
            'auditable_id' => $orderId,
        ]);
    }

    /**
     * Stage 3A & 3B: Cutting Orders, Stock Ledger Integration, Bundles Generation and Reversal Cancellation
     */
    public function test_cutting_order_fabric_issue_and_cancellation_reversal(): void
    {
        // تجهيز أمر إنتاج معتمد
        $prodOrder = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'order_number' => 'PO-PRD-TEST-CUT',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+7 days')),
            'total_planned_quantity' => 100,
            'status' => 'approved',
            'priority' => 'normal',
        ]);

        ProductionOrderItem::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $prodOrder->id,
            'color_id' => $this->colorBlue->id,
            'size_id' => $this->sizeM->id,
            'planned_quantity' => 100,
        ]);

        $initialStock = (float) $this->fabricItemA->fresh()->current_balance;

        // تنفيذ أمر القص وصرف القماش من المخزن
        $cutRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/cutting-orders', [
                'production_order_id' => $prodOrder->id,
                'warehouse_id' => $this->warehouseA->id,
                'fabric_source' => 'factory_owned',
                'fabric_inventory_item_id' => $this->fabricItemA->id,
                'table_number' => 'Table-1',
                'lay_length_meters' => 2.5,
                'layers_count' => 40,
                'end_loss_meters' => 0.1,
                'remnant_meters' => 0.5,
                'total_cut_pieces' => 40,
                'bundle_configs' => [
                    [
                        'color_id' => $this->colorBlue->id,
                        'size_id' => $this->sizeM->id,
                        'quantity' => 20,
                        'work_group' => 'وردية الصباح',
                    ],
                    [
                        'color_id' => $this->colorBlue->id,
                        'size_id' => $this->sizeM->id,
                        'quantity' => 20,
                        'work_group' => 'وردية الصباح',
                    ],
                ],
            ]);

        $cutRes->assertStatus(201)
            ->assertJsonPath('success', true);

        $cuttingOrder = CuttingOrder::where('tenant_id', $this->tenantA->id)->latest()->first();
        $this->assertNotNull($cuttingOrder);
        $this->assertEquals(40, $cuttingOrder->total_cut_pieces);
        $this->assertEquals('cut_completed', $cuttingOrder->status);

        // التحقق من توليد حزمتين (Bundles)
        $bundles = CuttingBundle::where('cutting_order_id', $cuttingOrder->id)->get();
        $this->assertCount(2, $bundles);
        $this->assertEquals('active', $bundles[0]->status);
        $this->assertEquals('cutting', $bundles[0]->current_stage_code);

        // التحقق من صرف القماش من المخزون
        $metersUsed = (float) $cuttingOrder->actual_fabric_meters_used;
        $this->assertGreaterThan(0, $metersUsed);
        $this->assertEquals($initialStock - $metersUsed, (float) $this->fabricItemA->fresh()->current_balance);

        // التحقق من وجود حركة صرف مخزني production_issue
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $this->fabricItemA->id,
            'direction' => 'OUT',
            'transaction_type' => 'production_issue',
        ]);

        // الآن إلغاء أمر القص والتأكد من استرجاع القماش للمخزن (Reversal)
        $cancelCutRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/cutting-orders/{$cuttingOrder->id}/cancel", [
                'cancellation_reason' => 'خطأ في فرد القماش وتلف في البداية',
            ]);

        $cancelCutRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'cancelled');

        // التحقق من استرجاع رصيد المخزون كاملاً
        $this->assertEquals($initialStock, (float) $this->fabricItemA->fresh()->current_balance);

        // التحقق من قيد الاسترجاع العكسي cutting_reversal في دفتر حركة المخزن
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $this->fabricItemA->id,
            'direction' => 'IN',
            'transaction_type' => 'cutting_reversal',
        ]);

        // التحقق من إلغاء الحزم المرتبطة بأمر القص
        foreach (CuttingBundle::where('cutting_order_id', $cuttingOrder->id)->get() as $b) {
            $this->assertEquals('cancelled', $b->status);
        }
    }

    /**
     * Stage 3A: CMT Customer Material Custody Segregation and Cancellation
     */
    public function test_customer_material_custody_segregation_and_cancellation(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'شركة فاشن لاين للملابس',
            'code' => 'CUST-001',
        ]);

        $custMaterial = CustomerMaterial::create([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $customer->id,
            'warehouse_id' => $this->warehouseA->id,
            'customer_name' => $customer->name,
            'fabric_name' => 'قماش بيكيه تركي أمانة تشغيل',
            'fabric_code' => 'FAB-CMT-PIQUE-01',
            'gsm' => 220.0,
            'usable_width_meters' => 1.6,
            'received_meters' => 500.0,
            'consumed_meters' => 0.0,
            'waste_meters' => 0.0,
            'remaining_meters' => 500.0,
            'status' => 'active',
        ]);

        $prodOrder = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'order_number' => 'PO-CMT-01',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+5 days')),
            'total_planned_quantity' => 100,
            'status' => 'approved',
            'customer_id' => $customer->id,
        ]);

        $factoryInitialStock = (float) $this->fabricItemA->fresh()->current_balance;

        // تنفيذ قص من أمانة العميل
        $cutRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/cutting-orders', [
                'production_order_id' => $prodOrder->id,
                'warehouse_id' => $this->warehouseA->id,
                'fabric_source' => 'customer_deposit',
                'customer_material_id' => $custMaterial->id,
                'table_number' => 'Table-CMT',
                'lay_length_meters' => 2.0,
                'layers_count' => 50,
                'end_loss_meters' => 0.1,
                'remnant_meters' => 0.5,
                'total_cut_pieces' => 50,
            ]);

        $cutRes->assertStatus(201);
        $cutOrderId = $cutRes->json('data.id');

        // مخزون المصنع لم يتأثر مطلقاً (عزل الأمانات)
        $this->assertEquals($factoryInitialStock, (float) $this->fabricItemA->fresh()->current_balance);

        // رصيد أمانة العميل انخفض بدقة
        $custMaterial->refresh();
        $this->assertGreaterThan(0, (float)$custMaterial->consumed_meters);
        $this->assertLessThan(500.0, (float)$custMaterial->remaining_meters);

        // إلغاء أمر القص من أمانة العميل واسترجاع رصيد الأمانة
        $cancelRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/cutting-orders/{$cutOrderId}/cancel", [
                'cancellation_reason' => 'إلغاء تشغيلة الأمانة واسترجاع الخام للعميل',
            ]);

        $cancelRes->assertStatus(200);
        $custMaterial->refresh();
        $this->assertEquals(0.0, (float)$custMaterial->consumed_meters);
        $this->assertEquals(500.0, (float)$custMaterial->remaining_meters);
    }

    /**
     * Stage 3B: Bundle Assignment, Timeline, Transfer, and Quantity Reconciliation
     */
    public function test_bundle_assignment_stage_transfer_and_reconciliation(): void
    {
        $employee = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-SEW-01',
            'name' => 'خالد عبد الرحمن - خياط ماهر',
            'department' => 'production',
            'job_title' => 'فني حياكة',
            'pay_type' => 'piece_rate',
            'is_active' => true,
        ]);

        app(\App\Services\ProductionService::class)->ensureDefaultStages($this->tenantA->id);

        $dummyProd = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'order_number' => 'PO-PRD-DUMMY',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+7 days')),
            'total_planned_quantity' => 25,
            'status' => 'approved',
        ]);

        $dummyCut = CuttingOrder::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $dummyProd->id,
            'warehouse_id' => $this->warehouseA->id,
            'cutting_order_number' => 'CUT-TEST-DUMMY',
            'table_number' => 'Table-1',
            'lay_length_meters' => 2.0,
            'layers_count' => 25,
            'total_cut_pieces' => 25,
            'status' => 'cut_completed',
        ]);

        $bundle = CuttingBundle::create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_id' => $dummyCut->id,
            'production_order_id' => $dummyProd->id,
            'bundle_code' => 'BND-202611-0001-99',
            'bundle_number' => 1,
            'color_id' => $this->colorBlue->id,
            'size_id' => $this->sizeM->id,
            'quantity' => 25,
            'current_stage_code' => 'cutting',
            'status' => 'active',
        ]);

        // 1. إسناد الحزمة للعامل
        $assignRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/bundles/{$bundle->id}/assign", [
                'employee_id' => $employee->id,
                'work_group' => 'مجموعة تجميع الجيوب',
                'issue_date' => date('Y-m-d'),
                'due_date' => date('Y-m-d', strtotime('+2 days')),
            ]);

        $assignRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.assigned_employee_id', $employee->id)
            ->assertJsonPath('data.work_group', 'مجموعة تجميع الجيوب');

        // 2. محاولة نقل الحزمة بكميات غير متطابقة (فشل التحقق من المعادلة: accepted + rejected + rework + scrap == input)
        $mismatchRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/bundles/{$bundle->id}/transfer", [
                'to_stage_code' => 'sewing',
                'input_quantity' => 25,
                'output_accepted_quantity' => 20,
                'output_rejected_quantity' => 2,
                'rework_quantity' => 1,
                'scrap_quantity' => 0, // المجموع 23 وليس 25
            ]);

        $mismatchRes->assertStatus(422)
            ->assertJsonPath('success', false);

        // 3. نقل الحزمة بكميات متسقة ومطابقة تماماً للمعادلة
        $transferRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson("/api/v1/bundles/{$bundle->id}/transfer", [
                'to_stage_code' => 'sewing',
                'input_quantity' => 25,
                'output_accepted_quantity' => 22,
                'output_rejected_quantity' => 1,
                'rework_quantity' => 2,
                'scrap_quantity' => 0,
                'employee_id' => $employee->id,
                'notes' => 'تم نقل الحزمة لخط الخياطة مع وجود قطعتين بحاجة لتعديل درزة',
            ]);

        $transferRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.output_accepted_quantity', 22)
            ->assertJsonPath('data.rework_quantity', 2);

        // التحقق من تاريخ وسجل تتبع الحزمة (Timeline)
        $historyRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->getJson("/api/v1/bundles/{$bundle->id}/history");

        $historyRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data.timeline');
    }

    /**
     * Stage 3C: Workers with Diverse Pay Methods, Attendance Duplicate Prevention, and Bulk Attendance
     */
    public function test_employees_diverse_pay_methods_and_bulk_attendance(): void
    {
        // 1. تسجيل موظف أسبوعي
        $weeklyEmpRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->postJson('/api/v1/hr/employees', [
                'employee_code' => 'EMP-WK-01',
                'name' => 'طارق كمال - عامل أسبوعي',
                'department' => 'cutting',
                'job_title' => 'مساعد مقصدار',
                'pay_type' => 'weekly',
                'weekly_rate' => 1250.0,
                'skills' => ['فرد قماش', 'ترقيم حزم'],
            ]);

        $weeklyEmpRes->assertStatus(201)
            ->assertJsonPath('employee.weekly_rate', '1250.0000');

        $emp1Id = $weeklyEmpRes->json('employee.id');

        // 2. تسجيل موظف بالوردية (Shift Based)
        $shiftEmpRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->postJson('/api/v1/hr/employees', [
                'employee_code' => 'EMP-SH-01',
                'name' => 'حسام حسن - عامل وردية',
                'department' => 'packing',
                'job_title' => 'عامل تعبئة وتغليف',
                'pay_type' => 'shift_based',
                'shift_rate' => 200.0,
            ]);

        $shiftEmpRes->assertStatus(201)
            ->assertJsonPath('employee.shift_rate', '200.0000');

        $emp2Id = $shiftEmpRes->json('employee.id');

        // 3. منع تكرار كود الموظف
        $dupEmpRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->postJson('/api/v1/hr/employees', [
                'employee_code' => 'EMP-WK-01',
                'name' => 'شخص آخر بنفس الكود',
                'department' => 'cutting',
                'job_title' => 'عامل',
                'pay_type' => 'daily',
            ]);

        $dupEmpRes->assertStatus(422)
            ->assertJsonPath('error', 'DuplicateEmployeeCode');

        // 4. تسجيل حضور فردي وفحص منع التكرار لنفس اليوم
        $attRes1 = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/hr/attendances', [
                'employee_id' => $emp1Id,
                'attendance_date' => '2026-11-01',
                'status' => 'present',
                'working_hours' => 8.0,
            ]);

        $attRes1->assertStatus(201);

        $attResDup = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/hr/attendances', [
                'employee_id' => $emp1Id,
                'attendance_date' => '2026-11-01',
                'status' => 'present',
                'working_hours' => 8.0,
            ]);

        $attResDup->assertStatus(422)
            ->assertJsonPath('error', 'DuplicateAttendance');

        // 5. تسجيل الحضور الجماعي (Bulk Attendance)
        $bulkRes = $this->withHeader('Authorization', "Bearer {$this->tokenProdA}")
            ->postJson('/api/v1/hr/attendances/bulk', [
                'records' => [
                    [
                        'employee_id' => $emp1Id,
                        'attendance_date' => '2026-11-02',
                        'status' => 'present',
                        'working_hours' => 8.0,
                    ],
                    [
                        'employee_id' => $emp2Id,
                        'attendance_date' => '2026-11-02',
                        'status' => 'present',
                        'working_hours' => 8.0,
                    ],
                    // إدخال مكرر للعامل الأول في 2026-11-01 (سيعود كخطأ داخل النتيجة المجمعة دون إيقاف الباقي)
                    [
                        'employee_id' => $emp1Id,
                        'attendance_date' => '2026-11-01',
                        'status' => 'present',
                        'working_hours' => 8.0,
                    ],
                ],
            ]);

        $bulkRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('created_count', 2)
            ->assertJsonPath('errors_count', 1);

        // 6. ملف العامل الشامل وإحصائياته
        $empShowRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->getJson("/api/v1/hr/employees/{$emp1Id}");

        $empShowRes->assertStatus(200)
            ->assertJsonPath('employee.id', $emp1Id)
            ->assertJsonPath('statistics.attendances_count', 2);
    }

    /**
     * Stage 3D: Quality Incidents Protection (Never Deducts Automatically Without Formal Approval)
     */
    public function test_quality_defects_never_deduct_wages_without_formal_approval(): void
    {
        $employee = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-Q-01',
            'name' => 'عصام عبد الله - خياط',
            'department' => 'production',
            'job_title' => 'خياط خط إنتاج',
            'pay_type' => 'piece_rate',
            'base_salary' => 0,
            'is_active' => true,
        ]);

        $pieceRate = PieceRate::create([
            'tenant_id' => $this->tenantA->id,
            'operation_name' => 'تركيب ياقة القميص',
            'stage_name' => 'sewing',
            'rate_per_piece' => 10.0,
            'is_active' => true,
        ]);

        // تسجيل إنتاجية 50 قطعة = 500 جنيه
        PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $employee->id,
            'piece_rate_id' => $pieceRate->id,
            'work_date' => '2026-11-05',
            'completed_quantity' => 50,
            'unit_rate' => 10.0,
            'total_amount' => 500.0,
            'status' => 'approved',
        ]);

        $prodOrder = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'order_number' => 'PO-DEFECT-01',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+7 days')),
            'total_planned_quantity' => 100,
            'status' => 'approved',
        ]);

        // حدوث واقعة عيب جودة أثناء فحص الجودة
        $defectAdj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $prodOrder->id,
            'employee_id' => $employee->id,
            'investigation_notes' => 'تركيب ياقات معوجة في عدد 10 قمصان',
            'proposed_penalty_amount' => 100.0,
            'adjustment_reason' => 'غرامة إتلاف خامات وأجر إعادة تشغيل',
            'status' => 'pending_investigation', // قيد التحقيق - غير معتمد!
        ]);

        // احتساب مسير رواتب مبدئي
        $payroll1 = app(\App\Services\PayrollService::class)->generatePayroll(
            $this->tenantA->id,
            '2026-11-W1',
            '2026-11-01',
            '2026-11-07',
            'draft'
        );

        $item1 = PayrollItem::where('payroll_id', $payroll1->id)->where('employee_id', $employee->id)->first();
        $this->assertNotNull($item1);
        // القاعدة الصارمة: لم يتم اعتماد الخصم، وبالتالي الخصم = 0 والصافي 500 كاملاً دون أي نقصان
        $this->assertEquals(0.0, (float)$item1->defect_deductions);
        $this->assertEquals(500.0, (float)$item1->net_salary);

        // الآن يعتمد المشرف والمدير الجزاء رسمياً بعد التحقيق
        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson("/api/v1/hr/defect-adjustments/{$defectAdj->id}/approve")
            ->assertStatus(200);

        // إعادة توليد المسير بعد الاعتماد الرسمي للجزاء
        $payroll2 = app(\App\Services\PayrollService::class)->generatePayroll(
            $this->tenantA->id,
            '2026-11-W1',
            '2026-11-01',
            '2026-11-07',
            'draft'
        );

        $item2 = PayrollItem::where('payroll_id', $payroll2->id)->where('employee_id', $employee->id)->first();
        $this->assertEquals(100.0, (float)$item2->defect_deductions);
        $this->assertEquals(400.0, (float)$item2->net_salary);
    }

    /**
     * Stage 3E: Payroll Generation, Breakdown, Approval Immutability, and Printable Payslip
     */
    public function test_payroll_generation_breakdown_immutability_and_payslip(): void
    {
        // 1. عامل أسبوعي (1000 جنيه للأسبوع)
        $empWeekly = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-P-WK',
            'name' => 'ياسر ممدوح',
            'department' => 'cutting',
            'job_title' => 'مساعد قص',
            'pay_type' => 'weekly',
            'weekly_rate' => 1000.0,
            'is_active' => true,
        ]);

        // 2. عامل وردية (150 جنيه للوردية، حضر يومين = 300 جنيه)
        $empShift = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-P-SH',
            'name' => 'أنس إبراهيم',
            'department' => 'packing',
            'job_title' => 'عامل تعبئة',
            'pay_type' => 'shift_based',
            'shift_rate' => 150.0,
            'is_active' => true,
        ]);

        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $empShift->id,
            'attendance_date' => '2026-11-01',
            'status' => 'present',
            'is_payable' => true,
        ]);

        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $empShift->id,
            'attendance_date' => '2026-11-02',
            'status' => 'present',
            'is_payable' => true,
        ]);

        // توليد مسير الرواتب
        $genRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->postJson('/api/v1/hr/payrolls/generate', [
                'payroll_period' => '2026-11-PERIOD-1',
                'period_start' => '2026-11-01',
                'period_end' => '2026-11-07',
            ]);

        $genRes->assertStatus(201)
            ->assertJsonPath('payroll.payroll_period', '2026-11-PERIOD-1');

        $payrollId = $genRes->json('payroll.id');

        $itemWeekly = PayrollItem::where('payroll_id', $payrollId)->where('employee_id', $empWeekly->id)->first();
        $this->assertEquals(1000.0, (float)$itemWeekly->base_amount);
        $this->assertEquals(1000.0, (float)$itemWeekly->net_salary);

        $itemShift = PayrollItem::where('payroll_id', $payrollId)->where('employee_id', $empShift->id)->first();
        $this->assertEquals(300.0, (float)$itemShift->daily_earnings);
        $this->assertEquals(300.0, (float)$itemShift->net_salary);

        // 3. اختبار استخراج كشف الراتب الشفاف المفصل (Printable Payslip)
        $payslipRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->getJson("/api/v1/hr/payrolls/{$payrollId}/items/{$itemShift->id}/payslip");

        $payslipRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.employee.code', 'EMP-P-SH')
            ->assertJsonPath('data.item.net_salary', '300.0000')
            ->assertJsonPath('data.attendances_summary.payable_days', 2);

        // 4. اعتماد المسير
        $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->postJson("/api/v1/hr/payrolls/{$payrollId}/approve")
            ->assertStatus(200);

        // 5. محاولة إعادة توليد نفس الفترة بعد الاعتماد -> يجب حظرها حفاظاً على الحصانة التاريخية
        $blockedGenRes = $this->withHeader('Authorization', "Bearer {$this->tokenAccountantA}")
            ->postJson('/api/v1/hr/payrolls/generate', [
                'payroll_period' => '2026-11-PERIOD-1',
                'period_start' => '2026-11-01',
                'period_end' => '2026-11-07',
            ]);

        $blockedGenRes->assertStatus(422)->assertJsonPath('error', 'PayrollPeriodLocked');
    }

    /**
     * Stage 3: Multi-Tenant Isolation
     */
    public function test_strict_multi_tenant_isolation_in_production_and_payroll(): void
    {
        // إنشاء أمر إنتاج في الشركة A
        $orderA = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'order_number' => 'PO-ISO-A',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+7 days')),
            'total_planned_quantity' => 100,
            'status' => 'draft',
        ]);

        // محاولة المستخدم من الشركة B الوصول إلى أمر الإنتاج التابع للشركة A
        $resB = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->getJson("/api/v1/production-orders/{$orderA->id}");

        $resB->assertStatus(404);

        // محاولة تعديله
        $updateB = $this->withHeader('Authorization', "Bearer {$this->tokenB}")
            ->putJson("/api/v1/production-orders/{$orderA->id}", [
                'notes' => 'محاولة اختراق بين المستأجرين',
            ]);

        $updateB->assertStatus(404);
    }
}

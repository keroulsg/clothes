<?php

namespace Tests\Feature;

use App\Models\BillOfMaterial;
use App\Models\Branch;
use App\Models\Color;
use App\Models\CustomerMaterial;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\ProductionOrder;
use App\Models\ProductionStage;
use App\Models\QualityInspection;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\ProductionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionAndCuttingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Warehouse $warehouseFabA;
    protected Warehouse $warehouseFGA;
    protected InventoryItem $fabricItemA;
    protected InventoryItem $finishedGoodItemA;
    protected GarmentModel $modelA;
    protected Color $colorRed;
    protected Color $colorBlue;
    protected Size $size2Y;
    protected Size $size4Y;
    protected ProductionService $productionService;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->inventoryService = app(InventoryService::class);
        $this->productionService = app(ProductionService::class);

        // المستأجر أ
        $this->tenantA = Tenant::create([
            'code' => 'TEN-PROD-A',
            'name' => 'مصنع النور لملابس الأطفال',
            'subdomain' => 'alnoor-kids',
            'is_active' => true,
        ]);

        // المستأجر ب
        $this->tenantB = Tenant::create([
            'code' => 'TEN-PROD-B',
            'name' => 'مصنع الدلتا للملابس',
            'subdomain' => 'delta-apparel',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير إنتاج النور',
            'email' => 'prod-admin@alnoorkids.com',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير إنتاج الدلتا',
            'email' => 'prod-admin@deltaapparel.com',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        // الفروع
        Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المصنع الرئيسي',
            'code' => 'BR-01',
            'type' => 'factory',
            'is_active' => true,
        ]);

        // مخازن المستأجر أ
        $this->warehouseFabA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن الأقمشة',
            'code' => 'WH-FAB-01',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $this->warehouseFGA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن المنتج التام',
            'code' => 'WH-FG-01',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        // أصناف المخزون
        $this->fabricItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseFabA->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-COT-101',
            'name' => 'قماش قطن سينجل جيرسي 180 GSM',
            'unit_of_measure' => 'meter',
            'current_balance' => 1000.0,
            'average_cost' => 120.0,
            'technical_specs' => ['gsm' => 180.0, 'usable_width' => 1.60],
            'is_active' => true,
        ]);

        $this->finishedGoodItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseFGA->id,
            'item_type' => 'finished_good',
            'code' => 'PRD-TSH-001',
            'name' => 'تيشيرت أطفال قطن صيفي',
            'unit_of_measure' => 'pcs',
            'current_balance' => 0.0,
            'average_cost' => 0.0,
            'is_active' => true,
        ]);

        // ألوان ومقاسات
        $this->colorRed = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر زاهي',
            'color_code' => '#FF0000',
        ]);
        $this->colorBlue = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'كحلي غامق',
            'color_code' => '#000080',
        ]);

        $this->size2Y = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => '2Y',
            'category' => 'kids',
            'sort_order' => 1,
        ]);
        $this->size4Y = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => '4Y',
            'category' => 'kids',
            'sort_order' => 2,
        ]);

        // الموديل
        $this->modelA = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSH-KID',
            'name' => 'تيشيرت صيفي مطبوع',
            'category' => 'تيشيرت أولادي',
            'season' => 'صيف 2026',
            'is_active' => true,
        ]);

        // تهيئة المراحل الافتراضية
        $this->productionService->ensureDefaultStages($this->tenantA->id);
    }

    /**
     * 1. اختبار إنشاء قائمة الخامات (BOM) واعتماد الإصدار وأرشفة القديم
     */
    public function test_can_create_bom_and_approve_version(): void
    {
        $payload = [
            'garment_model_id' => $this->modelA->id,
            'version' => '1.0',
            'bom_code' => 'BOM-TSH-V1',
            'name' => 'قائمة مكونات تيشيرت الأطفال المعيارية',
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'component_type' => 'fabric',
                    'consumption_per_unit' => 0.75, // 0.75 متر للقطعة
                    'unit_of_measure' => 'm',
                    'waste_tolerance_percent' => 5.0, // 5% سماحية هالك
                    'unit_cost' => 120.0,
                ],
            ],
        ];

        $res = $this->actingAs($this->userA)
            ->postJson('/api/v1/boms', $payload);

        $res->assertStatus(201);
        $res->assertJsonPath('success', true);
        $bomId = $res->json('data.id');

        // اعتماد الـ BOM
        $approveRes = $this->actingAs($this->userA)
            ->postJson("/api/v1/boms/{$bomId}/approve");

        $approveRes->assertStatus(200);
        $this->assertEquals('approved', $approveRes->json('data.status'));
        $this->assertTrue($approveRes->json('data.is_active'));

        // إنشاء إصدار ثانٍ 2.0 واعتماده
        $payloadV2 = $payload;
        $payloadV2['version'] = '2.0';
        $payloadV2['bom_code'] = 'BOM-TSH-V2';
        $resV2 = $this->actingAs($this->userA)->postJson('/api/v1/boms', $payloadV2);
        $bomIdV2 = $resV2->json('data.id');

        $this->actingAs($this->userA)->postJson("/api/v1/boms/{$bomIdV2}/approve");

        // التحقق من أرشفة الإصدار الأول وتفعيل الإصدار الثاني فقط
        $this->assertFalse(BillOfMaterial::find($bomId)->is_active);
        $this->assertTrue(BillOfMaterial::find($bomIdV2)->is_active);
    }

    /**
     * 2. اختبار دورة إنتاج كاملة: أمر إنتاج -> اعتماد -> أمر قص وصرف قماش -> بطاقات حزم -> مراحل تشغيل -> فحص جودة نهائي وتحويل لمخزن المنتج التام
     */
    public function test_full_production_cycle_from_order_to_cutting_bundles_and_qc(): void
    {
        // 1. إنشاء أمر الإنتاج
        $orderPayload = [
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+10 days')),
            'priority' => 'high',
            'items' => [
                [
                    'color_id' => $this->colorRed->id,
                    'size_id' => $this->size2Y->id,
                    'planned_quantity' => 50,
                ],
                [
                    'color_id' => $this->colorBlue->id,
                    'size_id' => $this->size4Y->id,
                    'planned_quantity' => 50,
                ],
            ],
        ];

        $orderRes = $this->actingAs($this->userA)
            ->postJson('/api/v1/production-orders', $orderPayload);

        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id');
        $this->assertEquals(100, $orderRes->json('data.total_planned_quantity'));

        // 2. اعتماد أمر الإنتاج
        $appRes = $this->actingAs($this->userA)
            ->postJson("/api/v1/production-orders/{$orderId}/approve");
        $appRes->assertStatus(200);
        $this->assertEquals('approved', $appRes->json('data.status'));

        // رصيد القماش قبل القص = 1000 متر
        $balanceBeforeCut = (float) $this->fabricItemA->fresh()->current_balance;

        // 3. صالة القص: تنفيذ أمر قص وفرش (50 راق/طبقة بارتفاع مترين لكل راقة = 100 متر نظري)
        $cutPayload = [
            'production_order_id' => $orderId,
            'warehouse_id' => $this->warehouseFabA->id,
            'fabric_inventory_item_id' => $this->fabricItemA->id,
            'fabric_source' => 'factory_owned',
            'lay_length_meters' => 2.0,
            'layers_count' => 50,
            'end_loss_meters' => 0.05,
            'remnant_meters' => 2.5,
            'usable_width_meters' => 1.60,
            'total_cut_pieces' => 100,
        ];

        $cutRes = $this->actingAs($this->userA)
            ->postJson('/api/v1/cutting-orders', $cutPayload);

        $cutRes->assertStatus(201);
        $cutOrderId = $cutRes->json('data.id');

        // التحقق من خصم القماش من المخزن الفعلي عبر InventoryService
        $this->fabricItemA->refresh();
        $this->assertLessThan($balanceBeforeCut, (float) $this->fabricItemA->current_balance);

        // التحقق من توليد بطاقات الحزم (Bundle Cards)
        $bundles = CuttingBundle::where('cutting_order_id', $cutOrderId)->get();
        $this->assertGreaterThan(0, $bundles->count());
        $bundle = $bundles->first();
        $this->assertStringStartsWith('BND-', $bundle->bundle_code);
        $this->assertEquals('cutting', $bundle->current_stage_code);

        // 4. تتبع نقل الحزمة من القص إلى خط الخياطة (Sewing)
        $transferPayload = [
            'to_stage_code' => 'sewing',
            'operator_name' => 'الأسطى إبراهيم حسن',
            'work_line' => 'خط التيشيرت 1',
            'input_quantity' => $bundle->quantity,
            'output_accepted_quantity' => $bundle->quantity,
            'output_rejected_quantity' => 0,
            'scrap_quantity' => 0,
        ];

        $transRes = $this->actingAs($this->userA)
            ->postJson("/api/v1/bundles/{$bundle->id}/transfer", $transferPayload);

        $transRes->assertStatus(200);
        $this->assertEquals('sewing', $bundle->fresh()->current_stage_code);

        // 5. فحص الجودة النهائي (Final Audit) واعتماد تحويل القطع السليمة إلى مخزن المنتج التام
        $qcPayload = [
            'production_order_id' => $orderId,
            'cutting_bundle_id' => $bundle->id,
            'inspector_name' => 'م. نادية سمير (مديرة الجودة)',
            'inspection_type' => 'final_audit',
            'inspected_quantity' => 100,
            'passed_quantity' => 98,
            'rework_quantity' => 2,
            'rejected_quantity' => 0,
            'finished_goods_inventory_item_id' => $this->finishedGoodItemA->id,
            'defects' => [
                [
                    'defect_type' => 'skip_stitch',
                    'severity' => 'minor',
                    'quantity' => 2,
                    'corrective_action' => 'إعادة خياطة الحلية الأمامية',
                ],
            ],
        ];

        $qcRes = $this->actingAs($this->userA)
            ->postJson('/api/v1/quality-inspections', $qcPayload);

        $qcRes->assertStatus(201);
        $this->assertEquals('rework_required', $qcRes->json('data.decision'));

        // التحقق من دخول الـ 98 قطعة إلى مخزن المنتج التام عبر InventoryService
        $this->finishedGoodItemA->refresh();
        $this->assertEquals(98.0, (float) $this->finishedGoodItemA->current_balance);

        // التحقق من إحصائيات أمر الإنتاج (Metrics)
        $metricsRes = $this->actingAs($this->userA)
            ->getJson("/api/v1/production-orders/{$orderId}/metrics");

        $metricsRes->assertStatus(200);
        $this->assertEquals(98, $metricsRes->json('data.total_completed_quantity'));
        $this->assertEquals(2, $metricsRes->json('data.total_rework_quantity'));
        $this->assertArrayHasKey('skip_stitch', $metricsRes->json('data.defects_breakdown'));
    }

    /**
     * 3. اختبار حظر الصرف لأمر غير معتمد أو عند نفاد رصيد القماش
     */
    public function test_cutting_fails_if_production_order_not_approved_or_fabric_insufficient(): void
    {
        // إنشاء أمر في حالة مسودة
        $order = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-DRAFT-99',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+7 days')),
            'total_planned_quantity' => 50,
            'status' => 'draft',
        ]);

        $cutPayload = [
            'production_order_id' => $order->id,
            'warehouse_id' => $this->warehouseFabA->id,
            'fabric_inventory_item_id' => $this->fabricItemA->id,
            'fabric_source' => 'factory_owned',
            'lay_length_meters' => 2.0,
            'layers_count' => 10,
        ];

        // محاولة القص لأمر مسودة
        $resDraft = $this->actingAs($this->userA)
            ->postJson('/api/v1/cutting-orders', $cutPayload);

        $resDraft->assertStatus(422);
        $this->assertStringContainsString('غير معتمد', $resDraft->json('message'));

        // اعتماد الأمر ولكن طلب كمية أقمشة تفوق رصيد المخزن (المتاح 1000 متر، نطلب 500 راقة * 5 أمتار = 2500 متر)
        $order->status = 'approved';
        $order->save();

        $cutPayload['lay_length_meters'] = 5.0;
        $cutPayload['layers_count'] = 500; // 2500m

        $resExcess = $this->actingAs($this->userA)
            ->postJson('/api/v1/cutting-orders', $cutPayload);

        $resExcess->assertStatus(422);
        $this->assertStringContainsString('غير كافٍ', $resExcess->json('message'));
    }

    /**
     * 4. اختبار تتبع الهالك الفعلي في الحزم ومنع عدم تطابق الكميات
     */
    public function test_bundle_transfer_detects_scrap_and_quantity_variance(): void
    {
        $order = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-SCRAP-01',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+5 days')),
            'total_planned_quantity' => 20,
            'total_cut_quantity' => 20,
            'status' => 'in_progress',
        ]);

        $cuttingOrder = CuttingOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_number' => 'CUT-SCRAP-01',
            'production_order_id' => $order->id,
            'warehouse_id' => $this->warehouseFabA->id,
            'lay_length_meters' => 1.5,
            'layers_count' => 20,
            'status' => 'cut_completed',
        ]);

        $bundle = CuttingBundle::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'bundle_code' => 'BND-SCRAP-TEST',
            'cutting_order_id' => $cuttingOrder->id,
            'production_order_id' => $order->id,
            'bundle_number' => 1,
            'color_id' => $this->colorRed->id,
            'size_id' => $this->size2Y->id,
            'quantity' => 20,
            'current_stage_code' => 'cutting',
            'status' => 'active',
        ]);

        // 1. محاولة إدخال كميات غير متطابقة (المستلم 20، والمجموع 25) -> يجب الرفض بـ 422
        $badPayload = [
            'to_stage_code' => 'sewing',
            'input_quantity' => 20,
            'output_accepted_quantity' => 22,
            'scrap_quantity' => 3,
        ];
        $resBad = $this->actingAs($this->userA)
            ->postJson("/api/v1/bundles/{$bundle->id}/transfer", $badPayload);
        $resBad->assertStatus(422);

        // 2. تسجيل هالك فعلي صحيح (20 مستلم: 18 مقبول + 2 هالك)
        $goodPayload = [
            'to_stage_code' => 'sewing',
            'input_quantity' => 20,
            'output_accepted_quantity' => 18,
            'output_rejected_quantity' => 0,
            'scrap_quantity' => 2,
        ];
        $resGood = $this->actingAs($this->userA)
            ->postJson("/api/v1/bundles/{$bundle->id}/transfer", $goodPayload);

        $resGood->assertStatus(200);

        // التحقق من تحديث رصيد الحزمة إلى 18 وزيادة هالك أمر الإنتاج بـ 2
        $this->assertEquals(18, $bundle->fresh()->quantity);
        $this->assertEquals(2, $order->fresh()->total_scrapped_quantity);
    }

    /**
     * 5. اختبار عزل أمانات خامات العملاء وصرفها دون المساس بمخزون أقمشة المصنع
     */
    public function test_customer_supplied_materials_in_cutting_room_are_isolated(): void
    {
        $customerMat = CustomerMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseFabA->id,
            'customer_name' => 'شركة أزياء الأطفال الذهبية',
            'fabric_name' => 'قماش بيكيه قطن',
            'fabric_code' => 'CUST-PIQ-01',
            'gsm' => 200.0,
            'usable_width_meters' => 1.60,
            'received_meters' => 500.0,
            'consumed_meters' => 0.0,
            'waste_meters' => 0.0,
            'returned_meters' => 0.0,
            'remaining_meters' => 500.0,
        ]);

        $order = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-CUST-CUT',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d', strtotime('+3 days')),
            'total_planned_quantity' => 100,
            'status' => 'approved',
        ]);

        $factoryFabricBefore = (float) $this->fabricItemA->fresh()->current_balance;

        $cutPayload = [
            'production_order_id' => $order->id,
            'warehouse_id' => $this->warehouseFabA->id,
            'fabric_source' => 'customer_deposit',
            'customer_material_id' => $customerMat->id,
            'lay_length_meters' => 2.0,
            'layers_count' => 50, // 100 meters
            'total_cut_pieces' => 100,
        ];

        $res = $this->actingAs($this->userA)
            ->postJson('/api/v1/cutting-orders', $cutPayload);

        $res->assertStatus(201);

        // التحقق من أن مخزون قماش المصنع لم ينقص نهائياً
        $this->assertEquals($factoryFabricBefore, (float) $this->fabricItemA->fresh()->current_balance);

        // والتحقق من خصم الـ 100 متر من رصيد أمانة العميل
        $customerMat->refresh();
        $this->assertEquals(400.0, (float) $customerMat->remaining_meters);
        $this->assertEquals(100.0, (float) $customerMat->consumed_meters);
    }

    /**
     * 6. اختبار العزل التام بين الشركات (Multi-Tenancy Isolation)
     */
    public function test_cross_tenant_isolation_on_production_and_cutting(): void
    {
        $orderA = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-TENANT-A',
            'garment_model_id' => $this->modelA->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d'),
            'total_planned_quantity' => 100,
            'status' => 'approved',
        ]);

        // يحاول المستأجر ب قراءة أو اعتماد أمر إنتاج المستأجر أ
        $resShow = $this->actingAs($this->userB)
            ->getJson("/api/v1/production-orders/{$orderA->id}");
        $resShow->assertStatus(404);

        // قائمة أوامر المستأجر ب لا يظهر فيها أي أمر للمستأجر أ
        $resList = $this->actingAs($this->userB)
            ->getJson('/api/v1/production-orders');
        $resList->assertStatus(200);
        $this->assertCount(0, $resList->json('data'));
    }
}

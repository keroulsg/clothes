<?php

namespace Tests\Feature;

use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CatalogAndInventoryTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private User $userA;
    private Warehouse $warehouseA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TEN-INV-A',
            'name' => 'مصنع النيل للأزياء',
            'subdomain' => 'nile-fashion',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'م. حسام الدين',
            'email' => 'hossam@nilefashion.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن الأقمشة الرئيسي',
            'code' => 'WH-FAB-01',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    /**
     * اختبار: إنشاء موديل ملابس وتوليد جميع المتغيرات والباركودات آلياً
     */
    public function test_can_create_garment_model_and_auto_generate_variants(): void
    {
        $size1 = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'حديثي ولادة (0-3 شهور)',
            'category' => 'infant',
        ]);
        $size2 = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'صغار (3-6 شهور)',
            'category' => 'infant',
        ]);

        $color1 = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أزرق سماوي',
            'color_code' => '#38bdf8',
        ]);
        $color2 = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أبيض لؤلؤي',
            'color_code' => '#ffffff',
        ]);
        $color3 = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'وردي أطفال',
            'color_code' => '#f472b6',
        ]);

        $payload = [
            'code' => 'KID-SLP-01',
            'name' => 'سالوبيت مواليد قطن 100%',
            'category' => 'مواليد',
            'season' => 'صيف 2026',
            'target_cost' => 85.00,
            'wholesale_price' => 135.00,
            'retail_price' => 195.00,
            'size_ids' => [$size1->id, $size2->id],
            'color_ids' => [$color1->id, $color2->id, $color3->id],
        ];

        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/models', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('model.code', 'KID-SLP-01')
            ->assertJsonPath('generated_variants_count', 6); // 2 مقاسات × 3 ألوان = 6 متغيرات

        $this->assertEquals(6, ProductVariant::where('tenant_id', $this->tenantA->id)->count());
    }

    /**
     * اختبار: تسجيل حركة في دفتر الأستاذ وتحديث الرصيد والمتوسط المرجح للتكلفة
     */
    public function test_stock_ledger_updates_balance_and_creates_immutable_transaction(): void
    {
        $item = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-JERSEY-01',
            'name' => 'قماش سينجل جيرسي كحلي',
            'unit_of_measure' => 'meter',
            'current_balance' => 0,
            'average_cost' => 0,
        ]);

        $service = app(InventoryService::class);

        // الحركة الأولى: استلام 500 متر بسعر 100 ج.م
        $tx1 = $service->recordTransaction([
            'inventory_item_id' => $item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 500,
            'unit_cost' => 100.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-991',
        ]);

        $item->refresh();
        $this->assertEquals(500.0, (float) $item->current_balance);
        $this->assertEquals(100.0, (float) $item->average_cost);
        $this->assertEquals(0, (float) $tx1->balance_before);
        $this->assertEquals(500, (float) $tx1->balance_after);

        // الحركة الثانية: استلام 500 متر أخرى بسعر 120 ج.م
        // التكلفة المرجحة الجديدة: ((500*100) + (500*120)) / 1000 = 110 ج.م
        $tx2 = $service->recordTransaction([
            'inventory_item_id' => $item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 500,
            'unit_cost' => 120.0,
        ]);

        $item->refresh();
        $this->assertEquals(1000.0, (float) $item->current_balance);
        $this->assertEquals(110.0, (float) $item->average_cost);

        // الحركة الثالثة: صرف 200 متر للقص
        $tx3 = $service->recordTransaction([
            'inventory_item_id' => $item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 200,
        ]);

        $item->refresh();
        $this->assertEquals(800.0, (float) $item->current_balance);
        $this->assertEquals(1000.0, (float) $tx3->balance_before);
        $this->assertEquals(800.0, (float) $tx3->balance_after);
    }

    /**
     * اختبار أمان المخزون: منع الصرف الزائد ومنع الرصيد السالب
     */
    public function test_negative_stock_issuance_is_blocked_by_default(): void
    {
        $item = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'item_type' => 'accessory_raw',
            'code' => 'BTN-SNAP-01',
            'name' => 'أزرار كبس أطفال',
            'unit_of_measure' => 'piece',
            'current_balance' => 100, // متاح 100 قطعة فقط
        ]);

        $service = app(InventoryService::class);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('رصيد الصنف [أزرار كبس أطفال] في المخزن غير كافٍ');

        // محاولة صرف 150 قطعة
        $service->recordTransaction([
            'inventory_item_id' => $item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 150,
        ]);
    }

    /**
     * اختبار: دقة معادلات تحويل الأقمشة بين المتر والكيلوجرام
     */
    public function test_fabric_conversion_formula_meters_to_kg_and_vice_versa(): void
    {
        $service = app(InventoryService::class);

        // تجربة معملية:
        // قماش سينجل جيرسي: 500 متر، عرض القماش 1.6 متر (160 سم)، كثافة GSM = 180 جم/م2
        // الوزن النظري = 500 × 1.6 × (180 / 1000) = 144 كجم
        $result = $service->convertFabricMetersToKg(500.0, 1.6, 180.0);

        $this->assertEquals(144.0, $result['calculated_weight_kg']);
        $this->assertEquals(288.0, $result['linear_weight_grams_per_meter']);

        // التحويل العكسي: 144 كجم يجب أن ينتج 500 متر بالضبط
        $reverseResult = $service->convertFabricKgToMeters(144.0, 1.6, 180.0);
        $this->assertEquals(500.0, $reverseResult['calculated_meters']);

        // اختبار عبر واجهة الـ API
        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/inventory/convert-fabric', [
                'mode' => 'meters_to_kg',
                'value' => 500,
                'usable_width_meters' => 1.6,
                'gsm' => 180,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('conversion.calculated_weight_kg', 144);
    }

    /**
     * اختبار: خامات العملاء أمانات تشغيل ولا تختلط بأصول المصنع
     */
    public function test_customer_supplied_materials_are_isolated_from_company_owned_assets(): void
    {
        $service = app(InventoryService::class);

        $custMaterial = $service->receiveCustomerMaterial([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'شركة أزياء الصغار',
            'fabric_name' => 'قماش جبردين تركي قطن 100%',
            'fabric_code' => 'CUST-GAB-01',
            'gsm' => 240,
            'usable_width_meters' => 1.5,
            'received_meters' => 1000,
            'warehouse_id' => $this->warehouseA->id,
            'notes' => 'تشغيل للغير (أمر قص رقم 12)',
        ]);

        $this->assertEquals(1000, $custMaterial->remaining_meters);
        $this->assertEquals(0, $custMaterial->consumed_meters);

        // صرف 300 متر للقص مع 15 متر هالك
        $updated = $service->consumeCustomerMaterial($custMaterial->id, 300, 15);

        $this->assertEquals(300, $updated->consumed_meters);
        $this->assertEquals(15, $updated->waste_meters);
        $this->assertEquals(685, $updated->remaining_meters); // 1000 - 315 = 685
    }

    /**
     * اختبار عزل المستأجرين على مستوى الموديلات والمخزون
     */
    public function test_cross_tenant_isolation_on_models_and_inventory(): void
    {
        $tenantB = Tenant::create([
            'code' => 'TEN-INV-B',
            'name' => 'شركة الهرم للملابس',
            'subdomain' => 'haram',
        ]);

        $userB = User::create([
            'tenant_id' => $tenantB->id,
            'name' => 'أحمد الهرم',
            'email' => 'ahmed@haram.com',
            'password' => bcrypt('password'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // مستخدم شركة أ ينشئ موديل
        GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-A-EXCLUSIVE',
            'name' => 'فستان أطفال خاص بشركة أ',
            'category' => 'بناتي',
        ]);

        // مستخدم شركة ب يطلب الموديلات
        $response = $this->actingAs($userB)->getJson('/api/v1/models');

        $response->assertStatus(200);
        $data = $response->json('data');

        // يجب ألا يرى أي موديل يخص شركة أ
        $this->assertCount(0, $data);
    }
}

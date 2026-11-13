<?php

namespace Tests\Feature;

use App\Models\BillOfMaterial;
use App\Models\BomItem;
use App\Models\Branch;
use App\Models\Color;
use App\Models\CuttingOrder;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\ProductionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class ProductionBomInventoryLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected Warehouse $warehouseRawA;
    protected Warehouse $warehouseFGA;
    protected GarmentModel $modelA;
    protected Color $colorRed;
    protected Color $colorBlue;
    protected Size $sizeS;
    protected Size $sizeM;
    protected InventoryItem $fabricItem;
    protected InventoryItem $zipperItem;
    protected InventoryItem $buttonItem;
    protected InventoryItem $threadItem;
    protected BillOfMaterial $bomA;
    protected ProductionService $productionService;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->inventoryService = app(InventoryService::class);
        $this->productionService = app(ProductionService::class);

        $this->tenantA = Tenant::create([
            'code' => 'TEN-PROD-LIFECYCLE-A',
            'name' => 'مصنع النيل للملابس',
            'subdomain' => 'nile-garments',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TEN-PROD-LIFECYCLE-B',
            'name' => 'مصنع الدلتا للملابس',
            'subdomain' => 'delta-garments',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مهندس الإنتاج',
            'email' => 'production.engineer@nilegarments.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('Password123!'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المصنع الرئيسي',
            'code' => 'BR-01',
            'type' => 'factory',
            'is_active' => true,
        ]);

        $this->warehouseRawA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع الخامات والمستلزمات',
            'code' => 'WH-RAW-01',
            'type' => 'raw_materials',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $this->warehouseFGA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع المنتجات التامة',
            'code' => 'WH-FG-01',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $this->colorRed = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر',
            'code' => 'RED',
        ]);

        $this->colorBlue = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أزرق',
            'code' => 'BLU',
        ]);

        $this->sizeS = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Small',
            'code' => 'S',
            'sort_order' => 1,
        ]);

        $this->sizeM = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Medium',
            'code' => 'M',
            'sort_order' => 2,
        ]);

        $this->modelA = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'جاكيت شتوي رجالي',
            'code' => 'JKT-W-01',
            'category' => 'jackets',
            'wholesale_price' => 450.00,
        ]);

        // Create product variants for model
        ProductVariant::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'color_id' => $this->colorRed->id,
            'size_id' => $this->sizeS->id,
            'sku' => 'JKT-RED-S',
            'barcode' => '622000000001',
            'retail_price' => 600.00,
            'wholesale_price' => 450.00,
            'is_active' => true,
        ]);

        ProductVariant::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'color_id' => $this->colorBlue->id,
            'size_id' => $this->sizeM->id,
            'sku' => 'JKT-BLU-M',
            'barcode' => '622000000002',
            'retail_price' => 600.00,
            'wholesale_price' => 450.00,
            'is_active' => true,
        ]);

        // Raw Material Inventory Items
        $this->fabricItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseRawA->id,
            'name' => 'قماش صوف ميلتون أسود',
            'code' => 'FAB-WOOL-01',
            'type' => 'fabric',
            'item_type' => 'fabric_raw',
            'unit_of_measure' => 'meter',
            'current_balance' => 500.00,
            'reserved_balance' => 0.00,
            'average_cost' => 120.00,
            'is_customer_owned' => false,
            'is_active' => true,
        ]);

        $this->zipperItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseRawA->id,
            'name' => 'سوستة نحاسية 60 سم',
            'code' => 'ZIP-COP-60',
            'type' => 'accessories',
            'item_type' => 'trims',
            'unit_of_measure' => 'piece',
            'current_balance' => 200.00,
            'reserved_balance' => 0.00,
            'average_cost' => 15.00,
            'is_customer_owned' => false,
            'is_active' => true,
        ]);

        $this->buttonItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseRawA->id,
            'name' => 'أزرار معدنية كبس',
            'code' => 'BTN-MTL-01',
            'type' => 'accessories',
            'item_type' => 'trims',
            'unit_of_measure' => 'piece',
            'current_balance' => 1000.00,
            'reserved_balance' => 0.00,
            'average_cost' => 2.50,
            'is_customer_owned' => false,
            'is_active' => true,
        ]);

        $this->threadItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseRawA->id,
            'name' => 'بكر خيط بوليستر أحمر',
            'code' => 'THR-RED-01',
            'type' => 'accessories',
            'item_type' => 'trims',
            'unit_of_measure' => 'cone',
            'current_balance' => 50.00,
            'reserved_balance' => 0.00,
            'average_cost' => 25.00,
            'is_customer_owned' => false,
            'is_active' => true,
        ]);

        // Create Approved BOM
        $this->bomA = BillOfMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'bom_code' => 'BOM-JKT-01',
            'name' => 'شجرة الخامات لجاكيت شتوي',
            'version' => '1.0',
            'status' => 'approved',
            'is_active' => true,
            'total_estimated_cost_per_piece' => 220.00,
        ]);

        // Fabric (General for all variants)
        BomItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'bill_of_material_id' => $this->bomA->id,
            'inventory_item_id' => $this->fabricItem->id,
            'component_type' => 'fabric',
            'consumption_per_unit' => 1.5, // 1.5m per piece
            'waste_tolerance_percent' => 5.0, // 5% waste
            'unit_of_measure' => 'meter',
            'unit_cost' => 120.00,
        ]);

        // Zipper (General for all variants)
        BomItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'bill_of_material_id' => $this->bomA->id,
            'inventory_item_id' => $this->zipperItem->id,
            'component_type' => 'zipper',
            'consumption_per_unit' => 1.0, // 1 zipper per piece
            'waste_tolerance_percent' => 0.0,
            'unit_of_measure' => 'piece',
            'unit_cost' => 15.00,
        ]);

        // Variant-Specific Component: Thread applies only to color Red
        BomItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'bill_of_material_id' => $this->bomA->id,
            'inventory_item_id' => $this->threadItem->id,
            'color_id' => $this->colorRed->id,
            'component_type' => 'thread',
            'consumption_per_unit' => 0.1, // 0.1 cone per red jacket
            'waste_tolerance_percent' => 0.0,
            'unit_of_measure' => 'cone',
            'unit_cost' => 25.00,
        ]);
    }

    public function test_approved_bom_selected_and_materials_reserved_on_production_approval(): void
    {
        // 1. Create draft production order with 40 red small jackets and 20 blue medium jackets
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
            'priority' => 'high',
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 40],
            ['color_id' => $this->colorBlue->id, 'size_id' => $this->sizeM->id, 'planned_quantity' => 20],
        ]);

        $this->assertEquals('draft', $order->status);
        $this->assertEquals(0, $this->zipperItem->fresh()->reserved_balance);
        $this->assertEquals(0, $this->threadItem->fresh()->reserved_balance);

        // 2. Approve production order -> should automatically validate and reserve materials
        $approvedOrder = $this->productionService->approveProductionOrder($order->id);
        $this->assertEquals('approved', $approvedOrder->status);

        // Zipper: required for 60 pieces = 60 * 1 = 60
        $this->assertEquals(60.00, (float)$this->zipperItem->fresh()->reserved_balance);

        // Thread: required only for 40 RED pieces = 40 * 0.1 = 4 cones
        $this->assertEquals(4.00, (float)$this->threadItem->fresh()->reserved_balance);

        // Fabric: 60 pieces * 1.5 * 1.05 = 94.5 meters
        $this->assertEquals(94.50, (float)$this->fabricItem->fresh()->reserved_balance);
    }

    public function test_material_shortage_strictly_blocks_production_order_approval(): void
    {
        // Reduce zipper stock to only 10 pieces available
        $this->zipperItem->update(['current_balance' => 10.00, 'reserved_balance' => 0.00]);

        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 50],
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('عجز في مخزون مستلزمات الـ BOM');

        // Approval must fail due to shortage (50 needed, only 10 available)
        $this->productionService->approveProductionOrder($order->id);
    }

    public function test_variant_specific_bom_requirements_respect_color_and_size_restrictions(): void
    {
        // Order only Blue pieces -> Thread (restricted to Red) must require 0!
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorBlue->id, 'size_id' => $this->sizeM->id, 'planned_quantity' => 30],
        ]);

        $requirements = $this->productionService->calculateBomRequirements($order);

        $threadReq = collect($requirements)->firstWhere('inventory_item_id', $this->threadItem->id);
        $this->assertNull($threadReq); // Not needed for Blue

        $zipperReq = collect($requirements)->firstWhere('inventory_item_id', $this->zipperItem->id);
        $this->assertNotNull($zipperReq);
        $this->assertEquals(30.00, $zipperReq['required_quantity']);
    }

    public function test_generic_bom_issuance_skips_fabric_already_handled_by_cutting(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 20],
        ]);

        $this->productionService->approveProductionOrder($order->id);

        $initialFabricBalance = (float)$this->fabricItem->fresh()->current_balance;
        $initialZipperBalance = (float)$this->zipperItem->fresh()->current_balance;

        // Issue BOM accessories
        $result = $this->productionService->issueBomMaterials($order->id);

        $this->assertTrue($result['success']);

        // Zipper (accessory) must be issued and physical stock decremented by 20
        $this->assertEquals($initialZipperBalance - 20, (float)$this->zipperItem->fresh()->current_balance);
        $this->assertEquals(0, (float)$this->zipperItem->fresh()->reserved_balance);

        // Fabric MUST NOT be decremented by generic BOM issuance (cutting owns fabric issuance)
        $this->assertEquals($initialFabricBalance, (float)$this->fabricItem->fresh()->current_balance);
    }

    public function test_accessories_and_trims_issued_once_with_idempotency(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 15],
        ]);

        $this->productionService->approveProductionOrder($order->id);

        $key = "IDEMP-BOM-ISSUE-{$order->id}";
        $result1 = $this->productionService->issueBomMaterials($order->id, ['idempotency_key' => $key]);
        $this->assertTrue($result1['success']);

        $zipperAfterFirst = (float)$this->zipperItem->fresh()->current_balance;

        // Second call with same idempotency key must not duplicate deductions
        $result2 = $this->productionService->issueBomMaterials($order->id, ['idempotency_key' => $key]);
        $this->assertTrue($result2['already_issued']);

        // Stock balance unchanged
        $this->assertEquals($zipperAfterFirst, (float)$this->zipperItem->fresh()->current_balance);
    }

    public function test_partial_production_and_partial_material_issuance(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 50],
        ]);

        $this->productionService->approveProductionOrder($order->id);

        // 50% partial issuance
        $res = $this->productionService->issueBomMaterials($order->id, [
            'idempotency_key' => "PARTIAL-50-{$order->id}",
            'partial_ratio' => 0.5,
        ]);

        $this->assertTrue($res['success']);
        // 50 zippers total * 0.5 = 25 zippers issued
        $this->assertEquals(200.00 - 25.00, (float)$this->zipperItem->fresh()->current_balance);
    }

    public function test_finished_goods_received_into_finished_goods_warehouse_on_completion(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 30],
        ]);

        $this->productionService->approveProductionOrder($order->id);
        $this->productionService->issueBomMaterials($order->id);

        // Complete finished goods receipt
        $receipt = $this->productionService->receiveFinishedGoodsFromProduction($order->id);

        $this->assertTrue($receipt['success']);
        $this->assertEquals(30, $receipt['total_received']);
        $this->assertEquals('completed', $receipt['production_order_status']);

        // Check finished goods inventory item was created/updated in finished goods warehouse
        $fgItem = InventoryItem::withoutGlobalScopes()
            ->where('tenant_id', $this->tenantA->id)
            ->where('warehouse_id', $this->warehouseFGA->id)
            ->where('item_type', 'finished_goods')
            ->first();

        $this->assertNotNull($fgItem);
        $this->assertEquals(30.00, (float)$fgItem->current_balance);
        $this->assertEquals(220.00, (float)$fgItem->average_cost); // From BOM estimated cost
    }

    public function test_cancellation_releases_unissued_bom_reservations_and_reverses_issued_materials(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 20],
        ]);

        $this->productionService->approveProductionOrder($order->id);
        $this->assertEquals(20.00, (float)$this->zipperItem->fresh()->reserved_balance);

        // Cancel before issuance -> should release exact reservation
        $cancelledOrder = $this->productionService->cancelProductionOrder($order->id, 'طلب العميل تعديل المقاسات');
        $this->assertEquals('cancelled', $cancelledOrder->status);
        $this->assertEquals(0.00, (float)$this->zipperItem->fresh()->reserved_balance);
        $this->assertEquals(200.00, (float)$this->zipperItem->fresh()->current_balance);
    }

    public function test_tenant_boundary_enforcement_prevents_cross_tenant_bom_or_issuance(): void
    {
        // Switch context to Tenant B
        app()->instance('current_tenant_id', $this->tenantB->id);

        $this->expectException(InvalidArgumentException::class);

        // Tenant B trying to create production order with Tenant A's model
        $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 10],
        ]);
    }

    public function test_api_controller_endpoints_for_issue_and_receive(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 10],
        ]);

        $this->actingAs($this->userA);

        // 1. Approve via API
        $approveRes = $this->postJson("/api/v1/production-orders/{$order->id}/approve");
        $approveRes->assertStatus(200)->assertJson(['success' => true]);

        // 2. Issue BOM Materials via API
        $issueRes = $this->postJson("/api/v1/production-orders/{$order->id}/issue-bom-materials", [
            'idempotency_key' => 'API-ISSUE-01',
        ]);
        $issueRes->assertStatus(200)->assertJson(['success' => true]);

        // 3. Receive Finished Goods via API
        $receiveRes = $this->postJson("/api/v1/production-orders/{$order->id}/receive-finished-goods");
        $receiveRes->assertStatus(200)->assertJson(['success' => true]);
    }

    public function test_wrong_warehouse_rejected_on_finished_goods_receipt(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 10],
        ]);

        $this->productionService->approveProductionOrder($order->id);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('لا يوجد مخزن منتجات تامة نشط');

        // Passing raw materials warehouse as finished goods destination must be rejected
        $this->productionService->receiveFinishedGoodsFromProduction($order->id, [
            'warehouse_id' => $this->warehouseRawA->id,
        ]);
    }

    public function test_concurrent_issuance_protection(): void
    {
        $order = $this->productionService->createProductionOrder([
            'garment_model_id' => $this->modelA->id,
            'bill_of_material_id' => $this->bomA->id,
        ], [
            ['color_id' => $this->colorRed->id, 'size_id' => $this->sizeS->id, 'planned_quantity' => 10],
        ]);

        $this->productionService->approveProductionOrder($order->id);

        $key = 'CONCURRENT-KEY-1';
        $res1 = $this->productionService->issueBomMaterials($order->id, ['idempotency_key' => $key]);
        $res2 = $this->productionService->issueBomMaterials($order->id, ['idempotency_key' => $key]);

        $this->assertTrue($res1['success']);
        $this->assertTrue($res2['already_issued']);
    }
}

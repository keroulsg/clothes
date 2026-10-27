<?php

namespace Tests\Feature;

use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductVariant;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseAndInventoryPhaseBTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $ownerA;
    private User $ownerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'مصنع النيل للملابس',
            'code' => 'TEN-A',
            'subscription_status' => 'active',
            'subscription_tier' => 'enterprise',
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مالك مصنع أ',
            'email' => 'owner.a@example.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'مصنع الإسكندرية للغزل',
            'code' => 'TEN-B',
            'subscription_status' => 'active',
            'subscription_tier' => 'enterprise',
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مالك مصنع ب',
            'email' => 'owner.b@example.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    public function test_can_create_warehouse_with_type_and_location(): void
    {
        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->postJson('/api/v1/warehouses', [
                'name' => 'مخزن الأقمشة الرئيسي - المنطقة الصناعية',
                'code' => 'WH-FAB-01',
                'type' => 'fabric',
                'address' => 'العاشر من رمضان - مجمع 12',
                'allow_negative_stock' => false,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('warehouse.code', 'WH-FAB-01')
            ->assertJsonPath('warehouse.type', 'fabric');

        $this->assertDatabaseHas('warehouses', [
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-FAB-01',
        ]);
    }

    public function test_can_create_raw_material_item_with_shelf_bin_and_gsm(): void
    {
        $warehouse = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن الخامات',
            'code' => 'WH-RAW-1',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->postJson('/api/v1/inventory/items', [
                'warehouse_id' => $warehouse->id,
                'item_type' => 'fabric_raw',
                'code' => 'FAB-COTTON-NVY',
                'name' => 'قماش سنغل جيرسي قطن 100% كحلي',
                'unit_of_measure' => 'kg',
                'reorder_level' => 50.0,
                'average_cost' => 180.0,
                'initial_balance' => 200.0,
                'storage_zone' => 'منطقة أ - الأقمشة القطنية',
                'rack_location' => 'RACK-03',
                'shelf_bin_location' => 'BIN-12',
                'technical_specs' => [
                    'gsm' => 190.0,
                    'usable_width_meters' => 1.65,
                    'roll_count' => 8,
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('item.code', 'FAB-COTTON-NVY')
            ->assertJsonPath('item.storage_zone', 'منطقة أ - الأقمشة القطنية')
            ->assertJsonPath('item.rack_location', 'RACK-03')
            ->assertJsonPath('item.shelf_bin_location', 'BIN-12')
            ->assertJsonPath('item.current_balance', '200.0000');

        // Check that initial balance was recorded in immutable stock ledger
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'direction' => 'IN',
            'reference_type' => 'opening_balance',
            'quantity' => 200.0,
        ]);
    }

    public function test_can_filter_separately_by_raw_materials_and_finished_goods(): void
    {
        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المخزن العام',
            'code' => 'WH-GEN',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        // Raw material
        InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'fabric_raw',
            'code' => 'RAW-001',
            'name' => 'قماش بيكيه قطن',
            'unit_of_measure' => 'kg',
            'current_balance' => 150,
            'average_cost' => 120,
        ]);

        // Finished product
        InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'finished_good',
            'code' => 'FG-001',
            'name' => 'تيشيرت بولو كحلي مقاس L',
            'unit_of_measure' => 'piece',
            'current_balance' => 60,
            'average_cost' => 85,
        ]);

        // 1. Filter Raw Materials
        $rawRes = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->getJson('/api/v1/inventory/items?category=raw_materials');

        $rawRes->assertStatus(200);
        $rawData = $rawRes->json('data');
        $this->assertCount(1, $rawData);
        $this->assertEquals('RAW-001', $rawData[0]['code']);

        // 2. Filter Finished Goods
        $fgRes = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->getJson('/api/v1/inventory/items?category=finished_goods');

        $fgRes->assertStatus(200);
        $fgData = $fgRes->json('data');
        $this->assertCount(1, $fgData);
        $this->assertEquals('FG-001', $fgData[0]['code']);
    }

    public function test_can_update_shelf_bin_location_and_get_thermal_label(): void
    {
        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن التشغيل',
            'code' => 'WH-OP',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $item = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-RIB-BLK',
            'name' => 'قماش ريب أسود معالج',
            'unit_of_measure' => 'kg',
            'current_balance' => 80,
            'average_cost' => 95,
            'technical_specs' => [
                'storage_zone' => 'Zone 1',
                'rack_location' => 'R1',
                'shelf_bin_location' => 'B1',
            ],
        ]);

        // Update location
        $updateRes = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->putJson("/api/v1/inventory/items/{$item->id}", [
                'storage_zone' => 'ممر الأقمشة المغزولة 4',
                'rack_location' => 'RACK-09',
                'shelf_bin_location' => 'SHELF-C2',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('item.rack_location', 'RACK-09')
            ->assertJsonPath('item.shelf_bin_location', 'SHELF-C2');

        // Get Thermal Label Data
        $labelRes = $this->actingAs($this->ownerA, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantA->id])
            ->getJson("/api/v1/inventory/items/{$item->id}/label");

        $labelRes->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('label.item_code', 'FAB-RIB-BLK')
            ->assertJsonPath('label.rack_location', 'RACK-09')
            ->assertJsonPath('label.shelf_bin_location', 'SHELF-C2');
    }

    public function test_cross_tenant_item_access_is_strictly_denied(): void
    {
        $whA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن أ',
            'code' => 'WH-A',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $itemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $whA->id,
            'item_type' => 'fabric_raw',
            'code' => 'SEC-001',
            'name' => 'خامة سرية لمصنع أ',
            'unit_of_measure' => 'kg',
            'current_balance' => 50,
            'average_cost' => 100,
        ]);

        // Owner B tries to update Owner A's item
        $res = $this->actingAs($this->ownerB, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantB->id])
            ->putJson("/api/v1/inventory/items/{$itemA->id}", [
                'name' => 'محاولة اختراق',
            ]);

        $res->assertStatus(404);

        // Owner B tries to get label for Owner A's item
        $labelRes = $this->actingAs($this->ownerB, 'sanctum')
            ->withHeaders(['X-Tenant-ID' => $this->tenantB->id])
            ->getJson("/api/v1/inventory/items/{$itemA->id}/label");

        $labelRes->assertStatus(404);
    }
}

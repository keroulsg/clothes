<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Color;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class QualityInspectionAndBundleScrapTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $userA;
    private User $userB;
    private ProductionOrder $prodOrderA;
    private CuttingBundle $bundleA;
    private InventoryItem $finishedGoodItemA;
    private InventoryItem $scrapItemA;
    private InventoryItem $scrapItemB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TEN-QC-A',
            'name' => 'مصنع النور للألبسة',
            'subdomain' => 'alnoor-' . Str::random(5),
            'subscription_tier' => 'pro',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TEN-QC-B',
            'name' => 'مصنع الدلتا للملابس',
            'subdomain' => 'delta-' . Str::random(5),
            'subscription_tier' => 'starter',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير جودة النور',
            'email' => 'qc-' . Str::random(5) . '@alnoor.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير جودة الدلتا',
            'email' => 'qc-' . Str::random(5) . '@delta.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $branchA = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'فرع النور الرئيسي',
            'code' => 'BR-QC-01',
            'type' => 'factory',
            'is_active' => true,
        ]);

        $warehouseFGA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن المنتج التام',
            'code' => 'WH-QC-FG',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $warehouseScrapA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن الهالك والخردة',
            'code' => 'WH-QC-SCRAP',
            'type' => 'scrap',
            'allow_negative_stock' => true,
            'is_active' => true,
        ]);

        $warehouseScrapB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مخزن هالك الدلتا',
            'code' => 'WH-QC-SCRAP-B',
            'type' => 'scrap',
            'allow_negative_stock' => true,
            'is_active' => true,
        ]);

        $this->finishedGoodItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $warehouseFGA->id,
            'item_type' => 'finished_good',
            'code' => 'ITM-FG-01',
            'name' => 'قميص أطفال مطرز',
            'unit_of_measure' => 'pcs',
            'current_balance' => 0.0,
            'average_cost' => 150.0,
            'is_active' => true,
        ]);

        $this->scrapItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $warehouseScrapA->id,
            'item_type' => 'scrap_waste',
            'code' => 'ITM-SCRAP-01',
            'name' => 'هالك قماش وعيوب خياطة',
            'unit_of_measure' => 'pcs',
            'current_balance' => 0.0,
            'average_cost' => 0.0,
            'is_active' => true,
        ]);

        $this->scrapItemB = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'warehouse_id' => $warehouseScrapB->id,
            'item_type' => 'scrap_waste',
            'code' => 'ITM-SCRAP-B',
            'name' => 'هالك مصنع الدلتا',
            'unit_of_measure' => 'pcs',
            'current_balance' => 0.0,
            'average_cost' => 0.0,
            'is_active' => true,
        ]);

        $color = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أبيض',
            'color_code' => '#FFFFFF',
        ]);

        $size = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'M',
            'category' => 'adults',
            'sort_order' => 1,
        ]);

        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MDL-QC-01',
            'name' => 'قميص كاجوال رجالي',
            'category' => 'shirts',
            'unit_of_measure' => 'pcs',
            'target_cost' => 120.0,
            'target_wholesale_price' => 180.0,
            'is_active' => true,
        ]);

        $this->prodOrderA = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-QC-2026-001',
            'garment_model_id' => $model->id,
            'branch_id' => $branchA->id,
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 0,
            'total_rework_quantity' => 0,
            'total_scrapped_quantity' => 0,
            'status' => 'in_progress',
            'planned_start_date' => '2026-11-01',
            'planned_end_date' => '2026-11-15',
            'target_delivery_date' => '2026-11-20',
        ]);

        $cutOrder = CuttingOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_number' => 'CUT-QC-001',
            'production_order_id' => $this->prodOrderA->id,
            'warehouse_id' => $warehouseFGA->id,
            'fabric_source' => 'factory_owned',
            'lay_length_meters' => 2.0,
            'layers_count' => 25,
            'usable_width_meters' => 1.6,
            'total_cut_pieces' => 50,
            'status' => 'completed',
        ]);

        $this->bundleA = CuttingBundle::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_id' => $cutOrder->id,
            'production_order_id' => $this->prodOrderA->id,
            'color_id' => $color->id,
            'size_id' => $size->id,
            'bundle_number' => 1,
            'bundle_code' => 'BND-QC-001',
            'quantity' => 50,
            'current_stage_code' => 'sewing',
            'status' => 'active',
        ]);
    }

    public function test_quality_inspection_with_rework_updates_bundle_status_to_rework(): void
    {
        $payload = [
            'production_order_id' => $this->prodOrderA->id,
            'cutting_bundle_id' => $this->bundleA->id,
            'inspector_name' => 'م. نادية سمير (مديرة الجودة)',
            'inspection_type' => 'inline',
            'inspected_quantity' => 50,
            'passed_quantity' => 45,
            'rework_quantity' => 5,
            'rejected_quantity' => 0,
            'defects' => [
                [
                    'defect_type' => 'open_seam',
                    'severity' => 'major',
                    'quantity' => 5,
                    'corrective_action' => 'إعادة الخياطة لخط الجنب',
                ],
            ],
        ];

        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/quality-inspections', $payload);

        $response->assertStatus(201);
        $this->assertEquals('rework_required', $response->json('data.decision'));

        $this->bundleA->refresh();
        $this->assertEquals('rework', $this->bundleA->status);

        $this->prodOrderA->refresh();
        $this->assertEquals(5, $this->prodOrderA->total_rework_quantity);
    }

    public function test_quality_inspection_with_rejection_and_scrap_inventory_posting(): void
    {
        $payload = [
            'production_order_id' => $this->prodOrderA->id,
            'cutting_bundle_id' => $this->bundleA->id,
            'inspector_name' => 'م. طارق المحمدي (مهندس الجودة)',
            'inspection_type' => 'end_of_line',
            'inspected_quantity' => 50,
            'passed_quantity' => 40,
            'rework_quantity' => 0,
            'rejected_quantity' => 10,
            'scrap_inventory_item_id' => $this->scrapItemA->id,
            'defects' => [
                [
                    'defect_type' => 'fabric_hole',
                    'severity' => 'critical',
                    'quantity' => 10,
                    'corrective_action' => 'استبعاد كلي وإثبات هالك',
                ],
            ],
        ];

        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/quality-inspections', $payload);

        $response->assertStatus(201);
        $this->assertEquals('rejected', $response->json('data.decision'));

        // Bundle is updated
        $this->bundleA->refresh();
        $this->assertEquals(40, $this->bundleA->quantity);
        $this->assertEquals('held_for_qc', $this->bundleA->status);

        // Production order scrapped quantity incremented
        $this->prodOrderA->refresh();
        $this->assertEquals(10, $this->prodOrderA->total_scrapped_quantity);

        // Inventory scrap transaction recorded
        $this->scrapItemA->refresh();
        $this->assertEquals(10.0, (float) $this->scrapItemA->current_balance);

        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $this->scrapItemA->id,
            'transaction_type' => 'scrap',
            'direction' => 'IN',
            'quantity' => 10.0,
        ]);
    }

    public function test_quality_inspection_total_rejection_marks_bundle_scrapped(): void
    {
        $payload = [
            'production_order_id' => $this->prodOrderA->id,
            'cutting_bundle_id' => $this->bundleA->id,
            'inspector_name' => 'م. طارق المحمدي',
            'inspection_type' => 'inline',
            'inspected_quantity' => 50,
            'passed_quantity' => 0,
            'rework_quantity' => 0,
            'rejected_quantity' => 50,
            'defects' => [
                [
                    'defect_type' => 'color_bleeding',
                    'severity' => 'critical',
                    'quantity' => 50,
                    'corrective_action' => 'استبعاد كامل الحزمة',
                ],
            ],
        ];

        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/quality-inspections', $payload);

        $response->assertStatus(201);
        $this->assertEquals('rejected', $response->json('data.decision'));

        $this->bundleA->refresh();
        $this->assertEquals(0, $this->bundleA->quantity);
        $this->assertEquals('scrapped', $this->bundleA->status);
    }

    public function test_cross_tenant_scrap_inventory_item_is_rejected(): void
    {
        $payload = [
            'production_order_id' => $this->prodOrderA->id,
            'cutting_bundle_id' => $this->bundleA->id,
            'inspector_name' => 'م. متطفل',
            'inspection_type' => 'inline',
            'inspected_quantity' => 50,
            'passed_quantity' => 45,
            'rework_quantity' => 0,
            'rejected_quantity' => 5,
            'scrap_inventory_item_id' => $this->scrapItemB->id, // Tenant B item!
            'defects' => [
                [
                    'defect_type' => 'oil_stain',
                    'severity' => 'minor',
                    'quantity' => 5,
                ],
            ],
        ];

        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/quality-inspections', $payload);

        $response->assertStatus(403);
        $this->assertEquals('CrossTenantAccessDenied', $response->json('error'));
    }
}

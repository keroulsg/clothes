<?php

namespace Tests\Feature;

use App\Models\Color;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Batch9StorefrontTemplatesAndCustomizerTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Warehouse $warehouseA;
    protected ProductVariant $variantA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'Delta Apparel Factory',
            'code' => 'DELTA',
            'subdomain' => 'delta-store',
            'status' => 'active',
            'subscription_tier' => 'pro',
            'currency' => 'EGP',
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Alexandria Weaving Co',
            'code' => 'ALEX',
            'subdomain' => 'alex-store',
            'status' => 'active',
            'subscription_tier' => 'enterprise',
            'currency' => 'EGP',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Delta Admin',
            'email' => 'admin@delta-apparel.com',
            'password' => bcrypt('secret123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Alex Admin',
            'email' => 'admin@alex-textiles.com',
            'password' => bcrypt('secret123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Finished Goods Warehouse A',
            'code' => 'FG-01',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Premium Egyptian Cotton Polo',
            'code' => 'POLO-EG',
            'category' => 'men',
        ]);

        $colorA = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy Blue',
            'code' => '#000080',
        ]);

        $sizeA = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $modelA->id,
            'color_id' => $colorA->id,
            'size_id' => $sizeA->id,
            'sku' => 'POLO-NVY-L',
            'barcode' => '6221234567890',
            'retail_price' => 350.00,
            'wholesale_price' => 280.00,
        ]);

        InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'item_type' => 'finished_product',
            'code' => 'INV-POLO-L',
            'name' => 'Summer Casual Polo (Navy L)',
            'unit_of_measure' => 'piece',
            'sku' => 'POLO-NVY-L',
            'current_balance' => 50,
            'reserved_balance' => 0,
            'average_cost' => 150.00,
            'is_customer_owned' => false,
        ]);
    }

    public function test_design_studio_returns_available_templates_and_current_config(): void
    {
        Sanctum::actingAs($this->userA);

        $response = $this->getJson('/api/v1/storefront/design');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'tenant_id',
            'published' => ['theme_id', 'theme_config'],
            'draft' => ['theme_id', 'theme_config'],
            'has_draft_changes',
            'can_rollback',
            'available_templates',
        ]);

        $templates = collect($response->json('available_templates'))->pluck('id')->toArray();
        $this->assertContains(StorefrontService::THEME_FASHION_BOUTIQUE, $templates);
        $this->assertContains(StorefrontService::THEME_MODERN_CATALOG, $templates);
        $this->assertContains(StorefrontService::THEME_KIDS_FAMILY, $templates);
        $this->assertContains(StorefrontService::THEME_PREMIUM_BRAND, $templates);
    }

    public function test_saving_draft_does_not_alter_public_store_until_published(): void
    {
        Sanctum::actingAs($this->userA);

        // 1. Save draft with Premium Brand template and custom colors
        $draftResponse = $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_PREMIUM_BRAND,
            'theme_config' => [
                'primary_color' => '#b45309',
                'secondary_color' => '#1c1917',
                'announcement_bar_text' => 'مجموعة حصرية جديدة',
            ],
        ]);

        $draftResponse->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_PREMIUM_BRAND, $draftResponse->json('store_settings.draft_theme_id'));

        // 2. Public store request without preview MUST still show published default theme (NOT draft)
        $publicResponse = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");
        $publicResponse->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_FASHION_BOUTIQUE, $publicResponse->json('store_settings.theme_id'));
        $this->assertFalse($publicResponse->json('is_preview'));
        $this->assertTrue($publicResponse->json('has_draft_changes'));
    }

    public function test_live_preview_renders_draft_theme_and_customization(): void
    {
        Sanctum::actingAs($this->userA);

        // Save draft
        $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_KIDS_FAMILY,
            'theme_config' => [
                'primary_color' => '#ea580c',
                'announcement_bar_text' => 'ملابس أطفال قطن 100%',
            ],
        ])->assertStatus(200);

        // Preview request WITH ?preview=1 MUST return draft theme
        $previewResponse = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}?preview=1");
        $previewResponse->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_KIDS_FAMILY, $previewResponse->json('store_settings.theme_id'));
        $this->assertEquals('#ea580c', $previewResponse->json('store_settings.theme_config.primary_color'));
        $this->assertTrue($previewResponse->json('is_preview'));
    }

    public function test_publishing_draft_atomically_updates_public_store_and_stores_previous_for_rollback(): void
    {
        Sanctum::actingAs($this->userA);

        // Step 1: Save draft
        $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_MODERN_CATALOG,
            'theme_config' => [
                'primary_color' => '#1d4ed8',
                'announcement_bar_text' => 'أسعار الجملة للشركات',
            ],
        ])->assertStatus(200);

        // Step 2: Publish draft
        $publishResponse = $this->postJson('/api/v1/storefront/design/publish');

        $publishResponse->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_MODERN_CATALOG, $publishResponse->json('store_settings.theme_id'));
        $this->assertNull($publishResponse->json('store_settings.draft_theme_id'));
        $this->assertNotNull($publishResponse->json('store_settings.previous_published_config'));

        // Step 3: Public store now reflects published changes
        $publicResponse = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");
        $publicResponse->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_MODERN_CATALOG, $publicResponse->json('store_settings.theme_id'));
        $this->assertFalse($publicResponse->json('is_preview'));
    }

    public function test_rollback_restores_previous_published_version(): void
    {
        Sanctum::actingAs($this->userA);

        // Publish template 2
        $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_MODERN_CATALOG,
        ])->assertStatus(200);

        $this->postJson('/api/v1/storefront/design/publish')->assertStatus(200);

        // Rollback
        $rollbackResponse = $this->postJson('/api/v1/storefront/design/rollback');

        $rollbackResponse->assertStatus(200);
        // Original theme restored
        $this->assertEquals(StorefrontService::THEME_FASHION_BOUTIQUE, $rollbackResponse->json('store_settings.theme_id'));

        // Second rollback without prior archive fails gracefully
        $secondRollback = $this->postJson('/api/v1/storefront/design/rollback');

        $secondRollback->assertStatus(422);
        $secondRollback->assertJson(['error' => 'CannotRollback']);
    }

    public function test_design_studio_cross_tenant_isolation(): void
    {
        // Tenant A saves draft with Premium Brand
        Sanctum::actingAs($this->userA);
        $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_PREMIUM_BRAND,
            'theme_config' => ['primary_color' => '#d97706'],
        ])->assertStatus(200);

        // Tenant B inspects design studio — MUST NOT see Tenant A's draft
        Sanctum::actingAs($this->userB);
        $studioB = $this->getJson('/api/v1/storefront/design');

        $studioB->assertStatus(200);
        $this->assertFalse($studioB->json('has_draft_changes'));
        $this->assertNotEquals(StorefrontService::THEME_PREMIUM_BRAND, $studioB->json('draft.theme_id'));
    }

    public function test_storefront_order_placement_links_to_sales_orders_and_reserves_stock(): void
    {
        $orderData = [
            'customer_name' => 'Kareem Tarek',
            'customer_phone' => '01234567890',
            'shipping_address' => 'Giza, Egypt',
            'city' => 'Giza',
            'payment_method' => 'cod',
            'shipping_fee' => 40.00,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                    'unit_price' => 350.00,
                ],
            ],
        ];

        $response = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderData);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'order' => ['id', 'order_number', 'sales_order_id', 'total_amount'],
        ]);

        // Verify reserved balance updated in inventory items
        $inv = InventoryItem::where('variant_id', $this->variantA->id)->first();
        $this->assertEquals(2, $inv->reserved_balance);
        $this->assertEquals(50, $inv->current_balance);
    }
}

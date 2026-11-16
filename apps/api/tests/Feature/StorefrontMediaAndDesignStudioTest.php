<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StorefrontMediaAndDesignStudioTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

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

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'Delta Factory Store',
            'theme_id' => StorefrontService::THEME_FASHION_BOUTIQUE,
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_card_payment' => false,
            'allow_instapay' => false,
            'theme_config' => [
                'primary_color' => '#0284c7',
                'media_library' => [],
            ],
        ]);
    }

    public function test_tenant_owner_can_upload_media_image_successfully(): void
    {
        Sanctum::actingAs($this->userA);

        $image = UploadedFile::fake()->image('hero_banner.jpg', 1920, 800);

        $response = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $image,
            'category' => 'banner',
            'title' => 'Summer Banner 2026',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'media' => [
                'id',
                'title',
                'category',
                'path',
                'url',
                'mime_type',
                'created_at',
            ],
        ]);

        $path = $response->json('media.path');
        $this->assertStringStartsWith("storefront/{$this->tenantA->id}/", $path);
        Storage::disk('public')->assertExists($path);

        // Verify stored in TenantStoreSetting theme_config
        $setting = TenantStoreSetting::where('tenant_id', $this->tenantA->id)->first();
        $this->assertNotEmpty($setting->theme_config['media_library']);
        $this->assertEquals('Summer Banner 2026', $setting->theme_config['media_library'][0]['title']);
    }

    public function test_media_upload_rejects_non_image_files(): void
    {
        Sanctum::actingAs($this->userA);

        $pdf = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $pdf,
            'category' => 'general',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_media_upload_rejects_files_exceeding_size_limit(): void
    {
        Sanctum::actingAs($this->userA);

        // 6MB image (limit is 5MB / 5120KB)
        $largeImage = UploadedFile::fake()->create('huge.jpg', 6000, 'image/jpeg');

        $response = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $largeImage,
            'category' => 'general',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_tenant_can_list_uploaded_media(): void
    {
        Sanctum::actingAs($this->userA);

        $image = UploadedFile::fake()->image('logo.png', 400, 200);

        $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $image,
            'category' => 'logo',
            'title' => 'Factory Logo',
        ])->assertStatus(201);

        $response = $this->getJson('/api/v1/storefront/media');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'media',
        ]);
        $this->assertCount(1, $response->json('media'));
        $this->assertEquals('Factory Logo', $response->json('media.0.title'));
    }

    public function test_tenant_can_delete_own_media(): void
    {
        Sanctum::actingAs($this->userA);

        $image = UploadedFile::fake()->image('delete_me.jpg', 600, 400);

        $uploadRes = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $image,
            'category' => 'banner',
        ])->assertStatus(201);

        $path = $uploadRes->json('media.path');
        Storage::disk('public')->assertExists($path);

        $deleteRes = $this->deleteJson('/api/v1/storefront/media', [
            'path' => $path,
        ]);

        $deleteRes->assertStatus(200);
        Storage::disk('public')->assertMissing($path);

        $setting = TenantStoreSetting::where('tenant_id', $this->tenantA->id)->first();
        $this->assertEmpty($setting->theme_config['media_library'] ?? []);
    }

    public function test_tenant_cannot_delete_another_tenants_media_or_cross_boundary(): void
    {
        Sanctum::actingAs($this->userA);

        // Attempting to delete path outside tenant boundary
        $foreignPath = "storefront/{$this->tenantB->id}/secret_brand.jpg";

        $response = $this->deleteJson('/api/v1/storefront/media', [
            'path' => $foreignPath,
        ]);

        // Returns 422 InvalidPath to reject path outside tenant boundary
        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'InvalidPath',
        ]);
    }

    public function test_unauthenticated_requests_cannot_access_storefront_management_or_media_endpoints(): void
    {
        $this->getJson('/api/v1/storefront/media')->assertStatus(401);
        $this->postJson('/api/v1/storefront/media/upload', [])->assertStatus(401);
        $this->deleteJson('/api/v1/storefront/media', [])->assertStatus(401);
        $this->getJson('/api/v1/storefront/design')->assertStatus(401);
        $this->postJson('/api/v1/storefront/design/draft', [])->assertStatus(401);
        $this->postJson('/api/v1/storefront/design/publish')->assertStatus(401);
    }

    public function test_tenant_can_upload_multiple_media_files_simultaneously(): void
    {
        Sanctum::actingAs($this->userA);

        $img1 = UploadedFile::fake()->image('banner_1.jpg', 1200, 600);
        $img2 = UploadedFile::fake()->image('banner_2.png', 800, 800);
        $img3 = UploadedFile::fake()->image('banner_3.webp', 1000, 500);

        $response = $this->postJson('/api/v1/storefront/media/upload-multiple', [
            'files' => [$img1, $img2, $img3],
            'category' => 'banner',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'media' => [
                '*' => ['id', 'url', 'path', 'filename', 'width', 'height', 'category'],
            ],
        ]);

        $this->assertCount(3, $response->json('media'));
        foreach ($response->json('media') as $item) {
            Storage::disk('public')->assertExists($item['path']);
            $this->assertNotNull($item['width']);
            $this->assertNotNull($item['height']);
        }
    }

    public function test_media_upload_rejects_svg_and_disallowed_formats(): void
    {
        Sanctum::actingAs($this->userA);

        $svg = UploadedFile::fake()->create('vector.svg', 10, 'image/svg+xml');

        $response = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $svg,
            'category' => 'logo',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['file']);
    }

    public function test_cannot_delete_media_actively_referenced_without_force(): void
    {
        Sanctum::actingAs($this->userA);

        $image = UploadedFile::fake()->image('hero_active.jpg', 1200, 600);
        $uploadRes = $this->postJson('/api/v1/storefront/media/upload', [
            'file' => $image,
            'category' => 'banner',
        ])->assertStatus(201);

        $path = $uploadRes->json('media.path');
        $url = $uploadRes->json('media.url');

        // Reference image in active theme_config
        $setting = TenantStoreSetting::where('tenant_id', $this->tenantA->id)->first();
        $config = $setting->theme_config;
        $config['hero_banner'] = ['desktop_image' => $url];
        $setting->update(['theme_config' => $config]);

        // Attempt delete without force -> must fail with 422 MediaInUse
        $deleteRes = $this->deleteJson('/api/v1/storefront/media', [
            'path' => $path,
        ]);

        $deleteRes->assertStatus(422);
        $deleteRes->assertJson([
            'error' => 'MediaInUse',
        ]);
        Storage::disk('public')->assertExists($path);

        // Attempt delete with force: true -> must succeed
        $forceRes = $this->deleteJson('/api/v1/storefront/media', [
            'path' => $path,
            'force' => true,
        ]);

        $forceRes->assertStatus(200);
        Storage::disk('public')->assertMissing($path);
    }

    public function test_design_studio_draft_saving_and_publishing_with_advanced_components(): void
    {
        Sanctum::actingAs($this->userA);

        $advancedConfig = [
            'primary_color' => '#059669',
            'secondary_color' => '#10b981',
            'font_family' => 'cairo',
            'announcement_bar_enabled' => true,
            'announcement_bar_text' => 'خصم 20% لفترة محدودة على جميع الموديلات',
            'hero_banner' => [
                'enabled' => true,
                'desktop_image' => 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f',
                'mobile_image' => 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f',
                'badge' => 'صيف 2026',
                'title' => 'تشكيلة الصيف المتميزة',
                'subtitle' => 'مصنوعة بأعلى معايير الجودة من القطن المصري',
                'cta_text' => 'تسوق الكولكشن',
                'cta_destination' => 'shop',
            ],
            'sections' => [
                ['id' => 'hero', 'name' => 'البانر الترويجي الرئيسي', 'enabled' => true, 'order' => 1],
                ['id' => 'featured_products', 'name' => 'الموديلات المميزة', 'enabled' => true, 'order' => 2],
                ['id' => 'factory_story', 'name' => 'قصة المصنع والشهادات', 'enabled' => true, 'order' => 3],
            ],
            'header_nav_links' => [
                ['id' => 'nav-1', 'label' => 'الرئيسية', 'destination' => 'home'],
                ['id' => 'nav-2', 'label' => 'المتجر الكامل', 'destination' => 'shop'],
                ['id' => 'nav-3', 'label' => 'قصتنا', 'destination' => 'about'],
                ['id' => 'nav-4', 'label' => 'تواصل معنا', 'destination' => 'contact'],
            ],
            'content_pages' => [
                'about_story' => 'تأسس مصنعنا لتقديم أفضل الملابس القطنية الفاخرة.',
                'contact_phone' => '+201000000000',
                'contact_whatsapp' => '+201000000000',
                'contact_email' => 'sales@delta-apparel.com',
                'contact_address' => 'مدينة المحلة الكبرى، مصر',
            ],
        ];

        // 1. Save draft
        $draftRes = $this->postJson('/api/v1/storefront/design/draft', [
            'theme_id' => StorefrontService::THEME_MODERN_CATALOG,
            'theme_config' => $advancedConfig,
        ]);

        $draftRes->assertStatus(200);

        // 2. Publish draft
        $publishRes = $this->postJson('/api/v1/storefront/design/publish');
        $publishRes->assertStatus(200);

        // 3. Public store reflects published advanced configuration
        $publicRes = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");
        $publicRes->assertStatus(200);

        $publishedConfig = $publicRes->json('store_settings.theme_config');
        $this->assertEquals('#059669', $publishedConfig['primary_color']);
        $this->assertEquals('صيف 2026', $publishedConfig['hero_banner']['badge']);
        $this->assertEquals('shop', $publishedConfig['hero_banner']['cta_destination']);
        $this->assertEquals('قصتنا', $publishedConfig['header_nav_links'][2]['label']);
        $this->assertEquals('تأسس مصنعنا لتقديم أفضل الملابس القطنية الفاخرة.', $publishedConfig['content_pages']['about_story']);
    }
}

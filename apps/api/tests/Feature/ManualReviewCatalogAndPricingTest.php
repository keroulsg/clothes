<?php

namespace Tests\Feature;

use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\SizeCategory;
use App\Models\TenantStoreSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ManualReviewCatalogAndPricingTest extends TestCase
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
            'code' => 'TEN-CAT-A',
            'name' => 'مصنع النخبة للملابس A',
            'subdomain' => 'nokhba-a',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TEN-CAT-B',
            'name' => 'مصنع الدلتا للملابس B',
            'subdomain' => 'delta-b',
            'status' => 'active',
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مالك مصنع النخبة',
            'email' => 'owner.a@nokhba.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مالك مصنع الدلتا',
            'email' => 'owner.b@delta.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    /**
     * اختبار 1: دليل المقاسات الديناميكي وتصنيفات المقاسات والعزل بين المستأجرين
     */
    public function test_dynamic_size_categories_crud_and_isolation(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $res = $this->postJson('/api/v1/size-categories', [
            'name' => 'بدلات وملابس رسمية رجالي',
            'description' => 'مقاسات البدلات والقمصان الرجالية',
            'sort_order' => 1,
            'is_active' => true,
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('category.name', 'بدلات وملابس رسمية رجالي');

        $catIdA = $res->json('category.id');

        $sizeRes = $this->postJson('/api/v1/sizes', [
            'name' => '42 Regular',
            'size_category_id' => $catIdA,
            'category' => 'formal',
            'order' => 1,
            'is_active' => true,
        ]);

        $sizeRes->assertStatus(201)
            ->assertJsonPath('size.name', '42 Regular')
            ->assertJsonPath('size.size_category_id', $catIdA);

        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $listResB = $this->getJson('/api/v1/size-categories');
        $listResB->assertStatus(200);
        $this->assertEmpty($listResB->json('categories'));

        $this->getJson("/api/v1/size-categories/{$catIdA}")->assertStatus(404);
        $this->deleteJson("/api/v1/size-categories/{$catIdA}")->assertStatus(404);
    }

    /**
     * اختبار 2: حماية الحذف المدمر للمقاسات المستخدمة في التشغيل
     */
    public function test_cannot_delete_size_used_in_production(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'XL',
            'category' => 'adult',
            'order' => 1,
            'is_active' => true,
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'كحلي داكن',
            'color_code' => '#0f2744',
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-GEN-01',
            'name' => 'قميص أكسفورد كلاسيك',
            'category' => 'قمصان',
            'season' => 'صيف 2026',
            'target_cost' => 120,
            'wholesale_price' => 200,
            'retail_price' => 300,
            'status' => 'active',
        ]);

        ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'SKU-OXF-XL',
            'barcode' => '6221234567890',
            'wholesale_price' => 200,
            'retail_price' => 300,
        ]);

        $delRes = $this->deleteJson("/api/v1/sizes/{$size->id}");
        $delRes->assertStatus(422)
            ->assertJsonPath('error', 'DestructiveDeleteRestricted');

        $this->assertNotNull(Size::find($size->id));
        $this->assertNull(Size::find($size->id)->deleted_at);
    }

    /**
     * اختبار 3: تسجيل مصنع جديد يبدأ بدليل مقاسات فارغ
     */
    public function test_new_tenant_onboarding_has_empty_size_guide(): void
    {
        $regPayload = [
            'company_name' => 'مصنع البدل الحديثة',
            'subdomain' => 'modern-suits-' . rand(100, 999),
            'owner_name' => 'الأستاذ أحمد فؤاد',
            'email' => 'ahmed.' . uniqid() . '@factory.com',
            'password' => 'SecurePass123!',
        ];

        $res = $this->postJson('/api/v1/auth/register-company', $regPayload);
        $res->assertStatus(201);

        $newTenantId = $res->json('tenant.id');
        $this->assertNotNull($newTenantId);

        $sizesCount = Size::where('tenant_id', $newTenantId)->count();
        $this->assertEquals(0, $sizesCount, 'New tenant should start with an empty size guide');
    }

    /**
     * اختبار 4: حفظ منتج تجاري بدون صورة أو رابط صورة نهائياً (الصورة اختيارية بالكامل)
     */
    public function test_saving_product_without_image_or_url_is_valid(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $res = $this->postJson('/api/v1/products', [
            'name' => 'بنطلون جبردين رجالي سادة',
            'name_en' => 'Men Plain Gabardine Pants',
            'slug' => 'men-plain-gabardine-' . uniqid(),
            'selling_price' => 450.00,
            'pos_price' => 420.00,
            'main_image' => null, // No image provided
            'status' => 'active',
            'stock_visibility' => 'in_stock',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('product.name', 'بنطلون جبردين رجالي سادة')
            ->assertJsonPath('product.main_image', null);

        $productId = $res->json('product.id');
        $this->assertDatabaseHas('products', [
            'id' => $productId,
            'main_image' => null,
        ]);
    }

    /**
     * اختبار 5: رفع صورة المنتج المباشر وحفظها في القرص العام
     */
    public function test_direct_image_upload_endpoint(): void
    {
        Storage::fake('public');

        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $file = UploadedFile::fake()->image('shirt_front.jpg', 800, 800)->size(1200); // 1.2 MB

        $res = $this->postJson('/api/v1/products/upload-image', [
            'image' => $file,
        ]);

        $res->assertStatus(200)
            ->assertJsonStructure(['url', 'path', 'filename', 'message']);

        $savedPath = $res->json('path');
        $this->assertStringStartsWith("products/{$this->tenantA->id}/", $savedPath);
        Storage::disk('public')->assertExists($savedPath);
    }

    /**
     * اختبار 6: رفض الصور غير المدعومة (مثل PDF أو نص) أو التي تتجاوز 5 ميجابايت
     */
    public function test_image_upload_rejection_for_invalid_type_or_oversized(): void
    {
        Storage::fake('public');

        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Invalid file format (PDF)
        $invalidFile = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');
        $resPdf = $this->postJson('/api/v1/products/upload-image', ['image' => $invalidFile]);
        $resPdf->assertStatus(422)
            ->assertJsonValidationErrors('image');

        // 2. Oversized file (> 5MB, e.g. 6MB)
        $oversizedFile = UploadedFile::fake()->image('huge_photo.jpg')->size(6000);
        $resSize = $this->postJson('/api/v1/products/upload-image', ['image' => $oversizedFile]);
        $resSize->assertStatus(422)
            ->assertJsonValidationErrors('image');
    }

    /**
     * اختبار 7: تعديل بيانات المنتج وإعادة فتحه مع استرجاع الصورة المحفوظة بدقة
     */
    public function test_editing_product_persists_changes_and_image(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $product = Product::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'تيشيرت بولو كلاسيك',
            'name_en' => 'Classic Polo',
            'slug' => 'classic-polo-' . uniqid(),
            'selling_price' => 300,
            'pos_price' => 280,
            'main_image' => "/storage/products/{$this->tenantA->id}/polo.jpg",
            'status' => 'draft',
            'stock_visibility' => 'in_stock',
        ]);

        // Update product via API
        $updateRes = $this->putJson("/api/v1/products/{$product->id}", [
            'name' => 'تيشيرت بولو كلاسيك مطرز فاخر',
            'selling_price' => 350,
            'pos_price' => 320,
            'status' => 'active',
        ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('product.name', 'تيشيرت بولو كلاسيك مطرز فاخر')
            ->assertJsonPath('product.status', 'active')
            ->assertJsonPath('product.main_image', "/storage/products/{$this->tenantA->id}/polo.jpg");

        // Reopen / show
        $showRes = $this->getJson("/api/v1/products/{$product->id}");
        $showRes->assertStatus(200)
            ->assertJsonPath('product.name', 'تيشيرت بولو كلاسيك مطرز فاخر')
            ->assertJsonPath('product.main_image', "/storage/products/{$this->tenantA->id}/polo.jpg");
    }

    /**
     * اختبار 8: أرشفة المنتج وتعطيله بأمان بدلاً من الحذف المدمر إذا كان مرتبطاً بمخزون حالي
     */
    public function test_safe_deletion_archives_when_referenced_by_inventory(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $warehouse = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع المنتجات التامة',
            'code' => 'WH-FG-01',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSH-01',
            'name' => 'موديل تيشيرت',
            'category' => 'ملابس كاجوال',
            'season' => 'صيف 2026',
            'target_cost' => 100,
            'wholesale_price' => 180,
            'retail_price' => 250,
            'status' => 'active',
        ]);

        $color = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'أبيض']);
        $size = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'M', 'order' => 1]);

        $product = Product::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'منتج له رصيد مخزني',
            'slug' => 'stocked-product-' . uniqid(),
            'selling_price' => 250,
            'status' => 'active',
        ]);

        $variant = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'product_id' => $product->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'VAR-STK-1',
            'barcode' => '6221112223334',
            'retail_price' => 250,
        ]);

        // Link active inventory balance
        InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $warehouse->id,
            'variant_id' => $variant->id,
            'item_type' => 'finished_goods',
            'code' => 'INV-001',
            'name' => 'رصيد تيشيرت أبيض M',
            'unit_of_measure' => 'piece',
            'current_balance' => 45, // Active stock
            'reserved_balance' => 0,
            'is_customer_owned' => false,
        ]);

        // Attempt delete
        $delRes = $this->deleteJson("/api/v1/products/{$product->id}");
        $delRes->assertStatus(200)
            ->assertJsonPath('action_taken', 'archived')
            ->assertJsonPath('archived', true)
            ->assertJsonPath('deleted', false);

        // Product should NOT be deleted, but archived!
        $freshProduct = Product::find($product->id);
        $this->assertNotNull($freshProduct);
        $this->assertEquals('archived', $freshProduct->status);
    }

    /**
     * اختبار 9: الحذف النهائي للمنتجات غير المرتبطة بأي معاملات أو مخزون
     */
    public function test_safe_deletion_deletes_permanently_when_unreferenced(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $product = Product::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'منتج جديد غير مستخدم',
            'slug' => 'unreferenced-product-' . uniqid(),
            'selling_price' => 150,
            'status' => 'draft',
        ]);

        $delRes = $this->deleteJson("/api/v1/products/{$product->id}");
        $delRes->assertStatus(200)
            ->assertJsonPath('action_taken', 'deleted')
            ->assertJsonPath('deleted', true);

        $this->assertNull(Product::find($product->id));
    }

    /**
     * اختبار 10: الترقيم الحقيقي متعدد الصفحات عبر الـ Backend API (Real Backend Pagination)
     */
    public function test_real_pagination_across_multiple_pages(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Create 15 distinct products for Tenant A
        for ($i = 1; $i <= 15; $i++) {
            Product::create([
                'tenant_id' => $this->tenantA->id,
                'name' => "منتج تجريبي رقم {$i}",
                'slug' => "test-product-pag-{$i}-" . uniqid(),
                'selling_price' => 100 + $i,
                'status' => 'active',
            ]);
        }

        // Fetch Page 1 with pageSize 5
        $page1Res = $this->getJson('/api/v1/products?page=1&per_page=5');
        $page1Res->assertStatus(200)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 5)
            ->assertJsonPath('total', 15)
            ->assertJsonPath('last_page', 3);

        $data1 = $page1Res->json('data');
        $this->assertCount(5, $data1);

        // Fetch Page 2 with pageSize 5
        $page2Res = $this->getJson('/api/v1/products?page=2&per_page=5');
        $page2Res->assertStatus(200)
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('per_page', 5);

        $data2 = $page2Res->json('data');
        $this->assertCount(5, $data2);

        // Ensure page 1 and page 2 contain different products
        $this->assertNotEquals($data1[0]['id'], $data2[0]['id']);
    }

    /**
     * اختبار 11: البحث والفلترة المشتركة مع ترقيم الصفحات
     */
    public function test_search_and_filters_combined_with_pagination(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Create 3 winter jackets and 5 summer shirts
        for ($i = 1; $i <= 3; $i++) {
            Product::create([
                'tenant_id' => $this->tenantA->id,
                'name' => "جاكيت جلد شتوي فاخر {$i}",
                'slug' => "winter-jacket-{$i}-" . uniqid(),
                'selling_price' => 1200,
                'status' => 'active',
            ]);
        }

        for ($j = 1; $j <= 5; $j++) {
            Product::create([
                'tenant_id' => $this->tenantA->id,
                'name' => "قميص كتان صيفي خفيف {$j}",
                'slug' => "summer-shirt-{$j}-" . uniqid(),
                'selling_price' => 350,
                'status' => 'active',
            ]);
        }

        // Search for 'جاكيت' with per_page 10
        $searchRes = $this->getJson('/api/v1/products?search=' . urlencode('جاكيت') . '&page=1&per_page=10');
        $searchRes->assertStatus(200)
            ->assertJsonPath('total', 3)
            ->assertJsonPath('current_page', 1);

        $results = $searchRes->json('data');
        $this->assertCount(3, $results);
        foreach ($results as $item) {
            $this->assertStringContainsString('جاكيت', $item['name']);
        }
    }

    /**
     * اختبار 12: استقلال أسعار البيع (سعر المتجر selling_price، سعر المعرض pos_price، سعر الجملة wholesale_price، التكلفة base_cost)
     */
    public function test_omnichannel_pricing_separation(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $productPayload = [
            'name' => 'بدلة رجالي كحلي كلاسيك',
            'name_en' => 'Navy Classic Men Suit',
            'slug' => 'navy-classic-suit-' . uniqid(),
            'selling_price' => 1850.00,  // Website price
            'pos_price' => 1750.00,      // Dedicated POS outlet price
            'wholesale_price' => 1250.00,// B2B Wholesale
            'base_cost' => 850.00,       // Production BOM cost
            'is_pos_available' => true,
            'stock_visibility' => 'in_stock',
            'status' => 'active',
        ];

        $createRes = $this->postJson('/api/v1/products', $productPayload);
        $createRes->assertStatus(201)
            ->assertJsonPath('product.name', 'بدلة رجالي كحلي كلاسيك');

        $productData = $createRes->json('product');
        $this->assertEquals(1850.0, (float) $productData['selling_price']);
        $this->assertEquals(1750.0, (float) $productData['pos_price']);
        $this->assertEquals(1250.0, (float) $productData['wholesale_price']);
        $this->assertEquals(850.0, (float) $productData['base_cost']);
        $this->assertEquals(1850.0, (float) $productData['effective_website_price']);
        $this->assertEquals(1750.0, (float) $productData['effective_pos_price']);

        $productId = $productData['id'];

        $getRes = $this->getJson("/api/v1/products/{$productId}");
        $getRes->assertStatus(200);
        $getData = $getRes->json('product');
        $this->assertEquals(1750.0, (float) $getData['pos_price']);
        $this->assertEquals(1850.0, (float) $getData['selling_price']);
    }

    /**
     * اختبار 13: المتجر العام لا يعرض المسودات والمنتجات المؤرشفة
     */
    public function test_storefront_filtering_draft_and_archived(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'is_store_enabled' => true,
            'store_name' => 'متجر النخبة للملابس',
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-SUIT-01',
            'name' => 'موديل بدلة',
            'category' => 'بدل',
            'season' => 'صيف 2026',
            'target_cost' => 800,
            'wholesale_price' => 1200,
            'retail_price' => 1800,
            'status' => 'active',
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أسود',
            'color_code' => '#000000',
        ]);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
            'category' => 'adult',
            'order' => 1,
            'is_active' => true,
        ]);

        $activeProduct = Product::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'name' => 'منتج نشط',
            'slug' => 'active-suit-' . uniqid(),
            'selling_price' => 1800,
            'pos_price' => 1650,
            'base_cost' => 800,
            'status' => 'active',
            'stock_visibility' => 'in_stock',
        ]);

        ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'product_id' => $activeProduct->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'VAR-ACTIVE-1',
            'barcode' => '6229988776655',
            'retail_price' => 1800,
            'wholesale_price' => 1200,
        ]);

        $draftModel = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-DRAFT-01',
            'name' => 'موديل مسودة',
            'category' => 'بدل',
            'season' => 'صيف 2026',
            'target_cost' => 900,
            'wholesale_price' => 1300,
            'retail_price' => 1900,
            'status' => 'draft',
        ]);

        $draftProduct = Product::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $draftModel->id,
            'name' => 'منتج مسودة',
            'slug' => 'draft-suit-' . uniqid(),
            'selling_price' => 1900,
            'status' => 'draft',
            'stock_visibility' => 'in_stock',
        ]);

        ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $draftModel->id,
            'product_id' => $draftProduct->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'VAR-DRAFT-1',
            'barcode' => '6229988776656',
            'retail_price' => 1900,
            'wholesale_price' => 1300,
        ]);

        $storefrontRes = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}?preview=1");
        $storefrontRes->assertStatus(200);

        $products = $storefrontRes->json('products') ?: [];
        $names = collect($products)->pluck('model_name')->all();

        $this->assertContains('منتج نشط', $names);
        $this->assertNotContains('منتج مسودة', $names);
    }

    /**
     * اختبار 14: رفع صور متعددة (Multi-Image Upload) والتحقق من التنسيقات والحد الأقصى
     */
    public function test_multi_image_upload_and_validation(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $img1 = UploadedFile::fake()->image('front.jpg', 600, 600)->size(1024);
        $img2 = UploadedFile::fake()->image('back.png', 600, 600)->size(1024);
        $img3 = UploadedFile::fake()->image('detail.webp', 600, 600)->size(1024);

        $response = $this->postJson('/api/v1/products/upload-images', [
            'images' => [$img1, $img2, $img3],
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonCount(3, 'images');

        $uploaded = $response->json('images');
        $this->assertCount(3, $uploaded);
        $this->assertStringContainsString('products/' . $this->tenantA->id, $uploaded[0]['path']);
        $this->assertNotEmpty($uploaded[0]['url']);

        Storage::disk('public')->assertExists($uploaded[0]['path']);
        Storage::disk('public')->assertExists($uploaded[1]['path']);
        Storage::disk('public')->assertExists($uploaded[2]['path']);
    }

    /**
     * اختبار 15: حذف الصور مع عزل المستأجر الصارم (Tenant Isolation)
     */
    public function test_tenant_isolated_image_deletion(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $img = UploadedFile::fake()->image('sample.jpg', 400, 400);
        $uploadRes = $this->postJson('/api/v1/products/upload-images', [
            'images' => [$img],
        ]);
        $path = $uploadRes->json('images.0.path');
        Storage::disk('public')->assertExists($path);

        // Tenant B cannot delete Tenant A's image
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);
        $unauthDel = $this->postJson('/api/v1/products/delete-image', ['path' => $path]);
        $unauthDel->assertStatus(403);
        Storage::disk('public')->assertExists($path);

        // Tenant A can delete their own image
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);
        $authDel = $this->postJson('/api/v1/products/delete-image', ['path' => $path]);
        $authDel->assertStatus(200);
        Storage::disk('public')->assertMissing($path);
    }

    /**
     * اختبار 16: إنشاء منتج تجاري ينشئ تلقائياً صنف متغير (Variant) وبند مخزني
     */
    public function test_commercial_product_auto_creates_variant_and_inventory(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $res = $this->postJson('/api/v1/products', [
            'name' => 'بنطلون كارجو زيتي',
            'selling_price' => 450,
            'pos_price' => 400,
            'wholesale_price' => 320,
            'is_pos_available' => true,
            'is_storefront_available' => true,
            'stock_visibility' => 'in_stock',
            'status' => 'active',
            'gallery' => [
                ['path' => 'products/test/1.jpg', 'url' => '/storage/products/test/1.jpg', 'name' => '1.jpg', 'is_primary' => true],
            ],
        ]);

        $res->assertStatus(201);
        $productId = $res->json('product.id');
        $this->assertNotNull($productId);

        // Verify ProductVariant exists
        $variant = ProductVariant::where('tenant_id', $this->tenantA->id)
            ->where('product_id', $productId)
            ->first();

        $this->assertNotNull($variant, 'A canonical ProductVariant must be automatically created');
        $this->assertEquals(450.0, (float) $variant->retail_price);
        $this->assertEquals(320.0, (float) $variant->wholesale_price);

        // Verify InventoryItem exists
        $inv = InventoryItem::where('tenant_id', $this->tenantA->id)
            ->where('variant_id', $variant->id)
            ->first();

        $this->assertNotNull($inv, 'An InventoryItem must be created in warehouse');
    }

    /**
     * اختبار 17: واجهة أصناف نقاط البيع GET /api/v1/products/pos-items
     */
    public function test_pos_items_endpoint_returns_eligible_products_and_variants(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->postJson('/api/v1/products', [
            'name' => 'قميص صيفي مشجر',
            'selling_price' => 300,
            'pos_price' => 280,
            'wholesale_price' => 220,
            'is_pos_available' => true,
            'status' => 'active',
            'stock_visibility' => 'in_stock',
        ])->assertStatus(201);

        $posRes = $this->getJson('/api/v1/products/pos-items');
        $posRes->assertStatus(200);

        $items = $posRes->json('data') ?: [];
        $matched = collect($items)->firstWhere('name', 'قميص صيفي مشجر');
        $this->assertNotNull($matched, 'POS items must include the active commercial product');
        $this->assertEquals(280.0, (float) $matched['effective_pos_price']);
    }

    /**
     * اختبار 18: سيناريو القبول الشامل (Test Product Integration)
     * - الاسم: Test Product Integration
     * - سعر الـ POS: 250
     * - سعر المتجر/الموقع: 300
     * - سعر الجملة: 200
     * - 3 صور في المعرض
     */
    public function test_acceptance_scenario_test_product_integration(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'is_store_enabled' => true,
            'store_name' => 'متجر النخبة للتجربة',
        ]);

        $gallery = [
            ['path' => "products/{$this->tenantA->id}/img1.jpg", 'url' => "/storage/products/{$this->tenantA->id}/img1.jpg", 'name' => 'img1.jpg', 'is_primary' => true],
            ['path' => "products/{$this->tenantA->id}/img2.jpg", 'url' => "/storage/products/{$this->tenantA->id}/img2.jpg", 'name' => 'img2.jpg', 'is_primary' => false],
            ['path' => "products/{$this->tenantA->id}/img3.jpg", 'url' => "/storage/products/{$this->tenantA->id}/img3.jpg", 'name' => 'img3.jpg', 'is_primary' => false],
        ];

        // 1. Create Commercial Product
        $createRes = $this->postJson('/api/v1/products', [
            'name' => 'Test Product Integration',
            'name_ar' => 'منتج تجربة التكامل',
            'selling_price' => 300.00,
            'pos_price' => 250.00,
            'wholesale_price' => 200.00,
            'is_pos_available' => true,
            'is_storefront_available' => true,
            'stock_visibility' => 'in_stock',
            'status' => 'active',
            'gallery' => $gallery,
        ]);

        $createRes->assertStatus(201);
        $productId = $createRes->json('product.id');

        // 2. Verify Product Record & Gallery
        $product = Product::findOrFail($productId);
        $this->assertEquals(300.0, (float) $product->selling_price);
        $this->assertEquals(250.0, (float) $product->pos_price);
        $this->assertEquals(200.0, (float) $product->wholesale_price);
        $this->assertCount(3, $product->gallery);
        $this->assertEquals("/storage/products/{$this->tenantA->id}/img1.jpg", $product->main_image);

        // 3. Verify POS integration
        $posRes = $this->getJson('/api/v1/products/pos-items');
        $posRes->assertStatus(200);
        $posItems = $posRes->json('data') ?: [];
        $posItem = collect($posItems)->firstWhere('name', 'Test Product Integration');
        $this->assertNotNull($posItem, 'Must be available in POS');
        $this->assertEquals(250.0, (float) $posItem['effective_pos_price']);

        // 4. Verify Storefront integration
        $storefrontRes = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}?preview=1");
        $storefrontRes->assertStatus(200);
        $storefrontProducts = $storefrontRes->json('products') ?: [];
        $sfItem = collect($storefrontProducts)->firstWhere('model_name', 'Test Product Integration');
        $this->assertNotNull($sfItem, 'Must be available in Storefront');
        $this->assertEquals(300.0, (float) $sfItem['price']);
        $this->assertEquals("/storage/products/{$this->tenantA->id}/img1.jpg", $sfItem['image']);
        $this->assertCount(3, $sfItem['gallery']);
    }
}

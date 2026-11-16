<?php

namespace Tests\Feature;

use App\Models\ClothingCategory;
use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Batch1MasterCatalogAndProductsTest extends TestCase
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
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TEN-CAT-B',
            'name' => 'مصنع الدلتا للملابس B',
            'subdomain' => 'delta-b',
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
     * اختبار: دورة حياة المقاسات المخصصة والعزل بين المستأجرين
     */
    public function test_sizes_crud_and_tenant_isolation(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Create sizes for Tenant A
        $createRes1 = $this->postJson('/api/v1/sizes', [
            'name' => 'XL',
            'category' => 'adult',
            'sort_order' => 1,
        ]);
        $createRes1->assertStatus(201);
        $sizeId1 = $createRes1->json('size.id');

        $createRes2 = $this->postJson('/api/v1/sizes', [
            'name' => '0-3M',
            'category' => 'infant',
            'sort_order' => 2,
        ]);
        $createRes2->assertStatus(201);

        // 2. Read sizes for Tenant A
        $indexResA = $this->getJson('/api/v1/sizes');
        $indexResA->assertStatus(200);
        $this->assertCount(2, $indexResA->json('sizes'));

        // 3. Update size
        $updateRes = $this->putJson("/api/v1/sizes/{$sizeId1}", [
            'name' => 'XXL',
            'category' => 'adult',
            'sort_order' => 5,
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('XXL', $updateRes->json('size.name'));

        // 4. Verify Tenant B sees 0 sizes
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $indexResB = $this->getJson('/api/v1/sizes');
        $indexResB->assertStatus(200);
        $this->assertCount(0, $indexResB->json('sizes'));

        // Tenant B cannot delete Tenant A's size
        $deleteUnauthorized = $this->deleteJson("/api/v1/sizes/{$sizeId1}");
        $deleteUnauthorized->assertStatus(404);

        // 5. Tenant A deletes size
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $deleteRes = $this->deleteJson("/api/v1/sizes/{$sizeId1}");
        $deleteRes->assertStatus(200);

        $this->assertDatabaseMissing('sizes', ['id' => $sizeId1]);
    }

    /**
     * اختبار: دورة حياة الألوان المعتمدة ومطابقة كود الـ HEX
     */
    public function test_colors_crud_and_pantone_support(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Create color
        $createRes = $this->postJson('/api/v1/colors', [
            'name' => 'كحلي ملكي',
            'color_code' => '#0F2744',
            'pantone_ref' => 'PANTONE 19-4024 TCX',
        ]);
        $createRes->assertStatus(201);
        $colorId = $createRes->json('color.id');

        // 2. Read colors
        $indexRes = $this->getJson('/api/v1/colors');
        $indexRes->assertStatus(200);
        $this->assertCount(1, $indexRes->json('colors'));
        $this->assertEquals('#0f2744', $indexRes->json('colors.0.color_code'));

        // 3. Update color
        $updateRes = $this->putJson("/api/v1/colors/{$colorId}", [
            'name' => 'أزرق داكن',
            'color_code' => '#1e3a8a',
            'pantone_ref' => 'PANTONE 19-4028 TCX',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('أزرق داكن', $updateRes->json('color.name'));

        // 4. Delete color
        $deleteRes = $this->deleteJson("/api/v1/colors/{$colorId}");
        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('colors', ['id' => $colorId]);
    }

    /**
     * اختبار: تصنيفات الملابس الشجرية والربط الهرمي
     */
    public function test_clothing_categories_hierarchy_and_crud(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Create parent category
        $parentRes = $this->postJson('/api/v1/clothing-categories', [
            'name_ar' => 'ملابس أطفال',
            'name_en' => 'Kids Clothing',
            'code' => 'CAT-KIDS',
            'description' => 'جميع أزياء الأطفال الصيفية والشتوية',
        ]);
        $parentRes->assertStatus(201);
        $parentId = $parentRes->json('category.id');

        // 2. Create child sub-category
        $childRes = $this->postJson('/api/v1/clothing-categories', [
            'name_ar' => 'فساتين أطفال',
            'name_en' => 'Girls Dresses',
            'code' => 'CAT-KIDS-DRESS',
            'parent_id' => $parentId,
            'description' => 'فساتين بناتي للمناسبات',
        ]);
        $childRes->assertStatus(201);
        $childId = $childRes->json('category.id');

        // 3. Read categories list
        $listRes = $this->getJson('/api/v1/clothing-categories');
        $listRes->assertStatus(200);
        $this->assertCount(2, $listRes->json('categories'));

        // Verify parent relation in child
        $this->assertEquals($parentId, $childRes->json('category.parent_id'));

        // 4. Update sub-category
        $updateRes = $this->putJson("/api/v1/clothing-categories/{$childId}", [
            'name_ar' => 'فساتين وتنانير أطفال',
            'name_en' => 'Girls Dresses & Skirts',
            'code' => 'CAT-KIDS-DRESS',
            'is_active' => true,
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('فساتين وتنانير أطفال', $updateRes->json('category.name_ar'));

        // 5. Delete sub-category
        $deleteRes = $this->deleteJson("/api/v1/clothing-categories/{$childId}");
        $deleteRes->assertStatus(200);
        $this->assertSoftDeleted('clothing_categories', ['id' => $childId]);
    }

    /**
     * اختبار: دورة حياة المنتجات التجارية وربطها بالتصنيفات وموديلات التشغيل
     */
    public function test_commercial_products_crud_and_model_linking(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Pre-requisites: Category & Garment Model
        $cat = ClothingCategory::create([
            'tenant_id' => $this->tenantA->id,
            'name_ar' => 'أطقم ولادي قطن',
            'name_en' => 'Boys Cotton Sets',
            'code' => 'CAT-BOYS-01',
            'is_active' => true,
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-SUMMER-01',
            'name' => 'طقم تيشيرت وشورت كاجوال',
            'category' => 'أطقم ولادي',
            'season' => 'صيف 2026',
            'target_cost' => 75.0,
            'wholesale_price' => 120.0,
            'retail_price' => 180.0,
            'status' => 'active',
        ]);

        // 1. Create Commercial Product
        $prodRes = $this->postJson('/api/v1/products', [
            'name' => 'طقم تيشيرت وشورت مطرز قطن 100%',
            'name_en' => 'Cotton Embroidered Boys Set',
            'slug' => 'boys-cotton-set-01',
            'category_id' => $cat->id,
            'garment_model_id' => $model->id,
            'selling_price' => 180.0,
            'wholesale_price' => 120.0,
            'base_cost' => 75.0,
            'stock_visibility' => 'in_stock',
            'status' => 'active',
            'description' => 'خامة قطن جيرسي تركي معالج ضد الانكماش',
        ]);
        $prodRes->assertStatus(201);
        $prodId = $prodRes->json('product.id');

        // 2. Read products list
        $indexRes = $this->getJson('/api/v1/products');
        $indexRes->assertStatus(200);
        $this->assertEquals('boys-cotton-set-01', $indexRes->json('data.0.slug'));
        $this->assertEquals('أطقم ولادي قطن', $indexRes->json('data.0.category.name_ar'));
        $this->assertEquals('MOD-SUMMER-01', $indexRes->json('data.0.garment_model.code'));

        // 3. Update Product
        $updateRes = $this->putJson("/api/v1/products/{$prodId}", [
            'name' => 'طقم تيشيرت وشورت مطرز قطن 100% - طبعة خاصة',
            'selling_price' => 195.0,
            'stock_visibility' => 'low_stock',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals(195.0, (float)$updateRes->json('product.selling_price'));
        $this->assertEquals('low_stock', $updateRes->json('product.stock_visibility'));

        // 4. Verify Tenant B cannot access this product
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $getOther = $this->getJson("/api/v1/products/{$prodId}");
        $getOther->assertStatus(404);

        // 5. Delete Product
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $deleteRes = $this->deleteJson("/api/v1/products/{$prodId}");
        $deleteRes->assertStatus(200);
        $this->assertSoftDeleted('products', ['id' => $prodId]);
    }

    /**
     * اختبار: الحماية من حذف المقاسات أو الألوان المرتبطة بمتغيرات موديلات إنتاجية
     */
    public function test_cannot_delete_size_or_color_linked_to_garment_variants(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => '3-6M',
            'category' => 'infant',
            'sort_order' => 1,
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر قاني',
            'color_code' => '#b91c1c',
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-ROMPER-01',
            'name' => 'سالوبيت أطفال قطن',
            'category' => 'سالوبيت',
            'status' => 'active',
        ]);

        ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'SKU-ROMPER-RED-3M',
            'barcode' => '6221234567890',
        ]);

        // Attempt to delete size -> must fail with 422
        $deleteSizeRes = $this->deleteJson("/api/v1/sizes/{$size->id}");
        $deleteSizeRes->assertStatus(422);
        $this->assertDatabaseHas('sizes', ['id' => $size->id]);

        // Attempt to delete color -> must fail with 422
        $deleteColorRes = $this->deleteJson("/api/v1/colors/{$color->id}");
        $deleteColorRes->assertStatus(422);
        $this->assertDatabaseHas('colors', ['id' => $color->id]);
    }

    /**
     * Missing season must remain unset instead of receiving a fabricated calendar value.
     */
    public function test_garment_model_creation_does_not_invent_a_season_when_omitted(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => '4-5 سنوات',
            'category' => 'kids',
            'sort_order' => 1,
        ]);
        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر',
            'color_code' => '#ff0000',
        ]);

        $response = $this->postJson('/api/v1/models', [
            'code' => 'MODEL-NO-SEASON-01',
            'name' => 'موديل بدون موسم محدد',
            'category' => 'kids',
            'size_ids' => [$size->id],
            'color_ids' => [$color->id],
        ]);

        $response->assertCreated()
            ->assertJsonPath('model.season', null);

        $this->assertDatabaseHas('garment_models', [
            'tenant_id' => $this->tenantA->id,
            'code' => 'MODEL-NO-SEASON-01',
            'season' => null,
        ]);
    }

}

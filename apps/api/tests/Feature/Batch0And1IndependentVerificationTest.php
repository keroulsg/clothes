<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ClothingCategory;
use App\Models\Color;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\SalesOrder;
use App\Models\Size;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Batch0And1IndependentVerificationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * التحقق من الحزمة 0: تسجيل مصنع جديد بدون بيانات وهمية
     */
    public function test_batch0_clean_tenant_registration_creates_zero_unwanted_records(): void
    {
        $regData = [
            'company_name' => 'مصنع الأمل للملابس الجاهزة',
            'owner_name' => 'أحمد رضوان',
            'email' => 'ahmed.radwan@alamal-apparel.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'phone' => '01012345678',
            'subdomain' => 'alamal-clean-test',
            // with_sample_data is omitted (default false)
        ];

        $response = $this->postJson('/api/v1/auth/register-company', $regData);
        $response->assertStatus(201);
        $tenantId = $response->json('tenant.id');
        $this->assertNotEmpty($tenantId);

        // 1. التحقق من وجود السجلات الإلزامية الأساسية فقط
        $this->assertDatabaseHas('tenants', ['id' => $tenantId, 'status' => 'trial']);
        $this->assertDatabaseHas('users', ['tenant_id' => $tenantId, 'email' => 'ahmed.radwan@alamal-apparel.com', 'role' => 'company_owner']);
        $this->assertDatabaseHas('branches', ['tenant_id' => $tenantId, 'code' => 'HQ-01', 'is_main' => 1]);

        // 2. التحقق من عدم وجود أي سجلات مخزنية أو دليل أصناف أو مقاسات أو ألوان وهمية
        $this->assertEquals(0, Size::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 sizes');
        $this->assertEquals(0, Color::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 colors');
        $this->assertEquals(0, Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 warehouses');
        $this->assertEquals(0, ClothingCategory::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 categories');
        $this->assertEquals(0, Product::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 products');
        $this->assertEquals(0, GarmentModel::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 garment models');
        $this->assertEquals(0, ProductVariant::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 variants');
        $this->assertEquals(0, Supplier::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 suppliers');
        $this->assertEquals(0, InventoryItem::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 inventory items');
        $this->assertEquals(0, SalesOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(), 'New clean tenant must have 0 sales orders');
    }

    /**
     * التحقق من الحزمة 0: خيار البيانات التجريبية اختياري فقط (Opt-in)
     */
    public function test_batch0_sample_data_is_strictly_opt_in(): void
    {
        $regData = [
            'company_name' => 'مصنع العينة التجريبي',
            'owner_name' => 'عمر العينة',
            'email' => 'sample@sample-apparel.com',
            'password' => 'Password@123',
            'password_confirmation' => 'Password@123',
            'subdomain' => 'sample-test',
            'with_sample_data' => true,
        ];

        $response = $this->postJson('/api/v1/auth/register-company', $regData);
        $response->assertStatus(201);
        $tenantId = $response->json('tenant.id');

        // عند التفعيل الصريح: يتم تهيئة المقاسات والألوان الافتراضية
        $this->assertGreaterThan(0, Size::withoutGlobalScopes()->where('tenant_id', $tenantId)->count());
        $this->assertGreaterThan(0, Color::withoutGlobalScopes()->where('tenant_id', $tenantId)->count());
        $this->assertDatabaseHas('warehouses', ['tenant_id' => $tenantId, 'code' => 'WH-FAB-01']);
    }

    /**
     * التحقق من الحزمة 0: التحقق الصارم من variant_id في أوامر البيع وحظر القيم الفارغة أو غير الصالحة
     */
    public function test_batch0_sales_order_validates_variant_id(): void
    {
        $tenant = Tenant::create(['code' => 'TEN-SALES-A', 'name' => 'مصنع بيع A', 'subdomain' => 'sales-test-a']);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مدير المبيعات',
            'email' => 'sales@sales-test-a.com',
            'password' => bcrypt('password123'),
            'role' => 'sales_manager',
            'is_active' => true,
        ]);
        $customer = Customer::create([
            'tenant_id' => $tenant->id,
            'code' => 'CUST-SALES-01',
            'name' => 'شركة التوزيع المتحدة',
            'phone' => '01099988877',
        ]);

        Sanctum::actingAs($owner);
        app()->instance('current_tenant_id', $tenant->id);

        // 1. محاولة إرسال variant_id فارغ "" -> يجب أن يفشل 422
        $resEmpty = $this->postJson('/api/v1/sales-orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'variant_id' => '',
                    'quantity' => 10,
                    'unit_price' => 150,
                ],
            ],
        ]);
        $resEmpty->assertStatus(422);
        $resEmpty->assertJsonValidationErrors(['items.0.variant_id']);

        // 2. محاولة إرسال نص غير صالح بدلاً من UUID -> 422
        $resInvalid = $this->postJson('/api/v1/sales-orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'variant_id' => 'not-a-uuid',
                    'quantity' => 5,
                    'unit_price' => 120,
                ],
            ],
        ]);
        $resInvalid->assertStatus(422);

        // 3. محاولة إرسال UUID غير موجود في قاعدة البيانات -> 422
        $resNonExistent = $this->postJson('/api/v1/sales-orders', [
            'customer_id' => $customer->id,
            'items' => [
                [
                    'variant_id' => (string) Str::uuid(),
                    'quantity' => 5,
                    'unit_price' => 120,
                ],
            ],
        ]);
        $resNonExistent->assertStatus(422);
    }

    /**
     * التحقق من الحزمة 1: تصنيفات الملابس - CRUD والتدرج الهرمي والعزل
     */
    public function test_batch1_categories_crud_hierarchy_and_isolation(): void
    {
        $tenantA = Tenant::create(['code' => 'TEN-CAT-A', 'name' => 'مصنع A', 'subdomain' => 'cat-iso-a']);
        $tenantB = Tenant::create(['code' => 'TEN-CAT-B', 'name' => 'مصنع B', 'subdomain' => 'cat-iso-b']);

        $ownerA = User::create([
            'tenant_id' => $tenantA->id,
            'name' => 'مالك A',
            'email' => 'owner@cat-iso-a.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $ownerB = User::create([
            'tenant_id' => $tenantB->id,
            'name' => 'مالك B',
            'email' => 'owner@cat-iso-b.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        Sanctum::actingAs($ownerA);
        app()->instance('current_tenant_id', $tenantA->id);

        // 1. Create parent category
        $parentRes = $this->postJson('/api/v1/clothing-categories', [
            'name_ar' => 'ملابس أطفال',
            'name_en' => 'Kids Apparel',
            'code' => 'CAT-KIDS',
        ]);
        $parentRes->assertStatus(201);
        $parentId = $parentRes->json('category.id');

        // 2. Create child subcategory
        $childRes = $this->postJson('/api/v1/clothing-categories', [
            'name_ar' => 'بيجامات أطفال قطنية',
            'name_en' => 'Cotton Pajamas',
            'code' => 'CAT-KIDS-PAJ',
            'parent_id' => $parentId,
        ]);
        $childRes->assertStatus(201);
        $childId = $childRes->json('category.id');

        // 3. Verify hierarchy in query
        $getRes = $this->getJson("/api/v1/clothing-categories/{$childId}");
        $getRes->assertStatus(200);
        $this->assertEquals($parentId, $getRes->json('category.parent_id'));
        $this->assertEquals('ملابس أطفال', $getRes->json('category.parent.name_ar'));

        // 4. Update
        $updateRes = $this->putJson("/api/v1/clothing-categories/{$childId}", [
            'name_ar' => 'بيجامات أطفال صيفية وشتوية',
            'is_active' => true,
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('بيجامات أطفال صيفية وشتوية', $updateRes->json('category.name_ar'));

        // 5. Tenant B Isolation: Tenant B cannot access Tenant A's category
        Sanctum::actingAs($ownerB);
        app()->instance('current_tenant_id', $tenantB->id);

        $otherRes = $this->getJson("/api/v1/clothing-categories/{$childId}");
        $otherRes->assertStatus(404);
        $listB = $this->getJson('/api/v1/clothing-categories');
        $listB->assertStatus(200);
        $this->assertCount(0, $listB->json('categories'));

        // 6. Delete
        Sanctum::actingAs($ownerA);
        app()->instance('current_tenant_id', $tenantA->id);
        $delRes = $this->deleteJson("/api/v1/clothing-categories/{$childId}");
        $delRes->assertStatus(200);
        $this->assertSoftDeleted('clothing_categories', ['id' => $childId]);
    }

    /**
     * التحقق من الحزمة 1: دليل المقاسات - الفرز الرقمي والتحقق من التفرد والعزل
     */
    public function test_batch1_sizes_sorting_and_uniqueness(): void
    {
        $tenant = Tenant::create(['code' => 'TEN-SZ-A', 'name' => 'مصنع المقاسات', 'subdomain' => 'sizes-test']);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مسؤول المقاسات',
            'email' => 'sizes@sizes-test.com',
            'password' => bcrypt('password123'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        Sanctum::actingAs($owner);
        app()->instance('current_tenant_id', $tenant->id);

        // إضافة مقاسات بترتيبات مختلفة
        $this->postJson('/api/v1/sizes', ['name' => 'L', 'category' => 'adult', 'sort_order' => 3])->assertStatus(201);
        $this->postJson('/api/v1/sizes', ['name' => 'S', 'category' => 'adult', 'sort_order' => 1])->assertStatus(201);
        $this->postJson('/api/v1/sizes', ['name' => 'M', 'category' => 'adult', 'sort_order' => 2])->assertStatus(201);

        // التحقق من الفرز التصاعدي حسب sort_order
        $res = $this->getJson('/api/v1/sizes');
        $res->assertStatus(200);
        $sizes = $res->json('sizes');
        $this->assertCount(3, $sizes);
        $this->assertEquals('S', $sizes[0]['name']);
        $this->assertEquals('M', $sizes[1]['name']);
        $this->assertEquals('L', $sizes[2]['name']);

        // التحقق من منع تكرار المقاس لنفس المستأجر ونفس الفئة -> 422
        $dupRes = $this->postJson('/api/v1/sizes', ['name' => 'S', 'category' => 'adult', 'sort_order' => 4]);
        $dupRes->assertStatus(422);
    }

    /**
     * التحقق من الحزمة 1: دليل الألوان - التحقق من صحة HEX ودعم Pantone
     */
    public function test_batch1_colors_hex_validation(): void
    {
        $tenant = Tenant::create(['code' => 'TEN-CLR-A', 'name' => 'مصنع الألوان', 'subdomain' => 'colors-test']);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مسؤول الصباغة',
            'email' => 'colors@colors-test.com',
            'password' => bcrypt('password123'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        Sanctum::actingAs($owner);
        app()->instance('current_tenant_id', $tenant->id);

        // 1. أكواد HEX غير صالحة -> 422
        $this->postJson('/api/v1/colors', ['name' => 'لون 1', 'color_code' => 'blue'])->assertStatus(422);
        $this->postJson('/api/v1/colors', ['name' => 'لون 2', 'color_code' => '#12345'])->assertStatus(422);
        $this->postJson('/api/v1/colors', ['name' => 'لون 3', 'color_code' => '123456'])->assertStatus(422);

        // 2. كود HEX صالح 6 خانات مع Pantone
        $validRes = $this->postJson('/api/v1/colors', [
            'name' => 'كحلي ليلي',
            'color_code' => '#0F2744',
            'pantone_ref' => 'PANTONE 19-4024 TCX',
        ]);
        $validRes->assertStatus(201);
        $this->assertEquals('#0f2744', $validRes->json('color.color_code'));

        // 3. كود HEX صالح 3 خانات
        $validShort = $this->postJson('/api/v1/colors', [
            'name' => 'أبيض صافي',
            'color_code' => '#FFF',
        ]);
        $validShort->assertStatus(201);
    }

    /**
     * التحقق من الحزمة 1: حماية السلامة المرجعية - منع حذف المقاسات أو الألوان أو التصنيفات المرتبطة
     */
    public function test_batch1_deletion_safeguards_for_referenced_entities(): void
    {
        $tenant = Tenant::create(['code' => 'TEN-SAFE-A', 'name' => 'مصنع الحماية', 'subdomain' => 'safe-test']);
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مدير المصنع',
            'email' => 'safe@safe-test.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        Sanctum::actingAs($owner);
        app()->instance('current_tenant_id', $tenant->id);

        $cat = ClothingCategory::create(['tenant_id' => $tenant->id, 'name_ar' => 'فساتين', 'code' => 'CAT-DRS']);
        $size = Size::create(['tenant_id' => $tenant->id, 'name' => '4-6Y', 'category' => 'kids', 'sort_order' => 1]);
        $color = Color::create(['tenant_id' => $tenant->id, 'name' => 'وردي أطفال', 'color_code' => '#f472b6']);
        $model = GarmentModel::create([
            'tenant_id' => $tenant->id,
            'code' => 'MOD-DRS-01',
            'name' => 'فستان صيفي منقوش',
            'category' => 'فساتين',
            'clothing_category_id' => $cat->id,
            'status' => 'active',
        ]);
        $variant = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'garment_model_id' => $model->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'SKU-DRS-PNK-4Y',
            'barcode' => '622000000001',
        ]);
        $product = Product::create([
            'tenant_id' => $tenant->id,
            'category_id' => $cat->id,
            'garment_model_id' => $model->id,
            'name' => 'فستان صيفي بناتي منقوش قطن',
            'slug' => 'summer-kids-dress',
            'selling_price' => 160,
            'status' => 'active',
        ]);

        // 1. محاولة حذف المقاس المرتبط بموديل -> يجب أن تفشل 422
        $delSize = $this->deleteJson("/api/v1/sizes/{$size->id}");
        $delSize->assertStatus(422);
        $this->assertDatabaseHas('sizes', ['id' => $size->id]);

        // 2. محاولة حذف اللون المرتبط بموديل -> يجب أن تفشل 422
        $delColor = $this->deleteJson("/api/v1/colors/{$color->id}");
        $delColor->assertStatus(422);
        $this->assertDatabaseHas('colors', ['id' => $color->id]);

        // 3. محاولة حذف التصنيف المرتبط بمنتجات -> يجب أن تفشل 422
        $delCat = $this->deleteJson("/api/v1/clothing-categories/{$cat->id}");
        $delCat->assertStatus(422);
        $this->assertDatabaseHas('clothing_categories', ['id' => $cat->id]);
    }

    /**
     * سير العمل التجاري المتكامل من الصفر:
     * مصنع نظيف -> تصنيف -> مقاسات وألوان -> موديل وتوليد متغيرات -> منتج تجاري للمتجر -> أمر بيع
     */
    public function test_batch1_full_end_to_end_commercial_catalog_journey(): void
    {
        // 1. تسجيل مصنع جديد تماماً
        $reg = $this->postJson('/api/v1/auth/register-company', [
            'company_name' => 'مصنع الرحاب للملابس القطنية',
            'owner_name' => 'الحاج ممدوح',
            'email' => 'mamdouh@elrehab-garments.com',
            'password' => 'Elrehab@2026',
            'password_confirmation' => 'Elrehab@2026',
            'subdomain' => 'elrehab-fashion',
        ]);
        $reg->assertStatus(201);
        $tenantId = $reg->json('tenant.id');
        $token = $reg->json('token');

        $headers = [
            'Authorization' => "Bearer {$token}",
            'X-Tenant-Id' => $tenantId,
        ];

        // 2. إنشاء تصنيف رئيسي
        $catRes = $this->postJson('/api/v1/clothing-categories', [
            'name_ar' => 'أطقم صيفية للأولاد',
            'name_en' => 'Boys Summer Sets',
            'code' => 'CAT-BOY-SUM',
            'description' => 'أطقم شورت وتيشيرت قطن 100%',
        ], $headers);
        $catRes->assertStatus(201);
        $categoryId = $catRes->json('category.id');

        // 3. إنشاء مقاسين معتمدين
        $sizeRes1 = $this->postJson('/api/v1/sizes', [
            'name' => '2-4Y',
            'category' => 'kids',
            'sort_order' => 1,
        ], $headers);
        $sizeRes1->assertStatus(201);
        $sizeId1 = $sizeRes1->json('size.id');

        $sizeRes2 = $this->postJson('/api/v1/sizes', [
            'name' => '4-6Y',
            'category' => 'kids',
            'sort_order' => 2,
        ], $headers);
        $sizeRes2->assertStatus(201);
        $sizeId2 = $sizeRes2->json('size.id');

        // 4. إنشاء لونين معتمدين
        $colorRes1 = $this->postJson('/api/v1/colors', [
            'name' => 'أزرق ملكي',
            'color_code' => '#1e3a8a',
            'pantone_ref' => 'PANTONE 19-4052 TCX',
        ], $headers);
        $colorRes1->assertStatus(201);
        $colorId1 = $colorRes1->json('color.id');

        $colorRes2 = $this->postJson('/api/v1/colors', [
            'name' => 'أصفر ليموني',
            'color_code' => '#facc15',
        ], $headers);
        $colorRes2->assertStatus(201);
        $colorId2 = $colorRes2->json('color.id');

        // 5. إنشاء موديل ملابس وتوليد مصفوفة المتغيرات (2 مقاس * 2 لون = 4 متغيرات)
        $modelRes = $this->postJson('/api/v1/garment-models', [
            'code' => 'MOD-REHAB-01',
            'name' => 'طقم أولادي تيشيرت وشورت كاجوال',
            'category' => 'أطقم أولادي',
            'season' => 'صيف 2026',
            'target_cost' => 65.0,
            'wholesale_price' => 95.0,
            'retail_price' => 140.0,
            'size_ids' => [$sizeId1, $sizeId2],
            'color_ids' => [$colorId1, $colorId2],
        ], $headers);
        $modelRes->assertStatus(201);
        $modelId = $modelRes->json('model.id');

        // التحقق من توليد 4 متغيرات بباركودات وأكواد SKU فريدة
        $variants = ProductVariant::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('garment_model_id', $modelId)->get();
        $this->assertCount(4, $variants, 'Model must have 4 auto-generated variants (2 sizes x 2 colors)');
        $chosenVariant = $variants->first();
        $this->assertNotEmpty($chosenVariant->sku);
        $this->assertNotEmpty($chosenVariant->barcode);

        // 6. إنشاء منتج تجاري للمتجر وربطه بالموديل والتصنيف
        $prodRes = $this->postJson('/api/v1/products', [
            'name' => 'طقم أولادي شورت وتيشيرت قطن سوبر سوفت',
            'name_en' => 'Boys Super Soft Summer Set',
            'slug' => 'boys-super-soft-summer-set',
            'category_id' => $categoryId,
            'garment_model_id' => $modelId,
            'selling_price' => 140.0,
            'wholesale_price' => 95.0,
            'base_cost' => 65.0,
            'stock_visibility' => 'in_stock',
            'status' => 'active',
            'variant_ids' => [$chosenVariant->id],
        ], $headers);
        $prodRes->assertStatus(201);
        $productId = $prodRes->json('product.id');

        // التحقق من ربط المتغير بالمنتج التجاري في قاعدة البيانات
        $this->assertDatabaseHas('product_variants', [
            'id' => $chosenVariant->id,
            'product_id' => $productId,
        ]);

        // 7. إنشاء عميل وإصدار أمر بيع رسمي للمتغير المتولد
        $customer = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $tenantId,
            'code' => 'CUST-E2E-01',
            'name' => 'محلات التوحيد للأطفال',
            'phone' => '01223344556',
        ]);

        $orderRes = $this->postJson('/api/v1/sales-orders', [
            'customer_id' => $customer->id,
            'order_type' => 'wholesale',
            'items' => [
                [
                    'variant_id' => $chosenVariant->id,
                    'quantity' => 50,
                    'unit_price' => 95.0,
                ],
            ],
        ], $headers);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('data.id') ?? $orderRes->json('order.id');

        // التحقق من استقرار أمر البيع واستمراره في قاعدة البيانات
        $this->assertDatabaseHas('sales_orders', [
            'id' => $orderId,
            'tenant_id' => $tenantId,
            'customer_id' => $customer->id,
        ]);
        $this->assertDatabaseHas('sales_order_items', [
            'sales_order_id' => $orderId,
            'variant_id' => $chosenVariant->id,
            'ordered_quantity' => 50,
            'unit_price' => 95.0,
        ]);
    }
}

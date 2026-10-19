<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StorefrontRoutingAndDomainSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected Tenant $suspendedTenant;
    protected User $adminUser;
    protected User $regularUserA;
    protected ProductVariant $variantA;
    protected ProductVariant $variantB;

    protected function setUp(): void
    {
        parent::setUp();

        // إعداد المستأجر أ (Active Tenant A with subdomain and verified custom domain)
        $this->tenantA = Tenant::create([
            'code' => 'FACTORY-ALPHA',
            'name' => 'Alpha Garments Co.',
            'subdomain' => 'alpha-apparel',
            'custom_domain' => 'store.alphagarments.com',
            'status' => 'active',
            'plan_tier' => 'professional',
            'currency' => 'EGP',
            'timezone' => 'Africa/Cairo',
            'settings' => [
                'subscription' => ['is_paid' => true, 'status' => 'active'],
                'domain' => [
                    'custom_domain_status' => 'verified',
                    'custom_domain_enabled' => true,
                    'verified_at' => now()->toIso8601String(),
                    'verification_token' => 'garmentos-verification=alpha-token-12345',
                ],
            ],
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'Alpha Direct Store',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_card_payment' => false,
            'currency' => 'EGP',
            'banner_title' => 'Alpha Factory Direct Outlet',
        ]);

        // إعداد المستأجر ب (Active Tenant B with subdomain and unverified custom domain)
        $this->tenantB = Tenant::create([
            'code' => 'FACTORY-BETA',
            'name' => 'Beta Textiles Ltd.',
            'subdomain' => 'beta-textiles',
            'custom_domain' => 'shop.betatextiles.com',
            'status' => 'active',
            'plan_tier' => 'starter',
            'currency' => 'USD',
            'timezone' => 'Africa/Cairo',
            'settings' => [
                'subscription' => ['is_paid' => true, 'status' => 'active'],
                'domain' => [
                    'custom_domain_status' => 'pending_verification',
                    'custom_domain_enabled' => true,
                    'verification_token' => 'garmentos-verification=beta-token-67890',
                ],
            ],
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantB->id,
            'store_name' => 'Beta Luxury Store',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_card_payment' => false,
            'currency' => 'USD',
            'banner_title' => 'Beta Official Outlet',
        ]);

        // مستأجر موقوف (Suspended Tenant)
        $this->suspendedTenant = Tenant::create([
            'code' => 'FACTORY-SUSPENDED',
            'name' => 'Suspended Factory Co.',
            'subdomain' => 'suspended-factory',
            'status' => 'suspended',
            'plan_tier' => 'starter',
            'settings' => [
                'subscription' => ['is_paid' => false, 'status' => 'suspended'],
            ],
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->suspendedTenant->id,
            'store_name' => 'Suspended Store',
            'is_store_enabled' => true,
        ]);

        // مستخدم مشرف المنصة ومستخدم عادي
        $this->adminUser = User::create([
            'name' => 'Super Platform Admin',
            'email' => 'superadmin@garmentos.cloud',
            'password' => bcrypt('AdminSecret123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $this->regularUserA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Manager Alpha',
            'email' => 'manager@alphagarments.com',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // إنشاء موديلات ومنتجات للمستأجر أ والمستأجر ب
        $size = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'L', 'code' => 'L']);
        $color = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'Navy', 'code' => 'NAVY']);
        $modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'POLO-A',
            'name' => 'Alpha Polo Shirt',
            'category' => 'polo',
        ]);
        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $modelA->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'ALPHA-POLO-NAVY-L',
            'barcode' => '7891001',
            'retail_price' => 250.00,
        ]);

        $warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alpha Finished Goods',
            'code' => 'WH-A-FG',
            'type' => 'finished_goods',
        ]);
        InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $warehouseA->id,
            'variant_id' => $this->variantA->id,
            'sku' => $this->variantA->sku,
            'code' => 'FG-ALPHA-POLO',
            'name' => 'Alpha Polo Shirt Navy L',
            'unit_of_measure' => 'piece',
            'item_type' => 'finished_good',
            'current_balance' => 150,
            'is_customer_owned' => false,
        ]);

        $modelB = GarmentModel::create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'HOODIE-B',
            'name' => 'Beta Winter Hoodie',
            'category' => 'hoodie',
        ]);
        $sizeB = Size::create(['tenant_id' => $this->tenantB->id, 'name' => 'XL', 'code' => 'XL']);
        $colorB = Color::create(['tenant_id' => $this->tenantB->id, 'name' => 'Black', 'code' => 'BLK']);
        $this->variantB = ProductVariant::create([
            'tenant_id' => $this->tenantB->id,
            'garment_model_id' => $modelB->id,
            'size_id' => $sizeB->id,
            'color_id' => $colorB->id,
            'sku' => 'BETA-HOODIE-BLK-XL',
            'barcode' => '7892002',
            'retail_price' => 450.00,
        ]);
    }

    /**
     * اختبار: عنوان Host مجهول أو غير مسجل لا يمكنه قراءة متجر أي مستأجر
     */
    public function test_unknown_hostname_cannot_read_tenant_storefront(): void
    {
        $response = $this->getJson('http://unknown-random-host.com/api/v1/storefront/public');

        $response->assertStatus(404);
        $response->assertJson([
            'error' => 'StorefrontNotFound',
        ]);
    }

    /**
     * اختبار أمان P0: غياب سياق المستأجر لا يؤدي مطلقاً إلى اختيار أول مستأجر نشط
     */
    public function test_missing_tenant_context_does_not_select_first_active_tenant(): void
    {
        // إرسال طلب بدون أي معرف وبدون Host مطابق لأي مستأجر
        $response = $this->getJson('http://garmentos.cloud/api/v1/storefront/public');

        $response->assertStatus(404);
        $response->assertJsonMissing(['Alpha Direct Store']);
        $response->assertJsonMissing(['Beta Luxury Store']);
    }

    /**
     * اختبار أمان P0: نطاق غير موثق أو مجهول لا يمكنه تسجيل طلب شراء
     */
    public function test_unknown_or_unverified_domain_cannot_create_order(): void
    {
        // محاولة استخدام النطاق المخصص للمستأجر ب وهو pending_verification (غير موثق بعد)
        $response = $this->postJson('http://shop.betatextiles.com/api/v1/storefront/order', [
            'customer_name' => 'Attacker',
            'customer_phone' => '01000000000',
            'shipping_address' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantB->id,
                    'quantity' => 1,
                    'unit_price' => 450.00,
                ],
            ],
        ]);

        $response->assertStatus(404);
        $response->assertJson([
            'error' => 'StorefrontNotFound',
        ]);

        $this->assertEquals(0, StoreOrder::count());
    }

    /**
     * اختبار: النطاق الفرعي للمستأجر يوجه حتمياً لنفس المستأجر فقط
     */
    public function test_tenant_hostname_resolves_to_that_tenant_and_no_other(): void
    {
        // 1. طلب متجر أ عبر نطاقه الفرعي
        $resA = $this->getJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/public');

        $resA->assertStatus(200);
        $resA->assertJsonPath('tenant.code', 'FACTORY-ALPHA');
        $resA->assertJsonPath('store_settings.store_name', 'Alpha Direct Store');
        $this->assertEquals($this->tenantA->id, $resA->json('tenant.id'));

        // 2. طلب متجر أ عبر نطاقه المخصص الموثق
        $resCustom = $this->getJson('http://store.alphagarments.com/api/v1/storefront/public');

        $resCustom->assertStatus(200);
        $resCustom->assertJsonPath('tenant.code', 'FACTORY-ALPHA');

        // 3. طلب متجر ب عبر نطاقه الفرعي
        $resB = $this->getJson('http://beta-textiles.garmentos.cloud/api/v1/storefront/public');

        $resB->assertStatus(200);
        $resB->assertJsonPath('tenant.code', 'FACTORY-BETA');
        $resB->assertJsonPath('store_settings.store_name', 'Beta Luxury Store');
        $this->assertEquals($this->tenantB->id, $resB->json('tenant.id'));
    }

    /**
     * اختبار عزل المتاجر: متجر المستأجر أ لا يعرض منتجات المستأجر ب
     */
    public function test_tenant_a_storefront_cannot_display_tenant_b_data(): void
    {
        $response = $this->getJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/public');

        $response->assertStatus(200);
        $products = $response->json('products');

        $this->assertNotEmpty($products);
        foreach ($products as $p) {
            $this->assertNotEquals('Beta Winter Hoodie', $p['model_name']);
            $this->assertNotEquals($this->variantB->sku, $p['sku']);
        }
    }

    /**
     * اختبار أمان: طلبات الشراء في متجر أ لا يمكنها إنشاء طلب في متجر ب أو شراء منتجات شركة أخرى
     */
    public function test_tenant_a_public_order_submission_cannot_create_order_for_tenant_b_or_order_b_products(): void
    {
        // محاولة إرسال منتج المستأجر ب (variantB) داخل طلب متجر أ
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Sneaky Buyer',
            'customer_phone' => '01011112222',
            'shipping_address' => 'Alexandria',
            'payment_method' => 'cod',
            'shipping_fee' => 50,
            'items' => [
                [
                    'variant_id' => $this->variantB->id, // منتج خاص بشركة أخرى
                    'quantity' => 2,
                    'unit_price' => 450,
                ],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJson([
            'error' => 'InvalidStoreOrder',
        ]);

        $this->assertEquals(0, StoreOrder::count());
    }

    /**
     * اختبار: المستأجر الموقوف لا يمكنه استقبال طلبات أو عرض متجره
     */
    public function test_suspended_tenant_cannot_accept_public_orders_or_display_storefront(): void
    {
        // 1. استعراض المتجر
        $resStore = $this->getJson('http://suspended-factory.garmentos.cloud/api/v1/storefront/public');

        $resStore->assertStatus(403);
        $resStore->assertJson(['error' => 'StorefrontSuspended']);

        // 2. محاولة تقديم طلب
        $resOrder = $this->postJson('http://suspended-factory.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Buyer',
            'customer_phone' => '01022223333',
            'shipping_address' => 'Giza',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1, 'unit_price' => 250],
            ],
        ]);

        $resOrder->assertStatus(403);
        $resOrder->assertJson(['error' => 'StorefrontSuspended']);
    }

    /**
     * اختبار أمان P0: ترويسة X-Tenant-ID لا يمكنها تجاوز تعيين النطاق الموثق
     */
    public function test_client_supplied_tenant_id_header_cannot_override_trusted_domain_mapping(): void
    {
        // إرسال طلب إلى نطاق الشركة أ مع ترويسة X-Tenant-ID تشير إلى الشركة ب
        $response = $this->withHeaders(['X-Tenant-ID' => $this->tenantB->id])
            ->getJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/public');

        $response->assertStatus(200);
        // يجب أن يظل المحتوى خاص بالشركة أ تماماً، وتجاهل الترويسة المضللة من العميل
        $response->assertJsonPath('tenant.id', $this->tenantA->id);
        $response->assertJsonPath('tenant.code', 'FACTORY-ALPHA');
    }

    /**
     * اختبار: تسجيل طلب شراء ناجح للمتجر المعتمد والدفع عند الاستلام
     */
    public function test_valid_supported_storefront_access_and_cod_order_placement(): void
    {
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Mariam Mostafa',
            'customer_phone' => '01099998888',
            'shipping_address' => 'Zamalek, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'shipping_fee' => 40,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'product_name' => 'Alpha Polo Shirt',
                    'sku' => $this->variantA->sku,
                    'quantity' => 2,
                    'unit_price' => 250,
                ],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertEquals(1, StoreOrder::where('tenant_id', $this->tenantA->id)->count());

        $order = StoreOrder::where('tenant_id', $this->tenantA->id)->first();
        $this->assertEquals(500, (float) $order->subtotal);
        // التحقق من أن الخادم احتسب تكلفة الشحن المعتمدة (50 ج.م للقاهرة) متجاهلاً القيمة المرسلة من العميل (40 ج.م)
        $this->assertEquals(50, (float) $order->shipping_fee);
        $this->assertEquals(550, (float) $order->total_amount);
        $this->assertEquals('new', $order->status);
    }

    /**
     * اختبار: إدارة النطاقات بواسطة المشرف العام (Platform Admin Domain Management)
     */
    public function test_platform_admin_can_manage_subdomains_and_custom_domains(): void
    {
        // 1. استعراض قائمة النطاقات
        $listRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/platform-admin/domains');

        $listRes->assertStatus(200);
        $listRes->assertJsonStructure([
            'domains' => ['data', 'total'],
            'base_domain',
        ]);

        // 2. تحديث النطاق الفرعي للمستأجر أ
        $updateSub = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/subdomain", [
                'subdomain' => 'alpha-premium',
            ]);

        $updateSub->assertStatus(200);
        $this->tenantA->refresh();
        $this->assertEquals('alpha-premium', $this->tenantA->subdomain);

        // 3. التحقق من تسجيل الإجراء في سجل التدقيق (AuditLog)
        $audit = AuditLog::withoutGlobalScopes()->where('action', 'admin_update_subdomain')->where('tenant_id', $this->tenantA->id)->first();
        $this->assertNotNull($audit);
        $this->assertEquals('alpha-premium', $audit->new_values['subdomain']);

        // 4. تعيين نطاق مخصص جديد للمستأجر أ
        $updateCustom = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/custom-domain", [
                'custom_domain' => 'shop.alpha-couture.com',
            ]);

        $updateCustom->assertStatus(200);
        $this->tenantA->refresh();
        $this->assertEquals('shop.alpha-couture.com', $this->tenantA->custom_domain);
        $this->assertEquals('pending_verification', $this->tenantA->settings['domain']['custom_domain_status']);

        // 5. محاكاة توثيق النطاق المخصص
        $verifyRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/custom-domain/verify", [
                'mock_verify' => true,
            ]);

        $verifyRes->assertStatus(200);
        $this->tenantA->refresh();
        $this->assertEquals('verified', $this->tenantA->settings['domain']['custom_domain_status']);

        // 6. تعطيل وتفعيل النطاق المخصص بأمان
        $toggleRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/custom-domain/toggle");

        $toggleRes->assertStatus(200);
        $this->tenantA->refresh();
        $this->assertFalse($this->tenantA->settings['domain']['custom_domain_enabled']);
    }

    /**
     * اختبار: رفض النطاقات الفرعية المحجوزة أو المكررة
     */
    public function test_reserved_and_duplicate_subdomains_are_rejected(): void
    {
        // 1. نطاق محجوز (admin)
        $resReserved = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/subdomain", [
                'subdomain' => 'admin',
            ]);

        $resReserved->assertStatus(422);
        $resReserved->assertJson(['error' => 'InvalidSubdomain']);

        // 2. نطاق محجوز (api)
        $resApi = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/subdomain", [
                'subdomain' => 'api',
            ]);

        $resApi->assertStatus(422);

        // 3. نطاق مكرر مستخدم لدى المستأجر ب (beta-textiles)
        $resDuplicate = $this->actingAs($this->adminUser, 'sanctum')
            ->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/subdomain", [
                'subdomain' => 'beta-textiles',
            ]);

        $resDuplicate->assertStatus(422);
    }

    /**
     * اختبار أمان: مستخدم المستأجر العادي لا يمكنه الوصول لإدارة النطاقات
     */
    public function test_unauthorized_user_cannot_manage_domains(): void
    {
        $response = $this->actingAs($this->regularUserA, 'sanctum')
            ->getJson('/api/v1/platform-admin/domains');

        $response->assertStatus(403);
        $response->assertJson(['error' => 'PlatformAdminOnly']);
    }

    /**
     * اختبار أمان P0: الأسعار المرسلة من العميل لا يمكنها التلاعب بإجماليات الطلب المحفوظة
     */
    public function test_client_submitted_prices_cannot_manipulate_persisted_order_totals(): void
    {
        // محاولة خبيثة لإرسال سعر 1 جنيه لمنتج سعره الحقيقي 250 جنيه
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Fraud Attempt Buyer',
            'customer_phone' => '01055554444',
            'shipping_address' => 'Nasr City, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'shipping_fee' => 50,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                    'unit_price' => 1.00, // سعر زائف من المتصفح
                ],
            ],
        ]);

        $response->assertStatus(201);

        $order = StoreOrder::withoutGlobalScopes()->where('customer_name', 'Fraud Attempt Buyer')->first();
        $this->assertNotNull($order);
        // التحقق من أن السعر المعتمد هو السعر الحقيقي 250 وليس 1
        $this->assertEquals(500.00, (float) $order->subtotal);
        $this->assertEquals(550.00, (float) $order->total_amount);

        $item = $order->items()->first();
        $this->assertEquals(250.00, (float) $item->unit_price);
        $this->assertEquals(500.00, (float) $item->total_price);
    }

    /**
     * اختبار أمان: الأسماء والأكواد المرسلة من العميل لا يمكنها تزييف بيانات المنتجات المحفوظة
     */
    public function test_client_submitted_product_names_and_skus_cannot_override_authoritative_data(): void
    {
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Tamper Name Buyer',
            'customer_phone' => '01055554444',
            'shipping_address' => 'Nasr City, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                    'product_name' => 'Forged Luxury Leather Jacket',
                    'sku' => 'FORGED-SKU-999',
                ],
            ],
        ]);

        $response->assertStatus(201);

        $order = StoreOrder::withoutGlobalScopes()->where('customer_name', 'Tamper Name Buyer')->first();
        $item = $order->items()->first();

        // يجب أن يطابق الاسم الفعلي والموديل والـ SKU للمنتج وليس المدخلات المضللة
        $this->assertEquals('Alpha Polo Shirt', $item->product_name);
        $this->assertEquals('ALPHA-POLO-NAVY-L', $item->sku);
    }

    /**
     * اختبار: رفض الكميات الصفرية أو السالبة
     */
    public function test_zero_or_negative_quantities_are_rejected(): void
    {
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Bad Qty Buyer',
            'customer_phone' => '01055554444',
            'shipping_address' => 'Nasr City, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 0,
                ],
            ],
        ]);

        $response->assertStatus(422);
    }

    /**
     * اختبار: تعطيل توجيه النطاق المخصص يمنع الوصول للمتجر
     */
    public function test_disabled_domain_routing_prevents_public_storefront_access(): void
    {
        // النطاق المخصص للمستأجر أ موثق حالياً، نقوم بتعطيله
        $this->tenantA->settings = array_merge($this->tenantA->settings ?? [], [
            'domain' => [
                'custom_domain_status' => 'verified',
                'custom_domain_enabled' => false, // معطل
            ],
        ]);
        $this->tenantA->save();

        $response = $this->getJson('http://store.alphagarments.com/api/v1/storefront/public');
        $response->assertStatus(404);
    }

    /**
     * اختبار أمان P0: رسوم الشحن المرسلة من العميل يتم تجاهلها تماماً وتطبيق السياسة المعتمدة سيرفر-سايد
     */
    public function test_client_submitted_shipping_fee_is_ignored_and_overridden_by_authoritative_server_policy(): void
    {
        // العميل يحاول إرسال رسوم شحن 0 أو 5 جنيه لمدينة الإسكندرية (المفترض 60 ج.م)
        $response = $this->postJson('http://alpha-apparel.garmentos.cloud/api/v1/storefront/order', [
            'customer_name' => 'Shipping Tamper Test Buyer',
            'customer_phone' => '01011112222',
            'shipping_address' => 'Sidi Gaber, Alexandria',
            'city' => 'Alexandria',
            'payment_method' => 'cod',
            'shipping_fee' => 5.00, // محاولة تلاعب برسوم الشحن
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                ],
            ],
        ]);

        $response->assertStatus(201);

        $order = StoreOrder::withoutGlobalScopes()->where('customer_name', 'Shipping Tamper Test Buyer')->first();
        $this->assertNotNull($order);
        $this->assertEquals(250.00, (float) $order->subtotal);
        // تم فرض 60 ج.م للإسكندرية وتجاهل 5.00 ج.م المرسلة من المتصفح
        $this->assertEquals(60.00, (float) $order->shipping_fee);
        $this->assertEquals(310.00, (float) $order->total_amount);
    }
}


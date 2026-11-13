<?php

namespace Tests\Feature;

use App\Models\Color;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductVariantWholesaleTier;
use App\Models\SalesOrder;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WholesaleCustomerProfile;
use App\Services\StorefrontService;
use App\Services\WholesaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class WholesaleStorefrontLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected User $ownerA;
    protected Warehouse $warehouseFGA;
    protected GarmentModel $modelA;
    protected Product $productA;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItemA;
    protected WholesaleService $wholesaleService;
    protected StorefrontService $storefrontService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->wholesaleService = app(WholesaleService::class);
        $this->storefrontService = app(StorefrontService::class);

        $this->tenantA = Tenant::create([
            'code' => 'TEN-WS-TEST-A',
            'name' => 'مصنع النيل للملابس الجاهزة',
            'subdomain' => 'nile-wholesale',
            'currency' => 'EGP',
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'صاحب المصنع',
            'email' => 'owner@nile-wholesale.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('Password123!'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        TenantStoreSetting::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'متجر مصنع النيل المباشر',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'currency' => 'EGP',
        ]);

        $this->warehouseFGA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع المنتج التام',
            'code' => 'WH-FG-WS',
            'type' => 'finished_goods',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $color = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'كحلي',
            'code' => 'NVY',
        ]);

        $size = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Large',
            'code' => 'L',
            'sort_order' => 3,
        ]);

        $this->modelA = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'تيشيرت بولو قطن 100%',
            'code' => 'POLO-01',
            'category' => 'tshirts',
            'wholesale_price' => 200.00,
        ]);

        $this->productA = Product::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'تيشيرت بولو فاخر',
            'code' => 'PROD-POLO',
            'status' => 'active',
            'selling_price' => 300.00,
            'wholesale_price' => 200.00,
        ]);

        $this->variantA = ProductVariant::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'product_id' => $this->productA->id,
            'garment_model_id' => $this->modelA->id,
            'color_id' => $color->id,
            'size_id' => $size->id,
            'sku' => 'POLO-NVY-L',
            'barcode' => '622000009999',
            'retail_price' => 300.00,
            'wholesale_price' => 200.00,
            'moq' => 20, // Minimum Order Quantity for Wholesale
        ]);

        // Create Wholesale Tiers:
        // Tier 1: 20-99 units -> EGP 190
        ProductVariantWholesaleTier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'variant_id' => $this->variantA->id,
            'min_quantity' => 20,
            'max_quantity' => 99,
            'unit_price' => 190.00,
            'is_active' => true,
        ]);

        // Tier 2: 100+ units -> EGP 165
        ProductVariantWholesaleTier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'variant_id' => $this->variantA->id,
            'min_quantity' => 100,
            'max_quantity' => null,
            'unit_price' => 165.00,
            'is_active' => true,
        ]);

        // Stock in finished goods warehouse: 250 units
        $this->inventoryItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseFGA->id,
            'variant_id' => $this->variantA->id,
            'name' => 'تيشيرت بولو كحلي - L',
            'code' => 'FG-POLO-NVY-L',
            'item_type' => 'finished_goods',
            'unit_of_measure' => 'piece',
            'current_balance' => 250.00,
            'reserved_balance' => 0.00,
            'average_cost' => 110.00,
            'is_customer_owned' => false,
            'is_active' => true,
        ]);
    }

    public function test_public_visitor_sees_retail_prices_only_with_wholesale_pricing_stripped(): void
    {
        // 1. Anonymous visitor fetching storefront catalog
        $details = $this->storefrontService->getStoreDetails($this->tenantA->id, false, null);

        $this->assertNotEmpty($details['products']);
        $product = collect($details['products'])->firstWhere('id', $this->variantA->id);

        $this->assertNotNull($product);
        $this->assertEquals(300.00, $product['price']); // Retail price
        $this->assertArrayNotHasKey('wholesale_price', $product); // Must NEVER leak
        $this->assertArrayNotHasKey('wholesale_tiers', $product); // Must NEVER leak
        $this->assertNull($details['wholesale_user']);
    }

    public function test_wholesale_customer_registration_creates_pending_profile(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'شركة الأهرام للتوزيع والتوريدات',
            'business_type' => 'distributor',
            'contact_person' => 'أحمد محمود',
            'phone' => '01011112222',
            'email' => 'ahmed@ahram-dist.test',
            'password' => 'Wholesale123!@#',
            'tax_id' => '123-456-789',
            'commercial_registry' => 'CR-998877',
            'city' => 'Giza',
            'shipping_address' => 'شارع الهرم، الجيزة',
        ]);

        $this->assertEquals('pending', $profile->status);
        $this->assertFalse($profile->isApproved());
        $this->assertNotNull($profile->customer_id);

        // Customer in core ERP must also be created with classification wholesale
        $customer = Customer::withoutGlobalScopes()->find($profile->customer_id);
        $this->assertNotNull($customer);
        $this->assertEquals('wholesale', $customer->classification);
    }

    public function test_pending_wholesale_customer_cannot_access_wholesale_prices_or_checkout(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'سلسلة محلات الفاخر',
            'contact_person' => 'خالد سعيد',
            'phone' => '01033334444',
            'email' => 'khaled@fakher.test',
            'password' => 'Password123!@#',
        ]);

        // Attempting to view catalog with pending token
        $details = $this->storefrontService->getStoreDetails($this->tenantA->id, false, $profile->plain_auth_token);
        $product = collect($details['products'])->firstWhere('id', $this->variantA->id);

        // Still stripped: pending account cannot see wholesale prices
        $this->assertArrayNotHasKey('wholesale_price', $product);

        // Attempting to place wholesale order with pending account must be rejected
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('طلب الجملة متاح فقط لحسابات عملاء الجملة المعتمدة');

        $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'wholesale',
            'wholesale_token' => $profile->plain_auth_token,
            'customer_name' => 'خالد سعيد',
            'customer_phone' => '01033334444',
            'shipping_address' => 'وسط البلد، القاهرة',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 25],
            ],
        ]);
    }

    public function test_admin_approval_lifecycle_and_audit_trail(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'مؤسسة التجارة الحديثة',
            'contact_person' => 'طارق كمال',
            'phone' => '01055556666',
            'email' => 'tarek@modern-trade.test',
            'password' => 'Password123!@#',
        ]);

        $this->actingAs($this->ownerA);

        // Admin approves via API
        $response = $this->postJson("/api/v1/storefront/wholesale/applications/{$profile->id}/approve");
        $response->assertStatus(200)->assertJson(['success' => true]);

        $approvedProfile = $profile->fresh();
        $this->assertEquals('approved', $approvedProfile->status);
        $this->assertTrue($approvedProfile->isApproved());
        $this->assertEquals($this->ownerA->id, $approvedProfile->reviewed_by);
        $this->assertNotNull($approvedProfile->approved_at);
    }

    public function test_approved_wholesaler_receives_tiered_pricing_and_enforces_moq(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'محلات الصفا للملابس',
            'contact_person' => 'سامح علي',
            'phone' => '01077778888',
            'email' => 'sameh@safa.test',
            'password' => 'Password123!@#',
        ]);

        $this->wholesaleService->approveApplication($this->tenantA->id, $profile->id, $this->ownerA->id);

        // 1. Storefront catalog view with approved token exposes wholesale prices and tiers
        $details = $this->storefrontService->getStoreDetails($this->tenantA->id, false, $profile->plain_auth_token);
        $product = collect($details['products'])->firstWhere('id', $this->variantA->id);

        $this->assertNotNull($product);
        $this->assertTrue($product['is_wholesale_eligible']);
        $this->assertEquals(200.00, $product['wholesale_price']);
        $this->assertEquals(20, $product['moq']);
        $this->assertCount(2, $product['wholesale_tiers']);
        $this->assertEquals(190.00, $product['wholesale_tiers'][0]['unit_price']);
        $this->assertEquals(165.00, $product['wholesale_tiers'][1]['unit_price']);

        // 2. Ordering below MOQ (e.g. 10 pieces when MOQ is 20) must be rejected
        try {
            $this->storefrontService->placeStoreOrder($this->tenantA->id, [
                'channel' => 'wholesale',
                'wholesale_token' => $profile->plain_auth_token,
                'customer_name' => 'سامح علي',
                'customer_phone' => '01077778888',
                'shipping_address' => 'الإسكندرية',
                'payment_method' => 'cod',
                'items' => [
                    ['variant_id' => $this->variantA->id, 'quantity' => 10],
                ],
            ]);
            $this->fail('Expected exception for ordering below MOQ not thrown.');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('أقل من الحد الأدنى لطلب الجملة', $e->getMessage());
        }

        // 3. Ordering in Tier 1 (30 pieces, between 20-99) -> authoritative unit price EGP 190
        $orderTier1 = $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'wholesale',
            'wholesale_token' => $profile->plain_auth_token,
            'customer_name' => 'سامح علي',
            'customer_phone' => '01077778888',
            'shipping_address' => 'الإسكندرية',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 30],
            ],
        ]);

        $this->assertEquals(30 * 190.00, $orderTier1->subtotal);

        // Verify linked ERP SalesOrder has channel and order_type = wholesale
        $salesOrder1 = SalesOrder::withoutGlobalScopes()->find($orderTier1->sales_order_id);
        $this->assertNotNull($salesOrder1);
        $this->assertEquals('wholesale', $salesOrder1->order_type);
        $this->assertEquals('storefront', $salesOrder1->channel);
        $this->assertEquals($profile->customer_id, $salesOrder1->customer_id);

        // 4. Ordering in Tier 2 (120 pieces, 100+) -> authoritative unit price EGP 165
        $orderTier2 = $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'wholesale',
            'wholesale_token' => $profile->plain_auth_token,
            'customer_name' => 'سامح علي',
            'customer_phone' => '01077778888',
            'shipping_address' => 'الإسكندرية',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 120],
            ],
        ]);

        $this->assertEquals(120 * 165.00, $orderTier2->subtotal);
        $salesOrder2 = SalesOrder::withoutGlobalScopes()->find($orderTier2->sales_order_id);
        $this->assertEquals('wholesale', $salesOrder2->order_type);
    }

    public function test_retail_order_checkout_classified_as_retail_sales_order(): void
    {
        $retailOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'retail',
            'customer_name' => 'محمد حسن',
            'customer_phone' => '01099990000',
            'shipping_address' => 'مدينة نصر، القاهرة',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 2],
            ],
        ]);

        $this->assertEquals(2 * 300.00, $retailOrder->subtotal); // Retail price 300
        $salesOrder = SalesOrder::withoutGlobalScopes()->find($retailOrder->sales_order_id);
        $this->assertEquals('retail', $salesOrder->order_type);
        $this->assertEquals('storefront', $salesOrder->channel);
    }

    public function test_suspension_immediately_revokes_wholesale_privileges(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'توكيل الأناقة',
            'contact_person' => 'هاني رمزي',
            'phone' => '01122223333',
            'email' => 'hani@anaka.test',
            'password' => 'Password123!@#',
        ]);

        $this->wholesaleService->approveApplication($this->tenantA->id, $profile->id, $this->ownerA->id);

        // Suspend account
        $this->wholesaleService->suspendApplication($this->tenantA->id, $profile->id, $this->ownerA->id, 'مخالفة سياسة الأسعار');
        $this->assertTrue($profile->fresh()->isSuspended());

        // Attempt to order wholesale -> rejected immediately
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('الحالة الحالية: suspended');

        $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'wholesale',
            'wholesale_token' => $profile->plain_auth_token,
            'customer_name' => 'هاني رمزي',
            'customer_phone' => '01122223333',
            'shipping_address' => 'طنطا',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 25],
            ],
        ]);
    }

    public function test_strict_stock_blocking_rejects_wholesale_order_exceeding_inventory(): void
    {
        $profile = $this->wholesaleService->registerWholesaleAccount($this->tenantA->id, [
            'company_name' => 'شركة الكبرى للتوريدات',
            'contact_person' => 'مروان فؤاد',
            'phone' => '01233334444',
            'email' => 'marwan@kobra.test',
            'password' => 'Password123!@#',
        ]);

        $this->wholesaleService->approveApplication($this->tenantA->id, $profile->id, $this->ownerA->id);

        // Current available balance is 250 (30 reserved by tier 1 test if clean, but refreshDatabase resets).
        // Request 500 units -> must be blocked under STRICT BLOCK policy!
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('الكمية المطلوبة للمنتج POLO-NVY-L غير متوفرة حالياً بالمخزن');

        $this->storefrontService->placeStoreOrder($this->tenantA->id, [
            'channel' => 'wholesale',
            'wholesale_token' => $profile->plain_auth_token,
            'customer_name' => 'مروان فؤاد',
            'customer_phone' => '01233334444',
            'shipping_address' => 'الإسماعيلية',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 500],
            ],
        ]);
    }
}

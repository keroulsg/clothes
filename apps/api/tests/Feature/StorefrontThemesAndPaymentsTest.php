<?php

namespace Tests\Feature;

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
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StorefrontThemesAndPaymentsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $managerA;
    protected User $accountantA;
    protected User $managerB;
    protected GarmentModel $modelA;
    protected Color $colorA;
    protected Size $sizeA;
    protected ProductVariant $variantA;
    protected Warehouse $warehouseA;
    protected InventoryItem $inventoryA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-ALPHA',
            'name' => 'Alpha Fashion Factory',
            'subdomain' => 'alpha-fashion',
            'status' => 'active',
            'plan_tier' => 'professional',
            'currency' => 'EGP',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-BETA',
            'name' => 'Beta Kids Apparel',
            'subdomain' => 'beta-kids',
            'status' => 'active',
            'plan_tier' => 'professional',
            'currency' => 'EGP',
        ]);

        $this->managerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Manager Alpha',
            'email' => 'manager@alpha.test',
            'role' => 'production_manager',
            'is_active' => true,
            'password' => bcrypt('secret123'),
        ]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Accountant Alpha',
            'email' => 'accountant@alpha.test',
            'role' => 'accountant',
            'is_active' => true,
            'password' => bcrypt('secret123'),
        ]);

        $this->managerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Manager Beta',
            'email' => 'manager@beta.test',
            'role' => 'production_manager',
            'is_active' => true,
            'password' => bcrypt('secret123'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alpha Finished Goods Warehouse',
            'code' => 'WH-FG-01',
            'type' => 'finished_goods',
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'Alpha Factory Store',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_card_payment' => false,
            'allow_instapay' => true,
            'instapay_account_verified' => true,
            'instapay_handle' => 'alpha@instapay',
        ]);

        $this->modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-101',
            'name' => 'Summer Casual Polo',
            'category' => 'men',
        ]);

        $this->colorA = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy Blue',
            'code' => '#000080',
        ]);

        $this->sizeA = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'color_id' => $this->colorA->id,
            'size_id' => $this->sizeA->id,
            'sku' => 'MOD-101-NVY-L',
            'barcode' => '6221234567890',
            'retail_price' => 350.00,
            'wholesale_price' => 280.00,
        ]);

        $this->inventoryA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'item_type' => 'finished_product',
            'code' => 'INV-POLO-L',
            'name' => 'Summer Casual Polo (Navy L)',
            'unit_of_measure' => 'piece',
            'current_balance' => 20,
            'average_cost' => 150.00,
            'is_customer_owned' => false,
        ]);
    }

    public function test_can_get_storefront_details_with_available_themes_and_defaults(): void
    {
        $response = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'store_settings' => [
                'theme_id',
                'is_store_enabled',
                'allow_cod',
                'allow_instapay',
                'currency',
                'direction',
            ],
            'available_themes' => [
                StorefrontService::THEME_MODERN_FASHION,
                StorefrontService::THEME_KIDS_BABY,
                StorefrontService::THEME_PREMIUM_BRAND,
                StorefrontService::THEME_WHOLESALE_UNIFORM,
            ],
            'products',
        ]);

        $this->assertEquals(StorefrontService::THEME_FASHION_BOUTIQUE, $response->json('store_settings.theme_id'));
    }

    public function test_tenant_can_configure_theme_and_branding(): void
    {
        Sanctum::actingAs($this->managerA);

        $payload = [
            'store_name' => 'Alpha Luxury Boutique',
            'theme_id' => StorefrontService::THEME_PREMIUM_BRAND,
            'theme_config' => [
                'primary_color' => '#d97706',
                'secondary_color' => '#18181b',
                'font_family' => 'Amiri, serif',
            ],
            'direction' => 'rtl',
            'allow_instapay' => true,
            'instapay_account_name' => 'Alpha Factory InstaPay Account',
            'instapay_handle' => 'alpha@instapay',
            'banner_title' => 'تشكيلة الصيف الراقية 2026',
        ];

        $response = $this->putJson('/api/v1/storefront/settings', $payload);

        $response->assertStatus(200);
        $this->assertEquals(StorefrontService::THEME_PREMIUM_BRAND, $response->json('store_settings.theme_id'));
        $this->assertEquals('Alpha Luxury Boutique', $response->json('store_settings.store_name'));
        $this->assertEquals('#d97706', $response->json('store_settings.theme_config.primary_color'));
    }

    public function test_invalid_theme_is_rejected(): void
    {
        Sanctum::actingAs($this->managerA);

        $response = $this->putJson('/api/v1/storefront/settings', [
            'theme_id' => 'unsupported_theme_xyz',
        ]);

        $response->assertStatus(422);
    }

    public function test_tenant_theme_settings_are_isolated_between_tenants(): void
    {
        // Tenant A sets Premium Brand
        Sanctum::actingAs($this->managerA);
        $this->putJson('/api/v1/storefront/settings', [
            'theme_id' => StorefrontService::THEME_PREMIUM_BRAND,
            'store_name' => 'Alpha Premium Store',
        ])->assertStatus(200);

        // Tenant B sets Kids & Baby
        Sanctum::actingAs($this->managerB);
        app()->instance('current_tenant_id', $this->tenantB->id);
        $this->putJson('/api/v1/storefront/settings', [
            'theme_id' => StorefrontService::THEME_KIDS_BABY,
            'store_name' => 'Beta Cute Kids Store',
        ])->assertStatus(200);

        // Verify public store A
        $publicA = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");
        $this->assertEquals(StorefrontService::THEME_PREMIUM_BRAND, $publicA->json('store_settings.theme_id'));
        $this->assertEquals('Alpha Premium Store', $publicA->json('store_settings.store_name'));

        // Verify public store B
        $publicB = $this->getJson("/api/v1/storefront/public/{$this->tenantB->id}");
        $this->assertEquals(StorefrontService::THEME_KIDS_BABY, $publicB->json('store_settings.theme_id'));
        $this->assertEquals('Beta Cute Kids Store', $publicB->json('store_settings.store_name'));
    }

    public function test_customer_can_place_order_with_instapay_and_reference(): void
    {
        $orderData = [
            'customer_name' => 'محمود كمال',
            'customer_phone' => '01012345678',
            'shipping_address' => 'شارع الثورة، مصر الجديدة',
            'city' => 'Cairo',
            'payment_method' => 'instapay',
            'instapay_reference' => 'TXN-987654321',
            'instapay_receipt_url' => 'https://storage.garmentos.com/receipts/txn-987.jpg',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                ],
            ],
        ];

        $response = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderData);

        $response->assertStatus(201);
        $order = $response->json('order');

        $this->assertEquals('instapay', $order['payment_method']);
        // Critical requirement: Never mark a transfer paid based solely on an uploaded screenshot!
        $this->assertEquals('pending_review', $order['payment_status']);
        $this->assertEquals('TXN-987654321', $order['instapay_reference']);
        $this->assertNull($order['payment_reviewed_by'] ?? null);
    }

    public function test_manager_can_verify_instapay_payment_and_record_audit_info(): void
    {
        // 1. Create order with InstaPay
        $orderData = [
            'customer_name' => 'هاني فوزي',
            'customer_phone' => '01122334455',
            'shipping_address' => 'الدقي، الجيزة',
            'city' => 'Giza',
            'payment_method' => 'instapay',
            'instapay_reference' => 'TXN-VERIFY-123',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                ],
            ],
        ];
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderData);
        $orderId = $orderRes->json('order.id');

        // 2. Manager verifies the payment
        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $verifyRes = $this->postJson("/api/v1/storefront/orders/{$orderId}/verify-payment", [
            'approved' => true,
        ]);

        $verifyRes->assertStatus(200);
        $updatedOrder = $verifyRes->json('order');

        $this->assertEquals('verified_paid', $updatedOrder['payment_status']);
        $this->assertEquals($this->managerA->id, $updatedOrder['payment_reviewed_by_user_id']);
        $this->assertNotNull($updatedOrder['payment_reviewed_at']);
        $this->assertNull($updatedOrder['payment_rejection_reason']);
    }

    public function test_manager_can_reject_instapay_payment_with_reason(): void
    {
        $orderData = [
            'customer_name' => 'أحمد سمير',
            'customer_phone' => '01234567890',
            'shipping_address' => 'مدينة نصر',
            'city' => 'Cairo',
            'payment_method' => 'instapay',
            'instapay_reference' => 'TXN-FAKE-999',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                ],
            ],
        ];
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderData);
        $orderId = $orderRes->json('order.id');

        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rejectRes = $this->postJson("/api/v1/storefront/orders/{$orderId}/verify-payment", [
            'approved' => false,
            'rejection_reason' => 'رقم العملية المرجعي غير مسجل في الكشف البنكي اليومي',
        ]);

        $rejectRes->assertStatus(200);
        $updatedOrder = $rejectRes->json('order');

        $this->assertEquals('rejected', $updatedOrder['payment_status']);
        $this->assertEquals('رقم العملية المرجعي غير مسجل في الكشف البنكي اليومي', $updatedOrder['payment_rejection_reason']);
        $this->assertEquals($this->accountantA->id, $updatedOrder['payment_reviewed_by_user_id']);
    }

    public function test_inventory_synchronization_deducts_stock_on_order_and_restores_on_cancellation(): void
    {
        $initialBalance = (float)$this->inventoryA->fresh()->current_balance;
        $this->assertEquals(20.0, $initialBalance);

        // Place order for 3 items
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'سارة علي',
            'customer_phone' => '01099887766',
            'shipping_address' => 'التجمع الخامس',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 3,
                ],
            ],
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('order.id');

        // Stock reservation: current_balance remains 20, reserved_balance becomes 3
        $inv = $this->inventoryA->fresh();
        $this->assertEquals(20.0, (float)$inv->current_balance);
        $this->assertEquals(3.0, (float)$inv->reserved_balance);
        $this->assertEquals(17.0, (float)($inv->current_balance - $inv->reserved_balance));

        // Cancel order via manager
        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $cancelRes = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", [
            'status' => 'cancelled',
        ]);
        $cancelRes->assertStatus(200);

        // Reservation released: reserved_balance becomes 0, available is restored to 20
        $restoredInv = $this->inventoryA->fresh();
        $this->assertEquals(20.0, (float)$restoredInv->current_balance);
        $this->assertEquals(0.0, (float)$restoredInv->reserved_balance);
    }

    public function test_insufficient_inventory_prevents_order_placement(): void
    {
        $this->inventoryA->update(['current_balance' => 2]);

        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'طارق كمال',
            'customer_phone' => '01011223344',
            'shipping_address' => 'الإسكندرية',
            'city' => 'Alexandria',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 10, // Demands 10, available is only 2
                ],
            ],
        ]);

        $orderRes->assertStatus(422);
        $this->assertStringContainsString('غير متوفرة حالياً بالمخزن', $orderRes->json('message'));
    }

    public function test_consecutive_orders_cannot_oversell_the_last_unit(): void
    {
        $this->inventoryA->update(['current_balance' => 1]);

        // Order 1 takes the last unit
        $res1 = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل 1',
            'customer_phone' => '01011111111',
            'shipping_address' => 'القاهرة',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1],
            ],
        ]);
        $res1->assertStatus(201);
        $inv1 = $this->inventoryA->fresh();
        $this->assertEquals(1.0, (float)$inv1->current_balance);
        $this->assertEquals(1.0, (float)$inv1->reserved_balance);
        $this->assertEquals(0.0, (float)($inv1->current_balance - $inv1->reserved_balance));

        // Order 2 tries to order 1 unit when stock is 0
        $res2 = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل 2',
            'customer_phone' => '01022222222',
            'shipping_address' => 'الجيزة',
            'city' => 'Giza',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1],
            ],
        ]);
        $res2->assertStatus(422);
        $this->assertStringContainsString('غير متوفرة حالياً بالمخزن', $res2->json('message'));
    }

    public function test_repeated_cancellation_cannot_restore_inventory_more_than_once(): void
    {
        $this->inventoryA->update(['current_balance' => 10]);

        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل تجريبي',
            'customer_phone' => '01033333333',
            'shipping_address' => 'القاهرة',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 4],
            ],
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('order.id');
        $this->assertEquals(10.0, (float)$this->inventoryA->fresh()->current_balance);
        $this->assertEquals(4.0, (float)$this->inventoryA->fresh()->reserved_balance);

        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // First cancellation releases 4 units reserved
        $cancel1 = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'cancelled']);
        $cancel1->assertStatus(200);
        $this->assertEquals(10.0, (float)$this->inventoryA->fresh()->current_balance);
        $this->assertEquals(0.0, (float)$this->inventoryA->fresh()->reserved_balance);

        // Repeated cancellation call must not restore inventory again
        $cancel2 = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'cancelled']);
        $cancel2->assertStatus(200);
        $this->assertEquals(10.0, (float)$this->inventoryA->fresh()->current_balance);
        $this->assertEquals(0.0, (float)$this->inventoryA->fresh()->reserved_balance);

        // Direct service calls must also remain strictly idempotent
        $orderModel = StoreOrder::find($orderId);
        app(StorefrontService::class)->restoreOrderInventory($orderModel);
        app(StorefrontService::class)->restoreOrderInventory($orderModel);
        $this->assertEquals(10.0, (float)$this->inventoryA->fresh()->current_balance);
        $this->assertEquals(0.0, (float)$this->inventoryA->fresh()->reserved_balance);
    }

    public function test_cannot_ship_unverified_instapay_order(): void
    {
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل InstaPay',
            'customer_phone' => '01044444444',
            'shipping_address' => 'المعادي',
            'city' => 'Cairo',
            'payment_method' => 'instapay',
            'instapay_reference' => 'TXN-SHIP-TEST',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1],
            ],
        ]);
        $orderRes->assertStatus(201);
        $orderId = $orderRes->json('order.id');

        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Trying to ship before payment is verified must fail with 422
        $shipAttempt = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'shipped']);
        $shipAttempt->assertStatus(422);
        $shipAttempt->assertJsonFragment(['error' => 'UnverifiedPayment']);

        // Verify payment
        $this->postJson("/api/v1/storefront/orders/{$orderId}/verify-payment", ['approved' => true])->assertStatus(200);

        // Now shipping must succeed
        $shipSuccess = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'shipped']);
        $shipSuccess->assertStatus(200);
        $this->assertEquals('shipped', $shipSuccess->json('order.status'));
    }

    public function test_cannot_cancel_already_delivered_order(): void
    {
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل منتهي',
            'customer_phone' => '01055555555',
            'shipping_address' => 'مدينة نصر',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $orderRes->json('order.id');

        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Ship and Deliver
        $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'shipped'])->assertStatus(200);
        $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'delivered'])->assertStatus(200);

        // Attempt to cancel delivered order must fail
        $cancelDelivered = $this->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'cancelled']);
        $cancelDelivered->assertStatus(422);
        $cancelDelivered->assertJsonFragment(['error' => 'InvalidStatusTransition']);
    }

    public function test_cross_tenant_cannot_verify_payment(): void
    {
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل أ',
            'customer_phone' => '01066666666',
            'shipping_address' => 'مصر الجديدة',
            'city' => 'Cairo',
            'payment_method' => 'instapay',
            'instapay_reference' => 'TXN-TENANT-A',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1],
            ],
        ]);
        $orderId = $orderRes->json('order.id');

        // Manager B (belongs to Tenant B) attempts to verify Tenant A's order
        Sanctum::actingAs($this->managerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $crossAttempt = $this->postJson("/api/v1/storefront/orders/{$orderId}/verify-payment", ['approved' => true]);
        $crossAttempt->assertStatus(404);
    }

    public function test_duplicate_cart_lines_cannot_reserve_more_than_available_stock(): void
    {
        $this->inventoryA->update([
            'current_balance' => 5,
            'reserved_balance' => 0,
        ]);

        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل اختبار تكرار الصنف',
            'customer_phone' => '01055555555',
            'shipping_address' => 'القاهرة',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 3],
                ['variant_id' => $this->variantA->id, 'quantity' => 3],
            ],
        ]);

        $orderRes->assertStatus(422);
        $this->assertEquals(5.0, (float) $this->inventoryA->fresh()->current_balance);
        $this->assertEquals(0.0, (float) $this->inventoryA->fresh()->reserved_balance);
        $this->assertDatabaseMissing('store_orders', [
            'tenant_id' => $this->tenantA->id,
        ]);
    }


    public function test_shipping_storefront_order_fulfills_erp_order_and_posts_stock_issue(): void
    {
        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", [
            'customer_name' => 'عميل طلب شحن',
            'customer_phone' => '01066666666',
            'shipping_address' => 'مدينة نصر',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 2],
            ],
        ]);
        $orderRes->assertCreated();

        $storeOrderId = $orderRes->json('order.id');
        $salesOrderId = $orderRes->json('order.sales_order_id');

        $this->assertEquals(20.0, (float) $this->inventoryA->fresh()->current_balance);
        $this->assertEquals(2.0, (float) $this->inventoryA->fresh()->reserved_balance);

        Sanctum::actingAs($this->managerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $shipRes = $this->patchJson("/api/v1/storefront/orders/{$storeOrderId}/status", [
            'status' => 'shipped',
        ]);
        $shipRes->assertOk()
            ->assertJsonPath('order.status', 'shipped');

        $this->assertEquals(18.0, (float) $this->inventoryA->fresh()->current_balance);
        $this->assertEquals(0.0, (float) $this->inventoryA->fresh()->reserved_balance);
        $this->assertDatabaseHas('sales_orders', [
            'id' => $salesOrderId,
            'tenant_id' => $this->tenantA->id,
            'status' => 'fulfilled',
        ]);
        $this->assertDatabaseHas('sales_invoices', [
            'sales_order_id' => $salesOrderId,
            'tenant_id' => $this->tenantA->id,
            'status' => 'issued',
        ]);
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $this->inventoryA->id,
            'direction' => 'OUT',
            'transaction_type' => 'sales_delivery',
            'reference_type' => 'sales_orders',
            'reference_id' => $salesOrderId,
        ]);

        // Repeating the same shipped transition must not issue stock or create another invoice.
        $repeatShip = $this->patchJson("/api/v1/storefront/orders/{$storeOrderId}/status", [
            'status' => 'shipped',
        ]);
        $repeatShip->assertOk();
        $this->assertEquals(18.0, (float) $this->inventoryA->fresh()->current_balance);
        $this->assertDatabaseCount('sales_invoices', 1);
    }

}

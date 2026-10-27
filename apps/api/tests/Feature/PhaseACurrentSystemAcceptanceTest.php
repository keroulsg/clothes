<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Branch;
use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\SalesInvoice;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PhaseACurrentSystemAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $cashierUser;
    protected User $managerUser;
    protected Warehouse $warehouse;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItem;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. إنشاء المستأجر أ والمستأجر ب
        $this->tenantA = Tenant::create([
            'code' => 'FACTORY-ALPHA',
            'name' => 'Alpha Apparel Industries',
            'subdomain' => 'alpha-apparel',
            'status' => 'active',
            'plan_tier' => 'professional',
            'currency' => 'EGP',
            'timezone' => 'Africa/Cairo',
            'settings' => [
                'subscription' => ['is_paid' => true, 'status' => 'active'],
            ],
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'FACTORY-BETA',
            'name' => 'Beta Textiles',
            'subdomain' => 'beta-textiles',
            'status' => 'active',
            'plan_tier' => 'starter',
            'currency' => 'EGP',
            'timezone' => 'Africa/Cairo',
            'settings' => [
                'subscription' => ['is_paid' => true, 'status' => 'active'],
            ],
        ]);

        // 2. مستخدمو المستأجر أ
        $this->cashierUser = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Cashier Omar',
            'email' => 'cashier@alpha.com',
            'password' => bcrypt('Password123!'),
            'role' => 'sales_officer',
            'is_active' => true,
        ]);

        $this->managerUser = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Manager Kareem',
            'email' => 'manager@alpha.com',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 3. إعداد المخزن والموديل والمنتج والمخزون
        $this->warehouse = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-FG-01',
            'name' => 'Alpha Finished Goods Main',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $size = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'XL', 'code' => 'XL']);
        $color = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'Royal Blue', 'code' => 'RBLU']);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-POLO-2026',
            'name' => 'Classic Pique Polo',
            'category' => 'polo',
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $model->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'AL-POLO-BLU-XL',
            'barcode' => '6221000123456',
            'retail_price' => 350.00,
            'wholesale_price' => 280.00,
        ]);

        $this->inventoryItem = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouse->id,
            'variant_id' => $this->variantA->id,
            'item_type' => 'finished_product',
            'code' => 'INV-POLO-XL',
            'name' => 'Classic Pique Polo (XL)',
            'unit_of_measure' => 'piece',
            'current_balance' => 50,
            'reserved_balance' => 0,
            'reorder_point' => 10,
            'cost_price' => 180.00,
            'is_customer_owned' => false,
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'Alpha Factory Direct Store',
            'theme_id' => 'modern_fashion',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_instapay' => true,
            'instapay_account_name' => 'Alpha Apparel Bank Account',
            'instapay_handle' => 'alpha@instapay',
            'instapay_instructions' => 'يرجى التحويل إلى المعرف أعلاه وإدخال رقم العملية للتأكيد.',
            'currency' => 'EGP',
        ]);
    }

    /**
     * 1. فحص واعتماد عملية POS:
     * فتح جلسة الكاشير -> بيع سريع -> إصدار فاتورة مبيعات -> خصم المخزون التام عبر حركات دفتر الأستاذ -> تحديث إجمالي مبيعات الجلسة
     */
    public function test_pos_sale_updates_drawer_session_and_deducts_inventory_via_double_entry(): void
    {
        $branch = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'BR-01',
            'name' => 'Main Factory Outlet',
            'is_active' => true,
        ]);

        // فتح جلسة كاشير
        $session = PosSession::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $branch->id,
            'user_id' => $this->cashierUser->id,
            'session_code' => 'POS-SES-20261027-01',
            'opening_cash' => 1000.00,
            'total_sales' => 0.00,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        // تنفيذ عملية بيع سريعة 3 قطع عبر الـ POS
        $posPayload = [
            'customer_name' => 'Walk-in Retail Customer',
            'pos_session_id' => $session->id,
            'payment_method' => 'cash',
            'discount_amount' => 50.00,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 3,
                    'unit_price' => 350.00,
                    'tax_rate' => 0.00,
                ],
            ],
        ];

        $response = $this->actingAs($this->cashierUser)
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson('/api/v1/pos/sale', $posPayload);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'message',
            'invoice' => [
                'id',
                'invoice_number',
                'total_amount',
                'status',
            ],
        ]);

        // التحقق من الحسابات المالية: 3 × 350 - 50 = 1000 جنيه
        $expectedTotal = (3 * 350.00) - 50.00;
        $this->assertEquals($expectedTotal, (float)$response->json('invoice.total_amount'));

        // التحقق من خصم المخزون: الرصيد السابق 50 - 3 = 47
        $this->inventoryItem->refresh();
        $this->assertEquals(47, (float)$this->inventoryItem->current_balance);

        // التحقق من إثبات الحركة في سجل حركات المخزون (Inventory Transactions)
        $tx = InventoryTransaction::where('tenant_id', $this->tenantA->id)
            ->where('inventory_item_id', $this->inventoryItem->id)
            ->latest()
            ->first();

        $this->assertNotNull($tx);
        $this->assertEquals(3, (float)$tx->quantity);
        $this->assertEquals(50, (float)$tx->balance_before);
        $this->assertEquals(47, (float)$tx->balance_after);

        // التحقق من تحديث إجمالي مبيعات جلسة الكاشير
        $session->refresh();
        $this->assertEquals($expectedTotal, (float)$session->total_sales);
    }

    /**
     * 2. رحلة المتجر الإلكتروني للعميل المستقل وتتبع الطلب العام:
     * تصفح المنتجات -> إتمام الطلب -> الخصم الفوري للمخزون -> تتبع حالة الطلب دون تسجيل دخول
     */
    public function test_public_storefront_order_placement_and_customer_tracking(): void
    {
        // 1. العميل يتصفح متجر المستأجر أ العام
        $storeResponse = $this->getJson("/api/v1/storefront/public/{$this->tenantA->id}");
        $storeResponse->assertStatus(200);
        $storeResponse->assertJsonFragment(['store_name' => 'Alpha Factory Direct Store']);

        // 2. العميل يسجل طلب شراء لقطعتين بنظام الدفع عند الاستلام (COD)
        $orderPayload = [
            'customer_name' => 'Tarek Mansour',
            'customer_phone' => '01012345678',
            'shipping_address' => '15 El-Galaa St, Dokki',
            'city' => 'Giza',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                    'unit_price' => 350.00,
                ],
            ],
        ];

        $orderResponse = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderPayload);
        $orderResponse->assertStatus(201);
        $orderResponse->assertJsonStructure([
            'message',
            'order' => ['id', 'order_number', 'status', 'payment_status', 'total_amount'],
        ]);

        $orderNumber = $orderResponse->json('order.order_number');
        $this->assertNotEmpty($orderNumber);
        $this->assertEquals('cod_pending', $orderResponse->json('order.payment_status'));

        // التحقق من خصم المخزون اللحظي: 50 - 2 = 48
        $this->inventoryItem->refresh();
        $this->assertEquals(48, (float)$this->inventoryItem->current_balance);

        // 3. العميل يتابع حالة الشحنة عبر مسار التتبع العام دون تسجيل دخول
        $trackResponse = $this->getJson("/api/v1/storefront/track/{$this->tenantA->id}?order_number={$orderNumber}&customer_phone=01012345678");
        $trackResponse->assertStatus(200);
        $trackResponse->assertJsonFragment(['order_number' => $orderNumber]);
        $trackResponse->assertJsonFragment(['status' => 'new']);
        $trackResponse->assertJsonFragment(['payment_status' => 'cod_pending']);
    }

    /**
     * 3. رحلة سداد InstaPay ورفع الإيصال وتدقيق الإدارة البشري:
     * طلب InstaPay -> رفع رقم عملية التحويل -> حالة pending_review -> اعتماد الإدارة -> verified_paid -> إمكانية الشحن
     */
    public function test_public_customer_instapay_receipt_submission_and_audit(): void
    {
        // 1. تسجيل طلب شراء بطريقة InstaPay
        $orderPayload = [
            'customer_name' => 'Salma Adel',
            'customer_phone' => '01298765432',
            'shipping_address' => 'Nasr City, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'instapay',
            'instapay_reference' => 'IPN-INITIAL-111',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                    'unit_price' => 350.00,
                ],
            ],
        ];

        $orderRes = $this->postJson("/api/v1/storefront/order/{$this->tenantA->id}", $orderPayload);
        $orderRes->assertStatus(201);
        $orderNumber = $orderRes->json('order.order_number');
        $orderId = $orderRes->json('order.id');

        // حالة الدفع الابتدائية هي pending_review
        $this->assertEquals('pending_review', $orderRes->json('order.payment_status'));

        // 2. محاولة شحن الطلب قبل اعتماد التحويل تفشل بحظر 422
        $shipAttempt = $this->actingAs($this->managerUser)
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'shipped']);
        $shipAttempt->assertStatus(422);
        $shipAttempt->assertJsonFragment(['error' => 'UnverifiedPayment']);

        // 3. العميل يرفع إيصال أو يحدث الرقم المرجعي بعد التحويل الفعلي عبر شاشة التتبع
        $receiptRes = $this->postJson("/api/v1/storefront/receipt/{$this->tenantA->id}", [
            'order_number' => $orderNumber,
            'customer_phone' => '01298765432',
            'instapay_reference' => 'IPN-VERIFIED-999888',
            'instapay_receipt_url' => 'https://cdn.receipts.com/rec-123.jpg',
        ]);
        $receiptRes->assertStatus(200);
        $receiptRes->assertJsonFragment(['instapay_reference' => 'IPN-VERIFIED-999888']);

        // التحقق من توثيق رفع الإيصال في سجل التدقيق (AuditLog)
        $auditLog = AuditLog::where('tenant_id', $this->tenantA->id)
            ->where('action', 'storefront.customer_receipt_submitted')
            ->first();
        $this->assertNotNull($auditLog);

        // 4. مدير المصنع يراجع التحويل البنكي ويعتمده رسمياً
        $verifyRes = $this->actingAs($this->managerUser)
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/storefront/orders/{$orderId}/verify-payment", [
                'approved' => true,
            ]);
        $verifyRes->assertStatus(200);
        $verifyRes->assertJsonFragment(['payment_status' => 'verified_paid']);

        // 5. الآن يمكن شحن الطلب بنجاح بعد اعتماد الدفع
        $shipSuccess = $this->actingAs($this->managerUser)
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->patchJson("/api/v1/storefront/orders/{$orderId}/status", ['status' => 'shipped']);
        $shipSuccess->assertStatus(200);
        $shipSuccess->assertJsonFragment(['status' => 'shipped']);
    }

    /**
     * 4. فحص الأمان والعزل: لا يمكن تتبع طلب برقم هاتف خاطئ أو من مستأجر آخر
     */
    public function test_customer_cannot_track_order_with_wrong_phone_or_other_tenant(): void
    {
        $order = StoreOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'ORD-SEC-001',
            'customer_name' => 'Private Buyer',
            'customer_phone' => '01122334455',
            'shipping_address' => 'Secret Address',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'payment_status' => 'cod_pending',
            'subtotal' => 500.00,
            'total_amount' => 550.00,
            'status' => 'new',
        ]);

        // 1. رقم هاتف خاطئ يرجع 404
        $wrongPhoneRes = $this->getJson("/api/v1/storefront/track/{$this->tenantA->id}?order_number=ORD-SEC-001&customer_phone=01999999999");
        $wrongPhoneRes->assertStatus(404);

        // 2. محاولة الاستعلام من سياق مستأجر آخر يرجع 404
        $wrongTenantRes = $this->getJson("/api/v1/storefront/track/{$this->tenantB->id}?order_number=ORD-SEC-001&customer_phone=01122334455");
        $wrongTenantRes->assertStatus(404);
    }
}

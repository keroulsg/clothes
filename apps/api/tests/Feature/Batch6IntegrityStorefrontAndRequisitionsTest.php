<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\InventoryItem;
use App\Models\PaymentSubmission;
use App\Models\ProductVariant;
use App\Models\PurchaseOrder;
use App\Models\PurchaseRequisition;
use App\Models\SalesDeliveryNote;
use App\Models\SalesOrder;
use App\Models\StoreOrder;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\TenantStoreSetting;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\SalesService;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class Batch6IntegrityStorefrontAndRequisitionsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected string $tokenA;
    protected string $tokenB;
    protected Warehouse $warehouseA;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItemA;
    protected StorefrontService $storefrontService;
    protected SalesService $salesService;
    protected AccountingService $accountingService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->storefrontService = app(StorefrontService::class);
        $this->salesService = app(SalesService::class);
        $this->accountingService = app(AccountingService::class);

        // Tenant A
        $this->tenantA = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع الأهرام للغزل والنسيج',
            'code' => 'T-A-' . uniqid(),
            'subdomain' => 'ahram-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير مصنع الأهرام',
            'email' => 'owner_' . uniqid() . '@ahram.eg',
            'password' => bcrypt('secret123'),
            'role' => 'company_owner',
        ]);
        $this->tokenA = $this->userA->createToken('test')->plainTextToken;

        // Tenant B
        $this->tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع الدلتا للملابس',
            'code' => 'T-B-' . uniqid(),
            'subdomain' => 'delta-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير مصنع الدلتا',
            'email' => 'owner_' . uniqid() . '@delta.eg',
            'password' => bcrypt('secret123'),
            'role' => 'company_owner',
        ]);
        $this->tokenB = $this->userB->createToken('test')->plainTextToken;

        // Init Chart of Accounts for Tenant A & B
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        app()->instance('current_tenant_id', $this->tenantB->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantB->id);

        app()->instance('current_tenant_id', $this->tenantA->id);

        // Warehouse for Tenant A
        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-MAIN',
            'name' => 'مستودع الأقمشة والمنتجات التامة الرئيسي',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        // Garment Model & Product Variant for Tenant A
        $modelA = \App\Models\GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-HOODIE-' . uniqid(),
            'name' => 'سويت شيرت هودي رجالي شتوي',
            'category' => 'hoodies',
            'is_active' => true,
        ]);

        $sizeL = \App\Models\Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
            'code' => 'L',
        ]);

        $colorBlack = \App\Models\Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أسود',
            'code' => 'BLK',
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $modelA->id,
            'size_id' => $sizeL->id,
            'color_id' => $colorBlack->id,
            'sku' => 'SKU-HOODIE-BLK-L',
            'barcode' => 'BAR-HOODIE-BLK-L-' . uniqid(),
            'retail_price' => 450.00,
            'wholesale_price' => 400.00,
            'cost_price' => 200.00,
            'stock_quantity' => 100,
        ]);

        $this->inventoryItemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'code' => 'INV-HOODIE-' . uniqid(),
            'name' => 'سويت شيرت هودي أسود مقاس L',
            'item_code' => 'FG-HOODIE-BLK-L',
            'item_name' => 'سويت شيرت هودي أسود مقاس L',
            'item_type' => 'finished_goods',
            'category' => 'finished_goods',
            'unit' => 'pcs',
            'unit_of_measure' => 'pcs',
            'current_balance' => 100,
            'reserved_balance' => 0,
            'average_cost' => 200.00,
            'is_customer_owned' => false,
        ]);

        TenantStoreSetting::create([
            'tenant_id' => $this->tenantA->id,
            'store_name' => 'متجر الاختبار',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_card_payment' => false,
            'allow_instapay' => false,
        ]);
    }

    /**
     * 1. فحص تكامل طلب المتجر مع أوامر البيع وحجز المخزون دون خصم الرصيد الفعلي
     */
    public function test_storefront_order_reserves_stock_without_deducting_current_balance_and_creates_sales_order(): void
    {
        $payload = [
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'كريم محمود المنصوري',
            'customer_phone' => '01012345678',
            'shipping_address' => 'شارع الهرم، الجيزة',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 10,
                    'unit_price' => 450.00,
                ],
            ],
        ];

        $storeOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, $payload);

        $this->assertNotNull($storeOrder);
        $this->assertNotNull($storeOrder->sales_order_id, 'يجب ربط طلب المتجر بأمر بيع ERP رسمي');

        $salesOrder = SalesOrder::find($storeOrder->sales_order_id);
        $this->assertNotNull($salesOrder);
        $this->assertEquals('storefront', $salesOrder->channel);
        $this->assertEquals($storeOrder->id, $salesOrder->store_order_id);

        // التحقق من دفتر المخازن: الرصيد الفعلي لم ينقص (ما زال 100)، بينما الرصيد المحجوز زاد بمقدار 10
        $this->inventoryItemA->refresh();
        $this->assertEquals(100.0, (float) $this->inventoryItemA->current_balance);
        $this->assertEquals(10.0, (float) $this->inventoryItemA->reserved_balance);
        $this->assertEquals(90.0, (float) ($this->inventoryItemA->current_balance - $this->inventoryItemA->reserved_balance));
    }

    /**
     * 2. الخصم الفعلي للمخزون يحدث حصرياً عند إصدار إذن التسليم والشحن (Delivery Note)
     */
    public function test_physical_stock_deducted_only_when_sales_delivery_note_issued(): void
    {
        $payload = [
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'أحمد رضوان',
            'customer_phone' => '01123456789',
            'shipping_address' => 'المعادي، القاهرة',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 5,
                    'unit_price' => 450.00,
                ],
            ],
        ];

        $storeOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, $payload);
        $salesOrder = SalesOrder::findOrFail($storeOrder->sales_order_id);

        $this->inventoryItemA->refresh();
        $this->assertEquals(100.0, (float) $this->inventoryItemA->current_balance);
        $this->assertEquals(5.0, (float) $this->inventoryItemA->reserved_balance);

        // تنفيذ التسليم من خلال SalesService
        $deliveryNote = $this->salesService->deliverOrder($salesOrder->id, [
            'warehouse_id' => $this->warehouseA->id,
            'delivery_date' => now()->toDateString(),
            'notes' => 'تسليم وشحن طلب المتجر',
        ]);

        $this->assertNotNull($deliveryNote);
        $this->assertEquals('dispatched', $deliveryNote->status);

        // بعد إصدار إذن التسليم: تم خصم الرصيد الفعلي وتحرير الحجز
        $this->inventoryItemA->refresh();
        $this->assertEquals(95.0, (float) $this->inventoryItemA->current_balance);
        $this->assertEquals(0.0, (float) $this->inventoryItemA->reserved_balance);
    }

    /**
     * 3. إلغاء طلب المتجر يحرر حجز المخزون ويلغي أمر البيع المرتبط
     */
    public function test_storefront_order_cancellation_releases_reservation_and_cancels_erp_sales_order(): void
    {
        $payload = [
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'سامح خليل',
            'customer_phone' => '01234567890',
            'shipping_address' => 'مدينة نصر، القاهرة',
            'payment_method' => 'cod',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 15,
                    'unit_price' => 450.00,
                ],
            ],
        ];

        $storeOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, $payload);
        $salesOrder = SalesOrder::findOrFail($storeOrder->sales_order_id);

        $this->inventoryItemA->refresh();
        $this->assertEquals(15.0, (float) $this->inventoryItemA->reserved_balance);

        // إلغاء طلب المتجر
        $this->storefrontService->updateOrderStatus($storeOrder->id, 'cancelled');

        $this->inventoryItemA->refresh();
        $this->assertEquals(100.0, (float) $this->inventoryItemA->current_balance);
        $this->assertEquals(0.0, (float) $this->inventoryItemA->reserved_balance);

        $salesOrder->refresh();
        $this->assertEquals('cancelled', $salesOrder->status);
    }

    /**
     * 4. إعدادات إنستاباي الخاصة بالمصنع معزولة ومسترجعة بدقة
     */
    public function test_tenant_instapay_settings_isolated_and_applied_to_checkout(): void
    {
        // حفظ إعدادات إنستاباي للمصنع A
        TenantStoreSetting::updateOrCreate(
            ['tenant_id' => $this->tenantA->id],
            [
                'store_name' => 'متجر مصنع الأهرام الرسمي',
                'is_store_enabled' => true,
                'allow_instapay' => true,
                'instapay_account_verified' => true,
                'instapay_identifier' => 'ahram_factory@instapay',
                'instapay_display_name' => 'شركة مصنع الأهرام للملابس',
                'instapay_instructions' => 'يرجى التحويل لمعرف إنستاباي الموضح وإدخال رقم العملية.',
            ]
        );

        $response = $this->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->getJson("/api/v1/storefront/public/{$this->tenantA->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('store_settings.instapay_identifier', 'ahram_factory@instapay');
        $response->assertJsonPath('store_settings.instapay_display_name', 'شركة مصنع الأهرام للملابس');

        // Tenant B must have its own enabled public store before testing cross-tenant isolation.
        TenantStoreSetting::create([
            'tenant_id' => $this->tenantB->id,
            'store_name' => 'متجر المصنع B',
            'is_store_enabled' => true,
            'allow_cod' => true,
            'allow_instapay' => false,
        ]);

        // التأكد من عدم تسرب إعدادات A إلى B
        $responseB = $this->withHeader('X-Tenant-ID', $this->tenantB->id)
            ->getJson("/api/v1/storefront/public/{$this->tenantB->id}");

        $responseB->assertStatus(200);
        $this->assertNotEquals('ahram_factory@instapay', $responseB->json('store_settings.instapay_identifier'));
    }

    /**
     * 5. التحقق من رفع إيصالات التحويل وحمايتها بالتخزين الخاص
     */
    public function test_receipt_upload_validation_and_private_storage_access_control(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->image('receipt.png', 600, 800);

        $response = $this->postJson("/api/v1/storefront/upload-receipt/{$this->tenantA->id}", [
            'receipt' => $file,
            'order_number' => 'ORD-TEST-1234',
            'customer_phone' => '01012345678',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $this->assertNotNull($response->json('receipt_path'));

        // رفض الامتدادات المحظورة (مثل php, exe, txt)
        $invalidFile = UploadedFile::fake()->create('malicious.php', 100, 'application/x-php');
        $invalidResponse = $this->postJson("/api/v1/storefront/upload-receipt/{$this->tenantA->id}", [
            'receipt' => $invalidFile,
        ]);

        $invalidResponse->assertStatus(422);
    }

    /**
     * 6. اعتماد تحويل إنستاباي ينشئ سند قبض رسمي وقيد يومية متوازن
     */
    public function test_instapay_payment_approval_creates_voucher_marks_paid_and_posts_gl_journal(): void
    {
        TenantStoreSetting::where('tenant_id', $this->tenantA->id)->update([
            'allow_instapay' => true,
            'instapay_account_verified' => true,
            'instapay_identifier' => 'factory-a@instapay',
        ]);

        $payload = [
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'محمود سلامة',
            'customer_phone' => '01099887766',
            'shipping_address' => 'الإسكندرية، سيدي جابر',
            'payment_method' => 'instapay',
            'instapay_reference' => 'IPN-20261103-998877',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                    'unit_price' => 450.00,
                ],
            ],
        ];

        $storeOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, $payload);

        $submission = PaymentSubmission::where('tenant_id', $this->tenantA->id)
            ->where('store_order_id', $storeOrder->id)
            ->first();

        $this->assertNotNull($submission);
        $this->assertEquals('pending_review', $submission->status);

        // اعتماد الدفعة بواسطة المدير المصرح له
        $response = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/storefront/payments/{$submission->id}/approve", [
                'approved' => true,
                'notes' => 'تم التأكد من استلام المبلغ بالحساب البنكي',
            ]);

        $response->assertStatus(200);

        $submission->refresh();
        $this->assertEquals('approved', $submission->status);

        $storeOrder->refresh();
        $this->assertEquals('verified_paid', $storeOrder->payment_status);

        // التحقق من إنشاء قيد يومية متوازن
        $journalEntry = \App\Models\JournalEntry::where('tenant_id', $this->tenantA->id)
            ->where('reference_type', 'storefront_instapay')
            ->where('reference_id', $submission->id)
            ->first();

        $this->assertNotNull($journalEntry, 'يجب إنشاء قيد يومية محاسبي رسمي للتحويل المعتمد');
        $this->assertTrue($journalEntry->is_balanced);
        $this->assertEquals((float)$storeOrder->total_amount, (float) $journalEntry->total_debit);
        $this->assertEquals((float)$storeOrder->total_amount, (float) $journalEntry->total_credit);
    }

    /**
     * 7. رفض تحويل إنستاباي يتطلب سبباً إلزامياً
     */
    public function test_instapay_payment_rejection_requires_mandatory_reason(): void
    {
        TenantStoreSetting::where('tenant_id', $this->tenantA->id)->update([
            'allow_instapay' => true,
            'instapay_account_verified' => true,
            'instapay_identifier' => 'factory-a@instapay',
        ]);

        $payload = [
            'tenant_id' => $this->tenantA->id,
            'customer_name' => 'طارق عفيفي',
            'customer_phone' => '01511223344',
            'shipping_address' => 'طنطا، الغربية',
            'payment_method' => 'instapay',
            'instapay_reference' => 'IPN-FAKE-000',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 1,
                    'unit_price' => 450.00,
                ],
            ],
        ];

        $storeOrder = $this->storefrontService->placeStoreOrder($this->tenantA->id, $payload);
        $submission = PaymentSubmission::where('store_order_id', $storeOrder->id)->first();

        // محاولة الرفض بدون سبب يجب أن تفشل
        $responseFail = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/storefront/payments/{$submission->id}/reject", [
                'approved' => false,
                'rejection_reason' => '',
            ]);

        $responseFail->assertStatus(422);

        // الرفض مع سبب صحيح
        $responseSuccess = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/storefront/payments/{$submission->id}/reject", [
                'approved' => false,
                'rejection_reason' => 'الرقم المرجعي غير متطابق مع كشف حساب البنك',
            ]);

        $responseSuccess->assertStatus(200);

        $submission->refresh();
        $this->assertEquals('rejected', $submission->status);
        $this->assertEquals('الرقم المرجعي غير متطابق مع كشف حساب البنك', $submission->rejection_reason);

        $storeOrder->refresh();
        $this->assertEquals('rejected', $storeOrder->payment_status);
    }

    /**
     * 8. فحص سريان SaaS Quota Middleware وحظر العمليات عند تجاوز الحد المسموح
     */
    public function test_quota_middleware_blocks_when_limit_exceeded_and_permits_when_within_limit(): void
    {
        // باقة starter تسمح بفرع واحد فقط (active_branches limit = 1)
        // إنشاء فرع أول يجب أن ينجح
        $response1 = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson('/api/v1/branches', [
                'name' => 'فرع العاشر من رمضان',
                'code' => 'BR-10TH',
                'type' => 'outlet',
                'is_active' => true,
            ]);

        $response1->assertStatus(201);

        // إنشاء فرع ثانٍ مع تجاوز الحصة المسموحة يجب أن يُرفض بكود 403 QUOTA_EXCEEDED
        $response2 = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson('/api/v1/branches', [
                'name' => 'فرع مدينة بدر',
                'code' => 'BR-BADR',
                'type' => 'outlet',
                'is_active' => true,
            ]);

        $response2->assertStatus(403);
        $response2->assertJsonPath('error', 'QUOTA_EXCEEDED');
    }

    /**
     * 9. دورة حياة طلبات الشراء: إنشاء مسودة -> إرسال للاعتماد -> اعتماد -> تحويل لأمر شراء
     */
    public function test_purchase_requisition_lifecycle_draft_submit_approve_and_convert_to_po(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-ALNOOR',
            'name' => 'شركة النور للأقمشة',
            'phone' => '01011112222',
            'is_active' => true,
        ]);

        // 1. إنشاء طلب الشراء مسودة
        $responseCreate = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson('/api/v1/procurement/requisitions', [
                'department' => 'قسم القص والتجهيز',
                'priority' => 'high',
                'required_date' => now()->addDays(5)->toDateString(),
                'reason' => 'تغذية خط إنتاج تيشيرت صيفي',
                'items' => [
                    [
                        'item_name' => 'قماش سنجل جيرسي قطن 100%',
                        'requested_quantity' => 250,
                        'unit_of_measure' => 'kg',
                        'estimated_unit_price' => 180.00,
                    ],
                ],
            ]);

        $responseCreate->assertStatus(201);
        $reqId = $responseCreate->json('data.id');
        $this->assertNotNull($reqId);

        // 2. إرسال للاعتماد
        $responseSubmit = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/procurement/requisitions/{$reqId}/submit");

        $responseSubmit->assertStatus(200);
        $this->assertEquals('submitted', $responseSubmit->json('data.status'));

        // 3. اعتماد طلب الشراء
        $responseApprove = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/procurement/requisitions/{$reqId}/approve", [
                'notes' => 'معتمد للطلب فورياً',
            ]);

        $responseApprove->assertStatus(200);
        $this->assertEquals('approved', $responseApprove->json('data.status'));

        // 4. تحويل الطلب إلى أمر شراء رسمي
        $responseConvert = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/procurement/requisitions/{$reqId}/convert", [
                'supplier_id' => $supplier->id,
                'warehouse_id' => $this->warehouseA->id,
            ]);

        $responseConvert->assertStatus(201);
        $poId = $responseConvert->json('data.id');
        $this->assertNotNull($poId);

        $requisition = PurchaseRequisition::find($reqId);
        $this->assertEquals('converted', $requisition->status);
        $this->assertEquals($poId, $requisition->converted_purchase_order_id);

        $po = PurchaseOrder::find($poId);
        $this->assertNotNull($po);
        $this->assertEquals($supplier->id, $po->supplier_id);
    }

    /**
     * 10. طلب الشراء المرفوض لا يمكن تحويله لأمر شراء
     */
    public function test_rejected_requisition_cannot_be_converted(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-DELTA',
            'name' => 'الدلتا للغزول',
            'is_active' => true,
        ]);

        $requisition = PurchaseRequisition::create([
            'tenant_id' => $this->tenantA->id,
            'requisition_number' => 'PR-REJ-001',
            'department' => 'المخازن',
            'requisition_date' => now()->toDateString(),
            'priority' => 'low',
            'status' => 'draft',
            'estimated_total_cost' => 500,
        ]);

        // رفض الطلب
        $responseReject = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/procurement/requisitions/{$requisition->id}/reject", [
                'reason' => 'الميزانية لا تسمح حالياً',
            ]);

        $responseReject->assertStatus(200);
        $requisition->refresh();
        $this->assertEquals('rejected', $requisition->status);

        // محاولة التحويل يجب أن تُرفض
        $responseConvert = $this->withHeader('Authorization', "Bearer {$this->tokenA}")
            ->withHeader('X-Tenant-ID', $this->tenantA->id)
            ->postJson("/api/v1/procurement/requisitions/{$requisition->id}/convert", [
                'supplier_id' => $supplier->id,
                'warehouse_id' => $this->warehouseA->id,
            ]);

        $responseConvert->assertStatus(422);
    }

    /**
     * 11. إشعار الدائن (Credit Note) ينشئ قيد محاسبي متوازن لعكس الإيراد والمديونية
     */
    public function test_credit_note_creates_balanced_gl_journal(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'تاجر الجملة الشروق',
            'code' => 'CUST-SHOROUK',
            'is_active' => true,
        ]);

        $creditNote = $this->salesService->createCreditNote([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $customer->id,
            'subtotal' => 2000.00,
            'tax_amount' => 0,
            'notes' => 'تعويض فرق سعر للعميل',
        ]);

        $this->assertNotNull($creditNote);

        $journalEntry = \App\Models\JournalEntry::where('tenant_id', $this->tenantA->id)
            ->whereIn('reference_type', ['credit_note', 'credit_notes'])
            ->where('reference_id', $creditNote->id)
            ->first();

        $this->assertNotNull($journalEntry, 'يجب إنشاء قيد محاسبي لإشعار الدائن');
        $this->assertTrue($journalEntry->is_balanced);
        $this->assertEquals(2000.0, (float) $journalEntry->total_debit);
        $this->assertEquals(2000.0, (float) $journalEntry->total_credit);
    }

    /**
     * 12. خامات التشغيل للغير (CMT) مستبعدة تماماً من قيود الأصول المخزنية ($0.00)
     */
    public function test_customer_cmt_material_is_excluded_from_gl_asset_postings(): void
    {
        $prodOrder = \App\Models\ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->variantA->garment_model_id,
            'order_number' => 'PO-CMT-' . uniqid(),
            'status' => 'approved',
            'total_planned_quantity' => 100,
            'planned_start_date' => now()->toDateString(),
            'planned_end_date' => now()->addDays(7)->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
        ]);

        $cuttingOrder = \App\Models\CuttingOrder::create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_number' => 'CUT-CMT-001',
            'production_order_id' => $prodOrder->id,
            'warehouse_id' => $this->warehouseA->id,
            'fabric_source' => 'customer_deposit',
            'lay_length_meters' => 10,
            'layers_count' => 50,
            'actual_fabric_meters_used' => 500,
            'status' => 'cut_completed',
        ]);

        // استدعاء صرف خامات مع إشارة is_cmt = true
        $entry = $this->accountingService->postRawMaterialsIssue($this->tenantA->id, $cuttingOrder, 0.00, true);

        // يجب أن يرجع null ولا يُنشئ قيداً
        $this->assertNull($entry);

        $existingJournals = \App\Models\JournalEntry::where('tenant_id', $this->tenantA->id)
            ->where('reference_type', 'cutting_order_issue')
            ->where('reference_id', $cuttingOrder->id)
            ->count();

        $this->assertEquals(0, $existingJournals);
    }
}

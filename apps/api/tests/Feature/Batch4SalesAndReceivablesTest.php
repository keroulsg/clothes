<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\PaymentVoucher;
use App\Models\ProductVariant;
use App\Models\Quotation;
use App\Models\SalesDeliveryNote;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class Batch4SalesAndReceivablesTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected string $tokenA;
    protected string $tokenB;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItemA;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. إنشاء المستأجر A والمستخدم A
        $this->tenantA = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع النور للملابس الجاهزة - A',
            'code' => 'ALNOOR-SALES-' . uniqid(),
            'subdomain' => 'alnoor-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
            'settings' => ['tax' => ['enabled' => true, 'rate' => 14.0]],
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير المبيعات A',
            'email' => 'sales_a_' . uniqid() . '@alnoor.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenA = $this->userA->createToken('test')->plainTextToken;

        // 2. إنشاء المستأجر B ومستخدمه للعزل
        $this->tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع الدلتا للملابس - B',
            'code' => 'DELTA-SALES-' . uniqid(),
            'subdomain' => 'delta-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
            'settings' => ['tax' => ['enabled' => false, 'rate' => 0.0]],
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مسؤول B',
            'email' => 'sales_b_' . uniqid() . '@delta.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenB = $this->userB->createToken('test')->plainTextToken;

        // شجرة الحسابات الأساسية لـ Tenant A
        ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1010',
            'name' => 'الخزينة الرئيسية',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 100000.0,
            'is_active' => true,
        ]);
        ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1020',
            'name' => 'البنك الأهلي',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 200000.0,
            'is_active' => true,
        ]);
        ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1110',
            'name' => 'العملاء والمدينون',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 0.0,
            'is_active' => true,
        ]);
        ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '4010',
            'name' => 'إيرادات المبيعات',
            'type' => 'revenue',
            'category' => 'operating_revenue',
            'current_balance' => 0.0,
            'is_active' => true,
        ]);

        // مستودع وفرع لـ Tenant A
        $branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'الفرع الرئيسي',
            'code' => 'BR-A-' . uniqid(),
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $branchA->id,
            'name' => 'مستودع المنتج التام A',
            'code' => 'WH-FG-' . uniqid(),
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        // موديل ومتغير لـ Tenant A
        $modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-POLO-' . uniqid(),
            'name' => 'تيشيرت بولو ولادي صيفي',
            'category' => 'polo-shirts',
            'is_active' => true,
        ]);

        $sizeL = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
            'code' => 'SZ-L-' . uniqid(),
        ]);

        $colorBlue = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أزرق كحلي',
            'code' => 'COL-NAVY-' . uniqid(),
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $modelA->id,
            'size_id' => $sizeL->id,
            'color_id' => $colorBlue->id,
            'sku' => 'SKU-POLO-NAVY-L-' . uniqid(),
            'barcode' => '6221000' . rand(100000, 999999),
            'wholesale_price' => 150.0,
            'retail_price' => 220.0,
            'is_active' => true,
        ]);

        $this->inventoryItemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'code' => 'INV-POLO-' . uniqid(),
            'name' => 'تيشيرت بولو L أزرق',
            'item_type' => 'finished_goods',
            'unit_of_measure' => 'piece',
            'current_balance' => 500.0,
            'average_cost' => 85.0,
            'is_customer_owned' => false,
            'barcode' => $this->variantA->barcode,
        ]);
    }

    protected function authA()
    {
        $this->app['auth']->forgetGuards();
        return $this->withHeader('Authorization', "Bearer {$this->tokenA}");
    }

    protected function authB()
    {
        $this->app['auth']->forgetGuards();
        return $this->withHeader('Authorization', "Bearer {$this->tokenB}");
    }

    /**
     * 1. إدارة العملاء، التحقق من تفرد الكود، والرقم الضريبي، وعزل المستأجرين
     */
    public function test_sales_order_listing_and_creation_are_restricted_to_assigned_branches(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $order = app(\App\Services\SalesService::class)->createSalesOrder([
            'customer_name' => 'عميل اختبار الفرع',
            'warehouse_id' => $this->warehouseA->id,
            'items' => [[
                'variant_id' => $this->variantA->id,
                'ordered_quantity' => 1,
                'unit_price' => 100,
            ]],
        ]);

        $staff = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'موظف مبيعات غير معيّن',
            'email' => 'sales-unassigned-' . uniqid() . '@alnoor.com',
            'password' => bcrypt('password123'),
            'role' => 'sales_manager',
            'is_active' => true,
        ]);

        $unassignedList = $this->actingAs($staff)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->getJson('/api/v1/sales/orders');

        $unassignedList->assertOk()->assertJsonCount(0, 'data');

        $staff->branches()->sync([$this->warehouseA->branch_id]);
        $assignedList = $this->actingAs($staff)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->getJson('/api/v1/sales/orders');

        $assignedList->assertOk()->assertJsonCount(1, 'data');

        $deniedCreate = $this->actingAs($staff)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/sales/orders', [
                'customer_name' => 'محاولة فرع غير معيّن',
                'warehouse_id' => $this->warehouseB->id,
                'items' => [[
                    'variant_id' => $this->variantA->id,
                    'ordered_quantity' => 1,
                    'unit_price' => 100,
                ]],
            ]);

        $deniedCreate->assertStatus(403);
    }

    public function test_customer_management_crud_and_duplicate_prevention_and_tenancy(): void
    {
        // إنشاء عميل شركة مع كافة البيانات التجارية
        $resp = $this->authA()->postJson('/api/v1/customers', [
            'code' => 'CUST-001',
            'name' => 'مؤسسة الأمل التجارية',
            'classification' => 'company',
            'company_name' => 'شركة الأمل للتوزيع المحدودة',
            'contact_person' => 'أحمد محمود',
            'phone' => '01012345678',
            'email' => 'alamal@example.com',
            'tax_id' => '123-456-789',
            'commercial_registry' => 'CR-998877',
            'credit_limit' => 50000.0,
            'payment_terms' => '30 days',
            'opening_balance' => 5000.0,
            'address' => 'القاهرة - العبور',
            'billing_address' => 'مبنى 15 شارع التسعين',
            'delivery_address' => 'مخزن العبور الرئيسي',
            'status' => 'active',
        ]);

        $resp->assertStatus(201);
        $this->assertDatabaseHas('customers', [
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-001',
            'classification' => 'company',
            'credit_limit' => 50000.0,
        ]);

        // منع تكرار كود العميل لنفس المستأجر
        $dupCodeResp = $this->authA()->postJson('/api/v1/customers', [
            'code' => 'CUST-001',
            'name' => 'مؤسسة أخرى بنفس الكود',
        ]);
        $dupCodeResp->assertStatus(422);

        // منع تكرار الرقم الضريبي لنفس المستأجر
        $dupTaxResp = $this->authA()->postJson('/api/v1/customers', [
            'code' => 'CUST-002',
            'name' => 'شركة أخرى بنفس الضريبي',
            'tax_id' => '123-456-789',
        ]);
        $dupTaxResp->assertStatus(422);

        // نفس الكود مسموح به تماماً لمستأجر آخر (عزل الشركات)
        $respB = $this->authB()->postJson('/api/v1/customers', [
            'code' => 'CUST-001',
            'name' => 'عميل مصنع B بنفس الكود',
            'tax_id' => '123-456-789',
        ]);
        $respB->assertStatus(201);
        $this->assertDatabaseHas('customers', [
            'tenant_id' => $this->tenantB->id,
            'code' => 'CUST-001',
        ]);
    }

    /**
     * 2. عروض الأسعار مع سياسة الضرائب الديناميكية والتحويل لأمر بيع رسمي دون تكرار
     */
    public function test_quotation_creation_with_tenant_tax_and_conversion_to_sales_order(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-QT-' . uniqid(),
            'name' => 'محلات الشروق للملابس',
            'is_active' => true,
        ]);

        // إنشاء عرض سعر (الضريبة 14% مأخوذة ديناميكياً من إعدادات المستأجر A)
        $qResp = $this->authA()->postJson('/api/v1/sales/quotations', [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'valid_until' => now()->addDays(15)->toDateString(),
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'description' => 'تيشيرت بولو صيفي مقاس L',
                    'quantity' => 100,
                    'unit_price' => 150.0,
                ]
            ],
            'notes' => 'عرض سعر تجاري شامل التوصيل',
        ]);

        $qResp->assertStatus(201);
        $quotationId = $qResp->json('quotation.id');
        $this->assertEquals(15000.0, (float) $qResp->json('quotation.subtotal'));
        $this->assertEquals(2100.0, (float) $qResp->json('quotation.tax_amount')); // 14% of 15000
        $this->assertEquals(17100.0, (float) $qResp->json('quotation.total_amount'));

        // تحويل عرض السعر إلى أمر بيع رسمي
        $convertResp = $this->authA()->postJson("/api/v1/sales/quotations/{$quotationId}/convert");
        $convertResp->assertStatus(201);
        $salesOrder = $convertResp->json('sales_order');

        $this->assertNotNull($salesOrder['id']);
        $this->assertEquals($customer->id, $salesOrder['customer_id']);
        $this->assertEquals(17100.0, (float) $salesOrder['total_amount']);

        // التحقق من حالة عرض السعر وتاريخ التحويل والربط بأمر البيع
        $updatedQuotation = Quotation::find($quotationId);
        $this->assertEquals('converted', $updatedQuotation->status);
        $this->assertEquals($salesOrder['id'], $updatedQuotation->converted_sales_order_id);
        $this->assertNotNull($updatedQuotation->converted_at);

        // محاولة إعادة تحويل عرض السعر نفسه يجب أن تفشل لمنع التكرار
        $reConvertResp = $this->authA()->postJson("/api/v1/sales/quotations/{$quotationId}/convert");
        $reConvertResp->assertStatus(422);
    }

    /**
     * 3. حجز المخزون لأمر البيع وإلغاء أمر البيع مع فك حجز المخزون وسجل التدقيق
     */
    public function test_sales_order_stock_reservation_and_cancellation(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-SO-' . uniqid(),
            'name' => 'شركة النيل للتوكيلات',
            'is_active' => true,
        ]);

        // إنشاء أمر بيع بـ 50 قطعة
        $soResp = $this->authA()->postJson('/api/v1/sales/orders', [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'ordered_quantity' => 50,
                    'unit_price' => 150.0,
                    'tax_rate' => 0.0,
                ]
            ],
        ]);

        $soResp->assertStatus(201);
        $orderId = $soResp->json('sales_order.id');

        // حجز المخزون لأمر البيع
        $reserveResp = $this->authA()->postJson("/api/v1/sales/orders/{$orderId}/reserve");
        $reserveResp->assertStatus(200);

        $this->assertDatabaseHas('sales_order_items', [
            'sales_order_id' => $orderId,
            'reserved_quantity' => 50.0,
        ]);

        // إلغاء أمر البيع
        $cancelResp = $this->authA()->postJson("/api/v1/sales/orders/{$orderId}/cancel", [
            'reason' => 'إلغاء الطلب بناء على رغبة العميل لظروف التخزين',
        ]);

        $cancelResp->assertStatus(200);
        $cancelledOrder = $cancelResp->json('sales_order');

        $this->assertEquals('cancelled', $cancelledOrder['status']);
        $this->assertEquals('إلغاء الطلب بناء على رغبة العميل لظروف التخزين', $cancelledOrder['cancellation_reason']);

        // التحقق من فك الحجز بالكامل
        $this->assertDatabaseHas('sales_order_items', [
            'sales_order_id' => $orderId,
            'reserved_quantity' => 0.0,
        ]);
    }

    /**
     * 4. التسليم الجزئي لأمر البيع، صرف المخزون، وإلغاء إذن التسليم واستعادة المخزون
     */
    public function test_sales_order_partial_delivery_and_inventory_ledger_deduction(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-DELIV-' . uniqid(),
            'name' => 'سلسلة محلات كيدز كلوب',
            'is_active' => true,
        ]);

        // رصيد البداية
        $initialBalance = (float) $this->inventoryItemA->current_balance; // 500

        // أمر بيع بـ 100 قطعة
        $soResp = $this->authA()->postJson('/api/v1/sales/orders', [
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'ordered_quantity' => 100,
                    'unit_price' => 150.0,
                ]
            ],
        ]);

        $soResp->assertStatus(201);
        $orderId = $soResp->json('sales_order.id');
        $orderItemId = $soResp->json('sales_order.items.0.id');

        // تسليم جزئي أول بـ 40 قطعة
        $delivResp1 = $this->authA()->postJson("/api/v1/sales/orders/{$orderId}/deliver", [
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'sales_order_item_id' => $orderItemId,
                    'variant_id' => $this->variantA->id,
                    'quantity' => 40,
                ]
            ],
            'shipping_carrier' => 'شركة أرامكس للشحن',
            'recipient_name' => 'أحمد إبراهيم',
        ]);

        $delivResp1->assertStatus(201);
        $deliveryNoteId1 = $delivResp1->json('delivery_note.id');

        // الرصيد المخزني أصبح 500 - 40 = 460
        $this->inventoryItemA->refresh();
        $this->assertEquals($initialBalance - 40, (float) $this->inventoryItemA->current_balance);

        // أمر البيع أصبح Partially Fulfilled
        $this->assertDatabaseHas('sales_orders', [
            'id' => $orderId,
            'status' => 'partially_fulfilled',
        ]);

        // إلغاء إذن التسليم 1 واستعادة رصيد المخزون
        $cancelDelivResp = $this->authA()->postJson("/api/v1/sales/delivery-notes/{$deliveryNoteId1}/cancel", [
            'reason' => 'تعذر التسليم لخطأ في عنوان العميل',
        ]);

        $cancelDelivResp->assertStatus(200);

        // التحقق من استرجاع المخزون لـ 500 مرة أخرى
        $this->inventoryItemA->refresh();
        $this->assertEquals($initialBalance, (float) $this->inventoryItemA->current_balance);
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenantA->id,
            'transaction_type' => 'sales_delivery_reversal',
            'quantity' => 40.0,
            'direction' => 'IN',
        ]);
    }

    /**
     * 5. إصدار فواتير المبيعات، حماية الفواتير الصادرة والمسددة من التعديل والإلغاء
     */
    public function test_sales_invoice_issuance_and_cancellation_safeguards(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-INV-' . uniqid(),
            'name' => 'مكتب الدلتا للتوزيع',
            'is_active' => true,
        ]);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-TEST-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'total_amount' => 10000.0,
            'paid_amount' => 2000.0, // مسددة جزئياً
            'balance_due' => 8000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        // محاولة إلغاء فاتورة مسددة جزئياً يجب أن تُرفض قطعاً
        $failCancel = $this->authA()->postJson("/api/v1/sales/invoices/{$invoice->id}/cancel", [
            'reason' => 'إلغاء تجريبي',
        ]);
        $failCancel->assertStatus(422);

        // فاتورة غير مسددة بالكامل
        $unpaidInvoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-UNPAID-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'total_amount' => 5000.0,
            'paid_amount' => 0.0,
            'balance_due' => 5000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        $successCancel = $this->authA()->postJson("/api/v1/sales/invoices/{$unpaidInvoice->id}/cancel", [
            'reason' => 'خطأ في بيانات العميل وتم إعادة إصدارها',
        ]);
        $successCancel->assertStatus(200);

        $unpaidInvoice->refresh();
        $this->assertEquals('cancelled', $unpaidInvoice->status);
        $this->assertEquals('خطأ في بيانات العميل وتم إعادة إصدارها', $unpaidInvoice->cancellation_reason);
    }

    /**
     * 6. تسجيل سند قبض مالي للعميل، التخصيص التلقائي على الفواتير، وعكس السند
     */
    public function test_customer_payment_receipt_allocation_fifo_and_reversal(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-PAY-' . uniqid(),
            'name' => 'شركة الفرسان للتجارة',
            'is_active' => true,
        ]);

        // فاتورتان مفتوحتان
        $inv1 = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-1-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'status' => 'issued',
            'total_amount' => 3000.0,
            'paid_amount' => 0.0,
            'balance_due' => 3000.0,
            'invoice_date' => now()->subDays(10)->toDateString(),
        ]);

        $inv2 = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-2-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'status' => 'issued',
            'total_amount' => 4000.0,
            'paid_amount' => 0.0,
            'balance_due' => 4000.0,
            'invoice_date' => now()->subDays(5)->toDateString(),
        ]);

        // تسجيل سند قبض بقيمة 5000 جنيه (يغطي الفاتورة 1 بـ 3000 ويسدد جزئياً من الفاتورة 2 بـ 2000)
        $payResp = $this->authA()->postJson('/api/v1/sales/payments', [
            'customer_id' => $customer->id,
            'amount' => 5000.0,
            'payment_method' => 'bank_transfer',
            'voucher_date' => now()->toDateString(),
            'notes' => 'تحويل بنكي سداد حساب الفواتير',
        ]);

        $payResp->assertStatus(201);
        $voucherId = $payResp->json('payment_voucher.id');

        $inv1->refresh();
        $inv2->refresh();

        $this->assertEquals('paid', $inv1->status);
        $this->assertEquals(3000.0, (float) $inv1->paid_amount);
        $this->assertEquals(0.0, (float) $inv1->balance_due);

        $this->assertEquals('partially_paid', $inv2->status);
        $this->assertEquals(2000.0, (float) $inv2->paid_amount);
        $this->assertEquals(2000.0, (float) $inv2->balance_due);

        // عكس سند القبض لخطأ في التحويل
        $revResp = $this->authA()->postJson("/api/v1/sales/payments/{$voucherId}/reverse", [
            'reason' => 'تم ارتداد الشيك من البنك',
        ]);

        $revResp->assertStatus(200);

        // التحقق من إعادة فتح أرصدة الفواتير
        $inv1->refresh();
        $inv2->refresh();

        $this->assertEquals('issued', $inv1->status);
        $this->assertEquals(3000.0, (float) $inv1->balance_due);

        $this->assertEquals('issued', $inv2->status);
        $this->assertEquals(4000.0, (float) $inv2->balance_due);
    }

    /**
     * 7. مرتجعات المبيعات، توليد الإشعار الدائن Credit Note، ومنع تجاوز الكمية المباعة
     */
    public function test_sales_returns_generate_credit_note_and_prevent_excess_returns(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-RET-' . uniqid(),
            'name' => 'معارض المدينة المنورة',
            'is_active' => true,
        ]);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-RET-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'status' => 'issued',
            'total_amount' => 3000.0,
            'paid_amount' => 0.0,
            'balance_due' => 3000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        $invItem = $invoice->items()->create([
            'tenant_id' => $this->tenantA->id,
            'variant_id' => $this->variantA->id,
            'description' => 'بند الفاتورة',
            'quantity' => 20,
            'unit_price' => 150.0,
            'total_price' => 3000.0,
        ]);

        // محاولة إرجاع 25 قطعة (أكبر من الكمية المباعة 20) يجب أن تُرفض بـ 422
        $excessResp = $this->authA()->postJson('/api/v1/sales/returns', [
            'customer_id' => $customer->id,
            'sales_invoice_id' => $invoice->id,
            'warehouse_id' => $this->warehouseA->id,
            'reason' => 'إرجاع زائد عن الفاتورة',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 25,
                    'unit_price' => 150.0,
                ]
            ],
        ]);
        $excessResp->assertStatus(422);

        // إرجاع كمية صحيحة 10 قطع
        $validResp = $this->authA()->postJson('/api/v1/sales/returns', [
            'customer_id' => $customer->id,
            'sales_invoice_id' => $invoice->id,
            'warehouse_id' => $this->warehouseA->id,
            'reason' => 'مقاسات غير مطابقة لطلب الزبون',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 10,
                    'unit_price' => 150.0,
                    'condition' => 'good',
                    'action_taken' => 'restock',
                ]
            ],
        ]);

        $validResp->assertStatus(201);
        $returnId = $validResp->json('sales_return.id');

        // التحقق من إنشاء إشعار دائن رسمي Credit Note مرتبط بالمرتجع
        $this->assertDatabaseHas('credit_notes', [
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $customer->id,
            'sales_return_id' => $returnId,
            'total_amount' => 1500.0,
        ]);
    }

    /**
     * 8. نقاط البيع POS: فحص الباركود، معالجة المبيعات السريعة، وصرف المخزون
     */
    public function test_pos_barcode_lookup_and_checkout(): void
    {
        // فحص باركود صحيح
        $barcodeResp = $this->authA()->getJson("/api/v1/sales/barcode/{$this->variantA->barcode}");
        $barcodeResp->assertStatus(200);
        $this->assertEquals($this->variantA->id, $barcodeResp->json('item.id'));
        $this->assertEquals(220.0, (float) $barcodeResp->json('item.price'));

        // فحص باركود مجهول
        $unknownResp = $this->authA()->getJson("/api/v1/sales/barcode/9999999999999");
        $unknownResp->assertStatus(404);

        // إتمام عملية بيع POS
        $initialBalance = (float) $this->inventoryItemA->current_balance;

        $posSaleResp = $this->authA()->postJson('/api/v1/pos/sale', [
            'customer_name' => 'عميل نقدي - معرض المصنع',
            'payment_method' => 'cash',
            'paid_amount' => 440.0,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2,
                    'unit_price' => 220.0,
                    'tax_rate' => 0.0,
                ]
            ],
        ]);

        $posSaleResp->assertStatus(201);
        $this->assertEquals(440.0, (float) $posSaleResp->json('invoice.total_amount'));

        // تم صرف قطعتين من المخزن
        $this->inventoryItemA->refresh();
        $this->assertEquals($initialBalance - 2, (float) $this->inventoryItemA->current_balance);
    }

    /**
     * 9. كشف حساب العميل التحليلي وتقرير أعمار الديون (Aging Report)
     */
    public function test_customer_statement_and_receivables_aging(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-AGING-' . uniqid(),
            'name' => 'مجموعة الشايع التجارية',
            'credit_limit' => 20000.0,
            'is_active' => true,
        ]);

        // فاتورة مستحقة منذ 15 يوماً (Current / 0-30 days)
        SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-CURR-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'status' => 'issued',
            'total_amount' => 5000.0,
            'paid_amount' => 0.0,
            'balance_due' => 5000.0,
            'invoice_date' => now()->subDays(15)->toDateString(),
        ]);

        // فاتورة متأخرة منذ 45 يوماً (31-60 days)
        SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-OLD-' . uniqid(),
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'status' => 'issued',
            'total_amount' => 3000.0,
            'paid_amount' => 0.0,
            'balance_due' => 3000.0,
            'invoice_date' => now()->subDays(45)->toDateString(),
        ]);

        // تقرير كشف الحساب
        $stmtResp = $this->authA()->getJson("/api/v1/customers/{$customer->id}/statement");
        $stmtResp->assertStatus(200);
        $this->assertEquals(8000.0, (float) $stmtResp->json('summary.total_invoiced'));
        $this->assertEquals(8000.0, (float) $stmtResp->json('summary.closing_balance'));

        // تقرير أعمار الديون
        $agingResp = $this->authA()->getJson("/api/v1/customers/{$customer->id}/aging");
        $agingResp->assertStatus(200);

        $this->assertEquals(5000.0, (float) $agingResp->json('summary.current'));
        $this->assertEquals(3000.0, (float) $agingResp->json('summary.days_31_60'));
        $this->assertEquals(0.0, (float) $agingResp->json('summary.days_61_90'));
        $this->assertEquals(0.0, (float) $agingResp->json('summary.over_90'));
        $this->assertEquals(8000.0, (float) $agingResp->json('summary.total_due'));
        $this->assertEquals(12000.0, (float) $agingResp->json('summary.credit_available')); // 20000 - 8000
    }
}

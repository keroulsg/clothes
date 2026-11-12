<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JournalEntry;
use App\Models\PaymentVoucher;
use App\Models\ProductVariant;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesReturn;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\SalesService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesReturnAndPosReceiptPhase07BTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $ownerA;
    protected User $accountantA;
    protected User $salesRepA;
    protected User $workerA;
    protected User $ownerB;
    protected User $platformAdmin;
    protected Warehouse $warehouseA;
    protected Customer $customerA;
    protected GarmentModel $modelA;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItemA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->platformAdmin = User::create([
            'name' => 'مشرف المنصة العام',
            'email' => 'superadmin@garmentos.test',
            'role' => 'platform_admin',
            'tenant_id' => null,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-RET-01',
            'name' => 'مصنع النيل للملابس الجاهزة',
            'subdomain' => 'nile-ret',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-RET-02',
            'name' => 'مصنع الدلتا المنافس',
            'subdomain' => 'delta-ret',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);

        $this->ownerA = User::create([
            'name' => 'مالك النيل',
            'email' => 'owner@nile-ret.test',
            'role' => 'company_owner',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->accountantA = User::create([
            'name' => 'محاسب النيل',
            'email' => 'acct@nile-ret.test',
            'role' => 'financial_accountant',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->salesRepA = User::create([
            'name' => 'مسؤول المبيعات',
            'email' => 'sales@nile-ret.test',
            'role' => 'sales_rep',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->workerA = User::create([
            'name' => 'عامل تشغيل',
            'email' => 'worker@nile-ret.test',
            'role' => 'worker',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'name' => 'مالك الدلتا',
            'email' => 'owner@delta-ret.test',
            'role' => 'company_owner',
            'tenant_id' => $this->tenantB->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-RET-01',
            'name' => 'مخزن المنتجات التامة الرئيسي',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $this->customerA = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-01',
            'name' => 'محلات السلام التجارية',
            'phone' => '+201009876543',
            'customer_type' => 'wholesale',
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $color = \App\Models\Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy',
            'hex_code' => '#000080',
        ]);

        $size = \App\Models\Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'L',
            'code' => 'L',
        ]);

        $this->modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-POLO-RET',
            'name' => 'تيشيرت بولو رجالي فاخر',
            'category' => 'casualwear',
            'target_cost' => 100.0,
            'wholesale_price' => 150.0,
            'retail_price' => 220.0,
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'color_id' => $color->id,
            'size_id' => $size->id,
            'sku' => 'SKU-POLO-L-NAVY',
            'barcode' => '6221000998877',
            'wholesale_price' => 150.0,
            'retail_price' => 220.0,
        ]);

        $this->inventoryItemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'code' => 'INV-POLO-L-NAVY',
            'name' => 'تيشيرت بولو رجالي فاخر (L - Navy)',
            'item_type' => 'finished_goods',
            'unit_of_measure' => 'piece',
            'current_balance' => 100.0,
            'reserved_balance' => 0.0,
            'average_cost' => 100.0,
        ]);

        // تهيئة شجرة الحسابات للمصنع
        $accountingService = app(AccountingService::class);
        $accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
    }

    /**
     * 1. نجاح مرتجع مبيعات مصرح به مع خصم الفاتورة وإعادة المخزون السليم
     */
    public function test_successful_authorized_sales_return_with_restocking(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // إنشاء فاتورة مبيعات بها 10 قطع بسعر 200
        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-001',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 2000.0,
            'tax_amount' => 0.0,
            'total_amount' => 2000.0,
            'paid_amount' => 0.0,
            'balance_due' => 2000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'inventory_item_id' => $this->inventoryItemA->id,
            'description' => 'تيشيرت بولو رجالي L',
            'quantity' => 10.0,
            'unit_price' => 200.0,
            'total_price' => 2000.0,
        ]);

        // إرجاع 3 قطع بحالة سليمة (good) وإجراء إعادة للمخزن (restock)
        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'طلب العميل استبدال مقاس',
            'is_restocked' => true,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 3.0,
                    'unit_price' => 200.0,
                    'condition' => 'good',
                    'action_taken' => 'restock',
                ],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJsonPath('sales_return.refund_status', 'credited');
        $res->assertJsonPath('sales_return.total_amount', '600.0000');

        // تحقق من رصيد الفاتورة: 2000 - 600 = 1400
        $this->assertEquals(1400.0, (float) $invoice->fresh()->balance_due);

        // تحقق من رصيد المخزن: 100 + 3 = 103
        $this->assertEquals(103.0, (float) $this->inventoryItemA->fresh()->current_balance);

        // تحقق من تسجيل حركة المخزن برقم إشعار المرتجع
        $this->assertTrue(
            InventoryTransaction::where('tenant_id', $this->tenantA->id)
                ->where('reference_type', 'sales_returns')
                ->where('transaction_type', 'sales_return')
                ->where('quantity', 3.0)
                ->where('direction', 'IN')
                ->exists()
        );

        // تحقق من تسجيل قيد اليومية المتوازن (4010 مدين 600 = 1110 دائن 600)
        $this->assertTrue(
            JournalEntry::where('tenant_id', $this->tenantA->id)
                ->where('reference_type', 'sales_returns')
                ->where('total_debit', 600.0)
                ->where('total_credit', 600.0)
                ->exists()
        );

        // تحقق من تسجيل سجل الرقابة
        $this->assertTrue(
            AuditLog::where('tenant_id', $this->tenantA->id)
                ->where('action', 'sales_return_created')
                ->exists()
        );
    }

    /**
     * 2. رفض المرتجع عند تجاوز الكمية المتبقية المسموح بإرجاعها
     */
    public function test_reject_return_exceeding_remaining_quantity(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-002',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
            'balance_due' => 1000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'تيشيرت بولو رجالي L',
            'quantity' => 5.0,
            'unit_price' => 200.0,
            'total_price' => 1000.0,
        ]);

        // محاولة إرجاع 6 قطع من أصل 5 -> يجب الرفض 400 أو 500
        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع مخالف',
            'is_restocked' => true,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 6.0,
                    'unit_price' => 200.0,
                ],
            ],
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('تتجاوز', $res->json('message'));
    }

    /**
     * 3. لا يمكن إرجاع كميات مكررة تتجاوز الإجمالي عبر محاولات متعددة
     */
    public function test_cumulative_returns_cannot_exceed_original_invoice(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-003',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 800.0,
            'total_amount' => 800.0,
            'balance_due' => 800.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'تيشيرت بولو رجالي L',
            'quantity' => 4.0,
            'unit_price' => 200.0,
            'total_price' => 800.0,
        ]);

        // المرتجع الأول: إرجاع قطعتين (نجاح)
        $res1 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع أول',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2.0,
                    'unit_price' => 200.0,
                ],
            ],
        ]);
        $res1->assertStatus(201);

        // المرتجع الثاني: محاولة إرجاع 3 قطع (المتبقي 2 فقط) -> يجب أن يفشل
        $res2 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع زائد',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 3.0,
                    'unit_price' => 200.0,
                ],
            ],
        ]);
        $res2->assertStatus(422);
        $this->assertStringContainsString('تتجاوز', $res2->json('message'));
    }

    /**
     * 4. عزل المستأجرين: محظور على مستأجر آخر الوصول إلى فواتير أو مرتجعات شركة أخرى
     */
    public function test_cross_tenant_invoice_access_is_rejected(): void
    {
        // إنشاء فاتورة للمستأجر A
        $invoiceA = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-NILE',
            'customer_name' => 'عميل النيل',
            'invoice_type' => 'standard',
            'status' => 'issued',
            'subtotal' => 500.0,
            'total_amount' => 500.0,
            'balance_due' => 500.0,
            'invoice_date' => now()->toDateString(),
        ]);

        // مالك المستأجر B يحاول قراءة الفاتورة أو إرجاعها
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $this->getJson("/api/v1/sales/invoices/{$invoiceA->id}")->assertStatus(404);

        $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoiceA->id,
            'reason' => 'محاولة اختراق',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0],
            ],
        ])->assertStatus(404);
    }

    /**
     * 5. حظر المستخدمين غير المصرح لهم (مثل العمال) من تسجيل مرتجعات المبيعات
     */
    public function test_unauthorized_worker_cannot_submit_sales_returns(): void
    {
        Sanctum::actingAs($this->workerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'reason' => 'مرتجع من عامل غير مخول',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0],
            ],
        ])->assertStatus(403);
    }

    /**
     * 6. البضاعة المعيبة (defective) لا تدخل الرصيد السليم القابل للبيع
     */
    public function test_defective_goods_do_not_inflate_sellable_stock(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $initialBalance = (float) $this->inventoryItemA->current_balance;

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'reason' => 'عيب صناعة في القماش',
            'is_restocked' => true,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 5.0,
                    'unit_price' => 200.0,
                    'condition' => 'defective',
                    'action_taken' => 'repair',
                ],
            ],
        ]);

        $res->assertStatus(201);

        // الرصيد السليم القابل للبيع لم يتغير (لم تتم إضافة المعيب للمخزن)
        $this->assertEquals($initialBalance, (float) $this->inventoryItemA->fresh()->current_balance);
    }

    /**
     * 7. استرجاع الفاتورة عبر showInvoice يحسب الكميات المتبقية آلياً
     */
    public function test_show_invoice_calculates_authoritative_remaining_quantities(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-CALC',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 2000.0,
            'total_amount' => 2000.0,
            'balance_due' => 2000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'تيشيرت بولو رجالي L',
            'quantity' => 10.0,
            'unit_price' => 200.0,
            'total_price' => 2000.0,
        ]);

        // إرجاع 4 قطع أولاً
        $salesService = app(SalesService::class);
        $salesService->createSalesReturn([
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع جزئي أول',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 4.0, 'unit_price' => 200.0],
            ],
        ]);

        // فحص الفاتورة عبر API
        $res = $this->getJson("/api/v1/sales/invoices/{$invoice->id}");
        $res->assertStatus(200);

        $itemData = $res->json('invoice.items.0');
        $this->assertEquals(10.0, (float) $itemData['quantity']);
        $this->assertEquals(4.0, (float) $itemData['returned_quantity']);
        $this->assertEquals(6.0, (float) $itemData['remaining_returnable_quantity']);
    }

    /**
     * 8. إيصال نقطة البيع (POS Receipt) يعتمد على بيانات مسجلة وموثقة في قاعدة البيانات
     */
    public function test_pos_sale_generates_persisted_receipt_and_stock_deduction(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $initialBalance = (float) $this->inventoryItemA->current_balance;

        $res = $this->postJson('/api/v1/pos/sale', [
            'customer_name' => 'عميل المعرض النقدي',
            'payment_method' => 'cash',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'quantity' => 2.0,
                    'unit_price' => 220.0,
                    'tax_rate' => 0.0,
                ],
            ],
        ]);

        $res->assertStatus(201);
        $res->assertJsonStructure([
            'message',
            'invoice' => [
                'id',
                'invoice_number',
                'customer_name',
                'invoice_type',
                'total_amount',
                'items',
            ],
        ]);

        $invoiceId = $res->json('invoice.id');
        $invoice = SalesInvoice::find($invoiceId);
        $this->assertNotNull($invoice);
        $this->assertEquals('pos_receipt', $invoice->invoice_type);
        $this->assertEquals(440.0, (float) $invoice->total_amount);

        // تم خصم المخزن فعلياً بمقدار قطعتين
        $this->assertEquals($initialBalance - 2.0, (float) $this->inventoryItemA->fresh()->current_balance);
    }

    /**
     * 9. ضمان ذرية المعاملة (Atomicity): أي فشل يلغي كل التغييرات دون بقاء سجلات جزئية
     */
    public function test_transaction_rollback_prevents_partial_records(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $initialReturnCount = SalesReturn::count();
        $initialTxCount = InventoryTransaction::count();

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-202610-ROLLBACK',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
            'balance_due' => 1000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'تيشيرت بولو رجالي L',
            'quantity' => 5.0,
            'unit_price' => 200.0,
            'total_price' => 1000.0,
        ]);

        // طلب يحتوي على صنف غير موجود في الفاتورة لإحداث استثناء بعد بدء المعاملة
        $fakeVariantId = '01a164b5-0000-0000-0000-000000000099';

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'اختبار التراجع الذري',
            'items' => [
                ['variant_id' => $fakeVariantId, 'quantity' => 1.0, 'unit_price' => 200.0],
            ],
        ]);

        $res->assertStatus(422);

        // التأكد من عدم إنشاء أي سجل مرتجع أو حركة مخزن جزئية
        $this->assertEquals($initialReturnCount, SalesReturn::count());
        $this->assertEquals($initialTxCount, InventoryTransaction::count());
        $this->assertEquals(1000.0, (float) $invoice->fresh()->balance_due);
    }

    /**
     * 10. الحماية ضد التلاعب بأسعار المرتجع من طرف العميل (Authoritative Server Pricing)
     */
    public function test_authoritative_server_pricing_prevents_client_price_tampering(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-PRICE-TAMPER',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 300.0,
            'total_amount' => 300.0,
            'balance_due' => 300.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'تيشيرت بولو 150ج للقطعة',
            'quantity' => 2.0,
            'unit_price' => 150.0,
            'total_price' => 300.0,
        ]);

        // يحاول العميل إرسال سعر مضخم 99999 بدلاً من 150
        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'محاولة احتيال بسعر مضخم',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 99999.0],
            ],
        ]);

        $res->assertStatus(201);
        $return = SalesReturn::where('sales_invoice_id', $invoice->id)->firstOrFail();

        // الخادم يجب أن يفرض السعر الأصلي 150 وليس 99999
        $this->assertEquals(150.0, (float) $return->total_amount);
        $this->assertEquals(150.0, (float) $return->items->first()->unit_price);
        $this->assertEquals(150.0, (float) $invoice->fresh()->balance_due);
    }

    /**
     * 11. الفاتورة المسددة عند إرجاعها بدون صرف تصدر إشعار دائن (credited)، وتصبح (refunded) فقط عند الصرف النقدي الفعلي
     */
    public function test_fully_paid_invoice_returns_mark_invoice_as_refunded(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-PAID-REFUND',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'pos_receipt',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 400.0,
            'total_amount' => 400.0,
            'paid_amount' => 400.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعتين مدفوعة كاش',
            'quantity' => 2.0,
            'unit_price' => 200.0,
            'total_price' => 400.0,
        ]);

        // 1. تسجيل إرجاع القطعتين بالكامل كإشعار دائن (Credit Note) دون صرف نقدي
        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'استرجاع كامل لمبيعات نقدية مع إشعار دائن',
            'is_restocked' => true,
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 2.0, 'unit_price' => 200.0, 'condition' => 'good', 'action_taken' => 'restock'],
            ],
        ]);

        $res->assertStatus(201);
        $returnId = $res->json('sales_return.id');
        $this->assertEquals('credited', $res->json('sales_return.refund_status'));

        // في مرحلة إشعار الدائن: الفاتورة credited وليست refunded لأن المال لم يخرج بعد
        $invCredited = $invoice->fresh();
        $this->assertEquals('credited', $invCredited->status);
        $this->assertEquals(0.0, (float) $invCredited->balance_due);
        $this->assertEquals(400.0, (float) $invCredited->paid_amount);

        // 2. محاولة مسؤول المبيعات صرف استرداد نقدي من الخزينة ترفض (403) لعدم الصلاحية المالية
        $salesRepRefund = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 400.0,
            'payment_method' => 'cash',
        ]);
        $salesRepRefund->assertStatus(403);

        // 3. المحاسب المالي المعتمد ينفذ الصرف النقدي الفعلي بنجاح (200)
        Sanctum::actingAs($this->accountantA);
        $cashAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $initialCash = (float) $cashAccount->current_balance;

        $refundRes = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 400.0,
            'payment_method' => 'cash',
        ]);

        $refundRes->assertStatus(200);
        $refundRes->assertJsonPath('sales_return.refund_status', 'refunded');

        // تحقق من حالة الفاتورة بعد الصرف الفعلي
        $invRefunded = $invoice->fresh();
        $this->assertEquals('refunded', $invRefunded->status);
        $this->assertEquals(0.0, (float) $invRefunded->balance_due);
        $this->assertEquals(0.0, (float) $invRefunded->paid_amount);

        // تحقق من خصم الخزينة وإنشاء سند الصرف
        $this->assertEquals($initialCash - 400.0, (float) $cashAccount->fresh()->current_balance);
        $this->assertTrue(
            \App\Models\PaymentVoucher::where('tenant_id', $this->tenantA->id)
                ->where('voucher_type', 'payment')
                ->where('amount', 400.0)
                ->exists()
        );
    }

    /**
     * 12. مصفوفة الصلاحيات الكاملة (Full RBAC Matrix for Sales Invoices and Returns)
     */
    public function test_full_role_authorization_matrix_for_sales_and_returns(): void
    {
        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-RBAC-MATRIX',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 500.0,
            'total_amount' => 500.0,
            'balance_due' => 500.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'صنف اختبار الصلاحيات',
            'quantity' => 5.0,
            'unit_price' => 100.0,
            'total_price' => 500.0,
        ]);

        // 1. زائر غير مسجل (Unauthenticated): مرفوض 401
        $this->getJson('/api/v1/sales/invoices')->assertStatus(401);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(401);
        $this->getJson('/api/v1/sales/returns')->assertStatus(401);
        $this->postJson('/api/v1/sales/returns', [])->assertStatus(401);

        // 2. عامل تشغيل (Worker): قراءة الفواتير 403، قراءة المرتجعات 403، تسجيل المرتجع 403
        Sanctum::actingAs($this->workerA);
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(403);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(403);
        $this->getJson('/api/v1/sales/returns')->assertStatus(403);
        $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'Worker unauthorized return',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 100.0]],
        ])->assertStatus(403);

        // 3. مدير إنتاج (Production Manager): مسموح له قراءة الفواتير، لكن مرفوض من إنشاء مرتجع مالي تجاري (403)
        $prodManager = User::create([
            'name' => 'مدير الإنتاج',
            'email' => 'pm@nile-ret.test',
            'role' => 'production_manager',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);
        Sanctum::actingAs($prodManager);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(200);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(200);
        $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'PM attempt return',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 100.0]],
        ])->assertStatus(403);

        // 4. مشرف المنصة العام (Platform Super Admin): محظور 403 من العمليات التشغيلية للمستأجر
        Sanctum::actingAs($this->platformAdmin);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(403);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(403);
        $this->getJson('/api/v1/sales/returns')->assertStatus(403);
        $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'Platform admin attempt',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 100.0]],
        ])->assertStatus(403);

        // 5. المحاسب المالي (financial_accountant) ومسؤول المبيعات (sales_rep) ومالك الشركة (company_owner): مسموح
        Sanctum::actingAs($this->accountantA);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(200);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(200);

        Sanctum::actingAs($this->salesRepA);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(200);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(200);

        Sanctum::actingAs($this->ownerA);
        $this->getJson('/api/v1/sales/invoices')->assertStatus(200);
        $this->getJson("/api/v1/sales/invoices/{$invoice->id}")->assertStatus(200);
    }

    /**
     * 13. هوية الشركة والبيانات الضريبية الحقيقية على الفاتورة والإيصال دون بيانات وهمية
     */
    public function test_receipt_company_identity_and_tax_isolation_across_tenants(): void
    {
        // تهيئة مستأجر ب برقم ضريبي معتمد
        $this->tenantA->settings = ['tax_number' => '100-200-300'];
        $this->tenantA->save();

        // مستأجر ب بدون رقم ضريبي
        $this->tenantB->settings = [];
        $this->tenantB->save();

        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invA = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-TENANT-A',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'pos_receipt',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 200.0,
            'total_amount' => 200.0,
            'paid_amount' => 200.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        $resA = $this->getJson("/api/v1/sales/invoices/{$invA->id}");
        $resA->assertStatus(200);
        $resA->assertJsonPath('invoice.tenant.name', 'مصنع النيل للملابس الجاهزة');
        $resA->assertJsonPath('invoice.tenant.settings.tax_number', '100-200-300');

        // مستخدم من مستأجر ب
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        // محاولة مستأجر ب قراءة فاتورة مستأجر أ تفشل فوراً (404 / عزل تام)
        $this->getJson("/api/v1/sales/invoices/{$invA->id}")->assertStatus(404);

        // إنشاء فاتورة لمستأجر ب
        $invB = SalesInvoice::create([
            'tenant_id' => $this->tenantB->id,
            'invoice_number' => 'INV-TENANT-B',
            'customer_name' => 'عميل الدلتا',
            'invoice_type' => 'pos_receipt',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 100.0,
            'total_amount' => 100.0,
            'paid_amount' => 100.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        $resB = $this->getJson("/api/v1/sales/invoices/{$invB->id}");
        $resB->assertStatus(200);
        $resB->assertJsonPath('invoice.tenant.name', 'مصنع الدلتا المنافس');
        // الرقم الضريبي غير موجود للمستأجر ب
        $this->assertNull($resB->json('invoice.tenant.settings.tax_number'));
    }

    /**
     * 14. الفاتورة غير المسددة عند إرجاعها جزئياً ثم كلياً (Unpaid Invoice Partial and Full Returns)
     */
    public function test_unpaid_invoice_full_and_partial_returns_financial_integrity(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-UNPAID-RETURNS',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'balance_due' => 1000.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => '5 قطع بسعر 200ج',
            'quantity' => 5.0,
            'unit_price' => 200.0,
            'total_price' => 1000.0,
        ]);

        // مرتجع جزئي أول: إرجاع قطعتين (400ج)
        $res1 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع جزئي أول',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 2.0, 'unit_price' => 200.0],
            ],
        ]);
        $res1->assertStatus(201);
        $res1->assertJsonPath('sales_return.refund_status', 'credited');

        $inv1 = $invoice->fresh();
        $this->assertEquals('partially_credited', $inv1->status);
        $this->assertEquals(600.0, (float) $inv1->balance_due);
        $this->assertEquals(0.0, (float) $inv1->paid_amount);

        // مرتجع ثانٍ مكمل: إرجاع 3 قطع الباقية (600ج)
        $res2 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع نهائي مكمل',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 3.0, 'unit_price' => 200.0],
            ],
        ]);
        $res2->assertStatus(201);
        $res2->assertJsonPath('sales_return.refund_status', 'credited');

        $inv2 = $invoice->fresh();
        $this->assertEquals('credited', $inv2->status);
        $this->assertEquals(0.0, (float) $inv2->balance_due);
        $this->assertEquals(0.0, (float) $inv2->paid_amount);

        // لا يمكن أن يكون هناك قيد نقدي لخروج أموال من الخزينة لفاتورة غير مسددة
        $this->assertFalse(
            \App\Models\PaymentVoucher::where('tenant_id', $this->tenantA->id)
                ->where('voucher_type', 'payment')
                ->exists()
        );
    }

    /**
     * 15. فاتورة مسددة جزئياً ومرتجع يخلي المديونية المتبقية دون صرف نقدي
     */
    public function test_partially_paid_invoice_return_clearing_receivable(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // فاتورة بـ 1000ج، مدفوع منها 400ج كاش، والمتبقي 600ج آجل
        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-PARTIAL-CLEAR',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'partially_paid',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
            'paid_amount' => 400.0,
            'balance_due' => 600.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => '5 قطع بسعر 200ج',
            'quantity' => 5.0,
            'unit_price' => 200.0,
            'total_price' => 1000.0,
        ]);

        // إرجاع 3 قطع بقيمة 600ج (تخلي المديونية الآجلة بالكامل دون صرف نقدي)
        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'إرجاع يعادل المتبقي الآجل',
            'items' => [
                ['variant_id' => $this->variantA->id, 'quantity' => 3.0, 'unit_price' => 200.0],
            ],
        ]);
        $res->assertStatus(201);
        $res->assertJsonPath('sales_return.refund_status', 'credited');

        $invFresh = $invoice->fresh();
        // بما أن 3 قطع فقط من 5 أُرجعت، الحالة partially_credited ورصيد المديونية صفر
        $this->assertEquals('partially_credited', $invFresh->status);
        $this->assertEquals(0.0, (float) $invFresh->balance_due);
        $this->assertEquals(400.0, (float) $invFresh->paid_amount);
    }

    /**
     * 16. حظر صرف استرداد نقدي لفاتورة غير مسددة، ومنع تكرار الصرف لنفس المرتجع
     */
    public function test_cannot_refund_cash_on_unpaid_invoice_and_repeated_refunds_rejected(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // فاتورة غير مسددة إطلاقاً
        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-UNPAID-NO-REFUND',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'subtotal' => 200.0,
            'total_amount' => 200.0,
            'paid_amount' => 0.0,
            'balance_due' => 200.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة واحدة',
            'quantity' => 1.0,
            'unit_price' => 200.0,
            'total_price' => 200.0,
        ]);

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع فاتورة آجلة',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);
        $res->assertStatus(201);
        $returnId = $res->json('sales_return.id');

        // محاولة صرف استرداد نقدي لفاتورة لم يسدد منها أي مبالغ نقدية ترفض (422)
        $refundRes = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 200.0,
            'payment_method' => 'cash',
        ]);
        $refundRes->assertStatus(422);
        $this->assertStringContainsString('لم يتم سداد أي مبالغ', $refundRes->json('message'));
    }

    /**
     * 17. عزل قائمة فواتير المبيعات بين المستأجرين (Cross-Tenant Invoices List Isolation)
     */
    public function test_cross_tenant_invoice_list_data_isolation(): void
    {
        // فاتورة للمستأجر A
        SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-LIST-TENANT-A',
            'customer_name' => 'عميل النيل',
            'invoice_type' => 'standard',
            'status' => 'issued',
            'total_amount' => 300.0,
            'balance_due' => 300.0,
            'invoice_date' => now()->toDateString(),
        ]);

        // فاتورة للمستأجر B
        SalesInvoice::create([
            'tenant_id' => $this->tenantB->id,
            'invoice_number' => 'INV-LIST-TENANT-B',
            'customer_name' => 'عميل الدلتا',
            'invoice_type' => 'standard',
            'status' => 'issued',
            'total_amount' => 700.0,
            'balance_due' => 700.0,
            'invoice_date' => now()->toDateString(),
        ]);

        // فحص قائمة فواتير المستأجر A
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $resA = $this->getJson('/api/v1/sales/invoices');
        $resA->assertStatus(200);
        $invoiceNumbersA = collect($resA->json('data'))->pluck('invoice_number')->all();
        $this->assertContains('INV-LIST-TENANT-A', $invoiceNumbersA);
        $this->assertNotContains('INV-LIST-TENANT-B', $invoiceNumbersA);

        // فحص قائمة فواتير المستأجر B
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $resB = $this->getJson('/api/v1/sales/invoices');
        $resB->assertStatus(200);
        $invoiceNumbersB = collect($resB->json('data'))->pluck('invoice_number')->all();
        $this->assertContains('INV-LIST-TENANT-B', $invoiceNumbersB);
        $this->assertNotContains('INV-LIST-TENANT-A', $invoiceNumbersB);
    }

    /**
     * 18. فشل الحسابات المحاسبية الإلزامية يؤدي إلى تراجع ذري كامل دون أثر جانبي
     */
    public function test_missing_required_accounts_causes_atomic_rollback(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-ACC-ROLLBACK',
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'invoice_type' => 'standard',
            'status' => 'issued',
            'total_amount' => 400.0,
            'balance_due' => 400.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعتين',
            'quantity' => 2.0,
            'unit_price' => 200.0,
            'total_price' => 400.0,
        ]);

        // حذف حساب 4010 مؤقتاً لمحاكاة غياب حساب محاسبي إلزامي
        $account4010 = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $account4010Id = $account4010->id;
        $account4010->delete();

        $initialReturns = SalesReturn::count();

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'اختبار نقص الحساب',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);

        // يجب الرفض 422 لغياب الحساب الإلزامي والتراجع الكامل
        $res->assertStatus(422);
        $this->assertStringContainsString('غير متوفر في شجرة الحسابات', $res->json('message'));
        $this->assertEquals($initialReturns, SalesReturn::count());
        $this->assertEquals(400.0, (float) $invoice->fresh()->balance_due);
    }

    /**
     * 19. تفاصيل المرتجع عبر showSalesReturn وعزل المستأجرين
     */
    public function test_show_sales_return_detail_and_cross_tenant_isolation(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $returnA = SalesReturn::create([
            'tenant_id' => $this->tenantA->id,
            'return_number' => 'SRT-SHOW-A',
            'customer_id' => $this->customerA->id,
            'warehouse_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'total_amount' => 200.0,
            'refund_status' => 'credited',
            'status' => 'received',
            'reason' => 'معاينة المرتجع',
        ]);

        // المستأجر A يستعرض المرتجع بنجاح
        $resA = $this->getJson("/api/v1/sales/returns/{$returnA->id}");
        $resA->assertStatus(200);
        $resA->assertJsonPath('sales_return.return_number', 'SRT-SHOW-A');

        // المستأجر B يحاول قراءة نفس المرتجع -> 404 محجوب تماماً
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $resB = $this->getJson("/api/v1/sales/returns/{$returnA->id}");
        $resB->assertStatus(404);
    }

    /**
     * 20. فشل العملية بالكامل عند خلو شجرة الحسابات (Finding 1: Empty Chart of Accounts fails closed)
     */
    public function test_empty_chart_of_accounts_fails_closed_and_rolls_back(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-EMPTY-COA',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة',
            'status' => 'paid',
            'total_amount' => 500.0,
            'paid_amount' => 500.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قميص',
            'quantity' => 1.0,
            'unit_price' => 500.0,
            'total_price' => 500.0,
        ]);

        // حذف كامل شجرة حسابات المستأجر A لمحاكاة مستأجر جديد بدون شجرة حسابات
        ChartOfAccount::where('tenant_id', $this->tenantA->id)->delete();
        $this->assertEquals(0, ChartOfAccount::where('tenant_id', $this->tenantA->id)->count());

        $initialReturns = SalesReturn::count();
        $initialTransactions = InventoryTransaction::count();
        $initialJournals = JournalEntry::count();

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع مع شجرة حسابات فارغة',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 500.0]],
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('غير متوفر في شجرة الحسابات', $res->json('message'));

        // التراجع التام: عدم إنشاء أي مرتجع أو حركة مخزنية أو قيد محاسبي
        $this->assertEquals($initialReturns, SalesReturn::count());
        $this->assertEquals($initialTransactions, InventoryTransaction::count());
        $this->assertEquals($initialJournals, JournalEntry::count());
        $this->assertEquals(500.0, (float) $invoice->fresh()->paid_amount);
    }

    /**
     * 21. التحقق من إلزامية حساب 1110 وفشل العملية إذا كان مفقوداً (Finding 1)
     */
    public function test_missing_1110_account_fails_closed_and_rolls_back(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-NO-1110',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة',
            'status' => 'issued',
            'total_amount' => 300.0,
            'paid_amount' => 0.0,
            'balance_due' => 300.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'بنطلون',
            'quantity' => 1.0,
            'unit_price' => 300.0,
            'total_price' => 300.0,
        ]);

        // حذف حساب 1110 فقط
        ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1110')->delete();

        $res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع بدون حساب 1110',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 300.0]],
        ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('1110', $res->json('message'));
        $this->assertEquals(300.0, (float) $invoice->fresh()->balance_due);
    }

    /**
     * 22. التحقق من رفض الحسابات غير النشطة أو غير الصحيحة محاسبياً (Finding 1 & 2)
     */
    public function test_inactive_and_misclassified_mandatory_accounts_fail_closed(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-INACTIVE-ACC',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة',
            'status' => 'issued',
            'total_amount' => 200.0,
            'paid_amount' => 0.0,
            'balance_due' => 200.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة',
            'quantity' => 1.0,
            'unit_price' => 200.0,
            'total_price' => 200.0,
        ]);

        // تعطيل حساب 4010
        $acc4010 = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $acc4010->is_active = false;
        $acc4010->save();

        $res1 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'حساب 4010 غير نشط',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);
        $res1->assertStatus(422);
        $this->assertStringContainsString('4010', $res1->json('message'));

        // إعادة تفعيل 4010 ولكن بنوع غير صحيح (expense بدلاً من revenue)
        $acc4010->is_active = true;
        $acc4010->type = 'expense';
        $acc4010->save();

        $res2 = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'حساب 4010 بنوع خاطئ',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);
        $res2->assertStatus(422);
        $this->assertStringContainsString('4010', $res2->json('message'));
    }

    /**
     * 23. الذرية التامة لسندات الصرف والقيود المحاسبية مع رفض الحسابات غير المصرح بها (Finding 2)
     */
    public function test_refund_atomic_failure_when_payout_account_invalid_or_cross_tenant(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-REF-ATOMIC',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة',
            'status' => 'paid',
            'total_amount' => 400.0,
            'paid_amount' => 400.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة',
            'quantity' => 1.0,
            'unit_price' => 400.0,
            'total_price' => 400.0,
        ]);

        $return = SalesReturn::create([
            'tenant_id' => $this->tenantA->id,
            'return_number' => 'SRT-REF-ATOMIC',
            'customer_id' => $this->customerA->id,
            'sales_invoice_id' => $invoice->id,
            'warehouse_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'total_amount' => 400.0,
            'refund_status' => 'pending',
            'status' => 'received',
            'reason' => 'اختبار الذرية',
        ]);

        $initialVouchers = PaymentVoucher::count();

        // استخدام المحاسب لصرف الاسترداد وفقاً لصلاحيات النظام (Role: company_owner,accountant,financial_accountant)
        Sanctum::actingAs($this->accountantA);

        // تجربة تمرير حساب مصروفات بدلاً من حساب نقدية/بنك
        $expenseAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('type', 'expense')->first();

        $res1 = $this->postJson("/api/v1/sales/returns/{$return->id}/refund", [
            'amount' => 200.0,
            'account_id' => $expenseAccount->id,
        ]);
        $res1->assertStatus(422);
        $this->assertStringContainsString('أصل متداول', $res1->json('message'));
        $this->assertEquals($initialVouchers, PaymentVoucher::count());

        // تجربة تمرير حساب تابع لمستأجر آخر (Cross-Tenant Account Attack)
        $accountTenantB = ChartOfAccount::create([
            'tenant_id' => $this->tenantB->id,
            'code' => '1010',
            'name' => 'خزينة المستأجر ب',
            'type' => 'asset',
            'category' => 'current_asset',
            'is_active' => true,
        ]);
        $res2 = $this->postJson("/api/v1/sales/returns/{$return->id}/refund", [
            'amount' => 200.0,
            'account_id' => $accountTenantB->id,
        ]);
        $res2->assertStatus(422);
        $this->assertEquals($initialVouchers, PaymentVoucher::count());
    }

    /**
     * 24. التسوية الجزئية للاسترداد النقدي واستكمال المتبقي ومنع التكرار (Finding 3: Return 500, pay 200, pay 300)
     */
    public function test_partial_refund_settlement_remainder_and_anti_duplicate(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-PARTIAL-500',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة جزئية',
            'status' => 'paid',
            'total_amount' => 500.0,
            'paid_amount' => 500.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة كاملة 500 ج.م',
            'quantity' => 1.0,
            'unit_price' => 500.0,
            'total_price' => 500.0,
        ]);

        // إنشاء مرتجع بكامل القيمة 500 ج.م
        $returnRes = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع 500 ج.م لاختبار الصرف الجزئي',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 500.0]],
        ]);
        $returnRes->assertStatus(201);
        $returnId = $returnRes->json('sales_return.id');
        $returnNumber = $returnRes->json('sales_return.return_number');

        // التبديل إلى المحاسب المالي لصرف الاسترداد
        Sanctum::actingAs($this->accountantA);

        // الخطوة 1: صرف جزئي بمبلغ 200 ج.م
        $payout1Res = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 200.0,
            'payment_method' => 'cash',
        ]);
        $payout1Res->assertStatus(200);
        $payout1Res->assertJsonPath('sales_return.refund_status', 'partially_refunded');
        $this->assertEquals(300.0, (float) $payout1Res->json('invoice.paid_amount'));
        $payout1Res->assertJsonPath('invoice.status', 'partially_refunded');
        $payout1Res->assertJsonPath('payment_voucher.voucher_number', "PV-REF-{$returnNumber}-1");

        // التحقق من إنشاء القيد المحاسبي المتوازن المرتبط بالسند الأول
        $je1 = JournalEntry::where('tenant_id', $this->tenantA->id)
            ->where('entry_number', "JE-REF-{$returnNumber}-1")
            ->first();
        $this->assertNotNull($je1);
        $this->assertEquals(200.0, (float) $je1->total_debit);

        // الخطوة 2: محاولة صرف زائد (Overpayment) بمبلغ 400 ج.م والمتبقي فقط 300 ج.م -> يجب الرفض 422
        $overpayRes = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 400.0,
        ]);
        $overpayRes->assertStatus(422);
        $this->assertStringContainsString('تتجاوز الحد الأقصى', $overpayRes->json('message'));

        // الخطوة 3: صرف باقي المبلغ 300 ج.م لتسوية المرتجع بالكامل
        $payout2Res = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 300.0,
            'payment_method' => 'cash',
        ]);
        $payout2Res->assertStatus(200);
        $payout2Res->assertJsonPath('sales_return.refund_status', 'refunded');
        $this->assertEquals(0.0, (float) $payout2Res->json('invoice.paid_amount'));
        $payout2Res->assertJsonPath('invoice.status', 'refunded');
        $payout2Res->assertJsonPath('payment_voucher.voucher_number', "PV-REF-{$returnNumber}-2");

        // التحقق من القيد المحاسبي الثاني
        $je2 = JournalEntry::where('tenant_id', $this->tenantA->id)
            ->where('entry_number', "JE-REF-{$returnNumber}-2")
            ->first();
        $this->assertNotNull($je2);
        $this->assertEquals(300.0, (float) $je2->total_debit);

        // الخطوة 4: محاولة صرف أي مبالغ إضافية بعد التسوية الكاملة -> يجب الرفض 422
        $payout3Res = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 50.0,
        ]);
        $payout3Res->assertStatus(422);
        $this->assertStringContainsString('تم استرداد هذا المرتجع بالكامل مسبقاً', $payout3Res->json('message'));

        // إجمالي سندات الصرف المسجلة لهذا المرتجع يجب أن يكون 2 فقط بمجموع 500 ج.م بالضبط
        $totalVouchersAmount = PaymentVoucher::where('tenant_id', $this->tenantA->id)
            ->where('notes', 'like', "%[SRT:{$returnId}]%")
            ->sum('amount');
        $this->assertEquals(500.0, (float) $totalVouchersAmount);
    }

    /**
     * 25. حماية مفتاح منع التكرار (Idempotency Key) تمنع السندات المزدوجة وتكرار خصم الأرصدة (Finding 3)
     */
    public function test_refund_idempotency_key_replay_prevents_duplicate_voucher(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-IDEM-TEST',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل تجربة مفتاح التكرار',
            'status' => 'paid',
            'total_amount' => 300.0,
            'paid_amount' => 300.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة',
            'quantity' => 1.0,
            'unit_price' => 300.0,
            'total_price' => 300.0,
        ]);

        $return = SalesReturn::create([
            'tenant_id' => $this->tenantA->id,
            'return_number' => 'SRT-IDEM-TEST',
            'customer_id' => $this->customerA->id,
            'sales_invoice_id' => $invoice->id,
            'warehouse_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'total_amount' => 300.0,
            'refund_status' => 'pending',
            'status' => 'received',
            'reason' => 'اختبار مفتاح منع التكرار',
        ]);

        $idempotencyKey = 'IDEM-REF-UNIQUE-999';

        // الطلب الأول
        $res1 = $this->withHeader('X-Idempotency-Key', $idempotencyKey)->postJson("/api/v1/sales/returns/{$return->id}/refund", [
            'amount' => 150.0,
        ]);
        $res1->assertStatus(200);
        $voucher1Id = $res1->json('payment_voucher.id');

        $initialVouchersCount = PaymentVoucher::count();

        // الطلب الثاني بنفس المفتاح (Replay Request)
        $res2 = $this->withHeader('X-Idempotency-Key', $idempotencyKey)->postJson("/api/v1/sales/returns/{$return->id}/refund", [
            'amount' => 150.0,
        ]);
        $res2->assertStatus(200);
        $voucher2Id = $res2->json('payment_voucher.id');

        // نفس السند بدون إنشاء سند جديد أو تكرار خصم الرصيد
        $this->assertEquals($voucher1Id, $voucher2Id);
        $this->assertEquals($initialVouchersCount, PaymentVoucher::count());
    }

    /**
     * 26. الفصل الصارم بين استرجاع البضائع وحالة التسوية المالية (Finding 4)
     */
    public function test_goods_return_vs_financial_settlement_separation_all_scenarios(): void
    {
        Sanctum::actingAs($this->salesRepA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // السيناريو أ: فاتورة مدفوعة بالكامل (1000 ج.م) وتم استرجاع كل البضاعة دون صرف نقدي -> الحالة credited
        $invA = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-SCENARIO-A',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل أ',
            'status' => 'paid',
            'total_amount' => 1000.0,
            'paid_amount' => 1000.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invA->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعتين',
            'quantity' => 2.0,
            'unit_price' => 500.0,
            'total_price' => 1000.0,
        ]);

        $resA = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invA->id,
            'reason' => 'استرجاع بضاعة كاملة دون صرف نقدي',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 2.0, 'unit_price' => 500.0]],
        ]);
        $resA->assertStatus(201);
        $this->assertEquals('credited', $invA->fresh()->status);
        $this->assertEquals(1000.0, (float) $invA->fresh()->paid_amount);

        // السيناريو ب: فاتورة غير مدفوعة (1000 ج.م، متبقي 1000 ج.م) وتم استرجاع كامل البضاعة -> تصبح credited ويصفر الرصيد المستحق
        $invB = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-SCENARIO-B',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل ب',
            'status' => 'issued',
            'total_amount' => 1000.0,
            'paid_amount' => 0.0,
            'balance_due' => 1000.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invB->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعتين',
            'quantity' => 2.0,
            'unit_price' => 500.0,
            'total_price' => 1000.0,
        ]);

        $resB = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invB->id,
            'reason' => 'استرجاع بضاعة فاتورة غير مدفوعة',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 2.0, 'unit_price' => 500.0]],
        ]);
        $resB->assertStatus(201);
        $this->assertEquals('credited', $invB->fresh()->status);
        $this->assertEquals(0.0, (float) $invB->fresh()->balance_due);

        // السيناريو ج: فاتورة مسددة جزئياً (إجمالي 1000، مسدد 400، متبقي 600)، تم استرجاع جزء من البضاعة بقيمة 500 -> تخفيض المتبقي إلى 100 والحالة partially_credited
        $invC = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-SCENARIO-C',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل ج',
            'status' => 'partially_paid',
            'total_amount' => 1000.0,
            'paid_amount' => 400.0,
            'balance_due' => 600.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invC->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعتين',
            'quantity' => 2.0,
            'unit_price' => 500.0,
            'total_price' => 1000.0,
        ]);

        $resC = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invC->id,
            'reason' => 'استرجاع جزئي مع فاتورة مسددة جزئياً',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 500.0]],
        ]);
        $resC->assertStatus(201);
        $this->assertEquals('partially_credited', $invC->fresh()->status);
        $this->assertEquals(100.0, (float) $invC->fresh()->balance_due);
        $this->assertEquals(400.0, (float) $invC->fresh()->paid_amount);

        // السيناريو د: بضاعة الفاتورة أ تم صرف 400 ج.م فقط من أصل 1000 ج.م المسددة -> الحالة partially_refunded وليست refunded
        $returnAId = $resA->json('sales_return.id');
        Sanctum::actingAs($this->accountantA);
        $resD = $this->postJson("/api/v1/sales/returns/{$returnAId}/refund", [
            'amount' => 400.0,
        ]);
        $resD->assertStatus(200);
        $this->assertEquals('partially_refunded', $invA->fresh()->status);
        $this->assertEquals(600.0, (float) $invA->fresh()->paid_amount);
    }

    /**
     * 27. التحقق من ذرية الصرف: فشل إنشاء قيد اليومية يؤدي للتراجع التام وحذف سند الصرف (Regression Item 4)
     */
    public function test_refund_journal_failure_rolls_back_voucher_and_mutations(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-JE-FAIL',
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل اختبار فشل القيد',
            'status' => 'paid',
            'total_amount' => 300.0,
            'paid_amount' => 300.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة',
            'quantity' => 1.0,
            'unit_price' => 300.0,
            'total_price' => 300.0,
        ]);

        $return = SalesReturn::create([
            'tenant_id' => $this->tenantA->id,
            'return_number' => 'SRT-JE-FAIL',
            'customer_id' => $this->customerA->id,
            'sales_invoice_id' => $invoice->id,
            'warehouse_id' => $this->warehouseA->id,
            'return_date' => now()->toDateString(),
            'total_amount' => 300.0,
            'refund_status' => 'pending',
            'status' => 'received',
            'reason' => 'اختبار فشل القيد',
        ]);

        $initialVouchers = PaymentVoucher::count();
        $initialJournals = JournalEntry::count();

        // محاكاة فشل خدمة المحاسبة أثناء إنشاء قيد اليومية
        $this->mock(AccountingService::class, function ($mock) {
            $mock->shouldReceive('createJournalEntry')
                ->andThrow(new InvalidArgumentException('فشل محاكاة قيد اليومية غير المتوازن'));
        });

        $res = $this->postJson("/api/v1/sales/returns/{$return->id}/refund", [
            'amount' => 150.0,
        ]);

        // يجب الرفض 422
        $res->assertStatus(422);
        $this->assertStringContainsString('فشل محاكاة قيد اليومية', $res->json('message'));

        // التأكد من عدم بقاء أي سند صرف أو تعديل في الفاتورة أو المرتجع
        $this->assertEquals($initialVouchers, PaymentVoucher::count());
        $this->assertEquals($initialJournals, JournalEntry::count());
        $this->assertEquals(300.0, (float) $invoice->fresh()->paid_amount);
        $this->assertEquals('pending', $return->fresh()->refund_status);
    }

    /**
     * 28. التحقق من حماية القيود الفريدة على مستوى قاعدة البيانات لمنع السندات المتزامنة (Regression Item 8)
     */
    public function test_concurrent_idempotency_or_voucher_collision_fails_closed_via_database_unique_constraints(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $cashAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();

        // إنشاء سند صرف بمفتاح idempotency_key محدد
        $voucher1 = PaymentVoucher::create([
            'tenant_id' => $this->tenantA->id,
            'voucher_number' => 'PV-CONCURRENT-001',
            'voucher_type' => 'payment',
            'party_type' => 'customer',
            'party_name' => 'عميل',
            'payment_method' => 'cash',
            'account_id' => $cashAccount->id,
            'amount' => 100.0,
            'voucher_date' => now()->toDateString(),
            'idempotency_key' => 'IDEM-CONCURRENT-COLLISION',
        ]);
        $this->assertNotNull($voucher1);

        // محاولة إدخال مباشر لنفس المفتاح داخل نفس الشركة -> يجب أن تفشل على مستوى قيد قاعدة البيانات الفريد
        $this->expectException(\Illuminate\Database\QueryException::class);
        PaymentVoucher::create([
            'tenant_id' => $this->tenantA->id,
            'voucher_number' => 'PV-CONCURRENT-002',
            'voucher_type' => 'payment',
            'party_type' => 'customer',
            'party_name' => 'عميل مكرر',
            'payment_method' => 'cash',
            'account_id' => $cashAccount->id,
            'amount' => 100.0,
            'voucher_date' => now()->toDateString(),
            'idempotency_key' => 'IDEM-CONCURRENT-COLLISION',
        ]);
    }

    /**
     * 29. التحقق من منع التكرار: نفس المفتاح مع نفس الحمولة المالية يُرجع السند الأصلي دون تكرار مالي (AUDIT-07B-06)
     */
    public function test_idempotency_same_key_same_payload_replays_cleanly(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-IDEM-SAME-' . uniqid(),
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل اختبار Replay',
            'invoice_type' => 'standard',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 600.0,
            'tax_amount' => 0.0,
            'discount_amount' => 0.0,
            'total_amount' => 600.0,
            'paid_amount' => 600.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        $item = SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة اختبار Replay',
            'quantity' => 1.0,
            'unit_price' => 600.0,
            'total_price' => 600.0,
        ]);

        $returnRes = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع لاختبار Replay',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 600.0]],
        ]);
        $returnRes->assertStatus(201);
        $returnId = $returnRes->json('sales_return.id');

        $idemKey = 'KEY-REPLAY-' . uniqid();
        $payload = [
            'amount' => 250.0,
            'payment_method' => 'cash',
            'idempotency_key' => $idemKey,
        ];

        // الطلب الأول
        $res1 = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", $payload);
        $res1->assertStatus(200);
        $voucher1Id = $res1->json('payment_voucher.id');
        $this->assertEquals(250.0, (float) $res1->json('payment_voucher.amount'));

        $initialVoucherCount = PaymentVoucher::where('tenant_id', $this->tenantA->id)->count();
        $initialJournalCount = JournalEntry::where('tenant_id', $this->tenantA->id)->count();

        // الطلب الثاني المتطابق تماماً
        $res2 = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", $payload);
        $res2->assertStatus(200);
        $this->assertEquals($voucher1Id, $res2->json('payment_voucher.id'));

        // التأكد من عدم إنشاء أي سند أو قيد إضافي
        $this->assertEquals($initialVoucherCount, PaymentVoucher::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals($initialJournalCount, JournalEntry::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals(350.0, (float) $invoice->fresh()->paid_amount);
    }

    /**
     * 30. التحقق من منع التكرار: نفس المفتاح مع حمولة مالية مختلفة يُرفض برمز 409 Conflict دون تعديل مالي (AUDIT-07B-06)
     */
    public function test_idempotency_same_key_different_payload_returns_409_conflict(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-IDEM-CONF-' . uniqid(),
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل اختبار Conflict',
            'invoice_type' => 'standard',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 800.0,
            'tax_amount' => 0.0,
            'discount_amount' => 0.0,
            'total_amount' => 800.0,
            'paid_amount' => 800.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);

        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invoice->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة اختبار Conflict',
            'quantity' => 1.0,
            'unit_price' => 800.0,
            'total_price' => 800.0,
        ]);

        $returnRes = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invoice->id,
            'reason' => 'مرتجع لاختبار Conflict',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 800.0]],
        ]);
        $returnRes->assertStatus(201);
        $returnId = $returnRes->json('sales_return.id');

        $sharedKey = 'KEY-CONFLICT-' . uniqid();

        // الطلب الأول بمبلغ 300 ج.م
        $res1 = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 300.0,
            'payment_method' => 'cash',
            'idempotency_key' => $sharedKey,
        ]);
        $res1->assertStatus(200);

        $voucherCountAfter1 = PaymentVoucher::where('tenant_id', $this->tenantA->id)->count();

        // الطلب الثاني بنفس المفتاح ولكن بمبلغ مختلف 400 ج.م -> يجب أن يعود 409 Conflict
        $res2 = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 400.0,
            'payment_method' => 'cash',
            'idempotency_key' => $sharedKey,
        ]);
        $res2->assertStatus(409);
        $res2->assertJsonPath('error', 'IdempotencyConflict');

        // الطلب الثالث بنفس المفتاح ولكن بطريقة دفع مختلفة (card) -> يجب أن يعود 409 Conflict
        $res3 = $this->postJson("/api/v1/sales/returns/{$returnId}/refund", [
            'amount' => 300.0,
            'payment_method' => 'card',
            'idempotency_key' => $sharedKey,
        ]);
        $res3->assertStatus(409);
        $res3->assertJsonPath('error', 'IdempotencyConflict');

        // التأكد التام من عدم زيادة السندات بعد الرفض
        $this->assertEquals($voucherCountAfter1, PaymentVoucher::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals(500.0, (float) $invoice->fresh()->paid_amount);
    }

    /**
     * 31. التحقق من عزل المستأجرين: استخدام نفس المفتاح بين مستأجرين مختلفين لا يسبب تصادماً (AUDIT-07B-06)
     */
    public function test_idempotency_different_tenants_same_key_does_not_collide(): void
    {
        $sharedKey = 'CROSS-TENANT-KEY-' . uniqid();

        // عملية الشركة الأولى
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invA = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-TEN-A-' . uniqid(),
            'customer_name' => 'عميل شركة أ',
            'invoice_type' => 'standard',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 200.0,
            'total_amount' => 200.0,
            'paid_amount' => 200.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $invA->id,
            'variant_id' => $this->variantA->id,
            'description' => 'قطعة شركة أ',
            'quantity' => 1.0,
            'unit_price' => 200.0,
            'total_price' => 200.0,
        ]);
        $retA = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $invA->id,
            'reason' => 'مرتجع شركة أ',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);
        $retA->assertStatus(201);

        $resA = $this->postJson("/api/v1/sales/returns/{$retA->json('sales_return.id')}/refund", [
            'amount' => 100.0,
            'idempotency_key' => $sharedKey,
        ]);
        $resA->assertStatus(200);

        // عملية الشركة الثانية
        Sanctum::actingAs($this->ownerB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $accountingService = app(AccountingService::class);
        $accountingService->initializeDefaultChartOfAccounts($this->tenantB->id);

        $warehouseB = Warehouse::create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'WH-RET-B',
            'name' => 'مخزن شركة ب',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $modelB = GarmentModel::create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'MOD-B-' . uniqid(),
            'name' => 'موديل شركة ب',
            'category' => 'casualwear',
            'target_cost' => 100.0,
            'wholesale_price' => 200.0,
            'retail_price' => 200.0,
        ]);

        $colorB = \App\Models\Color::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Blue B',
            'hex_code' => '#0000FF',
        ]);
        $sizeB = \App\Models\Size::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'M B',
            'code' => 'M-B',
        ]);

        $variantB = ProductVariant::create([
            'tenant_id' => $this->tenantB->id,
            'garment_model_id' => $modelB->id,
            'color_id' => $colorB->id,
            'size_id' => $sizeB->id,
            'sku' => 'SKU-B-' . uniqid(),
            'barcode' => 'BAR-B-' . uniqid(),
            'wholesale_price' => 200.0,
            'retail_price' => 200.0,
        ]);

        $invB = SalesInvoice::create([
            'tenant_id' => $this->tenantB->id,
            'invoice_number' => 'INV-TEN-B-' . uniqid(),
            'customer_name' => 'عميل شركة ب',
            'invoice_type' => 'standard',
            'status' => 'paid',
            'payment_method' => 'cash',
            'subtotal' => 200.0,
            'total_amount' => 200.0,
            'paid_amount' => 200.0,
            'balance_due' => 0.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantB->id,
            'sales_invoice_id' => $invB->id,
            'variant_id' => $variantB->id,
            'description' => 'قطعة شركة ب',
            'quantity' => 1.0,
            'unit_price' => 200.0,
            'total_price' => 200.0,
        ]);
        $retB = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $warehouseB->id,
            'sales_invoice_id' => $invB->id,
            'reason' => 'مرتجع شركة ب',
            'items' => [['variant_id' => $variantB->id, 'quantity' => 1.0, 'unit_price' => 200.0]],
        ]);
        $retB->assertStatus(201);

        // استخدام نفس المفتاح في الشركة الثانية يجب أن ينجح دون تضارب مع الشركة الأولى
        $resB = $this->postJson("/api/v1/sales/returns/{$retB->json('sales_return.id')}/refund", [
            'amount' => 100.0,
            'idempotency_key' => $sharedKey,
        ]);
        $resB->assertStatus(200);

        $this->assertNotEquals($resA->json('payment_voucher.id'), $resB->json('payment_voucher.id'));
    }

    /**
     * 32. التحقق الشامل من اتساق معادلة رصيد الفاتورة والسداد الجزئي وكبح الاسترداد الزائد (AUDIT-07B-05)
     */
    public function test_partial_payment_and_invoice_balance_mathematical_consistency_all_scenarios(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // =========================================================================
        // السيناريو 1: فاتورة إجمالي 1000، مسدد 400، متبقي 600، بضاعة مرتجعة 400
        // النتيجة الإلزامية:
        // - صافي قيمة البضاعة المتبقية = 600
        // - المسدد = 400
        // - المديونية المتبقية تنخفض إلى 200 (600 - 400)
        // - الرصيد النقدي المسدد بالزيادة = 0، لذا يُحظر تماماً أي استرداد نقدي
        // =========================================================================
        $inv1 = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-SCENARIO-1-' . uniqid(),
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل سيناريو 1',
            'invoice_type' => 'standard',
            'status' => 'partially_paid',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'tax_amount' => 0.0,
            'discount_amount' => 0.0,
            'total_amount' => 1000.0,
            'paid_amount' => 400.0,
            'balance_due' => 600.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $inv1->id,
            'variant_id' => $this->variantA->id,
            'description' => 'بضاعة سيناريو 1',
            'quantity' => 2.0,
            'unit_price' => 500.0,
            'total_price' => 1000.0,
        ]);

        $ret1Res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $inv1->id,
            'reason' => 'إرجاع بضاعة بقيمة 400 ج.م',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 0.8, 'unit_price' => 500.0]], // 0.8 * 500 = 400
        ]);
        $ret1Res->assertStatus(201);
        $ret1Id = $ret1Res->json('sales_return.id');

        $this->assertEquals(200.0, (float) $inv1->fresh()->balance_due, 'المديونية المتبقية يجب أن تنخفض إلى 200 ج.م');
        $this->assertEquals(400.0, (float) $inv1->fresh()->paid_amount, 'المبلغ المسدد يبقى 400 ج.م');
        $this->assertEquals('credited', $ret1Res->json('sales_return.refund_status'));

        // محاولة صرف استرداد نقدي -> يجب أن تُرفض 422 لعدم وجود مسدد بالزيادة
        $refundAttempt1 = $this->postJson("/api/v1/sales/returns/{$ret1Id}/refund", [
            'amount' => 100.0,
        ]);
        $refundAttempt1->assertStatus(422);
        $this->assertStringContainsString('تم استخدام قيمة المرتجع لتسوية مديونية الفاتورة المتبقية', $refundAttempt1->json('message'));

        // =========================================================================
        // السيناريو 2: فاتورة إجمالي 1000، مسدد 700، متبقي 300، بضاعة مرتجعة 500
        // النتيجة الإلزامية:
        // - صافي قيمة البضاعة المتبقية = 500
        // - المديونية 300 تُسوى بالكامل بالمرتجع (balance_due = 0)
        // - الرصيد المسدد بالزيادة القابل للاسترداد = 200 ج.م (700 - 500)
        // - محاولة استرداد 250 ج.م تُرفض لأن الحد الأقصى 200
        // - استرداد 200 ج.م ينجح، وينخفض paid_amount إلى 500 وتتحول حالة المرتجع إلى refunded
        // =========================================================================
        $inv2 = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-SCENARIO-2-' . uniqid(),
            'customer_id' => $this->customerA->id,
            'customer_name' => 'عميل سيناريو 2',
            'invoice_type' => 'standard',
            'status' => 'partially_paid',
            'payment_method' => 'credit',
            'subtotal' => 1000.0,
            'tax_amount' => 0.0,
            'discount_amount' => 0.0,
            'total_amount' => 1000.0,
            'paid_amount' => 700.0,
            'balance_due' => 300.0,
            'invoice_date' => now()->toDateString(),
        ]);
        SalesInvoiceItem::create([
            'tenant_id' => $this->tenantA->id,
            'sales_invoice_id' => $inv2->id,
            'variant_id' => $this->variantA->id,
            'description' => 'بضاعة سيناريو 2',
            'quantity' => 2.0,
            'unit_price' => 500.0,
            'total_price' => 1000.0,
        ]);

        $ret2Res = $this->postJson('/api/v1/sales/returns', [
            'warehouse_id' => $this->warehouseA->id,
            'sales_invoice_id' => $inv2->id,
            'reason' => 'إرجاع بضاعة بقيمة 500 ج.م',
            'items' => [['variant_id' => $this->variantA->id, 'quantity' => 1.0, 'unit_price' => 500.0]], // 500
        ]);
        $ret2Res->assertStatus(201);
        $ret2Id = $ret2Res->json('sales_return.id');

        $this->assertEquals(0.0, (float) $inv2->fresh()->balance_due, 'المديونية يجب أن تنخفض إلى الصفر');
        $this->assertEquals(700.0, (float) $inv2->fresh()->paid_amount);

        // محاولة صرف 250 ج.م -> ترفض لأن المتاح 200
        $overRefund = $this->postJson("/api/v1/sales/returns/{$ret2Id}/refund", ['amount' => 250.0]);
        $overRefund->assertStatus(422);

        // صرف 200 ج.م -> ينجح
        $validRefund = $this->postJson("/api/v1/sales/returns/{$ret2Id}/refund", ['amount' => 200.0]);
        $validRefund->assertStatus(200);
        $this->assertEquals(500.0, (float) $inv2->fresh()->paid_amount);
        $this->assertEquals(0.0, (float) $inv2->fresh()->balance_due);
        $validRefund->assertJsonPath('sales_return.refund_status', 'refunded');

        // محاولة صرف إضافي بعد التسوية التامة -> ترفض
        $extraRefund = $this->postJson("/api/v1/sales/returns/{$ret2Id}/refund", ['amount' => 10.0]);
        $extraRefund->assertStatus(422);
    }
}

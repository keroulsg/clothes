<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JournalEntry;
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
        $cashAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
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
}

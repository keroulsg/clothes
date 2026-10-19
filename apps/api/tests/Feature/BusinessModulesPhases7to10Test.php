<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Payroll;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\Quotation;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\InventoryService;
use App\Services\PayrollService;
use App\Services\SalesService;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class BusinessModulesPhases7to10Test extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Warehouse $warehouseA;
    protected GarmentModel $modelA;
    protected ProductVariant $variantA;
    protected InventoryItem $inventoryItemA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-A',
            'name' => 'El-Nasr Garment Factory',
            'domain' => 'elnasr.garmentos.test',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-B',
            'name' => 'Delta Apparel Works',
            'domain' => 'delta.garmentos.test',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Ahmed Manager',
            'email' => 'ahmed@elnasr.test',
            'password' => bcrypt('Password123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Khaled Delta',
            'email' => 'khaled@delta.test',
            'password' => bcrypt('Password123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy Blue',
            'hex_code' => '#000080',
        ]);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => '4-6 Years',
            'code' => '4-6Y',
        ]);

        $this->modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-KIDS-01',
            'name' => 'Kids Summer Polo Shirt',
            'category' => 'kids_clothing',
            'status' => 'active',
        ]);

        $this->variantA = ProductVariant::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'POLO-NAVY-4Y',
            'barcode' => '6221000123456',
            'wholesale_price' => 120.0000,
            'retail_price' => 180.0000,
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-FG',
            'name' => 'Finished Goods Warehouse',
            'type' => 'finished_goods',
        ]);

        $this->inventoryItemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'variant_id' => $this->variantA->id,
            'item_type' => 'finished_good',
            'code' => 'FG-POLO-NAVY',
            'name' => 'Kids Summer Polo Navy - 4Y',
            'unit_of_measure' => 'piece',
            'current_balance' => 200,
            'average_cost' => 75.0000,
            'is_customer_owned' => false,
        ]);
    }

    /**
     * Test Phase 7: Sales quotation, order creation, stock reservation, fulfillment, and ledger deduction
     */
    public function test_phase7_sales_cycle_order_reservation_and_fulfillment(): void
    {
        $salesService = app(SalesService::class);

        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-001',
            'name' => 'Cairo Kids Store Chain',
            'is_active' => true,
        ]);

        // 1. إنشاء عرض سعر
        $quotation = $salesService->createQuotation([
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'description' => 'Kids Summer Polo Navy',
                    'quantity' => 50,
                    'unit_price' => 120,
                    'tax_rate' => 14,
                ],
            ],
            'discount_amount' => 100,
        ]);

        $this->assertInstanceOf(Quotation::class, $quotation);
        $this->assertEquals(6000, $quotation->subtotal);
        $this->assertEquals(840, $quotation->tax_amount);
        $this->assertEquals(6740, $quotation->total_amount);

        // 2. إنشاء أمر بيع
        $salesOrder = $salesService->createSalesOrder([
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'quotation_id' => $quotation->id,
            'warehouse_id' => $this->warehouseA->id,
            'order_type' => 'wholesale',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'ordered_quantity' => 50,
                    'unit_price' => 120,
                    'tax_rate' => 14,
                ],
            ],
        ]);

        $this->assertEquals('confirmed', $salesOrder->status);
        $this->assertEquals(0, $salesOrder->items->first()->reserved_quantity);

        // 3. حجز المخزون لأمر البيع
        $reservedOrder = $salesService->reserveOrderStock($salesOrder->id);
        $this->assertEquals('reserved', $reservedOrder->status);
        $this->assertEquals(50, $reservedOrder->items->first()->reserved_quantity);

        // 4. صرف البضاعة وإصدار فاتورة المبيعات الرسمية
        $invoice = $salesService->fulfillOrder($salesOrder->id);
        $this->assertInstanceOf(SalesInvoice::class, $invoice);
        $this->assertEquals('fulfilled', $salesOrder->fresh()->status);

        // التحقق من خصم رصيد المخزن الفعلي في دفتر الحركات
        $this->inventoryItemA->refresh();
        $this->assertEquals(150, (float) $this->inventoryItemA->current_balance);
    }

    /**
     * Test Phase 7: Over-reservation prevention
     */
    public function test_phase7_prevents_overselling_beyond_available_stock(): void
    {
        $salesService = app(SalesService::class);

        $salesOrder = $salesService->createSalesOrder([
            'customer_name' => 'Wholesale Giant',
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'ordered_quantity' => 500, // available is only 200
                    'unit_price' => 120,
                ],
            ],
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('رصيد المخزن غير كافٍ');
        $salesService->reserveOrderStock($salesOrder->id);
    }

    /**
     * Test Phase 7: Factory Outlet POS Instant Checkout
     */
    public function test_phase7_pos_direct_checkout_and_session_tracking(): void
    {
        $salesService = app(SalesService::class);

        $session = PosSession::create([
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->userA->id,
            'session_code' => 'POS-TEST-01',
            'opening_cash' => 500,
            'total_sales' => 0,
            'status' => 'open',
            'opened_at' => now(),
        ]);

        $invoice = $salesService->processPosSale([
            'pos_session_id' => $session->id,
            'customer_name' => 'Outlet Cash Buyer',
            'payment_method' => 'cash',
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'description' => 'Polo Shirt',
                    'quantity' => 2,
                    'unit_price' => 180,
                    'tax_rate' => 0,
                ],
            ],
        ]);

        $this->assertEquals('pos_receipt', $invoice->invoice_type);
        $this->assertEquals('paid', $invoice->status);
        $this->assertEquals(360, $invoice->total_amount);

        // التحقق من تحديث رصيد المخزن ومبيعات جلسة الكاشير
        $session->refresh();
        $this->assertEquals(360, $session->total_sales);

        $this->inventoryItemA->refresh();
        $this->assertEquals(198, (float) $this->inventoryItemA->current_balance);
    }

    /**
     * Test Phase 8: Accounting Chart of Accounts and Balanced Double-Entry Rule
     */
    public function test_phase8_double_entry_balancing_enforcement(): void
    {
        $accountingService = app(AccountingService::class);
        $accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cashAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $revenueAccount = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();

        // قيد متوازن سليم (مدين 5000 = دائن 5000)
        $entry = $accountingService->createJournalEntry([
            'description' => 'إثبات مبيعات نقدية',
            'lines' => [
                ['account_id' => $cashAccount->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $revenueAccount->id, 'debit' => 0, 'credit' => 5000],
            ],
        ]);

        $this->assertEquals(5000, $entry->total_debit);
        $this->assertEquals(5000, $entry->total_credit);

        $cashAccount->refresh();
        $revenueAccount->refresh();
        $this->assertEquals(5000, (float) $cashAccount->current_balance);
        $this->assertEquals(5000, (float) $revenueAccount->current_balance);

        // محاولة تسجيل قيد غير متوازن (مدين 3000 != دائن 2000)
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('قيد اليومية غير متوازن محاسبياً');

        $accountingService->createJournalEntry([
            'description' => 'قيد غير متوازن مخالف',
            'lines' => [
                ['account_id' => $cashAccount->id, 'debit' => 3000, 'credit' => 0],
                ['account_id' => $revenueAccount->id, 'debit' => 0, 'credit' => 2000],
            ],
        ]);
    }

    /**
     * Test Phase 9: HR Piece-Rate Recording and Payroll Generation
     */
    public function test_phase9_piece_rate_productivity_and_payroll(): void
    {
        $payrollService = app(PayrollService::class);

        $employee = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-01',
            'name' => 'Mohamed Hassan',
            'department' => 'sewing',
            'job_title' => 'Sewing Machine Operator',
            'pay_type' => 'piece_rate',
            'base_salary' => 1500,
            'is_active' => true,
        ]);

        $pieceRate = PieceRate::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'stage_name' => 'sewing',
            'operation_name' => 'Polo Collar Assembly',
            'rate_per_piece' => 3.50,
            'is_active' => true,
        ]);

        // تسجيل إنتاجية 400 قطعة
        $workLog = $payrollService->recordPieceWork([
            'employee_id' => $employee->id,
            'piece_rate_id' => $pieceRate->id,
            'completed_quantity' => 400,
            'work_date' => now()->toDateString(),
        ]);

        $this->assertInstanceOf(PieceWorkLog::class, $workLog);
        $this->assertEquals(1400, $workLog->total_amount); // 400 * 3.50

        // استخراج مسير الرواتب للشهر الحالي
        $payroll = $payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-10',
            now()->startOfMonth()->toDateString(),
            now()->endOfMonth()->toDateString()
        );

        $this->assertInstanceOf(Payroll::class, $payroll);
        $this->assertEquals('approved', $payroll->status);

        $item = $payroll->items->where('employee_id', $employee->id)->first();
        $this->assertNotNull($item);
        $this->assertEquals(1500, $item->base_amount);
        $this->assertEquals(1400, $item->piece_rate_earnings);
        $this->assertEquals(2900, $item->net_salary);
    }

    /**
     * Test Phase 10: E-Commerce Storefront Details and Placing Orders
     */
    public function test_phase10_storefront_catalog_and_order_placement(): void
    {
        $storeService = app(StorefrontService::class);

        // جلب تفاصيل المتجر والكتالوج
        $details = $storeService->getStoreDetails($this->tenantA->id);
        $this->assertArrayHasKey('store_settings', $details);
        $this->assertArrayHasKey('products', $details);
        $this->assertNotEmpty($details['products']);
        $this->assertEquals(200, $details['products'][0]['in_stock']);

        // تسجيل طلب شراء من المتجر
        $storeOrder = $storeService->placeStoreOrder($this->tenantA->id, [
            'customer_name' => 'Sara Ahmed',
            'customer_phone' => '01012345678',
            'shipping_address' => 'Nasr City, Cairo',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'shipping_fee' => 50,
            'items' => [
                [
                    'variant_id' => $this->variantA->id,
                    'product_name' => 'Kids Summer Polo Navy',
                    'sku' => $this->variantA->sku,
                    'quantity' => 3,
                    'unit_price' => 180,
                ],
            ],
        ]);

        $this->assertInstanceOf(StoreOrder::class, $storeOrder);
        $this->assertEquals('new', $storeOrder->status);
        $this->assertEquals(540, $storeOrder->subtotal);
        $this->assertEquals(590, $storeOrder->total_amount); // 540 + 50
    }

    /**
     * Test Tenant Isolation: Tenant B cannot access or manipulate Tenant A's business modules
     */
    public function test_tenant_isolation_in_phases_7_to_10(): void
    {
        // سياق الشركة A
        app()->instance('current_tenant_id', $this->tenantA->id);
        $customerA = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-A',
            'name' => 'Customer of A',
        ]);

        $salesOrderA = SalesOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'SO-A-001',
            'customer_name' => $customerA->name,
            'status' => 'confirmed',
            'total_amount' => 1000,
        ]);

        // التبديل إلى سياق الشركة B
        app()->instance('current_tenant_id', $this->tenantB->id);

        $salesOrdersForB = SalesOrder::all();
        $this->assertEmpty($salesOrdersForB);

        $quotationsForB = Quotation::all();
        $this->assertEmpty($quotationsForB);

        $payrollsForB = Payroll::all();
        $this->assertEmpty($payrollsForB);
    }
}

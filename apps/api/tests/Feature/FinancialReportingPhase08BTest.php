<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\Employee;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JournalEntry;
use App\Models\PieceWorkLog;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\SalesInvoice;
use App\Models\SalesReturn;
use App\Models\Size;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\FinancialReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinancialReportingPhase08BTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $accountantA;
    protected User $ownerA;
    protected User $workerA;
    protected User $accountantB;
    protected AccountingService $accountingService;
    protected FinancialReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountingService = app(AccountingService::class);
        $this->reportService = app(FinancialReportService::class);

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-ALPHA',
            'name' => 'Alpha Kids Garments',
            'domain' => 'alpha.garmentos.test',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-BETA',
            'name' => 'Beta Fashion Works',
            'domain' => 'beta.garmentos.test',
            'status' => 'active',
        ]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Mohamed Accountant',
            'email' => 'mohamed@alpha.test',
            'password' => bcrypt('Password123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Tarek Owner',
            'email' => 'tarek@alpha.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->workerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Ali Operator',
            'email' => 'ali@alpha.test',
            'password' => bcrypt('Password123!'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        $this->accountantB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Hassan Beta Accountant',
            'email' => 'hassan@beta.test',
            'password' => bcrypt('Password123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);
    }

    /**
     * 1. فحص ميزان المراجعة الآلي: التوازن المحاسبي، الأرصدة الافتتاحية وحركات الفترة ورصيد الإقفال
     */
    public function test_trial_balance_calculates_opening_period_closing_and_balances(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cash = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $revenue = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $cogs = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '5010')->first();
        $inventory = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1230')->first();

        // قيد 1: مبيعات نقدية
        $this->accountingService->createJournalEntry([
            'description' => 'مبيعات كاش',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 15000, 'credit' => 0],
                ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 15000],
            ],
        ]);

        // قيد 2: إثبات تكلفة البضاعة المباعة
        $this->accountingService->createJournalEntry([
            'description' => 'تكلفة البضاعة المباعة',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cogs->id, 'debit' => 7000, 'credit' => 0],
                ['account_id' => $inventory->id, 'debit' => 0, 'credit' => 7000],
            ],
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/trial-balance');

        $response->assertStatus(200)
            ->assertJson([
                'report_name_ar' => 'ميزان المراجعة',
                'is_balanced' => true,
            ]);

        $data = $response->json();
        $this->assertTrue($data['is_balanced']);
        $this->assertEquals(22000, $data['totals']['period_debit']);
        $this->assertEquals(22000, $data['totals']['period_credit']);
        $this->assertEquals($data['totals']['closing_debit'], $data['totals']['closing_credit']);
    }

    /**
     * 2. استبعاد القيود غير المرحلة أو الملغاة من ميزان المراجعة
     */
    public function test_trial_balance_excludes_unposted_or_draft_entries(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cash = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $revenue = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();

        // قيد مرحل سليم
        $this->accountingService->createJournalEntry([
            'description' => 'قيد مرحل',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 8000, 'credit' => 0],
                ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 8000],
            ],
        ]);

        // إنشاء قيد بحالة draft (غير مرحل) يدوياً
        $draftEntry = JournalEntry::create([
            'tenant_id' => $this->tenantA->id,
            'entry_number' => 'JE-DRAFT-01',
            'entry_date' => now()->toDateString(),
            'description' => 'مسودة قيد غير مرحل',
            'total_debit' => 99999,
            'total_credit' => 99999,
            'status' => 'draft',
        ]);
        $draftEntry->lines()->create([
            'tenant_id' => $this->tenantA->id,
            'account_id' => $cash->id,
            'debit' => 99999,
            'credit' => 0,
        ]);
        $draftEntry->lines()->create([
            'tenant_id' => $this->tenantA->id,
            'account_id' => $revenue->id,
            'debit' => 0,
            'credit' => 99999,
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/trial-balance');

        $response->assertStatus(200);
        $data = $response->json();
        // لا يجب أن تظهر قيمة 99999 في إجمالي الفترة
        $this->assertEquals(8000, $data['totals']['period_debit']);
        $this->assertEquals(8000, $data['totals']['period_credit']);
    }

    /**
     * 3. فحص تصدير CSV متوافق مع Excel وبترميز UTF-8 مع BOM لمنع تشوه النصوص العربية
     */
    public function test_trial_balance_csv_export_returns_streamed_file_with_bom(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->get('/api/v1/accounting/reports/trial-balance?export=csv');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment; filename=', $response->headers->get('Content-Disposition'));

        $content = $response->streamedContent();
        // فحص وجود الـ UTF-8 BOM في أول 3 بايتات
        $this->assertEquals("\xEF\xBB\xBF", substr($content, 0, 3));
        $this->assertStringContainsString('كود الحساب', $content);
        $this->assertStringContainsString('نقدية بالصندوق', $content);
    }

    /**
     * 4. فحص قائمة الدخل (Income Statement): الإيرادات، ومردودات المبيعات، وتكلفة المبيعات، ومجمل وصافي الربح
     */
    public function test_income_statement_revenue_cogs_expenses_and_net_profit(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cash = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $revenue = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $cogs = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '5010')->first();
        $wipInventory = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1220')->first();
        $operatingExpense = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '6010')->first();

        // مبيعات إجمالية 20,000
        $this->accountingService->createJournalEntry([
            'description' => 'مبيعات ملابس أطفال',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 20000, 'credit' => 0],
                ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 20000],
            ],
        ]);

        // مردودات مبيعات (Contra-Revenue) 3,000
        $this->accountingService->createJournalEntry([
            'description' => 'مرتجع مبيعات',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $revenue->id, 'debit' => 3000, 'credit' => 0],
                ['account_id' => $cash->id, 'debit' => 0, 'credit' => 3000],
            ],
        ]);

        // تكلفة البضاعة المباعة 8,000
        $this->accountingService->createJournalEntry([
            'description' => 'تكلفة الخامات للمبيعات',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cogs->id, 'debit' => 8000, 'credit' => 0],
                ['account_id' => $wipInventory->id, 'debit' => 0, 'credit' => 8000],
            ],
        ]);

        // مصاريف صناعية غير مباشرة واستهلاك 2,000
        $this->accountingService->createJournalEntry([
            'description' => 'مصاريف غير مباشرة',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $operatingExpense->id, 'debit' => 2000, 'credit' => 0],
                ['account_id' => $cash->id, 'debit' => 0, 'credit' => 2000],
            ],
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/income-statement');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(20000, $data['revenue']['total_gross_revenue']);
        $this->assertEquals(3000, $data['revenue']['total_returns_discounts']);
        $this->assertEquals(17000, $data['revenue']['total_net_revenue']);
        $this->assertEquals(8000, $data['cost_of_goods_sold']['total_cogs']);
        $this->assertEquals(9000, $data['gross_profit']); // 17,000 - 8,000
        $this->assertEquals(2000, $data['operating_expenses']['total_operating_expenses']);
        $this->assertEquals(7000, $data['net_profit']); // 9,000 - 2,000
        $this->assertTrue($data['is_profitable']);
    }

    /**
     * 5. فحص الميزانية العمومية (Balance Sheet): مطابقة معادلة الميزانية مع احتساب الأرباح المحتجزة
     */
    public function test_balance_sheet_accounting_equation_assets_equal_liabilities_plus_equity(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cash = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $capital = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '3010')->first();
        $revenue = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $expense = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '6010')->first();

        // 1. إيداع رأس مال 100,000
        $this->accountingService->createJournalEntry([
            'description' => 'إثبات رأس مال الشركاء',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 100000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 100000],
            ],
        ]);

        // 2. إيرادات مبيعات 25,000
        $this->accountingService->createJournalEntry([
            'description' => 'إيراد تشغيل CMT',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 25000, 'credit' => 0],
                ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 25000],
            ],
        ]);

        // 3. مصروفات تشغيلية 5,000
        $this->accountingService->createJournalEntry([
            'description' => 'سداد مصروف صيانة',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $expense->id, 'debit' => 5000, 'credit' => 0],
                ['account_id' => $cash->id, 'debit' => 0, 'credit' => 5000],
            ],
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/balance-sheet');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertTrue($data['is_balanced']);
        $this->assertEquals(0, $data['discrepancy']);
        // رصيد النقدية: 100,000 + 25,000 - 5,000 = 120,000
        $this->assertEquals(120000, $data['assets']['total_assets']);
        $this->assertEquals(100000, $data['equity']['stated_equity']);
        // صافي ربح الفترة: 25,000 - 5,000 = 20,000
        $this->assertEquals(20000, $data['equity']['retained_earnings']);
        $this->assertEquals(120000, $data['equity']['total_equity']);
        $this->assertEquals(120000, $data['total_liabilities_and_equity']);
    }

    /**
     * 6. فحص ملخص إقرار ضريبة القيمة المضافة (VAT Return Summary) والخصومات والمردودات والتنبيه النظامي
     */
    public function test_vat_return_summary_output_input_and_returns(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-VAT-01',
            'name' => 'Al-Hoda Store',
            'phone' => '01011112222',
        ]);

        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUPP-VAT-01',
            'name' => 'Textile Mills Co.',
            'contact_person' => 'Adel',
            'phone' => '01234567890',
        ]);

        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Main WH',
            'code' => 'WH-VAT-01',
            'type' => 'raw_material',
        ]);

        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'po_number' => 'PO-VAT-01',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $wh->id,
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 6000,
            'tax_amount' => 840,
            'total_amount' => 6840,
        ]);

        // فاتورة مبيعات بضريبة 14%
        $salesInvoice = SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'INV-VAT-01',
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'subtotal' => 10000,
            'tax_amount' => 1400,
            'total_amount' => 11400,
            'paid_amount' => 11400,
            'balance_due' => 0,
            'status' => 'paid',
            'invoice_date' => now()->toDateString(),
        ]);

        // فاتورة مورد مشتريات خامات بضريبة مدخلات 14%
        SupplierInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'invoice_number' => 'SUPP-VAT-01',
            'internal_reference' => 'REF-SUPP-01',
            'supplier_id' => $supplier->id,
            'purchase_order_id' => $po->id,
            'subtotal' => 6000,
            'tax_amount' => 840,
            'total_amount' => 6840,
            'paid_amount' => 6840,
            'payment_status' => 'paid',
            'is_posted' => true,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/vat-summary');

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(1400, $data['output_vat']['gross_output_vat']);
        $this->assertEquals(840, $data['input_vat']['gross_input_vat']);
        // صافي الضريبة المستحقة للسداد: 1400 - 840 = 560
        $this->assertEquals(560, $data['summary']['net_vat_payable']);
        $this->assertEquals('payable', $data['summary']['vat_status']);
        $this->assertStringContainsString('لا يعتبر إقراراً ضريبياً رسمياً معتمداً', $data['disclaimer']);
    }

    /**
     * 7. فحص كشف انحرافات تكلفة التصنيع وتتبع تبعية أجور المرحلة 9 (Phase 09 Dependency Integrity)
     */
    public function test_manufacturing_cost_variance_detects_phase_09_dependency(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-VAR-01',
            'name' => 'Girls Summer Dress',
            'category' => 'dresses',
            'season' => 'summer',
            'target_cost' => 80.0000, // التكلفة المعيارية المستهدفة 80 ج.م للقطعة
        ]);

        $branch = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'BR-01',
            'name' => 'Main Workshop',
        ]);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-VAR-001',
            'garment_model_id' => $model->id,
            'branch_id' => $branch->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'status' => 'in_progress',
        ]);

        // في البداية لا توجد سجلات أجور إنتاجية للقطعة (Phase 09 missing):
        // يجب أن يكتشف التقرير ذلك ويعلّم التبعية بأنها incomplete_dependency_phase_09
        $response1 = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson("/api/v1/accounting/reports/cost-variance?production_order_id={$order->id}");

        $response1->assertStatus(200);
        $data1 = $response1->json();
        $this->assertNotEmpty($data1['orders']);
        $orderRow1 = $data1['orders'][0];

        $this->assertEquals('incomplete_dependency_phase_09', $orderRow1['labor_dependency']['status']);
        $this->assertEquals('incomplete_data', $orderRow1['variance_category']);
        $this->assertStringContainsString('المرحلة 9', $orderRow1['labor_dependency']['note']);

        // الآن: تسجيل إنتاجية عمال وأجور فعلية (Phase 09 records simulated)
        $employee = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-SAYED-01',
            'name' => 'Sayed Worker',
            'phone' => '01000000000',
            'national_id' => '29000000000000',
            'department' => 'sewing',
            'job_title' => 'Sewing Operator',
            'pay_type' => 'piece_rate',
            'is_active' => true,
        ]);

        PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $employee->id,
            'production_order_id' => $order->id,
            'completed_quantity' => 100,
            'unit_rate' => 25.0000,
            'total_amount' => 2500.0000,
            'work_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        // صرف خامات مباشرة بقيمة 4,000 ج.م
        $warehouse = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Fabrics Store',
            'code' => 'W-FAB',
            'type' => 'raw_material',
        ]);

        $item = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $warehouse->id,
            'code' => 'ITM-FAB-01',
            'name' => 'Cotton Fabric',
            'unit_of_measure' => 'meters',
            'item_type' => 'raw_material',
            'current_balance' => 500,
            'average_cost' => 40.0000,
        ]);

        InventoryTransaction::create([
            'tenant_id' => $this->tenantA->id,
            'inventory_item_id' => $item->id,
            'warehouse_id' => $warehouse->id,
            'direction' => 'OUT',
            'quantity' => 100,
            'unit_cost' => 40.0000,
            'total_cost' => 4000.0000,
            'balance_before' => 500,
            'balance_after' => 400,
            'reference_type' => 'production_orders',
            'reference_id' => $order->id,
            'transaction_type' => 'material_issuance',
        ]);

        $response2 = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson("/api/v1/accounting/reports/cost-variance?production_order_id={$order->id}");

        $response2->assertStatus(200);
        $data2 = $response2->json();
        $orderRow2 = $data2['orders'][0];

        $this->assertEquals('verified', $orderRow2['labor_dependency']['status']);
        $this->assertEquals(8000, $orderRow2['standard_total_cost']); // 80 * 100
        $this->assertEquals(4000, $orderRow2['actual_cost_breakdown']['materials']);
        $this->assertEquals(2500, $orderRow2['actual_cost_breakdown']['labor']);
        // تكاليف غير مباشرة 15%: (4000 + 2500) * 0.15 = 975
        $this->assertEquals(975, $orderRow2['actual_cost_breakdown']['overhead']);
        // إجمالي التكلفة الفعلية = 4000 + 2500 + 975 = 7475
        $this->assertEquals(7475, $orderRow2['actual_total_cost']);
        // وفر إيجابي = 8000 - 7475 = 525 ج.م (favorable)
        $this->assertEquals(525, $orderRow2['variance_amount']);
        $this->assertEquals('favorable', $orderRow2['variance_category']);
    }

    /**
     * 8. فحص العزل التام للمستأجرين (Tenant Isolation): حظر تسريب الحسابات والبيانات المالية للمستأجر الآخر
     */
    public function test_tenant_isolation_prevents_cross_tenant_data_leakage(): void
    {
        // تهيئة حسابات المستأجر A
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cashA = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $revA = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $this->accountingService->createJournalEntry([
            'description' => 'قيد المستأجر A',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cashA->id, 'debit' => 99000, 'credit' => 0],
                ['account_id' => $revA->id, 'debit' => 0, 'credit' => 99000],
            ],
        ]);

        // تهيئة حسابات المستأجر B
        app()->instance('current_tenant_id', $this->tenantB->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantB->id);
        $cashB = ChartOfAccount::where('tenant_id', $this->tenantB->id)->where('code', '1011')->first();
        $revB = ChartOfAccount::where('tenant_id', $this->tenantB->id)->where('code', '4010')->first();
        $this->accountingService->createJournalEntry([
            'description' => 'قيد المستأجر B',
            'entry_date' => now()->toDateString(),
            'lines' => [
                ['account_id' => $cashB->id, 'debit' => 11000, 'credit' => 0],
                ['account_id' => $revB->id, 'debit' => 0, 'credit' => 11000],
            ],
        ]);

        // استعلام المستأجر B يجب ألا يرى أي مليم من الـ 99000 الخاصة بالمستأجر A
        $responseB = $this->actingAs($this->accountantB, 'sanctum')
            ->getJson('/api/v1/accounting/reports/trial-balance');

        $responseB->assertStatus(200);
        $dataB = $responseB->json();
        $this->assertEquals(11000, $dataB['totals']['period_debit']);
        $this->assertEquals($this->tenantB->id, $dataB['tenant_id']);
    }

    /**
     * 9. فحص الصلاحيات الأمنية (RBAC): حظر العامل ومندوب المبيعات من الاطلاع على القوائم المالية
     */
    public function test_role_authorization_blocks_unauthorized_users(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        // محاولة دخول عامل الإنتاج (worker)
        $responseWorker = $this->actingAs($this->workerA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/balance-sheet');

        $responseWorker->assertStatus(403)
            ->assertJson([
                'error' => 'UnauthorizedRole',
            ]);

        // مالك الشركة (company_owner) مسموح له بالوصول
        $responseOwner = $this->actingAs($this->ownerA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/balance-sheet');

        $responseOwner->assertStatus(200);
    }

    /**
     * 10. فحص دالة تطهير خلايا CSV ضد حقن المعادلات (Formula Injection / CWE-1236)
     * مع الحفاظ الصارم على الأرقام المالية السالبة والكسور العشرية والنسب المئوية المشروعة.
     */
    public function test_csv_sanitizer_neutralizes_formula_triggers_while_preserving_legitimate_numbers(): void
    {
        // محارف حقن خطيرة: يجب وضع بادئة الاقتباس '
        $this->assertEquals("'=SUM(A1:A10)", $this->reportService->sanitizeCsvCell('=SUM(A1:A10)'));
        $this->assertEquals("'+CMD|' /C calc'!A0", $this->reportService->sanitizeCsvCell("+CMD|' /C calc'!A0"));
        $this->assertEquals("'-2+3+cmd|' /C calc'!A0", $this->reportService->sanitizeCsvCell("-2+3+cmd|' /C calc'!A0"));
        $this->assertEquals("'@SUM(1,2)", $this->reportService->sanitizeCsvCell('@SUM(1,2)'));
        $this->assertEquals("'\t=1+1", $this->reportService->sanitizeCsvCell("\t=1+1"));
        $this->assertEquals("'  =cmd", $this->reportService->sanitizeCsvCell("  =cmd"));

        // أرقام مالية صريحة (بما فيها السالبة والكسور والأصفار): يجب عدم المساس بها للحفاظ على صحة العمليات الحسابية
        $this->assertEquals("-500.00", $this->reportService->sanitizeCsvCell("-500.00"));
        $this->assertEquals("-500", $this->reportService->sanitizeCsvCell(-500.00));
        $this->assertEquals("15000.75", $this->reportService->sanitizeCsvCell("15000.75"));
        $this->assertEquals("0.00", $this->reportService->sanitizeCsvCell("0.00"));
        $this->assertEquals("0", $this->reportService->sanitizeCsvCell(0));
        $this->assertEquals("-0.05", $this->reportService->sanitizeCsvCell("-0.05"));

        // نسب مئوية مشروعة: يجب الحفاظ عليها
        $this->assertEquals("12.5%", $this->reportService->sanitizeCsvCell("12.5%"));
        $this->assertEquals("-5.20%", $this->reportService->sanitizeCsvCell("-5.20%"));
        $this->assertEquals("+10%", $this->reportService->sanitizeCsvCell("+10%"));

        // نصوص عربية عادية: يجب عدم المساس بها
        $this->assertEquals("نقدية بالصندوق", $this->reportService->sanitizeCsvCell("نقدية بالصندوق"));
        $this->assertEquals("إيراد مبيعات تشغيل للغير", $this->reportService->sanitizeCsvCell("إيراد مبيعات تشغيل للغير"));
        $this->assertEquals("", $this->reportService->sanitizeCsvCell(null));
    }

    /**
     * 11. فحص تصدير CSV الفعلي لتحييد هجمات حقن المعادلات في البيانات المدخلة من المستخدم (مثل أرقام الأوامر وأسماء الموديلات)
     */
    public function test_cost_variance_csv_export_neutralizes_malicious_formula_injection_in_user_data(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-CSV-01',
            'name' => '@SUM(1+1)*cmd', // اسم موديل خبيث
            'category' => 'dresses',
            'season' => 'summer',
            'target_cost' => 50.0000,
        ]);

        $branch = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'BR-CSV',
            'name' => 'Branch CSV',
        ]);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => '=1+1', // رقم أمر خبيث يبدأ بـ =
            'garment_model_id' => $model->id,
            'branch_id' => $branch->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'total_planned_quantity' => 10,
            'total_completed_quantity' => 10,
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->accountantA, 'sanctum')
            ->get("/api/v1/accounting/reports/cost-variance?export=csv");

        $response->assertStatus(200);
        $content = $response->streamedContent();

        // التأكد من وضع بادئة ' لتحييد التنفيذ الخبيث
        $this->assertStringContainsString("'=1+1", $content);
        $this->assertStringContainsString("'@SUM(1+1)*cmd", $content);

        // التأكد من أن الأرقام المالية لم تتأثر وظلت نقية
        $this->assertStringContainsString("50.00", $content);
        $this->assertStringContainsString("500.00", $content);
    }

    /**
     * 12. فحص صرامة الحدود الزمنية للقوائم المالية واحتساب الأرباح المحتجزة التراكمية
     */
    public function test_financial_reports_respect_strict_date_boundaries_and_retained_earnings(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);

        $cash = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '1011')->first();
        $capital = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '3010')->first();
        $rev = ChartOfAccount::where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();

        // 1. قيد رأس مال في 2025-12-01
        $this->accountingService->createJournalEntry([
            'description' => 'رأس مال 2025',
            'entry_date' => '2025-12-01',
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 50000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 50000],
            ],
        ]);

        // 2. إيراد في الربع الأول: 2026-02-15
        $this->accountingService->createJournalEntry([
            'description' => 'مبيعات الربع الأول',
            'entry_date' => '2026-02-15',
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 12000, 'credit' => 0],
                ['account_id' => $rev->id, 'debit' => 0, 'credit' => 12000],
            ],
        ]);

        // 3. إيراد في الربع الثالث (مستقبلي بالنسبة للفلتر): 2026-08-20
        $this->accountingService->createJournalEntry([
            'description' => 'مبيعات الربع الثالث',
            'entry_date' => '2026-08-20',
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 30000, 'credit' => 0],
                ['account_id' => $rev->id, 'debit' => 0, 'credit' => 30000],
            ],
        ]);

        // استعلام قائمة الدخل لنطاق 2026-01-01 إلى 2026-03-31 (فقط الربع الأول)
        $incRes = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/income-statement?from_date=2026-01-01&to_date=2026-03-31');

        $incRes->assertStatus(200);
        $incData = $incRes->json();
        // إيراد الربع الأول فقط 12,000 (مع استبعاد 30,000 الخاصة بشهر 8 و 2025)
        $this->assertEquals(12000, $incData['revenue']['total_net_revenue']);

        // استعلام الميزانية العمومية كما في 2026-03-31
        $balRes = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson('/api/v1/accounting/reports/balance-sheet?as_of_date=2026-03-31');

        $balRes->assertStatus(200);
        $balData = $balRes->json();
        $this->assertTrue($balData['is_balanced']);
        // الأصول تشمل رأس المال 50,000 + مبيعات الربع الأول 12,000 = 62,000 (تستبعد 30,000 لشهر 8)
        $this->assertEquals(62000, $balData['assets']['total_assets']);
        $this->assertEquals(12000, $balData['equity']['retained_earnings']);
        $this->assertEquals(62000, $balData['total_liabilities_and_equity']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\CostCenter;
use App\Models\Customer;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountTransfer;
use App\Models\FiscalPeriod;
use App\Models\FiscalYear;
use App\Models\GarmentModel;
use App\Models\JournalEntry;
use App\Models\PaymentVoucher;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\SalesInvoice;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\TenantAccountMapping;
use App\Models\User;
use App\Services\AccountingService;
use App\Services\FinancialReportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class Batch5AccountingAndCostingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected string $tokenA;
    protected string $tokenB;
    protected AccountingService $accountingService;
    protected FinancialReportService $financialReportService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->accountingService = app(AccountingService::class);
        $this->financialReportService = app(FinancialReportService::class);

        $this->tenantA = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع النسيج الحديث - A',
            'code' => 'ACC-A-' . uniqid(),
            'subdomain' => 'acca-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المدير المالي A',
            'email' => 'cfo_a_' . uniqid() . '@factory-a.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
        ]);
        $this->tokenA = $this->userA->createToken('test')->plainTextToken;

        $this->tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع الدلتا للملابس - B',
            'code' => 'ACC-B-' . uniqid(),
            'subdomain' => 'accb-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'المدير المالي B',
            'email' => 'cfo_b_' . uniqid() . '@factory-b.com',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
        ]);
        $this->tokenB = $this->userB->createToken('test')->plainTextToken;

        // تعيين سياق المستأجر A افتراضياً
        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    /**
     * 1. اختبار تهيئة شجرة الحسابات الهرمية وحسابات الربط (Chart of Accounts & Account Mapping)
     */
    public function test_chart_of_accounts_initialization_and_hierarchy(): void
    {
        $response = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/accounts/init-default');

        $response->assertStatus(200);

        // التحقق من إنشاء الحسابات المستويات 1 و 2 و 3
        $assets = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1')->first();
        $this->assertNotNull($assets);
        $this->assertEquals(1, $assets->level);
        $this->assertFalse((bool)$assets->is_postable);

        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $this->assertNotNull($cash);
        $this->assertTrue((bool)$cash->is_postable);
        $this->assertTrue((bool)$cash->is_cash_bank);

        // التحقق من حسابات الربط الافتراضية
        $arMapping = TenantAccountMapping::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('mapping_key', 'ar_control')->first();
        $this->assertNotNull($arMapping);
        $this->assertEquals('1110', $arMapping->account->code);

        // منع الحساب من أن يكون أباً لنفسه
        $updateResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->putJson("/api/v1/accounting/accounts/{$cash->id}", [
                'parent_id' => $cash->id,
            ]);
        $updateResp->assertStatus(422);
    }

    /**
     * 2. اختبار اشتراط التوازن الدقيق لقيد اليومية ومنع الترحيل إلى حساب غير قابل للترحيل
     */
    public function test_journal_entry_balance_enforcement_and_non_postable_parent_block(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $revenue = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $parentAssets = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1')->first();

        // تجربة إرسال قيد غير متوازن
        $unbalancedResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'قيد غير متوازن',
                'lines' => [
                    ['account_id' => $cash->id, 'debit' => 1000, 'credit' => 0],
                    ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 900], // فرق 100
                ],
            ]);
        $unbalancedResp->assertStatus(422);

        // تجربة ترحيل مباشر إلى حساب رئيسي غير قابل للترحيل
        $parentResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'قيد على حساب رئيسي',
                'lines' => [
                    ['account_id' => $parentAssets->id, 'debit' => 500, 'credit' => 0],
                    ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 500],
                ],
            ]);
        $parentResp->assertStatus(422);

        // قيد متوازن سليم
        $balancedResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'إيراد نقدي سليم',
                'lines' => [
                    ['account_id' => $cash->id, 'debit' => 5000, 'credit' => 0],
                    ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 5000],
                ],
            ]);
        $balancedResp->assertStatus(201);

        $cash->refresh();
        $revenue->refresh();
        $this->assertEquals(5000, (float)$cash->current_balance);
        $this->assertEquals(5000, (float)$revenue->current_balance);
    }

    /**
     * 3. اختبار عكس القيد المحاسبي وحفظ الأثر التراجعي دون تعديل أو حذف القيد الأصلي
     */
    public function test_journal_entry_reversal_creates_compensating_entry(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $capital = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '3010')->first();

        $entry = $this->accountingService->createJournalEntry([
            'tenant_id' => $this->tenantA->id,
            'description' => 'إيداع رأس مال أصلي',
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 20000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 20000],
            ],
        ]);

        $this->assertEquals(20000, (float)$cash->fresh()->current_balance);

        // عكس القيد عبر الـ API
        $revResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/journal-entries/{$entry->id}/reverse", [
                'reversal_reason' => 'خطأ في تحديد قيمة الإيداع',
            ]);

        $revResp->assertStatus(200);

        $entry->refresh();
        $this->assertEquals('reversed', $entry->status);
        $this->assertEquals('خطأ في تحديد قيمة الإيداع', $entry->reversal_reason);

        // التحقق من عودة الرصيد إلى صفر بعد القيد العكسي
        $this->assertEquals(0, (float)$cash->fresh()->current_balance);
        $this->assertEquals(0, (float)$capital->fresh()->current_balance);

        // منع عكس القيد مرة ثانية
        $this->expectException(\InvalidArgumentException::class);
        $this->accountingService->reverseJournalEntry($entry->id, 'عكس مكرر');
    }

    /**
     * 4. اختبار الفترات المالية: منع الترحيل في فترة مقفلة وإعادة الفتح بسبب معتمد
     */
    public function test_fiscal_period_posting_guard_and_reopen_workflow(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $revenue = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();

        // إنشاء سنة مالية 2026
        $yearResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/fiscal-years', [
                'name' => 'السنة المالية 2026',
                'start_date' => '2026-01-01',
                'end_date' => '2026-12-31',
                'periods_count' => 12,
            ]);
        $yearResp->assertStatus(201);

        $period1 = FiscalPeriod::where('tenant_id', $this->tenantA->id)->where('period_number', 1)->first();
        $this->assertNotNull($period1);

        // إغلاق الفترة الأولى (يناير 2026)
        $closeResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/fiscal-periods/{$period1->id}/close");
        $closeResp->assertStatus(200);
        $this->assertEquals('closed', $period1->fresh()->status);

        // محاولة ترحيل قيد في تاريخ الفترة المقفلة (2026-01-15)
        $blockedResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'قيد في شهر يناير المقفل',
                'entry_date' => '2026-01-15',
                'lines' => [
                    ['account_id' => $cash->id, 'debit' => 100, 'credit' => 0],
                    ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 100],
                ],
            ]);
        $blockedResp->assertStatus(422);

        // إعادة فتح الفترة بسبب معتمد
        $reopenResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/fiscal-periods/{$period1->id}/reopen", [
                'reason' => 'تسوية تسليمات نهاية شهر يناير بموافقة الإدارة المالية',
            ]);
        $reopenResp->assertStatus(200);

        // الآن ينجح الترحيل في نفس التاريخ
        $successResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'قيد في شهر يناير بعد إعادة الفتح',
                'entry_date' => '2026-01-15',
                'lines' => [
                    ['account_id' => $cash->id, 'debit' => 100, 'credit' => 0],
                    ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 100],
                ],
            ]);
        $successResp->assertStatus(201);
    }

    /**
     * 5. اختبار الحسابات المالية (خزائن وبنوك) والتحويلات الداخلية وترحيل القيد آلياً
     */
    public function test_financial_accounts_and_inter_account_transfers(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cashCoa = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $bankCoa = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1020')->first();

        // إنشاء خزينة رئيسية برصيد افتتاحي 15000
        $vaultResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/financial-accounts', [
                'chart_of_account_id' => $cashCoa->id,
                'code' => 'VLT-01',
                'name' => 'خزينة الفرع الرئيسي',
                'type' => 'cash',
                'opening_balance' => 15000,
            ]);
        $vaultResp->assertStatus(201);
        $vaultId = $vaultResp->json('financial_account.id');

        // إنشاء حساب بنكي برصيد افتتاحي 5000
        $bankResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/financial-accounts', [
                'chart_of_account_id' => $bankCoa->id,
                'code' => 'BNK-CIB',
                'name' => 'البنك التجاري الدولي الجاري',
                'type' => 'bank',
                'bank_name' => 'CIB Egypt',
                'opening_balance' => 5000,
            ]);
        $bankResp->assertStatus(201);
        $bankId = $bankResp->json('financial_account.id');

        // تنفيذ تحويل مالي من الخزينة إلى البنك بمبلغ 4000
        $transferResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/transfers', [
                'from_financial_account_id' => $vaultId,
                'to_financial_account_id' => $bankId,
                'amount' => 4000,
                'notes' => 'إيداع نقدي بالبنك',
            ]);
        $transferResp->assertStatus(201);

        $transferId = $transferResp->json('transfer.id');

        // التحقق من الأرصدة
        $vault = FinancialAccount::find($vaultId);
        $bank = FinancialAccount::find($bankId);
        $this->assertEquals(11000, (float)$vault->current_balance);
        $this->assertEquals(9000, (float)$bank->current_balance);

        // التحقق من إنشاء قيد اليومية المتوازن تلقائياً للتحويل
        $jeId = $transferResp->json('transfer.journal_entry_id');
        $je = JournalEntry::find($jeId);
        $this->assertNotNull($je);
        $this->assertEquals(4000, (float)$je->total_debit);
        $this->assertEquals(4000, (float)$je->total_credit);

        // تجربة تحويل مبلغ أكبر من رصيد الخزينة (منع السحب على المكشوف)
        $overdraftResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/transfers', [
                'from_financial_account_id' => $vaultId,
                'to_financial_account_id' => $bankId,
                'amount' => 20000,
            ]);
        $overdraftResp->assertStatus(422);

        // إلغاء وعكس التحويل المالي
        $revTransferResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/transfers/{$transferId}/reverse", [
                'reversal_reason' => 'إلغاء الإيداع بناء على طلب المحاسب',
            ]);
        $revTransferResp->assertStatus(200);

        $this->assertEquals(15000, (float)$vault->fresh()->current_balance);
        $this->assertEquals(5000, (float)$bank->fresh()->current_balance);
    }

    /**
     * 6. اختبار مراكز التكلفة (Cost Centers) وربطها بسطور قيود اليومية
     */
    public function test_cost_centers_creation_and_journal_linking(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $expense = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '6010')->first();

        // إنشاء مركز تكلفة: قسم القص والتشغيل
        $ccResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/cost-centers', [
                'code' => 'CC-CUT',
                'name' => 'قسم القص والتفصيل',
                'description' => 'تكاليف صيانة وتجهيز صالة القص',
            ]);
        $ccResp->assertStatus(201);
        $ccId = $ccResp->json('cost_center.id');

        // تسجيل قيد مصروف مربوط بمركز التكلفة
        $jeResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/accounting/journal-entries', [
                'description' => 'صيانة شفرات ماكينات القص',
                'lines' => [
                    ['account_id' => $expense->id, 'debit' => 1200, 'credit' => 0, 'cost_center_id' => $ccId],
                    ['account_id' => $cash->id, 'debit' => 0, 'credit' => 1200],
                ],
            ]);
        $jeResp->assertStatus(201);

        $line = $jeResp->json('journal_entry.lines.0');
        $this->assertEquals($ccId, $line['cost_center_id']);
    }

    /**
     * 7. اختبار مطابقة حسابات المراقبة العامة مع السجلات الفرعية (AR / AP Reconciliation)
     */
    public function test_ar_and_ap_general_ledger_reconciliation(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $arAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1110')->first();

        // عميل برصيد افتتاحي في السجل الفرعي
        Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-REC-01',
            'name' => 'شركة الموضة للتوزيع',
            'opening_balance' => 8500.00,
        ]);

        // مطابقة قبل تحديث حساب المراقبة -> وجود انحراف (discrepancy)
        $reconResp1 = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/accounting/reconciliation/ar');
        $reconResp1->assertStatus(200);
        $this->assertFalse($reconResp1->json('is_matched'));
        $this->assertEquals(-8500, (float)$reconResp1->json('variance'));

        // قيد استحقاق المبيعات لمطابقة الأستاذ العام
        $salesAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $this->accountingService->createJournalEntry([
            'tenant_id' => $this->tenantA->id,
            'description' => 'قيد استحقاق مبيعات مطابقة',
            'lines' => [
                ['account_id' => $arAccount->id, 'debit' => 8500, 'credit' => 0],
                ['account_id' => $salesAccount->id, 'debit' => 0, 'credit' => 8500],
            ],
        ]);

        // مطابقة بعد القيد -> تطابق تام (matched)
        $reconResp2 = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/accounting/reconciliation/ar');
        $reconResp2->assertStatus(200);
        $this->assertTrue($reconResp2->json('is_matched'));
        $this->assertEquals(0, (float)$reconResp2->json('variance'));
    }

    /**
     * 8. اختبار محرك التكاليف الصناعية: استيعاب الهالك ومنع القسمة على الصفر واستبعاد خامات تشغيل الغير CMT
     */
    public function test_manufacturing_costing_engine_and_cmt_isolation(): void
    {
        $garment = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'قميص رجالي كلاسيك',
            'code' => 'SHIRT-CLS-01',
            'category' => 'men',
        ]);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $garment->id,
            'order_number' => 'PO-COST-001',
            'order_type' => 'regular',
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(14)->toDateString(),
            'total_quantity' => 100,
            'total_completed_quantity' => 100,
            'status' => 'completed',
        ]);

        // حساب التكلفة بتكاليف خامات وأجور وتكاليف غير مباشرة بنسبة أجور
        $costResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/cost-sheets/{$order->id}/calculate", [
                'direct_materials_cost' => 3000,
                'direct_labor_cost' => 1500,
                'applied_overhead_rate' => 0.20, // 20% أجور = 300
                'overhead_allocation_method' => 'direct_labor_cost_pct',
                'planned_total_cost' => 4500,
            ]);

        $costResp->assertStatus(200);
        $sheet = $costResp->json('cost_sheet');
        $this->assertEquals(4800, (float)$sheet['total_cost']); // 3000 + 1500 + 300
        $this->assertEquals(48, (float)$sheet['cost_per_piece']); // 4800 / 100
        $this->assertEquals(300, (float)$sheet['variance_amount']); // 4800 - 4500

        // اعتماد بطاقة التكلفة
        $approveResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/accounting/cost-sheets/{$sheet['id']}/approve");
        $approveResp->assertStatus(200);
        $this->assertEquals('approved', $approveResp->json('cost_sheet.status'));

        // فحص تشغيل الغير (CMT): أمر إنتاج CMT يستبعد تكلفة الخامات الموردة من العميل
        $cmtOrder = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $garment->id,
            'order_number' => 'PO-CMT-002',
            'order_type' => 'cmt',
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(14)->toDateString(),
            'total_quantity' => 200,
            'total_completed_quantity' => 200,
            'status' => 'completed',
        ]);

        $cmtCost = $this->accountingService->calculateProductionCost($cmtOrder->id, [
            'direct_labor_cost' => 2000,
            'applied_overhead_rate' => 0.10,
        ]);

        $this->assertEquals(0, (float)$cmtCost->direct_materials_cost);
        $this->assertEquals(2000, (float)$cmtCost->direct_labor_cost);
        $this->assertEquals(2200, (float)$cmtCost->total_cost);
    }

    /**
     * 9. اختبار التقارير المالية: ميزان المراجعة، قائمة الدخل، الميزانية العمومية محسوبة من قيود حقيقية فقط
     */
    public function test_financial_reports_derived_strictly_from_real_transactions(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $cash = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $revenue = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();
        $cogs = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '5010')->first();
        $inventory = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1230')->first();

        // 1. بيع نقدي بمبلغ 10000
        $this->accountingService->createJournalEntry([
            'tenant_id' => $this->tenantA->id,
            'description' => 'مبيعات نقدية شهرية',
            'lines' => [
                ['account_id' => $cash->id, 'debit' => 10000, 'credit' => 0],
                ['account_id' => $revenue->id, 'debit' => 0, 'credit' => 10000],
            ],
        ]);

        // 2. إثبات تكلفة البضاعة المباعة 6000
        $this->accountingService->createJournalEntry([
            'tenant_id' => $this->tenantA->id,
            'description' => 'تكلفة البضاعة المباعة',
            'lines' => [
                ['account_id' => $cogs->id, 'debit' => 6000, 'credit' => 0],
                ['account_id' => $inventory->id, 'debit' => 0, 'credit' => 6000],
            ],
        ]);

        // تقرير ميزان المراجعة
        $tbResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/accounting/reports/trial-balance');
        $tbResp->assertStatus(200);
        $this->assertTrue($tbResp->json('is_balanced'));
        $this->assertEquals(16000, (float)$tbResp->json('totals.period_debit'));
        $this->assertEquals(16000, (float)$tbResp->json('totals.period_credit'));

        // تقرير قائمة الدخل
        $isResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/accounting/reports/income-statement');
        $isResp->assertStatus(200);
        $this->assertEquals(10000, (float)$isResp->json('revenue.total_net_revenue'));
        $this->assertEquals(6000, (float)$isResp->json('cost_of_goods_sold.total_cogs'));
        $this->assertEquals(4000, (float)$isResp->json('gross_profit'));
        $this->assertEquals(4000, (float)$isResp->json('net_profit'));

        // تقرير الميزانية العمومية
        $bsResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/accounting/reports/balance-sheet');
        $bsResp->assertStatus(200);
        $this->assertEquals(4000, (float)$bsResp->json('assets.total_assets')); // 10000 cash - 6000 inventory
        $this->assertTrue($bsResp->json('is_balanced'));
    }

    /**
     * 10. اختبار العزل الصارم بين المستأجرين (Multi-tenant Isolation)
     */
    public function test_strict_multi_tenant_financial_isolation(): void
    {
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantA->id);
        $this->accountingService->initializeDefaultChartOfAccounts($this->tenantB->id);

        $cashA = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '1010')->first();
        $revA = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', '4010')->first();

        // قيد للمستأجر A بمبلغ 77000
        $this->accountingService->createJournalEntry([
            'tenant_id' => $this->tenantA->id,
            'description' => 'قيد المستأجر A الخاص',
            'lines' => [
                ['account_id' => $cashA->id, 'debit' => 77000, 'credit' => 0],
                ['account_id' => $revA->id, 'debit' => 0, 'credit' => 77000],
            ],
        ]);

        // فحص قيود المستأجر B عبر API المستأجر B
        $bEntriesResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->getJson('/api/v1/accounting/journal-entries');
        $bEntriesResp->assertStatus(200);
        $this->assertEquals(0, $bEntriesResp->json('total'));

        // فحص ميزان مراجعة المستأجر B: لا يحتوي على أي من حركات المستأجر A
        $bTbResp = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->getJson('/api/v1/accounting/reports/trial-balance');
        $bTbResp->assertStatus(200);
        $this->assertEquals(0, (float)$bTbResp->json('summary.total_period_debit'));
    }
}

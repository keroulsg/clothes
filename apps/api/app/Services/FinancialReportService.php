<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\JobInvoice;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\PurchaseReturn;
use App\Models\SalesInvoice;
use App\Models\SalesReturn;
use App\Models\SupplierInvoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FinancialReportService
{
    public function __construct(
        protected AccountingService $accountingService
    ) {}

    /**
     * ميزان المراجعة الآلي (Automated Trial Balance)
     * يعتمد حصرياً على قيود اليومية المرحلة (posted) وفق معايير المحاسبة المزدوجة الصارمة.
     */
    public function getTrialBalance(string $tenantId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->orderBy('code')
            ->get();

        if ($accounts->isEmpty()) {
            $this->accountingService->initializeDefaultChartOfAccounts($tenantId);
            $accounts = ChartOfAccount::where('tenant_id', $tenantId)
                ->orderBy('code')
                ->get();
        }

        $rows = [];
        $totalOpeningDebit = 0.0;
        $totalOpeningCredit = 0.0;
        $totalPeriodDebit = 0.0;
        $totalPeriodCredit = 0.0;
        $totalClosingDebit = 0.0;
        $totalClosingCredit = 0.0;

        foreach ($accounts as $account) {
            // 1. حساب رصيد أول المدة (Opening Balance قبل تاريخ fromDate)
            $openingDebit = 0.0;
            $openingCredit = 0.0;
            $openingNet = 0.0;

            if ($fromDate) {
                $openingQuery = JournalEntryLine::where('tenant_id', $tenantId)
                    ->where('account_id', $account->id)
                    ->whereHas('journalEntry', function ($q) use ($fromDate) {
                        $q->where('status', 'posted')
                          ->whereDate('entry_date', '<', $fromDate);
                    });

                $sumOpDebit = (float) (clone $openingQuery)->sum('debit');
                $sumOpCredit = (float) (clone $openingQuery)->sum('credit');

                if (in_array($account->type, ['asset', 'expense'])) {
                    $openingNet = round($sumOpDebit - $sumOpCredit, 4);
                    if ($openingNet >= 0) {
                        $openingDebit = $openingNet;
                    } else {
                        $openingCredit = abs($openingNet);
                    }
                } else {
                    $openingNet = round($sumOpCredit - $sumOpDebit, 4);
                    if ($openingNet >= 0) {
                        $openingCredit = $openingNet;
                    } else {
                        $openingDebit = abs($openingNet);
                    }
                }
            }

            // 2. حساب حركة الفترة الحالية (Period Activity)
            $periodQuery = JournalEntryLine::where('tenant_id', $tenantId)
                ->where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate) {
                    $q->where('status', 'posted');
                    if ($fromDate) {
                        $q->whereDate('entry_date', '>=', $fromDate);
                    }
                    if ($toDate) {
                        $q->whereDate('entry_date', '<=', $toDate);
                    }
                });

            $periodDebit = round((float) (clone $periodQuery)->sum('debit'), 4);
            $periodCredit = round((float) (clone $periodQuery)->sum('credit'), 4);

            // 3. حساب رصيد نهاية المدة (Closing Balance)
            $closingDebit = 0.0;
            $closingCredit = 0.0;

            if (in_array($account->type, ['asset', 'expense'])) {
                $closingNet = round(($openingDebit - $openingCredit) + ($periodDebit - $periodCredit), 4);
                if ($closingNet >= 0) {
                    $closingDebit = $closingNet;
                } else {
                    $closingCredit = abs($closingNet);
                }
            } else {
                $closingNet = round(($openingCredit - $openingDebit) + ($periodCredit - $periodDebit), 4);
                if ($closingNet >= 0) {
                    $closingCredit = $closingNet;
                } else {
                    $closingDebit = abs($closingNet);
                }
            }

            $totalOpeningDebit += $openingDebit;
            $totalOpeningCredit += $openingCredit;
            $totalPeriodDebit += $periodDebit;
            $totalPeriodCredit += $periodCredit;
            $totalClosingDebit += $closingDebit;
            $totalClosingCredit += $closingCredit;

            $rows[] = [
                'account_id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'category' => $account->category,
                'opening_debit' => $openingDebit,
                'opening_credit' => $openingCredit,
                'period_debit' => $periodDebit,
                'period_credit' => $periodCredit,
                'closing_debit' => $closingDebit,
                'closing_credit' => $closingCredit,
            ];
        }

        $totalOpeningDebit = round($totalOpeningDebit, 4);
        $totalOpeningCredit = round($totalOpeningCredit, 4);
        $totalPeriodDebit = round($totalPeriodDebit, 4);
        $totalPeriodCredit = round($totalPeriodCredit, 4);
        $totalClosingDebit = round($totalClosingDebit, 4);
        $totalClosingCredit = round($totalClosingCredit, 4);

        $isBalanced = abs($totalClosingDebit - $totalClosingCredit) < 0.0001;

        return [
            'report_name' => 'Trial Balance',
            'report_name_ar' => 'ميزان المراجعة',
            'tenant_id' => $tenantId,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'generated_at' => now()->toIso8601String(),
            'is_balanced' => $isBalanced,
            'difference' => round($totalClosingDebit - $totalClosingCredit, 4),
            'totals' => [
                'opening_debit' => $totalOpeningDebit,
                'opening_credit' => $totalOpeningCredit,
                'period_debit' => $totalPeriodDebit,
                'period_credit' => $totalPeriodCredit,
                'closing_debit' => $totalClosingDebit,
                'closing_credit' => $totalClosingCredit,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * قائمة الدخل (Income Statement / Profit & Loss)
     * تحتسب الإيرادات، وتكلفة المبيعات، ومجمل الربح، والمصاريف التشغيلية وصافي الربح.
     */
    public function getIncomeStatement(string $tenantId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?: Carbon::now()->startOfYear()->toDateString();
        $toDate = $toDate ?: Carbon::now()->toDateString();

        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->whereIn('type', ['revenue', 'expense'])
            ->orderBy('code')
            ->get();

        $revenueRows = [];
        $cogsRows = [];
        $operatingExpenseRows = [];
        $otherExpenseRows = [];

        $totalGrossRevenue = 0.0;
        $totalReturnsAndDiscounts = 0.0;
        $totalNetRevenue = 0.0;
        $totalCogs = 0.0;
        $totalOperatingExpenses = 0.0;
        $totalOtherExpenses = 0.0;

        foreach ($accounts as $account) {
            $lineQuery = JournalEntryLine::where('tenant_id', $tenantId)
                ->where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($fromDate, $toDate) {
                    $q->where('status', 'posted')
                      ->whereDate('entry_date', '>=', $fromDate)
                      ->whereDate('entry_date', '<=', $toDate);
                });

            $sumDebit = round((float) (clone $lineQuery)->sum('debit'), 4);
            $sumCredit = round((float) (clone $lineQuery)->sum('credit'), 4);

            if ($account->type === 'revenue') {
                $netRevenue = round($sumCredit - $sumDebit, 4);
                $grossRev = $sumCredit;
                $returns = $sumDebit;

                $totalGrossRevenue += $grossRev;
                $totalReturnsAndDiscounts += $returns;
                $totalNetRevenue += $netRevenue;

                $revenueRows[] = [
                    'account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'gross_revenue' => $grossRev,
                    'returns_discounts' => $returns,
                    'net_revenue' => $netRevenue,
                ];
            } elseif ($account->type === 'expense') {
                $netExpense = round($sumDebit - $sumCredit, 4);

                if ($account->category === 'direct_cost' || in_array($account->code, ['5010', '5020', '5030'])) {
                    $totalCogs += $netExpense;
                    $cogsRows[] = [
                        'account_id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                        'category' => $account->category,
                        'amount' => $netExpense,
                    ];
                } elseif ($account->category === 'other_expense') {
                    $totalOtherExpenses += $netExpense;
                    $otherExpenseRows[] = [
                        'account_id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                        'amount' => $netExpense,
                    ];
                } else {
                    $totalOperatingExpenses += $netExpense;
                    $operatingExpenseRows[] = [
                        'account_id' => $account->id,
                        'code' => $account->code,
                        'name' => $account->name,
                        'category' => $account->category,
                        'amount' => $netExpense,
                    ];
                }
            }
        }

        $totalGrossRevenue = round($totalGrossRevenue, 4);
        $totalReturnsAndDiscounts = round($totalReturnsAndDiscounts, 4);
        $totalNetRevenue = round($totalNetRevenue, 4);
        $totalCogs = round($totalCogs, 4);
        $grossProfit = round($totalNetRevenue - $totalCogs, 4);
        $totalOperatingExpenses = round($totalOperatingExpenses, 4);
        $operatingProfit = round($grossProfit - $totalOperatingExpenses, 4);
        $totalOtherExpenses = round($totalOtherExpenses, 4);
        $netProfit = round($operatingProfit - $totalOtherExpenses, 4);

        $grossMarginPercent = $totalNetRevenue > 0 ? round(($grossProfit / $totalNetRevenue) * 100, 2) : 0.0;
        $netMarginPercent = $totalNetRevenue > 0 ? round(($netProfit / $totalNetRevenue) * 100, 2) : 0.0;

        return [
            'report_name' => 'Income Statement',
            'report_name_ar' => 'قائمة الدخل والأرباح والخسائر',
            'tenant_id' => $tenantId,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'generated_at' => now()->toIso8601String(),
            'revenue' => [
                'items' => $revenueRows,
                'total_gross_revenue' => $totalGrossRevenue,
                'total_returns_discounts' => $totalReturnsAndDiscounts,
                'total_net_revenue' => $totalNetRevenue,
            ],
            'cost_of_goods_sold' => [
                'items' => $cogsRows,
                'total_cogs' => $totalCogs,
            ],
            'gross_profit' => $grossProfit,
            'gross_margin_percent' => $grossMarginPercent,
            'operating_expenses' => [
                'items' => $operatingExpenseRows,
                'total_operating_expenses' => $totalOperatingExpenses,
            ],
            'operating_profit' => $operatingProfit,
            'other_expenses' => [
                'items' => $otherExpenseRows,
                'total_other_expenses' => $totalOtherExpenses,
            ],
            'net_profit' => $netProfit,
            'net_margin_percent' => $netMarginPercent,
            'is_profitable' => $netProfit >= 0,
        ];
    }

    /**
     * الميزانية العمومية (Balance Sheet / Statement of Financial Position)
     * تطبق المعادلة المحاسبية الأساسية: الأصول = الخصوم + حقوق الملكية (+ صافي ربح الفترة الحالية)
     */
    public function getBalanceSheet(string $tenantId, ?string $asOfDate = null): array
    {
        $asOfDate = $asOfDate ?: Carbon::now()->toDateString();

        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->whereIn('type', ['asset', 'liability', 'equity'])
            ->orderBy('code')
            ->get();

        $currentAssets = [];
        $nonCurrentAssets = [];
        $currentLiabilities = [];
        $longTermLiabilities = [];
        $equityItems = [];

        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalStatedEquity = 0.0;

        foreach ($accounts as $account) {
            $lineQuery = JournalEntryLine::where('tenant_id', $tenantId)
                ->where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('status', 'posted')
                      ->whereDate('entry_date', '<=', $asOfDate);
                });

            $sumDebit = round((float) (clone $lineQuery)->sum('debit'), 4);
            $sumCredit = round((float) (clone $lineQuery)->sum('credit'), 4);

            if ($account->type === 'asset') {
                $balance = round($sumDebit - $sumCredit, 4);
                $totalAssets += $balance;

                $item = [
                    'account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'category' => $account->category,
                    'balance' => $balance,
                ];

                if ($account->category === 'current_asset') {
                    $currentAssets[] = $item;
                } else {
                    $nonCurrentAssets[] = $item;
                }
            } elseif ($account->type === 'liability') {
                $balance = round($sumCredit - $sumDebit, 4);
                $totalLiabilities += $balance;

                $item = [
                    'account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'category' => $account->category,
                    'balance' => $balance,
                ];

                if ($account->category === 'current_liability') {
                    $currentLiabilities[] = $item;
                } else {
                    $longTermLiabilities[] = $item;
                }
            } elseif ($account->type === 'equity') {
                $balance = round($sumCredit - $sumDebit, 4);
                $totalStatedEquity += $balance;

                $equityItems[] = [
                    'account_id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'category' => $account->category,
                    'balance' => $balance,
                ];
            }
        }

        // حساب الأرباح المحتجزة / صافي ربح الفترة المتراكم حتى تاريخ الميزانية
        // Net Income to date = Total Revenues (Cr - Dr) - Total Expenses (Dr - Cr)
        $revenueExpenseLines = JournalEntryLine::where('tenant_id', $tenantId)
            ->whereHas('account', function ($q) {
                $q->whereIn('type', ['revenue', 'expense']);
            })
            ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                $q->where('status', 'posted')
                  ->whereDate('entry_date', '<=', $asOfDate);
            })
            ->with('account')
            ->get();

        $accumulatedRevenue = 0.0;
        $accumulatedExpense = 0.0;

        foreach ($revenueExpenseLines as $line) {
            if ($line->account->type === 'revenue') {
                $accumulatedRevenue += ((float)$line->credit - (float)$line->debit);
            } else {
                $accumulatedExpense += ((float)$line->debit - (float)$line->credit);
            }
        }

        $retainedEarnings = round($accumulatedRevenue - $accumulatedExpense, 4);
        $totalEquity = round($totalStatedEquity + $retainedEarnings, 4);

        $totalAssets = round($totalAssets, 4);
        $totalLiabilities = round($totalLiabilities, 4);
        $totalLiabilitiesAndEquity = round($totalLiabilities + $totalEquity, 4);

        $difference = round($totalAssets - $totalLiabilitiesAndEquity, 4);
        $isBalanced = abs($difference) < 0.0001;

        return [
            'report_name' => 'Balance Sheet',
            'report_name_ar' => 'الميزانية العمومية',
            'tenant_id' => $tenantId,
            'as_of_date' => $asOfDate,
            'generated_at' => now()->toIso8601String(),
            'assets' => [
                'current_assets' => $currentAssets,
                'total_current_assets' => round(array_sum(array_column($currentAssets, 'balance')), 4),
                'non_current_assets' => $nonCurrentAssets,
                'total_non_current_assets' => round(array_sum(array_column($nonCurrentAssets, 'balance')), 4),
                'total_assets' => $totalAssets,
            ],
            'liabilities' => [
                'current_liabilities' => $currentLiabilities,
                'total_current_liabilities' => round(array_sum(array_column($currentLiabilities, 'balance')), 4),
                'long_term_liabilities' => $longTermLiabilities,
                'total_long_term_liabilities' => round(array_sum(array_column($longTermLiabilities, 'balance')), 4),
                'total_liabilities' => $totalLiabilities,
            ],
            'equity' => [
                'items' => $equityItems,
                'stated_equity' => $totalStatedEquity,
                'retained_earnings' => $retainedEarnings,
                'total_equity' => $totalEquity,
            ],
            'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
            'is_balanced' => $isBalanced,
            'discrepancy' => $difference,
            'diagnostics' => $isBalanced
                ? 'الميزانية متوازنة تماماً وفق المعادلة المحاسبية'
                : "تنبيه رقابي: يوجد عدم توازن بقيمة {$difference} ج.م بين الأصول والخصوم وحقوق الملكية",
        ];
    }

    /**
     * ملخص إقرار ضريبة القيمة المضافة (VAT Return Summary - نموذج 10 ضرائب)
     * يحصر ضريبة المخرجات من فواتير المبيعات وضريبة المدخلات من فواتير الموردين والمردودات.
     */
    public function getVatReturnSummary(string $tenantId, ?string $fromDate = null, ?string $toDate = null): array
    {
        $fromDate = $fromDate ?: Carbon::now()->startOfMonth()->toDateString();
        $toDate = $toDate ?: Carbon::now()->toDateString();

        // 1. مبيعات وضريبة المخرجات (Output VAT)
        $salesInvoices = SalesInvoice::where('tenant_id', $tenantId)
            ->whereDate('invoice_date', '>=', $fromDate)
            ->whereDate('invoice_date', '<=', $toDate)
            ->whereIn('status', ['paid', 'partially_paid', 'issued', 'partially_refunded', 'credited', 'refunded'])
            ->get();

        $grossSalesSubtotal = round((float) $salesInvoices->sum('subtotal'), 4);
        $grossOutputVat = round((float) $salesInvoices->sum('tax_amount'), 4);
        $grossSalesTotal = round((float) $salesInvoices->sum('total_amount'), 4);
        $salesInvoiceCount = $salesInvoices->count();

        // مرتجعات المبيعات في نفس الفترة (تسوية ضريبة المخرجات / إشعارات الدائن)
        $salesReturns = SalesReturn::where('tenant_id', $tenantId)
            ->whereDate('return_date', '>=', $fromDate)
            ->whereDate('return_date', '<=', $toDate)
            ->with('salesInvoice')
            ->get();

        $returnedSalesAmount = round((float) $salesReturns->sum('total_amount'), 4);
        $returnedOutputVat = 0.0;

        foreach ($salesReturns as $return) {
            if ($return->salesInvoice && $return->salesInvoice->subtotal > 0) {
                $effectiveRate = (float)$return->salesInvoice->tax_amount / (float)$return->salesInvoice->subtotal;
                $returnedOutputVat += round(((float)$return->total_amount / (1 + $effectiveRate)) * $effectiveRate, 4);
            }
        }
        $returnedOutputVat = round($returnedOutputVat, 4);
        $netTaxableSales = max(0, round($grossSalesSubtotal - ($returnedSalesAmount - $returnedOutputVat), 4));
        $netOutputVat = max(0, round($grossOutputVat - $returnedOutputVat, 4));

        // 2. مشتريات وضريبة المدخلات القابلة للخصم (Input VAT)
        $supplierInvoices = SupplierInvoice::where('tenant_id', $tenantId)
            ->whereDate('invoice_date', '>=', $fromDate)
            ->whereDate('invoice_date', '<=', $toDate)
            ->where('is_posted', true)
            ->get();

        $grossPurchasesSubtotal = round((float) $supplierInvoices->sum('subtotal'), 4);
        $grossInputVat = round((float) $supplierInvoices->sum('tax_amount'), 4);
        $grossPurchasesTotal = round((float) $supplierInvoices->sum('total_amount'), 4);
        $supplierInvoiceCount = $supplierInvoices->count();

        // مردودات المشتريات
        $purchaseReturns = PurchaseReturn::where('tenant_id', $tenantId)
            ->whereDate('return_date', '>=', $fromDate)
            ->whereDate('return_date', '<=', $toDate)
            ->get();

        $returnedPurchaseAmount = round((float) $purchaseReturns->sum('total_amount'), 4);
        $returnedInputVat = round((float) $purchaseReturns->sum('tax_amount'), 4);

        $netTaxablePurchases = max(0, round($grossPurchasesSubtotal - ($returnedPurchaseAmount - $returnedInputVat), 4));
        $netInputVat = max(0, round($grossInputVat - $returnedInputVat, 4));

        // 3. فواتير التشغيل للغير والخدمات الخارجية (Subcontracting / Job Invoices)
        $jobInvoices = JobInvoice::where('tenant_id', $tenantId)
            ->whereDate('invoice_date', '>=', $fromDate)
            ->whereDate('invoice_date', '<=', $toDate)
            ->get();

        $jobSubtotal = round((float) $jobInvoices->sum('subtotal'), 4);
        $jobVat = round((float) $jobInvoices->sum('tax_amount'), 4);

        // 4. صافي الضريبة المستحقة / المستردة
        $netVatPayable = round(($netOutputVat + $jobVat) - $netInputVat, 4);

        $vatStatus = 'zero';
        if ($netVatPayable > 0) {
            $vatStatus = 'payable'; // ضريبة مستحقة السداد للمصلحة
        } elseif ($netVatPayable < 0) {
            $vatStatus = 'refundable'; // رصيد ضريبي دائن مرحل للفترة القادمة
        }

        return [
            'report_name' => 'VAT Return Summary',
            'report_name_ar' => 'ملخص إقرار ضريبة القيمة المضافة',
            'tenant_id' => $tenantId,
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'generated_at' => now()->toIso8601String(),
            'output_vat' => [
                'gross_sales_subtotal' => $grossSalesSubtotal,
                'gross_output_vat' => $grossOutputVat,
                'gross_sales_total' => $grossSalesTotal,
                'invoices_count' => $salesInvoiceCount,
                'sales_returns_amount' => $returnedSalesAmount,
                'sales_returns_vat_deduction' => $returnedOutputVat,
                'returns_count' => $salesReturns->count(),
                'net_taxable_sales' => $netTaxableSales,
                'net_output_vat' => $netOutputVat,
            ],
            'input_vat' => [
                'gross_purchases_subtotal' => $grossPurchasesSubtotal,
                'gross_input_vat' => $grossInputVat,
                'gross_purchases_total' => $grossPurchasesTotal,
                'invoices_count' => $supplierInvoiceCount,
                'purchase_returns_amount' => $returnedPurchaseAmount,
                'purchase_returns_vat_deduction' => $returnedInputVat,
                'returns_count' => $purchaseReturns->count(),
                'net_taxable_purchases' => $netTaxablePurchases,
                'net_input_vat' => $netInputVat,
            ],
            'subcontracting_vat' => [
                'subtotal' => $jobSubtotal,
                'vat_amount' => $jobVat,
                'invoices_count' => $jobInvoices->count(),
            ],
            'summary' => [
                'net_vat_payable' => $netVatPayable,
                'vat_status' => $vatStatus,
                'effective_tax_rate' => $netTaxableSales > 0 ? round(($netOutputVat / $netTaxableSales) * 100, 2) : 14.0,
            ],
            'disclaimer' => 'تنبيه نظامي: هذا التقرير هو ملخص محاسبي داخلي لاحتساب الضريبة المستحقة وفق السجلات المسجلة بالمنظومة، ولا يعتبر إقراراً ضريبياً رسمياً معتمداً لدى مصلحة الضرائب المصرية إلا بعد مراجعته من المحاسب القانوني المعتمد.',
        ];
    }

    /**
     * كشف انحرافات تكلفة التصنيع الصناعي (Manufacturing Cost Variance Sheet)
     * يقارن التكلفة المعيارية (BOM / Target Cost) بالتكلفة الفعلية لأوامر الإنتاج.
     * يفحص تبعية المرحلة 9 (Phase 09 Labor) ويلتزم بعدم اختلاق تكاليف عمالة وهمية.
     */
    public function getManufacturingCostVariance(string $tenantId, ?string $productionOrderId = null): array
    {
        $query = ProductionOrder::where('tenant_id', $tenantId)
            ->with(['garmentModel', 'billOfMaterial.items.inventoryItem', 'branch']);

        if ($productionOrderId) {
            $query->where('id', $productionOrderId);
        } else {
            $query->latest()->limit(50);
        }

        $orders = $query->get();

        $rows = [];
        $totalStandardCost = 0.0;
        $totalActualCost = 0.0;
        $totalVariance = 0.0;

        foreach ($orders as $order) {
            $completedPieces = max(1, (int)($order->total_completed_quantity ?: ($order->total_planned_quantity ?: 1)));

            // 1. حساب التكلفة المعيارية (Standard Cost from BOM or Target Cost)
            $standardCostPerPiece = 0.0;
            $standardSource = 'none';
            $bomMaterialsCostPerPiece = 0.0;

            if ($order->billOfMaterial) {
                $standardCostPerPiece = (float) $order->billOfMaterial->total_estimated_cost_per_piece;
                $standardSource = 'bom';

                if ($standardCostPerPiece <= 0 && $order->billOfMaterial->items->isNotEmpty()) {
                    foreach ($order->billOfMaterial->items as $item) {
                        $wasteMultiplier = 1 + ((float)$item->waste_tolerance_percent / 100);
                        $itemCost = (float)$item->consumption_per_unit * $wasteMultiplier * (float)$item->unit_cost;
                        $bomMaterialsCostPerPiece += $itemCost;
                    }
                    $standardCostPerPiece = round($bomMaterialsCostPerPiece, 4);
                }
            }

            if ($standardCostPerPiece <= 0 && $order->garmentModel && (float)$order->garmentModel->target_cost > 0) {
                $standardCostPerPiece = (float)$order->garmentModel->target_cost;
                $standardSource = 'garment_model_target';
            }

            $standardTotalCost = round($standardCostPerPiece * $completedPieces, 4);

            // 2. حساب التكلفة الفعلية (Actual Cost from Inventory & Production Records)
            $costSheet = ProductionCostSheet::where('tenant_id', $tenantId)
                ->where('production_order_id', $order->id)
                ->first();

            $actualMaterialsCost = 0.0;
            $actualLaborCost = 0.0;
            $actualSubcontractCost = 0.0;
            $actualOverheadCost = 0.0;

            if ($costSheet) {
                $actualMaterialsCost = (float)$costSheet->direct_materials_cost;
                $actualLaborCost = (float)$costSheet->direct_labor_cost;
                $actualSubcontractCost = (float)$costSheet->subcontracted_services_cost;
                $actualOverheadCost = (float)$costSheet->allocated_overhead_cost;
            } else {
                // احتساب تكلفة الخامات المباشرة الفعلية من حركات المخزن
                $actualMaterialsCost = (float) DB::table('inventory_transactions')
                    ->where('tenant_id', $tenantId)
                    ->where('reference_type', 'production_orders')
                    ->where('reference_id', $order->id)
                    ->where('direction', 'OUT')
                    ->sum(DB::raw('quantity * unit_cost'));

                // فحص تكلفة أجور العمالة من سجلات إنتاجية القطعة الفعلية
                $actualLaborCost = (float) PieceWorkLog::where('tenant_id', $tenantId)
                    ->where('production_order_id', $order->id)
                    ->sum('total_amount');

                $actualOverheadCost = round(($actualMaterialsCost + $actualLaborCost) * 0.15, 4);
            }

            // 3. فحص تبعية المرحلة 9 لأجور العمالة (Phase 09 Dependency Integrity Check)
            $hasPieceWorkLogs = PieceWorkLog::where('tenant_id', $tenantId)
                ->where('production_order_id', $order->id)
                ->exists();

            $laborStatus = 'verified';
            $laborNote = 'بيانات أجور العمالة المباشرة مستندة لسجلات إنتاجية معتمدة';

            if (!$hasPieceWorkLogs && $actualLaborCost <= 0) {
                $laborStatus = 'incomplete_dependency_phase_09';
                $laborNote = 'بيانات أجور العمالة المباشرة غير متوفرة بعد أو معلقة على المرحلة 9 (Phase 09 Direct Labor & Piece-Rate)';
            }

            $actualTotalCost = round($actualMaterialsCost + $actualLaborCost + $actualSubcontractCost + $actualOverheadCost, 4);
            $actualCostPerPiece = $completedPieces > 0 ? round($actualTotalCost / $completedPieces, 4) : 0.0;

            // 4. احتساب الانحراف المالي ومقدار الوفر أو العجز
            $costVarianceAmount = round($standardTotalCost - $actualTotalCost, 4);
            $unitCostVariance = round($standardCostPerPiece - $actualCostPerPiece, 4);
            $variancePercentage = $standardTotalCost > 0
                ? round((($actualTotalCost - $standardTotalCost) / $standardTotalCost) * 100, 2)
                : 0.0;

            $varianceCategory = 'balanced';
            if ($laborStatus === 'incomplete_dependency_phase_09') {
                $varianceCategory = 'incomplete_data';
            } elseif ($costVarianceAmount > 0) {
                $varianceCategory = 'favorable'; // وفر في تكلفة التصنيع
            } elseif ($costVarianceAmount < 0) {
                $varianceCategory = 'unfavorable'; // تجاوز في تكلفة التصنيع
            }

            $totalStandardCost += $standardTotalCost;
            $totalActualCost += $actualTotalCost;
            $totalVariance += $costVarianceAmount;

            $rows[] = [
                'production_order_id' => $order->id,
                'order_number' => $order->order_number,
                'garment_model' => [
                    'id' => $order->garmentModel?->id,
                    'code' => $order->garmentModel?->code,
                    'name' => $order->garmentModel?->name,
                ],
                'completed_pieces' => $completedPieces,
                'standard_source' => $standardSource,
                'standard_cost_per_piece' => $standardCostPerPiece,
                'standard_total_cost' => $standardTotalCost,
                'actual_cost_breakdown' => [
                    'materials' => $actualMaterialsCost,
                    'labor' => $actualLaborCost,
                    'subcontract' => $actualSubcontractCost,
                    'overhead' => $actualOverheadCost,
                ],
                'actual_total_cost' => $actualTotalCost,
                'actual_cost_per_piece' => $actualCostPerPiece,
                'labor_dependency' => [
                    'status' => $laborStatus,
                    'note' => $laborNote,
                ],
                'variance_amount' => $costVarianceAmount,
                'unit_variance' => $unitCostVariance,
                'variance_percentage' => $variancePercentage,
                'variance_category' => $varianceCategory,
            ];
        }

        $totalStandardCost = round($totalStandardCost, 4);
        $totalActualCost = round($totalActualCost, 4);
        $totalVariance = round($totalVariance, 4);

        return [
            'report_name' => 'Manufacturing Cost Variance Sheet',
            'report_name_ar' => 'كشف انحرافات تكاليف التصنيع الصناعي',
            'tenant_id' => $tenantId,
            'generated_at' => now()->toIso8601String(),
            'totals' => [
                'orders_count' => count($rows),
                'total_standard_cost' => $totalStandardCost,
                'total_actual_cost' => $totalActualCost,
                'total_variance' => $totalVariance,
                'overall_status' => $totalVariance >= 0 ? 'favorable' : 'unfavorable',
            ],
            'orders' => $rows,
            'methodology_note' => 'تم احتساب التكاليف الفعلية بناء على الحركات المخزنية وسجلات الأجور المباشرة. يتم وسم الأوامر غير المكتملة بعلامة عدم اكتمال تبعية المرحلة 9 لمنع تضليل الإدارة المحاسبية بأجور صفرية وهمية.',
        ];
    }

    /**
     * تطهير خلايا CSV لمنع ثغرات حقن المعادلات (Spreadsheet Formula Injection - CWE-1236)
     * مع الحفاظ الصارم على الأرقام المالية، الأرصدة السالبة، الدقة العشرية، والنسب المئوية.
     * تنبيه: هذا التطهير يقلل مخاطر الحقن في عارضي CSV مثل Excel لكنه لا يقدم نفس ضمانات ملفات .xlsx الثنائية.
     */
    public function sanitizeCsvCell(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        $str = (string) $value;

        // 1. إذا كانت القيمة رقماً صريحاً (بما في ذلك الأرقام السالبة والكسور مثل -500.00 أو 150.25)
        // يتم الإبقاء عليها كما هي لضمان معاملتها كقيمة عددية في برامج الجداول
        if (is_numeric($str)) {
            return $str;
        }

        // 2. فحص البداية بعد إزالة المسافات ومحارف التحكم
        $trimmed = ltrim($str, " \t\r\n\0\x0B");

        if ($trimmed !== '') {
            $firstChar = $trimmed[0];

            // استثناء النسب المئوية العددية الصالحة (مثل 12.5% أو -5.0% أو +8%)
            if (($firstChar === '-' || $firstChar === '+') && preg_match('/^[+-]?\d+(\.\d+)?%$/', $trimmed)) {
                return $str;
            }

            // المحارف المشغلة للمعادلات في إكسيل (Formula triggers: =, +, -, @) أو محارف التحكم tab/CR في البداية
            if (in_array($firstChar, ['=', '+', '-', '@'], true) || str_starts_with($str, "\t") || str_starts_with($str, "\r")) {
                return "'" . $str;
            }
        }

        return $str;
    }

    /**
     * كتابة سطر CSV مرمز ومطهر عبر تمرير كل خلية على دالة التطهير
     */
    public function writeCsvRow($handle, array $row): void
    {
        $sanitized = array_map([$this, 'sanitizeCsvCell'], $row);
        fputcsv($handle, $sanitized);
    }

    /**
     * تصدير التقارير المالية بصيغة CSV متوافقة مع Excel (UTF-8 with BOM)
     */
    public function exportReportToCsv(string $reportType, array $data): StreamedResponse
    {
        $filename = "{$reportType}-" . date('Y-m-d-His') . ".csv";

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($reportType, $data) {
            $handle = fopen('php://output', 'w');
            // Write UTF-8 BOM so Microsoft Excel renders Arabic text properly without gibberish
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            switch ($reportType) {
                case 'trial-balance':
                    $this->writeCsvRow($handle, ['كود الحساب', 'اسم الحساب', 'نوع الحساب', 'رصيد أول مدة (مدين)', 'رصيد أول مدة (دائن)', 'حركة الفترة (مدين)', 'حركة الفترة (دائن)', 'رصيد آخر مدة (مدين)', 'رصيد آخر مدة (دائن)']);
                    foreach ($data['rows'] ?? [] as $row) {
                        $this->writeCsvRow($handle, [
                            $row['code'],
                            $row['name'],
                            $row['type'],
                            number_format($row['opening_debit'], 2, '.', ''),
                            number_format($row['opening_credit'], 2, '.', ''),
                            number_format($row['period_debit'], 2, '.', ''),
                            number_format($row['period_credit'], 2, '.', ''),
                            number_format($row['closing_debit'], 2, '.', ''),
                            number_format($row['closing_credit'], 2, '.', ''),
                        ]);
                    }
                    $tot = $data['totals'] ?? [];
                    $this->writeCsvRow($handle, [
                        'الإجمالي الكلي',
                        $data['is_balanced'] ? 'متوازن' : 'غير متوازن',
                        '',
                        number_format($tot['opening_debit'] ?? 0, 2, '.', ''),
                        number_format($tot['opening_credit'] ?? 0, 2, '.', ''),
                        number_format($tot['period_debit'] ?? 0, 2, '.', ''),
                        number_format($tot['period_credit'] ?? 0, 2, '.', ''),
                        number_format($tot['closing_debit'] ?? 0, 2, '.', ''),
                        number_format($tot['closing_credit'] ?? 0, 2, '.', ''),
                    ]);
                    break;

                case 'income-statement':
                    $this->writeCsvRow($handle, ['البند المحاسبي', 'القيمة بالجنيه المصري (EGP)']);
                    $this->writeCsvRow($handle, ['إجمالي إيرادات المبيعات', number_format($data['revenue']['total_gross_revenue'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['مردودات ومسموحات المبيعات (مدين)', number_format($data['revenue']['total_returns_discounts'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['صافي إيرادات المبيعات', number_format($data['revenue']['total_net_revenue'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['تكلفة البضاعة المباعة والتكاليف الصناعية المباشرة (COGS)', number_format($data['cost_of_goods_sold']['total_cogs'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['مجمل الربح (Gross Profit)', number_format($data['gross_profit'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['المصروفات التشغيلية والصناعية غير المباشرة', number_format($data['operating_expenses']['total_operating_expenses'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['صافي أرباح التشغيل (EBIT)', number_format($data['operating_profit'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['صافي الربح / الخسارة النهائي', number_format($data['net_profit'] ?? 0, 2, '.', '')]);
                    break;

                case 'balance-sheet':
                    $this->writeCsvRow($handle, ['التصنيف المالي', 'كود الحساب', 'اسم الحساب', 'الرصيد بالجنيه (EGP)']);
                    $this->writeCsvRow($handle, ['الأصول المتداولة', '', '', '']);
                    foreach ($data['assets']['current_assets'] ?? [] as $a) {
                        $this->writeCsvRow($handle, ['أصل متداول', $a['code'], $a['name'], number_format($a['balance'], 2, '.', '')]);
                    }
                    $this->writeCsvRow($handle, ['إجمالي الأصول', '', '', number_format($data['assets']['total_assets'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['الخصوم والالتزامات', '', '', '']);
                    foreach ($data['liabilities']['current_liabilities'] ?? [] as $l) {
                        $this->writeCsvRow($handle, ['التزام متداول', $l['code'], $l['name'], number_format($l['balance'], 2, '.', '')]);
                    }
                    $this->writeCsvRow($handle, ['إجمالي الالتزامات', '', '', number_format($data['liabilities']['total_liabilities'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['حقوق الملكية والأرباح المحتجزة', '', '', '']);
                    foreach ($data['equity']['items'] ?? [] as $e) {
                        $this->writeCsvRow($handle, ['حق ملكية', $e['code'], $e['name'], number_format($e['balance'], 2, '.', '')]);
                    }
                    $this->writeCsvRow($handle, ['صافي الأرباح المحتجزة / أرباح الفترة', '', '', number_format($data['equity']['retained_earnings'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['إجمالي الخصوم وحقوق الملكية', '', '', number_format($data['total_liabilities_and_equity'] ?? 0, 2, '.', '')]);
                    $this->writeCsvRow($handle, ['حالة توازن الميزانية', $data['is_balanced'] ? 'متوازنة' : 'غير متوازنة', '', number_format($data['discrepancy'] ?? 0, 2, '.', '')]);
                    break;

                case 'vat-summary':
                    $this->writeCsvRow($handle, ['بيان ضريبة القيمة المضافة', 'القيمة الخاضعة للضريبة', 'قيمة الضريبة (EGP)']);
                    $out = $data['output_vat'] ?? [];
                    $this->writeCsvRow($handle, ['مبيعات خاضعة للضريبة (مخرجات)', number_format($out['net_taxable_sales'] ?? 0, 2, '.', ''), number_format($out['net_output_vat'] ?? 0, 2, '.', '')]);
                    $in = $data['input_vat'] ?? [];
                    $this->writeCsvRow($handle, ['مشتريات ومدخلات قابلة للخصم', number_format($in['net_taxable_purchases'] ?? 0, 2, '.', ''), number_format($in['net_input_vat'] ?? 0, 2, '.', '')]);
                    $sub = $data['subcontracting_vat'] ?? [];
                    $this->writeCsvRow($handle, ['تشغيل للغير وعمليات خارجية', number_format($sub['subtotal'] ?? 0, 2, '.', ''), number_format($sub['vat_amount'] ?? 0, 2, '.', '')]);
                    $sum = $data['summary'] ?? [];
                    $this->writeCsvRow($handle, ['صافي الضريبة المستحقة / (الرصيد الدائن)', '', number_format($sum['net_vat_payable'] ?? 0, 2, '.', '')]);
                    break;

                case 'cost-variance':
                    $this->writeCsvRow($handle, ['رقم أمر الإنتاج', 'الموديل', 'الكمية التامة', 'التكلفة المعيارية للقطعة', 'إجمالي التكلفة المعيارية', 'إجمالي التكلفة الفعلية', 'الانحراف المالي (وفر/عجز)', 'نسبة الانحراف %', 'حالة اعتماد أجور المرحلة 9']);
                    foreach ($data['orders'] ?? [] as $ord) {
                        $this->writeCsvRow($handle, [
                            $ord['order_number'],
                            $ord['garment_model']['name'] ?? $ord['garment_model']['code'] ?? '-',
                            $ord['completed_pieces'],
                            number_format($ord['standard_cost_per_piece'], 2, '.', ''),
                            number_format($ord['standard_total_cost'], 2, '.', ''),
                            number_format($ord['actual_total_cost'], 2, '.', ''),
                            number_format($ord['variance_amount'], 2, '.', ''),
                            $ord['variance_percentage'] . '%',
                            $ord['labor_dependency']['status'],
                        ]);
                    }
                    $tot = $data['totals'] ?? [];
                    $this->writeCsvRow($handle, [
                        'الإجمالي',
                        '',
                        '',
                        '',
                        number_format($tot['total_standard_cost'] ?? 0, 2, '.', ''),
                        number_format($tot['total_actual_cost'] ?? 0, 2, '.', ''),
                        number_format($tot['total_variance'] ?? 0, 2, '.', ''),
                        '',
                        $tot['overall_status'] ?? '',
                    ]);
                    break;
            }

            fclose($handle);
        };

        return response()->streamDownload($callback, $filename, $headers);
    }
}

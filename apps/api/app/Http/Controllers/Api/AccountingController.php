<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentVoucher;
use App\Models\ProductionCostSheet;
use App\Services\AccountingService;
use App\Services\FinancialReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AccountingController extends Controller
{
    public function __construct(
        protected AccountingService $accountingService,
        protected FinancialReportService $financialReportService
    ) {}

    public function accounts(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)->orderBy('code')->get();

        if ($accounts->isEmpty()) {
            $this->accountingService->initializeDefaultChartOfAccounts($tenantId);
            $accounts = ChartOfAccount::where('tenant_id', $tenantId)->orderBy('code')->get();
        }

        return response()->json($accounts);
    }

    public function accountStatement(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $account = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($id);

        $query = JournalEntryLine::where('journal_entry_lines.tenant_id', $tenantId)
            ->where('journal_entry_lines.account_id', $account->id)
            ->with(['journalEntry:id,entry_number,entry_date,reference_type,description']);

        if ($request->filled('from_date')) {
            $query->whereHas('journalEntry', function ($q) use ($request) {
                $q->where('entry_date', '>=', $request->input('from_date'));
            });
        }

        if ($request->filled('to_date')) {
            $query->whereHas('journalEntry', function ($q) use ($request) {
                $q->where('entry_date', '<=', $request->input('to_date'));
            });
        }

        $lines = $query->join('journal_entries', 'journal_entry_lines.journal_entry_id', '=', 'journal_entries.id')
            ->orderBy('journal_entries.entry_date', 'asc')
            ->orderBy('journal_entries.created_at', 'asc')
            ->select('journal_entry_lines.*')
            ->get();

        $runningBalance = (float) ($account->opening_balance ?? 0);
        $isNormalDebit = in_array(strtolower($account->type), ['asset', 'expense']);

        $formattedLines = $lines->map(function ($line) use (&$runningBalance, $isNormalDebit) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;

            if ($isNormalDebit) {
                $runningBalance += ($debit - $credit);
            } else {
                $runningBalance += ($credit - $debit);
            }

            return [
                'id' => $line->id,
                'entry_id' => $line->journal_entry_id,
                'entry_number' => $line->journalEntry?->entry_number,
                'entry_date' => $line->journalEntry?->entry_date?->format('Y-m-d'),
                'reference_type' => $line->journalEntry?->reference_type,
                'description' => $line->description ?: $line->journalEntry?->description,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($runningBalance, 4),
            ];
        });

        $totalDebit = $lines->sum('debit');
        $totalCredit = $lines->sum('credit');

        return response()->json([
            'account' => $account,
            'summary' => [
                'opening_balance' => (float) ($account->opening_balance ?? 0),
                'total_debit' => round($totalDebit, 4),
                'total_credit' => round($totalCredit, 4),
                'closing_balance' => round($runningBalance, 4),
                'total_transactions' => $lines->count(),
            ],
            'lines' => $formattedLines,
        ]);
    }

    public function storeAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:asset,liability,equity,revenue,expense',
            'category' => 'required|string|max:50',
        ]);

        $tenantId = app('current_tenant_id');

        $account = ChartOfAccount::create([
            'tenant_id' => $tenantId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'type' => $validated['type'],
            'category' => $validated['category'],
            'current_balance' => 0,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء الحساب في شجرة الحسابات بنجاح',
            'account' => $account,
        ], 201);
    }

    public function journalEntries(): JsonResponse
    {
        $entries = JournalEntry::with('lines.account')->latest()->paginate(20);

        return response()->json($entries);
    }

    public function storeJournalEntry(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string',
            'entry_date' => 'nullable|date',
            'lines' => 'required|array|min:2',
            'lines.*.account_id' => 'required|uuid',
            'lines.*.description' => 'nullable|string',
            'lines.*.debit' => 'nullable|numeric|min:0',
            'lines.*.credit' => 'nullable|numeric|min:0',
            'lines.*.cost_center' => 'nullable|string',
        ]);

        try {
            $entry = $this->accountingService->createJournalEntry($validated);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => [
                    'lines' => [$e->getMessage()],
                ],
            ], 422);
        }

        return response()->json([
            'message' => 'تم تسجيل وترحيل قيد اليومية بنجاح',
            'journal_entry' => $entry,
        ], 201);
    }

    public function paymentVouchers(): JsonResponse
    {
        $vouchers = PaymentVoucher::with('account')->latest()->paginate(20);

        return response()->json($vouchers);
    }

    public function storePaymentVoucher(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'voucher_type' => 'required|string|in:receipt,payment',
            'party_type' => 'required|string|in:customer,supplier,employee,other',
            'party_name' => 'required|string|max:255',
            'account_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,bank_transfer,card,check',
            'voucher_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $voucher = $this->accountingService->createPaymentVoucher($validated);

        return response()->json([
            'message' => 'تم تسجيل السند المالي بنجاح',
            'voucher' => $voucher,
        ], 201);
    }

    public function costSheets(): JsonResponse
    {
        $sheets = ProductionCostSheet::with(['productionOrder', 'garmentModel'])->latest()->paginate(20);

        return response()->json($sheets);
    }

    public function calculateCost(Request $request, string $productionOrderId): JsonResponse
    {
        $overrides = $request->only([
            'direct_materials_cost',
            'direct_labor_cost',
            'subcontracted_services_cost',
            'applied_overhead_rate',
            'allocated_overhead_cost',
            'force_recalculate',
        ]);

        $sheet = $this->accountingService->calculateProductionCost($productionOrderId, $overrides);

        return response()->json([
            'message' => 'تم احتساب التكلفة الفعلية لأمر الإنتاج بنجاح',
            'cost_sheet' => $sheet,
        ]);
    }

    public function approveCostSheet(string $id): JsonResponse
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : auth()->user()->tenant_id;
        $sheet = ProductionCostSheet::where('tenant_id', $tenantId)->findOrFail($id);

        if ($sheet->total_produced_pieces <= 0 || (float)$sheet->cost_per_piece <= 0) {
            throw ValidationException::withMessages([
                'cost_sheet' => ['لا يمكن اعتماد بطاقة تكلفة صناعية لكمية سليمة تساوي صفر أو بتكلفة وحدة غير محسوبة.'],
            ]);
        }

        if ($sheet->status === 'approved') {
            return response()->json([
                'message' => 'بطاقة التكلفة معتمدة بالفعل',
                'cost_sheet' => $sheet,
            ]);
        }

        $sheet->status = 'approved';
        $sheet->save();

        try {
            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id(),
                'action' => 'cost_sheet.approved',
                'auditable_type' => ProductionCostSheet::class,
                'auditable_id' => $sheet->id,
                'new_values' => [
                    'status' => 'approved',
                    'total_cost' => $sheet->total_cost,
                    'cost_per_piece' => $sheet->cost_per_piece,
                ],
                'ip_address' => request()->ip(),
            ]);
        } catch (\Throwable $e) {
            // Non-blocking audit record
        }

        return response()->json([
            'message' => 'تم اعتماد بطاقة التكلفة الصناعية بنجاح وأصبحت نهائية وغير قابلة للتعديل',
            'cost_sheet' => $sheet,
        ]);
    }

    /**
     * تقرير ميزان المراجعة الآلي
     */
    public function trialBalance(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'export' => 'nullable|string|in:csv,xlsx',
        ]);

        $tenantId = app('current_tenant_id');
        $report = $this->financialReportService->getTrialBalance(
            $tenantId,
            $validated['from_date'] ?? null,
            $validated['to_date'] ?? null
        );

        if (($validated['export'] ?? null) === 'csv') {
            return $this->financialReportService->exportReportToCsv('trial-balance', $report);
        }

        return response()->json($report);
    }

    /**
     * تقرير قائمة الدخل (الأرباح والخسائر)
     */
    public function incomeStatement(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'export' => 'nullable|string|in:csv,xlsx',
        ]);

        $tenantId = app('current_tenant_id');
        $report = $this->financialReportService->getIncomeStatement(
            $tenantId,
            $validated['from_date'] ?? null,
            $validated['to_date'] ?? null
        );

        if (($validated['export'] ?? null) === 'csv') {
            return $this->financialReportService->exportReportToCsv('income-statement', $report);
        }

        return response()->json($report);
    }

    /**
     * تقرير الميزانية العمومية
     */
    public function balanceSheet(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'as_of_date' => 'nullable|date',
            'export' => 'nullable|string|in:csv,xlsx',
        ]);

        $tenantId = app('current_tenant_id');
        $report = $this->financialReportService->getBalanceSheet(
            $tenantId,
            $validated['as_of_date'] ?? null
        );

        if (($validated['export'] ?? null) === 'csv') {
            return $this->financialReportService->exportReportToCsv('balance-sheet', $report);
        }

        return response()->json($report);
    }

    /**
     * تقرير ملخص إقرار ضريبة القيمة المضافة
     */
    public function vatSummary(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'from_date' => 'nullable|date',
            'to_date' => 'nullable|date',
            'export' => 'nullable|string|in:csv,xlsx',
        ]);

        $tenantId = app('current_tenant_id');
        $report = $this->financialReportService->getVatReturnSummary(
            $tenantId,
            $validated['from_date'] ?? null,
            $validated['to_date'] ?? null
        );

        if (($validated['export'] ?? null) === 'csv') {
            return $this->financialReportService->exportReportToCsv('vat-summary', $report);
        }

        return response()->json($report);
    }

    /**
     * كشف انحرافات تكلفة التصنيع الصناعي
     */
    public function costVariance(Request $request): JsonResponse|StreamedResponse
    {
        $validated = $request->validate([
            'production_order_id' => 'nullable|uuid',
            'export' => 'nullable|string|in:csv,xlsx',
        ]);

        $tenantId = app('current_tenant_id');
        $report = $this->financialReportService->getManufacturingCostVariance(
            $tenantId,
            $validated['production_order_id'] ?? null
        );

        if (($validated['export'] ?? null) === 'csv') {
            return $this->financialReportService->exportReportToCsv('cost-variance', $report);
        }

        return response()->json($report);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\CostCenter;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountTransfer;
use App\Models\FiscalPeriod;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentVoucher;
use App\Models\ProductionCostSheet;
use App\Models\TenantAccountMapping;
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
        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->with('parent')
            ->orderBy('code')
            ->get();

        if ($accounts->isEmpty()) {
            $this->accountingService->initializeDefaultChartOfAccounts($tenantId);
            $accounts = ChartOfAccount::where('tenant_id', $tenantId)
                ->with('parent')
                ->orderBy('code')
                ->get();
        }

        return response()->json($accounts);
    }

    public function initDefaultAccounts(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $this->accountingService->initializeDefaultChartOfAccounts($tenantId);

        $accounts = ChartOfAccount::where('tenant_id', $tenantId)
            ->with('parent')
            ->orderBy('code')
            ->get();

        return response()->json([
            'message' => 'تم تهيئة شجرة الحسابات الافتراضية وحسابات الربط بنجاح',
            'accounts' => $accounts,
        ]);
    }

    public function getMappings(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $mappings = TenantAccountMapping::where('tenant_id', $tenantId)
            ->with('account')
            ->get();

        return response()->json($mappings);
    }

    public function setMapping(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mapping_key' => 'required|string|max:100',
            'account_id' => 'required|uuid',
            'contra_account_id' => 'nullable|uuid',
        ]);

        $tenantId = app('current_tenant_id');
        $mapping = $this->accountingService->setAccountMapping($tenantId, $validated['mapping_key'], $validated['account_id']);

        return response()->json([
            'message' => 'تم تحديث حساب الربط المالي بنجاح',
            'mapping' => $mapping->load('account'),
        ]);
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
            'name_en' => 'nullable|string|max:255',
            'type' => 'required|string|in:asset,liability,equity,revenue,expense',
            'category' => 'required|string|max:50',
            'parent_id' => 'nullable|uuid',
            'normal_balance' => 'nullable|string|in:debit,credit',
            'is_control_account' => 'nullable|boolean',
            'is_cash_bank' => 'nullable|boolean',
            'is_postable' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');

        // التحقق من تكرار كود الحساب للمستأجر
        if (ChartOfAccount::where('tenant_id', $tenantId)->where('code', $validated['code'])->exists()) {
            throw ValidationException::withMessages([
                'code' => ['كود الحساب المحاسبي مستخدم بالفعل لمصنعك.'],
            ]);
        }

        $level = 1;
        if (!empty($validated['parent_id'])) {
            $parent = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($validated['parent_id']);
            $level = ($parent->level ?? 1) + 1;
        }

        $account = ChartOfAccount::create([
            'tenant_id' => $tenantId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'name_en' => $validated['name_en'] ?? null,
            'type' => $validated['type'],
            'category' => $validated['category'],
            'parent_id' => $validated['parent_id'] ?? null,
            'level' => $level,
            'normal_balance' => $validated['normal_balance'] ?? (in_array($validated['type'], ['asset', 'expense']) ? 'debit' : 'credit'),
            'is_control_account' => $validated['is_control_account'] ?? false,
            'is_cash_bank' => $validated['is_cash_bank'] ?? false,
            'is_postable' => $validated['is_postable'] ?? true,
            'notes' => $validated['notes'] ?? null,
            'current_balance' => 0,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء الحساب في شجرة الحسابات بنجاح',
            'account' => $account->load('parent'),
        ], 201);
    }

    public function updateAccount(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $account = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'category' => 'sometimes|required|string|max:50',
            'parent_id' => 'nullable|uuid',
            'is_control_account' => 'nullable|boolean',
            'is_cash_bank' => 'nullable|boolean',
            'is_postable' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        // منع الحساب من أن يكون أباً لنفسه
        if (isset($validated['parent_id']) && $validated['parent_id'] === $account->id) {
            throw ValidationException::withMessages([
                'parent_id' => ['لا يمكن للحساب المحاسبي أن يكون أباً لنفسه.'],
            ]);
        }

        if (isset($validated['parent_id'])) {
            $account->parent_id = $validated['parent_id'];
            if ($validated['parent_id']) {
                $parent = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($validated['parent_id']);
                $account->level = ($parent->level ?? 1) + 1;
            } else {
                $account->level = 1;
            }
        }

        if (isset($validated['name'])) $account->name = $validated['name'];
        if (array_key_exists('name_en', $validated)) $account->name_en = $validated['name_en'];
        if (isset($validated['category'])) $account->category = $validated['category'];
        if (isset($validated['is_control_account'])) $account->is_control_account = $validated['is_control_account'];
        if (isset($validated['is_cash_bank'])) $account->is_cash_bank = $validated['is_cash_bank'];
        if (isset($validated['is_postable'])) $account->is_postable = $validated['is_postable'];
        if (isset($validated['is_active'])) $account->is_active = $validated['is_active'];
        if (array_key_exists('notes', $validated)) $account->notes = $validated['notes'];

        $account->save();

        return response()->json([
            'message' => 'تم تحديث الحساب بنجاح',
            'account' => $account->load('parent'),
        ]);
    }

    public function journalEntries(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $entries = JournalEntry::where('tenant_id', $tenantId)
            ->with(['lines.account', 'lines.costCenterRelation', 'reversedEntry', 'fiscalPeriod'])
            ->latest('entry_date')
            ->latest('created_at')
            ->paginate(20);

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
            'lines.*.cost_center_id' => 'nullable|uuid',
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

    public function reverseJournalEntry(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reversal_reason' => 'required|string|min:3|max:500',
        ]);

        $reversal = $this->accountingService->reverseJournalEntry($id, $validated['reversal_reason'], auth()->id());

        return response()->json([
            'message' => 'تم عكس القيد المحاسبي وإنشاء قيد التسوية العكسي بنجاح',
            'reversal_entry' => $reversal,
        ]);
    }

    // ==========================================
    // الخزائن والبنوك والحسابات المالية والتحويلات
    // ==========================================

    public function financialAccounts(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $accounts = FinancialAccount::where('tenant_id', $tenantId)
            ->with('chartOfAccount')
            ->orderBy('code')
            ->get();

        return response()->json($accounts);
    }

    public function storeFinancialAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'chart_of_account_id' => 'required|uuid',
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'type' => 'required|string|in:cash,bank,wallet',
            'account_number' => 'nullable|string|max:100',
            'bank_name' => 'nullable|string|max:255',
            'currency' => 'nullable|string|max:10',
            'opening_balance' => 'nullable|numeric',
        ]);

        $tenantId = app('current_tenant_id');
        $coa = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($validated['chart_of_account_id']);

        if (!$coa->is_active || !$coa->is_postable || !$coa->is_cash_bank) {
            throw Illuminate\Validation\ValidationException::withMessages([
                'chart_of_account_id' => ['يجب اختيار حساب خزينة أو بنك فرعي نشط وقابل للترحيل، وليس حساباً رئيسياً أو تجميعياً.'],
            ]);
        }

        $openingBal = round((float)($validated['opening_balance'] ?? 0), 4);

        $account = FinancialAccount::create([
            'tenant_id' => $tenantId,
            'chart_of_account_id' => $coa->id,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'name_en' => $validated['name_en'] ?? null,
            'type' => $validated['type'],
            'account_number' => $validated['account_number'] ?? null,
            'bank_name' => $validated['bank_name'] ?? null,
            'currency' => $validated['currency'] ?? 'EGP',
            'opening_balance' => $openingBal,
            'current_balance' => $openingBal,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء الحساب المالي (خزينة/بنك) بنجاح',
            'financial_account' => $account->load('chartOfAccount'),
        ], 201);
    }

    public function transfers(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $transfers = FinancialAccountTransfer::where('tenant_id', $tenantId)
            ->with(['fromAccount', 'toAccount', 'journalEntry'])
            ->latest('transfer_date')
            ->latest('created_at')
            ->paginate(20);

        return response()->json($transfers);
    }

    public function storeTransfer(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'from_financial_account_id' => 'required|uuid',
            'to_financial_account_id' => 'required|uuid',
            'amount' => 'required|numeric|min:0.01',
            'transfer_date' => 'nullable|date',
            'reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $transfer = $this->accountingService->transferFunds($validated);

        return response()->json([
            'message' => 'تم تنفيذ التحويل المالي الداخلي وترحيل القيد بنجاح',
            'transfer' => $transfer,
        ], 201);
    }

    public function reverseTransfer(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reversal_reason' => 'required|string|min:3|max:500',
        ]);

        $reversed = $this->accountingService->reverseTransfer($id, $validated['reversal_reason'], auth()->id());

        return response()->json([
            'message' => 'تم إلغاء وعكس التحويل المالي بنجاح',
            'transfer' => $reversed,
        ]);
    }

    // ==========================================
    // مراكز التكلفة (Cost Centers)
    // ==========================================

    public function costCenters(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $centers = CostCenter::where('tenant_id', $tenantId)
            ->with(['parent', 'children'])
            ->orderBy('code')
            ->get();

        $totalAllocatedExpenses = 0;

        foreach ($centers as $center) {
            $lines = JournalEntryLine::where('tenant_id', $tenantId)
                ->where(function ($q) use ($center) {
                    $q->where('cost_center_id', $center->id)
                      ->orWhere('cost_center', $center->code);
                })
                ->get();

            $totalDebit = (float)$lines->sum('debit');
            $totalCredit = (float)$lines->sum('credit');
            $netExpense = round($totalDebit - $totalCredit, 2);

            $center->total_expenses = max($netExpense, 0);
            $center->total_debit = $totalDebit;
            $center->total_credit = $totalCredit;
            $center->entries_count = $lines->count();

            $totalAllocatedExpenses += $center->total_expenses;
        }

        return response()->json($centers);
    }

    public function storeCostCenter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'parent_id' => 'nullable|uuid',
            'description' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');

        $center = CostCenter::create([
            'tenant_id' => $tenantId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'name_en' => $validated['name_en'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء مركز التكلفة بنجاح',
            'cost_center' => $center->load('parent'),
        ], 201);
    }

    public function updateCostCenter(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $center = CostCenter::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'parent_id' => 'nullable|uuid',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        $center->update([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'name_en' => $validated['name_en'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? $center->is_active,
        ]);

        return response()->json([
            'message' => 'تم تحديث بيانات مركز التكلفة بنجاح',
            'cost_center' => $center->load('parent'),
        ]);
    }

    public function deleteCostCenter(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $center = CostCenter::where('tenant_id', $tenantId)->findOrFail($id);

        $hasChildren = CostCenter::where('tenant_id', $tenantId)->where('parent_id', $id)->exists();
        if ($hasChildren) {
            return response()->json([
                'message' => 'لا يمكن حذف هذا المركز لأنه يحتوي على مراكز تكلفة فرعية تابعة له',
            ], 422);
        }

        $hasEntries = JournalEntryLine::where('tenant_id', $tenantId)
            ->where(function ($q) use ($center) {
                $q->where('cost_center_id', $center->id)
                  ->orWhere('cost_center', $center->code);
            })
            ->exists();

        if ($hasEntries) {
            return response()->json([
                'message' => 'لا يمكن حذف هذا المركز لوجود قيود ومصروفات مسجلة ومرحلة عليه. يمكنك تعطيله بدلاً من حذفه.',
            ], 422);
        }

        $center->delete();

        return response()->json([
            'message' => 'تم حذف مركز التكلفة بنجاح',
        ]);
    }

    public function seedDefaultCostCenters(): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $defaults = [
            [
                'code' => '100',
                'name' => 'مراكز الإنتاج المباشرة',
                'name_en' => 'Direct Production Centers',
                'description' => 'الورش والعنابر المسؤولة عن تحويل الخامات إلى ملابس جاهزة',
                'children' => [
                    ['code' => '101', 'name' => 'قسم القص وفرش الأقمشة', 'name_en' => 'Cutting Department', 'description' => 'عمليات فرد الأقمشة والباترون والقص الميكانيكي'],
                    ['code' => '102', 'name' => 'خطوط الخياطة والتجميع', 'name_en' => 'Sewing & Assembly Lines', 'description' => 'ماكينات الأوفر والسنجر وتجميع قطع الملابس'],
                    ['code' => '103', 'name' => 'قسم التشطيب والمكواة والتعبئة', 'name_en' => 'Finishing, Pressing & Packing', 'description' => 'الفحص النهائي والمكواة بالبخار والتغليف'],
                ],
            ],
            [
                'code' => '200',
                'name' => 'مراكز الخدمات الإنتاجية المساعدة',
                'name_en' => 'Production Support Centers',
                'description' => 'الأقسام المساندة لعمليات التصنيع وتجهيز الخامات والآلات',
                'children' => [
                    ['code' => '201', 'name' => 'ورشة صيانة الماكينات وقطع الغيار', 'name_en' => 'Machine Maintenance & Spare Parts', 'description' => 'صيانة خطوط الخياطة والمقصات ومولدات الكهرباء'],
                    ['code' => '202', 'name' => 'مستودع الأقمشة ومستلزمات الإنتاج', 'name_en' => 'Raw Materials & Accessories Warehouse', 'description' => 'تخزين الخامات والأزرار والخيوط والبطانات'],
                    ['code' => '203', 'name' => 'قسم مراقبة الجودة وفحص القماش', 'name_en' => 'Quality Control & Fabric Inspection', 'description' => 'معاينة عيوب النسيج والقياسات ومطابقة المواصفات'],
                ],
            ],
            [
                'code' => '300',
                'name' => 'مراكز التسويق والمبيعات والتوزيع',
                'name_en' => 'Sales, Marketing & Distribution',
                'description' => 'تسويق المنتجات التامة وتوزيع طلبيات وتوكيلات الملابس',
                'children' => [
                    ['code' => '301', 'name' => 'معرض ومنافذ بيع المصنع', 'name_en' => 'Factory Outlets & Showrooms', 'description' => 'منافذ البيع النقدية والمعارض التابعة للمصنع'],
                    ['code' => '302', 'name' => 'التسويق والشحن والتوصيل', 'name_en' => 'Marketing, Freight & Logistics', 'description' => 'حملات الدعاية وشحن الطلبيات لتجار الجملة'],
                ],
            ],
            [
                'code' => '400',
                'name' => 'الإدارة العامة والخدمات المشتركة',
                'name_en' => 'General Administration & Shared Services',
                'description' => 'إدارة المصنع، الحسابات، الموارد البشرية، والشؤون القانونية',
                'children' => [
                    ['code' => '401', 'name' => 'الإدارة العامة والمكتب التنفيذي', 'name_en' => 'Executive Management & Administration', 'description' => 'مصاريف المقر الإداري، الاتصالات، والخدمات المكتبية'],
                ],
            ],
        ];

        $createdCount = 0;

        foreach ($defaults as $parentData) {
            $children = $parentData['children'] ?? [];
            unset($parentData['children']);

            $parent = CostCenter::firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => $parentData['code']],
                [
                    'name' => $parentData['name'],
                    'name_en' => $parentData['name_en'],
                    'description' => $parentData['description'],
                    'is_active' => true,
                ]
            );
            $createdCount++;

            foreach ($children as $childData) {
                CostCenter::firstOrCreate(
                    ['tenant_id' => $tenantId, 'code' => $childData['code']],
                    [
                        'name' => $childData['name'],
                        'name_en' => $childData['name_en'],
                        'parent_id' => $parent->id,
                        'description' => $childData['description'],
                        'is_active' => true,
                    ]
                );
                $createdCount++;
            }
        }

        return response()->json([
            'message' => "تم توليد وتجهيز {$createdCount} مركز تكلفة معياري لمصنع الملابس بنجاح!",
        ]);
    }

    public function costCenterStatement(string $id, Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $center = CostCenter::where('tenant_id', $tenantId)->findOrFail($id);

        $query = JournalEntryLine::where('tenant_id', $tenantId)
            ->where(function ($q) use ($center) {
                $q->where('cost_center_id', $center->id)
                  ->orWhere('cost_center', $center->code);
            })
            ->with(['journalEntry', 'account']);

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

        $lines = $query->latest('created_at')->get();

        $totalDebit = (float)$lines->sum('debit');
        $totalCredit = (float)$lines->sum('credit');
        $netExpense = round($totalDebit - $totalCredit, 2);

        return response()->json([
            'cost_center' => $center->load('parent'),
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'net_expense' => $netExpense,
            'lines' => $lines,
        ]);
    }

    // ==========================================
    // السنوات والفترات المالية (Fiscal Periods)
    // ==========================================

    public function fiscalYears(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $years = FiscalYear::where('tenant_id', $tenantId)
            ->with(['periods' => function ($q) {
                $q->orderBy('period_number');
            }])
            ->latest('start_date')
            ->get();

        foreach ($years as $year) {
            $yearRevenues = 0;
            $yearExpenses = 0;
            $yearEntriesCount = 0;
            $openPeriods = 0;
            $closedPeriods = 0;

            foreach ($year->periods as $period) {
                if ($period->status === 'open') {
                    $openPeriods++;
                } else {
                    $closedPeriods++;
                }

                $entries = JournalEntry::where('tenant_id', $tenantId)
                    ->whereBetween('entry_date', [$period->start_date, $period->end_date])
                    ->with('lines.account')
                    ->get();

                $periodEntriesCount = $entries->count();
                $periodRevenues = 0;
                $periodExpenses = 0;

                foreach ($entries as $entry) {
                    foreach ($entry->lines as $line) {
                        $acc = $line->account;
                        if (!$acc) continue;
                        if ($acc->type === 'revenue' || str_starts_with($acc->code, '4')) {
                            $periodRevenues += ((float)$line->credit - (float)$line->debit);
                        } elseif ($acc->type === 'expense' || str_starts_with($acc->code, '5') || str_starts_with($acc->code, '6')) {
                            $periodExpenses += ((float)$line->debit - (float)$line->credit);
                        }
                    }
                }

                $period->entries_count = $periodEntriesCount;
                $period->revenues = round($periodRevenues, 2);
                $period->expenses = round($periodExpenses, 2);
                $period->net_income = round($periodRevenues - $periodExpenses, 2);

                $yearRevenues += $periodRevenues;
                $yearExpenses += $periodExpenses;
                $yearEntriesCount += $periodEntriesCount;
            }

            $year->total_entries = $yearEntriesCount;
            $year->total_revenues = round($yearRevenues, 2);
            $year->total_expenses = round($yearExpenses, 2);
            $year->net_income = round($yearRevenues - $yearExpenses, 2);
            $year->open_periods_count = $openPeriods;
            $year->closed_periods_count = $closedPeriods;
        }

        return response()->json($years);
    }

    public function initializeCurrentFiscalYear(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $currentYear = now()->year;
        $name = "السنة المالية {$currentYear}";

        $existing = FiscalYear::where('tenant_id', $tenantId)
            ->whereYear('start_date', $currentYear)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => "السنة المالية {$currentYear} مهيأة وموجودة بالفعل!",
                'fiscal_year' => $existing->load('periods'),
            ]);
        }

        $startDate = "{$currentYear}-01-01";
        $endDate = "{$currentYear}-12-31";

        $year = $this->accountingService->createFiscalYearWithPeriods(
            $tenantId,
            $name,
            $startDate,
            $endDate,
            12
        );

        $arabicMonths = [
            1 => 'يناير', 2 => 'فبراير', 3 => 'مارس', 4 => 'أبريل',
            5 => 'مايو', 6 => 'يونيو', 7 => 'يوليو', 8 => 'أغسطس',
            9 => 'سبتمبر', 10 => 'أكتوبر', 11 => 'نوفمبر', 12 => 'ديسمبر',
        ];

        foreach ($year->periods as $period) {
            $monthNum = (int)Carbon::parse($period->start_date)->month;
            $monthName = $arabicMonths[$monthNum] ?? "شهر {$monthNum}";
            $period->update([
                'name' => "{$monthName} {$currentYear} (الفترة {$period->period_number})",
            ]);
        }

        return response()->json([
            'message' => "تم تهيئة وبدء السنة المالية {$currentYear} وتقسيمها إلى 12 فترة شهرية بنجاح!",
            'fiscal_year' => $year->load('periods'),
        ], 201);
    }

    public function storeFiscalYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'periods_count' => 'nullable|integer|min:1|max:12',
        ]);

        $tenantId = app('current_tenant_id');
        $year = $this->accountingService->createFiscalYearWithPeriods(
            $tenantId,
            $validated['name'],
            $validated['start_date'],
            $validated['end_date'],
            $validated['periods_count'] ?? 12
        );

        return response()->json([
            'message' => 'تم إنشاء السنة المالية والفترات المحاسبية بنجاح',
            'fiscal_year' => $year,
        ], 201);
    }

    public function closeFiscalPeriod(string $id): JsonResponse
    {
        $period = $this->accountingService->closeFiscalPeriod($id, auth()->id());

        return response()->json([
            'message' => 'تم إغلاق الفترة المالية بنجاح ومنع الترحيل فيها',
            'fiscal_period' => $period,
        ]);
    }

    public function reopenFiscalPeriod(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ]);

        $period = $this->accountingService->reopenFiscalPeriod($id, $validated['reason'], auth()->id());

        return response()->json([
            'message' => 'تم إعادة فتح الفترة المالية بنجاح مع تسجيل السبب',
            'fiscal_period' => $period,
        ]);
    }

    public function closeFiscalYear(string $id): JsonResponse
    {
        $year = $this->accountingService->closeFiscalYear($id, auth()->id());

        return response()->json([
            'message' => 'تم إغلاق السنة المالية وترحيل الأرباح والخسائر إلى الأرباح المحتجزة بنجاح',
            'fiscal_year' => $year,
        ]);
    }

    // ==========================================
    // المطابقة والتسوية (Reconciliation)
    // ==========================================

    public function reconcileAR(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $reconciliation = $this->accountingService->reconcileAccountsReceivable($tenantId);

        return response()->json($reconciliation);
    }

    public function reconcileAP(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $reconciliation = $this->accountingService->reconcileAccountsPayable($tenantId);

        return response()->json($reconciliation);
    }

    public function reconcileTreasury(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $reconciliation = $this->accountingService->reconcileTreasury($tenantId);

        return response()->json($reconciliation);
    }

    public function reconcileInventory(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $reconciliation = $this->accountingService->reconcileInventory($tenantId);

        return response()->json($reconciliation);
    }

    public function autoReconcileAR(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'offset_account_id' => 'nullable|uuid',
        ]);

        $res = $this->accountingService->autoReconcileAR($tenantId, $validated['offset_account_id'] ?? null);

        return response()->json($res);
    }

    public function autoReconcileAP(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'offset_account_id' => 'nullable|uuid',
        ]);

        $res = $this->accountingService->autoReconcileAP($tenantId, $validated['offset_account_id'] ?? null);

        return response()->json($res);
    }

    public function autoReconcileTreasury(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'offset_account_id' => 'nullable|uuid',
        ]);

        $res = $this->accountingService->autoReconcileTreasury($tenantId, $validated['offset_account_id'] ?? null);

        return response()->json($res);
    }

    // ==========================================
    // سندات القبض والصرف
    // ==========================================

    public function paymentVouchers(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = PaymentVoucher::where('tenant_id', $tenantId)->with('account');

        if ($request->filled('type')) {
            $type = $request->get('type');
            if ($type === 'discount') {
                $query->where(function($q) {
                    $q->where('payment_method', 'discount')
                      ->orWhere('voucher_number', 'like', 'DISC-%');
                });
            } elseif ($type === 'receipt') {
                $query->where(function($q) {
                    $q->where('voucher_type', 'receipt')
                      ->orWhere('voucher_number', 'like', 'RCV-%');
                });
            } elseif ($type === 'payment') {
                $query->where(function($q) {
                    $q->where('voucher_type', 'payment')
                      ->orWhere('voucher_number', 'like', 'PV-%');
                });
            }
        }

        if ($request->filled('party_type')) {
            $query->where('party_type', $request->get('party_type'));
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->get('payment_method'));
        }

        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where(function($q) use ($s) {
                $q->where('voucher_number', 'like', "%{$s}%")
                  ->orWhere('party_name', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%");
            });
        }

        $allVouchers = (clone $query)->get();
        $totalReceipts = 0;
        $totalPayments = 0;
        $totalDiscounts = 0;

        foreach ($allVouchers as $v) {
            $amt = (float)$v->amount;
            $num = $v->voucher_number ?? '';
            $isDisc = ($v->payment_method === 'discount') || str_starts_with($num, 'DISC-');
            $isRcv = ($v->voucher_type === 'receipt') || str_starts_with($num, 'RCV-');

            if ($isDisc) {
                $totalDiscounts += $amt;
            } elseif ($isRcv) {
                $totalReceipts += $amt;
            } else {
                $totalPayments += $amt;
            }
        }

        $vouchers = $query->latest('voucher_date')->latest('created_at')->paginate(100);

        return response()->json([
            'data' => $vouchers->items(),
            'current_page' => $vouchers->currentPage(),
            'last_page' => $vouchers->lastPage(),
            'total' => $vouchers->total(),
            'summary' => [
                'total_receipts' => $totalReceipts,
                'total_payments' => $totalPayments,
                'net_cash_flow' => $totalReceipts - $totalPayments,
                'total_discounts' => $totalDiscounts,
                'count' => $allVouchers->count(),
            ],
        ]);
    }

    public function storePaymentVoucher(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'voucher_type' => 'required|string|in:receipt,payment',
            'party_type' => 'required|string|in:customer,supplier,employee,other',
            'party_name' => 'required|string|max:255',
            'account_id' => 'required|uuid',
            'contra_account_id' => 'required_if:party_type,other|nullable|uuid',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,bank_transfer,card,check',
            'voucher_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $voucher = $this->accountingService->createPaymentVoucher($validated);

        return response()->json([
            'message' => 'تم تسجيل السند المالي وترحيل القيد بنجاح',
            'voucher' => $voucher,
        ], 201);
    }

    // ==========================================
    // التكاليف الصناعية (Industrial Costing)
    // ==========================================

    public function costSheets(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $sheets = ProductionCostSheet::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'garmentModel'])
            ->latest()
            ->paginate(100);

        return response()->json($sheets);
    }

    public function autoCalculateAllCostSheets(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $orders = \App\Models\ProductionOrder::where('tenant_id', $tenantId)
            ->whereNotIn('status', ['archived'])
            ->get();

        $calculatedCount = 0;
        foreach ($orders as $order) {
            try {
                $this->accountingService->calculateProductionCost($order->id, ['force_recalculate' => true]);
                $calculatedCount++;
            } catch (\Throwable $e) {
                // ignore
            }
        }

        $sheets = ProductionCostSheet::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'garmentModel'])
            ->latest()
            ->paginate(100);

        return response()->json([
            'message' => "تم احتساب وتحديث {$calculatedCount} بطاقة تكلفة صناعية لأوامر الإنتاج",
            'calculated_count' => $calculatedCount,
            'data' => $sheets->items(),
        ]);
    }

    public function calculateCost(Request $request, string $productionOrderId): JsonResponse
    {
        $overrides = $request->only([
            'costing_method',
            'overhead_allocation_method',
            'direct_materials_cost',
            'direct_labor_cost',
            'subcontracted_services_cost',
            'applied_overhead_rate',
            'allocated_overhead_cost',
            'planned_total_cost',
            'notes',
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
        } catch (\Throwable $e) {}

        return response()->json([
            'message' => 'تم اعتماد بطاقة التكلفة الصناعية بنجاح وأصبحت نهائية وغير قابلة للتعديل',
            'cost_sheet' => $sheet,
        ]);
    }

    // ==========================================
    // التقارير المالية (Financial Reports)
    // ==========================================

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

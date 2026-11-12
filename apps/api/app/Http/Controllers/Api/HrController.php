<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\CuttingBundle;
use App\Models\Employee;
use App\Models\EmployeeAdjustment;
use App\Models\Payroll;
use App\Models\PayrollPayment;
use App\Models\ProductionOrder;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\QualityDefectAdjustment;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService
    ) {}

    // ==========================================
    // 1. إدارة الموظفين والعمال (Worker Management)
    // ==========================================

    public function employees(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = Employee::where('tenant_id', $tenantId)->with('branch')->withCount('pieceWorkLogs');
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $query->whereIn('branch_id', $user->assignedBranchIds());
        }

        if ($request->has('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                  ->orWhere('employee_code', 'like', "%{$s}%")
                  ->orWhere('job_title', 'like', "%{$s}%")
                  ->orWhere('phone', 'like', "%{$s}%");
            });
        }

        if ($request->has('department') && $request->query('department') !== 'all') {
            $query->where('department', $request->query('department'));
        }

        if ($request->has('pay_type') && $request->query('pay_type') !== 'all') {
            $query->where('pay_type', $request->query('pay_type'));
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $employees = $query->latest()->paginate(20);

        return response()->json($employees);
    }

    public function showEmployee(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $employeeQuery = Employee::where('tenant_id', $tenantId);
        $user = request()->user();
        if ($user && $user->role !== 'company_owner') {
            $employeeQuery->whereIn('branch_id', $user->assignedBranchIds());
        }
        $employee = $employeeQuery->with([
                'branch',
                'assignedBundles.cuttingOrder',
                'assignedBundles.productionOrder',
                'pieceWorkLogs' => fn($q) => $q->with(['productionOrder.garmentModel', 'cuttingBundle', 'cuttingOrder', 'jobOrder', 'pieceRate'])
                    ->latest('created_at')
                    ->limit(100),
                'attendances' => fn($q) => $q->latest('attendance_date')->limit(60),
                'adjustments' => fn($q) => $q->latest('adjustment_date')->limit(60),
                'payrollItems.payroll' => fn($q) => $q->latest()->limit(20),
            ])
            ->findOrFail($id);

        $totalPiecesCompleted = (int) PieceWorkLog::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->where('status', '!=', 'rejected')
            ->sum('completed_quantity');

        $totalPieceEarnings = (float) PieceWorkLog::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereIn('status', ['approved', 'verified', 'paid'])
            ->sum('total_amount');

        $activeBundlesCount = CuttingBundle::where('tenant_id', $tenantId)
            ->where('assigned_employee_id', $employee->id)
            ->whereIn('status', ['active', 'rework', 'held_for_qc'])
            ->count();

        $attendancesCount = Attendance::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->count();

        $advancesQuery = EmployeeAdjustment::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereIn('type', ['advance', 'advance_repayment']);

        $totalAdvancesTaken = (float) (clone $advancesQuery)
            ->whereIn('status', ['approved', 'settled'])
            ->sum('amount');

        $totalAdvancesPaid = (float) (clone $advancesQuery)
            ->whereIn('status', ['approved', 'settled'])
            ->sum('paid_amount');

        $remainingAdvancesBalance = (float) (clone $advancesQuery)
            ->where('status', 'approved')
            ->where(function ($q) {
                $q->where('remaining_balance', '>', 0)
                  ->orWhereNull('remaining_balance');
            })
            ->sum('remaining_balance');

        // البحث عن أوامر صالة القص وأوامر التشغيل للغير المرتبطة بهذا الفني/العامل
        $cuttingOrders = \App\Models\CuttingOrder::where('tenant_id', $tenantId)
            ->where(function ($q) use ($employee) {
                $q->whereHas('bundles', function ($bQ) use ($employee) {
                    $bQ->where('assigned_employee_id', $employee->id);
                })
                ->orWhere('notes', 'like', "%{$employee->name}%")
                ->orWhere('notes', 'like', "%{$employee->employee_code}%");
            })
            ->with(['fabricColor', 'customerMaterial', 'productionOrder', 'jobOrder'])
            ->latest()
            ->limit(30)
            ->get();

        return response()->json([
            'employee' => $employee,
            'cutting_orders' => $cuttingOrders,
            'statistics' => [
                'total_pieces_completed' => $totalPiecesCompleted,
                'total_piece_earnings' => round($totalPieceEarnings, 2),
                'active_bundles_count' => $activeBundlesCount,
                'attendances_count' => $attendancesCount,
                'total_advances_taken' => round($totalAdvancesTaken, 2),
                'total_advances_paid' => round($totalAdvancesPaid, 2),
                'remaining_advances_balance' => round($remainingAdvancesBalance, 2),
                'assigned_cutting_orders_count' => $cuttingOrders->count(),
            ],
        ]);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'department' => 'required|string|max:50',
            'job_title' => 'required|string|max:100',
            'pay_type' => 'required|string|in:piece_rate,fixed_salary,hourly,daily,weekly,shift_based,hybrid',
            'base_salary' => 'nullable|numeric|min:0',
            'hourly_rate' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'weekly_rate' => 'nullable|numeric|min:0',
            'shift_rate' => 'nullable|numeric|min:0',
            'skills' => 'nullable|array',
            'shift_name' => 'nullable|string|max:50',
            'hire_date' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'phone' => 'nullable|string|max:50',
            'national_id' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        $branchId = $validated['branch_id'] ?? null;
        if ($branchId !== null) {
            $branch = \App\Models\Branch::where('tenant_id', $tenantId)->find($branchId);
            if (!$branch) {
                return response()->json(['error' => 'BranchNotFound', 'message' => 'الفرع المحدد غير تابع لشركتك.'], 422);
            }
        }
        if ($enforceBranchScope) {
            if (!$branchId && count($assignedBranchIds) === 1) {
                $branchId = $assignedBranchIds[0];
            }
            if (!$branchId) {
                return response()->json(['error' => 'BranchAssignmentRequired', 'message' => 'يجب تحديد فرع للموظف قبل إنشاء حسابه.'], 422);
            }
            if (!in_array($branchId, $assignedBranchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك إنشاء موظف في فرع غير معيّن لحسابك.'], 403);
            }
        }

        // منع تكرار كود الموظف داخل نفس المستأجر
        $existing = Employee::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('employee_code', $validated['employee_code'])->first();
        if ($existing) {
            return response()->json([
                'error' => 'DuplicateEmployeeCode',
                'message' => 'كود الموظف مستخدم بالفعل داخل منشأتك. يرجى اختيار كود فريد.',
            ], 422);
        }

        $employee = Employee::create([
            'tenant_id' => $tenantId,
            'branch_id' => $branchId,
            'employee_code' => $validated['employee_code'],
            'name' => $validated['name'],
            'department' => $validated['department'],
            'job_title' => $validated['job_title'],
            'pay_type' => $validated['pay_type'],
            'base_salary' => $validated['base_salary'] ?? 0,
            'hourly_rate' => $validated['hourly_rate'] ?? 0,
            'daily_rate' => $validated['daily_rate'] ?? 0,
            'weekly_rate' => $validated['weekly_rate'] ?? 0,
            'shift_rate' => $validated['shift_rate'] ?? 0,
            'skills' => $validated['skills'] ?? null,
            'shift_name' => $validated['shift_name'] ?? 'morning',
            'hire_date' => $validated['hire_date'] ?? now()->toDateString(),
            'phone' => $validated['phone'] ?? null,
            'national_id' => $validated['national_id'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'تم إضافة الموظف/العامل بنجاح',
            'employee' => $employee->load('branch'),
        ], 201);
    }

    public function updateEmployee(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'employee_code' => 'sometimes|required|string|max:50',
            'name' => 'sometimes|required|string|max:255',
            'department' => 'sometimes|required|string|max:50',
            'job_title' => 'sometimes|required|string|max:100',
            'pay_type' => 'sometimes|required|string|in:piece_rate,fixed_salary,hourly,daily,weekly,shift_based,hybrid',
            'base_salary' => 'nullable|numeric|min:0',
            'hourly_rate' => 'nullable|numeric|min:0',
            'daily_rate' => 'nullable|numeric|min:0',
            'weekly_rate' => 'nullable|numeric|min:0',
            'shift_rate' => 'nullable|numeric|min:0',
            'skills' => 'nullable|array',
            'shift_name' => 'nullable|string|max:50',
            'hire_date' => 'nullable|date',
            'termination_date' => 'nullable|date',
            'branch_id' => 'nullable|uuid',
            'phone' => 'nullable|string|max:50',
            'national_id' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        if ($enforceBranchScope && (!$employee->branch_id || !in_array($employee->branch_id, $assignedBranchIds, true))) {
            return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك تعديل موظف تابع لفرع غير معيّن لحسابك.'], 403);
        }

        if (array_key_exists('branch_id', $validated)) {
            $newBranchId = $validated['branch_id'];
            if ($newBranchId !== null) {
                $branch = \App\Models\Branch::where('tenant_id', $tenantId)->find($newBranchId);
                if (!$branch) {
                    return response()->json(['error' => 'BranchNotFound', 'message' => 'الفرع المحدد غير تابع لشركتك.'], 422);
                }
            }
            if ($enforceBranchScope && ($newBranchId === null || !in_array($newBranchId, $assignedBranchIds, true))) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك نقل الموظف إلى فرع غير معيّن لحسابك أو إزالة تعيين فرعه.'], 403);
            }
        }

        if (!empty($validated['employee_code']) && $validated['employee_code'] !== $employee->employee_code) {
            $conflict = Employee::withoutGlobalScopes()->where('tenant_id', $tenantId)
                ->where('employee_code', $validated['employee_code'])
                ->where('id', '!=', $employee->id)
                ->first();
            if ($conflict) {
                return response()->json([
                    'error' => 'DuplicateEmployeeCode',
                    'message' => 'كود الموظف الجديد مسجل مسبقاً لعامل آخر.',
                ], 422);
            }
        }

        $employee->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات الموظف والتعويض بنجاح',
            'employee' => $employee->load('branch'),
        ]);
    }

    public function destroyEmployee(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($id);
        $user = request()->user();
        if ($user && $user->role !== 'company_owner' && (!$employee->branch_id || !in_array($employee->branch_id, $user->assignedBranchIds(), true))) {
            return response()->json(['error' => 'BranchAccessDenied'], 403);
        }

        // فحص ما إذا كان للموظف مسيرات رواتب أو بنود مالية معتمدة سابقة
        $hasPayrollHistory = \App\Models\PayrollItem::where('employee_id', $employee->id)->exists();

        if ($hasPayrollHistory) {
            // أرشفة وتعطيل بأمان لحماية النزاهة المحاسبية
            $employee->update(['is_active' => false]);
            return response()->json([
                'message' => "تم أرشفة وتعطيل حساب العامل ({$employee->name}) بأمان، حيث ترتبط به مسيرات مالية سابقة لا يمكن حذفها تجنباً لخلل الدفاتر.",
                'deactivated' => true,
                'deleted' => false,
            ]);
        }

        // في حال عدم وجود مسيرات، يمكن حذف السجلات المرتبطة ثم حذف العامل
        Attendance::where('employee_id', $employee->id)->delete();
        PieceWorkLog::where('employee_id', $employee->id)->delete();
        EmployeeAdjustment::where('employee_id', $employee->id)->delete();
        CuttingBundle::where('assigned_employee_id', $employee->id)->update(['assigned_employee_id' => null]);
        $employee->delete();

        return response()->json([
            'message' => "تم حذف سجل العامل ({$employee->name}) وبياناته بنجاح.",
            'deleted' => true,
            'deactivated' => false,
        ]);
    }

    // ==========================================
    // 2. الحضور والانصراف (Attendance & Working Time)
    // ==========================================

    public function attendances(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = Attendance::where('tenant_id', $tenantId)->with(['employee', 'branch']);
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $query->whereIn('branch_id', $user->assignedBranchIds());
        }

        if ($request->has('employee_id') && !empty($request->query('employee_id')) && $request->query('employee_id') !== 'all') {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->has('attendance_date') && !empty($request->query('attendance_date')) && $request->query('attendance_date') !== 'all') {
            $date = $request->query('attendance_date');
            $query->where(function ($q) use ($date) {
                $q->whereDate('attendance_date', $date)
                  ->orWhere('attendance_date', 'like', "{$date}%");
            });
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('attendance_date', [$request->query('start_date'), $request->query('end_date')]);
        }

        if ($request->has('status') && !empty($request->query('status')) && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        $perPage = (int) $request->query('per_page', 50);
        $attendances = $query->latest('attendance_date')->latest('created_at')->paginate($perPage);

        return response()->json($attendances);
    }

    public function storeAttendance(Request $request): JsonResponse
    {
        if ($request->input('status') === 'leave') {
            $request->merge(['status' => 'excused_leave']);
        }

        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'attendance_date' => 'required|date',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'status' => 'required|string|in:present,absent,late,leave,excused_leave,unexcused_leave,half_day',
            'working_hours' => 'nullable|numeric|min:0',
            'overtime_hours' => 'nullable|numeric|min:0',
            'late_minutes' => 'nullable|integer|min:0',
            'is_payable' => 'nullable|boolean',
            'notes' => 'nullable|string|max:255',
            'branch_id' => 'nullable|uuid',
        ]);

        if ($validated['status'] === 'leave') {
            $validated['status'] = 'excused_leave';
        }

        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($validated['employee_id']);
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        $attendanceBranchId = $validated['branch_id'] ?? $employee->branch_id;
        if ($enforceBranchScope && (
            !$attendanceBranchId
            || !in_array($attendanceBranchId, $assignedBranchIds, true)
            || $employee->branch_id !== $attendanceBranchId
        )) {
            return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك تسجيل حضور موظف تابع لفرع غير معيّن لحسابك.'], 403);
        }
        if ($attendanceBranchId !== null) {
            $branch = \App\Models\Branch::where('tenant_id', $tenantId)->find($attendanceBranchId);
            if (!$branch || ($employee->branch_id && $employee->branch_id !== $attendanceBranchId)) {
                return response()->json(['error' => 'BranchMismatch', 'message' => 'الفرع المحدد لا يطابق فرع الموظف.'], 422);
            }
            $validated['branch_id'] = $attendanceBranchId;
        }

        try {
            $userId = $request->user()?->id ?? 'system';
            $attendance = $this->payrollService->recordAttendance($validated, $userId);

            return response()->json([
                'message' => 'تم تسجيل حضور وانصراف العامل بنجاح',
                'attendance' => $attendance->load('employee'),
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'DuplicateAttendance',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function updateAttendance(Request $request, string $id): JsonResponse
    {
        if ($request->input('status') === 'leave') {
            $request->merge(['status' => 'excused_leave']);
        }

        $validated = $request->validate([
            'status' => 'sometimes|required|string|in:present,absent,late,leave,excused_leave,unexcused_leave,half_day',
            'check_in' => 'nullable|string',
            'check_out' => 'nullable|string',
            'working_hours' => 'nullable|numeric|min:0',
            'overtime_hours' => 'nullable|numeric|min:0',
            'late_minutes' => 'nullable|integer|min:0',
            'is_payable' => 'nullable|boolean',
            'correction_reason' => 'required|string|max:255',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'leave') {
            $validated['status'] = 'excused_leave';
        }

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $attendanceQuery = Attendance::where('tenant_id', $tenantId)->whereKey($id);
        if ($user && $user->role !== 'company_owner') {
            $attendanceQuery->whereIn('branch_id', $user->assignedBranchIds());
        }
        $attendanceQuery->firstOrFail();

        $userId = $request->user()?->id ?? 'system';
        $attendance = $this->payrollService->updateAttendance($id, $validated, $userId);

        return response()->json([
            'message' => 'تم تصحيح سجل الحضور وتوثيق سبب التعديل بنجاح',
            'attendance' => $attendance,
        ]);
    }

    public function bulkAttendance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'records' => 'required|array|min:1',
            'records.*.employee_id' => 'required|uuid',
            'records.*.attendance_date' => 'required|date',
            'records.*.status' => 'required|string|in:present,absent,late,excused_leave,unexcused_leave,half_day',
            'records.*.check_in' => 'nullable|string',
            'records.*.check_out' => 'nullable|string',
            'records.*.working_hours' => 'nullable|numeric|min:0',
            'records.*.overtime_hours' => 'nullable|numeric|min:0',
            'records.*.late_minutes' => 'nullable|integer|min:0',
            'records.*.is_payable' => 'nullable|boolean',
            'records.*.notes' => 'nullable|string|max:255',
        ]);

        $userId = $request->user()?->id ?: 1;
        $created = [];
        $errors = [];

        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];

        foreach ($validated['records'] as $index => $row) {
            try {
                $employee = Employee::where('tenant_id', app('current_tenant_id'))->findOrFail($row['employee_id']);
                if ($user && $user->role !== 'company_owner') {
                    if (!$employee->branch_id || !in_array($employee->branch_id, $assignedBranchIds, true)) {
                        throw new \\Illuminate\\Auth\\Access\\AuthorizationException('لا يمكنك تسجيل حضور موظف تابع لفرع غير معيّن لحسابك.');
                    }
                    $row['branch_id'] = $employee->branch_id;
                }
                $created[] = $this->payrollService->recordAttendance($row, $userId);
            } catch (\Exception $e) {
                $errors[] = [
                    'index' => $index,
                    'employee_id' => $row['employee_id'],
                    'date' => $row['attendance_date'],
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تمت معالجة تسجيل الحضور الجماعي بنجاح.',
            'created_count' => count($created),
            'errors_count' => count($errors),
            'errors' => $errors,
            'attendances' => $created,
        ]);
    }

    // ==========================================
    // 3. السلف والتسويات المالية (Adjustments & Advances)
    // ==========================================

    public function adjustments(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = $this->scopeToAssignedEmployeeBranches(
            EmployeeAdjustment::where('tenant_id', $tenantId),
            $request
        )->with(['employee', 'approver']);

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->has('type') && $request->query('type') !== 'all') {
            $query->where('type', $request->query('type'));
        }

        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        $adjustments = $query->latest('adjustment_date')->paginate(20);

        return response()->json($adjustments);
    }

    public function storeAdjustment(Request $request): JsonResponse
    {
        if (!$request->has('adjustment_date') && $request->has('effective_date')) {
            $request->merge(['adjustment_date' => $request->input('effective_date')]);
        }

        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'type' => 'required|string|in:advance,advance_repayment,allowance,bonus,deduction',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'nullable|string|max:10',
            'installments_count' => 'nullable|integer|min:1|max:60',
            'installment_amount' => 'nullable|numeric|min:0.01',
            'adjustment_date' => 'required|date',
            'payroll_period' => 'nullable|string|max:50',
            'reason' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($validated['employee_id']);
        $user = $request->user();
        if ($user && $user->role !== 'company_owner' && (!$employee->branch_id || !in_array($employee->branch_id, $user->assignedBranchIds(), true))) {
            return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك تسجيل تسوية لموظف تابع لفرع غير معيّن لحسابك.'], 403);
        }

        $userId = $request->user()?->id ?? 'system';
        $adj = $this->payrollService->createEmployeeAdjustment($validated, $userId);

        return response()->json([
            'message' => 'تم تسجيل طلب التسوية/السلفة بنجاح وهو بانتظار الاعتماد',
            'adjustment' => $adj->load('employee'),
        ], 201);
    }

    public function approveAdjustment(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(EmployeeAdjustment::where('tenant_id', $tenantId), $request)->findOrFail($id);
        $userId = $request->user()?->id ?? 'system';
        $adj = $this->payrollService->approveEmployeeAdjustment($id, $userId);

        return response()->json([
            'message' => 'تم اعتماد السلفة/التسوية المالية بنجاح وستدرج في المسير',
            'adjustment' => $adj,
        ]);
    }

    public function rejectAdjustment(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:255',
        ]);

        $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(EmployeeAdjustment::where('tenant_id', $tenantId), $request)->findOrFail($id);
        $userId = $request->user()?->id ?? 'system';
        $adj = $this->payrollService->rejectEmployeeAdjustment($id, $userId, $validated['reason']);

        return response()->json([
            'message' => 'تم رفض السلفة/التعديل المالي بنجاح',
            'adjustment' => $adj,
        ]);
    }

    // ==========================================
    // 4. تسعيرة أجور القطعة وسجلات الإنتاج
    // ==========================================

    public function pieceRates(): JsonResponse
    {
        $rates = PieceRate::with('garmentModel')->latest()->paginate(20);

        return response()->json($rates);
    }

    public function storePieceRate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stage_name' => 'required|string|max:50',
            'operation_name' => 'required|string|max:100',
            'rate_per_piece' => 'required|numeric|min:0.01',
            'garment_model_id' => 'nullable|uuid',
        ]);

        $tenantId = app('current_tenant_id');

        if (!empty($validated['garment_model_id'])) {
            \App\Models\GarmentModel::where('tenant_id', $tenantId)->findOrFail($validated['garment_model_id']);
        }

        $rate = PieceRate::create([
            'tenant_id' => $tenantId,
            'garment_model_id' => $validated['garment_model_id'] ?? null,
            'stage_name' => $validated['stage_name'],
            'operation_name' => $validated['operation_name'],
            'rate_per_piece' => $validated['rate_per_piece'],
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم تسجيل أجر القطعة للعملية بنجاح',
            'piece_rate' => $rate,
        ], 201);
    }

    public function pieceWorkLogs(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $logs = $this->scopeToAssignedEmployeeBranches(PieceWorkLog::where('tenant_id', $tenantId), $request)
            ->with(['employee', 'productionOrder.garmentModel', 'cuttingOrder', 'pieceRate', 'cuttingBundle', 'jobOrder'])
            ->latest('created_at')
            ->paginate(25);

        return response()->json($logs);
    }

    public function storePieceWorkLog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'completed_quantity' => 'required|integer|min:1',
            'unit_rate' => 'nullable|numeric|min:0',
            'piece_rate_id' => 'nullable|uuid',
            'production_order_id' => 'nullable|uuid',
            'cutting_bundle_id' => 'nullable|uuid',
            'work_date' => 'nullable|date',
        ]);

        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($validated['employee_id']);
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        if ($enforceBranchScope && (!$employee->branch_id || !in_array($employee->branch_id, $branchIds, true))) {
            return response()->json(['error' => 'BranchAccessDenied', 'message' => 'العامل المحدد لا يتبع فرعًا معيّنًا لحسابك.'], 403);
        }
        if (!empty($validated['production_order_id'])) {
            $productionOrder = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($validated['production_order_id']);
            if ($enforceBranchScope && $employee->branch_id !== $productionOrder->branch_id) {
                return response()->json(['error' => 'BranchMismatch', 'message' => 'يجب تسجيل إنتاجية العامل على أمر إنتاج من نفس فرعه.'], 422);
            }
        }
        if (!empty($validated['cutting_bundle_id'])) {
            $bundleQuery = CuttingBundle::where('tenant_id', $tenantId);
            if ($enforceBranchScope) {
                $bundleQuery->where(function ($q) use ($branchIds) {
                    $q->whereHas('productionOrder', fn ($p) => $p->whereIn('branch_id', $branchIds))
                        ->orWhereHas('cuttingOrder.warehouse', fn ($w) => $w->whereIn('branch_id', $branchIds));
                });
            }
            $bundle = $bundleQuery->with(['productionOrder', 'cuttingOrder.warehouse'])->findOrFail($validated['cutting_bundle_id']);
            $bundleBranchId = $bundle->productionOrder?->branch_id ?? $bundle->cuttingOrder?->warehouse?->branch_id;
            if ($enforceBranchScope && (!$bundleBranchId || $employee->branch_id !== $bundleBranchId)) {
                return response()->json(['error' => 'BranchMismatch', 'message' => 'يجب تسجيل إنتاجية العامل على حزمة من نفس فرعه.'], 422);
            }
        }
        $log = $this->payrollService->recordPieceWork($validated);

        return response()->json([
            'message' => 'تم تسجيل إنتاجية العامل واحتساب الأجر بنجاح',
            'work_log' => $log,
        ], 201);
    }

    public function approvePieceWorkLog(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(PieceWorkLog::where('tenant_id', $tenantId), $request)->findOrFail($id);
        $userId = $request->user()?->id ?? 'system';
        $log = $this->payrollService->approvePieceWorkLog($id, $userId);

        return response()->json([
            'message' => 'تم اعتماد سجل إنتاجية العامل بنجاح',
            'work_log' => $log,
        ]);
    }

    public function rejectPieceWorkLog(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:255',
        ]);

        $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(PieceWorkLog::where('tenant_id', $tenantId), $request)->findOrFail($id);
        $userId = $request->user()?->id ?? 'system';
        $log = $this->payrollService->rejectPieceWorkLog($id, $userId, $validated['rejection_reason']);

        return response()->json([
            'message' => 'تم رفض سجل الإنتاجية وتوثيق سبب الرفض بنجاح',
            'work_log' => $log,
        ]);
    }

    // ==========================================
    // 5. عيوب الجودة والخصومات (Defect Adjustments)
    // ==========================================

    public function defectAdjustments(Request $request): JsonResponse
    {
        $query = $this->scopeToAssignedEmployeeBranches(
            QualityDefectAdjustment::where('tenant_id', app('current_tenant_id')),
            $request,
            true
        )->with(['employee', 'productionOrder', 'cuttingBundle', 'approver', 'reporter', 'reverser'])
            ->latest();

        if ($request->has('employee_id')) {
            $query->where('employee_id', $request->query('employee_id'));
        }

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json($query->paginate(20));
    }

    public function storeDefectAdjustment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_id' => 'required|uuid',
            'production_order_id' => 'required|uuid',
            'cutting_bundle_id' => 'nullable|uuid',
            'quality_defect_id' => 'nullable|uuid',
            'quality_inspection_id' => 'nullable|uuid',
            'production_stage_id' => 'nullable|uuid',
            'investigation_notes' => 'nullable|string',
            'proposed_penalty_amount' => 'required|numeric|min:0',
            'adjustment_reason' => 'required|string|max:255',
        ]);

        $tenantId = app('current_tenant_id');
        $employee = Employee::where('tenant_id', $tenantId)->findOrFail($validated['employee_id']);
        $productionOrder = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($validated['production_order_id']);
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        if ($enforceBranchScope && (
            !$productionOrder->branch_id
            || !in_array($productionOrder->branch_id, $branchIds, true)
            || $employee->branch_id !== $productionOrder->branch_id
        )) {
            return response()->json(['error' => 'BranchMismatch', 'message' => 'يجب أن يتبع العامل وأمر الإنتاج نفس الفرع.'], 422);
        }
        $adjustment = $this->payrollService->createQualityDefectAdjustment($validated, $request->user()->id);

        return response()->json([
            'message' => 'تم تسجيل تقرير عيب الجودة والتحقيق المبدئي بنجاح (معلق للاعتماد ولا يخصم تلقائياً)',
            'defect_adjustment' => $adjustment,
        ], 201);
    }

    public function approveDefectAdjustment(Request $request, string $id): JsonResponse
    {
        if (!in_array($request->user()?->role, ['company_owner', 'production_manager'], true)) {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'اعتماد خصم عيب الجودة متاح لمالك المصنع أو مدير الإنتاج فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'approved_amount' => 'nullable|numeric|min:0',
        ]);

        $adjustment = $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(QualityDefectAdjustment::where('tenant_id', $tenantId), $request, true)->findOrFail($id);

        $this->payrollService->approveQualityDefectAdjustment(
            $id,
            $request->user()->id,
            isset($validated['approved_amount']) ? (float)$validated['approved_amount'] : null
        );

        return response()->json([
            'message' => 'تم اعتماد خصم عيب الجودة بواسطة مدير الإنتاج بنجاح وسيدرج في مسير الرواتب القادم',
            'defect_adjustment' => $adjustment,
        ]);
    }

    public function rejectDefectAdjustment(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:255',
        ]);

        $adjustment = $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(QualityDefectAdjustment::where('tenant_id', $tenantId), $request, true)->findOrFail($id);

        $this->payrollService->rejectQualityDefectAdjustment(
            $id,
            $request->user()->id,
            $validated['rejection_reason']
        );

        return response()->json([
            'message' => 'تم رفض الخصم وإسقاط العقوبة بنجاح دون أي اقتطاع مالي',
            'defect_adjustment' => $adjustment,
        ]);
    }

    public function recordWorkerObjection(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'objection_notes' => 'required|string|max:1000',
        ]);

        $adjustment = $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(QualityDefectAdjustment::where('tenant_id', $tenantId), $request, true)->findOrFail($id);

        $this->payrollService->recordWorkerObjection(
            $id,
            $validated['objection_notes']
        );

        return response()->json([
            'message' => 'تم تسجيل تظلم واعتراض العامل بنجاح وتوثيق التاريخ لإعادة النظر',
            'defect_adjustment' => $adjustment,
        ]);
    }

    public function reverseDefectAdjustment(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'reversal_reason' => 'required|string|max:255',
        ]);

        $adjustment = $tenantId = app('current_tenant_id');
        $this->scopeToAssignedEmployeeBranches(QualityDefectAdjustment::where('tenant_id', $tenantId), $request, true)->findOrFail($id);

        $this->payrollService->reverseQualityDefectAdjustment(
            $id,
            $request->user()->id,
            $validated['reversal_reason']
        );

        return response()->json([
            'message' => 'تم إلغاء الخصم وتوثيق قيد التسوية التعويضي بنجاح دون حذف السجلات التاريخية',
            'defect_adjustment' => $adjustment,
        ]);
    }

    // ==========================================
    // 6. مسيرات الرواتب ودورة الاعتماد والصرف (Payrolls Lifecycle)
    // ==========================================

    public function payrolls(): JsonResponse
    {
        $payrolls = Payroll::with(['items.employee', 'payments', 'approver', 'finalizer'])->latest()->paginate(20);

        return response()->json($payrolls);
    }

    public function showPayroll(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $payroll = Payroll::where('tenant_id', $tenantId)
            ->with(['items.employee', 'payments', 'approver', 'finalizer'])
            ->findOrFail($id);

        return response()->json($payroll);
    }

    public function generatePayroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payroll_period' => 'required|string|max:50',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $tenantId = app('current_tenant_id');
        $initialStatus = $request->input('status', 'draft');
        try {
            $payroll = $this->payrollService->generatePayroll(
                $tenantId,
                $validated['payroll_period'],
                $validated['period_start'],
                $validated['period_end'],
                $initialStatus
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'PayrollPeriodLocked',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم احتساب مسير الرواتب لجميع فئات التعويض بنجاح',
            'payroll' => $payroll,
        ], 201);
    }

    public function approvePayroll(Request $request, string $id): JsonResponse
    {
        $payroll = $this->payrollService->approvePayroll($id, $request->user()->id);

        return response()->json([
            'message' => 'تمت مراجعة واعتماد مسير الرواتب بنجاح',
            'payroll' => $payroll,
        ]);
    }

    public function rejectPayroll(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:255',
        ]);

        $payroll = $this->payrollService->rejectPayroll($id, $request->user()->id, $validated['rejection_reason']);

        return response()->json([
            'message' => 'تم رفض مسير الرواتب وإعادته للمراجعة',
            'payroll' => $payroll,
        ]);
    }

    public function finalizePayroll(Request $request, string $id): JsonResponse
    {
        $payroll = $this->payrollService->finalizePayroll($id, $request->user()->id);

        return response()->json([
            'message' => 'تم قفل وتثبيت مسير الرواتب نهائياً ولا يمكن تعديل أرقامه تاريخياً',
            'payroll' => $payroll,
        ]);
    }

    public function recalculatePayroll(Request $request, string $id): JsonResponse
    {
        $payroll = $this->payrollService->recalculatePayroll($id);

        return response()->json([
            'message' => 'تمت إعادة احتساب مسير الرواتب وتحديث كافة السلف والخصومات بنجاح',
            'payroll' => $payroll,
        ]);
    }

    public function destroyPayroll(string $id): JsonResponse
    {
        $this->payrollService->destroyPayroll($id);

        return response()->json([
            'message' => 'تم حذف مسير الرواتب وإلغاء تسوياته وإعادة السلف للحالة المعتمدة بنجاح',
        ]);
    }

    public function recordPayment(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_date' => 'required|date',
            'payment_method' => 'required|string|in:cash,bank_transfer,cheque,instapay',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'payroll_item_id' => 'nullable|uuid',
            'employee_id' => 'nullable|uuid',
        ]);

        $payment = $this->payrollService->recordPayrollPayment($id, $validated, $request->user()->id);

        return response()->json([
            'message' => 'تم تسجيل سند الصرف وتحديث الرصيد المستحق بنجاح',
            'payment' => $payment,
            'payroll' => $payment->payroll->load(['items.employee', 'payments']),
        ], 201);
    }

    public function markPayrollPaid(Request $request, string $id): JsonResponse
    {
        if ($request->has('amount')) {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:0.01',
                'payment_date' => 'nullable|date',
                'payment_method' => 'nullable|string|in:cash,bank_transfer,cheque,instapay',
                'reference_number' => 'nullable|string|max:100',
                'notes' => 'nullable|string',
                'payroll_item_id' => 'nullable|uuid',
                'employee_id' => 'nullable|uuid',
            ]);

            try {
                $payment = $this->payrollService->recordPayrollPayment($id, $validated, $request->user()->id);

                return response()->json([
                    'message' => 'تم تسجيل سند الصرف وتحديث الرصيد المستحق بنجاح',
                    'payment' => $payment,
                    'payroll' => $payment->payroll->load(['items.employee', 'payments']),
                ], 200);
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'error' => 'PaymentValidationError',
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        $payroll = $this->payrollService->markPayrollPaid($id);

        return response()->json([
            'message' => 'تم قفل مسير الرواتب واعتماده كمسير مدفوع نهائياً',
            'payroll' => $payroll,
        ]);
    }

    public function payrollPayments(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $payments = PayrollPayment::where('tenant_id', $tenantId)
            ->where('payroll_id', $id)
            ->with(['employee', 'payrollItem'])
            ->latest()
            ->get();

        return response()->json($payments);
    }

    public function payslip(string $id, string $itemId): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($id);
        $item = \App\Models\PayrollItem::where('tenant_id', $tenantId)
            ->where('payroll_id', $payroll->id)
            ->with(['employee.branch'])
            ->findOrFail($itemId);

        $employee = $item->employee;

        // إحصائيات حضور وانصراف الموظف خلال فترة المسير
        $attendances = Attendance::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereBetween('attendance_date', [$payroll->period_start, $payroll->period_end])
            ->get();

        // سجلات القطعة المنجزة للفترة
        $pieceWorkLogs = PieceWorkLog::where('tenant_id', $tenantId)
            ->where('employee_id', $employee->id)
            ->whereBetween('work_date', [$payroll->period_start, $payroll->period_end])
            ->whereIn('status', ['verified', 'approved', 'paid'])
            ->with(['bundle', 'pieceRate'])
            ->get();

        // السلف والتسويات المرتبطة
        $adjustments = EmployeeAdjustment::where('tenant_id', $tenantId)
            ->where('settled_payroll_id', $payroll->id)
            ->where('employee_id', $employee->id)
            ->get();

        // خصومات الجودة المرتبطة
        $defectAdjustments = QualityDefectAdjustment::where('tenant_id', $tenantId)
            ->where('settled_payroll_id', $payroll->id)
            ->where('employee_id', $employee->id)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'payroll' => [
                    'id' => $payroll->id,
                    'period' => $payroll->payroll_period,
                    'period_start' => $payroll->period_start,
                    'period_end' => $payroll->period_end,
                    'status' => $payroll->status,
                ],
                'employee' => [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'code' => $employee->employee_code,
                    'job_title' => $employee->job_title,
                    'department' => $employee->department,
                    'pay_type' => $employee->pay_type,
                    'branch_name' => $employee->branch?->name,
                ],
                'item' => $item,
                'calculation_breakdown' => $item->calculation_breakdown,
                'attendances_summary' => [
                    'total_days' => $attendances->count(),
                    'payable_days' => $attendances->where('is_payable', true)->where('status', '!=', 'absent')->count(),
                    'total_working_hours' => (float)$attendances->sum('working_hours'),
                    'total_overtime_hours' => (float)$attendances->sum('overtime_hours'),
                ],
                'piecework_summary' => [
                    'total_pieces' => (int)$pieceWorkLogs->sum('completed_quantity'),
                    'total_amount' => (float)$pieceWorkLogs->sum('total_amount'),
                ],
                'piece_work_logs' => $pieceWorkLogs,
                'adjustments' => $adjustments,
                'defect_adjustments' => $defectAdjustments,
            ],
        ]);
    }
    /**
     * HR adjustments, piece-work logs, and quality penalties are branch-owned
     * through their employee and (where present) production-order relationships.
     */
    private function scopeToAssignedEmployeeBranches($query, Request $request, bool $alsoProductionOrder = false)
    {
        $user = $request->user();
        if (!$user || $user->role === 'company_owner') {
            return $query;
        }

        $branchIds = $user->assignedBranchIds();
        $query->whereHas('employee', fn ($employeeQuery) => $employeeQuery->whereIn('branch_id', $branchIds));
        if ($alsoProductionOrder) {
            $query->whereHas('productionOrder', fn ($productionQuery) => $productionQuery->whereIn('branch_id', $branchIds));
        }

        return $query;
    }

}

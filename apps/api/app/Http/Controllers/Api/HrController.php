<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Services\PayrollService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HrController extends Controller
{
    public function __construct(
        protected PayrollService $payrollService
    ) {}

    public function employees(): JsonResponse
    {
        $employees = Employee::withCount('pieceWorkLogs')->latest()->paginate(20);

        return response()->json($employees);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'department' => 'required|string|max:50',
            'job_title' => 'required|string|max:100',
            'pay_type' => 'required|string|in:piece_rate,fixed_salary,hourly,hybrid',
            'base_salary' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:50',
            'national_id' => 'nullable|string|max:50',
        ]);

        $tenantId = app('current_tenant_id');

        $employee = Employee::create([
            'tenant_id' => $tenantId,
            'employee_code' => $validated['employee_code'],
            'name' => $validated['name'],
            'department' => $validated['department'],
            'job_title' => $validated['job_title'],
            'pay_type' => $validated['pay_type'],
            'base_salary' => $validated['base_salary'] ?? 0,
            'phone' => $validated['phone'] ?? null,
            'national_id' => $validated['national_id'] ?? null,
            'is_active' => true,
        ]);

        return response()->json([
            'message' => 'تم إضافة الموظف/العامل بنجاح',
            'employee' => $employee,
        ], 201);
    }

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

    public function pieceWorkLogs(): JsonResponse
    {
        $logs = PieceWorkLog::with(['employee', 'productionOrder', 'pieceRate'])
            ->latest('work_date')
            ->paginate(20);

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

        $log = $this->payrollService->recordPieceWork($validated);

        return response()->json([
            'message' => 'تم تسجيل إنتاجية العامل واحتساب الأجر بنجاح',
            'work_log' => $log,
        ], 201);
    }

    public function payrolls(): JsonResponse
    {
        $payrolls = Payroll::with('items.employee')->latest()->paginate(20);

        return response()->json($payrolls);
    }

    public function generatePayroll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payroll_period' => 'required|string|max:50',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
        ]);

        $tenantId = app('current_tenant_id');
        $payroll = $this->payrollService->generatePayroll(
            $tenantId,
            $validated['payroll_period'],
            $validated['period_start'],
            $validated['period_end']
        );

        return response()->json([
            'message' => 'تم استخراج مسير الرواتب واحتساب مستحقات العمال بنجاح',
            'payroll' => $payroll,
        ], 201);
    }
}

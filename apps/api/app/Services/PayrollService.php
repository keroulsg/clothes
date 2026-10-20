<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PayrollService
{
    /**
     * تسجيل إنتاجية عامل واحتساب أجر القطعة المطابق لمرحلة الإنتاج
     */
    public function recordPieceWork(array $data): PieceWorkLog
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $employee = Employee::where('tenant_id', $tenantId)
                ->where('id', $data['employee_id'])
                ->firstOrFail();

            $qty = (int) $data['completed_quantity'];
            if ($qty <= 0) {
                throw new InvalidArgumentException('الكمية المنجزة يجب أن تكون أكبر من الصفر.');
            }

            $rate = 0;
            if (isset($data['unit_rate'])) {
                $rate = (float) $data['unit_rate'];
            } elseif (isset($data['piece_rate_id'])) {
                $pieceRate = PieceRate::where('tenant_id', $tenantId)
                    ->where('id', $data['piece_rate_id'])
                    ->firstOrFail();
                $rate = (float) $pieceRate->rate_per_piece;
            }

            if ($rate < 0) {
                throw new InvalidArgumentException('سعر القطعة لا يمكن أن يكون سالباً.');
            }

            $totalAmount = round($qty * $rate, 4);

            if (!empty($data['production_order_id'])) {
                \App\Models\ProductionOrder::where('tenant_id', $tenantId)->findOrFail($data['production_order_id']);
            }
            if (!empty($data['cutting_bundle_id'])) {
                \App\Models\CuttingBundle::where('tenant_id', $tenantId)->findOrFail($data['cutting_bundle_id']);
            }

            $log = PieceWorkLog::create([
                'tenant_id' => $tenantId,
                'employee_id' => $employee->id,
                'production_order_id' => $data['production_order_id'] ?? null,
                'cutting_bundle_id' => $data['cutting_bundle_id'] ?? null,
                'piece_rate_id' => $data['piece_rate_id'] ?? null,
                'work_date' => $data['work_date'] ?? now()->toDateString(),
                'completed_quantity' => $qty,
                'unit_rate' => $rate,
                'total_amount' => $totalAmount,
                'status' => 'verified',
            ]);

            return $log->load('employee');
        });
    }

    /**
     * إعداد مسير الرواتب لفترة محددة وتجميع أجور القطعة مع الراتب الأساسي
     */
    public function generatePayroll(string $tenantId, string $period, string $startDate, string $endDate): Payroll
    {
        return DB::transaction(function () use ($tenantId, $period, $startDate, $endDate) {
            $existing = Payroll::where('tenant_id', $tenantId)
                ->where('payroll_period', $period)
                ->first();

            if ($existing && $existing->status === 'paid') {
                throw new InvalidArgumentException("مسير الرواتب للفترة {$period} مدفوع مسبقاً ولا يمكن تكراره.");
            }

            $payroll = Payroll::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'payroll_period' => $period,
                ],
                [
                    'period_start' => $startDate,
                    'period_end' => $endDate,
                    'status' => 'draft',
                    'total_gross' => 0,
                    'total_deductions' => 0,
                    'total_net' => 0,
                ]
            );

            // حذف البنود القديمة غير المدفوعة لنفس المسير لإعادة الاحتساب بدقة
            PayrollItem::where('tenant_id', $tenantId)
                ->where('payroll_id', $payroll->id)
                ->delete();

            $employees = Employee::where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->get();

            $totalGross = 0;
            $totalDeductions = 0;
            $totalNet = 0;

            foreach ($employees as $employee) {
                $baseSalary = (float) $employee->base_salary;

                // جمع أجور القطعة غير المصروفة خلال الفترة المحددة
                $pieceRateEarnings = (float) PieceWorkLog::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->whereBetween('work_date', [$startDate, $endDate])
                    ->whereIn('status', ['verified', 'approved'])
                    ->sum('total_amount');

                $overtime = 0;
                $deductions = 0;
                $net = round($baseSalary + $pieceRateEarnings + $overtime - $deductions, 4);

                PayrollItem::create([
                    'tenant_id' => $tenantId,
                    'payroll_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'base_amount' => $baseSalary,
                    'piece_rate_earnings' => $pieceRateEarnings,
                    'overtime_earnings' => $overtime,
                    'deductions_and_advances' => $deductions,
                    'net_salary' => $net,
                    'is_paid' => false,
                ]);

                $totalGross += ($baseSalary + $pieceRateEarnings + $overtime);
                $totalDeductions += $deductions;
                $totalNet += $net;
            }

            $payroll->total_gross = $totalGross;
            $payroll->total_deductions = $totalDeductions;
            $payroll->total_net = $totalNet;
            $payroll->status = 'approved';
            $payroll->save();

            return $payroll->load('items.employee');
        });
    }
}

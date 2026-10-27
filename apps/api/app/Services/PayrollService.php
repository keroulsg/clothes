<?php

namespace App\Services;

use App\Models\CuttingBundle;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionOrder;
use App\Models\QualityDefectAdjustment;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PayrollService
{
    /**
     * تسجيل إنتاجية عامل واحتساب أجر القطعة المطابق لمرحلة الإنتاج
     * يدعم تسجيل دفعات تشغيل متعددة مع التحقق من عدم تجاوز سعة حزمة القص الإجمالية
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
                ProductionOrder::where('tenant_id', $tenantId)->findOrFail($data['production_order_id']);
            }

            if (!empty($data['cutting_bundle_id'])) {
                $bundle = CuttingBundle::where('tenant_id', $tenantId)->findOrFail($data['cutting_bundle_id']);
                
                // التحقق من عدم تجاوز إجمالي كميات العملية سعة الحزمة مع السماح بالدفعات المتكررة المشروعة
                if (!empty($data['piece_rate_id'])) {
                    $loggedQty = PieceWorkLog::where('tenant_id', $tenantId)
                        ->where('cutting_bundle_id', $bundle->id)
                        ->where('piece_rate_id', $data['piece_rate_id'])
                        ->where('status', '!=', 'rejected')
                        ->sum('completed_quantity');

                    if (($loggedQty + $qty) > $bundle->quantity) {
                        throw new InvalidArgumentException("إجمالي الكميات المسجلة للعملية في الحزمة ({$bundle->bundle_code}) يتجاوز سعة الحزمة ({$bundle->quantity} قطعة).");
                    }
                }
            }

            $status = $data['status'] ?? 'verified';

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
                'status' => $status,
                'approved_by' => $data['approved_by'] ?? null,
                'approved_at' => !empty($data['approved_by']) ? now() : null,
            ]);

            return $log->load('employee');
        });
    }

    /**
     * اعتماد سجل إنتاجية العامل بواسطة مشرف الإنتاج
     */
    public function approvePieceWorkLog(string $logId, int|string $userId): PieceWorkLog
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($logId, $userId, $tenantId) {
            $log = PieceWorkLog::where('tenant_id', $tenantId)->findOrFail($logId);

            if ($log->status === 'paid') {
                throw new InvalidArgumentException('لا يمكن تعديل سجل إنتاجية تم صرف مستحقاته في مسير مدفوع.');
            }

            $log->status = 'approved';
            $log->approved_by = $userId;
            $log->approved_at = now();
            $log->rejection_reason = null;
            $log->save();

            return $log->load(['employee', 'approver']);
        });
    }

    /**
     * رفض سجل إنتاجية عامل مع توثيق سبب الرفض
     */
    public function rejectPieceWorkLog(string $logId, int|string $userId, string $reason): PieceWorkLog
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($logId, $userId, $reason, $tenantId) {
            $log = PieceWorkLog::where('tenant_id', $tenantId)->findOrFail($logId);

            if ($log->status === 'paid') {
                throw new InvalidArgumentException('لا يمكن رفض سجل إنتاجية تم صرف مستحقاته في مسير مدفوع.');
            }

            $log->status = 'rejected';
            $log->approved_by = $userId;
            $log->approved_at = now();
            $log->rejection_reason = $reason;
            $log->save();

            return $log->load(['employee', 'approver']);
        });
    }

    /**
     * إنشاء تقرير عيب جودة وتحقيق مبدئي مع اقتراح خصم (لا يتم الخصم تلقائياً أبداً)
     */
    public function createQualityDefectAdjustment(array $data, int|string $reportedBy): QualityDefectAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $reportedBy, $tenantId) {
            $employee = Employee::where('tenant_id', $tenantId)->findOrFail($data['employee_id']);
            $order = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($data['production_order_id']);

            if (!empty($data['cutting_bundle_id'])) {
                CuttingBundle::where('tenant_id', $tenantId)->findOrFail($data['cutting_bundle_id']);
            }

            $proposedAmount = isset($data['proposed_penalty_amount']) ? (float)$data['proposed_penalty_amount'] : 0.0;
            if ($proposedAmount < 0) {
                throw new InvalidArgumentException('قيمة الخصم المقترحة لا يمكن أن تكون سالبة.');
            }

            // القاعدة الحرجة: تسجيل العيب لا ينفذ خصماً تلقائياً قط بل يبدأ بحالة معلقة للاعتماد
            return QualityDefectAdjustment::create([
                'tenant_id' => $tenantId,
                'quality_defect_id' => $data['quality_defect_id'] ?? null,
                'quality_inspection_id' => $data['quality_inspection_id'] ?? null,
                'production_order_id' => $order->id,
                'cutting_bundle_id' => $data['cutting_bundle_id'] ?? null,
                'employee_id' => $employee->id,
                'production_stage_id' => $data['production_stage_id'] ?? null,
                'investigation_notes' => $data['investigation_notes'] ?? null,
                'proposed_penalty_amount' => $proposedAmount,
                'adjustment_reason' => $data['adjustment_reason'],
                'status' => 'pending_approval',
                'reported_by' => $reportedBy,
            ]);
        });
    }

    /**
     * اعتماد الخصم الصادر عن عيب الجودة بواسطة مدير الإنتاج المخول
     */
    public function approveQualityDefectAdjustment(string $adjustmentId, int|string $approvedBy, ?float $approvedAmount = null): QualityDefectAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($adjustmentId, $approvedBy, $approvedAmount, $tenantId) {
            $adjustment = QualityDefectAdjustment::where('tenant_id', $tenantId)->findOrFail($adjustmentId);

            if ($adjustment->status === 'settled') {
                throw new InvalidArgumentException('تمت تسوية هذا الخصم بالفعل في مسير رواتب ولا يمكن تعديله مباشرة.');
            }

            if ($adjustment->status === 'reversed') {
                throw new InvalidArgumentException('تم إلغاء هذا التعديل مسبقاً.');
            }

            if ($approvedAmount !== null) {
                if ($approvedAmount < 0) {
                    throw new InvalidArgumentException('مبلغ الخصم المعتمد لا يمكن أن يكون سالباً.');
                }
                $adjustment->proposed_penalty_amount = $approvedAmount;
            }

            $adjustment->status = 'approved';
            $adjustment->approved_by = $approvedBy;
            $adjustment->approved_at = now();
            $adjustment->save();

            return $adjustment->load(['employee', 'approver', 'reporter']);
        });
    }

    /**
     * رفض الخصم المقترح لعدم ثبوت مسؤولية العامل أو إسقاط العقوبة
     */
    public function rejectQualityDefectAdjustment(string $adjustmentId, int|string $rejectedBy, string $reason): QualityDefectAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($adjustmentId, $rejectedBy, $reason, $tenantId) {
            $adjustment = QualityDefectAdjustment::where('tenant_id', $tenantId)->findOrFail($adjustmentId);

            if ($adjustment->status === 'settled') {
                throw new InvalidArgumentException('تمت تسوية هذا الخصم بالفعل في مسير رواتب.');
            }

            $adjustment->status = 'rejected';
            $adjustment->reversal_reason = $reason;
            $adjustment->reversed_by = $rejectedBy;
            $adjustment->reversed_at = now();
            $adjustment->save();

            return $adjustment->load(['employee', 'reverser']);
        });
    }

    /**
     * تسجيل تظلم أو اعتراض العامل على الخصم المقترح
     */
    public function recordWorkerObjection(string $adjustmentId, string $notes): QualityDefectAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($adjustmentId, $notes, $tenantId) {
            $adjustment = QualityDefectAdjustment::where('tenant_id', $tenantId)->findOrFail($adjustmentId);

            if ($adjustment->status === 'settled') {
                throw new InvalidArgumentException('تمت تسوية الخصم بالفعل في مسير رواتب.');
            }

            $adjustment->status = 'objected';
            $adjustment->worker_objection_notes = $notes;
            $adjustment->objection_submitted_at = now();
            $adjustment->save();

            return $adjustment->load(['employee']);
        });
    }

    /**
     * إلغاء أو تصحيح خصم عيوب الجودة عبر قيد تسوية تعويضي دون حذف التاريخ المحاسبي
     */
    public function reverseQualityDefectAdjustment(string $adjustmentId, int|string $reversedBy, string $reason): QualityDefectAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($adjustmentId, $reversedBy, $reason, $tenantId) {
            $adjustment = QualityDefectAdjustment::where('tenant_id', $tenantId)->findOrFail($adjustmentId);

            if ($adjustment->status === 'reversed') {
                throw new InvalidArgumentException('تم إلغاء هذا التعديل بالفعل.');
            }

            $wasSettled = ($adjustment->status === 'settled');

            $adjustment->status = 'reversed';
            $adjustment->reversal_reason = $reason;
            $adjustment->reversed_by = $reversedBy;
            $adjustment->reversed_at = now();
            $adjustment->save();

            // إذا كان الخصم قد تمت تسويته وصرفه في مسير رواتب، نقوم بإنشاء سجل تعويضي معاكس (Compensating Record)
            // لرد المبلغ للعامل في المسير القادم دون المساس بالمسير المدفوع تاريخياً
            if ($wasSettled && (float)$adjustment->proposed_penalty_amount > 0) {
                QualityDefectAdjustment::create([
                    'tenant_id' => $tenantId,
                    'quality_defect_id' => $adjustment->quality_defect_id,
                    'quality_inspection_id' => $adjustment->quality_inspection_id,
                    'production_order_id' => $adjustment->production_order_id,
                    'cutting_bundle_id' => $adjustment->cutting_bundle_id,
                    'employee_id' => $adjustment->employee_id,
                    'production_stage_id' => $adjustment->production_stage_id,
                    'investigation_notes' => "تسوية تعويضية لإلغاء الخصم السابق رقم {$adjustment->id}. سبب الإلغاء: {$reason}",
                    'proposed_penalty_amount' => 0 - (float)$adjustment->proposed_penalty_amount, // قيمة سالبة تعيد المستحق
                    'adjustment_reason' => "تسوية استرداد خصم عيوب جودة ملغى: {$reason}",
                    'status' => 'approved',
                    'reported_by' => $reversedBy,
                    'approved_by' => $reversedBy,
                    'approved_at' => now(),
                ]);
            }

            return $adjustment->load(['employee', 'reverser']);
        });
    }

    /**
     * إعداد مسير الرواتب لفترة محددة وتجميع أجور القطعة مع الراتب الأساسي والخصومات المعتمدة
     */
    public function generatePayroll(string $tenantId, string $period, string $startDate, string $endDate): Payroll
    {
        app()->instance('current_tenant_id', $tenantId);

        return DB::transaction(function () use ($tenantId, $period, $startDate, $endDate) {
            $existing = Payroll::where('tenant_id', $tenantId)
                ->where('payroll_period', $period)
                ->first();

            if ($existing && $existing->status === 'paid') {
                throw new InvalidArgumentException("مسير الرواتب للفترة {$period} مدفوع مسبقاً ولا يمكن تعديله أو إعادة احتسابه.");
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

                // احتساب خصومات عيوب الجودة المعتمدة حصراً وغير المسواة سابقاً
                $approvedAdjustments = QualityDefectAdjustment::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->where('status', 'approved')
                    ->whereNull('settled_payroll_id')
                    ->get();

                $defectDeductions = (float) $approvedAdjustments->sum('proposed_penalty_amount');
                $deductions = round(max(0, $defectDeductions), 4);
                $net = round($baseSalary + $pieceRateEarnings + $overtime - $deductions, 4);

                $payrollItem = PayrollItem::create([
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

                // ربط الخصومات المعتمدة بالبند والمسير لمنع التكرار نهائياً وتوثيق التسوية
                foreach ($approvedAdjustments as $adj) {
                    $adj->update([
                        'settled_payroll_id' => $payroll->id,
                        'settled_payroll_item_id' => $payrollItem->id,
                        'status' => 'settled',
                    ]);
                }

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

    /**
     * اعتماد صرف مسير الرواتب وقفله مالياً
     */
    public function markPayrollPaid(string $payrollId): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            $payroll->status = 'paid';
            $payroll->save();

            PayrollItem::where('tenant_id', $tenantId)
                ->where('payroll_id', $payroll->id)
                ->update(['is_paid' => true]);

            // تحديث سجلات إنتاجية العمل المرتبطة بفترة المسير لتصبح مسددة 'paid'
            PieceWorkLog::where('tenant_id', $tenantId)
                ->whereBetween('work_date', [$payroll->period_start, $payroll->period_end])
                ->whereIn('status', ['verified', 'approved'])
                ->update(['status' => 'paid']);

            return $payroll->load('items.employee');
        });
    }
}

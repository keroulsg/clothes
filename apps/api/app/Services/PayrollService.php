<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\CuttingBundle;
use App\Models\Employee;
use App\Models\EmployeeAdjustment;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PayrollPayment;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionOrder;
use App\Models\QualityDefectAdjustment;
use Carbon\Carbon;
use Exception;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PayrollService
{
    /**
     * تسجيل إنتاجية عامل واحتساب أجر القطعة المطابق لمرحلة الإنتاج
     */
    public function recordPieceWork(array $data): PieceWorkLog
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : ($data['tenant_id'] ?? null);
        if (!$tenantId && !empty($data['employee_id'])) {
            $emp = Employee::withoutGlobalScopes()->find($data['employee_id']);
            if ($emp) {
                $tenantId = $emp->tenant_id;
                app()->instance('current_tenant_id', $tenantId);
            }
        }

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
     * تسجيل حضور وانصراف وساعات عمل العامل
     */
    public function recordAttendance(array $data, int|string $userId): Attendance
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : ($data['tenant_id'] ?? null);
        if (!$tenantId && !empty($data['employee_id'])) {
            $emp = Employee::withoutGlobalScopes()->find($data['employee_id']);
            if ($emp) {
                $tenantId = $emp->tenant_id;
                app()->instance('current_tenant_id', $tenantId);
            }
        }

        return DB::transaction(function () use ($data, $userId, $tenantId) {
            $employee = Employee::where('tenant_id', $tenantId)->findOrFail($data['employee_id']);
            $date = $data['attendance_date'] ?? now()->toDateString();

            // فحص التكرار (Unique per employee and date)
            $formattedDate = \Illuminate\Support\Carbon::parse($date)->toDateString();
            $existing = Attendance::where('tenant_id', $tenantId)
                ->where('employee_id', $employee->id)
                ->where(function ($q) use ($formattedDate) {
                    $q->whereDate('attendance_date', $formattedDate)
                      ->orWhere('attendance_date', 'like', "{$formattedDate}%");
                })
                ->first();

            $checkIn = $data['check_in'] ?? null;
            $checkOut = $data['check_out'] ?? null;
            $workingHours = isset($data['working_hours']) ? (float)$data['working_hours'] : 0.0;
            $overtimeHours = isset($data['overtime_hours']) ? (float)$data['overtime_hours'] : 0.0;
            $status = $data['status'] ?? 'present';

            // احتساب ساعات العمل تلقائياً إذا توفرت طوابع الدخول والخروج
            if ($checkIn && $checkOut && $workingHours <= 0) {
                try {
                    $in = Carbon::parse($checkIn);
                    $out = Carbon::parse($checkOut);
                    $diffMinutes = abs($out->diffInMinutes($in, false));
                    $totalHours = round($diffMinutes / 60, 2);
                    // معيار الوردية الأساسية: 8 ساعات وما زاد يعتبر إضافي
                    if ($totalHours > 8) {
                        $workingHours = 8.0;
                        if ($overtimeHours <= 0) {
                            $overtimeHours = round($totalHours - 8.0, 2);
                        }
                    } else {
                        $workingHours = $totalHours;
                    }
                } catch (Exception $e) {
                    // fallback to provided values
                }
            }

            $isPayable = in_array($status, ['present', 'late', 'half_day', 'excused_leave'], true);
            if (isset($data['is_payable'])) {
                $isPayable = (bool)$data['is_payable'];
            }

            // إذا كان مسجلاً بالفعل، يتم التحديث الفوري (Upsert) بدلاً من إلقاء خطأ لمنع تعطيل المستخدم
            if ($existing) {
                $existing->update([
                    'branch_id' => $data['branch_id'] ?? $existing->branch_id ?? $employee->branch_id,
                    'check_in' => $checkIn ?? $existing->check_in,
                    'check_out' => $checkOut ?? $existing->check_out,
                    'status' => $status,
                    'working_hours' => $workingHours >= 0 ? $workingHours : $existing->working_hours,
                    'overtime_hours' => $overtimeHours >= 0 ? $overtimeHours : $existing->overtime_hours,
                    'late_minutes' => isset($data['late_minutes']) ? (int)$data['late_minutes'] : $existing->late_minutes,
                    'early_departure_minutes' => isset($data['early_departure_minutes']) ? (int)$data['early_departure_minutes'] : $existing->early_departure_minutes,
                    'is_payable' => $isPayable,
                    'notes' => $data['notes'] ?? $existing->notes,
                    'created_by' => $userId,
                ]);

                return $existing->fresh();
            }

            return Attendance::create([
                'tenant_id' => $tenantId,
                'employee_id' => $employee->id,
                'branch_id' => $data['branch_id'] ?? $employee->branch_id,
                'attendance_date' => $date,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'status' => $status,
                'working_hours' => $workingHours,
                'overtime_hours' => $overtimeHours,
                'late_minutes' => (int)($data['late_minutes'] ?? 0),
                'early_departure_minutes' => (int)($data['early_departure_minutes'] ?? 0),
                'is_payable' => $isPayable,
                'notes' => $data['notes'] ?? null,
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * تصحيح سجل حضور وانصراف مع توثيق السبب والتدقيق
     */
    public function updateAttendance(string $id, array $data, int|string $userId): Attendance
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($id, $data, $userId, $tenantId) {
            $attendance = Attendance::where('tenant_id', $tenantId)->findOrFail($id);

            $reason = $data['correction_reason'] ?? 'تعديل إداري معتمد';
            $originalNotes = $attendance->notes;
            $newNotes = ($originalNotes ? $originalNotes . ' | ' : '') . "تم التصحيح بواسطة مستخدم #{$userId}: {$reason}";

            if (isset($data['status'])) $attendance->status = $data['status'];
            if (isset($data['check_in'])) $attendance->check_in = $data['check_in'];
            if (isset($data['check_out'])) $attendance->check_out = $data['check_out'];

            if (isset($data['working_hours'])) {
                $attendance->working_hours = (float)$data['working_hours'];
            } elseif ($attendance->check_in && $attendance->check_out) {
                try {
                    $in = Carbon::parse($attendance->check_in);
                    $out = Carbon::parse($attendance->check_out);
                    $diffMinutes = abs($out->diffInMinutes($in, false));
                    $totalHours = round($diffMinutes / 60, 2);
                    if ($totalHours > 8) {
                        $attendance->working_hours = 8.0;
                        if (!isset($data['overtime_hours'])) {
                            $attendance->overtime_hours = round($totalHours - 8.0, 2);
                        }
                    } else {
                        $attendance->working_hours = $totalHours;
                        if (!isset($data['overtime_hours'])) {
                            $attendance->overtime_hours = 0.0;
                        }
                    }
                } catch (Exception $e) {}
            }

            if (isset($data['overtime_hours'])) $attendance->overtime_hours = (float)$data['overtime_hours'];
            if (isset($data['late_minutes'])) $attendance->late_minutes = (int)$data['late_minutes'];
            if (isset($data['is_payable'])) $attendance->is_payable = (bool)$data['is_payable'];
            $attendance->notes = $newNotes;
            $attendance->updated_by = $userId;
            $attendance->save();

            return $attendance->load('employee');
        });
    }

    /**
     * تسجيل سلفة أو مكافأة أو بدل أو خصم مالي للموظف
     */
    public function createEmployeeAdjustment(array $data, int|string $userId): EmployeeAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $userId, $tenantId) {
            $employee = Employee::where('tenant_id', $tenantId)->findOrFail($data['employee_id']);
            $amount = (float)$data['amount'];
            if ($amount <= 0) {
                throw new InvalidArgumentException('مبلغ التعديل أو السلفة يجب أن يكون أكبر من الصفر.');
            }

            $installmentsCount = max(1, (int)($data['installments_count'] ?? 1));
            $installmentAmount = isset($data['installment_amount']) && (float)$data['installment_amount'] > 0
                ? round((float)$data['installment_amount'], 4)
                : round($amount / $installmentsCount, 4);

            return EmployeeAdjustment::create([
                'tenant_id' => $tenantId,
                'employee_id' => $employee->id,
                'type' => $data['type'], // advance, advance_repayment, allowance, bonus, deduction
                'amount' => $amount,
                'currency' => $data['currency'] ?? 'EGP',
                'installments_count' => $installmentsCount,
                'installment_amount' => $installmentAmount,
                'paid_amount' => 0.0,
                'remaining_balance' => $amount,
                'adjustment_date' => $data['adjustment_date'] ?? now()->toDateString(),
                'payroll_period' => $data['payroll_period'] ?? null,
                'reason' => $data['reason'],
                'notes' => $data['notes'] ?? null,
                'status' => 'pending_approval',
                'created_by' => $userId,
            ]);
        });
    }

    /**
     * اعتماد السلفة أو التعديل المالي بواسطة المدير أو المحاسب
     */
    public function approveEmployeeAdjustment(string $id, int|string $userId): EmployeeAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($id, $userId, $tenantId) {
            $adj = EmployeeAdjustment::where('tenant_id', $tenantId)->findOrFail($id);
            if ($adj->status === 'settled') {
                throw new InvalidArgumentException('تمت تسوية هذا التعديل بالفعل في مسير رواتب.');
            }

            $adj->status = 'approved';
            $adj->approved_by = $userId;
            $adj->approved_at = now();
            $adj->save();

            return $adj->load(['employee', 'approver']);
        });
    }

    /**
     * رفض السلفة أو التعديل المالي مع توثيق السبب
     */
    public function rejectEmployeeAdjustment(string $id, int|string $userId, string $reason): EmployeeAdjustment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($id, $userId, $reason, $tenantId) {
            $adj = EmployeeAdjustment::where('tenant_id', $tenantId)->findOrFail($id);
            if ($adj->status === 'settled') {
                throw new InvalidArgumentException('تمت تسوية هذا التعديل بالفعل في مسير رواتب.');
            }

            $adj->status = 'rejected';
            $adj->notes = ($adj->notes ? $adj->notes . ' | ' : '') . "سبب الرفض: {$reason}";
            $adj->save();

            return $adj->load('employee');
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

            // إذا كان الخصم قد تمت تسويته وصرفه في مسير رواتب، نقوم بإنشاء سجل تعويضي معاكس
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
                    'proposed_penalty_amount' => 0 - (float)$adjustment->proposed_penalty_amount,
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
     * إلغاء وفك تسويات الرواتب السابقة وإعادة السلف والخصومات لحالتها المعتمدة
     */
    public function rollbackPayrollSettlements(string $payrollId, string $tenantId): void
    {
        // 1. استرجاع السلف وتحديث رصيدها المتبقي والمدفوع
        $payrollItems = PayrollItem::where('tenant_id', $tenantId)
            ->where('payroll_id', $payrollId)
            ->get();

        foreach ($payrollItems as $pItem) {
            $breakdown = $pItem->calculation_breakdown;
            if (is_array($breakdown) && !empty($breakdown['advances_list'])) {
                foreach ($breakdown['advances_list'] as $advEntry) {
                    if (empty($advEntry['id'])) continue;
                    $adv = EmployeeAdjustment::where('tenant_id', $tenantId)->find($advEntry['id']);
                    if (!$adv) continue;

                    $deductedInThisPayroll = (float)($advEntry['deducted_amount'] ?? $advEntry['amount'] ?? 0);
                    $newPaid = max(0, round((float)($adv->paid_amount ?? 0) - $deductedInThisPayroll, 4));
                    $newRemaining = min((float)$adv->amount, round((float)($adv->remaining_balance ?? 0) + $deductedInThisPayroll, 4));

                    $adv->paid_amount = $newPaid;
                    $adv->remaining_balance = $newRemaining;
                    $adv->status = 'approved';
                    if ($adv->settled_payroll_id === $payrollId) {
                        $adv->settled_payroll_id = null;
                    }
                    $adv->save();
                }
            }
        }

        // 2. فك تسويات باقي التعديلات المالية المرتبطة بالمسير
        EmployeeAdjustment::where('tenant_id', $tenantId)
            ->where('settled_payroll_id', $payrollId)
            ->update([
                'status' => 'approved',
                'settled_payroll_id' => null,
            ]);

        // 3. فك تسويات خصومات عيوب الجودة
        QualityDefectAdjustment::where('tenant_id', $tenantId)
            ->where('settled_payroll_id', $payrollId)
            ->update([
                'status' => 'approved',
                'settled_payroll_id' => null,
                'settled_payroll_item_id' => null,
            ]);
    }

    /**
     * محرك احتساب مسير الرواتب الموحد (Payroll Engine)
     * يجمع أجور القطعة، والأجور اليومية، والساعات المعتمدة، والإضافي، والرواتب الثابتة، والبدلات، والسلف، وخصومات الجودة
     */
    public function generatePayroll(string $tenantId, string $period, string $startDate, string $endDate, string $initialStatus = 'approved'): Payroll
    {
        app()->instance('current_tenant_id', $tenantId);

        return DB::transaction(function () use ($tenantId, $period, $startDate, $endDate, $initialStatus) {
            $existing = Payroll::where('tenant_id', $tenantId)
                ->where('payroll_period', $period)
                ->first();

            // قاعدة الحصانة التاريخية: المسيرات المقفلة والمدفوعة نهائياً لا يعاد احتسابها
            if ($existing) {
                if (in_array($existing->status, ['finalized', 'paid'], true) || (float)$existing->total_paid > 0) {
                    throw new InvalidArgumentException("مسير الرواتب للفترة {$period} مقفل مالياً بحالة ({$existing->status}) أو تم صرف دفعات منه ولا يمكن تعديله.");
                }

                // فك التسويات السابقة قبل إعادة الاحتساب
                $this->rollbackPayrollSettlements($existing->id, $tenantId);
            }

            $payroll = Payroll::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'payroll_period' => $period,
                ],
                [
                    'period_start' => $startDate,
                    'period_end' => $endDate,
                    'status' => $initialStatus,
                    'total_gross' => 0,
                    'total_deductions' => 0,
                    'total_net' => 0,
                    'total_paid' => 0,
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

            $startOfDay = Carbon::parse($startDate)->startOfDay()->toDateTimeString();
            $endOfDay = Carbon::parse($endDate)->endOfDay()->toDateTimeString();
            $startDateStr = Carbon::parse($startDate)->toDateString();
            $endDateStr = Carbon::parse($endDate)->toDateString();

            foreach ($employees as $employee) {
                $payType = $employee->pay_type;
                $baseSalary = (float) $employee->base_salary;
                $pieceRateEarnings = 0.0;
                $dailyEarnings = 0.0;
                $hourlyEarnings = 0.0;
                $overtimeEarnings = 0.0;
                $workingHours = 0.0;
                $overtimeHours = 0.0;
                $payableDays = 0;

                // 1. احتساب أجر القطعة (Piece-Rate Compensation)
                $loggedPieceEarnings = (float) PieceWorkLog::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->where(function ($q) use ($startDateStr, $endDateStr, $startOfDay, $endOfDay) {
                        $q->whereBetween('work_date', [$startOfDay, $endOfDay])
                          ->orWhere(function ($sub) use ($startDateStr, $endDateStr) {
                              $sub->whereDate('work_date', '>=', $startDateStr)
                                  ->whereDate('work_date', '<=', $endDateStr);
                          });
                    })
                    ->whereIn('status', ['verified', 'approved'])
                    ->sum('total_amount');

                if (in_array($payType, ['piece_rate', 'hybrid'], true) || $loggedPieceEarnings > 0) {
                    $pieceRateEarnings = $loggedPieceEarnings;
                }

                // 2. احتساب الأجر اليومي وساعات العمل من سجلات الحضور والانصراف المعتمدة (Attendance)
                $attendances = Attendance::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->where(function ($q) use ($startDateStr, $endDateStr, $startOfDay, $endOfDay) {
                        $q->whereBetween('attendance_date', [$startOfDay, $endOfDay])
                          ->orWhere(function ($sub) use ($startDateStr, $endDateStr) {
                              $sub->whereDate('attendance_date', '>=', $startDateStr)
                                  ->whereDate('attendance_date', '<=', $endDateStr);
                          });
                    })
                    ->get();

                if ($payType === 'daily') {
                    $payableDays = $attendances->where('is_payable', true)->where('status', '!=', 'absent')->count();
                    $dailyRate = (float) ($employee->daily_rate > 0 ? $employee->daily_rate : ($baseSalary / 26));
                    $dailyEarnings = round($payableDays * $dailyRate, 4);
                } elseif ($payType === 'shift_based') {
                    $payableDays = $attendances->where('is_payable', true)->where('status', '!=', 'absent')->count();
                    $shiftRate = (float) ($employee->shift_rate > 0 ? $employee->shift_rate : ($employee->daily_rate > 0 ? $employee->daily_rate : ($baseSalary / 26)));
                    $dailyEarnings = round($payableDays * $shiftRate, 4);
                } elseif ($payType === 'weekly') {
                    $startC = Carbon::parse($startDate);
                    $endC = Carbon::parse($endDate);
                    $weeks = max(1, (int) ceil($startC->diffInDays($endC) / 7));
                    $weeklyRate = (float) ($employee->weekly_rate > 0 ? $employee->weekly_rate : ($baseSalary / 4));
                    $baseAmount = round($weeks * $weeklyRate, 4);
                } elseif ($payType === 'hourly') {
                    $workingHours = (float) $attendances->where('is_payable', true)->sum('working_hours');
                    $overtimeHours = (float) $attendances->where('is_payable', true)->sum('overtime_hours');
                    $hourlyRate = (float) $employee->hourly_rate;
                    $hourlyEarnings = round($workingHours * $hourlyRate, 4);
                    // معامل الساعات الإضافية (1.5x)
                    $overtimeEarnings = round($overtimeHours * ($hourlyRate * 1.5), 4);
                } elseif (in_array($payType, ['fixed_salary', 'hybrid', 'piece_rate'], true)) {
                    // Overtime can also be logged on attendances for salaried / piece rate staff
                    $overtimeHours = (float) $attendances->sum('overtime_hours');
                    if ($overtimeHours > 0) {
                        $overtimeRate = (float) ($employee->hourly_rate > 0 ? $employee->hourly_rate : (($baseSalary / 208) * 1.5));
                        $overtimeEarnings = round($overtimeHours * $overtimeRate, 4);
                    }
                }

                // الراتب الأساسي يطبق للموظف ذو الراتب الثابت أو الهجين أو الأسبوعي أو كضمان أساسي
                if ($payType !== 'weekly') {
                    $baseAmount = in_array($payType, ['fixed_salary', 'hybrid', 'piece_rate'], true) ? (float) $baseSalary : 0.0;
                }

                // 3. احتساب البدلات والمكافآت المعتمدة (Allowances & Bonuses)
                $approvedBonuses = EmployeeAdjustment::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->whereIn('type', ['allowance', 'bonus'])
                    ->where('status', 'approved')
                    ->where(function ($q) use ($payroll) {
                        $q->whereNull('settled_payroll_id')
                          ->orWhere('settled_payroll_id', $payroll->id);
                    })
                    ->get();

                $bonusesTotal = (float) $approvedBonuses->sum('amount');

                // 4. احتساب سداد السلف والأقساط الشهرية المعتمدة (Advances & Installment Deductions)
                $approvedAdvances = EmployeeAdjustment::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->whereIn('type', ['advance', 'advance_repayment'])
                    ->where('status', 'approved')
                    ->where(function ($q) use ($payroll) {
                        $q->whereNull('settled_payroll_id')
                          ->orWhere('settled_payroll_id', $payroll->id);
                    })
                    ->where(function ($q) {
                        $q->where('remaining_balance', '>', 0)
                          ->orWhereNull('remaining_balance');
                    })
                    ->get();

                $advancesRepaidTotal = 0.0;
                $advancesList = [];
                $advancesToUpdate = [];

                foreach ($approvedAdvances as $adv) {
                    $totalAdv = (float)$adv->amount;
                    $instCount = max(1, (int)($adv->installments_count ?? 1));
                    $instAmount = (float)($adv->installment_amount > 0 ? $adv->installment_amount : round($totalAdv / $instCount, 4));
                    $remBefore = (float)($adv->remaining_balance !== null ? $adv->remaining_balance : $totalAdv);
                    $paidBefore = (float)($adv->paid_amount ?? 0);

                    if ($remBefore <= 0.0001) {
                        continue;
                    }

                    // الاستقطاع الشهري هو قيمة القسط أو الرصيد المتبقي أيهما أقل
                    $deductAmount = round(min($instAmount, $remBefore), 4);
                    $remAfter = round(max(0, $remBefore - $deductAmount), 4);
                    $paidAfter = round($paidBefore + $deductAmount, 4);

                    $advancesRepaidTotal += $deductAmount;

                    $advancesList[] = [
                        'id' => $adv->id,
                        'type' => $adv->type,
                        'total_amount' => $totalAdv,
                        'amount' => $deductAmount,
                        'deducted_amount' => $deductAmount,
                        'installments_count' => $instCount,
                        'installment_amount' => $instAmount,
                        'paid_before' => $paidBefore,
                        'paid_after' => $paidAfter,
                        'remaining_before' => $remBefore,
                        'remaining_after' => $remAfter,
                        'is_final_installment' => ($remAfter <= 0.0001),
                        'reason' => $adv->reason,
                        'adjustment_date' => $adv->adjustment_date ? Carbon::parse($adv->adjustment_date)->toDateString() : null,
                    ];

                    $advancesToUpdate[] = [
                        'model' => $adv,
                        'paid_after' => $paidAfter,
                        'remaining_after' => $remAfter,
                        'is_settled' => ($remAfter <= 0.0001),
                    ];
                }

                // 4b. الخصومات العامة المعتمدة (General Deductions)
                $approvedDeductions = EmployeeAdjustment::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->where('type', 'deduction')
                    ->where('status', 'approved')
                    ->where(function ($q) use ($payroll) {
                        $q->whereNull('settled_payroll_id')
                          ->orWhere('settled_payroll_id', $payroll->id);
                    })
                    ->get();

                $generalDeductionsTotal = (float) $approvedDeductions->sum('amount');

                // 5. احتساب خصومات عيوب الجودة المعتمدة حصراً وغير المسواة سابقاً
                $approvedQualityAdjustments = QualityDefectAdjustment::where('tenant_id', $tenantId)
                    ->where('employee_id', $employee->id)
                    ->where('status', 'approved')
                    ->where(function ($q) use ($payroll) {
                        $q->whereNull('settled_payroll_id')
                          ->orWhere('settled_payroll_id', $payroll->id);
                    })
                    ->get();

                $defectDeductions = (float) $approvedQualityAdjustments->sum('proposed_penalty_amount');

                // إجمالي الاستحقاقات والاستقطاعات والصافي
                $gross = round($baseAmount + $pieceRateEarnings + $dailyEarnings + $hourlyEarnings + $overtimeEarnings + $bonusesTotal, 4);
                $totalEmpDeductions = round(max(0, $advancesRepaidTotal + $generalDeductionsTotal + $defectDeductions), 4);
                $net = round(max(0, $gross - $totalEmpDeductions), 4);

                // قوائم تفصيلية للبدلات والخصومات
                $bonusesList = $approvedBonuses->map(function ($a) {
                    return [
                        'id' => $a->id,
                        'type' => $a->type,
                        'amount' => (float)$a->amount,
                        'reason' => $a->reason,
                        'adjustment_date' => $a->adjustment_date ? Carbon::parse($a->adjustment_date)->toDateString() : null,
                    ];
                })->values()->toArray();

                $deductionsList = $approvedDeductions->map(function ($a) {
                    return [
                        'id' => $a->id,
                        'type' => $a->type,
                        'amount' => (float)$a->amount,
                        'reason' => $a->reason,
                        'adjustment_date' => $a->adjustment_date ? Carbon::parse($a->adjustment_date)->toDateString() : null,
                    ];
                })->values()->toArray();

                // تفصيل احتساب شفاف (Calculation Breakdown) لضمان الشفافية
                $breakdown = [
                    'pay_type' => $payType,
                    'base_amount' => $baseAmount,
                    'piece_rate_earnings' => $pieceRateEarnings,
                    'daily_earnings' => $dailyEarnings,
                    'payable_days' => $payableDays,
                    'hourly_earnings' => $hourlyEarnings,
                    'working_hours' => $workingHours,
                    'overtime_earnings' => $overtimeEarnings,
                    'overtime_hours' => $overtimeHours,
                    'allowances_and_bonuses' => $bonusesTotal,
                    'advances_repaid' => $advancesRepaidTotal,
                    'defect_deductions' => $defectDeductions,
                    'general_deductions' => $generalDeductionsTotal,
                    'gross_amount' => $gross,
                    'total_deductions' => $totalEmpDeductions,
                    'net_salary' => $net,
                    'advances_list' => $advancesList,
                    'bonuses_list' => $bonusesList,
                    'deductions_list' => $deductionsList,
                ];

                $payrollItem = PayrollItem::create([
                    'tenant_id' => $tenantId,
                    'payroll_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'base_amount' => $baseAmount,
                    'piece_rate_earnings' => $pieceRateEarnings,
                    'hourly_earnings' => $hourlyEarnings,
                    'daily_earnings' => $dailyEarnings,
                    'overtime_earnings' => $overtimeEarnings,
                    'allowances_and_bonuses' => $bonusesTotal,
                    'advances_repaid' => $advancesRepaidTotal,
                    'defect_deductions' => $defectDeductions,
                    'general_deductions' => $generalDeductionsTotal,
                    'deductions_and_advances' => $totalEmpDeductions,
                    'gross_amount' => $gross,
                    'net_salary' => $net,
                    'paid_amount' => 0,
                    'balance_due' => $net,
                    'calculation_breakdown' => $breakdown,
                    'is_paid' => false,
                ]);

                // تحديث السلف وأرصدتها المتبقية
                foreach ($advancesToUpdate as $advData) {
                    $m = $advData['model'];
                    $m->paid_amount = $advData['paid_after'];
                    $m->remaining_balance = $advData['remaining_after'];
                    if ($advData['is_settled']) {
                        $m->status = 'settled';
                        $m->settled_payroll_id = $payroll->id;
                    } else {
                        $m->status = 'approved';
                    }
                    $m->save();
                }

                // ربط البدلات والخصومات العامة المسواة بالمسير
                foreach ($approvedBonuses as $adj) {
                    $adj->update(['settled_payroll_id' => $payroll->id, 'status' => 'settled']);
                }
                foreach ($approvedDeductions as $adj) {
                    $adj->update(['settled_payroll_id' => $payroll->id, 'status' => 'settled']);
                }
                foreach ($approvedQualityAdjustments as $adj) {
                    $adj->update([
                        'settled_payroll_id' => $payroll->id,
                        'settled_payroll_item_id' => $payrollItem->id,
                        'status' => 'settled',
                    ]);
                }

                $totalGross += $gross;
                $totalDeductions += $totalEmpDeductions;
                $totalNet += $net;
            }

            $payroll->total_gross = round($totalGross, 4);
            $payroll->total_deductions = round($totalDeductions, 4);
            $payroll->total_net = round($totalNet, 4);
            $payroll->status = $initialStatus;
            $payroll->save();

            return $payroll->load('items.employee');
        });
    }

    /**
     * اعتماد مسير الرواتب بعد المراجعة
     */
    public function approvePayroll(string $payrollId, int|string $userId): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $userId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            if (in_array($payroll->status, ['finalized', 'paid'], true)) {
                throw new InvalidArgumentException('هذا المسير مقفل أو مدفوع مسبقاً.');
            }

            $payroll->status = 'approved';
            $payroll->approved_by = $userId;
            $payroll->approved_at = now();
            $payroll->rejection_reason = null;
            $payroll->save();

            return $payroll->load('items.employee');
        });
    }

    /**
     * رفض مسير الرواتب مع توثيق السبب
     */
    public function rejectPayroll(string $payrollId, int|string $userId, string $reason): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $userId, $reason, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            if (in_array($payroll->status, ['finalized', 'paid', 'partially_paid'], true)) {
                throw new InvalidArgumentException('لا يمكن رفض مسير رواتب مقفل أو بدأت عمليات صرفه.');
            }

            $payroll->status = 'rejected';
            $payroll->rejection_reason = $reason;
            $payroll->save();

            return $payroll->load('items.employee');
        });
    }

    /**
     * قفل وتثبيت مسير الرواتب (Finalize Payroll)
     * يمنع أي تعديل أو إعادة احتساب مستقبلية ويثبت الأرقام تاريخياً
     */
    public function finalizePayroll(string $payrollId, int|string $userId): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $userId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            if ($payroll->status !== 'approved') {
                throw new InvalidArgumentException('يجب اعتماد مسير الرواتب أولاً قبل التثبيت والقفل النهائي.');
            }

            $payroll->status = 'finalized';
            $payroll->finalized_by = $userId;
            $payroll->finalized_at = now();
            $payroll->save();

            return $payroll->load('items.employee');
        });
    }

    /**
     * تسجيل سند صرف / دفعة مالية للمسير (Partial or Full Payment)
     */
    public function recordPayrollPayment(string $payrollId, array $data, int|string $userId): PayrollPayment
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $data, $userId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($payrollId);

            if (in_array($payroll->status, ['draft', 'rejected'], true)) {
                throw new InvalidArgumentException('لا يمكن صرف دفعات لمسير رواتب غير معتمد.');
            }

            $amount = (float) $data['amount'];
            if ($amount <= 0) {
                throw new InvalidArgumentException('مبلغ الدفعة يجب أن يكون أكبر من الصفر.');
            }

            $remainingBalance = max(0, round((float)$payroll->total_net - (float)$payroll->total_paid, 4));
            if ($amount > $remainingBalance) {
                throw new InvalidArgumentException("مبلغ الدفعة ({$amount} ج.م) يتجاوز الرصيد المتبقي للمسير ({$remainingBalance} ج.م).");
            }

            $payment = PayrollPayment::create([
                'tenant_id' => $tenantId,
                'payroll_id' => $payroll->id,
                'payroll_item_id' => $data['payroll_item_id'] ?? null,
                'employee_id' => $data['employee_id'] ?? null,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'amount' => $amount,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_number' => $data['reference_number'] ?? ('PAY-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'notes' => $data['notes'] ?? 'صرف مستحقات أجور عمال',
                'paid_by' => $userId,
            ]);

            $payroll->total_paid = round((float)$payroll->total_paid + $amount, 4);

            if ($payroll->total_paid >= $payroll->total_net) {
                $payroll->status = 'paid';
                PayrollItem::where('tenant_id', $tenantId)->where('payroll_id', $payroll->id)->update(['is_paid' => true]);
                $paidStart = Carbon::parse($payroll->period_start)->startOfDay()->toDateTimeString();
                $paidEnd = Carbon::parse($payroll->period_end)->endOfDay()->toDateTimeString();
                $paidStartStr = Carbon::parse($payroll->period_start)->toDateString();
                $paidEndStr = Carbon::parse($payroll->period_end)->toDateString();

                PieceWorkLog::where('tenant_id', $tenantId)
                    ->where(function ($q) use ($paidStartStr, $paidEndStr, $paidStart, $paidEnd) {
                        $q->whereBetween('work_date', [$paidStart, $paidEnd])
                          ->orWhere(function ($sub) use ($paidStartStr, $paidEndStr) {
                              $sub->whereDate('work_date', '>=', $paidStartStr)
                                  ->whereDate('work_date', '<=', $paidEndStr);
                          });
                    })
                    ->whereIn('status', ['verified', 'approved'])
                    ->update(['status' => 'paid']);
            } else {
                $payroll->status = 'partially_paid';
            }

            $payroll->save();

            // تحديث رصيد بند الموظف إذا كان الصرف لموظف محدد
            if (!empty($data['payroll_item_id'])) {
                $item = PayrollItem::where('tenant_id', $tenantId)->find($data['payroll_item_id']);
                if ($item) {
                    $item->paid_amount = round((float)$item->paid_amount + $amount, 4);
                    $item->balance_due = max(0, round((float)$item->net_salary - (float)$item->paid_amount, 4));
                    if ($item->balance_due <= 0) {
                        $item->is_paid = true;
                    }
                    $item->save();
                }
            }

            return $payment->load(['payroll', 'employee']);
        });
    }

    /**
     * اعتماد صرف مسير الرواتب بالكامل (Legacy support)
     */
    public function markPayrollPaid(string $payrollId): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);
            $remaining = max(0, round((float)$payroll->total_net - (float)$payroll->total_paid, 4));

            if ($remaining > 0) {
                PayrollPayment::create([
                    'tenant_id' => $tenantId,
                    'payroll_id' => $payroll->id,
                    'payment_date' => now()->toDateString(),
                    'amount' => $remaining,
                    'payment_method' => 'cash',
                    'reference_number' => 'PAY-FULL-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                    'notes' => 'صرف كامل مستحقات مسير الرواتب',
                ]);
            }

            $payroll->total_paid = $payroll->total_net;
            $payroll->status = 'paid';
            $payroll->save();

            PayrollItem::where('tenant_id', $tenantId)
                ->where('payroll_id', $payroll->id)
                ->update(['is_paid' => true, 'paid_amount' => DB::raw('net_salary'), 'balance_due' => 0]);

            $paidStart = Carbon::parse($payroll->period_start)->startOfDay()->toDateTimeString();
            $paidEnd = Carbon::parse($payroll->period_end)->endOfDay()->toDateTimeString();
            $paidStartStr = Carbon::parse($payroll->period_start)->toDateString();
            $paidEndStr = Carbon::parse($payroll->period_end)->toDateString();

            PieceWorkLog::where('tenant_id', $tenantId)
                ->where(function ($q) use ($paidStartStr, $paidEndStr, $paidStart, $paidEnd) {
                    $q->whereBetween('work_date', [$paidStart, $paidEnd])
                      ->orWhere(function ($sub) use ($paidStartStr, $paidEndStr) {
                          $sub->whereDate('work_date', '>=', $paidStartStr)
                              ->whereDate('work_date', '<=', $paidEndStr);
                      });
                })
                ->whereIn('status', ['verified', 'approved'])
                ->update(['status' => 'paid']);

            return $payroll->load('items.employee');
        });
    }

    /**
     * إعادة احتساب مسير الرواتب وتحديث كافة بنوده والسلف والأقساط المستحقة
     */
    public function recalculatePayroll(string $payrollId): Payroll
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($payrollId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            if (in_array($payroll->status, ['finalized', 'paid'], true) || (float)$payroll->total_paid > 0) {
                throw new InvalidArgumentException('لا يمكن إعادة احتساب مسير تم صرفه أو قفله نهائياً.');
            }

            $period = $payroll->payroll_period;
            $startDate = Carbon::parse($payroll->period_start)->toDateString();
            $endDate = Carbon::parse($payroll->period_end)->toDateString();
            $status = $payroll->status; // retain current status (e.g. draft or approved)

            return $this->generatePayroll($tenantId, $period, $startDate, $endDate, $status);
        });
    }

    /**
     * حذف مسير رواتب مسودة أو معتمد وفك كافة تسويات السلف
     */
    public function destroyPayroll(string $payrollId): void
    {
        $tenantId = app('current_tenant_id');

        DB::transaction(function () use ($payrollId, $tenantId) {
            $payroll = Payroll::where('tenant_id', $tenantId)->findOrFail($payrollId);

            if (in_array($payroll->status, ['finalized', 'paid', 'partially_paid'], true) || (float)$payroll->total_paid > 0) {
                throw new InvalidArgumentException('لا يمكن حذف مسير مقفل أو تم تسجيل مدفوعات له.');
            }

            $this->rollbackPayrollSettlements($payrollId, $tenantId);

            PayrollItem::where('tenant_id', $tenantId)->where('payroll_id', $payrollId)->delete();
            PayrollPayment::where('tenant_id', $tenantId)->where('payroll_id', $payrollId)->delete();

            $payroll->delete();
        });
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityDefectAdjustment extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'quality_defect_id',
        'quality_inspection_id',
        'production_order_id',
        'cutting_bundle_id',
        'employee_id',
        'production_stage_id',
        'investigation_notes',
        'proposed_penalty_amount',
        'adjustment_reason',
        'status',
        'reported_by',
        'approved_by',
        'approved_at',
        'worker_objection_notes',
        'objection_submitted_at',
        'settled_payroll_id',
        'settled_payroll_item_id',
        'reversal_reason',
        'reversed_by',
        'reversed_at',
    ];

    protected $casts = [
        'proposed_penalty_amount' => 'decimal:4',
        'approved_at' => 'datetime',
        'objection_submitted_at' => 'datetime',
        'reversed_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function cuttingBundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class);
    }

    public function qualityDefect(): BelongsTo
    {
        return $this->belongsTo(QualityDefect::class);
    }

    public function qualityInspection(): BelongsTo
    {
        return $this->belongsTo(QualityInspection::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function reverser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class, 'settled_payroll_id');
    }

    public function payrollItem(): BelongsTo
    {
        return $this->belongsTo(PayrollItem::class, 'settled_payroll_item_id');
    }
}

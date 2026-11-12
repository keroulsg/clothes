<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PieceWorkLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'production_order_id',
        'cutting_bundle_id',
        'cutting_order_id',
        'job_order_id',
        'piece_rate_id',
        'stage_code',
        'operation_name',
        'cut_name',
        'work_date',
        'started_at',
        'completed_at',
        'completed_quantity',
        'unit_rate',
        'total_amount',
        'status',
        'approved_by',
        'approved_by_user_id',
        'approved_at',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'completed_quantity' => 'integer',
        'unit_rate' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'work_date' => 'date',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function cuttingBundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class);
    }

    public function cuttingOrder(): BelongsTo
    {
        return $this->belongsTo(CuttingOrder::class);
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function pieceRate(): BelongsTo
    {
        return $this->belongsTo(PieceRate::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payroll extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'payroll_period',
        'period_start',
        'period_end',
        'total_gross',
        'total_deductions',
        'total_net',
        'total_paid',
        'status',
        'approved_by',
        'approved_by_user_id',
        'approved_at',
        'rejection_reason',
        'finalized_by',
        'finalized_by_user_id',
        'finalized_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_gross' => 'decimal:4',
        'total_deductions' => 'decimal:4',
        'total_net' => 'decimal:4',
        'total_paid' => 'decimal:4',
        'approved_at' => 'datetime',
        'finalized_at' => 'datetime',
    ];

    protected $appends = [
        'remaining_balance',
    ];

    public function getRemainingBalanceAttribute(): float
    {
        return (float) max(0, round((float)$this->total_net - (float)$this->total_paid, 4));
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PayrollPayment::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function finalizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'finalized_by_user_id');
    }
}

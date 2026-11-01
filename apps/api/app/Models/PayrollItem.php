<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'payroll_id',
        'employee_id',
        'base_amount',
        'piece_rate_earnings',
        'hourly_earnings',
        'daily_earnings',
        'overtime_earnings',
        'allowances_and_bonuses',
        'advances_repaid',
        'defect_deductions',
        'general_deductions',
        'deductions_and_advances',
        'gross_amount',
        'net_salary',
        'paid_amount',
        'balance_due',
        'calculation_breakdown',
        'is_paid',
    ];

    protected $casts = [
        'base_amount' => 'decimal:4',
        'piece_rate_earnings' => 'decimal:4',
        'hourly_earnings' => 'decimal:4',
        'daily_earnings' => 'decimal:4',
        'overtime_earnings' => 'decimal:4',
        'allowances_and_bonuses' => 'decimal:4',
        'advances_repaid' => 'decimal:4',
        'defect_deductions' => 'decimal:4',
        'general_deductions' => 'decimal:4',
        'deductions_and_advances' => 'decimal:4',
        'gross_amount' => 'decimal:4',
        'net_salary' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'balance_due' => 'decimal:4',
        'calculation_breakdown' => 'array',
        'is_paid' => 'boolean',
    ];

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(PayrollPayment::class);
    }
}

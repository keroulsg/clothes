<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'payroll_id',
        'employee_id',
        'base_amount',
        'piece_rate_earnings',
        'overtime_earnings',
        'deductions_and_advances',
        'net_salary',
        'is_paid',
    ];

    protected $casts = [
        'base_amount' => 'decimal:4',
        'piece_rate_earnings' => 'decimal:4',
        'overtime_earnings' => 'decimal:4',
        'deductions_and_advances' => 'decimal:4',
        'net_salary' => 'decimal:4',
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
}

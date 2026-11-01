<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'branch_id',
        'employee_code',
        'name',
        'national_id',
        'phone',
        'department',
        'job_title',
        'pay_type',
        'base_salary',
        'hourly_rate',
        'daily_rate',
        'shift_name',
        'hire_date',
        'termination_date',
        'is_active',
    ];

    protected $casts = [
        'base_salary' => 'decimal:4',
        'hourly_rate' => 'decimal:4',
        'daily_rate' => 'decimal:4',
        'hire_date' => 'date',
        'termination_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function pieceWorkLogs(): HasMany
    {
        return $this->hasMany(PieceWorkLog::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(EmployeeAdjustment::class);
    }
}

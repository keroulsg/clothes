<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Employee extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'employee_code',
        'name',
        'national_id',
        'phone',
        'department',
        'job_title',
        'pay_type',
        'base_salary',
        'is_active',
    ];

    protected $casts = [
        'base_salary' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function pieceWorkLogs(): HasMany
    {
        return $this->hasMany(PieceWorkLog::class);
    }

    public function payrollItems(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }
}

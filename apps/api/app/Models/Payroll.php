<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
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
        'status',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'total_gross' => 'decimal:4',
        'total_deductions' => 'decimal:4',
        'total_net' => 'decimal:4',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalPeriod extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'fiscal_year_id',
        'period_number',
        'name',
        'start_date',
        'end_date',
        'status', // open, closed
        'closed_at',
        'closed_by',
        'reopened_at',
        'reopened_by',
        'reopening_reason',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'period_number' => 'integer',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class, 'fiscal_year_id');
    }
}


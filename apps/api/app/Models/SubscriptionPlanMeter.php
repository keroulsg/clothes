<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPlanMeter extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'plan_id',
        'meter_key',
        'quota_limit',
        'period_type',
        'limit_type',
        'overage_unit_price',
    ];

    protected $casts = [
        'quota_limit' => 'integer',
        'overage_unit_price' => 'decimal:4',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }
}


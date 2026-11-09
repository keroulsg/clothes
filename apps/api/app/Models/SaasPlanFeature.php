<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaasPlanFeature extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'saas_plan_features';

    protected $fillable = [
        'plan_id',
        'feature_id',
        'feature_key',
        'is_included',
        'limit_value',
        'custom_value',
    ];

    protected $casts = [
        'is_included' => 'boolean',
        'limit_value' => 'integer',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function feature(): BelongsTo
    {
        return $this->belongsTo(SaasFeature::class, 'feature_id');
    }
}


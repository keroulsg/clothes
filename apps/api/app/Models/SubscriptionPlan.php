<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'monthly_price',
        'annual_price',
        'is_active',
        'is_public',
        'sort_order',
        'features',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:4',
        'annual_price' => 'decimal:4',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'sort_order' => 'integer',
        'features' => 'array',
    ];

    public function meters(): HasMany
    {
        return $this->hasMany(SubscriptionPlanMeter::class, 'plan_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(FactorySubscription::class, 'plan_id');
    }
}


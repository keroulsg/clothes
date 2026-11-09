<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class SubscriptionPlan extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'code',
        'product_category',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'monthly_price',
        'annual_price',
        'billing_duration',
        'billing_period',
        'trial_duration_days',
        'quota_rfq_count',
        'is_active',
        'is_public',
        'is_archived',
        'is_popular',
        'sort_order',
        'features',
        'terms_and_conditions',
    ];

    protected $casts = [
        'monthly_price' => 'decimal:4',
        'annual_price' => 'decimal:4',
        'billing_duration' => 'integer',
        'trial_duration_days' => 'integer',
        'quota_rfq_count' => 'integer',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'is_archived' => 'boolean',
        'is_popular' => 'boolean',
        'sort_order' => 'integer',
        'features' => 'array',
    ];

    public function saasPlanFeatures(): HasMany
    {
        return $this->hasMany(SaasPlanFeature::class, 'plan_id');
    }

    public function featuresCatalog(): BelongsToMany
    {
        return $this->belongsToMany(SaasFeature::class, 'saas_plan_features', 'plan_id', 'feature_id')
            ->withPivot(['feature_key', 'is_included', 'limit_value', 'custom_value'])
            ->withTimestamps();
    }

    public function meters(): HasMany
    {
        return $this->hasMany(SubscriptionPlanMeter::class, 'plan_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(FactorySubscription::class, 'plan_id');
    }

    public function requesterSubscriptions(): HasMany
    {
        return $this->hasMany(MarketplaceRequesterSubscription::class, 'plan_id');
    }

    public function paymentRequests(): HasMany
    {
        return $this->hasMany(SubscriptionPaymentRequest::class, 'subscription_plan_id');
    }
}


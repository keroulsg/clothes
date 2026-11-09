<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SaasFeature extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'saas_features';

    protected $fillable = [
        'feature_key',
        'product_category',
        'name_ar',
        'name_en',
        'description_ar',
        'description_en',
        'feature_type',
        'default_limit',
        'default_value',
        'is_active',
        'is_public',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'sort_order' => 'integer',
        'default_limit' => 'integer',
    ];

    public function planFeatures(): HasMany
    {
        return $this->hasMany(SaasPlanFeature::class, 'feature_id');
    }
}


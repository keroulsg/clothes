<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class GarmentModel extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'category',
        'season',
        'description',
        'target_cost',
        'wholesale_price',
        'retail_price',
        'technical_specs',
        'status',
    ];

    protected $casts = [
        'target_cost' => 'decimal:4',
        'wholesale_price' => 'decimal:4',
        'retail_price' => 'decimal:4',
        'technical_specs' => 'array',
    ];

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }
}

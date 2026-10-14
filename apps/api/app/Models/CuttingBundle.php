<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CuttingBundle extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'bundle_code',
        'cutting_order_id',
        'production_order_id',
        'product_variant_id',
        'bundle_number',
        'color_id',
        'size_id',
        'quantity',
        'current_stage_code',
        'status',
        'notes',
    ];

    protected $casts = [
        'bundle_number' => 'integer',
        'quantity' => 'integer',
    ];

    public function cuttingOrder(): BelongsTo
    {
        return $this->belongsTo(CuttingOrder::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(Color::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    public function stageLogs(): HasMany
    {
        return $this->hasMany(BundleStageLog::class, 'cutting_bundle_id');
    }

    public function qualityInspections(): HasMany
    {
        return $this->hasMany(QualityInspection::class, 'cutting_bundle_id');
    }
}

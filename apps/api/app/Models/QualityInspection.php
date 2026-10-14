<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QualityInspection extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'inspection_number',
        'production_order_id',
        'cutting_bundle_id',
        'production_stage_id',
        'inspector_name',
        'inspection_type',
        'inspected_quantity',
        'passed_quantity',
        'rejected_quantity',
        'rework_quantity',
        'decision',
        'notes',
    ];

    protected $casts = [
        'inspected_quantity' => 'integer',
        'passed_quantity' => 'integer',
        'rejected_quantity' => 'integer',
        'rework_quantity' => 'integer',
    ];

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function cuttingBundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class);
    }

    public function productionStage(): BelongsTo
    {
        return $this->belongsTo(ProductionStage::class);
    }

    public function defects(): HasMany
    {
        return $this->hasMany(QualityDefect::class, 'quality_inspection_id');
    }
}

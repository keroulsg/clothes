<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionStage extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'stage_code',
        'name',
        'order_sequence',
        'requires_qc',
    ];

    protected $casts = [
        'order_sequence' => 'integer',
        'requires_qc' => 'boolean',
    ];

    public function bundleStageLogs(): HasMany
    {
        return $this->hasMany(BundleStageLog::class, 'production_stage_id');
    }

    public function qualityInspections(): HasMany
    {
        return $this->hasMany(QualityInspection::class, 'production_stage_id');
    }
}

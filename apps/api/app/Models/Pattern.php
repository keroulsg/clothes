<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pattern extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'garment_model_id',
        'pattern_code',
        'pattern_name',
        'version',
        'sample_size',
        'usable_width_meters',
        'grain_direction',
        'relaxation_hours_required',
        'estimated_shrinkage_percent',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'usable_width_meters' => 'float',
        'relaxation_hours_required' => 'float',
        'estimated_shrinkage_percent' => 'float',
        'is_active' => 'boolean',
    ];

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }
}

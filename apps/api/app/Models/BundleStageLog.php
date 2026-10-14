<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BundleStageLog extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'cutting_bundle_id',
        'production_stage_id',
        'operation_type',
        'operator_name',
        'work_line',
        'input_quantity',
        'output_accepted_quantity',
        'output_rejected_quantity',
        'scrap_quantity',
        'logged_at',
    ];

    protected $casts = [
        'input_quantity' => 'integer',
        'output_accepted_quantity' => 'integer',
        'output_rejected_quantity' => 'integer',
        'scrap_quantity' => 'integer',
        'logged_at' => 'datetime',
    ];

    public function cuttingBundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class);
    }

    public function productionStage(): BelongsTo
    {
        return $this->belongsTo(ProductionStage::class);
    }
}

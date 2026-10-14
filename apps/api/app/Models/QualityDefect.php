<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityDefect extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'quality_inspection_id',
        'defect_type',
        'severity',
        'quantity',
        'corrective_action',
    ];

    protected $casts = [
        'quantity' => 'integer',
    ];

    public function qualityInspection(): BelongsTo
    {
        return $this->belongsTo(QualityInspection::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalOperationReceipt extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'external_operation_id',
        'accepted_quantity',
        'rejected_quantity',
        'scrap_quantity',
        'unit_rate',
        'total_cost',
        'idempotency_key',
        'notes',
    ];

    protected $casts = [
        'accepted_quantity' => 'integer',
        'rejected_quantity' => 'integer',
        'scrap_quantity' => 'integer',
        'unit_rate' => 'decimal:4',
        'total_cost' => 'decimal:4',
    ];

    public function externalOperation(): BelongsTo
    {
        return $this->belongsTo(ExternalOperation::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExternalOperation extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'operation_number',
        'job_order_id',
        'production_order_id',
        'cutting_bundle_id',
        'subcontractor_name',
        'operation_type',
        'sent_quantity',
        'received_accepted_quantity',
        'received_rejected_quantity',
        'scrap_quantity',
        'unit_rate',
        'total_cost',
        'status',
        'dispatched_at',
        'returned_at',
        'notes',
        'idempotency_key',
    ];

    protected $casts = [
        'sent_quantity' => 'integer',
        'received_accepted_quantity' => 'integer',
        'received_rejected_quantity' => 'integer',
        'scrap_quantity' => 'integer',
        'unit_rate' => 'decimal:4',
        'total_cost' => 'decimal:4',
        'dispatched_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function bundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class, 'cutting_bundle_id');
    }
}

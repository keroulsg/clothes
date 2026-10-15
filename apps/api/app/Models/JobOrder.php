<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobOrder extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_number',
        'customer_id',
        'customer_name',
        'service_type',
        'garment_model_id',
        'production_order_id',
        'fabric_source',
        'trims_responsibility',
        'status',
        'pricing_basis',
        'unit_rate',
        'total_target_quantity',
        'total_received_meters',
        'total_cut_quantity',
        'total_accepted_quantity',
        'total_rejected_quantity',
        'total_rework_quantity',
        'total_delivered_quantity',
        'planned_start_date',
        'target_delivery_date',
        'actual_start_date',
        'actual_completion_date',
        'notes',
        'idempotency_key',
    ];

    protected $casts = [
        'unit_rate' => 'decimal:4',
        'total_target_quantity' => 'integer',
        'total_received_meters' => 'decimal:4',
        'total_cut_quantity' => 'integer',
        'total_accepted_quantity' => 'integer',
        'total_rejected_quantity' => 'integer',
        'total_rework_quantity' => 'integer',
        'total_delivered_quantity' => 'integer',
        'planned_start_date' => 'date',
        'target_delivery_date' => 'date',
        'actual_start_date' => 'date',
        'actual_completion_date' => 'date',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(JobOrderItem::class);
    }

    public function materialReceipts(): HasMany
    {
        return $this->hasMany(CustomerMaterialReceipt::class);
    }

    public function cuttingOrders(): HasMany
    {
        return $this->hasMany(CuttingOrder::class);
    }

    public function externalOperations(): HasMany
    {
        return $this->hasMany(ExternalOperation::class);
    }

    public function deliveryNotes(): HasMany
    {
        return $this->hasMany(JobDeliveryNote::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(JobInvoice::class);
    }
}

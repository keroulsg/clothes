<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobDeliveryNote extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'delivery_number',
        'job_order_id',
        'customer_id',
        'customer_name',
        'delivery_date',
        'status',
        'total_delivered_pieces',
        'returned_unused_fabric_meters',
        'scrap_fabric_meters',
        'delivered_by',
        'received_by_customer',
        'notes',
        'idempotency_key',
    ];

    protected $casts = [
        'delivery_date' => 'date',
        'total_delivered_pieces' => 'integer',
        'returned_unused_fabric_meters' => 'decimal:4',
        'scrap_fabric_meters' => 'decimal:4',
    ];

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(JobDeliveryItem::class);
    }
}

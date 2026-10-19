<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SalesDeliveryNote extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'delivery_number',
        'sales_order_id',
        'customer_id',
        'warehouse_id',
        'delivery_date',
        'status',
        'shipping_carrier',
        'tracking_number',
        'total_cartons',
        'total_pieces',
        'recipient_name',
        'proof_of_delivery',
        'notes',
    ];

    protected $casts = [
        'delivery_date' => 'date',
        'total_cartons' => 'integer',
        'total_pieces' => 'decimal:4',
    ];

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function cartons(): HasMany
    {
        return $this->hasMany(SalesCarton::class);
    }
}

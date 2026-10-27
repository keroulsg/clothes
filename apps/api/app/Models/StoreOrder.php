<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StoreOrder extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_number',
        'customer_name',
        'customer_phone',
        'shipping_address',
        'city',
        'payment_method',
        'payment_status',
        'instapay_reference',
        'instapay_receipt_url',
        'payment_reviewed_by',
        'payment_reviewed_at',
        'payment_rejection_reason',
        'status',
        'subtotal',
        'shipping_fee',
        'total_amount',
        'inventory_synced',
    ];

    protected $casts = [
        'subtotal' => 'decimal:4',
        'shipping_fee' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'inventory_synced' => 'boolean',
        'payment_reviewed_at' => 'datetime',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(StoreOrderItem::class);
    }

    public function paymentReviewer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'payment_reviewed_by');
    }
}

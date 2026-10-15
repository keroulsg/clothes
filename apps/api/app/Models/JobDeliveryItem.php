<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobDeliveryItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'job_delivery_note_id',
        'job_order_item_id',
        'product_variant_id',
        'color_id',
        'size_id',
        'delivered_quantity',
        'notes',
    ];

    protected $casts = [
        'delivered_quantity' => 'integer',
    ];

    public function deliveryNote(): BelongsTo
    {
        return $this->belongsTo(JobDeliveryNote::class, 'job_delivery_note_id');
    }

    public function jobOrderItem(): BelongsTo
    {
        return $this->belongsTo(JobOrderItem::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(Color::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }
}

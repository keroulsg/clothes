<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'purchase_order_id',
        'inventory_item_id',
        'ordered_quantity',
        'received_quantity',
        'remaining_quantity',
        'unit_price',
        'discount_percent',
        'tax_rate',
        'total_price',
    ];

    protected $casts = [
        'ordered_quantity' => 'decimal:4',
        'received_quantity' => 'decimal:4',
        'remaining_quantity' => 'decimal:4',
        'unit_price' => 'decimal:4',
        'discount_percent' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'total_price' => 'decimal:4',
    ];

    protected $appends = ['item_code', 'item_name'];

    public function getItemCodeAttribute(): ?string
    {
        return $this->item?->code ?? $this->item?->barcode ?? 'MAT-01';
    }

    public function getItemNameAttribute(): ?string
    {
        return $this->item?->name ?? 'خامات توريد';
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}

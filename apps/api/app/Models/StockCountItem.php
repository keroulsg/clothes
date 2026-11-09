<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockCountItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'stock_count_id',
        'inventory_item_id',
        'system_quantity',
        'physical_quantity',
        'difference_quantity',
        'unit_cost',
        'adjustment_status',
        'notes',
    ];

    protected $casts = [
        'system_quantity' => 'decimal:4',
        'physical_quantity' => 'decimal:4',
        'difference_quantity' => 'decimal:4',
        'unit_cost' => 'decimal:4',
    ];

    public function stockCount(): BelongsTo
    {
        return $this->belongsTo(StockCount::class, 'stock_count_id');
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }
}


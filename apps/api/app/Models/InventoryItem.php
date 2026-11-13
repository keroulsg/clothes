<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'warehouse_id',
        'variant_id',
        'item_type',
        'code',
        'name',
        'name_en',
        'barcode',
        'unit_of_measure',
        'reorder_level',
        'min_stock_level',
        'current_balance',
        'reserved_balance',
        'average_cost',
        'is_customer_owned',
        'customer_name',
        'is_active',
        'description',
        'image_url',
        'technical_specs',
    ];

    protected $casts = [
        'reorder_level' => 'decimal:4',
        'min_stock_level' => 'decimal:4',
        'current_balance' => 'decimal:4',
        'reserved_balance' => 'decimal:4',
        'average_cost' => 'decimal:4',
        'is_customer_owned' => 'boolean',
        'is_active' => 'boolean',
        'technical_specs' => 'array',
    ];

    protected $appends = [
        'storage_zone',
        'rack_location',
        'shelf_bin_location',
        'reserved_quantity',
        'available_quantity',
    ];

    public function getStorageZoneAttribute(): ?string
    {
        return $this->technical_specs['storage_zone'] ?? $this->technical_specs['zone'] ?? null;
    }

    public function getRackLocationAttribute(): ?string
    {
        return $this->technical_specs['rack_location'] ?? $this->technical_specs['rack'] ?? null;
    }

    public function getShelfBinLocationAttribute(): ?string
    {
        return $this->technical_specs['shelf_bin_location'] ?? $this->technical_specs['shelf_bin'] ?? null;
    }

    public function getReservedQuantityAttribute(): float
    {
        // InventoryItem.reserved_balance is the authoritative, transactionally maintained reservation total.
        return max(0.0, (float) ($this->reserved_balance ?? 0));
    }

    public function getAvailableQuantityAttribute(): float
    {
        $current = (float) $this->current_balance;
        $reserved = (float) $this->reserved_quantity;
        return max(0.0, round($current - $reserved, 4));
    }

    public function scopeRawMaterials($query)
    {
        return $query->whereIn('item_type', [
            'fabric_raw', 'fabric',
            'accessory_raw', 'accessory',
            'packaging', 'raw_material',
            'yarn', 'thread', 'trims'
        ]);
    }

    public function scopeFinishedGoods($query)
    {
        return $query->whereIn('item_type', [
            'finished_good', 'finished_product'
        ]);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'garment_model_id',
        'size_id',
        'color_id',
        'sku',
        'barcode',
        'wholesale_price',
        'retail_price',
    ];

    protected $casts = [
        'wholesale_price' => 'decimal:4',
        'retail_price' => 'decimal:4',
    ];

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(Color::class);
    }

    public function inventoryItems(): HasMany
    {
        return $this->hasMany(InventoryItem::class, 'variant_id');
    }
}

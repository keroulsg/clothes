<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BomItem extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'bill_of_material_id',
        'inventory_item_id',
        'color_id',
        'size_id',
        'component_type',
        'consumption_per_unit',
        'unit_of_measure',
        'waste_tolerance_percent',
        'unit_cost',
        'notes',
    ];

    protected $casts = [
        'consumption_per_unit' => 'float',
        'waste_tolerance_percent' => 'float',
        'unit_cost' => 'float',
    ];

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
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

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillOfMaterial extends Model
{
    use HasUuids, BelongsToTenant;

    protected $table = 'bill_of_materials';

    protected $fillable = [
        'tenant_id',
        'garment_model_id',
        'version',
        'bom_code',
        'name',
        'status',
        'total_estimated_cost_per_piece',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'total_estimated_cost_per_piece' => 'float',
        'is_active' => 'boolean',
    ];

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BomItem::class, 'bill_of_material_id');
    }

    public function productionOrders(): HasMany
    {
        return $this->hasMany(ProductionOrder::class, 'bill_of_material_id');
    }
}

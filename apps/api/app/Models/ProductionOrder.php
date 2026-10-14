<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductionOrder extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'order_number',
        'garment_model_id',
        'bill_of_material_id',
        'branch_id',
        'planned_start_date',
        'target_delivery_date',
        'actual_start_date',
        'actual_completion_date',
        'total_planned_quantity',
        'total_cut_quantity',
        'total_completed_quantity',
        'total_scrapped_quantity',
        'total_rework_quantity',
        'status',
        'priority',
        'notes',
    ];

    protected $casts = [
        'total_planned_quantity' => 'integer',
        'total_cut_quantity' => 'integer',
        'total_completed_quantity' => 'integer',
        'total_scrapped_quantity' => 'integer',
        'total_rework_quantity' => 'integer',
        'planned_start_date' => 'date',
        'target_delivery_date' => 'date',
        'actual_start_date' => 'date',
        'actual_completion_date' => 'date',
    ];

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }

    public function billOfMaterial(): BelongsTo
    {
        return $this->belongsTo(BillOfMaterial::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProductionOrderItem::class, 'production_order_id');
    }

    public function cuttingOrders(): HasMany
    {
        return $this->hasMany(CuttingOrder::class, 'production_order_id');
    }

    public function bundles(): HasMany
    {
        return $this->hasMany(CuttingBundle::class, 'production_order_id');
    }

    public function qualityInspections(): HasMany
    {
        return $this->hasMany(QualityInspection::class, 'production_order_id');
    }
}

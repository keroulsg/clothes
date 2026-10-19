<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductionCostSheet extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'production_order_id',
        'garment_model_id',
        'total_produced_pieces',
        'direct_materials_cost',
        'direct_labor_cost',
        'subcontracted_services_cost',
        'allocated_overhead_cost',
        'total_cost',
        'cost_per_piece',
        'status',
    ];

    protected $casts = [
        'total_produced_pieces' => 'integer',
        'direct_materials_cost' => 'decimal:4',
        'direct_labor_cost' => 'decimal:4',
        'subcontracted_services_cost' => 'decimal:4',
        'allocated_overhead_cost' => 'decimal:4',
        'total_cost' => 'decimal:4',
        'cost_per_piece' => 'decimal:4',
    ];

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class);
    }
}

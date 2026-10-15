<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CuttingOrder extends Model
{
    use HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'cutting_order_number',
        'production_order_id',
        'job_order_id',
        'pattern_id',
        'table_number',
        'fabric_inventory_item_id',
        'fabric_source',
        'customer_material_id',
        'warehouse_id',
        'fabric_color_id',
        'marker_name',
        'usable_width_meters',
        'lay_length_meters',
        'layers_count',
        'marker_efficiency_percent',
        'actual_fabric_meters_used',
        'actual_fabric_kg_used',
        'theoretical_fabric_meters',
        'end_loss_meters',
        'remnant_meters',
        'fabric_relaxation_hours_actual',
        'measured_shrinkage_percent',
        'total_expected_pieces',
        'total_cut_pieces',
        'status',
        'notes',
    ];

    protected $casts = [
        'usable_width_meters' => 'float',
        'lay_length_meters' => 'float',
        'layers_count' => 'integer',
        'marker_efficiency_percent' => 'float',
        'actual_fabric_meters_used' => 'float',
        'actual_fabric_kg_used' => 'float',
        'theoretical_fabric_meters' => 'float',
        'end_loss_meters' => 'float',
        'remnant_meters' => 'float',
        'fabric_relaxation_hours_actual' => 'float',
        'measured_shrinkage_percent' => 'float',
        'total_expected_pieces' => 'integer',
        'total_cut_pieces' => 'integer',
    ];

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function pattern(): BelongsTo
    {
        return $this->belongsTo(Pattern::class);
    }

    public function fabricInventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'fabric_inventory_item_id');
    }

    public function customerMaterial(): BelongsTo
    {
        return $this->belongsTo(CustomerMaterial::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function fabricColor(): BelongsTo
    {
        return $this->belongsTo(Color::class, 'fabric_color_id');
    }

    public function bundles(): HasMany
    {
        return $this->hasMany(CuttingBundle::class, 'cutting_order_id');
    }
}

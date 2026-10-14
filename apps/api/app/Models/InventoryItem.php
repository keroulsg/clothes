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
        'unit_of_measure',
        'reorder_level',
        'current_balance',
        'average_cost',
        'is_customer_owned',
        'customer_name',
        'technical_specs',
    ];

    protected $casts = [
        'reorder_level' => 'decimal:4',
        'current_balance' => 'decimal:4',
        'average_cost' => 'decimal:4',
        'is_customer_owned' => 'boolean',
        'technical_specs' => 'array',
    ];

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

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequisitionItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'purchase_requisition_id',
        'inventory_item_id',
        'item_name',
        'requested_quantity',
        'approved_quantity',
        'unit_of_measure',
        'estimated_unit_price',
        'estimated_total_price',
        'specifications',
        'notes',
    ];

    protected $casts = [
        'requested_quantity' => 'decimal:4',
        'approved_quantity' => 'decimal:4',
        'estimated_unit_price' => 'decimal:4',
        'estimated_total_price' => 'decimal:4',
    ];

    public function purchaseRequisition(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequisition::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }
}


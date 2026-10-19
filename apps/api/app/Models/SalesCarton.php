<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesCarton extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'sales_delivery_note_id',
        'carton_number',
        'gross_weight_kg',
        'dimensions',
        'pieces_count',
        'packing_details',
    ];

    protected $casts = [
        'gross_weight_kg' => 'decimal:2',
        'pieces_count' => 'integer',
    ];

    public function deliveryNote(): BelongsTo
    {
        return $this->belongsTo(SalesDeliveryNote::class, 'sales_delivery_note_id');
    }
}

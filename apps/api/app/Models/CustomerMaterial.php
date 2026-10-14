<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerMaterial extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'customer_name',
        'fabric_name',
        'fabric_code',
        'gsm',
        'usable_width_meters',
        'received_meters',
        'consumed_meters',
        'waste_meters',
        'returned_meters',
        'remaining_meters',
        'warehouse_id',
        'notes',
    ];

    protected $casts = [
        'gsm' => 'decimal:2',
        'usable_width_meters' => 'decimal:3',
        'received_meters' => 'decimal:4',
        'consumed_meters' => 'decimal:4',
        'waste_meters' => 'decimal:4',
        'returned_meters' => 'decimal:4',
        'remaining_meters' => 'decimal:4',
    ];

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}

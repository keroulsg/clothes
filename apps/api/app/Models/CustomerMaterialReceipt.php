<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerMaterialReceipt extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'receipt_number',
        'job_order_id',
        'customer_id',
        'customer_material_id',
        'customer_name',
        'warehouse_id',
        'fabric_name',
        'fabric_code',
        'received_meters',
        'received_weight_kg',
        'usable_width_meters',
        'gsm',
        'rolls_count',
        'condition_status',
        'inspector_name',
        'notes',
        'idempotency_key',
    ];

    protected $casts = [
        'received_meters' => 'decimal:4',
        'received_weight_kg' => 'decimal:4',
        'usable_width_meters' => 'decimal:3',
        'gsm' => 'decimal:2',
        'rolls_count' => 'integer',
    ];

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function customerMaterial(): BelongsTo
    {
        return $this->belongsTo(CustomerMaterial::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
}

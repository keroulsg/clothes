<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobOrderItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'job_order_id',
        'product_variant_id',
        'color_id',
        'color_name',
        'size_id',
        'size_name',
        'target_quantity',
        'cut_quantity',
        'completed_quantity',
        'delivered_quantity',
        'unit_rate',
    ];

    protected $casts = [
        'target_quantity' => 'integer',
        'cut_quantity' => 'integer',
        'completed_quantity' => 'integer',
        'delivered_quantity' => 'integer',
        'unit_rate' => 'decimal:4',
    ];

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class);
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

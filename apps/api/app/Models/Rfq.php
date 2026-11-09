<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rfq extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'rfqs';

    protected $fillable = [
        'tenant_id',
        'rfq_number',
        'title',
        'model_name',
        'garment_model_id',
        'garment_category',
        'service_type',
        'priority',
        'specifications',
        'target_quantity',
        'expected_delivery_date',
        'max_budget_per_piece',
        'fabric_responsibility',
        'fabric_details',
        'production_details',
        'logistics',
        'attachments',
        'status',
        'published_at',
        'terms_accepted_at',
        'terms_version',
        'awarded_bid_id',
    ];

    protected $casts = [
        'target_quantity' => 'integer',
        'expected_delivery_date' => 'date',
        'max_budget_per_piece' => 'decimal:4',
        'fabric_details' => 'array',
        'production_details' => 'array',
        'logistics' => 'array',
        'attachments' => 'array',
        'published_at' => 'datetime',
        'terms_accepted_at' => 'datetime',
    ];

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class, 'garment_model_id');
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(RfqBid::class, 'rfq_id');
    }

    public function awardedBid(): BelongsTo
    {
        return $this->belongsTo(RfqBid::class, 'awarded_bid_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(WorkshopReview::class, 'rfq_id');
    }
}


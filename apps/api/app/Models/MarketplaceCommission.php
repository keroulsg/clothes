<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceCommission extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'rfq_id',
        'rfq_bid_id',
        'job_order_id',
        'gross_amount',
        'commission_rate',
        'commission_amount',
        'status',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:4',
        'commission_rate' => 'decimal:2',
        'commission_amount' => 'decimal:4',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function bid(): BelongsTo
    {
        return $this->belongsTo(RfqBid::class, 'rfq_bid_id');
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class, 'job_order_id');
    }
}


<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketplaceRequesterSubscription extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'marketplace_requester_subscriptions';

    protected $fillable = [
        'tenant_id',
        'plan_id',
        'plan_code',
        'payment_request_id',
        'plan_snapshot',
        'status',
        'allowed_rfq_count',
        'consumed_rfq_count',
        'starts_at',
        'expires_at',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'allowed_rfq_count' => 'integer',
        'consumed_rfq_count' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'approved_at' => 'datetime',
        'plan_snapshot' => 'array',
    ];

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function paymentRequest(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPaymentRequest::class, 'payment_request_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function getRemainingRfqCountAttribute(): int
    {
        return max(0, $this->allowed_rfq_count - $this->consumed_rfq_count);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isValidForPublish(): bool
    {
        return $this->status === 'active' && !$this->isExpired() && $this->remaining_rfq_count > 0;
    }
}


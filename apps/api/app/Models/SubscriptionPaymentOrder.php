<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPaymentOrder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'order_reference',
        'plan_tier',
        'amount',
        'currency',
        'status',
        'billing_cycle',
        'provider',
        'provider_transaction_id',
        'expires_at',
        'paid_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function isExpired(): bool
    {
        return now()->greaterThan($this->expires_at);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && !$this->isExpired();
    }

    public function canAcceptPayment(): bool
    {
        return in_array($this->status, ['pending', 'payment_attempt_failed', 'processing']) && !$this->isExpired();
    }

    public function isAlreadyPaid(): bool
    {
        return $this->status === 'paid' || $this->status === 'completed';
    }
}

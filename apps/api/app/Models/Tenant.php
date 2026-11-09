<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'subdomain',
        'custom_domain',
        'status',
        'tenant_type',
        'plan_tier',
        'currency',
        'timezone',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

    public function isMarketplaceRequester(): bool
    {
        return ($this->tenant_type ?? 'factory') === 'marketplace_requester';
    }

    public function isFactory(): bool
    {
        return ($this->tenant_type ?? 'factory') === 'factory';
    }

    public function requesterSubscriptions(): HasMany
    {
        return $this->hasMany(MarketplaceRequesterSubscription::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function getManufacturingOverheadRate(): float
    {
        $rate = $this->settings['manufacturing_overhead_rate'] ?? null;
        if ($rate !== null && is_numeric($rate) && (float)$rate >= 0.0 && (float)$rate <= 1.0) {
            return (float) $rate;
        }
        return 0.15; // 15% default standard
    }

    public function isPaid(): bool
    {
        return (bool) ($this->settings['subscription']['is_paid'] ?? false);
    }

    public function getIsPaidAttribute(): bool
    {
        return $this->isPaid();
    }

    public function setIsPaidAttribute(bool $value): void
    {
        $settings = $this->settings ?? [];
        if (!isset($settings['subscription'])) {
            $settings['subscription'] = [];
        }
        $settings['subscription']['is_paid'] = $value;
        $this->settings = $settings;
    }

    public function isTrial(): bool
    {
        $subStatus = $this->settings['subscription']['status'] ?? null;
        return $this->status === 'trial' || $subStatus === 'trial';
    }

    public function isTrialExpired(): bool
    {
        if ($this->isPaid()) {
            return false;
        }

        $trialEndsAt = $this->settings['subscription']['trial_ends_at'] ?? null;
        if (!$trialEndsAt) {
            return false;
        }

        return now()->greaterThan(\Illuminate\Support\Carbon::parse($trialEndsAt));
    }

    public function hasActiveAccess(): bool
    {
        if (in_array($this->status, ['suspended', 'cancelled'])) {
            return false;
        }

        if ($this->isPaid()) {
            return true;
        }

        if ($this->isTrial()) {
            return !$this->isTrialExpired();
        }

        return false;
    }
}

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
        'plan_tier',
        'currency',
        'timezone',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
    ];

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

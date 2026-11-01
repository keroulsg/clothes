<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkshopProfile extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'workshop_name',
        'specialty_type',
        'active_machines_count',
        'daily_capacity_pieces',
        'governorate',
        'city',
        'address',
        'phone',
        'contact_person',
        'is_verified',
        'rating_average',
        'completed_jobs_count',
    ];

    protected $casts = [
        'active_machines_count' => 'integer',
        'daily_capacity_pieces' => 'integer',
        'is_verified' => 'boolean',
        'rating_average' => 'decimal:2',
        'completed_jobs_count' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(RfqBid::class, 'workshop_profile_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(WorkshopReview::class, 'workshop_profile_id');
    }
}


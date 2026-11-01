<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkshopReview extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'rfq_id',
        'workshop_profile_id',
        'reviewer_tenant_id',
        'quality_rating',
        'timeliness_rating',
        'communication_rating',
        'review_notes',
    ];

    protected $casts = [
        'quality_rating' => 'integer',
        'timeliness_rating' => 'integer',
        'communication_rating' => 'integer',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function workshop(): BelongsTo
    {
        return $this->belongsTo(WorkshopProfile::class, 'workshop_profile_id');
    }

    public function reviewerTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'reviewer_tenant_id');
    }
}


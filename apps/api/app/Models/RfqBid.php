<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RfqBid extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'rfq_bids';

    protected $fillable = [
        'rfq_id',
        'workshop_profile_id',
        'unit_rate',
        'promised_lead_days',
        'notes',
        'status',
        'converted_job_order_id',
    ];

    protected $casts = [
        'unit_rate' => 'decimal:4',
        'promised_lead_days' => 'integer',
    ];

    public function rfq(): BelongsTo
    {
        return $this->belongsTo(Rfq::class, 'rfq_id');
    }

    public function workshop(): BelongsTo
    {
        return $this->belongsTo(WorkshopProfile::class, 'workshop_profile_id');
    }

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class, 'converted_job_order_id');
    }
}


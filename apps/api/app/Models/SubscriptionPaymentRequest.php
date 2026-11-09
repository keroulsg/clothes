<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPaymentRequest extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'subscription_payment_requests';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'subscription_plan_id',
        'product_type',
        'request_type',
        'plan_code',
        'plan_name',
        'billing_cycle',
        'snapshot_price',
        'included_quota_rfqs',
        'expected_amount',
        'submitted_amount',
        'currency',
        'payment_method',
        'transfer_reference',
        'receipt_file_path',
        'receipt_original_name',
        'receipt_mime_type',
        'receipt_file_size',
        'receipt_sha256',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'reviewed_reason',
        'ip_address',
        'audit_metadata',
        'plan_snapshot',
    ];

    protected $casts = [
        'snapshot_price' => 'decimal:4',
        'expected_amount' => 'decimal:4',
        'submitted_amount' => 'decimal:4',
        'included_quota_rfqs' => 'integer',
        'receipt_file_size' => 'integer',
        'reviewed_at' => 'datetime',
        'audit_metadata' => 'array',
        'plan_snapshot' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }
}


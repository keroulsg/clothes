<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentSubmission extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'store_order_id',
        'sales_order_id',
        'payment_method',
        'expected_amount',
        'submitted_amount',
        'currency',
        'transfer_reference',
        'receipt_file_path',
        'receipt_original_name',
        'receipt_mime_type',
        'receipt_file_size',
        'status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
        'payment_voucher_id',
        'audit_metadata',
    ];

    protected $casts = [
        'expected_amount' => 'decimal:4',
        'submitted_amount' => 'decimal:4',
        'reviewed_at' => 'datetime',
        'audit_metadata' => 'array',
    ];

    public function storeOrder(): BelongsTo
    {
        return $this->belongsTo(StoreOrder::class);
    }

    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function paymentVoucher(): BelongsTo
    {
        return $this->belongsTo(PaymentVoucher::class);
    }
}


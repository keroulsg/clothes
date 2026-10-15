<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobInvoiceItem extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'job_invoice_id',
        'description',
        'item_type',
        'quantity',
        'unit_rate',
        'total_amount',
        'reason',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_rate' => 'decimal:4',
        'total_amount' => 'decimal:4',
    ];

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(JobInvoice::class, 'job_invoice_id');
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class JobInvoice extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'invoice_number',
        'job_order_id',
        'customer_id',
        'customer_name',
        'invoice_date',
        'due_date',
        'status',
        'service_amount',
        'additional_charges',
        'deductions',
        'tax_amount',
        'total_amount',
        'paid_amount',
        'notes',
        'idempotency_key',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'service_amount' => 'decimal:4',
        'additional_charges' => 'decimal:4',
        'deductions' => 'decimal:4',
        'tax_amount' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'paid_amount' => 'decimal:4',
    ];

    public function jobOrder(): BelongsTo
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(JobInvoiceItem::class);
    }
}

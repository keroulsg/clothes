<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'classification',
        'company_name',
        'contact_person',
        'phone',
        'email',
        'tax_id',
        'commercial_registry',
        'credit_limit',
        'payment_terms',
        'opening_balance',
        'address',
        'billing_address',
        'delivery_address',
        'notes',
        'is_active',
        'status',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'credit_limit' => 'decimal:4',
        'opening_balance' => 'decimal:4',
    ];

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function salesOrders(): HasMany
    {
        return $this->hasMany(SalesOrder::class);
    }

    public function salesInvoices(): HasMany
    {
        return $this->hasMany(SalesInvoice::class);
    }

    public function salesReturns(): HasMany
    {
        return $this->hasMany(SalesReturn::class);
    }

    public function creditNotes(): HasMany
    {
        return $this->hasMany(CreditNote::class);
    }

    public function paymentVouchers(): HasMany
    {
        return $this->hasMany(PaymentVoucher::class, 'party_id')->where('party_type', 'customer');
    }

    public function jobOrders(): HasMany
    {
        return $this->hasMany(JobOrder::class);
    }

    public function customerMaterials(): HasMany
    {
        return $this->hasMany(CustomerMaterial::class);
    }

    public function materialReceipts(): HasMany
    {
        return $this->hasMany(CustomerMaterialReceipt::class);
    }

    public function deliveryNotes(): HasMany
    {
        return $this->hasMany(JobDeliveryNote::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(JobInvoice::class);
    }
}

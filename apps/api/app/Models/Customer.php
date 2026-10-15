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
        'contact_person',
        'phone',
        'email',
        'tax_id',
        'address',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

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

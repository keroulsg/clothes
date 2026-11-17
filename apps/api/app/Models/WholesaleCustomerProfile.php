<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WholesaleCustomerProfile extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'wholesale_customer_profiles';

    protected $fillable = [
        'tenant_id',
        'customer_id',
        'company_name',
        'business_type',
        'contact_person',
        'phone',
        'email',
        'tax_id',
        'commercial_registry',
        'city',
        'shipping_address',
        'password_hash',
        'status',
        'rejection_reason',
        'suspension_reason',
        'reviewed_by',
        'reviewed_at',
        'approved_at',
        'suspended_at',
        'notes',
        'auth_token',
    ];

    protected $hidden = [
        'password_hash',
        'auth_token',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'suspended_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    public function scopeSuspended($query)
    {
        return $query->where('status', 'suspended');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isSuspended(): bool
    {
        return $this->status === 'suspended';
    }
}

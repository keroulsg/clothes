<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantStoreSetting extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'store_name',
        'subdomain',
        'is_store_enabled',
        'allow_cod',
        'allow_card_payment',
        'currency',
        'banner_title',
        'banner_subtitle',
        'contact_whatsapp',
    ];

    protected $casts = [
        'is_store_enabled' => 'boolean',
        'allow_cod' => 'boolean',
        'allow_card_payment' => 'boolean',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

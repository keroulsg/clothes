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
        'theme_id',
        'theme_config',
        'draft_theme_id',
        'draft_theme_config',
        'previous_published_config',
        'published_at',
        'published_by',
        'subdomain',
        'is_store_enabled',
        'allow_cod',
        'allow_card_payment',
        'allow_instapay',
        'instapay_identifier',
        'instapay_display_name',
        'instapay_account_name',
        'instapay_handle',
        'instapay_instructions',
        'instapay_account_verified',
        'currency',
        'direction',
        'banner_title',
        'banner_subtitle',
        'contact_whatsapp',
    ];

    protected $casts = [
        'is_store_enabled' => 'boolean',
        'allow_cod' => 'boolean',
        'allow_card_payment' => 'boolean',
        'allow_instapay' => 'boolean',
        'instapay_account_verified' => 'boolean',
        'theme_config' => 'array',
        'draft_theme_config' => 'array',
        'previous_published_config' => 'array',
        'published_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinancialAccount extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'chart_of_account_id',
        'code',
        'name',
        'name_en',
        'type', // cash, bank, wallet
        'account_number',
        'bank_name',
        'currency',
        'branch_id',
        'opening_balance',
        'current_balance',
        'is_active',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'current_balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function chartOfAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'chart_of_account_id');
    }

    public function outgoingTransfers(): HasMany
    {
        return $this->hasMany(FinancialAccountTransfer::class, 'from_financial_account_id');
    }

    public function incomingTransfers(): HasMany
    {
        return $this->hasMany(FinancialAccountTransfer::class, 'to_financial_account_id');
    }
}


<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChartOfAccount extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'chart_of_accounts';

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'name_en',
        'type', // asset, liability, equity, revenue, expense
        'category',
        'parent_id',
        'level',
        'normal_balance', // debit, credit
        'is_control_account',
        'is_cash_bank',
        'account_subtype',
        'is_postable',
        'opening_balance',
        'current_balance',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'level' => 'integer',
        'is_control_account' => 'boolean',
        'is_cash_bank' => 'boolean',
        'is_postable' => 'boolean',
        'opening_balance' => 'decimal:4',
        'current_balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ChartOfAccount::class, 'parent_id')->orderBy('code');
    }

    public function journalLines(): HasMany
    {
        return $this->hasMany(JournalEntryLine::class, 'account_id');
    }

    public function paymentVouchers(): HasMany
    {
        return $this->hasMany(PaymentVoucher::class, 'account_id');
    }

    public function financialAccounts(): HasMany
    {
        return $this->hasMany(FinancialAccount::class, 'chart_of_account_id');
    }
}

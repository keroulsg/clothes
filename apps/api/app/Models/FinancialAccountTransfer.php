<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialAccountTransfer extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'transfer_number',
        'from_financial_account_id',
        'to_financial_account_id',
        'amount',
        'transfer_date',
        'status', // draft, completed, reversed
        'reference',
        'notes',
        'journal_entry_id',
        'reversed_transfer_id',
        'reversal_reason',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'decimal:4',
        'transfer_date' => 'date',
    ];

    public function fromAccount(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'from_financial_account_id');
    }

    public function toAccount(): BelongsTo
    {
        return $this->belongsTo(FinancialAccount::class, 'to_financial_account_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }
}


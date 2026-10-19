<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PieceWorkLog extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'production_order_id',
        'cutting_bundle_id',
        'piece_rate_id',
        'work_date',
        'completed_quantity',
        'unit_rate',
        'total_amount',
        'status',
    ];

    protected $casts = [
        'completed_quantity' => 'integer',
        'unit_rate' => 'decimal:4',
        'total_amount' => 'decimal:4',
        'work_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }

    public function cuttingBundle(): BelongsTo
    {
        return $this->belongsTo(CuttingBundle::class);
    }

    public function pieceRate(): BelongsTo
    {
        return $this->belongsTo(PieceRate::class);
    }
}

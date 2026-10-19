<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceWorkOrder extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'machine_id',
        'order_number',
        'work_type',
        'priority',
        'status',
        'issue_description',
        'resolution_notes',
        'reported_by',
        'technician_name',
        'downtime_hours',
        'spare_parts_cost',
        'labor_cost',
        'total_cost',
        'scheduled_date',
        'start_time',
        'completion_time',
    ];

    protected $casts = [
        'downtime_hours' => 'decimal:2',
        'spare_parts_cost' => 'decimal:4',
        'labor_cost' => 'decimal:4',
        'total_cost' => 'decimal:4',
        'scheduled_date' => 'date',
        'start_time' => 'datetime',
        'completion_time' => 'datetime',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class);
    }

    public function spareParts(): HasMany
    {
        return $this->hasMany(MaintenanceSparePart::class, 'work_order_id');
    }
}

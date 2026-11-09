<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UnitOfMeasure extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $table = 'units_of_measure';

    protected $fillable = [
        'tenant_id',
        'name',
        'symbol',
        'category',
        'base_unit',
        'conversion_factor',
        'is_active',
    ];

    protected $casts = [
        'conversion_factor' => 'decimal:6',
        'is_active' => 'boolean',
    ];
}


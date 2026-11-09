<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SizeCategory extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'name',
        'description',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function sizes(): HasMany
    {
        return $this->hasMany(Size::class, 'size_category_id')->orderBy('sort_order')->orderBy('name');
    }

    /**
     * التحقق مما إذا كان أي مقاس في هذا التصنيف مستخدماً في أوامر إنتاج أو مخزون
     */
    public function isUsedInProductionOrInventory(): bool
    {
        $sizeIds = $this->sizes()->pluck('id');
        if ($sizeIds->isEmpty()) {
            return false;
        }

        return ProductVariant::whereIn('size_id', $sizeIds)->exists();
    }
}


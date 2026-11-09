<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Size extends Model
{
    use HasFactory, HasUuids, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'size_category_id',
        'name',
        'category',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function sizeCategory(): BelongsTo
    {
        return $this->belongsTo(SizeCategory::class, 'size_category_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * فحص ما إذا كان المقاس مرتبطاً بمتغيرات منتجات أو بنود إنتاجية
     */
    public function isUsedInProductionOrInventory(): bool
    {
        if ($this->variants()->exists()) {
            return true;
        }

        if (\Illuminate\Support\Facades\DB::table('bom_items')->where('size_id', $this->id)->exists()) {
            return true;
        }

        return false;
    }
}

<?php

namespace App\Models;

use App\Models\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasUuids, SoftDeletes, BelongsToTenant;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'garment_model_id',
        'name',
        'name_en',
        'slug',
        'description',
        'main_image',
        'gallery',
        'base_cost',
        'selling_price',
        'pos_price',
        'wholesale_price',
        'stock_visibility',
        'is_pos_available',
        'status',
        'specifications',
    ];

    protected $casts = [
        'gallery' => 'array',
        'specifications' => 'array',
        'base_cost' => 'decimal:4',
        'selling_price' => 'decimal:4',
        'pos_price' => 'decimal:4',
        'wholesale_price' => 'decimal:4',
        'is_pos_available' => 'boolean',
    ];

    protected $appends = [
        'effective_pos_price',
        'effective_website_price',
        'effective_wholesale_price',
    ];

    /**
     * الحصول على سعر البيع في نقاط البيع مع استرجاع سعر التجزئة الافتراضي كـ Fallback
     */
    public function getEffectivePosPriceAttribute(): float
    {
        if ($this->pos_price !== null && (float) $this->pos_price > 0) {
            return (float) $this->pos_price;
        }

        return (float) $this->selling_price;
    }

    /**
     * الحصول على سعر البيع في المتجر الإلكتروني
     */
    public function getEffectiveWebsitePriceAttribute(): float
    {
        return (float) $this->selling_price;
    }

    /**
     * الحصول على سعر الجملة
     */
    public function getEffectiveWholesalePriceAttribute(): float
    {
        if ($this->wholesale_price !== null && (float) $this->wholesale_price > 0) {
            return (float) $this->wholesale_price;
        }

        return (float) $this->selling_price;
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ClothingCategory::class, 'category_id');
    }

    public function garmentModel(): BelongsTo
    {
        return $this->belongsTo(GarmentModel::class, 'garment_model_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class, 'product_id');
    }

    /**
     * التحقق مما إذا كان المنتج مرتبطاً بسجلات مبيعات أو رصيد مخزني لحمايته من الحذف التدميري
     */
    public function isReferencedInTransactionsOrInventory(): bool
    {
        $variantIds = $this->variants()->pluck('id');
        if ($variantIds->isEmpty()) {
            return false;
        }

        // فحص وجود رصيد مخزني حالي
        $hasInventory = \App\Models\InventoryItem::whereIn('variant_id', $variantIds)
            ->where('current_balance', '>', 0)
            ->exists();
        if ($hasInventory) {
            return true;
        }

        // فحص وجود طلبات متجر إلكتروني
        $hasStoreOrders = \App\Models\StoreOrderItem::whereIn('variant_id', $variantIds)->exists();
        if ($hasStoreOrders) {
            return true;
        }

        // فحص وجود بنود أوامر مبيعات
        if (\Illuminate\Support\Facades\Schema::hasTable('sales_order_items')) {
            $hasSales = \Illuminate\Support\Facades\DB::table('sales_order_items')
                ->whereIn('variant_id', $variantIds)
                ->exists();
            if ($hasSales) {
                return true;
            }
        }

        return false;
    }
}

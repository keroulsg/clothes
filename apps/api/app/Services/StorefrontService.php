<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\InventoryItem;
use App\Models\PaymentSubmission;
use App\Models\PaymentVoucher;
use App\Models\ProductVariant;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\StoreOrder;
use App\Models\StoreOrderItem;
use App\Models\TenantStoreSetting;
use App\Models\Warehouse;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StorefrontService
{
    public const THEME_FASHION_BOUTIQUE = 'fashion_boutique';
    public const THEME_MODERN_CATALOG = 'modern_catalog';
    public const THEME_KIDS_FAMILY = 'kids_family';
    public const THEME_PREMIUM_BRAND = 'premium_brand';

    // Aliases for backward compatibility
    public const THEME_MODERN_FASHION = 'modern_fashion';
    public const THEME_WHOLESALE_UNIFORM = 'wholesale_uniform';
    public const THEME_KIDS_BABY = 'kids_baby';

    public const AVAILABLE_THEMES = [
        self::THEME_FASHION_BOUTIQUE => [
            'id' => self::THEME_FASHION_BOUTIQUE,
            'name_ar' => 'بوتيك الأزياء العصرية (Fashion Boutique)',
            'name_en' => 'Fashion Boutique',
            'description_ar' => 'تصميم تحريري راقٍ للأزياء والملابس الجاهزة مع بنرات عريضة وشبكة منتجات تفاعلية وقصة العلامة.',
            'description_en' => 'High-fashion editorial layout with wide hero banners, interactive product cards, and brand storytelling.',
            'category' => 'fashion',
            'default_palette' => [
                'primary' => '#0284c7',
                'secondary' => '#0f172a',
                'accent' => '#f43f5e',
                'bg' => '#f8fafc',
            ],
        ],
        self::THEME_MODERN_CATALOG => [
            'id' => self::THEME_MODERN_CATALOG,
            'name_ar' => 'الكتالوج الحديث والتوريدات (Modern Catalog & Wholesale)',
            'name_en' => 'Modern Catalog',
            'description_ar' => 'تصميم بحثي عملي للكتالوجات الكبيرة وتجارة الجملة والزي الموحد مع شريط تصفية متقدم وأسعار الجملة وMOQ.',
            'description_en' => 'Structured search-first catalog with sidebar category filters, bulk pricing, and minimum order quantities.',
            'category' => 'wholesale_catalog',
            'default_palette' => [
                'primary' => '#2563eb',
                'secondary' => '#1e293b',
                'accent' => '#059669',
                'bg' => '#f1f5f9',
            ],
        ],
        self::THEME_KIDS_FAMILY => [
            'id' => self::THEME_KIDS_FAMILY,
            'name_ar' => 'أطفال وعائلة (Kids & Family)',
            'name_en' => 'Kids & Family',
            'description_ar' => 'ألوان مبهجة دافئة، تصفح حسب الفئات العمرية ومقاسات الأطفال، ووسوم السلامة والقطن المصري 100%.',
            'description_en' => 'Warm playful tones, age-bracket navigation, child-friendly sizing, and 100% natural cotton safety badges.',
            'category' => 'kids',
            'default_palette' => [
                'primary' => '#f97316',
                'secondary' => '#fed7aa',
                'accent' => '#10b981',
                'bg' => '#fffbeb',
            ],
        ],
        self::THEME_PREMIUM_BRAND => [
            'id' => self::THEME_PREMIUM_BRAND,
            'name_ar' => 'علامة تجارية فاخرة (Premium Luxury Brand)',
            'name_en' => 'Premium Brand',
            'description_ar' => 'بساطة فاخرة داكنة مع لمسات ذهبية وبرونزية، مساحات أنيقة وهوية راقية للأزياء الرسمية والبدل.',
            'description_en' => 'Luxury minimalism, gold and bronze accents, refined spacing and heritage typography for exclusive couture.',
            'category' => 'luxury',
            'default_palette' => [
                'primary' => '#d97706',
                'secondary' => '#18181b',
                'accent' => '#b45309',
                'bg' => '#09090b',
            ],
        ],
        // Aliases mapped to canonical templates for full backward compatibility
        self::THEME_MODERN_FASHION => [
            'id' => self::THEME_MODERN_FASHION,
            'canonical_id' => self::THEME_FASHION_BOUTIQUE,
            'name_ar' => 'الموضة العصرية (Modern Fashion)',
            'name_en' => 'Modern Fashion',
            'description_ar' => 'تصميم عصري جذاب يناسب الملابس الشبابية والأزياء الجاهزة مع استعراض صور كبير وشبكة منتجات أنيقة.',
            'description_en' => 'Clean, vibrant contemporary fashion with immersive cards and dynamic badges.',
            'default_palette' => [
                'primary' => '#0284c7',
                'secondary' => '#0f172a',
                'accent' => '#f43f5e',
                'bg' => '#f8fafc',
            ],
        ],
        self::THEME_KIDS_BABY => [
            'id' => self::THEME_KIDS_BABY,
            'canonical_id' => self::THEME_KIDS_FAMILY,
            'name_ar' => 'أطفال ومواليد (Kids & Baby)',
            'name_en' => 'Kids & Baby',
            'description_ar' => 'ألوان دافئة مبهجة، حواف دائرية ناعمة، ووسوم الفئات العمرية ومقاسات الأطفال وشهادات القطن الصحي.',
            'description_en' => 'Playful, pastel & warm tones, soft rounded borders, friendly age and safety badges.',
            'default_palette' => [
                'primary' => '#f97316',
                'secondary' => '#fed7aa',
                'accent' => '#10b981',
                'bg' => '#fffbeb',
            ],
        ],
        self::THEME_WHOLESALE_UNIFORM => [
            'id' => self::THEME_WHOLESALE_UNIFORM,
            'canonical_id' => self::THEME_MODERN_CATALOG,
            'name_ar' => 'الجملة والزي الموحد (Wholesale & Uniform)',
            'name_en' => 'Wholesale & Uniform',
            'description_ar' => 'مخصص لتجارة الجملة واليونيفورم وتوريدات الشركات مع عرض كميات الحد الأدنى للطلب (MOQ) وجداول المقاسات المجمعة.',
            'description_en' => 'B2B oriented, dense catalog tables, MOQ badges, bulk tier breakdown and procurement quotation request.',
            'default_palette' => [
                'primary' => '#2563eb',
                'secondary' => '#1e293b',
                'accent' => '#059669',
                'bg' => '#f1f5f9',
            ],
        ],
    ];

    /**
     * جلب إعدادات وكتالوج المتجر العام للمصنع بما فيها ثيمات العرض وبوابات الدفع
     */
    public function getStoreDetails(string $tenantId, bool $preview = false): array
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => 'Garment Factory Direct Store',
                'theme_id' => self::THEME_MODERN_FASHION,
                'theme_config' => [
                    'primary_color' => '#0284c7',
                    'font_family' => 'Cairo, sans-serif',
                    'direction' => 'rtl',
                ],
                // A newly provisioned storefront remains unpublished until the tenant owner configures it.
                'is_store_enabled' => false,
                'allow_cod' => false,
                'allow_card_payment' => false,
                'allow_instapay' => false,
                'currency' => 'EGP',
                'direction' => 'rtl',
                'banner_title' => 'أرقى منتجات الملابس من المصنع مباشرة',
                'banner_subtitle' => 'جودة تصدير، خامات قطنية 100%، وأسعار جملة وتجزئة مباشرة من خط الإنتاج.',
            ]
        );

        // Apply draft configuration override when preview mode is requested
        if ($preview) {
            if (!empty($settings->draft_theme_id)) {
                $settings->theme_id = $settings->draft_theme_id;
            }
            if (!empty($settings->draft_theme_config)) {
                $settings->theme_config = array_merge($settings->theme_config ?? [], $settings->draft_theme_config);
            }
        }

        // Storefront availability is sourced only from an active finished-goods warehouse.
        // Never expose raw-material or arbitrary warehouse stock as sellable finished products.
        $stockWarehouse = Warehouse::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where('type', 'finished_goods')
            ->orderBy('id')
            ->first();
        $firstWarehouseId = $stockWarehouse?->id;

        $variants = ProductVariant::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->with(['garmentModel', 'size', 'color', 'product'])
            ->get()
            ->filter(function ($variant) {
                // استبعاد مسودات والمنتجات المؤرشفة من الظهور في المتجر العام.
                if ($variant->product && $variant->product->status !== 'active') {
                    return false;
                }

                // لا نعرض منتجاً بسعر صفر عند غياب سعر القطاعي؛ سعر الجملة ليس بديلاً عاماً.
                $retailPrice = (float) (
                    $variant->product && (float) $variant->product->selling_price > 0
                        ? $variant->product->selling_price
                        : ($variant->retail_price ?? 0)
                );

                return $retailPrice > 0;
            })
            ->map(function ($variant) use ($tenantId, $firstWarehouseId) {
                $availableStock = $firstWarehouseId
                    ? InventoryItem::withoutGlobalScopes()
                        ->where('tenant_id', $tenantId)
                        ->where('variant_id', $variant->id)
                        ->where('warehouse_id', $firstWarehouseId)
                        ->where('is_customer_owned', false)
                        ->get(['current_balance', 'reserved_balance'])
                        ->sum(fn ($stockRow) => max(0, (float) $stockRow->current_balance - (float) $stockRow->reserved_balance))
                    : 0.0;

                // سعر البيع المعتمد للمتجر الإلكتروني (Website Price)
                // Public catalog is retail-only. Wholesale pricing must never leak to anonymous visitors.
                $websitePrice = (float) (
                    $variant->product && (float) $variant->product->selling_price > 0
                        ? $variant->product->selling_price
                        : ($variant->retail_price ?? 0)
                );

                return [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'barcode' => $variant->barcode,
                    'model_name' => $variant->product?->name ?? ($variant->garmentModel?->name ?? 'Model'),
                    'model_code' => $variant->garmentModel?->code ?? '',
                    'description' => $variant->product?->description ?? '',
                    'image' => $variant->product?->main_image ?? null,
                    'gallery' => $variant->product?->gallery ?? [],
                    'size' => $variant->size?->name ?? '',
                    'color' => $variant->color?->name ?? '',
                    'price' => $websitePrice,
                    'in_stock' => $availableStock,
                ];
            })
            ->values();

        return [
            'store_settings' => $settings,
            'is_preview' => $preview,
            'has_draft_changes' => !empty($settings->draft_theme_id) || !empty($settings->draft_theme_config),
            'available_themes' => self::AVAILABLE_THEMES,
            'products' => $variants,
        ];
    }

    /**
     * جلب بيانات استوديو تصميم المتجر (التكوين المنشور، المسودة، والقوالب المتاحة)
     */
    public function getDesignStudioConfig(string $tenantId): array
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => 'Garment Factory Direct Store',
                'theme_id' => self::THEME_MODERN_FASHION,
                'theme_config' => [
                    'primary_color' => '#0284c7',
                    'font_family' => 'Cairo, sans-serif',
                    'direction' => 'rtl',
                ],
                'is_store_enabled' => true,
            ]
        );

        $defaultConfig = [
            'logo_url' => '',
            'primary_color' => '#0284c7',
            'secondary_color' => '#0f172a',
            'accent_color' => '#f43f5e',
            'bg_color' => '#f8fafc',
            'font_family' => 'Cairo, sans-serif',
            'announcement_bar_enabled' => true,
            'announcement_bar_text' => 'شحن سريع لجميع المحافظات خلال 48 ساعة 🚚',
            'sections' => [
                ['id' => 'hero_banner', 'enabled' => true, 'order' => 1, 'title' => 'تشكيلة الموسم الجديد'],
                ['id' => 'featured_categories', 'enabled' => true, 'order' => 2, 'title' => 'الأقسام المميزة'],
                ['id' => 'new_arrivals', 'enabled' => true, 'order' => 3, 'title' => 'وصل حديثاً'],
                ['id' => 'brand_story', 'enabled' => true, 'order' => 4, 'title' => 'قصة الجودة والمصنع'],
            ],
            'banners' => [
                [
                    'id' => 'banner-1',
                    'title' => $settings->banner_title ?? 'أرقى منتجات الملابس من المصنع مباشرة',
                    'subtitle' => $settings->banner_subtitle ?? 'جودة تصدير وخامات قطنية 100% مباشرة من خط الإنتاج.',
                    'image_url' => '',
                    'cta_text' => 'تسوق الآن',
                    'cta_url' => '#products',
                    'enabled' => true,
                ],
            ],
        ];

        $publishedConfig = array_merge($defaultConfig, $settings->theme_config ?? []);
        $draftConfig = array_merge($publishedConfig, $settings->draft_theme_config ?? []);

        return [
            'tenant_id' => $tenantId,
            'published' => [
                'theme_id' => $settings->theme_id ?? self::THEME_FASHION_BOUTIQUE,
                'theme_config' => $publishedConfig,
                'published_at' => $settings->published_at,
                'published_by' => $settings->published_by,
            ],
            'draft' => [
                'theme_id' => $settings->draft_theme_id ?? $settings->theme_id ?? self::THEME_FASHION_BOUTIQUE,
                'theme_config' => $draftConfig,
            ],
            'has_draft_changes' => !empty($settings->draft_theme_id) || !empty($settings->draft_theme_config),
            'can_rollback' => !empty($settings->previous_published_config),
            'previous_published_config' => $settings->previous_published_config,
            'available_templates' => [
                self::AVAILABLE_THEMES[self::THEME_FASHION_BOUTIQUE],
                self::AVAILABLE_THEMES[self::THEME_MODERN_CATALOG],
                self::AVAILABLE_THEMES[self::THEME_KIDS_FAMILY],
                self::AVAILABLE_THEMES[self::THEME_PREMIUM_BRAND],
            ],
            'store_settings' => $settings,
        ];
    }

    /**
     * حفظ مسودة تعديلات التصميم دون التأثير على المتجر الحي المنشور
     */
    public function saveDesignDraft(string $tenantId, array $data): TenantStoreSetting
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => 'Garment Factory Direct Store',
                'theme_id' => self::THEME_FASHION_BOUTIQUE,
                'is_store_enabled' => true,
            ]
        );

        $themeId = $data['theme_id'] ?? $settings->draft_theme_id ?? $settings->theme_id;
        if (!array_key_exists($themeId, self::AVAILABLE_THEMES)) {
            throw new InvalidArgumentException('القالب المختار غير مدعوم في النظام.');
        }

        $draftConfig = $data['theme_config'] ?? $settings->draft_theme_config ?? $settings->theme_config ?? [];

        $settings->update([
            'draft_theme_id' => $themeId,
            'draft_theme_config' => $draftConfig,
        ]);

        return $settings->fresh();
    }

    /**
     * نشر تعديلات المسودة ذرياً للمتجر الحي مع أرشفة النسخة السابقة لإمكانية الاسترجاع
     */
    public function publishDesign(string $tenantId, ?int $userId = null): TenantStoreSetting
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => 'Garment Factory Direct Store',
                'theme_id' => self::THEME_FASHION_BOUTIQUE,
                'is_store_enabled' => true,
            ]
        );

        // Target new theme and config from draft (fallback to existing published)
        $newThemeId = $settings->draft_theme_id ?: $settings->theme_id ?: self::THEME_FASHION_BOUTIQUE;
        $newConfig = $settings->draft_theme_config ?: $settings->theme_config ?: [];

        // Archive previous state for safe rollback
        $archive = [
            'theme_id' => $settings->theme_id,
            'theme_config' => $settings->theme_config,
            'published_at' => $settings->published_at ? $settings->published_at->toISOString() : null,
            'published_by' => $settings->published_by,
        ];

        $settings->update([
            'theme_id' => $newThemeId,
            'theme_config' => $newConfig,
            'draft_theme_id' => null,
            'draft_theme_config' => null,
            'previous_published_config' => $archive,
            'published_at' => now(),
            'published_by' => $userId,
        ]);

        return $settings->fresh();
    }

    /**
     * استرجاع النسخة المنشورة السابقة
     */
    public function rollbackDesign(string $tenantId): TenantStoreSetting
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->where('tenant_id', $tenantId)->firstOrFail();

        if (empty($settings->previous_published_config)) {
            throw new InvalidArgumentException('لا توجد نسخة منشورة سابقة مؤرشفة للاسترجاع.');
        }

        $prev = $settings->previous_published_config;

        $settings->update([
            'theme_id' => $prev['theme_id'] ?? self::THEME_FASHION_BOUTIQUE,
            'theme_config' => $prev['theme_config'] ?? [],
            'draft_theme_id' => null,
            'draft_theme_config' => null,
            'previous_published_config' => null,
            'published_at' => now(),
        ]);

        return $settings->fresh();
    }

    /**
     * تحديث إعدادات وهوية وثيم متجر المصنع
     */
    public function updateStoreSettings(string $tenantId, array $data): TenantStoreSetting
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => $data['store_name'] ?? 'Garment Factory Direct Store',
                'theme_id' => self::THEME_MODERN_FASHION,
                'is_store_enabled' => true,
            ]
        );

        if (isset($data['theme_id']) && !array_key_exists($data['theme_id'], self::AVAILABLE_THEMES)) {
            throw new InvalidArgumentException('الثيم المختار غير مدعوم في النظام.');
        }

        $fillableData = array_intersect_key($data, array_flip([
            'store_name',
            'theme_id',
            'theme_config',
            'is_store_enabled',
            'allow_cod',
            'allow_card_payment',
            'allow_instapay',
            'instapay_account_name',
            'instapay_handle',
            'instapay_instructions',
            'currency',
            'direction',
            'banner_title',
            'banner_subtitle',
            'contact_whatsapp',
        ]));

        $settings->update($fillableData);

        return $settings->fresh();
    }

    /**
     * تسجيل طلب شراء إلكتروني جديد من متجر المصنع مع حجز المخزون والربط التلقائي بنظام أوامر البيع ERP
     * معمارية حرجة: لا يتم خصم المخزون الفعلي مباشرة (حماية ADR-004)، بل يتم حجز المخزون وإنشاء أمر بيع ERP
     */
    public function placeStoreOrder(string $tenantId, array $data): StoreOrder
    {
        return DB::transaction(function () use ($tenantId, $data) {
            $storeSettings = TenantStoreSetting::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->first();

            if (!$storeSettings || !$storeSettings->is_store_enabled) {
                throw new InvalidArgumentException('المتجر الإلكتروني غير منشور أو متوقف حالياً.');
            }

            $paymentMethod = $data['payment_method'] ?? 'cod';
            $paymentAllowed = match ($paymentMethod) {
                'cod' => (bool) $storeSettings->allow_cod,
                // Card checkout is unavailable until a real, verified payment gateway is integrated.
                'card_mock' => false,
                'instapay' => (bool) $storeSettings->allow_instapay && (bool) $storeSettings->instapay_account_verified,
                default => false,
            };
            if (!$paymentAllowed) {
                throw new InvalidArgumentException('طريقة الدفع المختارة غير مفعلة أو غير معتمدة لهذا المتجر.');
            }

            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new InvalidArgumentException('يجب إضافة منتج واحد على الأقل لسلة الشراء.');
            }

            // Security: Pre-fetch and lock variants belonging strictly to this tenant
            $variantIds = array_column($items, 'variant_id');
            $variants = ProductVariant::withoutGlobalScopes()
                ->with(['garmentModel', 'size', 'color', 'product'])
                ->where('tenant_id', $tenantId)
                ->whereIn('id', $variantIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($variants->count() !== count(array_unique($variantIds))) {
                throw new InvalidArgumentException('One or more selected products do not belong to this storefront.');
            }

            $subtotal = 0;
            $orderItemsData = [];
            $inventoryItemsMap = [];
            $requestedQuantitiesByVariant = [];
            $warehouse = Warehouse::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->where('type', 'finished_goods')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();
            $firstWarehouseId = $warehouse?->id;

            if (!$firstWarehouseId) {
                throw new InvalidArgumentException('لا يوجد مخزن نشط مرتبط بهذا المتجر لاستلام الطلبات.');
            }

            foreach ($items as $item) {
                $variantId = $item['variant_id'] ?? null;
                $variant = $variants->get($variantId);
                if (!$variant) {
                    throw new InvalidArgumentException('المنتج المطلوب غير متاح أو لا يتبع هذا المتجر.');
                }

                $qty = (int) ($item['quantity'] ?? 0);
                if ($qty <= 0) {
                    throw new InvalidArgumentException('يجب تحديد كمية صالحة (1 على الأقل).');
                }

                // Inventory Synchronization: check available balance accounting for existing reservations!
                $invItem = InventoryItem::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('warehouse_id', $firstWarehouseId)
                    ->where('variant_id', $variant->id)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                $currentBalance = $invItem ? (float)$invItem->current_balance : 0.0;
                $reservedBalance = $invItem ? (float)($invItem->reserved_balance ?? 0) : 0.0;
                $availableStock = max(0, $currentBalance - $reservedBalance);

                // Aggregate repeated cart lines for the same variant before checking stock.
                // Otherwise two individually-valid lines could reserve more than the available quantity.
                $requestedForVariant = ($requestedQuantitiesByVariant[$variant->id] ?? 0) + $qty;

                if ($availableStock < $requestedForVariant) {
                    throw new InvalidArgumentException(
                        "الكمية المطلوبة للمنتج {$variant->sku} غير متوفرة حالياً بالمخزن. المتوفر للبيع: "
                        . (int) $availableStock
                        . "، إجمالي الكمية المطلوبة: "
                        . (int) $requestedForVariant
                    );
                }

                $requestedQuantitiesByVariant[$variant->id] = $requestedForVariant;
                $inventoryItemsMap[$variant->id] = $invItem;

                if ($variant->product && $variant->product->status !== 'active') {
                    throw new InvalidArgumentException("المنتج {$variant->sku} غير متاح للبيع في المتجر حالياً (مسودة أو مؤرشف).");
                }

                // Public checkout is retail-only until an authenticated, approved wholesale account is resolved.
                // Never fall back to wholesale_price or a client-supplied price for an anonymous retail order.
                $authoritativeUnitPrice = (float) (
                    $variant->product && (float) $variant->product->selling_price > 0
                        ? $variant->product->selling_price
                        : ($variant->retail_price ?? 0)
                );
                if ($authoritativeUnitPrice <= 0) {
                    throw new InvalidArgumentException("سعر المنتج {$variant->sku} غير مهيأ بالمتجر.");
                }

                $authoritativeName = $variant->product?->name ?? ($variant->garmentModel?->name ?? 'منتج ملابس');
                $authoritativeSku = $variant->sku;

                $lineTotal = round($qty * $authoritativeUnitPrice, 4);
                $subtotal += $lineTotal;

                $orderItemsData[] = [
                    'tenant_id' => $tenantId,
                    'variant_id' => $variant->id,
                    'product_name' => $authoritativeName,
                    'sku' => $authoritativeSku,
                    'quantity' => $qty,
                    'unit_price' => $authoritativeUnitPrice,
                    'total_price' => $lineTotal,
                ];
            }

            // Security P0: Calculate shipping authoritatively on the server. Never trust client-supplied shipping_fee!
            $shipping = $this->calculateAuthoritativeShipping($tenantId, $data['city'] ?? 'Cairo', $subtotal);
            $total = round($subtotal + $shipping, 4);

            // Determine initial payment status
            $paymentStatus = match ($paymentMethod) {
                'cod' => 'cod_pending',
                'instapay' => !empty($data['instapay_reference']) || !empty($data['instapay_receipt_url']) ? 'pending_review' : 'pending_payment',
                default => 'pending',
            };

            // 1. Create StoreOrder
            $order = StoreOrder::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'order_number' => 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'customer_name' => $data['customer_name'] ?? 'عميل المتجر',
                'customer_phone' => $data['customer_phone'] ?? '',
                'shipping_address' => $data['shipping_address'] ?? '',
                'city' => $data['city'] ?? 'Cairo',
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus,
                'instapay_reference' => $data['instapay_reference'] ?? null,
                'instapay_receipt_url' => $data['instapay_receipt_url'] ?? null,
                'status' => 'new',
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'total_amount' => $total,
                'inventory_synced' => true,
            ]);

            foreach ($orderItemsData as $itemData) {
                $itemData['store_order_id'] = $order->id;
                StoreOrderItem::withoutGlobalScopes()->create($itemData);
            }

            // 2. Resolve / Create Customer in ERP Master
            $customerPhone = $data['customer_phone'] ?? '01000000000';
            $customer = Customer::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('phone', $customerPhone)
                ->first();

            if (!$customer) {
                $customer = Customer::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'code' => 'CUST-SO-' . strtoupper(substr(md5($customerPhone . $tenantId), 0, 6)),
                    'name' => $data['customer_name'] ?? 'عميل المتجر',
                    'phone' => $customerPhone,
                    'classification' => 'individual',
                    'address' => ($data['shipping_address'] ?? '') . ', ' . ($data['city'] ?? ''),
                    'is_active' => true,
                ]);
            }

            // 3. Bridge to ERP Sales Order (Primary Business Transaction)
            $salesOrder = SalesOrder::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'order_number' => 'SO-' . $order->order_number,
                'customer_id' => $customer->id,
                'customer_name' => $customer->name,
                'warehouse_id' => $firstWarehouseId,
                'order_type' => 'retail',
                'channel' => 'storefront',
                'store_order_id' => $order->id,
                'status' => 'confirmed', // Confirmed with stock reserved
                'payment_status' => 'unpaid',
                'subtotal' => $subtotal,
                'tax_amount' => 0,
                'discount_amount' => 0,
                'total_amount' => $total,
                'expected_delivery_date' => now()->addDays(3)->toDateString(),
                'delivery_address' => ($data['shipping_address'] ?? '') . ', ' . ($data['city'] ?? ''),
                'notes' => "طلب متجر إلكتروني برقم {$order->order_number}",
            ]);

            // Link SalesOrder ID to StoreOrder
            $order->update(['sales_order_id' => $salesOrder->id]);

            // 4. Create SalesOrderItems & Reserve Stock Safely (No direct physical decrement!)
            foreach ($orderItemsData as $itemData) {
                $invItem = $inventoryItemsMap[$itemData['variant_id']] ?? null;

                SalesOrderItem::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'sales_order_id' => $salesOrder->id,
                    'variant_id' => $itemData['variant_id'],
                    'inventory_item_id' => $invItem?->id,
                    'ordered_quantity' => $itemData['quantity'],
                    'reserved_quantity' => $itemData['quantity'],
                    'fulfilled_quantity' => 0,
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => 0,
                    'tax_amount' => 0,
                    'total_price' => $itemData['total_price'],
                ]);

                // Safe ERP reservation: increment reserved_balance only
                if ($invItem) {
                    $invItem->increment('reserved_balance', $itemData['quantity']);
                }
            }

            // 5. If payment method is InstaPay with reference or receipt, record PaymentSubmission
            if ($paymentMethod === 'instapay') {
                PaymentSubmission::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'store_order_id' => $order->id,
                    'sales_order_id' => $salesOrder->id,
                    'payment_method' => 'instapay',
                    'expected_amount' => $total,
                    'submitted_amount' => $total,
                    'currency' => 'EGP',
                    'transfer_reference' => $data['instapay_reference'] ?? null,
                    'receipt_file_path' => $data['instapay_receipt_url'] ?? null,
                    'status' => !empty($data['instapay_reference']) || !empty($data['instapay_receipt_url']) ? 'pending_review' : 'pending_payment',
                ]);
            }

            return $order->fresh(['items', 'salesOrder']);
        });
    }

    /**
     * اعتماد أو رفض تحويل InstaPay يدوياً مع تكامل مالي ومحاسبي كامل (سند قبض وقيد يومية متوازن)
     * قاعدة حرجة: لا يتم اعتماد الدفع أبداً بناءً على صورة إيصال فقط، بل بمراجعة بشرية مؤكدة
     */
    public function verifyInstaPayPayment(string $tenantId, string $orderId, string $userId, bool $approved, ?string $rejectionReason = null): StoreOrder
    {
        return DB::transaction(function () use ($tenantId, $orderId, $userId, $approved, $rejectionReason) {
            $order = StoreOrder::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($orderId);

            if ($order->payment_method !== 'instapay') {
                throw new InvalidArgumentException('لا يمكن مراجعة تحويل InstaPay لطلب لا يستخدم هذه الطريقة.');
            }

            if ($order->status === 'cancelled') {
                throw new InvalidArgumentException('لا يمكن مراجعة أو اعتماد الدفع لطلب ملغي مسبقاً.');
            }

            if ((float)$order->total_amount <= 0) {
                throw new InvalidArgumentException('قيمة الطلب غير صالحة للمراجعة والتدقيق المالي.');
            }

            if ($approved && $order->payment_status === 'verified_paid') {
                throw new InvalidArgumentException('هذا الطلب تم تدقيقه واعتماد دفعه مسبقاً.');
            }

            // Validate reviewer belongs to tenant
            $reviewer = \App\Models\User::where('tenant_id', $tenantId)->find($userId);
            if (!$reviewer) {
                throw new InvalidArgumentException('المستخدم المدقق غير مصرح له بمراجعة مدفوعات هذه الشركة.');
            }

            if ($approved) {
                // 1. Resolve or Create Sales Invoice for the linked ERP Sales Order
                $salesOrder = $order->sales_order_id
                    ? SalesOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('id', $order->sales_order_id)->first()
                    : null;
                $invoice = null;

                if ($salesOrder) {
                    $invoice = SalesInvoice::withoutGlobalScopes()
                        ->where('tenant_id', $tenantId)
                        ->where('sales_order_id', $salesOrder->id)
                        ->first();

                    if (!$invoice) {
                        $invoice = SalesInvoice::withoutGlobalScopes()->create([
                            'tenant_id' => $tenantId,
                            'invoice_number' => 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                            'sales_order_id' => $salesOrder->id,
                            'warehouse_id' => $salesOrder->warehouse_id,
                            'customer_id' => $salesOrder->customer_id,
                            'customer_name' => $salesOrder->customer_name,
                            'invoice_type' => 'standard',
                            'status' => 'issued',
                            'payment_method' => 'bank_transfer',
                            'subtotal' => $salesOrder->subtotal,
                            'tax_amount' => 0,
                            'discount_amount' => 0,
                            'total_amount' => $salesOrder->total_amount,
                            'paid_amount' => 0,
                            'balance_due' => $salesOrder->total_amount,
                            'invoice_date' => now()->toDateString(),
                            'due_date' => now()->toDateString(),
                        ]);
                    }
                }

                // 2. Issue formal ERP customer payment voucher with balanced double-entry journal (1020 Bank / 1110 AR)
                $customerId = $salesOrder ? $salesOrder->customer_id : Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->first()?->id;

                $voucher = null;
                if ($customerId) {
                    app()->instance('current_tenant_id', $tenantId);
                    $voucher = app(SalesService::class)->recordCustomerPayment([
                        'customer_id' => $customerId,
                        'amount' => (float)$order->total_amount,
                        'payment_method' => 'bank_transfer',
                        'sales_invoice_id' => $invoice?->id,
                        'notes' => "سند تحصيل InstaPay معتمد للطلب {$order->order_number} - مرجع: {$order->instapay_reference}",
                        'idempotency_key' => 'INSTAPAY-VERIFY-' . $order->id,
                    ]);
                }

                // 3. Update PaymentSubmission record
                $submission = PaymentSubmission::withoutGlobalScopes()
                    ->where('store_order_id', $order->id)
                    ->where('tenant_id', $tenantId)
                    ->latest()
                    ->first();

                if ($submission) {
                    $submission->update([
                        'status' => 'approved',
                        'reviewed_by' => $userId,
                        'reviewed_at' => now(),
                        'payment_voucher_id' => $voucher?->id,
                        'rejection_reason' => null,
                    ]);

                    // قيد يومية محاسبي رسمي لإثبات تحويل إنستاباي المعتمد (Debit Bank 1020 / Credit AR 1110)
                    try {
                        $bankAccount = app(AccountingService::class)->getMappedAccount($tenantId, 'default_bank');
                        $arAccount = app(AccountingService::class)->getMappedAccount($tenantId, 'ar_control');
                        $paidAmount = (float)$order->total_amount;

                        if ($paidAmount > 0 && $bankAccount && $arAccount) {
                            app(AccountingService::class)->createJournalEntry([
                                'tenant_id' => $tenantId,
                                'entry_number' => 'JE-IPN-' . substr(md5($order->id), 0, 8),
                                'entry_date' => now()->toDateString(),
                                'description' => "إثبات تحصيل تحويل InstaPay معتمد للطلب {$order->order_number} - مرجع: {$order->instapay_reference}",
                                'reference_type' => 'storefront_instapay',
                                'reference_id' => $submission->id,
                                'lines' => [
                                    [
                                        'account_id' => $bankAccount->id,
                                        'debit' => $paidAmount,
                                        'credit' => 0,
                                        'description' => "إيداع بنكي إنستاباي - طلب {$order->order_number}",
                                    ],
                                    [
                                        'account_id' => $arAccount->id,
                                        'debit' => 0,
                                        'credit' => $paidAmount,
                                        'description' => "تحصيل مديونية عميل إنستاباي - طلب {$order->order_number}",
                                        'party_type' => 'customer',
                                        'party_id' => $customerId,
                                    ]
                                ]
                            ]);
                        }
                    } catch (\Throwable $jeEx) {
                        \Illuminate\Support\Facades\Log::error('InstaPay Journal Entry error: ' . $jeEx->getMessage());
                    }
                }

                // 4. Update StoreOrder & SalesOrder statuses
                $order->update([
                    'payment_status' => 'verified_paid',
                    'status' => 'confirmed',
                                        'payment_reviewed_by_user_id' => (string) $userId,
                    'payment_reviewed_at' => now(),
                    'payment_rejection_reason' => null,
                ]);

                if ($salesOrder) {
                    $salesOrder->update(['payment_status' => 'paid']);
                }
            } else {
                $reason = $rejectionReason ?: 'تم رفض التحويل لعدم مطابقة الحساب البنكي أو نقص الإثبات';

                $submission = PaymentSubmission::withoutGlobalScopes()
                    ->where('store_order_id', $order->id)
                    ->where('tenant_id', $tenantId)
                    ->latest()
                    ->first();

                if ($submission) {
                    $submission->update([
                        'status' => 'rejected',
                        'reviewed_by' => $userId,
                        'reviewed_at' => now(),
                        'rejection_reason' => $reason,
                    ]);
                }

                $order->update([
                    'payment_status' => 'rejected',
                    'payment_rejection_reason' => $reason,
                                        'payment_reviewed_by_user_id' => (string) $userId,
                    'payment_reviewed_at' => now(),
                ]);
            }

            $reviewedOrder = $order->fresh(['items', 'paymentReviewer', 'salesOrder']);
            // Keep the legacy API response field without writing a numeric ID into its legacy UUID DB column.
            $reviewedOrder->setAttribute('payment_reviewed_by', (string) $userId);

            return $reviewedOrder;
        });
    }

    /**
     * تحديث حالة طلب المتجر ومعالجة فك الحجز وإلغاء أمر البيع تلقائياً عند الإلغاء
     */
    public function updateOrderStatus(string $orderId, string $status, ?string $reason = null): StoreOrder
    {
        return DB::transaction(function () use ($orderId, $status, $reason) {
            $order = StoreOrder::withoutGlobalScopes()->lockForUpdate()->findOrFail($orderId);

            if ($order->status === 'delivered' && $status === 'cancelled') {
                throw new InvalidArgumentException('لا يمكن إلغاء أمر تم تسليمه للعميل بالفعل.');
            }

            if ($status === 'cancelled' && $order->status !== 'cancelled') {
                $this->restoreOrderInventory($order);
            }

            $order->update(['status' => $status]);
            return $order->fresh(['items', 'salesOrder']);
        });
    }

    /**
     * استعادة المخزون عند إلغاء طلب الشراء مع فك الحجز وإلغاء أمر البيع المرتبط
     */
    public function restoreOrderInventory(StoreOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = StoreOrder::withoutGlobalScopes()
                ->where('tenant_id', $order->tenant_id)
                ->lockForUpdate()
                ->find($order->id);

            if (!$lockedOrder || !$lockedOrder->inventory_synced) {
                return;
            }

            if (!$lockedOrder->sales_order_id) {
                throw new InvalidArgumentException('طلب المتجر لا يحتوي على أمر بيع مرتبط؛ لا يمكن فك الحجز بأمان.');
            }

            $salesOrder = SalesOrder::withoutGlobalScopes()
                ->where('tenant_id', $lockedOrder->tenant_id)
                ->lockForUpdate()
                ->find($lockedOrder->sales_order_id);

            if (!$salesOrder) {
                throw new InvalidArgumentException('أمر البيع المرتبط بطلب المتجر غير موجود؛ لم يتم تغيير المخزون.');
            }

            if (in_array($salesOrder->status, ['fulfilled', 'cancelled'], true)) {
                throw new InvalidArgumentException('لا يمكن فك حجز طلب تم تسليمه أو إلغاؤه بالفعل من خلال مسار الحجز.');
            }

            // Release exactly the reservation rows created for this ERP order.
            // Lock by inventory_item_id (not variant_id) to avoid releasing stock from another warehouse.
            $salesLines = SalesOrderItem::withoutGlobalScopes()
                ->where('tenant_id', $lockedOrder->tenant_id)
                ->where('sales_order_id', $salesOrder->id)
                ->lockForUpdate()
                ->get();

            foreach ($salesLines as $salesLine) {
                $reservedForLine = (float) ($salesLine->reserved_quantity ?? 0);
                if ($reservedForLine <= 0) {
                    continue;
                }

                if (!$salesLine->inventory_item_id) {
                    throw new InvalidArgumentException('سطر أمر البيع لا يحتوي على سجل مخزون محدد؛ لا يمكن فك الحجز بأمان.');
                }

                $invItem = InventoryItem::withoutGlobalScopes()
                    ->where('tenant_id', $lockedOrder->tenant_id)
                    ->where('warehouse_id', $salesOrder->warehouse_id)
                    ->where('id', $salesLine->inventory_item_id)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                if (!$invItem || (float) $invItem->reserved_balance < $reservedForLine) {
                    throw new InvalidArgumentException('رصيد الحجز لا يطابق سطر أمر البيع؛ أوقفنا الإلغاء لمنع فساد المخزون.');
                }

                $invItem->reserved_balance = round((float) $invItem->reserved_balance - $reservedForLine, 4);
                $invItem->save();

                $salesLine->reserved_quantity = 0;
                $salesLine->save();
            }

            $salesOrder->update([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'Storefront order cancelled',
            ]);

            $lockedOrder->update(['inventory_synced' => false]);
        });
    }

    /**
     * سياسة احتساب تكلفة الشحن المعتمدة سيرفر-سايد
     * تمنع التلاعب وتفرض رسوم الشحن الحقيقية بناء على المدينة والقيمة
     */
    public function calculateAuthoritativeShipping(string $tenantId, ?string $city, float $subtotal): float
    {
        // شحن مجاني للطلبات الكبيرة بقيمة 1500 جنيه فأكثر
        if ($subtotal >= 1500.0) {
            return 0.0;
        }

        $cityClean = mb_strtolower(trim($city ?? ''));

        // القاهرة الكبرى والجيزة
        if (in_array($cityClean, ['cairo', 'giza', 'القاهرة', 'الجيزة', 'october', 'أكتوبر', 'زايد', 'nasr city', 'new cairo'], true)) {
            return 50.0;
        }

        // الإسكندرية والوجه البحري والقناة
        if (in_array($cityClean, ['alexandria', 'alex', 'الإسكندرية', 'tanta', 'طنطا', 'mansoura', 'المنصورة', 'ismailia', 'suez', 'port said', 'بورسعيد', 'السويس', 'الإسماعيلية'], true)) {
            return 60.0;
        }

        // الصعيد والبحر الأحمر والمحافظات البعيدة
        if (in_array($cityClean, ['aswan', 'luxor', 'hurghada', 'sharm', 'أسوان', 'الأقصر', 'الغردقة', 'قنا', 'سوهاج', 'أسيوط', 'بني سويف', 'المنيا', 'مطروح'], true)) {
            return 80.0;
        }

        // القيمة القياسية الافتراضية للشحن الموثوق
        return 50.0;
    }

    /**
     * تتبع طلب الشراء للعميل العام بواسطة رقم الطلب ورقم الهاتف
     */
    public function trackOrder(string $orderNumber, string $phone, ?string $tenantId = null): ?StoreOrder
    {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

        $query = StoreOrder::withoutGlobalScopes()
            ->with(['items.variant.garmentModel', 'items.variant.size', 'items.variant.color', 'tenant'])
            ->where('order_number', trim($orderNumber));

        if ($tenantId) {
            $query->where('tenant_id', $tenantId);
        }

        $order = $query->first();

        if (!$order) {
            return null;
        }

        $orderPhoneClean = preg_replace('/[^0-9]/', '', $order->customer_phone);
        if ($orderPhoneClean !== $cleanPhone && !str_ends_with($orderPhoneClean, $cleanPhone) && !str_ends_with($cleanPhone, $orderPhoneClean)) {
            return null;
        }

        return $order;
    }

    /**
     * رفع أو تحديث إيصال/مرجع تحويل InstaPay من طرف العميل
     * يعيد حالة الدفع تلقائياً إلى pending_review لتمكين الإدارة من التدقيق
     */
    public function submitCustomerReceipt(
        string $orderNumber,
        string $phone,
        string $instapayReference,
        ?string $receiptUrl = null,
        ?string $tenantId = null
    ): StoreOrder {
        $order = $this->trackOrder($orderNumber, $phone, $tenantId);

        if (!$order) {
            throw new InvalidArgumentException('لم يتم العثور على الطلب أو رقم الهاتف غير مطابق.');
        }

        if ($order->payment_method !== 'instapay') {
            throw new InvalidArgumentException('هذا الطلب غير مخصص للدفع عبر InstaPay.');
        }

        if (in_array($order->status, ['cancelled', 'delivered'], true)) {
            throw new InvalidArgumentException('لا يمكن رفع إيصال دفع لطلب تم إلغاؤه أو تسليمه.');
        }

        return DB::transaction(function () use ($order, $instapayReference, $receiptUrl) {
            $lockedOrder = StoreOrder::withoutGlobalScopes()->lockForUpdate()->find($order->id);

            $updateData = [
                'instapay_reference' => trim($instapayReference),
                'payment_status' => 'pending_review',
            ];

            if ($receiptUrl) {
                $updateData['instapay_receipt_url'] = trim($receiptUrl);
            }

            $lockedOrder->update($updateData);

            // Create or update PaymentSubmission
            PaymentSubmission::withoutGlobalScopes()->updateOrCreate(
                [
                    'tenant_id' => $lockedOrder->tenant_id,
                    'store_order_id' => $lockedOrder->id,
                    'status' => 'pending_review',
                ],
                [
                    'sales_order_id' => $lockedOrder->sales_order_id,
                    'payment_method' => 'instapay',
                    'expected_amount' => $lockedOrder->total_amount,
                    'submitted_amount' => $lockedOrder->total_amount,
                    'currency' => 'EGP',
                    'transfer_reference' => trim($instapayReference),
                    'receipt_file_path' => $receiptUrl ? trim($receiptUrl) : null,
                ]
            );

            \App\Models\AuditLog::create([
                'tenant_id' => $lockedOrder->tenant_id,
                'user_id' => null,
                'action' => 'storefront.customer_receipt_submitted',
                'auditable_type' => StoreOrder::class,
                'auditable_id' => $lockedOrder->id,
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
                'old_values' => ['payment_status' => $order->payment_status],
                'new_values' => [
                    'payment_status' => 'pending_review',
                    'instapay_reference' => $instapayReference,
                ],
            ]);

            return $lockedOrder->fresh(['items', 'tenant']);
        });
    }

    /**
     * استرجاع قائمة التحويلات المعلقة بانتظار المراجعة والتدقيق المالي
     */
    public function getPendingPaymentSubmissions(string $tenantId, ?array $branchIds = null): \Illuminate\Database\Eloquent\Collection
    {
        $query = PaymentSubmission::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'pending_review')
            ->with(['storeOrder.salesOrder.warehouse', 'salesOrder.warehouse', 'reviewer']);

        if ($branchIds !== null) {
            $query
                ->where(function ($branchQuery) use ($branchIds) {
                    $branchQuery->whereHas('storeOrder.salesOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds))
                        ->orWhereHas('salesOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
                })
                ->where(function ($branchQuery) use ($branchIds) {
                    $branchQuery->whereDoesntHave('storeOrder')
                        ->orWhereHas('storeOrder.salesOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
                })
                ->where(function ($branchQuery) use ($branchIds) {
                    $branchQuery->whereDoesntHave('salesOrder')
                        ->orWhereHas('salesOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
                });
        }

        return $query->latest()->get();
    }

    /**
     * تحديث إعدادات إنستاباي الخاصة بالمصنع بشكل آمن وموثق
     */
    public function updateInstaPaySettings(string $tenantId, array $data, ?int $userId = null): TenantStoreSetting
    {
        return DB::transaction(function () use ($tenantId, $data, $userId) {
            $settings = TenantStoreSetting::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
            if (!$settings) {
                $settings = TenantStoreSetting::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'store_name' => 'متجر المصنع',
                ]);
            }

            $oldValues = [
                'allow_instapay' => $settings->allow_instapay,
                'instapay_identifier' => $settings->instapay_identifier,
                'instapay_display_name' => $settings->instapay_display_name,
            ];

            $updateData = [];
            if (array_key_exists('instapay_enabled', $data)) {
                $updateData['allow_instapay'] = (bool) $data['instapay_enabled'];
            } elseif (array_key_exists('allow_instapay', $data)) {
                $updateData['allow_instapay'] = (bool) $data['allow_instapay'];
            }

            if (array_key_exists('instapay_identifier', $data)) {
                $updateData['instapay_identifier'] = $data['instapay_identifier'];
                $updateData['instapay_handle'] = $data['instapay_identifier']; // Sync backward compatibility
            }

            if (array_key_exists('instapay_display_name', $data)) {
                $updateData['instapay_display_name'] = $data['instapay_display_name'];
                $updateData['instapay_account_name'] = $data['instapay_display_name'];
            }

            if (array_key_exists('instapay_instructions', $data)) {
                $updateData['instapay_instructions'] = $data['instapay_instructions'];
            }

            if (array_key_exists('instapay_account_verified', $data)) {
                $updateData['instapay_account_verified'] = (bool) $data['instapay_account_verified'];
            }

            $settings->update($updateData);

            \App\Models\AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'action' => 'storefront.instapay_settings_updated',
                'auditable_type' => TenantStoreSetting::class,
                'auditable_id' => $settings->id,
                'old_values' => $oldValues,
                'new_values' => $updateData,
            ]);

            return $settings;
        });
    }
}


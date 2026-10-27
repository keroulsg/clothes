<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\ProductVariant;
use App\Models\StoreOrder;
use App\Models\StoreOrderItem;
use App\Models\TenantStoreSetting;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class StorefrontService
{
    public const THEME_MODERN_FASHION = 'modern_fashion';
    public const THEME_KIDS_BABY = 'kids_baby';
    public const THEME_PREMIUM_BRAND = 'premium_brand';
    public const THEME_WHOLESALE_UNIFORM = 'wholesale_uniform';

    public const AVAILABLE_THEMES = [
        self::THEME_MODERN_FASHION => [
            'id' => self::THEME_MODERN_FASHION,
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
        self::THEME_PREMIUM_BRAND => [
            'id' => self::THEME_PREMIUM_BRAND,
            'name_ar' => 'علامة فاخرة (Premium Brand)',
            'name_en' => 'Premium Brand',
            'description_ar' => 'تصميم راقٍ بطابع فاخر داكن، لمسات برونزية وذهبية، وتنسيق أنيق للملابس الرسمية والفاخرة.',
            'description_en' => 'Luxury dark/editorial feel, gold/bronze accents, refined typography and high-fashion aesthetics.',
            'default_palette' => [
                'primary' => '#d97706',
                'secondary' => '#18181b',
                'accent' => '#b45309',
                'bg' => '#09090b',
            ],
        ],
        self::THEME_WHOLESALE_UNIFORM => [
            'id' => self::THEME_WHOLESALE_UNIFORM,
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
    public function getStoreDetails(string $tenantId): array
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
                'allow_cod' => true,
                'allow_card_payment' => false,
                'allow_instapay' => true,
                'instapay_account_name' => 'GarmentOS Factory Operations',
                'instapay_handle' => 'factory@instapay',
                'instapay_instructions' => 'يرجى تحويل قيمة الفاتورة عبر تطبيق InstaPay إلى المعرف أعلاه، ثم إرفاق رقم العملية المرجعي لتأكيد الشحن.',
                'currency' => 'EGP',
                'direction' => 'rtl',
                'banner_title' => 'أرقى منتجات الملابس من المصنع مباشرة',
                'banner_subtitle' => 'جودة تصدير، خامات قطنية 100%، وأسعار جملة وتجزئة مباشرة من خط الإنتاج.',
            ]
        );

        $variants = ProductVariant::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->with(['garmentModel', 'size', 'color'])
            ->get()
            ->map(function ($variant) use ($tenantId) {
                $availableStock = (float) InventoryItem::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('variant_id', $variant->id)
                    ->where('is_customer_owned', false)
                    ->sum('current_balance');

                return [
                    'id' => $variant->id,
                    'sku' => $variant->sku,
                    'barcode' => $variant->barcode,
                    'model_name' => $variant->garmentModel?->name ?? 'Model',
                    'model_code' => $variant->garmentModel?->code ?? '',
                    'size' => $variant->size?->name ?? '',
                    'color' => $variant->color?->name ?? '',
                    'price' => (float) ($variant->retail_price > 0 ? $variant->retail_price : $variant->wholesale_price),
                    'in_stock' => $availableStock,
                ];
            });

        return [
            'store_settings' => $settings,
            'available_themes' => self::AVAILABLE_THEMES,
            'products' => $variants,
        ];
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
     * تسجيل طلب شراء إلكتروني جديد من متجر المصنع مع التحقق الأمني الكامل والخصم المباشر من المخزون
     */
    public function placeStoreOrder(string $tenantId, array $data): StoreOrder
    {
        return DB::transaction(function () use ($tenantId, $data) {
            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new InvalidArgumentException('يجب إضافة منتج واحد على الأقل لسلة الشراء.');
            }

            // Security: Pre-fetch and lock variants belonging strictly to this tenant
            $variantIds = array_column($items, 'variant_id');
            $variants = ProductVariant::withoutGlobalScopes()
                ->with(['garmentModel', 'size', 'color'])
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

                // Inventory Synchronization: check and lock available inventory stock
                $invItem = InventoryItem::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('variant_id', $variant->id)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                $availableStock = $invItem ? (float)$invItem->current_balance : 0.0;

                if ($availableStock < $qty) {
                    throw new InvalidArgumentException("الكمية المطلوبة للمنتج {$variant->sku} غير متوفرة حالياً بالمخزن. المتوفر: " . (int)$availableStock);
                }

                // Security P0: Compute unit price authoritatively from database record. Never trust client unit_price!
                $authoritativeUnitPrice = (float) ($variant->retail_price > 0 ? $variant->retail_price : $variant->wholesale_price);
                if ($authoritativeUnitPrice <= 0) {
                    throw new InvalidArgumentException("سعر المنتج {$variant->sku} غير مهيأ بالمتجر.");
                }

                $authoritativeName = $variant->garmentModel?->name ?? 'منتج ملابس';
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

                // Deduct inventory balance directly from the locked warehouse item
                $invItem->decrement('current_balance', $qty);
            }

            // Security P0: Calculate shipping authoritatively on the server. Never trust client-supplied shipping_fee!
            $shipping = $this->calculateAuthoritativeShipping($tenantId, $data['city'] ?? 'Cairo', $subtotal);
            $total = round($subtotal + $shipping, 4);

            $paymentMethod = $data['payment_method'] ?? 'cod';
            if (!in_array($paymentMethod, ['cod', 'card_mock', 'instapay'], true)) {
                throw new InvalidArgumentException('طريقة الدفع المختارة غير مقبولة.');
            }

            // Determine initial payment status
            $paymentStatus = match ($paymentMethod) {
                'cod' => 'cod_pending',
                'instapay' => !empty($data['instapay_reference']) || !empty($data['instapay_receipt_url']) ? 'pending_review' : 'pending_payment',
                default => 'pending',
            };

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

            return $order->load('items');
        });
    }

    /**
     * اعتماد أو رفض تحويل InstaPay يدوياً بواسطة المدير أو المحاسب
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
                $order->update([
                    'payment_status' => 'verified_paid',
                    'payment_reviewed_by' => $userId,
                    'payment_reviewed_at' => now(),
                    'payment_rejection_reason' => null,
                ]);
            } else {
                $order->update([
                    'payment_status' => 'rejected',
                    'payment_rejection_reason' => $rejectionReason ?: 'تم رفض التحويل لعدم مطابقة الحساب البنكي',
                    'payment_reviewed_by' => $userId,
                    'payment_reviewed_at' => now(),
                ]);
            }

            return $order->fresh(['items', 'paymentReviewer']);
        });
    }

    /**
     * استعادة المخزون عند إلغاء طلب الشراء مع ضمان عدم التكرار
     */
    public function restoreOrderInventory(StoreOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = StoreOrder::withoutGlobalScopes()
                ->lockForUpdate()
                ->find($order->id);

            if (!$lockedOrder || !$lockedOrder->inventory_synced) {
                return;
            }

            foreach ($lockedOrder->items as $item) {
                $invItem = InventoryItem::withoutGlobalScopes()
                    ->where('tenant_id', $lockedOrder->tenant_id)
                    ->where('variant_id', $item->variant_id)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                if ($invItem) {
                    $invItem->increment('current_balance', $item->quantity);
                }
            }

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
}


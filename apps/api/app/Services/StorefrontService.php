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
    /**
     * جلب إعدادات وكتالوج المتجر العام للمصنع
     */
    public function getStoreDetails(string $tenantId): array
    {
        $settings = TenantStoreSetting::withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId],
            [
                'store_name' => 'Garment Factory Direct Store',
                'is_store_enabled' => true,
                'allow_cod' => true,
                'allow_card_payment' => false,
                'currency' => 'EGP',
                'banner_title' => 'أرقى ملابس الأطفال من المصنع مباشرة',
                'banner_subtitle' => 'جودة تصدير، خامات قطنية 100%، وأسعار جملة وتجزئة مباشرة من خط الإنتاج.',
            ]
        );

        $variants = ProductVariant::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->with(['garmentModel', 'size', 'color'])
            ->get()
            ->map(function ($variant) use ($tenantId) {
                $availableStock = InventoryItem::withoutGlobalScopes()
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
                    'in_stock' => (float) $availableStock,
                ];
            });

        return [
            'store_settings' => $settings,
            'products' => $variants,
        ];
    }

    /**
     * تسجيل طلب شراء إلكتروني جديد من متجر المصنع مع التحقق الأمني الكامل من الأسعار والمنتجات
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
            }

            $shipping = isset($data['shipping_fee']) ? (float) $data['shipping_fee'] : 50.0;
            $total = round($subtotal + $shipping, 4);

            $order = StoreOrder::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'order_number' => 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'customer_name' => $data['customer_name'] ?? 'عميل المتجر',
                'customer_phone' => $data['customer_phone'] ?? '',
                'shipping_address' => $data['shipping_address'] ?? '',
                'city' => $data['city'] ?? 'Cairo',
                'payment_method' => $data['payment_method'] ?? 'cod', // COD or card_mock
                'status' => 'new',
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'total_amount' => $total,
            ]);

            foreach ($orderItemsData as $itemData) {
                $itemData['store_order_id'] = $order->id;
                StoreOrderItem::withoutGlobalScopes()->create($itemData);
            }

            return $order->load('items');
        });
    }
}

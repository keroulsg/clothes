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
        $settings = TenantStoreSetting::firstOrCreate(
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

        $variants = ProductVariant::where('tenant_id', $tenantId)
            ->with(['garmentModel', 'size', 'color'])
            ->get()
            ->map(function ($variant) use ($tenantId) {
                $availableStock = InventoryItem::where('tenant_id', $tenantId)
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
     * تسجيل طلب شراء إلكتروني جديد من متجر المصنع
     */
    public function placeStoreOrder(string $tenantId, array $data): StoreOrder
    {
        return DB::transaction(function () use ($tenantId, $data) {
            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new InvalidArgumentException('يجب إضافة منتج واحد على الأقل لسلة الشراء.');
            }

            $subtotal = 0;
            foreach ($items as $item) {
                $qty = (int) $item['quantity'];
                $price = (float) $item['unit_price'];
                $subtotal += ($qty * $price);
            }

            $shipping = isset($data['shipping_fee']) ? (float) $data['shipping_fee'] : 50.0;
            $total = round($subtotal + $shipping, 4);

            $order = StoreOrder::create([
                'tenant_id' => $tenantId,
                'order_number' => 'ORD-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'shipping_address' => $data['shipping_address'],
                'city' => $data['city'] ?? 'Cairo',
                'payment_method' => $data['payment_method'] ?? 'cod', // COD or card_mock
                'status' => 'new',
                'subtotal' => $subtotal,
                'shipping_fee' => $shipping,
                'total_amount' => $total,
            ]);

            foreach ($items as $item) {
                StoreOrderItem::create([
                    'tenant_id' => $tenantId,
                    'store_order_id' => $order->id,
                    'variant_id' => $item['variant_id'],
                    'product_name' => $item['product_name'] ?? 'Apparel Item',
                    'sku' => $item['sku'] ?? 'SKU',
                    'quantity' => (int) $item['quantity'],
                    'unit_price' => (float) $item['unit_price'],
                    'total_price' => round((int) $item['quantity'] * (float) $item['unit_price'], 4),
                ]);
            }

            return $order->load('items');
        });
    }
}

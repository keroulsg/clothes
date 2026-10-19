<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\SalesDeliveryNote;
use App\Models\SalesCarton;
use App\Models\Warehouse;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SalesService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * إنشاء عرض سعر رسمي للعميل
     */
    public function createQuotation(array $data): Quotation
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;

                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                $subtotal += $itemSubtotal;
                $taxTotal += $itemTax;
            }

            $discount = isset($data['discount_amount']) ? (float) $data['discount_amount'] : 0.0;
            $total = max(0, round($subtotal + $taxTotal - $discount, 4));

            $quotation = Quotation::create([
                'tenant_id' => $tenantId,
                'quotation_number' => $data['quotation_number'] ?? ('QT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'status' => 'draft',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'valid_until' => $data['valid_until'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;
                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                QuotationItem::create([
                    'tenant_id' => $tenantId,
                    'quotation_id' => $quotation->id,
                    'variant_id' => $item['variant_id'] ?? null,
                    'description' => $item['description'] ?? 'Garment Item',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'total_price' => round($itemSubtotal + $itemTax, 4),
                ]);
            }

            return $quotation->load('items');
        });
    }

    /**
     * إنشاء أمر بيع مع التحقق من بيانات الأصناف
     */
    public function createSalesOrder(array $data): SalesOrder
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                $qty = (float) $item['ordered_quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;

                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                $subtotal += $itemSubtotal;
                $taxTotal += $itemTax;
            }

            $discount = isset($data['discount_amount']) ? (float) $data['discount_amount'] : 0.0;
            $total = max(0, round($subtotal + $taxTotal - $discount, 4));

            $order = SalesOrder::create([
                'tenant_id' => $tenantId,
                'order_number' => $data['order_number'] ?? ('SO-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'],
                'quotation_id' => $data['quotation_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'] ?? null,
                'order_type' => $data['order_type'] ?? 'wholesale',
                'status' => 'confirmed',
                'payment_status' => 'unpaid',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float) $item['ordered_quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;
                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                SalesOrderItem::create([
                    'tenant_id' => $tenantId,
                    'sales_order_id' => $order->id,
                    'variant_id' => $item['variant_id'],
                    'inventory_item_id' => $item['inventory_item_id'] ?? null,
                    'ordered_quantity' => $qty,
                    'reserved_quantity' => 0,
                    'fulfilled_quantity' => 0,
                    'unit_price' => $price,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'total_price' => round($itemSubtotal + $itemTax, 4),
                ]);
            }

            return $order->load('items');
        });
    }

    /**
     * حجز المخزون لأمر البيع لمنع البيع المزدوج دون السماح برصيد سالب
     */
    public function reserveOrderStock(string $salesOrderId): SalesOrder
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($salesOrderId, $tenantId) {
            $order = SalesOrder::where('tenant_id', $tenantId)
                ->where('id', $salesOrderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'fulfilled' || $order->status === 'cancelled') {
                throw new InvalidArgumentException("لا يمكن حجز مخزون لأمر بيع بحالة {$order->status}");
            }

            foreach ($order->items as $item) {
                // البحث عن الصنف المخزني التام المرتبط بالمتغير في المخزن المحدد
                $inventoryQuery = InventoryItem::where('tenant_id', $tenantId)
                    ->where('variant_id', $item->variant_id)
                    ->where('is_customer_owned', false); // أمان: حظر حجز أمانات العملاء للبيع التجاري

                if ($order->warehouse_id) {
                    $inventoryQuery->where('warehouse_id', $order->warehouse_id);
                }

                $inventoryItem = $inventoryQuery->lockForUpdate()->first();

                if (!$inventoryItem) {
                    throw new InvalidArgumentException("لا يوجد رصيد مسجل في المخازن للمنتج المطلوب (Variant: {$item->variant_id})");
                }

                $needed = $item->ordered_quantity - $item->reserved_quantity;
                if ($needed > 0) {
                    if ($inventoryItem->current_balance < $needed) {
                        throw new InvalidArgumentException("رصيد المخزن غير كافٍ لحجز الكمية المطلوبة للمنتج {$inventoryItem->name}. المتاح: {$inventoryItem->current_balance}، المطلوب: {$needed}");
                    }

                    $item->reserved_quantity += $needed;
                    $item->inventory_item_id = $inventoryItem->id;
                    $item->save();
                }
            }

            $order->status = 'reserved';
            $order->save();

            return $order->fresh(['items']);
        });
    }

    /**
     * تنفيذ أمر البيع وصرف البضاعة التامة وإصدار فاتورة المبيعات الرسمية
     */
    public function fulfillOrder(string $salesOrderId): SalesInvoice
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($salesOrderId, $tenantId) {
            $order = SalesOrder::where('tenant_id', $tenantId)
                ->where('id', $salesOrderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'fulfilled' || $order->status === 'cancelled') {
                throw new InvalidArgumentException("أمر البيع مكتمل أو ملغي مسبقاً");
            }

            // إنشاء فاتورة المبيعات
            $invoice = SalesInvoice::create([
                'tenant_id' => $tenantId,
                'invoice_number' => 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'sales_order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'customer_name' => $order->customer_name,
                'invoice_type' => 'standard',
                'status' => 'issued',
                'payment_method' => 'credit',
                'subtotal' => $order->subtotal,
                'tax_amount' => $order->tax_amount,
                'discount_amount' => $order->discount_amount,
                'total_amount' => $order->total_amount,
                'paid_amount' => 0,
                'balance_due' => $order->total_amount,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->addDays(30)->toDateString(),
            ]);

            foreach ($order->items as $item) {
                $qtyToFulfill = $item->ordered_quantity - $item->fulfilled_quantity;
                if ($qtyToFulfill <= 0) continue;

                $inventoryItem = InventoryItem::where('tenant_id', $tenantId)
                    ->where('id', $item->inventory_item_id)
                    ->lockForUpdate()
                    ->first();

                if (!$inventoryItem) {
                    $inventoryItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $item->variant_id)
                        ->where('is_customer_owned', false)
                        ->lockForUpdate()
                        ->firstOrFail();
                }

                // تسجيل حركة صرف مخزني رسمية عبر محرك المخزون لمنع الرصيد السالب
                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $inventoryItem->id,
                    'warehouse_id' => $inventoryItem->warehouse_id,
                    'quantity' => $qtyToFulfill,
                    'direction' => 'OUT',
                    'transaction_type' => 'sales_delivery',
                    'unit_cost' => $inventoryItem->average_cost,
                    'reference_type' => 'sales_orders',
                    'reference_id' => $order->id,
                    'idempotency_key' => 'SO-DELIV-' . $order->id . '-' . $item->id,
                ]);

                $item->fulfilled_quantity += $qtyToFulfill;
                $item->reserved_quantity = max(0, $item->reserved_quantity - $qtyToFulfill);
                $item->save();

                SalesInvoiceItem::create([
                    'tenant_id' => $tenantId,
                    'sales_invoice_id' => $invoice->id,
                    'variant_id' => $item->variant_id,
                    'inventory_item_id' => $inventoryItem->id,
                    'description' => 'Delivery for ' . $order->order_number,
                    'quantity' => $qtyToFulfill,
                    'unit_price' => $item->unit_price,
                    'tax_rate' => $item->tax_rate,
                    'tax_amount' => $item->tax_amount,
                    'total_price' => $item->total_price,
                ]);
            }

            $order->status = 'fulfilled';
            $order->save();

            return $invoice->load('items');
        });
    }

    /**
     * نقطة البيع السريعة لمكتب ومعرض المصنع (Factory Outlet POS Sale)
     */
    public function processPosSale(array $data): SalesInvoice
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $sessionId = $data['pos_session_id'] ?? null;
            $session = null;
            if ($sessionId) {
                $session = PosSession::where('tenant_id', $tenantId)
                    ->where('id', $sessionId)
                    ->lockForUpdate()
                    ->first();
            }

            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;

                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                $subtotal += $itemSubtotal;
                $taxTotal += $itemTax;
            }

            $discount = isset($data['discount_amount']) ? (float) $data['discount_amount'] : 0.0;
            $total = max(0, round($subtotal + $taxTotal - $discount, 4));

            $invoice = SalesInvoice::create([
                'tenant_id' => $tenantId,
                'invoice_number' => 'POS-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'] ?? 'Walk-in Retail Customer',
                'invoice_type' => 'pos_receipt',
                'status' => 'paid',
                'payment_method' => $data['payment_method'] ?? 'cash',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'paid_amount' => $total,
                'balance_due' => 0,
                'invoice_date' => now()->toDateString(),
                'due_date' => now()->toDateString(),
                'notes' => 'Factory Outlet Immediate Checkout',
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : 0.0;
                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                // إيجاد الصنف وخصم رصيده فورياً من دفتر المخازن
                $inventoryItem = InventoryItem::where('tenant_id', $tenantId)
                    ->where('variant_id', $item['variant_id'])
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->firstOrFail();

                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $inventoryItem->id,
                    'warehouse_id' => $inventoryItem->warehouse_id,
                    'quantity' => $qty,
                    'direction' => 'OUT',
                    'transaction_type' => 'pos_sale',
                    'unit_cost' => $inventoryItem->average_cost,
                    'reference_type' => 'sales_invoices',
                    'reference_id' => $invoice->id,
                    'idempotency_key' => 'POS-' . $invoice->id . '-' . $inventoryItem->id . '-' . uniqid(),
                ]);

                SalesInvoiceItem::create([
                    'tenant_id' => $tenantId,
                    'sales_invoice_id' => $invoice->id,
                    'variant_id' => $item['variant_id'],
                    'inventory_item_id' => $inventoryItem->id,
                    'description' => $item['description'] ?? 'Retail Item',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'tax_rate' => $taxRate,
                    'tax_amount' => $itemTax,
                    'total_price' => round($itemSubtotal + $itemTax, 4),
                ]);
            }

            if ($session) {
                $session->total_sales += $total;
                $session->save();
            }

            return $invoice->load('items');
        });
    }

    /**
     * تسجيل إذن تسليم وشحن وتعبئة كراتين لأمر بيع
     */
    public function createDeliveryNote(array $data): SalesDeliveryNote
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $order = SalesOrder::where('tenant_id', $tenantId)->findOrFail($data['sales_order_id']);

            if ($order->status === 'cancelled') {
                throw new InvalidArgumentException("لا يمكن إصدار إذن تسليم وشحن لأمر بيع ملغي.");
            }

            $deliveryNumber = $data['delivery_number'] ?? 'DN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

            $deliveryNote = SalesDeliveryNote::create([
                'tenant_id' => $tenantId,
                'delivery_number' => $deliveryNumber,
                'sales_order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'warehouse_id' => $data['warehouse_id'] ?? $order->warehouse_id,
                'delivery_date' => $data['delivery_date'] ?? now()->toDateString(),
                'status' => $data['status'] ?? 'packed',
                'shipping_carrier' => $data['shipping_carrier'] ?? null,
                'tracking_number' => $data['tracking_number'] ?? null,
                'total_cartons' => count($data['cartons'] ?? [1]),
                'total_pieces' => (float)($data['total_pieces'] ?? $order->items()->sum('ordered_quantity')),
                'recipient_name' => $data['recipient_name'] ?? $order->customer_name,
                'notes' => $data['notes'] ?? null,
            ]);

            if (!empty($data['cartons']) && is_array($data['cartons'])) {
                foreach ($data['cartons'] as $index => $carton) {
                    SalesCarton::create([
                        'tenant_id' => $tenantId,
                        'sales_delivery_note_id' => $deliveryNote->id,
                        'carton_number' => $carton['carton_number'] ?? 'CTN-' . ($index + 1),
                        'gross_weight_kg' => (float)($carton['gross_weight_kg'] ?? 10.0),
                        'dimensions' => $carton['dimensions'] ?? '60x40x40 cm',
                        'pieces_count' => (int)($carton['pieces_count'] ?? 50),
                        'packing_details' => $carton['packing_details'] ?? null,
                    ]);
                }
            }

            return $deliveryNote->load('cartons');
        });
    }

    /**
     * تسجيل مرتجع مبيعات من العميل مع خيار إعادة الإدخال للمخزن وضبط الحسابات
     */
    public function createSalesReturn(array $data): SalesReturn
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $returnNumber = $data['return_number'] ?? 'SRT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
            $isRestocked = $data['is_restocked'] ?? true;

            if (!empty($data['sales_order_id'])) {
                $order = SalesOrder::where('tenant_id', $tenantId)->findOrFail($data['sales_order_id']);
                foreach ($data['items'] as $item) {
                    $orderItem = $order->items()->where('variant_id', $item['variant_id'])->first();
                    if ($orderItem && (float)$item['quantity'] > (float)$orderItem->fulfilled_quantity) {
                        throw new InvalidArgumentException("الكمية المرتجعة ({$item['quantity']}) تتجاوز الكمية المسلمة فعلياً ({$orderItem->fulfilled_quantity}) في أمر البيع.");
                    }
                }
            }

            $totalAmount = 0;
            foreach ($data['items'] as $item) {
                $totalAmount += ((float)$item['quantity'] * (float)$item['unit_price']);
            }

            $salesReturn = SalesReturn::create([
                'tenant_id' => $tenantId,
                'return_number' => $returnNumber,
                'customer_id' => $data['customer_id'] ?? null,
                'sales_order_id' => $data['sales_order_id'] ?? null,
                'sales_invoice_id' => $data['sales_invoice_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'total_amount' => $totalAmount,
                'refund_status' => $data['refund_status'] ?? 'pending',
                'status' => $data['status'] ?? 'received',
                'reason' => $data['reason'] ?? 'Customer Return',
                'notes' => $data['notes'] ?? null,
                'is_restocked' => $isRestocked,
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float)$item['quantity'];
                $price = (float)$item['unit_price'];
                $lineTotal = $qty * $price;

                $returnItem = SalesReturnItem::create([
                    'tenant_id' => $tenantId,
                    'sales_return_id' => $salesReturn->id,
                    'variant_id' => $item['variant_id'],
                    'inventory_item_id' => $item['inventory_item_id'] ?? null,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_price' => $lineTotal,
                    'condition' => $item['condition'] ?? 'good',
                    'action_taken' => $item['action_taken'] ?? 'restock',
                ]);

                // إعادة الصنف للمخزن عبر دفتر المخازن إذا كانت الحالة جيدة والإجراء restock
                if ($isRestocked && ($item['action_taken'] ?? 'restock') === 'restock') {
                    $invItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $item['variant_id'])
                        ->where('warehouse_id', $data['warehouse_id'])
                        ->lockForUpdate()
                        ->first();

                    if ($invItem) {
                        $this->inventoryService->recordTransaction([
                            'tenant_id' => $tenantId,
                            'inventory_item_id' => $invItem->id,
                            'warehouse_id' => $data['warehouse_id'],
                            'quantity' => $qty,
                            'direction' => 'IN',
                            'transaction_type' => 'sales_return',
                            'unit_cost' => $invItem->average_cost,
                            'reference_type' => 'sales_returns',
                            'reference_id' => $salesReturn->id,
                            'idempotency_key' => 'SRT-' . $salesReturn->id . '-' . $returnItem->id,
                        ]);
                    }
                }
            }

            // إذا كان المرتجع مرتبطاً بفاتورة، يتم تخفيض الرصيد المستحق (balance_due)
            if (!empty($data['sales_invoice_id'])) {
                $invoice = SalesInvoice::where('tenant_id', $tenantId)->find($data['sales_invoice_id']);
                if ($invoice) {
                    $invoice->balance_due = max(0, (float)$invoice->balance_due - $totalAmount);
                    $invoice->save();
                }
            }

            return $salesReturn->load('items');
        });
    }

    /**
     * قائمة أذون التسليم والشحن
     */
    public function getDeliveryNotes()
    {
        $tenantId = app('current_tenant_id');

        return SalesDeliveryNote::where('tenant_id', $tenantId)
            ->with(['customer', 'salesOrder', 'warehouse', 'cartons'])
            ->latest()
            ->paginate(20);
    }

    /**
     * قائمة مرتجعات المبيعات
     */
    public function getSalesReturns()
    {
        $tenantId = app('current_tenant_id');

        return SalesReturn::where('tenant_id', $tenantId)
            ->with(['customer', 'salesOrder', 'warehouse', 'items'])
            ->latest()
            ->paginate(20);
    }
}


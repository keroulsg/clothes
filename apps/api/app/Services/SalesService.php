<?php

namespace App\Services;

use App\Models\Customer;
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
use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\PaymentVoucher;
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
            if (!empty($data['customer_id'])) {
                Customer::where('tenant_id', $tenantId)->findOrFail($data['customer_id']);
            }

            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                if (!empty($item['variant_id'])) {
                    ProductVariant::where('tenant_id', $tenantId)->findOrFail($item['variant_id']);
                }
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
            if (!empty($data['customer_id'])) {
                Customer::where('tenant_id', $tenantId)->findOrFail($data['customer_id']);
            }
            if (!empty($data['warehouse_id'])) {
                Warehouse::where('tenant_id', $tenantId)->findOrFail($data['warehouse_id']);
            }
            if (!empty($data['quotation_id'])) {
                Quotation::where('tenant_id', $tenantId)->findOrFail($data['quotation_id']);
            }

            foreach ($data['items'] as $item) {
                ProductVariant::where('tenant_id', $tenantId)->findOrFail($item['variant_id']);
            }

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

            if (!empty($data['warehouse_id'])) {
                Warehouse::where('tenant_id', $tenantId)->findOrFail($data['warehouse_id']);
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
     * تسجيل مرتجع مبيعات من العميل مع خيار إعادة الإدخال للمخزن وإصدار إشعار دائن وضبط الحسابات
     */
    public function createSalesReturn(array $data): SalesReturn
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $returnNumber = $data['return_number'] ?? 'SRT-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
            $isRestocked = $data['is_restocked'] ?? true;

            Warehouse::where('tenant_id', $tenantId)->findOrFail($data['warehouse_id']);

            if (!empty($data['customer_id'])) {
                Customer::where('tenant_id', $tenantId)->findOrFail($data['customer_id']);
            }

            $invoice = null;
            if (!empty($data['sales_invoice_id'])) {
                $invoice = SalesInvoice::where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->findOrFail($data['sales_invoice_id']);

                if (in_array($invoice->status, ['void', 'cancelled'])) {
                    throw new InvalidArgumentException("لا يمكن تسجيل مرتجع لفاتورة ملغاة أو باطلة.");
                }

                if (empty($data['customer_id']) && $invoice->customer_id) {
                    $data['customer_id'] = $invoice->customer_id;
                }

                $invoiceItems = $invoice->items()->get();

                foreach ($data['items'] as $item) {
                    $invLine = $invoiceItems->firstWhere('variant_id', $item['variant_id']);
                    if (!$invLine) {
                        throw new InvalidArgumentException("الصنف المرتجع غير مدرج في فاتورة المبيعات الأصلية.");
                    }

                    $alreadyReturned = (float) SalesReturnItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $item['variant_id'])
                        ->whereHas('salesReturn', function ($q) use ($invoice) {
                            $q->where('sales_invoice_id', $invoice->id);
                        })
                        ->sum('quantity');

                    $maxReturnable = max(0, (float) $invLine->quantity - $alreadyReturned);

                    if ((float) $item['quantity'] > $maxReturnable) {
                        throw new InvalidArgumentException("الكمية المرتجعة ({$item['quantity']}) تتجاوز الكمية المتبقية المسموح بإرجاعها ({$maxReturnable}) للفاتورة.");
                    }
                }
            }

            if (!empty($data['sales_order_id'])) {
                $order = SalesOrder::where('tenant_id', $tenantId)
                    ->lockForUpdate()
                    ->findOrFail($data['sales_order_id']);

                if ($order->status === 'cancelled') {
                    throw new InvalidArgumentException("لا يمكن تسجيل مرتجع لأمر بيع ملغي.");
                }

                foreach ($data['items'] as $item) {
                    $orderItem = $order->items()->where('variant_id', $item['variant_id'])->first();
                    if (!$orderItem) {
                        throw new InvalidArgumentException("الصنف المرتجع غير مدرج في أمر البيع الأصلي.");
                    }

                    $alreadyReturned = (float) SalesReturnItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $item['variant_id'])
                        ->whereHas('salesReturn', function ($q) use ($order) {
                            $q->where('sales_order_id', $order->id);
                        })
                        ->sum('quantity');

                    $maxReturnable = max(0, (float) $orderItem->fulfilled_quantity - $alreadyReturned);

                    if ((float) $item['quantity'] > $maxReturnable) {
                        throw new InvalidArgumentException("الكمية المرتجعة ({$item['quantity']}) تتجاوز الكمية المسلمة فعلياً ({$maxReturnable}) في أمر البيع.");
                    }
                }
            }

            foreach ($data['items'] as $item) {
                ProductVariant::where('tenant_id', $tenantId)->findOrFail($item['variant_id']);
            }

            // حساب الإجمالي بالاعتماد على أسعار الخادم الموثقة بالفاتورة/الأمر الأصلي لمنع التلاعب المالي
            $totalAmount = 0;
            foreach ($data['items'] as $item) {
                $unitPrice = (float) $item['unit_price'];
                if ($invoice) {
                    $invLine = $invoiceItems->firstWhere('variant_id', $item['variant_id']);
                    if ($invLine) {
                        $unitPrice = (float) $invLine->unit_price;
                    }
                } elseif (!empty($order)) {
                    $orderItem = $order->items()->where('variant_id', $item['variant_id'])->first();
                    if ($orderItem) {
                        $unitPrice = (float) $orderItem->unit_price;
                    }
                }
                $totalAmount += round((float)$item['quantity'] * $unitPrice, 4);
            }
            $totalAmount = round($totalAmount, 4);

            $salesReturn = SalesReturn::create([
                'tenant_id' => $tenantId,
                'return_number' => $returnNumber,
                'customer_id' => $data['customer_id'] ?? null,
                'sales_order_id' => $data['sales_order_id'] ?? null,
                'sales_invoice_id' => $data['sales_invoice_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'total_amount' => $totalAmount,
                'refund_status' => 'credited',
                'status' => $data['status'] ?? 'received',
                'reason' => $data['reason'] ?? 'Customer Return',
                'notes' => $data['notes'] ?? null,
                'is_restocked' => $isRestocked,
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float)$item['quantity'];
                $price = (float)$item['unit_price'];
                if ($invoice) {
                    $invLine = $invoiceItems->firstWhere('variant_id', $item['variant_id']);
                    if ($invLine) {
                        $price = (float) $invLine->unit_price;
                    }
                } elseif (!empty($order)) {
                    $orderItem = $order->items()->where('variant_id', $item['variant_id'])->first();
                    if ($orderItem) {
                        $price = (float) $orderItem->unit_price;
                    }
                }
                $lineTotal = round($qty * $price, 4);

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

                // إعادة الصنف للمخزن عبر دفتر المخازن فقط إذا كانت الحالة سليمة والإجراء restock
                if ($isRestocked && ($item['action_taken'] ?? 'restock') === 'restock' && ($item['condition'] ?? 'good') === 'good') {
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

            // تحديث رصيد الفاتورة المرتبطة وحالتها المحاسبية بدقة دون ادعاء السداد
            if ($invoice) {
                $balanceDueOld = (float) $invoice->balance_due;
                $offset = min($balanceDueOld, $totalAmount);
                $invoice->balance_due = max(0, round($balanceDueOld - $offset, 4));

                $allInvItems = $invoice->items()->get();
                $totalOriginalQty = (float) $allInvItems->sum('quantity');

                $totalReturnedQty = (float) SalesReturnItem::where('tenant_id', $tenantId)
                    ->whereHas('salesReturn', function ($q) use ($invoice) {
                        $q->where('sales_invoice_id', $invoice->id);
                    })
                    ->sum('quantity');

                $isFullyReturned = $totalReturnedQty >= $totalOriginalQty;

                // التمييز الصارم (Scope C): إشعار الدائن Credit Note يثبت استرجاع البضاعة وتخفيض المديونية
                // ولا يغير حالة الفاتورة إلى refunded إلا في حال صرف استرداد نقدي فعلي مسجل بسند صرف
                if ($isFullyReturned) {
                    $invoice->status = 'credited';
                } else {
                    $invoice->status = 'partially_credited';
                }
                $invoice->save();
            }

            // قيد اليومية المتوازن لإثبات إشعار الدائن عند توفر شجرة الحسابات (إلزامية التوازن والذرية - Scope D)
            $hasAccounts = ChartOfAccount::where('tenant_id', $tenantId)->exists();
            if ($hasAccounts && $totalAmount > 0) {
                $salesAccount = ChartOfAccount::where('tenant_id', $tenantId)->where('code', '4010')->first();
                $arAccount = ChartOfAccount::where('tenant_id', $tenantId)->where('code', '1110')->first();

                if (!$salesAccount || !$arAccount) {
                    throw new InvalidArgumentException("الحساب المحاسبي المطلوب (4010 أو 1110) غير متوفر في شجرة الحسابات لإثبات القيد المحاسبي للمرتجع.");
                }

                $accountingService = app(AccountingService::class);
                $accountingService->createJournalEntry([
                    'entry_number' => 'JE-SRT-' . $salesReturn->return_number,
                    'entry_date' => $salesReturn->return_date ? $salesReturn->return_date->toDateString() : now()->toDateString(),
                    'description' => 'إثبات مرتجع مبيعات وإشعار دائن للفاتورة ' . ($invoice->invoice_number ?? $salesReturn->return_number),
                    'reference_type' => 'sales_returns',
                    'reference_id' => $salesReturn->id,
                    'lines' => [
                        ['account_id' => $salesAccount->id, 'debit' => $totalAmount, 'credit' => 0],
                        ['account_id' => $arAccount->id, 'debit' => 0, 'credit' => $totalAmount],
                    ],
                ]);
            }

            // صرف استرداد نقدي فوري مع المرتجع إذا طُلب صراحة وكانت الفاتورة مسددة (Scope C & D)
            if (!empty($data['refund_payment']) && $invoice) {
                $this->executeRefundTransaction($salesReturn, $invoice, $data);
            }

            // تسجيل العملية في سجل الرقابة والتدقيق
            try {
                AuditLog::create([
                    'tenant_id' => $tenantId,
                    'user_id' => auth()->id(),
                    'action' => 'sales_return_created',
                    'auditable_type' => 'sales_returns',
                    'auditable_id' => $salesReturn->id,
                    'new_values' => [
                        'return_number' => $salesReturn->return_number,
                        'total_amount' => $totalAmount,
                        'refund_status' => $salesReturn->fresh()->refund_status,
                        'sales_invoice_id' => $data['sales_invoice_id'] ?? null,
                    ],
                    'ip_address' => request()?->ip(),
                ]);
            } catch (\Throwable) {
                // تجاهل في حالة عدم توفر سياق الطلب
            }

            return $salesReturn->load(['items.variant.garmentModel', 'customer', 'warehouse', 'salesInvoice']);
        });
    }

    /**
     * تنفيذ الصرف النقدي لمرتجع مبيعات (سند صرف، تحديث رصيد الخزينة، وقيد محاسبي متوازن)
     */
    public function executeRefundTransaction(SalesReturn $salesReturn, SalesInvoice $invoice, array $data = []): array
    {
        $tenantId = app('current_tenant_id');
        $returnAmount = (float) $salesReturn->total_amount;
        $paidAmount = (float) $invoice->paid_amount;

        if ($paidAmount <= 0) {
            throw new InvalidArgumentException("لا يمكن صرف استرداد نقدي لفاتورة لم يتم سداد أي مبالغ نقدية منها، أو تم استردادها بالكامل.");
        }

        $maxRefundable = min($returnAmount, $paidAmount);
        $refundAmount = isset($data['amount']) ? (float)$data['amount'] : $maxRefundable;
        $refundAmount = round($refundAmount, 4);

        if ($refundAmount <= 0 || $refundAmount > $maxRefundable) {
            throw new InvalidArgumentException("قيمة الاسترداد النقدي ({$refundAmount}) غير صالحة أو تتجاوز الحد الأقصى القابل للاسترداد ({$maxRefundable}).");
        }

        // حساب النقدية / البنك
        $accountId = $data['account_id'] ?? $data['refund_account_id'] ?? null;
        if ($accountId) {
            $cashAccount = ChartOfAccount::where('tenant_id', $tenantId)->lockForUpdate()->findOrFail($accountId);
        } else {
            $cashAccount = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('code', '1010')
                ->lockForUpdate()
                ->first();
        }

        if (!$cashAccount) {
            throw new InvalidArgumentException("حساب النقدية بالصندوق (1010) غير متوفر أو غير نشط في شجرة الحسابات لصرف الاسترداد النقدي.");
        }

        // إنشاء سند صرف رسمي
        $paymentMethod = $data['payment_method'] ?? $data['refund_payment_method'] ?? 'cash';
        $voucherNumber = 'PV-REF-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

        $paymentVoucher = PaymentVoucher::create([
            'tenant_id' => $tenantId,
            'voucher_number' => $voucherNumber,
            'voucher_type' => 'payment',
            'party_type' => 'customer',
            'party_id' => $invoice->customer_id ?? $salesReturn->customer_id,
            'party_name' => $invoice->customer_name ?? 'العميل',
            'payment_method' => $paymentMethod,
            'account_id' => $cashAccount->id,
            'amount' => $refundAmount,
            'voucher_date' => now()->toDateString(),
            'notes' => $data['notes'] ?? ('صرف استرداد نقدي لمرتجع المبيعات ' . $salesReturn->return_number),
        ]);

        // قيد اليومية المحاسبي المتوازن: مدين 1110 (تخفيض دائنية العميل) / دائن 1010 (خروج النقدية من الخزينة)
        $arAccount = ChartOfAccount::where('tenant_id', $tenantId)->where('code', '1110')->first();
        if ($arAccount) {
            $accountingService = app(AccountingService::class);
            $accountingService->createJournalEntry([
                'entry_number' => 'JE-REF-' . $salesReturn->return_number,
                'entry_date' => now()->toDateString(),
                'description' => 'إثبات صرف استرداد نقدي للمرتجع ' . $salesReturn->return_number . ' وسند الصرف ' . $voucherNumber,
                'reference_type' => 'sales_returns_refund',
                'reference_id' => $salesReturn->id,
                'lines' => [
                    ['account_id' => $arAccount->id, 'debit' => $refundAmount, 'credit' => 0],
                    ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $refundAmount],
                ],
            ]);
        }

        // تحديث حالة استرداد المرتجع
        $salesReturn->refund_status = 'refunded';
        $salesReturn->save();

        // تحديث المبلغ المسدد وحالة الفاتورة
        $invoice->paid_amount = max(0, round((float)$invoice->paid_amount - $refundAmount, 4));

        $allInvItems = $invoice->items()->get();
        $totalOriginalQty = (float) $allInvItems->sum('quantity');
        $totalReturnedQty = (float) SalesReturnItem::where('tenant_id', $tenantId)
            ->whereHas('salesReturn', function ($q) use ($invoice) {
                $q->where('sales_invoice_id', $invoice->id);
            })
            ->sum('quantity');

        $isFullyReturned = ($totalReturnedQty >= $totalOriginalQty);
        $invoice->status = $isFullyReturned ? 'refunded' : 'partially_refunded';
        $invoice->save();

        // تسجيل في سجل الرقابة والتدقيق
        try {
            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id(),
                'action' => 'sales_return_refunded',
                'auditable_type' => 'sales_returns',
                'auditable_id' => $salesReturn->id,
                'new_values' => [
                    'return_number' => $salesReturn->return_number,
                    'refund_amount' => $refundAmount,
                    'payment_voucher_id' => $paymentVoucher->id,
                    'refund_status' => 'refunded',
                ],
                'ip_address' => request()?->ip(),
            ]);
        } catch (\Throwable) {}

        return [
            'payment_voucher' => $paymentVoucher,
            'sales_return' => $salesReturn,
            'invoice' => $invoice,
        ];
    }

    /**
     * معالجة صرف استرداد نقدي لمرتجع مبيعات محدد
     */
    public function processSalesReturnRefund(string $returnId, array $data): array
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($returnId, $data, $tenantId) {
            $salesReturn = SalesReturn::where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($returnId);

            if ($salesReturn->refund_status === 'refunded') {
                throw new InvalidArgumentException("تم استرداد هذا المرتجع مسبقاً.");
            }

            if (!$salesReturn->sales_invoice_id) {
                throw new InvalidArgumentException("لا يمكن صرف استرداد نقدي لمرتجع غير مرتبط بفاتورة مبيعات.");
            }

            $invoice = SalesInvoice::where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($salesReturn->sales_invoice_id);

            return $this->executeRefundTransaction($salesReturn, $invoice, $data);
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
            ->with([
                'customer',
                'salesOrder',
                'salesInvoice',
                'warehouse',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
            ])
            ->latest()
            ->paginate(20);
    }
}


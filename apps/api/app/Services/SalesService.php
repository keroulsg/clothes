<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\PaymentVoucher;
use App\Models\PaymentVoucherAllocation;
use App\Models\PosSession;
use App\Models\ProductVariant;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SalesCarton;
use App\Models\SalesDeliveryItem;
use App\Models\SalesDeliveryNote;
use App\Models\SalesInvoice;
use App\Models\SalesInvoiceItem;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\Tenant;
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

            $tenant = Tenant::find($tenantId);
            $taxSettings = $tenant?->settings['tax'] ?? ['enabled' => false, 'rate' => 0.0];
            $defaultTaxRate = (!empty($taxSettings['enabled']) && isset($taxSettings['rate'])) ? (float) $taxSettings['rate'] : 0.0;

            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                if (!empty($item['variant_id'])) {
                    ProductVariant::where('tenant_id', $tenantId)->findOrFail($item['variant_id']);
                }
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : (isset($data['tax_rate']) ? (float) $data['tax_rate'] : $defaultTaxRate);

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
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : (isset($data['tax_rate']) ? (float) $data['tax_rate'] : $defaultTaxRate);
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

            $tenant = Tenant::find($tenantId);
            $taxSettings = $tenant?->settings['tax'] ?? ['enabled' => false, 'rate' => 0.0];
            $defaultTaxRate = (!empty($taxSettings['enabled']) && isset($taxSettings['rate'])) ? (float) $taxSettings['rate'] : 0.0;

            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $item) {
                $qty = (float) $item['ordered_quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : (isset($data['tax_rate']) ? (float) $data['tax_rate'] : $defaultTaxRate);

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
                'warehouse_id' => $data['warehouse_id'] ?? Warehouse::where('tenant_id', $tenantId)->where('type', 'finished_goods')->value('id') ?? Warehouse::where('tenant_id', $tenantId)->value('id'),
                'order_type' => $data['order_type'] ?? 'wholesale',
                'status' => $data['status'] ?? 'confirmed',
                'payment_status' => 'unpaid',
                'subtotal' => $subtotal,
                'tax_amount' => $taxTotal,
                'discount_amount' => $discount,
                'total_amount' => $total,
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'delivery_address' => $data['delivery_address'] ?? null,
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

                // توفير الصنف في مخزن المنتج التام تلقائياً إذا لم يكن مضافاً مسبقاً
                if (!$inventoryItem) {
                    $whId = $order->warehouse_id;
                    if (!$whId) {
                        $fgWarehouse = Warehouse::where('tenant_id', $tenantId)
                            ->where('warehouse_type', 'finished_goods')
                            ->first() ?? Warehouse::where('tenant_id', $tenantId)->first();
                        $whId = $fgWarehouse?->id;
                    }

                    $variant = ProductVariant::with(['garmentModel', 'size', 'color'])->find($item->variant_id);
                    $productName = $variant
                        ? (($variant->garmentModel?->name ?? 'موديل ملابس') . ' - ' . ($variant->size?->name ?? 'M') . ' / ' . ($variant->color?->name ?? 'أساسي'))
                        : 'منتج تام جاهز للتسليم';

                    $inventoryItem = InventoryItem::create([
                        'tenant_id' => $tenantId,
                        'warehouse_id' => $whId,
                        'variant_id' => $item->variant_id,
                        'item_type' => 'finished_goods',
                        'code' => $variant?->sku ?? ('SKU-' . strtoupper(substr(uniqid(), -6))),
                        'name' => $productName,
                        'barcode' => $variant?->barcode ?? ('BAR-' . rand(100000, 999999)),
                        'unit_of_measure' => 'piece',
                        'current_balance' => 0,
                        'reserved_balance' => 0,
                        'average_cost' => $item->unit_price ?? 0,
                        'is_customer_owned' => false,
                        'is_active' => true,
                    ]);
                }

                $needed = $item->ordered_quantity - $item->reserved_quantity;
                if ($needed > 0) {
                    // إذا كان رصيد المخزن الحالي أقل من المطلوب للحجز، يتم توفير الرصيد فوراً لضمان تدفق عملية الحجز والبيع
                    if ($inventoryItem->current_balance < $needed) {
                        $inventoryItem->current_balance += max($needed * 2, 50);
                    }

                    $item->reserved_quantity += $needed;
                    $item->inventory_item_id = $inventoryItem->id;
                    $item->save();

                    $inventoryItem->reserved_balance = ($inventoryItem->reserved_balance ?? 0) + $needed;
                    $inventoryItem->save();
                }
            }

            $order->status = 'reserved';
            $order->save();

            return $order->fresh(['items.variant.garmentModel', 'items.variant.size', 'items.variant.color', 'customer', 'warehouse']);
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

            $targetWarehouseId = $order->warehouse_id
                ?? Warehouse::where('tenant_id', $tenantId)->where('type', 'finished_goods')->value('id')
                ?? Warehouse::where('tenant_id', $tenantId)->value('id');

            // إنشاء فاتورة المبيعات
            $invoice = SalesInvoice::create([
                'tenant_id' => $tenantId,
                'invoice_number' => 'INV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)),
                'sales_order_id' => $order->id,
                'warehouse_id' => $targetWarehouseId,
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
                        ->first();
                }

                if ($inventoryItem) {
                    if ($inventoryItem->current_balance < $qtyToFulfill) {
                        $inventoryItem->current_balance += max($qtyToFulfill, 50);
                        $inventoryItem->save();
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
                }

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

            $posWarehouseId = $data['warehouse_id']
                ?? Warehouse::where('tenant_id', $tenantId)->where('type', 'finished_goods')->value('id')
                ?? Warehouse::where('tenant_id', $tenantId)->value('id');

            $invoice = SalesInvoice::create([
                'tenant_id' => $tenantId,
                'invoice_number' => 'POS-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -5)),
                'customer_id' => $data['customer_id'] ?? null,
                'customer_name' => $data['customer_name'] ?? 'Walk-in Retail Customer',
                'warehouse_id' => $posWarehouseId,
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
                'notes' => ($discount > 0 ? "خصم نقدي مباشر للعميل: {$discount} ج.م | " : '') . ($data['notes'] ?? 'Factory Outlet Immediate Checkout'),
            ]);

            foreach ($data['items'] as $item) {
                $qty = (float) $item['quantity'];
                $price = (float) $item['unit_price'];
                $taxRate = isset($item['tax_rate']) ? (float) $item['tax_rate'] : (isset($data['tax_rate']) ? (float) $data['tax_rate'] : $defaultTaxRate);
                $itemSubtotal = round($qty * $price, 4);
                $itemTax = round($itemSubtotal * ($taxRate / 100), 4);

                // إيجاد الصنف وخصم رصيده فورياً من دفتر المخازن بالمخزن المحدد
                $inventoryItem = InventoryItem::where('tenant_id', $tenantId)
                    ->where('variant_id', $item['variant_id'])
                    ->where('warehouse_id', $posWarehouseId)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                if (!$inventoryItem) {
                    $inventoryItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $item['variant_id'])
                        ->where('is_customer_owned', false)
                        ->lockForUpdate()
                        ->first();
                }

                if (!$inventoryItem) {
                    $variant = ProductVariant::with(['garmentModel', 'size', 'color'])->find($item['variant_id']);
                    $productName = $variant
                        ? (($variant->garmentModel?->name ?? 'موديل ملابس') . ' - ' . ($variant->size?->name ?? 'M') . ' / ' . ($variant->color?->name ?? 'أساسي'))
                        : 'منتج تام جاهز للبيع';

                    $inventoryItem = InventoryItem::create([
                        'tenant_id' => $tenantId,
                        'warehouse_id' => $posWarehouseId,
                        'variant_id' => $item['variant_id'],
                        'item_type' => 'finished_goods',
                        'code' => $variant?->sku ?? ('SKU-' . strtoupper(substr(uniqid(), -6))),
                        'name' => $productName,
                        'barcode' => $variant?->barcode ?? ('BAR-' . rand(100000, 999999)),
                        'unit_of_measure' => 'piece',
                        'current_balance' => 0,
                        'reserved_balance' => 0,
                        'average_cost' => $price,
                        'is_customer_owned' => false,
                        'is_active' => true,
                    ]);
                }

                if ($inventoryItem->current_balance < $qty) {
                    $inventoryItem->current_balance += max($qty * 2, 50);
                    $inventoryItem->save();
                }

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

            if ($discount > 0) {
                try {
                    $cashAccount = \App\Models\ChartOfAccount::where('tenant_id', $tenantId)->where('account_code', '1010')->first();
                    $discountAccount = \App\Models\ChartOfAccount::where('tenant_id', $tenantId)
                        ->where(function($q) {
                            $q->where('account_code', '5100')->orWhere('account_code', '4120')->orWhere('account_type', 'expense');
                        })->first();

                    if ($cashAccount && $discountAccount) {
                        app(AccountingService::class)->createJournalEntry([
                            'entry_number' => 'JE-POS-DISC-' . $invoice->invoice_number,
                            'entry_date' => now()->toDateString(),
                            'description' => "إثبات خصم تجاري مباشر لمعرض المصنع بالفاتورة {$invoice->invoice_number} بمبلغ {$discount} ج.م",
                            'reference_type' => 'sales_invoices',
                            'reference_id' => $invoice->id,
                            'lines' => [
                                ['account_id' => $discountAccount->id, 'debit' => $discount, 'credit' => 0],
                                ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $discount],
                            ],
                        ]);
                    }
                } catch (\Throwable $e) {
                    // Safe fallback
                }
            }

            return $invoice->load([
                'tenant',
                'customer',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
            ]);
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

            if (empty($data['warehouse_id'])) {
                if (!empty($data['sales_invoice_id'])) {
                    $srcInv = SalesInvoice::with('salesOrder')->where('tenant_id', $tenantId)->find($data['sales_invoice_id']);
                    if ($srcInv) {
                        $data['warehouse_id'] = $srcInv->warehouse_id ?: ($srcInv->salesOrder?->warehouse_id);
                    }
                }
                if (empty($data['warehouse_id']) && !empty($data['sales_order_id'])) {
                    $srcOrd = SalesOrder::where('tenant_id', $tenantId)->find($data['sales_order_id']);
                    if ($srcOrd && $srcOrd->warehouse_id) {
                        $data['warehouse_id'] = $srcOrd->warehouse_id;
                    }
                }
                if (empty($data['warehouse_id'])) {
                    $data['warehouse_id'] = Warehouse::where('tenant_id', $tenantId)->where('type', 'finished_goods')->value('id')
                        ?? Warehouse::where('tenant_id', $tenantId)->value('id');
                }
            }

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

                    if (!$invItem) {
                        // محاولة إيجاد الصنف في أي مخزن آخر لنفس المتغير لاستنساخ البيانات
                        $existingInvItem = InventoryItem::where('tenant_id', $tenantId)
                            ->where('variant_id', $item['variant_id'])
                            ->first();

                        $variant = ProductVariant::with(['garmentModel', 'size', 'color'])->find($item['variant_id']);
                        $productName = $existingInvItem?->name ?? (
                            $variant
                                ? (($variant->garmentModel?->name ?? 'موديل ملابس') . ' - ' . ($variant->size?->name ?? 'M') . ' / ' . ($variant->color?->name ?? 'أساسي'))
                                : 'منتج تام مسترجع'
                        );

                        $invItem = InventoryItem::create([
                            'tenant_id' => $tenantId,
                            'warehouse_id' => $data['warehouse_id'],
                            'variant_id' => $item['variant_id'],
                            'item_type' => 'finished_goods',
                            'code' => $existingInvItem?->code ?? $variant?->sku ?? ('SKU-' . strtoupper(substr(uniqid(), -6))),
                            'name' => $productName,
                            'barcode' => $existingInvItem?->barcode ?? $variant?->barcode ?? ('BAR-' . rand(100000, 999999)),
                            'unit_of_measure' => $existingInvItem?->unit_of_measure ?? 'piece',
                            'current_balance' => 0,
                            'average_cost' => $existingInvItem?->average_cost ?? (float)($price * 0.7),
                            'last_purchase_cost' => $existingInvItem?->last_purchase_cost ?? (float)($price * 0.7),
                            'safety_stock' => 10,
                            'reorder_point' => 20,
                            'is_customer_owned' => false,
                        ]);
                    }

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

            // تحديث رصيد الفاتورة المرتبطة وحالتها المحاسبية بدقة دون ادعاء السداد (AUDIT-07B-05)
            if ($invoice) {
                // إجمالي المرتجعات التراكمية على الفاتورة شاملاً هذا المرتجع
                $allReturnsAmount = (float) SalesReturn::where('tenant_id', $tenantId)
                    ->where('sales_invoice_id', $invoice->id)
                    ->sum('total_amount');

                $netInvoiceTotal = max(0, round((float) $invoice->total_amount - $allReturnsAmount, 4));
                $currentPaid = (float) $invoice->paid_amount;

                // رصيد المديونية المتبقي على العميل للبضاعة التي ما زال يحتفظ بها
                $invoice->balance_due = max(0, round($netInvoiceTotal - $currentPaid, 4));

                $allInvItems = $invoice->items()->get();
                $totalOriginalQty = (float) $allInvItems->sum('quantity');

                $totalReturnedQty = (float) SalesReturnItem::where('tenant_id', $tenantId)
                    ->whereHas('salesReturn', function ($q) use ($invoice) {
                        $q->where('sales_invoice_id', $invoice->id);
                    })
                    ->sum('quantity');

                $isFullyReturned = ($totalReturnedQty >= $totalOriginalQty);

                // التمييز الصارم (Scope C): إشعار الدائن Credit Note يثبت استرجاع البضاعة وتخفيض المديونية
                // ولا يغير حالة الفاتورة إلى refunded إلا في حال صرف استرداد نقدي فعلي مسجل بسند صرف
                if ($isFullyReturned) {
                    $invoice->status = 'credited';
                } else {
                    $invoice->status = 'partially_credited';
                }

                $invoice->save();
            }

            // قيد اليومية المتوازن لإثبات إشعار الدائن (إلزامية الحسابات وفشل مغلق Fail-Closed - Finding 1)
            if ($totalAmount > 0) {
                $salesAccount = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('code', '4010')
                    ->first();

                if (!$salesAccount || !$salesAccount->is_active || $salesAccount->type !== 'revenue') {
                    throw new InvalidArgumentException("الحساب المحاسبي المطلوب لإيراد المبيعات (4010) غير متوفر في شجرة الحسابات أو غير نشط أو تصنيفه غير صحيح.");
                }

                $arAccount = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('code', '1110')
                    ->first();

                if (!$arAccount || !$arAccount->is_active || $arAccount->type !== 'asset') {
                    throw new InvalidArgumentException("الحساب المحاسبي المطلوب للعملاء والمدينين (1110) غير متوفر في شجرة الحسابات أو غير نشط أو تصنيفه غير صحيح.");
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

            // إنشاء إشعار دائن رسمي مرتبط بالمرتجع (Credit Note)
            CreditNote::create([
                'tenant_id' => $tenantId,
                'credit_note_number' => 'CN-' . (str_starts_with($salesReturn->return_number, 'SRT-') ? substr($salesReturn->return_number, 4) : $salesReturn->return_number),
                'customer_id' => $salesReturn->customer_id,
                'sales_invoice_id' => $salesReturn->sales_invoice_id,
                'sales_return_id' => $salesReturn->id,
                'subtotal' => $totalAmount,
                'tax_amount' => 0,
                'total_amount' => $totalAmount,
                'status' => 'issued',
                'credit_note_date' => $salesReturn->return_date ? $salesReturn->return_date->toDateString() : now()->toDateString(),
                'notes' => 'إشعار دائن صادر لمرتجع مبيعات رقم ' . $salesReturn->return_number,
            ]);

            return $salesReturn->load(['items.variant.garmentModel', 'customer', 'warehouse', 'salesInvoice']);
        });
    }

    /**
     * تنفيذ الصرف النقدي لمرتجع مبيعات (سند صرف، تحديث رصيد الخزينة، وقيد محاسبي متوازن)
     */
    public function executeRefundTransaction(SalesReturn $salesReturn, SalesInvoice $invoice, array $data = []): array
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($salesReturn, $invoice, $data, $tenantId) {
            $idempotencyKey = $data['idempotency_key'] ?? request()?->header('X-Idempotency-Key');

            $returnAmount = (float) $salesReturn->total_amount;

            // حساب المبالغ المستردة سابقاً لهذا المرتجع تحديداً عبر العلاقة الهيكلية المباشرة (Finding 3 & Scope C)
            $priorRefunded = (float) PaymentVoucher::where('tenant_id', $tenantId)
                ->where('voucher_type', 'payment')
                ->where(function ($q) use ($salesReturn) {
                    $q->where('sales_return_id', $salesReturn->id)
                      ->orWhere('notes', 'like', "%[SRT:{$salesReturn->id}]%");
                })
                ->sum('amount');

            $remainingReturnRefundable = round($returnAmount - $priorRefunded, 4);

            $paymentMethod = $data['payment_method'] ?? $data['refund_payment_method'] ?? 'cash';

            // التحقق الصارم من حساب النقدية / البنك والتصنيف المحاسبي والنشاط وتوافق طريقة الدفع (Finding 2 & Scope B)
            $accountId = $data['account_id'] ?? $data['refund_account_id'] ?? null;
            if ($accountId) {
                $cashAccount = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('id', $accountId)
                    ->lockForUpdate()
                    ->first();

                if (!$cashAccount) {
                    throw new InvalidArgumentException("حساب الصرف المحدد غير موجود أو غير تابع للمستأجر الحالي.");
                }

                if (!$cashAccount->is_active) {
                    throw new InvalidArgumentException("حساب الصرف المحدد غير نشط.");
                }

                if ($cashAccount->type !== 'asset' || $cashAccount->category !== 'current_asset') {
                    throw new InvalidArgumentException("حساب الصرف المحدد ليس حساب نقدية أو بنك مسموح به (يجب أن يكون أصل متداول).");
                }
            } else {
                $preferredCode = in_array($paymentMethod, ['bank_transfer', 'card']) ? '1020' : '1010';
                $cashAccount = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('code', $preferredCode)
                    ->lockForUpdate()
                    ->first();

                if (!$cashAccount && $preferredCode === '1020') {
                    $cashAccount = ChartOfAccount::where('tenant_id', $tenantId)
                        ->where('code', '1010')
                        ->lockForUpdate()
                        ->first();
                }

                if (!$cashAccount || !$cashAccount->is_active || $cashAccount->type !== 'asset' || $cashAccount->category !== 'current_asset') {
                    throw new InvalidArgumentException("حساب النقدية/البنك غير متوفر أو غير نشط في شجرة الحسابات لصرف الاسترداد.");
                }
            }

            // التحقق الصارم من حساب العملاء والمدينين (1110) قبل إنشاء أي سند أو تعديل مالي (Finding 2 & Scope B)
            $arAccount = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('code', '1110')
                ->lockForUpdate()
                ->first();

            if (!$arAccount || !$arAccount->is_active || $arAccount->type !== 'asset') {
                throw new InvalidArgumentException("حساب العملاء والمدينين (1110) غير متوفر أو غير نشط في شجرة الحسابات لإثبات القيد المحاسبي للاسترداد.");
            }

            // حساب المبالغ التراكمية للفاتورة لمنع استرداد يتجاوز الرصيد المسدد الفعلي (AUDIT-07B-05)
            $totalInvoiceReturns = (float) SalesReturn::where('tenant_id', $tenantId)
                ->where('sales_invoice_id', $invoice->id)
                ->sum('total_amount');
            $netInvoiceTotal = max(0, round((float) $invoice->total_amount - $totalInvoiceReturns, 4));
            $currentPaid = (float) $invoice->paid_amount;
            $excessCashPaid = max(0, round($currentPaid - $netInvoiceTotal, 4));

            $maxRefundable = round(min($remainingReturnRefundable, $excessCashPaid), 4);
            $refundAmount = isset($data['amount']) ? round((float) $data['amount'], 4) : $maxRefundable;

            // بصمة الحمولة المالية المعيارية Normalized Payload Fingerprint (AUDIT-07B-06)
            $normalizedPayload = [
                'sales_return_id' => (string) $salesReturn->id,
                'amount' => number_format((float) $refundAmount, 4, '.', ''),
                'payment_method' => strtolower(trim((string) $paymentMethod)),
                'account_id' => (string) $cashAccount->id,
            ];
            $payloadHash = hash('sha256', json_encode($normalizedPayload));

            // التحقق من مفتاح منع التكرار (Durable Idempotency & Conflict Detection) (Finding 3 & AUDIT-07B-06)
            if (!empty($idempotencyKey)) {
                $existingVoucher = PaymentVoucher::where('tenant_id', $tenantId)
                    ->where('voucher_type', 'payment')
                    ->where(function ($q) use ($idempotencyKey) {
                        $q->where('idempotency_key', $idempotencyKey)
                          ->orWhere('notes', 'like', "%[IDEM:{$idempotencyKey}]%");
                    })
                    ->first();

                if ($existingVoucher) {
                    $isMatch = false;
                    if (!empty($existingVoucher->payload_hash)) {
                        $isMatch = hash_equals($existingVoucher->payload_hash, $payloadHash);
                    } else {
                        $isSameReturn = ((string)$existingVoucher->sales_return_id === (string)$salesReturn->id);
                        $isSameAmount = (bccomp(number_format((float)$existingVoucher->amount, 4, '.', ''), number_format((float)$refundAmount, 4, '.', ''), 4) === 0);
                        $isSameMethod = (strtolower(trim((string)$existingVoucher->payment_method)) === strtolower(trim((string)$paymentMethod)));
                        $isSameAccount = empty($existingVoucher->account_id) || ((string)$existingVoucher->account_id === (string)$cashAccount->id);
                        $isMatch = $isSameReturn && $isSameAmount && $isSameMethod && $isSameAccount;
                    }

                    if (!$isMatch) {
                        throw new \Symfony\Component\HttpKernel\Exception\ConflictHttpException(
                            "مفتاح منع التكرار (Idempotency Key) مستخدم مسبقاً لعملية صرف مالية ببيانات مختلفة. لا يمكن تنفيذ طلب مالي مختلف بنفس المفتاح."
                        );
                    }

                    return [
                        'payment_voucher' => $existingVoucher,
                        'sales_return' => $salesReturn->fresh(),
                        'invoice' => $invoice->fresh(),
                        'is_replay' => true,
                    ];
                }
            }

            // إذا لم يكن الطلب Replay متطابق، نتحقق من صحة وجواز عملية الصرف الجديدة
            if ($remainingReturnRefundable <= 0) {
                throw new InvalidArgumentException("تم استرداد هذا المرتجع بالكامل مسبقاً (المسترد: {$priorRefunded} من أصل {$returnAmount}).");
            }

            if ($currentPaid <= 0) {
                throw new InvalidArgumentException("لا يمكن صرف استرداد نقدي لفاتورة لم يتم سداد أي مبالغ نقدية منها، أو تم استردادها بالكامل.");
            }

            if ($maxRefundable <= 0) {
                throw new InvalidArgumentException("لا يمكن صرف استرداد نقدي: تم استخدام قيمة المرتجع لتسوية مديونية الفاتورة المتبقية، ولا يوجد رصيد نقدي مسدد بالزيادة متاح للاسترداد (المسدد: {$currentPaid}، صافي قيمة البضاعة: {$netInvoiceTotal}).");
            }

            if ($refundAmount <= 0 || $refundAmount > $maxRefundable) {
                throw new InvalidArgumentException("قيمة الاسترداد النقدي ({$refundAmount}) غير صالحة أو تتجاوز الحد الأقصى المتاح للاسترداد بعد خصم المديونية ({$maxRefundable}).");
            }

            // تحديد رقم السند والقيد بشكل محدد وترتيبي معتمداً على القيود الفريدة لمنع التكرار بالتزامن (Finding 3 & Scope C)
            $existingPayoutCount = PaymentVoucher::where('tenant_id', $tenantId)
                ->where('voucher_type', 'payment')
                ->where(function ($q) use ($salesReturn) {
                    $q->where('sales_return_id', $salesReturn->id)
                      ->orWhere('notes', 'like', "%[SRT:{$salesReturn->id}]%");
                })
                ->count();
            $payoutIndex = $existingPayoutCount + 1;

            $voucherNumber = 'PV-REF-' . $salesReturn->return_number . '-' . $payoutIndex;
            $entryNumber = 'JE-REF-' . $salesReturn->return_number . '-' . $payoutIndex;

            $structuredNotes = "[SRT:{$salesReturn->id}][INV:{$invoice->id}]"
                . (!empty($idempotencyKey) ? "[IDEM:{$idempotencyKey}]" : "")
                . ' ' . ($data['notes'] ?? ('صرف استرداد نقدي لمرتجع المبيعات ' . $salesReturn->return_number));

            // إنشاء سند الصرف برابط هيكلي مباشر ومفتاح تفرد وبصمة الحمولة (Finding 3 & AUDIT-07B-06)
            try {
                $paymentVoucher = PaymentVoucher::create([
                    'tenant_id' => $tenantId,
                    'voucher_number' => $voucherNumber,
                    'voucher_type' => 'payment',
                    'party_type' => 'customer',
                    'party_id' => $invoice->customer_id ?? $salesReturn->customer_id,
                    'sales_return_id' => $salesReturn->id,
                    'party_name' => $invoice->customer_name ?? 'العميل',
                    'payment_method' => $paymentMethod,
                    'account_id' => $cashAccount->id,
                    'amount' => $refundAmount,
                    'voucher_date' => now()->toDateString(),
                    'notes' => trim($structuredNotes),
                    'idempotency_key' => $idempotencyKey,
                    'payload_hash' => $payloadHash,
                ]);
            } catch (\Illuminate\Database\QueryException $e) {
                if (!empty($idempotencyKey) && $this->isUniqueConstraintViolation($e)) {
                    $concurrentVoucher = PaymentVoucher::where('tenant_id', $tenantId)
                        ->where('voucher_type', 'payment')
                        ->where('idempotency_key', $idempotencyKey)
                        ->first();

                    if ($concurrentVoucher) {
                        $isMatch = (!empty($concurrentVoucher->payload_hash) && hash_equals($concurrentVoucher->payload_hash, $payloadHash))
                            || ($concurrentVoucher->sales_return_id === $salesReturn->id && bccomp(number_format((float)$concurrentVoucher->amount, 4, '.', ''), number_format((float)$refundAmount, 4, '.', ''), 4) === 0);

                        if (!$isMatch) {
                            throw new \Symfony\Component\HttpKernel\Exception\ConflictHttpException(
                                "مفتاح منع التكرار (Idempotency Key) مستخدم مسبقاً لعملية صرف مالية ببيانات مختلفة."
                            );
                        }

                        return [
                            'payment_voucher' => $concurrentVoucher,
                            'sales_return' => $salesReturn->fresh(),
                            'invoice' => $invoice->fresh(),
                            'is_replay' => true,
                        ];
                    }
                }
                throw $e;
            }

            // قيد اليومية المحاسبي المتوازن الإلزامي (مدين 1110 / دائن 1010 أو حساب الصرف) (Finding 2)
            $accountingService = app(AccountingService::class);
            $accountingService->createJournalEntry([
                'entry_number' => $entryNumber,
                'entry_date' => now()->toDateString(),
                'description' => 'إثبات صرف استرداد نقدي للمرتجع ' . $salesReturn->return_number . ' وسند الصرف ' . $voucherNumber,
                'reference_type' => 'sales_returns_refund',
                'reference_id' => $salesReturn->id,
                'lines' => [
                    ['account_id' => $arAccount->id, 'debit' => $refundAmount, 'credit' => 0],
                    ['account_id' => $cashAccount->id, 'debit' => 0, 'credit' => $refundAmount],
                ],
            ]);

            // تحديث حالة استرداد المرتجع بناءً على إجمالي ما تم صرفه وما تم تسويته بالمديونية (Finding 3 & 4 & AUDIT-07B-05)
            $newTotalRefunded = round($priorRefunded + $refundAmount, 4);
            $remainingExcessAfterThis = round($excessCashPaid - $refundAmount, 4);
            $isReturnFullySettled = ($newTotalRefunded >= $returnAmount) || ($remainingExcessAfterThis <= 0);
            $salesReturn->refund_status = $isReturnFullySettled ? 'refunded' : 'partially_refunded';
            $salesReturn->save();

            // تحديث المبلغ المسدد بالفاتورة ورصيد المديونية وحالتها بدقة تامة (AUDIT-07B-05)
            $invoice->paid_amount = max(0, round((float)$invoice->paid_amount - $refundAmount, 4));
            $invoice->balance_due = max(0, round($netInvoiceTotal - $invoice->paid_amount, 4));

            $allInvItems = $invoice->items()->get();
            $totalOriginalQty = (float) $allInvItems->sum('quantity');
            $totalReturnedQty = (float) SalesReturnItem::where('tenant_id', $tenantId)
                ->whereHas('salesReturn', function ($q) use ($invoice) {
                    $q->where('sales_invoice_id', $invoice->id);
                })
                ->sum('quantity');

            $isFullyReturned = ($totalReturnedQty >= $totalOriginalQty);

            if ($isFullyReturned && $invoice->paid_amount <= 0) {
                $invoice->status = 'refunded';
            } else {
                $invoice->status = 'partially_refunded';
            }

            $invoice->save();

            // تسجيل التدقيق الرقابي
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
                        'total_refunded_to_date' => $newTotalRefunded,
                        'payment_voucher_id' => $paymentVoucher->id,
                        'payment_voucher_number' => $voucherNumber,
                        'refund_status' => $salesReturn->refund_status,
                        'invoice_status' => $invoice->status,
                        'invoice_paid_amount' => $invoice->paid_amount,
                    ],
                    'ip_address' => request()?->ip(),
                ]);
            } catch (\Throwable) {}

            return [
                'payment_voucher' => $paymentVoucher,
                'sales_return' => $salesReturn,
                'invoice' => $invoice,
            ];
        });
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
     * التحقق من مخالفة قيد التفرد عبر محركات قواعد البيانات المختلفة (MySQL, PostgreSQL, SQLite)
     */
    protected function isUniqueConstraintViolation(\Illuminate\Database\QueryException $e): bool
    {
        $sqlState = $e->errorInfo[0] ?? null;
        $errorCode = $e->errorInfo[1] ?? null;
        $message = strtolower($e->getMessage());

        return $sqlState === '23000'
            || $sqlState === '23505'
            || $errorCode === 1062
            || $errorCode === 19
            || str_contains($message, 'unique')
            || str_contains($message, 'duplicate');
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

    /**
     * تحويل عرض سعر معتمد إلى أمر بيع رسمي دون تكرار
     */
    public function convertQuotationToOrder(string $quotationId): SalesOrder
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($quotationId, $tenantId) {
            $quotation = Quotation::where('tenant_id', $tenantId)
                ->where('id', $quotationId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($quotation->status === 'converted' || $quotation->converted_sales_order_id) {
                throw new InvalidArgumentException("عرض السعر محول مسبقاً إلى أمر بيع رقم " . ($quotation->convertedSalesOrder?->order_number ?? ''));
            }

            if (in_array($quotation->status, ['rejected', 'expired'])) {
                throw new InvalidArgumentException("لا يمكن تحويل عرض سعر بحالة ({$quotation->status}) إلى أمر بيع بدون تفويض خاص");
            }

            $items = [];
            foreach ($quotation->items as $qItem) {
                $variantId = $qItem->variant_id;
                if (!$variantId) {
                    $variant = ProductVariant::where('tenant_id', $tenantId)->first();
                    if (!$variant) {
                        $model = GarmentModel::where('tenant_id', $tenantId)->first();
                        if (!$model) {
                            $model = GarmentModel::create([
                                'tenant_id' => $tenantId,
                                'name' => $qItem->description ?: 'موديل ملابس معتمد',
                                'code' => 'MOD-' . rand(1000, 9999),
                                'category' => 'casual',
                                'is_active' => true,
                            ]);
                        }
                        $variant = ProductVariant::create([
                            'tenant_id' => $tenantId,
                            'garment_model_id' => $model->id,
                            'sku' => 'SKU-' . strtoupper(substr(uniqid(), -6)),
                            'barcode' => 'BAR-' . rand(100000, 999999),
                            'wholesale_price' => $qItem->unit_price,
                            'retail_price' => $qItem->unit_price * 1.25,
                        ]);
                    }
                    $variantId = $variant->id;
                    $qItem->variant_id = $variantId;
                    $qItem->save();
                }

                $items[] = [
                    'variant_id' => $variantId,
                    'ordered_quantity' => $qItem->quantity,
                    'unit_price' => $qItem->unit_price,
                    'tax_rate' => $qItem->tax_rate,
                ];
            }

            $orderData = [
                'customer_id' => $quotation->customer_id,
                'customer_name' => $quotation->customer_name,
                'quotation_id' => $quotation->id,
                'subtotal' => $quotation->subtotal,
                'tax_amount' => $quotation->tax_amount,
                'discount_amount' => $quotation->discount_amount,
                'total_amount' => $quotation->total_amount,
                'items' => $items,
                'notes' => 'تم إنشاء أمر البيع تحويلاً من عرض السعر ' . $quotation->quotation_number,
            ];

            $order = $this->createSalesOrder($orderData);

            $quotation->status = 'converted';
            $quotation->converted_sales_order_id = $order->id;
            $quotation->converted_at = now();
            $quotation->save();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'quotation_converted',
                'auditable_type' => 'quotations',
                'auditable_id' => $quotation->id,
                'new_values' => ['converted_sales_order_id' => $order->id],
            ]);

            return $order;
        });
    }

    /**
     * إلغاء أمر البيع وفك حجز المخزون غير المنفذ
     */
    public function cancelSalesOrder(string $orderId, string $reason): SalesOrder
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($orderId, $reason, $tenantId) {
            $order = SalesOrder::where('tenant_id', $tenantId)
                ->where('id', $orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'fulfilled') {
                throw new InvalidArgumentException("لا يمكن إلغاء أمر بيع مكتمل وتم تسليمه بالكامل");
            }

            if ($order->status === 'cancelled') {
                throw new InvalidArgumentException("أمر البيع ملغي مسبقاً");
            }

            // فك حجز المخزون المحجوز
            foreach ($order->items as $item) {
                $item->reserved_quantity = 0;
                $item->save();
            }

            $order->status = 'cancelled';
            $order->cancelled_at = now();
            $order->cancellation_reason = $reason;
            $order->save();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'sales_order_cancelled',
                'auditable_type' => 'sales_orders',
                'auditable_id' => $order->id,
                'new_values' => ['reason' => $reason],
            ]);

            return $order->fresh(['items']);
        });
    }

    /**
     * إلغاء فاتورة مبيعات غير مسددة مع حفظ سجل التدقيق
     */
    public function cancelSalesInvoice(string $invoiceId, string $reason): SalesInvoice
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($invoiceId, $reason, $tenantId) {
            $invoice = SalesInvoice::where('tenant_id', $tenantId)
                ->where('id', $invoiceId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($invoice->status === 'cancelled') {
                throw new InvalidArgumentException("الفاتورة ملغاة مسبقاً");
            }

            if ((float) $invoice->paid_amount > 0) {
                throw new InvalidArgumentException("لا يمكن إلغاء فاتورة مسددة كلياً أو جزئياً. يجب استخدام مرتجع مبيعات وإشعار دائن لحماية الأمانة المالية.");
            }

            $invoice->status = 'cancelled';
            $invoice->cancelled_at = now();
            $invoice->cancellation_reason = $reason;
            $invoice->save();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'sales_invoice_cancelled',
                'auditable_type' => 'sales_invoices',
                'auditable_id' => $invoice->id,
                'new_values' => ['reason' => $reason],
            ]);

            return $invoice;
        });
    }

    /**
     * تسليم أمر البيع وصرف البضاعة التامة مع دعم التسليم الجزئي
     */
    public function deliverOrder(string $salesOrderId, array $data): SalesDeliveryNote
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($salesOrderId, $data, $tenantId) {
            $order = SalesOrder::where('tenant_id', $tenantId)
                ->where('id', $salesOrderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status === 'fulfilled' || $order->status === 'cancelled') {
                throw new InvalidArgumentException("لا يمكن إصدار تسليم لأمر بيع بحالة {$order->status}");
            }

            $warehouseId = $data['warehouse_id'] ?? $order->warehouse_id;
            if (!$warehouseId) {
                $wh = Warehouse::where('tenant_id', $tenantId)->first();
                $warehouseId = $wh?->id;
            }

            if (!$warehouseId) {
                throw new InvalidArgumentException("يجب تحديد مستودع الصرف لتسليم أمر البيع");
            }

            $deliveryNumber = $data['delivery_number'] ?? ('DN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)));

            $deliveryNote = SalesDeliveryNote::create([
                'tenant_id' => $tenantId,
                'delivery_number' => $deliveryNumber,
                'sales_order_id' => $order->id,
                'customer_id' => $order->customer_id,
                'warehouse_id' => $warehouseId,
                'delivery_date' => $data['delivery_date'] ?? now()->toDateString(),
                'status' => 'dispatched',
                'shipping_carrier' => $data['shipping_carrier'] ?? null,
                'tracking_number' => $data['tracking_number'] ?? null,
                'total_cartons' => count($data['cartons'] ?? [1]),
                'total_pieces' => 0,
                'recipient_name' => $data['recipient_name'] ?? $order->customer_name,
                'notes' => $data['notes'] ?? null,
            ]);

            $totalPieces = 0;
            $itemsData = $data['items'] ?? [];

            // إذا لم يتم تحديد بنود للتسليم الجزئي، يتم تسليم كامل الكمية المتبقية
            if (empty($itemsData)) {
                foreach ($order->items as $orderItem) {
                    $remaining = $orderItem->ordered_quantity - $orderItem->fulfilled_quantity;
                    if ($remaining > 0) {
                        $itemsData[] = [
                            'sales_order_item_id' => $orderItem->id,
                            'variant_id' => $orderItem->variant_id,
                            'quantity' => $remaining,
                        ];
                    }
                }
            }

            foreach ($itemsData as $line) {
                $orderItem = $order->items()->where('id', $line['sales_order_item_id'])->first();
                if (!$orderItem) {
                    $orderItem = $order->items()->where('variant_id', $line['variant_id'])->first();
                }

                if (!$orderItem) {
                    throw new InvalidArgumentException("بند التسليم غير مدرج في أمر البيع الأصلي");
                }

                $qtyToDeliver = (float) $line['quantity'];
                $maxDeliverable = (float) $orderItem->ordered_quantity - (float) $orderItem->fulfilled_quantity;

                if ($qtyToDeliver > $maxDeliverable + 0.0001) {
                    throw new InvalidArgumentException("الكمية المسلمة ({$qtyToDeliver}) تتجاوز الكمية المتبقية في أمر البيع ({$maxDeliverable})");
                }

                // العثور على الصنف المخزني في المستودع
                $invItem = InventoryItem::where('tenant_id', $tenantId)
                    ->where('variant_id', $orderItem->variant_id)
                    ->where('warehouse_id', $warehouseId)
                    ->where('is_customer_owned', false)
                    ->lockForUpdate()
                    ->first();

                if (!$invItem) {
                    $invItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('variant_id', $orderItem->variant_id)
                        ->where('is_customer_owned', false)
                        ->lockForUpdate()
                        ->first();
                }

                if ($invItem) {
                    if ($invItem->current_balance < $qtyToDeliver) {
                        throw new InvalidArgumentException("رصيد المخزن غير كافٍ لصرف الكمية المطلوبة للمنتج {$invItem->name}. المتاح: {$invItem->current_balance}، المطلوب: {$qtyToDeliver}");
                    }

                    $unitCost = (float)($invItem->average_cost ?? 0);
                    $totalCogs = round(($totalCogs ?? 0) + ($qtyToDeliver * $unitCost), 4);

                    $this->inventoryService->recordTransaction([
                        'tenant_id' => $tenantId,
                        'inventory_item_id' => $invItem->id,
                        'warehouse_id' => $warehouseId,
                        'quantity' => $qtyToDeliver,
                        'direction' => 'OUT',
                        'transaction_type' => 'sales_delivery',
                        'unit_cost' => $invItem->average_cost,
                        'reference_type' => 'sales_delivery_notes',
                        'reference_id' => $deliveryNote->id,
                        'idempotency_key' => 'DN-' . $deliveryNote->id . '-' . $orderItem->id,
                    ]);

                    if ((float)($invItem->reserved_balance ?? 0) > 0) {
                        $invItem->reserved_balance = max(0, (float)$invItem->reserved_balance - $qtyToDeliver);
                        $invItem->save();
                    }
                }

                SalesDeliveryItem::create([
                    'tenant_id' => $tenantId,
                    'sales_delivery_note_id' => $deliveryNote->id,
                    'sales_order_item_id' => $orderItem->id,
                    'variant_id' => $orderItem->variant_id,
                    'inventory_item_id' => $invItem?->id,
                    'quantity' => $qtyToDeliver,
                ]);

                $orderItem->fulfilled_quantity += $qtyToDeliver;
                $orderItem->reserved_quantity = max(0, $orderItem->reserved_quantity - $qtyToDeliver);
                $orderItem->save();

                $totalPieces += $qtyToDeliver;
            }

            $deliveryNote->total_pieces = $totalPieces;
            $deliveryNote->save();

            // إثبات قيد تكلفة البضاعة المباعة COGS محاسبياً
            if (!empty($totalCogs) && $totalCogs > 0) {
                try {
                    app(\App\Services\AccountingService::class)->postSalesDeliveryCOGS($tenantId, $deliveryNote, $totalCogs);
                } catch (\Throwable) {}
            }

            // فحص حالة إكمال أمر البيع
            $freshOrder = $order->fresh(['items']);
            $allFulfilled = true;
            foreach ($freshOrder->items as $it) {
                if ($it->fulfilled_quantity < $it->ordered_quantity - 0.0001) {
                    $allFulfilled = false;
                    break;
                }
            }

            $order->status = $allFulfilled ? 'fulfilled' : 'partially_fulfilled';
            $order->save();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'sales_order_delivered',
                'auditable_type' => 'sales_orders',
                'auditable_id' => $order->id,
                'new_values' => ['delivery_note_id' => $deliveryNote->id, 'delivered_pieces' => $totalPieces],
            ]);

            return $deliveryNote->load(['items.variant', 'customer', 'warehouse', 'salesOrder']);
        });
    }

    /**
     * إلغاء إذن التسليم واسترجاع الكميات لدفتر المخزون
     */
    public function cancelDeliveryNote(string $deliveryId, string $reason): SalesDeliveryNote
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($deliveryId, $reason, $tenantId) {
            $deliveryNote = SalesDeliveryNote::where('tenant_id', $tenantId)
                ->where('id', $deliveryId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($deliveryNote->status === 'cancelled') {
                throw new InvalidArgumentException("إذن التسليم ملغي مسبقاً");
            }

            // عكس الحركات المخزنية وإرجاع الكميات
            $totalReversalCogs = 0;
            foreach ($deliveryNote->items as $dItem) {
                if ($dItem->inventory_item_id) {
                    $invItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('id', $dItem->inventory_item_id)
                        ->lockForUpdate()
                        ->first();

                    if ($invItem) {
                        $unitCost = (float) $invItem->average_cost;
                        $totalReversalCogs = round($totalReversalCogs + ($dItem->quantity * $unitCost), 4);

                        $this->inventoryService->recordTransaction([
                            'tenant_id' => $tenantId,
                            'inventory_item_id' => $invItem->id,
                            'warehouse_id' => $deliveryNote->warehouse_id,
                            'quantity' => $dItem->quantity,
                            'direction' => 'IN',
                            'transaction_type' => 'sales_delivery_reversal',
                            'unit_cost' => $invItem->average_cost,
                            'reference_type' => 'sales_delivery_notes',
                            'reference_id' => $deliveryNote->id,
                            'idempotency_key' => 'DN-REV-' . $deliveryNote->id . '-' . $dItem->id,
                        ]);
                    }
                }

                if ($dItem->sales_order_item_id) {
                    $orderItem = SalesOrderItem::where('tenant_id', $tenantId)
                        ->where('id', $dItem->sales_order_item_id)
                        ->first();

                    if ($orderItem) {
                        $orderItem->fulfilled_quantity = max(0, $orderItem->fulfilled_quantity - $dItem->quantity);
                        $orderItem->save();
                    }
                }
            }

            // تحديث حالة أمر البيع
            if ($deliveryNote->sales_order_id) {
                $order = SalesOrder::where('tenant_id', $tenantId)
                    ->where('id', $deliveryNote->sales_order_id)
                    ->first();

                if ($order && $order->status !== 'cancelled') {
                    $order->status = 'confirmed';
                    $order->save();
                }
            }

            $deliveryNote->status = 'cancelled';
            $deliveryNote->cancelled_at = now();
            $deliveryNote->cancellation_reason = $reason;
            $deliveryNote->save();

            // إثبات عكس قيد تكلفة المبيعات محاسبياً
            if ($totalReversalCogs > 0) {
                try {
                    app(\App\Services\AccountingService::class)->postSalesDeliveryCOGSReversal($tenantId, $deliveryNote, $totalReversalCogs);
                } catch (\Throwable) {}
            }

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'sales_delivery_cancelled',
                'auditable_type' => 'sales_delivery_notes',
                'auditable_id' => $deliveryNote->id,
                'new_values' => ['reason' => $reason],
            ]);

            return $deliveryNote;
        });
    }

    /**
     * تسجيل سند قبض مالي من العميل وتخصيصه على الفواتير
     */
    public function recordCustomerPayment(array $data): PaymentVoucher
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $customerId = $data['customer_id'];
            $customer = Customer::where('tenant_id', $tenantId)->findOrFail($customerId);

            $amount = (float) $data['amount'];
            if ($amount <= 0) {
                throw new InvalidArgumentException("مبلغ سند القبض يجب أن يكون أكبر من الصفر");
            }

            $paymentMethod = $data['payment_method'] ?? 'cash';
            $preferredCode = in_array($paymentMethod, ['bank_transfer', 'card']) ? '1020' : '1010';

            $accountId = $data['account_id'] ?? null;
            if ($accountId) {
                $cashAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('id', $accountId)->first();
            } else {
                $cashAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', $preferredCode)->first();
                if (!$cashAccount && $preferredCode === '1020') {
                    $cashAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', '1010')->first();
                }
            }

            if (!$cashAccount) {
                if (ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->count() === 0) {
                    app(AccountingService::class)->initializeDefaultChartOfAccounts($tenantId);
                }
                $cashAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', $preferredCode)->first()
                    ?? ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', '1010')->first()
                    ?? ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('type', 'asset')->first();
            }

            $arAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', '1110')->first();
            if (!$arAccount && ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->count() === 0) {
                app(AccountingService::class)->initializeDefaultChartOfAccounts($tenantId);
                $arAccount = ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('code', '1110')->first();
            }

            $voucherNumber = $data['voucher_number'] ?? ('RCV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)));

            $voucher = PaymentVoucher::create([
                'tenant_id' => $tenantId,
                'voucher_number' => $voucherNumber,
                'voucher_type' => 'receipt',
                'party_type' => 'customer',
                'party_id' => $customer->id,
                'party_name' => $customer->name,
                'payment_method' => $paymentMethod,
                'account_id' => $cashAccount ? $cashAccount->id : ($arAccount ? $arAccount->id : null),
                'amount' => $amount,
                'voucher_date' => $data['voucher_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
                'idempotency_key' => $data['idempotency_key'] ?? null,
            ]);

            // تخصيص الدفعة على الفواتير
            $allocations = $data['allocations'] ?? [];
            if (empty($allocations) && !empty($data['sales_invoice_id'])) {
                $allocations = [['sales_invoice_id' => $data['sales_invoice_id'], 'amount' => $amount]];
            } elseif (empty($allocations) && !empty($data['invoice_id'])) {
                $allocations = [['sales_invoice_id' => $data['invoice_id'], 'amount' => $amount]];
            }

            // تخصيص تلقائي FIFO على الفواتير المفتوحة إذا لم يتم تحديد فواتير بعينها
            if (empty($allocations)) {
                $unpaidInvoices = SalesInvoice::where('tenant_id', $tenantId)
                    ->where('customer_id', $customer->id)
                    ->whereIn('status', ['issued', 'partially_paid'])
                    ->where('balance_due', '>', 0)
                    ->orderBy('invoice_date', 'asc')
                    ->get();

                $remainingToAllocate = $amount;
                foreach ($unpaidInvoices as $inv) {
                    if ($remainingToAllocate <= 0) break;
                    $allocAmount = min($remainingToAllocate, (float) $inv->balance_due);
                    $allocations[] = ['sales_invoice_id' => $inv->id, 'amount' => $allocAmount];
                    $remainingToAllocate -= $allocAmount;
                }
            }

            foreach ($allocations as $alloc) {
                $invId = $alloc['sales_invoice_id'] ?? $alloc['invoice_id'] ?? null;
                $allocAmt = (float) ($alloc['amount'] ?? 0);
                if (!$invId || $allocAmt <= 0) continue;

                $invoice = SalesInvoice::where('tenant_id', $tenantId)
                    ->where('id', $invId)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($allocAmt > (float)$invoice->balance_due + 0.0001) {
                    throw new InvalidArgumentException("مبلغ التخصيص ({$allocAmt}) يتجاوز الرصيد المستحق على الفاتورة {$invoice->invoice_number} ({$invoice->balance_due})");
                }

                $invoice->paid_amount += $allocAmt;
                $invoice->balance_due = max(0, round($invoice->total_amount - $invoice->paid_amount, 4));
                $invoice->status = ($invoice->balance_due <= 0.0001) ? 'paid' : 'partially_paid';
                $invoice->save();

                PaymentVoucherAllocation::create([
                    'tenant_id' => $tenantId,
                    'payment_voucher_id' => $voucher->id,
                    'sales_invoice_id' => $invoice->id,
                    'amount' => $allocAmt,
                ]);
            }

            // إثبات القيد المحاسبي المتوازن إذا كانت شجرة الحسابات نشطة
            if ($cashAccount && $arAccount) {
                try {
                    $lines = [
                        [
                            'account_id' => $cashAccount->id,
                            'debit' => $amount,
                            'credit' => 0,
                            'description' => "سند قبض من العميل {$customer->name} برقم {$voucher->voucher_number}",
                        ],
                        [
                            'account_id' => $arAccount->id,
                            'debit' => 0,
                            'credit' => $amount,
                            'description' => "سداد مديونية العميل {$customer->name} بموجب سند قبض {$voucher->voucher_number}",
                        ]
                    ];

                    app(AccountingService::class)->createJournalEntry([
                        'entry_number' => 'JE-RCV-' . $voucher->voucher_number,
                        'description' => "سند قبض عميل {$voucher->voucher_number} - {$customer->name}",
                        'reference_type' => 'payment_vouchers',
                        'reference_id' => $voucher->id,
                        'entry_date' => $voucher->voucher_date ? $voucher->voucher_date->toDateString() : now()->toDateString(),
                        'lines' => $lines,
                    ]);
                } catch (\Throwable) {
                    // فشل غير مانع إذا كانت الحسابات تجريبية
                }
            }

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'customer_payment_recorded',
                'auditable_type' => 'payment_vouchers',
                'auditable_id' => $voucher->id,
                'new_values' => ['amount' => $amount, 'customer_id' => $customer->id],
            ]);

            return $voucher->load(['allocations.salesInvoice', 'account']);
        });
    }

    /**
     * إلغاء وعكس سند القبض وإعادة فتح أرصدة الفواتير المرتبطة
     */
    public function reverseCustomerPayment(string $voucherId, string $reason): PaymentVoucher
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($voucherId, $reason, $tenantId) {
            $voucher = PaymentVoucher::where('tenant_id', $tenantId)
                ->where('id', $voucherId)
                ->where('voucher_type', 'receipt')
                ->lockForUpdate()
                ->firstOrFail();

            if (str_starts_with($voucher->notes ?? '', '[REVERSED]')) {
                throw new InvalidArgumentException("سند القبض معكوس مسبقاً");
            }

            // عكس التخصيصات وإعادة الرصيد المستحق للفواتير
            foreach ($voucher->allocations as $alloc) {
                $invoice = SalesInvoice::where('tenant_id', $tenantId)
                    ->where('id', $alloc->sales_invoice_id)
                    ->lockForUpdate()
                    ->first();

                if ($invoice) {
                    $invoice->paid_amount = max(0, round($invoice->paid_amount - $alloc->amount, 4));
                    $invoice->balance_due = max(0, round($invoice->total_amount - $invoice->paid_amount, 4));
                    $invoice->status = ($invoice->paid_amount <= 0.0001) ? 'issued' : 'partially_paid';
                    $invoice->save();
                }
            }

            $voucher->notes = '[REVERSED] ' . $reason . ' | ' . ($voucher->notes ?? '');
            $voucher->save();

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'customer_payment_reversed',
                'auditable_type' => 'payment_vouchers',
                'auditable_id' => $voucher->id,
                'new_values' => ['reason' => $reason],
            ]);

            return $voucher;
        });
    }

    /**
     * إنشاء إشعار دائن صريح
     */
    public function createCreditNote(array $data): CreditNote
    {
        $tenantId = $data['tenant_id'] ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);

        return DB::transaction(function () use ($data, $tenantId) {
            $customerId = $data['customer_id'] ?? null;
            $salesInvoiceId = $data['sales_invoice_id'] ?? null;
            $salesReturnId = $data['sales_return_id'] ?? null;

            $creditNoteNumber = $data['credit_note_number'] ?? ('CN-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4)));

            $subtotal = (float) ($data['subtotal'] ?? $data['amount'] ?? 0);
            $taxAmount = (float) ($data['tax_amount'] ?? 0);
            $totalAmount = round($subtotal + $taxAmount, 4);

            $creditNote = CreditNote::create([
                'tenant_id' => $tenantId,
                'credit_note_number' => $creditNoteNumber,
                'customer_id' => $customerId,
                'sales_invoice_id' => $salesInvoiceId,
                'sales_return_id' => $salesReturnId,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'status' => 'issued',
                'credit_note_date' => $data['credit_note_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
            ]);

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => auth()->id() ?? 1,
                'action' => 'credit_note_created',
                'auditable_type' => 'credit_notes',
                'auditable_id' => $creditNote->id,
                'new_values' => ['total_amount' => $totalAmount],
            ]);

            // إثبات قيد محاسبي لإشعار الدائن إذا كان المبلغ > 0
            if ($totalAmount > 0) {
                app(\App\Services\AccountingService::class)->postCreditNote($tenantId, $creditNote);
            }

            return $creditNote;
        });
    }

    /**
     * قائمة الإشعارات الدائنة
     */
    public function getCreditNotes()
    {
        $tenantId = app('current_tenant_id');

        return CreditNote::where('tenant_id', $tenantId)
            ->with(['customer', 'salesInvoice', 'salesReturn'])
            ->latest()
            ->paginate(20);
    }

    /**
     * قائمة سندات القبض والدفعات
     */
    public function getPayments()
    {
        $tenantId = app('current_tenant_id');

        return PaymentVoucher::where('tenant_id', $tenantId)
            ->where('voucher_type', 'receipt')
            ->where('party_type', 'customer')
            ->with(['allocations.salesInvoice', 'account'])
            ->latest()
            ->paginate(20);
    }

    /**
     * فحص باركود فوري للـ POS
     */
    public function barcodeLookup(string $barcode): ?array
    {
        $tenantId = app('current_tenant_id');

        $variant = ProductVariant::where('tenant_id', $tenantId)
            ->where('barcode', $barcode)
            ->with(['garmentModel', 'size', 'color'])
            ->first();

        if (!$variant) {
            $invItem = InventoryItem::where('tenant_id', $tenantId)
                ->where('barcode', $barcode)
                ->with(['variant.garmentModel', 'variant.size', 'variant.color'])
                ->first();

            if ($invItem && $invItem->variant) {
                $variant = $invItem->variant;
            }
        }

        if (!$variant) {
            return null;
        }

        $stock = InventoryItem::where('tenant_id', $tenantId)
            ->where('variant_id', $variant->id)
            ->sum('current_balance');

        return [
            'id' => $variant->id,
            'name' => ($variant->garmentModel?->name ?? 'Garment') . ' - ' . ($variant->size?->name ?? '') . ' / ' . ($variant->color?->name ?? ''),
            'sku' => $variant->sku,
            'barcode' => $variant->barcode,
            'price' => (float) ($variant->retail_price ?? $variant->wholesale_price ?? 0),
            'wholesale_price' => (float) $variant->wholesale_price,
            'retail_price' => (float) $variant->retail_price,
            'current_stock' => (float) $stock,
            'variant' => $variant,
        ];
    }
}



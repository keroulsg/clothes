<?php

namespace App\Services;

use App\Models\GoodsReceiptNote;
use App\Models\GoodsReceiptNoteItem;
use App\Models\InventoryItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProcurementService
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * إنشاء أمر شراء جديد مع حساب الضرائب والخصومات وبنود الأصناف
     */
    public function createPurchaseOrder(array $data): PurchaseOrder
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'] ?? app('current_tenant_id');

            $poNumber = $data['po_number'] ?? ('PO-' . date('Ymd') . '-' . rand(100, 999));

            $subtotal = 0;
            $taxTotal = 0;

            foreach ($data['items'] as $itemData) {
                $qty = (float) $itemData['ordered_quantity'];
                $price = (float) $itemData['unit_price'];
                $lineSubtotal = $qty * $price;
                $taxRate = isset($itemData['tax_rate']) ? (float) $itemData['tax_rate'] : 14.0;
                $lineTax = ($lineSubtotal * $taxRate) / 100.0;

                $subtotal += $lineSubtotal;
                $taxTotal += $lineTax;
            }

            $discountAmount = isset($data['discount_amount']) ? (float) $data['discount_amount'] : 0.0;
            $totalAmount = ($subtotal - $discountAmount) + $taxTotal;

            $po = PurchaseOrder::create([
                'tenant_id' => $tenantId,
                'po_number' => $poNumber,
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'order_date' => $data['order_date'] ?? date('Y-m-d'),
                'expected_delivery_date' => $data['expected_delivery_date'] ?? null,
                'status' => 'draft',
                'subtotal' => round($subtotal, 4),
                'discount_amount' => round($discountAmount, 4),
                'tax_rate' => 14.0,
                'tax_amount' => round($taxTotal, 4),
                'total_amount' => round($totalAmount, 4),
                'notes' => $data['notes'] ?? null,
                'created_by' => $data['created_by'] ?? auth()->id(),
            ]);

            foreach ($data['items'] as $itemData) {
                $qty = (float) $itemData['ordered_quantity'];
                $price = (float) $itemData['unit_price'];
                $taxRate = isset($itemData['tax_rate']) ? (float) $itemData['tax_rate'] : 14.0;
                $lineTotal = ($qty * $price) + (($qty * $price * $taxRate) / 100.0);

                PurchaseOrderItem::create([
                    'tenant_id' => $tenantId,
                    'purchase_order_id' => $po->id,
                    'inventory_item_id' => $itemData['inventory_item_id'],
                    'ordered_quantity' => $qty,
                    'received_quantity' => 0,
                    'remaining_quantity' => $qty,
                    'unit_price' => round($price, 4),
                    'tax_rate' => $taxRate,
                    'total_price' => round($lineTotal, 4),
                ]);
            }

            return $po->load('items.item', 'supplier', 'warehouse');
        });
    }

    /**
     * اعتماد أمر الشراء ونقله لحالة قابل للتوريد
     */
    public function approvePurchaseOrder(string $poId, ?int $userId = null): PurchaseOrder
    {
        return DB::transaction(function () use ($poId, $userId) {
            $po = PurchaseOrder::where('id', $poId)->lockForUpdate()->firstOrFail();

            if ($po->status !== 'draft') {
                throw new Exception('لا يمكن اعتماد أمر شراء إلا إذا كان في حالة مسودة.');
            }

            $po->status = 'approved';
            $po->approved_by = $userId ?? auth()->id();
            $po->approved_at = now();
            $po->save();

            return $po;
        });
    }

    /**
     * استلام وفحص الخامات (GRN) وتحديث المخزن من خلال دفتر الأستاذ فقط
     */
    public function receiveGoods(array $data): GoodsReceiptNote
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'] ?? app('current_tenant_id');
            $poId = $data['purchase_order_id'];

            // قفل أمر الشراء لمنع تضارب التوريد المتزامن
            $po = PurchaseOrder::where('id', $poId)->lockForUpdate()->firstOrFail();

            if (!in_array($po->status, ['approved', 'partially_received'])) {
                throw new Exception("لا يمكن الاستلام على أمر شراء بحالة [{$po->status}]. يجب أن يكون معتمداً أو مستلماً جزئياً.");
            }

            $grnNumber = $data['grn_number'] ?? ('GRN-' . date('Ymd') . '-' . rand(100, 999));

            $grn = GoodsReceiptNote::create([
                'tenant_id' => $tenantId,
                'grn_number' => $grnNumber,
                'purchase_order_id' => $po->id,
                'supplier_id' => $po->supplier_id,
                'warehouse_id' => $data['warehouse_id'] ?? $po->warehouse_id,
                'receipt_date' => $data['receipt_date'] ?? date('Y-m-d'),
                'status' => 'posted',
                'quality_inspector_name' => $data['quality_inspector_name'] ?? 'مهندس فحص الجودة',
                'inspection_status' => $data['inspection_status'] ?? 'passed',
                'delivery_note_number' => $data['delivery_note_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'received_by' => $data['received_by'] ?? auth()->id(),
            ]);

            foreach ($data['items'] as $itemReceipt) {
                $poItemId = $itemReceipt['purchase_order_item_id'];
                $poItem = PurchaseOrderItem::where('id', $poItemId)->lockForUpdate()->firstOrFail();

                $delivered = (float) $itemReceipt['delivered_quantity'];
                $accepted = (float) $itemReceipt['accepted_quantity'];
                $rejected = isset($itemReceipt['rejected_quantity']) ? (float) $itemReceipt['rejected_quantity'] : ($delivered - $accepted);

                if ($accepted + $rejected > $delivered) {
                    throw new InvalidArgumentException('مجموع الكمية المقبولة والمرفوضة لا يمكن أن يتجاوز الكمية المسلمة.');
                }

                $remainingBefore = (float) $poItem->remaining_quantity;

                // منع تجاوز الكمية المتبقية في أمر الشراء
                if ($delivered > $remainingBefore) {
                    throw new InvalidArgumentException("الكمية المسلمة [{$delivered}] تتجاوز الكمية المتبقية في أمر الشراء [{$remainingBefore}].");
                }

                $poItem->received_quantity += $accepted;
                $poItem->remaining_quantity -= $delivered;
                $poItem->save();

                // حفظ بند إذن الاستلام
                GoodsReceiptNoteItem::create([
                    'tenant_id' => $tenantId,
                    'goods_receipt_note_id' => $grn->id,
                    'purchase_order_item_id' => $poItem->id,
                    'inventory_item_id' => $poItem->inventory_item_id,
                    'delivered_quantity' => $delivered,
                    'accepted_quantity' => $accepted,
                    'rejected_quantity' => $rejected,
                    'rejection_reason' => $itemReceipt['rejection_reason'] ?? null,
                    'unit_cost' => $poItem->unit_price,
                    'roll_numbers' => $itemReceipt['roll_numbers'] ?? null,
                ]);

                // تحديث دفتر الأستاذ المخزني للكمية المقبولة فقط عبر InventoryService
                if ($accepted > 0) {
                    $this->inventoryService->recordTransaction([
                        'tenant_id' => $tenantId,
                        'inventory_item_id' => $poItem->inventory_item_id,
                        'warehouse_id' => $grn->warehouse_id,
                        'transaction_type' => 'goods_receipt',
                        'direction' => 'IN',
                        'quantity' => $accepted,
                        'unit_cost' => (float) $poItem->unit_price,
                        'reference_type' => 'goods_receipt_note',
                        'reference_number' => $grn->grn_number,
                        'notes' => 'استلام خامات أمر شراء ' . $po->po_number,
                    ]);
                }
            }

            // تحديث حالة أمر الشراء
            $totalRemainingInPo = PurchaseOrderItem::where('purchase_order_id', $po->id)->sum('remaining_quantity');
            $po->status = ($totalRemainingInPo <= 0) ? 'received' : 'partially_received';
            $po->save();

            return $grn->load('items.inventoryItem', 'purchaseOrder');
        });
    }

    /**
     * المطابقة الثلاثية واعتماد فاتورة المورد (3-Way Matching: PO + GRN + Invoice)
     */
    public function matchAndCreateInvoice(array $data): SupplierInvoice
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'] ?? app('current_tenant_id');
            $idempotencyKey = $data['idempotency_key'] ?? null;

            // منع التكرار المالي: التحقق من مفتاح عدم التكرار (Idempotency)
            if ($idempotencyKey) {
                $existing = SupplierInvoice::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->where('idempotency_key', $idempotencyKey)
                    ->first();
                if ($existing) {
                    return $existing;
                }
            }

            $po = PurchaseOrder::with('items')->withoutGlobalScopes()->where('id', $data['purchase_order_id'])->firstOrFail();
            if ($po->tenant_id !== $tenantId) {
                throw new InvalidArgumentException('أمان: أمر الشراء غير تابع لهذه الشركة.');
            }

            $supplier = Supplier::withoutGlobalScopes()->where('id', $po->supplier_id)->lockForUpdate()->firstOrFail();
            if ($supplier->tenant_id !== $tenantId) {
                throw new InvalidArgumentException('أمان: المورد غير تابع لهذه الشركة.');
            }

            // منع تكرار ترحيل نفس الفاتورة لنفس المورد منعاً لمضاعفة الالتزام المالي
            $duplicateInvoice = SupplierInvoice::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('supplier_id', $supplier->id)
                ->where('invoice_number', $data['invoice_number'])
                ->first();

            if ($duplicateInvoice) {
                return $duplicateInvoice;
            }

            $grn = null;
            if (isset($data['goods_receipt_note_id'])) {
                $grn = GoodsReceiptNote::with('items')->withoutGlobalScopes()->where('id', $data['goods_receipt_note_id'])->first();
                if ($grn && $grn->tenant_id !== $tenantId) {
                    throw new InvalidArgumentException('أمان: إذن الاستلام غير تابع لهذه الشركة.');
                }
            }

            $invoiceSubtotal = (float) $data['subtotal'];
            $invoiceTax = isset($data['tax_amount']) ? (float) $data['tax_amount'] : ($invoiceSubtotal * 0.14);
            $invoiceTotal = $invoiceSubtotal + $invoiceTax;

            // كشف فروق المطابقة الثلاثية
            $matchingStatus = 'matched';
            $varianceNotes = [];

            // مقارنة مع استلام البضاعة إذا وجد
            if ($grn) {
                $grnTotalValue = 0;
                foreach ($grn->items as $grnItem) {
                    $grnTotalValue += ((float) $grnItem->accepted_quantity * (float) $grnItem->unit_cost);
                }

                $diff = abs($invoiceSubtotal - $grnTotalValue);
                if ($diff > 0.5) { // فروق أسعار أو كميات
                    $matchingStatus = 'price_variance';
                    $varianceNotes[] = "يوجد فرق مالي بين قيمة البضاعة المقبولة [{$grnTotalValue} ج.م] وقيمة الفاتورة [{$invoiceSubtotal} ج.م] بمقدار [{$diff} ج.م].";
                }
            }

            $internalRef = 'SINV-' . date('Ymd') . '-' . rand(100, 999);

            $invoice = SupplierInvoice::create([
                'tenant_id' => $tenantId,
                'invoice_number' => $data['invoice_number'],
                'internal_reference' => $internalRef,
                'supplier_id' => $supplier->id,
                'purchase_order_id' => $po->id,
                'goods_receipt_note_id' => $grn?->id,
                'invoice_date' => $data['invoice_date'] ?? date('Y-m-d'),
                'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                'subtotal' => round($invoiceSubtotal, 4),
                'tax_amount' => round($invoiceTax, 4),
                'total_amount' => round($invoiceTotal, 4),
                'paid_amount' => 0.0,
                'payment_status' => 'unpaid',
                'matching_status' => $matchingStatus,
                'variance_notes' => !empty($varianceNotes) ? implode('; ', $varianceNotes) : null,
                'is_posted' => true,
                'posted_at' => now(),
                'posted_by' => $data['posted_by'] ?? auth()->id(),
                'idempotency_key' => $idempotencyKey,
            ]);

            // إثبات الالتزام المالي الحقيقي للمورد
            $supplier->current_balance += $invoiceTotal;
            $supplier->save();

            return $invoice;
        });
    }

    /**
     * معالجة مرتجعات المشتريات وإشعار الخصم على المورد مع خصم المخزون
     */
    public function processPurchaseReturn(array $data): PurchaseReturn
    {
        return DB::transaction(function () use ($data) {
            $tenantId = $data['tenant_id'] ?? app('current_tenant_id');
            $supplier = Supplier::where('id', $data['supplier_id'])->lockForUpdate()->firstOrFail();

            $returnNumber = $data['return_number'] ?? ('PRT-' . date('Ymd') . '-' . rand(100, 999));
            $totalReturn = 0;

            foreach ($data['items'] as $itemData) {
                $qty = (float) $itemData['returned_quantity'];
                $cost = (float) $itemData['unit_cost'];
                $totalReturn += ($qty * $cost);
            }

            $return = PurchaseReturn::create([
                'tenant_id' => $tenantId,
                'return_number' => $returnNumber,
                'supplier_id' => $supplier->id,
                'purchase_order_id' => $data['purchase_order_id'] ?? null,
                'goods_receipt_note_id' => $data['goods_receipt_note_id'] ?? null,
                'warehouse_id' => $data['warehouse_id'],
                'return_date' => $data['return_date'] ?? date('Y-m-d'),
                'total_return_amount' => round($totalReturn, 4),
                'reason' => $data['reason'] ?? 'خامات غير مطابقة لفحص الجودة',
                'is_posted' => true,
                'posted_at' => now(),
                'created_by' => $data['created_by'] ?? auth()->id(),
            ]);

            foreach ($data['items'] as $itemData) {
                $qty = (float) $itemData['returned_quantity'];
                $cost = (float) $itemData['unit_cost'];

                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'inventory_item_id' => $itemData['inventory_item_id'],
                    'returned_quantity' => $qty,
                    'unit_cost' => round($cost, 4),
                    'total_cost' => round($qty * $cost, 4),
                ]);

                // خصم الكمية من دفتر الأستاذ المخزني
                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $itemData['inventory_item_id'],
                    'warehouse_id' => $return->warehouse_id,
                    'transaction_type' => 'adjustment_negative',
                    'direction' => 'OUT',
                    'quantity' => $qty,
                    'unit_cost' => $cost,
                    'reference_type' => 'purchase_return',
                    'reference_number' => $return->return_number,
                    'notes' => 'مرتجع مشتريات للمورد: ' . $supplier->name,
                ]);
            }

            // خفض مستحقات المورد بإشعار الخصم
            $supplier->current_balance -= $totalReturn;
            $supplier->save();

            return $return->load('items.item', 'supplier');
        });
    }
}

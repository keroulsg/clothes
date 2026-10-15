<?php

namespace App\Services;

use App\Exceptions\IdempotencyCollisionException;
use App\Models\GoodsReceiptNote;
use App\Models\GoodsReceiptNoteItem;
use App\Models\InventoryItem;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Warehouse;
use Exception;
use Illuminate\Database\QueryException;
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
     * إنشاء أمر شراء جديد مع حساب الضرائب والخصومات وبنود الأصناف مع التحقق الصارم من سياق الشركة والملكية
     */
    public function createPurchaseOrder(array $data): PurchaseOrder
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد. لا يمكن إنشاء أمر شراء دون سياق شركة موثق.');
        }

        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة. tenant_id الممرر لا يطابق الشركة الموثقة.');
        }

        $tenantId = $contextTenantId;

        // التحقق من ملكية المورد
        $supplier = Supplier::where('tenant_id', $tenantId)->where('id', $data['supplier_id'])->first();
        if (!$supplier) {
            throw new InvalidArgumentException('أمان: المورد غير موجود أو غير تابع للشركة الحالية.');
        }

        // التحقق من ملكية المستودع
        $warehouse = Warehouse::where('tenant_id', $tenantId)->where('id', $data['warehouse_id'])->first();
        if (!$warehouse) {
            throw new InvalidArgumentException('أمان: المستودع غير موجود أو غير تابع للشركة الحالية.');
        }

        // التحقق من ملكية كافة الأصناف المخزنية
        foreach ($data['items'] as $itemData) {
            $invItem = InventoryItem::where('tenant_id', $tenantId)->where('id', $itemData['inventory_item_id'])->first();
            if (!$invItem) {
                throw new InvalidArgumentException('أمان: الصنف المخزني غير موجود أو غير تابع للشركة الحالية.');
            }
        }

        return DB::transaction(function () use ($data, $tenantId, $supplier, $warehouse) {
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
                'supplier_id' => $supplier->id,
                'warehouse_id' => $warehouse->id,
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
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($poId, $userId, $contextTenantId) {
            $po = PurchaseOrder::where('tenant_id', $contextTenantId)->where('id', $poId)->lockForUpdate()->firstOrFail();

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
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد. لا يمكن استلام بضائع دون سياق شركة موثق.');
        }

        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة. tenant_id الممرر لا يطابق الشركة الموثقة.');
        }

        $tenantId = $contextTenantId;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // التحقق المسبق من مفتاح عدم التكرار (Idempotency) لإذن الاستلام باستخدام البصمة المعيارية (Canonical Fingerprint)
        if ($idempotencyKey) {
            $existing = GoodsReceiptNote::with('items')->where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                $incomingFingerprint = $this->calculateGrnFingerprint($data, $existing->warehouse_id);
                $existingFingerprint = $this->calculateExistingGrnFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لإذن استلام بحقول أو كميات مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items.inventoryItem', 'purchaseOrder');
            }
        }

        try {
            return DB::transaction(function () use ($data, $tenantId, $idempotencyKey) {
                $poId = $data['purchase_order_id'];

                // قفل أمر الشراء لمنع تضارب التوريد المتزامن
                $po = PurchaseOrder::where('tenant_id', $tenantId)->where('id', $poId)->lockForUpdate()->firstOrFail();

                if (!in_array($po->status, ['approved', 'partially_received'])) {
                    throw new Exception("لا يمكن الاستلام على أمر شراء بح حالة [{$po->status}]. يجب أن يكون معتمداً أو مستلماً جزئياً.");
                }

                $grnNumber = $data['grn_number'] ?? ('GRN-' . date('Ymd') . '-' . rand(100, 999));

                try {
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
                        'idempotency_key' => $idempotencyKey,
                    ]);
                } catch (QueryException $e) {
                    if ($idempotencyKey && ($e->getCode() == 23000 || str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry'))) {
                        throw new IdempotencyCollisionException(
                            idempotencyKey: $idempotencyKey,
                            tenantId: $tenantId,
                            message: $e->getMessage(),
                            code: (int)$e->getCode(),
                            previous: $e
                        );
                    }
                    throw $e;
                }

                foreach ($data['items'] as $itemReceipt) {
                    $poItemId = $itemReceipt['purchase_order_item_id'];
                    $poItem = PurchaseOrderItem::where('tenant_id', $tenantId)
                        ->where('purchase_order_id', $po->id)
                        ->where('id', $poItemId)
                        ->lockForUpdate()
                        ->firstOrFail();

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
                            'idempotency_key' => $idempotencyKey ? "{$idempotencyKey}_item_{$poItem->id}" : null,
                        ]);
                    }
                }

                // تحديث حالة أمر الشراء
                $totalRemainingInPo = PurchaseOrderItem::where('purchase_order_id', $po->id)->sum('remaining_quantity');
                $po->status = ($totalRemainingInPo <= 0) ? 'received' : 'partially_received';
                $po->save();

                return $grn->load('items.inventoryItem', 'purchaseOrder');
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = GoodsReceiptNote::with('items')->where('tenant_id', $e->getTenantId())
                ->where('idempotency_key', $e->getIdempotencyKey())
                ->first();
            if ($existing) {
                $incomingFingerprint = $this->calculateGrnFingerprint($data, $existing->warehouse_id);
                $existingFingerprint = $this->calculateExistingGrnFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لإذن استلام بحقول أو كميات مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items.inventoryItem', 'purchaseOrder');
            }
            throw $e;
        }
    }

    /**
     * المطابقة الثلاثية واعتماد فاتورة المورد (3-Way Matching: PO + GRN + Invoice)
     */
    public function matchAndCreateInvoice(array $data): SupplierInvoice
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد. لا يمكن تسجيل فاتورة مورد دون سياق شركة موثق.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في هوية الشركة الممررة.');
        }
        $tenantId = $contextTenantId;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        $invoiceSubtotal = (float) $data['subtotal'];
        $invoiceTax = isset($data['tax_amount']) ? (float) $data['tax_amount'] : ($invoiceSubtotal * 0.14);
        $invoiceTotal = isset($data['total_amount']) ? (float) $data['total_amount'] : ($invoiceSubtotal + $invoiceTax);
        $grnId = $data['goods_receipt_note_id'] ?? null;

        // منع التكرار المالي: التحقق المسبق من مفتاح عدم التكرار (Idempotency) لكافة الحقول المالية
        if ($idempotencyKey) {
            $existing = SupplierInvoice::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                if (!$this->isInvoiceMatching($existing, $data, $invoiceSubtotal, $invoiceTax, $invoiceTotal, $grnId)) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لفاتورة مورد بحقول أو مبالغ مالية مختلفة (IdempotencyConflict).');
                }

                return $existing->load('supplier', 'purchaseOrder');
            }
        }

        try {
            return DB::transaction(function () use ($data, $tenantId, $idempotencyKey, $invoiceSubtotal, $invoiceTax, $invoiceTotal, $grnId) {
                $po = PurchaseOrder::with('items')->where('tenant_id', $tenantId)->where('id', $data['purchase_order_id'])->firstOrFail();

                $supplier = Supplier::where('tenant_id', $tenantId)->where('id', $po->supplier_id)->lockForUpdate()->firstOrFail();

                // منع تكرار ترحيل نفس الفاتورة لنفس المورد منعاً لمضاعفة الالتزام المالي
                $duplicateInvoice = SupplierInvoice::where('tenant_id', $tenantId)
                    ->where('supplier_id', $supplier->id)
                    ->where('invoice_number', $data['invoice_number'])
                    ->first();

                if ($duplicateInvoice) {
                    $isConflict = ((string)$duplicateInvoice->purchase_order_id !== (string)$data['purchase_order_id'])
                        || (abs((float)$duplicateInvoice->subtotal - (float)$data['subtotal']) >= 0.01)
                        || (isset($data['total_amount']) && abs((float)$duplicateInvoice->total_amount - (float)$data['total_amount']) >= 0.01);

                    if ($isConflict) {
                        throw new InvalidArgumentException('تعارض في فاتورة المورد: رقم الفاتورة مسجل مسبقاً بنفس المورد ولكن بأمر شراء أو مبالغ مالية مختلفة.');
                    }

                    return $duplicateInvoice->load('supplier', 'purchaseOrder');
                }

                $grn = null;
                if (isset($data['goods_receipt_note_id'])) {
                    $grn = GoodsReceiptNote::with('items')->where('tenant_id', $tenantId)->where('id', $data['goods_receipt_note_id'])->first();
                    if (!$grn) {
                        throw new InvalidArgumentException('أمان: إذن الاستلام غير موجود أو غير تابع لهذه الشركة.');
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

                    if (abs($invoiceSubtotal - $grnTotalValue) > 0.5) {
                        $matchingStatus = 'price_variance';
                        $varianceNotes[] = "يوجد فرق مالي بين قيمة البضاعة المقبولة [{$grnTotalValue} ج.م] وقيمة الفاتورة [{$invoiceSubtotal} ج.م].";
                    }
                }

                // مقارنة مع أمر الشراء
                if (abs($invoiceSubtotal - (float)$po->subtotal) > 0.5 && $matchingStatus === 'matched') {
                    $matchingStatus = 'price_variance';
                    $varianceNotes[] = "فرق في القيمة بين الفاتورة ({$invoiceSubtotal}) وأمر الشراء ({$po->subtotal})";
                }

                try {
                    $invoice = SupplierInvoice::create([
                        'tenant_id' => $tenantId,
                        'supplier_id' => $supplier->id,
                        'purchase_order_id' => $po->id,
                        'goods_receipt_note_id' => $grn?->id,
                        'invoice_number' => $data['invoice_number'],
                        'internal_reference' => $data['internal_reference'] ?? ('SINV-' . date('Ymd') . '-' . rand(1000, 9999)),
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
                } catch (QueryException $e) {
                    if ($idempotencyKey && ($e->getCode() == 23000 || str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry'))) {
                        throw new IdempotencyCollisionException(
                            idempotencyKey: $idempotencyKey,
                            tenantId: $tenantId,
                            message: $e->getMessage(),
                            code: (int)$e->getCode(),
                            previous: $e
                        );
                    }
                    throw $e;
                }

                // إثبات الالتزام المالي الحقيقي للمورد
                $supplier->current_balance = (float) $supplier->current_balance + $invoiceTotal;
                $supplier->save();

                return $invoice->load('supplier', 'purchaseOrder');
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = SupplierInvoice::where('tenant_id', $e->getTenantId())
                ->where('idempotency_key', $e->getIdempotencyKey())
                ->first();
            if ($existing) {
                if (!$this->isInvoiceMatching($existing, $data, $invoiceSubtotal, $invoiceTax, $invoiceTotal, $grnId)) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لفاتورة مورد بحقول أو مبالغ مالية مختلفة (IdempotencyConflict).');
                }

                return $existing->load('supplier', 'purchaseOrder');
            }
            throw $e;
        }
    }

    /**
     * معالجة مرتجعات المشتريات وإشعار الخصم على المورد مع خصم المخزون
     */
    public function processPurchaseReturn(array $data): PurchaseReturn
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد. لا يمكن تسجيل مرتجع مشتريات دون سياق شركة موثق.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في هوية الشركة الممررة.');
        }
        $tenantId = $contextTenantId;

        return DB::transaction(function () use ($data, $tenantId) {
            $supplier = Supplier::where('tenant_id', $tenantId)->where('id', $data['supplier_id'])->lockForUpdate()->firstOrFail();

            $warehouse = Warehouse::where('tenant_id', $tenantId)->where('id', $data['warehouse_id'])->firstOrFail();

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
                'warehouse_id' => $warehouse->id,
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

    /**
     * حساب البصمة المعيارية لبيانات استلام البضاعة (Canonical Fingerprint)
     */
    public function calculateGrnFingerprint(array $data, ?string $defaultWarehouseId = null): string
    {
        $items = $data['items'] ?? [];
        usort($items, fn($a, $b) => strcmp((string)$a['purchase_order_item_id'], (string)$b['purchase_order_item_id']));

        $canonicalItems = array_map(function ($item) {
            $delivered = round((float)$item['delivered_quantity'], 4);
            $accepted = round((float)$item['accepted_quantity'], 4);
            $rejected = isset($item['rejected_quantity'])
                ? round((float)$item['rejected_quantity'], 4)
                : round($delivered - $accepted, 4);

            return [
                'purchase_order_item_id' => (string)$item['purchase_order_item_id'],
                'delivered' => $delivered,
                'accepted' => $accepted,
                'rejected' => $rejected,
            ];
        }, $items);

        $payload = [
            'purchase_order_id' => (string)($data['purchase_order_id'] ?? ''),
            'warehouse_id' => (string)($data['warehouse_id'] ?? $defaultWarehouseId ?? ''),
            'inspection_status' => (string)($data['inspection_status'] ?? 'passed'),
            'items' => $canonicalItems,
        ];

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES));
    }

    /**
     * حساب البصمة المعيارية لسجل إذن استلام مخزن قائم في قاعدة البيانات
     */
    public function calculateExistingGrnFingerprint(GoodsReceiptNote $grn): string
    {
        $grn->loadMissing('items');
        $items = $grn->items->sortBy('purchase_order_item_id')->values();

        $canonicalItems = $items->map(function ($item) {
            return [
                'purchase_order_item_id' => (string)$item->purchase_order_item_id,
                'delivered' => round((float)$item->delivered_quantity, 4),
                'accepted' => round((float)$item->accepted_quantity, 4),
                'rejected' => round((float)$item->rejected_quantity, 4),
            ];
        })->all();

        $payload = [
            'purchase_order_id' => (string)$grn->purchase_order_id,
            'warehouse_id' => (string)$grn->warehouse_id,
            'inspection_status' => (string)$grn->inspection_status,
            'items' => $canonicalItems,
        ];

        return hash('sha256', json_encode($payload, JSON_UNESCAPED_SLASHES));
    }

    /**
     * التحقق من التطابق التام لكافة الحقول المالية لفاتورة المورد
     */
    private function isInvoiceMatching(
        SupplierInvoice $existing,
        array $data,
        float $subtotal,
        float $taxAmount,
        float $totalAmount,
        ?string $grnId
    ): bool {
        if ((string)$existing->purchase_order_id !== (string)$data['purchase_order_id']) {
            return false;
        }

        if ((string)$existing->invoice_number !== (string)$data['invoice_number']) {
            return false;
        }

        if (abs((float)$existing->subtotal - $subtotal) >= 0.01) {
            return false;
        }

        if (abs((float)$existing->tax_amount - $taxAmount) >= 0.01) {
            return false;
        }

        if (abs((float)$existing->total_amount - $totalAmount) >= 0.01) {
            return false;
        }

        $existingGrnId = $existing->goods_receipt_note_id ? (string)$existing->goods_receipt_note_id : null;
        $expectedGrnId = $grnId ? (string)$grnId : null;
        if ($existingGrnId !== $expectedGrnId) {
            return false;
        }

        return true;
    }
}

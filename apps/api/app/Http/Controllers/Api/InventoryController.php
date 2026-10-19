<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuttingOrder;
use App\Models\CustomerMaterial;
use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * عرض المخازن المتاحة للشركة
     */
    public function warehouses(): JsonResponse
    {
        $warehouses = Warehouse::withCount('items')->get();

        return response()->json([
            'warehouses' => $warehouses,
        ]);
    }

    /**
     * عرض كروت الأصناف المخزنية مع الفلترة والبحث
     */
    public function items(Request $request): JsonResponse
    {
        $query = InventoryItem::with(['warehouse', 'variant.garmentModel', 'variant.size', 'variant.color']);

        if ($request->has('warehouse_id') && $request->warehouse_id !== 'all') {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->has('item_type') && $request->item_type !== 'all') {
            $query->where('item_type', $request->item_type);
        }

        if ($request->has('is_customer_owned')) {
            $query->where('is_customer_owned', filter_var($request->is_customer_owned, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('name')->paginate($request->input('per_page', 20));

        return response()->json($items);
    }

    /**
     * تسجيل حركة مخزنية رسمية (إذن استلام، إذن صرف، تسوية)
     */
    public function recordTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'transaction_type' => 'required|string|in:goods_receipt,material_issuance,adjustment_positive,adjustment_negative,transfer_in,transfer_out',
            'direction' => 'required|string|in:IN,OUT',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_cost' => 'nullable|numeric|min:0',
            'reference_type' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'batch_number' => 'nullable|string|max:100',
            'roll_number' => 'nullable|string|max:100',
            'technical_notes' => 'nullable|array',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $tenantId = app('current_tenant_id');

        // التحقق الصارم من ملكية الصنف للشركة الحالية ومنع التسلل بين الشركات
        $item = InventoryItem::where('tenant_id', $tenantId)->find($validated['inventory_item_id']);
        if (!$item) {
            return response()->json([
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: لا يمكن تسجيل حركة مخزنية لصنف غير تابع لشركتك.',
            ], 403);
        }

        // استخراج مفتاح عدم التكرار من الـ Header أو الـ Body
        $idempotencyKey = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);
        if ($idempotencyKey) {
            $validated['idempotency_key'] = $idempotencyKey;
        }

        $validated['tenant_id'] = $tenantId;

        $user = $request->user();
        $userRole = $user?->role;

        // 1. حظر مشرف المنصة العام من تنفيذ أي حركات تشغيلية داخل الشركات المستأجرة
        if ($userRole === 'platform_admin') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مشرف المنصة العام غير مصرح له بتنفيذ عمليات تشغيلية أو تعديل المخزون داخل الشركات المستأجرة.',
            ], 403);
        }

        // 2. حظر عمال التشغيل تماماً من ترحيل أي حركات مخزنية مباشرة (إضافة، صرف، تسوية)
        if ($userRole === 'worker') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: عمال التشغيل غير مصرح لهم بتسجيل حركات مخزنية مباشرة؛ يجب أن تتم حركات الصرف والاستلام عبر دورات العمل المعتمدة (أوامر القص ومحاضر الاستلام).',
            ], 403);
        }

        // 3. حظر الأدوار غير التشغيلية مثل مندوبي المبيعات
        if ($userRole === 'sales_rep') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مندوب المبيعات غير مصرح له بتعديل أرصدة الخامات والمخازن مباشرة.',
            ], 403);
        }

        // 4. تقييد العمليات بحسب الاختصاص المالي والإنتاجي والمخزني
        if ($userRole === 'accountant') {
            if ($validated['transaction_type'] === 'material_issuance') {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: المحاسب المالي غير مصرح له بصرف الخامات للإنتاج (مقتصرة على مدير الإنتاج وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole === 'production_manager') {
            if (in_array($validated['transaction_type'], ['adjustment_positive', 'adjustment_negative', 'goods_receipt'], true)) {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: مدير الإنتاج غير مصرح له بتسجيل تسويات جردية أو استلام توريدات مشتريات مباشرة (مقتصرة على المحاسبة وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole === 'warehouse_manager') {
            if (in_array($validated['transaction_type'], ['adjustment_positive', 'adjustment_negative'], true)) {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: مسؤول المستودع غير مصرح له بتسجيل تسويات جردية يدوية (مقتصرة على المحاسبة وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole !== 'company_owner') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: دورك الحالي غير مصرح له بتسجيل حركات مخزنية مباشرة.',
            ], 403);
        }

        $refType = $validated['reference_type'] ?? null;
        $refNum = $validated['reference_number'] ?? null;

        // 5. التحقق الصارم من أنواع المستندات المرجعية المسموح بها ومنع المحارف غير المعترف بها
        if (!empty($refType)) {
            $validRefTypes = [
                'purchase_order', 'po',
                'cutting_order', 'production_order',
                'goods_receipt', 'grn',
                'manual_reference', 'inventory_audit', 'stock_transfer',
            ];
            if (!in_array($refType, $validRefTypes, true)) {
                return response()->json([
                    'error' => 'InvalidTransactionReference',
                    'message' => 'نوع المستند المرجعي غير معتمد في النظام.',
                ], 422);
            }
        }

        // 6. التحقق من اتساق نوع الحركة مع نوع المستند المرجعي
        $txType = $validated['transaction_type'];
        if (in_array($txType, ['adjustment_positive', 'adjustment_negative'], true)) {
            // التسويات الجردية اليدوية تقتصر على manual_reference أو inventory_audit
            if (!empty($refType) && !in_array($refType, ['manual_reference', 'inventory_audit'], true)) {
                return response()->json([
                    'error' => 'InvalidReferenceTypeForTransaction',
                    'message' => 'التسويات الجردية تقتصر على مراجع التسوية اليدوية (manual_reference) أو محاضر الجرد (inventory_audit).',
                ], 422);
            }
            if (empty($refType)) {
                $validated['reference_type'] = 'manual_reference';
                $refType = 'manual_reference';
            }
        } else {
            // العمليات التشغيلية (توريد، صرف، تحويل) تتطلب مستنداً مرجعياً حقيقياً ولا تقبل مراجع يدوية عشوائية
            if (empty($refType) || in_array($refType, ['manual_reference', 'inventory_audit'], true)) {
                return response()->json([
                    'error' => 'InvalidReferenceTypeForTransaction',
                    'message' => 'العمليات التشغيلية (التوريد، الصرف، التحويل) تتطلب مستنداً مرجعياً حقيقياً معتمداً (أمر شراء، أمر قص، أمر إنتاج، أمر تحويل) ولا تقبل التسجيل اليدوي العشوائي.',
                ], 422);
            }
            if (empty($refNum)) {
                return response()->json([
                    'error' => 'MissingReferenceNumber',
                    'message' => 'يجب إدخال رقم أو معرّف المستند المرجعي للعملية التشغيلية.',
                ], 422);
            }
        }

        $poAny = null;
        $poItem = null;

        // 7. التحقق العلائقي الصارم والتحقق من سياق الشركة وحالة المستند المرجعي
        if (in_array($refType, ['purchase_order', 'po'], true)) {
            $poAny = PurchaseOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('po_number', $refNum);
                })->first();

            if (!$poAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر الشراء المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $poAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر الشراء المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if (!in_array($poAny->status, ['approved', 'partially_received'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر شراء بحالة [{$poAny->status}]. يجب أن يكون معتمداً أو مستلماً جزئياً.",
                ], 422);
            }

            $poItem = PurchaseOrderItem::where('tenant_id', $tenantId)
                ->where('purchase_order_id', $poAny->id)
                ->where('inventory_item_id', $validated['inventory_item_id'])
                ->first();

            if (!$poItem) {
                return response()->json([
                    'error' => 'InvalidReferenceItem',
                    'message' => 'الصنف المخزني غير موجود ضمن بنود أمر الشراء المرجعي.',
                ], 422);
            }

            if ($txType === 'goods_receipt' && (float) $validated['quantity'] > (float) $poItem->remaining_quantity) {
                return response()->json([
                    'error' => 'OverReceiptNotPermitted',
                    'message' => "الكمية المطلوب استلامها [{$validated['quantity']}] تتجاوز الكمية المتبقية للتوريد في أمر الشراء [{$poItem->remaining_quantity}].",
                ], 422);
            }

            $validated['reference_id'] = $poAny->id;
            $validated['reference_number'] = $poAny->po_number;

        } elseif (in_array($refType, ['goods_receipt', 'grn'], true)) {
            $grnAny = GoodsReceiptNote::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('grn_number', $refNum);
                })->first();

            if (!$grnAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'إذن الاستلام المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $grnAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: إذن الاستلام المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if ($grnAny->status === 'cancelled') {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => 'إذن الاستلام المرجعي ملغى ولا يمكن تسجيل حركات عليه.',
                ], 422);
            }

            // منع تكرار استلام نفس إذن الاستلام لنفس الصنف
            $alreadyPosted = InventoryTransaction::where('tenant_id', $tenantId)
                ->where('inventory_item_id', $validated['inventory_item_id'])
                ->where(function ($q) use ($grnAny) {
                    $q->where('reference_id', $grnAny->id)
                      ->orWhere('reference_number', $grnAny->grn_number);
                })->exists();

            if ($alreadyPosted) {
                return response()->json([
                    'error' => 'DuplicateReceipt',
                    'message' => 'إذن الاستلام المرجعي تم ترحيله مخزنياً مسبقاً ولا يمكن استلامه مرة أخرى منعاً لتكرار الرصيد.',
                ], 422);
            }

            $validated['reference_id'] = $grnAny->id;
            $validated['reference_number'] = $grnAny->grn_number;

        } elseif ($refType === 'cutting_order') {
            $coAny = CuttingOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('cutting_order_number', $refNum);
                })->first();

            if (!$coAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر القص المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $coAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر القص المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if ($coAny->status === 'cancelled') {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => 'أمر القص المرجعي ملغى ولا يمكن تسجيل حركات عليه.',
                ], 422);
            }

            if ($coAny->fabric_inventory_item_id && $coAny->fabric_inventory_item_id !== $validated['inventory_item_id']) {
                return response()->json([
                    'error' => 'InvalidReferenceItem',
                    'message' => 'الصنف المخزني لا يطابق خامة القماش المعتمدة في أمر القص المرجعي.',
                ], 422);
            }

            $validated['reference_id'] = $coAny->id;
            $validated['reference_number'] = $coAny->cutting_order_number;

        } elseif ($refType === 'production_order') {
            $prodAny = ProductionOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('order_number', $refNum);
                })->first();

            if (!$prodAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر الإنتاج المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $prodAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر الإنتاج المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if (in_array($prodAny->status, ['draft', 'cancelled'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر إنتاج بحالة [{$prodAny->status}]. يجب أن يكون معتمداً أو قيد التشغيل.",
                ], 422);
            }

            $validated['reference_id'] = $prodAny->id;
            $validated['reference_number'] = $prodAny->order_number;

        } elseif ($refType === 'stock_transfer') {
            $stAny = DB::table('stock_transfers')
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('transfer_number', $refNum);
                })->first();

            if (!$stAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر التحويل المخزني المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $stAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر التحويل المخزني غير تابع لشركتك.',
                ], 403);
            }

            if (in_array($stAny->status, ['draft', 'cancelled'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر تحويل مخزني بحالة [{$stAny->status}].",
                ], 422);
            }

            $validated['reference_id'] = $stAny->id;
            $validated['reference_number'] = $stAny->transfer_number;
        }

        try {
            $transaction = DB::transaction(function () use ($validated, $poItem, $poAny) {
                $tx = $this->inventoryService->recordTransaction($validated);

                if (!empty($poItem) && !empty($poAny) && $validated['transaction_type'] === 'goods_receipt' && $tx->wasRecentlyCreated) {
                    $receivedQty = (float) $validated['quantity'];
                    $poItem->refresh();
                    $poItem->received_quantity = (float) $poItem->received_quantity + $receivedQty;
                    $poItem->remaining_quantity = max(0.0, (float) $poItem->remaining_quantity - $receivedQty);
                    $poItem->save();

                    $remainingTotal = PurchaseOrderItem::where('purchase_order_id', $poAny->id)->sum('remaining_quantity');
                    $poAny->refresh();
                    $poAny->status = $remainingTotal <= 0.0001 ? 'completed' : 'partially_received';
                    $poAny->save();
                }

                return $tx;
            });

            $isDuplicate = false;
            if ($idempotencyKey && $transaction->wasRecentlyCreated === false) {
                $isDuplicate = true;
            }

            return response()->json([
                'message' => $isDuplicate
                    ? 'تم استرجاع الحركة المسجلة مسبقاً بنجاح (Idempotent Request).'
                    : 'تم ترحيل الحركة المخزنية وتحديث رصيد دفتر الأستاذ بنجاح.',
                'is_duplicate' => $isDuplicate,
                'transaction' => $transaction,
            ], $isDuplicate ? 200 : 201);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            if (str_contains($e->getMessage(), 'أمان:')) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => $e->getMessage(),
                ], 403);
            }
            return response()->json([
                'error' => 'InvalidTransaction',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'TransactionFailed',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * عرض دفتر الأستاذ المخزني غير القابل للتعديل
     */
    public function transactions(Request $request): JsonResponse
    {
        $query = InventoryTransaction::with(['item', 'warehouse', 'user']);

        if ($request->has('inventory_item_id')) {
            $query->where('inventory_item_id', $request->inventory_item_id);
        }

        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        $transactions = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));

        return response()->json($transactions);
    }

    /**
     * حاسبة التحويل الدقيقة للأقمشة (أمتار ↔ كجم) بناءً على GSM وعرض القماش الصالح للقص
     */
    public function convertFabric(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'required|in:meters_to_kg,kg_to_meters',
            'value' => 'required|numeric|min:0.01',
            'usable_width_meters' => 'required|numeric|min:0.1|max:5.0', // مثلاً 1.6 متر (160 سم)
            'gsm' => 'required|numeric|min:50|max:1000', // وزن المتر المربع
        ]);

        if ($validated['mode'] === 'meters_to_kg') {
            $result = $this->inventoryService->convertFabricMetersToKg(
                $validated['value'],
                $validated['usable_width_meters'],
                $validated['gsm']
            );
        } else {
            $result = $this->inventoryService->convertFabricKgToMeters(
                $validated['value'],
                $validated['usable_width_meters'],
                $validated['gsm']
            );
        }

        return response()->json([
            'success' => true,
            'conversion' => $result,
        ]);
    }

    /**
     * عرض وإدارة أمانات خامات العملاء
     */
    public function customerMaterials(Request $request): JsonResponse
    {
        $materials = CustomerMaterial::with('warehouse')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'customer_materials' => $materials,
        ]);
    }

    /**
     * استلام وإثبات أمانة خامات عميل بالمخزن
     */
    public function receiveCustomerMaterial(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'fabric_name' => 'required|string|max:255',
            'fabric_code' => 'nullable|string|max:100',
            'gsm' => 'nullable|numeric|min:1',
            'usable_width_meters' => 'nullable|numeric|min:0.1',
            'received_meters' => 'required|numeric|min:0.01',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'notes' => 'nullable|string',
        ]);

        try {
            $material = $this->inventoryService->receiveCustomerMaterial($validated);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'ValidationError',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم استلام أمانة خامة العميل وتوثيق الرصيد بالمخزن بنجاح.',
            'customer_material' => $material,
        ], 201);
    }

    /**
     * صرف جزء من أمانة خامة العميل مع حساب الهالك
     */
    public function consumeCustomerMaterial(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'consumed_meters' => 'required|numeric|min:0',
            'waste_meters' => 'nullable|numeric|min:0',
        ]);

        $wasteMeters = (float) ($validated['waste_meters'] ?? 0.0);

        try {
            $material = $this->inventoryService->consumeCustomerMaterial($id, (float) $validated['consumed_meters'], $wasteMeters);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'NotFound',
                'message' => 'خامة العميل غير موجودة أو غير تابعة للشركة.',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'ValidationError',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'ConsumptionError',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم صرف كمية خامة العميل وتحديث الأرصدة بنجاح.',
            'customer_material' => $material,
        ], 200);
    }
}

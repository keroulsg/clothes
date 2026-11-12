<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoodsReceiptNote;
use App\Services\ProcurementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GoodsReceiptController extends Controller
{
    protected ProcurementService $procurementService;

    public function __construct(ProcurementService $procurementService)
    {
        $this->procurementService = $procurementService;
    }

    /**
     * عرض قائمة أذون استلام وفحص البضاعة
     */
    public function index(Request $request): JsonResponse
    {
        $query = GoodsReceiptNote::with(['supplier', 'warehouse', 'purchaseOrder', 'items.inventoryItem'])->withCount('items');

        if ($request->has('purchase_order_id')) {
            $query->where('purchase_order_id', $request->purchase_order_id);
        }

        $receipts = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        return response()->json($receipts);
    }

    /**
     * ترحيل إذن استلام وفحص البضاعة وتحديث المخزن للكمية المقبولة فقط
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'receipt_date' => 'nullable|date',
            'quality_inspector_name' => 'nullable|string|max:255',
            'inspection_status' => 'required|in:passed,partial_pass,failed',
            'delivery_note_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.delivered_quantity' => 'required|numeric|min:0.001',
            'items.*.accepted_quantity' => 'required|numeric|min:0',
            'items.*.rejected_quantity' => 'nullable|numeric|min:0',
            'items.*.rejection_reason' => 'nullable|string|max:255',
            'items.*.roll_numbers' => 'nullable|string|max:255',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $tenantId = app('current_tenant_id');

        $po = \App\Models\PurchaseOrder::withoutGlobalScopes()->find($validated['purchase_order_id']);
        if (!$po || $po->tenant_id !== $tenantId) {
            return response()->json([
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر الشراء المحدد غير تابع لشركتك.',
            ], 403);
        }

        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner'
            && ($user->hasExplicitPermissionConfiguration() || !empty($assignedBranchIds));
        $poWarehouse = \App\Models\Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($po->warehouse_id);
        if (!$poWarehouse) {
            return response()->json(['error' => 'WarehouseNotFound', 'message' => 'مخزن أمر الشراء غير متاح.'], 404);
        }
        if ($enforceBranchScope && !in_array($poWarehouse->branch_id, $assignedBranchIds, true)) {
            return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك استلام أمر شراء تابع لفرع غير معيّن لحسابك.'], 403);
        }
        if (!empty($validated['warehouse_id'])) {
            $receiptWarehouse = \App\Models\Warehouse::where('tenant_id', $tenantId)->find($validated['warehouse_id']);
            if (!$receiptWarehouse) {
                return response()->json(['error' => 'WarehouseNotFound', 'message' => 'مخزن الاستلام غير تابع لشركتك أو غير متاح.'], 404);
            }
            if ($enforceBranchScope && !in_array($receiptWarehouse->branch_id, $assignedBranchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك الاستلام في مخزن تابع لفرع غير معيّن لحسابك.'], 403);
            }
        }

        $validated['tenant_id'] = $tenantId;
        $validated['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

        try {
            $grn = $this->procurementService->receiveGoods($validated);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            throw $e;
        }

        $statusCode = $grn->wasRecentlyCreated ? 201 : 200;

        return response()->json([
            'message' => $grn->wasRecentlyCreated
                ? 'تم استلام وفحص الخامات وترحيلها لدفتر المخزن بنجاح.'
                : 'تم استرجاع إذن الاستلام المسجل مسبقاً (Replay Idempotency).',
            'is_duplicate' => !$grn->wasRecentlyCreated,
            'goods_receipt_note' => $grn,
        ], $statusCode);
    }

    /**
     * تفاصيل إذن الاستلام والفحص
     */
    public function show(string $id): JsonResponse
    {
        $grn = GoodsReceiptNote::with(['items.inventoryItem', 'supplier', 'warehouse', 'purchaseOrder'])->findOrFail($id);

        return response()->json([
            'goods_receipt_note' => $grn,
        ]);
    }
}

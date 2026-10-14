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
        $query = GoodsReceiptNote::with(['supplier', 'warehouse', 'purchaseOrder'])->withCount('items');

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
        ]);

        $grn = $this->procurementService->receiveGoods($validated);

        return response()->json([
            'message' => 'تم استلام وفحص الخامات وترحيلها لدفتر المخزن بنجاح.',
            'goods_receipt_note' => $grn,
        ], 201);
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

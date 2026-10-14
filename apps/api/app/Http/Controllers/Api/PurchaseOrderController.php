<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Services\ProcurementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    protected ProcurementService $procurementService;

    public function __construct(ProcurementService $procurementService)
    {
        $this->procurementService = $procurementService;
    }

    /**
     * عرض أوامر الشراء مع الفلترة حسب الحالة والمورد
     */
    public function index(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with(['supplier', 'warehouse'])->withCount('items');

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        return response()->json($orders);
    }

    /**
     * إنشاء أمر شراء جديد
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'warehouse_id' => 'required|exists:warehouses,id',
            'order_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'discount_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.ordered_quantity' => 'required|numeric|min:0.001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
        ]);

        $po = $this->procurementService->createPurchaseOrder($validated);

        return response()->json([
            'message' => 'تم إنشاء أمر الشراء بنجاح بحالة مسودة.',
            'purchase_order' => $po,
        ], 201);
    }

    /**
     * عرض تفاصيل أمر الشراء مع بنوده وأذون استلامه وفواتيره
     */
    public function show(string $id): JsonResponse
    {
        $po = PurchaseOrder::with(['items.item', 'supplier', 'warehouse', 'receipts.items', 'invoices'])->findOrFail($id);

        return response()->json([
            'purchase_order' => $po,
        ]);
    }

    /**
     * اعتماد أمر الشراء
     */
    public function approve(string $id): JsonResponse
    {
        $po = $this->procurementService->approvePurchaseOrder($id);

        return response()->json([
            'message' => 'تم اعتماد أمر الشراء وأصبح جاهزاً للتوريد والاستلام.',
            'purchase_order' => $po,
        ]);
    }
}

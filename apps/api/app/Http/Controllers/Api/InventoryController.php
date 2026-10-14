<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        ]);

        $transaction = $this->inventoryService->recordTransaction($validated);

        return response()->json([
            'message' => 'تم ترحيل الحركة المخزنية وتحديث رصيد دفتر الأستاذ بنجاح.',
            'transaction' => $transaction,
        ], 201);
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
}

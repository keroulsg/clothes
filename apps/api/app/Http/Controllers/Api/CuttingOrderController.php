<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuttingOrder;
use App\Models\InventoryItem;
use App\Models\ProductionOrder;
use App\Models\Warehouse;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuttingOrderController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $orders = CuttingOrder::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'warehouse', 'bundles'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $orders,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'production_order_id' => 'required|uuid',
            'pattern_id' => 'nullable|uuid',
            'table_number' => 'nullable|string',
            'fabric_inventory_item_id' => 'nullable|uuid',
            'fabric_source' => 'required|in:factory_owned,customer_deposit',
            'customer_material_id' => 'nullable|uuid',
            'warehouse_id' => 'required|uuid',
            'fabric_color_id' => 'nullable|uuid',
            'usable_width_meters' => 'nullable|numeric|min:0.5',
            'lay_length_meters' => 'required|numeric|min:0.1',
            'layers_count' => 'required|integer|min:1',
            'marker_efficiency_percent' => 'nullable|numeric|min:0|max:100',
            'end_loss_meters' => 'nullable|numeric|min:0',
            'remnant_meters' => 'nullable|numeric|min:0',
            'fabric_relaxation_hours_actual' => 'nullable|numeric|min:0',
            'measured_shrinkage_percent' => 'nullable|numeric|min:0',
            'total_cut_pieces' => 'nullable|integer|min:1',
            'notes' => 'nullable|string',
            'bundle_configs' => 'nullable|array',
        ]);

        // التحقق من ملكية أمر الإنتاج والمخزن والصنف للشركة الحالية
        $prodOrder = ProductionOrder::withoutGlobalScopes()->find($validated['production_order_id']);
        if (!$prodOrder || $prodOrder->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر الإنتاج غير تابع لشركتك.',
            ], 403);
        }

        $warehouse = Warehouse::withoutGlobalScopes()->find($validated['warehouse_id']);
        if (!$warehouse || $warehouse->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: المخزن المحدد غير تابع لشركتك.',
            ], 403);
        }

        if (!empty($validated['fabric_inventory_item_id'])) {
            $fabricItem = InventoryItem::withoutGlobalScopes()->find($validated['fabric_inventory_item_id']);
            if (!$fabricItem || $fabricItem->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: صنف القماش المحدد غير تابع لشركتك.',
                ], 403);
            }
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $bundleConfigs = $validated['bundle_configs'] ?? [];

            $cuttingOrder = $this->productionService->executeCuttingOrder($data, $bundleConfigs);

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل أمر القص وصرف الأقمشة وتوليد بطاقات الحزم (Bundle Cards) بنجاح.',
                'data' => $cuttingOrder,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = CuttingOrder::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'warehouse', 'bundles.stageLogs'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }
}

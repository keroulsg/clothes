<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuttingBundle;
use App\Models\InventoryItem;
use App\Models\ProductionOrder;
use App\Models\QualityInspection;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QualityInspectionController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = QualityInspection::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'cuttingBundle', 'productionStage', 'defects']);

        if ($request->has('production_order_id')) {
            $query->where('production_order_id', $request->query('production_order_id'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'production_order_id' => 'required|uuid',
            'cutting_bundle_id' => 'nullable|uuid',
            'production_stage_id' => 'nullable|uuid',
            'inspector_name' => 'required|string',
            'inspection_type' => 'required|in:inline,end_of_line,final_audit',
            'inspected_quantity' => 'required|integer|min:1',
            'passed_quantity' => 'required|integer|min:0',
            'rejected_quantity' => 'nullable|integer|min:0',
            'rework_quantity' => 'nullable|integer|min:0',
            'decision' => 'nullable|string',
            'notes' => 'nullable|string',
            'finished_goods_inventory_item_id' => 'nullable|uuid',
            'defects' => 'nullable|array',
            'defects.*.defect_type' => 'required|string',
            'defects.*.severity' => 'nullable|string',
            'defects.*.quantity' => 'required|integer|min:1',
            'defects.*.corrective_action' => 'nullable|string',
        ]);

        $prodOrder = ProductionOrder::withoutGlobalScopes()->find($validated['production_order_id']);
        if (!$prodOrder || $prodOrder->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر الإنتاج غير تابع لشركتك.',
            ], 403);
        }

        if (!empty($validated['cutting_bundle_id'])) {
            $bundle = CuttingBundle::withoutGlobalScopes()->find($validated['cutting_bundle_id']);
            if (!$bundle || $bundle->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: بطاقة الحزمة غير تابعة لشركتك.',
                ], 403);
            }
        }

        if (!empty($validated['finished_goods_inventory_item_id'])) {
            $fgItem = InventoryItem::withoutGlobalScopes()->find($validated['finished_goods_inventory_item_id']);
            if (!$fgItem || $fgItem->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: صنف المنتج التام غير تابع لشركتك.',
                ], 403);
            }
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $defects = $validated['defects'] ?? [];

            $inspection = $this->productionService->recordQualityInspection($data, $defects);

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل تقرير فحص الجودة وتحديث أمر الإنتاج والحزمة بنجاح.',
                'data' => $inspection,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

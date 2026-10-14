<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillOfMaterial;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillOfMaterialController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $query = BillOfMaterial::where('tenant_id', $tenantId)->with(['garmentModel', 'items.inventoryItem']);

        if ($request->has('garment_model_id')) {
            $query->where('garment_model_id', $request->query('garment_model_id'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->header('X-Tenant-ID');
        $validated = $request->validate([
            'garment_model_id' => 'required|uuid',
            'version' => 'nullable|string',
            'bom_code' => 'nullable|string',
            'name' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|uuid',
            'items.*.color_id' => 'nullable|uuid',
            'items.*.size_id' => 'nullable|uuid',
            'items.*.component_type' => 'nullable|string',
            'items.*.consumption_per_unit' => 'required|numeric|min:0.0001',
            'items.*.unit_of_measure' => 'nullable|string',
            'items.*.waste_tolerance_percent' => 'nullable|numeric|min:0',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $bom = $this->productionService->createBom($data, $validated['items']);

            return response()->json([
                'success' => true,
                'message' => 'تم إنشاء شجرة المكونات والـ BOM بنجاح.',
                'data' => $bom,
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        try {
            $bom = $this->productionService->approveBom($id);

            return response()->json([
                'success' => true,
                'message' => 'تم اعتماد إصدار الـ BOM وأرشفة الإصدارات السابقة بنجاح.',
                'data' => $bom,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

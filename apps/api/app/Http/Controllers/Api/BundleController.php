<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuttingBundle;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BundleController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = CuttingBundle::where('tenant_id', $tenantId)
            ->with(['productionOrder.garmentModel', 'color', 'size', 'stageLogs.productionStage']);

        if ($request->has('production_order_id')) {
            $query->where('production_order_id', $request->query('production_order_id'));
        }
        if ($request->has('current_stage_code')) {
            $query->where('current_stage_code', $request->query('current_stage_code'));
        }
        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('created_at', 'desc')->get(),
        ]);
    }

    public function transfer(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $bundle = CuttingBundle::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'to_stage_code' => 'required|string',
            'operator_name' => 'nullable|string',
            'work_line' => 'nullable|string',
            'input_quantity' => 'required|integer|min:1',
            'output_accepted_quantity' => 'required|integer|min:0',
            'output_rejected_quantity' => 'nullable|integer|min:0',
            'scrap_quantity' => 'nullable|integer|min:0',
        ]);

        try {
            $log = $this->productionService->transferBundleStage(
                $bundle->id,
                $validated['to_stage_code'],
                $validated
            );

            return response()->json([
                'success' => true,
                'message' => 'تم نقل الحزمة وتسجيل حركة المرحلة بنجاح.',
                'data' => $log,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

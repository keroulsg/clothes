<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GarmentModel;
use App\Models\ProductionOrder;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductionOrderController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $orders = ProductionOrder::where('tenant_id', $tenantId)
            ->with(['garmentModel', 'billOfMaterial', 'items.color', 'items.size'])
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
            'garment_model_id' => 'required|uuid',
            'bill_of_material_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'planned_start_date' => 'required|date',
            'target_delivery_date' => 'required|date',
            'priority' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.color_id' => 'required|uuid',
            'items.*.size_id' => 'required|uuid',
            'items.*.product_variant_id' => 'nullable|uuid',
            'items.*.planned_quantity' => 'required|integer|min:1',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        // التحقق من ملكية الموديل للشركة الحالية
        $model = GarmentModel::withoutGlobalScopes()->find($validated['garment_model_id']);
        if (!$model || $model->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: موديل الملابس غير تابع لشركتك.',
            ], 403);
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $order = $this->productionService->createProductionOrder($data, $validated['items']);

            $statusCode = $order->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $order->wasRecentlyCreated
                    ? 'تم إنشاء أمر الإنتاج وتفصيل المقاسات بنجاح.'
                    : 'تم استرجاع أمر الإنتاج المسجل مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$order->wasRecentlyCreated,
                'data' => $order,
            ], $statusCode);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
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
        $order = ProductionOrder::where('tenant_id', $tenantId)
            ->with([
                'garmentModel',
                'billOfMaterial',
                'items.color',
                'items.size',
                'cuttingOrders.bundles',
                'qualityInspections.defects',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        // التحقق من ملكية أمر الإنتاج للشركة الحالية
        $order = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($id);

        try {
            $approvedOrder = $this->productionService->approveProductionOrder($order->id);

            return response()->json([
                'success' => true,
                'message' => 'تم اعتماد أمر الإنتاج وأصبح جاهزاً لصالة القص والتشغيل.',
                'data' => $approvedOrder,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function metrics(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($id);

        try {
            $metrics = $this->productionService->getProductionMetrics($order->id);

            return response()->json([
                'success' => true,
                'data' => $metrics,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

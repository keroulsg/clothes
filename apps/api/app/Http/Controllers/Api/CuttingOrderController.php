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
        $query = CuttingOrder::where('tenant_id', $tenantId)
            ->with([
                'productionOrder.garmentModel',
                'warehouse',
                'assignedCutter',
                'bundles.assignedEmployee',
                'bundles.color',
                'bundles.size',
                'bundles.stageLogs.employee',
                'bundles.stageLogs.productionStage',
            ]);

        if ($request->filled('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('cutting_order_number', 'like', "%{$s}%")
                  ->orWhere('marker_name', 'like', "%{$s}%")
                  ->orWhere('table_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%");
            });
        }

        if ($request->filled('production_order_id') && $request->query('production_order_id') !== 'all') {
            $query->where('production_order_id', $request->query('production_order_id'));
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('fabric_source') && $request->query('fabric_source') !== 'all') {
            $query->where('fabric_source', $request->query('fabric_source'));
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = (int) $request->query('per_page', 15);
            $paginated = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $paginated->items(),
                'meta' => [
                    'current_page' => $paginated->currentPage(),
                    'last_page' => $paginated->lastPage(),
                    'per_page' => $paginated->perPage(),
                    'total' => $paginated->total(),
                ],
            ]);
        }

        $orders = $query->orderBy('created_at', 'desc')->get();

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
            'assigned_cutter_id' => 'nullable|uuid',
            'cutter_unit_rate' => 'nullable|numeric|min:0',
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
            ->with([
                'productionOrder.garmentModel',
                'warehouse',
                'assignedCutter',
                'bundles.assignedEmployee',
                'bundles.color',
                'bundles.size',
                'bundles.stageLogs.employee',
                'bundles.stageLogs.productionStage',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = CuttingOrder::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:255',
        ]);

        try {
            $cancelled = $this->productionService->cancelCuttingOrder($order->id, $validated['cancellation_reason']);

            // توثيق سجل التدقيق
            \App\Models\AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()?->id,
                'action' => 'cutting_order_cancelled',
                'auditable_type' => CuttingOrder::class,
                'auditable_id' => $order->id,
                'old_values' => ['status' => $order->status],
                'new_values' => [
                    'status' => 'cancelled',
                    'cancellation_reason' => $validated['cancellation_reason'],
                    'cancelled_at' => $cancelled->cancelled_at,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم إلغاء أمر القص واسترجاع الأقمشة المصروفة إلى المخزن بنجاح.',
                'data' => $cancelled,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function archive(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = CuttingOrder::where('tenant_id', $tenantId)->findOrFail($id);

        $order->status = 'cut_completed';
        $order->save();

        // تحديث كافة الحزم المرتبطة لتصبح مكتملة
        \App\Models\CuttingBundle::where('tenant_id', $tenantId)
            ->where('cutting_order_id', $order->id)
            ->where('current_stage_code', '!=', 'completed')
            ->update([
                'current_stage_code' => 'completed',
                'status' => 'completed',
                'completion_date' => now()->toDateString(),
            ]);

        // تحديث حالة أمر الإنتاج المرتبط إذا كانت كافة أوامر القص الخاصة به مكتملة
        if ($order->production_order_id) {
            $prodOrder = \App\Models\ProductionOrder::where('tenant_id', $tenantId)->find($order->production_order_id);
            if ($prodOrder) {
                $hasActiveCuts = \App\Models\CuttingOrder::where('tenant_id', $tenantId)
                    ->where('production_order_id', $prodOrder->id)
                    ->where('id', '!=', $order->id)
                    ->whereNotIn('status', ['cut_completed', 'completed', 'cancelled'])
                    ->exists();

                if (!$hasActiveCuts) {
                    $prodOrder->status = 'completed';
                    $prodOrder->actual_completion_date = now()->toDateString();
                    if ($prodOrder->total_cut_quantity > 0 && $prodOrder->total_completed_quantity < $prodOrder->total_cut_quantity) {
                        $prodOrder->total_completed_quantity = $prodOrder->total_cut_quantity;
                    }
                    $prodOrder->save();
                }
            }
        }

        // توثيق سجل التدقيق
        \App\Models\AuditLog::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()?->id,
            'action' => 'cutting_order_archived',
            'auditable_type' => CuttingOrder::class,
            'auditable_id' => $order->id,
            'old_values' => ['status' => $order->getOriginal('status')],
            'new_values' => ['status' => 'cut_completed'],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'تم إنهاء وأرشفة القصة بنجاح ونقلها إلى سجل أرشيف القصات المكتملة.',
            'data' => $order->fresh([
                'productionOrder.garmentModel',
                'warehouse',
                'assignedCutter',
                'bundles.assignedEmployee',
                'bundles.color',
                'bundles.size',
                'bundles.stageLogs.employee',
                'bundles.stageLogs.productionStage',
            ]),
        ]);
    }
}

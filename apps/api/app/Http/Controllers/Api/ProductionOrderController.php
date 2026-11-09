<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\GarmentModel;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Services\ProductionService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductionOrderController extends Controller
{
    public function __construct(
        protected ProductionService $productionService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = ProductionOrder::where('tenant_id', $tenantId)
            ->with(['garmentModel', 'billOfMaterial', 'branch', 'customer', 'items.color', 'items.size']);

        // 1. بحث بالرقم أو الملاحظات أو المسؤول
        if ($request->filled('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                  ->orWhere('notes', 'like', "%{$s}%")
                  ->orWhere('responsible_person', 'like', "%{$s}%");
            });
        }

        // 2. فلترة الحالة
        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        // 3. فلترة الأولوية
        if ($request->filled('priority') && $request->query('priority') !== 'all') {
            $query->where('priority', $request->query('priority'));
        }

        // 4. فلترة الموديل
        if ($request->filled('garment_model_id') && $request->query('garment_model_id') !== 'all') {
            $query->where('garment_model_id', $request->query('garment_model_id'));
        }

        // 5. فلترة العميل
        if ($request->filled('customer_id') && $request->query('customer_id') !== 'all') {
            $query->where('customer_id', $request->query('customer_id'));
        }

        // دعم الترقيم والوضع المباشر
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
            'garment_model_id' => 'required|uuid',
            'bill_of_material_id' => 'nullable|uuid',
            'branch_id' => 'nullable|uuid',
            'customer_id' => 'nullable|uuid',
            'sales_order_id' => 'nullable|uuid',
            'planned_start_date' => 'required|date',
            'target_delivery_date' => 'required|date',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'responsible_person' => 'nullable|string|max:150',
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

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($id);

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => "لا يمكن تعديل أمر إنتاج بحالة [{$order->status}].",
            ], 422);
        }

        $validated = $request->validate([
            'planned_start_date' => 'sometimes|required|date',
            'target_delivery_date' => 'sometimes|required|date',
            'priority' => 'nullable|string|in:low,normal,high,urgent',
            'responsible_person' => 'nullable|string|max:150',
            'customer_id' => 'nullable|uuid',
            'sales_order_id' => 'nullable|uuid',
            'notes' => 'nullable|string',
            'items' => 'nullable|array|min:1',
            'items.*.id' => 'nullable|uuid',
            'items.*.color_id' => 'required_with:items|uuid',
            'items.*.size_id' => 'required_with:items|uuid',
            'items.*.product_variant_id' => 'nullable|uuid',
            'items.*.planned_quantity' => 'required_with:items|integer|min:1',
        ]);

        return DB::transaction(function () use ($order, $validated, $tenantId, $request) {
            $oldValues = $order->only(['priority', 'target_delivery_date', 'total_planned_quantity', 'responsible_person', 'notes']);

            $order->update([
                'planned_start_date' => $validated['planned_start_date'] ?? $order->planned_start_date,
                'target_delivery_date' => $validated['target_delivery_date'] ?? $order->target_delivery_date,
                'priority' => $validated['priority'] ?? $order->priority,
                'responsible_person' => array_key_exists('responsible_person', $validated) ? $validated['responsible_person'] : $order->responsible_person,
                'customer_id' => array_key_exists('customer_id', $validated) ? $validated['customer_id'] : $order->customer_id,
                'sales_order_id' => array_key_exists('sales_order_id', $validated) ? $validated['sales_order_id'] : $order->sales_order_id,
                'notes' => array_key_exists('notes', $validated) ? $validated['notes'] : $order->notes,
            ]);

            // تحديث البنود إن تم إرسالها ولم يبدأ القص بعد
            if (!empty($validated['items']) && in_array($order->status, ['draft', 'approved'])) {
                $totalPlanned = 0;
                foreach ($validated['items'] as $itemData) {
                    $totalPlanned += (int) $itemData['planned_quantity'];
                    if (!empty($itemData['id'])) {
                        ProductionOrderItem::where('tenant_id', $tenantId)
                            ->where('production_order_id', $order->id)
                            ->where('id', $itemData['id'])
                            ->update([
                                'color_id' => $itemData['color_id'],
                                'size_id' => $itemData['size_id'],
                                'planned_quantity' => (int) $itemData['planned_quantity'],
                            ]);
                    } else {
                        ProductionOrderItem::create([
                            'tenant_id' => $tenantId,
                            'production_order_id' => $order->id,
                            'product_variant_id' => $itemData['product_variant_id'] ?? null,
                            'color_id' => $itemData['color_id'],
                            'size_id' => $itemData['size_id'],
                            'planned_quantity' => (int) $itemData['planned_quantity'],
                            'cut_quantity' => 0,
                            'completed_quantity' => 0,
                            'scrapped_quantity' => 0,
                            'rework_quantity' => 0,
                        ]);
                    }
                }
                $order->total_planned_quantity = $totalPlanned;
                $order->save();
            }

            // توثيق سجل التدقيق
            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()?->id,
                'action' => 'production_order_updated',
                'auditable_type' => ProductionOrder::class,
                'auditable_id' => $order->id,
                'old_values' => $oldValues,
                'new_values' => $order->only(['priority', 'target_delivery_date', 'total_planned_quantity', 'responsible_person', 'notes']),
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم تحديث بيانات أمر الإنتاج بنجاح.',
                'data' => $order->fresh(['garmentModel', 'customer', 'items.color', 'items.size']),
            ]);
        });
    }

    public function cancel(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = ProductionOrder::where('tenant_id', $tenantId)->findOrFail($id);

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => "لا يمكن إلغاء أمر إنتاج بحالة [{$order->status}].",
            ], 422);
        }

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:255',
        ]);

        return DB::transaction(function () use ($order, $validated, $tenantId, $request) {
            $prevStatus = $order->status;
            $order->status = 'cancelled';
            $order->cancelled_at = now();
            $order->cancellation_reason = $validated['cancellation_reason'];
            $order->save();

            // توثيق سجل التدقيق
            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $request->user()?->id,
                'action' => 'production_order_cancelled',
                'auditable_type' => ProductionOrder::class,
                'auditable_id' => $order->id,
                'old_values' => ['status' => $prevStatus],
                'new_values' => [
                    'status' => 'cancelled',
                    'cancelled_at' => $order->cancelled_at,
                    'cancellation_reason' => $order->cancellation_reason,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'تم إلغاء أمر الإنتاج وتوثيق سبب الإلغاء في سجل التدقيق بنجاح.',
                'data' => $order,
            ]);
        });
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

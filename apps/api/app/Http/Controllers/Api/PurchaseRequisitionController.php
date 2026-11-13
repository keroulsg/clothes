<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseRequisition;
use App\Models\Warehouse;
use App\Services\ProcurementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class PurchaseRequisitionController extends Controller
{
    protected ProcurementService $procurementService;

    public function __construct(ProcurementService $procurementService)
    {
        $this->procurementService = $procurementService;
    }

    /**
     * عرض قائمة طلبات الشراء
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->all();
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $filters['branch_ids'] = $user->assignedBranchIds();
        }
        $requisitions = $this->procurementService->getPurchaseRequisitions($filters);
        return response()->json($requisitions);
    }

    /**
     * إنشاء طلب شراء جديد
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|uuid|exists:branches,id',
            'department' => 'nullable|string|max:100',
            'requisition_date' => 'nullable|date',
            'required_date' => 'nullable|date',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'reason' => 'nullable|string|max:500',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'nullable|uuid|exists:inventory_items,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.requested_quantity' => 'required|numeric|min:0.001',
            'items.*.unit_of_measure' => 'nullable|string|max:50',
            'items.*.estimated_unit_price' => 'nullable|numeric|min:0',
            'items.*.specifications' => 'nullable|string',
            'items.*.notes' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner';
        $branchId = $validated['branch_id'] ?? null;
        if ($branchId !== null && !\App\Models\Branch::where('tenant_id', $tenantId)->whereKey($branchId)->exists()) {
            return response()->json(['error' => 'BranchNotFound', 'message' => 'الفرع المحدد غير تابع لشركتك.'], 404);
        }
        if ($enforceBranchScope) {
            if (!$branchId && count($assignedBranchIds) === 1) {
                $branchId = $assignedBranchIds[0];
            }
            if (!$branchId || !in_array($branchId, $assignedBranchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'يجب إنشاء طلب الشراء على فرع معيّن لحسابك.'], 403);
            }
            $validated['branch_id'] = $branchId;
        }

        try {
            $requisition = $this->procurementService->createPurchaseRequisition($validated);
            return response()->json([
                'success' => true,
                'message' => 'تم إنشاء طلب الشراء بنجاح.',
                'data' => $requisition,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * عرض تفاصيل طلب شراء
     */
    public function show(string $id): JsonResponse
    {
        $this->scopeRequisitionsToAssignedBranches(PurchaseRequisition::where('tenant_id', app('current_tenant_id')), request())->findOrFail($id);
        $requisition = $this->procurementService->getPurchaseRequisition($id);
        return response()->json(['data' => $requisition]);
    }

    /**
     * إرسال طلب الشراء للاعتماد
     */
    public function submit(string $id): JsonResponse
    {
        $this->scopeRequisitionsToAssignedBranches(PurchaseRequisition::where('tenant_id', app('current_tenant_id')), request())->findOrFail($id);

        try {
            $requisition = $this->procurementService->submitPurchaseRequisition($id);
            return response()->json([
                'success' => true,
                'message' => 'تم إرسال طلب الشراء للاعتماد بنجاح.',
                'data' => $requisition,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * اعتماد طلب الشراء
     */
    public function approve(string $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.id' => 'required|uuid',
            'items.*.approved_quantity' => 'required|numeric|min:0',
        ]);

        $this->scopeRequisitionsToAssignedBranches(PurchaseRequisition::where('tenant_id', app('current_tenant_id')), $request)->findOrFail($id);

        try {
            $requisition = $this->procurementService->approvePurchaseRequisition($id, $data);
            return response()->json([
                'success' => true,
                'message' => 'تم اعتماد طلب الشراء بنجاح.',
                'data' => $requisition,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * رفض طلب الشراء
     */
    public function reject(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|min:3',
        ]);

        $this->scopeRequisitionsToAssignedBranches(PurchaseRequisition::where('tenant_id', app('current_tenant_id')), $request)->findOrFail($id);

        try {
            $requisition = $this->procurementService->rejectPurchaseRequisition($id, $request->reason);
            return response()->json([
                'success' => true,
                'message' => 'تم رفض طلب الشراء.',
                'data' => $requisition,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * تحويل طلب الشراء إلى أمر شراء رسمي
     */
    public function convert(string $id, Request $request): JsonResponse
    {
        $data = $request->validate([
            'supplier_id' => 'required|uuid|exists:suppliers,id',
            'warehouse_id' => 'nullable|uuid|exists:warehouses,id',
            'order_date' => 'nullable|date',
            'expected_delivery_date' => 'nullable|date',
            'tax_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
        ]);

        $requisition = $this->scopeRequisitionsToAssignedBranches(
            PurchaseRequisition::where('tenant_id', app('current_tenant_id')),
            $request
        )->findOrFail($id);
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $warehouse = !empty($data['warehouse_id'])
                ? Warehouse::where('tenant_id', app('current_tenant_id'))->find($data['warehouse_id'])
                : Warehouse::where('tenant_id', app('current_tenant_id'))
                    ->where('branch_id', $requisition->branch_id)
                    ->where('is_active', true)
                    ->orderBy('id')
                    ->first();
            if (!$warehouse || !$requisition->branch_id
                || $warehouse->branch_id !== $requisition->branch_id
                || !in_array($warehouse->branch_id, $branchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'يجب تحويل طلب الشراء إلى مخزن تابع لنفس فرع الطلب والمعيّن لحسابك.'], 403);
            }
            $data['warehouse_id'] = $warehouse->id;
        }

        try {
            $purchaseOrder = $this->procurementService->convertRequisitionToPurchaseOrder($id, $data);
            return response()->json([
                'success' => true,
                'message' => 'تم تحويل طلب الشراء إلى أمر شراء بنجاح.',
                'data' => $purchaseOrder->load(['supplier', 'warehouse', 'items.item']),
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * إلغاء طلب الشراء
     */
    public function cancel(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'reason' => 'required|string|min:3',
        ]);

        $this->scopeRequisitionsToAssignedBranches(PurchaseRequisition::where('tenant_id', app('current_tenant_id')), $request)->findOrFail($id);

        try {
            $requisition = $this->procurementService->cancelPurchaseRequisition($id, $request->reason);
            return response()->json([
                'success' => true,
                'message' => 'تم إلغاء طلب الشراء.',
                'data' => $requisition,
            ]);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }
    private function scopeRequisitionsToAssignedBranches($query, Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role === 'company_owner') {
            return $query;
        }

        return $query->whereIn('branch_id', $user->assignedBranchIds());
    }


}


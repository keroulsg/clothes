<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Services\MaintenanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function __construct(
        protected MaintenanceService $maintenanceService
    ) {}

    public function indexMachines(): JsonResponse
    {
        $machines = Machine::withCount('workOrders')->latest()->paginate(20);

        return response()->json($machines);
    }

    public function storeMachine(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'machine_code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'model_number' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'machine_type' => 'required|string|in:sewing,cutting,ironing,overlock,buttonhole,boiler,compressor,other',
            'location' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'warranty_expiry_date' => 'nullable|date',
            'status' => 'nullable|string|in:operational,under_maintenance,breakdown,retired',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'branch_id' => 'nullable|uuid',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner'
            && ($user->hasExplicitPermissionConfiguration() || !empty($assignedBranchIds));
        $branchId = $validated['branch_id'] ?? null;
        if ($branchId !== null && !\App\Models\Branch::where('tenant_id', $tenantId)->whereKey($branchId)->exists()) {
            return response()->json(['error' => 'BranchNotFound', 'message' => 'الفرع المحدد غير تابع لشركتك.'], 404);
        }
        if ($enforceBranchScope) {
            if (!$branchId && count($assignedBranchIds) === 1) {
                $branchId = $assignedBranchIds[0];
            }
            if (!$branchId || !in_array($branchId, $assignedBranchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'يجب اختيار فرع معيّن لحسابك لتسجيل الماكينة.'], 403);
            }
        }
        $validated['branch_id'] = $branchId;

        $machine = $this->maintenanceService->registerMachine($validated);

        return response()->json([
            'message' => 'Machine registered successfully.',
            'machine' => $machine,
        ], 201);
    }

    public function updateMachine(Request $request, string $id): JsonResponse
    {
        $machine = Machine::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'model_number' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'machine_type' => 'sometimes|string|in:sewing,cutting,ironing,overlock,buttonhole,boiler,compressor,other',
            'location' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'warranty_expiry_date' => 'nullable|date',
            'status' => 'sometimes|string|in:operational,under_maintenance,breakdown,retired',
            'maintenance_interval_days' => 'nullable|integer|min:1',
            'last_maintenance_date' => 'nullable|date',
            'next_maintenance_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $machine->update($validated);

        return response()->json([
            'message' => 'Machine updated successfully.',
            'machine' => $machine,
        ]);
    }

    public function indexWorkOrders(Request $request): JsonResponse
    {
        $query = MaintenanceWorkOrder::with(['machine', 'spareParts', 'journalEntry']);
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        if ($user && $user->role !== 'company_owner' && ($user->hasExplicitPermissionConfiguration() || !empty($branchIds))) {
            $query->whereHas('machine', fn ($machineQuery) => $machineQuery->whereIn('branch_id', $branchIds));
        }

        return response()->json($query->latest()->paginate(20));
    }

    public function storeWorkOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'machine_id' => 'required|uuid|exists:machines,id',
            'work_type' => 'required|string|in:preventive,breakdown,emergency,calibration',
            'priority' => 'required|string|in:low,medium,high,critical',
            'status' => 'nullable|string|in:scheduled,in_progress,completed,cancelled',
            'issue_description' => 'required|string',
            'reported_by' => 'nullable|string|max:255',
            'technician_name' => 'nullable|string|max:255',
            'downtime_hours' => 'nullable|numeric|min:0',
            'labor_cost' => 'nullable|numeric|min:0',
            'scheduled_date' => 'nullable|date',
            'spare_parts' => 'nullable|array',
            'spare_parts.*.part_name' => 'required|string|max:255',
            'spare_parts.*.part_number' => 'nullable|string|max:100',
            'spare_parts.*.quantity' => 'required|numeric|min:0.01',
            'spare_parts.*.unit_cost' => 'required|numeric|min:0',
            'spare_parts.*.inventory_item_id' => 'nullable|uuid',
        ]);

        $workOrder = $this->maintenanceService->createWorkOrder($validated);

        return response()->json([
            'message' => 'Maintenance work order created successfully.',
            'work_order' => $workOrder,
        ], 201);
    }

    public function addSparePart(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'part_name' => 'required|string|max:255',
            'part_number' => 'nullable|string|max:100',
            'quantity' => 'required|numeric|min:0.01',
            'unit_cost' => 'required|numeric|min:0',
            'inventory_item_id' => 'nullable|uuid',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        $workOrderQuery = MaintenanceWorkOrder::where('tenant_id', $tenantId)->whereKey($id);
        if ($user && $user->role !== 'company_owner' && ($user->hasExplicitPermissionConfiguration() || !empty($branchIds))) {
            $workOrderQuery->whereHas('machine', fn ($machineQuery) => $machineQuery->where(function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds)->orWhereNull('branch_id');
            }));
        }
        $workOrderQuery->firstOrFail();

        $part = $this->maintenanceService->addSparePart($id, $validated);

        return response()->json([
            'message' => 'Spare part added successfully.',
            'spare_part' => $part,
        ], 201);
    }

    public function indexSparePartsStock(): JsonResponse
    {
        $items = $this->maintenanceService->getSparePartsInventory();

        return response()->json([
            'spare_parts' => $items,
        ]);
    }

    public function storeSparePartStock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'warehouse_id' => 'nullable|uuid|exists:warehouses,id',
            'unit_of_measure' => 'nullable|string|max:50',
            'initial_balance' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner'
            && ($user->hasExplicitPermissionConfiguration() || !empty($assignedBranchIds));
        if (!empty($validated['warehouse_id'])) {
            $warehouse = \App\Models\Warehouse::where('tenant_id', $tenantId)->find($validated['warehouse_id']);
            if (!$warehouse) {
                return response()->json(['error' => 'WarehouseNotFound', 'message' => 'المخزن المحدد غير تابع لشركتك أو غير متاح.'], 404);
            }
            if ($enforceBranchScope && !in_array($warehouse->branch_id, $assignedBranchIds, true)) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك إضافة قطع غيار إلى مخزن تابع لفرع غير معيّن لحسابك.'], 403);
            }
        } elseif ($enforceBranchScope) {
            $warehouse = \App\Models\Warehouse::where('tenant_id', $tenantId)
                ->whereIn('branch_id', $assignedBranchIds)
                ->first();
            if (!$warehouse) {
                return response()->json(['error' => 'WarehouseNotFound', 'message' => 'لا يوجد مخزن متاح ضمن الفروع المعيّنة لحسابك.'], 422);
            }
            $validated['warehouse_id'] = $warehouse->id;
        }

        $item = $this->maintenanceService->addSparePartToStock($validated);

        return response()->json([
            'message' => 'تم تسجيل قطعة الغيار في رصيد المستودع بنجاح.',
            'item' => $item,
        ], 201);
    }

    public function completeWorkOrder(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'resolution_notes' => 'nullable|string',
            'downtime_hours' => 'nullable|numeric|min:0',
            'labor_cost' => 'nullable|numeric|min:0',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        $workOrderQuery = MaintenanceWorkOrder::where('tenant_id', $tenantId)->whereKey($id);
        if ($user && $user->role !== 'company_owner' && ($user->hasExplicitPermissionConfiguration() || !empty($branchIds))) {
            $workOrderQuery->whereHas('machine', fn ($machineQuery) => $machineQuery->where(function ($q) use ($branchIds) {
                $q->whereIn('branch_id', $branchIds)->orWhereNull('branch_id');
            }));
        }
        $workOrderQuery->firstOrFail();

        $workOrder = $this->maintenanceService->completeWorkOrder($id, $validated);

        return response()->json([
            'message' => 'Maintenance work order completed successfully.',
            'work_order' => $workOrder,
        ]);
    }

    public function downtimeSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        $branchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner'
            && ($user->hasExplicitPermissionConfiguration() || !empty($branchIds));
        $summary = $this->maintenanceService->getDowntimeSummary($enforceBranchScope ? $branchIds : null);

        return response()->json($summary);
    }
}

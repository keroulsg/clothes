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
        $query = $this->scopeToAssignedBranches(
            CuttingBundle::where('tenant_id', $tenantId),
            $request
        )->with(['productionOrder.garmentModel', 'color', 'size', 'assignedEmployee', 'stageLogs.productionStage']);

        if ($request->filled('search')) {
            $s = trim($request->query('search'));
            $query->where(function ($q) use ($s) {
                $q->where('bundle_code', 'like', "%{$s}%")
                  ->orWhere('work_group', 'like', "%{$s}%");
            });
        }

        if ($request->has('production_order_id') && $request->query('production_order_id') !== 'all') {
            $query->where('production_order_id', $request->query('production_order_id'));
        }
        if ($request->has('cutting_order_id') && $request->query('cutting_order_id') !== 'all') {
            $query->where('cutting_order_id', $request->query('cutting_order_id'));
        }
        if ($request->has('current_stage_code') && $request->query('current_stage_code') !== 'all') {
            $query->where('current_stage_code', $request->query('current_stage_code'));
        }
        if ($request->has('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }
        if ($request->has('assigned_employee_id') && $request->query('assigned_employee_id') !== 'all') {
            $query->where('assigned_employee_id', $request->query('assigned_employee_id'));
        }

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = (int) $request->query('per_page', 20);
            $paginated = $query->orderBy('bundle_number', 'asc')->paginate($perPage);

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

        return response()->json([
            'success' => true,
            'data' => $query->orderBy('bundle_number', 'asc')->get(),
        ]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $bundle = $this->scopeToAssignedBranches(CuttingBundle::where('tenant_id', $tenantId), $request)
            ->with(['productionOrder.garmentModel', 'color', 'size', 'assignedEmployee', 'stageLogs.productionStage', 'stageLogs.employee'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $bundle,
        ]);
    }

    public function assign(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $bundle = $this->scopeToAssignedBranches(CuttingBundle::where('tenant_id', $tenantId), $request)->findOrFail($id);

        $validated = $request->validate([
            'employee_id' => 'nullable|uuid',
            'work_group' => 'nullable|string|max:100',
            'issue_date' => 'nullable|date',
            'due_date' => 'nullable|date',
        ]);

        try {
            $updated = $this->productionService->assignBundle($bundle->id, $validated);

            return response()->json([
                'success' => true,
                'message' => 'تم إسناد الحزمة بنجاح.',
                'data' => $updated,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function history(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $bundle = $this->scopeToAssignedBranches(CuttingBundle::where('tenant_id', $tenantId), $request)
            ->with([
                'productionOrder.garmentModel',
                'color',
                'size',
                'assignedEmployee',
                'stageLogs' => fn($q) => $q->with(['productionStage', 'employee'])->orderBy('logged_at', 'asc'),
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'bundle' => $bundle,
                'timeline' => $bundle->stageLogs,
            ],
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
            'employee_id' => 'nullable|uuid',
            'input_quantity' => 'required|integer|min:1',
            'output_accepted_quantity' => 'required|integer|min:0',
            'output_rejected_quantity' => 'nullable|integer|min:0',
            'rework_quantity' => 'nullable|integer|min:0',
            'scrap_quantity' => 'nullable|integer|min:0',
            'unit_rate' => 'nullable|numeric|min:0',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
            'notes' => 'nullable|string',
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
    /**
     * Bundles have no direct branch_id; scope them through their production order
     * or the warehouse attached to their cutting order.
     */
    private function scopeToAssignedBranches($query, Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role === 'company_owner') {
            return $query;
        }

        $branchIds = $user->assignedBranchIds();
        if (!$user->hasExplicitPermissionConfiguration() && empty($branchIds)) {
            return $query;
        }

        return $query->where(function ($branchQuery) use ($branchIds) {
            $branchQuery
                ->whereHas('productionOrder', fn ($productionQuery) => $productionQuery->whereIn('branch_id', $branchIds))
                ->orWhereHas('cuttingOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        });
    }

}

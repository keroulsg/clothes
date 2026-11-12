<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockTransferController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * عرض قائمة تحويلات المخازن
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = $this->scopeTransfersToAssignedBranches(
            StockTransfer::where('tenant_id', $tenantId),
            $request
        )->with(['sourceWarehouse.branch', 'destinationWarehouse.branch', 'creator', 'receiver', 'items.inventoryItem'])
            ->withCount('items');

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('source_warehouse_id')) {
            $query->where('source_warehouse_id', $request->source_warehouse_id);
        }

        if ($request->filled('destination_warehouse_id')) {
            $query->where('destination_warehouse_id', $request->destination_warehouse_id);
        }

        $transfers = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        return response()->json($transfers);
    }

    /**
     * إنشاء طلب تحويل مخزني جديد
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'source_warehouse_id' => 'required|exists:warehouses,id',
            'destination_warehouse_id' => 'required|exists:warehouses,id|different:source_warehouse_id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        // التحقق من ملكية المخازن للشركة
        $source = Warehouse::where('tenant_id', $tenantId)->findOrFail($validated['source_warehouse_id']);
        $destination = Warehouse::where('tenant_id', $tenantId)->findOrFail($validated['destination_warehouse_id']);

        $transfer = DB::transaction(function () use ($tenantId, $validated, $source, $destination) {
            $transferNumber = 'TRF-' . date('Ymd') . '-' . rand(1000, 9999);

            $transferRecord = StockTransfer::create([
                'tenant_id' => $tenantId,
                'transfer_number' => $transferNumber,
                'source_warehouse_id' => $source->id,
                'destination_warehouse_id' => $destination->id,
                'status' => 'draft',
                'created_by' => auth()->id(),
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                $item = InventoryItem::where('tenant_id', $tenantId)
                    ->where('warehouse_id', $source->id)
                    ->findOrFail($itemData['inventory_item_id']);

                StockTransferItem::create([
                    'tenant_id' => $tenantId,
                    'stock_transfer_id' => $transferRecord->id,
                    'inventory_item_id' => $item->id,
                    'quantity' => (float) $itemData['quantity'],
                    'received_quantity' => 0,
                    'unit_cost' => (float) $item->average_cost,
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            return $transferRecord;
        });

        $transfer->load(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem']);

        return response()->json([
            'message' => 'تم إنشاء طلب التحويل المخزني بنجاح بحالة مسودة.',
            'transfer' => $transfer,
        ], 201);
    }

    /**
     * إرسال وشحن بضاعة التحويل (Dispatch -> In Transit)
     * تخصم الكمية من المستودع المصدر عبر حركة transfer_out
     */
    public function dispatch(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $transfer = DB::transaction(function () use ($id, $tenantId) {
            $transfer = $this->scopeTransfersToAssignedBranches(
                StockTransfer::where('tenant_id', $tenantId),
                $request
            )->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($transfer->status === 'dispatched' || $transfer->status === 'received') {
                return $transfer->fresh(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem']);
            }

            if ($transfer->status !== 'draft') {
                abort(422, "لا يمكن إرسال التحويل بحالته الحالية [{$transfer->status}].");
            }

            $transfer->load(['items.inventoryItem', 'sourceWarehouse', 'destinationWarehouse']);
            if ($transfer->items->isEmpty()) {
                abort(422, 'لا يمكن إرسال تحويل مخزني بدون بنود.');
            }

            foreach ($transfer->items as $transferItem) {
                $item = $transferItem->inventoryItem;
                if (!$item) {
                    throw new \RuntimeException("بند التحويل [{$transferItem->id}] لا يرتبط بصنف مخزني صالح.");
                }

                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $item->id,
                    'warehouse_id' => $transfer->source_warehouse_id,
                    'transaction_type' => 'transfer_out',
                    'direction' => 'OUT',
                    'quantity' => (float) $transferItem->quantity,
                    'unit_cost' => (float) $transferItem->unit_cost,
                    'reference_type' => 'stock_transfer',
                    'reference_id' => (string) $transferItem->id,
                    'reference_number' => $transfer->transfer_number,
                    'idempotency_key' => 'STOCK-TRANSFER-OUT-' . $transferItem->id,
                    'notes' => "تحويل مخزني صادر إلى مستودع [{$transfer->destinationWarehouse?->name}]",
                ]);
            }

            $transfer->status = 'dispatched';
            $transfer->dispatched_at = now();
            $transfer->save();

            return $transfer->fresh(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem']);
        });

        return response()->json([
            'message' => 'تم إرسال الشحنة وتسجيل حركات الصرف بصورة ذرية وآمنة من التكرار.',
            'transfer' => $transfer,
        ]);
    }

    /**
     * استلام بضاعة التحويل في المستودع الهدف (Receive -> In Destination)
     */
    public function receive(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $transfer = DB::transaction(function () use ($id, $tenantId) {
            $transfer = $this->scopeTransfersToAssignedBranches(
                StockTransfer::where('tenant_id', $tenantId),
                $request
            )->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($transfer->status === 'received') {
                return $transfer->fresh(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem']);
            }

            if ($transfer->status !== 'dispatched') {
                abort(422, "لا يمكن استلام التحويل بحالته الحالية [{$transfer->status}].");
            }

            $transfer->load(['items.inventoryItem', 'sourceWarehouse', 'destinationWarehouse']);
            if ($transfer->items->isEmpty()) {
                abort(422, 'لا يمكن استلام تحويل مخزني بدون بنود.');
            }

            // Serialize destination item creation across concurrent transfers to the same warehouse.
            Warehouse::where('tenant_id', $tenantId)
                ->whereKey($transfer->destination_warehouse_id)
                ->lockForUpdate()
                ->firstOrFail();

            foreach ($transfer->items as $transferItem) {
                $sourceItem = $transferItem->inventoryItem;
                if (!$sourceItem) {
                    throw new \RuntimeException("بند التحويل [{$transferItem->id}] لا يرتبط بصنف مصدر صالح.");
                }

                $destItem = InventoryItem::where('tenant_id', $tenantId)
                    ->where('warehouse_id', $transfer->destination_warehouse_id)
                    ->where('code', $sourceItem->code)
                    ->lockForUpdate()
                    ->first();

                if (!$destItem) {
                    $destItem = InventoryItem::create([
                        'tenant_id' => $tenantId,
                        'warehouse_id' => $transfer->destination_warehouse_id,
                        'variant_id' => $sourceItem->variant_id,
                        'item_type' => $sourceItem->item_type,
                        'code' => $sourceItem->code,
                        'name' => $sourceItem->name,
                        'name_en' => $sourceItem->name_en,
                        'unit_of_measure' => $sourceItem->unit_of_measure,
                        'reorder_level' => $sourceItem->reorder_level,
                        'current_balance' => 0.0,
                        'average_cost' => (float) $transferItem->unit_cost,
                        'technical_specs' => $sourceItem->technical_specs,
                    ]);
                }

                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $destItem->id,
                    'warehouse_id' => $transfer->destination_warehouse_id,
                    'transaction_type' => 'transfer_in',
                    'direction' => 'IN',
                    'quantity' => (float) $transferItem->quantity,
                    'unit_cost' => (float) $transferItem->unit_cost,
                    'reference_type' => 'stock_transfer',
                    'reference_id' => (string) $transferItem->id,
                    'reference_number' => $transfer->transfer_number,
                    'idempotency_key' => 'STOCK-TRANSFER-IN-' . $transferItem->id,
                    'notes' => "تحويل مخزني وارد من مستودع [{$transfer->sourceWarehouse?->name}]",
                ]);

                $transferItem->received_quantity = (float) $transferItem->quantity;
                $transferItem->save();
            }

            $transfer->status = 'received';
            $transfer->received_at = now();
            $transfer->received_by = auth()->id();
            $transfer->save();

            return $transfer->fresh(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem']);
        });

        return response()->json([
            'message' => 'تم استلام الشحنة وتسجيل حركات الإضافة بصورة ذرية وآمنة من التكرار.',
            'transfer' => $transfer,
        ]);
    }

    /**
     * عرض تفاصيل تحويل محدد
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $transfer = $this->scopeTransfersToAssignedBranches(
            StockTransfer::where('tenant_id', $tenantId),
            $request
        )
            ->with(['sourceWarehouse', 'destinationWarehouse', 'items.inventoryItem', 'creator', 'receiver'])
            ->findOrFail($id);

        return response()->json([
            'transfer' => $transfer,
        ]);
    }
    /**
     * A transfer crosses two warehouses. Staff must be assigned to both branches
     * before they can inspect, dispatch, or receive that transfer.
     */
    private function scopeTransfersToAssignedBranches($query, Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role === 'company_owner') {
            return $query;
        }

        $branchIds = $user->assignedBranchIds();
        if (!$user->hasExplicitPermissionConfiguration() && empty($branchIds)) {
            return $query;
        }

        return $query
            ->whereHas('sourceWarehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds))
            ->whereHas('destinationWarehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
    }

}


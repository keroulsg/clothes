<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\StockCount;
use App\Models\StockCountItem;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockCountController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * عرض قائمة جلسات الجرد الفعلي للمخازن
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = StockCount::where('tenant_id', $tenantId)
            ->with(['warehouse.branch', 'creator', 'approver'])
            ->withCount('items');

        if ($request->filled('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $counts = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        return response()->json($counts);
    }

    /**
     * إنشاء جلسة جرد جديدة وتثبيت الأرصدة الدفترية لحظياً (Snapshot)
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'count_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'category' => 'nullable|string',
            'item_ids' => 'nullable|array',
            'item_ids.*' => 'exists:inventory_items,id',
        ]);

        $warehouse = Warehouse::where('tenant_id', $tenantId)->findOrFail($validated['warehouse_id']);

        $stockCount = DB::transaction(function () use ($tenantId, $validated, $warehouse) {
            $countNumber = 'CNT-' . date('Ymd') . '-' . rand(1000, 9999);

            $count = StockCount::create([
                'tenant_id' => $tenantId,
                'count_number' => $countNumber,
                'warehouse_id' => $warehouse->id,
                'count_date' => $validated['count_date'] ?? date('Y-m-d'),
                'status' => 'draft',
                'created_by' => auth()->id(),
                'notes' => $validated['notes'] ?? null,
            ]);

            // استرجاع أصناف المستودع المعني مع تصفية التصنيف (خامات vs منتجات تامة)
            $itemsQuery = InventoryItem::where('tenant_id', $tenantId)
                ->where('warehouse_id', $warehouse->id);

            if (!empty($validated['category']) && $validated['category'] === 'raw_materials') {
                $itemsQuery->rawMaterials();
            } elseif (!empty($validated['category']) && $validated['category'] === 'finished_goods') {
                $itemsQuery->finishedGoods();
            }

            if (!empty($validated['item_ids'])) {
                $itemsQuery->whereIn('id', $validated['item_ids']);
            }

            $items = $itemsQuery->get();

            foreach ($items as $item) {
                $sysQty = (float) $item->current_balance;

                StockCountItem::create([
                    'tenant_id' => $tenantId,
                    'stock_count_id' => $count->id,
                    'inventory_item_id' => $item->id,
                    'system_quantity' => $sysQty,
                    'physical_quantity' => $sysQty, // افتراضياً مطابقة حتى تسجيل الفعلي
                    'difference_quantity' => 0.0,
                    'unit_cost' => (float) $item->average_cost,
                    'adjustment_status' => 'pending',
                ]);
            }

            return $count;
        });

        $stockCount->load(['warehouse', 'items.inventoryItem']);

        return response()->json([
            'message' => 'تم فتح جلسة الجرد وتثبيت الأرصدة الدفترية بنجاح.',
            'stock_count' => $stockCount,
        ], 201);
    }

    /**
     * تسجيل الكميات الفعلية للجرد وتحديث الفروقات
     */
    public function record(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $count = StockCount::where('tenant_id', $tenantId)->findOrFail($id);

        if ($count->status === 'approved') {
            return response()->json([
                'error' => 'CountAlreadyApproved',
                'message' => 'لا يمكن تعديل جلسة جرد معتمدة ومرحلة.',
            ], 422);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:stock_count_items,id',
            'items.*.physical_quantity' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:255',
        ]);

        DB::transaction(function () use ($count, $validated) {
            foreach ($validated['items'] as $it) {
                $countItem = StockCountItem::where('stock_count_id', $count->id)->find($it['item_id']);
                if ($countItem) {
                    $phys = (float) $it['physical_quantity'];
                    $diff = round($phys - (float)$countItem->system_quantity, 4);

                    $countItem->physical_quantity = $phys;
                    $countItem->difference_quantity = $diff;
                    if (isset($it['notes'])) $countItem->notes = $it['notes'];
                    $countItem->save();
                }
            }

            $count->status = 'in_progress';
            $count->save();
        });

        $count->load(['warehouse', 'items.inventoryItem']);

        return response()->json([
            'message' => 'تم حفظ نتائج الجرد الفعلي واحتساب الفروقات بنجاح.',
            'stock_count' => $count,
        ]);
    }

    /**
     * اعتماد الجرد وترحيل التسويات إلى دفتر الأستاذ المخزني
     * (لا يتم تعديل الأرصدة مباشرة إطلاقاً، بل عبر حركات دفتر الأستاذ)
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $count = DB::transaction(function () use ($id, $tenantId) {
            // Serialize approvals: two concurrent requests must never apply the same count twice.
            $count = StockCount::where('tenant_id', $tenantId)
                ->whereKey($id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($count->status === 'approved') {
                return $count->load(['warehouse', 'items.inventoryItem', 'approver']);
            }

            if ($count->status !== 'in_progress') {
                abort(422, 'لا يمكن اعتماد الجرد قبل تسجيل الكميات الفعلية ومراجعتها.');
            }

            $count->load(['items.inventoryItem', 'warehouse']);

            foreach ($count->items as $countItem) {
                $diff = (float) $countItem->difference_quantity;
                $item = $countItem->inventoryItem;

                if (!$item) {
                    throw new \\RuntimeException("صنف الجرد [{$countItem->id}] لم يعد مرتبطاً بسجل مخزني صالح.");
                }

                if ($diff > 0.0001 || $diff < -0.0001) {
                    $direction = $diff > 0 ? 'IN' : 'OUT';
                    $quantity = abs($diff);
                    $this->inventoryService->recordTransaction([
                        'tenant_id' => $tenantId,
                        'inventory_item_id' => $item->id,
                        'warehouse_id' => $count->warehouse_id,
                        'transaction_type' => $diff > 0 ? 'adjustment_positive' : 'adjustment_negative',
                        'direction' => $direction,
                        'quantity' => $quantity,
                        'unit_cost' => (float) $countItem->unit_cost,
                        'reference_type' => 'stock_count',
                        'reference_id' => (string) $countItem->id,
                        'reference_number' => $count->count_number,
                        'idempotency_key' => 'STOCK-COUNT-' . $count->id . '-' . $countItem->id,
                        'notes' => 'تسوية جرد معتمدة بجلسة ' . $count->count_number,
                    ]);
                    $countItem->adjustment_status = 'adjusted';
                } else {
                    $countItem->adjustment_status = 'matched';
                }
                $countItem->save();
            }

            $count->status = 'approved';
            $count->approved_by = auth()->id();
            $count->approved_at = now();
            $count->save();

            return $count->fresh(['warehouse', 'items.inventoryItem', 'approver']);
        });

        return response()->json([
            'message' => 'تم اعتماد محضر الجرد وترحيل التسويات رسمياً إلى دفتر الأستاذ المخزني.',
            'stock_count' => $count,
        ]);
    }

    /**
     * تفاصيل جلسة الجرد
     */
    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $count = StockCount::where('tenant_id', $tenantId)
            ->with(['warehouse.branch', 'items.inventoryItem', 'creator', 'approver'])
            ->findOrFail($id);

        $totalSystemQty = $count->items->sum('system_quantity');
        $totalPhysicalQty = $count->items->sum('physical_quantity');
        $totalDifferenceQty = $count->items->sum('difference_quantity');
        $totalDiscrepancyValue = $count->items->reduce(function ($acc, $it) {
            return $acc + ((float)$it->difference_quantity * (float)$it->unit_cost);
        }, 0.0);

        return response()->json([
            'stock_count' => $count,
            'summary' => [
                'total_items_count' => $count->items->count(),
                'total_system_quantity' => round($totalSystemQty, 4),
                'total_physical_quantity' => round($totalPhysicalQty, 4),
                'total_difference_quantity' => round($totalDifferenceQty, 4),
                'total_discrepancy_value' => round($totalDiscrepancyValue, 2),
            ],
        ]);
    }
}


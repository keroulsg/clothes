<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CuttingOrder;
use App\Models\CustomerMaterial;
use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    /**
     * عرض المخازن المتاحة للشركة مع الفلترة والبحث
     */
    public function warehouses(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = Warehouse::where('tenant_id', $tenantId)->with(['branch'])->withCount('items');
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $query->whereIn('branch_id', $user->assignedBranchIds());
        }

        if ($request->filled('branch_id') && $request->branch_id !== 'all') {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('manager_name', 'like', "%{$search}%");
            });
        }

        $warehouses = $query->orderBy('name')->get();

        return response()->json([
            'warehouses' => $warehouses,
            'total' => $warehouses->count(),
        ]);
    }

    /**
     * إنشاء مخزن جديد تابع للشركة مع دعم الأنواع القياسية والمخصصة
     */
    public function storeWarehouse(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'type' => 'required|string|max:50',
            'branch_id' => 'nullable|string|exists:branches,id',
            'address' => 'nullable|string|max:500',
            'manager_name' => 'nullable|string|max:255',
            'allow_negative_stock' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['branch_id'])) {
            $branch = \App\Models\Branch::where('tenant_id', $tenantId)->find($validated['branch_id']);
            if (!$branch) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'الفرع المحدد غير تابع لشركتك.',
                ], 403);
            }
        }

        $exists = Warehouse::where('tenant_id', $tenantId)->where('code', $validated['code'])->exists();
        if ($exists) {
            return response()->json([
                'error' => 'DuplicateWarehouseCode',
                'message' => 'كود المستودع مستخدم مسبقاً في شركتك.',
            ], 422);
        }

        $warehouse = Warehouse::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'code' => $validated['code'],
            'type' => $validated['type'],
            'branch_id' => $validated['branch_id'] ?? null,
            'address' => $validated['address'] ?? null,
            'manager_name' => $validated['manager_name'] ?? null,
            'allow_negative_stock' => $validated['allow_negative_stock'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        $warehouse->load('branch');

        return response()->json([
            'message' => 'تم إنشاء المستودع بنجاح.',
            'warehouse' => $warehouse,
        ], 201);
    }

    /**
     * تحديث بيانات مستودع
     */
    public function updateWarehouse(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $warehouse = Warehouse::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:50',
            'type' => 'sometimes|required|string|max:50',
            'branch_id' => 'nullable|string|exists:branches,id',
            'address' => 'nullable|string|max:500',
            'manager_name' => 'nullable|string|max:255',
            'allow_negative_stock' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['code']) && $validated['code'] !== $warehouse->code) {
            $exists = Warehouse::where('tenant_id', $tenantId)
                ->where('code', $validated['code'])
                ->where('id', '!=', $warehouse->id)
                ->exists();
            if ($exists) {
                return response()->json([
                    'error' => 'DuplicateWarehouseCode',
                    'message' => 'كود المستودع مستخدم مسبقاً في شركتك.',
                ], 422);
            }
        }

        if (isset($validated['branch_id']) && $validated['branch_id'] !== $warehouse->branch_id) {
            if ($validated['branch_id'] !== null) {
                $branch = \App\Models\Branch::where('tenant_id', $tenantId)->find($validated['branch_id']);
                if (!$branch) {
                    return response()->json([
                        'error' => 'CrossTenantAccessDenied',
                        'message' => 'الفرع المحدد غير تابع لشركتك.',
                    ], 403);
                }
            }
        }

        $warehouse->update($validated);
        $warehouse->load('branch');

        return response()->json([
            'message' => 'تم تحديث بيانات المستودع بنجاح.',
            'warehouse' => $warehouse,
        ]);
    }

    /**
     * حذف مستودع بعد التحقق من خلوه من الأرصدة والحركات
     */
    public function destroyWarehouse(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $warehouse = Warehouse::where('tenant_id', $tenantId)->withCount(['items', 'transactions'])->findOrFail($id);

        $hasStock = InventoryItem::where('tenant_id', $tenantId)
            ->where('warehouse_id', $warehouse->id)
            ->where('current_balance', '>', 0)
            ->exists();

        if ($hasStock || $warehouse->transactions_count > 0) {
            return response()->json([
                'error' => 'WarehouseNotEmpty',
                'message' => 'لا يمكن حذف المستودع نظراً لوجود أرصدة مخزنية أو حركات سابقة مسجلة عليه. يمكنك تعطيل المستودع بدلاً من حذفه.',
            ], 422);
        }

        // حذف الأصناف الصفرية إذا كانت غير مرتبطة بحركات
        InventoryItem::where('tenant_id', $tenantId)->where('warehouse_id', $warehouse->id)->delete();
        $warehouse->delete();

        return response()->json([
            'message' => 'تم حذف المستودع بنجاح.',
        ]);
    }

    /**
     * استرجاع أنواع المستودعات القياسية والمخصصة للشركة
     */
    public function warehouseTypes(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = \App\Models\Tenant::find($tenantId);

        $standardTypes = [
            ['code' => 'raw_materials', 'name' => 'مستودع الخامات والأقمشة', 'name_en' => 'Raw Materials & Fabric'],
            ['code' => 'finished_goods', 'name' => 'مستودع المنتجات التامة', 'name_en' => 'Finished Goods'],
            ['code' => 'wip', 'name' => 'مستودع تحت التشغيل (خط الإنتاج)', 'name_en' => 'Work in Progress (WIP)'],
            ['code' => 'accessories', 'name' => 'مستودع الإكسسوارات ومستلزمات الإنتاج', 'name_en' => 'Accessories & Trims'],
            ['code' => 'spare_parts', 'name' => 'مستودع قطع غيار الماكينات', 'name_en' => 'Machine Spare Parts'],
            ['code' => 'customer_custody', 'name' => 'مستودع أمانات وتشغيل للغير', 'name_en' => 'Customer Custody Materials'],
            ['code' => 'returns_damaged', 'name' => 'مستودع المرتجعات والهوالك', 'name_en' => 'Returns & Damaged Goods'],
            ['code' => 'general_storage', 'name' => 'مستودع التخزين العام', 'name_en' => 'General Storage'],
        ];

        $customTypes = $tenant?->settings['custom_warehouse_types'] ?? [];

        return response()->json([
            'standard_types' => $standardTypes,
            'custom_types' => $customTypes,
            'all_types' => array_merge($standardTypes, $customTypes),
        ]);
    }

    /**
     * إضافة نوع مستودع مخصص للشركة
     */
    public function storeWarehouseType(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50|alpha_dash',
            'name' => 'required|string|max:100',
            'name_en' => 'nullable|string|max:100',
        ]);

        $tenantId = app('current_tenant_id');
        $tenant = \App\Models\Tenant::findOrFail($tenantId);

        $settings = $tenant->settings ?? [];
        $customTypes = $settings['custom_warehouse_types'] ?? [];

        foreach ($customTypes as $t) {
            if ($t['code'] === $validated['code']) {
                return response()->json([
                    'error' => 'DuplicateTypeCode',
                    'message' => 'كود نوع المستودع موجود مسبقاً.',
                ], 422);
            }
        }

        $newType = [
            'code' => $validated['code'],
            'name' => $validated['name'],
            'name_en' => $validated['name_en'] ?? $validated['name'],
        ];

        $customTypes[] = $newType;
        $settings['custom_warehouse_types'] = $customTypes;
        $tenant->settings = $settings;
        $tenant->save();

        return response()->json([
            'message' => 'تمت إضافة نوع المستودع المخصص بنجاح.',
            'type' => $newType,
        ], 201);
    }

    /**
     * عرض كروت الأصناف المخزنية مع الفلترة والبحث وفصل المواد الخام عن البضاعة تامة الصنع
     */
    public function items(Request $request): JsonResponse
    {
        $query = InventoryItem::with(['warehouse', 'variant.garmentModel', 'variant.size', 'variant.color']);
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $query->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }

        // فلترة بحسب تصنيف الخامات vs المنتجات الجاهزة
        if ($request->has('category') && $request->category !== 'all') {
            if ($request->category === 'raw_materials') {
                $query->rawMaterials();
            } elseif ($request->category === 'finished_goods') {
                $query->finishedGoods();
            }
        }

        if ($request->has('warehouse_id') && $request->warehouse_id !== 'all') {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        if ($request->has('item_type') && $request->item_type !== 'all') {
            $query->where('item_type', $request->item_type);
        }

        if ($request->has('is_customer_owned')) {
            $query->where('is_customer_owned', filter_var($request->is_customer_owned, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('name')->paginate($request->input('per_page', 25));

        return response()->json($items);
    }

    /**
     * تعريف صنف مخزني جديد (خامة إنتاج أو منتج تام الصنع) مع تحديد موضع الرف / الستاند
     */
    public function storeItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|string|exists:warehouses,id',
            'item_type' => 'required|string|in:fabric_raw,accessory_raw,finished_good,packaging,fabric,accessory,finished_product,yarn,thread,trims,spare_parts,general',
            'code' => 'required|string|max:100',
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:100',
            'unit_of_measure' => 'required|string|max:50',
            'reorder_level' => 'nullable|numeric|min:0',
            'min_stock_level' => 'nullable|numeric|min:0',
            'average_cost' => 'nullable|numeric|min:0',
            'initial_balance' => 'nullable|numeric|min:0',
            'variant_id' => 'nullable|string|exists:product_variants,id',
            'is_customer_owned' => 'nullable|boolean',
            'customer_name' => 'nullable|string|max:255',
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'storage_zone' => 'nullable|string|max:100',
            'rack_location' => 'nullable|string|max:100',
            'shelf_bin_location' => 'nullable|string|max:100',
            'technical_specs' => 'nullable|array',
        ]);

        $tenantId = app('current_tenant_id');

        // التحقق من ملكية المخزن للشركة
        $warehouse = Warehouse::where('tenant_id', $tenantId)->find($validated['warehouse_id']);
        $user = $request->user();
        if (!$warehouse || ($user && $user->role !== 'company_owner' && !in_array($warehouse->branch_id, $user->assignedBranchIds(), true))) {
            return response()->json([
                'error' => 'CrossTenantAccessDenied',
                'message' => 'المخزن المحدد غير تابع لشركتك.',
            ], 403);
        }

        // منع تكرار الكود داخل نفس الشركة
        $exists = InventoryItem::where('tenant_id', $tenantId)->where('code', $validated['code'])->exists();
        if ($exists) {
            return response()->json([
                'error' => 'DuplicateItemCode',
                'message' => 'كود الصنف مستخدم مسبقاً في شركتك.',
            ], 422);
        }

        $specs = $validated['technical_specs'] ?? [];
        if (!empty($validated['storage_zone'])) $specs['storage_zone'] = $validated['storage_zone'];
        if (!empty($validated['rack_location'])) $specs['rack_location'] = $validated['rack_location'];
        if (!empty($validated['shelf_bin_location'])) $specs['shelf_bin_location'] = $validated['shelf_bin_location'];

        $initialBalance = (float) ($validated['initial_balance'] ?? 0.0);
        $avgCost = (float) ($validated['average_cost'] ?? 0.0);

        $item = DB::transaction(function () use ($tenantId, $validated, $specs, $initialBalance, $avgCost) {
            $created = InventoryItem::create([
                'tenant_id' => $tenantId,
                'warehouse_id' => $validated['warehouse_id'],
                'variant_id' => $validated['variant_id'] ?? null,
                'item_type' => $validated['item_type'],
                'code' => $validated['code'],
                'name' => $validated['name'],
                'name_en' => $validated['name_en'] ?? null,
                'barcode' => $validated['barcode'] ?? null,
                'unit_of_measure' => $validated['unit_of_measure'],
                'reorder_level' => $validated['reorder_level'] ?? 0.0,
                'min_stock_level' => $validated['min_stock_level'] ?? 0.0,
                'current_balance' => $initialBalance,
                'average_cost' => $avgCost,
                'is_customer_owned' => $validated['is_customer_owned'] ?? false,
                'customer_name' => $validated['customer_name'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
                'description' => $validated['description'] ?? null,
                'image_url' => $validated['image_url'] ?? null,
                'technical_specs' => $specs,
            ]);

            // إذا كان هناك رصيد افتتاحي، تسجيل حركة إثبات رصيد أولي في دفتر الأستاذ
            if ($initialBalance > 0) {
                InventoryTransaction::create([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $created->id,
                    'warehouse_id' => $created->warehouse_id,
                    'user_id' => auth()->id(),
                    'transaction_type' => 'adjustment_positive',
                    'direction' => 'IN',
                    'quantity' => $initialBalance,
                    'unit_cost' => $avgCost,
                    'total_cost' => round($initialBalance * $avgCost, 4),
                    'balance_before' => 0.0,
                    'balance_after' => $initialBalance,
                    'reference_type' => 'opening_balance',
                    'reference_number' => 'OPN-' . strtoupper(substr($created->id, 0, 8)),
                    'notes' => 'رصيد افتتاحي تأسيسي للصنف المخزني',
                ]);
            }

            return $created;
        });

        $item->load(['warehouse', 'variant.garmentModel', 'variant.size', 'variant.color']);

        return response()->json([
            'message' => 'تم إنشاء كارت الصنف المخزني وتوثيق موضع التخزين بنجاح.',
            'item' => $item,
        ], 201);
    }

    /**
     * تحديث بيانات كارت الصنف وموضع التخزين
     */
    public function updateItem(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $itemQuery = InventoryItem::where('tenant_id', $tenantId);
        $user = request()->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $itemQuery->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }
        $item = $itemQuery->find($id);

        if (!$item) {
            return response()->json([
                'error' => 'ItemNotFound',
                'message' => 'الصنف المخزني غير موجود أو غير تابع لشركتك.',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'barcode' => 'nullable|string|max:100',
            'reorder_level' => 'nullable|numeric|min:0',
            'min_stock_level' => 'nullable|numeric|min:0',
            'average_cost' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'description' => 'nullable|string',
            'image_url' => 'nullable|string|max:500',
            'storage_zone' => 'nullable|string|max:100',
            'rack_location' => 'nullable|string|max:100',
            'shelf_bin_location' => 'nullable|string|max:100',
            'technical_specs' => 'nullable|array',
        ]);

        if (isset($validated['name'])) $item->name = $validated['name'];
        if (isset($validated['name_en'])) $item->name_en = $validated['name_en'];
        if (isset($validated['barcode'])) $item->barcode = $validated['barcode'];
        if (isset($validated['reorder_level'])) $item->reorder_level = $validated['reorder_level'];
        if (isset($validated['min_stock_level'])) $item->min_stock_level = $validated['min_stock_level'];
        if (isset($validated['average_cost'])) $item->average_cost = $validated['average_cost'];
        if (isset($validated['is_active'])) $item->is_active = $validated['is_active'];
        if (isset($validated['description'])) $item->description = $validated['description'];
        if (isset($validated['image_url'])) $item->image_url = $validated['image_url'];

        $specs = $item->technical_specs ?? [];
        if (isset($validated['technical_specs'])) {
            $specs = array_merge($specs, $validated['technical_specs']);
        }
        if (isset($validated['storage_zone'])) $specs['storage_zone'] = $validated['storage_zone'];
        if (isset($validated['rack_location'])) $specs['rack_location'] = $validated['rack_location'];
        if (isset($validated['shelf_bin_location'])) $specs['shelf_bin_location'] = $validated['shelf_bin_location'];

        $item->technical_specs = $specs;
        $item->save();

        $item->load(['warehouse', 'variant.garmentModel', 'variant.size', 'variant.color']);

        return response()->json([
            'message' => 'تم تحديث بيانات الصنف المخزني وموضع التخزين بنجاح.',
            'item' => $item,
        ]);
    }

    /**
     * حذف صنف مخزني مع التحقق الصارم من عدم وجود رصيد أو حركات
     */
    public function destroyItem(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $itemQuery = InventoryItem::where('tenant_id', $tenantId);
        $user = request()->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $itemQuery->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }
        $item = $itemQuery->findOrFail($id);

        if ((float) $item->current_balance > 0) {
            return response()->json([
                'error' => 'ItemHasPositiveStock',
                'message' => "لا يمكن حذف الصنف نظراً لوجود رصيد حالي بالمخزن ({$item->current_balance} {$item->unit_of_measure}). يمكنك تعطيل الصنف بدلاً من الحذف.",
            ], 422);
        }

        if ($item->transactions()->exists()) {
            return response()->json([
                'error' => 'ItemHasTransactions',
                'message' => 'لا يمكن حذف الصنف لوجود حركات سابقة مسجلة عليه في دفتر الأستاذ للحفاظ على سلامة القيود والتدقيق المالي.',
            ], 422);
        }

        $item->delete();

        return response()->json([
            'message' => 'تم حذف كارت الصنف بنجاح.',
        ]);
    }

    /**
     * كارت الصنف المخزني التحليلي وحركات دفتر الأستاذ مع الأرصدة التراكمية
     */
    public function stockCard(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $itemQuery = InventoryItem::where('tenant_id', $tenantId);
        $user = request()->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $itemQuery->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }
        $item = $itemQuery->with(['warehouse.branch', 'variant.garmentModel', 'variant.size', 'variant.color'])
            ->findOrFail($id);

        $transactions = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('inventory_item_id', $item->id)
            ->with('user:id,name')
            ->orderBy('created_at', 'asc')
            ->get();

        $totalIn = $transactions->where('direction', 'IN')->sum('quantity');
        $totalOut = $transactions->where('direction', 'OUT')->sum('quantity');

        return response()->json([
            'item' => $item,
            'summary' => [
                'current_balance' => (float) $item->current_balance,
                'unit_of_measure' => $item->unit_of_measure,
                'average_cost' => (float) $item->average_cost,
                'total_valuation' => round((float) $item->current_balance * (float) $item->average_cost, 2),
                'total_in' => round((float) $totalIn, 4),
                'total_out' => round((float) $totalOut, 4),
                'reorder_level' => (float) $item->reorder_level,
                'min_stock_level' => (float) $item->min_stock_level,
                'is_low_stock' => (float) $item->current_balance <= (float) $item->reorder_level,
            ],
            'movements' => $transactions->map(fn($tx) => [
                'id' => $tx->id,
                'created_at' => $tx->created_at->format('Y-m-d H:i'),
                'transaction_type' => $tx->transaction_type,
                'direction' => $tx->direction,
                'quantity' => (float) $tx->quantity,
                'unit_cost' => (float) $tx->unit_cost,
                'total_cost' => (float) $tx->total_cost,
                'balance_before' => (float) $tx->balance_before,
                'balance_after' => (float) $tx->balance_after,
                'reference_type' => $tx->reference_type,
                'reference_number' => $tx->reference_number,
                'notes' => $tx->notes,
                'user_name' => $tx->user?->name ?? 'النظام الآلي',
            ]),
        ]);
    }

    /**
     * استرجاع قائمة وحدات القياس المتاحة للشركة
     */
    public function units(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $units = \App\Models\UnitOfMeasure::where(function ($q) use ($tenantId) {
            $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
        })->where('is_active', true)->orderBy('category')->orderBy('name')->get();

        // إذا كانت القائمة فارغة، إنشاء الوحدات القياسية الافتراضية لصناعة الملابس
        if ($units->isEmpty()) {
            $presets = [
                ['name' => 'متر طولي', 'symbol' => 'm', 'category' => 'length', 'base_unit' => 'm', 'conversion_factor' => 1.0],
                ['name' => 'سنتيمتر', 'symbol' => 'cm', 'category' => 'length', 'base_unit' => 'm', 'conversion_factor' => 0.01],
                ['name' => 'ياردا', 'symbol' => 'yd', 'category' => 'length', 'base_unit' => 'm', 'conversion_factor' => 0.9144],
                ['name' => 'كيلوجرام', 'symbol' => 'kg', 'category' => 'weight', 'base_unit' => 'kg', 'conversion_factor' => 1.0],
                ['name' => 'جرام', 'symbol' => 'g', 'category' => 'weight', 'base_unit' => 'kg', 'conversion_factor' => 0.001],
                ['name' => 'قطعة', 'symbol' => 'pcs', 'category' => 'count', 'base_unit' => 'pcs', 'conversion_factor' => 1.0],
                ['name' => 'دستة (12 قطعة)', 'symbol' => 'doz', 'category' => 'count', 'base_unit' => 'pcs', 'conversion_factor' => 12.0],
                ['name' => 'ثوب / طاقة قماش', 'symbol' => 'roll', 'category' => 'packaging', 'base_unit' => 'm', 'conversion_factor' => 50.0],
                ['name' => 'بكرة خيط', 'symbol' => 'spool', 'category' => 'count', 'base_unit' => 'pcs', 'conversion_factor' => 1.0],
                ['name' => 'كونة خيط', 'symbol' => 'cone', 'category' => 'count', 'base_unit' => 'kg', 'conversion_factor' => 1.0],
            ];

            foreach ($presets as $p) {
                \App\Models\UnitOfMeasure::create(array_merge($p, ['tenant_id' => $tenantId, 'is_active' => true]));
            }

            $units = \App\Models\UnitOfMeasure::where('tenant_id', $tenantId)->get();
        }

        return response()->json([
            'units' => $units,
        ]);
    }

    /**
     * إضافة وحدة قياس مخصصة للشركة
     */
    public function storeUnit(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'symbol' => 'required|string|max:30',
            'category' => 'required|string|in:length,weight,count,volume,packaging',
            'base_unit' => 'nullable|string|max:30',
            'conversion_factor' => 'nullable|numeric|min:0.000001',
        ]);

        $exists = \App\Models\UnitOfMeasure::where('tenant_id', $tenantId)
            ->where('symbol', $validated['symbol'])
            ->exists();

        if ($exists) {
            return response()->json([
                'error' => 'DuplicateUnitSymbol',
                'message' => 'رمز وحدة القياس موجود مسبقاً في شركتك.',
            ], 422);
        }

        $unit = \App\Models\UnitOfMeasure::create(array_merge($validated, [
            'tenant_id' => $tenantId,
            'is_active' => true,
            'conversion_factor' => $validated['conversion_factor'] ?? 1.0,
        ]));

        return response()->json([
            'message' => 'تم إنشاء وحدة القياس بنجاح.',
            'unit' => $unit,
        ], 201);
    }

    /**
     * استخراج بيانات بطاقة الباركود الحراري للرف / الصنف (Thermal Barcode Label)
     */
    public function itemLabel(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $item = InventoryItem::with(['warehouse', 'variant.garmentModel', 'variant.size', 'variant.color', 'tenant'])
            ->where('tenant_id', $tenantId)
            ->find($id);

        if (!$item) {
            return response()->json([
                'error' => 'ItemNotFound',
                'message' => 'الصنف المخزني غير موجود.',
            ], 404);
        }

        $labelData = [
            'item_id' => $item->id,
            'company_name' => $item->tenant?->name ?? 'GarmentOS Cloud',
            'item_code' => $item->code,
            'item_name' => $item->name,
            'item_type' => $item->item_type,
            'unit_of_measure' => $item->unit_of_measure,
            'current_balance' => (float) $item->current_balance,
            'storage_zone' => $item->storage_zone ?? 'المنطقة العامة',
            'rack_location' => $item->rack_location ?? 'R-01',
            'shelf_bin_location' => $item->shelf_bin_location ?? 'B-01',
            'warehouse_name' => $item->warehouse?->name ?? 'المخزن الرئيسي',
            'barcode_value' => $item->variant?->barcode ?? $item->code,
            'model_name' => $item->variant?->garmentModel?->name ?? null,
            'size' => $item->variant?->size?->name ?? null,
            'color' => $item->variant?->color?->name ?? null,
            'gsm' => $item->technical_specs['gsm'] ?? null,
            'usable_width' => $item->technical_specs['usable_width_meters'] ?? null,
            'generated_at' => now()->toIso8601String(),
        ];

        return response()->json([
            'success' => true,
            'label' => $labelData,
        ]);
    }


    /**
     * تسجيل حركة مخزنية رسمية (إذن استلام، إذن صرف، تسوية)
     */
    public function recordTransaction(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'transaction_type' => 'required|string|in:goods_receipt,material_issuance,adjustment_positive,adjustment_negative,transfer_in,transfer_out',
            'direction' => 'required|string|in:IN,OUT',
            'quantity' => 'required|numeric|min:0.0001',
            'unit_cost' => 'nullable|numeric|min:0',
            'reference_type' => 'nullable|string|max:100',
            'reference_number' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
            'batch_number' => 'nullable|string|max:100',
            'roll_number' => 'nullable|string|max:100',
            'technical_notes' => 'nullable|array',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $tenantId = app('current_tenant_id');

        // التحقق الصارم من ملكية الصنف للشركة الحالية ومنع التسلل بين الشركات
        $itemQuery = InventoryItem::where('tenant_id', $tenantId);
        if ($request->user() && $request->user()->role !== 'company_owner') {
            $branchIds = $request->user()->assignedBranchIds();
            $itemQuery->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }
        $item = $itemQuery->find($validated['inventory_item_id']);
        if (!$item) {
            return response()->json([
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: لا يمكن تسجيل حركة مخزنية لصنف غير تابع لشركتك.',
            ], 403);
        }

        // استخراج مفتاح عدم التكرار من الـ Header أو الـ Body
        $idempotencyKey = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);
        if ($idempotencyKey) {
            $validated['idempotency_key'] = $idempotencyKey;
        }

        $validated['tenant_id'] = $tenantId;

        $user = $request->user();
        $userRole = $user?->role;

        // 1. حظر مشرف المنصة العام من تنفيذ أي حركات تشغيلية داخل الشركات المستأجرة
        if ($userRole === 'platform_admin') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مشرف المنصة العام غير مصرح له بتنفيذ عمليات تشغيلية أو تعديل المخزون داخل الشركات المستأجرة.',
            ], 403);
        }

        // 2. حظر عمال التشغيل تماماً من ترحيل أي حركات مخزنية مباشرة (إضافة، صرف، تسوية)
        if ($userRole === 'worker') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: عمال التشغيل غير مصرح لهم بتسجيل حركات مخزنية مباشرة؛ يجب أن تتم حركات الصرف والاستلام عبر دورات العمل المعتمدة (أوامر القص ومحاضر الاستلام).',
            ], 403);
        }

        // 3. حظر الأدوار غير التشغيلية مثل مندوبي المبيعات
        if ($userRole === 'sales_rep') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مندوب المبيعات غير مصرح له بتعديل أرصدة الخامات والمخازن مباشرة.',
            ], 403);
        }

        // 4. تقييد العمليات بحسب الاختصاص المالي والإنتاجي والمخزني
        if ($userRole === 'accountant') {
            if ($validated['transaction_type'] === 'material_issuance') {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: المحاسب المالي غير مصرح له بصرف الخامات للإنتاج (مقتصرة على مدير الإنتاج وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole === 'production_manager') {
            if (in_array($validated['transaction_type'], ['adjustment_positive', 'adjustment_negative', 'goods_receipt'], true)) {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: مدير الإنتاج غير مصرح له بتسجيل تسويات جردية أو استلام توريدات مشتريات مباشرة (مقتصرة على المحاسبة وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole === 'warehouse_manager') {
            if (in_array($validated['transaction_type'], ['adjustment_positive', 'adjustment_negative'], true)) {
                return response()->json([
                    'error' => 'UnauthorizedRole',
                    'message' => 'أمان: مسؤول المستودع غير مصرح له بتسجيل تسويات جردية يدوية (مقتصرة على المحاسبة وإدارة المصنع).',
                ], 403);
            }
        } elseif ($userRole !== 'company_owner') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: دورك الحالي غير مصرح له بتسجيل حركات مخزنية مباشرة.',
            ], 403);
        }

        $refType = $validated['reference_type'] ?? null;
        $refNum = $validated['reference_number'] ?? null;

        // 5. التحقق الصارم من أنواع المستندات المرجعية المسموح بها ومنع المحارف غير المعترف بها
        if (!empty($refType)) {
            $validRefTypes = [
                'purchase_order', 'po',
                'cutting_order', 'production_order',
                'goods_receipt', 'grn',
                'manual_reference', 'inventory_audit', 'stock_transfer',
            ];
            if (!in_array($refType, $validRefTypes, true)) {
                return response()->json([
                    'error' => 'InvalidTransactionReference',
                    'message' => 'نوع المستند المرجعي غير معتمد في النظام.',
                ], 422);
            }
        }

        // 6. التحقق من اتساق نوع الحركة مع نوع المستند المرجعي
        $txType = $validated['transaction_type'];
        if (in_array($txType, ['adjustment_positive', 'adjustment_negative'], true)) {
            // التسويات الجردية اليدوية تقتصر على manual_reference أو inventory_audit
            if (!empty($refType) && !in_array($refType, ['manual_reference', 'inventory_audit'], true)) {
                return response()->json([
                    'error' => 'InvalidReferenceTypeForTransaction',
                    'message' => 'التسويات الجردية تقتصر على مراجع التسوية اليدوية (manual_reference) أو محاضر الجرد (inventory_audit).',
                ], 422);
            }
            if (empty($refType)) {
                $validated['reference_type'] = 'manual_reference';
                $refType = 'manual_reference';
            }
        } else {
            // العمليات التشغيلية (توريد، صرف، تحويل) تتطلب مستنداً مرجعياً حقيقياً ولا تقبل مراجع يدوية عشوائية
            if (empty($refType) || in_array($refType, ['manual_reference', 'inventory_audit'], true)) {
                return response()->json([
                    'error' => 'InvalidReferenceTypeForTransaction',
                    'message' => 'العمليات التشغيلية (التوريد، الصرف، التحويل) تتطلب مستنداً مرجعياً حقيقياً معتمداً (أمر شراء، أمر قص، أمر إنتاج، أمر تحويل) ولا تقبل التسجيل اليدوي العشوائي.',
                ], 422);
            }
            if (empty($refNum)) {
                return response()->json([
                    'error' => 'MissingReferenceNumber',
                    'message' => 'يجب إدخال رقم أو معرّف المستند المرجعي للعملية التشغيلية.',
                ], 422);
            }
        }

        $poAny = null;
        $poItem = null;

        // 7. التحقق العلائقي الصارم والتحقق من سياق الشركة وحالة المستند المرجعي
        if (in_array($refType, ['purchase_order', 'po'], true)) {
            $poAny = PurchaseOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('po_number', $refNum);
                })->first();

            if (!$poAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر الشراء المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $poAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر الشراء المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if (!in_array($poAny->status, ['approved', 'partially_received'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر شراء بحالة [{$poAny->status}]. يجب أن يكون معتمداً أو مستلماً جزئياً.",
                ], 422);
            }

            $poItem = PurchaseOrderItem::where('tenant_id', $tenantId)
                ->where('purchase_order_id', $poAny->id)
                ->where('inventory_item_id', $validated['inventory_item_id'])
                ->first();

            if (!$poItem) {
                return response()->json([
                    'error' => 'InvalidReferenceItem',
                    'message' => 'الصنف المخزني غير موجود ضمن بنود أمر الشراء المرجعي.',
                ], 422);
            }

            if ($txType === 'goods_receipt' && (float) $validated['quantity'] > (float) $poItem->remaining_quantity) {
                return response()->json([
                    'error' => 'OverReceiptNotPermitted',
                    'message' => "الكمية المطلوب استلامها [{$validated['quantity']}] تتجاوز الكمية المتبقية للتوريد في أمر الشراء [{$poItem->remaining_quantity}].",
                ], 422);
            }

            $validated['reference_id'] = $poAny->id;
            $validated['reference_number'] = $poAny->po_number;

        } elseif (in_array($refType, ['goods_receipt', 'grn'], true)) {
            $grnAny = GoodsReceiptNote::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('grn_number', $refNum);
                })->first();

            if (!$grnAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'إذن الاستلام المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $grnAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: إذن الاستلام المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if ($grnAny->status === 'cancelled') {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => 'إذن الاستلام المرجعي ملغى ولا يمكن تسجيل حركات عليه.',
                ], 422);
            }

            // منع تكرار استلام نفس إذن الاستلام لنفس الصنف
            $alreadyPosted = InventoryTransaction::where('tenant_id', $tenantId)
                ->where('inventory_item_id', $validated['inventory_item_id'])
                ->where(function ($q) use ($grnAny) {
                    $q->where('reference_id', $grnAny->id)
                      ->orWhere('reference_number', $grnAny->grn_number);
                })->exists();

            if ($alreadyPosted) {
                return response()->json([
                    'error' => 'DuplicateReceipt',
                    'message' => 'إذن الاستلام المرجعي تم ترحيله مخزنياً مسبقاً ولا يمكن استلامه مرة أخرى منعاً لتكرار الرصيد.',
                ], 422);
            }

            $validated['reference_id'] = $grnAny->id;
            $validated['reference_number'] = $grnAny->grn_number;

        } elseif ($refType === 'cutting_order') {
            $coAny = CuttingOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('cutting_order_number', $refNum);
                })->first();

            if (!$coAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر القص المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $coAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر القص المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if ($coAny->status === 'cancelled') {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => 'أمر القص المرجعي ملغى ولا يمكن تسجيل حركات عليه.',
                ], 422);
            }

            if ($coAny->fabric_inventory_item_id && $coAny->fabric_inventory_item_id !== $validated['inventory_item_id']) {
                return response()->json([
                    'error' => 'InvalidReferenceItem',
                    'message' => 'الصنف المخزني لا يطابق خامة القماش المعتمدة في أمر القص المرجعي.',
                ], 422);
            }

            $validated['reference_id'] = $coAny->id;
            $validated['reference_number'] = $coAny->cutting_order_number;

        } elseif ($refType === 'production_order') {
            $prodAny = ProductionOrder::withoutGlobalScopes()
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('order_number', $refNum);
                })->first();

            if (!$prodAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر الإنتاج المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $prodAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر الإنتاج المرجعي غير تابع لشركتك.',
                ], 403);
            }

            if (in_array($prodAny->status, ['draft', 'cancelled'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر إنتاج بحالة [{$prodAny->status}]. يجب أن يكون معتمداً أو قيد التشغيل.",
                ], 422);
            }

            $validated['reference_id'] = $prodAny->id;
            $validated['reference_number'] = $prodAny->order_number;

        } elseif ($refType === 'stock_transfer') {
            $stAny = DB::table('stock_transfers')
                ->where(function ($q) use ($refNum) {
                    $q->where('id', $refNum)->orWhere('transfer_number', $refNum);
                })->first();

            if (!$stAny) {
                return response()->json([
                    'error' => 'InvalidReferenceDocument',
                    'message' => 'أمر التحويل المخزني المرجعي غير موجود في النظام.',
                ], 422);
            }

            if ((string) $stAny->tenant_id !== (string) $tenantId) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر التحويل المخزني غير تابع لشركتك.',
                ], 403);
            }

            if (in_array($stAny->status, ['draft', 'cancelled'], true)) {
                return response()->json([
                    'error' => 'InvalidDocumentStatus',
                    'message' => "لا يمكن تسجيل حركة على أمر تحويل مخزني بحالة [{$stAny->status}].",
                ], 422);
            }

            $validated['reference_id'] = $stAny->id;
            $validated['reference_number'] = $stAny->transfer_number;
        }

        try {
            $transaction = DB::transaction(function () use ($validated, $poItem, $poAny) {
                $tx = $this->inventoryService->recordTransaction($validated);

                if (!empty($poItem) && !empty($poAny) && $validated['transaction_type'] === 'goods_receipt' && $tx->wasRecentlyCreated) {
                    $receivedQty = (float) $validated['quantity'];
                    $poItem->refresh();
                    $poItem->received_quantity = (float) $poItem->received_quantity + $receivedQty;
                    $poItem->remaining_quantity = max(0.0, (float) $poItem->remaining_quantity - $receivedQty);
                    $poItem->save();

                    $remainingTotal = PurchaseOrderItem::where('purchase_order_id', $poAny->id)->sum('remaining_quantity');
                    $poAny->refresh();
                    $poAny->status = $remainingTotal <= 0.0001 ? 'completed' : 'partially_received';
                    $poAny->save();
                }

                return $tx;
            });

            $isDuplicate = false;
            if ($idempotencyKey && $transaction->wasRecentlyCreated === false) {
                $isDuplicate = true;
            }

            return response()->json([
                'message' => $isDuplicate
                    ? 'تم استرجاع الحركة المسجلة مسبقاً بنجاح (Idempotent Request).'
                    : 'تم ترحيل الحركة المخزنية وتحديث رصيد دفتر الأستاذ بنجاح.',
                'is_duplicate' => $isDuplicate,
                'transaction' => $transaction,
            ], $isDuplicate ? 200 : 201);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            if (str_contains($e->getMessage(), 'أمان:')) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => $e->getMessage(),
                ], 403);
            }
            return response()->json([
                'error' => 'InvalidTransaction',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'TransactionFailed',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * عرض دفتر الأستاذ المخزني غير القابل للتعديل
     */
    public function transactions(Request $request): JsonResponse
    {
        $query = InventoryTransaction::with(['item', 'warehouse', 'user']);
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            $query->whereHas('warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
        }

        if ($request->has('inventory_item_id')) {
            $query->where('inventory_item_id', $request->inventory_item_id);
        }

        if ($request->has('warehouse_id')) {
            $query->where('warehouse_id', $request->warehouse_id);
        }

        $transactions = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 25));

        return response()->json($transactions);
    }

    /**
     * حاسبة التحويل الدقيقة للأقمشة (أمتار ↔ كجم) بناءً على GSM وعرض القماش الصالح للقص
     */
    public function convertFabric(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'required|in:meters_to_kg,kg_to_meters',
            'value' => 'required|numeric|min:0.01',
            'usable_width_meters' => 'required|numeric|min:0.1|max:5.0', // مثلاً 1.6 متر (160 سم)
            'gsm' => 'required|numeric|min:50|max:1000', // وزن المتر المربع
        ]);

        if ($validated['mode'] === 'meters_to_kg') {
            $result = $this->inventoryService->convertFabricMetersToKg(
                $validated['value'],
                $validated['usable_width_meters'],
                $validated['gsm']
            );
        } else {
            $result = $this->inventoryService->convertFabricKgToMeters(
                $validated['value'],
                $validated['usable_width_meters'],
                $validated['gsm']
            );
        }

        return response()->json([
            'success' => true,
            'conversion' => $result,
        ]);
    }

    /**
     * عرض وإدارة أمانات خامات العملاء
     */
    public function customerMaterials(Request $request): JsonResponse
    {
        $materials = CustomerMaterial::with('warehouse')->orderBy('created_at', 'desc')->get();

        return response()->json([
            'customer_materials' => $materials,
        ]);
    }

    /**
     * استلام وإثبات أمانة خامات عميل بالمخزن
     */
    public function receiveCustomerMaterial(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'fabric_name' => 'required|string|max:255',
            'fabric_code' => 'nullable|string|max:100',
            'gsm' => 'nullable|numeric|min:1',
            'usable_width_meters' => 'nullable|numeric|min:0.1',
            'received_meters' => 'required|numeric|min:0.01',
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'notes' => 'nullable|string',
        ]);

        try {
            $material = $this->inventoryService->receiveCustomerMaterial($validated);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'ValidationError',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم استلام أمانة خامة العميل وتوثيق الرصيد بالمخزن بنجاح.',
            'customer_material' => $material,
        ], 201);
    }

    /**
     * صرف جزء من أمانة خامة العميل مع حساب الهالك
     */
    public function consumeCustomerMaterial(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'consumed_meters' => 'required|numeric|min:0',
            'waste_meters' => 'nullable|numeric|min:0',
        ]);

        $wasteMeters = (float) ($validated['waste_meters'] ?? 0.0);

        try {
            $material = $this->inventoryService->consumeCustomerMaterial($id, (float) $validated['consumed_meters'], $wasteMeters);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'NotFound',
                'message' => 'خامة العميل غير موجودة أو غير تابعة للشركة.',
            ], 404);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'ValidationError',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'ConsumptionError',
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'تم صرف كمية خامة العميل وتحديث الأرصدة بنجاح.',
            'customer_material' => $material,
        ], 200);
    }
}

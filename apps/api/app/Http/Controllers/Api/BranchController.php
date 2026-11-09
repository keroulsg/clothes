<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BranchController extends Controller
{
    /**
     * عرض فروع الشركة مع عدد المخازن التابعة والفلترة
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = Branch::where('tenant_id', $tenantId)->withCount('warehouses');

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

        $branches = $query->orderBy('is_main', 'desc')->orderBy('name', 'asc')->get();

        return response()->json([
            'branches' => $branches,
            'total' => $branches->count(),
        ]);
    }

    /**
     * إنشاء فرع جديد للمصنع
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('branches')->where('tenant_id', $tenantId),
            ],
            'type' => 'required|string|in:factory,outlet,warehouse,head_office,workshop,cutting_center',
            'is_main' => 'boolean',
            'is_active' => 'boolean',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:255',
        ]);

        // إذا كان هذا الفرع رئيسي، إلغاء الصفة الرئيسية عن باقي الفروع
        if (!empty($validated['is_main'])) {
            Branch::where('tenant_id', $tenantId)->update(['is_main' => false]);
        }

        $branch = Branch::create(array_merge($validated, [
            'tenant_id' => $tenantId,
            'is_active' => $validated['is_active'] ?? true,
        ]));

        return response()->json([
            'message' => 'تم إنشاء الفرع بنجاح.',
            'branch' => $branch,
        ], 201);
    }

    /**
     * عرض تفاصيل فرع محدد
     */
    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $branch = Branch::where('tenant_id', $tenantId)->with('warehouses')->findOrFail($id);

        return response()->json([
            'branch' => $branch,
        ]);
    }

    /**
     * تحديث بيانات فرع محدد
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $branch = Branch::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('branches')->where('tenant_id', $tenantId)->ignore($branch->id),
            ],
            'type' => 'sometimes|required|string|in:factory,outlet,warehouse,head_office,workshop,cutting_center',
            'is_main' => 'boolean',
            'is_active' => 'boolean',
            'address' => 'nullable|string|max:500',
            'phone' => 'nullable|string|max:50',
            'manager_name' => 'nullable|string|max:255',
        ]);

        if (!empty($validated['is_main'])) {
            Branch::where('tenant_id', $tenantId)->where('id', '!=', $branch->id)->update(['is_main' => false]);
        }

        $branch->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات الفرع بنجاح.',
            'branch' => $branch,
        ]);
    }

    /**
     * حذف فرع مع التحقق من عدم وجود مخازن مرتبطة به
     */
    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $branch = Branch::where('tenant_id', $tenantId)->withCount('warehouses')->findOrFail($id);

        if ($branch->warehouses_count > 0) {
            return response()->json([
                'error' => 'BranchHasWarehouses',
                'message' => 'لا يمكن حذف الفرع نظراً لوجود مستودعات تابعة له. يرجى نقل أو حذف المستودعات أولاً.',
            ], 422);
        }

        $branch->delete();

        return response()->json([
            'message' => 'تم حذف الفرع بنجاح.',
        ]);
    }
}

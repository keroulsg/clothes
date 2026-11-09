<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SizeCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SizeCategoryController extends Controller
{
    /**
     * عرض قائمة تصنيفات المقاسات للمستأجر الحالي
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = SizeCategory::where('tenant_id', $tenantId)
            ->withCount('sizes')
            ->with(['sizes' => function ($q) {
                $q->withCount('variants')->orderBy('sort_order')->orderBy('name');
            }]);

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $categories = $query->orderBy('sort_order')->orderBy('name')->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    /**
     * إنشاء تصنيف مقاسات جديد
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('size_categories', 'name')->where('tenant_id', $tenantId),
            ],
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $maxOrder = SizeCategory::where('tenant_id', $tenantId)->max('sort_order') ?? 0;

        $category = SizeCategory::create([
            'tenant_id' => $tenantId,
            'name' => trim($validated['name']),
            'description' => isset($validated['description']) ? trim($validated['description']) : null,
            'sort_order' => isset($validated['sort_order']) ? (int) $validated['sort_order'] : $maxOrder + 1,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'تم إنشاء تصنيف المقاسات بنجاح.',
            'category' => $category->load('sizes'),
        ], 201);
    }

    /**
     * تفاصيل تصنيف المقاسات مع المقاسات والموديلات المرتبطة
     */
    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = SizeCategory::where('tenant_id', $tenantId)
            ->withCount('sizes')
            ->with(['sizes.variants.garmentModel'])
            ->findOrFail($id);

        return response()->json([
            'category' => $category,
            'is_used_in_production' => $category->isUsedInProductionOrInventory(),
        ]);
    }

    /**
     * تحديث بيانات تصنيف المقاسات
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = SizeCategory::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('size_categories', 'name')
                    ->where('tenant_id', $tenantId)
                    ->ignore($category->id),
            ],
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $category->update([
            'name' => isset($validated['name']) ? trim($validated['name']) : $category->name,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $category->description,
            'sort_order' => isset($validated['sort_order']) ? (int) $validated['sort_order'] : $category->sort_order,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $category->is_active,
        ]);

        return response()->json([
            'message' => 'تم تحديث تصنيف المقاسات بنجاح.',
            'category' => $category->fresh(['sizes']),
        ]);
    }

    /**
     * حذف تصنيف المقاسات مع الحماية الصارمة من الحذف التدميري
     */
    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = SizeCategory::where('tenant_id', $tenantId)->with('sizes')->findOrFail($id);

        if ($category->isUsedInProductionOrInventory()) {
            return response()->json([
                'error' => 'DestructiveDeleteRestricted',
                'message' => 'لا يمكن حذف هذا التصنيف نظراً لارتباط مقاساته بموديلات إنتاجية أو مخزون فعلي. يمكنك إيقاف تفعيله (أرشفته) بدلاً من ذلك.',
                'errors' => ['category' => ['Category sizes are in active use by variants or production.']],
            ], 422);
        }

        // إذا كان هناك مقاسات غير مستخدمة إنتاجياً، نقوم بحذفها بأمان
        $category->sizes()->delete();
        $category->delete();

        return response()->json([
            'message' => 'تم حذف تصنيف المقاسات والمقاسات التابعة له بنجاح.',
            'deleted' => true,
        ]);
    }
}


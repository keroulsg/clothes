<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClothingCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClothingCategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = ClothingCategory::where('tenant_id', $tenantId)
            ->with(['parent', 'children'])
            ->withCount(['models', 'products']);

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name_ar', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }

        $categories = $query->orderBy('name_ar')->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name_ar' => [
                'required',
                'string',
                'max:150',
                Rule::unique('clothing_categories', 'name_ar')->where('tenant_id', $tenantId),
            ],
            'name_en' => 'nullable|string|max:150',
            'code' => 'nullable|string|max:50',
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('clothing_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
        ]);

        $category = ClothingCategory::create([
            'tenant_id' => $tenantId,
            'name_ar' => trim($validated['name_ar']),
            'name_en' => isset($validated['name_en']) ? trim($validated['name_en']) : null,
            'code' => isset($validated['code']) ? strtoupper(trim($validated['code'])) : null,
            'parent_id' => $validated['parent_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'تم إضافة تصنيف الملابس بنجاح.',
            'category' => $category->load(['parent', 'children']),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = ClothingCategory::where('tenant_id', $tenantId)
            ->with(['parent', 'children'])
            ->withCount(['models', 'products'])
            ->findOrFail($id);

        return response()->json([
            'category' => $category,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = ClothingCategory::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name_ar' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('clothing_categories', 'name_ar')
                    ->where('tenant_id', $tenantId)
                    ->ignore($category->id),
            ],
            'name_en' => 'nullable|string|max:150',
            'code' => 'nullable|string|max:50',
            'parent_id' => [
                'nullable',
                'uuid',
                Rule::exists('clothing_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'description' => 'nullable|string|max:1000',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['parent_id']) && $validated['parent_id'] === $category->id) {
            return response()->json([
                'message' => 'لا يمكن اختيار التصنيف ليكون تصنيفاً رئيسياً لنفسه.',
                'errors' => ['parent_id' => ['Cannot set parent as self.']],
            ], 422);
        }

        $category->update(array_filter([
            'name_ar' => isset($validated['name_ar']) ? trim($validated['name_ar']) : $category->name_ar,
            'name_en' => array_key_exists('name_en', $validated) ? $validated['name_en'] : $category->name_en,
            'code' => array_key_exists('code', $validated) ? ($validated['code'] ? strtoupper(trim($validated['code'])) : null) : $category->code,
            'parent_id' => array_key_exists('parent_id', $validated) ? $validated['parent_id'] : $category->parent_id,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : $category->description,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $category->is_active,
        ], fn($v) => !is_null($v) || in_array($v, ['parent_id', 'description', 'name_en', 'code'], true)));

        return response()->json([
            'message' => 'تم تحديث تصنيف الملابس بنجاح.',
            'category' => $category->fresh(['parent', 'children']),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $category = ClothingCategory::where('tenant_id', $tenantId)->findOrFail($id);

        if ($category->models()->count() > 0 || $category->products()->count() > 0) {
            return response()->json([
                'message' => 'لا يمكن حذف التصنيف لأنه مرتبط بموديلات أو منتجات تجارية مفعلة. يمكنك إلغاء تفعيله بدلاً من ذلك.',
                'errors' => ['category' => ['Category is linked to existing models or products.']],
            ], 422);
        }

        $category->delete();

        return response()->json([
            'message' => 'تم حذف تصنيف الملابس بنجاح.',
            'deleted' => true,
        ]);
    }
}


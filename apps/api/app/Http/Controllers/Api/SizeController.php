<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Size;
use App\Models\SizeCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SizeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = Size::where('tenant_id', $tenantId)
            ->with('sizeCategory')
            ->withCount('variants');

        if ($request->has('size_category_id') && !empty($request->input('size_category_id')) && $request->input('size_category_id') !== 'all') {
            $query->where('size_category_id', $request->input('size_category_id'));
        } elseif ($request->has('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        if ($request->has('is_active') && $request->input('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where('name', 'like', "%{$search}%");
        }

        $sizes = $query->orderBy('sort_order')->orderBy('name')->get();

        return response()->json([
            'sizes' => $sizes,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:100',
                Rule::unique('sizes', 'name')
                    ->where('tenant_id', $tenantId)
                    ->where(function ($q) use ($request) {
                        if ($request->filled('size_category_id')) {
                            $q->where('size_category_id', $request->input('size_category_id'));
                        } else {
                            $q->where('category', $request->input('category', 'general'));
                        }
                    }),
            ],
            'size_category_id' => [
                'nullable',
                'uuid',
                Rule::exists('size_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'category' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $sizeCategoryId = $validated['size_category_id'] ?? null;
        $categoryName = $validated['category'] ?? null;

        if ($sizeCategoryId) {
            $sizeCategory = SizeCategory::where('tenant_id', $tenantId)->find($sizeCategoryId);
            if ($sizeCategory) {
                $categoryName = $sizeCategory->name;
            }
        }

        if (empty($categoryName)) {
            $categoryName = 'general';
        }

        $maxOrder = Size::where('tenant_id', $tenantId)->max('sort_order') ?? 0;

        $size = Size::create([
            'tenant_id' => $tenantId,
            'size_category_id' => $sizeCategoryId,
            'name' => trim($validated['name']),
            'category' => $categoryName,
            'sort_order' => isset($validated['sort_order']) ? (int) $validated['sort_order'] : $maxOrder + 1,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'تم إضافة المقاس بنجاح.',
            'size' => $size->load('sizeCategory'),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $size = Size::where('tenant_id', $tenantId)
            ->with('sizeCategory')
            ->withCount('variants')
            ->findOrFail($id);

        return response()->json([
            'size' => $size,
            'is_used_in_production' => $size->isUsedInProductionOrInventory(),
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $size = Size::where('tenant_id', $tenantId)->findOrFail($id);

        $sizeCategoryId = $request->input('size_category_id', $size->size_category_id);
        $category = $request->input('category', $size->category);

        if ($request->filled('size_category_id')) {
            $sizeCategory = SizeCategory::where('tenant_id', $tenantId)->find($sizeCategoryId);
            if ($sizeCategory) {
                $category = $sizeCategory->name;
            }
        }

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('sizes', 'name')
                    ->where('tenant_id', $tenantId)
                    ->where(function ($q) use ($sizeCategoryId, $category) {
                        if ($sizeCategoryId) {
                            $q->where('size_category_id', $sizeCategoryId);
                        } else {
                            $q->where('category', $category);
                        }
                    })
                    ->ignore($size->id),
            ],
            'size_category_id' => [
                'nullable',
                'uuid',
                Rule::exists('size_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'category' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $size->update([
            'name' => isset($validated['name']) ? trim($validated['name']) : $size->name,
            'size_category_id' => array_key_exists('size_category_id', $validated) ? $validated['size_category_id'] : $size->size_category_id,
            'category' => $category,
            'sort_order' => isset($validated['sort_order']) ? (int) $validated['sort_order'] : $size->sort_order,
            'is_active' => array_key_exists('is_active', $validated) ? (bool) $validated['is_active'] : $size->is_active,
        ]);

        return response()->json([
            'message' => 'تم تحديث المقاس بنجاح.',
            'size' => $size->fresh(['sizeCategory']),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $size = Size::where('tenant_id', $tenantId)->findOrFail($id);

        if ($size->isUsedInProductionOrInventory()) {
            return response()->json([
                'error' => 'DestructiveDeleteRestricted',
                'message' => 'لا يمكن حذف المقاس نهائياً نظراً لوجود متغيرات موديلات أو أوامر قص وتشغيل مرتبطة به. يرجى إيقاف تفعيله بدلاً من حذفه.',
                'errors' => ['size' => ['Size has existing variants or production usage.']],
            ], 422);
        }

        $size->delete();

        return response()->json([
            'message' => 'تم حذف المقاس بنجاح.',
            'deleted' => true,
        ]);
    }
}

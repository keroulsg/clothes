<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Color;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ColorController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = Color::where('tenant_id', $tenantId)->withCount('variants');

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('pantone_ref', 'like', "%{$search}%");
            });
        }

        $colors = $query->orderBy('name')->get();

        return response()->json([
            'colors' => $colors,
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
                Rule::unique('colors', 'name')->where('tenant_id', $tenantId),
            ],
            'color_code' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'pantone_ref' => 'nullable|string|max:50',
        ]);

        $color = Color::create([
            'tenant_id' => $tenantId,
            'name' => trim($validated['name']),
            'color_code' => strtolower(trim($validated['color_code'])),
            'pantone_ref' => isset($validated['pantone_ref']) ? trim($validated['pantone_ref']) : null,
        ]);

        return response()->json([
            'message' => 'تم إضافة اللون بنجاح.',
            'color' => $color,
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $color = Color::where('tenant_id', $tenantId)->withCount('variants')->findOrFail($id);

        return response()->json([
            'color' => $color,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $color = Color::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('colors', 'name')->where('tenant_id', $tenantId)->ignore($color->id),
            ],
            'color_code' => ['sometimes', 'required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'pantone_ref' => 'nullable|string|max:50',
        ]);

        $color->update([
            'name' => isset($validated['name']) ? trim($validated['name']) : $color->name,
            'color_code' => isset($validated['color_code']) ? strtolower(trim($validated['color_code'])) : $color->color_code,
            'pantone_ref' => array_key_exists('pantone_ref', $validated) ? $validated['pantone_ref'] : $color->pantone_ref,
        ]);

        return response()->json([
            'message' => 'تم تحديث اللون بنجاح.',
            'color' => $color->fresh(),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $color = Color::where('tenant_id', $tenantId)->findOrFail($id);

        if ($color->variants()->count() > 0) {
            return response()->json([
                'message' => 'تعذر حذف اللون نظراً لوجود متغيرات وموديلات ملابس مرتبطة به.',
                'errors' => ['color' => ['Color has existing variants.']],
            ], 422);
        }

        $color->delete();

        return response()->json([
            'message' => 'تم حذف اللون بنجاح.',
            'deleted' => true,
        ]);
    }
}

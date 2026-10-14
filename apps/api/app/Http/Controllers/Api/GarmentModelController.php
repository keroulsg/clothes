<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\ProductVariant;
use App\Models\Size;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class GarmentModelController extends Controller
{
    /**
     * عرض قائمة الموديلات مع الفلترة والبحث
     */
    public function index(Request $request): JsonResponse
    {
        $query = GarmentModel::withCount('variants');

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($request->has('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        $models = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        return response()->json($models);
    }

    /**
     * إنشاء موديل جديد وتوليد متغيرات المقاسات والألوان وأكواد SKU والباركود آلياً
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'required|string|max:255',
            'category' => 'required|string|max:100',
            'season' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'target_cost' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'retail_price' => 'nullable|numeric|min:0',
            'technical_specs' => 'nullable|array',
            'size_ids' => 'required|array|min:1',
            'size_ids.*' => 'exists:sizes,id',
            'color_ids' => 'required|array|min:1',
            'color_ids.*' => 'exists:colors,id',
        ]);

        return DB::transaction(function () use ($validated) {
            $tenantId = app('current_tenant_id');

            $model = GarmentModel::create([
                'tenant_id' => $tenantId,
                'code' => strtoupper($validated['code']),
                'name' => $validated['name'],
                'category' => $validated['category'],
                'season' => $validated['season'] ?? 'صيف 2026',
                'description' => $validated['description'] ?? null,
                'target_cost' => $validated['target_cost'] ?? 0,
                'wholesale_price' => $validated['wholesale_price'] ?? 0,
                'retail_price' => $validated['retail_price'] ?? 0,
                'technical_specs' => $validated['technical_specs'] ?? null,
                'status' => 'active',
            ]);

            $sizes = Size::whereIn('id', $validated['size_ids'])->get();
            $colors = Color::whereIn('id', $validated['color_ids'])->get();

            $variants = [];
            foreach ($sizes as $size) {
                foreach ($colors as $color) {
                    $sku = $model->code . '-' . strtoupper(Str::slug($size->name)) . '-' . strtoupper(Str::slug($color->name));
                    $barcode = '622' . rand(1000000000, 9999999999); // باركود قياسي فريد

                    $variant = ProductVariant::create([
                        'tenant_id' => $tenantId,
                        'garment_model_id' => $model->id,
                        'size_id' => $size->id,
                        'color_id' => $color->id,
                        'sku' => $sku,
                        'barcode' => $barcode,
                        'wholesale_price' => $model->wholesale_price,
                        'retail_price' => $model->retail_price,
                    ]);

                    $variants[] = $variant;
                }
            }

            return response()->json([
                'message' => 'تم إنشاء الموديل وتوليد جميع المتغيرات بنجاح.',
                'model' => $model,
                'generated_variants_count' => count($variants),
            ], 201);
        });
    }

    /**
     * عرض تفاصيل الموديل مع قائمة المتغيرات
     */
    public function show(string $id): JsonResponse
    {
        $model = GarmentModel::with(['variants.size', 'variants.color'])->findOrFail($id);

        return response()->json([
            'model' => $model,
        ]);
    }
}

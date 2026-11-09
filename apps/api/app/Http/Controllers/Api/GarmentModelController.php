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
use Illuminate\Validation\Rule;
use Illuminate\Database\QueryException;

class GarmentModelController extends Controller
{
    /**
     * عرض قائمة الموديلات مع الفلترة والبحث
     */
    public function index(Request $request): JsonResponse
    {
        $query = GarmentModel::withCount('variants')->with(['variants.size', 'variants.color', 'variants.product']);

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
        $tenantId = app('current_tenant_id');

        if ($request->has('code')) {
            $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);
        }

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('garment_models', 'code')->where('tenant_id', $tenantId),
            ],
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

        try {
            return DB::transaction(function () use ($validated, $tenantId) {

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
            if ($sizes->count() !== count($validated['size_ids'])) {
                abort(response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أحد المقاسات المحددة غير تابع لشركتك.',
                ], 403));
            }

            $colors = Color::whereIn('id', $validated['color_ids'])->get();
            if ($colors->count() !== count($validated['color_ids'])) {
                abort(response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أحد الألوان المحددة غير تابع لشركتك.',
                ], 403));
            }

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
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isUniqueConstraintViolation($e)) {
                return response()->json([
                    'message' => 'كود الموديل مستخدم مسبقاً في شركتك. يرجى اختيار كود فريد.',
                    'errors' => [
                        'code' => ['The code has already been taken.'],
                    ],
                ], 422);
            }
            throw $e;
        }
    }

    /**
     * فحص وتصنيف دقيق لخرق قيد التفرد (Unique Constraint Violation) بحسب محرك قاعدة البيانات
     * لضمان عدم ترجمة أخطاء القيود الأخرى (مثل NOT NULL أو Foreign Key) إلى خطأ تكرار الكود
     */
    protected function isUniqueConstraintViolation(\Illuminate\Database\QueryException $e): bool
    {
        $sqlState = (string) ($e->errorInfo[0] ?? $e->getCode());
        $driverCode = $e->errorInfo[1] ?? null;
        $message = $e->getMessage();

        // 1. PostgreSQL: SQLSTATE 23505 (unique_violation)
        if ($sqlState === '23505' || str_contains($message, 'duplicate key value violates unique constraint')) {
            return true;
        }

        // 2. SQLite: SQLSTATE 23000 مع التحقق الصارم من توقيع "UNIQUE constraint failed"
        // يستبعد أخطاء NOT NULL (19 NOT NULL constraint failed) و Foreign Key
        if (($sqlState === '23000' || $driverCode === 19 || $driverCode === 2067) && str_contains($message, 'UNIQUE constraint failed')) {
            return true;
        }

        // 3. MySQL / MariaDB: SQLSTATE 23000 مع كود الخطأ 1062 (ER_DUP_ENTRY)
        if ($sqlState === '23000' && ($driverCode === 1062 || str_contains($message, 'Duplicate entry'))) {
            return true;
        }

        return false;
    }

    /**
     * عرض تفاصيل الموديل مع قائمة المتغيرات
     */
    public function show(string $id): JsonResponse
    {
        $model = GarmentModel::with(['variants.size', 'variants.color', 'clothingCategory'])->findOrFail($id);

        return response()->json([
            'model' => $model,
        ]);
    }

    /**
     * تحديث بيانات الموديل
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $model = GarmentModel::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'clothing_category_id' => [
                'nullable',
                'uuid',
                Rule::exists('clothing_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'category' => 'nullable|string|max:100',
            'season' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'target_cost' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'retail_price' => 'nullable|numeric|min:0',
            'technical_specs' => 'nullable|array',
            'status' => 'nullable|string|in:draft,active,discontinued',
        ]);

        $model->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات الموديل بنجاح.',
            'model' => $model->fresh(['variants.size', 'variants.color', 'clothingCategory']),
        ]);
    }

    /**
     * حذف أو أرشفة الموديل
     */
    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $model = GarmentModel::where('tenant_id', $tenantId)->findOrFail($id);

        // Check if production orders exist
        $hasActiveProdOrders = \App\Models\ProductionOrder::where('tenant_id', $tenantId)
            ->where('garment_model_id', $model->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        if ($hasActiveProdOrders) {
            return response()->json([
                'message' => 'تعذر حذف الموديل نظراً لوجود أوامر تشغيل جارية مرتبطة به في صالة الإنتاج.',
                'errors' => ['model' => ['Model has active production orders.']],
            ], 422);
        }

        $model->delete();

        return response()->json([
            'message' => 'تم حذف الموديل بنجاح.',
            'deleted' => true,
        ]);
    }

    /**
     * عرض قائمة المقاسات المعتمدة للشركة
     */
    public function sizes(): JsonResponse
    {
        return response()->json([
            'sizes' => Size::orderBy('sort_order')->orderBy('name')->get(),
        ]);
    }

    /**
     * عرض قائمة الألوان المعتمدة للشركة
     */
    public function colors(): JsonResponse
    {
        return response()->json([
            'colors' => Color::orderBy('name')->get(),
        ]);
    }
}

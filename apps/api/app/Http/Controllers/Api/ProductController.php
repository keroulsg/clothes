<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = Product::where('tenant_id', $tenantId)
            ->with(['category', 'garmentModel'])
            ->withCount('variants');

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhereHas('garmentModel', function ($mq) use ($search) {
                      $mq->where('code', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->has('category_id') && !empty($request->input('category_id')) && $request->input('category_id') !== 'all') {
            $query->where('category_id', $request->input('category_id'));
        }

        if ($request->has('status') && !empty($request->input('status')) && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('stock_visibility') && !empty($request->input('stock_visibility')) && $request->input('stock_visibility') !== 'all') {
            $query->where('stock_visibility', $request->input('stock_visibility'));
        }

        if ($request->boolean('pos_only')) {
            $query->where('status', 'active')->where('is_pos_available', true);
        }

        $products = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 15));

        // Append effective prices for convenience
        $products->getCollection()->transform(function ($product) {
            $product->effective_pos_price = $product->effective_pos_price;
            $product->effective_website_price = $product->effective_website_price;
            $product->effective_wholesale_price = $product->effective_wholesale_price;
            return $product;
        });

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'category_id' => [
                'nullable',
                'uuid',
                Rule::exists('clothing_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'garment_model_id' => [
                'nullable',
                'uuid',
                Rule::exists('garment_models', 'id')->where('tenant_id', $tenantId),
            ],
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'main_image' => 'nullable|string|max:500',
            'gallery' => 'nullable|array',
            'base_cost' => 'nullable|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'pos_price' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'stock_visibility' => 'nullable|string|in:in_stock,low_stock,out_of_stock,on_demand,backorder',
            'is_pos_available' => 'nullable|boolean',
            'status' => 'nullable|string|in:draft,active,archived',
            'specifications' => 'nullable|array',
            'variant_ids' => 'nullable|array',
            'variant_ids.*' => [
                'uuid',
                Rule::exists('product_variants', 'id')->where('tenant_id', $tenantId),
            ],
        ]);

        $slug = !empty($validated['slug'])
            ? Str::slug($validated['slug'])
            : Str::slug($validated['name']) . '-' . rand(100, 999);

        // Normalize gallery and extract primary image
        $gallery = $this->normalizeGalleryInput($validated['gallery'] ?? null, $validated['main_image'] ?? null);
        $mainImage = $this->resolvePrimaryImageUrl($gallery, $validated['main_image'] ?? null);

        $product = Product::create([
            'tenant_id' => $tenantId,
            'category_id' => $validated['category_id'] ?? null,
            'garment_model_id' => $validated['garment_model_id'] ?? null,
            'name' => trim($validated['name']),
            'name_en' => isset($validated['name_en']) ? trim($validated['name_en']) : null,
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'main_image' => $mainImage,
            'gallery' => $gallery,
            'base_cost' => $validated['base_cost'] ?? 0,
            'selling_price' => $validated['selling_price'],
            'pos_price' => isset($validated['pos_price']) && $validated['pos_price'] !== null ? $validated['pos_price'] : $validated['selling_price'],
            'wholesale_price' => $validated['wholesale_price'] ?? 0,
            'stock_visibility' => $validated['stock_visibility'] ?? 'in_stock',
            'is_pos_available' => $validated['is_pos_available'] ?? true,
            'status' => $validated['status'] ?? 'active',
            'specifications' => $validated['specifications'] ?? null,
        ]);

        // Link existing variants if provided or from garment model
        if (!empty($product->garment_model_id)) {
            ProductVariant::where('tenant_id', $tenantId)
                ->where('garment_model_id', $product->garment_model_id)
                ->update(['product_id' => $product->id]);
        }

        if (!empty($validated['variant_ids'])) {
            ProductVariant::where('tenant_id', $tenantId)
                ->whereIn('id', $validated['variant_ids'])
                ->update(['product_id' => $product->id]);
        }

        // Ensure canonical product-variant integration so the product appears in POS and Storefront
        if ($product->variants()->count() === 0) {
            $this->createDefaultVariantForProduct($product, $tenantId);
        }

        return response()->json([
            'message' => 'تم إنشاء المنتج التجاري بنجاح.',
            'product' => $product->load(['category', 'garmentModel', 'variants.size', 'variants.color']),
        ], 201);
    }

    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $product = Product::where('tenant_id', $tenantId)
            ->with(['category', 'garmentModel', 'variants.size', 'variants.color'])
            ->findOrFail($id);

        $product->effective_pos_price = $product->effective_pos_price;
        $product->effective_website_price = $product->effective_website_price;
        $product->effective_wholesale_price = $product->effective_wholesale_price;

        return response()->json([
            'product' => $product,
        ]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $product = Product::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'name_en' => 'nullable|string|max:255',
            'category_id' => [
                'nullable',
                'uuid',
                Rule::exists('clothing_categories', 'id')->where('tenant_id', $tenantId),
            ],
            'garment_model_id' => [
                'nullable',
                'uuid',
                Rule::exists('garment_models', 'id')->where('tenant_id', $tenantId),
            ],
            'slug' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'main_image' => 'nullable|string|max:500',
            'gallery' => 'nullable|array',
            'base_cost' => 'nullable|numeric|min:0',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'pos_price' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'stock_visibility' => 'nullable|string|in:in_stock,low_stock,out_of_stock,on_demand,backorder',
            'is_pos_available' => 'nullable|boolean',
            'status' => 'nullable|string|in:draft,active,archived',
            'specifications' => 'nullable|array',
        ]);

        if (array_key_exists('gallery', $validated) || array_key_exists('main_image', $validated)) {
            $gallery = $this->normalizeGalleryInput($validated['gallery'] ?? $product->gallery, $validated['main_image'] ?? $product->main_image);
            $validated['gallery'] = $gallery;
            $validated['main_image'] = $this->resolvePrimaryImageUrl($gallery, $validated['main_image'] ?? $product->main_image);
        }

        $product->update($validated);

        if (!empty($validated['garment_model_id'])) {
            ProductVariant::where('tenant_id', $tenantId)
                ->where('garment_model_id', $validated['garment_model_id'])
                ->update(['product_id' => $product->id]);
        }

        return response()->json([
            'message' => 'تم تحديث بيانات المنتج بنجاح.',
            'product' => $product->fresh(['category', 'garmentModel', 'variants.size', 'variants.color']),
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $product = Product::where('tenant_id', $tenantId)->findOrFail($id);

        // الحماية من الحذف التدميري إذا كان المنتج مرتبطاً بمخزون أو حركات مبيعات
        if ($product->isReferencedInTransactionsOrInventory()) {
            $product->update(['status' => 'archived']);

            return response()->json([
                'message' => 'المنتج مرتبط بسجلات مبيعات أو رصيد مخزني حالي، تم أرشفته وتعطيله بدلاً من حذفه نهائياً حفاظاً على سلامة البيانات والتقارير المالية.',
                'action_taken' => 'archived',
                'archived' => true,
                'deleted' => false,
                'product' => $product->fresh(['category', 'garmentModel']),
            ]);
        }

        // فك ارتباط المتغيرات والحذف الآمن
        $variantIds = ProductVariant::where('product_id', $product->id)->pluck('id');
        \App\Models\InventoryItem::where('tenant_id', $tenantId)
            ->whereIn('variant_id', $variantIds)
            ->where('current_balance', '<=', 0)
            ->delete();
        ProductVariant::where('product_id', $product->id)->whereNull('garment_model_id')->delete();
        ProductVariant::where('product_id', $product->id)->update(['product_id' => null]);

        $product->delete();

        return response()->json([
            'message' => 'تم حذف المنتج بنجاح.',
            'action_taken' => 'deleted',
            'deleted' => true,
            'archived' => false,
        ]);
    }

    /**
     * جلب المنتجات المتاحة للبيع الفوري في نقطة البيع (POS) مع الأسعار المعتمدة
     */
    public function posItems(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = Product::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->where('is_pos_available', true)
            ->with(['category', 'garmentModel', 'variants.size', 'variants.color']);

        if ($request->has('search') && !empty($request->input('search'))) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_en', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhereHas('garmentModel', function ($mq) use ($search) {
                      $mq->where('code', 'like', "%{$search}%")
                         ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        $products = $query->orderBy('name', 'asc')->get();

        $items = [];
        foreach ($products as $prod) {
            if ($prod->variants->isNotEmpty()) {
                foreach ($prod->variants as $variant) {
                    $items[] = [
                        'id' => $variant->id,
                        'variant_id' => $variant->id,
                        'product_id' => $prod->id,
                        'sku' => $variant->sku,
                        'barcode' => $variant->barcode,
                        'name' => $prod->name,
                        'name_en' => $prod->name_en,
                        'model_code' => $prod->garmentModel?->code ?? '',
                        'category' => $prod->category?->name_ar ?? 'عام',
                        'size' => $variant->size?->name ?? 'Free Size',
                        'color' => $variant->color?->name ?? 'Standard',
                        'image' => $prod->main_image,
                        'gallery' => $prod->gallery ?? [],
                        'pos_price' => $prod->effective_pos_price,
                    'effective_pos_price' => (float) $prod->effective_pos_price,
                        'effective_pos_price' => (float) $prod->effective_pos_price,
                        'selling_price' => $prod->selling_price,
                        'wholesale_price' => $prod->effective_wholesale_price,
                        'stock_visibility' => $prod->stock_visibility,
                    ];
                }
            } else {
                $items[] = [
                    'id' => $prod->id,
                    'variant_id' => null,
                    'product_id' => $prod->id,
                    'sku' => $prod->slug,
                    'barcode' => '622' . rand(1000000000, 9999999999),
                    'name' => $prod->name,
                    'name_en' => $prod->name_en,
                    'model_code' => $prod->garmentModel?->code ?? '',
                    'category' => $prod->category?->name_ar ?? 'عام',
                    'size' => 'Free Size',
                    'color' => 'Standard',
                    'image' => $prod->main_image,
                    'gallery' => $prod->gallery ?? [],
                    'pos_price' => $prod->effective_pos_price,
                    'effective_pos_price' => (float) $prod->effective_pos_price,
                    'selling_price' => $prod->selling_price,
                    'wholesale_price' => $prod->effective_wholesale_price,
                    'stock_visibility' => $prod->stock_visibility,
                ];
            }
        }

        return response()->json([
            'data' => $items,
            'items' => $items,
            'total' => count($items),
        ]);
    }

    /**
     * رفع صورة واحدة (للتوافق القديم)
     */
    public function uploadImage(Request $request): JsonResponse
    {
        return $this->uploadImages($request);
    }

    /**
     * رفع صور متعددة لمعرض صور المنتج مع دعم التحديد المجمع وحماية نطاق المستأجر
     */
    public function uploadImages(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $files = [];
        if ($request->hasFile('images')) {
            $request->validate([
                'images' => 'required|array|max:10',
                'images.*' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:5120',
                'product_id' => [
                    'nullable',
                    'uuid',
                    Rule::exists('products', 'id')->where('tenant_id', $tenantId),
                ],
            ]);
            $files = $request->file('images');
        } elseif ($request->hasFile('image')) {
            $request->validate([
                'image' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:5120',
                'product_id' => [
                    'nullable',
                    'uuid',
                    Rule::exists('products', 'id')->where('tenant_id', $tenantId),
                ],
            ]);
            $files = [$request->file('image')];
        } else {
            return response()->json(['message' => 'لم يتم إرسال أي صور للرفع.'], 422);
        }

        $uploaded = [];
        foreach ($files as $index => $file) {
            $extension = $file->getClientOriginalExtension() ?: 'webp';
            $fileName = 'prod_' . date('Ymd_His') . '_' . Str::random(8) . '.' . strtolower($extension);

            $path = $file->storeAs("products/{$tenantId}", $fileName, 'public');
            $publicUrl = "/storage/{$path}";

            $uploaded[] = [
                'id' => 'img_' . Str::random(10),
                'url' => $publicUrl,
                'path' => $path,
                'filename' => $fileName,
                'is_primary' => $index === 0,
                'sort_order' => $index,
            ];
        }

        // تحديث المنتج إذا تم تمرير معرفه
        if ($request->filled('product_id')) {
            $product = Product::where('tenant_id', $tenantId)->find($request->input('product_id'));
            if ($product) {
                $currentGallery = is_array($product->gallery) ? $product->gallery : [];
                $newGallery = array_merge($currentGallery, $uploaded);
                $hasPrimary = collect($newGallery)->contains(fn($i) => is_array($i) && !empty($i['is_primary']));
                if (!$hasPrimary && !empty($newGallery)) {
                    if (is_array($newGallery[0])) {
                        $newGallery[0]['is_primary'] = true;
                    }
                }
                $primaryUrl = collect($newGallery)->firstWhere('is_primary', true)['url'] ?? ($newGallery[0]['url'] ?? null);

                $product->update([
                    'gallery' => $newGallery,
                    'main_image' => $primaryUrl ?: $product->main_image,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تم رفع الصور بنجاح.',
            'images' => $uploaded,
            'url' => $uploaded[0]['url'] ?? null,
            'path' => $uploaded[0]['path'] ?? null,
            'filename' => $uploaded[0]['filename'] ?? null,
        ]);
    }

    /**
     * حذف صورة فردية من معرض صور المنتج مع التحقق من النطاق الأمني للمستأجر
     */
    public function deleteImage(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'url' => 'nullable|string',
            'path' => 'nullable|string',
            'product_id' => [
                'nullable',
                'uuid',
                Rule::exists('products', 'id')->where('tenant_id', $tenantId),
            ],
        ]);

        $rawPath = $validated['path'] ?? ($validated['url'] ? str_replace('/storage/', '', $validated['url']) : null);
        if (!$rawPath) {
            return response()->json(['message' => 'مسار الصورة مطلوب.'], 422);
        }

        // حماية عزل المستأجرين: التأكد من أن الصورة تابعة لمجلد المستأجر فقط
        $expectedPrefix = "products/{$tenantId}/";
        if (!str_starts_with($rawPath, $expectedPrefix)) {
            return response()->json(['message' => 'غير مصرح بحذف هذه الصورة.'], 403);
        }

        if (Storage::disk('public')->exists($rawPath)) {
            Storage::disk('public')->delete($rawPath);
        }

        if (!empty($validated['product_id'])) {
            $product = Product::where('tenant_id', $tenantId)->find($validated['product_id']);
            if ($product && is_array($product->gallery)) {
                $urlTarget = "/storage/{$rawPath}";
                $newGallery = array_values(array_filter($product->gallery, function ($item) use ($urlTarget, $rawPath) {
                    $itemUrl = is_array($item) ? ($item['url'] ?? '') : $item;
                    $itemPath = is_array($item) ? ($item['path'] ?? '') : '';
                    return $itemUrl !== $urlTarget && $itemPath !== $rawPath;
                }));

                $hasPrimary = collect($newGallery)->contains(fn($i) => is_array($i) && !empty($i['is_primary']));
                if (!$hasPrimary && !empty($newGallery) && is_array($newGallery[0])) {
                    $newGallery[0]['is_primary'] = true;
                }

                $newMainImage = null;
                if (!empty($newGallery)) {
                    $first = $newGallery[0];
                    $newMainImage = is_array($first) ? ($first['url'] ?? '') : $first;
                    foreach ($newGallery as $g) {
                        if (is_array($g) && !empty($g['is_primary'])) {
                            $newMainImage = $g['url'];
                            break;
                        }
                    }
                }

                $product->update([
                    'gallery' => $newGallery,
                    'main_image' => $newMainImage,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'تم حذف الصورة بنجاح.',
        ]);
    }

    /**
     * توحيد مدخلات معرض الصور كقائمة كائنات معيارية
     */
    protected function normalizeGalleryInput($gallery, ?string $mainImage): ?array
    {
        if (empty($gallery) && !empty($mainImage)) {
            return [[
                'id' => 'img_primary',
                'url' => $mainImage,
                'path' => str_replace('/storage/', '', $mainImage),
                'is_primary' => true,
                'sort_order' => 0,
            ]];
        }

        if (!is_array($gallery)) {
            return null;
        }

        $normalized = [];
        $hasPrimary = false;

        foreach ($gallery as $index => $item) {
            if (is_string($item)) {
                $isPrimary = ($index === 0 && !$hasPrimary);
                if ($isPrimary) $hasPrimary = true;
                $normalized[] = [
                    'id' => 'img_' . $index . '_' . Str::random(6),
                    'url' => $item,
                    'path' => str_replace('/storage/', '', $item),
                    'is_primary' => $isPrimary,
                    'sort_order' => $index,
                ];
            } elseif (is_array($item)) {
                $isPrimary = !empty($item['is_primary']);
                if ($isPrimary) $hasPrimary = true;
                $normalized[] = [
                    'id' => $item['id'] ?? ('img_' . $index . '_' . Str::random(6)),
                    'url' => $item['url'] ?? '',
                    'path' => $item['path'] ?? (isset($item['url']) ? str_replace('/storage/', '', $item['url']) : ''),
                    'is_primary' => $isPrimary,
                    'sort_order' => (int)($item['sort_order'] ?? $index),
                ];
            }
        }

        if (!$hasPrimary && !empty($normalized)) {
            $normalized[0]['is_primary'] = true;
        }

        return $normalized;
    }

    /**
     * استخراج الرابط الأساسي للصورة الرئيسية من المعرض
     */
    protected function resolvePrimaryImageUrl(?array $gallery, ?string $fallback): ?string
    {
        if (!empty($gallery)) {
            foreach ($gallery as $item) {
                if (is_array($item) && !empty($item['is_primary']) && !empty($item['url'])) {
                    return $item['url'];
                }
            }
            if (isset($gallery[0]['url'])) {
                return $gallery[0]['url'];
            }
            if (is_string($gallery[0])) {
                return $gallery[0];
            }
        }

        return $fallback;
    }

    /**
     * إنشاء موديل ومتغير افتراضي لربط المنتج تجارياً ومخزنياً لضمان ظهوره في POS والمتجر
     */
    protected function createDefaultVariantForProduct(Product $product, string $tenantId): void
    {
        // 1. التحقق من وجود أو إنشاء GarmentModel
        $garmentModel = null;
        if ($product->garment_model_id) {
            $garmentModel = \App\Models\GarmentModel::where('tenant_id', $tenantId)->find($product->garment_model_id);
        }

        if (!$garmentModel) {
            $cleanSlug = preg_replace('/[^A-Za-z0-9]/', '', (string)$product->slug);
            $baseCode = 'PRD-' . strtoupper(substr($cleanSlug ?: 'STYLE', 0, 8));
            $uniqueCode = $baseCode;
            $counter = 1;
            while (\App\Models\GarmentModel::where('tenant_id', $tenantId)->where('code', $uniqueCode)->exists()) {
                $uniqueCode = $baseCode . '-' . $counter;
                $counter++;
            }

            $garmentModel = \App\Models\GarmentModel::create([
                'tenant_id' => $tenantId,
                'code' => $uniqueCode,
                'name' => $product->name,
                'category' => $product->category?->name_ar ?? 'عام',
                'season' => 'الموسم الحالي',
                'target_cost' => (float)$product->base_cost ?: 0,
                'wholesale_price' => (float)$product->wholesale_price ?: 0,
                'retail_price' => (float)$product->selling_price ?: 0,
                'status' => 'active',
            ]);

            $product->update(['garment_model_id' => $garmentModel->id]);
        }

        // 2. التحقق من وجود أو إنشاء مقاس
        $size = \App\Models\Size::where('tenant_id', $tenantId)->first();
        if (!$size) {
            $size = \App\Models\Size::create([
                'tenant_id' => $tenantId,
                'name' => 'Free Size',
                'code' => 'FS',
                'category' => 'general',
                'sort_order' => 1,
            ]);
        }

        // 3. التحقق من وجود أو إنشاء لون
        $color = \App\Models\Color::where('tenant_id', $tenantId)->first();
        if (!$color) {
            $color = \App\Models\Color::create([
                'tenant_id' => $tenantId,
                'name' => 'افتراضي',
                'color_code' => '#0f2744',
            ]);
        }

        // 4. توليد متغير تجاري فريد ProductVariant
        $sku = strtoupper(Str::slug($product->slug ?: $product->name)) . '-' . rand(100, 999);
        $barcode = '622' . rand(1000000000, 9999999999);

        $variant = \App\Models\ProductVariant::create([
            'tenant_id' => $tenantId,
            'garment_model_id' => $garmentModel->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => $sku,
            'barcode' => $barcode,
            'wholesale_price' => $product->wholesale_price,
            'retail_price' => $product->selling_price,
            'product_id' => $product->id,
        ]);

        // 5. ربط رصيد مخزني أولي في المستودع المتاح ليظهر كـ In Stock
        $warehouse = \App\Models\Warehouse::where('tenant_id', $tenantId)->first();
        if (!$warehouse) {
            $warehouse = \App\Models\Warehouse::create([
                'tenant_id' => $tenantId,
                'name' => 'المستودع الرئيسي للمنتجات التامة',
                'code' => 'WH-MAIN',
                'type' => 'finished_goods',
                'is_active' => true,
            ]);
        }

        \App\Models\InventoryItem::firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'variant_id' => $variant->id,
                'warehouse_id' => $warehouse->id,
            ],
            [
                'item_type' => 'finished_goods',
                'code' => 'INV-' . $sku,
                'name' => $product->name . ' (' . $size->name . '-' . $color->name . ')',
                'unit_of_measure' => 'piece',
                'current_balance' => 0,
                'reserved_balance' => 0,
                'average_cost' => (float)$product->base_cost ?: 0,
            ]
        );
    }
}

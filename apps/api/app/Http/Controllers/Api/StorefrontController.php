<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Services\DomainResolutionService;
use App\Services\StorefrontService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class StorefrontController extends Controller
{
    public function __construct(
        protected StorefrontService $storefrontService,
        protected DomainResolutionService $domainResolver
    ) {}

    /**
     * واجهة المتجر العامة للمستهلكين والزوار
     * يتم تحديد المستأجر حتمياً عبر اسم النطاق/المضيف أو المعرف المعتمد بدون أي Fallback عشوائي
     */
    public function publicStore(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);

        if (!$tenant) {
            return response()->json([
                'error' => 'StorefrontNotFound',
                'message' => 'المتجر الإلكتروني المطلوب غير موجود أو لم يتم التحقق من نطاقه.',
            ], 404);
        }

        if (in_array($tenant->status, ['suspended', 'cancelled'], true)) {
            return response()->json([
                'error' => 'StorefrontSuspended',
                'message' => 'المتجر الإلكتروني موقوف حالياً. يرجى التواصل مع إدارة المتجر.',
            ], 403);
        }

        app()->instance('current_tenant_id', $tenant->id);

        $details = $this->storefrontService->getStoreDetails($tenant->id);

        if (isset($details['store_settings']) && !$details['store_settings']->is_store_enabled) {
            return response()->json([
                'error' => 'StorefrontDisabled',
                'message' => 'المتجر الإلكتروني غير متاح للجمهور حالياً.',
            ], 404);
        }

        // إضافة بيانات النطاق العام للواجهة
        $details['tenant'] = [
            'id' => $tenant->id,
            'name' => $tenant->name,
            'code' => $tenant->code,
            'subdomain' => $tenant->subdomain,
            'custom_domain' => $tenant->custom_domain,
            'currency' => $tenant->currency,
        ];

        return response()->json($details);
    }

    /**
     * تسجيل طلب شراء من المتجر الإلكتروني
     */
    public function placeOrder(Request $request, ?string $tenantId = null): JsonResponse
    {
        $tenant = $this->domainResolver->resolveStorefrontTenant($request, $tenantId);

        if (!$tenant) {
            return response()->json([
                'error' => 'StorefrontNotFound',
                'message' => 'لا يمكن إتمام الطلب: المتجر الإلكتروني غير موجود أو لم يتم التعرف على نطاقه.',
            ], 404);
        }

        if (in_array($tenant->status, ['suspended', 'cancelled'], true)) {
            return response()->json([
                'error' => 'StorefrontSuspended',
                'message' => 'لا يمكن تسجيل طلبات شراء حالياً: حساب هذا المتجر موقوف.',
            ], 403);
        }

        app()->instance('current_tenant_id', $tenant->id);

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:50',
            'shipping_address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'payment_method' => 'required|string|in:cod,card_mock',
            'shipping_fee' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid',
            'items.*.product_name' => 'nullable|string',
            'items.*.sku' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        try {
            $order = $this->storefrontService->placeStoreOrder($tenant->id, $validated);

            return response()->json([
                'message' => 'تم استلام طلب الشراء بنجاح وسيتواصل معكم فريق المتجر للتأكيد والشحن',
                'order' => $order,
            ], 201);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidStoreOrder',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * استعراض الطلبات الإلكترونية للشركة داخل لوحة التحكم
     */
    public function orders(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $orders = StoreOrder::where('tenant_id', $tenantId)->with('items')->latest()->paginate(20);

        return response()->json($orders);
    }

    /**
     * تحديث حالة طلب المتجر الإلكتروني
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = StoreOrder::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:new,confirmed,preparing,shipped,delivered,cancelled',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'تم تحديث حالة طلب الشراء بنجاح',
            'order' => $order->load('items'),
        ]);
    }
}


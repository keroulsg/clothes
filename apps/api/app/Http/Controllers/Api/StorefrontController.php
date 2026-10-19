<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreOrder;
use App\Models\Tenant;
use App\Services\StorefrontService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StorefrontController extends Controller
{
    public function __construct(
        protected StorefrontService $storefrontService
    ) {}

    /**
     * واجهة المتجر العامة للمستهلكين والزوار
     */
    public function publicStore(Request $request, ?string $tenantId = null): JsonResponse
    {
        $resolvedTenantId = $tenantId ?? app('current_tenant_id', null);

        if (!$resolvedTenantId) {
            $firstTenant = Tenant::where('status', 'active')->first();
            $resolvedTenantId = $firstTenant?->id;
        }

        if (!$resolvedTenantId) {
            return response()->json(['error' => 'No active tenant store found'], 404);
        }

        $details = $this->storefrontService->getStoreDetails($resolvedTenantId);

        return response()->json($details);
    }

    /**
     * تسجيل طلب شراء من المتجر الإلكتروني
     */
    public function placeOrder(Request $request, ?string $tenantId = null): JsonResponse
    {
        $resolvedTenantId = $tenantId ?? app('current_tenant_id', null);
        if (!$resolvedTenantId) {
            $firstTenant = Tenant::where('status', 'active')->first();
            $resolvedTenantId = $firstTenant?->id;
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:50',
            'shipping_address' => 'required|string',
            'city' => 'nullable|string|max:100',
            'payment_method' => 'required|string|in:cod,card_mock',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid',
            'items.*.product_name' => 'nullable|string',
            'items.*.sku' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        $order = $this->storefrontService->placeStoreOrder($resolvedTenantId, $validated);

        return response()->json([
            'message' => 'تم استلام طلب الشراء بنجاح وسيتواصل معكم فريق المتجر للتأكيد والشحن',
            'order' => $order,
        ], 201);
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
}

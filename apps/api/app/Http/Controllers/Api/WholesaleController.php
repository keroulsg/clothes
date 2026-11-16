<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\WholesaleCustomerProfile;
use App\Services\WholesaleService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WholesaleController extends Controller
{
    public function __construct(
        protected WholesaleService $wholesaleService
    ) {}

    /**
     * تسجيل طلب عميل جملة جديد من واجهة المتجر الإلكتروني
     */
    public function register(Request $request, ?string $tenantId = null): JsonResponse
    {
        $resolvedTenantId = $tenantId ?: (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
        if (!$resolvedTenantId) {
            $resolvedTenantId = $request->header('X-Tenant-ID') ?: $request->input('tenant_id');
        }

        if (!$resolvedTenantId) {
            return response()->json([
                'success' => false,
                'message' => 'معرّف المصنع غير محدد.',
            ], 400);
        }

        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'business_type' => 'nullable|string|max:100',
            'contact_person' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'required|email|max:255',
            'password' => 'required|string|min:6',
            'tax_id' => 'nullable|string|max:100',
            'commercial_registry' => 'nullable|string|max:100',
            'city' => 'nullable|string|max:100',
            'shipping_address' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        try {
            $profile = $this->wholesaleService->registerWholesaleAccount($resolvedTenantId, $validated);

            return response()->json([
                'success' => true,
                'message' => 'تم استلام طلب تسجيل حساب الجملة بنجاح وهو قيد المراجعة والاعتماد من إدارة المصنع.',
                'data' => [
                    'id' => $profile->id,
                    'company_name' => $profile->company_name,
                    'status' => $profile->status,
                    'token' => $profile->plain_auth_token,
                ],
            ], 201);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * تسجيل دخول تاجر الجملة
     */
    public function login(Request $request, ?string $tenantId = null): JsonResponse
    {
        $resolvedTenantId = $tenantId ?: (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
        if (!$resolvedTenantId) {
            $resolvedTenantId = $request->header('X-Tenant-ID') ?: $request->input('tenant_id');
        }

        if (!$resolvedTenantId) {
            return response()->json([
                'success' => false,
                'message' => 'معرّف المصنع غير محدد.',
            ], 400);
        }

        $validated = $request->validate([
            'identifier' => 'required|string|max:255',
            'password' => 'required|string',
        ]);

        try {
            $result = $this->wholesaleService->loginWholesaleCustomer(
                $resolvedTenantId,
                $validated['identifier'],
                $validated['password']
            );

            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل الدخول بنجاح.',
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 401);
        }
    }

    /**
     * استعلام الملف الشخصي وحالة الاعتماد لعميل الجملة
     */
    public function myProfile(Request $request, ?string $tenantId = null): JsonResponse
    {
        $resolvedTenantId = $tenantId ?: (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);
        if (!$resolvedTenantId) {
            $resolvedTenantId = $request->header('X-Tenant-ID') ?: $request->input('tenant_id');
        }

        $token = $request->bearerToken() ?: $request->header('X-Wholesale-Token') ?: $request->query('wholesale_token');
        $customer = $this->wholesaleService->resolveCustomerFromToken($token, $resolvedTenantId ?? '');

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'غير مصرح أو الجلسة منتهية.',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $customer->id,
                'company_name' => $customer->company_name,
                'business_type' => $customer->business_type,
                'contact_person' => $customer->contact_person,
                'phone' => $customer->phone,
                'email' => $customer->email,
                'tax_id' => $customer->tax_id,
                'commercial_registry' => $customer->commercial_registry,
                'city' => $customer->city,
                'shipping_address' => $customer->shipping_address,
                'status' => $customer->status,
                'is_approved' => $customer->isApproved(),
                'rejection_reason' => $customer->rejection_reason,
                'suspension_reason' => $customer->suspension_reason,
                'approved_at' => $customer->approved_at,
            ],
        ]);
    }

    /**
     * استعراض طلبات عملاء الجملة للوحة إدارة المصنع
     */
    public function indexApplications(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $status = $request->query('status');

        $applications = $this->wholesaleService->getApplications($tenantId, $status);

        return response()->json([
            'success' => true,
            'data' => $applications,
        ]);
    }

    /**
     * اعتماد طلب تاجر جملة
     */
    public function approveApplication(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = $request->user();

        try {
            $profile = $this->wholesaleService->approveApplication($tenantId, $id, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'تم اعتماد حساب تاجر الجملة بنجاح وتفعيل وصوله لأسعار وشرائح الجملة.',
                'data' => $profile,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * رفض طلب تاجر جملة مع سبب الرفض
     */
    public function rejectApplication(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = $request->user();

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $profile = $this->wholesaleService->rejectApplication($tenantId, $id, $user->id, $validated['reason']);

            return response()->json([
                'success' => true,
                'message' => 'تم رفض طلب الجملة وتوثيق سبب الرفض بنجاح.',
                'data' => $profile,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * تجميد حساب تاجر جملة
     */
    public function suspendApplication(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = $request->user();

        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $profile = $this->wholesaleService->suspendApplication($tenantId, $id, $user->id, $validated['reason']);

            return response()->json([
                'success' => true,
                'message' => 'تم تجميد حساب تاجر الجملة بنجاح وسحب صلاحيات أسعار الجملة فوراً.',
                'data' => $profile,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * إعادة تنشيط حساب تاجر جملة مجمد
     */
    public function reactivateApplication(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = $request->user();

        try {
            $profile = $this->wholesaleService->reactivateApplication($tenantId, $id, $user->id);

            return response()->json([
                'success' => true,
                'message' => 'تمت إعادة تنشيط حساب تاجر الجملة بنجاح.',
                'data' => $profile,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * استعلام شرائح أسعار الجملة لمتغير المنتج
     */
    public function getTiers(Request $request, string $variantId): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $variant = ProductVariant::where('tenant_id', $tenantId)
            ->with('wholesaleTiers')
            ->findOrFail($variantId);

        return response()->json([
            'success' => true,
            'data' => [
                'variant_id' => $variant->id,
                'sku' => $variant->sku,
                'moq' => $variant->moq ?: 1,
                'wholesale_price' => (float)$variant->wholesale_price,
                'tiers' => $variant->wholesaleTiers,
            ],
        ]);
    }

    /**
     * حفظ شرائح أسعار الجملة والحد الأدنى للطلب لمتغير المنتج
     */
    public function saveTiers(Request $request, string $variantId): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'moq' => 'nullable|integer|min:1',
            'tiers' => 'required|array',
            'tiers.*.min_quantity' => 'required|integer|min:1',
            'tiers.*.max_quantity' => 'nullable|integer|min:1',
            'tiers.*.unit_price' => 'required|numeric|min:0.01',
        ]);

        try {
            $result = $this->wholesaleService->saveWholesaleTiers(
                $tenantId,
                $variantId,
                $validated['tiers'],
                $validated['moq'] ?? 1
            );

            return response()->json([
                'success' => true,
                'message' => 'تم حفظ شرائح أسعار الجملة والحد الأدنى للطلب (MOQ) بنجاح.',
                'data' => $result,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

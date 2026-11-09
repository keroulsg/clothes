<?php

namespace App\Http\Middleware;

use App\Models\Rfq;
use App\Services\SubscriptionUsageService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantHasMarketplaceEntitlement
{
    public function __construct(
        protected SubscriptionUsageService $subscriptionService
    ) {}

    /**
     * التحقق الصارم من استحقاق ميزة سوق وصلة ورش لباقة Enterprise
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $mode  'write' أو 'read_or_history'
     */
    public function handle(Request $request, Closure $next, string $mode = 'write'): Response
    {
        $user = $request->user();

        // 1. استثناء مسؤولي المنصة المركزيين (Platform Superadmins)
        if ($user && $user->role === 'platform_admin') {
            return $next($request);
        }

        // 2. استخراج هوية المستأجر الحالي
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (!$tenantId && $user) {
            $tenantId = $user->tenant_id;
            if ($tenantId) {
                app()->instance('current_tenant_id', $tenantId);
            }
        }

        if (!$tenantId) {
            return response()->json([
                'error' => 'UNAUTHORIZED_TENANT',
                'message' => 'لم يتم التعرف على المصنع أو حساب المستأجر.',
            ], 401);
        }

        // 3. التحقق المركزي من أهلية المزود (Stage C.6: Provider Exclusive to Enterprise Factories)
        if ($mode === 'provider') {
            $tenant = \App\Models\Tenant::withoutGlobalScopes()->find($tenantId);
            if (!$tenant || $tenant->isMarketplaceRequester() || $tenant->status !== 'active') {
                return response()->json([
                    'error' => 'FORBIDDEN_PROVIDER_ENTERPRISE_REQUIRED',
                    'error_code' => 'FORBIDDEN_PROVIDER_ENTERPRISE_REQUIRED',
                    'message' => 'تقديم عروض الأسعار وإنشاء ورش التصنيع محصور حصرياً في مصانع الملابس المشتركة في باقة Enterprise السحابية.',
                    'required_plan' => 'enterprise',
                ], 403);
            }

            $entitlement = $this->subscriptionService->hasFeatureEntitlement($tenantId, 'waslat_worsh_marketplace');
            if (!$entitlement['allowed']) {
                return response()->json([
                    'error' => 'FORBIDDEN_PROVIDER_ENTERPRISE_REQUIRED',
                    'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                    'message' => 'تقديم عروض الأسعار محصور حصرياً في مصانع الملابس المشتركة في باقة Enterprise السحابية.',
                    'required_plan' => 'enterprise',
                    'current_plan' => $entitlement['current_plan'] ?? 'ineligible',
                ], 403);
            }

            // فحص صلاحية دور المستخدم داخل المصنع
            if ($user && !in_array($user->role, ['company_owner', 'production_manager'], true)) {
                return response()->json([
                    'error' => 'INSUFFICIENT_ROLE_PERMISSIONS',
                    'message' => 'دور المستخدم الحالي لا يملك صلاحية تقديم عروض الأسعار نيابة عن المصنع.',
                ], 403);
            }

            return $next($request);
        }

        // 4. التحقق المركزي من استحقاق باقة Enterprise النشطة
        $entitlement = $this->subscriptionService->hasFeatureEntitlement($tenantId, 'waslat_worsh_marketplace');

        if ($entitlement['allowed']) {
            return $next($request);
        }

        // 4.5 فحص اشتراك طالب الخدمة المستقل النشط (Stage C.3 & C.5: Waslat Worsh Requester Subscription)
        $requesterSub = \App\Models\MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        if ($requesterSub && !$requesterSub->isExpired()) {
            return $next($request);
        }

        // 4.6 السماح لطالبي الخدمة بإنشاء مسودات طلبات القص قبل اعتماد الاشتراك (Draft RFQ Creation)
        $tenantModel = \App\Models\Tenant::withoutGlobalScopes()->find($tenantId);
        $isDraftRequest = $request->input('status') === 'draft' || $request->input('publish') === false || $request->boolean('publish') === false;
        if ($tenantModel && $tenantModel->isMarketplaceRequester() && $request->isMethod('POST') && $isDraftRequest) {
            return $next($request);
        }

        // 5. معالجة السجلات التاريخية للمشتركين المنتهية اشتراكاتهم أو المخفضة باقاتهم (Read-only historical access)
        if ($mode === 'read_or_history' && $request->isMethod('GET')) {
            // أ. استعراض سجل طلبات المصنع التاريخية فقط
            if ($request->has('my_history') || ($request->has('tenant_id') && $request->get('tenant_id') === $tenantId)) {
                return $next($request);
            }

            // ب. استعراض تفاصيل طلب تاريخي محدد كان المصنع طرفاً فيه (صاحب الطلب أو مقدم عرض)
            $rfqId = $request->route('id');
            if ($rfqId) {
                $rfq = Rfq::withoutGlobalScopes()->find($rfqId);
                if ($rfq && ($rfq->tenant_id === $tenantId || $rfq->bids()->whereHas('workshop', fn ($q) => $q->where('tenant_id', $tenantId))->exists())) {
                    return $next($request);
                }
            }
        }

        // 5. حظر الوصول لغير المؤهلين برمز 403 وحمولة معيارية واضحة
        return response()->json([
            'error' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
            'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
            'message' => $entitlement['message'] ?? 'سوق وصلة ورش الصناعي لخدمات القص متاح حصرياً للمصانع الكبرى المشتركة في باقة Enterprise السحابية.',
            'required_plan' => 'enterprise',
            'current_plan' => $entitlement['current_plan'] ?? 'ineligible',
            'reason' => $entitlement['reason'] ?? 'NOT_ENTITLED',
            'upgrade_url' => '/#/subscription',
        ], 403);
    }
}

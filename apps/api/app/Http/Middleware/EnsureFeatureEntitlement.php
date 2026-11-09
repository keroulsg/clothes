<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionUsageService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFeatureEntitlement
{
    public function __construct(
        protected SubscriptionUsageService $subscriptionService
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $featureKey): Response
    {
        $user = $request->user();

        // مشرفو المنصة لديهم صلاحية كاملة لتفقد وإدارة جميع الميزات
        if ($user && $user->role === 'platform_admin') {
            return $next($request);
        }

        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user?->tenant_id;

        if (!$tenantId) {
            return response()->json([
                'error' => 'UNAUTHORIZED_TENANT',
                'message' => 'لم يتم التعرف على حساب المستأجر.',
            ], 401);
        }

        $entitlement = $this->subscriptionService->hasFeatureEntitlement($tenantId, $featureKey);

        if (!$entitlement['allowed']) {
            return response()->json([
                'error' => $entitlement['error_code'] ?? 'FEATURE_NOT_ENTITLED',
                'error_code' => $entitlement['error_code'] ?? 'FEATURE_NOT_ENTITLED',
                'reason' => $entitlement['reason'] ?? 'FEATURE_NOT_ENTITLED',
                'feature' => $featureKey,
                'message' => $entitlement['message'] ?? 'هذه الميزة غير مشمولة في باقة اشتراكك الحالية.',
                'upgrade_url' => $entitlement['upgrade_url'] ?? '/#/subscription',
            ], 403);
        }

        return $next($request);
    }
}


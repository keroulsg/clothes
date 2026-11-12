<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Apply explicitly configured user/role permissions to every mapped tenant API
     * route, including routes that historically had no role middleware.
     * Legacy users in inherit mode retain their existing role behavior until an
     * owner explicitly configures their granular permissions.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'يجب تسجيل الدخول أولاً.',
            ], 401);
        }

        $routeUri = $request->route()?->uri() ?? $request->path();
        $isPlatformSubscriptionAdminRoute = str_starts_with(ltrim($routeUri, '/'), 'api/v1/admin/subscriptions')
            || str_starts_with(ltrim($routeUri, '/'), 'admin/subscriptions');

        if ($user->role === 'platform_admin' && $isPlatformSubscriptionAdminRoute) {
            return $next($request);
        }

        if ($user->role === 'platform_admin') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'مشرف المنصة لا يملك صلاحيات تشغيلية داخل حسابات المصانع.',
            ], 403);
        }

        if ($user->role === 'company_owner') {
            return $next($request);
        }

        $requiredPermission = (new EnsureRole())->permissionForRequest($request);
        if ($requiredPermission === null) {
            return response()->json([
                'error' => 'PermissionNotConfigured',
                'message' => 'تم حظر هذا المسار افتراضياً لعدم وجود صلاحية محددة له.',
            ], 403);
        }

        if (!$user->hasPermission($requiredPermission)) {
            return response()->json([
                'error' => 'InsufficientPermission',
                'message' => 'ليس لديك الصلاحية التفصيلية المطلوبة للوصول إلى هذا المورد.',
                'required_permission' => $requiredPermission,
            ], 403);
        }

        return $next($request);
    }
}

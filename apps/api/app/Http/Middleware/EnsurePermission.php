<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Enforce saved granular permissions for tenant users. Existing role middleware
     * remains the compatibility boundary for inherited legacy accounts.
     * Unknown routes fail closed until an explicit permission mapping is added.
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

        // Explicit user/custom-role permissions always apply. For inherited legacy
        // accounts, an existing role middleware remains the authorization boundary.
        // Routes without a role gate must pass the effective default permission check.
        $routeMiddleware = $request->route()?->gatherMiddleware() ?? [];
        $hasRoleGate = collect($routeMiddleware)->contains(
            fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'role:')
        );
        $mustEnforcePermission = $user->hasExplicitPermissionConfiguration() || !$hasRoleGate;

        if ($mustEnforcePermission && !$user->hasPermission($requiredPermission)) {
            return response()->json([
                'error' => 'InsufficientPermission',
                'message' => 'ليس لديك الصلاحية التفصيلية المطلوبة للوصول إلى هذا المورد.',
                'required_permission' => $requiredPermission,
            ], 403);
        }

        return $next($request);
    }
}

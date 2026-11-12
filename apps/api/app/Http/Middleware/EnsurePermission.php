<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePermission
{
    /**
     * Apply the effective role/user permission set to every mapped tenant API
     * route, including routes that historically had no role middleware.
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

        // Enforce the effective permission set for every account, including
        // legacy role defaults. Role middleware is an additional boundary, not a bypass.
        // Keep legacy role-based accounts compatible until the owner explicitly
        // configures their granular permission set. New/edited accounts and roles
        // with a saved custom permission matrix are enforced against that exact set.
        if (
            $user->hasExplicitPermissionConfiguration()
            && !$user->hasPermission($requiredPermission)
        ) {
            return response()->json([
                'error' => 'InsufficientPermission',
                'message' => 'ليس لديك الصلاحية التفصيلية المطلوبة للوصول إلى هذا المورد.',
                'required_permission' => $requiredPermission,
            ], 403);
        }

        return $next($request);
    }
}

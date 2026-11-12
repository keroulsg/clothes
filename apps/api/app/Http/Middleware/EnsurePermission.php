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

        if ($user->role === 'company_owner') {
            return $next($request);
        }

        $requiredPermission = (new EnsureRole())->permissionForRequest($request);
        if (
            $requiredPermission !== null
            && $user->hasExplicitPermissionConfiguration()
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

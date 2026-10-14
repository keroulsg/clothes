<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * التحقق الصارم من هوية المستأجر ومنع التسلل بين الشركات (IDOR Prevention)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // 1. إذا كان المستخدم مسجل دخول، هوية شركته تؤخذ من حسابه المعتمد فقط
        if ($user) {
            if ($user->role === 'platform_admin') {
                // المشرف العام يمكنه تحديد الشركة عبر الهيدر لأغراض الإدارة والدعم الفني
                $requestedTenantId = $request->header('X-Tenant-ID') ?: $user->tenant_id;
                if ($requestedTenantId) {
                    app()->instance('current_tenant_id', $requestedTenantId);
                }
            } else {
                if (!$user->tenant_id) {
                    return response()->json([
                        'error' => 'TenantAssignmentRequired',
                        'message' => 'المستخدم غير مرتبط بأي شركة مسجلة.',
                    ], 403);
                }

                // منع المستخدم العادي من تزوير X-Tenant-ID للوصول لشركة أخرى
                $headerTenantId = $request->header('X-Tenant-ID');
                if ($headerTenantId && $headerTenantId !== $user->tenant_id) {
                    return response()->json([
                        'error' => 'CrossTenantAccessDenied',
                        'message' => 'محاولة وصول غير مصرح بها لبيانات شركة أخرى.',
                    ], 403);
                }

                app()->instance('current_tenant_id', $user->tenant_id);
            }
        }

        return $next($request);
    }
}

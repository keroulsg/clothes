<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * التحقق الصارم من أدوار وصلاحيات المستخدم داخل الشركة المستأجرة (Role-Based Access Control)
     * يدعم تمرير دور واحد أو قائمة أدوار مسموح بها مفصولة بفواصل
     *
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'يجب تسجيل الدخول أولاً للوصول إلى هذا المورد.',
            ], 401);
        }

        $userRole = $user->role;

        // دعم الأدوار الممررة سواء مفصولة بفواصل أو معاملات متعددة
        $allowedRoles = [];
        foreach ($roles as $roleGroup) {
            foreach (explode(',', $roleGroup) as $r) {
                $trimmed = trim($r);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        // فصل صريح: مشرف المنصة العام (platform_admin) محظور من تنفيذ العمليات التشغيلية والمالية داخل الشركات المستأجرة
        if ($userRole === 'platform_admin') {
            return response()->json([
                'error' => 'UnauthorizedRole',
                'message' => 'أمان: مشرف المنصة العام محظور من تنفيذ العمليات التشغيلية والمالية داخل الشركات المستأجرة.',
            ], 403);
        }

        // مالك الشركة (company_owner) يمتلك صلاحيات تشغيلية كاملة داخل شركته فقط
        if ($userRole === 'company_owner' || in_array($userRole, $allowedRoles, true)) {
            return $next($request);
        }

        return response()->json([
            'error' => 'UnauthorizedRole',
            'message' => 'أمان: ليس لديك الصلاحية الكافية لتنفيذ هذا الإجراء الحساس (دورك الحالي: ' . $userRole . ').',
            'required_roles' => $allowedRoles,
        ], 403);
    }
}

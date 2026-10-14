<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * التحقق الصارم من هوية المستأجر والمصادقة ومنع التسلل بين الشركات (IDOR Prevention & Multi-Tenant Isolation)
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user() ?: auth('sanctum')->user() ?: auth()->user();

        // 1. أمان حرج: رفض أي طلب غير موثق بالدخول
        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'يجب تسجيل الدخول أولاً للوصول إلى بيانات وعمليات المؤسسة.',
            ], 401);
        }

        // 2. التحقق من حالة تفعيل حساب المستخدم
        if (!$user->is_active) {
            return response()->json([
                'error' => 'UserAccountDeactivated',
                'message' => 'تم تعطيل هذا الحساب. يرجى مراجعة إدارة النظام.',
            ], 403);
        }

        // 3. تحديد هوية المستأجر بحسب دور المستخدم
        if ($user->role === 'platform_admin') {
            // المشرف العام يمكنه التبديل عبر الهيدر لأغراض المساعدة التقنية
            $tenantId = $request->header('X-Tenant-ID') ?: $user->tenant_id;
        } else {
            if (!$user->tenant_id) {
                return response()->json([
                    'error' => 'TenantAssignmentRequired',
                    'message' => 'المستخدم غير مرتبط بأي شركة مسجلة.',
                ], 403);
            }

            // منع التلاعب برأس X-Tenant-ID لمنع اختراق الشركات الأخرى
            $headerTenantId = $request->header('X-Tenant-ID');
            if ($headerTenantId && $headerTenantId !== $user->tenant_id) {
                return response()->json([
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'محاولة وصول غير مصرح بها لبيانات شركة أخرى.',
                ], 403);
            }

            $tenantId = $user->tenant_id;
        }

        // 4. التحقق من وجود الشركة وحالة اشتراكها
        if ($tenantId) {
            $tenant = Tenant::withoutGlobalScopes()->find($tenantId);

            if (!$tenant) {
                return response()->json([
                    'error' => 'TenantNotFound',
                    'message' => 'بيانات الشركة غير موجودة في النظام.',
                ], 404);
            }

            if (in_array($tenant->status, ['suspended', 'cancelled'])) {
                return response()->json([
                    'error' => 'TenantSuspended',
                    'message' => 'حساب الشركة موقوف حالياً. يرجى التواصل مع إدارة الاشتراكات لتسوية وتفعيل الخدمة.',
                ], 403);
            }

            // 5. التحقق من انتهاء الفترة التجريبية (Trial Expiration Enforcement)
            if ($user->role !== 'platform_admin' && $tenant->isTrialExpired()) {
                $isAllowedForExpiredTrial = $request->is('api/v1/tenant/profile')
                    || $request->is('api/v1/tenant/subscription*')
                    || $request->is('api/v1/auth/*');

                if (!$isAllowedForExpiredTrial) {
                    return response()->json([
                        'error' => 'TrialExpired',
                        'message' => 'انتهت الفترة التجريبية للشركة. يرجى سداد وتفعيل الاشتراك لاستئناف العمليات.',
                        'trial_ends_at' => $tenant->settings['subscription']['trial_ends_at'] ?? null,
                        'subscription_status' => 'trial_expired',
                        'action_required' => 'subscription_payment',
                    ], 402);
                }
            }

            app()->instance('current_tenant_id', $tenantId);
        } else {
            return response()->json([
                'error' => 'TenantContextMissing',
                'message' => 'لم يتم تحديد هوية الشركة.',
            ], 403);
        }

        return $next($request);
    }
}

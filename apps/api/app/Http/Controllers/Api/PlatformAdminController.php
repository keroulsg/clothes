<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformAdminController extends Controller
{
    /**
     * تفعيل اشتراك المستأجر يدوياً بواسطة المشرف العام مع التحقق الصارم من كود التفويض وسجل الرقابة
     * المسار لا يتطلب سياق مستأجر ويعمل بصلاحيات مشرف المنصة الحصرية
     */
    public function activateSubscription(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'authorization_code' => 'required|string',
            'authorized_by' => 'required|string|min:5|max:255',
            'reason' => 'required|string|min:10|max:1000',
            'plan_tier' => 'required|string|in:starter,professional,enterprise',
        ]);

        // 1. التحقق من كود التفويض الأمني للمنصة ومقارنته بالمفتاح المشفر في بيئة التشغيل
        $platformKey = config('services.platform.admin_activation_key', env('PLATFORM_ADMIN_ACTIVATION_KEY'));
        if (empty($platformKey)) {
            return response()->json([
                'error' => 'ServerMisconfiguration',
                'message' => 'أمان: مفتاح تفويض المشرف العام غير مهيأ في بيئة التشغيل. تم إغلاق مسار التفعيل لضمان الأمان (Fail-Closed).',
            ], 500);
        }

        $isCodeValid = hash_equals(
            hash('sha256', (string) $platformKey),
            hash('sha256', (string) $validated['authorization_code'])
        );

        if (!$isCodeValid) {
            return response()->json([
                'error' => 'InvalidAuthorizationCode',
                'message' => 'أمان: كود التفويض الإداري المرفق غير صالح أو غير معتمد من إدارة المنصة.',
            ], 403);
        }

        return DB::transaction(function () use ($request, $adminUser, $id, $validated) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            $settings = $tenant->settings ?? [];
            $subscription = $settings['subscription'] ?? [];

            $oldValues = $subscription;

            $subscription['status'] = 'active';
            $subscription['is_paid'] = true;
            $subscription['plan_tier'] = $validated['plan_tier'];
            $subscription['activated_at'] = now()->toIso8601String();
            $subscription['expires_at'] = now()->addYear()->toIso8601String();
            $subscription['manual_activation'] = [
                'admin_user_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'authorized_by' => $validated['authorized_by'],
                'reason' => $validated['reason'],
                'timestamp' => now()->toIso8601String(),
                'ip_address' => $request->ip(),
            ];

            $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
            $tenant->status = 'active';
            $tenant->plan_tier = $validated['plan_tier'];
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_manual_activation',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => $oldValues,
                'new_values' => $subscription['manual_activation'],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'activated',
                'message' => 'تم تفعيل اشتراك الشركة يدوياً بواسطة المشرف العام وتوثيق سجل الرقابة والتدقيق.',
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'status' => $tenant->status,
                    'plan_tier' => $tenant->plan_tier,
                    'is_paid' => true,
                ],
                'subscription' => $subscription,
            ], 200);
        });
    }

    /**
     * إحصائيات ونظرة عامة على منصة SaaS السحابية (Platform Metrics)
     */
    public function overview(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $totalTenants = Tenant::withoutGlobalScopes()->count();
        $activeTenants = Tenant::withoutGlobalScopes()->where('status', 'active')->count();
        $trialTenants = Tenant::withoutGlobalScopes()->where('status', 'trial')->count();
        $suspendedTenants = Tenant::withoutGlobalScopes()->where('status', 'suspended')->count();
        $totalUsers = \App\Models\User::withoutGlobalScopes()->count();

        $tierCounts = [
            'starter' => Tenant::withoutGlobalScopes()->where('plan_tier', 'starter')->count(),
            'professional' => Tenant::withoutGlobalScopes()->where('plan_tier', 'professional')->count(),
            'enterprise' => Tenant::withoutGlobalScopes()->where('plan_tier', 'enterprise')->count(),
        ];

        $recentAudits = AuditLog::withoutGlobalScopes()
            ->with(['user:id,name,email,role'])
            ->orderBy('created_at', 'desc')
            ->take(8)
            ->get();

        return response()->json([
            'metrics' => [
                'total_tenants' => $totalTenants,
                'active_tenants' => $activeTenants,
                'trial_tenants' => $trialTenants,
                'suspended_tenants' => $suspendedTenants,
                'total_users' => $totalUsers,
                'tier_counts' => $tierCounts,
            ],
            'recent_audits' => $recentAudits,
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * دليل المستأجرين والمصانع المسجلة في النظام (Tenants Directory)
     */
    public function tenants(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $query = Tenant::withoutGlobalScopes()
            ->withCount(['users', 'branches'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('subdomain', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->query('status') !== 'all') {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('plan_tier') && $request->query('plan_tier') !== 'all') {
            $query->where('plan_tier', $request->query('plan_tier'));
        }

        $perPage = min(max((int) $request->query('per_page', 15), 5), 50);
        $tenants = $query->paginate($perPage);

        return response()->json($tenants);
    }

    /**
     * عرض تفاصيل مستأجر محدد للمشرف العام
     */
    public function showTenant(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $tenant = Tenant::withoutGlobalScopes()
            ->with(['branches', 'users' => function ($q) {
                $q->select('id', 'tenant_id', 'name', 'email', 'role', 'is_active', 'created_at');
            }])
            ->findOrFail($id);

        $auditLogs = AuditLog::withoutGlobalScopes()
            ->where('tenant_id', $id)
            ->with('user:id,name,email')
            ->orderBy('created_at', 'desc')
            ->take(15)
            ->get();

        return response()->json([
            'tenant' => $tenant,
            'audit_logs' => $auditLogs,
        ]);
    }

    /**
     * تعليق أو تجميد حساب مستأجر (Suspend Tenant)
     */
    public function suspendTenant(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:5|max:500',
        ]);

        return DB::transaction(function () use ($request, $adminUser, $id, $validated) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            $oldStatus = $tenant->status;
            $tenant->status = 'suspended';
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_suspend_tenant',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'suspended', 'reason' => $validated['reason']],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'suspended',
                'message' => 'تم تعليق حساب المصنع/الشركة وتوثيق السبب في سجل التدقيق.',
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'status' => $tenant->status,
                ],
            ]);
        });
    }

    /**
     * سجل التدقيق والرقابة الإدارية العام للمنصة (Platform Audit Logs)
     */
    public function auditLogs(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $query = AuditLog::withoutGlobalScopes()
            ->with(['user:id,name,email,role'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('tenant_id')) {
            $query->where('tenant_id', $request->query('tenant_id'));
        }

        $perPage = min(max((int) $request->query('per_page', 20), 5), 100);
        $logs = $query->paginate($perPage);

        return response()->json($logs);
    }
}

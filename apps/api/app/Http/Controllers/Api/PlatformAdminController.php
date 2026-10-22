<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
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
     * إعادة تفعيل حساب مستأجر معلق (Reactivate/Unsuspend Tenant)
     */
    public function reactivateTenant(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        return DB::transaction(function () use ($request, $adminUser, $id) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            $oldStatus = $tenant->status;
            $tenant->status = 'active';
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_reactivate_tenant',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'active'],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'active',
                'message' => 'تم إعادة تفعيل حساب المصنع/الشركة بنجاح واستئناف الخدمات.',
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'status' => $tenant->status,
                ],
            ]);
        });
    }

    /**
     * تعديل باقة الاشتراك للشركة (Update Tenant Plan Tier)
     */
    public function updateTenantPlan(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'plan_tier' => 'required|string|in:starter,professional,enterprise',
        ]);

        return DB::transaction(function () use ($request, $adminUser, $id, $validated) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);
            $oldTier = $tenant->plan_tier;

            $tenant->plan_tier = $validated['plan_tier'];
            $settings = $tenant->settings ?? [];
            if (isset($settings['subscription'])) {
                $settings['subscription']['plan_tier'] = $validated['plan_tier'];
                $tenant->settings = $settings;
            }
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_update_plan_tier',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['plan_tier' => $oldTier],
                'new_values' => ['plan_tier' => $validated['plan_tier']],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'تم تحديث باقة اشتراك الشركة بنجاح.',
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'plan_tier' => $tenant->plan_tier,
                ],
            ]);
        });
    }

    /**
     * فحص ومراقبة مؤشرات صحة النظام والبنية التحتية (System Health Indicators)
     */
    public function systemHealth(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $dbStatus = 'healthy';
        $dbError = null;
        try {
            DB::connection()->getPdo();
            $totalTenants = Tenant::withoutGlobalScopes()->count();
        } catch (\Throwable $e) {
            $dbStatus = 'degraded';
            $dbError = $e->getMessage();
            $totalTenants = 0;
        }

        // Test Fail-Closed Multi-Tenancy Scope
        $isolationStatus = 'enforced';
        try {
            // Without tenant binding, scoped models must return 0 records (1=0 condition)
            $scopedItems = \App\Models\InventoryItem::count();
            if ($scopedItems > 0 && !app()->has('current_tenant_id')) {
                $isolationStatus = 'breached';
            }
        } catch (\Throwable $e) {
            $isolationStatus = 'error: ' . $e->getMessage();
        }

        return response()->json([
            'database' => [
                'driver' => DB::connection()->getDriverName(),
                'status' => $dbStatus,
                'error' => $dbError,
            ],
            'multi_tenancy' => [
                'isolation' => $isolationStatus,
                'fail_closed' => true,
            ],
            'environment' => [
                'php_version' => PHP_VERSION,
                'laravel_version' => app()->version(),
                'env' => app()->environment(),
                'memory_usage_mb' => round(memory_get_usage(true) / 1024 / 1024, 2),
            ],
            'counts' => [
                'tenants' => $totalTenants,
                'users' => User::withoutGlobalScopes()->count(),
                'audit_logs' => AuditLog::withoutGlobalScopes()->count(),
            ],
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    /**
     * دليل مستخدمي المنصة والشركات (Platform & Tenant Users Directory)
     */
    public function users(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $query = User::withoutGlobalScopes()
            ->with('tenant:id,name,code')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role') && $request->query('role') !== 'all') {
            $query->where('role', $request->query('role'));
        }

        $perPage = min(max((int) $request->query('per_page', 15), 5), 50);
        return response()->json($query->paginate($perPage));
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

    /**
     * قائمة النطاقات وتكوينات العناوين للشركات المسجلة (Domain Management Overview)
     */
    public function domains(Request $request): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $query = Tenant::withoutGlobalScopes()
            ->select('id', 'name', 'code', 'subdomain', 'custom_domain', 'status', 'plan_tier', 'settings', 'created_at')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('subdomain', 'like', "%{$search}%")
                  ->orWhere('custom_domain', 'like', "%{$search}%");
            });
        }

        $perPage = min(max((int) $request->query('per_page', 20), 5), 50);
        $tenants = $query->paginate($perPage);

        $baseDomain = config('app.platform_base_domain', env('PLATFORM_BASE_DOMAIN', 'garmentos.cloud'));

        $tenants->getCollection()->transform(function ($tenant) use ($baseDomain) {
            $domainSettings = $tenant->settings['domain'] ?? [];
            return [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'code' => $tenant->code,
                'status' => $tenant->status,
                'subdomain' => $tenant->subdomain,
                'full_platform_domain' => $tenant->subdomain ? "{$tenant->subdomain}.{$baseDomain}" : null,
                'custom_domain' => $tenant->custom_domain,
                'custom_domain_status' => $domainSettings['custom_domain_status'] ?? ($tenant->custom_domain ? 'pending_verification' : 'not_configured'),
                'custom_domain_enabled' => (bool) ($domainSettings['custom_domain_enabled'] ?? true),
                'verification_token' => $domainSettings['verification_token'] ?? null,
                'verified_at' => $domainSettings['verified_at'] ?? null,
                'last_checked_at' => $domainSettings['last_checked_at'] ?? null,
                'last_failure_reason' => $domainSettings['last_failure_reason'] ?? null,
            ];
        });

        return response()->json([
            'domains' => $tenants,
            'base_domain' => $baseDomain,
        ]);
    }

    /**
     * تحديث النطاق الفرعي للمستأجر (Update Tenant Subdomain)
     */
    public function updateSubdomain(Request $request, string $id, \App\Services\DomainResolutionService $domainResolver): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'subdomain' => 'required|string|min:3|max:63',
        ]);

        try {
            $validation = $domainResolver->validateSubdomain($validated['subdomain'], $id);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidSubdomain',
                'message' => $e->getMessage(),
            ], 422);
        }

        return DB::transaction(function () use ($request, $adminUser, $id, $validation) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);
            $oldSubdomain = $tenant->subdomain;

            $tenant->subdomain = $validation['subdomain'];
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_update_subdomain',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['subdomain' => $oldSubdomain],
                'new_values' => ['subdomain' => $tenant->subdomain],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'تم تحديث النطاق الفرعي للمستأجر بنجاح.',
                'tenant_id' => $tenant->id,
                'subdomain' => $tenant->subdomain,
                'full_domain' => $validation['full_domain'],
            ]);
        });
    }

    /**
     * تحديث أو تعيين النطاق المخصص للمستأجر (Update Custom Domain)
     */
    public function updateCustomDomain(Request $request, string $id, \App\Services\DomainResolutionService $domainResolver): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'custom_domain' => 'nullable|string|max:255',
        ]);

        $customDomain = $validated['custom_domain'] ? strtolower(trim($validated['custom_domain'])) : null;

        if ($customDomain !== null) {
            try {
                $domainResolver->validateCustomDomain($customDomain, $id);
            } catch (\InvalidArgumentException $e) {
                return response()->json([
                    'error' => 'InvalidCustomDomain',
                    'message' => $e->getMessage(),
                ], 422);
            }
        }

        return DB::transaction(function () use ($request, $adminUser, $id, $customDomain, $domainResolver) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);
            $oldDomain = $tenant->custom_domain;

            $settings = $tenant->settings ?? [];
            $domainSettings = $settings['domain'] ?? [];

            if ($customDomain === null) {
                $tenant->custom_domain = null;
                $domainSettings['custom_domain_status'] = 'not_configured';
                $domainSettings['verification_token'] = null;
                $domainSettings['verified_at'] = null;
            } else {
                $verificationToken = $domainResolver->generateVerificationToken($tenant);
                $tenant->custom_domain = $customDomain;
                $domainSettings['custom_domain_status'] = 'pending_verification';
                $domainSettings['verification_token'] = $verificationToken;
                $domainSettings['custom_domain_enabled'] = true;
                $domainSettings['created_at'] = now()->toIso8601String();
            }

            $settings['domain'] = $domainSettings;
            $tenant->settings = $settings;
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_update_custom_domain',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => ['custom_domain' => $oldDomain],
                'new_values' => [
                    'custom_domain' => $customDomain,
                    'status' => $domainSettings['custom_domain_status'] ?? null,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => $customDomain ? 'تم تسجيل النطاق المخصص وهو في انتظار استكمال وتوثيق سجلات DNS.' : 'تمت إزالة النطاق المخصص بنجاح.',
                'tenant_id' => $tenant->id,
                'custom_domain' => $tenant->custom_domain,
                'domain_settings' => $domainSettings,
            ]);
        });
    }

    /**
     * التحقق من سجلات DNS وتوثيق النطاق المخصص (Verify Custom Domain)
     */
    public function verifyCustomDomain(Request $request, string $id, \App\Services\DomainResolutionService $domainResolver): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($id);

        if (!$tenant->custom_domain) {
            return response()->json([
                'error' => 'NoCustomDomainConfigured',
                'message' => 'لم يتم تكوين أي نطاق مخصص لهذا المستأجر.',
            ], 422);
        }

        if ($request->boolean('mock_verify') && app()->environment('local', 'testing')) {
            $settings = $tenant->settings ?? [];
            $settings['domain']['allow_test_mock_dns'] = true;
            $tenant->settings = $settings;
        }

        $result = $domainResolver->verifyCustomDomainDns($tenant);

        $settings = $tenant->settings ?? [];
        $domainSettings = $settings['domain'] ?? [];
        $domainSettings['last_checked_at'] = now()->toIso8601String();

        if ($result['verified']) {
            $domainSettings['custom_domain_status'] = 'verified';
            $domainSettings['verified_at'] = $result['verified_at'];
            $domainSettings['last_failure_reason'] = null;
        } else {
            $domainSettings['custom_domain_status'] = $result['status'];
            $domainSettings['last_failure_reason'] = $result['message'];
        }

        $settings['domain'] = $domainSettings;
        $tenant->settings = $settings;
        $tenant->save();

        AuditLog::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
            'action' => 'admin_verify_custom_domain',
            'auditable_type' => Tenant::class,
            'auditable_id' => $tenant->id,
            'old_values' => [],
            'new_values' => [
                'status' => $domainSettings['custom_domain_status'],
                'verified' => $result['verified'],
                'message' => $result['message'],
            ],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'verified' => $result['verified'],
            'status' => $domainSettings['custom_domain_status'],
            'message' => $result['message'],
            'domain_settings' => $domainSettings,
        ]);
    }

    /**
     * تفعيل أو تعطيل النطاق المخصص دون حذفه (Toggle Custom Domain Status)
     */
    public function toggleDomainStatus(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($id);
        $settings = $tenant->settings ?? [];
        $domainSettings = $settings['domain'] ?? [];

        $currentEnabled = (bool) ($domainSettings['custom_domain_enabled'] ?? true);
        $newEnabled = !$currentEnabled;

        $domainSettings['custom_domain_enabled'] = $newEnabled;
        $settings['domain'] = $domainSettings;
        $tenant->settings = $settings;
        $tenant->save();

        AuditLog::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
            'action' => 'admin_toggle_custom_domain',
            'auditable_type' => Tenant::class,
            'auditable_id' => $tenant->id,
            'old_values' => ['custom_domain_enabled' => $currentEnabled],
            'new_values' => ['custom_domain_enabled' => $newEnabled],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => $newEnabled ? 'تم تفعيل توجيه النطاق المخصص.' : 'تم إيقاف توجيه النطاق المخصص بأمان دون مساس بالبيانات.',
            'custom_domain_enabled' => $newEnabled,
        ]);
    }
}

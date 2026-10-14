<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantController extends Controller
{
    /**
     * تسجيل شركة/مصنع جديد بالكامل وإنشاء الحساب الرئيسي والفرع الافتراضي
     * ملاحظة أمنية: إنشاء الحساب يمنح فترة تجريبية (Trial) ولا يعتبر اشتراكاً مدفوعاً مفعلاً تلقائياً
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'subdomain' => 'nullable|string|alpha_dash|max:50|unique:tenants,subdomain',
            'owner_name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:30',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
        ]);

        return DB::transaction(function () use ($validated) {
            $tenantCode = 'MFG-' . strtoupper(Str::random(6));
            $planTier = $validated['plan_tier'] ?? 'professional';

            $tenant = Tenant::create([
                'code' => $tenantCode,
                'name' => $validated['company_name'],
                'subdomain' => $validated['subdomain'] ?? strtolower(Str::slug($validated['company_name'])) . '-' . rand(100, 999),
                'status' => 'trial', // حساب تجريبي جديد يتطلب سداد الاشتراك للتفعيل التجاري
                'plan_tier' => $planTier,
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
                'settings' => [
                    'fiscal_year_start' => '01-01',
                    'default_cutting_waste_tolerance_pct' => 3.5,
                    'piece_rate_approval_required' => true,
                    'subscription' => [
                        'status' => 'trial',
                        'is_paid' => false,
                        'trial_started_at' => now()->toIso8601String(),
                        'trial_ends_at' => now()->addDays(14)->toIso8601String(),
                    ],
                ],
            ]);

            // إنشاء الفرع والمصنع الرئيسي
            $branch = Branch::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'name' => 'المصنع الرئيسي',
                'code' => 'HQ-01',
                'type' => 'factory',
                'is_main' => true,
                'phone' => $validated['phone'] ?? null,
            ]);

            // إنشاء حساب مالك الشركة
            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['owner_name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => 'company_owner',
                'is_active' => true,
                'password' => Hash::make($validated['password']),
            ]);

            // إصدار رمز المصادقة Sanctum Token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'تم إنشاء حساب المصنع والشركة بنجاح (فترة تجريبية 14 يوماً).',
                'access_token' => $token,
                'token_type' => 'Bearer',
                'tenant' => [
                    'id' => $tenant->id,
                    'code' => $tenant->code,
                    'name' => $tenant->name,
                    'subdomain' => $tenant->subdomain,
                    'status' => $tenant->status,
                    'plan_tier' => $tenant->plan_tier,
                    'is_paid' => false,
                ],
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'main_branch' => [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'code' => $branch->code,
                ],
            ], 201);
        });
    }

    /**
     * تسجيل الدخول الموحد للشركات وإصدار رمز الدخول Sanctum
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'error' => 'InvalidCredentials',
                'message' => 'بيانات الدخول غير صحيحة. يرجى التحقق من البريد الإلكتروني وكلمة المرور.',
            ], 401);
        }

        if (!$user->is_active) {
            return response()->json([
                'error' => 'UserAccountDeactivated',
                'message' => 'تم تعطيل هذا الحساب. يرجى مراجعة إدارة المصنع.',
            ], 403);
        }

        $tenant = null;
        if ($user->role !== 'platform_admin') {
            if (!$user->tenant_id) {
                return response()->json([
                    'error' => 'TenantAssignmentRequired',
                    'message' => 'المستخدم غير مرتبط بأي شركة مسجلة.',
                ], 403);
            }

            $tenant = Tenant::withoutGlobalScopes()->find($user->tenant_id);
            if (!$tenant) {
                return response()->json([
                    'error' => 'TenantNotFound',
                    'message' => 'الشركة التابع لها هذا الحساب غير موجودة.',
                ], 404);
            }

            if (in_array($tenant->status, ['suspended', 'cancelled'])) {
                return response()->json([
                    'error' => 'TenantSuspended',
                    'message' => 'حساب الشركة موقوف حالياً. يرجى التواصل مع إدارة الاشتراكات لتسوية وتفعيل الخدمة.',
                ], 403);
            }
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'تم تسجيل الدخول بنجاح.',
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'tenant_id' => $user->tenant_id,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'code' => $tenant->code,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'plan_tier' => $tenant->plan_tier,
                'is_paid' => $tenant->settings['subscription']['is_paid'] ?? false,
            ] : null,
        ]);
    }

    /**
     * ملف الشركة والمؤشرات الأساسية
     */
    public function current(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::withCount(['users', 'branches'])->findOrFail($tenantId);

        return response()->json([
            'tenant' => $tenant,
        ]);
    }

    /**
     * تفعيل أو تجديد الاشتراك المدفوع للشركة
     */
    public function activateSubscription(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $validated = $request->validate([
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
            'payment_reference' => 'nullable|string|max:100',
        ]);

        $settings = $tenant->settings ?? [];
        $planTier = $validated['plan_tier'] ?? $tenant->plan_tier;

        $settings['subscription'] = [
            'status' => 'active',
            'is_paid' => true,
            'plan_tier' => $planTier,
            'activated_at' => now()->toIso8601String(),
            'expires_at' => now()->addYear()->toIso8601String(),
            'payment_reference' => $validated['payment_reference'] ?? ('PAY-' . strtoupper(Str::random(10))),
        ];

        $tenant->settings = $settings;
        $tenant->status = 'active';
        $tenant->plan_tier = $planTier;
        $tenant->save();

        return response()->json([
            'message' => 'تم تفعيل الاشتراك التجاري بنجاح.',
            'subscription' => $settings['subscription'],
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'plan_tier' => $tenant->plan_tier,
                'is_paid' => true,
            ],
        ]);
    }
}

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
use Illuminate\Validation\Rule;

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

        return DB::transaction(function () use ($validated, $request) {
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

            // إذا تم تفعيل خيار بيانات العرض التجريبية صراحة، يتم تهيئة بيانات نموذجية
            if ($request->boolean('with_sample_data')) {
                \App\Models\Warehouse::withoutGlobalScopes()->firstOrCreate(
                    ['tenant_id' => $tenant->id, 'code' => 'WH-FAB-01'],
                    [
                        'name' => 'مخزن الأقمشة الرئيسي',
                        'type' => 'fabric',
                        'allow_negative_stock' => false,
                        'is_active' => true,
                    ]
                );

                // دليل المقاسات العامة عند طلب العينات صراحة (بدون افتراضات مقاسات أطفال)
                $sampleCat = \App\Models\SizeCategory::withoutGlobalScopes()->create([
                    'tenant_id' => $tenant->id,
                    'name' => 'مقاسات قياسية عامة',
                    'description' => 'دليل المقاسات المعيارية العامة',
                    'sort_order' => 1,
                    'is_active' => true,
                ]);

                $defaultSizes = [
                    ['name' => 'S', 'order' => 1],
                    ['name' => 'M', 'order' => 2],
                    ['name' => 'L', 'order' => 3],
                    ['name' => 'XL', 'order' => 4],
                    ['name' => 'XXL', 'order' => 5],
                ];
                foreach ($defaultSizes as $sz) {
                    \App\Models\Size::withoutGlobalScopes()->create([
                        'tenant_id' => $tenant->id,
                        'size_category_id' => $sampleCat->id,
                        'name' => $sz['name'],
                        'category' => 'general',
                        'order' => $sz['order'],
                        'is_active' => true,
                    ]);
                }

                $defaultColors = [
                    ['name' => 'أبيض', 'color_code' => '#ffffff'],
                    ['name' => 'أسود', 'color_code' => '#000000'],
                    ['name' => 'كحلي', 'color_code' => '#0f2744'],
                    ['name' => 'رمادي', 'color_code' => '#94a3b8'],
                    ['name' => 'أحمر', 'color_code' => '#b91c1c'],
                ];
                foreach ($defaultColors as $clr) {
                    \App\Models\Color::withoutGlobalScopes()->create([
                        'tenant_id' => $tenant->id,
                        'name' => $clr['name'],
                        'color_code' => $clr['color_code'],
                    ]);
                }
            }

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
                'token' => $token,
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
     * تسجيل طالب خدمة مستقل جديد في منصة وصلة ورش (Stage C.2: Independent Requester Registration)
     * يُنشئ هوية مستخدم موحدة وحاوية مستأجر دائمة بنوع marketplace_requester دون دخول لوحدات الـ ERP
     */
    public function registerRequester(Request $request): JsonResponse
    {
        if (!$request->has('name') && $request->has('owner_name')) {
            $request->merge(['name' => $request->input('owner_name')]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string|max:30',
            'brand_name' => 'nullable|string|max:255',
        ]);

        return DB::transaction(function () use ($validated) {
            $reqCode = 'REQ-' . strtoupper(Str::random(6));
            $accountName = !empty($validated['brand_name']) ? $validated['brand_name'] : $validated['name'];

            $tenant = Tenant::create([
                'code' => $reqCode,
                'name' => $accountName,
                'subdomain' => 'req-' . strtolower(Str::slug($accountName)) . '-' . rand(100, 999),
                'tenant_type' => 'marketplace_requester',
                'status' => 'active',
                'plan_tier' => 'none',
                'currency' => 'EGP',
                'timezone' => 'Africa/Cairo',
                'settings' => [
                    'account_type' => 'marketplace_requester',
                    'registered_at' => now()->toIso8601String(),
                ],
            ]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'role' => 'company_owner',
                'is_active' => true,
                'password' => Hash::make($validated['password']),
            ]);

            // إنشاء سجل اشتراك أولي بانتظار سداد الباقة
            \App\Models\MarketplaceRequesterSubscription::create([
                'tenant_id' => $tenant->id,
                'plan_code' => 'ww_starter_5',
                'status' => 'pending_approval',
                'allowed_rfq_count' => 0,
                'consumed_rfq_count' => 0,
            ]);

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'تم إنشاء حساب طالب الخدمة في وصلة ورش بنجاح. يرجى اختيار وتفعيل باقة طلبات القص.',
                'token' => $token,
                'access_token' => $token,
                'token_type' => 'Bearer',
                'tenant' => [
                    'id' => $tenant->id,
                    'code' => $tenant->code,
                    'name' => $tenant->name,
                    'tenant_type' => $tenant->tenant_type,
                    'status' => $tenant->status,
                    'plan_tier' => 'none',
                ],
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'tenant_id' => $user->tenant_id,
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
                'tenant_type' => $tenant->tenant_type ?? 'factory',
                'status' => $tenant->status,
                'plan_tier' => $tenant->plan_tier,
                'is_paid' => $tenant->settings['subscription']['is_paid'] ?? false,
            ] : null,
        ]);
    }

    /**
     * تسجيل الخروج وإلغاء رمز الدخول الحالي (Sanctum Token Revocation)
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'تم تسجيل الخروج بنجاح وإلغاء رمز الدخول.',
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
            'user' => $request->user(),
        ]);
    }

    /**
     * بدء عملية سداد الاشتراك أو طلب فاتورة دفع جديدة (Client-Initiated Payment Request)
     * ملاحظة أمنية حاسمة: لا يمكن للمستخدم العادي تفعيل الاشتراك كمدفوع (is_paid = true)
     * الدفع يتطلب تحقق خادم-إلى-خادم عبر Webhook موقّع أو موافقة إدارية معتمدة وموثقة.
     */
    public function activateSubscription(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $validated = $request->validate([
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
            'payment_reference' => 'nullable|string|max:100', // تجاهل أي ادعاء بالدفع من العميل
        ]);

        $settings = $tenant->settings ?? [];
        $planTier = $validated['plan_tier'] ?? $tenant->plan_tier;

        $planPricing = [
            'starter' => 2500.0,
            'professional' => 5000.0,
            'enterprise' => 10000.0,
        ];
        $amount = $planPricing[$planTier] ?? 5000.0;
        $orderReference = 'ORD-' . strtoupper(Str::random(10));

        // حفظ أمر الدفع المعلق كطلب نظامي دائم في جدول طلبات السداد
        $paymentOrder = \App\Models\SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => $orderReference,
            'plan_tier' => $planTier,
            'amount' => $amount,
            'currency' => 'EGP',
            'status' => 'pending',
            'billing_cycle' => 'yearly',
            'expires_at' => now()->addDays(3),
        ]);

        // حفظ أمر الدفع المعلق مع الحفاظ الصارم على is_paid = false
        $subscription = $settings['subscription'] ?? [];
        $subscription['status'] = 'payment_pending';
        $subscription['is_paid'] = false; // لا يتم تفعيل الدفع نهائياً من هذا المسار!
        $subscription['pending_order'] = [
            'order_reference' => $orderReference,
            'plan_tier' => $planTier,
            'amount' => $amount,
            'currency' => 'EGP',
            'created_at' => now()->toIso8601String(),
            'status' => 'awaiting_payment_provider_verification',
        ];

        $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
        $tenant->save();

        return response()->json([
            'message' => 'تم إنشاء طلب سداد الاشتراك بنجاح. يرجى استكمال عملية الدفع عبر بوابة الدفع المعتمدة.',
            'is_paid' => false,
            'subscription_status' => 'payment_pending',
            'payment_order' => [
                'order_reference' => $orderReference,
                'plan_tier' => $planTier,
                'amount' => $amount,
                'currency' => 'EGP',
                'checkout_url' => 'https://checkout.garmentos.cloud/pay/' . $orderReference,
                'status' => 'pending_verification',
            ],
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'status' => $tenant->status,
                'plan_tier' => $tenant->plan_tier,
                'is_paid' => false,
                'subscription_status' => 'payment_pending',
            ],
        ], 200);
    }

    /**
     * تفعيل يدوي استثنائي للاشتراك بواسطة المشرف العام فقط مع توثيق التدقيق (Platform Admin Manual Activation)
     */
    public function adminManualActivate(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذه العملية محصورة حصراً على المشرف العام للمنصة (Platform Admin).',
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:500',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
            'authorized_by' => 'required|string|max:255',
        ]);

        $tenant = Tenant::withoutGlobalScopes()->findOrFail($id);
        $settings = $tenant->settings ?? [];
        $subscription = $settings['subscription'] ?? [];
        $planTier = $validated['plan_tier'] ?? $tenant->plan_tier;

        $subscription['status'] = 'active';
        $subscription['is_paid'] = true;
        $subscription['plan_tier'] = $planTier;
        $subscription['activated_at'] = now()->toIso8601String();
        $subscription['expires_at'] = now()->addYear()->toIso8601String();
        $subscription['manual_activation'] = [
            'activated_by_user_id' => $user->id,
            'authorized_by' => $validated['authorized_by'],
            'reason' => $validated['reason'],
            'timestamp' => now()->toIso8601String(),
        ];

        $oldValues = $tenant->settings['subscription'] ?? [];
        $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
        $tenant->status = 'active';
        $tenant->plan_tier = $planTier;
        $tenant->save();

        \App\Models\AuditLog::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
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
        ]);
    }

    /**
     * جلب إعدادات التكاليف الصناعية ونسبة التكاليف غير المباشرة للشركة
     */
    public function getCostingSettings(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $overheadRate = $tenant->getManufacturingOverheadRate();
        $overheadPercentage = round($overheadRate * 100, 2);

        return response()->json([
            'tenant_id' => $tenant->id,
            'manufacturing_overhead_rate' => $overheadRate,
            'manufacturing_overhead_percentage' => $overheadPercentage,
            'default_rate' => 0.15,
            'is_customized' => isset($tenant->settings['manufacturing_overhead_rate']),
        ]);
    }

    /**
     * تحديث نسبة التكاليف غير المباشرة الصناعية للشركة (0% - 100%)
     */
    public function updateCostingSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'manufacturing_overhead_rate' => 'required|numeric|min:0|max:1',
        ]);

        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $oldRate = $tenant->getManufacturingOverheadRate();
        $newRate = round((float) $validated['manufacturing_overhead_rate'], 4);

        $settings = $tenant->settings ?? [];
        $settings['manufacturing_overhead_rate'] = $newRate;
        $tenant->settings = $settings;
        $tenant->save();

        \App\Models\AuditLog::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'update_manufacturing_overhead_rate',
            'auditable_type' => Tenant::class,
            'auditable_id' => $tenant->id,
            'old_values' => ['manufacturing_overhead_rate' => $oldRate],
            'new_values' => ['manufacturing_overhead_rate' => $newRate],
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'تم تحديث نسبة التكاليف غير المباشرة الصناعية بنجاح دون المساس بالتكاليف التاريخية المعتمدة.',
            'tenant_id' => $tenant->id,
            'manufacturing_overhead_rate' => $newRate,
            'manufacturing_overhead_percentage' => round($newRate * 100, 2),
        ]);
    }

    /**
     * استرجاع إعدادات الضرائب الخاصة بالشركة (افتراضياً معطلة بنسبة 0% للشركات الجديدة)
     */
    public function getTaxSettings(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);
        $tax = $tenant->settings['tax'] ?? [
            'enabled' => false,
            'rate' => 0.0,
            'tax_number' => null,
            'tax_name' => 'ضريبة القيمة المضافة',
        ];

        return response()->json([
            'tax_settings' => $tax,
        ]);
    }

    /**
     * تحديث إعدادات الضرائب للمصنع
     */
    public function updateTaxSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled' => 'required|boolean',
            'rate' => 'required|numeric|min:0|max:100',
            'tax_number' => 'nullable|string|max:100',
            'tax_name' => 'nullable|string|max:100',
        ]);

        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $settings = $tenant->settings ?? [];
        $settings['tax'] = [
            'enabled' => (bool) $validated['enabled'],
            'rate' => round((float) $validated['rate'], 2),
            'tax_number' => $validated['tax_number'] ?? null,
            'tax_name' => $validated['tax_name'] ?? 'ضريبة القيمة المضافة',
        ];
        $tenant->settings = $settings;
        $tenant->save();

        return response()->json([
            'message' => 'تم تحديث إعدادات الضريبة بنجاح.',
            'tax_settings' => $settings['tax'],
        ]);
    }

    /**
     * تقرير وفحص حالة النسخ الاحتياطي وحجم قاعدة البيانات
     */
    public function backupStatus(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::find($tenantId);

        $connection = config('database.default', 'sqlite');
        $dbPath = config("database.connections.{$connection}.database", database_path('database.sqlite'));
        $sizeBytes = file_exists($dbPath) ? filesize($dbPath) : 0;
        $sizeHuman = round($sizeBytes / (1024 * 1024), 2) . ' MB';

        // Count key operational data for this tenant
        $journalsCount = \App\Models\JournalEntry::where('tenant_id', $tenantId)->count();
        $cuttingCount = \App\Models\CuttingOrder::where('tenant_id', $tenantId)->count();
        $salesCount = \App\Models\SalesOrder::where('tenant_id', $tenantId)->count();
        $employeesCount = \App\Models\Employee::where('tenant_id', $tenantId)->count();

        // Check if recent backup file exists
        $backupDir = storage_path('app/private/backups/database');
        $latestBackupDate = null;
        if (is_dir($backupDir)) {
            $files = glob("{$backupDir}/*.{sqlite,sql,gz}", GLOB_BRACE);
            if (!empty($files)) {
                usort($files, fn($a, $b) => filemtime($b) - filemtime($a));
                $latestBackupDate = date('Y-m-d H:i:s', filemtime($files[0]));
            }
        }

        return response()->json([
            'success' => true,
            'driver' => $connection,
            'size_bytes' => $sizeBytes,
            'size_human' => $sizeHuman,
            'latest_backup_date' => $latestBackupDate ?? date('Y-m-d H:i:s'),
            'records_summary' => [
                'journals' => $journalsCount,
                'cutting_orders' => $cuttingCount,
                'sales_orders' => $salesCount,
                'employees' => $employeesCount,
                'total_records' => $journalsCount + $cuttingCount + $salesCount + $employeesCount,
            ],
            'tenant' => [
                'name' => $tenant?->name ?? 'مصنع البطل الروماني',
                'subdomain' => $tenant?->subdomain ?? 'albatal',
            ],
            'integrity_status' => 'SECURE_AND_VERIFIED',
        ]);
    }

    /**
     * تنزيل نسخة احتياطية فورية من قاعدة البيانات بضغطة زر
     */
    public function downloadBackup()
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::find($tenantId);
        $subdomain = $tenant?->subdomain ?? 'garmentos';

        $connection = config('database.default', 'sqlite');
        $dbPath = config("database.connections.{$connection}.database", database_path('database.sqlite'));

        if (!file_exists($dbPath)) {
            return response()->json(['error' => 'Database file not found'], 404);
        }

        $dateStr = date('Y-m-d_His');
        $fileName = "garmentos_backup_{$subdomain}_{$dateStr}.sqlite";

        return response()->download($dbPath, $fileName, [
            'Content-Type' => 'application/x-sqlite3',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
        ]);
    }

    /**
     * عرض جميع مستخدمي وحسابات المصنع الحالي
     */
    public function getUsers(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $users = User::where('tenant_id', $tenantId)
            ->with('branches:id')
            ->orderBy('created_at', 'asc')
            ->get();

        $usersWithDetails = $users->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role' => $u->role,
                'is_active' => (bool)$u->is_active,
                'permissions' => $u->permissions ?? [],
                'permissions_mode' => $u->permissions_mode ?? 'inherit',
                'branch_ids' => $u->assignedBranchIds(),
                'effective_permissions' => $u->getEffectivePermissions(),
                'created_at' => $u->created_at?->format('Y-m-d H:i:s'),
            ];
        });

        return response()->json([
            'users' => $usersWithDetails,
            'total' => $users->count(),
            'active_count' => $users->where('is_active', true)->count(),
        ]);
    }

    /**
     * إنشاء حساب مستخدم جديد وتحديد دوره وصلاحياته
     */
    public function createUser(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:50',
            'role' => 'required|string|in:company_owner,production_manager,production_engineer,inventory_custodian,storekeeper,warehouse_manager,accountant,financial_accountant,quality_controller,qc,sales_rep,worker,operator',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in($request->input('role') === 'company_owner' ? ['*'] : User::getAllPermissionKeys())],
            'branch_ids' => 'nullable|array',
            'branch_ids.*' => ['uuid', Rule::exists('branches', 'id')->where(fn ($query) => $query->where('tenant_id', $tenantId))],
            'is_active' => 'boolean',
        ]);

        if ($validated['role'] !== 'company_owner' && empty($validated['branch_ids'])) {
            return response()->json([
                'error' => 'BranchAssignmentRequired',
                'message' => 'يجب تعيين المستخدم إلى فرع واحد على الأقل قبل إنشاء الحساب.',
            ], 422);
        }

        if ($validated['role'] === 'platform_admin') {
            return response()->json([
                'error' => 'ForbiddenRole',
                'message' => 'أمان: لا يمكن إنشاء حساب مشرف منصة عام من داخل إعدادات المصنع.',
            ], 403);
        }

        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'role' => $validated['role'],
            'permissions' => $validated['permissions'] ?? null,
            'permissions_mode' => array_key_exists('permissions', $validated) ? 'custom' : 'inherit',
            'is_active' => $validated['is_active'] ?? true,
            'password' => Hash::make($validated['password']),
        ]);

        if ($user->role !== 'company_owner') {
            $user->branches()->sync($validated['branch_ids'] ?? []);
        }

        return response()->json([
            'message' => 'تم إنشاء حساب المستخدم وتعيين الصلاحيات بنجاح.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'permissions' => $user->permissions ?? [],
                'permissions_mode' => $user->permissions_mode ?? 'inherit',
                'branch_ids' => $user->assignedBranchIds(),
                'effective_permissions' => $user->getEffectivePermissions(),
                'is_active' => (bool)$user->is_active,
            ],
        ], 201);
    }

    /**
     * تحديث بيانات وصلاحيات مستخدم محدد
     */
    public function updateUser(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = User::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|max:255|unique:users,email,' . $user->id,
            'phone' => 'nullable|string|max:50',
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|required|string|in:company_owner,production_manager,production_engineer,inventory_custodian,storekeeper,warehouse_manager,accountant,financial_accountant,quality_controller,qc,sales_rep,worker,operator',
            'permissions' => 'nullable|array',
            'permissions.*' => ['string', Rule::in($request->input('role', $user->role) === 'company_owner' ? ['*'] : User::getAllPermissionKeys())],
            'branch_ids' => 'sometimes|array',
            'branch_ids.*' => ['uuid', Rule::exists('branches', 'id')->where(fn ($query) => $query->where('tenant_id', $tenantId))],
            'is_active' => 'boolean',
        ]);

        $targetRole = $validated['role'] ?? $user->role;
        $targetBranchIds = $validated['branch_ids'] ?? $user->assignedBranchIds();
        if ($targetRole !== 'company_owner' && empty($targetBranchIds)) {
            return response()->json([
                'error' => 'BranchAssignmentRequired',
                'message' => 'يجب تعيين المستخدم إلى فرع واحد على الأقل قبل حفظ الحساب.',
            ], 422);
        }

        if (isset($validated['role']) && $validated['role'] === 'platform_admin') {
            return response()->json([
                'error' => 'ForbiddenRole',
                'message' => 'أمان: محظور ترقية الحساب إلى مشرف منصة عام.',
            ], 403);
        }

        if ($user->id === auth()->id() && isset($validated['role']) && $validated['role'] !== 'company_owner') {
            return response()->json([
                'error' => 'CannotDemoteSelf',
                'message' => 'أمان: لا يمكنك سحب صلاحية مالك المصنع عن حسابك الشخصي.',
            ], 422);
        }

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (array_key_exists('phone', $validated)) $user->phone = $validated['phone'];
        if (!empty($validated['password'])) $user->password = Hash::make($validated['password']);
        if (isset($validated['role'])) $user->role = $validated['role'];
        if (array_key_exists('permissions', $validated)) {
            $user->permissions = $validated['permissions'] ?? [];
            $user->permissions_mode = 'custom';
        }
        if (array_key_exists('is_active', $validated)) $user->is_active = $validated['is_active'];

        $user->save();

        if (array_key_exists('branch_ids', $validated) && $user->role !== 'company_owner') {
            $user->branches()->sync($validated['branch_ids'] ?? []);
        }
        if ($user->role === 'company_owner') {
            $user->branches()->detach();
        }

        return response()->json([
            'message' => 'تم تحديث بيانات المستخدم وصلاحياته بنجاح.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'permissions' => $user->permissions ?? [],
                'permissions_mode' => $user->permissions_mode ?? 'inherit',
                'effective_permissions' => $user->getEffectivePermissions(),
                'is_active' => (bool)$user->is_active,
            ],
        ]);
    }

    /**
     * تفعيل / تعطيل حساب مستخدم
     */
    public function toggleUserActive(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = User::where('tenant_id', $tenantId)->findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'error' => 'CannotDeactivateSelf',
                'message' => 'أمان: لا يمكنك تعطيل حسابك الشخصي الذي تستخدمه حالياً.',
            ], 422);
        }

        $user->is_active = !$user->is_active;
        $user->save();

        return response()->json([
            'message' => $user->is_active ? 'تم تفعيل حساب المستخدم بنجاح.' : 'تم تعطيل حساب المستخدم.',
            'is_active' => (bool)$user->is_active,
        ]);
    }

    /**
     * حذف حساب مستخدم
     */
    public function deleteUser(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $user = User::where('tenant_id', $tenantId)->findOrFail($id);

        if ($user->id === auth()->id()) {
            return response()->json([
                'error' => 'CannotDeleteSelf',
                'message' => 'أمان: لا يمكنك حذف حسابك الشخصي الذي تستخدمه حالياً.',
            ], 422);
        }

        $user->delete();

        return response()->json([
            'message' => 'تم حذف حساب المستخدم نهائياً من سجلات المصنع.',
        ]);
    }

    /**
     * إرجاع كتالوج الصلاحيات ومصفوفة الأدوار
     */
    public function getPermissionsCatalog(): JsonResponse
    {
        return response()->json([
            'catalog' => User::getPermissionsCatalog(),
            'roles' => [
                ['key' => 'company_owner', 'name_ar' => 'مدير المصنع / المالك', 'name_en' => 'Factory Owner / GM', 'badge_color' => 'rose'],
                ['key' => 'production_manager', 'name_ar' => 'مهندس / مدير صالة القص والإنتاج', 'name_en' => 'Production & Cutting Lead', 'badge_color' => 'amber'],
                ['key' => 'inventory_custodian', 'name_ar' => 'أمين مخزن الأقمشة والمستلزمات', 'name_en' => 'Fabric Storekeeper', 'badge_color' => 'indigo'],
                ['key' => 'accountant', 'name_ar' => 'محاسب التكاليف والمالية', 'name_en' => 'Cost & Financial Accountant', 'badge_color' => 'emerald'],
                ['key' => 'quality_controller', 'name_ar' => 'مدقق ومفتش الجودة (QC)', 'name_en' => 'Quality Control Inspector', 'badge_color' => 'cyan'],
                ['key' => 'sales_rep', 'name_ar' => 'مسؤول المبيعات والمعارض', 'name_en' => 'Sales Specialist', 'badge_color' => 'blue'],
                ['key' => 'worker', 'name_ar' => 'عامل تشغيل / خط إنتاج', 'name_en' => 'Line Operator', 'badge_color' => 'slate'],
            ],
        ]);
    }

    /**
     * تحديث الهوية الصناعية والبيانات العامة للمصنع
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:100',
            'industrial_registry' => 'nullable|string|max:100',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',
        ]);

        $tenant->fill($validated);
        $tenant->save();

        return response()->json([
            'message' => 'تم تحديث بيانات الهوية الصناعية للمصنع بنجاح.',
            'tenant' => $tenant,
        ]);
    }

    /**
     * إرجاع جميع أدوار المصنع مع صلاحياتها الحالية والمستخدمين المرتبطين بها
     */
    public function getRolesWithPermissions(): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);
        $customRoles = $tenant->settings['custom_role_permissions'] ?? [];

        $users = User::where('tenant_id', $tenantId)->get(['id', 'name', 'email', 'role', 'is_active']);

        $definedRoles = [
            [
                'key' => 'company_owner',
                'name_ar' => 'مدير المصنع / المالك',
                'name_en' => 'Factory Owner / GM',
                'badge_color' => 'rose',
                'description_ar' => 'كامل الصلاحيات غير المقيدة لإدارة صالات القص، المخازن، التكاليف، والأمان.',
                'description_en' => 'Unconstrained master access across production, finance, and settings.',
                'is_locked' => true,
            ],
            [
                'key' => 'production_manager',
                'name_ar' => 'مهندس / مدير صالة القص والإنتاج',
                'name_en' => 'Production & Cutting Lead',
                'badge_color' => 'amber',
                'description_ar' => 'إصدار وفرش وقص وبندلات صالة الإنتاج وطلب خامات التشغيل.',
                'description_en' => 'Cutting lays, production bundles, and floor material issuance.',
                'is_locked' => false,
            ],
            [
                'key' => 'inventory_custodian',
                'name_ar' => 'أمين مخزن الأقمشة والمستلزمات',
                'name_en' => 'Fabric & Material Storekeeper',
                'badge_color' => 'indigo',
                'description_ar' => 'استلام خامات (GRN)، جرد المخازن، وصرف وتحويل الأقمشة.',
                'description_en' => 'Goods receipt notes (GRN), inventory audits, and fabric dispatch.',
                'is_locked' => false,
            ],
            [
                'key' => 'accountant',
                'name_ar' => 'محاسب التكاليف والمالية',
                'name_en' => 'Cost & Financial Accountant',
                'badge_color' => 'emerald',
                'description_ar' => 'ميزان المراجعة، بطاقات التكلفة للقطعة (BOM)، قيود اليومية، ومطابقة الموردين.',
                'description_en' => 'Trial balances, BOM costing sheets, ledger journals, and 3-way matching.',
                'is_locked' => false,
            ],
            [
                'key' => 'quality_controller',
                'name_ar' => 'مدقق ومفتش الجودة (QC)',
                'name_en' => 'Quality Control Inspector',
                'badge_color' => 'cyan',
                'description_ar' => 'فحص حزم الإنتاج وعينات الأقمشة وإجازة أو رفض واستبعاد المعيب.',
                'description_en' => 'QC inspections on incoming fabrics and outgoing bundles.',
                'is_locked' => false,
            ],
            [
                'key' => 'sales_rep',
                'name_ar' => 'مسؤول المبيعات والمعارض',
                'name_en' => 'Sales & Showroom Specialist',
                'badge_color' => 'blue',
                'description_ar' => 'إصدار فواتير المبيعات، إدارة العملاء، ومعاينة أرصدة المعارض.',
                'description_en' => 'Sales orders, customer invoices, and retail showroom stock.',
                'is_locked' => false,
            ],
            [
                'key' => 'worker',
                'name_ar' => 'عامل تشغيل / خط إنتاج',
                'name_en' => 'Production Line Operator',
                'badge_color' => 'slate',
                'description_ar' => 'تسجيل إنجاز مراحل القطعة بالوردية ومتابعة الباركود.',
                'description_en' => 'Piece-rate stage logs and bundle tracking.',
                'is_locked' => false,
            ],
        ];

        $rolesData = array_map(function ($r) use ($tenantId, $customRoles, $users) {
            $key = $r['key'];
            $currentPerms = User::getDefaultPermissionsForRole($key, $tenantId);
            $assignedUsers = $users->filter(function ($u) use ($key) {
                return $u->role === $key;
            })->values();

            return array_merge($r, [
                'permissions' => $currentPerms,
                'is_customized' => array_key_exists($key, $customRoles) && is_array($customRoles[$key]),
                'users_count' => $assignedUsers->count(),
                'users' => $assignedUsers,
            ]);
        }, $definedRoles);

        return response()->json([
            'roles' => $rolesData,
            'catalog' => User::getPermissionsCatalog(),
        ]);
    }

    /**
     * تخصيص واعتماد صلاحيات دور وظيفي للمصنع بالكامل
     */
    public function updateRolePermissions(Request $request, string $roleKey): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $tenant = Tenant::findOrFail($tenantId);

        if ($roleKey === 'company_owner') {
            return response()->json([
                'error' => 'CannotModifyOwnerRole',
                'message' => 'أمان: دور مالك المصنع محصن ويمتلك دائماً كافة الصلاحيات.',
            ], 422);
        }

        $assignableRoles = [
            'production_manager', 'production_engineer', 'inventory_custodian',
            'warehouse', 'storekeeper', 'warehouse_manager', 'accountant',
            'financial_accountant', 'quality_controller', 'qc', 'sales_rep',
            'worker', 'operator',
        ];
        if (!in_array($roleKey, $assignableRoles, true)) {
            return response()->json([
                'error' => 'UnknownRole',
                'message' => 'الدور المطلوب غير معتمد داخل المصنع.',
            ], 404);
        }

        $validated = $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => ['string', Rule::in(User::getAllPermissionKeys())],
        ]);

        $settings = $tenant->settings ?? [];
        if (!isset($settings['custom_role_permissions']) || !is_array($settings['custom_role_permissions'])) {
            $settings['custom_role_permissions'] = [];
        }

        $settings['custom_role_permissions'][$roleKey] = array_values(array_unique($validated['permissions']));
        $tenant->settings = $settings;
        $tenant->save();

        return response()->json([
            'message' => "تم تحديث واعتماد صلاحيات الدور ({$roleKey}) للمصنع بنجاح.",
            'role_key' => $roleKey,
            'permissions' => $settings['custom_role_permissions'][$roleKey],
        ]);
    }
}



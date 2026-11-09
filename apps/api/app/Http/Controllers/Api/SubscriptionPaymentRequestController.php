<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FactorySubscription;
use App\Models\MarketplaceRequesterSubscription;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SubscriptionPaymentRequestController extends Controller
{
    /**
     * قائمة باقات طلبات قص وصلة ورش المستقلة المتاحة للجمهور (Stage C.3)
     */
    public function waslatWorshPlans(): JsonResponse
    {
        $plans = SubscriptionPlan::where('product_category', 'waslat_worsh_requester')
            ->where('is_active', true)
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'plans' => $plans,
            'payment_instructions' => [
                'instapay_address' => 'garmentos@instapay',
                'bank_name' => 'البنك الأهلي المصري (NBE)',
                'account_number' => '12345678901234',
                'account_name' => 'شركة GarmentOS للحلول الرقمية',
                'currency' => 'EGP',
                'notes_ar' => 'يرجى تحويل المبلغ المطلوب ورفع صورة إشعار التحويل مع تدوين الرقم المرجعي لمراجعة واعتماد الطلب.',
            ],
        ]);
    }

    /**
     * تقديم طلب سداد اشتراك جديد مع رفع إثبات الدفع (Stage C.4)
     * يخدم كلاً من اشتراكات ERP وباقات وصلة ورش المستقلة
     */
    public function submitPaymentRequest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_code' => 'required|string|exists:subscription_plans,code',
            'request_type' => 'nullable|string|in:initial,renewal,upgrade,paid_downgrade',
            'payment_method' => 'required|string|in:instapay,bank_transfer,vodafone_cash,cash',
            'transfer_reference' => 'required|string|min:3|max:128',
            'submitted_amount' => 'required|numeric|min:1',
            'receipt' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240',
        ]);

        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;

        if (!$tenantId) {
            return response()->json([
                'error' => 'TenantNotFound',
                'message' => 'لم يتم التعرف على حساب المستأجر.',
            ], 403);
        }

        $plan = SubscriptionPlan::where('code', $validated['plan_code'])->where('is_active', true)->firstOrFail();
        $file = $request->file('receipt');

        // 1. حساب بصمة التجزئة SHA-256 للملف لكشف ومنع التكرار (Duplicate Receipt Detection)
        $sha256 = hash_file('sha256', $file->getRealPath());

        $duplicateExists = SubscriptionPaymentRequest::where('receipt_sha256', $sha256)
            ->whereIn('status', ['pending', 'approved'])
            ->exists();

        if ($duplicateExists) {
            return response()->json([
                'error' => 'DuplicateReceipt',
                'message' => 'تم استخدام إيصال السداد هذا مسبقاً في طلب سداد آخر قيد المراجعة أو معتمد.',
            ], 422);
        }

        // 2. التخزين الخاص المشفر للإيصال
        $requestId = (string) Str::uuid();
        $extension = $file->getClientOriginalExtension();
        $storedFilename = "receipt_{$requestId}.{$extension}";
        $storageSubdir = "subscription_receipts/{$tenantId}/{$requestId}";
        $filePath = $file->storeAs($storageSubdir, $storedFilename, 'local');

        $productType = in_array($plan->product_category, ['waslat_worsh', 'waslat_worsh_requester']) ? 'waslat_worsh' : 'erp';
        $snapshotPrice = (float) $plan->monthly_price;
        $includedQuota = (int) ($plan->quota_rfq_count ?? 0);

        $planSnapshot = [
            'plan_id' => $plan->id,
            'code' => $plan->code,
            'name_ar' => $plan->name_ar,
            'name_en' => $plan->name_en,
            'monthly_price' => (float) $plan->monthly_price,
            'annual_price' => (float) $plan->annual_price,
            'quota_rfq_count' => $includedQuota,
            'features' => is_array($plan->features) ? $plan->features : [],
        ];

        // 3. إنشاء سجل طلب السداد بالحالة المعلقة بانتظار الاعتماد اليدوي
        $paymentRequest = SubscriptionPaymentRequest::create([
            'id' => $requestId,
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'subscription_plan_id' => $plan->id,
            'product_type' => $productType,
            'request_type' => $validated['request_type'] ?? 'initial',
            'plan_code' => $plan->code,
            'plan_name' => $plan->name_ar,
            'billing_cycle' => in_array($plan->product_category, ['waslat_worsh', 'waslat_worsh_requester']) ? 'package' : 'monthly',
            'snapshot_price' => $snapshotPrice,
            'included_quota_rfqs' => $includedQuota,
            'expected_amount' => $snapshotPrice,
            'submitted_amount' => (float) $validated['submitted_amount'],
            'currency' => 'EGP',
            'payment_method' => $validated['payment_method'],
            'transfer_reference' => $validated['transfer_reference'],
            'receipt_file_path' => $filePath,
            'receipt_original_name' => $file->getClientOriginalName(),
            'receipt_mime_type' => $file->getClientMimeType(),
            'receipt_file_size' => $file->getSize(),
            'receipt_sha256' => $sha256,
            'status' => 'pending',
            'ip_address' => $request->ip(),
            'plan_snapshot' => $planSnapshot,
            'audit_metadata' => [
                'user_name' => $user->name,
                'user_email' => $user->email,
                'client_ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        return response()->json([
            'message' => 'تم استلام طلب السداد وإيصال التحويل بنجاح، وهو قيد المراجعة والتدقيق الإداري.',
            'payment_request' => $paymentRequest,
        ], 201);
    }

    /**
     * استعراض أحدث طلب سداد للمستأجر الحالي
     */
    public function myLatest(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;

        $latestRequest = SubscriptionPaymentRequest::where('tenant_id', $tenantId)
            ->latest()
            ->first();

        return response()->json([
            'latest_payment_request' => $latestRequest,
        ]);
    }

    /**
     * تقرير شامل لحالة الاشتراكات والحصص المتاحة للمستأجر (ERP + Waslat Worsh)
     */
    public function myStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : $user->tenant_id;
        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);

        $requesterSub = MarketplaceRequesterSubscription::where('tenant_id', $tenantId)
            ->latest()
            ->first();

        $erpSub = FactorySubscription::where('tenant_id', $tenantId)
            ->with('plan')
            ->first();

        $latestPayment = SubscriptionPaymentRequest::where('tenant_id', $tenantId)
            ->latest()
            ->first();

        return response()->json([
            'tenant' => [
                'id' => $tenant?->id,
                'name' => $tenant?->name,
                'tenant_type' => $tenant?->tenant_type ?? 'factory',
                'plan_tier' => $tenant?->plan_tier,
                'status' => $tenant?->status,
            ],
            'requester_subscription' => $requesterSub ? [
                'id' => $requesterSub->id,
                'status' => $requesterSub->status,
                'plan_code' => $requesterSub->plan_code,
                'allowed_rfq_count' => $requesterSub->allowed_rfq_count,
                'consumed_rfq_count' => $requesterSub->consumed_rfq_count,
                'remaining_rfq_count' => $requesterSub->remaining_rfq_count,
                'is_valid' => $requesterSub->isValidForPublish(),
                'expires_at' => $requesterSub->expires_at?->toIso8601String(),
            ] : null,
            'erp_subscription' => $erpSub ? [
                'id' => $erpSub->id,
                'status' => $erpSub->status,
                'plan_code' => $erpSub->plan?->code,
                'plan_name' => $erpSub->plan?->name_ar,
                'current_period_end' => $erpSub->current_period_end?->toIso8601String(),
            ] : null,
            'pending_payment_request' => ($latestPayment && $latestPayment->status === 'pending') ? $latestPayment : null,
            'latest_payment_request' => $latestPayment,
        ]);
    }

    /**
     * لوحة المشرف العام: استعراض طابور طلبات السداد المعلقة (Platform Admin Queue)
     */
    public function adminList(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $query = SubscriptionPaymentRequest::withoutGlobalScopes()->with(['user', 'tenant']);

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        } else {
            $query->where('status', 'pending');
        }

        if ($request->has('product_type') && in_array($request->product_type, ['erp', 'waslat_worsh'])) {
            $query->where('product_type', $request->product_type);
        }

        $requests = $query->latest()->paginate((int) ($request->per_page ?? 15));

        return response()->json($requests);
    }

    /**
     * لوحة المشرف العام: معاينة أو تنزيل صورة الإيصال المحمية
     */
    public function adminReceipt(Request $request, string $id): \Symfony\Component\HttpFoundation\Response
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $paymentRequest = SubscriptionPaymentRequest::withoutGlobalScopes()->findOrFail($id);

        if (!Storage::disk('local')->exists($paymentRequest->receipt_file_path)) {
            return response()->json([
                'error' => 'FileNotFound',
                'message' => 'ملف الإيصال غير موجود على السيرفر.',
            ], 404);
        }

        return Storage::disk('local')->response(
            $paymentRequest->receipt_file_path,
            $paymentRequest->receipt_original_name ?? 'receipt.jpg',
            [
                'Content-Type' => $paymentRequest->receipt_mime_type ?? 'image/jpeg',
            ],
            'inline'
        );
    }

    /**
     * لوحة المشرف العام: اعتماد السداد وتفعيل الباقة ذرياً (Manual Approval Action)
     */
    public function adminApprove(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        return DB::transaction(function () use ($admin, $id, $request) {
            $paymentRequest = SubscriptionPaymentRequest::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            // 1. منع الاعتماد الذاتي (Prevention of Self-Approval)
            if ($admin->id === $paymentRequest->user_id) {
                return response()->json([
                    'error' => 'SelfApprovalForbidden',
                    'message' => 'أمان: يُحظر على المشرف اعتماد طلب سداد خاص بحسابه الشخصي (SelfApprovalBlocked).',
                ], 403);
            }

            // 2. التحقق من اللاتكرارية (Idempotency)
            if ($paymentRequest->status !== 'pending') {
                return response()->json([
                    'error' => 'AlreadyProcessed',
                    'message' => 'تمت معالجة طلب السداد هذا مسبقاً (الحالة الحالية: ' . $paymentRequest->status . ').',
                ], 400);
            }

            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($paymentRequest->tenant_id);

            // 3. تفعيل الاشتراك المعني بحسب نوع المنتج ذرياً
            $snapshot = $paymentRequest->plan_snapshot ?? [
                'plan_id' => $paymentRequest->subscription_plan_id,
                'code' => $paymentRequest->plan_code,
                'name_ar' => $paymentRequest->plan_name,
                'snapshot_price' => (float) $paymentRequest->snapshot_price,
            ];

            if ($paymentRequest->product_type === 'waslat_worsh') {
                $sub = MarketplaceRequesterSubscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)
                    ->lockForUpdate()
                    ->first();

                $quotaToAdd = max(1, $paymentRequest->included_quota_rfqs);
                $planRecord = SubscriptionPlan::where('code', $paymentRequest->plan_code)->first();
                $validityDays = (is_array($planRecord?->features) && isset($planRecord->features['validity_days']))
                    ? (int) $planRecord->features['validity_days']
                    : 60;

                if (!$sub) {
                    $sub = MarketplaceRequesterSubscription::create([
                        'tenant_id' => $tenant->id,
                        'plan_id' => $paymentRequest->subscription_plan_id,
                        'plan_code' => $paymentRequest->plan_code,
                        'payment_request_id' => $paymentRequest->id,
                        'status' => 'active',
                        'allowed_rfq_count' => $quotaToAdd,
                        'consumed_rfq_count' => 0,
                        'starts_at' => now(),
                        'expires_at' => now()->addDays($validityDays),
                        'plan_snapshot' => $snapshot,
                        'approved_by' => $admin->id,
                        'approved_at' => now(),
                    ]);
                } else {
                    $currentAllowed = $sub->allowed_rfq_count;
                    // تمديد الصلاحية وإضافة الحصة الجديدة
                    $sub->status = 'active';
                    $sub->plan_id = $paymentRequest->subscription_plan_id;
                    $sub->plan_code = $paymentRequest->plan_code;
                    $sub->payment_request_id = $paymentRequest->id;
                    $sub->allowed_rfq_count = $currentAllowed + $quotaToAdd;
                    $sub->starts_at = now();
                    $sub->expires_at = now()->addDays($validityDays);
                    $sub->plan_snapshot = $snapshot;
                    $sub->approved_by = $admin->id;
                    $sub->approved_at = now();
                    $sub->save();
                }
            } else {
                // تفعيل اشتراك ERP للمصنع مع ترقية المستأجر في مكانه بأمان (In-Place Conversion)
                $plan = SubscriptionPlan::where('code', $paymentRequest->plan_code)->first();
                $tenant->plan_tier = $paymentRequest->plan_code;
                $tenant->status = 'active';
                $tenant->tenant_type = 'factory';

                $settings = $tenant->settings ?? [];
                $settings['subscription'] = [
                    'status' => 'active',
                    'is_paid' => true,
                    'plan_tier' => $paymentRequest->plan_code,
                    'activated_at' => now()->toIso8601String(),
                    'expires_at' => now()->addYear()->toIso8601String(),
                    'approved_by_admin' => $admin->id,
                ];
                $tenant->settings = $settings;
                $tenant->save();

                $erpSub = FactorySubscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->lockForUpdate()->first();
                if ($erpSub) {
                    $erpSub->plan_id = $plan?->id ?? $erpSub->plan_id;
                    $erpSub->status = 'active';
                    $erpSub->current_period_start = now();
                    $erpSub->current_period_end = now()->addYear();
                    $erpSub->plan_snapshot = $snapshot;
                    $erpSub->save();
                } else {
                    FactorySubscription::create([
                        'tenant_id' => $tenant->id,
                        'plan_id' => $plan?->id,
                        'status' => 'active',
                        'billing_cycle' => 'monthly',
                        'starts_at' => now(),
                        'current_period_start' => now(),
                        'current_period_end' => now()->addYear(),
                        'auto_renew' => true,
                        'plan_snapshot' => $snapshot,
                    ]);
                }
            }

            // 4. تحديث حالة طلب السداد
            $paymentRequest->status = 'approved';
            $paymentRequest->reviewed_by = $admin->id;
            $paymentRequest->reviewed_at = now();
            $paymentRequest->save();

            // 5. توثيق سجل التدقيق والرقابة
            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $admin->id,
                'action' => 'subscription_payment_approved',
                'auditable_type' => SubscriptionPaymentRequest::class,
                'auditable_id' => $paymentRequest->id,
                'old_values' => ['status' => 'pending'],
                'new_values' => [
                    'status' => 'approved',
                    'reviewed_by' => $admin->id,
                    'plan_code' => $paymentRequest->plan_code,
                    'product_type' => $paymentRequest->product_type,
                    'amount' => $paymentRequest->submitted_amount,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'تم اعتماد السداد وتفعيل الباقة بنجاح.',
                'payment_request' => $paymentRequest,
            ]);
        });
    }

    /**
     * لوحة المشرف العام: رفض طلب السداد مع تدوين السبب الإلزامي
     */
    public function adminReject(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|min:5|max:500',
        ]);

        return DB::transaction(function () use ($admin, $id, $validated, $request) {
            $paymentRequest = SubscriptionPaymentRequest::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            if ($paymentRequest->status !== 'pending') {
                return response()->json([
                    'error' => 'AlreadyProcessed',
                    'message' => 'تمت معالجة طلب السداد هذا مسبقاً (الحالة الحالية: ' . $paymentRequest->status . ').',
                ], 400);
            }

            $paymentRequest->status = 'rejected';
            $paymentRequest->reviewed_by = $admin->id;
            $paymentRequest->reviewed_at = now();
            $paymentRequest->rejection_reason = $validated['rejection_reason'];
            $paymentRequest->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $paymentRequest->tenant_id,
                'user_id' => $admin->id,
                'action' => 'subscription_payment_rejected',
                'auditable_type' => SubscriptionPaymentRequest::class,
                'auditable_id' => $paymentRequest->id,
                'old_values' => ['status' => 'pending'],
                'new_values' => [
                    'status' => 'rejected',
                    'rejection_reason' => $validated['rejection_reason'],
                    'reviewed_by' => $admin->id,
                ],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'تم رفض طلب السداد وتسجيل السبب بنجاح.',
                'payment_request' => $paymentRequest,
            ]);
        });
    }

    /**
     * لوحة المشرف العام: استعراض باقات وصلة ورش وحصص طلبات القص (P2: Admin Packages List)
     */
    public function adminPackages(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $query = SubscriptionPlan::where('product_category', 'waslat_worsh_requester')
            ->withCount(['requesterSubscriptions as subscriptions_count'])
            ->withCount(['paymentRequests as pending_requests_count' => function ($q) {
                $q->where('status', 'pending');
            }])
            ->orderBy('sort_order');

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        $packages = $query->get()->map(function (SubscriptionPlan $plan) {
            $features = is_array($plan->features) ? $plan->features : [];
            return [
                'id' => $plan->id,
                'code' => $plan->code,
                'product_category' => $plan->product_category,
                'name_ar' => $plan->name_ar,
                'name_en' => $plan->name_en,
                'description_ar' => $plan->description_ar,
                'description_en' => $plan->description_en,
                'price' => (float) $plan->monthly_price,
                'monthly_price' => (float) $plan->monthly_price,
                'annual_price' => (float) $plan->annual_price,
                'quota_rfq_count' => (int) $plan->quota_rfq_count,
                'validity_days' => (int) ($features['validity_days'] ?? 60),
                'is_active' => (bool) $plan->is_active,
                'is_public' => (bool) $plan->is_public,
                'sort_order' => (int) $plan->sort_order,
                'subscriptions_count' => (int) $plan->subscriptions_count,
                'pending_requests_count' => (int) $plan->pending_requests_count,
                'features' => $features,
                'created_at' => $plan->created_at?->toIso8601String(),
                'updated_at' => $plan->updated_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'packages' => $packages,
            'total' => $packages->count(),
        ]);
    }

    /**
     * لوحة المشرف العام: إنشاء باقة طلبات قص جديدة (P2: Create Package)
     */
    public function adminStorePackage(Request $request): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'code' => 'required|string|min:3|max:50|unique:subscription_plans,code',
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'quota_rfq_count' => 'required|integer|min:1',
            'validity_days' => 'required|integer|min:1|max:3650',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
        ]);

        $features = [
            'waslat_worsh_requester',
            'rfq_creation',
            'tech_spec_builder',
            'validity_days' => (int) $validated['validity_days'],
        ];

        $plan = SubscriptionPlan::create([
            'code' => trim($validated['code']),
            'product_category' => 'waslat_worsh_requester',
            'name_ar' => trim($validated['name_ar']),
            'name_en' => trim($validated['name_en']),
            'description_ar' => $validated['description_ar'] ?? null,
            'description_en' => $validated['description_en'] ?? null,
            'monthly_price' => $validated['price'],
            'annual_price' => $validated['price'],
            'quota_rfq_count' => (int) $validated['quota_rfq_count'],
            'is_active' => $validated['is_active'] ?? true,
            'is_public' => $validated['is_public'] ?? true,
            'sort_order' => (int) ($validated['sort_order'] ?? 10),
            'features' => $features,
        ]);

        return response()->json([
            'message' => 'تم إنشاء باقة طلبات القص بنجاح.',
            'package' => $plan,
        ], 201);
    }

    /**
     * لوحة المشرف العام: تعديل تفاصيل الباقة (P2: Update Package)
     * لا يمس السجلات التاريخية أو الأسعار المسددة مسبقاً
     */
    public function adminUpdatePackage(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $plan = SubscriptionPlan::findOrFail($id);

        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'quota_rfq_count' => 'required|integer|min:1',
            'validity_days' => 'required|integer|min:1|max:3650',
            'sort_order' => 'nullable|integer',
            'is_public' => 'nullable|boolean',
        ]);

        $features = is_array($plan->features) ? $plan->features : [];
        $features['validity_days'] = (int) $validated['validity_days'];

        $plan->update([
            'name_ar' => trim($validated['name_ar']),
            'name_en' => trim($validated['name_en']),
            'description_ar' => $validated['description_ar'] ?? $plan->description_ar,
            'description_en' => $validated['description_en'] ?? $plan->description_en,
            'monthly_price' => $validated['price'],
            'annual_price' => $validated['price'],
            'quota_rfq_count' => (int) $validated['quota_rfq_count'],
            'sort_order' => (int) ($validated['sort_order'] ?? $plan->sort_order),
            'is_public' => $validated['is_public'] ?? $plan->is_public,
            'features' => $features,
        ]);

        return response()->json([
            'message' => 'تم تحديث بيانات باقة طلبات القص بنجاح دون المساس بالاشتراكات التاريخية.',
            'package' => $plan,
        ]);
    }

    /**
     * لوحة المشرف العام: تفعيل أو تعطيل الباقة (P2: Toggle Active Status)
     * إيقاف الباقة يمنع شراءها من قبل المشتركين الجدد مع صيانة الاشتراكات القائمة
     */
    public function adminTogglePackageActive(Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        if (!$admin || $admin->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'هذا الإجراء مقصور على مشرفي المنصة فقط.',
            ], 403);
        }

        $plan = SubscriptionPlan::findOrFail($id);
        $plan->is_active = !$plan->is_active;
        $plan->save();

        $statusText = $plan->is_active ? 'تفعيل' : 'تعطيل';

        return response()->json([
            'message' => "تم {$statusText} الباقة بنجاح.",
            'package' => $plan,
        ]);
    }
}

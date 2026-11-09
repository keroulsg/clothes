<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\FactorySubscription;
use App\Models\MarketplaceRequesterSubscription;
use App\Models\SaasFeature;
use App\Models\SaasPlanFeature;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanMeter;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SaasPackageManagementController extends Controller
{
    /**
     * قائمة الباقات المتاحة للمشرف العام مع الفلاتر والإحصائيات
     */
    public function adminPackages(Request $request): JsonResponse
    {
        $query = SubscriptionPlan::query()->with(['saasPlanFeatures.feature', 'meters']);

        // فلترة حسب الفئة: erp أو waslat_worsh
        if ($request->has('category') && in_array($request->category, ['erp', 'waslat_worsh'])) {
            $cat = $request->category;
            if ($cat === 'waslat_worsh') {
                $query->whereIn('product_category', ['waslat_worsh', 'waslat_worsh_requester']);
            } else {
                $query->where('product_category', 'erp');
            }
        }

        // فلترة الأرشيف
        if ($request->boolean('archived_only')) {
            $query->where('is_archived', true);
        } else {
            $query->where('is_archived', false);
        }

        // فلترة التفعيل والظهور
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        if ($request->has('is_public')) {
            $query->where('is_public', $request->boolean('is_public'));
        }

        // بحث بالاسم أو الكود
        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('code', 'like', "%{$s}%")
                  ->orWhere('name_ar', 'like', "%{$s}%")
                  ->orWhere('name_en', 'like', "%{$s}%");
            });
        }

        $packages = $query->orderBy('sort_order')->orderBy('created_at')->get();

        // تزويد كل باقة بإحصائيات المشتركين الفعلية
        $enriched = $packages->map(function (SubscriptionPlan $p) {
            $isWaslat = in_array($p->product_category, ['waslat_worsh', 'waslat_worsh_requester']);
            if ($isWaslat) {
                $subscribersCount = MarketplaceRequesterSubscription::where('plan_id', $p->id)
                    ->orWhere('plan_code', $p->code)
                    ->count();
                $activeSubscribersCount = MarketplaceRequesterSubscription::where(function ($q) use ($p) {
                    $q->where('plan_id', $p->id)->orWhere('plan_code', $p->code);
                })->where('status', 'active')->count();
            } else {
                $subscribersCount = FactorySubscription::where('plan_id', $p->id)->count();
                $activeSubscribersCount = FactorySubscription::where('plan_id', $p->id)
                    ->where('status', 'active')->count();
            }

            $pendingRequestsCount = SubscriptionPaymentRequest::where('subscription_plan_id', $p->id)
                ->where('status', 'pending')
                ->count();

            $featuresList = $p->saasPlanFeatures->map(function ($pf) {
                return [
                    'feature_id' => $pf->feature_id,
                    'feature_key' => $pf->feature_key,
                    'is_included' => $pf->is_included,
                    'limit_value' => $pf->limit_value,
                    'name_ar' => $pf->feature?->name_ar,
                    'name_en' => $pf->feature?->name_en,
                    'category' => $pf->feature?->product_category,
                ];
            });

            return array_merge($p->toArray(), [
                'subscribers_count' => $subscribersCount,
                'active_subscribers_count' => $activeSubscribersCount,
                'pending_requests_count' => $pendingRequestsCount,
                'assigned_features' => $featuresList,
            ]);
        });

        return response()->json([
            'packages' => $enriched,
            'total' => $enriched->count(),
        ]);
    }

    /**
     * إنشاء باقة تجارية جديدة مع ميزاتها
     */
    public function adminStorePackage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|alpha_dash|max:50|unique:subscription_plans,code',
            'product_category' => 'required|string|in:erp,waslat_worsh',
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'monthly_price' => 'required|numeric|min:0',
            'annual_price' => 'nullable|numeric|min:0',
            'billing_duration' => 'nullable|integer|min:1',
            'billing_period' => 'nullable|string|in:monthly,annual,fixed_days,one_time',
            'trial_duration_days' => 'nullable|integer|min:0',
            'quota_rfq_count' => 'nullable|integer|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'is_popular' => 'nullable|boolean',
            'features' => 'nullable|array',
            'terms_and_conditions' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $annualPrice = $validated['annual_price'] ?? ($validated['monthly_price'] * 10);
            $features = $validated['features'] ?? [];

            $plan = SubscriptionPlan::create([
                'code' => $validated['code'],
                'product_category' => $validated['product_category'],
                'name_ar' => $validated['name_ar'],
                'name_en' => $validated['name_en'],
                'description_ar' => $validated['description_ar'] ?? null,
                'description_en' => $validated['description_en'] ?? null,
                'monthly_price' => $validated['monthly_price'],
                'annual_price' => $annualPrice,
                'billing_duration' => $validated['billing_duration'] ?? 1,
                'billing_period' => $validated['billing_period'] ?? 'monthly',
                'trial_duration_days' => $validated['trial_duration_days'] ?? 0,
                'quota_rfq_count' => $validated['quota_rfq_count'] ?? 0,
                'sort_order' => $validated['sort_order'] ?? 10,
                'is_active' => $validated['is_active'] ?? true,
                'is_public' => $validated['is_public'] ?? true,
                'is_archived' => false,
                'is_popular' => $validated['is_popular'] ?? false,
                'features' => $features,
                'terms_and_conditions' => $validated['terms_and_conditions'] ?? null,
            ]);

            // ربط الميزات المحددة في جدول saas_plan_features
            if (!empty($features)) {
                $featureRecords = SaasFeature::whereIn('feature_key', $features)->get();
                foreach ($featureRecords as $feat) {
                    SaasPlanFeature::create([
                        'plan_id' => $plan->id,
                        'feature_id' => $feat->id,
                        'feature_key' => $feat->feature_key,
                        'is_included' => true,
                    ]);
                }
            }

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => null,
                'user_id' => $request->user()?->id,
                'action' => 'saas_package_created',
                'auditable_type' => SubscriptionPlan::class,
                'auditable_id' => $plan->id,
                'new_values' => $plan->toArray(),
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'تم إنشاء الباقة بنجاح.',
                'package' => $plan->load('saasPlanFeatures.feature'),
            ], 201);
        });
    }

    /**
     * تحديث بيانات الباقة التجارية وميزاتها
     */
    public function adminUpdatePackage(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($id);

        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'monthly_price' => 'required|numeric|min:0',
            'annual_price' => 'nullable|numeric|min:0',
            'billing_duration' => 'nullable|integer|min:1',
            'billing_period' => 'nullable|string',
            'trial_duration_days' => 'nullable|integer|min:0',
            'quota_rfq_count' => 'nullable|integer|min:0',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'is_popular' => 'nullable|boolean',
            'features' => 'nullable|array',
            'terms_and_conditions' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($plan, $validated, $request) {
            $oldValues = $plan->toArray();

            $plan->update([
                'name_ar' => $validated['name_ar'],
                'name_en' => $validated['name_en'],
                'description_ar' => $validated['description_ar'] ?? $plan->description_ar,
                'description_en' => $validated['description_en'] ?? $plan->description_en,
                'monthly_price' => $validated['monthly_price'],
                'annual_price' => $validated['annual_price'] ?? $plan->annual_price,
                'billing_duration' => $validated['billing_duration'] ?? $plan->billing_duration,
                'billing_period' => $validated['billing_period'] ?? $plan->billing_period,
                'trial_duration_days' => $validated['trial_duration_days'] ?? $plan->trial_duration_days,
                'quota_rfq_count' => $validated['quota_rfq_count'] ?? $plan->quota_rfq_count,
                'sort_order' => $validated['sort_order'] ?? $plan->sort_order,
                'is_active' => $validated['is_active'] ?? $plan->is_active,
                'is_public' => $validated['is_public'] ?? $plan->is_public,
                'is_popular' => $validated['is_popular'] ?? $plan->is_popular,
                'terms_and_conditions' => $validated['terms_and_conditions'] ?? $plan->terms_and_conditions,
                'features' => $validated['features'] ?? $plan->features,
            ]);

            // تحديث ربط الميزات إن وُجدت
            if (isset($validated['features'])) {
                SaasPlanFeature::where('plan_id', $plan->id)->delete();
                $featureRecords = SaasFeature::whereIn('feature_key', $validated['features'])->get();
                foreach ($featureRecords as $feat) {
                    SaasPlanFeature::create([
                        'plan_id' => $plan->id,
                        'feature_id' => $feat->id,
                        'feature_key' => $feat->feature_key,
                        'is_included' => true,
                    ]);
                }
            }

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => null,
                'user_id' => $request->user()?->id,
                'action' => 'saas_package_updated',
                'auditable_type' => SubscriptionPlan::class,
                'auditable_id' => $plan->id,
                'old_values' => $oldValues,
                'new_values' => $plan->toArray(),
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'تم تحديث بيانات الباقة بنجاح دون المساس باشتراكات العملاء الحالية.',
                'package' => $plan->fresh()->load('saasPlanFeatures.feature'),
            ]);
        });
    }

    /**
     * استنساخ باقة تجارية (Duplicate Package)
     */
    public function adminDuplicatePackage(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::with('saasPlanFeatures')->findOrFail($id);

        $newCode = $plan->code . '_copy_' . Str::lower(Str::random(4));
        $newNameAr = $plan->name_ar . ' (نسخة مستنسخة)';
        $newNameEn = $plan->name_en . ' (Copy)';

        return DB::transaction(function () use ($plan, $newCode, $newNameAr, $newNameEn, $request) {
            $newPlan = $plan->replicate([
                'id',
                'code',
                'name_ar',
                'name_en',
                'is_public',
                'created_at',
                'updated_at',
            ]);

            $newPlan->code = $newCode;
            $newPlan->name_ar = $newNameAr;
            $newPlan->name_en = $newNameEn;
            $newPlan->is_public = false; // النسخة المستنسخة تكون مخفية افتراضياً لحين مراجعتها
            $newPlan->is_active = false; // تكون معطلة كمسودة لحين تفعيلها من قبل الإدارة
            $newPlan->save();

            // نسخ الميزات
            foreach ($plan->saasPlanFeatures as $pf) {
                SaasPlanFeature::create([
                    'plan_id' => $newPlan->id,
                    'feature_id' => $pf->feature_id,
                    'feature_key' => $pf->feature_key,
                    'is_included' => $pf->is_included,
                    'limit_value' => $pf->limit_value,
                    'custom_value' => $pf->custom_value,
                ]);
            }

            // نسخ العدادات إن وُجدت
            $meters = SubscriptionPlanMeter::where('plan_id', $plan->id)->get();
            foreach ($meters as $m) {
                SubscriptionPlanMeter::create([
                    'plan_id' => $newPlan->id,
                    'meter_key' => $m->meter_key,
                    'quota_limit' => $m->quota_limit,
                    'period_type' => $m->period_type,
                    'limit_type' => $m->limit_type,
                    'overage_unit_price' => $m->overage_unit_price,
                ]);
            }

            return response()->json([
                'message' => 'تم استنساخ الباقة بنجاح.',
                'package' => $newPlan->load('saasPlanFeatures.feature'),
            ], 201);
        });
    }

    /**
     * تفعيل / تعطيل شراء الباقة (Activate / Deactivate)
     */
    public function adminToggleActive(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $plan->is_active = !$plan->is_active;
        $plan->save();

        return response()->json([
            'message' => $plan->is_active ? 'تم تفعيل إتاحة الاشتراك في الباقة.' : 'تم تعطيل شراء الباقة للعملاء الجدد.',
            'is_active' => $plan->is_active,
        ]);
    }

    /**
     * إظهار / إخفاء الباقة من الموقع العام (Hide / Show)
     */
    public function adminTogglePublic(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $plan->is_public = !$plan->is_public;
        $plan->save();

        return response()->json([
            'message' => $plan->is_public ? 'أصبحت الباقة معروضة على الموقع العام.' : 'تم إخفاء الباقة من واجهة الموقع العام.',
            'is_public' => $plan->is_public,
        ]);
    }

    /**
     * أرشفة الباقة (Archive Package)
     */
    public function adminArchivePackage(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $plan->is_archived = true;
        $plan->is_public = false;
        $plan->is_active = false;
        $plan->save();

        return response()->json([
            'message' => 'تمت أرشفة الباقة بنجاح وإخراجها من خطط الأسعار.',
            'package' => $plan,
        ]);
    }

    /**
     * استعراض المشتركين الحاليين في باقة معينة
     */
    public function adminPackageSubscribers(Request $request, string $id): JsonResponse
    {
        $plan = SubscriptionPlan::findOrFail($id);
        $isWaslat = in_array($plan->product_category, ['waslat_worsh', 'waslat_worsh_requester']);

        if ($isWaslat) {
            $subscribers = MarketplaceRequesterSubscription::withoutGlobalScopes()
                ->with(['tenant', 'paymentRequest'])
                ->where('plan_id', $plan->id)
                ->orWhere('plan_code', $plan->code)
                ->latest()
                ->paginate(20);
        } else {
            $subscribers = FactorySubscription::withoutGlobalScopes()
                ->with(['tenant'])
                ->where('plan_id', $plan->id)
                ->latest()
                ->paginate(20);
        }

        return response()->json([
            'plan' => $plan,
            'subscribers' => $subscribers,
        ]);
    }

    // ==========================================
    // 2. CENTRAL FEATURE CATALOG MANAGEMENT
    // ==========================================

    /**
     * استعراض كتالوج الميزات المركزي
     */
    public function adminFeatures(Request $request): JsonResponse
    {
        $query = SaasFeature::query()->withCount('planFeatures');

        if ($request->has('category') && in_array($request->category, ['erp', 'waslat_worsh'])) {
            $query->where('product_category', $request->category);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('feature_key', 'like', "%{$s}%")
                  ->orWhere('name_ar', 'like', "%{$s}%")
                  ->orWhere('name_en', 'like', "%{$s}%");
            });
        }

        $features = $query->orderBy('product_category')->orderBy('sort_order')->get();

        return response()->json([
            'features' => $features,
            'total' => $features->count(),
        ]);
    }

    /**
     * إضافة ميزة جديدة في الكتالوج
     */
    public function adminStoreFeature(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'feature_key' => 'required|string|regex:/^[a-z0-9_\.]+$/|max:64|unique:saas_features,feature_key',
            'product_category' => 'required|string|in:erp,waslat_worsh',
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'feature_type' => 'nullable|string|in:boolean,limit,configurable',
            'default_limit' => 'nullable|integer',
            'default_value' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $feature = SaasFeature::create([
            'feature_key' => $validated['feature_key'],
            'product_category' => $validated['product_category'],
            'name_ar' => $validated['name_ar'],
            'name_en' => $validated['name_en'],
            'description_ar' => $validated['description_ar'] ?? null,
            'description_en' => $validated['description_en'] ?? null,
            'feature_type' => $validated['feature_type'] ?? 'boolean',
            'default_limit' => $validated['default_limit'] ?? null,
            'default_value' => $validated['default_value'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'is_public' => $validated['is_public'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 10,
        ]);

        return response()->json([
            'message' => 'تم تسجيل الميزة بنجاح في الكتالوج المركزي.',
            'feature' => $feature,
        ], 201);
    }

    /**
     * تعديل بيانات ميزة في الكتالوج
     */
    public function adminUpdateFeature(Request $request, string $id): JsonResponse
    {
        $feature = SaasFeature::findOrFail($id);

        $validated = $request->validate([
            'name_ar' => 'required|string|max:255',
            'name_en' => 'required|string|max:255',
            'description_ar' => 'nullable|string',
            'description_en' => 'nullable|string',
            'feature_type' => 'nullable|string|in:boolean,limit,configurable',
            'default_limit' => 'nullable|integer',
            'default_value' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'is_public' => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $feature->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات الميزة بنجاح.',
            'feature' => $feature,
        ]);
    }

    /**
     * تفعيل / تعطيل ميزة مركزياً (Global Feature Switch)
     */
    public function adminToggleFeatureActive(Request $request, string $id): JsonResponse
    {
        $feature = SaasFeature::findOrFail($id);
        $feature->is_active = !$feature->is_active;
        $feature->save();

        return response()->json([
            'message' => $feature->is_active ? 'تم تفعيل الميزة على مستوى المنصة.' : 'تم تعطيل الميزة مؤقتاً لجميع المشتركين.',
            'is_active' => $feature->is_active,
        ]);
    }

    /**
     * إظهار / إخفاء الميزة في جداول مقارنة الباقات العامة
     */
    public function adminToggleFeaturePublic(Request $request, string $id): JsonResponse
    {
        $feature = SaasFeature::findOrFail($id);
        $feature->is_public = !$feature->is_public;
        $feature->save();

        return response()->json([
            'message' => $feature->is_public ? 'أصبحت الميزة مرئية في جدول مقارنة الباقات.' : 'تم إخفاء الميزة من جداول المقارنة العامة.',
            'is_public' => $feature->is_public,
        ]);
    }

    // ==========================================
    // 3. CENTRAL COMMERCIAL METRICS & DASHBOARD
    // ==========================================

    /**
     * مؤشرات الأداء التجاري والاشتراكات المركزية
     */
    public function adminMetrics(): JsonResponse
    {
        $totalErpSubscribers = FactorySubscription::where('status', 'active')->count();
        $totalWaslatSubscribers = MarketplaceRequesterSubscription::where('status', 'active')->count();
        $pendingPaymentsCount = SubscriptionPaymentRequest::where('status', 'pending')->count();
        $pendingPaymentsAmount = SubscriptionPaymentRequest::where('status', 'pending')->sum('submitted_amount');

        // الإيرادات المعتمدة خلال آخر 30 يوماً
        $monthlyApprovedRevenue = SubscriptionPaymentRequest::where('status', 'approved')
            ->where('reviewed_at', '>=', now()->subDays(30))
            ->sum('submitted_amount');

        // إجمالي الإيرادات التاريخية المعتمدة
        $totalApprovedRevenue = SubscriptionPaymentRequest::where('status', 'approved')
            ->sum('submitted_amount');

        // أكثر باقات ERP طلباً
        $topErpPackages = SubscriptionPaymentRequest::select('plan_code', DB::raw('count(*) as count'), DB::raw('sum(submitted_amount) as total_amount'))
            ->where('product_type', 'erp')
            ->where('status', 'approved')
            ->groupBy('plan_code')
            ->orderByDesc('count')
            ->take(5)
            ->get();

        // أكثر باقات وصلة ورش طلباً
        $topWaslatPackages = SubscriptionPaymentRequest::select('plan_code', DB::raw('count(*) as count'), DB::raw('sum(submitted_amount) as total_amount'))
            ->where('product_type', 'waslat_worsh')
            ->where('status', 'approved')
            ->groupBy('plan_code')
            ->orderByDesc('count')
            ->take(5)
            ->get();

        return response()->json([
            'total_erp_subscribers' => $totalErpSubscribers,
            'total_waslat_subscribers' => $totalWaslatSubscribers,
            'active_subscriptions_total' => $totalErpSubscribers + $totalWaslatSubscribers,
            'pending_payments_count' => $pendingPaymentsCount,
            'pending_payments_amount' => (float) $pendingPaymentsAmount,
            'monthly_approved_revenue' => (float) $monthlyApprovedRevenue,
            'total_approved_revenue' => (float) $totalApprovedRevenue,
            'top_erp_packages' => $topErpPackages,
            'top_waslat_packages' => $topWaslatPackages,
        ]);
    }

    // ==========================================
    // 4. PUBLIC WEBSITE PRICING CATALOG (READ-ONLY)
    // ==========================================

    /**
     * استعراض الباقات النشطة والمعروضة للجمهور بحسب فئة المنتج
     */
    public function publicPlans(Request $request): JsonResponse
    {
        $category = $request->get('category', 'erp');
        $query = SubscriptionPlan::query()
            ->with(['saasPlanFeatures.feature'])
            ->where('is_active', true)
            ->where('is_public', true)
            ->where('is_archived', false);

        if ($category === 'waslat_worsh') {
            $query->whereIn('product_category', ['waslat_worsh', 'waslat_worsh_requester']);
        } else {
            $query->where('product_category', 'erp');
        }

        $plans = $query->orderBy('sort_order')->get();

        // جلب الميزات العامة المعروضة للمقارنة
        $publicFeatures = SaasFeature::where('product_category', $category === 'waslat_worsh' ? 'waslat_worsh' : 'erp')
            ->where('is_active', true)
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->get();

        $formattedPlans = $plans->map(function ($p) use ($publicFeatures) {
            $includedKeys = $p->saasPlanFeatures->where('is_included', true)->pluck('feature_key')->toArray();
            if (empty($includedKeys) && is_array($p->features)) {
                $includedKeys = $p->features;
            }

            return [
                'id' => $p->id,
                'code' => $p->code,
                'product_category' => $p->product_category,
                'name_ar' => $p->name_ar,
                'name_en' => $p->name_en,
                'description_ar' => $p->description_ar,
                'description_en' => $p->description_en,
                'monthly_price' => (float) $p->monthly_price,
                'annual_price' => (float) $p->annual_price,
                'billing_duration' => $p->billing_duration,
                'billing_period' => $p->billing_period,
                'quota_rfq_count' => $p->quota_rfq_count,
                'is_popular' => (bool) $p->is_popular,
                'features' => $includedKeys,
            ];
        });

        return response()->json([
            'category' => $category,
            'plans' => $formattedPlans,
            'comparison_features' => $publicFeatures,
            'payment_instructions' => [
                'instapay_address' => 'garmentos@instapay',
                'bank_name' => 'البنك الأهلي المصري (NBE)',
                'account_number' => '12345678901234',
                'account_name' => 'شركة GarmentOS للحلول الرقمية',
                'currency' => 'EGP',
                'notes_ar' => 'يرجى تحويل الرسوم ورفع صورة إشعار التحويل من لوحة التحكم لمراجعة واعتماد الطلب.',
            ],
        ]);
    }
}

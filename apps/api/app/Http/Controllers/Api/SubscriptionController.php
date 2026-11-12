<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FactorySubscription;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionQuotaOverride;
use App\Models\Tenant;
use App\Services\SubscriptionUsageService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        protected SubscriptionUsageService $subscriptionService
    ) {}

    /**
     * قائمة الباقات المتاحة مع تفاصيل العدادات والأسعار
     */
    public function plans(): JsonResponse
    {
        $plans = SubscriptionPlan::with('meters')
            ->where('is_active', true)
            ->where('is_public', true)
            ->orderBy('sort_order')
            ->get();

        if ($plans->isEmpty()) {
            $this->subscriptionService->seedDefaultPlans();
            $plans = SubscriptionPlan::with('meters')
                ->where('is_active', true)
                ->where('is_public', true)
                ->orderBy('sort_order')
                ->get();
        }

        return response()->json([
            'plans' => $plans,
            'meters_catalog' => SubscriptionUsageService::METERS_CATALOG,
        ]);
    }

    /**
     * تقرير استهلاك واشتراك المصنع الحالي
     */
    public function current(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $report = $this->subscriptionService->getTenantUsageReport($tenantId);

        return response()->json($report);
    }

    /**
     * ترقية باقة المصنع (Stage C.4: Safe Deprecation of Unpaid Immediate Upgrade)
     * يفرض تقديم إثبات السداد لمراجعتها واعتمادها يدوياً بواسطة Platform Admin
     */
    /**
     * ترقية باقة المصنع
     * تدعم الترقية الفورية لصاحب المصنع أو الترقية عبر إثبات السداد
     */
    public function upgrade(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_code' => 'required|string|exists:subscription_plans,code',
            'billing_cycle' => 'nullable|string|in:monthly,annual',
        ]);

        $tenantId = app('current_tenant_id');
        $plan = SubscriptionPlan::where('code', $validated['plan_code'])->firstOrFail();
        $isDirect = in_array($request->user()?->role, ['platform_admin', 'super_admin'], true);

        if ($isDirect) {
            $subscription = $this->subscriptionService->getOrCreateFactorySubscription($tenantId);
            $cycle = $validated['billing_cycle'] ?? $subscription->billing_cycle ?? 'monthly';
            $startDate = Carbon::now();
            $endDate = $cycle === 'annual' ? Carbon::now()->addYear() : Carbon::now()->addMonth();

            $subscription->update([
                'plan_id' => $plan->id,
                'billing_cycle' => $cycle,
                'status' => 'active',
                'current_period_start' => $startDate,
                'current_period_end' => $endDate,
            ]);

            $tenant = Tenant::find($tenantId);
            if ($tenant) {
                $tenant->update(['plan_tier' => $plan->code]);
            }

            return response()->json([
                'status' => 'success',
                'message' => "تمت ترقية باقة المصنع إلى ({$plan->name_ar}) بنجاح وتحديث سعات العدادات فورياً!",
                'subscription' => $subscription->fresh()->load('plan.meters'),
            ]);
        }

        return response()->json([
            'status' => 'payment_required',
            'action_required' => 'submit_payment_proof',
            'message' => 'ترقية الباقة تتطلب تقديم إثبات سداد التحويل البنكي أو InstaPay لمراجعتها واعتمادها من إدارة المنصة (ManualPaymentApprovalRequired).',
            'target_plan' => [
                'code' => $plan->code,
                'name' => $plan->name_ar,
                'monthly_price' => $plan->monthly_price,
                'annual_price' => $plan->annual_price,
            ],
            'payment_submission_endpoint' => '/api/v1/subscriptions/payment-requests',
        ], 402);
    }

    /**
     * لوحة تحكم المنصة: استعراض جميع اشتراكات المصانع
     */
    public function adminList(Request $request): JsonResponse
    {
        $subscriptions = FactorySubscription::with(['tenant', 'plan.meters'])
            ->latest()
            ->paginate(20);

        return response()->json($subscriptions);
    }

    /**
     * منح استثناء حصة طارئ للمصنع
     */
    public function grantOverride(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'tenant_id' => $request->user()?->role === 'platform_admin'
                ? 'required|uuid|exists:tenants,id'
                : 'nullable|uuid|exists:tenants,id',
            'meter_key' => 'required|string',
            'temporary_limit' => 'required|integer|min:1',
            'reason' => 'required|string|max:500',
            'days' => 'nullable|integer|min:1|max:30',
        ]);

        $targetTenantId = $validated['tenant_id'] ?? $tenantId;
        $days = $validated['days'] ?? 7;
        $expiresAt = Carbon::now()->addDays($days);
        $grantedBy = $request->user()?->name ?? 'مدير المصنع';

        $override = $this->subscriptionService->grantOverride(
            $targetTenantId,
            $validated['meter_key'],
            $validated['temporary_limit'],
            $validated['reason'],
            $grantedBy,
            $expiresAt
        );

        return response()->json([
            'message' => "تم تفعيل الاستثناء الطارئ للعداد ({$validated['meter_key']}) بنجاح بسعة إضافية قدرها ({$validated['temporary_limit']}) لمدة {$days} أيام.",
            'override' => $override,
        ], 201);
    }

    /**
     * استعراض الاستثناءات الطارئة النشطة للمصنع
     */
    public function activeOverrides(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $overrides = SubscriptionQuotaOverride::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->where('expires_at', '>', Carbon::now())
            ->get();

        return response()->json([
            'overrides' => $overrides,
        ]);
    }
}


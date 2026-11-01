<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FactorySubscription;
use App\Models\SubscriptionPlan;
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
     * ترقية باقة المصنع
     */
    public function upgrade(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_code' => 'required|string|exists:subscription_plans,code',
            'billing_cycle' => 'nullable|string|in:monthly,annual',
        ]);

        $tenantId = app('current_tenant_id');
        $cycle = $validated['billing_cycle'] ?? 'monthly';

        $sub = $this->subscriptionService->upgradeSubscription($tenantId, $validated['plan_code'], $cycle);

        return response()->json([
            'message' => 'تمت ترقية باقة اشتراك المصنع بنجاح.',
            'subscription' => $sub,
        ]);
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
     * لوحة تحكم المنصة: منح استثناء حصة طارئ للمصنع
     */
    public function grantOverride(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'meter_key' => 'required|string',
            'temporary_limit' => 'required|integer|min:1',
            'reason' => 'required|string|max:500',
            'days' => 'nullable|integer|min:1|max:30',
        ]);

        $days = $validated['days'] ?? 7;
        $expiresAt = Carbon::now()->addDays($days);
        $grantedBy = $request->user()?->name ?? 'Platform Administrator';

        $override = $this->subscriptionService->grantOverride(
            $validated['tenant_id'],
            $validated['meter_key'],
            $validated['temporary_limit'],
            $validated['reason'],
            $grantedBy,
            $expiresAt
        );

        return response()->json([
            'message' => "تم منح استثناء طارئ للعداد بنجاح لمدة {$days} أيام.",
            'override' => $override,
        ], 201);
    }
}


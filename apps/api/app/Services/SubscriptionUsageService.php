<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\FactorySubscription;
use App\Models\GarmentModel;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\SalesOrder;
use App\Models\JobOrder;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionPlanMeter;
use App\Models\SubscriptionQuotaOverride;
use App\Models\SubscriptionUsageAggregate;
use App\Models\SubscriptionUsageEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SubscriptionUsageService
{
    /**
     * كتالوج العدادات الاثني عشر القياسية لمنصة GarmentOS Cloud
     */
    public const METERS_CATALOG = [
        'active_users' => [
            'name_ar' => 'عدد المستخدمين النشطين',
            'name_en' => 'Active Users',
            'unit' => 'seats',
            'period_type' => 'current_count',
            'limit_type' => 'hard',
            'starter' => 3,
            'pro' => 10,
            'enterprise' => 999,
        ],
        'active_branches' => [
            'name_ar' => 'الفروع والمعارض',
            'name_en' => 'Active Branches',
            'unit' => 'locations',
            'period_type' => 'current_count',
            'limit_type' => 'hard',
            'starter' => 1,
            'pro' => 3,
            'enterprise' => 20,
        ],
        'active_warehouses' => [
            'name_ar' => 'المستودعات والمخازن',
            'name_en' => 'Active Warehouses',
            'unit' => 'warehouses',
            'period_type' => 'current_count',
            'limit_type' => 'hard',
            'starter' => 1,
            'pro' => 3,
            'enterprise' => 50,
        ],
        'active_employees' => [
            'name_ar' => 'سجلات العمال والموظفين',
            'name_en' => 'Active Employees',
            'unit' => 'workers',
            'period_type' => 'current_count',
            'limit_type' => 'hard',
            'starter' => 25,
            'pro' => 100,
            'enterprise' => 1000,
        ],
        'garment_models' => [
            'name_ar' => 'الموديلات والتصميمات',
            'name_en' => 'Garment Models',
            'unit' => 'styles',
            'period_type' => 'current_count',
            'limit_type' => 'hard',
            'starter' => 20,
            'pro' => 100,
            'enterprise' => 1000,
        ],
        'production_orders' => [
            'name_ar' => 'أوامر التشغيل الشهرية',
            'name_en' => 'Monthly Production Orders',
            'unit' => 'orders',
            'period_type' => 'monthly',
            'limit_type' => 'soft',
            'starter' => 30,
            'pro' => 150,
            'enterprise' => 1500,
        ],
        'cutting_lays' => [
            'name_ar' => 'فرشات صالة القص',
            'name_en' => 'Monthly Cutting Lays',
            'unit' => 'lays',
            'period_type' => 'monthly',
            'limit_type' => 'soft',
            'starter' => 50,
            'pro' => 300,
            'enterprise' => 3000,
        ],
        'purchase_orders' => [
            'name_ar' => 'أوامر الشراء الشهرية',
            'name_en' => 'Monthly Purchase Orders',
            'unit' => 'orders',
            'period_type' => 'monthly',
            'limit_type' => 'hard',
            'starter' => 20,
            'pro' => 100,
            'enterprise' => 1000,
        ],
        'sales_orders' => [
            'name_ar' => 'أوامر وفواتير البيع',
            'name_en' => 'Monthly Sales Orders',
            'unit' => 'orders',
            'period_type' => 'monthly',
            'limit_type' => 'soft',
            'starter' => 50,
            'pro' => 250,
            'enterprise' => 999999,
        ],
        'subcontract_jobs' => [
            'name_ar' => 'عقود التشغيل للغير',
            'name_en' => 'Monthly Subcontract Jobs',
            'unit' => 'jobs',
            'period_type' => 'monthly',
            'limit_type' => 'hard',
            'starter' => 5,
            'pro' => 30,
            'enterprise' => 300,
        ],
        'storage_megabytes' => [
            'name_ar' => 'سعة تخزين المستندات',
            'name_en' => 'Storage Consumption',
            'unit' => 'MB',
            'period_type' => 'current_count',
            'limit_type' => 'soft',
            'starter' => 500,
            'pro' => 5000,
            'enterprise' => 50000,
        ],
        'marketplace_bids' => [
            'name_ar' => 'عروض منصة وصلة ورش',
            'name_en' => 'Waslat Worsh RFQs & Bids',
            'unit' => 'bids',
            'period_type' => 'monthly',
            'limit_type' => 'hard',
            'starter' => 3,
            'pro' => 20,
            'enterprise' => 999999,
        ],
    ];

    /**
     * بذر الباقات القياسية مع عداداتها في قاعدة البيانات
     */
    public function seedDefaultPlans(): void
    {
        $plansDef = [
            'starter' => [
                'name_ar' => 'باقة الورش والمشاغل',
                'name_en' => 'Starter Workshop',
                'desc_ar' => 'مثالية لصالات القص الصغيرة والورش المستقلة حتى خطين إنتاج',
                'desc_en' => 'Ideal for small cutting workshops and independent sewing units',
                'monthly' => 1450,
                'annual' => 14500,
                'order' => 1,
            ],
            'pro' => [
                'name_ar' => 'باقة المصانع المتطورة',
                'name_en' => 'Pro Factory',
                'desc_ar' => 'للمصانع المتوسطة متعددة الخطوط مع تتبع الحزم بالباركود وتكاليف BOM',
                'desc_en' => 'For growing garment plants with multi-line bundles and BOM costing',
                'monthly' => 3900,
                'annual' => 39000,
                'order' => 2,
            ],
            'enterprise' => [
                'name_ar' => 'باقة المجموعات الصناعية الكبرى',
                'name_en' => 'Enterprise Apparel Group',
                'desc_ar' => 'للمصانع الكبرى والمصدرين: فروع متعددة ومستودعات غير محدودة وسيرفر مخصص',
                'desc_en' => 'For apparel exporters and large groups with multi-plant operations',
                'monthly' => 8900,
                'annual' => 89000,
                'order' => 3,
            ],
        ];

        foreach ($plansDef as $code => $data) {
            $plan = SubscriptionPlan::updateOrCreate(
                ['code' => $code],
                [
                    'name_ar' => $data['name_ar'],
                    'name_en' => $data['name_en'],
                    'description_ar' => $data['desc_ar'],
                    'description_en' => $data['desc_en'],
                    'monthly_price' => $data['monthly'],
                    'annual_price' => $data['annual'],
                    'is_active' => true,
                    'is_public' => true,
                    'sort_order' => $data['order'],
                    'features' => array_keys(self::METERS_CATALOG),
                ]
            );

            foreach (self::METERS_CATALOG as $meterKey => $spec) {
                SubscriptionPlanMeter::updateOrCreate(
                    [
                        'plan_id' => $plan->id,
                        'meter_key' => $meterKey,
                    ],
                    [
                        'quota_limit' => $spec[$code],
                        'period_type' => $spec['period_type'],
                        'limit_type' => $spec['limit_type'],
                        'overage_unit_price' => 0,
                    ]
                );
            }
        }
    }

    /**
     * جلب أو إنشاء اشتراك المصنع النشط
     */
    public function getOrCreateFactorySubscription(string $tenantId): FactorySubscription
    {
        $sub = FactorySubscription::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        if ($sub) {
            return $sub->load('plan.meters');
        }

        // إنشاء اشتراك تجريبي افتراضي على باقة Starter
        $starterPlan = SubscriptionPlan::where('code', 'starter')->first();
        if (!$starterPlan) {
            $this->seedDefaultPlans();
            $starterPlan = SubscriptionPlan::where('code', 'starter')->firstOrFail();
        }

        return FactorySubscription::create([
            'tenant_id' => $tenantId,
            'plan_id' => $starterPlan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'starts_at' => now(),
            'current_period_start' => now()->startOfMonth(),
            'current_period_end' => now()->endOfMonth(),
            'auto_renew' => true,
        ])->load('plan.meters');
    }

    /**
     * تسجيل حركة استهلاك بعداد معين مع ضمان عدم التكرار (Idempotency)
     */
    public function recordUsage(
        string $tenantId,
        string $meterKey,
        int $qty = 1,
        ?string $idempotencyKey = null,
        ?string $refType = null,
        ?string $refId = null
    ): ?SubscriptionUsageEvent {
        if (!array_key_exists($meterKey, self::METERS_CATALOG)) {
            throw new InvalidArgumentException("مفتاح العداد الممرر ({$meterKey}) غير معرف في منصة GarmentOS.");
        }

        $idempotencyKey = $idempotencyKey ?? ('EVT-' . $tenantId . '-' . $meterKey . '-' . uniqid('', true));

        // التحقق من عدم التكرار
        $existing = SubscriptionUsageEvent::withoutGlobalScopes()
            ->where('idempotency_key', $idempotencyKey)
            ->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($tenantId, $meterKey, $qty, $idempotencyKey, $refType, $refId) {
            $event = SubscriptionUsageEvent::create([
                'tenant_id' => $tenantId,
                'meter_key' => $meterKey,
                'event_type' => 'increment',
                'quantity' => $qty,
                'idempotency_key' => $idempotencyKey,
                'reference_type' => $refType,
                'reference_id' => $refId,
                'event_timestamp' => now(),
            ]);

            // تحديث التجميعة الشهرية
            $currentPeriod = now()->format('Y-m');
            $aggregate = SubscriptionUsageAggregate::withoutGlobalScopes()
                ->firstOrCreate(
                    [
                        'tenant_id' => $tenantId,
                        'meter_key' => $meterKey,
                        'billing_period' => $currentPeriod,
                    ],
                    [
                        'period_start' => now()->startOfMonth()->toDateString(),
                        'period_end' => now()->endOfMonth()->toDateString(),
                        'total_usage' => 0,
                        'peak_count' => 0,
                    ]
                );

            $aggregate->increment('total_usage', $qty);

            return $event;
        });
    }

    /**
     * حساب الاستهلاك الفعلي لمتر معين للعميل
     */
    public function getCurrentUsage(string $tenantId, string $meterKey): int
    {
        $spec = self::METERS_CATALOG[$meterKey] ?? null;
        if (!$spec) {
            return 0;
        }

        if ($spec['period_type'] === 'current_count') {
            return match ($meterKey) {
                'active_users' => User::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
                'active_branches' => Branch::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
                'active_warehouses' => Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
                'active_employees' => Employee::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
                'garment_models' => GarmentModel::withoutGlobalScopes()->where('tenant_id', $tenantId)->count(),
                'storage_megabytes' => 12, // Default estimated size for database records
                default => 0,
            };
        }

        // Periodic monthly meters
        $currentPeriod = now()->format('Y-m');
        $aggregate = SubscriptionUsageAggregate::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('meter_key', $meterKey)
            ->where('billing_period', $currentPeriod)
            ->first();

        if ($aggregate) {
            return (int) $aggregate->total_usage;
        }

        // Live fallback if aggregate not initialized
        $monthStart = now()->startOfMonth();
        $monthEnd = now()->endOfMonth();

        return match ($meterKey) {
            'production_orders' => ProductionOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            'cutting_lays' => CuttingOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            'purchase_orders' => PurchaseOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            'sales_orders' => SalesOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            'subcontract_jobs' => JobOrder::withoutGlobalScopes()->where('tenant_id', $tenantId)->whereBetween('created_at', [$monthStart, $monthEnd])->count(),
            default => 0,
        };
    }

    /**
     * فحص الحصة المقررة وتطبيق قواعد الحصانة التشغيلية
     */
    public function checkQuota(string $tenantId, string $meterKey, int $additionalQty = 1): array
    {
        $spec = self::METERS_CATALOG[$meterKey] ?? null;
        if (!$spec) {
            return [
                'allowed' => true,
                'meter_key' => $meterKey,
                'current_usage' => 0,
                'limit' => 999999,
                'percent_used' => 0.0,
                'is_soft_limit' => false,
                'message' => null,
            ];
        }

        $subscription = $this->getOrCreateFactorySubscription($tenantId);
        $meterConfig = $subscription->plan->meters->where('meter_key', $meterKey)->first();

        $limit = $meterConfig ? (int) $meterConfig->quota_limit : ($spec['starter'] ?? 0);
        $limitType = $meterConfig ? $meterConfig->limit_type : $spec['limit_type'];

        // 1. فحص الاستثناءات والتخصيصات الخاصة بالمصنع
        if (!empty($subscription->custom_quotas[$meterKey])) {
            $limit = (int) $subscription->custom_quotas[$meterKey];
        }

        // 2. فحص استثناءات الطوارئ التشغيلية المعتمدة لخط الإنتاج
        $override = SubscriptionQuotaOverride::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('meter_key', $meterKey)
            ->where('is_active', true)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if ($override && $override->temporary_limit > $limit) {
            $limit = (int) $override->temporary_limit;
        }

        $currentUsage = $this->getCurrentUsage($tenantId, $meterKey);
        $projectedUsage = $currentUsage + $additionalQty;
        $percentUsed = $limit > 0 ? round(($currentUsage / $limit) * 100, 1) : 0;

        $isExceeded = $projectedUsage > $limit;
        $isSoft = ($limitType === 'soft');

        $allowed = !$isExceeded || $isSoft;

        $message = null;
        if ($isExceeded) {
            if ($isSoft) {
                $message = "تم تجاوز حد الباقة للعداد ({$spec['name_ar']}) بواقع ({$projectedUsage}/{$limit} {$spec['unit']}). العملية مسموحة لضمان استمرارية صالة التشغيل، يرجى الترقية لتجنب رسوم الاستهلاك الإضافي.";
            } else {
                $message = "عفواً، لقد بلغت الحد الأقصى المسموح به في باقتك الحالية ({$subscription->plan->name_ar}) للعداد: {$spec['name_ar']} ({$limit} {$spec['unit']}). يرجى ترقية باقة المصنع للمتابعة.";
            }
        }

        return [
            'allowed' => $allowed,
            'meter_key' => $meterKey,
            'meter_name_ar' => $spec['name_ar'],
            'meter_name_en' => $spec['name_en'],
            'unit' => $spec['unit'],
            'current_usage' => $currentUsage,
            'projected_usage' => $projectedUsage,
            'limit' => $limit,
            'percent_used' => $percentUsed,
            'is_soft_limit' => $isSoft,
            'is_exceeded' => $isExceeded,
            'plan_name_ar' => $subscription->plan->name_ar,
            'plan_code' => $subscription->plan->code,
            'message' => $message,
        ];
    }

    /**
     * تقرير استهلاك كافة العدادات الاثني عشر للمصنع
     */
    public function getTenantUsageReport(string $tenantId): array
    {
        $subscription = $this->getOrCreateFactorySubscription($tenantId);
        $metersReport = [];

        foreach (self::METERS_CATALOG as $meterKey => $spec) {
            $quota = $this->checkQuota($tenantId, $meterKey, 0);
            $metersReport[$meterKey] = [
                'meter_key' => $meterKey,
                'name_ar' => $spec['name_ar'],
                'name_en' => $spec['name_en'],
                'unit' => $spec['unit'],
                'limit_type' => $quota['is_soft_limit'] ? 'soft' : 'hard',
                'current_usage' => $quota['current_usage'],
                'limit' => $quota['limit'],
                'percent_used' => $quota['percent_used'],
                'is_warning_70' => $quota['percent_used'] >= 70 && $quota['percent_used'] < 85,
                'is_warning_85' => $quota['percent_used'] >= 85 && $quota['percent_used'] < 100,
                'is_exceeded' => $quota['current_usage'] >= $quota['limit'],
            ];
        }

        return [
            'tenant_id' => $tenantId,
            'subscription' => [
                'plan_code' => $subscription->plan->code,
                'plan_name_ar' => $subscription->plan->name_ar,
                'plan_name_en' => $subscription->plan->name_en,
                'monthly_price' => $subscription->plan->monthly_price,
                'status' => $subscription->status,
                'billing_cycle' => $subscription->billing_cycle,
                'current_period_start' => $subscription->current_period_start->toDateString(),
                'current_period_end' => $subscription->current_period_end->toDateString(),
            ],
            'meters' => $metersReport,
        ];
    }

    /**
     * منح استثناء طوارئ تشغيلي للمصنع لمنع توقف صالة القص والإنتاج
     */
    public function grantOverride(
        string $tenantId,
        string $meterKey,
        int $temporaryLimit,
        string $reason,
        string $grantedBy,
        Carbon $expiresAt
    ): SubscriptionQuotaOverride {
        return DB::transaction(function () use ($tenantId, $meterKey, $temporaryLimit, $reason, $grantedBy, $expiresAt) {
            // تعطيل الاستثناءات السابقة لنفس العداد
            SubscriptionQuotaOverride::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('meter_key', $meterKey)
                ->update(['is_active' => false]);

            return SubscriptionQuotaOverride::create([
                'tenant_id' => $tenantId,
                'meter_key' => $meterKey,
                'temporary_limit' => $temporaryLimit,
                'reason' => $reason,
                'granted_by' => $grantedBy,
                'expires_at' => $expiresAt,
                'is_active' => true,
            ]);
        });
    }

    /**
     * ترقية باقة اشتراك المصنع
     */
    public function upgradeSubscription(string $tenantId, string $newPlanCode, string $billingCycle = 'monthly'): FactorySubscription
    {
        $plan = SubscriptionPlan::where('code', $newPlanCode)->firstOrFail();

        return DB::transaction(function () use ($tenantId, $plan, $billingCycle) {
            $subscription = FactorySubscription::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->first();

            if ($subscription) {
                $subscription->plan_id = $plan->id;
                $subscription->billing_cycle = $billingCycle;
                $subscription->status = 'active';
                $subscription->current_period_start = now();
                $subscription->current_period_end = $billingCycle === 'annual' ? now()->addYear() : now()->addMonth();
                $subscription->save();
            } else {
                $subscription = FactorySubscription::create([
                    'tenant_id' => $tenantId,
                    'plan_id' => $plan->id,
                    'status' => 'active',
                    'billing_cycle' => $billingCycle,
                    'starts_at' => now(),
                    'current_period_start' => now(),
                    'current_period_end' => $billingCycle === 'annual' ? now()->addYear() : now()->addMonth(),
                    'auto_renew' => true,
                ]);
            }

            return $subscription->load('plan.meters');
        });
    }
}

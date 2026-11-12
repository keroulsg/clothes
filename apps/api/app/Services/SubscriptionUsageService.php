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
use App\Models\MarketplaceRequesterSubscription;
use App\Models\SaasFeature;
use App\Models\SaasPlanFeature;
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
        // 1. بذر الكتالوج المركزي للميزات القياسية (Central SaaS Features Catalog)
        $canonicalFeatures = [
            // ERP Features
            'erp.inventory' => [
                'name_ar' => 'إدارة المخزون والمستودعات',
                'name_en' => 'Inventory & Warehouse Management',
                'desc_ar' => 'أرصدة الأقمشة، كروت الصنف، حركات التحويل، والجرد الدوري للمخازن',
                'desc_en' => 'Fabric inventory balances, stock cards, warehouse transfers, and cyclic counts',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 1,
            ],
            'erp.purchasing' => [
                'name_ar' => 'المشتريات وفواتير الموردين',
                'name_en' => 'Procurement & Supplier Management',
                'desc_ar' => 'أوامر الشراء، أذون الاستلام، وسندات الصرف وفواتير الموردين',
                'desc_en' => 'Purchase orders, goods receipts, payment vouchers, and vendor bills',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 2,
            ],
            'erp.production' => [
                'name_ar' => 'تخطيط الإنتاج وتتبع الحزم بالباركود',
                'name_en' => 'Production & Barcode Bundle Tracking',
                'desc_ar' => 'أوامر التشغيل، بطاقات الحزم، ومتابعة المراحل الإنتاجية لايف',
                'desc_en' => 'Production orders, bundle tags, and live line tracking',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 3,
            ],
            'erp.cutting' => [
                'name_ar' => 'أوامر القص وتخطيط فرش الأقمشة',
                'name_en' => 'Cutting Orders & Spread Planning',
                'desc_ar' => 'حساب الهادر، تخطيط طول وتكرار الفرشة، وتوليد حزم القص الآلية',
                'desc_en' => 'Waste control, layer spread optimization, and cutting bundle generation',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 4,
            ],
            'erp.sales' => [
                'name_ar' => 'المبيعات ونقاط البيع والفواتير',
                'name_en' => 'Sales, POS & Invoicing',
                'desc_ar' => 'عروض الأسعار، أوامر البيع، أذون التسليم، وفواتير المبيعات الضريبية',
                'desc_en' => 'Quotations, sales orders, delivery notes, and tax sales invoices',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 5,
            ],
            'erp.accounting' => [
                'name_ar' => 'دليل الحسابات والقيود ومراكز التكلفة',
                'name_en' => 'Accounting & General Ledger',
                'desc_ar' => 'شجرة حسابات قياسية للملابس، قيود يومية آلية، وميزان مراجعة',
                'desc_en' => 'Apparel chart of accounts, automated journal entries, and trial balance',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 6,
            ],
            'erp.costing' => [
                'name_ar' => 'بطاقة تكاليف الموديلات وقوائم المواد BOM',
                'name_en' => 'BOM & Costing Engine',
                'desc_ar' => 'تحليل تكلفة القطعة، استهلاك الخيوط والإكسسوارات، وهامش الربح',
                'desc_en' => 'Unit cost breakdown, fabric and trims consumption, and margin calculation',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 7,
            ],
            'erp.payroll' => [
                'name_ar' => 'الموارد البشرية والرواتب بالإنتاج والقطعة',
                'name_en' => 'HR & Piece-Rate Payroll',
                'desc_ar' => 'سجلات العمال، حساب الأجور بإنتاجية القطعة، ومسيرات الرواتب الشهرية',
                'desc_en' => 'Worker registers, piece-rate productivity payroll, and pay slips',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 8,
            ],
            'erp.storefront' => [
                'name_ar' => 'المتجر الإلكتروني للعلامة التجارية',
                'name_en' => 'Brand E-Commerce Storefront',
                'desc_ar' => 'كتالوج أونلاين لموديلات المصنع واستقبال الطلبات ومدفوعات إنستاباي',
                'desc_en' => 'Online customer catalog, checkout orders, and InstaPay integrations',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 9,
            ],
            'erp.advanced_reports' => [
                'name_ar' => 'التقارير التحليلية المتقدمة ولوحة القيادة',
                'name_en' => 'Advanced Analytics & Management Reports',
                'desc_ar' => 'تحليلات الربحية، كفاءة الخطوط، ومؤشرات الأداء للمجموعات الصناعية',
                'desc_en' => 'Profitability insights, line efficiencies, and executive KPI reports',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 10,
            ],
            'erp.subcontracting' => [
                'name_ar' => 'إدارة تشغيل الغير ومتابعة الورش الخارجية',
                'name_en' => 'Subcontracting & External Workshops',
                'desc_ar' => 'أوامر تشغيل للغير، تتبع أمانات الأقمشة، ومطابقة الاستلامات',
                'desc_en' => 'Subcontracting job orders, fabric custody tracking, and receipt audits',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 11,
            ],
            'waslat_worsh.marketplace_provider' => [
                'name_ar' => 'تقديم عروض أسعار صالات القص (مزود خدمة)',
                'name_en' => 'Waslat Worsh Cutting Provider Eligibility',
                'desc_ar' => 'استقبال طلبات القص المطروحة وتقديم عروض أسعار تنافسية من صالات القص المعتمدة',
                'desc_en' => 'Exclusive to Enterprise factories: receive cutting RFQs and submit capacity bids',
                'category' => 'erp',
                'type' => 'boolean',
                'order' => 12,
            ],

            // Waslat Worsh Features
            'waslat_worsh.create_rfq' => [
                'name_ar' => 'طرح ونشر طلبات القص الفنية',
                'name_en' => 'Create & Publish Cutting RFQs',
                'desc_ar' => 'إدخال المواصفات الفنية وتحديد أطوال الفرش وحصص المقاسات ونشرها',
                'desc_en' => 'Specify fabric specs, layer spreads, size ratios, and publish RFQs',
                'category' => 'waslat_worsh',
                'type' => 'boolean',
                'order' => 1,
            ],
            'waslat_worsh.receive_offers' => [
                'name_ar' => 'استقبال عروض الأسعار التنافسية من الورش',
                'name_en' => 'Receive Workshop Competitive Bids',
                'desc_ar' => 'استقبال عروض الأسعار والطاقات الإنتاجية ومواعيد التوريد من صالات القص',
                'desc_en' => 'Receive piece rates, daily capacities, and lead times from verified workshops',
                'category' => 'waslat_worsh',
                'type' => 'boolean',
                'order' => 2,
            ],
            'waslat_worsh.track_orders' => [
                'name_ar' => 'متابعة مسار تنفيذ وتسليم طلبات القص',
                'name_en' => 'Track Cutting Order Execution & Delivery',
                'desc_ar' => 'متابعة الحالة التشغيلية من قبول العرض إلى بدء القص والتوريد والتسليم',
                'desc_en' => 'Live order progression: offer selected -> in progress -> delivered -> completed',
                'category' => 'waslat_worsh',
                'type' => 'boolean',
                'order' => 3,
            ],
            'waslat_worsh.view_history' => [
                'name_ar' => 'استعراض السجل والأرشيف الفني لطلبات القص',
                'name_en' => 'Cutting RFQ Technical Archive',
                'desc_ar' => 'أرشيف دائم لجميع طلبات القص والمواصفات الفنية والعروض السابقة',
                'desc_en' => 'Permanent technical archive of past cutting orders, specs, and bids',
                'category' => 'waslat_worsh',
                'type' => 'boolean',
                'order' => 4,
            ],
            'waslat_worsh.compare_bids' => [
                'name_ar' => 'مقارنة العروض والترسية المباشرة',
                'name_en' => 'Compare Offers & Direct Award',
                'desc_ar' => 'مقارنة أسعار ومواعيد الورش واختيار العرض الفائز وترسيته',
                'desc_en' => 'Compare rates and delivery lead times and award the winning workshop',
                'category' => 'waslat_worsh',
                'type' => 'boolean',
                'order' => 5,
            ],
        ];

        $featureModelMap = [];
        foreach ($canonicalFeatures as $key => $feat) {
            $model = SaasFeature::updateOrCreate(
                ['feature_key' => $key],
                [
                    'product_category' => $feat['category'],
                    'name_ar' => $feat['name_ar'],
                    'name_en' => $feat['name_en'],
                    'description_ar' => $feat['desc_ar'],
                    'description_en' => $feat['desc_en'],
                    'feature_type' => $feat['type'],
                    'is_active' => true,
                    'is_public' => true,
                    'sort_order' => $feat['order'],
                ]
            );
            $featureModelMap[$key] = $model;
        }

        // 2. بذر باقات ERP
        $plansDef = [
            'starter' => [
                'name_ar' => 'باقة الورش والمشاغل',
                'name_en' => 'Starter Workshop',
                'desc_ar' => 'مثالية لصالات القص الصغيرة والورش المستقلة حتى خطين إنتاج',
                'desc_en' => 'Ideal for small cutting workshops and independent sewing units',
                'monthly' => 1450,
                'annual' => 14500,
                'order' => 1,
                'features' => [
                    'erp.inventory',
                    'erp.purchasing',
                    'erp.production',
                    'erp.cutting',
                    'erp.sales',
                    'erp.storefront',
                ],
            ],
            'pro' => [
                'name_ar' => 'باقة المصانع المتطورة',
                'name_en' => 'Pro Factory',
                'desc_ar' => 'للمصانع المتوسطة متعددة الخطوط مع تتبع الحزم بالباركود وتكاليف BOM',
                'desc_en' => 'For growing garment plants with multi-line bundles and BOM costing',
                'monthly' => 3900,
                'annual' => 39000,
                'order' => 2,
                'features' => [
                    'erp.inventory',
                    'erp.purchasing',
                    'erp.production',
                    'erp.cutting',
                    'erp.sales',
                    'erp.accounting',
                    'erp.costing',
                    'erp.payroll',
                    'erp.storefront',
                    'erp.subcontracting',
                ],
            ],
            'enterprise' => [
                'name_ar' => 'باقة المجموعات الصناعية الكبرى',
                'name_en' => 'Enterprise Apparel Group',
                'desc_ar' => 'للمصانع الكبرى والمصدرين: فروع متعددة ومستودعات غير محدودة وسيرفر مخصص',
                'desc_en' => 'For apparel exporters and large groups with multi-plant operations',
                'monthly' => 8900,
                'annual' => 89000,
                'order' => 3,
                'features' => [
                    'erp.inventory',
                    'erp.purchasing',
                    'erp.production',
                    'erp.cutting',
                    'erp.sales',
                    'erp.accounting',
                    'erp.costing',
                    'erp.payroll',
                    'erp.storefront',
                    'erp.advanced_reports',
                    'erp.subcontracting',
                    'waslat_worsh.marketplace_provider',
                    'waslat_worsh_marketplace',
                ],
            ],
        ];

        foreach ($plansDef as $code => $data) {
            $plan = SubscriptionPlan::updateOrCreate(
                ['code' => $code],
                [
                    'product_category' => 'erp',
                    'name_ar' => $data['name_ar'],
                    'name_en' => $data['name_en'],
                    'description_ar' => $data['desc_ar'],
                    'description_en' => $data['desc_en'],
                    'monthly_price' => $data['monthly'],
                    'annual_price' => $data['annual'],
                    'billing_duration' => 1,
                    'billing_period' => 'monthly',
                    'is_active' => true,
                    'is_public' => true,
                    'is_archived' => false,
                    'is_popular' => $code === 'pro',
                    'sort_order' => $data['order'],
                    'features' => array_values(array_unique(array_merge($data['features'], array_keys(self::METERS_CATALOG)))),
                ]
            );

            // Sync saas_plan_features pivot
            foreach ($data['features'] as $fKey) {
                if (isset($featureModelMap[$fKey])) {
                    SaasPlanFeature::updateOrCreate(
                        [
                            'plan_id' => $plan->id,
                            'feature_id' => $featureModelMap[$fKey]->id,
                        ],
                        [
                            'feature_key' => $fKey,
                            'is_included' => true,
                        ]
                    );
                }
            }

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

        // 3. بذر باقات وصلة ورش المستقلة لطالبي خدمات القص (Canonical Waslat Worsh Requester Packages)
        $waslatFeaturesKeys = [
            'waslat_worsh.create_rfq',
            'waslat_worsh.receive_offers',
            'waslat_worsh.track_orders',
            'waslat_worsh.view_history',
            'waslat_worsh.compare_bids',
        ];

        $waslatPackages = [
            'ww_starter_5' => [
                'name_ar' => 'باقة وصلة ورش الأساسية (5 طلبات)',
                'name_en' => 'Waslat Worsh Basic Pack (5 RFQs)',
                'desc_ar' => 'حزمة استرشادية لطالبي خدمات القص: نشر 5 طلبات قص مع فحص كامل للمواصفات الفنية وتلقي عروض الأسعار.',
                'desc_en' => 'Basic requester package: publish 5 cutting requests with tech spec validation and competitive bids.',
                'price' => 300,
                'quota' => 5,
                'validity_days' => 30,
                'order' => 10,
                'is_public' => true,
            ],
            'ww_growth_15' => [
                'name_ar' => 'باقة وصلة ورش المتطورة (15 طلباً)',
                'name_en' => 'Waslat Worsh Growth Pack (15 RFQs)',
                'desc_ar' => 'لأصحاب العلامات التجارية والمصممين ذوي خطوط الإنتاج المتعددة: نشر 15 طلب قص صالحة لمدة 60 يوماً.',
                'desc_en' => 'For fashion brands & apparel lines: publish 15 cutting requests valid for 60 days.',
                'price' => 750,
                'quota' => 15,
                'validity_days' => 60,
                'order' => 11,
                'is_public' => true,
            ],
            'ww_pro_15' => [
                'name_ar' => 'باقة وصلة ورش المتقدمة (15 طلباً - توافق تاريخي)',
                'name_en' => 'Waslat Worsh Pro Pack (15 RFQs - Historical Alias)',
                'desc_ar' => 'اسم الباقة المكافئ لباقة النمو المتقدمة لضمان التوافق مع السجلات القديمة: 15 طلب قص لمدة 60 يوماً.',
                'desc_en' => 'Compatibility alias for 15 RFQs valid for 60 days.',
                'price' => 750,
                'quota' => 15,
                'validity_days' => 60,
                'order' => 12,
                'is_public' => false,
            ],
            'ww_enterprise_50' => [
                'name_ar' => 'باقة وصلة ورش للشركات الكبرى (50 طلباً)',
                'name_en' => 'Waslat Worsh Bulk Pack (50 RFQs)',
                'desc_ar' => 'للمجموعات التجارية وسلاسل الملابس: نشر 50 طلب قص وتشغيل للغير صالحة لمدة 90 يوماً مع أولوية الظهور.',
                'desc_en' => 'For retail chains & commercial brands: publish 50 cutting requests valid for 90 days.',
                'price' => 2000,
                'quota' => 50,
                'validity_days' => 90,
                'order' => 13,
                'is_public' => true,
            ],
        ];

        foreach ($waslatPackages as $code => $data) {
            $plan = SubscriptionPlan::updateOrCreate(
                ['code' => $code],
                [
                    'product_category' => 'waslat_worsh_requester',
                    'name_ar' => $data['name_ar'],
                    'name_en' => $data['name_en'],
                    'description_ar' => $data['desc_ar'],
                    'description_en' => $data['desc_en'],
                    'monthly_price' => $data['price'],
                    'annual_price' => $data['price'],
                    'billing_duration' => $data['validity_days'],
                    'billing_period' => 'fixed_days',
                    'quota_rfq_count' => $data['quota'],
                    'is_active' => true,
                    'is_public' => $data['is_public'],
                    'is_archived' => false,
                    'is_popular' => $code === 'ww_growth_15',
                    'sort_order' => $data['order'],
                    'features' => array_merge($waslatFeaturesKeys, [
                        'waslat_worsh_requester',
                        'rfq_creation',
                        'tech_spec_builder',
                        'validity_days' => $data['validity_days'],
                    ]),
                ]
            );

            // Sync saas_plan_features pivot
            foreach ($waslatFeaturesKeys as $fKey) {
                if (isset($featureModelMap[$fKey])) {
                    SaasPlanFeature::updateOrCreate(
                        [
                            'plan_id' => $plan->id,
                            'feature_id' => $featureModelMap[$fKey]->id,
                        ],
                        [
                            'feature_key' => $fKey,
                            'is_included' => true,
                        ]
                    );
                }
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

        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        $targetCode = 'starter';
        if ($tenant) {
            if ($tenant->plan_tier === 'enterprise') {
                $targetCode = 'enterprise';
            } elseif ($tenant->plan_tier === 'pro' || $tenant->plan_tier === 'professional') {
                $targetCode = 'pro';
            } elseif ($tenant->plan_tier === 'starter') {
                $targetCode = 'starter';
            }
        }

        // إنشاء اشتراك افتراضي متوافق مع فئة المصنع
        $plan = SubscriptionPlan::where('code', $targetCode)->first();
        if (!$plan) {
            $this->seedDefaultPlans();
            $plan = SubscriptionPlan::where('code', $targetCode)->first()
                ?? SubscriptionPlan::where('code', 'pro')->first()
                ?? SubscriptionPlan::where('code', 'starter')->firstOrFail();
        }

        return FactorySubscription::create([
            'tenant_id' => $tenantId,
            'plan_id' => $plan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'starts_at' => now(),
            'current_period_start' => now()->startOfMonth(),
            'current_period_end' => now()->addMonth(),
            'auto_renew' => true,
            'plan_snapshot' => [
                'code' => $plan->code,
                'name_ar' => $plan->name_ar,
                'name_en' => $plan->name_en,
                'features' => $plan->features ?? [],
            ],
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
                'active_users' => User::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('is_active', true)->count(),
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

    /**
     * التحقق المركزي الشامل من أهلية واستحقاق المستأجر لميزة معينة عبر جميع المنتجات (SaaS Central Entitlement Resolver)
     */
    public function hasFeatureEntitlement(string $tenantId, string $featureKey): array
    {
        $tenant = Tenant::withoutGlobalScopes()->find($tenantId);
        if (!$tenant) {
            return [
                'allowed' => false,
                'error_code' => 'TENANT_NOT_FOUND',
                'reason' => 'TENANT_NOT_FOUND',
                'message' => 'المستأجر غير مسجل أو غير موجود في المنصة.',
            ];
        }

        if ($tenant->status === 'suspended') {
            return [
                'allowed' => false,
                'error_code' => 'TENANT_SUSPENDED',
                'reason' => 'TENANT_SUSPENDED',
                'message' => 'حساب المستأجر معلق حالياً من قِبل إدارة المنصة.',
            ];
        }

        if (in_array($tenant->status, ['inactive', 'cancelled', 'canceled'], true)) {
            return [
                'allowed' => false,
                'error_code' => 'TENANT_INACTIVE',
                'reason' => 'TENANT_INACTIVE',
                'message' => 'حساب المستأجر غير نشط.',
            ];
        }

        // 1. فحص القفل العام للميزة على مستوى المنصة (Global Feature Switch)
        $featureRecord = SaasFeature::where('feature_key', $featureKey)->first();
        if ($featureRecord && !$featureRecord->is_active) {
            return [
                'allowed' => false,
                'error_code' => 'FEATURE_DEACTIVATED',
                'reason' => 'FEATURE_GLOBALLY_DEACTIVATED',
                'feature' => $featureKey,
                'message' => 'هذه الميزة معطلة مؤقتاً على مستوى المنصة لأعمال الصيانة والترقية.',
            ];
        }

        // تصنيف الميزة المطلوبة
        $isMarketplaceProviderFeature = in_array($featureKey, ['waslat_worsh.marketplace_provider', 'waslat_worsh_marketplace'], true);
        $isMarketplaceRequesterFeature = str_starts_with($featureKey, 'waslat_worsh.') || in_array($featureKey, ['waslat_worsh_requester', 'rfq_creation', 'tech_spec_builder'], true);
        $isErpFeature = str_starts_with($featureKey, 'erp.');

        // أ) ميزة مقدم خدمات القص في وصلة ورش (Enterprise Exclusive Provider Access)
        if ($isMarketplaceProviderFeature) {
            $subscription = FactorySubscription::withoutGlobalScopes()
                ->with('plan')
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->first();

            if (!$subscription) {
                return [
                    'allowed' => false,
                    'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                    'reason' => 'NO_ACTIVE_ERP_SUBSCRIPTION',
                    'message' => 'سوق وصلة ورش الصناعي لتقديم عروض الأسعار متاح حصرياً للمصانع المشتركة في باقة Enterprise.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            if ($subscription->current_period_end && $subscription->current_period_end->isPast()) {
                return [
                    'allowed' => false,
                    'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                    'reason' => 'SUBSCRIPTION_EXPIRED',
                    'current_period_end' => $subscription->current_period_end->toIso8601String(),
                    'message' => 'انتهت صلاحية باقة اشتراك المصنع. يرجى تجديد الاشتراك.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            $plan = $subscription->plan;
            if (!$plan || $plan->code !== 'enterprise') {
                return [
                    'allowed' => false,
                    'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                    'reason' => 'PLAN_TIER_NOT_ELIGIBLE',
                    'current_plan' => $plan?->code,
                    'current_plan_name' => $plan?->name_ar,
                    'required_plan' => 'enterprise',
                    'message' => 'سوق وصلة ورش الصناعي لخدمات القص متاح حصرياً للمصانع الكبرى المشتركة في باقة Enterprise السحابية.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            $snapshotFeatures = is_array($subscription->plan_snapshot) && isset($subscription->plan_snapshot['features'])
                ? $subscription->plan_snapshot['features']
                : (is_array($plan->features) ? $plan->features : []);

            $hasEntitlement = in_array($featureKey, $snapshotFeatures, true)
                || ($featureKey === 'waslat_worsh.marketplace_provider' && in_array('waslat_worsh_marketplace', $snapshotFeatures, true));

            if (!$hasEntitlement) {
                return [
                    'allowed' => false,
                    'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                    'reason' => 'FEATURE_NOT_ENTITLED',
                    'feature' => $featureKey,
                    'message' => 'ميزة مقدم خدمة القص غير مفعلة في اشتراك المصنع.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            return [
                'allowed' => true,
                'plan_code' => $plan->code,
                'plan_name' => $plan->name_ar,
                'subscription_id' => $subscription->id,
                'tenant_id' => $tenantId,
            ];
        }

        // ب) ميزات طالبي خدمات القص في وصلة ورش (Waslat Worsh Requester Features)
        if ($isMarketplaceRequesterFeature) {
            $reqSub = MarketplaceRequesterSubscription::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->first();

            if ($reqSub && !$reqSub->isExpired()) {
                return [
                    'allowed' => true,
                    'product_category' => 'waslat_worsh_requester',
                    'plan_code' => $reqSub->plan_code,
                    'remaining_quota' => $reqSub->remaining_rfq_count,
                    'subscription_id' => $reqSub->id,
                    'tenant_id' => $tenantId,
                ];
            }

            // أو اشتراك مصنع Enterprise مسموح له بالسوق
            $enterpriseSub = FactorySubscription::withoutGlobalScopes()
                ->with('plan')
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->whereHas('plan', fn ($q) => $q->where('code', 'enterprise'))
                ->first();

            if ($enterpriseSub && (!$enterpriseSub->current_period_end || $enterpriseSub->current_period_end->isFuture())) {
                $plan = $enterpriseSub->plan;
                $features = is_array($enterpriseSub->plan_snapshot) && isset($enterpriseSub->plan_snapshot['features'])
                    ? $enterpriseSub->plan_snapshot['features']
                    : (is_array($plan?->features) ? $plan->features : []);

                $hasEntitlement = in_array($featureKey, $features, true);

                if ($hasEntitlement) {
                    return [
                        'allowed' => true,
                        'product_category' => 'waslat_worsh_requester',
                        'plan_code' => 'enterprise',
                        'remaining_quota' => 999999,
                        'subscription_id' => $enterpriseSub->id,
                        'tenant_id' => $tenantId,
                    ];
                }
            }

            return [
                'allowed' => false,
                'error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED',
                'reason' => 'FEATURE_NOT_ENTITLED',
                'message' => 'يتطلب نشر طلبات القص اشتراكاً نشطاً في إحدى باقات وصلة ورش وحصة طلبات صالحة.',
                'upgrade_url' => '/#/waslat-worsh',
            ];
        }

        // ج) ميزات إدارة المصانع GarmentOS ERP
        if ($isErpFeature) {
            // طالبو خدمات القص غير مصرح لهم بالدخول لوظائف المصانع ERP نهائياً
            if ($tenant->tenant_type === 'marketplace_requester') {
                return [
                    'allowed' => false,
                    'error_code' => 'ERP_SUBSCRIPTION_REQUIRED',
                    'reason' => 'MARKETPLACE_REQUESTER_CANNOT_ACCESS_ERP',
                    'feature' => $featureKey,
                    'message' => 'هذه الميزة خاصة بأنظمة إدارة المصانع GarmentOS ERP. يمكنك ترقية حسابك للانضمام إلى مصانع GarmentOS.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            // فترات التجربة المجانية لمصانع GarmentOS ERP تشمل كافة ميزات المنظومة لتقييم النظام
            if ($tenant->status === 'trial') {
                return [
                    'allowed' => true,
                    'is_trial' => true,
                    'plan_code' => $tenant->plan_tier ?? 'trial',
                    'tenant_id' => $tenantId,
                ];
            }

            $subscription = FactorySubscription::withoutGlobalScopes()
                ->with('plan')
                ->where('tenant_id', $tenantId)
                ->where('status', 'active')
                ->first();

            if (!$subscription) {
                $subscription = $this->getOrCreateFactorySubscription($tenantId);
            }

            if ($subscription->status !== 'active') {
                return [
                    'allowed' => false,
                    'error_code' => 'SUBSCRIPTION_NOT_ACTIVE',
                    'reason' => 'SUBSCRIPTION_NOT_ACTIVE',
                    'subscription_status' => $subscription->status,
                    'message' => 'اشتراك المصنع غير نشط حالياً.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            if ($subscription->current_period_end && $subscription->current_period_end->isPast()) {
                return [
                    'allowed' => false,
                    'error_code' => 'SUBSCRIPTION_EXPIRED',
                    'reason' => 'SUBSCRIPTION_EXPIRED',
                    'current_period_end' => $subscription->current_period_end->toIso8601String(),
                    'message' => 'انتهت صلاحية باقة اشتراك المصنع. يرجى تجديد الاشتراك.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            $plan = $subscription->plan;
            if (!$plan) {
                return [
                    'allowed' => false,
                    'error_code' => 'PLAN_NOT_FOUND',
                    'reason' => 'PLAN_NOT_FOUND',
                    'message' => 'باقة اشتراك المصنع غير معرفة.',
                ];
            }

            // 1. التحقق من اللقطة غير القابلة للتغيير (Immutable Snapshot Check) للمشترك
            if (is_array($subscription->plan_snapshot) && isset($subscription->plan_snapshot['features'])) {
                $snapshotFeatures = $subscription->plan_snapshot['features'];
                $isIncluded = in_array($featureKey, $snapshotFeatures, true)
                    || (isset($snapshotFeatures[$featureKey]) && $snapshotFeatures[$featureKey] === true);

                if (!$isIncluded) {
                    return [
                        'allowed' => false,
                        'error_code' => 'FEATURE_NOT_ENTITLED',
                        'reason' => 'FEATURE_NOT_IN_SNAPSHOT',
                        'feature' => $featureKey,
                        'current_plan' => $subscription->plan_snapshot['code'] ?? $plan->code,
                        'message' => 'هذه الميزة غير مشمولة في باقة اشتراكك الحالية.',
                        'upgrade_url' => '/#/subscription',
                    ];
                }

                return [
                    'allowed' => true,
                    'plan_code' => $subscription->plan_snapshot['code'] ?? $plan->code,
                    'plan_name' => $subscription->plan_snapshot['name_ar'] ?? $plan->name_ar,
                    'subscription_id' => $subscription->id,
                    'tenant_id' => $tenantId,
                ];
            }

            // 2. التحقق من ربط الباقة بجدول saas_plan_features أو مصفوفة features في الخطة
            $pivotRecord = SaasPlanFeature::where('plan_id', $plan->id)
                ->where('feature_key', $featureKey)
                ->first();

            $isIncluded = false;
            if ($pivotRecord) {
                $isIncluded = (bool) $pivotRecord->is_included;
            } elseif (is_array($plan->features)) {
                $isIncluded = in_array($featureKey, $plan->features, true)
                    || (isset($plan->features[$featureKey]) && $plan->features[$featureKey] === true);
            }

            if (!$isIncluded) {
                return [
                    'allowed' => false,
                    'error_code' => 'FEATURE_NOT_ENTITLED',
                    'reason' => 'FEATURE_NOT_IN_PLAN',
                    'feature' => $featureKey,
                    'current_plan' => $plan->code,
                    'message' => 'هذه الميزة غير مشمولة في باقة اشتراك المصنع الحالية.',
                    'upgrade_url' => '/#/subscription',
                ];
            }

            return [
                'allowed' => true,
                'plan_code' => $plan->code,
                'plan_name' => $plan->name_ar,
                'subscription_id' => $subscription->id,
                'tenant_id' => $tenantId,
            ];
        }

        return [
            'allowed' => true,
            'feature' => $featureKey,
            'tenant_id' => $tenantId,
        ];
    }
}

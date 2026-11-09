<?php

namespace Tests\Feature;

use App\Models\FactorySubscription;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionQuotaOverride;
use App\Models\SubscriptionUsageEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionUsageService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionAndUsageMeterTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $ownerA;
    protected User $ownerB;
    protected SubscriptionUsageService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-SUB-A',
            'name' => 'El-Nasr Apparel Co.',
            'domain' => 'elnasr.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-SUB-B',
            'name' => 'Delta Modern Weaving',
            'domain' => 'delta.garmentos.test',
            'status' => 'active',
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Eng. Mahmoud Owner',
            'email' => 'owner@elnasr.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Delta Owner',
            'email' => 'owner@delta.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->service = app(SubscriptionUsageService::class);
    }

    /**
     * 1. التأكد من إنشاء الباقات الثلاث الافتراضية والعدادات الاثني عشر
     */
    public function test_default_plans_and_12_meters_are_seeded_correctly(): void
    {
        $this->service->seedDefaultPlans();

        $plans = SubscriptionPlan::where('product_category', 'erp')->with('meters')->get();
        $this->assertCount(3, $plans);

        $starter = $plans->where('code', 'starter')->first();
        $this->assertNotNull($starter);
        $this->assertEquals(1450, (float) $starter->monthly_price);
        $this->assertCount(12, $starter->meters);

        // فحص عداد المستخدمين: Starter يسمح بـ 3 مستخدمين كحد أقصى حاسم
        $usersMeter = $starter->meters->where('meter_key', 'active_users')->first();
        $this->assertNotNull($usersMeter);
        $this->assertEquals(3, $usersMeter->quota_limit);
        $this->assertEquals('hard', $usersMeter->limit_type);

        // فحص عداد فرشات القص: Starter يسمح بـ 50 فرشة كحد مرن
        $laysMeter = $starter->meters->where('meter_key', 'cutting_lays')->first();
        $this->assertNotNull($laysMeter);
        $this->assertEquals(50, $laysMeter->quota_limit);
        $this->assertEquals('soft', $laysMeter->limit_type);
    }

    /**
     * 2. جلب تقرير استهلاك المصنع والاشتراك الافتراضي
     */
    public function test_factory_subscription_retrieval_and_usage_report(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->getJson('/api/v1/subscription/current');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'tenant_id',
                'subscription' => [
                    'plan_code',
                    'plan_name_ar',
                    'status',
                    'billing_cycle',
                ],
                'meters' => [
                    'active_users',
                    'active_employees',
                    'production_orders',
                    'cutting_lays',
                ],
            ]);

        $this->assertEquals('starter', $response->json('subscription.plan_code'));
        $this->assertEquals(1, $response->json('meters.active_users.current_usage')); // Owner A
        $this->assertEquals(3, $response->json('meters.active_users.limit'));
    }

    /**
     * 3. تسجيل استهلاك العداد مع التحقق من منع التكرار (Idempotency)
     */
    public function test_usage_event_recording_is_idempotent(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $idempotencyKey = 'IDEM-TEST-' . uniqid();

        // الضربة الأولى
        $evt1 = $this->service->recordUsage(
            $this->tenantA->id,
            'cutting_lays',
            1,
            $idempotencyKey,
            'CuttingOrder',
            'CUT-001'
        );

        $this->assertInstanceOf(SubscriptionUsageEvent::class, $evt1);
        $this->assertEquals(1, $this->service->getCurrentUsage($this->tenantA->id, 'cutting_lays'));

        // الضربة الثانية بنفس الـ Idempotency Key (يجب ألا تتضاعف الحصة)
        $evt2 = $this->service->recordUsage(
            $this->tenantA->id,
            'cutting_lays',
            1,
            $idempotencyKey,
            'CuttingOrder',
            'CUT-001'
        );

        $this->assertEquals($evt1->id, $evt2->id);
        $this->assertEquals(1, $this->service->getCurrentUsage($this->tenantA->id, 'cutting_lays'));
        $this->assertEquals(1, SubscriptionUsageEvent::where('idempotency_key', $idempotencyKey)->count());
    }

    /**
     * 4. فحص الحصص: التمييز بين الحدود الصلبة (Hard) والحدود المرنة (Soft)
     */
    public function test_quota_enforcement_distinguishes_soft_and_hard_limits(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->service->seedDefaultPlans();

        // 1. حد صلب (Hard Limit): active_users (الحد في starter هو 3)
        // لدينا بالفعل المستخدم Owner A
        User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'User 2',
            'email' => 'u2@elnasr.test',
            'password' => bcrypt('123'),
        ]);
        User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'User 3',
            'email' => 'u3@elnasr.test',
            'password' => bcrypt('123'),
        ]);

        // الآن عدد المستخدمين = 3. فحص إضافة مستخدم رابع:
        $quotaCheck = $this->service->checkQuota($this->tenantA->id, 'active_users', 1);
        $this->assertFalse($quotaCheck['allowed']);
        $this->assertTrue($quotaCheck['is_exceeded']);
        $this->assertFalse($quotaCheck['is_soft_limit']);
        $this->assertNotNull($quotaCheck['message']);

        // 2. حد مرن (Soft Limit): cutting_lays (الحد في starter هو 50)
        // محاكاة استهلاك 55 فرشة
        for ($i = 0; $i < 55; $i++) {
            $this->service->recordUsage($this->tenantA->id, 'cutting_lays', 1);
        }

        $softQuotaCheck = $this->service->checkQuota($this->tenantA->id, 'cutting_lays', 1);
        // الحد المرن يسمح بالعملية لضمان استمرارية صالة القص مع التنبيه
        $this->assertTrue($softQuotaCheck['allowed']);
        $this->assertTrue($softQuotaCheck['is_exceeded']);
        $this->assertTrue($softQuotaCheck['is_soft_limit']);
        $this->assertStringContainsString('العملية مسموحة لضمان استمرارية صالة التشغيل', $softQuotaCheck['message']);
    }

    /**
     * 5. استثناء الطوارئ التشغيلي (Emergency Quota Override) يسمح بالعمليات الحيوية
     */
    public function test_emergency_production_quota_override_allows_operation(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->service->seedDefaultPlans();

        // ملء مستخدمي الباقة
        User::create(['tenant_id' => $this->tenantA->id, 'name' => 'U2', 'email' => 'u2@elnasr.test', 'password' => '1']);
        User::create(['tenant_id' => $this->tenantA->id, 'name' => 'U3', 'email' => 'u3@elnasr.test', 'password' => '1']);

        // قبل الاستثناء: محظور
        $checkBefore = $this->service->checkQuota($this->tenantA->id, 'active_users', 1);
        $this->assertFalse($checkBefore['allowed']);

        // منح استثناء طارئ برفع الحد مؤقتاً إلى 6 مستخدمين
        $override = $this->service->grantOverride(
            $this->tenantA->id,
            'active_users',
            6,
            'توسعة صالة الخياطة لموسم المدارس بانتظار اعتماد الميزانية',
            'Platform Administrator',
            Carbon::now()->addDays(7)
        );

        $this->assertInstanceOf(SubscriptionQuotaOverride::class, $override);
        $this->assertTrue($override->is_active);

        // بعد الاستثناء: مسموح فوراً!
        $checkAfter = $this->service->checkQuota($this->tenantA->id, 'active_users', 1);
        $this->assertTrue($checkAfter['allowed']);
        $this->assertEquals(6, $checkAfter['limit']);
    }

    /**
     * 6. ترقية باقة اشتراك المصنع ورفع الحدود آلياً
     */
    public function test_subscription_upgrade_updates_plan_and_limits(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->service->seedDefaultPlans();

        // 1. طلب الترقية عبر API يفرض تقديم إثبات السداد (Stage C.4 / ADR-029)
        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/subscription/upgrade', [
                'plan_code' => 'pro',
                'billing_cycle' => 'annual',
            ]);

        $response->assertStatus(402);
        $this->assertEquals('payment_required', $response->json('status'));

        // 2. ترقية وتفعيل الباقة عبر الخدمة المركزية
        $sub = $this->service->upgradeSubscription($this->tenantA->id, 'pro', 'annual');
        $this->assertEquals('pro', $sub->plan->code);
        $this->assertEquals('annual', $sub->billing_cycle);

        // فحص السعة بعد الترقية: مستخدمي Pro = 10
        $quotaCheck = $this->service->checkQuota($this->tenantA->id, 'active_users', 1);
        $this->assertEquals(10, $quotaCheck['limit']);
        $this->assertTrue($quotaCheck['allowed']);
    }

    /**
     * 7. العزل الأمني التام بين المصانع في الاشتراكات والعدادات
     */
    public function test_tenant_usage_isolation_ensures_zero_cross_tenant_interference(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $this->service->recordUsage($this->tenantA->id, 'cutting_lays', 25);

        app()->instance('current_tenant_id', $this->tenantB->id);
        $this->service->recordUsage($this->tenantB->id, 'cutting_lays', 5);

        // استهلاك Tenant A يجب أن يكون 25، واستهلاك Tenant B يجب أن يكون 5
        $this->assertEquals(25, $this->service->getCurrentUsage($this->tenantA->id, 'cutting_lays'));
        $this->assertEquals(5, $this->service->getCurrentUsage($this->tenantB->id, 'cutting_lays'));
    }

    /**
     * 8. نقطة النهاية العامة لقائمة الباقات تعرض الأسعار والعدادات
     */
    public function test_public_subscription_plans_endpoint(): void
    {
        $response = $this->getJson('/api/v1/subscription/plans');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'plans',
                'meters_catalog',
            ]);

        $this->assertCount(3, $response->json('plans'));
        $this->assertArrayHasKey('cutting_lays', $response->json('meters_catalog'));
    }
}


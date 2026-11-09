<?php

namespace Tests\Feature;

use App\Models\FactorySubscription;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshSubscriptionEntitlementTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionUsageService $subService;
    private WaslatWorshService $wwService;

    private Tenant $enterpriseTenant;
    private User $enterpriseUser;

    private Tenant $starterTenant;
    private User $starterUser;

    private Tenant $proTenant;
    private User $proUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subService = app(SubscriptionUsageService::class);
        $this->subService->seedDefaultPlans();
        $this->wwService = app(WaslatWorshService::class);

        // 1. مستأجر مؤهل بباقة Enterprise نشطة
        $this->enterpriseTenant = Tenant::create([
            'code' => 'T-ENT-001',
            'name' => 'مجموعة النيل الصناعية الكبرى',
            'domain' => 'nile-enterprise.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);
        $this->subService->upgradeSubscription($this->enterpriseTenant->id, 'enterprise');

        $this->enterpriseUser = User::create([
            'tenant_id' => $this->enterpriseTenant->id,
            'name' => 'المدير التنفيذي لمجموعة النيل',
            'email' => 'ceo@nile-enterprise.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 2. مستأجر باقة Starter (ورشة صغيرة)
        $this->starterTenant = Tenant::create([
            'code' => 'T-STR-002',
            'name' => 'مشغل التميز الصغير',
            'domain' => 'starter-unit.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);
        $this->subService->upgradeSubscription($this->starterTenant->id, 'starter');

        $this->starterUser = User::create([
            'tenant_id' => $this->starterTenant->id,
            'name' => 'مالك ورشة التميز',
            'email' => 'owner@starter-unit.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 3. مستأجر باقة Pro (مصنع متوسط)
        $this->proTenant = Tenant::create([
            'code' => 'T-PRO-003',
            'name' => 'مصنع الأمل للملابس الجاهزة',
            'domain' => 'pro-factory.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'pro',
        ]);
        $this->subService->upgradeSubscription($this->proTenant->id, 'pro');

        $this->proUser = User::create([
            'tenant_id' => $this->proTenant->id,
            'name' => 'مدير مصنع الأمل',
            'email' => 'manager@pro-factory.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    /**
     * 1. فحص أهلية اشتراك Enterprise النشط بالاستحقاق المعتمد (Authorized)
     */
    public function test_active_enterprise_with_entitlement_is_authorized(): void
    {
        app()->instance('current_tenant_id', $this->enterpriseTenant->id);

        // فحص مسار الأهلية
        $eligibilityRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/eligibility');

        $eligibilityRes->assertStatus(200);
        $this->assertTrue($eligibilityRes->json('is_eligible'));
        $this->assertEquals('enterprise', $eligibilityRes->json('entitlement.plan_code'));

        // فحص تصفح السوق
        $listRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/rfqs');
        $listRes->assertStatus(200);

        // فحص طرح طلب RFQ جديد
        $createRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'قص وتشغيل 1500 قطعة فستان أطفال',
                'service_type' => 'cutting',
                'specifications' => 'قص قماش قطني مع مطابقة المقاسات والدرزات',
                'target_quantity' => 1500,
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
            ]);

        $createRes->assertStatus(201);
        $this->assertDatabaseHas('rfqs', [
            'tenant_id' => $this->enterpriseTenant->id,
            'title' => 'قص وتشغيل 1500 قطعة فستان أطفال',
        ]);
    }

    /**
     * 2. اشتراك Enterprise مجرد من الميزة الصريحة يجب أن يرفض
     */
    public function test_enterprise_without_explicit_entitlement_is_denied(): void
    {
        // تجريد باقة Enterprise من ميزة waslat_worsh_marketplace
        $plan = SubscriptionPlan::where('code', 'enterprise')->firstOrFail();
        $plan->features = array_values(array_diff($plan->features, ['waslat_worsh_marketplace']));
        $plan->save();

        app()->instance('current_tenant_id', $this->enterpriseTenant->id);

        $response = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب يجب أن يفشل بسبب غياب الاستحقاق',
                'service_type' => 'cutting',
                'specifications' => 'تفاصيل فنية',
                'target_quantity' => 500,
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $response->json('error_code'));
        $this->assertEquals('FEATURE_NOT_ENTITLED', $response->json('reason'));
    }

    /**
     * 3. اشتراك Starter النشط يجب أن يُرفض قطعياً برمز 403
     */
    public function test_active_starter_is_denied(): void
    {
        app()->instance('current_tenant_id', $this->starterTenant->id);

        $response = $this->actingAs($this->starterUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب غير مصرح من باقة Starter',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات',
                'target_quantity' => 300,
                'expected_delivery_date' => now()->addDays(7)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $response->json('error_code'));
        $this->assertEquals('enterprise', $response->json('required_plan'));
        $this->assertEquals('starter', $response->json('current_plan'));

        // فحص رفض التصفح العام أيضاً
        $browseRes = $this->actingAs($this->starterUser, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/rfqs');
        $browseRes->assertStatus(403);
    }

    /**
     * 4. اشتراك Pro النشط يجب أن يُرفض قطعياً برمز 403
     */
    public function test_active_pro_is_denied(): void
    {
        app()->instance('current_tenant_id', $this->proTenant->id);

        $response = $this->actingAs($this->proUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب غير مصرح من باقة Pro',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات',
                'target_quantity' => 800,
                'expected_delivery_date' => now()->addDays(7)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $response->json('error_code'));
        $this->assertEquals('enterprise', $response->json('required_plan'));
        $this->assertEquals('pro', $response->json('current_plan'));
    }

    /**
     * 5. اشتراك Enterprise منتهي الصلاحية (Expired) يجب أن يُرفض
     */
    public function test_expired_enterprise_is_denied(): void
    {
        $sub = FactorySubscription::withoutGlobalScopes()->where('tenant_id', $this->enterpriseTenant->id)->firstOrFail();
        $sub->current_period_end = now()->subDay();
        $sub->save();

        app()->instance('current_tenant_id', $this->enterpriseTenant->id);

        $response = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب بعد انتهاء الاشتراك',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات',
                'target_quantity' => 1000,
                'expected_delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $response->json('error_code'));
        $this->assertEquals('SUBSCRIPTION_EXPIRED', $response->json('reason'));
    }

    /**
     * 6. حساب Enterprise معلق (Suspended) يجب أن يُرفض
     */
    public function test_suspended_enterprise_is_denied(): void
    {
        $this->enterpriseTenant->status = 'suspended';
        $this->enterpriseTenant->save();

        app()->instance('current_tenant_id', $this->enterpriseTenant->id);

        $response = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب من حساب معلق',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات',
                'target_quantity' => 500,
                'expected_delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertTrue(
            $response->json('error') === 'TenantSuspended' ||
            $response->json('error_code') === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED'
        );
    }

    /**
     * 7. اشتراك Enterprise ملغي (Canceled) يجب أن يُرفض
     */
    public function test_cancelled_enterprise_is_denied(): void
    {
        $sub = FactorySubscription::withoutGlobalScopes()->where('tenant_id', $this->enterpriseTenant->id)->firstOrFail();
        $sub->status = 'canceled';
        $sub->save();

        app()->instance('current_tenant_id', $this->enterpriseTenant->id);

        $response = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب باشتراك ملغي',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات',
                'target_quantity' => 500,
                'expected_delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $response->assertStatus(403);
        $this->assertTrue(
            $response->json('error') === 'TenantSuspended' ||
            $response->json('error_code') === 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED'
        );
    }

    /**
     * 8. المصنع الذي تم تخفيض باقته (Downgraded) يُمنع من أي مشاركة جديدة
     */
    public function test_downgraded_enterprise_cannot_perform_new_marketplace_operations(): void
    {
        // أولاً: إنشاء طلب أثناء وجود باقة Enterprise
        app()->instance('current_tenant_id', $this->enterpriseTenant->id);
        $initialRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب أصلي قبل التخفيض',
                'service_type' => 'cutting',
                'specifications' => 'مواصفات تاريخية',
                'target_quantity' => 1000,
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
            ]);
        $initialRes->assertStatus(201);
        $rfqId = $initialRes->json('rfq.id');

        // ثانياً: تخفيض الباقة إلى Pro
        $this->subService->upgradeSubscription($this->enterpriseTenant->id, 'pro');

        // ثالثاً: محاولة إنشاء طلب جديد بعد التخفيض يجب أن تفشل
        $newReqRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'طلب جديد بعد التخفيض',
                'service_type' => 'cutting',
                'specifications' => 'يجب أن يرفض',
                'target_quantity' => 500,
                'expected_delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $newReqRes->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $newReqRes->json('error_code'));
    }

    /**
     * 9. السجلات التاريخية للمصنع تبقى محفوظة وقابلة للقراءة فقط بعد التخفيض
     */
    public function test_historical_records_remain_preserved_and_accessible_in_read_only_mode(): void
    {
        // إنشاء طلب تاريخي أثناء Enterprise
        app()->instance('current_tenant_id', $this->enterpriseTenant->id);
        $initialRfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب تاريخي محفوظ',
            'service_type' => 'cutting',
            'specifications' => 'سجل تاريخي',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
        ]);

        // تخفيض الباقة إلى Starter
        $this->subService->upgradeSubscription($this->enterpriseTenant->id, 'starter');

        // قراءة الطلبات التاريخية الخاصة بالمصنع مسموحة عبر ?my_history=1
        $historyRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/rfqs?my_history=1');

        $historyRes->assertStatus(200);
        $this->assertNotEmpty($historyRes->json('data'));
        $this->assertEquals($initialRfq->id, $historyRes->json('data.0.id'));

        // قراءة تفاصيل الطلب التاريخي الفردي بالمعرف مسموحة لصاحب الطلب
        $showRes = $this->actingAs($this->enterpriseUser, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$initialRfq->id}");

        $showRes->assertStatus(200);
        $this->assertEquals('طلب تاريخي محفوظ', $showRes->json('title'));
    }

    /**
     * 10. لا يمكن تجاوز الصلاحيات عبر استدعاء الـ API المباشر
     */
    public function test_direct_api_calls_cannot_bypass_authorization(): void
    {
        // محاولة استدعاء بدون توكن مصادقة
        $unauthRes = $this->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب بدون مصادقة',
        ]);
        $unauthRes->assertStatus(401);

        // محاولة تقديم عرض من مستخدم باقة Starter مباشرة
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب معروض للتجربة',
            'service_type' => 'cutting',
            'specifications' => 'تفاصيل',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
        ]);

        $ws = $this->wwService->createWorkshopProfile([
            'tenant_id' => $this->starterTenant->id,
            'workshop_name' => 'ورشة Starter',
            'specialty_type' => 'cutting',
            'active_machines_count' => 5,
            'daily_capacity_pieces' => 100,
            'governorate' => 'القاهرة',
            'phone' => '01000000000',
            'contact_person' => 'الأسطى علي',
        ]);

        app()->instance('current_tenant_id', $this->starterTenant->id);

        $bidRes = $this->actingAs($this->starterUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
                'workshop_profile_id' => $ws->id,
                'unit_rate' => 15.00,
                'promised_lead_days' => 5,
            ]);

        $bidRes->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $bidRes->json('error_code'));
    }

    /**
     * 11. لا يمكن للمستأجرين غير المصرح لهم استعراض بيانات مستأجر آخر
     */
    public function test_unauthorized_tenants_cannot_access_another_tenants_marketplace_data(): void
    {
        // إنشاء طلب لـ Enterprise
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب سري خاص بنيل',
            'service_type' => 'cutting',
            'specifications' => 'بيانات مصنع النيل',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
        ]);

        // محاولة مستخدم Pro غير مصرح له قراءة تفاصيل الطلب بالمعرف المباشر
        app()->instance('current_tenant_id', $this->proTenant->id);

        $response = $this->actingAs($this->proUser, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}");

        $response->assertStatus(403);
        $this->assertEquals('WASLAT_WORSH_SUBSCRIPTION_REQUIRED', $response->json('error_code'));
    }

    /**
     * 12. وظائف الاشتراكات والباقات والعدادات العامة تعمل بشكل سليم دون أي تأثير جانبي
     */
    public function test_subscription_plans_and_general_meters_functionality_intact(): void
    {
        $plans = SubscriptionPlan::where(function ($q) {
            $q->whereNull('product_category')->orWhere('product_category', 'erp');
        })->with('meters')->get();
        $this->assertCount(3, $plans);

        $enterprisePlan = $plans->firstWhere('code', 'enterprise');
        $this->assertNotNull($enterprisePlan);
        $this->assertContains('waslat_worsh_marketplace', $enterprisePlan->features);

        $starterPlan = $plans->firstWhere('code', 'starter');
        $this->assertNotNull($starterPlan);
        $this->assertNotContains('waslat_worsh_marketplace', $starterPlan->features);

        $proPlan = $plans->firstWhere('code', 'pro');
        $this->assertNotNull($proPlan);
        $this->assertNotContains('waslat_worsh_marketplace', $proPlan->features);

        // التحقق من استهلاك العدادات الاعتيادية
        $report = $this->subService->getTenantUsageReport($this->enterpriseTenant->id);
        $this->assertArrayHasKey('meters', $report);
        $this->assertArrayHasKey('cutting_lays', $report['meters']);
    }
}

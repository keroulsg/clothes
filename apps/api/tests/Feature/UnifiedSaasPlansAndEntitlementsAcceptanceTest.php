<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\FactorySubscription;
use App\Models\MarketplaceRequesterSubscription;
use App\Models\SaasFeature;
use App\Models\SaasPlanFeature;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class UnifiedSaasPlansAndEntitlementsAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected SubscriptionUsageService $subService;
    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->subService = app(SubscriptionUsageService::class);
        $this->subService->seedDefaultPlans();

        $this->adminUser = User::factory()->create([
            'role' => 'platform_admin',
            'is_active' => true,
        ]);
    }

    /**
     * 1 & 2. Admin creates an ERP package and Waslat Worsh package
     */
    public function test_admin_can_create_erp_and_waslat_worsh_packages(): void
    {
        // 1. Create ERP package
        $erpRes = $this->actingAs($this->adminUser)->postJson('/api/v1/platform-admin/saas/packages', [
            'code' => 'erp_custom_factory',
            'product_category' => 'erp',
            'name_ar' => 'باقة المصانع المخصصة',
            'name_en' => 'Custom Factory Pack',
            'monthly_price' => 5500,
            'annual_price' => 55000,
            'features' => ['erp.inventory', 'erp.production'],
        ]);

        $erpRes->assertStatus(201)
            ->assertJsonPath('package.code', 'erp_custom_factory')
            ->assertJsonPath('package.product_category', 'erp');

        // 2. Create Waslat Worsh package
        $wwRes = $this->actingAs($this->adminUser)->postJson('/api/v1/platform-admin/saas/packages', [
            'code' => 'ww_custom_25',
            'product_category' => 'waslat_worsh',
            'name_ar' => 'باقة 25 طلب قص',
            'name_en' => '25 RFQ Pack',
            'monthly_price' => 1200,
            'quota_rfq_count' => 25,
            'billing_duration' => 60,
            'features' => ['waslat_worsh.create_rfq', 'waslat_worsh.receive_offers'],
        ]);

        $wwRes->assertStatus(201)
            ->assertJsonPath('package.code', 'ww_custom_25')
            ->assertJsonPath('package.product_category', 'waslat_worsh')
            ->assertJsonPath('package.quota_rfq_count', 25);
    }

    /**
     * 3, 4, 5. Admin creates, edits, and assigns/removes features from a package
     */
    public function test_admin_feature_lifecycle_and_package_assignment(): void
    {
        // 3. Admin creates a feature
        $createFeatRes = $this->actingAs($this->adminUser)->postJson('/api/v1/platform-admin/saas/features', [
            'feature_key' => 'erp.advanced_ai_planning',
            'product_category' => 'erp',
            'name_ar' => 'تخطيط الإنتاج الذكي',
            'name_en' => 'Smart AI Production Planning',
            'feature_type' => 'boolean',
        ]);

        $createFeatRes->assertStatus(201)
            ->assertJsonPath('feature.feature_key', 'erp.advanced_ai_planning');

        $featId = $createFeatRes->json('feature.id');

        // Edit feature
        $editFeatRes = $this->actingAs($this->adminUser)->putJson("/api/v1/platform-admin/saas/features/{$featId}", [
            'name_ar' => 'تخطيط الإنتاج بالذكاء الاصطناعي المطور',
            'name_en' => 'Enhanced Smart AI Planning',
        ]);
        $editFeatRes->assertStatus(200)
            ->assertJsonPath('feature.name_en', 'Enhanced Smart AI Planning');

        // 4. Assign feature to package
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();
        $assignRes = $this->actingAs($this->adminUser)->putJson("/api/v1/platform-admin/saas/packages/{$proPlan->id}", [
            'name_ar' => $proPlan->name_ar,
            'name_en' => $proPlan->name_en,
            'monthly_price' => $proPlan->monthly_price,
            'features' => array_merge($proPlan->features ?? [], ['erp.advanced_ai_planning']),
        ]);

        $assignRes->assertStatus(200);
        $this->assertTrue(
            SaasPlanFeature::where('plan_id', $proPlan->id)->where('feature_key', 'erp.advanced_ai_planning')->exists()
        );

        // 5. Remove feature from package
        $removeRes = $this->actingAs($this->adminUser)->putJson("/api/v1/platform-admin/saas/packages/{$proPlan->id}", [
            'name_ar' => $proPlan->name_ar,
            'name_en' => $proPlan->name_en,
            'monthly_price' => $proPlan->monthly_price,
            'features' => array_values(array_diff($proPlan->features ?? [], ['erp.advanced_ai_planning'])),
        ]);

        $removeRes->assertStatus(200);
        $this->assertFalse(
            SaasPlanFeature::where('plan_id', $proPlan->id)->where('feature_key', 'erp.advanced_ai_planning')->exists()
        );
    }

    /**
     * 6, 7, 8, 9, 10. Hide/Show, Deactivate, Public separation
     */
    public function test_package_visibility_and_product_separation(): void
    {
        $plan = SubscriptionPlan::where('code', 'ww_growth_15')->first();

        // 6. Hide package -> disappears from public catalog
        $this->actingAs($this->adminUser)->patchJson("/api/v1/platform-admin/saas/packages/{$plan->id}/toggle-public")
            ->assertStatus(200)
            ->assertJsonPath('is_public', false);

        $pubRes = $this->getJson('/api/v1/subscription/public-plans?category=waslat_worsh');
        $pubRes->assertStatus(200);
        $codes = collect($pubRes->json('plans'))->pluck('code')->toArray();
        $this->assertNotContains('ww_growth_15', $codes);

        // Re-show package
        $this->actingAs($this->adminUser)->patchJson("/api/v1/platform-admin/saas/packages/{$plan->id}/toggle-public")
            ->assertStatus(200)
            ->assertJsonPath('is_public', true);

        // 7. Deactivate package -> cannot be purchased
        $this->actingAs($this->adminUser)->patchJson("/api/v1/platform-admin/saas/packages/{$plan->id}/toggle-active")
            ->assertStatus(200)
            ->assertJsonPath('is_active', false);

        // 8. Public website shows active visible packages
        // 9 & 10. Strict separation: ERP never in waslat_worsh, Waslat Worsh never in ERP
        $erpCatalog = $this->getJson('/api/v1/subscription/public-plans?category=erp')->json('plans');
        $wwCatalog = $this->getJson('/api/v1/subscription/public-plans?category=waslat_worsh')->json('plans');

        foreach ($erpCatalog as $p) {
            $this->assertEquals('erp', $p['product_category']);
            $this->assertStringNotContainsString('ww_', $p['code']);
        }

        foreach ($wwCatalog as $p) {
            $this->assertContains($p['product_category'], ['waslat_worsh', 'waslat_worsh_requester']);
            $this->assertNotEquals('starter', $p['code']);
            $this->assertNotEquals('pro', $p['code']);
            $this->assertNotEquals('enterprise', $p['code']);
        }
    }

    /**
     * 11 & 12. Entitlement Enforcement: Starter cannot access Accounting; Waslat Worsh requester cannot access ERP
     */
    public function test_entitlement_enforcement_and_isolation(): void
    {
        // 11. Starter ERP tenant cannot access accounting
        $starterTenant = Tenant::create([
            'code' => 't_starter_' . uniqid(),
            'name' => 'Starter Workshop Co',
            'tenant_type' => 'factory',
            'plan_tier' => 'starter',
            'status' => 'active',
        ]);
        $starterUser = User::factory()->create([
            'tenant_id' => $starterTenant->id,
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $starterPlan = SubscriptionPlan::where('code', 'starter')->first();
        FactorySubscription::create([
            'tenant_id' => $starterTenant->id,
            'plan_id' => $starterPlan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $starterAccountingRes = $this->actingAs($starterUser)->getJson('/api/v1/accounting/accounts');
        $starterAccountingRes->assertStatus(403)
            ->assertJsonPath('error_code', 'FEATURE_NOT_ENTITLED');

        // 12. Waslat Worsh requester cannot access ERP accounting or payroll
        $requesterTenant = Tenant::create([
            'code' => 't_req_' . uniqid(),
            'name' => 'Requester Brand Co',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);
        $requesterUser = User::factory()->create([
            'tenant_id' => $requesterTenant->id,
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $wwPlan = SubscriptionPlan::where('code', 'ww_growth_15')->first();
        MarketplaceRequesterSubscription::create([
            'tenant_id' => $requesterTenant->id,
            'plan_id' => $wwPlan->id,
            'plan_code' => 'ww_growth_15',
            'status' => 'active',
            'allowed_rfq_count' => 15,
            'consumed_rfq_count' => 0,
            'starts_at' => now(),
            'expires_at' => now()->addDays(60),
        ]);

        $requesterErpRes = $this->actingAs($requesterUser)->getJson('/api/v1/accounting/accounts');
        $requesterErpRes->assertStatus(403)
            ->assertJsonPath('error_code', 'ERP_ACCESS_DENIED');

        $requesterPayrollRes = $this->actingAs($requesterUser)->getJson('/api/v1/hr/employees');
        $requesterPayrollRes->assertStatus(403)
            ->assertJsonPath('error_code', 'ERP_ACCESS_DENIED');
    }

    /**
     * 14 & 15. Expired subscriptions lose access, pending payments do not grant entitlements
     */
    public function test_expired_subscription_and_pending_payments(): void
    {
        $tenant = Tenant::create([
            'code' => 't_pro_' . uniqid(),
            'name' => 'Pro Factory Co',
            'tenant_type' => 'factory',
            'plan_tier' => 'pro',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();

        // Expired subscription
        FactorySubscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'starts_at' => now()->subMonths(2),
            'current_period_start' => now()->subMonths(2),
            'current_period_end' => now()->subDays(5), // Expired!
        ]);

        $res = $this->actingAs($user)->getJson('/api/v1/accounting/accounts');
        $res->assertStatus(403)
            ->assertJsonPath('error_code', 'SUBSCRIPTION_EXPIRED');

        // 15. Pending payment does not grant entitlement
        $newTenant = Tenant::create([
            'code' => 't_newreq_' . uniqid(),
            'name' => 'New Requester Co',
            'status' => 'active',
            'tenant_type' => 'marketplace_requester',
        ]);
        SubscriptionPaymentRequest::create([
            'tenant_id' => $newTenant->id,
            'user_id' => $user->id,
            'subscription_plan_id' => $proPlan->id,
            'product_type' => 'erp',
            'request_type' => 'new',
            'plan_code' => 'pro',
            'plan_name' => 'Pro Factory',
            'status' => 'pending',
            'submitted_amount' => 3900,
            'expected_amount' => 3900,
            'snapshot_price' => 3900,
            'transfer_reference' => 'TX_PENDING_1',
            'receipt_file_path' => 'dummy.jpg',
            'receipt_sha256' => 'hash1',
        ]);

        $entitlement = $this->subService->hasFeatureEntitlement($newTenant->id, 'erp.accounting');
        $this->assertFalse($entitlement['allowed']);
    }

    /**
     * 16. Package edits do not rewrite existing subscription snapshots
     */
    public function test_package_edit_preserves_subscriber_snapshot(): void
    {
        $tenant = Tenant::create([
            'code' => 't_snap_' . uniqid(),
            'name' => 'Snapshot Factory Co',
            'tenant_type' => 'factory',
            'status' => 'active',
        ]);
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();

        // Customer subscribed with snapshot having erp.costing
        FactorySubscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'billing_cycle' => 'monthly',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
            'plan_snapshot' => [
                'code' => 'pro',
                'name_ar' => 'باقة المصانع المتطورة',
                'features' => ['erp.inventory', 'erp.costing', 'erp.accounting'],
            ],
        ]);

        // Platform admin edits proPlan to remove erp.costing from future buyers
        $this->actingAs($this->adminUser)->putJson("/api/v1/platform-admin/saas/packages/{$proPlan->id}", [
            'name_ar' => $proPlan->name_ar,
            'name_en' => $proPlan->name_en,
            'monthly_price' => $proPlan->monthly_price,
            'features' => ['erp.inventory', 'erp.accounting'], // removed erp.costing
        ]);

        // Existing subscriber still has erp.costing via their immutable snapshot!
        $entitlement = $this->subService->hasFeatureEntitlement($tenant->id, 'erp.costing');
        $this->assertTrue($entitlement['allowed']);
        $this->assertEquals('FEATURE_NOT_IN_SNAPSHOT', $this->subService->hasFeatureEntitlement($tenant->id, 'erp.payroll')['reason'] ?? '');
    }

    /**
     * 18, 19, 20. Waslat Worsh Requester Upgrades to ERP (In-Place Tenant Conversion)
     */
    public function test_requester_to_erp_account_conversion(): void
    {
        // 18. Requester can browse ERP packages
        $erpPlans = $this->getJson('/api/v1/subscription/public-plans?category=erp');
        $erpPlans->assertStatus(200);
        $this->assertNotEmpty($erpPlans->json('plans'));

        // Requester tenant
        $tenant = Tenant::create([
            'code' => 't_upg_' . uniqid(),
            'name' => 'Upgrade Seeker Brand',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $wwPlan = SubscriptionPlan::where('code', 'ww_growth_15')->first();
        MarketplaceRequesterSubscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $wwPlan->id,
            'plan_code' => 'ww_growth_15',
            'status' => 'active',
            'allowed_rfq_count' => 15,
            'consumed_rfq_count' => 0,
            'starts_at' => now(),
            'expires_at' => now()->addDays(60),
        ]);

        // 20. Pending ERP purchase does not grant ERP access
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();
        $file = UploadedFile::fake()->create('proof.pdf', 500);

        $submitRes = $this->actingAs($user)->postJson('/api/v1/subscriptions/payment-requests', [
            'plan_code' => 'pro',
            'request_type' => 'upgrade',
            'payment_method' => 'instapay',
            'transfer_reference' => 'UPGRADE_REF_123',
            'submitted_amount' => 3900,
            'receipt' => $file,
        ]);
        $submitRes->assertStatus(201);
        $paymentRequestId = $submitRes->json('payment_request.id');

        // Still blocked from ERP before approval
        $checkRes = $this->actingAs($user)->getJson('/api/v1/accounting/accounts');
        $checkRes->assertStatus(403);

        // 19. Admin approves payment request -> In-place tenant conversion
        $approveRes = $this->actingAs($this->adminUser)->postJson("/api/v1/platform-admin/subscription-requests/{$paymentRequestId}/approve");
        $approveRes->assertStatus(200);

        // Verify conversion: tenant_type is now 'factory', plan_tier is 'pro'
        $tenant->refresh();
        $this->assertEquals('factory', $tenant->tenant_type);
        $this->assertEquals('pro', $tenant->plan_tier);

        // Verify factory subscription was created
        $factorySub = FactorySubscription::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($factorySub);
        $this->assertEquals('active', $factorySub->status);

        // Verify Waslat Worsh requester subscription remains intact!
        $reqSub = MarketplaceRequesterSubscription::where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($reqSub);
        $this->assertEquals(15, $reqSub->allowed_rfq_count);

        // 23. Duplicate approval is rejected (Idempotency)
        $dupRes = $this->actingAs($this->adminUser)->postJson("/api/v1/platform-admin/subscription-requests/{$paymentRequestId}/approve");
        $dupRes->assertStatus(400);
    }

    /**
     * 10, 11, 12. Duplicate, Archive, Subscribers list
     */
    public function test_admin_duplicate_archive_and_subscribers(): void
    {
        $starterPlan = SubscriptionPlan::where('code', 'starter')->first();

        // 10. Duplicate package
        $dupRes = $this->actingAs($this->adminUser)->postJson("/api/v1/platform-admin/saas/packages/{$starterPlan->id}/duplicate");
        $dupRes->assertStatus(201)
            ->assertJsonPath('package.is_active', false);
        $newCode = $dupRes->json('package.code');
        $this->assertStringContainsString('copy', $newCode);

        // 11. Archive package
        $archRes = $this->actingAs($this->adminUser)->postJson("/api/v1/platform-admin/saas/packages/{$starterPlan->id}/archive");
        $archRes->assertStatus(200)
            ->assertJsonPath('package.is_archived', true);

        // Cannot be purchased on public website
        $pubRes = $this->getJson('/api/v1/subscription/public-plans?category=erp');
        $codes = collect($pubRes->json('plans'))->pluck('code')->toArray();
        $this->assertNotContains('starter', $codes);

        // 12. View package subscribers
        $subTenant = Tenant::create([
            'code' => 't_sub_' . uniqid(),
            'name' => 'Subscriber Factory',
            'tenant_type' => 'factory',
            'status' => 'active',
        ]);
        FactorySubscription::create([
            'tenant_id' => $subTenant->id,
            'plan_id' => $starterPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $subscribersRes = $this->actingAs($this->adminUser)->getJson("/api/v1/platform-admin/saas/packages/{$starterPlan->id}/subscribers");
        $subscribersRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, count($subscribersRes->json('subscribers')));
    }

    /**
     * 13. Global Feature Switch Deactivates Feature For All Tenants
     */
    public function test_global_feature_deactivation_disables_for_all_tenants(): void
    {
        $tenant = Tenant::create([
            'code' => 't_pro2_' . uniqid(),
            'name' => 'Pro Factory Two',
            'tenant_type' => 'factory',
            'plan_tier' => 'pro',
            'status' => 'active',
        ]);
        $user = User::factory()->create([
            'tenant_id' => $tenant->id,
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();
        FactorySubscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
            'plan_snapshot' => [
                'code' => 'pro',
                'features' => ['erp.accounting', 'erp.inventory'],
            ],
        ]);

        // Pro normally has accounting
        $allowedBefore = $this->subService->hasFeatureEntitlement($tenant->id, 'erp.accounting');
        $this->assertTrue($allowedBefore['allowed']);

        // Admin globally deactivates erp.accounting feature
        $accountingFeat = SaasFeature::where('feature_key', 'erp.accounting')->first();
        $this->actingAs($this->adminUser)->patchJson("/api/v1/platform-admin/saas/features/{$accountingFeat->id}/toggle-active")
            ->assertStatus(200)
            ->assertJsonPath('is_active', false);

        // Now tenant is denied even with active snapshot!
        $deniedAfter = $this->subService->hasFeatureEntitlement($tenant->id, 'erp.accounting');
        $this->assertFalse($deniedAfter['allowed']);
        $this->assertEquals('FEATURE_GLOBALLY_DEACTIVATED', $deniedAfter['reason']);

        // Route rejects request
        $res = $this->actingAs($user)->getJson('/api/v1/accounting/accounts');
        $res->assertStatus(403)
            ->assertJsonPath('error_code', 'FEATURE_DEACTIVATED');
    }

    /**
     * 15 & 16. Pro accesses Accounting, Enterprise accesses Waslat Worsh Provider
     */
    public function test_tier_entitlement_access_rights(): void
    {
        // 15. Pro accesses Accounting
        $proTenant = Tenant::create([
            'code' => 't_pro_ok_' . uniqid(),
            'name' => 'Pro Valid Factory',
            'tenant_type' => 'factory',
            'plan_tier' => 'pro',
            'status' => 'active',
        ]);
        $proUser = User::factory()->create([
            'tenant_id' => $proTenant->id,
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $proPlan = SubscriptionPlan::where('code', 'pro')->first();
        FactorySubscription::create([
            'tenant_id' => $proTenant->id,
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
            'plan_snapshot' => [
                'code' => 'pro',
                'features' => ['erp.accounting', 'erp.inventory'],
            ],
        ]);

        $proAccRes = $this->actingAs($proUser)->getJson('/api/v1/accounting/accounts');
        $proAccRes->assertStatus(200);

        // 16. Enterprise factory has waslat_worsh.marketplace_provider entitlement
        $entTenant = Tenant::create([
            'code' => 't_ent_' . uniqid(),
            'name' => 'Enterprise Mega Factory',
            'tenant_type' => 'factory',
            'plan_tier' => 'enterprise',
            'status' => 'active',
        ]);
        $entPlan = SubscriptionPlan::where('code', 'enterprise')->first();
        FactorySubscription::create([
            'tenant_id' => $entTenant->id,
            'plan_id' => $entPlan->id,
            'status' => 'active',
            'starts_at' => now(),
            'current_period_start' => now(),
            'current_period_end' => now()->addMonth(),
        ]);

        $providerEntitlement = $this->subService->hasFeatureEntitlement($entTenant->id, 'waslat_worsh.marketplace_provider');
        $this->assertTrue($providerEntitlement['allowed']);

        // Pro factory does NOT have waslat_worsh.marketplace_provider entitlement
        $proProviderEntitlement = $this->subService->hasFeatureEntitlement($proTenant->id, 'waslat_worsh.marketplace_provider');
        $this->assertFalse($proProviderEntitlement['allowed']);
    }
}

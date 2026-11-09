<?php

namespace Tests\Feature;

use App\Models\MarketplaceRequesterSubscription;
use App\Models\Rfq;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Services\SubscriptionUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshC6EnterpriseProviderEligibilityTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $requesterTenant;
    private User $requesterUser;

    private Tenant $starterTenant;
    private User $starterUser;

    private Tenant $enterpriseTenant;
    private User $enterpriseUser;

    private Rfq $publishedRfq;

    protected function setUp(): void
    {
        parent::setUp();
        $subService = app(SubscriptionUsageService::class);
        $subService->seedDefaultPlans();

        // 1. حساب طالب خدمة مستقل
        $this->requesterTenant = Tenant::create([
            'code' => 'REQ-C6-01',
            'name' => 'ماركة ملابس خاصة',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);
        $this->requesterUser = User::create([
            'tenant_id' => $this->requesterTenant->id,
            'name' => 'صاحب البراند',
            'email' => 'brand_owner@garmentos.test',
            'password' => bcrypt('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        MarketplaceRequesterSubscription::create([
            'tenant_id' => $this->requesterTenant->id,
            'plan_code' => 'ww_starter_5',
            'status' => 'active',
            'allowed_rfq_count' => 5,
            'consumed_rfq_count' => 1,
            'starts_at' => now(),
            'expires_at' => now()->addDays(90),
        ]);

        // 2. مصنع باقة Starter
        $this->starterTenant = Tenant::create([
            'code' => 'STR-C6-02',
            'name' => 'ورشة صغيرة باقة ستارتير',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);
        $subService->upgradeSubscription($this->starterTenant->id, 'starter');
        $this->starterUser = User::create([
            'tenant_id' => $this->starterTenant->id,
            'name' => 'صاحب الورشة الصغيرة',
            'email' => 'starter_workshop@garmentos.test',
            'password' => bcrypt('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 3. مصنع باقة Enterprise
        $this->enterpriseTenant = Tenant::create([
            'code' => 'ENT-C6-03',
            'name' => 'مجمع النصر الصناعي للغزل والنسيج',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);
        $subService->upgradeSubscription($this->enterpriseTenant->id, 'enterprise');
        $this->enterpriseUser = User::create([
            'tenant_id' => $this->enterpriseTenant->id,
            'name' => 'مدير إنتاج مجمع النصر',
            'email' => 'nasr_director@garmentos.test',
            'password' => bcrypt('Secret123456!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        // 4. طلب قص منشور
        $this->publishedRfq = Rfq::withoutGlobalScopes()->create([
            'tenant_id' => $this->requesterTenant->id,
            'created_by' => $this->requesterUser->id,
            'rfq_number' => 'RFQ-2026-C6-001',
            'title' => 'طلب قص كمية 1000 قطعة قميص رجالي',
            'service_type' => 'cutting',
            'specifications' => 'المواصفات الفنية للقص الآلي',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(20)->toDateString(),
            'item_type' => 'shirts',
            'total_quantity' => 1000,
            'fabric_type' => 'Poplin Cotton',
            'fabric_source' => 'client_provided',
            'pattern_source' => 'client_provided',
            'target_delivery_date' => now()->addDays(20)->toDateString(),
            'target_unit_price' => 15.00,
            'city' => 'العاشر من رمضان',
            'status' => 'published',
            'published_at' => now(),
            'sizes_breakdown' => [['size' => 'L', 'quantity' => 1000]],
        ]);
    }

    public function test_marketplace_requester_is_forbidden_from_creating_workshop_profile(): void
    {
        $response = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/workshops', [
            'workshop_name' => 'ورشة متسللة لطالب خدمة',
            'cutting_type' => 'manual',
            'city' => 'القاهرة',
            'daily_cutting_capacity' => 500,
        ]);

        $response->assertStatus(403);
    }

    public function test_starter_factory_is_forbidden_from_creating_workshop_or_bidding(): void
    {
        // 1. محاولة تسجيل ورشة
        $wsRes = $this->actingAs($this->starterUser)->postJson('/api/v1/waslat-worsh/workshops', [
            'workshop_name' => 'مشغل التميز الصغير',
            'cutting_type' => 'straight_knife',
            'city' => 'شبرا الخيمة',
            'daily_cutting_capacity' => 1000,
        ]);
        $wsRes->assertStatus(403);

        // 2. محاولة تقديم عرض سعر
        $bidRes = $this->actingAs($this->starterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$this->publishedRfq->id}/bids", [
            'unit_price' => 12.00,
            'estimated_days' => 5,
            'notes' => 'عرض غير مصرح به من باقة Starter',
        ]);
        $bidRes->assertStatus(403);
    }

    public function test_enterprise_factory_without_verified_workshop_cannot_submit_bid(): void
    {
        $wwService = app(\App\Services\WaslatWorshService::class);
        $workshop = $wwService->createWorkshopProfile([
            'tenant_id' => $this->enterpriseTenant->id,
            'workshop_name' => 'عنابر القص غير الموثقة',
            'specialty_type' => 'cutting',
            'active_machines_count' => 3,
            'daily_capacity_pieces' => 500,
            'governorate' => 'القاهرة',
            'phone' => '01011112222',
            'contact_person' => 'مدير الصالة',
        ]);
        $workshop->is_verified = false;
        $workshop->save();

        $response = $this->actingAs($this->enterpriseUser)->postJson("/api/v1/waslat-worsh/rfqs/{$this->publishedRfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 14.00,
            'promised_lead_days' => 7,
            'notes' => 'عرض بدون ورشة موثقة',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'WorkshopNotVerified');
    }

    public function test_enterprise_factory_with_verified_workshop_can_submit_bid_successfully(): void
    {
        $wwService = app(\App\Services\WaslatWorshService::class);
        $workshop = $wwService->createWorkshopProfile([
            'tenant_id' => $this->enterpriseTenant->id,
            'workshop_name' => 'عنابر القص الآلي بمجمع النصر',
            'specialty_type' => 'cutting',
            'active_machines_count' => 10,
            'daily_capacity_pieces' => 15000,
            'governorate' => 'الغربية',
            'city' => 'المحلة الكبرى',
            'phone' => '01033334444',
            'contact_person' => 'م. أحمد الشامي',
        ]);
        $workshop->is_verified = true;
        $workshop->save();

        $response = $this->actingAs($this->enterpriseUser)->postJson("/api/v1/waslat-worsh/rfqs/{$this->publishedRfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 13.50,
            'promised_lead_days' => 6,
            'notes' => 'قص آلي كمبيوتري عالي الدقة بنسبة هادر أقل من 2%',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('bid.status', 'submitted');

        $this->assertDatabaseHas('rfq_bids', [
            'rfq_id' => $this->publishedRfq->id,
            'workshop_profile_id' => $workshop->id,
        ]);
    }

    public function test_enterprise_factory_cannot_bid_on_their_own_rfq(): void
    {
        $wwService = app(\App\Services\WaslatWorshService::class);
        $workshop = $wwService->createWorkshopProfile([
            'tenant_id' => $this->enterpriseTenant->id,
            'workshop_name' => 'ورشة مجمع النصر',
            'specialty_type' => 'cutting',
            'active_machines_count' => 5,
            'daily_capacity_pieces' => 5000,
            'governorate' => 'الغربية',
            'phone' => '01055556666',
            'contact_person' => 'مدير الفرع',
        ]);
        $workshop->is_verified = true;
        $workshop->save();

        // المصنع ينشئ طلباً خاصاً به
        $ownRfq = Rfq::withoutGlobalScopes()->create([
            'tenant_id' => $this->enterpriseTenant->id,
            'created_by' => $this->enterpriseUser->id,
            'rfq_number' => 'RFQ-OWN-001',
            'title' => 'طلب خاص بمجمع النصر',
            'service_type' => 'cutting',
            'specifications' => 'المواصفات الفنية لفساتين حرير',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'item_type' => 'dresses',
            'total_quantity' => 500,
            'fabric_type' => 'Silk',
            'fabric_source' => 'client_provided',
            'pattern_source' => 'client_provided',
            'target_delivery_date' => now()->addDays(10)->toDateString(),
            'target_unit_price' => 25.00,
            'city' => 'طنطا',
            'status' => 'published',
            'sizes_breakdown' => [['size' => 'M', 'quantity' => 500]],
        ]);

        // محاولة المزايدة على طلبه الخاص
        $response = $this->actingAs($this->enterpriseUser)->postJson("/api/v1/waslat-worsh/rfqs/{$ownRfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 10.00,
            'promised_lead_days' => 3,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'SelfBiddingForbidden');
    }
}

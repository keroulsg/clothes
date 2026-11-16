<?php

namespace Tests\Feature;

use App\Models\JobOrder;
use App\Models\MarketplaceCommission;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshTimerAndFinancialAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private WaslatWorshService $wwService;
    private Tenant $seekerTenant;
    private Tenant $providerTenant;
    private User $seekerUser;
    private User $providerUser;
    private WorkshopProfile $workshop;

    protected function setUp(): void
    {
        parent::setUp();

        $subService = app(SubscriptionUsageService::class);
        $subService->seedDefaultPlans();

        $this->wwService = app(WaslatWorshService::class);

        // Seeker tenant (Enterprise ERP)
        $this->seekerTenant = Tenant::create([
            'code' => 'T_SEEKER_' . uniqid(),
            'name' => 'مصنع الفجر للملابس',
            'tenant_type' => 'factory',
            'plan_tier' => 'enterprise',
            'status' => 'active',
        ]);
        $subService->upgradeSubscription($this->seekerTenant->id, 'enterprise');

        $this->seekerUser = User::factory()->create([
            'tenant_id' => $this->seekerTenant->id,
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // Provider tenant (Enterprise ERP)
        $this->providerTenant = Tenant::create([
            'code' => 'T_PROVIDER_' . uniqid(),
            'name' => 'صالة النيل للقص والتفصيل',
            'tenant_type' => 'factory',
            'plan_tier' => 'enterprise',
            'status' => 'active',
        ]);
        $subService->upgradeSubscription($this->providerTenant->id, 'enterprise');

        $this->providerUser = User::factory()->create([
            'tenant_id' => $this->providerTenant->id,
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // Verified workshop profile
        $this->workshop = $this->wwService->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'صالة النيل المتخصصة',
            'specialty_type' => 'cutting',
            'active_machines_count' => 12,
            'daily_capacity_pieces' => 800,
            'governorate' => 'القاهرة',
            'phone' => '01011223344',
            'contact_person' => 'م. حازم',
            'is_verified' => true,
        ]);
    }

    /**
     * 1. Before Waiting Period: Direct API call to accept bid before 60 minutes is strictly rejected with 422
     */
    public function test_cannot_accept_bid_before_60_minute_window_via_api(): void
    {
        // Published now (0 minutes elapsed)
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص 1000 قطعة قميص قطني',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => true,
        ]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => 25.00,
            'promised_lead_days' => 5,
        ]);

        // Attempt direct API call immediately
        $res = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");

        $res->assertStatus(422);
        $this->assertStringContainsString('نافذة استقبال العروض مستمرة لمدة 60 دقيقة', $res->json('message'));

        // Bid remains 'submitted', RFQ remains 'open' or 'published'
        $bid->refresh();
        $this->assertEquals('submitted', $bid->status);
        $this->assertNull($rfq->fresh()->awarded_bid_id);
    }

    /**
     * 2. Browser Clock Manipulation: Spoofed client timestamps/headers fail because server time is authoritative
     */
    public function test_browser_clock_manipulation_fails_because_server_time_is_authoritative(): void
    {
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص 500 قطعة فستان',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => true,
        ]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => 30.00,
            'promised_lead_days' => 4,
        ]);

        // Client sends manipulated headers pretending browser time is tomorrow
        $res = $this->actingAs($this->seekerUser, 'sanctum')
            ->withHeaders([
                'X-Client-Date' => now()->addDays(1)->toIso8601String(),
                'Date' => now()->addDays(1)->toRfc7231String(),
            ])
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept", [
                'client_current_time' => now()->addDays(1)->toIso8601String(),
            ]);

        $res->assertStatus(422);
        $this->assertStringContainsString('نافذة استقبال العروض مستمرة', $res->json('message'));
    }

    /**
     * 3. At 59 minutes (boundary before threshold): Fails
     */
    public function test_cannot_accept_bid_at_59_minutes(): void
    {
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص 800 قطعة بنطلون',
            'service_type' => 'cutting',
            'target_quantity' => 800,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => true,
        ]);

        // Set published_at to 59 minutes and 30 seconds ago
        $rfq->update(['published_at' => now()->subMinutes(59)->subSeconds(30)]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => 22.00,
            'promised_lead_days' => 6,
        ]);

        $res = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");

        $res->assertStatus(422);
        $this->assertStringContainsString('نافذة استقبال العروض مستمرة', $res->json('message'));
    }

    /**
     * 4. At Exact 60-Minute Boundary and After: Succeeds
     */
    public function test_can_accept_bid_at_or_after_60_minute_boundary(): void
    {
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص 1200 قطعة تي شيرت',
            'service_type' => 'cutting',
            'target_quantity' => 1200,
            'expected_delivery_date' => now()->addDays(12)->toDateString(),
            'publish' => true,
        ]);

        // Exactly 60 minutes and 1 second ago
        $rfq->update(['published_at' => now()->subMinutes(60)->subSeconds(1)]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => 18.00,
            'promised_lead_days' => 5,
        ]);

        $res = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");

        $res->assertStatus(200);
        $this->assertEquals('accepted', $bid->fresh()->status);
        $this->assertEquals('offer_selected', $rfq->fresh()->status);
        $this->assertEquals($bid->id, $rfq->fresh()->awarded_bid_id);
    }

    /**
     * 5. Concurrent / Duplicate Award Requests: Atomic locking prevents race conditions and duplicates
     */
    public function test_duplicate_award_calls_are_rejected(): void
    {
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص 2000 قطعة يونيفورم',
            'service_type' => 'cutting',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(15)->toDateString(),
            'publish' => true,
        ]);
        $rfq->update(['published_at' => now()->subMinutes(70)]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => 20.00,
            'promised_lead_days' => 7,
        ]);

        // First award succeeds
        $res1 = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");
        $res1->assertStatus(200);

        // Immediate duplicate call fails with 422 (cannot accept on already awarded RFQ)
        $res2 = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");
        $res2->assertStatus(422);

        // Verify only ONE JobOrder was created
        $this->assertEquals(1, JobOrder::where('tenant_id', $this->seekerTenant->id)->count());
    }

    /**
     * 6. Financial Acceptance: Separate 3% Requester and 3% Provider Commission Records
     */
    public function test_two_sided_commission_records_created_separately(): void
    {
        $targetQty = 1500;
        $unitRate = 40.00;
        $expectedGross = 1500 * 40.00; // 60,000 EGP
        $expectedCommission = 60000 * 0.03; // 1,800 EGP

        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل 1500 قميص أكسفورد',
            'service_type' => 'cutting',
            'target_quantity' => $targetQty,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
            'publish' => true,
        ]);
        $rfq->update(['published_at' => now()->subMinutes(65)]);

        $bid = $this->wwService->submitBid($rfq->id, $this->workshop->id, [
            'unit_rate' => $unitRate,
            'promised_lead_days' => 10,
        ]);

        $res = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");
        $res->assertStatus(200);

        // Verify separate commission records in database without global scopes
        $allCommissions = MarketplaceCommission::withoutGlobalScopes()->where('rfq_id', $rfq->id)->get();
        $this->assertCount(2, $allCommissions, 'Must create 2 separate commission records (one for requester, one for provider)');

        $seekerComm = $allCommissions->where('tenant_id', $this->seekerTenant->id)->first();
        $this->assertNotNull($seekerComm);
        $this->assertEquals($expectedGross, (float) $seekerComm->gross_amount);
        $this->assertEquals(3.00, (float) $seekerComm->commission_rate);
        $this->assertEquals($expectedCommission, (float) $seekerComm->commission_amount);
        $this->assertEquals('pending', $seekerComm->status);

        $providerComm = $allCommissions->where('tenant_id', $this->providerTenant->id)->first();
        $this->assertNotNull($providerComm);
        $this->assertEquals($expectedGross, (float) $providerComm->gross_amount);
        $this->assertEquals(3.00, (float) $providerComm->commission_rate);
        $this->assertEquals($expectedCommission, (float) $providerComm->commission_amount);
        $this->assertEquals('pending', $providerComm->status);

        // Verify Tenant Isolation: Seeker query only sees seeker commission
        app()->instance('current_tenant_id', $this->seekerTenant->id);
        $this->assertCount(1, MarketplaceCommission::where('rfq_id', $rfq->id)->get());

        // Verify Tenant Isolation: Provider query only sees provider commission
        app()->instance('current_tenant_id', $this->providerTenant->id);
        $this->assertCount(1, MarketplaceCommission::where('rfq_id', $rfq->id)->get());
    }

    /**
     * 7. Privacy Tests: Phone numbers and private addresses remain masked until authorized
     */
    public function test_privacy_masking_protects_contact_details(): void
    {
        $rfq = $this->wwService->createRfq($this->seekerTenant->id, [
            'title' => 'قص ملابس خاصة',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'publish' => true,
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
                'pickup_address_private' => 'عمارة 15 شارع مكرم عبيد شقة 4 سرية',
                'pickup_contact_phone' => '01099887766',
                'delivery_governorate' => 'الجيزة',
                'delivery_city' => 'الدقي',
                'delivery_address_private' => 'مخزن 2 شارع مصدق السري',
                'delivery_contact_phone' => '01122334455',
            ],
        ]);

        // Provider viewing the RFQ in public marketplace
        $maskedData = $this->wwService->maskPrivateDetails($rfq, $this->providerTenant->id);

        $this->assertEquals('القاهرة', $maskedData['logistics']['pickup_governorate']);
        $this->assertEquals('مدينة نصر', $maskedData['logistics']['pickup_city']);
        $this->assertNull($maskedData['logistics']['pickup_address_private'], 'Private address must be masked for non-owners');
        $this->assertNull($maskedData['logistics']['pickup_contact_phone'], 'Phone number must be masked for non-owners');
        $this->assertNull($maskedData['logistics']['delivery_address_private'], 'Delivery address must be masked for non-owners');
        $this->assertNull($maskedData['logistics']['delivery_contact_phone'], 'Delivery phone must be masked for non-owners');

        // Owner viewing the RFQ
        $ownerData = $this->wwService->maskPrivateDetails($rfq, $this->seekerTenant->id);
        $this->assertEquals('عمارة 15 شارع مكرم عبيد شقة 4 سرية', $ownerData['logistics']['pickup_address_private']);
        $this->assertEquals('01099887766', $ownerData['logistics']['pickup_contact_phone']);
    }
}

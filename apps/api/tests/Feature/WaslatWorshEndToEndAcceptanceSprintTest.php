<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\MarketplaceRequesterSubscription;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WaslatWorshEndToEndAcceptanceSprintTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionUsageService $subService;
    private WaslatWorshService $wwService;
    private User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->subService = app(SubscriptionUsageService::class);
        $this->subService->seedDefaultPlans();
        $this->wwService = app(WaslatWorshService::class);
        Storage::fake('local');

        // Create Platform Admin cleanly during setup
        $this->adminUser = User::create([
            'name' => 'مشرف المنصة المركزي',
            'email' => 'platform_admin@garmentos.test',
            'password' => Hash::make('AdminSecret123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);
    }

    /**
     * Journey A — Independent Requester Complete Lifecycle
     */
    public function test_journey_a_independent_requester_full_lifecycle(): void
    {
        // 1. Open public marketplace
        $pubRes = $this->getJson('/api/v1/waslat-worsh/public/rfqs');
        $pubRes->assertStatus(200);

        // 2. Register a new requester
        $regRes = $this->postJson('/api/v1/auth/register-requester', [
            'tenant_name' => 'دار الأناقة للأزياء',
            'brand_name' => 'Elegance Brand',
            'owner_name' => 'طارق الألفي',
            'name' => 'طارق الألفي',
            'email' => 'tarek@elegance.test',
            'phone' => '01012345678',
            'city' => 'القاهرة',
            'password' => 'Secret123456!',
            'password_confirmation' => 'Secret123456!',
        ]);

        $regRes->assertStatus(201)
            ->assertJsonPath('tenant.tenant_type', 'marketplace_requester');

        $tenantId = $regRes->json('tenant.id');
        $userId = $regRes->json('user.id');
        $requesterUser = User::findOrFail($userId);

        // 3. Log in as requester
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'tarek@elegance.test',
            'password' => 'Secret123456!',
        ]);

        $loginRes->assertStatus(200);
        $this->assertNotEmpty($loginRes->json('access_token'));

        // 4. Confirm permanent tenant UUID and requester type
        $tenant = Tenant::findOrFail($tenantId);
        $this->assertEquals('marketplace_requester', $tenant->tenant_type);
        $this->assertEquals($tenantId, $tenant->id);

        // 5. Confirm ERP access returns 403
        $erpRes = $this->actingAs($requesterUser, 'sanctum')->getJson('/api/v1/inventory/items');
        $erpRes->assertStatus(403)
            ->assertJsonPath('error_code', 'ERP_ACCESS_DENIED');

        // Requester cannot create workshops
        $wsRes = $this->actingAs($requesterUser, 'sanctum')->postJson('/api/v1/waslat-worsh/workshops', [
            'workshop_name' => 'ورشة متسللة',
            'cutting_type' => 'manual',
        ]);
        $wsRes->assertStatus(403);

        // 6. Browse subscription packages
        $plansRes = $this->getJson('/api/v1/waslat-worsh/subscription-plans');
        $plansRes->assertStatus(200)
            ->assertJsonStructure(['plans', 'payment_instructions']);

        $wwStarter = collect($plansRes->json('plans'))->firstWhere('code', 'ww_starter_5');
        $this->assertNotNull($wwStarter);
        $this->assertEquals(5, $wwStarter['quota_rfq_count']);

        // 7 & 8. Select package and submit payment request with valid receipt
        $receiptFile = UploadedFile::fake()->create('cib_receipt.png', 400, 'image/png');
        $payRes = $this->actingAs($requesterUser, 'sanctum')->postJson('/api/v1/subscriptions/payment-requests', [
            'product_type' => 'waslat_worsh',
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'bank_transfer',
            'transfer_reference' => 'CIB-TRANSFER-998877',
            'submitted_amount' => 300,
            'receipt' => $receiptFile,
        ]);

        $payRes->assertStatus(201)
            ->assertJsonPath('payment_request.status', 'pending');
        $payReqId = $payRes->json('payment_request.id');

        // 9. Confirm subscription remains inactive while payment is pending
        $statusRes = $this->actingAs($requesterUser, 'sanctum')->getJson('/api/v1/subscriptions/my-status');
        $statusRes->assertStatus(200)
            ->assertJsonPath('pending_payment_request.status', 'pending');
        $this->assertFalse($statusRes->json('requester_subscription.is_valid') ?? false);

        // 10 & 11. Confirm payment status remains visible
        $recheckStatus = $this->actingAs($requesterUser, 'sanctum')->getJson('/api/v1/subscriptions/my-status');
        $recheckStatus->assertStatus(200)
            ->assertJsonPath('pending_payment_request.id', $payReqId);

        // 12 & 13. Create an RFQ draft, confirm draft does not consume quota
        $draftPayload = [
            'title' => 'تشغيل 1000 قطعة قميص كاجوال',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Cotton Poplin',
            ],
            'production_details' => [
                'size_breakdown' => [
                    'M' => 500,
                    'L' => 500,
                ],
            ],
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
                'pickup_address_private' => 'المخزن السري - بلوك 9',
            ],
        ];

        $draftRes = $this->actingAs($requesterUser, 'sanctum')->postJson('/api/v1/waslat-worsh/rfqs', $draftPayload);
        $draftRes->assertStatus(201)
            ->assertJsonPath('rfq.status', 'draft');
        $rfqId = $draftRes->json('rfq.id');

        // Publishing now must fail because subscription is not activated yet
        $this->actingAs($requesterUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish")
            ->assertStatus(403);

        // 14. Admin approves payment request
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/approve")
            ->assertStatus(200);

        // 15. Complete technical specifications via PUT
        $updateRes = $this->actingAs($requesterUser, 'sanctum')->putJson("/api/v1/waslat-worsh/rfqs/{$rfqId}", [
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(12)->toDateString(),
            'specifications' => 'قص ليزر أو سكين مستقيم مع دقة تطابق الماركر 100%',
            'production_details' => [
                'size_breakdown' => [
                    'M' => 500,
                    'L' => 500,
                ],
            ],
        ]);
        $updateRes->assertStatus(200);

        // 16. Publish the RFQ and confirm exactly one quota is consumed
        $sub = MarketplaceRequesterSubscription::withoutGlobalScopes()->where('tenant_id', $tenantId)->first();
        $this->assertEquals(0, $sub->consumed_rfq_count);
        $this->assertEquals(5, $sub->remaining_rfq_count);

        $pubReqRes = $this->actingAs($requesterUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish");
        $pubReqRes->assertStatus(200)
            ->assertJsonPath('rfq.status', 'published');

        $sub->refresh();
        $this->assertEquals(1, $sub->consumed_rfq_count);
        $this->assertEquals(4, $sub->remaining_rfq_count);

        // 17. Publish again and confirm idempotent (no extra quota consumed)
        $this->actingAs($requesterUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish")
            ->assertStatus(200);

        $sub->refresh();
        $this->assertEquals(1, $sub->consumed_rfq_count);
        $this->assertEquals(4, $sub->remaining_rfq_count);

        // 18. Confirm RFQ appears on public marketplace
        $pubListRes = $this->getJson('/api/v1/waslat-worsh/public/rfqs');
        $pubListRes->assertStatus(200);
        $found = collect($pubListRes->json('data'))->firstWhere('id', $rfqId);
        $this->assertNotNull($found);

        // 19. Confirm private address and private info is NOT exposed in public view
        $pubDetailRes = $this->getJson("/api/v1/waslat-worsh/public/rfqs/{$rfqId}");
        $pubDetailRes->assertStatus(200);
        $rfqPub = $pubDetailRes->json('rfq');
        $this->assertArrayNotHasKey('pickup_address_private', $rfqPub);
        $this->assertArrayNotHasKey('delivery_address_private', $rfqPub);
        $this->assertStringNotContainsString('المخزن السري', json_encode($rfqPub));
    }

    /**
     * Journey B — Platform Admin Payment Approval Workflow
     */
    public function test_journey_b_platform_admin_approval_and_rejection_security(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-JB-01',
            'name' => 'مصنع الزهور للملابس',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'كمال الدين',
            'email' => 'kamal@flowers.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // Create receipt file
        $receipt = UploadedFile::fake()->create('receipt_jb.png', 300, 'image/png');
        $payRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/subscriptions/payment-requests', [
            'product_type' => 'waslat_worsh',
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-JB-1234',
            'submitted_amount' => 300,
            'receipt' => $receipt,
        ]);

        $payReqId = $payRes->json('payment_request.id');

        // 1 & 2. Admin logs in and opens pending subscription queue
        $queueRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson('/api/v1/platform-admin/subscription-requests?status=pending');
        $queueRes->assertStatus(200);
        $this->assertNotEmpty($queueRes->json('data'));

        // 3. Admin opens submitted receipt through protected endpoint
        $receiptRes = $this->actingAs($this->adminUser, 'sanctum')
            ->getJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/receipt");
        $receiptRes->assertStatus(200);

        // 4. Unauthorized regular user cannot access receipt
        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/receipt")
            ->assertStatus(403);

        // 5. Self-approval is prevented
        $selfReq = SubscriptionPaymentRequest::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $this->adminUser->id, // Admin created request for themselves
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_starter_5',
            'plan_name' => 'باقة المشرف',
            'snapshot_price' => 300,
            'included_quota_rfqs' => 5,
            'expected_amount' => 300,
            'submitted_amount' => 300,
            'payment_method' => 'instapay',
            'transfer_reference' => 'SELF-ADMIN-REF',
            'receipt_file_path' => 'receipts/fake.png',
            'receipt_sha256' => hash('sha256', 'self_admin'),
            'status' => 'pending',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$selfReq->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'SelfApprovalForbidden');

        // 6 & 7 & 8. Approve valid payment, confirm requester package becomes active with correct quota
        $approveRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/approve");
        $approveRes->assertStatus(200)
            ->assertJsonPath('payment_request.status', 'approved');

        $sub = MarketplaceRequesterSubscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->first();
        $this->assertNotNull($sub);
        $this->assertEquals('active', $sub->status);
        $this->assertEquals(5, $sub->allowed_rfq_count);
        $this->assertEquals(0, $sub->consumed_rfq_count);

        // 9 & 10. Attempt to approve again -> idempotent block (400 AlreadyProcessed)
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/approve")
            ->assertStatus(400)
            ->assertJsonPath('error', 'AlreadyProcessed');

        $this->assertEquals(1, MarketplaceRequesterSubscription::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count());

        // 11. Test rejection without a reason -> 422
        $rejReq = SubscriptionPaymentRequest::withoutGlobalScopes()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_pro_15',
            'plan_name' => 'باقة 15 طلب',
            'snapshot_price' => 800,
            'included_quota_rfqs' => 15,
            'expected_amount' => 800,
            'submitted_amount' => 800,
            'payment_method' => 'bank_transfer',
            'transfer_reference' => 'REJ-REF-123',
            'receipt_file_path' => 'receipts/rej.png',
            'receipt_sha256' => hash('sha256', 'rej_hash'),
            'status' => 'pending',
        ]);

        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$rejReq->id}/reject")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);

        // 12. Test rejection with valid reason -> 200
        $rejRes = $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$rejReq->id}/reject", [
                'rejection_reason' => 'صورة التحويل غير واضحة ورقم المرجع غير مطابق لكشف الحساب.',
            ]);
        $rejRes->assertStatus(200)
            ->assertJsonPath('payment_request.status', 'rejected');

        // 13. Confirm rejected payment did NOT add extra quota
        $sub->refresh();
        $this->assertEquals(5, $sub->allowed_rfq_count);
    }

    /**
     * Journey C — Existing ERP Customer Buys Separate Requester Pack
     */
    public function test_journey_c_existing_erp_customer_purchases_requester_pack(): void
    {
        // 1. Existing Starter Factory
        $starterTenant = Tenant::create([
            'code' => 'STR-JC-01',
            'name' => 'مصنع الشباب للملابس الجاهزة',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);
        $this->subService->upgradeSubscription($starterTenant->id, 'starter');

        $user = User::create([
            'tenant_id' => $starterTenant->id,
            'name' => 'حسام فتحي',
            'email' => 'hossam@alshabab.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 2. Existing ERP access is intact
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/inventory/items')->assertStatus(200);
        $this->actingAs($user, 'sanctum')->getJson('/api/v1/tenant/profile')->assertStatus(200);

        // 3 & 4. Purchase separate Waslat Worsh requester package
        $receipt = UploadedFile::fake()->create('starter_requester_receipt.png', 250, 'image/png');
        $payRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/subscriptions/payment-requests', [
            'product_type' => 'waslat_worsh',
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-STARTER-4433',
            'submitted_amount' => 300,
            'receipt' => $receipt,
        ]);

        $payRes->assertStatus(201);
        $payReqId = $payRes->json('payment_request.id');

        // 5. Admin approves payment request
        $this->actingAs($this->adminUser, 'sanctum')
            ->postJson("/api/v1/platform-admin/subscription-requests/{$payReqId}/approve")
            ->assertStatus(200);

        // 6. Create and publish an RFQ
        $rfqRes = $this->actingAs($user, 'sanctum')->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب قص عبايات كاجوال',
            'service_type' => 'cutting',
            'target_quantity' => 400,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => false,
            'fabric_details' => ['fabric_type' => 'Linen'],
            'production_details' => ['size_breakdown' => ['XL' => 400]],
            'logistics' => ['pickup_governorate' => 'القاهرة', 'pickup_city' => 'العبور'],
        ]);
        $rfqRes->assertStatus(201);
        $rfqId = $rfqRes->json('rfq.id');

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish")
            ->assertStatus(200);

        $requesterSub = MarketplaceRequesterSubscription::withoutGlobalScopes()->where('tenant_id', $starterTenant->id)->first();
        $this->assertEquals(1, $requesterSub->consumed_rfq_count);

        // 7. Confirm this does NOT grant Enterprise provider eligibility
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/waslat-worsh/workshops', [
            'workshop_name' => 'محاولة ورشة من باقة ستارتير',
            'cutting_type' => 'straight_knife',
        ])->assertStatus(403);

        $this->actingAs($user, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/bids", [
            'unit_rate' => 15,
            'promised_lead_days' => 4,
        ])->assertStatus(403);

        // 8. Confirm existing ERP subscription remains intact (Starter)
        $this->assertEquals('starter', $starterTenant->fresh()->plan_tier);
    }

    /**
     * Journey D — Enterprise Provider Full Governance & Eligibility
     */
    public function test_journey_d_enterprise_provider_eligibility_and_governance(): void
    {
        // 1. Enterprise Factory
        $enterpriseTenant = Tenant::create([
            'code' => 'ENT-JD-01',
            'name' => 'مجمع النصر الصناعي للغزل والنسيج',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);
        $this->subService->upgradeSubscription($enterpriseTenant->id, 'enterprise');

        $enterpriseUser = User::create([
            'tenant_id' => $enterpriseTenant->id,
            'name' => 'م. حازم مدير الإنتاج',
            'email' => 'hazem@alnasr.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        // Seeker tenant with published RFQ
        $seekerTenant = Tenant::create([
            'code' => 'REQ-JD-02',
            'name' => 'براند كايرو ديزاين',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);
        $rfq = Rfq::withoutGlobalScopes()->create([
            'tenant_id' => $seekerTenant->id,
            'rfq_number' => 'RFQ-2026-JD-001',
            'title' => 'قص 2000 قطعة بنطلون جينز',
            'service_type' => 'cutting',
            'specifications' => 'قص هيدروليكي عالي الدقة',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(15)->toDateString(),
            'status' => 'published',
            'published_at' => now(),
        ]);

        // 2. Verified Workshop for Enterprise factory
        $workshop = $this->wwService->createWorkshopProfile([
            'tenant_id' => $enterpriseTenant->id,
            'workshop_name' => 'عنابر القص الآلي بمجمع النصر',
            'specialty_type' => 'cutting',
            'active_machines_count' => 12,
            'daily_capacity_pieces' => 10000,
            'governorate' => 'الغربية',
            'phone' => '01012341234',
            'contact_person' => 'م. حازم',
        ]);
        $workshop->is_verified = true;
        $workshop->save();

        // 3. Submit valid bid -> 201
        $bidRes = $this->actingAs($enterpriseUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 18.50,
            'promised_lead_days' => 7,
            'notes' => 'تنفيذ فوري مع تسليم مجدول',
        ]);

        $bidRes->assertStatus(201)
            ->assertJsonPath('bid.status', 'submitted');

        // 4. Factory cannot bid on its own RFQ -> 403 SelfBiddingForbidden
        $ownRfq = Rfq::withoutGlobalScopes()->create([
            'tenant_id' => $enterpriseTenant->id,
            'rfq_number' => 'RFQ-OWN-JD-002',
            'title' => 'طلب خاص بمجمع النصر',
            'service_type' => 'cutting',
            'specifications' => 'مواصفات داخلية',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'published',
            'published_at' => now(),
        ]);

        $this->actingAs($enterpriseUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$ownRfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 12.00,
            'promised_lead_days' => 5,
        ])->assertStatus(403)
            ->assertJsonPath('error', 'SelfBiddingForbidden');

        // 5. Enterprise factory without verified workshop cannot bid -> 403
        $unverifiedWorkshop = $this->wwService->createWorkshopProfile([
            'tenant_id' => $enterpriseTenant->id,
            'workshop_name' => 'ورشة تحت التجهيز',
            'specialty_type' => 'cutting',
            'governorate' => 'القاهرة',
            'phone' => '01099998888',
            'contact_person' => 'مسؤول المعاينة',
        ]);
        $unverifiedWorkshop->is_verified = false;
        $unverifiedWorkshop->save();

        $this->actingAs($enterpriseUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $unverifiedWorkshop->id,
            'unit_rate' => 15.00,
            'promised_lead_days' => 6,
        ])->assertStatus(403)
            ->assertJsonPath('error', 'WorkshopNotVerified');

        // 6. Suspended Enterprise tenant cannot bid -> 403
        $enterpriseTenant->status = 'suspended';
        $enterpriseTenant->save();

        $this->actingAs($enterpriseUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 18.50,
            'promised_lead_days' => 7,
        ])->assertStatus(403);

        $enterpriseTenant->status = 'active';
        $enterpriseTenant->save();

        // 7. Starter factory cannot bid -> 403
        $starterTenant = Tenant::create([
            'code' => 'STR-JD-03',
            'name' => 'ورشة صغيرة',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);
        $this->subService->upgradeSubscription($starterTenant->id, 'starter');
        $starterUser = User::create([
            'tenant_id' => $starterTenant->id,
            'name' => 'صاحب الورشة',
            'email' => 'starter_jd@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->actingAs($starterUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 14.00,
            'promised_lead_days' => 5,
        ])->assertStatus(403);

        // 8. Requester-only account cannot bid -> 403
        $requesterUser = User::create([
            'tenant_id' => $seekerTenant->id,
            'name' => 'صاحب البراند',
            'email' => 'seeker_jd@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->actingAs($requesterUser, 'sanctum')->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 14.00,
            'promised_lead_days' => 5,
        ])->assertStatus(403);
    }

    /**
     * Security: Duplicate receipt SHA256 detection
     */
    public function test_duplicate_receipt_sha256_is_prevented(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-DUP-01',
            'name' => 'ماركة ملابس',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'أحمد صاحب الماركة',
            'email' => 'ahmed_dup@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $receiptContent = 'EXACT_SAME_RECEIPT_IMAGE_CONTENT_BYTES_123456';
        $file1 = UploadedFile::fake()->createWithContent('receipt1.png', $receiptContent);
        $file2 = UploadedFile::fake()->createWithContent('receipt2.png', $receiptContent);

        // First upload succeeds
        $res1 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/subscriptions/payment-requests', [
            'product_type' => 'waslat_worsh',
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-REF-001',
            'submitted_amount' => 300,
            'receipt' => $file1,
        ]);
        $res1->assertStatus(201);

        // Second upload with same receipt content fails with 422
        $res2 = $this->actingAs($user, 'sanctum')->postJson('/api/v1/subscriptions/payment-requests', [
            'product_type' => 'waslat_worsh',
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-REF-002',
            'submitted_amount' => 300,
            'receipt' => $file2,
        ]);

        $res2->assertStatus(422)
            ->assertJsonPath('error', 'DuplicateReceipt');
    }
}

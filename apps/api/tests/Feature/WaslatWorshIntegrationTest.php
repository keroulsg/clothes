<?php

namespace Tests\Feature;

use App\Models\JobOrder;
use App\Models\MarketplaceCommission;
use App\Models\Rfq;
use App\Models\RfqBid;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WorkshopProfile;
use App\Models\WorkshopReview;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $seekerTenant;
    protected Tenant $providerTenant;
    protected User $seekerUser;
    protected User $providerUser;
    protected WaslatWorshService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seekerTenant = Tenant::create([
            'code' => 'SEEKER-TENANT',
            'name' => 'El-Nasr Garments (Seeker)',
            'domain' => 'elnasr.garmentos.test',
            'status' => 'active',
        ]);

        $this->providerTenant = Tenant::create([
            'code' => 'PROVIDER-TENANT',
            'name' => 'Al-Amal Sewing Workshop (Provider)',
            'domain' => 'alamal.garmentos.test',
            'status' => 'active',
        ]);

        $this->seekerUser = User::create([
            'tenant_id' => $this->seekerTenant->id,
            'name' => 'Seeker Manager',
            'email' => 'seeker@elnasr.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->providerUser = User::create([
            'tenant_id' => $this->providerTenant->id,
            'name' => 'Workshop Master',
            'email' => 'master@alamal.test',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->service = app(WaslatWorshService::class);
    }

    /**
     * 1. تسجيل ورشة جديدة في دليل المنصة واستعراضها
     */
    public function test_workshop_profile_registration_and_listing(): void
    {
        app()->instance('current_tenant_id', $this->providerTenant->id);

        $response = $this->actingAs($this->providerUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/workshops', [
                'workshop_name' => 'مشغل الأمل للخياطة والتطريز',
                'specialty_type' => 'full_cmt',
                'active_machines_count' => 15,
                'daily_capacity_pieces' => 300,
                'governorate' => 'القاهرة',
                'city' => 'مدينة نصر',
                'address' => 'المنطقة الصناعية السادسة',
                'phone' => '01012345678',
                'contact_person' => 'الأسطى محمود الأمل',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('workshop_profiles', [
            'workshop_name' => 'مشغل الأمل للخياطة والتطريز',
            'daily_capacity_pieces' => 300,
        ]);

        // استعراض الورش في الدليل
        $listRes = $this->actingAs($this->seekerUser, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/workshops?specialty_type=full_cmt');

        $listRes->assertStatus(200);
        $this->assertNotEmpty($listRes->json('data'));
        $this->assertEquals('مشغل الأمل للخياطة والتطريز', $listRes->json('data.0.workshop_name'));
    }

    /**
     * 2. إنشاء طلب عرض أسعار وتشغيل للغير (RFQ) وتوليد كود تلقائي
     */
    public function test_rfq_creation_with_unique_number_and_quota_check(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);

        $response = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'تشغيل 2000 قطعة قميص بولو رجالي صيفي',
                'service_type' => 'full_cmt',
                'specifications' => 'تجميع كامل، تطريز شعار الصدر، تركيب أزرار، مع توفير عينات أولية',
                'target_quantity' => 2000,
                'expected_delivery_date' => now()->addDays(20)->toDateString(),
                'max_budget_per_piece' => 25.00,
                'fabric_responsibility' => 'seeker_provided',
            ]);

        $response->assertStatus(201);
        $this->assertNotNull($response->json('rfq.rfq_number'));
        $this->assertEquals('open', $response->json('rfq.status'));
        $this->assertEquals(2000, $response->json('rfq.target_quantity'));
    }

    /**
     * 3. تقديم عرض سعر من ورشة لطلب تشغيل مفتوح
     */
    public function test_workshop_can_submit_bid_to_open_rfq(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);

        $rfq = $this->service->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل 1000 بنطلون جبردين',
            'service_type' => 'sewing',
            'specifications' => 'خياطة وتركيب سوست وجيوب',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(15)->toDateString(),
            'max_budget_per_piece' => 30.00,
        ]);

        $workshop = $this->service->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'ورشة الفرسان للملابس',
            'specialty_type' => 'sewing',
            'active_machines_count' => 12,
            'daily_capacity_pieces' => 250,
            'governorate' => 'الجيزة',
            'phone' => '01234567890',
            'contact_person' => 'عماد فتحي',
        ]);

        app()->instance('current_tenant_id', $this->providerTenant->id);

        $response = $this->actingAs($this->providerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
                'workshop_profile_id' => $workshop->id,
                'unit_rate' => 22.50,
                'promised_lead_days' => 10,
                'notes' => 'جاهزون للاستلام الفوري ومطابقة العينة المعتمدة.',
            ]);

        $response->assertStatus(201);
        $this->assertEquals(22.50, (float) $response->json('bid.unit_rate'));
        $this->assertEquals('submitted', $response->json('bid.status'));
    }

    /**
     * 4. منع تقديم أكثر من عرض لنفس الورشة على نفس الطلب
     */
    public function test_duplicate_bid_from_same_workshop_is_rejected(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);

        $rfq = $this->service->createRfq($this->seekerTenant->id, [
            'title' => 'تشغيل تيشيرتات',
            'service_type' => 'sewing',
            'specifications' => 'قص وخياطة',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
        ]);

        $workshop = $this->service->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'مشغل السلام',
            'specialty_type' => 'sewing',
            'phone' => '01111111111',
            'contact_person' => 'أحمد',
        ]);

        // العرض الأول: يمر بنجاح
        $this->service->submitBid($rfq->id, $workshop->id, [
            'unit_rate' => 18.00,
            'promised_lead_days' => 7,
        ]);

        // العرض الثاني من نفس الورشة: يجب أن يرفض
        $this->actingAs($this->providerUser, 'sanctum');
        $response = $this->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids", [
            'workshop_profile_id' => $workshop->id,
            'unit_rate' => 17.50,
            'promised_lead_days' => 6,
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('قدمت الورشة', $response->json('message'));
    }

    /**
     * 5. قبول وترسية العرض الفائز يحوله تلقائياً إلى أمر تشغيل رسمي JobOrder ويحتسب العمولة
     */
    public function test_bid_acceptance_converts_to_job_order_and_calculates_commission(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);

        $rfq = $this->service->createRfq($this->seekerTenant->id, [
            'title' => 'عقد تشغيل 3000 قطعة فستان أطفال',
            'service_type' => 'full_cmt',
            'specifications' => 'قص وتجميع وتطريز وتشطيب كامل',
            'target_quantity' => 3000,
            'expected_delivery_date' => now()->addDays(25)->toDateString(),
        ]);

        $workshop = $this->service->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'مشغل النجوم',
            'specialty_type' => 'full_cmt',
            'phone' => '01555555555',
            'contact_person' => 'طارق',
        ]);

        $bid = $this->service->submitBid($rfq->id, $workshop->id, [
            'unit_rate' => 35.00,
            'promised_lead_days' => 20,
        ]);

        // قبول العرض وترسيته بواسطة صاحب المصنع الباحث
        $response = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/bids/{$bid->id}/accept");

        $response->assertStatus(200);

        // 1. حالة الطلب أصبحت awarded وحالة العرض accepted
        $rfq->refresh();
        $bid->refresh();
        $this->assertEquals('awarded', $rfq->status);
        $this->assertEquals('accepted', $bid->status);

        // 2. أمر التشغيل تم إنشاؤه في جدول job_orders
        $this->assertNotNull($bid->converted_job_order_id);
        $jobOrder = JobOrder::find($bid->converted_job_order_id);
        $this->assertNotNull($jobOrder);
        $this->assertEquals($this->seekerTenant->id, $jobOrder->tenant_id);
        $this->assertEquals(3000, $jobOrder->total_target_quantity);
        $this->assertEquals(35.0, (float) $jobOrder->unit_rate);

        // 3. احتساب عمولة المنصة (3% من 105,000 = 3,150)
        $this->assertDatabaseHas('marketplace_commissions', [
            'rfq_id' => $rfq->id,
            'rfq_bid_id' => $bid->id,
            'gross_amount' => 105000,
            'commission_rate' => 3.00,
            'commission_amount' => 3150,
        ]);
    }

    /**
     * 6. تسجيل تقييم الورشة وإعادة احتساب متوسط التقييم التراكمي
     */
    public function test_workshop_review_submission_updates_rating_average(): void
    {
        app()->instance('current_tenant_id', $this->seekerTenant->id);

        $rfq = $this->service->createRfq($this->seekerTenant->id, [
            'title' => 'طلب تقييم ورشة',
            'service_type' => 'sewing',
            'specifications' => 'تفصيل',
            'target_quantity' => 100,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
        ]);

        $workshop = $this->service->createWorkshopProfile([
            'tenant_id' => $this->providerTenant->id,
            'workshop_name' => 'مشغل الدقة العالية',
            'specialty_type' => 'sewing',
            'phone' => '01000000000',
            'contact_person' => 'سعيد',
        ]);

        $response = $this->actingAs($this->seekerUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/reviews', [
                'rfq_id' => $rfq->id,
                'workshop_profile_id' => $workshop->id,
                'quality_rating' => 5,
                'timeliness_rating' => 4,
                'communication_rating' => 5,
                'review_notes' => 'التزام ممتاز بمواعيد التسليم وجودة الخياطة مطابقة للمواصفات القياسية.',
            ]);

        $response->assertStatus(201);

        $workshop->refresh();
        $this->assertEquals(1, $workshop->completed_jobs_count);
        $this->assertEquals(4.67, (float) $workshop->rating_average); // (5 + 4 + 5) / 3 = 4.67
    }
}

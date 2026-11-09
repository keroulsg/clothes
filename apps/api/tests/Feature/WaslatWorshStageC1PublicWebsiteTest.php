<?php

namespace Tests\Feature;

use App\Models\Rfq;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WaslatWorshStageC1PublicWebsiteTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionUsageService $subService;
    private WaslatWorshService $wwService;

    private Tenant $enterpriseTenant;
    private User $enterpriseUser;

    private Tenant $starterTenant;
    private User $starterUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subService = app(SubscriptionUsageService::class);
        $this->subService->seedDefaultPlans();
        $this->wwService = app(WaslatWorshService::class);

        // Enterprise Tenant
        $this->enterpriseTenant = Tenant::create([
            'code' => 'T-ENT-999',
            'name' => 'مصنع النخبة للأقمشة والقص',
            'domain' => 'nokhba.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
            'phone' => '01009998887',
            'email' => 'private@nokhba.test',
        ]);
        $this->subService->upgradeSubscription($this->enterpriseTenant->id, 'enterprise');

        $this->enterpriseUser = User::create([
            'tenant_id' => $this->enterpriseTenant->id,
            'name' => 'مدير مصنع النخبة',
            'email' => 'director@nokhba.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // Starter Tenant (Small workshop, not Enterprise)
        $this->starterTenant = Tenant::create([
            'code' => 'T-STR-111',
            'name' => 'مشغل البداية السريع',
            'domain' => 'starter.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'starter',
            'phone' => '01221110000',
            'email' => 'starter@small.test',
        ]);
        $this->subService->upgradeSubscription($this->starterTenant->id, 'starter');

        $this->starterUser = User::create([
            'tenant_id' => $this->starterTenant->id,
            'name' => 'صاحب مشغل البداية',
            'email' => 'owner@small.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        Storage::fake('local');
    }

    /**
     * 1. الزائر العام بدون تسجيل دخول يمكنه تصفح طلبات القص المنشورة
     */
    public function test_anonymous_visitor_can_browse_public_rfqs_without_auth(): void
    {
        // إنشاء طلب منشور
        $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب قص منشور متاح للعامة',
            'service_type' => 'cutting',
            'target_quantity' => 1200,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        // استدعاء من زائر مجهول بدون توكن أو هيدر تيننت
        $res = $this->getJson('/api/v1/waslat-worsh/public/rfqs');

        $res->assertStatus(200);
        $res->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'rfq_number',
                    'title',
                    'service_type',
                    'target_quantity',
                    'expected_delivery_date',
                    'location',
                    'attachments_indicator',
                    'published_at',
                ],
            ],
            'meta' => ['current_page', 'total'],
        ]);
        $this->assertGreaterThanOrEqual(1, count($res->json('data')));
    }

    /**
     * 2. القائمة العامة تستثني المسودات والطلبات الملغاة بشكل قاطع
     */
    public function test_public_listing_excludes_draft_and_cancelled_rfqs(): void
    {
        // 1. مسودة خاصة
        $draft = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'مسودة خاصة سرية جداً',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'publish' => false,
        ]);

        // 2. طلب منشور
        $published = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب معلن في السوق',
            'service_type' => 'cutting',
            'target_quantity' => 800,
            'expected_delivery_date' => now()->addDays(6)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        // 3. طلب ملغي
        $cancelled = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب ملغي من قبل صاحبه',
            'service_type' => 'cutting',
            'target_quantity' => 300,
            'expected_delivery_date' => now()->addDays(4)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);
        $this->wwService->cancelRfq($cancelled->id, $this->enterpriseTenant->id, 'تغيير الخطة');

        $res = $this->getJson('/api/v1/waslat-worsh/public/rfqs');
        $res->assertStatus(200);

        $ids = collect($res->json('data'))->pluck('id')->all();

        $this->assertContains($published->id, $ids);
        $this->assertNotContains($draft->id, $ids, 'Draft RFQ must never be in public listing');
        $this->assertNotContains($cancelled->id, $ids, 'Cancelled RFQ must never be in public listing');
    }

    /**
     * 3. الزائر العام يمكنه استعراض تفاصيل طلب منشور ببيانات آمنة
     */
    public function test_anonymous_visitor_can_view_public_safe_rfq_details(): void
    {
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'تشغيل صالة قص لـ 2000 قطعة قميص كاجوال',
            'model_name' => 'قميص صيفي 2026',
            'garment_category' => 'men',
            'service_type' => 'cutting',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
            'fabric_details' => [
                'fabric_type' => 'كتان مغسول',
                'fabric_width_cm' => 150,
            ],
            'production_details' => [
                'cutting_machine_preference' => 'cnc_automatic',
                'size_breakdown' => ['M' => 1000, 'L' => 1000],
            ],
            'logistics' => [
                'pickup_governorate' => 'الإسكندرية',
                'pickup_city' => 'برج العرب',
                'pickup_address_private' => 'مخزن خاص وسري ببرج العرب بلوك 5',
            ],
        ]);

        $res = $this->getJson("/api/v1/waslat-worsh/public/rfqs/{$rfq->id}");

        $res->assertStatus(200);
        $res->assertJsonPath('rfq.id', $rfq->id);
        $res->assertJsonPath('rfq.model_name', 'قميص صيفي 2026');
        $res->assertJsonPath('rfq.target_quantity', 2000);
        $res->assertJsonPath('rfq.location.pickup_governorate', 'الإسكندرية');
        $res->assertJsonPath('rfq.location.pickup_city', 'برج العرب');
    }

    /**
     * 4. محاولة الوصول المباشر لمعرف مسودة أو طلب ملغي تُرد برمز 404 آمن
     */
    public function test_direct_access_to_draft_or_cancelled_id_returns_404(): void
    {
        $draft = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'مسودة لا يجوز كشفها',
            'service_type' => 'cutting',
            'target_quantity' => 400,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'publish' => false,
        ]);

        $res = $this->getJson("/api/v1/waslat-worsh/public/rfqs/{$draft->id}");
        $res->assertStatus(404);
        $res->assertJsonFragment(['error' => 'NOT_FOUND']);
    }

    /**
     * 5. حجب العناوين الدقيقة وأرقام الهواتف والبريد ومعرفات التنت من كافة الردود العامة
     */
    public function test_public_responses_never_expose_private_addresses_phones_emails_or_tenant_ids(): void
    {
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب لاختبار حجب الخصوصية',
            'service_type' => 'cutting',
            'target_quantity' => 1500,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'العاشر من رمضان',
                'pickup_address_private' => 'عنوان خاص جداً بالمصنع الداخلي',
                'delivery_governorate' => 'القليوبية',
                'delivery_city' => 'العبور',
                'delivery_address_private' => 'مخزن العبور السري',
            ],
        ]);

        $res = $this->getJson("/api/v1/waslat-worsh/public/rfqs/{$rfq->id}");
        $res->assertStatus(200);

        $jsonStr = $res->getContent();

        // التأكد من عدم ورود النصوص الحساسة إطلاقاً في السلسلة النصية للرد
        $this->assertStringNotContainsString('عنوان خاص جداً بالمصنع الداخلي', $jsonStr);
        $this->assertStringNotContainsString('مخزن العبور السري', $jsonStr);
        $this->assertStringNotContainsString('01009998887', $jsonStr); // هاتف المصنع
        $this->assertStringNotContainsString('private@nokhba.test', $jsonStr); // بريد المصنع
        $this->assertStringNotContainsString($this->enterpriseTenant->id, $jsonStr); // معرف التنت
        $this->assertArrayNotHasKey('tenant_id', $res->json('rfq'));
        $this->assertArrayNotHasKey('pickup_address_private', $res->json('rfq.location'));
        $this->assertArrayNotHasKey('delivery_address_private', $res->json('rfq.location'));
    }

    /**
     * 6. مؤشرات المرفقات العامة لا تكشف مسارات التخزين الفيزيائية ولا روابط تحميل مباشرة
     */
    public function test_public_attachment_indicators_do_not_expose_storage_paths_or_download_urls(): void
    {
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب بمرفقات فنية',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $fakePdf = UploadedFile::fake()->create('tech_pack.pdf', 300, 'application/pdf');
        $this->wwService->uploadAttachment($rfq->id, $this->enterpriseTenant->id, $fakePdf, 'tech_spec');

        $res = $this->getJson("/api/v1/waslat-worsh/public/rfqs/{$rfq->id}");
        $res->assertStatus(200);

        $jsonStr = $res->getContent();

        $this->assertTrue($res->json('rfq.attachments_indicator.has_attachments'));
        $this->assertEquals(1, $res->json('rfq.attachments_indicator.count'));
        $this->assertContains('tech_spec', $res->json('rfq.attachments_indicator.types'));

        // حجب تام للمسارات الفيزيائية
        $this->assertStringNotContainsString('private/waslat_worsh', $jsonStr);
        $this->assertStringNotContainsString('storage_path', $jsonStr);
        $this->assertArrayNotHasKey('storage_path', $res->json('rfq.attachments_indicator'));
        $this->assertArrayNotHasKey('download_url', $res->json('rfq.attachments_indicator'));
    }

    /**
     * 7. الزائر العام لا يمكنه تحميل المرفقات الفنية الخاصة
     */
    public function test_anonymous_visitor_cannot_download_private_attachments(): void
    {
        $rfq = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب لفحص التحميل العام',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $fakePdf = UploadedFile::fake()->create('marker.dxf', 200, 'application/dxf');
        $att = $this->wwService->uploadAttachment($rfq->id, $this->enterpriseTenant->id, $fakePdf, 'marker_file');

        // محاولة تحميل بدون مصادقة
        $res = $this->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments/{$att['id']}");
        $this->assertTrue(in_array($res->status(), [400, 401, 403], true));
    }

    /**
     * 8. الزائر العام لا يمكنه طرح طلبات ولا تقديم عروض
     */
    public function test_anonymous_visitor_cannot_create_rfqs_or_submit_bids(): void
    {
        // محاولة طرح طلب
        $createRes = $this->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب غير مصرح به',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
        ]);
        $this->assertTrue(in_array($createRes->status(), [400, 401, 403], true));

        // محاولة تقديم عرض
        $bidRes = $this->postJson('/api/v1/waslat-worsh/rfqs/00000000-0000-0000-0000-000000000000/bids', [
            'unit_rate' => 15,
            'promised_lead_days' => 5,
        ]);
        $this->assertTrue(in_array($bidRes->status(), [400, 401, 403], true));
    }

    /**
     * 9. استمرار حظر باقات Starter و Pro من إنشاء طلبات أو عروض (حماية Stage B)
     */
    public function test_starter_and_pro_users_cannot_create_rfqs(): void
    {
        app()->instance('current_tenant_id', $this->starterTenant->id);

        $res = $this->actingAs($this->starterUser, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'محاولة اختراق من باقة Starter',
                'service_type' => 'cutting',
                'target_quantity' => 500,
                'expected_delivery_date' => now()->addDays(5)->toDateString(),
            ]);

        $res->assertStatus(403);
        $res->assertJsonFragment(['error_code' => 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED']);
    }

    /**
     * 10. حساب المؤشرات العامة من السجلات الحقيقية المؤهلة بدقة ودون أرقام وهمية
     */
    public function test_public_metrics_are_aggregated_from_real_eligible_records(): void
    {
        // في البداية: 0 طلبات منشورة
        $res0 = $this->getJson('/api/v1/waslat-worsh/public/metrics');
        $res0->assertStatus(200);
        $initialActive = $res0->json('active_rfqs_count');
        $initialPieces = $res0->json('total_target_pieces');

        // إضافة طلبين منشورين فعليين
        $rfq1 = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب 1',
            'service_type' => 'cutting',
            'garment_category' => 'men',
            'target_quantity' => 1500,
            'expected_delivery_date' => now()->addDays(6)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
            'logistics' => ['pickup_governorate' => 'القاهرة'],
        ]);

        $rfq2 = $this->wwService->createRfq($this->enterpriseTenant->id, [
            'title' => 'طلب 2',
            'service_type' => 'cutting',
            'garment_category' => 'women',
            'target_quantity' => 2500,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
            'logistics' => ['pickup_governorate' => 'الجيزة'],
        ]);

        $res1 = $this->getJson('/api/v1/waslat-worsh/public/metrics');
        $res1->assertStatus(200);

        $this->assertEquals($initialActive + 2, $res1->json('active_rfqs_count'));
        $this->assertEquals($initialPieces + 4000, $res1->json('total_target_pieces'));
        $this->assertGreaterThanOrEqual(2, $res1->json('governorates_count'));
    }
}


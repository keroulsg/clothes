<?php

namespace Tests\Feature;

use App\Models\GarmentModel;
use App\Models\Rfq;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionUsageService;
use App\Services\WaslatWorshService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WaslatWorshStageCCuttingRequestTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionUsageService $subService;
    private WaslatWorshService $wwService;

    private Tenant $tenantA; // Enterprise Requester
    private User $userA;

    private Tenant $tenantB; // Enterprise Provider
    private User $userB;

    private GarmentModel $garmentModel;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subService = app(SubscriptionUsageService::class);
        $this->subService->seedDefaultPlans();
        $this->wwService = app(WaslatWorshService::class);

        // Tenant A: Enterprise Requester
        $this->tenantA = Tenant::create([
            'code' => 'T-ENT-REQ',
            'name' => 'مصنع النيل للأزياء والملابس الجاهزة',
            'domain' => 'nile-fashion.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
            'phone' => '01012345678',
            'email' => 'contact@nile-fashion.test',
        ]);
        $this->subService->upgradeSubscription($this->tenantA->id, 'enterprise');

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير إنتاج مصنع النيل',
            'email' => 'production@nile-fashion.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        // Tenant B: Enterprise Provider (Cutting Workshop)
        $this->tenantB = Tenant::create([
            'code' => 'T-ENT-PRV',
            'name' => 'صالة الأهرام المتطورة للقص الآلي',
            'domain' => 'ahram-cutting.garmentos.test',
            'status' => 'active',
            'plan_tier' => 'enterprise',
            'phone' => '01198765432',
            'email' => 'info@ahram-cutting.test',
        ]);
        $this->subService->upgradeSubscription($this->tenantB->id, 'enterprise');

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير صالة الأهرام للقص',
            'email' => 'manager@ahram-cutting.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // ERP Garment Model for Tenant A
        $this->garmentModel = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-HD-2026',
            'name' => 'سويت شيرت هودي ميلتون قطن شتوي',
            'category' => 'men',
            'is_active' => true,
        ]);

        Storage::fake('local');
    }

    /**
     * 1. إنشاء مسودة طلب قص فني ببيانات ومواصفات كاملة
     */
    public function test_enterprise_tenant_can_create_cutting_request_draft_with_specifications(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $payload = [
            'title' => 'تشغيل صالة قص لـ 1,000 هودي ميلتون',
            'service_type' => 'cutting',
            'garment_model_id' => $this->garmentModel->id,
            'model_name' => $this->garmentModel->name,
            'garment_category' => 'men',
            'priority' => 'urgent',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'max_budget_per_piece' => 18.5,
            'fabric_responsibility' => 'seeker_provided',
            'publish' => false, // Save as Draft
            'fabric_details' => [
                'fabric_type' => 'قطن ميلتون 3 فتلة مبطن',
                'fabric_width_cm' => 185,
                'fabric_weight_gsm' => 320,
                'fabric_composition' => '100% قطن مصري',
                'fabric_quantity' => 450,
                'fabric_unit' => 'kg',
                'fabric_supplied_by_requester' => true,
                'fabric_notes' => 'يحتاج راحة 24 ساعة قبل الفرش',
            ],
            'production_details' => [
                'cutting_machine_preference' => 'cnc_automatic',
                'layers_per_spread' => 80,
                'marker_provided' => true,
                'sample_approved' => true,
                'size_breakdown' => [
                    'S' => 200,
                    'M' => 300,
                    'L' => 300,
                    'XL' => 200,
                ],
                'color_breakdown' => [
                    'أسود' => 600,
                    'رمادي' => 400,
                ],
                'special_cutting_instructions' => 'مراعاة اتجاه النسيج ووضع نوتش في منتصف الظهر',
            ],
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
                'pickup_address_private' => 'المخزن الرئيسي - بلوك 14 المنطقة الصناعية',
                'delivery_governorate' => 'القليوبية',
                'delivery_city' => 'شبرا الخيمة',
                'delivery_address_private' => 'صالة التجميع والخياطة - شارع 15 مايو',
                'transport_responsibility' => 'provider',
            ],
        ];

        $res = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', $payload);

        $res->assertStatus(201);
        $res->assertJsonPath('rfq.status', 'draft');
        $res->assertJsonPath('rfq.service_type', 'cutting');
        $res->assertJsonPath('rfq.target_quantity', 1000);
        $res->assertJsonPath('rfq.garment_model_id', $this->garmentModel->id);
        $this->assertNull($res->json('rfq.published_at'));

        $this->assertDatabaseHas('rfqs', [
            'id' => $res->json('rfq.id'),
            'tenant_id' => $this->tenantA->id,
            'status' => 'draft',
            'target_quantity' => 1000,
        ]);
    }

    /**
     * 2. رفض إنشاء طلب القص عند عدم تطابق مجموع المقاسات أو الألوان مع الكمية الإجمالية (422)
     */
    public function test_cutting_request_rejects_mismatched_size_or_color_breakdown(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        // مجموع المقاسات = 700 والكمية المطلوبة = 1000
        $invalidPayload = [
            'title' => 'طلب قص تجريبي بكمية غير متطابقة',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'production_details' => [
                'size_breakdown' => [
                    'S' => 200,
                    'M' => 300,
                    'L' => 200, // المجموع 700 != 1000
                ],
            ],
        ];

        $res = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/waslat-worsh/rfqs', $invalidPayload);

        $res->assertStatus(422);
        $res->assertJsonFragment([
            'error_code' => 'INVALID_QUANTITY_BREAKDOWN',
        ]);
    }

    /**
     * 3. صاحب المسودة يمكنه تحديث بياناتها ومواصفاتها الفنية بحرية
     */
    public function test_owner_can_update_draft_cutting_request(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'مسودة أولية للقص',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => false,
        ]);

        $updatePayload = [
            'title' => 'مسودة محدثة بعد تدقيق الباترون',
            'target_quantity' => 800,
            'expected_delivery_date' => now()->addDays(12)->toDateString(),
            'fabric_details' => [
                'fabric_type' => 'قطن جيرسي 200 جم',
                'fabric_width_cm' => 190,
            ],
            'production_details' => [
                'size_breakdown' => [
                    'M' => 400,
                    'L' => 400,
                ],
            ],
        ];

        $res = $this->actingAs($this->userA, 'sanctum')
            ->putJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}", $updatePayload);

        $res->assertStatus(200);
        $res->assertJsonPath('rfq.title', 'مسودة محدثة بعد تدقيق الباترون');
        $res->assertJsonPath('rfq.target_quantity', 800);

        $rfq->refresh();
        $this->assertEquals(800, $rfq->target_quantity);
        $this->assertEquals('قطن جيرسي 200 جم', $rfq->fabric_details['fabric_type']);
    }

    /**
     * 4. حظر تعديل الطلب إذا تم نشره أو إلغاؤه (يعدل في حالة المسودة فقط)
     */
    public function test_updating_published_or_cancelled_request_is_rejected(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'طلب منشور بالسوق',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $res = $this->actingAs($this->userA, 'sanctum')
            ->putJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}", [
                'title' => 'محاولة تعديل غير مسموح بها',
            ]);

        $res->assertStatus(422);
        $res->assertJsonFragment([
            'error_code' => 'RFQ_NOT_EDITABLE',
        ]);
    }

    /**
     * 5. حظر مستأجر آخر من تعديل مسودة ليست ملكه
     */
    public function test_non_owner_cannot_update_draft(): void
    {
        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'مسودة خاصة بمصنع النيل',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => false,
        ]);

        // Tenant B يحاول تعديل مسودة Tenant A
        app()->instance('current_tenant_id', $this->tenantB->id);

        $res = $this->actingAs($this->userB, 'sanctum')
            ->putJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}", [
                'title' => 'محاولة اختراق وتعديل',
            ]);

        $this->assertTrue(in_array($res->status(), [403, 404], true));
    }

    /**
     * 6. النشر الصريح للمسودة يسجل وقت النشر والموافقة على الشروط ويستهلك العداد
     */
    public function test_explicit_publication_records_timestamp_and_terms(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'مسودة جاهزة للنشر',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => false,
        ]);

        $this->assertEquals('draft', $rfq->status);
        $this->assertNull($rfq->published_at);

        // نشر المسودة مع الموافقة على الشروط
        $res = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/publish", [
                'accept_terms' => true,
            ]);

        $res->assertStatus(200);
        $res->assertJsonPath('rfq.status', 'published');
        $this->assertNotNull($res->json('rfq.published_at'));
        $this->assertNotNull($res->json('rfq.terms_accepted_at'));

        $rfq->refresh();
        $this->assertEquals('published', $rfq->status);
        $this->assertNotNull($rfq->published_at);
        $this->assertNotNull($rfq->terms_accepted_at);
    }

    /**
     * 7. خاصية Idempotency عند تكرار طلب النشر
     */
    public function test_publication_is_idempotent(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'مسودة لاختبار التكرار',
            'service_type' => 'cutting',
            'target_quantity' => 600,
            'expected_delivery_date' => now()->addDays(8)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $firstPubTime = $rfq->published_at;

        // استدعاء النشر مرة ثانية لنفس الطلب
        $res = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/publish", [
                'accept_terms' => true,
            ]);

        $res->assertStatus(200);
        $rfq->refresh();
        $this->assertEquals($firstPubTime->timestamp, $rfq->published_at->timestamp);
    }

    /**
     * 8. عزل المسودات: لا تظهر في قائمة السوق العامة ولا يمكن للمستأجرين الآخرين الاطلاع عليها
     */
    public function test_drafts_are_hidden_from_public_marketplace_and_other_tenants(): void
    {
        // Tenant A ينشئ مسودة
        app()->instance('current_tenant_id', $this->tenantA->id);
        $draft = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'مسودة سرية جداً لمصنع النيل',
            'service_type' => 'cutting',
            'target_quantity' => 2000,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
            'publish' => false,
        ]);

        // Tenant B يتصفح سوق العمليات
        app()->instance('current_tenant_id', $this->tenantB->id);
        $listRes = $this->actingAs($this->userB, 'sanctum')
            ->getJson('/api/v1/waslat-worsh/rfqs');

        $listRes->assertStatus(200);
        $data = $listRes->json('data');
        $found = collect($data)->firstWhere('id', $draft->id);
        $this->assertNull($found, 'Draft should not appear in marketplace exchange listing for other tenants');

        // Tenant B يحاول فتح تفاصيل المسودة مباشرة برقم الـ ID
        $detailRes = $this->actingAs($this->userB, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$draft->id}");

        $detailRes->assertStatus(404);
    }

    /**
     * 9. تشفير وإخفاء العناوين الدقيقة وبيانات الاتصال للطلبات المنشورة في السوق (Privacy Masking)
     */
    public function test_published_requests_mask_private_addresses_and_contact_for_non_owners(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'طلب منشور لاختبار الخصوصية',
            'service_type' => 'cutting',
            'target_quantity' => 1500,
            'expected_delivery_date' => now()->addDays(9)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
                'pickup_address_private' => 'عنوان سري خاص جداً بمخزن النيل',
                'delivery_governorate' => 'الجيزة',
                'delivery_city' => 'أكتوبر',
                'delivery_address_private' => 'عنوان المصنع الخاص بأكتوبر',
            ],
        ]);

        // Tenant B يستعرض الطلب المنشور
        app()->instance('current_tenant_id', $this->tenantB->id);
        $res = $this->actingAs($this->userB, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}");

        $res->assertStatus(200);
        $data = $res->json();

        // المحافظة والمدينة معلنة
        $this->assertEquals('القاهرة', $data['logistics']['pickup_governorate']);
        $this->assertEquals('مدينة نصر', $data['logistics']['pickup_city']);

        // العناوين الدقيقة محجوبة تماماً
        $this->assertNull($data['logistics']['pickup_address_private']);
        $this->assertNull($data['logistics']['delivery_address_private']);

        // بيانات الهاتف والبريد غير مسربة
        $this->assertArrayNotHasKey('phone', $data['tenant'] ?? []);
        $this->assertArrayNotHasKey('email', $data['tenant'] ?? []);
        $this->assertFalse($data['is_owner']);

        // في المقابل، Tenant A (صاحب الطلب) يرى العناوين كاملة
        app()->instance('current_tenant_id', $this->tenantA->id);
        $ownerRes = $this->actingAs($this->userA, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}");

        $ownerRes->assertStatus(200);
        $this->assertEquals('عنوان سري خاص جداً بمخزن النيل', $ownerRes->json('logistics.pickup_address_private'));
        $this->assertTrue($ownerRes->json('is_owner'));
    }

    /**
     * 10. رفع وتخزين المرفقات الفنية في مسار آمن وصلاحيات التحميل والحذف
     */
    public function test_technical_attachment_upload_storage_and_download_permissions(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'طلب قص بمرفقات فنية',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $fakePdf = UploadedFile::fake()->create('tech_pack_hoodie.pdf', 500, 'application/pdf');

        // رفع الملف
        $uploadRes = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments", [
                'file' => $fakePdf,
                'file_type' => 'tech_spec',
            ]);

        $uploadRes->assertStatus(201);
        $attachmentId = $uploadRes->json('attachment.id');
        $this->assertNotNull($attachmentId);
        $this->assertEquals('tech_pack_hoodie.pdf', $uploadRes->json('attachment.file_name'));

        // صاحب الطلب يمكنه تحميل المرفق
        $downloadOwnerRes = $this->actingAs($this->userA, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments/{$attachmentId}");

        $downloadOwnerRes->assertStatus(200);

        // مقدم خدمة مؤهل (Tenant B) في طلب منشور يمكنه تحميل المرفق الفني لدراسة العرض
        app()->instance('current_tenant_id', $this->tenantB->id);
        $downloadProviderRes = $this->actingAs($this->userB, 'sanctum')
            ->getJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments/{$attachmentId}");

        $downloadProviderRes->assertStatus(200);

        // حذف المرفق: Tenant B لا يملك صلاحية حذف مرفق Tenant A
        $deleteUnauthorizedRes = $this->actingAs($this->userB, 'sanctum')
            ->deleteJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments/{$attachmentId}");

        $this->assertTrue(in_array($deleteUnauthorizedRes->status(), [403, 404], true));

        // Tenant A يحذف مرفقه بنجاح
        app()->instance('current_tenant_id', $this->tenantA->id);
        $deleteRes = $this->actingAs($this->userA, 'sanctum')
            ->deleteJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/attachments/{$attachmentId}");

        $deleteRes->assertStatus(200);
        $rfq->refresh();
        $this->assertEmpty($rfq->attachments);
    }

    /**
     * 11. إلغاء الطلب من قبل المالك مع تسجيل السبب
     */
    public function test_owner_can_cancel_request_with_reason(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $rfq = $this->wwService->createRfq($this->tenantA->id, [
            'title' => 'طلب سيتم إلغاؤه',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'publish' => true,
            'accept_terms' => true,
        ]);

        $cancelRes = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/waslat-worsh/rfqs/{$rfq->id}/cancel", [
                'reason' => 'تم تأجيل موسم التشغيل وتعديل عينة القماش',
            ]);

        $cancelRes->assertStatus(200);
        $cancelRes->assertJsonPath('rfq.status', 'cancelled');

        $rfq->refresh();
        $this->assertEquals('cancelled', $rfq->status);
    }
}

<?php

namespace Tests\Feature;

use App\Models\MarketplaceRequesterSubscription;
use App\Models\Rfq;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WaslatWorshC5RfqQuotaAndPublicationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $requesterTenant;
    private User $requesterUser;
    private MarketplaceRequesterSubscription $requesterSub;

    protected function setUp(): void
    {
        parent::setUp();
        app(SubscriptionUsageService::class)->seedDefaultPlans();

        $this->requesterTenant = Tenant::create([
            'code' => 'REQ-C5-01',
            'name' => 'دار الموضة للطلبات',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $this->requesterUser = User::create([
            'tenant_id' => $this->requesterTenant->id,
            'name' => 'صاحب الماركة المستقل',
            'email' => 'requester_c5@garmentos.test',
            'password' => bcrypt('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $plan = SubscriptionPlan::where('code', 'ww_starter_5')->first();

        $this->requesterSub = MarketplaceRequesterSubscription::create([
            'tenant_id' => $this->requesterTenant->id,
            'plan_id' => $plan?->id,
            'plan_code' => 'ww_starter_5',
            'status' => 'active',
            'allowed_rfq_count' => 5,
            'consumed_rfq_count' => 0,
            'starts_at' => now(),
            'expires_at' => now()->addDays(90),
        ]);
    }

    public function test_draft_rfq_creation_succeeds_without_consuming_quota(): void
    {
        $response = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'قص 500 قطعة تيشرت بولو صيفي',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(14)->toDateString(),
            'max_budget_per_piece' => 12.50,
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => '100% Cotton Pique',
            ],
            'production_details' => [
                'size_breakdown' => [
                    'M' => 200,
                    'L' => 200,
                    'XL' => 100,
                ],
                'color_breakdown' => [
                    'Navy' => 250,
                    'White' => 250,
                ],
            ],
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('rfq.status', 'draft')
            ->assertJsonPath('rfq.target_quantity', 500);

        // التحقق من أن الحصة لم تُستهلك في حالة المسودة
        $this->requesterSub->refresh();
        $this->assertEquals(0, $this->requesterSub->consumed_rfq_count);
        $this->assertEquals(5, $this->requesterSub->remaining_rfq_count);
    }

    public function test_publishing_rfq_atomically_consumes_one_quota(): void
    {
        // 1. إنشاء مسودة
        $createRes = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب قص شورت جينز شبابي',
            'service_type' => 'cutting',
            'target_quantity' => 300,
            'expected_delivery_date' => now()->addDays(10)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Denim 12oz',
            ],
            'production_details' => [
                'size_breakdown' => [
                    '32' => 150,
                    '34' => 150,
                ],
            ],
            'logistics' => [
                'pickup_governorate' => 'الشرقية',
                'pickup_city' => 'العاشر من رمضان',
            ],
        ]);
        $rfqId = $createRes->json('rfq.id');

        // 2. نشر الطلب
        $publishRes = $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish");

        $publishRes->assertStatus(200)
            ->assertJsonPath('rfq.status', 'published');

        $this->requesterSub->refresh();
        $this->assertEquals(1, $this->requesterSub->consumed_rfq_count);
        $this->assertEquals(4, $this->requesterSub->remaining_rfq_count);

        // 3. تأكيد اللاتكرارية: إعادة النشر لا تستهلك حصة إضافية (Idempotent Publish)
        $republishRes = $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish");
        $republishRes->assertStatus(200);

        $this->requesterSub->refresh();
        $this->assertEquals(1, $this->requesterSub->consumed_rfq_count);
        $this->assertEquals(4, $this->requesterSub->remaining_rfq_count);
    }

    public function test_cancellation_of_published_rfq_does_not_refund_consumed_quota(): void
    {
        $createRes = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب للإلغاء لاحقاً',
            'service_type' => 'cutting',
            'target_quantity' => 100,
            'expected_delivery_date' => now()->addDays(7)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Cotton Twill',
            ],
            'production_details' => [
                'size_breakdown' => ['L' => 100],
            ],
            'logistics' => [
                'pickup_governorate' => 'الجيزة',
                'pickup_city' => 'الدقي',
            ],
        ]);
        $rfqId = $createRes->json('rfq.id');

        // النشر واستهلاك حصة
        $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish")->assertStatus(200);
        $this->assertEquals(1, $this->requesterSub->fresh()->consumed_rfq_count);

        // إلغاء الطلب
        $cancelRes = $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/cancel", [
            'reason' => 'تغيرت خطة الإنتاج للعميل',
        ]);

        $cancelRes->assertStatus(200)
            ->assertJsonPath('rfq.status', 'cancelled');

        // التأكد من عدم استرداد الحصة
        $this->assertEquals(1, $this->requesterSub->fresh()->consumed_rfq_count);
        $this->assertEquals(4, $this->requesterSub->fresh()->remaining_rfq_count);
    }

    public function test_publishing_fails_with_403_when_quota_is_exhausted(): void
    {
        // استهلاك كامل الحصة
        $this->requesterSub->update([
            'consumed_rfq_count' => 5,
        ]);

        $createRes = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب يتجاوز الحصة المسموحة',
            'service_type' => 'cutting',
            'target_quantity' => 100,
            'expected_delivery_date' => now()->addDays(12)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Fleece',
            ],
            'production_details' => [
                'size_breakdown' => ['XL' => 100],
            ],
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'المعادي',
            ],
        ]);
        $rfqId = $createRes->json('rfq.id');

        $publishRes = $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish");

        $publishRes->assertStatus(403)
            ->assertJsonPath('error', 'MarketplaceQuotaExhausted');
    }

    public function test_publishing_fails_with_403_when_subscription_is_expired(): void
    {
        $createRes = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب قبل انتهاء الاشتراك',
            'service_type' => 'cutting',
            'target_quantity' => 100,
            'expected_delivery_date' => now()->addDays(5)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Poplin',
            ],
            'production_details' => [
                'size_breakdown' => ['M' => 100],
            ],
            'logistics' => [
                'pickup_governorate' => 'الإسكندرية',
                'pickup_city' => 'برج العرب',
            ],
        ]);
        $rfqId = $createRes->json('rfq.id');

        // تنتهي صلاحية الاشتراك بعد إنشاء المسودة وقبل النشر
        $this->requesterSub->update([
            'expires_at' => now()->subDay(),
        ]);

        $publishRes = $this->actingAs($this->requesterUser)->postJson("/api/v1/waslat-worsh/rfqs/{$rfqId}/publish");

        $publishRes->assertStatus(403)
            ->assertJsonPath('error_code', 'WASLAT_WORSH_SUBSCRIPTION_REQUIRED');
    }

    public function test_size_breakdown_total_must_match_total_quantity_validation(): void
    {
        $response = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب بكميات مقاسات غير مطابقة',
            'service_type' => 'cutting',
            'target_quantity' => 1000,
            'expected_delivery_date' => now()->addDays(20)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Single Jersey',
            ],
            'production_details' => [
                'size_breakdown' => [
                    'S' => 300,
                    'M' => 400,
                ],
            ],
            'logistics' => [
                'pickup_governorate' => 'القاهرة',
                'pickup_city' => 'مدينة نصر',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'error_code' => 'INVALID_QUANTITY_BREAKDOWN',
            ]);
    }

    public function test_color_breakdown_total_must_match_total_quantity_validation(): void
    {
        $response = $this->actingAs($this->requesterUser)->postJson('/api/v1/waslat-worsh/rfqs', [
            'title' => 'طلب بألوان غير مطابقة للإجمالي',
            'service_type' => 'cutting',
            'target_quantity' => 500,
            'expected_delivery_date' => now()->addDays(15)->toDateString(),
            'publish' => false,
            'fabric_details' => [
                'fabric_type' => 'Single Jersey',
            ],
            'production_details' => [
                'size_breakdown' => [
                    'M' => 500,
                ],
                'color_breakdown' => [
                    'Black' => 200,
                    'White' => 100,
                ],
            ],
            'logistics' => [
                'pickup_governorate' => 'القليوبية',
                'pickup_city' => 'شبرا الخيمة',
            ],
        ]);

        $response->assertStatus(422)
            ->assertJsonFragment([
                'error_code' => 'INVALID_QUANTITY_BREAKDOWN',
            ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\FactorySubscription;
use App\Models\MarketplaceRequesterSubscription;
use App\Models\SubscriptionPaymentRequest;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WaslatWorshC3C4SubscriptionPaymentApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(\App\Services\SubscriptionUsageService::class)->seedDefaultPlans();
        Storage::fake('local');
    }

    public function test_public_can_list_active_waslat_worsh_packages(): void
    {
        $response = $this->getJson('/api/v1/waslat-worsh/subscription-plans');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'plans' => [
                    '*' => [
                        'id',
                        'code',
                        'product_category',
                        'name_ar',
                        'monthly_price',
                        'quota_rfq_count',
                        'is_active',
                    ],
                ],
                'payment_instructions' => [
                    'instapay_address',
                    'bank_name',
                    'account_number',
                ],
            ]);

        // تأكيد أن كافة الباقات المعادة تنتمي لـ waslat_worsh_requester
        $plans = $response->json('plans');
        $this->assertNotEmpty($plans);
        foreach ($plans as $p) {
            $this->assertEquals('waslat_worsh_requester', $p['product_category']);
            $this->assertGreaterThan(0, $p['quota_rfq_count']);
        }
    }

    public function test_customer_can_submit_payment_request_with_receipt_upload_and_immutable_snapshot(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-PAY01',
            'name' => 'طالب خدمة للتسديد',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'المسدد',
            'email' => 'payer@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $receiptFile = UploadedFile::fake()->create('instapay_proof.png', 500, 'image/png');

        $response = $this->actingAs($user)->postJson('/api/v1/subscriptions/payment-requests', [
            'plan_code' => 'ww_starter_5',
            'request_type' => 'initial',
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-REF-998877',
            'submitted_amount' => 300,
            'receipt' => $receiptFile,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('payment_request.status', 'pending')
            ->assertJsonPath('payment_request.product_type', 'waslat_worsh')
            ->assertJsonPath('payment_request.snapshot_price', '300.0000')
            ->assertJsonPath('payment_request.included_quota_rfqs', 5)
            ->assertJsonPath('payment_request.transfer_reference', 'INSTA-REF-998877');

        $this->assertDatabaseHas('subscription_payment_requests', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'plan_code' => 'ww_starter_5',
            'status' => 'pending',
            'transfer_reference' => 'INSTA-REF-998877',
        ]);
    }

    public function test_duplicate_receipt_hash_is_rejected(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-PAY02',
            'name' => 'مختبر التكرار',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'صاحب الإيصال',
            'email' => 'dup_receipt@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // إيصال ثابت بمحتوى متطابق لإنتاج نفس بصمة التجزئة SHA-256
        $fileContent = 'FIXED_RECEIPT_CONTENT_BYTES_FOR_HASHING_TEST';
        $receipt1 = UploadedFile::fake()->createWithContent('receipt_first.png', $fileContent);
        $receipt2 = UploadedFile::fake()->createWithContent('receipt_second.png', $fileContent);

        // الطلب الأول ينجح
        $this->actingAs($user)->postJson('/api/v1/subscriptions/payment-requests', [
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'REF-001',
            'submitted_amount' => 300,
            'receipt' => $receipt1,
        ])->assertStatus(201);

        // محاولة استخدام نفس ملف الإيصال مرة أخرى تُرفض برمز 422
        $response = $this->actingAs($user)->postJson('/api/v1/subscriptions/payment-requests', [
            'plan_code' => 'ww_starter_5',
            'payment_method' => 'instapay',
            'transfer_reference' => 'REF-002',
            'submitted_amount' => 300,
            'receipt' => $receipt2,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'DuplicateReceipt');
    }

    public function test_non_admin_cannot_approve_payment_or_view_receipt(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-PAY03',
            'name' => 'مستأجر عادي',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $regularUser = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مستخدم عادي',
            'email' => 'regular@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $payRequest = SubscriptionPaymentRequest::create([
            'tenant_id' => $tenant->id,
            'user_id' => $regularUser->id,
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_starter_5',
            'plan_name' => 'باقة تجريبية',
            'snapshot_price' => 300,
            'included_quota_rfqs' => 5,
            'expected_amount' => 300,
            'submitted_amount' => 300,
            'payment_method' => 'instapay',
            'transfer_reference' => 'REF-TEST',
            'receipt_file_path' => 'receipts/fake.png',
            'receipt_sha256' => hash('sha256', 'fake'),
            'status' => 'pending',
        ]);

        // محاولة غير المشرف استعراض الطابور
        $this->actingAs($regularUser)->getJson('/api/v1/platform-admin/subscription-requests')
            ->assertStatus(403);

        // محاولة غير المشرف معاينة الإيصال
        $this->actingAs($regularUser)->getJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/receipt")
            ->assertStatus(403);

        // محاولة غير المشرف اعتماد الطلب
        $this->actingAs($regularUser)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/approve")
            ->assertStatus(403);
    }

    public function test_self_approval_is_prevented_for_platform_admins(): void
    {
        $tenant = Tenant::create([
            'code' => 'ADM-TEN01',
            'name' => 'شركة المشرف',
            'status' => 'active',
        ]);

        $adminUser = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مشرف المنصة',
            'email' => 'admin_self@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        // طلب سداد قام المشرف بتقديمه لحسابه الشخصي
        $payRequest = SubscriptionPaymentRequest::create([
            'tenant_id' => $tenant->id,
            'user_id' => $adminUser->id,
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_starter_5',
            'plan_name' => 'باقة تجريبية',
            'snapshot_price' => 300,
            'included_quota_rfqs' => 5,
            'expected_amount' => 300,
            'submitted_amount' => 300,
            'payment_method' => 'instapay',
            'transfer_reference' => 'SELF-REF',
            'receipt_file_path' => 'receipts/fake.png',
            'receipt_sha256' => hash('sha256', 'fake_self'),
            'status' => 'pending',
        ]);

        // المشرف يحاول اعتماد طلبه الشخصي
        $response = $this->actingAs($adminUser)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/approve");

        $response->assertStatus(403)
            ->assertJsonPath('error', 'SelfApprovalForbidden');
    }

    public function test_admin_can_approve_payment_transactionally_activating_quota_and_audit(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-APP01',
            'name' => 'مصنع معتمد للاشتراك',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'طالب الخدمة المستحق',
            'email' => 'requester_pay@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $admin = User::create([
            'name' => 'مشرف الرقابة المالية',
            'email' => 'finance_admin@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $payRequest = SubscriptionPaymentRequest::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_starter_5',
            'plan_name' => 'باقة 5 طلبات قص',
            'snapshot_price' => 300,
            'included_quota_rfqs' => 5,
            'expected_amount' => 300,
            'submitted_amount' => 300,
            'payment_method' => 'instapay',
            'transfer_reference' => 'INSTA-CONFIRMED-123',
            'receipt_file_path' => 'receipts/test.png',
            'receipt_sha256' => hash('sha256', 'unique_receipt'),
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('payment_request.status', 'approved');

        $this->assertDatabaseHas('subscription_payment_requests', [
            'id' => $payRequest->id,
            'status' => 'approved',
            'reviewed_by' => $admin->id,
        ]);

        $this->assertDatabaseHas('marketplace_requester_subscriptions', [
            'tenant_id' => $tenant->id,
            'status' => 'active',
            'allowed_rfq_count' => 5,
            'consumed_rfq_count' => 0,
        ]);

        // تأكيد اللاتكرارية: محاولة اعتماد الطلب المعتمد مسبقاً مرة أخرى تُرد برمز 400
        $this->actingAs($admin)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/approve")
            ->assertStatus(400)
            ->assertJsonPath('error', 'AlreadyProcessed');
    }

    public function test_rejection_requires_valid_reason_and_updates_status(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-REJ01',
            'name' => 'طالب مرفوض التحويل',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'المقدم',
            'email' => 'rejected_payer@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $admin = User::create([
            'name' => 'مشرف الرفض',
            'email' => 'reject_admin@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $payRequest = SubscriptionPaymentRequest::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'product_type' => 'waslat_worsh',
            'request_type' => 'initial',
            'plan_code' => 'ww_starter_5',
            'plan_name' => 'باقة 5 طلبات قص',
            'snapshot_price' => 300,
            'included_quota_rfqs' => 5,
            'expected_amount' => 300,
            'submitted_amount' => 300,
            'payment_method' => 'instapay',
            'transfer_reference' => 'INVALID-REF',
            'receipt_file_path' => 'receipts/test.png',
            'receipt_sha256' => hash('sha256', 'rejected_receipt'),
            'status' => 'pending',
        ]);

        // الرفض بدون سبب يُرد بـ 422
        $this->actingAs($admin)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['rejection_reason']);

        // الرفض بسبب معتمد
        $this->actingAs($admin)->postJson("/api/v1/platform-admin/subscription-requests/{$payRequest->id}/reject", [
            'rejection_reason' => 'رقم التحويل المرفق غير مطابق لبيانات الحساب البنكي.',
        ])->assertStatus(200);

        $this->assertDatabaseHas('subscription_payment_requests', [
            'id' => $payRequest->id,
            'status' => 'rejected',
            'rejection_reason' => 'رقم التحويل المرفق غير مطابق لبيانات الحساب البنكي.',
        ]);
    }

    public function test_immediate_unpaid_upgrade_endpoint_returns_402_payment_required(): void
    {
        $tenant = Tenant::create([
            'code' => 'MFG-UP01',
            'name' => 'مصنع يرغب بالترقية',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'صاحب المصنع',
            'email' => 'upgrader@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // محاولة استدعاء الترقية الفورية القديمة
        $response = $this->actingAs($user)->postJson('/api/v1/subscription/upgrade', [
            'plan_code' => 'enterprise',
        ]);

        $response->assertStatus(402)
            ->assertJsonPath('status', 'payment_required')
            ->assertJsonPath('action_required', 'submit_payment_proof');

        // التأكد من أن باقة المستأجر لم تتغير ولا زالت starter
        $this->assertEquals('starter', $tenant->fresh()->plan_tier);
    }
}

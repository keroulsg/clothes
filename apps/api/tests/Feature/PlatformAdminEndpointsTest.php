<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformAdminEndpointsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $hostTenant;
    private User $platformAdmin;
    private Tenant $tenant;
    private User $tenantOwner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->hostTenant = Tenant::create([
            'code' => 'PLATFORM-ROOT',
            'name' => 'GarmentOS Platform Root',
            'subdomain' => 'root-admin',
            'status' => 'active',
            'plan_tier' => 'enterprise',
        ]);

        $this->platformAdmin = User::create([
            'tenant_id' => $this->hostTenant->id,
            'name' => 'المشرف العام للمنصة',
            'email' => 'admin@garmentos.test',
            'password' => bcrypt('AdminSecret123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $this->tenant = Tenant::create([
            'code' => 'MFG-TEST-01',
            'name' => 'مصنع الأمل للملابس',
            'subdomain' => 'alamal-factory',
            'status' => 'trial',
            'plan_tier' => 'professional',
        ]);

        $this->tenantOwner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'صاحب المصنع',
            'email' => 'owner@alamal.test',
            'password' => bcrypt('OwnerSecret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    public function test_unauthenticated_request_to_platform_overview_is_denied(): void
    {
        $response = $this->getJson('/api/v1/platform-admin/overview');
        $response->assertStatus(401);
    }

    public function test_tenant_owner_cannot_access_platform_overview(): void
    {
        Sanctum::actingAs($this->tenantOwner);

        $response = $this->getJson('/api/v1/platform-admin/overview');
        $response->assertStatus(403);
        $response->assertJson(['error' => 'PlatformAdminOnly']);
    }

    public function test_platform_admin_can_retrieve_platform_overview_metrics(): void
    {
        Sanctum::actingAs($this->platformAdmin);

        $response = $this->getJson('/api/v1/platform-admin/overview');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'metrics' => [
                'total_tenants',
                'active_tenants',
                'trial_tenants',
                'suspended_tenants',
                'total_users',
                'tier_counts' => ['starter', 'professional', 'enterprise'],
            ],
            'recent_audits',
            'timestamp',
        ]);

        $this->assertGreaterThanOrEqual(2, $response->json('metrics.total_tenants'));
        $this->assertEquals(1, $response->json('metrics.trial_tenants'));
    }

    public function test_platform_admin_can_list_and_search_tenants(): void
    {
        Sanctum::actingAs($this->platformAdmin);

        $response = $this->getJson('/api/v1/platform-admin/tenants?search=الأمل');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $this->assertEquals($this->tenant->id, $response->json('data.0.id'));
    }

    public function test_platform_admin_can_view_specific_tenant_details(): void
    {
        Sanctum::actingAs($this->platformAdmin);

        $response = $this->getJson("/api/v1/platform-admin/tenants/{$this->tenant->id}");
        $response->assertStatus(200);
        $response->assertJsonPath('tenant.id', $this->tenant->id);
        $response->assertJsonPath('tenant.name', $this->tenant->name);
    }

    public function test_platform_admin_can_suspend_tenant_with_audit_trail(): void
    {
        Sanctum::actingAs($this->platformAdmin);

        $response = $this->postJson("/api/v1/platform-admin/tenants/{$this->tenant->id}/suspend", [
            'reason' => 'عدم سداد مستحقات الاشتراك بعد انتهاء الفترة التجريبية',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('status', 'suspended');

        $this->tenant->refresh();
        $this->assertEquals('suspended', $this->tenant->status);

        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->platformAdmin->id,
            'action' => 'admin_suspend_tenant',
        ]);
    }

    public function test_platform_admin_can_retrieve_audit_logs(): void
    {
        AuditLog::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->platformAdmin->id,
            'action' => 'admin_test_action',
            'auditable_type' => Tenant::class,
            'auditable_id' => $this->tenant->id,
            'ip_address' => '127.0.0.1',
        ]);

        Sanctum::actingAs($this->platformAdmin);

        $response = $this->getJson('/api/v1/platform-admin/audit-logs');
        $response->assertStatus(200);
        $response->assertJsonStructure(['data', 'total', 'per_page']);
        $this->assertGreaterThanOrEqual(1, $response->json('total'));
    }

    public function test_public_contact_form_validates_and_accepts_inquiries(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'م. حازم القاضي',
            'email' => 'hazem@textile-factory.com',
            'phone' => '01012345678',
            'company_name' => 'مصنع القاضي للغزل والنسيج',
            'subject' => 'طلب عرض أسعار لباقة المصانع الكبرى',
            'message' => 'نود الاستفسار عن إمكانية ربط أجهزة الباركود ومحطات فحص الجودة في صالة القص.',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
    }

    public function test_public_contact_form_rejects_invalid_email_and_short_message(): void
    {
        $response = $this->postJson('/api/v1/public/contact', [
            'name' => 'مستخدم',
            'email' => 'invalid-email',
            'message' => 'قصير',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['email', 'message']);
    }
}

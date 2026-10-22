<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformAdminAndRbacPhase02BTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $superAdmin;
    protected User $ownerA;
    protected User $accountantA;
    protected User $prodManagerA;
    protected User $qcUserA;
    protected User $workerA;
    protected User $ownerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-QA-01',
            'name' => 'شركة النيل للملابس - اختبار',
            'subdomain' => 'nile-test',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-QA-02',
            'name' => 'مصنع الدلتا للملابس - اختبار',
            'subdomain' => 'delta-test',
            'status' => 'active',
            'plan_tier' => 'starter',
        ]);

        $this->superAdmin = User::create([
            'name' => 'مشرف المنصة العام',
            'email' => 'superadmin@garmentos.test',
            'role' => 'platform_admin',
            'tenant_id' => null,
            'password' => bcrypt('AdminPass123!'),
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'name' => 'مالك النيل',
            'email' => 'owner@nile-test.com',
            'role' => 'company_owner',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->accountantA = User::create([
            'name' => 'محاسب النيل',
            'email' => 'acct@nile-test.com',
            'role' => 'financial_accountant',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->prodManagerA = User::create([
            'name' => 'مدير إنتاج النيل',
            'email' => 'prod@nile-test.com',
            'role' => 'production_manager',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->qcUserA = User::create([
            'name' => 'مفتش جودة النيل',
            'email' => 'qc@nile-test.com',
            'role' => 'quality_controller',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->workerA = User::create([
            'name' => 'عامل تشغيل النيل',
            'email' => 'worker@nile-test.com',
            'role' => 'worker',
            'tenant_id' => $this->tenantA->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'name' => 'مالك الدلتا',
            'email' => 'owner@delta-test.com',
            'role' => 'company_owner',
            'tenant_id' => $this->tenantB->id,
            'password' => bcrypt('Pass123!'),
            'is_active' => true,
        ]);
    }

    /**
     * 1. حظر غير المصرح لهم من مسارات إدارة المنصة العليا
     */
    public function test_unauthenticated_and_tenant_users_cannot_access_platform_admin_overview(): void
    {
        // Unauthenticated
        $this->getJson('/api/v1/platform-admin/overview')->assertStatus(401);

        // Factory Owner
        Sanctum::actingAs($this->ownerA);
        $this->getJson('/api/v1/platform-admin/overview')->assertStatus(403);

        // Accountant
        Sanctum::actingAs($this->accountantA);
        $this->getJson('/api/v1/platform-admin/overview')->assertStatus(403);

        // Worker
        Sanctum::actingAs($this->workerA);
        $this->getJson('/api/v1/platform-admin/overview')->assertStatus(403);
    }

    /**
     * 2. وصول المشرف العام إلى لوحة تحكم المنصة وقراءة مؤشرات النظام الحقيقية
     */
    public function test_super_admin_can_access_overview_and_system_health(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $overviewRes = $this->getJson('/api/v1/platform-admin/overview');
        $overviewRes->assertStatus(200)
            ->assertJsonStructure([
                'metrics' => ['total_tenants', 'active_tenants', 'total_users', 'tier_counts'],
                'recent_audits',
            ]);

        $healthRes = $this->getJson('/api/v1/platform-admin/system-health');
        $healthRes->assertStatus(200)
            ->assertJsonPath('database.status', 'healthy')
            ->assertJsonPath('multi_tenancy.fail_closed', true)
            ->assertJsonStructure(['counts' => ['tenants', 'users', 'audit_logs']]);
    }

    /**
     * 3. المشرف العام يمكنه تجميد وإعادة تفعيل حساب مستأجر مع تسجيل الرقابة
     */
    public function test_super_admin_can_suspend_and_reactivate_tenant(): void
    {
        Sanctum::actingAs($this->superAdmin);

        // Suspend
        $suspendRes = $this->postJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/suspend", [
            'reason' => 'عدم سداد الفاتورة الشهرية المستحقة',
        ]);
        $suspendRes->assertStatus(200)->assertJsonPath('status', 'suspended');
        $this->assertEquals('suspended', $this->tenantA->fresh()->status);

        // Reactivate
        $reactivateRes = $this->postJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/reactivate");
        $reactivateRes->assertStatus(200)->assertJsonPath('status', 'active');
        $this->assertEquals('active', $this->tenantA->fresh()->status);

        // Check Audit Log
        $this->assertTrue(
            AuditLog::withoutGlobalScopes()
                ->where('tenant_id', $this->tenantA->id)
                ->where('action', 'admin_reactivate_tenant')
                ->exists()
        );
    }

    /**
     * 4. المشرف العام يمكنه تحديث باقة اشتراك الشركة
     */
    public function test_super_admin_can_update_tenant_plan_tier(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->putJson("/api/v1/platform-admin/tenants/{$this->tenantA->id}/plan", [
            'plan_tier' => 'enterprise',
        ]);

        $res->assertStatus(200)->assertJsonPath('tenant.plan_tier', 'enterprise');
        $this->assertEquals('enterprise', $this->tenantA->fresh()->plan_tier);
    }

    /**
     * 5. المشرف العام يمكنه استعراض دليل مستخدمي المنصة
     */
    public function test_super_admin_can_list_platform_users(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->getJson('/api/v1/platform-admin/users');
        $res->assertStatus(200)->assertJsonStructure(['data', 'total', 'current_page']);
        $this->assertGreaterThanOrEqual(7, $res->json('total'));
    }

    /**
     * 6. فصل صريح: المشرف العام محظور من تنفيذ العمليات التشغيلية للمستأجر
     */
    public function test_super_admin_blocked_from_tenant_level_operations(): void
    {
        Sanctum::actingAs($this->superAdmin);

        $res = $this->postJson('/api/v1/purchase-orders', [
            'supplier_id' => '01a14f55-0000-0000-0000-000000000001',
            'warehouse_id' => '01a14f55-0000-0000-0000-000000000002',
            'items' => [],
        ]);

        $res->assertStatus(403);
        $this->assertTrue(in_array($res->json('error'), ['TenantContextMissing', 'UnauthorizedRole'], true));
    }

    /**
     * 7. المحاسب ومالك الشركة مصرح لهما باعتماد أوامر الشراء، بينما العامل محظور
     */
    public function test_role_enforcement_for_purchase_orders(): void
    {
        // Worker is forbidden
        Sanctum::actingAs($this->workerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->postJson('/api/v1/purchase-orders', [])->assertStatus(403);
        $this->postJson('/api/v1/purchase-orders/PO-FAKE-01/approve')->assertStatus(403);
    }

    /**
     * 8. مفتش الجودة مصرح له بتسجيل فحوص الجودة، بينما العامل والمحاسب محظوران
     */
    public function test_role_enforcement_for_quality_inspections(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Worker is forbidden
        Sanctum::actingAs($this->workerA);
        $this->postJson('/api/v1/quality-inspections', [])->assertStatus(403);

        // Accountant is forbidden
        Sanctum::actingAs($this->accountantA);
        $this->postJson('/api/v1/quality-inspections', [])->assertStatus(403);
    }

    /**
     * 9. المحاسب مصرح له بإنشاء قيود اليومية ومسيرات الرواتب
     */
    public function test_accountant_can_access_accounting_endpoints(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Worker cannot generate payroll
        Sanctum::actingAs($this->workerA);
        $this->postJson('/api/v1/hr/payrolls/generate', [])->assertStatus(403);

        // Production manager cannot generate payroll
        Sanctum::actingAs($this->prodManagerA);
        $this->postJson('/api/v1/hr/payrolls/generate', [])->assertStatus(403);
    }
}

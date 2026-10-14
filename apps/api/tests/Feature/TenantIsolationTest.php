<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * اختبار: تسجيل شركة ومصنع جديد بنجاح وإنشاء فرعه ومستخدمه
     */
    public function test_can_register_new_company_with_main_branch(): void
    {
        $payload = [
            'company_name' => 'مصنع النيل لملابس الأطفال',
            'subdomain' => 'nile-kids',
            'owner_name' => 'أحمد إبراهيم',
            'email' => 'ahmed@nilekids.com',
            'password' => 'Password123#',
            'phone' => '+201001234567',
            'plan_tier' => 'professional',
        ];

        $response = $this->postJson('/api/v1/auth/register-company', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('tenant.name', 'مصنع النيل لملابس الأطفال')
            ->assertJsonPath('tenant.subdomain', 'nile-kids')
            ->assertJsonPath('main_branch.name', 'المصنع الرئيسي');

        $this->assertDatabaseHas('tenants', [
            'name' => 'مصنع النيل لملابس الأطفال',
            'subdomain' => 'nile-kids',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'ahmed@nilekids.com',
            'role' => 'company_owner',
        ]);
    }

    /**
     * اختبار أمان حرج: شركة A لا تستطيع رؤية فروع شركة B في الاستعلامات
     */
    public function test_tenant_a_cannot_view_tenant_b_branches(): void
    {
        // 1. إنشاء شركة A مع فرعين
        $tenantA = Tenant::create([
            'code' => 'TENANT-A',
            'name' => 'شركة ملابس الأمل',
            'subdomain' => 'alamal',
        ]);

        $branchA1 = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $tenantA->id,
            'name' => 'مخزن الأقمشة - الأمل',
            'code' => 'AMAL-FABRIC',
            'type' => 'warehouse',
        ]);

        // 2. إنشاء شركة B مع فرع
        $tenantB = Tenant::create([
            'code' => 'TENANT-B',
            'name' => 'مصنع البركة للتريكو',
            'subdomain' => 'albaraka',
        ]);

        $branchB1 = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'صالة القص - البركة',
            'code' => 'BARAKA-CUT',
            'type' => 'factory',
        ]);

        // 3. ربط سياق النظام بالشركة A
        app()->instance('current_tenant_id', $tenantA->id);

        $branchesForA = Branch::all();

        // يجب أن يرى فروع شركة A فقط
        $this->assertCount(1, $branchesForA);
        $this->assertEquals($branchA1->id, $branchesForA->first()->id);
        $this->assertFalse($branchesForA->contains('id', $branchB1->id));

        // 4. التبديل للشركة B
        app()->instance('current_tenant_id', $tenantB->id);
        $branchesForB = Branch::all();

        $this->assertCount(1, $branchesForB);
        $this->assertEquals($branchB1->id, $branchesForB->first()->id);
        $this->assertFalse($branchesForB->contains('id', $branchA1->id));
    }

    /**
     * اختبار أمان حرج: محاولة قراءة فرع شركة أخرى مباشرة بالـ ID يرفضها النظام
     */
    public function test_tenant_a_cannot_access_tenant_b_branch_by_direct_id(): void
    {
        $tenantA = Tenant::create([
            'code' => 'TENANT-A2',
            'name' => 'شركة زهور الأطفال',
            'subdomain' => 'zohoor',
        ]);

        $tenantB = Tenant::create([
            'code' => 'TENANT-B2',
            'name' => 'شركة أزياء الصغار',
            'subdomain' => 'azyaa',
        ]);

        $branchOfB = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'المخزن الرئيسي لشركة ب',
            'code' => 'B-MAIN',
            'type' => 'warehouse',
        ]);

        // محاولة جلب فرع شركة B أثناء تشغيل سياق الشركة A
        app()->instance('current_tenant_id', $tenantA->id);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);
        Branch::findOrFail($branchOfB->id);
    }

    /**
     * اختبار أمان حرج: منع التلاعب بهيدر X-Tenant-ID لمحاولة التسلل بين الشركات (IDOR)
     */
    public function test_cross_tenant_header_tampering_is_blocked(): void
    {
        $tenantA = Tenant::create([
            'code' => 'TEN-ALPHA',
            'name' => 'شركة ألفا',
            'subdomain' => 'alpha',
        ]);

        $tenantB = Tenant::create([
            'code' => 'TEN-BETA',
            'name' => 'شركة بيتا',
            'subdomain' => 'beta',
        ]);

        $userOfTenantA = User::create([
            'tenant_id' => $tenantA->id,
            'name' => 'محمود علي',
            'email' => 'mahmoud@alpha.com',
            'password' => bcrypt('password'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // المستخدم محمود يحاول طلب بيانات ويرسل هيدر شركة بيتا
        $response = $this->actingAs($userOfTenantA)
            ->withHeaders(['X-Tenant-ID' => $tenantB->id])
            ->getJson('/api/v1/branches');

        $response->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');
    }
}

<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Tests\TestCase;

class WaslatWorshC2RequesterIdentityTest extends TestCase
{
    use RefreshDatabase;

    public function test_independent_requester_can_register_successfully(): void
    {
        $payload = [
            'name' => 'أحمد الشاذلي - مصمم ومشتري',
            'email' => 'requester@garmentos.test',
            'password' => 'Secret123456!',
            'phone' => '01011122233',
            'brand_name' => 'براند الشاذلي كوتور',
        ];

        $response = $this->postJson('/api/v1/auth/register-requester', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('tenant.tenant_type', 'marketplace_requester')
            ->assertJsonPath('tenant.name', 'براند الشاذلي كوتور')
            ->assertJsonPath('user.email', 'requester@garmentos.test')
            ->assertJsonStructure([
                'token',
                'access_token',
                'tenant' => ['id', 'code', 'name', 'tenant_type', 'status'],
                'user' => ['id', 'name', 'email', 'role', 'tenant_id'],
            ]);

        $this->assertDatabaseHas('tenants', [
            'name' => 'براند الشاذلي كوتور',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('users', [
            'email' => 'requester@garmentos.test',
            'name' => 'أحمد الشاذلي - مصمم ومشتري',
        ]);

        $this->assertDatabaseHas('marketplace_requester_subscriptions', [
            'plan_code' => 'ww_starter_5',
            'status' => 'pending_approval',
            'allowed_rfq_count' => 0,
        ]);
    }

    public function test_duplicate_email_registration_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'duplicate@garmentos.test',
        ]);

        $payload = [
            'name' => 'مستخدم مكرر',
            'email' => 'duplicate@garmentos.test',
            'password' => 'Secret123456!',
        ];

        $response = $this->postJson('/api/v1/auth/register-requester', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_requester_can_login_and_receives_marketplace_requester_tenant_type(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-TEST01',
            'name' => 'علامة تجارية مستقلة',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'طالب خدمة معتمد',
            'email' => 'login_req@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login_req@garmentos.test',
            'password' => 'Secret123456!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('tenant.tenant_type', 'marketplace_requester')
            ->assertJsonPath('tenant.id', $tenant->id);
    }

    public function test_requester_cannot_access_erp_modules_or_create_workshops(): void
    {
        $tenant = Tenant::create([
            'code' => 'REQ-TEST02',
            'name' => 'علامة تجارية مستقلة 2',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'طالب خدمة محظور من ERP',
            'email' => 'req_erp_blocked@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 1. محاولة دخول فروع المصنع (ERP Branches)
        $erpBranchResponse = $this->actingAs($user)->getJson('/api/v1/branches');
        $erpBranchResponse->assertStatus(403)
            ->assertJsonPath('error', 'ERP_ACCESS_DENIED');

        // 2. محاولة دخول مخازن المصنع (ERP Warehouses)
        $erpWhResponse = $this->actingAs($user)->getJson('/api/v1/warehouses');
        $erpWhResponse->assertStatus(403)
            ->assertJsonPath('error', 'ERP_ACCESS_DENIED');

        // 3. محاولة إنشاء ملف ورشة تصنيع (Workshops creation blocked for requesters)
        $workshopResponse = $this->actingAs($user)->postJson('/api/v1/waslat-worsh/workshops', [
            'workshop_name' => 'ورشة وهمية من حساب طالب',
            'specialty_type' => 'cutting',
            'governorate' => 'القاهرة',
            'city' => 'مدينة نصر',
        ]);
        $workshopResponse->assertStatus(403);
    }

    public function test_existing_erp_factory_login_and_tenant_type_remain_intact(): void
    {
        $factoryTenant = Tenant::create([
            'code' => 'MFG-ERP01',
            'name' => 'مصنع الدلتا للملابس',
            'tenant_type' => 'factory',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $factoryUser = User::create([
            'tenant_id' => $factoryTenant->id,
            'name' => 'صاحب مصنع الدلتا',
            'email' => 'owner_delta@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner_delta@garmentos.test',
            'password' => 'Secret123456!',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('tenant.tenant_type', 'factory')
            ->assertJsonPath('tenant.plan_tier', 'professional');
    }

    public function test_permanent_tenant_id_remains_identical_during_future_erp_evolution(): void
    {
        // 1. التسجيل كطالب خدمة بحاوية دائمة
        $reqTenant = Tenant::create([
            'code' => 'REQ-PERM01',
            'name' => 'العلامة التجارية المتطورة',
            'tenant_type' => 'marketplace_requester',
            'status' => 'active',
            'plan_tier' => 'none',
        ]);
        $originalTenantId = $reqTenant->id;

        $user = User::create([
            'tenant_id' => $originalTenantId,
            'name' => 'المؤسس',
            'email' => 'founder@garmentos.test',
            'password' => Hash::make('Secret123456!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // 2. محاكاة الترقية الموضعية إلى مصنع ERP (In-Place Evolution)
        $reqTenant->tenant_type = 'factory';
        $reqTenant->plan_tier = 'enterprise';
        $reqTenant->save();

        // 3. التأكد من بقاء المعرف الأصلي كما هو دون أي تغيير
        $this->assertEquals($originalTenantId, $reqTenant->fresh()->id);
        $this->assertEquals('factory', $reqTenant->fresh()->tenant_type);
        $this->assertEquals('enterprise', $reqTenant->fresh()->plan_tier);
        $this->assertEquals($originalTenantId, $user->fresh()->tenant_id);
    }
}


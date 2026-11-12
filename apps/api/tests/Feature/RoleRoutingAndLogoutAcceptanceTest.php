<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleRoutingAndLogoutAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $owner;
    private User $prodManager;
    private User $accountant;
    private User $worker;
    private User $salesRep;
    private User $platformAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'Nile Garment Factory',
            'code' => 'NILE-2026',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->owner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Nile Owner',
            'email' => 'owner@nilegarment.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'company_owner',
            'status' => 'active',
        ]);

        $this->prodManager = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Production Manager',
            'email' => 'pm@nilegarment.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'status' => 'active',
        ]);

        $this->accountant = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Accountant',
            'email' => 'accountant@nilegarment.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'accountant',
            'status' => 'active',
        ]);

        $this->worker = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Floor Worker',
            'email' => 'worker@nilegarment.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'worker',
            'status' => 'active',
        ]);

        $this->salesRep = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sales Representative',
            'email' => 'sales@nilegarment.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'sales_rep',
            'status' => 'active',
        ]);

        $this->platformAdmin = User::create([
            'tenant_id' => null,
            'name' => 'Platform Super Admin',
            'email' => 'admin@garmentos.com',
            'password' => bcrypt('Secret123!'),
            'role' => 'platform_admin',
            'status' => 'active',
        ]);
    }

    public function test_all_six_roles_authenticate_and_receive_accurate_role_metadata(): void
    {
        $roles = [
            ['email' => 'owner@nilegarment.com', 'expected_role' => 'company_owner', 'has_tenant' => true],
            ['email' => 'pm@nilegarment.com', 'expected_role' => 'production_manager', 'has_tenant' => true],
            ['email' => 'accountant@nilegarment.com', 'expected_role' => 'accountant', 'has_tenant' => true],
            ['email' => 'worker@nilegarment.com', 'expected_role' => 'worker', 'has_tenant' => true],
            ['email' => 'sales@nilegarment.com', 'expected_role' => 'sales_rep', 'has_tenant' => true],
            ['email' => 'admin@garmentos.com', 'expected_role' => 'platform_admin', 'has_tenant' => false],
        ];

        foreach ($roles as $r) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => $r['email'],
                'password' => 'Secret123!',
            ]);

            $response->assertStatus(200);
            $response->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ]);

            $data = $response->json();
            $this->assertEquals($r['expected_role'], $data['user']['role']);

            if ($r['has_tenant']) {
                $this->assertEquals($this->tenant->id, $data['user']['tenant_id']);
                $this->assertEquals($this->tenant->code, $data['tenant']['code']);
            }
        }
    }

    public function test_logout_revokes_token_and_blocks_subsequent_protected_api_access(): void
    {
        // 1. Login as owner
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@nilegarment.com',
            'password' => 'Secret123!',
        ]);
        $loginRes->assertStatus(200);
        $token = $loginRes->json('access_token');
        $this->assertNotEmpty($token);

        // 2. Access protected endpoint successfully
        $protectedRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/tenant/profile');
        $protectedRes->assertStatus(200);
        $this->assertEquals($this->tenant->name, $protectedRes->json('tenant.name'));

        // 3. Call Logout endpoint
        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');
        $logoutRes->assertStatus(200);
        $logoutRes->assertJsonFragment([
            'message' => 'تم تسجيل الخروج بنجاح وإلغاء رمز الدخول.',
        ]);

        // Flush in-memory test guard to simulate a fresh standalone HTTP request from the browser
        $this->app['auth']->forgetGuards();

        // 4. Verify previous token is strictly revoked and rejected on subsequent access
        $revokedRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/tenant/profile');
        $revokedRes->assertStatus(401);
    }

    public function test_role_based_permissions_enforced_between_worker_and_accountant(): void
    {
        // Login as Worker
        $workerLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'worker@nilegarment.com',
            'password' => 'Secret123!',
        ]);
        $workerToken = $workerLogin->json('access_token');

        // Worker attempting to post payment voucher -> Forbidden
        $workerVoucherRes = $this->withHeader('Authorization', 'Bearer ' . $workerToken)
            ->postJson('/api/v1/accounting/payment-vouchers', [
                'voucher_type' => 'payment',
                'amount' => 500,
            ]);
        $workerVoucherRes->assertStatus(403);

        // Login as Accountant
        $acctLogin = $this->postJson('/api/v1/auth/login', [
            'email' => 'accountant@nilegarment.com',
            'password' => 'Secret123!',
        ]);
        $acctToken = $acctLogin->json('access_token');

        // Accounting access is tenant-wide: grant the accountant every current tenant branch.
        // The endpoint intentionally denies partial branch coverage.
        $this->accountant->branches()->sync(
            Branch::where('tenant_id', $this->tenant->id)->pluck('id')->all()
        );

        // Accountant can read accounting accounts
        $acctAccountsRes = $this->withHeader('Authorization', 'Bearer ' . $acctToken)
            ->getJson('/api/v1/accounting/accounts');
        $acctAccountsRes->assertStatus(200);
    }
}

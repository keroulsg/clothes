<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\GarmentModel;
use App\Models\JobOrder;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ScopedBugFixSprintTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $ownerA;
    protected User $prodManagerA;
    protected User $accountantA;
    protected User $workerA;
    protected User $ownerB;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup Tenant A
        $this->tenantA = Tenant::create([
            'name' => 'Sprint Test Tenant A',
            'code' => 'SP-A-' . Str::random(4),
            'status' => 'active',
            'is_active' => true,
            'plan_tier' => 'professional',
            'domain' => 'sprint-a-' . Str::random(6) . '.test',
            'slug' => 'sprint-a-' . Str::random(6),
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Owner A',
            'email' => 'owner.a.' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->prodManagerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Prod Manager A',
            'email' => 'prod.a.' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Accountant A',
            'email' => 'acct.a.' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->workerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Worker A',
            'email' => 'worker.a.' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        // Setup Tenant B
        $this->tenantB = Tenant::create([
            'name' => 'Sprint Test Tenant B',
            'code' => 'SP-B-' . Str::random(4),
            'status' => 'active',
            'is_active' => true,
            'plan_tier' => 'professional',
            'domain' => 'sprint-b-' . Str::random(6) . '.test',
            'slug' => 'sprint-b-' . Str::random(6),
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Owner B',
            'email' => 'owner.b.' . Str::random(6) . '@test.com',
            'password' => bcrypt('password'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    // =========================================================================
    // DEF-01 TESTS: Accounting Journal Validation & Immutability
    // =========================================================================

    public function test_def_01_unbalanced_journal_returns_http_422_with_validation_errors(): void
    {
        Sanctum::actingAs($this->accountantA);

        $accDebit = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1010-' . Str::random(4),
            'name' => 'Cash Account',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $accCredit = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '4010-' . Str::random(4),
            'name' => 'Revenue Account',
            'type' => 'revenue',
            'category' => 'sales_revenue',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $initialJournalCount = JournalEntry::where('tenant_id', $this->tenantA->id)->count();
        $initialLineCount = JournalEntryLine::count();

        // Submit Unbalanced Journal (Debit 5000 != Credit 1000)
        $response = $this->postJson('/api/v1/accounting/journal-entries', [
            'description' => 'Unbalanced test journal entry',
            'entry_date' => '2026-10-27',
            'lines' => [
                ['account_id' => $accDebit->id, 'debit' => 5000.00, 'credit' => 0.00],
                ['account_id' => $accCredit->id, 'debit' => 0.00, 'credit' => 1000.00],
            ],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $response->assertStatus(422);
        $response->assertJsonStructure([
            'message',
            'errors' => ['lines'],
        ]);
        $this->assertStringContainsString('غير متوازن', $response->json('message'));

        // Assert transaction rolled back: zero records persisted
        $this->assertEquals($initialJournalCount, JournalEntry::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals($initialLineCount, JournalEntryLine::count());
    }

    public function test_def_01_balanced_valid_journal_still_succeeds_with_http_201(): void
    {
        Sanctum::actingAs($this->accountantA);

        $accDebit = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1011-' . Str::random(4),
            'name' => 'Bank Account',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $accCredit = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '4011-' . Str::random(4),
            'name' => 'Sales Revenue',
            'type' => 'revenue',
            'category' => 'sales_revenue',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/accounting/journal-entries', [
            'description' => 'Balanced valid journal entry',
            'entry_date' => '2026-10-27',
            'lines' => [
                ['account_id' => $accDebit->id, 'debit' => 2500.00, 'credit' => 0.00],
                ['account_id' => $accCredit->id, 'debit' => 0.00, 'credit' => 2500.00],
            ],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $response->assertStatus(201);
        $response->assertJsonPath('message', 'تم تسجيل وترحيل قيد اليومية بنجاح');
        $this->assertDatabaseHas('journal_entries', [
            'tenant_id' => $this->tenantA->id,
            'description' => 'Balanced valid journal entry',
        ]);
    }

    // =========================================================================
    // DEF-02 TESTS: Tenant-Scoped Garment Model Uniqueness
    // =========================================================================

    public function test_def_02_duplicate_model_code_in_same_tenant_returns_http_422(): void
    {
        Sanctum::actingAs($this->ownerA);

        $size = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'M-' . Str::random(3),
            'category' => 'adult',
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy-' . Str::random(3),
        ]);

        $modelCode = 'MDL-DUP-' . strtoupper(Str::random(4));

        // Create initial model
        $initialRes = $this->postJson('/api/v1/models', [
            'code' => $modelCode,
            'name' => 'Initial Original Model',
            'category' => 'shirts',
            'size_ids' => [$size->id],
            'color_ids' => [$color->id],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $initialRes->assertStatus(201);
        $initialModelId = $initialRes->json('model.id');

        // Submit duplicate model code (should return HTTP 422, not 500)
        $dupRes = $this->postJson('/api/v1/models', [
            'code' => $modelCode,
            'name' => 'Attempted Duplicate Model',
            'category' => 'pants',
            'size_ids' => [$size->id],
            'color_ids' => [$color->id],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $dupRes->assertStatus(422);
        $dupRes->assertJsonStructure(['errors' => ['code']]);

        // Verify original model remains untouched
        $this->assertDatabaseHas('garment_models', [
            'id' => $initialModelId,
            'code' => $modelCode,
            'name' => 'Initial Original Model',
        ]);
        $this->assertEquals(1, GarmentModel::where('tenant_id', $this->tenantA->id)->where('code', $modelCode)->count());
    }

    public function test_def_02_different_tenant_can_use_same_model_code(): void
    {
        $modelCode = 'SHARED-STYLE-01';

        // Tenant A creates model with this code
        Sanctum::actingAs($this->ownerA);
        $sizeA = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'L-A']);
        $colorA = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'Black-A']);

        $resA = $this->postJson('/api/v1/models', [
            'code' => $modelCode,
            'name' => 'Tenant A Dress',
            'category' => 'dresses',
            'size_ids' => [$sizeA->id],
            'color_ids' => [$colorA->id],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $resA->assertStatus(201);

        // Tenant B creates model with the SAME code (should succeed because code is tenant-scoped)
        Sanctum::actingAs($this->ownerB);
        $sizeB = Size::create(['tenant_id' => $this->tenantB->id, 'name' => 'L-B']);
        $colorB = Color::create(['tenant_id' => $this->tenantB->id, 'name' => 'Black-B']);

        $resB = $this->postJson('/api/v1/models', [
            'code' => $modelCode,
            'name' => 'Tenant B Jacket',
            'category' => 'jackets',
            'size_ids' => [$sizeB->id],
            'color_ids' => [$colorB->id],
        ], ['X-Tenant-Id' => $this->tenantB->id]);

        $resB->assertStatus(201);

        // Verify both models exist under their respective tenants
        $this->assertEquals(1, GarmentModel::withoutGlobalScopes()->where('tenant_id', $this->tenantA->id)->where('code', $modelCode)->count());
        $this->assertEquals(1, GarmentModel::withoutGlobalScopes()->where('tenant_id', $this->tenantB->id)->where('code', $modelCode)->count());
    }

    public function test_def_02_genuine_unique_constraint_race_is_classified_as_http_422(): void
    {
        Sanctum::actingAs($this->ownerA);
        $size = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'M-' . Str::random(3)]);
        $color = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'Red-' . Str::random(3)]);
        $raceCode = 'RACE-STYLE-' . strtoupper(Str::random(4));

        // Simulate a race condition: during the creating event (after validation passed),
        // another concurrent thread inserts the identical code directly into the database.
        $hasInsertedConflict = false;
        GarmentModel::creating(function ($model) use (&$hasInsertedConflict, $raceCode) {
            if (!$hasInsertedConflict && $model->code === $raceCode) {
                $hasInsertedConflict = true;
                // Direct DB insert bypasses validation to trigger genuine database unique constraint violation
                \Illuminate\Support\Facades\DB::table('garment_models')->insert([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $this->tenantA->id,
                    'code' => $raceCode,
                    'name' => 'Concurrent Inserted Model',
                    'category' => 'tops',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        // Passes initial Rule::unique validation because record did not exist yet at request start,
        // but hits the authoritative composite UNIQUE index inside the creation transaction.
        $response = $this->postJson('/api/v1/models', [
            'code' => $raceCode,
            'name' => 'Race Condition Target',
            'category' => 'tops',
            'size_ids' => [$size->id],
            'color_ids' => [$color->id],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['code']]);
        $this->assertStringContainsString('كود الموديل مستخدم مسبقاً', $response->json('message'));
    }

    public function test_def_02_unrelated_database_exception_is_not_translated_into_422(): void
    {
        Sanctum::actingAs($this->ownerA);
        $size = Size::create(['tenant_id' => $this->tenantA->id, 'name' => 'L-' . Str::random(3)]);
        $color = Color::create(['tenant_id' => $this->tenantA->id, 'name' => 'Green-' . Str::random(3)]);
        $testCode = 'UNRELATED-ERR-' . strtoupper(Str::random(4));

        // Trigger an unrelated database exception (table not found / query failure) inside transaction
        GarmentModel::creating(function ($model) use ($testCode) {
            if ($model->code === $testCode) {
                \Illuminate\Support\Facades\DB::select('SELECT * FROM non_existent_table_for_unrelated_error_test');
            }
        });

        $response = $this->postJson('/api/v1/models', [
            'code' => $testCode,
            'name' => 'Unrelated Error Model',
            'category' => 'tops',
            'size_ids' => [$size->id],
            'color_ids' => [$color->id],
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        // Unrelated database exceptions must be rethrown and returned as 500, NOT masked as duplicate 422
        $response->assertStatus(500);
    }

    // =========================================================================
    // DEF-03 TESTS: Subcontracting CMT Role-Based Authorization
    // =========================================================================

    public function test_def_03_company_owner_can_create_and_confirm_cmt_job(): void
    {
        Sanctum::actingAs($this->ownerA);

        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-OWN-' . Str::random(4),
            'name' => 'CMT Customer For Owner',
            'is_active' => true,
        ]);

        // 1. Create Job Order as company_owner
        $createRes = $this->postJson('/api/v1/subcontracting/jobs', [
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'service_type' => 'cmt',
            'total_target_quantity' => 300,
            'unit_rate' => 35.00,
            'target_delivery_date' => '2026-11-25',
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $createRes->assertStatus(201);
        $jobId = $createRes->json('data.id');

        // 2. Confirm Job Order as company_owner
        $confirmRes = $this->postJson("/api/v1/subcontracting/jobs/{$jobId}/confirm", [], ['X-Tenant-Id' => $this->tenantA->id]);
        $confirmRes->assertStatus(200);

        $this->assertDatabaseHas('job_orders', [
            'id' => $jobId,
            'tenant_id' => $this->tenantA->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_def_03_production_manager_and_accountant_can_create_cmt_job(): void
    {
        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-STF-' . Str::random(4),
            'name' => 'CMT Customer For Staff',
            'is_active' => true,
        ]);

        // Test Production Manager
        Sanctum::actingAs($this->prodManagerA);
        $resProd = $this->postJson('/api/v1/subcontracting/jobs', [
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'service_type' => 'contract_cutting',
            'total_target_quantity' => 150,
            'unit_rate' => 15.00,
        ], ['X-Tenant-Id' => $this->tenantA->id]);
        $resProd->assertStatus(201);

        // Test Accountant
        Sanctum::actingAs($this->accountantA);
        $resAcct = $this->postJson('/api/v1/subcontracting/jobs', [
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'service_type' => 'cmt',
            'total_target_quantity' => 200,
            'unit_rate' => 22.00,
        ], ['X-Tenant-Id' => $this->tenantA->id]);
        $resAcct->assertStatus(201);
    }

    public function test_def_03_unauthorized_worker_is_blocked_with_http_403(): void
    {
        Sanctum::actingAs($this->workerA);

        $customer = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-WRK-' . Str::random(4),
            'name' => 'CMT Customer Worker Block Test',
            'is_active' => true,
        ]);

        $res = $this->postJson('/api/v1/subcontracting/jobs', [
            'customer_name' => $customer->name,
            'customer_id' => $customer->id,
            'service_type' => 'cmt',
            'total_target_quantity' => 100,
            'unit_rate' => 20.00,
        ], ['X-Tenant-Id' => $this->tenantA->id]);

        $res->assertStatus(403);
    }

    public function test_def_03_cross_tenant_access_to_cmt_job_is_blocked(): void
    {
        // Owner A creates job in Tenant A
        Sanctum::actingAs($this->ownerA);
        $customerA = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-ISO-' . Str::random(4),
            'name' => 'Customer A Job',
            'is_active' => true,
        ]);
        $jobA = JobOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'JOB-ISO-' . Str::random(4),
            'customer_id' => $customerA->id,
            'customer_name' => $customerA->name,
            'service_type' => 'cmt',
            'total_target_quantity' => 100,
            'unit_rate' => 10,
            'status' => 'draft',
        ]);

        // Owner B attempts to confirm Tenant A's job
        Sanctum::actingAs($this->ownerB);
        $res = $this->postJson("/api/v1/subcontracting/jobs/{$jobA->id}/confirm", [], ['X-Tenant-Id' => $this->tenantB->id]);

        // Must be rejected (either 403 or 404 depending on tenant scoping)
        $this->assertContains($res->status(), [403, 404]);

        // Assert status in Tenant A was not modified
        $this->assertDatabaseHas('job_orders', [
            'id' => $jobA->id,
            'tenant_id' => $this->tenantA->id,
            'status' => 'draft',
        ]);
    }
}


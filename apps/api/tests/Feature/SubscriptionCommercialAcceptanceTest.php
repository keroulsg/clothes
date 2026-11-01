<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\FactorySubscription;
use App\Models\GarmentModel;
use App\Models\ProductionOrder;
use App\Models\SubscriptionPlan;
use App\Models\SubscriptionQuotaOverride;
use App\Models\SubscriptionUsageAggregate;
use App\Models\SubscriptionUsageEvent;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\SubscriptionUsageService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SubscriptionCommercialAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private SubscriptionUsageService $usageService;
    private Tenant $starterTenant;
    private Tenant $proTenant;
    private Tenant $enterpriseTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->usageService = app(SubscriptionUsageService::class);
        $this->usageService->seedDefaultPlans();

        $this->starterTenant = Tenant::create([
            'code' => 'T-STARTER',
            'name' => 'El-Mahalla Weaving (Starter)',
            'domain' => 'starter.garmentos.test',
            'status' => 'active',
        ]);
        $this->usageService->upgradeSubscription($this->starterTenant->id, 'starter');

        $this->proTenant = Tenant::create([
            'code' => 'T-PRO',
            'name' => 'Alexandria Apparel Ltd (Pro)',
            'domain' => 'pro.garmentos.test',
            'status' => 'active',
        ]);
        $this->usageService->upgradeSubscription($this->proTenant->id, 'pro');

        $this->enterpriseTenant = Tenant::create([
            'code' => 'T-ENTERPRISE',
            'name' => 'Cairo Mega Textiles (Enterprise)',
            'domain' => 'enterprise.garmentos.test',
            'status' => 'active',
        ]);
        $this->usageService->upgradeSubscription($this->enterpriseTenant->id, 'enterprise');
    }

    /**
     * 1. Multi-tenant plan activation and initial quota verification
     */
    public function test_multi_tenant_plan_activation_and_quota_limits(): void
    {
        $starterUsage = $this->usageService->getTenantUsageReport($this->starterTenant->id);
        $proUsage = $this->usageService->getTenantUsageReport($this->proTenant->id);
        $entUsage = $this->usageService->getTenantUsageReport($this->enterpriseTenant->id);

        $this->assertEquals('starter', $starterUsage['subscription']['plan_code']);
        $this->assertEquals(3, $starterUsage['meters']['active_users']['limit']);
        $this->assertEquals(30, $starterUsage['meters']['production_orders']['limit']);

        $this->assertEquals('pro', $proUsage['subscription']['plan_code']);
        $this->assertEquals(10, $proUsage['meters']['active_users']['limit']);
        $this->assertEquals(150, $proUsage['meters']['production_orders']['limit']);

        $this->assertEquals('enterprise', $entUsage['subscription']['plan_code']);
        $this->assertEquals(999, $entUsage['meters']['active_users']['limit']);
        $this->assertEquals(1500, $entUsage['meters']['production_orders']['limit']);
    }

    /**
     * 2. Hard limit enforcement and rejection
     */
    public function test_starter_tenant_hard_limit_enforcement(): void
    {
        // Starter limit for branches is 1
        Branch::create([
            'tenant_id' => $this->starterTenant->id,
            'name' => 'Main Factory Branch',
            'code' => 'BR-01',
            'is_active' => true,
        ]);

        $quotaCheck = $this->usageService->checkQuota($this->starterTenant->id, 'active_branches', 1);
        $this->assertFalse($quotaCheck['allowed']);
        $this->assertTrue($quotaCheck['is_exceeded']);
        $this->assertFalse($quotaCheck['is_soft_limit']);

        // Enterprise tenant can create without hitting starter limit
        $entQuota = $this->usageService->checkQuota($this->enterpriseTenant->id, 'active_branches', 1);
        $this->assertTrue($entQuota['allowed']);
    }

    /**
     * 3. Soft limit warning thresholds (70%, 85%) on monthly orders
     */
    public function test_soft_limit_warning_thresholds(): void
    {
        // Starter production_orders limit is 30.
        // Record 21 orders (70%)
        for ($i = 0; $i < 21; $i++) {
            $this->usageService->recordUsage(
                tenantId: $this->starterTenant->id,
                meterKey: 'production_orders',
                qty: 1,
                idempotencyKey: "evt-soft-{$i}"
            );
        }

        $report = $this->usageService->getTenantUsageReport($this->starterTenant->id);
        $meter = $report['meters']['production_orders'];

        $this->assertEquals(21, $meter['current_usage']);
        $this->assertEquals(70.0, $meter['percent_used']);
        $this->assertTrue($meter['is_warning_70']);

        // Soft limit still allows consumption to ensure factory floor does not halt
        $check = $this->usageService->checkQuota($this->starterTenant->id, 'production_orders', 1);
        $this->assertTrue($check['allowed']);
        $this->assertTrue($check['is_soft_limit']);
    }

    /**
     * 4. Idempotency prevents double counting of usage
     */
    public function test_idempotency_prevents_duplicate_usage_events(): void
    {
        $idempotencyKey = 'unique-event-tx-12345';

        // First attempt
        $event1 = $this->usageService->recordUsage(
            tenantId: $this->starterTenant->id,
            meterKey: 'sales_orders',
            qty: 1,
            idempotencyKey: $idempotencyKey
        );

        // Duplicate replay with identical key
        $event2 = $this->usageService->recordUsage(
            tenantId: $this->starterTenant->id,
            meterKey: 'sales_orders',
            qty: 1,
            idempotencyKey: $idempotencyKey
        );

        $this->assertEquals($event1->id, $event2->id);

        $currentPeriod = now()->format('Y-m');
        $aggregate = SubscriptionUsageAggregate::withoutGlobalScopes()
            ->where('tenant_id', $this->starterTenant->id)
            ->where('meter_key', 'sales_orders')
            ->where('billing_period', $currentPeriod)
            ->first();

        $this->assertNotNull($aggregate);
        $this->assertEquals(1, $aggregate->total_usage);
    }

    /**
     * 5. Database transaction rollback does not count failed operations
     */
    public function test_database_transaction_rollback_prevents_uncommitted_usage(): void
    {
        try {
            DB::transaction(function () {
                $this->usageService->recordUsage(
                    tenantId: $this->starterTenant->id,
                    meterKey: 'purchase_orders',
                    qty: 1,
                    idempotencyKey: 'tx-rollback-test'
                );

                // Simulate business rule failure
                throw new \RuntimeException('Business logic validation failed');
            });
        } catch (\RuntimeException $e) {
            // Expected
        }

        // Usage event and aggregate must be rolled back
        $eventsCount = SubscriptionUsageEvent::where('tenant_id', $this->starterTenant->id)
            ->where('idempotency_key', 'tx-rollback-test')
            ->count();

        $this->assertEquals(0, $eventsCount);
    }

    /**
     * 6. Platform Admin Emergency Quota Override grants instant headroom
     */
    public function test_admin_emergency_quota_override(): void
    {
        // Fill starter warehouse limit (1 warehouse)
        Warehouse::create([
            'tenant_id' => $this->starterTenant->id,
            'name' => 'Main Warehouse',
            'code' => 'WH-01',
            'type' => 'fabric',
            'is_active' => true,
        ]);

        $checkBefore = $this->usageService->checkQuota($this->starterTenant->id, 'active_warehouses', 1);
        $this->assertFalse($checkBefore['allowed']);

        // Admin grants temporary limit = 3 valid for 7 days
        $this->usageService->grantOverride(
            tenantId: $this->starterTenant->id,
            meterKey: 'active_warehouses',
            temporaryLimit: 3,
            reason: 'Emergency peak season production',
            grantedBy: 'Admin Team',
            expiresAt: now()->addDays(7)
        );

        $checkAfter = $this->usageService->checkQuota($this->starterTenant->id, 'active_warehouses', 1);
        $this->assertTrue($checkAfter['allowed']);
        $this->assertEquals(3, $checkAfter['limit']);
    }

    /**
     * 7. Plan Upgrade seamlessly increases limits without data corruption
     */
    public function test_plan_upgrade_from_starter_to_pro(): void
    {
        $this->usageService->upgradeSubscription($this->starterTenant->id, 'pro');

        $updatedReport = $this->usageService->getTenantUsageReport($this->starterTenant->id);
        $this->assertEquals('pro', $updatedReport['subscription']['plan_code']);
        $this->assertEquals(10, $updatedReport['meters']['active_users']['limit']);
        $this->assertEquals(3, $updatedReport['meters']['active_warehouses']['limit']);
    }

    /**
     * 8. Plan Downgrade preserves existing business data intact
     */
    public function test_plan_downgrade_preserves_existing_records_safely(): void
    {
        // Pro tenant has 3 warehouses created
        for ($i = 1; $i <= 3; $i++) {
            Warehouse::create([
                'tenant_id' => $this->proTenant->id,
                'name' => "Alexandria Hub {$i}",
                'code' => "WH-ALX-{$i}",
                'type' => 'fabric',
                'is_active' => true,
            ]);
        }

        $this->assertEquals(3, Warehouse::withoutGlobalScopes()->where('tenant_id', $this->proTenant->id)->count());

        // Downgrade Pro tenant to Starter (Starter limit is 1 warehouse)
        $this->usageService->upgradeSubscription($this->proTenant->id, 'starter');

        // Existing 3 warehouses MUST remain intact (zero deletions or records corruption)
        $this->assertEquals(3, Warehouse::withoutGlobalScopes()->where('tenant_id', $this->proTenant->id)->count());

        // But attempting to add a 4th warehouse must be blocked
        $check = $this->usageService->checkQuota($this->proTenant->id, 'active_warehouses', 1);
        $this->assertFalse($check['allowed']);
        $this->assertEquals(3, $check['current_usage']);
        $this->assertEquals(1, $check['limit']);
    }

    /**
     * 9. Tenant isolation: Usage from Tenant A never impacts Tenant B
     */
    public function test_strict_tenant_metering_isolation(): void
    {
        // Tenant A records usage
        $this->usageService->recordUsage(
            tenantId: $this->starterTenant->id,
            meterKey: 'sales_orders',
            qty: 15,
            idempotencyKey: 'tenant-a-sales'
        );

        $starterReport = $this->usageService->getTenantUsageReport($this->starterTenant->id);
        $proReport = $this->usageService->getTenantUsageReport($this->proTenant->id);

        $this->assertEquals(15, $starterReport['meters']['sales_orders']['current_usage']);
        $this->assertEquals(0, $proReport['meters']['sales_orders']['current_usage']);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\MaintenanceSparePart;
use App\Models\Tenant;
use App\Models\User;
use App\Services\MaintenanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MachineAndMaintenanceTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Branch $branchA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TENANT-MNT-A',
            'name' => 'Al-Nasr Weaving & Sewing Co',
            'domain' => 'alnasr.garmentos.test',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'code' => 'TENANT-MNT-B',
            'name' => 'Cairo Textile Ltd',
            'domain' => 'cairo.garmentos.test',
            'status' => 'active',
        ]);

        $this->branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Main Workshop Line 1',
            'code' => 'BR-01',
            'is_headquarters' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Maintenance Chief',
            'email' => 'mnt@alnasr.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Cairo Chief',
            'email' => 'chief@cairo.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    public function test_machine_registration_and_preventive_interval_calculation(): void
    {
        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/maintenance/machines', [
                'machine_code' => 'JUKI-DIL-01',
                'name' => 'Juki DDL-9000C Direct Drive Sewing Machine',
                'model_number' => 'DDL-9000C-FMS',
                'serial_number' => 'JK987654321',
                'machine_type' => 'sewing',
                'location' => 'Line 1 - Station 4',
                'maintenance_interval_days' => 45,
                'status' => 'operational',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('machine.machine_code', 'JUKI-DIL-01')
            ->assertJsonPath('machine.status', 'operational')
            ->assertJsonPath('machine.maintenance_interval_days', 45);

        $this->assertDatabaseHas('machines', [
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'JUKI-DIL-01',
            'name' => 'Juki DDL-9000C Direct Drive Sewing Machine',
        ]);
    }

    public function test_create_work_order_sets_machine_to_breakdown(): void
    {
        $machine = Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'EASTMAN-CUT-01',
            'name' => 'Eastman Straight Knife Cutting Machine',
            'machine_type' => 'cutting',
            'status' => 'operational',
            'maintenance_interval_days' => 30,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson('/api/v1/maintenance/work-orders', [
                'machine_id' => $machine->id,
                'work_type' => 'breakdown',
                'priority' => 'critical',
                'issue_description' => 'Motor overheating and drive belt slippage during heavy fabric lay.',
                'reported_by' => 'Cutting Supervisor',
                'technician_name' => 'Eng. Tamer',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('work_order.work_type', 'breakdown')
            ->assertJsonPath('work_order.priority', 'critical');

        // Machine status should now automatically reflect 'breakdown'
        $this->assertEquals('breakdown', $machine->fresh()->status);
    }

    public function test_add_spare_parts_updates_total_cost(): void
    {
        $machine = Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'PEGASUS-OVL-01',
            'name' => 'Pegasus 5-Thread Overlock Machine',
            'machine_type' => 'overlock',
            'status' => 'under_maintenance',
        ]);

        $service = app(MaintenanceService::class);
        $order = $service->createWorkOrder([
            'machine_id' => $machine->id,
            'work_type' => 'preventive',
            'priority' => 'medium',
            'issue_description' => 'Scheduled oil pump and needle plate replacement.',
            'labor_cost' => 150.00,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/maintenance/work-orders/{$order->id}/spare-parts", [
                'part_name' => 'Needle Plate E-18',
                'part_number' => 'NP-20418',
                'quantity' => 2,
                'unit_cost' => 75.00,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('spare_part.total_cost', '150.0000');

        $updatedOrder = $order->fresh();
        $this->assertEquals(150.00, (float)$updatedOrder->spare_parts_cost);
        $this->assertEquals(300.00, (float)$updatedOrder->total_cost); // 150 labor + 150 parts
    }

    public function test_complete_work_order_restores_machine_status_and_advances_date(): void
    {
        $machine = Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'HASHIMA-FUS-01',
            'name' => 'Hashima Continuous Fusing Machine',
            'machine_type' => 'ironing',
            'status' => 'breakdown',
            'maintenance_interval_days' => 60,
        ]);

        $service = app(MaintenanceService::class);
        $order = $service->createWorkOrder([
            'machine_id' => $machine->id,
            'work_type' => 'breakdown',
            'priority' => 'critical',
            'issue_description' => 'Heating element contactor failure.',
            'labor_cost' => 200.00,
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->postJson("/api/v1/maintenance/work-orders/{$order->id}/complete", [
                'resolution_notes' => 'Replaced contactor switch, tested temperature calibration at 180C.',
                'downtime_hours' => 3.5,
                'labor_cost' => 250.00,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('work_order.status', 'completed')
            ->assertJsonPath('work_order.downtime_hours', '3.50');

        $freshMachine = $machine->fresh();
        $this->assertEquals('operational', $freshMachine->status);
        $this->assertNotNull($freshMachine->last_maintenance_date);
        $this->assertNotNull($freshMachine->next_maintenance_date);
    }

    public function test_tenant_isolation_on_machines(): void
    {
        // Machine in Tenant A
        $machineA = Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'JUKI-A-01',
            'name' => 'Tenant A Machine',
            'machine_type' => 'sewing',
            'status' => 'operational',
        ]);

        // Tenant B user tries to access Tenant A machine list
        app()->instance('current_tenant_id', $this->tenantB->id);

        $response = $this->actingAs($this->userB, 'sanctum')
            ->getJson('/api/v1/maintenance/machines');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(0, $data);
    }

    public function test_downtime_summary_reporting(): void
    {
        Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'SEW-01',
            'name' => 'Sewing 1',
            'machine_type' => 'sewing',
            'status' => 'operational',
        ]);

        Machine::create([
            'tenant_id' => $this->tenantA->id,
            'machine_code' => 'CUT-01',
            'name' => 'Cutting 1',
            'machine_type' => 'cutting',
            'status' => 'breakdown',
        ]);

        $response = $this->actingAs($this->userA, 'sanctum')
            ->getJson('/api/v1/maintenance/downtime-summary');

        $response->assertStatus(200)
            ->assertJsonPath('total_machines', 2)
            ->assertJsonPath('operational_machines', 1)
            ->assertJsonPath('down_machines', 1);
    }
}

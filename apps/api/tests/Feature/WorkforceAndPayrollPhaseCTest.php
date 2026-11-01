<?php

namespace Tests\Feature;

use App\Models\Attendance;
use App\Models\Branch;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\EmployeeAdjustment;
use App\Models\GarmentModel;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\PayrollPayment;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionOrder;
use App\Models\QualityDefectAdjustment;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PayrollService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkforceAndPayrollPhaseCTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $ownerA;
    protected User $accountantA;
    protected User $prodMgrA;
    protected User $ownerB;
    protected User $accountantB;
    protected Branch $branchA;
    protected PayrollService $payrollService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->payrollService = app(PayrollService::class);

        // Tenant A
        $this->tenantA = Tenant::create([
            'code' => 'TENANT-ALPHA',
            'name' => 'Alpha Garments Factory',
            'subdomain' => 'alpha',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        // Tenant B
        $this->tenantB = Tenant::create([
            'code' => 'TENANT-BETA',
            'name' => 'Beta Textile Works',
            'subdomain' => 'beta',
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Main Workshop Alpha',
            'code' => 'BR-01',
            'city' => 'Cairo',
            'is_main' => true,
        ]);

        // Users Tenant A
        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Owner Alpha',
            'email' => 'owner@alpha.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Accountant Alpha',
            'email' => 'accountant@alpha.test',
            'role' => 'accountant',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->prodMgrA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Production Manager Alpha',
            'email' => 'prodmgr@alpha.test',
            'role' => 'production_manager',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        // Users Tenant B
        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Owner Beta',
            'email' => 'owner@beta.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->accountantB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Accountant Beta',
            'email' => 'accountant@beta.test',
            'role' => 'accountant',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);
    }

    /**
     * Scenario 1: Piece-rate worker payroll with bundle output, approvals, and partial payments.
     */
    public function test_scenario_1_piece_rate_worker_workflow_and_partial_payment(): void
    {
        Sanctum::actingAs($this->accountantA);

        // 1. Create piece-rate worker
        $emp = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'employee_code' => 'EMP-PR-01',
            'name' => 'Mahmoud Sewing Master',
            'department' => 'sewing',
            'job_title' => 'Master Tailor',
            'pay_type' => 'piece_rate',
            'base_salary' => 0.00,
            'is_active' => true,
        ]);

        // 2. Configure standard piece rate
        $rate = PieceRate::create([
            'tenant_id' => $this->tenantA->id,
            'stage_name' => 'sewing',
            'operation_name' => 'Collar Assembly',
            'rate_per_piece' => 4.50,
            'is_active' => true,
        ]);

        // 3. Submit and approve piece-work logs (200 pieces @ 4.50 = 900.00 EGP)
        $log = PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $emp->id,
            'completed_quantity' => 200,
            'unit_rate' => 4.50,
            'total_amount' => 900.00,
            'work_date' => '2026-10-15',
            'status' => 'pending',
        ]);

        // Approve log
        $resApprove = $this->postJson("/api/v1/hr/piece-work-logs/{$log->id}/approve");
        $resApprove->assertStatus(200);
        $this->assertEquals('approved', $log->fresh()->status);

        // 4. Calculate Payroll for period
        $resPayroll = $this->postJson('/api/v1/hr/payrolls/generate', [
            'payroll_period' => '2026-10',
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
        ]);

        $resPayroll->assertStatus(201);
        $payrollId = $resPayroll->json('payroll.id');

        $payroll = Payroll::with('items')->findOrFail($payrollId);
        $this->assertEquals('draft', $payroll->status);
        $this->assertCount(1, $payroll->items);

        $item = $payroll->items->first();
        // Gross for pure piece-rate worker = 200 * 4.50 = 900.00 EGP
        $this->assertEquals(900.00, (float) $item->gross_amount);
        $this->assertEquals(900.00, (float) $item->piece_rate_earnings);
        $this->assertEquals(900.00, (float) $item->net_salary);
        $this->assertEquals(900.00, (float) $payroll->total_net);
        $this->assertEquals(900.00, (float) $payroll->remaining_balance);

        // Verify calculation breakdown exists and is transparent
        $this->assertNotNull($item->calculation_breakdown);
        $this->assertEquals('piece_rate', $item->calculation_breakdown['pay_type']);
        $this->assertEquals(900.00, (float) $item->calculation_breakdown['piece_rate_earnings']);

        // 5. Approve Payroll
        $resApprovePr = $this->postJson("/api/v1/hr/payrolls/{$payrollId}/approve");
        $resApprovePr->assertStatus(200);
        $this->assertEquals('approved', $payroll->fresh()->status);

        // 6. Record Partial Payment 1: 400 EGP
        $resPay1 = $this->postJson("/api/v1/hr/payrolls/{$payrollId}/pay", [
            'amount' => 400.00,
            'payment_date' => '2026-10-31',
            'payment_method' => 'cash',
            'reference_number' => 'VOUCH-001',
        ]);
        $resPay1->assertStatus(200);

        $payroll = $payroll->fresh();
        $this->assertEquals('partially_paid', $payroll->status);
        $this->assertEquals(400.00, (float) $payroll->total_paid);
        $this->assertEquals(500.00, (float) $payroll->remaining_balance);

        // 7. Record Partial Payment 2: 500 EGP (Full balance settlement)
        $resPay2 = $this->postJson("/api/v1/hr/payrolls/{$payrollId}/pay", [
            'amount' => 500.00,
            'payment_date' => '2026-11-01',
            'payment_method' => 'instapay',
            'reference_number' => 'INSTA-88219',
        ]);
        $resPay2->assertStatus(200);

        $payroll = $payroll->fresh();
        $this->assertEquals('paid', $payroll->status);
        $this->assertEquals(900.00, (float) $payroll->total_paid);
        $this->assertEquals(0.00, (float) $payroll->remaining_balance);
        $this->assertCount(2, $payroll->payments);
    }

    /**
     * Scenario 2: Hourly and daily worker wage calculations with attendance and overtime.
     */
    public function test_scenario_2_hourly_and_daily_worker_with_attendance_and_overtime(): void
    {
        Sanctum::actingAs($this->accountantA);

        // Hourly Worker: 60 EGP/hr
        $workerHourly = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-H-01',
            'name' => 'Hassan Hourly Operator',
            'department' => 'cutting',
            'job_title' => 'Fabric Spreader',
            'pay_type' => 'hourly',
            'hourly_rate' => 60.00,
            'is_active' => true,
        ]);

        // Daily Worker: 250 EGP/day
        $workerDaily = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-D-01',
            'name' => 'Tarek Daily Finisher',
            'department' => 'finishing',
            'job_title' => 'Ironing Specialist',
            'pay_type' => 'daily',
            'daily_rate' => 250.00,
            'is_active' => true,
        ]);

        // Attendance for Hourly Worker: 8 normal hours + 2 overtime hours
        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $workerHourly->id,
            'attendance_date' => '2026-10-10',
            'check_in' => '08:00',
            'check_out' => '18:00',
            'working_hours' => 8.0,
            'overtime_hours' => 2.0,
            'status' => 'present',
            'is_payable' => true,
        ]);

        // Attendance for Daily Worker: 2 attended payable days
        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $workerDaily->id,
            'attendance_date' => '2026-10-10',
            'check_in' => '08:00',
            'check_out' => '16:30',
            'total_hours' => 8.5,
            'overtime_hours' => 0.0,
            'status' => 'present',
            'is_payable' => true,
        ]);
        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $workerDaily->id,
            'attendance_date' => '2026-10-11',
            'check_in' => '08:00',
            'check_out' => '16:30',
            'total_hours' => 8.5,
            'overtime_hours' => 0.0,
            'status' => 'present',
            'is_payable' => true,
        ]);

        // Calculate Payroll
        $payroll = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-10',
            '2026-10-01',
            '2026-10-31',
            $this->accountantA->id
        );

        $hourlyItem = $payroll->items->where('employee_id', $workerHourly->id)->first();
        $this->assertNotNull($hourlyItem);
        // Regular: 8 hrs * 60 = 480. Overtime: 2 hrs * 60 * 1.5 = 180. Total = 660 EGP
        $this->assertEquals(480.00, (float) $hourlyItem->hourly_earnings);
        $this->assertEquals(180.00, (float) $hourlyItem->overtime_earnings);
        $this->assertEquals(660.00, (float) $hourlyItem->net_salary);

        $dailyItem = $payroll->items->where('employee_id', $workerDaily->id)->first();
        $this->assertNotNull($dailyItem);
        // 2 days * 250 = 500 EGP
        $this->assertEquals(500.00, (float) $dailyItem->daily_earnings);
        $this->assertEquals(500.00, (float) $dailyItem->net_salary);
    }

    /**
     * Scenario 3: Historical integrity and finalization immutability.
     */
    public function test_scenario_3_historical_integrity_and_finalization_immutability(): void
    {
        Sanctum::actingAs($this->accountantA);

        $worker = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-IMM-01',
            'name' => 'Historical Integrity Worker',
            'department' => 'sewing',
            'job_title' => 'Operator',
            'pay_type' => 'daily',
            'daily_rate' => 300.00,
            'is_active' => true,
        ]);

        Attendance::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $worker->id,
            'attendance_date' => '2026-10-05',
            'status' => 'present',
            'is_payable' => true,
        ]);

        $payroll = $this->payrollService->generatePayroll($this->tenantA->id, '2026-10', '2026-10-01', '2026-10-31', $this->accountantA->id);
        $this->payrollService->approvePayroll($payroll->id, $this->tenantA->id, $this->ownerA->id);
        $this->payrollService->finalizePayroll($payroll->id, $this->tenantA->id, $this->ownerA->id);

        $this->assertEquals('finalized', $payroll->fresh()->status);
        $originalNet = (float) $payroll->fresh()->total_net;
        $this->assertEquals(300.00, $originalNet);

        // 1. Recalculation attempt must be rejected
        $this->expectException(InvalidArgumentException::class);
        $this->payrollService->generatePayroll($this->tenantA->id, '2026-10', '2026-10-01', '2026-10-31', $this->accountantA->id);

        // 2. Modifying employee's rate in future must not rewrite finalized history
        $worker->update(['daily_rate' => 999.00]);
        $this->assertEquals(300.00, (float) $payroll->fresh()->total_net);
    }

    /**
     * Scenario 4: Quality defect deduction requires explicit approval and objection trail.
     */
    public function test_scenario_4_quality_defect_approval_gate_and_audit_trail(): void
    {
        Sanctum::actingAs($this->accountantA);

        $worker = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-QC-01',
            'name' => 'Kareem QC Worker',
            'department' => 'sewing',
            'job_title' => 'Stitcher',
            'pay_type' => 'fixed_salary',
            'base_salary' => 5000.00,
            'is_active' => true,
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Classic Polo Shirt',
            'code' => 'POLO-001',
            'category' => 'tops',
            'base_price' => 150.00,
            'is_active' => true,
        ]);

        $order = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $this->branchA->id,
            'garment_model_id' => $model->id,
            'order_number' => 'PO-2026-001',
            'target_quantity' => 500,
            'planned_start_date' => now()->toDateString(),
            'planned_end_date' => now()->addDays(10)->toDateString(),
            'target_delivery_date' => now()->addDays(14)->toDateString(),
            'status' => 'confirmed',
        ]);

        // Report defect adjustment with status pending_approval
        $defectAdj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $worker->id,
            'production_order_id' => $order->id,
            'proposed_penalty_amount' => 400.00,
            'adjustment_reason' => 'Seam misalignment on 20 garments',
            'status' => 'pending_approval',
            'reported_by' => $this->prodMgrA->id,
        ]);

        // Calculate payroll while defect is pending -> MUST NOT DEDUCT
        $payroll1 = $this->payrollService->generatePayroll($this->tenantA->id, '2026-10', '2026-10-01', '2026-10-31', $this->accountantA->id);
        $item1 = $payroll1->items->first();
        $this->assertEquals(0.00, (float) $item1->defect_deductions);
        $this->assertEquals(5000.00, (float) $item1->net_salary);

        // Explicitly approve the defect adjustment
        $defectAdj->update([
            'status' => 'approved',
            'approved_by' => $this->prodMgrA->id,
            'approved_at' => now(),
        ]);

        // Recalculate draft payroll -> MUST NOW DEDUCT 400.00
        $payroll2 = $this->payrollService->generatePayroll($this->tenantA->id, '2026-10', '2026-10-01', '2026-10-31', $this->accountantA->id);
        $item2 = $payroll2->items->first();
        $this->assertEquals(400.00, (float) $item2->defect_deductions);
        $this->assertEquals(4600.00, (float) $item2->net_salary);

        // Test worker objection on a second proposed defect adjustment
        $defectAdj2 = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $worker->id,
            'production_order_id' => $order->id,
            'proposed_penalty_amount' => 150.00,
            'adjustment_reason' => 'Thread tension issue',
            'status' => 'pending_approval',
            'reported_by' => $this->prodMgrA->id,
        ]);

        $resObj = $this->postJson("/api/v1/hr/defect-adjustments/{$defectAdj2->id}/object", [
            'objection_notes' => 'Machine tension gauge was malfunctioning',
        ]);
        $resObj->assertStatus(200);
        $this->assertEquals('objected', $defectAdj2->fresh()->status);
        $this->assertEquals('Machine tension gauge was malfunctioning', $defectAdj2->fresh()->worker_objection_notes);
    }

    /**
     * Scenario 5: Cross-tenant isolation verification.
     */
    public function test_scenario_5_tenant_isolation(): void
    {
        // Create worker in Tenant A
        $empA = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-A-ISOL',
            'name' => 'Worker Tenant Alpha',
            'department' => 'sewing',
            'job_title' => 'Operator',
            'pay_type' => 'daily',
            'daily_rate' => 200.00,
            'is_active' => true,
        ]);

        // Login as Tenant B accountant
        Sanctum::actingAs($this->accountantB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        // Tenant B attempting to view Tenant A's employee
        $resShow = $this->getJson("/api/v1/hr/employees/{$empA->id}");
        $resShow->assertStatus(404);

        // Tenant B attempting to update Tenant A's employee
        $resUpdate = $this->putJson("/api/v1/hr/employees/{$empA->id}", [
            'name' => 'Hacked Name',
            'daily_rate' => 9999.00,
        ]);
        $resUpdate->assertStatus(404);

        $this->assertEquals('Worker Tenant Alpha', $empA->fresh()->name);
    }

    /**
     * Scenario 6: Duplicate protection and double-counting prevention.
     */
    public function test_scenario_6_duplicate_protection(): void
    {
        Sanctum::actingAs($this->accountantA);

        $worker = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-DUP-01',
            'name' => 'Duplicate Prevention Worker',
            'department' => 'sewing',
            'job_title' => 'Operator',
            'pay_type' => 'daily',
            'daily_rate' => 250.00,
            'is_active' => true,
        ]);

        // 1. Record first attendance
        $resAtt1 = $this->postJson('/api/v1/hr/attendances', [
            'employee_id' => $worker->id,
            'attendance_date' => '2026-10-20',
            'check_in' => '08:00',
            'check_out' => '16:30',
            'status' => 'present',
        ]);
        $resAtt1->assertStatus(201);

        // 2. Submitting duplicate attendance for same worker on same day must be rejected
        $resAtt2 = $this->postJson('/api/v1/hr/attendances', [
            'employee_id' => $worker->id,
            'attendance_date' => '2026-10-20',
            'check_in' => '09:00',
            'check_out' => '17:00',
            'status' => 'present',
        ]);
        $resAtt2->assertStatus(422);

        // 3. Payment amount exceeding outstanding balance must be rejected
        $payroll = $this->payrollService->generatePayroll($this->tenantA->id, '2026-10', '2026-10-01', '2026-10-31', $this->accountantA->id);
        $this->payrollService->approvePayroll($payroll->id, $this->tenantA->id, $this->ownerA->id);

        $resOverpay = $this->postJson("/api/v1/hr/payrolls/{$payroll->id}/pay", [
            'amount' => 999999.00, // Exceeds balance
            'payment_date' => '2026-10-31',
            'payment_method' => 'cash',
        ]);
        $resOverpay->assertStatus(422);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Color;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\GarmentModel;
use App\Models\Payroll;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\QualityDefect;
use App\Models\QualityDefectAdjustment;
use App\Models\QualityInspection;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\FinancialReportService;
use App\Services\PayrollService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkforceAndCostingPhase09BTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $ownerA;
    protected User $prodMgrA;
    protected User $accountantA;
    protected User $workerA;
    protected User $prodMgrB;
    protected Branch $branchA;
    protected Warehouse $warehouseA;
    protected GarmentModel $modelA;
    protected ProductionOrder $orderA;
    protected Employee $employeeA1;
    protected Employee $employeeA2;
    protected PieceRate $rateSewing;
    protected Color $colorA;
    protected Size $sizeA;
    protected PayrollService $payrollService;
    protected AccountingService $accountingService;
    protected FinancialReportService $reportService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->payrollService = app(PayrollService::class);
        $this->accountingService = app(AccountingService::class);
        $this->reportService = app(FinancialReportService::class);

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

        // Users for Tenant A
        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Owner Alpha',
            'email' => 'owner@alpha.test',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->prodMgrA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Prod Manager Alpha',
            'email' => 'prod@alpha.test',
            'role' => 'production_manager',
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

        $this->workerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Worker User Alpha',
            'email' => 'worker@alpha.test',
            'role' => 'worker',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        // Users for Tenant B
        $this->prodMgrB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Prod Manager Beta',
            'email' => 'prod@beta.test',
            'role' => 'production_manager',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        // Warehouse & Branch
        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Main Fabric Store',
            'code' => 'WH-01',
            'type' => 'fabric',
            'is_active' => true,
        ]);

        $this->branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Main Workshop Alpha',
            'code' => 'BR-01',
            'is_main' => true,
        ]);

        $this->colorA = Color::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Navy Blue',
            'color_code' => '#000080',
        ]);

        $this->sizeA = Size::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Large',
            'category' => 'adults',
            'sort_order' => 1,
        ]);

        $this->modelA = GarmentModel::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSHIRT',
            'name' => 'Classic Polo T-Shirt',
            'category' => 't-shirts',
            'season' => 'Summer 2026',
        ]);

        $this->orderA = ProductionOrder::create([
            'tenant_id' => $this->tenantA->id,
            'order_number' => 'PO-2026-001',
            'garment_model_id' => $this->modelA->id,
            'branch_id' => $this->branchA->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(14)->toDateString(),
            'total_planned_quantity' => 200,
            'total_completed_quantity' => 200,
            'status' => 'in_progress',
        ]);

        $this->employeeA1 = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-001',
            'name' => 'Ahmed Sewing Worker',
            'department' => 'sewing',
            'job_title' => 'Sewing Operator',
            'pay_type' => 'piece_rate',
            'base_salary' => 1500.0000,
            'is_active' => true,
        ]);

        $this->employeeA2 = Employee::create([
            'tenant_id' => $this->tenantA->id,
            'employee_code' => 'EMP-002',
            'name' => 'Mahmoud Overlock Worker',
            'department' => 'sewing',
            'job_title' => 'Overlock Operator',
            'pay_type' => 'piece_rate',
            'base_salary' => 1200.0000,
            'is_active' => true,
        ]);

        $this->rateSewing = PieceRate::create([
            'tenant_id' => $this->tenantA->id,
            'garment_model_id' => $this->modelA->id,
            'stage_name' => 'sewing',
            'operation_name' => 'Front Placket Sewing',
            'rate_per_piece' => 10.0000,
            'is_active' => true,
        ]);
    }

    /** 1. Defect report cannot generate deduction before manager approval */
    public function test_defect_report_does_not_deduct_wages_without_explicit_approval(): void
    {
        Sanctum::actingAs($this->prodMgrA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $response = $this->postJson('/api/v1/hr/defect-adjustments', [
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'adjustment_reason' => 'Defective collar seam stitching',
            'proposed_penalty_amount' => 150.0000,
            'investigation_notes' => '5 pieces destroyed due to machine tension neglect',
        ]);

        $response->assertStatus(201);
        $adjustmentId = $response->json('defect_adjustment.id');
        $this->assertEquals('pending_approval', $response->json('defect_adjustment.status'));

        // Generate payroll - deduction MUST NOT be deducted because it is not approved yet
        $payroll = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W43',
            now()->startOfWeek()->toDateString(),
            now()->endOfWeek()->toDateString()
        );

        $item = $payroll->items()->where('employee_id', $this->employeeA1->id)->first();
        $this->assertEquals(0, (float)$item->deductions_and_advances, 'Deductions must remain 0 for pending adjustments');
        $this->assertEquals(1500.0, (float)$item->net_salary);

        // Verify adjustment record remains pending and not settled
        $adj = QualityDefectAdjustment::find($adjustmentId);
        $this->assertEquals('pending_approval', $adj->status);
        $this->assertNull($adj->settled_payroll_id);
    }

    /** 2. An unauthorized user cannot approve a defect deduction */
    public function test_unauthorized_user_cannot_approve_defect_deduction(): void
    {
        $adj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $this->orderA->id,
            'employee_id' => $this->employeeA1->id,
            'adjustment_reason' => 'Crooked stitch',
            'proposed_penalty_amount' => 100.0000,
            'status' => 'pending_approval',
            'reported_by' => $this->prodMgrA->id,
        ]);

        // Worker role attempting to approve
        Sanctum::actingAs($this->workerA);
        app()->instance('current_tenant_id', $this->tenantA->id);
        $response = $this->postJson("/api/v1/hr/defect-adjustments/{$adj->id}/approve");

        $response->assertStatus(403);
        $this->assertEquals('pending_approval', $adj->fresh()->status);

        // Production manager CAN approve
        Sanctum::actingAs($this->prodMgrA);
        $approveResponse = $this->postJson("/api/v1/hr/defect-adjustments/{$adj->id}/approve", [
            'approved_amount' => 80.0000,
        ]);

        $approveResponse->assertStatus(200);
        $freshAdj = $adj->fresh();
        $this->assertEquals('approved', $freshAdj->status);
        $this->assertEquals(80.0000, (float)$freshAdj->proposed_penalty_amount);
        $this->assertEquals($this->prodMgrA->id, $freshAdj->approved_by);
        $this->assertNotNull($freshAdj->approved_at);
    }

    /** 3. Tenant isolation prevents cross-tenant access and approval (IDOR protection) */
    public function test_tenant_isolation_prevents_cross_tenant_defect_and_payroll_access(): void
    {
        $adjA = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $this->orderA->id,
            'employee_id' => $this->employeeA1->id,
            'adjustment_reason' => 'Tenant A defect',
            'proposed_penalty_amount' => 200.0000,
            'status' => 'pending_approval',
            'reported_by' => $this->prodMgrA->id,
        ]);

        // Prod Mgr of Tenant B tries to approve Tenant A's adjustment
        Sanctum::actingAs($this->prodMgrB);
        app()->instance('current_tenant_id', $this->tenantB->id);

        $response = $this->postJson("/api/v1/hr/defect-adjustments/{$adjA->id}/approve");

        $response->assertStatus(404);
        $this->assertEquals('pending_approval', $adjA->fresh()->status);
    }

    /** 4. Duplicate approvals and repeat payroll runs cannot create duplicate deductions */
    public function test_duplicate_approvals_cannot_create_duplicate_deductions(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $adj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $this->orderA->id,
            'employee_id' => $this->employeeA1->id,
            'adjustment_reason' => 'Burnt fabric during pressing',
            'proposed_penalty_amount' => 120.0000,
            'status' => 'approved',
            'reported_by' => $this->prodMgrA->id,
            'approved_by' => $this->prodMgrA->id,
            'approved_at' => now(),
        ]);

        // 1st payroll run for Week 44
        $payroll1 = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W44',
            '2026-10-19',
            '2026-10-25'
        );

        $item1 = $payroll1->items()->where('employee_id', $this->employeeA1->id)->first();
        $this->assertEquals(120.0, (float)$item1->deductions_and_advances);
        $this->assertEquals('settled', $adj->fresh()->status);
        $this->assertEquals($payroll1->id, $adj->fresh()->settled_payroll_id);

        // 2nd payroll run for next week (Week 45) - the defect must NOT be deducted again!
        $payroll2 = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W45',
            '2026-10-26',
            '2026-11-01'
        );

        $item2 = $payroll2->items()->where('employee_id', $this->employeeA1->id)->first();
        $this->assertEquals(0.0, (float)$item2->deductions_and_advances, 'Settled defect must never be deducted twice');
    }

    /** 5. An objection is recorded and cannot silently erase the audit history */
    public function test_worker_objection_is_recorded_and_preserves_audit_trail(): void
    {
        $adj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $this->orderA->id,
            'employee_id' => $this->employeeA1->id,
            'adjustment_reason' => 'Broken needle damage',
            'proposed_penalty_amount' => 90.0000,
            'status' => 'pending_approval',
            'reported_by' => $this->prodMgrA->id,
        ]);

        Sanctum::actingAs($this->workerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $response = $this->postJson("/api/v1/hr/defect-adjustments/{$adj->id}/object", [
            'objection_notes' => 'The machine needle broke because of wrong thread tension setup done by maintenance mechanic, not worker negligence.',
        ]);

        $response->assertStatus(200);
        $fresh = $adj->fresh();
        $this->assertEquals('objected', $fresh->status);
        $this->assertStringContainsString('wrong thread tension', $fresh->worker_objection_notes);
        $this->assertNotNull($fresh->objection_submitted_at);

        // Production manager decides to reject the deduction after reviewing objection
        Sanctum::actingAs($this->prodMgrA);
        $rejectResponse = $this->postJson("/api/v1/hr/defect-adjustments/{$adj->id}/reject", [
            'rejection_reason' => 'Objection accepted: maintenance log confirms mechanic issue',
        ]);

        $rejectResponse->assertStatus(200);
        $finalAdj = $adj->fresh();
        $this->assertEquals('rejected', $finalAdj->status);
        $this->assertEquals($this->prodMgrA->id, $finalAdj->reversed_by);
        $this->assertNotNull($finalAdj->reversed_at);
        // Ensure objection history wasn't erased
        $this->assertStringContainsString('wrong thread tension', $finalAdj->worker_objection_notes);
    }

    /** 6. Corrections and reversals preserve the original financial record via compensating records */
    public function test_reversals_preserve_original_record_and_issue_compensating_credit(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $adj = QualityDefectAdjustment::create([
            'tenant_id' => $this->tenantA->id,
            'production_order_id' => $this->orderA->id,
            'employee_id' => $this->employeeA1->id,
            'adjustment_reason' => 'Fabric tear during trimming',
            'proposed_penalty_amount' => 150.0000,
            'status' => 'approved',
            'reported_by' => $this->prodMgrA->id,
            'approved_by' => $this->prodMgrA->id,
            'approved_at' => now(),
        ]);

        // Settle in payroll
        $payroll1 = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W46',
            '2026-11-02',
            '2026-11-08'
        );
        $this->assertEquals('settled', $adj->fresh()->status);

        // Reverse the adjustment with auditable reason
        Sanctum::actingAs($this->prodMgrA);
        $response = $this->postJson("/api/v1/hr/defect-adjustments/{$adj->id}/reverse", [
            'reversal_reason' => 'Quality lab proved raw fabric batch was defective from supplier',
        ]);

        $response->assertStatus(200);
        $fresh = $adj->fresh();
        $this->assertEquals('reversed', $fresh->status);
        $this->assertEquals('Quality lab proved raw fabric batch was defective from supplier', $fresh->reversal_reason);
        $this->assertNotNull($fresh->reversed_at);

        // Original record still exists, and a compensating negative penalty was created
        $compensating = QualityDefectAdjustment::where('tenant_id', $this->tenantA->id)
            ->where('employee_id', $this->employeeA1->id)
            ->where('proposed_penalty_amount', '<', 0)
            ->first();

        $this->assertNotNull($compensating);
        $this->assertEquals(-150.0000, (float)$compensating->proposed_penalty_amount);
        $this->assertEquals('approved', $compensating->status);
    }

    /** 7. Paid payroll is not silently recalculated */
    public function test_paid_payroll_is_not_silently_recalculated(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $payroll = $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W47',
            '2026-11-09',
            '2026-11-15'
        );

        // Mark payroll as paid
        Sanctum::actingAs($this->accountantA);
        $response = $this->postJson("/api/v1/hr/payrolls/{$payroll->id}/pay");

        $response->assertStatus(200);
        $this->assertEquals('paid', $payroll->fresh()->status);

        // Attempt to regenerate or recalculate paid payroll must fail
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('مدفوع مسبقاً ولا يمكن تعديله');

        $this->payrollService->generatePayroll(
            $this->tenantA->id,
            '2026-W47',
            '2026-11-09',
            '2026-11-15'
        );
    }

    /** 8 & 9. Tenant overhead configuration at 0%, 15%, 100%, and rejection of invalid rates */
    public function test_tenant_overhead_configuration_rates_and_validation(): void
    {
        Sanctum::actingAs($this->ownerA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Default when unset is 0.15 (15%)
        $this->assertEquals(0.15, $this->tenantA->getManufacturingOverheadRate());

        // 2. Configure 0% overhead
        $res0 = $this->putJson('/api/v1/tenant/settings/costing', [
            'manufacturing_overhead_rate' => 0.0,
        ]);
        $res0->assertStatus(200);
        $this->assertEquals(0.0, $this->tenantA->fresh()->getManufacturingOverheadRate());

        // 3. Configure 100% overhead
        $res100 = $this->putJson('/api/v1/tenant/settings/costing', [
            'manufacturing_overhead_rate' => 1.0,
        ]);
        $res100->assertStatus(200);
        $this->assertEquals(1.0, $this->tenantA->fresh()->getManufacturingOverheadRate());

        // 4. Configure 25% overhead (0.25)
        $res25 = $this->putJson('/api/v1/tenant/settings/costing', [
            'manufacturing_overhead_rate' => 0.25,
        ]);
        $res25->assertStatus(200);
        $this->assertEquals(0.25, $this->tenantA->fresh()->getManufacturingOverheadRate());

        // 5. Invalid rates must be rejected (> 1.0 or < 0.0 or non-numeric)
        $resInvalidOver = $this->putJson('/api/v1/tenant/settings/costing', [
            'manufacturing_overhead_rate' => 1.5,
        ]);
        $resInvalidOver->assertStatus(422);

        $resInvalidNeg = $this->putJson('/api/v1/tenant/settings/costing', [
            'manufacturing_overhead_rate' => -0.05,
        ]);
        $resInvalidNeg->assertStatus(422);
    }

    /** 10. Tenant overhead settings cannot leak between tenants */
    public function test_tenant_overhead_settings_do_not_leak_between_tenants(): void
    {
        // Set Tenant A to 20%
        $this->tenantA->settings = ['manufacturing_overhead_rate' => 0.20];
        $this->tenantA->save();

        // Tenant B remains default 15%
        $this->assertEquals(0.20, $this->tenantA->fresh()->getManufacturingOverheadRate());
        $this->assertEquals(0.15, $this->tenantB->fresh()->getManufacturingOverheadRate());
    }

    /** 11. Historical finalized costing snapshots remain unchanged after configuration updates */
    public function test_finalized_cost_sheets_retain_historical_overhead_snapshot(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        // Set Tenant A overhead to 18%
        $this->tenantA->settings = ['manufacturing_overhead_rate' => 0.18];
        $this->tenantA->save();

        // Calculate cost sheet
        $costSheet = $this->accountingService->calculateProductionCost($this->orderA->id, [
            'direct_materials_cost' => 1000.0,
            'direct_labor_cost' => 500.0,
            'subcontracted_services_cost' => 0.0,
        ]);

        $this->assertEquals(0.18, (float)$costSheet->applied_overhead_rate);
        $this->assertEquals(270.0, (float)$costSheet->allocated_overhead_cost); // (1000 + 500) * 0.18 = 270

        // Finalize / approve cost sheet
        $costSheet->status = 'approved';
        $costSheet->save();

        // Now tenant administrator changes overhead rate to 30%
        $this->tenantA->settings = ['manufacturing_overhead_rate' => 0.30];
        $this->tenantA->save();

        // Recalculating must NOT alter approved historical sheet
        $recalculated = $this->accountingService->calculateProductionCost($this->orderA->id);
        $this->assertEquals(0.18, (float)$recalculated->applied_overhead_rate);
        $this->assertEquals(270.0, (float)$recalculated->allocated_overhead_cost);
    }

    /** 12. Multi-batch piece-rate logging succeeds within bundle limits, rejects excessive over-logging */
    public function test_multi_batch_piecework_logging_and_bundle_limit_enforcement(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $cuttingOrder = CuttingOrder::create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_number' => 'CUT-001',
            'production_order_id' => $this->orderA->id,
            'warehouse_id' => $this->warehouseA->id,
            'lay_length_meters' => 5.0,
            'layers_count' => 10,
            'total_cut_pieces' => 50,
            'status' => 'cut_completed',
        ]);

        $bundle = CuttingBundle::create([
            'tenant_id' => $this->tenantA->id,
            'cutting_order_id' => $cuttingOrder->id,
            'production_order_id' => $this->orderA->id,
            'bundle_code' => 'BND-ALPHA-50',
            'bundle_number' => 1,
            'color_id' => $this->colorA->id,
            'size_id' => $this->sizeA->id,
            'quantity' => 50,
            'current_stage_code' => 'sewing',
            'status' => 'active',
        ]);

        // Worker 1 logs 30 pieces
        $log1 = $this->payrollService->recordPieceWork([
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'cutting_bundle_id' => $bundle->id,
            'piece_rate_id' => $this->rateSewing->id,
            'completed_quantity' => 30,
        ]);
        $this->assertEquals(30, $log1->completed_quantity);
        $this->assertEquals(300.0, (float)$log1->total_amount);

        // Worker 2 logs 20 pieces (total 50 == bundle quantity) -> legitimate multi-batch succeeds!
        $log2 = $this->payrollService->recordPieceWork([
            'employee_id' => $this->employeeA2->id,
            'production_order_id' => $this->orderA->id,
            'cutting_bundle_id' => $bundle->id,
            'piece_rate_id' => $this->rateSewing->id,
            'completed_quantity' => 20,
        ]);
        $this->assertEquals(20, $log2->completed_quantity);

        // Third attempt exceeds bundle capacity (50 + 5 > 50) -> must be rejected
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('يتجاوز سعة الحزمة');

        $this->payrollService->recordPieceWork([
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'cutting_bundle_id' => $bundle->id,
            'piece_rate_id' => $this->rateSewing->id,
            'completed_quantity' => 5,
        ]);
    }

    /** 13. Manager can approve or reject piece-work logs with rejection reason */
    public function test_manager_can_approve_or_reject_piece_work_logs(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);

        $log = PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'piece_rate_id' => $this->rateSewing->id,
            'completed_quantity' => 15,
            'unit_rate' => 10.0,
            'total_amount' => 150.0,
            'work_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        // Manager approves
        Sanctum::actingAs($this->prodMgrA);
        $approveRes = $this->postJson("/api/v1/hr/piece-work-logs/{$log->id}/approve");

        $approveRes->assertStatus(200);
        $this->assertEquals('approved', $log->fresh()->status);
        $this->assertEquals($this->prodMgrA->id, $log->fresh()->approved_by);
        $this->assertNotNull($log->fresh()->approved_at);

        // Another log rejected
        $log2 = PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'piece_rate_id' => $this->rateSewing->id,
            'completed_quantity' => 25,
            'unit_rate' => 10.0,
            'total_amount' => 250.0,
            'work_date' => now()->toDateString(),
            'status' => 'pending',
        ]);

        $rejectRes = $this->postJson("/api/v1/hr/piece-work-logs/{$log2->id}/reject", [
            'rejection_reason' => 'Work logged under wrong production order batch',
        ]);

        $rejectRes->assertStatus(200);
        $this->assertEquals('rejected', $log2->fresh()->status);
        $this->assertEquals('Work logged under wrong production order batch', $log2->fresh()->rejection_reason);
    }

    /** 14. Piecework quantity reconciliation flips labor_dependency.status to verified when matching */
    public function test_piecework_reconciliation_in_manufacturing_cost_variance(): void
    {
        Sanctum::actingAs($this->accountantA);
        app()->instance('current_tenant_id', $this->tenantA->id);

        // 1. Without piece-rate logs -> incomplete_dependency_phase_09
        $varianceRes1 = $this->getJson("/api/v1/accounting/reports/cost-variance?production_order_id={$this->orderA->id}");

        $varianceRes1->assertStatus(200);
        $row1 = $varianceRes1->json('orders.0');
        $this->assertEquals('incomplete_dependency_phase_09', $row1['labor_dependency']['status']);

        // 2. Partial logging (50 of 200 pieces) -> partially_verified
        PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $this->employeeA1->id,
            'production_order_id' => $this->orderA->id,
            'completed_quantity' => 50,
            'unit_rate' => 10.0,
            'total_amount' => 500.0,
            'work_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        $varianceRes2 = $this->getJson("/api/v1/accounting/reports/cost-variance?production_order_id={$this->orderA->id}");

        $varianceRes2->assertStatus(200);
        $row2 = $varianceRes2->json('orders.0');
        $this->assertEquals('partially_verified', $row2['labor_dependency']['status']);
        $this->assertStringContainsString('50 قطعة', $row2['labor_dependency']['note']);

        // 3. Complete logging (remaining 150 pieces logged -> total 200 pieces == order pieces) -> verified
        PieceWorkLog::create([
            'tenant_id' => $this->tenantA->id,
            'employee_id' => $this->employeeA2->id,
            'production_order_id' => $this->orderA->id,
            'completed_quantity' => 150,
            'unit_rate' => 10.0,
            'total_amount' => 1500.0,
            'work_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        $varianceRes3 = $this->getJson("/api/v1/accounting/reports/cost-variance?production_order_id={$this->orderA->id}");

        $varianceRes3->assertStatus(200);
        $row3 = $varianceRes3->json('orders.0');
        $this->assertEquals('verified', $row3['labor_dependency']['status']);
        $this->assertEquals(2000.0, (float)$row3['actual_cost_breakdown']['labor']);
        $this->assertNotNull($row3['actual_cost_breakdown']['applied_overhead_rate']);
    }
}

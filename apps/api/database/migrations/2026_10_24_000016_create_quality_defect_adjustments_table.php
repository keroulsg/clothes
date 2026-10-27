<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 09B: Quality-Control Defect Adjustments & Auditable Worker Deductions
     */
    public function up(): void
    {
        if (!Schema::hasTable('quality_defect_adjustments')) {
            Schema::create('quality_defect_adjustments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('quality_defect_id')->nullable()->index();
                $table->uuid('quality_inspection_id')->nullable()->index();
                $table->uuid('production_order_id')->index();
                $table->uuid('cutting_bundle_id')->nullable()->index();
                $table->uuid('employee_id')->index();
                $table->uuid('production_stage_id')->nullable()->index();
                $table->text('investigation_notes')->nullable();
                $table->decimal('proposed_penalty_amount', 14, 4)->default(0);
                $table->string('adjustment_reason', 255);
                // Status flow: pending_approval -> approved / rejected / objected -> settled -> reversed
                $table->string('status', 50)->default('pending_approval');
                $table->unsignedBigInteger('reported_by')->nullable()->index();
                $table->unsignedBigInteger('approved_by')->nullable()->index();
                $table->timestamp('approved_at')->nullable();
                $table->text('worker_objection_notes')->nullable();
                $table->timestamp('objection_submitted_at')->nullable();
                $table->uuid('settled_payroll_id')->nullable()->index();
                $table->uuid('settled_payroll_item_id')->nullable()->index();
                $table->text('reversal_reason')->nullable();
                $table->unsignedBigInteger('reversed_by')->nullable()->index();
                $table->timestamp('reversed_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
                $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
                $table->foreign('cutting_bundle_id')->references('id')->on('cutting_bundles')->onDelete('set null');
                $table->foreign('quality_defect_id')->references('id')->on('quality_defects')->onDelete('set null');
                $table->foreign('quality_inspection_id')->references('id')->on('quality_inspections')->onDelete('set null');
                $table->foreign('reported_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('reversed_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('settled_payroll_id')->references('id')->on('payrolls')->onDelete('set null');
                $table->foreign('settled_payroll_item_id')->references('id')->on('payroll_items')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_defect_adjustments');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 9: HR, Employees, Piece-Rate Work, Worker Productivity Logs, Payroll
     */
    public function up(): void
    {
        // 1. سجل الموظفين والعمال (Employees)
        Schema::create('employees', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('employee_code', 50);
            $table->string('name', 255);
            $table->string('national_id', 50)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('department', 50); // cutting, sewing, finishing, quality, packing, warehouse, admin
            $table->string('job_title', 100);
            $table->string('pay_type', 50)->default('piece_rate'); // piece_rate, fixed_salary, hourly, hybrid
            $table->decimal('base_salary', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'employee_code']);
        });

        // 2. تسعيرة العمليات وأجر القطعة (Piece Rates by Operation)
        Schema::create('piece_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('garment_model_id')->nullable()->index();
            $table->string('stage_name', 50); // cutting, sewing, overlock, buttonhole, embroidery, ironing, packing
            $table->string('operation_name', 100);
            $table->decimal('rate_per_piece', 14, 4);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('set null');
        });

        // 3. سجل إنتاجية العامل وأجر القطعة المعتمد من الرقابة (Piece Work Logs)
        Schema::create('piece_work_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('employee_id')->index();
            $table->uuid('production_order_id')->nullable()->index();
            $table->uuid('cutting_bundle_id')->nullable()->index();
            $table->uuid('piece_rate_id')->nullable()->index();
            $table->date('work_date');
            $table->integer('completed_quantity');
            $table->decimal('unit_rate', 14, 4);
            $table->decimal('total_amount', 14, 4);
            $table->string('status', 50)->default('verified'); // pending, verified, approved, paid
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('set null');
            $table->foreign('cutting_bundle_id')->references('id')->on('cutting_bundles')->onDelete('set null');
            $table->foreign('piece_rate_id')->references('id')->on('piece_rates')->onDelete('set null');
        });

        // 4. مسيرات الرواتب (Payrolls)
        Schema::create('payrolls', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('payroll_period', 50); // e.g. 2026-W42 or 2026-10
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('total_gross', 14, 4)->default(0);
            $table->decimal('total_deductions', 14, 4)->default(0);
            $table->decimal('total_net', 14, 4)->default(0);
            $table->string('status', 50)->default('draft'); // draft, approved, paid
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'payroll_period']);
        });

        Schema::create('payroll_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('payroll_id')->index();
            $table->uuid('employee_id')->index();
            $table->decimal('base_amount', 14, 4)->default(0);
            $table->decimal('piece_rate_earnings', 14, 4)->default(0);
            $table->decimal('overtime_earnings', 14, 4)->default(0);
            $table->decimal('deductions_and_advances', 14, 4)->default(0);
            $table->decimal('net_salary', 14, 4);
            $table->boolean('is_paid')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('payroll_id')->references('id')->on('payrolls')->onDelete('cascade');
            $table->foreign('employee_id')->references('id')->on('employees')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('piece_work_logs');
        Schema::dropIfExists('piece_rates');
        Schema::dropIfExists('employees');
    }
};

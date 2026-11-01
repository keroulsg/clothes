<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase C: Complete Workforce, Attendance, Worker Compensation, Advances, and Payroll Engine
     */
    public function up(): void
    {
        // 1. تحديث جدول الموظفين والعمال (Enhance Employees Table)
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'branch_id')) {
                $table->uuid('branch_id')->nullable()->index();
            }
            if (!Schema::hasColumn('employees', 'hire_date')) {
                $table->date('hire_date')->nullable();
            }
            if (!Schema::hasColumn('employees', 'termination_date')) {
                $table->date('termination_date')->nullable();
            }
            if (!Schema::hasColumn('employees', 'hourly_rate')) {
                $table->decimal('hourly_rate', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('employees', 'daily_rate')) {
                $table->decimal('daily_rate', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('employees', 'shift_name')) {
                $table->string('shift_name', 50)->nullable()->default('morning');
            }
        });

        // 2. تحديث جدول مسيرات الرواتب (Enhance Payrolls Table)
        Schema::table('payrolls', function (Blueprint $table) {
            if (!Schema::hasColumn('payrolls', 'total_paid')) {
                $table->decimal('total_paid', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payrolls', 'approved_by')) {
                $table->uuid('approved_by')->nullable();
            }
            if (!Schema::hasColumn('payrolls', 'approved_at')) {
                $table->datetime('approved_at')->nullable();
            }
            if (!Schema::hasColumn('payrolls', 'rejection_reason')) {
                $table->string('rejection_reason', 255)->nullable();
            }
            if (!Schema::hasColumn('payrolls', 'finalized_by')) {
                $table->uuid('finalized_by')->nullable();
            }
            if (!Schema::hasColumn('payrolls', 'finalized_at')) {
                $table->datetime('finalized_at')->nullable();
            }
            if (!Schema::hasColumn('payrolls', 'notes')) {
                $table->text('notes')->nullable();
            }
        });

        // 3. تحديث بنود مسير الرواتب (Enhance Payroll Items Table)
        Schema::table('payroll_items', function (Blueprint $table) {
            if (!Schema::hasColumn('payroll_items', 'hourly_earnings')) {
                $table->decimal('hourly_earnings', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'daily_earnings')) {
                $table->decimal('daily_earnings', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'allowances_and_bonuses')) {
                $table->decimal('allowances_and_bonuses', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'advances_repaid')) {
                $table->decimal('advances_repaid', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'defect_deductions')) {
                $table->decimal('defect_deductions', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'general_deductions')) {
                $table->decimal('general_deductions', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'gross_amount')) {
                $table->decimal('gross_amount', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'paid_amount')) {
                $table->decimal('paid_amount', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'balance_due')) {
                $table->decimal('balance_due', 14, 4)->default(0);
            }
            if (!Schema::hasColumn('payroll_items', 'calculation_breakdown')) {
                $table->json('calculation_breakdown')->nullable();
            }
        });

        // 4. جدول الحضور والانصراف وساعات العمل (Attendances)
        if (!Schema::hasTable('attendances')) {
            Schema::create('attendances', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('employee_id')->index();
                $table->uuid('branch_id')->nullable()->index();
                $table->date('attendance_date');
                $table->time('check_in')->nullable();
                $table->time('check_out')->nullable();
                $table->string('status', 50)->default('present'); // present, absent, late, excused_leave, unexcused_leave, half_day
                $table->decimal('working_hours', 8, 2)->default(0);
                $table->decimal('overtime_hours', 8, 2)->default(0);
                $table->integer('late_minutes')->default(0);
                $table->integer('early_departure_minutes')->default(0);
                $table->boolean('is_payable')->default(true);
                $table->string('notes', 255)->nullable();
                $table->uuid('created_by')->nullable();
                $table->uuid('updated_by')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
                $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
                $table->unique(['tenant_id', 'employee_id', 'attendance_date'], 'att_tenant_emp_date_unique');
            });
        }

        // 5. جدول السلف والمكافآت والبدلات والخصومات العامة (Employee Adjustments)
        if (!Schema::hasTable('employee_adjustments')) {
            Schema::create('employee_adjustments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('employee_id')->index();
                $table->string('type', 50); // advance, advance_repayment, allowance, bonus, deduction
                $table->decimal('amount', 14, 4);
                $table->string('currency', 10)->default('EGP');
                $table->date('adjustment_date');
                $table->string('payroll_period', 50)->nullable();
                $table->string('reason', 255);
                $table->text('notes')->nullable();
                $table->string('status', 50)->default('pending_approval'); // pending_approval, approved, rejected, settled
                $table->uuid('approved_by')->nullable();
                $table->datetime('approved_at')->nullable();
                $table->uuid('settled_payroll_id')->nullable()->index();
                $table->uuid('created_by')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('cascade');
                $table->foreign('settled_payroll_id')->references('id')->on('payrolls')->onDelete('set null');
            });
        }

        // 6. جدول مدفوعات وسندات صرف الرواتب (Payroll Payments)
        if (!Schema::hasTable('payroll_payments')) {
            Schema::create('payroll_payments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('payroll_id')->index();
                $table->uuid('payroll_item_id')->nullable()->index();
                $table->uuid('employee_id')->nullable()->index();
                $table->date('payment_date');
                $table->decimal('amount', 14, 4);
                $table->string('payment_method', 50)->default('cash'); // cash, bank_transfer, cheque, instapay
                $table->string('reference_number', 100)->nullable();
                $table->text('notes')->nullable();
                $table->uuid('paid_by')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('payroll_id')->references('id')->on('payrolls')->onDelete('cascade');
                $table->foreign('payroll_item_id')->references('id')->on('payroll_items')->onDelete('set null');
                $table->foreign('employee_id')->references('id')->on('employees')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_payments');
        Schema::dropIfExists('employee_adjustments');
        Schema::dropIfExists('attendances');

        Schema::table('payroll_items', function (Blueprint $table) {
            $table->dropColumn([
                'hourly_earnings',
                'daily_earnings',
                'allowances_and_bonuses',
                'advances_repaid',
                'defect_deductions',
                'general_deductions',
                'gross_amount',
                'paid_amount',
                'balance_due',
                'calculation_breakdown',
            ]);
        });

        Schema::table('payrolls', function (Blueprint $table) {
            $table->dropColumn([
                'total_paid',
                'approved_by',
                'approved_at',
                'rejection_reason',
                'finalized_by',
                'finalized_at',
                'notes',
            ]);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'branch_id',
                'hire_date',
                'termination_date',
                'hourly_rate',
                'daily_rate',
                'shift_name',
            ]);
        });
    }
};

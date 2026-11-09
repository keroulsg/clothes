<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Batch 3: Production, Cutting, Bundles, Workers & Attendance.
     */
    public function up(): void
    {
        // 1. تحديث جدول أوامر الإنتاج
        Schema::table('production_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('production_orders', 'customer_id')) {
                $table->uuid('customer_id')->nullable()->after('branch_id');
            }
            if (!Schema::hasColumn('production_orders', 'sales_order_id')) {
                $table->uuid('sales_order_id')->nullable()->after('customer_id');
            }
            if (!Schema::hasColumn('production_orders', 'responsible_person')) {
                $table->string('responsible_person', 150)->nullable()->after('priority');
            }
            if (!Schema::hasColumn('production_orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('production_orders', 'cancellation_reason')) {
                $table->string('cancellation_reason', 255)->nullable()->after('cancelled_at');
            }
        });

        // 2. تحديث جدول أوامر القص
        Schema::table('cutting_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('cutting_orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('cutting_orders', 'cancellation_reason')) {
                $table->string('cancellation_reason', 255)->nullable()->after('cancelled_at');
            }
        });

        // 3. تحديث جدول بطاقات الحزم
        Schema::table('cutting_bundles', function (Blueprint $table) {
            if (!Schema::hasColumn('cutting_bundles', 'assigned_employee_id')) {
                $table->uuid('assigned_employee_id')->nullable()->after('product_variant_id');
            }
            if (!Schema::hasColumn('cutting_bundles', 'work_group')) {
                $table->string('work_group', 100)->nullable()->after('assigned_employee_id');
            }
            if (!Schema::hasColumn('cutting_bundles', 'issue_date')) {
                $table->date('issue_date')->nullable()->after('work_group');
            }
            if (!Schema::hasColumn('cutting_bundles', 'due_date')) {
                $table->date('due_date')->nullable()->after('issue_date');
            }
            if (!Schema::hasColumn('cutting_bundles', 'completion_date')) {
                $table->date('completion_date')->nullable()->after('due_date');
            }
            if (!Schema::hasColumn('cutting_bundles', 'accepted_quantity')) {
                $table->integer('accepted_quantity')->default(0)->after('quantity');
            }
            if (!Schema::hasColumn('cutting_bundles', 'rejected_quantity')) {
                $table->integer('rejected_quantity')->default(0)->after('accepted_quantity');
            }
            if (!Schema::hasColumn('cutting_bundles', 'rework_quantity')) {
                $table->integer('rework_quantity')->default(0)->after('rejected_quantity');
            }
        });

        // 4. تحديث جدول سجل حركات الحزم
        Schema::table('bundle_stage_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('bundle_stage_logs', 'employee_id')) {
                $table->uuid('employee_id')->nullable()->after('production_stage_id');
            }
            if (!Schema::hasColumn('bundle_stage_logs', 'rework_quantity')) {
                $table->integer('rework_quantity')->default(0)->after('output_rejected_quantity');
            }
            if (!Schema::hasColumn('bundle_stage_logs', 'notes')) {
                $table->text('notes')->nullable()->after('logged_at');
            }
        });

        // 5. تحديث جدول الموظفين والعمال
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'weekly_rate')) {
                $table->decimal('weekly_rate', 12, 4)->default(0)->after('daily_rate');
            }
            if (!Schema::hasColumn('employees', 'shift_rate')) {
                $table->decimal('shift_rate', 12, 4)->default(0)->after('weekly_rate');
            }
            if (!Schema::hasColumn('employees', 'skills')) {
                $table->text('skills')->nullable()->after('shift_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Keep down clean
    }
};


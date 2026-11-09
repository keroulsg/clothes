<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for linking cutting and subcontracting to workforce.
     */
    public function up(): void
    {
        // 1. إضافة المقصدار لأوامر القص
        Schema::table('cutting_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('cutting_orders', 'assigned_cutter_id')) {
                $table->uuid('assigned_cutter_id')->nullable()->after('warehouse_id');
            }
            if (!Schema::hasColumn('cutting_orders', 'cutter_unit_rate')) {
                $table->decimal('cutter_unit_rate', 10, 4)->nullable()->after('assigned_cutter_id');
            }
        });

        // 2. ربط سجلات أجور القطعة بأوامر القص وأوامر التشغيل للغير
        Schema::table('piece_work_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('piece_work_logs', 'cutting_order_id')) {
                $table->uuid('cutting_order_id')->nullable()->after('cutting_bundle_id');
            }
            if (!Schema::hasColumn('piece_work_logs', 'job_order_id')) {
                $table->uuid('job_order_id')->nullable()->after('cutting_order_id');
            }
        });

        // 3. إضافة الفني المسؤول لأوامر التشغيل للغير والعمليات الخارجية
        Schema::table('job_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('job_orders', 'assigned_employee_id')) {
                $table->uuid('assigned_employee_id')->nullable()->after('garment_model_id');
            }
        });

        Schema::table('external_operations', function (Blueprint $table) {
            if (!Schema::hasColumn('external_operations', 'assigned_employee_id')) {
                $table->uuid('assigned_employee_id')->nullable()->after('subcontractor_name');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cutting_orders', function (Blueprint $table) {
            if (Schema::hasColumn('cutting_orders', 'cutter_unit_rate')) {
                $table->dropColumn('cutter_unit_rate');
            }
            if (Schema::hasColumn('cutting_orders', 'assigned_cutter_id')) {
                $table->dropColumn('assigned_cutter_id');
            }
        });

        Schema::table('piece_work_logs', function (Blueprint $table) {
            if (Schema::hasColumn('piece_work_logs', 'job_order_id')) {
                $table->dropColumn('job_order_id');
            }
            if (Schema::hasColumn('piece_work_logs', 'cutting_order_id')) {
                $table->dropColumn('cutting_order_id');
            }
        });

        Schema::table('job_orders', function (Blueprint $table) {
            if (Schema::hasColumn('job_orders', 'assigned_employee_id')) {
                $table->dropColumn('assigned_employee_id');
            }
        });

        Schema::table('external_operations', function (Blueprint $table) {
            if (Schema::hasColumn('external_operations', 'assigned_employee_id')) {
                $table->dropColumn('assigned_employee_id');
            }
        });
    }
};


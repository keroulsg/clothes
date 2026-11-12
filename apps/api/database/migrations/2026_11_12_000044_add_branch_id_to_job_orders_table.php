<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('job_orders', 'branch_id')) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->uuid('branch_id')->nullable()->index();
                $table->foreign('branch_id')->references('id')->on('branches')->nullOnDelete();
            });
        }

        // Backfill only missing branch ownership; existing non-null values are never overwritten.
        DB::table('job_orders')->whereNull('branch_id')->orderBy('id')->chunkById(100, function ($jobs) {
            foreach ($jobs as $job) {
                $branchId = null;
                if ($job->production_order_id) {
                    $branchId = DB::table('production_orders')->where('id', $job->production_order_id)->value('branch_id');
                }
                if (!$branchId && $job->assigned_employee_id) {
                    $branchId = DB::table('employees')->where('id', $job->assigned_employee_id)->value('branch_id');
                }
                if (!$branchId) {
                    $branchId = DB::table('cutting_orders')
                        ->join('warehouses', 'warehouses.id', '=', 'cutting_orders.warehouse_id')
                        ->where('cutting_orders.job_order_id', $job->id)
                        ->value('warehouses.branch_id');
                }
                if ($branchId) {
                    DB::table('job_orders')->where('id', $job->id)->whereNull('branch_id')->update(['branch_id' => $branchId]);
                }
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('job_orders', 'branch_id')) {
            Schema::table('job_orders', function (Blueprint $table) {
                $table->dropForeign(['branch_id']);
                $table->dropColumn('branch_id');
            });
        }
    }
};

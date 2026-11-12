<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Schema;

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

        // Backfill only when every available legacy ownership anchor agrees.
        // All lookups are tenant-scoped so corrupt cross-tenant references cannot
        // assign a job to another tenant's branch.
        DB::table('job_orders')->whereNull('branch_id')->orderBy('id')->chunkById(100, function ($jobs) {
            foreach ($jobs as $job) {
                $candidateBranchIds = [];

                if ($job->production_order_id) {
                    $branchId = DB::table('production_orders')
                        ->join('branches', function ($join) {
                            $join->on('branches.id', '=', 'production_orders.branch_id')
                                ->on('branches.tenant_id', '=', 'production_orders.tenant_id');
                        })
                        ->where('production_orders.id', $job->production_order_id)
                        ->where('production_orders.tenant_id', $job->tenant_id)
                        ->value('production_orders.branch_id');
                    if ($branchId) {
                        $candidateBranchIds[] = $branchId;
                    }
                }

                if ($job->assigned_employee_id) {
                    $branchId = DB::table('employees')
                        ->join('branches', function ($join) {
                            $join->on('branches.id', '=', 'employees.branch_id')
                                ->on('branches.tenant_id', '=', 'employees.tenant_id');
                        })
                        ->where('employees.id', $job->assigned_employee_id)
                        ->where('employees.tenant_id', $job->tenant_id)
                        ->value('employees.branch_id');
                    if ($branchId) {
                        $candidateBranchIds[] = $branchId;
                    }
                }

                $cuttingBranchId = DB::table('cutting_orders')
                    ->join('warehouses', function ($join) {
                        $join->on('warehouses.id', '=', 'cutting_orders.warehouse_id')
                            ->on('warehouses.tenant_id', '=', 'cutting_orders.tenant_id');
                    })
                    ->join('branches', function ($join) {
                        $join->on('branches.id', '=', 'warehouses.branch_id')
                            ->on('branches.tenant_id', '=', 'warehouses.tenant_id');
                    })
                    ->where('cutting_orders.job_order_id', $job->id)
                    ->where('cutting_orders.tenant_id', $job->tenant_id)
                    ->value('warehouses.branch_id');

                if ($cuttingBranchId) {
                    $candidateBranchIds[] = $cuttingBranchId;
                }

                $candidateBranchIds = array_values(array_unique($candidateBranchIds));
                if (count($candidateBranchIds) === 1) {
                    DB::table('job_orders')
                        ->where('id', $job->id)
                        ->where('tenant_id', $job->tenant_id)
                        ->whereNull('branch_id')
                        ->update(['branch_id' => $candidateBranchIds[0]]);
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

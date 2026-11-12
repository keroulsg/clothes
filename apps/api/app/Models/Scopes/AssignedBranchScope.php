<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AssignedBranchScope implements Scope
{
    /** @var array<string, array<string, bool>> */
    private static array $columnCache = [];

    public function apply(Builder $builder, Model $model): void
    {
        $table = $model->getTable();
        $hasBranchId = $this->hasColumn($table, 'branch_id');
        $hasWarehouseId = $this->hasColumn($table, 'warehouse_id');

        // Models that are not branch-bound (including Branch itself) must not
        // perform user/branch relationship queries from inside this global scope.
        if (!$hasBranchId && !$hasWarehouseId) {
            return;
        }

        $user = auth()->user();
        if (!$user || $user->role === 'company_owner' || !$user->tenant_id) {
            return;
        }

        // Apply branch isolation when an owner has explicitly configured granular
        // permissions or assigned one or more branches. Legacy users without either
        // remain compatible until the owner reviews and assigns their branches.
        $hasAssignments = DB::table('branch_user')->where('user_id', $user->id)->exists();
        if (!$user->hasExplicitPermissionConfiguration() && !$hasAssignments) {
            return;
        }

        $branchIds = $user->assignedBranchIds();

        if ($hasBranchId) {
            $builder->whereIn($model->qualifyColumn('branch_id'), $branchIds);
            return;
        }

        if ($hasWarehouseId) {
            $warehouseIds = DB::table('warehouses')
                ->where('tenant_id', $user->tenant_id)
                ->whereIn('branch_id', $branchIds)
                ->select('id');

            $builder->whereIn($model->qualifyColumn('warehouse_id'), $warehouseIds);
        }
    }

    private function hasColumn(string $table, string $column): bool
    {
        if (!isset(self::$columnCache[$table][$column])) {
            self::$columnCache[$table][$column] = Schema::hasColumn($table, $column);
        }

        return self::$columnCache[$table][$column];
    }
}

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
        $user = auth()->user();
        if (!$user || $user->role === 'company_owner' || !$user->tenant_id) {
            return;
        }

        // Branch scoping becomes mandatory whenever the owner explicitly configures
        // a user's permissions. Legacy inherit-mode accounts keep their current data
        // visibility until the owner reviews and assigns their branches.
        if (!$user->hasExplicitPermissionConfiguration() && !$user->branches()->exists()) {
            return;
        }

        $branchIds = $user->assignedBranchIds();
        $table = $model->getTable();

        if ($this->hasColumn($table, 'branch_id')) {
            $builder->whereIn($model->qualifyColumn('branch_id'), $branchIds);
            return;
        }

        if ($this->hasColumn($table, 'warehouse_id')) {
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

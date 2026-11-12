<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $actorColumns = [
        'store_orders' => ['payment_reviewed_by_user_id'],
        'financial_account_transfers' => ['created_by_user_id'],
        'fiscal_years' => ['closed_by_user_id'],
        'fiscal_periods' => ['closed_by_user_id', 'reopened_by_user_id'],
        'payrolls' => ['approved_by_user_id', 'finalized_by_user_id'],
        'attendances' => ['created_by_user_id', 'updated_by_user_id'],
        'employee_adjustments' => ['approved_by_user_id', 'created_by_user_id'],
        'payroll_payments' => ['paid_by_user_id'],
        'journal_entries' => ['created_by_user_id', 'approved_by_user_id', 'posted_by_user_id'],
    ];

    public function up(): void
    {
        foreach ($this->actorColumns as $tableName => $columns) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            foreach ($columns as $column) {
                if (Schema::hasColumn($tableName, $column)) {
                    continue;
                }

                Schema::table($tableName, function (Blueprint $table) use ($column) {
                    $table->foreignId($column)->nullable()->constrained('users')->nullOnDelete();
                });
            }
        }

        if (Schema::hasTable('journal_entries') && !Schema::hasColumn('journal_entries', 'reference_key')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                $table->string('reference_key', 64)->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('journal_entries') && Schema::hasColumn('journal_entries', 'reference_key')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                $table->dropIndex(['reference_key']);
                $table->dropColumn('reference_key');
            });
        }

        foreach (array_reverse($this->actorColumns, true) as $tableName => $columns) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            foreach (array_reverse($columns) as $column) {
                if (!Schema::hasColumn($tableName, $column)) {
                    continue;
                }

                Schema::table($tableName, function (Blueprint $table) use ($column) {
                    $table->dropConstrainedForeignId($column);
                });
            }
        }
    }
};

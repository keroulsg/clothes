<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('store_orders') && !Schema::hasColumn('store_orders', 'payment_reviewed_by_user_id')) {
            Schema::table('store_orders', function (Blueprint $table) {
                $table->foreignId('payment_reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }

        if (Schema::hasTable('financial_account_transfers') && !Schema::hasColumn('financial_account_transfers', 'created_by_user_id')) {
            Schema::table('financial_account_transfers', function (Blueprint $table) {
                $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }

        if (Schema::hasTable('fiscal_years') && !Schema::hasColumn('fiscal_years', 'closed_by_user_id')) {
            Schema::table('fiscal_years', function (Blueprint $table) {
                $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }

        if (Schema::hasTable('fiscal_periods')) {
            Schema::table('fiscal_periods', function (Blueprint $table) {
                if (!Schema::hasColumn('fiscal_periods', 'closed_by_user_id')) {
                    $table->foreignId('closed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('fiscal_periods', 'reopened_by_user_id')) {
                    $table->foreignId('reopened_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
            });
        }

        if (Schema::hasTable('fiscal_periods')) {
            Schema::table('fiscal_periods', function (Blueprint $table) {
                foreach (['closed_by_user_id', 'reopened_by_user_id'] as $column) {
                    if (Schema::hasColumn('fiscal_periods', $column)) {
                        $table->dropConstrainedForeignId($column);
                    }
                }
            });
        }

        if (Schema::hasTable('fiscal_years') && Schema::hasColumn('fiscal_years', 'closed_by_user_id')) {
            Schema::table('fiscal_years', function (Blueprint $table) {
                $table->dropConstrainedForeignId('closed_by_user_id');
            });
        }

        if (Schema::hasTable('financial_account_transfers') && Schema::hasColumn('financial_account_transfers', 'created_by_user_id')) {
            Schema::table('financial_account_transfers', function (Blueprint $table) {
                $table->dropConstrainedForeignId('created_by_user_id');
            });
        }

        $actorColumns = [
            'piece_work_logs' => ['approved_by_user_id'],
            'payrolls' => ['approved_by_user_id', 'finalized_by_user_id'],
            'attendances' => ['created_by_user_id', 'updated_by_user_id'],
            'employee_adjustments' => ['approved_by_user_id', 'created_by_user_id'],
            'payroll_payments' => ['paid_by_user_id'],
        ];

        foreach ($actorColumns as $tableName => $columns) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName, $columns) {
                foreach ($columns as $column) {
                    if (!Schema::hasColumn($tableName, $column)) {
                        $table->foreignId($column)->nullable()->constrained('users')->nullOnDelete();
                    }
                }
            });
        }

        $actorColumns = [
            'piece_work_logs' => ['approved_by_user_id'],
            'payrolls' => ['approved_by_user_id', 'finalized_by_user_id'],
            'attendances' => ['created_by_user_id', 'updated_by_user_id'],
            'employee_adjustments' => ['approved_by_user_id', 'created_by_user_id'],
            'payroll_payments' => ['paid_by_user_id'],
        ];

        foreach ($actorColumns as $tableName => $columns) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName, $columns) {
                foreach ($columns as $column) {
                    if (Schema::hasColumn($tableName, $column)) {
                        $table->dropConstrainedForeignId($column);
                    }
                }
            });
        }

        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                if (!Schema::hasColumn('journal_entries', 'created_by_user_id')) {
                    $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('journal_entries', 'approved_by_user_id')) {
                    $table->foreignId('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('journal_entries', 'posted_by_user_id')) {
                    $table->foreignId('posted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                }
                if (!Schema::hasColumn('journal_entries', 'reference_key')) {
                    $table->string('reference_key', 64)->nullable()->index();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('journal_entries')) {
            Schema::table('journal_entries', function (Blueprint $table) {
                foreach (['created_by_user_id', 'approved_by_user_id', 'posted_by_user_id'] as $column) {
                    if (Schema::hasColumn('journal_entries', $column)) {
                        $table->dropConstrainedForeignId($column);
                    }
                }
                if (Schema::hasColumn('journal_entries', 'reference_key')) {
                    $table->dropColumn('reference_key');
                }
            });
        }

        if (Schema::hasTable('store_orders') && Schema::hasColumn('store_orders', 'payment_reviewed_by_user_id')) {
            Schema::table('store_orders', function (Blueprint $table) {
                $table->dropConstrainedForeignId('payment_reviewed_by_user_id');
            });
        }
    }
};

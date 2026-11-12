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

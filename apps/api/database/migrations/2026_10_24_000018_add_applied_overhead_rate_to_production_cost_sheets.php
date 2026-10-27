<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 09B: Snapshot Applied Manufacturing Overhead Rate on Production Cost Sheets
     */
    public function up(): void
    {
        if (Schema::hasTable('production_cost_sheets')) {
            Schema::table('production_cost_sheets', function (Blueprint $table) {
                if (!Schema::hasColumn('production_cost_sheets', 'applied_overhead_rate')) {
                    $table->decimal('applied_overhead_rate', 6, 4)->nullable()->default(0.1500)->after('allocated_overhead_cost');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('production_cost_sheets')) {
            Schema::table('production_cost_sheets', function (Blueprint $table) {
                if (Schema::hasColumn('production_cost_sheets', 'applied_overhead_rate')) {
                    $table->dropColumn('applied_overhead_rate');
                }
            });
        }
    }
};

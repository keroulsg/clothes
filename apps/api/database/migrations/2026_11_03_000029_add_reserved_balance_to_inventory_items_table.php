<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('inventory_items') && !Schema::hasColumn('inventory_items', 'reserved_balance')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                $table->decimal('reserved_balance', 14, 4)->default(0)->after('current_balance');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventory_items') && Schema::hasColumn('inventory_items', 'reserved_balance')) {
            Schema::table('inventory_items', function (Blueprint $table) {
                $table->dropColumn('reserved_balance');
            });
        }
    }
};


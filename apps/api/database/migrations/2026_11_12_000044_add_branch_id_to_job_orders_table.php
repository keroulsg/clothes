<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
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

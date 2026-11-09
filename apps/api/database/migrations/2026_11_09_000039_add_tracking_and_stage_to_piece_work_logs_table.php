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
        Schema::table('piece_work_logs', function (Blueprint $table) {
            $table->string('stage_code', 50)->nullable()->after('piece_rate_id');
            $table->string('operation_name', 150)->nullable()->after('stage_code');
            $table->string('cut_name', 150)->nullable()->after('operation_name');
            $table->timestamp('started_at')->nullable()->after('work_date');
            $table->timestamp('completed_at')->nullable()->after('started_at');
            $table->text('notes')->nullable()->after('rejection_reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('piece_work_logs', function (Blueprint $table) {
            $table->dropColumn([
                'stage_code',
                'operation_name',
                'cut_name',
                'started_at',
                'completed_at',
                'notes',
            ]);
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 09B: Manager Approval & Rejection Tracking for Piece-Work Productivity Logs
     */
    public function up(): void
    {
        if (Schema::hasTable('piece_work_logs')) {
            Schema::table('piece_work_logs', function (Blueprint $table) {
                if (!Schema::hasColumn('piece_work_logs', 'approved_by')) {
                    $table->unsignedBigInteger('approved_by')->nullable()->after('status')->index();
                    $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                }
                if (!Schema::hasColumn('piece_work_logs', 'approved_at')) {
                    $table->timestamp('approved_at')->nullable()->after('approved_by');
                }
                if (!Schema::hasColumn('piece_work_logs', 'rejection_reason')) {
                    $table->string('rejection_reason', 255)->nullable()->after('approved_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('piece_work_logs')) {
            Schema::table('piece_work_logs', function (Blueprint $table) {
                if (Schema::hasColumn('piece_work_logs', 'approved_by')) {
                    $table->dropForeign(['approved_by']);
                    $table->dropColumn('approved_by');
                }
                if (Schema::hasColumn('piece_work_logs', 'approved_at')) {
                    $table->dropColumn('approved_at');
                }
                if (Schema::hasColumn('piece_work_logs', 'rejection_reason')) {
                    $table->dropColumn('rejection_reason');
                }
            });
        }
    }
};

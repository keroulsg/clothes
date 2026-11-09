<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Batch 9: Self-Service Store Customizer (Draft vs Published Theme State & Rollback Support)
     */
    public function up(): void
    {
        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->string('draft_theme_id', 50)->nullable()->after('theme_config');
            $table->json('draft_theme_config')->nullable()->after('draft_theme_id');
            $table->json('previous_published_config')->nullable()->after('draft_theme_config');
            $table->timestamp('published_at')->nullable()->after('previous_published_config');
            $table->unsignedBigInteger('published_by')->nullable()->after('published_at');

            $table->foreign('published_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->dropForeign(['published_by']);
            $table->dropColumn([
                'draft_theme_id',
                'draft_theme_config',
                'previous_published_config',
                'published_at',
                'published_by',
            ]);
        });
    }
};


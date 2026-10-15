<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $connection = $this->getConnection() ?? config('database.default');
        $schema = Schema::connection($connection);

        if (!$schema->hasTable('processed_webhook_events')) {
            return;
        }

        // 1. فحص سلامة السجلات التاريخية لضمان عدم وجود تكرار لنفس (provider, event_id)
        $duplicates = DB::connection($connection)->table('processed_webhook_events')
            ->select('provider', 'event_id')
            ->groupBy('provider', 'event_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($duplicates->isNotEmpty()) {
            $first = $duplicates->first();
            throw new \RuntimeException(
                "Migration Aborted: Detected duplicate event [{$first->event_id}] for provider [{$first->provider}]. " .
                "Cannot enforce composite UNIQUE without manual remediation."
            );
        }

        // 2. تحديث قيد التفرد ليكون مركباً على مستوى (provider, event_id)
        $schema->table('processed_webhook_events', function (Blueprint $table) use ($connection) {
            try {
                $table->dropUnique(['event_id']);
            } catch (\Throwable) {
                // قد يكون الاسم الافتراضي مختلفاً في بعض المحركات
                try {
                    $table->dropUnique('processed_webhook_events_event_id_unique');
                } catch (\Throwable) {
                }
            }

            $table->unique(['provider', 'event_id'], 'uniq_pwe_provider_event_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $connection = $this->getConnection() ?? config('database.default');
        $schema = Schema::connection($connection);

        if (!$schema->hasTable('processed_webhook_events')) {
            return;
        }

        $schema->table('processed_webhook_events', function (Blueprint $table) {
            try {
                $table->dropUnique('uniq_pwe_provider_event_id');
                $table->unique('event_id');
            } catch (\Throwable) {
            }
        });
    }
};

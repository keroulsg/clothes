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

        // 2. كشف اسم قيد التفرد الفردي القديم على عمود event_id حصراً
        $existingIndexes = $schema->getIndexes('processed_webhook_events');
        $oldIndexName = null;
        foreach ($existingIndexes as $index) {
            if (!empty($index['unique']) && empty($index['primary']) && ($index['columns'] ?? []) === ['event_id']) {
                $oldIndexName = $index['name'];
                break;
            }
        }

        // 3. حذف القيد القديم دون ابتلاع الأخطاء
        if ($oldIndexName !== null) {
            $schema->table('processed_webhook_events', function (Blueprint $table) use ($oldIndexName) {
                $table->dropUnique($oldIndexName);
            });
        }

        // 4. إنشاء قيد التفرد المركب (provider, event_id) بأمان
        $compositeExists = false;
        foreach ($schema->getIndexes('processed_webhook_events') as $index) {
            if (!empty($index['unique']) && ($index['columns'] ?? []) === ['provider', 'event_id']) {
                $compositeExists = true;
                break;
            }
        }

        if (!$compositeExists) {
            $schema->table('processed_webhook_events', function (Blueprint $table) {
                $table->unique(['provider', 'event_id'], 'uniq_pwe_provider_event_id');
            });
        }

        // 5. التحقق الصارم من حالة المخطط النهائي
        $postIndexes = $schema->getIndexes('processed_webhook_events');
        $oldIndexStillPresent = false;
        $compositeVerified = false;

        foreach ($postIndexes as $index) {
            if (!empty($index['unique']) && empty($index['primary']) && ($index['columns'] ?? []) === ['event_id']) {
                $oldIndexStillPresent = true;
            }
            if (!empty($index['unique']) && ($index['columns'] ?? []) === ['provider', 'event_id']) {
                $compositeVerified = true;
            }
        }

        if ($oldIndexStillPresent) {
            throw new \RuntimeException(
                "Migration Error: Failed to drop single-column unique index on 'event_id' in 'processed_webhook_events'."
            );
        }

        if (!$compositeVerified) {
            throw new \RuntimeException(
                "Migration Error: Failed to establish composite unique index (provider, event_id) on 'processed_webhook_events'."
            );
        }
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

        // 1. كشف قيد التفرد المركب وحذفه
        $compositeName = null;
        foreach ($schema->getIndexes('processed_webhook_events') as $index) {
            if (!empty($index['unique']) && ($index['columns'] ?? []) === ['provider', 'event_id']) {
                $compositeName = $index['name'];
                break;
            }
        }

        if ($compositeName !== null) {
            $schema->table('processed_webhook_events', function (Blueprint $table) use ($compositeName) {
                $table->dropUnique($compositeName);
            });
        }

        // 2. إعادة إنشاء قيد التفرد الفردي القديم
        $schema->table('processed_webhook_events', function (Blueprint $table) {
            $table->unique('event_id', 'processed_webhook_events_event_id_unique');
        });

        // 3. التحقق من نجاح التراجع
        $downIndexes = $schema->getIndexes('processed_webhook_events');
        $recreated = false;
        foreach ($downIndexes as $index) {
            if (!empty($index['unique']) && empty($index['primary']) && ($index['columns'] ?? []) === ['event_id']) {
                $recreated = true;
                break;
            }
        }

        if (!$recreated) {
            throw new \RuntimeException("Migration Rollback Error: Failed to recreate unique index on 'event_id'.");
        }
    }
};

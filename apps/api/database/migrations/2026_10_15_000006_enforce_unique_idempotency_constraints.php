<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * الجداول المستهدفة لفرض قيد التفرد على مستوى الشركة ومفتاح عدم التكرار
     */
    private array $tables = [
        'inventory_transactions' => 'uniq_inv_tx_tenant_idemp',
        'supplier_invoices' => 'uniq_sinv_tenant_idemp',
        'goods_receipt_notes' => 'uniq_grn_tenant_idemp',
        'production_orders' => 'uniq_prod_order_tenant_idemp',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->tables as $tableName => $indexName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'idempotency_key')) {
                continue;
            }

            // 1. فحص سلامة البيانات التاريخية قبل إضافة قيد التفرد
            // إذا وُجد أي تكرار سابق لنفس مفتاح عدم التكرار داخل نفس الشركة يتم إيقاف الهجرة بأمان
            $duplicates = DB::table($tableName)
                ->select('tenant_id', 'idempotency_key', DB::raw('COUNT(*) as duplicate_count'))
                ->whereNotNull('idempotency_key')
                ->groupBy('tenant_id', 'idempotency_key')
                ->having('duplicate_count', '>', 1)
                ->get();

            if ($duplicates->isNotEmpty()) {
                $first = $duplicates->first();
                throw new \RuntimeException(
                    "Migration Aborted: Detected duplicate idempotency_key [{$first->idempotency_key}] " .
                    "for tenant_id [{$first->tenant_id}] in table [{$tableName}]. " .
                    "Cannot enforce UNIQUE constraint without manual remediation."
                );
            }

            // 2. تطبيق قيد التفرد المركب (tenant_id + idempotency_key)
            Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                $table->unique(['tenant_id', 'idempotency_key'], $indexName);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->tables as $tableName => $indexName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'idempotency_key')) {
                Schema::table($tableName, function (Blueprint $table) use ($indexName) {
                    $table->dropUnique($indexName);
                });
            }
        }
    }
};

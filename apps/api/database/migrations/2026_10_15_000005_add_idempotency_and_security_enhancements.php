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
        // 1. إضافة مفتاح منع تكرار العمليات للحركات المخزنية
        if (Schema::hasTable('inventory_transactions')) {
            Schema::table('inventory_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_transactions', 'idempotency_key')) {
                    $table->string('idempotency_key', 120)->nullable()->index()->after('user_id');
                }
            });
        }

        // 2. إضافة مفتاح منع تكرار فواتير الموردين والعمليات المالية
        if (Schema::hasTable('supplier_invoices')) {
            Schema::table('supplier_invoices', function (Blueprint $table) {
                if (!Schema::hasColumn('supplier_invoices', 'idempotency_key')) {
                    $table->string('idempotency_key', 120)->nullable()->index()->after('tax_amount');
                }
            });
        }

        // 3. إضافة مفتاح منع تكرار استلام البضائع
        if (Schema::hasTable('goods_receipt_notes')) {
            Schema::table('goods_receipt_notes', function (Blueprint $table) {
                if (!Schema::hasColumn('goods_receipt_notes', 'idempotency_key')) {
                    $table->string('idempotency_key', 120)->nullable()->index()->after('notes');
                }
            });
        }

        // 4. إضافة مفتاح منع تكرار أوامر الإنتاج
        if (Schema::hasTable('production_orders')) {
            Schema::table('production_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('production_orders', 'idempotency_key')) {
                    $table->string('idempotency_key', 120)->nullable()->index()->after('notes');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventory_transactions') && Schema::hasColumn('inventory_transactions', 'idempotency_key')) {
            Schema::table('inventory_transactions', function (Blueprint $table) {
                $table->dropColumn('idempotency_key');
            });
        }

        if (Schema::hasTable('supplier_invoices') && Schema::hasColumn('supplier_invoices', 'idempotency_key')) {
            Schema::table('supplier_invoices', function (Blueprint $table) {
                $table->dropColumn('idempotency_key');
            });
        }

        if (Schema::hasTable('goods_receipt_notes') && Schema::hasColumn('goods_receipt_notes', 'idempotency_key')) {
            Schema::table('goods_receipt_notes', function (Blueprint $table) {
                $table->dropColumn('idempotency_key');
            });
        }

        if (Schema::hasTable('production_orders') && Schema::hasColumn('production_orders', 'idempotency_key')) {
            Schema::table('production_orders', function (Blueprint $table) {
                $table->dropColumn('idempotency_key');
            });
        }
    }
};

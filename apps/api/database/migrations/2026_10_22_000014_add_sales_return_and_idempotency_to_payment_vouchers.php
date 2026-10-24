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
        Schema::table('payment_vouchers', function (Blueprint $table) {
            if (!Schema::hasColumn('payment_vouchers', 'sales_return_id')) {
                $table->uuid('sales_return_id')->nullable()->index()->after('party_id');
                $table->foreign('sales_return_id')->references('id')->on('sales_returns')->onDelete('set null');
            }

            if (!Schema::hasColumn('payment_vouchers', 'idempotency_key')) {
                $table->string('idempotency_key', 100)->nullable()->after('notes');
                $table->unique(['tenant_id', 'idempotency_key'], 'uniq_pv_tenant_idemp');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_vouchers', function (Blueprint $table) {
            if (Schema::hasColumn('payment_vouchers', 'idempotency_key')) {
                $table->dropUnique('uniq_pv_tenant_idemp');
                $table->dropColumn('idempotency_key');
            }

            if (Schema::hasColumn('payment_vouchers', 'sales_return_id')) {
                $table->dropForeign(['sales_return_id']);
                $table->dropColumn('sales_return_id');
            }
        });
    }
};

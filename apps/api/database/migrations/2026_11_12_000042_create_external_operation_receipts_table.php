<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('external_operation_receipts')) {
            return;
        }

        Schema::create('external_operation_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('external_operation_id')->index();
            $table->unsignedInteger('accepted_quantity')->default(0);
            $table->unsignedInteger('rejected_quantity')->default(0);
            $table->unsignedInteger('scrap_quantity')->default(0);
            $table->decimal('unit_rate', 15, 4)->default(0);
            $table->decimal('total_cost', 15, 4)->default(0);
            $table->string('idempotency_key', 120);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'idempotency_key'], 'ext_op_receipts_tenant_idem_unique');
            $table->index(['tenant_id', 'external_operation_id'], 'ext_op_receipts_tenant_operation_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('external_operation_receipts');
    }
};

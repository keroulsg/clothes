<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('quality_inspections')) {
            return;
        }

        Schema::table('quality_inspections', function (Blueprint $table) {
            if (!Schema::hasColumn('quality_inspections', 'idempotency_key')) {
                $table->string('idempotency_key', 120)->nullable();
            }
            if (!Schema::hasColumn('quality_inspections', 'idempotency_fingerprint')) {
                $table->string('idempotency_fingerprint', 64)->nullable();
            }
        });

        Schema::table('quality_inspections', function (Blueprint $table) {
            $table->unique(['tenant_id', 'idempotency_key'], 'quality_inspections_tenant_idem_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('quality_inspections')) {
            return;
        }

        Schema::table('quality_inspections', function (Blueprint $table) {
            $table->dropUnique('quality_inspections_tenant_idem_unique');
            if (Schema::hasColumn('quality_inspections', 'idempotency_fingerprint')) {
                $table->dropColumn('idempotency_fingerprint');
            }
            if (Schema::hasColumn('quality_inspections', 'idempotency_key')) {
                $table->dropColumn('idempotency_key');
            }
        });
    }
};

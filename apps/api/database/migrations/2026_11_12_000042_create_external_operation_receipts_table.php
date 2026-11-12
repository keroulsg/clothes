<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

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

        // Preserve legacy returned work while correcting dispatch-time cost estimates:
        // only quantities physically returned are migrated into the actual receipt ledger.
        if (Schema::hasTable('external_operations')) {
            DB::table('external_operations')
                ->whereRaw('(COALESCE(received_accepted_quantity, 0) + COALESCE(received_rejected_quantity, 0) + COALESCE(scrap_quantity, 0)) > 0')
                ->orderBy('id')
                ->chunk(500, function ($operations): void {
                    foreach ($operations as $operation) {
                        $accepted = (int) ($operation->received_accepted_quantity ?? 0);
                        $rejected = (int) ($operation->received_rejected_quantity ?? 0);
                        $scrap = (int) ($operation->scrap_quantity ?? 0);
                        $returnedQuantity = $accepted + $rejected + $scrap;
                        $sentQuantity = (int) ($operation->sent_quantity ?? 0);
                        $legacyTotalCost = (float) ($operation->total_cost ?? 0);
                        $unitRate = (float) ($operation->unit_rate ?? 0);

                        if ($returnedQuantity <= 0) {
                            continue;
                        }

                        $actualUnitRate = $unitRate > 0
                            ? $unitRate
                            : ($sentQuantity > 0 ? $legacyTotalCost / $sentQuantity : 0.0);
                        $actualCost = round($returnedQuantity * $actualUnitRate, 4);

                        if ($actualCost <= 0) {
                            continue;
                        }

                        DB::table('external_operation_receipts')->insert([
                            'id' => (string) Str::uuid(),
                            'tenant_id' => $operation->tenant_id,
                            'external_operation_id' => $operation->id,
                            'accepted_quantity' => $accepted,
                            'rejected_quantity' => $rejected,
                            'scrap_quantity' => $scrap,
                            'unit_rate' => $actualUnitRate,
                            'total_cost' => $actualCost,
                            'idempotency_key' => 'LEGACY-' . $operation->id,
                            'notes' => 'Backfilled from legacy cumulative external-operation receipt totals',
                            'created_at' => $operation->returned_at ?? $operation->updated_at ?? now(),
                            'updated_at' => $operation->updated_at ?? now(),
                        ]);

                        DB::table('external_operations')
                            ->where('id', $operation->id)
                            ->update(['total_cost' => $actualCost]);
                    }
                });

            // Old dispatch-time estimates without any returned quantity are not incurred costs.
            DB::table('external_operations')
                ->whereRaw('(COALESCE(received_accepted_quantity, 0) + COALESCE(received_rejected_quantity, 0) + COALESCE(scrap_quantity, 0)) = 0')
                ->update(['total_cost' => 0]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('external_operation_receipts');
    }
};

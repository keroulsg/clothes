<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('sales_invoices', 'warehouse_id')) {
            Schema::table('sales_invoices', function (Blueprint $table) {
                $table->uuid('warehouse_id')->nullable()->after('sales_order_id')->index();
                $table->foreign('warehouse_id')->references('id')->on('warehouses')->nullOnDelete();
            });
        }

        // Backfill existing invoices with their source warehouse
        $invoices = DB::table('sales_invoices')->get();
        foreach ($invoices as $inv) {
            $whId = null;
            if ($inv->sales_order_id) {
                $order = DB::table('sales_orders')->where('id', $inv->sales_order_id)->first();
                if ($order && $order->warehouse_id) {
                    $whId = $order->warehouse_id;
                }
            }
            if (!$whId) {
                $fgWh = DB::table('warehouses')
                    ->where('tenant_id', $inv->tenant_id)
                    ->where('type', 'finished_goods')
                    ->first();
                if (!$fgWh) {
                    $fgWh = DB::table('warehouses')
                        ->where('tenant_id', $inv->tenant_id)
                        ->first();
                }
                if ($fgWh) {
                    $whId = $fgWh->id;
                }
            }
            if ($whId) {
                DB::table('sales_invoices')->where('id', $inv->id)->update(['warehouse_id' => $whId]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sales_invoices', 'warehouse_id')) {
            Schema::table('sales_invoices', function (Blueprint $table) {
                $table->dropForeign(['warehouse_id']);
                $table->dropColumn('warehouse_id');
            });
        }
    }
};

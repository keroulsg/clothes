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
        if (Schema::hasTable('employee_adjustments')) {
            Schema::table('employee_adjustments', function (Blueprint $table) {
                if (!Schema::hasColumn('employee_adjustments', 'installments_count')) {
                    $table->unsignedInteger('installments_count')->default(1)->after('currency');
                }
                if (!Schema::hasColumn('employee_adjustments', 'installment_amount')) {
                    $table->decimal('installment_amount', 14, 4)->nullable()->after('installments_count');
                }
                if (!Schema::hasColumn('employee_adjustments', 'paid_amount')) {
                    $table->decimal('paid_amount', 14, 4)->default(0)->after('installment_amount');
                }
                if (!Schema::hasColumn('employee_adjustments', 'remaining_balance')) {
                    $table->decimal('remaining_balance', 14, 4)->nullable()->after('paid_amount');
                }
            });

            // تحديث السجلات السابقة لتهيئتها بنظام الأقساط والرصيد المتبقي
            DB::table('employee_adjustments')->whereNull('remaining_balance')->get()->each(function ($adj) {
                $status = $adj->status ?? 'pending_approval';
                $isSettled = ($status === 'settled' || !empty($adj->settled_payroll_id));
                $amount = (float)$adj->amount;

                DB::table('employee_adjustments')->where('id', $adj->id)->update([
                    'installments_count' => 1,
                    'installment_amount' => $amount,
                    'paid_amount' => $isSettled ? $amount : 0.0,
                    'remaining_balance' => $isSettled ? 0.0 : $amount,
                ]);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('employee_adjustments')) {
            Schema::table('employee_adjustments', function (Blueprint $table) {
                $columns = ['installments_count', 'installment_amount', 'paid_amount', 'remaining_balance'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('employee_adjustments', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};


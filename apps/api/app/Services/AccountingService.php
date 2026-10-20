<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use App\Models\GarmentModel;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentVoucher;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AccountingService
{
    /**
     * إعداد شجرة الحسابات المحاسبية الافتراضية لمصنع الملابس
     */
    public function initializeDefaultChartOfAccounts(string $tenantId): void
    {
        $defaultAccounts = [
            ['code' => '1010', 'name' => 'نقدية بالصندوق والخزينة', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '1020', 'name' => 'حسابات البنوك الجارية', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '1110', 'name' => 'العملاء والمدينون التجاريون', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '1210', 'name' => 'مخزون الأقمشة والخامات', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '1220', 'name' => 'مخزون الإنتاج تحت التشغيل (WIP)', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '1230', 'name' => 'مخزون المنتجات التامة الجاهزة للبيع', 'type' => 'asset', 'category' => 'current_asset'],
            ['code' => '2010', 'name' => 'الموردون والدائنون التجاريون', 'type' => 'liability', 'category' => 'current_liability'],
            ['code' => '2020', 'name' => 'مستحقات أجور عمال الإنتاج', 'type' => 'liability', 'category' => 'current_liability'],
            ['code' => '3010', 'name' => 'رأس المال وحقوق الملكية', 'type' => 'equity', 'category' => 'equity'],
            ['code' => '4010', 'name' => 'إيراد مبيعات الملابس والإنتاج التام', 'type' => 'revenue', 'category' => 'sales_revenue'],
            ['code' => '4020', 'name' => 'إيراد خدمات التشغيل والقص للغير (CMT)', 'type' => 'revenue', 'category' => 'sales_revenue'],
            ['code' => '5010', 'name' => 'تكلفة البضاعة المباعة (COGS)', 'type' => 'expense', 'category' => 'direct_cost'],
            ['code' => '5020', 'name' => 'أجور عمال الإنتاج المباشرة (أجر القطعة)', 'type' => 'expense', 'category' => 'direct_cost'],
            ['code' => '5030', 'name' => 'مصاريف تشغيل صناعي خارجي (تطريز/طباعة)', 'type' => 'expense', 'category' => 'direct_cost'],
            ['code' => '6010', 'name' => 'مصاريف صناعية غير مباشرة واستهلاك ماكينات', 'type' => 'expense', 'category' => 'indirect_cost'],
        ];

        foreach ($defaultAccounts as $acc) {
            ChartOfAccount::firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => $acc['code']],
                [
                    'name' => $acc['name'],
                    'type' => $acc['type'],
                    'category' => $acc['category'],
                    'current_balance' => 0,
                    'is_active' => true,
                ]
            );
        }
    }

    /**
     * تسجيل قيد يومية عام مع اشتراط التوازن المحاسبي التام (Strict Double-Entry Balanced)
     */
    public function createJournalEntry(array $data): JournalEntry
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $lines = $data['lines'] ?? [];
            if (empty($lines)) {
                throw new InvalidArgumentException('يجب أن يحتوي قيد اليومية على سطرين محاسبيين على الأقل.');
            }

            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($lines as $line) {
                $debit = round((float) ($line['debit'] ?? 0), 4);
                $credit = round((float) ($line['credit'] ?? 0), 4);

                if ($debit < 0 || $credit < 0) {
                    throw new InvalidArgumentException('لا يمكن قبول مبالغ سالبة في أطراف القيد المحاسبي.');
                }

                if ($debit > 0 && $credit > 0) {
                    throw new InvalidArgumentException('لا يمكن للسطر المحاسبي الواحد أن يكون مديناً ودائناً معاً.');
                }

                $totalDebit += $debit;
                $totalCredit += $credit;
            }

            // فحص توازن القيد بدقة 4 خانات عشرية لمنع أي خلل في الميزانية
            if (abs($totalDebit - $totalCredit) > 0.0001) {
                throw new InvalidArgumentException("قيد اليومية غير متوازن محاسبياً! إجمالي المدين: {$totalDebit}، إجمالي الدائن: {$totalCredit}");
            }

            if ($totalDebit <= 0) {
                throw new InvalidArgumentException('يجب أن تكون قيمة القيد المحاسبي أكبر من الصفر.');
            }

            $entry = JournalEntry::create([
                'tenant_id' => $tenantId,
                'entry_number' => $data['entry_number'] ?? ('JE-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'entry_date' => $data['entry_date'] ?? now()->toDateString(),
                'reference_type' => $data['reference_type'] ?? 'manual',
                'reference_id' => $data['reference_id'] ?? null,
                'description' => $data['description'],
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => 'posted',
            ]);

            foreach ($lines as $line) {
                $debit = round((float) ($line['debit'] ?? 0), 4);
                $credit = round((float) ($line['credit'] ?? 0), 4);

                $account = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('id', $line['account_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                // تحديث رصيد الحساب طبقاً لطبيعته المحاسبية
                if (in_array($account->type, ['asset', 'expense'])) {
                    $account->current_balance += ($debit - $credit);
                } else {
                    $account->current_balance += ($credit - $debit);
                }
                $account->save();

                JournalEntryLine::create([
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $entry->id,
                    'account_id' => $account->id,
                    'description' => $line['description'] ?? $data['description'],
                    'debit' => $debit,
                    'credit' => $credit,
                    'cost_center' => $line['cost_center'] ?? null,
                ]);
            }

            return $entry->load('lines.account');
        });
    }

    /**
     * تسجيل سند قبض أو صرف مع ترحيل محاسبي تلقائي
     */
    public function createPaymentVoucher(array $data): PaymentVoucher
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($data, $tenantId) {
            $amount = round((float) $data['amount'], 4);
            if ($amount <= 0) {
                throw new InvalidArgumentException('يجب أن تكون قيمة السند المالي أكبر من الصفر.');
            }

            $account = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('id', $data['account_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!empty($data['party_id'])) {
                if (($data['party_type'] ?? '') === 'customer') {
                    \App\Models\Customer::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                } elseif (($data['party_type'] ?? '') === 'supplier') {
                    \App\Models\Supplier::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                } elseif (($data['party_type'] ?? '') === 'employee') {
                    \App\Models\Employee::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                }
            }

            // تحديث رصيد حساب النقدية / البنك طبقاً لطبيعة السند المالي
            if ($data['voucher_type'] === 'receipt') {
                $account->current_balance += $amount;
            } else {
                $account->current_balance -= $amount;
            }
            $account->save();

            $voucher = PaymentVoucher::create([
                'tenant_id' => $tenantId,
                'voucher_number' => $data['voucher_number'] ?? ('PV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'voucher_type' => $data['voucher_type'], // receipt or payment
                'party_type' => $data['party_type'] ?? 'customer',
                'party_id' => $data['party_id'] ?? null,
                'party_name' => $data['party_name'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'account_id' => $account->id,
                'amount' => $amount,
                'voucher_date' => $data['voucher_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
            ]);

            return $voucher->load('account');
        });
    }

    /**
     * احتساب التكلفة الصناعية الفعلية لأمر الإنتاج ومطابقتها
     */
    public function calculateProductionCost(string $productionOrderId, array $overrides = []): ProductionCostSheet
    {
        $tenantId = app('current_tenant_id');

        return DB::transaction(function () use ($productionOrderId, $overrides, $tenantId) {
            $order = ProductionOrder::where('tenant_id', $tenantId)
                ->where('id', $productionOrderId)
                ->firstOrFail();

            // 1. حساب تكلفة الخامات المباشرة الفعلية من حركات المخزن المرتبطة بأمر الإنتاج
            $materialsCost = isset($overrides['direct_materials_cost'])
                ? (float)$overrides['direct_materials_cost']
                : (float)DB::table('inventory_transactions')
                    ->where('tenant_id', $tenantId)
                    ->where('reference_type', 'production_orders')
                    ->where('reference_id', $order->id)
                    ->where('direction', 'OUT')
                    ->sum(DB::raw('quantity * unit_cost'));

            // 2. حساب تكلفة الأجور الصناعية المباشرة من إنتاجية العمال المسجلة
            $laborCost = isset($overrides['direct_labor_cost'])
                ? (float)$overrides['direct_labor_cost']
                : (float)PieceWorkLog::where('tenant_id', $tenantId)
                    ->where('production_order_id', $order->id)
                    ->sum('total_amount');

            $subcontractCost = (float)($overrides['subcontracted_services_cost'] ?? 0);

            // 3. تقدير التكاليف غير المباشرة المخصصة (15% من التكاليف المباشرة كمعيار صناعي)
            $overheadCost = isset($overrides['allocated_overhead_cost'])
                ? (float)$overrides['allocated_overhead_cost']
                : round(($materialsCost + $laborCost) * 0.15, 4);

            $totalCost = round($materialsCost + $laborCost + $subcontractCost + $overheadCost, 4);
            $totalPieces = max(1, (int)($order->total_completed_quantity ?: ($order->total_planned_quantity ?: ($order->total_quantity ?? 1))));
            $costPerPiece = round($totalCost / $totalPieces, 4);

            $costSheet = ProductionCostSheet::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'production_order_id' => $order->id,
                ],
                [
                    'garment_model_id' => $order->garment_model_id,
                    'total_produced_pieces' => $totalPieces,
                    'direct_materials_cost' => $materialsCost,
                    'direct_labor_cost' => $laborCost,
                    'subcontracted_services_cost' => $subcontractCost,
                    'allocated_overhead_cost' => $overheadCost,
                    'total_cost' => $totalCost,
                    'cost_per_piece' => $costPerPiece,
                    'status' => 'calculated',
                ]
            );

            return $costSheet->load(['productionOrder', 'garmentModel']);
        });
    }
}

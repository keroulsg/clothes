<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\PaymentVoucher;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Services\AccountingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * عرض قائمة الموردين مع البحث والأرصدة
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = Supplier::where('tenant_id', $tenantId);

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('tax_id', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->paginate($request->input('per_page', 20));

        return response()->json($suppliers);
    }

    /**
     * تسجيل مورد خامات جديد
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers')->where('tenant_id', $tenantId),
            ],
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tax_id' => 'nullable|string|max:100',
            'payment_terms' => 'required|string|in:cash,net_15,net_30,net_60',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create(array_merge($validated, [
            'tenant_id' => $tenantId,
            'is_active' => $validated['is_active'] ?? true,
            'current_balance' => 0.0,
        ]));

        return response()->json([
            'message' => 'تم تسجيل المورد بنجاح.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * تحديث بيانات مورد
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers')->where('tenant_id', $tenantId)->ignore($supplier->id),
            ],
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tax_id' => 'nullable|string|max:100',
            'payment_terms' => 'sometimes|required|string|in:cash,net_15,net_30,net_60',
            'credit_limit' => 'nullable|numeric|min:0',
            'is_active' => 'nullable|boolean',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات المورد بنجاح.',
            'supplier' => $supplier,
        ]);
    }

    /**
     * تفاصيل المورد وكشف حساب المعاملات
     */
    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)
            ->with(['purchaseOrders', 'invoices', 'returns'])
            ->findOrFail($id);

        return response()->json([
            'supplier' => $supplier,
        ]);
    }

    /**
     * تسجيل خصم تجاري / تسوية رصيد للمورد
     */
    public function recordDiscount(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'discount_type' => 'required|string|in:early_payment,volume_rebate,commercial,damage_allowance,return_adjustment',
            'discount_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $amount = (float) $validated['amount'];

        $voucher = DB::transaction(function () use ($tenantId, $supplier, $validated, $amount) {
            $voucherNumber = 'DISC-SUP-' . date('Ymd') . '-' . rand(1000, 9999);

            $typeLabels = [
                'early_payment' => 'خصم تعجيل دفع نقدي',
                'volume_rebate' => 'خصم كمية / حافز سحب',
                'commercial' => 'خصم تجاري خاص',
                'damage_allowance' => 'تسوية عيوب تصنيع / تلفيات خامات',
                'return_adjustment' => 'تسوية مرتجعات مورد',
            ];
            $typeLabel = $typeLabels[$validated['discount_type']] ?? 'خصم تجاري';

            $discountAccount = ChartOfAccount::where('tenant_id', $tenantId)
                ->where(function ($q) {
                    $q->where('name', 'like', '%خصم%')
                      ->orWhere('name', 'like', '%مورد%')
                      ->orWhere('code', '2010');
                })->first()
                ?? ChartOfAccount::where('tenant_id', $tenantId)->first();
            $accountId = $discountAccount?->id;

            $pv = PaymentVoucher::create([
                'tenant_id' => $tenantId,
                'voucher_number' => $voucherNumber,
                'voucher_type' => 'discount',
                'party_type' => 'supplier',
                'party_id' => $supplier->id,
                'party_name' => $supplier->name,
                'payment_method' => 'discount',
                'account_id' => $accountId,
                'amount' => $amount,
                'voucher_date' => $validated['discount_date'] ?? date('Y-m-d'),
                'notes' => ($validated['notes'] ? $validated['notes'] . ' ' : '') . "[{$typeLabel}]",
            ]);

            // خصم القيمة من رصيد التزامات المورد
            $supplier->current_balance = max(0, (float)$supplier->current_balance - $amount);
            $supplier->save();

            return $pv;
        });

        return response()->json([
            'message' => 'تم تسجيل الخصم التجاري للمورد وتخفيض الالتزام المالي بنجاح.',
            'voucher' => $voucher,
            'new_balance' => $supplier->current_balance,
        ], 201);
    }

    /**
     * تسجيل سند صرف / سداد للمورد
     */
    public function recordPayment(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,bank_transfer,check,cheque,card,visa,instapay',
            'voucher_date' => 'nullable|date',
            'supplier_invoice_id' => 'nullable|string|exists:supplier_invoices,id',
            'account_id' => 'nullable|string|exists:chart_of_accounts,id',
            'notes' => 'nullable|string',
        ]);

        $amount = (float) $validated['amount'];

        $voucher = DB::transaction(function () use ($tenantId, $supplier, $validated, $amount) {
            // حل حساب النقدية أو البنك الافتراضي إذا لم يُحدد
            $accountId = $validated['account_id'] ?? null;
            if (!$accountId) {
                $mappingKey = in_array($validated['payment_method'] ?? 'cash', ['bank_transfer', 'card', 'visa', 'check', 'cheque', 'instapay']) ? 'default_bank' : 'default_cash';
                try {
                    $defaultAccount = app(\App\Services\AccountingService::class)->getMappedAccount($tenantId, $mappingKey);
                    $accountId = $defaultAccount ? $defaultAccount->id : null;
                } catch (\Throwable $e) {
                    $accountId = null;
                }
            }

            $voucherNumber = 'PV-SUP-' . date('Ymd') . '-' . rand(1000, 9999);

            $pv = PaymentVoucher::create([
                'tenant_id' => $tenantId,
                'voucher_number' => $voucherNumber,
                'voucher_type' => 'payment',
                'party_type' => 'supplier',
                'party_id' => $supplier->id,
                'party_name' => $supplier->name,
                'payment_method' => $validated['payment_method'],
                'account_id' => $accountId,
                'amount' => $amount,
                'voucher_date' => $validated['voucher_date'] ?? date('Y-m-d'),
                'notes' => $validated['notes'] ?? 'سداد مستحقات للمورد ' . $supplier->name,
            ]);

            // إذا تم ربط السداد بفاتورة مورد محددة، تحديث رصيد الفاتورة
            if (!empty($validated['supplier_invoice_id'])) {
                $invoice = SupplierInvoice::where('tenant_id', $tenantId)
                    ->where('supplier_id', $supplier->id)
                    ->find($validated['supplier_invoice_id']);

                if ($invoice) {
                    $newPaid = (float)$invoice->paid_amount + $amount;
                    $invoice->paid_amount = $newPaid;
                    $invoice->payment_status = ($newPaid >= (float)$invoice->total_amount) ? 'paid' : 'partially_paid';
                    $invoice->save();
                }
            }

            // تحديث رصيد التزامات المورد
            $supplier->current_balance = max(0, (float)$supplier->current_balance - $amount);
            $supplier->save();

            return $pv;
        });

        return response()->json([
            'message' => 'تم تسجيل سند الصرف وتحديث رصيد المورد بنجاح.',
            'voucher' => $voucher,
            'supplier_current_balance' => (float) $supplier->current_balance,
        ], 201);
    }

    /**
     * تعديل سند صرف سابق للمورد مع إعادة ضبط رصيد المورد
     */
    public function updatePayment(Request $request, string $id, string $voucherId): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);
        $pv = PaymentVoucher::where('tenant_id', $tenantId)
            ->where('party_id', $supplier->id)
            ->where('party_type', 'supplier')
            ->findOrFail($voucherId);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|in:cash,bank_transfer,check,cheque,card,visa,instapay',
            'voucher_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $newAmount = (float) $validated['amount'];
        $oldAmount = (float) $pv->amount;
        $diff = $newAmount - $oldAmount;

        DB::transaction(function () use ($pv, $supplier, $validated, $newAmount, $diff) {
            $pv->amount = $newAmount;
            $pv->payment_method = $validated['payment_method'];
            if (!empty($validated['voucher_date'])) {
                $pv->voucher_date = $validated['voucher_date'];
            }
            if (isset($validated['notes'])) {
                $pv->notes = $validated['notes'];
            }
            $pv->save();

            // adjust supplier current_balance
            $supplier->current_balance = max(0, (float) $supplier->current_balance - $diff);
            $supplier->save();
        });

        return response()->json([
            'message' => 'تم تعديل سند الصرف وتحديث رصيد المورد بنجاح.',
            'voucher' => $pv,
            'supplier_current_balance' => (float) $supplier->current_balance,
        ]);
    }

    /**
     * حذف سند صرف مع استرجاع المديونية لرصيد المورد
     */
    public function deletePayment(Request $request, string $id, string $voucherId): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);
        $pv = PaymentVoucher::where('tenant_id', $tenantId)
            ->where('party_id', $supplier->id)
            ->where('party_type', 'supplier')
            ->findOrFail($voucherId);

        DB::transaction(function () use ($pv, $supplier) {
            $amount = (float) $pv->amount;
            $supplier->current_balance = (float) $supplier->current_balance + $amount;
            $supplier->save();

            $pv->delete();
        });

        return response()->json([
            'message' => 'تم حذف سند الصرف واسترجاع رصيد المورد بنجاح.',
            'supplier_current_balance' => (float) $supplier->current_balance,
        ]);
    }

    /**
     * تسجيل فاتورة مشتريات/توريد خامات مباشرة لهذا المورد
     */
    public function recordInvoice(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'invoice_number' => 'required|string|max:100',
            'total_amount' => 'required|numeric|min:0.01',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'internal_reference' => 'nullable|string|max:100',
            'notes' => 'nullable|string',
        ]);

        $invoice = DB::transaction(function () use ($tenantId, $supplier, $validated) {
            $totalAmount = (float) $validated['total_amount'];

            $inv = SupplierInvoice::create([
                'tenant_id' => $tenantId,
                'supplier_id' => $supplier->id,
                'invoice_number' => $validated['invoice_number'],
                'internal_reference' => $validated['internal_reference'] ?? ('INV-' . date('Ymd') . '-' . rand(100, 999)),
                'invoice_date' => $validated['invoice_date'] ?? date('Y-m-d'),
                'due_date' => $validated['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                'subtotal' => $totalAmount,
                'tax_amount' => 0,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'matching_status' => 'matched',
                'payment_status' => 'unpaid',
            ]);

            $supplier->current_balance = (float) $supplier->current_balance + $totalAmount;
            $supplier->save();

            return $inv;
        });

        return response()->json([
            'message' => 'تم تسجيل فاتورة التوريد وتحديث مديونية المورد بنجاح.',
            'invoice' => $invoice,
            'supplier_current_balance' => (float) $supplier->current_balance,
        ], 201);
    }

    /**
     * حذف فاتورة توريد مع تخفيض مديونية المورد
     */
    public function deleteInvoice(Request $request, string $id, string $invoiceId): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);
        $invoice = SupplierInvoice::where('tenant_id', $tenantId)
            ->where('supplier_id', $supplier->id)
            ->findOrFail($invoiceId);

        DB::transaction(function () use ($invoice, $supplier) {
            $unpaidAmount = max(0, (float) $invoice->total_amount - (float) ($invoice->paid_amount ?? 0));
            $supplier->current_balance = max(0, (float) $supplier->current_balance - $unpaidAmount);
            $supplier->save();

            $invoice->delete();
        });

        return response()->json([
            'message' => 'تم حذف فاتورة التوريد وتحديث رصيد المورد بنجاح.',
            'supplier_current_balance' => (float) $supplier->current_balance,
        ]);
    }

    /**
     * كشف حساب المورد التحليلي وأوامر الشراء والفواتير وسندات السداد
     */
    public function statement(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        // 1. فواتير المورد (Supplier Invoices = Credit / التزام على المصنع)
        $invoicesQuery = SupplierInvoice::where('tenant_id', $tenantId)
            ->where('supplier_id', $supplier->id);

        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $hasFrom = $fromDate && $fromDate !== 'undefined' && $fromDate !== 'null';
        $hasTo = $toDate && $toDate !== 'undefined' && $toDate !== 'null';

        if ($hasFrom) {
            $invoicesQuery->where('invoice_date', '>=', $fromDate);
        }
        if ($hasTo) {
            $invoicesQuery->where('invoice_date', '<=', $toDate);
        }

        $invoices = $invoicesQuery->orderBy('invoice_date', 'asc')->get();

        // 2. سندات السداد والخصومات للمورد (Payment & Discount Vouchers = Debit / تخفيض الالتزام)
        $paymentsQuery = PaymentVoucher::where('tenant_id', $tenantId)
            ->where('party_type', 'supplier')
            ->where('party_id', $supplier->id)
            ->whereIn('voucher_type', ['payment', 'discount']);

        if ($hasFrom) {
            $paymentsQuery->where('voucher_date', '>=', $fromDate);
        }
        if ($hasTo) {
            $paymentsQuery->where('voucher_date', '<=', $toDate);
        }

        $payments = $paymentsQuery->orderBy('voucher_date', 'asc')->get();

        // 3. أوامر الشراء المعتمدة (Purchase Orders)
        $poQuery = PurchaseOrder::where('tenant_id', $tenantId)
            ->where('supplier_id', $supplier->id);

        if ($hasFrom) {
            $poQuery->where('order_date', '>=', $fromDate);
        }
        if ($hasTo) {
            $poQuery->where('order_date', '<=', $toDate);
        }

        $purchaseOrders = $poQuery->orderBy('order_date', 'asc')->get();

        $transactions = collect();

        $hasPaymentVouchers = $payments->isNotEmpty();

        foreach ($invoices as $inv) {
            $paidOnInvoice = $hasPaymentVouchers ? 0.0 : (float) ($inv->paid_amount ?? 0);
            $transactions->push([
                'id' => 'inv-' . $inv->id,
                'raw_id' => $inv->id,
                'date' => $inv->invoice_date ? (is_string($inv->invoice_date) ? $inv->invoice_date : $inv->invoice_date->format('Y-m-d')) : $inv->created_at->format('Y-m-d'),
                'datetime' => $inv->created_at ? $inv->created_at->format('Y-m-d H:i:s') : (($inv->invoice_date ?: date('Y-m-d')) . ' 12:00:00'),
                'time' => $inv->created_at ? $inv->created_at->format('H:i') : '12:00',
                'type' => 'invoice',
                'type_label' => 'فاتورة توريد خامات',
                'payment_method' => 'credit',
                'reference' => $inv->invoice_number,
                'description' => 'فاتورة توريد خامات رقم ' . $inv->invoice_number . ($inv->internal_reference ? " ({$inv->internal_reference})" : ''),
                'credit' => (float) $inv->total_amount,
                'debit' => $paidOnInvoice,
                'payment_status' => $inv->payment_status,
                'matching_status' => $inv->matching_status,
                'created_at' => $inv->created_at,
            ]);
        }

        foreach ($payments as $pv) {
            $isDiscount = $pv->voucher_type === 'discount';
            $transactions->push([
                'id' => 'pv-' . $pv->id,
                'raw_id' => $pv->id,
                'date' => $pv->voucher_date ? (is_string($pv->voucher_date) ? $pv->voucher_date : $pv->voucher_date->format('Y-m-d')) : $pv->created_at->format('Y-m-d'),
                'datetime' => $pv->created_at ? $pv->created_at->format('Y-m-d H:i:s') : (($pv->voucher_date ?: date('Y-m-d')) . ' 12:00:00'),
                'time' => $pv->created_at ? $pv->created_at->format('H:i') : '12:00',
                'type' => $isDiscount ? 'discount' : 'payment',
                'type_label' => $isDiscount ? 'خصم تجاري / تسوية' : 'سند صرف سداد مورد',
                'payment_method' => $isDiscount ? 'discount' : ($pv->payment_method ?? 'cash'),
                'reference' => $pv->voucher_number,
                'description' => ($isDiscount ? 'إشعار خصم رقم ' : 'سند صرف رقم ') . $pv->voucher_number . ($pv->notes ? ' - ' . $pv->notes : ''),
                'credit' => 0.0,
                'debit' => (float) $pv->amount,
                'payment_status' => 'paid',
                'matching_status' => 'settled',
                'created_at' => $pv->created_at,
                'notes' => $pv->notes,
            ]);
        }

        $sorted = $transactions->sortBy('date')->values();

        $runningBalance = 0.0;
        $ledgerLines = $sorted->map(function ($item) use (&$runningBalance) {
            $credit = (float) $item['credit'];
            $debit = (float) $item['debit'];
            $runningBalance += ($credit - $debit);
            $item['running_balance'] = round($runningBalance, 2);
            return $item;
        });

        $cashPaid = (float) $payments->where('voucher_type', 'payment')->where('payment_method', 'cash')->sum('amount');
        $cardPaid = (float) $payments->where('voucher_type', 'payment')->whereIn('payment_method', ['card', 'visa'])->sum('amount');
        $bankPaid = (float) $payments->where('voucher_type', 'payment')->whereIn('payment_method', ['bank_transfer', 'instapay'])->sum('amount');
        $checkPaid = (float) $payments->where('voucher_type', 'payment')->whereIn('payment_method', ['check', 'cheque'])->sum('amount');
        $discountsTotal = (float) $payments->where('voucher_type', 'discount')->sum('amount');
        $actualPaymentsTotal = (float) $payments->where('voucher_type', 'payment')->sum('amount');

        // توزيع المدفوعات على الفواتير لتحديد الفواتير المسددة بالكامل والتي عليها دفعات
        $explicitPaidSum = (float) $invoices->sum('paid_amount');
        $unallocatedPayments = max(0, $actualPaymentsTotal - $explicitPaidSum);
        $computedInvoices = $invoices->map(function ($inv) use (&$unallocatedPayments) {
            $total = (float) $inv->total_amount;
            $paid = (float) ($inv->paid_amount ?? 0);

            if ($paid < $total && $unallocatedPayments > 0) {
                $needed = $total - $paid;
                $apply = min($needed, $unallocatedPayments);
                $paid += $apply;
                $unallocatedPayments -= $apply;
            }

            $remaining = max(0, round($total - $paid, 2));
            // تصنيف دقيق لحالة السداد
            $status = $remaining <= 0.01 ? 'paid' : ($paid > 0 ? 'partially_paid' : 'unpaid');

            return [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'po_number' => $inv->purchaseOrder?->po_number,
                'invoice_date' => $inv->invoice_date ? (is_string($inv->invoice_date) ? $inv->invoice_date : $inv->invoice_date->format('Y-m-d')) : null,
                'due_date' => $inv->due_date ? (is_string($inv->due_date) ? $inv->due_date : $inv->due_date->format('Y-m-d')) : null,
                'subtotal' => (float) $inv->subtotal,
                'tax_amount' => (float) $inv->tax_amount,
                'total_amount' => $total,
                'paid_amount' => round($paid, 2),
                'remaining_amount' => $remaining,
                'payment_status' => $status,
                'matching_status' => $inv->matching_status,
            ];
        });

        $totalInvoiced = (float) $invoices->sum('total_amount');
        $netPayable = max(0, round($totalInvoiced - $actualPaymentsTotal - $discountsTotal, 2));

        $fullyPaidCount = $computedInvoices->where('payment_status', 'paid')->count();
        $partiallyPaidCount = $computedInvoices->where('payment_status', 'partially_paid')->count();
        $unpaidCount = $computedInvoices->where('payment_status', 'unpaid')->count();

        return response()->json([
            'supplier' => $supplier,
            'summary' => [
                'total_pos_count' => $purchaseOrders->count(),
                'total_po_value' => round($purchaseOrders->sum('total_amount'), 2),
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($actualPaymentsTotal, 2),
                'total_actual_paid' => round($actualPaymentsTotal, 2),
                'total_discounts' => round($discountsTotal, 2),
                'closing_balance' => $netPayable,
                'total_transactions' => $ledgerLines->count(),
                'fully_paid_invoices_count' => $fullyPaidCount,
                'partially_paid_invoices_count' => $partiallyPaidCount,
                'unpaid_invoices_count' => $unpaidCount,
                'breakdown' => [
                    'cash' => round($cashPaid, 2),
                    'card' => round($cardPaid, 2),
                    'bank_transfer' => round($bankPaid, 2),
                    'cheque' => round($checkPaid, 2),
                    'discounts' => round($discountsTotal, 2),
                    'credit_balance' => $netPayable,
                ],
            ],
            'invoices' => $computedInvoices,
            'payments' => $payments->where('voucher_type', 'payment')->map(fn($p) => [
                'id' => $p->id,
                'voucher_number' => $p->voucher_number,
                'voucher_date' => $p->voucher_date ? (is_string($p->voucher_date) ? $p->voucher_date : $p->voucher_date->format('Y-m-d')) : null,
                'datetime' => $p->created_at ? $p->created_at->format('Y-m-d H:i:s') : null,
                'time' => $p->created_at ? $p->created_at->format('h:i A') : null,
                'payment_method' => $p->payment_method ?? 'cash',
                'amount' => (float) $p->amount,
                'notes' => $p->notes,
            ])->values(),
            'discounts' => $payments->where('voucher_type', 'discount')->map(fn($d) => [
                'id' => $d->id,
                'voucher_number' => $d->voucher_number,
                'voucher_date' => $d->voucher_date ? (is_string($d->voucher_date) ? $d->voucher_date : $d->voucher_date->format('Y-m-d')) : null,
                'amount' => (float) $d->amount,
                'notes' => $d->notes,
            ])->values(),
            'lines' => $ledgerLines,
            'purchase_orders' => $purchaseOrders->map(fn($p) => [
                'id' => $p->id,
                'po_number' => $p->po_number,
                'order_date' => $p->order_date ? (is_string($p->order_date) ? $p->order_date : $p->order_date->format('Y-m-d')) : null,
                'total_amount' => (float) $p->total_amount,
                'status' => $p->status,
            ]),
        ]);
    }
}

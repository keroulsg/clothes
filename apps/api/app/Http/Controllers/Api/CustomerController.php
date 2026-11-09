<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PaymentVoucher;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

class CustomerController extends Controller
{
    /**
     * قائمة العملاء مع الأرصدة والبحث والترقيم
     */
    public function index(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');

        $query = Customer::where('tenant_id', $tenantId)
            ->withCount(['salesOrders', 'salesInvoices', 'jobOrders']);

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%");
            });
        }

        if ($request->boolean('active_only', false)) {
            $query->where('is_active', true);
        }

        $customers = $query->orderBy('name')->paginate($request->integer('per_page', 25));

        // حساب الرصيد القائم لكل عميل من واقع الفواتير المفتوحة والمرتجعات
        $items = $customers->getCollection()->map(function ($cust) use ($tenantId) {
            $invoicedTotal = SalesInvoice::where('tenant_id', $tenantId)
                ->where('customer_id', $cust->id)
                ->where('status', '!=', 'cancelled')
                ->where('status', '!=', 'void')
                ->sum('total_amount');

            $paidTotal = SalesInvoice::where('tenant_id', $tenantId)
                ->where('customer_id', $cust->id)
                ->sum('paid_amount');

            $returnedTotal = SalesReturn::where('tenant_id', $tenantId)
                ->where('customer_id', $cust->id)
                ->where('status', '!=', 'rejected')
                ->sum('total_amount');

            $outstandingBalance = max(0, round($invoicedTotal - $paidTotal - $returnedTotal, 2));

            $arr = $cust->toArray();
            $arr['current_balance'] = $outstandingBalance;
            $arr['total_invoiced'] = round($invoicedTotal, 2);
            return $arr;
        });

        $customers->setCollection($items);

        return response()->json($customers);
    }

    /**
     * تسجيل عميل جديد مع التحقق من تفرد الكود ومنع التكرار
     */
    public function store(Request $request): JsonResponse
    {
        $tenantId = $request->user()?->tenant_id ?? (app()->bound('current_tenant_id') ? app('current_tenant_id') : null);

        $validated = $request->validate([
            'code' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($tenantId) {
                    $exists = Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)
                        ->where('code', $value)
                        ->exists();
                    if ($exists) {
                        $fail('كود العميل مسجل مسبقاً لهذا المصنع.');
                    }
                },
            ],
            'name' => 'required|string|max:255',
            'classification' => 'nullable|string|in:individual,company',
            'company_name' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tax_id' => [
                'nullable',
                'string',
                'max:100',
                function ($attribute, $value, $fail) use ($tenantId) {
                    if ($value && Customer::withoutGlobalScopes()->where('tenant_id', $tenantId)->where('tax_id', $value)->exists()) {
                        $fail('الرقم الضريبي مسجل لعميل آخر.');
                    }
                },
            ],
            'commercial_registry' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'notes' => 'nullable|string',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'opening_balance' => 'nullable|numeric',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $customer = Customer::create([
            'tenant_id' => $tenantId,
            'code' => $validated['code'],
            'name' => $validated['name'],
            'classification' => $validated['classification'] ?? 'company',
            'company_name' => $validated['company_name'] ?? null,
            'contact_person' => $validated['contact_person'] ?? null,
            'phone' => $validated['phone'] ?? null,
            'email' => $validated['email'] ?? null,
            'tax_id' => $validated['tax_id'] ?? null,
            'commercial_registry' => $validated['commercial_registry'] ?? null,
            'credit_limit' => $validated['credit_limit'] ?? 0,
            'payment_terms' => $validated['payment_terms'] ?? null,
            'opening_balance' => $validated['opening_balance'] ?? 0,
            'address' => $validated['address'] ?? null,
            'billing_address' => $validated['billing_address'] ?? null,
            'delivery_address' => $validated['delivery_address'] ?? null,
            'notes' => $validated['notes'] ?? null,
            'is_active' => ($validated['status'] ?? 'active') === 'active',
            'status' => $validated['status'] ?? 'active',
        ]);

        return response()->json([
            'message' => 'تم تسجيل العميل بنجاح',
            'customer' => $customer,
        ], 201);
    }

    /**
     * تفاصيل عميل محدد
     */
    public function show(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $customer = Customer::where('tenant_id', $tenantId)
            ->withCount(['salesOrders', 'salesInvoices', 'jobOrders', 'paymentVouchers'])
            ->findOrFail($id);

        $invoicedTotal = SalesInvoice::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('status', '!=', 'cancelled')
            ->where('status', '!=', 'void')
            ->sum('total_amount');

        $paidTotal = PaymentVoucher::where('tenant_id', $tenantId)
            ->where('party_type', 'customer')
            ->where('party_id', $customer->id)
            ->where('voucher_type', 'receipt')
            ->sum('amount');

        if ($paidTotal <= 0) {
            $paidTotal = SalesInvoice::where('tenant_id', $tenantId)
                ->where('customer_id', $customer->id)
                ->sum('paid_amount');
        }

        $returnedTotal = SalesReturn::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('status', '!=', 'rejected')
            ->sum('total_amount');

        $res = $customer->toArray();
        $res['current_balance'] = max(0, round($invoicedTotal - $paidTotal - $returnedTotal, 2));
        $res['total_invoiced'] = round($invoicedTotal, 2);
        $res['total_paid'] = round($paidTotal, 2);

        return response()->json(['customer' => $res]);
    }

    /**
     * تحديث بيانات عميل
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $customer = Customer::where('tenant_id', $tenantId)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'classification' => 'nullable|string|in:individual,company',
            'company_name' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:100',
            'commercial_registry' => 'nullable|string|max:100',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms' => 'nullable|string|max:100',
            'opening_balance' => 'nullable|numeric',
            'address' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'delivery_address' => 'nullable|string',
            'notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        if (isset($validated['status'])) {
            $validated['is_active'] = $validated['status'] === 'active';
        }

        $customer->update($validated);

        return response()->json([
            'message' => 'تم تحديث بيانات العميل بنجاح',
            'customer' => $customer,
        ]);
    }

    /**
     * كشف حساب العميل التحليلي (Customer Statement / Ledger)
     */
    public function statement(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $customer = Customer::where('tenant_id', $tenantId)->findOrFail($id);

        // 1. الفواتير الصادرة للعميل (Invoices = Debit)
        $invoicesQuery = SalesInvoice::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('status', '!=', 'cancelled');

        if ($request->filled('from_date')) {
            $invoicesQuery->where('invoice_date', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $invoicesQuery->where('invoice_date', '<=', $request->input('to_date'));
        }

        $invoices = $invoicesQuery->orderBy('invoice_date', 'asc')->get();

        // 2. المرتجعات المعتمدة (Returns = Credit)
        $returnsQuery = SalesReturn::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('status', '!=', 'rejected');

        if ($request->filled('from_date')) {
            $returnsQuery->where('return_date', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $returnsQuery->where('return_date', '<=', $request->input('to_date'));
        }

        $returns = $returnsQuery->orderBy('return_date', 'asc')->get();

        // 3. سندات القبض والدفعات المسددة (Payments = Credit)
        $paymentsQuery = PaymentVoucher::where('tenant_id', $tenantId)
            ->where('party_type', 'customer')
            ->where('party_id', $customer->id)
            ->where('voucher_type', 'receipt');

        if ($request->filled('from_date')) {
            $paymentsQuery->where('voucher_date', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $paymentsQuery->where('voucher_date', '<=', $request->input('to_date'));
        }

        $payments = $paymentsQuery->orderBy('voucher_date', 'asc')->get();

        // تجميع السجلات في مصفوفة معاملات موحدة مرتبة زمنياً
        $transactions = collect();

        foreach ($invoices as $inv) {
            $transactions->push([
                'id' => 'inv-' . $inv->id,
                'date' => $inv->invoice_date ? $inv->invoice_date->format('Y-m-d') : $inv->created_at->format('Y-m-d'),
                'type' => 'invoice',
                'type_label' => 'فاتورة مبيعات',
                'reference' => $inv->invoice_number,
                'description' => 'فاتورة مبيعات رقم ' . $inv->invoice_number,
                'debit' => (float) $inv->total_amount,
                'credit' => (float) $inv->paid_amount,
                'payment_status' => $inv->status,
                'created_at' => $inv->created_at,
            ]);
        }

        foreach ($returns as $ret) {
            $transactions->push([
                'id' => 'ret-' . $ret->id,
                'date' => $ret->return_date ? $ret->return_date->format('Y-m-d') : $ret->created_at->format('Y-m-d'),
                'type' => 'return',
                'type_label' => 'إشعار دائن (مرتجع)',
                'reference' => $ret->return_number,
                'description' => 'مرتجع مبيعات رقم ' . $ret->return_number . ' - ' . ($ret->reason ?? ''),
                'debit' => 0.0,
                'credit' => (float) $ret->total_amount,
                'payment_status' => 'settled',
                'created_at' => $ret->created_at,
            ]);
        }

        // إدراج سندات القبض غير المخصصة أو الدفعات الحرة فقط لمنع ازدواج احتساب السداد مع الفواتير
        foreach ($payments as $pmt) {
            $allocatedSum = $pmt->allocations()->sum('amount');
            $unallocated = (float) $pmt->amount - (float) $allocatedSum;
            if ($unallocated > 0.0001) {
                $transactions->push([
                    'id' => 'pmt-' . $pmt->id,
                    'date' => $pmt->voucher_date ? $pmt->voucher_date->format('Y-m-d') : $pmt->created_at->format('Y-m-d'),
                    'type' => 'payment',
                    'type_label' => 'رصيد دائن / سند قبض غير مخصص',
                    'reference' => $pmt->voucher_number,
                    'description' => 'سند قبض مالي ' . $pmt->voucher_number,
                    'debit' => 0.0,
                    'credit' => $unallocated,
                    'payment_status' => 'posted',
                    'created_at' => $pmt->created_at,
                ]);
            }
        }

        $sorted = $transactions->sortBy('created_at')->values();

        $runningBalance = 0.0;
        $ledgerLines = $sorted->map(function ($item) use (&$runningBalance) {
            $debit = (float) $item['debit'];
            $credit = (float) $item['credit'];
            $runningBalance += ($debit - $credit);

            $item['running_balance'] = round($runningBalance, 2);
            return $item;
        });

        $totalInvoiced = $invoices->sum('total_amount');
        $totalPaid = $invoices->sum('paid_amount') + $transactions->where('type', 'payment')->sum('credit');
        $totalRefunded = $returns->sum('total_amount');
        $netBalance = max(0, round($totalInvoiced - $totalPaid - $totalRefunded, 2));

        return response()->json([
            'customer' => $customer,
            'summary' => [
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($totalPaid, 2),
                'total_refunded' => round($totalRefunded, 2),
                'closing_balance' => $netBalance,
                'total_transactions' => $ledgerLines->count(),
            ],
            'lines' => $ledgerLines,
        ]);
    }

    /**
     * تقرير أعمار الديون للعميل (Receivables Aging Report)
     */
    public function aging(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $customer = Customer::where('tenant_id', $tenantId)->findOrFail($id);

        $unpaidInvoices = SalesInvoice::where('tenant_id', $tenantId)
            ->where('customer_id', $customer->id)
            ->where('status', '!=', 'cancelled')
            ->where('balance_due', '>', 0)
            ->get();

        $current = 0.0;
        $days31To60 = 0.0;
        $days61To90 = 0.0;
        $over90 = 0.0;

        $now = Carbon::now()->startOfDay();
        $detailedInvoices = [];

        foreach ($unpaidInvoices as $inv) {
            $invDate = $inv->invoice_date ? Carbon::parse($inv->invoice_date) : $inv->created_at;
            $days = (int) $invDate->diffInDays($now, false);
            $due = (float) $inv->balance_due;

            if ($days <= 30) {
                $current += $due;
            } elseif ($days <= 60) {
                $days31To60 += $due;
            } elseif ($days <= 90) {
                $days61To90 += $due;
            } else {
                $over90 += $due;
            }

            $detailedInvoices[] = [
                'id' => $inv->id,
                'invoice_number' => $inv->invoice_number,
                'invoice_date' => $inv->invoice_date ? $inv->invoice_date->format('Y-m-d') : null,
                'due_date' => $inv->due_date ? $inv->due_date->format('Y-m-d') : null,
                'total_amount' => (float) $inv->total_amount,
                'paid_amount' => (float) $inv->paid_amount,
                'balance_due' => $due,
                'days_outstanding' => max(0, $days),
                'status' => $inv->status,
            ];
        }

        $totalDue = $current + $days31To60 + $days61To90 + $over90;

        return response()->json([
            'customer' => $customer,
            'summary' => [
                'current' => round($current, 2),
                'days_31_60' => round($days31To60, 2),
                'days_61_90' => round($days61To90, 2),
                'over_90' => round($over90, 2),
                'total_due' => round($totalDue, 2),
                'credit_limit' => (float) $customer->credit_limit,
                'credit_available' => max(0, round((float) $customer->credit_limit - $totalDue, 2)),
            ],
            'invoices' => $detailedInvoices,
        ]);
    }
}

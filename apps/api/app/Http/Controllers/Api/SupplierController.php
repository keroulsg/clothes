<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * عرض قائمة الموردين مع البحث والأرصدة
     */
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();

        if ($request->has('search')) {
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
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'contact_person' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'tax_id' => 'nullable|string|max:100',
            'payment_terms' => 'required|string|in:cash,net_15,net_30,net_60',
            'credit_limit' => 'nullable|numeric|min:0',
            'address' => 'nullable|string|max:500',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'message' => 'تم تسجيل المورد بنجاح.',
            'supplier' => $supplier,
        ], 201);
    }

    /**
     * تفاصيل المورد وكشف حساب المعاملات
     */
    public function show(string $id): JsonResponse
    {
        $supplier = Supplier::with(['purchaseOrders', 'invoices', 'returns'])->findOrFail($id);

        return response()->json([
            'supplier' => $supplier,
        ]);
    }

    /**
     * كشف حساب المورد التحليلي وأوامر الشراء والفواتير
     */
    public function statement(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $supplier = Supplier::where('tenant_id', $tenantId)->findOrFail($id);

        // 1. فواتير المورد (Supplier Invoices = Credit / التزام على المصنع)
        $invoicesQuery = SupplierInvoice::where('tenant_id', $tenantId)
            ->where('supplier_id', $supplier->id);

        if ($request->filled('from_date')) {
            $invoicesQuery->where('invoice_date', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $invoicesQuery->where('invoice_date', '<=', $request->input('to_date'));
        }

        $invoices = $invoicesQuery->orderBy('invoice_date', 'asc')->get();

        // 2. أوامر الشراء المعتمدة (Purchase Orders)
        $poQuery = PurchaseOrder::where('tenant_id', $tenantId)
            ->where('supplier_id', $supplier->id);

        if ($request->filled('from_date')) {
            $poQuery->where('order_date', '>=', $request->input('from_date'));
        }
        if ($request->filled('to_date')) {
            $poQuery->where('order_date', '<=', $request->input('to_date'));
        }

        $purchaseOrders = $poQuery->orderBy('order_date', 'asc')->get();

        $transactions = collect();

        foreach ($invoices as $inv) {
            $transactions->push([
                'id' => 'inv-' . $inv->id,
                'date' => $inv->invoice_date ? $inv->invoice_date->format('Y-m-d') : $inv->created_at->format('Y-m-d'),
                'type' => 'invoice',
                'type_label' => 'فاتورة توريد خامات',
                'reference' => $inv->invoice_number,
                'description' => 'فاتورة ضريبية رقم ' . $inv->invoice_number . ($inv->internal_reference ? " ({$inv->internal_reference})" : ''),
                'credit' => (float) $inv->total_amount,
                'debit' => (float) ($inv->paid_amount ?? 0),
                'payment_status' => $inv->payment_status,
                'matching_status' => $inv->matching_status,
                'created_at' => $inv->created_at,
            ]);
        }

        $sorted = $transactions->sortBy('created_at')->values();

        $runningBalance = 0.0;
        $ledgerLines = $sorted->map(function ($item) use (&$runningBalance) {
            $credit = (float) $item['credit'];
            $debit = (float) $item['debit'];
            // رصيد التزام المصنع للمورد يزيد بالفاتورة (Credit) ويقل بالسداد (Debit)
            $runningBalance += ($credit - $debit);

            $item['running_balance'] = round($runningBalance, 2);
            return $item;
        });

        $totalInvoiced = $invoices->sum('total_amount');
        $totalPaid = $invoices->sum('paid_amount');
        $netPayable = max(0, round($totalInvoiced - $totalPaid, 2));

        return response()->json([
            'supplier' => $supplier,
            'summary' => [
                'total_pos_count' => $purchaseOrders->count(),
                'total_po_value' => round($purchaseOrders->sum('total_amount'), 2),
                'total_invoiced' => round($totalInvoiced, 2),
                'total_paid' => round($totalPaid, 2),
                'closing_balance' => $netPayable,
                'total_transactions' => $ledgerLines->count(),
            ],
            'lines' => $ledgerLines,
            'purchase_orders' => $purchaseOrders->map(fn($p) => [
                'id' => $p->id,
                'po_number' => $p->po_number,
                'order_date' => $p->order_date ? $p->order_date->format('Y-m-d') : null,
                'total_amount' => (float) $p->total_amount,
                'status' => $p->status,
            ]),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierInvoice;
use App\Services\ProcurementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierInvoiceController extends Controller
{
    protected ProcurementService $procurementService;

    public function __construct(ProcurementService $procurementService)
    {
        $this->procurementService = $procurementService;
    }

    /**
     * عرض فواتير الموردين مع حالة المطابقة الثلاثية
     */
    public function index(Request $request): JsonResponse
    {
        $query = SupplierInvoice::with(['supplier', 'purchaseOrder', 'goodsReceiptNote']);

        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->has('matching_status') && $request->matching_status !== 'all') {
            $query->where('matching_status', $request->matching_status);
        }

        $invoices = $query->orderBy('created_at', 'desc')->paginate($request->input('per_page', 20));

        return response()->json($invoices);
    }

    /**
     * مطابقة واعتماد فاتورة المورد وإثبات الالتزام المالي
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invoice_number' => 'required|string|max:100',
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'goods_receipt_note_id' => 'nullable|exists:goods_receipt_notes,id',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'subtotal' => 'required|numeric|min:0.01',
            'tax_amount' => 'nullable|numeric|min:0',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $tenantId = app('current_tenant_id');
        $validated['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);
        $validated['tenant_id'] = $tenantId;

        $invoice = $this->procurementService->matchAndCreateInvoice($validated);

        return response()->json([
            'message' => 'تم مطابقة فاتورة المورد وترحيل الالتزام المالي بنجاح.',
            'supplier_invoice' => $invoice,
        ], 201);
    }
}

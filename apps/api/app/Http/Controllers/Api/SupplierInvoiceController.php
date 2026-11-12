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
        $user = $request->user();
        if ($user && $user->role !== 'company_owner') {
            $branchIds = $user->assignedBranchIds();
            if ($user->hasExplicitPermissionConfiguration() || !empty($branchIds)) {
                $query->whereHas('purchaseOrder.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds))
                    ->whereHas('goodsReceiptNote.warehouse', fn ($warehouseQuery) => $warehouseQuery->whereIn('branch_id', $branchIds));
            }
        }

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
            'goods_receipt_note_id' => 'required|uuid|exists:goods_receipt_notes,id',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'subtotal' => 'required|numeric|min:0.01',
            'tax_amount' => 'nullable|numeric|min:0',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $tenantId = app('current_tenant_id');
        $user = $request->user();
        $assignedBranchIds = $user?->assignedBranchIds() ?? [];
        $enforceBranchScope = $user && $user->role !== 'company_owner'
            && ($user->hasExplicitPermissionConfiguration() || !empty($assignedBranchIds));
        $purchaseOrder = \App\Models\PurchaseOrder::where('tenant_id', $tenantId)->find($validated['purchase_order_id']);
        $goodsReceipt = \App\Models\GoodsReceiptNote::where('tenant_id', $tenantId)->find($validated['goods_receipt_note_id']);
        if (!$purchaseOrder || !$goodsReceipt) {
            return response()->json(['error' => 'ProcurementDocumentNotFound', 'message' => 'أمر الشراء أو إذن الاستلام غير متاح لهذا الحساب.'], 404);
        }
        if ($enforceBranchScope) {
            $poWarehouse = \App\Models\Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($purchaseOrder->warehouse_id);
            $grnWarehouse = \App\Models\Warehouse::withoutGlobalScopes()->where('tenant_id', $tenantId)->find($goodsReceipt->warehouse_id);
            if (
                !$poWarehouse || !$grnWarehouse
                || !in_array($poWarehouse->branch_id, $assignedBranchIds, true)
                || !in_array($grnWarehouse->branch_id, $assignedBranchIds, true)
            ) {
                return response()->json(['error' => 'BranchAccessDenied', 'message' => 'لا يمكنك مطابقة فاتورة شراء من فرع غير معيّن لحسابك.'], 403);
            }
        }
        $validated['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);
        $validated['tenant_id'] = $tenantId;

        try {
            $invoice = $this->procurementService->matchAndCreateInvoice($validated);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency') || str_contains($e->getMessage(), 'تعارض في فاتورة المورد')) {
                return response()->json([
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'error' => 'ValidationError',
                'message' => $e->getMessage(),
            ], 422);
        }

        $statusCode = !$invoice->is_posted
            ? 202
            : ($invoice->wasRecentlyCreated ? 201 : 200);

        return response()->json([
            'message' => !$invoice->is_posted
                ? 'تم حفظ الفاتورة للمراجعة؛ لم يتم ترحيلها أو إثبات التزام على المورد بسبب فرق المطابقة.'
                : ($invoice->wasRecentlyCreated
                    ? 'تمت المطابقة الثلاثية وترحيل فاتورة المورد محاسبياً بنجاح.'
                    : 'تم استرجاع فاتورة المورد المسجلة مسبقاً (Replay Idempotency).'),
            'is_duplicate' => !$invoice->wasRecentlyCreated,
            'is_posted' => (bool) $invoice->is_posted,
            'supplier_invoice' => $invoice,
        ], $statusCode);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PosSession;
use App\Models\Quotation;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Services\SalesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalesController extends Controller
{
    public function __construct(
        protected SalesService $salesService
    ) {}

    public function quotations(): JsonResponse
    {
        $quotations = Quotation::with(['customer', 'items.variant.garmentModel'])
            ->latest()
            ->paginate(20);

        return response()->json($quotations);
    }

    public function storeQuotation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_id' => 'nullable|uuid',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'nullable|uuid',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'valid_until' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $quotation = $this->salesService->createQuotation($validated);

        return response()->json([
            'message' => 'تم إنشاء عرض السعر بنجاح',
            'quotation' => $quotation,
        ], 201);
    }

    public function salesOrders(): JsonResponse
    {
        $orders = SalesOrder::with(['customer', 'warehouse', 'items.variant.garmentModel', 'invoices'])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function storeSalesOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_id' => 'nullable|uuid',
            'quotation_id' => 'nullable|uuid',
            'warehouse_id' => 'nullable|uuid',
            'order_type' => 'nullable|string|in:wholesale,retail,outlet,custom',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid',
            'items.*.ordered_quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'expected_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $order = $this->salesService->createSalesOrder($validated);

        return response()->json([
            'message' => 'تم تسجيل أمر البيع بنجاح',
            'order' => $order,
        ], 201);
    }

    public function reserveOrderStock(string $id): JsonResponse
    {
        $order = $this->salesService->reserveOrderStock($id);

        return response()->json([
            'message' => 'تم حجز رصيد المخزون للمنتجات التامة بنجاح',
            'order' => $order,
        ]);
    }

    public function fulfillOrder(string $id): JsonResponse
    {
        $invoice = $this->salesService->fulfillOrder($id);

        return response()->json([
            'message' => 'تم صرف البضاعة من المخزن وإصدار فاتورة المبيعات بنجاح',
            'invoice' => $invoice,
        ]);
    }

    public function invoices(): JsonResponse
    {
        $invoices = SalesInvoice::with(['customer', 'salesOrder', 'items.variant.garmentModel'])
            ->latest()
            ->paginate(20);

        return response()->json($invoices);
    }

    public function posSale(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'pos_session_id' => 'nullable|uuid',
            'payment_method' => 'required|string|in:cash,card,bank_transfer',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
        ]);

        $invoice = $this->salesService->processPosSale($validated);

        return response()->json([
            'message' => 'تم تسجيل عملية البيع السريع وإصدار الإيصال بنجاح',
            'invoice' => $invoice,
        ], 201);
    }

    public function posSessions(): JsonResponse
    {
        $sessions = PosSession::with(['user', 'branch'])->latest()->paginate(20);

        return response()->json($sessions);
    }

    public function openPosSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|uuid',
            'opening_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');

        if (!empty($validated['branch_id'])) {
            \App\Models\Branch::where('tenant_id', $tenantId)->findOrFail($validated['branch_id']);
        }

        $session = PosSession::create([
            'tenant_id' => $tenantId,
            'branch_id' => $validated['branch_id'] ?? null,
            'user_id' => auth()->id(),
            'session_code' => 'POS-SES-' . date('Ymd-His'),
            'opening_cash' => $validated['opening_cash'],
            'total_sales' => 0,
            'status' => 'open',
            'opened_at' => now(),
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json([
            'message' => 'تم فتح جلسة الكاشير بنجاح',
            'session' => $session,
        ], 201);
    }

    public function closePosSession(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'closing_cash' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $tenantId = app('current_tenant_id');
        $session = PosSession::where('tenant_id', $tenantId)->where('id', $id)->firstOrFail();

        $session->closing_cash = $validated['closing_cash'];
        $session->status = 'closed';
        $session->closed_at = now();
        if (isset($validated['notes'])) {
            $session->notes = $session->notes ? ($session->notes . "\n" . $validated['notes']) : $validated['notes'];
        }
        $session->save();

        return response()->json([
            'message' => 'تم إغلاق جلسة الكاشير بنجاح',
            'session' => $session,
        ]);
    }

    public function deliveryNotes(): JsonResponse
    {
        $notes = $this->salesService->getDeliveryNotes();

        return response()->json($notes);
    }

    public function storeDeliveryNote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sales_order_id' => 'required|uuid|exists:sales_orders,id',
            'warehouse_id' => 'nullable|uuid|exists:warehouses,id',
            'delivery_date' => 'nullable|date',
            'status' => 'nullable|string|in:preparing,packed,dispatched,delivered,cancelled',
            'shipping_carrier' => 'nullable|string|max:100',
            'tracking_number' => 'nullable|string|max:100',
            'recipient_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'cartons' => 'nullable|array',
            'cartons.*.carton_number' => 'nullable|string|max:50',
            'cartons.*.gross_weight_kg' => 'nullable|numeric|min:0',
            'cartons.*.dimensions' => 'nullable|string|max:100',
            'cartons.*.pieces_count' => 'nullable|integer|min:1',
            'cartons.*.packing_details' => 'nullable|string',
        ]);

        $deliveryNote = $this->salesService->createDeliveryNote($validated);

        return response()->json([
            'message' => 'تم إصدار إذن التسليم وتعبئة الشحنة بنجاح',
            'delivery_note' => $deliveryNote,
        ], 201);
    }

    public function salesReturns(): JsonResponse
    {
        $returns = $this->salesService->getSalesReturns();

        return response()->json($returns);
    }

    public function storeSalesReturn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'required|uuid|exists:warehouses,id',
            'customer_id' => 'nullable|uuid|exists:customers,id',
            'sales_order_id' => 'nullable|uuid|exists:sales_orders,id',
            'sales_invoice_id' => 'nullable|uuid|exists:sales_invoices,id',
            'return_date' => 'nullable|date',
            'reason' => 'required|string|max:255',
            'is_restocked' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.condition' => 'nullable|string|in:good,defective,scrap',
            'items.*.action_taken' => 'nullable|string|in:restock,repair,discard',
        ]);

        $salesReturn = $this->salesService->createSalesReturn($validated);

        return response()->json([
            'message' => 'تم تسجيل مرتجع المبيعات بنجاح',
            'sales_return' => $salesReturn,
        ], 201);
    }
}


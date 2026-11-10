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
        $orders = SalesOrder::with([
            'customer',
            'warehouse',
            'items.variant.garmentModel',
            'items.variant.size',
            'items.variant.color',
            'invoices'
        ])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function showSalesOrder(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $order = SalesOrder::where('tenant_id', $tenantId)
            ->with([
                'customer',
                'warehouse',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
                'invoices',
                'deliveryNotes',
            ])
            ->findOrFail($id);

        return response()->json([
            'order' => $order,
            'sales_order' => $order,
        ]);
    }

    public function storeSalesOrder(Request $request): JsonResponse
    {
        if ($request->has('customer_id') && !$request->has('customer_name')) {
            $cust = \App\Models\Customer::find($request->input('customer_id'));
            if ($cust) {
                $request->merge(['customer_name' => $cust->name]);
            }
        }

        if ($request->has('items') && is_array($request->input('items'))) {
            $items = array_map(function ($item) {
                if (is_array($item) && isset($item['quantity']) && !isset($item['ordered_quantity'])) {
                    $item['ordered_quantity'] = $item['quantity'];
                }
                return $item;
            }, $request->input('items'));
            $request->merge(['items' => $items]);
        }

        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_id' => 'nullable|uuid',
            'quotation_id' => 'nullable|uuid',
            'warehouse_id' => 'nullable|uuid',
            'order_type' => 'nullable|string|in:wholesale,retail,outlet,custom',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid|exists:product_variants,id',
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
            'sales_order' => $order,
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
        $tenantId = app('current_tenant_id');
        $invoices = SalesInvoice::where('tenant_id', $tenantId)
            ->with([
                'tenant',
                'customer',
                'warehouse',
                'salesOrder.warehouse',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
            ])
            ->latest()
            ->paginate(20);

        return response()->json($invoices);
    }

    public function showInvoice(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $invoice = SalesInvoice::where('tenant_id', $tenantId)
            ->with([
                'tenant',
                'customer',
                'warehouse',
                'salesOrder.warehouse',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
            ])
            ->findOrFail($id);

        $returnedQuantities = \App\Models\SalesReturnItem::where('tenant_id', $tenantId)
            ->whereHas('salesReturn', function ($q) use ($id) {
                $q->where('sales_invoice_id', $id);
            })
            ->select('variant_id', \Illuminate\Support\Facades\DB::raw('SUM(quantity) as total_returned'))
            ->groupBy('variant_id')
            ->pluck('total_returned', 'variant_id');

        $invoiceData = $invoice->toArray();
        if (!empty($invoiceData['items'])) {
            foreach ($invoiceData['items'] as &$item) {
                $variantId = $item['variant_id'] ?? null;
                $alreadyReturned = (float)($returnedQuantities[$variantId] ?? 0);
                $item['returned_quantity'] = $alreadyReturned;
                $item['remaining_returnable_quantity'] = max(0, (float)$item['quantity'] - $alreadyReturned);
            }
        }

        return response()->json([
            'invoice' => $invoiceData,
        ]);
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

    public function showSalesReturn(string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $salesReturn = \App\Models\SalesReturn::where('tenant_id', $tenantId)
            ->with([
                'customer',
                'salesOrder',
                'salesInvoice',
                'warehouse',
                'items.variant.garmentModel',
                'items.variant.size',
                'items.variant.color',
            ])
            ->findOrFail($id);

        return response()->json([
            'sales_return' => $salesReturn,
        ]);
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
            'refund_payment' => 'nullable|boolean',
            'amount' => 'nullable|numeric|min:0.01',
            'idempotency_key' => 'nullable|string|max:100',
            'refund_payment_method' => 'nullable|string|in:cash,card,bank_transfer',
            'refund_account_id' => 'nullable|uuid|exists:chart_of_accounts,id',
            'items' => 'required|array|min:1',
            'items.*.variant_id' => 'required|uuid|exists:product_variants,id',
            'items.*.quantity' => 'required|numeric|min:0.0001',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.condition' => 'nullable|string|in:good,defective,scrap',
            'items.*.action_taken' => 'nullable|string|in:restock,repair,discard',
        ]);

        if ($request->header('X-Idempotency-Key') && empty($validated['idempotency_key'])) {
            $validated['idempotency_key'] = $request->header('X-Idempotency-Key');
        }

        try {
            $salesReturn = $this->salesService->createSalesReturn($validated);

            return response()->json([
                'message' => 'تم تسجيل مرتجع المبيعات بنجاح',
                'sales_return' => $salesReturn,
            ], 201);
        } catch (\Symfony\Component\HttpKernel\Exception\ConflictHttpException $e) {
            return response()->json([
                'error' => 'IdempotencyConflict',
                'message' => $e->getMessage(),
            ], 409);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvalidReturnData',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function refundSalesReturn(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0.01',
            'payment_method' => 'nullable|string|in:cash,card,bank_transfer',
            'account_id' => 'nullable|uuid|exists:chart_of_accounts,id',
            'notes' => 'nullable|string|max:500',
            'idempotency_key' => 'nullable|string|max:100',
        ]);

        if ($request->header('X-Idempotency-Key') && empty($validated['idempotency_key'])) {
            $validated['idempotency_key'] = $request->header('X-Idempotency-Key');
        }

        try {
            $result = $this->salesService->processSalesReturnRefund($id, $validated);

            return response()->json([
                'message' => 'تم صرف الاسترداد النقدي للمرتجع وإثبات السند المحاسبي بنجاح',
                'sales_return' => $result['sales_return'],
                'payment_voucher' => $result['payment_voucher'],
                'invoice' => $result['invoice'],
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\ConflictHttpException $e) {
            return response()->json([
                'error' => 'IdempotencyConflict',
                'message' => $e->getMessage(),
            ], 409);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'RefundProcessingError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * تحويل عرض سعر إلى أمر بيع رسمي
     */
    public function convertQuotation(string $id): JsonResponse
    {
        try {
            $order = $this->salesService->convertQuotationToOrder($id);

            return response()->json([
                'message' => 'تم تحويل عرض السعر إلى أمر بيع بنجاح',
                'sales_order' => $order,
                'order' => $order,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'QuotationConversionError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * إلغاء أمر بيع مع فك حجز المخزون
     */
    public function cancelSalesOrder(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $order = $this->salesService->cancelSalesOrder($id, $validated['reason']);

            return response()->json([
                'message' => 'تم إلغاء أمر البيع وفك حجز المخزون بنجاح',
                'sales_order' => $order,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'SalesOrderCancellationError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * إلغاء فاتورة مبيعات غير مسددة
     */
    public function cancelSalesInvoice(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $invoice = $this->salesService->cancelSalesInvoice($id, $validated['reason']);

            return response()->json([
                'message' => 'تم إلغاء فاتورة المبيعات بنجاح',
                'sales_invoice' => $invoice,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'InvoiceCancellationError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * تسليم أمر البيع وصرف البضاعة التامة (دعم التسليم الجزئي والكامل)
     */
    public function deliverOrder(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => 'nullable|uuid|exists:warehouses,id',
            'delivery_date' => 'nullable|date',
            'shipping_carrier' => 'nullable|string|max:100',
            'tracking_number' => 'nullable|string|max:100',
            'recipient_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'items' => 'nullable|array',
            'items.*.sales_order_item_id' => 'nullable|uuid',
            'items.*.variant_id' => 'nullable|uuid',
            'items.*.quantity' => 'required_with:items|numeric|min:0.0001',
        ]);

        try {
            $deliveryNote = $this->salesService->deliverOrder($id, $validated);

            return response()->json([
                'message' => 'تم تسجيل إذن التسليم وصرف البضاعة التامة بنجاح',
                'delivery_note' => $deliveryNote,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'DeliveryExecutionError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * إلغاء إذن التسليم واسترجاع الكميات للمخزن
     */
    public function cancelDeliveryNote(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $deliveryNote = $this->salesService->cancelDeliveryNote($id, $validated['reason']);

            return response()->json([
                'message' => 'تم إلغاء إذن التسليم واسترجاع الكميات للمخزن بنجاح',
                'delivery_note' => $deliveryNote,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'DeliveryCancellationError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * قائمة سندات القبض ودفعات العملاء
     */
    public function payments(): JsonResponse
    {
        $payments = $this->salesService->getPayments();
        return response()->json($payments);
    }

    /**
     * تسجيل سند قبض مالي من العميل وتخصيصه على الفواتير
     */
    public function storePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|uuid|exists:customers,id',
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|in:cash,card,bank_transfer,wallet,check',
            'account_id' => 'nullable|uuid|exists:chart_of_accounts,id',
            'voucher_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
            'idempotency_key' => 'nullable|string|max:100',
            'sales_invoice_id' => 'nullable|uuid|exists:sales_invoices,id',
            'allocations' => 'nullable|array',
            'allocations.*.sales_invoice_id' => 'required_with:allocations|uuid|exists:sales_invoices,id',
            'allocations.*.amount' => 'required_with:allocations|numeric|min:0.01',
        ]);

        try {
            $voucher = $this->salesService->recordCustomerPayment($validated);

            return response()->json([
                'message' => 'تم تسجيل سند القبض المالي وتخصيصه بنجاح',
                'payment_voucher' => $voucher,
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'PaymentRecordingError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * إلغاء وعكس سند القبض
     */
    public function reversePayment(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        try {
            $voucher = $this->salesService->reverseCustomerPayment($id, $validated['reason']);

            return response()->json([
                'message' => 'تم إلغاء وعكس سند القبض المالي بنجاح',
                'payment_voucher' => $voucher,
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error' => 'PaymentReversalError',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * قائمة الإشعارات الدائنة
     */
    public function creditNotes(): JsonResponse
    {
        $notes = $this->salesService->getCreditNotes();
        return response()->json($notes);
    }

    /**
     * فحص باركود فوري للـ POS
     */
    public function barcodeLookup(string $barcode): JsonResponse
    {
        $item = $this->salesService->barcodeLookup($barcode);

        if (!$item) {
            return response()->json([
                'error' => 'BarcodeNotFound',
                'message' => 'الباركود غير موجود في سجل الأصناف والمتغيرات المسجلة.',
            ], 404);
        }

        return response()->json(['item' => $item]);
    }
}


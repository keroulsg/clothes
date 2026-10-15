<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerMaterialReceipt;
use App\Models\ExternalOperation;
use App\Models\GarmentModel;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\Warehouse;
use App\Services\SubcontractingService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SubcontractingController extends Controller
{
    public function __construct(
        protected SubcontractingService $subcontractingService
    ) {}

    /**
     * 1. العملاء (Customers)
     */
    public function customers(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $customers = Customer::where('tenant_id', $tenantId)
            ->withCount(['jobOrders', 'materialReceipts'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $customers,
        ]);
    }

    public function storeCustomer(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'tax_id' => 'nullable|string|max:100',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['tenant_id'] = $tenantId;
        $customer = $this->subcontractingService->createCustomer($validated);

        return response()->json([
            'success' => true,
            'message' => 'تم تسجيل العميل بنجاح.',
            'data' => $customer,
        ], 201);
    }

    /**
     * 2. أوامر التشغيل للغير (Job Orders)
     */
    public function jobs(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $query = JobOrder::where('tenant_id', $tenantId)
            ->with(['customer', 'garmentModel', 'items', 'invoices', 'deliveryNotes', 'materialReceipts', 'externalOperations'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        if ($request->has('service_type') && $request->service_type !== '') {
            $query->where('service_type', $request->service_type);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    public function storeJob(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_id' => 'nullable|uuid',
            'service_type' => 'required|string|in:contract_cutting,cmt',
            'garment_model_id' => 'nullable|uuid',
            'production_order_id' => 'nullable|uuid',
            'fabric_source' => 'nullable|string|in:customer_supplied,factory_supplied,mixed',
            'trims_responsibility' => 'nullable|string|in:customer_supplied,factory_supplied,mixed',
            'pricing_basis' => 'nullable|string|in:per_piece,per_meter,per_operation,per_bundle',
            'unit_rate' => 'nullable|numeric|min:0',
            'total_target_quantity' => 'nullable|integer|min:1',
            'planned_start_date' => 'nullable|date',
            'target_delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.color_id' => 'nullable|uuid',
            'items.*.color_name' => 'nullable|string',
            'items.*.size_id' => 'nullable|uuid',
            'items.*.size_name' => 'nullable|string',
            'items.*.product_variant_id' => 'nullable|uuid',
            'items.*.target_quantity' => 'required|integer|min:1',
            'items.*.unit_rate' => 'nullable|numeric|min:0',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        // التحقق من العميل إن وجد
        if (!empty($validated['customer_id'])) {
            $cust = Customer::withoutGlobalScopes()->find($validated['customer_id']);
            if (!$cust || $cust->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: العميل المحدد غير تابع لشركتك.',
                ], 403);
            }
        }

        // التحقق من الموديل إن وجد
        if (!empty($validated['garment_model_id'])) {
            $model = GarmentModel::withoutGlobalScopes()->find($validated['garment_model_id']);
            if (!$model || $model->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: موديل الملابس المحدد غير تابع لشركتك.',
                ], 403);
            }
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $order = $this->subcontractingService->createJobOrder($data, $validated['items'] ?? []);

            $statusCode = $order->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $order->wasRecentlyCreated
                    ? 'تم إنشاء أمر التشغيل للغير بنجاح.'
                    : 'تم استرجاع أمر التشغيل المسجل مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$order->wasRecentlyCreated,
                'data' => $order,
            ], $statusCode);
        } catch (InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function showJob(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $job = JobOrder::withoutGlobalScopes()->find($id);

        if (!$job || $job->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل غير موجود أو غير تابع لشركتك.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $job->load(['items', 'customer', 'garmentModel', 'materialReceipts', 'deliveryNotes.items', 'invoices.items', 'externalOperations', 'cuttingOrders']),
        ]);
    }

    public function confirmJob(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $job = JobOrder::withoutGlobalScopes()->find($id);

        if (!$job || $job->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل غير موجود أو غير تابع لشركتك.',
            ], 403);
        }

        try {
            $confirmed = $this->subcontractingService->confirmJobOrder($id);
            return response()->json([
                'success' => true,
                'message' => 'تم تأكيد أمر التشغيل للغير بنجاح.',
                'data' => $confirmed,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * 3. محاضر استلام الخامات (Material Receipts)
     */
    public function materialReceipts(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $receipts = CustomerMaterialReceipt::where('tenant_id', $tenantId)
            ->with(['customer', 'warehouse', 'jobOrder'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $receipts,
        ]);
    }

    public function storeMaterialReceipt(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'customer_id' => 'nullable|uuid',
            'job_order_id' => 'nullable|uuid',
            'warehouse_id' => 'required|uuid',
            'fabric_name' => 'required|string|max:255',
            'fabric_code' => 'nullable|string|max:100',
            'received_meters' => 'required|numeric|min:0.0001',
            'received_weight_kg' => 'nullable|numeric|min:0',
            'usable_width_meters' => 'nullable|numeric|min:0.1',
            'gsm' => 'nullable|numeric|min:1',
            'rolls_count' => 'nullable|integer|min:1',
            'condition_status' => 'nullable|string|in:accepted,damaged_rolls,conditional_pass',
            'inspector_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        // التحقق من ملكية المستودع
        $warehouse = Warehouse::withoutGlobalScopes()->find($validated['warehouse_id']);
        if (!$warehouse || $warehouse->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: المستودع المحدد غير تابع لشركتك.',
            ], 403);
        }

        // التحقق من ملكية أمر التشغيل إن مرر
        if (!empty($validated['job_order_id'])) {
            $job = JobOrder::withoutGlobalScopes()->find($validated['job_order_id']);
            if (!$job || $job->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر التشغيل غير تابع لشركتك.',
                ], 403);
            }
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $receipt = $this->subcontractingService->receiveCustomerMaterialReceipt($data);

            $statusCode = $receipt->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $receipt->wasRecentlyCreated
                    ? 'تم استلام أمانات خامات العميل وتحديث الرصيد بنجاح.'
                    : 'تم استرجاع إذن الاستلام المسجل مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$receipt->wasRecentlyCreated,
                'data' => $receipt,
            ], $statusCode);
        } catch (InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * 4. التشغيل الخارجي (External Operations)
     */
    public function externalOperations(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $operations = ExternalOperation::where('tenant_id', $tenantId)
            ->with(['jobOrder', 'productionOrder', 'bundle'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $operations,
        ]);
    }

    public function dispatchExternalOperation(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'job_order_id' => 'nullable|uuid',
            'production_order_id' => 'nullable|uuid',
            'cutting_bundle_id' => 'nullable|uuid',
            'subcontractor_name' => 'required|string|max:255',
            'operation_type' => 'required|string|max:50',
            'sent_quantity' => 'required|integer|min:1',
            'unit_rate' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        if (!empty($validated['job_order_id'])) {
            $job = JobOrder::withoutGlobalScopes()->find($validated['job_order_id']);
            if (!$job || $job->tenant_id !== $tenantId) {
                return response()->json([
                    'success' => false,
                    'error' => 'CrossTenantAccessDenied',
                    'message' => 'أمان: أمر التشغيل غير تابع لشركتك.',
                ], 403);
            }
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $op = $this->subcontractingService->dispatchExternalOperation($data);

            $statusCode = $op->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $op->wasRecentlyCreated
                    ? 'تم إرسال أمر التشغيل الخارجي للمقاول بنجاح.'
                    : 'تم استرجاع أمر التشغيل الخارجي مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$op->wasRecentlyCreated,
                'data' => $op,
            ], $statusCode);
        } catch (InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function receiveExternalOperation(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $op = ExternalOperation::withoutGlobalScopes()->find($id);

        if (!$op || $op->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل الخارجي غير تابع لشركتك.',
            ], 403);
        }

        $validated = $request->validate([
            'received_accepted_quantity' => 'required|integer|min:0',
            'received_rejected_quantity' => 'nullable|integer|min:0',
            'scrap_quantity' => 'nullable|integer|min:0',
        ]);

        try {
            $received = $this->subcontractingService->receiveExternalOperation($id, $validated);
            return response()->json([
                'success' => true,
                'message' => 'تم استلام وفحص مخرجات التشغيل الخارجي بنجاح.',
                'data' => $received,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * 5. أذون التسليم للعملاء (Delivery Notes)
     */
    public function deliveryNotes(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $notes = JobDeliveryNote::where('tenant_id', $tenantId)
            ->with(['jobOrder', 'items', 'customer'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $notes,
        ]);
    }

    public function storeDeliveryNote(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'job_order_id' => 'required|uuid',
            'delivery_date' => 'nullable|date',
            'total_delivered_pieces' => 'nullable|integer|min:1',
            'returned_unused_fabric_meters' => 'nullable|numeric|min:0',
            'scrap_fabric_meters' => 'nullable|numeric|min:0',
            'delivered_by' => 'nullable|string|max:255',
            'received_by_customer' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.job_order_item_id' => 'nullable|uuid',
            'items.*.product_variant_id' => 'nullable|uuid',
            'items.*.color_id' => 'nullable|uuid',
            'items.*.size_id' => 'nullable|uuid',
            'items.*.delivered_quantity' => 'required|integer|min:1',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $job = JobOrder::withoutGlobalScopes()->find($validated['job_order_id']);
        if (!$job || $job->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل غير تابع لشركتك.',
            ], 403);
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $note = $this->subcontractingService->createDeliveryNote($data, $validated['items'] ?? []);

            $statusCode = $note->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $note->wasRecentlyCreated
                    ? 'تم إصدار إذن التسليم ومصالحة الخامات بنجاح.'
                    : 'تم استرجاع إذن التسليم المسجل مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$note->wasRecentlyCreated,
                'data' => $note,
            ], $statusCode);
        } catch (InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * 6. فواتير خدمات التشغيل (Job Invoices)
     */
    public function invoices(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $invoices = JobInvoice::where('tenant_id', $tenantId)
            ->with(['jobOrder', 'items', 'customer'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $invoices,
        ]);
    }

    public function storeInvoice(Request $request): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $validated = $request->validate([
            'job_order_id' => 'required|uuid',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'service_amount' => 'nullable|numeric|min:0',
            'additional_charges' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
            'items.*.description' => 'required|string',
            'items.*.item_type' => 'nullable|string',
            'items.*.quantity' => 'required|numeric|min:0',
            'items.*.unit_rate' => 'required|numeric|min:0',
            'items.*.reason' => 'nullable|string',
            'idempotency_key' => 'nullable|string|max:120',
        ]);

        $job = JobOrder::withoutGlobalScopes()->find($validated['job_order_id']);
        if (!$job || $job->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل غير تابع لشركتك.',
            ], 403);
        }

        try {
            $data = $validated;
            $data['tenant_id'] = $tenantId;
            $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?: ($validated['idempotency_key'] ?? null);

            $inv = $this->subcontractingService->createJobInvoice($data, $validated['items'] ?? []);

            $statusCode = $inv->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'success' => true,
                'message' => $inv->wasRecentlyCreated
                    ? 'تم إصدار فاتورة خدمات التشغيل بنجاح.'
                    : 'تم استرجاع الفاتورة المسجلة مسبقاً (Replay Idempotency).',
                'is_duplicate' => !$inv->wasRecentlyCreated,
                'data' => $inv,
            ], $statusCode);
        } catch (InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'Idempotency')) {
                return response()->json([
                    'success' => false,
                    'error' => 'IdempotencyConflict',
                    'message' => $e->getMessage(),
                ], 409);
            }
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function recordPayment(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $invoice = JobInvoice::withoutGlobalScopes()->find($id);

        if (!$invoice || $invoice->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: فاتورة خدمات التشغيل غير تابعة لشركتك.',
            ], 403);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
        ]);

        try {
            $updated = $this->subcontractingService->recordInvoicePayment($id, (float) $validated['amount']);
            return response()->json([
                'success' => true,
                'message' => 'تم تسجيل سداد فاتورة خدمات التشغيل بنجاح.',
                'data' => $updated,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * 7. تقرير ربحية أمر التشغيل (Job Profitability Metrics)
     */
    public function profitability(Request $request, string $id): JsonResponse
    {
        $tenantId = app('current_tenant_id');
        $job = JobOrder::withoutGlobalScopes()->find($id);

        if (!$job || $job->tenant_id !== $tenantId) {
            return response()->json([
                'success' => false,
                'error' => 'CrossTenantAccessDenied',
                'message' => 'أمان: أمر التشغيل غير تابع لشركتك.',
            ], 403);
        }

        try {
            $metrics = $this->subcontractingService->calculateJobProfitability($id);
            return response()->json([
                'success' => true,
                'data' => $metrics,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}

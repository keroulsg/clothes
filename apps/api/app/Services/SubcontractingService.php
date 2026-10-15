<?php

namespace App\Services;

use App\Exceptions\IdempotencyCollisionException;
use App\Models\Customer;
use App\Models\CustomerMaterial;
use App\Models\CustomerMaterialReceipt;
use App\Models\ExternalOperation;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JobDeliveryItem;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobInvoiceItem;
use App\Models\JobOrder;
use App\Models\JobOrderItem;
use App\Models\ProductionOrder;
use App\Models\Warehouse;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class SubcontractingService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Get validated current tenant ID
     */
    protected function getTenantId(?string $providedTenantId = null): string
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة مفقود. لا يمكن إجراء عمليات التشغيل للغير دون سياق شركة موثق.');
        }

        if (!empty($providedTenantId) && (string)$providedTenantId !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض أمني؛ هوية الشركة الممررة تخالف سياق الشركة المعتمد الحالي.');
        }

        return $contextTenantId;
    }

    /**
     * 1. إدارة العملاء (Customers Master)
     */
    public function createCustomer(array $data): Customer
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);

        $code = !empty($data['code']) ? $data['code'] : ('CUST-' . strtoupper(bin2hex(random_bytes(3))));

        return Customer::create([
            'tenant_id' => $tenantId,
            'code' => $code,
            'name' => $data['name'],
            'contact_person' => $data['contact_person'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'tax_id' => $data['tax_id'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    public function getCustomers(): Collection
    {
        $tenantId = $this->getTenantId();
        return Customer::where('tenant_id', $tenantId)->orderBy('name')->get();
    }

    /**
     * حساب بصمة موحدة لأمر التشغيل للغير للتحقق من الـ Idempotency
     */
    public function calculateJobOrderFingerprint(array $data, array $items = []): string
    {
        $normalizedItems = [];
        foreach ($items as $item) {
            $normalizedItems[] = [
                'color_id' => (string) ($item['color_id'] ?? ''),
                'size_id' => (string) ($item['size_id'] ?? ''),
                'target_quantity' => (int) ($item['target_quantity'] ?? 0),
                'unit_rate' => round((float) ($item['unit_rate'] ?? 0), 4),
            ];
        }

        usort($normalizedItems, function ($a, $b) {
            return strcmp($a['color_id'] . '|' . $a['size_id'], $b['color_id'] . '|' . $b['size_id']);
        });

        $canonical = [
            'customer_name' => trim((string) ($data['customer_name'] ?? '')),
            'service_type' => (string) ($data['service_type'] ?? 'contract_cutting'),
            'garment_model_id' => (string) ($data['garment_model_id'] ?? ''),
            'fabric_source' => (string) ($data['fabric_source'] ?? 'customer_supplied'),
            'pricing_basis' => (string) ($data['pricing_basis'] ?? 'per_piece'),
            'unit_rate' => round((float) ($data['unit_rate'] ?? 0), 4),
            'total_target_quantity' => (int) ($data['total_target_quantity'] ?? 0),
            'items' => $normalizedItems,
        ];

        return hash('sha256', json_encode($canonical, JSON_UNESCAPED_UNICODE));
    }

    /**
     * حساب البصمة لأمر تشغيل موجود
     */
    public function calculateExistingJobOrderFingerprint(JobOrder $order): string
    {
        $order->loadMissing('items');
        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'color_id' => (string) ($item->color_id ?? ''),
                'size_id' => (string) ($item->size_id ?? ''),
                'target_quantity' => (int) $item->target_quantity,
                'unit_rate' => round((float) $item->unit_rate, 4),
            ];
        }

        $data = [
            'customer_name' => (string) $order->customer_name,
            'service_type' => (string) $order->service_type,
            'garment_model_id' => (string) ($order->garment_model_id ?? ''),
            'fabric_source' => (string) $order->fabric_source,
            'pricing_basis' => (string) $order->pricing_basis,
            'unit_rate' => round((float) $order->unit_rate, 4),
            'total_target_quantity' => (int) $order->total_target_quantity,
        ];

        return $this->calculateJobOrderFingerprint($data, $items);
    }

    /**
     * 2. إنشاء أمر تشغيل للغير (Contract Cutting أو CMT)
     */
    public function createJobOrder(array $data, array $items = []): JobOrder
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // التحقق من صحة العميل إن مرر customer_id
        $customerId = $data['customer_id'] ?? null;
        if ($customerId) {
            $customer = Customer::where('tenant_id', $tenantId)->where('id', $customerId)->first();
            if (!$customer) {
                throw new InvalidArgumentException('أمان: العميل المحدد غير موجود أو غير تابع للشركة الحالية.');
            }
        }

        // التحقق من صحة الموديل إن مرر
        $modelId = $data['garment_model_id'] ?? null;
        if ($modelId) {
            $model = GarmentModel::where('tenant_id', $tenantId)->where('id', $modelId)->first();
            if (!$model) {
                throw new InvalidArgumentException('أمان: موديل الملابس غير موجود أو غير تابع للشركة الحالية.');
            }
        }

        $serviceType = $data['service_type'] ?? 'contract_cutting';
        if (!in_array($serviceType, ['contract_cutting', 'cmt'])) {
            throw new InvalidArgumentException('نوع الخدمة يجب أن يكون contract_cutting (قص للغير) أو cmt (تصنيع كامل للغير).');
        }

        // احتساب الكمية الإجمالية من البنود أو الحقل المباشر
        $totalTarget = 0;
        if (!empty($items)) {
            foreach ($items as $item) {
                $qty = (int) ($item['target_quantity'] ?? 0);
                if ($qty <= 0) {
                    throw new InvalidArgumentException('كمية كل بند من بنود أمر التشغيل يجب أن تكون أكبر من الصفر.');
                }
                $totalTarget += $qty;
            }
        } else {
            $totalTarget = (int) ($data['total_target_quantity'] ?? 0);
            if ($totalTarget <= 0) {
                throw new InvalidArgumentException('الكمية المستهدفة لأمر التشغيل يجب أن تكون أكبر من الصفر.');
            }
        }

        $incomingFingerprint = $this->calculateJobOrderFingerprint($data, $items);

        // فحص مسبق للـ Idempotency
        if ($idempotencyKey) {
            $existing = JobOrder::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                $existingFingerprint = $this->calculateExistingJobOrderFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً بحقول مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items', 'customer', 'garmentModel');
            }
        }

        try {
            return DB::transaction(function () use ($tenantId, $data, $items, $customerId, $modelId, $serviceType, $totalTarget, $idempotencyKey) {
                try {
                    $order = JobOrder::create([
                        'tenant_id' => $tenantId,
                        'order_number' => $data['order_number'] ?? ('JOB-' . date('Ym') . '-' . rand(1000, 9999)),
                        'customer_id' => $customerId,
                        'customer_name' => $data['customer_name'],
                        'service_type' => $serviceType,
                        'garment_model_id' => $modelId,
                        'production_order_id' => $data['production_order_id'] ?? null,
                        'fabric_source' => $data['fabric_source'] ?? 'customer_supplied',
                        'trims_responsibility' => $data['trims_responsibility'] ?? 'customer_supplied',
                        'status' => 'draft',
                        'pricing_basis' => $data['pricing_basis'] ?? 'per_piece',
                        'unit_rate' => $data['unit_rate'] ?? 0.0,
                        'total_target_quantity' => $totalTarget,
                        'total_received_meters' => 0.0,
                        'total_cut_quantity' => 0,
                        'total_accepted_quantity' => 0,
                        'total_rejected_quantity' => 0,
                        'total_rework_quantity' => 0,
                        'total_delivered_quantity' => 0,
                        'planned_start_date' => $data['planned_start_date'] ?? date('Y-m-d'),
                        'target_delivery_date' => $data['target_delivery_date'] ?? date('Y-m-d', strtotime('+15 days')),
                        'notes' => $data['notes'] ?? null,
                        'idempotency_key' => $idempotencyKey,
                    ]);
                } catch (QueryException $e) {
                    $isUniqueViolation = $e->getCode() == 23000 
                        || $e->getCode() === '23505' 
                        || stripos($e->getMessage(), 'unique') !== false 
                        || stripos($e->getMessage(), 'duplicate') !== false;
                    if ($idempotencyKey && $isUniqueViolation) {
                        throw new IdempotencyCollisionException($idempotencyKey, $tenantId);
                    }
                    throw $e;
                }

                foreach ($items as $item) {
                    JobOrderItem::create([
                        'tenant_id' => $tenantId,
                        'job_order_id' => $order->id,
                        'product_variant_id' => $item['product_variant_id'] ?? null,
                        'color_id' => $item['color_id'] ?? null,
                        'color_name' => $item['color_name'] ?? null,
                        'size_id' => $item['size_id'] ?? null,
                        'size_name' => $item['size_name'] ?? null,
                        'target_quantity' => (int) $item['target_quantity'],
                        'cut_quantity' => 0,
                        'completed_quantity' => 0,
                        'delivered_quantity' => 0,
                        'unit_rate' => $item['unit_rate'] ?? ($order->unit_rate ?? 0.0),
                    ]);
                }

                return $order->load('items', 'customer', 'garmentModel');
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = JobOrder::where('tenant_id', $e->tenantId)
                ->where('idempotency_key', $e->idempotencyKey)
                ->first();
            if ($existing) {
                $existingFingerprint = $this->calculateExistingJobOrderFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً بحقول مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items', 'customer', 'garmentModel');
            }
            throw $e;
        }
    }

    /**
     * 3. تأكيد أمر التشغيل للغير (Confirm Job Order)
     */
    public function confirmJobOrder(string $jobId): JobOrder
    {
        $tenantId = $this->getTenantId();

        return DB::transaction(function () use ($tenantId, $jobId) {
            $order = JobOrder::where('tenant_id', $tenantId)
                ->where('id', $jobId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status !== 'draft') {
                throw new Exception("أمر التشغيل في حالة [{$order->status}] ولا يمكن تأكيده مجدداً.");
            }

            $order->status = 'confirmed';
            $order->save();

            return $order->load('items', 'customer', 'garmentModel');
        });
    }

    /**
     * 4. استلام أمانات خامات العميل (Customer Material Receipt Note) مع تحديث رصيد الأمانة
     */
    public function receiveCustomerMaterialReceipt(array $data): CustomerMaterialReceipt
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // التحقق من صحة المستودع
        $warehouse = Warehouse::where('tenant_id', $tenantId)->where('id', $data['warehouse_id'])->first();
        if (!$warehouse) {
            throw new InvalidArgumentException('أمان: المستودع المحدد غير موجود أو غير تابع للشركة الحالية.');
        }

        $receivedMeters = (float) $data['received_meters'];
        if ($receivedMeters <= 0) {
            throw new InvalidArgumentException('كمية الأقمشة المستلمة يجب أن تكون أكبر من الصفر.');
        }

        // فحص مسبق لعدم التكرار
        if ($idempotencyKey) {
            $existing = CustomerMaterialReceipt::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                if (abs((float)$existing->received_meters - $receivedMeters) > 0.0001 ||
                    $existing->warehouse_id !== $data['warehouse_id'] ||
                    $existing->fabric_name !== $data['fabric_name']) {
                    throw new InvalidArgumentException('تعارض Idempotency: إذن استلام الخامات مكرر بحقول متعارضة (IdempotencyConflict).');
                }
                return $existing->load('warehouse', 'customer');
            }
        }

        try {
            return DB::transaction(function () use ($tenantId, $data, $receivedMeters, $idempotencyKey) {
                // البحث عن سجل CustomerMaterial القائم أو إنشاؤه
                $fabricCode = $data['fabric_code'] ?? ('CUST-' . strtoupper(bin2hex(random_bytes(3))));
                $customerName = trim($data['customer_name']);

                $custMat = CustomerMaterial::where('tenant_id', $tenantId)
                    ->where('customer_name', $customerName)
                    ->where('fabric_name', $data['fabric_name'])
                    ->lockForUpdate()
                    ->first();

                if (!$custMat) {
                    $custMat = CustomerMaterial::create([
                        'tenant_id' => $tenantId,
                        'customer_id' => $data['customer_id'] ?? null,
                        'customer_name' => $customerName,
                        'fabric_name' => $data['fabric_name'],
                        'fabric_code' => $fabricCode,
                        'gsm' => $data['gsm'] ?? 180.00,
                        'usable_width_meters' => $data['usable_width_meters'] ?? 1.600,
                        'received_meters' => $receivedMeters,
                        'consumed_meters' => 0.0,
                        'waste_meters' => 0.0,
                        'returned_meters' => 0.0,
                        'remaining_meters' => $receivedMeters,
                        'warehouse_id' => $data['warehouse_id'],
                        'notes' => $data['notes'] ?? null,
                    ]);
                } else {
                    $custMat->received_meters = round((float)$custMat->received_meters + $receivedMeters, 4);
                    $custMat->remaining_meters = round((float)$custMat->remaining_meters + $receivedMeters, 4);
                    $custMat->save();
                }

                // إنشاء محضر الاستلام الرسمي
                try {
                    $receipt = CustomerMaterialReceipt::create([
                        'tenant_id' => $tenantId,
                        'receipt_number' => $data['receipt_number'] ?? ('CMR-' . date('Ym') . '-' . rand(1000, 9999)),
                        'job_order_id' => $data['job_order_id'] ?? null,
                        'customer_id' => $data['customer_id'] ?? $custMat->customer_id,
                        'customer_material_id' => $custMat->id,
                        'customer_name' => $customerName,
                        'warehouse_id' => $data['warehouse_id'],
                        'fabric_name' => $data['fabric_name'],
                        'fabric_code' => $custMat->fabric_code,
                        'received_meters' => $receivedMeters,
                        'received_weight_kg' => $data['received_weight_kg'] ?? null,
                        'usable_width_meters' => $data['usable_width_meters'] ?? 1.600,
                        'gsm' => $data['gsm'] ?? 180.00,
                        'rolls_count' => (int) ($data['rolls_count'] ?? 1),
                        'condition_status' => $data['condition_status'] ?? 'accepted',
                        'inspector_name' => $data['inspector_name'] ?? null,
                        'notes' => $data['notes'] ?? null,
                        'idempotency_key' => $idempotencyKey,
                    ]);
                } catch (QueryException $e) {
                    $isUniqueViolation = $e->getCode() == 23000 
                        || $e->getCode() === '23505' 
                        || stripos($e->getMessage(), 'unique') !== false 
                        || stripos($e->getMessage(), 'duplicate') !== false;
                    if ($idempotencyKey && $isUniqueViolation) {
                        throw new IdempotencyCollisionException($idempotencyKey, $tenantId);
                    }
                    throw $e;
                }

                // إذا كان الإذن مرتبطاً بأمر تشغيل، نحدث إجمالي الأمتار المستلمة وحالة الأمر
                if (!empty($data['job_order_id'])) {
                    $job = JobOrder::where('tenant_id', $tenantId)->where('id', $data['job_order_id'])->lockForUpdate()->first();
                    if ($job) {
                        $job->total_received_meters = round((float)$job->total_received_meters + $receivedMeters, 4);
                        if (in_array($job->status, ['draft', 'confirmed'])) {
                            $job->status = 'materials_received';
                        }
                        $job->save();
                    }
                }

                return $receipt->load('warehouse', 'customer', 'customerMaterial');
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = CustomerMaterialReceipt::where('tenant_id', $e->tenantId)
                ->where('idempotency_key', $e->idempotencyKey)
                ->first();
            if ($existing) {
                if (abs((float)$existing->received_meters - $receivedMeters) > 0.0001 ||
                    $existing->warehouse_id !== $data['warehouse_id'] ||
                    $existing->fabric_name !== $data['fabric_name']) {
                    throw new InvalidArgumentException('تعارض Idempotency: إذن استلام الخامات مكرر بحقول متعارضة (IdempotencyConflict).');
                }
                return $existing->load('warehouse', 'customer');
            }
            throw $e;
        }
    }

    /**
     * 5. إرسال تشغيل خارجي لمقاول باطن (External Processing Dispatch)
     */
    public function dispatchExternalOperation(array $data): ExternalOperation
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        $sentQty = (int) $data['sent_quantity'];
        if ($sentQty <= 0) {
            throw new InvalidArgumentException('الكمية المرسلة للتشغيل الخارجي يجب أن تكون أكبر من الصفر.');
        }

        $unitRate = (float) ($data['unit_rate'] ?? 0.0);
        $totalCost = round($sentQty * $unitRate, 4);

        if ($idempotencyKey) {
            $existing = ExternalOperation::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                if ($existing->sent_quantity !== $sentQty || $existing->operation_type !== $data['operation_type']) {
                    throw new InvalidArgumentException('تعارض Idempotency: أمر التشغيل الخارجي مكرر بحقول مختلفة (IdempotencyConflict).');
                }
                return $existing;
            }
        }

        try {
            return DB::transaction(function () use ($tenantId, $data, $sentQty, $unitRate, $totalCost, $idempotencyKey) {
                // التحقق من أمر التشغيل إن وجد
                if (!empty($data['job_order_id'])) {
                    $job = JobOrder::where('tenant_id', $tenantId)->where('id', $data['job_order_id'])->first();
                    if (!$job) {
                        throw new InvalidArgumentException('أمان: أمر التشغيل غير موجود أو غير تابع للشركة الحالية.');
                    }
                }

                try {
                    return ExternalOperation::create([
                        'tenant_id' => $tenantId,
                        'operation_number' => $data['operation_number'] ?? ('EXT-' . date('Ym') . '-' . rand(1000, 9999)),
                        'job_order_id' => $data['job_order_id'] ?? null,
                        'production_order_id' => $data['production_order_id'] ?? null,
                        'cutting_bundle_id' => $data['cutting_bundle_id'] ?? null,
                        'subcontractor_name' => $data['subcontractor_name'],
                        'operation_type' => $data['operation_type'],
                        'sent_quantity' => $sentQty,
                        'received_accepted_quantity' => 0,
                        'received_rejected_quantity' => 0,
                        'scrap_quantity' => 0,
                        'unit_rate' => $unitRate,
                        'total_cost' => $totalCost,
                        'status' => 'dispatched',
                        'dispatched_at' => now(),
                        'notes' => $data['notes'] ?? null,
                        'idempotency_key' => $idempotencyKey,
                    ]);
                } catch (QueryException $e) {
                    $isUniqueViolation = $e->getCode() == 23000 
                        || $e->getCode() === '23505' 
                        || stripos($e->getMessage(), 'unique') !== false 
                        || stripos($e->getMessage(), 'duplicate') !== false;
                    if ($idempotencyKey && $isUniqueViolation) {
                        throw new IdempotencyCollisionException($idempotencyKey, $tenantId);
                    }
                    throw $e;
                }
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = ExternalOperation::where('tenant_id', $e->tenantId)
                ->where('idempotency_key', $e->idempotencyKey)
                ->first();
            if ($existing) {
                if ($existing->sent_quantity !== $sentQty || $existing->operation_type !== $data['operation_type']) {
                    throw new InvalidArgumentException('تعارض Idempotency: أمر التشغيل الخارجي مكرر بحقول مختلفة (IdempotencyConflict).');
                }
                return $existing;
            }
            throw $e;
        }
    }

    /**
     * 6. استلام وفحص مخرجات التشغيل الخارجي
     */
    public function receiveExternalOperation(string $operationId, array $data): ExternalOperation
    {
        $tenantId = $this->getTenantId();

        return DB::transaction(function () use ($tenantId, $operationId, $data) {
            $operation = ExternalOperation::where('tenant_id', $tenantId)
                ->where('id', $operationId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($operation->status === 'completed' || $operation->status === 'cancelled') {
                throw new Exception("أمر التشغيل الخارجي في حالة [{$operation->status}] ولا يمكن استلامه مجدداً.");
            }

            $accepted = (int) $data['received_accepted_quantity'];
            $rejected = (int) ($data['received_rejected_quantity'] ?? 0);
            $scrap = (int) ($data['scrap_quantity'] ?? 0);

            if ($accepted < 0 || $rejected < 0 || $scrap < 0) {
                throw new InvalidArgumentException('الكميات المستلمة لا يمكن أن تكون سالبة.');
            }

            $totalReturned = $accepted + $rejected + $scrap;
            if ($totalReturned > $operation->sent_quantity) {
                throw new InvalidArgumentException("إجمالي الكمية الراجعة [{$totalReturned}] يتجاوز الكمية المرسلة أصلاً [{$operation->sent_quantity}].");
            }

            $operation->received_accepted_quantity = $accepted;
            $operation->received_rejected_quantity = $rejected;
            $operation->scrap_quantity = $scrap;
            $operation->returned_at = now();
            $operation->status = $totalReturned >= $operation->sent_quantity ? 'completed' : 'partially_returned';
            $operation->save();

            return $operation;
        });
    }

    /**
     * 7. إصدار إذن تسليم للعميل مع مصالحة خامات الأمانة (Job Delivery Note & Material Reconciliation)
     */
    public function createDeliveryNote(array $data, array $items = []): JobDeliveryNote
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        $jobId = $data['job_order_id'];

        if ($idempotencyKey) {
            $existing = JobDeliveryNote::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing->load('items', 'jobOrder');
            }
        }

        return DB::transaction(function () use ($tenantId, $data, $items, $jobId, $idempotencyKey) {
            // قفل أمر التشغيل بالترتيب أولاً
            $job = JobOrder::where('tenant_id', $tenantId)
                ->where('id', $jobId)
                ->lockForUpdate()
                ->firstOrFail();

            if (in_array($job->status, ['completed', 'cancelled'])) {
                throw new Exception("أمر التشغيل في حالة [{$job->status}] ولا يقبل تسليمات إضافية.");
            }

            // حساب إجمالي القطع المراد تسليمها
            $deliveredPieces = 0;
            if (!empty($items)) {
                foreach ($items as $item) {
                    $qty = (int) ($item['delivered_quantity'] ?? 0);
                    if ($qty <= 0) {
                        throw new InvalidArgumentException('كمية التسليم لكل بند يجب أن تكون أكبر من الصفر.');
                    }
                    $deliveredPieces += $qty;
                }
            } else {
                $deliveredPieces = (int) ($data['total_delivered_pieces'] ?? 0);
            }

            if ($deliveredPieces <= 0) {
                throw new InvalidArgumentException('إجمالي عدد القطع المسلمة يجب أن يكون أكبر من الصفر.');
            }

            // التحقق من عدم تجاوز الرصيد المتاح للتسليم
            $availableToDeliver = $job->total_target_quantity - $job->total_delivered_quantity;
            if ($deliveredPieces > $availableToDeliver) {
                throw new InvalidArgumentException("الكمية المراد تسليمها [{$deliveredPieces}] تتجاوز الرصيد المتبقي المتاح للتسليم [{$availableToDeliver}].");
            }

            // معالجة إرجاع الخامات غير المستخدمة أو الهالك للعميل
            $returnedFabric = (float) ($data['returned_unused_fabric_meters'] ?? 0.0);
            $scrapFabric = (float) ($data['scrap_fabric_meters'] ?? 0.0);

            if ($returnedFabric < 0 || $scrapFabric < 0) {
                throw new InvalidArgumentException('أمتار القماش المرتجع والهالك لا يمكن أن تكون سالبة.');
            }

            // إذا كان هناك قماش مرتجع أو هالك، نقفل رصيد أمانة العميل ونحدثه مع صيانة المعادلة
            if ($returnedFabric > 0 || $scrapFabric > 0) {
                $custMat = CustomerMaterial::where('tenant_id', $tenantId)
                    ->where('customer_name', $job->customer_name)
                    ->lockForUpdate()
                    ->first();

                if ($custMat) {
                    $totalReturnDeduction = round($returnedFabric + $scrapFabric, 4);
                    if ($totalReturnDeduction > (float)$custMat->remaining_meters) {
                        throw new InvalidArgumentException("كمية القماش المرتجع والهالك [{$totalReturnDeduction}] تتجاوز الرصيد المتبقي من أمانة العميل [{$custMat->remaining_meters}].");
                    }

                    $custMat->returned_meters = round((float)$custMat->returned_meters + $returnedFabric, 4);
                    $custMat->waste_meters = round((float)$custMat->waste_meters + $scrapFabric, 4);
                    $custMat->remaining_meters = round((float)$custMat->remaining_meters - $totalReturnDeduction, 4);

                    // التحقق من اتساق المعادلة الفيزيائية
                    $expectedSum = round((float)$custMat->consumed_meters + (float)$custMat->waste_meters + (float)$custMat->returned_meters + (float)$custMat->remaining_meters, 4);
                    if (abs($expectedSum - (float)$custMat->received_meters) > 0.001) {
                        throw new InvalidArgumentException('خطأ حسابي: عدم اتساق في مجموع كميات خامة العميل عند التسليم.');
                    }

                    $custMat->save();
                }
            }

            // إنشاء إذن التسليم
            try {
                $deliveryNote = JobDeliveryNote::create([
                    'tenant_id' => $tenantId,
                    'delivery_number' => $data['delivery_number'] ?? ('JDN-' . date('Ym') . '-' . rand(1000, 9999)),
                    'job_order_id' => $job->id,
                    'customer_id' => $job->customer_id,
                    'customer_name' => $job->customer_name,
                    'delivery_date' => $data['delivery_date'] ?? date('Y-m-d'),
                    'status' => 'delivered',
                    'total_delivered_pieces' => $deliveredPieces,
                    'returned_unused_fabric_meters' => $returnedFabric,
                    'scrap_fabric_meters' => $scrapFabric,
                    'delivered_by' => $data['delivered_by'] ?? null,
                    'received_by_customer' => $data['received_by_customer'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'idempotency_key' => $idempotencyKey,
                ]);
            } catch (QueryException $e) {
                $isUniqueViolation = $e->getCode() == 23000 
                    || $e->getCode() === '23505' 
                    || stripos($e->getMessage(), 'unique') !== false 
                    || stripos($e->getMessage(), 'duplicate') !== false;
                if ($idempotencyKey && $isUniqueViolation) {
                    throw new IdempotencyCollisionException($idempotencyKey, $tenantId);
                }
                throw $e;
            }

            foreach ($items as $item) {
                JobDeliveryItem::create([
                    'tenant_id' => $tenantId,
                    'job_delivery_note_id' => $deliveryNote->id,
                    'job_order_item_id' => $item['job_order_item_id'] ?? null,
                    'product_variant_id' => $item['product_variant_id'] ?? null,
                    'color_id' => $item['color_id'] ?? null,
                    'size_id' => $item['size_id'] ?? null,
                    'delivered_quantity' => (int) $item['delivered_quantity'],
                    'notes' => $item['notes'] ?? null,
                ]);

                // تحديث الكمية المسلمة في بنود أمر التشغيل إن وجدت
                if (!empty($item['job_order_item_id'])) {
                    JobOrderItem::where('tenant_id', $tenantId)
                        ->where('id', $item['job_order_item_id'])
                        ->increment('delivered_quantity', (int) $item['delivered_quantity']);
                }
            }

            // تحديث كميات أمر التشغيل وحالته
            $job->total_delivered_quantity += $deliveredPieces;
            if ($job->total_delivered_quantity >= $job->total_target_quantity) {
                $job->status = 'completed';
                $job->actual_completion_date = date('Y-m-d');
            } else {
                $job->status = 'partially_delivered';
            }
            $job->save();

            return $deliveryNote->load('items', 'jobOrder');
        });
    }

    /**
     * 8. إصدار فاتورة خدمات التشغيل للغير (Job Service Invoice)
     */
    public function createJobInvoice(array $data, array $items = []): JobInvoice
    {
        $tenantId = $this->getTenantId($data['tenant_id'] ?? null);
        $idempotencyKey = $data['idempotency_key'] ?? null;

        $jobId = $data['job_order_id'];

        if ($idempotencyKey) {
            $existing = JobInvoice::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                return $existing->load('items', 'jobOrder');
            }
        }

        return DB::transaction(function () use ($tenantId, $data, $items, $jobId, $idempotencyKey) {
            $job = JobOrder::where('tenant_id', $tenantId)
                ->where('id', $jobId)
                ->lockForUpdate()
                ->firstOrFail();

            $serviceAmount = round((float) ($data['service_amount'] ?? ($job->total_delivered_quantity * $job->unit_rate)), 4);
            $additionalCharges = round((float) ($data['additional_charges'] ?? 0.0), 4);
            $deductions = round((float) ($data['deductions'] ?? 0.0), 4);
            $taxAmount = round((float) ($data['tax_amount'] ?? 0.0), 4);

            $totalAmount = round($serviceAmount + $additionalCharges - $deductions + $taxAmount, 4);
            if ($totalAmount < 0) {
                throw new InvalidArgumentException('إجمالي الفاتورة لا يمكن أن يكون سالباً.');
            }

            try {
                $invoice = JobInvoice::create([
                    'tenant_id' => $tenantId,
                    'invoice_number' => $data['invoice_number'] ?? ('JINV-' . date('Ym') . '-' . rand(1000, 9999)),
                    'job_order_id' => $job->id,
                    'customer_id' => $job->customer_id,
                    'customer_name' => $job->customer_name,
                    'invoice_date' => $data['invoice_date'] ?? date('Y-m-d'),
                    'due_date' => $data['due_date'] ?? date('Y-m-d', strtotime('+30 days')),
                    'status' => 'issued',
                    'service_amount' => $serviceAmount,
                    'additional_charges' => $additionalCharges,
                    'deductions' => $deductions,
                    'tax_amount' => $taxAmount,
                    'total_amount' => $totalAmount,
                    'paid_amount' => 0.0,
                    'notes' => $data['notes'] ?? null,
                    'idempotency_key' => $idempotencyKey,
                ]);
            } catch (QueryException $e) {
                $isUniqueViolation = $e->getCode() == 23000 
                    || $e->getCode() === '23505' 
                    || stripos($e->getMessage(), 'unique') !== false 
                    || stripos($e->getMessage(), 'duplicate') !== false;
                if ($idempotencyKey && $isUniqueViolation) {
                    throw new IdempotencyCollisionException($idempotencyKey, $tenantId);
                }
                throw $e;
            }

            if (!empty($items)) {
                foreach ($items as $item) {
                    JobInvoiceItem::create([
                        'tenant_id' => $tenantId,
                        'job_invoice_id' => $invoice->id,
                        'description' => $item['description'],
                        'item_type' => $item['item_type'] ?? 'service_charge',
                        'quantity' => (float) ($item['quantity'] ?? 1),
                        'unit_rate' => (float) ($item['unit_rate'] ?? 0),
                        'total_amount' => round((float)($item['quantity'] ?? 1) * (float)($item['unit_rate'] ?? 0), 4),
                        'reason' => $item['reason'] ?? null,
                    ]);
                }
            } else {
                JobInvoiceItem::create([
                    'tenant_id' => $tenantId,
                    'job_invoice_id' => $invoice->id,
                    'description' => "خدمات التشغيل لأمر [{$job->order_number}] ({$job->service_type})",
                    'item_type' => 'service_charge',
                    'quantity' => (float) ($job->total_delivered_quantity > 0 ? $job->total_delivered_quantity : $job->total_target_quantity),
                    'unit_rate' => (float) $job->unit_rate,
                    'total_amount' => $serviceAmount,
                ]);
            }

            return $invoice->load('items', 'jobOrder');
        });
    }

    /**
     * 9. سداد فاتورة خدمات التشغيل
     */
    public function recordInvoicePayment(string $invoiceId, float $paymentAmount): JobInvoice
    {
        $tenantId = $this->getTenantId();

        if ($paymentAmount <= 0) {
            throw new InvalidArgumentException('مبلغ السداد يجب أن يكون أكبر من الصفر.');
        }

        return DB::transaction(function () use ($tenantId, $invoiceId, $paymentAmount) {
            $invoice = JobInvoice::where('tenant_id', $tenantId)
                ->where('id', $invoiceId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($invoice->status === 'paid' || $invoice->status === 'voided') {
                throw new Exception("الفاتورة في حالة [{$invoice->status}] ولا تقبل سداداً إضافياً.");
            }

            $newPaid = round((float)$invoice->paid_amount + $paymentAmount, 4);
            if ($newPaid > (float)$invoice->total_amount) {
                throw new InvalidArgumentException("مبلغ السداد الإجمالي [{$newPaid}] يتجاوز إجمالي الفاتورة [{$invoice->total_amount}].");
            }

            $invoice->paid_amount = $newPaid;
            $invoice->status = $newPaid >= (float)$invoice->total_amount ? 'paid' : 'partially_paid';
            $invoice->save();

            return $invoice;
        });
    }

    /**
     * 10. تقرير ربحية أمر التشغيل للغير (Job Profitability Metrics)
     */
    public function calculateJobProfitability(string $jobId): array
    {
        $tenantId = $this->getTenantId();

        $job = JobOrder::where('tenant_id', $tenantId)
            ->where('id', $jobId)
            ->with(['invoices', 'externalOperations', 'deliveryNotes', 'cuttingOrders'])
            ->firstOrFail();

        // إجمالي إيرادات الخدمة المفوترة
        $serviceRevenue = (float) $job->invoices->where('status', '!=', 'voided')->sum('total_amount');

        // تكاليف التشغيل الخارجي الفعلية (مطرزات، طباعة، مغاسل)
        $externalOpsCost = (float) $job->externalOperations->where('status', '!=', 'cancelled')->sum('total_cost');

        // تكاليف خامات المصنع المصروفة (إن وجدت - خامات ومستلزمات المصنع فقط)
        $factoryMaterialsCost = 0.0;
        if ($job->production_order_id) {
            $factoryMaterialsCost = (float) InventoryTransaction::where('tenant_id', $tenantId)
                ->where('direction', 'OUT')
                ->where('reference_type', 'cutting_order')
                ->whereIn('reference_id', $job->cuttingOrders->pluck('id')->toArray())
                ->sum('total_cost');
        }

        // إجمالي التكاليف المباشرة المسجلة
        $totalDirectCost = round($externalOpsCost + $factoryMaterialsCost, 4);
        $grossMargin = round($serviceRevenue - $totalDirectCost, 4);
        $marginPercentage = $serviceRevenue > 0 ? round(($grossMargin / $serviceRevenue) * 100, 2) : 0.0;

        return [
            'job_order_id' => $job->id,
            'order_number' => $job->order_number,
            'customer_name' => $job->customer_name,
            'service_type' => $job->service_type,
            'status' => $job->status,
            'total_target_pieces' => $job->total_target_quantity,
            'total_delivered_pieces' => $job->total_delivered_quantity,
            'total_received_meters' => (float) $job->total_received_meters,
            'service_revenue' => $serviceRevenue,
            'external_operations_cost' => $externalOpsCost,
            'factory_materials_cost' => $factoryMaterialsCost,
            'customer_materials_cost' => 0.0, // Strictly 0 factory expense (custody liability only)
            'total_direct_cost' => $totalDirectCost,
            'gross_margin' => $grossMargin,
            'margin_percentage' => $marginPercentage,
            'metric_label' => 'هامش ربح الخدمة المباشر (Direct Service Margin)',
            'notes' => 'خامات العميل أمانات تشغيل مستبعدة بالكامل من أصول وتكاليف المصنع. التكاليف تشمل التشغيل الخارجي والخامات المقدمة من المصنع إن وجدت.',
        ];
    }
}

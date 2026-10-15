<?php

namespace App\Services;

use App\Exceptions\IdempotencyCollisionException;
use App\Models\BillOfMaterial;
use App\Models\BomItem;
use App\Models\Branch;
use App\Models\BundleStageLog;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\CustomerMaterial;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\Pattern;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Models\ProductionStage;
use App\Models\QualityDefect;
use App\Models\QualityInspection;
use App\Models\Warehouse;
use Exception;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProductionService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * حساب بصمة معيارية موحدة لطلب أمر الإنتاج للتحقق الدقيق من الـ Idempotency
     */
    public function calculateProductionOrderFingerprint(array $data, array $items): string
    {
        $normalizedItems = [];
        foreach ($items as $item) {
            $normalizedItems[] = [
                'color_id' => (string) ($item['color_id'] ?? ''),
                'size_id' => (string) ($item['size_id'] ?? ''),
                'product_variant_id' => (string) ($item['product_variant_id'] ?? ''),
                'planned_quantity' => (int) ($item['planned_quantity'] ?? 0),
            ];
        }

        // ترتيب البنود ترتيباً ثابتاً لضمان عدم تأثر البصمة بترتيب المصفوفة
        usort($normalizedItems, function ($a, $b) {
            return strcmp(
                $a['color_id'] . '|' . $a['size_id'] . '|' . $a['product_variant_id'],
                $b['color_id'] . '|' . $b['size_id'] . '|' . $b['product_variant_id']
            );
        });

        $canonical = [
            'garment_model_id' => (string) ($data['garment_model_id'] ?? ''),
            'bill_of_material_id' => !empty($data['bill_of_material_id']) ? (string) $data['bill_of_material_id'] : null,
            'branch_id' => !empty($data['branch_id']) ? (string) $data['branch_id'] : null,
            'planned_start_date' => isset($data['planned_start_date']) ? substr((string)$data['planned_start_date'], 0, 10) : null,
            'target_delivery_date' => isset($data['target_delivery_date']) ? substr((string)$data['target_delivery_date'], 0, 10) : null,
            'priority' => (string) ($data['priority'] ?? 'normal'),
            'items' => $normalizedItems,
        ];

        return hash('sha256', json_encode($canonical, JSON_UNESCAPED_UNICODE));
    }

    /**
     * حساب البصمة لأمر إنتاج موجود وبنوده المخزنة
     */
    public function calculateExistingOrderFingerprint(ProductionOrder $order): string
    {
        $order->loadMissing('items');
        $items = [];
        foreach ($order->items as $item) {
            $items[] = [
                'color_id' => (string) $item->color_id,
                'size_id' => (string) $item->size_id,
                'product_variant_id' => (string) ($item->product_variant_id ?? ''),
                'planned_quantity' => (int) $item->planned_quantity,
            ];
        }

        $data = [
            'garment_model_id' => (string) $order->garment_model_id,
            'bill_of_material_id' => (string) $order->bill_of_material_id,
            'branch_id' => (string) $order->branch_id,
            'planned_start_date' => (string) $order->planned_start_date,
            'target_delivery_date' => (string) $order->target_delivery_date,
            'priority' => (string) $order->priority,
        ];

        return $this->calculateProductionOrderFingerprint($data, $items);
    }

    /**
     * إنشاء باترون هندسي جديد للموديل مع التحقق الصارم من سياق الشركة والملكية
     */
    public function createPattern(array $data): Pattern
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة.');
        }

        // التحقق من تبعية الموديل للشركة الموثقة
        $model = GarmentModel::where('tenant_id', $contextTenantId)
            ->where('id', $data['garment_model_id'])
            ->first();
        if (!$model) {
            throw new InvalidArgumentException('أمان: موديل الملابس غير موجود أو غير تابع للشركة الحالية.');
        }

        return Pattern::create([
            'tenant_id' => $contextTenantId,
            'garment_model_id' => $model->id,
            'pattern_code' => $data['pattern_code'] ?? ('PAT-' . strtoupper(bin2hex(random_bytes(3)))),
            'pattern_name' => $data['pattern_name'],
            'version' => $data['version'] ?? '1.0',
            'sample_size' => $data['sample_size'] ?? null,
            'usable_width_meters' => $data['usable_width_meters'] ?? 1.60,
            'grain_direction' => $data['grain_direction'] ?? 'straight',
            'relaxation_hours_required' => $data['relaxation_hours_required'] ?? 24.0,
            'estimated_shrinkage_percent' => $data['estimated_shrinkage_percent'] ?? 3.0,
            'notes' => $data['notes'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    /**
     * إنشاء شجرة خامات ومكونات للموديل (Bill of Materials) مع بنودها
     */
    public function createBom(array $data, array $items): BillOfMaterial
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة.');
        }

        // التحقق من تبعية الموديل للشركة الموثقة
        $model = GarmentModel::where('tenant_id', $contextTenantId)
            ->where('id', $data['garment_model_id'])
            ->first();
        if (!$model) {
            throw new InvalidArgumentException('أمان: موديل الملابس غير موجود أو غير تابع للشركة الحالية.');
        }

        // التحقق من تبعية كافة الأصناف المخزنية لنفس الشركة
        foreach ($items as $item) {
            $invItem = InventoryItem::where('tenant_id', $contextTenantId)
                ->where('id', $item['inventory_item_id'])
                ->first();
            if (!$invItem) {
                throw new InvalidArgumentException('أمان: الصنف المخزني غير موجود أو غير تابع للشركة الحالية.');
            }
        }

        return DB::transaction(function () use ($data, $items, $contextTenantId, $model) {
            $totalEstimatedCost = 0.0;

            foreach ($items as $item) {
                $consumption = (float) $item['consumption_per_unit'];
                $unitCost = (float) ($item['unit_cost'] ?? 0.0);
                $wasteTolerance = (float) ($item['waste_tolerance_percent'] ?? 5.0);
                $totalEstimatedCost += ($consumption * (1 + $wasteTolerance / 100)) * $unitCost;
            }

            $bom = BillOfMaterial::create([
                'tenant_id' => $contextTenantId,
                'garment_model_id' => $model->id,
                'version' => $data['version'] ?? '1.0',
                'bom_code' => $data['bom_code'] ?? ('BOM-' . strtoupper(bin2hex(random_bytes(3)))),
                'name' => $data['name'],
                'status' => $data['status'] ?? 'draft',
                'total_estimated_cost_per_piece' => round($totalEstimatedCost, 4),
                'is_active' => $data['is_active'] ?? true,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                BomItem::create([
                    'tenant_id' => $contextTenantId,
                    'bill_of_material_id' => $bom->id,
                    'inventory_item_id' => $item['inventory_item_id'],
                    'color_id' => $item['color_id'] ?? null,
                    'size_id' => $item['size_id'] ?? null,
                    'component_type' => $item['component_type'] ?? 'fabric',
                    'consumption_per_unit' => $item['consumption_per_unit'],
                    'unit_of_measure' => $item['unit_of_measure'] ?? 'm',
                    'waste_tolerance_percent' => $item['waste_tolerance_percent'] ?? 5.0,
                    'unit_cost' => $item['unit_cost'] ?? 0.0,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return $bom->load('items');
        });
    }

    /**
     * اعتماد إصدار الـ BOM وأرشفة الإصدارات السابقة للموديل
     */
    public function approveBom(string $bomId): BillOfMaterial
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($bomId, $contextTenantId) {
            $bom = BillOfMaterial::where('tenant_id', $contextTenantId)
                ->where('id', $bomId)
                ->lockForUpdate()
                ->firstOrFail();

            // أرشفة أي BOM نشط سابق لنفس الموديل
            BillOfMaterial::where('tenant_id', $contextTenantId)
                ->where('garment_model_id', $bom->garment_model_id)
                ->where('id', '!=', $bomId)
                ->update(['is_active' => false]);

            $bom->status = 'approved';
            $bom->is_active = true;
            $bom->save();

            return $bom;
        });
    }

    /**
     * إنشاء أمر إنتاج وتشغيل جديد مع تفصيل الألوان والمقاسات وبصمة Idempotency دقيقة
     */
    public function createProductionOrder(array $data, array $items): ProductionOrder
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد. لا يمكن إنشاء أمر إنتاج دون سياق شركة موثق.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة. tenant_id الممرر لا يطابق الشركة الموثقة.');
        }
        $tenantId = $contextTenantId;
        $idempotencyKey = $data['idempotency_key'] ?? null;

        // التحقق من ملكية الموديل للشركة الموثقة
        $model = GarmentModel::where('tenant_id', $tenantId)->where('id', $data['garment_model_id'])->first();
        if (!$model) {
            throw new InvalidArgumentException('أمان: موديل الملابس غير موجود أو غير تابع للشركة الحالية.');
        }

        // التحقق من ملكية شجرة الخامات (BOM) إذا مررت
        if (!empty($data['bill_of_material_id'])) {
            $bom = BillOfMaterial::where('tenant_id', $tenantId)->where('id', $data['bill_of_material_id'])->first();
            if (!$bom) {
                throw new InvalidArgumentException('أمان: شجرة الخامات (BOM) غير تابعة للشركة الحالية.');
            }
        }

        // التحقق من ملكية الفرع إذا مرر
        if (!empty($data['branch_id'])) {
            $branch = Branch::where('tenant_id', $tenantId)->where('id', $data['branch_id'])->first();
            if (!$branch) {
                throw new InvalidArgumentException('أمان: الفرع غير تابع للشركة الحالية.');
            }
        }

        // التحقق من صحة بنود أمر الإنتاج
        $totalPlanned = 0;
        foreach ($items as $item) {
            $qty = (int) $item['planned_quantity'];
            if ($qty <= 0) {
                throw new InvalidArgumentException('كمية البند المخططة يجب أن تكون أكبر من الصفر.');
            }
            $totalPlanned += $qty;
        }

        $incomingFingerprint = $this->calculateProductionOrderFingerprint($data, $items);

        // التحقق المسبق من مفتاح عدم التكرار (Idempotency)
        if ($idempotencyKey) {
            $existing = ProductionOrder::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();
            if ($existing) {
                $existingFingerprint = $this->calculateExistingOrderFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً بحقول أو كميات مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items.color', 'items.size', 'garmentModel');
            }
        }

        try {
            return DB::transaction(function () use ($data, $items, $tenantId, $idempotencyKey, $totalPlanned) {
                try {
                    $order = ProductionOrder::create([
                        'tenant_id' => $tenantId,
                        'order_number' => $data['order_number'] ?? ('PO-PRD-' . date('Ym') . '-' . rand(100, 999)),
                        'garment_model_id' => $data['garment_model_id'],
                        'bill_of_material_id' => $data['bill_of_material_id'] ?? null,
                        'branch_id' => $data['branch_id'] ?? null,
                        'planned_start_date' => $data['planned_start_date'] ?? date('Y-m-d'),
                        'target_delivery_date' => $data['target_delivery_date'] ?? date('Y-m-d', strtotime('+15 days')),
                        'total_planned_quantity' => $totalPlanned,
                        'total_cut_quantity' => 0,
                        'total_completed_quantity' => 0,
                        'total_scrapped_quantity' => 0,
                        'total_rework_quantity' => 0,
                        'status' => 'draft',
                        'priority' => $data['priority'] ?? 'normal',
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
                    ProductionOrderItem::create([
                        'tenant_id' => $tenantId,
                        'production_order_id' => $order->id,
                        'product_variant_id' => $item['product_variant_id'] ?? null,
                        'color_id' => $item['color_id'],
                        'size_id' => $item['size_id'],
                        'planned_quantity' => (int) $item['planned_quantity'],
                        'cut_quantity' => 0,
                        'completed_quantity' => 0,
                        'rejected_quantity' => 0,
                    ]);
                }

                return $order->load('items.color', 'items.size', 'garmentModel');
            });
        } catch (IdempotencyCollisionException $e) {
            $existing = ProductionOrder::where('tenant_id', $e->tenantId)
                ->where('idempotency_key', $e->idempotencyKey)
                ->first();
            if ($existing) {
                $existingFingerprint = $this->calculateExistingOrderFingerprint($existing);
                if ($incomingFingerprint !== $existingFingerprint) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً بحقول أو كميات مختلفة (IdempotencyConflict).');
                }
                return $existing->load('items.color', 'items.size', 'garmentModel');
            }
            throw $e;
        }
    }

    /**
     * اعتماد أمر الإنتاج
     */
    public function approveProductionOrder(string $orderId): ProductionOrder
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($orderId, $contextTenantId) {
            $order = ProductionOrder::where('tenant_id', $contextTenantId)
                ->where('id', $orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->status !== 'draft') {
                throw new Exception("أمر الإنتاج في حالة [{$order->status}] ولا يمكن اعتماده.");
            }

            $order->status = 'approved';
            $order->save();

            return $order;
        });
    }

    /**
     * إنشاء وتثبيت مراحل خط الإنتاج الافتراضية للشركة إذا لم تكن موجودة
     */
    public function ensureDefaultStages(string $tenantId): void
    {
        $defaultStages = [
            ['stage_code' => 'cutting', 'name' => 'صالة القص', 'order_sequence' => 1, 'requires_qc' => true],
            ['stage_code' => 'assembly', 'name' => 'التجهيز والتجميع', 'order_sequence' => 2, 'requires_qc' => false],
            ['stage_code' => 'sewing', 'name' => 'خط الخياطة والتجميع', 'order_sequence' => 3, 'requires_qc' => true],
            ['stage_code' => 'finishing', 'name' => 'التشطيب وإزالة الخيوط', 'order_sequence' => 4, 'requires_qc' => false],
            ['stage_code' => 'ironing', 'name' => 'الكي بالبخار', 'order_sequence' => 5, 'requires_qc' => false],
            ['stage_code' => 'packing', 'name' => 'الفحص النهائي والتعبئة', 'order_sequence' => 6, 'requires_qc' => true],
        ];

        foreach ($defaultStages as $stage) {
            ProductionStage::firstOrCreate(
                ['tenant_id' => $tenantId, 'stage_code' => $stage['stage_code']],
                $stage
            );
        }
    }

    /**
     * صالة القص: إنشاء أمر الفرش والقص، حساب استهلاك الأقمشة، صرف الخام عبر InventoryService، وتوليد بطاقات الحزم (Bundle Cards)
     */
    public function executeCuttingOrder(array $data, array $bundleConfigs = []): CuttingOrder
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($data, $bundleConfigs, $contextTenantId) {
            $prodOrder = ProductionOrder::where('tenant_id', $contextTenantId)
                ->where('id', $data['production_order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            // التحقق من ملكية المستودع
            $warehouseId = $data['warehouse_id'];
            $warehouse = Warehouse::where('tenant_id', $contextTenantId)
                ->where('id', $warehouseId)
                ->first();
            if (!$warehouse) {
                throw new InvalidArgumentException('أمان: المستودع المحدد غير موجود أو غير تابع للشركة الحالية.');
            }

            // منع صرف خامات لأمر غير معتمد
            if (!in_array($prodOrder->status, ['approved', 'cutting', 'in_progress'])) {
                throw new Exception("لا يمكن صرف خامات أو تنفيذ قص لأمر إنتاج غير معتمد (الحالة الحالية: {$prodOrder->status}).");
            }

            $layLength = (float) $data['lay_length_meters'];
            $layersCount = (int) $data['layers_count'];
            $endLoss = (float) ($data['end_loss_meters'] ?? 0.0);
            $remnant = (float) ($data['remnant_meters'] ?? 0.0);

            // الاستهلاك النظري والفعلي
            $theoreticalMeters = round($layLength * $layersCount, 4);
            $actualMeters = round($theoreticalMeters + ($endLoss * $layersCount) + $remnant, 4);

            $fabricSource = $data['fabric_source'] ?? 'factory_owned';
            $fabricItemId = $data['fabric_inventory_item_id'] ?? null;
            $customerMaterialId = $data['customer_material_id'] ?? null;

            // صرف القماش نظامياً من خلال خدمة المخزون أو رصيد أمانة العميل
            if ($fabricSource === 'factory_owned') {
                if (!$fabricItemId) {
                    throw new InvalidArgumentException('يجب تحديد صنف القماش عند الصرف من خامات المصنع.');
                }

                // التحقق من ملكية الصنف للشركة
                $fabricItem = InventoryItem::where('tenant_id', $contextTenantId)->where('id', $fabricItemId)->first();
                if (!$fabricItem) {
                    throw new InvalidArgumentException('أمان: صنف القماش غير تابع للشركة الحالية.');
                }

                // استدعاء خدمة المخزون لصرف كمية القماش الفعلية مع حظر السالب والتحقق من التزامن
                $this->inventoryService->recordTransaction([
                    'tenant_id' => $contextTenantId,
                    'inventory_item_id' => $fabricItemId,
                    'warehouse_id' => $warehouseId,
                    'quantity' => $actualMeters,
                    'direction' => 'OUT',
                    'transaction_type' => 'production_issue',
                    'reference_type' => 'cutting_order',
                    'notes' => "صرف قماش لأمر القص وتغذية أمر الإنتاج [{$prodOrder->order_number}]",
                ]);
            } elseif ($fabricSource === 'customer_deposit') {
                if (!$customerMaterialId) {
                    throw new InvalidArgumentException('يجب تحديد محضر أمانة خامة العميل عند الصرف من خامات العملاء.');
                }

                // استدعاء consumeCustomerMaterial الآمنة مع قفل السجل ومنع الأرصدة السالبة
                $waste = ($endLoss * $layersCount) + $remnant;
                $this->inventoryService->consumeCustomerMaterial($customerMaterialId, $theoreticalMeters, $waste);
            }

            $totalCutPieces = (int) ($data['total_cut_pieces'] ?? ($layersCount * count($prodOrder->items)));

            // إنشاء أمر القص
            $cuttingOrder = CuttingOrder::create([
                'tenant_id' => $contextTenantId,
                'cutting_order_number' => $data['cutting_order_number'] ?? ('CUT-' . date('Ym') . '-' . rand(1000, 9999)),
                'production_order_id' => $prodOrder->id,
                'pattern_id' => $data['pattern_id'] ?? null,
                'table_number' => $data['table_number'] ?? 'Table-1',
                'fabric_inventory_item_id' => $fabricItemId,
                'fabric_source' => $fabricSource,
                'customer_material_id' => $customerMaterialId,
                'warehouse_id' => $warehouseId,
                'fabric_color_id' => $data['fabric_color_id'] ?? null,
                'marker_name' => $data['marker_name'] ?? null,
                'usable_width_meters' => $data['usable_width_meters'] ?? 1.60,
                'lay_length_meters' => $layLength,
                'layers_count' => $layersCount,
                'marker_efficiency_percent' => $data['marker_efficiency_percent'] ?? 85.0,
                'actual_fabric_meters_used' => $actualMeters,
                'actual_fabric_kg_used' => $data['actual_fabric_kg_used'] ?? 0.0,
                'theoretical_fabric_meters' => $theoreticalMeters,
                'end_loss_meters' => $endLoss,
                'remnant_meters' => $remnant,
                'fabric_relaxation_hours_actual' => $data['fabric_relaxation_hours_actual'] ?? 0.0,
                'measured_shrinkage_percent' => $data['measured_shrinkage_percent'] ?? 0.0,
                'total_expected_pieces' => (int) ($data['total_expected_pieces'] ?? $totalCutPieces),
                'total_cut_pieces' => $totalCutPieces,
                'status' => 'cut_completed',
                'notes' => $data['notes'] ?? null,
            ]);

            // التأكد من توفر مراحل الإنتاج
            $this->ensureDefaultStages($contextTenantId);

            // توليد بطاقات الحزم (Bundle Cards)
            $bundleNumber = 1;
            if (!empty($bundleConfigs)) {
                foreach ($bundleConfigs as $bCfg) {
                    $bundleQty = (int) $bCfg['quantity'];
                    CuttingBundle::create([
                        'tenant_id' => $contextTenantId,
                        'bundle_code' => 'BND-' . date('Ym') . '-' . str_pad((string)$bundleNumber, 4, '0', STR_PAD_LEFT) . '-' . rand(10, 99),
                        'cutting_order_id' => $cuttingOrder->id,
                        'production_order_id' => $prodOrder->id,
                        'product_variant_id' => $bCfg['product_variant_id'] ?? null,
                        'bundle_number' => $bundleNumber++,
                        'color_id' => $bCfg['color_id'],
                        'size_id' => $bCfg['size_id'],
                        'quantity' => $bundleQty,
                        'current_stage_code' => 'cutting',
                        'status' => 'active',
                    ]);
                }
            } else {
                // تقسيم افتراضي على مقاسات وألوان أمر الإنتاج بحجم حزمة قياسي 20 قطعة
                foreach ($prodOrder->items as $pItem) {
                    $remaining = $layersCount;
                    while ($remaining > 0) {
                        $bundleQty = min($remaining, 20);
                        CuttingBundle::create([
                            'tenant_id' => $contextTenantId,
                            'bundle_code' => 'BND-' . date('Ym') . '-' . str_pad((string)$bundleNumber, 4, '0', STR_PAD_LEFT) . '-' . rand(10, 99),
                            'cutting_order_id' => $cuttingOrder->id,
                            'production_order_id' => $prodOrder->id,
                            'product_variant_id' => $pItem->product_variant_id,
                            'bundle_number' => $bundleNumber++,
                            'color_id' => $pItem->color_id,
                            'size_id' => $pItem->size_id,
                            'quantity' => $bundleQty,
                            'current_stage_code' => 'cutting',
                            'status' => 'active',
                        ]);
                        $remaining -= $bundleQty;
                    }
                    $pItem->cut_quantity += $layersCount;
                    $pItem->save();
                }
            }

            // تحديث حالة أمر الإنتاج وكمية القص الإجمالية
            $prodOrder->total_cut_quantity += $totalCutPieces;
            $prodOrder->status = 'in_progress';
            $prodOrder->actual_start_date = $prodOrder->actual_start_date ?? date('Y-m-d');
            $prodOrder->save();

            return $cuttingOrder->load('bundles');
        });
    }

    /**
     * نقل وتتبع الحزمة بين مراحل الإنتاج وتسجيل مدخلات ومخرجات كل مرحلة والعامل المسؤول
     */
    public function transferBundleStage(string $bundleId, string $toStageCode, array $operationData): BundleStageLog
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($bundleId, $toStageCode, $operationData, $contextTenantId) {
            $bundle = CuttingBundle::where('tenant_id', $contextTenantId)
                ->where('id', $bundleId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($bundle->status !== 'active' && $bundle->status !== 'rework') {
                throw new Exception("الحزمة [{$bundle->bundle_code}] في حالة [{$bundle->status}] ولا يمكن نقلها للتشغيل.");
            }

            $stage = ProductionStage::where('tenant_id', $contextTenantId)
                ->where('stage_code', $toStageCode)
                ->firstOrFail();

            $inputQty = (int) ($operationData['input_quantity'] ?? $bundle->quantity);
            $acceptedQty = (int) ($operationData['output_accepted_quantity'] ?? $inputQty);
            $rejectedQty = (int) ($operationData['output_rejected_quantity'] ?? 0);
            $scrapQty = (int) ($operationData['scrap_quantity'] ?? 0);

            // التحقق من اتساق الكميات ومنع التلاعب
            if ($acceptedQty + $rejectedQty + $scrapQty !== $inputQty) {
                throw new InvalidArgumentException("مجموع الكميات (المقبول: {$acceptedQty} + المرفوض: {$rejectedQty} + الهالك: {$scrapQty}) يجب أن يساوي الكمية المستلمة: {$inputQty}.");
            }

            // إذا كان هناك هالك نهائي، تخفيض كمية الحزمة وتحديث أمر الإنتاج
            if ($scrapQty > 0) {
                $bundle->quantity -= $scrapQty;
                ProductionOrder::where('tenant_id', $contextTenantId)
                    ->where('id', $bundle->production_order_id)
                    ->increment('total_scrapped_quantity', $scrapQty);
            }

            $bundle->current_stage_code = $toStageCode;
            if ($bundle->quantity <= 0) {
                $bundle->status = 'scrapped';
            } elseif ($rejectedQty > 0) {
                $bundle->status = 'held_for_qc';
            }
            $bundle->save();

            // تسجيل حركة التشغيل في سجل المراحل
            return BundleStageLog::create([
                'tenant_id' => $contextTenantId,
                'cutting_bundle_id' => $bundle->id,
                'production_stage_id' => $stage->id,
                'operation_type' => $operationData['operation_type'] ?? 'transfer',
                'operator_name' => $operationData['operator_name'] ?? 'مشغل خط الإنتاج',
                'work_line' => $operationData['work_line'] ?? 'خط الإنتاج الرئيسي',
                'input_quantity' => $inputQty,
                'output_accepted_quantity' => $acceptedQty,
                'output_rejected_quantity' => $rejectedQty,
                'scrap_quantity' => $scrapQty,
                'logged_at' => now(),
            ]);
        });
    }

    /**
     * تسجيل فحص جودة رسمي لنقطة تفتيش محددة
     */
    public function recordQualityInspection(array $data, array $defects = []): QualityInspection
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }
        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة.');
        }
        $tenantId = $contextTenantId;

        return DB::transaction(function () use ($data, $defects, $tenantId) {
            $inspectedQty = (int) $data['inspected_quantity'];
            $passedQty = (int) $data['passed_quantity'];
            $rejectedQty = (int) ($data['rejected_quantity'] ?? 0);
            $reworkQty = (int) ($data['rework_quantity'] ?? 0);

            if ($passedQty + $rejectedQty + $reworkQty !== $inspectedQty) {
                throw new InvalidArgumentException("مجموع كميات الفحص (المجاز: {$passedQty} + المرفوض: {$rejectedQty} + إعادة التشغيل: {$reworkQty}) لا يطابق إجمالي القطع المفحوصة: {$inspectedQty}.");
            }

            $prodOrder = ProductionOrder::where('tenant_id', $tenantId)
                ->where('id', $data['production_order_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $decision = $data['decision'] ?? ($rejectedQty > 0 ? 'rejected' : ($reworkQty > 0 ? 'rework_required' : 'passed'));

            $inspection = QualityInspection::create([
                'tenant_id' => $tenantId,
                'inspection_number' => $data['inspection_number'] ?? ('QC-' . date('Ym') . '-' . rand(1000, 9999)),
                'production_order_id' => $prodOrder->id,
                'cutting_bundle_id' => $data['cutting_bundle_id'] ?? null,
                'production_stage_id' => $data['production_stage_id'] ?? null,
                'inspector_name' => $data['inspector_name'],
                'inspection_type' => $data['inspection_type'] ?? 'inline',
                'inspected_quantity' => $inspectedQty,
                'passed_quantity' => $passedQty,
                'rejected_quantity' => $rejectedQty,
                'rework_quantity' => $reworkQty,
                'decision' => $decision,
                'notes' => $data['notes'] ?? null,
            ]);

            // تسجيل بنود العيوب
            foreach ($defects as $defect) {
                QualityDefect::create([
                    'tenant_id' => $tenantId,
                    'quality_inspection_id' => $inspection->id,
                    'defect_type' => $defect['defect_type'],
                    'severity' => $defect['severity'] ?? 'minor',
                    'quantity' => (int) ($defect['quantity'] ?? 1),
                    'corrective_action' => $defect['corrective_action'] ?? null,
                ]);
            }

            // تحديث حالة الحزمة إن وجدت
            if (!empty($data['cutting_bundle_id'])) {
                $bundle = CuttingBundle::where('tenant_id', $tenantId)
                    ->where('id', $data['cutting_bundle_id'])
                    ->lockForUpdate()
                    ->first();
                if ($bundle) {
                    if ($decision === 'rework_required') {
                        $bundle->status = 'rework';
                        $prodOrder->increment('total_rework_quantity', $reworkQty);
                    } elseif ($decision === 'rejected') {
                        $bundle->status = 'scrapped';
                        $prodOrder->increment('total_scrapped_quantity', $rejectedQty);
                    } elseif ($decision === 'passed' && ($data['inspection_type'] ?? '') === 'final_audit') {
                        $bundle->status = 'completed';
                        $bundle->current_stage_code = 'completed';
                    }
                    $bundle->save();
                }
            }

            // إذا كان هذا فحصاً نهائياً معتمداً (Final Audit): إدخال المنتجات السليمة لمخزن المنتج التام
            if (($data['inspection_type'] ?? '') === 'final_audit' && $passedQty > 0) {
                $prodOrder->total_completed_quantity += $passedQty;

                // تحديث حالة أمر الإنتاج إذا اكتملت كافة الكميات المخططة
                if ($prodOrder->total_completed_quantity >= $prodOrder->total_planned_quantity) {
                    $prodOrder->status = 'completed';
                    $prodOrder->actual_completion_date = date('Y-m-d');
                }
                $prodOrder->save();

                // تحديث المخزون للمنتج النهائي إذا توفر inventory_item_id للمنتج التام
                if (!empty($data['finished_goods_inventory_item_id'])) {
                    $fgItem = InventoryItem::where('tenant_id', $tenantId)
                        ->where('id', $data['finished_goods_inventory_item_id'])
                        ->first();
                    if (!$fgItem) {
                        throw new InvalidArgumentException('أمان: صنف المنتج التام غير تابع للشركة الحالية.');
                    }

                    $this->inventoryService->recordTransaction([
                        'tenant_id' => $tenantId,
                        'inventory_item_id' => $data['finished_goods_inventory_item_id'],
                        'quantity' => $passedQty,
                        'direction' => 'IN',
                        'transaction_type' => 'production_receipt',
                        'reference_type' => 'production_order',
                        'notes' => "إضافة منتج تام جاهز للتوزيع بعد الفحص النهائي لأمر الإنتاج [{$prodOrder->order_number}]",
                    ]);
                }
            }

            return $inspection->load('defects');
        });
    }

    /**
     * استخراج مؤشرات الأداء الصناعي والهالك ونسب العيوب لأمر الإنتاج
     */
    public function getProductionMetrics(string $productionOrderId): array
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        $order = ProductionOrder::where('tenant_id', $contextTenantId)
            ->with(['items', 'cuttingOrders', 'bundles', 'qualityInspections.defects'])
            ->findOrFail($productionOrderId);

        $totalPlanned = $order->total_planned_quantity;
        $totalCut = $order->total_cut_quantity;
        $totalCompleted = $order->total_completed_quantity;
        $totalScrapped = $order->total_scrapped_quantity;
        $totalRework = $order->total_rework_quantity;

        $completionRate = $totalPlanned > 0 ? round(($totalCompleted / $totalPlanned) * 100, 2) : 0;
        $scrapRate = $totalCut > 0 ? round(($totalScrapped / $totalCut) * 100, 2) : 0;

        $defectStats = [];
        foreach ($order->qualityInspections as $insp) {
            foreach ($insp->defects as $defect) {
                $type = $defect->defect_type;
                $defectStats[$type] = ($defectStats[$type] ?? 0) + $defect->quantity;
            }
        }

        return [
            'order_number' => $order->order_number,
            'status' => $order->status,
            'total_planned_quantity' => $totalPlanned,
            'total_cut_quantity' => $totalCut,
            'total_completed_quantity' => $totalCompleted,
            'total_scrapped_quantity' => $totalScrapped,
            'total_rework_quantity' => $totalRework,
            'completion_rate_percent' => $completionRate,
            'scrap_rate_percent' => $scrapRate,
            'defects_breakdown' => $defectStats,
        ];
    }
}

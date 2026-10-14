<?php

namespace App\Services;

use App\Models\BillOfMaterial;
use App\Models\BomItem;
use App\Models\BundleStageLog;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\CustomerMaterial;
use App\Models\Pattern;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Models\ProductionStage;
use App\Models\QualityDefect;
use App\Models\QualityInspection;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ProductionService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * إنشاء باترون هندسي جديد للموديل
     */
    public function createPattern(array $data): Pattern
    {
        return Pattern::create([
            'tenant_id' => $data['tenant_id'],
            'garment_model_id' => $data['garment_model_id'],
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
        return DB::transaction(function () use ($data, $items) {
            $totalEstimatedCost = 0.0;

            foreach ($items as $item) {
                $consumption = (float) $item['consumption_per_unit'];
                $unitCost = (float) ($item['unit_cost'] ?? 0.0);
                $wasteTolerance = (float) ($item['waste_tolerance_percent'] ?? 5.0);
                $totalEstimatedCost += ($consumption * (1 + $wasteTolerance / 100)) * $unitCost;
            }

            $bom = BillOfMaterial::create([
                'tenant_id' => $data['tenant_id'],
                'garment_model_id' => $data['garment_model_id'],
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
                    'tenant_id' => $data['tenant_id'],
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
        return DB::transaction(function () use ($bomId) {
            $bom = BillOfMaterial::where('id', $bomId)->lockForUpdate()->firstOrFail();

            // أرشفة أي BOM نشط سابق لنفس الموديل
            BillOfMaterial::where('garment_model_id', $bom->garment_model_id)
                ->where('id', '!=', $bomId)
                ->update(['is_active' => false]);

            $bom->status = 'approved';
            $bom->is_active = true;
            $bom->save();

            return $bom;
        });
    }

    /**
     * إنشاء أمر إنتاج وتشغيل جديد مع تفصيل الألوان والمقاسات
     */
    public function createProductionOrder(array $data, array $items): ProductionOrder
    {
        return DB::transaction(function () use ($data, $items) {
            $totalPlanned = 0;
            foreach ($items as $item) {
                $qty = (int) $item['planned_quantity'];
                if ($qty <= 0) {
                    throw new InvalidArgumentException('كمية البند المخططة يجب أن تكون أكبر من الصفر.');
                }
                $totalPlanned += $qty;
            }

            $order = ProductionOrder::create([
                'tenant_id' => $data['tenant_id'],
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
            ]);

            foreach ($items as $item) {
                ProductionOrderItem::create([
                    'tenant_id' => $data['tenant_id'],
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

            return $order->load('items');
        });
    }

    /**
     * اعتماد أمر الإنتاج
     */
    public function approveProductionOrder(string $orderId): ProductionOrder
    {
        return DB::transaction(function () use ($orderId) {
            $order = ProductionOrder::where('id', $orderId)->lockForUpdate()->firstOrFail();

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
        return DB::transaction(function () use ($data, $bundleConfigs) {
            $prodOrder = ProductionOrder::where('id', $data['production_order_id'])
                ->lockForUpdate()
                ->firstOrFail();

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
            $warehouseId = $data['warehouse_id'];

            // صرف القماش نظامياً من خلال خدمة المخزون أو رصيد أمانة العميل
            if ($fabricSource === 'factory_owned') {
                if (!$fabricItemId) {
                    throw new InvalidArgumentException('يجب تحديد صنف القماش عند الصرف من خامات المصنع.');
                }

                // استدعاء خدمة المخزون لصرف كمية القماش الفعلية مع حظر السالب والتحقق من التزامن
                $this->inventoryService->recordTransaction([
                    'inventory_item_id' => $fabricItemId,
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

                $customerMat = CustomerMaterial::where('id', $customerMaterialId)->lockForUpdate()->firstOrFail();
                if ($customerMat->remaining_meters < $actualMeters) {
                    throw new Exception("رصيد خامة العميل [{$customerMat->customer_name}] غير كافٍ. المتبقي: {$customerMat->remaining_meters} متر، المطلوب صرفه: {$actualMeters} متر.");
                }

                $customerMat->consumed_meters += $theoreticalMeters;
                $customerMat->waste_meters += (($endLoss * $layersCount) + $remnant);
                $customerMat->remaining_meters = $customerMat->received_meters - ($customerMat->consumed_meters + $customerMat->waste_meters);
                $customerMat->save();
            }

            $totalCutPieces = (int) ($data['total_cut_pieces'] ?? ($layersCount * count($prodOrder->items)));

            // إنشاء أمر القص
            $cuttingOrder = CuttingOrder::create([
                'tenant_id' => $prodOrder->tenant_id,
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
            $this->ensureDefaultStages($prodOrder->tenant_id);

            // توليد بطاقات الحزم (Bundle Cards)
            $bundleNumber = 1;
            if (!empty($bundleConfigs)) {
                foreach ($bundleConfigs as $bCfg) {
                    $bundleQty = (int) $bCfg['quantity'];
                    CuttingBundle::create([
                        'tenant_id' => $prodOrder->tenant_id,
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
                            'tenant_id' => $prodOrder->tenant_id,
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
        return DB::transaction(function () use ($bundleId, $toStageCode, $operationData) {
            $bundle = CuttingBundle::where('id', $bundleId)->lockForUpdate()->firstOrFail();

            if ($bundle->status !== 'active' && $bundle->status !== 'rework') {
                throw new Exception("الحزمة [{$bundle->bundle_code}] في حالة [{$bundle->status}] ولا يمكن نقلها للتشغيل.");
            }

            $stage = ProductionStage::where('tenant_id', $bundle->tenant_id)
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
                ProductionOrder::where('id', $bundle->production_order_id)->increment('total_scrapped_quantity', $scrapQty);
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
                'tenant_id' => $bundle->tenant_id,
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
     * إذا كان فحص نهائي (final_audit) واجتاز بنجاح: يتم تحويل القطع السليمة إلى مخزن المنتج التام عبر InventoryService
     */
    public function recordQualityInspection(array $data, array $defects = []): QualityInspection
    {
        return DB::transaction(function () use ($data, $defects) {
            $inspectedQty = (int) $data['inspected_quantity'];
            $passedQty = (int) $data['passed_quantity'];
            $rejectedQty = (int) ($data['rejected_quantity'] ?? 0);
            $reworkQty = (int) ($data['rework_quantity'] ?? 0);

            if ($passedQty + $rejectedQty + $reworkQty !== $inspectedQty) {
                throw new InvalidArgumentException("مجموع كميات الفحص (المجاز: {$passedQty} + المرفوض: {$rejectedQty} + إعادة التشغيل: {$reworkQty}) لا يطابق إجمالي القطع المفحوصة: {$inspectedQty}.");
            }

            $decision = $data['decision'] ?? ($rejectedQty > 0 ? 'rejected' : ($reworkQty > 0 ? 'rework_required' : 'passed'));

            $inspection = QualityInspection::create([
                'tenant_id' => $data['tenant_id'],
                'inspection_number' => $data['inspection_number'] ?? ('QC-' . date('Ym') . '-' . rand(1000, 9999)),
                'production_order_id' => $data['production_order_id'],
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
                    'tenant_id' => $data['tenant_id'],
                    'quality_inspection_id' => $inspection->id,
                    'defect_type' => $defect['defect_type'],
                    'severity' => $defect['severity'] ?? 'minor',
                    'quantity' => (int) ($defect['quantity'] ?? 1),
                    'corrective_action' => $defect['corrective_action'] ?? null,
                ]);
            }

            $prodOrder = ProductionOrder::where('id', $data['production_order_id'])->lockForUpdate()->firstOrFail();

            // تحديث حالة الحزمة إن وجدت
            if (!empty($data['cutting_bundle_id'])) {
                $bundle = CuttingBundle::where('id', $data['cutting_bundle_id'])->lockForUpdate()->first();
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
                    $this->inventoryService->recordTransaction([
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
        $order = ProductionOrder::with(['items', 'cuttingOrders', 'bundles', 'qualityInspections.defects'])
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

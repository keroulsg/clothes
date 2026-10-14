<?php

namespace App\Services;

use App\Models\CustomerMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Warehouse;
use Exception;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    /**
     * تسجيل حركة مخزنية رسمية في دفتر الأستاذ مع معالجة التزامن وحظر الرصيد السالب ومنع التكرار (Idempotency)
     */
    public function recordTransaction(array $data): InventoryTransaction
    {
        // 1. التحقق الصارم من سياق الشركة ومنع تنفيذ أي حركة في غياب السياق
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة مفقود. لا يمكن تسجيل أي حركة مخزنية دون سياق شركة موثق.');
        }

        // 2. رفض أي تعارض بين هوية الشركة الحالية وهوية الشركة الممررة
        if (!empty($data['tenant_id']) && $data['tenant_id'] !== $contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض أمني؛ هوية الشركة الممررة تخالف سياق الشركة المعتمد الحالي.');
        }

        $tenantId = $contextTenantId;
        $itemId = $data['inventory_item_id'];
        $quantity = (float) $data['quantity'];
        $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : 0.0;
        $direction = strtoupper($data['direction']); // IN or OUT
        $transactionType = $data['transaction_type'];
        $idempotencyKey = $data['idempotency_key'] ?? null;

        if ($quantity <= 0) {
            throw new InvalidArgumentException('يجب أن تكون كمية الحركة المخزنية أكبر من الصفر.');
        }

        if ($direction !== 'IN' && $direction !== 'OUT') {
            throw new InvalidArgumentException('اتجاه الحركة المخزنية يجب أن يكون إما IN أو OUT.');
        }

        // 3. فحص مسبق لعدم التكرار (Idempotency Pre-check)
        if ($idempotencyKey) {
            $existing = InventoryTransaction::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                // التحقق من تطابق العملية لمنع استخدام نفس المفتاح لعمليتين مختلفتين
                $isMatch = ($existing->inventory_item_id === $itemId)
                    && (abs((float)$existing->quantity - $quantity) < 0.0001)
                    && ($existing->direction === $direction)
                    && ($existing->transaction_type === $transactionType);

                if (!$isMatch) {
                    throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لعملية مخزنية مختلفة في نفس الشركة.');
                }

                return $existing;
            }
        }

        return DB::transaction(function () use ($data, $tenantId, $itemId, $quantity, $unitCost, $direction, $transactionType, $idempotencyKey) {
            // قفل السجل لمنع تضارب التزامن مع التحقق الصارم من انتماء الصنف للشركة الحالية
            $item = InventoryItem::where('tenant_id', $tenantId)
                ->where('id', $itemId)
                ->lockForUpdate()
                ->firstOrFail();

            // التحقق من ملكية المخزن واتساق علاقته بالشركة والصنف
            $warehouse = Warehouse::where('tenant_id', $tenantId)
                ->where('id', $item->warehouse_id)
                ->firstOrFail();

            if (!empty($data['warehouse_id']) && $data['warehouse_id'] !== $item->warehouse_id) {
                throw new InvalidArgumentException('أمان: المخزن المحدد لا يطابق مخزن الصنف المخزني.');
            }

            $balanceBefore = (float) $item->current_balance;

            if ($direction === 'OUT') {
                if ($balanceBefore < $quantity && !$warehouse->allow_negative_stock) {
                    throw new Exception("رصيد الصنف [{$item->name}] في المخزن غير كافٍ. المتاح: [{$balanceBefore}] {$item->unit_of_measure}، المطلوب صرفه: [{$quantity}].");
                }
                $balanceAfter = $balanceBefore - $quantity;
            } else {
                $balanceAfter = $balanceBefore + $quantity;

                // تحديث المتوسط المرجح للتكلفة (Weighted Average Cost)
                if ($unitCost > 0 && $balanceAfter > 0) {
                    $oldTotal = $balanceBefore * (float) $item->average_cost;
                    $newTotal = $oldTotal + ($quantity * $unitCost);
                    $item->average_cost = round($newTotal / $balanceAfter, 4);
                }
            }

            $item->current_balance = $balanceAfter;
            $item->save();

            // إنشاء قيد دفتر الأستاذ المخزني غير القابل للتعديل مع دعم قيد التفرد تحت التزامن
            try {
                return InventoryTransaction::create([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $item->id,
                    'warehouse_id' => $item->warehouse_id,
                    'transaction_type' => $transactionType,
                    'direction' => $direction,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'total_cost' => round($quantity * $unitCost, 4),
                    'balance_before' => $balanceBefore,
                    'balance_after' => $balanceAfter,
                    'reference_type' => $data['reference_type'] ?? null,
                    'reference_id' => $data['reference_id'] ?? null,
                    'reference_number' => $data['reference_number'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'batch_number' => $data['batch_number'] ?? null,
                    'roll_number' => $data['roll_number'] ?? null,
                    'technical_notes' => $data['technical_notes'] ?? null,
                    'user_id' => $data['user_id'] ?? auth()->id(),
                    'idempotency_key' => $idempotencyKey,
                ]);
            } catch (QueryException $e) {
                // في حال اصطدام طلبين متزامنين بنفس المفتاح وسبق أحدهما الآخر في كتابة السجل
                if ($idempotencyKey && ($e->getCode() == 23000 || str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry'))) {
                    $existing = InventoryTransaction::where('tenant_id', $tenantId)
                        ->where('idempotency_key', $idempotencyKey)
                        ->first();

                    if ($existing) {
                        $isMatch = ($existing->inventory_item_id === $itemId)
                            && (abs((float)$existing->quantity - $quantity) < 0.0001)
                            && ($existing->direction === $direction)
                            && ($existing->transaction_type === $transactionType);

                        if (!$isMatch) {
                            throw new InvalidArgumentException('تعارض Idempotency: مفتاح عدم التكرار مستخدم مسبقاً لعملية مخزنية مختلفة في نفس الشركة.');
                        }

                        // التراجع التلقائي عن تعديل الرصيد للطلب الثاني بفضل DB::transaction
                        return $existing;
                    }
                }
                throw $e;
            }
        });
    }

    /**
     * تحويل الأقمشة من أمتار إلى كيلوجرامات بناءً على GSM وعرض القماش الفعلي
     *
     * المعادلة الفيزيائية:
     * الوزن (كجم) = الطول (متر) × عرض القماش الصالح للقص (متر) × (GSM / 1000)
     */
    public function convertFabricMetersToKg(float $meters, float $usableWidthMeters, float $gsm): array
    {
        if ($meters <= 0 || $usableWidthMeters <= 0 || $gsm <= 0) {
            throw new InvalidArgumentException('يجب أن تكون قيم الأمتار وعرض القماش وGSM موجبة وأكبر من الصفر.');
        }

        $linearWeightGramsPerMeter = $usableWidthMeters * $gsm;
        $weightKg = ($meters * $usableWidthMeters * $gsm) / 1000.0;

        return [
            'meters' => $meters,
            'usable_width_meters' => $usableWidthMeters,
            'gsm' => $gsm,
            'linear_weight_g_per_m' => round($linearWeightGramsPerMeter, 2),
            'linear_weight_grams_per_meter' => round($linearWeightGramsPerMeter, 2),
            'calculated_weight_kg' => round($weightKg, 3),
        ];
    }

    /**
     * تحويل الأقمشة من كيلوجرامات إلى أمتار طولية صالحة للقص
     *
     * المعادلة العكسية:
     * الطول (متر) = (الوزن (كجم) × 1000) / (عرض القماش (متر) × GSM)
     */
    public function convertFabricKgToMeters(float $kg, float $usableWidthMeters, float $gsm): array
    {
        if ($kg <= 0 || $usableWidthMeters <= 0 || $gsm <= 0) {
            throw new InvalidArgumentException('يجب أن تكون قيم الكيلوجرامات وعرض القماش وGSM موجبة وأكبر من الصفر.');
        }

        $meters = ($kg * 1000.0) / ($usableWidthMeters * $gsm);

        return [
            'weight_kg' => $kg,
            'usable_width_meters' => $usableWidthMeters,
            'gsm' => $gsm,
            'calculated_meters' => round($meters, 3),
        ];
    }

    /**
     * استلام أمانات خامات وتشغيل للغير من العملاء (Customer Supplied Materials)
     */
    public function receiveCustomerMaterial(array $data): CustomerMaterial
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $tenantId = $data['tenant_id'] ?? $contextTenantId;
        if (empty($tenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        $receivedMeters = (float) $data['received_meters'];

        return CustomerMaterial::create([
            'tenant_id' => $tenantId,
            'customer_name' => $data['customer_name'],
            'fabric_name' => $data['fabric_name'],
            'fabric_code' => $data['fabric_code'] ?? null,
            'gsm' => $data['gsm'] ?? null,
            'usable_width_meters' => $data['usable_width_meters'] ?? null,
            'received_meters' => $receivedMeters,
            'consumed_meters' => 0,
            'waste_meters' => 0,
            'returned_meters' => 0,
            'remaining_meters' => $receivedMeters,
            'warehouse_id' => $data['warehouse_id'],
            'notes' => $data['notes'] ?? null,
        ]);
    }

    /**
     * صرف جزء من خامة العميل للقص مع حساب الهالك
     */
    public function consumeCustomerMaterial(string $id, float $consumedMeters, float $wasteMeters = 0): CustomerMaterial
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        $query = CustomerMaterial::where('id', $id);
        if ($contextTenantId) {
            $query->where('tenant_id', $contextTenantId);
        }
        $custMat = $query->lockForUpdate()->firstOrFail();

        $totalDeduction = $consumedMeters + $wasteMeters;
        if ($totalDeduction > (float) $custMat->remaining_meters) {
            throw new InvalidArgumentException('الكمية المطلوبة تتجاوز الرصيد المتبقي من خامة العميل.');
        }

        $custMat->consumed_meters += $consumedMeters;
        $custMat->waste_meters += $wasteMeters;
        $custMat->remaining_meters -= $totalDeduction;
        $custMat->save();

        return $custMat;
    }
}

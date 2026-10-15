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

        try {
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
                    // في حال اصطدام طلبين متزامنين بنفس المفتاح: نطلق استثناء لإلغاء المعاملة وتراجع تحديث الرصيد تماماً!
                    if ($idempotencyKey && ($e->getCode() == 23000 || str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry'))) {
                        throw new \App\Exceptions\IdempotencyCollisionException($idempotencyKey, $e->getMessage(), (int)$e->getCode(), $e);
                    }
                    throw $e;
                }
            });
        } catch (\App\Exceptions\IdempotencyCollisionException $e) {
            // تراجعت المعاملة بالكامل ولم يتأثر الرصيد؛ نسترجع القيد الأصلي الفائز ونتحقق من تطابق كافة العمليات
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

                return $existing;
            }
            throw $e;
        }
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
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة مفقود. لا يمكن استلام أمانات خامات دون سياق شركة موثق.');
        }

        if (!empty($data['tenant_id']) && (string)$data['tenant_id'] !== (string)$contextTenantId) {
            throw new InvalidArgumentException('أمان: تعارض في سياق الشركة. tenant_id الممرر لا يطابق الشركة الموثقة.');
        }

        $tenantId = $contextTenantId;

        // التحقق الصارم من ملكية المخزن للشركة الحالية
        $warehouse = Warehouse::where('tenant_id', $tenantId)->where('id', $data['warehouse_id'])->first();
        if (!$warehouse) {
            throw new InvalidArgumentException('أمان: المخزن المحدد غير تابع لشركتك.');
        }

        $receivedMeters = (float) $data['received_meters'];
        if ($receivedMeters <= 0) {
            throw new InvalidArgumentException('كمية الأقمشة المستلمة يجب أن تكون أكبر من الصفر.');
        }

        return DB::transaction(function () use ($tenantId, $data, $receivedMeters) {
            return CustomerMaterial::create([
                'tenant_id' => $tenantId,
                'customer_name' => $data['customer_name'],
                'fabric_name' => $data['fabric_name'],
                'fabric_code' => !empty($data['fabric_code']) ? $data['fabric_code'] : ('CUST-MAT-' . strtoupper(bin2hex(random_bytes(3)))),
                'gsm' => $data['gsm'] ?? 180.0,
                'usable_width_meters' => $data['usable_width_meters'] ?? 1.60,
                'received_meters' => $receivedMeters,
                'consumed_meters' => 0.0,
                'waste_meters' => 0.0,
                'returned_meters' => 0.0,
                'remaining_meters' => $receivedMeters,
                'warehouse_id' => $data['warehouse_id'],
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /**
     * صرف جزء من خامة العميل للقص مع حساب الهالك مع أقفال الصفوف ومنع السالب
     */
    public function consumeCustomerMaterial(string $id, float $consumedMeters, float $wasteMeters = 0.0): CustomerMaterial
    {
        $contextTenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($contextTenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة مفقود. لا يمكن صرف أمانات خامات دون سياق شركة موثق.');
        }

        if ($consumedMeters < 0 || $wasteMeters < 0) {
            throw new InvalidArgumentException('أمان: كميات الصرف والهالك لا يمكن أن تكون سالبة.');
        }

        $totalDeduction = round($consumedMeters + $wasteMeters, 4);
        if ($totalDeduction <= 0) {
            throw new InvalidArgumentException('يجب أن يكون مجموع كميات الصرف والهالك أكبر من الصفر.');
        }

        return DB::transaction(function () use ($contextTenantId, $id, $consumedMeters, $wasteMeters, $totalDeduction) {
            $custMat = CustomerMaterial::where('tenant_id', $contextTenantId)
                ->where('id', $id)
                ->lockForUpdate()
                ->firstOrFail();

            $remaining = (float) $custMat->remaining_meters;
            if ($totalDeduction > $remaining) {
                throw new InvalidArgumentException("الكمية المطلوبة [{$totalDeduction}] تتجاوز الرصيد المتبقي من خامة العميل [{$remaining}].");
            }

            $custMat->consumed_meters = round((float)$custMat->consumed_meters + $consumedMeters, 4);
            $custMat->waste_meters = round((float)$custMat->waste_meters + $wasteMeters, 4);
            $custMat->remaining_meters = round($remaining - $totalDeduction, 4);

            if ($custMat->remaining_meters < 0) {
                throw new InvalidArgumentException('خطأ حسابي: الرصيد المتبقي لا يمكن أن يكون سالباً.');
            }

            $expectedReceived = round((float)$custMat->consumed_meters + (float)$custMat->waste_meters + (float)$custMat->returned_meters + (float)$custMat->remaining_meters, 4);
            if (abs($expectedReceived - (float)$custMat->received_meters) > 0.001) {
                throw new InvalidArgumentException('خطأ حسابي: عدم اتساق في مجموع كميات خامة العميل.');
            }

            $custMat->save();

            return $custMat;
        });
    }
}

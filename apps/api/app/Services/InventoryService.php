<?php

namespace App\Services;

use App\Models\CustomerMaterial;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Warehouse;
use Exception;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InventoryService
{
    /**
     * تسجيل حركة مخزنية رسمية في دفتر الأستاذ مع معالجة التزامن وحظر الرصيد السالب
     */
    public function recordTransaction(array $data): InventoryTransaction
    {
        return DB::transaction(function () use ($data) {
            $itemId = $data['inventory_item_id'];
            $quantity = (float) $data['quantity'];
            $unitCost = isset($data['unit_cost']) ? (float) $data['unit_cost'] : 0.0;
            $direction = strtoupper($data['direction']); // IN or OUT
            $transactionType = $data['transaction_type'];

            if ($quantity <= 0) {
                throw new InvalidArgumentException('يجب أن تكون كمية الحركة المخزنية أكبر من الصفر.');
            }

            // قفل السجل لمنع تضارب التزامن (Race Condition Protection)
            $item = InventoryItem::where('id', $itemId)->lockForUpdate()->firstOrFail();
            $warehouse = Warehouse::where('id', $item->warehouse_id)->firstOrFail();

            $balanceBefore = (float) $item->current_balance;

            if ($direction === 'OUT') {
                if ($balanceBefore < $quantity && !$warehouse->allow_negative_stock) {
                    throw new Exception("رصيد الصنف [{$item->name}] في المخزن غير كافٍ. المتاح: [{$balanceBefore}] {$item->unit_of_measure}، المطلوب صرفه: [{$quantity}].");
                }
                $balanceAfter = $balanceBefore - $quantity;
            } elseif ($direction === 'IN') {
                $balanceAfter = $balanceBefore + $quantity;

                // تحديث المتوسط المرجح للتكلفة (Weighted Average Cost)
                if ($unitCost > 0 && $balanceAfter > 0) {
                    $oldTotal = $balanceBefore * (float) $item->average_cost;
                    $newTotal = $oldTotal + ($quantity * $unitCost);
                    $item->average_cost = round($newTotal / $balanceAfter, 4);
                }
            } else {
                throw new InvalidArgumentException('اتجاه الحركة المخزنية يجب أن يكون إما IN أو OUT.');
            }

            $item->current_balance = $balanceAfter;
            $item->save();

            // إنشاء قيد دفتر الأستاذ المخزني غير القابل للتعديل
            return InventoryTransaction::create([
                'tenant_id' => $item->tenant_id,
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
            ]);
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
            'linear_weight_grams_per_meter' => round($linearWeightGramsPerMeter, 4),
            'calculated_weight_kg' => round($weightKg, 4),
            'formula' => 'kg = meters * usable_width_m * (gsm / 1000)',
            'technical_note' => 'تعتمد دقة الحساب على انتظام كثافة النسيج على طول اللفة، ونسبة رطوبة القطن (المعياري 8.5%)، وخلو القماش من الشد الزائد.',
        ];
    }

    /**
     * تحويل الأقمشة من كيلوجرامات إلى أمتار بناءً على GSM وعرض القماش الفعلي
     *
     * المعادلة الفيزيائية:
     * الطول (متر) = (الوزن بالكجم × 1000) / (عرض القماش بالمتر × GSM)
     */
    public function convertFabricKgToMeters(float $weightKg, float $usableWidthMeters, float $gsm): array
    {
        if ($weightKg <= 0 || $usableWidthMeters <= 0 || $gsm <= 0) {
            throw new InvalidArgumentException('يجب أن تكون قيم الوزن وعرض القماش وGSM موجبة وأكبر من الصفر.');
        }

        $meters = ($weightKg * 1000.0) / ($usableWidthMeters * $gsm);

        return [
            'weight_kg' => $weightKg,
            'usable_width_meters' => $usableWidthMeters,
            'gsm' => $gsm,
            'calculated_meters' => round($meters, 4),
            'formula' => 'meters = (weight_kg * 1000) / (usable_width_m * gsm)',
            'technical_note' => 'يحسب الطول النظري الصافي. في صالة القص يجب احتساب سماحية انكماش وراحة النسيج (Relaxation).',
        ];
    }

    /**
     * استلام أمانات خامات العملاء للقص أو التصنيع للغير (فصل تام عن أصول الشركة)
     */
    public function receiveCustomerMaterial(array $data): CustomerMaterial
    {
        return DB::transaction(function () use ($data) {
            $receivedMeters = (float) $data['received_meters'];
            $gsm = (float) $data['gsm'];
            $width = (float) $data['usable_width_meters'];

            return CustomerMaterial::create([
                'tenant_id' => $data['tenant_id'] ?? app('current_tenant_id'),
                'customer_name' => $data['customer_name'],
                'fabric_name' => $data['fabric_name'],
                'fabric_code' => $data['fabric_code'],
                'gsm' => $gsm,
                'usable_width_meters' => $width,
                'received_meters' => $receivedMeters,
                'consumed_meters' => 0,
                'waste_meters' => 0,
                'returned_meters' => 0,
                'remaining_meters' => $receivedMeters,
                'warehouse_id' => $data['warehouse_id'],
                'notes' => $data['notes'] ?? null,
            ]);
        });
    }

    /**
     * صرف أقمشة العميل للقص مع تسجيل الهالك والباقي بدقة
     */
    public function consumeCustomerMaterial(string $customerMaterialId, float $cutMeters, float $wasteMeters = 0): CustomerMaterial
    {
        return DB::transaction(function () use ($customerMaterialId, $cutMeters, $wasteMeters) {
            $material = CustomerMaterial::where('id', $customerMaterialId)->lockForUpdate()->firstOrFail();

            $totalRequested = $cutMeters + $wasteMeters;
            if ($material->remaining_meters < $totalRequested) {
                throw new Exception("رصيد خامات العميل غير كافٍ. المتبقي: [{$material->remaining_meters}] متر، المطلوب صرفه: [{$totalRequested}] متر.");
            }

            $material->consumed_meters += $cutMeters;
            $material->waste_meters += $wasteMeters;
            $material->remaining_meters -= $totalRequested;
            $material->save();

            return $material;
        });
    }
}

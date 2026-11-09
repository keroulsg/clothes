<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\InventoryItem;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\MaintenanceSparePart;
use App\Models\Warehouse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MaintenanceService
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected AccountingService $accountingService
    ) {}

    /**
     * Register a new factory machine / equipment asset.
     */
    public function registerMachine(array $data): Machine
    {
        return DB::transaction(function () use ($data) {
            $tenantId = app('current_tenant_id');

            if (!empty($data['branch_id'])) {
                Branch::where('tenant_id', $tenantId)->findOrFail($data['branch_id']);
            }

            $machineCode = $data['machine_code'] ?? 'MCH-' . strtoupper(Str::random(6));
            $intervalDays = (int) ($data['maintenance_interval_days'] ?? 30);

            $lastDate = !empty($data['last_maintenance_date']) ? Carbon::parse($data['last_maintenance_date']) : null;
            $nextDate = !empty($data['next_maintenance_date'])
                ? Carbon::parse($data['next_maintenance_date'])
                : ($lastDate ? (clone $lastDate)->addDays($intervalDays) : Carbon::today()->addDays($intervalDays));

            return Machine::create([
                'tenant_id' => $tenantId,
                'machine_code' => $machineCode,
                'name' => $data['name'],
                'model_number' => $data['model_number'] ?? null,
                'serial_number' => $data['serial_number'] ?? null,
                'machine_type' => $data['machine_type'] ?? 'sewing',
                'location' => $data['location'] ?? null,
                'purchase_date' => $data['purchase_date'] ?? null,
                'warranty_expiry_date' => $data['warranty_expiry_date'] ?? null,
                'status' => $data['status'] ?? 'operational',
                'maintenance_interval_days' => $intervalDays,
                'last_maintenance_date' => $lastDate?->format('Y-m-d'),
                'next_maintenance_date' => $nextDate?->format('Y-m-d'),
                'notes' => $data['notes'] ?? null,
                'branch_id' => $data['branch_id'] ?? null,
            ]);
        });
    }

    /**
     * Create a maintenance work order or breakdown ticket.
     */
    public function createWorkOrder(array $data): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($data) {
            $machine = Machine::findOrFail($data['machine_id']);
            $orderNumber = $data['order_number'] ?? 'MNT-' . date('Ymd') . '-' . strtoupper(Str::random(4));
            $status = $data['status'] ?? 'scheduled';
            $workType = $data['work_type'] ?? 'preventive';

            // If it's a breakdown or emergency, mark machine as under_maintenance or breakdown
            if (in_array($workType, ['breakdown', 'emergency']) || ($data['priority'] ?? '') === 'critical') {
                $machine->update(['status' => 'breakdown']);
            } elseif ($status === 'in_progress') {
                $machine->update(['status' => 'under_maintenance']);
            }

            $laborCost = (float) ($data['labor_cost'] ?? 0);
            $sparePartsCost = (float) ($data['spare_parts_cost'] ?? 0);
            $totalCost = $laborCost + $sparePartsCost;

            $workOrder = MaintenanceWorkOrder::create([
                'machine_id' => $machine->id,
                'order_number' => $orderNumber,
                'work_type' => $workType,
                'priority' => $data['priority'] ?? 'medium',
                'status' => $status,
                'issue_description' => $data['issue_description'],
                'resolution_notes' => $data['resolution_notes'] ?? null,
                'reported_by' => $data['reported_by'] ?? null,
                'technician_name' => $data['technician_name'] ?? null,
                'downtime_hours' => $data['downtime_hours'] ?? 0,
                'labor_cost' => $laborCost,
                'spare_parts_cost' => $sparePartsCost,
                'total_cost' => $totalCost,
                'scheduled_date' => $data['scheduled_date'] ?? Carbon::today()->format('Y-m-d'),
                'start_time' => $status === 'in_progress' ? now() : null,
            ]);

            // Add spare parts if provided in creation
            if (!empty($data['spare_parts']) && is_array($data['spare_parts'])) {
                foreach ($data['spare_parts'] as $part) {
                    $this->addSparePart($workOrder->id, $part);
                }
            }

            return $workOrder->fresh(['machine', 'spareParts']);
        });
    }

    /**
     * Add a spare part used in maintenance work.
     */
    public function addSparePart(string $workOrderId, array $data): MaintenanceSparePart
    {
        return DB::transaction(function () use ($workOrderId, $data) {
            $workOrder = MaintenanceWorkOrder::findOrFail($workOrderId);

            $quantity = (float) ($data['quantity'] ?? 1);
            $unitCost = (float) ($data['unit_cost'] ?? 0);
            $partName = trim($data['part_name'] ?? '');
            $partNumber = !empty($data['part_number']) ? trim($data['part_number']) : null;
            $invItem = null;

            if (!empty($data['inventory_item_id'])) {
                $invItem = InventoryItem::where('tenant_id', $workOrder->tenant_id)
                    ->lockForUpdate()
                    ->findOrFail($data['inventory_item_id']);

                if ($unitCost <= 0) {
                    $unitCost = (float)$invItem->average_cost;
                }
                if (empty($partName)) {
                    $partName = $invItem->name;
                }
                if (empty($partNumber)) {
                    $partNumber = $invItem->code;
                }
            }

            // حماية صارمة لمنع تكرار الصرف في حال الضغط المزدوج (Debounce duplicate prevention within 6 seconds)
            $recent = MaintenanceSparePart::where('work_order_id', $workOrder->id)
                ->where('part_name', $partName)
                ->where('quantity', $quantity)
                ->where('created_at', '>=', now()->subSeconds(6))
                ->first();
            if ($recent) {
                return $recent;
            }

            if ($invItem) {
                // خصم الكمية المنصرفة آلياً من رصيد المستودع
                $this->inventoryService->recordTransaction([
                    'tenant_id' => $workOrder->tenant_id,
                    'inventory_item_id' => $invItem->id,
                    'warehouse_id' => $invItem->warehouse_id,
                    'quantity' => $quantity,
                    'direction' => 'OUT',
                    'transaction_type' => 'maintenance_consumption',
                    'unit_cost' => $unitCost,
                    'reference_type' => 'maintenance_work_orders',
                    'reference_id' => $workOrder->id,
                    'idempotency_key' => 'MNT-SPARE-' . $workOrder->id . '-' . md5($partName . $quantity . uniqid()),
                ]);
            }

            $totalCost = round($quantity * $unitCost, 4);

            $part = MaintenanceSparePart::create([
                'work_order_id' => $workOrder->id,
                'inventory_item_id' => $data['inventory_item_id'] ?? null,
                'part_name' => $partName,
                'part_number' => $partNumber,
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
            ]);

            // Recalculate work order spare parts cost
            $allPartsCost = (float) $workOrder->spareParts()->sum('total_cost');
            $workOrder->update([
                'spare_parts_cost' => $allPartsCost,
                'total_cost' => round((float)$workOrder->labor_cost + $allPartsCost, 4),
            ]);

            return $part;
        });
    }

    /**
     * Complete a maintenance work order, reset machine to operational, and advance next maintenance date.
     */
    public function completeWorkOrder(string $workOrderId, array $data): MaintenanceWorkOrder
    {
        return DB::transaction(function () use ($workOrderId, $data) {
            $workOrder = MaintenanceWorkOrder::with('machine')->findOrFail($workOrderId);
            $machine = $workOrder->machine;

            $downtimeHours = isset($data['downtime_hours']) ? (float)$data['downtime_hours'] : (float)$workOrder->downtime_hours;
            $laborCost = isset($data['labor_cost']) ? (float)$data['labor_cost'] : (float)$workOrder->labor_cost;
            $resolutionNotes = $data['resolution_notes'] ?? $workOrder->resolution_notes ?? 'Maintenance completed successfully.';

            $allPartsCost = (float) $workOrder->spareParts()->sum('total_cost');
            $totalCost = $laborCost + $allPartsCost;

            $workOrder->update([
                'status' => 'completed',
                'resolution_notes' => $resolutionNotes,
                'downtime_hours' => $downtimeHours,
                'labor_cost' => $laborCost,
                'spare_parts_cost' => $allPartsCost,
                'total_cost' => $totalCost,
                'completion_time' => now(),
            ]);

            // Restore machine to operational status and reschedule next preventive check
            $intervalDays = (int) ($machine->maintenance_interval_days ?: 30);
            $machine->update([
                'status' => 'operational',
                'last_maintenance_date' => Carbon::today()->format('Y-m-d'),
                'next_maintenance_date' => Carbon::today()->addDays($intervalDays)->format('Y-m-d'),
            ]);

            // ترحيل قيد المصروفات آلياً إلى حساب المصروفات الصناعية غير المباشرة (حساب 6010)
            try {
                $this->accountingService->postMaintenanceExpense($workOrder->tenant_id, $workOrder);
            } catch (\Throwable $e) {
                // Keep order completion intact if accounting period is closed or needs manual intervention
                \Illuminate\Support\Facades\Log::warning("Could not post maintenance expense journal entry: " . $e->getMessage());
            }

            return $workOrder->fresh(['machine', 'spareParts', 'journalEntry']);
        });
    }

    /**
     * جلب مخزون قطع الغيار المتوفرة بالمستودعات
     */
    public function getSparePartsInventory(): \Illuminate\Database\Eloquent\Collection
    {
        $tenantId = app('current_tenant_id');
        return InventoryItem::where('tenant_id', $tenantId)
            ->where(function ($q) {
                $q->where('item_type', 'spare_part')
                  ->orWhere('code', 'like', 'SP-%')
                  ->orWhere('code', 'like', 'PART-%');
            })
            ->with('warehouse')
            ->orderBy('name')
            ->get();
    }

    /**
     * إضافة صنف قطعة غيار جديدة إلى رصيد المخزن مباشرة
     */
    public function addSparePartToStock(array $data): InventoryItem
    {
        return DB::transaction(function () use ($data) {
            $tenantId = app('current_tenant_id');
            $code = !empty($data['code']) ? trim($data['code']) : 'SP-' . strtoupper(Str::random(6));

            $warehouseId = $data['warehouse_id'] ?? null;
            if (empty($warehouseId)) {
                $wh = Warehouse::where('tenant_id', $tenantId)->first();
                $warehouseId = $wh ? $wh->id : null;
            }

            $initialBalance = (float)($data['initial_balance'] ?? $data['quantity'] ?? 0);
            $avgCost = (float)($data['unit_cost'] ?? $data['average_cost'] ?? 0);

            $item = InventoryItem::create([
                'tenant_id' => $tenantId,
                'warehouse_id' => $warehouseId,
                'item_type' => 'spare_part',
                'code' => $code,
                'name' => trim($data['name']),
                'unit_of_measure' => $data['unit_of_measure'] ?? 'pcs',
                'reorder_level' => $data['reorder_level'] ?? 2,
                'current_balance' => $initialBalance,
                'average_cost' => $avgCost,
                'is_active' => true,
                'description' => $data['description'] ?? null,
            ]);

            if ($initialBalance > 0 && $warehouseId) {
                $this->inventoryService->recordTransaction([
                    'tenant_id' => $tenantId,
                    'inventory_item_id' => $item->id,
                    'warehouse_id' => $warehouseId,
                    'quantity' => $initialBalance,
                    'direction' => 'IN',
                    'transaction_type' => 'opening_balance',
                    'unit_cost' => $avgCost,
                    'reference_type' => 'inventory_items',
                    'reference_id' => $item->id,
                    'idempotency_key' => 'OPENING-SPARE-' . $item->id,
                ]);
            }

            return $item->fresh(['warehouse']);
        });
    }

    /**
     * Get asset downtime and maintenance cost summary.
     */
    public function getDowntimeSummary(): array
    {
        $totalMachines = Machine::count();
        $operationalMachines = Machine::where('status', 'operational')->count();
        $downMachines = Machine::whereIn('status', ['under_maintenance', 'breakdown'])->count();
        $totalDowntimeHours = (float) MaintenanceWorkOrder::sum('downtime_hours');
        $totalMaintenanceCost = (float) MaintenanceWorkOrder::sum('total_cost');

        return [
            'total_machines' => $totalMachines,
            'operational_machines' => $operationalMachines,
            'down_machines' => $downMachines,
            'total_downtime_hours' => round($totalDowntimeHours, 2),
            'total_maintenance_cost' => round($totalMaintenanceCost, 2),
        ];
    }
}

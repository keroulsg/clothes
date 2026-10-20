<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\InventoryItem;
use App\Models\Machine;
use App\Models\MaintenanceWorkOrder;
use App\Models\MaintenanceSparePart;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class MaintenanceService
{
    public function __construct(
        protected InventoryService $inventoryService
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

            if (!empty($data['inventory_item_id'])) {
                $invItem = InventoryItem::where('tenant_id', $workOrder->tenant_id)
                    ->lockForUpdate()
                    ->findOrFail($data['inventory_item_id']);

                if ($unitCost <= 0) {
                    $unitCost = (float)$invItem->average_cost;
                }

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
                    'idempotency_key' => 'MNT-SPARE-' . $workOrder->id . '-' . md5(($data['part_name'] ?? 'part') . $quantity . uniqid()),
                ]);
            }

            $totalCost = round($quantity * $unitCost, 4);

            $part = MaintenanceSparePart::create([
                'work_order_id' => $workOrder->id,
                'inventory_item_id' => $data['inventory_item_id'] ?? null,
                'part_name' => $data['part_name'],
                'part_number' => $data['part_number'] ?? null,
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

            return $workOrder->fresh(['machine', 'spareParts']);
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

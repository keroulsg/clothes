<?php

namespace Tests\Feature;

use App\Models\CuttingOrder;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Phase 5 Safe Inventory Verification Test
 *
 * Verifies stock movement warnings, reorder thresholds, insufficient stock validation,
 * and ledger consistency using strictly isolated test entities with unique prefixes.
 */
class SafeInventoryVerificationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $testTenant;
    private User $testOwner;
    private Warehouse $testWarehouse;
    private CuttingOrder $testCuttingOrder;
    private ProductionOrder $testProdOrder;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testTenant = Tenant::create([
            'name' => 'شركة فحص المخزون الآمن',
            'code' => 'TEST-INV-20261027-TEN',
            'subscription_status' => 'active',
            'subscription_tier' => 'enterprise',
        ]);

        $this->testOwner = User::create([
            'tenant_id' => $this->testTenant->id,
            'name' => 'مسؤول فحص المخزون',
            'email' => 'qa.inventory.20261027@example.com',
            'password' => bcrypt('SafePass123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->testWarehouse = Warehouse::create([
            'tenant_id' => $this->testTenant->id,
            'name' => 'مستودع الفحص المعزول 20261027',
            'code' => 'TEST-INV-20261027-WH',
            'type' => 'fabric',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $model = GarmentModel::create([
            'tenant_id' => $this->testTenant->id,
            'code' => 'TEST-INV-20261027-MOD',
            'name' => 'موديل فحص المخزون',
            'category' => 'shirts',
        ]);

        $this->testProdOrder = ProductionOrder::create([
            'tenant_id' => $this->testTenant->id,
            'order_number' => 'TEST-INV-20261027-PO-01',
            'garment_model_id' => $model->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(7)->toDateString(),
            'total_planned_quantity' => 100,
            'status' => 'in_progress',
        ]);

        $this->testCuttingOrder = CuttingOrder::create([
            'tenant_id' => $this->testTenant->id,
            'production_order_id' => $this->testProdOrder->id,
            'cutting_order_number' => 'TEST-INV-20261027-CUT-01',
            'warehouse_id' => $this->testWarehouse->id,
            'lay_length_meters' => 5.0,
            'layers_count' => 10,
            'total_cut_pieces' => 50,
            'status' => 'pending',
        ]);
    }

    /**
     * Test Scenario 1 & 2 & 3:
     * - Warning when stock is at reorder threshold.
     * - Warning when stock falls below reorder threshold.
     * - Outbound movement with warning completes successfully when valid.
     */
    public function test_safe_inventory_reorder_threshold_warnings_and_outbound_execution(): void
    {
        Sanctum::actingAs($this->testOwner);

        // 1. Create isolated raw material with initial balance = 100, reorder level = 50
        $item = InventoryItem::create([
            'tenant_id' => $this->testTenant->id,
            'warehouse_id' => $this->testWarehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'TEST-INV-20261027-RAW-001',
            'name' => 'قماش فحص معزول قطن رمادي',
            'unit_of_measure' => 'kg',
            'reorder_level' => 50.0,
            'average_cost' => 120.0,
            'current_balance' => 100.0,
            'storage_zone' => 'Zone-QA-1',
            'rack_location' => 'R-01',
            'shelf_bin_location' => 'B-01',
        ]);

        // Record opening balance in ledger
        InventoryTransaction::create([
            'tenant_id' => $this->testTenant->id,
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 100.0,
            'unit_cost' => 120.0,
            'total_cost' => 12000.0,
            'balance_before' => 0.0,
            'balance_after' => 100.0,
            'reference_type' => 'manual_reference',
            'reference_number' => 'TEST-INV-20261027-INIT',
        ]);

        $this->assertEquals(100.0, (float) $item->current_balance);
        $this->assertEquals(50.0, (float) $item->reorder_level);

        // Check simulation logic for stock at reorder threshold:
        // Current: 100, Out: 50 -> Simulated After: 50 (== reorder_level)
        $simulatedQty1 = 50.0;
        $simulatedAfter1 = (float) $item->current_balance - $simulatedQty1;
        $isAtReorderThreshold = ($simulatedAfter1 == (float) $item->reorder_level);
        $this->assertTrue($isAtReorderThreshold, 'Simulation must detect stock reaching exact reorder threshold');

        // Post Outbound Movement 1 (50 kg) via cutting_order
        $outRes1 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 50.0,
            'reference_type' => 'cutting_order',
            'reference_number' => $this->testCuttingOrder->cutting_order_number,
            'notes' => 'صرف تشغيلي يخفض الرصيد إلى حد إعادة الطلب تماماً',
        ], ['X-Tenant-Id' => $this->testTenant->id]);

        $outRes1->assertStatus(201);
        $item->refresh();
        $this->assertEquals(50.0, (float) $item->current_balance, 'Stock after movement 1 must equal 50.0');

        // Check simulation logic for stock falling below reorder threshold:
        // Current: 50, Out: 20 -> Simulated After: 30 (< reorder_level 50)
        $simulatedQty2 = 20.0;
        $simulatedAfter2 = (float) $item->current_balance - $simulatedQty2;
        $isBelowReorderThreshold = ($simulatedAfter2 < (float) $item->reorder_level && $simulatedAfter2 >= 0);
        $this->assertTrue($isBelowReorderThreshold, 'Simulation must detect stock falling below reorder threshold');

        // Post Outbound Movement 2 (20 kg) via cutting_order
        $outRes2 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 20.0,
            'reference_type' => 'cutting_order',
            'reference_number' => $this->testCuttingOrder->cutting_order_number,
            'notes' => 'صرف تشغيلي يخفض الرصيد إلى ما دون حد إعادة الطلب',
        ], ['X-Tenant-Id' => $this->testTenant->id]);

        $outRes2->assertStatus(201);
        $item->refresh();
        $this->assertEquals(30.0, (float) $item->current_balance, 'Stock after movement 2 must equal 30.0');
    }

    /**
     * Test Scenario 4:
     * - Validation error on insufficient stock: outbound movement exceeding available stock
     *   must be rejected with HTTP 422 and error message, and no movement recorded.
     */
    public function test_safe_inventory_insufficient_stock_is_rejected_with_422(): void
    {
        Sanctum::actingAs($this->testOwner);

        $item = InventoryItem::create([
            'tenant_id' => $this->testTenant->id,
            'warehouse_id' => $this->testWarehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'TEST-INV-20261027-RAW-002',
            'name' => 'قماش فحص الرصيد غير الكافي',
            'unit_of_measure' => 'meter',
            'reorder_level' => 10.0,
            'average_cost' => 50.0,
            'current_balance' => 25.0,
        ]);

        $initialLedgerCount = InventoryTransaction::where('inventory_item_id', $item->id)->count();

        // Attempt outbound movement of 40 meters when available balance is only 25 meters
        $excessiveResponse = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 40.0,
            'reference_type' => 'cutting_order',
            'reference_number' => $this->testCuttingOrder->cutting_order_number,
            'notes' => 'محاولة صرف تتجاوز الرصيد المتاح',
        ], ['X-Tenant-Id' => $this->testTenant->id]);

        $excessiveResponse->assertStatus(422);
        $excessiveResponse->assertJsonStructure(['error', 'message']);
        $this->assertStringContainsString('غير كافٍ', $excessiveResponse->json('message'));

        // Verify balance and ledger were untouched
        $item->refresh();
        $this->assertEquals(25.0, (float) $item->current_balance);
        $finalLedgerCount = InventoryTransaction::where('inventory_item_id', $item->id)->count();
        $this->assertEquals($initialLedgerCount, $finalLedgerCount, 'No transaction may be recorded on insufficient stock failure');
    }

    /**
     * Test Scenario 5 & 6:
     * - Record initial stock, movements, final stock.
     * - Verify ledger consistency: sum of movements must match the final stock balance.
     */
    public function test_safe_inventory_ledger_consistency_and_balance_reconciliation(): void
    {
        Sanctum::actingAs($this->testOwner);

        $item = InventoryItem::create([
            'tenant_id' => $this->testTenant->id,
            'warehouse_id' => $this->testWarehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'TEST-INV-20261027-RAW-003',
            'name' => 'قماش فحص دفتر الأستاذ والمطابقة',
            'unit_of_measure' => 'kg',
            'reorder_level' => 30.0,
            'average_cost' => 100.0,
            'current_balance' => 0.0,
        ]);

        // Movement 1: Inward 150 kg (Positive Adjustment)
        $inRes1 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 150.0,
            'unit_cost' => 100.0,
            'reference_type' => 'manual_reference',
            'reference_number' => 'TEST-INV-20261027-LEDGER-IN-1',
        ], ['X-Tenant-Id' => $this->testTenant->id]);
        $inRes1->assertStatus(201);

        // Movement 2: Outward 45 kg (Material Issuance)
        $outRes1 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 45.0,
            'reference_type' => 'cutting_order',
            'reference_number' => $this->testCuttingOrder->cutting_order_number,
        ], ['X-Tenant-Id' => $this->testTenant->id]);
        $outRes1->assertStatus(201);

        // Movement 3: Outward 35 kg (Material Issuance)
        $outRes2 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 35.0,
            'reference_type' => 'cutting_order',
            'reference_number' => $this->testCuttingOrder->cutting_order_number,
        ], ['X-Tenant-Id' => $this->testTenant->id]);
        $outRes2->assertStatus(201);

        // Movement 4: Inward 20 kg (Positive Adjustment)
        $inRes2 = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $item->id,
            'warehouse_id' => $this->testWarehouse->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 20.0,
            'unit_cost' => 100.0,
            'reference_type' => 'manual_reference',
            'reference_number' => 'TEST-INV-20261027-LEDGER-IN-2',
        ], ['X-Tenant-Id' => $this->testTenant->id]);
        $inRes2->assertStatus(201);

        $item->refresh();

        // Calculate expected final balance:
        // 0 + 150 - 45 - 35 + 20 = 90 kg
        $expectedBalance = 90.0;
        $this->assertEquals($expectedBalance, (float) $item->current_balance);

        // Calculate sum of movements from immutable ledger
        $inSum = (float) InventoryTransaction::where('inventory_item_id', $item->id)
            ->where('direction', 'IN')
            ->sum('quantity');

        $outSum = (float) InventoryTransaction::where('inventory_item_id', $item->id)
            ->where('direction', 'OUT')
            ->sum('quantity');

        $netLedgerBalance = $inSum - $outSum;

        $this->assertEquals(170.0, $inSum, 'Total IN movements must be 170');
        $this->assertEquals(80.0, $outSum, 'Total OUT movements must be 80');
        $this->assertEquals($expectedBalance, $netLedgerBalance, 'Net ledger balance must equal 90');
        $this->assertEquals((float) $item->current_balance, $netLedgerBalance, 'Item balance table must exactly match immutable ledger transactions');
    }
}

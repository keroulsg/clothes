<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\CustomerMaterial;
use App\Models\GoodsReceiptNote;
use App\Models\GoodsReceiptNoteItem;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockCount;
use App\Models\StockTransfer;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\UnitOfMeasure;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Batch2InventoryAndProcurementTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected User $ownerA;
    protected User $accountantA;
    protected User $workerA;
    protected string $tokenA;
    protected string $tokenAccountantA;
    protected string $tokenWorkerA;

    protected Tenant $tenantB;
    protected User $ownerB;
    protected string $tokenB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. إعداد الشركة A مع أدوار متعددة
        $this->tenantA = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع النيل للملابس الجاهزة',
            'code' => 'TEN-NILE-' . uniqid(),
            'subdomain' => 'nile-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
            'settings' => [
                'tax' => ['enabled' => false, 'rate' => 0.0],
            ],
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المهندس أحمد مالك المصنع A',
            'email' => 'owner-a-' . uniqid() . '@nilegarments.com',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenA = $this->ownerA->createToken('test')->plainTextToken;

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'الأستاذ سامح رئيس الحسابات A',
            'email' => 'accountant-a-' . uniqid() . '@nilegarments.com',
            'password' => bcrypt('Password123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);
        $this->tokenAccountantA = $this->accountantA->createToken('test')->plainTextToken;

        $this->workerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'العامل محمود خط إنتاج A',
            'email' => 'worker-a-' . uniqid() . '@nilegarments.com',
            'password' => bcrypt('Password123!'),
            'role' => 'worker',
            'is_active' => true,
        ]);
        $this->tokenWorkerA = $this->workerA->createToken('test')->plainTextToken;

        // 2. إعداد الشركة B للعزل
        $this->tenantB = Tenant::withoutGlobalScopes()->create([
            'name' => 'مصنع الدلتا للمنسوجات',
            'code' => 'TEN-DELTA-' . uniqid(),
            'subdomain' => 'delta-' . uniqid(),
            'status' => 'active',
            'plan_tier' => 'professional',
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'الحاج محمود مالك المصنع B',
            'email' => 'owner-b-' . uniqid() . '@deltatex.com',
            'password' => bcrypt('Password123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
        $this->tokenB = $this->ownerB->createToken('test')->plainTextToken;
    }

    /**
     * Scenario 1: New tenant registration has strictly 0 warehouses and 0 inventory items.
     */
    public function test_new_tenant_has_no_warehouses_or_items_until_created(): void
    {
        $regResponse = $this->postJson('/api/v1/auth/register-company', [
            'company_name' => 'مصنع الأمل الجديد',
            'owner_name' => 'كريم إبراهيم',
            'email' => 'new-factory-' . uniqid() . '@alamal.com',
            'password' => 'Secret123456!',
            'with_sample_data' => false,
        ]);

        $regResponse->assertStatus(201);
        $newTenantId = $regResponse->json('tenant.id');

        $this->assertEquals(0, DB::table('warehouses')->where('tenant_id', $newTenantId)->count());
        $this->assertEquals(0, DB::table('inventory_items')->where('tenant_id', $newTenantId)->count());
        $this->assertEquals(0, DB::table('inventory_transactions')->where('tenant_id', $newTenantId)->count());
        $this->assertEquals(0, DB::table('suppliers')->where('tenant_id', $newTenantId)->count());
    }

    /**
     * Scenario 2: Tenant A cannot view or modify Tenant B's branches, warehouses, inventory, or suppliers.
     */
    public function test_tenant_isolation_across_branches_warehouses_and_suppliers(): void
    {
        // Tenant A creates Branch, Warehouse, Supplier
        $branchA = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'فرع العاشر من رمضان A',
            'code' => 'BR-A1',
            'type' => 'factory',
            'is_main' => true,
        ]);

        $whA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $branchA->id,
            'name' => 'المستودع الرئيسي A',
            'code' => 'WH-A1',
            'type' => 'raw_materials',
            'is_active' => true,
        ]);

        $supplierA = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'شركة الغزل المصرية A',
            'code' => 'SUP-A1',
            'payment_terms' => 'net_30',
        ]);

        // Tenant B attempts to view or update Tenant A's entities
        $bBranch = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->getJson("/api/v1/branches/{$branchA->id}");
        $bBranch->assertStatus(404);

        $bWhUpdate = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->putJson("/api/v1/warehouses/{$whA->id}", ['name' => 'محاولة اختراق B']);
        $bWhUpdate->assertStatus(404);

        $bSuppliers = $this->withHeader('Authorization', 'Bearer ' . $this->tokenB)
            ->getJson('/api/v1/suppliers');
        $bSuppliers->assertStatus(200);
        $this->assertCount(0, $bSuppliers->json('data'));
    }

    /**
     * Scenario 3: Tenant can create multiple branches and warehouses with custom types.
     */
    public function test_branch_and_warehouse_management_with_custom_types(): void
    {
        // 1. Create Branch
        $branchRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/branches', [
                'name' => 'فرع برج العرب للقص والتجهيز',
                'code' => 'BR-BORG-01',
                'type' => 'cutting_center',
                'is_main' => false,
                'address' => 'المنطقة الصناعية الثالثة',
                'manager_name' => 'م. طارق عبد الله',
            ]);
        $branchRes->assertStatus(201);
        $branchId = $branchRes->json('branch.id');

        // 2. Add custom warehouse type
        $typeRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/warehouse-types', [
                'code' => 'bonded_export',
                'name' => 'مستودع المنطقة الحرة للصادرات',
                'name_en' => 'Bonded Export Warehouse',
            ]);
        $typeRes->assertStatus(201);

        // 3. Create Warehouse with custom type and link to branch
        $whRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/warehouses', [
                'branch_id' => $branchId,
                'name' => 'مستودع الأقمشة المستوردة',
                'code' => 'WH-FAB-01',
                'type' => 'bonded_export',
                'manager_name' => 'عماد عبد الرحمن',
                'allow_negative_stock' => false,
            ]);
        $whRes->assertStatus(201);
        $whRes->assertJsonPath('warehouse.type', 'bonded_export');
        $whRes->assertJsonPath('warehouse.branch.id', $branchId);
    }

    /**
     * Scenario 4 & 5: Inventory item created, assigned valid units, and opening balance generates ledger record.
     */
    public function test_inventory_item_creation_units_and_authorized_opening_balance(): void
    {
        $branch = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المصنع الرئيسي',
            'code' => 'BR-01',
            'type' => 'factory',
        ]);

        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $branch->id,
            'name' => 'مستودع خامات النسيج',
            'code' => 'WH-RAW-01',
            'type' => 'raw_materials',
        ]);

        // Get units
        $unitsRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/inventory/units');
        $unitsRes->assertStatus(200);

        // Create Item with opening balance
        $itemRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/inventory/items', [
                'warehouse_id' => $wh->id,
                'item_type' => 'fabric_raw',
                'code' => 'FAB-CTN-100',
                'name' => 'قماش قطن مصري 100% سينجل جيرسي',
                'name_en' => 'Egyptian Cotton 100% Single Jersey',
                'unit_of_measure' => 'meter',
                'reorder_level' => 150.0,
                'min_stock_level' => 50.0,
                'average_cost' => 85.50,
                'initial_balance' => 500.0,
                'technical_specs' => [
                    'gsm' => 180,
                    'usable_width_meters' => 1.65,
                    'composition' => '100% Cotton',
                ],
            ]);

        $itemRes->assertStatus(201);
        $itemId = $itemRes->json('item.id');

        // Verify opening balance ledger movement
        $tx = DB::table('inventory_transactions')
            ->where('tenant_id', $this->tenantA->id)
            ->where('inventory_item_id', $itemId)
            ->first();

        $this->assertNotNull($tx);
        $this->assertEquals('adjustment_positive', $tx->transaction_type);
        $this->assertEquals('IN', $tx->direction);
        $this->assertEquals(500.0, (float)$tx->quantity);
        $this->assertEquals(85.50, (float)$tx->unit_cost);
        $this->assertEquals('opening_balance', $tx->reference_type);

        // Verify stock card endpoint
        $cardRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson("/api/v1/inventory/items/{$itemId}/stock-card");
        $cardRes->assertStatus(200);
        $cardRes->assertJsonPath('summary.current_balance', 500);
        $cardRes->assertJsonPath('summary.total_in', 500);
    }

    /**
     * Scenario 6, 7, 8, 9, 10, 18: Complete Procurement Cycle (PO -> Approval -> GRN Partial -> Rejection -> Tax Config).
     */
    public function test_complete_procurement_cycle_with_tenant_tax_and_grn_inspection(): void
    {
        $branch = Branch::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المصنع',
            'code' => 'BR-PO',
            'type' => 'factory',
        ]);

        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'branch_id' => $branch->id,
            'name' => 'مستودع الاستلام',
            'code' => 'WH-PO',
            'type' => 'raw_materials',
        ]);

        $item = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-PIQUE-200',
            'name' => 'قماش بيكيه بولو قطن مخلوط',
            'unit_of_measure' => 'meter',
            'current_balance' => 0.0,
            'average_cost' => 120.0,
        ]);

        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'الشركة الحديثة للصباغة والتجهيز',
            'code' => 'SUP-MODERN-01',
            'payment_terms' => 'net_30',
        ]);

        // Scenario 18: Verify tax is NOT applied automatically (tax rate is 0.0% by default for new tenant)
        $taxSettingsRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson('/api/v1/tenant/settings/tax');
        $taxSettingsRes->assertStatus(200);
        $this->assertFalse($taxSettingsRes->json('tax_settings.enabled'));

        // Scenario 6: Create Purchase Order (no fake defaults, clean inputs)
        $poRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson('/api/v1/purchase-orders', [
                'supplier_id' => $supplier->id,
                'warehouse_id' => $wh->id,
                'order_date' => date('Y-m-d'),
                'items' => [
                    [
                        'inventory_item_id' => $item->id,
                        'ordered_quantity' => 1000.0,
                        'unit_price' => 120.0,
                    ],
                ],
            ]);

        $poRes->assertStatus(201);
        $poId = $poRes->json('purchase_order.id');
        $poItemId = $poRes->json('purchase_order.items.0.id');

        // Check tax amount is 0 because tenant tax is disabled
        $this->assertEquals(0.0, (float)$poRes->json('purchase_order.tax_amount'));
        $this->assertEquals(120000.0, (float)$poRes->json('purchase_order.total_amount'));

        // Scenario 19: Unauthorized role (worker) CANNOT approve PO
        \Laravel\Sanctum\Sanctum::actingAs($this->workerA);
        $unauthApprove = $this->postJson("/api/v1/purchase-orders/{$poId}/approve");
        $unauthApprove->assertStatus(403);

        // Scenario 7: Authorized accountant approves PO
        \Laravel\Sanctum\Sanctum::actingAs($this->accountantA);
        $approveRes = $this->postJson("/api/v1/purchase-orders/{$poId}/approve");
        $approveRes->assertStatus(200);
        $this->assertEquals('approved', $approveRes->json('purchase_order.status'));

        // Scenario 8 & 10: Partial GRN with Inspection (Delivered 600m: Accepted 500m, Rejected 100m for defect)
        $grnPayload = [
            'purchase_order_id' => $poId,
            'warehouse_id' => $wh->id,
            'inspection_status' => 'partial_pass',
            'quality_inspector_name' => 'م. حازم مراقب الجودة',
            'delivery_note_number' => 'DN-7890',
            'idempotency_key' => 'GRN-IDEM-BATCH2-001',
            'items' => [
                [
                    'purchase_order_item_id' => $poItemId,
                    'delivered_quantity' => 600.0,
                    'accepted_quantity' => 500.0,
                    'rejected_quantity' => 100.0,
                    'rejection_reason' => 'اختلاف نمرة الخيط وتبقيع لوني في الثوب رقم 4',
                    'roll_numbers' => 'ROLL-01, ROLL-02, ROLL-03, ROLL-04',
                ],
            ],
        ];

        $grnRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson('/api/v1/goods-receipts', $grnPayload);

        $grnRes->assertStatus(201);

        // Verify ONLY accepted quantity (500m) entered stock ledger
        $item->refresh();
        $this->assertEquals(500.0, (float)$item->current_balance);

        // Scenario 9: Duplicate GRN posting with same Idempotency key does NOT duplicate stock
        $dupGrnRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson('/api/v1/goods-receipts', $grnPayload);

        $dupGrnRes->assertStatus(200); // Idempotent replay
        $this->assertTrue($dupGrnRes->json('is_duplicate'));

        $item->refresh();
        $this->assertEquals(500.0, (float)$item->current_balance); // Still 500m, not 1000m!
    }

    /**
     * Scenario 11: Customer-owned custody receipt updates custody ledger but does NOT inflate company inventory valuation.
     */
    public function test_customer_custody_materials_separation_from_company_assets(): void
    {
        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع أمانات تشغيل الغير',
            'code' => 'WH-CUSTODY',
            'type' => 'customer_custody',
        ]);

        $custodyRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/inventory/customer-materials', [
                'customer_name' => 'براند زارا الشرق',
                'fabric_name' => 'قماش صوف إيطالي فاخر ملك العميل',
                'fabric_code' => 'CUST-WOOL-01',
                'received_meters' => 1200.0,
                'usable_width_meters' => 1.50,
                'gsm' => 280,
                'warehouse_id' => $wh->id,
                'notes' => 'أمانة تشغيل لقص وخياطة 500 جاكيت رجالي',
            ]);

        $custodyRes->assertStatus(201);
        $custodyId = $custodyRes->json('customer_material.id');

        // Assert customer materials balance
        $cm = CustomerMaterial::find($custodyId);
        $this->assertEquals(1200.0, (float)$cm->remaining_meters);

        // Assert company-owned inventory items count and valuation did NOT increase
        $companyItems = InventoryItem::where('tenant_id', $this->tenantA->id)
            ->where('warehouse_id', $wh->id)
            ->get();
        $this->assertCount(0, $companyItems);
    }

    /**
     * Scenario 12 & 13: Warehouse transfer correctly reduces source, holds in-transit, and increases destination.
     */
    public function test_warehouse_transfer_lifecycle_and_in_transit_safety(): void
    {
        $whSource = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المستودع الرئيسي - العاشر',
            'code' => 'WH-SRC',
            'type' => 'raw_materials',
        ]);

        $whDest = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع خط الإنتاج - العبور',
            'code' => 'WH-DST',
            'type' => 'wip',
        ]);

        $sourceItem = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $whSource->id,
            'item_type' => 'accessory_raw',
            'code' => 'ACC-BTN-NAVY',
            'name' => 'أزرار كحلي مقاس 24',
            'unit_of_measure' => 'pcs',
            'current_balance' => 5000.0,
            'average_cost' => 0.50,
        ]);

        // 1. Create Transfer Request
        $transferRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/inventory/transfers', [
                'source_warehouse_id' => $whSource->id,
                'destination_warehouse_id' => $whDest->id,
                'notes' => 'تحويل أزرار لتغذية خط الإنتاج B',
                'items' => [
                    [
                        'inventory_item_id' => $sourceItem->id,
                        'quantity' => 2000.0,
                    ],
                ],
            ]);

        $transferRes->assertStatus(201);
        $transferId = $transferRes->json('transfer.id');

        // 2. Dispatch (In Transit): stock reduces in source but is NOT yet in destination
        $dispatchRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/dispatch");
        $dispatchRes->assertStatus(200);

        $sourceItem->refresh();
        $this->assertEquals(3000.0, (float)$sourceItem->current_balance);

        $destItemBefore = InventoryItem::where('tenant_id', $this->tenantA->id)
            ->where('warehouse_id', $whDest->id)
            ->where('code', 'ACC-BTN-NAVY')
            ->first();
        $this->assertNull($destItemBefore); // Not in destination yet!

        // 3. Receive in destination
        $receiveRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson("/api/v1/inventory/transfers/{$transferId}/receive");
        $receiveRes->assertStatus(200);

        $destItemAfter = InventoryItem::where('tenant_id', $this->tenantA->id)
            ->where('warehouse_id', $whDest->id)
            ->where('code', 'ACC-BTN-NAVY')
            ->first();
        $this->assertNotNull($destItemAfter);
        $this->assertEquals(2000.0, (float)$destItemAfter->current_balance);
    }

    /**
     * Scenario 14 & 15: Physical Stock Count requires approval and generates immutable adjustment ledger transactions.
     */
    public function test_physical_stock_count_and_ledger_adjustments(): void
    {
        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مستودع الإكسسوارات',
            'code' => 'WH-COUNT',
            'type' => 'accessories',
        ]);

        $itemA = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'accessory_raw',
            'code' => 'ACC-ZIP-50',
            'name' => 'سوستة نحاس 50 سم',
            'unit_of_measure' => 'pcs',
            'current_balance' => 100.0,
            'average_cost' => 5.0,
        ]);

        // 1. Create Count Session
        $countRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->postJson('/api/v1/inventory/counts', [
                'warehouse_id' => $wh->id,
                'count_date' => date('Y-m-d'),
                'notes' => 'جرد الربع الرابع الدوري',
            ]);
        $countRes->assertStatus(201);
        $countId = $countRes->json('stock_count.id');
        $countItemId = $countRes->json('stock_count.items.0.id');

        // 2. Record Physical Quantity (found 92 instead of 100 -> deficit of -8 pcs)
        $recordRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->putJson("/api/v1/inventory/counts/{$countId}/record", [
                'items' => [
                    [
                        'item_id' => $countItemId,
                        'physical_quantity' => 92.0,
                        'notes' => 'تلف 8 قطع أثناء التخزين',
                    ],
                ],
            ]);
        $recordRes->assertStatus(200);

        // Before approval, system stock balance MUST NOT change
        $itemA->refresh();
        $this->assertEquals(100.0, (float)$itemA->current_balance);

        // 3. Approve Count Session
        $approveRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson("/api/v1/inventory/counts/{$countId}/approve");
        $approveRes->assertStatus(200);

        // After approval, stock ledger transaction generated and stock balance updated
        $itemA->refresh();
        $this->assertEquals(92.0, (float)$itemA->current_balance);

        $adjTx = DB::table('inventory_transactions')
            ->where('tenant_id', $this->tenantA->id)
            ->where('inventory_item_id', $itemA->id)
            ->where('transaction_type', 'adjustment_negative')
            ->first();

        $this->assertNotNull($adjTx);
        $this->assertEquals(8.0, (float)$adjTx->quantity);
        $this->assertEquals('OUT', $adjTx->direction);
        $this->assertEquals(100.0, (float)$adjTx->balance_before);
        $this->assertEquals(92.0, (float)$adjTx->balance_after);

        // A repeated approval must be harmless: no second stock movement is created.
        $repeatApproval = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson("/api/v1/inventory/counts/{$countId}/approve");
        $repeatApproval->assertStatus(200);
        $this->assertEquals(92.0, (float) $itemA->fresh()->current_balance);
        $this->assertSame(1, DB::table('inventory_transactions')
            ->where('tenant_id', $this->tenantA->id)
            ->where('reference_type', 'stock_count')
            ->where('reference_id', (string) $countItemId)
            ->count());
    }

    /**
     * Scenario 16 & 17: Supplier Invoices, Partial Payments, and Statement Reconciliation.
     */
    public function test_supplier_invoices_partial_payments_and_statement_reconciliation(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مصنع المحلة للأنسجة الفاخرة',
            'code' => 'SUP-MAHALLA-01',
            'payment_terms' => 'net_30',
            'current_balance' => 0.0,
        ]);

        $wh = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'المستودع العام',
            'code' => 'WH-GEN',
            'type' => 'raw_materials',
        ]);

        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'po_number' => 'PO-TEST-FIN-01',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $wh->id,
            'order_date' => date('Y-m-d'),
            'status' => 'approved',
            'subtotal' => 50000.0,
            'total_amount' => 50000.0,
        ]);

        $inventoryItem = InventoryItem::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-INV-' . uniqid(),
            'name' => 'Cotton fabric for supplier invoice test',
            'unit_of_measure' => 'meter',
            'current_balance' => 0,
            'average_cost' => 100,
            'is_customer_owned' => false,
        ]);

        $poItem = PurchaseOrderItem::create([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $inventoryItem->id,
            'ordered_quantity' => 500,
            'received_quantity' => 500,
            'remaining_quantity' => 0,
            'unit_price' => 100,
            'total_price' => 50000,
        ]);

        $grn = GoodsReceiptNote::create([
            'tenant_id' => $this->tenantA->id,
            'grn_number' => 'GRN-INV-' . uniqid(),
            'purchase_order_id' => $po->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $wh->id,
            'receipt_date' => date('Y-m-d'),
            'status' => 'posted',
            'inspection_status' => 'passed',
            'received_by' => $this->accountantA->id,
        ]);

        GoodsReceiptNoteItem::create([
            'tenant_id' => $this->tenantA->id,
            'goods_receipt_note_id' => $grn->id,
            'purchase_order_item_id' => $poItem->id,
            'inventory_item_id' => $inventoryItem->id,
            'delivered_quantity' => 500,
            'accepted_quantity' => 500,
            'rejected_quantity' => 0,
            'unit_cost' => 100,
        ]);

        // 1. Post Supplier Invoice (50,000 EGP) after a posted, inspected GRN.
        $invRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson('/api/v1/supplier-invoices', [
                'supplier_id' => $supplier->id,
                'purchase_order_id' => $po->id,
                'goods_receipt_note_id' => $grn->id,
                'invoice_number' => 'INV-SUP-9988',
                'invoice_date' => date('Y-m-d'),
                'due_date' => date('Y-m-d', strtotime('+30 days')),
                'subtotal' => 50000.0,
                'total_amount' => 50000.0,
                'matching_status' => 'matched',
            ]);
        $invRes->assertStatus(201);
        $invId = $invRes->json('supplier_invoice.id');

        // Post the invoice to update supplier balance
        $inv = SupplierInvoice::find($invId);
        $inv->is_posted = true;
        $inv->save();
        $supplier->current_balance = 50000.0;
        $supplier->save();

        // 2. Record Partial Payment (20,000 EGP)
        $payRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenAccountantA)
            ->postJson("/api/v1/suppliers/{$supplier->id}/payments", [
                'amount' => 20000.0,
                'payment_method' => 'bank_transfer',
                'voucher_date' => date('Y-m-d'),
                'supplier_invoice_id' => $invId,
                'notes' => 'سداد دفعة أولى تحويل بنكي CIB',
            ]);
        $payRes->assertStatus(201);
        $this->assertEquals(30000.0, (float)$payRes->json('supplier_current_balance'));

        // 3. Verify Supplier Statement Reconciliation
        $stmtRes = $this->withHeader('Authorization', 'Bearer ' . $this->tokenA)
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement");
        $stmtRes->assertStatus(200);

        $stmtRes->assertJsonPath('summary.total_invoiced', 50000);
        $stmtRes->assertJsonPath('summary.total_paid', 20000);
        $stmtRes->assertJsonPath('summary.closing_balance', 30000);
        $this->assertCount(2, $stmtRes->json('lines')); // 1 invoice + 1 payment
    }
}

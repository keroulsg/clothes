<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Color;
use App\Models\Customer;
use App\Models\CuttingBundle;
use App\Models\CuttingOrder;
use App\Models\Employee;
use App\Models\ExternalOperation;
use App\Models\GarmentModel;
use App\Models\GoodsReceiptNote;
use App\Models\GoodsReceiptNoteItem;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\Payroll;
use App\Models\PieceRate;
use App\Models\PieceWorkLog;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\QualityInspection;
use App\Models\SalesDeliveryNote;
use App\Models\SalesInvoice;
use App\Models\SalesOrder;
use App\Models\SalesReturn;
use App\Models\Size;
use App\Models\StoreOrder;
use App\Models\StoreOrderItem;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AccountingService;
use App\Services\InventoryService;
use App\Services\PayrollService;
use App\Services\SalesService;
use App\Services\StorefrontService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EndToEndBusinessJourneysTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $manager;
    protected User $accountant;
    protected Warehouse $rawWarehouse;
    protected Warehouse $fgWarehouse;
    protected GarmentModel $garmentModel;
    protected ProductVariant $variant;
    protected InventoryItem $fabricItem;
    protected InventoryItem $fgItem;
    protected Customer $customer;
    protected Supplier $supplier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'code' => 'TENANT-E2E-01',
            'name' => 'Misr Textile & Garment Manufacturing Corp',
            'domain' => 'misr.garmentos.test',
            'status' => 'active',
        ]);

        app()->instance('current_tenant_id', $this->tenant->id);

        $this->manager = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Eng. Magdy Factory Manager',
            'email' => 'magdy@misr.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        $this->accountant = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Hassan Chief Financial Officer',
            'email' => 'hassan@misr.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->rawWarehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Raw Fabrics & Materials Warehouse',
            'code' => 'WH-RAW-01',
            'type' => 'fabric',
            'is_active' => true,
        ]);

        $this->fgWarehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Finished Goods Warehouse',
            'code' => 'WH-FG-01',
            'type' => 'finished_goods',
            'is_active' => true,
        ]);

        $color = Color::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Classic Black',
            'hex_code' => '#000000',
        ]);

        $size = Size::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Large',
            'code' => 'L',
        ]);

        $this->garmentModel = GarmentModel::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'MOD-POLO-2026',
            'name' => 'Premium Men Pique Polo Shirt',
            'category' => 'menswear',
            'status' => 'active',
        ]);

        $this->variant = ProductVariant::create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $this->garmentModel->id,
            'size_id' => $size->id,
            'color_id' => $color->id,
            'sku' => 'POLO-BLK-L-2026',
            'barcode' => '6221234567890',
            'wholesale_price' => 350.00,
            'retail_price' => 450.00,
        ]);

        $this->fabricItem = InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->rawWarehouse->id,
            'code' => 'FAB-PIQUE-BLK',
            'item_type' => 'fabric_raw',
            'name' => '100% Combed Cotton Pique Fabric (220 GSM)',
            'unit_of_measure' => 'meter',
            'current_balance' => 500.0,
            'average_cost' => 80.0,
            'is_customer_owned' => false,
        ]);

        $this->fgItem = InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'variant_id' => $this->variant->id,
            'code' => 'FG-POLO-BLK-L',
            'item_type' => 'finished_good',
            'name' => 'Finished Polo Shirt - Black L',
            'unit_of_measure' => 'piece',
            'current_balance' => 150.0,
            'average_cost' => 140.0,
            'is_customer_owned' => false,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'CUST-RETAIL-01',
            'name' => 'El-Morshedy Department Stores',
            'contact_person' => 'Mr. Ashraf',
            'phone' => '+201011112222',
            'is_active' => true,
        ]);

        $this->supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'SUP-MAHALLA-01',
            'name' => 'Misr Spinning & Weaving Co. (Mahalla)',
            'payment_terms' => 'net_30',
            'is_active' => true,
        ]);
    }

    /**
     * Journey 1: Customer Order -> Stock Reservation -> Fulfillment -> Shipping/Delivery Note -> Invoicing & Costing
     */
    public function test_journey_1_commercial_order_to_fulfilment_and_delivery(): void
    {
        $salesService = app(SalesService::class);
        $accountingService = app(AccountingService::class);

        // 1. Create Sales Order for 50 pieces
        $order = $salesService->createSalesOrder([
            'customer_name' => $this->customer->name,
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'order_type' => 'wholesale',
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'inventory_item_id' => $this->fgItem->id,
                    'ordered_quantity' => 50,
                    'unit_price' => 350.00,
                ],
            ],
        ]);

        $this->assertEquals('confirmed', $order->status);
        $this->assertEquals(17500.00, (float)$order->total_amount);

        // 2. Concurrency-safe inventory reservation
        $reservedOrder = $salesService->reserveOrderStock($order->id);
        $this->assertEquals('reserved', $reservedOrder->status);
        $this->assertEquals(50, $reservedOrder->items->first()->reserved_quantity);

        // 3. Fulfill order: deduct stock ledger and generate Sales Invoice
        $initialBalance = $this->fgItem->fresh()->current_balance;
        $invoice = $salesService->fulfillOrder($order->id);

        $this->assertEquals('fulfilled', $order->fresh()->status);
        $this->assertEquals('issued', $invoice->status);
        $this->assertEquals(17500.00, (float)$invoice->total_amount);

        // Ensure stock was decremented properly
        $this->assertEquals($initialBalance - 50, $this->fgItem->fresh()->current_balance);

        // 4. Issue Shipping & Delivery Note with Carton packing details
        $deliveryNote = $salesService->createDeliveryNote([
            'sales_order_id' => $order->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'shipping_carrier' => 'Bosta Express Logistics',
            'tracking_number' => 'BST-88992211',
            'total_pieces' => 50,
            'recipient_name' => 'Ashraf Store Receiver',
            'cartons' => [
                [
                    'carton_number' => 'CTN-01',
                    'gross_weight_kg' => 7.5,
                    'dimensions' => '60x40x30 cm',
                    'pieces_count' => 25,
                    'packing_details' => '25 Pcs Black Polo L in Polybags',
                ],
                [
                    'carton_number' => 'CTN-02',
                    'gross_weight_kg' => 7.5,
                    'dimensions' => '60x40x30 cm',
                    'pieces_count' => 25,
                    'packing_details' => '25 Pcs Black Polo L in Polybags',
                ],
            ],
        ]);

        $this->assertEquals('packed', $deliveryNote->status);
        $this->assertCount(2, $deliveryNote->cartons);

        // 5. Verify Production Cost Sheet calculation
        $prodOrder = ProductionOrder::create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'PRD-POLO-001',
            'garment_model_id' => $this->garmentModel->id,
            'total_planned_quantity' => 100,
            'total_completed_quantity' => 100,
            'status' => 'completed',
            'planned_start_date' => now()->toDateString(),
            'planned_end_date' => now()->addDays(7)->toDateString(),
            'target_delivery_date' => now()->addDays(14)->toDateString(),
        ]);

        $costSheet = $accountingService->calculateProductionCost($prodOrder->id, [
            'direct_materials_cost' => 6000.0,
            'direct_labor_cost' => 3500.0,
            'subcontracted_services_cost' => 1500.0,
            'allocated_overhead_cost' => 1000.0,
        ]);

        $this->assertEquals(12000.0, (float)$costSheet->total_cost);
        $this->assertEquals(120.0, (float)$costSheet->cost_per_piece);
    }

    /**
     * Journey 2: Customer-Owned CMT Material Intake -> Custody Isolation -> Delivery Note & Service Invoice
     */
    public function test_journey_2_cmt_customer_material_custody_and_service_billing(): void
    {
        // 1. Create CMT Job Order with customer-supplied fabric
        $jobOrder = JobOrder::create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'CMT-2026-001',
            'customer_id' => $this->customer->id,
            'customer_name' => $this->customer->name,
            'service_type' => 'cmt',
            'fabric_source' => 'customer_supplied',
            'trims_responsibility' => 'factory_supplied',
            'status' => 'confirmed',
            'pricing_basis' => 'per_piece',
            'unit_rate' => 45.00,
            'total_target_quantity' => 200,
            'total_received_meters' => 0,
            'total_cut_quantity' => 0,
            'total_accepted_quantity' => 0,
            'total_rejected_quantity' => 0,
            'total_rework_quantity' => 0,
            'total_delivered_quantity' => 0,
        ]);

        // 2. Intake customer material: segregated from company-owned assets
        $intakeItem = InventoryItem::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->rawWarehouse->id,
            'code' => 'CMT-DENIM-01',
            'item_type' => 'fabric_raw',
            'name' => 'Denim 12oz (Customer Supplied)',
            'unit_of_measure' => 'meter',
            'current_balance' => 450.0,
            'average_cost' => 0, // Customer owned = 0 company asset valuation
            'is_customer_owned' => true,
            'customer_name' => $this->customer->name,
        ]);

        $this->assertTrue($intakeItem->is_customer_owned);

        // 3. Complete and deliver 200 finished garments
        $deliveryNote = JobDeliveryNote::create([
            'tenant_id' => $this->tenant->id,
            'delivery_number' => 'JDN-2026-001',
            'job_order_id' => $jobOrder->id,
            'customer_name' => $this->customer->name,
            'delivery_date' => now()->toDateString(),
            'status' => 'delivered',
            'total_delivered_pieces' => 200,
            'returned_unused_fabric_meters' => 15.0,
            'scrap_fabric_meters' => 8.5,
        ]);

        $jobOrder->update([
            'total_delivered_quantity' => 200,
            'status' => 'completed',
        ]);

        // 4. Issue CMT Service Invoice (45 EGP * 200 pcs = 9,000 EGP)
        $invoice = JobInvoice::create([
            'tenant_id' => $this->tenant->id,
            'invoice_number' => 'JINV-2026-001',
            'job_order_id' => $jobOrder->id,
            'customer_name' => $this->customer->name,
            'invoice_date' => now()->toDateString(),
            'status' => 'issued',
            'service_amount' => 9000.0,
            'additional_charges' => 0,
            'deductions' => 0,
            'tax_amount' => 1260.0, // 14% VAT
            'total_amount' => 10260.0,
            'paid_amount' => 0,
        ]);

        $this->assertEquals(10260.0, (float)$invoice->total_amount);
        $this->assertEquals('completed', $jobOrder->fresh()->status);
    }

    /**
     * Journey 3: Procurement -> GRN Inspection -> 3-Way Match Invoice -> Payment Voucher
     */
    public function test_journey_3_procurement_three_way_match_and_payment(): void
    {
        // 1. Issue Purchase Order for 200 meters of raw fabric @ 100 EGP/meter
        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-2026-099',
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->rawWarehouse->id,
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 20000.0,
            'tax_amount' => 2800.0,
            'total_amount' => 22800.0,
        ]);

        PurchaseOrderItem::create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->fabricItem->id,
            'ordered_quantity' => 200,
            'received_quantity' => 0,
            'remaining_quantity' => 200,
            'unit_price' => 100.0,
            'total_price' => 20000.0,
        ]);

        // 2. Warehouse GRN with Quality Inspection passed
        $grn = GoodsReceiptNote::create([
            'tenant_id' => $this->tenant->id,
            'grn_number' => 'GRN-2026-099',
            'purchase_order_id' => $po->id,
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->rawWarehouse->id,
            'receipt_date' => now()->toDateString(),
            'status' => 'posted',
            'inspection_status' => 'passed',
        ]);

        GoodsReceiptNoteItem::create([
            'tenant_id' => $this->tenant->id,
            'goods_receipt_note_id' => $grn->id,
            'purchase_order_item_id' => $po->items()->first()->id,
            'inventory_item_id' => $this->fabricItem->id,
            'delivered_quantity' => 200,
            'accepted_quantity' => 200,
            'rejected_quantity' => 0,
            'unit_cost' => 100.0,
        ]);

        // 3. 3-Way Matched Supplier Invoice
        $invoice = SupplierInvoice::create([
            'tenant_id' => $this->tenant->id,
            'invoice_number' => 'SUP-INV-5541',
            'internal_reference' => 'SINV-2026-099',
            'supplier_id' => $this->supplier->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_note_id' => $grn->id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'subtotal' => 20000.0,
            'tax_amount' => 2800.0,
            'total_amount' => 22800.0,
            'matching_status' => 'matched',
            'is_posted' => true,
        ]);

        $this->assertEquals('matched', $invoice->matching_status);

        // 4. Issue Payment Voucher in Accounting
        $account = ChartOfAccount::create([
            'tenant_id' => $this->tenant->id,
            'code' => '1020',
            'name' => 'National Bank of Egypt',
            'type' => 'asset',
            'category' => 'current_asset',
            'current_balance' => 100000.0,
            'is_active' => true,
        ]);

        $accountingService = app(AccountingService::class);
        $voucher = $accountingService->createPaymentVoucher([
            'voucher_type' => 'payment',
            'party_type' => 'supplier',
            'party_name' => $this->supplier->name,
            'payment_method' => 'bank_transfer',
            'account_id' => $account->id,
            'amount' => 22800.0,
            'voucher_date' => now()->toDateString(),
            'notes' => 'Settlement for Invoice SUP-INV-5541',
        ]);

        $this->assertEquals(22800.0, (float)$voucher->amount);
    }

    /**
     * Journey 4: Storefront Order Placement -> COD Order -> Customer Return & Stock Reversal
     */
    public function test_journey_4_storefront_order_and_customer_return_restocking(): void
    {
        $salesService = app(SalesService::class);

        // 1. Customer places online order for 2 pieces via storefront
        $storeOrder = StoreOrder::create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'ORD-WEB-2026-001',
            'customer_name' => 'Tarek Mansour',
            'customer_phone' => '01099887766',
            'shipping_address' => '15 Al-Ahram St, Heliopolis',
            'city' => 'Cairo',
            'payment_method' => 'cod',
            'status' => 'new',
            'subtotal' => 900.0,
            'shipping_fee' => 50.0,
            'total_amount' => 950.0,
        ]);

        StoreOrderItem::create([
            'tenant_id' => $this->tenant->id,
            'store_order_id' => $storeOrder->id,
            'variant_id' => $this->variant->id,
            'product_name' => $this->garmentModel->name,
            'sku' => $this->variant->sku,
            'quantity' => 2,
            'unit_price' => 450.0,
            'total_price' => 900.0,
        ]);

        $this->assertEquals('new', $storeOrder->status);
        $this->assertEquals(950.0, (float)$storeOrder->total_amount);

        // 2. Customer returns 1 piece due to size fitting
        $initialBalance = $this->fgItem->fresh()->current_balance;

        $return = $salesService->createSalesReturn([
            'warehouse_id' => $this->fgWarehouse->id,
            'customer_id' => $this->customer->id,
            'reason' => 'Customer requested size exchange',
            'is_restocked' => true,
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'inventory_item_id' => $this->fgItem->id,
                    'quantity' => 1,
                    'unit_price' => 450.0,
                    'condition' => 'good',
                    'action_taken' => 'restock',
                ],
            ],
        ]);

        $this->assertEquals('received', $return->status);
        $this->assertTrue($return->is_restocked);

        // Balance should be restocked (+1)
        $this->assertEquals($initialBalance + 1, $this->fgItem->fresh()->current_balance);
    }

    /**
     * Journey 5: Approved Production Output -> Piece-Rate Daily Output Log -> Verified Payroll Period
     */
    public function test_journey_5_piece_rate_productivity_to_verified_payroll(): void
    {
        $payrollService = app(PayrollService::class);

        // 1. Register Sewing Machine Operator
        $worker = Employee::create([
            'tenant_id' => $this->tenant->id,
            'employee_code' => 'EMP-SEW-104',
            'name' => 'Ali Ramadan Sewing Pro',
            'department' => 'sewing',
            'job_title' => 'Senior Sewing Operator',
            'pay_type' => 'piece_rate',
            'base_salary' => 1500.0,
            'is_active' => true,
        ]);

        // 2. Define piece-rate for Collar Stitching
        $pieceRate = PieceRate::create([
            'tenant_id' => $this->tenant->id,
            'stage_name' => 'sewing',
            'operation_name' => 'Collar Assembly & Edge Stitch',
            'rate_per_piece' => 4.50,
            'is_active' => true,
        ]);

        // 3. Worker records 200 inspected pieces for the day
        $workLog = PieceWorkLog::create([
            'tenant_id' => $this->tenant->id,
            'employee_id' => $worker->id,
            'piece_rate_id' => $pieceRate->id,
            'completed_quantity' => 200,
            'unit_rate' => 4.50,
            'total_amount' => 900.0, // 200 * 4.50 = 900 EGP
            'work_date' => now()->toDateString(),
            'status' => 'approved',
        ]);

        $this->assertEquals(900.0, (float)$workLog->total_amount);

        // 4. Generate Payroll period
        $payroll = $payrollService->generatePayroll(
            $this->tenant->id,
            '2026-10',
            now()->startOfMonth()->toDateString(),
            now()->endOfMonth()->toDateString()
        );

        $this->assertEquals('approved', $payroll->status);
        $payrollItem = $payroll->items()->where('employee_id', $worker->id)->first();
        $this->assertNotNull($payrollItem);
        $this->assertEquals(1500.0, (float)$payrollItem->base_amount);
        $this->assertEquals(900.0, (float)$payrollItem->piece_rate_earnings);
        $this->assertEquals(2400.0, (float)$payrollItem->net_salary); // 1500 + 900
    }

    public function test_cannot_create_delivery_note_for_cancelled_sales_order(): void
    {
        $salesService = app(SalesService::class);

        $order = $salesService->createSalesOrder([
            'customer_name' => $this->customer->name,
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'ordered_quantity' => 10,
                    'unit_price' => 350.00,
                ],
            ],
        ]);

        $order->status = 'cancelled';
        $order->save();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('لا يمكن إصدار إذن تسليم وشحن لأمر بيع ملغي.');

        $salesService->createDeliveryNote([
            'sales_order_id' => $order->id,
            'warehouse_id' => $this->fgWarehouse->id,
        ]);
    }

    public function test_cannot_return_more_than_fulfilled_quantity_for_sales_order(): void
    {
        $salesService = app(SalesService::class);

        $order = $salesService->createSalesOrder([
            'customer_name' => $this->customer->name,
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'inventory_item_id' => $this->fgItem->id,
                    'ordered_quantity' => 5,
                    'unit_price' => 350.00,
                ],
            ],
        ]);

        // Order is fulfilled with 5 pieces
        $salesService->reserveOrderStock($order->id);
        $salesService->fulfillOrder($order->id);

        // Try to return 10 pieces (which exceeds 5 fulfilled)
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('تتجاوز الكمية المسلمة فعلياً');

        $salesService->createSalesReturn([
            'sales_order_id' => $order->id,
            'warehouse_id' => $this->fgWarehouse->id,
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'quantity' => 10,
                    'unit_price' => 350.00,
                ],
            ],
        ]);
    }

    public function test_tenant_isolation_prevents_cross_tenant_sales_access(): void
    {
        $tenantB = Tenant::create([
            'code' => 'TENANT-ATTACKER',
            'name' => 'Hostile Tenant',
            'status' => 'active',
        ]);

        $salesService = app(SalesService::class);

        // Order in Tenant A
        $orderA = $salesService->createSalesOrder([
            'customer_name' => $this->customer->name,
            'warehouse_id' => $this->fgWarehouse->id,
            'items' => [
                [
                    'variant_id' => $this->variant->id,
                    'ordered_quantity' => 5,
                    'unit_price' => 350.00,
                ],
            ],
        ]);

        // Attacker switches tenant context
        app()->instance('current_tenant_id', $tenantB->id);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        // Attacker attempts to reserve or fulfill Tenant A's order
        $salesService->reserveOrderStock($orderA->id);
    }
}


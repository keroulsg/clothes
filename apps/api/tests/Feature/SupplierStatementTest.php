<?php

namespace Tests\Feature;

use App\Models\GoodsReceiptNote;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class SupplierStatementTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $ownerA;
    private User $ownerB;
    private Warehouse $warehouseA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'Al-Ahly Garments',
            'code' => 'AHLY',
            'slug' => 'ahly-' . Str::random(5),
            'subscription_tier' => 'pro',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Zamalek Fashion',
            'code' => 'ZAMALEK',
            'slug' => 'zamalek-' . Str::random(5),
            'subscription_tier' => 'starter',
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Sayed Owner',
            'email' => 'sayed-' . Str::random(5) . '@ahly.test',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Hassan Owner',
            'email' => 'hassan-' . Str::random(5) . '@zamalek.test',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-FAB-01',
            'name' => 'Main Fabric Store',
            'type' => 'fabric',
            'is_active' => true,
        ]);
    }

    public function test_supplier_statement_aggregates_pos_and_invoices_with_running_balance(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-COTTON-01',
            'name' => 'Mahalla Weaving & Spinning',
            'contact_person' => 'Eng. Taha',
            'phone' => '+201099887766',
            'payment_terms' => 'net_30',
            'current_balance' => 0,
            'is_active' => true,
        ]);

        // PO 1: 50,000 EGP
        $po1 = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-2026-001',
            'order_date' => '2026-10-01',
            'subtotal' => 43859.65,
            'tax_amount' => 6140.35,
            'total_amount' => 50000.00,
            'status' => 'approved',
        ]);

        // Invoice 1: 30,000 EGP (Unpaid)
        SupplierInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'purchase_order_id' => $po1->id,
            'invoice_number' => 'INV-SUP-101',
            'internal_reference' => 'REF-101',
            'invoice_date' => '2026-10-05',
            'due_date' => '2026-11-05',
            'subtotal' => 26315.79,
            'tax_amount' => 3684.21,
            'total_amount' => 30000.00,
            'paid_amount' => 0.00,
            'payment_status' => 'unpaid',
            'matching_status' => 'matched',
            'is_posted' => true,
        ]);

        // Invoice 2: 20,000 EGP (Paid 20,000)
        SupplierInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'purchase_order_id' => $po1->id,
            'invoice_number' => 'INV-SUP-102',
            'internal_reference' => 'REF-102',
            'invoice_date' => '2026-10-12',
            'due_date' => '2026-11-12',
            'subtotal' => 17543.86,
            'tax_amount' => 2456.14,
            'total_amount' => 20000.00,
            'paid_amount' => 20000.00,
            'payment_status' => 'paid',
            'matching_status' => 'matched',
            'is_posted' => true,
        ]);

        $res = $this->actingAs($this->ownerA, 'sanctum')
            ->getJson("/api/v1/suppliers/{$supplier->id}/statement");

        $res->assertOk()
            ->assertJsonStructure([
                'supplier',
                'summary' => ['total_pos_count', 'total_po_value', 'total_invoiced', 'total_paid', 'closing_balance'],
                'lines',
                'purchase_orders',
            ]);

        $this->assertEquals(1, $res->json('summary.total_pos_count'));
        $this->assertEquals(50000.00, $res->json('summary.total_po_value'));
        $this->assertEquals(50000.00, $res->json('summary.total_invoiced'));
        $this->assertEquals(20000.00, $res->json('summary.total_paid'));
        // Closing balance payable = 50000 - 20000 = 30000 EGP
        $this->assertEquals(30000.00, $res->json('summary.closing_balance'));
        $this->assertCount(2, $res->json('lines'));
    }

    public function test_supplier_statement_enforces_tenant_isolation(): void
    {
        $supplierA = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-A',
            'name' => 'Supplier A',
            'payment_terms' => 'cash',
            'is_active' => true,
        ]);

        $res = $this->actingAs($this->ownerB, 'sanctum')
            ->getJson("/api/v1/suppliers/{$supplierA->id}/statement");

        $res->assertNotFound();
    }
}

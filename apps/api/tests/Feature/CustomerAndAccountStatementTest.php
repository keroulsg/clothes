<?php

namespace Tests\Feature;

use App\Models\ChartOfAccount;
use App\Models\Customer;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\SalesInvoice;
use App\Models\SalesReturn;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomerAndAccountStatementTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $ownerA;
    private User $accountantA;
    private User $ownerB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'name' => 'El-Nour Textiles',
            'code' => 'ELNOUR',
            'slug' => 'elnour-' . Str::random(5),
            'subscription_tier' => 'pro',
            'is_active' => true,
        ]);

        $this->tenantB = Tenant::create([
            'name' => 'Delta Garments',
            'code' => 'DELTA',
            'slug' => 'delta-' . Str::random(5),
            'subscription_tier' => 'starter',
            'is_active' => true,
        ]);

        $this->ownerA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Hajj Ahmed',
            'email' => 'ahmed-' . Str::random(5) . '@elnour.test',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->accountantA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Mahmoud Accountant',
            'email' => 'mahmoud-' . Str::random(5) . '@elnour.test',
            'password' => bcrypt('password123'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->ownerB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Moustafa Delta',
            'email' => 'moustafa-' . Str::random(5) . '@delta.test',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    public function test_account_statement_returns_chronological_lines_and_running_balance(): void
    {
        $cashAcc = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1010',
            'name' => 'Main Cash Treasury',
            'type' => 'asset',
            'category' => 'current_assets',
            'current_balance' => 5000,
            'is_active' => true,
        ]);

        $entry1 = JournalEntry::create([
            'tenant_id' => $this->tenantA->id,
            'entry_number' => 'JV-2026-0001',
            'entry_date' => '2026-10-01',
            'description' => 'Initial Cash Deposit',
            'total_debit' => 5000,
            'total_credit' => 5000,
            'status' => 'posted',
        ]);

        JournalEntryLine::create([
            'tenant_id' => $this->tenantA->id,
            'journal_entry_id' => $entry1->id,
            'account_id' => $cashAcc->id,
            'description' => 'Cash received',
            'debit' => 5000,
            'credit' => 0,
        ]);

        $entry2 = JournalEntry::create([
            'tenant_id' => $this->tenantA->id,
            'entry_number' => 'JV-2026-0002',
            'entry_date' => '2026-10-05',
            'description' => 'Factory Petty Cash Expense',
            'total_debit' => 1200,
            'total_credit' => 1200,
            'status' => 'posted',
        ]);

        JournalEntryLine::create([
            'tenant_id' => $this->tenantA->id,
            'journal_entry_id' => $entry2->id,
            'account_id' => $cashAcc->id,
            'description' => 'Disbursement for needles and supplies',
            'debit' => 0,
            'credit' => 1200,
        ]);

        $res = $this->actingAs($this->accountantA, 'sanctum')
            ->getJson("/api/v1/accounting/accounts/{$cashAcc->id}/statement");

        $res->assertOk()
            ->assertJsonStructure([
                'account' => ['id', 'code', 'name', 'type'],
                'summary' => ['total_debit', 'total_credit', 'closing_balance', 'total_transactions'],
                'lines',
            ]);

        $this->assertEquals(5000, $res->json('summary.total_debit'));
        $this->assertEquals(1200, $res->json('summary.total_credit'));
        $this->assertEquals(3800, $res->json('summary.closing_balance'));
        $this->assertCount(2, $res->json('lines'));
        $this->assertEquals(5000, $res->json('lines.0.running_balance'));
        $this->assertEquals(3800, $res->json('lines.1.running_balance'));
    }

    public function test_account_statement_enforces_tenant_isolation(): void
    {
        $cashAccA = ChartOfAccount::create([
            'tenant_id' => $this->tenantA->id,
            'code' => '1010-A',
            'name' => 'Cash Treasury A',
            'type' => 'asset',
            'category' => 'current_assets',
            'current_balance' => 1000,
            'is_active' => true,
        ]);

        // Tenant B cannot view Tenant A account statement
        $res = $this->actingAs($this->ownerB, 'sanctum')
            ->getJson("/api/v1/accounting/accounts/{$cashAccA->id}/statement");

        $res->assertNotFound();
    }

    public function test_customer_creation_and_unique_code_per_tenant(): void
    {
        $res = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/customers', [
                'code' => 'CUST-001',
                'name' => 'Babies World Stores',
                'contact_person' => 'Mohamed Tarek',
                'phone' => '+201012345678',
                'email' => 'tarek@babiesworld.com',
                'tax_id' => '987-654-321',
            ]);

        $res->assertCreated()
            ->assertJsonPath('customer.code', 'CUST-001')
            ->assertJsonPath('customer.name', 'Babies World Stores');

        // Retrying same code in same tenant fails with 422
        $dup = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson('/api/v1/customers', [
                'code' => 'CUST-001',
                'name' => 'Duplicate Attempt',
            ]);

        $dup->assertStatus(422)
            ->assertJsonValidationErrors(['code']);

        // Same code in Tenant B succeeds (tenant isolated uniqueness)
        $resB = $this->actingAs($this->ownerB, 'sanctum')
            ->postJson('/api/v1/customers', [
                'code' => 'CUST-001',
                'name' => 'Delta Branch Customer',
            ]);

        $resB->assertCreated();
    }

    public function test_customer_statement_aggregates_invoices_payments_and_returns(): void
    {
        $cust = Customer::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-STATEMENT',
            'name' => 'Wholesale Boutique Cairo',
            'is_active' => true,
        ]);

        // Invoice 1: 15,000 EGP (Unpaid)
        SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $cust->id,
            'customer_name' => $cust->name,
            'invoice_number' => 'INV-2026-001',
            'invoice_date' => '2026-10-10',
            'subtotal' => 13157.89,
            'tax_amount' => 1842.11,
            'total_amount' => 15000.00,
            'payment_status' => 'unpaid',
            'status' => 'issued',
        ]);

        // Invoice 2: 8,000 EGP (Paid)
        SalesInvoice::create([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $cust->id,
            'customer_name' => $cust->name,
            'invoice_number' => 'INV-2026-002',
            'invoice_date' => '2026-10-15',
            'subtotal' => 7017.54,
            'tax_amount' => 982.46,
            'total_amount' => 8000.00,
            'paid_amount' => 8000.00,
            'balance_due' => 0.00,
            'payment_status' => 'paid',
            'status' => 'paid',
        ]);

        // Sales Return: 2,500 EGP approved
        $wh = \App\Models\Warehouse::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'WH-RET-01',
            'name' => 'Returns Warehouse',
            'type' => 'returns',
            'is_active' => true,
        ]);

        SalesReturn::create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $wh->id,
            'customer_id' => $cust->id,
            'return_number' => 'RET-2026-001',
            'return_date' => '2026-10-18',
            'reason' => 'Defective zipper',
            'total_amount' => 2500.00,
            'status' => 'received',
        ]);

        // Request statement
        $res = $this->actingAs($this->ownerA, 'sanctum')
            ->getJson("/api/v1/customers/{$cust->id}/statement");

        $res->assertOk()
            ->assertJsonStructure([
                'customer',
                'summary' => ['total_invoiced', 'total_paid', 'total_refunded', 'closing_balance'],
                'lines',
            ]);

        $this->assertEquals(23000.00, $res->json('summary.total_invoiced'));
        $this->assertEquals(8000.00, $res->json('summary.total_paid'));
        $this->assertEquals(2500.00, $res->json('summary.total_refunded'));
        // Closing balance = 23000 - 8000 - 2500 = 12500 EGP
        $this->assertEquals(12500.00, $res->json('summary.closing_balance'));
        $this->assertCount(3, $res->json('lines'));
    }
}

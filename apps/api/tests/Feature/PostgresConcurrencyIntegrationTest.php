<?php

namespace Tests\Feature;

use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProcessedWebhookEvent;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\SubscriptionPaymentOrder;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Genuine Multi-Process Concurrency Integration Test on PostgreSQL
 *
 * This test suite spawns separate operating system worker processes using `proc_open`
 * to establish genuinely concurrent, independent database connections against PostgreSQL.
 *
 * It proves that under real concurrent requests:
 * 1. Only ONE stock mutation is committed and the concurrent duplicate replays cleanly.
 * 2. Conflicting payloads under concurrency return a deterministic 409 IdempotencyConflict.
 * 3. Concurrent GRN creations do not double-decrement PO quantities.
 * 4. Concurrent supplier invoices do not duplicate financial postings.
 * 5. Concurrent duplicate webhooks do not duplicate subscription activations.
 */
class PostgresConcurrencyIntegrationTest extends TestCase
{
    private Tenant $tenant;
    private Warehouse $warehouse;
    private InventoryItem $item;
    private ?string $tempDir = null;
    private static ?bool $hasPostgres = null;

    private function isPostgresAvailable(): bool
    {
        if (self::$hasPostgres !== null) {
            return self::$hasPostgres;
        }

        try {
            $host = env('PGSQL_HOST', config('database.connections.pgsql.host', '127.0.0.1'));
            $port = (int) env('PGSQL_PORT', config('database.connections.pgsql.port', 5432));
            $conn = @fsockopen($host, $port, $errno, $errstr, 0.5);
            if (is_resource($conn)) {
                fclose($conn);
                self::$hasPostgres = true;
                return true;
            }
        } catch (\Throwable) {
        }

        self::$hasPostgres = false;
        return false;
    }

    protected function setUp(): void
    {
        parent::setUp();

        if (!$this->isPostgresAvailable()) {
            if (env('REQUIRE_POSTGRES_CONCURRENCY_TESTS') === 'true' || env('REQUIRE_POSTGRES_TESTS') === 'true') {
                $this->fail('PostgreSQL integration test environment is required (REQUIRE_POSTGRES_CONCURRENCY_TESTS=true), but PostgreSQL is unreachable on 127.0.0.1:5432.');
            }
            $this->markTestSkipped('PostgreSQL is not reachable on 127.0.0.1:5432. Genuine multi-process concurrency tests require a running PostgreSQL instance (executed in CI environment).');
        }

        config(['database.default' => 'pgsql']);
        DB::purge('pgsql');

        $this->tempDir = sys_get_temp_dir() . '/garmentos_pg_concurrency_' . uniqid();
        if (!is_dir($this->tempDir)) {
            mkdir($this->tempDir, 0777, true);
        }

        $this->cleanDatabase();

        $this->tenant = Tenant::create([
            'code' => 'TEN-CONC-PROCS',
            'name' => 'شركة النسيج المتزامن',
            'subdomain' => 'concurrent-textiles',
            'status' => 'active',
        ]);

        $this->warehouse = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مخزن التزامن الفعلي',
            'code' => 'WH-CONC-P1',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->item = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-CONC-001',
            'name' => 'قماش غزل تركي متزامن',
            'unit_of_measure' => 'm',
            'current_balance' => 100.0,
            'average_cost' => 50.0,
        ]);

        app()->instance('current_tenant_id', $this->tenant->id);
    }

    protected function tearDown(): void
    {
        if ($this->isPostgresAvailable()) {
            $this->cleanDatabase();
        }

        if (is_dir($this->tempDir)) {
            $files = glob($this->tempDir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
            rmdir($this->tempDir);
        }

        parent::tearDown();
    }

    private function cleanDatabase(): void
    {
        try {
            DB::table('audit_logs')->delete();
            DB::table('processed_webhook_events')->delete();
            DB::table('subscription_payment_orders')->delete();
            DB::table('supplier_invoices')->delete();
            DB::table('goods_receipt_note_items')->delete();
            DB::table('goods_receipt_notes')->delete();
            DB::table('purchase_order_items')->delete();
            DB::table('purchase_orders')->delete();
            DB::table('suppliers')->delete();
            DB::table('inventory_transactions')->delete();
            DB::table('inventory_items')->delete();
            DB::table('warehouses')->delete();
            DB::table('tenants')->delete();
        } catch (\Throwable) {
        }
    }

    private function runTwoConcurrentWorkers(
        string $action,
        array $payload1,
        array $payload2,
        array $headers1 = [],
        array $headers2 = []
    ): array {
        $outFile1 = $this->tempDir . '/worker1_' . uniqid() . '.json';
        $outFile2 = $this->tempDir . '/worker2_' . uniqid() . '.json';

        $cmd1 = $this->buildWorkerCommand($action, $payload1, $outFile1, $headers1, 0);
        $cmd2 = $this->buildWorkerCommand($action, $payload2, $outFile2, $headers2, 5);

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $proc1 = proc_open($cmd1, $descriptors, $pipes1, base_path());
        $proc2 = proc_open($cmd2, $descriptors, $pipes2, base_path());

        if (is_resource($proc1)) {
            fclose($pipes1[0]);
        }
        if (is_resource($proc2)) {
            fclose($pipes2[0]);
        }

        $err1 = is_resource($proc1) ? stream_get_contents($pipes1[2]) : '';
        $err2 = is_resource($proc2) ? stream_get_contents($pipes2[2]) : '';

        if (is_resource($proc1)) {
            fclose($pipes1[1]);
            fclose($pipes1[2]);
            proc_close($proc1);
        }

        if (is_resource($proc2)) {
            fclose($pipes2[1]);
            fclose($pipes2[2]);
            proc_close($proc2);
        }

        $res1 = file_exists($outFile1) ? json_decode(file_get_contents($outFile1), true) : ['status' => 500, 'error' => 'NoOutput', 'stderr' => $err1];
        $res2 = file_exists($outFile2) ? json_decode(file_get_contents($outFile2), true) : ['status' => 500, 'error' => 'NoOutput', 'stderr' => $err2];

        return [$res1, $res2];
    }

    private function buildWorkerCommand(
        string $action,
        array $payload,
        string $outFile,
        array $headers = [],
        int $sleepMs = 0
    ): string {
        $phpBin = PHP_BINARY;
        $artisan = base_path('artisan');
        $payloadArg = escapeshellarg(json_encode($payload));
        $tenantArg = escapeshellarg($this->tenant->id);
        $outArg = escapeshellarg($outFile);
        $headersArg = escapeshellarg(json_encode($headers));

        return "\"{$phpBin}\" \"{$artisan}\" test:run-concurrent-worker --action={$action} --payload={$payloadArg} --tenant-id={$tenantArg} --output-file={$outArg} --headers={$headersArg} --sleep-ms={$sleepMs} --db-connection=pgsql --env=testing";
    }

    /**
     * 1. فحص التزامن الحقيقي: عمليتان متزامنتان بمفتاح عدم تكرار متطابق -> عملية واحدة فقط تُنشأ، والأخرى Replay
     */
    public function test_concurrent_inventory_transactions_with_identical_key_commits_once(): void
    {
        $idempKey = 'RACE-IDEMP-IDENTICAL-' . uniqid();

        $payload = [
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50.0,
            'unit_cost' => 50.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-CONC-100',
            'idempotency_key' => $idempKey,
        ];

        [$res1, $res2] = $this->runTwoConcurrentWorkers('inventory', $payload, $payload);

        $statuses = [
            $res1['status'] ?? null,
            $res2['status'] ?? null,
        ];

        $this->assertContains(201, $statuses, 'يجب أن تنجح إحدى العمليتين في إنشاء القيد المخزني.');
        $this->assertContains(200, $statuses, 'يجب أن تسترجع العملية المتزامنة الأخرى نفس القيد.');

        $txCount = InventoryTransaction::where('tenant_id', $this->tenant->id)
            ->where('idempotency_key', $idempKey)
            ->count();
        $this->assertEquals(1, $txCount, 'يجب ألا يُدرج في قاعدة البيانات سوى قيد مخزني واحد فقط.');
        $this->assertEquals(150.0, (float)$this->item->fresh()->current_balance);
    }

    /**
     * 2. فحص التزامن الحقيقي: عمليتان متزامنتان بنفس المفتاح ولكن بحمولات متضاربة -> تعود 409 وتتراجع المعاملة بالكامل
     */
    public function test_concurrent_inventory_transactions_with_conflicting_payload_returns_409(): void
    {
        $idempKey = 'RACE-IDEMP-CONFLICT-' . uniqid();

        $payload1 = [
            'tenant_id' => $this->tenant->id,
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 30.0,
            'unit_cost' => 50.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-WINNER-01',
            'idempotency_key' => $idempKey,
        ];

        $payload2 = $payload1;
        $payload2['quantity'] = 99.0;
        $payload2['reference_number'] = 'PO-LOSER-CONFLICT';

        [$res1, $res2] = $this->runTwoConcurrentWorkers('inventory', $payload1, $payload2);

        $statuses = [
            $res1['status'] ?? null,
            $res2['status'] ?? null,
        ];

        $this->assertContains(201, $statuses, 'يجب أن تنجح المعاملة الفائزة أولاً.');
        $this->assertContains(409, $statuses, 'يجب أن تُرفض المعاملة المتزامنة المتضاربة برمز 409 IdempotencyConflict.');

        $this->assertEquals(130.0, (float)$this->item->fresh()->current_balance);
        $this->assertEquals(1, InventoryTransaction::where('tenant_id', $this->tenant->id)->where('idempotency_key', $idempKey)->count());
    }

    /**
     * 3. فحص التزامن الحقيقي: استلام خامات متزامن (GRN Concurrency) مع حماية الكميات المتبقية في أمر الشراء
     */
    public function test_concurrent_grn_creation_prevents_duplicate_material_receipts(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'SUP-CONC-01',
            'name' => 'شركة النسيج المتحد',
            'is_active' => true,
        ]);

        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-CONC-GRN-' . uniqid(),
            'order_date' => date('Y-m-d'),
            'subtotal' => 2000.0,
            'tax_amount' => 280.0,
            'total_amount' => 2280.0,
            'status' => 'approved',
        ]);

        $poItem = PurchaseOrderItem::create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->item->id,
            'ordered_quantity' => 100.0,
            'unit_price' => 20.0,
            'total_price' => 2000.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 100.0,
        ]);

        $grnKey = 'GRN-CONC-KEY-' . uniqid();

        $grnPayload1 = [
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouse->id,
            'inspection_status' => 'passed',
            'idempotency_key' => $grnKey,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 40.0,
                    'accepted_quantity' => 40.0,
                    'rejected_quantity' => 0.0,
                ],
            ],
        ];

        $grnPayload2 = $grnPayload1;
        $grnPayload2['items'][0]['accepted_quantity'] = 30.0;

        [$res1, $res2] = $this->runTwoConcurrentWorkers('grn', $grnPayload1, $grnPayload2);

        $statuses = [$res1['status'] ?? null, $res2['status'] ?? null];
        $this->assertContains(201, $statuses);
        $this->assertContains(409, $statuses);

        $this->assertEquals(1, GoodsReceiptNote::where('tenant_id', $this->tenant->id)->where('idempotency_key', $grnKey)->count());
        $this->assertEquals(40.0, (float)$poItem->fresh()->received_quantity);
        $this->assertEquals(60.0, (float)$poItem->fresh()->remaining_quantity);
    }

    /**
     * 4. فحص التزامن الحقيقي: فواتير الموردين المتزامنة تمنع مضاعفة الالتزام المالي
     */
    public function test_concurrent_supplier_invoices_prevent_duplicate_financial_postings(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'SUP-FIN-CONC-' . uniqid(),
            'name' => 'مورد الغزل المتزامن',
            'current_balance' => 0.0,
            'is_active' => true,
        ]);

        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-FIN-CONC-' . uniqid(),
            'order_date' => date('Y-m-d'),
            'subtotal' => 10000.0,
            'tax_amount' => 1400.0,
            'total_amount' => 11400.0,
            'status' => 'approved',
        ]);

        $invKey = 'INV-CONC-KEY-' . uniqid();
        $invoiceNum = 'INV-CONC-NUM-' . uniqid();

        $invPayload1 = [
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'invoice_number' => $invoiceNum,
            'subtotal' => 10000.0,
            'tax_amount' => 1400.0,
            'idempotency_key' => $invKey,
        ];

        $invPayload2 = $invPayload1;
        $invPayload2['subtotal'] = 7000.0;

        [$res1, $res2] = $this->runTwoConcurrentWorkers('invoice', $invPayload1, $invPayload2);

        $statuses = [$res1['status'] ?? null, $res2['status'] ?? null];
        $this->assertContains(201, $statuses);
        $this->assertContains(409, $statuses);

        $this->assertEquals(1, SupplierInvoice::where('tenant_id', $this->tenant->id)->where('idempotency_key', $invKey)->count());
        $this->assertEquals(11400.0, (float)$supplier->fresh()->current_balance);
    }

    /**
     * 5. فحص التزامن الحقيقي: إشعارين Webhook متزامنين بنفس event_id -> تفعيل واحد فقط و 200 Replay
     */
    public function test_concurrent_payment_webhooks_prevent_duplicate_subscription_activation(): void
    {
        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $this->tenant->id,
            'order_reference' => 'ORD-CONC-WEBHOOK-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $webhookSecret = config('services.payment.webhook_secret');
        $ts = time();
        $eventId = 'EVT-CONC-PAY-' . uniqid();

        $payload = [
            'event' => 'payment.completed',
            'event_id' => $eventId,
            'tenant_id' => $this->tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'plan_tier' => 'professional',
            'timestamp' => $ts,
        ];

        $payloadJson = json_encode($payload);
        $sig = hash_hmac('sha256', "{$ts}.{$payloadJson}", $webhookSecret);

        $headers = [
            'X-Signature' => $sig,
            'X-Signature-Timestamp' => (string)$ts,
        ];

        [$res1, $res2] = $this->runTwoConcurrentWorkers('webhook', $payload, $payload, $headers, $headers);

        $this->assertEquals(200, $res1['status'] ?? null);
        $this->assertEquals(200, $res2['status'] ?? null);

        $this->assertEquals(1, ProcessedWebhookEvent::where('event_id', $eventId)->count());

        $auditCount = DB::table('audit_logs')
            ->where('tenant_id', $this->tenant->id)
            ->where('action', 'subscription_activated_via_webhook')
            ->count();
        $this->assertEquals(1, $auditCount, 'يجب ألا يتم تسجيل سوى عملية تفعيل واحدة في سجل الرقابة والتدقيق.');
    }
}

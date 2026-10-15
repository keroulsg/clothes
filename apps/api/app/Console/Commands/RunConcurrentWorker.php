<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\SubscriptionWebhookController;
use App\Services\InventoryService;
use App\Services\ProcurementService;
use Illuminate\Console\Command;
use Illuminate\Http\Request;

class RunConcurrentWorker extends Command
{
    protected $signature = 'test:run-concurrent-worker 
                            {--action= : Action to execute: inventory, grn, invoice, webhook}
                            {--payload= : JSON string of data}
                            {--tenant-id= : Tenant UUID}
                            {--output-file= : Path to output JSON result}
                            {--headers= : JSON string of HTTP headers for webhook}
                            {--sleep-ms=0 : Delay before execution in milliseconds}
                            {--db-connection= : Database connection to use (pgsql or sqlite)}
                            {--database-path= : SQLite database path if using file database}';

    protected $description = 'Worker command to execute transactional ERP operations in separate processes for genuine concurrency tests';

    public function handle(): int
    {
        $action = $this->option('action');
        $payloadRaw = $this->option('payload');
        $tenantId = $this->option('tenant-id');
        $outputFile = $this->option('output-file');
        $headersRaw = $this->option('headers');
        $dbConnection = $this->option('db-connection');
        $databasePath = $this->option('database-path');
        $sleepMs = (int) $this->option('sleep-ms');

        if ($dbConnection === 'pgsql') {
            config(['database.default' => 'pgsql']);
            \Illuminate\Support\Facades\DB::purge('pgsql');
        } elseif ($databasePath) {
            config(['database.default' => 'sqlite']);
            config(['database.connections.sqlite.database' => $databasePath]);
            \Illuminate\Support\Facades\DB::purge('sqlite');
        }

        if ($sleepMs > 0) {
            usleep($sleepMs * 1000);
        }

        if ($tenantId) {
            app()->instance('current_tenant_id', $tenantId);
        }

        $payload = json_decode($payloadRaw, true) ?? [];
        $headers = json_decode($headersRaw, true) ?? [];

        $result = [];

        try {
            switch ($action) {
                case 'inventory':
                    $service = app(InventoryService::class);
                    $tx = $service->recordTransaction($payload);
                    $result = [
                        'status' => $tx->wasRecentlyCreated ? 201 : 200,
                        'is_duplicate' => !$tx->wasRecentlyCreated,
                        'id' => $tx->id,
                        'quantity' => (float)$tx->quantity,
                        'balance_after' => (float)$tx->balance_after,
                    ];
                    break;

                case 'grn':
                    $service = app(ProcurementService::class);
                    $grn = $service->receiveGoods($payload);
                    $result = [
                        'status' => $grn->wasRecentlyCreated ? 201 : 200,
                        'is_duplicate' => !$grn->wasRecentlyCreated,
                        'id' => $grn->id,
                    ];
                    break;

                case 'invoice':
                    $service = app(ProcurementService::class);
                    $inv = $service->matchAndCreateInvoice($payload);
                    $result = [
                        'status' => $inv->wasRecentlyCreated ? 201 : 200,
                        'is_duplicate' => !$inv->wasRecentlyCreated,
                        'id' => $inv->id,
                        'total_amount' => (float)$inv->total_amount,
                    ];
                    break;

                case 'webhook':
                    $request = Request::create(
                        '/api/v1/subscriptions/webhook',
                        'POST',
                        [],
                        [],
                        [],
                        $this->buildServerHeaders($headers),
                        $payloadRaw
                    );
                    $controller = app(SubscriptionWebhookController::class);
                    $response = $controller->handleWebhook($request);
                    $result = [
                        'status' => $response->getStatusCode(),
                        'data' => $response->getData(true),
                    ];
                    break;

                default:
                    $result = [
                        'status' => 400,
                        'error' => 'InvalidAction',
                        'message' => "Unknown action: {$action}",
                    ];
            }
        } catch (\InvalidArgumentException $e) {
            $isConflict = str_contains($e->getMessage(), 'Idempotency') || str_contains($e->getMessage(), 'تعارض في فاتورة المورد');
            $result = [
                'status' => $isConflict ? 409 : 422,
                'error' => $isConflict ? 'IdempotencyConflict' : 'InvalidArgument',
                'message' => $e->getMessage(),
            ];
        } catch (\Throwable $e) {
            $result = [
                'status' => 500,
                'error' => get_class($e),
                'message' => $e->getMessage(),
            ];
        }

        if ($outputFile) {
            file_put_contents($outputFile, json_encode($result, JSON_UNESCAPED_UNICODE));
        }

        $this->output->write(json_encode($result, JSON_UNESCAPED_UNICODE));
        return 0;
    }

    private function buildServerHeaders(array $headers): array
    {
        $server = ['CONTENT_TYPE' => 'application/json'];
        foreach ($headers as $key => $val) {
            $headerKey = 'HTTP_' . strtoupper(str_replace('-', '_', $key));
            $server[$headerKey] = $val;
        }
        return $server;
    }
}

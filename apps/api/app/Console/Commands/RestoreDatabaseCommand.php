<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RestoreDatabaseCommand extends Command
{
    protected $signature = 'garmentos:restore 
                            {target? : Backup ID or path to dump file}
                            {--target-db= : Isolated database name or path for temporary test restoration}
                            {--password= : Passphrase if backup is encrypted}
                            {--verify-only : Validate checksum and manifest without performing database restore}
                            {--force : Force execution without interactive confirmation}';

    protected $description = 'Safely restore and verify a GarmentOS backup into an isolated target database';

    public function handle(): int
    {
        $backupDir = storage_path('app/private/backups/database');
        $target = $this->argument('target');

        // Locate manifest and dump file
        if (!$target) {
            $manifests = glob("{$backupDir}/*.manifest.json");
            if (empty($manifests)) {
                $this->error("No backups found in {$backupDir}");
                return Command::FAILURE;
            }
            rsort($manifests);
            $manifestPath = $manifests[0];
        } elseif (file_exists($target) && str_ends_with($target, '.manifest.json')) {
            $manifestPath = $target;
        } elseif (file_exists($target)) {
            $manifestPath = dirname($target) . '/' . preg_replace('/\.(sql\.gz|sql|sqlite)(\.enc)?$/', '', basename($target)) . '.manifest.json';
        } else {
            $manifestPath = "{$backupDir}/{$target}.manifest.json";
        }

        if (!file_exists($manifestPath)) {
            $this->error("Manifest not found: {$manifestPath}");
            return Command::FAILURE;
        }

        $manifestContents = file_get_contents($manifestPath);
        $manifest = $manifestContents === false ? null : json_decode($manifestContents, true);
        if (
            !is_array($manifest)
            || !isset($manifest['backup_id'], $manifest['dump_file'], $manifest['sha256'], $manifest['database_driver'], $manifest['file_size_bytes'])
            || !is_string($manifest['backup_id'])
            || !is_string($manifest['dump_file'])
            || basename($manifest['dump_file']) !== $manifest['dump_file']
            || !is_string($manifest['sha256'])
            || !preg_match('/^[a-f0-9]{64}$/i', $manifest['sha256'])
            || !is_int($manifest['file_size_bytes'])
            || $manifest['file_size_bytes'] <= 0
            || !in_array($manifest['database_driver'], ['sqlite', 'pgsql', 'mysql'], true)
        ) {
            $this->error('Invalid or unsafe backup manifest; refusing restore.');
            return Command::FAILURE;
        }

        $dumpPath = dirname($manifestPath) . DIRECTORY_SEPARATOR . $manifest['dump_file'];

        if (!file_exists($dumpPath) || !is_file($dumpPath)) {
            $this->error("Dump file not found: {$dumpPath}");
            return Command::FAILURE;
        }

        $this->info("==> [DISASTER RECOVERY] Validating Backup: {$manifest['backup_id']}");

        // Step 1: Pre-restore Checksum Verification
        $actualSize = filesize($dumpPath);
        if ($actualSize === false || $actualSize !== $manifest['file_size_bytes']) {
            $this->error('CRITICAL: Backup file size does not match its manifest.');
            return Command::FAILURE;
        }
        $actualSha = hash_file('sha256', $dumpPath);
        if (!is_string($actualSha) || !hash_equals($manifest['sha256'], $actualSha)) {
            $this->error("CRITICAL: Checksum verification failed before restore!");
            return Command::FAILURE;
        }
        $this->info("✓ Pre-restore SHA-256 Checksum verified: {$actualSha}");

        if ($this->option('verify-only')) {
            $this->info("✓ Validation complete (--verify-only specified).");
            return Command::SUCCESS;
        }

        // Step 2: Safety Guard - Determine Isolated Target Database
        $driver = $manifest['database_driver'];
        $defaultIsolatedTarget = in_array($driver, ['pgsql', 'mysql'], true)
            ? 'garmentos_restore_test_' . time()
            : storage_path('app/private/backups/restore_test_' . time() . '.sqlite');

        $targetDb = $this->option('target-db') ?: $defaultIsolatedTarget;

        // Hard safety boundary: --force must NEVER permit overwriting the active database.
        // A restore is only allowed into a separately named/path-isolated target.
        $currentDb = config("database.connections.{$driver}.database");
        $sameRestoreTarget = $driver === 'mysql'
            ? (is_string($targetDb) && is_string($currentDb) && strcasecmp($targetDb, $currentDb) === 0)
            : $targetDb === $currentDb;
        if ($driver === 'mysql' && (!is_string($targetDb) || !preg_match('/\\A[a-zA-Z0-9_]+\\z/', $targetDb) || in_array(strtolower($targetDb), ['mysql', 'sys', 'performance_schema', 'information_schema'], true))) {
            $this->error('Invalid MySQL restore target. Use a new isolated database name containing only letters, numbers, and underscores.');
            return Command::FAILURE;
        }
        if ($driver === 'sqlite' && is_string($currentDb) && $currentDb !== ':memory:' && file_exists($targetDb) && file_exists($currentDb)) {
            $sameRestoreTarget = realpath($targetDb) !== false && realpath($targetDb) === realpath($currentDb);
        }
        if ($sameRestoreTarget) {
            $this->error("CRITICAL SAFETY BLOCK: Restore target matches the active database [{$currentDb}]. Choose a separate isolated target; --force cannot bypass this protection.");
            return Command::FAILURE;
        }

        $this->warn("==> Restoring into isolated target: {$targetDb}");
        Log::info("Starting disaster recovery restore for backup {$manifest['backup_id']} into {$targetDb}");

        try {
            $workingDump = $dumpPath;

            // Decrypt if necessary
            if (!empty($manifest['is_encrypted'])) {
                $passphrase = $this->option('password') ?: config('app.key');
                $decryptedPart = storage_path('app/private/backups/tmp_decrypted_' . uniqid() . '.dump');
                $this->comment("Decrypting dump for restoration...");
                $this->decryptFile($dumpPath, $decryptedPart, $passphrase);
                $workingDump = $decryptedPart;
            }

            // Perform restoration
            if ($driver === 'sqlite') {
                $this->restoreSqlite($workingDump, $targetDb);
            } elseif ($driver === 'pgsql') {
                $this->restorePostgres($workingDump, $targetDb);
            } elseif ($driver === 'mysql') {
                $this->restoreMysql($workingDump, $targetDb);
            }

            if (isset($decryptedPart) && file_exists($decryptedPart)) {
                @unlink($decryptedPart);
            }

            $this->info("✓ Database restoration completed into target: {$targetDb}");

            // Step 3: Post-Restore Data Integrity Verification
            $this->info("==> Running Post-Restore Integrity Verification...");
            $verificationReport = $this->verifyRestoredDatabase($driver, $targetDb, $manifest);

            $this->info("✓ Migration Status: {$verificationReport['migration_count']} migrations applied");
            $this->info("✓ Tenant Count:     {$verificationReport['tenant_count']} verified");
            $this->info("✓ Sales Orders:     {$verificationReport['sales_orders_count']} verified");
            $this->info("✓ Journal Entries:  {$verificationReport['journal_entries_count']} verified");

            if ($verificationReport['integrity_passed']) {
                $this->info("✓ DISASTER RECOVERY RESTORATION TEST: PASSED & VERIFIED");
                Log::info("Disaster recovery restoration test for {$manifest['backup_id']} passed successfully");
                return Command::SUCCESS;
            } else {
                $this->error("FAIL: Post-restore integrity verification mismatch with manifest snapshot.");
                return Command::FAILURE;
            }
        } catch (\Throwable $e) {
            $this->error("Restoration failed: " . $e->getMessage());
            Log::error("Restoration failed for {$manifest['backup_id']}: " . $e->getMessage(), ['exception' => $e]);
            return Command::FAILURE;
        }
    }

    private function restoreSqlite(string $dumpPath, string $targetDb): void
    {
        $dir = dirname($targetDb);
        if (file_exists($targetDb)) {
            throw new \RuntimeException("Restore target already exists; refusing to overwrite existing data: {$targetDb}");
        }
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException("Unable to create isolated restore directory: {$dir}");
        }
        if (!copy($dumpPath, $targetDb)) {
            throw new \RuntimeException("Unable to copy verified backup into isolated target: {$targetDb}");
        }
    }

    private function restorePostgres(string $dumpPath, string $targetDb): void
    {
        $config = config('database.connections.pgsql', []);
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 5432;
        $username = $config['username'] ?? 'postgres';
        $password = $config['password'] ?? '';

        putenv("PGPASSWORD={$password}");

        // Create a brand-new isolated database. Never continue against a pre-existing target.
        exec(sprintf('createdb -h %s -p %s -U %s %s 2>&1', escapeshellarg($host), escapeshellarg((string)$port), escapeshellarg($username), escapeshellarg($targetDb)), $createOutput, $createCode);
        if ($createCode !== 0) {
            putenv("PGPASSWORD");
            throw new \RuntimeException("Could not create a new isolated restore database [{$targetDb}]; the target may already exist or database creation failed: " . implode("\n", $createOutput));
        }

        $cmd = sprintf(
            'pg_restore -h %s -p %s -U %s -d %s --clean --if-exists %s 2>&1',
            escapeshellarg($host),
            escapeshellarg((string)$port),
            escapeshellarg($username),
            escapeshellarg($targetDb),
            escapeshellarg($dumpPath)
        );

        exec($cmd, $output, $returnCode);
        putenv("PGPASSWORD");

        // pg_restore exit code 1 indicates at least one restore error; never treat it as success.
        if ($returnCode !== 0) {
            throw new \RuntimeException("pg_restore failed with exit code {$returnCode}: " . implode("\n", $output));
        }
    }


    private function restoreMysql(string $dumpPath, string $targetDb): void
    {
        if (!preg_match('/\\A[a-zA-Z0-9_]+\\z/', $targetDb)) {
            throw new \RuntimeException('Unsafe MySQL restore database name.');
        }

        $config = config('database.connections.mysql', []);
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 3306;
        $username = $config['username'] ?? '';
        $password = $config['password'] ?? '';

        if ($username === '') {
            throw new \RuntimeException('MySQL restore requires a configured database username.');
        }

        // MySQL restore requires CREATE DATABASE privilege. The target must be a new,
        // separately named database; never import into an existing database.
        putenv("MYSQL_PWD={$password}");
        $stderrPath = sys_get_temp_dir() . '/garmentos_mysql_restore_' . bin2hex(random_bytes(6)) . '.stderr';

        try {
            $createSql = sprintf('CREATE DATABASE `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', $targetDb);
            $createCmd = sprintf(
                'mysql --host=%s --port=%s --user=%s --default-character-set=utf8mb4 --execute=%s 2> %s',
                escapeshellarg($host),
                escapeshellarg((string) $port),
                escapeshellarg($username),
                escapeshellarg($createSql),
                escapeshellarg($stderrPath)
            );

            exec($createCmd, $createOutput, $createCode);
            $createError = is_file($stderrPath) ? trim((string) file_get_contents($stderrPath)) : '';
            if (is_file($stderrPath)) {
                @unlink($stderrPath);
            }
            if ($createCode !== 0) {
                throw new \RuntimeException("Could not create isolated MySQL restore database [{$targetDb}]: {$createError}");
            }

            $importCmd = sprintf(
                'mysql --host=%s --port=%s --user=%s --database=%s --default-character-set=utf8mb4 < %s 2> %s',
                escapeshellarg($host),
                escapeshellarg((string) $port),
                escapeshellarg($username),
                escapeshellarg($targetDb),
                escapeshellarg($dumpPath),
                escapeshellarg($stderrPath)
            );

            exec($importCmd, $importOutput, $importCode);
            $importError = is_file($stderrPath) ? trim((string) file_get_contents($stderrPath)) : '';
            if (is_file($stderrPath)) {
                @unlink($stderrPath);
            }
            if ($importCode !== 0) {
                throw new \RuntimeException("MySQL backup import failed with exit code {$importCode}: {$importError}");
            }
        } finally {
            putenv('MYSQL_PWD');
            if (is_file($stderrPath)) {
                @unlink($stderrPath);
            }
        }
    }

    private function decryptFile(string $encryptedPath, string $outputPath, string $passphrase): void
    {
        $cipher = 'aes-256-cbc';
        $ivlen = openssl_cipher_iv_length($cipher);
        $data = file_get_contents($encryptedPath);

        $iv = substr($data, 0, $ivlen);
        $ciphertext = substr($data, $ivlen);
        $key = hash('sha256', $passphrase, true);

        $plaintext = openssl_decrypt($ciphertext, $cipher, $key, OPENSSL_RAW_DATA, $iv);
        if ($plaintext === false) {
            throw new \RuntimeException("Decryption failed: Incorrect password or corrupted payload.");
        }

        file_put_contents($outputPath, $plaintext);
    }

    private function verifyRestoredDatabase(string $driver, string $targetDb, array $manifest): array
    {
        // Reuse the configured driver's connection details, but point every verification
        // query at the isolated restore target (never at the active database).
        $verificationConfig = config("database.connections.{$driver}", []);
        if (empty($verificationConfig) || ($verificationConfig['driver'] ?? null) !== $driver) {
            throw new \RuntimeException("Unsupported or unconfigured restore verification driver: {$driver}");
        }
        $verificationConfig['database'] = $targetDb;
        $verificationConfig['prefix'] = '';
        unset($verificationConfig['read'], $verificationConfig['write']);

        config(['database.connections.restore_verification' => $verificationConfig]);
        DB::purge('restore_verification');
        $conn = DB::connection('restore_verification');

        $migrationCount = $conn->table('migrations')->count();
        $tenantCount = $conn->table('tenants')->count();
        $salesOrdersCount = $conn->table('sales_orders')->count();
        $journalEntriesCount = $conn->table('journal_entries')->count();
        $inventoryItemsCount = $conn->table('inventory_items')->count();
        $inventoryTransactionsCount = $conn->table('inventory_transactions')->count();
        $purchaseOrdersCount = $conn->table('purchase_orders')->count();
        $productionOrdersCount = $conn->table('production_orders')->count();
        $salesInvoicesCount = $conn->table('sales_invoices')->count();
        $migrationsCount = $conn->table('migrations')->count();

        $expectedSnap = $manifest['integrity_snapshot'] ?? [];
        $actualCounts = [
            'tenants_count' => $tenantCount,
            'sales_orders_count' => $salesOrdersCount,
            'journal_entries_count' => $journalEntriesCount,
            'inventory_items_count' => $inventoryItemsCount,
            'inventory_transactions_count' => $inventoryTransactionsCount,
            'purchase_orders_count' => $purchaseOrdersCount,
            'production_orders_count' => $productionOrdersCount,
            'sales_invoices_count' => $salesInvoicesCount,
            'migrations_count' => $migrationsCount,
        ];

        $passed = true;
        foreach ($actualCounts as $key => $actualCount) {
            $expectedCount = $expectedSnap[$key] ?? null;
            if ($expectedCount !== null && $actualCount !== $expectedCount) {
                $passed = false;
            }
        }

        return [
            'migration_count' => $migrationCount,
            'tenant_count' => $tenantCount,
            'sales_orders_count' => $salesOrdersCount,
            'journal_entries_count' => $journalEntriesCount,
            'inventory_items_count' => $inventoryItemsCount,
            'inventory_transactions_count' => $inventoryTransactionsCount,
            'purchase_orders_count' => $purchaseOrdersCount,
            'production_orders_count' => $productionOrdersCount,
            'sales_invoices_count' => $salesInvoicesCount,
            'migrations_count' => $migrationsCount,
            'integrity_passed' => $passed,
        ];
    }
}


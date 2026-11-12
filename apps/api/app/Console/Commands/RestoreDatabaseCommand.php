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
            $manifestPath = dirname($target) . '/' . preg_replace('/\.(sql\.gz|sqlite)(\.enc)?$/', '', basename($target)) . '.manifest.json';
        } else {
            $manifestPath = "{$backupDir}/{$target}.manifest.json";
        }

        if (!file_exists($manifestPath)) {
            $this->error("Manifest not found: {$manifestPath}");
            return Command::FAILURE;
        }

        $manifest = json_decode(file_get_contents($manifestPath), true);
        $dumpPath = dirname($manifestPath) . '/' . $manifest['dump_file'];

        if (!file_exists($dumpPath)) {
            $this->error("Dump file not found: {$dumpPath}");
            return Command::FAILURE;
        }

        $this->info("==> [DISASTER RECOVERY] Validating Backup: {$manifest['backup_id']}");

        // Step 1: Pre-restore Checksum Verification
        $actualSha = hash_file('sha256', $dumpPath);
        if (!hash_equals($manifest['sha256'], $actualSha)) {
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
        $defaultIsolatedTarget = $driver === 'pgsql'
            ? 'garmentos_restore_test_' . time()
            : storage_path('app/private/backups/restore_test_' . time() . '.sqlite');

        $targetDb = $this->option('target-db') ?: $defaultIsolatedTarget;

        // Hard safety boundary: --force must NEVER permit overwriting the active database.
        // A restore is only allowed into a separately named/path-isolated target.
        $currentDb = config("database.connections.{$driver}.database");
        if ($targetDb === $currentDb) {
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
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }
        copy($dumpPath, $targetDb);
    }

    private function restorePostgres(string $dumpPath, string $targetDb): void
    {
        $config = config('database.connections.pgsql', []);
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 5432;
        $username = $config['username'] ?? 'postgres';
        $password = $config['password'] ?? '';

        putenv("PGPASSWORD={$password}");

        // Create target test database if not exists
        exec(sprintf('createdb -h %s -p %s -U %s %s 2>&1', escapeshellarg($host), escapeshellarg((string)$port), escapeshellarg($username), escapeshellarg($targetDb)));

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
        // Dynamically configure a temporary connection to inspect the restored database
        config([
            'database.connections.restore_verification' => [
                'driver' => $driver,
                'database' => $targetDb,
                'prefix' => '',
                'foreign_key_constraints' => true,
            ]
        ]);

        $conn = DB::connection('restore_verification');

        $migrationCount = $conn->table('migrations')->count();
        $tenantCount = $conn->table('tenants')->count();
        $salesOrdersCount = $conn->table('sales_orders')->count();
        $journalEntriesCount = $conn->table('journal_entries')->count();

        $expectedSnap = $manifest['integrity_snapshot'] ?? [];
        $expectedTenants = $expectedSnap['tenants_count'] ?? null;
        $expectedOrders = $expectedSnap['sales_orders_count'] ?? null;

        $passed = true;
        if ($expectedTenants !== null && $tenantCount !== $expectedTenants) {
            $passed = false;
        }
        if ($expectedOrders !== null && $salesOrdersCount !== $expectedOrders) {
            $passed = false;
        }
        $expectedJournalEntries = $expectedSnap['journal_entries_count'] ?? null;
        if ($expectedJournalEntries !== null && $journalEntriesCount !== $expectedJournalEntries) {
            $passed = false;
        }

        return [
            'migration_count' => $migrationCount,
            'tenant_count' => $tenantCount,
            'sales_orders_count' => $salesOrdersCount,
            'journal_entries_count' => $journalEntriesCount,
            'integrity_passed' => $passed,
        ];
    }
}


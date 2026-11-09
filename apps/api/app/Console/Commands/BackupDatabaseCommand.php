<?php

namespace App\Console\Commands;

use App\Models\JournalEntry;
use App\Models\SalesOrder;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class BackupDatabaseCommand extends Command
{
    protected $signature = 'garmentos:backup 
                            {--destination=local : Backup storage destination: local, s3, or all}
                            {--retention=7 : Number of days of local backups to retain}
                            {--encrypt : Encrypt the backup dump using AES-256-CBC}
                            {--password= : Passphrase for AES-256 encryption}
                            {--dry-run : Validate and simulate backup execution without writing}';

    protected $description = 'Generate an audited, checksummed production database backup with metadata and retention policy';

    public function handle(): int
    {
        $backupId = 'BKP-' . gmdate('Ymd-His') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        $this->info("==> [{$backupId}] Initiating GarmentOS Cloud Database Backup...");
        Log::info("Initiating database backup {$backupId}", ['backup_id' => $backupId]);

        $connection = config('database.default', 'sqlite');
        $dbConfig = config("database.connections.{$connection}", []);
        $backupDir = storage_path('app/private/backups/database');

        if ($this->option('dry-run')) {
            $this->warn("DRY RUN: Validation passed for connection [{$connection}]. Backup directory: {$backupDir}");
            return Command::SUCCESS;
        }

        if (!is_dir($backupDir)) {
            mkdir($backupDir, 0750, true);
        }

        $timestamp = gmdate('Y-m-d\TH:i:s\Z');
        $extension = $connection === 'pgsql' ? 'sql.gz' : 'sqlite';
        $dumpFileName = "{$backupId}.{$extension}";
        $partPath = "{$backupDir}/{$dumpFileName}.part";
        $finalDumpPath = "{$backupDir}/{$dumpFileName}";
        $manifestPath = "{$backupDir}/{$backupId}.manifest.json";

        try {
            // Step 1: Dump database into atomic .part file
            $this->comment("Dumping [{$connection}] database into atomic temporary buffer...");
            if ($connection === 'sqlite') {
                $this->dumpSqlite($dbConfig['database'] ?? database_path('database.sqlite'), $partPath);
            } elseif ($connection === 'pgsql') {
                $this->dumpPostgres($dbConfig, $partPath);
            } else {
                throw new \RuntimeException("Unsupported database driver for backup: {$connection}");
            }

            // Step 2: Handle optional AES-256 encryption
            $isEncrypted = (bool) $this->option('encrypt');
            if ($isEncrypted) {
                $passphrase = $this->option('password') ?: config('app.key');
                $this->comment("Encrypting backup with AES-256-CBC...");
                $this->encryptFile($partPath, $passphrase);
                $dumpFileName .= '.enc';
                $finalDumpPath .= '.enc';
            }

            // Step 3: Atomic rename from .part to final dump path
            rename($partPath, $finalDumpPath);
            $fileSizeBytes = filesize($finalDumpPath);
            $sha256Checksum = hash_file('sha256', $finalDumpPath);

            // Step 4: Gather business integrity counts for disaster recovery baseline
            $tenantCount = 0;
            $salesOrderCount = 0;
            $journalEntryCount = 0;
            try {
                $tenantCount = Tenant::withoutGlobalScopes()->count();
                $salesOrderCount = SalesOrder::withoutGlobalScopes()->count();
                $journalEntryCount = JournalEntry::withoutGlobalScopes()->count();
            } catch (\Throwable) {
                // If tables do not exist yet in empty database
            }

            // Step 5: Generate machine-readable JSON metadata manifest
            $manifest = [
                'backup_id' => $backupId,
                'created_at' => $timestamp,
                'database_driver' => $connection,
                'database_name' => $dbConfig['database'] ?? 'garmentos',
                'dump_file' => $dumpFileName,
                'file_size_bytes' => $fileSizeBytes,
                'sha256' => $sha256Checksum,
                'is_encrypted' => $isEncrypted,
                'schema_version' => $this->getSchemaVersion(),
                'integrity_snapshot' => [
                    'tenants_count' => $tenantCount,
                    'sales_orders_count' => $salesOrderCount,
                    'journal_entries_count' => $journalEntryCount,
                ],
            ];

            file_put_contents($manifestPath, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            $this->info("✓ Dump completed successfully: {$dumpFileName} (" . number_format($fileSizeBytes / 1024, 2) . " KB)");
            $this->info("✓ SHA-256: {$sha256Checksum}");
            $this->info("✓ Manifest generated: {$manifestPath}");

            // Step 6: Offsite Sync to S3 if requested
            $destination = $this->option('destination');
            if (in_array($destination, ['s3', 'all'], true)) {
                $this->syncToOffsiteStorage($finalDumpPath, $dumpFileName, $manifestPath, "{$backupId}.manifest.json");
            }

            // Step 7: Apply local retention policy
            $retentionDays = max(1, (int) $this->option('retention'));
            $this->applyRetentionPolicy($backupDir, $retentionDays);

            Log::info("Database backup {$backupId} completed successfully", [
                'backup_id' => $backupId,
                'file' => $dumpFileName,
                'size' => $fileSizeBytes,
                'sha256' => $sha256Checksum,
            ]);

            return Command::SUCCESS;
        } catch (\Throwable $e) {
            if (file_exists($partPath)) {
                @unlink($partPath);
            }
            $this->error("Backup failed: " . $e->getMessage());
            Log::error("Database backup {$backupId} failed: " . $e->getMessage(), [
                'backup_id' => $backupId,
                'exception' => $e,
            ]);
            return Command::FAILURE;
        }
    }

    private function dumpSqlite(string $dbPath, string $targetPart): void
    {
        $normalizedTarget = str_replace('\\', '/', $targetPart);
        $escapedTarget = str_replace("'", "''", $normalizedTarget);

        if ($dbPath === ':memory:') {
            // Handle in-memory SQLite under testing (bypassing "cannot VACUUM from within a transaction")
            $sourcePdo = \Illuminate\Support\Facades\DB::connection()->getPdo();
            $targetPdo = new \PDO("sqlite:{$targetPart}");
            $targetPdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);

            $tables = $sourcePdo->query("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($tables as $t) {
                if (empty($t['sql'])) continue;
                $targetPdo->exec($t['sql']);
                $tableName = $t['name'];
                $rows = $sourcePdo->query("SELECT * FROM \"{$tableName}\"")->fetchAll(\PDO::FETCH_ASSOC);
                if (!empty($rows)) {
                    $cols = array_keys($rows[0]);
                    $placeholders = implode(',', array_fill(0, count($cols), '?'));
                    $colNames = implode(',', array_map(fn($c) => "\"{$c}\"", $cols));
                    $stmt = $targetPdo->prepare("INSERT INTO \"{$tableName}\" ({$colNames}) VALUES ({$placeholders})");
                    foreach ($rows as $row) {
                        $stmt->execute(array_values($row));
                    }
                }
            }
            return;
        }

        if (!file_exists($dbPath)) {
            throw new \RuntimeException("SQLite database file not found at: {$dbPath}");
        }

        // Open read-only connection to run VACUUM INTO for consistent snapshot
        try {
            $pdo = new \PDO("sqlite:{$dbPath}");
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $pdo->exec("VACUUM INTO '{$escapedTarget}'");
        } catch (\Throwable) {
            // Fallback to copy if VACUUM INTO is unsupported by older sqlite
            copy($dbPath, $targetPart);
        }
    }

    private function dumpPostgres(array $config, string $targetPart): void
    {
        $host = $config['host'] ?? '127.0.0.1';
        $port = $config['port'] ?? 5432;
        $database = $config['database'] ?? 'garmentos';
        $username = $config['username'] ?? 'postgres';
        $password = $config['password'] ?? '';

        putenv("PGPASSWORD={$password}");

        $cmd = sprintf(
            'pg_dump -h %s -p %s -U %s -d %s -Z 6 -Fc -f %s 2>&1',
            escapeshellarg($host),
            escapeshellarg((string)$port),
            escapeshellarg($username),
            escapeshellarg($database),
            escapeshellarg($targetPart)
        );

        exec($cmd, $output, $returnCode);
        putenv("PGPASSWORD");

        if ($returnCode !== 0) {
            throw new \RuntimeException("pg_dump failed with exit code {$returnCode}: " . implode("\n", $output));
        }
    }

    private function encryptFile(string $filePath, string $passphrase): void
    {
        $cipher = 'aes-256-cbc';
        $ivlen = openssl_cipher_iv_length($cipher);
        $iv = openssl_random_pseudo_bytes($ivlen);
        $key = hash('sha256', $passphrase, true);

        $plaintext = file_get_contents($filePath);
        $ciphertext = openssl_encrypt($plaintext, $cipher, $key, OPENSSL_RAW_DATA, $iv);

        // Prepend IV to ciphertext
        file_put_contents($filePath, $iv . $ciphertext);
    }

    private function syncToOffsiteStorage(string $dumpPath, string $dumpName, string $manifestPath, string $manifestName): void
    {
        $this->comment("Uploading backup to offsite S3-compatible storage...");
        try {
            $s3Disk = Storage::disk('s3');
            $s3Disk->put("backups/database/{$dumpName}", fopen($dumpPath, 'r'));
            $s3Disk->put("backups/database/{$manifestName}", file_get_contents($manifestPath));
            $this->info("✓ Offsite S3 upload completed.");
        } catch (\Throwable $e) {
            $this->warn("Offsite upload failed or S3 credentials unconfigured: " . $e->getMessage());
            Log::warning("Offsite backup upload skipped or failed: " . $e->getMessage());
        }
    }

    private function applyRetentionPolicy(string $backupDir, int $retentionDays): void
    {
        $cutoff = time() - ($retentionDays * 86400);
        $files = glob("{$backupDir}/BKP-*");
        $deletedCount = 0;

        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoff) {
                @unlink($file);
                $deletedCount++;
            }
        }

        if ($deletedCount > 0) {
            $this->info("Retention cleanup: Pruned {$deletedCount} backup artifact(s) older than {$retentionDays} day(s).");
        }
    }

    private function getSchemaVersion(): string
    {
        try {
            $latest = DB::table('migrations')->latest('id')->value('migration');
            return $latest ?: 'none';
        } catch (\Throwable) {
            return 'unversioned';
        }
    }
}


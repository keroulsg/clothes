<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class VerifyBackupCommand extends Command
{
    protected $signature = 'garmentos:verify-backup {target? : Backup ID or path to dump file/manifest}';
    protected $description = 'Verify the SHA-256 checksum and metadata integrity of a database backup';

    public function handle(): int
    {
        $backupDir = storage_path('app/private/backups/database');
        $target = $this->argument('target');

        if (!$target) {
            // Find latest manifest
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
            // Target is a dump file
            $manifestPath = dirname($target) . '/' . preg_replace('/\.(sql\.gz|sqlite)(\.enc)?$/', '', basename($target)) . '.manifest.json';
        } else {
            // Target is a backup ID
            $manifestPath = "{$backupDir}/{$target}.manifest.json";
        }

        if (!file_exists($manifestPath)) {
            $this->error("Manifest file not found: {$manifestPath}");
            return Command::FAILURE;
        }

        $manifestContents = file_get_contents($manifestPath);
        $manifest = $manifestContents === false ? null : json_decode($manifestContents, true);
        if (
            !is_array($manifest)
            || !isset($manifest['backup_id'], $manifest['sha256'], $manifest['dump_file'], $manifest['file_size_bytes'])
            || !is_string($manifest['backup_id'])
            || !is_string($manifest['sha256'])
            || !preg_match('/^[a-f0-9]{64}$/i', $manifest['sha256'])
            || !is_string($manifest['dump_file'])
            || basename($manifest['dump_file']) !== $manifest['dump_file']
            || !is_int($manifest['file_size_bytes'])
            || $manifest['file_size_bytes'] <= 0
        ) {
            $this->error("Corrupted, incomplete, or unsafe manifest structure: {$manifestPath}");
            return Command::FAILURE;
        }

        $dumpPath = dirname($manifestPath) . DIRECTORY_SEPARATOR . $manifest['dump_file'];
        if (!file_exists($dumpPath) || !is_file($dumpPath)) {
            $this->error("Dump file referenced in manifest does not exist: {$dumpPath}");
            return Command::FAILURE;
        }

        $this->info("==> Verifying Backup: {$manifest['backup_id']}");
        $this->line("Dump file:    {$manifest['dump_file']}");
        $this->line("Created at:   {$manifest['created_at']}");
        $this->line("Driver:       {$manifest['database_driver']}");

        // Verify file size
        $actualSize = filesize($dumpPath);
        $expectedSize = $manifest['file_size_bytes'];
        if ($actualSize !== $expectedSize) {
            $this->error("FAILED: File size mismatch! Expected {$expectedSize} bytes, actual {$actualSize} bytes.");
            return Command::FAILURE;
        }
        $this->info("✓ File size match: " . number_format($actualSize / 1024, 2) . " KB");

        // Verify SHA-256
        $this->comment("Computing SHA-256 checksum...");
        $actualSha = hash_file('sha256', $dumpPath);
        $expectedSha = $manifest['sha256'];

        if (!hash_equals($expectedSha, $actualSha)) {
            $this->error("FAILED: SHA-256 checksum mismatch!");
            $this->line("Expected: {$expectedSha}");
            $this->line("Actual:   {$actualSha}");
            return Command::FAILURE;
        }

        $this->info("✓ SHA-256 Checksum Verified: {$actualSha}");
        $this->info("✓ Status: VERIFIED & INTEGRAL");

        if (!empty($manifest['integrity_snapshot'])) {
            $this->line("Snapshot details: " . json_encode($manifest['integrity_snapshot']));
        }

        return Command::SUCCESS;
    }
}


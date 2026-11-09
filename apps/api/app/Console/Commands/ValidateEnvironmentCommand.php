<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ValidateEnvironmentCommand extends Command
{
    protected $signature = 'garmentos:env-check {--fail-on-missing : Fail with non-zero exit code if required production variables are absent}';
    protected $description = 'Validate required environment variables and production security settings';

    public function handle(): int
    {
        $this->info("==> Validating GarmentOS Cloud Environment Configuration...");

        $env = config('app.env', 'production');
        $debug = config('app.debug', false);
        $isProduction = in_array($env, ['production', 'prod'], true);

        $issues = [];
        $warnings = [];

        // 1. Core Security Variables
        if (empty(config('app.key'))) {
            $issues[] = "APP_KEY is missing! Generate with 'php artisan key:generate'.";
        }

        if ($isProduction && $debug) {
            $issues[] = "CRITICAL: APP_DEBUG is set to TRUE in production! Must be set to FALSE.";
        }

        // 2. Database Connection
        $connection = config('database.default');
        if (empty($connection)) {
            $issues[] = "DB_CONNECTION is not configured.";
        } elseif ($isProduction && $connection === 'sqlite') {
            $warnings[] = "DB_CONNECTION is set to 'sqlite'. In production, 'pgsql' (PostgreSQL 16+) is strongly recommended.";
        }

        if ($connection === 'pgsql') {
            $pgConfig = config('database.connections.pgsql', []);
            if (empty($pgConfig['host'])) {
                $issues[] = "PGSQL_HOST / DB_HOST is missing.";
            }
            if (empty($pgConfig['database'])) {
                $issues[] = "PGSQL_DATABASE / DB_DATABASE is missing.";
            }
            if (empty($pgConfig['username'])) {
                $issues[] = "PGSQL_USERNAME / DB_USERNAME is missing.";
            }
        }

        // 3. Queue & Cache in Production
        if ($isProduction) {
            $queue = config('queue.default');
            if ($queue === 'sync') {
                $warnings[] = "QUEUE_CONNECTION is set to 'sync'. In production, 'redis' or 'database' is required for background processing.";
            }

            $cache = config('cache.default');
            if ($cache === 'array') {
                $warnings[] = "CACHE_STORE is set to 'array'. In production, 'redis' or 'database' is required for persistent caching.";
            }

            if (empty(env('PAYMENT_WEBHOOK_SECRET'))) {
                $warnings[] = "PAYMENT_WEBHOOK_SECRET is unset. Inbound payment webhooks cannot be cryptographically verified.";
            }

            if (empty(env('PLATFORM_ADMIN_ACTIVATION_KEY'))) {
                $warnings[] = "PLATFORM_ADMIN_ACTIVATION_KEY is unset.";
            }
        }

        // Output results
        $this->table(
            ['Setting', 'Configured Value', 'Status'],
            [
                ['APP_ENV', $env, 'OK'],
                ['APP_DEBUG', $debug ? 'TRUE (Unsafe for prod)' : 'FALSE (Safe)', ($isProduction && $debug) ? 'FAIL' : 'OK'],
                ['DB_CONNECTION', $connection, in_array($connection, ['pgsql', 'sqlite', 'mysql']) ? 'OK' : 'WARN'],
                ['QUEUE_CONNECTION', config('queue.default'), config('queue.default') !== 'sync' ? 'OK' : 'WARN'],
                ['CACHE_STORE', config('cache.default'), config('cache.default') !== 'array' ? 'OK' : 'WARN'],
                ['APP_KEY', !empty(config('app.key')) ? '[REDACTED 32+ chars]' : 'MISSING', !empty(config('app.key')) ? 'OK' : 'FAIL'],
            ]
        );

        if (!empty($warnings)) {
            $this->warn("\nWarnings:");
            foreach ($warnings as $warn) {
                $this->line(" - {$warn}");
            }
        }

        if (!empty($issues)) {
            $this->error("\nCritical Configuration Issues:");
            foreach ($issues as $issue) {
                $this->line(" [!] {$issue}");
            }

            if ($this->option('fail-on-missing')) {
                return Command::FAILURE;
            }
        } else {
            $this->info("\n✓ Environment security and configuration checks passed!");
        }

        return Command::SUCCESS;
    }
}


<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Focused tests for the PostgreSQL Test Database Destructive Cleanup Safety Guard
 *
 * Verifies that:
 * 1. An unsafe or insufficiently configured target is rejected BEFORE any destructive query can run.
 * 2. Non-testing application environments are rejected.
 * 3. Missing explicit PGSQL_DATABASE configuration is rejected without falling back to DB_DATABASE.
 * 4. Databases not ending with '_test' are rejected.
 * 5. Missing or false ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP opt-in is rejected.
 * 6. Explicitly permitted isolated test databases (e.g. garmentos_test) pass the guard.
 * 7. cleanDatabase() aborts before any DELETE query and fails clearly on errors instead of swallowing Throwables.
 */
class PostgresDatabaseSafetyGuardTest extends TestCase
{
    /**
     * 1. رفض البيئات غير المخصصة للاختبار (مثل production أو staging أو local) قبل تنفيذ أي استعلام
     */
    public function test_guard_rejects_non_testing_application_environment(): void
    {
        $executedQueries = [];
        DB::listen(function ($query) use (&$executedQueries) {
            $executedQueries[] = $query->sql;
        });

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage("Application must be running in the 'testing' environment");

        PostgresConcurrencyIntegrationTest::assertSafeDestructiveCleanupDatabase(
            appEnv: 'production',
            pgsqlDatabase: 'garmentos_test',
            allowOptIn: 'true'
        );

        $this->assertEmpty($executedQueries, 'No database queries should execute when environment check fails.');
    }

    /**
     * 2. رفض الحالات التي يكون فيها PGSQL_DATABASE غير محدد صراحة، ومنع الاعتماد على DB_DATABASE كبديل
     */
    public function test_guard_rejects_missing_explicit_pgsql_database(): void
    {
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('PGSQL_DATABASE must be explicitly configured and non-empty. Deriving the cleanup target from DB_DATABASE is forbidden.');

        PostgresConcurrencyIntegrationTest::assertSafeDestructiveCleanupDatabase(
            appEnv: 'testing',
            pgsqlDatabase: '',
            allowOptIn: 'true'
        );
    }

    /**
     * 3. رفض قواعد البيانات التي لا ينتهي اسمها بـ '_test' (مثل garmentos أو garmentos_production)
     */
    public function test_guard_rejects_database_not_ending_with_test(): void
    {
        $unsafeDatabases = [
            'garmentos',
            'garmentos_production',
            'garmentos_staging',
            'garmentos_dev',
            'test_garmentos',
            'garmentos_testing',
        ];

        foreach ($unsafeDatabases as $unsafeDb) {
            try {
                PostgresConcurrencyIntegrationTest::assertSafeDestructiveCleanupDatabase(
                    appEnv: 'testing',
                    pgsqlDatabase: $unsafeDb,
                    allowOptIn: 'true'
                );
                $this->fail("Expected RuntimeException for unsafe database name: {$unsafeDb}");
            } catch (\RuntimeException $e) {
                $this->assertStringContainsString("does not end with '_test'", $e->getMessage());
                $this->assertStringContainsString($unsafeDb, $e->getMessage());
            }
        }
    }

    /**
     * 4. رفض التنفيذ عند غياب متغير الموافقة الصريح ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP=true
     */
    public function test_guard_rejects_when_opt_in_environment_variable_is_missing_or_not_true(): void
    {
        $invalidOptIns = [null, '', 'false', '0', 'no', 'TRUE_UNVERIFIED'];

        foreach ($invalidOptIns as $invalidOptIn) {
            try {
                PostgresConcurrencyIntegrationTest::assertSafeDestructiveCleanupDatabase(
                    appEnv: 'testing',
                    pgsqlDatabase: 'garmentos_test',
                    allowOptIn: $invalidOptIn
                );
                $this->fail("Expected RuntimeException when opt-in is " . var_export($invalidOptIn, true));
            } catch (\RuntimeException $e) {
                $this->assertStringContainsString('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP must be explicitly set to \'true\'', $e->getMessage());
            }
        }
    }

    /**
     * 5. السماح بقاعدة بيانات الاختبار المعزولة والمصرح بها صراحة (garmentos_test)
     */
    public function test_guard_permits_safe_explicitly_configured_test_database(): void
    {
        // يجب أن يمر بنجاح دون إطلاق أي استثناء
        PostgresConcurrencyIntegrationTest::assertSafeDestructiveCleanupDatabase(
            appEnv: 'testing',
            pgsqlDatabase: 'garmentos_test',
            allowOptIn: 'true'
        );

        $this->assertSame('garmentos_test', config('database.connections.pgsql.database'));
    }

    /**
     * 6. التحقق من أن cleanDatabase() تجهض العملية فوراً دون تنفيذ أي DELETE عند فشل الحارس
     */
    public function test_clean_database_aborts_immediately_without_running_destructive_queries_when_guard_fails(): void
    {
        $executedQueries = [];
        DB::listen(function ($query) use (&$executedQueries) {
            $executedQueries[] = $query->sql;
        });

        $origOptIn = getenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP');
        $origEnvOptIn = $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] ?? null;
        $origServerOptIn = $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] ?? null;

        putenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP=false');
        $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = 'false';
        $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = 'false';

        try {
            $testInstance = new PostgresConcurrencyIntegrationTest('test_guard');
            $testInstance->cleanDatabase();
            $this->fail('Expected cleanDatabase() to throw RuntimeException when guard fails.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP', $e->getMessage());
        } finally {
            if ($origOptIn !== false && $origOptIn !== null) {
                putenv("ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP={$origOptIn}");
            } else {
                putenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP');
            }

            if ($origEnvOptIn !== null) {
                $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = $origEnvOptIn;
            } else {
                unset($_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP']);
            }

            if ($origServerOptIn !== null) {
                $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = $origServerOptIn;
            } else {
                unset($_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP']);
            }
        }

        // التأكد القاطع من عدم تنفيذ أي استعلام DELETE على أي قاعدة بيانات
        $deleteQueries = array_filter($executedQueries, fn ($sql) => stripos($sql, 'delete') !== false);
        $this->assertEmpty($deleteQueries, 'No DELETE statements should be executed when guard fails.');
    }

    /**
     * 7. التحقق من أن cleanDatabase() تفشل بوضوح وتطلق RuntimeException بدلاً من ابتلاع الأخطاء
     */
    public function test_clean_database_fails_clearly_and_does_not_swallow_exceptions(): void
    {
        $origHost = config('database.connections.pgsql.host');
        $origPort = config('database.connections.pgsql.port');
        $origDatabase = config('database.connections.pgsql.database');
        $origDb = getenv('PGSQL_DATABASE') ?: (env('PGSQL_DATABASE') ?? 'garmentos_test');
        $origEnvDb = $_ENV['PGSQL_DATABASE'] ?? null;
        $origServerDb = $_SERVER['PGSQL_DATABASE'] ?? null;

        $origOptIn = getenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP');
        $origEnvOptIn = $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] ?? null;
        $origServerOptIn = $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] ?? null;

        putenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP=true');
        $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = 'true';
        $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = 'true';

        putenv('PGSQL_DATABASE=unreachable_test');
        $_ENV['PGSQL_DATABASE'] = 'unreachable_test';
        $_SERVER['PGSQL_DATABASE'] = 'unreachable_test';

        config([
            'database.connections.pgsql.host' => '127.0.0.1',
            'database.connections.pgsql.port' => 65534, // منفذ غير متاح للتأكد من فشل الاتصال بوضوح
            'database.connections.pgsql.database' => 'unreachable_test',
        ]);
        DB::purge('pgsql');

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('PostgreSQL test database cleanup failed');

        try {
            $testInstance = new PostgresConcurrencyIntegrationTest('test_error_handling');
            $testInstance->cleanDatabase();
        } finally {
            config([
                'database.connections.pgsql.host' => $origHost ?? '127.0.0.1',
                'database.connections.pgsql.port' => $origPort ?? 5432,
                'database.connections.pgsql.database' => $origDatabase ?? 'garmentos_test',
            ]);

            if ($origOptIn !== false && $origOptIn !== null) {
                putenv("ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP={$origOptIn}");
            } else {
                putenv('ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP');
            }

            if ($origEnvOptIn !== null) {
                $_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = $origEnvOptIn;
            } else {
                unset($_ENV['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP']);
            }

            if ($origServerOptIn !== null) {
                $_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP'] = $origServerOptIn;
            } else {
                unset($_SERVER['ALLOW_DESTRUCTIVE_PG_TEST_CLEANUP']);
            }

            if ($origDb !== false && $origDb !== null) {
                putenv("PGSQL_DATABASE={$origDb}");
            } else {
                putenv('PGSQL_DATABASE=garmentos_test');
            }

            if ($origEnvDb !== null) {
                $_ENV['PGSQL_DATABASE'] = $origEnvDb;
            } else {
                $_ENV['PGSQL_DATABASE'] = 'garmentos_test';
            }

            if ($origServerDb !== null) {
                $_SERVER['PGSQL_DATABASE'] = $origServerDb;
            } else {
                $_SERVER['PGSQL_DATABASE'] = 'garmentos_test';
            }

            DB::purge('pgsql');
        }
    }
}

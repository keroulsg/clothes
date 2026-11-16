<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class Batch7ProductionDeploymentAndHealthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. مسار فحص الصحة الشامل GET /api/v1/health يعيد تفاصيل الأنظمة الفرعية دون تسريب أي أسرار
     */
    public function test_health_check_endpoint_reports_subsystems_without_leaking_secrets(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'timestamp',
            'version',
            'environment',
            'checks' => [
                'database' => ['status'],
                'cache' => ['status'],
                'storage' => ['status'],
                'queue' => ['status'],
            ],
        ]);

        $content = $response->getContent();
        // التأكد من عدم تسريب كلمات مرور أو أسماء مستخدمين أو سلاسل اتصال
        $this->assertStringNotContainsString('password', strtolower($content));
        $this->assertStringNotContainsString('secret', strtolower($content));
        $this->assertStringNotContainsString('127.0.0.1', $content);
    }

    /**
     * 2. مسارات Liveness و Readiness الخاصة بالحاويات و Kubernetes
     */
    public function test_liveness_and_readiness_probes_return_healthy_status(): void
    {
        $resLiveness = $this->getJson('/api/v1/health/liveness');
        $resLiveness->assertStatus(200);
        $resLiveness->assertJsonPath('status', 'alive');

        $resReadiness = $this->getJson('/api/v1/health/readiness');
        $resReadiness->assertStatus(200);
        $resReadiness->assertJsonPath('status', 'ready');
    }

    /**
     * 3. التحقق من تفعيل وسيط تتبع الطلبات وإرفاق ترويسة X-Correlation-ID
     */
    public function test_request_correlation_id_middleware_assigns_and_propagates_header(): void
    {
        // 1. عند عدم إرسال ترويسة، يتم توليد واحدة تلقائياً
        $resAuto = $this->getJson('/api/v1/health/liveness');
        $resAuto->assertStatus(200);
        $this->assertTrue($resAuto->headers->has('X-Correlation-ID'));
        $this->assertStringStartsWith('req_', $resAuto->headers->get('X-Correlation-ID'));

        // 2. عند إرسال ترويسة مسبقة، يتم الحفاظ عليها ودفقها
        $customId = 'req_custom_trace_' . uniqid();
        $resExplicit = $this->withHeader('X-Correlation-ID', $customId)
            ->getJson('/api/v1/health/liveness');

        $resExplicit->assertStatus(200);
        $this->assertEquals($customId, $resExplicit->headers->get('X-Correlation-ID'));
    }

    /**
     * 4. التحقق من أمر إنشاء النسخ الاحتياطية garmentos:backup وحساب البصمة الرقمية
     */
    public function test_backup_command_generates_dump_and_manifest_with_sha256(): void
    {
        if (config('database.default') === 'mysql') {
            $this->markTestSkipped('MySQL backup/restore round-trip is executed by the dedicated CI CLI step outside PHPUnit transactions.');
        }

        Tenant::create([
            'name' => 'مصنع النيل للنسيج',
            'code' => 'T-NILE-' . uniqid(),
            'subdomain' => 'nile-' . uniqid(),
            'status' => 'active',
        ]);

        $exitCode = Artisan::call('garmentos:backup', ['--destination' => 'local']);
        $this->assertEquals(0, $exitCode);

        $output = Artisan::output();
        $this->assertStringContainsString('Dump completed successfully', $output);
        $this->assertStringContainsString('SHA-256:', $output);

        // التحقق من إنشاء ملف البيان والنسخة في المجلد الخاص
        $backupDir = storage_path('app/private/backups/database');
        $manifests = glob("{$backupDir}/*.manifest.json");
        $this->assertNotEmpty($manifests, 'يجب توليد ملف manifest.json للنسخة الاحتياطية');

        rsort($manifests);
        $latestManifest = json_decode(file_get_contents($manifests[0]), true);

        $this->assertNotEmpty($latestManifest['backup_id']);
        $this->assertNotEmpty($latestManifest['sha256']);
        $this->assertGreaterThan(0, $latestManifest['file_size_bytes']);
        $this->assertEquals(1, $latestManifest['integrity_snapshot']['tenants_count']);
    }

    /**
     * 5. التحقق من أمر التحقق من سلامة النسخ الاحتياطية garmentos:verify-backup
     */
    public function test_verify_backup_command_validates_checksum_and_file_size(): void
    {
        if (config('database.default') === 'mysql') {
            $this->markTestSkipped('MySQL backup/restore round-trip is executed by the dedicated CI CLI step outside PHPUnit transactions.');
        }

        // تشغيل التحقق من أحدث نسخة تم إنشاؤها
        $exitCode = Artisan::call('garmentos:verify-backup');
        $this->assertEquals(0, $exitCode);

        $output = Artisan::output();
        $this->assertStringContainsString('SHA-256 Checksum Verified:', $output);
        $this->assertStringContainsString('Status: VERIFIED & INTEGRAL', $output);
    }

    /**
     * 6. التحقق من استعادة النسخة الاحتياطية في قاعدة بيانات تجريبية معزولة والتأكد من سلامة السجلات
     */
    public function test_restore_command_recovers_into_isolated_target_and_verifies_integrity(): void
    {
        if (config('database.default') === 'mysql') {
            $this->markTestSkipped('MySQL backup/restore round-trip is executed by the dedicated CI CLI step outside PHPUnit transactions.');
        }

        $isolatedDbPath = storage_path('app/private/backups/isolated_verify_test_' . uniqid() . '.sqlite');

        $exitCode = Artisan::call('garmentos:restore', [
            '--target-db' => $isolatedDbPath,
            '--force' => true,
        ]);

        $this->assertEquals(0, $exitCode);

        $output = Artisan::output();
        $this->assertStringContainsString('Database restoration completed into target:', $output);
        $this->assertStringContainsString('DISASTER RECOVERY RESTORATION TEST: PASSED & VERIFIED', $output);

        if (file_exists($isolatedDbPath)) {
            @unlink($isolatedDbPath);
        }
    }

    /**
     * Restore must reject the active database even when --force is supplied.
     */
    public function test_restore_never_allows_active_database_target_even_with_force(): void
    {
        if (config('database.default') === 'mysql') {
            $this->markTestSkipped('MySQL backup/restore round-trip is executed by the dedicated CI CLI step outside PHPUnit transactions.');
        }

        Tenant::create([
            'name' => 'مصنع اختبار حماية الاستعادة',
            'code' => 'T-RESTORE-GUARD-' . uniqid(),
            'subdomain' => 'restore-guard-' . uniqid(),
            'status' => 'active',
        ]);

        $backupExit = Artisan::call('garmentos:backup', ['--destination' => 'local']);
        $this->assertSame(0, $backupExit);

        $manifests = glob(storage_path('app/private/backups/database/*.manifest.json'));
        $this->assertNotEmpty($manifests);
        rsort($manifests);
        $manifest = json_decode(file_get_contents($manifests[0]), true);

        $activeDatabase = config('database.connections.' . config('database.default') . '.database');
        $restoreExit = Artisan::call('garmentos:restore', [
            $manifest['backup_id'],
            '--target-db' => $activeDatabase,
            '--force' => true,
        ]);

        $this->assertSame(1, $restoreExit);
        $this->assertStringContainsString('CRITICAL SAFETY BLOCK', Artisan::output());
    }

    /**
     * 8. فحص أداة التحقق من متغيرات البيئة garmentos:env-check
     */
    public function test_environment_validation_command_reports_security_settings(): void
    {
        $exitCode = Artisan::call('garmentos:env-check');
        $this->assertEquals(0, $exitCode);

        $output = Artisan::output();
        $this->assertStringContainsString('Validating GarmentOS Cloud Environment Configuration', $output);
        $this->assertStringContainsString('APP_KEY', $output);
        $this->assertStringContainsString('DB_CONNECTION', $output);
    }
}


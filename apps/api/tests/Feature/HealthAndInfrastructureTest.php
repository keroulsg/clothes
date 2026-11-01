<?php

namespace Tests\Feature;

use App\Jobs\ProcessFinancialReportExportJob;
use App\Models\Tenant;
use App\Models\User;
use App\Services\FinancialReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class HealthAndInfrastructureTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_endpoint_returns_healthy_status(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'timestamp',
                'latency_ms',
                'environment',
                'version',
                'php_version',
                'checks' => [
                    'database' => ['status', 'driver', 'latency_ms'],
                    'cache' => ['status', 'store'],
                    'storage' => ['status', 'disk'],
                ],
            ]);

        $this->assertEquals('healthy', $response->json('status'));
        $this->assertEquals('healthy', $response->json('checks.database.status'));
        $this->assertEquals('healthy', $response->json('checks.cache.status'));
        $this->assertEquals('healthy', $response->json('checks.storage.status'));
    }

    public function test_financial_report_export_job_generates_csv_file(): void
    {
        Storage::fake('local');

        $tenant = Tenant::create([
            'code' => 'TENANT-EXPORT-TEST',
            'name' => 'Al-Amal Textiles Export Test',
            'domain' => 'alamal-export.garmentos.test',
            'status' => 'active',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Finance Director',
            'email' => 'finance@alamal.test',
            'password' => bcrypt('password123'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $job = new ProcessFinancialReportExportJob(
            $tenant->id,
            'trial-balance',
            ['from_date' => '2026-01-01', 'to_date' => '2026-12-31'],
            $user->id
        );

        $filePath = $job->handle(app(FinancialReportService::class));

        Storage::disk('local')->assertExists($filePath);

        $content = Storage::disk('local')->get($filePath);
        // Ensure UTF-8 BOM is present for Excel Arabic compatibility
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('كود الحساب', $content);
    }
}

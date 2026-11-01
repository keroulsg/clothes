<?php

namespace Tests\Feature;

use App\Jobs\ProcessFinancialReportExportJob;
use App\Models\Tenant;
use App\Models\User;
use App\Services\FinancialReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class QueueAndExportCommercialAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'code' => 'T-QUEUE-TEST',
            'name' => 'مصنع المحلة للأقمشة الراقية',
            'domain' => 'mahalla-fabrics.garmentos.test',
            'status' => 'active',
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'المحاسب القانوني',
            'email' => 'cpa@mahalla.test',
            'password' => bcrypt('Secret123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);
    }

    /**
     * 1. إثبات المعالجة غير المتزامنة عبر طابور قاعدة البيانات (Genuine Database Queue Processing)
     */
    public function test_asynchronous_queue_dispatch_and_worker_execution(): void
    {
        Storage::fake('local');

        // ضبط اتصال الطابور على قاعدة البيانات لإثبات الـ Asynchronous Processing
        config(['queue.default' => 'database']);

        // التأكد من أن جدول المهام فارغ في البداية
        $this->assertEquals(0, DB::table('jobs')->count());

        // دفع المهمة إلى الطابور
        ProcessFinancialReportExportJob::dispatch(
            $this->tenant->id,
            'trial-balance',
            ['from_date' => '2026-01-01', 'to_date' => '2026-10-31'],
            $this->user->id
        );

        // إثبات وجود المهمة غير المتزامنة داخل جدول jobs في قاعدة البيانات
        $this->assertEquals(1, DB::table('jobs')->count());
        $queuedPayload = DB::table('jobs')->value('payload');
        $this->assertStringContainsString('ProcessFinancialReportExportJob', $queuedPayload);
        $this->assertStringContainsString($this->tenant->id, $queuedPayload);

        // تشغيل عامل الطابور (Worker Execution) لمعالجة المهمة
        Artisan::call('queue:work', ['--once' => true]);

        // بعد معالجة العامل، تصبح قائمة المهام فارغة بنجاح
        $this->assertEquals(0, DB::table('jobs')->count());

        // التحقق من إنشاء ملف التقرير فعلياً في وحدة التخزين
        $expectedFolder = "reports/{$this->tenant->id}";
        $files = Storage::disk('local')->files($expectedFolder);
        $this->assertNotEmpty($files);

        $content = Storage::disk('local')->get($files[0]);
        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('كود الحساب', $content);
    }

    /**
     * 2. فحص توليد الملف الفعلي مع ترميز UTF-8 BOM الداعم للأكسل العربي
     */
    public function test_financial_export_job_execution_creates_utf8_bom_csv(): void
    {
        Storage::fake('local');

        $job = new ProcessFinancialReportExportJob(
            $this->tenant->id,
            'trial-balance',
            ['from_date' => '2026-01-01', 'to_date' => '2026-10-31'],
            $this->user->id
        );

        $filePath = $job->handle(app(FinancialReportService::class));

        Storage::disk('local')->assertExists($filePath);

        $csvContent = Storage::disk('local')->get($filePath);

        // التأكد من وجود ترويسة UTF-8 BOM
        $this->assertStringStartsWith("\xEF\xBB\xBF", $csvContent);

        // التأكد من ترويسات الأعمدة باللغة العربية
        $this->assertStringContainsString('كود الحساب', $csvContent);
        $this->assertStringContainsString('اسم الحساب', $csvContent);
        $this->assertStringContainsString('رصيد افتتاحي', $csvContent);
        $this->assertStringContainsString('رصيد ختامي', $csvContent);
    }

    /**
     * 3. معالجة الأخطاء عند طلب تقرير غير مدعوم
     */
    public function test_financial_export_job_rejects_invalid_report_type(): void
    {
        $job = new ProcessFinancialReportExportJob(
            $this->tenant->id,
            'unsupported-fake-report',
            [],
            $this->user->id
        );

        $this->expectException(\InvalidArgumentException::class);
        $job->handle(app(FinancialReportService::class));
    }

    /**
     * 4. العزل التام لمسارات التخزين بين المستأجرين
     */
    public function test_export_file_paths_are_strictly_tenant_scoped(): void
    {
        Storage::fake('local');

        $jobTenantA = new ProcessFinancialReportExportJob($this->tenant->id, 'trial-balance', []);
        $pathA = $jobTenantA->handle(app(FinancialReportService::class));

        $otherTenant = Tenant::create([
            'code' => 'T-OTHER-TENANT',
            'name' => 'مستأجر آخر',
            'domain' => 'other.test',
            'status' => 'active',
        ]);

        $jobTenantB = new ProcessFinancialReportExportJob($otherTenant->id, 'trial-balance', []);
        $pathB = $jobTenantB->handle(app(FinancialReportService::class));

        $this->assertStringStartsWith("reports/{$this->tenant->id}/", $pathA);
        $this->assertStringStartsWith("reports/{$otherTenant->id}/", $pathB);
        $this->assertNotEquals($pathA, $pathB);
    }
}

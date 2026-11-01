<?php

namespace App\Jobs;

use App\Services\FinancialReportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

class ProcessFinancialReportExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $tenantId,
        public string $reportType,
        public array $filters = [],
        public ?string $userId = null
    ) {}

    /**
     * Execute the job.
     */
    public function handle(FinancialReportService $reportService): string
    {
        app()->instance('current_tenant_id', $this->tenantId);

        $fromDate = $this->filters['from_date'] ?? null;
        $toDate = $this->filters['to_date'] ?? null;

        $reportData = match ($this->reportType) {
            'trial-balance' => $reportService->getTrialBalance($this->tenantId, $fromDate, $toDate),
            'income-statement' => $reportService->getIncomeStatement($this->tenantId, $fromDate, $toDate),
            'balance-sheet' => $reportService->getBalanceSheet($this->tenantId, $toDate),
            'vat-summary' => $reportService->getVatSummary($this->tenantId, $fromDate, $toDate),
            'cost-variance' => $reportService->getCostVarianceReport($this->tenantId, $this->filters['production_order_id'] ?? null),
            default => throw new InvalidArgumentException("نوع التقرير غير مدعوم للتصدير: {$this->reportType}"),
        };

        $timestamp = date('Ymd_His');
        $fileName = "reports/{$this->tenantId}/{$this->reportType}_{$timestamp}.csv";

        $csvHandle = fopen('php://temp', 'r+');

        // كتابة ترويسة UTF-8 BOM لدعم اللغة العربية في Excel
        fprintf($csvHandle, chr(0xEF).chr(0xBB).chr(0xBF));

        if ($this->reportType === 'trial-balance') {
            fputcsv($csvHandle, ['كود الحساب', 'اسم الحساب', 'النوع', 'رصيد افتتاحي', 'حركات مدين', 'حركات دائن', 'رصيد ختامي']);
            foreach ($reportData['accounts'] ?? [] as $acc) {
                fputcsv($csvHandle, [
                    $acc['code'],
                    $acc['name'],
                    $acc['type'],
                    $acc['opening_balance'],
                    $acc['period_debit'],
                    $acc['period_credit'],
                    $acc['closing_balance'],
                ]);
            }
        } else {
            fputcsv($csvHandle, ['البيان', 'القيمة']);
            fputcsv($csvHandle, ['نوع التقرير', $this->reportType]);
            fputcsv($csvHandle, ['تاريخ الاستخراج', now()->toDateTimeString()]);
        }

        rewind($csvHandle);
        $csvContent = stream_get_contents($csvHandle);
        fclose($csvHandle);

        Storage::disk('local')->put($fileName, $csvContent);

        return $fileName;
    }
}


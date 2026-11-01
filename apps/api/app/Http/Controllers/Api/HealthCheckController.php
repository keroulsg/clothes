<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class HealthCheckController extends Controller
{
    /**
     * فحص الجاهزية التشغيلية وسلامة الخدمات السحابية (Production Health Check)
     */
    public function __invoke(): JsonResponse
    {
        $startTime = microtime(true);
        $checks = [];
        $isHealthy = true;

        // 1. فحص اتصال قاعدة البيانات (Database Probe)
        try {
            $dbStart = microtime(true);
            DB::connection()->getPdo();
            $dbDuration = round((microtime(true) - $dbStart) * 1000, 2);

            $checks['database'] = [
                'status' => 'healthy',
                'driver' => DB::connection()->getDriverName(),
                'latency_ms' => $dbDuration,
            ];
        } catch (Exception $e) {
            $isHealthy = false;
            $checks['database'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        // 2. فحص الذاكرة المؤقتة (Cache Probe)
        try {
            $cacheKey = 'health_check_' . uniqid();
            Cache::put($cacheKey, 'ok', 10);
            $cachedVal = Cache::get($cacheKey);
            Cache::forget($cacheKey);

            $checks['cache'] = [
                'status' => ($cachedVal === 'ok') ? 'healthy' : 'degraded',
                'store' => config('cache.default'),
            ];
        } catch (Exception $e) {
            $checks['cache'] = [
                'status' => 'degraded',
                'error' => $e->getMessage(),
            ];
        }

        // 3. فحص نظام الملفات وتخزين التقارير (Storage Probe)
        try {
            $testFile = 'health_check_' . uniqid() . '.tmp';
            Storage::disk('local')->put($testFile, 'ok');
            $read = Storage::disk('local')->get($testFile);
            Storage::disk('local')->delete($testFile);

            $checks['storage'] = [
                'status' => ($read === 'ok') ? 'healthy' : 'unhealthy',
                'disk' => 'local',
            ];
        } catch (Exception $e) {
            $checks['storage'] = [
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
            ];
        }

        $totalDuration = round((microtime(true) - $startTime) * 1000, 2);

        $payload = [
            'status' => $isHealthy ? 'healthy' : 'unhealthy',
            'timestamp' => now()->toIso8601String(),
            'latency_ms' => $totalDuration,
            'environment' => config('app.env'),
            'version' => '1.0.0-commercial',
            'php_version' => PHP_VERSION,
            'checks' => $checks,
        ];

        return response()->json($payload, $isHealthy ? 200 : 503);
    }
}


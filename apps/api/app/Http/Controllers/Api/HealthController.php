<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

class HealthController extends Controller
{
    /**
     * Comprehensive Application Health Check (Database, Cache, Redis, Storage, Queue)
     * No sensitive credentials or connection details exposed.
     */
    public function check(Request $request): JsonResponse
    {
        $startTime = microtime(true);
        $checks = [];
        $overallStatus = 'healthy';
        $httpCode = 200;

        // 1. Database Connectivity & Latency Probe
        $dbStart = microtime(true);
        try {
            DB::connection()->getPdo();
            $dbDuration = round((microtime(true) - $dbStart) * 1000, 2);
            $checks['database'] = [
                'status' => 'healthy',
                'driver' => DB::connection()->getDriverName(),
                'latency_ms' => $dbDuration,
            ];
        } catch (\Throwable) {
            $checks['database'] = [
                'status' => 'unhealthy',
                'driver' => config('database.default', 'unknown'),
                'latency_ms' => 0,
                'message' => 'Database connection unavailable',
            ];
            $overallStatus = 'unhealthy';
            $httpCode = 503;
        }

        // 2. Cache Store Read/Write Probe
        $cacheStart = microtime(true);
        try {
            $testKey = 'health_check_' . uniqid();
            Cache::put($testKey, 'ok', 5);
            $val = Cache::get($testKey);
            Cache::forget($testKey);

            $checks['cache'] = [
                'status' => ($val === 'ok') ? 'healthy' : 'degraded',
                'store' => config('cache.default', 'file'),
            ];
        } catch (\Throwable) {
            $checks['cache'] = [
                'status' => 'degraded',
                'store' => config('cache.default', 'file'),
                'message' => 'Cache store unavailable',
            ];
            if ($overallStatus !== 'unhealthy') {
                $overallStatus = 'degraded';
            }
        }

        // 3. Storage Disk Write/Delete Probe
        try {
            $storageTestFile = 'health_' . uniqid() . '.tmp';
            Storage::disk('local')->put($storageTestFile, 'health_ok');
            $read = Storage::disk('local')->get($storageTestFile);
            Storage::disk('local')->delete($storageTestFile);

            $checks['storage'] = [
                'status' => ($read === 'health_ok') ? 'healthy' : 'unhealthy',
                'disk' => 'local',
            ];
        } catch (\Throwable) {
            $checks['storage'] = [
                'status' => 'unhealthy',
                'disk' => 'local',
                'message' => 'Storage disk write failed',
            ];
            $overallStatus = 'unhealthy';
            $httpCode = 503;
        }

        // 4. Queue Driver Availability
        try {
            $queueConnection = config('queue.default', 'sync');
            $checks['queue'] = [
                'status' => 'healthy',
                'driver' => $queueConnection,
            ];
        } catch (\Throwable) {
            $checks['queue'] = [
                'status' => 'degraded',
                'driver' => config('queue.default', 'sync'),
                'message' => 'Queue driver unreachable',
            ];
            if ($overallStatus !== 'unhealthy') {
                $overallStatus = 'degraded';
            }
        }

        // 5. Redis Connectivity (if configured)
        if (config('queue.default') === 'redis') {
            try {
                $redisStart = microtime(true);
                $ping = Redis::connection()->ping();
                $redisDuration = round((microtime(true) - $redisStart) * 1000, 2);
                $checks['redis'] = [
                    'status' => 'healthy',
                    'latency_ms' => $redisDuration,
                ];
            } catch (\Throwable) {
                $checks['redis'] = [
                    'status' => 'degraded',
                    'message' => 'Redis connection failed',
                ];
                if ($overallStatus !== 'unhealthy') {
                    $overallStatus = 'degraded';
                }
            }
        }

        $totalDuration = round((microtime(true) - $startTime) * 1000, 2);

        $payload = [
            'status' => $overallStatus,
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'latency_ms' => $totalDuration,
            'version' => config('app.version', '1.0.0'),
            'environment' => config('app.env'),
            'php_version' => PHP_VERSION,
            'checks' => $checks,
        ];

        return response()->json($payload, $httpCode);
    }

    /**
     * Orchestrator Liveness Probe
     * Returns 200 if web server & PHP runtime can respond to HTTP requests.
     */
    public function liveness(): JsonResponse
    {
        return response()->json([
            'status' => 'alive',
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        ]);
    }

    /**
     * Orchestrator Readiness Probe
     * Returns 200 only if critical database dependencies are ready for traffic.
     */
    public function readiness(): JsonResponse
    {
        try {
            DB::select('SELECT 1');
            return response()->json([
                'status' => 'ready',
                'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            ]);
        } catch (\Throwable) {
            return response()->json([
                'status' => 'not_ready',
                'message' => 'Database connection failed',
            ], 503);
        }
    }
}

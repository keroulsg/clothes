<?php

namespace App\Http\Middleware;

use App\Services\SubscriptionUsageService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantWithinUsageLimit
{
    public function __construct(
        protected SubscriptionUsageService $subscriptionService
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $meterKey): Response
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        if (!$tenantId && $request->user()) {
            if ($request->user()->role === 'platform_admin') {
                return $next($request);
            }
            $tenantId = $request->user()->tenant_id;
            app()->instance('current_tenant_id', $tenantId);
        }

        if (!$tenantId) {
            return $next($request);
        }

        $quota = $this->subscriptionService->checkQuota($tenantId, $meterKey, 1);

        if (!$quota['allowed']) {
            return response()->json([
                'error' => 'QUOTA_EXCEEDED',
                'message' => $quota['message'],
                'meter' => [
                    'key' => $quota['meter_key'],
                    'name_ar' => $quota['meter_name_ar'],
                    'name_en' => $quota['meter_name_en'],
                    'unit' => $quota['unit'],
                    'limit' => $quota['limit'],
                    'current_usage' => $quota['current_usage'],
                    'percent_used' => $quota['percent_used'] ?? 100,
                    'plan_name' => $quota['plan_name_ar'],
                ],
                'upgrade_url' => '/#/subscription',
            ], 403);
        }

        $response = $next($request);

        // إضافة ترويسات الشفافية لاستهلاك الحصص والتحذير المبكر عند 80%
        $response->headers->set('X-GarmentOS-Quota-Key', $meterKey);
        $response->headers->set('X-GarmentOS-Quota-Limit', (string) $quota['limit']);
        $response->headers->set('X-GarmentOS-Quota-Remaining', (string) max(0, $quota['limit'] - $quota['current_usage']));
        if (($quota['percent_used'] ?? 0) >= 80) {
            $response->headers->set('X-GarmentOS-Quota-Warning', 'USAGE_APPROACHING_LIMIT');
        }

        return $response;
    }
}


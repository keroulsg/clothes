<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AssignCorrelationId
{
    /**
     * Handle an incoming request.
     * Assigns a unique X-Correlation-ID header and binds it to the logging context.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $request->header('X-Correlation-ID')
            ?: $request->header('X-Request-ID')
            ?: 'req_' . Str::uuid()->toString();

        $request->headers->set('X-Correlation-ID', $correlationId);

        // Bind correlation ID to all log messages generated during this request
        Log::withContext([
            'correlation_id' => $correlationId,
            'tenant_id' => $request->header('X-Tenant-ID') ?? 'unscoped',
        ]);

        $response = $next($request);

        // Attach correlation ID to outbound response headers for tracing
        $response->headers->set('X-Correlation-ID', $correlationId);

        return $response;
    }
}


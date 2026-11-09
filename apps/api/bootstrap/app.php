<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\AssignCorrelationId::class);

        $middleware->alias([
            'role' => \App\Http\Middleware\EnsureRole::class,
            'quota' => \App\Http\Middleware\EnsureTenantWithinUsageLimit::class,
            'marketplace.entitled' => \App\Http\Middleware\EnsureTenantHasMarketplaceEntitlement::class,
            'feature' => \App\Http\Middleware\EnsureFeatureEntitlement::class,
        ]);

        // منع إعادة توجيه طلبات الـ API إلى صفحة ويب غير موجودة
        $middleware->redirectGuestsTo(function (Request $request) {
            return null;
        });
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // إرجاع استجابة JSON موحدة 401 عند عدم مصادقة طلبات الـ API
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'status' => 401,
                ], 401);
            }
        });
    })->create();

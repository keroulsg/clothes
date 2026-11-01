<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // 1. حماية نقاط الدخول والمصادقة من محاولات التخمين (Auth Brute-force protection)
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip())->response(function (Request $request, array $headers) {
                return response()->json([
                    'error' => 'TooManyRequests',
                    'message' => 'تم تجاوز الحد المسموح لمحاولات تسجيل الدخول. يرجى الانتظار دقيقة والمحاولة مرة أخرى.',
                ], 429, $headers);
            });
        });

        // 2. تصفح المتجر الإلكتروني العام وتتبع الطلبات (Public Storefront)
        RateLimiter::for('public-storefront', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // 3. تصفح دليل مصانع وورش وصلة ورش (Marketplace Discovery)
        RateLimiter::for('marketplace-discovery', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // 4. طرح طلبات عروض الأسعار وتقديم العروض (RFQ & Bidding anti-spam)
        RateLimiter::for('marketplace-rfq', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(15)->by($key)->response(function (Request $request, array $headers) {
                return response()->json([
                    'error' => 'TooManyRequests',
                    'message' => 'تم بلوغ الحد الأقصى لطرح العروض المؤقت. يرجى التمهل قليلاً.',
                ], 429, $headers);
            });
        });

        // 5. استلام إشعارات بوابات الدفع الإلكتروني (Webhooks with retry tolerance)
        RateLimiter::for('webhooks', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });

        // 6. عمليات القراءة والاستعلام للمستخدمين المصادقين (General Authenticated Reads)
        RateLimiter::for('api-read', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(180)->by($key);
        });

        // 7. عمليات الإنشاء والتعديل التشغيلية للمصنع (Business Write Operations)
        RateLimiter::for('api-write', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(90)->by($key);
        });

        // 8. تصدير التقارير المالية والتحليلات الضخمة (Heavy Reports & CSV Exports)
        RateLimiter::for('heavy-export', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(15)->by($key)->response(function (Request $request, array $headers) {
                return response()->json([
                    'error' => 'TooManyRequests',
                    'message' => 'جاري معالجة تقارير سابقة، يرجى الانتظار دقيقة قبل طلب تصدير إضافي.',
                ], 429, $headers);
            });
        });

        // 9. العمليات الإدارية الحساسة لإدارة المنصة (Platform Admin Actions)
        RateLimiter::for('admin', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();
            return Limit::perMinute(30)->by($key);
        });
    }
}

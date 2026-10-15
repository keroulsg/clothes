<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    /**
     * التحقق من امتلاك المستخدم لصلاحية المشرف العام الحصرية على المنصة (Platform Administrator)
     * هذا المسار مخصص لإدارة المنصة ولا يرتبط بسياق مستأجر محدد
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        return $next($request);
    }
}

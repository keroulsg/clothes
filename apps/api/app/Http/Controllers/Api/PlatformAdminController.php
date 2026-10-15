<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlatformAdminController extends Controller
{
    /**
     * تفعيل اشتراك المستأجر يدوياً بواسطة المشرف العام مع التحقق الصارم من كود التفويض وسجل الرقابة
     * المسار لا يتطلب سياق مستأجر ويعمل بصلاحيات مشرف المنصة الحصرية
     */
    public function activateSubscription(Request $request, string $id): JsonResponse
    {
        $adminUser = $request->user();
        if (!$adminUser || $adminUser->role !== 'platform_admin') {
            return response()->json([
                'error' => 'PlatformAdminOnly',
                'message' => 'أمان: هذا الإجراء مقصور على مشرفي منصة GarmentOS Cloud المعتمدين فقط.',
            ], 403);
        }

        $validated = $request->validate([
            'authorization_code' => 'required|string',
            'authorized_by' => 'required|string|min:5|max:255',
            'reason' => 'required|string|min:10|max:1000',
            'plan_tier' => 'required|string|in:starter,professional,enterprise',
        ]);

        // 1. التحقق من كود التفويض الأمني للمنصة ومقارنته بالمفتاح المشفر في بيئة التشغيل
        $platformKey = config('services.platform.admin_activation_key', env('PLATFORM_ADMIN_ACTIVATION_KEY'));
        if (empty($platformKey)) {
            return response()->json([
                'error' => 'ServerMisconfiguration',
                'message' => 'أمان: مفتاح تفويض المشرف العام غير مهيأ في بيئة التشغيل. تم إغلاق مسار التفعيل لضمان الأمان (Fail-Closed).',
            ], 500);
        }

        $isCodeValid = hash_equals(
            hash('sha256', (string) $platformKey),
            hash('sha256', (string) $validated['authorization_code'])
        );

        if (!$isCodeValid) {
            return response()->json([
                'error' => 'InvalidAuthorizationCode',
                'message' => 'أمان: كود التفويض الإداري المرفق غير صالح أو غير معتمد من إدارة المنصة.',
            ], 403);
        }

        return DB::transaction(function () use ($request, $adminUser, $id, $validated) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($id);

            $settings = $tenant->settings ?? [];
            $subscription = $settings['subscription'] ?? [];

            $oldValues = $subscription;

            $subscription['status'] = 'active';
            $subscription['is_paid'] = true;
            $subscription['plan_tier'] = $validated['plan_tier'];
            $subscription['activated_at'] = now()->toIso8601String();
            $subscription['expires_at'] = now()->addYear()->toIso8601String();
            $subscription['manual_activation'] = [
                'admin_user_id' => $adminUser->id,
                'admin_email' => $adminUser->email,
                'authorized_by' => $validated['authorized_by'],
                'reason' => $validated['reason'],
                'authorization_code_hash' => hash('sha256', $validated['authorization_code']),
                'timestamp' => now()->toIso8601String(),
                'ip_address' => $request->ip(),
            ];

            $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
            $tenant->status = 'active';
            $tenant->plan_tier = $validated['plan_tier'];
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'action' => 'admin_manual_activation',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'old_values' => $oldValues,
                'new_values' => $subscription['manual_activation'],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'activated',
                'message' => 'تم تفعيل اشتراك الشركة يدوياً بواسطة المشرف العام وتوثيق سجل الرقابة والتدقيق.',
                'tenant' => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'status' => $tenant->status,
                    'plan_tier' => $tenant->plan_tier,
                    'is_paid' => true,
                ],
                'subscription' => $subscription,
            ], 200);
        });
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionWebhookController extends Controller
{
    /**
     * معالجة إشعارات الدفع والاشتراكات الموثقة من بوابة الدفع الإلكتروني (Verified Webhook)
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $signature = $request->header('X-Signature') ?: $request->header('X-Webhook-Signature');
        $secret = config('services.payment.webhook_secret', env('PAYMENT_WEBHOOK_SECRET', 'garmentos_payment_webhook_secret_key_2026'));

        if (empty($signature)) {
            return response()->json([
                'error' => 'MissingSignature',
                'message' => 'أمان: توقيع إشعار الدفع مفقود. تم رفض الطلب.',
            ], 401);
        }

        $payload = $request->getContent();
        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            return response()->json([
                'error' => 'InvalidSignature',
                'message' => 'أمان: توقيع إشعار الدفع غير صالح. محاولة غير مصرح بها.',
            ], 401);
        }

        $validated = $request->validate([
            'event' => 'required|string|in:payment.succeeded,payment.completed,invoice.paid',
            'event_id' => 'nullable|string|max:100',
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'amount' => 'required|numeric|min:1',
            'currency' => 'required|string|in:EGP',
            'invoice_reference' => 'required|string|max:100',
            'status' => 'nullable|string|in:paid,succeeded,completed',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
        ]);

        $eventId = $validated['event_id'] ?? ($validated['invoice_reference'] . ':' . $validated['event']);
        $validated['event_id'] = $eventId;

        return DB::transaction(function () use ($validated, $request) {
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($validated['tenant_id']);
            $settings = $tenant->settings ?? [];
            $subscription = $settings['subscription'] ?? [];

            // التحقق من عدم التكرار (Webhook Idempotency)
            if (($subscription['last_processed_event_id'] ?? null) === $validated['event_id']) {
                return response()->json([
                    'status' => 'already_processed',
                    'message' => 'تمت معالجة إشعار الدفع مسبقاً (Replay Idempotency).',
                    'is_paid' => true,
                    'tenant_id' => $tenant->id,
                ], 200);
            }

            $planTier = $validated['plan_tier'] ?? ($subscription['plan_tier'] ?? $tenant->plan_tier);

            $subscription['status'] = 'active';
            $subscription['is_paid'] = true;
            $subscription['plan_tier'] = $planTier;
            $subscription['activated_at'] = now()->toIso8601String();
            $subscription['expires_at'] = now()->addYear()->toIso8601String();
            $subscription['last_processed_event_id'] = $validated['event_id'];
            $subscription['verified_payment'] = [
                'provider' => 'verified_webhook_provider',
                'event_id' => $validated['event_id'],
                'invoice_reference' => $validated['invoice_reference'],
                'amount' => (float) $validated['amount'],
                'currency' => $validated['currency'],
                'verified_at' => now()->toIso8601String(),
            ];

            $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
            $tenant->status = 'active';
            $tenant->plan_tier = $planTier;
            $tenant->save();

            AuditLog::withoutGlobalScopes()->create([
                'tenant_id' => $tenant->id,
                'user_id' => null,
                'action' => 'subscription_activated_via_webhook',
                'auditable_type' => Tenant::class,
                'auditable_id' => $tenant->id,
                'new_values' => $subscription['verified_payment'],
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'تم التحقق من توقيع الدفع واعتماد الاشتراك التجاري بنجاح.',
                'tenant_id' => $tenant->id,
                'is_paid' => true,
                'plan_tier' => $planTier,
            ], 200);
        });
    }
}

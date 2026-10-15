<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ProcessedWebhookEvent;
use App\Models\SubscriptionPaymentOrder;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionWebhookController extends Controller
{
    /**
     * معالجة إشعارات الدفع الموقعة رقمياً من بوابات الدفع الإلكتروني (Verified Payment Gateway Webhook)
     * يدعم بروتوكولات التحقق القياسية (HMAC-SHA256 مع حماية Timestamp Replay Window والربط بالطلب المعلق)
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        // 1. استرجاع السر المشترك والتحقق الصارم من تهيئته (Fail-Closed)
        $secret = config('services.payment.webhook_secret', env('PAYMENT_WEBHOOK_SECRET'));

        if (empty($secret)) {
            return response()->json([
                'error' => 'ServerMisconfiguration',
                'message' => 'أمان: سر التحقق من إشعارات الدفع (PAYMENT_WEBHOOK_SECRET) غير مهيأ في بيئة التشغيل. تم حظر معالجة الإشعار لضمان الأمان (Fail-Closed).',
            ], 500);
        }

        if (app()->isProduction() && strlen($secret) < 32) {
            return response()->json([
                'error' => 'WeakSecretConfiguration',
                'message' => 'أمان: سر التحقق ضعيف جداً للعمل في بيئة الإنتاج.',
            ], 500);
        }

        // 2. التحقق من التوقيع الرقمي (Signature Verification)
        $rawHeader = $request->header('X-Signature') 
            ?: ($request->header('X-Webhook-Signature') 
            ?: ($request->header('X-Paymob-HMAC') 
            ?: $request->header('Stripe-Signature')));

        if (empty($rawHeader)) {
            return response()->json([
                'error' => 'MissingSignature',
                'message' => 'أمان: توقيع إشعار الدفع الرقمي مفقود في الترويسات. تم رفض الطلب فورياً.',
            ], 401);
        }

        // استخراج التوقيع وطابع الوقت في حال استخدام الصيغة المنظمة t=...,v1=...
        $signature = $rawHeader;
        $timestamp = $request->header('X-Signature-Timestamp') ?: $request->input('timestamp');

        if (str_contains($rawHeader, 't=') && str_contains($rawHeader, 'v1=')) {
            $parts = explode(',', $rawHeader);
            foreach ($parts as $part) {
                if (str_starts_with(trim($part), 't=')) {
                    $timestamp = substr(trim($part), 2);
                } elseif (str_starts_with(trim($part), 'v1=')) {
                    $signature = substr(trim($part), 3);
                }
            }
        }

        // حماية نافذة التوقيت ضد هجمات إعادة الإرسال (Replay Tolerance Window: 300 ثانية)
        if ($timestamp !== null && is_numeric($timestamp)) {
            $currentTime = time();
            if (abs($currentTime - (int)$timestamp) > 300) {
                return response()->json([
                    'error' => 'TimestampToleranceExceeded',
                    'message' => 'أمان: طابع الوقت في إشعار الدفع قديم أو خارج نافذة السماح (أكثر من 300 ثانية). تم رفض المحاولة.',
                ], 401);
            }
        }

        $rawBody = $request->getContent();
        $expectedSignature = hash_hmac('sha256', $rawBody, $secret);

        if (!hash_equals($expectedSignature, $signature)) {
            return response()->json([
                'error' => 'InvalidSignature',
                'message' => 'أمان: التوقيع الرقمي لإشعار الدفع غير صالح أو مزور. تم رفض الطلب.',
            ], 401);
        }

        // 3. التحقق من هيكل بيانات الإشعار
        $validated = $request->validate([
            'event' => 'required|string|in:payment.succeeded,payment.completed,invoice.paid',
            'event_id' => 'nullable|string|max:150',
            'transaction_id' => 'nullable|string|max:150',
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'order_reference' => 'nullable|string|max:100',
            'invoice_reference' => 'nullable|string|max:100',
            'amount' => 'required|numeric|min:1',
            'currency' => 'required|string|in:EGP',
            'status' => 'required|string',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
            'timestamp' => 'nullable|numeric',
        ]);

        $orderReference = $validated['order_reference'] ?? ($validated['invoice_reference'] ?? null);
        if (empty($orderReference)) {
            return response()->json([
                'error' => 'MissingOrderReference',
                'message' => 'أمان: مرجع طلب الدفع (order_reference) مفقود في إشعار الدفع.',
            ], 422);
        }

        $eventId = $validated['event_id'] 
            ?? ($validated['transaction_id'] 
            ?? ($orderReference . ':' . $validated['event']));

        // 4. التحقق من عدم التكرار على مستوى قاعدة البيانات بشكل دائم (Durable Event Uniqueness)
        $existingProcessedEvent = ProcessedWebhookEvent::where('event_id', $eventId)->first();
        if ($existingProcessedEvent) {
            return response()->json([
                'status' => 'already_processed',
                'message' => 'تمت معالجة إشعار الدفع مسبقاً ومثبت في قاعدة البيانات (Durable Replay Idempotency).',
                'event_id' => $eventId,
                'is_paid' => true,
            ], 200);
        }

        return DB::transaction(function () use ($validated, $orderReference, $eventId, $rawBody, $request) {
            // 5. ربط إشعار الدفع بطلب سداد معلق مسبقاً بنفس الشركة والمرجع
            $pendingOrder = SubscriptionPaymentOrder::where('order_reference', $orderReference)
                ->lockForUpdate()
                ->first();

            if (!$pendingOrder) {
                return response()->json([
                    'error' => 'PendingOrderNotFound',
                    'message' => "أمان: لا يوجد طلب دفع معلق مسبقاً مسجل بالمرجع [{$orderReference}]. تم رفض محاولة تفعيل اشتراك غير مقيد بطلب نظامي.",
                ], 422);
            }

            // التحقق الصارم من تطابق هوية الشركة المستأجرة
            if ($pendingOrder->tenant_id !== $validated['tenant_id']) {
                return response()->json([
                    'error' => 'TenantMismatch',
                    'message' => 'أمان: الشركة المستأجرة في إشعار الدفع لا تطابق صاحب طلب الدفع المسجل.',
                ], 422);
            }

            // التحقق من أن حالة طلب الدفع معلقة حصراً (pending)
            if ($pendingOrder->status !== 'pending') {
                return response()->json([
                    'error' => 'InvalidOrderStatus',
                    'message' => "أمان: حالة طلب الدفع الحالية هي [{$pendingOrder->status}] ولا تقبل استلام سداد جديد.",
                ], 422);
            }

            // التحقق من عدم انتهاء صلاحية الطلب
            if ($pendingOrder->isExpired()) {
                $pendingOrder->status = 'expired';
                $pendingOrder->save();
                return response()->json([
                    'error' => 'OrderExpired',
                    'message' => 'أمان: طلب الدفع المعلق منتهي الصلاحية الزمنية.',
                ], 422);
            }

            // التحقق من تطابق المبلغ
            if (abs((float)$pendingOrder->amount - (float)$validated['amount']) >= 0.01) {
                return response()->json([
                    'error' => 'AmountMismatch',
                    'message' => "أمان: المبلغ المدفوع في الإشعار [{$validated['amount']}] لا يطابق القيمة المطلوبة للطلب [{$pendingOrder->amount}].",
                ], 422);
            }

            // التحقق من تطابق العملة
            if (strtoupper($pendingOrder->currency) !== strtoupper($validated['currency'])) {
                return response()->json([
                    'error' => 'CurrencyMismatch',
                    'message' => "أمان: عملة السداد [{$validated['currency']}] لا تطابق عملة الطلب المسجل [{$pendingOrder->currency}].",
                ], 422);
            }

            // التحقق من تطابق الباقة إن وجدت
            if (!empty($validated['plan_tier']) && $pendingOrder->plan_tier !== $validated['plan_tier']) {
                return response()->json([
                    'error' => 'PlanTierMismatch',
                    'message' => "أمان: باقة الاشتراك في الإشعار [{$validated['plan_tier']}] لا تطابق باقة الطلب المسجل [{$pendingOrder->plan_tier}].",
                ], 422);
            }

            // التحقق من حالة الدفع الإيجابية الناجحة حصراً
            $incomingStatus = strtolower($validated['status']);
            if (!in_array($incomingStatus, ['paid', 'succeeded', 'completed'])) {
                $pendingOrder->status = 'failed';
                $pendingOrder->save();
                return response()->json([
                    'error' => 'PaymentNotSuccessful',
                    'message' => "أمان: حالة الدفع في الإشعار هي [{$incomingStatus}] وليست عملية دفع ناجحة.",
                ], 422);
            }

            // 6. توثيق السداد في طلب الدفع
            $pendingOrder->status = 'paid';
            $pendingOrder->paid_at = now();
            $pendingOrder->provider = 'verified_webhook_gateway';
            $pendingOrder->provider_transaction_id = $validated['transaction_id'] ?? $eventId;
            $pendingOrder->save();

            // 7. تسجيل الحدث في جدول الأحداث المعالجة بشكل دائم (Durable Event Storage)
            ProcessedWebhookEvent::create([
                'event_id' => $eventId,
                'provider' => 'verified_webhook_gateway',
                'event_type' => $validated['event'],
                'tenant_id' => $pendingOrder->tenant_id,
                'order_reference' => $orderReference,
                'payload_hash' => hash('sha256', $rawBody),
                'status' => 'processed',
                'processed_at' => now(),
            ]);

            // 8. تفعيل اشتراك الشركة المستأجرة
            $tenant = Tenant::withoutGlobalScopes()->lockForUpdate()->findOrFail($pendingOrder->tenant_id);
            $settings = $tenant->settings ?? [];
            $subscription = $settings['subscription'] ?? [];

            $planTier = $pendingOrder->plan_tier;
            $subscription['status'] = 'active';
            $subscription['is_paid'] = true;
            $subscription['plan_tier'] = $planTier;
            $subscription['activated_at'] = now()->toIso8601String();
            $subscription['expires_at'] = now()->addYear()->toIso8601String();
            $subscription['last_processed_event_id'] = $eventId;
            $subscription['verified_payment'] = [
                'provider' => 'verified_webhook_gateway',
                'event_id' => $eventId,
                'order_reference' => $orderReference,
                'amount' => (float) $validated['amount'],
                'currency' => $validated['currency'],
                'verified_at' => now()->toIso8601String(),
            ];

            $tenant->settings = array_merge($settings, ['subscription' => $subscription]);
            $tenant->status = 'active';
            $tenant->plan_tier = $planTier;
            $tenant->save();

            // 9. تسجيل التدقيق الرقابي
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
                'message' => 'تم التحقق من إشعار الدفع وتوثيق السداد وتفعيل اشتراك الشركة بنجاح.',
                'is_paid' => true,
                'order_reference' => $orderReference,
                'plan_tier' => $planTier,
            ], 200);
        });
    }
}

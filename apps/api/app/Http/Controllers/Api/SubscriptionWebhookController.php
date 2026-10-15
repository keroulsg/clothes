<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ProcessedWebhookEvent;
use App\Models\SubscriptionPaymentOrder;
use App\Models\Tenant;
use App\Services\Payment\WebhookVerifierFactory;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubscriptionWebhookController extends Controller
{
    /**
     * معالجة إشعارات الدفع الموقعة رقمياً من مزودي خدمة الدفع (Verified Payment Gateway Webhook)
     * يدعم بروتوكولات Stripe و Paymob الرسمية و Standard HMAC مع التحقق الإلزامي من Timestamp Replay Tolerance
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
                'message' => 'أمان: سر التحقق ضعيف جداً للعمل في بيئة الإنتاج (يجب ألا يقل عن 32 حرفاً).',
            ], 500);
        }

        // 2. التحقق من التوقيع الرقمي حسب بروتوكول المزود الرسمي
        $verifier = WebhookVerifierFactory::resolve($request);
        $verificationResult = $verifier->verify($request, $secret);

        if (!$verificationResult->isValid) {
            return response()->json([
                'error' => $verificationResult->errorCode,
                'message' => $verificationResult->errorMessage,
            ], 401);
        }

        // 3. التحقق من هيكل بيانات الإشعار
        $validated = $request->validate([
            'event' => 'required|string|max:150',
            'event_id' => 'nullable|string|max:150',
            'transaction_id' => 'nullable|string|max:150',
            'tenant_id' => 'required|uuid|exists:tenants,id',
            'order_reference' => 'nullable|string|max:100',
            'invoice_reference' => 'nullable|string|max:100',
            'amount' => 'required|numeric|min:0.01',
            'currency' => 'required|string|in:EGP,USD,EUR',
            'status' => 'required|string',
            'plan_tier' => 'nullable|string|in:starter,professional,enterprise',
            'timestamp' => 'nullable',
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

        // 4. فحص مسبق لعدم التكرار الدائم (Durable Event Storage Pre-check)
        $existingProcessedEvent = ProcessedWebhookEvent::where('event_id', $eventId)->first();
        if ($existingProcessedEvent) {
            return response()->json([
                'status' => 'already_processed',
                'message' => 'تمت معالجة إشعار الدفع مسبقاً ومثبت في قاعدة البيانات (Durable Replay Idempotency).',
                'event_id' => $eventId,
                'is_paid' => true,
            ], 200);
        }

        $rawBody = $request->getContent();
        $providerName = $verificationResult->provider ?? 'payment_gateway';

        try {
            return DB::transaction(function () use ($validated, $orderReference, $eventId, $rawBody, $request, $providerName) {
                // 5. ربط إشعار الدفع بطلب سداد مسجل مسبقاً بنفس المرجع وقفل السجل لمنع التزامن
                $pendingOrder = SubscriptionPaymentOrder::where('order_reference', $orderReference)
                    ->lockForUpdate()
                    ->first();

                if (!$pendingOrder) {
                    return response()->json([
                        'error' => 'PendingOrderNotFound',
                        'message' => "أمان: لا يوجد طلب دفع مسجل بالمرجع [{$orderReference}]. تم رفض محاولة تفعيل اشتراك غير مقيد بطلب نظامي.",
                    ], 422);
                }

                // التحقق الصارم من تطابق هوية الشركة المستأجرة
                if ($pendingOrder->tenant_id !== $validated['tenant_id']) {
                    return response()->json([
                        'error' => 'TenantMismatch',
                        'message' => 'أمان: الشركة المستأجرة في إشعار الدفع لا تطابق صاحب طلب الدفع المسجل.',
                    ], 422);
                }

                // في حال كان الطلب مسدداً ومكتملاً مسبقاً: إقرار نجاح دون مضاعفة التفعيل
                if ($pendingOrder->isAlreadyPaid()) {
                    return response()->json([
                        'status' => 'already_completed',
                        'message' => 'طلب الدفع مكتمل ومسدد مسبقاً بالفعل.',
                        'is_paid' => true,
                        'order_reference' => $orderReference,
                    ], 200);
                }

                // التحقق من صلاحية الطلب الزمنية
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

                // 6. فحص حالة الدفع مع دعم دورة حياة الحالات وإمكانية إعادة المحاولة (Documented State Transitions)
                $incomingStatus = strtolower($validated['status']);
                $isSuccessful = in_array($incomingStatus, ['paid', 'succeeded', 'completed']);

                if (!$isSuccessful) {
                    // الانتقال إلى حالة المحاولة الفاشلة القابلة لإعادة المحاولة طالما لم تنته الصلاحية
                    $pendingOrder->status = 'payment_attempt_failed';
                    $metadata = $pendingOrder->metadata ?? [];
                    $metadata['attempts'][] = [
                        'status' => $incomingStatus,
                        'event_id' => $eventId,
                        'timestamp' => now()->toIso8601String(),
                        'error' => $validated['error'] ?? 'Payment transaction reported non-success status',
                    ];
                    $pendingOrder->metadata = $metadata;
                    $pendingOrder->save();

                    // تسجيل الحدث غير الناجح لمنع معالجة نفس الإشعار الفاشل مجدداً
                    try {
                        ProcessedWebhookEvent::create([
                            'event_id' => $eventId,
                            'provider' => $providerName,
                            'event_type' => $validated['event'],
                            'tenant_id' => $pendingOrder->tenant_id,
                            'order_reference' => $orderReference,
                            'payload_hash' => hash('sha256', $rawBody),
                            'status' => 'attempt_failed',
                            'processed_at' => now(),
                        ]);
                    } catch (QueryException) {
                        // في حال حدوث تصادم تزامن على نفس الـ event_id
                    }

                    return response()->json([
                        'error' => 'PaymentNotSuccessful',
                        'message' => "أمان: حالة الدفع في الإشعار هي [{$incomingStatus}]. تم تسجيل محاولة السداد الفاشلة مع إبقاء الطلب متاحاً لإعادة المحاولة قبل انتهاء الصلاحية.",
                        'order_status' => 'payment_attempt_failed',
                        'can_retry' => true,
                    ], 422);
                }

                // 7. توثيق السداد الناجح في طلب الدفع
                $pendingOrder->status = 'paid';
                $pendingOrder->paid_at = now();
                $pendingOrder->provider = $providerName;
                $pendingOrder->provider_transaction_id = $validated['transaction_id'] ?? $eventId;
                $pendingOrder->save();

                // 8. تسجيل الحدث في جدول الأحداث المعالجة بشكل دائم (Durable Event Storage)
                try {
                    ProcessedWebhookEvent::create([
                        'event_id' => $eventId,
                        'provider' => $providerName,
                        'event_type' => $validated['event'],
                        'tenant_id' => $pendingOrder->tenant_id,
                        'order_reference' => $orderReference,
                        'payload_hash' => hash('sha256', $rawBody),
                        'status' => 'processed',
                        'processed_at' => now(),
                    ]);
                } catch (QueryException $e) {
                    // في حال تكرار نفس الحدث تحت التزامن الشديد: نلغي التكرار ونقر بنجاحه Idempotent Replay
                    if (str_contains($e->getMessage(), 'UNIQUE') || str_contains($e->getMessage(), 'Duplicate entry') || $e->getCode() == 23000) {
                        return response()->json([
                            'status' => 'already_processed',
                            'message' => 'تمت معالجة إشعار الدفع متزامناً (Durable Replay Idempotency).',
                            'is_paid' => true,
                        ], 200);
                    }
                    throw $e;
                }

                // 9. تفعيل اشتراك الشركة المستأجرة
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
                    'provider' => $providerName,
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

                // 10. تسجيل التدقيق الرقابي للمعاملة
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
        } catch (\Throwable $e) {
            throw $e;
        }
    }
}

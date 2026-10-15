<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\ProcessedWebhookEvent;
use App\Models\SubscriptionPaymentOrder;
use App\Models\Tenant;
use App\Services\Payment\ValidatedPaymentWebhookEvent;
use App\Services\Payment\WebhookVerifierFactory;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SubscriptionWebhookController extends Controller
{
    /**
     * معالجة إشعارات الدفع المعتمدة رقمياً من بوابات الدفع (Stripe / Paymob / Standard)
     * تدعم المعالجة الحتمية للمزود، وتطبيع الحقول، ودورة حالات طلب السداد، والمعاملات الذرية.
     */
    public function handleWebhook(Request $request, ?string $provider = null): JsonResponse
    {
        // 1. التحديد الحتمي لنوع مزود الخدمة
        $resolvedProvider = WebhookVerifierFactory::determineProvider($request, $provider);

        // 2. استرجاع سر التوقيع الرقمي الخاص بالمزود المحدد حصراً (Provider-Specific Secret Resolution)
        $secret = match ($resolvedProvider) {
            'stripe' => config('services.stripe.webhook_secret') 
                ?? config('services.payment.stripe_webhook_secret'),
            'paymob' => config('services.paymob.hmac_secret') 
                ?? config('services.payment.paymob_hmac_secret'),
            default => config('services.payment.webhook_secret'),
        };

        if (empty($secret)) {
            return response()->json([
                'error' => 'ServerMisconfiguration',
                'message' => "أمان: سر التحقق من إشعارات الدفع الخاص بـ [{$resolvedProvider}] غير مهيأ. تم حظر المعالجة لضمان الأمان (Fail-Closed).",
            ], 500);
        }

        // فحص قوة السر (Secret Strength Check) دون طباعة أو تسريب السر في السجلات
        if (strlen((string)$secret) < 16 || (app()->isProduction() && strlen((string)$secret) < 32)) {
            return response()->json([
                'error' => 'WeakSecretConfiguration',
                'message' => 'أمان: سر التحقق ضعيف جداً للعمل في بيئة النظام (يجب ألا يقل عن الحد الأدنى المعتمد).',
            ], 500);
        }

        // 3. التحقق الحتمي من التوقيع الرقمي عبر المزود المعتمد
        $verifier = WebhookVerifierFactory::resolve($request, $resolvedProvider);
        $verificationResult = $verifier->verify($request, $secret);

        if (!$verificationResult->isValid) {
            return response()->json([
                'error' => $verificationResult->errorCode,
                'message' => $verificationResult->errorMessage,
            ], 401);
        }

        // 4. تطبيع بيانات الإشعار الأصلية إلى العقد الداخلي الموحد (Validated Internal Event Contract)
        $normalizer = WebhookVerifierFactory::resolveNormalizer($verifier->getProviderName());
        try {
            $event = $normalizer->normalize($request->json()->all(), $verificationResult->verifiedTimestamp);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'error' => 'MalformedWebhookPayload',
                'message' => 'أمان: تعذر تطبيع بيانات إشعار الدفع أو حدث خطأ في بنية البيانات: ' . $e->getMessage(),
            ], 422);
        }

        // 5. فحص مسبق لعدم التكرار الدائم متوافق مع النتيجة الفعلية المسجلة (Durable Event Storage Idempotency)
        $existingEvent = ProcessedWebhookEvent::where('provider', $event->provider)
            ->where('event_id', $event->eventId)
            ->first();

        if ($existingEvent) {
            return $this->buildIdempotentResponse($existingEvent);
        }

        // 5. المعالجة الذرية داخل معاملة قاعدة البيانات (Atomic Transaction Execution)
        try {
            return DB::transaction(function () use ($event, $request) {
                // استرجاع طلب الدفع المعلق بناءً على مرجع الطلب الموثق وقفل السجل لمنع تضارب التزامن
                $order = SubscriptionPaymentOrder::where('order_reference', $event->orderReference)
                    ->lockForUpdate()
                    ->first();

                if (!$order) {
                    return response()->json([
                        'error' => 'PendingOrderNotFound',
                        'message' => "أمان: لا يوجد طلب دفع مسجل بالمرجع [{$event->orderReference}]. تم رفض محاولة تفعيل اشتراك غير مقيد بطلب نظامي.",
                    ], 422);
                }

                // التحقق من تطابق الشركة إذا تم إرسالها في الإشعار
                $claimedTenantId = $request->input('tenant_id') ?? ($event->rawPayload['tenant_id'] ?? null);
                if (!empty($claimedTenantId) && (string)$claimedTenantId !== (string)$order->tenant_id) {
                    return response()->json([
                        'error' => 'TenantMismatch',
                        'message' => 'أمان: الشركة المحددة في الإشعار تخالف الشركة المسجلة لطلب الدفع المالي.',
                    ], 422);
                }

                // التحقق من تطابق باقة الاشتراك إذا تم إرسالها في الإشعار لمنع الترقية غير المصرح بها
                $claimedPlan = $request->input('plan_tier') ?? ($event->rawPayload['plan_tier'] ?? null);
                if (!empty($claimedPlan) && (string)$claimedPlan !== (string)$order->plan_tier) {
                    return response()->json([
                        'error' => 'PlanMismatch',
                        'message' => 'أمان: باقة الاشتراك المحددة في الإشعار تخالف الباقة المسجلة في طلب الدفع.',
                    ], 422);
                }

                // استرجاع الشركة من السجل الموثق في قاعدة البيانات حصراً
                $tenant = Tenant::findOrFail($order->tenant_id);

                // إذا كان الطلب مسدداً ومكتملاً مسبقاً: إقرار نجاح دون مضاعفة السجلات
                if ($order->isAlreadyPaid()) {
                    $this->recordProcessedEvent($event, $tenant->id, $order->order_reference, 'already_paid');

                    return response()->json([
                        'status' => 'already_completed',
                        'message' => 'طلب الدفع مكتمل ومسدد مسبقاً بالفعل.',
                        'is_paid' => true,
                        'order_reference' => $order->order_reference,
                    ], 200);
                }

                // التحقق من صلاحية الطلب الزمنية
                if ($order->isExpired()) {
                    if ($order->canTransitionTo('expired')) {
                        $order->status = 'expired';
                        $order->save();
                    }
                    $this->recordProcessedEvent($event, $tenant->id, $order->order_reference, 'expired_ignored');

                    return response()->json([
                        'error' => 'OrderExpired',
                        'message' => 'أمان: طلب الدفع المعلق منتهي الصلاحية الزمنية ولا يمكن سداده.',
                    ], 422);
                }

                // التحقق من عدم إلغاء الطلب
                if ($order->isCancelled()) {
                    return response()->json([
                        'error' => 'OrderCancelled',
                        'message' => 'أمان: تم إلغاء طلب الدفع المعلق مسبقاً.',
                    ], 422);
                }

                // التحقق الصارم من تطابق المبلغ
                if (abs((float)$order->amount - $event->amount) >= 0.01) {
                    return response()->json([
                        'error' => 'AmountMismatch',
                        'message' => "أمان: المبلغ المدفوع في الإشعار [{$event->amount}] لا يطابق القيمة المطلوبة للطلب [{$order->amount}].",
                    ], 422);
                }

                // التحقق من تطابق العملة
                if ($order->currency !== $event->currency) {
                    return response()->json([
                        'error' => 'CurrencyMismatch',
                        'message' => "أمان: عملة السداد في الإشعار [{$event->currency}] تخالف عملة الطلب [{$order->currency}].",
                    ], 422);
                }

                // 6. التحقق من حالة نجاح السداد
                if (!$event->isSuccess) {
                    // توثيق فشل محاولة السداد مع تمكين إعادة المحاولة
                    if ($order->canTransitionTo('payment_attempt_failed')) {
                        $order->status = 'payment_attempt_failed';
                        $order->provider = $event->provider;
                        $order->provider_transaction_id = $event->providerTransactionId;
                        $order->save();
                    }

                    $this->recordProcessedEvent($event, $tenant->id, $order->order_reference, 'failed_attempt');

                    return response()->json([
                        'error' => 'PaymentNotSuccessful',
                        'message' => 'حالة إشعار الدفع تفيد بعدم اكتمال السداد أو رفض العملية من البوابة.',
                        'order_reference' => $order->order_reference,
                        'order_status' => $order->status,
                        'can_retry' => true,
                    ], 422);
                }

                // 7. تطبيق التفعيل المالي الكامل (Successful Payment Transition)
                $order->status = 'paid';
                $order->paid_at = now();
                $order->provider = $event->provider;
                $order->provider_transaction_id = $event->providerTransactionId;
                $order->save();

                // تفعيل اشتراك الشركة المستأجرة بالباقة المعتمدة في الطلب
                $tenant->is_paid = true;
                $tenant->plan_tier = $order->plan_tier;
                $tenant->status = 'active';

                $settings = $tenant->settings ?? [];
                $settings['subscription'] = array_merge($settings['subscription'] ?? [], [
                    'status' => 'active',
                    'plan' => $order->plan_tier,
                    'is_paid' => true,
                    'paid_at' => now()->toIso8601String(),
                    'billing_cycle' => $order->billing_cycle,
                    'provider' => $event->provider,
                    'order_reference' => $order->order_reference,
                    'last_transaction_id' => $event->providerTransactionId,
                ]);
                $tenant->settings = $settings;
                $tenant->save();

                // حفظ قيد الإشعار المعالج (Processed Webhook Event)
                $this->recordProcessedEvent($event, $tenant->id, $order->order_reference, 'processed');

                // تسجيل قيد رقابي في سجل التدقيق الأمني (Audit Log)
                AuditLog::create([
                    'tenant_id' => $tenant->id,
                    'user_id' => null,
                    'action' => 'subscription_activated_via_webhook',
                    'auditable_type' => 'Tenant',
                    'auditable_id' => (string)$tenant->id,
                    'ip_address' => $request->ip(),
                    'new_values' => [
                        'provider' => $event->provider,
                        'event_id' => $event->eventId,
                        'event_type' => $event->eventType,
                        'order_reference' => $order->order_reference,
                        'amount' => $order->amount,
                        'currency' => $order->currency,
                        'plan_tier' => $order->plan_tier,
                        'provider_transaction_id' => $event->providerTransactionId,
                    ],
                ]);

                return response()->json([
                    'status' => 'success',
                    'message' => 'تم التحقق من إشعار الدفع وتفعيل اشتراك الشركة بنجاح وبشكل ذري.',
                    'order_reference' => $order->order_reference,
                    'tenant_id' => $tenant->id,
                    'plan_tier' => $order->plan_tier,
                    'provider' => $event->provider,
                    'is_paid' => true,
                ], 200);
            });
        } catch (QueryException $e) {
            // معالجة تصادم الإشعارات المتزامنة على مستوى قيد التفرد (Unique Constraint Collision Race)
            $msg = $e->getMessage();
            $isDuplicateEvent = (
                $e->getCode() == 23000 
                || $e->getCode() === '23505'
                || stripos($msg, 'unique') !== false
                || stripos($msg, 'duplicate') !== false
            ) && (
                stripos($msg, 'processed_webhook_events') !== false
                || stripos($msg, 'uniq_pwe') !== false
                || stripos($msg, 'event_id') !== false
            );

            if ($isDuplicateEvent) {
                // إعادة محاولة قراءة السجل المثبت بعد اكتمال المعاملة المتزامنة المنافسة
                $committedEvent = null;
                for ($attempt = 0; $attempt < 20; $attempt++) {
                    $committedEvent = ProcessedWebhookEvent::where('provider', $event->provider)
                        ->where('event_id', $event->eventId)
                        ->first();

                    if ($committedEvent) {
                        break;
                    }

                    usleep(25000); // 25ms delay allowing competing transaction to finish commit
                }

                if ($committedEvent) {
                    return $this->buildIdempotentResponse($committedEvent);
                }

                // إذا تعذر التحقق من نتيجة المعاملة المتزامنة بأمان، نرجع خطأ 409 قابلاً لإعادة المحاولة دون ادعاء النجاح
                return response()->json([
                    'error' => 'ConcurrentProcessingConflict',
                    'message' => 'يتم معالجة هذا الإشعار حالياً بشكل متزامن. يرجى إعادة المحاولة لاحقاً (Retryable Concurrency Conflict).',
                    'provider' => $event->provider,
                    'event_id' => $event->eventId,
                    'is_paid' => false,
                ], 409);
            }

            throw $e;
        }
    }

    private function buildIdempotentResponse(ProcessedWebhookEvent $existingEvent): JsonResponse
    {
        $status = $existingEvent->status;

        if (in_array($status, ['processed', 'already_paid', 'completed', 'paid'], true)) {
            return response()->json([
                'status' => 'already_processed',
                'message' => 'تم استلام ومعالجة هذا الإشعار مسبقاً بنجاح ومثبت في قاعدة البيانات (Durable Replay Idempotency).',
                'provider' => $existingEvent->provider,
                'event_id' => $existingEvent->event_id,
                'order_reference' => $existingEvent->order_reference,
                'is_paid' => true,
            ], 200);
        }

        if (in_array($status, ['failed_attempt', 'payment_attempt_failed', 'failed'], true)) {
            return response()->json([
                'error' => 'PaymentNotSuccessful',
                'status' => 'failed_attempt',
                'message' => 'تم تسجيل فشل محاولة السداد مسبقاً لهذا الإشعار ولا يعتبر مدفوعاً.',
                'provider' => $existingEvent->provider,
                'event_id' => $existingEvent->event_id,
                'order_reference' => $existingEvent->order_reference,
                'is_paid' => false,
                'can_retry' => true,
            ], 422);
        }

        if (in_array($status, ['expired_ignored', 'expired'], true)) {
            return response()->json([
                'error' => 'OrderExpired',
                'status' => 'expired',
                'message' => 'طلب الدفع المرتبط بهذا الإشعار منتهي الصلاحية وتم تسجيله مسبقاً كطلب غير قابل للسداد.',
                'provider' => $existingEvent->provider,
                'event_id' => $existingEvent->event_id,
                'order_reference' => $existingEvent->order_reference,
                'is_paid' => false,
                'can_retry' => false,
            ], 422);
        }

        return response()->json([
            'status' => $status,
            'message' => 'تم تسجيل هذا الإشعار مسبقاً في النظام.',
            'provider' => $existingEvent->provider,
            'event_id' => $existingEvent->event_id,
            'order_reference' => $existingEvent->order_reference,
            'is_paid' => false,
        ], 200);
    }

    private function recordProcessedEvent(ValidatedPaymentWebhookEvent $event, string $tenantId, string $orderReference, string $status): void
    {
        ProcessedWebhookEvent::create([
            'id' => (string) Str::uuid(),
            'event_id' => $event->eventId,
            'provider' => $event->provider,
            'event_type' => $event->eventType,
            'tenant_id' => $tenantId,
            'order_reference' => $orderReference,
            'payload_hash' => $event->payloadHash,
            'status' => $status,
            'processed_at' => now(),
        ]);
    }
}

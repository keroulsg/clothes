<?php

namespace App\Services\Payment;

use InvalidArgumentException;

/**
 * تطبيع إشعارات Stripe الرسمية
 * يدعم كائنات Checkout Session و PaymentIntent مع تحويل العملات من minor units (Cents).
 */
class StripeEventNormalizer implements PaymentEventNormalizerInterface
{
    private const SUPPORTED_EVENTS = [
        'checkout.session.completed',
        'checkout.session.async_payment_succeeded',
        'checkout.session.async_payment_failed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled',
        // صيغ الأحداث المعيارية للاختبارات
        'payment.completed',
        'payment.failed',
    ];

    public function normalize(array $payload, ?int $verifiedTimestamp = null): ValidatedPaymentWebhookEvent
    {
        // 1. معالجة هيكل Stripe الرسمي { id: "evt_...", type: "...", data: { object: { ... } } }
        if (isset($payload['type']) && isset($payload['data']['object']) && is_array($payload['data']['object'])) {
            $eventType = (string) $payload['type'];
            if (!in_array($eventType, self::SUPPORTED_EVENTS, true)) {
                throw new InvalidArgumentException("حدث Stripe غير مدعوم للمعالجة المالية: [{$eventType}]");
            }

            $obj = $payload['data']['object'];
            $eventId = (string) ($payload['id'] ?? ('evt_' . uniqid()));

            // استخراج مرجع الطلب الداخلي من metadata أو client_reference_id
            $orderReference = $obj['metadata']['order_reference'] 
                ?? ($obj['client_reference_id'] 
                ?? ($obj['metadata']['order_id'] ?? null));

            if (empty($orderReference)) {
                throw new InvalidArgumentException('مرجع طلب الدفع (order_reference) مفقود في metadata أو client_reference_id لكائن Stripe.');
            }

            // استخراج المبلغ بدقة من minor units (cents) إلى major units
            $rawAmount = $obj['amount_total'] ?? ($obj['amount'] ?? null);
            if ($rawAmount === null || !is_numeric($rawAmount) || (float)$rawAmount <= 0) {
                throw new InvalidArgumentException('مبلغ المعاملة غير صالح أو مفقود في كائن Stripe.');
            }
            $amount = round(((float)$rawAmount) / 100.0, 2);

            $currency = strtoupper((string)($obj['currency'] ?? 'EGP'));
            $txId = (string)($obj['payment_intent'] ?? ($obj['id'] ?? null));

            $isSuccess = false;
            $canRetry = true;

            if ($eventType === 'checkout.session.completed' || $eventType === 'checkout.session.async_payment_succeeded') {
                $paymentStatus = $obj['payment_status'] ?? null;
                $isSuccess = ($paymentStatus === 'paid');
            } elseif ($eventType === 'payment_intent.succeeded') {
                $status = $obj['status'] ?? null;
                $isSuccess = ($status === 'succeeded');
            } elseif (str_contains($eventType, 'failed') || str_contains($eventType, 'canceled')) {
                $isSuccess = false;
                $canRetry = true;
            }

            return ValidatedPaymentWebhookEvent::create(
                provider: 'stripe',
                eventId: $eventId,
                eventType: $eventType,
                orderReference: $orderReference,
                providerTransactionId: $txId,
                amount: $amount,
                currency: $currency,
                isSuccess: $isSuccess,
                canRetry: $canRetry,
                timestamp: $verifiedTimestamp ?? (isset($payload['created']) ? (int)$payload['created'] : null),
                rawPayload: $payload
            );
        }

        // 2. معالجة الإشعار المباشر (Direct Formatted Webhook)
        $eventType = (string) ($payload['event'] ?? ($payload['type'] ?? 'payment.unknown'));
        $orderReference = $payload['order_reference'] ?? ($payload['invoice_reference'] ?? null);

        if (empty($orderReference)) {
            throw new InvalidArgumentException('مرجع طلب الدفع (order_reference) مفقود في إشعار الدفع.');
        }

        $eventId = (string) ($payload['event_id'] ?? ($payload['id'] ?? ($orderReference . ':' . $eventType)));
        $rawAmount = $payload['amount'] ?? null;
        if ($rawAmount === null || !is_numeric($rawAmount) || (float)$rawAmount <= 0) {
            throw new InvalidArgumentException('قيمة المبلغ غير صحيحة في إشعار الدفع.');
        }

        $amount = (float) $rawAmount;
        $currency = strtoupper((string) ($payload['currency'] ?? 'EGP'));
        $txId = $payload['transaction_id'] ?? ($payload['provider_transaction_id'] ?? null);
        $status = strtolower((string) ($payload['status'] ?? ''));

        $isSuccess = in_array($status, ['succeeded', 'paid', 'success', 'completed'], true) 
            || ($eventType === 'payment.completed');

        return ValidatedPaymentWebhookEvent::create(
            provider: 'stripe',
            eventId: $eventId,
            eventType: $eventType,
            orderReference: $orderReference,
            providerTransactionId: $txId,
            amount: $amount,
            currency: $currency,
            isSuccess: $isSuccess,
            canRetry: true,
            timestamp: $verifiedTimestamp,
            rawPayload: $payload
        );
    }
}

<?php

namespace App\Services\Payment;

use InvalidArgumentException;

/**
 * تطبيع إشعارات HMAC المعيارية
 */
class StandardHmacEventNormalizer implements PaymentEventNormalizerInterface
{
    public function normalize(array $payload, ?int $verifiedTimestamp = null): ValidatedPaymentWebhookEvent
    {
        $orderReference = $payload['order_reference'] ?? ($payload['invoice_reference'] ?? null);
        if (empty($orderReference)) {
            throw new InvalidArgumentException('مرجع طلب الدفع (order_reference) مفقود في إشعار الدفع.');
        }

        $rawAmount = $payload['amount'] ?? null;
        if ($rawAmount === null || !is_numeric($rawAmount) || (float)$rawAmount <= 0) {
            throw new InvalidArgumentException('قيمة المبلغ غير صحيحة في إشعار الدفع.');
        }

        $amount = (float) $rawAmount;
        $currency = strtoupper((string) ($payload['currency'] ?? 'EGP'));
        $eventType = (string) ($payload['event'] ?? 'payment.completed');
        $eventId = (string) ($payload['event_id'] ?? ($payload['transaction_id'] ?? ($orderReference . ':' . $eventType)));
        $txId = (string) ($payload['transaction_id'] ?? $eventId);

        $status = strtolower((string) ($payload['status'] ?? ''));
        if ($status !== '') {
            $isSuccess = in_array($status, ['succeeded', 'paid', 'success', 'completed'], true);
        } else {
            $isSuccess = in_array($eventType, ['payment.completed', 'payment.succeeded'], true);
        }

        return ValidatedPaymentWebhookEvent::create(
            provider: 'standard',
            eventId: $eventId,
            eventType: $eventType,
            orderReference: (string) $orderReference,
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

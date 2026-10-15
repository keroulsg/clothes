<?php

namespace App\Services\Payment;

use InvalidArgumentException;

/**
 * تطبيع إشعارات وكولباك Paymob الرسمي
 * يدعم معاملات الدفع ومعالجة العملات الصغرى (amount_cents) والتحقق من حالة نجاح المعاملة
 */
class PaymobEventNormalizer implements PaymentEventNormalizerInterface
{
    public function normalize(array $payload, ?int $verifiedTimestamp = null): ValidatedPaymentWebhookEvent
    {
        // 1. معالجة كولباك Paymob الرسمي الذي يحتوي على كائن obj
        if (isset($payload['obj']) && is_array($payload['obj'])) {
            $obj = $payload['obj'];

            $txId = (string) ($obj['id'] ?? '');
            if (empty($txId)) {
                throw new InvalidArgumentException('معرف المعاملة (id) مفقود في كائن Paymob.');
            }

            // استخراج مرجع الطلب المسجل في نظامنا من merchant_order_id
            $orderReference = $obj['order']['merchant_order_id'] 
                ?? ($obj['order']['special_reference'] 
                ?? ($obj['special_reference'] ?? null));

            if (empty($orderReference)) {
                throw new InvalidArgumentException('مرجع الطلب الداخلي (merchant_order_id) مفقود في كائن طلب Paymob.');
            }

            // تحويل amount_cents إلى وحدات العملة الأساسية (Major units)
            $amountCents = $obj['amount_cents'] ?? null;
            if ($amountCents === null || !is_numeric($amountCents) || (float)$amountCents <= 0) {
                throw new InvalidArgumentException('قيمة المبلغ بالقرش (amount_cents) غير صحيحة في كائن Paymob.');
            }
            $amount = round(((float)$amountCents) / 100.0, 2);

            $currency = strtoupper((string) ($obj['currency'] ?? 'EGP'));

            // فحص حالة النجاح الصارمة حسب توثيق Paymob
            $isSuccess = ($obj['success'] === true || $obj['success'] === 'true')
                && empty($obj['error_occured'])
                && empty($obj['is_voided'])
                && empty($obj['is_refunded'])
                && empty($obj['pending']);

            $eventId = 'paymob_' . $txId;
            $eventType = $isSuccess ? 'payment.completed' : 'payment.failed';

            return ValidatedPaymentWebhookEvent::create(
                provider: 'paymob',
                eventId: $eventId,
                eventType: $eventType,
                orderReference: (string) $orderReference,
                providerTransactionId: $txId,
                amount: $amount,
                currency: $currency,
                isSuccess: $isSuccess,
                canRetry: true,
                timestamp: $verifiedTimestamp ?? (isset($obj['created_at']) ? strtotime((string)$obj['created_at']) : null),
                rawPayload: $payload
            );
        }

        // 2. معالجة الإشعار المباشر (Direct Formatted Webhook)
        $orderReference = $payload['order_reference'] ?? ($payload['merchant_order_id'] ?? null);
        if (empty($orderReference)) {
            throw new InvalidArgumentException('مرجع طلب الدفع (order_reference) مفقود في إشعار Paymob.');
        }

        $rawAmount = $payload['amount'] ?? ($payload['amount_cents'] ? ((float)$payload['amount_cents'] / 100.0) : null);
        if ($rawAmount === null || !is_numeric($rawAmount) || (float)$rawAmount <= 0) {
            throw new InvalidArgumentException('مبلغ المعاملة غير صالح في إشعار Paymob.');
        }

        $amount = (float) $rawAmount;
        $currency = strtoupper((string) ($payload['currency'] ?? 'EGP'));
        $txId = (string) ($payload['transaction_id'] ?? ($payload['id'] ?? ('tx_' . uniqid())));
        $eventId = (string) ($payload['event_id'] ?? ('paymob_' . $txId));
        $eventType = (string) ($payload['event'] ?? 'payment.completed');

        $status = strtolower((string) ($payload['status'] ?? ''));
        $isSuccess = in_array($status, ['succeeded', 'paid', 'success', 'completed'], true) 
            || ($payload['success'] ?? false) === true
            || ($eventType === 'payment.completed');

        return ValidatedPaymentWebhookEvent::create(
            provider: 'paymob',
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

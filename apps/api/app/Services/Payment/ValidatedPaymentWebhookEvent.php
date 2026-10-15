<?php

namespace App\Services\Payment;

/**
 * العقد الداخلي الموحد والمتحقق منه لإشعارات بوابات الدفع (Validated Internal Payment Event Contract)
 * يُنشأ حصراً بعد التحقق الصارم من التوقيع الرقمي للمزود وتطبيع الحقول (Normalization).
 */
class ValidatedPaymentWebhookEvent
{
    public function __construct(
        public readonly string $provider,
        public readonly string $eventId,
        public readonly string $eventType,
        public readonly string $orderReference,
        public readonly ?string $providerTransactionId,
        public readonly float $amount,
        public readonly string $currency,
        public readonly bool $isSuccess,
        public readonly bool $canRetry,
        public readonly ?int $timestamp,
        public readonly array $rawPayload,
        public readonly string $payloadHash
    ) {
    }

    public static function create(
        string $provider,
        string $eventId,
        string $eventType,
        string $orderReference,
        ?string $providerTransactionId,
        float $amount,
        string $currency,
        bool $isSuccess,
        bool $canRetry = true,
        ?int $timestamp = null,
        array $rawPayload = []
    ): self {
        $hash = hash('sha256', json_encode($rawPayload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return new self(
            provider: strtolower(trim($provider)),
            eventId: trim($eventId),
            eventType: trim($eventType),
            orderReference: trim($orderReference),
            providerTransactionId: $providerTransactionId ? trim($providerTransactionId) : null,
            amount: round($amount, 2),
            currency: strtoupper(trim($currency)),
            isSuccess: $isSuccess,
            canRetry: $canRetry,
            timestamp: $timestamp,
            rawPayload: $rawPayload,
            payloadHash: $hash
        );
    }
}

<?php

namespace App\Services\Payment;

class WebhookVerificationResult
{
    public ?int $verifiedTimestamp = null;

    public function __construct(
        public bool $isValid,
        public ?string $errorCode = null,
        public ?string $errorMessage = null,
        public ?int $timestamp = null,
        public ?string $provider = null,
    ) {
        $this->verifiedTimestamp = $timestamp;
    }

    public static function success(?int $timestamp, string $provider): self
    {
        return new self(
            isValid: true,
            errorCode: null,
            errorMessage: null,
            timestamp: $timestamp,
            provider: $provider
        );
    }

    public static function failure(string $errorCode, string $errorMessage): self
    {
        return new self(
            isValid: false,
            errorCode: $errorCode,
            errorMessage: $errorMessage
        );
    }
}

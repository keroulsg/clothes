<?php

namespace App\Exceptions;

use Exception;

class IdempotencyCollisionException extends Exception
{
    public function __construct(
        public string $idempotencyKey,
        public string $tenantId = '',
        string $message = "Idempotency collision detected under concurrency",
        int $code = 0,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);
    }

    public function getIdempotencyKey(): string
    {
        return $this->idempotencyKey;
    }

    public function getTenantId(): string
    {
        return $this->tenantId;
    }
}

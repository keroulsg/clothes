<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

interface WebhookVerifierInterface
{
    /**
     * التحقق الصارم من التوقيع الرقمي وطابع الوقت لإشعار الدفع
     */
    public function verify(Request $request, string $secret): WebhookVerificationResult;

    /**
     * اسم مزود خدمة الدفع
     */
    public function getProviderName(): string;
}

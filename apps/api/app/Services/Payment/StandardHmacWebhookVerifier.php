<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

class StandardHmacWebhookVerifier implements WebhookVerifierInterface
{
    public function getProviderName(): string
    {
        return 'standard';
    }

    public function verify(Request $request, string $secret): WebhookVerificationResult
    {
        $signature = $request->header('X-Signature') 
            ?: ($request->header('X-Webhook-Signature'));

        if (empty($signature)) {
            return WebhookVerificationResult::failure(
                'MissingSignature',
                'أمان: توقيع إشعار الدفع الرقمي (X-Signature) مفقود في الترويسات.'
            );
        }

        $rawTimestamp = $request->header('X-Signature-Timestamp') ?: $request->input('timestamp');

        if (str_contains($signature, 't=') && str_contains($signature, 'v1=')) {
            $parts = explode(',', $signature);
            foreach ($parts as $part) {
                if (str_starts_with(trim($part), 't=')) {
                    $rawTimestamp = substr(trim($part), 2);
                } elseif (str_starts_with(trim($part), 'v1=')) {
                    $signature = substr(trim($part), 3);
                }
            }
        }

        if (empty($rawTimestamp)) {
            return WebhookVerificationResult::failure(
                'MissingSignatureTimestamp',
                'أمان: طابع الوقت للطلب (X-Signature-Timestamp) مفقود وهو إلزامي للتحقق من عدم إعادة الإرسال.'
            );
        }

        if (!ctype_digit((string)$rawTimestamp) && !is_int($rawTimestamp)) {
            return WebhookVerificationResult::failure(
                'MalformedSignatureTimestamp',
                'أمان: طابع الوقت غير صالح أو ليس عدداً صحيحاً.'
            );
        }

        $tsInt = (int) $rawTimestamp;
        $now = time();

        if (($now - $tsInt) > 300) {
            return WebhookVerificationResult::failure(
                'TimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار الدفع منتهي الصلاحية (تجاوز نافذة السماح 300 ثانية).'
            );
        }

        if (($tsInt - $now) > 60) {
            return WebhookVerificationResult::failure(
                'FutureTimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار الدفع في المستقبل بما يتجاوز نافذة انحراف الساعة (60 ثانية).'
            );
        }

        $rawBody = $request->getContent();
        $expectedSignatureWithTs = hash_hmac('sha256', "{$tsInt}.{$rawBody}", $secret);

        if (!hash_equals($expectedSignatureWithTs, $signature)) {
            return WebhookVerificationResult::failure(
                'InvalidSignature',
                'أمان: التوقيع الرقمي لإشعار الدفع غير صالح أو مزور (يجب ربط التوقيع بطابع الوقت المعتمد حصراً).'
            );
        }

        return WebhookVerificationResult::success($tsInt, 'standard');
    }
}

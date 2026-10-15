<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

class StripeWebhookVerifier implements WebhookVerifierInterface
{
    public function getProviderName(): string
    {
        return 'stripe';
    }

    public function verify(Request $request, string $secret): WebhookVerificationResult
    {
        $sigHeader = $request->header('Stripe-Signature');
        if (empty($sigHeader)) {
            return WebhookVerificationResult::failure(
                'MissingSignature',
                'أمان: ترويسة توقيع Stripe (Stripe-Signature) مفقودة في الطلب.'
            );
        }

        // استخراج t و v1 من صيغة Stripe الرسمية: t=1492774577,v1=5257a8...
        $timestamp = null;
        $signatures = [];

        $items = explode(',', $sigHeader);
        foreach ($items as $item) {
            $parts = explode('=', trim($item), 2);
            if (count($parts) === 2) {
                $key = trim($parts[0]);
                $val = trim($parts[1]);
                if ($key === 't') {
                    $timestamp = $val;
                } elseif ($key === 'v1') {
                    $signatures[] = $val;
                }
            }
        }

        if ($timestamp === null || $timestamp === '') {
            return WebhookVerificationResult::failure(
                'MissingSignatureTimestamp',
                'أمان: طابع الوقت (t) مفقود في ترويسة Stripe-Signature.'
            );
        }

        if (!ctype_digit((string)$timestamp)) {
            return WebhookVerificationResult::failure(
                'MalformedSignatureTimestamp',
                'أمان: طابع الوقت (t) في ترويسة Stripe-Signature غير صالح أو ليس رقماً صحيحاً.'
            );
        }

        $tsInt = (int) $timestamp;
        $now = time();

        // فحص نافذة السماح الزمنية
        if (($now - $tsInt) > 300) {
            return WebhookVerificationResult::failure(
                'TimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار Stripe منتهي الصلاحية (تجاوز نافذة السماح 300 ثانية).'
            );
        }

        if (($tsInt - $now) > 60) {
            return WebhookVerificationResult::failure(
                'FutureTimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار Stripe في المستقبل بما يتجاوز نافذة انحراف الساعة (60 ثانية).'
            );
        }

        if (empty($signatures)) {
            return WebhookVerificationResult::failure(
                'MissingSignatureHash',
                'أمان: التوقيع الرقمي (v1) مفقود في ترويسة Stripe-Signature.'
            );
        }

        $rawBody = $request->getContent();
        $signedPayload = "{$tsInt}.{$rawBody}";
        $expectedSignature = hash_hmac('sha256', $signedPayload, $secret);

        $matched = false;
        foreach ($signatures as $sig) {
            if (hash_equals($expectedSignature, $sig)) {
                $matched = true;
                break;
            }
        }

        if (!$matched) {
            return WebhookVerificationResult::failure(
                'InvalidSignature',
                'أمان: توقيع Stripe الرقمي غير صالح أو مزور.'
            );
        }

        return WebhookVerificationResult::success($tsInt, 'stripe');
    }
}

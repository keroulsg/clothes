<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

class PaymobWebhookVerifier implements WebhookVerifierInterface
{
    public function getProviderName(): string
    {
        return 'paymob';
    }

    public function verify(Request $request, string $secret): WebhookVerificationResult
    {
        $signature = $request->header('X-Paymob-HMAC') 
            ?: ($request->header('X-Signature') 
            ?: ($request->query('hmac') 
            ?: $request->header('X-Webhook-Signature')));

        if (empty($signature)) {
            return WebhookVerificationResult::failure(
                'MissingSignature',
                'أمان: توقيع Paymob HMAC مفقود في ترويسات أو معاملات الطلب.'
            );
        }

        // استخراج طابع الوقت من الترويسة أو محتوى الطلب
        $rawTimestamp = $request->header('X-Signature-Timestamp')
            ?: ($request->input('timestamp') ?: $request->input('created_at'));

        // في حال استخدام صيغة منظمة t=...,v1=...
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
                'أمان: طابع الوقت لإشعار Paymob مفقود (مطلوب لضمان نافذة الصلاحية ضد هجمات إعادة الإرسال).'
            );
        }

        // التحقق من صلاحية طابع الوقت
        if (is_string($rawTimestamp) && !is_numeric($rawTimestamp)) {
            $parsedTs = strtotime($rawTimestamp);
            if ($parsedTs === false) {
                return WebhookVerificationResult::failure(
                    'MalformedSignatureTimestamp',
                    'أمان: طابع الوقت لإشعار Paymob غير صالح أو لا يمكن قراءته.'
                );
            }
            $tsInt = $parsedTs;
        } else {
            if (!ctype_digit((string)$rawTimestamp) && !is_int($rawTimestamp)) {
                return WebhookVerificationResult::failure(
                    'MalformedSignatureTimestamp',
                    'أمان: صيغة طابع الوقت لإشعار Paymob غير صحيحة.'
                );
            }
            $tsInt = (int) $rawTimestamp;
        }

        $now = time();
        if (($now - $tsInt) > 300) {
            return WebhookVerificationResult::failure(
                'TimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار Paymob منتهي الصلاحية (تجاوز نافذة السماح 300 ثانية).'
            );
        }

        if (($tsInt - $now) > 60) {
            return WebhookVerificationResult::failure(
                'FutureTimestampToleranceExceeded',
                'أمان: طابع الوقت لإشعار Paymob في المستقبل بما يتجاوز نافذة انحراف الساعة (60 ثانية).'
            );
        }

        $rawBody = $request->getContent();

        // 1. فحص التوقيع المعياري للـ Webhook المشفر بـ HMAC-SHA256 (t.body أو body)
        $expectedSha256WithTs = hash_hmac('sha256', "{$tsInt}.{$rawBody}", $secret);
        $expectedSha256Raw = hash_hmac('sha256', $rawBody, $secret);

        if (hash_equals($expectedSha256WithTs, $signature) || hash_equals($expectedSha256Raw, $signature)) {
            return WebhookVerificationResult::success($tsInt, 'paymob');
        }

        // 2. فحص بروتوكول Paymob الرسمي لحقول المعاملة المدمجة (Concatenated Fields HMAC-SHA512)
        $data = $request->json()->all();
        $obj = isset($data['obj']) && is_array($data['obj']) ? $data['obj'] : $data;

        $concatenated = $this->buildPaymobConcatenatedString($obj);
        if ($concatenated !== null) {
            $expectedSha512 = hash_hmac('sha512', $concatenated, $secret);
            if (hash_equals($expectedSha512, $signature)) {
                return WebhookVerificationResult::success($tsInt, 'paymob');
            }
        }

        return WebhookVerificationResult::failure(
            'InvalidSignature',
            'أمان: توقيع Paymob HMAC غير صالح أو غير مطابق لمفتاح التشفير المشترك.'
        );
    }

    private function buildPaymobConcatenatedString(array $obj): ?string
    {
        $keys = [
            'amount_cents',
            'created_at',
            'currency',
            'error_occured',
            'has_parent_transaction',
            'id',
            'integration_id',
            'is_3d_secure',
            'is_auth',
            'is_capture',
            'is_refunded',
            'is_standalone_payment',
            'is_voided',
            'order.id',
            'owner',
            'pending',
            'source_data.pan',
            'source_data.sub_type',
            'source_data.type',
            'success',
        ];

        $result = '';
        foreach ($keys as $key) {
            $val = data_get($obj, $key);
            if ($val === null) {
                return null;
            }
            if (is_bool($val)) {
                $val = $val ? 'true' : 'false';
            }
            $result .= (string) $val;
        }

        return $result;
    }
}

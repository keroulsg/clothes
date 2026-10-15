<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

/**
 * التحقق الرسمي من كولباك وإشعارات Paymob
 * يدعم بروتوكول Paymob الرسمي لحساب HMAC-SHA512 عبر الحقول المعيارية المتسلسلة (20 Canonical Fields).
 */
class PaymobWebhookVerifier implements WebhookVerifierInterface
{
    public function getProviderName(): string
    {
        return 'paymob';
    }

    public function verify(Request $request, string $secret): WebhookVerificationResult
    {
        // 1. استخراج توقيع HMAC من ترويسة الطلب أو معامل الاستعلام (query parameter hmac)
        $signature = $request->header('X-Paymob-HMAC') 
            ?: ($request->query('hmac') 
            ?: ($request->header('hmac') 
            ?: $request->header('X-Signature')));

        if (empty($signature)) {
            return WebhookVerificationResult::failure(
                'MissingSignature',
                'أمان: توقيع Paymob HMAC مفقود في ترويسات أو معاملات الطلب.'
            );
        }

        // 2. التحقق من وجود طابع وقت مشفر إذا كان التوقيع مصاغاً بنسق t=...,v1=...
        $verifiedTimestamp = null;
        if (str_contains($signature, 't=') && str_contains($signature, 'v1=')) {
            $parts = explode(',', $signature);
            foreach ($parts as $part) {
                if (str_starts_with(trim($part), 't=')) {
                    $tsVal = substr(trim($part), 2);
                    if (ctype_digit($tsVal)) {
                        $verifiedTimestamp = (int) $tsVal;
                    }
                } elseif (str_starts_with(trim($part), 'v1=')) {
                    $signature = substr(trim($part), 3);
                }
            }

            if ($verifiedTimestamp !== null) {
                $now = time();
                if (($now - $verifiedTimestamp) > 300) {
                    return WebhookVerificationResult::failure(
                        'TimestampToleranceExceeded',
                        'أمان: طابع الوقت لإشعار Paymob منتهي الصلاحية (تجاوز نافذة السماح 300 ثانية).'
                    );
                }
                if (($verifiedTimestamp - $now) > 60) {
                    return WebhookVerificationResult::failure(
                        'FutureTimestampToleranceExceeded',
                        'أمان: طابع الوقت لإشعار Paymob في المستقبل بما يتجاوز نافذة انحراف الساعة (60 ثانية).'
                    );
                }
            }
        }

        // 3. التحقق باستخدام بروتوكول Paymob الرسمي لحقول المعاملة المدمجة (Canonical Fields HMAC-SHA512)
        $data = $request->json()->all();
        $obj = isset($data['obj']) && is_array($data['obj']) ? $data['obj'] : $data;

        $concatenated = $this->buildPaymobConcatenatedString($obj);
        if ($concatenated !== null) {
            $expectedSha512 = hash_hmac('sha512', $concatenated, $secret);
            if (hash_equals(strtolower($expectedSha512), strtolower($signature))) {
                return WebhookVerificationResult::success($verifiedTimestamp, 'paymob');
            }
        }

        // إذا كانت البيانات المباشرة غير مطابقة للبروتوكول الرسمي، يُرفض الطلب فوراً (دون قبول بدائل غير معتمدة)
        return WebhookVerificationResult::failure(
            'InvalidSignature',
            'أمان: توقيع Paymob HMAC غير صالح أو غير مطابق للتسلسل المعياري لحقول المعاملة الرسمية.'
        );
    }

    /**
     * بناء السلسلة النصية المعيارية المجمعة لحقول Paymob العشرين بالترتيب الأبجدي الرسمي:
     * 1. amount_cents
     * 2. created_at
     * 3. currency
     * 4. error_occured
     * 5. has_parent_transaction
     * 6. id
     * 7. integration_id
     * 8. is_3d_secure
     * 9. is_auth
     * 10. is_capture
     * 11. is_refunded
     * 12. is_standalone_payment
     * 13. is_voided
     * 14. order.id
     * 15. owner
     * 16. pending
     * 17. source_data.pan
     * 18. source_data.sub_type
     * 19. source_data.type
     * 20. success
     */
    public function buildPaymobConcatenatedString(array $obj): ?string
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
            $val = $this->extractNestedValue($obj, $key);
            if ($val === null) {
                // إذا كان الحقل مفقوداً تماماً في الكائن لا يمكن توليد توقيع Paymob الرسمي
                return null;
            }

            if (is_bool($val)) {
                $result .= $val ? 'true' : 'false';
            } elseif ($val === 'true' || $val === 'false') {
                $result .= $val;
            } else {
                $result .= (string) $val;
            }
        }

        return $result;
    }

    private function extractNestedValue(array $data, string $key): mixed
    {
        $parts = explode('.', $key);
        $current = $data;

        foreach ($parts as $part) {
            if (!is_array($current) || !array_key_exists($part, $current)) {
                return null;
            }
            $current = $current[$part];
        }

        return $current;
    }
}

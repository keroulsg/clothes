<?php

namespace App\Services\Payment;

interface PaymentEventNormalizerInterface
{
    /**
     * تطبيع بيانات الإشعار الأصلية إلى العقد الداخلي الموحد بعد التحقق من التوقيع
     *
     * @param array $payload البيانات المحولة من JSON للإشعار
     * @param int|null $verifiedTimestamp طابع الوقت الذي تم التحقق منه
     * @return ValidatedPaymentWebhookEvent
     * @throws \InvalidArgumentException في حال كانت البيانات غير مكتملة أو الحدث غير مدعوم
     */
    public function normalize(array $payload, ?int $verifiedTimestamp = null): ValidatedPaymentWebhookEvent;
}

<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

class WebhookVerifierFactory
{
    /**
     * استرجاع فاحص التوقيع الرقمي المناسب للطلب بشكل حتمي ودقيق
     */
    public static function resolve(Request $request, ?string $explicitProvider = null): WebhookVerifierInterface
    {
        $provider = self::determineProvider($request, $explicitProvider);

        return match ($provider) {
            'stripe' => new StripeWebhookVerifier(),
            'paymob' => new PaymobWebhookVerifier(),
            default => new StandardHmacWebhookVerifier(),
        };
    }

    /**
     * استرجاع مطبّع بيانات الإشعار المناسب للطلب
     */
    public static function resolveNormalizer(string $provider): PaymentEventNormalizerInterface
    {
        return match (strtolower(trim($provider))) {
            'stripe' => new StripeEventNormalizer(),
            'paymob' => new PaymobEventNormalizer(),
            default => new StandardHmacEventNormalizer(),
        };
    }

    /**
     * التحديد الحتمي لنوع مزود خدمة الدفع
     */
    public static function determineProvider(Request $request, ?string $explicitProvider = null): string
    {
        if ($explicitProvider !== null && $explicitProvider !== '') {
            return strtolower(trim($explicitProvider));
        }

        // مسار محدد للمزود من الراوت
        $routeParam = $request->route('provider');
        if (!empty($routeParam)) {
            return strtolower(trim((string) $routeParam));
        }

        // الكشف عبر ترويسات بروتوكول المزود الحصرية
        if ($request->hasHeader('Stripe-Signature')) {
            return 'stripe';
        }

        if ($request->hasHeader('X-Paymob-HMAC') || $request->has('hmac') || $request->hasHeader('hmac')) {
            return 'paymob';
        }

        if ($request->hasHeader('X-Signature')) {
            return 'standard';
        }

        // الاعتماد على المزود المهيأ في بيئة النظام كخيار أخير
        return strtolower((string) config('services.payment.provider', 'standard'));
    }
}

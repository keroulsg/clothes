<?php

namespace App\Services\Payment;

use Illuminate\Http\Request;

class WebhookVerifierFactory
{
    public static function resolve(Request $request): WebhookVerifierInterface
    {
        $configuredProvider = strtolower((string) config('services.payment.provider', 'paymob'));

        if ($request->hasHeader('Stripe-Signature') || $configuredProvider === 'stripe') {
            return new StripeWebhookVerifier();
        }

        if ($request->hasHeader('X-Paymob-HMAC') || $request->has('hmac') || $configuredProvider === 'paymob') {
            return new PaymobWebhookVerifier();
        }

        return new StandardHmacWebhookVerifier();
    }
}

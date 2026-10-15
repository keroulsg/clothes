<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'stripe' => [
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    ],

    'paymob' => [
        'hmac_secret' => env('PAYMOB_HMAC_SECRET'),
    ],

    'payment' => [
        'webhook_secret' => env('PAYMENT_WEBHOOK_SECRET'),
        'provider' => env('PAYMENT_PROVIDER', 'paymob'),
        'stripe_webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'paymob_hmac_secret' => env('PAYMOB_HMAC_SECRET'),
    ],

    'platform' => [
        'admin_activation_key' => env('PLATFORM_ADMIN_ACTIVATION_KEY'),
    ],

];

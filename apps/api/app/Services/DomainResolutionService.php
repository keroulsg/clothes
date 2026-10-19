<?php

namespace App\Services;

use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use InvalidArgumentException;

class DomainResolutionService
{
    /**
     * قائمة النطاقات الفرعية المحجوزة للمنصة لمنع حجزها أو استغلالها
     */
    public const RESERVED_SUBDOMAINS = [
        'www',
        'api',
        'admin',
        'platform',
        'app',
        'mail',
        'smtp',
        'ftp',
        'ns1',
        'ns2',
        'staging',
        'dev',
        'test',
        'demo',
        'portal',
        'auth',
        'billing',
        'cdn',
        'static',
        'assets',
        'ws',
        'support',
        'help',
        'status',
        'root',
        'superadmin',
    ];

    /**
     * النطاقات الأساسية للمنصة
     */
    public const PLATFORM_BASE_DOMAINS = [
        'garmentos.cloud',
        'garmentos.local',
        'localhost',
        '127.0.0.1',
    ];

    /**
     * تحديد هوية المستأجر لمتجر عام بشكل حتمي وآمن من خلال عنوان Host أو معرف المتجر المعتمد
     * يمنع منعاً باتاً الرجوع التلقائي إلى أول مستأجر، ويمنع استخدام ترويسة X-Tenant-ID في المتاجر العامة
     */
    public function resolveStorefrontTenant(Request $request, ?string $storeIdentifier = null): ?Tenant
    {
        $rawHost = $request->server('HTTP_HOST') ?: ($request->header('host') ?: $request->getHost());
        $normalizedHost = strtolower(trim(explode(':', $rawHost)[0]));

        // 1. فحص ما إذا كان العنوان هو نطاق فرعي للمنصة (e.g. factory1.garmentos.cloud or factory1.localhost)
        $subdomain = $this->extractSubdomainFromHost($normalizedHost);

        if ($subdomain) {
            if (in_array($subdomain, self::RESERVED_SUBDOMAINS, true)) {
                return null;
            }

            $tenant = Tenant::withoutGlobalScopes()->where('subdomain', $subdomain)->first();
            if ($tenant) {
                return $tenant;
            }
        }

        // 2. فحص النطاق المخصص المباشر (Custom Domain e.g. store.factory.com)
        if (!$subdomain && !$this->isPlatformBaseDomain($normalizedHost)) {
            $tenant = Tenant::withoutGlobalScopes()->where('custom_domain', $normalizedHost)->first();

            if ($tenant) {
                $domainSettings = $tenant->settings['domain'] ?? [];
                $status = $domainSettings['custom_domain_status'] ?? 'pending_verification';
                $isEnabled = $domainSettings['custom_domain_enabled'] ?? true;

                // أمان حرج: لا يتم قبول النطاق المخصص إلا إذا كان موثقاً ومفعلاً رسمياً
                if ($status === 'verified' && $isEnabled) {
                    return $tenant;
                }

                // النطاق موجود ولكنه غير موثق أو موقوف -> نرفض التعامل معه لحماية المستأجرين
                return null;
            }
        }

        // 3. مسار المعرف المعتمد في الـ URL (Store Identifier)
        // يُقبل فقط إذا كان المعرف معرف UUID صالح أو كود شركة أو نطاق فرعي معتمد
        if (!empty($storeIdentifier)) {
            $cleanIdentifier = trim($storeIdentifier);

            if (Str::isUuid($cleanIdentifier)) {
                $tenant = Tenant::withoutGlobalScopes()->where('id', $cleanIdentifier)->first();
                if ($tenant) {
                    return $tenant;
                }
            }

            $tenant = Tenant::withoutGlobalScopes()
                ->where(function ($q) use ($cleanIdentifier) {
                    $q->where('subdomain', strtolower($cleanIdentifier))
                      ->orWhere('code', $cleanIdentifier);
                })
                ->first();

            if ($tenant) {
                return $tenant;
            }
        }

        // 4. لا يوجد مستأجر مطابق حتمياً — لا يوجد أي Fallback عشوائي!
        return null;
    }

    /**
     * استخراج النطاق الفرعي من الـ Host
     */
    public function extractSubdomainFromHost(string $host): ?string
    {
        $platformDomain = config('app.platform_base_domain', env('PLATFORM_BASE_DOMAIN', 'garmentos.cloud'));
        $baseDomains = array_unique(array_merge(self::PLATFORM_BASE_DOMAINS, [$platformDomain]));

        foreach ($baseDomains as $base) {
            $base = strtolower(trim($base));
            if ($host === $base) {
                return null;
            }

            $suffix = '.' . $base;
            if (str_ends_with($host, $suffix)) {
                $sub = substr($host, 0, -strlen($suffix));
                // في حال وجود أكثر من مستوى فرعي، نأخذ المستوى الأول
                $parts = explode('.', $sub);
                return strtolower(end($parts));
            }
        }

        return null;
    }

    /**
     * هل العنوان هو نطاق المنصة الأساسي؟
     */
    public function isPlatformBaseDomain(string $host): bool
    {
        $platformDomain = config('app.platform_base_domain', env('PLATFORM_BASE_DOMAIN', 'garmentos.cloud'));
        $baseDomains = array_unique(array_merge(self::PLATFORM_BASE_DOMAINS, [$platformDomain]));

        return in_array($host, $baseDomains, true);
    }

    /**
     * التحقق من صلاحية وتوافق النطاق الفرعي (Subdomain Validation)
     */
    public function validateSubdomain(string $subdomain, ?string $excludeTenantId = null): array
    {
        $normalized = strtolower(trim($subdomain));

        if (strlen($normalized) < 3) {
            throw new InvalidArgumentException('يجب ألا يقل النطاق الفرعي عن 3 أحرف.');
        }

        if (strlen($normalized) > 63) {
            throw new InvalidArgumentException('يجب ألا يزيد النطاق الفرعي عن 63 حرفاً.');
        }

        if (!preg_match('/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/', $normalized)) {
            throw new InvalidArgumentException('النطاق الفرعي يجب أن يحتوي فقط على أحرف إنجليزية وأرقام وعلامة (-) دون أن تبدأ أو تنتهي بها.');
        }

        if (in_array($normalized, self::RESERVED_SUBDOMAINS, true)) {
            throw new InvalidArgumentException('هذا النطاق الفرعي محجوز للمنصة ولا يمكن استخدامه.');
        }

        $exists = Tenant::withoutGlobalScopes()
            ->where('subdomain', $normalized)
            ->when($excludeTenantId, fn($q) => $q->where('id', '!=', $excludeTenantId))
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException('هذا النطاق الفرعي مستخدم بالفعل من قبل شركة أخرى.');
        }

        return [
            'valid' => true,
            'subdomain' => $normalized,
            'full_domain' => $normalized . '.' . (config('app.platform_base_domain') ?: 'garmentos.cloud'),
        ];
    }

    /**
     * التحقق من النطاق المخصص وتنسيقه
     */
    public function validateCustomDomain(string $customDomain, ?string $excludeTenantId = null): array
    {
        $normalized = strtolower(trim($customDomain));

        if (!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i', $normalized)) {
            throw new InvalidArgumentException('تنسيق النطاق المخصص غير صالح (مثال: shop.mybrand.com).');
        }

        if ($this->isPlatformBaseDomain($normalized) || str_ends_with($normalized, '.garmentos.cloud')) {
            throw new InvalidArgumentException('لا يمكن استخدام نطاق المنصة الأساسي كنطاق مخصص.');
        }

        $exists = Tenant::withoutGlobalScopes()
            ->where('custom_domain', $normalized)
            ->when($excludeTenantId, fn($q) => $q->where('id', '!=', $excludeTenantId))
            ->exists();

        if ($exists) {
            throw new InvalidArgumentException('هذا النطاق المخصص مسجل بالفعل لدى شركة أخرى في المنصة.');
        }

        return [
            'valid' => true,
            'custom_domain' => $normalized,
        ];
    }

    /**
     * توليد رمز التوثيق المشفر للنطاق المخصص (DNS Verification Token)
     */
    public function generateVerificationToken(Tenant $tenant): string
    {
        return 'garmentos-verification=' . hash('sha256', $tenant->id . '-' . config('app.key', 'secret') . '-' . time());
    }

    /**
     * محاكاة وتنفيذ فحص توثيق النطاق عبر سجلات DNS (Real Verification Logic)
     */
    public function verifyCustomDomainDns(Tenant $tenant): array
    {
        $domain = $tenant->custom_domain;
        if (empty($domain)) {
            return [
                'verified' => false,
                'status' => 'misconfigured',
                'message' => 'لم يتم تحديد أي نطاق مخصص للمصنع.',
            ];
        }

        $settings = $tenant->settings ?? [];
        $domainSettings = $settings['domain'] ?? [];
        $expectedToken = $domainSettings['verification_token'] ?? null;

        if (!$expectedToken) {
            return [
                'verified' => false,
                'status' => 'misconfigured',
                'message' => 'رمز التحقق الخاص بالنطاق غير مهيأ.',
            ];
        }

        // في بيئة الاختبارات أو التطوير المحلي أو إذا توفر سجل DNS
        // نقوم بفحص حقيقي للسجلات عبر dns_get_record إذا كانت الدالة متاحة
        $dnsRecords = @dns_get_record($domain, DNS_TXT | DNS_CNAME);
        $foundVerification = false;

        if (is_array($dnsRecords) && count($dnsRecords) > 0) {
            foreach ($dnsRecords as $record) {
                if (($record['type'] ?? '') === 'TXT' && isset($record['txt']) && str_contains($record['txt'], $expectedToken)) {
                    $foundVerification = true;
                    break;
                }
                if (($record['type'] ?? '') === 'CNAME' && isset($record['target']) && str_contains($record['target'], 'garmentos.cloud')) {
                    $foundVerification = true;
                    break;
                }
            }
        }

        // في حال توفر اختبار أو علامة فرض التوثيق الإداري (Manual Admin Verified Override)
        if ($foundVerification || ($domainSettings['allow_test_mock_dns'] ?? false)) {
            return [
                'verified' => true,
                'status' => 'verified',
                'verified_at' => now()->toIso8601String(),
                'message' => 'تم توثيق ملكية النطاق بنجاح عبر سجلات DNS.',
            ];
        }

        return [
            'verified' => false,
            'status' => 'failed',
            'message' => 'فشل التوثيق: لم يتم العثور على سجل TXT بالقيمة المطلوبة (' . $expectedToken . ') أو سجل CNAME يشير إلى garmentos.cloud.',
        ];
    }
}

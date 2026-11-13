<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\ProductVariant;
use App\Models\ProductVariantWholesaleTier;
use App\Models\WholesaleCustomerProfile;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use InvalidArgumentException;

class WholesaleService
{
    /**
     * تسجيل طلب عميل جملة جديد مع إنشاء ملف العميل المعتمد بحالة معلقة (Pending)
     */
    public function registerWholesaleAccount(string $tenantId, array $data): WholesaleCustomerProfile
    {
        return DB::transaction(function () use ($tenantId, $data) {
            $phone = trim($data['phone'] ?? '');
            $email = strtolower(trim($data['email'] ?? ''));

            if (empty($phone) || empty($email) || empty($data['company_name'])) {
                throw new InvalidArgumentException('اسم المنشأة ورقم الهاتف والبريد الإلكتروني حقول إجبارية للتسجيل كتاجر جملة.');
            }

            // Check if phone or email already registered for wholesale in this tenant
            $existing = WholesaleCustomerProfile::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($phone, $email) {
                    $q->where('phone', $phone)->orWhere('email', $email);
                })
                ->first();

            if ($existing) {
                throw new InvalidArgumentException('رقم الهاتف أو البريد الإلكتروني مسجل مسبقاً لدى طلبات الجملة لهذا المصنع.');
            }

            // Resolve or create Customer in ERP core
            $customer = Customer::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where(function ($q) use ($phone, $email) {
                    $q->where('phone', $phone);
                    if (!empty($email)) {
                        $q->orWhere('email', $email);
                    }
                })
                ->first();

            if (!$customer) {
                $customer = Customer::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'code' => 'CUST-WS-' . strtoupper(substr(md5($phone . $tenantId), 0, 6)),
                    'name' => $data['contact_person'] ?? $data['company_name'],
                    'company_name' => $data['company_name'],
                    'classification' => 'wholesale',
                    'contact_person' => $data['contact_person'] ?? '',
                    'phone' => $phone,
                    'email' => $email,
                    'tax_id' => $data['tax_id'] ?? null,
                    'commercial_registry' => $data['commercial_registry'] ?? null,
                    'address' => ($data['shipping_address'] ?? '') . ', ' . ($data['city'] ?? ''),
                    'billing_address' => ($data['shipping_address'] ?? '') . ', ' . ($data['city'] ?? ''),
                    'delivery_address' => ($data['shipping_address'] ?? '') . ', ' . ($data['city'] ?? ''),
                    'is_active' => true,
                    'status' => 'pending',
                ]);
            } else {
                $customer->update([
                    'classification' => 'wholesale',
                    'company_name' => $data['company_name'],
                    'tax_id' => $data['tax_id'] ?? $customer->tax_id,
                    'commercial_registry' => $data['commercial_registry'] ?? $customer->commercial_registry,
                ]);
            }

            $rawToken = Str::random(40);

            $profile = WholesaleCustomerProfile::withoutGlobalScopes()->create([
                'tenant_id' => $tenantId,
                'customer_id' => $customer->id,
                'company_name' => $data['company_name'],
                'business_type' => $data['business_type'] ?? 'retailer',
                'contact_person' => $data['contact_person'] ?? $data['company_name'],
                'phone' => $phone,
                'email' => $email,
                'tax_id' => $data['tax_id'] ?? null,
                'commercial_registry' => $data['commercial_registry'] ?? null,
                'city' => $data['city'] ?? '',
                'shipping_address' => $data['shipping_address'] ?? '',
                'password_hash' => Hash::make($data['password']),
                'status' => 'pending',
                'auth_token' => hash('sha256', $rawToken),
                'notes' => $data['notes'] ?? null,
            ]);

            // Assign raw token for initial session
            $profile->setAttribute('plain_auth_token', $rawToken);

            return $profile;
        });
    }

    /**
     * تسجيل دخول عميل الجملة للمتجر والتحقق من كلمة المرور
     */
    public function loginWholesaleCustomer(string $tenantId, string $identifier, string $password): array
    {
        $cleanIdentifier = trim($identifier);

        $profile = WholesaleCustomerProfile::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($cleanIdentifier) {
                $q->where('phone', $cleanIdentifier)->orWhere('email', strtolower($cleanIdentifier));
            })
            ->first();

        if (!$profile || !Hash::check($password, $profile->password_hash)) {
            throw new InvalidArgumentException('بيانات الدخول غير صحيحة. يرجى التأكد من رقم الهاتف أو البريد وكلمة المرور.');
        }

        $rawToken = Str::random(40);
        $profile->update([
            'auth_token' => hash('sha256', $rawToken),
        ]);

        return [
            'token' => $rawToken,
            'customer' => [
                'id' => $profile->id,
                'company_name' => $profile->company_name,
                'contact_person' => $profile->contact_person,
                'phone' => $profile->phone,
                'email' => $profile->email,
                'status' => $profile->status,
                'is_approved' => $profile->isApproved(),
                'rejection_reason' => $profile->rejection_reason,
            ],
        ];
    }

    /**
     * حل وتوثيق هوية عميل الجملة من التوكن (Strict Backend Authentication)
     */
    public function resolveCustomerFromToken(?string $token, string $tenantId): ?WholesaleCustomerProfile
    {
        if (empty($token)) {
            return null;
        }

        $hashedToken = hash('sha256', trim($token));

        return WholesaleCustomerProfile::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('auth_token', $hashedToken)
            ->first();
    }

    /**
     * اعتماد طلب تاجر الجملة ومنحه صلاحيات الأسعار المخفضة والـ MOQ
     */
    public function approveApplication(string $tenantId, string $profileId, string $adminUserId): WholesaleCustomerProfile
    {
        return DB::transaction(function () use ($tenantId, $profileId, $adminUserId) {
            $profile = WholesaleCustomerProfile::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($profileId);

            $oldStatus = $profile->status;
            $profile->update([
                'status' => 'approved',
                'reviewed_by' => $adminUserId,
                'reviewed_at' => now(),
                'approved_at' => now(),
                'rejection_reason' => null,
                'suspension_reason' => null,
            ]);

            // Update linked customer in ERP
            if ($profile->customer) {
                $profile->customer->update([
                    'status' => 'active',
                    'is_active' => true,
                ]);
            }

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $adminUserId,
                'action' => 'wholesale_application_approved',
                'auditable_type' => WholesaleCustomerProfile::class,
                'auditable_id' => $profile->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'approved', 'approved_at' => now()->toDateTimeString()],
            ]);

            return $profile->fresh(['customer', 'reviewer']);
        });
    }

    /**
     * رفض طلب تاجر الجملة مع تسجيل سبب الرفض
     */
    public function rejectApplication(string $tenantId, string $profileId, string $adminUserId, string $reason): WholesaleCustomerProfile
    {
        return DB::transaction(function () use ($tenantId, $profileId, $adminUserId, $reason) {
            $profile = WholesaleCustomerProfile::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($profileId);

            $oldStatus = $profile->status;
            $profile->update([
                'status' => 'rejected',
                'reviewed_by' => $adminUserId,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ]);

            if ($profile->customer) {
                $profile->customer->update(['status' => 'rejected']);
            }

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $adminUserId,
                'action' => 'wholesale_application_rejected',
                'auditable_type' => WholesaleCustomerProfile::class,
                'auditable_id' => $profile->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'rejected', 'rejection_reason' => $reason],
            ]);

            return $profile->fresh(['customer', 'reviewer']);
        });
    }

    /**
     * تجميد / إيقاف حساب تاجر جملة معتمد وسحب حق الوصول لأسعار الجملة فوراً
     */
    public function suspendApplication(string $tenantId, string $profileId, string $adminUserId, string $reason): WholesaleCustomerProfile
    {
        return DB::transaction(function () use ($tenantId, $profileId, $adminUserId, $reason) {
            $profile = WholesaleCustomerProfile::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($profileId);

            $oldStatus = $profile->status;
            $profile->update([
                'status' => 'suspended',
                'suspended_at' => now(),
                'suspension_reason' => $reason,
            ]);

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $adminUserId,
                'action' => 'wholesale_application_suspended',
                'auditable_type' => WholesaleCustomerProfile::class,
                'auditable_id' => $profile->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'suspended', 'suspension_reason' => $reason],
            ]);

            return $profile->fresh(['customer', 'reviewer']);
        });
    }

    /**
     * إعادة تنشيط حساب تاجر جملة مجمد
     */
    public function reactivateApplication(string $tenantId, string $profileId, string $adminUserId): WholesaleCustomerProfile
    {
        return DB::transaction(function () use ($tenantId, $profileId, $adminUserId) {
            $profile = WholesaleCustomerProfile::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($profileId);

            $oldStatus = $profile->status;
            $profile->update([
                'status' => 'approved',
                'suspended_at' => null,
                'suspension_reason' => null,
            ]);

            AuditLog::create([
                'tenant_id' => $tenantId,
                'user_id' => $adminUserId,
                'action' => 'wholesale_application_reactivated',
                'auditable_type' => WholesaleCustomerProfile::class,
                'auditable_id' => $profile->id,
                'old_values' => ['status' => $oldStatus],
                'new_values' => ['status' => 'approved'],
            ]);

            return $profile->fresh(['customer', 'reviewer']);
        });
    }

    /**
     * استعلام طلبات عملاء الجملة مع الفلترة حسب الحالة للوحة إدارة المصنع
     */
    public function getApplications(string $tenantId, ?string $status = null)
    {
        $query = WholesaleCustomerProfile::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->with(['customer', 'reviewer'])
            ->latest();

        if (!empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        return $query->get();
    }

    /**
     * إعداد وإدارة شرائح أسعار الجملة لمتغير المنتج (Wholesale Tiers & MOQ)
     */
    public function saveWholesaleTiers(string $tenantId, string $variantId, array $tiers, int $moq = 1): array
    {
        return DB::transaction(function () use ($tenantId, $variantId, $tiers, $moq) {
            $variant = ProductVariant::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->lockForUpdate()
                ->findOrFail($variantId);

            // Update variant MOQ
            $variant->update(['moq' => max(1, $moq)]);

            // Validate tier ranges
            usort($tiers, fn ($a, $b) => ($a['min_quantity'] ?? 0) <=> ($b['min_quantity'] ?? 0));

            // Clean existing tiers
            ProductVariantWholesaleTier::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('variant_id', $variantId)
                ->delete();

            $created = [];
            $prevMin = 0;
            $prevMax = 0;

            foreach ($tiers as $tier) {
                $minQty = (int) ($tier['min_quantity'] ?? 1);
                $maxQty = !empty($tier['max_quantity']) ? (int) $tier['max_quantity'] : null;
                $price = (float) ($tier['unit_price'] ?? 0);

                if ($minQty <= 0 || $price <= 0) {
                    throw new InvalidArgumentException('الكمية الدنيا وسعر الشريحة يجب أن يكونا أكبر من الصفر.');
                }

                if ($maxQty !== null && $maxQty < $minQty) {
                    throw new InvalidArgumentException('الحد الأقصى لكمية الشريحة يجب أن يكون أكبر من أو يساوي الحد الأدنى.');
                }

                if ($minQty <= $prevMax && $prevMax > 0) {
                    throw new InvalidArgumentException('تداخل في شرائح أسعار الجملة: تداخل كميات الشرائح.');
                }

                $t = ProductVariantWholesaleTier::withoutGlobalScopes()->create([
                    'tenant_id' => $tenantId,
                    'variant_id' => $variantId,
                    'min_quantity' => $minQty,
                    'max_quantity' => $maxQty,
                    'unit_price' => $price,
                    'is_active' => true,
                ]);

                $created[] = $t;
                $prevMin = $minQty;
                $prevMax = $maxQty ?? PHP_INT_MAX;
            }

            return [
                'moq' => $variant->moq,
                'tiers' => $created,
            ];
        });
    }

    /**
     * احتساب السعر المعتمد للصنف والكمية مع مطابقة الشرائح والتحقق الصارم من الـ MOQ
     */
    public function resolveAuthoritativePrice(ProductVariant $variant, int $quantity, ?WholesaleCustomerProfile $wholesaleCustomer = null): array
    {
        // 1. If an approved wholesale customer is present
        if ($wholesaleCustomer && $wholesaleCustomer->isApproved()) {
            $moq = $variant->moq ?: 1;
            if ($quantity < $moq) {
                throw new InvalidArgumentException("الكمية المطلوبة ({$quantity}) أقل من الحد الأدنى لطلب الجملة لهذا المنتج (MOQ: {$moq} قطع).");
            }

            // Look for matching quantity tier
            $matchingTier = ProductVariantWholesaleTier::withoutGlobalScopes()
                ->where('variant_id', $variant->id)
                ->where('is_active', true)
                ->where('min_quantity', '<=', $quantity)
                ->where(function ($q) use ($quantity) {
                    $q->whereNull('max_quantity')->orWhere('max_quantity', '>=', $quantity);
                })
                ->orderByDesc('min_quantity')
                ->first();

            if ($matchingTier && (float)$matchingTier->unit_price > 0) {
                return [
                    'unit_price' => (float)$matchingTier->unit_price,
                    'channel' => 'wholesale',
                    'tier_id' => $matchingTier->id,
                    'is_tier_pricing' => true,
                ];
            }

            if ((float)$variant->wholesale_price > 0) {
                return [
                    'unit_price' => (float)$variant->wholesale_price,
                    'channel' => 'wholesale',
                    'tier_id' => null,
                    'is_tier_pricing' => false,
                ];
            }
        }

        // 2. Retail visitor or unapproved customer: strictly retail pricing!
        $retailPrice = (float) (
            $variant->product && (float)$variant->product->selling_price > 0
                ? $variant->product->selling_price
                : ($variant->retail_price ?? 0)
        );

        if ($retailPrice <= 0) {
            throw new InvalidArgumentException("سعر التجزئة للمنتج {$variant->sku} غير مهيأ بالمتجر.");
        }

        return [
            'unit_price' => $retailPrice,
            'channel' => 'retail',
            'tier_id' => null,
            'is_tier_pricing' => false,
        ];
    }
}

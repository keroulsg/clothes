<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SecurityHardeningAndTokenLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'code' => 'T-SEC-HARDEN',
            'name' => 'مصنع الأمان المتقدم',
            'domain' => 'sec-harden.garmentos.test',
            'status' => 'active',
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مدير النظام',
            'email' => 'admin@sec-harden.test',
            'password' => bcrypt('StrongSecret123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);
    }

    /**
     * 1. فحص استجابة الطلبات غير المصادقة عبر مختلف أنواع ترويسات Accept
     */
    public function test_unauthenticated_requests_always_return_json_401(): void
    {
        // أ. طلب مع ترويسة text/html (كان سابقاً يسبب 500 Route [login] not defined)
        $htmlResponse = $this->get('/api/v1/warehouses', ['Accept' => 'text/html']);
        $htmlResponse->assertStatus(401)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJson([
                'message' => 'Unauthenticated.',
                'status' => 401,
            ]);

        // ب. طلب مع ترويسة application/json
        $jsonResponse = $this->getJson('/api/v1/warehouses');
        $jsonResponse->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
                'status' => 401,
            ]);

        // ج. طلب بدون أي ترويسة Accept
        $rawResponse = $this->get('/api/v1/warehouses');
        $rawResponse->assertStatus(401)
            ->assertHeader('Content-Type', 'application/json');
    }

    /**
     * 2. فحص حالات الرموز: المفقود، غير الصالح، والملغى
     */
    public function test_token_lifecycle_invalid_and_revocation_states(): void
    {
        // أ. رمز غير صالح عشوائي
        $invalidTokenResponse = $this->withHeader('Authorization', 'Bearer invalid-token-12345')
            ->getJson('/api/v1/warehouses');
        $invalidTokenResponse->assertStatus(401);

        // ب. رمز صالح ومصادقة سليمة
        $token = $this->user->createToken('test-token')->plainTextToken;
        $validResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/warehouses');
        $validResponse->assertStatus(200);

        // ج. إلغاء الرمز عبر تسجيل الخروج (Logout)
        $logoutResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/auth/logout');
        $logoutResponse->assertStatus(200);

        // تفريغ الذاكرة المؤقتة لحارس المصادقة لاختبار الطلب التالي بشكل مستقل تماماً
        $this->app['auth']->forgetGuards();

        // د. استخدام الرمز الملغى مجدداً يجب أن يرفض بـ 401
        $revokedResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/warehouses');
        $revokedResponse->assertStatus(401);
    }

    /**
     * 3. التأكد من بقاء المسارات العامة متاحة للجميع بدون مصادقة
     */
    public function test_public_routes_remain_accessible_without_auth(): void
    {
        // فحص الصحة التشغيلية
        $healthResponse = $this->getJson('/api/v1/health');
        $healthResponse->assertStatus(200)->assertJson(['status' => 'healthy']);

        // قائمة باقات الاشتراك
        $plansResponse = $this->getJson('/api/v1/subscription/plans');
        $plansResponse->assertStatus(200);

        // واجهة المتجر الإلكتروني العامة
        $storefrontResponse = $this->getJson('/api/v1/storefront/public/' . $this->tenant->id);
        $storefrontResponse->assertStatus(200);
    }

    /**
     * 4. فحص تقييد المعدل وتطبيق حدود الأمان (Rate Limiting)
     */
    public function test_rate_limiting_enforcement_on_auth_endpoint(): void
    {
        RateLimiter::clear('auth');

        // تنفيذ 10 محاولات مسموحة
        for ($i = 0; $i < 10; $i++) {
            $response = $this->postJson('/api/v1/auth/login', [
                'email' => 'wrong@test.com',
                'password' => 'wrongpassword',
            ]);
            $this->assertNotEquals(429, $response->status());
        }

        // المحاولة رقم 11 يجب أن تُحظر بـ HTTP 429 Too Many Requests
        $blockedResponse = $this->postJson('/api/v1/auth/login', [
            'email' => 'wrong@test.com',
            'password' => 'wrongpassword',
        ]);
        $blockedResponse->assertStatus(429)
            ->assertJson([
                'error' => 'TooManyRequests',
            ]);
    }

    /**
     * 5. التحقق من تطبيق انتهاء صلاحية الرموز بعد 7 أيام (Token Expiration Enforcement)
     */
    public function test_seven_day_token_expiration_is_enforced(): void
    {
        config(['sanctum.expiration' => 10080]); // 7 days in minutes (10,080 mins)

        $token = $this->user->createToken('expiring-token')->plainTextToken;

        // الوقت الحالي: التوكن سليم ومقبول
        $responseNow = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/warehouses');
        $responseNow->assertStatus(200);

        // القفز بالزمن 8 أيام للأمام: يجب أن يعتبر الرمز منتهي الصلاحية ويرفض بـ 401
        \Carbon\Carbon::setTestNow(now()->addDays(8));
        $this->app['auth']->forgetGuards();

        $responseExpired = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/warehouses');
        $responseExpired->assertStatus(401)
            ->assertJson([
                'message' => 'Unauthenticated.',
                'status' => 401,
            ]);

        \Carbon\Carbon::setTestNow(); // إعادة ضبط الوقت
    }

    /**
     * 6. التحقق من عزل المستأجرين تحت تقييد معدل الطلبات (Tenant Isolation Under Rate Limiting)
     */
    public function test_rate_limiting_preserves_tenant_isolation(): void
    {
        $otherTenant = Tenant::create([
            'code' => 'T-OTHER-RATE',
            'name' => 'مصنع آخر',
            'domain' => 'other-rate.test',
            'status' => 'active',
        ]);
        $otherUser = User::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'مستخدم آخر',
            'email' => 'other@other-rate.test',
            'password' => bcrypt('password123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $tokenA = $this->user->createToken('token-a')->plainTextToken;
        $tokenB = $otherUser->createToken('token-b')->plainTextToken;

        RateLimiter::clear('marketplace-rfq');

        // المستخدم أ يستهلك كافة محاولات الـ RFQ المتاحة (15 محاولة)
        for ($i = 0; $i < 15; $i++) {
            $this->withHeader('Authorization', "Bearer {$tokenA}")
                ->postJson('/api/v1/waslat-worsh/rfqs', [
                    'title' => "RFQ test {$i}",
                    'target_quantity' => 100,
                    'expected_delivery_date' => now()->addDays(10)->toDateString(),
                ]);
        }

        // المحاولة 16 للمستخدم أ تُحظر بـ 429
        $blockedA = $this->withHeader('Authorization', "Bearer {$tokenA}")
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'RFQ blocked',
                'target_quantity' => 100,
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
            ]);
        $blockedA->assertStatus(429);

        // المستخدم ب من الشركة المستأجرة الأخرى غير متأثر قط ومسموح له بالطلب!
        $this->app['auth']->forgetGuards();
        $allowedB = $this->withHeader('Authorization', "Bearer {$tokenB}")
            ->postJson('/api/v1/waslat-worsh/rfqs', [
                'title' => 'RFQ User B',
                'target_quantity' => 50,
                'expected_delivery_date' => now()->addDays(10)->toDateString(),
            ]);
        $this->assertNotEquals(429, $allowedB->status());
    }

    /**
     * 7. التحقق من حجب مسار المكدس وتفاصيل الإطار الداخلي في بيئة الإنتاج (No Stack Traces)
     */
    public function test_production_error_handling_does_not_expose_stack_traces(): void
    {
        config(['app.debug' => false]);

        $response = $this->get('/api/v1/non-existent-endpoint-test-404', ['Accept' => 'application/json']);

        $response->assertStatus(404);
        $content = $response->getContent();
        $this->assertStringNotContainsString('trace', $content);
        $this->assertStringNotContainsString('class', $content);
    }
}

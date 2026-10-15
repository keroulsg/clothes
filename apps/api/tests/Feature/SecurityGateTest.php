<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Color;
use App\Models\GarmentModel;
use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Size;
use App\Models\SubscriptionPaymentOrder;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityGateTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private Tenant $tenantB;
    private User $userA;
    private User $userB;
    private Warehouse $warehouseA;
    private Warehouse $warehouseB;
    private InventoryItem $itemA;
    private InventoryItem $itemB;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. إعداد شركة أ
        $this->tenantA = Tenant::create([
            'code' => 'TEN-SEC-A',
            'name' => 'شركة النيل للصناعات النسيجية',
            'subdomain' => 'nile-textile',
            'status' => 'active',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'م. طارق رشدي',
            'email' => 'tarek@niletextile.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن أقمشة النيل',
            'code' => 'WH-A1',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->itemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-A-100',
            'name' => 'قطن مصري 100%',
            'unit_of_measure' => 'm',
            'current_balance' => 100.0,
            'average_cost' => 80.0,
        ]);

        // 2. إعداد شركة ب
        $this->tenantB = Tenant::create([
            'code' => 'TEN-SEC-B',
            'name' => 'مصنع الأهرام للملابس',
            'subdomain' => 'ahram-garments',
            'status' => 'active',
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'أ. حسام فؤاد',
            'email' => 'hossam@ahram.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مخزن الأهرام الرئيسي',
            'code' => 'WH-B1',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->itemB = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'warehouse_id' => $this->warehouseB->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-B-200',
            'name' => 'قماش صوف فاخر ب',
            'unit_of_measure' => 'm',
            'current_balance' => 200.0,
            'average_cost' => 120.0,
        ]);
    }

    /**
     * اختبار أمان 1: الطلب غير المسجل دخوله لا يستطيع تنفيذ عمليات ERP المحمية نهائياً (401)
     */
    public function test_unauthenticated_requests_cannot_access_protected_erp_endpoints(): void
    {
        // محاولة القراءة دون توكن أو تسجيل دخول
        $this->getJson('/api/v1/branches')->assertStatus(401);
        $this->getJson('/api/v1/models')->assertStatus(401);
        $this->getJson('/api/v1/inventory/items')->assertStatus(401);
        $this->getJson('/api/v1/purchase-orders')->assertStatus(401);
        $this->getJson('/api/v1/production-orders')->assertStatus(401);

        // محاولة الإنشاء والتعديل دون تسجيل دخول
        $this->postJson('/api/v1/branches', [
            'name' => 'فرع غير مصرح',
            'code' => 'UNAUTH-01',
            'type' => 'factory',
        ])->assertStatus(401);

        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 10,
        ])->assertStatus(401);
    }

    /**
     * اختبار أمان 2: الشركة A لا تستطيع قراءة أو تعديل سجلات الشركة B حتى مع معرفة الـ IDs الصحيحة (404/IDOR Prevention)
     */
    public function test_tenant_a_cannot_read_or_mutate_tenant_b_records_even_with_known_ids(): void
    {
        // إنشاء بيانات خاصة بالشركة ب
        $branchB = Branch::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'فرع الأهرام السري',
            'code' => 'AHRAM-SEC',
            'type' => 'factory',
        ]);

        $modelB = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'MOD-B-SECRET',
            'name' => 'موديل شتوي حصري لشركة ب',
            'category' => 'أطفال',
            'status' => 'active',
        ]);

        $supplierB = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'SUP-B-SEC',
            'name' => 'مورد خاص بشركة ب',
            'payment_terms' => 'net_30',
        ]);

        $prodOrderB = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'order_number' => 'PO-B-CONFIDENTIAL',
            'garment_model_id' => $modelB->id,
            'planned_start_date' => date('Y-m-d'),
            'target_delivery_date' => date('Y-m-d'),
            'total_planned_quantity' => 500,
            'status' => 'draft',
        ]);

        // المستخدم أ (شركة النيل) يحاول قراءة بيانات شركة ب باستخدام الـ IDs المباشرة
        $this->actingAs($this->userA)
            ->getJson("/api/v1/branches/{$branchB->id}")
            ->assertStatus(404);

        $this->actingAs($this->userA)
            ->getJson("/api/v1/models/{$modelB->id}")
            ->assertStatus(404);

        $this->actingAs($this->userA)
            ->getJson("/api/v1/suppliers/{$supplierB->id}")
            ->assertStatus(404);

        $this->actingAs($this->userA)
            ->getJson("/api/v1/production-orders/{$prodOrderB->id}")
            ->assertStatus(404);

        // المستخدم أ يحاول اعتماد أو تعديل أمر إنتاج شركة ب
        $this->actingAs($this->userA)
            ->postJson("/api/v1/production-orders/{$prodOrderB->id}/approve")
            ->assertStatus(404);
    }

    /**
     * اختبار أمان 3: تغيير X-Tenant-ID لا يسمح بتجاوز العزل (CrossTenantAccessDenied 403)
     */
    public function test_changing_x_tenant_id_header_does_not_bypass_isolation(): void
    {
        // مستخدم شركة أ يرسل هيدر شركة ب في محاولة للتسلل
        $response = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-ID', $this->tenantB->id)
            ->getJson('/api/v1/branches');

        $response->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        // اختبار TenantScope: في حال غياب سياق الشركة، يفشل الاستعلام بالإغلاق التام (Fail-Closed)
        app()->forgetInstance('current_tenant_id');
        $this->assertCount(0, Branch::all());
        $this->assertCount(0, InventoryItem::all());
    }

    /**
     * اختبار أمان 4: لا يمكن تسجيل حركة مخزنية لصنف أو مخزن تابع لشركة أخرى (403)
     */
    public function test_cannot_record_inventory_transaction_for_item_belonging_to_another_tenant(): void
    {
        // مستخدم شركة أ يحاول تسجيل صرف أو استلام على صنف شركة ب
        $response = $this->actingAs($this->userA)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->itemB->id,
                'transaction_type' => 'goods_receipt',
                'direction' => 'IN',
                'quantity' => 50,
                'unit_cost' => 120,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        // التأكد من عدم تغير رصيد صنف شركة ب نهائياً
        $this->assertEquals(200.0, (float) $this->itemB->fresh()->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->itemB->id)->count());
    }

    /**
     * اختبار أمان 5: لا تؤدي إعادة إرسال نفس الحركة المخزنية إلى تكرار الترحيل (Idempotency)
     */
    public function test_resending_same_inventory_transaction_does_not_cause_duplicate_posting(): void
    {
        $idempotencyKey = 'IDEMP-TX-SAFE-999';
        $payload = [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 25.0,
            'unit_cost' => 80.0,
            'notes' => 'شحنة خامات إضافية آمنة',
            'idempotency_key' => $idempotencyKey,
        ];

        // 1. الإرسال الأول: يجب تنفيذه بنجاح وترحيل الرصيد (100 + 25 = 125)
        $res1 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/inventory/transactions', $payload);

        $res1->assertStatus(201);
        $this->assertEquals(125.0, (float) $this->itemA->fresh()->current_balance);

        // 2. إعادة إرسال نفس الطلب بنفس المفتاح (مثلاً بسبب انقطاع شبكة أو ضغط مكرر)
        $res2 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempotencyKey)
            ->postJson('/api/v1/inventory/transactions', $payload);

        $res2->assertStatus(200)
            ->assertJsonPath('is_duplicate', true);

        // 3. التحقق الحرج: الرصيد لا يزال 125.0 ولم يتضاعف إلى 150.0!
        $this->assertEquals(125.0, (float) $this->itemA->fresh()->current_balance);

        // دفتر الأستاذ يحتوي على قيد واحد فقط لهذه العملية
        $this->assertEquals(1, InventoryTransaction::where('idempotency_key', $idempotencyKey)->count());
    }

    /**
     * اختبار أمان 6: منع التكرار المالي لفواتير الموردين (Financial Duplicate Posting Protection)
     */
    public function test_resending_same_supplier_invoice_does_not_cause_duplicate_financial_posting(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-FIN-01',
            'name' => 'شركة الغزل المصرية',
            'payment_terms' => 'net_30',
            'current_balance' => 0.0,
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'po_number' => 'PO-FIN-001',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'order_date' => date('Y-m-d'),
            'status' => 'approved',
            'subtotal' => 1000.0,
            'tax_amount' => 140.0,
            'total_amount' => 1140.0,
        ]);

        $invoicePayload = [
            'invoice_number' => 'INV-2026-X100',
            'purchase_order_id' => $po->id,
            'subtotal' => 1000.0,
            'tax_amount' => 140.0,
            'idempotency_key' => 'IDEMP-INV-X100',
        ];

        // 1. تسجيل الفاتورة للمرة الأولى
        $res1 = $this->actingAs($this->userA)
            ->postJson('/api/v1/supplier-invoices', $invoicePayload);

        $res1->assertStatus(201);
        $this->assertEquals(1140.0, (float) $supplier->fresh()->current_balance);

        // 2. إعادة إرسال الفاتورة نفسها
        $res2 = $this->actingAs($this->userA)
            ->postJson('/api/v1/supplier-invoices', $invoicePayload);

        $res2->assertStatus(200)
            ->assertJsonPath('is_duplicate', true);

        // 3. التحقق الحرج: رصيد المورد المستحق لم يتضاعف إلى 2280.0 بل بقي 1140.0
        $this->assertEquals(1140.0, (float) $supplier->fresh()->current_balance);
        $this->assertEquals(1, SupplierInvoice::where('invoice_number', 'INV-2026-X100')->count());
    }

    /**
     * اختبار أمان 7: تسجيل الدخول ورفض الحسابات المعطلة أو الشركات الموقوفة
     */
    public function test_login_flow_and_inactive_or_suspended_account_handling(): void
    {
        // 1. تسجيل الدخول الناجح وإصدار التوكن
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'tarek@niletextile.com',
            'password' => 'StrongPass123!',
        ]);

        $loginRes->assertStatus(200)
            ->assertJsonStructure(['access_token', 'token_type', 'user', 'tenant']);

        // 2. رفض الحساب المعطل (is_active = false)
        $this->userA->is_active = false;
        $this->userA->save();

        $deactiveRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'tarek@niletextile.com',
            'password' => 'StrongPass123!',
        ]);
        $deactiveRes->assertStatus(403)
            ->assertJsonPath('error', 'UserAccountDeactivated');

        // 3. رفض الشركة الموقوفة (status = suspended)
        $this->userA->is_active = true;
        $this->userA->save();

        $this->tenantA->status = 'suspended';
        $this->tenantA->save();

        $suspendedRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'tarek@niletextile.com',
            'password' => 'StrongPass123!',
        ]);
        $suspendedRes->assertStatus(403)
            ->assertJsonPath('error', 'TenantSuspended');
    }

    /**
     * اختبار أمان 8: رفض تنفيذ حركات InventoryService عند غياب سياق الشركة تماماً مع عدم المساس بالرصيد
     */
    public function test_inventory_service_rejects_missing_tenant_context_without_mutations(): void
    {
        // إلغاء أي سياق شركة مسجل
        app()->forgetInstance('current_tenant_id');

        $service = app(\App\Services\InventoryService::class);
        $initialBalance = (float) $this->itemA->fresh()->current_balance;
        $initialTxCount = InventoryTransaction::count();

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('سياق الشركة مفقود');

        try {
            $service->recordTransaction([
                'inventory_item_id' => $this->itemA->id,
                'warehouse_id' => $this->warehouseA->id,
                'transaction_type' => 'goods_receipt',
                'direction' => 'IN',
                'quantity' => 50.0,
                'unit_cost' => 80.0,
            ]);
        } finally {
            // التأكيد الحرج: لم يتم أي تعديل في دفتر الأستاذ أو رصيد الصنف
            $this->assertEquals($initialBalance, (float) $this->itemA->fresh()->current_balance);
            $this->assertEquals($initialTxCount, InventoryTransaction::count());
        }
    }

    /**
     * اختبار أمان 9: رفض تزوير tenant_id عند تمريره لخدمة InventoryService
     */
    public function test_inventory_service_rejects_tenant_id_spoofing(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $service = app(\App\Services\InventoryService::class);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('تعارض أمني');

        // تمرير tenant_id للشركة ب بينما السياق الموثق للشركة أ
        $service->recordTransaction([
            'tenant_id' => $this->tenantB->id,
            'inventory_item_id' => $this->itemA->id,
            'warehouse_id' => $this->warehouseA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 10.0,
            'unit_cost' => 80.0,
        ]);
    }

    /**
     * اختبار أمان 10: كشف تعارض Idempotency (409 Conflict) عند اختلاف تفاصيل الحمولة لنفس المفتاح
     */
    public function test_idempotency_payload_mismatch_returns_409_conflict(): void
    {
        $idempKey = 'IDEMP-MISMATCH-TEST-999';

        // 1. الطلب الأول بكمية 10
        $res1 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->itemA->id,
                'warehouse_id' => $this->warehouseA->id,
                'transaction_type' => 'adjustment_positive',
                'direction' => 'IN',
                'quantity' => 10.0,
                'unit_cost' => 80.0,
                'notes' => 'الطلب الأصلي',
                'idempotency_key' => $idempKey,
            ]);

        $res1->assertStatus(201);

        // 2. محاولة استغلال نفس المفتاح لعملية مختلفة (كمية 50 بدل 10)
        $res2 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->itemA->id,
                'warehouse_id' => $this->warehouseA->id,
                'transaction_type' => 'adjustment_positive',
                'direction' => 'IN',
                'quantity' => 50.0, // اختلاف جوهري في الكمية!
                'unit_cost' => 80.0,
                'notes' => 'طلب مختلف بنفس المفتاح',
                'idempotency_key' => $idempKey,
            ]);

        $res2->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * اختبار أمان 11: عزل مفاتيح عدم التكرار بين الشركات (Cross-Tenant Idempotency Key Isolation)
     */
    public function test_cross_tenant_idempotency_key_isolation(): void
    {
        $sharedKey = 'GLOBAL-COMMON-KEY-2026';

        // 1. الشركة أ تستخدم المفتاح المشترك
        $resA = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $sharedKey)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->itemA->id,
                'warehouse_id' => $this->warehouseA->id,
                'transaction_type' => 'adjustment_positive',
                'direction' => 'IN',
                'quantity' => 15.0,
                'unit_cost' => 80.0,
                'idempotency_key' => $sharedKey,
            ]);

        $resA->assertStatus(201);

        // 2. الشركة ب تستخدم نفس المفتاح حرفياً لصنفها الخاص
        $resB = $this->actingAs($this->userB)
            ->withHeader('X-Idempotency-Key', $sharedKey)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->itemB->id,
                'warehouse_id' => $this->warehouseB->id,
                'transaction_type' => 'adjustment_positive',
                'direction' => 'IN',
                'quantity' => 30.0,
                'unit_cost' => 90.0,
                'idempotency_key' => $sharedKey,
            ]);

        // يجب أن تنجح كلتا العمليتين كعمليات جديدة مستقلة تماماً بفضل القيد المركب [tenant_id, idempotency_key]
        $resB->assertStatus(201);

        // لم تكشف عملية أ لشركة ب
        $this->assertEquals($this->tenantA->id, $resA->json('transaction.tenant_id'));
        $this->assertEquals($this->tenantB->id, $resB->json('transaction.tenant_id'));
        $this->assertNotEquals($resA->json('transaction.id'), $resB->json('transaction.id'));
    }

    /**
     * اختبار أمان 12: فرض قواعد انتهاء الفترة التجريبية وتفعيل الاشتراك (Trial Expiration & Activation)
     */
    public function test_trial_expiration_rules_and_subscription_activation(): void
    {
        // 1. إنشاء شركة جديدة في فترة تجربة سارية
        $tenantTrial = Tenant::create([
            'code' => 'TEN-TRIAL',
            'name' => 'مصنع التجربة الجديد',
            'subdomain' => 'trial-factory',
            'status' => 'trial',
            'settings' => [
                'subscription' => [
                    'status' => 'trial',
                    'is_paid' => false,
                    'trial_ends_at' => now()->addDays(7)->toIso8601String(),
                ],
            ],
        ]);

        $userTrial = User::create([
            'tenant_id' => $tenantTrial->id,
            'name' => 'مسؤول التجربة',
            'email' => 'trial@factory.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // فترة تجربة سارية: يمكن الوصول لمسار الموديلات
        $resActive = $this->actingAs($userTrial)->getJson('/api/v1/models');
        $resActive->assertStatus(200);

        // 2. انتهاء الفترة التجريبية (trial_ends_at في الماضي و is_paid = false)
        $tenantTrial->settings = [
            'subscription' => [
                'status' => 'trial',
                'is_paid' => false,
                'trial_ends_at' => now()->subDay()->toIso8601String(),
            ],
        ];
        $tenantTrial->save();

        // محاولة الوصول لمسارات ERP العادية يجب أن تُرفض برمز 402 Payment Required
        $resExpiredERP = $this->actingAs($userTrial)->getJson('/api/v1/models');
        $resExpiredERP->assertStatus(402)
            ->assertJsonPath('error', 'TrialExpired');

        // لكن مسار البروفايل مسموح للاطلاع على حالة الحساب
        $resProfile = $this->actingAs($userTrial)->getJson('/api/v1/tenant/profile');
        $resProfile->assertStatus(200);

        // 3. محاولة تفعيل الاشتراك المدفوع من قبل المستأجر مباشرة (يجب أن تظل معلقة الدفع وغير مفعلة)
        $resPay = $this->actingAs($userTrial)->postJson('/api/v1/tenant/subscription/activate', [
            'plan_tier' => 'professional',
            'payment_reference' => 'PAY-REF-998877',
        ]);
        $resPay->assertStatus(200)
            ->assertJsonPath('tenant.is_paid', false)
            ->assertJsonPath('tenant.subscription_status', 'payment_pending');

        // التحقق من أن مسارات ERP تظل محجوبة برمز 402 لأن الاشتراك لم يتم سداده فعلياً عبر بوابة الدفع
        $resStillExpired = $this->actingAs($userTrial)->getJson('/api/v1/models');
        $resStillExpired->assertStatus(402)
            ->assertJsonPath('error', 'TrialExpired');

        // 4. وصول إشعار Webhook مشفر وموثق من بوابة الدفع يفيد نجاح العملية
        $orderReference = $resPay->json('payment_order.order_reference');
        $amount = (float)$resPay->json('payment_order.amount');
        $webhookSecret = config('services.payment.webhook_secret');
        $ts = now()->timestamp;
        $webhookPayload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-TEST-001',
            'tenant_id' => $tenantTrial->id,
            'plan_tier' => 'professional',
            'amount' => $amount,
            'currency' => 'EGP',
            'order_reference' => $orderReference,
            'status' => 'succeeded',
            'timestamp' => $ts,
        ];
        $payloadJson = json_encode($webhookPayload);
        $signature = hash_hmac('sha256', "{$ts}.{$payloadJson}", $webhookSecret);

        $resWebhook = $this->call(
            'POST',
            '/api/v1/subscriptions/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SIGNATURE' => $signature,
                'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
            ],
            $payloadJson
        );
        $resWebhook->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('is_paid', true);

        // 5. بعد سداد الاشتراك الموثق عبر الـ Webhook: إعادة فتح مسارات الـ ERP بنجاح كامل
        $resAfterPay = $this->actingAs($userTrial)->getJson('/api/v1/models');
        $resAfterPay->assertStatus(200);
    }

    /**
     * اختبار أمان 13: فرض قيد التفرد على مستوى قاعدة البيانات لمنع التكرار المتزامن (DB Unique Constraint Simulation)
     */
    public function test_db_level_unique_constraint_blocks_concurrent_duplicate_insertion(): void
    {
        $idempKey = 'RACE-IDEMP-' . uniqid();

        // الإدراج الأول لقيد حركة مخزنية
        InventoryTransaction::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 10.0,
            'unit_cost' => 80.0,
            'total_cost' => 800.0,
            'balance_before' => 100.0,
            'balance_after' => 110.0,
            'idempotency_key' => $idempKey,
        ]);

        // محاولة إدراج متزامن مباشر على مستوى قاعدة البيانات بنفس (tenant_id, idempotency_key)
        $this->expectException(\Illuminate\Database\QueryException::class);

        InventoryTransaction::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 10.0,
            'unit_cost' => 80.0,
            'total_cost' => 800.0,
            'balance_before' => 110.0,
            'balance_after' => 120.0,
            'idempotency_key' => $idempKey,
        ]);
    }

    /**
     * اختبار أمان 14: التحقق من التراجع الذري التام (Atomic Rollback) عند فشل العملية في منتصف التنفيذ
     */
    public function test_transaction_rollback_prevents_partial_state_on_mid_execution_failure(): void
    {
        app()->instance('current_tenant_id', $this->tenantA->id);
        $service = app(\App\Services\InventoryService::class);

        $initialBalance = (float) $this->itemA->fresh()->current_balance;
        $initialTxCount = InventoryTransaction::count();

        // محاولة تنفيذ حركة صرف تكسر قيد الرصيد السالب
        try {
            $service->recordTransaction([
                'inventory_item_id' => $this->itemA->id,
                'warehouse_id' => $this->warehouseA->id,
                'transaction_type' => 'material_issuance',
                'direction' => 'OUT',
                'quantity' => 99999.0, // كمية تفوق الرصيد الحالي بكثير
                'unit_cost' => 80.0,
            ]);
            $this->fail('كان ينبغي رفض العملية بسبب عدم كفاية الرصيد.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('غير كافٍ', $e->getMessage());
        }

        // التأكد من عدم وجود أي تحديث جزئي أو قيد معلق
        $this->assertEquals($initialBalance, (float) $this->itemA->fresh()->current_balance);
        $this->assertEquals($initialTxCount, InventoryTransaction::count());
    }

    /**
     * اختبار أمان 15: التحقق من أن تكرار رقم فاتورة المورد لا يضاعف الالتزام المالي
     */
    public function test_duplicate_supplier_invoice_number_prevents_duplicate_financial_liability(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-TEST-DUP-01',
            'name' => 'مورد الأقمشة المعتمد',
            'payment_terms' => 'net_30',
            'current_balance' => 0.0,
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'po_number' => 'PO-DUP-TEST-001',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'order_date' => date('Y-m-d'),
            'status' => 'approved',
            'subtotal' => 2000.0,
            'tax_amount' => 280.0,
            'total_amount' => 2280.0,
        ]);

        $procurementService = app(\App\Services\ProcurementService::class);
        app()->instance('current_tenant_id', $this->tenantA->id);

        $invoiceData = [
            'invoice_number' => 'INV-UNIQUE-SERIES-999',
            'purchase_order_id' => $po->id,
            'subtotal' => 2000.0,
            'tax_amount' => 280.0,
        ];

        // 1. الترحيل الأول للفاتورة
        $inv1 = $procurementService->matchAndCreateInvoice($invoiceData);
        $this->assertEquals(2280.0, (float) $supplier->fresh()->current_balance);

        // 2. محاولة ترحيل فاتورة ثانية بنفس رقم الفاتورة لنفس المورد
        $inv2 = $procurementService->matchAndCreateInvoice($invoiceData);

        // يجب أن يعيد الفاتورة الأصلية دون مضاعفة رصيد المورد
        $this->assertEquals($inv1->id, $inv2->id);
        $this->assertEquals(2280.0, (float) $supplier->fresh()->current_balance);
    }

    /**
     * اختبار أمان 16: التحقق من عدم تكرار أذون استلام البضائع (GRN) وعدم مضاعفة رصيد المخزن
     */
    public function test_goods_receipt_idempotency_prevents_duplicate_stock_addition(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-GRN-IDEMP',
            'name' => 'مورد خامات القص',
            'current_balance' => 0.0,
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'po_number' => 'PO-GRN-IDEMP-01',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'order_date' => date('Y-m-d'),
            'status' => 'approved',
            'subtotal' => 1600.0,
            'tax_amount' => 224.0,
            'total_amount' => 1824.0,
        ]);

        $poItem = PurchaseOrderItem::create([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->itemA->id,
            'ordered_quantity' => 50.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 50.0,
            'unit_price' => 80.0,
            'tax_rate' => 14.0,
            'total_price' => 4560.0,
        ]);

        $initialStock = (float) $this->itemA->fresh()->current_balance;
        $grnIdempKey = 'GRN-IDEMP-KEY-' . uniqid();

        $grnPayload = [
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'inspection_status' => 'passed',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 20.0,
                    'accepted_quantity' => 20.0,
                    'rejected_quantity' => 0.0,
                ],
            ],
            'idempotency_key' => $grnIdempKey,
        ];

        // 1. الإرسال الأول لإذن الاستلام والفحص
        $res1 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $grnIdempKey)
            ->postJson('/api/v1/goods-receipts', $grnPayload);

        $res1->assertStatus(201);
        $this->assertEquals($initialStock + 20.0, (float) $this->itemA->fresh()->current_balance);

        // 2. إعادة إرسال نفس إذن الاستلام بنفس المفتاح
        $res2 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $grnIdempKey)
            ->postJson('/api/v1/goods-receipts', $grnPayload);

        $res2->assertStatus(200)
            ->assertJsonPath('is_duplicate', true);

        // 3. التحقق الحرج: المخزون زاد بـ 20 فقط ولم يتضاعف بـ 40!
        $this->assertEquals($initialStock + 20.0, (float) $this->itemA->fresh()->current_balance);
        $this->assertEquals(1, GoodsReceiptNote::where('idempotency_key', $grnIdempKey)->count());
    }

    /**
     * اختبار أمان 17: التحقق من حماية مسار الدخول بمعدل طلبات محدد (Rate Limiting)
     */
    public function test_rate_limiting_protects_login_endpoint(): void
    {
        // إرسال 10 محاولات دخول فاشلة متتالية (الحد الأقصى هو 10 في الدقيقة)
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'tarek@niletextile.com',
                'password' => 'WrongPassword!',
            ]);
        }

        // المحاولة رقم 11 يجب حظرها برمز 429 Too Many Requests
        $resBlocked = $this->postJson('/api/v1/auth/login', [
            'email' => 'tarek@niletextile.com',
            'password' => 'WrongPassword!',
        ]);

        $resBlocked->assertStatus(429);
    }

    /**
     * اختبار أمان 18: منع تفعيل الاشتراك المدفوع ببيانات عميل وهمية أو مراجع غير موثقة
     */
    public function test_client_supplied_payment_reference_cannot_activate_subscription_without_verification(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-AHRAM-WEAR',
            'name' => 'شركة ملابس الأهرام',
            'subdomain' => 'ahram-wear',
            'status' => 'active',
            'plan_tier' => 'starter',
            'is_paid' => false,
            'settings' => [
                'subscription' => [
                    'status' => 'trial',
                    'is_paid' => false,
                    'trial_ends_at' => now()->subHours(2)->toIso8601String(),
                ],
            ],
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'مدير الحساب التجريبي',
            'email' => 'trial-manager@ahram.com',
            'password' => bcrypt('SecretPassword123!'),
            'role' => 'tenant_admin',
            'is_active' => true,
        ]);

        // 1. استدعاء بدون payment_reference
        $resNoRef = $this->actingAs($user)->postJson('/api/v1/tenant/subscription/activate', [
            'plan_tier' => 'professional',
        ]);
        $resNoRef->assertStatus(200)
            ->assertJsonPath('tenant.is_paid', false)
            ->assertJsonPath('is_paid', false)
            ->assertJsonPath('subscription_status', 'payment_pending');

        // مسارات ERP يجب أن تظل مغلقة 402
        $resERP1 = $this->actingAs($user)->getJson('/api/v1/models');
        $resERP1->assertStatus(402);

        // 2. استدعاء بمرجع دفع مزور من قبل العميل
        $resFakeRef = $this->actingAs($user)->postJson('/api/v1/tenant/subscription/activate', [
            'plan_tier' => 'professional',
            'payment_reference' => 'PAY-FAKEREF-999999999',
        ]);
        $resFakeRef->assertStatus(200)
            ->assertJsonPath('tenant.is_paid', false)
            ->assertJsonPath('is_paid', false);

        // مسارات ERP تظل محجوبة تماماً
        $resERP2 = $this->actingAs($user)->getJson('/api/v1/models');
        $resERP2->assertStatus(402);
    }

    /**
     * اختبار أمان 19: التحقق من التوقيع الرقمي للـ Webhook ومعالجة عدم التكرار (Idempotent Webhook)
     */
    public function test_cryptographic_webhook_payment_activates_subscription_and_handles_idempotent_replay(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-DELTA-WEAR',
            'name' => 'مصنع الدلتا للملابس',
            'subdomain' => 'delta-garments',
            'status' => 'active',
            'plan_tier' => 'starter',
            'is_paid' => false,
            'settings' => [
                'subscription' => [
                    'status' => 'trial',
                    'is_paid' => false,
                    'trial_ends_at' => now()->subDay()->toIso8601String(),
                ],
            ],
        ]);

        \App\Models\SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'INV-DELTA-2026-001',
            'plan_tier' => 'professional',
            'amount' => 6000.0,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(3),
        ]);

        $webhookSecret = config('services.payment.webhook_secret');

        $validPayload = [
            'event' => 'payment.succeeded',
            'event_id' => 'EVT-WEBHOOK-DELTA-01',
            'tenant_id' => $tenant->id,
            'plan_tier' => 'professional',
            'amount' => 6000.0,
            'currency' => 'EGP',
            'invoice_reference' => 'INV-DELTA-2026-001',
            'status' => 'paid',
            'timestamp' => now()->timestamp,
        ];
        $validPayloadJson = json_encode($validPayload);

        // 1. طلب Webhook بدون توقيع رقمي -> رفض 401 MissingSignature
        $resNoSig = $this->call(
            'POST',
            '/api/v1/subscriptions/webhook',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $validPayloadJson
        );
        $resNoSig->assertStatus(401)
            ->assertJsonPath('error', 'MissingSignature');

        // 2. طلب Webhook بتوقيع مزور غير مطابق -> رفض 401 InvalidSignature
        $resBadSig = $this->call(
            'POST',
            '/api/v1/subscriptions/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SIGNATURE' => 'invalid_forged_hmac_signature_hash',
            ],
            $validPayloadJson
        );
        $resBadSig->assertStatus(401)
            ->assertJsonPath('error', 'InvalidSignature');

        // 3. طلب Webhook صحيح وموقع رقمياً بـ HMAC-SHA256
        $ts = $validPayload['timestamp'];
        $validSig = hash_hmac('sha256', "{$ts}.{$validPayloadJson}", $webhookSecret);
        $resSuccess = $this->call(
            'POST',
            '/api/v1/subscriptions/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SIGNATURE' => $validSig,
                'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
            ],
            $validPayloadJson
        );
        $resSuccess->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('is_paid', true);

        // التحقق من تفعيل المستأجر وتسجيل عملية التدقيق في AuditLog
        $this->assertTrue((bool)$tenant->fresh()->is_paid);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'subscription_activated_via_webhook',
        ]);

        // 4. إعادة إرسال نفس إشعار الدفع بنفس event_id (Idempotency Replay)
        $resReplay = $this->call(
            'POST',
            '/api/v1/subscriptions/webhook',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X_SIGNATURE' => $validSig,
                'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
            ],
            $validPayloadJson
        );
        $resReplay->assertStatus(200)
            ->assertJsonPath('status', 'already_processed');
    }

    /**
     * اختبار أمان 20: تفعيل المشرف العام (Platform Admin) مع رفض المستخدمين العاديين
     */
    public function test_platform_admin_can_manually_activate_subscription_with_auditable_authorization(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-ELITE-MFG',
            'name' => 'مصنع النخبة',
            'subdomain' => 'elite-factory',
            'status' => 'active',
            'plan_tier' => 'starter',
            'is_paid' => false,
        ]);

        $adminUser = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مشرف المنصة العام',
            'email' => 'superadmin@garmentos.cloud',
            'password' => bcrypt('AdminPassword123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        // 1. مستخدم عادي يحاول استدعاء نقطة تفعيل المشرف العام -> 403 Forbidden
        $resForbidden = $this->actingAs($this->userA)->postJson("/api/v1/admin/tenants/{$tenant->id}/activate-subscription", [
            'authorization_code' => 'AUTH-PLATFORM-EXEC-2026',
            'reason' => 'تحويل بنكي مباشر معتمد',
            'plan_tier' => 'enterprise',
        ]);
        $resForbidden->assertStatus(403)
            ->assertJsonPath('error', 'PlatformAdminOnly');

        // 2. مشرف المنصة العام ينفذ التفعيل الموثق
        $platformSecret = config('services.platform.admin_activation_key');
        $resAdmin = $this->actingAs($adminUser)->postJson("/api/v1/admin/tenants/{$tenant->id}/activate-subscription", [
            'authorization_code' => $platformSecret,
            'authorized_by' => 'CEO Office / Financial Director',
            'reason' => 'تم استلام تحويل بنكي على حساب الشركة في البنك الأهلي',
            'plan_tier' => 'enterprise',
        ]);
        $resAdmin->assertStatus(200)
            ->assertJsonPath('status', 'activated')
            ->assertJsonPath('tenant.is_paid', true)
            ->assertJsonPath('tenant.plan_tier', 'enterprise');

        $this->assertTrue((bool)$tenant->fresh()->is_paid);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'admin_manual_activation',
        ]);
    }

    /**
     * اختبار أمان 21: حماية خامات أمانات العملاء وعزل المستودعات ومنع الأرصدة السالبة
     */
    public function test_customer_material_tenant_isolation_foreign_warehouse_and_consumption_integrity(): void
    {
        // 1. محاولة استلام خامة عميل بمستودع تابع لشركة أخرى (Cross-Tenant Warehouse)
        $resForeignWh = $this->actingAs($this->userA)->postJson('/api/v1/inventory/customer-materials', [
            'warehouse_id' => $this->warehouseB->id, // مستودع الشركة B!
            'customer_name' => 'عميل تصنيع للغير',
            'fabric_name' => 'قماش قطن 100% سنغل ليكرا',
            'received_meters' => 1000.0,
        ]);
        $resForeignWh->assertStatus(422);

        // 2. استلام خامة عميل نظامياً لشركة A
        $resValid = $this->actingAs($this->userA)->postJson('/api/v1/inventory/customer-materials', [
            'warehouse_id' => $this->warehouseA->id,
            'customer_name' => 'عميل تصنيع للغير',
            'fabric_name' => 'قماش قطن 100% سنغل ليكرا',
            'received_meters' => 500.0,
        ]);
        $resValid->assertStatus(201);
        $materialId = $resValid->json('customer_material.id');

        // 3. محاولة صرف كمية أكبر من المتاح (550 متر من أصل 500) -> يجب أن ترفض وتمنع الرصيد السالب
        $resOver = $this->actingAs($this->userA)->postJson("/api/v1/inventory/customer-materials/{$materialId}/consume", [
            'consumed_meters' => 550.0,
            'waste_meters' => 10.0,
        ]);
        $resOver->assertStatus(422);

        // 4. محاولة صرف بواسطة مستخدم شركة B لخامة تابعة لشركة A -> 404 (Scoping Isolation)
        $resForeignConsume = $this->actingAs($this->userB)->postJson("/api/v1/inventory/customer-materials/{$materialId}/consume", [
            'consumed_meters' => 50.0,
            'waste_meters' => 2.0,
        ]);
        $resForeignConsume->assertStatus(404);

        // 5. صرف صحيح بنجاح والتحقق من حساب الأرصدة
        $resConsume = $this->actingAs($this->userA)->postJson("/api/v1/inventory/customer-materials/{$materialId}/consume", [
            'consumed_meters' => 200.0,
            'waste_meters' => 10.0,
        ]);
        $resConsume->assertStatus(200);

        $mat = \App\Models\CustomerMaterial::findOrFail($materialId);
        $this->assertEquals(200.0, (float) $mat->consumed_meters);
        $this->assertEquals(10.0, (float) $mat->waste_meters);
        $this->assertEquals(290.0, (float) $mat->remaining_meters);
    }

    /**
     * اختبار أمان 22: التحقق من بصمة Idempotency لأمر الإنتاج ومقارنة كافة الحقول والكميات
     */
    public function test_production_order_idempotency_fingerprint_detects_changed_payload_and_returns_conflict(): void
    {
        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSH-FP-' . uniqid(),
            'name' => 'تيشيرت صيفي مطبوع',
            'season' => 'summer',
            'year' => 2026,
            'category' => 'tops',
        ]);

        $color = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر زاهي',
            'color_code' => '#FF0000',
        ]);

        $size = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => '2Y',
            'category' => 'kids',
            'sort_order' => 1,
        ]);

        $idempKey = 'PO-FINGERPRINT-TEST-' . uniqid();

        $basePayload = [
            'garment_model_id' => $model->id,
            'planned_start_date' => '2026-11-01',
            'target_delivery_date' => '2026-11-15',
            'priority' => 'high',
            'items' => [
                [
                    'color_id' => $color->id,
                    'size_id' => $size->id,
                    'planned_quantity' => 100,
                ],
            ],
            'idempotency_key' => $idempKey,
        ];

        // 1. الإنشاء الأول
        $res1 = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/production-orders', $basePayload);
        $res1->assertStatus(201);
        $createdId = $res1->json('data.id');

        // 2. إعادة إرسال نفس الطلب بنفس الحقول والمقادير -> Replay 200
        $resReplay = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/production-orders', $basePayload);
        $resReplay->assertStatus(200)
            ->assertJsonPath('is_duplicate', true)
            ->assertJsonPath('data.id', $createdId);

        // 3. إعادة إرسال نفس المفتاح مع تغيير الكمية (100 -> 250) -> يجب أن يعود 409 IdempotencyConflict
        $modifiedQtyPayload = $basePayload;
        $modifiedQtyPayload['items'][0]['planned_quantity'] = 250;

        $resConflictQty = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/production-orders', $modifiedQtyPayload);
        $resConflictQty->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');

        // 4. إعادة إرسال نفس المفتاح مع تغيير الأولوية -> 409 IdempotencyConflict
        $modifiedPriorityPayload = $basePayload;
        $modifiedPriorityPayload['priority'] = 'low';

        $resConflictPri = $this->actingAs($this->userA)
            ->withHeader('X-Idempotency-Key', $idempKey)
            ->postJson('/api/v1/production-orders', $modifiedPriorityPayload);
        $resConflictPri->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * اختبار أمان 23: تعارض فاتورة المورد المكررة مع أمر شراء أو مبالغ مالية مختلفة يعود 409
     */
    public function test_duplicate_supplier_invoice_with_conflicting_amount_or_po_returns_conflict(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-TEST-CONFLICT-' . uniqid(),
            'name' => 'شركة النيل للغزل والنسيج',
            'is_active' => true,
        ]);

        $po1 = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-CONF-001-' . uniqid(),
            'order_date' => date('Y-m-d'),
            'subtotal' => 5000.0,
            'tax_amount' => 700.0,
            'total_amount' => 5700.0,
            'status' => 'approved',
        ]);

        $po2 = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-CONF-002-' . uniqid(),
            'order_date' => date('Y-m-d'),
            'subtotal' => 8000.0,
            'tax_amount' => 1120.0,
            'total_amount' => 9120.0,
            'status' => 'approved',
        ]);

        $invoiceNumber = 'INV-SERIES-CONFLICT-' . uniqid();

        // 1. تسجيل الفاتورة الأولى بنجاح
        $res1 = $this->actingAs($this->userA)->postJson('/api/v1/supplier-invoices', [
            'purchase_order_id' => $po1->id,
            'invoice_number' => $invoiceNumber,
            'invoice_date' => date('Y-m-d'),
            'subtotal' => 5000.0,
            'tax_amount' => 700.0,
        ]);
        $res1->assertStatus(201);

        // 2. إعادة إرسال نفس رقم الفاتورة لنفس المورد لكن بأمر شراء مختلف (PO2) -> يجب الرفض برمز 409
        $resConflictPo = $this->actingAs($this->userA)->postJson('/api/v1/supplier-invoices', [
            'purchase_order_id' => $po2->id,
            'invoice_number' => $invoiceNumber,
            'invoice_date' => date('Y-m-d'),
            'subtotal' => 5000.0,
            'tax_amount' => 700.0,
        ]);
        $resConflictPo->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');

        // 3. إعادة إرسال نفس رقم الفاتورة لنفس أمر الشراء لكن بمبلغ مختلف -> يجب الرفض برمز 409
        $resConflictAmt = $this->actingAs($this->userA)->postJson('/api/v1/supplier-invoices', [
            'purchase_order_id' => $po1->id,
            'invoice_number' => $invoiceNumber,
            'invoice_date' => date('Y-m-d'),
            'subtotal' => 7500.0, // مبلغ متضارب
            'tax_amount' => 1050.0,
        ]);
        $resConflictAmt->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * اختبار أمان 24: اختبارات سلبية شاملة للـ Webhook (توقيع مزور، شركة خاطئة، مبلغ خاطئ، طلب غير موجود، حالة فاشلة)
     */
    public function test_webhook_negative_cases_reject_forged_wrong_tenant_wrong_amount_and_unsuccessful_status(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-NEG-WEBHOOK',
            'name' => 'مصنع النورس للملابس',
            'subdomain' => 'nawras-apparel',
            'status' => 'active',
            'plan_tier' => 'professional',
            'is_paid' => false,
        ]);

        $order = \App\Models\SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'ORD-SEC-TEST-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $webhookSecret = config('services.payment.webhook_secret');

        // أ) اختبار التوقيع المزور -> 401 InvalidSignature
        $badPayload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-FORGED-' . uniqid(),
            'tenant_id' => $tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'timestamp' => now()->timestamp,
        ];
        $badPayloadJson = json_encode($badPayload);
        $resForged = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => 'forged_signature_hash_which_does_not_match',
        ], $badPayloadJson);
        $resForged->assertStatus(401)->assertJsonPath('error', 'InvalidSignature');

        // ب) اختبار طابع زمني قديم خارج نافذة السماح (> 300 ثانية) -> 401 TimestampToleranceExceeded
        $oldTimestampPayload = $badPayload;
        $oldTimestampPayload['timestamp'] = now()->subMinutes(10)->timestamp;
        $oldPayloadJson = json_encode($oldTimestampPayload);
        $oldSig = hash_hmac('sha256', $oldPayloadJson, $webhookSecret);
        $resExpiredTs = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $oldSig,
        ], $oldPayloadJson);
        $resExpiredTs->assertStatus(401)->assertJsonPath('error', 'TimestampToleranceExceeded');

        // ج) اختبار طلب دفع غير موجود في النظام -> 422 PendingOrderNotFound
        $ts = $badPayload['timestamp'];
        $fakeOrderPayload = $badPayload;
        $fakeOrderPayload['order_reference'] = 'ORD-DOES-NOT-EXIST-99999';
        $fakeJson = json_encode($fakeOrderPayload);
        $fakeSig = hash_hmac('sha256', "{$ts}.{$fakeJson}", $webhookSecret);
        $resNotFound = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $fakeSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $fakeJson);
        $resNotFound->assertStatus(422)->assertJsonPath('error', 'PendingOrderNotFound');

        // د) اختبار شركة مستأجرة غير مطابقة لصاحب الطلب -> 422 TenantMismatch
        $mismatchTenantPayload = $badPayload;
        $mismatchTenantPayload['tenant_id'] = $this->tenantB->id; // شركة B لطلب شركة النورس!
        $mismatchJson = json_encode($mismatchTenantPayload);
        $mismatchSig = hash_hmac('sha256', "{$ts}.{$mismatchJson}", $webhookSecret);
        $resTenantMismatch = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $mismatchSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $mismatchJson);
        $resTenantMismatch->assertStatus(422)->assertJsonPath('error', 'TenantMismatch');

        // هـ) اختبار مبلغ غير مطابق لقيمة الطلب -> 422 AmountMismatch
        $wrongAmountPayload = $badPayload;
        $wrongAmountPayload['amount'] = 999.0; // المطلوب 3500
        $wrongAmtJson = json_encode($wrongAmountPayload);
        $wrongAmtSig = hash_hmac('sha256', "{$ts}.{$wrongAmtJson}", $webhookSecret);
        $resAmtMismatch = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $wrongAmtSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $wrongAmtJson);
        $resAmtMismatch->assertStatus(422)->assertJsonPath('error', 'AmountMismatch');

        // و) اختبار حالة دفع فاشلة أو معلقة -> 422 PaymentNotSuccessful
        $failedStatusPayload = $badPayload;
        $failedStatusPayload['status'] = 'failed';
        $failedStatusJson = json_encode($failedStatusPayload);
        $failedStatusSig = hash_hmac('sha256', "{$ts}.{$failedStatusJson}", $webhookSecret);
        $resFailedStatus = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $failedStatusSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $failedStatusJson);
        $resFailedStatus->assertStatus(422)->assertJsonPath('error', 'PaymentNotSuccessful');
        $this->assertFalse((bool)$tenant->fresh()->is_paid);
    }

    /**
     * اختبار أمان 25: إغلاق الـ Webhook فورياً في حال غياب أو ضعف سر التشفير (Fail Closed)
     */
    public function test_webhook_fails_closed_when_secret_is_missing(): void
    {
        config(['services.payment.webhook_secret' => null]);

        $payload = json_encode(['event' => 'payment.completed']);
        $res = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => 'any_signature',
        ], $payload);

        $res->assertStatus(500)
            ->assertJsonPath('error', 'ServerMisconfiguration');
    }

    /**
     * اختبار أمان 26: التحقق من كود ترخيص المشرف العام وصلاحيات مسار إدارة المنصة المستقل
     */
    public function test_platform_admin_authorization_validation_and_audit(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-ADM-AUTH',
            'name' => 'مصنع المحلة الكبرى',
            'subdomain' => 'mahalla-factory',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $admin = User::create([
            'tenant_id' => null, // مشرف منصة مستقل بدون سياق شركة مستأجرة
            'name' => 'مشرف المنصة المركزي',
            'email' => 'superadmin@garmentos.cloud',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        // 1. محاولة بكود ترخيص خاطئ -> 403 InvalidAuthorizationCode
        $resBadCode = $this->actingAs($admin)->postJson("/api/v1/platform-admin/tenants/{$tenant->id}/activate-subscription", [
            'authorization_code' => 'WRONG-AUTHORIZATION-CODE-1234',
            'authorized_by' => 'Head of Platform',
            'reason' => 'اعتماد ترخيص سنوي',
            'plan_tier' => 'enterprise',
        ]);
        $resBadCode->assertStatus(403)
            ->assertJsonPath('error', 'InvalidAuthorizationCode');

        // 2. محاولة بكود ترخيص صحيح من المشرف المستقل دون الحاجة لترويسة شركة (Tenant-less Management)
        $validKey = config('services.platform.admin_activation_key');
        $resSuccess = $this->actingAs($admin)->postJson("/api/v1/platform-admin/tenants/{$tenant->id}/activate-subscription", [
            'authorization_code' => $validKey,
            'authorized_by' => 'Head of Platform Security',
            'reason' => 'اعتماد وتفعيل استثنائي بموجب سداد مؤكد',
            'plan_tier' => 'enterprise',
        ]);
        $resSuccess->assertStatus(200)
            ->assertJsonPath('status', 'activated')
            ->assertJsonPath('tenant.is_paid', true);

        // التحقق من تفعيل المستأجر وتسجيل التدقيق Transactional AuditLog
        $this->assertTrue((bool)$tenant->fresh()->is_paid);
        $this->assertDatabaseHas('audit_logs', [
            'tenant_id' => $tenant->id,
            'action' => 'admin_manual_activation',
        ]);
    }

    /**
     * اختبار أمان 27: فحص تعارض مفتاح عدم التكرار للمخزون عند اختلاف التكلفة أو المستودع أو المرجع
     */
    public function test_inventory_idempotency_detects_cost_and_reference_conflicts(): void
    {
        $idempKey = 'INV-IDEMP-CONFLICT-' . uniqid();

        // 1. تسجيل حركة مخزنية أولى بنجاح
        $res1 = $this->actingAs($this->userA)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50.0,
            'unit_cost' => 80.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-REF-100',
            'idempotency_key' => $idempKey,
        ]);
        $res1->assertStatus(201);

        // 2. إعادة إرسال نفس المفتاح بنفس المعاملات -> 200 Replay ناجح
        $resReplay = $this->actingAs($this->userA)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50.0,
            'unit_cost' => 80.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-REF-100',
            'idempotency_key' => $idempKey,
        ]);
        $resReplay->assertStatus(200)->assertJsonPath('is_duplicate', true);

        // 3. إعادة إرسال نفس المفتاح بتكلفة وحدة متضاربة (80.0 vs 95.0) -> يجب أن يعود 409 IdempotencyConflict
        $resCostConflict = $this->actingAs($this->userA)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50.0,
            'unit_cost' => 95.0, // تكلفة متضاربة!
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-REF-100',
            'idempotency_key' => $idempKey,
        ]);
        $resCostConflict->assertStatus(409)->assertJsonPath('error', 'IdempotencyConflict');

        // 4. إعادة إرسال نفس المفتاح برقم مرجع مختلف -> 409 IdempotencyConflict
        $resRefConflict = $this->actingAs($this->userA)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50.0,
            'unit_cost' => 80.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-DIFFERENT-REF-999', // مرجع متضارب!
            'idempotency_key' => $idempKey,
        ]);
        $resRefConflict->assertStatus(409)->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * اختبار أمان 28: فحص تعارض البصمة المعيارية لإذن استلام الخامات (GRN Canonical Fingerprint)
     */
    public function test_grn_canonical_fingerprint_rejects_conflicting_quantities(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-GRN-CANON-' . uniqid(),
            'name' => 'شركة مصر للنسيج',
            'is_active' => true,
        ]);

        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'po_number' => 'PO-GRN-FP-' . uniqid(),
            'order_date' => date('Y-m-d'),
            'subtotal' => 2000.0,
            'tax_amount' => 280.0,
            'total_amount' => 2280.0,
            'status' => 'approved',
        ]);

        $poItem = PurchaseOrderItem::create([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->itemA->id,
            'ordered_quantity' => 100.0,
            'unit_price' => 20.0,
            'total_price' => 2000.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 100.0,
        ]);

        $grnIdempKey = 'GRN-FP-KEY-' . uniqid();

        // 1. تسجيل إذن الاستلام أول مرة بنجاح
        $res1 = $this->actingAs($this->userA)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'inspection_status' => 'passed',
            'idempotency_key' => $grnIdempKey,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 40.0,
                    'accepted_quantity' => 40.0,
                    'rejected_quantity' => 0.0,
                ],
            ],
        ]);
        $res1->assertStatus(201);

        // 2. إعادة إرسال نفس الطلب بنفس البصمة -> 200 Replay ناجح
        $resReplay = $this->actingAs($this->userA)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'inspection_status' => 'passed',
            'idempotency_key' => $grnIdempKey,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 40.0,
                    'accepted_quantity' => 40.0,
                    'rejected_quantity' => 0.0,
                ],
            ],
        ]);
        $resReplay->assertStatus(200)->assertJsonPath('is_duplicate', true);

        // 3. إعادة إرسال نفس المفتاح مع تغيير الكميات المقبولة -> 409 IdempotencyConflict
        $resConflict = $this->actingAs($this->userA)->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => $po->id,
            'warehouse_id' => $this->warehouseA->id,
            'inspection_status' => 'passed',
            'idempotency_key' => $grnIdempKey,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 40.0,
                    'accepted_quantity' => 35.0, // كمية مختلفة!
                    'rejected_quantity' => 5.0,
                ],
            ],
        ]);
        $resConflict->assertStatus(409)->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * اختبار أمان 29: التحقق الرسمي من توقيع Stripe بمتجهات الاختبار الصارمة (Stripe Test Vectors)
     */
    public function test_stripe_webhook_verification_with_official_test_vectors(): void
    {
        config(['services.payment.provider' => 'stripe']);
        $secret = config('services.stripe.webhook_secret') ?? config('services.payment.webhook_secret');

        $tenant = Tenant::create([
            'code' => 'TEN-STRIPE-VEC',
            'name' => 'مصنع النيل سترايب',
            'subdomain' => 'stripe-test',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'STRIPE-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $now = time();
        $payload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-STRIPE-' . uniqid(),
            'tenant_id' => $tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'plan_tier' => 'professional',
        ];
        $body = json_encode($payload);

        // 1. ترويسة صحيحة تماماً بصيغة Stripe الرسمية t=...,v1=...
        $validSig = hash_hmac('sha256', "{$now}.{$body}", $secret);
        $resValid = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$validSig}",
        ], $body);
        $resValid->assertStatus(200)->assertJsonPath('status', 'success');

        // 2. طابع وقت مفقود في ترويسة سترايب -> 401 MissingSignatureTimestamp
        $resNoTs = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "v1={$validSig}",
        ], $body);
        $resNoTs->assertStatus(401)->assertJsonPath('error', 'MissingSignatureTimestamp');

        // 3. طابع وقت غير رقمي/مشوه -> 401 MalformedSignatureTimestamp
        $resBadTs = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t=not_a_number,v1={$validSig}",
        ], $body);
        $resBadTs->assertStatus(401)->assertJsonPath('error', 'MalformedSignatureTimestamp');

        // 4. طابع وقت قديم تجاوز نافذة السماح (أكثر من 300 ثانية) -> 401 TimestampToleranceExceeded
        $oldTs = $now - 350;
        $oldSig = hash_hmac('sha256', "{$oldTs}.{$body}", $secret);
        $resOld = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$oldTs},v1={$oldSig}",
        ], $body);
        $resOld->assertStatus(401)->assertJsonPath('error', 'TimestampToleranceExceeded');

        // 5. طابع وقت مستقبلي يتجاوز انحراف الساعة (أكثر من 60 ثانية في المستقبل) -> 401 FutureTimestampToleranceExceeded
        $futureTs = $now + 120;
        $futureSig = hash_hmac('sha256', "{$futureTs}.{$body}", $secret);
        $resFuture = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$futureTs},v1={$futureSig}",
        ], $body);
        $resFuture->assertStatus(401)->assertJsonPath('error', 'FutureTimestampToleranceExceeded');

        // 6. جسم الطلب تم التلاعب به بعد التوقيع -> 401 InvalidSignature
        $alteredBody = json_encode(array_merge($payload, ['amount' => 10.0]));
        $resAltered = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$validSig}",
        ], $alteredBody);
        $resAltered->assertStatus(401)->assertJsonPath('error', 'InvalidSignature');
    }

    /**
     * اختبار أمان 30: دورة حالات طلب الدفع تسمح بإعادة المحاولة بعد الفشل وتمنع مضاعفة السداد
     */
    public function test_payment_order_state_transitions_permit_retry_after_failed_attempt(): void
    {
        $tenant = Tenant::create([
            'code' => 'TEN-RETRY-01',
            'name' => 'مصنع المحاولات المتعددة',
            'subdomain' => 'retry-apparel',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'ORD-RETRY-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $secret = config('services.payment.webhook_secret');
        $now = time();

        // 1. محاولة سداد أولى فاشلة من البوابة (مثلاً رصيد بطاقة العميل غير كافٍ)
        $failedPayload = [
            'event' => 'payment.failed',
            'event_id' => 'EVT-FAIL-ATTEMPT-01',
            'tenant_id' => $tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'failed',
            'timestamp' => $now,
        ];
        $failedJson = json_encode($failedPayload);
        $failedSig = hash_hmac('sha256', "{$now}.{$failedJson}", $secret);

        $resFail = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $failedSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$now,
        ], $failedJson);

        // يجب أن يُرفض السداد مع توثيق الفشل وإبقاء الطلب متاحاً لإعادة المحاولة (can_retry: true)
        $resFail->assertStatus(422)
            ->assertJsonPath('error', 'PaymentNotSuccessful')
            ->assertJsonPath('can_retry', true);

        $this->assertEquals('payment_attempt_failed', $order->fresh()->status);
        $this->assertFalse((bool)$tenant->fresh()->is_paid);

        // 2. العميل يعيد محاولة الدفع بنجاح لنفس رقم الطلب (Legitimate Payment Retry)
        $successTs = $now + 5;
        $successPayload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-SUCCESS-ATTEMPT-02',
            'tenant_id' => $tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.0,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'plan_tier' => 'professional',
            'timestamp' => $successTs,
        ];
        $successJson = json_encode($successPayload);
        $successSig = hash_hmac('sha256', "{$successTs}.{$successJson}", $secret);

        $resSuccess = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $successSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$successTs,
        ], $successJson);

        $resSuccess->assertStatus(200)->assertJsonPath('status', 'success');
        $this->assertEquals('paid', $order->fresh()->status);
        $this->assertTrue((bool)$tenant->fresh()->is_paid);

        // 3. إشعار سداد إضافي مكرر لنفس الطلب المكتمل -> إقرار نجاح دون مضاعفة السجلات
        $resDup = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $successSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$successTs,
        ], $successJson);
        $resDup->assertStatus(200);
    }

    /**
     * اختبار أمان 31: منع المستخدمين العاديين من ترقية صلاحياتهم إلى مشرف منصة (Platform Admin Privilege Escalation Guard)
     */
    public function test_ordinary_user_cannot_elevate_role_to_platform_admin(): void
    {
        // مستخدم مسجل كمالك شركة
        $user = $this->userA;

        // محاولة تعديل الدور عبر الكود أو عبر النموذج المباشر
        $this->expectException(\Illuminate\Auth\Access\AuthorizationException::class);
        $this->expectExceptionMessage('PlatformAdminEscalationBlocked');

        // محاولة المستخدم العادي ترقية نفسه
        auth()->login($user);
        $user->role = 'platform_admin';
        $user->save();
    }

    /**
     * اختبار أمان 32: التحقق من عدم تصادم أو تسرب مفاتيح Idempotency المتطابقة بين شركات مختلفة (Cross-Tenant Keyspace Isolation)
     */
    public function test_cross_tenant_idempotency_keys_cannot_collide_or_leak_records(): void
    {
        $sharedKey = 'CROSS-TENANT-SHARED-KEY-999';

        // 1. الشركة A تسجل حركة مخزنية بالمفتاح المشترك
        $resA = $this->actingAs($this->userA)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemA->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 15.0,
            'unit_cost' => 80.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-A-1',
            'idempotency_key' => $sharedKey,
        ]);
        $resA->assertStatus(201);
        $idA = $resA->json('transaction.id');

        // 2. الشركة B تسجل حركة مخزنية بنفس المفتاح تماماً دون أي حظر أو تعارض
        $resB = $this->actingAs($this->userB)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemB->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 25.0,
            'unit_cost' => 120.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-B-1',
            'idempotency_key' => $sharedKey,
        ]);
        $resB->assertStatus(201);
        $idB = $resB->json('transaction.id');

        // التأكد من أن المعرّفين مختلفان تماماً ولا يوجد أي تسريب
        $this->assertNotEquals($idA, $idB);

        // 3. إعادة إرسال الشركة B لنفس المفتاح يعيد قيد الشركة B فقط ولا يرى قيد الشركة A نهائياً
        $resReplayB = $this->actingAs($this->userB)->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->itemB->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 25.0,
            'unit_cost' => 120.0,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-B-1',
            'idempotency_key' => $sharedKey,
        ]);
        $resReplayB->assertStatus(200)
            ->assertJsonPath('transaction.id', $idB)
            ->assertJsonPath('transaction.tenant_id', $this->tenantB->id);
    }

    /**
     * اختبار أمان 33: تطبيع إشعار Stripe Checkout Session الرسمي والتحقق من التوقيع والتفعيل الذري
     */
    public function test_genuine_stripe_checkout_session_completed_normalizes_and_activates_subscription(): void
    {
        $secret = config('services.stripe.webhook_secret') ?? config('services.payment.webhook_secret');
        $tenant = Tenant::create([
            'code' => 'TEN-STRIPE-OFFICIAL',
            'name' => 'مصنع الملابس المعتمد - سترايب',
            'subdomain' => 'stripe-official-factory',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'STRIPE-OFFICIAL-ORD-' . uniqid(),
            'plan_tier' => 'enterprise',
            'amount' => 5000.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $now = time();
        $payload = [
            'id' => 'evt_test_checkout_' . uniqid(),
            'object' => 'event',
            'type' => 'checkout.session.completed',
            'created' => $now,
            'data' => [
                'object' => [
                    'id' => 'cs_test_session_123',
                    'object' => 'checkout.session',
                    'amount_total' => 500000, // 5000.00 EGP in minor units
                    'currency' => 'egp',
                    'payment_status' => 'paid',
                    'status' => 'complete',
                    'payment_intent' => 'pi_test_intent_999',
                    'client_reference_id' => $order->order_reference,
                    'metadata' => [
                        'order_reference' => $order->order_reference,
                    ],
                ],
            ],
        ];

        $rawBody = json_encode($payload);
        $signature = hash_hmac('sha256', "{$now}.{$rawBody}", $secret);

        $res = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$signature}",
        ], $rawBody);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('is_paid', true)
            ->assertJsonPath('plan_tier', 'enterprise');

        $this->assertEquals('paid', $order->fresh()->status);
        $this->assertTrue((bool)$tenant->fresh()->is_paid);
        $this->assertEquals('enterprise', $tenant->fresh()->plan_tier);
    }

    /**
     * اختبار أمان 34: التحقق من كولباك Paymob الرسمي بحساب HMAC-SHA512 عبر 20 حقلاً معيارياً
     */
    public function test_genuine_paymob_transaction_callback_verifies_official_hmac_and_activates(): void
    {
        $secret = config('services.paymob.hmac_secret') ?? config('services.payment.webhook_secret');
        $tenant = Tenant::create([
            'code' => 'TEN-PAYMOB-OFFICIAL',
            'name' => 'مصنع النسيج - بيموب الرسمي',
            'subdomain' => 'paymob-official-factory',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'PAYMOB-OFFICIAL-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $txId = rand(1000000, 9999999);
        $payload = [
            'type' => 'TRANSACTION',
            'obj' => [
                'id' => $txId,
                'pending' => false,
                'amount_cents' => 350000, // 3500.00 EGP in cents
                'success' => true,
                'is_auth' => false,
                'is_capture' => false,
                'is_standalone_payment' => true,
                'is_voided' => false,
                'is_refunded' => false,
                'is_3d_secure' => true,
                'integration_id' => 98765,
                'order' => [
                    'id' => 443322,
                    'merchant_order_id' => $order->order_reference,
                ],
                'created_at' => '2026-10-15T12:00:00.000000',
                'currency' => 'EGP',
                'error_occured' => false,
                'has_parent_transaction' => false,
                'owner' => 500,
                'source_data' => [
                    'type' => 'card',
                    'pan' => '2346',
                    'sub_type' => 'MasterCard',
                ],
            ],
        ];

        $verifier = new \App\Services\Payment\PaymobWebhookVerifier();
        $concatenated = $verifier->buildPaymobConcatenatedString($payload['obj']);
        $this->assertNotNull($concatenated);

        $hmacSha512 = hash_hmac('sha512', $concatenated, $secret);
        $rawBody = json_encode($payload);

        $res = $this->call('POST', '/api/v1/subscriptions/webhook/paymob?hmac=' . $hmacSha512, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $rawBody);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('is_paid', true)
            ->assertJsonPath('provider', 'paymob');

        $this->assertEquals('paid', $order->fresh()->status);
        $this->assertTrue((bool)$tenant->fresh()->is_paid);
    }

    /**
     * اختبار أمان 35: الحالات السلبية لكولباك Paymob (توقيع غير صالح، حقول ناقصة، تعارض مبالغ)
     */
    public function test_paymob_callback_negative_cases_rejects_altered_data_and_invalid_hmac(): void
    {
        $secret = config('services.paymob.hmac_secret') ?? config('services.payment.webhook_secret');
        $tenant = Tenant::create([
            'code' => 'TEN-PAYMOB-NEG',
            'name' => 'مصنع الاختبارات السلبية بيموب',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'PAYMOB-NEG-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $payload = [
            'type' => 'TRANSACTION',
            'obj' => [
                'id' => 888777,
                'pending' => false,
                'amount_cents' => 350000,
                'success' => true,
                'is_auth' => false,
                'is_capture' => false,
                'is_standalone_payment' => true,
                'is_voided' => false,
                'is_refunded' => false,
                'is_3d_secure' => true,
                'integration_id' => 98765,
                'order' => [
                    'id' => 443322,
                    'merchant_order_id' => $order->order_reference,
                ],
                'created_at' => '2026-10-15T12:00:00.000000',
                'currency' => 'EGP',
                'error_occured' => false,
                'has_parent_transaction' => false,
                'owner' => 500,
                'source_data' => [
                    'type' => 'card',
                    'pan' => '2346',
                    'sub_type' => 'MasterCard',
                ],
            ],
        ];

        $rawBody = json_encode($payload);

        // 1. توقيع HMAC مزور أو غير صحيح -> 401 InvalidSignature
        $resBadHmac = $this->call('POST', '/api/v1/subscriptions/webhook/paymob?hmac=forged_invalid_hmac_sha512', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $rawBody);
        $resBadHmac->assertStatus(401)->assertJsonPath('error', 'InvalidSignature');

        // 2. توقيع صحيح ولكن المبلغ في المعاملة مخالف للمطلوب في الطلب (1000 EGP vs 3500 EGP)
        $payloadAltered = $payload;
        $payloadAltered['obj']['amount_cents'] = 100000;
        $verifier = new \App\Services\Payment\PaymobWebhookVerifier();
        $concatenatedAltered = $verifier->buildPaymobConcatenatedString($payloadAltered['obj']);
        $validAlteredSig = hash_hmac('sha512', $concatenatedAltered, $secret);

        $resAmountMismatch = $this->call('POST', '/api/v1/subscriptions/webhook/paymob?hmac=' . $validAlteredSig, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode($payloadAltered));
        $resAmountMismatch->assertStatus(422)->assertJsonPath('error', 'AmountMismatch');
    }

    /**
     * اختبار أمان 36: منع تفعيل الطلبات منتهية الصلاحية أو الملغاة ومعالجة الإشعارات المتأخرة
     */
    public function test_payment_order_state_transitions_reject_expired_and_cancelled_orders(): void
    {
        $secret = config('services.payment.webhook_secret');
        $tenant = Tenant::create([
            'code' => 'TEN-EXPIRED-TEST',
            'name' => 'مصنع الطلبات المنتهية',
            'status' => 'active',
            'is_paid' => false,
        ]);

        // 1. طلب منتهي الصلاحية الزمنية
        $expiredOrder = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'EXPIRED-ORD-' . uniqid(),
            'plan_tier' => 'starter',
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->subDay(), // منتهي بالأمس
        ]);

        $now = time();
        $payload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-EXPIRED-01',
            'order_reference' => $expiredOrder->order_reference,
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'succeeded',
        ];
        $body = json_encode($payload);
        $sig = hash_hmac('sha256', "{$now}.{$body}", $secret);

        $resExpired = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $sig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$now,
        ], $body);

        $resExpired->assertStatus(422)->assertJsonPath('error', 'OrderExpired');
        $this->assertEquals('expired', $expiredOrder->fresh()->status);
        $this->assertFalse((bool)$tenant->fresh()->is_paid);

        // 2. طلب ملغى مسبقاً
        $cancelledOrder = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'CANCELLED-ORD-' . uniqid(),
            'plan_tier' => 'starter',
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'cancelled',
            'expires_at' => now()->addDays(2),
        ]);

        $payloadCancelled = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-CANCELLED-01',
            'order_reference' => $cancelledOrder->order_reference,
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'succeeded',
        ];
        $bodyCancelled = json_encode($payloadCancelled);
        $sigCancelled = hash_hmac('sha256', "{$now}.{$bodyCancelled}", $secret);

        $resCancelled = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $sigCancelled,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$now,
        ], $bodyCancelled);

        $resCancelled->assertStatus(422)->assertJsonPath('error', 'OrderCancelled');
        $this->assertEquals('cancelled', $cancelledOrder->fresh()->status);
    }

    /**
     * اختبار أمان 37: إشعار يحاول تزوير هوية الشركة أو الباقة لا يتجاوز البيانات المعتمدة في الطلب
     */
    public function test_webhook_cannot_override_stored_tenant_or_plan(): void
    {
        $secret = config('services.payment.webhook_secret');
        $tenantVictim = Tenant::create([
            'code' => 'TEN-VICTIM',
            'name' => 'شركة الضحية',
            'plan_tier' => 'starter',
            'is_paid' => false,
        ]);

        $tenantAttacker = Tenant::create([
            'code' => 'TEN-ATTACKER',
            'name' => 'شركة المهاجم',
            'plan_tier' => 'starter',
            'is_paid' => false,
        ]);

        // طلب مسجل لشركة الضحية بباقة starter
        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenantVictim->id,
            'order_reference' => 'ORD-TAMPER-' . uniqid(),
            'plan_tier' => 'starter',
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $now = time();
        // محاولة إرسال إشعار يدعي تفعيل باقة enterprise أو يخص شركة المهاجم
        $payload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-TAMPER-' . uniqid(),
            'tenant_id' => $tenantAttacker->id, // شركة مختلفة!
            'order_reference' => $order->order_reference,
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'plan_tier' => 'enterprise', // محاولة ترقية الباقة دون دفع قيمتها!
        ];

        $body = json_encode($payload);
        $sig = hash_hmac('sha256', "{$now}.{$body}", $secret);

        $res = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $sig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$now,
        ], $body);

        $res->assertStatus(422)->assertJsonPath('error', 'TenantMismatch');

        // شركة الضحية لم تُفعل بإشعار متعارض
        $this->assertFalse((bool)$tenantVictim->fresh()->is_paid);
        $this->assertEquals('starter', $tenantVictim->fresh()->plan_tier);

        // شركة المهاجم لم تتأثر إطلاقاً
        $this->assertFalse((bool)$tenantAttacker->fresh()->is_paid);

        // واختبار تعارض الباقة (PlanMismatch) عندما تكون الشركة مطابقة لكن الباقة مزورة
        $planTamperPayload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-PLAN-TAMPER-' . uniqid(),
            'tenant_id' => $tenantVictim->id,
            'order_reference' => $order->order_reference,
            'amount' => 2500.00,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'plan_tier' => 'enterprise', // مخالف لباقة starter المعتمدة في الطلب
        ];
        $planBody = json_encode($planTamperPayload);
        $planSig = hash_hmac('sha256', "{$now}.{$planBody}", $secret);
        $resPlan = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $planSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$now,
        ], $planBody);

        $resPlan->assertStatus(422)->assertJsonPath('error', 'PlanMismatch');
        $this->assertFalse((bool)$tenantVictim->fresh()->is_paid);
    }

    /**
     * اختبار أمان 38: المسارات السلبية لترقية صلاحيات مشرف المنصة (Platform Admin Authorization Negative Tests)
     */
    public function test_platform_admin_authorization_negative_paths(): void
    {
        // 1. محاولة تسجيل شركة جديدة وتمرير دور platform_admin في الطلب
        $resReg = $this->postJson('/api/v1/auth/register-company', [
            'company_name' => 'شركة محاولة الاختراق',
            'owner_name' => 'مستخدم مخترق',
            'email' => 'hacker@escalation.com',
            'password' => 'Password123!',
            'role' => 'platform_admin', // محاولة فرض الصلاحية العليا
        ]);
        $resReg->assertStatus(201);

        $createdUser = User::where('email', 'hacker@escalation.com')->first();
        $this->assertNotNull($createdUser);
        $this->assertEquals('company_owner', $createdUser->role, 'يجب حظر تعيين دور platform_admin من واجهة التسجيل تماماً.');

        // 2. مستخدم عادي مصادق عليه يحاول استدعاء مسار مشرف المنصة -> 403 Forbidden
        $resForbidden = $this->actingAs($createdUser)->postJson('/api/v1/platform-admin/tenants/' . $this->tenantA->id . '/activate-subscription', [
            'authorization_code' => 'any_code',
        ]);
        $resForbidden->assertStatus(403)->assertJsonPath('error', 'PlatformAdminOnly');

        // 3. طلب غير مصادق عليه يستدعي مسار مشرف المنصة -> 403 Forbidden
        $resUnauth = $this->postJson('/api/v1/platform-admin/tenants/' . $this->tenantA->id . '/activate-subscription', [
            'authorization_code' => 'any_code',
        ]);
        $resUnauth->assertStatus(403)->assertJsonPath('error', 'PlatformAdminOnly');
    }

    /**
     * اختبار أمان 39: الرد على الإشعارات المكررة يعكس بدقة الحالة الحقيقية المسجلة (فاشل أو منتهي)
     */
    public function test_duplicate_webhook_responses_faithfully_report_actual_failed_and_expired_status(): void
    {
        $secret = config('services.payment.webhook_secret');
        $tenant = Tenant::create([
            'code' => 'TEN-STATUS-FIDELITY',
            'name' => 'مصنع التحقق من دقة إعادة الإشعارات',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'FIDELITY-FAIL-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $ts = time();
        $failedPayload = [
            'event' => 'payment.failed',
            'event_id' => 'EVT-FAIL-FIDELITY-' . uniqid(),
            'tenant_id' => $tenant->id,
            'order_reference' => $order->order_reference,
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'failed',
            'timestamp' => $ts,
        ];
        $body = json_encode($failedPayload);
        $sig = hash_hmac('sha256', "{$ts}.{$body}", $secret);

        // 1. الإرسال الأول لإشعار فاشل -> 422 PaymentNotSuccessful
        $res1 = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $sig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $body);

        $res1->assertStatus(422)
            ->assertJsonPath('error', 'PaymentNotSuccessful')
            ->assertJsonPath('can_retry', true);
        $this->assertFalse((bool)$tenant->fresh()->is_paid);

        // 2. إعادة إرسال نفس الإشعار الفاشل المكرر -> يجب ألا يدعي النجاح إطلاقاً بل يعكس الفشل (422 و is_paid: false)
        $resDuplicateFail = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $sig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $body);

        $resDuplicateFail->assertStatus(422)
            ->assertJsonPath('error', 'PaymentNotSuccessful')
            ->assertJsonPath('is_paid', false)
            ->assertJsonPath('can_retry', true);
        $this->assertFalse((bool)$tenant->fresh()->is_paid);

        // 3. اختبار إعادة إرسال إشعار لطلب منتهي الصلاحية -> يعكس حالة الانتهاء (422 و is_paid: false)
        $expiredOrder = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'FIDELITY-EXP-ORD-' . uniqid(),
            'plan_tier' => 'starter',
            'amount' => 1500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->subDay(),
        ]);

        $expiredPayload = [
            'event' => 'payment.completed',
            'event_id' => 'EVT-EXP-FIDELITY-' . uniqid(),
            'tenant_id' => $tenant->id,
            'order_reference' => $expiredOrder->order_reference,
            'amount' => 1500.00,
            'currency' => 'EGP',
            'status' => 'succeeded',
            'timestamp' => $ts,
        ];
        $expBody = json_encode($expiredPayload);
        $expSig = hash_hmac('sha256', "{$ts}.{$expBody}", $secret);

        $resExp1 = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $expSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $expBody);
        $resExp1->assertStatus(422)->assertJsonPath('error', 'OrderExpired');

        // إعادة إرسال نفس الإشعار المنتهي -> 422 OrderExpired و is_paid: false
        $resExpDuplicate = $this->call('POST', '/api/v1/subscriptions/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_SIGNATURE' => $expSig,
            'HTTP_X_SIGNATURE_TIMESTAMP' => (string)$ts,
        ], $expBody);

        $resExpDuplicate->assertStatus(422)
            ->assertJsonPath('error', 'OrderExpired')
            ->assertJsonPath('is_paid', false)
            ->assertJsonPath('can_retry', false);
    }

    /**
     * اختبار أمان 40: التحقق الصارم من الأسرار المستقلة لكل مزود ورفض التوقيعات المتبادلة (Cross-Provider Rejection)
     */
    public function test_separate_provider_secrets_and_cross_provider_rejection(): void
    {
        $stripeSecret = 'whsec_dedicated_stripe_secret_32_characters_1111';
        $paymobSecret = 'paymob_dedicated_secret_32_characters_2222';

        config([
            'services.stripe.webhook_secret' => $stripeSecret,
            'services.paymob.hmac_secret' => $paymobSecret,
        ]);

        $tenant = Tenant::create([
            'code' => 'TEN-CROSS-PROVIDER',
            'name' => 'مصنع فحص أسرار المزودات',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'CROSS-ORD-' . uniqid(),
            'plan_tier' => 'enterprise',
            'amount' => 5000.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $now = time();
        $payload = [
            'id' => 'evt_cross_' . uniqid(),
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_cross_' . uniqid(),
                    'amount_total' => 500000,
                    'currency' => 'egp',
                    'payment_status' => 'paid',
                    'client_reference_id' => $order->order_reference,
                ],
            ],
        ];
        $rawBody = json_encode($payload);

        // 1. توقيع بـ Paymob Secret مرسل إلى Stripe Route -> 401 InvalidSignature
        $forgedSigWithWrongProviderSecret = hash_hmac('sha256', "{$now}.{$rawBody}", $paymobSecret);
        $resWrongSecret = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$forgedSigWithWrongProviderSecret}",
        ], $rawBody);

        $resWrongSecret->assertStatus(401)->assertJsonPath('error', 'InvalidSignature');

        // 2. توقيع بـ Stripe Secret الصحيح مرسل إلى Stripe Route -> 200 Success
        $validSig = hash_hmac('sha256', "{$now}.{$rawBody}", $stripeSecret);
        $resValid = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$validSig}",
        ], $rawBody);

        $resValid->assertStatus(200)->assertJsonPath('status', 'success');

        // 3. سر المزود غير مهيأ (Fail-Closed) -> 500 ServerMisconfiguration
        config([
            'services.stripe.webhook_secret' => null,
            'services.payment.stripe_webhook_secret' => null,
        ]);
        $resMissingSecret = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$validSig}",
        ], $rawBody);

        $resMissingSecret->assertStatus(500)->assertJsonPath('error', 'ServerMisconfiguration');

        // 4. سر المزود ضعيف جداً -> 500 WeakSecretConfiguration
        config(['services.stripe.webhook_secret' => 'short_weak_key']);
        $resWeak = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$validSig}",
        ], $rawBody);

        $resWeak->assertStatus(500)->assertJsonPath('error', 'WeakSecretConfiguration');
    }

    /**
     * اختبار أمان 41: رفض العملات غير المدعومة أو ذات الدقة العشرية غير المتوافقة ورفض غياب معرف الحدث في Stripe
     */
    public function test_stripe_rejects_unsupported_currency_precision_and_missing_event_id(): void
    {
        $stripeSecret = 'whsec_precision_test_secret_32_characters_1111';
        config(['services.stripe.webhook_secret' => $stripeSecret]);

        $tenant = Tenant::create([
            'code' => 'TEN-STRIPE-PRECISION',
            'name' => 'مصنع فحص دقة عملات سترايب',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'PRECISION-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        $now = time();

        // 1. عملة ذات دقة صفرية أو غير مدعومة مثل JPY -> رفض 422 MalformedWebhookPayload
        $payloadUnsupportedCurrency = [
            'id' => 'evt_jpy_' . uniqid(),
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_jpy_' . uniqid(),
                    'amount_total' => 350000,
                    'currency' => 'jpy', // عملة بدون كسور عشرية غير مدعومة في نظام السداد
                    'payment_status' => 'paid',
                    'client_reference_id' => $order->order_reference,
                ],
            ],
        ];
        $bodyJpy = json_encode($payloadUnsupportedCurrency);
        $sigJpy = hash_hmac('sha256', "{$now}.{$bodyJpy}", $stripeSecret);

        $resJpy = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$sigJpy}",
        ], $bodyJpy);

        $resJpy->assertStatus(422)->assertJsonPath('error', 'MalformedWebhookPayload');

        // 2. إشعار Stripe يفتقد معرف الحدث الأصلي id -> رفض 422 MalformedWebhookPayload
        $payloadMissingId = [
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_valid_' . uniqid(),
                    'amount_total' => 350000,
                    'currency' => 'egp',
                    'payment_status' => 'paid',
                    'client_reference_id' => $order->order_reference,
                ],
            ],
        ];
        $bodyMissingId = json_encode($payloadMissingId);
        $sigMissingId = hash_hmac('sha256', "{$now}.{$bodyMissingId}", $stripeSecret);

        $resMissingId = $this->call('POST', '/api/v1/subscriptions/webhook/stripe', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_STRIPE_SIGNATURE' => "t={$now},v1={$sigMissingId}",
        ], $bodyMissingId);

        $resMissingId->assertStatus(422)->assertJsonPath('error', 'MalformedWebhookPayload');
    }

    /**
     * اختبار أمان 42: معالجة الحقول الاختيارية أو الفارغة في كولباك Paymob الرسمي وفق البروتوكول بدقة
     */
    public function test_paymob_handles_empty_or_null_canonical_fields_and_missing_transaction_id(): void
    {
        $paymobSecret = 'paymob_canonical_test_secret_32_characters_2222';
        config(['services.paymob.hmac_secret' => $paymobSecret]);

        $tenant = Tenant::create([
            'code' => 'TEN-PAYMOB-CANONICAL',
            'name' => 'مصنع اختبار الحقول الفارغة بيموب',
            'status' => 'active',
            'is_paid' => false,
        ]);

        $order = SubscriptionPaymentOrder::create([
            'tenant_id' => $tenant->id,
            'order_reference' => 'CANONICAL-ORD-' . uniqid(),
            'plan_tier' => 'professional',
            'amount' => 3500.00,
            'currency' => 'EGP',
            'status' => 'pending',
            'expires_at' => now()->addDays(2),
        ]);

        // كائن معاملة يحتوي على حقول null كـ source_data.sub_type وحقول boolean false
        $txId = rand(2000000, 8888888);
        $payloadWithNulls = [
            'type' => 'TRANSACTION',
            'obj' => [
                'id' => $txId,
                'pending' => false,
                'amount_cents' => 350000,
                'success' => true,
                'is_auth' => false,
                'is_capture' => false,
                'is_standalone_payment' => true,
                'is_voided' => false,
                'is_refunded' => false,
                'is_3d_secure' => true,
                'integration_id' => 12345,
                'order' => [
                    'id' => 998877,
                    'merchant_order_id' => $order->order_reference,
                ],
                'created_at' => '2026-10-15T14:30:00.000000',
                'currency' => 'EGP',
                'error_occured' => false,
                'has_parent_transaction' => false,
                'owner' => 900,
                'source_data' => [
                    'type' => 'card',
                    'pan' => '1234',
                    'sub_type' => null, // قيمة null يجب دمجها كنص فارغ وفق البروتوكول
                ],
            ],
        ];

        $verifier = new \App\Services\Payment\PaymobWebhookVerifier();
        $concatenated = $verifier->buildPaymobConcatenatedString($payloadWithNulls['obj']);
        $this->assertNotNull($concatenated);

        $hmacSha512 = hash_hmac('sha512', $concatenated, $paymobSecret);
        $rawBody = json_encode($payloadWithNulls);

        $res = $this->call('POST', '/api/v1/subscriptions/webhook/paymob?hmac=' . $hmacSha512, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $rawBody);

        $res->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('is_paid', true);

        // 2. رفض كائن Paymob يفتقد معرف المعاملة id
        $payloadMissingTx = $payloadWithNulls;
        unset($payloadMissingTx['obj']['id']);
        $concatenatedMissing = $verifier->buildPaymobConcatenatedString($payloadMissingTx['obj']);
        $this->assertNull($concatenatedMissing, 'يجب رفض بناء السلسلة إذا كان معرف المعاملة مفقوداً.');

        $resMissingTx = $this->call('POST', '/api/v1/subscriptions/webhook/paymob?hmac=' . $hmacSha512, [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode($payloadMissingTx));

        $resMissingTx->assertStatus(401);
    }
}


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

        // 3. تفعيل الاشتراك المدفوع عبر نقطة التفعيل
        $resPay = $this->actingAs($userTrial)->postJson('/api/v1/tenant/subscription/activate', [
            'plan_tier' => 'professional',
            'payment_reference' => 'PAY-REF-998877',
        ]);
        $resPay->assertStatus(200)
            ->assertJsonPath('tenant.is_paid', true);

        // 4. بعد سداد الاشتراك: إعادة فتح مسارات الـ ERP بنجاح كامل
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
}

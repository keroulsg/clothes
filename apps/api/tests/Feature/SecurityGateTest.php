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

        $res2->assertStatus(201);

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
}

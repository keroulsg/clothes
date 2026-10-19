<?php

namespace Tests\Feature;

use App\Models\BillOfMaterial;
use App\Models\Customer;
use App\Models\CuttingOrder;
use App\Models\GarmentModel;
use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\ProductionOrder;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAndRoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $ownerUser;
    private User $accountantUser;
    private User $productionManagerUser;
    private User $workerUser;
    private User $platformAdminUser;
    private Warehouse $warehouse;
    private InventoryItem $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'code' => 'TEN-AUTH-01',
            'name' => 'مصنع النيل للملابس',
            'subdomain' => 'nile-auth',
            'status' => 'active',
        ]);

        $this->ownerUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مالك المصنع',
            'email' => 'owner@nile.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->accountantUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'المحاسب المالي',
            'email' => 'accountant@nile.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'accountant',
            'is_active' => true,
        ]);

        $this->productionManagerUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مدير الإنتاج',
            'email' => 'prodmgr@nile.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'production_manager',
            'is_active' => true,
        ]);

        $this->workerUser = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'عامل التشغيل',
            'email' => 'worker@nile.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'worker',
            'is_active' => true,
        ]);

        $this->platformAdminUser = User::create([
            'name' => 'مشرف المنصة العام',
            'email' => 'admin@garmentos.com',
            'password' => bcrypt('StrongPass123!'),
            'role' => 'platform_admin',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'المخزن الرئيسي',
            'code' => 'WH-AUTH-01',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->item = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-COT-01',
            'name' => 'قطن مصري 100%',
            'unit_of_measure' => 'm',
            'current_balance' => 500.0,
            'average_cost' => 100.0,
        ]);
    }

    /**
     * 1. اختبار تسجيل الدخول الصحيح واستلام التوكن ومعلومات الشركة
     */
    public function test_user_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@nile.com',
            'password' => 'StrongPass123!',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role', 'tenant_id'],
                'tenant' => ['id', 'code', 'name', 'status'],
            ]);

        $this->assertNotEmpty($response->json('access_token'));
        $this->assertEquals('Bearer', $response->json('token_type'));
    }

    /**
     * 2. اختبار رفض تسجيل الدخول ببيانات خاطئة
     */
    public function test_login_fails_with_invalid_credentials(): void
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@nile.com',
            'password' => 'WrongPassword!',
        ]);

        $response->assertStatus(401)
            ->assertJsonPath('error', 'InvalidCredentials');
    }

    /**
     * 3. اختبار تسجيل الخروج وإبطال التوكن الفعلي
     */
    public function test_user_can_logout_and_revoked_token_is_rejected(): void
    {
        $loginRes = $this->postJson('/api/v1/auth/login', [
            'email' => 'owner@nile.com',
            'password' => 'StrongPass123!',
        ]);
        $token = $loginRes->json('access_token');

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/tenant/profile')
            ->assertStatus(200);

        $logoutRes = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/v1/auth/logout');

        $logoutRes->assertStatus(200)
            ->assertJsonPath('message', 'تم تسجيل الخروج بنجاح وإلغاء رمز الدخول.');

        $this->assertDatabaseCount('personal_access_tokens', 0);

        $this->app['auth']->forgetGuards();

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/tenant/profile')
            ->assertStatus(401);
    }

    /**
     * 4. اختبار حظر الوصول دون توكن (Unauthenticated)
     */
    public function test_unauthenticated_request_to_protected_routes_is_rejected(): void
    {
        $this->getJson('/api/v1/tenant/profile')->assertStatus(401);
        $this->getJson('/api/v1/inventory/items')->assertStatus(401);
        $this->postJson('/api/v1/auth/logout')->assertStatus(401);
    }

    /**
     * 5. اختبار الصلاحيات: العامل ومشرف المنصة لا يستطيعان اعتماد أمر الشراء والمحاسب والمالك يستطيعان
     */
    public function test_purchase_order_approval_authorization(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'شركة الغزل والنسيج',
            'code' => 'SUP-01',
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-AUTH-001',
            'order_date' => now()->toDateString(),
            'status' => 'draft',
            'subtotal' => 1000,
            'tax_amount' => 140,
            'total_amount' => 1140,
        ]);

        // 1. محاولة الاعتماد بواسطة عامل (worker) -> يجب أن يُرفض بـ 403 دون تغيير الحالة
        Sanctum::actingAs($this->workerUser);
        $resDenied = $this->postJson("/api/v1/purchase-orders/{$po->id}/approve");
        $resDenied->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $po->refresh();
        $this->assertEquals('draft', $po->status, 'أمر الشراء يجب ألا يتغير عن المسودة عند الرفض.');

        // 2. محاولة الاعتماد بواسطة مشرف المنصة (platform_admin) -> يجب أن يُرفض بـ 403
        Sanctum::actingAs($this->platformAdminUser);
        $resPlatformAdmin = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/purchase-orders/{$po->id}/approve");
        $resPlatformAdmin->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $po->refresh();
        $this->assertEquals('draft', $po->status);

        // 3. محاولة الاعتماد بواسطة محاسب (accountant) -> يجب أن ينجح
        Sanctum::actingAs($this->accountantUser);
        $resAllowed = $this->postJson("/api/v1/purchase-orders/{$po->id}/approve");
        $resAllowed->assertStatus(200);

        $po->refresh();
        $this->assertEquals('approved', $po->status);
    }

    /**
     * 6. اختبار الصلاحيات: العامل ومشرف المنصة لا يستطيعان اعتماد أمر الإنتاج ومدير الإنتاج يستطيع
     */
    public function test_production_order_approval_authorization(): void
    {
        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'تيشيرت أطفال',
            'code' => 'TSH-01',
            'category' => 'boys',
            'status' => 'active',
        ]);

        $prodOrder = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $model->id,
            'order_number' => 'PRD-AUTH-001',
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'draft',
            'total_planned_quantity' => 100,
        ]);

        // العامل يُرفض بـ 403
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/v1/production-orders/{$prodOrder->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $prodOrder->refresh();
        $this->assertEquals('draft', $prodOrder->status);

        // مشرف المنصة يُرفض بـ 403
        Sanctum::actingAs($this->platformAdminUser);
        $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/production-orders/{$prodOrder->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $prodOrder->refresh();
        $this->assertEquals('draft', $prodOrder->status);

        // مدير الإنتاج يُعتمد بنجاح
        Sanctum::actingAs($this->productionManagerUser);
        $this->postJson("/api/v1/production-orders/{$prodOrder->id}/approve")
            ->assertStatus(200);

        $prodOrder->refresh();
        $this->assertEquals('approved', $prodOrder->status);
    }

    /**
     * 7. اختبار الصلاحيات: اعتماد شجرة المكونات والـ BOM مقتصر على مدير الإنتاج والمالك
     */
    public function test_bom_approval_authorization(): void
    {
        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'بنطلون جبردين',
            'code' => 'PNT-01',
            'category' => 'boys',
            'status' => 'active',
        ]);

        $bom = BillOfMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $model->id,
            'bom_code' => 'BOM-001',
            'name' => 'مواصفة بنطلون أولادي',
            'version' => 1,
            'status' => 'draft',
            'is_active' => false,
        ]);

        // 1. محاولة الاعتماد بواسطة عامل -> 403
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/v1/boms/{$bom->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $bom->refresh();
        $this->assertEquals('draft', $bom->status);

        // 2. محاولة الاعتماد بواسطة محاسب -> 403
        Sanctum::actingAs($this->accountantUser);
        $this->postJson("/api/v1/boms/{$bom->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $bom->refresh();
        $this->assertEquals('draft', $bom->status);

        // 3. محاولة الاعتماد بواسطة مشرف المنصة -> 403
        Sanctum::actingAs($this->platformAdminUser);
        $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/boms/{$bom->id}/approve")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $bom->refresh();
        $this->assertEquals('draft', $bom->status);

        // 4. الاعتماد بواسطة مدير الإنتاج -> 200
        Sanctum::actingAs($this->productionManagerUser);
        $this->postJson("/api/v1/boms/{$bom->id}/approve")
            ->assertStatus(200);

        $bom->refresh();
        $this->assertEquals('approved', $bom->status);
    }

    /**
     * 8. اختبار الصلاحيات: تأكيد أمر التشغيل للغير مقتصر على مدير الإنتاج والمحاسب والمالك
     */
    public function test_subcontracting_job_confirmation_authorization(): void
    {
        $customer = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'code' => 'CUST-01',
            'name' => 'شركة أزياء الصغار',
            'phone' => '+201011112222',
        ]);

        $job = JobOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'order_number' => 'JOB-AUTH-001',
            'service_type' => 'cmt',
            'fabric_source' => 'customer_supplied',
            'pricing_basis' => 'per_piece',
            'status' => 'draft',
            'total_target_quantity' => 100,
            'unit_rate' => 25.0,
        ]);

        // العامل يُرفض بـ 403
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/v1/subcontracting/jobs/{$job->id}/confirm")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $job->refresh();
        $this->assertEquals('draft', $job->status);

        // مشرف المنصة يُرفض بـ 403
        Sanctum::actingAs($this->platformAdminUser);
        $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/subcontracting/jobs/{$job->id}/confirm")
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $job->refresh();
        $this->assertEquals('draft', $job->status);

        // مدير الإنتاج يؤكد بنجاح -> 200
        Sanctum::actingAs($this->productionManagerUser);
        $this->postJson("/api/v1/subcontracting/jobs/{$job->id}/confirm")
            ->assertStatus(200);

        $job->refresh();
        $this->assertEquals('confirmed', $job->status);
    }

    /**
     * 9. اختبار الصلاحيات: سداد فاتورة خدمات التشغيل مقتصر على المحاسب والمالك
     */
    public function test_subcontracting_invoice_payment_authorization(): void
    {
        $customer = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'code' => 'CUST-02',
            'name' => 'شركة ملابس النخبة',
            'phone' => '+201022223333',
        ]);

        $job = JobOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'order_number' => 'JOB-AUTH-002',
            'service_type' => 'cmt',
            'fabric_source' => 'customer_supplied',
            'pricing_basis' => 'per_piece',
            'status' => 'confirmed',
            'total_target_quantity' => 100,
            'unit_rate' => 30.0,
        ]);

        $invoice = JobInvoice::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'customer_id' => $customer->id,
            'customer_name' => $customer->name,
            'job_order_id' => $job->id,
            'invoice_number' => 'INV-AUTH-001',
            'invoice_date' => now()->toDateString(),
            'service_amount' => 3000.0,
            'total_amount' => 3000.0,
            'paid_amount' => 0.0,
            'status' => 'draft',
        ]);

        // 1. العامل يُرفض بـ 403
        Sanctum::actingAs($this->workerUser);
        $this->postJson("/api/v1/subcontracting/invoices/{$invoice->id}/pay", ['amount' => 500])
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $invoice->refresh();
        $this->assertEquals(0.0, (float) $invoice->paid_amount);

        // 2. مدير الإنتاج يُرفض بـ 403
        Sanctum::actingAs($this->productionManagerUser);
        $this->postJson("/api/v1/subcontracting/invoices/{$invoice->id}/pay", ['amount' => 500])
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $invoice->refresh();
        $this->assertEquals(0.0, (float) $invoice->paid_amount);

        // 3. مشرف المنصة يُرفض بـ 403
        Sanctum::actingAs($this->platformAdminUser);
        $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson("/api/v1/subcontracting/invoices/{$invoice->id}/pay", ['amount' => 500])
            ->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $invoice->refresh();
        $this->assertEquals(0.0, (float) $invoice->paid_amount);

        // 4. المحاسب يسدد بنجاح -> 200
        Sanctum::actingAs($this->accountantUser);
        $this->postJson("/api/v1/subcontracting/invoices/{$invoice->id}/pay", ['amount' => 3000])
            ->assertStatus(200);

        $invoice->refresh();
        $this->assertEquals(3000.0, (float) $invoice->paid_amount);
        $this->assertEquals('paid', $invoice->status);
    }

    /**
     * 10. اختبار الصلاحيات: حظر عمال التشغيل من ترحيل أي حركات مخزنية مباشرة (إضافة، صرف، تسوية)
     */
    public function test_worker_cannot_record_any_inventory_transaction_types(): void
    {
        Sanctum::actingAs($this->workerUser);

        // 1. محاولة تسوية سلبية -> 403
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'adjustment_negative',
            'direction' => 'OUT',
            'quantity' => 20,
        ])->assertStatus(403)->assertJsonPath('error', 'UnauthorizedRole');

        // 2. محاولة تسوية إيجابية -> 403
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 20,
        ])->assertStatus(403)->assertJsonPath('error', 'UnauthorizedRole');

        // 3. محاولة توريد مباشر -> 403
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50,
        ])->assertStatus(403)->assertJsonPath('error', 'UnauthorizedRole');

        // 4. محاولة صرف مباشر -> 403
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 50,
        ])->assertStatus(403)->assertJsonPath('error', 'UnauthorizedRole');

        // التحقق من بقاء الرصيد ثابتاً تماماً دون أي تغيير
        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());
    }

    /**
     * 11. اختبار الصلاحيات: حظر مشرف المنصة العام من تعديل مخزون الشركات المستأجرة
     */
    public function test_platform_admin_cannot_mutate_tenant_inventory_or_operations(): void
    {
        Sanctum::actingAs($this->platformAdminUser);

        $response = $this->withHeader('X-Tenant-ID', $this->tenant->id)
            ->postJson('/api/v1/inventory/transactions', [
                'inventory_item_id' => $this->item->id,
                'transaction_type' => 'goods_receipt',
                'direction' => 'IN',
                'quantity' => 100,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());

        // التحقق من استمرار عمل مسارات إدارة المنصة العليا الشرعية لمشرف المنصة
        $platformSecret = config('services.platform.admin_activation_key') ?? 'test_platform_admin_super_secret_activation_key_32_chars';
        $resPlatformRoute = $this->postJson("/api/v1/platform-admin/tenants/{$this->tenant->id}/activate-subscription", [
            'authorization_code' => $platformSecret,
            'authorized_by' => 'CEO Office / Platform Director',
            'reason' => 'سداد اشتراك معتمد بواسطة المشرف العام',
            'plan_tier' => 'professional',
        ]);
        $resPlatformRoute->assertStatus(200);
    }

    /**
     * 12. اختبار التحقق الصارم من أنواع المستندات المرجعية ورفض المراجع العشوائية
     */
    public function test_arbitrary_client_reference_types_are_rejected(): void
    {
        Sanctum::actingAs($this->ownerUser);

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 25,
            'reference_type' => 'arbitrary_unauthorized_override_type',
            'reference_number' => 'HACK-999',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'InvalidTransactionReference');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 13. اختبار أمان عزل الشركات: لا يمكن للمستخدم التعديل على صنف يتبع لشركة أخرى
     */
    public function test_cross_tenant_inventory_manipulation_rejected(): void
    {
        $tenantB = Tenant::create([
            'code' => 'TEN-AUTH-02',
            'name' => 'شركة الدلتا للنسيج',
            'subdomain' => 'delta-auth',
            'status' => 'active',
        ]);

        $whB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'مخزن الدلتا',
            'code' => 'WH-DELTA-01',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $itemB = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'warehouse_id' => $whB->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-DELTA-01',
            'name' => 'كتان مصري',
            'unit_of_measure' => 'm',
            'current_balance' => 300.0,
            'average_cost' => 150.0,
        ]);

        // مستخدم شركة أ يحاول تسجيل حركة على صنف شركة ب
        Sanctum::actingAs($this->ownerUser);
        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $itemB->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 50,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        $this->assertEquals(300.0, (float) $itemB->fresh()->current_balance);
    }

    /**
     * 14. اختبار رفض تسجيل حركة بمستند مرجعي غير موجود في النظام (Nonexistent Reference Rejected)
     */
    public function test_inventory_transaction_rejects_nonexistent_purchase_order_reference(): void
    {
        Sanctum::actingAs($this->ownerUser);

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 20,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-NONEXISTENT-999',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'InvalidReferenceDocument');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());
    }

    /**
     * 15. اختبار رفض استناد الحركة إلى مستند يتبع لشركة أخرى (Cross-Tenant Reference Rejected)
     */
    public function test_inventory_transaction_rejects_cross_tenant_purchase_order_reference(): void
    {
        $tenantB = Tenant::create([
            'code' => 'TEN-REF-B',
            'name' => 'شركة المرجعية ب',
            'subdomain' => 'ref-b',
            'status' => 'active',
        ]);

        $whB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'مخزن ب',
            'code' => 'WH-B-REF',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $supplierB = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'name' => 'مورد ب',
            'code' => 'SUP-REF-B',
        ]);

        $poB = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $tenantB->id,
            'supplier_id' => $supplierB->id,
            'warehouse_id' => $whB->id,
            'po_number' => 'PO-TENANT-B-001',
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 1000.0,
            'total_amount' => 1000.0,
        ]);

        Sanctum::actingAs($this->ownerUser);

        // مستخدم شركة أ يحاول الاستناد لأمر شراء شركة ب
        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 15,
            'reference_type' => 'purchase_order',
            'reference_number' => $poB->po_number,
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());
    }

    /**
     * 16. اختبار رفض تسجيل حركة على أمر شراء غير معتمد أو ملغى (Invalid Document Status)
     */
    public function test_inventory_transaction_rejects_invalid_purchase_order_status(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مورد المسودات',
            'code' => 'SUP-DRAFT-01',
        ]);

        $draftPo = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-DRAFT-001',
            'order_date' => now()->toDateString(),
            'status' => 'draft',
            'subtotal' => 2000.0,
            'total_amount' => 2000.0,
        ]);

        PurchaseOrderItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $draftPo->id,
            'inventory_item_id' => $this->item->id,
            'ordered_quantity' => 100.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 100.0,
            'unit_price' => 20.0,
            'total_price' => 2000.0,
        ]);

        Sanctum::actingAs($this->ownerUser);

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 20,
            'reference_type' => 'purchase_order',
            'reference_number' => $draftPo->po_number,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'InvalidDocumentStatus');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 17. اختبار رفض استلام صنف غير مدرج في أمر الشراء المرجعي
     */
    public function test_inventory_transaction_rejects_unlisted_item_for_purchase_order(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مورد البنود',
            'code' => 'SUP-ITEMS-01',
        ]);

        $otherItem = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-OTHER-01',
            'name' => 'قماش مختلف',
            'unit_of_measure' => 'm',
            'current_balance' => 100.0,
            'average_cost' => 50.0,
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-OTHER-ITEM-001',
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 2000.0,
            'total_amount' => 2000.0,
        ]);

        PurchaseOrderItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $otherItem->id, // الصنف الآخر وليس $this->item
            'ordered_quantity' => 50.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 50.0,
            'unit_price' => 40.0,
            'total_price' => 2000.0,
        ]);

        Sanctum::actingAs($this->ownerUser);

        // محاولة استلام $this->item على أمر الشراء الذي لا يحتويه
        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 10,
            'reference_type' => 'purchase_order',
            'reference_number' => $po->po_number,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'InvalidReferenceItem');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 18. اختبار رفض التوريد الزائد عن الكمية المتبقية في أمر الشراء (Over-Receipt Rejected)
     */
    public function test_inventory_transaction_rejects_over_receipt_beyond_remaining_quantity(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مورد الحدود',
            'code' => 'SUP-LIMIT-01',
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-LIMIT-001',
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 1500.0,
            'total_amount' => 1500.0,
        ]);

        PurchaseOrderItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->item->id,
            'ordered_quantity' => 30.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 30.0, // المتبقي فقط 30
            'unit_price' => 50.0,
            'total_price' => 1500.0,
        ]);

        Sanctum::actingAs($this->ownerUser);

        // طلب توريد 35 بينما المتبقي 30 فقط
        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 35,
            'reference_type' => 'purchase_order',
            'reference_number' => $po->po_number,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'OverReceiptNotPermitted');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
        $this->assertEquals(0, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());
    }

    /**
     * 19. اختبار نجاح التوريد المعتمد وتحديث الكمية المتبقية وحالة أمر الشراء
     */
    public function test_inventory_transaction_succeeds_with_valid_purchase_order_and_updates_remaining_quantity(): void
    {
        $supplier = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'مورد التوريد الفعلي',
            'code' => 'SUP-REAL-01',
        ]);

        $po = PurchaseOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'po_number' => 'PO-REAL-001',
            'order_date' => now()->toDateString(),
            'status' => 'approved',
            'subtotal' => 5000.0,
            'total_amount' => 5000.0,
        ]);

        $poItem = PurchaseOrderItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'inventory_item_id' => $this->item->id,
            'ordered_quantity' => 100.0,
            'received_quantity' => 0.0,
            'remaining_quantity' => 100.0,
            'unit_price' => 50.0,
            'total_price' => 5000.0,
        ]);

        Sanctum::actingAs($this->ownerUser);

        $idempKey = 'PO-REAL-IDEMP-' . uniqid();

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 40.0,
            'unit_cost' => 50.0,
            'reference_type' => 'purchase_order',
            'reference_number' => $po->po_number,
            'idempotency_key' => $idempKey,
        ]);

        $response->assertStatus(201);

        // 1. زيادة رصيد المخزن من 500 إلى 540
        $this->item->refresh();
        $this->assertEquals(540.0, (float) $this->item->current_balance);

        // 2. تحديث كميات بند أمر الشراء
        $poItem->refresh();
        $this->assertEquals(40.0, (float) $poItem->received_quantity);
        $this->assertEquals(60.0, (float) $poItem->remaining_quantity);

        // 3. تحديث حالة أمر الشراء إلى مستلم جزئياً
        $po->refresh();
        $this->assertEquals('partially_received', $po->status);

        // 4. اختبار منع تكرار الرصيد عند إعادة إرسال نفس الطلب بالمفتاح (Duplicate Replay)
        $replayResponse = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 40.0,
            'unit_cost' => 50.0,
            'reference_type' => 'purchase_order',
            'reference_number' => $po->po_number,
            'idempotency_key' => $idempKey,
        ]);

        $replayResponse->assertStatus(200)->assertJsonPath('is_duplicate', true);

        // التأكد القاطع من بقاء الرصيد عند 540.0 وليس 580.0
        $this->item->refresh();
        $this->assertEquals(540.0, (float) $this->item->current_balance);
        $poItem->refresh();
        $this->assertEquals(60.0, (float) $poItem->remaining_quantity);
    }

    /**
     * 20. اختبار صرف خامات لأمر قص: رفض أمر القص الملغى أو غير الموجود
     */
    public function test_material_issuance_rejects_nonexistent_or_cancelled_cutting_order(): void
    {
        Sanctum::actingAs($this->productionManagerUser);

        // 1. أمر قص غير موجود
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 30,
            'reference_type' => 'cutting_order',
            'reference_number' => 'CUT-NONEXISTENT-999',
        ])->assertStatus(422)->assertJsonPath('error', 'InvalidReferenceDocument');

        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'قميص تجريبي',
            'code' => 'MOD-CUT-01',
            'category' => 'boys',
        ]);

        $bom = BillOfMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $model->id,
            'bom_code' => 'BOM-CUT-01',
            'name' => 'BOM قميص',
            'version' => 1,
            'status' => 'approved',
        ]);

        $prodOrder = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'PO-PROD-CUT-01',
            'garment_model_id' => $model->id,
            'bill_of_material_id' => $bom->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'in_progress',
            'total_planned_quantity' => 100,
        ]);

        // 2. أمر قص ملغى
        $cancelledCutting = CuttingOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-CANCELLED-001',
            'production_order_id' => $prodOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'fabric_inventory_item_id' => $this->item->id,
            'lay_length_meters' => 2.5,
            'layers_count' => 10,
            'status' => 'cancelled',
        ]);

        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 30,
            'reference_type' => 'cutting_order',
            'reference_number' => $cancelledCutting->cutting_order_number,
        ])->assertStatus(422)->assertJsonPath('error', 'InvalidDocumentStatus');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 21. اختبار صرف خامات لأمر قص: رفض الصرف إذا كان الصنف لا يطابق خامة أمر القص
     */
    public function test_material_issuance_rejects_mismatched_fabric_item_for_cutting_order(): void
    {
        $differentFabric = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-SILK-01',
            'name' => 'حرير طبيعي',
            'unit_of_measure' => 'm',
            'current_balance' => 200.0,
            'average_cost' => 100.0,
        ]);

        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'فستان حرير',
            'code' => 'MOD-SILK-01',
            'category' => 'boys',
        ]);

        $bom = BillOfMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $model->id,
            'bom_code' => 'BOM-SILK-01',
            'name' => 'BOM فستان حرير',
            'version' => 1,
            'status' => 'approved',
        ]);

        $prodOrder = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'PO-PROD-SILK-01',
            'garment_model_id' => $model->id,
            'bill_of_material_id' => $bom->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'in_progress',
            'total_planned_quantity' => 50,
        ]);

        $cuttingOrder = CuttingOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-MATCH-001',
            'production_order_id' => $prodOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'fabric_inventory_item_id' => $differentFabric->id,
            'lay_length_meters' => 2.5,
            'layers_count' => 10,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($this->productionManagerUser);

        // محاولة صرف $this->item لأمر قص معتمد لخامة حرير
        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 20,
            'reference_type' => 'cutting_order',
            'reference_number' => $cuttingOrder->cutting_order_number,
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'InvalidReferenceItem');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 22. اختبار نجاح صرف خامات لأمر قص صالح ومطابق
     */
    public function test_material_issuance_succeeds_with_valid_cutting_order(): void
    {
        $model = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'قميص صيفي',
            'code' => 'MOD-SUMMER-01',
            'category' => 'boys',
        ]);

        $bom = BillOfMaterial::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'garment_model_id' => $model->id,
            'bom_code' => 'BOM-SUMMER-01',
            'name' => 'BOM صيفي',
            'version' => 1,
            'status' => 'approved',
        ]);

        $prodOrder = ProductionOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'order_number' => 'PO-PROD-SUMMER-01',
            'garment_model_id' => $model->id,
            'bill_of_material_id' => $bom->id,
            'planned_start_date' => now()->toDateString(),
            'target_delivery_date' => now()->addDays(10)->toDateString(),
            'status' => 'in_progress',
            'total_planned_quantity' => 80,
        ]);

        $cuttingOrder = CuttingOrder::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenant->id,
            'cutting_order_number' => 'CUT-VALID-001',
            'production_order_id' => $prodOrder->id,
            'warehouse_id' => $this->warehouse->id,
            'fabric_inventory_item_id' => $this->item->id,
            'lay_length_meters' => 2.5,
            'layers_count' => 10,
            'status' => 'in_progress',
        ]);

        Sanctum::actingAs($this->productionManagerUser);

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 50,
            'reference_type' => 'cutting_order',
            'reference_number' => $cuttingOrder->cutting_order_number,
        ]);

        $response->assertStatus(201);

        $this->item->refresh();
        $this->assertEquals(450.0, (float) $this->item->current_balance);
    }

    /**
     * 23. اختبار حظر المراجع اليدوية للعمليات التشغيلية (Manual References Denied for Operational Movements)
     */
    public function test_operational_movements_reject_manual_reference(): void
    {
        Sanctum::actingAs($this->ownerUser);

        // 1. محاولة توريد بمرجع يدوي
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 20,
            'reference_type' => 'manual_reference',
            'reference_number' => 'MANUAL-OVERRIDE-01',
        ])->assertStatus(422)->assertJsonPath('error', 'InvalidReferenceTypeForTransaction');

        // 2. محاولة صرف بمرجع يدوي
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 20,
            'reference_type' => 'manual_reference',
            'reference_number' => 'MANUAL-OVERRIDE-02',
        ])->assertStatus(422)->assertJsonPath('error', 'InvalidReferenceTypeForTransaction');

        $this->item->refresh();
        $this->assertEquals(500.0, (float) $this->item->current_balance);
    }

    /**
     * 24. اختبار عمل التسويات الجردية اليدوية المشروعة للأدوار المصرح لها (المحاسب وإدارة المصنع)
     */
    public function test_legitimate_manual_adjustments_succeed_for_authorized_roles_with_audit_trail(): void
    {
        Sanctum::actingAs($this->accountantUser);

        $response = $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'adjustment_positive',
            'direction' => 'IN',
            'quantity' => 30.0,
            'unit_cost' => 50.0,
            'reference_type' => 'manual_reference',
            'reference_number' => 'AUDIT-ADJ-2026-Q4',
            'notes' => 'تسوية جردية بعد جرد ربع سنوي معتمد',
        ]);

        $response->assertStatus(201);

        $this->item->refresh();
        $this->assertEquals(530.0, (float) $this->item->current_balance);

        $tx = InventoryTransaction::where('inventory_item_id', $this->item->id)
            ->where('reference_number', 'AUDIT-ADJ-2026-Q4')
            ->first();

        $this->assertNotNull($tx);
        $this->assertEquals('manual_reference', $tx->reference_type);
        $this->assertEquals('adjustment_positive', $tx->transaction_type);
    }

    /**
     * 25. اختبار ثبات الرصيد وعدم كتابة أي قيود في دفتر الأستاذ عند فشل أي طلب بسبب المرجعية
     */
    public function test_failed_reference_requests_leave_stock_balances_and_ledger_records_unchanged(): void
    {
        Sanctum::actingAs($this->ownerUser);

        $initialBalance = (float) $this->item->fresh()->current_balance;
        $initialTxCount = InventoryTransaction::where('inventory_item_id', $this->item->id)->count();

        // 1. طلب برقم PO غير موجود
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 100,
            'reference_type' => 'purchase_order',
            'reference_number' => 'PO-FAKE-FAIL-01',
        ])->assertStatus(422);

        // 2. طلب بصرف لأمر قص غير موجود
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'material_issuance',
            'direction' => 'OUT',
            'quantity' => 100,
            'reference_type' => 'cutting_order',
            'reference_number' => 'CUT-FAKE-FAIL-02',
        ])->assertStatus(422);

        // 3. طلب بتوريد بمرجع يدوي غير مسموح
        $this->postJson('/api/v1/inventory/transactions', [
            'inventory_item_id' => $this->item->id,
            'transaction_type' => 'goods_receipt',
            'direction' => 'IN',
            'quantity' => 100,
            'reference_type' => 'manual_reference',
            'reference_number' => 'MANUAL-FAIL-03',
        ])->assertStatus(422);

        $this->assertEquals($initialBalance, (float) $this->item->fresh()->current_balance);
        $this->assertEquals($initialTxCount, InventoryTransaction::where('inventory_item_id', $this->item->id)->count());
    }

    /**
     * 26. اختبار حظر الأدوار غير المصرح لها (مثل العامل ومندوب المبيعات) من تسجيل فواتير الموردين والتشغيل
     */
    public function test_unauthorized_roles_cannot_post_supplier_invoices_or_subcontracting_invoices(): void
    {
        Sanctum::actingAs($this->workerUser);

        // 1. فاتورة مورد: مقتصرة على المحاسب ومالك الشركة
        $resSupplier = $this->postJson('/api/v1/supplier-invoices', [
            'invoice_number' => 'INV-WORKER-BLOCKED-01',
            'purchase_order_id' => '00000000-0000-0000-0000-000000000000',
            'subtotal' => 1000.0,
        ]);

        $resSupplier->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        // 2. فاتورة تشغيل للغير: مقتصرة على المحاسب ومالك الشركة
        $resSub = $this->postJson('/api/v1/subcontracting/invoices', [
            'job_order_id' => '00000000-0000-0000-0000-000000000000',
            'service_amount' => 500.0,
        ]);

        $resSub->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');
    }

    /**
     * 27. اختبار حظر العامل من إنشاء أوامر الشراء وأذون استلام البضائع
     */
    public function test_unauthorized_roles_cannot_create_purchase_orders_or_goods_receipts(): void
    {
        Sanctum::actingAs($this->workerUser);

        // أمر شراء: مقتصر على المحاسب ومدير الإنتاج ومالك الشركة
        $resPo = $this->postJson('/api/v1/purchase-orders', [
            'supplier_id' => '00000000-0000-0000-0000-000000000000',
            'warehouse_id' => '00000000-0000-0000-0000-000000000000',
            'items' => [],
        ]);

        $resPo->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');

        // إذن استلام بضاعة: مقتصر على مدير الإنتاج والمحاسب ومالك الشركة
        $resGrn = $this->postJson('/api/v1/goods-receipts', [
            'purchase_order_id' => '00000000-0000-0000-0000-000000000000',
            'inspection_status' => 'passed',
            'items' => [],
        ]);

        $resGrn->assertStatus(403)
            ->assertJsonPath('error', 'UnauthorizedRole');
    }

    /**
     * 28. اختبار سماح المحاسب بالوصول لنقاط نهاية الفواتير وتجاوز فحص الدور
     */
    public function test_authorized_accountant_passes_invoice_role_gate(): void
    {
        Sanctum::actingAs($this->accountantUser);

        // المحاسب يمر من حاجز الدور role:accountant (سيفشل في الفاليديشن 422 وليس 403)
        $resSupplier = $this->postJson('/api/v1/supplier-invoices', [
            'invoice_number' => 'INV-ACC-TEST-01',
            // مدخلات ناقصة لاختبار الوصول
        ]);

        $this->assertNotEquals(403, $resSupplier->status());
        $resSupplier->assertStatus(422); // مر من الدور وفشل في التحقق من صحة المدخلات
    }
}


<?php

namespace Tests\Feature;

use App\Models\Color;
use App\Models\Customer;
use App\Models\CustomerMaterial;
use App\Models\CustomerMaterialReceipt;
use App\Models\ExternalOperation;
use App\Models\GarmentModel;
use App\Models\InventoryItem;
use App\Models\JobDeliveryNote;
use App\Models\JobInvoice;
use App\Models\JobOrder;
use App\Models\ProductionOrder;
use App\Models\Size;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\SubcontractingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubcontractingAndCmtTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $userA;
    protected User $userB;
    protected Customer $customerA;
    protected Customer $customerB;
    protected Warehouse $warehouseFabA;
    protected Warehouse $warehouseFabB;
    protected GarmentModel $modelA;
    protected Color $colorRed;
    protected Size $sizeM;
    protected SubcontractingService $subService;
    protected InventoryService $invService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->subService = app(SubcontractingService::class);
        $this->invService = app(InventoryService::class);

        // الشركة أ
        $this->tenantA = Tenant::create([
            'code' => 'TEN-SUBCONT-A',
            'name' => 'مصنع النيل للتشغيل للغير',
            'subdomain' => 'nile-subcontracting',
            'is_active' => true,
        ]);

        // الشركة ب
        $this->tenantB = Tenant::create([
            'code' => 'TEN-SUBCONT-B',
            'name' => 'مصنع الأهرام للملابس',
            'subdomain' => 'ahram-garments',
            'is_active' => true,
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مدير تشغيل النيل',
            'email' => 'sub-admin@nile.com',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        $this->userB = User::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مدير تشغيل الأهرام',
            'email' => 'sub-admin@ahram.com',
            'role' => 'company_owner',
            'is_active' => true,
            'password' => bcrypt('password123'),
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);

        $this->warehouseFabA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن أمانات العملاء أ',
            'code' => 'WH-CUST-A',
            'type' => 'customer_deposits',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $this->warehouseFabB = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'مخزن أمانات العملاء ب',
            'code' => 'WH-CUST-B',
            'type' => 'customer_deposits',
            'allow_negative_stock' => false,
            'is_active' => true,
        ]);

        $this->customerA = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'CUST-001',
            'name' => 'شركة كايرو فاشون',
            'phone' => '+201011112222',
            'is_active' => true,
        ]);

        $this->customerB = Customer::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantB->id,
            'code' => 'CUST-002',
            'name' => 'براند الإسكندرية',
            'phone' => '+201033334444',
            'is_active' => true,
        ]);

        $this->modelA = GarmentModel::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'MOD-TSHIRT-01',
            'name' => 'تيشيرت أطفال قطن',
            'category' => 'boys',
            'target_cost' => 45.0,
            'wholesale_price' => 75.0,
            'retail_price' => 110.0,
            'is_active' => true,
        ]);

        $this->colorRed = Color::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'أحمر زاهي',
            'hex_code' => '#FF0000',
        ]);

        $this->sizeM = Size::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => '4-5 سنوات',
            'code' => 'SZ-4-5Y',
        ]);
    }

    /**
     * 1. إنشاء عميل وأمر تشغيل لخدمة القص للغير مع التحقق من الهيكلية
     */
    public function test_can_create_customer_and_job_order_for_contract_cutting(): void
    {
        $response = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/jobs', [
                'customer_id' => $this->customerA->id,
                'customer_name' => $this->customerA->name,
                'service_type' => 'contract_cutting',
                'garment_model_id' => $this->modelA->id,
                'fabric_source' => 'customer_supplied',
                'pricing_basis' => 'per_piece',
                'unit_rate' => 6.50,
                'total_target_quantity' => 500,
                'items' => [
                    [
                        'color_id' => $this->colorRed->id,
                        'size_id' => $this->sizeM->id,
                        'target_quantity' => 500,
                        'unit_rate' => 6.50,
                    ],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.total_target_quantity', 500)
            ->assertJsonPath('data.service_type', 'contract_cutting');

        $jobId = $response->json('data.id');

        // تأكيد أمر التشغيل
        $confirmResponse = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson("/api/v1/subcontracting/jobs/{$jobId}/confirm");

        $confirmResponse->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.status', 'confirmed');
    }

    /**
     * 2. دورة كاملة لخدمة القص للغير: استلام خامة العميل، تنفيذ التسليم، وإصدار الفاتورة
     */
    public function test_contract_cutting_full_lifecycle_receipt_cut_deliver_and_invoice(): void
    {
        // 1. إنشاء أمر تشغيل
        $job = $this->subService->createJobOrder([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'service_type' => 'contract_cutting',
            'pricing_basis' => 'per_piece',
            'unit_rate' => 5.0,
            'total_target_quantity' => 200,
        ]);
        $this->subService->confirmJobOrder($job->id);

        // 2. استلام 120 متراً من قماش العميل
        $receipt = $this->subService->receiveCustomerMaterialReceipt([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'warehouse_id' => $this->warehouseFabA->id,
            'fabric_name' => 'قماش سنغل ليكرا قطن أسود',
            'received_meters' => 120.0,
            'usable_width_meters' => 1.65,
            'gsm' => 190.0,
        ]);

        $this->assertEquals(120.0, (float)$receipt->received_meters);

        // التحقق من تحديث رصيد الأمانة في CustomerMaterial
        $custMat = CustomerMaterial::where('tenant_id', $this->tenantA->id)->where('customer_name', $this->customerA->name)->first();
        $this->assertNotNull($custMat);
        $this->assertEquals(120.0, (float)$custMat->remaining_meters);
        $this->assertEquals(120.0, (float)$custMat->received_meters);

        // محاكاة استهلاك 100 متر في القص مع 10 أمتار هالك أطراف وبقاء 10 أمتار
        $this->invService->consumeCustomerMaterial($custMat->id, 100.0, 10.0);
        $custMat->refresh();
        $this->assertEquals(10.0, (float)$custMat->remaining_meters);
        $this->assertEquals(100.0, (float)$custMat->consumed_meters);
        $this->assertEquals(10.0, (float)$custMat->waste_meters);

        // 3. إصدار إذن تسليم 200 قطعة مقصوصة مع إرجاع 10 أمتار قماش سليم باقٍ للعميل
        $delivery = $this->subService->createDeliveryNote([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'total_delivered_pieces' => 200,
            'returned_unused_fabric_meters' => 10.0,
            'scrap_fabric_meters' => 0.0,
            'delivered_by' => 'سائق المصنع',
            'received_by_customer' => 'مندوب شركة كايرو',
        ]);

        $this->assertEquals(200, $delivery->total_delivered_pieces);

        // التحقق من تصفير الرصيد المتبقي وصيانة المعادلة: 120 = 100 مستهلك + 10 هالك + 10 مرتجع + 0 متبقٍ
        $custMat->refresh();
        $this->assertEquals(0.0, (float)$custMat->remaining_meters);
        $this->assertEquals(10.0, (float)$custMat->returned_meters);
        $this->assertEquals(120.0, round((float)$custMat->consumed_meters + (float)$custMat->waste_meters + (float)$custMat->returned_meters + (float)$custMat->remaining_meters, 4));

        $job->refresh();
        $this->assertEquals('completed', $job->status);
        $this->assertEquals(200, $job->total_delivered_quantity);

        // 4. إصدار فاتورة خدمات القص: 200 قطعة × 5.0 ج.م = 1000 ج.م + ضريبة 14% = 1140 ج.م
        $invoice = $this->subService->createJobInvoice([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'service_amount' => 1000.0,
            'tax_amount' => 140.0,
        ]);

        $this->assertEquals(1140.0, (float)$invoice->total_amount);
        $this->assertEquals('issued', $invoice->status);

        // سداد الفاتورة
        $paidInv = $this->subService->recordInvoicePayment($invoice->id, 1140.0);
        $this->assertEquals('paid', $paidInv->status);
        $this->assertEquals(1140.0, (float)$paidInv->paid_amount);
    }

    /**
     * 3. دورة التصنيع الكامل للغير (CMT) مع تشغيل خارجي (تطريز/طباعة)
     */
    public function test_cmt_manufacturing_cycle_with_external_operations_and_quality(): void
    {
        $job = $this->subService->createJobOrder([
            'tenant_id' => $this->tenantA->id,
            'customer_id' => $this->customerA->id,
            'customer_name' => $this->customerA->name,
            'service_type' => 'cmt',
            'pricing_basis' => 'per_piece',
            'unit_rate' => 25.0,
            'total_target_quantity' => 100,
        ]);
        $this->subService->confirmJobOrder($job->id);

        // إرسال 100 قطعة لمغسلة ومطرزات خارجية
        $extOp = $this->subService->dispatchExternalOperation([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'subcontractor_name' => 'ورشة الأهرام للتطريز الآلي',
            'operation_type' => 'embroidery',
            'sent_quantity' => 100,
            'unit_rate' => 3.50, // 350 ج.م
        ]);

        $this->assertEquals('dispatched', $extOp->status);
        $this->assertEquals(350.0, (float)$extOp->total_cost);

        // استلام المخرجات من ورشة التطريز: 98 سليم، 2 تالف
        $receivedOp = $this->subService->receiveExternalOperation($extOp->id, [
            'received_accepted_quantity' => 98,
            'received_rejected_quantity' => 0,
            'scrap_quantity' => 2,
        ]);

        $this->assertEquals('completed', $receivedOp->status);
        $this->assertEquals(98, $receivedOp->received_accepted_quantity);
        $this->assertEquals(2, $receivedOp->scrap_quantity);

        // تسليم الـ 98 قطعة الجاهزة للعميل
        $delivery = $this->subService->createDeliveryNote([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'total_delivered_pieces' => 98,
        ]);

        $this->assertEquals(98, $delivery->total_delivered_pieces);

        // فاتورة الـ CMT مع خصم قيمة القطعتين التالفتين من أتعاب المصنع
        $invoice = $this->subService->createJobInvoice([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'service_amount' => 98 * 25.0, // 2450.0
            'additional_charges' => 0.0,
            'deductions' => 50.0, // خصم تعويض تالف
            'tax_amount' => 0.0,
        ]);

        $this->assertEquals(2400.0, (float)$invoice->total_amount);

        // تقرير الربحية
        $profitability = $this->subService->calculateJobProfitability($job->id);
        $this->assertEquals(2400.0, $profitability['service_revenue']);
        $this->assertEquals(350.0, $profitability['external_operations_cost']);
        $this->assertEquals(0.0, $profitability['customer_materials_cost']); // خامات العميل لا تكلف المصنع
        $this->assertEquals(2050.0, $profitability['gross_margin']); // 2400 - 350 = 2050
    }

    /**
     * 4. خامات العميل أمانات custody ولا تضخم مخزون المصنع أو تقييم أصوله
     */
    public function test_customer_material_custody_balance_isolation_and_reconciliation(): void
    {
        $receipt = $this->subService->receiveCustomerMaterialReceipt([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => $this->customerA->name,
            'warehouse_id' => $this->warehouseFabA->id,
            'fabric_name' => 'قماش كريب ستان مورد للعميل',
            'received_meters' => 500.0,
            'usable_width_meters' => 1.50,
            'gsm' => 160.0,
        ]);

        // التحقق من عدم إنشاء أي حركة بأصل مالي في مخزون المصنع المملوك
        $factoryAssetsCount = InventoryItem::where('tenant_id', $this->tenantA->id)
            ->where('name', 'قماش كريب ستان مورد للعميل')
            ->count();
        $this->assertEquals(0, $factoryAssetsCount);

        // رصيد الأمانة في CustomerMaterial فقط
        $custMat = CustomerMaterial::find($receipt->customer_material_id);
        $this->assertEquals(500.0, (float)$custMat->remaining_meters);
        $this->assertEquals(0.0, (float)$custMat->consumed_meters);

        // حظر الاستهلاك بقيمة تتجاوز الرصيد المتاح
        $this->expectException(\InvalidArgumentException::class);
        $this->invService->consumeCustomerMaterial($custMat->id, 550.0, 0.0);
    }

    /**
     * 5. منع التسليم المفرط الذي يتجاوز الكمية المطلوبة
     */
    public function test_over_delivery_beyond_target_quantity_is_blocked(): void
    {
        $job = $this->subService->createJobOrder([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => $this->customerA->name,
            'service_type' => 'contract_cutting',
            'total_target_quantity' => 100,
        ]);
        $this->subService->confirmJobOrder($job->id);

        // تسليم 70 قطعة
        $this->subService->createDeliveryNote([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'total_delivered_pieces' => 70,
        ]);

        // محاولة تسليم 40 قطعة إضافية (المتبقي فقط 30) -> يجب أن تفشل
        $this->expectException(\InvalidArgumentException::class);
        $this->subService->createDeliveryNote([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'total_delivered_pieces' => 40,
        ]);
    }

    /**
     * 6. التحقق من اتساق كميات التشغيل الخارجي (مجموع المقبول والمرفوض والهالك لا يتجاوز المرسل)
     */
    public function test_external_operation_quantity_balance_validation(): void
    {
        $job = $this->subService->createJobOrder([
            'tenant_id' => $this->tenantA->id,
            'customer_name' => $this->customerA->name,
            'service_type' => 'cmt',
            'total_target_quantity' => 50,
        ]);

        $extOp = $this->subService->dispatchExternalOperation([
            'tenant_id' => $this->tenantA->id,
            'job_order_id' => $job->id,
            'subcontractor_name' => 'مطبعة الصفا',
            'operation_type' => 'printing',
            'sent_quantity' => 50,
        ]);

        // استلام 60 قطعة عندما أرسل 50 فقط -> خطأ
        $this->expectException(\InvalidArgumentException::class);
        $this->subService->receiveExternalOperation($extOp->id, [
            'received_accepted_quantity' => 55,
            'received_rejected_quantity' => 5,
            'scrap_quantity' => 5,
        ]);
    }

    /**
     * 7. التحقق من الـ Idempotency: إعادة إرسال نفس الطلب تعيد نفس السجل، وتغيير الحقول يعيد 409
     */
    public function test_idempotency_returns_original_order_and_conflicting_payload_returns_409(): void
    {
        $idempotencyKey = 'IDEMP-JOB-' . uniqid();

        $payload = [
            'customer_name' => 'شركة الدلتا للتجارة',
            'service_type' => 'contract_cutting',
            'pricing_basis' => 'per_piece',
            'unit_rate' => 10.0,
            'total_target_quantity' => 300,
            'idempotency_key' => $idempotencyKey,
        ];

        // الطلب الأول
        $res1 = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/jobs', $payload);

        $res1->assertStatus(201)
            ->assertJsonPath('is_duplicate', false);

        $jobId = $res1->json('data.id');

        // الطلب الثاني بنفس المفتاح والحمولة -> يعيد 200 مع نفس السجل
        $res2 = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/jobs', $payload);

        $res2->assertStatus(200)
            ->assertJsonPath('is_duplicate', true)
            ->assertJsonPath('data.id', $jobId);

        // الطلب الثالث بنفس المفتاح لكن كمية مختلفة (400 بدلاً من 300) -> يجب أن يعيد 409 Conflict
        $conflictingPayload = $payload;
        $conflictingPayload['total_target_quantity'] = 400;

        $res3 = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/jobs', $conflictingPayload);

        $res3->assertStatus(409)
            ->assertJsonPath('error', 'IdempotencyConflict');
    }

    /**
     * 8. عزل المستأجرين التام: الشركة أ لا تستطيع الوصول أو التعديل أو استلام خامات لأمر الشركة ب
     */
    public function test_cross_tenant_isolation_on_all_subcontracting_endpoints(): void
    {
        // إنشاء أمر تشغيل يخص الشركة ب
        app()->instance('current_tenant_id', $this->tenantB->id);
        $jobB = $this->subService->createJobOrder([
            'tenant_id' => $this->tenantB->id,
            'customer_id' => $this->customerB->id,
            'customer_name' => $this->customerB->name,
            'service_type' => 'contract_cutting',
            'total_target_quantity' => 150,
        ]);

        // محاولة المستخدم أ استعراض تفاصيل أمر الشركة ب
        $resShow = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->getJson("/api/v1/subcontracting/jobs/{$jobB->id}");

        $resShow->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        // محاولة المستخدم أ تأكيد أمر الشركة ب
        $resConfirm = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson("/api/v1/subcontracting/jobs/{$jobB->id}/confirm");

        $resConfirm->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        // محاولة إنشاء إذن تسليم ضد أمر الشركة ب
        $resDeliver = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/delivery-notes', [
                'job_order_id' => $jobB->id,
                'total_delivered_pieces' => 50,
            ]);

        $resDeliver->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');

        // محاولة إنشاء أمر تشغيل لشركة أ مع الإشارة لعميل يخص شركة ب
        $resCustomerTamper = $this->actingAs($this->userA)
            ->withHeader('X-Tenant-Id', $this->tenantA->id)
            ->postJson('/api/v1/subcontracting/jobs', [
                'customer_id' => $this->customerB->id,
                'customer_name' => 'محاولة تزوير عميل',
                'service_type' => 'contract_cutting',
                'total_target_quantity' => 100,
            ]);

        $resCustomerTamper->assertStatus(403)
            ->assertJsonPath('error', 'CrossTenantAccessDenied');
    }
}

<?php

namespace Tests\Feature;

use App\Models\GoodsReceiptNote;
use App\Models\InventoryItem;
use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ProcurementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProcurementAndVendorTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenantA;
    private User $userA;
    private Warehouse $warehouseA;
    private Supplier $supplierA;
    private InventoryItem $fabricItemA;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenantA = Tenant::create([
            'code' => 'TEN-PROC-A',
            'name' => 'مصنع المحلة لملابس الأطفال',
            'subdomain' => 'mahalla-kids',
        ]);

        $this->userA = User::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'م. طارق كمال',
            'email' => 'tarek@mahalla.com',
            'password' => bcrypt('secret123'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        $this->warehouseA = Warehouse::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'مخزن الأقمشة الخام',
            'code' => 'WH-FAB-MHL',
            'type' => 'fabric',
            'allow_negative_stock' => false,
        ]);

        $this->supplierA = Supplier::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'code' => 'SUP-TEX-01',
            'name' => 'شركة مصر للغزل والنسيج',
            'tax_id' => '100-244-901',
            'payment_terms' => 'net_30',
            'current_balance' => 0,
        ]);

        $this->fabricItemA = InventoryItem::withoutGlobalScopes()->create([
            'tenant_id' => $this->tenantA->id,
            'warehouse_id' => $this->warehouseA->id,
            'item_type' => 'fabric_raw',
            'code' => 'FAB-SINGLE-JERSEY',
            'name' => 'قماش سينجل جيرسي قطن 100% كحلي',
            'unit_of_measure' => 'meter',
            'current_balance' => 0,
            'average_cost' => 0,
        ]);

        app()->instance('current_tenant_id', $this->tenantA->id);
    }

    /**
     * اختبار دورة شراء كاملة: إنشاء طلب شراء ← اعتماده ← استلام الخامات ← مطابقة الفاتورة
     */
    public function test_full_procurement_cycle_order_approve_receive_and_invoice(): void
    {
        $service = app(ProcurementService::class);

        // 1. إنشاء أمر شراء لـ 1,000 متر قماش بسعر 100 ج.م
        $po = $service->createPurchaseOrder([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $this->supplierA->id,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'ordered_quantity' => 1000,
                    'unit_price' => 100.0,
                    'tax_rate' => 14.0,
                ],
            ],
        ]);

        $this->assertEquals('draft', $po->status);
        $this->assertEquals(100000.0, (float) $po->subtotal);
        $this->assertEquals(114000.0, (float) $po->total_amount); // مع ضريبة 14%
        $this->assertEquals(1000, $po->items->first()->remaining_quantity);

        // 2. اعتماد أمر الشراء
        $approvedPo = $service->approvePurchaseOrder($po->id, $this->userA->id);
        $this->assertEquals('approved', $approvedPo->status);

        // 3. استلام كامل البضاعة في المخزن وفحصها (GRN)
        $poItem = $approvedPo->items->first();
        $grn = $service->receiveGoods([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $approvedPo->id,
            'quality_inspector_name' => 'م. أحمد شكري',
            'inspection_status' => 'passed',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 1000,
                    'accepted_quantity' => 1000,
                    'rejected_quantity' => 0,
                ],
            ],
        ]);

        $this->assertEquals('posted', $grn->status);

        // التحقق من تحديث رصيد المخزن الدفتري عبر خدمة المخزون
        $this->fabricItemA->refresh();
        $this->assertEquals(1000.0, (float) $this->fabricItemA->current_balance);
        $this->assertEquals(100.0, (float) $this->fabricItemA->average_cost);

        // أمر الشراء تحول لمستلم بالكامل
        $approvedPo->refresh();
        $this->assertEquals('received', $approvedPo->status);

        // 4. مطابقة واعتماد فاتورة المورد (3-Way Matching)
        $invoice = $service->matchAndCreateInvoice([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $approvedPo->id,
            'goods_receipt_note_id' => $grn->id,
            'invoice_number' => 'INV-TEX-2026-90',
            'subtotal' => 100000.0,
            'tax_amount' => 14000.0,
        ]);

        $this->assertEquals('matched', $invoice->matching_status);
        $this->assertTrue($invoice->is_posted);

        // التحقق من إثبات الالتزام المالي على المورد
        $this->supplierA->refresh();
        $this->assertEquals(114000.0, (float) $this->supplierA->current_balance);
    }

    /**
     * اختبار الاستلام الجزئي ومنع تجاوز الكميات المتبقية في أمر الشراء
     */
    public function test_partial_receipt_and_preventing_over_receiving(): void
    {
        $service = app(ProcurementService::class);

        $po = $service->createPurchaseOrder([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $this->supplierA->id,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'ordered_quantity' => 500,
                    'unit_price' => 100.0,
                ],
            ],
        ]);
        $service->approvePurchaseOrder($po->id);

        $poItem = $po->items->first();

        // 1. استلام جزئي أول: 300 متر
        $grn1 = $service->receiveGoods([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 300,
                    'accepted_quantity' => 300,
                ],
            ],
        ]);

        $po->refresh();
        $poItem->refresh();
        $this->assertEquals('partially_received', $po->status);
        $this->assertEquals(200.0, (float) $poItem->remaining_quantity);

        // 2. محاولة استلام كمية أكبر من المتبقي (300 متر بينما المتبقي 200 متر فقط)
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('تتجاوز الكمية المتبقية في أمر الشراء');

        $service->receiveGoods([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 300,
                    'accepted_quantity' => 300,
                ],
            ],
        ]);
    }

    /**
     * اختبار فحص الجودة: فرز كميات مرفوضة وتسجيل فقط الكمية المقبولة في المخزن
     */
    public function test_quality_inspection_rejection_and_accepted_quantity_to_stock(): void
    {
        $service = app(ProcurementService::class);

        $po = $service->createPurchaseOrder([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $this->supplierA->id,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'ordered_quantity' => 500,
                    'unit_price' => 120.0,
                ],
            ],
        ]);
        $service->approvePurchaseOrder($po->id);
        $poItem = $po->items->first();

        // تسليم 500 متر: قُبل منها 450 متر، ورُفض 50 متر لوجود بقع زيتية
        $grn = $service->receiveGoods([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'quality_inspector_name' => 'فاحص جودة النسيج',
            'inspection_status' => 'partial_pass',
            'items' => [
                [
                    'purchase_order_item_id' => $poItem->id,
                    'delivered_quantity' => 500,
                    'accepted_quantity' => 450,
                    'rejected_quantity' => 50,
                    'rejection_reason' => 'بقع زيت وتنسيل في خيوط اللحمة',
                ],
            ],
        ]);

        $grnItem = $grn->items->first();
        $this->assertEquals(450.0, (float) $grnItem->accepted_quantity);
        $this->assertEquals(50.0, (float) $grnItem->rejected_quantity);

        // المخزن دخل فيه 450 متر فقط وليس 500
        $this->fabricItemA->refresh();
        $this->assertEquals(450.0, (float) $this->fabricItemA->current_balance);
    }

    /**
     * اختبار: كشف فروق الأسعار في المطابقة الثلاثية (Price Variance Detection)
     */
    public function test_three_way_matching_detects_price_variance(): void
    {
        $service = app(ProcurementService::class);

        $po = $service->createPurchaseOrder([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $this->supplierA->id,
            'warehouse_id' => $this->warehouseA->id,
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'ordered_quantity' => 100,
                    'unit_price' => 100.0, // القيمة المتفق عليها 10,000 ج.م
                ],
            ],
        ]);
        $service->approvePurchaseOrder($po->id);

        $grn = $service->receiveGoods([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'items' => [
                [
                    'purchase_order_item_id' => $po->items->first()->id,
                    'delivered_quantity' => 100,
                    'accepted_quantity' => 100,
                ],
            ],
        ]);

        // المورد أرسل فاتورة بمبلغ 12,000 ج.م بدلاً من 10,000 ج.م (فرق سعر)
        $invoice = $service->matchAndCreateInvoice([
            'tenant_id' => $this->tenantA->id,
            'purchase_order_id' => $po->id,
            'goods_receipt_note_id' => $grn->id,
            'invoice_number' => 'INV-MISMATCH-01',
            'subtotal' => 12000.0,
            'tax_amount' => 1680.0,
        ]);

        $this->assertEquals('price_variance', $invoice->matching_status);
        $this->assertStringContainsString('يوجد فرق مالي بين قيمة البضاعة المقبولة', $invoice->variance_notes);
    }

    /**
     * اختبار: معالجة مرتجع المشتريات وإشعار الخصم وخفض رصيد المخزن والمستحقات
     */
    public function test_purchase_return_deducts_stock_and_reduces_supplier_balance(): void
    {
        $service = app(ProcurementService::class);

        // تهيئة رصيد مخزن ومستحقات مورد
        $this->fabricItemA->current_balance = 300;
        $this->fabricItemA->average_cost = 100;
        $this->fabricItemA->save();

        $this->supplierA->current_balance = 30000;
        $this->supplierA->save();

        // إرجاع 100 متر للمورد لعيوب لاحقة بسعر 100 ج.م (10,000 ج.م)
        $return = $service->processPurchaseReturn([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $this->supplierA->id,
            'warehouse_id' => $this->warehouseA->id,
            'reason' => 'ظهور انكماش زائد بعد اختبارات المعمل',
            'items' => [
                [
                    'inventory_item_id' => $this->fabricItemA->id,
                    'returned_quantity' => 100,
                    'unit_cost' => 100.0,
                ],
            ],
        ]);

        $this->assertEquals(10000.0, (float) $return->total_return_amount);

        // خصم المخزون
        $this->fabricItemA->refresh();
        $this->assertEquals(200.0, (float) $this->fabricItemA->current_balance);

        // خفض مستحقات المورد
        $this->supplierA->refresh();
        $this->assertEquals(20000.0, (float) $this->supplierA->current_balance);
    }

    /**
     * اختبار عزل الشركات على الموردين وأوامر الشراء (Multi-Tenant Isolation)
     */
    public function test_cross_tenant_isolation_on_suppliers_and_procurement_documents(): void
    {
        $tenantB = Tenant::create([
            'code' => 'TEN-PROC-B',
            'name' => 'مصنع الإسكندرية للملابس',
            'subdomain' => 'alex-kids',
        ]);

        $userB = User::create([
            'tenant_id' => $tenantB->id,
            'name' => 'م. ياسر فؤاد',
            'email' => 'yasser@alexkids.com',
            'password' => bcrypt('password'),
            'role' => 'company_owner',
            'is_active' => true,
        ]);

        // مستخدم شركة ب يطلب الموردين عبر الـ API
        $response = $this->actingAs($userB)->getJson('/api/v1/suppliers');

        $response->assertStatus(200);
        $data = $response->json('data');

        // لا يجب أن يظهر مورد شركة أ
        $this->assertCount(0, $data);
    }
}

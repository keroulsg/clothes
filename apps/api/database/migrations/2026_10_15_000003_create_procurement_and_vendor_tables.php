<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. جدول الموردين (Suppliers & Vendors)
        Schema::create('suppliers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50); // SUP-001
            $table->string('name', 255);
            $table->string('contact_person', 255)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('tax_id', 100)->nullable(); // البطاقة الضريبية / السجل التجاري
            $table->string('payment_terms', 50)->default('net_30'); // cash, net_15, net_30, net_60
            $table->decimal('credit_limit', 14, 4)->default(0);
            $table->decimal('current_balance', 14, 4)->default(0); // إجمالي المستحقات للمورد
            $table->boolean('is_active')->default(true);
            $table->string('address', 500)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 2. أوامر الشراء (Purchase Orders)
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('po_number', 100); // PO-2026-001
            $table->uuid('supplier_id')->index();
            $table->uuid('warehouse_id')->index();
            $table->date('order_date');
            $table->date('expected_delivery_date')->nullable();
            $table->string('status', 50)->default('draft'); // draft, approved, partially_received, received, cancelled, closed
            $table->decimal('subtotal', 14, 4)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(14.00); // ضريبة القيمة المضافة
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->unsignedBigInteger('approved_by')->nullable()->index();
            $table->timestamp('approved_at')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['tenant_id', 'po_number']);
        });

        // 3. بنود أمر الشراء (Purchase Order Items)
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('purchase_order_id')->index();
            $table->uuid('inventory_item_id')->index();
            $table->decimal('ordered_quantity', 12, 4);
            $table->decimal('received_quantity', 12, 4)->default(0);
            $table->decimal('remaining_quantity', 12, 4);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(14.00);
            $table->decimal('total_price', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('cascade');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('restrict');
        });

        // 4. أذون استلام وفحص البضاعة (Goods Receipt Notes - GRN)
        Schema::create('goods_receipt_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('grn_number', 100); // GRN-2026-001
            $table->uuid('purchase_order_id')->index();
            $table->uuid('supplier_id')->index();
            $table->uuid('warehouse_id')->index();
            $table->date('receipt_date');
            $table->string('status', 50)->default('posted'); // draft, posted, rejected
            $table->string('quality_inspector_name', 255)->nullable();
            $table->string('inspection_status', 50)->default('passed'); // passed, partial_pass, failed
            $table->string('delivery_note_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('received_by')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('restrict');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->foreign('received_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['tenant_id', 'grn_number']);
        });

        // 5. بنود إذن الاستلام مع فحص الجودة والمقبول والمرفوض (GRN Items)
        Schema::create('goods_receipt_note_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('goods_receipt_note_id')->index();
            $table->uuid('purchase_order_item_id')->index();
            $table->uuid('inventory_item_id')->index();
            $table->decimal('delivered_quantity', 12, 4);
            $table->decimal('accepted_quantity', 12, 4); // الكمية المجازة مخزنياً
            $table->decimal('rejected_quantity', 12, 4)->default(0); // الكمية المرفوضة لوجود عيوب
            $table->string('rejection_reason', 255)->nullable();
            $table->decimal('unit_cost', 14, 4);
            $table->string('roll_numbers', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('goods_receipt_note_id')->references('id')->on('goods_receipt_notes')->onDelete('cascade');
            $table->foreign('purchase_order_item_id')->references('id')->on('purchase_order_items')->onDelete('restrict');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('restrict');
        });

        // 6. فواتير الموردين والمطابقة الثلاثية (Supplier Invoices & 3-Way Matching)
        Schema::create('supplier_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('invoice_number', 100); // رقم فاتورة المورد
            $table->string('internal_reference', 100); // SINV-2026-001
            $table->uuid('supplier_id')->index();
            $table->uuid('purchase_order_id')->index();
            $table->uuid('goods_receipt_note_id')->nullable()->index();
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('subtotal', 14, 4);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4);
            $table->decimal('paid_amount', 14, 4)->default(0);
            $table->string('payment_status', 50)->default('unpaid'); // unpaid, partially_paid, paid
            $table->string('matching_status', 50)->default('matched'); // matched, price_variance, quantity_variance, rejected
            $table->text('variance_notes')->nullable();
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('posted_by')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('purchase_order_id')->references('id')->on('purchase_orders')->onDelete('restrict');
            $table->foreign('goods_receipt_note_id')->references('id')->on('goods_receipt_notes')->onDelete('set null');
            $table->foreign('posted_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['tenant_id', 'internal_reference']);
            $table->unique(['tenant_id', 'supplier_id', 'invoice_number']);
        });

        // 7. مرتجعات المشتريات وإشعارات الخصم (Purchase Returns & Debit Notes)
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('return_number', 100); // PRT-2026-001
            $table->uuid('supplier_id')->index();
            $table->uuid('purchase_order_id')->nullable()->index();
            $table->uuid('goods_receipt_note_id')->nullable()->index();
            $table->uuid('warehouse_id')->index();
            $table->date('return_date');
            $table->decimal('total_return_amount', 14, 4)->default(0);
            $table->string('reason', 255);
            $table->boolean('is_posted')->default(false);
            $table->timestamp('posted_at')->nullable();
            $table->unsignedBigInteger('created_by')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('restrict');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['tenant_id', 'return_number']);
        });

        // 8. بنود مرتجع المشتريات (Purchase Return Items)
        Schema::create('purchase_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('purchase_return_id')->index();
            $table->uuid('inventory_item_id')->index();
            $table->decimal('returned_quantity', 12, 4);
            $table->decimal('unit_cost', 14, 4);
            $table->decimal('total_cost', 14, 4);
            $table->timestamps();

            $table->foreign('purchase_return_id')->references('id')->on('purchase_returns')->onDelete('cascade');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_return_items');
        Schema::dropIfExists('purchase_returns');
        Schema::dropIfExists('supplier_invoices');
        Schema::dropIfExists('goods_receipt_note_items');
        Schema::dropIfExists('goods_receipt_notes');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('suppliers');
    }
};

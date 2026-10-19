<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 7: Sales, Quotations, Sales Orders, Invoices, Inventory Reservation, Factory-Outlet POS
     */
    public function up(): void
    {
        // 1. عروض الأسعار (Quotations)
        Schema::create('quotations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('quotation_number', 50);
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->string('status', 50)->default('draft'); // draft, sent, accepted, rejected, expired
            $table->decimal('subtotal', 14, 4)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->date('valid_until')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->unique(['tenant_id', 'quotation_number']);
        });

        Schema::create('quotation_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('quotation_id')->index();
            $table->uuid('variant_id')->nullable()->index();
            $table->string('description', 255);
            $table->decimal('quantity', 12, 4);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_price', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('restrict');
        });

        // 2. أوامر البيع وحجز المخزون (Sales Orders & Stock Reservation)
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('order_number', 50);
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->uuid('quotation_id')->nullable()->index();
            $table->uuid('warehouse_id')->nullable()->index();
            $table->string('order_type', 50)->default('wholesale'); // wholesale, retail, outlet, custom
            $table->string('status', 50)->default('draft'); // draft, confirmed, reserved, in_fulfillment, fulfilled, cancelled
            $table->string('payment_status', 50)->default('unpaid'); // unpaid, partially_paid, paid
            $table->decimal('subtotal', 14, 4)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->date('expected_delivery_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('quotation_id')->references('id')->on('quotations')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['tenant_id', 'order_number']);
        });

        Schema::create('sales_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sales_order_id')->index();
            $table->uuid('variant_id')->index();
            $table->uuid('inventory_item_id')->nullable()->index();
            $table->decimal('ordered_quantity', 12, 4);
            $table->decimal('reserved_quantity', 12, 4)->default(0);
            $table->decimal('fulfilled_quantity', 12, 4)->default(0);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_price', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('restrict');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
        });

        // 3. فواتير المبيعات ونقاط البيع (Sales Invoices & POS Receipts)
        Schema::create('sales_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('invoice_number', 50);
            $table->uuid('sales_order_id')->nullable()->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->string('invoice_type', 50)->default('standard'); // standard, pos_receipt, tax_invoice
            $table->string('status', 50)->default('issued'); // draft, issued, paid, partially_paid, void
            $table->string('payment_method', 50)->default('credit'); // cash, card, bank_transfer, credit, check
            $table->decimal('subtotal', 14, 4)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('discount_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->decimal('paid_amount', 14, 4)->default(0);
            $table->decimal('balance_due', 14, 4)->default(0);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->unique(['tenant_id', 'invoice_number']);
        });

        Schema::create('sales_invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sales_invoice_id')->index();
            $table->uuid('variant_id')->nullable()->index();
            $table->uuid('inventory_item_id')->nullable()->index();
            $table->string('description', 255);
            $table->decimal('quantity', 12, 4);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_price', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_invoice_id')->references('id')->on('sales_invoices')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
        });

        // 4. جلسات نقطة البيع للمصنع ومنافذ البيع (POS Sessions)
        Schema::create('pos_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('branch_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('session_code', 50);
            $table->decimal('opening_cash', 14, 4)->default(0);
            $table->decimal('closing_cash', 14, 4)->nullable();
            $table->decimal('total_sales', 14, 4)->default(0);
            $table->string('status', 50)->default('open'); // open, closed
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('restrict');
            $table->unique(['tenant_id', 'session_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pos_sessions');
        Schema::dropIfExists('sales_invoice_items');
        Schema::dropIfExists('sales_invoices');
        Schema::dropIfExists('sales_order_items');
        Schema::dropIfExists('sales_orders');
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');
    }
};

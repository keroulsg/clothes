<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 13/8 Core Enhancement: Customer Returns, Shipping, Delivery Notes, and Carton Packing
     */
    public function up(): void
    {
        // 1. مرتجعات المبيعات والعملاء (Customer & Sales Returns)
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('return_number', 50);
            $table->uuid('customer_id')->nullable()->index();
            $table->uuid('sales_order_id')->nullable()->index();
            $table->uuid('sales_invoice_id')->nullable()->index();
            $table->uuid('warehouse_id')->index();
            $table->date('return_date');
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->string('refund_status', 50)->default('pending'); // pending, credited, refunded
            $table->string('status', 50)->default('received'); // draft, received, inspected, restocked, rejected
            $table->string('reason', 255);
            $table->text('notes')->nullable();
            $table->boolean('is_restocked')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
            $table->foreign('sales_invoice_id')->references('id')->on('sales_invoices')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['tenant_id', 'return_number']);
        });

        // 2. بنود مرتجع المبيعات (Sales Return Items)
        Schema::create('sales_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sales_return_id')->index();
            $table->uuid('variant_id')->index();
            $table->uuid('inventory_item_id')->nullable()->index();
            $table->decimal('quantity', 12, 4);
            $table->decimal('unit_price', 14, 4);
            $table->decimal('total_price', 14, 4);
            $table->string('condition', 50)->default('good'); // good, defective, scrap
            $table->string('action_taken', 50)->default('restock'); // restock, repair, discard
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_return_id')->references('id')->on('sales_returns')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('restrict');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
        });

        // 3. أذون تسليم وشحن المبيعات والكراتين (Sales Delivery Notes & Shipping)
        Schema::create('sales_delivery_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('delivery_number', 50);
            $table->uuid('sales_order_id')->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->uuid('warehouse_id')->index();
            $table->date('delivery_date');
            $table->string('status', 50)->default('packed'); // preparing, packed, dispatched, delivered, cancelled
            $table->string('shipping_carrier', 100)->nullable();
            $table->string('tracking_number', 100)->nullable();
            $table->integer('total_cartons')->default(1);
            $table->decimal('total_pieces', 12, 4)->default(0);
            $table->string('recipient_name', 255)->nullable();
            $table->text('proof_of_delivery')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('restrict');
            $table->unique(['tenant_id', 'delivery_number']);
        });

        // 4. محتويات الكراتين وبيانات التعبئة (Carton Packing Details)
        Schema::create('sales_cartons', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('sales_delivery_note_id')->index();
            $table->string('carton_number', 50);
            $table->decimal('gross_weight_kg', 8, 2)->default(0);
            $table->string('dimensions', 100)->nullable();
            $table->integer('pieces_count')->default(0);
            $table->text('packing_details')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('sales_delivery_note_id')->references('id')->on('sales_delivery_notes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales_cartons');
        Schema::dropIfExists('sales_delivery_notes');
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
    }
};

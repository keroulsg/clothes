<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 10: Multi-Tenant E-Commerce Storefront, Product Showcase, Orders & Stock Integration
     */
    public function up(): void
    {
        // 1. إعدادات متجر المصنع (Tenant Store Settings)
        Schema::create('tenant_store_settings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->unique();
            $table->string('store_name', 255);
            $table->string('subdomain', 100)->nullable();
            $table->boolean('is_store_enabled')->default(true);
            $table->boolean('allow_cod')->default(true);
            $table->boolean('allow_card_payment')->default(false);
            $table->string('currency', 10)->default('EGP');
            $table->string('banner_title', 255)->nullable();
            $table->text('banner_subtitle')->nullable();
            $table->string('contact_whatsapp', 50)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 2. طلبات المتجر الإلكتروني (Store Orders)
        Schema::create('store_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('order_number', 50);
            $table->string('customer_name', 255);
            $table->string('customer_phone', 50);
            $table->text('shipping_address');
            $table->string('city', 100);
            $table->string('payment_method', 50)->default('cod'); // cod, card_mock
            $table->string('status', 50)->default('new'); // new, confirmed, preparing, shipped, delivered, cancelled
            $table->decimal('subtotal', 14, 4);
            $table->decimal('shipping_fee', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'order_number']);
        });

        // 3. بنود طلب المتجر (Store Order Items)
        Schema::create('store_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('store_order_id')->index();
            $table->uuid('variant_id')->index();
            $table->string('product_name', 255);
            $table->string('sku', 100);
            $table->integer('quantity');
            $table->decimal('unit_price', 14, 4);
            $table->decimal('total_price', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('store_order_id')->references('id')->on('store_orders')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('store_order_items');
        Schema::dropIfExists('store_orders');
        Schema::dropIfExists('tenant_store_settings');
    }
};

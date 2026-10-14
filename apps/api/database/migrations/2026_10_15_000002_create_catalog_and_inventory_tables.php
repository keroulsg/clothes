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
        // 1. وحدات القياس (Units of Measure)
        Schema::create('units_of_measure', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('name', 100); // متر, كيلوجرام, قطعة, دستة, ياردة, بكرة
            $table->string('symbol', 30); // m, kg, pcs, doz, yd, spool
            $table->string('category', 50); // length, weight, count, volume
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'symbol']);
        });

        // 2. الألوان (Colors)
        Schema::create('colors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 100);
            $table->string('color_code', 20)->default('#000000'); // HEX
            $table->string('pantone_ref', 50)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'name']);
        });

        // 3. المقاسات (Sizes)
        Schema::create('sizes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 100); // 0-3M, 3-6M, 1-2Y, 2-4Y, 4-6Y
            $table->string('category', 50)->default('kids'); // infant, toddler, kids, adult
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'name', 'category']);
        });

        // 4. موديلات الملابس (Garment Models)
        Schema::create('garment_models', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50); // MOD-KID-081
            $table->string('name', 255);
            $table->string('category', 100); // طقم أولادي, سالوبيت, فستان, بيجاما
            $table->string('season', 50)->nullable(); // صيف 2026, شتاء 2026
            $table->text('description')->nullable();
            $table->decimal('target_cost', 14, 4)->default(0);
            $table->decimal('wholesale_price', 14, 4)->default(0);
            $table->decimal('retail_price', 14, 4)->default(0);
            $table->json('technical_specs')->nullable(); // GSM, width, fiber composition
            $table->string('status', 30)->default('active'); // draft, active, discontinued
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 5. متغيرات المنتجات التامة (Product Variants)
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('garment_model_id')->index();
            $table->uuid('size_id')->index();
            $table->uuid('color_id')->index();
            $table->string('sku', 100);
            $table->string('barcode', 100);
            $table->decimal('wholesale_price', 14, 4)->nullable();
            $table->decimal('retail_price', 14, 4)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('cascade');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('restrict');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('restrict');

            $table->unique(['tenant_id', 'sku']);
            $table->unique(['tenant_id', 'barcode']);
            $table->unique(['tenant_id', 'garment_model_id', 'size_id', 'color_id'], 'variant_unique_per_model');
        });

        // 6. المخازن (Warehouses)
        Schema::create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('branch_id')->nullable()->index();
            $table->string('name', 255);
            $table->string('code', 50);
            $table->string('type', 50); // fabric, accessories, wip, finished_goods, returns, customer_deposits
            $table->boolean('allow_negative_stock')->default(false);
            $table->boolean('is_active')->default(true);
            $table->string('address', 500)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->unique(['tenant_id', 'code']);
        });

        // 7. كروت الأصناف المخزنية (Inventory Items)
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('warehouse_id')->index();
            $table->uuid('variant_id')->nullable()->index();
            $table->string('item_type', 50); // fabric_raw, accessory_raw, finished_good, packaging
            $table->string('code', 100);
            $table->string('name', 255);
            $table->string('unit_of_measure', 30); // meter, kg, pcs, spool
            $table->decimal('reorder_level', 12, 4)->default(0);
            $table->decimal('current_balance', 12, 4)->default(0); // دائماً مطابق لدفتر الأستاذ
            $table->decimal('average_cost', 14, 4)->default(0);
            $table->boolean('is_customer_owned')->default(false);
            $table->string('customer_name', 255)->nullable();
            $table->json('technical_specs')->nullable(); // GSM, width_meters, conversion factors
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->unique(['tenant_id', 'warehouse_id', 'code']);
        });

        // 8. دفتر حركات المخزون غير القابل للتعديل العشوائي (Immutable Stock Ledger)
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('inventory_item_id')->index();
            $table->uuid('warehouse_id')->index();
            $table->string('transaction_type', 50); // goods_receipt, material_issuance, transfer_in, transfer_out, adjustment_positive, adjustment_negative
            $table->string('direction', 10); // IN, OUT
            $table->decimal('quantity', 12, 4); // مقدار الحركة الموجب دائماً
            $table->decimal('unit_cost', 14, 4)->default(0);
            $table->decimal('total_cost', 14, 4)->default(0);
            $table->decimal('balance_before', 12, 4);
            $table->decimal('balance_after', 12, 4);
            $table->string('reference_type', 100)->nullable(); // purchase_order, cutting_order, stock_transfer, stock_count
            $table->string('reference_id', 100)->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->text('notes')->nullable();
            $table->string('batch_number', 100)->nullable();
            $table->string('roll_number', 100)->nullable();
            $table->json('technical_notes')->nullable(); // بيانات التحويل: أمتار, كجم, GSM, عرض القماش
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('cascade');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });

        // 9. تحويلات المخازن (Stock Transfers)
        Schema::create('stock_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('transfer_number', 100);
            $table->uuid('source_warehouse_id')->index();
            $table->uuid('destination_warehouse_id')->index();
            $table->string('status', 50)->default('draft'); // draft, dispatched, received, cancelled
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('received_by')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('source_warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('destination_warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->unique(['tenant_id', 'transfer_number']);
        });

        // 10. خامات العملاء أمانات التشغيل للغير (Customer Materials Deposits)
        Schema::create('customer_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('customer_name', 255);
            $table->string('fabric_name', 255);
            $table->string('fabric_code', 100);
            $table->decimal('gsm', 8, 2); // وزن المتر المربع
            $table->decimal('usable_width_meters', 6, 3); // عرض القماش الفعلي بالمتر
            $table->decimal('received_meters', 12, 4)->default(0);
            $table->decimal('consumed_meters', 12, 4)->default(0);
            $table->decimal('waste_meters', 12, 4)->default(0);
            $table->decimal('returned_meters', 12, 4)->default(0);
            $table->decimal('remaining_meters', 12, 4)->default(0);
            $table->uuid('warehouse_id')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->unique(['tenant_id', 'customer_name', 'fabric_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_materials');
        Schema::dropIfExists('stock_transfers');
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('garment_models');
        Schema::dropIfExists('sizes');
        Schema::dropIfExists('colors');
        Schema::dropIfExists('units_of_measure');
    }
};

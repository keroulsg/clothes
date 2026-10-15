<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 6: Subcontracting, Job-Work, Contract Cutting, CMT Services & Custody Material Tracking
     */
    public function up(): void
    {
        // 1. العملاء (Customers Master)
        Schema::create('customers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->string('contact_person', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('tax_id', 100)->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 2. أوامر التشغيل للغير والـ CMT (Job Orders / Subcontracting Orders)
        Schema::create('job_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('order_number', 50);
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->string('service_type', 50); // contract_cutting, cmt
            $table->uuid('garment_model_id')->nullable()->index();
            $table->uuid('production_order_id')->nullable()->index();
            $table->string('fabric_source', 50)->default('customer_supplied'); // customer_supplied, factory_supplied, mixed
            $table->string('trims_responsibility', 50)->default('customer_supplied'); // customer_supplied, factory_supplied, mixed
            $table->string('status', 50)->default('draft'); // draft, confirmed, materials_received, in_progress, quality_review, ready_for_delivery, partially_delivered, completed, cancelled
            $table->string('pricing_basis', 50)->default('per_piece'); // per_piece, per_meter, per_operation, per_bundle
            $table->decimal('unit_rate', 14, 4)->default(0);
            $table->integer('total_target_quantity')->default(0);
            $table->decimal('total_received_meters', 12, 4)->default(0);
            $table->integer('total_cut_quantity')->default(0);
            $table->integer('total_accepted_quantity')->default(0);
            $table->integer('total_rejected_quantity')->default(0);
            $table->integer('total_rework_quantity')->default(0);
            $table->integer('total_delivered_quantity')->default(0);
            $table->date('planned_start_date')->nullable();
            $table->date('target_delivery_date')->nullable();
            $table->date('actual_start_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('set null');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('set null');
            $table->unique(['tenant_id', 'order_number']);
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        // 3. بنود أمر التشغيل للغير وتفصيل المقاسات والألوان (Job Order Items)
        Schema::create('job_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('job_order_id')->index();
            $table->uuid('product_variant_id')->nullable()->index();
            $table->uuid('color_id')->nullable()->index();
            $table->string('color_name', 100)->nullable();
            $table->uuid('size_id')->nullable()->index();
            $table->string('size_name', 100)->nullable();
            $table->integer('target_quantity')->default(0);
            $table->integer('cut_quantity')->default(0);
            $table->integer('completed_quantity')->default(0);
            $table->integer('delivered_quantity')->default(0);
            $table->decimal('unit_rate', 14, 4)->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('cascade');
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('set null');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('set null');
        });

        // 4. محاضر استلام أمانات خامات العملاء (Customer Material Receipts)
        Schema::create('customer_material_receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('receipt_number', 50);
            $table->uuid('job_order_id')->nullable()->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->uuid('customer_material_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->uuid('warehouse_id')->index();
            $table->string('fabric_name', 255);
            $table->string('fabric_code', 100)->nullable();
            $table->decimal('received_meters', 12, 4);
            $table->decimal('received_weight_kg', 12, 4)->nullable();
            $table->decimal('usable_width_meters', 6, 3)->default(1.600);
            $table->decimal('gsm', 8, 2)->default(180.00);
            $table->integer('rolls_count')->default(1);
            $table->string('condition_status', 50)->default('accepted'); // accepted, damaged_rolls, conditional_pass
            $table->string('inspector_name', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('set null');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('customer_material_id')->references('id')->on('customer_materials')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->unique(['tenant_id', 'receipt_number']);
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        // 5. عمليات التشغيل الخارجي (External Processing Operations - Embroidery, Printing, Washing, etc.)
        Schema::create('external_operations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('operation_number', 50);
            $table->uuid('job_order_id')->nullable()->index();
            $table->uuid('production_order_id')->nullable()->index();
            $table->uuid('cutting_bundle_id')->nullable()->index();
            $table->string('subcontractor_name', 255);
            $table->string('operation_type', 50); // embroidery, printing, washing, finishing, dyeing, overlocking, other
            $table->integer('sent_quantity');
            $table->integer('received_accepted_quantity')->default(0);
            $table->integer('received_rejected_quantity')->default(0);
            $table->integer('scrap_quantity')->default(0);
            $table->decimal('unit_rate', 14, 4)->default(0);
            $table->decimal('total_cost', 14, 4)->default(0);
            $table->string('status', 50)->default('dispatched'); // dispatched, partially_returned, completed, cancelled
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('set null');
            $table->foreign('cutting_bundle_id')->references('id')->on('cutting_bundles')->onDelete('set null');
            $table->unique(['tenant_id', 'operation_number']);
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        // 6. أذون تسليم التشغيل للغير (Job Delivery Notes)
        Schema::create('job_delivery_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('delivery_number', 50);
            $table->uuid('job_order_id')->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->date('delivery_date');
            $table->string('status', 50)->default('draft'); // draft, confirmed, delivered, cancelled
            $table->integer('total_delivered_pieces')->default(0);
            $table->decimal('returned_unused_fabric_meters', 12, 4)->default(0);
            $table->decimal('scrap_fabric_meters', 12, 4)->default(0);
            $table->string('delivered_by', 255)->nullable();
            $table->string('received_by_customer', 255)->nullable();
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->unique(['tenant_id', 'delivery_number']);
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        // 7. تفاصيل بنود إذن التسليم (Job Delivery Items)
        Schema::create('job_delivery_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('job_delivery_note_id')->index();
            $table->uuid('job_order_item_id')->nullable()->index();
            $table->uuid('product_variant_id')->nullable()->index();
            $table->uuid('color_id')->nullable()->index();
            $table->uuid('size_id')->nullable()->index();
            $table->integer('delivered_quantity')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_delivery_note_id')->references('id')->on('job_delivery_notes')->onDelete('cascade');
            $table->foreign('job_order_item_id')->references('id')->on('job_order_items')->onDelete('set null');
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('set null');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('set null');
        });

        // 8. فواتير خدمات التشغيل للغير (Job Service Invoices)
        Schema::create('job_invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('invoice_number', 50);
            $table->uuid('job_order_id')->index();
            $table->uuid('customer_id')->nullable()->index();
            $table->string('customer_name', 255);
            $table->date('invoice_date');
            $table->date('due_date')->nullable();
            $table->string('status', 50)->default('draft'); // draft, issued, partially_paid, paid, voided
            $table->decimal('service_amount', 14, 4)->default(0);
            $table->decimal('additional_charges', 14, 4)->default(0);
            $table->decimal('deductions', 14, 4)->default(0);
            $table->decimal('tax_amount', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->decimal('paid_amount', 14, 4)->default(0);
            $table->text('notes')->nullable();
            $table->string('idempotency_key', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->unique(['tenant_id', 'invoice_number']);
            $table->unique(['tenant_id', 'idempotency_key']);
        });

        // 9. بنود فاتورة خدمات التشغيل للغير (Job Invoice Items)
        Schema::create('job_invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('job_invoice_id')->index();
            $table->string('description', 255);
            $table->string('item_type', 50); // service_charge, extra_operation, trim_charge, deduction, tax
            $table->decimal('quantity', 12, 4)->default(1);
            $table->decimal('unit_rate', 14, 4)->default(0);
            $table->decimal('total_amount', 14, 4)->default(0);
            $table->string('reason', 255)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('job_invoice_id')->references('id')->on('job_invoices')->onDelete('cascade');
        });

        // 10. تمديد الجداول القائمة بروابط أمان آمنة
        Schema::table('cutting_orders', function (Blueprint $table) {
            $table->uuid('job_order_id')->nullable()->index()->after('production_order_id');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('set null');
        });

        Schema::table('customer_materials', function (Blueprint $table) {
            $table->uuid('customer_id')->nullable()->index()->after('tenant_id');
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_materials', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn('customer_id');
        });

        Schema::table('cutting_orders', function (Blueprint $table) {
            $table->dropForeign(['job_order_id']);
            $table->dropColumn('job_order_id');
        });

        Schema::dropIfExists('job_invoice_items');
        Schema::dropIfExists('job_invoices');
        Schema::dropIfExists('job_delivery_items');
        Schema::dropIfExists('job_delivery_notes');
        Schema::dropIfExists('external_operations');
        Schema::dropIfExists('customer_material_receipts');
        Schema::dropIfExists('job_order_items');
        Schema::dropIfExists('job_orders');
        Schema::dropIfExists('customers');
    }
};

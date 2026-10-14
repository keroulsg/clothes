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
        // 1. الباترونات الهندسية (Patterns & Marker Master)
        Schema::create('patterns', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('garment_model_id')->index();
            $table->string('pattern_code', 50);
            $table->string('pattern_name', 255);
            $table->string('version', 20)->default('1.0');
            $table->string('sample_size', 50)->nullable();
            $table->decimal('usable_width_meters', 8, 4)->default(1.60);
            $table->string('grain_direction', 50)->default('straight'); // straight, cross, bias
            $table->decimal('relaxation_hours_required', 6, 2)->default(24.0); // زمن راحة القماش بالساعات
            $table->decimal('estimated_shrinkage_percent', 5, 2)->default(3.0); // انكماش %
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('cascade');
            $table->unique(['tenant_id', 'pattern_code']);
        });

        // 2. قوائم الخامات والمكونات (Bill of Materials - BOM)
        Schema::create('bill_of_materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('garment_model_id')->index();
            $table->string('version', 20)->default('1.0');
            $table->string('bom_code', 50);
            $table->string('name', 255);
            $table->string('status', 30)->default('draft'); // draft, approved, archived
            $table->decimal('total_estimated_cost_per_piece', 12, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('cascade');
            $table->unique(['tenant_id', 'bom_code']);
        });

        // 3. بنود قائمة الخامات (BOM Items)
        Schema::create('bom_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('bill_of_material_id')->index();
            $table->uuid('inventory_item_id')->index();
            $table->uuid('color_id')->nullable()->index();
            $table->uuid('size_id')->nullable()->index();
            $table->string('component_type', 50)->default('fabric'); // fabric, lining, thread, button, zipper, elastic, label, packaging, other
            $table->decimal('consumption_per_unit', 10, 4); // استهلاك القطعة الواحدة
            $table->string('unit_of_measure', 30)->default('m');
            $table->decimal('waste_tolerance_percent', 5, 2)->default(5.0); // نسبة الهالك المسموح بها %
            $table->decimal('unit_cost', 10, 4)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('bill_of_material_id')->references('id')->on('bill_of_materials')->onDelete('cascade');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('cascade');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('set null');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('set null');
        });

        // 4. مراحل الإنتاج المعرفة للنظام (Production Stages)
        Schema::create('production_stages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('stage_code', 50); // cutting, assembly, sewing, finishing, ironing, packing
            $table->string('name', 100);
            $table->integer('order_sequence')->default(1);
            $table->boolean('requires_qc')->default(false);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'stage_code']);
        });

        // 5. أوامر الإنتاج والتشغيل (Production Orders)
        Schema::create('production_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('order_number', 50);
            $table->uuid('garment_model_id')->index();
            $table->uuid('bill_of_material_id')->nullable()->index();
            $table->uuid('branch_id')->nullable()->index();
            $table->date('planned_start_date');
            $table->date('target_delivery_date');
            $table->date('actual_start_date')->nullable();
            $table->date('actual_completion_date')->nullable();
            $table->integer('total_planned_quantity')->default(0);
            $table->integer('total_cut_quantity')->default(0);
            $table->integer('total_completed_quantity')->default(0);
            $table->integer('total_scrapped_quantity')->default(0);
            $table->integer('total_rework_quantity')->default(0);
            $table->string('status', 30)->default('draft'); // draft, approved, cutting, in_progress, completed, cancelled
            $table->string('priority', 20)->default('normal'); // normal, high, urgent
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('cascade');
            $table->foreign('bill_of_material_id')->references('id')->on('bill_of_materials')->onDelete('set null');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->unique(['tenant_id', 'order_number']);
        });

        // 6. تفصيل كميات ومقاسات أمر الإنتاج (Production Order Items)
        Schema::create('production_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('production_order_id')->index();
            $table->uuid('product_variant_id')->nullable()->index();
            $table->uuid('color_id')->index();
            $table->uuid('size_id')->index();
            $table->integer('planned_quantity')->default(0);
            $table->integer('cut_quantity')->default(0);
            $table->integer('completed_quantity')->default(0);
            $table->integer('rejected_quantity')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('cascade');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('cascade');
        });

        // 7. صالة القص وأوامر الفرش والقص (Cutting & Lay Orders)
        Schema::create('cutting_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('cutting_order_number', 50);
            $table->uuid('production_order_id')->index();
            $table->uuid('pattern_id')->nullable()->index();
            $table->string('table_number', 50)->default('Table-1');
            $table->uuid('fabric_inventory_item_id')->nullable()->index();
            $table->string('fabric_source', 30)->default('factory_owned'); // factory_owned, customer_deposit
            $table->uuid('customer_material_id')->nullable()->index();
            $table->uuid('warehouse_id')->index();
            $table->uuid('fabric_color_id')->nullable()->index();
            $table->string('marker_name', 100)->nullable();
            $table->decimal('usable_width_meters', 8, 4)->default(1.60);
            $table->decimal('lay_length_meters', 10, 4); // طول الفرشة
            $table->integer('layers_count'); // عدد الطبقات / الراقات
            $table->decimal('marker_efficiency_percent', 5, 2)->default(85.0);
            $table->decimal('actual_fabric_meters_used', 10, 4)->default(0);
            $table->decimal('actual_fabric_kg_used', 10, 4)->default(0);
            $table->decimal('theoretical_fabric_meters', 10, 4)->default(0);
            $table->decimal('end_loss_meters', 8, 4)->default(0); // عادم أطراف الفرشة
            $table->decimal('remnant_meters', 8, 4)->default(0); // عوادم وبواقي
            $table->decimal('fabric_relaxation_hours_actual', 6, 2)->default(0); // قياس راحة القماش الفعلي
            $table->decimal('measured_shrinkage_percent', 5, 2)->default(0); // انكماش مقاس فعلي
            $table->integer('total_expected_pieces')->default(0);
            $table->integer('total_cut_pieces')->default(0);
            $table->string('status', 30)->default('planned'); // planned, spreading, cut_completed
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
            $table->foreign('pattern_id')->references('id')->on('patterns')->onDelete('set null');
            $table->foreign('fabric_inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
            $table->foreign('customer_material_id')->references('id')->on('customer_materials')->onDelete('set null');
            $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
            $table->foreign('fabric_color_id')->references('id')->on('colors')->onDelete('set null');
            $table->unique(['tenant_id', 'cutting_order_number']);
        });

        // 8. بطاقات الحزم والباركود (Bundle Cards)
        Schema::create('cutting_bundles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('bundle_code', 60); // BND-202610-XXXX
            $table->uuid('cutting_order_id')->index();
            $table->uuid('production_order_id')->index();
            $table->uuid('product_variant_id')->nullable()->index();
            $table->integer('bundle_number');
            $table->uuid('color_id')->index();
            $table->uuid('size_id')->index();
            $table->integer('quantity');
            $table->string('current_stage_code', 50)->default('cutting');
            $table->string('status', 30)->default('active'); // active, held_for_qc, rework, completed, scrapped
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('cutting_order_id')->references('id')->on('cutting_orders')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
            $table->foreign('product_variant_id')->references('id')->on('product_variants')->onDelete('set null');
            $table->foreign('color_id')->references('id')->on('colors')->onDelete('cascade');
            $table->foreign('size_id')->references('id')->on('sizes')->onDelete('cascade');
            $table->unique(['tenant_id', 'bundle_code']);
        });

        // 9. سجل حركة الحزم بين المراحل والعمال (Bundle Stage Tracking Logs)
        Schema::create('bundle_stage_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('cutting_bundle_id')->index();
            $table->uuid('production_stage_id')->index();
            $table->string('operation_type', 30)->default('transfer'); // start, transfer, complete
            $table->string('operator_name', 150)->nullable();
            $table->string('work_line', 100)->nullable();
            $table->integer('input_quantity')->default(0);
            $table->integer('output_accepted_quantity')->default(0);
            $table->integer('output_rejected_quantity')->default(0);
            $table->integer('scrap_quantity')->default(0);
            $table->timestamp('logged_at');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('cutting_bundle_id')->references('id')->on('cutting_bundles')->onDelete('cascade');
            $table->foreign('production_stage_id')->references('id')->on('production_stages')->onDelete('cascade');
        });

        // 10. فحص الجودة ونقاط التفتيش (Quality Inspections)
        Schema::create('quality_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('inspection_number', 50);
            $table->uuid('production_order_id')->index();
            $table->uuid('cutting_bundle_id')->nullable()->index();
            $table->uuid('production_stage_id')->nullable()->index();
            $table->string('inspector_name', 150);
            $table->string('inspection_type', 50)->default('inline'); // inline, end_of_line, final_audit
            $table->integer('inspected_quantity')->default(0);
            $table->integer('passed_quantity')->default(0);
            $table->integer('rejected_quantity')->default(0);
            $table->integer('rework_quantity')->default(0);
            $table->string('decision', 30)->default('passed'); // passed, rework_required, rejected
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
            $table->foreign('cutting_bundle_id')->references('id')->on('cutting_bundles')->onDelete('set null');
            $table->foreign('production_stage_id')->references('id')->on('production_stages')->onDelete('set null');
            $table->unique(['tenant_id', 'inspection_number']);
        });

        // 11. سجل تفاصيل عيوب الجودة (Quality Defects Log)
        Schema::create('quality_defects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('quality_inspection_id')->index();
            $table->string('defect_type', 100); // skip_stitch, fabric_flaw, size_measurement, stain, broken_needle, color_shading
            $table->string('severity', 30)->default('minor'); // minor, major, critical
            $table->integer('quantity')->default(1);
            $table->string('corrective_action', 150)->nullable(); // rework_stitching, scrap_piece, wash_stain, concession
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('quality_inspection_id')->references('id')->on('quality_inspections')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_defects');
        Schema::dropIfExists('quality_inspections');
        Schema::dropIfExists('bundle_stage_logs');
        Schema::dropIfExists('cutting_bundles');
        Schema::dropIfExists('cutting_orders');
        Schema::dropIfExists('production_order_items');
        Schema::dropIfExists('production_orders');
        Schema::dropIfExists('production_stages');
        Schema::dropIfExists('bom_items');
        Schema::dropIfExists('bill_of_materials');
        Schema::dropIfExists('patterns');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 12: Machines, Assets, Preventive Schedules, Maintenance Work Orders, and Downtime
     */
    public function up(): void
    {
        // 1. سجل الماكينات ومعدات المصنع (Machines & Asset Register)
        Schema::create('machines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('branch_id')->nullable()->index();
            $table->string('machine_code', 50);
            $table->string('name', 255);
            $table->string('model_number', 100)->nullable();
            $table->string('serial_number', 100)->nullable();
            $table->string('machine_type', 50); // sewing, cutting, ironing, overlock, buttonhole, boiler, compressor, other
            $table->string('location', 100)->nullable(); // e.g. Line 1, Cutting Floor, Utility Room
            $table->date('purchase_date')->nullable();
            $table->date('warranty_expiry_date')->nullable();
            $table->string('status', 50)->default('operational'); // operational, under_maintenance, breakdown, retired
            $table->integer('maintenance_interval_days')->default(30);
            $table->date('last_maintenance_date')->nullable();
            $table->date('next_maintenance_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
            $table->unique(['tenant_id', 'machine_code']);
        });

        // 2. أوامر الشغل وبلاغات الأعطال والصيانة الدورية (Maintenance Work Orders)
        Schema::create('maintenance_work_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('machine_id')->index();
            $table->string('order_number', 50);
            $table->string('work_type', 50)->default('preventive'); // preventive, breakdown, emergency, calibration
            $table->string('priority', 50)->default('medium'); // low, medium, high, critical
            $table->string('status', 50)->default('scheduled'); // scheduled, in_progress, completed, cancelled
            $table->text('issue_description');
            $table->text('resolution_notes')->nullable();
            $table->string('reported_by', 255)->nullable();
            $table->string('technician_name', 255)->nullable();
            $table->decimal('downtime_hours', 8, 2)->default(0);
            $table->decimal('spare_parts_cost', 14, 4)->default(0);
            $table->decimal('labor_cost', 14, 4)->default(0);
            $table->decimal('total_cost', 14, 4)->default(0);
            $table->date('scheduled_date')->nullable();
            $table->dateTime('start_time')->nullable();
            $table->dateTime('completion_time')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('machine_id')->references('id')->on('machines')->onDelete('cascade');
            $table->unique(['tenant_id', 'order_number']);
        });

        // 3. قطع الغيار والمستهلكات المستخدمة في الصيانة (Maintenance Spare Parts)
        Schema::create('maintenance_spare_parts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('work_order_id')->index();
            $table->uuid('inventory_item_id')->nullable()->index();
            $table->string('part_name', 255);
            $table->string('part_number', 100)->nullable();
            $table->decimal('quantity', 12, 4);
            $table->decimal('unit_cost', 14, 4);
            $table->decimal('total_cost', 14, 4);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('work_order_id')->references('id')->on('maintenance_work_orders')->onDelete('cascade');
            $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenance_spare_parts');
        Schema::dropIfExists('maintenance_work_orders');
        Schema::dropIfExists('machines');
    }
};

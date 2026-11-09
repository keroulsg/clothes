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
        // 1. تحديث جدول الفروع
        Schema::table('branches', function (Blueprint $table) {
            if (!Schema::hasColumn('branches', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_main');
            }
            if (!Schema::hasColumn('branches', 'manager_name')) {
                $table->string('manager_name', 255)->nullable()->after('address');
            }
        });

        // 2. تحديث جدول المخازن
        Schema::table('warehouses', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouses', 'manager_name')) {
                $table->string('manager_name', 255)->nullable()->after('address');
            }
        });

        // 3. تحديث جدول وحدات القياس
        Schema::table('units_of_measure', function (Blueprint $table) {
            if (!Schema::hasColumn('units_of_measure', 'base_unit')) {
                $table->string('base_unit', 30)->nullable()->after('category');
            }
            if (!Schema::hasColumn('units_of_measure', 'conversion_factor')) {
                $table->decimal('conversion_factor', 14, 6)->default(1.0)->after('base_unit');
            }
            if (!Schema::hasColumn('units_of_measure', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('conversion_factor');
            }
        });

        // 4. تحديث جدول أصناف المخزون
        Schema::table('inventory_items', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_items', 'name_en')) {
                $table->string('name_en', 255)->nullable()->after('name');
            }
            if (!Schema::hasColumn('inventory_items', 'barcode')) {
                $table->string('barcode', 100)->nullable()->after('code');
            }
            if (!Schema::hasColumn('inventory_items', 'min_stock_level')) {
                $table->decimal('min_stock_level', 12, 4)->default(0)->after('reorder_level');
            }
            if (!Schema::hasColumn('inventory_items', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_customer_owned');
            }
            if (!Schema::hasColumn('inventory_items', 'description')) {
                $table->text('description')->nullable()->after('technical_specs');
            }
            if (!Schema::hasColumn('inventory_items', 'image_url')) {
                $table->string('image_url', 500)->nullable()->after('description');
            }
        });

        // 5. جدول بنود تحويلات المخازن
        if (!Schema::hasTable('stock_transfer_items')) {
            Schema::create('stock_transfer_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('stock_transfer_id')->index();
                $table->uuid('inventory_item_id')->index();
                $table->decimal('quantity', 12, 4);
                $table->decimal('received_quantity', 12, 4)->default(0);
                $table->decimal('unit_cost', 14, 4)->default(0);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('stock_transfer_id')->references('id')->on('stock_transfers')->onDelete('cascade');
                $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('restrict');
            });
        }

        // 6. جلسات الجرد الفعلي للمخازن (Physical Stock Counts)
        if (!Schema::hasTable('stock_counts')) {
            Schema::create('stock_counts', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('count_number', 100);
                $table->uuid('warehouse_id')->index();
                $table->string('status', 50)->default('draft'); // draft, in_progress, completed, approved, cancelled
                $table->date('count_date');
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable()->index();
                $table->unsignedBigInteger('approved_by')->nullable()->index();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('warehouse_id')->references('id')->on('warehouses')->onDelete('cascade');
                $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                $table->unique(['tenant_id', 'count_number']);
            });
        }

        // 7. بنود جلسة الجرد ومقارنة الفعلي بالدفتري
        if (!Schema::hasTable('stock_count_items')) {
            Schema::create('stock_count_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('stock_count_id')->index();
                $table->uuid('inventory_item_id')->index();
                $table->decimal('system_quantity', 12, 4);
                $table->decimal('physical_quantity', 12, 4);
                $table->decimal('difference_quantity', 12, 4);
                $table->decimal('unit_cost', 14, 4)->default(0);
                $table->string('adjustment_status', 50)->default('pending'); // pending, adjusted, rejected
                $table->string('notes', 255)->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('stock_count_id')->references('id')->on('stock_counts')->onDelete('cascade');
                $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('restrict');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_count_items');
        Schema::dropIfExists('stock_counts');
        Schema::dropIfExists('stock_transfer_items');

        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn(['name_en', 'barcode', 'min_stock_level', 'is_active', 'description', 'image_url']);
        });

        Schema::table('units_of_measure', function (Blueprint $table) {
            $table->dropColumn(['base_unit', 'conversion_factor', 'is_active']);
        });

        Schema::table('warehouses', function (Blueprint $table) {
            $table->dropColumn(['manager_name']);
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'manager_name']);
        });
    }
};


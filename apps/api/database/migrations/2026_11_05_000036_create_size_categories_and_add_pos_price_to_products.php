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
        // 1. تصنيفات المقاسات القابلة للتخصيص لكل مصنع (Size Categories)
        if (!Schema::hasTable('size_categories')) {
            Schema::create('size_categories', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('name', 100);
                $table->text('description')->nullable();
                $table->integer('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->unique(['tenant_id', 'name']);
            });
        }

        // 2. تحديث جدول المقاسات sizes ليرتبط بتصنيف المقاس وحالة التفعيل
        if (Schema::hasTable('sizes')) {
            Schema::table('sizes', function (Blueprint $table) {
                if (!Schema::hasColumn('sizes', 'size_category_id')) {
                    $table->uuid('size_category_id')->nullable()->after('category')->index();
                    $table->foreign('size_category_id')->references('id')->on('size_categories')->onDelete('set null');
                }
                if (!Schema::hasColumn('sizes', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('sort_order');
                }
            });
        }

        // 3. إضافة سعر البيع لنقاط البيع (POS Price) وإتاحة المنتج في نقاط البيع
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (!Schema::hasColumn('products', 'pos_price')) {
                    $table->decimal('pos_price', 14, 4)->nullable()->after('selling_price');
                }
                if (!Schema::hasColumn('products', 'is_pos_available')) {
                    $table->boolean('is_pos_available')->default(true)->after('stock_visibility');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                if (Schema::hasColumn('products', 'is_pos_available')) {
                    $table->dropColumn('is_pos_available');
                }
                if (Schema::hasColumn('products', 'pos_price')) {
                    $table->dropColumn('pos_price');
                }
            });
        }

        if (Schema::hasTable('sizes')) {
            Schema::table('sizes', function (Blueprint $table) {
                if (Schema::hasColumn('sizes', 'is_active')) {
                    $table->dropColumn('is_active');
                }
                if (Schema::hasColumn('sizes', 'size_category_id')) {
                    $table->dropForeign(['size_category_id']);
                    $table->dropColumn('size_category_id');
                }
            });
        }

        Schema::dropIfExists('size_categories');
    }
};


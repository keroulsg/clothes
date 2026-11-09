<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. تصنيفات الملابس المستقلة لكل مصنع (Clothing Categories)
        if (!Schema::hasTable('clothing_categories')) {
            Schema::create('clothing_categories', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('name_ar', 150);
                $table->string('name_en', 150)->nullable();
                $table->string('code', 50)->nullable();
                $table->uuid('parent_id')->nullable()->index();
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('parent_id')->references('id')->on('clothing_categories')->onDelete('set null');
                $table->unique(['tenant_id', 'name_ar']);
            });
        }

        // 2. إدارة المنتجات التجارية للبيع والمتاجر (Products - WooCommerce-level catalog)
        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('category_id')->nullable()->index();
                $table->uuid('garment_model_id')->nullable()->index();
                $table->string('name', 255);
                $table->string('name_en', 255)->nullable();
                $table->string('slug', 255)->nullable();
                $table->text('description')->nullable();
                $table->string('main_image', 500)->nullable();
                $table->json('gallery')->nullable();
                $table->decimal('base_cost', 14, 4)->default(0);
                $table->decimal('selling_price', 14, 4)->default(0);
                $table->decimal('wholesale_price', 14, 4)->default(0);
                $table->string('stock_visibility', 50)->default('in_stock'); // in_stock, out_of_stock, on_demand
                $table->string('status', 30)->default('active'); // draft, active, archived
                $table->json('specifications')->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('category_id')->references('id')->on('clothing_categories')->onDelete('set null');
                $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('set null');
            });
        }

        // 3. ربط متغيرات المنتجات بالمنتج التجاري والتصنيف
        if (Schema::hasTable('product_variants') && !Schema::hasColumn('product_variants', 'product_id')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->uuid('product_id')->nullable()->after('garment_model_id')->index();
                $table->foreign('product_id')->references('id')->on('products')->onDelete('set null');
            });
        }

        // 4. ربط موديل التصنيع بشجرة التصنيفات المعتمدة
        if (Schema::hasTable('garment_models') && !Schema::hasColumn('garment_models', 'clothing_category_id')) {
            Schema::table('garment_models', function (Blueprint $table) {
                $table->uuid('clothing_category_id')->nullable()->after('category')->index();
                $table->foreign('clothing_category_id')->references('id')->on('clothing_categories')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('garment_models') && Schema::hasColumn('garment_models', 'clothing_category_id')) {
            Schema::table('garment_models', function (Blueprint $table) {
                $table->dropForeign(['clothing_category_id']);
                $table->dropColumn('clothing_category_id');
            });
        }

        if (Schema::hasTable('product_variants') && Schema::hasColumn('product_variants', 'product_id')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->dropForeign(['product_id']);
                $table->dropColumn('product_id');
            });
        }

        Schema::dropIfExists('products');
        Schema::dropIfExists('clothing_categories');
    }
};


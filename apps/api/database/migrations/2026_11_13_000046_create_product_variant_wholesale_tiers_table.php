<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('product_variant_wholesale_tiers')) {
            Schema::create('product_variant_wholesale_tiers', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('variant_id')->index();
                $table->integer('min_quantity')->default(1);
                $table->integer('max_quantity')->nullable();
                $table->decimal('unit_price', 14, 4);
                $table->boolean('is_active')->default(true);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('cascade');
                $table->index(['tenant_id', 'variant_id', 'is_active'], 'pv_wholesale_tier_lookup');
            });
        }

        if (Schema::hasTable('product_variants') && !Schema::hasColumn('product_variants', 'moq')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->integer('moq')->default(1)->after('wholesale_price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('product_variants') && Schema::hasColumn('product_variants', 'moq')) {
            Schema::table('product_variants', function (Blueprint $table) {
                $table->dropColumn('moq');
            });
        }
        Schema::dropIfExists('product_variant_wholesale_tiers');
    }
};

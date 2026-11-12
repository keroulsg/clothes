<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->string('theme_id', 50)->default('fashion_boutique')->change();
        });
    }

    public function down(): void
    {
        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->string('theme_id', 50)->default('modern_fashion')->change();
        });
    }
};

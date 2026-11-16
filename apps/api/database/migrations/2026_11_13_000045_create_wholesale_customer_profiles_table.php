<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('wholesale_customer_profiles')) {
            Schema::create('wholesale_customer_profiles', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('customer_id')->unique();
                $table->string('company_name', 255);
                $table->string('business_type', 100)->default('retailer');
                $table->string('contact_person', 255);
                $table->string('phone', 50)->index();
                $table->string('email', 255)->index();
                $table->string('tax_id', 100)->nullable();
                $table->string('commercial_registry', 100)->nullable();
                $table->string('city', 100)->nullable();
                $table->text('shipping_address')->nullable();
                $table->string('password_hash', 255);
                $table->string('status', 50)->default('pending'); // pending, approved, rejected, suspended
                $table->text('rejection_reason')->nullable();
                $table->text('suspension_reason')->nullable();
                $table->uuid('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->timestamp('suspended_at')->nullable();
                $table->text('notes')->nullable();
                $table->string('auth_token', 255)->nullable()->index();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('customer_id')->references('id')->on('customers')->onDelete('cascade');
                $table->unique(['tenant_id', 'phone']);
                $table->unique(['tenant_id', 'email']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_customer_profiles');
    }
};

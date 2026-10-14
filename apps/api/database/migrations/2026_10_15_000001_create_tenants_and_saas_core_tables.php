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
        // 1. جدول المستأجرين / المصانع المشتركة
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique();
            $table->string('name', 255);
            $table->string('subdomain', 100)->unique()->nullable();
            $table->string('custom_domain', 255)->unique()->nullable();
            $table->string('status', 30)->default('active'); // active, suspended, past_due, trial
            $table->string('plan_tier', 50)->default('professional'); // starter, professional, enterprise
            $table->string('currency', 10)->default('EGP');
            $table->string('timezone', 50)->default('Africa/Cairo');
            $table->json('settings')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // 2. تحديث جدول المستخدمين ليرتبط بالشركة
        Schema::table('users', function (Blueprint $table) {
            $table->uuid('tenant_id')->nullable()->after('id')->index();
            $table->string('phone', 50)->nullable()->after('email');
            $table->string('role', 50)->default('company_owner')->after('phone'); // platform_admin, company_owner, production_manager, accountant, sales_rep, worker
            $table->boolean('is_active')->default(true)->after('role');

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 3. جدول فروع الشركة
        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 255);
            $table->string('code', 50);
            $table->string('type', 50)->default('factory'); // factory, outlet, warehouse, head_office
            $table->boolean('is_main')->default(false);
            $table->string('address', 500)->nullable();
            $table->string('phone', 50)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 4. جدول سجل التدقيق الأمني (Audit Logs)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->uuid('tenant_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->string('action', 100); // create, update, delete, post, reverse
            $table->string('auditable_type', 150);
            $table->string('auditable_id', 100);
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('branches');
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['tenant_id', 'phone', 'role', 'is_active']);
        });
        Schema::dropIfExists('tenants');
    }
};

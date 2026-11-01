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
        // 1. باقات الاشتراك لمنصة GarmentOS Cloud
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 50)->unique(); // starter, pro, enterprise
            $table->string('name_ar');
            $table->string('name_en');
            $table->text('description_ar')->nullable();
            $table->text('description_en')->nullable();
            $table->decimal('monthly_price', 14, 4)->default(0);
            $table->decimal('annual_price', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_public')->default(true);
            $table->integer('sort_order')->default(1);
            $table->json('features')->nullable();
            $table->timestamps();
        });

        // 2. محددات وعدادات الاستهلاك لكل باقة (12 Meters Catalog)
        Schema::create('subscription_plan_meters', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('plan_id')->index();
            $table->string('meter_key', 64)->index(); // active_users, cutting_lays, etc.
            $table->integer('quota_limit')->default(0); // 0 = not permitted, 999999 = unlimited
            $table->string('period_type', 32)->default('monthly'); // monthly, current_count, lifetime
            $table->string('limit_type', 16)->default('hard'); // hard (blocks), soft (warns/overage)
            $table->decimal('overage_unit_price', 14, 4)->default(0);
            $table->timestamps();

            $table->foreign('plan_id')->references('id')->on('subscription_plans')->onDelete('cascade');
            $table->unique(['plan_id', 'meter_key']);
        });

        // 3. اشتراكات المصانع (Factory Subscriptions)
        Schema::create('factory_subscriptions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('plan_id')->index();
            $table->string('status', 32)->default('active'); // active, past_due, trialing, canceled, expired
            $table->string('billing_cycle', 16)->default('monthly'); // monthly, annual
            $table->timestamp('starts_at');
            $table->timestamp('current_period_start');
            $table->timestamp('current_period_end');
            $table->timestamp('canceled_at')->nullable();
            $table->boolean('auto_renew')->default(true);
            $table->json('custom_quotas')->nullable(); // Factory-specific negotiated quota overrides
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('plan_id')->references('id')->on('subscription_plans')->onDelete('restrict');
        });

        // 4. سجل أحداث الاستهلاك غير القابل للتعديل (Immutable Usage Events)
        Schema::create('subscription_usage_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('meter_key', 64)->index();
            $table->string('event_type', 32)->default('increment'); // increment, decrement, reset
            $table->integer('quantity')->default(1);
            $table->string('idempotency_key', 128)->unique();
            $table->string('reference_type', 64)->nullable(); // e.g. ProductionOrder, CuttingLay
            $table->string('reference_id', 64)->nullable();
            $table->timestamp('event_timestamp');
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'meter_key', 'event_timestamp'], 'tenant_meter_time_idx');
        });

        // 5. تجميعات الاستهلاك الشهرية (Usage Aggregates)
        Schema::create('subscription_usage_aggregates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('meter_key', 64)->index();
            $table->string('billing_period', 16)->index(); // YYYY-MM
            $table->date('period_start');
            $table->date('period_end');
            $table->integer('total_usage')->default(0);
            $table->integer('peak_count')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'meter_key', 'billing_period'], 'tenant_meter_period_unique');
        });

        // 6. الاستثناءات التشغيلية الطارئة لخطوط الإنتاج (Production Quota Overrides)
        Schema::create('subscription_quota_overrides', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('meter_key', 64)->index();
            $table->integer('temporary_limit');
            $table->text('reason');
            $table->string('granted_by', 64);
            $table->timestamp('expires_at');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->index(['tenant_id', 'meter_key', 'is_active'], 'tenant_meter_override_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_quota_overrides');
        Schema::dropIfExists('subscription_usage_aggregates');
        Schema::dropIfExists('subscription_usage_events');
        Schema::dropIfExists('factory_subscriptions');
        Schema::dropIfExists('subscription_plan_meters');
        Schema::dropIfExists('subscription_plans');
    }
};


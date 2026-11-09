<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. جدول الكتالوج المركزي للميزات والخصائص (Central SaaS Feature Catalog)
        if (!Schema::hasTable('saas_features')) {
            Schema::create('saas_features', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('feature_key', 64)->unique(); // e.g. erp.inventory, erp.accounting, waslat_worsh.create_rfq
                $table->string('product_category', 32)->index(); // 'erp' or 'waslat_worsh'
                $table->string('name_ar', 255);
                $table->string('name_en', 255);
                $table->text('description_ar')->nullable();
                $table->text('description_en')->nullable();
                $table->string('feature_type', 32)->default('boolean'); // 'boolean', 'limit', 'configurable'
                $table->integer('default_limit')->nullable();
                $table->string('default_value', 255)->nullable();
                $table->boolean('is_active')->default(true);
                $table->boolean('is_public')->default(true); // show in public comparison matrix
                $table->integer('sort_order')->default(1);
                $table->timestamps();
            });
        }

        // 2. جدول ربط الميزات بالباقات التجارية (SaaS Plan Features Pivot)
        if (!Schema::hasTable('saas_plan_features')) {
            Schema::create('saas_plan_features', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('plan_id')->index();
                $table->uuid('feature_id')->index();
                $table->string('feature_key', 64)->index();
                $table->boolean('is_included')->default(true);
                $table->integer('limit_value')->nullable();
                $table->string('custom_value', 255)->nullable();
                $table->timestamps();

                $table->foreign('plan_id')->references('id')->on('subscription_plans')->onDelete('cascade');
                $table->foreign('feature_id')->references('id')->on('saas_features')->onDelete('cascade');
                $table->unique(['plan_id', 'feature_id']);
            });
        }

        // 3. إضافة حقول إدارة وتخصيص الباقات في جدول subscription_plans
        Schema::table('subscription_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_plans', 'is_archived')) {
                $table->boolean('is_archived')->default(false)->after('is_public');
            }
            if (!Schema::hasColumn('subscription_plans', 'billing_duration')) {
                $table->integer('billing_duration')->default(1)->after('annual_price');
            }
            if (!Schema::hasColumn('subscription_plans', 'billing_period')) {
                $table->string('billing_period', 32)->default('monthly')->after('billing_duration');
            }
            if (!Schema::hasColumn('subscription_plans', 'trial_duration_days')) {
                $table->integer('trial_duration_days')->default(0)->after('billing_period');
            }
            if (!Schema::hasColumn('subscription_plans', 'is_popular')) {
                $table->boolean('is_popular')->default(false)->after('sort_order');
            }
            if (!Schema::hasColumn('subscription_plans', 'terms_and_conditions')) {
                $table->text('terms_and_conditions')->nullable()->after('features');
            }
        });

        // 4. إضافة حقل plan_snapshot للاشتراكات لضمان عدم تأثر المشتركين القدامى بتعديل الباقات
        Schema::table('factory_subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('factory_subscriptions', 'plan_snapshot')) {
                $table->text('plan_snapshot')->nullable()->after('custom_quotas');
            }
            if (!Schema::hasColumn('factory_subscriptions', 'is_trial')) {
                $table->boolean('is_trial')->default(false)->after('auto_renew');
            }
        });

        Schema::table('marketplace_requester_subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('marketplace_requester_subscriptions', 'plan_snapshot')) {
                $table->text('plan_snapshot')->nullable()->after('plan_code');
            }
        });

        Schema::table('subscription_payment_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_payment_requests', 'plan_snapshot')) {
                $table->text('plan_snapshot')->nullable()->after('audit_metadata');
            }
            if (!Schema::hasColumn('subscription_payment_requests', 'reviewed_reason')) {
                $table->text('reviewed_reason')->nullable()->after('rejection_reason');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('saas_plan_features');
        Schema::dropIfExists('saas_features');
    }
};


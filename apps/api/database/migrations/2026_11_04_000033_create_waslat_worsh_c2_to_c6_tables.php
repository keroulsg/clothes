<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. تحديث جدول المستأجرين لإضافة نوع الحساب المؤسسي
        if (!Schema::hasColumn('tenants', 'tenant_type')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->string('tenant_type', 32)->default('factory')->after('status');
                $table->index(['tenant_type', 'status'], 'tenants_type_status_idx');
            });
        }

        // 2. تحديث جدول باقات الاشتراك subscription_plans لإضافة فئة المنتج وحصة طلبات القص
        if (!Schema::hasColumn('subscription_plans', 'product_category')) {
            Schema::table('subscription_plans', function (Blueprint $table) {
                $table->string('product_category', 32)->default('erp')->after('code');
                $table->integer('quota_rfq_count')->default(0)->after('annual_price');
                $table->index(['product_category', 'is_active'], 'plans_product_cat_idx');
            });
        }

        // 3. جدول طلبات مراجعة السداد الإدارية المركزية (Subscription Payment Requests)
        if (!Schema::hasTable('subscription_payment_requests')) {
            Schema::create('subscription_payment_requests', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->unsignedBigInteger('user_id')->index();
                $table->uuid('subscription_plan_id')->nullable()->index();
                $table->string('product_type', 32); // 'erp' or 'waslat_worsh'
                $table->string('request_type', 32); // 'initial', 'renewal', 'upgrade', 'paid_downgrade'
                $table->string('plan_code', 50);
                $table->string('plan_name', 255);
                $table->string('billing_cycle', 32)->default('package'); // monthly, annual, package
                $table->decimal('snapshot_price', 14, 4);
                $table->integer('included_quota_rfqs')->default(0);
                $table->decimal('expected_amount', 14, 4);
                $table->decimal('submitted_amount', 14, 4);
                $table->string('currency', 10)->default('EGP');
                $table->string('payment_method', 32)->default('instapay');
                $table->string('transfer_reference', 128);
                $table->string('receipt_file_path', 500);
                $table->string('receipt_original_name', 255)->nullable();
                $table->string('receipt_mime_type', 100)->nullable();
                $table->unsignedInteger('receipt_file_size')->nullable();
                $table->char('receipt_sha256', 64)->index(); // بصمة فحص تكرار الإيصال
                $table->string('status', 32)->default('pending'); // pending, approved, rejected, cancelled
                $table->unsignedBigInteger('reviewed_by')->nullable()->index();
                $table->timestamp('reviewed_at')->nullable();
                $table->string('rejection_reason', 500)->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->json('audit_metadata')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('subscription_plan_id')->references('id')->on('subscription_plans')->onDelete('set null');
                $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
                $table->index(['status', 'tenant_id'], 'sub_pay_status_tenant_idx');
            });
        }

        // 4. جدول اشتراكات طالبي خدمة وصلة ورش المستقلة (Marketplace Requester Subscriptions)
        if (!Schema::hasTable('marketplace_requester_subscriptions')) {
            Schema::create('marketplace_requester_subscriptions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('plan_id')->nullable()->index();
                $table->string('plan_code', 50);
                $table->uuid('payment_request_id')->nullable()->index();
                $table->string('status', 32)->default('pending_approval'); // pending_approval, active, expired, cancelled
                $table->integer('allowed_rfq_count')->default(5);
                $table->integer('consumed_rfq_count')->default(0);
                $table->timestamp('starts_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable()->index();
                $table->timestamp('approved_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('plan_id')->references('id')->on('subscription_plans')->onDelete('set null');
                $table->foreign('payment_request_id')->references('id')->on('subscription_payment_requests')->onDelete('set null');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                $table->index(['tenant_id', 'status'], 'mkt_req_sub_tenant_status_idx');
            });
        }

        // 5. بذر باقات وصلة ورش المستقلة الأولية في subscription_plans
        $now = now();
        $packages = [
            [
                'id' => (string) Str::uuid(),
                'code' => 'ww_starter_5',
                'product_category' => 'waslat_worsh_requester',
                'name_ar' => 'باقة وصلة ورش الأساسية (5 طلبات)',
                'name_en' => 'Waslat Worsh Basic Pack (5 RFQs)',
                'description_ar' => 'حزمة استرشادية لطالبي خدمات القص: تتيح نشر 5 طلبات قص وتشغيل للغير مع فحص كامل للمواصفات الفنية وتلقي عروض الأسعار.',
                'description_en' => 'Basic requester package: publish 5 cutting/CMT requests with full tech spec validation and competitive bids.',
                'monthly_price' => 300.0000,
                'annual_price' => 300.0000,
                'quota_rfq_count' => 5,
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 10,
                'features' => json_encode(['waslat_worsh_requester', 'rfq_creation', 'tech_spec_builder']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'code' => 'ww_pro_15',
                'product_category' => 'waslat_worsh_requester',
                'name_ar' => 'باقة وصلة ورش المتقدمة (15 طلباً)',
                'name_en' => 'Waslat Worsh Pro Pack (15 RFQs)',
                'description_ar' => 'لأصحاب العلامات التجارية والمصممين ذوي خطوط الإنتاج المتعددة: نشر 15 طلب قص خلال 60 يوماً.',
                'description_en' => 'For fashion brands & apparel lines: publish 15 cutting requests valid for 60 days.',
                'monthly_price' => 750.0000,
                'annual_price' => 750.0000,
                'quota_rfq_count' => 15,
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 11,
                'features' => json_encode(['waslat_worsh_requester', 'rfq_creation', 'tech_spec_builder', 'priority_listing']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => (string) Str::uuid(),
                'code' => 'ww_enterprise_50',
                'product_category' => 'waslat_worsh_requester',
                'name_ar' => 'باقة وصلة ورش للشركات الكبرى (50 طلباً)',
                'name_en' => 'Waslat Worsh Bulk Pack (50 RFQs)',
                'description_ar' => 'للمجموعات التجارية وسلاسل الملابس: نشر 50 طلب قص وتشغيل للغير خلال 90 يوماً.',
                'description_en' => 'For retail chains & commercial brands: publish 50 cutting requests valid for 90 days.',
                'monthly_price' => 2000.0000,
                'annual_price' => 2000.0000,
                'quota_rfq_count' => 50,
                'is_active' => true,
                'is_public' => true,
                'sort_order' => 12,
                'features' => json_encode(['waslat_worsh_requester', 'rfq_creation', 'tech_spec_builder', 'priority_listing', 'dedicated_matching']),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($packages as $pkg) {
            \Illuminate\Support\Facades\DB::table('subscription_plans')->updateOrInsert(
                ['code' => $pkg['code']],
                $pkg
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('marketplace_requester_subscriptions');
        Schema::dropIfExists('subscription_payment_requests');

        if (Schema::hasColumn('subscription_plans', 'quota_rfq_count')) {
            Schema::table('subscription_plans', function (Blueprint $table) {
                $table->dropColumn(['quota_rfq_count', 'product_category']);
            });
        }

        if (Schema::hasColumn('tenants', 'tenant_type')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropColumn('tenant_type');
            });
        }
    }
};

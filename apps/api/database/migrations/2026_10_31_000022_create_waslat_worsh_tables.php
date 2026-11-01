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
        // 1. ملفات تعريف الورش والمشاغل ومقدمي الطاقة الإنتاجية (Workshop Profiles)
        Schema::create('workshop_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable()->index(); // مربوط بمصنع في المنصة أو ورشة مستقلة
            $table->string('workshop_name');
            $table->string('specialty_type', 64); // sewing, cutting, embroidery, printing, finishing, full_cmt
            $table->integer('active_machines_count')->default(1);
            $table->integer('daily_capacity_pieces')->default(100);
            $table->string('governorate', 64)->default('القاهرة');
            $table->string('city', 64)->nullable();
            $table->string('address')->nullable();
            $table->string('phone', 32);
            $table->string('contact_person');
            $table->boolean('is_verified')->default(false);
            $table->decimal('rating_average', 3, 2)->default(5.00);
            $table->integer('completed_jobs_count')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('set null');
        });

        // 2. طلبات عروض الأسعار والتشغيل للغير (Industrial RFQs)
        Schema::create('rfqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('rfq_number', 50)->unique();
            $table->string('title');
            $table->string('service_type', 64); // sewing, cutting, embroidery, printing, full_cmt
            $table->text('specifications');
            $table->integer('target_quantity');
            $table->date('expected_delivery_date');
            $table->decimal('max_budget_per_piece', 14, 4)->nullable();
            $table->string('fabric_responsibility', 32)->default('seeker_provided'); // seeker_provided, workshop_sourced
            $table->string('status', 32)->default('open'); // open, awarded, in_progress, completed, cancelled
            $table->uuid('awarded_bid_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        // 3. عروض الأسعار المقدمة من الورش (RFQ Bids)
        Schema::create('rfq_bids', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id')->index();
            $table->uuid('workshop_profile_id')->index();
            $table->decimal('unit_rate', 14, 4);
            $table->integer('promised_lead_days');
            $table->text('notes')->nullable();
            $table->string('status', 32)->default('submitted'); // submitted, accepted, rejected, withdrawn
            $table->uuid('converted_job_order_id')->nullable()->index();
            $table->timestamps();

            $table->foreign('rfq_id')->references('id')->on('rfqs')->onDelete('cascade');
            $table->foreign('workshop_profile_id')->references('id')->on('workshop_profiles')->onDelete('cascade');
            $table->foreign('converted_job_order_id')->references('id')->on('job_orders')->onDelete('set null');
        });

        // 4. عمولات منصة وصلة ورش (Marketplace Commission Ledger)
        Schema::create('marketplace_commissions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('rfq_id')->index();
            $table->uuid('rfq_bid_id')->index();
            $table->uuid('job_order_id')->nullable()->index();
            $table->decimal('gross_amount', 14, 4);
            $table->decimal('commission_rate', 5, 2)->default(3.00); // 3.00%
            $table->decimal('commission_amount', 14, 4);
            $table->string('status', 32)->default('pending'); // pending, collected, waived
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('rfq_id')->references('id')->on('rfqs')->onDelete('cascade');
            $table->foreign('rfq_bid_id')->references('id')->on('rfq_bids')->onDelete('cascade');
            $table->foreign('job_order_id')->references('id')->on('job_orders')->onDelete('set null');
        });

        // 5. تقييمات الجودة والالتزام بالموعد للورش (Workshop Reviews)
        Schema::create('workshop_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id')->index();
            $table->uuid('workshop_profile_id')->index();
            $table->uuid('reviewer_tenant_id')->index();
            $table->integer('quality_rating')->default(5); // 1-5
            $table->integer('timeliness_rating')->default(5); // 1-5
            $table->integer('communication_rating')->default(5); // 1-5
            $table->text('review_notes')->nullable();
            $table->timestamps();

            $table->foreign('rfq_id')->references('id')->on('rfqs')->onDelete('cascade');
            $table->foreign('workshop_profile_id')->references('id')->on('workshop_profiles')->onDelete('cascade');
            $table->foreign('reviewer_tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workshop_reviews');
        Schema::dropIfExists('marketplace_commissions');
        Schema::dropIfExists('rfq_bids');
        Schema::dropIfExists('rfqs');
        Schema::dropIfExists('workshop_profiles');
    }
};


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
        Schema::create('subscription_payment_orders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('order_reference', 100)->unique();
            $table->string('plan_tier', 50);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('EGP');
            $table->string('status', 50)->default('pending')->index(); // pending, paid, failed, expired, cancelled
            $table->string('billing_cycle', 50)->default('yearly');
            $table->string('provider', 100)->nullable();
            $table->string('provider_transaction_id', 150)->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamp('paid_at')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
        });

        Schema::create('processed_webhook_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('event_id', 150)->unique();
            $table->string('provider', 100);
            $table->string('event_type', 100);
            $table->uuid('tenant_id')->nullable()->index();
            $table->string('order_reference', 100)->nullable()->index();
            $table->string('payload_hash', 64);
            $table->string('status', 50)->default('processed');
            $table->timestamp('processed_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('processed_webhook_events');
        Schema::dropIfExists('subscription_payment_orders');
    }
};

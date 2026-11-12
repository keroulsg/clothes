<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 10 Extended: 4 Storefront Themes, Tenant Branding, Manual InstaPay Workflow & Inventory Sync
     */
    public function up(): void
    {
        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->string('theme_id', 50)->default('modern_fashion')->after('store_name');
            $table->json('theme_config')->nullable()->after('theme_id');
            $table->boolean('allow_instapay')->default(true)->after('allow_card_payment');
            $table->string('instapay_account_name', 255)->nullable()->after('allow_instapay');
            $table->string('instapay_handle', 100)->nullable()->after('instapay_account_name');
            $table->text('instapay_instructions')->nullable()->after('instapay_handle');
            $table->string('direction', 10)->default('rtl')->after('currency');
        });

        Schema::table('store_orders', function (Blueprint $table) {
            $table->string('payment_status', 50)->default('pending')->after('payment_method'); // pending, cod_pending, pending_review, verified_paid, rejected
            $table->string('instapay_reference', 100)->nullable()->after('payment_status');
            $table->text('instapay_receipt_url')->nullable()->after('instapay_reference');
            $table->uuid('payment_reviewed_by')->nullable()->after('instapay_receipt_url');
            $table->timestamp('payment_reviewed_at')->nullable()->after('payment_reviewed_by');
            $table->string('payment_rejection_reason', 255)->nullable()->after('payment_reviewed_at');
            $table->boolean('inventory_synced')->default(false)->after('total_amount');

            // Legacy UUID reviewer column retained for backward compatibility; use payment_reviewed_by_user_id.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_orders', function (Blueprint $table) {
            // The legacy UUID reviewer column no longer has a mismatched FK.
            $table->dropColumn([
                'payment_status',
                'instapay_reference',
                'instapay_receipt_url',
                'payment_reviewed_by',
                'payment_reviewed_at',
                'payment_rejection_reason',
                'inventory_synced',
            ]);
        });

        Schema::table('tenant_store_settings', function (Blueprint $table) {
            $table->dropColumn([
                'theme_id',
                'theme_config',
                'allow_instapay',
                'instapay_account_name',
                'instapay_handle',
                'instapay_instructions',
                'direction',
            ]);
        });
    }
};

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
        // 1. ربط طلبات المتجر بأوامر البيع في نظام ERP (Storefront to ERP Sales Order Bridge)
        if (Schema::hasTable('store_orders') && !Schema::hasColumn('store_orders', 'sales_order_id')) {
            Schema::table('store_orders', function (Blueprint $table) {
                $table->uuid('sales_order_id')->nullable()->after('tenant_id')->index();
                $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
            });
        }

        if (Schema::hasTable('sales_orders') && !Schema::hasColumn('sales_orders', 'store_order_id')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->uuid('store_order_id')->nullable()->after('tenant_id')->index();
                $table->string('channel', 50)->default('direct')->after('order_type'); // direct, storefront, pos, wholesale
                $table->foreign('store_order_id')->references('id')->on('store_orders')->onDelete('set null');
            });
        }

        // 2. توسيع إعدادات إنستاباي لتخصيص حسابات أصحاب المصانع بشكل مستقل وآمن
        if (Schema::hasTable('tenant_store_settings')) {
            Schema::table('tenant_store_settings', function (Blueprint $table) {
                if (!Schema::hasColumn('tenant_store_settings', 'instapay_identifier')) {
                    $table->string('instapay_identifier', 100)->nullable()->after('allow_instapay');
                }
                if (!Schema::hasColumn('tenant_store_settings', 'instapay_display_name')) {
                    $table->string('instapay_display_name', 255)->nullable()->after('instapay_identifier');
                }
                if (!Schema::hasColumn('tenant_store_settings', 'instapay_account_verified')) {
                    $table->boolean('instapay_account_verified')->default(false)->after('instapay_display_name');
                }
            });
        }

        // 3. جدول إثباتات وسندات دفع إنستاباي اليدوية (Payment Submissions & Evidence)
        if (!Schema::hasTable('payment_submissions')) {
            Schema::create('payment_submissions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('store_order_id')->index();
                $table->uuid('sales_order_id')->nullable()->index();
                $table->string('payment_method', 50)->default('instapay');
                $table->decimal('expected_amount', 14, 4);
                $table->decimal('submitted_amount', 14, 4)->nullable();
                $table->string('currency', 10)->default('EGP');
                $table->string('transfer_reference', 100)->nullable();
                $table->text('receipt_file_path')->nullable();
                $table->string('receipt_original_name', 255)->nullable();
                $table->string('receipt_mime_type', 100)->nullable();
                $table->unsignedInteger('receipt_file_size')->nullable();
                $table->string('status', 50)->default('pending_review'); // pending_review, approved, rejected, cancelled
                $table->unsignedBigInteger('reviewed_by')->nullable()->index();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->uuid('payment_voucher_id')->nullable()->index();
                $table->json('audit_metadata')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('store_order_id')->references('id')->on('store_orders')->onDelete('cascade');
                $table->foreign('sales_order_id')->references('id')->on('sales_orders')->onDelete('set null');
                $table->foreign('reviewed_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('payment_voucher_id')->references('id')->on('payment_vouchers')->onDelete('set null');
                $table->index(['tenant_id', 'status']);
            });
        }

        // 4. جدول طلبات الشراء الداخلية والاعتمادات (Purchase Requisitions)
        if (!Schema::hasTable('purchase_requisitions')) {
            Schema::create('purchase_requisitions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('requisition_number', 50);
                $table->uuid('branch_id')->nullable()->index();
                $table->string('department', 100)->nullable();
                $table->unsignedBigInteger('requested_by')->nullable()->index();
                $table->date('requisition_date');
                $table->date('required_date')->nullable();
                $table->string('priority', 30)->default('medium'); // low, medium, high, urgent
                $table->string('status', 50)->default('draft'); // draft, submitted, approved, rejected, converted, cancelled
                $table->decimal('estimated_total_cost', 14, 4)->default(0);
                $table->text('reason')->nullable();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('approved_by')->nullable()->index();
                $table->timestamp('approved_at')->nullable();
                $table->unsignedBigInteger('rejected_by')->nullable()->index();
                $table->timestamp('rejected_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->uuid('converted_purchase_order_id')->nullable()->index();
                $table->timestamp('converted_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('branch_id')->references('id')->on('branches')->onDelete('set null');
                $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('approved_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('rejected_by')->references('id')->on('users')->onDelete('set null');
                $table->foreign('converted_purchase_order_id')->references('id')->on('purchase_orders')->onDelete('set null');
                $table->unique(['tenant_id', 'requisition_number']);
            });
        }

        // 5. بنود طلب الشراء الداخلي (Purchase Requisition Items)
        if (!Schema::hasTable('purchase_requisition_items')) {
            Schema::create('purchase_requisition_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('purchase_requisition_id')->index();
                $table->uuid('inventory_item_id')->nullable()->index();
                $table->string('item_name', 255);
                $table->decimal('requested_quantity', 12, 4);
                $table->decimal('approved_quantity', 12, 4)->nullable();
                $table->string('unit_of_measure', 50)->default('pcs');
                $table->decimal('estimated_unit_price', 14, 4)->default(0);
                $table->decimal('estimated_total_price', 14, 4)->default(0);
                $table->text('specifications')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('purchase_requisition_id')->references('id')->on('purchase_requisitions')->onDelete('cascade');
                $table->foreign('inventory_item_id')->references('id')->on('inventory_items')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_requisition_items');
        Schema::dropIfExists('purchase_requisitions');
        Schema::dropIfExists('payment_submissions');

        if (Schema::hasTable('tenant_store_settings')) {
            Schema::table('tenant_store_settings', function (Blueprint $table) {
                $table->dropColumn(['instapay_identifier', 'instapay_display_name', 'instapay_account_verified']);
            });
        }

        if (Schema::hasTable('sales_orders') && Schema::hasColumn('sales_orders', 'store_order_id')) {
            Schema::table('sales_orders', function (Blueprint $table) {
                $table->dropForeign(['store_order_id']);
                $table->dropColumn(['store_order_id', 'channel']);
            });
        }

        if (Schema::hasTable('store_orders') && Schema::hasColumn('store_orders', 'sales_order_id')) {
            Schema::table('store_orders', function (Blueprint $table) {
                $table->dropForeign(['sales_order_id']);
                $table->dropColumn('sales_order_id');
            });
        }
    }
};

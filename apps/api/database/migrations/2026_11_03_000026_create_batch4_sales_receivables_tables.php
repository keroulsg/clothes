<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Batch 4: Sales, Quotations, Orders, Deliveries, Invoices, Payments, POS, Returns, and Credit Notes
     */
    public function up(): void
    {
        // 1. ترقية جدول العملاء (Customers Enhancements)
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'classification')) {
                $table->string('classification', 50)->default('company')->after('name'); // individual, company
            }
            if (!Schema::hasColumn('customers', 'company_name')) {
                $table->string('company_name', 255)->nullable()->after('classification');
            }
            if (!Schema::hasColumn('customers', 'commercial_registry')) {
                $table->string('commercial_registry', 100)->nullable()->after('tax_id');
            }
            if (!Schema::hasColumn('customers', 'credit_limit')) {
                $table->decimal('credit_limit', 14, 4)->default(0)->after('commercial_registry');
            }
            if (!Schema::hasColumn('customers', 'payment_terms')) {
                $table->string('payment_terms', 100)->nullable()->after('credit_limit');
            }
            if (!Schema::hasColumn('customers', 'opening_balance')) {
                $table->decimal('opening_balance', 14, 4)->default(0)->after('payment_terms');
            }
            if (!Schema::hasColumn('customers', 'billing_address')) {
                $table->text('billing_address')->nullable()->after('address');
            }
            if (!Schema::hasColumn('customers', 'delivery_address')) {
                $table->text('delivery_address')->nullable()->after('billing_address');
            }
            if (!Schema::hasColumn('customers', 'status')) {
                $table->string('status', 50)->default('active')->after('is_active');
            }
        });

        // 2. ترقية جدول عروض الأسعار (Quotations Enhancements)
        Schema::table('quotations', function (Blueprint $table) {
            if (!Schema::hasColumn('quotations', 'converted_sales_order_id')) {
                $table->uuid('converted_sales_order_id')->nullable()->index()->after('notes');
            }
            if (!Schema::hasColumn('quotations', 'converted_at')) {
                $table->timestamp('converted_at')->nullable()->after('converted_sales_order_id');
            }
        });

        // 3. ترقية جدول أوامر البيع (Sales Orders Enhancements)
        Schema::table('sales_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_orders', 'delivery_address')) {
                $table->text('delivery_address')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('sales_orders', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('delivery_address');
            }
            if (!Schema::hasColumn('sales_orders', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            }
        });

        // 4. ترقية جدول فواتير المبيعات (Sales Invoices Enhancements)
        Schema::table('sales_invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_invoices', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('sales_invoices', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            }
        });

        // 5. بنود أذون التسليم (Sales Delivery Items) لدعم التسليم الجزئي
        if (!Schema::hasTable('sales_delivery_items')) {
            Schema::create('sales_delivery_items', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('sales_delivery_note_id')->index();
                $table->uuid('sales_order_item_id')->nullable()->index();
                $table->uuid('variant_id')->index();
                $table->uuid('inventory_item_id')->nullable()->index();
                $table->decimal('quantity', 12, 4);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('sales_delivery_note_id')->references('id')->on('sales_delivery_notes')->onDelete('cascade');
                $table->foreign('variant_id')->references('id')->on('product_variants')->onDelete('restrict');
            });
        }

        // 6. ترقية جدول أذون التسليم بإلغاء وإرجاع المخزون
        Schema::table('sales_delivery_notes', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_delivery_notes', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('sales_delivery_notes', 'cancellation_reason')) {
                $table->text('cancellation_reason')->nullable()->after('cancelled_at');
            }
        });

        // 7. تخصيص دفعات وسندات قبض العملاء على الفواتير (Payment Voucher Allocations)
        if (!Schema::hasTable('payment_voucher_allocations')) {
            Schema::create('payment_voucher_allocations', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->uuid('payment_voucher_id')->index();
                $table->uuid('sales_invoice_id')->index();
                $table->decimal('amount', 14, 4);
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('payment_voucher_id')->references('id')->on('payment_vouchers')->onDelete('cascade');
                $table->foreign('sales_invoice_id')->references('id')->on('sales_invoices')->onDelete('cascade');
            });
        }

        // 8. الإشعارات الدائنة الرسمية (Credit Notes)
        if (!Schema::hasTable('credit_notes')) {
            Schema::create('credit_notes', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('tenant_id')->index();
                $table->string('credit_note_number', 50);
                $table->uuid('customer_id')->nullable()->index();
                $table->uuid('sales_invoice_id')->nullable()->index();
                $table->uuid('sales_return_id')->nullable()->index();
                $table->decimal('subtotal', 14, 4)->default(0);
                $table->decimal('tax_amount', 14, 4)->default(0);
                $table->decimal('total_amount', 14, 4)->default(0);
                $table->string('status', 50)->default('issued'); // draft, issued, applied, refunded, cancelled
                $table->date('credit_note_date');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
                $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
                $table->foreign('sales_invoice_id')->references('id')->on('sales_invoices')->onDelete('set null');
                $table->foreign('sales_return_id')->references('id')->on('sales_returns')->onDelete('set null');
                $table->unique(['tenant_id', 'credit_note_number']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
        Schema::dropIfExists('payment_voucher_allocations');
        Schema::dropIfExists('sales_delivery_items');

        Schema::table('sales_delivery_notes', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancellation_reason']);
        });

        Schema::table('sales_invoices', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancellation_reason']);
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_address', 'cancelled_at', 'cancellation_reason']);
        });

        Schema::table('quotations', function (Blueprint $table) {
            $table->dropColumn(['converted_sales_order_id', 'converted_at']);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'classification', 'company_name', 'commercial_registry',
                'credit_limit', 'payment_terms', 'opening_balance',
                'billing_address', 'delivery_address', 'status',
            ]);
        });
    }
};


<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Phase 8: Financials, Chart of Accounts, Double-Entry Journals, Payment Vouchers, Production Costing
     */
    public function up(): void
    {
        // 1. شجرة الحسابات المحاسبية (Chart of Accounts)
        Schema::create('chart_of_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->string('type', 50); // asset, liability, equity, revenue, expense
            $table->string('category', 50); // current_asset, fixed_asset, current_liability, long_term_liability, direct_cost, indirect_cost, operating_expense, sales_revenue
            $table->decimal('current_balance', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 2. قيود اليومية العامة (Journal Entries)
        Schema::create('journal_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('entry_number', 50);
            $table->date('entry_date');
            $table->string('reference_type', 50)->nullable(); // sales_invoice, supplier_invoice, payroll, job_invoice, payment_voucher, manual
            $table->uuid('reference_id')->nullable();
            $table->text('description');
            $table->decimal('total_debit', 14, 4)->default(0);
            $table->decimal('total_credit', 14, 4)->default(0);
            $table->string('status', 50)->default('posted'); // draft, posted, void
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'entry_number']);
        });

        // 3. سطور قيد اليومية المتوازن (Journal Entry Lines)
        Schema::create('journal_entry_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('journal_entry_id')->index();
            $table->uuid('account_id')->index();
            $table->string('description', 255)->nullable();
            $table->decimal('debit', 14, 4)->default(0);
            $table->decimal('credit', 14, 4)->default(0);
            $table->string('cost_center', 100)->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('journal_entry_id')->references('id')->on('journal_entries')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('chart_of_accounts')->onDelete('restrict');
        });

        // 4. سندات القبض والصرف (Payment Vouchers - Cash / Bank)
        Schema::create('payment_vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('voucher_number', 50);
            $table->string('voucher_type', 50); // receipt, payment (قبض / صرف)
            $table->string('party_type', 50); // customer, supplier, employee, other
            $table->uuid('party_id')->nullable();
            $table->string('party_name', 255);
            $table->string('payment_method', 50)->default('cash'); // cash, bank_transfer, card, check
            $table->uuid('account_id')->index();
            $table->decimal('amount', 14, 4);
            $table->date('voucher_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('chart_of_accounts')->onDelete('restrict');
            $table->unique(['tenant_id', 'voucher_number']);
        });

        // 5. بطاقات التكلفة الصناعية الفعلية للإنتاج (Production Cost Sheets)
        Schema::create('production_cost_sheets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('production_order_id')->index();
            $table->uuid('garment_model_id')->index();
            $table->integer('total_produced_pieces')->default(0);
            $table->decimal('direct_materials_cost', 14, 4)->default(0);
            $table->decimal('direct_labor_cost', 14, 4)->default(0);
            $table->decimal('subcontracted_services_cost', 14, 4)->default(0);
            $table->decimal('allocated_overhead_cost', 14, 4)->default(0);
            $table->decimal('total_cost', 14, 4)->default(0);
            $table->decimal('cost_per_piece', 14, 4)->default(0);
            $table->string('status', 50)->default('calculated'); // draft, calculated, approved
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('production_order_id')->references('id')->on('production_orders')->onDelete('cascade');
            $table->foreign('garment_model_id')->references('id')->on('garment_models')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('production_cost_sheets');
        Schema::dropIfExists('payment_vouchers');
        Schema::dropIfExists('journal_entry_lines');
        Schema::dropIfExists('journal_entries');
        Schema::dropIfExists('chart_of_accounts');
    }
};

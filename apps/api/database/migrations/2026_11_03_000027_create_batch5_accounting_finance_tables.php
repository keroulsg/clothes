<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Batch 5: Accounting, Finance, General Ledger, Analytic Cost Centers, Fiscal Periods & Manufacturing Costing
     */
    public function up(): void
    {
        // 1. توسيع جدول شجرة الحسابات (chart_of_accounts) لدعم الهرمية، طبيعة الحساب، وقابلية الترحيل
        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->string('name_en', 255)->nullable()->after('name');
            $table->uuid('parent_id')->nullable()->after('category')->index();
            $table->unsignedTinyInteger('level')->default(1)->after('parent_id');
            $table->string('normal_balance', 10)->default('debit')->after('level'); // debit or credit
            $table->boolean('is_control_account')->default(false)->after('normal_balance');
            $table->boolean('is_cash_bank')->default(false)->after('is_control_account');
            $table->string('account_subtype', 50)->nullable()->after('is_cash_bank'); // cash, bank, ar, ap, inventory, cogs, revenue, equity
            $table->boolean('is_postable')->default(true)->after('account_subtype');
            $table->decimal('opening_balance', 14, 4)->default(0)->after('is_postable');
            $table->text('notes')->nullable()->after('is_active');
        });

        // 2. توسيع جدول قيود اليومية (journal_entries)
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->uuid('fiscal_period_id')->nullable()->after('entry_date')->index();
            $table->uuid('branch_id')->nullable()->after('fiscal_period_id')->index();
            $table->uuid('created_by')->nullable()->after('status');
            $table->uuid('approved_by')->nullable()->after('created_by');
            $table->uuid('posted_by')->nullable()->after('approved_by');
            $table->uuid('reversed_entry_id')->nullable()->after('posted_by')->index();
            $table->string('reversal_reason', 255)->nullable()->after('reversed_entry_id');
        });

        // 3. توسيع جدول سطور قيد اليومية (journal_entry_lines)
        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->uuid('cost_center_id')->nullable()->after('cost_center')->index();
            $table->string('party_type', 50)->nullable()->after('cost_center_id'); // customer, supplier, employee
            $table->uuid('party_id')->nullable()->after('party_type')->index();
        });

        // 4. جدول ربط الحسابات التلقائية للمستأجر (tenant_account_mappings)
        Schema::create('tenant_account_mappings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('mapping_key', 100); // ar_control, ap_control, default_cash, default_bank, sales_revenue, cogs, etc.
            $table->uuid('account_id')->index();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('account_id')->references('id')->on('chart_of_accounts')->onDelete('cascade');
            $table->unique(['tenant_id', 'mapping_key']);
        });

        // 5. جدول مراكز التكلفة المحاسبية والتحليلية (cost_centers)
        Schema::create('cost_centers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->string('name_en', 255)->nullable();
            $table->uuid('parent_id')->nullable()->index();
            $table->uuid('branch_id')->nullable()->index();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 6. جدول الحسابات المالية (financial_accounts - خزائن، بنوك، محافظ)
        Schema::create('financial_accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('chart_of_account_id')->index();
            $table->string('code', 50);
            $table->string('name', 255);
            $table->string('name_en', 255)->nullable();
            $table->string('type', 50)->default('cash'); // cash, bank, wallet
            $table->string('account_number', 100)->nullable();
            $table->string('bank_name', 255)->nullable();
            $table->string('currency', 10)->default('EGP');
            $table->uuid('branch_id')->nullable()->index();
            $table->decimal('opening_balance', 14, 4)->default(0);
            $table->decimal('current_balance', 14, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('chart_of_account_id')->references('id')->on('chart_of_accounts')->onDelete('cascade');
            $table->unique(['tenant_id', 'code']);
        });

        // 7. جدول التحويلات المالية بين الحسابات والخزائن (financial_account_transfers)
        Schema::create('financial_account_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('transfer_number', 50);
            $table->uuid('from_financial_account_id')->index();
            $table->uuid('to_financial_account_id')->index();
            $table->decimal('amount', 14, 4);
            $table->date('transfer_date');
            $table->string('status', 50)->default('posted'); // posted, reversed
            $table->string('reference', 100)->nullable();
            $table->text('notes')->nullable();
            $table->uuid('journal_entry_id')->nullable()->index();
            $table->uuid('reversed_transfer_id')->nullable()->index();
            $table->string('reversal_reason', 255)->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('from_financial_account_id')->references('id')->on('financial_accounts')->onDelete('restrict');
            $table->foreign('to_financial_account_id')->references('id')->on('financial_accounts')->onDelete('restrict');
            $table->unique(['tenant_id', 'transfer_number']);
        });

        // 8. جدول السنوات المالية (fiscal_years)
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 50)->default('open'); // open, closed
            $table->dateTime('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->unique(['tenant_id', 'name']);
        });

        // 9. جدول الفترات المحاسبية الدورية (fiscal_periods)
        Schema::create('fiscal_periods', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('fiscal_year_id')->index();
            $table->unsignedInteger('period_number');
            $table->string('name', 100);
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 50)->default('open'); // open, closed
            $table->dateTime('closed_at')->nullable();
            $table->uuid('closed_by')->nullable();
            $table->dateTime('reopened_at')->nullable();
            $table->uuid('reopened_by')->nullable();
            $table->text('reopening_reason')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('fiscal_year_id')->references('id')->on('fiscal_years')->onDelete('cascade');
            $table->unique(['fiscal_year_id', 'period_number']);
        });

        // 10. توسيع بطاقات التكلفة الصناعية الفعلية (production_cost_sheets)
        Schema::table('production_cost_sheets', function (Blueprint $table) {
            $table->string('costing_method', 50)->default('weighted_average')->after('applied_overhead_rate'); // weighted_average, fifo
            $table->string('overhead_allocation_method', 50)->default('direct_labor_cost_pct')->after('costing_method');
            $table->decimal('planned_materials_cost', 14, 4)->default(0)->after('overhead_allocation_method');
            $table->decimal('planned_labor_cost', 14, 4)->default(0)->after('planned_materials_cost');
            $table->decimal('planned_total_cost', 14, 4)->default(0)->after('planned_labor_cost');
            $table->integer('scrap_pieces')->default(0)->after('planned_total_cost');
            $table->decimal('scrap_cost', 14, 4)->default(0)->after('scrap_pieces');
            $table->decimal('variance_amount', 14, 4)->default(0)->after('scrap_cost');
            $table->decimal('variance_percentage', 8, 2)->default(0)->after('variance_amount');
            $table->text('notes')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('production_cost_sheets', function (Blueprint $table) {
            $table->dropColumn([
                'costing_method',
                'overhead_allocation_method',
                'planned_materials_cost',
                'planned_labor_cost',
                'planned_total_cost',
                'scrap_pieces',
                'scrap_cost',
                'variance_amount',
                'variance_percentage',
                'notes',
            ]);
        });

        Schema::dropIfExists('fiscal_periods');
        Schema::dropIfExists('fiscal_years');
        Schema::dropIfExists('financial_account_transfers');
        Schema::dropIfExists('financial_accounts');
        Schema::dropIfExists('cost_centers');
        Schema::dropIfExists('tenant_account_mappings');

        Schema::table('journal_entry_lines', function (Blueprint $table) {
            $table->dropColumn(['cost_center_id', 'party_type', 'party_id']);
        });

        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropColumn([
                'fiscal_period_id',
                'branch_id',
                'created_by',
                'approved_by',
                'posted_by',
                'reversed_entry_id',
                'reversal_reason',
            ]);
        });

        Schema::table('chart_of_accounts', function (Blueprint $table) {
            $table->dropColumn([
                'name_en',
                'parent_id',
                'level',
                'normal_balance',
                'is_control_account',
                'is_cash_bank',
                'account_subtype',
                'is_postable',
                'opening_balance',
                'notes',
            ]);
        });
    }
};

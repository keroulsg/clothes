<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\ChartOfAccount;
use App\Models\CostCenter;
use App\Models\CreditNote;
use App\Models\Customer;
use App\Models\CuttingOrder;
use App\Models\FinancialAccount;
use App\Models\FinancialAccountTransfer;
use App\Models\FiscalPeriod;
use App\Models\FiscalYear;
use App\Models\GarmentModel;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PaymentVoucher;
use App\Models\PieceWorkLog;
use App\Models\ProductionCostSheet;
use App\Models\ProductionOrder;
use App\Models\SalesDeliveryNote;
use App\Models\SalesInvoice;
use App\Models\Supplier;
use App\Models\SupplierInvoice;
use App\Models\TenantAccountMapping;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class AccountingService
{
    /**
     * إعداد شجرة الحسابات المحاسبية الافتراضية الهرمية لمصنع الملابس
     */
    public function initializeDefaultChartOfAccounts(string $tenantId): void
    {
        $defaultAccounts = [
            // 1: الأصول
            ['code' => '1', 'name' => 'الأصول', 'name_en' => 'Assets', 'type' => 'asset', 'category' => 'asset', 'level' => 1, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '11', 'name' => 'الأصول المتداولة', 'name_en' => 'Current Assets', 'type' => 'asset', 'category' => 'current_asset', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => '1'],
            
            // 1010: الخزائن النقدية
            ['code' => '1010', 'name' => 'نقدية بالصندوق والخزينة', 'name_en' => 'Cash on Hand', 'type' => 'asset', 'category' => 'current_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_cash_bank' => true, 'is_postable' => false, 'parent_code' => '11'],
            ['code' => '1011', 'name' => 'خزينة المعرض والمبيعات النقدية', 'name_en' => 'Showroom Cash Desk', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_cash_bank' => true, 'is_postable' => true, 'parent_code' => '1010'],
            ['code' => '1012', 'name' => 'خزينة المصنع الرئيسية والعهد النثرية', 'name_en' => 'Factory Main Vault & Petty Cash', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_cash_bank' => true, 'is_postable' => true, 'parent_code' => '1010'],
            
            // 1020: البنوك والمحافظ
            ['code' => '1020', 'name' => 'حسابات البنوك والمحافظ الإلكترونية', 'name_en' => 'Bank & E-Wallets', 'type' => 'asset', 'category' => 'current_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_cash_bank' => true, 'is_postable' => false, 'parent_code' => '11'],
            ['code' => '1021', 'name' => 'حساب البنك الأهلي المصري (جاري)', 'name_en' => 'NBE Current Bank Account', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_cash_bank' => true, 'is_postable' => true, 'parent_code' => '1020'],
            ['code' => '1022', 'name' => 'محافظ إلكترونية وفودافون كاش مبيعات', 'name_en' => 'Vodafone Cash & Mobile Wallets', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_cash_bank' => true, 'is_postable' => true, 'parent_code' => '1020'],
            
            // 1110: العملاء والمدينون
            ['code' => '1110', 'name' => 'العملاء والمدينون التجاريون', 'name_en' => 'Accounts Receivable', 'type' => 'asset', 'category' => 'current_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => true, 'parent_code' => '11'],
            ['code' => '1111', 'name' => 'عملاء جملة وتوكيلات ملابس كبرى', 'name_en' => 'Wholesale Commercial Clients', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1110'],
            ['code' => '1112', 'name' => 'عملاء تجزئة ومعارض أفراد', 'name_en' => 'Retail Customers', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1110'],
            ['code' => '1113', 'name' => 'عملاء تشغيل وقص للغير (CMT)', 'name_en' => 'CMT Subcontracting Clients', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1110'],
            ['code' => '1120', 'name' => 'ضريبة قيمة مضافة مدخلات قابلة للخصم', 'name_en' => 'Recoverable Input VAT', 'type' => 'asset', 'category' => 'current_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '11'],

            // 1200: المخزون والمستودعات
            ['code' => '1200', 'name' => 'مخزون المستودعات والمهمات', 'name_en' => 'Inventory & Stock Warehouses', 'type' => 'asset', 'category' => 'current_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => '11'],
            ['code' => '1210', 'name' => 'مخزون الأقمشة والخامات وتريكو قطن', 'name_en' => 'Raw Fabrics & Knits Inventory', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],
            ['code' => '1213', 'name' => 'مخزون مستلزمات إنتاج (سوست، زراير، خيوط، حشو)', 'name_en' => 'Accessories, Trims & Threads', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],
            ['code' => '1220', 'name' => 'مخزون الإنتاج تحت التشغيل (WIP)', 'name_en' => 'Work in Progress (WIP)', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],
            ['code' => '1230', 'name' => 'مخزون المنتجات التامة الجاهزة للبيع', 'name_en' => 'Finished Garments Inventory', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],
            ['code' => '1232', 'name' => 'مخزون استوكات وعيوب وفرز ثانِ', 'name_en' => 'Seconds & Stock Clearance', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],
            ['code' => '1240', 'name' => 'مخزون قطع غيار ماكينات وزيوت صيانة', 'name_en' => 'Machine Spare Parts & Lubricants', 'type' => 'asset', 'category' => 'current_asset', 'level' => 4, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '1200'],

            // 13: الأصول الثابتة
            ['code' => '13', 'name' => 'الأصول الثابتة والماكينات', 'name_en' => 'Fixed Assets & Machinery', 'type' => 'asset', 'category' => 'fixed_asset', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => '1'],
            ['code' => '1301', 'name' => 'ماكينات خياطة وقص وتجهيز صناعي', 'name_en' => 'Industrial Sewing & Cutting Machines', 'type' => 'asset', 'category' => 'fixed_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '13'],
            ['code' => '1302', 'name' => 'مكابس بخار ومحطات كي وتجهيز', 'name_en' => 'Pressing & Steam Ironing Stations', 'type' => 'asset', 'category' => 'fixed_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '13'],
            ['code' => '1303', 'name' => 'أجهزة كمبيوتر وسيرفرات وطابعات باركود', 'name_en' => 'IT Equipment & Barcode Printers', 'type' => 'asset', 'category' => 'fixed_asset', 'level' => 3, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '13'],
            ['code' => '1309', 'name' => 'مجمع إهلاك الأصول والماكينات', 'name_en' => 'Accumulated Depreciation', 'type' => 'asset', 'category' => 'fixed_asset', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '13'],

            // 2: الالتزامات
            ['code' => '2', 'name' => 'الالتزامات', 'name_en' => 'Liabilities', 'type' => 'liability', 'category' => 'liability', 'level' => 1, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '21', 'name' => 'الالتزامات المتداولة', 'name_en' => 'Current Liabilities', 'type' => 'liability', 'category' => 'current_liability', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => '2'],
            
            // 2010: الموردون
            ['code' => '2010', 'name' => 'الموردون والدائنون التجاريون', 'name_en' => 'Accounts Payable', 'type' => 'liability', 'category' => 'current_liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => true, 'parent_code' => '21'],
            ['code' => '2011', 'name' => 'موردو الأقمشة والغزول والمنسوجات', 'name_en' => 'Fabric & Yarn Suppliers', 'type' => 'liability', 'category' => 'current_liability', 'level' => 4, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2010'],
            ['code' => '2012', 'name' => 'موردو الإكسسوارات ومستلزمات الإنتاج', 'name_en' => 'Accessories & Trims Suppliers', 'type' => 'liability', 'category' => 'current_liability', 'level' => 4, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2010'],
            ['code' => '2013', 'name' => 'ورش التشغيل الخارجي (طباعة، تطريز، صباغة)', 'name_en' => 'Subcontractors (Print, Embroidery)', 'type' => 'liability', 'category' => 'current_liability', 'level' => 4, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2010'],
            
            // 2020: أجور العمال
            ['code' => '2020', 'name' => 'مستحقات أجور عمال الإنتاج والرواتب', 'name_en' => 'Accrued Payroll & Wages', 'type' => 'liability', 'category' => 'current_liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => true, 'parent_code' => '21'],
            ['code' => '2021', 'name' => 'أجور عمال الخياطة والقص (بالقطعة)', 'name_en' => 'Piece-Rate Workers Wages', 'type' => 'liability', 'category' => 'current_liability', 'level' => 4, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2020'],
            ['code' => '2022', 'name' => 'رواتب الإشراف والإدارة الشهرية', 'name_en' => 'Monthly Supervisory & Staff Salaries', 'type' => 'liability', 'category' => 'current_liability', 'level' => 4, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2020'],
            ['code' => '2030', 'name' => 'ضريبة القيمة المضافة المستحقة (VAT)', 'name_en' => 'VAT Payable', 'type' => 'liability', 'category' => 'current_liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '21'],
            ['code' => '2110', 'name' => 'قروض وتسهيلات بنكية قصيرة الأجل', 'name_en' => 'Short-Term Bank Loans & Facilities', 'type' => 'liability', 'category' => 'current_liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '21'],
            ['code' => '2120', 'name' => 'أقساط قروض بنكية جارية ومستحقة', 'name_en' => 'Current Due Bank Installments', 'type' => 'liability', 'category' => 'current_liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '21'],
            ['code' => '2200', 'name' => 'الالتزامات والقروض طويلة الأجل', 'name_en' => 'Long-Term Liabilities', 'type' => 'liability', 'category' => 'liability', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => '2'],
            ['code' => '2210', 'name' => 'قروض وتسهيلات بنكية طويلة الأجل (تمويل خطوط إنتاج)', 'name_en' => 'Long-Term Machinery & Production Loans', 'type' => 'liability', 'category' => 'liability', 'level' => 3, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '2200'],

            // 3: حقوق الملكية
            ['code' => '3', 'name' => 'حقوق الملكية', 'name_en' => 'Equity', 'type' => 'equity', 'category' => 'equity', 'level' => 1, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '3010', 'name' => 'رأس المال المدفوع', 'name_en' => 'Paid-in Capital', 'type' => 'equity', 'category' => 'equity', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '3'],
            ['code' => '3012', 'name' => 'جاري الشركاء / صاحب المصنع', 'name_en' => 'Owner / Partners Current Account', 'type' => 'equity', 'category' => 'equity', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '3'],
            ['code' => '3020', 'name' => 'الأرباح المحتجزة / المرحلة', 'name_en' => 'Retained Earnings', 'type' => 'equity', 'category' => 'equity', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '3'],

            // 4: الإيرادات
            ['code' => '4', 'name' => 'الإيرادات', 'name_en' => 'Revenue', 'type' => 'revenue', 'category' => 'revenue', 'level' => 1, 'normal_balance' => 'credit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '4010', 'name' => 'إيراد مبيعات الملابس والإنتاج التام', 'name_en' => 'Finished Goods Sales Revenue', 'type' => 'revenue', 'category' => 'sales_revenue', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '4'],
            ['code' => '4012', 'name' => 'إيراد مبيعات استوكات وتصفيات', 'name_en' => 'Stock Clearance Revenue', 'type' => 'revenue', 'category' => 'sales_revenue', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '4'],
            ['code' => '4020', 'name' => 'إيراد خدمات التشغيل والقص للغير (CMT)', 'name_en' => 'CMT Service Revenue', 'type' => 'revenue', 'category' => 'sales_revenue', 'level' => 2, 'normal_balance' => 'credit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '4'],

            // 5: تكاليف الإنتاج المباشرة
            ['code' => '5', 'name' => 'تكاليف الإنتاج المباشرة', 'name_en' => 'Direct Production Costs', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 1, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '5010', 'name' => 'تكلفة البضاعة المباعة (COGS)', 'name_en' => 'Cost of Goods Sold', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '5'],
            ['code' => '5011', 'name' => 'تكلفة خامات الأقمشة المستهلكة في الإنتاج', 'name_en' => 'Direct Fabric Consumption Cost', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '5'],
            ['code' => '5012', 'name' => 'تكلفة مستلزمات الإنتاج والإكسسوار المستهلك', 'name_en' => 'Direct Accessories & Trims Cost', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '5'],
            ['code' => '5020', 'name' => 'أجور عمال الإنتاج المباشرة (أجر القطعة)', 'name_en' => 'Direct Labor Expense (Piece-Rate)', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '5'],
            ['code' => '5030', 'name' => 'مصاريف تشغيل صناعي خارجي (تطريز/طباعة)', 'name_en' => 'Outwork & Subcontracting Services', 'type' => 'expense', 'category' => 'direct_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '5'],

            // 6: المصروفات غير المباشرة والتشغيلية
            ['code' => '6', 'name' => 'المصروفات الصناعية والتشغيلية', 'name_en' => 'Operating & Overhead Expenses', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 1, 'normal_balance' => 'debit', 'is_control_account' => true, 'is_postable' => false, 'parent_code' => null],
            ['code' => '6010', 'name' => 'مصاريف صناعية غير مباشرة (كهرباء ومياه وصيانة)', 'name_en' => 'Factory Utilities & Overheads', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
            ['code' => '6012', 'name' => 'صيانة ماكينات الخياطة وقطع الغيار', 'name_en' => 'Sewing Machine Maintenance', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
            ['code' => '6013', 'name' => 'إهلاك ماكينات ومعدات المصنع', 'name_en' => 'Machinery Depreciation Expense', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
            ['code' => '6020', 'name' => 'مصاريف بيع وتوزيع وشحن', 'name_en' => 'Selling, Shipping & Marketing', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
            ['code' => '6030', 'name' => 'مصاريف إدارية وعمومية واتصالات', 'name_en' => 'Administrative & General Expenses', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
            ['code' => '6040', 'name' => 'فوائد تمويل وعمولات ومصاريف بنكية', 'name_en' => 'Financing Interest & Bank Fees', 'type' => 'expense', 'category' => 'indirect_cost', 'level' => 2, 'normal_balance' => 'debit', 'is_control_account' => false, 'is_postable' => true, 'parent_code' => '6'],
        ];

        // Step 1: Create accounts in order
        $createdMap = [];
        foreach ($defaultAccounts as $acc) {
            $parentId = null;
            if (!empty($acc['parent_code']) && isset($createdMap[$acc['parent_code']])) {
                $parentId = $createdMap[$acc['parent_code']]->id;
            }

            $model = ChartOfAccount::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId, 'code' => $acc['code']],
                [
                    'name' => $acc['name'],
                    'name_en' => $acc['name_en'] ?? null,
                    'type' => $acc['type'],
                    'category' => $acc['category'],
                    'parent_id' => $parentId,
                    'level' => $acc['level'] ?? 1,
                    'normal_balance' => $acc['normal_balance'] ?? 'debit',
                    'is_control_account' => $acc['is_control_account'] ?? false,
                    'is_cash_bank' => $acc['is_cash_bank'] ?? false,
                    'is_postable' => $acc['is_postable'] ?? true,
                    // Preserve live ledger balances when account metadata is re-seeded.
                    'is_active' => true,
                ]
            );
            $createdMap[$acc['code']] = $model;
        }

        // Step 2: Initialize default tenant account mappings
        $defaultMappings = [
            'ar_control' => '1110',
            'ap_control' => '2010',
            'default_cash' => '1011',
            'default_bank' => '1021',
            'sales_revenue' => '4010',
            'cmt_revenue' => '4020',
            'cogs' => '5010',
            'raw_materials_inventory' => '1210',
            'wip_inventory' => '1220',
            'finished_goods_inventory' => '1230',
            'direct_labor_expense' => '5020',
            'payroll_payable' => '2021',
            'retained_earnings' => '3020',
            'sales_tax_payable' => '2030',
            'input_tax' => '1120',
            'accessories_inventory' => '1213',
        ];

        foreach ($defaultMappings as $key => $code) {
            if (isset($createdMap[$code])) {
                TenantAccountMapping::withoutGlobalScopes()->updateOrCreate(
                    ['tenant_id' => $tenantId, 'mapping_key' => $key],
                    ['account_id' => $createdMap[$code]->id]
                );
            }
        }
    }

    /**
     * جلب الحساب المربوط بمفتاح العمليات المحاسبية للعميل
     */
    public function getMappedAccount(string $tenantId, string $mappingKey): ChartOfAccount
    {
        if (ChartOfAccount::withoutGlobalScopes()->where('tenant_id', $tenantId)->count() === 0) {
            $this->initializeDefaultChartOfAccounts($tenantId);
        }

        $mapping = TenantAccountMapping::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('mapping_key', $mappingKey)
            ->with(['account' => function ($q) {
                $q->withoutGlobalScopes();
            }])
            ->first();

        if (
            $mapping
            && $mapping->account
            && $mapping->account->is_active
            && $mapping->account->is_postable
        ) {
            return $mapping->account;
        }

        // Ensure the recoverable input VAT control account exists for tenants initialized before this mapping was introduced.
        if ($mappingKey === 'input_tax') {
            $parent = ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('code', '11')
                ->first();

            if (!$parent) {
                throw ValidationException::withMessages([
                    'account_mapping' => ['تعذر تهيئة حساب ضريبة المدخلات: حساب الأصول المتداولة الرئيسي غير موجود.'],
                ]);
            }

            $inputTaxAccount = ChartOfAccount::withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => '1120'],
                [
                    'name' => 'ضريبة قيمة مضافة مدخلات قابلة للخصم',
                    'type' => 'asset',
                    'category' => 'current_asset',
                    'parent_id' => $parent->id,
                    'level' => 3,
                    'normal_balance' => 'debit',
                    'is_control_account' => false,
                    'is_postable' => true,
                    'current_balance' => 0,
                    'is_active' => true,
                ]
            );

            TenantAccountMapping::withoutGlobalScopes()->updateOrCreate(
                ['tenant_id' => $tenantId, 'mapping_key' => 'input_tax'],
                ['account_id' => $inputTaxAccount->id]
            );

            return $inputTaxAccount;
        }

        // Fallback to standard code if initialized
        $fallbackCodes = [
            'ar_control' => '1110',
            'ap_control' => '2010',
            'default_cash' => '1011',
            'default_bank' => '1021',
            'sales_revenue' => '4010',
            'cmt_revenue' => '4020',
            'cogs' => '5010',
            'raw_materials_inventory' => '1210',
            'wip_inventory' => '1220',
            'finished_goods_inventory' => '1230',
            'direct_labor_expense' => '5020',
            'payroll_payable' => '2020',
            'retained_earnings' => '3020',
            'sales_tax_payable' => '2030',
            'input_tax' => '1120',
            'accessories_inventory' => '1213',
        ];

        if ((!$mapping || !$mapping->account || !$mapping->account->is_active || !$mapping->account->is_postable) && isset($fallbackCodes[$mappingKey])) {
            $accountQuery = fn () => ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('code', $fallbackCodes[$mappingKey])
                ->where('is_active', true)
                ->where('is_postable', true)
                ->first();

            $account = $accountQuery();

            if (!$account) {
                // Only auto-complete a genuinely partial legacy chart. A missing account in an
                // otherwise initialized chart is a configuration/integrity failure and must fail closed.
                $chartAccountCount = ChartOfAccount::withoutGlobalScopes()
                    ->where('tenant_id', $tenantId)
                    ->count();

                if ($chartAccountCount <= 5) {
                    $existingMappings = TenantAccountMapping::withoutGlobalScopes()
                        ->where('tenant_id', $tenantId)
                        ->get(['mapping_key', 'account_id']);

                    $this->initializeDefaultChartOfAccounts($tenantId);

                    foreach ($existingMappings as $existingMapping) {
                        $existingAccount = ChartOfAccount::withoutGlobalScopes()
                            ->where('tenant_id', $tenantId)
                            ->whereKey($existingMapping->account_id)
                            ->where('is_active', true)
                            ->where('is_postable', true)
                            ->first();

                        if ($existingAccount) {
                            TenantAccountMapping::withoutGlobalScopes()->updateOrCreate(
                                ['tenant_id' => $tenantId, 'mapping_key' => $existingMapping->mapping_key],
                                ['account_id' => $existingAccount->id]
                            );
                        }
                    }

                    $account = $accountQuery();
                }
            }

            if ($account) {
                TenantAccountMapping::withoutGlobalScopes()->updateOrCreate(
                    ['tenant_id' => $tenantId, 'mapping_key' => $mappingKey],
                    ['account_id' => $account->id]
                );
                return $account;
            }
        }

        throw ValidationException::withMessages([
            'account_mapping' => ["لم يتم ضبط حساب الربط المالي للمفتاح '{$mappingKey}' في دليل الحسابات. يرجى تهيئة دليل الحسابات وضبط حسابات الربط أولاً."],
        ]);
    }

    /**
     * تحديث أو تعيين حساب الربط
     */
    public function setAccountMapping(string $tenantId, string $mappingKey, string $accountId): TenantAccountMapping
    {
        $account = ChartOfAccount::where('tenant_id', $tenantId)->findOrFail($accountId);

        if (!$account->is_postable) {
            throw new InvalidArgumentException("لا يمكن ربط المفتاح '{$mappingKey}' بحساب رئيسي غير قابل للترحيل.");
        }

        return TenantAccountMapping::updateOrCreate(
            ['tenant_id' => $tenantId, 'mapping_key' => $mappingKey],
            ['account_id' => $account->id]
        );
    }

    /**
     * التحقق من أن تاريخ القيد يقع ضمن فترة مالية مفتوحة
     */
    public function validateFiscalPeriodOpen(string $tenantId, string $date): ?FiscalPeriod
    {
        $periodsCount = FiscalPeriod::where('tenant_id', $tenantId)->count();
        if ($periodsCount === 0) {
            // لا توجد فترات مالية محددة للمستأجر بعد، يسمح بالترحيل العام
            return null;
        }

        $period = FiscalPeriod::where('tenant_id', $tenantId)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->first();

        if ($period && $period->status === 'closed') {
            throw ValidationException::withMessages([
                'entry_date' => ["التاريخ {$date} يقع ضمن الفترة المالية المقفلة '{$period->name}'. لا يمكن إضافة أو تعديل قيود في فترة مقفلة."],
            ]);
        }

        return $period;
    }

    /**
     * تسجيل قيد يومية عام مع اشتراط التوازن المحاسبي التام
     */
    public function createJournalEntry(array $data): JournalEntry
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (!$tenantId && !empty($data['tenant_id'])) {
            $tenantId = $data['tenant_id'];
        }

        return DB::transaction(function () use ($data, $tenantId) {
            $lines = $data['lines'] ?? [];
            if (count($lines) < 2) {
                throw new InvalidArgumentException('يجب أن يحتوي قيد اليومية على سطرين محاسبيين على الأقل.');
            }

            $entryDate = $data['entry_date'] ?? now()->toDateString();
            $period = $this->validateFiscalPeriodOpen($tenantId, $entryDate);

            $totalDebit = 0;
            $totalCredit = 0;

            foreach ($lines as $line) {
                $debit = round((float) ($line['debit'] ?? 0), 4);
                $credit = round((float) ($line['credit'] ?? 0), 4);

                if ($debit < 0 || $credit < 0) {
                    throw new InvalidArgumentException('لا يمكن قبول مبالغ سالبة في أطراف القيد المحاسبي.');
                }

                if ($debit > 0 && $credit > 0) {
                    throw new InvalidArgumentException('لا يمكن للسطر المحاسبي الواحد أن يكون مديناً ودائناً معاً.');
                }

                $totalDebit += $debit;
                $totalCredit += $credit;
            }

            // فحص توازن القيد بدقة 4 خانات عشرية
            if (abs($totalDebit - $totalCredit) > 0.0001) {
                throw new InvalidArgumentException("قيد اليومية غير متوازن محاسبياً! إجمالي المدين: {$totalDebit}، إجمالي الدائن: {$totalCredit}");
            }

            if ($totalDebit <= 0) {
                throw new InvalidArgumentException('يجب أن تكون قيمة القيد المحاسبي أكبر من الصفر.');
            }

            $entry = JournalEntry::create([
                'tenant_id' => $tenantId,
                'entry_number' => $data['entry_number'] ?? ('JE-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'entry_date' => $entryDate,
                'reference_type' => $data['reference_type'] ?? 'manual',
                'reference_id' => !empty($data['reference_id']) && preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', (string) $data['reference_id']) ? $data['reference_id'] : null,
                'reference_key' => isset($data['reference_id']) ? (string) $data['reference_id'] : null,
                'description' => $data['description'],
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => 'posted',
                'fiscal_period_id' => $period?->id ?? ($data['fiscal_period_id'] ?? null),
                'branch_id' => $data['branch_id'] ?? null,
                'created_by_user_id' => auth()->id() ?? ($data['created_by'] ?? null),
                'posted_by_user_id' => auth()->id() ?? ($data['posted_by'] ?? null),
            ]);

            foreach ($lines as $line) {
                $debit = round((float) ($line['debit'] ?? 0), 4);
                $credit = round((float) ($line['credit'] ?? 0), 4);

                $account = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('id', $line['account_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if (!$account->is_postable) {
                    throw new InvalidArgumentException("الحساب '{$account->code} - {$account->name}' هو حساب رئيسي/تجميعي ولا يقبل الترحيل المباشر.");
                }

                // تحديث رصيد الحساب طبقاً لطبيعته المحاسبية
                if (in_array($account->type, ['asset', 'expense'])) {
                    $account->current_balance += ($debit - $credit);
                } else {
                    $account->current_balance += ($credit - $debit);
                }
                $account->save();

                JournalEntryLine::create([
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $entry->id,
                    'account_id' => $account->id,
                    'description' => $line['description'] ?? $data['description'],
                    'debit' => $debit,
                    'credit' => $credit,
                    'cost_center' => $line['cost_center'] ?? null,
                    'cost_center_id' => $line['cost_center_id'] ?? null,
                    'party_type' => $line['party_type'] ?? null,
                    'party_id' => $line['party_id'] ?? null,
                ]);
            }

            return $entry->load(['lines.account', 'lines.costCenterRelation']);
        });
    }

    /**
     * عكس قيد يومية بقيد تسوية عكسي مع الحفاظ على القيد الأصلي غير قابل للتعديل
     */
    public function reverseJournalEntry(string $entryId, string $reversalReason, ?string $userId = null): JournalEntry
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return DB::transaction(function () use ($entryId, $reversalReason, $userId, $tenantId) {
            $originalEntry = JournalEntry::where('tenant_id', $tenantId)
                ->where('id', $entryId)
                ->with('lines.account')
                ->lockForUpdate()
                ->firstOrFail();

            if ($originalEntry->status !== 'posted') {
                throw new InvalidArgumentException("لا يمكن عكس قيد حالته ليست مرحلة (الحالة الحالية: {$originalEntry->status}).");
            }

            if ($originalEntry->reversed_entry_id) {
                throw new InvalidArgumentException("لا يمكن عكس قيد هو بالفعل قيد عكسي.");
            }

            $alreadyReversed = JournalEntry::where('tenant_id', $tenantId)
                ->where('reversed_entry_id', $originalEntry->id)
                ->exists();

            if ($alreadyReversed) {
                throw new InvalidArgumentException("هذا القيد تم عكسه مسبقاً.");
            }

            $entryDate = now()->toDateString();
            $period = $this->validateFiscalPeriodOpen($tenantId, $entryDate);

            // إنشاء سطور القيد العكسي بتبديل المدين والدائن
            $reversingLines = [];
            foreach ($originalEntry->lines as $line) {
                $reversingLines[] = [
                    'account_id' => $line->account_id,
                    'description' => "عكس قيد [{$originalEntry->entry_number}]: " . ($line->description ?? $reversalReason),
                    'debit' => (float)$line->credit,
                    'credit' => (float)$line->debit,
                    'cost_center_id' => $line->cost_center_id,
                    'party_type' => $line->party_type,
                    'party_id' => $line->party_id,
                ];
            }

            $reversalEntry = JournalEntry::create([
                'tenant_id' => $tenantId,
                'entry_number' => 'REV-' . $originalEntry->entry_number,
                'entry_date' => $entryDate,
                'reference_type' => 'reversal',
                'reference_id' => $originalEntry->id,
                'reference_key' => (string) $originalEntry->id,
                'description' => "عكس القيد المحاسبي {$originalEntry->entry_number}: {$reversalReason}",
                'total_debit' => $originalEntry->total_credit,
                'total_credit' => $originalEntry->total_debit,
                'status' => 'posted',
                'fiscal_period_id' => $period?->id,
                'branch_id' => $originalEntry->branch_id,
                'created_by_user_id' => $userId ?? auth()->id(),
                'posted_by_user_id' => $userId ?? auth()->id(),
                'reversed_entry_id' => $originalEntry->id,
                'reversal_reason' => $reversalReason,
            ]);

            foreach ($reversingLines as $rLine) {
                $account = ChartOfAccount::where('tenant_id', $tenantId)
                    ->where('id', $rLine['account_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                if (in_array($account->type, ['asset', 'expense'])) {
                    $account->current_balance += ($rLine['debit'] - $rLine['credit']);
                } else {
                    $account->current_balance += ($rLine['credit'] - $rLine['debit']);
                }
                $account->save();

                JournalEntryLine::create([
                    'tenant_id' => $tenantId,
                    'journal_entry_id' => $reversalEntry->id,
                    'account_id' => $account->id,
                    'description' => $rLine['description'],
                    'debit' => $rLine['debit'],
                    'credit' => $rLine['credit'],
                    'cost_center_id' => $rLine['cost_center_id'],
                    'party_type' => $rLine['party_type'],
                    'party_id' => $rLine['party_id'],
                ]);
            }

            // تحديث حالة القيد الأصلي إلى reversed
            $originalEntry->status = 'reversed';
            $originalEntry->reversal_reason = $reversalReason;
            $originalEntry->save();

            // تسجيل التدقيق
            try {
                AuditLog::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $userId ?? auth()->id(),
                    'action' => 'journal_entry.reversed',
                    'auditable_type' => JournalEntry::class,
                    'auditable_id' => $originalEntry->id,
                    'old_values' => ['status' => 'posted'],
                    'new_values' => ['status' => 'reversed', 'reversal_entry_id' => $reversalEntry->id, 'reason' => $reversalReason],
                    'ip_address' => request()->ip(),
                ]);
            } catch (\Throwable $e) {}

            return $reversalEntry->load('lines.account');
        });
    }

    /**
     * تحويل أموال بين الحسابات المالية (خزائن، بنوك)
     */
    public function transferFunds(array $data): FinancialAccountTransfer
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return DB::transaction(function () use ($data, $tenantId) {
            $fromAccountId = $data['from_financial_account_id'];
            $toAccountId = $data['to_financial_account_id'];
            $amount = round((float)$data['amount'], 4);

            if ($amount <= 0) {
                throw new InvalidArgumentException('يجب أن تكون قيمة التحويل المالي أكبر من الصفر.');
            }

            if ($fromAccountId === $toAccountId) {
                throw new InvalidArgumentException('لا يمكن التحويل المالي لنفس الحساب.');
            }

            $fromAccount = FinancialAccount::where('tenant_id', $tenantId)
                ->where('id', $fromAccountId)
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            $toAccount = FinancialAccount::where('tenant_id', $tenantId)
                ->where('id', $toAccountId)
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            if ($fromAccount->current_balance < $amount) {
                throw ValidationException::withMessages([
                    'amount' => ["رصيد الحساب المحول منه ({$fromAccount->name}) غير كافٍ. الرصيد المتاح: {$fromAccount->current_balance}"],
                ]);
            }

            // تحديث أرصدة الحسابات المالية
            $fromAccount->current_balance -= $amount;
            $fromAccount->save();

            $toAccount->current_balance += $amount;
            $toAccount->save();

            // إنشاء قيد يومية متوازن تلقائياً
            // مدين: حساب الشجرة التابع للمستلم، دائن: حساب الشجرة التابع للمرسل
            $transferDate = $data['transfer_date'] ?? now()->toDateString();
            $transferNumber = 'TRF-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));

            $je = $this->createJournalEntry([
                'tenant_id' => $tenantId,
                'entry_number' => 'JE-' . $transferNumber,
                'entry_date' => $transferDate,
                'reference_type' => 'financial_account_transfer',
                'description' => "تحويل مالي داخلي من [{$fromAccount->name}] إلى [{$toAccount->name}] - " . ($data['notes'] ?? ''),
                'lines' => [
                    [
                        'account_id' => $toAccount->chart_of_account_id,
                        'debit' => $amount,
                        'credit' => 0,
                        'description' => "استلام تحويل مالي من [{$fromAccount->name}]",
                    ],
                    [
                        'account_id' => $fromAccount->chart_of_account_id,
                        'debit' => 0,
                        'credit' => $amount,
                        'description' => "تحويل مالي إلى [{$toAccount->name}]",
                    ],
                ],
            ]);

            $transfer = FinancialAccountTransfer::create([
                'tenant_id' => $tenantId,
                'transfer_number' => $transferNumber,
                'from_financial_account_id' => $fromAccount->id,
                'to_financial_account_id' => $toAccount->id,
                'amount' => $amount,
                'transfer_date' => $transferDate,
                'status' => 'completed',
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
                'journal_entry_id' => $je->id,
                'created_by_user_id' => auth()->id(),
            ]);

            return $transfer->load(['fromAccount', 'toAccount', 'journalEntry']);
        });
    }

    /**
     * إلغاء وعكس التحويل المالي الداخلي
     */
    public function reverseTransfer(string $transferId, string $reversalReason, ?string $userId = null): FinancialAccountTransfer
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return DB::transaction(function () use ($transferId, $reversalReason, $userId, $tenantId) {
            $transfer = FinancialAccountTransfer::where('tenant_id', $tenantId)
                ->where('id', $transferId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($transfer->status !== 'completed') {
                throw new InvalidArgumentException("لا يمكن إلغاء تحويل غير مكتمل أو ملغي مسبقاً.");
            }

            $fromAccount = FinancialAccount::where('tenant_id', $tenantId)->findOrFail($transfer->from_financial_account_id);
            $toAccount = FinancialAccount::where('tenant_id', $tenantId)->findOrFail($transfer->to_financial_account_id);

            // التحقق من أن الحساب المستلم لديه رصيد كافٍ لإرجاع المبلغ
            if ($toAccount->current_balance < $transfer->amount) {
                throw ValidationException::withMessages([
                    'amount' => ["لا يمكن عكس التحويل؛ رصيد الحساب المستلم ({$toAccount->name}) غير كافٍ لاسترداد المبلغ."],
                ]);
            }

            // عكس أرصدة الحسابات المالية
            $toAccount->current_balance -= $transfer->amount;
            $toAccount->save();

            $fromAccount->current_balance += $transfer->amount;
            $fromAccount->save();

            // عكس القيد المحاسبي
            if ($transfer->journal_entry_id) {
                $this->reverseJournalEntry($transfer->journal_entry_id, "عكس التحويل المالي {$transfer->transfer_number}: {$reversalReason}", $userId);
            }

            $transfer->status = 'reversed';
            $transfer->reversal_reason = $reversalReason;
            $transfer->save();

            return $transfer->load(['fromAccount', 'toAccount']);
        });
    }

    /**
     * إنشاء سنة مالية وفتراتها الشهرية تلقائياً
     */
    public function createFiscalYearWithPeriods(string $tenantId, string $name, string $startDate, string $endDate, int $periodsCount = 12): FiscalYear
    {
        return DB::transaction(function () use ($tenantId, $name, $startDate, $endDate, $periodsCount) {
            $year = FiscalYear::create([
                'tenant_id' => $tenantId,
                'name' => $name,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status' => 'open',
            ]);

            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);

            for ($i = 1; $i <= $periodsCount; $i++) {
                $pStart = (clone $start)->addMonths($i - 1)->startOfMonth();
                if ($i === 1) {
                    $pStart = clone $start;
                }

                $pEnd = (clone $pStart)->endOfMonth();
                if ($i === $periodsCount || $pEnd->gt($end)) {
                    $pEnd = clone $end;
                }

                FiscalPeriod::create([
                    'tenant_id' => $tenantId,
                    'fiscal_year_id' => $year->id,
                    'period_number' => $i,
                    'name' => "فترة {$i} ({$pStart->format('Y-m')})",
                    'start_date' => $pStart->toDateString(),
                    'end_date' => $pEnd->toDateString(),
                    'status' => 'open',
                ]);
            }

            return $year->load('periods');
        });
    }

    /**
     * إغلاق فترة مالية
     */
    public function closeFiscalPeriod(string $periodId, ?string $userId = null): FiscalPeriod
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($tenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }

        return DB::transaction(function () use ($periodId, $userId, $tenantId) {
            $period = FiscalPeriod::where('tenant_id', $tenantId)
                ->whereKey($periodId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($period->status === 'closed') {
                return $period;
            }
            if ($period->status !== 'open') {
                throw new InvalidArgumentException("لا يمكن إغلاق فترة بحالة [{$period->status}].");
            }

            $actorId = $userId ?? auth()->id();
            $period->status = 'closed';
            $period->closed_at = now();
            $period->closed_by_user_id = $actorId;
            $period->save();

            try {
                AuditLog::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $actorId,
                    'action' => 'fiscal_period.closed',
                    'auditable_type' => FiscalPeriod::class,
                    'auditable_id' => $period->id,
                    'old_values' => ['status' => 'open'],
                    'new_values' => ['status' => 'closed'],
                    'ip_address' => request()->ip(),
                ]);
            } catch (\Throwable $e) {}

            return $period;
        });
    }

    /**
     * إعادة فتح فترة مالية لضرورات المراجعة مع تسجيل السبب
     */
    public function reopenFiscalPeriod(string $periodId, string $reason, ?string $userId = null): FiscalPeriod
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (empty($tenantId)) {
            throw new InvalidArgumentException('أمان: سياق الشركة غير محدد.');
        }
        if (empty(trim($reason))) {
            throw new InvalidArgumentException('يجب تقديم سبب معتمد لإعادة فتح الفترة المالية المقفلة.');
        }

        return DB::transaction(function () use ($periodId, $reason, $userId, $tenantId) {
            $period = FiscalPeriod::where('tenant_id', $tenantId)
                ->whereKey($periodId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($period->status === 'open') {
                return $period;
            }
            if ($period->status !== 'closed') {
                throw new InvalidArgumentException("لا يمكن إعادة فتح فترة بحالة [{$period->status}].");
            }

            $actorId = $userId ?? auth()->id();
            $period->status = 'open';
            $period->reopened_at = now();
            $period->reopened_by_user_id = $actorId;
            $period->reopening_reason = trim($reason);
            $period->save();

            try {
                AuditLog::create([
                    'tenant_id' => $tenantId,
                    'user_id' => $actorId,
                    'action' => 'fiscal_period.reopened',
                    'auditable_type' => FiscalPeriod::class,
                    'auditable_id' => $period->id,
                    'old_values' => ['status' => 'closed'],
                    'new_values' => ['status' => 'open', 'reopening_reason' => trim($reason)],
                    'ip_address' => request()->ip(),
                ]);
            } catch (\Throwable $e) {}

            return $period;
        });
    }

    /**
     * إغلاق السنة المالية وترحيل الأرباح والخسائر إلى الأرباح المحتجزة
     */
    public function closeFiscalYear(string $yearId, ?string $userId = null): FiscalYear
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return DB::transaction(function () use ($yearId, $userId, $tenantId) {
            $year = FiscalYear::where('tenant_id', $tenantId)->findOrFail($yearId);

            if ($year->status === 'closed') {
                return $year;
            }

            // إغلاق كافة الفترات
            FiscalPeriod::where('tenant_id', $tenantId)
                ->where('fiscal_year_id', $year->id)
                ->update(['status' => 'closed', 'closed_at' => now(), 'closed_by_user_id' => $userId ?? auth()->id()]);

            // إقفال الإيرادات والمصروفات إلى حساب الأرباح المحتجزة
            $retainedEarningsAccount = $this->getMappedAccount($tenantId, 'retained_earnings');

            $revenueAccounts = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('type', 'revenue')
                ->where('is_postable', true)
                ->get();

            $expenseAccounts = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('type', 'expense')
                ->where('is_postable', true)
                ->get();

            $closingLines = [];
            $totalNetIncome = 0;

            // إقفال الإيرادات (مدين بحجم رصيدها الدائن)
            foreach ($revenueAccounts as $revAcc) {
                if ($revAcc->current_balance > 0) {
                    $closingLines[] = [
                        'account_id' => $revAcc->id,
                        'debit' => (float)$revAcc->current_balance,
                        'credit' => 0,
                        'description' => "إقفال إيراد [{$revAcc->code}] في نهاية السنة المالية {$year->name}",
                    ];
                    $totalNetIncome += $revAcc->current_balance;
                }
            }

            // إقفال المصروفات (دائن بحجم رصيدها المدين)
            foreach ($expenseAccounts as $expAcc) {
                if ($expAcc->current_balance > 0) {
                    $closingLines[] = [
                        'account_id' => $expAcc->id,
                        'debit' => 0,
                        'credit' => (float)$expAcc->current_balance,
                        'description' => "إقفال مصروف [{$expAcc->code}] في نهاية السنة المالية {$year->name}",
                    ];
                    $totalNetIncome -= $expAcc->current_balance;
                }
            }

            // المتمم الحسابي إلى الأرباح المحتجزة
            if ($totalNetIncome > 0) {
                // صافي ربح -> دائن في حقوق الملكية
                $closingLines[] = [
                    'account_id' => $retainedEarningsAccount->id,
                    'debit' => 0,
                    'credit' => round($totalNetIncome, 4),
                    'description' => "ترحيل صافي أرباح السنة المالية {$year->name} إلى الأرباح المحتجزة",
                ];
            } elseif ($totalNetIncome < 0) {
                // صافي خسارة -> مدين في حقوق الملكية
                $closingLines[] = [
                    'account_id' => $retainedEarningsAccount->id,
                    'debit' => round(abs($totalNetIncome), 4),
                    'credit' => 0,
                    'description' => "ترحيل صافي خسائر السنة المالية {$year->name} إلى الأرباح المحتجزة",
                ];
            }

            if (!empty($closingLines) && count($closingLines) >= 2) {
                $this->createJournalEntry([
                    'tenant_id' => $tenantId,
                    'entry_number' => 'YE-CLOSE-' . date('Y', strtotime($year->end_date)),
                    'entry_date' => $year->end_date,
                    'reference_type' => 'year_end_closing',
                    'description' => "قيد الإقفال السنوي وترحيل الأرباح والخسائر للسنة المالية {$year->name}",
                    'lines' => $closingLines,
                ]);
            }

            $year->status = 'closed';
            $year->closed_at = now();
            $year->closed_by_user_id = $userId ?? auth()->id();
            $year->save();

            return $year->load('periods');
        });
    }

    /**
     * Find an existing journal by its polymorphic reference without comparing
     * numeric identifiers against the legacy UUID column on PostgreSQL.
     */
    private function findJournalEntryByReference(string $tenantId, string $referenceType, $referenceId): ?JournalEntry
    {
        $referenceId = (string) $referenceId;
        $query = JournalEntry::where('tenant_id', $tenantId)
            ->where('reference_type', $referenceType)
            ->where('reference_key', $referenceId);

        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i', $referenceId)) {
            $query->orWhere(function ($legacy) use ($tenantId, $referenceType, $referenceId) {
                $legacy->where('tenant_id', $tenantId)
                    ->where('reference_type', $referenceType)
                    ->where('reference_id', $referenceId);
            });
        }

        return $query->first();
    }

    /**
     * ترحيل فاتورة مبيعات آلياً إلى دفتر الأستاذ العام
     */
    public function postSalesInvoice(SalesInvoice $invoice): ?JournalEntry
    {
        $tenantId = $invoice->tenant_id;

        // التحقق من عدم الترحيل المسبق
        $existing = $this->findJournalEntryByReference($tenantId, 'sales_invoice', $invoice->id);

        if ($existing) {
            return $existing;
        }

        $arAccount = $this->getMappedAccount($tenantId, 'ar_control');
        $salesAccount = $this->getMappedAccount($tenantId, 'sales_revenue');
        $taxAccount = $this->getMappedAccount($tenantId, 'sales_tax_payable');

        $totalAmount = (float)$invoice->total_amount;
        $taxAmount = (float)($invoice->tax_amount ?? 0);
        $netSales = max(0, round($totalAmount - $taxAmount, 4));

        $lines = [];
        // طرف مدين: العميل (حساب المراقبة للعملاء)
        $lines[] = [
            'account_id' => $arAccount->id,
            'debit' => $totalAmount,
            'credit' => 0,
            'description' => "استحقاق فاتورة مبيعات رقم {$invoice->invoice_number}",
            'party_type' => 'customer',
            'party_id' => $invoice->customer_id,
        ];

        // طرف دائن: إيراد المبيعات
        $lines[] = [
            'account_id' => $salesAccount->id,
            'debit' => 0,
            'credit' => $netSales,
            'description' => "إيراد مبيعات فاتورة رقم {$invoice->invoice_number}",
        ];

        // طرف دائن: ضريبة القيمة المضافة إن وجدت
        if ($taxAmount > 0) {
            $lines[] = [
                'account_id' => $taxAccount->id,
                'debit' => 0,
                'credit' => $taxAmount,
                'description' => "ضريبة مبيعات مستحقة عن فاتورة رقم {$invoice->invoice_number}",
            ];
        }

        return $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'entry_number' => 'JE-INV-' . $invoice->invoice_number,
            'entry_date' => $invoice->invoice_date ?? now()->toDateString(),
            'reference_type' => 'sales_invoice',
            'reference_id' => $invoice->id,
            'description' => "قيد استحقاق مبيعات فاتورة رقم {$invoice->invoice_number}",
            'lines' => $lines,
        ]);
    }

    /**
     * ترحيل سند قبض أو صرف مع ترحيل محاسبي تلقائي
     */
    public function createPaymentVoucher(array $data): PaymentVoucher
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;

        return DB::transaction(function () use ($data, $tenantId) {
            $amount = round((float) $data['amount'], 4);
            if ($amount <= 0) {
                throw new InvalidArgumentException('يجب أن تكون قيمة السند المالي أكبر من الصفر.');
            }

            $account = ChartOfAccount::where('tenant_id', $tenantId)
                ->where('id', $data['account_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if (!empty($data['party_id'])) {
                if (($data['party_type'] ?? '') === 'customer') {
                    Customer::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                } elseif (($data['party_type'] ?? '') === 'supplier') {
                    Supplier::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                } elseif (($data['party_type'] ?? '') === 'employee') {
                    \App\Models\Employee::where('tenant_id', $tenantId)->findOrFail($data['party_id']);
                }
            }

            $partyType = $data['party_type'] ?? 'customer';
            $voucherType = $data['voucher_type'];

            if (!$account->is_active || !$account->is_postable) {
                throw new InvalidArgumentException('حساب الصرف/القبض غير نشط أو غير قابل للترحيل.');
            }

            $voucher = PaymentVoucher::create([
                'tenant_id' => $tenantId,
                'voucher_number' => $data['voucher_number'] ?? ('PV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4))),
                'voucher_type' => $voucherType, // receipt or payment
                'party_type' => $partyType,
                'party_id' => $data['party_id'] ?? null,
                'party_name' => $data['party_name'],
                'payment_method' => $data['payment_method'] ?? 'cash',
                'account_id' => $account->id,
                'amount' => $amount,
                'voucher_date' => $data['voucher_date'] ?? now()->toDateString(),
                'notes' => $data['notes'] ?? null,
            ]);

            // The voucher and its GL journal are one atomic operation. Never mutate balances outside the ledger.
            if ($partyType === 'customer') {
                $contraAccountId = $this->getMappedAccount($tenantId, 'ar_control')->id;
            } elseif ($partyType === 'supplier') {
                $contraAccountId = $this->getMappedAccount($tenantId, 'ap_control')->id;
            } elseif ($partyType === 'employee') {
                $contraAccountId = $this->getMappedAccount($tenantId, 'payroll_payable')->id;
            } elseif ($partyType === 'other' && !empty($data['contra_account_id'])) {
                $contraAccount = ChartOfAccount::where('tenant_id', $tenantId)
                    ->whereKey($data['contra_account_id'])
                    ->where('is_active', true)
                    ->where('is_postable', true)
                    ->lockForUpdate()
                    ->first();

                if (!$contraAccount) {
                    throw new InvalidArgumentException('الحساب المقابل لسند الطرف الآخر غير موجود أو غير نشط أو غير قابل للترحيل.');
                }

                $contraAccountId = $contraAccount->id;
            } else {
                throw new InvalidArgumentException('يجب تحديد حساب مقابل فرعي قابل للترحيل لسند الطرف الآخر قبل الترحيل.');
            }

            if ($voucherType === 'receipt') {
                $lines = [
                    [
                        'account_id' => $account->id,
                        'debit' => $amount,
                        'credit' => 0,
                        'description' => "قبض نقدي/بنكي بسند رقم {$voucher->voucher_number}",
                    ],
                    [
                        'account_id' => $contraAccountId,
                        'debit' => 0,
                        'credit' => $amount,
                        'description' => "سداد لحساب الطرف: {$voucher->party_name}",
                        'party_type' => $voucher->party_type,
                        'party_id' => $voucher->party_id,
                    ],
                ];
            } else {
                $lines = [
                    [
                        'account_id' => $contraAccountId,
                        'debit' => $amount,
                        'credit' => 0,
                        'description' => "صرف لحساب الطرف: {$voucher->party_name}",
                        'party_type' => $voucher->party_type,
                        'party_id' => $voucher->party_id,
                    ],
                    [
                        'account_id' => $account->id,
                        'debit' => 0,
                        'credit' => $amount,
                        'description' => "صرف نقدي/بنكي بسند رقم {$voucher->voucher_number}",
                    ],
                ];
            }

            $this->createJournalEntry([
                'tenant_id' => $tenantId,
                'entry_number' => 'JE-VOUCH-' . $voucher->voucher_number,
                'entry_date' => $voucher->voucher_date,
                'reference_type' => 'payment_voucher',
                'reference_id' => $voucher->id,
                'description' => "قيد سند " . ($voucherType === 'receipt' ? 'قبض' : 'صرف') . " رقم {$voucher->voucher_number} - {$voucher->party_name}",
                'lines' => $lines,
            ]);

            return $voucher->load('account');
        });
    }

    /**
     * احتساب التكلفة الصناعية الفعلية لأمر الإنتاج ومطابقتها
     */
    public function calculateProductionCost(string $productionOrderId, array $overrides = []): ProductionCostSheet
    {
        $tenantId = app()->bound('current_tenant_id') ? app('current_tenant_id') : null;
        if (!$tenantId) {
            $orderLookup = ProductionOrder::withoutGlobalScopes()->findOrFail($productionOrderId);
            $tenantId = $orderLookup->tenant_id;
            app()->instance('current_tenant_id', $tenantId);
        }

        return DB::transaction(function () use ($productionOrderId, $overrides, $tenantId) {
            $order = ProductionOrder::where('tenant_id', $tenantId)
                ->where('id', $productionOrderId)
                ->firstOrFail();

            $existingCostSheet = ProductionCostSheet::where('tenant_id', $tenantId)
                ->where('production_order_id', $order->id)
                ->first();

            // Approved cost sheets are immutable; corrections require a separate audited revision workflow.
            if ($existingCostSheet && $existingCostSheet->status === 'approved') {
                return $existingCostSheet->load(['productionOrder', 'garmentModel']);
            }

            if (in_array($order->status, ['closed', 'archived'], true)) {
                throw ValidationException::withMessages([
                    'production_order' => ['أمر الإنتاج مغلق نهائياً، ولا يمكن إعادة احتساب التكلفة إلا بإذن استثنائي معتمد.'],
                ]);
            }

            // فحص نوع الإنتاج (إذا كان تشغيل للغير CMT يتم استبعاد خامات العميل)
            $isCmt = ($order->order_type ?? '') === 'cmt' || ($order->production_type ?? '') === 'cmt';

            // 1. حساب تكلفة الخامات المباشرة الفعلية
            if (isset($overrides['direct_materials_cost'])) {
                $materialsCost = (float)$overrides['direct_materials_cost'];
            } elseif ($isCmt) {
                // في تشغيل CMT، القماش مقدم من العميل وتكلفته صفر على المصنع؛ يتم احتساب المستلزمات الإضافية فقط
                $materialsCost = 0.0;
            } else {
                $cuttingOrderIds = DB::table('cutting_orders')
                    ->where('tenant_id', $tenantId)
                    ->where('production_order_id', $order->id)
                    ->pluck('id')
                    ->toArray();

                $validReferenceIds = array_unique(array_filter(array_merge([$order->id], $cuttingOrderIds)));

                $outCost = (float)DB::table('inventory_transactions')
                    ->where('tenant_id', $tenantId)
                    ->whereIn('reference_type', ['production_orders', 'production_order', 'cutting_orders', 'cutting_order'])
                    ->whereIn('reference_id', $validReferenceIds)
                    ->where('direction', 'OUT')
                    ->sum(DB::raw('quantity * unit_cost'));

                $inReturnCost = (float)DB::table('inventory_transactions')
                    ->where('tenant_id', $tenantId)
                    ->whereIn('reference_type', ['production_orders', 'production_order', 'cutting_orders', 'cutting_order'])
                    ->whereIn('reference_id', $validReferenceIds)
                    ->where('direction', 'IN')
                    ->sum(DB::raw('quantity * unit_cost'));

                $materialsCost = max(0.0, round($outCost - $inReturnCost, 4));
            }

            // 2. حساب تكلفة الأجور الصناعية المباشرة
            if (isset($overrides['direct_labor_cost'])) {
                $laborCost = (float)$overrides['direct_labor_cost'];
            } else {
                $approvedLabor = (float)PieceWorkLog::where('tenant_id', $tenantId)
                    ->where('production_order_id', $order->id)
                    ->whereIn('status', ['approved', 'settled'])
                    ->sum('total_amount');

                $laborCost = $approvedLabor > 0
                    ? $approvedLabor
                    : (float)PieceWorkLog::where('tenant_id', $tenantId)
                        ->where('production_order_id', $order->id)
                        ->where('status', '!=', 'rejected')
                        ->sum('total_amount');
            }

            $subcontractCost = (float)($overrides['subcontracted_services_cost'] ?? 0);

            // 3. احتساب التكاليف غير المباشرة وطريقة التحميل
            $allocationMethod = $overrides['overhead_allocation_method'] ?? 'direct_labor_cost_pct';
            $tenant = \App\Models\Tenant::find($tenantId);
            $overheadRate = $tenant ? $tenant->getManufacturingOverheadRate() : 0.15;

            if (isset($overrides['applied_overhead_rate']) && is_numeric($overrides['applied_overhead_rate'])) {
                $overheadRate = max(0.0, min(1.0, (float)$overrides['applied_overhead_rate']));
            }

            $overheadCost = 0.0;
            if (isset($overrides['allocated_overhead_cost'])) {
                $overheadCost = (float)$overrides['allocated_overhead_cost'];
            } else {
                if (!empty($overrides['overhead_allocation_method']) && $allocationMethod === 'direct_labor_cost_pct') {
                    $overheadCost = round($laborCost * $overheadRate, 4);
                } elseif ($allocationMethod === 'per_unit') {
                    $unitRate = (float)($overrides['per_unit_overhead_rate'] ?? 2.5);
                    $plannedQty = (int)($order->total_planned_quantity ?: 1);
                    $overheadCost = round($plannedQty * $unitRate, 4);
                } else {
                    $overheadCost = round(($materialsCost + $laborCost) * $overheadRate, 4);
                }
            }

            $totalCost = round($materialsCost + $laborCost + $subcontractCost + $overheadCost, 4);

            // 4. احتساب القطع السليمة المقبولة واستيعاب تكلفة الهالك
            $scrappedPieces = (int)DB::table('cutting_bundles')
                ->where('tenant_id', $tenantId)
                ->where('production_order_id', $order->id)
                ->where('status', 'scrapped')
                ->sum('quantity');

            $qualityScrapPieces = (int)DB::table('quality_inspections')
                ->where('tenant_id', $tenantId)
                ->where('production_order_id', $order->id)
                ->whereNull('cutting_bundle_id')
                ->where('decision', 'rejected')
                ->sum('rejected_quantity');

            $totalScrap = $scrappedPieces + $qualityScrapPieces;

            $rawPieces = (int)($order->total_completed_quantity ?: ($order->total_planned_quantity ?: ($order->total_quantity ?? 0)));
            $acceptedPieces = $rawPieces - $totalScrap;

            if ($acceptedPieces <= 0) {
                throw ValidationException::withMessages([
                    'accepted_quantity' => ['لا يمكن احتساب أو اعتماد تكلفة القطعة لعدم وجود قطع سليمة مقبولة (الكمية المقبولة صفر أو تم إتلاف كافة قطع أمر الإنتاج كهالك). يرجى قيد إجمالي التكاليف كخسائر تلف صناعي بدلاً من اختلاق تكلفة وحدة وهمية.'],
                ]);
            }

            $costPerPiece = round($totalCost / $acceptedPieces, 4);
            $scrapCost = round($totalScrap * $costPerPiece, 4);

            // التكاليف المعيارية / المخططة والانحراف
            $plannedTotalCost = (float)($overrides['planned_total_cost'] ?? ($order->planned_cost ?? 0));
            $varianceAmount = round($totalCost - $plannedTotalCost, 4);
            $variancePercentage = $plannedTotalCost > 0 ? round(($varianceAmount / $plannedTotalCost) * 100, 2) : 0;

            $costSheet = ProductionCostSheet::updateOrCreate(
                [
                    'tenant_id' => $tenantId,
                    'production_order_id' => $order->id,
                ],
                [
                    'garment_model_id' => $order->garment_model_id,
                    'costing_method' => $overrides['costing_method'] ?? 'actual',
                    'overhead_allocation_method' => $allocationMethod,
                    'total_produced_pieces' => $acceptedPieces,
                    'direct_materials_cost' => $materialsCost,
                    'direct_labor_cost' => $laborCost,
                    'subcontracted_services_cost' => $subcontractCost,
                    'allocated_overhead_cost' => $overheadCost,
                    'applied_overhead_rate' => $overheadRate,
                    'total_cost' => $totalCost,
                    'cost_per_piece' => $costPerPiece,
                    'planned_materials_cost' => $overrides['planned_materials_cost'] ?? 0,
                    'planned_labor_cost' => $overrides['planned_labor_cost'] ?? 0,
                    'planned_total_cost' => $plannedTotalCost,
                    'scrap_pieces' => $totalScrap,
                    'scrap_cost' => $scrapCost,
                    'variance_amount' => $varianceAmount,
                    'variance_percentage' => $variancePercentage,
                    'notes' => $overrides['notes'] ?? null,
                    'status' => 'calculated',
                ]
            );

            try {
                AuditLog::create([
                    'tenant_id' => $tenantId,
                    'user_id' => auth()->id(),
                    'action' => $existingCostSheet ? 'cost_sheet.recalculated' : 'cost_sheet.calculated',
                    'auditable_type' => ProductionCostSheet::class,
                    'auditable_id' => $costSheet->id,
                    'new_values' => [
                        'direct_materials_cost' => $materialsCost,
                        'direct_labor_cost' => $laborCost,
                        'allocated_overhead_cost' => $overheadCost,
                        'total_cost' => $totalCost,
                        'cost_per_piece' => $costPerPiece,
                        'accepted_pieces' => $acceptedPieces,
                        'scrapped_pieces' => $totalScrap,
                    ],
                    'ip_address' => request()->ip(),
                ]);
            } catch (\Throwable $e) {}

            return $costSheet->load(['productionOrder', 'garmentModel']);
        });
    }

    /**
     * مطابقة حسابات العملاء الفرعية مع حساب المراقبة (AR Reconciliation)
     */
    public function reconcileAccountsReceivable(string $tenantId): array
    {
        $arAccount = $this->getMappedAccount($tenantId, 'ar_control');
        $glBalance = (float)$arAccount->current_balance;

        $customers = Customer::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->get();

        $breakdown = [];
        $subledgerSum = 0;

        foreach ($customers as $c) {
            $invoicesDue = (float)SalesInvoice::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('customer_id', $c->id)
                ->where('status', '!=', 'cancelled')
                ->sum('balance_due');
            $opBal = (float)($c->opening_balance ?? 0);
            $totalCustomerDue = round($invoicesDue + $opBal, 2);

            if (abs($totalCustomerDue) > 0.001) {
                $subledgerSum += $totalCustomerDue;
                $breakdown[] = [
                    'id' => $c->id,
                    'code' => $c->code ?? ('CUST-' . substr($c->id, 0, 5)),
                    'name' => $c->name,
                    'phone' => $c->phone,
                    'contact_person' => $c->contact_person ?? null,
                    'invoices_due' => $invoicesDue,
                    'opening_balance' => $opBal,
                    'total_balance' => $totalCustomerDue,
                ];
            }
        }

        $subledgerSum = round($subledgerSum, 4);
        $variance = round($glBalance - $subledgerSum, 4);

        return [
            'tenant_id' => $tenantId,
            'control_account' => [
                'id' => $arAccount->id,
                'code' => $arAccount->code,
                'name' => $arAccount->name,
                'gl_balance' => $glBalance,
            ],
            'subledger_total' => $subledgerSum,
            'variance' => $variance,
            'is_matched' => abs($variance) < 0.0001,
            'breakdown' => $breakdown,
            'reconciled_at' => now()->toIso8601String(),
        ];
    }

    /**
     * مطابقة حسابات الموردين الفرعية مع حساب المراقبة (AP Reconciliation)
     */
    public function reconcileAccountsPayable(string $tenantId): array
    {
        $apAccount = $this->getMappedAccount($tenantId, 'ap_control');
        $glBalance = (float)$apAccount->current_balance;

        $suppliers = Supplier::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->get();

        $breakdown = [];
        $subledgerSum = 0;

        foreach ($suppliers as $s) {
            $invoicesDue = (float)SupplierInvoice::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('supplier_id', $s->id)
                ->where('payment_status', '!=', 'paid')
                ->sum(DB::raw('total_amount - paid_amount'));
            $currBal = (float)($s->current_balance ?? 0);
            // The supplier subledger balance is authoritative. Using max(invoice due, balance)
            // masks differences instead of reconciling them.
            $totalSupplierDue = round($currBal, 2);

            if (abs($totalSupplierDue) > 0.001) {
                $subledgerSum += $totalSupplierDue;
                $breakdown[] = [
                    'id' => $s->id,
                    'code' => $s->code ?? ('SUP-' . substr($s->id, 0, 5)),
                    'name' => $s->name,
                    'phone' => $s->phone,
                    'contact_person' => $s->contact_person ?? null,
                    'invoices_due' => $invoicesDue,
                    'current_balance' => $currBal,
                    'total_balance' => $totalSupplierDue,
                ];
            }
        }

        $subledgerSum = round($subledgerSum, 4);
        $variance = round($glBalance - $subledgerSum, 4);

        return [
            'tenant_id' => $tenantId,
            'control_account' => [
                'id' => $apAccount->id,
                'code' => $apAccount->code,
                'name' => $apAccount->name,
                'gl_balance' => $glBalance,
            ],
            'subledger_total' => $subledgerSum,
            'variance' => $variance,
            'is_matched' => abs($variance) < 0.0001,
            'breakdown' => $breakdown,
            'reconciled_at' => now()->toIso8601String(),
        ];
    }

    /**
     * مطابقة حسابات الخزائن والبنوك الفعلية مع الأستاذ العام (Treasury Reconciliation)
     */
    public function reconcileTreasury(string $tenantId): array
    {
        $financialAccounts = FinancialAccount::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->get();

        $coaIds = $financialAccounts->pluck('chart_of_account_id')->filter()->unique();
        $coas = ChartOfAccount::withoutGlobalScopes()->whereIn('id', $coaIds)->get()->keyBy('id');

        $subledgerSum = 0;
        $glSum = 0;
        $breakdown = [];

        foreach ($financialAccounts as $acc) {
            $coa = $acc->chart_of_account_id && $coas->has($acc->chart_of_account_id) ? $coas->get($acc->chart_of_account_id) : null;
            $actualBal = (float)$acc->current_balance;
            $glBal = $coa ? (float)$coa->current_balance : 0;
            $diff = round($glBal - $actualBal, 4);

            $subledgerSum += $actualBal;
            $glSum += $glBal;

            $breakdown[] = [
                'id' => $acc->id,
                'name' => $acc->name,
                'type' => $acc->type,
                'account_number' => $acc->account_number,
                'gl_account_code' => $coa ? $coa->code : null,
                'gl_account_name' => $coa ? $coa->name : null,
                'actual_balance' => $actualBal,
                'gl_balance' => $glBal,
                'variance' => $diff,
                'is_matched' => abs($diff) < 0.01,
            ];
        }

        $variance = round($glSum - $subledgerSum, 4);

        return [
            'tenant_id' => $tenantId,
            'gl_total' => $glSum,
            'actual_treasury_total' => $subledgerSum,
            'variance' => $variance,
            'is_matched' => abs($variance) < 0.01,
            'breakdown' => $breakdown,
            'reconciled_at' => now()->toIso8601String(),
        ];
    }

    /**
     * إنشاء قيد تسوية ومطابقة آلي لموازنة أرصدة الخزائن والبنوك مع الأستاذ العام
     */
    public function autoReconcileTreasury(string $tenantId, ?string $offsetAccountId = null): array
    {
        $rec = $this->reconcileTreasury($tenantId);
        $variance = $rec['variance'];

        if (abs($variance) < 0.01) {
            return [
                'success' => true,
                'message' => 'حسابات الخزائن والبنوك متطابقة 100% مع الأستاذ العام ولا يوجد فارق للتسوية.',
                'reconciliation' => $rec,
            ];
        }

        if (!$offsetAccountId) {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereIn('code', ['3010', '3020'])
                ->where('is_postable', true)
                ->first();
            $offsetAccountId = $offsetAcc ? $offsetAcc->id : null;
        } else {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()->find($offsetAccountId);
        }

        if (!$offsetAcc) {
            throw new Exception('لا يوجد حساب مقابل معتمد لتسجيل قيد تسوية الخزائن والبنوك');
        }

        $lines = [];
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($rec['breakdown'] as $row) {
            $diff = $row['variance'];
            if (abs($diff) < 0.01 || empty($row['gl_account_code'])) {
                continue;
            }
            $coa = ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('code', $row['gl_account_code'])
                ->first();
            if (!$coa) continue;

            $absDiff = abs($diff);
            if ($diff < 0) {
                $lines[] = [
                    'account_id' => $coa->id,
                    'debit' => $absDiff,
                    'credit' => 0,
                    'description' => "إثبات رصيد خزينة/بنك فعلي بالأستاذ العام لمطابقة الواقع: {$row['name']}",
                ];
                $totalDebit += $absDiff;
            } else {
                $lines[] = [
                    'account_id' => $coa->id,
                    'debit' => 0,
                    'credit' => $absDiff,
                    'description' => "تخفيض وتعديل رصيد خزينة/بنك بالأستاذ العام: {$row['name']}",
                ];
                $totalCredit += $absDiff;
            }
        }

        if ($totalDebit > $totalCredit) {
            $lines[] = [
                'account_id' => $offsetAcc->id,
                'debit' => 0,
                'credit' => round($totalDebit - $totalCredit, 4),
                'description' => "الطرف المقابل لتسوية أرصدة الخزائن والبنوك - {$offsetAcc->name}",
            ];
        } elseif ($totalCredit > $totalDebit) {
            $lines[] = [
                'account_id' => $offsetAcc->id,
                'debit' => round($totalCredit - $totalDebit, 4),
                'credit' => 0,
                'description' => "الطرف المقابل لتسوية أرصدة الخزائن والبنوك - {$offsetAcc->name}",
            ];
        }

        $entry = $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'description' => "قيد تسوية ومطابقة دفتري: موازنة أرصدة الخزائن النقدية وحسابات البنوك مع الأستاذ العام",
            'entry_date' => now()->toDateString(),
            'reference_type' => 'treasury_reconciliation_adjustment',
            'lines' => $lines,
        ]);

        return [
            'success' => true,
            'message' => 'تم إنشاء قيد تسوية الخزائن والبنوك بنجاح، وأصبحت السيولة متطابقة 100%!',
            'journal_entry' => $entry,
            'reconciliation' => $this->reconcileTreasury($tenantId),
        ];
    }

    /**
     * مطابقة تقييم مخزون المستودعات مع حسابات الأستاذ العام للمخزون (Inventory Reconciliation)
     */
    public function reconcileInventory(string $tenantId): array
    {
        $glAccounts = ChartOfAccount::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->whereIn('code', ['1210', '1213', '1220', '1230'])
            ->get()
            ->keyBy('code');

        $glFabrics = $glAccounts->has('1210') ? (float)$glAccounts->get('1210')->current_balance : 0;
        $glAccessories = $glAccounts->has('1213') ? (float)$glAccounts->get('1213')->current_balance : 0;
        $glWip = $glAccounts->has('1220') ? (float)$glAccounts->get('1220')->current_balance : 0;
        $glFinished = $glAccounts->has('1230') ? (float)$glAccounts->get('1230')->current_balance : 0;

        $totalGlInventory = round($glFabrics + $glAccessories + $glWip + $glFinished, 2);

        $inventoryItems = \App\Models\InventoryItem::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->get(['item_type', 'average_cost', 'current_balance']);

        $warehouseFabricsValuation = 0.0;
        $warehouseAccessoriesValuation = 0.0;
        $warehouseFinishedValuation = 0.0;

        foreach ($inventoryItems as $item) {
            $value = (float) $item->average_cost * (float) $item->current_balance;
            $type = strtolower((string) $item->item_type);

            if (in_array($type, ['fabric_raw', 'fabric', 'yarn'], true)) {
                $warehouseFabricsValuation += $value;
            } elseif (in_array($type, ['accessory_raw', 'accessory', 'packaging', 'raw_material', 'thread', 'trims'], true)) {
                $warehouseAccessoriesValuation += $value;
            } elseif (in_array($type, ['finished_good', 'finished_product', 'finished_goods'], true)) {
                $warehouseFinishedValuation += $value;
            }
        }

        $totalWarehouseValuation = round($warehouseFabricsValuation + $warehouseAccessoriesValuation + $warehouseFinishedValuation, 2);
        // WIP has no authoritative InventoryItem subledger valuation yet. Never compare the GL balance to itself.
        $variance = null;

        return [
            'tenant_id' => $tenantId,
            'gl_inventory_total' => $totalGlInventory,
            'warehouse_valuation_total' => null,
            'warehouse_known_categories_total' => $totalWarehouseValuation,
            'variance' => $variance,
            'is_matched' => false,
            'wip_valuation_available' => false,
            'reconciliation_status' => 'incomplete_wip_valuation',
            'breakdown' => [
                [
                    'category' => 'الأقمشة والغزول والمنسوجات',
                    'gl_code' => '1210',
                    'gl_balance' => $glFabrics,
                    'warehouse_valuation' => round($warehouseFabricsValuation, 2),
                    'variance' => round($glFabrics - $warehouseFabricsValuation, 2),
                ],
                [
                    'category' => 'مستلزمات الإنتاج (إكسسوار، خيوط، حشو)',
                    'gl_code' => '1213',
                    'gl_balance' => $glAccessories,
                    'warehouse_valuation' => round($warehouseAccessoriesValuation, 2),
                    'variance' => round($glAccessories - $warehouseAccessoriesValuation, 2),
                ],
                [
                    'category' => 'الإنتاج تحت التشغيل (WIP)',
                    'gl_code' => '1220',
                    'gl_balance' => $glWip,
                    'warehouse_valuation' => null,
                    'variance' => null,
                    'status' => 'not_valued_from_subledger',
                ],
                [
                    'category' => 'المنتجات التامة الجاهزة للبيع',
                    'gl_code' => '1230',
                    'gl_balance' => $glFinished,
                    'warehouse_valuation' => round($warehouseFinishedValuation, 2),
                    'variance' => round($glFinished - $warehouseFinishedValuation, 2),
                ],
            ],
            'reconciled_at' => now()->toIso8601String(),
        ];
    }

    /**
     * إنشاء قيد تسوية ومطابقة آلي لموازنة حساب مراقبة العملاء مع كشوف العملاء
     */
    public function autoReconcileAR(string $tenantId, ?string $offsetAccountId = null): array
    {
        $rec = $this->reconcileAccountsReceivable($tenantId);
        $variance = $rec['variance'];

        if (abs($variance) < 0.01) {
            return [
                'success' => true,
                'message' => 'حساب مراقبة العملاء متطابق 100% مع كشوف حسابات العملاء ولا يوجد فارق للتسوية.',
                'reconciliation' => $rec,
            ];
        }

        $arAccount = $this->getMappedAccount($tenantId, 'ar_control');

        // Offset account (capital or retained earnings or sales)
        if (!$offsetAccountId) {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereIn('code', ['3010', '3020', '3012', '4010'])
                ->where('is_postable', true)
                ->first();
            $offsetAccountId = $offsetAcc ? $offsetAcc->id : null;
        } else {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()->find($offsetAccountId);
        }

        if (!$offsetAcc) {
            throw new Exception('لا يوجد حساب مقابل معتمد لتسجيل قيد التسوية (رأس المال أو الأرباح المرحلة)');
        }

        $absVariance = abs($variance);
        $entryDate = now()->toDateString();
        $desc = "قيد تسوية ومطابقة دفتري: إثبات فروق مطابقة كشوف العملاء الفرعية بحساب الأستاذ العام [{$arAccount->code}]";

        if ($variance < 0) {
            $lines = [
                [
                    'account_id' => $arAccount->id,
                    'debit' => $absVariance,
                    'credit' => 0,
                    'description' => "تسوية وإثبات أرصدة العملاء المدينة في الأستاذ العام لمطابقة كشوف العملاء",
                ],
                [
                    'account_id' => $offsetAcc->id,
                    'debit' => 0,
                    'credit' => $absVariance,
                    'description' => "الطرف المقابل لتسوية أرصدة العملاء المدينين - {$offsetAcc->name}",
                ],
            ];
        } else {
            $lines = [
                [
                    'account_id' => $offsetAcc->id,
                    'debit' => $absVariance,
                    'credit' => 0,
                    'description' => "الطرف المقابل لتسوية أرصدة العملاء - {$offsetAcc->name}",
                ],
                [
                    'account_id' => $arAccount->id,
                    'debit' => 0,
                    'credit' => $absVariance,
                    'description' => "تخفيض وتعديل رصيد العملاء بالأستاذ لمطابقة كشوف العملاء",
                ],
            ];
        }

        $entry = $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'description' => $desc,
            'entry_date' => $entryDate,
            'reference_type' => 'ar_reconciliation_adjustment',
            'lines' => $lines,
        ]);

        return [
            'success' => true,
            'message' => 'تم إنشاء قيد التسوية بنجاح، وأصبح حساب العملاء متطابقاً 100% مع كشوف حسابات العملاء!',
            'journal_entry' => $entry,
            'reconciliation' => $this->reconcileAccountsReceivable($tenantId),
        ];
    }

    /**
     * إنشاء قيد تسوية ومطابقة آلي لموازنة حساب مراقبة الموردين مع كشوف الموردين
     */
    public function autoReconcileAP(string $tenantId, ?string $offsetAccountId = null): array
    {
        $rec = $this->reconcileAccountsPayable($tenantId);
        $variance = $rec['variance'];

        if (abs($variance) < 0.01) {
            return [
                'success' => true,
                'message' => 'حساب مراقبة الموردين متطابق 100% مع كشوف حسابات الموردين ولا يوجد فارق للتسوية.',
                'reconciliation' => $rec,
            ];
        }

        $apAccount = $this->getMappedAccount($tenantId, 'ap_control');

        // Offset account (raw materials inventory 1210 or capital 3010)
        if (!$offsetAccountId) {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->whereIn('code', ['1210', '3010', '3020', '5010'])
                ->where('is_postable', true)
                ->first();
            $offsetAccountId = $offsetAcc ? $offsetAcc->id : null;
        } else {
            $offsetAcc = ChartOfAccount::withoutGlobalScopes()->find($offsetAccountId);
        }

        if (!$offsetAcc) {
            throw new Exception('لا يوجد حساب مقابل معتمد لتسجيل قيد تسوية الموردين');
        }

        $absVariance = abs($variance);
        $entryDate = now()->toDateString();
        $desc = "قيد تسوية ومطابقة دفتري: إثبات فروق مطابقة كشوف الموردين الفرعية بحساب الأستاذ العام [{$apAccount->code}]";

        if ($variance < 0) {
            $lines = [
                [
                    'account_id' => $offsetAcc->id,
                    'debit' => $absVariance,
                    'credit' => 0,
                    'description' => "إثبات خامات / رأس مال مقابل تسوية مستحقات الموردين - {$offsetAcc->name}",
                ],
                [
                    'account_id' => $apAccount->id,
                    'debit' => 0,
                    'credit' => $absVariance,
                    'description' => "تسوية وإثبات التزامات الموردين الدائنة في الأستاذ العام لمطابقة كشوف الموردين",
                ],
            ];
        } else {
            $lines = [
                [
                    'account_id' => $apAccount->id,
                    'debit' => $absVariance,
                    'credit' => 0,
                    'description' => "تعديل رصيد الموردين في الأستاذ العام",
                ],
                [
                    'account_id' => $offsetAcc->id,
                    'debit' => 0,
                    'credit' => $absVariance,
                    'description' => "الطرف المقابل لتسوية مستحقات الموردين - {$offsetAcc->name}",
                ],
            ];
        }

        $entry = $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'description' => $desc,
            'entry_date' => $entryDate,
            'reference_type' => 'ap_reconciliation_adjustment',
            'lines' => $lines,
        ]);

        return [
            'success' => true,
            'message' => 'تم إنشاء قيد التسوية بنجاح، وأصبح حساب الموردين متطابقاً 100% مع كشوف حسابات الموردين!',
            'journal_entry' => $entry,
            'reconciliation' => $this->reconcileAccountsPayable($tenantId),
        ];
    }

    /**
     * ترحيل صرف خامات التشغيل لأمر القص (من خامات إلى إنتاج تحت التشغيل WIP)
     * قاعدة: أمانات خامات العملاء CMT قيمتها 0.00 ولا ينشأ عنها قيد محاسبي
     */
    public function postRawMaterialsIssue(string $tenantId, $cuttingOrder, float $amount, ?string $entryDate = null): ?JournalEntry
    {
        if ($amount <= 0) return null;

        $orderId = is_object($cuttingOrder) ? $cuttingOrder->id : $cuttingOrder;
        $orderNumber = is_object($cuttingOrder) ? ($cuttingOrder->order_number ?? $orderId) : $orderId;

        // التحقق من الترحيل المسبق
        $existing = $this->findJournalEntryByReference($tenantId, 'cutting_order_issue', $orderId);
        if ($existing) return $existing;

        $wipAccount = $this->getMappedAccount($tenantId, 'wip_inventory');
        $rawAccount = $this->getMappedAccount($tenantId, 'raw_materials_inventory');

        $lines = [
            [
                'account_id' => $wipAccount->id,
                'debit' => $amount,
                'credit' => 0,
                'description' => "صرف قماش وخامات لأمر القص {$orderNumber} إلى إنتاج تحت التشغيل",
            ],
            [
                'account_id' => $rawAccount->id,
                'debit' => 0,
                'credit' => $amount,
                'description' => "إخراج خامات من مخزن الأقمشة لأمر القص {$orderNumber}",
            ]
        ];

        return $this->createJournalEntry([
            'entry_number' => 'JE-CUT-' . substr(md5($orderId), 0, 8),
            'entry_date' => $entryDate ?? now()->toDateString(),
            'description' => "صرف خامات أمر القص {$orderNumber}",
            'reference_type' => 'cutting_order_issue',
            'reference_id' => $orderId,
            'lines' => $lines,
        ]);
    }

    /**
     * قيد عكسي عند إلغاء أمر القص لاستعادة قيمة الخامات من WIP إلى مخزن الخامات
     */
    public function postRawMaterialsIssueReversal(string $tenantId, $cuttingOrder, float $amount, string $reason): ?JournalEntry
    {
        if ($amount <= 0) return null;

        $orderId = is_object($cuttingOrder) ? $cuttingOrder->id : $cuttingOrder;
        $orderNumber = is_object($cuttingOrder) ? ($cuttingOrder->order_number ?? $orderId) : $orderId;

        $existing = $this->findJournalEntryByReference($tenantId, 'cutting_order_reversal', $orderId);
        if ($existing) return $existing;

        $wipAccount = $this->getMappedAccount($tenantId, 'wip_inventory');
        $rawAccount = $this->getMappedAccount($tenantId, 'raw_materials_inventory');

        $lines = [
            [
                'account_id' => $rawAccount->id,
                'debit' => $amount,
                'credit' => 0,
                'description' => "استرجاع خامات أمر القص الملغي {$orderNumber} إلى مخزن الخامات - {$reason}",
            ],
            [
                'account_id' => $wipAccount->id,
                'debit' => 0,
                'credit' => $amount,
                'description' => "تخفيض تشغيل تحت التنفيذ لإلغاء أمر القص {$orderNumber}",
            ]
        ];

        return $this->createJournalEntry([
            'entry_number' => 'JE-CUT-REV-' . substr(md5($orderId), 0, 8),
            'entry_date' => now()->toDateString(),
            'description' => "استرجاع خامات أمر القص الملغي {$orderNumber}",
            'reference_type' => 'cutting_order_reversal',
            'reference_id' => $orderId,
            'lines' => $lines,
        ]);
    }

    /**
     * ترحيل استلام الإنتاج التام من خط التشغيل إلى مخزن التام (من WIP إلى Finished Goods)
     */
    public function postFinishedGoodsReceipt(string $tenantId, $order, float $totalCost, int $quantity, ?string $entryDate = null): ?JournalEntry
    {
        if ($totalCost <= 0) return null;

        $orderId = is_object($order) ? $order->id : $order;
        $orderNumber = is_object($order) ? ($order->order_number ?? $orderId) : $orderId;

        $existing = $this->findJournalEntryByReference($tenantId, 'production_receipt', $orderId);
        if ($existing) return $existing;

        $finishedAccount = $this->getMappedAccount($tenantId, 'finished_goods_inventory');
        $wipAccount = $this->getMappedAccount($tenantId, 'wip_inventory');

        $lines = [
            [
                'account_id' => $finishedAccount->id,
                'debit' => $totalCost,
                'credit' => 0,
                'description' => "استلام إنتاج تام لأمر التشغيل {$orderNumber} بواقع {$quantity} قطعة",
            ],
            [
                'account_id' => $wipAccount->id,
                'debit' => 0,
                'credit' => $totalCost,
                'description' => "إقفال تكاليف التشغيل تحت التنفيذ لأمر الإنتاج {$orderNumber}",
            ]
        ];

        return $this->createJournalEntry([
            'entry_number' => 'JE-FG-' . substr(md5($orderId), 0, 8),
            'entry_date' => $entryDate ?? now()->toDateString(),
            'description' => "استلام إنتاج تام أمر التشغيل {$orderNumber}",
            'reference_type' => 'production_receipt',
            'reference_id' => $orderId,
            'lines' => $lines,
        ]);
    }

    /**
     * ترحيل تكلفة البضاعة المباعة COGS عند تسليم أمر البيع (من مخزن التام إلى تكلفة المبيعات)
     */
    public function postSalesDeliveryCOGS(string $tenantId, $deliveryNote, float $cogsAmount, ?string $entryDate = null): ?JournalEntry
    {
        if ($cogsAmount <= 0) return null;

        $dnId = is_object($deliveryNote) ? $deliveryNote->id : $deliveryNote;
        $dnNumber = is_object($deliveryNote) ? ($deliveryNote->delivery_number ?? $dnId) : $dnId;

        $existing = $this->findJournalEntryByReference($tenantId, 'sales_delivery_cogs', $dnId);
        if ($existing) return $existing;

        $cogsAccount = $this->getMappedAccount($tenantId, 'cogs');
        $finishedAccount = $this->getMappedAccount($tenantId, 'finished_goods_inventory');

        $lines = [
            [
                'account_id' => $cogsAccount->id,
                'debit' => $cogsAmount,
                'credit' => 0,
                'description' => "تكلفة بضاعة مباعة لإذن التسليم {$dnNumber}",
            ],
            [
                'account_id' => $finishedAccount->id,
                'debit' => 0,
                'credit' => $cogsAmount,
                'description' => "خروج بضاعة تامة لإذن التسليم {$dnNumber}",
            ]
        ];

        return $this->createJournalEntry([
            'entry_number' => 'JE-COGS-' . substr(md5($dnId), 0, 8),
            'entry_date' => $entryDate ?? now()->toDateString(),
            'description' => "تكلفة مبيعات إذن تسليم {$dnNumber}",
            'reference_type' => 'sales_delivery_cogs',
            'reference_id' => $dnId,
            'lines' => $lines,
        ]);
    }

    /**
     * قيد عكسي لتكلفة المبيعات عند إلغاء إذن التسليم
     */
    public function postSalesDeliveryCOGSReversal(string $tenantId, $deliveryNote, float $cogsAmount, string $reason): ?JournalEntry
    {
        if ($cogsAmount <= 0) return null;

        $dnId = is_object($deliveryNote) ? $deliveryNote->id : $deliveryNote;
        $dnNumber = is_object($deliveryNote) ? ($deliveryNote->delivery_number ?? $dnId) : $dnId;

        $existing = $this->findJournalEntryByReference($tenantId, 'sales_delivery_cogs_reversal', $dnId);
        if ($existing) return $existing;

        $cogsAccount = $this->getMappedAccount($tenantId, 'cogs');
        $finishedAccount = $this->getMappedAccount($tenantId, 'finished_goods_inventory');

        $lines = [
            [
                'account_id' => $finishedAccount->id,
                'debit' => $cogsAmount,
                'credit' => 0,
                'description' => "استعادة بضاعة تامة لإلغاء إذن التسليم {$dnNumber} - {$reason}",
            ],
            [
                'account_id' => $cogsAccount->id,
                'debit' => 0,
                'credit' => $cogsAmount,
                'description' => "تخفيض تكلفة المبيعات لإلغاء إذن التسليم {$dnNumber}",
            ]
        ];

        return $this->createJournalEntry([
            'entry_number' => 'JE-COGS-REV-' . substr(md5($dnId), 0, 8),
            'entry_date' => now()->toDateString(),
            'description' => "استرجاع تكلفة مبيعات إذن تسليم ملغي {$dnNumber}",
            'reference_type' => 'sales_delivery_cogs_reversal',
            'reference_id' => $dnId,
            'lines' => $lines,
        ]);
    }

    /**
     * ترحيل إشعار دائن (مرتجع مبيعات) آلياً إلى دفتر الأستاذ العام
     */
    public function postCreditNote(string $tenantId, $creditNote): ?JournalEntry
    {
        $cn = is_object($creditNote) ? $creditNote : CreditNote::withoutGlobalScopes()->where('id', $creditNote)->firstOrFail();
        $amount = (float)$cn->total_amount;
        if ($amount <= 0) return null;

        $existing = $this->findJournalEntryByReference($tenantId, 'credit_note', $cn->id);
        if ($existing) return $existing;

        $revenueAccount = $this->getMappedAccount($tenantId, 'sales_revenue');
        $arAccount = $this->getMappedAccount($tenantId, 'ar_control');

        $lines = [
            [
                'account_id' => $revenueAccount->id,
                'debit' => $amount,
                'credit' => 0,
                'description' => "تخفيض إيراد مبيعات بموجب إشعار دائن {$cn->credit_note_number}",
            ],
            [
                'account_id' => $arAccount->id,
                'debit' => 0,
                'credit' => $amount,
                'description' => "تخفيض مديونية العميل بموجب إشعار دائن {$cn->credit_note_number}",
                'party_type' => 'customer',
                'party_id' => $cn->customer_id,
            ]
        ];

        $dateStr = now()->toDateString();
        if ($cn->credit_note_date) {
            $dateStr = $cn->credit_note_date instanceof \Carbon\CarbonInterface
                ? $cn->credit_note_date->toDateString()
                : (string)$cn->credit_note_date;
        }

        return $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'entry_number' => 'JE-CN-' . substr(md5($cn->id), 0, 8),
            'entry_date' => $dateStr,
            'description' => "إشعار دائن مرتجع مبيعات {$cn->credit_note_number}",
            'reference_type' => 'credit_note',
            'reference_id' => $cn->id,
            'lines' => $lines,
        ]);
    }

    /**
     * ترحيل تكاليف صيانة الماكينات وقطع الغيار آلياً إلى دفتر الأستاذ ومصروفات المصنع (حساب 6010)
     */
    public function postMaintenanceExpense(string $tenantId, $workOrder): ?JournalEntry
    {
        $wo = is_object($workOrder)
            ? $workOrder
            : \App\Models\MaintenanceWorkOrder::withoutGlobalScopes()->where('id', $workOrder)->firstOrFail();

        $totalCost = (float) $wo->total_cost;
        if ($totalCost <= 0) return null;

        $existing = $this->findJournalEntryByReference($tenantId, 'maintenance_work_order', $wo->id);
        if ($existing) return $existing;

        $machine = $wo->machine;
        $machineName = $machine ? $machine->name : 'ماكينة';

        // حساب المصروفات الصناعية غير المباشرة وصيانة الماكينات (6010)
        $overheadAccount = ChartOfAccount::where('tenant_id', $tenantId)->where('code', '6010')->first();
        if (!$overheadAccount) {
            $overheadAccount = $this->getMappedAccount($tenantId, 'direct_labor_expense');
        }

        $rawMaterialAccount = $this->getMappedAccount($tenantId, 'raw_materials_inventory');
        $cashAccount = $this->getMappedAccount($tenantId, 'default_cash');

        $lines = [];
        // طرف مدين: مصروفات الصيانة واستهلاك الماكينات
        $lines[] = [
            'account_id' => $overheadAccount->id,
            'debit' => $totalCost,
            'credit' => 0,
            'description' => "مصاريف صيانة وإصلاح ماكينة [{$machineName}] - أمر شغل {$wo->order_number}",
        ];

        $sparePartsCost = (float) $wo->spare_parts_cost;
        $laborCost = (float) $wo->labor_cost;

        if ($sparePartsCost > 0 && $laborCost > 0) {
            $lines[] = [
                'account_id' => $rawMaterialAccount->id,
                'debit' => 0,
                'credit' => $sparePartsCost,
                'description' => "صرف واستهلاك قطع غيار من المخزن لأمر صيانة {$wo->order_number}",
            ];
            $lines[] = [
                'account_id' => $cashAccount->id,
                'debit' => 0,
                'credit' => $laborCost,
                'description' => "سداد أتعاب فني صيانة الماكينة لأمر شغل {$wo->order_number}",
            ];
        } elseif ($sparePartsCost > 0) {
            $lines[] = [
                'account_id' => $rawMaterialAccount->id,
                'debit' => 0,
                'credit' => $totalCost,
                'description' => "صرف واستهلاك قطع غيار لأمر صيانة {$wo->order_number}",
            ];
        } else {
            $lines[] = [
                'account_id' => $cashAccount->id,
                'debit' => 0,
                'credit' => $totalCost,
                'description' => "تكلفة صيانة وأجور فنيين لأمر شغل {$wo->order_number}",
            ];
        }

        $dateStr = now()->toDateString();
        if (!empty($wo->completion_time)) {
            $dateStr = \Carbon\Carbon::parse($wo->completion_time)->toDateString();
        }

        return $this->createJournalEntry([
            'tenant_id' => $tenantId,
            'entry_number' => 'JE-MNT-' . substr(md5($wo->id), 0, 8),
            'entry_date' => $dateStr,
            'description' => "إثبات مصروفات صيانة ماكينة [{$machineName}] - أمر شغل {$wo->order_number}",
            'reference_type' => 'maintenance_work_order',
            'reference_id' => $wo->id,
            'lines' => $lines,
        ]);
    }
}

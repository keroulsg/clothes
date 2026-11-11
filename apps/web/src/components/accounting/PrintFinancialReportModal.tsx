import React from 'react';
import {
  Printer,
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  Layers,
} from 'lucide-react';

interface PrintFinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: 'trial-balance' | 'income-statement' | 'balance-sheet' | 'vat-summary' | 'cost-variance';
  reportData: any;
  fromDate?: string;
  toDate?: string;
  asOfDate?: string;
  isAr?: boolean;
}

export const PrintFinancialReportModal: React.FC<PrintFinancialReportModalProps> = ({
  isOpen,
  onClose,
  reportType,
  reportData,
  fromDate = '',
  toDate = '',
  asOfDate = '',
  isAr = true,
}) => {
  if (!isOpen || !reportData) return null;

  const getReportMeta = () => {
    switch (reportType) {
      case 'trial-balance':
        return {
          title: isAr ? 'ميزان المراجعة الآلي العام (بالأرصدة والمجاميع)' : 'Trial Balance Statement',
          subtitle: isAr ? 'كشف تفريغ حركات الأستاذ العام وتوازن القيود المزدوجة' : 'General Ledger Activity & Double-Entry Trial Balance',
          icon: Scale,
        };
      case 'income-statement':
        return {
          title: isAr ? 'قائمة الدخل والأرباح والخسائر التشغيلية (P&L)' : 'Income Statement (Profit & Loss)',
          subtitle: isAr ? 'تقرير الإيرادات، تكلفة الإنتاج والمبيعات، ومجمل وصافي الربح' : 'Revenues, Cost of Goods Sold, Gross Margin, & Net Income',
          icon: TrendingUp,
        };
      case 'balance-sheet':
        return {
          title: isAr ? 'الميزانية العمومية والمركز المالي' : 'Balance Sheet & Financial Position',
          subtitle: isAr ? 'حصر الأصول والالتزامات وحقوق الملكية للمصنع' : 'Assets, Liabilities, and Equity Position',
          icon: Building2,
        };
      case 'vat-summary':
        return {
          title: isAr ? 'إقرار ضريبة القيمة المضافة (نموذج 10)' : 'Value Added Tax (VAT) Return',
          subtitle: isAr ? 'كشف ضريبة المبيعات وضريبة المدخلات وصافي الضريبة المستحقة' : 'Output Tax, Input Tax & Net Tax Payable',
          icon: FileSpreadsheet,
        };
      case 'cost-variance':
        return {
          title: isAr ? 'تقرير تحليل انحرافات تكلفة التصنيع' : 'Manufacturing Cost Variance Sheet',
          subtitle: isAr ? 'مقارنة التكاليف المعيارية (BOM) بالتكاليف الفعلية ومطابقة أجور التشغيل' : 'Standard BOM Costs vs Actual Batch Costs Analysis',
          icon: Layers,
        };
      default:
        return {
          title: isAr ? 'تقرير مالي معتمد' : 'Financial Statement',
          subtitle: isAr ? 'الإدارة المالية والحسابات العامة' : 'Financial Statement',
          icon: Scale,
        };
    }
  };

  const meta = getReportMeta();
  const Icon = meta.icon;
  const formattedDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    const printContent = document.getElementById('printable-financial-report-document');
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const contentHtml = printContent.innerHTML;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8">
        <title>${meta.title} - مصنع البطل الروماني</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .table-bordered {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .table-bordered th, .table-bordered td {
            border: 1px solid #cbd5e1;
            padding: 5px 7px;
          }
          .table-bordered th {
            background-color: #f1f5f9 !important;
            font-weight: 800;
          }
          .bg-total {
            background-color: #f8fafc !important;
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div>${contentHtml}</div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{meta.title}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                  {isAr ? 'تقرير رسمي معتمد' : 'Certified Statement'}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {reportType === 'balance-sheet' ? `${isAr ? 'حتى تاريخ:' : 'As of:'} ${asOfDate}` : `${isAr ? 'نطاق الفترة:' : 'Period:'} ${fromDate} ➔ ${toDate}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة المستند الرسمي (A4)' : 'Print Statement (A4)'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-financial-report-document"
          className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 print:bg-white print:text-black print:p-0"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="border-b-2 border-slate-200 dark:border-slate-800 pb-4 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-13 h-13 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 print:border-black print:text-black">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-950 dark:text-white print:text-black">
                  {isAr ? 'مصنع البطل الروماني للملابس الجاهزة' : 'Al-Batal Al-Romany Apparel Factory'}
                </h1>
                <p className="text-xs text-amber-700 dark:text-amber-400 print:text-neutral-700 font-extrabold">
                  {meta.subtitle}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 print:text-neutral-600 font-semibold mt-0.5">
                  {isAr ? 'معتمد ومُعد وفقاً لمعايير المحاسبة المصرية (EAS) وقواعد التكاليف الصناعية' : 'Prepared in accordance with Egyptian Accounting Standards (EAS)'}
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1 font-bold">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-300 print:border-black print:text-black">
                <ShieldCheck className="w-3.5 h-3.5" />
                {meta.title}
              </div>
              <div className="text-slate-600 dark:text-slate-400 print:text-neutral-600 pt-1">
                {isAr ? 'تاريخ التقرير:' : 'Date:'} <span className="font-extrabold text-slate-900 dark:text-white print:text-black">{formattedDate}</span>
              </div>
              <div className="text-slate-600 dark:text-slate-400 print:text-neutral-600">
                {isAr ? 'العملة الرسمية:' : 'Currency:'} <span className="font-black text-slate-900 dark:text-white print:text-black">الجنيه المصري (ج.م)</span>
              </div>
            </div>
          </div>

          {/* Report Range Banner */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 print:border-neutral-300 print:bg-neutral-50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
            <div>
              <span className="text-slate-600 dark:text-slate-400">{isAr ? 'نطاق الفحص والتقييم المحاسبي:' : 'Statement Period:'} </span>
              <span className="text-slate-950 dark:text-white font-extrabold font-mono">
                {reportType === 'balance-sheet' ? `${isAr ? 'كما في تاريخ:' : 'As of:'} ${asOfDate}` : `${fromDate} ➔ ${toDate}`}
              </span>
            </div>
            {reportData.is_balanced !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600 dark:text-slate-400">{isAr ? 'حالة التوازن المحاسبي:' : 'Balance Status:'}</span>
                {reportData.is_balanced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    {isAr ? 'ميزان متوازن ومطابق 100%' : 'Balanced'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-black">
                    <AlertTriangle className="w-4 h-4" />
                    {isAr ? `فرق عدم توازن: ${reportData.difference} ج.م` : 'Unbalanced'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 1. TRIAL BALANCE TABLE */}
          {reportType === 'trial-balance' && (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 print:border-neutral-300">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 print:bg-neutral-100 text-slate-900 dark:text-white font-black border-b border-slate-200 dark:border-slate-800 print:border-neutral-300">
                    <tr>
                      <th className="p-2.5">الكود</th>
                      <th className="p-2.5">اسم الحساب المحاسبي</th>
                      <th className="p-2.5 text-center">النوع</th>
                      <th className="p-2.5 text-left font-mono">أول المدة (مدين)</th>
                      <th className="p-2.5 text-left font-mono">أول المدة (دائن)</th>
                      <th className="p-2.5 text-left font-mono">حركة الفترة (مدين)</th>
                      <th className="p-2.5 text-left font-mono">حركة الفترة (دائن)</th>
                      <th className="p-2.5 text-left font-mono text-emerald-700 dark:text-emerald-400">الإقفال (مدين)</th>
                      <th className="p-2.5 text-left font-mono text-emerald-700 dark:text-emerald-400">الإقفال (دائن)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-neutral-200 bg-white dark:bg-slate-950 font-medium">
                    {reportData.rows
                      ?.filter((r: any) => {
                        const hasOpen = Number(r.opening_debit || 0) !== 0 || Number(r.opening_credit || 0) !== 0;
                        const hasPeriod = Number(r.period_debit || 0) !== 0 || Number(r.period_credit || 0) !== 0;
                        const hasClosing = Number(r.closing_debit || 0) !== 0 || Number(r.closing_credit || 0) !== 0;
                        return hasOpen || hasPeriod || hasClosing;
                      })
                      .map((row: any) => (
                        <tr key={row.account_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                          <td className="p-2.5 font-mono font-bold text-slate-700 dark:text-slate-300">{row.code}</td>
                          <td className="p-2.5 font-extrabold text-slate-950 dark:text-white print:text-black">{row.name}</td>
                          <td className="p-2.5 text-center font-bold">
                            <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {row.type}
                            </span>
                          </td>
                          <td className="p-2.5 text-left font-mono font-semibold text-slate-700 dark:text-slate-300">{Number(row.opening_debit || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-semibold text-slate-700 dark:text-slate-300">{Number(row.opening_credit || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white">{Number(row.period_debit || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-slate-900 dark:text-white">{Number(row.period_credit || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-black text-emerald-700 dark:text-emerald-400">{Number(row.closing_debit || 0).toLocaleString()}</td>
                          <td className="p-2.5 text-left font-mono font-black text-emerald-700 dark:text-emerald-400">{Number(row.closing_credit || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-100 dark:bg-slate-800/90 print:bg-neutral-100 font-black border-t-2 border-slate-300 dark:border-slate-700 print:border-neutral-300">
                    <tr>
                      <td colSpan={3} className="p-3 text-slate-950 dark:text-white print:text-black font-black">الإجمالي العام لميزان المراجعة</td>
                      <td className="p-3 text-left font-mono">{Number(reportData.totals?.opening_debit || 0).toLocaleString()}</td>
                      <td className="p-3 text-left font-mono">{Number(reportData.totals?.opening_credit || 0).toLocaleString()}</td>
                      <td className="p-3 text-left font-mono">{Number(reportData.totals?.period_debit || 0).toLocaleString()}</td>
                      <td className="p-3 text-left font-mono">{Number(reportData.totals?.period_credit || 0).toLocaleString()}</td>
                      <td className="p-3 text-left font-mono text-emerald-700 dark:text-emerald-400">{Number(reportData.totals?.closing_debit || 0).toLocaleString()}</td>
                      <td className="p-3 text-left font-mono text-emerald-700 dark:text-emerald-400">{Number(reportData.totals?.closing_credit || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 2. INCOME STATEMENT VIEW */}
          {reportType === 'income-statement' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-950/30 print:border-black print:bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase block">
                    {isAr ? 'صافي الربح النهائي للفترة (Net Profit)' : 'Net Operating Profit'}
                  </span>
                  <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {Number(reportData.net_profit || 0).toLocaleString()} <span className="text-sm font-black text-slate-700 dark:text-slate-200">جنيه مصري</span>
                  </div>
                </div>
                <div className="text-right text-xs space-y-1 font-bold">
                  <div>إجمالي الإيرادات: <span className="font-mono font-black text-slate-900 dark:text-white">{Number(reportData.revenue?.total_net_revenue || 0).toLocaleString()} ج.م</span></div>
                  <div>تكلفة المبيعات (COGS): <span className="font-mono font-black text-rose-600 dark:text-rose-400">{Number(reportData.cost_of_goods_sold?.total_cogs || 0).toLocaleString()} ج.م</span></div>
                  <div>مجمل الربح الصناعي: <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">{Number(reportData.gross_profit || 0).toLocaleString()} ج.م</span></div>
                </div>
              </div>
            </div>
          )}

          {/* 3. BALANCE SHEET VIEW */}
          {reportType === 'balance-sheet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-xs font-black text-blue-700 dark:text-blue-400 block mb-1">إجمالي الأصول (Assets)</span>
                  <div className="text-2xl font-black font-mono text-slate-950 dark:text-white">
                    {Number(reportData.assets?.total_assets || 0).toLocaleString()} ج.م
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                  <span className="text-xs font-black text-purple-700 dark:text-purple-400 block mb-1">إجمالي الخصوم وحقوق الملكية</span>
                  <div className="text-2xl font-black font-mono text-slate-950 dark:text-white">
                    {Number(reportData.liabilities_and_equity?.total || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Triplet Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-5 border-t border-slate-200 dark:border-slate-800 print:border-black text-center text-xs font-bold">
            <div>
              <span className="text-slate-900 dark:text-white print:text-black block mb-12 font-black">
                {isAr ? 'محاسب التكاليف والأستاذ العام' : 'General Ledger Accountant'}
              </span>
              <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 print:border-black w-3/4 mx-auto"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 print:text-neutral-600 block mt-1.5 font-semibold">
                {isAr ? 'تم تدقيق القيود ومطابقة اليومية' : 'Audited & Verified'}
              </span>
            </div>
            <div>
              <span className="text-slate-900 dark:text-white print:text-black block mb-12 font-black">
                {isAr ? 'مدير الإدارة المالية (CFO)' : 'Chief Financial Officer'}
              </span>
              <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 print:border-black w-3/4 mx-auto"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 print:text-neutral-600 block mt-1.5 font-semibold">
                {isAr ? 'معتمد رسمي لمجلس الإدارة' : 'Approved by CFO'}
              </span>
            </div>
            <div>
              <span className="text-slate-900 dark:text-white print:text-black block mb-12 font-black">
                {isAr ? 'المحاسب القانوني ومراقب الحسابات' : 'Certified Public Accountant'}
              </span>
              <div className="border-b-2 border-dashed border-slate-300 dark:border-slate-700 print:border-black w-3/4 mx-auto"></div>
              <span className="text-xs text-slate-500 dark:text-slate-400 print:text-neutral-600 block mt-1.5 font-semibold">
                {isAr ? 'خاتم الاعتماد والشهادة القانونية' : 'Legal Auditor Seal'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

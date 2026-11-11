import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Calendar, Building2, FileSpreadsheet, RefreshCw, AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import type { CostCenter } from '../../types';

interface CostCenterStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCenter: CostCenter | null;
  isAr?: boolean;
}

export const CostCenterStatementModal: React.FC<CostCenterStatementModalProps> = ({
  isOpen,
  onClose,
  costCenter,
  isAr = true,
}) => {
  const [statementData, setStatementData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const printSheetRef = useRef<HTMLDivElement>(null);

  const loadStatement = async () => {
    if (!costCenter) return;
    try {
      setLoading(true);
      const res = await api.accounting.getCostCenterStatement(costCenter.id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatementData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && costCenter) {
      loadStatement();
    } else {
      setStatementData(null);
      setFromDate('');
      setToDate('');
    }
  }, [isOpen, costCenter]);

  if (!isOpen || !costCenter) return null;

  const lines = statementData?.lines || [];
  const totalDebit = Number(statementData?.total_debit || 0);
  const totalCredit = Number(statementData?.total_credit || 0);
  const netExpense = Number(statementData?.net_expense || 0);

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handlePrint = () => {
    const printContent = printSheetRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-statement-iframe');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'print-statement-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html dir="rtl" lang="ar">
          <head>
            <meta charset="utf-8" />
            <title>كشف حساب مركز تكلفة - [${costCenter.code}] ${costCenter.name}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
                background: #ffffff !important;
                color: #0f172a !important;
                padding: 15mm 12mm;
                line-height: 1.5;
                font-size: 12px;
              }
              .border-b-header {
                border-bottom: 2px solid #0f172a;
                padding-bottom: 12px;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
              }
              .kpi-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 20px;
              }
              .kpi-card {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                background: #f8fafc;
              }
              .kpi-title { font-size: 11px; font-weight: 600; color: #475569; }
              .kpi-value { font-size: 15px; font-weight: 900; margin-top: 4px; font-family: monospace; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 12px;
                font-size: 11px;
              }
              th, td {
                border: 1px solid #cbd5e1;
                padding: 8px 10px;
                text-align: right;
              }
              th {
                background: #f1f5f9 !important;
                color: #0f172a;
                font-weight: bold;
              }
              tfoot td {
                background: #f8fafc !important;
                font-weight: bold;
              }
              .signatures {
                margin-top: 40px;
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 20px;
                text-align: center;
                page-break-inside: avoid;
              }
              .sign-line {
                margin-top: 45px;
                border-top: 1px dashed #64748b;
                padding-top: 4px;
                font-size: 10px;
                color: #475569;
              }
              @page { size: A4 portrait; margin: 10mm; }
              @media print {
                body { padding: 0 !important; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            window.print();
          }
        }, 200);
        return;
      }
    } catch (e) {
      console.warn('Iframe print error, falling back:', e);
    }

    window.print();
  };

  return (
    <div className="cost-center-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          .print-statement-canvas,
          .print-statement-canvas * {
            visibility: visible !important;
          }
          .cost-center-modal-backdrop {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .print-statement-canvas {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-[#0f1523] border border-amber-600/30 rounded-2xl shadow-2xl overflow-hidden my-4 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white text-slate-100">
        {/* Modal Top Bar (High Contrast & Clear) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/70 bg-slate-900/90 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{isAr ? 'كشف الحساب التحليلي لمركز التكلفة' : 'Cost Center Analytical Statement'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-black bg-amber-500 text-slate-950 shadow-sm">
                  {costCenter.code}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-300 mt-0.5">
                {costCenter.name}{' '}
                {costCenter.parent ? (
                  <span className="text-amber-400/90 font-normal">
                    ({isAr ? 'تابع لـ:' : 'Parent:'} {costCenter.parent.name})
                  </span>
                ) : (
                  <span className="text-emerald-400/90 font-normal">({isAr ? 'مركز رئيسي' : 'Main Center'})</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة كشف الحساب (Print A4)' : 'Print Statement'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar (High-Contrast, Visible Labels) */}
        <div className="px-6 py-3.5 border-b border-slate-700/70 bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'من تاريخ:' : 'From:'}</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <span>{isAr ? 'إلى تاريخ:' : 'To:'}</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:border-amber-500 focus:outline-none"
              />
            </div>
            <button
              onClick={loadStatement}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
              {isAr ? 'تصفية الفترات' : 'Apply Filter'}
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-300">
            {isAr ? 'إجمالي الحركات المسجلة:' : 'Recorded Transactions:'}{' '}
            <span className="font-bold text-amber-400 font-mono text-sm px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/30">
              {lines.length}
            </span>
          </div>
        </div>

        {/* Printable Canvas */}
        <div
          ref={printSheetRef}
          id="cost-center-print-sheet"
          className="print-statement-canvas p-6 sm:p-8 space-y-6 bg-[#0f1523] text-slate-100 print:bg-white print:text-slate-900 print:p-0 print:space-y-4"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-amber-500/40 pb-5 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black tracking-tight">مصنع البطل الروماني للملابس الجاهزة</h1>
                <p className="text-xs font-bold text-amber-400 print:text-slate-700 mt-0.5">
                  الإدارة المالية والحسابات العامة • منظومة محاسبة التكاليف الصناعية
                </p>
                <p className="text-[11px] text-slate-300 print:text-slate-600 font-medium">
                  تقرير تحليلي لمصروفات وتكاليف الأنشطة والأقسام التشغيلية
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1 font-medium">
              <div className="text-slate-300 print:text-slate-700">
                كود المركز: <span className="font-bold text-amber-400 print:text-black font-mono text-sm">[{costCenter.code}]</span>
              </div>
              <div className="text-slate-300 print:text-slate-700">
                اسم المركز: <span className="font-bold text-white print:text-black">{costCenter.name}</span>
              </div>
              <div className="text-slate-300 print:text-slate-700">
                تاريخ الإصدار: <span className="font-semibold text-white print:text-black">{currentDate}</span>
              </div>
            </div>
          </div>

          {/* 3 KPI Summary Cards (Crisp High Contrast) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 1. Debited Expenses */}
            <div className="p-4 rounded-xl border border-amber-500/30 bg-slate-900/80 print:border-slate-300 print:bg-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-300 print:text-slate-700">
                  {isAr ? 'إجمالي المصروفات المحملة (مدين)' : 'Total Debited Expenses'}
                </div>
                <div className="text-lg font-black font-mono text-amber-400 print:text-black mt-1">
                  {totalDebit.toLocaleString()} ج.م
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>

            {/* 2. Credits / Adjustments */}
            <div className="p-4 rounded-xl border border-blue-500/30 bg-slate-900/80 print:border-slate-300 print:bg-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-300 print:text-slate-700">
                  {isAr ? 'التسويات والاسترداد (دائن)' : 'Credits & Adjustments'}
                </div>
                <div className="text-lg font-black font-mono text-blue-400 print:text-black mt-1">
                  {totalCredit.toLocaleString()} ج.م
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* 3. Net Cost */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-slate-900/80 print:border-slate-300 print:bg-slate-50 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold text-slate-300 print:text-slate-700">
                  {isAr ? 'صافي التكلفة الفعلية للمركز' : 'Net Allocated Cost'}
                </div>
                <div className="text-lg font-black font-mono text-emerald-400 print:text-black mt-1">
                  {netExpense.toLocaleString()} ج.م
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div className="border border-slate-700 print:border-slate-300 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/90 print:bg-slate-100 text-slate-200 print:text-slate-900 font-bold border-b border-slate-700 print:border-slate-300">
                <tr>
                  <th className="py-2.5 px-3.5">التاريخ</th>
                  <th className="py-2.5 px-3.5">رقم القيد / السند</th>
                  <th className="py-2.5 px-3.5">الحساب المحاسبي</th>
                  <th className="py-2.5 px-3.5">البيان والشرح التفصيلي</th>
                  <th className="py-2.5 px-3.5 text-left">مدين (مصروف)</th>
                  <th className="py-2.5 px-3.5 text-left">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 print:divide-slate-200 bg-slate-900/40 print:bg-white text-slate-200 print:text-slate-900 font-medium">
                {lines.length > 0 ? (
                  lines.map((l: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/40 print:hover:bg-transparent">
                      <td className="py-2.5 px-3.5 font-mono text-slate-300 print:text-slate-800">
                        {formatCleanDate(l.journal_entry?.entry_date || l.created_at)}
                      </td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-amber-400 print:text-black">
                        {l.journal_entry?.entry_number || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-white print:text-black">
                        {l.account ? `[${l.account.code}] ${l.account.name}` : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-200 print:text-slate-700 max-w-sm">
                        {l.description || l.journal_entry?.description || '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-mono font-bold text-amber-400 print:text-black">
                        {Number(l.debit) > 0 ? `${Number(l.debit).toLocaleString()} ج.م` : '-'}
                      </td>
                      <td className="py-2.5 px-3.5 text-left font-mono text-slate-400 print:text-slate-600">
                        {Number(l.credit) > 0 ? `${Number(l.credit).toLocaleString()} ج.م` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="space-y-2.5 max-w-md mx-auto">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                          <AlertCircle className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-white print:text-black">
                          {isAr ? 'لا توجد حركات أو مصاريف مسجلة حتى الآن' : 'No Transactions Recorded Yet'}
                        </h4>
                        <p className="text-xs text-slate-300 print:text-slate-600 leading-relaxed font-normal">
                          {isAr
                            ? `مركز التكلفة [${costCenter.code} - ${costCenter.name}] لم يتم تحميل أي قيود يومية أو سندات صرف عليه حتى هذه اللحظة. بمجرد تسجيل قيد أو مصروف وربطه بهذا المركز ستظهر كافة التفاصيل هنا آلياً.`
                            : `No expenses have been allocated to cost center [${costCenter.code}] yet.`}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-800/80 print:bg-slate-100 font-bold border-t border-slate-700 print:border-slate-300 text-xs">
                <tr>
                  <td colSpan={4} className="py-2.5 px-3.5 text-right text-slate-200 print:text-slate-800">
                    {isAr ? 'الإجمالي الصافي المحمل على هذا المركز:' : 'Net Allocated Total:'}
                  </td>
                  <td className="py-2.5 px-3.5 text-left font-mono text-amber-400 print:text-black font-extrabold text-sm">
                    {netExpense.toLocaleString()} ج.م
                  </td>
                  <td className="py-2.5 px-3.5"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Sign-off block for Print */}
          <div className="signatures pt-6 border-t-2 border-slate-700 print:border-black text-center text-xs">
            <div className="space-y-12">
              <div className="font-bold text-slate-200 print:text-black">مسؤول القسم / رئيس الورشة</div>
              <div className="border-t border-dashed border-slate-600 print:border-black pt-1 text-[11px] text-slate-400 print:text-slate-600">
                التوقيع: ............................
              </div>
            </div>
            <div className="space-y-12">
              <div className="font-bold text-slate-200 print:text-black">محاسب التكاليف الصناعية</div>
              <div className="border-t border-dashed border-slate-600 print:border-black pt-1 text-[11px] text-slate-400 print:text-slate-600">
                التوقيع: ............................
              </div>
            </div>
            <div className="space-y-12">
              <div className="font-bold text-slate-200 print:text-black">المدير المالي ورئيس الحسابات (CFO)</div>
              <div className="border-t border-dashed border-slate-600 print:border-black pt-1 text-[11px] text-slate-400 print:text-slate-600">
                التوقيع والخاتم: ............................
              </div>
            </div>
          </div>

          {/* Footer note in print */}
          <div className="pt-2 text-center text-[10px] text-slate-400 print:text-slate-600 font-medium">
            نظام GarmentOS لإدارة مصانع الملابس الجاهزة • وحدة محاسبة التكاليف والأنشطة الصناعية
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { X, Printer, Calendar, Building2, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import type { FiscalPeriod, FiscalYear } from '../../types';

interface PrintFiscalPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: FiscalPeriod | null;
  fiscalYear: FiscalYear | null;
  factoryName?: string;
  isAr?: boolean;
}

export const PrintFiscalPeriodModal: React.FC<PrintFiscalPeriodModalProps> = ({
  isOpen,
  onClose,
  period,
  fiscalYear,
  factoryName = 'مصنع البطل الروماني للملابس الجاهزة',
  isAr = true,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !period) return null;

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const revenues = Number(period.revenues || 0);
  const expenses = Number(period.expenses || 0);
  const netIncome = Number(period.net_income || 0);
  const entriesCount = Number(period.entries_count || 0);

  const handlePrint = () => {
    const printContent = printSheetRef.current;
    if (!printContent) {
      window.print();
      return;
    }

    try {
      const existingFrame = document.getElementById('print-period-iframe');
      if (existingFrame) existingFrame.remove();

      const iframe = document.createElement('iframe');
      iframe.id = 'print-period-iframe';
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
            <title>محضر إقفال فترة محاسبية - ${period.name}</title>
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
                grid-template-columns: repeat(4, 1fr);
                gap: 10px;
                margin: 16px 0;
              }
              .kpi-card {
                border: 1px solid #cbd5e1;
                border-radius: 8px;
                padding: 10px;
                text-align: center;
                background: #f8fafc;
              }
              .kpi-title { font-size: 11px; font-weight: 600; color: #475569; }
              .kpi-value { font-size: 14px; font-weight: 900; margin-top: 4px; font-family: monospace; }
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
              th { background: #f1f5f9 !important; font-weight: bold; }
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
              @media print { body { padding: 0 !important; } }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm 12mm; }
          html, body { overflow: visible !important; height: auto !important; background: white !important; color: black !important; }
          body * { visibility: hidden; }
          .print-period-canvas, .print-period-canvas * { visibility: visible !important; }
          .print-period-canvas {
            position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; background: white !important; color: black !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="relative w-full max-w-3xl bg-[#0f1523] border border-amber-600/30 rounded-2xl shadow-2xl overflow-hidden my-4 text-slate-100 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/70 bg-slate-900/90 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {isAr ? 'محضر وشهادة إقفال الفترة المحاسبية (A4)' : 'Period Closing Certificate (A4)'}
              </h2>
              <p className="text-xs text-slate-300">
                {fiscalYear?.name} • {period.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/20 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة المحضر (Print)' : 'Print'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div
          ref={printSheetRef}
          className="print-period-canvas p-6 sm:p-8 space-y-6 bg-[#0f1523] text-slate-100 print:bg-white print:text-slate-900 print:p-0"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-amber-500/40 pb-5 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black">{factoryName}</h1>
                <p className="text-xs font-bold text-amber-400 print:text-slate-700 mt-0.5">
                  الإدارة المالية والحسابات العامة • قسم الرقابة الدفترية والمراجعة
                </p>
                <p className="text-[11px] text-slate-300 print:text-slate-600">
                  شهادة رسمية معتمدة لإقفال الفترة المالية وحماية الدفاتر المحاسبية
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1 font-medium">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 print:border-black print:text-black">
                <ShieldCheck className="w-3 h-3" />
                محضر رسمي معتمد
              </div>
              <div className="text-slate-300 print:text-slate-700">التاريخ: {currentDate}</div>
              <div className="text-slate-300 print:text-slate-700">الوقت: {currentTime}</div>
            </div>
          </div>

          {/* Period Title */}
          <div className="p-4 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/60 print:bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 print:text-slate-600 font-semibold">{fiscalYear?.name}</div>
              <div className="text-base font-black text-white print:text-black mt-0.5">{period.name}</div>
              <div className="text-xs font-mono text-amber-400 print:text-slate-700 mt-1">
                من: {formatCleanDate(period.start_date)} ── إلى: {formatCleanDate(period.end_date)}
              </div>
            </div>

            <div className="text-left">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black ${
                  period.status === 'closed'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 print:text-black'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 print:text-black'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                {period.status === 'closed' ? 'فترة مقفلة ومحمية نهائياً' : 'فترة مالية مفتوحة للترحيل'}
              </div>
            </div>
          </div>

          {/* 4 Financial KPI Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/80 print:bg-slate-50 text-center">
              <div className="text-[11px] font-bold text-slate-300 print:text-slate-700">إيرادات الفترة</div>
              <div className="text-sm font-black font-mono text-emerald-400 print:text-black mt-1">
                {revenues.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/80 print:bg-slate-50 text-center">
              <div className="text-[11px] font-bold text-slate-300 print:text-slate-700">مصروفات الفترة</div>
              <div className="text-sm font-black font-mono text-amber-400 print:text-black mt-1">
                {expenses.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/80 print:bg-slate-50 text-center">
              <div className="text-[11px] font-bold text-slate-300 print:text-slate-700">صافي ربح / خسارة الشهر</div>
              <div
                className={`text-sm font-black font-mono mt-1 ${
                  netIncome >= 0 ? 'text-emerald-400 print:text-black' : 'text-rose-400 print:text-black'
                }`}
              >
                {netIncome.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/80 print:bg-slate-50 text-center">
              <div className="text-[11px] font-bold text-slate-300 print:text-slate-700">القيود المرحلة</div>
              <div className="text-sm font-black font-mono text-slate-100 print:text-black mt-1">
                {entriesCount} قيد
              </div>
            </div>
          </div>

          {/* Audit Verification Checklist */}
          <div className="p-4 rounded-xl border border-slate-700 print:border-slate-300 bg-slate-900/40 print:bg-white space-y-2.5">
            <h4 className="text-xs font-black text-amber-400 print:text-black">
              إقرار التحقق والمطابقة قبل الإقفال:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 print:text-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black shrink-0" />
                <span>تم جرد ومطابقة الخزائن النقدية والبنوك.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black shrink-0" />
                <span>تم إثبات استحقاقات أجور عمال القص والخياطة.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black shrink-0" />
                <span>تمت مراجعة قيود صيانة الماكينات وهدر الأقمشة.</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 print:text-black shrink-0" />
                <span>لا توجد فواتير مبيعات أو شراء معلقة بدون ترحيل.</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="signatures pt-6 border-t-2 border-slate-700 print:border-black text-center text-xs">
            <div className="space-y-12">
              <div className="font-bold text-slate-200 print:text-black">المحاسب المالي المختص</div>
              <div className="border-t border-dashed border-slate-600 print:border-black pt-1 text-[11px] text-slate-400 print:text-slate-600">
                التوقيع: ............................
              </div>
            </div>
            <div className="space-y-12">
              <div className="font-bold text-slate-200 print:text-black">مدقق الحسابات الداخلي</div>
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
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Printer,
  X,
  Building2,
  FileCheck2,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../api/client';

interface PrintWorkerPayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  payroll: any;
  item: any;
  isAr: boolean;
}

export const PrintWorkerPayslipModal: React.FC<PrintWorkerPayslipModalProps> = ({
  isOpen,
  onClose,
  payroll,
  item,
  isAr,
}) => {
  const [fullPayslip, setFullPayslip] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen && payroll?.id && item?.id) {
      loadDetailedPayslip();
    } else {
      setFullPayslip(null);
    }
  }, [isOpen, payroll?.id, item?.id]);

  const loadDetailedPayslip = async () => {
    try {
      const res = await api.hr.getPayslip(payroll.id, item.id);
      if (res && res.data) {
        setFullPayslip(res.data);
      } else if (res) {
        setFullPayslip(res);
      }
    } catch {
      // Fallback to item
      setFullPayslip(null);
    }
  };

  if (!isOpen || !item) return null;

  const emp = fullPayslip?.employee || item.employee;
  const breakdown = item.calculation_breakdown || fullPayslip?.calculation_breakdown || {};
  const advancesList: any[] = breakdown?.advances_list || fullPayslip?.adjustments || [];
  const pieceWorkLogs: any[] = fullPayslip?.piece_work_logs || [];
  const attendancesSummary = fullPayslip?.attendances_summary || {
    payable_days: breakdown?.payable_days ?? 0,
    total_working_hours: breakdown?.working_hours ?? 0,
    total_overtime_hours: breakdown?.overtime_hours ?? 0,
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-worker-payslip-content');
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

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8">
        <title>قسيمة راتب - ${emp?.name || ''} - ${payroll?.payroll_period || ''}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
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
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 12px;
          }
          .factory-title {
            font-size: 18px;
            font-weight: 900;
            margin: 0;
            color: #000000;
          }
          .doc-title {
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            margin: 2px 0 0 0;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border: 1px solid #0f172a;
            border-radius: 6px;
            font-family: monospace;
            font-weight: bold;
            font-size: 11px;
            background: #f8fafc;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px;
            margin-bottom: 12px;
          }
          .field-label {
            font-size: 9px;
            color: #64748b;
            display: block;
          }
          .field-val {
            font-size: 11px;
            font-weight: bold;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
            margin-bottom: 12px;
          }
          th {
            background-color: #f1f5f9;
            border: 1px solid #94a3b8;
            padding: 6px 8px;
            text-align: inherit;
            font-weight: 800;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
          }
          .net-box {
            background: #f0fdf4;
            border: 2px solid #16a34a;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }
          .net-amount {
            font-size: 20px;
            font-weight: 900;
            font-family: monospace;
            color: #15803d;
          }
          .sig-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            text-align: center;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px dashed #94a3b8;
          }
          .sig-title {
            font-weight: bold;
            font-size: 10.5px;
            margin-bottom: 35px;
            display: block;
          }
          .sig-line {
            border-bottom: 1px solid #000;
            width: 80%;
            margin: 0 auto 4px auto;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-[#111217] border border-emerald-900/40 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'قسيمة ومفردات راتب العامل المعتمدة' : 'Official Worker Payslip'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {emp?.employee_code || item.id?.slice(0, 8)}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {emp?.name} • {emp?.department} ({emp?.job_title})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة القسيمة الرسمية (A4 / A5)' : 'Print Official Payslip'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable & Screen Content Area */}
        <div
          id="printable-worker-payslip-content"
          className="p-6 sm:p-8 space-y-6 text-neutral-200 bg-[#0c0d12] print:bg-white print:text-black print:p-0"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="border-b-2 border-emerald-500/40 pb-4 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 print:border-black print:text-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black">
                  {isAr ? 'مصنع البطل الروماني للملابس الجاهزة' : 'Al-Batal Al-Romany Apparel Factory'}
                </h1>
                <p className="text-xs text-emerald-400 print:text-neutral-700 font-semibold">
                  {isAr ? 'إشعار صرف مفردات الراتب والإنتاجية وأجور القطعة' : 'Piece-Rate & Payroll Disbursement Slip'}
                </p>
              </div>
            </div>
            <div className="text-left text-xs space-y-0.5 print:text-left">
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'فترة المسير:' : 'Period:'}{' '}
                <span className="font-bold text-white print:text-black font-mono">
                  {payroll?.payroll_period}
                </span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'تاريخ الإصدار:' : 'Date:'}{' '}
                <span className="font-mono">{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'حالة الصرف:' : 'Status:'}{' '}
                <span className="font-bold text-emerald-400 print:text-black">
                  {item.is_paid ? (isAr ? 'تم الصرف نقداً' : 'Paid') : (isAr ? 'جاهز ومعتمد للصرف' : 'Approved')}
                </span>
              </div>
            </div>
          </div>

          {/* Employee Bio Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'كود العامل:' : 'Code:'}</span>
              <strong className="font-mono text-emerald-400 print:text-black">{emp?.employee_code || '-'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'اسم العامل:' : 'Full Name:'}</span>
              <strong className="text-white print:text-black font-bold">{emp?.name || '-'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'القسم والوظيفة:' : 'Dept / Job:'}</span>
              <span className="text-neutral-200 print:text-neutral-800">{emp?.department} • {emp?.job_title}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'نظام الأجر:' : 'Pay Type:'}</span>
              <span className="font-bold text-amber-400 print:text-black">{emp?.pay_type}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'الفرع التشغيلي:' : 'Branch:'}</span>
              <span className="text-neutral-200 print:text-neutral-800">{emp?.branch_name || isAr ? 'المقر الرئيسي / مصنع 1' : 'Main Plant'}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'الرقم القومي:' : 'National ID:'}</span>
              <span className="font-mono text-neutral-300 print:text-neutral-800">{emp?.national_id || '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'أيام العمل المسجلة:' : 'Payable Days:'}</span>
              <span className="font-mono font-bold text-white print:text-black">{attendancesSummary.payable_days} {isAr ? 'يوم' : 'Days'}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'ساعات العمل / إضافي:' : 'Hours / OT:'}</span>
              <span className="font-mono font-bold text-white print:text-black">
                {attendancesSummary.total_working_hours} س | +{attendancesSummary.total_overtime_hours} س
              </span>
            </div>
          </div>

          {/* Piece-Rate Operations Table if any */}
          {pieceWorkLogs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-white print:text-black flex items-center justify-between">
                <span>{isAr ? 'سجل العمليات والإنتاجية بالقطعة المعتمدة:' : 'Itemized Piece-Rate Operations:'}</span>
                <span className="text-[11px] font-mono text-emerald-400 print:text-black">
                  {pieceWorkLogs.length} {isAr ? 'عملية منجزة' : 'Operations'}
                </span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-white/10 print:border-neutral-300">
                <table className="w-full text-xs text-right">
                  <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">{isAr ? 'تاريخ الإنجاز' : 'Date'}</th>
                      <th className="p-2">{isAr ? 'العملية الصناعية' : 'Operation'}</th>
                      <th className="p-2">{isAr ? 'رقم الحزمة / البالة' : 'Bundle'}</th>
                      <th className="p-2 text-center">{isAr ? 'عدد القطع' : 'Pieces'}</th>
                      <th className="p-2 text-center">{isAr ? 'فئة القطعة' : 'Rate'}</th>
                      <th className="p-2 text-left font-mono">{isAr ? 'الإجمالي (ج.م)' : 'Total (EGP)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                    {pieceWorkLogs.map((log: any, idx: number) => (
                      <tr key={log.id || idx} className="hover:bg-white/5 print:hover:bg-transparent">
                        <td className="p-2 font-mono text-neutral-500">{idx + 1}</td>
                        <td className="p-2 font-mono text-neutral-300 print:text-black">{log.work_date?.slice(0, 10)}</td>
                        <td className="p-2 font-bold text-white print:text-black">{log.piece_rate?.operation_name || log.operation_name || '-'}</td>
                        <td className="p-2 font-mono text-neutral-300 print:text-black">{log.bundle?.bundle_code || log.bundle_code || '-'}</td>
                        <td className="p-2 text-center font-mono font-bold text-emerald-400 print:text-black">{log.completed_quantity}</td>
                        <td className="p-2 text-center font-mono text-neutral-300 print:text-black">{Number(log.rate_per_unit || 0).toFixed(2)}</td>
                        <td className="p-2 text-left font-mono font-bold text-emerald-400 print:text-black">
                          {Number(log.total_amount || 0).toLocaleString()} ج.م
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Earnings vs Deductions Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Gross Earnings Box */}
            <div className="rounded-xl border border-emerald-500/30 print:border-neutral-300 bg-emerald-950/10 print:bg-transparent overflow-hidden">
              <div className="px-4 py-2 bg-emerald-500/10 print:bg-neutral-100 border-b border-emerald-500/20 print:border-neutral-300 flex justify-between items-center font-bold text-emerald-300 print:text-black">
                <span>{isAr ? '١. الاستحقاقات والأجور الإجمالية' : '1. Gross Earnings'}</span>
                <span className="font-mono">{Number(item.gross_amount).toFixed(2)} ج.م</span>
              </div>
              <div className="p-3 space-y-2 divide-y divide-white/5 print:divide-neutral-200 text-[11px]">
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'الراتب / الأجر الأساسي المعتمد:' : 'Base Salary:'}</span>
                  <strong className="font-mono">{Number(item.base_amount || 0).toFixed(2)} ج.م</strong>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'مستحقات إنتاجية أجور القطعة:' : 'Piece Rate Earnings:'}</span>
                  <strong className="font-mono text-emerald-400 print:text-black">+{Number(item.piece_rate_earnings || 0).toFixed(2)} ج.م</strong>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'أجر ساعات وأيام العمل:' : 'Hourly & Daily Wages:'}</span>
                  <strong className="font-mono">+{(Number(item.hourly_earnings || 0) + Number(item.daily_earnings || 0)).toFixed(2)} ج.م</strong>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'أجر ساعات إضافية (أوفرتايم):' : 'Overtime Earnings:'}</span>
                  <strong className="font-mono text-emerald-400 print:text-black">+{Number(item.overtime_earnings || 0).toFixed(2)} ج.م</strong>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'البدلات والمكافآت المعتمدة:' : 'Bonuses & Allowances:'}</span>
                  <strong className="font-mono text-emerald-400 print:text-black">+{Number(item.allowances_and_bonuses || 0).toFixed(2)} ج.م</strong>
                </div>
              </div>
            </div>

            {/* Deductions & Advances Box */}
            <div className="rounded-xl border border-rose-500/30 print:border-neutral-300 bg-rose-950/10 print:bg-transparent overflow-hidden">
              <div className="px-4 py-2 bg-rose-500/10 print:bg-neutral-100 border-b border-rose-500/20 print:border-neutral-300 flex justify-between items-center font-bold text-rose-300 print:text-black">
                <span>{isAr ? '٢. الاستقطاعات والسلف المنصرفة' : '2. Deductions & Advances'}</span>
                <span className="font-mono text-rose-400 print:text-black">-{Number(item.deductions_and_advances).toFixed(2)} ج.م</span>
              </div>
              <div className="p-3 space-y-2 divide-y divide-white/5 print:divide-neutral-200 text-[11px]">
                <div className="pt-1">
                  <div className="flex justify-between items-center font-bold text-white print:text-black">
                    <span>{isAr ? 'سداد سلف نقدية منصرفة:' : 'Advances Repaid:'}</span>
                    <strong className="font-mono text-rose-400 print:text-black">-{Number(item.advances_repaid || 0).toFixed(2)} ج.م</strong>
                  </div>
                  {advancesList.length > 0 && (
                    <div className="mt-1 space-y-1 ps-2 text-[10px] text-neutral-400 print:text-neutral-600 border-s-2 border-amber-500/50">
                      {advancesList.map((adv: any, aIdx: number) => (
                        <div key={adv.id || aIdx} className="flex justify-between py-0.5">
                          <span>• {adv.reason || (isAr ? 'سلفة نقدية' : 'Advance')} ({adv.adjustment_date?.slice(0, 10)})</span>
                          <span className="font-mono text-rose-400 print:text-black">-{Number(adv.deducted_amount ?? adv.amount).toLocaleString()} ج.م</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'خصومات عيوب الجودة المعتمدة:' : 'Defect Penalties:'}</span>
                  <strong className="font-mono text-rose-400 print:text-black">-{Number(item.defect_deductions || 0).toFixed(2)} ج.م</strong>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-neutral-400 print:text-neutral-600">{isAr ? 'خصومات إدارية وتأمينات:' : 'General Deductions:'}</span>
                  <strong className="font-mono text-rose-400 print:text-black">-{Number(item.general_deductions || 0).toFixed(2)} ج.م</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Golden Net Amount Banner */}
          <div className="p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-500/10 print:border-black print:bg-neutral-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-neutral-400 print:text-neutral-700 block uppercase">
                {isAr ? 'صافي المبلغ المستحق للصرف للعامل' : 'Net Salary Payable'}
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 print:text-black mt-1">
                {Number(item.net_salary).toLocaleString()} <span className="text-sm font-bold text-neutral-300 print:text-black">{isAr ? 'جنيه مصري' : 'EGP'}</span>
              </div>
            </div>
            <div className="text-left font-mono text-xs text-neutral-400 print:text-neutral-600">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 print:border-black print:text-black font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {item.is_paid ? (isAr ? 'تم الصرف نقداً بالخزينة' : 'Disbursed in Cash') : (isAr ? 'معتمد للصرف الفوري' : 'Approved for Payout')}
              </span>
            </div>
          </div>

          {/* Triplet Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/10 print:border-black text-center text-xs">
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'توقيع وبصمة العامل المستلم' : 'Worker Signature & Thumbprint'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'أقر باستلام كامل مستحقاتي نقداً' : 'Received full payment'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'توقيع الصراف / أمين الخزينة' : 'Cashier Signature'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'تم صرف النقدية من الخزينة' : 'Disbursed'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'اعتماد مدير المصنع / الحسابات' : 'Authorized Manager'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'معتمد رسمي للتشغيل' : 'Authorized'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef } from 'react';
import { Printer, X, Landmark } from 'lucide-react';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import { tafqeetNumber } from '../sales/PrintPaymentReceiptModal';
import type { BankLoan } from '../../types';

interface PrintLoanScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: BankLoan | null;
  isAr?: boolean;
}

export const PrintLoanScheduleModal: React.FC<PrintLoanScheduleModalProps> = ({
  isOpen,
  onClose,
  loan,
  isAr = true,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !loan) return null;

  const handlePrint = () => {
    window.print();
  };

  const principal = Number(loan.principal_amount || 0);
  const totalAmount = Number(loan.total_loan_amount || 0);
  const paidAmount = Number(loan.paid_amount || 0);
  const remainingAmount = Number(loan.remaining_amount || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 flex justify-center items-start animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 my-4 overflow-hidden flex flex-col">
        {/* TOP MODAL TOOLBAR (HIDDEN ON PRINT) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7F1625] text-white flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">
                {isAr ? 'معاينة وطباعة جدول أقساط وتسهيلات القرض البنكي (A4)' : 'Print Bank Loan Schedule (A4)'}
              </h2>
              <span className="text-xs text-slate-400 font-mono">{loan.loan_number}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الجدول الآن' : 'Print Schedule'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 DOCUMENT AREA */}
        <div ref={printRef} className="p-8 sm:p-12 space-y-6 bg-white text-slate-900 print:p-0 print:m-0">
          {/* FACTORY HEADER */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isAr ? 'مصنع البطل الروماني للملابس الجاهزة' : 'El Batal Apparel Factory'}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                {isAr ? 'الإدارة المالية — سجل التسهيلات الائتمانية والقروض المصرفية وجدول الأقساط' : 'Finance Administration — Bank Credit Facilities & Amortization'}
              </p>
            </div>
            <div className="text-end">
              <span className="inline-block px-3 py-1 rounded-md bg-[#7F1625] text-white font-bold text-xs">
                {isAr ? 'جدول استحقاق وسداد معتمد' : 'AMORTIZATION SCHEDULE'}
              </span>
              <p className="font-mono text-xs text-slate-500 mt-1 font-semibold">{loan.loan_number}</p>
            </div>
          </div>

          {/* LOAN SUMMARY HEADER */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'اسم القرض / الغرض الاستثماري:' : 'Loan Name:'}</span>
                <h3 className="font-black text-slate-900 text-base">{loan.name}</h3>
              </div>
              <div className="sm:text-end">
                <span className="text-xs text-slate-500 font-semibold block">{isAr ? 'البنك الممول / رقم العقد:' : 'Lender Bank:'}</span>
                <span className="font-bold text-slate-900">{loan.bank_name} {loan.contract_number ? `(${loan.contract_number})` : ''}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'أصل مبلغ القرض:' : 'Principal:'}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {principal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'معدل الفائدة السنوية:' : 'Interest Rate:'}</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {loan.interest_rate}% {loan.interest_amount > 0 ? `(${Number(loan.interest_amount).toLocaleString()} ج.م)` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'إجمالي الالتزام مع الفائدة:' : 'Total Amount:'}</span>
                <span className="font-mono font-bold text-[#7F1625] text-sm">
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'فترة السداد والدورية:' : 'Installments:'}</span>
                <span className="font-bold text-slate-900">
                  {loan.installments_count} {isAr ? 'قسطاً' : 'Installments'} ({loan.frequency === 'monthly' ? (isAr ? 'شهرياً' : 'Monthly') : (isAr ? 'ربع سنوي' : 'Quarterly')})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'المسدد حتى تاريخه:' : 'Total Paid:'}</span>
                <span className="font-mono font-bold text-emerald-700">
                  {paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'المتبقي للسداد:' : 'Remaining Balance:'}</span>
                <span className="font-mono font-bold text-rose-700">
                  {remainingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'تاريخ البداية والاستحقاق:' : 'Timeline:'}</span>
                <span className="font-mono font-bold text-slate-800">
                  {formatCleanDate(loan.start_date)} ➔ {formatCleanDate(loan.maturity_date)}
                </span>
              </div>
            </div>
          </div>

          {/* TAFQEET HIGHLIGHT */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">{isAr ? 'إجمالي الالتزام المالي بالحروف:' : 'Total in words:'}</span>
            <span className="text-amber-300 font-bold">{tafqeetNumber(totalAmount)}</span>
          </div>

          {/* INSTALLMENTS SCHEDULE TABLE */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              {isAr ? 'جدول استحقاقات وتواريخ سداد الأقساط البنكية:' : 'Installment Repayment Schedule:'}
            </h4>

            <table className="w-full text-xs border border-slate-300">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-2.5 text-center font-bold w-12">{isAr ? 'م' : '#'}</th>
                  <th className="p-2.5 text-start font-bold">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="p-2.5 text-end font-bold">{isAr ? 'أصل القسط' : 'Principal'}</th>
                  <th className="p-2.5 text-end font-bold">{isAr ? 'فائدة القسط' : 'Interest'}</th>
                  <th className="p-2.5 text-end font-bold">{isAr ? 'إجمالي القسط' : 'Total'}</th>
                  <th className="p-2.5 text-center font-bold">{isAr ? 'حالة السداد' : 'Status'}</th>
                  <th className="p-2.5 text-start font-bold">{isAr ? 'تاريخ وسند السداد' : 'Paid Date / Ref'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loan.installments.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const isOverdue = inst.status === 'overdue';

                  return (
                    <tr key={inst.id} className={isPaid ? 'bg-emerald-50/20' : isOverdue ? 'bg-rose-50/20' : ''}>
                      <td className="p-2 text-center font-mono font-bold text-slate-600">
                        {inst.installment_number}
                      </td>
                      <td className="p-2 font-mono font-bold text-slate-900">
                        {formatCleanDate(inst.due_date)}
                      </td>
                      <td className="p-2 text-end font-mono">
                        {Number(inst.principal_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-end font-mono text-slate-500">
                        {Number(inst.interest_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-end font-mono font-bold text-slate-900">
                        {Number(inst.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                      </td>
                      <td className="p-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPaid ? (isAr ? 'مسدد بنجاح' : 'Paid') : isOverdue ? (isAr ? 'متأخر للسداد' : 'Overdue') : (isAr ? 'مستحق قادم' : 'Upcoming')}
                        </span>
                      </td>
                      <td className="p-2 text-slate-600 text-[11px]">
                        {isPaid ? (
                          <span>
                            {formatCleanDate(inst.paid_at || '')} {inst.payment_reference ? `(${inst.payment_reference})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* OFFICIAL SIGNATURES (3 PARTIES) */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'إعداد محاسب التكاليف والتمويل' : 'Finance Accountant'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</p>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'مراجعة وتدقيق الحسابات' : 'Internal Audit'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</p>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'اعتماد المدير المالي ومجلس الإدارة' : 'CFO / Board Approval'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'الختم والتاريخ' : 'Stamp & Date'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

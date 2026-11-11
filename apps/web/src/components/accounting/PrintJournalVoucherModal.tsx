import React, { useRef } from 'react';
import { Printer, X, Receipt, CheckCircle2 } from 'lucide-react';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import { tafqeetNumber } from '../sales/PrintPaymentReceiptModal';
import type { JournalEntry } from '../../types';

interface PrintJournalVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  journalEntry: JournalEntry | null;
  isAr?: boolean;
}

export const PrintJournalVoucherModal: React.FC<PrintJournalVoucherModalProps> = ({
  isOpen,
  onClose,
  journalEntry,
  isAr = true,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !journalEntry) return null;

  const handlePrint = () => {
    window.print();
  };

  const entryNumber = journalEntry.entry_number || `JE-${journalEntry.id?.slice(0, 8)}`;
  const entryDate = formatCleanDate(journalEntry.entry_date || (journalEntry as any).created_at);
  const totalDebit = Number(journalEntry.total_debit || 0);
  const totalCredit = Number(journalEntry.total_credit || 0);

  // Reference label
  const getReferenceLabel = (refType?: string, desc?: string) => {
    const d = (desc || '').toLowerCase();
    if (refType === 'opening_balance' || d.includes('افتتاحي')) {
      return isAr ? '🏛️ قيد افتتاحي لأرصدة أول المدة' : 'Opening Balance Entry';
    }
    if (refType === 'cutting_order' || d.includes('قص')) {
      return isAr ? '✂️ صرف خامات أمر قص وتشغيل' : 'Cutting Order Raw Materials Issue';
    }
    if (refType === 'maintenance' || d.includes('صيانة')) {
      return isAr ? '🔧 إثبات مصروفات صيانة ماكينات' : 'Machine Maintenance Expense';
    }
    if (refType === 'receipt_voucher' || d.includes('قبض') || d.includes('تحصيل')) {
      return isAr ? '💵 سند تحصيل وقبض نقدية' : 'Customer Payment Receipt';
    }
    if (refType === 'sales_return' || d.includes('مرتجع')) {
      return isAr ? '↩️ مرتجع مبيعات وإشعار دائن' : 'Sales Return & Credit Note';
    }
    if (refType === 'refund' || d.includes('استرداد')) {
      return isAr ? '💸 صرف استرداد نقدي لمرتجع' : 'Cash Refund for Return';
    }
    if (d.includes('مصروف') || d.includes('سداد') || d.includes('نثرية')) {
      return isAr ? '💸 إثبات مصروف وسداد يومي' : 'Daily Expense Entry';
    }
    return isAr ? '📑 قيد تسوية يومية عام' : 'General Journal Entry';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 flex justify-center items-start animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 my-4 overflow-hidden flex flex-col">
        {/* TOP MODAL TOOLBAR (HIDDEN ON PRINT) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7F1625] text-white flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">
                {isAr ? 'معاينة وطباعة سند قيد اليومية (A4)' : 'Print General Journal Voucher (A4)'}
              </h2>
              <span className="text-xs text-slate-400 font-mono">{entryNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة السند الآن' : 'Print Document'}</span>
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
                {isAr
                  ? 'تصنيع وتجارة الملابس الجاهزة وتريكو القطن • خدمات التشغيل للغير CMT'
                  : 'Ready-Made Garment Manufacturing & CMT Subcontracting'}
              </p>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-4 pt-1">
                <span>س.ت: <strong>48921/القاهرة</strong></span>
                <span>ب.ض: <strong>582-391-740</strong></span>
                <span>مصلحة الضرائب المصرية</span>
              </div>
            </div>

            <div className="text-end">
              <div className="inline-block px-3 py-1 rounded-lg border-2 border-[#7F1625] text-[#7F1625] font-black text-xs uppercase tracking-wider mb-1">
                {isAr ? 'سند قيد محاسبي معتمد' : 'OFFICIAL JOURNAL VOUCHER'}
              </div>
              <p className="font-mono font-bold text-sm text-slate-900 block">{entryNumber}</p>
              <p className="text-xs text-slate-500 font-mono">{entryDate}</p>
            </div>
          </div>

          {/* VOUCHER META BOX */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'رقم القيد:' : 'Entry #:'}</span>
              <span className="font-mono font-bold text-slate-900">{entryNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'تاريخ التحرير:' : 'Date:'}</span>
              <span className="font-mono font-bold text-slate-900">{entryDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'نوع وحالة القيد:' : 'Type & Status:'}</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {journalEntry.status === 'reversed' ? (isAr ? 'معكوس / ملغي' : 'Reversed') : (isAr ? 'معتمد ومقيد' : 'Posted')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-semibold">{isAr ? 'تصنيف العملية:' : 'Reference:'}</span>
              <span className="font-bold text-slate-800 truncate block">
                {getReferenceLabel(journalEntry.reference_type, journalEntry.description)}
              </span>
            </div>
          </div>

          {/* GENERAL DESCRIPTION */}
          <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200 text-xs">
            <span className="font-bold text-slate-700 me-2">{isAr ? 'البيان العام للقيد:' : 'General Description:'}</span>
            <span className="text-slate-900 font-medium">{journalEntry.description || '—'}</span>
          </div>

          {/* BALANCED JOURNAL LINES TABLE */}
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2.5 text-start w-28">{isAr ? 'كود الحساب' : 'Code'}</th>
                  <th className="p-2.5 text-start">{isAr ? 'اسم الحساب المالي' : 'Account Name'}</th>
                  <th className="p-2.5 text-start">{isAr ? 'البيان وملاحظات السطر' : 'Line Description'}</th>
                  <th className="p-2.5 text-end w-32">{isAr ? 'مدين (ج.م)' : 'Debit (EGP)'}</th>
                  <th className="p-2.5 text-end w-32">{isAr ? 'دائن (ج.م)' : 'Credit (EGP)'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {journalEntry.lines && journalEntry.lines.length > 0 ? (
                  journalEntry.lines.map((line, idx) => {
                    const debit = Number(line.debit || 0);
                    const credit = Number(line.credit || 0);
                    const accCode = line.account?.code || (line as any).account_code || '—';
                    const accName = line.account?.name || (line as any).account_name || line.description || '—';

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-2.5 font-mono font-bold text-slate-900">{accCode}</td>
                        <td className="p-2.5 font-bold text-slate-900">
                          {accName}
                          {line.cost_center_id && (
                            <span className="text-[10px] text-slate-500 ms-1 font-mono">
                              [مركز تكلفة]
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-600">{line.description || journalEntry.description || '—'}</td>
                        <td className="p-2.5 text-end font-mono font-bold text-emerald-700">
                          {debit > 0 ? debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                        </td>
                        <td className="p-2.5 text-end font-mono font-bold text-blue-700">
                          {credit > 0 ? credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      {isAr ? 'لا توجد أطراف مسجلة لهذا القيد' : 'No lines'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                <tr>
                  <td colSpan={3} className="p-2.5 text-start font-bold">
                    {isAr ? 'الإجمالي المتوازن للقيد:' : 'Total Balanced Amount:'}
                  </td>
                  <td className="p-2.5 text-end font-mono font-black text-emerald-800 text-sm">
                    {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                  </td>
                  <td className="p-2.5 text-end font-mono font-black text-blue-800 text-sm">
                    {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* TAFQEET AMOUNT IN ARABIC WORDS */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs flex items-center justify-between">
            <span className="font-bold text-slate-700">{isAr ? 'المبلغ بالحروف العربية:' : 'Amount in Words:'}</span>
            <span className="font-bold text-[#7F1625]">{tafqeetNumber(totalDebit)}</span>
          </div>

          {/* 3 OFFICIAL SIGNATURES BLOCK */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-10">
              <span className="font-bold text-slate-700 block">{isAr ? 'إعداد المحاسب / مدخل البيانات' : 'Prepared By'}</span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'التوقيع والتاريخ' : 'Sign & Date'}</span>
            </div>

            <div className="space-y-10">
              <span className="font-bold text-slate-700 block">{isAr ? 'مراجعة وتدقيق رئيس الحسابات' : 'Audited / Reviewed By'}</span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'التوقيع والتاريخ' : 'Sign & Date'}</span>
            </div>

            <div className="space-y-10">
              <span className="font-bold text-slate-700 block">{isAr ? 'اعتماد المدير المالي / صاحب المصنع' : 'Approved By'}</span>
              <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'الختم والتوقيع الرسمي' : 'Official Seal'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

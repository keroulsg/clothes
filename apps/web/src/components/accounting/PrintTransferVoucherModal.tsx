import React, { useRef } from 'react';
import { Printer, X, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import { tafqeetNumber } from '../sales/PrintPaymentReceiptModal';
import type { FinancialAccountTransfer } from '../../types';

interface PrintTransferVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: FinancialAccountTransfer | null;
  isAr?: boolean;
}

export const PrintTransferVoucherModal: React.FC<PrintTransferVoucherModalProps> = ({
  isOpen,
  onClose,
  transfer,
  isAr = true,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transfer) return null;

  const handlePrint = () => {
    window.print();
  };

  const trfNumber = transfer.transfer_number || `TRF-${transfer.id?.slice(0, 8)}`;
  const trfDate = formatCleanDate(transfer.transfer_date || (transfer as any).created_at);
  const amount = Number(transfer.amount || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md p-2 sm:p-6 flex justify-center items-start animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 my-4 overflow-hidden flex flex-col">
        {/* TOP MODAL TOOLBAR (HIDDEN ON PRINT) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#7F1625] text-white flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm">
                {isAr ? 'معاينة وطباعة سند التحويل المالي الداخلي (A4)' : 'Print Internal Transfer Voucher (A4)'}
              </h2>
              <span className="text-xs text-slate-400 font-mono">{trfNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الإشعار الآن' : 'Print Voucher'}</span>
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
                {isAr ? 'إدارة الخزائن والحسابات المصرفية — سجل التحويلات النقدية والبنكية' : 'Treasury & Banking Administration — Internal Transfers'}
              </p>
            </div>
            <div className="text-end">
              <span className="inline-block px-3 py-1 rounded-md bg-[#7F1625] text-white font-bold text-xs">
                {isAr ? 'سند تحويل مالي معتمد' : 'TRANSFER VOUCHER'}
              </span>
              <p className="font-mono text-xs text-slate-500 mt-1 font-semibold">{trfNumber}</p>
            </div>
          </div>

          {/* VOUCHER METADATA BOX */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">{isAr ? 'رقم السند:' : 'Voucher No:'}</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{trfNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">{isAr ? 'تاريخ التحويل:' : 'Transfer Date:'}</span>
              <span className="font-bold text-slate-900">{trfDate}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">{isAr ? 'حالة الاعتماد:' : 'Status:'}</span>
              <span className="font-bold text-emerald-700 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {transfer.status === 'completed'
                  ? (isAr ? 'مكتمل ومرحل بنجاح' : 'Completed')
                  : (isAr ? 'ملغي / معكوس' : 'Reversed')}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block">{isAr ? 'العملة:' : 'Currency:'}</span>
              <span className="font-bold text-slate-900">{transfer.from_account?.currency || 'EGP'} (جنيه مصري)</span>
            </div>
          </div>

          {/* TRANSFER FLOW CARDS (FROM / TO) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* FROM ACCOUNT */}
            <div className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50/30 space-y-2">
              <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                  {isAr ? '🔻 من الحساب المالي (المرسل / خصم)' : '🔻 From Account (Sender / Debit)'}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                  {transfer.from_account?.code || 'ACC-SRC'}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {transfer.from_account?.name || transfer.from_financial_account_id}
                </p>
                {transfer.from_account?.bank_name && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {transfer.from_account.bank_name} {transfer.from_account.account_number ? `(${transfer.from_account.account_number})` : ''}
                  </p>
                )}
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded font-bold bg-white text-slate-700 border border-slate-200">
                  {transfer.from_account?.type === 'cash' ? (isAr ? 'خزينة نقدية' : 'Vault') : (isAr ? 'حساب بنكي جاري' : 'Bank Account')}
                </span>
              </div>
            </div>

            {/* TO ACCOUNT */}
            <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/30 space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  {isAr ? '🔺 إلى الحساب المالي (المستلم / إضافة)' : '🔺 To Account (Recipient / Credit)'}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  {transfer.to_account?.code || 'ACC-DST'}
                </span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {transfer.to_account?.name || transfer.to_financial_account_id}
                </p>
                {transfer.to_account?.bank_name && (
                  <p className="text-xs text-slate-600 mt-0.5">
                    {transfer.to_account.bank_name} {transfer.to_account.account_number ? `(${transfer.to_account.account_number})` : ''}
                  </p>
                )}
                <span className="inline-block mt-2 px-2 py-0.5 text-[10px] rounded font-bold bg-white text-slate-700 border border-slate-200">
                  {transfer.to_account?.type === 'cash' ? (isAr ? 'خزينة نقدية' : 'Vault') : (isAr ? 'حساب بنكي جاري' : 'Bank Account')}
                </span>
              </div>
            </div>
          </div>

          {/* AMOUNT & TAFQEET HIGHLIGHT */}
          <div className="p-5 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-xs text-slate-300 font-semibold block mb-1">
                {isAr ? 'إجمالي المبلغ المحول والمعتمد:' : 'Approved Transfer Amount:'}
              </span>
              <p className="text-xs text-amber-200 font-bold">
                {tafqeetNumber(amount)}
              </p>
            </div>
            <div className="text-end">
              <span className="font-mono text-2xl sm:text-3xl font-black text-white">
                {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className="ms-1.5 text-sm font-bold text-amber-400">
                {isAr ? 'جنيه مصري' : 'EGP'}
              </span>
            </div>
          </div>

          {/* NOTES & PURPOSE */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
            <span className="text-xs font-bold text-slate-700 block">
              {isAr ? 'البيان والغرض من التحويل:' : 'Transfer Purpose / Notes:'}
            </span>
            <p className="text-xs text-slate-800 leading-relaxed">
              {transfer.notes || (isAr ? 'تحويل مالي داخلي لتغذية السيولة بين حسابات المصنع' : 'Internal funds transfer')}
            </p>
            {transfer.journal_entry_id && (
              <p className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-200/60 mt-1">
                {isAr ? 'رقم القيد المحاسبي الآلي المرتبط:' : 'Linked Journal Entry ID:'} {transfer.journal_entry_id}
              </p>
            )}
          </div>

          {/* OFFICIAL SIGNATURES (3 PARTIES) */}
          <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'أمين الخزينة / القائم بالتحويل' : 'Transferred By'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</p>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'المستلم / أمين الحساب المودع له' : 'Received By'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'التوقيع والاسم' : 'Sign & Name'}</p>
            </div>

            <div className="space-y-12">
              <p className="font-bold text-slate-800">
                {isAr ? 'اعتماد الإدارة المالية' : 'Finance Approval'}
              </p>
              <div className="border-b border-dashed border-slate-400 mx-4"></div>
              <p className="text-[11px] text-slate-500">{isAr ? 'الختم والتاريخ' : 'Stamp & Date'}</p>
            </div>
          </div>

          {/* FOOTER AUDIT NOTE */}
          <div className="text-center text-[10px] text-slate-400 pt-4">
            {isAr
              ? 'وثيقة رسمية صادرة من النظام المحاسبي المتكامل لمصنع البطل الروماني للملابس الجاهزة — تدقيق دورة النقدية والتحويلات'
              : 'Official internal voucher generated by ERP system — El Batal Apparel Factory'}
          </div>
        </div>
      </div>
    </div>
  );
};

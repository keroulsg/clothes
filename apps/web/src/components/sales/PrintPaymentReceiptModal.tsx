import React, { useRef } from 'react';
import { Printer, X, DollarSign, CheckCircle2 } from 'lucide-react';
import { formatCleanDate, getPaymentMethodLabel } from './PrintSalesInvoiceModal';
import type { Customer } from '../../types';

interface PrintPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: any | null;
  customer?: Customer | null;
  isAr?: boolean;
}

// Helper to convert number to Arabic words (Tafqeet)
export const tafqeetNumber = (num: number): string => {
  if (!num || isNaN(num) || num <= 0) return 'صفر جنيه مصري لا غير';
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  const convertChunk = (n: number): string => {
    let s = '';
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (h > 0) s += hundreds[h];
    if (rem > 0) {
      if (s) s += ' و';
      if (rem < 20) {
        s += ones[rem];
      } else {
        const o = rem % 10;
        const t = Math.floor(rem / 10);
        if (o > 0) s += ones[o] + ' و';
        s += tens[t];
      }
    }
    return s;
  };

  const integerPart = Math.floor(num);
  const thousands = Math.floor(integerPart / 1000);
  const remainder = integerPart % 1000;

  let result = '';
  if (thousands > 0) {
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) result += convertChunk(thousands) + ' آلاف';
    else result += convertChunk(thousands) + ' ألف';
  }

  if (remainder > 0) {
    if (result) result += ' و';
    result += convertChunk(remainder);
  }

  return `فقط ${result || 'صفر'} جنيه مصري لا غير`;
};

export const PrintPaymentReceiptModal: React.FC<PrintPaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  voucher,
  customer,
  isAr = true,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !voucher) return null;

  const voucherNum = voucher.voucher_number || 'RCV-00000000';
  const voucherDate = formatCleanDate(voucher.voucher_date || voucher.created_at);
  const clientName = voucher.party_name || customer?.name || voucher.customer_name || 'العميل النقدي';
  const amount = Number(voucher.amount || 0);
  const amountWords = tafqeetNumber(amount);
  const paymentMethodLabel = getPaymentMethodLabel(voucher.payment_method, isAr);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900 print:shadow-none print:border-none print:m-0 print:max-w-none print:w-full">
        
        {/* TOP BAR (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm">
              {isAr ? `معاينة وطباعة سند القبض المالي • ${voucherNum}` : `Print Receipt Voucher • ${voucherNum}`}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة السند A4' : 'Print Voucher'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL VOUCHER SHEET (A4) */}
        <div ref={printAreaRef} className="p-8 sm:p-12 bg-white text-slate-900 text-xs font-sans print:p-6" dir={isAr ? 'rtl' : 'ltr'}>
          
          {/* VOUCHER HEADER */}
          <div className="flex items-start justify-between border-b-2 border-[#7F1625] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-[#7F1625] text-white flex items-center justify-center font-black text-sm">
                  G
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#7F1625] tracking-tight">GarmentOS Egypt</h1>
                  <p className="text-[10px] text-slate-500 font-bold">مصانع الملابس الجاهزة واليونيفورم المعتمدة</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-2">
                س.ت: CR-98421/CAIRO | ب.ض: 300-456-789
              </p>
              <p className="text-[11px] text-slate-500">
                📍 المنطقة الصناعية - العبور / القاهرة | هاتف: 02-28945600
              </p>
            </div>

            <div className="text-end">
              <div className="inline-block px-4 py-1.5 rounded-xl bg-[#7F1625]/10 border border-[#7F1625]/30 text-[#7F1625] font-black text-sm mb-2">
                {isAr ? 'سند قبض نقدية / بنك' : 'OFFICIAL PAYMENT RECEIPT'}
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                <p>
                  <span className="text-slate-500 font-sans">{isAr ? 'رقم السند: ' : 'Voucher #: '}</span>
                  <strong className="text-slate-900">{voucherNum}</strong>
                </p>
                <p>
                  <span className="text-slate-500 font-sans">{isAr ? 'تاريخ السند: ' : 'Date: '}</span>
                  <strong className="text-slate-900">{voucherDate}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* MAIN VOUCHER BODY */}
          <div className="space-y-4 my-6">
            
            {/* Amount Box */}
            <div className="p-4 rounded-2xl bg-emerald-50/60 border-2 border-emerald-500/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 block">
                  {isAr ? 'المبلغ المحصل والمستلم المقيد بالخزينة:' : 'Amount Received:'}
                </span>
                <span className="text-2xl font-black font-mono text-emerald-700">
                  {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                </span>
              </div>
              <div className="text-end">
                <span className="text-[10px] font-bold text-slate-500 block">{isAr ? 'طريقة التحصيل:' : 'Method:'}</span>
                <span className="inline-flex items-center gap-1 font-bold text-xs text-slate-800 bg-white px-3 py-1 rounded-lg border border-emerald-300 mt-1">
                  {paymentMethodLabel}
                </span>
              </div>
            </div>

            {/* Tafqeet Row */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-bold me-2">{isAr ? 'المبلغ بالحروف:' : 'In Words:'}</span>
              <span className="font-bold text-slate-900 text-xs">{amountWords}</span>
            </div>

            {/* Client Identity Row */}
            <div className="p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'وصلنا من السيد / السادة:' : 'Received From:'}</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{clientName}</p>
                {customer?.code && (
                  <span className="font-mono text-[10px] text-slate-500 font-bold block mt-0.5">
                    {isAr ? 'كود العميل: ' : 'Code: '} {customer.code}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">{isAr ? 'الحساب المودع فيه:' : 'Deposited Into:'}</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {voucher.account?.name || (isAr ? 'خزينة المصنع الرئيسية (1010)' : 'Main Treasury')}
                </p>
                {customer?.phone && (
                  <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                    {isAr ? 'هاتف: ' : 'Tel: '} {customer.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Description / Purpose / Allocation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <span className="text-slate-500 font-bold block text-[11px]">{isAr ? 'وذلك قيمة:' : 'For the Purpose of:'}</span>
              <p className="font-medium text-slate-800 text-xs">
                {voucher.notes || (voucher.allocations?.[0]?.sales_invoice?.invoice_number ? `سداد الفاتورة رقم ${voucher.allocations[0].sales_invoice.invoice_number}` : (isAr ? 'دفعة نقدية تحت الحساب لتسوية الفواتير المستحقة (FIFO)' : 'Payment on account for open invoices'))}
              </p>

              {/* Allocations Table if present */}
              {voucher.allocations && voucher.allocations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                    {isAr ? 'بيان الفواتير المسددة من هذا السند:' : 'Allocated Invoices:'}
                  </span>
                  <table className="w-full text-start text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold">
                        <th className="py-1 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                        <th className="py-1 text-end">{isAr ? 'المبلغ المخصص' : 'Allocated Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {voucher.allocations.map((alloc: any) => (
                        <tr key={alloc.id}>
                          <td className="py-1 font-bold text-slate-800">
                            {alloc.sales_invoice?.invoice_number || alloc.sales_invoice_id}
                          </td>
                          <td className="py-1 text-end font-bold text-emerald-600">
                            {Number(alloc.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* OFFICIAL SIGNATURES & STAMP BOX */}
          <div className="mt-12 pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-12">
              <span className="font-bold text-slate-700 block">{isAr ? 'توقيع المستلم / المحصل' : 'Collector Signature'}</span>
              <p className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-400 font-mono">
                ..........................................
              </p>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-slate-700 block">{isAr ? 'أمين الخزينة' : 'Cashier / Treasury'}</span>
              <p className="border-t border-dashed border-slate-300 pt-2 text-[10px] text-slate-400 font-mono">
                ..........................................
              </p>
            </div>

            <div className="space-y-12">
              <span className="font-bold text-slate-700 block">{isAr ? 'اعتماد الحسابات والمدير المالي' : 'Finance Manager / Approval'}</span>
              <div className="border-t border-dashed border-slate-300 pt-2 flex items-center justify-center gap-1 text-[10px] text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'معتمد ومقيد إلكترونياً' : 'Posted to GL'}</span>
              </div>
            </div>
          </div>

          {/* VOUCHER FOOTER */}
          <div className="mt-8 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-3">
            {isAr
              ? 'يعتبر هذا السند إيصال استلام رسمي معتمد ولا يعتد بأي تعديل أو كشط في البيانات.'
              : 'This is an official payment receipt. Any alterations or erasures render it void.'}
          </div>

        </div>

      </div>
    </div>
  );
};

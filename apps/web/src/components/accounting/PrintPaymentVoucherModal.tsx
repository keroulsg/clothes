import React from 'react';
import {
  Printer,
  X,
  Building2,
  Receipt,
} from 'lucide-react';

interface PrintPaymentVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: any;
  isAr: boolean;
}

// دالة تفقيط الأرقام إلى كلمات باللغة العربية للعملة المصرية
export function numberToArabicWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'صفر جنيه مصري لا غير';

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertHundreds(n: number): string {
    let str = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;

    if (h > 0) {
      str += hundreds[h];
    }

    if (remainder > 0) {
      if (str !== '') str += ' و';
      if (remainder < 20) {
        str += ones[remainder];
      } else {
        const t = Math.floor(remainder / 10);
        const o = remainder % 10;
        if (o > 0) {
          str += ones[o] + ' و' + tens[t];
        } else {
          str += tens[t];
        }
      }
    }
    return str;
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';

  const millions = Math.floor(integerPart / 1000000);
  const thousands = Math.floor((integerPart % 1000000) / 1000);
  const remaining = integerPart % 1000;

  if (millions > 0) {
    if (millions === 1) result += 'مليون';
    else if (millions === 2) result += 'مليونان';
    else if (millions >= 3 && millions <= 10) result += convertHundreds(millions) + ' ملايين';
    else result += convertHundreds(millions) + ' مليون';
  }

  if (thousands > 0) {
    if (result !== '') result += ' و';
    if (thousands === 1) result += 'ألف';
    else if (thousands === 2) result += 'ألفان';
    else if (thousands >= 3 && thousands <= 10) result += convertHundreds(thousands) + ' آلاف';
    else result += convertHundreds(thousands) + ' ألف';
  }

  if (remaining > 0) {
    if (result !== '') result += ' و';
    result += convertHundreds(remaining);
  }

  result += ' جنيه مصري';

  if (decimalPart > 0) {
    result += ' و' + convertHundreds(decimalPart) + ' قرشاً';
  }

  return 'فقط ' + result + ' لا غير';
}

// دالة لتنقية البيان من الرموز البرمجية UUIDs
export function cleanVoucherNotes(notes: string | undefined | null): { cleanText: string; tags: string[] } {
  if (!notes) return { cleanText: '—', tags: [] };

  const tags: string[] = [];
  let cleanText = notes;

  // استخراج معرّفات المرتجعات أو الفواتير
  const srtMatch = notes.match(/\[SRT:([^\]]+)\]/);
  if (srtMatch) {
    tags.push(`مرتجع مبيعات`);
    cleanText = cleanText.replace(/\[SRT:[^\]]+\]/, '');
  }

  const invMatch = notes.match(/\[INV:([^\]]+)\]/);
  if (invMatch) {
    tags.push(`فاتورة مبيعات`);
    cleanText = cleanText.replace(/\[INV:[^\]]+\]/, '');
  }

  cleanText = cleanText.trim();
  if (!cleanText) cleanText = 'سداد / تحصيل مالي معتمد';

  return { cleanText, tags };
}

export const PrintPaymentVoucherModal: React.FC<PrintPaymentVoucherModalProps> = ({
  isOpen,
  onClose,
  voucher,
  isAr,
}) => {
  if (!isOpen || !voucher) return null;

  const num = voucher.voucher_number || '';
  const isDisc = voucher.payment_method === 'discount' || num.startsWith('DISC-');
  const isRcv = voucher.voucher_type === 'receipt' || num.startsWith('RCV-');

  const voucherTitle = isDisc
    ? (isAr ? 'إشعار خصم وتسوية مالية' : 'Financial Discount & Settlement Note')
    : isRcv
    ? (isAr ? 'سند قبض وتحصيل نقدية' : 'Official Cash Receipt Voucher')
    : (isAr ? 'سند صرف نقدية معتمد' : 'Official Cash Payment Voucher');

  const { cleanText } = cleanVoucherNotes(voucher.notes);
  const amountNumber = Number(voucher.amount || 0);
  const arabicWords = numberToArabicWords(amountNumber);

  const formattedDate = voucher.voucher_date
    ? new Date(voucher.voucher_date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const handlePrint = () => {
    const printContent = document.getElementById('printable-voucher-document');
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
        <title>${voucherTitle} - ${voucher.voucher_number}</title>
        <style>
          @page {
            size: A5 landscape;
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
            line-height: 1.5;
          }
          .voucher-frame {
            border: 2px solid #0f172a;
            border-radius: 8px;
            padding: 16px;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }
          .factory-name {
            font-size: 17px;
            font-weight: 900;
            margin: 0;
            color: #000;
          }
          .doc-type {
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
            margin: 2px 0 0 0;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border: 1px solid #0f172a;
            border-radius: 6px;
            font-family: monospace;
            font-weight: bold;
            font-size: 11px;
            background: #f8fafc;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 12px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 10px;
          }
          .field-row {
            display: flex;
            align-items: baseline;
            gap: 6px;
          }
          .field-label {
            font-size: 10px;
            color: #475569;
            font-weight: bold;
            min-width: 90px;
          }
          .field-value {
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
          }
          .amount-box {
            background: #f0fdf4;
            border: 2px solid #16a34a;
            border-radius: 6px;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          .amount-num {
            font-size: 18px;
            font-weight: 900;
            font-family: monospace;
            color: #15803d;
          }
          .amount-words {
            font-size: 11px;
            font-weight: 700;
            color: #166534;
          }
          .notes-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 16px;
            background: #ffffff;
            font-size: 11px;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #94a3b8;
          }
          .sig-title {
            font-size: 10px;
            font-weight: bold;
            color: #334155;
            margin-bottom: 30px;
            display: block;
          }
          .sig-line {
            border-bottom: 1px solid #000;
            width: 75%;
            margin: 0 auto 4px auto;
          }
        </style>
      </head>
      <body>
        <div class="voucher-frame">
          ${printContent.innerHTML}
        </div>
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
      <div className="relative w-full max-w-3xl bg-[#111217] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              isRcv
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : isDisc
                ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
            }`}>
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{voucherTitle}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-white/10 text-white border border-white/20">
                  {voucher.voucher_number}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {voucher.party_name} • {formattedDate}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة السند الرسمي (A5)' : 'Print Voucher (A5)'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher Content Area */}
        <div
          id="printable-voucher-document"
          className="p-6 sm:p-8 space-y-5 text-neutral-200 bg-[#0c0d12] print:bg-white print:text-black print:p-0"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Official Factory Header */}
          <div className="border-b-2 border-amber-500/30 pb-4 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black">
                  {isAr ? 'مصنع البطل الروماني للملابس الجاهزة' : 'Al-Batal Al-Romany Apparel Factory'}
                </h1>
                <p className="text-xs text-amber-400 print:text-neutral-700 font-bold">
                  {voucherTitle}
                </p>
              </div>
            </div>
            <div className="text-left text-xs space-y-1 print:text-left">
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'رقم السند:' : 'Voucher No:'}{' '}
                <span className="font-bold text-white print:text-black font-mono">
                  {voucher.voucher_number}
                </span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'تاريخ المعاملة:' : 'Date:'}{' '}
                <span className="font-bold text-white print:text-black">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Party and Transaction Info Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mb-0.5">
                {isRcv ? (isAr ? 'استلمنا من السيد / الشركة:' : 'Received From:') : (isAr ? 'يصرف إلى السيد / الشركة:' : 'Paid To:')}
              </span>
              <strong className="text-base text-white print:text-black font-bold block">{voucher.party_name}</strong>
              <span className="text-[10px] text-amber-400 print:text-neutral-700 font-semibold mt-0.5 block">
                {voucher.party_type === 'supplier'
                  ? (isAr ? 'مورد معتمد للخامات والتشغيل' : 'Approved Supplier')
                  : voucher.party_type === 'customer'
                  ? (isAr ? 'عميل تجاري / منفذ بيع' : 'Customer Account')
                  : voucher.party_type === 'employee'
                  ? (isAr ? 'موظف / عامل بالإنتاج' : 'Employee / Worker')
                  : (isAr ? 'جهة تعامل أخرى' : 'Other Party')}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mb-0.5">
                {isAr ? 'طريقة السداد والتسوية:' : 'Payment Method:'}
              </span>
              <strong className="text-sm text-white print:text-black font-bold block">
                {voucher.payment_method === 'cash'
                  ? (isAr ? 'نقداً من خزينة المصنع' : 'Cash on Hand')
                  : voucher.payment_method?.includes('bank')
                  ? (isAr ? 'تحويل بنكي / إنستاباي' : 'Bank Transfer')
                  : voucher.payment_method === 'card'
                  ? (isAr ? 'بطاقة بنكية / فيزا' : 'Credit Card')
                  : voucher.payment_method === 'discount'
                  ? (isAr ? 'خصم تعجيل / تسوية تجارية' : 'Commercial Discount / Offset')
                  : voucher.payment_method === 'cheque' || voucher.payment_method === 'check'
                  ? (isAr ? 'شيك بنكي معتمد' : 'Bank Cheque')
                  : voucher.payment_method}
              </strong>
              {voucher.account && (
                <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-0.5">
                  {isAr ? 'الحساب المحاسبي:' : 'Account:'} {voucher.account.code} - {voucher.account.name}
                </span>
              )}
            </div>
          </div>

          {/* Amount Box with Arabic Number to Words */}
          <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 print:border-black print:bg-neutral-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 print:text-neutral-600 block uppercase">
                {isAr ? 'المبلغ المستحق والمسدد' : 'Disbursed / Received Amount'}
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 print:text-black mt-0.5">
                {amountNumber.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-neutral-300 print:text-black">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
            <div className="text-right sm:text-left">
              <span className="text-[10px] font-bold text-neutral-400 print:text-neutral-600 block uppercase">
                {isAr ? 'المبلغ تفقيطاً كتابةً:' : 'Amount in Words:'}
              </span>
              <div className="text-xs font-bold text-emerald-300 print:text-black mt-0.5 max-w-md">
                {arabicWords}
              </div>
            </div>
          </div>

          {/* Clean Description / Notes */}
          <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-transparent text-xs">
            <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mb-1 font-bold">
              {isAr ? 'وذلك نظير / البيان المحاسبي:' : 'Description & Notes:'}
            </span>
            <p className="text-neutral-200 print:text-black font-medium leading-relaxed">
              {cleanText}
            </p>
          </div>

          {/* Triplet Signatures for Voucher */}
          <div className="grid grid-cols-3 gap-6 pt-5 border-t border-white/10 print:border-black text-center text-xs">
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-10">
                {isRcv ? (isAr ? 'توقيع المسدد / العميل' : 'Customer Signature') : (isAr ? 'توقيع المستلم / المورد' : 'Recipient Signature')}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'أقر باستلام / سداد القيمة أعلاه' : 'Acknowledged'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-10">
                {isAr ? 'أمين الخزينة / الحسابات' : 'Cashier Signature'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'تم تقييد الحركة بالدفاتر' : 'Posted to Treasury'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-10">
                {isAr ? 'اعتماد المدير المالي / المصنع' : 'Managing Director'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'معتمد رسمي للصرف والتحصيل' : 'Authorized'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

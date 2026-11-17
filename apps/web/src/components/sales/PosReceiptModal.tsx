import React from 'react';
import { Printer, Store, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { Language, SalesInvoice } from '../../types';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
  lang?: Language;
  isAr?: boolean;
  factoryName?: string;
  factoryTaxId?: string;
  autoPrint?: boolean;
  onOpenA4Invoice?: (inv: SalesInvoice) => void;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lang = 'ar',
  isAr: propIsAr,
  factoryName,
  factoryTaxId,
  autoPrint = false,
  onOpenA4Invoice,
}) => {
  const isAr = propIsAr !== undefined ? propIsAr : lang === 'ar';

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('pos-thermal-receipt-print');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('garmentos-receipt-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'garmentos-receipt-print-frame';
        // Positioned inside viewport but at z-index -99999 so Chromium fully renders it without blank printouts
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.border = '0';
        iframe.style.opacity = '1';
        iframe.style.visibility = 'visible';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-99999';
        iframe.style.backgroundColor = '#ffffff';
        document.body.appendChild(iframe);
      }

      const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (frameDoc && iframe.contentWindow) {
        frameDoc.open();
        frameDoc.write(`
          <!DOCTYPE html>
          <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
          <head>
            <meta charset="utf-8">
            <title>${invoice.invoice_number}</title>
            <style>
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Tahoma, Arial, sans-serif !important;
                visibility: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                width: 76mm !important;
                margin: 0 auto !important;
                padding: 4mm 2mm !important;
                font-size: 11px !important;
                line-height: 1.4 !important;
                direction: ${isAr ? 'rtl' : 'ltr'};
                visibility: visible !important;
              }
              table { width: 100% !important; border-collapse: collapse !important; margin: 6px 0 !important; }
              th { border-bottom: 1px dashed #000000 !important; border-top: 1px dashed #000000 !important; padding: 4px 2px !important; font-size: 10px !important; text-align: ${isAr ? 'right' : 'left'} !important; }
              td { padding: 4px 2px !important; font-size: 10px !important; text-align: ${isAr ? 'right' : 'left'} !important; }
              .text-center { text-align: center !important; }
              .text-end { text-align: ${isAr ? 'left' : 'right'} !important; }
              .text-start { text-align: ${isAr ? 'right' : 'left'} !important; }
              .font-bold { font-weight: bold !important; }
              .font-black { font-weight: 900 !important; }
              .font-mono { font-family: monospace !important; }
              .border-b { border-bottom: 1px dashed #000000 !important; }
              .border-t { border-top: 1px solid #000000 !important; }
              .border-dashed { border-style: dashed !important; }
              .flex { display: flex !important; }
              .justify-between { justify-content: space-between !important; }
              .justify-center { justify-content: center !important; }
              .items-center { align-items: center !important; }
              .space-y-1 > * + * { margin-top: 0.25rem !important; }
              .space-y-2 > * + * { margin-top: 0.5rem !important; }
              .space-y-3 > * + * { margin-top: 0.75rem !important; }
              .bg-\\[\\#7F1625\\] { background-color: #7F1625 !important; color: #ffffff !important; }
              .text-\\[\\#7F1625\\] { color: #7F1625 !important; }
              @page { size: 80mm auto; margin: 0; }
              @media print {
                * { visibility: visible !important; }
                body { width: 76mm !important; margin: 0 auto !important; padding: 2mm 1mm !important; }
                .no-print { display: none !important; }
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
            console.warn('Receipt print fallback:', e);
            window.print();
          }
        }, 200);
        return;
      }
    } catch (e) {
      console.warn('Receipt print error:', e);
    }

    window.print();
  };

  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  const storedTenant = api.auth.getStoredTenant();
  const effectiveFactoryName =
    factoryName ||
    (invoice as any)?.tenant?.name ||
    storedTenant?.name ||
    (isAr ? 'مصنع ومعرض الملابس الجاهزة' : 'Garment Manufacturing Factory');

  const rawTaxId =
    factoryTaxId ||
    (invoice as any)?.tenant?.settings?.tax_number ||
    (invoice as any)?.tenant?.settings?.tax_id ||
    storedTenant?.settings?.tax_number;

  const effectiveTaxId = rawTaxId ? String(rawTaxId).trim() : '300-456-789';

  const isPaid = invoice.status === 'paid';
  const isRefunded = invoice.status === 'refunded';
  const isPartiallyRefunded = invoice.status === 'partially_refunded';
  const isCredited = invoice.status === 'credited';
  const isPartiallyCredited = invoice.status === 'partially_credited';

  const invoiceItems = invoice.items || [];
  const totalAmount = Number(invoice.total_amount) || 0;
  const subtotal = Number(invoice.subtotal) || totalAmount;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const discountAmount = Number(invoice.discount_amount) || 0;
  const balanceDue = Number(invoice.balance_due) || 0;

  const paymentMethodLabel = invoice.payment_method === 'cash'
    ? (isAr ? '💵 نقدي فوري (Cash)' : 'Cash')
    : invoice.payment_method === 'card'
    ? (isAr ? '💳 بطاقة بنكية (Card)' : 'Card')
    : invoice.payment_method === 'bank_transfer'
    ? (isAr ? '🏦 تحويل بنكي' : 'Bank Transfer')
    : invoice.payment_method === 'credit'
    ? (isAr ? '⏳ آجل (Credit)' : 'Credit')
    : invoice.payment_method || '—';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'معاينة وطباعة إيصال نقطة البيع (80mm)' : 'POS Thermal Receipt (80mm)'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Print Stylesheet for Pure 80mm Thermal Output */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #pos-thermal-receipt-print,
            #pos-thermal-receipt-print * {
              visibility: visible !important;
            }
            #pos-thermal-receipt-print {
              position: fixed !important;
              left: 50% !important;
              transform: translateX(-50%) !important;
              top: 0 !important;
              width: 76mm !important;
              max-width: 80mm !important;
              margin: 0 auto !important;
              padding: 4mm 2mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Cairo', system-ui, sans-serif !important;
              font-size: 11px !important;
              line-height: 1.3 !important;
              box-shadow: none !important;
              border: none !important;
            }
            #pos-thermal-receipt-print table {
              width: 100% !important;
            }
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        `}</style>

        {/* Centered 80mm Paper Container Preview */}
        <div className="flex items-center justify-center p-4 sm:p-6 bg-slate-100 dark:bg-slate-900/90 rounded-2xl overflow-x-auto">
          <div
            id="pos-thermal-receipt-print"
            className="printable-voucher w-[78mm] max-w-full bg-white text-slate-950 p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-300 font-sans text-xs leading-relaxed select-none mx-auto relative"
            style={{ width: '78mm', minHeight: '130mm' }}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Factory Emblem & Luxury Header */}
            <div className="text-center space-y-1.5 pb-3 border-b-2 border-dashed border-slate-400">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#7F1625] text-white flex items-center justify-center shadow-md">
                <Store className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-900 tracking-tight leading-snug">
                {effectiveFactoryName}
              </p>
              <p className="text-[10px] font-bold text-slate-600">
                {isAr ? 'منفذ بيع المصنع والمعرض التجاري' : 'Factory Outlet & Commercial Showroom'}
              </p>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-700">
                {isAr ? `ب.ض: ${effectiveTaxId}` : `Tax ID: ${effectiveTaxId}`}
              </div>

              {/* Status Badge */}
              <div className="pt-1">
                {isPaid && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-emerald-600 bg-emerald-50 text-emerald-800 rounded-full text-[10px] font-extrabold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{isAr ? 'إيصال بيع نقدي مسدد (PAID)' : 'PAID CASH SALE'}</span>
                  </div>
                )}
                {isRefunded && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-rose-600 bg-rose-50 text-rose-800 rounded-full text-[10px] font-extrabold">
                    <RotateCcw className="w-3 h-3 text-rose-600" />
                    <span>{isAr ? 'إيصال مرتجع مسدد نقداً (REFUNDED)' : 'REFUNDED CASH'}</span>
                  </div>
                )}
                {isPartiallyRefunded && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-amber-600 bg-amber-50 text-amber-800 rounded-full text-[10px] font-extrabold">
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>{isAr ? 'إيصال مسترجع جزئياً' : 'PARTIALLY REFUNDED'}</span>
                  </div>
                )}
                {(isCredited || isPartiallyCredited) && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-indigo-600 bg-indigo-50 text-indigo-800 rounded-full text-[10px] font-extrabold">
                    <span>{isAr ? (isPartiallyCredited ? 'إشعار دائن جزئي' : 'إشعار دائن - مرتجع بضاعة') : (isPartiallyCredited ? 'PARTIAL CREDIT NOTE' : 'CREDIT NOTE')}</span>
                  </div>
                )}
                {!isPaid && !isRefunded && !isPartiallyRefunded && !isCredited && !isPartiallyCredited && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 border border-amber-600 bg-amber-50 text-amber-800 rounded-full text-[10px] font-extrabold">
                    <span>{isAr ? `مسودة بيع غير مسددة (${invoice.status})` : `UNPAID (${invoice.status})`}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isAr ? 'رقم الإيصال:' : 'Receipt #:'}</span>
                <span className="font-black font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                <span className="font-mono text-slate-800">
                  {(invoice as any)?.created_at
                    ? new Date((invoice as any).created_at).toLocaleString(isAr ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : invoice.invoice_date}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isAr ? 'العميل:' : 'Customer:'}</span>
                <span className="font-bold text-slate-900">
                  {invoice.customer_name || (isAr ? 'عميل نقدي - المعرض' : 'Walk-in Cash Customer')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{isAr ? 'طريقة السداد:' : 'Payment:'}</span>
                <span className="font-bold text-slate-900">{paymentMethodLabel}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-400">
              <table className="w-full text-[10px] text-start">
                <thead>
                  <tr className="border-b border-slate-400 text-slate-600 font-bold">
                    <th className="text-start pb-1">{isAr ? 'الصنف والمقاس' : 'Item & Size'}</th>
                    <th className="text-center pb-1 w-8">{isAr ? 'العدد' : 'Qty'}</th>
                    <th className="text-end pb-1 w-14">{isAr ? 'السعر' : 'Price'}</th>
                    <th className="text-end pb-1 w-16">{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceItems.map((item, index) => (
                    <tr key={item.id || index} className="align-top">
                      <td className="py-1 text-start leading-tight">
                        <span className="font-bold block text-slate-900">{item.description}</span>
                        {item.variant && (
                          <span className="text-[9px] text-slate-500 block font-mono">
                            {item.variant.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-1 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-1 text-end font-mono text-slate-700">{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-1 text-end font-bold font-mono text-slate-900">{Number(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-400 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-600">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-mono font-bold">{subtotal.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>{isAr ? 'ضريبة القيمة المضافة (14%):' : 'VAT (14%):'}</span>
                  <span className="font-mono font-bold">{taxAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between items-center font-bold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                  <span>{isAr ? 'خصم نقدي مباشر للعميل:' : 'Cash Discount:'}</span>
                  <span className="font-mono">-{discountAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-black p-2 rounded-xl bg-[#7F1625] text-white">
                <span>{isAr ? 'الصافي المستحق:' : 'Grand Total:'}</span>
                <span className="font-mono text-sm">{totalAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between items-center text-xs font-bold pt-1 text-rose-700">
                  <span>{isAr ? 'المتبقي غير المسدد:' : 'Balance Due:'}</span>
                  <span className="font-mono">{balanceDue.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}
            </div>

            {/* Human-readable invoice reference; no non-scannable barcode is presented. */}
            <div className="pt-3 text-center space-y-1.5">
              <div className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                {invoice.invoice_number}
              </div>
              <p className="text-[9px] text-slate-600 leading-relaxed pt-1">
                {isAr
                  ? 'شكراً لزيارتكم! سياسة الاسترجاع والاستبدال خلال 14 يوماً مع تقديم أصل الإيصال والبضاعة بحالتها الأصلية.'
                  : 'Thank you for visiting! Returns and exchanges within 14 days with original receipt.'}
              </p>
              <p className="text-[8px] text-slate-400 font-bold">
                {isAr
                  ? 'منظومة GarmentOS Cloud لإدارة مصانع ومعارض الملابس'
                  : 'GarmentOS Cloud Apparel ERP & POS'}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 gap-2">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          <div className="flex items-center gap-2">
            {onOpenA4Invoice && (
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onOpenA4Invoice(invoice);
                }}
                icon={<Printer className="w-4 h-4 text-[#7F1625]" />}
              >
                {isAr ? 'فاتورة ضريبية رسمية (A4)' : 'Official Tax Invoice (A4)'}
              </Button>
            )}

            <Button
              variant="primary"
              onClick={handlePrint}
              icon={<Printer className="w-4 h-4" />}
              className="bg-[#7F1625] hover:bg-[#6a121e] text-white"
            >
              {isAr ? 'طباعة الإيصال الفوري (80mm)' : 'Print Thermal Receipt (80mm)'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { Language, SalesInvoice } from '../../types';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
  lang: Language;
  factoryName?: string;
  factoryTaxId?: string;
}

export const PosReceiptModal: React.FC<PosReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  lang,
  factoryName,
  factoryTaxId,
}) => {
  const isAr = lang === 'ar';

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const storedTenant = api.auth.getStoredTenant();
  const effectiveFactoryName =
    factoryName ||
    (invoice as any)?.tenant?.name ||
    storedTenant?.name ||
    (isAr ? 'منشأة الملابس الجاهزة' : 'Garment Manufacturing Factory');

  const rawTaxId =
    factoryTaxId ||
    (invoice as any)?.tenant?.settings?.tax_number ||
    (invoice as any)?.tenant?.settings?.tax_id ||
    storedTenant?.settings?.tax_number;

  const effectiveTaxId = rawTaxId ? String(rawTaxId).trim() : null;

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
    ? (isAr ? 'نقدي (Cash)' : 'Cash')
    : invoice.payment_method === 'card'
    ? (isAr ? 'بطاقة بنكية (Card)' : 'Card')
    : invoice.payment_method === 'bank_transfer'
    ? (isAr ? 'تحويل بنكي' : 'Bank Transfer')
    : invoice.payment_method === 'credit'
    ? (isAr ? 'آجل (Credit)' : 'Credit')
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
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              max-width: 80mm !important;
              margin: 0 !important;
              padding: 4mm !important;
              background: #ffffff !important;
              color: #000000 !important;
              font-family: 'Courier New', Courier, monospace !important;
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

        {/* 80mm Paper Container Preview */}
        <div className="flex justify-center p-2 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto">
          <div
            id="pos-thermal-receipt-print"
            className="w-[80mm] max-w-full bg-white text-black p-4 rounded-lg border border-slate-300 shadow-md font-mono text-xs leading-relaxed select-none"
            style={{ width: '80mm', minHeight: '120mm' }}
            dir={isAr ? 'rtl' : 'ltr'}
          >
            {/* Header */}
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
              <p className="text-sm font-black tracking-tight uppercase">{effectiveFactoryName}</p>
              <p className="text-[10px] text-zinc-700">
                {isAr ? 'منفذ بيع المصنع والمعرض التجاري' : 'Factory Outlet & Commercial Showroom'}
              </p>
              {effectiveTaxId ? (
                <p className="text-[10px] font-mono">
                  {isAr ? `الرقم الضريبي: ${effectiveTaxId}` : `Tax ID: ${effectiveTaxId}`}
                </p>
              ) : (
                <p className="text-[9px] text-zinc-500 italic">
                  {isAr ? 'الرقم الضريبي: غير مسجل' : 'Tax ID: Not Registered'}
                </p>
              )}

              {/* Status Badge */}
              <div className="pt-1">
                {isPaid && (
                  <div className="inline-block px-2 py-0.5 border border-black rounded text-[10px] font-bold">
                    {isAr ? 'إيصال بيع نقدي فوري (POS) - مسدد' : 'POS Cash Sale Receipt - PAID'}
                  </div>
                )}
                {isRefunded && (
                  <div className="inline-block px-2 py-0.5 border border-dashed border-black rounded text-[10px] font-bold text-red-900">
                    {isAr ? 'إيصال مسترجع ومسدد نقداً (REFUNDED)' : 'Cash Refunded Receipt'}
                  </div>
                )}
                {isPartiallyRefunded && (
                  <div className="inline-block px-2 py-0.5 border border-black rounded text-[10px] font-bold text-amber-900">
                    {isAr ? 'إيصال مسترجع ومسدد جزئياً نقداً (PARTIALLY REFUNDED)' : 'Partially Cash Refunded Receipt'}
                  </div>
                )}
                {isCredited && (
                  <div className="inline-block px-2 py-0.5 border border-dashed border-black rounded text-[10px] font-bold text-indigo-900">
                    {isAr ? 'إشعار دائن - مرتجع بضاعة (CREDIT NOTE)' : 'Credit Note - Returned Goods'}
                  </div>
                )}
                {isPartiallyCredited && (
                  <div className="inline-block px-2 py-0.5 border border-dashed border-black rounded text-[10px] font-bold text-indigo-900">
                    {isAr ? 'إشعار دائن جزئي (PARTIAL CREDIT NOTE)' : 'Partial Credit Note'}
                  </div>
                )}
                {!isPaid && !isRefunded && !isPartiallyRefunded && !isCredited && !isPartiallyCredited && (
                  <div className="inline-block px-2 py-0.5 border border-dashed border-black rounded text-[10px] font-bold text-amber-900">
                    {isAr ? `مسودة بيع غير مسددة (${invoice.status})` : `UNPAID RECEIPT (${invoice.status})`}
                  </div>
                )}
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2.5 border-b border-dashed border-black text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>{isAr ? 'رقم الفاتورة:' : 'Invoice #:'}</span>
                <span className="font-bold font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'التاريخ والوقت:' : 'Date & Time:'}</span>
                <span className="font-mono">
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
              <div className="flex justify-between">
                <span>{isAr ? 'العميل:' : 'Customer:'}</span>
                <span>{invoice.customer_name || (isAr ? 'عميل نقدي' : 'Cash Customer')}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'طريقة السداد:' : 'Payment:'}</span>
                <span className="font-bold">{paymentMethodLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>{isAr ? 'حالة السداد:' : 'Status:'}</span>
                <span className="font-bold font-mono uppercase">{invoice.status}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="py-2.5 border-b border-dashed border-black">
              <table className="w-full text-[10px] text-start">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-start pb-1">الصنف</th>
                    <th className="text-center pb-1 w-8">الكمية</th>
                    <th className="text-end pb-1 w-14">السعر</th>
                    <th className="text-end pb-1 w-16">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {invoiceItems.map((item, index) => (
                    <tr key={item.id || index} className="align-top">
                      <td className="py-1 text-start leading-tight">
                        <span className="font-bold block">{item.description}</span>
                        {item.variant && (
                          <span className="text-[9px] text-zinc-600 block">
                            {item.variant.sku}
                          </span>
                        )}
                      </td>
                      <td className="py-1 text-center font-bold">{item.quantity}</td>
                      <td className="py-1 text-end">{Number(item.unit_price).toFixed(2)}</td>
                      <td className="py-1 text-end font-bold font-mono">{Number(item.total_price).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="py-2.5 border-b border-dashed border-black space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span>{subtotal.toFixed(2)} ج.م</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>ضريبة القيمة المضافة (14%):</span>
                  <span>{taxAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-zinc-600">
                  <span>الخصم:</span>
                  <span>-{discountAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-1 border-t border-black">
                <span>{isAr ? 'الصافي الإجمالي:' : 'Total Amount:'}</span>
                <span className="font-mono">{totalAmount.toFixed(2)} ج.م</span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between text-xs font-bold pt-1 text-red-900">
                  <span>{isAr ? 'المتبقي غير المسدد:' : 'Balance Due:'}</span>
                  <span className="font-mono">{balanceDue.toFixed(2)} ج.م</span>
                </div>
              )}
            </div>

            {/* Barcode / Verification Stamp */}
            <div className="pt-3 text-center space-y-1">
              <div className="tracking-[4px] font-mono text-[9px] font-bold">
                * {invoice.invoice_number} *
              </div>
              <p className="text-[9px] text-zinc-700 leading-tight">
                شكراً لزيارتكم! سياسة الاسترجاع والاستبدال خلال 14 يوماً مع تقديم أصل الإيصال والبضاعة بحالتها الأصلية.
              </p>
              <p className="text-[8px] text-zinc-500 pt-1">
                نظام GarmentOS Cloud لإدارة مصانع ومعارض الملابس
              </p>
            </div>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          <Button variant="primary" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
            {isAr ? 'طباعة الإيصال الفوري (80mm)' : 'Print Thermal Receipt (80mm)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

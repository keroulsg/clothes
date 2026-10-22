import React from 'react';
import { Printer } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
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
  factoryName = 'مصنع النيل للملابس الجاهزة',
  factoryTaxId = '100-244-901',
}) => {
  const isAr = lang === 'ar';

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceItems = invoice.items || [];
  const totalAmount = Number(invoice.total_amount) || 0;
  const subtotal = Number(invoice.subtotal) || totalAmount;
  const taxAmount = Number(invoice.tax_amount) || 0;
  const discountAmount = Number(invoice.discount_amount) || 0;
  const paymentMethodLabel = invoice.payment_method === 'cash'
    ? (isAr ? 'نقدي (Cash)' : 'Cash')
    : invoice.payment_method === 'card'
    ? (isAr ? 'بطاقة بنكية (Card)' : 'Card')
    : invoice.payment_method || 'Cash';

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
              <p className="text-sm font-black tracking-tight uppercase">{factoryName}</p>
              <p className="text-[10px] text-zinc-700">منفذ بيع المصنع والمعرض التجاري</p>
              <p className="text-[10px]">الرقم الضريبي: {factoryTaxId}</p>
              <div className="inline-block px-2 py-0.5 mt-1 border border-black rounded text-[10px] font-bold">
                إيصال بيع نقدي فوري (POS)
              </div>
            </div>

            {/* Receipt Metadata */}
            <div className="py-2.5 border-b border-dashed border-black text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>رقم الفاتورة:</span>
                <span className="font-bold font-mono">{invoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span>{invoice.invoice_date} {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span>العميل:</span>
                <span>{invoice.customer_name || 'عميل نقدي'}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة السداد:</span>
                <span className="font-bold">{paymentMethodLabel}</span>
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
                <span>الصافي المطلوب:</span>
                <span className="font-mono">{totalAmount.toFixed(2)} ج.م</span>
              </div>
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

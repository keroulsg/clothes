import React from 'react';
import { Printer, X, RotateCcw, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { formatCleanDate } from './PrintSalesInvoiceModal';
import type { SalesReturn } from '../../types';

interface PrintCreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: SalesReturn | null;
  isAr?: boolean;
  autoPrint?: boolean;
}

export const PrintCreditNoteModal: React.FC<PrintCreditNoteModalProps> = ({
  isOpen,
  onClose,
  salesReturn,
  isAr = true,
  autoPrint = false,
}) => {
  if (!isOpen || !salesReturn) return null;

  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name ||
    (isAr ? 'منظومة مصانع ومعارض الملابس الجاهزة' : 'Advanced Garments Factory');

  const factoryTaxId =
    storedTenant?.settings?.tax_number ||
    storedTenant?.settings?.tax_id ||
    '300-456-789';

  const commercialRegistry =
    storedTenant?.settings?.commercial_registry ||
    'CR-98421/CAIRO';

  const factoryPhone = storedTenant?.settings?.phone || (storedTenant as any)?.phone || '+20 100 234 5678';
  const factoryAddress = storedTenant?.settings?.address || (storedTenant as any)?.address || (isAr ? 'المنطقة الصناعية - العاشر من رمضان' : 'Industrial Zone');

  const docNumber = salesReturn.return_number || 'SRT-2026';
  const returnDate = formatCleanDate(salesReturn.return_date || salesReturn.created_at || new Date().toISOString());

  const customer = salesReturn.customer;
  const customerName =
    customer?.name ||
    (salesReturn as any)?.customer_name ||
    (isAr ? 'عميل معتمد' : 'Customer');

  const items = salesReturn.items || [];
  const totalAmount = Number(salesReturn.total_amount) || 0;
  const totalPieces = items.reduce((sum, item: any) => sum + (Number(item.quantity) || 0), 0);

  const isRestocked = salesReturn.is_restocked;
  const refundStatus = salesReturn.refund_status;

  const handlePrint = () => {
    const printContent = document.getElementById('credit-note-print-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('garmentos-credit-note-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'garmentos-credit-note-print-frame';
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
            <title>${docNumber} - ${factoryName}</title>
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
                margin: 0 !important;
                padding: 10mm 12mm !important;
                font-size: 12px;
                line-height: 1.5;
                direction: ${isAr ? 'rtl' : 'ltr'};
                width: 100% !important;
                height: auto !important;
                visibility: visible !important;
              }
              .border-b-2 { border-bottom: 2px solid #7F1625 !important; }
              .border-t-2 { border-top: 2px solid #7F1625 !important; }
              .border-b { border-bottom: 1px solid #cbd5e1 !important; }
              .border-t { border-top: 1px solid #cbd5e1 !important; }
              .border { border: 1px solid #cbd5e1 !important; }
              .border-slate-200, .border-slate-300, .border-slate-800 { border-color: #cbd5e1 !important; }
              table { width: 100% !important; border-collapse: collapse !important; margin-top: 14px !important; margin-bottom: 14px !important; }
              th { background: #fdf2f4 !important; color: #7F1625 !important; border: 1px solid #cbd5e1 !important; padding: 8px 10px !important; text-align: ${isAr ? 'right' : 'left'} !important; font-weight: bold !important; font-size: 11px !important; }
              td { border: 1px solid #e2e8f0 !important; padding: 8px 10px !important; text-align: ${isAr ? 'right' : 'left'} !important; font-size: 11px !important; }
              .text-center { text-align: center !important; }
              .text-end { text-align: ${isAr ? 'left' : 'right'} !important; }
              .text-start { text-align: ${isAr ? 'right' : 'left'} !important; }
              .font-bold { font-weight: bold !important; }
              .font-black { font-weight: 900 !important; }
              .font-extrabold { font-weight: 800 !important; }
              .font-mono { font-family: monospace !important; }
              .bg-\\[\\#7F1625\\] { background-color: #7F1625 !important; color: #ffffff !important; }
              .bg-\\[\\#7F1625\\]\\/10 { background-color: rgba(127, 22, 37, 0.08) !important; }
              .text-\\[\\#7F1625\\] { color: #7F1625 !important; }
              .flex { display: flex !important; }
              .justify-between { justify-content: space-between !important; }
              .items-center { align-items: center !important; }
              .items-start { align-items: flex-start !important; }
              .grid { display: grid !important; }
              .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
              .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
              .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
              .gap-1 { gap: 0.25rem !important; }
              .gap-2 { gap: 0.5rem !important; }
              .gap-4 { gap: 1rem !important; }
              .gap-6 { gap: 1.5rem !important; }
              .p-3 { padding: 0.75rem !important; }
              .p-4 { padding: 1rem !important; }
              .p-4\\.5 { padding: 1.125rem !important; }
              .p-8 { padding: 1.5rem !important; }
              .pb-6 { padding-bottom: 1.5rem !important; }
              .pt-2 { padding-top: 0.5rem !important; }
              .pt-8 { padding-top: 2rem !important; }
              .py-1 { padding-top: 0.25rem !important; padding-bottom: 0.25rem !important; }
              .px-2 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
              .px-3 { padding-left: 0.75rem !important; padding-right: 0.75rem !important; }
              .rounded-xl { border-radius: 0.75rem !important; }
              .rounded-2xl { border-radius: 1rem !important; }
              .rounded-full { border-radius: 9999px !important; }
              .space-y-0\\.5 > * + * { margin-top: 0.125rem !important; }
              .space-y-1 > * + * { margin-top: 0.25rem !important; }
              .space-y-1\\.5 > * + * { margin-top: 0.375rem !important; }
              .space-y-2 > * + * { margin-top: 0.5rem !important; }
              .space-y-3 > * + * { margin-top: 0.75rem !important; }
              .space-y-6 > * + * { margin-top: 1.5rem !important; }
              .space-y-8 > * + * { margin-top: 2rem !important; }
              .inline-block { display: inline-block !important; }
              .w-full { width: 100% !important; }
              .w-10 { width: 2.5rem !important; }
              .w-11 { width: 2.75rem !important; }
              .h-11 { height: 2.75rem !important; }
              .w-24 { width: 6rem !important; }
              .h-16 { height: 4rem !important; }
              .text-xs { font-size: 0.75rem !important; }
              .text-sm { font-size: 0.875rem !important; }
              .text-base { font-size: 1rem !important; }
              .text-xl { font-size: 1.25rem !important; }
              .text-2xl { font-size: 1.5rem !important; }
              .border-dashed { border-style: dashed !important; }
              @page { size: A4 portrait; margin: 10mm 12mm; }
              @media print {
                * { visibility: visible !important; }
                body { padding: 0 !important; visibility: visible !important; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div id="credit-note-print-sheet" class="p-8 print:p-0 space-y-6 text-slate-900 bg-white">
              ${printContent.innerHTML}
            </div>
          </body>
          </html>
        `);
        frameDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print failed, falling back:', e);
            window.print();
          }
        }, 200);
        return;
      }
    } catch (e) {
      console.warn('Iframe approach encountered an error, falling back:', e);
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

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="print-modal-container relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Action Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-700 text-white flex items-center justify-center font-bold shadow-md">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'معاينة وطباعة إشعار دائن وسند مرتجع مبيعات' : 'Print Official Credit Note & Return Voucher'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {docNumber} • {customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#6a121e] text-white text-xs font-bold transition-all shadow-md cursor-pointer hover:scale-105"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة إشعار الدائن (A4)' : 'Print Credit Note'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div id="credit-note-print-sheet" className="p-8 print:p-0 space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:bg-white bg-white dark:bg-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-rose-800 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 rounded-xl bg-[#7F1625] text-white flex items-center justify-center font-black text-xl shadow-xs">
                  {factoryName.charAt(0) || 'G'}
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white print:text-black tracking-tight">
                    {factoryName}
                  </h1>
                  <p className="text-xs text-slate-500 print:text-slate-700">
                    {factoryAddress} • {factoryPhone}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-end space-y-1">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-200 print:border-black print:text-black">
                {isAr ? 'إشعار دائن معتمد (CREDIT NOTE)' : 'OFFICIAL CREDIT NOTE'}
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {isAr ? 'رقم الإشعار: ' : 'Credit Note #: '}
                <span className="text-rose-800 print:text-black">{docNumber}</span>
              </div>
              <div className="text-[11px] text-slate-500 print:text-slate-700 font-mono space-y-0.5">
                <p>{isAr ? 'تاريخ التحرير: ' : 'Date: '}{returnDate}</p>
                {salesReturn.sales_invoice_id && (
                  <p>{isAr ? 'مرجع الفاتورة الأصلية: ' : 'Source Inv: '}{(salesReturn as any).sales_invoice?.invoice_number || salesReturn.sales_invoice_id}</p>
                )}
                <p>{isAr ? 'س.ت: ' : 'CR: '}{commercialRegistry} | {isAr ? 'ب.ض: ' : 'Tax ID: '}{factoryTaxId}</p>
              </div>
            </div>
          </div>

          {/* Customer & Return Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 print:border print:border-slate-300 print:bg-white text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                {isAr ? 'بيانات العميل (الدائن له):' : 'Credited Customer:'}
              </span>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-sm text-slate-900 dark:text-white print:text-black">
                  {customerName}
                </p>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/20 print:border-black print:text-black">
                  {isAr ? 'عميل معتمد' : 'Verified'}
                </span>
              </div>
              {customer?.phone && (
                <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">
                  📞 {customer.phone}
                </p>
              )}
              {customer?.tax_id && (
                <p className="font-mono text-slate-600 dark:text-slate-400 print:text-slate-700">
                  {isAr ? 'الرقم الضريبي للعميل: ' : 'Customer Tax ID: '}{customer.tax_id}
                </p>
              )}
            </div>

            <div className="space-y-1.5 md:text-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                {isAr ? 'بيانات الاستلام والمخزن والتسوية:' : 'Return & Warehouse Settlement:'}
              </span>
              <p className="text-slate-700 dark:text-slate-300 print:text-black font-semibold">
                📍 {isAr ? 'المخزن المستلم: ' : 'Warehouse: '}{(salesReturn as any).warehouse?.name || (isAr ? 'مستودع المنتجات التامة ومعرض المصنع' : 'Main Warehouse')}
              </p>
              <div className="flex items-center md:justify-end gap-2 text-[11px]">
                <span className={`px-2 py-0.5 rounded-full font-bold border ${isRestocked ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {isRestocked ? (isAr ? '✓ تم إعادة إدخال البضاعة للمخزن التام' : 'Restocked to Inventory') : (isAr ? 'خارج رصيد المخزن' : 'Not Restocked')}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold border bg-indigo-50 text-indigo-800 border-indigo-200">
                  {refundStatus === 'refunded' ? (isAr ? '💵 تم الصرف نقداً' : 'Cash Refunded') : (isAr ? '🏷️ دائن بحساب العميل' : 'Credited to Ledger')}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {isAr ? 'سبب الإرجاع: ' : 'Reason: '}<span className="font-bold text-slate-700 dark:text-slate-200">{salesReturn.reason}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-400 text-xs">
            <table className="w-full text-start border-collapse">
              <thead className="bg-rose-50 text-rose-900 print:bg-slate-100 print:text-black border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-3 text-start w-10">#</th>
                  <th className="p-3 text-start">{isAr ? 'بيان الصنف والموديل المرتجع' : 'Returned Item & Model'}</th>
                  <th className="p-3 text-center">{isAr ? 'المقاس واللون' : 'Variant'}</th>
                  <th className="p-3 text-center">{isAr ? 'حالة البضاعة' : 'Condition'}</th>
                  <th className="p-3 text-center">{isAr ? 'الكمية المرتجعة' : 'Return Qty'}</th>
                  <th className="p-3 text-end">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                  <th className="p-3 text-end">{isAr ? 'القيمة الدائنة' : 'Credit Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      {isAr ? 'لا توجد بنود مرتجعة مسجلة' : 'No returned items'}
                    </td>
                  </tr>
                ) : (
                  items.map((it: any, idx: number) => {
                    const variant = it.variant;
                    const modelName =
                      variant?.garment_model?.name ||
                      variant?.garmentModel?.name ||
                      it.description ||
                      (isAr ? 'موديل ملابس جاهزة' : 'Garment Model');

                    const sizeName = typeof variant?.size === 'object' ? variant.size?.name : (variant?.size || variant?.size_name || '—');
                    const colorName = typeof variant?.color === 'object' ? variant.color?.name : (variant?.color || variant?.color_name || '—');
                    const qty = Number(it.quantity || 0);
                    const unitPrice = Number(it.unit_price || 0);
                    const lineTotal = Number(it.total_price || (qty * unitPrice));

                    const conditionLabel = it.condition === 'defective'
                      ? (isAr ? '⚠️ به عيب تصنيع' : 'Defective')
                      : it.condition === 'scrap'
                      ? (isAr ? '❌ هالك' : 'Scrap')
                      : (isAr ? '✓ بحالة ممتازة' : 'Good');

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                        <td className="p-3 font-mono text-slate-400 print:text-slate-600">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white print:text-black">
                          {modelName}
                          {variant?.sku && (
                            <span className="block font-mono text-[10px] text-slate-400 font-normal">
                              SKU: {variant.sku}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 print:bg-slate-200 text-slate-700 dark:text-slate-300 print:text-black font-semibold text-[11px]">
                            {sizeName} / {colorName}
                          </span>
                        </td>
                        <td className="p-3 text-center text-[11px] font-bold">
                          {conditionLabel}
                        </td>
                        <td className="p-3 text-center font-bold text-rose-700 dark:text-rose-400 print:text-black font-mono">
                          {qty} {isAr ? 'قطعة' : 'pcs'}
                        </td>
                        <td className="p-3 text-end font-mono">
                          {unitPrice.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 text-end font-bold font-mono text-slate-900 dark:text-white print:text-black">
                          {lineTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Accounting Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 print:border print:border-slate-300 print:bg-white space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black block">
                  {isAr ? 'الأثر المحاسبي والإقرار المالي:' : 'Accounting & Ledger Settlement:'}
                </span>
                <p className="text-[11px] text-slate-600 print:text-slate-700 leading-relaxed">
                  {refundStatus === 'refunded'
                    ? (isAr ? 'تم سداد وصرف قيمة المرتجع نقداً للمشتري بموجب سند الصرف المقيد بالدفاتر.' : 'Amount paid to customer via cash disbursement voucher.')
                    : (isAr ? 'تم إضافة قيمة هذا الإشعار كرصيد دائن في حساب العميل المعتمد، ويحق له خصمه أو مقاصته مع أوامر وفواتير الشراء القادمة.' : 'Amount credited to customer ledger balance for future invoice offsetting.')}
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isAr ? `إجمالي القطع المرتجعة: ${totalPieces} قطعة` : `Total items: ${totalPieces} pcs`}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-rose-800 text-white print:bg-black print:text-white font-black text-sm">
                <span>{isAr ? 'إجمالي القيمة الدائنة المستحقة:' : 'Total Credit Amount:'}</span>
                <span className="font-mono text-base">{totalAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                {isAr ? 'إشعار دائن صادر ومعتمد من نظام GarmentOS Cloud' : 'Official Credit Note - GarmentOS Cloud ERP'}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 text-center text-xs">
            <div className="space-y-8">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'المستلم (أمين مخزن التام)' : 'Warehouse Receiver'}
              </p>
              <div className="h-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 mx-4"></div>
            </div>

            <div className="space-y-8">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'المسؤول المالي والحسابات' : 'Accountant'}
              </p>
              <div className="h-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 mx-4"></div>
            </div>

            <div className="space-y-2 flex flex-col items-center">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'خاتم واعتماد الإدارة' : 'Official Stamp'}
              </p>
              <div className="w-24 h-16 rounded-xl border-2 border-dashed border-rose-800/40 print:border-black flex items-center justify-center text-[10px] text-rose-800 print:text-black font-bold">
                {isAr ? 'معتمد' : 'APPROVED'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

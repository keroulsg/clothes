import React from 'react';
import { Printer, X, ShieldCheck, Building2, Store } from 'lucide-react';
import { api } from '../../api/client';
import type { SalesOrder, SalesInvoice, Quotation } from '../../types';

interface PrintSalesInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: SalesOrder | null;
  invoice?: SalesInvoice | null;
  quotation?: Quotation | null;
  isAr?: boolean;
  autoPrint?: boolean;
}

export const formatCleanDate = (val?: string | null): string => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined' || str === '—') return '—';
  // Strip out ISO time e.g. 2026-11-10T00:00:00.000000Z -> 2026-11-10
  return str.split('T')[0].split(' ')[0];
};

export const PrintSalesInvoiceModal: React.FC<PrintSalesInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  invoice,
  quotation,
  isAr = true,
  autoPrint = false,
}) => {
  if (!isOpen || (!order && !invoice && !quotation)) return null;

  const isQuotation = !order && !invoice && !!quotation;
  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name ||
    (invoice as any)?.tenant?.name ||
    (isAr ? 'منظومة مصانع ومعارض الملابس الجاهزة' : 'Advanced Garments Factory');

  const factoryTaxId =
    storedTenant?.settings?.tax_number ||
    storedTenant?.settings?.tax_id ||
    '300-456-789';

  const commercialRegistry =
    storedTenant?.settings?.commercial_registry ||
    'CR-98421/CAIRO';

  const factoryPhone = storedTenant?.settings?.phone || (storedTenant as any)?.phone || '+20 100 234 5678';
  const factoryAddress = storedTenant?.settings?.address || (storedTenant as any)?.address || (isAr ? 'المنطقة الصناعية - العاشر من رمضان' : 'Industrial Zone, 10th of Ramadan');

  const effectiveDocNumber =
    order?.order_number ||
    quotation?.quotation_number ||
    invoice?.invoice_number ||
    'SO-2026';

  const docDate = formatCleanDate(
    order?.order_date ||
    order?.created_at ||
    quotation?.created_at ||
    invoice?.invoice_date ||
    new Date().toISOString()
  );

  const rawDeliveryDate =
    order?.expected_delivery_date ||
    quotation?.valid_until ||
    invoice?.due_date;

  const deliveryOrValidDate = formatCleanDate(rawDeliveryDate);
  const displayDeliveryDate =
    deliveryOrValidDate !== '—'
      ? deliveryOrValidDate
      : (isAr ? 'تسليم فوري (باب المصنع)' : 'Immediate Ex-Factory');

  const customer = order?.customer || quotation?.customer || invoice?.customer;
  const customerName =
    order?.customer_name ||
    customer?.name ||
    quotation?.customer_name ||
    invoice?.customer_name ||
    (isAr ? 'عميل معتمد' : 'Authorized Customer');

  const isWholesale =
    order?.order_type === 'wholesale' ||
    customer?.classification === 'wholesale' ||
    customer?.classification === 'company' ||
    (order?.order_type !== 'retail' && (
      customerName.includes('براند') ||
      customerName.includes('شركة') ||
      customerName.includes('مصنع') ||
      customerName.includes('توكيل')
    ));

  const items = (order?.items as any[]) || (quotation?.items as any[]) || (invoice?.items as any[]) || [];
  const totalAmount = Number(order?.total_amount || quotation?.total_amount || invoice?.total_amount || 0);
  const subtotal = Number(order?.subtotal || quotation?.subtotal || invoice?.subtotal || totalAmount);
  const taxAmount = Number(order?.tax_amount || quotation?.tax_amount || invoice?.tax_amount || 0);
  const discountAmount = Number(order?.discount_amount || quotation?.discount_amount || invoice?.discount_amount || 0);

  const totalPieces = items.reduce((sum, item: any) => sum + (Number(item.ordered_quantity || item.quantity) || 0), 0);

  const handlePrint = () => {
    const printContent = document.getElementById('sales-invoice-print-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      // Create or reuse the print frame.
      // Crucial: Must be positioned inside viewport with opacity 1 & visibility visible
      // but placed behind with zIndex -99999 so Chromium's layout engine renders all content without blank pages!
      let iframe = document.getElementById('garmentos-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'garmentos-print-frame';
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
            <title>${effectiveDocNumber} - ${factoryName}</title>
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
            <div id="sales-invoice-print-sheet" class="p-8 print:p-0 space-y-6 text-slate-900 bg-white">
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
            fallbackPrint();
          }
        }, 200);
        return;
      }
    } catch (e) {
      console.warn('Iframe approach encountered an error, falling back:', e);
    }

    fallbackPrint();
  };

  const fallbackPrint = () => {
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
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          .print-modal-container,
          .print-modal-container * {
            visibility: visible !important;
          }
          .print-modal-backdrop {
            position: static !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .print-modal-content {
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          #sales-invoice-print-sheet {
            display: block !important;
            position: static !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-modal-container print-modal-content relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Action Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7F1625] flex items-center justify-center text-white font-bold shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isQuotation
                  ? (isAr ? 'معاينة وطباعة عرض الأسعار الرسمي' : 'Print Official Quotation')
                  : (isAr ? 'معاينة وطباعة فاتورة المبيعات الضريبية الرسمية (A4)' : 'Print Official Tax Sales Invoice (A4)')}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {effectiveDocNumber} • {customerName}
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
              <span>{isAr ? 'طباعة الفاتورة الآن (A4)' : 'Print Invoice Now'}</span>
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
        <div id="sales-invoice-print-sheet" className="p-8 print:p-0 space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:bg-white bg-white dark:bg-slate-900">
          {/* Header & Logo */}
          <div className="flex justify-between items-start pb-6 border-b-2 border-[#7F1625] gap-4">
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
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] print:border print:border-[#7F1625] print:text-black">
                {isQuotation
                  ? (isAr ? 'عرض أسعار معتمد' : 'OFFICIAL QUOTATION')
                  : (isAr ? 'فاتورة مبيعات ضريبية رسمية' : 'OFFICIAL TAX SALES INVOICE')}
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {isAr ? 'رقم السند: ' : 'Ref #: '}
                <span className="text-[#7F1625] print:text-black">{effectiveDocNumber}</span>
              </div>
              <div className="text-[11px] text-slate-500 print:text-slate-700 font-mono space-y-0.5">
                <p>{isAr ? 'تاريخ التحرير: ' : 'Date: '}{docDate}</p>
                <p>{isQuotation ? (isAr ? 'صالح حتى: ' : 'Valid Until: ') : (isAr ? 'تاريخ التسليم: ' : 'Delivery: ')}{displayDeliveryDate}</p>
                <p>{isAr ? 'س.ت: ' : 'CR: '}{commercialRegistry} | {isAr ? 'ب.ض: ' : 'Tax ID: '}{factoryTaxId}</p>
              </div>
            </div>
          </div>

          {/* Customer & Bill To Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 print:border print:border-slate-300 print:bg-white text-xs">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                {isAr ? 'بيانات العميل والمشتري (فاتورة إلى):' : 'Billed To Customer:'}
              </span>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-sm text-slate-900 dark:text-white print:text-black">
                  {customerName}
                </p>
                {isWholesale ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/20 print:border-black print:text-black flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>{isAr ? 'عميل جملة وتوكيلات' : 'Wholesale Brand'}</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 print:border-black print:text-black flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    <span>{isAr ? 'عميل تجزئة / قطاعي' : 'Retail Customer'}</span>
                  </span>
                )}
              </div>
              {customer?.code && (
                <p className="font-mono text-slate-500 print:text-slate-700">
                  {isAr ? 'كود العميل: ' : 'Customer Code: '}{customer.code}
                </p>
              )}
              {customer?.contact_person && (
                <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">
                  {isAr ? 'المسؤول: ' : 'Contact: '}{customer.contact_person}
                </p>
              )}
            </div>

            <div className="space-y-1.5 md:text-end">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 block">
                {isAr ? 'بيانات التوصيل والضريبة:' : 'Delivery & Tax Information:'}
              </span>
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">
                {customer?.phone ? `📞 ${customer.phone}` : (isAr ? 'الهاتف: مسجل بالنظام' : 'Phone: On file')}
              </p>
              {customer?.tax_id && (
                <p className="font-mono text-slate-600 dark:text-slate-400 print:text-slate-700">
                  {isAr ? 'الرقم الضريبي للعميل: ' : 'Tax No: '}{customer.tax_id}
                </p>
              )}
              <p className="text-slate-600 dark:text-slate-400 print:text-slate-700">
                📍 {customer?.delivery_address || customer?.address || (isAr ? 'تسليم باب المصنع / المخزن الرئيسي' : 'Ex-Factory Delivery')}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-400 text-xs">
            <table className="w-full text-start border-collapse">
              <thead className="bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] print:bg-slate-100 print:text-black border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-3 text-start w-10">#</th>
                  <th className="p-3 text-start">{isAr ? 'بيان الصنف والموديل' : 'Item & Description'}</th>
                  <th className="p-3 text-center">{isAr ? 'المقاس واللون' : 'Variant / Spec'}</th>
                  <th className="p-3 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="p-3 text-end">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                  <th className="p-3 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      {isAr ? 'لا توجد بنود مسجلة' : 'No items'}
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
                    const qty = Number(it.ordered_quantity || it.quantity || 0);
                    const unitPrice = Number(it.unit_price || 0);
                    const lineTotal = Number(it.total_price || (qty * unitPrice));

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
                        <td className="p-3 text-center font-bold text-slate-900 dark:text-white print:text-black">
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

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 print:border print:border-slate-300 print:bg-white space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 print:text-black block">
                  {isAr ? 'ملاحظات وشروط البيع والتسليم:' : 'Terms & Remarks:'}
                </span>
                <p className="text-[11px] text-slate-500 print:text-slate-700 leading-relaxed">
                  {order?.notes || quotation?.notes ||
                    (isAr
                      ? 'البضاعة المباعة تخضع لتدقيق الجودة المعتمد. يرجى مراجعة البضاعة ومطابقة الحزم والعدد فور الاستلام قبل فتح أكياس التعبئة.'
                      : 'Goods subject to certified factory quality audit. Please verify quantities upon receipt.')}
                </p>
                <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{isAr ? `إجمالي عدد القطع: ${totalPieces} قطعة مفحوصة` : `Total items: ${totalPieces} pcs`}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 print:text-slate-700">
                <span>{isAr ? 'المجموع قبل الضريبة (Subtotal):' : 'Subtotal:'}</span>
                <span className="font-mono font-bold">{subtotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400 print:text-black">
                  <span>{isAr ? 'خصم تجاري خاص:' : 'Trade Discount:'}</span>
                  <span className="font-mono font-bold">-{discountAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400 print:text-slate-700">
                  <span>{isAr ? 'ضريبة القيمة المضافة (14% VAT):' : 'VAT (14%):'}</span>
                  <span className="font-mono font-bold">+{taxAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}

              <div className="flex justify-between p-3 rounded-xl bg-[#7F1625] text-white print:bg-black print:text-white font-black text-sm">
                <span>{isAr ? 'صافي القيمة المستحقة الإجمالية:' : 'Grand Total Due:'}</span>
                <span className="font-mono text-base">{totalAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>
          </div>

          {/* Signatures & Factory Stamp Area */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 dark:border-slate-800 print:border-slate-300 text-center text-xs">
            <div className="space-y-8">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'مسؤول المبيعات والتعاقدات' : 'Sales Representative'}
              </p>
              <div className="h-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 mx-4"></div>
            </div>

            <div className="space-y-8">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'توقيع واعتماد العميل' : 'Customer Acceptance'}
              </p>
              <div className="h-0.5 border-b border-dashed border-slate-300 dark:border-slate-700 mx-4"></div>
            </div>

            <div className="space-y-2 flex flex-col items-center">
              <p className="font-bold text-slate-600 dark:text-slate-400 print:text-black">
                {isAr ? 'خاتم واعتماد المصنع' : 'Factory Official Stamp'}
              </p>
              <div className="w-24 h-16 rounded-xl border-2 border-dashed border-[#7F1625]/40 print:border-black flex items-center justify-center text-[10px] text-[#7F1625] print:text-black font-bold">
                {isAr ? 'ختم الإدارة' : 'STAMP'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

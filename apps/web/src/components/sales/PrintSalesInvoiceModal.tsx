import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import type { SalesOrder, SalesInvoice, Quotation } from '../../types';

interface PrintSalesInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: SalesOrder | null;
  invoice?: SalesInvoice | null;
  quotation?: Quotation | null;
  isAr?: boolean;
}

export const formatCleanDate = (val?: string | null): string => {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || str === 'null' || str === 'undefined') return '—';
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
}) => {
  if (!isOpen || (!order && !invoice && !quotation)) return null;

  const isQuotation = !order && !invoice && !!quotation;
  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name ||
    (invoice as any)?.tenant?.name ||
    (isAr ? 'مصنع الملابس الجاهزة المتطور' : 'Advanced Garments Factory');

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

  const deliveryOrValidDate = formatCleanDate(
    order?.expected_delivery_date ||
    quotation?.valid_until ||
    invoice?.due_date
  );

  const customerName =
    order?.customer_name ||
    quotation?.customer_name ||
    invoice?.customer_name ||
    (isAr ? 'عميل معتمد' : 'Authorized Customer');

  const customer = order?.customer || quotation?.customer || invoice?.customer;
  const isWholesale =
    order?.order_type === 'wholesale' ||
    customer?.classification === 'wholesale' ||
    customer?.classification === 'company' ||
    !order?.order_type;

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
      // 1. Try popup window print first (escapes all SPA CSS, fixed overlays, and dark mode issues)
      const printWindow = window.open('', '_blank', 'width=900,height=950,top=40,left=40');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
          <head>
            <title>${effectiveDocNumber} - ${factoryName}</title>
            <meta charset="utf-8">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', system-ui, -apple-system, sans-serif; }
              body { background: #ffffff !important; color: #000000 !important; padding: 24px; font-size: 12px; line-height: 1.5; }
              .border-b-2 { border-bottom: 2px solid #7F1625; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; margin-bottom: 14px; }
              th { background: #fdf2f4 !important; color: #7F1625 !important; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${isAr ? 'right' : 'left'}; font-weight: bold; }
              td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: ${isAr ? 'right' : 'left'}; }
              .text-center { text-align: center; }
              .text-end { text-align: ${isAr ? 'left' : 'right'}; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .font-mono { font-family: monospace; }
              .total-box { background: #7F1625 !important; color: #ffffff !important; padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; font-weight: bold; margin-top: 8px; }
              @page { size: A4 portrait; margin: 10mm; }
              @media print {
                body { padding: 0; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
          </html>
        `);
        printWindow.document.close();

        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 350);
        return;
      }
    } catch (e) {
      console.warn('Popup blocked, falling back to window.print()', e);
    }

    // 2. Direct fallback
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';
    window.print();
    setTimeout(() => {
      document.body.style.overflow = prevOverflow;
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          #sales-invoice-print-sheet, #sales-invoice-print-sheet * {
            visibility: visible !important;
          }
          #sales-invoice-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Action Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7F1625] flex items-center justify-center text-white font-bold shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isQuotation
                  ? (isAr ? 'معاينة وطباعة عرض السعر الرسمي المعتمد (A4)' : 'Official Quotation Sheet (A4)')
                  : (isAr ? 'معاينة وطباعة الفاتورة الضريبية الرسمية (A4)' : 'Official Tax Sales Invoice (A4)')}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {effectiveDocNumber} • {docDate}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2d] text-white text-xs font-bold shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الفاتورة الآن' : 'Print Document Now'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={isAr ? 'إغلاق' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 INVOICE SHEET */}
        <div id="sales-invoice-print-sheet" className="p-8 sm:p-12 text-slate-900 dark:text-slate-100 print:text-black print:p-6 print:bg-white space-y-6">
          {/* Header & Logo */}
          <div className="flex items-start justify-between border-b-2 border-[#7F1625] pb-6 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-2xl bg-[#7F1625] text-white flex items-center justify-center font-black text-xl shadow-md print:bg-black">
                  G
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 dark:text-white print:text-black">
                    {factoryName}
                  </h1>
                  <p className="text-xs text-slate-500 font-medium print:text-slate-700">
                    {isAr ? 'منظومة إدارة تصنيع وتجارة الملابس الجاهزة' : 'Garment Manufacturing & Apparel Trading'}
                  </p>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 print:text-slate-600 space-y-0.5 pt-2">
                <p>📍 {factoryAddress}</p>
                <p>📞 {factoryPhone}</p>
              </div>
            </div>

            <div className="text-end space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/30 print:border-black print:text-black">
                {isQuotation
                  ? (isAr ? 'عرض سعر تجاري معتمد' : 'OFFICIAL COMMERCIAL QUOTATION')
                  : (isAr ? 'فاتورة بيع ضريبية معتمدة' : 'OFFICIAL TAX SALES INVOICE')}
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 print:text-black">
                {isAr ? 'رقم السند: ' : 'Ref #: '}
                <span className="text-[#7F1625] print:text-black">{effectiveDocNumber}</span>
              </div>
              <div className="text-[11px] text-slate-500 print:text-slate-700 font-mono space-y-0.5">
                <p>{isAr ? 'تاريخ التحرير: ' : 'Date: '}{docDate}</p>
                <p>{isQuotation ? (isAr ? 'صالح حتى: ' : 'Valid Until: ') : (isAr ? 'تاريخ التسليم: ' : 'Delivery: ')}{deliveryOrValidDate}</p>
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
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/20 print:border-black print:text-black">
                    🏢 {isAr ? 'عميل جملة' : 'Wholesale'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 print:border-black print:text-black">
                    🛍️ {isAr ? 'عميل تجزئة' : 'Retail'}
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

import React from 'react';
import { Printer, X, Truck, Package, ShieldCheck, MapPin, Phone, Building2 } from 'lucide-react';
import { api } from '../../api/client';
import { formatCleanDate } from './PrintSalesInvoiceModal';

interface PrintDeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: any | null;
  isAr?: boolean;
  autoPrint?: boolean;
}

export const PrintDeliveryNoteModal: React.FC<PrintDeliveryNoteModalProps> = ({
  isOpen,
  onClose,
  deliveryNote,
  isAr = true,
  autoPrint = false,
}) => {
  if (!isOpen || !deliveryNote) return null;

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

  const deliveryNumber = deliveryNote.delivery_number || 'DN-2026';
  const deliveryDate = formatCleanDate(deliveryNote.delivery_date || deliveryNote.created_at || new Date().toISOString());

  const orderNumber = deliveryNote.sales_order?.order_number || deliveryNote.sales_order_id || 'SO-2026';
  const customerName =
    deliveryNote.recipient_name ||
    deliveryNote.customer?.name ||
    deliveryNote.sales_order?.customer_name ||
    (isAr ? 'عميل معتمد' : 'Customer');

  const customerPhone = deliveryNote.customer?.phone || (isAr ? 'مسجل بالنظام' : 'On file');
  const deliveryAddress =
    deliveryNote.sales_order?.delivery_address ||
    deliveryNote.customer?.address ||
    (isAr ? 'تسليم باب المصنع / المستودع الرئيسي' : 'Ex-Factory Gate');

  const warehouseName =
    deliveryNote.warehouse?.name ||
    (isAr ? 'مستودع المنتجات التامة ومعرض المصنع' : 'Finished Goods Warehouse');

  const carrierName =
    deliveryNote.shipping_carrier ||
    (isAr ? 'تسليم باب المصنع / سيارة العميل' : 'Direct Factory Gate Pickup');

  const trackingNumber =
    deliveryNote.tracking_number ||
    (isAr ? 'سند تسليم مباشر' : 'Direct Dispatch Slip');

  const totalCartons = Number(deliveryNote.total_cartons || deliveryNote.cartons?.length || 1);
  const totalPieces = Number(deliveryNote.total_pieces || 50);

  // Extract items from deliveryNote.items or fallback to order items
  const rawItems = deliveryNote.items && deliveryNote.items.length > 0
    ? deliveryNote.items
    : (deliveryNote.sales_order?.items || []);

  const items = rawItems.map((it: any, idx: number) => {
    const v = it.variant || it.sales_order_item?.variant;
    const model = v?.garment_model?.name || v?.garmentModel?.name || it.description || (isAr ? 'صنف ملابس جاهزة' : 'Garment item');
    const sku = v?.sku || it.sku || `SKU-${idx + 1}`;
    const size = typeof v?.size === 'object' ? v?.size?.name : (v?.size || 'M');
    const color = typeof v?.color === 'object' ? v?.color?.name : (v?.color || 'أساسي');
    const qty = Number(it.delivered_quantity || it.quantity || it.ordered_quantity || totalPieces);

    return {
      index: idx + 1,
      model,
      sku,
      variantName: `${size} / ${color}`,
      qty,
    };
  });

  const cartons = deliveryNote.cartons || [];

  const handlePrint = () => {
    const printContent = document.getElementById('delivery-note-print-sheet');
    if (!printContent) {
      window.print();
      return;
    }

    try {
      let iframe = document.getElementById('garmentos-delivery-note-print-frame') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'garmentos-delivery-note-print-frame';
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
      if (!frameDoc) {
        window.print();
        return;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8" />
          <title>Delivery_Note_${deliveryNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 12mm 12mm 12mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Cairo", "Tahoma", sans-serif;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #0f172a;
              font-size: 11px;
              line-height: 1.4;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 8px;
            }
            .border-b-2 { border-bottom: 2px solid #0f172a; }
            .bg-slate-50 { background-color: #f8fafc !important; }
            .bg-slate-100 { background-color: #f1f5f9 !important; }
            .text-burgundy { color: #7F1625 !important; }
            .bg-burgundy { background-color: #7F1625 !important; color: #ffffff !important; }
            .text-emerald { color: #059669 !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
            .text-center { text-align: center; }
            .text-start { text-align: ${isAr ? 'right' : 'left'}; }
            .text-end { text-align: ${isAr ? 'left' : 'right'}; }
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
        } catch {
          window.print();
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => handlePrint(), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Modal Toolbar (Screen Only) */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isAr ? 'إذن تسليم وشحن طلبيات مبيعات (A4)' : 'Sales Delivery Note & Waybill (A4)'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {deliveryNumber} • {orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#6a121e] text-white text-xs font-bold shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الإذن فوراً' : 'Print Note'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Delivery Note Sheet Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div
            id="delivery-note-print-sheet"
            dir={isAr ? 'rtl' : 'ltr'}
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-0 text-xs"
            style={{ minHeight: '275mm' }}
          >
            {/* Header: Factory Info & Document Title */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-5">
              <div className="space-y-1 max-w-[60%]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#7F1625] text-white flex items-center justify-center font-black text-sm">
                    G
                  </div>
                  <h1 className="text-lg font-black tracking-tight text-[#7F1625]">
                    {factoryName}
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {factoryAddress} • {isAr ? 'هاتف:' : 'Tel:'} {factoryPhone}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {isAr ? 'س.ت:' : 'C.R:'} {commercialRegistry} | {isAr ? 'ب.ض:' : 'Tax ID:'} {factoryTaxId}
                </p>
              </div>

              <div className="text-end space-y-1">
                <span className="inline-block px-3 py-1 rounded-md bg-[#7F1625] text-white font-extrabold text-xs tracking-wide">
                  {isAr ? 'إذن تسليم وشحن بضاعة تامة' : 'SALES DELIVERY NOTE'}
                </span>
                <p className="text-base font-black font-mono tracking-wider text-slate-900 mt-1">
                  {deliveryNumber}
                </p>
                <p className="text-[11px] text-slate-600 font-mono">
                  {isAr ? 'تاريخ التحرير: ' : 'Date: '}<strong>{deliveryDate}</strong>
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {isAr ? 'رقم أمر البيع المرتبط: ' : 'Ref Order: '}<strong>{orderNumber}</strong>
                </p>
              </div>
            </div>

            {/* Logistics & Parties Matrix */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              {/* Recipient / Customer Dossier */}
              <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 font-bold text-slate-800 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-[#7F1625]" />
                  <span>{isAr ? 'بيانات المشتري والعميل المستلم:' : 'Consignee / Customer:'}</span>
                </div>
                <p className="text-sm font-black text-slate-900">{customerName}</p>
                <p className="text-[11px] text-slate-600 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{isAr ? 'الهاتف: ' : 'Phone: '}{customerPhone}</span>
                </p>
                <p className="text-[11px] text-slate-600 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>{isAr ? 'عنوان وموقع التسليم: ' : 'Address: '}{deliveryAddress}</span>
                </p>
              </div>

              {/* Warehouse & Shipping Logistics */}
              <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 font-bold text-slate-800 text-[11px]">
                  <Truck className="w-3.5 h-3.5 text-[#7F1625]" />
                  <span>{isAr ? 'بيانات الشحن ومستودع الصرف:' : 'Shipping & Warehouse Dispatch:'}</span>
                </div>
                <p className="text-[11px] text-slate-700">
                  {isAr ? 'المستودع المنصرف منه: ' : 'Warehouse: '}
                  <strong className="text-slate-900">{warehouseName}</strong>
                </p>
                <p className="text-[11px] text-slate-700">
                  {isAr ? 'شركة الشحن / الناقل: ' : 'Carrier: '}
                  <strong className="text-slate-900">{carrierName}</strong>
                </p>
                <p className="text-[11px] text-slate-700">
                  {isAr ? 'رقم بوليصة التتبع: ' : 'Tracking #: '}
                  <strong className="font-mono text-slate-900">{trackingNumber}</strong>
                </p>
                <div className="flex items-center gap-3 pt-0.5 text-[10px] text-slate-600 font-bold">
                  <span className="px-2 py-0.5 bg-white border border-slate-300 rounded">
                    {isAr ? 'إجمالي الطرود: ' : 'Cartons: '}{totalCartons} {isAr ? 'طرد' : 'ctns'}
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[#7F1625]">
                    {isAr ? 'إجمالي القطع: ' : 'Total: '}{totalPieces} {isAr ? 'قطعة' : 'pcs'}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mb-5 overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full text-start">
                <thead className="bg-[#7F1625] text-white font-bold text-[11px]">
                  <tr>
                    <th className="p-2 text-center w-10">#</th>
                    <th className="p-2 text-start">{isAr ? 'بيان الصنف والموديل الجاهز' : 'Garment Model & Description'}</th>
                    <th className="p-2 text-start">{isAr ? 'كود الصنف (SKU)' : 'SKU'}</th>
                    <th className="p-2 text-center w-36">{isAr ? 'المقاس واللون' : 'Size / Color'}</th>
                    <th className="p-2 text-center w-28">{isAr ? 'الكمية المسلمة' : 'Delivered Qty'}</th>
                    <th className="p-2 text-center w-24">{isAr ? 'الوحدة' : 'UOM'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it: any) => (
                    <tr key={it.index} className="hover:bg-slate-50/50">
                      <td className="p-2 text-center font-mono text-slate-400 font-bold">{it.index}</td>
                      <td className="p-2 font-bold text-slate-900">{it.model}</td>
                      <td className="p-2 font-mono text-[10px] text-slate-500">{it.sku}</td>
                      <td className="p-2 text-center font-semibold text-slate-700">{it.variantName}</td>
                      <td className="p-2 text-center font-black font-mono text-sm text-[#7F1625]">
                        {it.qty.toLocaleString()}
                      </td>
                      <td className="p-2 text-center text-slate-500 font-medium">
                        {isAr ? 'قطعة' : 'Piece'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={4} className="p-2 text-end text-slate-700">
                      {isAr ? 'إجمالي عدد القطع الجاهزة المسلمة بالشحنة:' : 'Total Finished Garments Delivered:'}
                    </td>
                    <td className="p-2 text-center font-black font-mono text-sm text-[#7F1625]">
                      {totalPieces.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Cartons Packing Details (If Present) */}
            {cartons.length > 0 && (
              <div className="mb-5 p-3 rounded-xl border border-slate-300 bg-slate-50/60">
                <h4 className="font-bold text-[11px] text-slate-800 mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#7F1625]" />
                  <span>{isAr ? 'بيانات التعبئة والطرود الصادرة:' : 'Packing & Carton Breakdown:'}</span>
                </h4>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  {cartons.map((c: any, idx: number) => (
                    <div key={idx} className="p-2 bg-white rounded border border-slate-200 font-mono">
                      <span className="font-bold block text-slate-900">{c.carton_number || `طرد #${idx + 1}`}</span>
                      <span className="text-slate-500">{c.pieces_count || 50} قطعة • {c.gross_weight_kg || 10} كجم</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Inspection & Handover Legal Clause */}
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50/80 mb-6 text-[10px] text-slate-600 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'إقرار وتعهد استلام البضاعة المعتمد:' : 'Proof of Delivery & Handover Declaration:'}</span>
              </div>
              <p>
                {isAr
                  ? 'أقر أنا الموقع والمستلم أدناه بأنني عاينت واستلمت البضاعة المبينة بأعلاه كاملة وسليمة التعبئة والتغليف، وبحالة ممتازة ومطابقة للمواصفات والأعداد المعتمدة بأمر البيع، وبناءً عليه يسقط حق الرجوع على المصنع بخصوص نقص العدد الظاهري أو التلف الناتج عن سوء النقل بعد الاستلام والتوقيع.'
                  : 'I hereby acknowledge that the goods described above were received complete, in good condition, and matching the approved sales order specification.'}
              </p>
            </div>

            {/* Triple Official Signatures Block */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-300 text-center text-[10px]">
              <div className="space-y-6">
                <span className="font-bold text-slate-800 block">
                  {isAr ? 'أمين مستودع الإنتاج التام (الصرف)' : 'Warehouse Keeper (Dispatch)'}
                </span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                <span className="text-slate-400 text-[9px] block">
                  {isAr ? 'التوقيع والختم' : 'Signature'}
                </span>
              </div>

              <div className="space-y-6">
                <span className="font-bold text-slate-800 block">
                  {isAr ? 'سائق الشحن / مندوب الناقل' : 'Shipping Carrier / Driver'}
                </span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                <span className="text-slate-400 text-[9px] block">
                  {isAr ? 'رقم السيارة / التوقيع' : 'Vehicle # / Signature'}
                </span>
              </div>

              <div className="space-y-6">
                <span className="font-bold text-slate-800 block">
                  {isAr ? 'العميل المستلم (المشتري)' : 'Consignee / Receiver'}
                </span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                <span className="text-slate-400 text-[9px] block">
                  {isAr ? 'الاسم الثلاثي والتوقيع والخاتم' : 'Signature & Company Stamp'}
                </span>
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
              <span>GarmentOS Factory Operations • Delivery Dispatch Document</span>
              <span>{isAr ? 'أصل للمشتري • صورة لإدارة المخازن • صورة للمحاسبة' : 'Original for Client • Copy for Warehouse • Copy for Accounts'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

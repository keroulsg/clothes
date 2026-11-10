import React from 'react';
import { Truck, Printer, Edit, Package, ShieldCheck, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCleanDate } from './PrintSalesInvoiceModal';

interface ViewDeliveryNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: any | null;
  onPrint: (note: any) => void;
  onEdit: (note: any) => void;
  isAr?: boolean;
}

export const ViewDeliveryNoteModal: React.FC<ViewDeliveryNoteModalProps> = ({
  isOpen,
  onClose,
  deliveryNote,
  onPrint,
  onEdit,
  isAr = true,
}) => {
  if (!isOpen || !deliveryNote) return null;

  const deliveryNumber = deliveryNote.delivery_number || 'DN-2026';
  const orderNumber = deliveryNote.sales_order?.order_number || deliveryNote.sales_order_id || 'SO-2026';
  const deliveryDate = formatCleanDate(deliveryNote.delivery_date || deliveryNote.created_at);

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

  // Extract items from deliveryNote.items or order items
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `تفاصيل إذن تسليم وشحن البضاعة (${deliveryNumber})` : `Delivery Note Details (${deliveryNumber})`}
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Top Header Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7F1625]/10 via-[#7F1625]/5 to-transparent border border-[#7F1625]/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7F1625] text-white flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                  {deliveryNumber}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  deliveryNote.status === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : deliveryNote.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                }`}>
                  {deliveryNote.status === 'delivered'
                    ? (isAr ? '✓ تم التسليم بالكامل' : 'Delivered')
                    : deliveryNote.status === 'cancelled'
                      ? (isAr ? '❌ ملغي' : 'Cancelled')
                      : (isAr ? '🚚 تم الصرف والشحن' : 'Dispatched')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {isAr ? 'أمر البيع: ' : 'Order: '}<strong>{orderNumber}</strong> • {isAr ? 'التاريخ: ' : 'Date: '}<strong>{deliveryDate}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(deliveryNote)}
              icon={<Edit className="w-3.5 h-3.5" />}
            >
              {isAr ? 'تعديل بيانات الشحن' : 'Update Shipping'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => onPrint(deliveryNote)}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              {isAr ? 'طباعة البوليصة A4' : 'Print Waybill'}
            </Button>
          </div>
        </div>

        {/* 2-Column Details: Consignee & Dispatch Logistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-[#7F1625]" />
              <span>{isAr ? 'بيانات المشتري والعميل المستلم' : 'Consignee / Customer Details'}</span>
            </h5>
            <p className="font-extrabold text-slate-900 dark:text-white text-sm">{customerName}</p>
            <p className="text-slate-600 dark:text-slate-400">
              {isAr ? 'الهاتف: ' : 'Phone: '}<strong>{customerPhone}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {isAr ? 'عنوان التسليم: ' : 'Address: '}<strong>{deliveryAddress}</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
            <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
              <Truck className="w-3.5 h-3.5 text-[#7F1625]" />
              <span>{isAr ? 'بيانات الناقل والمستودع' : 'Dispatch & Shipping Logistics'}</span>
            </h5>
            <p className="text-slate-600 dark:text-slate-400">
              {isAr ? 'مستودع الصرف: ' : 'Warehouse: '}<strong>{warehouseName}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {isAr ? 'شركة الشحن: ' : 'Carrier: '}<strong>{carrierName}</strong>
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              {isAr ? 'رقم التتبع / البوليصة: ' : 'Tracking #: '}<strong className="font-mono text-[#7F1625] dark:text-[#ff8ba0]">{trackingNumber}</strong>
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#7F1625]" />
              <span>{isAr ? 'الأصناف والكميات المسلمة بالشحنة:' : 'Delivered Line Items:'}</span>
            </h5>
            <span className="text-[11px] font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0]">
              {totalPieces} {isAr ? 'قطعة إجمالية' : 'total pieces'} • {totalCartons} {isAr ? 'طرد' : 'cartons'}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-start">
              <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف والموديل' : 'Model'}</th>
                  <th className="p-2.5 text-start">{isAr ? 'كود الصنف SKU' : 'SKU'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'المقاس واللون' : 'Variant'}</th>
                  <th className="p-2.5 text-center w-28">{isAr ? 'الكمية المسلمة' : 'Qty'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it: any) => (
                  <tr key={it.index}>
                    <td className="p-2.5 text-center font-mono text-slate-400">{it.index}</td>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{it.model}</td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-500">{it.sku}</td>
                    <td className="p-2.5 text-center text-slate-700 dark:text-slate-300 font-semibold">{it.variantName}</td>
                    <td className="p-2.5 text-center font-black font-mono text-slate-900 dark:text-white">
                      {it.qty} {isAr ? 'قطعة' : 'pcs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cartons Breakdown */}
        {cartons.length > 0 && (
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
            <h6 className="font-bold text-slate-800 dark:text-slate-200 mb-2">{isAr ? 'بيانات الطرود والكراتين:' : 'Cartons Breakdown:'}</h6>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              {cartons.map((c: any, idx: number) => (
                <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-slate-900 dark:text-white">{c.carton_number || `CTN-${idx + 1}`}</p>
                  <p className="text-slate-500 text-[10px]">{c.pieces_count || 50} pcs • {c.gross_weight_kg || 10} kg</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Proof of Delivery / Legal notes */}
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>
            {isAr
              ? 'إذن التسليم وثيقة مخزنية وقانونية رسمية تثبت خروج البضاعة من باب المصنع ومطابقتها للمواصفات، وتسليمها للعميل أو للناقل بموجب توقيع رسمي.'
              : 'Official warehouse dispatch document certifying handover of goods from factory gate.'}
          </span>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

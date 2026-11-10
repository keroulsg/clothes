import React from 'react';
import { RotateCcw, Printer, Package, DollarSign } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatCleanDate } from './PrintSalesInvoiceModal';
import type { SalesReturn } from '../../types';

interface ViewSalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: SalesReturn | null;
  onPrintCreditNote: (ret: SalesReturn) => void;
  onProcessRefund?: (ret: SalesReturn) => void;
  isAr?: boolean;
}

export const ViewSalesReturnModal: React.FC<ViewSalesReturnModalProps> = ({
  isOpen,
  onClose,
  salesReturn,
  onPrintCreditNote,
  onProcessRefund,
  isAr = true,
}) => {
  if (!isOpen || !salesReturn) return null;

  const items = salesReturn.items || [];
  const totalPieces = items.reduce((sum, it: any) => sum + (Number(it.quantity) || 0), 0);
  const totalAmount = Number(salesReturn.total_amount) || 0;
  const isRestocked = salesReturn.is_restocked;
  const refundStatus = salesReturn.refund_status;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `معاينة تفاصيل سند المرتجع (${salesReturn.return_number})` : `Sales Return Details (${salesReturn.return_number})`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-black text-base text-slate-900 dark:text-white">
                  {salesReturn.return_number}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  {isAr ? 'مرتجع معتمد' : 'Approved Return'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {isAr ? 'تاريخ التحرير: ' : 'Date: '}{formatCleanDate(salesReturn.return_date || salesReturn.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5 text-[#7F1625]" />}
              onClick={() => {
                onClose();
                onPrintCreditNote(salesReturn);
              }}
            >
              {isAr ? 'طباعة إشعار الدائن A4' : 'Print Credit Note'}
            </Button>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 block">{isAr ? 'العميل المعتمد:' : 'Customer:'}</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {salesReturn.customer?.name || (salesReturn as any).customer_name || (isAr ? 'عميل معتمد' : 'Verified Customer')}
            </p>
            {salesReturn.customer?.phone && (
              <p className="text-slate-500 font-mono">📞 {salesReturn.customer.phone}</p>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 block">{isAr ? 'المخزن المستلم:' : 'Warehouse:'}</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {(salesReturn as any).warehouse?.name || (isAr ? 'مستودع المنتجات التامة ومعرض المصنع' : 'Main Warehouse')}
            </p>
            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${isRestocked ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {isRestocked ? (isAr ? '✓ تم زيادة رصيد المخزن' : 'Restocked') : (isAr ? 'لم يدخل المخزن' : 'Not restocked')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
            <span className="text-slate-400 block">{isAr ? 'الموقف المالي:' : 'Financial Status:'}</span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {refundStatus === 'refunded'
                ? (isAr ? '💵 تم الصرف نقداً' : 'Cash Refunded')
                : (isAr ? '🏷️ إشعار دائن بحساب العميل' : 'Credited to Ledger')}
            </p>
            <span className="text-slate-500 block">
              {isAr ? 'سبب المرتجع: ' : 'Reason: '}<span className="font-bold">{salesReturn.reason}</span>
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-[#7F1625]" />
            <span>{isAr ? 'أصناف وبنود المرتجع المفحوصة:' : 'Inspected Line Items:'}</span>
          </h4>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-start border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-2.5 text-start w-10">#</th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف والموديل' : 'Item'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'المقاس واللون' : 'Variant'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الحالة الفنية' : 'Condition'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="p-2.5 text-end">{isAr ? 'السعر' : 'Price'}</th>
                  <th className="p-2.5 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it: any, idx: number) => {
                  const v = it.variant;
                  const modelName = v?.garment_model?.name || v?.garmentModel?.name || it.description || (isAr ? 'صنف ملابس' : 'Item');
                  const size = typeof v?.size === 'object' ? v.size?.name : (v?.size || '—');
                  const color = typeof v?.color === 'object' ? v.color?.name : (v?.color || '—');

                  const conditionLabel = it.condition === 'defective'
                    ? (isAr ? '⚠️ عيب تصنيع' : 'Defective')
                    : it.condition === 'scrap'
                    ? (isAr ? '❌ هالك' : 'Scrap')
                    : (isAr ? '✓ سليم' : 'Good');

                  return (
                    <tr key={idx}>
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {modelName}
                        {v?.sku && (
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">
                            SKU: {v.sku}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        {size} / {color}
                      </td>
                      <td className="p-2.5 text-center font-bold">
                        {conditionLabel}
                      </td>
                      <td className="p-2.5 text-center font-bold font-mono text-rose-700 dark:text-rose-400">
                        {it.quantity} {isAr ? 'قطعة' : 'pcs'}
                      </td>
                      <td className="p-2.5 text-end font-mono">
                        {Number(it.unit_price).toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-end font-bold font-mono text-slate-900 dark:text-white">
                        {Number(it.total_price || (it.quantity * it.unit_price)).toLocaleString()} ج.م
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-900 text-white shadow-md">
          <div className="space-y-0.5">
            <span className="text-xs text-rose-200 block font-bold">
              {isAr ? 'صافي القيمة الدائنة المعتمدة:' : 'Total Credited Value:'}
            </span>
            <span className="text-xs text-rose-100">
              {totalPieces} {isAr ? 'قطعة مفحوصة' : 'pcs'}
            </span>
          </div>
          <span className="text-2xl font-black font-mono">
            {totalAmount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
          </span>
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          <div className="flex items-center gap-2">
            {refundStatus !== 'refunded' && onProcessRefund && (
              <Button
                variant="outline"
                onClick={() => {
                  onProcessRefund(salesReturn);
                }}
                icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              >
                {isAr ? 'صرف استرداد نقدي فوري' : 'Disburse Cash Refund'}
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onPrintCreditNote(salesReturn);
              }}
              className="bg-[#7F1625] hover:bg-[#6a121e] text-white"
              icon={<Printer className="w-4 h-4" />}
            >
              {isAr ? 'طباعة إشعار الدائن الرسمي (A4)' : 'Print Credit Note (A4)'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

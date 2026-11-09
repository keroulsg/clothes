import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Printer, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';

interface StockCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
  itemName?: string;
  isAr?: boolean;
}

export const StockCardModal: React.FC<StockCardModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  isAr = true,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      setIsLoading(true);
      api.inventory
        .getStockCard(itemId)
        .then((res) => setData(res))
        .catch((err) => console.error('Error fetching stock card:', err))
        .finally(() => setIsLoading(false));
    } else {
      setData(null);
    }
  }, [isOpen, itemId]);

  if (!isOpen) return null;

  const item = data?.item;
  const summary = data?.summary;
  const movements = data?.movements || [];

  const handlePrint = () => {
    window.print();
  };

  const txTypeLabels: Record<string, string> = {
    opening_balance: isAr ? 'رصيد افتتاحي' : 'Opening Balance',
    goods_receipt: isAr ? 'إذن استلام توريد' : 'Goods Receipt',
    material_issuance: isAr ? 'صرف إنتاج وقص' : 'Material Issuance',
    material_return: isAr ? 'مرتجع من الإنتاج' : 'Material Return',
    finished_goods_receipt: isAr ? 'استلام إنتاج تام' : 'Finished Goods In',
    pos_sale: isAr ? 'مبيعات كاشير ومعرض (POS)' : 'POS Retail Sale',
    sales_delivery: isAr ? 'تسليم مبيعات جملة (B2B)' : 'Wholesale Sales Delivery',
    storefront_sale: isAr ? 'مبيعات متجر إلكتروني (Web)' : 'Storefront Online Sale',
    customer_return: isAr ? 'مرتجع مبيعات' : 'Sales Return',
    transfer_in: isAr ? 'تحويل وارد من مستودع' : 'Transfer In',
    transfer_out: isAr ? 'تحويل صادر لمستودع' : 'Transfer Out',
    adjustment_positive: isAr ? 'تسوية جردية بالزيادة' : 'Positive Adjustment',
    adjustment_negative: isAr ? 'تسوية جردية بالعجز' : 'Negative Adjustment',
    damage_write_off: isAr ? 'إهلاك وتخريد معتمد' : 'Damage Write-off',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `كارت الصنف المخزني التحليلي: ${itemName || item?.name || '...'}` : `Stock Card: ${itemName || item?.name || '...'}`}
      maxWidth="xl"
    >
      <div className="printable-sheet space-y-6 print:m-0 print:p-0">
        {/* Print Header (Visible in print mode) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">GarmentOS Cloud — بطاقة حركة صنف مخزني (Stock Card)</h1>
          <p className="text-xs text-slate-600 mt-1">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
        </div>

        {/* Actions bar */}
        <div className="flex justify-between items-center print:hidden">
          <div className="text-xs text-slate-500">
            {isAr ? 'كود الصنف:' : 'Item Code:'} <span className="font-mono font-bold text-slate-900 dark:text-white">{item?.code}</span>
            {item?.barcode && (
              <span className="mr-3">
                {isAr ? 'الباركود:' : 'Barcode:'} <span className="font-mono">{item?.barcode}</span>
              </span>
            )}
          </div>
          <Button onClick={handlePrint} variant="outline" size="sm" className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة كارت الصنف' : 'Print Stock Card'}</span>
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'الرصيد الفعلي الحالي' : 'Current Balance'}</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {summary ? Number(summary.current_balance).toLocaleString() : '0'} <span className="text-xs font-normal">{summary?.unit_of_measure}</span>
            </div>
            {summary?.is_low_stock && (
              <div className="text-xs text-amber-600 flex items-center gap-1 mt-1 font-medium">
                <AlertTriangle className="w-3 h-3" />
                <span>{isAr ? 'دون حد إعادة الطلب' : 'Low Stock'}</span>
              </div>
            )}
          </Card>

          <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'متوسط التكلفة' : 'Average Cost'}</div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {summary ? Number(summary.average_cost).toFixed(2) : '0.00'} <span className="text-xs font-normal">ج.م</span>
            </div>
          </Card>

          <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'القيمة الإجمالية للمخزون' : 'Total Valuation'}</div>
            <div className="text-lg font-bold font-mono text-primary-600 dark:text-primary-400 mt-1">
              {summary ? Number(summary.total_valuation).toLocaleString() : '0'} <span className="text-xs font-normal">ج.م</span>
            </div>
          </Card>

          <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'المستودع وموقع التخزين' : 'Warehouse & Location'}</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1 truncate">
              {item?.warehouse?.name || '—'}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">
              {item?.storage_zone || 'Z-A'} / {item?.rack_location || 'R-01'} / {item?.shelf_bin_location || 'B-01'}
            </div>
          </Card>
        </div>

        {/* Movements Ledger Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">{isAr ? 'التاريخ والوقت' : 'Date & Time'}</th>
                <th className="py-2.5 px-3">{isAr ? 'نوع الحركة' : 'Movement Type'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الاتجاه' : 'Dir'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الكمية' : 'Qty'}</th>
                <th className="py-2.5 px-3">{isAr ? 'قبل الحركة' : 'Before'}</th>
                <th className="py-2.5 px-3">{isAr ? 'بعد الحركة' : 'After'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المستند المرجعي' : 'Reference'}</th>
                <th className="py-2.5 px-3">{isAr ? 'المسؤول' : 'User'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isAr ? 'جارِ تحميل سجل الحركات المخزنية...' : 'Loading movements...'}
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {isAr ? 'لا توجد حركات مسجلة لهذا الصنف حتى الآن' : 'No movements recorded for this item yet'}
                  </td>
                </tr>
              ) : (
                movements.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.created_at}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {txTypeLabels[m.transaction_type] || m.transaction_type}
                      {m.notes && <div className="text-[10px] text-slate-400 font-normal">{m.notes}</div>}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={m.direction === 'IN' ? 'success' : 'danger'}>
                        {m.direction === 'IN' ? (isAr ? 'وارد +' : 'IN +') : (isAr ? 'صادر -' : 'OUT -')}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      {Number(m.quantity).toLocaleString()} {summary?.unit_of_measure}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">
                      {Number(m.balance_before).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-primary-700 dark:text-primary-400">
                      {Number(m.balance_after).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {m.reference_number || m.reference_type || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {m.user_name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

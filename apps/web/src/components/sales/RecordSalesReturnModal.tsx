import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle, Package } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { SalesInvoice, Customer, SalesReturn } from '../../types';

interface RecordSalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: SalesInvoice[];
  customers: Customer[];
  warehouses: any[];
  preselectedInvoice?: SalesInvoice | null;
  onSuccess: (createdReturn: SalesReturn) => void;
  isAr?: boolean;
}

interface ReturnItemDraft {
  variant_id: string;
  description: string;
  sku?: string;
  sizeName?: string;
  colorName?: string;
  max_quantity: number;
  quantity: number;
  unit_price: number;
  condition: 'good' | 'defective' | 'scrap';
  action_taken: 'restock' | 'repair' | 'discard';
  selected: boolean;
}

export const RecordSalesReturnModal: React.FC<RecordSalesReturnModalProps> = ({
  isOpen,
  onClose,
  invoices,
  customers,
  warehouses,
  preselectedInvoice,
  onSuccess,
  isAr = true,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [reason, setReason] = useState<string>('مقاس غير مطابق لطلب العميل');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isRestocked, setIsRestocked] = useState<boolean>(true);
  const [settlementType, setSettlementType] = useState<'credit' | 'instant_cash'>('credit');
  const [refundPaymentMethod, setRefundPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');

  const [itemsDraft, setItemsDraft] = useState<ReturnItemDraft[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize or update when modal opens or preselectedInvoice changes
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    // Default warehouse: prefer finished_goods or showroom
    const defaultWh = warehouses.find(w => w.type === 'finished_goods' || w.name?.includes('تامة') || w.name?.includes('معرض')) || warehouses[0];
    if (defaultWh) {
      setSelectedWarehouseId(defaultWh.id);
    }

    if (preselectedInvoice) {
      applyInvoice(preselectedInvoice);
    } else if (invoices.length > 0 && !selectedInvoiceId) {
      // Pick first invoice if none selected
      applyInvoice(invoices[0]);
    }
  }, [isOpen, preselectedInvoice, invoices, warehouses]);

  const applyInvoice = (inv: SalesInvoice) => {
    setSelectedInvoiceId(inv.id);
    if (inv.customer_id) {
      setSelectedCustomerId(inv.customer_id);
    }

    const draftItems: ReturnItemDraft[] = (inv.items || []).map((it: any) => {
      const v = it.variant;
      const modelName = v?.garment_model?.name || v?.garmentModel?.name || it.description || (isAr ? 'صنف ملابس' : 'Garment item');
      const size = typeof v?.size === 'object' ? v.size?.name : (v?.size || '—');
      const color = typeof v?.color === 'object' ? v.color?.name : (v?.color || '—');
      const qty = Number(it.quantity || 1);
      const price = Number(it.unit_price || 0);

      return {
        variant_id: it.variant_id || v?.id,
        description: modelName,
        sku: v?.sku,
        sizeName: size,
        colorName: color,
        max_quantity: qty,
        quantity: qty,
        unit_price: price,
        condition: 'good',
        action_taken: 'restock',
        selected: true,
      };
    });

    setItemsDraft(draftItems);
  };

  const handleInvoiceChange = (invId: string) => {
    const inv = invoices.find(i => i.id === invId);
    if (inv) {
      applyInvoice(inv);
    } else {
      setSelectedInvoiceId('');
      setItemsDraft([]);
    }
  };

  const handleToggleItem = (index: number) => {
    setItemsDraft(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const handleQuantityChange = (index: number, val: number) => {
    setItemsDraft(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const safeQty = Math.max(0.001, Math.min(item.max_quantity, val || 0));
      return { ...item, quantity: safeQty };
    }));
  };

  const handleConditionChange = (index: number, cond: 'good' | 'defective' | 'scrap') => {
    setItemsDraft(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const action = cond === 'scrap' ? 'discard' : (cond === 'defective' ? 'repair' : 'restock');
      return { ...item, condition: cond, action_taken: action };
    }));
  };

  const selectedItems = itemsDraft.filter(i => i.selected && i.quantity > 0);
  const totalReturnPieces = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalReturnValue = selectedItems.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0);
  const matchedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedItems.length === 0) {
      setErrorMsg(isAr ? 'برجاء تحديد صنف واحد على الأقل لإرجاعه وتحديد كميته.' : 'Please select at least one item to return.');
      return;
    }

    if (!selectedWarehouseId) {
      setErrorMsg(isAr ? 'برجاء اختيار المخزن المستلم للبضاعة المرتجعة.' : 'Please select receiving warehouse.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        warehouse_id: selectedWarehouseId,
        sales_invoice_id: selectedInvoiceId || undefined,
        customer_id: selectedCustomerId || undefined,
        return_date: new Date().toISOString().split('T')[0],
        reason: reason === 'أخرى' && customReason.trim() ? customReason.trim() : reason,
        is_restocked: isRestocked,
        notes: notes.trim() || undefined,
        refund_payment: settlementType === 'instant_cash',
        refund_payment_method: settlementType === 'instant_cash' ? refundPaymentMethod : undefined,
        amount: totalReturnValue,
        items: selectedItems.map(i => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          condition: i.condition,
          action_taken: i.action_taken,
        })),
      };

      const res = await api.sales.createReturn(payload);
      const created = res.return || (res as any).sales_return || res;
      onSuccess(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل مرتجع المبيعات. تأكد من صحة البيانات.' : 'Failed to record return.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تسجيل مرتجع مبيعات وإصدار إشعار دائن (Sales Return & Credit Note)' : 'Record Sales Return & Credit Note'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Source Invoice / Customer Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'الفاتورة الأصلية المراد الإرجاع منها:' : 'Source Sales Invoice:'}
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => handleInvoiceChange(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? '-- اختر فاتورة مبيعات سابقة --' : '-- Select Invoice --'}</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} | {inv.customer_name} ({Number(inv.total_amount).toLocaleString()} ج.م) - {inv.invoice_date}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              {isAr ? 'اختيار الفاتورة يجلب تلقائياً الأصناف والأسعار المعتمدة للعميل.' : 'Selects items and verified sale prices.'}
            </p>
            {matchedCustomer && (
              <span className="block text-[11px] font-bold text-[#7F1625] dark:text-[#ff8ba0] mt-1">
                {isAr ? 'العميل المعتمد: ' : 'Customer: '}{matchedCustomer.name}
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'المخزن المستلم للبضاعة المرتجعة:' : 'Receiving Warehouse:'}
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Step 2: Line Items to Return */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-[#7F1625]" />
              <span>{isAr ? 'الأصناف والكميات المرتجعة:' : 'Returned Line Items & Quantities:'}</span>
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedItems.length} {isAr ? 'أصناف محددة' : 'items'} • {totalReturnPieces} {isAr ? 'قطعة' : 'pcs'}
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <table className="w-full text-start border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-2.5 text-center w-10">
                    {isAr ? 'تحديد' : 'Select'}
                  </th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف والموديل' : 'Item'}</th>
                  <th className="p-2.5 text-center">{isAr ? 'المقاس واللون' : 'Variant'}</th>
                  <th className="p-2.5 text-center w-28">{isAr ? 'الكمية المرتجعة' : 'Qty'}</th>
                  <th className="p-2.5 text-center w-32">{isAr ? 'حالة البضاعة' : 'Condition'}</th>
                  <th className="p-2.5 text-end w-24">{isAr ? 'سعر الوحدة' : 'Price'}</th>
                  <th className="p-2.5 text-end w-28">{isAr ? 'إجمالي المرتجع' : 'Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {itemsDraft.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      {isAr ? 'برجاء اختيار فاتورة مبيعات لعرض بنودها المتاحة للإرجاع' : 'Select an invoice to view returnable items'}
                    </td>
                  </tr>
                ) : (
                  itemsDraft.map((item, idx) => (
                    <tr key={idx} className={item.selected ? 'bg-rose-50/20 dark:bg-rose-950/10' : 'opacity-60'}>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleItem(idx)}
                          className="w-4 h-4 rounded text-[#7F1625] focus:ring-[#7F1625] cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                        {item.description}
                        {item.sku && (
                          <span className="block font-mono text-[10px] text-slate-400 font-normal">
                            SKU: {item.sku}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                          {item.sizeName} / {item.colorName}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="1"
                            max={item.max_quantity}
                            value={item.quantity}
                            disabled={!item.selected}
                            onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                            className="w-16 p-1 text-center font-bold font-mono border rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 disabled:opacity-40"
                          />
                          <span className="text-[10px] text-slate-400">/{item.max_quantity}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <select
                          value={item.condition}
                          disabled={!item.selected}
                          onChange={(e) => handleConditionChange(idx, e.target.value as any)}
                          className="text-[11px] p-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-40"
                        >
                          <option value="good">{isAr ? '✓ سليم (ممتاز)' : 'Good'}</option>
                          <option value="defective">{isAr ? '⚠️ عيب تصنيع' : 'Defective'}</option>
                          <option value="scrap">{isAr ? '❌ هالك/تالف' : 'Scrap'}</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-end font-mono">
                        {item.unit_price.toLocaleString()} ج.م
                      </td>
                      <td className="p-2.5 text-end font-bold font-mono text-rose-700 dark:text-rose-400">
                        {(item.selected ? (item.quantity * item.unit_price) : 0).toLocaleString()} ج.م
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 3: Return Reason & Restock Switch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'سبب الإرجاع الرسمي:' : 'Reason for Return:'}
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="مقاس غير مطابق لطلب العميل">{isAr ? 'مقاس غير مطابق لطلب العميل' : 'Wrong size'}</option>
              <option value="عيب تصنيع أو خياطة أو صباغة">{isAr ? 'عيب تصنيع أو خياطة أو صباغة' : 'Defective item'}</option>
              <option value="تلف في التغليف أثناء النقل">{isAr ? 'تلف في التغليف أو الكرتونة أثناء الشحن' : 'Transit damage'}</option>
              <option value="استبدال بموديل أو لون آخر">{isAr ? 'طلب استبدال بموديل أو لون آخر' : 'Model/color exchange'}</option>
              <option value="رغبة العميل في الإلغاء">{isAr ? 'رغبة العميل في إلغاء الشراء' : 'Customer cancellation'}</option>
              <option value="أخرى">{isAr ? 'سبب آخر (اكتب أدناه)' : 'Other reason'}</option>
            </select>

            {reason === 'أخرى' && (
              <input
                type="text"
                placeholder={isAr ? 'اكتب سبب الإرجاع بالتفصيل...' : 'Specify return reason...'}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
              />
            )}

            <input
              type="text"
              placeholder={isAr ? 'ملاحظات إضافية (اختياري)...' : 'Additional remarks...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'حركة رصيد المخزن:' : 'Inventory Restock:'}
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 cursor-pointer hover:border-[#7F1625] transition-all">
                <input
                  type="checkbox"
                  checked={isRestocked}
                  onChange={(e) => setIsRestocked(e.target.checked)}
                  className="w-4 h-4 rounded text-[#7F1625] focus:ring-[#7F1625]"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    {isAr ? 'إعادة إدخال البضاعة المرتجعة لرصيد المخزن فوراً (+)' : 'Restock returned items into warehouse inventory (+)'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isAr ? 'يقوم النظام بزيادة رصيد المستودع تلقائياً بالأصناف السليمة.' : 'Automatically updates on-hand stock counts.'}
                  </span>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {isAr ? 'التسوية المالية للعميل:' : 'Financial Settlement Method:'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${settlementType === 'credit' ? 'border-[#7F1625] bg-[#7F1625]/10 text-[#7F1625] font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                  <input
                    type="radio"
                    name="settlement"
                    checked={settlementType === 'credit'}
                    onChange={() => setSettlementType('credit')}
                    className="text-[#7F1625] focus:ring-[#7F1625]"
                  />
                  <span>🏷️ {isAr ? 'إشعار دائن بحساب العميل' : 'Credit Note'}</span>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2 ${settlementType === 'instant_cash' ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                  <input
                    type="radio"
                    name="settlement"
                    checked={settlementType === 'instant_cash'}
                    onChange={() => setSettlementType('instant_cash')}
                    className="text-emerald-600 focus:ring-emerald-600"
                  />
                  <span>💵 {isAr ? 'استرداد نقدي فوري' : 'Instant Cash Refund'}</span>
                </label>
              </div>

              {settlementType === 'instant_cash' && (
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs text-slate-500">{isAr ? 'طريقة الصرف:' : 'Method:'}</span>
                  <select
                    value={refundPaymentMethod}
                    onChange={(e) => setRefundPaymentMethod(e.target.value as any)}
                    className="text-xs p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-emerald-700"
                  >
                    <option value="cash">{isAr ? 'نقدي من الخزينة' : 'Cash'}</option>
                    <option value="card">{isAr ? 'بطاقة بنكية / نقطة بيع' : 'Card'}</option>
                    <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 4: Totals Summary Bar */}
        <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl bg-[#7F1625] text-white gap-3 shadow-md">
          <div className="space-y-0.5">
            <span className="text-xs text-rose-200 block font-bold">
              {isAr ? 'ملخص قيمة المرتجع المستحقة:' : 'Return Total Summary:'}
            </span>
            <span className="text-xs text-white">
              {totalReturnPieces} {isAr ? 'قطع مرتجعة' : 'pcs'} • {selectedItems.length} {isAr ? 'بنود محددة' : 'items'}
            </span>
          </div>

          <div className="text-end">
            <span className="text-2xl font-black font-mono">
              {totalReturnValue.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
            </span>
            <span className="block text-[10px] text-rose-200">
              {settlementType === 'credit'
                ? (isAr ? 'سيتم إصدار إشعار دائن رسمي' : 'Official Credit Note')
                : (isAr ? 'سيتم صرف المبلغ نقداً للمشتري' : 'Cash Disbursement')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedItems.length === 0}
            className="bg-[#7F1625] hover:bg-[#6a121e] text-white"
            icon={<RotateCcw className="w-4 h-4" />}
          >
            {isSubmitting
              ? (isAr ? 'جاري تسجيل المرتجع والإشعار الدائن...' : 'Recording Return...')
              : (isAr ? 'اعتماد وتسجيل المرتجع وإصدار الإشعار' : 'Approve & Record Return')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

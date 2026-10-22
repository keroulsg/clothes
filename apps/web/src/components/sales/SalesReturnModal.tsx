import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertCircle,
  Package,
  Warehouse as WarehouseIcon,
  FileText,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import type { Language, SalesInvoice, SalesInvoiceItem, SalesReturn } from '../../types';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (salesReturn: SalesReturn) => void;
  invoice: SalesInvoice | null;
  lang: Language;
}

interface ReturnLineDraft {
  item_id: string;
  variant_id: string;
  description: string;
  sold_qty: number;
  returned_qty: number;
  remaining_qty: number;
  return_qty: number;
  unit_price: number;
  condition: 'good' | 'defective' | 'scrap';
  action_taken: 'restock' | 'repair' | 'discard';
  is_selected: boolean;
}

export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  lang,
}) => {
  const isAr = lang === 'ar';

  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isRestocked, setIsRestocked] = useState<boolean>(true);
  const [returnLines, setReturnLines] = useState<ReturnLineDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Return Reasons
  const quickReasons = isAr
    ? [
        'عيب صناعة / خياطة غير مطابقة',
        'مقاس غير مطابق لطلب العميل',
        'طلب استبدال موديل من العميل',
        'مرتجع فوري من نقطة البيع (POS)',
      ]
    : [
        'Manufacturing defect / seam fault',
        'Size mismatch with customer request',
        'Customer requested style exchange',
        'Instant POS counter return',
      ];

  // Load Authoritative Invoice Data & Warehouses on open
  useEffect(() => {
    if (!isOpen || !invoice) return;

    setErrorMessage(null);
    setReason('');
    setNotes('');
    setIsRestocked(true);

    const initData = async () => {
      setIsLoadingInvoice(true);
      try {
        // 1. Fetch Warehouses
        const whRes = await api.inventory.getWarehouses();
        const whList = whRes?.warehouses || [];
        setWarehouses(whList);

        if (whList.length > 0) {
          const defaultWh = whList.find((w: any) => w.type === 'finished_goods') || whList[0];
          setSelectedWarehouseId(defaultWh.id);
        }

        // 2. Fetch Authoritative Invoice with remaining quantities
        const invRes = await api.sales.getInvoice(invoice.id);
        const fullInvoice = invRes?.invoice || invoice;
        const items: SalesInvoiceItem[] = fullInvoice.items || [];

        const drafts: ReturnLineDraft[] = items.map((it: any) => {
          const sold = Number(it.quantity) || 0;
          const previouslyReturned = Number(it.returned_quantity) || 0;
          const remaining = it.remaining_returnable_quantity !== undefined
            ? Number(it.remaining_returnable_quantity)
            : Math.max(0, sold - previouslyReturned);

          return {
            item_id: it.id,
            variant_id: it.variant_id || '',
            description: it.description || 'Garment Item',
            sold_qty: sold,
            returned_qty: previouslyReturned,
            remaining_qty: remaining,
            return_qty: remaining > 0 ? 1 : 0,
            unit_price: Number(it.unit_price) || 0,
            condition: 'good',
            action_taken: 'restock',
            is_selected: remaining > 0,
          };
        });

        setReturnLines(drafts);
      } catch (err: any) {
        setErrorMessage(
          err?.message || (isAr ? 'فشل تحميل بيانات الفاتورة المعتمدة' : 'Failed to fetch invoice details')
        );
      } finally {
        setIsLoadingInvoice(false);
      }
    };

    initData();
  }, [isOpen, invoice, isAr]);

  const handleQtyChange = (itemId: string, val: number) => {
    setReturnLines((prev) =>
      prev.map((line) => {
        if (line.item_id !== itemId) return line;
        const validQty = Math.max(0, Math.min(val, line.remaining_qty));
        return {
          ...line,
          return_qty: validQty,
          is_selected: validQty > 0,
        };
      })
    );
  };

  const handleConditionChange = (itemId: string, cond: 'good' | 'defective' | 'scrap') => {
    setReturnLines((prev) =>
      prev.map((line) => {
        if (line.item_id !== itemId) return line;
        const autoAction = cond === 'good' ? 'restock' : cond === 'defective' ? 'repair' : 'discard';
        return {
          ...line,
          condition: cond,
          action_taken: autoAction,
        };
      })
    );
  };

  const handleActionChange = (itemId: string, act: 'restock' | 'repair' | 'discard') => {
    setReturnLines((prev) =>
      prev.map((line) => (line.item_id === itemId ? { ...line, action_taken: act } : line))
    );
  };

  const handleToggleSelect = (itemId: string) => {
    setReturnLines((prev) =>
      prev.map((line) => {
        if (line.item_id !== itemId) return line;
        const nextSelected = !line.is_selected;
        return {
          ...line,
          is_selected: nextSelected,
          return_qty: nextSelected && line.return_qty === 0 && line.remaining_qty > 0 ? 1 : line.return_qty,
        };
      })
    );
  };

  // Calculations
  const selectedLines = returnLines.filter((l) => l.is_selected && l.return_qty > 0);
  const totalReturnPieces = selectedLines.reduce((sum, l) => sum + l.return_qty, 0);
  const totalReturnAmount = selectedLines.reduce((sum, l) => sum + l.return_qty * l.unit_price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    if (!selectedWarehouseId) {
      setErrorMessage(isAr ? 'يرجى اختيار المخزن المستلم للبضاعة المرتجعة' : 'Please select receiving warehouse');
      return;
    }

    if (!reason.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال أو اختيار سبب المرتجع' : 'Please provide return reason');
      return;
    }

    if (selectedLines.length === 0) {
      setErrorMessage(
        isAr
          ? 'يرجى تحديد بند واحد على الأقل وإدخال كمية مرتجعة صالحة'
          : 'Please select at least one item with valid return quantity'
      );
      return;
    }

    // Client limit verification
    for (const l of selectedLines) {
      if (l.return_qty > l.remaining_qty) {
        setErrorMessage(
          isAr
            ? `الكمية المرتجعة للبند "${l.description}" تتجاوز المسموح (${l.remaining_qty})`
            : `Return quantity for "${l.description}" exceeds limit (${l.remaining_qty})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        warehouse_id: selectedWarehouseId,
        sales_invoice_id: invoice.id,
        customer_id: invoice.customer_id,
        sales_order_id: invoice.sales_order_id,
        return_date: new Date().toISOString().split('T')[0],
        reason: reason.trim(),
        is_restocked: isRestocked,
        notes: notes.trim() || undefined,
        items: selectedLines.map((l) => ({
          variant_id: l.variant_id,
          quantity: l.return_qty,
          unit_price: l.unit_price,
          condition: l.condition,
          action_taken: l.action_taken,
        })),
      };

      const res = await api.sales.createReturn(payload);
      const createdReturn = (res as any)?.sales_return || (res as any)?.return;

      if (createdReturn) {
        onSuccess(createdReturn);
        onClose();
      } else {
        throw new Error(isAr ? 'لم يتم استلام تأكيد المرتجع من الخادم' : 'No return record returned from server');
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || (isAr ? 'فشل تسجيل مرتجع المبيعات. يرجى مراجعة البيانات.' : 'Failed to register sales return')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تسجيل مرتجع مبيعات وإشعار دائن (Sales Return & Credit Note)' : 'Register Sales Return & Credit Note'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Invoice Summary Header Banner */}
        {invoice && (
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#7F1625] dark:text-[#F87171] shrink-0" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {isAr ? 'رقم الفاتورة:' : 'Invoice #:'} {invoice.invoice_number}
                </span>
                <span className="mx-2 text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{invoice.customer_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-mono">{invoice.invoice_date}</span>
              <Badge variant={invoice.status === 'paid' ? 'success' : 'neutral'}>
                {invoice.status}
              </Badge>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {Number(invoice.total_amount).toLocaleString()} ج.م
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Warehouse & Destination Configuration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
              <WarehouseIcon className="w-3.5 h-3.5 text-[#7F1625] dark:text-[#F87171]" />
              {isAr ? 'المخزن المستلم للبضاعة المرتجعة' : 'Receiving Warehouse'}
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              disabled={isSubmitting || warehouses.length === 0}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
              required
            >
              {warehouses.length === 0 ? (
                <option value="">{isAr ? 'جاري تحميل المخازن...' : 'Loading warehouses...'}</option>
              ) : (
                warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
              {isAr ? 'إعادة الإدخال للمخزن (Restock)' : 'Inventory Restock Policy'}
            </label>
            <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRestocked}
                onChange={(e) => setIsRestocked(e.target.checked)}
                className="w-4 h-4 text-[#7F1625] rounded focus:ring-[#7F1625]"
              />
              <span className="text-xs text-slate-800 dark:text-slate-200">
                {isAr
                  ? 'إعادة البضاعة السليمة آلياً إلى رصيد المخزن المتاح'
                  : 'Automatically credit sound units to sellable stock balance'}
              </span>
            </label>
          </div>
        </div>

        {/* Reason for Return with Quick Tags */}
        <div>
          <label className="block text-xs font-bold text-slate-900 dark:text-slate-200 mb-1.5">
            {isAr ? 'سبب المرتجع' : 'Return Reason'}
            <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {quickReasons.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => setReason(qr)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  reason === qr
                    ? 'bg-[#7F1625] text-white border-[#7F1625]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#7F1625]'
                }`}
              >
                {qr}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isAr ? 'اكتب أو اختر سبب المرتجع...' : 'Enter or select return reason...'}
            required
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
          />
        </div>

        {/* Eligible Returnable Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#7F1625] dark:text-[#F87171]" />
              {isAr ? 'بنود الفاتورة المؤهلة للإرجاع' : 'Invoice Items Eligible for Return'}
            </span>
            <span className="text-[11px] font-normal text-slate-500">
              {isAr ? 'حدد الكمية وحالة كل قطعة' : 'Set return quantity and condition per line'}
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 sticky top-0 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5 text-center w-10">#</th>
                  <th className="p-2.5 text-start">{isAr ? 'الصنف والبيان' : 'Item Description'}</th>
                  <th className="p-2.5 text-center w-16">{isAr ? 'المباع' : 'Sold'}</th>
                  <th className="p-2.5 text-center w-16">{isAr ? 'سابق' : 'Returned'}</th>
                  <th className="p-2.5 text-center w-20">{isAr ? 'المتبقي' : 'Max Ret.'}</th>
                  <th className="p-2.5 text-center w-24">{isAr ? 'كمية الإرجاع' : 'Return Qty'}</th>
                  <th className="p-2.5 text-center w-28">{isAr ? 'الحالة والإجراء' : 'Condition'}</th>
                  <th className="p-2.5 text-end w-24">{isAr ? 'قيمة المرتجع' : 'Line Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {isLoadingInvoice ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'جاري فحص البنود المؤهلة...' : 'Checking eligible return lines...'}
                    </td>
                  </tr>
                ) : returnLines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد بنود قابلة للإرجاع في هذه الفاتورة' : 'No returnable items found'}
                    </td>
                  </tr>
                ) : (
                  returnLines.map((line) => {
                    const isExhausted = line.remaining_qty <= 0;
                    const lineValue = line.return_qty * line.unit_price;

                    return (
                      <tr
                        key={line.item_id}
                        className={`transition-colors ${
                          isExhausted
                            ? 'opacity-40 bg-slate-50/50 dark:bg-slate-900/30'
                            : line.is_selected
                            ? 'bg-[#7F1625]/5 dark:bg-[#7F1625]/15'
                            : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={line.is_selected}
                            disabled={isExhausted}
                            onChange={() => handleToggleSelect(line.item_id)}
                            className="w-4 h-4 text-[#7F1625] rounded focus:ring-[#7F1625]"
                          />
                        </td>
                        <td className="p-2.5">
                          <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                            {line.description}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {line.unit_price.toLocaleString()} ج.م / {isAr ? 'قطعة' : 'pc'}
                          </p>
                        </td>
                        <td className="p-2.5 text-center font-mono font-medium">{line.sold_qty}</td>
                        <td className="p-2.5 text-center font-mono text-amber-600 dark:text-amber-400">
                          {line.returned_qty}
                        </td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {line.remaining_qty}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            min="0"
                            max={line.remaining_qty}
                            step="1"
                            disabled={isExhausted || !line.is_selected}
                            value={line.return_qty}
                            onChange={(e) => handleQtyChange(line.item_id, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 text-center font-bold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
                          />
                        </td>
                        <td className="p-2.5 text-center space-y-1">
                          <select
                            value={line.condition}
                            disabled={isExhausted || !line.is_selected}
                            onChange={(e) => handleConditionChange(line.item_id, e.target.value as any)}
                            className="w-full text-[10px] px-1.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                          >
                            <option value="good">{isAr ? 'سليم (Good)' : 'Good'}</option>
                            <option value="defective">{isAr ? 'معيب (Defect)' : 'Defective'}</option>
                            <option value="scrap">{isAr ? 'هالك (Scrap)' : 'Scrap'}</option>
                          </select>
                          <select
                            value={line.action_taken}
                            disabled={isExhausted || !line.is_selected}
                            onChange={(e) => handleActionChange(line.item_id, e.target.value as any)}
                            className="w-full text-[10px] px-1.5 py-0.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-600 dark:text-slate-400"
                          >
                            <option value="restock">{isAr ? 'إعادة للمخزن' : 'Restock'}</option>
                            <option value="repair">{isAr ? 'إصلاح / ورشة' : 'Repair'}</option>
                            <option value="discard">{isAr ? 'إتلاف' : 'Discard'}</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-end font-bold font-mono text-slate-900 dark:text-white">
                          {lineValue.toLocaleString()} ج.م
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Return Summary & Authoritative Credit Calculation Box */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <p className="text-slate-500 dark:text-slate-400">
              {isAr ? 'إجمالي القطع المرتجعة المحددة:' : 'Total Selected Return Units:'}
            </p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {totalReturnPieces} {isAr ? 'قطع' : 'pieces'}
            </p>
          </div>

          <div className="text-end">
            <p className="text-slate-500 dark:text-slate-400">
              {isAr ? 'قيمة إشعار الدائن المستحق (Credit Note):' : 'Authoritative Credit Note Amount:'}
            </p>
            <p className="text-xl font-bold text-[#7F1625] dark:text-[#F87171] font-mono">
              {totalReturnAmount.toLocaleString()} ج.م
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || selectedLines.length === 0}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            {isSubmitting
              ? isAr
                ? 'جاري حفظ المرتجع وإصدار الدائن...'
                : 'Saving & Generating Credit Note...'
              : isAr
              ? `تأكيد مرتجع بقيمة ${totalReturnAmount.toLocaleString()} ج.م`
              : `Confirm Return (${totalReturnAmount.toLocaleString()} EGP)`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

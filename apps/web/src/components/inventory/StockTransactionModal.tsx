import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { InventoryItem } from '../../types';
import { api, ApiError } from '../../api/client';

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSuccess: (updatedBalance: number, newTransaction?: any) => void;
  lang?: 'ar' | 'en';
}

export const StockTransactionModal: React.FC<StockTransactionModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
  lang = 'ar',
}) => {
  const isAr = lang !== 'en';
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [transactionType, setTransactionType] = useState<string>('goods_receipt');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!item) return null;

  const currentBalance = Number(item.current_balance ?? 0);
  const reorderLevel = Number(item.reorder_level ?? 0);
  const reservedQuantity = Number(item.reserved_quantity ?? 0);
  const availableQuantity = item.available_quantity !== undefined
    ? Number(item.available_quantity)
    : Math.max(0, currentBalance - reservedQuantity);

  const simulatedAfterBalance = direction === 'IN'
    ? currentBalance + quantity
    : currentBalance - quantity;

  // Low-stock warning calculations (Strictly distinct from prohibited negative stock error)
  const isCurrentlyLowStock = reorderLevel > 0 && currentBalance <= reorderLevel;
  const willBeLowStockAfterOut = direction === 'OUT' && reorderLevel > 0 && simulatedAfterBalance <= reorderLevel && simulatedAfterBalance >= 0;
  const isLowStockWarning = isCurrentlyLowStock || willBeLowStockAfterOut;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (quantity <= 0) {
      setErrorMsg(isAr ? 'يجب أن تكون الكمية أكبر من الصفر.' : 'Quantity must be greater than zero.');
      return;
    }

    if (direction === 'OUT' && currentBalance < quantity) {
      setErrorMsg(isAr
        ? `رصيد الصنف غير كافٍ للصرف! المتاح: ${currentBalance} ${item.unit_of_measure}.`
        : `Insufficient stock for issuance! Available: ${currentBalance} ${item.unit_of_measure}.`);
      return;
    }

    const isOperational = ['goods_receipt', 'material_issuance', 'transfer_in', 'transfer_out'].includes(transactionType);
    if (isOperational && !referenceNumber?.trim()) {
      setErrorMsg(isAr
        ? 'العمليات التشغيلية (التوريد، الصرف، التحويل) تتطلب إدخال رقم المستند المرجعي المعتمد (أمر شراء، أمر قص، أمر تحويل).'
        : 'Operational transactions (receipt, issuance, transfer) require an approved reference document number (PO, Cutting Order, Transfer Order).');
      return;
    }

    let refType: string | undefined = undefined;
    if (transactionType === 'goods_receipt') {
      refType = 'purchase_order';
    } else if (transactionType === 'material_issuance') {
      refType = 'cutting_order';
    } else if (transactionType === 'transfer_in' || transactionType === 'transfer_out') {
      refType = 'stock_transfer';
    } else {
      refType = referenceNumber?.trim() ? 'manual_reference' : undefined;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const res = await api.inventory.recordTransaction({
        inventory_item_id: item.id,
        transaction_type: transactionType as any,
        direction: direction,
        quantity: quantity,
        unit_cost: unitCost > 0 ? unitCost : undefined,
        reference_type: refType,
        reference_number: referenceNumber?.trim() || undefined,
        notes: notes || undefined,
        idempotency_key: idempotencyKey,
      });

      const confirmedBalance = Number(res.transaction?.balance_after ?? simulatedAfterBalance);
      setIsSubmitting(false);
      onSuccess(confirmedBalance, res.transaction);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      if (err instanceof ApiError) {
        if (err.errors) {
          const firstErr = Object.values(err.errors).flat()[0];
          setErrorMsg(firstErr ? String(firstErr) : err.message);
        } else {
          setErrorMsg(err.message || (isAr ? 'فشل تسجيل الحركة المخزنية من الخادم' : 'Failed to record stock movement from server'));
        }
      } else {
        setErrorMsg(isAr ? 'حدث خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل واجهة الـ API.' : 'Server connection error. Please verify the API is running.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `تسجيل حركة مخزنية رسمية: ${item.name}` : `Official Stock Transaction: ${item.name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Low Stock Warning Alert (Non-blocking warning) */}
        {isLowStockWarning && (
          <div
            data-testid="low-stock-warning"
            className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5 transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-1.5 flex-wrap">
                <span>
                  {isAr ? 'تنبيه: الصنف عند حد إعادة الطلب أو أقل' : 'Warning: Item at or below Reorder Threshold'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {isAr ? `الحد الأدنى: ${reorderLevel} ${item.unit_of_measure}` : `Min Reorder: ${reorderLevel} ${item.unit_of_measure}`}
                </span>
              </div>
              <p className="text-[11px] text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                {willBeLowStockAfterOut
                  ? (isAr
                      ? `عملية الصرف الحالية ستخفض الرصيد إلى ${simulatedAfterBalance.toLocaleString()} ${item.unit_of_measure} وهو أقل من أو يساوي حد إعادة الطلب (${reorderLevel}). يرجى إصدار أمر شراء للتوريد.`
                      : `This issuance will reduce stock to ${simulatedAfterBalance.toLocaleString()} ${item.unit_of_measure}, reaching or dropping below the reorder level (${reorderLevel}). Consider issuing a replenishment PO.`)
                  : (isAr
                      ? `رصيد الصنف الحالي (${currentBalance.toLocaleString()} ${item.unit_of_measure}) عند أو أقل من حد الأمان المحدد (${reorderLevel} ${item.unit_of_measure}).`
                      : `Current item balance (${currentBalance.toLocaleString()} ${item.unit_of_measure}) is already at or below safety reorder level (${reorderLevel} ${item.unit_of_measure}).`)}
              </p>
            </div>
          </div>
        )}

        {/* Current status bar */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'كود الصنف والمخزن:' : 'Item Code & Warehouse:'}
            </span>
            <span className="font-mono text-brand-primary dark:text-rose-400 font-semibold">{item.code}</span> • <span className="text-slate-800 dark:text-slate-300">{item.warehouse_name}</span>
            {reorderLevel > 0 && (
              <span className="ms-2 inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {isAr ? `حد إعادة الطلب: ${reorderLevel} ${item.unit_of_measure}` : `Reorder: ${reorderLevel} ${item.unit_of_measure}`}
              </span>
            )}
          </div>
          <div className="text-right sm:text-left rtl:text-right rtl:sm:text-left ltr:text-left ltr:sm:text-right">
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'الرصيد الدفتري الحالي:' : 'Current Ledger Balance:'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                {currentBalance.toLocaleString()} {item.unit_of_measure}
              </span>
              {reservedQuantity > 0 && (
                <span className="text-[10px] text-slate-500 font-mono">
                  ({isAr ? `المتاح: ${availableQuantity}` : `Avail: ${availableQuantity}`})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Direction Selector */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setDirection('IN'); setTransactionType('goods_receipt'); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              direction === 'IN'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            {isAr ? 'إذن إضافة / استلام للمخزن (IN)' : 'Goods Receipt / Inward (IN)'}
          </button>
          <button
            type="button"
            onClick={() => { setDirection('OUT'); setTransactionType('material_issuance'); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              direction === 'OUT'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            {isAr ? 'إذن صرف للإنتاج / صالة القص (OUT)' : 'Material Issuance / Cutting (OUT)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? `الكمية المطلوبة (${item.unit_of_measure})` : `Requested Quantity (${item.unit_of_measure})`}
            </label>
            <input
              type="number"
              step="any"
              required
              min="0.001"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'نوع المستند المرجعي' : 'Reference Document Type'}
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {direction === 'IN' ? (
                <>
                  <option value="goods_receipt">{isAr ? 'استلام توريد من مورد (PO)' : 'Goods Receipt from PO'}</option>
                  <option value="adjustment_positive">{isAr ? 'تسوية جردية بالزيادة' : 'Inventory Positive Adjustment'}</option>
                  <option value="transfer_in">{isAr ? 'استلام تحويل من مخزن آخر' : 'Stock Transfer In'}</option>
                </>
              ) : (
                <>
                  <option value="material_issuance">{isAr ? 'صرف خامات لصالة القص / الإنتاج' : 'Material Issuance to Cutting'}</option>
                  <option value="adjustment_negative">{isAr ? 'تسوية جردية بالعجز / هالك' : 'Inventory Negative / Scrap Adjustment'}</option>
                  <option value="transfer_out">{isAr ? 'تحويل لمخزن فرعي' : 'Stock Transfer Out'}</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تكلفة الوحدة (ج.م)' : 'Unit Cost (EGP)'}
            </label>
            <input
              type="number"
              step="any"
              value={unitCost}
              onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رقم إذن / أمر التشغيل' : 'Reference / Job Order No.'}
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={isAr ? 'مثال: CUT-ORD-2026-081' : 'e.g. CUT-ORD-2026-081'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات مسؤول المخزن' : 'Storekeeper Notes'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات رقم اللفة، فحص العيوب، نسبة الهالك...' : 'Roll/batch notes, defect inspection, scrap rate...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Balance After Preview */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-[var(--bg-elevated)] border border-slate-200 dark:border-[var(--border-subtle)] flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">
            {isAr ? 'الرصيد الناتج بعد ترحيل القيد:' : 'Resulting Balance After Movement:'}
          </span>
          <div className="flex items-center gap-2">
            {simulatedAfterBalance < 0 ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {isAr ? 'غير مسموح — رصيد سالب' : 'Prohibited — Negative Stock'}
              </span>
            ) : willBeLowStockAfterOut ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {isAr ? 'تحت حد إعادة الطلب' : 'Below Reorder Threshold'}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {isAr ? 'رصيد كافٍ' : 'Safe Balance'}
              </span>
            )}
            <span className={`font-mono font-bold text-sm ${
              simulatedAfterBalance < 0
                ? 'text-rose-600 dark:text-rose-400'
                : willBeLowStockAfterOut
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {simulatedAfterBalance.toLocaleString()} {item.unit_of_measure}
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isAr ? 'ترحيل الحركة واعتماد القيد' : 'Post Movement & Record Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

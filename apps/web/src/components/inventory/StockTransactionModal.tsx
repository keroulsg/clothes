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
}

export const StockTransactionModal: React.FC<StockTransactionModalProps> = ({
  isOpen,
  onClose,
  item,
  onSuccess,
}) => {
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [transactionType, setTransactionType] = useState<string>('goods_receipt');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!item) return null;

  const currentBalance = item.current_balance;
  const simulatedAfterBalance = direction === 'IN'
    ? currentBalance + quantity
    : currentBalance - quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (quantity <= 0) {
      setErrorMsg('يجب أن تكون الكمية أكبر من الصفر.');
      return;
    }

    if (direction === 'OUT' && currentBalance < quantity) {
      setErrorMsg(`رصيد الصنف غير كافٍ للصرف! المتاح: ${currentBalance} ${item.unit_of_measure}.`);
      return;
    }

    const isOperational = ['goods_receipt', 'material_issuance', 'transfer_in', 'transfer_out'].includes(transactionType);
    if (isOperational && !referenceNumber?.trim()) {
      setErrorMsg('العمليات التشغيلية (التوريد، الصرف، التحويل) تتطلب إدخال رقم المستند المرجعي المعتمد (أمر شراء، أمر قص، أمر تحويل).');
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
          setErrorMsg(err.message || 'فشل تسجيل الحركة المخزنية من الخادم');
        }
      } else {
        setErrorMsg('حدث خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل واجهة الـ API.');
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تسجيل حركة مخزنية رسمية: ${item.name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Current status bar */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">كود الصنف والمخزن:</span>
            <span className="font-mono text-brand-primary dark:text-rose-400 font-semibold">{item.code}</span> • <span className="text-slate-800 dark:text-slate-300">{item.warehouse_name}</span>
          </div>
          <div className="text-left">
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">الرصيد الدفتري الحالي:</span>
            <span className="font-mono text-base font-bold text-slate-900 dark:text-slate-100">{currentBalance.toLocaleString()} {item.unit_of_measure}</span>
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
            إذن إضافة / استلام للمخزن (IN)
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
            إذن صرف للإنتاج / صالة القص (OUT)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              الكمية المطلوبة ({item.unit_of_measure})
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
              نوع المستند المرجعي
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {direction === 'IN' ? (
                <>
                  <option value="goods_receipt">استلام توريد من مورد (PO)</option>
                  <option value="adjustment_positive">تسوية جردية بالزيادة</option>
                  <option value="transfer_in">استلام تحويل من مخزن آخر</option>
                </>
              ) : (
                <>
                  <option value="material_issuance">صرف خامات لصالة القص / الإنتاج</option>
                  <option value="adjustment_negative">تسوية جردية بالعجز / هالك</option>
                  <option value="transfer_out">تحويل لمخزن فرعي</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              تكلفة الوحدة (ج.م)
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
              رقم إذن / أمر التشغيل
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="مثال: CUT-ORD-2026-081"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات مسؤول المخزن</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات رقم اللفة، فحص العيوب، نسبة الهالك..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Balance After Preview */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-400">الرصيد الناتج بعد ترحيل القيد:</span>
          <span className={`font-mono font-bold text-sm ${simulatedAfterBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {simulatedAfterBalance.toLocaleString()} {item.unit_of_measure}
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            ترحيل الحركة واعتماد القيد
          </Button>
        </div>
      </form>
    </Modal>
  );
};

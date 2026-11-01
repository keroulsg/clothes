import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PurchaseOrder, GoodsReceiptNote } from '../../types';
import { api } from '../../api/client';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onSuccess: (updatedPo: PurchaseOrder, newGrn: GoodsReceiptNote) => void;
  isAr?: boolean;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess,
  isAr = true,
}) => {
  if (!purchaseOrder) return null;

  const firstItem = purchaseOrder.items[0];
  const remainingMax = firstItem ? firstItem.remaining_quantity : 0;

  const [deliveredQuantity, setDeliveredQuantity] = useState(remainingMax);
  const [acceptedQuantity, setAcceptedQuantity] = useState(remainingMax);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectorName, setInspectorName] = useState(isAr ? 'م. طارق كمال (فحص الجودة)' : 'QC Inspector');
  const [inspectionStatus, setInspectionStatus] = useState<'passed' | 'partial_pass' | 'failed'>('passed');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeliveredChange = (val: number) => {
    setDeliveredQuantity(val);
    setAcceptedQuantity(val);
    setRejectedQuantity(0);
  };

  const handleAcceptedChange = (val: number) => {
    setAcceptedQuantity(val);
    const rej = Math.max(0, deliveredQuantity - val);
    setRejectedQuantity(rej);
    if (rej > 0 && inspectionStatus === 'passed') {
      setInspectionStatus('partial_pass');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (deliveredQuantity <= 0) {
      setErrorMsg(isAr ? 'يجب أن تكون الكمية المسلمة أكبر من الصفر.' : 'Delivered quantity must be greater than zero.');
      return;
    }

    if (deliveredQuantity > remainingMax) {
      setErrorMsg(
        isAr
          ? `الكمية المسلمة [${deliveredQuantity}] تتجاوز الكمية المتبقية في أمر الشراء [${remainingMax}].`
          : `Delivered quantity [${deliveredQuantity}] exceeds remaining in PO [${remainingMax}].`
      );
      return;
    }

    if (acceptedQuantity + rejectedQuantity > deliveredQuantity) {
      setErrorMsg(isAr ? 'مجموع الكميات المقبولة والمرفوضة لا يتطابق مع الكمية المسلمة.' : 'Sum of accepted and rejected quantities exceeds delivered.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.procurement.createGoodsReceipt({
        purchase_order_id: purchaseOrder.id,
        warehouse_id: purchaseOrder.warehouse_id,
        receipt_date: new Date().toISOString().split('T')[0],
        quality_inspector_name: inspectorName,
        inspection_status: inspectionStatus,
        items: [
          {
            purchase_order_item_id: firstItem?.id,
            delivered_quantity: Number(deliveredQuantity),
            accepted_quantity: Number(acceptedQuantity),
            rejected_quantity: Number(rejectedQuantity),
            rejection_reason: rejectionReason || undefined,
          },
        ],
      });

      if (res.goods_receipt_note) {
        const updatedRemaining = remainingMax - deliveredQuantity;
        const updatedPo: PurchaseOrder = {
          ...purchaseOrder,
          status: updatedRemaining <= 0 ? 'received' : 'partially_received',
          items: purchaseOrder.items.map(it => ({
            ...it,
            received_quantity: it.received_quantity + acceptedQuantity,
            remaining_quantity: updatedRemaining,
          })),
        };

        onSuccess(updatedPo, res.goods_receipt_note);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر تسجيل إذن الاستلام والفحص على الخادم.' : 'Failed to record goods receipt on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `استلام وفحص بضاعة: ${purchaseOrder.po_number}` : `Receive & Inspect Goods: ${purchaseOrder.po_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">{isAr ? 'المورد:' : 'Supplier:'}</span>
            <span className="font-semibold text-slate-200">{purchaseOrder.supplier_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{isAr ? 'المخزن المستهدف:' : 'Target Warehouse:'}</span>
            <span className="text-primary dark:text-[#fca5a5] font-medium">{purchaseOrder.warehouse_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">{isAr ? 'الكمية المتبقية للتوريد في أمر الشراء:' : 'Remaining Quantity on PO:'}</span>
            <span className="font-mono font-bold text-emerald-400">{remainingMax} {isAr ? 'متر / وحدة' : 'm / units'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الكمية المسلمة' : 'Delivered Quantity'}
            </label>
            <input
              type="number"
              step="any"
              required
              min="0.1"
              max={remainingMax}
              value={deliveredQuantity}
              onChange={(e) => handleDeliveredChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              {isAr ? 'المقبول (يدخل المخزن)' : 'Accepted (Store intake)'}
            </label>
            <input
              type="number"
              step="any"
              required
              min="0"
              max={deliveredQuantity}
              value={acceptedQuantity}
              onChange={(e) => handleAcceptedChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500/50 rounded-lg text-xs p-2.5 text-emerald-700 dark:text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">
              {isAr ? 'المرفوض (تالف/عيوب)' : 'Rejected (Defects)'}
            </label>
            <input
              type="number"
              step="any"
              value={rejectedQuantity}
              onChange={(e) => setRejectedQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-rose-400 dark:border-rose-500/50 rounded-lg text-xs p-2.5 text-rose-700 dark:text-rose-300 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {rejectedQuantity > 0 && (
          <div>
            <label className="block text-xs font-semibold text-rose-600 dark:text-rose-300 mb-1">
              {isAr ? 'سبب رفض الكمية المعيبة' : 'Rejection Reason'}
            </label>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={isAr ? 'مثال: وجود بقع زيتية وتنسيل في خيوط اللحمة أو اختلاف درجة الصباغة' : 'e.g. Oil stains, weaving defects, or shade variation'}
              className="w-full bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/40 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم مهندس / مسؤول الجودة' : 'Quality Inspector Name'}
            </label>
            <input
              type="text"
              required
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رقم إذن تسليم المورد (سند الشحن)' : 'Supplier Delivery Note #'}
            </label>
            <input
              type="text"
              value={deliveryNoteNumber}
              onChange={(e) => setDeliveryNoteNumber(e.target.value)}
              placeholder="DN-MISR-9844"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400">
            {isAr ? 'الكمية الصافية المضافة لرصيد المخزن الدفتري:' : 'Net Quantity Added to Warehouse Inventory:'}
          </span>
          <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            +{acceptedQuantity.toLocaleString()} {isAr ? 'متر' : 'm'}
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isAr ? 'اعتماد إذن الاستلام وتحديث المخزن' : 'Approve Receipt & Update Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

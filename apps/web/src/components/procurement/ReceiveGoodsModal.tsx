import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, CheckCircle2, ShieldCheck, Package } from 'lucide-react';
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

  const firstItem = purchaseOrder.items?.[0];
  const remainingMax = firstItem ? Number(firstItem.remaining_quantity) : 0;

  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(remainingMax || 1);
  const [acceptedQuantity, setAcceptedQuantity] = useState<number>(remainingMax || 1);
  const [rejectedQuantity, setRejectedQuantity] = useState<number>(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectorName, setInspectorName] = useState('أمين المخزن / مسؤول الجودة');
  const [inspectionStatus, setInspectionStatus] = useState<'passed' | 'partial_pass' | 'failed'>('passed');
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever the modal opens or a different PO is selected
  useEffect(() => {
    if (purchaseOrder && isOpen) {
      const remaining = Number(purchaseOrder.items?.[0]?.remaining_quantity ?? 0);
      const defaultQty = remaining > 0 ? remaining : Number(purchaseOrder.items?.[0]?.ordered_quantity ?? 1);
      setDeliveredQuantity(defaultQty);
      setAcceptedQuantity(defaultQty);
      setRejectedQuantity(0);
      setRejectionReason('');
      setInspectorName('أمين المخزن / مسؤول الجودة');
      setInspectionStatus('passed');
      setDeliveryNoteNumber('DN-' + Math.floor(1000 + Math.random() * 9000));
      setErrorMsg('');
    }
  }, [purchaseOrder, isOpen]);

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

    if (remainingMax > 0 && deliveredQuantity > remainingMax) {
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
        delivery_note_number: deliveryNoteNumber || undefined,
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
        const updatedRemaining = Math.max(0, remainingMax - deliveredQuantity);
        const updatedPo: PurchaseOrder = {
          ...purchaseOrder,
          status: updatedRemaining <= 0 ? 'received' : 'partially_received',
          items: purchaseOrder.items.map((it, idx) =>
            idx === 0
              ? {
                  ...it,
                  received_quantity: Number(it.received_quantity) + acceptedQuantity,
                  remaining_quantity: updatedRemaining,
                }
              : it
          ),
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

  const itemDisplayName = firstItem?.item_name || (firstItem as any)?.item?.name || 'خامات توريد';
  const itemDisplayCode = firstItem?.item_code || (firstItem as any)?.item?.code || 'MAT-01';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `استلام وفحص بضاعة: ${purchaseOrder.po_number}` : `Receive & Inspect Goods: ${purchaseOrder.po_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500">{isAr ? 'المورد:' : 'Supplier:'}</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{purchaseOrder.supplier_name}</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500">{isAr ? 'المستودع المستهدف لاستلام الشحنة:' : 'Target Warehouse:'}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{purchaseOrder.warehouse_name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              {isAr ? 'الصنف المستلم:' : 'Item:'}
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {itemDisplayName} <span className="font-mono text-slate-400 text-[11px]">({itemDisplayCode})</span>
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500">{isAr ? 'الكمية المتبقية للتوريد في أمر الشراء:' : 'Remaining on PO:'}</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {remainingMax} {isAr ? 'متر / وحدة' : 'm / units'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الكمية المسلمة (الواردة)' : 'Delivered Quantity'}
            </label>
            <input
              type="number"
              step="any"
              required
              min="0.1"
              max={remainingMax > 0 ? remainingMax : undefined}
              value={deliveredQuantity}
              onChange={(e) => handleDeliveredChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              {isAr ? 'المقبول (يدخل المخزن)' : 'Accepted (Store Intake)'}
            </label>
            <input
              type="number"
              step="any"
              required
              min="0"
              max={deliveredQuantity}
              value={acceptedQuantity}
              onChange={(e) => handleAcceptedChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-emerald-400 dark:border-emerald-500/50 rounded-lg text-xs p-2.5 text-emerald-700 dark:text-emerald-300 font-mono text-center focus:outline-none focus:border-emerald-500 font-bold"
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
              className="w-full bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-500/50 rounded-lg text-xs p-2.5 text-rose-700 dark:text-rose-300 font-mono text-center focus:outline-none focus:border-rose-500"
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
              placeholder={isAr ? 'اسم مسؤول الفحص والجودة' : 'Inspector Name'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
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
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Live confirmation of warehouse stock addition */}
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs flex items-center justify-between">
          <span className="text-emerald-800 dark:text-emerald-300 font-medium">
            {isAr ? 'الكمية الصافية المضافة لرصيد المخزن الدفتري:' : 'Net Quantity Added to Warehouse Inventory:'}
          </span>
          <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            +{acceptedQuantity.toLocaleString()} {isAr ? 'متر / وحدة' : 'm'}
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<ShieldCheck className="w-4 h-4" />}>
            {isAr ? 'اعتماد إذن الاستلام وتحديث المخزن' : 'Approve Receipt & Update Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

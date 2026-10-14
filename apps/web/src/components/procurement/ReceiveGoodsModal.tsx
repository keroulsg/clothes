import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PurchaseOrder, GoodsReceiptNote } from '../../types';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  onSuccess: (updatedPo: PurchaseOrder, newGrn: GoodsReceiptNote) => void;
}

export const ReceiveGoodsModal: React.FC<ReceiveGoodsModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onSuccess,
}) => {
  if (!purchaseOrder) return null;

  const firstItem = purchaseOrder.items[0];
  const remainingMax = firstItem ? firstItem.remaining_quantity : 0;

  const [deliveredQuantity, setDeliveredQuantity] = useState(remainingMax);
  const [acceptedQuantity, setAcceptedQuantity] = useState(remainingMax);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectorName, setInspectorName] = useState('م. طارق كمال (فحص الجودة)');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (deliveredQuantity <= 0) {
      setErrorMsg('يجب أن تكون الكمية المسلمة أكبر من الصفر.');
      return;
    }

    if (deliveredQuantity > remainingMax) {
      setErrorMsg(`الكمية المسلمة [${deliveredQuantity}] تتجاوز الكمية المتبقية في أمر الشراء [${remainingMax}].`);
      return;
    }

    if (acceptedQuantity + rejectedQuantity > deliveredQuantity) {
      setErrorMsg('مجموع الكميات المقبولة والمرفوضة لا يتطابق مع الكمية المسلمة.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const grnNumber = 'GRN-' + Math.floor(1000 + Math.random() * 9000);
      const newGrn: GoodsReceiptNote = {
        id: 'grn-' + Date.now(),
        grn_number: grnNumber,
        po_number: purchaseOrder.po_number,
        supplier_name: purchaseOrder.supplier_name,
        warehouse_name: purchaseOrder.warehouse_name,
        receipt_date: new Date().toISOString().split('T')[0],
        quality_inspector_name: inspectorName,
        inspection_status: inspectionStatus,
        accepted_quantity: acceptedQuantity,
        rejected_quantity: rejectedQuantity,
        rejection_reason: rejectionReason || undefined,
      };

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

      onSuccess(updatedPo, newGrn);
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`استلام وفحص بضاعة: ${purchaseOrder.po_number}`}
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
            <span className="text-slate-400">المورد:</span>
            <span className="font-semibold text-slate-200">{purchaseOrder.supplier_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">المخزن المستهدف:</span>
            <span className="text-indigo-400 font-medium">{purchaseOrder.warehouse_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">الكمية المتبقية للتوريد في أمر الشراء:</span>
            <span className="font-mono font-bold text-emerald-400">{remainingMax} متر / وحدة</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المسلمة</label>
            <input
              type="number"
              step="any"
              required
              min="0.1"
              max={remainingMax}
              value={deliveredQuantity}
              onChange={(e) => handleDeliveredChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-400 mb-1">المقبول (يدخل المخزن)</label>
            <input
              type="number"
              step="any"
              required
              min="0"
              max={deliveredQuantity}
              value={acceptedQuantity}
              onChange={(e) => handleAcceptedChange(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg text-xs p-2.5 text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-400 mb-1">المرفوض (تالف/عيوب)</label>
            <input
              type="number"
              step="any"
              value={rejectedQuantity}
              onChange={(e) => setRejectedQuantity(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-rose-500/50 rounded-lg text-xs p-2.5 text-rose-300 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {rejectedQuantity > 0 && (
          <div>
            <label className="block text-xs font-semibold text-rose-300 mb-1">سبب رفض الكمية المعيبة</label>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="مثال: وجود بقع زيتية وتنسيل في خيوط اللحمة أو اختلاف درجة الصباغة"
              className="w-full bg-slate-800 border border-rose-500/40 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم مهندس / مسؤول الجودة</label>
            <input
              type="text"
              required
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">رقم إذن تسليم المورد (سند الشحن)</label>
            <input
              type="text"
              value={deliveryNoteNumber}
              onChange={(e) => setDeliveryNoteNumber(e.target.value)}
              placeholder="مثال: DN-MISR-9844"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
          <span className="text-slate-400">الكمية الصافية المضافة لرصيد المخزن الدفتري:</span>
          <span className="font-mono font-bold text-sm text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            +{acceptedQuantity.toLocaleString()} متر
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            اعتماد إذن الاستلام وتحديث المخزن
          </Button>
        </div>
      </form>
    </Modal>
  );
};

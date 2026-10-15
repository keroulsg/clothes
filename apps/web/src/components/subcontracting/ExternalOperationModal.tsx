import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ExternalOperation, JobOrder } from '../../types';

interface ExternalOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrders: JobOrder[];
  existingOperation?: ExternalOperation | null;
  onSuccess: (op: ExternalOperation) => void;
}

export const ExternalOperationModal: React.FC<ExternalOperationModalProps> = ({
  isOpen,
  onClose,
  jobOrders,
  existingOperation,
  onSuccess,
}) => {
  const isReceiving = !!existingOperation;

  const [jobOrderId, setJobOrderId] = useState(existingOperation?.job_order_id || jobOrders[0]?.id || '');
  const [subcontractorName, setSubcontractorName] = useState(existingOperation?.subcontractor_name || 'مطبعة الأهرام الحديثة');
  const [operationType, setOperationType] = useState<ExternalOperation['operation_type']>(existingOperation?.operation_type || 'embroidery');
  const [sentQuantity, setSentQuantity] = useState<number>(existingOperation?.sent_quantity || 100);
  const [unitRate, setUnitRate] = useState<number>(existingOperation?.unit_rate || 3.5);
  const [notes, setNotes] = useState(existingOperation?.notes || '');

  // Receiving state
  const [acceptedQty, setAcceptedQty] = useState<number>(existingOperation?.received_accepted_quantity || existingOperation?.sent_quantity || 0);
  const [rejectedQty, setRejectedQty] = useState<number>(existingOperation?.received_rejected_quantity || 0);
  const [scrapQty, setScrapQty] = useState<number>(existingOperation?.scrap_quantity || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isReceiving) {
      const sum = Number(acceptedQty) + Number(rejectedQty) + Number(scrapQty);
      if (sum > (existingOperation?.sent_quantity || 0)) {
        setError(`مجموع الكميات المستلمة (${sum}) لا يمكن أن يتجاوز الكمية المرسلة أصلاً (${existingOperation?.sent_quantity})`);
        return;
      }
    }

    setIsSubmitting(true);

    if (isReceiving && existingOperation) {
      const updated: ExternalOperation = {
        ...existingOperation,
        received_accepted_quantity: Number(acceptedQty),
        received_rejected_quantity: Number(rejectedQty),
        scrap_quantity: Number(scrapQty),
        status: (Number(acceptedQty) + Number(rejectedQty) + Number(scrapQty)) >= existingOperation.sent_quantity ? 'completed' : 'partially_returned',
        returned_at: new Date().toISOString(),
      };
      setTimeout(() => {
        onSuccess(updated);
        setIsSubmitting(false);
        onClose();
      }, 400);
    } else {
      const newOp: ExternalOperation = {
        id: 'ext-' + Date.now(),
        operation_number: 'EXT-' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
        job_order_id: jobOrderId,
        subcontractor_name: subcontractorName,
        operation_type: operationType,
        sent_quantity: Number(sentQuantity),
        received_accepted_quantity: 0,
        received_rejected_quantity: 0,
        scrap_quantity: 0,
        unit_rate: Number(unitRate),
        total_cost: Number(sentQuantity) * Number(unitRate),
        status: 'dispatched',
        dispatched_at: new Date().toISOString(),
        notes: notes || undefined,
      };
      setTimeout(() => {
        onSuccess(newOp);
        setIsSubmitting(false);
        onClose();
      }, 400);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReceiving ? 'استلام وفحص مخرجات التشغيل الخارجي' : 'إرسال تشغيل خارجي لمقاول باطن (Outsourced Operation)'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {!isReceiving ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">أمر التشغيل المرتبط</label>
                <select
                  value={jobOrderId}
                  onChange={(e) => setJobOrderId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {jobOrders.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.order_number} ({j.customer_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">اسم المقاول / الورشة الخارجية</label>
                <input
                  type="text"
                  required
                  value={subcontractorName}
                  onChange={(e) => setSubcontractorName(e.target.value)}
                  placeholder="مثال: ورشة الفيروز للتطريز والطباعة"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">نوع العملية</label>
                <select
                  value={operationType}
                  onChange={(e) => setOperationType(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="embroidery">تطريز آلي (Embroidery)</option>
                  <option value="printing">طباعة سلك سكرين / ترانسفير (Printing)</option>
                  <option value="washing">غسيل ومعالجة أنزيمات (Washing)</option>
                  <option value="finishing">تشطيب وتغليف خارجي (Finishing)</option>
                  <option value="overlocking">أوفر وتثبيت أكمام (Overlocking)</option>
                  <option value="other">عملية مخصصة أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المرسلة (قطعة)</label>
                <input
                  type="number"
                  required
                  value={sentQuantity}
                  onChange={(e) => setSentQuantity(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">سعر القطعة للمقاول (ج.م)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitRate}
                  onChange={(e) => setUnitRate(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">العملية: </span>
                <strong className="text-slate-100">{existingOperation?.operation_type}</strong>
                <span className="text-slate-400 mx-2">• المقاول: </span>
                <strong className="text-slate-100">{existingOperation?.subcontractor_name}</strong>
              </div>
              <div>
                <span className="text-slate-400">الكمية المرسلة: </span>
                <strong className="text-indigo-400 font-mono text-sm">{existingOperation?.sent_quantity}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المقبولة (السليمة)</label>
                <input
                  type="number"
                  required
                  value={acceptedQty}
                  onChange={(e) => setAcceptedQty(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">الكمية المرفوضة (Rework)</label>
                <input
                  type="number"
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">كمية التالف / الهالك النهائي</label>
                <input
                  type="number"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات التشغيل الخارجي</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تعليمات أو أسباب العيوب إن وجدت..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isReceiving ? 'تأكيد استلام وفحص المخرجات' : 'تأكيد إرسال التشغيل الخارجي'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

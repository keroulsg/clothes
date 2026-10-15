import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { JobDeliveryNote, JobOrder } from '../../types';

interface JobDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrder: JobOrder | null;
  onSuccess: (newDelivery: JobDeliveryNote) => void;
}

export const JobDeliveryModal: React.FC<JobDeliveryModalProps> = ({
  isOpen,
  onClose,
  jobOrder,
  onSuccess,
}) => {
  if (!jobOrder) return null;

  const remainingToDeliver = Math.max(0, jobOrder.total_target_quantity - jobOrder.total_delivered_quantity);

  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveredPieces, setDeliveredPieces] = useState<number>(remainingToDeliver);
  const [returnedFabric, setReturnedFabric] = useState<number>(0);
  const [scrapFabric, setScrapFabric] = useState<number>(0);
  const [deliveredBy, setDeliveredBy] = useState('سائق سيارة المصنع');
  const [receivedByCustomer, setReceivedByCustomer] = useState('مسؤول استلام العميل');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (deliveredPieces <= 0) {
      setError('يجب أن تكون كمية القطع المسلمة أكبر من الصفر');
      return;
    }

    if (deliveredPieces > remainingToDeliver) {
      setError(`الكمية المراد تسليمها (${deliveredPieces}) تتجاوز الرصيد المتبقي المتاح للتسليم (${remainingToDeliver})`);
      return;
    }

    setIsSubmitting(true);

    const newDelivery: JobDeliveryNote = {
      id: 'jdn-' + Date.now(),
      delivery_number: 'JDN-' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
      job_order_id: jobOrder.id,
      order_number: jobOrder.order_number,
      customer_name: jobOrder.customer_name,
      delivery_date: deliveryDate,
      status: 'delivered',
      total_delivered_pieces: Number(deliveredPieces),
      returned_unused_fabric_meters: Number(returnedFabric),
      scrap_fabric_meters: Number(scrapFabric),
      delivered_by: deliveredBy,
      received_by_customer: receivedByCustomer,
      notes: notes || undefined,
      items: [
        {
          delivered_quantity: Number(deliveredPieces),
        },
      ],
    };

    setTimeout(() => {
      onSuccess(newDelivery);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إصدار إذن تسليم للعميل — ${jobOrder.order_number}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* ملخص الرصيد المتاح للتسليم */}
        <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">الكمية المستهدفة</span>
            <strong className="text-slate-100 font-mono text-sm">{jobOrder.total_target_quantity}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">المسلم سابقاً</span>
            <strong className="text-emerald-400 font-mono text-sm">{jobOrder.total_delivered_quantity}</strong>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">المتاح للتسليم</span>
            <strong className="text-indigo-400 font-mono text-sm">{remainingToDeliver}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">العميل المستلم</label>
            <input
              type="text"
              disabled
              value={jobOrder.customer_name}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs p-2.5 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ التسليم الفعلي</label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">القطع المسلمة في هذا الإذن</label>
          <input
            type="number"
            required
            max={remainingToDeliver}
            value={deliveredPieces}
            onChange={(e) => setDeliveredPieces(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-sm font-bold text-indigo-400"
          />
        </div>

        {/* مصالحة أمانة الخامات */}
        <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-200 block">مصالحة وتسليم خامات العميل (Reconciliation)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">أمتار قماش سليم مرتجع للعميل (إن وجد)</label>
              <input
                type="number"
                step="0.01"
                value={returnedFabric}
                onChange={(e) => setReturnedFabric(Number(e.target.value))}
                placeholder="0.0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">أمتار عوادم وهالك مسلّمة للعميل (Scrap)</label>
              <input
                type="number"
                step="0.01"
                value={scrapFabric}
                onChange={(e) => setScrapFabric(Number(e.target.value))}
                placeholder="0.0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المسؤول عن التسليم (المصنع)</label>
            <input
              type="text"
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المستلم من طرف العميل</label>
            <input
              type="text"
              value={receivedByCustomer}
              onChange={(e) => setReceivedByCustomer(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات إذن التسليم</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="حالة التغليف، رقم بوليصة الشحن، أو توقيع الاستلام..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            تأكيد تسليم البضاعة ومصالحة الخامات
          </Button>
        </div>
      </form>
    </Modal>
  );
};

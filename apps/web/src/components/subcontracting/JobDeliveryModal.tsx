import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { JobDeliveryNote, JobOrder } from '../../types';
import { api } from '../../api/client';

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
  const remainingToDeliver = jobOrder
    ? Math.max(0, jobOrder.total_target_quantity - jobOrder.total_delivered_quantity)
    : 0;

  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [deliveredPieces, setDeliveredPieces] = useState<number>(remainingToDeliver);
  const [returnedFabric, setReturnedFabric] = useState<number>(0);
  const [scrapFabric, setScrapFabric] = useState<number>(0);
  const [deliveredBy, setDeliveredBy] = useState('سائق سيارة المصنع');
  const [receivedByCustomer, setReceivedByCustomer] = useState('مسؤول استلام العميل');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!jobOrder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

    const payload = {
      job_order_id: jobOrder.id,
      delivery_date: deliveryDate,
      total_delivered_pieces: Number(deliveredPieces),
      returned_unused_fabric_meters: Number(returnedFabric),
      scrap_fabric_meters: Number(scrapFabric),
      delivered_by: deliveredBy || undefined,
      received_by_customer: receivedByCustomer || undefined,
      notes: notes || undefined,
      items: [
        {
          delivered_quantity: Number(deliveredPieces),
        },
      ],
    };

    try {
      const res = await api.subcontracting.createDeliveryNote(payload);
      const created = res.data;
      const formattedDelivery: JobDeliveryNote = {
        id: created.id,
        delivery_number: created.delivery_number || ('JDN-' + Date.now().toString().slice(-6)),
        job_order_id: created.job_order_id || jobOrder.id,
        order_number: jobOrder.order_number,
        customer_name: jobOrder.customer_name,
        delivery_date: created.delivery_date || deliveryDate,
        status: created.status || 'delivered',
        total_delivered_pieces: Number(created.total_delivered_pieces ?? deliveredPieces),
        returned_unused_fabric_meters: Number(created.returned_unused_fabric_meters ?? returnedFabric),
        scrap_fabric_meters: Number(created.scrap_fabric_meters ?? scrapFabric),
        delivered_by: created.delivered_by || deliveredBy,
        received_by_customer: created.received_by_customer || receivedByCustomer,
        notes: created.notes,
        items: (created.items || []).map((it: any) => ({
          delivered_quantity: Number(it.delivered_quantity ?? deliveredPieces),
        })),
      };

      onSuccess(formattedDelivery);
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إصدار إذن التسليم');
    } finally {
      setIsSubmitting(false);
    }
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
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block mb-0.5">الكمية المستهدفة</span>
            <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm">{jobOrder.total_target_quantity}</strong>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400 block mb-0.5">المسلم سابقاً</span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{jobOrder.total_delivered_quantity}</strong>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400 block mb-0.5">المتاح للتسليم</span>
            <strong className="text-primary dark:text-[#fca5a5] font-mono text-sm">{remainingToDeliver}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">العميل المستلم</label>
            <input
              type="text"
              disabled
              value={jobOrder.customer_name}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/60 rounded-lg text-xs p-2.5 text-slate-600 dark:text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ التسليم الفعلي</label>
            <input
              type="date"
              required
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">القطع المسلمة في هذا الإذن</label>
          <input
            type="number"
            required
            max={remainingToDeliver}
            value={deliveredPieces}
            onChange={(e) => setDeliveredPieces(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary font-mono text-sm font-bold text-primary dark:text-[#fca5a5]"
          />
        </div>

        {/* مصالحة أمانة الخامات */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-200 block">مصالحة وتسليم خامات العميل (Reconciliation)</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">أمتار قماش سليم مرتجع للعميل (إن وجد)</label>
              <input
                type="number"
                step="0.01"
                value={returnedFabric}
                onChange={(e) => setReturnedFabric(Number(e.target.value))}
                placeholder="0.0"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">أمتار عوادم وهالك مسلّمة للعميل (Scrap)</label>
              <input
                type="number"
                step="0.01"
                value={scrapFabric}
                onChange={(e) => setScrapFabric(Number(e.target.value))}
                placeholder="0.0"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المسؤول عن التسليم (المصنع)</label>
            <input
              type="text"
              value={deliveredBy}
              onChange={(e) => setDeliveredBy(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المستلم من طرف العميل</label>
            <input
              type="text"
              value={receivedByCustomer}
              onChange={(e) => setReceivedByCustomer(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إذن التسليم</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="حالة التغليف، رقم بوليصة الشحن، أو توقيع الاستلام..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
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

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';

interface UpdateDeliveryShippingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: any | null;
  onSuccess: () => void;
  isAr?: boolean;
}

export const UpdateDeliveryShippingModal: React.FC<UpdateDeliveryShippingModalProps> = ({
  isOpen,
  onClose,
  deliveryNote,
  onSuccess,
  isAr = true,
}) => {
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<string>('dispatched');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (deliveryNote) {
      setCarrier(deliveryNote.shipping_carrier || 'تسليم باب المصنع / سيارة العميل');
      setTrackingNumber(deliveryNote.tracking_number || '');
      setRecipientName(deliveryNote.recipient_name || deliveryNote.customer?.name || '');
      setDeliveryDate(deliveryNote.delivery_date ? String(deliveryNote.delivery_date).split('T')[0] : new Date().toISOString().split('T')[0]);
      setStatus(deliveryNote.status || 'dispatched');
      setNotes(deliveryNote.notes || '');
      setErrorMsg(null);
    }
  }, [deliveryNote, isOpen]);

  if (!isOpen || !deliveryNote) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await api.sales.updateDeliveryNote(deliveryNote.id, {
        shipping_carrier: carrier.trim() || undefined,
        tracking_number: trackingNumber.trim() || undefined,
        recipient_name: recipientName.trim() || undefined,
        delivery_date: deliveryDate || undefined,
        status,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحديث بيانات إذن التسليم' : 'Failed to update delivery note'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `تحديث بيانات الشحن والتسليم (${deliveryNote.delivery_number})` : `Update Shipping & Delivery (${deliveryNote.delivery_number})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {isAr ? 'أمر البيع المرتبط: ' : 'Sales Order: '}
            <span className="font-mono text-[#7F1625] dark:text-[#ff8ba0]">
              {deliveryNote.sales_order?.order_number || deliveryNote.sales_order_id}
            </span>
          </p>
          <p className="text-slate-500">
            {isAr ? 'العميل: ' : 'Customer: '}
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {deliveryNote.customer?.name || deliveryNote.recipient_name || 'عميل معتمد'}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'شركة الشحن / وسيلة النقل *' : 'Shipping Carrier / Transport *'}
            </label>
            <input
              type="text"
              required
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder={isAr ? 'مثال: أرامكس / بوسطة / سيارة المصنع' : 'e.g. Aramex, Bosta, Factory Truck'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رقم بوليصة التتبع (Tracking #)' : 'Tracking / Waybill #'}
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder={isAr ? 'رقم البوليصة أو سند النقل...' : 'Waybill / tracking number...'}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'حالة الشحن والتسليم' : 'Delivery Status'}
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold"
            >
              <option value="preparing">{isAr ? '⏳ جاري التجهيز والتعبئة' : 'Preparing'}</option>
              <option value="packed">{isAr ? '📦 تم التعبئة وجاهز للشحن' : 'Packed & Ready'}</option>
              <option value="dispatched">{isAr ? '🚚 تم الصرف وفي طريق التسليم' : 'Dispatched'}</option>
              <option value="delivered">{isAr ? '✓ تم التسليم للعميل بالكامل' : 'Delivered'}</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ التسليم / الشحن' : 'Delivery Date'}
            </label>
            <input
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'اسم الشخص المستلم / السائق' : 'Recipient / Driver Name'}
          </label>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder={isAr ? 'اسم المستلم بجهة العميل...' : 'Recipient name...'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات الشحن وموقع التسليم' : 'Shipping Notes'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'أي ملاحظات إضافية بخصوص تفريغ الشحنة أو بوابات الدخول...' : 'Additional notes...'}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التحديثات' : 'Save Updates')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

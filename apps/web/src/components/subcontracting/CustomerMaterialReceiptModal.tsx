import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Customer, CustomerMaterialReceipt, JobOrder, Warehouse } from '../../types';

interface CustomerMaterialReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  customers: Customer[];
  jobOrders: JobOrder[];
  onSuccess: (newReceipt: CustomerMaterialReceipt) => void;
}

export const CustomerMaterialReceiptModal: React.FC<CustomerMaterialReceiptModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  customers,
  jobOrders,
  onSuccess,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [jobOrderId, setJobOrderId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [fabricName, setFabricName] = useState('قماش سنغل ليكرا قطن أسود');
  const [fabricCode, setFabricCode] = useState('');
  const [receivedMeters, setReceivedMeters] = useState<number>(150);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(45);
  const [usableWidthMeters, setUsableWidthMeters] = useState<number>(1.65);
  const [gsm, setGsm] = useState<number>(185);
  const [rollsCount, setRollsCount] = useState<number>(4);
  const [conditionStatus, setConditionStatus] = useState<'accepted' | 'damaged_rolls' | 'conditional_pass'>('accepted');
  const [inspectorName, setInspectorName] = useState('م. حسام - فحص الأقمشة');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJobSelect = (jId: string) => {
    setJobOrderId(jId);
    const job = jobOrders.find((j) => j.id === jId);
    if (job) {
      setCustomerName(job.customer_name);
      if (job.customer_id) setCustomerId(job.customer_id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newReceipt: CustomerMaterialReceipt = {
      id: 'cmr-' + Date.now(),
      receipt_number: 'CMR-' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
      job_order_id: jobOrderId || undefined,
      customer_id: customerId || undefined,
      customer_name: customerName || 'عميل خارجي',
      warehouse_id: warehouseId,
      warehouse_name: warehouses.find((w) => w.id === warehouseId)?.name,
      fabric_name: fabricName,
      fabric_code: fabricCode || 'FAB-CUST-' + Math.floor(100 + Math.random() * 900),
      received_meters: Number(receivedMeters),
      received_weight_kg: Number(receivedWeightKg),
      usable_width_meters: Number(usableWidthMeters),
      gsm: Number(gsm),
      rolls_count: Number(rollsCount),
      condition_status: conditionStatus,
      inspector_name: inspectorName,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
    };

    setTimeout(() => {
      onSuccess(newReceipt);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="محضر استلام أمانات خامات العميل (Customer Material Intake)"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs leading-relaxed">
          <strong>قاعدة الأمانات:</strong> خامات العميل المستلمة تُسجل كالتزام أمانة (Custody Liability) ولا تضاف كأصل مخزني مقوم مالياً للشركة، وتفصل عن تقييم المخزون المملوك.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">ربط بأمر تشغيل قائم (اختياري)</label>
            <select
              value={jobOrderId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- اختياري: اختر أمر التشغيل --</option>
              {jobOrders.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.order_number} ({j.customer_name}) - {j.total_target_quantity} قطعة
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">العميل المودع</label>
            {customers && customers.length > 0 ? (
              <select
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const found = customers.find((c) => c.id === id);
                  if (found) setCustomerName(found.name);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- اختر من العملاء أو أدخل الاسم --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثال: شركة النصر للملابس"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">كود صنف القماش (اختياري)</label>
          <input
            type="text"
            value={fabricCode}
            onChange={(e) => setFabricCode(e.target.value)}
            placeholder="مثال: FAB-CUST-901"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">مخزن استلام الأمانة</label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">اسم ونوع القماش</label>
            <input
              type="text"
              required
              value={fabricName}
              onChange={(e) => setFabricName(e.target.value)}
              placeholder="مثال: ميلتون مبطن، سنغل، بوبلين..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الأمتار المستلمة (متر)</label>
            <input
              type="number"
              step="0.01"
              required
              value={receivedMeters}
              onChange={(e) => setReceivedMeters(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">الوزن المستلم (كجم)</label>
            <input
              type="number"
              step="0.01"
              value={receivedWeightKg}
              onChange={(e) => setReceivedWeightKg(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">عرض القماش الصالح (متر)</label>
            <input
              type="number"
              step="0.01"
              value={usableWidthMeters}
              onChange={(e) => setUsableWidthMeters(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">كثافة النسيج (GSM)</label>
            <input
              type="number"
              value={gsm}
              onChange={(e) => setGsm(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">عدد الأثواب / الرولات</label>
            <input
              type="number"
              value={rollsCount}
              onChange={(e) => setRollsCount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">حالة الفحص الظاهري</label>
            <select
              value={conditionStatus}
              onChange={(e) => setConditionStatus(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="accepted">سليم ومقبول بالكامل</option>
              <option value="damaged_rolls">يوجد أثواب معيبة / بقع</option>
              <option value="conditional_pass">قبول مشروط بعد أخذ عينة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">مسؤول الاستلام والفحص</label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات محضر الاستلام</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات أرقام الشحنة، البوالص، أو أرقام اللوت..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            تأكيد تسجيل إذن الاستلام
          </Button>
        </div>
      </form>
    </Modal>
  );
};

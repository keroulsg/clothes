import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Customer, CustomerMaterialReceipt, JobOrder, Warehouse } from '../../types';
import { api } from '../../api/client';
import { AlertTriangle } from 'lucide-react';

interface CustomerMaterialReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  customers: Customer[];
  jobOrders: JobOrder[];
  onSuccess: (newReceipt: CustomerMaterialReceipt) => void;
  isAr?: boolean;
}

export const CustomerMaterialReceiptModal: React.FC<CustomerMaterialReceiptModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  customers,
  jobOrders,
  onSuccess,
  isAr = true,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [jobOrderId, setJobOrderId] = useState('');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [fabricName, setFabricName] = useState(isAr ? 'قماش سنغل ليكرا قطن أسود' : 'Cotton Single Lycra Black');
  const [fabricCode, setFabricCode] = useState('');
  const [receivedMeters, setReceivedMeters] = useState<number>(150);
  const [receivedWeightKg, setReceivedWeightKg] = useState<number>(45);
  const [usableWidthMeters, setUsableWidthMeters] = useState<number>(1.65);
  const [gsm, setGsm] = useState<number>(185);
  const [rollsCount, setRollsCount] = useState<number>(4);
  const [conditionStatus, setConditionStatus] = useState<'accepted' | 'damaged_rolls' | 'conditional_pass'>('accepted');
  const [inspectorName, setInspectorName] = useState(isAr ? 'م. حسام - فحص الأقمشة' : 'QC Inspector');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleJobSelect = (jId: string) => {
    setJobOrderId(jId);
    const job = jobOrders.find((j) => j.id === jId);
    if (job) {
      setCustomerName(job.customer_name);
      if (job.customer_id) setCustomerId(job.customer_id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setApiError(isAr ? 'يرجى اختيار المستودع لاستلام خامات العميل' : 'Please select a warehouse for customer custody intake');
      return;
    }
    if (!customerName.trim()) {
      setApiError(isAr ? 'يرجى تحديد اسم العميل المودع' : 'Please select or enter the depositing customer');
      return;
    }

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      warehouse_id: warehouseId,
      customer_name: customerName,
      customer_id: customerId && customerId.length > 20 && !customerId.startsWith('cust-') ? customerId : undefined,
      job_order_id: jobOrderId && jobOrderId.length > 20 && !jobOrderId.startsWith('job-') ? jobOrderId : undefined,
      fabric_name: fabricName,
      fabric_code: fabricCode || undefined,
      received_meters: Number(receivedMeters),
      received_weight_kg: Number(receivedWeightKg),
      usable_width_meters: Number(usableWidthMeters),
      gsm: Number(gsm),
      rolls_count: Number(rollsCount),
      condition_status: conditionStatus,
      inspector_name: inspectorName || undefined,
      notes: notes || undefined,
    };

    try {
      const res = await api.subcontracting.createMaterialReceipt(payload);
      const created = res.data;
      const formattedReceipt: CustomerMaterialReceipt = {
        id: created.id,
        receipt_number: created.receipt_number || ('CMR-' + Date.now().toString().slice(-6)),
        job_order_id: created.job_order_id,
        customer_id: created.customer_id,
        customer_name: created.customer_name || customerName,
        warehouse_id: created.warehouse_id || warehouseId,
        warehouse_name: warehouses.find((w) => w.id === (created.warehouse_id || warehouseId))?.name,
        fabric_name: created.fabric_name || fabricName,
        fabric_code: created.fabric_code || fabricCode,
        received_meters: Number(created.received_meters ?? receivedMeters),
        received_weight_kg: Number(created.received_weight_kg ?? receivedWeightKg),
        usable_width_meters: Number(created.usable_width_meters ?? usableWidthMeters),
        gsm: Number(created.gsm ?? gsm),
        rolls_count: Number(created.rolls_count ?? rollsCount),
        condition_status: created.condition_status || conditionStatus,
        inspector_name: created.inspector_name || inspectorName,
        notes: created.notes,
        created_at: created.created_at || new Date().toISOString(),
      };

      onSuccess(formattedReceipt);
      onClose();
    } catch (err: any) {
      setApiError(err.message || (isAr ? 'حدث خطأ أثناء تسجيل استلام خامات العميل' : 'An error occurred while recording customer material receipt'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'محضر استلام أمانات خامات العميل (Customer Material Intake)' : 'Customer Material Custody Intake'}
    >
      {apiError && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-700/60 text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{apiError}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
          <strong className="text-primary dark:text-[#fca5a5]">
            {isAr ? 'قاعدة الأمانات:' : 'Custody Rule:'}
          </strong>{' '}
          {isAr
            ? 'خامات العميل المستلمة تُسجل كالتزام أمانة (Custody Liability) ولا تضاف كأصل مخزني مقوم مالياً للشركة، وتفصل عن تقييم المخزون المملوك.'
            : 'Customer fabrics received are recorded as a custody liability and excluded from factory asset valuation.'}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ربط بأمر تشغيل قائم (اختياري)' : 'Link to Existing Job Order (Optional)'}
            </label>
            <select
              value={jobOrderId}
              onChange={(e) => handleJobSelect(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary"
            >
              <option value="">{isAr ? '-- اختياري: اختر أمر التشغيل --' : '-- Optional: Select Job Order --'}</option>
              {jobOrders.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.order_number} ({j.customer_name}) - {j.total_target_quantity} {isAr ? 'قطعة' : 'pcs'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العميل المودع' : 'Depositing Client'}
            </label>
            {customers && customers.length > 0 ? (
              <select
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const found = customers.find((c) => c.id === id);
                  if (found) setCustomerName(found.name);
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">{isAr ? '-- اختر من العملاء أو أدخل الاسم --' : '-- Select customer or type below --'}</option>
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
                placeholder={isAr ? 'مثال: شركة النصر للملابس' : 'e.g. Al-Nasr Apparel'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'كود صنف القماش (اختياري)' : 'Fabric Item Code (Optional)'}
          </label>
          <input
            type="text"
            value={fabricCode}
            onChange={(e) => setFabricCode(e.target.value)}
            placeholder="FAB-CUST-901"
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مخزن استلام الأمانة' : 'Custody Warehouse'}
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم ونوع القماش' : 'Fabric Name & Type'}
            </label>
            <input
              type="text"
              required
              value={fabricName}
              onChange={(e) => setFabricName(e.target.value)}
              placeholder={isAr ? 'مثال: ميلتون مبطن، سنغل، بوبلين...' : 'e.g. Brushed fleece, single jersey, poplin...'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الأمتار المستلمة (متر)' : 'Received Meters (m)'}
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={receivedMeters}
              onChange={(e) => setReceivedMeters(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الوزن المستلم (كجم)' : 'Received Weight (kg)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={receivedWeightKg}
              onChange={(e) => setReceivedWeightKg(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'عرض القماش الصالح (متر)' : 'Usable Width (m)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={usableWidthMeters}
              onChange={(e) => setUsableWidthMeters(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كثافة النسيج (GSM)' : 'Fabric Weight (GSM)'}
            </label>
            <input
              type="number"
              value={gsm}
              onChange={(e) => setGsm(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'عدد الأثواب / الرولات' : 'Rolls Count'}
            </label>
            <input
              type="number"
              value={rollsCount}
              onChange={(e) => setRollsCount(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'حالة الفحص الظاهري' : 'Visual QC Condition'}
            </label>
            <select
              value={conditionStatus}
              onChange={(e) => setConditionStatus(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="accepted">{isAr ? 'سليم ومقبول بالكامل' : 'Accepted & Flawless'}</option>
              <option value="damaged_rolls">{isAr ? 'يوجد أثواب معيبة / بقع' : 'Damaged / Stained Rolls'}</option>
              <option value="conditional_pass">{isAr ? 'قبول مشروط بعد أخذ عينة' : 'Conditional Pass After Sampling'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مسؤول الاستلام والفحص' : 'Inspector / QC'}
            </label>
            <input
              type="text"
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات محضر الاستلام' : 'Intake Notes'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات أرقام الشحنة، البوالص، أو أرقام اللوت...' : 'Waybill number, batch details, or lot notes...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isAr ? 'تأكيد تسجيل إذن الاستلام' : 'Confirm & Record Intake'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

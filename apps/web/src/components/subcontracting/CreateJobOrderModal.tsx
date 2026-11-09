import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Customer, GarmentModel, JobOrder } from '../../types';
import { api } from '../../api/client';
import { AlertTriangle } from 'lucide-react';

interface CreateJobOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  models: GarmentModel[];
  employees?: any[];
  onSuccess: (newJob: JobOrder) => void;
  isAr?: boolean;
}

export const CreateJobOrderModal: React.FC<CreateJobOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  models,
  employees: propEmployees = [],
  onSuccess,
  isAr = true,
}) => {
  const [employeesList, setEmployeesList] = useState<any[]>(propEmployees);
  const [assignedEmployeeId, setAssignedEmployeeId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [serviceType, setServiceType] = useState<'contract_cutting' | 'cmt'>('contract_cutting');
  const [modelId, setModelId] = useState('');
  const [fabricSource, setFabricSource] = useState<'customer_supplied' | 'factory_supplied' | 'mixed'>('customer_supplied');
  const [trimsResponsibility, setTrimsResponsibility] = useState<'customer_supplied' | 'factory_supplied' | 'mixed'>('customer_supplied');
  const [pricingBasis, setPricingBasis] = useState<'per_piece' | 'per_meter' | 'per_operation' | 'per_bundle'>('per_piece');
  const [unitRate, setUnitRate] = useState<number>(6.5);
  const [targetQuantity, setTargetQuantity] = useState<number>(200);
  const [plannedStartDate, setPlannedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDeliveryDate, setTargetDeliveryDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<Array<{ size_name: string; color_name: string; target_quantity: number }>>([
    { size_name: '4-5Y', color_name: 'Red', target_quantity: 100 },
    { size_name: '6-7Y', color_name: 'Navy', target_quantity: 100 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeesList.length === 0) {
      api.hr.getEmployees(1)
        .then((res: any) => {
          if (res?.data && Array.isArray(res.data)) {
            setEmployeesList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [employeesList]);

  const handleAddItem = () => {
    setItems([...items, { size_name: '', color_name: '', target_quantity: 50 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError(isAr ? 'يرجى اختيار العميل أو إدخال اسم العميل' : 'Please select or enter the customer name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const calculatedTotal = items.reduce((acc, curr) => acc + (Number(curr.target_quantity) || 0), 0);
    const totalQty = calculatedTotal > 0 ? calculatedTotal : targetQuantity;

    const payload = {
      customer_name: customerName,
      customer_id: customerId && customerId.length > 20 && !customerId.startsWith('cust-') ? customerId : undefined,
      service_type: serviceType,
      garment_model_id: modelId && modelId.length > 20 && !modelId.startsWith('gm-') ? modelId : undefined,
      assigned_employee_id: assignedEmployeeId || undefined,
      fabric_source: fabricSource,
      trims_responsibility: trimsResponsibility,
      pricing_basis: pricingBasis,
      unit_rate: Number(unitRate),
      total_target_quantity: totalQty,
      planned_start_date: plannedStartDate || undefined,
      target_delivery_date: targetDeliveryDate || undefined,
      notes: notes || undefined,
      items: items.filter(it => it.target_quantity > 0).map(it => ({
        color_name: it.color_name || undefined,
        size_name: it.size_name || undefined,
        target_quantity: Number(it.target_quantity),
        unit_rate: Number(unitRate),
      })),
    };

    try {
      const res = await api.subcontracting.createJob(payload);
      const created = res.data;
      const formattedJob: JobOrder = {
        id: created.id,
        order_number: created.order_number,
        customer_id: created.customer_id,
        customer_name: created.customer_name || customerName,
        service_type: created.service_type || serviceType,
        status: created.status || 'draft',
        garment_model_id: created.garment_model_id,
        assigned_employee_id: created.assigned_employee_id || assignedEmployeeId,
        assigned_employee_name: created.assigned_employee?.name || employeesList.find(e => e.id === (created.assigned_employee_id || assignedEmployeeId))?.name,
        model_name: models.find((m) => m.id === created.garment_model_id)?.name,
        fabric_source: created.fabric_source || fabricSource,
        trims_responsibility: created.trims_responsibility || trimsResponsibility,
        pricing_basis: created.pricing_basis || pricingBasis,
        unit_rate: Number(created.unit_rate ?? unitRate),
        total_target_quantity: Number(created.total_target_quantity ?? totalQty),
        total_cut_quantity: Number(created.total_cut_quantity ?? 0),
        total_accepted_quantity: Number(created.total_accepted_quantity ?? 0),
        total_rejected_quantity: Number(created.total_rejected_quantity ?? 0),
        total_rework_quantity: Number(created.total_rework_quantity ?? 0),
        total_delivered_quantity: Number(created.total_delivered_quantity ?? 0),
        total_received_meters: Number(created.total_received_meters ?? 0),
        planned_start_date: created.planned_start_date,
        target_delivery_date: created.target_delivery_date,
        notes: created.notes,
        created_at: created.created_at || new Date().toISOString(),
        items: (created.items || []).map((it: any) => ({
          id: it.id,
          color_name: it.color_name,
          size_name: it.size_name,
          target_quantity: Number(it.target_quantity),
          unit_rate: Number(it.unit_rate ?? unitRate),
        })),
      };

      onSuccess(formattedJob);
      onClose();
    } catch (err: any) {
      setError(err.message || (isAr ? 'حدث خطأ أثناء إنشاء أمر التشغيل للغير' : 'An error occurred while creating the job order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'إنشاء أمر تشغيل للغير (Contract Cutting / CMT)' : 'Create Subcontracting Order (Cutting / CMT)'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'نوع الخدمة المطلوبة' : 'Service Type'}
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="contract_cutting">
                {isAr ? 'قص للغير (Contract Cutting Service)' : 'Contract Cutting Service'}
              </option>
              <option value="cmt">
                {isAr ? 'تصنيع كامل للغير (CMT - Cut, Make & Trim)' : 'Full CMT (Cut, Make & Trim)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العميل الخارجي' : 'External Customer'}
            </label>
            {customers.length > 0 ? (
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">{isAr ? '-- اختر من العملاء المسجلين --' : '-- Select registered customer --'}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={isAr ? 'اسم العميل أو البراند' : 'Customer or brand name'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        {customers.length > 0 && !customerId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العميل (مباشر)' : 'Customer Name (Direct)'}
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={isAr ? 'مثال: شركة كايرو فاشون لملابس الأطفال' : 'e.g. Cairo Fashion Apparel'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'موديل الملابس (اختياري)' : 'Garment Model (Optional)'}
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">{isAr ? '-- اختياري: ربط بموديل من الكتالوج --' : '-- Optional: Link to catalog model --'}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الفني أو المشرف المسؤول (ربط العمال)' : 'Assigned Technician / Lead (HR Link)'}
            </label>
            <select
              value={assignedEmployeeId}
              onChange={(e) => setAssignedEmployeeId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">{isAr ? '-- اختياري: إسناد لفني مسؤول --' : '-- Optional: Assign Lead Technician --'}</option>
              {employeesList.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.employee_code || emp.id.slice(0, 5)} - {emp.name} ({emp.job_title || emp.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مصدر القماش' : 'Fabric Source'}
            </label>
            <select
              value={fabricSource}
              onChange={(e) => setFabricSource(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="customer_supplied">
                {isAr ? 'أمانة موردة من العميل (Customer Deposit)' : 'Customer Supplied (Deposit)'}
              </option>
              <option value="factory_supplied">
                {isAr ? 'قماش مورد من المصنع (Factory Fabric)' : 'Factory Supplied Fabric'}
              </option>
              <option value="mixed">
                {isAr ? 'مختلط (قماش العميل + بطانة المصنع)' : 'Mixed (Customer Fabric + Factory Lining)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مسؤولية المستلزمات والإكسسوار' : 'Trims Responsibility'}
            </label>
            <select
              value={trimsResponsibility}
              onChange={(e) => setTrimsResponsibility(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="customer_supplied">
                {isAr ? 'مستلزمات من العميل (Customer Trims)' : 'Customer Trims'}
              </option>
              <option value="factory_supplied">
                {isAr ? 'مستلزمات من المصنع (Factory Trims)' : 'Factory Trims'}
              </option>
              <option value="mixed">
                {isAr ? 'مختلط (أزرار المصنع وسوست العميل)' : 'Mixed Trims'}
              </option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'أساس التسعير' : 'Pricing Basis'}
            </label>
            <select
              value={pricingBasis}
              onChange={(e) => setPricingBasis(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="per_piece">{isAr ? 'لكل قطعة مقصوصة/منجزة' : 'Per Finished/Cut Piece'}</option>
              <option value="per_meter">{isAr ? 'لكل متر قماش مفروش' : 'Per Fabric Meter'}</option>
              <option value="per_bundle">{isAr ? 'لكل حزمة تشغيل' : 'Per Work Bundle'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سعر الخدمة المتفق عليه (ج.م)' : 'Service Rate (EGP)'}
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={unitRate}
              onChange={(e) => setUnitRate(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'إجمالي الكمية المطلوبة' : 'Total Target Quantity'}
            </label>
            <input
              type="number"
              required
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Size/Color breakdown */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isAr ? 'مصفوفة المقاسات والألوان المطلوبة' : 'Sizes & Colors Matrix'}
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[11px] text-primary dark:text-[#fca5a5] hover:underline font-semibold"
            >
              {isAr ? '+ إضافة مقاس/لون' : '+ Add Size/Color'}
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder={isAr ? 'المقاس (مثال: 4-5Y)' : 'Size (e.g. 4-5Y)'}
                  value={item.size_name}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].size_name = e.target.value;
                    setItems(next);
                  }}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="text"
                  placeholder={isAr ? 'اللون (مثال: أحمر)' : 'Color (e.g. Red)'}
                  value={item.color_name}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].color_name = e.target.value;
                    setItems(next);
                  }}
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
                />
                <input
                  type="number"
                  placeholder={isAr ? 'الكمية' : 'Qty'}
                  value={item.target_quantity}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].target_quantity = Number(e.target.value);
                    setItems(next);
                  }}
                  className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 px-1 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ البدء المخطط' : 'Planned Start Date'}
            </label>
            <input
              type="date"
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ التسليم المستهدف' : 'Target Delivery Date'}
            </label>
            <input
              type="date"
              value={targetDeliveryDate}
              onChange={(e) => setTargetDeliveryDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات وشروط الاتفاق' : 'Agreement Notes & Terms'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'تعليمات خاصة بالفرش، الهالك المسموح، أو معايير فحص الجودة...' : 'Special cutting instructions, allowed scrap tolerance, or QC criteria...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isAr ? 'تأكيد وإنشاء أمر التشغيل' : 'Confirm & Create Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

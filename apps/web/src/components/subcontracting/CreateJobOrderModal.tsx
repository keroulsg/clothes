import React, { useState } from 'react';
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
  onSuccess: (newJob: JobOrder) => void;
}

export const CreateJobOrderModal: React.FC<CreateJobOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  models,
  onSuccess,
}) => {
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
    { size_name: '4-5 سنوات', color_name: 'أحمر', target_quantity: 100 },
    { size_name: '6-7 سنوات', color_name: 'كحلي', target_quantity: 100 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('يرجى اختيار العميل أو إدخال اسم العميل');
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
        customer_name: created.customer_name || (created.customer?.name ?? customerName),
        service_type: created.service_type || serviceType,
        garment_model_id: created.garment_model_id,
        model_name: created.garment_model?.name || models.find((m) => m.id === modelId)?.name,
        fabric_source: created.fabric_source || fabricSource,
        trims_responsibility: created.trims_responsibility || trimsResponsibility,
        status: created.status || 'draft',
        pricing_basis: created.pricing_basis || pricingBasis,
        unit_rate: Number(created.unit_rate ?? unitRate),
        total_target_quantity: Number(created.total_target_quantity ?? totalQty),
        total_received_meters: Number(created.total_received_meters ?? 0),
        total_cut_quantity: Number(created.total_cut_quantity ?? 0),
        total_accepted_quantity: Number(created.total_accepted_quantity ?? 0),
        total_rejected_quantity: Number(created.total_rejected_quantity ?? 0),
        total_rework_quantity: Number(created.total_rework_quantity ?? 0),
        total_delivered_quantity: Number(created.total_delivered_quantity ?? 0),
        planned_start_date: created.planned_start_date || plannedStartDate,
        target_delivery_date: created.target_delivery_date || targetDeliveryDate,
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
      setError(err.message || 'حدث خطأ أثناء إنشاء أمر التشغيل للغير');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="إنشاء أمر تشغيل للغير (Contract Cutting / CMT)"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نوع الخدمة المطلوبة</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="contract_cutting">قص للغير (Contract Cutting Service)</option>
              <option value="cmt">تصنيع كامل للغير (CMT - Cut, Make & Trim)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">العميل الخارجي</label>
            {customers.length > 0 ? (
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- اختر من العملاء المسجلين --</option>
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
                placeholder="اسم العميل أو البراند"
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            )}
          </div>
        </div>

        {customers.length > 0 && !customerId && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم العميل (مباشر)</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="مثال: شركة كايرو فاشون لملابس الأطفال"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">موديل الملابس (اختياري)</label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- اختياري: ربط بموديل من الكتالوج --</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">مصدر القماش</label>
            <select
              value={fabricSource}
              onChange={(e) => setFabricSource(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="customer_supplied">أمانة موردة من العميل (Customer Deposit)</option>
              <option value="factory_supplied">قماش مورد من المصنع (Factory Fabric)</option>
              <option value="mixed">مختلط (قماش العميل + بطانة المصنع)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">مسؤولية المستلزمات والإكسسوار</label>
            <select
              value={trimsResponsibility}
              onChange={(e) => setTrimsResponsibility(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="customer_supplied">مستلزمات من العميل (Customer Trims)</option>
              <option value="factory_supplied">مستلزمات من المصنع (Factory Trims)</option>
              <option value="mixed">مختلط (أزرار المصنع وسوست العميل)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">أساس التسعير</label>
            <select
              value={pricingBasis}
              onChange={(e) => setPricingBasis(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="per_piece">لكل قطعة مقصوصة/منجزة</option>
              <option value="per_meter">لكل متر قماش مفروش</option>
              <option value="per_bundle">لكل حزمة تشغيل</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سعر الخدمة المتفق عليه (ج.م)</label>
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">إجمالي الكمية المطلوبة</label>
            <input
              type="number"
              required
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* تفصيل المقاسات والألوان */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">مصفوفة المقاسات والألوان المطلوبة</span>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-[11px] text-primary dark:text-[#fca5a5] hover:underline font-semibold"
            >
              + إضافة مقاس/لون
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="المقاس (مثال: 4-5Y)"
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
                  placeholder="اللون (مثال: أحمر)"
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
                  placeholder="الكمية"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ البدء المخطط</label>
            <input
              type="date"
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ التسليم المستهدف</label>
            <input
              type="date"
              value={targetDeliveryDate}
              onChange={(e) => setTargetDeliveryDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وشروط الاتفاق</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تعليمات خاصة بالفرش، الهالك المسموح، أو معايير فحص الجودة..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            تأكيد وإنشاء أمر التشغيل
          </Button>
        </div>
      </form>
    </Modal>
  );
};

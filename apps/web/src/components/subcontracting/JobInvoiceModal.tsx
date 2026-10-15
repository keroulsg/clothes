import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { JobInvoice, JobOrder } from '../../types';

interface JobInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrder: JobOrder | null;
  onSuccess: (newInvoice: JobInvoice) => void;
}

export const JobInvoiceModal: React.FC<JobInvoiceModalProps> = ({
  isOpen,
  onClose,
  jobOrder,
  onSuccess,
}) => {
  if (!jobOrder) return null;

  const baseServiceAmount = jobOrder.total_delivered_quantity > 0
    ? jobOrder.total_delivered_quantity * jobOrder.unit_rate
    : jobOrder.total_target_quantity * jobOrder.unit_rate;

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [serviceAmount, setServiceAmount] = useState<number>(baseServiceAmount);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [extraReason, setExtraReason] = useState('');
  const [deductions, setDeductions] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [taxRate, setTaxRate] = useState<number>(14); // 14% VAT
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = Math.max(0, Number(serviceAmount) + Number(additionalCharges) - Number(deductions));
  const taxAmount = (subtotal * Number(taxRate)) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const items: JobInvoice['items'] = [
      {
        description: `أجور خدمة ${jobOrder.service_type === 'contract_cutting' ? 'قص أقمشة' : 'تصنيع كامل CMT'} (${jobOrder.total_delivered_quantity > 0 ? jobOrder.total_delivered_quantity : jobOrder.total_target_quantity} قطعة)`,
        item_type: 'service_charge',
        quantity: jobOrder.total_delivered_quantity > 0 ? jobOrder.total_delivered_quantity : jobOrder.total_target_quantity,
        unit_rate: jobOrder.unit_rate,
        total_amount: Number(serviceAmount),
      },
    ];

    if (Number(additionalCharges) > 0) {
      items.push({
        description: extraReason || 'مصاريف تشغيل إضافية معتمدة',
        item_type: 'extra_operation',
        quantity: 1,
        unit_rate: Number(additionalCharges),
        total_amount: Number(additionalCharges),
        reason: extraReason,
      });
    }

    if (Number(deductions) > 0) {
      items.push({
        description: deductionReason || 'خصم متفق عليه / تعويض عيوب',
        item_type: 'deduction',
        quantity: 1,
        unit_rate: -Number(deductions),
        total_amount: -Number(deductions),
        reason: deductionReason,
      });
    }

    const newInvoice: JobInvoice = {
      id: 'jinv-' + Date.now(),
      invoice_number: 'JINV-' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000),
      job_order_id: jobOrder.id,
      order_number: jobOrder.order_number,
      customer_name: jobOrder.customer_name,
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: 'issued',
      service_amount: Number(serviceAmount),
      additional_charges: Number(additionalCharges),
      deductions: Number(deductions),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_amount: Number(totalAmount.toFixed(2)),
      paid_amount: 0,
      notes: notes || undefined,
      items,
    };

    setTimeout(() => {
      onSuccess(newInvoice);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إصدار فاتورة خدمات التشغيل — ${jobOrder.order_number}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
          <strong>إيراد خدمات المصنع:</strong> يتم فوترة أتعاب التشغيل والقص وخدمات القيمة المضافة فقط. خامات العميل لا تدخل في إيرادات أو مبيعات المصنع.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">العميل</label>
            <input
              type="text"
              disabled
              value={jobOrder.customer_name}
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs p-2.5 text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الفاتورة</label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">قيمة الخدمة الأساسية (ج.م)</label>
          <input
            type="number"
            step="0.01"
            required
            value={serviceAmount}
            onChange={(e) => setServiceAmount(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-sm"
          />
        </div>

        {/* إضافات وخصومات معتمدة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-emerald-400">+ إضافات / مصاريف إضافية (ج.م)</label>
            <input
              type="number"
              step="0.01"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(Number(e.target.value))}
              placeholder="0.0"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
            />
            <input
              type="text"
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              placeholder="السبب (مثال: شحن سريع، أزرار إضافية)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-1.5 text-slate-300"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-rose-400">- خصومات / تعويض عيوب (ج.م)</label>
            <input
              type="number"
              step="0.01"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              placeholder="0.0"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
            />
            <input
              type="text"
              value={deductionReason}
              onChange={(e) => setDeductionReason(e.target.value)}
              placeholder="السبب (مثال: تعويض هالك قماش زائد)"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-1.5 text-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
          />
        </div>

        {/* ملخص الحسابات الآمن */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>المجموع قبل الضريبة:</span>
            <span className="font-mono text-slate-200">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>ضريبة القيمة المضافة ({taxRate}%):</span>
            <span className="font-mono text-slate-200">{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-800 text-indigo-400">
            <span>إجمالي الفاتورة المستحقة:</span>
            <span className="font-mono">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">شروط الدفع والملاحظات</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شروط السداد، الحساب البنكي..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            تأكيد وإصدار الفاتورة
          </Button>
        </div>
      </form>
    </Modal>
  );
};

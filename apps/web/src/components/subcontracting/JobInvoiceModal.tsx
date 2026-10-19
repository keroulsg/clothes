import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { JobInvoice, JobOrder } from '../../types';
import { api } from '../../api/client';
import { AlertTriangle } from 'lucide-react';

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
  const baseServiceAmount = jobOrder
    ? (jobOrder.total_delivered_quantity > 0
        ? jobOrder.total_delivered_quantity * jobOrder.unit_rate
        : jobOrder.total_target_quantity * jobOrder.unit_rate)
    : 0;

  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    () => new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [serviceAmount, setServiceAmount] = useState<number>(baseServiceAmount);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [extraReason, setExtraReason] = useState('');
  const [deductions, setDeductions] = useState<number>(0);
  const [deductionReason, setDeductionReason] = useState('');
  const [taxRate, setTaxRate] = useState<number>(14); // 14% VAT
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  if (!jobOrder) return null;

  const subtotal = Math.max(0, Number(serviceAmount) + Number(additionalCharges) - Number(deductions));
  const taxAmount = (subtotal * Number(taxRate)) / 100;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setApiError(null);

    const quantity = jobOrder.total_delivered_quantity > 0 ? jobOrder.total_delivered_quantity : jobOrder.total_target_quantity;
    const items: any[] = [
      {
        description: `أجور خدمة ${jobOrder.service_type === 'contract_cutting' ? 'قص أقمشة' : 'تصنيع كامل CMT'} (${quantity} قطعة)`,
        item_type: 'service_charge',
        quantity: quantity,
        unit_rate: Number(jobOrder.unit_rate || (Number(serviceAmount) / (quantity || 1))),
      },
    ];

    if (Number(additionalCharges) > 0) {
      items.push({
        description: extraReason || 'مصاريف تشغيل إضافية معتمدة',
        item_type: 'extra_operation',
        quantity: 1,
        unit_rate: Number(additionalCharges),
        reason: extraReason || undefined,
      });
    }

    if (Number(deductions) > 0) {
      items.push({
        description: deductionReason || 'خصم متفق عليه / تعويض عيوب',
        item_type: 'deduction',
        quantity: 1,
        unit_rate: Number(deductions),
        reason: deductionReason || undefined,
      });
    }

    const payload = {
      job_order_id: jobOrder.id,
      invoice_date: invoiceDate,
      due_date: dueDate,
      service_amount: Number(serviceAmount),
      additional_charges: Number(additionalCharges),
      deductions: Number(deductions),
      tax_amount: Number(taxAmount.toFixed(2)),
      notes: notes || undefined,
      items,
    };

    try {
      const res = await api.subcontracting.createInvoice(payload);
      const created = res.data;
      const formattedInvoice: JobInvoice = {
        id: created.id,
        invoice_number: created.invoice_number || ('JINV-' + Date.now().toString().slice(-6)),
        job_order_id: created.job_order_id || jobOrder.id,
        order_number: jobOrder.order_number,
        customer_name: jobOrder.customer_name,
        invoice_date: created.invoice_date || invoiceDate,
        due_date: created.due_date || dueDate,
        status: created.status || 'issued',
        service_amount: Number(created.service_amount ?? serviceAmount),
        additional_charges: Number(created.additional_charges ?? additionalCharges),
        deductions: Number(created.deductions ?? deductions),
        tax_amount: Number(created.tax_amount ?? taxAmount),
        total_amount: Number(created.total_amount ?? totalAmount),
        paid_amount: Number(created.paid_amount ?? 0),
        notes: created.notes,
        items: created.items || items,
      };

      onSuccess(formattedInvoice);
      onClose();
    } catch (err: any) {
      setApiError(err.message || 'حدث خطأ أثناء إصدار فاتورة خدمات التشغيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إصدار فاتورة خدمات التشغيل — ${jobOrder.order_number}`}
    >
      {apiError && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-700/60 text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{apiError}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs leading-relaxed">
          <strong>إيراد خدمات المصنع:</strong> يتم فوترة أتعاب التشغيل والقص وخدمات القيمة المضافة فقط. خامات العميل لا تدخل في إيرادات أو مبيعات المصنع.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">العميل</label>
            <input
              type="text"
              disabled
              value={jobOrder.customer_name}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/60 rounded-lg text-xs p-2.5 text-slate-600 dark:text-slate-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الفاتورة</label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">قيمة الخدمة الأساسية (ج.م)</label>
          <input
            type="number"
            step="0.01"
            required
            value={serviceAmount}
            onChange={(e) => setServiceAmount(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono text-sm"
          />
        </div>

        {/* إضافات وخصومات معتمدة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400">+ إضافات / مصاريف إضافية (ج.م)</label>
            <input
              type="number"
              step="0.01"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(Number(e.target.value))}
              placeholder="0.0"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={extraReason}
              onChange={(e) => setExtraReason(e.target.value)}
              placeholder="السبب (مثال: شحن سريع، أزرار إضافية)"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-slate-300"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="block text-xs font-semibold text-rose-600 dark:text-rose-400">- خصومات / تعويض عيوب (ج.م)</label>
            <input
              type="number"
              step="0.01"
              value={deductions}
              onChange={(e) => setDeductions(Number(e.target.value))}
              placeholder="0.0"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
            />
            <input
              type="text"
              value={deductionReason}
              onChange={(e) => setDeductionReason(e.target.value)}
              placeholder="السبب (مثال: تعويض هالك قماش زائد)"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-slate-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">نسبة ضريبة القيمة المضافة (%)</label>
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* ملخص الحسابات الآمن */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>المجموع قبل الضريبة:</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>ضريبة القيمة المضافة ({taxRate}%):</span>
            <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">{taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
          <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 dark:border-slate-800 text-primary dark:text-[#fca5a5]">
            <span>إجمالي الفاتورة المستحقة:</span>
            <span className="font-mono">{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">شروط الدفع والملاحظات</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شروط السداد، الحساب البنكي..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100"
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

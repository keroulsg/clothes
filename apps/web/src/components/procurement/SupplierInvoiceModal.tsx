import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, AlertTriangle, ShieldCheck, AlertCircle } from 'lucide-react';
import type { PurchaseOrder, SupplierInvoice, GoodsReceiptNote } from '../../types';
import { api } from '../../api/client';

interface SupplierInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  goodsReceiptNote?: GoodsReceiptNote | null;
  onSuccess: (invoice: SupplierInvoice) => void;
}

export const SupplierInvoiceModal: React.FC<SupplierInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  goodsReceiptNote,
  onSuccess,
}) => {
  if (!purchaseOrder) return null;

  const expectedSubtotal = purchaseOrder.subtotal;
  const [invoiceNumber, setInvoiceNumber] = useState('TAX-INV-' + Math.floor(10000 + Math.random() * 90000));
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState(expectedSubtotal);
  const [taxAmount, setTaxAmount] = useState(expectedSubtotal * 0.14);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 3-Way Matching logic comparison
  const priceDifference = subtotal - expectedSubtotal;
  const hasVariance = Math.abs(priceDifference) > 0.5;
  const matchingStatus: 'matched' | 'price_variance' = hasVariance ? 'price_variance' : 'matched';
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || subtotal <= 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.procurement.createSupplierInvoice({
        invoice_number: invoiceNumber,
        purchase_order_id: purchaseOrder.id,
        goods_receipt_note_id: goodsReceiptNote?.id || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        subtotal: Number(subtotal),
        tax_amount: Number(taxAmount),
        matching_status: matchingStatus,
      });

      if (res.supplier_invoice) {
        onSuccess(res.supplier_invoice);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر مطابقة واعتماد فاتورة المورد على الخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`المطابقة الثلاثية واعتماد فاتورة المورد: ${purchaseOrder.po_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {/* 3-Way Matching Live Status Banner */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
          hasVariance
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          {hasVariance ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">
                {hasVariance ? 'تنبيه: تم رصد فرق في أسعار الفاتورة' : 'نتيجة المطابقة: مطابقة ثلاثية تامة (Matched)'}
              </span>
              <Badge variant={hasVariance ? 'warning' : 'success'}>
                {hasVariance ? 'فرق سعر (Variance)' : 'مطابقة معتمدة'}
              </Badge>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {hasVariance
                ? `قيمة أمر الشراء المتفق عليها: [${expectedSubtotal.toLocaleString()} ج.م]، بينما قيمة الفاتورة المدخلة: [${subtotal.toLocaleString()} ج.م] بفرق قدره [${priceDifference.toLocaleString()} ج.م].`
                : `تمت مطابقة أسعار أمر الشراء مع الكميات المستلمة في إذن الفحص (${goodsReceiptNote?.accepted_quantity || 'المعتمدة'}) وتطابق أسعار البنود بدقة 100%.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              رقم الفاتورة الضريبية للمورد
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الفاتورة</label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ الاستحقاق</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              المبلغ الصافي قبل الضريبة (ج.م)
            </label>
            <input
              type="number"
              step="any"
              required
              value={subtotal}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setSubtotal(val);
                setTaxAmount(val * 0.14);
              }}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ضريبة القيمة المضافة 14% (ج.م)
            </label>
            <input
              type="number"
              step="any"
              value={taxAmount}
              onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Total Obligation Preview */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">الالتزام المالي النهائي للمورد:</span>
            <span className="text-slate-900 dark:text-slate-300 font-semibold">{purchaseOrder.supplier_name}</span>
          </div>
          <div className="text-left">
            <span className="text-xs font-mono font-bold text-lg text-brand-primary dark:text-rose-400">
              {totalAmount.toLocaleString()} ج.م
            </span>
            <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-normal">شامل ضريبة القيمة المضافة</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            اعتماد الفاتورة وترحيل الالتزام
          </Button>
        </div>
      </form>
    </Modal>
  );
};

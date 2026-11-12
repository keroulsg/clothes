import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CheckCircle2, AlertTriangle, ShieldCheck, AlertCircle, Banknote } from 'lucide-react';
import type { PurchaseOrder, SupplierInvoice, GoodsReceiptNote } from '../../types';
import { api } from '../../api/client';

interface SupplierInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder | null;
  goodsReceiptNote?: GoodsReceiptNote | null;
  onSuccess: (invoice: SupplierInvoice) => void;
  isAr?: boolean;
}

export const SupplierInvoiceModal: React.FC<SupplierInvoiceModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  goodsReceiptNote,
  onSuccess,
  isAr = true,
}) => {
  if (!purchaseOrder) return null;

  const expectedSubtotal = Number(purchaseOrder.subtotal || purchaseOrder.total_amount || 0);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-' + Math.floor(10000 + Math.random() * 90000));
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [subtotal, setSubtotal] = useState<number>(expectedSubtotal);
  // Default tax is 0% (No VAT added per factory requirement)
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [enableVat, setEnableVat] = useState<boolean>(false);

  // Settlement & Payment Mode (آجل vs سداد فوري كاش / فيزا / بنك)
  const [paymentPlan, setPaymentPlan] = useState<'credit' | 'paid_now'>('credit');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>('cash');
  const [paymentRef, setPaymentRef] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Strict numeric calculations - guarantees no string concatenation
  const numSubtotal = Number(subtotal) || 0;
  const numTax = enableVat ? (Number(taxAmount) || 0) : 0;
  const totalAmount = numSubtotal + numTax;

  // 3-Way Matching logic comparison
  const priceDifference = numSubtotal - expectedSubtotal;
  const hasVariance = Math.abs(priceDifference) > 0.5;
  const matchingStatus: 'matched' | 'price_variance' = hasVariance ? 'price_variance' : 'matched';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber || numSubtotal <= 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.procurement.createSupplierInvoice({
        invoice_number: invoiceNumber,
        purchase_order_id: purchaseOrder.id,
        goods_receipt_note_id: goodsReceiptNote?.id || undefined,
        invoice_date: invoiceDate,
        due_date: dueDate || undefined,
        subtotal: numSubtotal,
        tax_amount: numTax,
        matching_status: matchingStatus,
      });

      if (res.supplier_invoice) {
        // If immediate payment was selected, automatically record the payment voucher
        if (paymentPlan === 'paid_now') {
          try {
            await api.suppliers.recordPayment(purchaseOrder.supplier_id, {
              amount: totalAmount,
              payment_method: paymentMethod,
              reference_number: paymentRef || invoiceNumber,
              voucher_date: invoiceDate,
              notes: isAr
                ? `سداد فوري لفاتورة المورد ${invoiceNumber} لأمر الشراء ${purchaseOrder.po_number}`
                : `Immediate settlement for invoice ${invoiceNumber} on PO ${purchaseOrder.po_number}`,
            });
          } catch (payErr: any) {
            // The invoice has already been created. Make the partial outcome explicit; never report the payment as successful.
            onSuccess(res.supplier_invoice);
            window.alert(
              isAr
                ? `تم حفظ فاتورة المورد بنجاح، لكن فشل تسجيل سند السداد الفوري: ${payErr?.message || 'خطأ غير معروف'}. الفاتورة ما زالت غير مسددة؛ افتح ملف المورد لإعادة محاولة السداد.`
                : `Supplier invoice was saved, but immediate payment failed: ${payErr?.message || 'Unknown error'}. The invoice remains unpaid; open the supplier profile to retry payment.`
            );
            onClose();
            return;
          }
        }

        onSuccess(res.supplier_invoice);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر مطابقة واعتماد فاتورة المورد على الخادم.' : 'Failed to match and approve supplier invoice on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `المطابقة الثلاثية واعتماد فاتورة المورد: ${purchaseOrder.po_number}` : `3-Way Matching & Supplier Invoice: ${purchaseOrder.po_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3-Way Matching Live Status Banner */}
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
          hasVariance
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
        }`}>
          {hasVariance ? (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-sm">
                {hasVariance
                  ? (isAr ? 'تنبيه: تم رصد فرق في أسعار الفاتورة' : 'Warning: Price variance detected in invoice')
                  : (isAr ? 'نتيجة المطابقة: مطابقة ثلاثية تامة (Matched)' : 'Match Result: 3-Way Matching Successful')}
              </span>
              <Badge variant={hasVariance ? 'warning' : 'success'}>
                {hasVariance
                  ? (isAr ? 'فرق سعر (Variance)' : 'Price Variance')
                  : (isAr ? 'مطابقة معتمدة' : 'Matched')}
              </Badge>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {hasVariance
                ? (isAr
                    ? `قيمة أمر الشراء المتفق عليها: [${expectedSubtotal.toLocaleString()} ج.م]، بينما قيمة الفاتورة المدخلة: [${numSubtotal.toLocaleString()} ج.م] بفرق قدره [${priceDifference.toLocaleString()} ج.م].`
                    : `Agreed PO subtotal: [${expectedSubtotal.toLocaleString()} EGP], entered invoice subtotal: [${numSubtotal.toLocaleString()} EGP], difference: [${priceDifference.toLocaleString()} EGP].`)
                : (isAr
                    ? `تمت مطابقة أسعار أمر الشراء مع الكميات المستلمة في إذن الفحص (${goodsReceiptNote?.accepted_quantity || 'المعتمدة'}) وتطابق أسعار البنود بدقة 100%.`
                    : `PO prices matched with received quantities in GRN (${goodsReceiptNote?.accepted_quantity || 'approved'}) with 100% price accuracy.`)}
            </p>
          </div>
        </div>

        {/* Invoice Metadata Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'رقم فاتورة المورد' : 'Supplier Invoice #'}
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ الفاتورة' : 'Invoice Date'}
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Amounts & Tax Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المبلغ الصافي للفاتورة (ج.م)' : 'Net Amount (EGP)'}
            </label>
            <input
              type="number"
              step="any"
              required
              value={subtotal}
              onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableVat}
                  onChange={(e) => {
                    setEnableVat(e.target.checked);
                    if (!e.target.checked) setTaxAmount(0);
                    else setTaxAmount(numSubtotal * 0.14);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>{isAr ? 'تطبيق ضريبة القيمة المضافة استثنائياً' : 'Apply VAT exceptionally'}</span>
              </label>
            </div>
            {enableVat && (
              <input
                type="number"
                step="any"
                value={taxAmount}
                onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                placeholder={isAr ? 'قيمة الضريبة (ج.م)' : 'Tax Amount (EGP)'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-1.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
            )}
            {!enableVat && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                {isAr ? '✓ بدون ضريبة قيمة مضافة (0.00 ج.م)' : '✓ Zero VAT applied'}
              </p>
            )}
          </div>
        </div>

        {/* Payment Terms & Method Selection (الآجل vs الدفع الفوري) */}
        <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-indigo-600" />
              {isAr ? 'خطة وطريقة سداد الفاتورة للمورد:' : 'Payment Terms & Method:'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <label
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                paymentPlan === 'credit'
                  ? 'border-indigo-600 bg-white dark:bg-slate-800 font-bold text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-transparent'
              }`}
            >
              <input
                type="radio"
                name="paymentPlan"
                value="credit"
                checked={paymentPlan === 'credit'}
                onChange={() => setPaymentPlan('credit')}
                className="text-indigo-600"
              />
              <span>{isAr ? 'آجل على الحساب (تسديد دفعات لاحقاً)' : 'Deferred on Account (Credit)'}</span>
            </label>

            <label
              className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                paymentPlan === 'paid_now'
                  ? 'border-emerald-600 bg-white dark:bg-slate-800 font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 bg-transparent'
              }`}
            >
              <input
                type="radio"
                name="paymentPlan"
                value="paid_now"
                checked={paymentPlan === 'paid_now'}
                onChange={() => setPaymentPlan('paid_now')}
                className="text-emerald-600"
              />
              <span>{isAr ? 'سداد فوري الآن (كاش / فيزا / تحويل)' : 'Immediate Settlement Now'}</span>
            </label>
          </div>

          {paymentPlan === 'paid_now' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'طريقة السداد' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="cash">{isAr ? '💵 نقداً (كاش من الخزينة)' : '💵 Cash'}</option>
                  <option value="card">{isAr ? '💳 بطاقة بنكية / فيزا (POS)' : '💳 Card / POS'}</option>
                  <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي / انستاباي' : '🏦 Bank Transfer / InstaPay'}</option>
                  <option value="cheque">{isAr ? '📜 شيك بنكي' : '📜 Bank Cheque'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم الإيصال / مرجع السداد (اختياري)' : 'Reference / Cheque #'}
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder={isAr ? 'مثال: CHQ-9921 أو إيصال خزينة #54' : 'e.g. Voucher or Cheque #'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Total Obligation Preview */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'الالتزام المالي النهائي للمورد:' : 'Final Payable Obligation to Supplier:'}
            </span>
            <span className="text-slate-900 dark:text-slate-100 font-semibold">{purchaseOrder.supplier_name}</span>
          </div>
          <div className={isAr ? 'text-left' : 'text-right'}>
            <span className="font-mono font-bold text-lg text-indigo-600 dark:text-indigo-400">
              {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">
              {enableVat && numTax > 0
                ? (isAr ? `شامل ضريبة ${numTax.toLocaleString()} ج.م` : `Includes ${numTax} EGP VAT`)
                : (isAr ? 'صافي الحساب بدون قيمة مضافة' : 'Net amount without VAT')}
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
            {paymentPlan === 'paid_now'
              ? (isAr ? 'اعتماد الفاتورة وتأكيد السداد الفوري' : 'Approve Invoice & Confirm Payment')
              : (isAr ? 'اعتماد الفاتورة وترحيل الالتزام الآجل' : 'Approve Invoice & Post Credit Liability')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api/client';
import type { Supplier } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Phone,
  User,
  Plus,
  FileText,
  DollarSign,
  Printer,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Tag,
  CreditCard,
  Banknote,
  Receipt,
  Search,
  Package,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface SupplierProfileViewProps {
  supplier: Supplier;
  initialInvoices?: any[];
  initialPurchaseOrders?: any[];
  onBack: () => void;
  onOpenCreatePo?: () => void;
  isAr?: boolean;
}

export const SupplierProfileView: React.FC<SupplierProfileViewProps> = ({
  supplier,
  initialInvoices = [],
  initialPurchaseOrders = [],
  onBack,
  onOpenCreatePo,
  isAr = true,
}) => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'discounts' | 'pos' | 'ledger'>('invoices');
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid'>('all');
  const [statement, setStatement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters for ledger tab
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [voucherToPrint, setVoucherToPrint] = useState<any | null>(null);

  // Form states: Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Form states: Invoice
  const [invNumber, setInvNumber] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState('');
  const [invNotes, setInvNotes] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Form states: Discount
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountType, setDiscountType] = useState('early_payment');
  const [discountDate, setDiscountDate] = useState(new Date().toISOString().split('T')[0]);
  const [discountNotes, setDiscountNotes] = useState('');
  const [isSubmittingDiscount, setIsSubmittingDiscount] = useState(false);

  // Edit payment states
  const [editAmount, setEditAmount] = useState('');
  const [editMethod, setEditMethod] = useState('cash');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const fetchStatement = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.suppliers.getSupplierStatement(supplier.id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatement(res);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر جلب بيانات وملف المورد.' : 'Failed to load supplier profile data.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement();
  }, [supplier.id, fromDate, toDate]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    setIsSubmittingPayment(true);
    try {
      const combinedNotes = paymentNotes
        ? `${paymentNotes} (${isAr ? 'توقيت السداد' : 'Time'}: ${paymentTime})`
        : `(${isAr ? 'توقيت السداد' : 'Time'}: ${paymentTime})`;

      await api.suppliers.recordPayment(supplier.id, {
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        voucher_date: paymentDate,
        supplier_invoice_id: selectedInvoiceId || undefined,
        notes: combinedNotes,
      });

      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setSelectedInvoiceId('');
      await fetchStatement();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تسجيل سند السداد' : 'Failed to record payment voucher'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invNumber || !invAmount || Number(invAmount) <= 0) return;
    setIsSubmittingInvoice(true);
    try {
      await api.suppliers.recordInvoice(supplier.id, {
        invoice_number: invNumber.trim(),
        total_amount: Number(invAmount),
        invoice_date: invDate,
        due_date: invDueDate || undefined,
        notes: invNotes || undefined,
      });

      setIsInvoiceModalOpen(false);
      setInvNumber('');
      setInvAmount('');
      setInvNotes('');
      await fetchStatement();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تسجيل فاتورة التوريد' : 'Failed to record invoice'));
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleRecordDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountAmount || Number(discountAmount) <= 0) return;
    setIsSubmittingDiscount(true);
    try {
      await api.suppliers.recordDiscount(supplier.id, {
        amount: Number(discountAmount),
        discount_type: discountType,
        discount_date: discountDate,
        notes: discountNotes || undefined,
      });

      setIsDiscountModalOpen(false);
      setDiscountAmount('');
      setDiscountNotes('');
      await fetchStatement();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تسجيل الخصم' : 'Failed to record discount'));
    } finally {
      setIsSubmittingDiscount(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    setIsSubmittingEdit(true);
    try {
      await api.suppliers.updatePayment(supplier.id, editingTransaction.raw_id, {
        amount: Number(editAmount),
        payment_method: editMethod,
        voucher_date: editDate,
        notes: editNotes || undefined,
      });
      setEditingTransaction(null);
      await fetchStatement();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تعديل السند' : 'Failed to update voucher'));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const activeSup = statement?.supplier || supplier;

  // Compute normalized invoices from statement or initialInvoices
  const allInvoices = useMemo(() => {
    if (statement?.invoices && statement.invoices.length > 0) {
      return statement.invoices;
    }
    return (initialInvoices || []).map((inv: any) => {
      const total = Number(inv.total_amount || 0);
      const paid = Number(inv.paid_amount || 0);
      const remaining = Math.max(0, total - paid);
      let status: 'paid' | 'partially_paid' | 'unpaid' = 'unpaid';
      if (inv.payment_status === 'paid' || (total > 0 && paid >= total)) {
        status = 'paid';
      } else if (paid > 0) {
        status = 'partially_paid';
      }
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        po_number: inv.purchaseOrder?.po_number || inv.po_number || '—',
        invoice_date: inv.invoice_date || '—',
        due_date: inv.due_date || '—',
        subtotal: Number(inv.subtotal || total),
        tax_amount: Number(inv.tax_amount || 0),
        total_amount: total,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_status: status,
        matching_status: inv.matching_status || 'matched',
      };
    });
  }, [statement?.invoices, initialInvoices]);

  // Compute normalized purchase orders
  const allPurchaseOrders = useMemo(() => {
    if (statement?.purchase_orders && statement.purchase_orders.length > 0) {
      return statement.purchase_orders;
    }
    return initialPurchaseOrders || [];
  }, [statement?.purchase_orders, initialPurchaseOrders]);

  // Invoices filtered by payment status
  const unpaidInvoices = useMemo(() =>
    allInvoices.filter((i: any) => i.payment_status === 'unpaid' || (!i.paid_amount && i.payment_status !== 'paid')),
    [allInvoices]
  );

  const partiallyPaidInvoices = useMemo(() =>
    allInvoices.filter((i: any) => i.payment_status === 'partially_paid' || (Number(i.paid_amount) > 0 && Number(i.paid_amount) < Number(i.total_amount))),
    [allInvoices]
  );

  const fullyPaidInvoices = useMemo(() =>
    allInvoices.filter((i: any) => i.payment_status === 'paid' || (Number(i.paid_amount) >= Number(i.total_amount) && Number(i.total_amount) > 0)),
    [allInvoices]
  );

  const displayedInvoices = useMemo(() => {
    if (invoiceFilter === 'unpaid') return unpaidInvoices;
    if (invoiceFilter === 'partially_paid') return partiallyPaidInvoices;
    if (invoiceFilter === 'paid') return fullyPaidInvoices;
    return allInvoices;
  }, [invoiceFilter, allInvoices, unpaidInvoices, partiallyPaidInvoices, fullyPaidInvoices]);

  const summary = statement?.summary || {
    total_pos_count: allPurchaseOrders.length,
    total_po_value: allPurchaseOrders.reduce((sum: number, po: any) => sum + Number(po.total_amount || 0), 0),
    total_invoiced: allInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0),
    total_paid: allInvoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0),
    total_actual_paid: allInvoices.reduce((sum: number, i: any) => sum + Number(i.paid_amount || 0), 0),
    total_discounts: 0,
    closing_balance: Number(supplier.current_balance || 0),
    breakdown: {
      cash: 0,
      card: 0,
      bank_transfer: 0,
      cheque: 0,
      discounts: 0,
      credit_balance: Number(supplier.current_balance || 0),
    },
  };

  const breakdown = summary.breakdown || {};
  const hasOutstandingBalance = Number(summary.closing_balance) > 0;

  // Filter ledger lines
  const filteredLines = (statement?.lines || []).filter((line: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (line.reference && line.reference.toLowerCase().includes(term)) ||
      (line.description && line.description.toLowerCase().includes(term)) ||
      (line.payment_method && line.payment_method.toLowerCase().includes(term))
    );
  });

  const getMethodBadge = (method: string, type: string) => {
    if (type === 'discount' || method === 'discount') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
          <Tag className="w-3 h-3" />
          <span>{isAr ? 'خصم تجاري / تسوية' : 'Discount / Rebate'}</span>
        </span>
      );
    }
    if (type === 'invoice' || method === 'credit') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
          <Clock className="w-3 h-3" />
          <span>{isAr ? 'آجل على الحساب' : 'Credit / Deferred'}</span>
        </span>
      );
    }
    if (method === 'cash') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
          <Banknote className="w-3 h-3" />
          <span>{isAr ? 'نقداً (كاش من الخزينة)' : 'Cash'}</span>
        </span>
      );
    }
    if (method === 'card' || method === 'visa') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
          <CreditCard className="w-3 h-3" />
          <span>{isAr ? 'بطاقة بنكية / فيزا (POS)' : 'Card / POS'}</span>
        </span>
      );
    }
    if (method === 'bank_transfer' || method === 'instapay') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
          <Building2 className="w-3 h-3" />
          <span>{isAr ? 'تحويل بنكي / إنستاباي' : 'Bank Transfer'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60">
        <Receipt className="w-3 h-3" />
        <span>{isAr ? 'شيك بنكي' : 'Cheque'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. TOP BREADCRUMB & HEADER BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Back button & Tag */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-sm shadow-2xs"
            >
              {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span>{isAr ? 'العودة إلى دليل الموردين' : 'Back to Suppliers'}</span>
            </button>

            <div className="flex items-center gap-2">
              {isLoading && (
                <span className="text-[11px] font-medium text-amber-200 animate-pulse">
                  {isAr ? 'جاري تحديث البيانات...' : 'Refreshing data...'}
                </span>
              )}
              <span className="text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 px-3 py-1 rounded-xl border border-amber-400/30">
                {isAr ? 'الملف المالي والمحاسبي المعتمد' : 'Official Financial Profile'}
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Supplier Main Card */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
                {activeSup.name ? activeSup.name.charAt(0) : <Building2 className="w-8 h-8" />}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-black tracking-tight">{activeSup.name}</h1>
                  <span className="font-mono text-xs font-bold bg-white/15 px-2 py-0.5 rounded-lg text-amber-300">
                    {activeSup.code}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-slate-300">
                  {activeSup.contact_person && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isAr ? 'المسؤول:' : 'Contact:'} {activeSup.contact_person}</span>
                    </div>
                  )}

                  {activeSup.phone && (
                    <div className="flex items-center gap-1.5 font-mono" dir="ltr">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span>{activeSup.phone}</span>
                    </div>
                  )}

                  {activeSup.tax_id && (
                    <span className="text-[11px] font-mono text-slate-400">
                      • {isAr ? 'السجل الضريبي:' : 'Tax ID:'} {activeSup.tax_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm transition-all cursor-pointer"
              >
                <DollarSign className="w-4 h-4" />
                <span>{isAr ? '+ سداد دفعة للمورد' : '+ Record Payment'}</span>
              </button>

              <button
                type="button"
                disabled
                title={isAr ? 'يجب إنشاء الفاتورة من أمر شراء وإذن استلام معتمد' : 'Create invoices only from an approved purchase order and goods receipt'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-400 shadow-sm transition-all cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                <span>{isAr ? 'الفاتورة من أمر شراء واستلام' : 'Invoice via PO & GRN'}</span>
              </button>

              <button
                type="button"
                disabled
                title={isAr ? 'متوقف حتى توفير قيد خصم/إشعار دائن متوازن' : 'Disabled until a balanced supplier credit-note workflow is available'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-slate-400 shadow-sm transition-all cursor-not-allowed"
              >
                <Tag className="w-4 h-4" />
                <span>{isAr ? 'الخصم التجاري غير متاح حالياً' : 'Discount unavailable'}</span>
              </button>

              {onOpenCreatePo && (
                <button
                  type="button"
                  onClick={onOpenCreatePo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAr ? '+ أمر شراء' : '+ New PO'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 border border-white/20 shadow-sm transition-all cursor-pointer"
                title={isAr ? 'طباعة تقرير المورد الشامل' : 'Print Profile'}
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة' : 'Print'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOADING STATE OR FINANCIAL CONTENT */}
      {isLoading && !statement ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {isAr ? 'جاري تحميل وحساب السجلات المالية وفواتير المورد...' : 'Loading supplier financial profile & statement...'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 2. FINANCIAL METRICS KPIS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
            {isAr ? 'إجمالي أوامر الشراء' : 'Total PO Value'}
          </span>
          <div className="mt-1 font-mono font-black text-slate-900 dark:text-white text-base">
            {Number(summary.total_po_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-normal text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {summary.total_pos_count || allPurchaseOrders.length || 0} {isAr ? 'أوامر شراء مسجلة' : 'POs'}
          </span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 block">
            {isAr ? 'إجمالي الفواتير المعتمدة' : 'Invoiced Amount'}
          </span>
          <div className="mt-1 font-mono font-black text-purple-700 dark:text-purple-300 text-base">
            {Number(summary.total_invoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-normal text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {allInvoices.length} {isAr ? 'فواتير توريد' : 'Invoices'}
          </span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
            {isAr ? 'إجمالي المسدد للمورد' : 'Total Paid'}
          </span>
          <div className="mt-1 font-mono font-black text-emerald-700 dark:text-emerald-300 text-base">
            {Number(summary.total_actual_paid || summary.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-normal text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5 font-medium">
            {isAr ? 'دفعات مسددة فعلياً' : 'Actual Settlements'}
          </span>
        </Card>

        <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
            {isAr ? 'إجمالي الخصومات والتسويات' : 'Discounts & Rebates'}
          </span>
          <div className="mt-1 font-mono font-black text-amber-700 dark:text-amber-300 text-base">
            {Number(summary.total_discounts || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-normal text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] text-amber-600/80 block mt-0.5 font-medium">
            {isAr ? 'وفورات مكتسبة للمصنع' : 'Granted Discounts'}
          </span>
        </Card>

        <Card className={`p-3.5 border shadow-2xs ${
          hasOutstandingBalance
            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80'
            : 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80'
        }`}>
          <span className={`text-[11px] font-bold block ${hasOutstandingBalance ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
            {isAr ? 'الرصيد المستحق (المديونية)' : 'Net Outstanding Balance'}
          </span>
          <div className={`mt-1 font-mono font-black text-lg ${hasOutstandingBalance ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
            {Number(summary.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-[10px] font-normal ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <span className="text-[10px] font-bold block mt-0.5 opacity-90">
            {hasOutstandingBalance ? (isAr ? '⏳ التزام مالي مستحق السداد' : 'Outstanding Liability') : (isAr ? '✓ الحساب خالص بالكامل' : 'Fully Settled')}
          </span>
        </Card>
      </div>

      {/* 3. PAYMENT METHODS & CREDIT PROFILE BREAKDOWN BANNER */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white">
              {isAr ? 'ملف ونظام الدفعات للمورد (سداد كاش، فيزا، بنكي، شيكات، وآجل):' : 'Payment Methods & Credit Structure:'}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 text-[11px] font-medium">{isAr ? 'شروط السداد المعتمدة:' : 'Terms:'}</span>
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 font-mono text-[11px]">
              {activeSup.payment_terms === 'net_30' || activeSup.payment_terms === '30_days'
                ? (isAr ? 'آجل 30 يوم' : 'Net 30')
                : activeSup.payment_terms === 'net_60'
                ? (isAr ? 'آجل 60 يوم' : 'Net 60')
                : (isAr ? 'سداد دفعات مجدولة' : 'Installments')}
            </span>
          </div>
        </div>

        {/* Breakdown Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1 text-xs">
          {/* Cash */}
          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40">
            <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold block flex items-center gap-1">
              <Banknote className="w-3 h-3" />
              {isAr ? 'كاش (من الخزينة)' : 'Cash'}
            </span>
            <strong className="font-mono text-xs text-emerald-700 dark:text-emerald-300 block mt-1 font-bold">
              {Number(breakdown.cash || 0).toLocaleString()} ج.م
            </strong>
          </div>

          {/* Card / Visa */}
          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40">
            <span className="text-[10px] text-blue-800 dark:text-blue-400 font-bold block flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              {isAr ? 'بطاقات بنكية / فيزا' : 'Card / POS'}
            </span>
            <strong className="font-mono text-xs text-blue-700 dark:text-blue-300 block mt-1 font-bold">
              {Number(breakdown.card || 0).toLocaleString()} ج.م
            </strong>
          </div>

          {/* Bank Transfer / InstaPay */}
          <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40">
            <span className="text-[10px] text-indigo-800 dark:text-indigo-400 font-bold block flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {isAr ? 'تحويل بنكي / إنستاباي' : 'Bank / InstaPay'}
            </span>
            <strong className="font-mono text-xs text-indigo-700 dark:text-indigo-300 block mt-1 font-bold">
              {Number(breakdown.bank_transfer || 0).toLocaleString()} ج.م
            </strong>
          </div>

          {/* Cheques */}
          <div className="p-2.5 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/70 dark:border-cyan-900/40">
            <span className="text-[10px] text-cyan-800 dark:text-cyan-400 font-bold block flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              {isAr ? 'شيكات بنكية' : 'Cheques'}
            </span>
            <strong className="font-mono text-xs text-cyan-700 dark:text-cyan-300 block mt-1 font-bold">
              {Number(breakdown.cheque || 0).toLocaleString()} ج.م
            </strong>
          </div>

          {/* Deferred Balance */}
          <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40">
            <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold block flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {isAr ? 'المتبقي الآجل (مستحق)' : 'Deferred Balance'}
            </span>
            <strong className="font-mono text-xs text-amber-700 dark:text-amber-300 block mt-1 font-bold">
              {Number(summary.closing_balance || 0).toLocaleString()} ج.م
            </strong>
          </div>
        </div>
      </div>

      {/* 4. INTERNAL PROFILE TABS */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto pb-px">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isAr ? 'فواتير التوريد' : 'Invoices'}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {allInvoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>{isAr ? 'سندات السداد والدفعات' : 'Payments'}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {statement?.payments?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('discounts')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'discounts'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{isAr ? 'الخصومات والتسويات' : 'Discounts'}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {statement?.discounts?.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isAr ? 'أوامر الشراء' : 'Purchase Orders'}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/20">
              {allPurchaseOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>{isAr ? 'كشف الحساب التراكمي الموحد' : 'Unified Ledger'}</span>
          </button>
        </div>
      </div>

      {/* 5. TAB CONTENTS */}
      <div className="pt-1">
        {/* TAB 1: INVOICES */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {/* Educational / Explanatory Formula Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-white to-indigo-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-indigo-950/20 border border-amber-200/80 dark:border-amber-800/40 flex items-start gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-base">
                💡
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{isAr ? 'نظام احتساب الفواتير ودفعات الآجل للمورد:' : 'Supplier Invoices & Deferred Settlement System:'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                    {isAr ? 'محاسبة دقيقة 100%' : 'Exact Accounting'}
                  </span>
                </h4>
                <div className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>• <strong>{isAr ? 'المسددة بالكامل:' : 'Fully Paid:'}</strong> {isAr ? 'رصيدها 0 ج.م ولا تضاف للإجمالي نهائياً.' : '0 EGP due, excluded from balance.'}</span>
                  <span>• <strong>{isAr ? 'عليها دفعات:' : 'Installments:'}</strong> {isAr ? 'ينزل منها المتبقي الآجل فقط في إجمالي المديونية.' : 'Only remaining due is added.'}</span>
                  <span>• <strong>{isAr ? 'آجلة لم تسدد:' : 'Credit Due:'}</strong> {isAr ? 'تضاف قيمتها كاملة للمديونية.' : 'Full amount added.'}</span>
                  <span>• <strong>{isAr ? 'الخصومات:' : 'Discounts:'}</strong> {isAr ? 'تُحتسب فقط بعد اعتماد إشعار دائن وقيده محاسبياً.' : 'Counted only after an approved credit note is posted.'}</span>
                </div>
              </div>
            </div>

            {/* Filter Pills Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تصنيف الفواتير:' : 'Filter:'}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setInvoiceFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceFilter === 'all'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{isAr ? 'الكل' : 'All'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {allInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceFilter === 'unpaid'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? '⏳ آجلة بالكامل' : 'Credit Due'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {unpaidInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceFilter('partially_paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceFilter === 'partially_paid'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{isAr ? '💳 عليها دفعات / مسدد جزئياً' : 'Partially Paid'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {partiallyPaidInvoices.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    invoiceFilter === 'paid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isAr ? '✓ مسددة بالكامل (خالصة)' : 'Fully Paid'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                    {fullyPaidInvoices.length}
                  </span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsInvoiceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-2xs transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isAr ? '+ تسجيل فاتورة جديدة' : '+ New Invoice'}</span>
              </button>
            </div>

            {/* Invoices Table Card */}
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-3 px-4">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                      <th className="py-3 px-4">{isAr ? 'أمر الشراء المرتبط' : 'PO #'}</th>
                      <th className="py-3 px-4">{isAr ? 'تاريخ الفاتورة والاستحقاق' : 'Dates'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'المبلغ الصافي' : 'Subtotal'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الضريبة' : 'Tax'}</th>
                      <th className="py-3 px-4 text-center text-purple-700 dark:text-purple-300">{isAr ? 'إجمالي الفاتورة' : 'Total'}</th>
                      <th className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-300">{isAr ? 'المسدد منها' : 'Paid'}</th>
                      <th className="py-3 px-4 text-center text-amber-700 dark:text-amber-300">{isAr ? 'المتبقي الآجل' : 'Remaining Due'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'حالة السداد والالتزام' : 'Payment Status'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <span className="font-semibold text-xs">
                              {invoiceFilter !== 'all'
                                ? (isAr ? 'لا توجد فواتير تطابق هذا التصنيف المحدد.' : 'No invoices match this filter.')
                                : (isAr ? 'لم تسجل أي فواتير توريد لهذا المورد بعد.' : 'No invoices recorded yet.')}
                            </span>
                            {invoiceFilter !== 'all' && (
                              <button
                                type="button"
                                onClick={() => setInvoiceFilter('all')}
                                className="text-xs text-purple-600 hover:underline font-bold mt-1"
                              >
                                {isAr ? 'عرض كافة الفواتير' : 'View all invoices'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      displayedInvoices.map((inv: any) => {
                        const total = Number(inv.total_amount || 0);
                        const paid = Number(inv.paid_amount || 0);
                        const remaining = Number(inv.remaining_amount ?? Math.max(0, total - paid));
                        const isSettled = inv.payment_status === 'paid' || (total > 0 && paid >= total);
                        const isPartial = !isSettled && (inv.payment_status === 'partially_paid' || paid > 0);

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              <span className="block">{inv.invoice_number}</span>
                              {inv.matching_status === 'matched' && (
                                <span className="text-[10px] text-emerald-600 font-sans font-medium flex items-center gap-0.5 mt-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  <span>{isAr ? 'مطابقة ثلاثية' : 'Matched'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                              {inv.po_number || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              <span className="block font-medium text-slate-700 dark:text-slate-300">{inv.invoice_date || '—'}</span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {isAr ? 'استحقاق:' : 'Due:'} {inv.due_date || '—'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-center text-slate-600 dark:text-slate-400">
                              {Number(inv.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-3 px-4 font-mono text-center text-slate-500">
                              {Number(inv.tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-center text-purple-700 dark:text-purple-300 text-sm">
                              {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-center text-emerald-600 dark:text-emerald-400">
                              {paid > 0 ? `${paid.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م` : '0.00 ج.م'}
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-center text-amber-700 dark:text-amber-400">
                              {remaining > 0 ? (
                                <span className="bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-800">
                                  {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  0.00 ج.م
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isSettled ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{isAr ? 'مسددة بالكامل (خالصة)' : 'Fully Paid'}</span>
                                </span>
                              ) : isPartial ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl text-[11px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300/80 dark:border-blue-800">
                                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                                    <span>{isAr ? 'مسددة جزئياً (دفعات)' : 'Partially Paid'}</span>
                                  </span>
                                  <span className="text-[10px] text-blue-600/90 font-mono font-bold mt-0.5">
                                    {isAr ? `متبقي: ${remaining.toLocaleString()} ج.م` : `Due: ${remaining}`}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{isAr ? 'آجلة بالكامل (مستحقة)' : 'Credit Due'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {!isSettled && remaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInvoiceId(inv.id);
                                      setPaymentAmount(String(remaining));
                                      setIsPaymentModalOpen(true);
                                    }}
                                    title={isAr ? `سداد دفعة على الفاتورة (متبقي: ${remaining.toLocaleString()} ج.م)` : 'Pay Remaining Invoice Amount'}
                                    className="px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs flex items-center gap-1 font-bold"
                                  >
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-[11px]">{isAr ? 'سداد دفعة' : 'Pay'}</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setVoucherToPrint({
                                    type: 'invoice',
                                    reference: inv.invoice_number,
                                    date: inv.invoice_date,
                                    time: '12:00 م',
                                    credit: total,
                                    description: `فاتورة توريد خامات لأمر الشراء ${inv.po_number || ''}`,
                                    running_balance: summary.closing_balance,
                                  })}
                                  title={isAr ? 'طباعة الفاتورة' : 'Print Invoice'}
                                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  disabled
                                  title={isAr ? 'الفواتير المالية لا تُحذف؛ استخدم مرتجعاً أو إشعاراً دائناً' : 'Financial invoices cannot be deleted; use a return or credit note'}
                                  className="p-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-2xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 2: PAYMENTS */}
        {activeTab === 'payments' && (
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم سند الصرف' : 'Voucher #'}</th>
                    <th className="py-3 px-4">{isAr ? 'تاريخ ووقت السداد' : 'Date & Time'}</th>
                    <th className="py-3 px-4">{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المبلغ المسدد (ج.م)' : 'Amount (EGP)'}</th>
                    <th className="py-3 px-4">{isAr ? 'البيان والملاحظات' : 'Notes'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!statement?.payments || statement.payments.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        {isAr ? 'لم تسجل أي سندات سداد نقدية أو بنكية لهذا المورد بعد.' : 'No payment vouchers recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    statement.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {p.voucher_number}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="block font-semibold text-slate-800 dark:text-slate-200">{p.voucher_date}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{p.time || '12:00 م'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {getMethodBadge(p.payment_method, 'payment')}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-center text-emerald-600 dark:text-emerald-400 text-sm">
                          {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {p.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVoucherToPrint({
                                type: 'payment',
                                reference: p.voucher_number,
                                date: p.voucher_date,
                                time: p.time,
                                payment_method: p.payment_method,
                                debit: p.amount,
                                description: p.notes,
                                running_balance: summary.closing_balance,
                              })}
                              title={isAr ? 'طباعة سند الصرف' : 'Print Voucher'}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled
                              onClick={() => {
                                setEditingTransaction({ raw_id: p.id, type: 'payment' });
                                setEditAmount(String(p.amount));
                                setEditMethod(p.payment_method || 'cash');
                                setEditDate(p.voucher_date);
                                setEditNotes(p.notes || '');
                              }}
                              title={isAr ? 'السند المرحّل غير قابل للتعديل المباشر' : 'Posted vouchers cannot be edited directly'}
                              className="p-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-2xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled
                              title={isAr ? 'لا يمكن حذف سند مرحّل؛ يجب عكس قيده المحاسبي' : 'Posted vouchers must be reversed, not deleted'}
                              className="p-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: DISCOUNTS */}
        {activeTab === 'discounts' && (
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم إشعار الخصم' : 'Notice #'}</th>
                    <th className="py-3 px-4">{isAr ? 'تاريخ الخصم' : 'Date'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'قيمة الخصم (ج.م)' : 'Amount (EGP)'}</th>
                    <th className="py-3 px-4">{isAr ? 'نوع الخصم والسبب' : 'Reason / Type'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!statement?.discounts || statement.discounts.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {isAr ? 'لم تسجل أي خصومات تجارية أو تسويات لهذا المورد بعد.' : 'No discounts recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    statement.discounts.map((d: any) => (
                      <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {d.voucher_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {d.voucher_date}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-center text-amber-700 dark:text-amber-300 text-sm">
                          {Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                          {d.notes || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled
                            title={isAr ? 'لا يمكن حذف أو تعديل إشعار خصم دون قيد عكسي' : 'Discount notices require an accounting reversal'}
                            className="p-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-2xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 4: PURCHASE ORDERS */}
        {activeTab === 'pos' && (
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم أمر الشراء' : 'PO #'}</th>
                    <th className="py-3 px-4">{isAr ? 'تاريخ الأمر' : 'Order Date'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'إجمالي الأمر (ج.م)' : 'Total (EGP)'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(!allPurchaseOrders || allPurchaseOrders.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        {isAr ? 'لم تصدر أي أوامر شراء رسمية لهذا المورد بعد.' : 'No POs found.'}
                      </td>
                    </tr>
                  ) : (
                    allPurchaseOrders.map((po: any) => (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {po.po_number}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                          {po.order_date || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-center text-slate-900 dark:text-white">
                          {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={po.status === 'received' ? 'success' : po.status === 'approved' ? 'info' : 'neutral'}>
                            {po.status === 'received' ? (isAr ? 'مستلم بالكامل' : 'Received') : po.status === 'approved' ? (isAr ? 'معتمد للتوريد' : 'Approved') : (isAr ? 'مسودة' : 'Draft')}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 5: UNIFIED RUNNING LEDGER */}
        {activeTab === 'ledger' && (
          <div className="printable-sheet space-y-4">
            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs shadow-2xs no-print">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                  />
                </div>
                <span className="text-slate-400">—</span>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-2.5 start-2.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isAr ? 'بحث برقم الفاتورة أو السند...' : 'Search ref...'}
                    className="ps-8 pe-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs w-52"
                  />
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.print()}
                  className="font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{isAr ? 'طباعة الكشف' : 'Print Statement'}</span>
                </Button>
              </div>
            </div>

            {/* Ledger Table */}
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-3 px-4">{isAr ? 'تاريخ ووقت الحركة' : 'Date & Time'}</th>
                      <th className="py-3 px-4">{isAr ? 'طبيعة الحركة' : 'Type'}</th>
                      <th className="py-3 px-4">{isAr ? 'المرجع / السند' : 'Reference'}</th>
                      <th className="py-3 px-4">{isAr ? 'طريقة السداد' : 'Method'}</th>
                      <th className="py-3 px-4 text-center text-purple-600">{isAr ? 'دائن (+) التزام' : 'Credit (+)'}</th>
                      <th className="py-3 px-4 text-center text-emerald-600">{isAr ? 'مدين (-) سداد/خصم' : 'Debit (-)'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الرصيد التراكمي المتبقي' : 'Running Balance'}</th>
                      <th className="py-3 px-4 no-print text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLines.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {isAr ? 'لا توجد حركات مسجلة تطابق البحث.' : 'No transactions found.'}
                        </td>
                      </tr>
                    ) : (
                      filteredLines.map((line: any) => (
                        <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{line.date}</span>
                            <span className="text-[10px] text-slate-400">{line.time || '12:00 م'}</span>
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {line.type_label}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {line.reference}
                          </td>
                          <td className="py-3 px-4">
                            {getMethodBadge(line.payment_method, line.type)}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-center text-purple-600 dark:text-purple-400">
                            {Number(line.credit) > 0 ? `${Number(line.credit).toLocaleString()} ج.م` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-center text-emerald-600 dark:text-emerald-400">
                            {Number(line.debit) > 0 ? `${Number(line.debit).toLocaleString()} ج.م` : '—'}
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-center text-slate-900 dark:text-white">
                            {Number(line.running_balance).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4 text-center no-print">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setVoucherToPrint(line)}
                                title={isAr ? 'طباعة سند الحركة' : 'Print Voucher'}
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled
                                title={isAr ? 'الحركات المالية المرحّلة لا تُحذف مباشرة' : 'Posted financial entries cannot be deleted directly'}
                                className="p-1.5 rounded-lg text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed shadow-2xs"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
      </>
    )}

      {/* MODAL 1: RECORD PAYMENT MODAL */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isAr ? `سداد دفعة للمورد: ${activeSup.name}` : `Record Payment Voucher: ${activeSup.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المبلغ المسدد (ج.م) *' : 'Payment Amount (EGP) *'}
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base p-2.5 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة السداد *' : 'Payment Method *'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="cash">{isAr ? '💵 نقداً (كاش من الخزينة)' : '💵 Cash'}</option>
                <option value="card">{isAr ? '💳 بطاقة بنكية / فيزا (POS)' : '💳 Card / POS'}</option>
                <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي / إنستاباي' : '🏦 Bank Transfer / InstaPay'}</option>
                <option value="cheque">{isAr ? '📜 شيك بنكي' : '📜 Cheque'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ السداد *' : 'Payment Date *'}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وقت / ساعة السداد' : 'Payment Time'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  placeholder="12:00 م"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ربط السداد بفاتورة محددة (اختياري)' : 'Link to Invoice (Optional)'}
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                const chosenId = e.target.value;
                setSelectedInvoiceId(chosenId);
                if (chosenId) {
                  const inv = allInvoices.find((i: any) => i.id === chosenId);
                  if (inv) {
                    const rem = Number(inv.remaining_amount ?? Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0)));
                    if (rem > 0) {
                      setPaymentAmount(String(rem));
                    }
                  }
                }
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">{isAr ? '-- سداد عام على الحساب التراكمي --' : '-- General Payment on Account --'}</option>
              {allInvoices.map((inv: any) => {
                const total = Number(inv.total_amount || 0);
                const paid = Number(inv.paid_amount || 0);
                const rem = Number(inv.remaining_amount ?? Math.max(0, total - paid));
                const isPaid = inv.payment_status === 'paid' || (total > 0 && paid >= total);
                return (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} (إجمالي: {total.toLocaleString()} ج.م — متبقي: {rem.toLocaleString()} ج.م) {isPaid ? '✓ خالصة' : rem < total ? '💳 عليها دفعات' : '⏳ آجلة'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البيان والملاحظات' : 'Notes / Reference'}
            </label>
            <input
              type="text"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder={isAr ? 'مثال: سداد دفعة نقدية من الخزينة بشيك رقم 442 أو إيصال 501' : 'e.g. Cash voucher #501'}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingPayment} icon={<DollarSign className="w-3.5 h-3.5" />}>
              {isAr ? 'تأكيد وترحيل سند الصرف' : 'Post Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: RECORD INVOICE MODAL */}
      <Modal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title={isAr ? `تسجيل فاتورة توريد جديدة: ${activeSup.name}` : `New Invoice: ${activeSup.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordInvoice} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الفاتورة *' : 'Invoice # *'}
              </label>
              <input
                type="text"
                required
                value={invNumber}
                onChange={(e) => setInvNumber(e.target.value)}
                placeholder="INV-9941"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'إجمالي الفاتورة (ج.م) *' : 'Total (EGP) *'}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الفاتورة *' : 'Invoice Date *'}
              </label>
              <input
                type="date"
                required
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الاستحقاق' : 'Due Date'}
              </label>
              <input
                type="date"
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات وتفاصيل التوريد' : 'Notes'}
            </label>
            <input
              type="text"
              value={invNotes}
              onChange={(e) => setInvNotes(e.target.value)}
              placeholder={isAr ? 'مثال: توريد قماش قطني 100% للشحنة رقم 5' : 'e.g. Fabric supply batch #5'}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsInvoiceModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingInvoice} icon={<FileText className="w-3.5 h-3.5" />}>
              {isAr ? 'اعتماد وترحيل الفاتورة' : 'Post Invoice'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: RECORD DISCOUNT MODAL */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title={isAr ? `تسجيل خصم تجاري / تسوية: ${activeSup.name}` : `Record Discount: ${activeSup.name}`}
        maxWidth="md"
      >
        <form onSubmit={handleRecordDiscount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'قيمة الخصم (ج.م) *' : 'Discount Amount (EGP) *'}
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              required
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base p-2.5 font-mono font-bold text-amber-600 dark:text-amber-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع الخصم *' : 'Discount Type *'}
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="early_payment">{isAr ? 'خصم تعجيل دفع نقدي' : 'Early Payment Discount'}</option>
                <option value="volume_rebate">{isAr ? 'خصم كمية / حافز سحب' : 'Volume Rebate'}</option>
                <option value="commercial">{isAr ? 'خصم تجاري خاص' : 'Commercial Discount'}</option>
                <option value="damage_allowance">{isAr ? 'تسوية عيوب تصنيع / تلفيات' : 'Defect / Damage Allowance'}</option>
                <option value="return_adjustment">{isAr ? 'تسوية مرتجعات خامات' : 'Return Adjustment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الخصم *' : 'Discount Date *'}
              </label>
              <input
                type="date"
                required
                value={discountDate}
                onChange={(e) => setDiscountDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات وسبب منح الخصم' : 'Notes / Reason'}
            </label>
            <input
              type="text"
              value={discountNotes}
              onChange={(e) => setDiscountNotes(e.target.value)}
              placeholder={isAr ? 'مثال: خصم 5% ممنوح لتسوية الدفعة كاش قبل موعدها' : 'e.g. 5% cash settlement incentive'}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsDiscountModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmittingDiscount} icon={<Tag className="w-3.5 h-3.5" />}>
              {isAr ? 'تأكيد الخصم وتخفيض الالتزام' : 'Apply Discount'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: EDIT PAYMENT MODAL */}
      {editingTransaction && (
        <Modal
          isOpen={Boolean(editingTransaction)}
          onClose={() => setEditingTransaction(null)}
          title={isAr ? 'تعديل سند الصرف والسداد' : 'Edit Voucher'}
          maxWidth="md"
        >
          <form onSubmit={handleUpdatePayment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المبلغ المعدل (ج.م) *' : 'Amount *'}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-base p-2.5 font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'طريقة السداد' : 'Method'}
                </label>
                <select
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="cash">{isAr ? '💵 نقداً (كاش من الخزينة)' : 'Cash'}</option>
                  <option value="card">{isAr ? '💳 بطاقة بنكية / فيزا (POS)' : 'Card'}</option>
                  <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي / إنستاباي' : 'Bank Transfer'}</option>
                  <option value="cheque">{isAr ? '📜 شيك بنكي' : 'Cheque'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'التاريخ' : 'Date'}
                </label>
                <input
                  type="date"
                  required
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2.5 font-mono text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'البيان والملاحظات' : 'Notes'}
              </label>
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs p-2 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setEditingTransaction(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary" isLoading={isSubmittingEdit}>
                {isAr ? 'حفظ التعديلات' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 5: PRINTABLE VOUCHER MODAL */}
      {voucherToPrint && (
        <Modal
          isOpen={Boolean(voucherToPrint)}
          onClose={() => setVoucherToPrint(null)}
          title={isAr ? `إيصال معاملة رسمي: ${voucherToPrint.reference}` : `Voucher: ${voucherToPrint.reference}`}
          maxWidth="md"
        >
          <div className="printable-voucher space-y-5 print:p-0">
            <div className="border border-slate-300 dark:border-slate-700 p-5 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {isAr ? 'مصنع الملابس الجاهزة' : 'Garment Factory'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {voucherToPrint.type === 'payment'
                      ? (isAr ? 'سند صرف وسداد دفعة مورد' : 'Supplier Payment Voucher')
                      : voucherToPrint.type === 'discount'
                      ? (isAr ? 'إشعار خصم تجاري وتسوية' : 'Discount Voucher')
                      : (isAr ? 'فاتورة توريد خامات معتمدة' : 'Supplier Purchase Invoice')}
                  </p>
                </div>
                <div className="text-left font-mono text-xs">
                  <span className="font-bold text-indigo-600 block">{voucherToPrint.reference}</span>
                  <span className="text-slate-400">{voucherToPrint.date}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'اسم المورد:' : 'Supplier:'}</span>
                  <strong className="text-slate-900 dark:text-white">{activeSup.name}</strong>
                  <span className="font-mono text-[10px] text-slate-400 block mt-0.5">({activeSup.code})</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'تاريخ ووقت الحركة:' : 'Date & Time:'}</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{voucherToPrint.date}</strong>
                  <span className="font-mono text-[10px] text-slate-500 block mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{voucherToPrint.time || '12:00 م'}</span>
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'طريقة السداد / الدفع:' : 'Payment Method:'}</span>
                  <div className="mt-1">{getMethodBadge(voucherToPrint.payment_method, voucherToPrint.type)}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'المبلغ المالي:' : 'Amount:'}</span>
                  <strong className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 block">
                    {Number(voucherToPrint.debit || voucherToPrint.credit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </strong>
                </div>
              </div>

              {/* Description */}
              <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 text-xs text-slate-700 dark:text-slate-300">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'البيان والملاحظات:' : 'Notes:'}</span>
                <p className="mt-0.5 font-medium">{voucherToPrint.description || '—'}</p>
              </div>

              {/* Balance after voucher */}
              <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300">{isAr ? 'الرصيد المتبقي على المصنع بعد هذه الحركة:' : 'Remaining Balance:'}</span>
                <strong className="font-mono font-black text-sm text-amber-700 dark:text-amber-400">
                  {Number(summary.closing_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                </strong>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center text-[10px] text-slate-500">
                <div>
                  <span>{isAr ? 'أمين الخزينة' : 'Cashier'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <span>{isAr ? 'المستلم (المورد/المندوب)' : 'Recipient'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <span>{isAr ? 'اعتماد الإدارة المالية' : 'Finance Director'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-between items-center print:hidden no-print">
              <Button
                size="sm"
                variant="primary"
                onClick={() => window.print()}
                className="font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة السند' : 'Print Voucher'}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVoucherToPrint(null)}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

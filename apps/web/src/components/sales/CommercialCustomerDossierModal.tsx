import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Phone,
  CreditCard,
  DollarSign,
  FileText,
  ShoppingBag,
  RotateCcw,
  Truck,
  Printer,
  Plus,
  Pencil,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Save,
  Check,
  RefreshCw,
  Store,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import { formatCleanDate, getPaymentMethodLabel } from './PrintSalesInvoiceModal';
import type { Customer, SalesInvoice, SalesOrder, SalesReturn } from '../../types';

interface CommercialCustomerDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  invoices: SalesInvoice[];
  orders: SalesOrder[];
  payments: any[];
  returns: SalesReturn[];
  deliveryNotes: any[];
  onRecordPayment: (customer: Customer, invoice?: SalesInvoice) => void;
  onNewOrder: (customer: Customer) => void;
  onOpenStatement: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onPrintInvoice: (invoice: SalesInvoice) => void;
  onRefresh?: () => void;
  isAr?: boolean;
}

export const CommercialCustomerDossierModal: React.FC<CommercialCustomerDossierModalProps> = ({
  isOpen,
  onClose,
  customer,
  invoices,
  orders,
  payments,
  returns,
  deliveryNotes,
  onRecordPayment,
  onNewOrder,
  onOpenStatement,
  onEditCustomer,
  onPrintInvoice,
  onRefresh,
  isAr = true,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'orders' | 'returns' | 'deliveries' | 'terms'>('overview');

  // Interactive Payment Terms State
  const [paymentTerms, setPaymentTerms] = useState<'cash' | 'installments'>('cash');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [termsNotes, setTermsNotes] = useState<string>('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick Payment Modal State inside Dossier
  const [isQuickPayOpen, setIsQuickPayOpen] = useState(false);
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMethod, setQuickPayMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'wallet' | 'check'>('cash');
  const [quickPayInvoiceId, setQuickPayInvoiceId] = useState<string>('');
  const [quickPayNotes, setQuickPayNotes] = useState<string>('');
  const [isSubmittingQuickPay, setIsSubmittingQuickPay] = useState(false);
  const [quickPaySuccess, setQuickPaySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (customer) {
      setPaymentTerms(customer.payment_terms === 'installments' ? 'installments' : 'cash');
      setCreditLimit(Number(customer.credit_limit || 0));
      setTermsNotes(customer.notes || '');
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  // Filter cross-tab records belonging to this customer
  const custNameNorm = (customer.name || '').trim().toLowerCase();

  const customerInvoices = invoices.filter(
    (inv) =>
      (inv.customer_id && inv.customer_id === customer.id) ||
      (inv.customer_name && inv.customer_name.trim().toLowerCase() === custNameNorm)
  );

  const customerOrders = orders.filter(
    (ord) =>
      (ord.customer_id && ord.customer_id === customer.id) ||
      (ord.customer_name && ord.customer_name.trim().toLowerCase() === custNameNorm)
  );

  const customerPayments = payments.filter(
    (pay) =>
      (pay.customer_id && pay.customer_id === customer.id) ||
      (pay.party_id && pay.party_id === customer.id) ||
      (pay.customer_name && pay.customer_name.trim().toLowerCase() === custNameNorm)
  );

  const customerReturns = returns.filter(
    (ret) =>
      (ret.customer_id && ret.customer_id === customer.id) ||
      ((ret as any).customer_name && (ret as any).customer_name.trim().toLowerCase() === custNameNorm)
  );

  const customerOrderIds = new Set(customerOrders.map((o) => o.id));
  const customerDeliveries = deliveryNotes.filter(
    (dn) =>
      (dn.customer_id && dn.customer_id === customer.id) ||
      (dn.recipient_name && dn.recipient_name.trim().toLowerCase() === custNameNorm) ||
      (dn.sales_order_id && customerOrderIds.has(dn.sales_order_id))
  );

  // Financial calculations
  const totalInvoiced = customerInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  // Payments breakdown
  const totalPaidFromVouchers = customerPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
  const totalPaidFromInvoices = customerInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalCollected = Math.max(totalPaidFromVouchers, totalPaidFromInvoices);

  const cashPayments = customerPayments
    .filter((p) => !p.payment_method || p.payment_method === 'cash')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const cardPayments = customerPayments
    .filter((p) => p.payment_method === 'card' || p.payment_method === 'pos' || p.payment_method === 'visa')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const bankPayments = customerPayments
    .filter((p) => p.payment_method === 'bank_transfer' || p.payment_method === 'check' || p.payment_method === 'wallet')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const totalReturns = customerReturns.reduce((sum, ret) => sum + Number(ret.total_amount || 0), 0);

  // Net Balance Due
  const calculatedBalanceDue = Math.max(0, totalInvoiced - totalCollected - totalReturns);
  const effectiveBalanceDue = Number(customer.current_balance ?? calculatedBalanceDue);

  const totalPiecesOrdered = customerOrders.reduce((sum, ord) => {
    return sum + (ord.items || []).reduce((s, it: any) => s + Number(it.ordered_quantity || it.quantity || 0), 0);
  }, 0);

  const isWholesale =
    customer.classification === 'wholesale' ||
    customer.classification === 'company' ||
    customer.name.includes('براند') ||
    customer.name.includes('شركة') ||
    customer.name.includes('مصنع') ||
    customer.name.includes('توكيل');

  const creditLimitPercent = creditLimit > 0 ? Math.min(100, Math.round((effectiveBalanceDue / creditLimit) * 100)) : 0;

  // Handle saving payment terms
  const handleSaveTerms = async () => {
    if (!customer.id) return;
    setIsSavingTerms(true);
    setSaveSuccess(false);
    try {
      await api.customers.updateCustomer(customer.id, {
        payment_terms: paymentTerms,
        credit_limit: creditLimit,
        notes: termsNotes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || (isAr ? 'فشل حفظ شروط السداد' : 'Failed to update payment terms'));
    } finally {
      setIsSavingTerms(false);
    }
  };

  // Handle Quick Payment Submit
  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPayAmount <= 0) return;
    setIsSubmittingQuickPay(true);
    try {
      await api.sales.recordPayment({
        customer_id: customer.id,
        amount: Number(quickPayAmount),
        payment_method: quickPayMethod,
        sales_invoice_id: quickPayInvoiceId || undefined,
        notes: quickPayNotes || undefined,
      });
      setQuickPaySuccess(isAr ? 'تم تسجيل وتخصيص سند القبض بنجاح' : 'Payment recorded successfully');
      setTimeout(() => {
        setQuickPaySuccess(null);
        setIsQuickPayOpen(false);
        setQuickPayAmount(0);
        setQuickPayNotes('');
        setQuickPayInvoiceId('');
      }, 1500);
      onRefresh?.();
    } catch (err: any) {
      alert(err?.message || (isAr ? 'فشل تسجيل سند القبض' : 'Failed to record payment'));
    } finally {
      setIsSubmittingQuickPay(false);
    }
  };

  const openInvoicePayment = (inv: SalesInvoice) => {
    const due = Number(inv.balance_due ?? inv.total_amount);
    setQuickPayInvoiceId(inv.id);
    setQuickPayAmount(due > 0 ? due : Number(inv.total_amount));
    setIsQuickPayOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl bg-white dark:bg-[#0d131f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100">
        
        {/* TOP BRAND HERO HEADER */}
        <div className="relative overflow-hidden bg-linear-to-r from-[#7F1625] via-[#941b2e] to-[#4e0c16] text-white p-5 sm:p-6 shadow-md">
          {/* Subtle background ambient glow */}
          <div className="absolute -top-24 -end-24 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -start-24 w-72 h-72 bg-black/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Customer Identity */}
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shrink-0">
                {isWholesale ? <Building2 className="w-8 h-8 text-white" /> : <Store className="w-8 h-8 text-white" />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-xs">
                    {customer.name}
                  </h1>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/20 border border-white/30 text-white font-bold backdrop-blur-xs">
                    {customer.code || 'CUST'}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border backdrop-blur-xs ${
                    paymentTerms === 'cash'
                      ? 'bg-emerald-400/20 text-emerald-100 border-emerald-300/40'
                      : 'bg-amber-400/20 text-amber-100 border-amber-300/40'
                  }`}>
                    {paymentTerms === 'cash'
                      ? (isAr ? '💵 نظام السداد: كاش فوري' : 'Cash System')
                      : (isAr ? '📑 نظام السداد: دفعات وتسهيلات' : 'Installments System')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-bold">
                    {customer.is_active ? (isAr ? '✓ عميل معتمد' : 'Verified') : (isAr ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-rose-100/90 mt-2 font-medium">
                  <span className="flex items-center gap-1.5">
                    {isWholesale ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{isWholesale ? (isAr ? '🏢 عميل تجاري / توكيلات جملة' : 'Wholesale') : (isAr ? '🛍️ عميل تجزئة ومعارض' : 'Retail')}</span>
                  </span>

                  {customer.phone && (
                    <span className="flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{customer.phone}</span>
                    </span>
                  )}

                  {customer.contact_person && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{customer.contact_person}</span>
                    </span>
                  )}

                  {customer.tax_id && (
                    <span className="font-mono text-[11px] bg-black/20 px-2 py-0.5 rounded-md border border-white/10">
                      {isAr ? 'الرقم الضريبي:' : 'Tax ID:'} {customer.tax_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 shadow-md text-xs"
                onClick={() => {
                  setQuickPayInvoiceId('');
                  setQuickPayAmount(effectiveBalanceDue > 0 ? effectiveBalanceDue : 0);
                  setIsQuickPayOpen(true);
                }}
                icon={<DollarSign className="w-3.5 h-3.5" />}
              >
                {isAr ? 'تسجيل سند قبض / تحصيل' : 'Collect Payment'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-white/15 hover:bg-white/25 text-white border-white/30 font-bold text-xs"
                onClick={() => onNewOrder(customer)}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                {isAr ? 'أمر بيع جديد' : 'New Order'}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="bg-white/15 hover:bg-white/25 text-white border-white/30 font-bold text-xs"
                onClick={() => onOpenStatement(customer)}
                icon={<BookOpen className="w-3.5 h-3.5 text-amber-200" />}
              >
                {isAr ? 'كشف الحساب A4' : 'Statement'}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/15 text-xs"
                onClick={onRefresh}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                title={isAr ? 'تحديث البيانات' : 'Refresh'}
              >
                {isAr ? 'تحديث' : 'Refresh'}
              </Button>

              <button
                onClick={onClose}
                className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer ms-1 hover:rotate-90 duration-200"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 5 FINANCIAL & OPERATIONS METRIC CARDS */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#101726] border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* Card 1: Total Invoiced */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#7F1625]/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'إجمالي المبيعات' : 'Total Invoiced'}</span>
                <ShoppingBag className="w-4 h-4 text-[#7F1625]" />
              </div>
              <p className="mt-1.5 text-xl font-black font-mono text-slate-900 dark:text-white">
                {totalInvoiced.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {customerInvoices.length} {isAr ? 'فواتير محررة' : 'invoices issued'}
              </span>
            </div>

            {/* Card 2: Total Paid & Breakdown */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'المسدد والمقبوض' : 'Total Collected'}</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="mt-1.5 text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {totalCollected.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </p>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                <span title={isAr ? 'كاش خزينة' : 'Cash'} className="text-emerald-700 dark:text-emerald-300">
                  💵 {cashPayments.toLocaleString()}
                </span>
                <span>•</span>
                <span title={isAr ? 'بطاقة فيزا وبنك' : 'Card / Bank'} className="text-blue-700 dark:text-blue-300">
                  💳 {(cardPayments + bankPayments).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Card 3: Returns & Credits */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'المرتجعات وإشعارات الدائن' : 'Returns & Credits'}</span>
                <RotateCcw className="w-4 h-4 text-amber-500" />
              </div>
              <p className="mt-1.5 text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                {totalReturns.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {customerReturns.length} {isAr ? 'سندات مرتجع معتمدة' : 'approved returns'}
              </span>
            </div>

            {/* Card 4: Net Balance Due */}
            <div className={`p-3.5 rounded-2xl border shadow-xs transition-all ${
              effectiveBalanceDue > 0
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                : 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
            }`}>
              <div className="flex items-center justify-between text-xs font-bold">
                <span className={effectiveBalanceDue > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}>
                  {isAr ? 'صافي المديونية المستحقة' : 'Balance Due'}
                </span>
                {effectiveBalanceDue > 0 ? (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <p className={`mt-1.5 text-xl font-black font-mono ${
                effectiveBalanceDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {effectiveBalanceDue.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {effectiveBalanceDue > 0
                  ? (isAr ? 'مستحق في ذمة العميل' : 'outstanding debt')
                  : (isAr ? 'الحساب خالص بالكامل ✓' : 'fully cleared')}
              </span>
            </div>

            {/* Card 5: Orders & Total Pieces */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-500/40 transition-all col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>{isAr ? 'الطلبيات وحجم التوريد' : 'Orders & Pieces'}</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <p className="mt-1.5 text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                {totalPiecesOrdered.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'قطعة' : 'pcs'}</span>
              </p>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {customerOrders.length} {isAr ? 'أمر بيع معتمد' : 'orders placed'}
              </span>
            </div>

          </div>
        </div>

        {/* INTERACTIVE PAYMENT TERMS & CONTRACT SETUP BANNER */}
        <div className="px-5 py-3.5 bg-slate-100/70 dark:bg-[#0f1624] border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? 'نظام السداد والتعاقد المعتمد للعميل (Cash vs Installments):' : 'Client Payment & Terms Setup:'}
                </span>
                <span className="text-[11px] text-slate-500 ms-2 hidden sm:inline">
                  {isAr ? 'حدد ما إذا كان العميل يتعامل كاش فوري أو نظام دفعات وأقساط مجدولة' : 'Configure payment rules & credit limit'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Cash vs Installments Toggle */}
              <div className="flex items-center p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPaymentTerms('cash')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentTerms === 'cash'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isAr ? '💵 كاش فوري' : 'Cash'}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTerms('installments')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    paymentTerms === 'installments'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isAr ? '📑 دفعات وأقساط' : 'Installments'}
                </button>
              </div>

              {/* Credit Limit Input */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{isAr ? 'الحد الائتماني:' : 'Limit:'}</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={creditLimit || ''}
                  onChange={(e) => setCreditLimit(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              {/* Save Terms Button */}
              <div className="flex items-center gap-2">
                {saveSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {isAr ? 'تم الحفظ' : 'Saved'}
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveTerms}
                  disabled={isSavingTerms}
                  className="h-7 text-xs font-bold"
                  icon={<Save className="w-3.5 h-3.5" />}
                >
                  {isSavingTerms ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الشروط' : 'Save')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1.5 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] overflow-x-auto text-xs font-semibold">
          {[
            { id: 'overview', label: isAr ? 'نظرة عامة والملخص' : 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
            { id: 'invoices', label: isAr ? 'فواتير المبيعات' : 'Invoices', count: customerInvoices.length, icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'payments', label: isAr ? 'سجل الدفعات والتحصيلات' : 'Payments Ledger', count: customerPayments.length, icon: <DollarSign className="w-3.5 h-3.5" /> },
            { id: 'orders', label: isAr ? 'طلبيات البيع والشحن' : 'Sales Orders', count: customerOrders.length, icon: <ShoppingBag className="w-3.5 h-3.5" /> },
            { id: 'returns', label: isAr ? 'المرتجعات وإشعارات الدائن' : 'Returns & Credits', count: customerReturns.length, icon: <RotateCcw className="w-3.5 h-3.5" /> },
            { id: 'deliveries', label: isAr ? 'أذون التسليم والشحن' : 'Delivery Notes', count: customerDeliveries.length, icon: <Truck className="w-3.5 h-3.5" /> },
            { id: 'terms', label: isAr ? 'بيانات التعاقد والشحن' : 'Profile & Terms', icon: <User className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#7F1625] text-[#7F1625] dark:text-[#ff8ba0] font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === tab.id
                      ? 'bg-[#7F1625]/10 dark:bg-[#7F1625]/30 text-[#7F1625] dark:text-[#ff8ba0] font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* TAB CONTENTS */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-[#0a0f19]/50">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Credit Limit utilization progress */}
              {creditLimit > 0 && (
                <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 space-y-2 shadow-2xs">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'الحد الائتماني المعتمد للعميل (Credit Limit):' : 'Credit Limit Utilization:'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {effectiveBalanceDue.toLocaleString()} / {creditLimit.toLocaleString()} {isAr ? 'ج.م' : 'EGP'} ({creditLimitPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        creditLimitPercent > 90 ? 'bg-rose-500' : creditLimitPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${creditLimitPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Invoices & Collections Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Recent Invoices */}
                <div className="bg-white dark:bg-[#0c121e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#7F1625]" />
                      {isAr ? 'أحدث فواتير المبيعات الصادرة' : 'Recent Invoices'}
                    </h3>
                    <button
                      onClick={() => setActiveTab('invoices')}
                      className="text-[11px] text-[#7F1625] dark:text-[#ff8ba0] hover:underline font-bold cursor-pointer"
                    >
                      {isAr ? 'عرض الكل' : 'View all'}
                    </button>
                  </div>

                  {customerInvoices.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">{isAr ? 'لا توجد فواتير صادرة حتى الآن' : 'No invoices issued'}</p>
                  ) : (
                    <div className="space-y-2">
                      {customerInvoices.slice(0, 4).map((inv) => {
                        const paid = Number(inv.paid_amount || 0);
                        const due = Number(inv.balance_due ?? (inv.total_amount - paid));

                        return (
                          <div
                            key={inv.id}
                            className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{inv.invoice_number}</span>
                                <span className="text-[10px] text-slate-400">({formatCleanDate(inv.invoice_date)})</span>
                              </div>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">
                                {getPaymentMethodLabel(inv.payment_method, isAr)}
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-end">
                                <span className="font-mono font-bold text-slate-900 dark:text-white block">
                                  {Number(inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                                </span>
                                <span className={`text-[10px] font-bold ${due > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {due > 0 ? (isAr ? `متبقي: ${due.toLocaleString()}` : `Due: ${due}`) : (isAr ? 'مسددة بالكامل ✓' : 'Paid')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => onPrintInvoice(inv)}
                                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                  title={isAr ? 'طباعة الفاتورة A4' : 'Print Invoice'}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {due > 0 && (
                                  <button
                                    onClick={() => openInvoicePayment(inv)}
                                    className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 transition-colors cursor-pointer"
                                    title={isAr ? 'تسجيل دفعة لهذه الفاتورة' : 'Record payment'}
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Collections */}
                <div className="bg-white dark:bg-[#0c121e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                      {isAr ? 'أحدث سندات القبض والتحصيلات' : 'Recent Collections'}
                    </h3>
                    <button
                      onClick={() => setActiveTab('payments')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      {isAr ? 'عرض الكل' : 'View all'}
                    </button>
                  </div>

                  {customerPayments.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-xs text-slate-400 mb-2">{isAr ? 'لا توجد سندات قبض مسجلة' : 'No payments recorded'}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setQuickPayInvoiceId('');
                          setQuickPayAmount(effectiveBalanceDue > 0 ? effectiveBalanceDue : 0);
                          setIsQuickPayOpen(true);
                        }}
                        icon={<DollarSign className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        {isAr ? 'تسجيل أول سند قبض' : 'Record First Payment'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customerPayments.slice(0, 4).map((pay) => (
                        <div
                          key={pay.id}
                          className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {pay.voucher_number || pay.reference_number || 'RC-PAY'}
                              </span>
                              <span className="text-[10px] text-slate-400">({formatCleanDate(pay.voucher_date || pay.created_at)})</span>
                            </div>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                              {getPaymentMethodLabel(pay.payment_method, isAr)}
                            </span>
                          </div>

                          <div className="text-end">
                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block text-sm">
                              +{Number(pay.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </span>
                            <span className="text-[10px] text-slate-400">{isAr ? 'سند تحصيل معتمد' : 'Voucher verified'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Legal & Commercial Profile Grid */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 shadow-2xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'مسؤول الاتصال والمشتريات' : 'Contact Person'}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{customer.contact_person || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'رقم الهاتف المعتمد' : 'Phone'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{customer.phone || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'الرقم الضريبي / السجل' : 'Tax / CR'}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {customer.tax_id || customer.commercial_registry || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'عنوان الشحن والتسليم' : 'Delivery Address'}</span>
                  <span className="text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {customer.delivery_address || customer.address || (isAr ? 'تسليم باب المصنع' : 'Ex-Factory')}
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'سجل فواتير المبيعات الصادرة للعميل' : 'Sales Invoices Log'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'فواتير المبيعات، المبالغ المسددة، والرصيد المتبقي مع إمكانية الطباعة المعتمدة.' : 'Issued invoices with paid & balance due status.'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xs">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ الفاتورة' : 'Date'}</th>
                      <th className="p-3 text-start">{isAr ? 'المخزن المنصرف منه' : 'Warehouse'}</th>
                      <th className="p-3 text-start">{isAr ? 'طريقة السداد' : 'Method'}</th>
                      <th className="p-3 text-end">{isAr ? 'إجمالي الفاتورة' : 'Total'}</th>
                      <th className="p-3 text-end">{isAr ? 'المسدد' : 'Paid'}</th>
                      <th className="p-3 text-end font-bold">{isAr ? 'المتبقي المستحق' : 'Due'}</th>
                      <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                    {customerInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-sans text-xs">
                          {isAr ? 'لا توجد فواتير مبيعات مسجلة لهذا العميل' : 'No invoices found for this customer'}
                        </td>
                      </tr>
                    ) : (
                      customerInvoices.map((inv) => {
                        const paid = Number(inv.paid_amount || 0);
                        const due = Number(inv.balance_due ?? (inv.total_amount - paid));

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{formatCleanDate(inv.invoice_date)}</td>
                            <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                              {inv.warehouse?.name || (isAr ? 'المخزن الرئيسي' : 'Main WH')}
                            </td>
                            <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                              {getPaymentMethodLabel(inv.payment_method, isAr)}
                            </td>
                            <td className="p-3 text-end font-bold text-slate-900 dark:text-white">
                              {Number(inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </td>
                            <td className="p-3 text-end text-emerald-600 dark:text-emerald-400 font-bold">
                              {paid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </td>
                            <td className="p-3 text-end font-bold">
                              <span className={due > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                {due.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-sans">
                              <Badge
                                variant={
                                  inv.status === 'paid'
                                    ? 'success'
                                    : inv.status === 'partially_paid'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {inv.status === 'paid'
                                  ? (isAr ? 'مسددة بالكامل' : 'Paid')
                                  : inv.status === 'partially_paid'
                                  ? (isAr ? 'سداد جزئي' : 'Partial')
                                  : (isAr ? 'آجل غير مسدد' : 'Unpaid')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-sans">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => onPrintInvoice(inv)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                  title={isAr ? 'طباعة الفاتورة A4' : 'Print Invoice'}
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {due > 0 && (
                                  <button
                                    onClick={() => openInvoicePayment(inv)}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                                    title={isAr ? 'تسجيل سند تحصيل لهذه الفاتورة' : 'Collect Payment'}
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS & COLLECTIONS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'سجل التحصيلات والدفعات المستلمة من العميل' : 'Payment Receipts Ledger'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'جميع سندات القبض والدفعات النقدية والبنكية المسجلة لحساب هذا العميل.' : 'All verified vouchers & installment payments.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRecordPayment(customer)}
                    icon={<FileText className="w-3.5 h-3.5 text-slate-500" />}
                    title={isAr ? 'فتح نموذج القبض المحاسبي المتقدم وتوزيع FIFO' : 'Advanced Voucher Form'}
                  >
                    {isAr ? 'النموذج المتقدم / FIFO' : 'Advanced Form'}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    onClick={() => {
                      setQuickPayInvoiceId('');
                      setQuickPayAmount(effectiveBalanceDue > 0 ? effectiveBalanceDue : 0);
                      setIsQuickPayOpen(true);
                    }}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'تسجيل سند قبض سريع' : 'Quick Payment'}
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xs">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم السند' : 'Voucher #'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ السند' : 'Date'}</th>
                      <th className="p-3 text-start">{isAr ? 'طريقة التحصيل' : 'Method'}</th>
                      <th className="p-3 text-end">{isAr ? 'المبلغ المحصل' : 'Amount'}</th>
                      <th className="p-3 text-start">{isAr ? 'الفاتورة المخصصة' : 'Allocated Invoice'}</th>
                      <th className="p-3 text-start">{isAr ? 'ملاحظات' : 'Notes'}</th>
                      <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                    {customerPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                          {isAr ? 'لا توجد سندات قبض مسجلة لهذا العميل' : 'No payments found'}
                        </td>
                      </tr>
                    ) : (
                      customerPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {pay.voucher_number || pay.reference_number || 'RC-PAY'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatCleanDate(pay.voucher_date || pay.created_at)}</td>
                          <td className="p-3 font-sans">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                              {getPaymentMethodLabel(pay.payment_method, isAr)}
                            </span>
                          </td>
                          <td className="p-3 text-end font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                            +{Number(pay.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="p-3 font-sans text-slate-600 dark:text-slate-400">
                            {pay.sales_invoice?.invoice_number || (isAr ? 'تسوية تلقائية (FIFO)' : 'Auto FIFO')}
                          </td>
                          <td className="p-3 font-sans text-slate-500 max-w-xs truncate">{pay.notes || '—'}</td>
                          <td className="p-3 text-center font-sans">
                            <Badge variant={pay.status === 'reversed' ? 'danger' : 'success'}>
                              {pay.status === 'reversed' ? (isAr ? 'ملغي' : 'Reversed') : (isAr ? 'معتمد' : 'Approved')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SALES ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'أوامر وطلبيات البيع الصادرة للعميل' : 'Sales Orders'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'متابعة أوامر البيع وحالة الصرف والتجهيز المخزني.' : 'Order fulfillment & warehouse status.'}
                  </p>
                </div>
                <Button size="sm" onClick={() => onNewOrder(customer)} icon={<Plus className="w-3.5 h-3.5" />}>
                  {isAr ? 'إنشاء أمر بيع جديد' : 'New Order'}
                </Button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xs">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ التحرير' : 'Date'}</th>
                      <th className="p-3 text-start">{isAr ? 'نوع الأمر' : 'Type'}</th>
                      <th className="p-3 text-center">{isAr ? 'عدد القطع' : 'Pieces'}</th>
                      <th className="p-3 text-end">{isAr ? 'إجمالي القيمة' : 'Total'}</th>
                      <th className="p-3 text-center">{isAr ? 'حالة السداد' : 'Payment'}</th>
                      <th className="p-3 text-center">{isAr ? 'حالة التجهيز والشحن' : 'Fulfillment'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                    {customerOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                          {isAr ? 'لا توجد أوامر بيع مسجلة لهذا العميل' : 'No sales orders found'}
                        </td>
                      </tr>
                    ) : (
                      customerOrders.map((ord) => {
                        const totalPieces = (ord.items || []).reduce(
                          (sum, it: any) => sum + Number(it.ordered_quantity || it.quantity || 0),
                          0
                        );

                        return (
                          <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">{ord.order_number}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{formatCleanDate(ord.order_date || ord.created_at)}</td>
                            <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                              {ord.order_type === 'wholesale' ? (isAr ? '🏢 جملة' : 'Wholesale') : (isAr ? '🛍️ تجزئة' : 'Retail')}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900 dark:text-white">
                              {totalPieces} {isAr ? 'قطعة' : 'pcs'}
                            </td>
                            <td className="p-3 text-end font-bold text-slate-900 dark:text-white">
                              {Number(ord.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </td>
                            <td className="p-3 text-center font-sans">
                              <Badge
                                variant={
                                  ord.payment_status === 'paid'
                                    ? 'success'
                                    : ord.payment_status === 'partially_paid'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {ord.payment_status === 'paid'
                                  ? (isAr ? 'مسدد' : 'Paid')
                                  : ord.payment_status === 'partially_paid'
                                  ? (isAr ? 'جزئي' : 'Partial')
                                  : (isAr ? 'آجل' : 'Unpaid')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-sans">
                              <Badge
                                variant={
                                  ord.status === 'fulfilled'
                                    ? 'success'
                                    : ord.status === 'cancelled'
                                    ? 'danger'
                                    : 'neutral'
                                }
                              >
                                {ord.status === 'fulfilled'
                                  ? (isAr ? '🚚 تم الصرف والفوترة' : 'Fulfilled')
                                  : (isAr ? 'قيد المعالجة' : 'Processing')}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: RETURNS & CREDIT NOTES */}
          {activeTab === 'returns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'سجل مرتجعات المبيعات وإشعارات الدائن' : 'Sales Returns & Credit Notes'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'البضائع المرتجعة للمخازن والإشعارات الدائنة المخصومة من حساب العميل.' : 'Credited sales returns and inventory restocks.'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xs">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم المرتجع' : 'Return #'}</th>
                      <th className="p-3 text-start">{isAr ? 'الفاتورة الأصلية' : 'Original Invoice'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ المرتجع' : 'Date'}</th>
                      <th className="p-3 text-start">{isAr ? 'المخزن المستلم' : 'Restock WH'}</th>
                      <th className="p-3 text-end">{isAr ? 'قيمة المرتجع' : 'Value'}</th>
                      <th className="p-3 text-center">{isAr ? 'التسوية المالية' : 'Settlement'}</th>
                      <th className="p-3 text-center">{isAr ? 'حالة المخزن' : 'Restock Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                    {customerReturns.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 font-sans text-xs">
                          {isAr ? 'لا توجد مرتجعات مسجلة لهذا العميل' : 'No sales returns found'}
                        </td>
                      </tr>
                    ) : (
                      customerReturns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{ret.return_number}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {ret.salesInvoice?.invoice_number || (ret as any).sales_invoice?.invoice_number || '—'}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatCleanDate(ret.return_date || ret.created_at)}</td>
                          <td className="p-3 font-sans text-slate-700 dark:text-slate-300">
                            {(ret as any).warehouse?.name || (isAr ? 'المخزن الرئيسي' : 'Main WH')}
                          </td>
                          <td className="p-3 text-end font-bold text-amber-600 dark:text-amber-400 font-mono text-xs">
                            -{Number(ret.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="p-3 text-center font-sans">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[10px] font-bold">
                              {ret.refund_status === 'refunded'
                                ? (isAr ? '💵 استرداد نقدي' : 'Cash Refund')
                                : (isAr ? '🏷️ إشعار دائن (خصم مديونية)' : 'Credit Note')}
                            </span>
                          </td>
                          <td className="p-3 text-center font-sans">
                            <Badge variant={(ret as any).restock_status === 'restocked' ? 'success' : 'neutral'}>
                              {(ret as any).restock_status === 'restocked' ? (isAr ? 'تم إعادة الإدخال' : 'Restocked') : (isAr ? 'معلق' : 'Pending')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: DELIVERY NOTES */}
          {activeTab === 'deliveries' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'أذون التسليم وبوالص الشحن الخاصة بالعميل' : 'Delivery Notes & Waybills'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isAr ? 'متابعة الشحنات وأرقام التتبع ومسؤوليات الاستلام.' : 'Track consignments, couriers, and tracking numbers.'}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c121e] shadow-2xs">
                <table className="w-full text-start text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم الإذن' : 'DN #'}</th>
                      <th className="p-3 text-start">{isAr ? 'رقم أمر البيع' : 'SO #'}</th>
                      <th className="p-3 text-start">{isAr ? 'شركة الشحن' : 'Carrier'}</th>
                      <th className="p-3 text-start">{isAr ? 'رقم التتبع' : 'Tracking #'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ التسليم' : 'Date'}</th>
                      <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                    {customerDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-sans text-xs">
                          {isAr ? 'لا توجد أذون شحن مسجلة لهذا العميل' : 'No delivery notes found'}
                        </td>
                      </tr>
                    ) : (
                      customerDeliveries.map((dn) => (
                        <tr key={dn.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{dn.delivery_number}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300">
                            {dn.sales_order?.order_number || (dn as any).salesOrder?.order_number || '—'}
                          </td>
                          <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{dn.shipping_carrier || '—'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{dn.tracking_number || '—'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">{formatCleanDate(dn.delivery_date || dn.created_at)}</td>
                          <td className="p-3 text-center font-sans">
                            <Badge
                              variant={
                                dn.status === 'delivered'
                                  ? 'success'
                                  : dn.status === 'dispatched'
                                  ? 'info'
                                  : 'neutral'
                              }
                            >
                              {dn.status === 'delivered'
                                ? (isAr ? 'تم التسليم' : 'Delivered')
                                : dn.status === 'dispatched'
                                ? (isAr ? 'في الطريق' : 'In Transit')
                                : (isAr ? 'قيد التجهيز' : 'Preparing')}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: PROFILE INFO & TERMS */}
          {activeTab === 'terms' && (
            <div className="bg-white dark:bg-[#0c121e] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {isAr ? 'البيانات التجارية والقانونية للعميل' : 'Commercial & Legal Information'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'السجل التجاري، الرقم الضريبي، شروط الائتمان والدفعات.' : 'Tax ID, Commercial Registration, and credit terms.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditCustomer(customer)}
                  icon={<Pencil className="w-3.5 h-3.5" />}
                >
                  {isAr ? 'تعديل البيانات' : 'Edit Profile'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'اسم العميل / المؤسسة:' : 'Customer Name:'}</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'كود العميل بالنظام:' : 'Customer Code:'}</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{customer.code}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'تصنيف النشاط:' : 'Classification:'}</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {isWholesale ? (isAr ? 'عميل جملة / توكيلات تجارية' : 'Wholesale') : (isAr ? 'عميل تجزئة ومعارض' : 'Retail')}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'مسؤول الاتصال:' : 'Contact Person:'}</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{customer.contact_person || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'رقم الهاتف المباشر:' : 'Phone Number:'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{customer.phone || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                  <p className="font-mono text-slate-800 dark:text-slate-200">{customer.email || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'الرقم الضريبي (Tax ID):' : 'Tax ID:'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{customer.tax_id || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'السجل التجاري (Commercial Reg):' : 'Commercial Reg:'}</span>
                  <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{customer.commercial_registry || '—'}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'الحد الائتماني المسموح به:' : 'Credit Limit:'}</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">
                    {creditLimit > 0 ? `${creditLimit.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : (isAr ? 'غير محدد' : 'Unlimited')}
                  </p>
                </div>

                <div className="md:col-span-3 space-y-1">
                  <span className="text-slate-400 block text-[11px]">{isAr ? 'عنوان الشحن والتسليم المعتمد:' : 'Delivery Address:'}</span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                    {customer.delivery_address || customer.address || (isAr ? 'تسليم باب المصنع / المعرض الرئيسي' : 'Ex-Factory Delivery')}
                  </p>
                </div>

                {customer.notes && (
                  <div className="md:col-span-3 space-y-1">
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'ملاحظات إضافية وشروط التعاقد:' : 'Notes:'}</span>
                    <p className="text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-[#111927] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{isAr ? 'ملف تجاري معتمد ومربوط آلياً بدفاتر الحسابات' : 'Verified commercial dossier with automated ledger sync'}</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            {isAr ? 'إغلاق الملف' : 'Close'}
          </Button>
        </div>

      </div>

      {/* EMBEDDED QUICK PAYMENT MODAL INSIDE DOSSIER */}
      {isQuickPayOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#111927] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-900 dark:text-white">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <h3 className="font-bold text-sm">
                  {isAr ? `تحصيل دفعة • ${customer.name}` : `Record Payment • ${customer.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickPayOpen(false)}
                className="p-1 rounded-lg hover:bg-emerald-700 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickPaySubmit} className="p-5 space-y-4 text-xs">
              {quickPaySuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">{quickPaySuccess}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'المبلغ المحصل (ج.م) *' : 'Amount (EGP) *'}
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={quickPayAmount || ''}
                      onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'طريقة التحصيل المعتمدة *' : 'Payment Method *'}
                    </label>
                    <select
                      value={quickPayMethod}
                      onChange={(e) => setQuickPayMethod(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium"
                    >
                      <option value="cash">{isAr ? '💵 نقدي (خزينة المصنع)' : 'Cash'}</option>
                      <option value="card">{isAr ? '💳 بطاقة بنكية / فيزا (POS)' : 'Card / POS'}</option>
                      <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي معتمد' : 'Bank Transfer'}</option>
                      <option value="wallet">{isAr ? '📱 محفظة إلكترونية (فودافون كاش / إنستاباي)' : 'E-Wallet'}</option>
                      <option value="check">{isAr ? '📝 شيك مصرفي' : 'Check'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'تخصيص لفاتورة محددة (اختياري)' : 'Allocate to Invoice'}
                    </label>
                    <select
                      value={quickPayInvoiceId}
                      onChange={(e) => setQuickPayInvoiceId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    >
                      <option value="">{isAr ? '— تسوية تلقائية بأقدم الفواتير (FIFO) —' : '— Auto FIFO Allocation —'}</option>
                      {customerInvoices
                        .filter((inv) => inv.status !== 'void' && inv.status !== 'paid')
                        .map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} - {isAr ? 'المتبقي:' : 'Due:'} {Number(inv.balance_due ?? inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'ملاحظات وسند الإيداع' : 'Notes / Reference'}
                    </label>
                    <input
                      type="text"
                      value={quickPayNotes}
                      onChange={(e) => setQuickPayNotes(e.target.value)}
                      placeholder={isAr ? 'رقم الإيصال أو مرجع الدفعة...' : 'Receipt # or reference...'}
                      className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsQuickPayOpen(false)}
                    >
                      {isAr ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingQuickPay}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      {isSubmittingQuickPay ? (isAr ? 'جاري التسجيل...' : 'Recording...') : (isAr ? 'تأكيد وقيد التحصيل' : 'Confirm')}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

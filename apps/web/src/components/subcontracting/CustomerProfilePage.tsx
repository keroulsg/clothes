import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Building,
  User,
  Phone,
  CreditCard,
  DollarSign,
  Scissors,
  Boxes,
  Truck,
  Receipt,
  Printer,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Save,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { SubcontractPrintType } from './SubcontractPrintModal';

export interface CustomerProfilePageProps {
  customerId: string;
  onBack: () => void;
  onOpenCreateJob?: (customerId: string) => void;
  onOpenReceiveMaterial?: (customerId: string) => void;
  onPrintDocument?: (type: SubcontractPrintType, item: any) => void;
  onCustomerUpdated?: () => void;
  isAr?: boolean;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({
  customerId,
  onBack,
  onOpenCreateJob,
  onOpenReceiveMaterial,
  onPrintDocument,
  onCustomerUpdated,
  isAr = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'terms' | 'jobs' | 'invoices' | 'materials' | 'deliveries'>('terms');

  // Payment terms form state
  const [paymentTerms, setPaymentTerms] = useState<'cash' | 'installments'>('cash');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [termsNotes, setTermsNotes] = useState<string>('');
  const [isSavingTerms, setIsSavingTerms] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchCustomerDossier = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.subcontracting.getCustomerDossier(customerId);
      if (res?.success && res.data) {
        setData(res.data);
        const cust = res.data.customer;
        setPaymentTerms(cust.payment_terms === 'installments' ? 'installments' : 'cash');
        setCreditLimit(Number(cust.credit_limit || 0));
        setTermsNotes(cust.notes || '');
      } else {
        setError(isAr ? 'تعذر جلب بيانات ملف العميل.' : 'Failed to fetch customer profile.');
      }
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء تحميل البيانات.' : 'Error loading customer data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDossier();
  }, [customerId]);

  const handleSaveTerms = async () => {
    if (!customerId) return;
    setIsSavingTerms(true);
    setSaveSuccess(false);
    try {
      await api.subcontracting.updateCustomer(customerId, {
        payment_terms: paymentTerms,
        credit_limit: creditLimit,
        notes: termsNotes,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onCustomerUpdated?.();
      fetchCustomerDossier();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حفظ نظام السداد' : 'Failed to update payment terms'));
    } finally {
      setIsSavingTerms(false);
    }
  };

  const handleOpenPayment = (inv: any) => {
    const remaining = Math.max(0, Number(inv.total_amount || 0) - Number(inv.paid_amount || 0));
    setSelectedInvoice(inv);
    setPayAmount(remaining.toString());
    setPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const amountNum = parseFloat(payAmount);
    if (!amountNum || amountNum <= 0) {
      alert(isAr ? 'يرجى إدخال مبلغ سداد صحيح.' : 'Please enter a valid payment amount.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await api.subcontracting.recordPayment(selectedInvoice.id, {
        amount: amountNum,
        payment_method: payMethod,
      });
      setPaymentModalOpen(false);
      setSelectedInvoice(null);
      fetchCustomerDossier();
      onCustomerUpdated?.();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تسجيل الدفعة' : 'Failed to record payment'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const customer = data?.customer;
  const metrics = data?.metrics || {};
  const jobOrders: any[] = customer?.job_orders || [];
  const invoices: any[] = customer?.invoices || [];
  const materials: any[] = customer?.customer_materials || [];
  const deliveries: any[] = customer?.delivery_notes || [];

  const remainingBalance = Number(metrics.remaining_balance || 0);

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#000000]/60 p-4 rounded-2xl border border-slate-200 dark:border-[#7F1625]/30 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-1.5 border-slate-300 dark:border-slate-700 hover:border-[#7F1625] dark:hover:border-[#7F1625] text-slate-700 dark:text-slate-200"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180 text-[#7F1625]" />
            <span className="font-bold">{isAr ? 'الرجوع للقائمة الرئيسية' : 'Back to Main Subcontracting'}</span>
          </Button>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'التشغيل والتصنيع للغير' : 'Subcontracting'}</span>
            <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-slate-400" />
            <span>{isAr ? 'بروفايل العميل الرقمي' : 'Customer Profile'}</span>
            <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-0 ltr:rotate-180 text-slate-400" />
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
              {customer?.name || (loading ? '...' : 'عميل')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchCustomerDossier}
            disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            {isAr ? 'تحديث البيانات' : 'Refresh'}
          </Button>

          {onOpenCreateJob && customer && (
            <Button
              size="sm"
              onClick={() => onOpenCreateJob(customer.id)}
              className="bg-[#7F1625] hover:bg-[#68121e] text-white border-none shadow-sm"
              icon={<Scissors className="w-3.5 h-3.5" />}
            >
              {isAr ? 'أمر قص وتشغيل جديد' : 'New Job Order'}
            </Button>
          )}

          {onOpenReceiveMaterial && customer && (
            <Button
              size="sm"
              variant="outline"
              className="text-[#7F1625] border-[#7F1625]/40 hover:bg-[#7F1625]/10"
              onClick={() => onOpenReceiveMaterial(customer.id)}
              icon={<Boxes className="w-3.5 h-3.5" />}
            >
              {isAr ? 'استلام أمانة خامات' : 'Receive Custody'}
            </Button>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="py-20 text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-[#7F1625] mx-auto mb-3" />
          <p className="text-slate-600 dark:text-slate-400 text-sm font-bold">
            {isAr ? 'جاري تحميل ملف العميل الشامل وسجل الحسابات...' : 'Loading customer profile...'}
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Main Hero Header Card */}
          <div className="bg-gradient-to-r from-slate-900 via-black to-[#7F1625]/90 text-white rounded-3xl p-6 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#7F1625]/20 rounded-full blur-3xl -z-0 pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center font-black text-2xl shadow-lg flex-shrink-0">
                  <Building className="w-8 h-8 text-rose-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-white tracking-tight">
                      {customer?.name}
                    </h1>
                    {customer?.code && (
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-white/15 text-rose-200 border border-white/20 font-bold">
                        {customer.code}
                      </span>
                    )}
                    <span className={`px-3 py-0.5 rounded-full text-xs font-black border ${
                      paymentTerms === 'cash'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    }`}>
                      {paymentTerms === 'cash'
                        ? (isAr ? '💵 نظام السداد: كاش فوري' : 'Cash System')
                        : (isAr ? '📑 نظام السداد: دفعات وأقساط مجدولة' : 'Installments System')}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 text-xs text-slate-300 mt-2 flex-wrap font-medium">
                    {customer?.contact_person && (
                      <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/10">
                        <User className="w-3.5 h-3.5 text-rose-300" />
                        <span>{customer.contact_person}</span>
                      </span>
                    )}
                    {customer?.phone && (
                      <span className="flex items-center gap-1.5 bg-black/30 px-3 py-1 rounded-lg border border-white/10 font-mono">
                        <Phone className="w-3.5 h-3.5 text-rose-300" />
                        <span>{customer.phone}</span>
                      </span>
                    )}
                    {customer?.tax_id && (
                      <span className="bg-black/30 px-3 py-1 rounded-lg border border-white/10 font-mono">
                        {isAr ? 'سجل تجاري / بطاقة ضريبية:' : 'Tax ID:'} {customer.tax_id}
                      </span>
                    )}
                    <span className="bg-emerald-950/60 text-emerald-300 px-3 py-1 rounded-lg border border-emerald-800/40 text-[11px] font-bold">
                      {isAr ? 'أمانات أقمشة العميل معزولة ومحمية' : 'Custody Isolated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Profile Summary Badge */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-6 text-center">
                <div>
                  <span className="text-[11px] text-slate-300 block">{isAr ? 'أوامر التشغيل' : 'Job Orders'}</span>
                  <span className="text-xl font-black font-mono text-white">{jobOrders.length}</span>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <span className="text-[11px] text-slate-300 block">{isAr ? 'سندات الأمانات' : 'Custody Receipts'}</span>
                  <span className="text-xl font-black font-mono text-rose-300">{materials.length}</span>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div>
                  <span className="text-[11px] text-slate-300 block">{isAr ? 'الفواتير' : 'Invoices'}</span>
                  <span className="text-xl font-black font-mono text-emerald-300">{invoices.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Bento Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#000000] p-5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isAr ? 'إجمالي فواتير الخدمات' : 'Total Invoiced'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
                {Number(metrics.total_invoiced || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 mr-1.5">ج.م</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {isAr ? `عن ${invoices.length} فاتورة خدمات وتشغيل` : `${invoices.length} Invoices`}
              </span>
            </div>

            <div className="bg-white dark:bg-[#000000] p-5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isAr ? 'المسدد فعلياً (دفعات وكاش)' : 'Total Paid'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {Number(metrics.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 mr-1.5">ج.م</span>
              </div>
              <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 block font-medium">
                {isAr ? 'تم استلامها في الخزينة والحسابات' : 'Received in treasury'}
              </span>
            </div>

            <div className="bg-white dark:bg-[#000000] p-5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isAr ? 'الرصيد المتبقي / المديونية' : 'Outstanding Balance'}
                </span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  remainingBalance > 0
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-[#7F1625] dark:text-rose-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                }`}>
                  <CreditCard className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black font-mono ${
                remainingBalance > 0
                  ? 'text-[#7F1625] dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-xs font-normal text-slate-400 mr-1.5">ج.م</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {remainingBalance > 0
                  ? (isAr ? 'مستحق السداد (أقساط أو دفعات معلقة)' : 'Due balance')
                  : (isAr ? 'الحساب خالص ومسدد بالكامل' : 'Zero balance / Cleared')}
              </span>
            </div>

            <div className="bg-white dark:bg-[#000000] p-5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {isAr ? 'رصيد أمانات الأقمشة الحالية' : 'Current Fabric Custody'}
                </span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                {Number(metrics.current_custody_meters || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                <span className="text-xs font-normal text-slate-400 mr-1.5">{isAr ? 'متر' : 'M'}</span>
              </div>
              <span className="text-[11px] text-sky-600/80 dark:text-sky-400/80 mt-1 block font-medium">
                {isAr ? 'معزولة بمخزن أمانات تشغيل الغير' : 'Stored in CMT isolation warehouse'}
              </span>
            </div>
          </div>

          {/* Internal Profile Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-1">
            {[
              { id: 'terms', label: isAr ? 'نظام السداد وشروط التعاقد' : 'Payment Terms & Credit', icon: DollarSign },
              { id: 'jobs', label: `${isAr ? 'أوامر التشغيل والقص' : 'Job Orders'} (${jobOrders.length})`, icon: Scissors },
              { id: 'invoices', label: `${isAr ? 'الفواتير والمدفوعات' : 'Invoices & Payments'} (${invoices.length})`, icon: Receipt },
              { id: 'materials', label: `${isAr ? 'سجل أمانات الأقمشة' : 'Fabric Custody'} (${materials.length})`, icon: Boxes },
              { id: 'deliveries', label: `${isAr ? 'أذون تسليم المنتج التام' : 'Delivery Notes'} (${deliveries.length})`, icon: Truck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 font-bold text-sm whitespace-nowrap rounded-t-xl transition-all border-b-2 ${
                    isActive
                      ? 'border-[#7F1625] text-[#7F1625] dark:text-rose-400 bg-rose-50/50 dark:bg-[#7F1625]/10'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Payment Terms & Installment System */}
          {activeTab === 'terms' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#7F1625]" />
                    <span>{isAr ? 'نظام المحاسبة والشروط المالية المعتمدة للعميل' : 'Customer Payment Terms & Credit Agreement'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isAr
                      ? 'حدد طريقة المحاسبة المعتمدة مع هذا العميل: هل يتم السداد نقداً وفورياً أم يتم التعامل بنظام الدفعات والأقساط المجدولة وحد الائتمان.'
                      : 'Define approved payment arrangements for this customer (Cash vs Installments & credit limits).'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {isAr ? 'نظام السداد الأساسي:' : 'Payment Terms Policy:'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          paymentTerms === 'cash'
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_terms_radio"
                          value="cash"
                          checked={paymentTerms === 'cash'}
                          onChange={() => setPaymentTerms('cash')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="block font-black text-sm text-slate-900 dark:text-slate-100">
                            {isAr ? '💵 نقدي فوري (Cash on Delivery)' : 'Cash / Immediate'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {isAr ? 'السداد الفوري عند إصدار إذن التسليم أو الفاتورة.' : 'Immediate payment upon invoice.'}
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          paymentTerms === 'installments'
                            ? 'border-[#7F1625] bg-rose-50/40 dark:bg-[#7F1625]/15'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_terms_radio"
                          value="installments"
                          checked={paymentTerms === 'installments'}
                          onChange={() => setPaymentTerms('installments')}
                          className="mt-1 text-[#7F1625] focus:ring-[#7F1625]"
                        />
                        <div>
                          <span className="block font-black text-sm text-slate-900 dark:text-slate-100">
                            {isAr ? '📑 دفعات وأقساط مجدولة (Installments & Credit)' : 'Installments System'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {isAr ? 'دفعات مرحلية (عربون، دفعة تشغيل، دفعة عند الاستلام، ومؤجل).' : 'Scheduled milestone installments.'}
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'الحد الائتماني الأقصى المسموح به (ج.م):' : 'Credit Limit (EGP):'}
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                      className="w-full sm:w-64 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-[#7F1625] focus:ring-1 focus:ring-[#7F1625]"
                      placeholder="0.00"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isAr
                        ? 'في حال تجاوز المديونية هذا المبلغ، يتم تنبيه المشرف قبل اعتماد أوامر تسليم جديدة.'
                        : 'Alerts manager if customer debt exceeds this limit.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'شروط السداد والملاحظات التعاقدية:' : 'Terms Notes:'}
                    </label>
                    <textarea
                      rows={3}
                      value={termsNotes}
                      onChange={(e) => setTermsNotes(e.target.value)}
                      placeholder={isAr ? 'مثال: 30% دفعة مقدمة مع استلام القماش، 40% عند الخياطة، 30% خلال 15 يوم من التسليم النهائي...' : 'Add contractual terms...'}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-slate-100 focus:border-[#7F1625] focus:ring-1 focus:ring-[#7F1625]"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={handleSaveTerms}
                      disabled={isSavingTerms}
                      className="bg-[#7F1625] hover:bg-[#68121e] text-white border-none shadow-sm"
                      icon={saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
                    >
                      {saveSuccess
                        ? (isAr ? 'تم حفظ التعديلات بنجاح!' : 'Saved Successfully!')
                        : (isAr ? 'حفظ الشروط المالية للعميل' : 'Save Payment Terms')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Side Financial Health & Account Summary */}
              <div className="bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  {isAr ? 'ملخص الوضع المالي للعميل' : 'Financial Status Summary'}
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-slate-500">{isAr ? 'المديونية الحالية:' : 'Current Balance:'}</span>
                    <span className={`font-black font-mono text-sm ${remainingBalance > 0 ? 'text-[#7F1625] dark:text-rose-400' : 'text-emerald-600'}`}>
                      {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-slate-500">{isAr ? 'الحد الائتماني المعتمد:' : 'Credit Limit:'}</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                      {creditLimit > 0 ? `${creditLimit.toLocaleString()} ج.م` : (isAr ? 'غير محدد' : 'No Limit')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-850">
                    <span className="text-slate-500">{isAr ? 'نسبة السداد التراكمية:' : 'Payment Rate:'}</span>
                    <span className="font-bold font-mono text-emerald-600">
                      {metrics.total_invoiced > 0
                        ? `${Math.min(100, Math.round((metrics.total_paid / metrics.total_invoiced) * 100))}%`
                        : '100%'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">{isAr ? 'حالة حساب العميل:' : 'Account Health:'}</span>
                    <Badge variant={remainingBalance > (creditLimit || 0) && creditLimit > 0 ? 'danger' : remainingBalance > 0 ? 'warning' : 'success'}>
                      {remainingBalance > (creditLimit || 0) && creditLimit > 0
                        ? (isAr ? 'تجاوز حد الائتمان' : 'Limit Exceeded')
                        : remainingBalance > 0
                        ? (isAr ? 'ساري مع متبقي' : 'Active Balance')
                        : (isAr ? 'ممتاز ومسدد' : 'Healthy / Cleared')}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 leading-relaxed">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'سياسة عزل أمانات خامات العملاء:' : 'Custody Protection Guarantee:'}
                  </span>
                  {isAr
                    ? 'جميع الأقمشة والخامات المودعة من هذا العميل تظل أمانة معزولة ومخصصة فقط لأوامر تشغيله، ولا تدخل ضمن أصول أو مخزون الشركة المتاح للبيع.'
                    : 'Customer materials remain strictly isolated and protected.'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Job Orders */}
          {activeTab === 'jobs' && (
            <div className="bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {isAr ? 'أوامر التشغيل والقص المنفذة للعميل' : 'Customer Job Orders'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'متابعة مراحل القص، والتصنيع الكامل CMT، ونسب التسليم.' : 'Track orders, cutting, and deliveries.'}
                  </p>
                </div>
                {onOpenCreateJob && (
                  <Button
                    size="sm"
                    onClick={() => onOpenCreateJob(customer.id)}
                    className="bg-[#7F1625] hover:bg-[#68121e] text-white border-none"
                    icon={<Scissors className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'أمر جديد' : 'New Job'}
                  </Button>
                )}
              </div>

              {jobOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {isAr ? 'لا توجد أوامر تشغيل مسجلة لهذا العميل حتى الآن.' : 'No job orders recorded for this customer yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                        <th className="p-3">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                        <th className="p-3">{isAr ? 'الخدمة / الموديل' : 'Service / Model'}</th>
                        <th className="p-3">{isAr ? 'المطلوب' : 'Target Qty'}</th>
                        <th className="p-3">{isAr ? 'المسلم' : 'Delivered'}</th>
                        <th className="p-3">{isAr ? 'سعر الوحدة' : 'Unit Rate'}</th>
                        <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isAr ? 'إجراء' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {jobOrders.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">
                            {job.order_number}
                          </td>
                          <td className="p-3">
                            <span className="font-bold block text-slate-800 dark:text-slate-200">{job.model_name || '—'}</span>
                            <span className="text-[10px] text-slate-400">
                              {job.service_type === 'contract_cutting' ? (isAr ? 'قص فقط' : 'Cutting only') : (isAr ? 'تصنيع كامل CMT' : 'Full CMT')}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold">{job.target_quantity} {isAr ? 'قطعة' : 'Pcs'}</td>
                          <td className="p-3 font-mono text-emerald-600 font-bold">{job.delivered_quantity || 0}</td>
                          <td className="p-3 font-mono">{Number(job.unit_price || 0).toFixed(2)} ج.م</td>
                          <td className="p-3">
                            <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'warning' : 'neutral'}>
                              {job.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') :
                               job.status === 'in_progress' ? (isAr ? 'قيد التنفيذ' : 'In Progress') :
                               job.status === 'confirmed' ? (isAr ? 'معتمد' : 'Confirmed') : (isAr ? 'مسودة' : 'Draft')}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {onPrintDocument && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPrintDocument('job', job)}
                                icon={<Printer className="w-3.5 h-3.5" />}
                              >
                                {isAr ? 'طباعة' : 'Print'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Invoices & Statements */}
          {activeTab === 'invoices' && (
            <div className="bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {isAr ? 'فواتير الخدمات وكشف حساب العميل' : 'Invoices & Payments Statement'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'تسديد الدفعات والأقساط ومطابقة الأرصدة.' : 'Record installment payments and invoice details.'}
                  </p>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {isAr ? 'لا توجد فواتير خدمات صادرة لهذا العميل.' : 'No invoices issued for this customer.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                        <th className="p-3">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                        <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3">{isAr ? 'الإجمالي' : 'Total'}</th>
                        <th className="p-3">{isAr ? 'المسدد' : 'Paid'}</th>
                        <th className="p-3">{isAr ? 'المتبقي' : 'Remaining'}</th>
                        <th className="p-3">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {invoices.map((inv) => {
                        const total = Number(inv.total_amount || 0);
                        const paid = Number(inv.paid_amount || 0);
                        const rem = Math.max(0, total - paid);
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                            <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">
                              {inv.invoice_number}
                            </td>
                            <td className="p-3 text-slate-500 font-mono">
                              {String(inv.created_at || '').split('T')[0]}
                            </td>
                            <td className="p-3 font-mono font-bold">{total.toFixed(2)} ج.م</td>
                            <td className="p-3 font-mono text-emerald-600 font-bold">{paid.toFixed(2)} ج.م</td>
                            <td className={`p-3 font-mono font-black ${rem > 0 ? 'text-[#7F1625] dark:text-rose-400' : 'text-emerald-600'}`}>
                              {rem.toFixed(2)} ج.م
                            </td>
                            <td className="p-3">
                              <Badge variant={rem === 0 ? 'success' : paid > 0 ? 'warning' : 'danger'}>
                                {rem === 0 ? (isAr ? 'مسددة بالكامل' : 'Paid') : paid > 0 ? (isAr ? 'سداد جزئي' : 'Partial') : (isAr ? 'مستحقة' : 'Unpaid')}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {rem > 0 && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenPayment(inv)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-7 px-2.5"
                                  >
                                    {isAr ? 'تسديد دفعة' : 'Pay Now'}
                                  </Button>
                                )}
                                {onPrintDocument && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onPrintDocument('invoice', inv)}
                                    icon={<Printer className="w-3.5 h-3.5" />}
                                    className="h-7 px-2 text-slate-600"
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Customer Fabric Custody */}
          {activeTab === 'materials' && (
            <div className="bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-sky-600" />
                    <span>{isAr ? 'سجل أمانات خامات وأقمشة العميل بالمستودع' : 'Customer Fabric Custody Receipts'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'حصر معزول ومحمي لجميع الأثواب والأمتار المستلمة لحساب العميل.' : 'Isolated stock custody records.'}
                  </p>
                </div>
                {onOpenReceiveMaterial && (
                  <Button
                    size="sm"
                    onClick={() => onOpenReceiveMaterial(customer.id)}
                    className="bg-[#7F1625] hover:bg-[#68121e] text-white border-none"
                    icon={<Boxes className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'إيداع أمانة جديدة' : 'New Receipt'}
                  </Button>
                )}
              </div>

              {materials.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {isAr ? 'لا توجد أمانات أقمشة مسجلة لهذا العميل.' : 'No fabric custody receipts found.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                        <th className="p-3">{isAr ? 'رقم الإذن' : 'Receipt #'}</th>
                        <th className="p-3">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="p-3">{isAr ? 'نوع وخامة القماش' : 'Fabric Type'}</th>
                        <th className="p-3">{isAr ? 'اللون' : 'Color'}</th>
                        <th className="p-3">{isAr ? 'الكمية المستلمة' : 'Qty Received'}</th>
                        <th className="p-3">{isAr ? 'المستودع' : 'Warehouse'}</th>
                        <th className="p-3 text-center">{isAr ? 'إجراء' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {materials.map((mat) => (
                        <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">
                            {mat.receipt_number}
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            {String(mat.receipt_date || mat.created_at || '').split('T')[0]}
                          </td>
                          <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{mat.fabric_type || '—'}</td>
                          <td className="p-3">{mat.color || '—'}</td>
                          <td className="p-3 font-mono font-black text-sky-600">
                            {Number(mat.quantity_received || 0).toFixed(1)} {mat.unit || (isAr ? 'متر' : 'M')}
                          </td>
                          <td className="p-3 text-slate-500">{mat.warehouse?.name || (isAr ? 'مخزن أمانات الغير' : 'CMT Custody')}</td>
                          <td className="p-3 text-center">
                            {onPrintDocument && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPrintDocument('receipt', mat)}
                                icon={<Printer className="w-3.5 h-3.5" />}
                              >
                                {isAr ? 'إذن استلام' : 'Print'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Finished Goods Delivery Notes */}
          {activeTab === 'deliveries' && (
            <div className="bg-white dark:bg-[#000000] p-6 rounded-2xl border border-slate-200 dark:border-[#7F1625]/40 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    <span>{isAr ? 'أذون تسليم المنتج التام للعميل' : 'Customer Finished Goods Delivery Notes'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isAr ? 'سجل القطع المسلمة ومندوبي الاستلام والتواقيع.' : 'Delivered goods tracking.'}
                  </p>
                </div>
              </div>

              {deliveries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  {isAr ? 'لا توجد أذون تسليم منتجات تامة مسجلة لهذا العميل.' : 'No delivery notes found.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400">
                        <th className="p-3">{isAr ? 'رقم الإذن' : 'Delivery #'}</th>
                        <th className="p-3">{isAr ? 'تاريخ التسليم' : 'Date'}</th>
                        <th className="p-3">{isAr ? 'الكمية المسلمة' : 'Qty Delivered'}</th>
                        <th className="p-3">{isAr ? 'المستلم' : 'Recipient'}</th>
                        <th className="p-3 text-center">{isAr ? 'إجراء' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                      {deliveries.map((del) => (
                        <tr key={del.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="p-3 font-mono font-black text-slate-900 dark:text-slate-100">
                            {del.delivery_number}
                          </td>
                          <td className="p-3 text-slate-500 font-mono">
                            {String(del.delivery_date || del.created_at || '').split('T')[0]}
                          </td>
                          <td className="p-3 font-mono font-black text-emerald-600">
                            {del.delivered_quantity || 0} {isAr ? 'قطعة' : 'Pcs'}
                          </td>
                          <td className="p-3">{del.received_by_name || '—'}</td>
                          <td className="p-3 text-center">
                            {onPrintDocument && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onPrintDocument('delivery', del)}
                                icon={<Printer className="w-3.5 h-3.5" />}
                              >
                                {isAr ? 'إذن تسليم' : 'Print'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Quick Installment Payment Modal */}
      {paymentModalOpen && selectedInvoice && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title={isAr ? `تسجيل دفعة للفاتورة ${selectedInvoice.invoice_number}` : `Pay Invoice ${selectedInvoice.invoice_number}`}
          isAr={isAr}
        >
          <form onSubmit={handleSubmitPayment} className="p-5 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex justify-between">
              <div>
                <span className="text-slate-500 block">{isAr ? 'إجمالي الفاتورة:' : 'Invoice Total:'}</span>
                <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                  {Number(selectedInvoice.total_amount || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'المسدد سابقاً:' : 'Paid So Far:'}</span>
                <span className="font-bold font-mono text-emerald-600">
                  {Number(selectedInvoice.paid_amount || 0).toFixed(2)} ج.م
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'المتبقي:' : 'Remaining:'}</span>
                <span className="font-black font-mono text-[#7F1625] dark:text-rose-400">
                  {Math.max(0, Number(selectedInvoice.total_amount || 0) - Number(selectedInvoice.paid_amount || 0)).toFixed(2)} ج.م
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مبلغ الدفعة الحالية (ج.م):' : 'Payment Amount (EGP):'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:border-[#7F1625]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة السداد:' : 'Payment Method:'}
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                <option value="cash">{isAr ? 'نقداً (الخزينة الرئيسية)' : 'Cash'}</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي / فودافون كاش / إنستاباي' : 'Bank Transfer / InstaPay'}</option>
                <option value="check">{isAr ? 'شيك بنكي' : 'Check'}</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" size="sm" variant="outline" onClick={() => setPaymentModalOpen(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSubmittingPayment ? (isAr ? 'جاري التسجيل...' : 'Saving...') : (isAr ? 'تأكيد وقيد الدفعة' : 'Confirm Payment')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
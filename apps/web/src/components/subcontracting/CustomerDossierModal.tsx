import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Building,
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
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { api } from '../../api/client';
import type { SubcontractPrintType } from './SubcontractPrintModal';

export interface CustomerDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  onOpenCreateJob?: (customerId: string) => void;
  onOpenReceiveMaterial?: (customerId: string) => void;
  onPrintDocument?: (type: SubcontractPrintType, item: any) => void;
  onCustomerUpdated?: () => void;
  isAr?: boolean;
}

export const CustomerDossierModal: React.FC<CustomerDossierModalProps> = ({
  isOpen,
  onClose,
  customerId,
  onOpenCreateJob,
  onOpenReceiveMaterial,
  onPrintDocument,
  onCustomerUpdated,
  isAr = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'invoices' | 'materials' | 'deliveries'>('overview');

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
        setError(isAr ? 'تعذر جلب ملف العميل.' : 'Failed to fetch customer profile.');
      }
    } catch (err: any) {
      setError(err?.message || (isAr ? 'حدث خطأ أثناء تحميل البيانات.' : 'Error loading customer data.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerDossier();
    } else {
      setData(null);
      setError(null);
      setActiveTab('overview');
    }
  }, [isOpen, customerId]);

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

  if (!isOpen) return null;

  const customer = data?.customer;
  const metrics = data?.metrics || {};
  const jobOrders: any[] = customer?.job_orders || [];
  const invoices: any[] = customer?.invoices || [];
  const materials: any[] = customer?.customer_materials || [];
  const deliveries: any[] = customer?.delivery_notes || [];

  const remainingBalance = Number(metrics.remaining_balance || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={customer?.name || (isAr ? 'بروفايل العميل' : 'Customer Profile')}
      isAr={isAr}
    >
      <div className="p-4 sm:p-6 space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg shadow-sm">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {customer?.name || (isAr ? 'بروفايل العميل' : 'Customer Profile')}
                </h2>
                {customer?.code && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    {customer.code}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                  paymentTerms === 'cash'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                }`}>
                  {paymentTerms === 'cash' ? (isAr ? '💵 نظام السداد: كاش فوري' : 'Cash System') : (isAr ? '📑 نظام السداد: دفعات وأقساط' : 'Installments System')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                {customer?.contact_person && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.contact_person}</span>
                  </span>
                )}
                {customer?.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{customer.phone}</span>
                  </span>
                )}
                {customer?.tax_id && (
                  <span className="font-mono">
                    {isAr ? 'سجل ضريبي:' : 'Tax ID:'} {customer.tax_id}
                  </span>
                )}
              </div>
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
              {isAr ? 'تحديث' : 'Refresh'}
            </Button>
            {onOpenCreateJob && customerId && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenCreateJob(customerId);
                }}
                icon={<Scissors className="w-3.5 h-3.5" />}
              >
                {isAr ? 'أمر قص جديد' : 'New Cut Job'}
              </Button>
            )}
            {onOpenReceiveMaterial && customerId && (
              <Button
                size="sm"
                variant="outline"
                className="text-sky-600 border-sky-300 hover:bg-sky-50"
                onClick={() => {
                  onClose();
                  onOpenReceiveMaterial(customerId);
                }}
                icon={<Boxes className="w-3.5 h-3.5" />}
              >
                {isAr ? 'استلام أمانة خامات' : 'Intake Custody Fabric'}
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5 Financial & Production Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: Jobs Count */}
          <Card className="p-3 bg-gradient-to-br from-indigo-50/50 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>{isAr ? 'أوامر القص والتشغيل' : 'Cut & CMT Jobs'}</span>
              <Scissors className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
              {metrics.total_jobs ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {metrics.total_cut_pieces ?? 0} {isAr ? 'قطعة مقصوصة' : 'pcs cut'}
            </span>
          </Card>

          {/* Card 2: Total Target & Delivered */}
          <Card className="p-3 bg-gradient-to-br from-blue-50/50 via-white to-transparent dark:from-blue-950/20 dark:via-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>{isAr ? 'المطلوب والمسلم' : 'Target & Delivered'}</span>
              <Truck className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="mt-1 text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
              {metrics.total_delivered_pieces ?? 0}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {isAr ? 'من أصل' : 'of'} {metrics.total_target_pieces ?? 0} {isAr ? 'قطعة مطلوبة' : 'target'}
            </span>
          </Card>

          {/* Card 3: Invoiced Contract Value */}
          <Card className="p-3 bg-gradient-to-br from-amber-50/50 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>{isAr ? 'إجمالي المفوتر' : 'Total Invoiced'}</span>
              <Receipt className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="mt-1 text-xl font-black font-mono text-slate-900 dark:text-slate-100">
              {Number(metrics.total_invoiced_amount || 0).toLocaleString()} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {invoices.length} {isAr ? 'فواتير محررة' : 'invoices issued'}
            </span>
          </Card>

          {/* Card 4: Paid Amount */}
          <Card className="p-3 bg-gradient-to-br from-emerald-50/50 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-900 border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>{isAr ? 'المسدد فعلياً' : 'Total Paid'}</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {Number(metrics.total_paid_amount || 0).toLocaleString()} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <span className="text-[10px] text-emerald-600/80 mt-0.5 block">
              {isAr ? 'دفعات مسواة' : 'cleared tranches'}
            </span>
          </Card>

          {/* Card 5: Remaining Balance */}
          <Card className={`p-3 border-slate-200 dark:border-slate-800 ${
            remainingBalance > 0
              ? 'bg-gradient-to-br from-rose-50/70 via-white to-transparent dark:from-rose-950/30'
              : 'bg-gradient-to-br from-emerald-50/50 via-white to-transparent dark:from-emerald-950/20'
          }`}>
            <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
              <span>{isAr ? 'الرصيد المتبقي' : 'Outstanding Balance'}</span>
              <DollarSign className={`w-3.5 h-3.5 ${remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <div className={`mt-1 text-xl font-black font-mono ${remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {remainingBalance.toLocaleString()} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {remainingBalance > 0 ? (isAr ? 'مستحق على العميل' : 'due from client') : (isAr ? 'حساب متوازن وسليم' : 'fully cleared')}
            </span>
          </Card>
        </div>

        {/* Payment Terms & Contract Configuration Box */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>{isAr ? 'نظام السداد والتعاقد المعتمد للعميل (Cash vs Installments)' : 'Client Payment & Terms Setup'}</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'حدد ما إذا كان العميل يتعامل بنظام الدفع الفوري (كاش مع كل عملية) أو على دفعات وأقساط مجدولة' : 'Configure whether client pays cash per job or via installment tranches'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {isAr ? 'تم الحفظ بنجاح' : 'Saved'}
                </span>
              )}
              <Button
                size="sm"
                onClick={handleSaveTerms}
                disabled={isSavingTerms}
                icon={<Save className="w-3.5 h-3.5" />}
              >
                {isSavingTerms ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ نظام السداد' : 'Save Terms')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* System Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'نظام الدفع المالي:' : 'Payment Terms:'}
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setPaymentTerms('cash')}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
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
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    paymentTerms === 'installments'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {isAr ? '📑 دفعات وأقساط' : 'Installments'}
                </button>
              </div>
            </div>

            {/* Credit Limit */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'الحد الائتماني المسموح به (ج.م):' : 'Credit Limit (EGP):'}
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {isAr ? 'شروط السداد والملاحظات:' : 'Terms Notes:'}
              </label>
              <input
                type="text"
                value={termsNotes}
                onChange={(e) => setTermsNotes(e.target.value)}
                placeholder={isAr ? 'مثال: سداد 50% مقدم و50% عند الاستلام...' : 'e.g., 50% deposit, 50% upon delivery...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{isAr ? 'نظرة عامة' : 'Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'jobs'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>{isAr ? `أوامر القص والتشغيل (${jobOrders.length})` : `Cut & CMT Jobs (${jobOrders.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isAr ? `الفواتير والدفعات (${invoices.length})` : `Invoices & Tranches (${invoices.length})`}</span>
            {remainingBalance > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'materials'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>{isAr ? `أمانات الأقمشة (${materials.length})` : `Fabric Custody (${materials.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deliveries')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'deliveries'
                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{isAr ? `أذون التسليم (${deliveries.length})` : `Deliveries (${deliveries.length})`}</span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Custody summary */}
            <Card className="p-4 space-y-3 border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-sky-600" />
                <span>{isAr ? 'ملخص عهد وأمانات الأقمشة' : 'Fabric Custody Status'}</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{isAr ? 'إجمالي الأمتار المستلمة:' : 'Total Received Meters:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {Number(metrics.total_custody_meters || 0).toFixed(2)} م
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{isAr ? 'الأمتار المتبقية في العهدة بالمستودع:' : 'Remaining in Custody:'}</span>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {Number(metrics.remaining_custody_meters || 0).toFixed(2)} م
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">{isAr ? 'عدد أصناف الأقمشة المودعة:' : 'Fabric Items Count:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{materials.length} صنف</span>
                </div>
              </div>
            </Card>

            {/* Financial Status Summary */}
            <Card className="p-4 space-y-3 border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span>{isAr ? 'الموقف المالي والدفعات' : 'Financial Ledger Status'}</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{isAr ? 'إجمالي المبالغ المستحقة:' : 'Invoiced Total:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {Number(metrics.total_invoiced_amount || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">{isAr ? 'إجمالي ما تم سداده:' : 'Total Paid:'}</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {Number(metrics.total_paid_amount || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 font-bold">
                  <span className={remainingBalance > 0 ? 'text-rose-600' : 'text-slate-700'}>
                    {isAr ? 'المتبقي تحت التحصيل:' : 'Remaining Due:'}
                  </span>
                  <span className={`font-mono text-sm ${remainingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'}`}>
                    {remainingBalance.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Job Orders */}
        {activeTab === 'jobs' && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-mono font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                    <th className="p-3">{isAr ? 'نوع الخدمة' : 'Service'}</th>
                    <th className="p-3">{isAr ? 'الموديل' : 'Model'}</th>
                    <th className="p-3 text-center">{isAr ? 'المخطط' : 'Target'}</th>
                    <th className="p-3 text-center">{isAr ? 'المقصوص' : 'Cut'}</th>
                    <th className="p-3 text-center">{isAr ? 'المسلم' : 'Delivered'}</th>
                    <th className="p-3 text-center">{isAr ? 'سعر الوحدة' : 'Rate'}</th>
                    <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {jobOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        {isAr ? 'لا توجد أوامر تشغيل مسجلة لهذا العميل.' : 'No job orders found.'}
                      </td>
                    </tr>
                  ) : (
                    jobOrders.map((j) => (
                      <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{j.order_number}</td>
                        <td className="p-3">
                          <Badge variant={j.service_type === 'contract_cutting' ? 'info' : 'purple'}>
                            {j.service_type === 'contract_cutting' ? (isAr ? 'قص فقط' : 'Cutting') : (isAr ? 'تصنيع CMT' : 'CMT')}
                          </Badge>
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200">{j.garment_model?.name || j.model_name || '—'}</td>
                        <td className="p-3 text-center font-mono font-bold">{j.total_target_quantity}</td>
                        <td className="p-3 text-center font-mono text-indigo-600 font-bold">{j.total_cut_quantity}</td>
                        <td className="p-3 text-center font-mono text-emerald-600 font-bold">{j.total_delivered_quantity}</td>
                        <td className="p-3 text-center font-mono">{Number(j.unit_rate).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            j.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : j.status === 'in_progress'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {onPrintDocument && (
                            <button
                              type="button"
                              onClick={() => onPrintDocument('job', j)}
                              title={isAr ? 'طباعة تذكرة أمر القص' : 'Print Job Ticket'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Invoices & Payment Tranches */}
        {activeTab === 'invoices' && (
          <div className="space-y-3">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 font-mono font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                      <th className="p-3">{isAr ? 'تاريخ التحرير' : 'Date'}</th>
                      <th className="p-3">{isAr ? 'الاستحقاق' : 'Due Date'}</th>
                      <th className="p-3 text-center">{isAr ? 'القيمة الإجمالية' : 'Total'}</th>
                      <th className="p-3 text-center">{isAr ? 'المسدد' : 'Paid'}</th>
                      <th className="p-3 text-center">{isAr ? 'المتبقي' : 'Remaining'}</th>
                      <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="p-3 text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          {isAr ? 'لا توجد فواتير خدمات مسجلة لهذا العميل.' : 'No invoices found.'}
                        </td>
                      </tr>
                    ) : (
                      invoices.map((inv) => {
                        const total = Number(inv.total_amount || 0);
                        const paid = Number(inv.paid_amount || 0);
                        const bal = Math.max(0, total - paid);
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{inv.invoice_number}</td>
                            <td className="p-3 font-mono text-slate-600">{String(inv.invoice_date || '').split('T')[0] || '—'}</td>
                            <td className="p-3 font-mono text-slate-600">{String(inv.due_date || '').split('T')[0] || '—'}</td>
                            <td className="p-3 text-center font-mono font-bold">{total.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                            <td className="p-3 text-center font-mono text-emerald-600 font-bold">{paid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                            <td className="p-3 text-center font-mono font-black">
                              <span className={bal > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                                {bal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-sans">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                paid >= total
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : paid > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {paid >= total ? (isAr ? 'مسددة بالكامل' : 'Paid') : paid > 0 ? (isAr ? 'مسددة جزئياً' : 'Partial') : (isAr ? 'غير مسددة' : 'Unpaid')}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {bal > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 px-2 text-[10px] font-bold text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                    onClick={() => handleOpenPayment(inv)}
                                  >
                                    {isAr ? 'سداد دفعة' : 'Pay'}
                                  </Button>
                                )}
                                {onPrintDocument && (
                                  <button
                                    type="button"
                                    onClick={() => onPrintDocument('invoice', inv)}
                                    title={isAr ? 'طباعة الفاتورة' : 'Print Invoice'}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
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
          </div>
        )}

        {/* Tab 4: Materials Custody */}
        {activeTab === 'materials' && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-mono font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{isAr ? 'اسم الخامة والقماش' : 'Fabric Name'}</th>
                    <th className="p-3">{isAr ? 'الكود' : 'Code'}</th>
                    <th className="p-3 text-center">{isAr ? 'المستلم (متر)' : 'Received (m)'}</th>
                    <th className="p-3 text-center">{isAr ? 'المستهلك بالقص (متر)' : 'Consumed (m)'}</th>
                    <th className="p-3 text-center">{isAr ? 'المرتجع (متر)' : 'Returned (m)'}</th>
                    <th className="p-3 text-center">{isAr ? 'الرصيد المتبقي بالعهدة' : 'Remaining (m)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {materials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        {isAr ? 'لا توجد أمانات أقمشة مسجلة لهذا العميل.' : 'No customer materials found.'}
                      </td>
                    </tr>
                  ) : (
                    materials.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-slate-900 dark:text-slate-100">{m.fabric_name}</td>
                        <td className="p-3 font-mono text-slate-500">{m.fabric_code || '—'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-800">{Number(m.received_meters).toFixed(2)} م</td>
                        <td className="p-3 text-center font-mono text-indigo-600">{Number(m.consumed_meters).toFixed(2)} م</td>
                        <td className="p-3 text-center font-mono text-amber-600">{Number(m.returned_meters || 0).toFixed(2)} م</td>
                        <td className="p-3 text-center font-mono font-black text-sky-600 dark:text-sky-400">
                          {Number(m.remaining_meters).toFixed(2)} م
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Deliveries */}
        {activeTab === 'deliveries' && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-mono font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{isAr ? 'رقم الإذن' : 'Delivery #'}</th>
                    <th className="p-3">{isAr ? 'تاريخ التسليم' : 'Date'}</th>
                    <th className="p-3 text-center">{isAr ? 'القطع المسلمة' : 'Pieces'}</th>
                    <th className="p-3 text-center">{isAr ? 'قماش مرتجع' : 'Returned Fabric'}</th>
                    <th className="p-3 text-center">{isAr ? 'عوادم مسلمة' : 'Returned Scrap'}</th>
                    <th className="p-3 text-center">{isAr ? 'المستلم' : 'Recipient'}</th>
                    <th className="p-3 text-center">{isAr ? 'طباعة' : 'Print'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {isAr ? 'لا توجد أذون تسليم مسجلة لهذا العميل.' : 'No delivery notes found.'}
                      </td>
                    </tr>
                  ) : (
                    deliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">{d.delivery_number}</td>
                        <td className="p-3 font-mono text-slate-600">{String(d.delivery_date || '').split('T')[0] || '—'}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">{d.total_delivered_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                        <td className="p-3 text-center font-mono">{Number(d.returned_fabric_meters || 0).toFixed(2)} م</td>
                        <td className="p-3 text-center font-mono">{Number(d.returned_scrap_kg || 0).toFixed(2)} كجم</td>
                        <td className="p-3 text-center text-slate-700">{d.recipient_name || '—'}</td>
                        <td className="p-3 text-center">
                          {onPrintDocument && (
                            <button
                              type="button"
                              onClick={() => onPrintDocument('delivery', d)}
                              title={isAr ? 'طباعة إذن التسليم' : 'Print Delivery Note'}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Payment Tranche Dialog */}
        {paymentModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>{isAr ? 'تسجيل سداد دفعة / قسط مالي' : 'Record Payment Tranche'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'الفاتورة:' : 'Invoice:'}</span>
                  <span className="font-bold text-indigo-600">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'إجمالي الفاتورة:' : 'Total:'}</span>
                  <span>{Number(selectedInvoice.total_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{isAr ? 'المسدد سابقاً:' : 'Paid Previously:'}</span>
                  <span className="text-emerald-600">+{Number(selectedInvoice.paid_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'مبلغ الدفعة المسددة (ج.م):' : 'Payment Amount (EGP):'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max={Number(selectedInvoice.total_amount) - Number(selectedInvoice.paid_amount)}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {isAr ? 'طريقة السداد:' : 'Payment Method:'}
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cash">{isAr ? 'نقدي بالخزينة (Cash)' : 'Cash'}</option>
                    <option value="bank_transfer">{isAr ? 'تحويل بنكي (Bank Transfer)' : 'Bank Transfer'}</option>
                    <option value="check">{isAr ? 'شيك بنكي (Cheque)' : 'Cheque'}</option>
                    <option value="pos">{isAr ? 'شبكة / بطاقة (POS Card)' : 'POS'}</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    size="sm"
                    type="submit"
                    disabled={isSubmittingPayment}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {isSubmittingPayment ? (isAr ? 'جاري السداد...' : 'Saving...') : (isAr ? 'تأكيد السداد' : 'Confirm Payment')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

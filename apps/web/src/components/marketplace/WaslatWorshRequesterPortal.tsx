import React, { useState, useEffect, useCallback } from 'react';
import {
  Scissors,
  Package,
  Layers,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  LogOut,
  Globe,
  Sun,
  Moon,
  TrendingUp,
  FileText,
  DollarSign,
  Building2,
  ShieldCheck,
  Award,
  Sparkles,
  Eye,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { CreateCuttingRequestModal } from './CreateCuttingRequestModal';
import { CuttingRequestDetailsModal } from './CuttingRequestDetailsModal';

interface WaslatWorshRequesterPortalProps {
  currentUser: any;
  currentTenant: any;
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onConvertedToFactory?: () => void;
}

export const WaslatWorshRequesterPortal: React.FC<WaslatWorshRequesterPortalProps> = ({
  currentUser,
  currentTenant,
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onLogout,
  onConvertedToFactory,
}) => {
  const isAr = lang === 'ar';
  const [activeTab, setActiveTab] = useState<
    'overview' | 'rfqs' | 'offers' | 'operations' | 'quota' | 'payments' | 'settings' | 'upgrade_erp'
  >('overview');

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [subStatus, setSubStatus] = useState<any>(null);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [waslatPackages, setWaslatPackages] = useState<any[]>([]);
  const [erpPlans, setErpPlans] = useState<any[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isBuyQuotaModalOpen, setIsBuyQuotaModalOpen] = useState(false);

  // Upgrade Form State
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<any>(null);
  const [upgradeTransferRef, setUpgradeTransferRef] = useState('');
  const [upgradeReceiptFile, setUpgradeReceiptFile] = useState<File | null>(null);
  const [upgradeSubmitting, setUpgradeSubmitting] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  // Quota Purchase Form State
  const [selectedQuotaPlan, setSelectedQuotaPlan] = useState<any>(null);
  const [quotaTransferRef, setQuotaTransferRef] = useState('');
  const [quotaReceiptFile, setQuotaReceiptFile] = useState<File | null>(null);
  const [quotaSubmitting, setQuotaSubmitting] = useState(false);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const [quotaSuccess, setQuotaSuccess] = useState(false);

  // Fetch all requester data
  const loadPortalData = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, rfqsRes, opsRes, plansRes, erpRes, latestPayRes] = await Promise.allSettled([
        api.waslatWorsh.getMySubscriptionStatus(),
        api.waslatWorsh.getRfqs({ my_history: true }),
        api.waslatWorsh.getMyOperations(),
        api.saas.getPublicPlans('waslat_worsh'),
        api.saas.getPublicPlans('erp'),
        api.waslatWorsh.getMyLatestPaymentRequest(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setSubStatus(statusRes.value);
      }
      if (rfqsRes.status === 'fulfilled') {
        const data = rfqsRes.value?.data || rfqsRes.value || [];
        setRfqs(Array.isArray(data) ? data : []);
      }
      if (opsRes.status === 'fulfilled') {
        const ops = opsRes.value?.operations || opsRes.value || [];
        setOperations(Array.isArray(ops) ? ops : []);
      }
      if (plansRes.status === 'fulfilled') {
        setWaslatPackages(plansRes.value?.plans || []);
        setPaymentInstructions(plansRes.value?.payment_instructions || null);
      }
      if (erpRes.status === 'fulfilled') {
        setErpPlans(erpRes.value?.plans || []);
      }
      if (latestPayRes.status === 'fulfilled' && latestPayRes.value?.latest_payment_request) {
        setPaymentHistory([latestPayRes.value.latest_payment_request]);
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortalData();
  }, [loadPortalData]);

  // Derived metrics
  const requesterSub = subStatus?.requester_subscription;
  const pendingPayment = subStatus?.pending_payment_request;
  const isSubscriptionActive = requesterSub?.is_valid && requesterSub?.status === 'active';
  const remainingQuota = requesterSub?.remaining_rfq_count ?? 0;
  const allowedQuota = requesterSub?.allowed_rfq_count ?? 0;
  const consumedQuota = requesterSub?.consumed_rfq_count ?? 0;

  // Handle Quota Purchase Submit
  const handleBuyQuotaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuotaPlan || !quotaReceiptFile || !quotaTransferRef.trim()) {
      setQuotaError(isAr ? 'يرجى اختيار الباقة وإدخال رقم الحوالة ورفع إيصال السداد.' : 'Please select package, reference, and upload receipt.');
      return;
    }

    setQuotaSubmitting(true);
    setQuotaError(null);
    try {
      const formData = new FormData();
      formData.append('plan_code', selectedQuotaPlan.code);
      formData.append('request_type', 'new');
      formData.append('transfer_reference', quotaTransferRef.trim());
      formData.append('submitted_amount', String(selectedQuotaPlan.monthly_price));
      formData.append('receipt', quotaReceiptFile);

      await api.waslatWorsh.submitPaymentRequest(formData);
      setQuotaSuccess(true);
      await loadPortalData();
      setTimeout(() => {
        setIsBuyQuotaModalOpen(false);
        setQuotaSuccess(false);
        setQuotaTransferRef('');
        setQuotaReceiptFile(null);
      }, 2000);
    } catch (err: any) {
      setQuotaError(err.message || (isAr ? 'فشل إرسال طلب السداد.' : 'Failed to submit payment request.'));
    } finally {
      setQuotaSubmitting(false);
    }
  };

  // Handle ERP Upgrade Submit
  const handleUpgradeErpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpgradePlan || !upgradeReceiptFile || !upgradeTransferRef.trim()) {
      setUpgradeError(isAr ? 'يرجى اختيار باقة الـ ERP وإدخال رقم الحوالة ورفع الإيصال.' : 'Please select ERP plan, reference, and upload receipt.');
      return;
    }

    setUpgradeSubmitting(true);
    setUpgradeError(null);
    try {
      const formData = new FormData();
      formData.append('plan_code', selectedUpgradePlan.code);
      formData.append('request_type', 'upgrade');
      formData.append('transfer_reference', upgradeTransferRef.trim());
      formData.append('submitted_amount', String(selectedUpgradePlan.monthly_price));
      formData.append('receipt', upgradeReceiptFile);

      await api.waslatWorsh.submitPaymentRequest(formData);
      setUpgradeSuccess(true);
      await loadPortalData();
      onConvertedToFactory?.();
      setTimeout(() => {
        setIsUpgradeModalOpen(false);
        setUpgradeSuccess(false);
        setUpgradeTransferRef('');
        setUpgradeReceiptFile(null);
      }, 2000);
    } catch (err: any) {
      setUpgradeError(err.message || (isAr ? 'فشل إرسال طلب الترقية.' : 'Failed to submit ERP upgrade.'));
    } finally {
      setUpgradeSubmitting(false);
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
      case 'open':
        return <Badge variant="success">{isAr ? 'منشور في البورصة' : 'Published'}</Badge>;
      case 'draft':
        return <Badge variant="neutral">{isAr ? 'مسودة' : 'Draft'}</Badge>;
      case 'offer_selected':
        return <Badge variant="warning">{isAr ? 'تم اختيار العرض' : 'Offer Selected'}</Badge>;
      case 'in_progress':
        return <Badge variant="info">{isAr ? 'قيد التشغيل' : 'In Progress'}</Badge>;
      case 'completed':
        return <Badge variant="success">{isAr ? 'مكتمل' : 'Completed'}</Badge>;
      case 'cancelled':
        return <Badge variant="danger">{isAr ? 'ملغي' : 'Cancelled'}</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* 1. TOP PORTAL NAVIGATION BAR */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                {isAr ? 'وصلة ورش' : 'Waslat Worsh'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {isAr ? 'بوابة طالب الخدمة المستقل' : 'Requester Portal'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              {currentTenant?.name || currentUser?.name}
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          {/* Quota Indicator Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-xs">
            <Layers className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500">{isAr ? 'حصة الطلبات المتبقية:' : 'Remaining RFQs:'}</span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {remainingQuota} / {allowedQuota}
            </span>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-brand-primary text-xs"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? 'طرح طلب قص جديد' : 'New RFQ'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={loadPortalData}
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleTheme}
            icon={isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleLang}
            icon={<Globe className="w-3.5 h-3.5" />}
          >
            {isAr ? 'EN' : 'عربي'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onLogout}
            icon={<LogOut className="w-3.5 h-3.5 text-rose-500" />}
          >
            {isAr ? 'خروج' : 'Logout'}
          </Button>
        </div>
      </header>

      {/* 2. PORTAL BODY (SIDEBAR TABS + CONTENT) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shrink-0 hidden md:block overflow-y-auto">
          {/* Requester Status Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/10 border border-rose-200/60 dark:border-rose-900/40 mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-800 dark:text-rose-300">
                {isSubscriptionActive ? (isAr ? 'اشتراك نشط ومؤهل' : 'Active Subscription') : (isAr ? 'بانتظار التفعيل' : 'Pending Activation')}
              </span>
              <span className={`w-2 h-2 rounded-full ${isSubscriptionActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              {requesterSub?.plan_code
                ? (isAr ? `الباقة: ${requesterSub.plan_code}` : `Plan: ${requesterSub.plan_code}`)
                : (isAr ? 'لم يتم تفعيل باقة بعد' : 'No active package')}
            </div>
            {requesterSub?.expires_at && (
              <div className="text-[10px] text-slate-500 font-mono">
                {isAr ? `صالح حتى: ${requesterSub.expires_at.substring(0, 10)}` : `Expires: ${requesterSub.expires_at.substring(0, 10)}`}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          {[
            { id: 'overview', label: isAr ? 'لوحة المتابعة والمؤشرات' : 'Overview & Metrics', icon: TrendingUp },
            { id: 'rfqs', label: isAr ? 'طلبات القص الخاصة بي' : 'My Cutting Requests', icon: Scissors, badge: rfqs.length },
            { id: 'offers', label: isAr ? 'العروض المستلمة والأسعار' : 'Received Bids', icon: Award },
            { id: 'operations', label: isAr ? 'العمليات والتشغيل الجاري' : 'Selected Operations', icon: Package, badge: operations.length },
            { id: 'quota', label: isAr ? 'الباقة وحصة الطلبات' : 'Package & Quota', icon: Layers },
            { id: 'payments', label: isAr ? 'سجل المدفوعات والتحويلات' : 'Payment History', icon: DollarSign },
            { id: 'upgrade_erp', label: isAr ? 'الترقية لمصنع GarmentOS ERP' : 'Upgrade to ERP', icon: Building2, highlight: true },
            { id: 'settings', label: isAr ? 'إعدادات الحساب والعلامة' : 'Account Settings', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500 text-white shadow-sm'
                    : item.highlight
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Pending Payment Notification Banner */}
          {pendingPayment && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-spin" />
                <div>
                  <h4 className="text-xs font-bold">
                    {isAr ? 'لديك إثبات سداد قيد المراجعة والاعتماد' : 'Payment Proof Under Admin Review'}
                  </h4>
                  <p className="text-[11px] text-amber-600/90 dark:text-amber-400/90">
                    {isAr
                      ? `طلب باقة (${pendingPayment.plan_name || pendingPayment.plan_code}) بمبلغ ${Number(pendingPayment.submitted_amount).toLocaleString()} ج.م برقم حوالة [${pendingPayment.transfer_reference}]. سيتم تفعيل حسابك فور التحقق.`
                      : `Request for ${pendingPayment.plan_code} (${pendingPayment.submitted_amount} EGP) is pending admin approval.`}
                  </p>
                </div>
              </div>
              <Badge variant="warning">{isAr ? 'قيد المراجعة' : 'Pending'}</Badge>
            </div>
          )}

          {/* TAB 1: OVERVIEW & DASHBOARD */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{isAr ? 'حصة طلبات القص المتبقية' : 'Remaining Quota'}</span>
                    <Scissors className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    {remainingQuota}
                    <span className="text-xs text-slate-400 font-sans font-normal ms-1">
                      {isAr ? `من ${allowedQuota}` : `of ${allowedQuota}`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-rose-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${allowedQuota > 0 ? (consumedQuota / allowedQuota) * 100 : 0}%` }}
                    />
                  </div>
                </Card>

                <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{isAr ? 'إجمالي الطلبات المطروحة' : 'Total RFQs'}</span>
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    {rfqs.length}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? `${rfqs.filter((r) => r.status === 'published' || r.status === 'open').length} طلب نشط بالبورصة` : 'Active on exchange'}
                  </p>
                </Card>

                <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{isAr ? 'العمليات قيد التشغيل' : 'Active Operations'}</span>
                    <Package className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                    {operations.length}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {isAr ? 'أوامر تشغيل معتمدة بالورش' : 'Orders awarded to workshops'}
                  </p>
                </Card>

                <Card className="p-5 space-y-2 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{isAr ? 'حالة الاشتراك' : 'Subscription Status'}</span>
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white truncate">
                    {isSubscriptionActive ? (isAr ? 'نشط وصالح' : 'Active') : (isAr ? 'غير مفعّل' : 'Inactive')}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => setActiveTab('quota')}
                  >
                    {isAr ? 'إدارة الباقة والحصة' : 'Manage Quota'}
                  </Button>
                </Card>
              </div>

              {/* Quick Actions & Recent RFQs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent RFQs List (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-rose-500" />
                      <span>{isAr ? 'أحدث طلبات القص المطروحة' : 'Recent Cutting Requests'}</span>
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setActiveTab('rfqs')}
                      className="text-xs text-rose-500"
                    >
                      {isAr ? 'عرض الكل' : 'View All'}
                    </Button>
                  </div>

                  {rfqs.length === 0 ? (
                    <Card className="p-8 text-center space-y-3 border-dashed border-slate-300 dark:border-slate-800">
                      <Scissors className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs text-slate-500">
                        {isAr ? 'لم تقم بطرح أي طلبات قص بعد. ابدأ بطرح طلبك الأول واستقبل عروض المشاغل.' : 'No cutting requests created yet.'}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-brand-primary text-xs"
                      >
                        {isAr ? 'طرح طلب قص الآن' : 'Create First RFQ'}
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {rfqs.slice(0, 4).map((rfq) => (
                        <div
                          key={rfq.id}
                          onClick={() => {
                            setSelectedRfqId(rfq.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500/50 transition-all cursor-pointer flex items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {rfq.title}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                [{rfq.rfq_number}]
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500">
                              <span>{isAr ? 'الكمية: ' : 'Qty: '}<strong className="text-slate-700 dark:text-slate-300 font-mono">{rfq.target_quantity}</strong> {isAr ? 'قطعة' : 'pcs'}</span>
                              <span>•</span>
                              <span>{isAr ? 'تسليم: ' : 'Deadline: '}<strong className="font-mono">{rfq.expected_delivery_date}</strong></span>
                              <span>•</span>
                              <span>{isAr ? 'العروض: ' : 'Bids: '}<strong className="text-rose-600 font-mono">{rfq.bids_count || 0}</strong></span>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(rfq.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ERP Upgrade Teaser Card (1 col) */}
                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border border-indigo-800/40 shadow-xl space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAr ? 'ترقية المصنع' : 'ERP Upgrade'}</span>
                    </div>
                    <h4 className="text-lg font-black font-sans">
                      {isAr ? 'هل تمتلك مصنعاً أو ورشة إنتاج كاملة؟' : 'Ready to manage your own apparel factory?'}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {isAr
                        ? 'قم بالترقية لنظام GarmentOS ERP المتكامل في أي وقت. سنقوم بتحويل حسابك فورياً مع الحفاظ الكامل على كافة طلباتك ومرفقاتك وتاريخ تعاملاتك.'
                        : 'Upgrade seamlessly to GarmentOS ERP. Your RFQs and transaction history remain completely intact.'}
                    </p>
                    <Button
                      variant="primary"
                      onClick={() => setActiveTab('upgrade_erp')}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5"
                    >
                      {isAr ? 'استعراض باقات ERP والترقية' : 'Explore ERP Plans'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY CUTTING REQUESTS */}
          {activeTab === 'rfqs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                    {isAr ? 'إدارة طلبات القص وعروض الأسعار' : 'My Cutting Requests (RFQs)'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'اطرح مواصفاتك، قارن عروض المشاغل المعتمدة، وقم بالترسية الآمنة.' : 'Tender specs, compare bids, and award jobs.'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="btn-brand-primary text-xs"
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  {isAr ? 'طرح طلب قص جديد' : 'New RFQ'}
                </Button>
              </div>

              {rfqs.length === 0 ? (
                <Card className="p-12 text-center space-y-4">
                  <Scissors className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isAr ? 'لم تقم بإنشاء أي طلبات قص بعد. ابدأ الآن بإنشاء طلب وإرفاق الباترونات وجداول المقاسات.' : 'No cutting requests created yet.'}
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-brand-primary text-xs"
                  >
                    {isAr ? 'إنشاء طلبك الأول' : 'Create First Request'}
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rfqs.map((rfq) => (
                    <Card
                      key={rfq.id}
                      className="p-5 space-y-4 border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              {rfq.title}
                            </h4>
                          </div>
                          <span className="font-mono text-xs text-slate-400">
                            {rfq.rfq_number}
                          </span>
                        </div>
                        {getStatusBadge(rfq.status)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'الكمية المطلوبة:' : 'Quantity:'}</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rfq.target_quantity} {isAr ? 'قطعة' : 'pcs'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'تاريخ التسليم:' : 'Deadline:'}</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {rfq.expected_delivery_date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 flex items-center gap-1.5 font-bold">
                          <Award className="w-3.5 h-3.5 text-rose-500" />
                          <span>{isAr ? `العروض المستلمة: ${rfq.bids_count || 0}` : `Bids: ${rfq.bids_count || 0}`}</span>
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRfqId(rfq.id);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs"
                          icon={<Eye className="w-3.5 h-3.5" />}
                        >
                          {isAr ? 'تفاصيل ومقارنة العروض' : 'Compare Offers'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RECEIVED OFFERS ACROSS ALL RFQS */}
          {activeTab === 'offers' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'العروض التنافسية المستلمة من المشاغل' : 'Received Workshop Bids'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'استعراض وقبول وترسية عروض أسعار صالات القص على كافة طلباتك.' : 'Review, compare, and award bids from certified workshops.'}
                </p>
              </div>

              {rfqs.filter((r) => (r.bids_count || 0) > 0).length === 0 ? (
                <Card className="p-12 text-center space-y-3">
                  <Award className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    {isAr ? 'لم تستلم عروض أسعار بعد. تأكد من نشر طلباتك بالبورصة ليتمكن مقدمو الخدمة من معاينتها.' : 'No bids received yet.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {rfqs
                    .filter((r) => (r.bids_count || 0) > 0)
                    .map((rfq) => (
                      <Card key={rfq.id} className="p-4 space-y-3 border-slate-200 dark:border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div>
                            <span className="font-bold text-xs text-slate-900 dark:text-white">{rfq.title}</span>
                            <span className="font-mono text-[11px] text-slate-400 ms-2">[{rfq.rfq_number}]</span>
                          </div>
                          <Badge variant="brand">{isAr ? `${rfq.bids_count || 0} عروض` : `${rfq.bids_count || 0} bids`}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{isAr ? 'الكمية: ' : 'Qty: '}{rfq.target_quantity} {isAr ? 'قطعة' : 'pcs'}</span>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => {
                              setSelectedRfqId(rfq.id);
                              setIsDetailModalOpen(true);
                            }}
                            className="btn-brand-primary text-xs"
                          >
                            {isAr ? 'فتح جدول مقارنة العروض والترسية' : 'Open Bid Comparison'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SELECTED OPERATIONS */}
          {activeTab === 'operations' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'متابعة العمليات والتشغيل الجاري' : 'Selected Operations & Job Orders'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'متابعة مراحل التنفيذ والتسليم للطلبات التي تم ترسيتها على المشاغل.' : 'Track operations awarded to cutting workshops.'}
                </p>
              </div>

              {operations.length === 0 ? (
                <Card className="p-12 text-center space-y-3">
                  <Package className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    {isAr ? 'لا توجد عمليات تشغيل جارية حالياً. عند قبولك لأي عرض ستظهر تفاصيل العملية هنا.' : 'No active awarded operations.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {operations.map((op: any) => (
                    <Card key={op.id} className="p-5 space-y-3 border-slate-200 dark:border-slate-800">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                            {op.order_number || op.title}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {isAr ? `الورشة المنفذة: ${op.customer_name || 'مشغل معتمد'}` : `Workshop: ${op.customer_name || 'Certified Workshop'}`}
                          </p>
                        </div>
                        {getStatusBadge(op.status)}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'إجمالي القطع:' : 'Quantity:'}</span>
                          <span className="font-mono font-bold">{op.total_target_quantity}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'سعر القطعة المعتمد:' : 'Unit Rate:'}</span>
                          <span className="font-mono font-bold text-emerald-600">{op.unit_rate} ج.م</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'موعد التسليم المتعهد:' : 'Delivery Date:'}</span>
                          <span className="font-mono font-bold">{op.target_delivery_date || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">{isAr ? 'الخدمة:' : 'Service:'}</span>
                          <span className="font-bold">{op.service_type}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PACKAGE & QUOTA */}
          {activeTab === 'quota' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'إدارة باقة الاشتراك وحصص طلبات القص' : 'Subscription Package & Quota'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'تفاصيل الباقة الحالية، استهلاك الحصة، وتجديد أو شراء باقات طلبات إضافية.' : 'View quota consumption, renew package, or purchase additional RFQs.'}
                </p>
              </div>

              {/* Current Quota Meter Card */}
              <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-rose-500 block">
                      {isAr ? 'الباقة المفعلة الحالية' : 'Current Active Plan'}
                    </span>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white font-sans">
                      {requesterSub?.plan_code || (isAr ? 'لا يوجد اشتراك نشط' : 'No active package')}
                    </h4>
                  </div>
                  <Button
                    variant="primary"
                    onClick={() => setIsBuyQuotaModalOpen(true)}
                    className="btn-brand-primary text-xs"
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isAr ? 'تجديد / شراء حصة طلبات قص' : 'Buy / Renew Quota'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block">{isAr ? 'إجمالي الحصة المسموحة' : 'Total Allowed'}</span>
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{allowedQuota}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block">{isAr ? 'الطلبات المستهلكة (المنشورة)' : 'Consumed RFQs'}</span>
                    <span className="text-2xl font-black font-mono text-amber-600">{consumedQuota}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-[11px] text-slate-400 block">{isAr ? 'الطلبات المتبقية المتاحة' : 'Remaining RFQs'}</span>
                    <span className="text-2xl font-black font-mono text-emerald-600">{remainingQuota}</span>
                  </div>
                </div>
              </Card>

              {/* Available Waslat Worsh Packages Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'الباقات المتاحة للشراء' : 'Available Packages'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {waslatPackages.map((pkg) => (
                    <Card key={pkg.code || pkg.id} className="p-5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? pkg.name_ar : pkg.name_en}</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{isAr ? pkg.description_ar : pkg.description_en}</p>
                        <div className="text-2xl font-black font-mono text-slate-900 dark:text-white pt-1">
                          {Number(pkg.monthly_price).toLocaleString()} <span className="text-xs font-sans text-slate-400">ج.م</span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>• حصة {pkg.quota_rfq_count} طلبات قص</div>
                          <div>• صلاحية {pkg.billing_duration || 30} يوماً</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuotaPlan(pkg);
                          setIsBuyQuotaModalOpen(true);
                        }}
                        className="w-full text-xs mt-3"
                      >
                        {isAr ? 'شراء هذه الباقة' : 'Select Plan'}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PAYMENTS & HISTORY */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'سجل المدفوعات والتحويلات البنكية' : 'Payment Requests & Submissions'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'متابعة حالة إثباتات السداد المحولة عبر إنستاباي أو الحسابات البنكية.' : 'Track your payment proofs and activation status.'}
                </p>
              </div>

              {paymentHistory.length === 0 ? (
                <Card className="p-12 text-center space-y-3">
                  <DollarSign className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">
                    {isAr ? 'لا توجد طلبات سداد مسجلة حالياً.' : 'No payment requests found.'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((pr: any) => (
                    <Card key={pr.id} className="p-4 space-y-2 border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {pr.plan_name || pr.plan_code}
                          </span>
                          <span className="font-mono text-xs text-slate-400">
                            [{pr.transfer_reference}]
                          </span>
                        </div>
                        <Badge variant={pr.status === 'approved' ? 'success' : pr.status === 'rejected' ? 'danger' : 'warning'}>
                          {pr.status === 'approved' ? (isAr ? 'معتمد' : 'Approved') : pr.status === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected') : (isAr ? 'قيد المراجعة' : 'Pending')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>{isAr ? 'المبلغ: ' : 'Amount: '}<strong className="text-slate-800 dark:text-slate-200 font-mono">{pr.submitted_amount} ج.م</strong></div>
                        <div>{isAr ? 'النوع: ' : 'Type: '}{pr.request_type}</div>
                        <div>{isAr ? 'التاريخ: ' : 'Date: '}<span className="font-mono">{pr.created_at?.substring(0, 10)}</span></div>
                        <div>{isAr ? 'المنتج: ' : 'Product: '}{pr.product_type}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: UPGRADE TO GARMENTOS ERP */}
          {activeTab === 'upgrade_erp' && (
            <div className="space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white border border-indigo-800/40 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الترقية المباشرة الشاملة' : 'In-Place Tenant Upgrade'}</span>
                </div>
                <h3 className="text-2xl font-black font-sans">
                  {isAr ? 'انضم إلى مصانع GarmentOS ERP بكامل القوة التشغيلية' : 'Upgrade to Full GarmentOS ERP Factory'}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {isAr
                    ? 'هل بدأت بطلب خدمات القص وتوسعت عملياتك لتشمل خطوط إنتاج أو مخازن أو محاسبة خاصة؟ يمكنك الترقية إلى باقة ERP في أي وقت. سيتم تحويل حسابك في نفس المكان وبنفس بيانات الدخول وتاريخ التعاملات مع فتح كافة وحدات الـ ERP.'
                    : 'Upgrade to GarmentOS ERP anytime. Your account will be upgraded in place with zero data loss.'}
                </p>
              </div>

              {/* ERP Plans Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isAr ? 'اختر باقة الـ ERP المناسبة لمصنعك' : 'Select ERP Package for Your Factory'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {erpPlans.map((plan) => (
                    <Card
                      key={plan.id || plan.code}
                      className={`p-6 space-y-4 flex flex-col justify-between ${
                        plan.code === 'pro'
                          ? 'border-[var(--brand-primary)] shadow-xl ring-2 ring-[var(--brand-border)]'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-lg font-black font-sans text-slate-900 dark:text-white">
                            {isAr ? plan.name_ar : plan.name_en}
                          </h5>
                          {plan.code === 'pro' && (
                            <Badge variant="brand">{isAr ? 'الأكثر طلباً' : 'Popular'}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{isAr ? plan.description_ar : plan.description_en}</p>
                        <div className="pt-2">
                          <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                            {Number(plan.monthly_price).toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 ms-1 font-sans">ج.م / شهرياً</span>
                        </div>
                        <ul className="text-xs space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          {(plan.features || []).slice(0, 6).map((f: string, fi: number) => (
                            <li key={fi} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <Button
                        variant={plan.code === 'pro' ? 'primary' : 'outline'}
                        onClick={() => {
                          setSelectedUpgradePlan(plan);
                          setIsUpgradeModalOpen(true);
                        }}
                        className={`w-full text-xs py-2.5 ${plan.code === 'pro' ? 'btn-brand-primary' : ''}`}
                      >
                        {isAr ? 'طلب الترقية لهذه الباقة' : 'Request Upgrade'}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ACCOUNT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white font-sans">
                  {isAr ? 'بيانات حساب طالب الخدمة' : 'Requester Account Profile'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr ? 'المعلومات المسجلة لعلامتك التجارية والتواصل.' : 'Registered details of your brand and contacts.'}
                </p>
              </div>

              <Card className="p-6 space-y-4 border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'اسم المنشأة / العلامة:' : 'Brand / Company Name:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{currentTenant?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'كود المنشأة:' : 'Tenant Code:'}</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{currentTenant?.code}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'المستخدم المسؤول:' : 'Owner / User:'}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{currentUser?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'البريد الإلكتروني:' : 'Email:'}</span>
                    <span className="font-mono text-slate-900 dark:text-white">{currentUser?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">{isAr ? 'نوع الحساب:' : 'Account Type:'}</span>
                    <Badge variant="neutral">{currentTenant?.tenant_type || 'marketplace_requester'}</Badge>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: CREATE CUTTING REQUEST */}
      {isCreateModalOpen && (
        <CreateCuttingRequestModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadPortalData();
          }}
          isAr={isAr}
        />
      )}

      {/* MODAL: RFQ DETAILS & BID COMPARISON */}
      {isDetailModalOpen && selectedRfqId && (
        <CuttingRequestDetailsModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedRfqId(null);
          }}
          rfq={rfqs.find((r) => r.id === selectedRfqId) || null}
          onPublishSuccess={() => loadPortalData()}
          onCancelSuccess={() => loadPortalData()}
          isAr={isAr}
        />
      )}

      {/* MODAL: BUY / RENEW WASLAT WORSH QUOTA */}
      {isBuyQuotaModalOpen && (
        <Modal
          isOpen={isBuyQuotaModalOpen}
          onClose={() => setIsBuyQuotaModalOpen(false)}
          title={isAr ? 'شراء أو تجديد باقة طلبات القص' : 'Purchase / Renew RFQ Quota'}
          maxWidth="md"
        >
          <form onSubmit={handleBuyQuotaSubmit} className="space-y-4 text-xs">
            {quotaSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'تم إرسال إثبات السداد بنجاح!' : 'Payment Proof Submitted Successfully!'}
                </h4>
                <p className="text-slate-500 text-xs">
                  {isAr ? 'سيتم التحقق وتفعيل الحصة الجديدة فور مراجعة الإدارة.' : 'Admin will review and activate your quota shortly.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'اختر باقة طلبات القص:' : 'Select RFQ Package:'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {waslatPackages.map((pkg) => {
                      const isSel = selectedQuotaPlan?.code === pkg.code;
                      return (
                        <div
                          key={pkg.code}
                          onClick={() => setSelectedQuotaPlan(pkg)}
                          className={`p-3 rounded-xl border text-start cursor-pointer transition-all ${
                            isSel
                              ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold">{isAr ? pkg.name_ar : pkg.name_en}</div>
                          <div className="font-mono text-sm font-black">{pkg.monthly_price} ج.م</div>
                          <div className="text-[10px] text-slate-400">{pkg.quota_rfq_count} طلبات قص</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Instructions Box */}
                {paymentInstructions && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                    <div className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'بيانات التحويل المعتمدة:' : 'Payment Details:'}</div>
                    <div>{isAr ? 'إنستاباي: ' : 'InstaPay: '}<span className="font-mono font-bold text-rose-600">{paymentInstructions.instapay_address}</span></div>
                    <div>{isAr ? 'البنك: ' : 'Bank: '}{paymentInstructions.bank_name}</div>
                    <div>{isAr ? 'رقم الحساب: ' : 'Account No: '}<span className="font-mono font-bold">{paymentInstructions.account_number}</span></div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'رقم الحوالة أو المرجع:' : 'Transfer Reference / TX ID:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={quotaTransferRef}
                    onChange={(e) => setQuotaTransferRef(e.target.value)}
                    placeholder="e.g. TX-98471203"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'صورة إيصال التحويل (JPG / PNG / PDF):' : 'Transfer Receipt Proof:'}
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    onChange={(e) => setQuotaReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:me-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300"
                  />
                </div>

                {quotaError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-bold text-xs">
                    {quotaError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button size="sm" variant="outline" type="button" onClick={() => setIsBuyQuotaModalOpen(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button size="sm" variant="primary" type="submit" disabled={quotaSubmitting} className="btn-brand-primary">
                    {quotaSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال إثبات السداد' : 'Submit Proof')}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* MODAL: UPGRADE TO GARMENTOS ERP */}
      {isUpgradeModalOpen && (
        <Modal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          title={isAr ? 'ترقية الحساب إلى مصنع GarmentOS ERP' : 'Upgrade to GarmentOS ERP Factory'}
          maxWidth="md"
        >
          <form onSubmit={handleUpgradeErpSubmit} className="space-y-4 text-xs">
            {upgradeSuccess ? (
              <div className="p-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? 'تم استلام طلب الترقية بنجاح!' : 'Upgrade Request Submitted!'}
                </h4>
                <p className="text-slate-500 text-xs">
                  {isAr ? 'سيقوم مسؤولو المنصة بمراجعة التحويل واعتماد الترقية الفورية لمصنعك.' : 'Platform Admin will review and approve in-place conversion.'}
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'الباقة المختارة للترقية:' : 'Selected ERP Plan:'}
                  </label>
                  <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                        {isAr ? selectedUpgradePlan?.name_ar : selectedUpgradePlan?.name_en}
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                        {Number(selectedUpgradePlan?.monthly_price).toLocaleString()} ج.م / شهرياً
                      </div>
                    </div>
                    <Badge variant="brand">{selectedUpgradePlan?.code}</Badge>
                  </div>
                </div>

                {paymentInstructions && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-[11px]">
                    <div className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'سداد رسوم الاشتراك عبر:' : 'Pay to:'}</div>
                    <div>{isAr ? 'إنستاباي: ' : 'InstaPay: '}<span className="font-mono font-bold text-indigo-600">{paymentInstructions.instapay_address}</span></div>
                    <div>{isAr ? 'البنك: ' : 'Bank: '}{paymentInstructions.bank_name}</div>
                    <div>{isAr ? 'الحساب: ' : 'Account: '}<span className="font-mono font-bold">{paymentInstructions.account_number}</span></div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'رقم مرجع التحويل البنكي / إنستاباي:' : 'Transfer Reference:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={upgradeTransferRef}
                    onChange={(e) => setUpgradeTransferRef(e.target.value)}
                    placeholder="e.g. ERP-UPGRADE-59281"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'صورة إيصال التحويل البنكي:' : 'Receipt Image Proof:'}
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*,.pdf"
                    onChange={(e) => setUpgradeReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:me-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300"
                  />
                </div>

                {upgradeError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 font-bold text-xs">
                    {upgradeError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button size="sm" variant="outline" type="button" onClick={() => setIsUpgradeModalOpen(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button size="sm" variant="primary" type="submit" disabled={upgradeSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                    {upgradeSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'تأكيد طلب الترقية' : 'Submit Upgrade Request')}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldAlert,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Building2,
  Users,
  Scissors,
  Layers,
  ShoppingBag,
  Package,
  HardDrive,
  RefreshCw,
  Info,
  ShieldCheck,
  Printer,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import { PrintSubscriptionModal } from './PrintSubscriptionModal';
import type { TenantSubscriptionReport, SubscriptionPlan } from '../../types';

interface TenantSubscriptionViewProps {
  isAr?: boolean;
  onNavigate?: (tab: string) => void;
}

export const TenantSubscriptionView: React.FC<TenantSubscriptionViewProps> = ({
  isAr = true,
  onNavigate,
}) => {
  const [report, setReport] = useState<TenantSubscriptionReport | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [activeOverrides, setActiveOverrides] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upgrade Modal mode: 'instant' (direct owner activation) vs 'payment_proof' (manual transfer/InstaPay)
  const [upgradeMode, setUpgradeMode] = useState<'instant' | 'payment_proof'>('instant');
  const [selectedPlanForProof, setSelectedPlanForProof] = useState<string>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'instapay' | 'bank_transfer' | 'vodafone_cash'>('instapay');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);

  // Emergency override form
  const [overrideMeter, setOverrideMeter] = useState<string>('cutting_lays');
  const [overrideLimit, setOverrideLimit] = useState<number>(100);
  const [overrideDays, setOverrideDays] = useState<number>(7);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, plansRes, overridesRes] = await Promise.allSettled([
        api.subscription.getCurrentReport(),
        api.subscription.getPlans(),
        api.subscription.getActiveOverrides(),
      ]);

      if (reportRes.status === 'fulfilled') {
        setReport(reportRes.value);
      } else {
        setReport(null);
      }

      if (plansRes.status === 'fulfilled') {
        setPlans(Array.isArray(plansRes.value?.plans) ? plansRes.value.plans : []);
      } else {
        setPlans([]);
      }

      if (overridesRes.status === 'fulfilled') {
        setActiveOverrides(overridesRes.value?.overrides || []);
      } else {
        setActiveOverrides([]);
      }

      if ([reportRes, plansRes, overridesRes].some((result) => result.status === 'rejected')) {
        setStatusMsg({
          type: 'error',
          text: isAr
            ? 'تعذر تحميل بيانات الاشتراك الحقيقية. أعد المحاولة؛ لم نعرض بيانات تجريبية.'
            : 'Subscription data could not be loaded. Retry; demo values are not displayed.',
        });
      } else {
        setStatusMsg(null);
      }
    } catch (err: any) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInstantUpgrade = async (planCode: string) => {
    setIsUpgrading(true);
    setStatusMsg(null);
    try {
      const res = await api.subscription.upgrade({
        plan_code: planCode,
        billing_cycle: selectedCycle,
        direct_activate: true,
      });
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تمت ترقية وتفعيل سعة المصنع بنجاح فوري!' : 'Subscription upgraded and factory capacity activated instantly!'),
      });
      setIsUpgradeModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشلت ترقية الباقة' : 'Failed to upgrade subscription'),
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManualPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceNumber.trim()) {
      setStatusMsg({
        type: 'error',
        text: isAr ? 'يرجى إدخال رقم العملية أو التحويل البنكي' : 'Please provide the transaction or transfer reference number',
      });
      return;
    }

    setIsSubmittingProof(true);
    setStatusMsg(null);
    try {
      const formData = new FormData();
      formData.append('plan_code', selectedPlanForProof);
      formData.append('billing_cycle', selectedCycle);
      formData.append('payment_method', paymentMethod);
      formData.append('transaction_reference', referenceNumber);
      if (paymentNotes) formData.append('notes', paymentNotes);
      if (proofFile) formData.append('receipt', proofFile);

      const res = await api.waslatWorsh.submitPaymentRequest(formData);
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? 'تم إرسال إشعار السداد بنجاح! سيتم مراجعته وتفعيل سعة المصنع فوراً.' : 'Payment proof submitted! Will be verified shortly.'),
      });
      setIsUpgradeModalOpen(false);
      setReferenceNumber('');
      setProofFile(null);
      setPaymentNotes('');
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل إرسال طلب السداد' : 'Failed to submit payment request'),
      });
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleRequestOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOverride(true);
    setStatusMsg(null);
    try {
      const res = await api.subscription.grantAdminOverride({
        tenant_id: report?.tenant_id,
        meter_key: overrideMeter,
        temporary_limit: Number(overrideLimit),
        reason: overrideReason,
        days: Number(overrideDays),
      });
      setStatusMsg({
        type: 'success',
        text: res.message || (isAr ? `تم تفعيل الاستثناء التشغيلي الطارئ بنجاح لمدة ${overrideDays} يوم!` : `Emergency operational override granted for ${overrideDays} days!`),
      });
      setIsOverrideModalOpen(false);
      setOverrideReason('');
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل طلب الاستثناء' : 'Failed to request override'),
      });
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const getMeterIcon = (key: string) => {
    switch (key) {
      case 'active_users':
      case 'active_employees':
        return <Users className="w-5 h-5 text-rose-500" />;
      case 'active_branches':
      case 'active_warehouses':
        return <Building2 className="w-5 h-5 text-indigo-500" />;
      case 'cutting_lays':
        return <Scissors className="w-5 h-5 text-emerald-500" />;
      case 'production_orders':
        return <Layers className="w-5 h-5 text-amber-500" />;
      case 'purchase_orders':
      case 'sales_orders':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />;
      case 'subcontract_jobs':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'storage_megabytes':
        return <HardDrive className="w-5 h-5 text-slate-500" />;
      default:
        return <Zap className="w-5 h-5 text-primary" />;
    }
  };

  const getMeterAction = (key: string): { labelAr: string; labelEn: string; tab: string } => {
    switch (key) {
      case 'active_users':
        return { labelAr: 'المستخدمين والصلاحيات', labelEn: 'Manage Users', tab: 'settings' };
      case 'active_employees':
        return { labelAr: 'العمال ومسيرات الأجور', labelEn: 'Piece Workers', tab: 'piece_rate' };
      case 'cutting_lays':
        return { labelAr: 'صالة القص والفرشات', labelEn: 'Cutting Floor', tab: 'cutting' };
      case 'production_orders':
        return { labelAr: 'أوامر التشغيل والإنتاج', labelEn: 'Production Orders', tab: 'cutting' };
      case 'garment_models':
        return { labelAr: 'الموديلات والتصميمات', labelEn: 'Garment Models', tab: 'models' };
      case 'purchase_orders':
        return { labelAr: 'أوامر الشراء والموردين', labelEn: 'Purchase Orders', tab: 'purchasing' };
      case 'sales_orders':
        return { labelAr: 'أوامر وفواتير البيع', labelEn: 'Sales Invoices', tab: 'sales' };
      case 'subcontract_jobs':
        return { labelAr: 'عقود التشغيل للغير (CMT)', labelEn: 'Subcontracts', tab: 'subcontracting' };
      case 'active_branches':
      case 'active_warehouses':
        return { labelAr: 'المستودعات ومخازن الأقمشة', labelEn: 'Warehouses', tab: 'inventory' };
      case 'storage_megabytes':
        return { labelAr: 'إدارة مساحة التخزين', labelEn: 'Storage & Files', tab: 'settings' };
      case 'marketplace_bids':
        return { labelAr: 'منصة وصلة ورش', labelEn: 'Waslat Worsh', tab: 'waslat_worsh' };
      default:
        return { labelAr: 'فتح القسم', labelEn: 'Open View', tab: 'dashboard' };
    }
  };

  const metersList = report?.meters ? Object.values(report.meters) : [];
  const hasCriticalWarning = metersList.some((m) => m.is_warning_85 || m.is_exceeded);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
      {/* ─── Ultra-Modern Hero Header & Control Center (#7F1625 & Dark/Light) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0305] via-[#1a050a] to-[#050102] border border-[#7F1625]/40 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F1625]/30 border border-[#7F1625]/50 text-[#ff8ba0] text-xs font-bold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
              {isAr ? 'إدارة الاشتراك والعدادات السحابية • سعة المصنع' : 'Subscription & Quota Management • Active'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1625] flex items-center justify-center shadow-lg shadow-[#7F1625]/50 shrink-0">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span>{isAr ? 'الاشتراك وسعة المصنع والعدادات' : 'Subscription & Quotas'}</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isAr
                ? 'متابعة استهلاك موارد المصنع، حماية صالة القص والإنتاج، وتعديل الباقات وسعات المستخدمين والعمال بالربط الحي مع العمليات الصناعية.'
                : 'Monitor factory resource consumption, production quotas, cutting lay limits, and plan tiers connected live with factory operations.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/40 transition-all flex items-center gap-2 active:scale-95 border border-[#ff4d6d]/30 cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isAr ? 'ترقية الباقة' : 'Upgrade Plan'}</span>
            </button>

            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'استثناء تشغيلي طارئ' : 'Emergency Override'}</span>
            </button>

            {report && (
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                title={isAr ? 'طباعة شهادة السعة المعتمدة' : 'Print Certificate'}
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'شهادة السعة (A4)' : 'Certificate'}</span>
              </button>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              title={isAr ? 'تحديث العدادات' : 'Refresh'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#ff8ba0]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* ─── Active Overrides Banner (if any) ─── */}
      {activeOverrides.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-800 dark:text-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <h4 className="font-bold text-sm text-slate-900 dark:text-amber-100">
                {isAr ? 'استثناءات تشغيلية نشطة لصالة القص والإنتاج' : 'Active Production Overrides'}
              </h4>
            </div>
            <Badge variant="warning" className="text-xs font-mono font-bold">
              {activeOverrides.length} {isAr ? 'استثناء معتمد' : 'Active'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeOverrides.map((ov, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-500/20 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{ov.meter_key}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-mono font-bold">
                      {isAr ? 'الحد المؤقت:' : 'Limit:'} {ov.temporary_limit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {ov.reason || (isAr ? 'استثناء لتلبية طلبات التصدير' : 'Operational boost')}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span>{ov.expires_at ? new Date(ov.expires_at).toLocaleDateString('ar-EG') : 'نشط'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Critical Warning Banner if any quota >= 85% ─── */}
      {hasCriticalWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {isAr ? 'تنبيه اقتراب حصة الاستهلاك (85%+)' : 'Resource Quota Warning (85%+ reached)'}
            </div>
            <p className="text-slate-700 dark:text-slate-300">
              {isAr
                ? 'اقترب المصنع من تجاوز الحد المسموح في بعض العدادات. لضمان عدم تعطل إضافة موظفين جدد أو أوامر شراء، يرجى ترقية الباقة أو تفعيل استثناء تشغيلي.'
                : 'Some meters have exceeded 85% capacity. Upgrade your subscription to avoid operational pauses.'}
            </p>
          </div>
        </div>
      )}

      {/* ─── Current Subscription Status Bento Card ─── */}
      {report && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0c0305] via-[#1a050a] to-[#050102] text-white border border-[#7F1625]/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-2 h-full bg-[#7F1625]" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30">
                  {isAr ? report.subscription.plan_name_ar : report.subscription.plan_name_en}
                </span>
                <span className="text-xs uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  {report.subscription.status}
                </span>
                <span className="text-xs text-slate-300 font-semibold">
                  • {report.subscription.billing_cycle === 'annual' ? (isAr ? 'اشتراك سنوي' : 'Annual') : (isAr ? 'اشتراك شهري' : 'Monthly')}
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black font-sans tracking-tight text-white">
                {Number(report.subscription.monthly_price).toLocaleString()} <span className="text-sm font-normal text-slate-400">{isAr ? 'ج.م / شهرياً' : 'EGP / mo'}</span>
              </div>

              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-4 font-mono">
                <span>{isAr ? 'بداية الدورة:' : 'Period Start:'} {report.subscription.current_period_start || '2026-11-04'}</span>
                <span>{isAr ? 'تاريخ التجديد:' : 'Renews on:'} {report.subscription.current_period_end || '2026-12-04'}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4 text-[#7F1625]" />
                {isAr ? 'ترقية سعة المصنع' : 'Upgrade Capacity'}
              </button>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                {isAr ? 'شهادة السعة' : 'Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Production Immunity Policy Note ─── */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-3">
        <Info className="w-5 h-5 shrink-0 text-blue-500" />
        <span className="leading-relaxed">
          {isAr
            ? 'سياسة الحصانة التشغيلية لخطوط الإنتاج: أوامر القص وفرشات الأقمشة المعتمدة لن تتوقف مطلقاً في منتصف الوردية حتى لو بلغت حصة العداد 100% (Soft Limit Policy).'
            : 'Operational Immunity Policy: Cutting floor lay operations are immune from mid-shift blocks even if quota reaches 100% (Soft Limit Policy).'}
        </span>
      </div>

      {/* ─── 12 Visual Interactive Meters Grid ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>{isAr ? 'عدادات الاستهلاك والسعات التشغيلية (12 Meter Dimensions)' : 'Factory Consumption Meters (12 Dimensions)'}</span>
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'اضغط على أي عداد للانتقال للقسم الخاص به مباشرة' : 'Click any card action to jump to the resource module'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metersList.map((m) => {
            let progressColor = 'bg-emerald-500';
            if (m.percent_used >= 100) progressColor = 'bg-rose-500';
            else if (m.percent_used >= 85) progressColor = 'bg-orange-500';
            else if (m.percent_used >= 70) progressColor = 'bg-amber-500';

            const action = getMeterAction(m.meter_key);

            return (
              <Card
                key={m.meter_key}
                className="p-4 bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300">
                        {getMeterIcon(m.meter_key)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {isAr ? m.name_ar : m.name_en}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {m.meter_key}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={m.limit_type === 'hard' ? 'danger' : 'neutral'}
                      className="text-[10px]"
                    >
                      {m.limit_type === 'hard' ? (isAr ? 'حد حاسم' : 'Hard') : (isAr ? 'حد مرن' : 'Soft')}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {m.current_usage.toLocaleString()} / {m.limit >= 999999 ? '∞' : m.limit.toLocaleString()} <span className="text-[11px] font-normal text-slate-500 dark:text-slate-400">{m.unit}</span>
                      </span>
                      <span className={`font-mono text-xs font-bold ${m.percent_used >= 85 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
                        {m.limit >= 999999 ? '0%' : `${m.percent_used}%`}
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${Math.min(100, m.percent_used)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Drill Down Action Button */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {m.limit_type === 'hard' ? (isAr ? 'محمي بسقف حاسم' : 'Strict enforcement') : (isAr ? 'حصانة تشغيلية' : 'Immunity active')}
                  </span>
                  <button
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate(action.tab);
                      } else {
                        window.location.hash = `#/erp/${action.tab}`;
                      }
                    }}
                    className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>{isAr ? action.labelAr : action.labelEn}</span>
                    {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ─── UPGRADE PLAN MODAL ─── */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title={isAr ? 'ترقية سعة وباقة اشتراك المصنع' : 'Upgrade Garment Factory Subscription & Capacity'}
      >
        <div className="space-y-6 text-slate-900 dark:text-white">
          {/* Mode Tabs: Instant Activation vs Manual Payment Proof */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4 text-xs font-bold">
            <button
              onClick={() => setUpgradeMode('instant')}
              className={`pb-2.5 transition flex items-center gap-2 cursor-pointer ${
                upgradeMode === 'instant'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{isAr ? 'ترقية وتفعيل فوري (مالك المصنع)' : 'Instant Owner Activation'}</span>
            </button>
            <button
              onClick={() => setUpgradeMode('payment_proof')}
              className={`pb-2.5 transition flex items-center gap-2 cursor-pointer ${
                upgradeMode === 'payment_proof'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'سداد بنكي / إنستاباي / فودافون كاش' : 'InstaPay & Bank Transfer'}</span>
            </button>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isAr ? 'دفع شهري' : 'Monthly'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCycle('annual')}
                className={`px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {isAr ? 'دفع سنوي (خصم 20% شهرين مجاناً)' : 'Annual (Save 20%)'}
              </button>
            </div>
          </div>

          {upgradeMode === 'instant' ? (
            /* Mode 1: Instant Upgrade Grid */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((p) => {
                const isCurrent = report?.subscription.plan_code === p.code;
                const price = selectedCycle === 'annual' ? Number(p.annual_price) / 12 : Number(p.monthly_price);

                return (
                  <div
                    key={p.code}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {isAr ? p.name_ar : p.name_en}
                        </h4>
                        {isCurrent && (
                          <Badge variant="brand" className="text-[10px]">
                            {isAr ? 'الباقة الحالية' : 'Current'}
                          </Badge>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isAr ? p.description_ar : p.description_en}
                      </p>

                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {Math.round(price).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م/ش' : 'EGP/mo'}</span>
                      </div>

                      <ul className="text-[11px] space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                        {p.code === 'starter' && (
                          <>
                            <li>• {isAr ? 'حتى 3 مستخدمين نشطين' : '3 active users'}</li>
                            <li>• {isAr ? '25 عامل وموظف' : '25 employees'}</li>
                            <li>• {isAr ? '50 فرشة قص شهرياً' : '50 cutting lays/mo'}</li>
                            <li>• {isAr ? 'مستودع قماش رئيسي واحد' : '1 warehouse'}</li>
                          </>
                        )}
                        {p.code === 'pro' && (
                          <>
                            <li>• {isAr ? 'حتى 10 مستخدمين نشطين' : '10 active users'}</li>
                            <li>• {isAr ? '100 عامل وموظف' : '100 employees'}</li>
                            <li>• {isAr ? '300 فرشة قص وباركود QR' : '300 cutting lays & QR'}</li>
                            <li>• {isAr ? '3 فروع ومستودعات' : '3 warehouses & branches'}</li>
                            <li>• {isAr ? 'حساب تكاليف BOM المتقدمة' : 'Advanced BOM costing'}</li>
                          </>
                        )}
                        {p.code === 'enterprise' && (
                          <>
                            <li>• {isAr ? 'مستخدمين غير محدودين (999)' : 'Unlimited users (999)'}</li>
                            <li>• {isAr ? '1,000 عامل وموظف' : '1,000 employees'}</li>
                            <li>• {isAr ? '3,000 فرشة قص شهرياً' : '3,000 cutting lays/mo'}</li>
                            <li>• {isAr ? 'فروع ومستودعات غير محدودة' : 'Multi-plant enterprise'}</li>
                            <li>• {isAr ? 'دعم فني مخصص وأولوية سيرفر' : 'Dedicated support'}</li>
                          </>
                        )}
                      </ul>
                    </div>

                    <div className="pt-4">
                      <Button
                        variant={isCurrent ? 'outline' : 'primary'}
                        className="w-full text-xs font-bold cursor-pointer"
                        disabled={isCurrent || isUpgrading}
                        onClick={() => handleInstantUpgrade(p.code)}
                      >
                        {isCurrent
                          ? (isAr ? 'الباقة المفعلة حالياً' : 'Active Plan')
                          : (isAr ? 'تفعيل وترقية فورية' : 'Activate Instantly')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Mode 2: Payment Proof Form */
            <form onSubmit={handleManualPaymentSubmit} className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-slate-700 dark:text-slate-300">
                <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <span>{isAr ? 'بيانات وحسابات سداد اشتراك المصنع الرسمية:' : 'Official Factory Subscription Accounts:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'إنستاباي (InstaPay):' : 'InstaPay:'}</div>
                    <div className="font-bold text-primary">albatal.factory@instapay</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'البنك الأهلي المصري:' : 'NBE Account:'}</div>
                    <div className="font-bold">1092837465019283</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 font-sans">{isAr ? 'فودافون كاش:' : 'Vodafone Cash:'}</div>
                    <div className="font-bold">01012345678</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {isAr ? 'الباقة المستهدفة' : 'Target Plan'}
                  </label>
                  <select
                    value={selectedPlanForProof}
                    onChange={(e) => setSelectedPlanForProof(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="starter">{isAr ? 'باقة الورش والمشاغل (1,450 ج.م/ش)' : 'Starter (1,450 EGP/mo)'}</option>
                    <option value="pro">{isAr ? 'باقة المصانع المتطورة (3,850 ج.م/ش)' : 'Pro Factory (3,850 EGP/mo)'}</option>
                    <option value="enterprise">{isAr ? 'باقة المجموعات الصناعية الكبرى (8,900 ج.م/ش)' : 'Enterprise (8,900 EGP/mo)'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {isAr ? 'طريقة التحويل' : 'Payment Method'}
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="instapay">{isAr ? 'تطبيق إنستاباي (InstaPay)' : 'InstaPay'}</option>
                    <option value="bank_transfer">{isAr ? 'تحويل بنكي مباشر' : 'Bank Transfer'}</option>
                    <option value="vodafone_cash">{isAr ? 'محفظة فودافون كاش' : 'Vodafone Cash'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isAr ? 'رقم المعاملة / مرجع التحويل *' : 'Transaction Reference / Transfer Number *'}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={isAr ? 'مثال: IP-99248274 أو رقم إيصال الإيداع' : 'e.g. IP-99248274 or deposit slip number'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isAr ? 'إرفاق صورة إيصال التحويل (اختياري)' : 'Upload Receipt Screenshot (Optional)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setProofFile(e.target.files ? e.target.files[0] : null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                  {proofFile && <span className="text-xs text-emerald-600 font-mono font-bold shrink-0">✓ {proofFile.name}</span>}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  {isAr ? 'ملاحظات إضافية' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={isAr ? 'أي بيانات توضيحية لسرعة المطابقة والربط...' : 'Any matching info...'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsUpgradeModalOpen(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmittingProof}>
                  {isSubmittingProof ? (isAr ? 'جارِ الإرسال...' : 'Submitting...') : (isAr ? 'إرسال إشعار السداد' : 'Submit Payment Proof')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* ─── EMERGENCY QUOTA OVERRIDE REQUEST MODAL ─── */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={isAr ? 'طلب استثناء تشغيلي طارئ لخطوط الإنتاج وصالة القص' : 'Request Emergency Factory Quota Override'}
      >
        <form onSubmit={handleRequestOverride} className="space-y-4 text-xs text-slate-900 dark:text-white">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
            {isAr
              ? 'تتيح هذه الخاصية لمديري صالة القص والإنتاج رفع الحصة التشغيلية مؤقتاً لتجنب توقف عمال الوردية أو تأخر تسليمات التصدير، مع تسجيل الإذن رسمياً في سجلات المصنع.'
              : 'Allows factory floor managers to temporarily lift quota constraints to keep production moving with full audit logging.'}
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              {isAr ? 'العداد المراد استثناؤه' : 'Target Meter'}
            </label>
            <select
              value={overrideMeter}
              onChange={(e) => setOverrideMeter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
            >
              <option value="cutting_lays">{isAr ? 'فرشات صالة القص (cutting_lays)' : 'Cutting Lays'}</option>
              <option value="active_employees">{isAr ? 'سجلات العمال والموظفين (active_employees)' : 'Active Employees'}</option>
              <option value="active_users">{isAr ? 'المستخدمين النشطين (active_users)' : 'Active Users'}</option>
              <option value="production_orders">{isAr ? 'أوامر التشغيل الشهرية (production_orders)' : 'Production Orders'}</option>
              <option value="purchase_orders">{isAr ? 'أوامر الشراء (purchase_orders)' : 'Purchase Orders'}</option>
              <option value="garment_models">{isAr ? 'الموديلات والتصميمات (garment_models)' : 'Garment Models'}</option>
              <option value="subcontract_jobs">{isAr ? 'عقود التشغيل للغير (subcontract_jobs)' : 'Subcontract Jobs'}</option>
              <option value="active_warehouses">{isAr ? 'المستودعات والمخازن (active_warehouses)' : 'Warehouses'}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                {isAr ? 'الحد الإضافي المؤقت' : 'Temporary Boost Limit'}
              </label>
              <input
                type="number"
                min="1"
                value={overrideLimit}
                onChange={(e) => setOverrideLimit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                {isAr ? 'المدة بالأيام' : 'Duration (Days)'}
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={overrideDays}
                onChange={(e) => setOverrideDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              {isAr ? 'سبب الاستثناء التشغيلي *' : 'Operational Reason *'}
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder={isAr ? 'مثال: فرشات قص إضافية لتلبية شحنة تصدير عاجلة أو استيعاب عمالة موسمية...' : 'e.g. Urgent export shipment requiring extra lays...'}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsOverrideModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingOverride}>
              {isSubmittingOverride ? (isAr ? 'جارِ التفعيل...' : 'Activating...') : (isAr ? 'تفعيل الاستثناء الطارئ' : 'Activate Override')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── OFFICIAL PRINTABLE CERTIFICATE MODAL ─── */}
      {report && (
        <PrintSubscriptionModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          report={report}
          activeOverrides={activeOverrides}
          isAr={isAr}
        />
      )}
    </div>
  );
};

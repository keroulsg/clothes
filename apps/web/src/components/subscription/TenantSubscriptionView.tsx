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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { TenantSubscriptionReport, SubscriptionPlan } from '../../types';

interface TenantSubscriptionViewProps {
  isAr?: boolean;
}

export const TenantSubscriptionView: React.FC<TenantSubscriptionViewProps> = ({ isAr = true }) => {
  const [report, setReport] = useState<TenantSubscriptionReport | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Emergency override form
  const [overrideMeter, setOverrideMeter] = useState<string>('cutting_lays');
  const [overrideLimit, setOverrideLimit] = useState<number>(100);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [reportRes, plansRes] = await Promise.all([
        api.subscription.getCurrentReport(),
        api.subscription.getPlans(),
      ]);
      setReport(reportRes);
      setPlans(plansRes.plans || []);
    } catch (err: any) {
      console.error('Failed to load subscription data:', err);
      // Demo fallback if backend unavailable
      setReport({
        tenant_id: 'current',
        subscription: {
          plan_code: 'starter',
          plan_name_ar: 'باقة الورش والمشاغل',
          plan_name_en: 'Starter Workshop',
          monthly_price: 1450,
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: '2026-10-01',
          current_period_end: '2026-10-31',
        },
        meters: {
          active_users: { meter_key: 'active_users', name_ar: 'المستخدمين النشطين', name_en: 'Active Users', unit: 'seats', limit_type: 'hard', current_usage: 2, limit: 3, percent_used: 66.7, is_warning_70: false, is_warning_85: false, is_exceeded: false },
          active_employees: { meter_key: 'active_employees', name_ar: 'العمال والموظفين', name_en: 'Employees', unit: 'workers', limit_type: 'hard', current_usage: 18, limit: 25, percent_used: 72.0, is_warning_70: true, is_warning_85: false, is_exceeded: false },
          cutting_lays: { meter_key: 'cutting_lays', name_ar: 'فرشات صالة القص', name_en: 'Cutting Lays', unit: 'lays', limit_type: 'soft', current_usage: 44, limit: 50, percent_used: 88.0, is_warning_70: false, is_warning_85: true, is_exceeded: false },
          production_orders: { meter_key: 'production_orders', name_ar: 'أوامر التشغيل', name_en: 'Production Orders', unit: 'orders', limit_type: 'soft', current_usage: 12, limit: 30, percent_used: 40.0, is_warning_70: false, is_warning_85: false, is_exceeded: false },
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgrade = async (planCode: string) => {
    setIsUpgrading(true);
    setStatusMsg(null);
    try {
      await api.subscription.upgrade({
        plan_code: planCode,
        billing_cycle: selectedCycle,
      });
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تمت ترقية باقة المصنع بنجاح!' : 'Subscription upgraded successfully!',
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

  const handleRequestOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingOverride(true);
    setStatusMsg(null);
    try {
      if (report?.tenant_id) {
        await api.subscription.grantAdminOverride({
          tenant_id: report.tenant_id,
          meter_key: overrideMeter,
          temporary_limit: Number(overrideLimit),
          reason: overrideReason,
          days: 7,
        });
        setStatusMsg({
          type: 'success',
          text: isAr ? 'تم تفعيل الاستثناء التشغيلي الطارئ بنجاح لمدة 7 أيام!' : 'Emergency operational override granted for 7 days!',
        });
        setIsOverrideModalOpen(false);
        await loadData();
      }
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
        return <Users className="w-4 h-4 text-primary" />;
      case 'active_branches':
      case 'active_warehouses':
        return <Building2 className="w-4 h-4 text-indigo-500" />;
      case 'cutting_lays':
        return <Scissors className="w-4 h-4 text-emerald-500" />;
      case 'production_orders':
        return <Layers className="w-4 h-4 text-amber-500" />;
      case 'purchase_orders':
      case 'sales_orders':
        return <ShoppingBag className="w-4 h-4 text-blue-500" />;
      case 'subcontract_jobs':
        return <Package className="w-4 h-4 text-purple-500" />;
      case 'storage_megabytes':
        return <HardDrive className="w-4 h-4 text-slate-500" />;
      default:
        return <Zap className="w-4 h-4 text-primary" />;
    }
  };

  const metersList = report?.meters ? Object.values(report.meters) : [];
  const hasCriticalWarning = metersList.some((m) => m.is_warning_85 || m.is_exceeded);

  return (
    <div className="space-y-6">
      {/* ─── Ultra-Modern Hero Header & Control Center (#7F1625 & #000000) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#000000] via-[#180508] to-[#000000] border border-[#7F1625]/40 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F1625]/30 border border-[#7F1625]/50 text-[#ff8ba0] text-xs font-bold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
              {isAr ? 'إدارة الاشتراك والعدادات السحابية • سعة المصنع' : 'Subscription & Quota Management • Active'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1625] flex items-center justify-center shadow-lg shadow-[#7F1625]/50">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              {isAr ? 'الاشتراك وسعة المصنع والعدادات' : 'Subscription & Quotas'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isAr
                ? 'متابعة استهلاك موارد المصنع، حماية صالة القص والإنتاج، وتعديل الباقات وسعات المستخدمين والعمال.'
                : 'Monitor factory resource consumption, production quotas, cutting lay limits, and plan tiers.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/40 transition-all flex items-center gap-2 active:scale-95 border border-[#ff4d6d]/30"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{isAr ? 'ترقية الباقة' : 'Upgrade Plan'}</span>
            </button>

            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'استثناء تشغيلي طارئ' : 'Emergency Override'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading}
              title={isAr ? 'تحديث العدادات' : 'Refresh'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#ff8ba0]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 2. Critical Warning Banner if any quota >= 85% */}
      {hasCriticalWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {isAr ? 'تنبيه اقتراب حصة الاستهلاك (85%+)' : 'Resource Quota Warning (85%+ reached)'}
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {isAr
                ? 'اقترب المصنع من تجاوز الحد المسموح في بعض العدادات. لضمان عدم تعطل إضافة موظفين جدد أو أوامر شراء، يرجى ترقية الباقة أو تفعيل استثناء تشغيلي.'
                : 'Some meters have exceeded 85% capacity. Upgrade your subscription to avoid operational pauses.'}
            </p>
          </div>
        </div>
      )}

      {/* 3. Current Subscription Status Card Bento-Style */}
      {report && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a0204] via-[#150508] to-[#000000] text-white border border-[#7F1625]/40 shadow-xl relative overflow-hidden">
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

              <div className="text-xs text-slate-400 flex items-center gap-4 font-mono">
                <span>{isAr ? 'بداية الدورة:' : 'Period Start:'} {report.subscription.current_period_start}</span>
                <span>{isAr ? 'تاريخ التجديد:' : 'Renews on:'} {report.subscription.current_period_end}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-black shadow-md transition-all flex items-center gap-1.5"
              >
                <ArrowUpRight className="w-4 h-4 text-[#7F1625]" />
                {isAr ? 'ترقية سعة المصنع' : 'Upgrade Capacity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Production Immunity Policy Note */}
      <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-200 text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-blue-500" />
        <span>
          {isAr
            ? 'سياسة الحصانة التشغيلية لخطوط الإنتاج: أوامر القص وفرشات الأقمشة المعتمدة لن تتوقف مطلقاً في منتصف الوردية حتى لو بلغت حصة العداد 100% (Soft Limit Policy).'
            : 'Operational Immunity Policy: Cutting floor lay operations are immune from mid-shift blocks even if quota reaches 100% (Soft Limit Policy).'}
        </span>
      </div>

      {/* 5. 12 Visual Meters Grid */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span>{isAr ? 'عدادات الاستهلاك والسعات التشغيلية (12 Meter Dimensions)' : 'Factory Consumption Meters (12 Dimensions)'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {metersList.map((m) => {
            let progressColor = 'bg-emerald-500';
            if (m.percent_used >= 100) progressColor = 'bg-rose-500';
            else if (m.percent_used >= 85) progressColor = 'bg-orange-500';
            else if (m.percent_used >= 70) progressColor = 'bg-amber-500';

            return (
              <Card key={m.meter_key} className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
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
                      {m.current_usage} / {m.limit >= 999999 ? '∞' : m.limit} <span className="text-[11px] font-normal text-slate-400">{m.unit}</span>
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
              </Card>
            );
          })}
        </div>
      </div>

      {/* 6. UPGRADE PLAN MODAL */}
      <Modal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title={isAr ? 'ترقية باقة اشتراك مصنع الملابس' : 'Upgrade Garment Factory Subscription'}
      >
        <div className="space-y-6">
          {/* Billing Cycle Switcher */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${
                  selectedCycle === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isAr ? 'دفع شهري' : 'Monthly'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCycle('annual')}
                className={`px-4 py-1.5 rounded-lg transition-colors ${
                  selectedCycle === 'annual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                {isAr ? 'دفع سنوي (وفر شهرين)' : 'Annual (Save 20%)'}
              </button>
            </div>
          </div>

          {/* Plans Grid */}
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

                    <p className="text-[11px] text-slate-500 leading-relaxed">
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
                      className="w-full text-xs font-bold"
                      disabled={isCurrent || isUpgrading}
                      onClick={() => handleUpgrade(p.code)}
                    >
                      {isCurrent
                        ? (isAr ? 'الباقة المفعلة' : 'Active Plan')
                        : (isAr ? 'اختيار وترقية الباقة' : 'Choose Plan')}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>
      {/* 7. EMERGENCY QUOTA OVERRIDE REQUEST MODAL */}
      <Modal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        title={isAr ? 'طلب استثناء تشغيلي طارئ لخطوط الإنتاج' : 'Request Emergency Factory Quota Override'}
      >
        <form onSubmit={handleRequestOverride} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs">
            {isAr
              ? 'تتيح هذه الخاصية لمديري صالة القص والإنتاج رفع الحصة التشغيلية مؤقتاً لمدة 7 أيام لتجنب توقف عمال الوردية أو تأخر تسليمات التصدير.'
              : 'Allows factory floor managers to temporarily lift quota constraints for 7 days to keep production moving.'}
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
              <option value="active_users">{isAr ? 'المستخدمين النشطين (active_users)' : 'Active Users'}</option>
              <option value="active_employees">{isAr ? 'العمال والموظفين (active_employees)' : 'Active Employees'}</option>
              <option value="production_orders">{isAr ? 'أوامر التشغيل (production_orders)' : 'Production Orders'}</option>
              <option value="purchase_orders">{isAr ? 'أوامر الشراء (purchase_orders)' : 'Purchase Orders'}</option>
              <option value="subcontract_jobs">{isAr ? 'عقود التشغيل للغير (subcontract_jobs)' : 'Subcontract Jobs'}</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              {isAr ? 'الحد المؤقت المطلوب' : 'Requested Temporary Limit'}
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
              {isAr ? 'سبب الاستثناء التشغيلي' : 'Operational Reason'}
            </label>
            <textarea
              rows={3}
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder={isAr ? 'مثال: فرشات إضافية لتلبية طلبيات تصدير موسمية...' : 'e.g. Extra cutting lays for urgent export shipment...'}
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
    </div>
  );
};

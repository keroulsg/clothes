import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { api } from '../../../api/client';
import type { Language } from '../../../types';

interface InfoPageProps {
  lang: Language;
  onNavigate?: (page: string) => void;
  onOpenRegister?: (tier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const AboutPage: React.FC<InfoPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#f87171] flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'عن منظومة GarmentOS Cloud' : 'About GarmentOS Cloud'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {isAr
            ? 'نظام تشغيل وإدارة سحابي متخصص في الصناعات النسجية والملابس الجاهزة، مصمم هندسياً لحل أزمات هدر الأقمشة وحسابات التكلفة الحقيقية في مصانع مصر والشرق الأوسط.'
            : 'Specialized enterprise cloud operating system tailored for the apparel and garment manufacturing sector.'}
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'لماذا أنشأنا GarmentOS؟' : 'Our Mission'}
          </h2>
          <p>
            {isAr
              ? 'تعتمد معظم برامج الـ ERP العامة على نماذج تصنيع تجريدية لا تفهم خصوصية صناعة الملابس: فوارق أوزان الـ GSM، نسب هالك عوادم الأطراف في الفرش، تداخل المقاسات والألوان (Matrix Variants)، خلط أمانات العملاء في عقود الـ CMT، وأجور العمال بالقطعة. جاءت GarmentOS لتكون الحل الصناعي الأول المصمم من واقع صالة القص والمخزن.'
              : 'Generic ERPs fail in garment factories because they lack native support for GSM variations, marker efficiency, cutting lay plies, matrix variants, and customer fabric custody.'}
          </p>
        </section>

        <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'أركان البنية الهندسية للمنظومة' : 'Architectural Pillars'}
          </h2>
          <ul className="list-disc pr-5 rtl:pr-5 ltr:pl-5 space-y-2">
            <li>
              <strong>{isAr ? 'عزل أمني تام (Tenant Isolation):' : 'Tenant Isolation:'}</strong>{' '}
              {isAr
                ? 'كل مصنع يمتلك بيئته المعزولة تماماً مع حماية سرية الموديلات وقوائم التكاليف.'
                : 'Complete cryptographic and tenant-scoped data isolation ensuring design and costing confidentiality.'}
            </li>
            <li>
              <strong>{isAr ? 'سحابة بالكامل (100% Cloud Native):' : '100% Cloud Native:'}</strong>{' '}
              {isAr
                ? 'تعمل من أي متصفح أو تابلت في صالة القص دون حاجة لخوادم داخلية مكلفة.'
                : 'Runs smoothly in any modern browser or cutting-floor tablet without costly on-premise infrastructure.'}
            </li>
            <li>
              <strong>{isAr ? 'دفاتر تدقيق غير قابلة للتعديل (Immutable Ledgers):' : 'Immutable Audit Ledgers:'}</strong>{' '}
              {isAr
                ? 'توثيق دقيق لكل متر قماش وكل حزمة منتجة لمنع التلاعب والتوالف غير المبررة.'
                : 'Strict audit trails for every fabric metre and bundle scan to prevent unauthorized scrap or wage discrepancies.'}
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export const PricingPage: React.FC<InfoPageProps> = ({ lang, onOpenRegister }) => {
  const isAr = lang === 'ar';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<any[]>([]);
  const [featuresCatalog, setFeaturesCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchPlans = async () => {
      try {
        const res = await api.saas.getPublicPlans('erp');
        if (mounted && res && res.plans) {
          setPlans(res.plans);
          setFeaturesCatalog(res.features_catalog || []);
        }
      } catch (err) {
        console.error('Failed to load ERP pricing plans:', err);
        if (mounted) setLoadError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPlans();
    return () => {
      mounted = false;
    };
  }, []);

  // Pricing cards are rendered only from the authoritative plans API.
  const displayedPlans = plans;

  // Feature keys and human labels
  const featureLabel = (key: string) => {
    const feat = featuresCatalog.find((f) => f.feature_key === key);
    if (feat) {
      return isAr ? feat.name_ar : feat.name_en;
    }
    const map: Record<string, { ar: string; en: string }> = {
      'erp.inventory': { ar: 'مخازن الأقمشة والباركود', en: 'Fabric Warehouses & Barcode' },
      'erp.cutting': { ar: 'أوامر وصالات القص والفرش', en: 'Cutting Floors & Lay Tracking' },
      'erp.purchasing': { ar: 'المشتريات والموردين والـ GRN', en: 'Procurement & Suppliers' },
      'erp.sales': { ar: 'المبيعات ونقاط البيع والفواتير', en: 'Sales Orders & Invoicing' },
      'erp.production': { ar: 'تخطيط الإنتاج وتتبع الحزم', en: 'Production & Bundle Tracking' },
      'erp.costing': { ar: 'حسابات التكاليف وشيت التكلفة', en: 'Product Costing Sheets' },
      'erp.accounting': { ar: 'المحاسبة العامة وقيود اليومية', en: 'General Ledger & Accounting' },
      'erp.payroll': { ar: 'المرتبات وأجور القطعة', en: 'Payroll & Piece-Rate Wages' },
      'erp.storefront': { ar: 'متجر إلكتروني B2B خاص بالمصنع', en: 'Branded B2B Storefront' },
      'erp.subcontracting': { ar: 'عقود التشغيل للغير والـ CMT', en: 'CMT Subcontracting' },
      'erp.advanced_reports': { ar: 'التقارير التحليلية المتقدمة', en: 'Advanced Intelligence Reports' },
      'erp.maintenance': { ar: 'صيانة الماكينات والأصول', en: 'Machine Maintenance & Assets' },
      'waslat_worsh.marketplace_provider': { ar: 'تقديم عروض الأسعار في سوق وصلة ورش', en: 'Waslat Worsh Provider Eligibility' },
    };
    return map[key] ? (isAr ? map[key].ar : map[key].en) : key;
  };

  const hasFeature = (plan: any, featureKey: string) => {
    const feats = plan.features || [];
    if (Array.isArray(feats)) {
      return feats.includes(featureKey) || feats.includes(featureKey.replace('erp.', ''));
    }
    if (typeof feats === 'object') {
      return !!feats[featureKey];
    }
    return false;
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand-subtle)] text-[var(--brand-primary)] text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAr ? 'خطط أسعار موحدة ومباشرة' : 'Transparent SaaS Packages'}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
          {isAr ? 'باقات اشتراك GarmentOS ERP المصممة لمصنعك' : 'GarmentOS ERP Plans Tailored to Your Factory'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {isAr
            ? 'ابدأ تجربة مجانية كاملة الميزات لمدة 14 يوماً بدون بطاقة ائتمان مسبقة. الترقية أو التحويل متاح بمرونة تامة.'
            : 'Start with a 14-day free trial. No credit card required. Upgrade or adapt anytime.'}
        </p>

        {/* Monthly vs Annual Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <span className={`text-xs font-bold ${billingCycle === 'monthly' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {isAr ? 'فوترة شهرية' : 'Monthly Billing'}
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
            className="w-14 h-7 rounded-full bg-slate-200 dark:bg-slate-700 p-1 flex items-center transition-colors cursor-pointer relative"
          >
            <div
              className={`w-5 h-5 rounded-full bg-[var(--brand-primary)] text-white shadow-md transform transition-transform ${
                billingCycle === 'annual' ? (isAr ? '-translate-x-7' : 'translate-x-7') : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${billingCycle === 'annual' ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            <span>{isAr ? 'فوترة سنوية' : 'Annual Billing'}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/20">
              {isAr ? 'وفر شهرين مجاناً' : '2 Months Free'}
            </span>
          </span>
        </div>
      </div>

      {/* Package Cards */}
      {loading && plans.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-400">
          <Sparkles className="w-6 h-6 animate-spin mx-auto mb-3 text-rose-600" />
          <span>{isAr ? 'جارِ تحميل باقات الاشتراك المعتمدة...' : 'Loading verified SaaS packages...'}</span>
        </div>
      ) : displayedPlans.length === 0 ? (
        <div role="alert" className="py-16 px-6 text-center rounded-2xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200">
          <p className="font-bold">{isAr ? 'تعذر تحميل الأسعار المعتمدة' : 'Verified pricing is unavailable'}</p>
          <p className="mt-2 text-sm">{isAr ? 'لا نعرض أسعاراً تجريبية أو قديمة. يرجى المحاولة لاحقاً أو التواصل مع المبيعات.' : 'Demo or stale prices are hidden. Please retry later or contact sales.'}</p>
          {loadError && <button type="button" onClick={() => window.location.reload()} className="mt-4 underline font-semibold">{isAr ? 'إعادة المحاولة' : 'Retry'}</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {displayedPlans.map((p) => {
          const isPopular = p.is_popular || p.code === 'pro' || p.id === 'pro';
          const monthlyRate = Number(p.monthly_price) || 0;
          const annualRate = Number(p.annual_price) || monthlyRate * 10;
          const displayPrice = billingCycle === 'annual' ? Math.round(annualRate / 12) : monthlyRate;
          const title = isAr ? p.name_ar : (p.name_en || p.name_ar);
          const desc = isAr ? p.description_ar : (p.description_en || p.description_ar);
          const planCode = p.code || p.id;

          return (
            <div
              key={p.id || p.code}
              className={`p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between relative ${
                isPopular
                  ? 'border-[var(--brand-primary)] shadow-2xl ring-2 ring-[var(--brand-border)]'
                  : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-[var(--brand-primary)] text-white text-[10px] font-black tracking-wide shadow-md">
                  {isAr ? 'الأكثر طلباً واختياراً للمصانع' : 'Most Popular Choice'}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white font-sans">
                    {title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px] leading-relaxed">
                    {desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white font-mono">
                      {displayPrice.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-sans">
                      {isAr ? 'ج.م / شهرياً' : 'EGP / month'}
                    </span>
                  </div>
                  {billingCycle === 'annual' && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      {isAr ? `تُسدد سنوياً ${annualRate.toLocaleString()} ج.م` : `Billed annually ${annualRate.toLocaleString()} EGP`}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {isAr ? 'أبرز ميزات الباقة:' : 'Included Highlights:'}
                  </div>
                  <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    {(Array.isArray(p.features) ? p.features : []).slice(0, 6).map((fk: string, fIdx: number) => (
                      <li key={fIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-medium">{featureLabel(fk)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <button
                  onClick={() => onOpenRegister?.(planCode as any)}
                  className={`w-full py-3 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-sm ${
                    isPopular
                      ? 'btn-brand-primary text-white shadow-md hover:opacity-95'
                      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {isAr ? 'بدء التجربة المجانية (14 يوماً)' : 'Start 14-Day Free Trial'}
                </button>
                <div className="text-center mt-2">
                  <span className="text-[10px] text-slate-400">
                    {isAr ? 'لا حاجة لبطاقة ائتمان مسبقة' : 'No credit card required'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Feature Comparison Matrix */}
      <div className="space-y-6 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'جدول مقارنة الميزات التفصيلية' : 'Detailed Feature Matrix'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'قارن الميزات والصلاحيات بين الباقات' : 'Compare Modules Across Plans'}
          </h2>
        </div>

        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <table className="w-full text-start border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-start font-black text-slate-900 dark:text-white font-sans w-2/5">
                  {isAr ? 'الميزة / الوحدة البرمجية' : 'Feature / Module'}
                </th>
                {displayedPlans.map((p) => (
                  <th key={p.id || p.code} className="p-4 text-center font-black text-slate-900 dark:text-white font-sans">
                    {isAr ? p.name_ar : (p.name_en || p.name_ar)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                { key: 'erp.inventory', ar: 'إدارة مخازن الأقمشة وبكر القماش وتتبع الأمتار', en: 'Fabric Warehouses & Rolls' },
                { key: 'erp.cutting', ar: 'تخطيط صالة القص والفرش والـ Marker Yield', en: 'Cutting Floor Planning' },
                { key: 'erp.purchasing', ar: 'إدارة المشتريات والموردين وفحص الاستلام GRN', en: 'Procurement & GRN' },
                { key: 'erp.sales', ar: 'المبيعات وحجز المخزون ونقاط البيع POS', en: 'Sales & POS' },
                { key: 'erp.production', ar: 'أوامر الإنتاج وتتبع الحزم والـ Barcode Bundles', en: 'Production & Bundles' },
                { key: 'erp.costing', ar: 'حسابات التكاليف الفعلية والمعيارية للموديلات', en: 'Standard & Actual Costing' },
                { key: 'erp.accounting', ar: 'المحاسبة العامة وشجرة الحسابات والقيود والترحيل', en: 'Accounting & GL' },
                { key: 'erp.payroll', ar: 'المرتبات وأجور القطعة وإنتاجية العمال', en: 'Piece-Rate Payroll' },
                { key: 'erp.storefront', ar: 'متجر إلكتروني B2B خاص بمصنعك واستقبال الطلبات', en: 'B2B Web Storefront' },
                { key: 'erp.subcontracting', ar: 'إدارة عقود التشغيل للغير وخدمات الـ CMT بالكامل', en: 'Subcontracting & CMT' },
                { key: 'erp.advanced_reports', ar: 'لوحات المؤشرات والتقارير المالية والإنتاجية المتقدمة', en: 'Executive Dashboards' },
                { key: 'erp.maintenance', ar: 'صيانة ماكينات الخياطة والأصول وبلاغات الأعطال', en: 'Machine Maintenance' },
                { key: 'waslat_worsh.marketplace_provider', ar: 'أهلية تقديم عروض الأسعار والتشغيل في سوق وصلة ورش', en: 'Waslat Worsh Provider Bid' },
              ].map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? row.ar : row.en}
                  </td>
                  {displayedPlans.map((p) => {
                    const included = hasFeature(p, row.key);
                    return (
                      <td key={p.id || p.code} className="p-4 text-center">
                        {included ? (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const FaqPage: React.FC<InfoPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: isAr ? 'ما هي الفترة التجريبية المجانية وكيف تبدأ؟' : 'What is the 14-day free trial?',
      a: isAr
        ? 'بمجرد تسجيل حساب مصنعك عبر الموقع، يُمنح حسابك فترة تجريبية مجانية كاملة الميزات لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان مسبقة، لتجربة القص وتتبع الحزم والمخازن عملياً.'
        : 'Your factory receives an unrestricted 14-day trial without needing an upfront credit card.',
    },
    {
      q: isAr ? 'كيف يتم حماية عزل بيانات مصنعي عن المصانع الأخرى؟' : 'How is factory data strictly isolated?',
      a: isAr
        ? 'نظام GarmentOS مبني على بنية Multi-Tenancy هندسية صارمة؛ حيث يتم قفل كافة الاستعلامات المخزنية والإنتاجية بـ TenantScope إجباري على مستوى قاعدة البيانات، ولا يمكن لأي مستخدم الوصول لبيانات مصنع آخر.'
        : 'GarmentOS Cloud uses strict server-side TenantScope filters at the database layer, mathematically preventing cross-tenant access.',
    },
    {
      q: isAr ? 'هل يدعم النظام تشغيل الأقمشة لحساب العملاء (CMT)؟' : 'Does the platform support CMT contracts?',
      a: isAr
        ? 'نعم بالكامل! تم تخصيص وحدة كاملة لاستلام خامات العملاء كـ "أمانات تشغيل" معزولة تماماً عن رصيد المصنع، وإصدار أذون تسليم وفواتير أجور تشغيل وخدمات فقط دون خلط التكاليف.'
        : 'Yes, full support for customer material custody receipts (CMR), contract jobs, and labor wage invoicing.',
    },
    {
      q: isAr ? 'هل يتطلب النظام سيرفرات خاصة داخل صالة القص؟' : 'Does it require on-premise factory servers?',
      a: isAr
        ? 'كلا، المنظومة سحابية 100% وتعمل عبر أي متصفح حديث على أجهزة الكمبيوتر أو التابلت والهواتف المتصلة بالإنترنت.'
        : 'No, it is 100% Cloud SaaS accessible from any desktop, laptop, or tablet on the shop floor.',
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'الأسئلة الشائعة حول GarmentOS Cloud' : 'Frequently Asked Questions'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {isAr ? 'إجابات واضحة ومباشرة لأبرز استفسارات أصحاب ومديري مصانع الملابس' : 'Direct answers for apparel factory owners and operations managers'}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((f, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full p-4 sm:p-5 text-start flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <span>{f.q}</span>
              {openIdx === idx ? <ChevronUp className="w-4 h-4 text-[var(--brand-primary)]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-5 sm:px-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContactPage: React.FC<InfoPageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.public.submitContact({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        company_name: company.trim() || undefined,
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      setSuccess(res.message);
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || (isAr ? 'فشل إرسال الطلب، يرجى المحاولة لاحقاً.' : 'Failed to submit inquiry, please try again later.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'تواصل مع فريق خبراء GarmentOS' : 'Contact Our Technical Team'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          {isAr
            ? 'سواء كنت ترغب في استشارة فنية لهندسة صالة القص، أو تحتاج لربط مخصص لخطوط إنتاجك، فريقنا التقني جاهز لمساعدتك.'
            : 'Reach out for live demonstrations, shop floor onboarding, or enterprise integrations.'}
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-6">
            {success}
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-bold mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                {isAr ? 'الاسم بالكامل' : 'Full Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                {isAr ? 'البريد الإلكتروني' : 'Email Address'} *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 dark:text-white mb-1">
                {isAr ? 'اسم المصنع أو الشركة' : 'Factory / Company Name'}
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 dark:text-white mb-1">
              {isAr ? 'الرسالة أو متطلبات صالة القص' : 'Message / Floor Requirements'} *
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-brand-primary px-6 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{loading ? (isAr ? 'جارِ الإرسال...' : 'Sending...') : (isAr ? 'إرسال طلب الاستشارة' : 'Submit Request')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

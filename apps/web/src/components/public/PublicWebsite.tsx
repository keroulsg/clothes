import React, { useState } from 'react';
import {
  Scissors,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Boxes,
  Layers,
} from 'lucide-react';
import type { Language } from '../../types';
import { PublicPageHeader } from './PublicPageHeader';
import { PublicPageFooter } from './PublicPageFooter';
import {
  PrivacyPage,
  TermsPage,
  RefundPage,
  CookiesPage,
  IpPage,
} from './pages/LegalPages';
import {
  AllFeaturesPage,
  ManufacturingPage,
  InventoryPage,
  CostingPage,
  WorkforcePage,
  SubcontractingPage,
  StorefrontPage,
} from './pages/FeaturePages';
import {
  AboutPage,
  PricingPage,
  FaqPage,
  ContactPage,
} from './pages/InfoPages';

export interface PublicWebsiteProps {
  lang: Language;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  currentPage?: string;
  onNavigatePage?: (page: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (planTier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  lang,
  onToggleLang,
  isDark = false,
  onToggleTheme,
  currentPage = 'home',
  onNavigatePage,
  onOpenLogin,
  onOpenRegister,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [activePage, setActivePage] = useState<string>(currentPage);

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (onNavigatePage) {
      onNavigatePage(page);
    }
    window.location.hash = page === 'home' ? '#/' : `#/${page}`;
  };

  // Synchronize when parent prop changes
  React.useEffect(() => {
    if (currentPage && currentPage !== activePage) {
      setActivePage(currentPage);
    }
  }, [currentPage]);

  // Home Page View
  const renderHomeContent = () => (
    <div className="space-y-16 lg:space-y-24">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#7F1625] via-[#5c0f1b] to-black px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center text-white">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-xs font-semibold text-rose-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'المنظومة السحابية الأولى لصناعة الملابس في مصر والشرق الأوسط' : 'The First Cloud ERP Built for Apparel Manufacturers'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight font-sans">
            {isAr ? (
              <>
                تحكم كامل في <span className="text-rose-300">صالة القص</span>، مخازن الأقمشة، وعقود الـ CMT
              </>
            ) : (
              <>
                Engineered Command for <span className="text-rose-300">Cutting Floors</span>, Fabric Stock & CMT
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-rose-100/90 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'وداعاً لهدر الأقمشة وحسابات التكلفة التقديرية. منظومة متكاملة لضبط استهلاك الراقات، تتبع حزم الإنتاج بالباركود الذكي، وعزل أمانات تشغيل العملاء.'
              : 'Eliminate fabric waste, optimize multi-ply markers, trace barcode bundles across lines, and isolate customer custody materials.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onOpenRegister('professional')}
              className="px-6 py-3 rounded-xl bg-white text-[#7F1625] font-black text-xs sm:text-sm hover:bg-rose-50 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-black/30"
            >
              <span>{isAr ? 'بدء التجربة المجانية (14 يوماً)' : 'Start 14-Day Free Trial'}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleNavigate('manufacturing')}
              className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <span>{isAr ? 'استكشف صالة القص' : 'Explore Cutting Engine'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Key Industry Metrics Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl text-center">
          <div className="space-y-1 p-2">
            <div className="text-2xl sm:text-3xl font-black text-[#7F1625] dark:text-[#f87171] font-mono">15% - 22%</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'وفر في هدر الأقمشة' : 'Fabric Waste Reduction'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'عبر ضبط التعشيق وطول الفرشة' : 'Via marker & ply optimization'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">100%</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'تتبع دقيق لحزم الإنتاج' : 'Bundle Traceability'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'باركود ذكي لكل مقاس ولون' : 'Serialized QR tickets'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">0 خلط</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'أمانات أقمشة العملاء' : 'Zero Custody Mixups'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'عزل كامل لعقود الـ CMT' : 'Strict CMT custody isolation'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">100% آلي</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'حساب أجور القطعة' : 'Automated Piece Wages'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'صرف مستحقات العمال بدون نزاع' : 'Direct bundle scan payroll'}</div>
          </div>
        </div>
      </section>

      {/* 3. Core Modules Interactive Preview Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'الوحدات المصممة لواقع مصانع الملابس' : 'Built for the Realities of Garment Floor Operations'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'كل وحدة في GarmentOS صممت لمعالجة تحديات تشغيلية حقيقية تبدأ من وصول أثواب القماش حتى تسليم الكراتين للمخازن والعملاء.'
              : 'Every module addresses real operational bottlenecks from fabric roll receipt to carton dispatch.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => handleNavigate('manufacturing')}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#7F1625] dark:hover:border-[#9E2A3B] transition-all cursor-pointer space-y-4 shadow-xs group"
          >
            <div className="p-3 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] w-fit group-hover:scale-105 transition-transform">
              <Scissors className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'صالة القص والفرش والـ GSM' : 'Cutting Floor & GSM Engine'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'حساب كفاءة التعشيق، عدد طبقات الفرشة، والتحكم في نسب الهالك المسموح بها مع توليد أوامر القص الذكية.'
                : 'Marker yield calculation, ply count optimization, and waste threshold management.'}
            </p>
            <div className="text-xs font-bold text-[#7F1625] dark:text-[#f87171] flex items-center gap-1">
              <span>{isAr ? 'التفاصيل الكاملة' : 'Read more'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div
            onClick={() => handleNavigate('subcontracting')}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#7F1625] dark:hover:border-[#9E2A3B] transition-all cursor-pointer space-y-4 shadow-xs group"
          >
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 w-fit group-hover:scale-105 transition-transform">
              <Boxes className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'عقود التشغيل للغير (CMT)' : 'CMT Subcontracting & Custody'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'عزل أمانات العملاء، تتبع خروج الحزم لورش التطريز والمطابع، وإصدار فواتير أجور الخدمات بدقة.'
                : 'Isolate customer fabrics, track external print and embroidery stages, and issue service invoices.'}
            </p>
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>{isAr ? 'التفاصيل الكاملة' : 'Read more'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div
            onClick={() => handleNavigate('inventory')}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#7F1625] dark:hover:border-[#9E2A3B] transition-all cursor-pointer space-y-4 shadow-xs group"
          >
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit group-hover:scale-105 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isAr ? 'دفتر الأستاذ المخزني والمطابقة' : 'Fabric Ledger & 3-Way PO Matching'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isAr
                ? 'سجل غير قابل للتعديل لكل متر قماش، مطابقة أوامر الشراء مع أذون الاستلام وفواتير الموردين.'
                : 'Immutable stock ledger tracking meters and rolls with 3-way matching of purchase orders.'}
            </p>
            <div className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <span>{isAr ? 'التفاصيل الكاملة' : 'Read more'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Pricing CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center md:text-start">
            <h3 className="text-xl sm:text-2xl font-black font-sans">
              {isAr ? 'جاهز لتحويل مصنعك لمنظومة سحابية ذكية؟' : 'Ready to upgrade your garment operations?'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg">
              {isAr
                ? 'ابدأ تجربة مجانية لمدة 14 يوماً مع كافة الميزات مفعلة بالكامل دون الحاجة لبطاقة ائتمان.'
                : 'Start your 14-day free trial with all features enabled. Zero setup fees, cancel anytime.'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenRegister('professional')}
              className="btn-brand-primary px-6 py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer"
            >
              {isAr ? 'بدء التجربة المجانية' : 'Start Free Trial'}
            </button>
            <button
              onClick={() => handleNavigate('pricing')}
              className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {isAr ? 'عرض الباقات' : 'View Pricing'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-[#7F1625] selection:text-white transition-colors duration-200"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Shared Enterprise Public Header */}
      <PublicPageHeader
        lang={lang}
        onToggleLang={onToggleLang}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        currentPage={activePage}
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
      />

      {/* Main Page Content Body */}
      <main className="flex-1 w-full max-w-full min-w-0">
        {activePage === 'home' && renderHomeContent()}
        {activePage === 'features' && <AllFeaturesPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'manufacturing' && <ManufacturingPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'inventory' && <InventoryPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'subcontracting' && <SubcontractingPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'costing' && <CostingPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'workforce' && <WorkforcePage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'storefront' && <StorefrontPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'pricing' && <PricingPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'about' && <AboutPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'faq' && <FaqPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'contact' && <ContactPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'privacy' && <PrivacyPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'terms' && <TermsPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'refund' && <RefundPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'cookies' && <CookiesPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
        {activePage === 'ip' && <IpPage lang={lang} onNavigate={handleNavigate} onOpenRegister={onOpenRegister} />}
      </main>

      {/* Shared Enterprise Public Footer */}
      <PublicPageFooter
        lang={lang}
        onNavigate={handleNavigate}
        onOpenLogin={onOpenLogin}
        onOpenRegister={() => onOpenRegister('professional')}
      />
    </div>
  );
};

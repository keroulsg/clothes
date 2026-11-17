import React, { useState } from 'react';
import {
  Scissors,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Boxes,
  Layers,
  Store,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Palette,
  Eye,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingUp,
} from 'lucide-react';
import type { Language } from '../../types';
import { api } from '../../api/client';
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
import { WaslatWorshPublicPage } from './pages/WaslatWorshPublicPage';

export interface PublicWebsiteProps {
  lang: Language;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  currentPage?: string;
  onNavigatePage?: (page: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (planTier?: 'starter' | 'professional' | 'enterprise') => void;
  isAuthenticated?: boolean;
  onGoToDashboard?: () => void;
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
  isAuthenticated = false,
  onGoToDashboard,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [activePage, setActivePage] = useState<string>(currentPage);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Quick Demo Request form state
  const [demoFactoryName, setDemoFactoryName] = useState('');
  const [demoContactName, setDemoContactName] = useState('');
  const [demoPhone, setDemoPhone] = useState('');
  const [demoLines, setDemoLines] = useState('1-3');
  const [demoNotes, setDemoNotes] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [demoError, setDemoError] = useState('');

  const handleNavigate = (page: string) => {
    setActivePage(page);
    if (onNavigatePage) {
      onNavigatePage(page);
    }
    window.location.hash = page === 'home' ? '#/' : `#/${page}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize when parent prop changes
  React.useEffect(() => {
    if (currentPage && currentPage !== activePage) {
      setActivePage(currentPage);
    }
  }, [currentPage]);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoContactName.trim() || !demoPhone.trim()) {
      setDemoError(isAr ? 'يرجى إدخال الاسم ورقم الهاتف على الأقل.' : 'Please provide name and phone number.');
      return;
    }
    setDemoSubmitting(true);
    setDemoError('');
    try {
      await api.public.submitContact({
        name: demoContactName,
        email: `${demoPhone.replace(/[^0-9]/g, '') || 'factory'}@garmentos.cloud`,
        phone: demoPhone,
        company_name: demoFactoryName,
        subject: `طلب عرض توضيحي (Demo) - ${demoLines} خطوط إنتاج`,
        message: demoNotes || 'طلب عرض توضيحي مباشر لمنظومة GarmentOS Cloud من الصفحة الرئيسية.',
      });
      setDemoSuccess(true);
      setDemoFactoryName('');
      setDemoContactName('');
      setDemoPhone('');
      setDemoNotes('');
    } catch (err: any) {
      setDemoError(err.message || (isAr ? 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً.' : 'Failed to send request.'));
    } finally {
      setDemoSubmitting(false);
    }
  };

  const workflowSteps = [
    {
      step: '01',
      title: isAr ? 'استلام وفحص الأثواب' : 'Fabric Inspection & Roll Intake',
      desc: isAr ? 'مطابقة أوزان الـ GSM، قياس عرض التوب، وحجز أمانات العملاء في عقود الـ CMT.' : 'GSM verification, width check, and strict customer custody isolation.',
      icon: <Layers className="w-5 h-5 text-blue-500" />,
    },
    {
      step: '02',
      title: isAr ? 'هندسة صالة القص والفرش' : 'Marker Yield & Cutting Engine',
      desc: isAr ? 'تخطيط الفرشة، حساب نسبة التعشيق وهالك الأطراف، وإصدار أوامر القص الذكية.' : 'Lay planning, marker efficiency calculation, and scrap threshold control.',
      icon: <Scissors className="w-5 h-5 text-rose-500" />,
    },
    {
      step: '03',
      title: isAr ? 'بطاقات حزم الباركود الذكية' : 'Smart Barcode Bundle Tagging',
      desc: isAr ? 'توليد أوتوماتيكي لتذاكر الحزم المرقمة بكل مقاس ولون لمنع اختلاط القطع.' : 'Serialized QR tickets per color and size for flawless floor routing.',
      icon: <Cpu className="w-5 h-5 text-purple-500" />,
    },
    {
      step: '04',
      title: isAr ? 'خطوط الحياكة والمراحل الخارجية' : 'Assembly & CMT Subcontracting',
      desc: isAr ? 'تتبع خروج ودخول الحزم للمطابع والتطريز مع احتساب أجور القطعة فورياً.' : 'Track external embroidery and print stages while tallying piece wages.',
      icon: <Boxes className="w-5 h-5 text-amber-500" />,
    },
    {
      step: '05',
      title: isAr ? 'محطة الجودة والتشطيب والكي' : 'QC Inspection, Pressing & Packing',
      desc: isAr ? 'فحص القطع، رصد الهالك والمعاد تشغيله، وعزل المرفوضات قبل التعبئة.' : 'Pass/rework/scrap gateway ensuring only approved units enter packing.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />,
    },
    {
      step: '06',
      title: isAr ? 'إدارة الكراتين والمتجر الإلكتروني' : 'Carton Dispatch & Online Storefront',
      desc: isAr ? 'تحزيم الكراتين بالباركود وربط المخزون بالمتجر الإلكتروني للبيع الفوري والجملة.' : 'Carton-level dispatch linked live to your wholesale & retail storefront.',
      icon: <Store className="w-5 h-5 text-indigo-500" />,
    },
  ];

  const faqItems = [
    {
      q: isAr ? 'كيف تضمن المنظومة عدم خلط أقمشة العملاء في عقود التشغيل للغير (CMT)؟' : 'How does GarmentOS prevent fabric custody mix-ups in CMT contracts?',
      a: isAr
        ? 'تعتمد المنظومة على سجل مخزني معزول تماماً لأمانات العملاء (Customer Custody Ledger). عند استلام أي قماش لتشغيله للغير، يُقيد برقم العميل والعقد ولا يختلط بأصول المصنع ولا يظهر في تقييم مخزونك التجاري، ويتم تتبع استهلاكه في أوامر القص بصورة منفصلة وموثقة بتقرير استهلاك معتمد.'
        : 'GarmentOS maintains an isolated customer custody ledger where incoming fabrics are locked to specific client contracts without contaminating factory inventory assets, tracked separately through every lay.',
    },
    {
      q: isAr ? 'هل يحتاج مصنعنا لشراء أجهزة كمبيوتر مخصصة أو سيرفرات داخلية باهظة؟' : 'Do we need expensive on-premise servers or specialized IT equipment?',
      a: isAr
        ? 'إطلاقاً. منظومة GarmentOS سحابية بالكامل (Cloud-Native 100%). كل ما تحتاجه هو اتصال بالإنترنت وأي جهاز عادي — هاتف ذكي، تابلت بسيط في صالة القص لمسح الباركود، أو حاسوب محمول لمسؤولي الحسابات والتخطيط.'
        : 'Not at all. GarmentOS is 100% cloud-native. Floor operators use any standard tablet or smartphone for bundle scanning, while managers access full reports from any browser.',
    },
    {
      q: isAr ? 'كيف يعمل المتجر الإلكتروني (WOOC Storefront) وهل هو مربوط بالمصنع؟' : 'How does the integrated Storefront work and is it tied to the factory?',
      a: isAr
        ? 'نعم، المتجر ليس موقعاً معزولاً، بل هو واجهة مبيعات مباشرة مربوطة بصالة الإنتاج والمخازن. عند قيام المشتري أو تاجر الجملة بالطلب، تُحجز الكميات تلقائياً وتنتقل للمخزن لتجهيز الشحن، مع دعم كامل للدفع عند الاستلام (COD) والتحويل البنكي الفوري عبر InstaPay وتتبع حالة الشحن.'
        : 'Yes, the storefront is natively wired to your finished goods inventory. When wholesale buyers or consumers place orders, stock is instantly reserved with support for COD and InstaPay.',
    },
    {
      q: isAr ? 'ما هي بورصة "وصلة ورش" ومن يحق له تقديم عروض الأسعار عليها؟' : 'What is "Waslat Worsh" and who is eligible to bid on cutting RFQs?',
      a: isAr
        ? 'وصلة ورش هي أول بورصة صناعية B2B لتبادل طاقات صالات القص في مصر. يحق لأي صاحب ورشة أو مصمم نشر طلبات القص (RFQ)، بينما يقتصر تقديم عروض الأسعار والتشغيل على المصانع المعتمدة المشتركة في الباقة المؤسسية (Enterprise) لضمان أعلى معايير الجودة والالتزام بالمواعيد.'
        : 'Waslat Worsh is a cutting-floor capacity exchange. Anyone can publish RFQs, but only verified factories on the Enterprise ERP tier are eligible to submit bids to ensure technical quality.',
    },
    {
      q: isAr ? 'هل توجد فترة تجربة مجانية، وماذا يحدث لبياناتنا بعد انتهاء التجربة؟' : 'Is there a free trial, and what happens to our data after it ends?',
      a: isAr
        ? 'نعم، نوفر تجربة مجانية كاملة الميزات لمدة 14 يوماً بدون الحاجة لأي بطاقة ائتمان. عند الترقية إلى أي باقة تظل جميع بياناتك وموديلاتك محفوظة دون انقطاع، مع إمكانية تصدير كافة بياناتك في أي وقت.'
        : 'Yes, we provide a 14-day fully-featured trial with zero credit card required. All your data and models remain completely intact upon subscription.',
    },
  ];

  // Home Page View
  const renderHomeContent = () => (
    <div className="space-y-16 lg:space-y-24">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[var(--brand-primary)] via-[#5c0f1b] to-black px-4 sm:px-6 lg:px-8 pt-20 pb-28 text-center text-white">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md text-xs font-semibold text-rose-100 shadow-sm">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{isAr ? 'المنظومة السحابية الأولى لصناعة الملابس في مصر والشرق الأوسط' : 'The First Cloud ERP Built for Apparel Manufacturers'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight font-sans">
            {isAr ? <span>تحكم كامل في <span className="text-rose-300">صالة القص</span>، مخازن الأقمشة، وعقود الـ CMT</span> : <span>Engineered Command for <span className="text-rose-300">Cutting Floors</span>, Fabric Stock & CMT</span>}
          </h1>

          <p className="text-sm sm:text-base text-rose-100/90 max-w-2xl mx-auto leading-relaxed">
            {isAr
              ? 'منظومة صناعية سحابية متكاملة لضبط استهلاك الراقات وهندسة التعشيق، تتبع حزم الإنتاج بالباركود الذكي، عزل أمانات العملاء، وربط خط الإنتاج مباشرة بمتجرك الإلكتروني وبورصة صالات القص.'
              : 'Eliminate fabric waste, optimize multi-ply markers, trace barcode bundles across lines, isolate customer custody materials, and power direct-to-consumer storefronts.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={() => onOpenRegister('professional')}
              className="px-6 py-3 rounded-xl bg-white text-[var(--brand-primary)] font-black text-xs sm:text-sm hover:bg-rose-50 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-black/30"
            >
              <span>{isAr ? 'بدء التجربة المجانية (14 يوماً)' : 'Start 14-Day Free Trial'}</span>
              <ArrowIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('demo-request-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  handleNavigate('contact');
                }
              }}
              className="px-6 py-3 rounded-xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <span>{isAr ? 'طلب عرض توضيحي (Demo)' : 'Request Live Demo'}</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-[11px] sm:text-xs text-rose-200/80 font-medium border-t border-white/10 mt-6">
            <div className="flex items-center gap-1.5">
              <span>🇪🇬</span>
              <span>{isAr ? 'مصمم خصيصاً لبيئة التصنيع والعمالة المصرية' : 'Tailored for Egyptian & Regional Factories'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'عزل مشفر لبيانات كل مصنع (Tenant Isolation)' : 'Isolated Encrypted Multi-Tenant DB'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAr ? 'بدون سيرفرات — يعمل من أي تابلت أو متصفح' : 'Zero Local Servers — 100% Cloud'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Industry Metrics Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xl text-center">
          <div className="space-y-1 p-2">
            <div className="text-2xl sm:text-3xl font-black text-[var(--brand-primary)] dark:text-[#f87171] font-mono">15% - 22%</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'وفر في هدر الأقمشة' : 'Fabric Waste Reduction'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'عبر ضبط التعشيق وطول الفرشة' : 'Via marker & ply optimization'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">100%</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'تتبع دقيق لحزم الإنتاج' : 'Bundle Traceability'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'باركود ذكي لكل مقاس ولون' : 'Serialized QR tickets'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">{isAr ? '0 خلط' : '0 Mix'}</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'أمانات أقمشة العملاء' : 'Zero Custody Mixups'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'عزل كامل لعقود الـ CMT' : 'Strict CMT custody isolation'}</div>
          </div>
          <div className="space-y-1 p-2 border-s border-slate-100 dark:border-slate-800">
            <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">{isAr ? '100% آلي' : '100% Auto'}</div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{isAr ? 'حساب أجور القطعة' : 'Automated Piece Wages'}</div>
            <div className="text-[11px] text-slate-500">{isAr ? 'صرف مستحقات العمال بدون نزاع' : 'Direct bundle scan payroll'}</div>
          </div>
        </div>
      </section>

      {/* 3. Visual 6-Step Manufacturing Workflow Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>{isAr ? 'رحلة الإنتاج المتكاملة' : 'Integrated End-to-End Workflow'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'من ثوب القماش إلى الكرتونة والمتجر: دورة تصنيع منضبطة هندسياً' : 'From Fabric Roll to Carton & Storefront: Engineered Precision'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'تغطي المنظومة كافة مراحل التشغيل في مصنع الملابس عبر تدفق بيانات متصل يربط المخزن بصالة القص بخطوط الخياطة وحتى منافذ البيع.'
              : 'Every physical stage in your garment factory maps to an audited digital state, keeping inventory, floor operations, and accounting in lockstep.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {workflowSteps.map((ws) => (
            <div
              key={ws.step}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden group hover:border-[var(--brand-primary)]/40 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-[var(--brand-primary)]/40 transition-colors">
                  {ws.step}
                </span>
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                  {ws.icon}
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
                {ws.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {ws.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Core Modules Grid */}
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
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[var(--brand-border)] transition-all cursor-pointer space-y-4 shadow-xs group"
          >
            <div className="p-3 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#f87171] w-fit group-hover:scale-105 transition-transform">
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
            <div className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#f87171] flex items-center gap-1">
              <span>{isAr ? 'التفاصيل الكاملة' : 'Read more'}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </div>
          </div>

          <div
            onClick={() => handleNavigate('subcontracting')}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[var(--brand-border)] transition-all cursor-pointer space-y-4 shadow-xs group"
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
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[var(--brand-border)] transition-all cursor-pointer space-y-4 shadow-xs group"
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

      {/* 5. Dedicated Storefront (WOOC) Spotlight Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/30 p-8 sm:p-12 text-white shadow-xl space-y-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-start max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-[11px] font-bold text-indigo-300">
                <Store className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isAr ? 'المتجر الإلكتروني المدمج (WOOC Storefront)' : 'Integrated B2B & B2C Storefront Engine'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-sans leading-tight">
                {isAr ? (
                  <>اربط خطوط إنتاجك مباشرة <span className="text-indigo-400">بالمبيعات والجملة والقطاعي</span></>
                ) : (
                  <>Bridge Production Directly to <span className="text-indigo-400">Wholesale & Consumer Sales</span></>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'لا حاجة لمنصات تجارة إلكترونية منفصلة أو إدخال يدوي للمخزون. متجرك الإلكتروني مربوط لحظياً برصيد المخازن وصالة الإنتاج: كل طلب يحجز كميته في المخزن فورياً، مع دعم كامل للتحويل عبر إنستاباي والدفع عند الاستلام وتتبع الشحنات بالباركود.'
                  : 'Zero duplicate entries or overselling. Your storefront syncs live with production inventory, complete with InstaPay bank transfers, COD, and real-time delivery tracking.'}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => handleNavigate('storefront')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-950/40 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>{isAr ? 'استكشف إمكانيات المتجر وقوالب العرض' : 'Explore Storefront & Templates'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Design Studio Feature Highlight */}
            <div className="w-full lg:w-80 shrink-0 p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                <Palette className="w-4 h-4" />
                <span>{isAr ? 'محرر المظهر المرئي (Design Studio)' : 'Live Visual Design Studio'}</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                {isAr
                  ? 'تحكم كامل بهوية علامتك التجارية بدون كتابة كود: تخصيص الألوان، الهيدر، البانرات الدعائية، ومظهر أقسام المنتجات بضغطة زر واحدة.'
                  : 'No-code visual theme builder: customize logos, banners, primary colors, and product grid sections with instant live preview.'}
              </p>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <span>{isAr ? 'معاينة فورية' : 'Live Preview'}</span>
                <span className="text-emerald-400 font-mono font-bold">100% Responsive</span>
              </div>
            </div>
          </div>

          {/* 4 Tailored Garment Industry Themes */}
          <div className="border-t border-white/10 pt-6">
            <div className="text-xs font-bold text-slate-300 mb-4">
              {isAr ? '4 قوالب احترافية مصممة خصيصاً لتخصصات مصانع الملابس:' : '4 Tailored Templates for Garment Specialties:'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-indigo-300">1. Modern Boutique</div>
                <div className="text-[11px] text-slate-300">{isAr ? 'مظهر راقٍ وعصري لبراندات الأزياء والمستهلك النهائي.' : 'High-fashion aesthetic for modern retail apparel brands.'}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-amber-300">2. Clean Wholesale</div>
                <div className="text-[11px] text-slate-300">{isAr ? 'مخصص لتجار الجملة مع إمكانية الشراء بالدستة والكرتونة.' : 'Tailored for wholesale bulk buyers with tiered carton pricing.'}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-rose-300">3. Streetwear / Activewear</div>
                <div className="text-[11px] text-slate-300">{isAr ? 'تصميم جريء وديناميكي للملابس الرياضية وأزياء الشارع.' : 'Dynamic high-energy layouts for athleisure & streetwear.'}</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <div className="font-bold text-emerald-300">4. Industrial & Uniform Supply</div>
                <div className="text-[11px] text-slate-300">{isAr ? 'مصمم لعقود الزي الموحد والمصانع واليونيفورم المهني.' : 'Engineered for B2B uniform contracts, workwear, and medical scrubs.'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Waslat Worsh — Cutting Floor Exchange Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/30 p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-4 text-center lg:text-start max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-[11px] font-bold text-rose-300">
                <Scissors className="w-3.5 h-3.5 text-rose-400 -rotate-45" />
                <span>{isAr ? 'بورصة القص والتصنيع B2B • حصري للباقة المؤسسية' : 'B2B Cutting Floor Exchange • Enterprise Exclusive'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-sans leading-tight">
                {isAr ? (
                  <>وصلة ورش: <span className="text-rose-400">سوق تبادل طاقات صالات القص</span> للمصانع والورش</>
                ) : (
                  <>Waslat Worsh: <span className="text-rose-400">Cutting Floor Capacity Exchange</span></>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {isAr
                  ? 'هل تبحث عن صالة قص شاغرة لتنفيذ طلبياتك بالمواصفات الفنية المعتمدة؟ أو تمتلك ماكينات وفرشات بطاقة فائضة وتريد تشغيلها؟ وصلة ورش تربط طالبي ومنفذي خدمات القص بنظام عروض أسعار تنافسي، ومهلة اختيار محددة بـ 60 دقيقة، مع حماية سرية بيانات الطرفين حتى تأكيد السداد الإداري.'
                  : 'Connect with verified cutting floors across Egypt or monetize idle cutting capacity. Full technical specs, competitive bids, 60-minute selection timer, and privacy-first escrow mediation.'}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <button
                  onClick={() => handleNavigate('waslat-worsh')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-900/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Scissors className="w-4 h-4 -rotate-45" />
                  <span>{isAr ? 'استكشف بورصة القص الحية' : 'Explore Live Exchange'}</span>
                  <ArrowIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleNavigate('pricing')}
                  className="px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  {isAr ? 'شروط الاشتراك المؤسسي' : 'Enterprise Access Rules'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto shrink-0">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-2xl font-black text-rose-400">60 دقيقة</div>
                <div className="text-[11px] text-slate-400">{isAr ? 'مهلة قبول العرض' : 'Award Timer'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-2xl font-black text-amber-400">3% + 3%</div>
                <div className="text-[11px] text-slate-400">{isAr ? 'عمولة المنصة الوسيطة' : 'Platform Escrow Fee'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-2xl font-black text-emerald-400">PDF/CAD</div>
                <div className="text-[11px] text-slate-400">{isAr ? 'مواصفات باترون معتمدة' : 'Tech Specs & Markers'}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center space-y-1">
                <div className="text-2xl font-black text-blue-400">Enterprise</div>
                <div className="text-[11px] text-slate-400">{isAr ? 'مصانع معتمدة ومحققة' : 'Verified Factories'}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Interactive FAQ Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
            <HelpCircle className="w-4 h-4" />
            <span>{isAr ? 'الأسئلة الشائعة لأصحاب المصانع' : 'Frequently Asked Questions'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? 'إجابات واضحة لاستفساراتكم التشغيلية' : 'Clear Answers to Factory Operations'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-start flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. Demo Request & Conversion Form Section */}
      <section id="demo-request-section" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans">
              {isAr ? 'احجز عرضاً توضيحياً حياً (Live Demo) لمصنعك' : 'Book a Live Tailored Factory Demo'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
              {isAr
                ? 'يقوم أحد مهندسينا الصناعيين بالتواصل معك لشرح كيفية تطبيق المنظومة على صالة القص وخطوط إنتاجك ومخازنك.'
                : 'One of our industrial ERP specialists will demonstrate how GarmentOS maps directly to your cutting floor and inventory.'}
            </p>
          </div>

          {demoSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                {isAr ? 'تم استلام طلبك بنجاح!' : 'Your Demo Request Has Been Received!'}
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {isAr ? 'سيتواصل معك فريقنا الهندسي عبر الهاتف أو الواتساب خلال ساعات العمل لتحديد موعد العرض.' : 'Our team will contact you shortly via phone or WhatsApp.'}
              </p>
              <button
                onClick={() => setDemoSuccess(false)}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
              >
                {isAr ? 'إرسال طلب آخر' : 'Submit another inquiry'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleDemoSubmit} className="space-y-4 text-xs">
              {demoError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 font-bold">
                  {demoError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">
                    {isAr ? 'اسم المصنع أو الشركة' : 'Factory / Company Name'}
                  </label>
                  <input
                    type="text"
                    value={demoFactoryName}
                    onChange={(e) => setDemoFactoryName(e.target.value)}
                    placeholder={isAr ? 'مثال: مصنع النيل للملابس الجاهزة' : 'e.g. Nile Garments Mfg'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">
                    {isAr ? 'الاسم والصفة' : 'Full Name & Title'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={demoContactName}
                    onChange={(e) => setDemoContactName(e.target.value)}
                    placeholder={isAr ? 'مثال: م. أحمد (مدير التشغيل)' : 'e.g. Ahmed (Operations Manager)'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">
                    {isAr ? 'رقم الهاتف أو الواتساب' : 'Phone or WhatsApp'} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={demoPhone}
                    onChange={(e) => setDemoPhone(e.target.value)}
                    placeholder={isAr ? '010XXXXXXXX' : '+20 10X XXX XXXX'}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-white mb-1">
                    {isAr ? 'حجم المنشأة / عدد خطوط الإنتاج' : 'Facility Size / Production Lines'}
                  </label>
                  <select
                    value={demoLines}
                    onChange={(e) => setDemoLines(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value="1-3">{isAr ? 'ورشة متوسطة (1 - 3 خطوط)' : '1 - 3 Lines'}</option>
                    <option value="4-8">{isAr ? 'مصنع متوسط (4 - 8 خطوط)' : '4 - 8 Lines'}</option>
                    <option value="9+">{isAr ? 'مصنع كبير (أكثر من 9 خطوط)' : '9+ Lines'}</option>
                    <option value="cutting_floor_only">{isAr ? 'صالة قص وتفصيل مستقلة' : 'Dedicated Cutting Floor'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 dark:text-white mb-1">
                  {isAr ? 'أهم التحديات التشغيلية (اختياري)' : 'Main Operational Challenge (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={demoNotes}
                  onChange={(e) => setDemoNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: ضبط هالك الأقمشة، أجور القطعة، ربط المتجر بالمخزن...' : 'e.g. Marker yield, CMT custody, bundle piece wages...'}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <button
                  type="submit"
                  disabled={demoSubmitting}
                  className="btn-brand-primary px-6 py-3 rounded-xl text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{demoSubmitting ? (isAr ? 'جارِ حجز الموعد...' : 'Scheduling...') : (isAr ? 'تأكيد حجز العرض التوضيحي' : 'Confirm Demo Request')}</span>
                </button>

                <div className="text-[11px] text-slate-500">
                  {isAr ? 'أو ابدأ مباشرة:' : 'Or get started instantly:'}{' '}
                  <button
                    type="button"
                    onClick={() => onOpenRegister('professional')}
                    className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] underline cursor-pointer"
                  >
                    {isAr ? 'تجربة مجانية لمدة 14 يوماً' : '14-Day Free Trial'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 9. Final Bottom CTA Banner */}
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
      className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F17] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-[var(--brand-primary)] selection:text-white transition-colors duration-200"
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
        isAuthenticated={isAuthenticated}
        onGoToDashboard={onGoToDashboard}
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
        {activePage === 'waslat-worsh' && <WaslatWorshPublicPage lang={lang} onNavigate={handleNavigate} onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister} />}
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

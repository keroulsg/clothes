import React, { useState } from 'react';
import {
  Scissors,
  Calculator,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
  ChevronDown,
  Globe,
  LogIn,
  Boxes,
  ShoppingCart,
  Check,
  CheckCircle2,
  Sparkle,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Language } from '../../types';

interface PublicWebsiteProps {
  lang: Language;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  onOpenLogin: () => void;
  onOpenRegister: (planTier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  lang,
  onToggleLang,
  onOpenLogin,
  onOpenRegister,
}) => {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setContactSuccess(null);
    setIsSubmittingContact(true);

    try {
      const res = await api.public.submitContact({
        name: contactName.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim() || undefined,
        company_name: contactCompany.trim() || undefined,
        subject: contactSubject.trim() || undefined,
        message: contactMessage.trim(),
      });

      setContactSuccess(res.message);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactCompany('');
      setContactSubject('');
      setContactMessage('');
    } catch (err: any) {
      setContactError(err.message || (isAr ? 'تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.' : 'Failed to send message.'));
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const features = [
    {
      icon: <Scissors className="w-5 h-5 text-white" />,
      badge: isAr ? 'صالة القص والفرش' : 'Cutting Floor',
      title: isAr ? 'هندسة صالة القص وتخطيط الفرش' : 'Cutting Floor & Marker Optimization',
      desc: isAr
        ? 'حساب كفاءة التعشيق (Marker Efficiency %)، عدد طبقات الفرش (Plies)، والتحكم الصارم في نسب الهالك المسموح بها مع توليد أوامر القص الآلية.'
        : 'Marker efficiency optimization, automatic layer/ply planning, and strict waste threshold tracking.',
      planRequired: isAr ? 'المصانع المتكاملة' : 'Professional',
    },
    {
      icon: <Calculator className="w-5 h-5 text-white" />,
      badge: isAr ? 'المخازن والخامات' : 'Fabric Inventory',
      title: isAr ? 'حاسبة استهلاك الأقمشة والـ GSM' : 'Smart GSM & Roll Calculator',
      desc: isAr
        ? 'تحويل فوري دقيق بين الأمتار والكيلوجرامات ووزن المتر المربع (GSM)، وتتبع الأمتار المتبقية في أثواب الأقمشة قبل الفرش لمنع العجز.'
        : 'Bi-directional conversions between meters, kilograms, and GSM with real-time remaining roll metrics.',
      planRequired: isAr ? 'الأساسية' : 'Starter',
    },
    {
      icon: <QrCode className="w-5 h-5 text-white" />,
      badge: isAr ? 'تتبع الباركود' : 'QR Checkpoints',
      title: isAr ? 'بطاقات الحزم الذكية بالباركود' : 'Smart Barcode Bundle Tracking',
      desc: isAr
        ? 'توليد باركود فريد لكل حزمة مقصوصة وتتبع مراحل الخط (خياطة، تشغيل خارجي، كوي، تغليف) مع محطات فحص الجودة الميدانية.'
        : 'Unique QR bundle tickets tracked across cutting, sewing, finishing, and multi-stage QC checkpoints.',
      planRequired: isAr ? 'المصانع المتكاملة' : 'Professional',
    },
    {
      icon: <Boxes className="w-5 h-5 text-white" />,
      badge: isAr ? 'التشغيل للغير' : 'CMT Custody',
      title: isAr ? 'التشغيل للغير وأمانات العملاء (CMT)' : 'CMT & Customer Fabric Custody',
      desc: isAr
        ? 'إدارة عقود التشغيل للغير مع عزل أقمشة ومستلزمات العملاء محاسبياً ومخزنياً كأمانات تشغيل مستبعدة بالكامل من أصول المصنع.'
        : 'Strict segregation of customer-owned fabric custody with isolated stock balances and service fee billing.',
      planRequired: isAr ? 'المصانع المتكاملة' : 'Professional',
    },
    {
      icon: <ShoppingCart className="w-5 h-5 text-white" />,
      badge: isAr ? 'سلاسل الإمداد' : 'Procurement',
      title: isAr ? 'المشتريات والمطابقة الثلاثية' : 'Procurement & 3-Way Matching',
      desc: isAr
        ? 'ربط أمر الشراء مع إذن فحص الجودة بالبوابة وفاتورة المورد لمنع فروقات الأسعار أو استلام خامات غير مطابقة للمواصفات.'
        : 'Rigid 3-way matching between purchase orders, gate QC inspection receipts, and vendor invoices.',
      planRequired: isAr ? 'المصانع المتكاملة' : 'Professional',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      badge: isAr ? 'الأمان السحابي' : 'Data Isolation',
      title: isAr ? 'عزل كامل للمصانع والبيانات' : 'Strict Multi-Tenant Isolation',
      desc: isAr
        ? 'نظام سحابي معزول بالكامل لكل مصنع مع قفل تلقائي للاستعلامات وصلاحيات دقيقة (مالك، مدير إنتاج، محاسب، جودة، عمال).'
        : 'Row-level multi-tenancy enforcing strict data isolation and granular role-based permissions.',
      planRequired: isAr ? 'المؤسسات' : 'Enterprise',
    },
  ];

  const pricingPlans = [
    {
      id: 'starter' as const,
      name: isAr ? 'باقة الورش والمشاغل' : 'Workshops & Small Factories',
      tierLabel: 'Starter',
      popular: false,
      tagline: isAr ? 'مثالية للورش الصغيرة ومشاغل الخياطة حتى 3 مستخدمين' : 'Ideal for workshops up to 3 users',
      price: '750',
      currency: isAr ? 'ج.م' : 'EGP',
      period: isAr ? '/ شهرياً' : '/ month',
      badge: isAr ? 'تجربة 14 يوماً مجاناً' : '14-Day Free Trial',
      features: [
        isAr ? 'حتى 3 مستخدمين للنظام' : 'Up to 3 active users',
        isAr ? 'إدارة صالة القص وأوامر الإنتاج' : 'Cutting orders & production floor',
        isAr ? 'مخزن أقمشة ومستلزمات مركزي' : 'Single central warehouse',
        isAr ? 'حاسبة استهلاك الأقمشة والـ GSM' : 'Fabric roll & GSM calculator',
        isAr ? 'تتبع بطاقات الحزم بالباركود' : 'Barcode bundle tracking',
      ],
      notIncluded: [
        isAr ? 'إدارة عقود التشغيل للغير (CMT)' : 'CMT contract custody',
        isAr ? 'الربط المتعدد بين الفروع والمخازن' : 'Multi-branch operations',
      ],
    },
    {
      id: 'professional' as const,
      name: isAr ? 'باقة المصانع المتكاملة' : 'Integrated Factory Plan',
      tierLabel: 'Professional',
      popular: true,
      tagline: isAr ? 'الخيار الأكثر طلباً للمصانع المتوسطة وخطوط الإنتاج الكاملة' : 'Most popular for growing apparel manufacturers',
      price: '2,500',
      currency: isAr ? 'ج.م' : 'EGP',
      period: isAr ? '/ شهرياً' : '/ month',
      badge: isAr ? 'الأكثر طلباً للمصانع' : 'Most Popular',
      features: [
        isAr ? 'حتى 15 مستخدماً مع أدوار مخصصة' : 'Up to 15 users with custom roles',
        isAr ? 'صالة القص المتقدمة مع حساب الهالك' : 'Advanced cutting floor & waste tracking',
        isAr ? 'تتبع الحزم الذكية بالـ QR عبر الخطوط' : 'QR bundle tracking across line stages',
        isAr ? 'إدارة عقود التشغيل للغير والـ CMT بالكامل' : 'Full CMT & customer fabric custody',
        isAr ? 'أذون استلام وفحص الجودة وتسليم التشغيل' : 'QC inspection gate receipts & delivery',
        isAr ? 'المطابقة الثلاثية للمشتريات وفواتير الموردين' : '3-way matching purchase procurement',
        isAr ? 'إدارة الفروع والمخازن المتعددة' : 'Multi-branch & warehouse management',
      ],
      notIncluded: [],
    },
    {
      id: 'enterprise' as const,
      name: isAr ? 'باقة كبرى المنشآت والمجموعات' : 'Enterprise & Groups',
      tierLabel: 'Enterprise',
      popular: false,
      tagline: isAr ? 'للشركات الكبرى والمجموعات ذات المصانع المتعددة' : 'For large apparel groups and export houses',
      price: '5,500',
      currency: isAr ? 'ج.م' : 'EGP',
      period: isAr ? '/ شهرياً' : '/ month',
      badge: isAr ? 'مؤسسات ومجموعات' : 'Enterprise',
      features: [
        isAr ? 'مستخدمين غير محدودين وصلاحيات مخصصة' : 'Unlimited users & fine-grained permissions',
        isAr ? 'فروع ومصانع ومخازن غير محدودة' : 'Unlimited factories, branches & warehouses',
        isAr ? 'تقارير أرباح أوامر التشغيل والربحية اللحظية' : 'Real-time job profitability reports',
        isAr ? 'دعم فني مخصص وأولوية الاستجابة على مدار الساعة' : 'Dedicated technical account manager',
        isAr ? 'ربط مخصص لقواعد البيانات وخطط التوسع السحابي' : 'Custom integrations & SLA guarantees',
      ],
      notIncluded: [],
    },
  ];

  const faqs = [
    {
      q: isAr ? 'ما هي الفترة التجريبية المجانية وكيف تبدأ؟' : 'What is the 14-day free trial and how do I start?',
      a: isAr
        ? 'بمجرد تسجيل حساب مصنعك عبر الموقع، يُمنح حسابك فترة تجريبية مجانية كاملة الميزات لمدة 14 يوماً بدون الحاجة لبطاقة ائتمان مسبقة، لتجربة القص وتتبع الحزم والمخازن عملياً.'
        : 'Upon registration, your factory receives a fully functional 14-day trial without needing an upfront credit card.',
    },
    {
      q: isAr ? 'كيف يتم حماية عزل بيانات مصنعي عن المصانع الأخرى؟' : 'How is my factory data strictly isolated from other tenants?',
      a: isAr
        ? 'نظام GarmentOS مبني على بنية Multi-Tenancy هندسية صارمة؛ حيث يتم قفل كافة الاستعلامات المخزنية والإنتاجية بـ TenantScope إجباري على مستوى قاعدة البيانات، ولا يمكن لأي مستخدم الوصول لبيانات مصنع آخر.'
        : 'GarmentOS Cloud uses strict server-side TenantScope filters at the database layer, mathematically preventing cross-tenant access.',
    },
    {
      q: isAr ? 'هل يدعم النظام تشغيل الأقمشة لحساب العملاء (CMT)؟' : 'Does the platform support customer fabric custody (CMT)?',
      a: isAr
        ? 'نعم بالكامل! تم تخصيص وحدة كاملة (Phase 6) لاستلام خامات العملاء كـ "أمانات تشغيل" معزولة تماماً عن رصيد المصنع، وإصدار أذون تسليم وفواتير أجور تشغيل وخدمات فقط دون خلط التكاليف.'
        : 'Yes, Phase 6 provides isolated customer custody receipts (CMR), contract cutting jobs, and service fee invoicing.',
    },
    {
      q: isAr ? 'هل يتطلب النظام أجهزة كمبيوتر أو سيرفرات خاصة داخل المصنع؟' : 'Does the system require on-premise servers in the factory?',
      a: isAr
        ? 'كلا، GarmentOS هو نظام سحابي 100% يعمل من أي متصفح ويب حديث على أجهزة الكمبيوتر، اللابتوب، أو التابلت في صالة القص بدون تكاليف صيانة خوادم أو شبكات محلية معقدة.'
        : 'No, it is a 100% Cloud SaaS accessible from any desktop, laptop, or tablet on the shop floor without internal servers.',
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#f4f5f8] text-zinc-900 selection:bg-[#7F1625] selection:text-white font-sans"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* 1. Header (Reference Style: Auto Parts ERP) */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-black text-white shadow-md shadow-[#7F1625]/20 ring-1 ring-white/10 shrink-0">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-zinc-950 font-sans">
                  GarmentOS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#7F1625]/20 bg-[#7F1625]/10 text-[#7F1625]">
                  ERP
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 hidden sm:block font-medium">
                {isAr ? 'المنظومة السحابية المتخصصة لمصانع وورش الملابس' : 'Specialized Apparel & Garment Cloud ERP'}
              </div>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-zinc-600">
            <a href="#" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'الرئيسية' : 'Home'}
            </a>
            <a href="#features" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'قدرات صالة القص' : 'Cutting Capabilities'}
            </a>
            <a href="#preview" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'معاينة الداشبورد' : 'Live Dashboard'}
            </a>
            <a href="#workflows" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'دورة العمل والـ CMT' : 'Workflows'}
            </a>
            <a href="#pricing" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'الأسعار والباقات' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
            <a href="#contact" className="hover:text-[#7F1625] transition-colors">
              {isAr ? 'تواصل معنا' : 'Contact'}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleLang}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors text-xs flex items-center gap-1 font-bold"
              title={isAr ? 'Switch to English' : 'التحويل للعربية'}
            >
              <Globe className="w-4 h-4 text-zinc-500" />
              <span className="text-[11px]">{isAr ? 'EN' : 'عربي'}</span>
            </button>

            <button
              onClick={onOpenLogin}
              className="text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-300 text-zinc-800 hover:bg-zinc-100 transition-all flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-600" />
              <span>{isAr ? 'دخول المصنع' : 'Sign In'}</span>
            </button>

            <button
              onClick={() => onOpenRegister('professional')}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-[#7F1625] text-white hover:bg-[#6a121e] transition-all flex items-center gap-1.5 shadow-md shadow-[#7F1625]/25"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'ابدأ مجاناً 14 يوماً' : 'Start Trial'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section (Reference Style: Deep Burgundy Gradient + Radial Pattern) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#7F1625] via-[#4f0c16] to-black px-6 pt-20 pb-28 text-center text-white">
        {/* Subtle Radial Dot Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] opacity-10 pointer-events-none" />

        <div className="relative mx-auto max-w-5xl z-10">
          {/* Announcement Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold backdrop-blur-md shadow-xs mb-6">
            <Sparkle className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>
              {isAr
                ? 'المنظومة السحابية الأحدث لإدارة صالات القص، الأقمشة، والتشغيل للغير (CMT)'
                : 'Advanced Cloud ERP for Garment Cutting Floors & CMT Operations'}
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.2] text-white">
            {isAr ? (
              <>
                منظومة <span className="text-white">GarmentOS</span>{' '}
                <span className="text-[#f4abb9]">ERP</span> المتكاملة
              </>
            ) : (
              <>
                Integrated <span className="text-white">GarmentOS</span>{' '}
                <span className="text-[#f4abb9]">ERP</span> Platform
              </>
            )}
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-base sm:text-lg text-zinc-200 leading-relaxed font-normal">
            {isAr
              ? 'أول نظام سحابي متخصص يجمع صالة القص، حساب نسب الهالك الفعلي، حاسبة استهلاك الأقمشة والـ GSM، تتبع بطاقات الحزم بالباركود، وفصل أمانات العملاء محاسبياً ومخزنياً بدون تعقيد.'
              : 'End-to-end apparel cloud suite engineered for marker efficiency, fabric GSM conversions, barcode bundle tickets, CMT customer custody, and 3-way procurement matching.'}
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onOpenRegister('professional')}
              className="rounded-xl bg-white text-zinc-950 hover:bg-zinc-100 font-black text-sm px-8 py-3.5 shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'اختر باقتك وابدأ التجربة' : 'Choose Plan & Start Free Trial'}</span>
              <ArrowIcon className="h-4 w-4" />
            </button>
            <a
              href="#preview"
              className="rounded-xl border border-white/30 text-white hover:bg-white/10 font-bold text-sm px-8 py-3.5 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{isAr ? 'استكشف ميزات النظام كاملة' : 'Explore Platform Features'}</span>
            </a>
          </div>

          {/* Guarantee Badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{isAr ? 'أتمتة صالة القص وتتبع نسب الهالك' : 'Cutting Floor Automation'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{isAr ? 'بطاقات الحزم الذكية بالباركود QR' : 'Smart QR Bundle Tickets'}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" />
              <span>{isAr ? 'عزل أمانات العملاء المحاسبي (CMT)' : 'CMT Customer Fabric Custody'}</span>
            </span>
          </div>
        </div>
      </section>

      {/* 3. Stat Counter Banner (4 Cards - Reference Style) */}
      <section className="max-w-7xl mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-lg">
            <Scissors className="mx-auto h-7 w-7 text-[#7F1625] mb-2" />
            <div className="text-2xl font-black text-zinc-950 font-mono">+40%</div>
            <div className="mt-1 text-xs text-zinc-500 font-semibold">{isAr ? 'كفاءة وسرعة صالة القص' : 'Cutting Floor Speed'}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-lg">
            <QrCode className="mx-auto h-7 w-7 text-emerald-600 mb-2" />
            <div className="text-2xl font-black text-zinc-950 font-mono">3 ثواني</div>
            <div className="mt-1 text-xs text-zinc-500 font-semibold">{isAr ? 'مسح باركود بطاقة الحزمة' : 'QR Ticket Scan Speed'}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-lg">
            <Boxes className="mx-auto h-7 w-7 text-purple-600 mb-2" />
            <div className="text-2xl font-black text-zinc-950 font-mono">100%</div>
            <div className="mt-1 text-xs text-zinc-500 font-semibold">{isAr ? 'دقة عزل أمانات العملاء (CMT)' : 'CMT Isolation Accuracy'}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-center shadow-lg">
            <ShieldCheck className="mx-auto h-7 w-7 text-blue-600 mb-2" />
            <div className="text-2xl font-black text-zinc-950 font-mono">سحابي</div>
            <div className="mt-1 text-xs text-zinc-500 font-semibold">{isAr ? 'عزل كامل للبيانات والمصانع' : 'Multi-Tenant Isolation'}</div>
          </div>
        </div>
      </section>

      {/* 4. Live Shop-Floor Monitor & Mockup */}
      <section id="preview" className="py-20 border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
              {isAr ? 'شاشة تشغيل المصنع اللحظية' : 'Live Shop Floor Operating System'}
            </span>
            <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl mt-1">
              {isAr ? 'واجهة موحدة تجمع صالة القص، المخازن، والتشغيل للغير' : 'Unified Workspace for Cutting, Inventory & CMT'}
            </h2>
            <p className="text-xs text-zinc-500 mt-2 max-w-xl mx-auto">
              {isAr ? 'لوحة قيادة مركزية تمكنك من متابعة كل أمر تشغيل، هالك الفرش، وحركات الصرف في شاشة واحدة.' : 'Monitor lays, waste variances, bundle scans, and fabric stock in a single command center.'}
            </p>
          </div>

          {/* Interactive Mockup Container */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-xl">
            {/* Mockup Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                <span className="ms-2 font-bold text-zinc-900">GarmentOS Cloud • صالة القص الرئيسية</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                ● مباشر • وردية الصباح
              </span>
            </div>

            {/* KPI Mini Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="text-[11px] text-zinc-500 mb-1 font-semibold">{isAr ? 'أوامر القص النشطة' : 'Active Cutting Orders'}</div>
                <div className="text-xl font-bold font-mono text-zinc-950">4 أوامر جارية</div>
                <div className="text-[10px] text-zinc-500 font-mono">4,000 قطعة قيد التنفيذ</div>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="text-[11px] text-zinc-500 mb-1 font-semibold">{isAr ? 'نسبة الهالك الفعلي' : 'Actual Waste Rate'}</div>
                <div className="text-xl font-bold font-mono text-[#7F1625]">2.6%</div>
                <div className="text-[10px] text-emerald-700 font-mono font-bold">أقل من المعياري (3.5%)</div>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="text-[11px] text-zinc-500 mb-1 font-semibold">{isAr ? 'أمانات أقمشة العملاء (CMT)' : 'CMT Custody Rolls'}</div>
                <div className="text-xl font-bold font-mono text-zinc-950">820.0 متر</div>
                <div className="text-[10px] text-zinc-500 font-mono">معزولة محاسبياً ومخزنياً</div>
              </div>
              <div className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50">
                <div className="text-[11px] text-zinc-500 mb-1 font-semibold">{isAr ? 'مطابقة الجودة بالخط' : 'First-Pass Yield (QC)'}</div>
                <div className="text-xl font-bold font-mono text-emerald-700">99.2%</div>
                <div className="text-[10px] text-zinc-500 font-mono">محطات تفتيش رقمية</div>
              </div>
            </div>

            {/* Table Mockup */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-zinc-100 text-zinc-700 font-mono border-b border-zinc-200 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">رقم أمر التشغيل</th>
                    <th className="py-2.5 px-3">الموديل والنوع</th>
                    <th className="py-2.5 px-3">الكمية المستهدفة</th>
                    <th className="py-2.5 px-3">مرحلة الخط</th>
                    <th className="py-2.5 px-3">نسبة الإنجاز</th>
                    <th className="py-2.5 px-3">نسبة الهالك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 font-medium">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-950">#ORD-2026-001</td>
                    <td className="py-2.5 px-3">تيشيرت بولو رجالي بيكيه</td>
                    <td className="py-2.5 px-3 font-mono">1,200 قطعة</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#7F1625]/10 text-[#7F1625] font-bold text-[10px] border border-[#7F1625]/20">
                        صالة القص والفرش
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">100% (تم القص)</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">2.1%</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-950">#ORD-2026-002</td>
                    <td className="py-2.5 px-3">بنطلون جبردين كاجوال</td>
                    <td className="py-2.5 px-3 font-mono">800 قطعة</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                        خط الخياطة والتجميع
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">680 / 800 (85%)</td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 font-bold">2.8%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Core Platform Features (Reference Style: 6 Cards with #7F1625 Hover) */}
      <section id="features" className="max-w-7xl mx-auto px-4 py-20 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
            {isAr ? 'منظومة الخصائص الهندسية المتكاملة' : 'Integrated Engineering Suite'}
          </span>
          <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl">
            {isAr ? 'كل ما يحتاجه مصنع الملابس في شاشة واحدة' : 'Everything Your Factory Needs in One Dashboard'}
          </h2>
          <p className="text-sm text-zinc-600 max-w-xl mx-auto">
            {isAr
              ? 'صممنا GarmentOS ليفهم طبيعة صناعة الملابس المعقدة: طبقات الفرش، حسابات الـ GSM، وبطاقات الحزم.'
              : 'Generic ERPs fail at cutting floor realities. GarmentOS natively supports marker efficiency, plies, and CMT custody.'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((e, idx) => (
            <div
              key={idx}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-[#7F1625] hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-[#4f0c16] text-white shadow-md shadow-[#7F1625]/20">
                    {e.icon}
                  </div>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-[10px] font-extrabold text-zinc-700">
                    {e.badge}
                  </span>
                </div>
                <h3 className="text-base font-black text-zinc-950 group-hover:text-[#7F1625] transition-colors">
                  {e.title}
                </h3>
                <p className="mt-2 text-xs text-zinc-600 leading-relaxed line-clamp-3 font-normal">
                  {e.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-700">
                  {isAr ? 'باقة:' : 'Plan:'} {e.planRequired}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7F1625] group-hover:underline">
                  <span>{isAr ? 'عرض التفاصيل' : 'Details'}</span>
                  <ArrowIcon className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Production Workflow Pipeline */}
      <section id="workflows" className="py-20 bg-white border-y border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
              {isAr ? 'دورة الإنتاج المتكاملة' : 'Production Lifecycle'}
            </span>
            <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl mt-1">
              {isAr ? 'من إذن استلام القماش حتى الفاتورة والتسليم' : 'From Fabric Gate to Final Delivery'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: '01',
                title: isAr ? 'فحص واستلام الأقمشة' : 'Fabric Gate QC',
                desc: isAr ? 'وزن الأثواب، قياس العرض والـ GSM، وتسجيل أمانات العملاء.' : 'Roll weight, width, GSM check, and CMT custody separation.',
              },
              {
                step: '02',
                title: isAr ? 'تخطيط الفرش والقص' : 'Marker & Lay Plan',
                desc: isAr ? 'تحديد أطوال الفرش وعدد الطبقات وحساب نسبة الهالك المقدر.' : 'Lay lengths, ply counts, and estimated waste calculation.',
              },
              {
                step: '03',
                title: isAr ? 'بطاقات الحزم بالباركود' : 'QR Bundle Tickets',
                desc: isAr ? 'توليد باركود لكل حزمة مقصوصة لتتبع العاملين والمراحل.' : 'Unique QR ticket per cut bundle for piece-rate and tracking.',
              },
              {
                step: '04',
                title: isAr ? 'الخياطة والجودة بالخط' : 'Sewing & In-Line QC',
                desc: isAr ? 'مسح الباركود عند كل مرحلة واعتماد الجودة الميدانية.' : 'Barcode scan at each operation and real-time pass/fail inspection.',
              },
              {
                step: '05',
                title: isAr ? 'التعبئة والتسليم' : 'Finishing & Invoice',
                desc: isAr ? 'إذن تسليم البضاعة الجاهزة وإصدار فواتير التشغيل أو البيع.' : 'Delivery receipt and automated job costing / sales invoice.',
              },
            ].map((st, i) => (
              <div key={i} className="p-5 rounded-2xl border border-zinc-200 bg-[#f4f5f8] shadow-xs">
                <div className="font-mono text-2xl font-black text-[#7F1625] mb-2">{st.step}</div>
                <h4 className="text-xs font-bold text-zinc-950 mb-1.5">{st.title}</h4>
                <p className="text-[11px] text-zinc-500 leading-normal">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Pricing Plans (Reference Style: Card with #7F1625 Active Outline) */}
      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
              {isAr ? 'أسعار شفافة وباقات مرنة' : 'Transparent Pricing'}
            </span>
            <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl mt-1">
              {isAr ? 'اختر الباقة المناسبة لحجم مصنعك' : 'Choose Your Factory Plan'}
            </h2>
            <p className="text-xs text-zinc-500 mt-2">
              {isAr ? 'جميع الباقات تشمل فترة تجريبية مجانية 14 يوماً مع دعم فني متكامل' : 'All plans include 14-day free trial with onboarding support'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'border-2 border-[#7F1625] shadow-xl bg-gradient-to-b from-[#7F1625]/5 to-white relative'
                    : 'border border-zinc-200 bg-white shadow-xs hover:border-zinc-300 hover:shadow-md'
                }`}
              >
                <div>
                  {plan.popular && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-[#7F1625] px-3 py-1 text-[11px] font-black text-white shadow-md mb-4">
                      <Sparkles className="h-3 w-3 text-amber-300" />
                      <span>{plan.badge}</span>
                    </div>
                  )}
                  <h3 className="text-lg font-black text-zinc-950 mb-1">{plan.name}</h3>
                  <p className="text-xs text-zinc-500 mb-6">{plan.tagline}</p>

                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-zinc-100 font-mono">
                    <span className="text-4xl font-black text-zinc-950">{plan.price}</span>
                    <span className="text-xs font-bold text-zinc-600">{plan.currency}</span>
                    <span className="text-xs text-zinc-400">{plan.period}</span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {plan.features.map((feat, fi) => (
                      <div key={fi} className="flex items-start gap-2 text-zinc-700 font-medium">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                    {plan.notIncluded.map((nfeat, ni) => (
                      <div key={ni} className="flex items-start gap-2 text-zinc-400 line-through">
                        <span className="w-4 h-4 shrink-0 text-center">•</span>
                        <span>{nfeat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => onOpenRegister(plan.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      plan.popular
                        ? 'bg-[#7F1625] text-white hover:bg-[#6a121e] shadow-md shadow-[#7F1625]/20'
                        : 'border border-zinc-300 text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    {isAr ? 'ابدأ تجربة مجانية 14 يوماً' : 'Start 14-Day Free Trial'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Bottom CTA Banner (Reference Style: Gradient #7F1625 to Zinc-950) */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-[#7F1625] to-zinc-950 p-8 sm:p-12 text-center text-white space-y-6 shadow-xl">
          <h2 className="text-3xl font-black sm:text-4xl">
            {isAr ? 'ابدأ أتمتة صالة القص ومصنعك الآن بأعلى كفاءة' : 'Automate Your Garment Factory Floor Today'}
          </h2>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal">
            {isAr
              ? 'انضم الآن إلى المنظومة السحابية الأكثر تخصصاً لإدارة الأقمشة، عقود التشغيل للغير CMT، وتتبع الحزم بالباركود في مصر والشرق الأوسط.'
              : 'Join the specialized apparel manufacturing cloud platform built for real shop-floor operations.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onOpenRegister('professional')}
              className="rounded-xl bg-white text-[#7F1625] font-black text-sm px-8 py-3.5 hover:bg-zinc-100 shadow-lg cursor-pointer"
            >
              <span>{isAr ? 'الاشتراك وتفعيل الحساب فوراً' : 'Activate Free Trial Now'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. FAQ Section */}
      <section id="faq" className="py-20 bg-zinc-50 border-t border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
              {isAr ? 'الأسئلة الشائعة والمصانع' : 'Frequently Asked Questions'}
            </span>
            <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl mt-1">
              {isAr ? 'كل ما يخص التشغيل وعزل البيانات' : 'Operations, Data Security & Trials'}
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-zinc-200 bg-white overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-right rtl:text-right ltr:text-left flex items-center justify-between gap-4 font-bold text-zinc-900 text-sm hover:text-[#7F1625] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#7F1625]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 10. Contact Form */}
      <section id="contact" className="py-20 bg-white border-t border-zinc-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#7F1625]">
              {isAr ? 'فريق الدعم الهندسي والاستشارات' : 'Consultation & Demo'}
            </span>
            <h2 className="text-3xl font-black text-zinc-950 sm:text-4xl mt-1">
              {isAr ? 'هل تحتاج إلى جلسة مخصصة لمصنعك؟' : 'Need an On-Site Workflow Review?'}
            </h2>
            <p className="text-xs text-zinc-500 mt-2">
              {isAr ? 'فريقنا الهندسي جاهز لترتيب جلسة تدريب عملية لصالة القص ومراجعة دورة العمل لمصنعك.' : 'Our engineers are ready to review your floor layout and calculate potential fabric waste reduction.'}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-[#f4f5f8] p-6 sm:p-8 shadow-xs">
            {contactSuccess && (
              <div className="mb-6 p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{contactSuccess}</span>
              </div>
            )}
            {contactError && (
              <div className="mb-6 p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 font-bold">
                {contactError}
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    {isAr ? 'الاسم بالكامل' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={isAr ? 'م. محمد علي' : 'Eng. Mohamed Ali'}
                    className="w-full bg-white border border-zinc-300 rounded-xl text-xs py-2 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    {isAr ? 'البريد الإلكتروني' : 'Email Address'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="factory@company.com"
                    className="w-full bg-white border border-zinc-300 rounded-xl text-xs py-2 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    {isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+20 100 000 0000"
                    className="w-full bg-white border border-zinc-300 rounded-xl text-xs py-2 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                    {isAr ? 'اسم المصنع أو الشركة' : 'Factory / Company Name'}
                  </label>
                  <input
                    type="text"
                    value={contactCompany}
                    onChange={(e) => setContactCompany(e.target.value)}
                    placeholder={isAr ? 'مصنع النيل للملابس الجاهزة' : 'Nile Garment Factory'}
                    className="w-full bg-white border border-zinc-300 rounded-xl text-xs py-2 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-800 mb-1.5">
                  {isAr ? 'تفاصيل الاستفسار أو متطلبات صالة القص' : 'Message / Details'} *
                </label>
                <textarea
                  rows={4}
                  required
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder={isAr ? 'اكتب عدد خطوط الإنتاج أو متطلبات الربط...' : 'Describe your operational requirements...'}
                  className="w-full bg-white border border-zinc-300 rounded-xl text-xs py-2 px-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] transition-all"
                />
              </div>

              <div className="text-right rtl:text-right ltr:text-left pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingContact}
                  className="px-6 py-2.5 rounded-xl bg-[#7F1625] text-white font-bold text-xs hover:bg-[#6a121e] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-[#7F1625]/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingContact ? (isAr ? 'جارِ الإرسال...' : 'Sending...') : (isAr ? 'إرسال طلب الاستشارة' : 'Submit Inquiry')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 10. Minimal Enterprise Footer */}
      <footer className="py-10 bg-white border-t border-zinc-200 text-xs text-zinc-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-zinc-800">
            <Scissors className="w-4 h-4 text-[#7F1625]" />
            <span className="font-bold text-zinc-950 font-sans">GarmentOS Cloud ERP</span>
            <span>• © 2026</span>
          </div>
          <div className="flex items-center gap-6 font-sans font-semibold">
            <a href="#features" className="hover:text-[#7F1625] transition-colors">{isAr ? 'الميزات' : 'Features'}</a>
            <a href="#pricing" className="hover:text-[#7F1625] transition-colors">{isAr ? 'الأسعار' : 'Pricing'}</a>
            <a href="#faq" className="hover:text-[#7F1625] transition-colors">{isAr ? 'الأسئلة' : 'FAQ'}</a>
            <button onClick={onOpenLogin} className="hover:text-[#7F1625] transition-colors">{isAr ? 'دخول المصنع' : 'Login'}</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

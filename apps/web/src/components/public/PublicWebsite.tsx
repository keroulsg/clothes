import React, { useState } from 'react';
import {
  CContainer,
  CRow,
  CCol,
  CCard,
  CCardBody,
  CButton,
  CBadge,
  CAlert,
  CForm,
  CFormInput,
  CFormTextarea,
  CSpinner,
} from '@coreui/react';
import {
  Scissors,
  Calculator,
  QrCode,
  ShieldCheck,
  Building2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Send,
  Sparkles,
  ChevronDown,
  Globe,
  LogIn,
  Sun,
  Moon,
  Boxes,
  ShoppingCart,
  Check,
  Sparkle,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Language } from '../../types';

interface PublicWebsiteProps {
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenLogin: () => void;
  onOpenRegister: (planTier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const PublicWebsite: React.FC<PublicWebsiteProps> = ({
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
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
      icon: <Scissors className="w-5 h-5 text-amber-400" />,
      badge: isAr ? 'صالة القص' : 'Cutting Floor',
      title: isAr ? 'هندسة صالة القص وحساب الهالك' : 'Cutting Floor & Marker Optimization',
      desc: isAr
        ? 'حساب كفاءة التعشيق (Marker Efficiency %)، عدد طبقات الفرش (Plies)، والتحكم الصارم في نسب الهالك المسموح بها مع توليد أوامر القص الآلية.'
        : 'Marker efficiency optimization, automatic layer/ply planning, and strict waste threshold tracking.',
    },
    {
      icon: <Calculator className="w-5 h-5 text-emerald-400" />,
      badge: isAr ? 'المخازن والخامات' : 'Fabric Inventory',
      title: isAr ? 'حاسبة استهلاك الأقمشة الذكية' : 'Smart GSM & Roll Calculator',
      desc: isAr
        ? 'تحويل فوري دقيق بين الأمتار والكيلوجرامات ووزن المتر المربع (GSM)، وتتبع الأمتار المتبقية في أثواب الأقمشة قبل الفرش.'
        : 'Bi-directional conversions between meters, kilograms, and GSM with real-time remaining roll metrics.',
    },
    {
      icon: <QrCode className="w-5 h-5 text-sky-400" />,
      badge: isAr ? 'التتبع بالباركود' : 'QR Checkpoints',
      title: isAr ? 'تتبع بطاقات الحزم الذكية بالباركود' : 'Smart Barcode Bundle Tracking',
      desc: isAr
        ? 'توليد باركود فريد لكل حزمة مقصوصة وتتبع مراحل الخط (خياطة، تشغيل خارجي، كوي، تغليف) مع محطات فحص الجودة.'
        : 'Unique QR bundle tickets tracked across cutting, sewing, finishing, and multi-stage QC checkpoints.',
    },
    {
      icon: <Boxes className="w-5 h-5 text-primary dark:text-[#fca5a5]" />,
      badge: isAr ? 'التشغيل للغير' : 'CMT Custody',
      title: isAr ? 'التشغيل للغير وعزل أمانات العملاء (CMT)' : 'CMT & Customer Fabric Custody',
      desc: isAr
        ? 'إدارة عقود التشغيل للغير مع عزل أقمشة ومستلزمات العملاء محاسبياً ومخزنياً كأمانات تشغيل مستبعدة من أصول المصنع.'
        : 'Strict segregation of customer-owned fabric custody with isolated stock balances and service fee billing.',
    },
    {
      icon: <ShoppingCart className="w-5 h-5 text-rose-400" />,
      badge: isAr ? 'المشتريات' : 'Procurement',
      title: isAr ? 'المشتريات والمطابقة الثلاثية' : 'Procurement & 3-Way Matching',
      desc: isAr
        ? 'ربط أمر الشراء مع إذن فحص الجودة بالبوابة وفاتورة المورد لمنع فروقات الأسعار أو استلام خامات غير مطابقة.'
        : 'Rigid 3-way matching between purchase orders, gate QC inspection receipts, and vendor invoices.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      badge: isAr ? 'أمان السحابة' : 'Data Isolation',
      title: isAr ? 'عزل كامل للمصانع والبيانات (Multi-Tenancy)' : 'Strict Multi-Tenant Isolation',
      desc: isAr
        ? 'نظام سحابي معزول بالكامل لكل مصنع مع قفل تلقائي للاستعلامات وصلاحيات دقيقة (مالك، مدير إنتاج، محاسب، جودة).'
        : 'Row-level multi-tenancy enforcing strict data isolation and granular role-based permissions.',
    },
  ];

  const pricingPlans = [
    {
      id: 'starter' as const,
      name: isAr ? 'باقة الورش والمشاغل' : 'Workshops & Small Factories',
      tierLabel: 'Starter',
      popular: false,
      tagline: isAr ? 'مثالية للورش الصغيرة ومشاغل الخياطة حتى 3 مستخدمين' : 'Ideal for workshops up to 3 users',
      price: isAr ? '750' : '750',
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
      price: isAr ? '2,500' : '2,500',
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
      price: isAr ? '5,500' : '5,500',
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
        ? 'نظام GarmentOS Cloud مبني على بنية Multi-Tenancy هندسية صارمة؛ حيث يتم قفل كافة الاستعلامات المخزنية والإنتاجية بـ TenantScope إجباري على مستوى قاعدة البيانات، ولا يمكن لأي مستخدم الوصول لبيانات مصنع آخر.'
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
        ? 'كلا، GarmentOS Cloud هو نظام سحابي 100% يعمل من أي متصفح ويب حديث على أجهزة الكمبيوتر، اللابتوب، أو التابلت في صالة القص بدون تكاليف صيانة خوادم أو شبكات محلية معقدة.'
        : 'No, it is a 100% Cloud SaaS accessible from any desktop, laptop, or tablet on the shop floor without internal servers.',
    },
  ];

  return (
    <div
      className={`min-h-screen text-slate-100 ${isDark ? 'bg-[#080b12]' : 'bg-[#f8fafc] text-slate-900'}`}
      dir={isAr ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: isDark ? 'var(--brand-black)' : '#f8fafc',
      }}
    >
      {/* 1. Public Top Navigation */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all ${
          isDark ? 'border-slate-800/80 bg-[#080b12]/90' : 'border-slate-200/90 bg-white/95'
        }`}
      >
        <CContainer className="py-3 px-4 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Scissors className="w-5 h-5 -rotate-45" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`font-black text-xl tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    GarmentOS
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: isDark ? 'rgba(79, 12, 22, 0.25)' : 'rgba(79, 12, 22, 0.08)',
                      color: isDark ? '#fca5a5' : '#4f0c16',
                      borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.3)',
                    }}
                  >
                    Cloud
                  </span>
                </div>
                <div
                  className={`text-[10px] font-medium hidden sm:block ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {isAr ? 'المنظومة السحابية المتخصصة لمصانع وورش الملابس' : 'Specialized Apparel & Garment Cloud ERP'}
                </div>
              </div>
            </div>

            {/* Public Nav Links (Desktop) */}
            <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold">
              <a
                href="#features"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'قدرات المنظومة' : 'Capabilities'}
              </a>
              <a
                href="#preview"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'معاينة حية' : 'Live Preview'}
              </a>
              <a
                href="#workflows"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'دورة العمل' : 'Workflows'}
              </a>
              <a
                href="#pricing"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'باقات الاشتراك' : 'Pricing'}
              </a>
              <a
                href="#faq"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
              </a>
              <a
                href="#contact"
                className={`transition-colors ${
                  isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isAr ? 'تواصل معنا' : 'Contact'}
              </a>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onToggleLang}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isAr ? 'Switch to English' : 'التحويل للعربية'}
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">{isAr ? 'English' : 'عربي'}</span>
              </button>

              <button
                onClick={onToggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={isDark ? 'Light Theme' : 'Dark Theme'}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all ${
                  isDark
                    ? 'text-slate-200 border-slate-700 hover:bg-slate-800'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                onClick={onOpenLogin}
              >
                <LogIn className="w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5" />
                {isAr ? 'دخول المصنع' : 'Sign In'}
              </CButton>

              <CButton
                size="sm"
                className="btn-brand-primary text-xs font-bold px-4 py-1.5 rounded-lg"
                onClick={() => onOpenRegister('professional')}
              >
                <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 rtl:ml-1.5" />
                {isAr ? 'ابدأ مجاناً 14 يوماً' : 'Start 14-Day Trial'}
              </CButton>
            </div>
          </div>
        </CContainer>
      </header>

      {/* 2. Hero Section with Live Shop-Floor Monitor Preview */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/40">
        {/* Subtle Brand Ambient Backlight */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[380px] pointer-events-none opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #4f0c16 0%, transparent 70%)' }}
        />

        <CContainer className="relative z-10 px-4 lg:px-8 text-center max-w-4xl mx-auto">
          {/* Engineering Announcement Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border shadow-sm"
            style={{
              backgroundColor: isDark ? 'rgba(79, 12, 22, 0.25)' : 'rgba(79, 12, 22, 0.08)',
              borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.35)',
              color: isDark ? '#fca5a5' : '#4f0c16',
            }}
          >
            <Sparkle className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {isAr
                ? 'المنظومة السحابية المتخصصة لمصانع وورش الملابس والتشغيل للغير (CMT)'
                : 'Dedicated Cloud ERP for Garment Factories & CMT Operations'}
            </span>
          </div>

          {/* Main Hero Headline */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] mb-6 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {isAr ? (
              <>
                إدارة هندسية متكاملة لـ{' '}
                <span
                  className="inline-block px-2.5 py-0.5 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? 'rgba(79, 12, 22, 0.3)' : 'rgba(79, 12, 22, 0.08)',
                    borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.3)',
                    color: isDark ? '#ffffff' : '#4f0c16',
                  }}
                >
                  صالة القص والمخازن
                </span>{' '}
                والتشغيل للغير
              </>
            ) : (
              <>
                Engineered Command Over{' '}
                <span
                  className="inline-block px-2.5 py-0.5 rounded-lg border"
                  style={{
                    backgroundColor: isDark ? 'rgba(79, 12, 22, 0.3)' : 'rgba(79, 12, 22, 0.08)',
                    borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.3)',
                    color: isDark ? '#ffffff' : '#4f0c16',
                  }}
                >
                  Cutting Floor & Materials
                </span>{' '}
                on the Cloud
              </>
            )}
          </h1>

          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-10 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {isAr
              ? 'توقف عن هدر الأقمشة وفوضى التشغيل للغير. منظومة سحابية متكاملة تضبط كفاءة التعشيق، تتبع بطاقات الحزم بالباركود، تعزل أمانات العملاء محاسبياً، وتحكم المطابقة الثلاثية للمشتريات.'
              : 'Eliminate fabric waste and billing chaos. Real-time marker efficiency, QR bundle tracking across shop-floor lines, strict customer fabric custody, and 3-way procurement matching.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CButton
              size="lg"
              className="btn-brand-primary w-full sm:w-auto px-8 py-3.5 text-sm font-bold flex items-center justify-center gap-2.5"
              onClick={() => onOpenRegister('professional')}
            >
              <span>{isAr ? 'ابدأ تجربة مصنعك المجانية (14 يوماً)' : 'Start 14-Day Free Trial'}</span>
              <ArrowIcon className="w-4 h-4" />
            </CButton>

            <CButton
              color="secondary"
              variant="outline"
              size="lg"
              className={`w-full sm:w-auto px-8 py-3.5 text-sm font-semibold rounded-xl border ${
                isDark
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800/60'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              onClick={onOpenLogin}
            >
              <LogIn className="w-4 h-4 inline-block mr-2 rtl:ml-2" />
              <span>{isAr ? 'دخول المشتركين للنظام' : 'Sign In to Factory'}</span>
            </CButton>
          </div>

          {/* Operational Metrics Strip */}
          <div
            className={`mt-14 pt-8 border-t grid grid-cols-2 md:grid-cols-4 gap-6 text-center ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}
          >
            <div className="p-3">
              <div className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>100%</div>
              <div className="text-xs mt-1 font-medium">{isAr ? 'عزل كامل لبيانات المصانع' : 'Strict Tenant Isolation'}</div>
            </div>
            <div className="p-3">
              <div className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>0 EGP</div>
              <div className="text-xs mt-1 font-medium">{isAr ? 'بدون تكاليف خوادم أو شبكات' : 'Zero Infrastructure Cost'}</div>
            </div>
            <div className="p-3">
              <div className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Phase 6</div>
              <div className="text-xs mt-1 font-medium">{isAr ? 'تشغيل للغير وأمانات خامات CMT' : 'Full CMT Custody Ready'}</div>
            </div>
            <div className="p-3">
              <div className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>QR Live</div>
              <div className="text-xs mt-1 font-medium">{isAr ? 'تتبع فوري للحزم ومحطات الجودة' : 'Real-time Bundle Checkpoints'}</div>
            </div>
          </div>
        </CContainer>

        {/* 2.1 Live Interactive Shop-Floor Monitor Simulation (Proof of real capability) */}
        <div id="preview" className="mt-12 px-4 max-w-5xl mx-auto">
          <div
            className="rounded-2xl border p-4 sm:p-6 shadow-2xl overflow-hidden text-left"
            style={{
              backgroundColor: isDark ? '#0d131f' : '#ffffff',
              borderColor: isDark ? '#1e2638' : '#e2e8f0',
            }}
          >
            {/* Monitor Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800/60 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <div>
                  <div className={`font-bold text-xs uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {isAr ? 'شاشة الرقابة الحية لصالة القص والإنتاج' : 'Live Shop-Floor & Cutting Monitor'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">ORDER #PO-2026-081 • BATCH-EG-44</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CBadge color="success" className="text-[10px] font-bold px-2 py-1">
                  LIVE CUTTING
                </CBadge>
                <span className="text-[11px] text-slate-400 font-mono">14:50:00 EET</span>
              </div>
            </div>

            {/* Simulated Live KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isAr ? 'كفاءة التعشيق (Marker Efficiency)' : 'Marker Efficiency'}
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">89.4%</span>
                <span className="text-[9px] text-slate-500 block">{isAr ? 'ضمن المعيار الهندسي المعتمد' : 'Within optimum tolerance'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isAr ? 'إجمالي الأمتار المفروشة' : 'Laid Meters'}
                </span>
                <span className="text-lg font-black text-primary dark:text-[#fca5a5] font-mono">1,240.0 م</span>
                <span className="text-[9px] text-slate-500 block">{isAr ? '5 أثواب قماش سنجل جيرسي' : '5 fabric rolls processed'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isAr ? 'حزم مقصوصة بالباركود' : 'Bundles QR Generated'}
                </span>
                <span className="text-lg font-black text-amber-300 font-mono">18 / 20 حزمة</span>
                <span className="text-[9px] text-slate-500 block">{isAr ? '450 قطعة جاهزة للتشغيل' : '450 pieces tagged'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block font-medium">
                  {isAr ? 'نسبة الهالك الفعلي (Waste %)' : 'Actual Waste Rate'}
                </span>
                <span className="text-lg font-black text-emerald-400 font-mono">2.1%</span>
                <span className="text-[9px] text-slate-500 block">{isAr ? 'أقل من حد التسامح (3.5%)' : 'Below 3.5% threshold'}</span>
              </div>
            </div>

            {/* Live Cutting Progress */}
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="font-semibold text-slate-300">
                  {isAr ? 'تقدم أمر القص الحالي (تيشيرت صيفي بولو - موديل MOD-PL01)' : 'Current Lay & Cut Progress (Polo Model)'}
                </span>
                <span className="font-mono text-emerald-400 font-bold">90% مكتمل</span>
              </div>
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: '90%', backgroundColor: 'var(--brand-primary)' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Features Section */}
      <section id="features" className="py-24 border-b border-slate-800/40">
        <CContainer className="px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border"
              style={{
                backgroundColor: isDark ? 'rgba(79, 12, 22, 0.25)' : 'rgba(79, 12, 22, 0.08)',
                color: isDark ? '#fca5a5' : '#4f0c16',
                borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.35)',
              }}
            >
              {isAr ? 'المميزات التشغيلية الحقيقية' : 'Production-Ready Capabilities'}
            </span>
            <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAr ? 'مصمم خصيصاً للتعامل مع واقع مصانع وورش الملابس' : 'Engineered for the Realities of Garment Production'}
            </h2>
            <p className={`text-xs sm:text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAr
                ? 'حلول برمجية تعالج التحديات الحقيقية: تحويل أوزان الأقمشة، تقليل هادر القص، تتبع الحزم، وعزل خامات العملاء.'
                : 'Mathematically grounded tools designed to eliminate disputes, track rolls, and maximize throughput.'}
            </p>
          </div>

          <CRow className="g-4">
            {features.map((feat, idx) => (
              <CCol key={idx} xs={12} md={6} lg={4}>
                <CCard
                  className="h-100 rounded-2xl p-2 border transition-all duration-300 hover:-translate-y-1 group"
                  style={{
                    backgroundColor: isDark ? '#0f1523' : '#ffffff',
                    borderColor: isDark ? '#1e2638' : '#e2e8f0',
                  }}
                >
                  <CCardBody className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center border shadow-sm transition-colors"
                          style={{
                            backgroundColor: isDark ? '#141c2e' : '#f1f5f9',
                            borderColor: isDark ? '#222f47' : '#cbd5e1',
                          }}
                        >
                          {feat.icon}
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: isDark ? 'rgba(79, 12, 22, 0.2)' : 'rgba(79, 12, 22, 0.08)',
                            color: isDark ? '#fca5a5' : '#4f0c16',
                            borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.25)',
                          }}
                        >
                          {feat.badge}
                        </span>
                      </div>
                      <h3 className={`font-bold text-base mb-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{feat.title}</h3>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{feat.desc}</p>
                    </div>
                  </CCardBody>
                </CCard>
              </CCol>
            ))}
          </CRow>
        </CContainer>
      </section>

      {/* 4. Integrated Lifecycle Pipeline (Workflow) */}
      <section id="workflows" className="py-24 border-b border-slate-800/40">
        <CContainer className="px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAr ? 'دورة الإنتاج المتكاملة من الثوب حتى التسليم' : 'Integrated Factory Lifecycle Pipeline'}
            </h2>
            <p className={`text-xs sm:text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAr
                ? 'سلسلة تشغيلية مترابطة تضمن عدم ضياع أي متر قماش أو خروج أي حزمة دون فحص الجودة.'
                : 'A cohesive digital thread connecting receiving, cutting, assembly, and customer invoicing.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: isAr ? 'استلام وفحص الخامات' : 'Material Receipt & QC',
                desc: isAr
                  ? 'فحص جودة استواء النسيج والصبغة، حجز خامات العملاء في مخزن أمانات منفصل مع إصدار إذن استلام رسمي.'
                  : 'Verify fabric specs and quarantine customer-supplied goods in isolated escrow custody.',
                badge: isAr ? 'إذن استلام GRN' : 'GRN Gate Pass',
              },
              {
                step: '02',
                title: isAr ? 'الفرش والقص وتوليد الـ QR' : 'Cutting & QR Bundling',
                desc: isAr
                  ? 'حساب عدد الطبقات ونسب الهالك، إصدار أمر القص، وتوليد باركود لكل حزمة مقصوصة بمقاسها ولونها.'
                  : 'Optimize lay plies, enforce waste caps, and generate unique QR tickets for every bundle.',
                badge: isAr ? 'بطاقات الحزم' : 'QR Bundle Tickets',
              },
              {
                step: '03',
                title: isAr ? 'التشغيل ومحطات الفحص' : 'Assembly & Stage QC',
                desc: isAr
                  ? 'تتبع حركات الحزم على خطوط الخياطة والتشغيل الخارجي (تطريز، طباعة) مع توثيق عيوب الجودة وإعادة التشغيل.'
                  : 'Scan bundles at sewing, subcontracted embroidery, and record defects with rework workflows.',
                badge: isAr ? 'محطات الجودة QC' : 'QC Checkpoints',
              },
              {
                step: '04',
                title: isAr ? 'التسليم والفوترة والمطابقة' : 'Delivery & Invoicing',
                desc: isAr
                  ? 'إصدار إذن تسليم للمصنع أو العميل، استرداد فواضل الأقمشة، وإصدار فاتورة أجور التشغيل أو مطابقة التكلفة.'
                  : 'Generate delivery dispatch notes, reconcile leftover fabrics, and issue verified service invoices.',
                badge: isAr ? 'أذون وفواتير' : 'Delivery & Invoice',
              },
            ].map((st, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl border transition-all hover:border-slate-700 relative flex flex-col justify-between"
                style={{
                  backgroundColor: isDark ? '#0f1523' : '#ffffff',
                  borderColor: isDark ? '#1e2638' : '#e2e8f0',
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-3xl font-black font-mono"
                      style={{ color: '#4f0c16' }}
                    >
                      {st.step}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {st.badge}
                    </span>
                  </div>
                  <h4 className={`font-bold text-base mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{st.title}</h4>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CContainer>
      </section>

      {/* 5. Authoritative Pricing Section */}
      <section id="pricing" className="py-24 border-b border-slate-800/40">
        <CContainer className="px-4 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border"
              style={{
                backgroundColor: isDark ? 'rgba(79, 12, 22, 0.25)' : 'rgba(79, 12, 22, 0.08)',
                color: isDark ? '#fca5a5' : '#4f0c16',
                borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.35)',
              }}
            >
              {isAr ? 'خطط وباقات الاشتراك' : 'Transparent Pricing'}
            </span>
            <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAr ? 'استثمار واضح وعادل ينمو مع حجم مصنعك' : 'Clear Plans Sized to Match Your Factory Floor'}
            </h2>
            <p className={`text-xs sm:text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAr
                ? 'تشمل كافة الخطط فترة تجريبية مجانية لمدة 14 يوماً. بدون رسوم إعداد خفية أو عقود سنوية إلزامية.'
                : 'All plans include a full 14-day free trial. Zero setup fees, cancel anytime.'}
            </p>
          </div>

          <CRow className="g-4 items-stretch">
            {pricingPlans.map((plan) => (
              <CCol key={plan.id} xs={12} lg={4}>
                <div
                  className={`h-100 rounded-3xl p-6 sm:p-8 border flex flex-col justify-between transition-all duration-300 relative ${
                    plan.popular
                      ? 'shadow-2xl scale-[1.02] z-10'
                      : 'hover:border-slate-700'
                  }`}
                  style={{
                    backgroundColor: isDark ? (plan.popular ? '#131b2c' : '#0f1523') : '#ffffff',
                    borderColor: plan.popular
                      ? '#4f0c16'
                      : isDark ? '#1e2638' : '#e2e8f0',
                  }}
                >
                  {plan.popular && (
                    <div
                      className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[10px] font-extrabold uppercase tracking-widest px-4 py-1 rounded-full shadow-md"
                      style={{ backgroundColor: 'var(--brand-primary)' }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className={`font-extrabold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">{plan.tierLabel}</span>
                    </div>

                    <p className={`text-xs mb-6 min-h-[36px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{plan.tagline}</p>

                    <div className="flex items-baseline gap-1.5 pb-6 mb-6 border-b border-slate-800/80">
                      <span className={`text-3xl sm:text-4xl font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {plan.price}
                      </span>
                      <span className="text-sm font-semibold text-slate-400">{plan.currency}</span>
                      <span className="text-xs text-slate-500 font-medium">{plan.period}</span>
                    </div>

                    {/* Features List */}
                    <div className="space-y-3 mb-8 text-xs">
                      {plan.features.map((feat, fi) => (
                        <div key={fi} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{feat}</span>
                        </div>
                      ))}
                      {plan.notIncluded.map((feat, ni) => (
                        <div key={ni} className="flex items-start gap-2.5 opacity-40">
                          <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                            ✕
                          </div>
                          <span className="line-through">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <CButton
                    className={`w-full py-3 text-xs font-bold rounded-xl transition-all ${
                      plan.popular
                        ? 'btn-brand-primary'
                        : isDark
                        ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}
                    onClick={() => onOpenRegister(plan.id)}
                  >
                    {isAr ? 'ابدأ تجربة مجانية بهذه الباقة' : `Select ${plan.tierLabel} (Free Trial)`}
                  </CButton>
                </div>
              </CCol>
            ))}
          </CRow>
        </CContainer>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="py-24 border-b border-slate-800/40">
        <CContainer className="px-4 lg:px-8 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isAr ? 'الأسئلة الشائعة من أصحاب المصانع' : 'Frequently Asked Questions'}
            </h2>
            <p className={`text-xs sm:text-sm mt-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isAr ? 'إجابات واضحة وصريحة حول أمان البيانات، فترات التجربة، وطريقة التشغيل.' : 'Straightforward answers regarding security, custody, and rollout.'}
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-2xl border transition-all overflow-hidden"
                  style={{
                    backgroundColor: isDark ? '#0f1523' : '#ffffff',
                    borderColor: isOpen
                      ? (isDark ? '#871b29' : 'rgba(79, 12, 22, 0.4)')
                      : isDark ? '#1e2638' : '#e2e8f0',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full p-5 text-left rtl:text-right flex items-center justify-between gap-4 font-bold text-sm"
                  >
                    <span className={isDark ? 'text-white' : 'text-slate-900'}>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className={`px-5 pb-5 pt-1 text-xs leading-relaxed border-t border-slate-800/40 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CContainer>
      </section>

      {/* 7. Contact & Sales Inquiries Section */}
      <section id="contact" className="py-24 border-b border-slate-800/40">
        <CContainer className="px-4 lg:px-8 max-w-4xl mx-auto">
          <div
            className="rounded-3xl border p-6 sm:p-12 shadow-2xl"
            style={{
              backgroundColor: isDark ? '#0d131f' : '#ffffff',
              borderColor: isDark ? '#1e2638' : '#cbd5e1',
            }}
          >
            <CRow className="g-5">
              <CCol xs={12} md={5}>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-3"
                  style={{
                    backgroundColor: isDark ? 'rgba(79, 12, 22, 0.25)' : 'rgba(79, 12, 22, 0.08)',
                    color: isDark ? '#fca5a5' : '#4f0c16',
                    borderColor: isDark ? '#871b29' : 'rgba(79, 12, 22, 0.35)',
                  }}
                >
                  {isAr ? 'فريق المبيعات والاستشارات' : 'Sales & Advisory'}
                </span>
                <h3 className={`text-xl sm:text-2xl font-black mb-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isAr ? 'هل تحتاج إلى استشارة لتهيئة صالة القص؟' : 'Need Custom Deployment for Your Factory?'}
                </h3>
                <p className={`text-xs leading-relaxed mb-6 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {isAr
                    ? 'فريقنا الهندسي مستعد لمساعدتك في ضبط دورة العمل، استيراد بيانات الموديلات والخامات، وتدريب مديري الإنتاج.'
                    : 'Our engineering specialists assist in setting up cutting workflows, importing rolls, and training floor managers.'}
                </p>

                <div className={`space-y-3 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <Mail className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <span>sales@garmentos.cloud</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <span>+20 100 000 0000</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                    <span>{isAr ? 'القاهرة • العاشر من رمضان • المحلة الكبرى' : 'Cairo • 10th of Ramadan • Mahalla'}</span>
                  </div>
                </div>
              </CCol>

              <CCol xs={12} md={7}>
                {contactSuccess && (
                  <CAlert color="success" className="text-xs mb-4">
                    {contactSuccess}
                  </CAlert>
                )}

                {contactError && (
                  <CAlert color="danger" className="text-xs mb-4">
                    {contactError}
                  </CAlert>
                )}

                <CForm onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className={`form-label text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{isAr ? 'الاسم بالكامل *' : 'Full Name *'}</label>
                      <CFormInput
                        size="sm"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={isAr ? 'م. أحمد حسني' : 'Ahmed Hosny'}
                        disabled={isSubmittingContact}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className={`form-label text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{isAr ? 'البريد الإلكتروني للعمل *' : 'Work Email *'}</label>
                      <CFormInput
                        type="email"
                        size="sm"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="manager@factory.com"
                        disabled={isSubmittingContact}
                      />
                    </div>
                  </div>

                  <div className="row g-2">
                    <div className="col-12 col-sm-6">
                      <label className={`form-label text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{isAr ? 'رقم الهاتف / واتساب' : 'Phone / WhatsApp'}</label>
                      <CFormInput
                        size="sm"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+20 100 000 0000"
                        disabled={isSubmittingContact}
                      />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className={`form-label text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{isAr ? 'اسم المصنع أو الشركة' : 'Company Name'}</label>
                      <CFormInput
                        size="sm"
                        value={contactCompany}
                        onChange={(e) => setContactCompany(e.target.value)}
                        placeholder={isAr ? 'مصنع النيل للملابس' : 'Nile Garments'}
                        disabled={isSubmittingContact}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`form-label text-[11px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{isAr ? 'تفاصيل الاستفسار أو متطلبات المصنع *' : 'Message *'}</label>
                    <CFormTextarea
                      rows={3}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder={isAr ? 'عدد خطوط الإنتاج، طبيعة العمل (ملابس جاهزة، تشغيل للغير)، عدد طاولات القص...' : 'Describe your manufacturing scale, cutting lines, or CMT requirements...'}
                      disabled={isSubmittingContact}
                    />
                  </div>

                  <CButton
                    type="submit"
                    disabled={isSubmittingContact}
                    className="btn-brand-primary w-full py-2.5 text-xs font-bold rounded-xl mt-2 flex items-center justify-center gap-2"
                  >
                    {isSubmittingContact ? (
                      <>
                        <CSpinner size="sm" />
                        <span>{isAr ? 'جارِ الإرسال...' : 'Sending...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{isAr ? 'إرسال الاستفسار لفريق المبيعات' : 'Submit Consultation Request'}</span>
                      </>
                    )}
                  </CButton>
                </CForm>
              </CCol>
            </CRow>
          </div>
        </CContainer>
      </section>

      {/* 8. Public Footer */}
      <footer
        className={`py-12 border-t text-xs ${
          isDark ? 'border-slate-800 bg-[#06080e] text-slate-500' : 'border-slate-200 bg-white text-slate-600'
        }`}
      >
        <CContainer className="px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                <Scissors className="w-4 h-4 -rotate-45" />
              </div>
              <span className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>GarmentOS Cloud</span>
              <span className="text-slate-600">•</span>
              <span className="text-[11px] text-slate-400">
                {isAr ? 'المنظومة السحابية لإدارة مصانع الملابس' : 'Garment Manufacturing SaaS'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'جميع الأنظمة السحابية تعمل بكفاءة 99.9%' : 'All Cloud Systems Operational (99.9% SLA)'}</span>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <div>
              © {new Date().getFullYear()} GarmentOS Cloud. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>{isAr ? 'عزل مستأجرين مشدد' : 'Strict Tenant Isolation'}</span>
              <span>•</span>
              <span>Sanctum RBAC</span>
              <span>•</span>
              <span>Phase 6 CMT</span>
            </div>
          </div>
        </CContainer>
      </footer>
    </div>
  );
};

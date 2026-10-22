import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Send,
  ChevronDown,
  ChevronUp,
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
        <div className="w-12 h-12 rounded-2xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] flex items-center justify-center mx-auto">
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
            <li><strong>عزل أمني تام (Tenant Isolation):</strong> كل مصنع يمتلك بيئته المعزولة تماماً مع حماية سرية الموديلات وقوائم التكاليف.</li>
            <li><strong>سحابة بالكامل (100% Cloud Native):</strong> تعمل من أي متصفح أو تابلت في صالة القص دون حاجة لخوادم داخلية مكلفة.</li>
            <li><strong>دفاتر تدقيق غير قابلة للتعديل (Immutable Ledgers):</strong> توثيق دقيق لكل متر قماش وكل حزمة منتجة لمنع التلاعب والتوالف غير المبررة.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export const PricingPage: React.FC<InfoPageProps> = ({ lang, onOpenRegister }) => {
  const isAr = lang === 'ar';
  const plans = [
    {
      id: 'starter' as const,
      name: isAr ? 'باقة الورش والمشاغل' : 'Starter Workshop',
      price: isAr ? '1,450' : '$49',
      period: isAr ? 'ج.م / شهرياً' : '/ month',
      desc: isAr ? 'مثالية للورش وصالات القص الصغيرة (حتى خطين إنتاج).' : 'Ideal for small cutting workshops and independent sewing units.',
      features: [
        isAr ? 'حتى 3 مستخدمين نشطين' : 'Up to 3 active users',
        isAr ? 'إدارة أوامر القص والفرش الأساسية' : 'Basic cutting & lay tracking',
        isAr ? 'مخزن قماش واحد وتتبع الأمتار' : '1 fabric warehouse & roll log',
        isAr ? 'طباعة كروت الحزم والباركود' : 'Barcode bundle tags',
      ],
      popular: false,
    },
    {
      id: 'professional' as const,
      name: isAr ? 'باقة المصانع المتكاملة' : 'Professional Factory',
      price: isAr ? '3,850' : '$129',
      period: isAr ? 'ج.م / شهرياً' : '/ month',
      desc: isAr ? 'الخيار الأكثر طلباً لمصانع الملابس المتوسطة والمتكاملة.' : 'Most popular choice for medium full-cycle apparel plants.',
      features: [
        isAr ? 'حتى 15 مستخدماً وصلاحيات مخصصة' : 'Up to 15 users with custom RBAC',
        isAr ? 'هندسة صالة القص وحاسبة الـ GSM الذكية' : 'Smart GSM & marker yield engine',
        isAr ? 'عقود التشغيل للغير والـ CMT بالكامل' : 'Full CMT subcontracting module',
        isAr ? 'شجرة الحسابات والقيود اليومية الآلية' : 'Automated double-entry accounting',
        isAr ? 'أجور القطعة ومسح باركود العمال' : 'Piece-rate & bundle worker payroll',
        isAr ? 'متجر إلكتروني B2B خاص بمصنعك' : 'Branded B2B wholesale storefront',
      ],
      popular: true,
    },
    {
      id: 'enterprise' as const,
      name: isAr ? 'باقة كبرى المجموعات' : 'Enterprise Scale',
      price: isAr ? '7,900' : '$249',
      period: isAr ? 'ج.م / شهرياً' : '/ month',
      desc: isAr ? 'للمصانع الكبرى متعددة الفروع والمخازن وخطوط التصدير.' : 'For large industrial groups with multi-branch production.',
      features: [
        isAr ? 'عدد غير محدود من المستخدمين والفروع' : 'Unlimited users, branches & depots',
        isAr ? 'تتبع صيانة الماكينات والأصول بالكامل' : 'Full machine maintenance & asset tracking',
        isAr ? 'دعم فني مخصص وأولوية الاستجابة على مدار الساعة' : 'Dedicated technical account manager',
        isAr ? 'ربط مخصص لقواعد البيانات وخطط التوسع السحابي' : 'Custom integrations & SLA guarantees',
      ],
      popular: false,
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'باقات اشتراك شفافة مصممة لحجم مصنعك' : 'Transparent Pricing for Every Factory Size'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {isAr
            ? 'ابدأ تجربة مجانية كاملة الميزات لمدة 14 يوماً بدون بطاقة ائتمان مسبقة. الترقية أو الإلغاء متاح في أي وقت.'
            : 'Start with a 14-day free trial. No credit card required. Upgrade or cancel anytime.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col justify-between ${
              p.popular
                ? 'border-[#7F1625] dark:border-[#9E2A3B] shadow-xl ring-2 ring-[#7F1625]/20'
                : 'border-slate-200 dark:border-slate-800 shadow-xs'
            }`}
          >
            <div className="space-y-4">
              {p.popular && (
                <div className="inline-block px-3 py-1 rounded-full bg-[#7F1625] text-white text-[10px] font-bold">
                  {isAr ? 'الأكثر طلباً واختياراً' : 'Most Popular'}
                </div>
              )}
              <h3 className="text-lg font-black text-slate-900 dark:text-white font-sans">
                {p.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {p.desc}
              </p>
              <div className="pt-2">
                <span className="text-3xl font-black text-slate-950 dark:text-white font-mono">
                  {p.price}
                </span>
                <span className="text-xs text-slate-500 mr-1.5 font-sans">
                  {p.period}
                </span>
              </div>
              <ul className="space-y-2 text-xs pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                {p.features.map((f, fi) => (
                  <li key={fi} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onOpenRegister?.(p.id)}
              className={`w-full mt-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                p.popular
                  ? 'btn-brand-primary text-white shadow-md'
                  : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              {isAr ? 'بدء التجربة المجانية (14 يوماً)' : 'Start 14-Day Free Trial'}
            </button>
          </div>
        ))}
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
              {openIdx === idx ? <ChevronUp className="w-4 h-4 text-[#7F1625]" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
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
      setError(err.message || 'فشل إرسال الطلب، يرجى المحاولة لاحقاً.');
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

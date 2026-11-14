import React, { useState } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
  Send,
  Sparkles,
  Award,
  Layers,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';
import { api } from '../../../api/client';

interface StorefrontContentPageProps {
  pageType: 'about' | 'contact' | 'policies' | 'custom';
}

export const StorefrontContentPage: React.FC<StorefrontContentPageProps> = ({ pageType }) => {
  const {
    isAr,
    isDark,
    storeSettings,
    tenantInfo,
    setActiveView,
    addToast,
    activeCustomPageId,
  } = useStorefrontCommerce();

  const themeConfig = storeSettings?.theme_config || {};
  const storeName = storeSettings?.store_name || tenantInfo?.name || (isAr ? 'مصنع الملابس الجاهزة' : 'Apparel Factory');
  const whatsappNumber = storeSettings?.contact_whatsapp || tenantInfo?.phone || '+201000000000';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');

  const customPages = Array.isArray(themeConfig.custom_pages) ? themeConfig.custom_pages : [];
  const customPage = customPages.find(
    (p: any) => p.id === activeCustomPageId || p.slug === activeCustomPageId
  );

  // Contact form local state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Active Policy Tab
  const [activePolicyTab, setActivePolicyTab] = useState<'returns' | 'shipping' | 'payment' | 'wholesale' | 'privacy'>('returns');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !contactMessage.trim()) {
      addToast(isAr ? 'يرجى ملء كافة حقول رسالة التواصل' : 'Please fill in all inquiry fields', 'warning');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setContactName('');
      setContactPhone('');
      setContactMessage('');
      addToast(
        isAr
          ? 'تم استلام استفسارك بنجاح! سيتواصل معك أحد مسؤولي خدمة العملاء بالمصنع قريباً.'
          : 'Thank you! Your message has been received and our factory support team will reach out shortly.',
        'success'
      );
    }, 600);
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-[70vh] py-10 px-4 sm:px-6 lg:px-8 transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => {
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-blue-600 transition"
          >
            {isAr ? 'الرئيسية' : 'Home'}
          </button>
          <span>/</span>
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            {pageType === 'about'
              ? isAr ? 'عن المصنع والمتجر' : 'About Factory Store'
              : pageType === 'contact'
              ? isAr ? 'تواصل مع المصنع' : 'Contact Us'
              : pageType === 'policies'
              ? isAr ? 'سياسات وشروط المتجر' : 'Store Policies'
              : customPage
              ? isAr ? customPage.title_ar || customPage.title : customPage.title_en || customPage.title_ar || customPage.title
              : isAr ? 'صفحة مخصصة' : 'Custom Page'}
          </span>
        </div>

        {/* ----------------- 1. ABOUT PAGE ----------------- */}
        {pageType === 'about' && (
          <div className="space-y-12">
            {/* Header Hero */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'منصة البيع المباشر من خط الإنتاج' : 'Direct Factory Sales Platform'}</span>
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                {isAr ? `عن ${storeName}` : `About ${storeName}`}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                {themeConfig.pages?.about_story ||
                  (isAr
                    ? 'نحن صرح صناعي متكامل متخصص في تصميم وتصنيع الملابس الجاهزة واليونيفورم والمنسوجات القطنية عالية الجودة. نوفر منتجاتنا مباشرة للمستهلكين والشركات دون وسطاء لضمان أعلى معايير الجودة وأفضل قيمة سعرية.'
                    : 'A dedicated apparel manufacturing facility delivering premium garments, uniforms, and 100% Egyptian cotton textiles directly from our production floors to consumers and corporate clients.')}
              </p>
            </div>

            {/* Core Value Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base">{isAr ? 'جودة وتصنيع مصري 100%' : '100% Egyptian Quality'}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAr
                    ? 'نعتمد أجود خيوط القطن المصري طويل التيلة مع معالجات تثبيت الصبغة ومقاومة الانكماش عبر أحدث ماكينات القص والخياطة السويسرية والألمانية.'
                    : 'Crafted using fine long-staple Egyptian cotton with color-fast and shrink-resistant finishing using modern automated equipment.'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base">{isAr ? 'سعر المصنع العادل' : 'Direct Factory Value'}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAr
                    ? 'بإلغاء سلاسل التوزيع وهوامش الوسطاء، نقدم لعملائنا في قطاعي التجزئة والجملة أسعاراً تنافسية حقيقية محسوبة بدقة على أساس تكلفة التصنيع الفعلية.'
                    : 'Eliminating intermediaries allows us to offer both retail shoppers and B2B partners direct-from-production pricing based on authentic manufacturing costs.'}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-base">{isAr ? 'تكامل الـ ERP والمخزون' : 'Cloud ERP Integrated'}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isAr
                    ? 'متجرنا متصل لحظياً بأنظمة إدارة خطوط الإنتاج والمستودعات في GarmentOS Cloud، مما يضمن دقة الأرصدة المعروضة وجاهزية الشحن الفوري.'
                    : 'Directly linked with our GarmentOS Cloud ERP floor operations, ensuring 100% real-time stock integrity and rapid dispatch.'}
                </p>
              </div>
            </div>

            {/* Factory Direct CTA */}
            <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-center md:text-start">
                <h3 className="text-xl font-black">{isAr ? 'جاهزون لاستكشاف التشكيلة الجديدة؟' : 'Ready to explore our new collections?'}</h3>
                <p className="text-xs text-blue-100">{isAr ? 'تصفح كافة الموديلات الجاهزة للشحن الفوري لباب منزلك' : 'Browse items ready for immediate doorstep dispatch'}</p>
              </div>
              <Button
                variant="secondary"
                className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs px-6 py-3 rounded-xl shadow-md"
                onClick={() => setActiveView('shop')}
              >
                {isAr ? 'تصفح المتجر الآن' : 'Shop Collections Now'}
              </Button>
            </div>
          </div>
        )}

        {/* ----------------- 2. CONTACT PAGE ----------------- */}
        {pageType === 'contact' && (
          <div className="space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                <Phone className="w-3.5 h-3.5" />
                <span>{isAr ? 'قنوات التواصل المباشرة' : 'Direct Support Channels'}</span>
              </span>
              <h1 className="text-3xl font-black tracking-tight">
                {isAr ? 'نسعد بخدمتكم وتواصلكم معنا' : 'Get in Touch with Our Team'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isAr
                  ? 'فريق خدمة عملاء المصنع متواجد للرد على كافة استفسارات المقاسات، الطلبات الفردية، وتوريدات الجملة واليونيفورم.'
                  : 'Our customer support team is available to assist with orders, sizing, wholesale quotes, and manufacturing inquiries.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Contact Info Cards */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-sm border-b pb-3 border-slate-100 dark:border-slate-800">
                    {isAr ? 'معلومات المصنع والمقر' : 'Factory & Showroom Contact'}
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block">{isAr ? 'العنوان والمقر' : 'Factory Address'}</span>
                        <span className="text-slate-500">
                          {themeConfig.contact?.address || (isAr ? 'المنطقة الصناعية، جمهورية مصر العربية' : 'Industrial Zone, Egypt')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block">{isAr ? 'الهاتف المباشر' : 'Phone Line'}</span>
                        <span className="text-slate-500 font-mono">
                          {themeConfig.contact?.phone || tenantInfo?.phone || '+20 100 000 0000'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</span>
                        <span className="text-slate-500 font-mono">
                          {themeConfig.contact?.email || 'support@delta-garments.com'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold block">{isAr ? 'مواعيد العمل الرسمية' : 'Operating Hours'}</span>
                        <span className="text-slate-500">
                          {isAr ? 'السبت - الخميس: من 9:00 صباحاً حتى 6:00 مساءً' : 'Sat - Thu: 9:00 AM - 6:00 PM'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {cleanWhatsapp && (
                    <div className="pt-2">
                      <a
                        href={`https://wa.me/${cleanWhatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{isAr ? 'محادثة فورية عبر واتساب' : 'Chat on WhatsApp Directly'}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Inquiry Form */}
              <div className="lg:col-span-7">
                <form
                  onSubmit={handleSendMessage}
                  className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
                >
                  <h3 className="font-extrabold text-sm mb-2">
                    {isAr ? 'أرسل لنا استفسارك أو طلبك الخاص' : 'Send an Inquiry to Factory Sales'}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5">{isAr ? 'الاسم بالكامل' : 'Full Name'} *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={isAr ? 'مثال: محمد أحمد' : 'e.g. John Doe'}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5">{isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'} *</label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">{isAr ? 'تفاصيل الرسالة أو الطلب' : 'Message Details'} *</label>
                    <textarea
                      rows={5}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder={isAr ? 'اكتب استفسارك عن المقاسات، الشحن، أو مواصفات توريد الجملة...' : 'Write your inquiry here...'}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSending}
                    className="w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? (isAr ? 'جاري الإرسال...' : 'Sending...') : (isAr ? 'إرسال الرسالة الآن' : 'Send Message')}</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- 3. POLICIES PAGE ----------------- */}
        {pageType === 'policies' && (
          <div className="space-y-8">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                <FileText className="w-3.5 h-3.5" />
                <span>{isAr ? 'الشفافية وحماية المستهلك' : 'Consumer Protection & Terms'}</span>
              </span>
              <h1 className="text-3xl font-black tracking-tight">
                {isAr ? 'سياسات وشروط التعامل مع المتجر' : 'Store Terms & Operational Policies'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                {isAr
                  ? 'نلتزم بكافة حقوق المستهلك والقوانين التجارية المصرية لضمان تجربة تسوق آمنة وموثوقة.'
                  : 'Fully compliant with Egyptian consumer protection regulations for a secure and transparent experience.'}
              </p>
            </div>

            {/* Policy Tabs Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              {[
                { id: 'returns', label: isAr ? 'الاستبدال والاسترجاع' : 'Returns & Exchange', icon: RotateCcw },
                { id: 'shipping', label: isAr ? 'الشحن والتوصيل' : 'Shipping & Delivery', icon: Truck },
                { id: 'payment', label: isAr ? 'طرق الدفع والإنستاباي' : 'Payment Methods', icon: ShieldCheck },
                { id: 'wholesale', label: isAr ? 'شروط الجملة والـ B2B' : 'Wholesale Terms', icon: Building2 },
                { id: 'privacy', label: isAr ? 'سياسة الخصوصية' : 'Privacy Policy', icon: Sparkles },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activePolicyTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePolicyTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Policy Content Body */}
            <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm leading-relaxed space-y-6 text-xs sm:text-sm">
              {activePolicyTab === 'returns' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-emerald-500" />
                    <span>{isAr ? 'سياسة الاستبدال والاسترجاع (14 يوماً)' : '14-Day Return & Exchange Policy'}</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'وفقاً لقانون حماية المستهلك المصري، يحق للعميل استبدال أو استرجاع المنتجات خلال 14 يوماً من تاريخ استلام الشحنة، مع مراعاة الشروط التالية:'
                      : 'According to Egyptian consumer protection law, customers may exchange or return items within 14 days of receipt subject to the following terms:'}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>{isAr ? 'أن يكون المنتج بحالته الأصلية دون غسيل أو استخدام ومع كافة تكتات وبطاقات المصنع.' : 'Item must be unused, unwashed, and with all original tags attached.'}</li>
                    <li>{isAr ? 'إرفاق فاتورة الشراء أو بوليصة الشحن مع المرتجع.' : 'Include original invoice or shipping waybill.'}</li>
                    <li>{isAr ? 'في حال وجود عيب صناعة، يتحمل المصنع كافة مصاريف الشحن والاستبدال بالكامل فوراً.' : 'Manufacturing defects are fully covered by the factory with free collection and replacement.'}</li>
                    <li>{isAr ? 'في حال الاستبدال لتغيير المقاس بناءً على رغبة العميل، يتحمل العميل فرق مصاريف الشحن فقط.' : 'Size exchanges requested by customer only carry the standard local shipping fee difference.'}</li>
                  </ul>
                </div>
              )}

              {activePolicyTab === 'shipping' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-500" />
                    <span>{isAr ? 'مواعيد وتغطية الشحن والتوصيل' : 'Shipping Schedules & Coverage'}</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'نتعامل مع كبرى شركات الشحن السريع لتوصيل الطلبات لكافة أنحاء جمهورية مصر العربية:'
                      : 'We partner with leading domestic couriers to cover all Egyptian governorates:'}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>{isAr ? 'القاهرة الكبرى والإسكندرية: التوصيل خلال 24 - 48 ساعة من تأكيد الطلب.' : 'Cairo & Alexandria: Delivery within 24 - 48 hours.'}</li>
                    <li>{isAr ? 'محافظات الدلتا والقناة: التوصيل خلال 2 - 3 أيام عمل.' : 'Delta & Canal cities: Delivery in 2 - 3 business days.'}</li>
                    <li>{isAr ? 'محافظات الصعيد وسيناء والبحر الأحمر: التوصيل خلال 3 - 4 أيام عمل.' : 'Upper Egypt & Coastal cities: Delivery in 3 - 4 business days.'}</li>
                    <li>{isAr ? 'الشحن مجاني للطلبات بقيمة 1,500 جنيه مصري فأكثر.' : 'Free shipping on orders exceeding 1,500 EGP.'}</li>
                  </ul>
                </div>
              )}

              {activePolicyTab === 'payment' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-amber-500" />
                    <span>{isAr ? 'طرق الدفع المعتمدة والتحويلات' : 'Payment Methods & Security'}</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'نوفر خيارات دفع مرنة وآمنة تناسب كافة العملاء:'
                      : 'We provide convenient and secure payment options:'}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>{isAr ? 'الدفع نقداً عند الاستلام (COD): ادفع لمندوب الشحن بعد معاينة الطرد والتأكد من المقاسات.' : 'Cash on Delivery (COD): Pay courier upon receiving your package.'}</li>
                    <li>{isAr ? 'الدفع عبر إنستاباي (InstaPay): التحويل الفوري الآمن لحساب المصنع المعتمد مع رفع إيصال التحويل للمراجعة السريعة.' : 'InstaPay: Direct bank transfer to our factory verified account with fast automated receipt verification.'}</li>
                    <li>{isAr ? 'التحويل البنكي المباشر: متاح لطلبات الجملة والمؤسسات مع إصدار فاتورة ضريبية رسمية.' : 'Commercial wire transfers: Available for corporate and B2B wholesale orders with official VAT tax invoice.'}</li>
                  </ul>
                </div>
              )}

              {activePolicyTab === 'wholesale' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-500" />
                    <span>{isAr ? 'شروط تجارة الجملة والزي الموحد (B2B)' : 'Wholesale & Contract Manufacturing Terms'}</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'لأصحاب المحلات التجارية والموزعين والمؤسسات الراغبة في التوريد المباشر:'
                      : 'For retail shop owners, distributors, and organizations seeking contract manufacturing:'}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-400">
                    <li>{isAr ? 'الحد الأدنى للطلب (MOQ): محدد لكل موديل أو مقاس ويظهر فوراً في كتالوج الجملة المعتمد.' : 'MOQ is specified per design and visible once B2B account is verified.'}</li>
                    <li>{isAr ? 'شرائح الأسعار التصاعدية: كلما زادت كمية الطلب، انخفض سعر القطعة تلقائياً في السلة.' : 'Tiered pricing: Unit cost automatically decreases as batch volume increases.'}</li>
                    <li>{isAr ? 'اعتماد الحسابات: يتم مراجعة السجل التجاري والبطاقة الضريبية وتفعيل الحساب خلال ساعتين عمل.' : 'Trade accounts are activated within 2 business hours upon tax/commercial ID review.'}</li>
                  </ul>
                </div>
              )}

              {activePolicyTab === 'privacy' && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-sky-500" />
                    <span>{isAr ? 'سياسة حماية البيانات والخصوصية' : 'Data Privacy & Security'}</span>
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {isAr
                      ? 'نحن نحترم خصوصية بياناتكم بشكل مطلق. لا يتم استخدام أرقام الهواتف أو العناوين إلا لغرض توصيل الشحنات والتواصل بشأن حالة الطلب. كافة البيانات مشفرة ومحفوظة بأعلى معايير الأمان السحابي.'
                      : 'We respect your absolute privacy. Customer contact numbers and addresses are strictly utilized for delivery fulfillment and order tracking notifications. Data is securely encrypted in accordance with global enterprise security practices.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- 4. CUSTOM PAGES ----------------- */}
        {pageType === 'custom' && (
          <div className="space-y-10">
            {customPage ? (
              <div className="space-y-8">
                {/* Hero / Header of Custom Page */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white shadow-xl">
                  {customPage.featured_image && (
                    <div className="relative h-64 sm:h-80 w-full overflow-hidden">
                      <img
                        src={api.getMediaUrl(customPage.featured_image)}
                        alt={isAr ? customPage.title_ar || customPage.title : customPage.title_en || customPage.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    </div>
                  )}

                  <div className={`p-6 sm:p-10 space-y-4 ${customPage.featured_image ? 'relative -mt-16 sm:-mt-24 z-10' : ''}`}>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{storeName}</span>
                      <span>•</span>
                      <span>{isAr ? 'توثيق رسمي' : 'Official Page'}</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                      {isAr ? customPage.title_ar || customPage.title : customPage.title_en || customPage.title_ar || customPage.title}
                    </h1>

                    {(customPage.subtitle_ar || customPage.subtitle_en) && (
                      <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                        {isAr ? customPage.subtitle_ar || customPage.subtitle_en : customPage.subtitle_en || customPage.subtitle_ar}
                      </p>
                    )}
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                  {(() => {
                    const rawContent = isAr
                      ? customPage.content_ar || customPage.content_en || customPage.content || ''
                      : customPage.content_en || customPage.content_ar || customPage.content || '';
                    const lines = rawContent.split('\n');

                    return (
                      <div className="space-y-4 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                        {lines.map((line: string, idx: number) => {
                          const trimmed = line.trim();
                          if (!trimmed) {
                            return <div key={idx} className="h-2" />;
                          }
                          if (trimmed.startsWith('### ')) {
                            return (
                              <h4 key={idx} className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white pt-3">
                                {trimmed.replace(/^###\s+/, '')}
                              </h4>
                            );
                          }
                          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                            return (
                              <h3 key={idx} className="font-black text-lg sm:text-xl text-slate-900 dark:text-white pt-4 pb-1 border-b border-slate-200 dark:border-slate-800">
                                {trimmed.replace(/^#+\s+/, '')}
                              </h3>
                            );
                          }
                          if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
                            return (
                              <div key={idx} className="flex items-start gap-2.5 ms-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                                <span>{trimmed.replace(/^[-*•]\s+/, '')}</span>
                              </div>
                            );
                          }
                          return (
                            <p key={idx} className="text-slate-600 dark:text-slate-400">
                              {trimmed}
                            </p>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Actions & Inquiry Footer */}
                  <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {cleanWhatsapp && (
                        <a
                          href={`https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
                            isAr
                              ? `مرحباً، أستفسر بخصوص صفحة: ${customPage.title_ar || customPage.title}`
                              : `Hello, inquiry regarding: ${customPage.title_en || customPage.title}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm px-5 py-2.5 rounded-xl font-bold transition shadow-sm"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{isAr ? 'استفسار عبر واتساب المصنع' : 'WhatsApp Inquiry'}</span>
                        </a>
                      )}

                      <Button
                        variant="primary"
                        className="text-xs sm:text-sm rounded-xl inline-flex items-center gap-2"
                        onClick={() => {
                          setActiveView('shop');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>{isAr ? 'تصفح تشكيلة الملابس' : 'Browse Garment Catalog'}</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="text-xs text-slate-500 inline-flex items-center gap-1.5"
                      onClick={() => {
                        setActiveView('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <span>{isAr ? 'العودة للرئيسية' : 'Back to Home'}</span>
                      {isAr ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 max-w-lg mx-auto">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isAr ? 'الصفحة قيد الإعداد أو غير موجودة' : 'Page Not Found or Under Setup'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? 'لم يتم العثور على محتوى لهذه الصفحة أو تم تعديل الرابط في استوديو التصميم.'
                    : 'The requested page content is not available or has been modified in Design Studio.'}
                </p>
                <Button
                  variant="primary"
                  className="text-xs rounded-xl"
                  onClick={() => {
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {isAr ? 'العودة لمتجر المصنع' : 'Return to Storefront'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

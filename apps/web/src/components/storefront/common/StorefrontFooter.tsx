import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  MessageCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';

export const StorefrontFooter: React.FC = () => {
  const {
    setActiveView,
    setIsWholesaleModalOpen,
    isAr,
    storeSettings,
    tenantInfo,
  } = useStorefrontCommerce();

  const themeConfig = storeSettings?.theme_config || {};
  const storeName = storeSettings?.store_name || tenantInfo?.name || (isAr ? 'مصنع الملابس الجاهزة' : 'Apparel Factory Store');
  const whatsappNumber = themeConfig.contact?.whatsapp || storeSettings?.contact_whatsapp || tenantInfo?.phone || '+201000000000';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const contactPhone = themeConfig.contact?.phone || tenantInfo?.phone || '+20 100 000 0000';
  const contactEmail = themeConfig.contact?.email || 'support@delta-garments.com';
  const contactAddress = themeConfig.contact?.address || (isAr ? 'المنطقة الصناعية، جمهورية مصر العربية' : 'Industrial Zone, Egypt');

  return (
    <footer
      className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-16 select-none"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Propositions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 border-b border-slate-800 text-center md:text-start">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {isAr ? 'شحن سريع لجميع المحافظات' : 'Nationwide Express Delivery'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'توصيل لباب المنزل في القاهرة الكبرى وكافة المحافظات'
                  : 'Doorstep delivery to Cairo, Alex, and all governorates'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center shrink-0">
              <RotateCcw className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {isAr ? 'ضمان استبدال واسترجاع' : 'Hassle-Free Returns & Exchange'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'حق استبدال خلال 14 يوماً وفق قانون حماية المستهلك'
                  : '14-day exchange according to consumer protection laws'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="w-12 h-12 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">
                {isAr ? 'جودة وتصنيع مصري 100%' : '100% Egyptian Apparel Quality'}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'منتجات جاهزة مصنعة بأعلى مواصفات الغزل والنسيج'
                  : 'Factory-direct finished garments with premium textiles'}
              </p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Column 1: Store & Factory Heritage */}
          <div>
            <h5 className="font-bold text-white text-sm mb-4">
              {isAr ? 'عن المصنع والمتجر' : 'About Factory Store'}
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {themeConfig.pages?.about_summary ||
                storeSettings?.banner_subtitle ||
                (isAr
                  ? 'منصة بيع مباشرة متصلة بخطوط إنتاج مصنعنا لتقديم أفضل أزياء وملابس موحدة بأعلى جودة وسعر منافس.'
                  : 'Direct-to-consumer & B2B storefront powered by GarmentOS Cloud apparel manufacturing ERP.')}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'مصنع مسجل ومعتمد رسمياً' : 'Certified & Registered Factory'}</span>
            </div>
          </div>

          {/* Column 2: Quick Shopping */}
          <div>
            <h5 className="font-bold text-white text-sm mb-4">
              {isAr ? 'روابط التسوق' : 'Quick Shopping'}
            </h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => {
                    setActiveView('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'جميع الموديلات والمنتجات' : 'All Available Items'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('category');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'تصفح حسب الأقسام' : 'Browse by Category'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('account');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'قائمة المنتجات المفضلة' : 'Saved Wishlist'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setIsWholesaleModalOpen(true);
                  }}
                  className="hover:text-amber-400 text-amber-300 transition text-start flex items-center gap-1 font-bold"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حسابات وتوريدات الجملة (B2B)' : 'Wholesale B2B Program'}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Care & Policies */}
          <div>
            <h5 className="font-bold text-white text-sm mb-4">
              {isAr ? 'خدمة العملاء والسياسات' : 'Customer Care & Policies'}
            </h5>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <button
                  onClick={() => {
                    setActiveView('tracking');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition flex items-center gap-1.5 text-start"
                >
                  <Truck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isAr ? 'تتبع حالة الشحنة' : 'Track Order Status'}</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('policies');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'سياسة الاستبدال والاسترجاع' : 'Exchange & Return Terms'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('policies');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'مواعيد وتكاليف الشحن' : 'Shipping Schedules & Rates'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'عن خطوط إنتاج المصنع' : 'About Factory Production'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setActiveView('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="hover:text-white transition text-start"
                >
                  {isAr ? 'تواصل معنا مباشرة' : 'Contact Support'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Factory Contact & WhatsApp */}
          <div>
            <h5 className="font-bold text-white text-sm mb-4">
              {isAr ? 'تواصل مع المصنع' : 'Direct Factory Contact'}
            </h5>
            <div className="space-y-2 text-xs text-slate-400 mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="font-mono">{contactPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-mono">{contactEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{contactAddress}</span>
              </div>
            </div>

            {cleanWhatsapp && (
              <a
                href={`https://wa.me/${cleanWhatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{isAr ? 'محادثة واتساب فورية' : 'Chat on WhatsApp'}</span>
              </a>
            )}
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} {storeName}. {isAr ? 'جميع الحقوق محفوظة للمصنع.' : 'All rights reserved.'}</p>
          <div className="flex items-center gap-2 text-slate-400">
            <span>Powered by</span>
            <span className="font-black text-white bg-slate-800 px-2 py-0.5 rounded text-[11px] border border-slate-700">
              GarmentOS Cloud
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

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
  Award,
  Sparkles,
  Package,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { api } from '../../../api/client';

export const StorefrontFooter: React.FC = () => {
  const {
    setActiveView,
    setIsWholesaleModalOpen,
    isAr,
    storeSettings,
    tenantInfo,
    navigateToCustomPage,
  } = useStorefrontCommerce();

  const themeConfig = storeSettings?.theme_config || {};
  const storeName = storeSettings?.store_name || tenantInfo?.name || (isAr ? 'مصنع الملابس الجاهزة' : 'Apparel Factory Store');
  const whatsappNumber = themeConfig.contact?.whatsapp || storeSettings?.contact_whatsapp || tenantInfo?.phone || '+201000000000';
  const cleanWhatsapp = whatsappNumber.replace(/[^0-9]/g, '');
  const contactPhone = themeConfig.contact?.phone || tenantInfo?.phone || '+20 100 000 0000';
  const contactEmail = themeConfig.contact?.email || 'support@delta-garments.com';
  const contactAddress = themeConfig.contact?.address || (isAr ? 'المنطقة الصناعية، جمهورية مصر العربية' : 'Industrial Zone, Egypt');

  const footerConfig = themeConfig.footer || {};
  const showFooterLogo = footerConfig.show_logo !== false;
  const logoUrl = themeConfig.logo_url ? api.getMediaUrl(themeConfig.logo_url) : null;
  const showBadges = footerConfig.show_badges !== false;
  const customFooterDesc = isAr
    ? footerConfig.desc_ar || themeConfig.pages?.about_summary || storeSettings?.banner_subtitle
    : footerConfig.desc_en || themeConfig.pages?.about_summary || storeSettings?.banner_subtitle;

  const customPages = Array.isArray(themeConfig.custom_pages) ? themeConfig.custom_pages : [];
  const footerCustomPages = customPages.filter((p: any) => p.show_in_footer !== false);

  const defaultBadges = [
    {
      icon: 'truck',
      title_ar: 'شحن سريع لجميع المحافظات',
      title_en: 'Nationwide Express Delivery',
      desc_ar: 'توصيل لباب المنزل في القاهرة الكبرى وكافة المحافظات',
      desc_en: 'Doorstep delivery to Cairo, Alex, and all governorates',
      color: 'blue',
    },
    {
      icon: 'rotate',
      title_ar: 'ضمان استبدال واسترجاع',
      title_en: 'Hassle-Free Returns & Exchange',
      desc_ar: 'حق استبدال خلال 14 يوماً وفق قانون حماية المستهلك',
      desc_en: '14-day exchange according to consumer protection laws',
      color: 'emerald',
    },
    {
      icon: 'shield',
      title_ar: 'جودة وتصنيع مصري 100%',
      title_en: '100% Egyptian Apparel Quality',
      desc_ar: 'منتجات جاهزة مصنعة بأعلى مواصفات الغزل والنسيج',
      desc_en: 'Factory-direct finished garments with premium textiles',
      color: 'amber',
    },
  ];

  const activeBadges = Array.isArray(footerConfig.badges) && footerConfig.badges.length > 0
    ? footerConfig.badges
    : defaultBadges;

  const renderBadgeIcon = (iconName: string, color: string) => {
    const iconColor =
      color === 'emerald' ? 'text-emerald-400' :
      color === 'amber' ? 'text-amber-400' :
      color === 'indigo' ? 'text-indigo-400' :
      color === 'rose' ? 'text-rose-400' : 'text-blue-400';
    const boxBorder =
      color === 'emerald' ? 'bg-emerald-950 border-emerald-800' :
      color === 'amber' ? 'bg-amber-950 border-amber-800' :
      color === 'indigo' ? 'bg-indigo-950 border-indigo-800' :
      color === 'rose' ? 'bg-rose-950 border-rose-800' : 'bg-blue-950 border-blue-800';

    let IconComp = Truck;
    if (iconName === 'rotate') IconComp = RotateCcw;
    else if (iconName === 'shield') IconComp = ShieldCheck;
    else if (iconName === 'factory' || iconName === 'building') IconComp = Building2;
    else if (iconName === 'award') IconComp = Award;
    else if (iconName === 'sparkles') IconComp = Sparkles;
    else if (iconName === 'package') IconComp = Package;

    return (
      <div className={`w-12 h-12 rounded-xl ${boxBorder} border flex items-center justify-center shrink-0`}>
        <IconComp className={`w-6 h-6 ${iconColor}`} />
      </div>
    );
  };

  return (
    <footer
      style={{ backgroundColor: themeConfig.layout?.footer_bg_color || undefined }}
      className={`text-slate-300 border-t border-slate-800 pt-12 pb-8 mt-16 select-none ${
        !themeConfig.layout?.footer_bg_color ? 'bg-slate-950' : ''
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value Propositions Row */}
        {showBadges && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10 border-b border-slate-800 text-center md:text-start">
            {activeBadges.map((badge: any, idx: number) => (
              <div key={idx} className="flex items-center gap-4 justify-center md:justify-start">
                {renderBadgeIcon(badge.icon || 'truck', badge.color || 'blue')}
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isAr ? badge.title_ar || badge.title : badge.title_en || badge.title_ar || badge.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? badge.desc_ar || badge.desc : badge.desc_en || badge.desc_ar || badge.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Column 1: Store & Factory Heritage */}
          <div>
            {showFooterLogo && logoUrl && (
              <div className="mb-4">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="h-10 w-auto object-contain brightness-110 drop-shadow-sm"
                />
              </div>
            )}
            <h5 className="font-bold text-white text-sm mb-3">
              {storeName}
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {customFooterDesc ||
                (isAr
                  ? 'منصة بيع مباشرة متصلة بخطوط إنتاج مصنعنا لتقديم أفضل أزياء وملابس موحدة بأعلى جودة وسعر منافس.'
                  : 'Direct-to-consumer & B2B storefront powered by GarmentOS Cloud apparel manufacturing ERP.')}
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>{isAr ? 'مصنع مسجل ومعتمد رسمياً' : 'Certified & Registered Factory'}</span>
            </div>
          </div>

          {/* Column 2: Quick Shopping & Categories */}
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

          {/* Column 3: Customer Care, Policies & Custom Pages */}
          <div>
            <h5 className="font-bold text-white text-sm mb-4">
              {isAr ? 'خدمة العملاء والصفحات' : 'Customer Care & Pages'}
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
                  {isAr ? 'سياسات الشحن والاسترجاع' : 'Exchange & Return Terms'}
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

              {/* Dynamically Render Custom Pages in Footer */}
              {footerCustomPages.map((cp: any) => (
                <li key={cp.id}>
                  <button
                    onClick={() => {
                      navigateToCustomPage(cp.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-blue-400 transition text-start flex items-center gap-1"
                  >
                    <span>•</span>
                    <span>{isAr ? cp.title_ar || cp.title : cp.title_en || cp.title_ar || cp.title}</span>
                  </button>
                </li>
              ))}
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
          <p>
            {footerConfig.copyright_ar && isAr
              ? footerConfig.copyright_ar.replace('{year}', new Date().getFullYear().toString())
              : footerConfig.copyright_en && !isAr
              ? footerConfig.copyright_en.replace('{year}', new Date().getFullYear().toString())
              : `© ${new Date().getFullYear()} ${storeName}. ${isAr ? 'جميع الحقوق محفوظة للمصنع.' : 'All rights reserved.'}`}
          </p>
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

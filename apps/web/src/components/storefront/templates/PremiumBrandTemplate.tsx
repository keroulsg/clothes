import React, { useState } from 'react';
import {
  Crown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Gem,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../../api/client';
import type { StorefrontTemplateProps } from './types';

export const PremiumBrandTemplate: React.FC<StorefrontTemplateProps> = ({
  lang,
  isDark,
  storeSettings,
  variants,
  onSelectProduct,
  onNavigateToShop,
  onNavigateToCategories,
  onNavigateToAbout,
  onNavigateToContact,
  onNavigateToPolicies,
  onOpenWholesaleModal,
}) => {
  const isAr = lang === 'ar';
  const themeConfig = storeSettings?.theme_config || {};
  const primaryColor = themeConfig.primary_color || '#d97706';
  const currency = storeSettings?.currency || 'EGP';

  const heroBanner = themeConfig.hero_banner || {};
  const isHeroEnabled = heroBanner.enabled !== false;
  const heroImage = heroBanner.desktop_image || storeSettings?.banner_image || '';
  const heroMobileImage = heroBanner.mobile_image || heroImage;
  const heroTitle = heroBanner.title || storeSettings?.banner_title || (isAr ? 'فخامة لا تخطئها العين' : 'Timeless Elegance & Prestige');
  const heroSubtitle = heroBanner.subtitle || storeSettings?.banner_subtitle || (isAr ? 'قصات دقيقة تعكس روح الفخامة المعاصرة. قطع منسوجة خصيصاً للمناسبات الراقية والإطلالات التي تستحق التميز.' : 'Impeccable silhouettes meeting exquisite textiles. Tailored pieces crafted strictly for those who discern the art of fine dressing.');
  const heroBadge = heroBanner.badge || (isAr ? 'إصدار فاخر محدود' : 'Limited Atelier Edition');
  const heroCtaText = heroBanner.cta_text || (isAr ? 'اكتشف المجموعة' : 'Explore The Atelier');
  const heroCtaDestination = heroBanner.cta_destination || 'shop';

  const handleHeroCtaClick = () => {
    if (heroCtaDestination === 'categories' && onNavigateToCategories) onNavigateToCategories();
    else if (heroCtaDestination === 'contact' && onNavigateToContact) onNavigateToContact();
    else if (heroCtaDestination === 'about' && onNavigateToAbout) onNavigateToAbout();
    else if (heroCtaDestination === 'policies' && onNavigateToPolicies) onNavigateToPolicies();
    else if (onNavigateToShop) onNavigateToShop();
    else {
      const el = document.getElementById('collection');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const promoBanners: any[] = Array.isArray(themeConfig.promo_banners) ? themeConfig.promo_banners.filter((b: any) => b.enabled !== false) : [];
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  };

  return (
    <div
      className={`min-h-screen font-serif transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Editorial Luxury Hero */}
      {isHeroEnabled && (
        <section className="relative py-24 sm:py-32 px-4 text-center border-b border-stone-200 dark:border-zinc-800 overflow-hidden">
          <div className="absolute inset-0 z-0">
            {heroImage ? (
              <picture className="w-full h-full block">
                {heroMobileImage && <source media="(max-width: 640px)" srcSet={api.getMediaUrl(heroMobileImage)} />}
                <img
                  src={api.getMediaUrl(heroImage)}
                  alt={heroTitle}
                  className="w-full h-full object-cover filter brightness-[0.35]"
                />
              </picture>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=80"
                alt={heroTitle}
                className="w-full h-full object-cover filter brightness-[0.35]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-stone-950/40 pointer-events-none" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 text-amber-500 text-xs uppercase tracking-[0.3em] font-sans font-bold">
              <Gem className="w-4 h-4" />
              <span>{heroBadge}</span>
            </div>

            <h2 className={`text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-tight ${heroImage ? 'text-white' : ''}`}>
              {heroTitle}
            </h2>

            <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-sans font-light ${heroImage ? 'text-stone-300' : 'text-stone-500 dark:text-zinc-400'}`}>
              {heroSubtitle}
            </p>

            <div className="pt-4 font-sans">
              <button
                type="button"
                onClick={handleHeroCtaClick}
                style={{ backgroundColor: primaryColor }}
                className="text-stone-950 font-bold text-xs uppercase tracking-[0.2em] px-8 py-4 inline-flex items-center gap-3 shadow-2xl hover:brightness-110 transition-all cursor-pointer"
              >
                <span>{heroCtaText}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Haute Couture Gallery Grid */}
      <section id="collection" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-2">
          <span className="text-xs uppercase tracking-[0.25em] text-amber-600 dark:text-amber-400 font-sans font-bold">
            {isAr ? 'المعروضات الحصرية' : 'Curated Masterpieces'}
          </span>
          <h3 className="text-3xl sm:text-4xl font-serif font-normal">
            {isAr ? 'القطع المنتقاة للموسم' : 'Selected Signature Pieces'}
          </h3>
          <div className="w-16 h-0.5 bg-amber-600 mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {variants.map((v) => {
            const inStock = v.in_stock > 0;
            return (
              <div
                key={v.id}
                className={`group border transition-all duration-500 flex flex-col justify-between ${
                  isDark
                    ? 'bg-zinc-900/60 border-zinc-800 hover:border-amber-600/70'
                    : 'bg-white border-stone-200 hover:border-amber-600/50 shadow-sm'
                }`}
              >
                {/* Visual Area */}
                <div
                  onClick={() => onSelectProduct(v)}
                  className="relative aspect-[3/4] bg-stone-100 dark:bg-zinc-950 overflow-hidden flex items-center justify-center p-0 cursor-pointer group"
                >
                  {v.image ? (
                    <img
                      src={api.getMediaUrl(v.image)}
                      alt={v.model_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-stone-200/40 to-transparent dark:from-zinc-900 group-hover:scale-105 transition-transform duration-700 p-8">
                      <Crown className="w-16 h-16 text-amber-600/40 mb-3" />
                      <span className="font-mono text-[10px] tracking-widest uppercase text-stone-400">{v.sku}</span>
                    </div>
                  )}

                  {v.gallery && v.gallery.length > 1 && (
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className="px-2 py-0.5 bg-stone-950/80 text-amber-400 border border-amber-600/30 text-[10px] font-mono tracking-widest backdrop-blur-xs">
                        +{v.gallery.length}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 z-10">
                    <span className="bg-stone-900/90 text-amber-400 border border-amber-600/40 font-sans text-[10px] uppercase tracking-widest px-2.5 py-1">
                      {isAr ? 'حرفية يدوية' : 'Hand-Finished'}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 font-sans flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
                      <span>{v.color || 'Signature Noir'}</span>
                      <span className="font-serif">{v.size || 'Custom Size'}</span>
                    </div>
                    <h4 className="font-serif text-xl tracking-wide">{v.model_name}</h4>

                    {v.is_wholesale && (
                      <div className="mt-2 p-2 border border-amber-600/40 bg-amber-950/20 text-[10px] space-y-1 font-sans">
                        <div className="flex items-center justify-between text-amber-400 font-bold">
                          <span>{isAr ? 'تسعير بوتيك معتمد (Wholesale)' : 'Trade Boutique Pricing'}</span>
                          {v.moq && v.moq > 1 && <span>MOQ: {v.moq} pcs</span>}
                        </div>
                      </div>
                    )}

                    {!v.is_wholesale && v.is_wholesale_eligible && onOpenWholesaleModal && (
                      <button
                        type="button"
                        onClick={onOpenWholesaleModal}
                        className="mt-1 text-[10px] text-amber-600 hover:text-amber-500 underline uppercase tracking-wider block font-sans"
                      >
                        {isAr ? '⚜️ استفسار توريدات البوتيكات والفنادق' : '⚜️ Boutique trade inquiry'}
                      </button>
                    )}
                  </div>

                  <div className="pt-4 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 block">
                        {v.is_wholesale ? (isAr ? 'سعر التوريد الحصري' : 'Trade Price') : (isAr ? 'السعر الحصري' : 'Price')}
                      </span>
                      <span className="text-xl font-serif text-amber-600 dark:text-amber-400">
                        {v.price.toFixed(2)}{' '}
                        <span className="text-xs font-sans font-bold text-stone-400">{currency}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectProduct(v)}
                      disabled={!inStock}
                      className={`text-xs uppercase tracking-widest font-bold px-5 py-2.5 border transition-all ${
                        inStock
                          ? 'border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-stone-950 active:scale-95'
                          : 'border-stone-400 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {inStock ? (isAr ? 'اقتناء القطعة' : 'Acquire') : isAr ? 'محجوز' : 'Reserved'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Promotional Banners Grid (if configured by owner) */}
      {promoBanners.length > 0 && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-stone-200 dark:border-zinc-800 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {promoBanners.map((promo: any) => (
              <div
                key={promo.id}
                style={{ backgroundColor: promo.bg_color || undefined }}
                className="relative p-8 sm:p-10 flex flex-col justify-between min-h-[240px] border border-amber-600/40 bg-zinc-900 text-stone-100 shadow-xl overflow-hidden"
              >
                {(promo.image_url || promo.image) && (
                  <img
                    src={api.getMediaUrl(promo.image_url || promo.image)}
                    alt={promo.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-25 filter brightness-50"
                  />
                )}
                <div className="relative z-10 space-y-3">
                  {(promo.badge_text || promo.discount_code) && (
                    <span className="inline-block px-3 py-1 text-[10px] font-mono tracking-widest uppercase bg-amber-600 text-stone-950 font-bold">
                      {promo.badge_text || `PRIVILEGE CODE: ${promo.discount_code}`}
                    </span>
                  )}
                  <h4 className="text-2xl sm:text-3xl font-serif font-normal">{promo.title}</h4>
                  <p className="text-xs sm:text-sm text-stone-400 max-w-md font-light leading-relaxed">{promo.subtitle}</p>
                </div>
                <div className="relative z-10 pt-6 flex items-center justify-between gap-4">
                  {(promo.discount_code || promo.badge_text) && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.discount_code || promo.badge_text)}
                      className="px-4 py-2 text-xs uppercase tracking-widest font-bold border border-stone-600 text-stone-300 hover:border-amber-500 hover:text-amber-400 transition flex items-center gap-2 cursor-pointer"
                    >
                      {copiedCode === (promo.discount_code || promo.badge_text) ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === (promo.discount_code || promo.badge_text) ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ الرمز' : 'Copy Code')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToShop) onNavigateToShop();
                      else {
                        const el = document.getElementById('collection');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    style={{ backgroundColor: primaryColor }}
                    className="px-5 py-2.5 text-xs uppercase tracking-widest font-bold text-stone-950 shadow hover:brightness-110 transition flex items-center gap-2 cursor-pointer ms-auto"
                  >
                    <span>{isAr ? 'عرض المجموعة الحصرية' : 'Acquire Privilege'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Atelier Guarantee */}
      <section className="py-16 border-t border-stone-200 dark:border-zinc-800 bg-stone-100/50 dark:bg-zinc-900/40 text-center font-sans">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <Award className="w-8 h-8 mx-auto mb-3 text-amber-600" />
            <h5 className="font-serif text-lg font-normal mb-1">{isAr ? 'شهادة أصالة معتمدة' : 'Certificate of Origin'}</h5>
            <p className="text-xs text-stone-500">{isAr ? 'كل قطعة تحمل رقم فحص جودة فردي' : 'Individually serial inspected'}</p>
          </div>
          <div>
            <ShieldCheck className="w-8 h-8 mx-auto mb-3 text-amber-600" />
            <h5 className="font-serif text-lg font-normal mb-1">{isAr ? 'شحن خاص للمنازل' : 'White-Glove Courier'}</h5>
            <p className="text-xs text-stone-500">{isAr ? 'تغليف فاخر ومعاينة قبل الدفع' : 'Luxury box packaging & inspection'}</p>
          </div>
          <div>
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-amber-600" />
            <h5 className="font-serif text-lg font-normal mb-1">{isAr ? 'دعم الدفع عبر InstaPay' : 'Private InstaPay'}</h5>
            <p className="text-xs text-stone-500">{isAr ? 'تحويل بنكي آمن ومباشر للمصنع' : 'Instant verified factory settlements'}</p>
          </div>
        </div>
      </section>
    </div>
  );
};

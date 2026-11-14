import React, { useState } from 'react';
import {
  Heart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Smile,
  Award,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../../../api/client';
import type { StorefrontTemplateProps } from './types';

export const KidsFamilyTemplate: React.FC<StorefrontTemplateProps> = ({
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
  const primaryColor = themeConfig.primary_color || '#f97316';
  const currency = storeSettings?.currency || 'EGP';

  const heroBanner = themeConfig.hero_banner || {};
  const isHeroEnabled = heroBanner.enabled !== false;
  const heroImage = heroBanner.desktop_image || storeSettings?.banner_image || '';
  const heroMobileImage = heroBanner.mobile_image || heroImage;
  const heroTitle = heroBanner.title || storeSettings?.banner_title || (isAr ? 'أجمل إطلالات طفلك من المصنع مباشرة' : 'Pure Comfort for Little Smiles');
  const heroSubtitle = heroBanner.subtitle || storeSettings?.banner_subtitle || (isAr ? 'ملابس أطفال ومواليد مصممة بخيوط قطنية نقية 100% بدون أي مواد كيميائية ضارة. مقاسات دقيقة وتصاميم مريحة للحركة واللعب.' : 'Gentle, 100% natural cotton garments crafted with non-toxic dyes, tagless labels, and stretchy designs for play and nap time.');
  const heroBadge = heroBanner.badge || (isAr ? 'نعومة فائقة وألوان مبهجة تناسب براءة طفلك' : 'Ultra-soft & Gentle Baby Care');
  const heroCtaText = heroBanner.cta_text || (isAr ? 'تصفح ملابس الأطفال' : 'Explore Outfits');
  const heroCtaDestination = heroBanner.cta_destination || 'shop';

  const handleHeroCtaClick = () => {
    if (heroCtaDestination === 'categories' && onNavigateToCategories) onNavigateToCategories();
    else if (heroCtaDestination === 'contact' && onNavigateToContact) onNavigateToContact();
    else if (heroCtaDestination === 'about' && onNavigateToAbout) onNavigateToAbout();
    else if (heroCtaDestination === 'policies' && onNavigateToPolicies) onNavigateToPolicies();
    else if (onNavigateToShop) onNavigateToShop();
    else {
      const el = document.getElementById('products');
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

  const [selectedAge, setSelectedAge] = useState<string>('all');

  const ageBrackets = [
    { id: 'all', label_ar: 'الكل 👶', label_en: 'All 👶' },
    { id: '0-12m', label_ar: 'مواليد 0-12 شهر 🍼', label_en: 'Babies 0-12M 🍼' },
    { id: '1-4y', label_ar: 'أطفال 1-4 سنوات 🧸', label_en: 'Toddlers 1-4Y 🧸' },
    { id: '5-9y', label_ar: 'أولاد وبنات 5-9 سنوات 🚀', label_en: 'Kids 5-9Y 🚀' },
    { id: '10-14y', label_ar: 'ناشئين 10-14 سنة 🎒', label_en: 'Junior 10-14Y 🎒' },
  ];

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? 'bg-amber-950/20 text-slate-100' : 'bg-amber-50/40 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Warm Hero Banner */}
      {isHeroEnabled && (
        <section className="py-10 md:py-16 px-4 max-w-7xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[360px] flex items-center">
            {heroImage ? (
              <>
                <picture className="absolute inset-0 w-full h-full block">
                  {heroMobileImage && <source media="(max-width: 640px)" srcSet={api.getMediaUrl(heroMobileImage)} />}
                  <img
                    src={api.getMediaUrl(heroImage)}
                    alt={heroTitle}
                    className="w-full h-full object-cover"
                  />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/95 via-orange-400/90 to-transparent dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-900/50 pointer-events-none" />
              </>
            ) : (
              <>
                <img
                  src="https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=1200&q=80"
                  alt={heroTitle}
                  className="w-full h-full object-cover absolute inset-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/95 via-orange-400/90 to-transparent dark:from-slate-950/95 dark:via-slate-900/90 dark:to-slate-900/50 pointer-events-none" />
              </>
            )}

            <div className="relative z-10 p-8 sm:p-12 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-orange-600 shadow-sm">
                <Smile className="w-4 h-4" />
                <span>{heroBadge}</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black leading-tight text-slate-950 dark:text-white">
                {heroTitle}
              </h2>
              <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                {heroSubtitle}
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleHeroCtaClick}
                  className="bg-slate-950 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg hover:bg-slate-800 transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>{heroCtaText}</span>
                  <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  {isAr ? '✨ دفع عند الاستلام أو InstaPay' : '✨ COD or InstaPay'}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Safety & Quality Badges */}
      <section className="py-6 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 text-center shadow-sm">
            <Award className="w-6 h-6 mx-auto mb-2 text-orange-500" />
            <h4 className="font-black text-xs sm:text-sm">{isAr ? 'قطن مصري 100%' : '100% Egyptian Cotton'}</h4>
            <p className="text-[11px] text-slate-500">{isAr ? 'أعلى درجات النعومة' : 'Supreme softness'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 text-center shadow-sm">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
            <h4 className="font-black text-xs sm:text-sm">{isAr ? 'آمن للبشرة الحساسة' : 'Hypoallergenic'}</h4>
            <p className="text-[11px] text-slate-500">{isAr ? 'صبغات طبيعية خالية من الرصاص' : 'Non-toxic natural dyes'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 text-center shadow-sm">
            <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <h4 className="font-black text-xs sm:text-sm">{isAr ? 'خياطة مسطحة مريحة' : 'Flat Seamless Stitch'}</h4>
            <p className="text-[11px] text-slate-500">{isAr ? 'لا تسبب أي حكة للطفل' : 'No itch, tagless design'}</p>
          </div>
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 text-center shadow-sm">
            <Heart className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            <h4 className="font-black text-xs sm:text-sm">{isAr ? 'استبدال مقاسات سهل' : 'Easy Size Exchange'}</h4>
            <p className="text-[11px] text-slate-500">{isAr ? 'خلال 14 يوماً مع المعاينة' : '14 days hassle-free'}</p>
          </div>
        </div>
      </section>

      {/* Age Bracket Selector & Products */}
      <section id="products" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
            {isAr ? 'اختر حسب عمر طفلك' : 'Shop by Age Bracket'}
          </span>
          <h3 className="text-2xl sm:text-4xl font-black mt-1">
            {isAr ? 'تشكيلة المواليد والأطفال الجاهزة للشحن' : 'Ready to Ship Kids Outfits'}
          </h3>

          {/* Age Bracket Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {ageBrackets.map((bracket) => (
              <button
                key={bracket.id}
                onClick={() => setSelectedAge(bracket.id)}
                className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                  selectedAge === bracket.id
                    ? 'bg-orange-500 text-white shadow-md transform scale-105'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                {isAr ? bracket.label_ar : bracket.label_en}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {variants.map((v) => {
            const inStock = v.in_stock > 0;
            return (
              <div
                key={v.id}
                className={`rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-amber-900/30 hover:border-orange-500/50 shadow-md'
                    : 'bg-white border-amber-200/80 hover:border-orange-300 hover:shadow-xl shadow-sm'
                }`}
              >
                {/* Visual Area */}
                <div
                  onClick={() => onSelectProduct(v)}
                  className="relative aspect-square bg-amber-50/60 dark:bg-slate-800/80 flex items-center justify-center p-0 overflow-hidden cursor-pointer group"
                >
                  {v.image ? (
                    <img
                      src={api.getMediaUrl(v.image)}
                      alt={v.model_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                  ) : (
                    <span className="text-6xl select-none transform hover:scale-110 transition-transform">🧸</span>
                  )}

                  {v.gallery && v.gallery.length > 1 && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/70 text-white text-[10px] font-mono backdrop-blur-xs">
                        +{v.gallery.length}
                      </span>
                    </div>
                  )}

                  <div className="absolute top-3 right-3 z-10">
                    <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-[10px] font-black px-2.5 py-1 rounded-full border border-orange-200 dark:border-orange-800">
                      {isAr ? 'قطن 100%' : '100% Cotton'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-mono text-slate-400 block">{v.sku}</span>
                    <h4 className="font-extrabold text-base leading-snug">{v.model_name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{isAr ? 'المقاس:' : 'Size:'}</span>
                      <span className="font-black text-orange-600 dark:text-orange-400">{v.size || '0-6M'}</span>
                      {v.color && <span>• {v.color}</span>}
                    </div>

                    {v.is_wholesale && (
                      <div className="mt-2 p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                          <span>{isAr ? 'سعر جملة الحضانات' : 'Wholesale Tier'}</span>
                          {v.moq && v.moq > 1 && (
                            <span className="font-mono">MOQ: {v.moq} {isAr ? 'قطعة' : 'pcs'}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {!v.is_wholesale && v.is_wholesale_eligible && onOpenWholesaleModal && (
                      <button
                        type="button"
                        onClick={onOpenWholesaleModal}
                        className="mt-1 text-[10px] text-orange-600 dark:text-orange-400 hover:underline block font-semibold text-start"
                      >
                        {isAr ? '🍼 توريدات بالجملة للمحلات ودور الحضانة' : '🍼 Bulk supply for stores & nurseries'}
                      </button>
                    )}
                  </div>

                  <div className="pt-3 border-t border-amber-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">
                        {v.is_wholesale ? (isAr ? 'سعر الجملة' : 'Wholesale') : (isAr ? 'السعر' : 'Price')}
                      </span>
                      <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                        {v.price.toFixed(2)} <span className="text-xs font-bold text-slate-500">{currency}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectProduct(v)}
                      disabled={!inStock}
                      style={{ backgroundColor: inStock ? primaryColor : undefined }}
                      className={`px-4 py-2.5 rounded-full text-xs font-black shadow-md transition-all ${
                        inStock
                          ? 'text-white hover:scale-105 active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isAr ? 'اختيار 🍼' : 'Choose'}
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
        <section className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-amber-200/60 dark:border-amber-900/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {promoBanners.map((promo: any) => (
              <div
                key={promo.id}
                style={{ backgroundColor: promo.bg_color || undefined }}
                className="relative rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between min-h-[220px] shadow-lg border border-amber-200 dark:border-amber-900/40 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
              >
                {(promo.image_url || promo.image) && (
                  <img
                    src={api.getMediaUrl(promo.image_url || promo.image)}
                    alt={promo.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 filter brightness-75"
                  />
                )}
                <div className="relative z-10 space-y-2">
                  {(promo.badge_text || promo.discount_code) && (
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-orange-600 shadow-sm">
                      {promo.badge_text || `CODE: ${promo.discount_code}`}
                    </span>
                  )}
                  <h4 className="text-2xl font-black">{promo.title}</h4>
                  <p className="text-xs sm:text-sm text-amber-100 max-w-md">{promo.subtitle}</p>
                </div>
                <div className="relative z-10 pt-4 flex items-center justify-between gap-4">
                  {(promo.discount_code || promo.badge_text) && (
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.discount_code || promo.badge_text)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode === (promo.discount_code || promo.badge_text) ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === (promo.discount_code || promo.badge_text) ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigateToShop) onNavigateToShop();
                      else {
                        const el = document.getElementById('products');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-4 py-2 rounded-full text-xs font-black bg-slate-950 text-white shadow-md hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer ms-auto"
                  >
                    <span>{isAr ? 'تسوق العرض 🎈' : 'Shop Offer 🎈'}</span>
                    <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

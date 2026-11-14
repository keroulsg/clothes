import React, { useState, useMemo } from 'react';
import {
  Heart,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Smile,
  Award,
  Copy,
  Check,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { api } from '../../../api/client';
import { StorefrontImage } from '../common/StorefrontImage';
import { getActiveSortedSections, normalizeSectionId } from '../common/StorefrontSectionRegistry';
import type { StorefrontTemplateProps } from './types';

export const KidsFamilyTemplate: React.FC<StorefrontTemplateProps> = ({
  lang,
  isDark,
  storeSettings,
  variants = [],
  searchQuery = '',
  selectedCategory = 'all',
  setSelectedCategory,
  onSelectProduct,
  onNavigateToShop,
  onNavigateToCategories,
  onNavigateToAbout,
  onNavigateToContact,
  onNavigateToPolicies,
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

  // Dynamic Category Extraction from actual product catalog
  const categories = useMemo(() => {
    const extracted = Array.from(
      new Set(variants.map((v) => v.category).filter((c): c is string => Boolean(c) && c.trim() !== ''))
    );
    return ['all', ...(extracted.length > 0 ? extracted : [])];
  }, [variants]);

  // Product Filtering logic
  const displayedVariants = useMemo(() => {
    return variants.filter((v) => {
      const matchCat = !selectedCategory || selectedCategory === 'all' || v.category === selectedCategory;
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch =
        !q ||
        (v.model_name || v.name || '').toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q) ||
        (v.category || '').toLowerCase().includes(q);

      let matchAge = true;
      if (selectedAge && selectedAge !== 'all') {
        const text = `${v.size || ''} ${v.model_name || ''} ${v.name || ''}`.toLowerCase();
        if (selectedAge === '0-12m') {
          matchAge = text.includes('0-3') || text.includes('0-12') || text.includes('ولادة') || text.includes('baby') || text.includes('رضيع') || text.includes('3-6');
        } else if (selectedAge === '1-4y') {
          matchAge = text.includes('1y') || text.includes('2y') || text.includes('3y') || text.includes('4y') || text.includes('سنة') || text.includes('سنتين');
        }
      }
      return matchCat && matchSearch && matchAge;
    });
  }, [variants, selectedCategory, searchQuery, selectedAge]);

  // Dynamic Section Registry Rendering
  const activeSections = getActiveSortedSections(themeConfig?.sections);

  // 1. Hero Section
  const renderHeroSection = () => {
    if (!isHeroEnabled) return null;
    return (
      <section className="py-8 md:py-14 px-4 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden shadow-xl min-h-[340px] flex items-center bg-gradient-to-r from-amber-500/95 via-orange-400/90 to-amber-400">
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
    );
  };

  // 2. Categories & Age Brackets Section
  const renderCategoriesSection = () => (
    <section className="py-6 max-w-7xl mx-auto px-4 space-y-4">
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat: string) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory?.(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-amber-100/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-200/60'
              }`}
            >
              {cat === 'all' ? (isAr ? 'كافة التشكيلة' : 'All') : cat}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
          <span>{isAr ? 'تسوق حسب الفئة العمرية' : 'Shop by Age Range'}</span>
        </h3>
      </div>
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {ageBrackets.map((age) => (
          <button
            key={age.id}
            type="button"
            onClick={() => setSelectedAge(age.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all shadow-xs cursor-pointer ${
              selectedAge === age.id
                ? 'bg-orange-500 text-white shadow-md'
                : isDark
                ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border border-orange-100 text-slate-700 hover:bg-orange-50'
            }`}
          >
            {isAr ? age.label_ar : age.label_en}
          </button>
        ))}
      </div>
    </section>
  );

  // 3. Promotions Section
  const renderPromotionsSection = () => {
    if (promoBanners.length === 0) return null;
    return (
      <section className="py-6 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoBanners.map((promo: any) => (
            <div
              key={promo.id}
              style={{ backgroundColor: promo.bg_color || undefined }}
              className="relative rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between min-h-[200px] shadow-md border border-orange-200 dark:border-slate-800 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
            >
              {(promo.image_url || promo.image) && (
                <StorefrontImage
                  src={promo.image_url || promo.image}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 filter brightness-90"
                />
              )}
              <div className="relative z-10 space-y-2">
                {(promo.badge_text || promo.discount_code) && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-white text-orange-600 shadow-sm">
                    {promo.badge_text || `CODE: ${promo.discount_code}`}
                  </span>
                )}
                <h4 className="text-2xl font-black">{promo.title}</h4>
                <p className="text-xs sm:text-sm text-orange-100 max-w-md">{promo.subtitle}</p>
              </div>
              <div className="relative z-10 pt-4 flex items-center justify-between gap-4">
                {(promo.discount_code || promo.badge_text) && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(promo.discount_code || promo.badge_text)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode === (promo.discount_code || promo.badge_text) ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === (promo.discount_code || promo.badge_text) ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرمز' : 'Copy Code')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-white text-orange-600 shadow hover:bg-orange-50 transition flex items-center gap-1.5 cursor-pointer ms-auto"
                >
                  <span>{isAr ? 'تسوق العرض' : 'Shop Deal'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  // 4. Products Grid Section
  const renderProductsSection = () => (
    <section id="products" className="py-8 max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-orange-400">
            {isAr ? 'ملابس مريحة وآمنة' : 'Gentle & Soft Outfits'}
          </span>
          <h3 className="text-2xl font-black mt-0.5 text-slate-900 dark:text-white">
            {isAr ? 'تشكيلة الأطفال المحبوبة' : 'Playful Kids Collection'}
          </h3>
        </div>
      </div>

      {displayedVariants.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white/40 dark:bg-slate-900/40 rounded-3xl p-8 border border-dashed border-amber-200 dark:border-amber-900/40">
          <p className="text-base font-semibold">{isAr ? 'لا توجد منتجات مطابقة لهذا الاختيار حالياً' : 'No products match this filter'}</p>
          {(selectedCategory !== 'all' || selectedAge !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory?.('all');
                setSelectedAge('all');
              }}
              className="mt-2 text-xs font-bold text-orange-600 dark:text-orange-400 underline cursor-pointer"
            >
              {isAr ? 'عرض كافة منتجات الأطفال' : 'View all kids products'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayedVariants.map((v: any) => {
            const inStock = v.in_stock > 0;
            return (
              <div
                key={v.id}
                className={`rounded-3xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                  isDark
                    ? 'bg-slate-900 border-amber-900/30 hover:border-amber-700/60 shadow-md'
                    : 'bg-white border-amber-100 hover:border-amber-300 shadow-sm hover:shadow-lg'
                }`}
              >
                <div>
                  {/* Image with StorefrontImage */}
                  <div
                    onClick={() => onSelectProduct(v)}
                    className="relative aspect-square rounded-2xl overflow-hidden bg-amber-50 dark:bg-slate-800 mb-3 cursor-pointer group"
                  >
                    <StorefrontImage
                      src={v.image}
                      alt={v.model_name}
                      aspectRatio="square"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {inStock ? (
                      <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {isAr ? 'متوفر' : 'In Stock'}
                      </span>
                    ) : (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        {isAr ? 'نفد' : 'Out of Stock'}
                      </span>
                    )}

                    <span className="absolute bottom-2 left-2 bg-amber-500/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                      100% Cotton ☁️
                    </span>
                  </div>

                  <span className="text-[10px] font-mono font-bold text-slate-400 block mb-0.5">{v.sku}</span>
                  <h4
                    onClick={() => onSelectProduct(v)}
                    className="font-extrabold text-sm sm:text-base cursor-pointer hover:text-orange-600 transition-colors line-clamp-1"
                  >
                    {v.model_name}
                  </h4>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>{isAr ? 'المقاس:' : 'Size:'}</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{v.size || 'Baby'}</span>
                    {v.color && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{v.color}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-100 dark:border-slate-800 mt-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر' : 'Price'}</span>
                    <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                      {v.price.toFixed(2)}{' '}
                      <span className="text-xs font-bold text-slate-400">{currency}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectProduct(v)}
                    disabled={!inStock}
                    style={{ backgroundColor: inStock ? primaryColor : undefined }}
                    className={`px-4 py-2 rounded-full font-black text-xs flex items-center gap-1.5 shadow transition-all ${
                      inStock
                        ? 'text-white hover:brightness-110 active:scale-95 cursor-pointer'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{isAr ? 'طلب' : 'Order'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  // 5. Safety Badges & Story Section
  const renderStorySection = () => (
    <section className="py-10 max-w-7xl mx-auto px-4">
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
  );

  // 6. Contact Info Section
  const renderContactSection = () => {
    const contact = themeConfig.contact || {};
    return (
      <section className="py-8 max-w-7xl mx-auto px-4">
        <div className="p-6 rounded-3xl bg-amber-500 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-black text-xl">{isAr ? 'خدمة أولياء الأمور والأطفال' : 'Parents Care Support'}</h4>
            <p className="text-xs text-amber-100">{isAr ? 'متواجدون دائماً لمساعدتكم في اختيار المقاس الأنسب' : 'Always here to assist with accurate baby sizing'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <Phone className="w-3.5 h-3.5" />
              <span>{contact.phone || storeSettings?.contact_whatsapp || '+201000000000'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <Mail className="w-3.5 h-3.5" />
              <span>{contact.email || 'kids@garmentos.com'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <MapPin className="w-3.5 h-3.5" />
              <span>{contact.address || (isAr ? 'مصر' : 'Egypt')}</span>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderSectionById = (rawId: string) => {
    const id = normalizeSectionId(rawId);
    switch (id) {
      case 'hero':
        return renderHeroSection();
      case 'trust_badges':
      case 'story':
        return renderStorySection();
      case 'categories':
        return renderCategoriesSection();
      case 'promotions':
        return renderPromotionsSection();
      case 'featured_products':
      case 'new_arrivals':
        return renderProductsSection();
      case 'contact_info':
        return renderContactSection();
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? 'bg-amber-950/20 text-slate-100' : 'bg-amber-50/40 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {activeSections.map((sec) => (
        <React.Fragment key={sec.id}>
          {renderSectionById(sec.id)}
        </React.Fragment>
      ))}
    </div>
  );
};

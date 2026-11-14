import React, { useState, useMemo } from 'react';
import {
  Crown,
  ArrowRight,
  Gem,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { api } from '../../../api/client';
import { StorefrontImage } from '../common/StorefrontImage';
import { getActiveSortedSections, normalizeSectionId, getCategoryString } from '../common/StorefrontSectionRegistry';
import type { StorefrontTemplateProps } from './types';

export const PremiumBrandTemplate: React.FC<StorefrontTemplateProps> = ({
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

  // Dynamic Category Extraction from actual product catalog
  const categories = useMemo(() => {
    const extracted = Array.from(
      new Set(
        (variants || [])
          .map((v) => getCategoryString(v.category))
          .filter((c) => Boolean(c) && c.length > 0)
      )
    );
    return ['all', ...(extracted.length > 0 ? extracted : [])];
  }, [variants]);

  // Product Filtering logic
  const displayedVariants = useMemo(() => {
    return (variants || []).filter((v) => {
      const cat = getCategoryString(v.category);
      const matchCat = !selectedCategory || selectedCategory === 'all' || cat === selectedCategory;
      const q = (searchQuery || '').trim().toLowerCase();
      const matchSearch =
        !q ||
        (v.model_name || v.name || '').toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [variants, selectedCategory, searchQuery]);

  // Dynamic Section Registry Rendering
  const activeSections = getActiveSortedSections(themeConfig?.sections);

  // 1. Hero Section
  const renderHeroSection = () => {
    if (!isHeroEnabled) return null;
    return (
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
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-sans font-bold" style={{ color: primaryColor }}>
            <Gem className="w-4 h-4" />
            <span>{heroBadge}</span>
          </div>

          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight text-white leading-tight">
            {heroTitle}
          </h2>

          <p className="text-sm sm:text-base font-light text-stone-300 max-w-2xl mx-auto leading-relaxed font-sans">
            {heroSubtitle}
          </p>

          <div className="pt-4 flex items-center justify-center gap-4 font-sans">
            <button
              type="button"
              onClick={handleHeroCtaClick}
              className="px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs uppercase tracking-widest transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 inline-flex items-center gap-2 cursor-pointer"
            >
              <span>{heroCtaText}</span>
              <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>
    );
  };

  // 2. Categories Section
  const renderCategoriesSection = () => (
    <section className="py-8 max-w-7xl mx-auto px-4 text-center border-b border-stone-200 dark:border-zinc-800 font-sans">
      <div className="flex items-center justify-center gap-4 flex-wrap text-xs uppercase tracking-widest font-bold">
        {categories.map((cat: any) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory?.(cat)}
            className={`pb-1 transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'text-amber-500 border-b-2 border-amber-500'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {cat === 'all' ? (isAr ? 'كافة القطع' : 'All Works') : cat}
          </button>
        ))}
      </div>
    </section>
  );

  // 3. Promotions Section
  const renderPromotionsSection = () => {
    if (promoBanners.length === 0) return null;
    return (
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-stone-200 dark:border-zinc-800 font-sans">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {promoBanners.map((promo: any) => (
            <div
              key={promo.id}
              style={{ backgroundColor: promo.bg_color || undefined }}
              className="relative p-8 sm:p-10 flex flex-col justify-between min-h-[240px] border border-amber-600/40 bg-zinc-900 text-stone-100 shadow-xl overflow-hidden"
            >
              {(promo.image_url || promo.image) && (
                <StorefrontImage
                  src={promo.image_url || promo.image}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 filter brightness-50"
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
                    const el = document.getElementById('collection');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-5 py-2 text-xs uppercase tracking-widest font-bold bg-amber-600 text-stone-950 hover:bg-amber-500 transition flex items-center gap-2 cursor-pointer ms-auto"
                >
                  <span>{isAr ? 'معاينة الإصدار' : 'View Atelier'}</span>
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
    <section id="collection" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
        <span className="text-xs uppercase tracking-[0.3em] text-amber-600 font-sans font-bold">
          {isAr ? 'مختارات الموسم' : 'Haute Curations'}
        </span>
        <h3 className="text-3xl sm:text-4xl font-light tracking-wide">
          {isAr ? 'قطع منتقاة بعناية فائقة' : 'Selected Atelier Pieces'}
        </h3>
        <div className="w-12 h-px bg-amber-600 mx-auto mt-4" />
      </div>

      {displayedVariants.length === 0 ? (
        <div className="py-20 text-center text-stone-500 font-sans border border-dashed border-stone-800 p-8">
          <p className="text-sm uppercase tracking-widest">{isAr ? 'لا توجد إصدارات مطابقة لهذا الاختيار' : 'No atelier pieces match this selection'}</p>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory?.('all')}
              className="mt-3 text-xs text-amber-500 underline cursor-pointer"
            >
              {isAr ? 'استعراض كافة الإصدارات' : 'View all atelier pieces'}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {displayedVariants.map((v: any) => {
          const inStock = v.in_stock > 0;
          return (
            <div
              key={v.id}
              className="group border border-stone-200 dark:border-zinc-800 hover:border-amber-600/60 transition-all duration-500 bg-white dark:bg-zinc-900/40 flex flex-col justify-between"
            >
              <div
                onClick={() => onSelectProduct(v)}
                className="relative aspect-[3/4] bg-stone-100 dark:bg-zinc-950 overflow-hidden flex items-center justify-center p-0 cursor-pointer group"
              >
                <StorefrontImage
                  src={v.image}
                  alt={v.model_name}
                  aspectRatio="portrait"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />

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
                  <h4 className="font-serif text-xl tracking-wide line-clamp-1">{v.model_name}</h4>

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
                        ? 'border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-stone-950 active:scale-95 cursor-pointer'
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
      )}
    </section>
  );

  // 5. Atelier Story Section
  const renderStorySection = () => (
    <section className="py-20 border-t border-b border-stone-200 dark:border-zinc-800 bg-stone-100/50 dark:bg-zinc-900/30 text-center font-sans">
      <div className="max-w-3xl mx-auto px-4 space-y-4">
        <Crown className="w-8 h-8 text-amber-500 mx-auto" />
        <h4 className="font-serif text-2xl font-light text-stone-900 dark:text-stone-100">{isAr ? 'حرفية وتفصيل فائق الدقة' : 'Bespoke Atelier Craftsmanship'}</h4>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 leading-relaxed font-light">
          {isAr
            ? 'كل قطعة تمر عبر مراحل دقيقة من القص بالليزر والخياطة اليدوية لأدق التفاصيل، لنمنحك تجربة ارتداء لا تضاهى تدوم لسنوات.'
            : 'Every creation undergoes rigorous hand-inspection and artisan tailoring, providing exceptional longevity and peerless comfort.'}
        </p>
      </div>
    </section>
  );

  // 6. Concierge Contact Section
  const renderContactSection = () => {
    const contact = themeConfig.contact || {};
    return (
      <section className="py-12 max-w-7xl mx-auto px-4 font-sans">
        <div className="p-8 border border-amber-600/30 bg-zinc-900 text-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="font-serif text-xl text-amber-400">{isAr ? 'خدمة كونسيرج البوتيك الخاص' : 'Atelier Private Concierge'}</h4>
            <p className="text-xs text-stone-400 mt-1">{isAr ? 'استشارات تنسيق المقاسات وطلبات التفصيل الخاصة' : 'Consultations for VIP sizing and bespoke tailoring'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 border border-stone-700 px-3 py-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>{contact.phone || storeSettings?.contact_whatsapp || '+201000000000'}</span>
            </div>
            <div className="flex items-center gap-2 border border-stone-700 px-3 py-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>{contact.email || 'atelier@garmentos.com'}</span>
            </div>
            <div className="flex items-center gap-2 border border-stone-700 px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
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
      case 'categories':
        return renderCategoriesSection();
      case 'promotions':
        return renderPromotionsSection();
      case 'featured_products':
      case 'new_arrivals':
        return renderProductsSection();
      case 'trust_badges':
      case 'story':
        return renderStorySection();
      case 'contact_info':
        return renderContactSection();
      case 'wholesale_cta':
        return (
          <section className="py-12 max-w-7xl mx-auto px-4 font-sans">
            <div className="p-8 border border-amber-600/40 bg-zinc-950 text-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">{isAr ? 'حسابات البوتيك والطلب المخصص' : 'Boutique Accounts & Bespoke Supply'}</span>
                <h4 className="font-serif text-2xl text-stone-100 mt-1">{isAr ? 'امتيازات تجار الجملة وشركاء التوزيع' : 'VIP Wholesale & Atelier Distribution'}</h4>
                <p className="text-xs text-stone-400 mt-1 max-w-xl">{isAr ? 'تسعير حصري معتمد لكبار التجار وأصحاب البوتيكات مع خط إنتاج مخصص.' : 'Tiered pricing and dedicated atelier production slots for verified partners.'}</p>
              </div>
              {onOpenWholesaleModal && (
                <button
                  type="button"
                  onClick={onOpenWholesaleModal}
                  className="px-6 py-3 border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-stone-950 font-bold text-xs uppercase tracking-widest transition cursor-pointer shrink-0"
                >
                  {isAr ? 'طلب اعتماد الشريك' : 'Apply for Partnership'}
                </button>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen font-serif transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'
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

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Sparkles,
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Eye,
  Tag,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../../api/client';
import { StorefrontImage } from '../common/StorefrontImage';
import { getActiveSortedSections, normalizeSectionId, getCategoryString } from '../common/StorefrontSectionRegistry';
import type { StorefrontTemplateProps } from './types';

export const FashionBoutiqueTemplate: React.FC<StorefrontTemplateProps> = ({
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
  const primaryColor = themeConfig.primary_color || '#0284c7';

  // Elementor Layout & Styler Config
  const layoutConfig = themeConfig.layout || {};
  const categoriesStyle = layoutConfig.categories_style || 'pills';
  const productsGridCols = layoutConfig.products_grid_cols || 4;
  const cardImageAspect = layoutConfig.card_image_aspect || 'portrait';
  const cardImageFit = layoutConfig.card_image_fit || 'cover';
  const pageBgColor = layoutConfig.page_bg_color || '';
  const cardBgColor = layoutConfig.card_bg_color || '';
  const cardBorderColor = layoutConfig.card_border_color || '';
  const cardBorderRadius = layoutConfig.card_border_radius || 'md';
  const cardShadow = layoutConfig.card_shadow || 'md';

  // Hero Banner Extraction (full ERP control)
  const heroBanner = themeConfig.hero_banner || {};

  // Hero Display Controls
  const heroHeight = heroBanner?.height || 'standard';
  const heroFit = heroBanner?.image_fit || 'cover';
  const heroPosition = heroBanner?.image_position || 'center';
  const heroOverlayOpacity = typeof heroBanner?.overlay_opacity === 'number' ? heroBanner.overlay_opacity : 30;
  const heroOverlayColor = heroBanner?.overlay_color || '#000000';
  const heroTextAlign = heroBanner?.text_align || 'start';
  const isHeroEnabled = heroBanner.enabled !== false;
  const heroImage = heroBanner.desktop_image || storeSettings?.banner_image || '';
  const heroMobileImage = heroBanner.mobile_image || heroImage;
  const heroTitle =
    heroBanner.title ||
    storeSettings?.banner_title ||
    (isAr ? 'أناقة راقية بأسعار المصنع مباشرة' : 'Refined Fashion Directly from the Workshop');
  const heroSubtitle =
    heroBanner.subtitle ||
    storeSettings?.banner_subtitle ||
    (isAr
      ? 'خامات قطنية 100%، تفصيل متقن، وضمان استبدال فوري. استمتع بأعلى معايير الملابس الجاهزة دون وسطاء.'
      : '100% natural fabrics, master tailoring, and immediate replacement guarantee.');
  const heroBadge =
    heroBanner.badge || (isAr ? 'تشكيلة الموسم الجديد — جودة تصدير' : 'New Season Collection — Export Quality');
  const heroCtaText = heroBanner.cta_text || (isAr ? 'تصفح التشكيلة الكاملة' : 'Shop Collection');
  const heroCtaDestination = heroBanner.cta_destination || 'shop';

  const handleHeroCtaClick = () => {
    if (heroCtaDestination === 'categories' && onNavigateToCategories) {
      onNavigateToCategories();
    } else if (heroCtaDestination === 'contact' && onNavigateToContact) {
      onNavigateToContact();
    } else if (heroCtaDestination === 'about' && onNavigateToAbout) {
      onNavigateToAbout();
    } else if (heroCtaDestination === 'policies' && onNavigateToPolicies) {
      onNavigateToPolicies();
    } else if (onNavigateToShop) {
      onNavigateToShop();
    } else {
      const el = document.getElementById('products');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const promoBanners: any[] = Array.isArray(themeConfig.promo_banners)
    ? themeConfig.promo_banners.filter((b: any) => b.enabled !== false)
    : [];
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
      const matchesCategory =
        !selectedCategory || selectedCategory === 'all' || cat === selectedCategory;
      const q = (searchQuery || '').trim().toLowerCase();
      const matchesSearch =
        !q ||
        (v.model_name || v.name || '').toLowerCase().includes(q) ||
        (v.sku || '').toLowerCase().includes(q) ||
        cat.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [variants, selectedCategory, searchQuery]);

  // Dynamic Section Registry Rendering
  const activeSections = getActiveSortedSections(themeConfig?.sections);

  // 1. Hero Section
  const renderHeroSection = () => {
    if (!isHeroEnabled) return null;

    const heroHeightClass =
      heroHeight === 'compact'
        ? 'py-8 md:py-12 min-h-[380px]'
        : heroHeight === 'tall'
        ? 'py-16 md:py-28 min-h-[620px]'
        : heroHeight === 'fullscreen'
        ? 'py-20 md:py-32 min-h-[85vh] flex items-center'
        : 'py-12 md:py-20 min-h-[480px]';

    const textAlignClass =
      heroTextAlign === 'center'
        ? 'text-center items-center mx-auto'
        : heroTextAlign === 'end'
        ? 'text-end items-end ms-auto'
        : 'text-start items-start';

    return (
      <section className={`relative overflow-hidden ${heroHeightClass} px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
          <div className={`lg:col-span-7 space-y-6 flex flex-col ${textAlignClass}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{heroBadge}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              {heroTitle}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleHeroCtaClick}
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <span>{heroCtaText}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </button>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'دفع عند الاستلام أو InstaPay' : 'COD & InstaPay Supported'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-800 group">
              {heroImage ? (
                <picture className="w-full h-full block">
                  {heroMobileImage && <source media="(max-width: 640px)" srcSet={api.getMediaUrl(heroMobileImage)} />}
                  <img
                    src={api.getMediaUrl(heroImage)}
                    alt={heroTitle}
                    style={{
                      objectFit: heroFit as any,
                      objectPosition: heroPosition,
                    }}
                    className={`w-full h-full ${heroFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-700`}
                  />
                </picture>
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1200&q=80"
                  alt={heroTitle}
                  style={{
                    objectFit: heroFit as any,
                    objectPosition: heroPosition,
                  }}
                  className={`w-full h-full ${heroFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-700`}
                />
              )}
              {/* Customizable Overlay Layer */}
              <div
                style={{
                  backgroundColor: heroOverlayColor,
                  opacity: heroOverlayOpacity / 100,
                }}
                className="absolute inset-0 z-10 pointer-events-none transition-opacity duration-300"
              />
              <div className="absolute inset-0 flex flex-col justify-end p-6 z-20 text-white pointer-events-none bg-gradient-to-t from-slate-950/80 via-transparent to-transparent">
                <span className="text-xs uppercase tracking-widest text-sky-300 font-bold">
                  {heroBadge}
                </span>
                <h3 className="text-xl font-black">{heroTitle}</h3>
                <p className="text-xs text-slate-200 mt-1 line-clamp-2">
                  {heroSubtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // 2. Categories Bar Section (Pills, Circular Stories, or Grid Cards)
  const renderCategoriesSection = () => {
    if (categoriesStyle === 'circular_stories') {
      return (
        <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-6 overflow-x-auto pb-4 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const sampleVariant = variants?.find((v) => getCategoryString(v.category) === cat && (v.image || v.image_url));
              const sampleImg = sampleVariant?.image || sampleVariant?.image_url;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="flex flex-col items-center gap-2 group shrink-0 cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full p-1 transition-all duration-300 ${
                      isSelected
                        ? 'ring-4 shadow-lg scale-105'
                        : 'ring-2 ring-slate-200 dark:ring-slate-700 hover:scale-105'
                    }`}
                    style={isSelected ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}` } : {}}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {sampleImg ? (
                        <img src={api.getMediaUrl(sampleImg)} alt={cat} className="w-full h-full object-cover" />
                      ) : (
                        <Sparkles className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold max-w-[80px] text-center truncate ${
                      isSelected ? 'font-black' : 'text-slate-700 dark:text-slate-300'
                    }`}
                    style={isSelected ? { color: primaryColor } : {}}
                  >
                    {cat === 'all' ? (isAr ? 'كافة التشكيلة' : 'All Collection') : cat}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    if (categoriesStyle === 'grid_cards') {
      return (
        <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-200 dark:border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count = cat === 'all' ? (variants?.length || 0) : (variants?.filter(v => getCategoryString(v.category) === cat).length || 0);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`p-3 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between min-h-[85px] ${
                    isSelected
                      ? 'shadow-md ring-2 ring-sky-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 bg-white/50 dark:bg-slate-900/50'
                  }`}
                  style={isSelected ? { borderColor: primaryColor } : {}}
                >
                  <span className="text-xs font-bold truncate block">{cat === 'all' ? (isAr ? 'كافة التشكيلة' : 'All') : cat}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{count} {isAr ? 'موديل' : 'items'}</span>
                </button>
              );
            })}
          </div>
        </section>
      );
    }

    // Default: Pills style
    return (
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'text-white shadow-md'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
              style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
            >
              {cat === 'all' ? (isAr ? 'كافة التشكيلة' : 'All Collection') : cat}
            </button>
          ))}
        </div>
      </section>
    );
  };

  // 3. Promotions Section
  const renderPromotionsSection = () => {
    if (promoBanners.length === 0) return null;
    return (
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoBanners.map((promo: any) => (
            <div
              key={promo.id}
              style={{ backgroundColor: promo.bg_color || undefined }}
              className="relative rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between min-h-[220px] shadow-lg border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 text-white"
            >
              {(promo.image_url || promo.image) && (
                <StorefrontImage
                  src={promo.image_url || promo.image}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-25 filter brightness-75"
                />
              )}
              <div className="relative z-10 space-y-2">
                {(promo.badge_text || promo.discount_code) && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950">
                    {promo.badge_text || `CODE: ${promo.discount_code}`}
                  </span>
                )}
                <h4 className="text-2xl font-black">{promo.title}</h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md">{promo.subtitle}</p>
              </div>
              <div className="relative z-10 pt-4 flex items-center justify-between gap-4">
                {(promo.discount_code || promo.badge_text) && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(promo.discount_code || promo.badge_text)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode === (promo.discount_code || promo.badge_text) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedCode === (promo.discount_code || promo.badge_text)
                        ? isAr
                          ? 'تم النسخ!'
                          : 'Copied!'
                        : isAr
                        ? 'نسخ الكود'
                        : 'Copy Code'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('products');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 shadow hover:bg-slate-100 transition flex items-center gap-1.5 cursor-pointer ms-auto"
                >
                  <span>{isAr ? 'تصفح العرض' : 'Browse Offer'}</span>
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
  const renderProductsSection = () => {
    const gridColsClass =
      productsGridCols === 3
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        : productsGridCols === 5
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

    const cardRadiusClass =
      cardBorderRadius === 'none'
        ? 'rounded-none'
        : cardBorderRadius === 'sm'
        ? 'rounded-lg'
        : cardBorderRadius === 'md'
        ? 'rounded-2xl'
        : 'rounded-3xl';

    const cardShadowClass =
      cardShadow === 'none'
        ? 'shadow-none'
        : cardShadow === 'sm'
        ? 'shadow-xs'
        : cardShadow === 'lg'
        ? 'shadow-2xl'
        : 'shadow-md';

    const cardAspectClass =
      cardImageAspect === 'square'
        ? 'aspect-square'
        : cardImageAspect === 'tall'
        ? 'aspect-[2/3]'
        : 'aspect-[3/4]';

    return (
      <section id="products" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'أحدث المعروضات' : 'Featured Catalog'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black mt-1">
              {isAr ? 'الموديلات الجاهزة للشحن الفوري' : 'Ready to Dispatch Styles'}
            </h3>
          </div>
          {selectedCategory !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{isAr ? 'عرض كافة التصنيفات' : 'Show all categories'}</span>
            </button>
          )}
        </div>

        {displayedVariants.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-base font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'لا توجد منتجات مطابقة لهذا التصنيف حالياً' : 'No products found matching this filter'}
            </p>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 underline cursor-pointer"
              >
                {isAr ? 'إعادة ضبط التصفية وعرض كل الموديلات' : 'Reset filter & view all models'}
              </button>
            )}
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-6`}>
            {displayedVariants.map((v) => {
              const inStock = v.in_stock > 0;
              return (
                <div
                  key={v.id}
                  style={{
                    backgroundColor: cardBgColor || undefined,
                    borderColor: cardBorderColor || undefined,
                  }}
                  className={`group ${cardRadiusClass} ${cardShadowClass} overflow-hidden border transition-all duration-300 flex flex-col ${
                    !cardBgColor ? (isDark ? 'bg-slate-900' : 'bg-white') : ''
                  } ${!cardBorderColor ? (isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300') : ''}`}
                >
                  {/* Image Card Top with StorefrontImage */}
                  <div className={`relative ${cardAspectClass} bg-slate-100 dark:bg-slate-800 overflow-hidden`}>
                    <StorefrontImage
                      src={v.image || v.image_url}
                      alt={v.model_name || v.name}
                      objectFit={cardImageFit as any}
                      className={`w-full h-full ${cardImageFit === 'contain' ? 'object-contain' : 'object-cover'} group-hover:scale-105 transition-transform duration-500`}
                    />

                  {v.gallery && v.gallery.length > 1 && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-full bg-slate-950/70 text-white text-[10px] font-mono backdrop-blur-xs">
                        +{v.gallery.length}
                      </span>
                    </div>
                  )}

                  {/* In Stock Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    {inStock ? (
                      <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                        {isAr ? 'متوفر' : 'In Stock'}
                      </span>
                    ) : (
                      <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                        {isAr ? 'نفد المخزون' : 'Out of Stock'}
                      </span>
                    )}
                  </div>

                  {/* Quick View Button on Hover */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                    <button
                      onClick={() => onSelectProduct(v)}
                      className="bg-white text-slate-900 text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-slate-100 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{isAr ? 'تفاصيل الموديل' : 'Quick Details'}</span>
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span className="font-mono">{v.sku}</span>
                      {v.color && <span>{v.color}</span>}
                    </div>
                    <h4 className="font-extrabold text-base leading-snug line-clamp-1">{v.model_name || v.name}</h4>
                    {v.size && (
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <span>{isAr ? 'المقاس:' : 'Size:'}</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{v.size}</span>
                      </div>
                    )}
                    {v.is_wholesale && (
                      <div className="mt-2 p-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                          <span>{isAr ? 'سعر الجملة المعتمد' : 'Wholesale Approved'}</span>
                          {v.moq && v.moq > 1 && (
                            <span className="font-mono">
                              MOQ: {v.moq} {isAr ? 'قطعة' : 'pcs'}
                            </span>
                          )}
                        </div>
                        {v.wholesale_tiers && v.wholesale_tiers.length > 0 && (
                          <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                            {v.wholesale_tiers.map((t: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-white dark:bg-slate-900 px-1 py-0.2 rounded border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                              >
                                +{t.min_quantity}: {Number(t.unit_price).toFixed(0)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {!v.is_wholesale && v.is_wholesale_eligible && onOpenWholesaleModal && (
                      <button
                        type="button"
                        onClick={onOpenWholesaleModal}
                        className="mt-1.5 text-[10px] text-sky-600 dark:text-sky-400 hover:underline block font-semibold text-start"
                      >
                        {isAr ? '🏷️ متوفر بأسعار الجملة للشركات والتجار' : '🏷️ Wholesale pricing available for trade'}
                      </button>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-xs text-slate-400 block">
                        {v.is_wholesale
                          ? isAr
                            ? 'سعر الجملة'
                            : 'Wholesale Price'
                          : isAr
                          ? 'سعر القطعة'
                          : 'Price'}
                      </span>
                      <span className="text-lg font-black" style={{ color: primaryColor }}>
                        {Number(v.price).toFixed(2)}{' '}
                        <span className="text-xs font-bold text-slate-500">{storeSettings?.currency || 'EGP'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectProduct(v)}
                      disabled={!inStock}
                      style={{ backgroundColor: inStock ? primaryColor : undefined }}
                      className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
                        inStock
                          ? 'text-white hover:brightness-110 active:scale-95 cursor-pointer'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isAr ? 'شراء' : 'Buy'}</span>
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
  };

  // 5. Brand Heritage & Trust Badges Section
  const renderStorySection = () => (
    <section className="py-12 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <div className="flex flex-col items-center gap-1.5 p-3">
          <Truck className="w-6 h-6 text-sky-500" />
          <h4 className="font-bold text-sm">{isAr ? 'شحن فوري سريع' : 'Express Delivery'}</h4>
          <p className="text-xs text-slate-500">{isAr ? 'خلال 48 ساعة لباب منزلك' : 'Within 48 hours to doorstep'}</p>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
          <h4 className="font-bold text-sm">{isAr ? 'ضمان جودة المصنع' : 'Factory Quality'}</h4>
          <p className="text-xs text-slate-500">{isAr ? 'مطابق لأدق معايير الفحص' : 'Certified QA inspection'}</p>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3">
          <RotateCcw className="w-6 h-6 text-amber-500" />
          <h4 className="font-bold text-sm">{isAr ? 'معاينة واستبدال سهل' : 'Easy Exchange'}</h4>
          <p className="text-xs text-slate-500">{isAr ? 'حق المعاينة قبل الاستلام' : 'Inspect before payment'}</p>
        </div>
        <div className="flex flex-col items-center gap-1.5 p-3">
          <Tag className="w-6 h-6 text-rose-500" />
          <h4 className="font-bold text-sm">{isAr ? 'سعر المصنع مباشرة' : 'Direct Factory Price'}</h4>
          <p className="text-xs text-slate-500">{isAr ? 'وفر هوامش الوسطاء والموزعين' : 'Zero middleman markups'}</p>
        </div>
      </div>
    </section>
  );

  // 6. Wholesale B2B Callout
  const renderWholesaleCtaSection = () => (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl p-8 bg-gradient-to-r from-slate-900 to-sky-950 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-sky-800/40">
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider">
            {isAr ? 'قطاع الشركات وتجارة الجملة (B2B)' : 'Corporate & Wholesale Procurement'}
          </span>
          <h4 className="text-2xl font-black">{isAr ? 'أسعار تصنيع خاصة للكميات والمحلات' : 'Direct Factory Wholesale Pricing'}</h4>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            {isAr
              ? 'نوفر أسعار جملة مخفضة، فواتير ضريبية، وشحن مجمع لكافة المحافظات مع إمكانية تصنيع طلبات خاصة.'
              : 'Bulk tiers, tax invoices, and express shipping across all governorates.'}
          </p>
        </div>
        {onOpenWholesaleModal && (
          <button
            type="button"
            onClick={onOpenWholesaleModal}
            className="px-6 py-3 rounded-2xl bg-white text-slate-900 font-bold text-xs shadow-lg hover:bg-sky-50 transition cursor-pointer shrink-0"
          >
            {isAr ? 'طلب اعتماد حساب تاجر' : 'Apply for Wholesale Account'}
          </button>
        )}
      </div>
    </section>
  );

  // 7. Contact Info Section
  const renderContactSection = () => {
    const contact = themeConfig.contact || {};
    return (
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-8 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-2xl font-black">{isAr ? 'تواصل مع فريق التصميم والإنتاج' : 'Contact Our Design Team'}</h4>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {isAr ? 'جاهزون للإجابة على كافة الاستفسارات وطلبات التفصيل' : 'Available for bespoke orders & retail customer support'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
              <Phone className="w-4 h-4 text-sky-400" />
              <span>{contact.phone || storeSettings?.contact_whatsapp || '+201000000000'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
              <Mail className="w-4 h-4 text-sky-400" />
              <span>{contact.email || 'boutique@garmentos.com'}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
              <MapPin className="w-4 h-4 text-sky-400" />
              <span>{contact.address || (isAr ? 'جمهورية مصر العربية' : 'Egypt')}</span>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // 8. Newsletter Section
  const renderNewsletterSection = () => (
    <section className="py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/40">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-4">
        <h4 className="text-xl font-bold">{isAr ? 'اشترك في النشرة البريدية للمصنع' : 'Subscribe to Factory Updates'}</h4>
        <p className="text-xs text-slate-500">
          {isAr
            ? 'احصل على إشعارات فور نزول الموديلات الجديدة وكوبونات الخصم الحصرية.'
            : 'Get notified of new production releases and exclusive discounts.'}
        </p>
        <div className="flex gap-2 max-w-md mx-auto">
          <input
            type="email"
            placeholder={isAr ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="button"
            style={{ backgroundColor: primaryColor }}
            className="px-5 py-2.5 rounded-xl text-white font-bold text-xs cursor-pointer shadow"
          >
            {isAr ? 'اشتراك' : 'Subscribe'}
          </button>
        </div>
      </div>
    </section>
  );

  const renderSectionById = (rawId: string) => {
    const id = normalizeSectionId(rawId);
    switch (id) {
      case 'hero':
        return renderHeroSection();
      case 'trust_badges':
        return renderStorySection();
      case 'categories':
        return renderCategoriesSection();
      case 'promotions':
        return renderPromotionsSection();
      case 'featured_products':
      case 'new_arrivals':
        return renderProductsSection();
      case 'wholesale_cta':
        return renderWholesaleCtaSection();
      case 'story':
        return renderStorySection();
      case 'contact_info':
        return renderContactSection();
      case 'newsletter':
        return renderNewsletterSection();
      default:
        return null;
    }
  };

  return (
    <div
      style={{ backgroundColor: pageBgColor || undefined }}
      className={`min-h-screen transition-colors duration-300 font-sans ${
        !pageBgColor ? (isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800') : ''
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

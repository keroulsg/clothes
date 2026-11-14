import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  SlidersHorizontal,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
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

export const ModernCatalogTemplate: React.FC<StorefrontTemplateProps> = ({
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
  const primaryColor = themeConfig.primary_color || '#2563eb';
  const currency = storeSettings?.currency || 'EGP';

  const heroBanner = themeConfig.hero_banner || {};
  const isHeroEnabled = heroBanner.enabled !== false;
  const heroImage = heroBanner.desktop_image || storeSettings?.banner_image || '';
  const heroMobileImage = heroBanner.mobile_image || heroImage;
  const heroTitle = heroBanner.title || storeSettings?.banner_title || (isAr ? 'كتالوج المصنع للإنتاج المباشر والتوريدات' : 'Factory Direct Catalog & Supply');
  const heroSubtitle = heroBanner.subtitle || storeSettings?.banner_subtitle || (isAr ? 'موديلات جاهزة للشحن بأسعار الجملة والتجزئة من أرض المصنع مع إمكانية التعاقد والتوريد بكميات ضخمة.' : 'Export quality apparel ready for dispatch with tiered wholesale and corporate ordering.');
  const heroBadge = heroBanner.badge || (isAr ? 'توريدات مصانع وشركات — B2B & Retail' : 'Wholesale & Retail Ready');
  const heroCtaText = heroBanner.cta_text || (isAr ? 'تصفح كافة المعروضات' : 'Explore Full Catalog');
  const heroCtaDestination = heroBanner.cta_destination || 'shop';

  const handleHeroCtaClick = () => {
    if (heroCtaDestination === 'categories' && onNavigateToCategories) onNavigateToCategories();
    else if (heroCtaDestination === 'contact' && onNavigateToContact) onNavigateToContact();
    else if (heroCtaDestination === 'about' && onNavigateToAbout) onNavigateToAbout();
    else if (heroCtaDestination === 'policies' && onNavigateToPolicies) onNavigateToPolicies();
    else if (onNavigateToShop) onNavigateToShop();
    else {
      const el = document.getElementById('catalog-grid');
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

  const [stockOnlyFilter, setStockOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock'>('default');

  // Dynamic Category Extraction from actual product catalog
  const categories = useMemo(() => {
    const extracted = Array.from(
      new Set(
        (variants || [])
          .map((v) => getCategoryString(v.category))
          .filter((c) => Boolean(c) && c.length > 0)
      )
    );
    return [
      { id: 'all', name_ar: 'كافة التصنيفات', name_en: 'All Categories' },
      ...extracted.map((c) => ({ id: c, name_ar: c, name_en: c })),
    ];
  }, [variants]);

  // Filter & sort logic
  const filteredVariants = useMemo(() => {
    return (variants || [])
      .filter((v) => {
        if (stockOnlyFilter && v.in_stock <= 0) return false;
        const cat = getCategoryString(v.category);
        if (selectedCategory && selectedCategory !== 'all' && cat !== selectedCategory) return false;
        const q = (searchQuery || '').trim().toLowerCase();
        if (
          q &&
          !(v.model_name || v.name || '').toLowerCase().includes(q) &&
          !(v.sku || '').toLowerCase().includes(q) &&
          !cat.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
        if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
        if (sortBy === 'stock') return Number(b.in_stock) - Number(a.in_stock);
        return 0;
      });
  }, [variants, stockOnlyFilter, selectedCategory, searchQuery, sortBy]);

  // Dynamic Section Registry Rendering
  const activeSections = getActiveSortedSections(themeConfig?.sections);

  // 1. Hero Section
  const renderHeroSection = () => {
    if (!isHeroEnabled) return null;
    return (
      <section className="mb-8 rounded-3xl overflow-hidden relative shadow-lg min-h-[220px] sm:min-h-[280px] flex items-center bg-slate-900 text-white">
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
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none" />
          </>
        ) : (
          <>
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80"
              alt={heroTitle}
              className="w-full h-full object-cover absolute inset-0 filter brightness-[0.4]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent pointer-events-none" />
          </>
        )}
        <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3">
          {heroBadge && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>{heroBadge}</span>
            </div>
          )}
          <h2 className="text-2xl sm:text-4xl font-black leading-tight">{heroTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-200 line-clamp-2">{heroSubtitle}</p>
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleHeroCtaClick}
              style={{ backgroundColor: primaryColor }}
              className="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-md hover:brightness-110 transition cursor-pointer inline-flex items-center gap-2"
            >
              <span>{heroCtaText}</span>
              <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </section>
    );
  };

  // 2. Categories Bar Section
  const renderCategoriesSection = () => (
    <section className="mb-6 flex flex-wrap items-center gap-2">
      {categories.map((c: any) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setSelectedCategory(c.id)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            selectedCategory === c.id
              ? 'text-white shadow-sm'
              : isDark
              ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
          style={selectedCategory === c.id ? { backgroundColor: primaryColor } : {}}
        >
          {isAr ? c.name_ar : c.name_en}
        </button>
      ))}
    </section>
  );

  // 3. Promotional Banners Section
  const renderPromotionsSection = () => {
    if (promoBanners.length === 0) return null;
    return (
      <section className="my-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promoBanners.map((promo: any) => (
            <div
              key={promo.id}
              style={{ backgroundColor: promo.bg_color || undefined }}
              className="relative rounded-3xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between min-h-[220px] shadow-lg border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 to-indigo-900 text-white"
            >
              {(promo.image_url || promo.image) && (
                <StorefrontImage
                  src={promo.image_url || promo.image}
                  alt={promo.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30 filter brightness-75"
                />
              )}
              <div className="relative z-10 space-y-2">
                {(promo.badge_text || promo.discount_code) && (
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-400 text-slate-950 shadow-sm">
                    {promo.badge_text || `CODE: ${promo.discount_code}`}
                  </span>
                )}
                <h4 className="text-2xl font-black">{promo.title}</h4>
                <p className="text-xs sm:text-sm text-blue-100 max-w-md">{promo.subtitle}</p>
              </div>
              <div className="relative z-10 pt-4 flex items-center justify-between gap-4">
                {(promo.discount_code || promo.badge_text) && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(promo.discount_code || promo.badge_text)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode === (promo.discount_code || promo.badge_text) ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === (promo.discount_code || promo.badge_text) ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الكود' : 'Copy Code')}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('catalog-grid');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-blue-900 shadow-md hover:bg-blue-50 transition flex items-center gap-1.5 cursor-pointer ms-auto"
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

  // 4. Featured Catalog Products Grid Section
  const renderProductsSection = () => (
    <div id="catalog-grid" className="grid grid-cols-1 lg:grid-cols-4 gap-8 my-6">
      {/* Sidebar Filters */}
      <aside className="lg:col-span-1 space-y-6">
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            <span>{isAr ? 'تصفية المنتجات والأقسام' : 'Filter Categories'}</span>
          </div>

          {/* Categories in sidebar */}
          <div className="space-y-1.5 mb-6">
            {categories.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  selectedCategory === c.id
                    ? 'text-white shadow-sm'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
                style={selectedCategory === c.id ? { backgroundColor: primaryColor } : {}}
              >
                <span>{isAr ? c.name_ar : c.name_en}</span>
                <span className="text-[10px] opacity-70">
                  {c.id === 'all' ? variants.length : Math.ceil(variants.length / 3)}
                </span>
              </button>
            ))}
          </div>

          {/* Stock Filter Toggle */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold select-none">
              <input
                type="checkbox"
                checked={stockOnlyFilter}
                onChange={(e) => setStockOnlyFilter(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{isAr ? 'عرض المتوفر بالمخازن فقط' : 'In-Stock items only'}</span>
            </label>
          </div>
        </div>

        {/* Bulk RFQ Quick Box */}
        <div
          className={`p-5 rounded-2xl border ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-blue-50/60 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold text-sm mb-2">
            <FileSpreadsheet className="w-5 h-5" />
            <span>{isAr ? 'طلب عروض أسعار الجملة' : 'Request Wholesale Quote'}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
            {isAr
              ? 'للكميات التي تتجاوز 100 قطعة للشركات والمصانع، نقدم أسعاراً تفضيلية وخدمة تطريز وطباعة اللوجو.'
              : 'For orders exceeding 100 pcs, get special tiered pricing and custom logo embroidery.'}
          </p>
          <a
            href={storeSettings?.contact_whatsapp ? `https://wa.me/${storeSettings.contact_whatsapp}` : '#'}
            target="_blank"
            rel="noreferrer"
            className="w-full text-center block bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
          >
            {isAr ? 'تواصل مع إدارة المبيعات' : 'Contact Sales Representative'}
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="lg:col-span-3 space-y-6">
        {/* Sorting & Stats Bar */}
        <div
          className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-xs font-bold text-slate-500">
            {isAr
              ? `عرض ${filteredVariants.length} من أصل ${variants.length} صنف ومقاس`
              : `Showing ${filteredVariants.length} of ${variants.length} items`}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">{isAr ? 'ترتيب حسب:' : 'Sort by:'}</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="default">{isAr ? 'الترتيب الافتراضي' : 'Default'}</option>
              <option value="price_asc">{isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
              <option value="price_desc">{isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
              <option value="stock">{isAr ? 'الرصيد المتوفر' : 'Available Stock'}</option>
            </select>
          </div>
        </div>

        {/* Catalog Grid */}
        {filteredVariants.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">{isAr ? 'لا توجد أصناف مطابقة للبحث' : 'No catalog items match'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredVariants.map((v: any) => {
              const inStock = v.in_stock > 0;
              return (
                <div
                  key={v.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow'
                  }`}
                >
                  <div>
                    {/* Top Meta: SKU + Stock */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {v.sku}
                      </span>
                      {inStock ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isAr ? `متاح (${v.in_stock})` : `In Stock (${v.in_stock})`}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{isAr ? 'غير متوفر' : 'Out of stock'}</span>
                        </span>
                      )}
                    </div>

                    {/* Product Image with universal fallback */}
                    <div
                      onClick={() => onSelectProduct(v)}
                      className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 cursor-pointer group"
                    >
                      <StorefrontImage
                        src={v.image}
                        alt={v.model_name}
                        aspectRatio="wide"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {v.gallery && v.gallery.length > 1 && (
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                          +{v.gallery.length}
                        </span>
                      )}
                    </div>

                    {/* Product Title */}
                    <h4
                      onClick={() => onSelectProduct(v)}
                      className="font-extrabold text-sm sm:text-base leading-snug cursor-pointer hover:text-blue-600 transition-colors line-clamp-1"
                    >
                      {v.model_name}
                    </h4>

                    {/* Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">{isAr ? 'المقاس' : 'Size'}</span>
                        <span className="font-bold">{v.size || 'Standard'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">{isAr ? 'اللون' : 'Color'}</span>
                        <span className="font-bold">{v.color || 'Standard'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">{isAr ? 'الحد الأدنى (MOQ)' : 'MOQ'}</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {v.moq && v.moq > 1 ? `${v.moq} ${isAr ? 'قطعة' : 'Pcs'}` : (isAr ? '1 قطعة' : '1 Piece')}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">{isAr ? 'كود الموديل' : 'Model Code'}</span>
                        <span className="font-mono text-[10px] font-bold">{v.model_code || '---'}</span>
                      </div>
                    </div>

                    {/* Wholesale Volume Tiers Preview */}
                    {v.is_wholesale && v.wholesale_tiers && v.wholesale_tiers.length > 0 && (
                      <div className="mt-2 p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-[10px]">
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 block mb-0.5">
                          {isAr ? 'شرائح خصم الجملة:' : 'Volume Tiers:'}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {v.wholesale_tiers.map((t: any, idx: number) => (
                            <span key={idx} className="bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                              +{t.min_quantity}: {Number(t.unit_price).toFixed(0)} {currency}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {!v.is_wholesale && v.is_wholesale_eligible && onOpenWholesaleModal && (
                      <button
                        type="button"
                        onClick={onOpenWholesaleModal}
                        className="mt-2 w-full text-start p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[10px] text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium flex items-center justify-between"
                      >
                        <span>{isAr ? '🏷️ أسعار خاصة للشركات والجملة' : '🏷️ B2B Trade Pricing'}</span>
                        <span className="underline font-bold">{isAr ? 'سجل هنا' : 'Apply'}</span>
                      </button>
                    )}
                  </div>

                  {/* Pricing & Order Action */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">
                        {v.is_wholesale
                          ? (isAr ? 'سعر الجملة' : 'Wholesale')
                          : (isAr ? 'سعر القطعة' : 'Unit Price')}
                      </span>
                      <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {v.price.toFixed(2)}{' '}
                        <span className="text-[10px] font-semibold text-slate-400">{currency}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectProduct(v)}
                      disabled={!inStock}
                      style={{ backgroundColor: inStock ? primaryColor : undefined }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                        inStock
                          ? 'text-white hover:brightness-110 active:scale-95'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة للطلب' : 'Add to Order'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );

  // 5. Factory Story & Contract Capabilities Section
  const renderStorySection = () => {
    const storyText = themeConfig.pages?.about_story || (isAr
      ? 'مصنع رائد في تصنيع وتوريد الملابس الجاهزة والزي الموحد بأعلى معايير الجودة العالمية، وتوفير خطوط إنتاج حديثة تخدم كبرى الشركات والمتاجر.'
      : 'Leading garment manufacturing facility specializing in corporate workwear, uniforms, and export-grade ready-made apparel with modern high-capacity production lines.');
    return (
      <section className="my-10 p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">{isAr ? 'عن المصنع وإمكانياتنا' : 'About Our Facility'}</span>
          <h3 className="text-2xl font-black">{storeSettings?.store_name || (isAr ? 'مصنع الملابس المتطور' : 'Garment Factory')}</h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{storyText}</p>
        </div>
      </section>
    );
  };

  // 6. Contact Info Section
  const renderContactSection = () => {
    const contact = themeConfig.contact || {};
    return (
      <section className="my-8 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <h4 className="font-extrabold text-sm mb-4 text-slate-900 dark:text-white">{isAr ? 'بيانات التواصل مع المصنع' : 'Contact Manufacturing Team'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Phone className="w-4 h-4 text-blue-500" />
            <span>{contact.phone || storeSettings?.contact_whatsapp || '+201000000000'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>{contact.email || 'sales@garmentos.com'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>{contact.address || (isAr ? 'جمهورية مصر العربية' : 'Egypt')}</span>
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
          <section className="my-8 p-6 rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-950 text-white shadow flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold text-blue-300 uppercase tracking-widest block">{isAr ? 'عقود التوريد وتجارة الجملة' : 'B2B Wholesale Procurement'}</span>
              <h4 className="text-xl font-black mt-0.5">{isAr ? 'طلب عروض أسعار وتوريد زي موحد للمؤسسات' : 'Request Corporate Quote & Uniform Supply'}</h4>
              <p className="text-xs text-blue-100 max-w-xl mt-1">{isAr ? 'نوفر كميات إنتاجية ضخمة بمواصفات مطابقة لكراسات الشروط مع شحن مباشر من خطوط الحياكة.' : 'Volume supply contracts with batch certification and direct delivery.'}</p>
            </div>
            {onOpenWholesaleModal && (
              <button
                type="button"
                onClick={onOpenWholesaleModal}
                className="px-5 py-2.5 rounded-xl bg-white text-blue-950 font-bold text-xs shadow hover:bg-blue-50 transition cursor-pointer shrink-0"
              >
                {isAr ? 'تقديم طلب توريد' : 'Submit Wholesale Application'}
              </button>
            )}
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeSections.map((sec) => (
          <React.Fragment key={sec.id}>
            {renderSectionById(sec.id)}
          </React.Fragment>
        ))}
      </main>
    </div>
  );
};

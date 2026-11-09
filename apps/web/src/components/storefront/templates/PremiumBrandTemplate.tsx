import React from 'react';
import {
  Crown,
  ShoppingBag,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  Award,
  Gem,
} from 'lucide-react';
import type { StorefrontTemplateProps } from './types';

export const PremiumBrandTemplate: React.FC<StorefrontTemplateProps> = ({
  lang,
  isDark,
  storeSettings,
  tenantInfo,
  variants,
  searchQuery,
  setSearchQuery,
  cartCount,
  onOpenCart,
  onSelectProduct,
  onNavigateToTracking,
  onNavigateToErp,
  onToggleTheme,
  onToggleLang,
}) => {
  const isAr = lang === 'ar';
  const themeConfig = storeSettings?.theme_config || {};
  const primaryColor = themeConfig.primary_color || '#d97706';
  const storeName = storeSettings?.store_name || tenantInfo?.name || 'Maison de Couture';
  const currency = storeSettings?.currency || 'EGP';

  return (
    <div
      className={`min-h-screen font-serif transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-stone-50 text-stone-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Gold Line Announcement */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-500 to-amber-700 text-stone-950 text-xs py-2 px-4 text-center font-sans font-bold tracking-widest uppercase shadow-sm">
        <span>
          {themeConfig.announcement_bar_text ||
            (isAr
              ? '⚜️ مجموعة التصاميم الفاخرة — أقمشة إيطالية منسوجة بحرفية مصرية أصيلة ⚜️'
              : '⚜️ The Haute Couture Edition — Master Craftsmanship in Limited Runs ⚜️')}
        </span>
      </div>

      {/* Luxury Navigation Header */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-lg border-b transition-colors ${
          isDark ? 'bg-zinc-950/90 border-amber-900/30' : 'bg-white/90 border-stone-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-24 flex items-center justify-between gap-4 font-sans">
          {/* Brand Seal */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-amber-600/60 flex items-center justify-center text-amber-500 shadow-md">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl tracking-wider uppercase font-normal">{storeName}</h1>
              <span className="text-[10px] tracking-[0.25em] text-amber-600/80 dark:text-amber-400/80 uppercase font-sans font-semibold block">
                {isAr ? 'دار الأزياء والأناقة الراقية' : 'Haute Horlogerie & Couture'}
              </span>
            </div>
          </div>

          {/* Minimal Search */}
          <div className="hidden lg:block flex-1 max-w-sm mx-8">
            <div className="relative">
              <Search className={`absolute ${isAr ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400`} />
              <input
                type="text"
                placeholder={isAr ? 'ابحث في التشكيلة الحصرية...' : 'Search bespoke designs...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2 text-xs rounded-none border-b focus:outline-none transition-colors ${
                  isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'
                } ${
                  isDark
                    ? 'bg-transparent border-zinc-700 text-white placeholder-zinc-500 focus:border-amber-500'
                    : 'bg-transparent border-stone-300 text-stone-900 placeholder-stone-400 focus:border-amber-600'
                }`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 text-xs">
            <button
              onClick={onNavigateToTracking}
              className="text-stone-400 hover:text-amber-500 transition-colors uppercase tracking-wider hidden sm:inline-block"
            >
              {isAr ? 'تتبع طلبك' : 'Track Order'}
            </button>

            {onNavigateToErp && (
              <button
                onClick={onNavigateToErp}
                className="text-stone-400 hover:text-amber-500 transition-colors uppercase tracking-wider hidden sm:inline-block"
              >
                {isAr ? 'المصنع' : 'Atelier'}
              </button>
            )}

            <button onClick={onToggleLang} className="p-2 text-stone-400 hover:text-amber-500 transition-colors">
              <Globe className="w-4 h-4" />
            </button>
            <button onClick={onToggleTheme} className="p-2 text-stone-400 hover:text-amber-500 transition-colors">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Gold Shopping Bag */}
            <button
              onClick={onOpenCart}
              className="flex items-center gap-2 border border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-white px-4 py-2 rounded-none transition-all uppercase tracking-widest font-sans font-bold"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAr ? 'الحقيبة' : 'Bag'}</span>
              <span className="bg-amber-600 text-white px-1.5 py-0.2 rounded text-[10px] font-black">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Luxury Hero */}
      <section className="relative py-20 sm:py-28 px-4 text-center border-b border-stone-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs uppercase tracking-[0.3em] font-sans font-bold">
            <Gem className="w-4 h-4" />
            <span>{isAr ? 'إصدار فاخر محدود' : 'Limited Atelier Edition'}</span>
          </div>

          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-normal tracking-tight leading-tight">
            {storeSettings?.banner_title || (isAr ? 'فخامة لا تخطئها العين' : 'Timeless Elegance & Prestige')}
          </h2>

          <p className="text-base sm:text-lg text-stone-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed font-sans font-light">
            {storeSettings?.banner_subtitle ||
              (isAr
                ? 'قصات دقيقة تعكس روح الفخامة المعاصرة. قطع منسوجة خصيصاً للمناسبات الراقية والإطلالات التي تستحق التميز.'
                : 'Impeccable silhouettes meeting exquisite textiles. Tailored pieces crafted strictly for those who discern the art of fine dressing.')}
          </p>

          <div className="pt-4 font-sans">
            <a
              href="#collection"
              style={{ backgroundColor: primaryColor }}
              className="text-stone-950 font-bold text-xs uppercase tracking-[0.2em] px-8 py-4 inline-flex items-center gap-3 shadow-2xl hover:brightness-110 transition-all"
            >
              <span>{isAr ? 'اكتشف المجموعة' : 'Explore The Atelier'}</span>
              <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
            </a>
          </div>
        </div>
      </section>

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
                      src={v.image}
                      alt={v.model_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
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
                  </div>

                  <div className="pt-4 border-t border-stone-100 dark:border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-stone-400 block">
                        {isAr ? 'السعر الحصري' : 'Price'}
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

      {/* Footer */}
      <footer className="py-12 border-t border-stone-200 dark:border-zinc-800 text-center text-xs text-stone-400 font-sans">
        <p className="tracking-widest uppercase">
          © {new Date().getFullYear()} {storeName} — {isAr ? 'جميع الحقوق الملكية محفوظة' : 'All Rights Reserved'}
        </p>
      </footer>
    </div>
  );
};

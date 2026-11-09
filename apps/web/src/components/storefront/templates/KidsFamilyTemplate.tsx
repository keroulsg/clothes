import React, { useState } from 'react';
import {
  Baby,
  Heart,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Sun,
  Moon,
  Globe,
  Search,
  ArrowRight,
  Smile,
  Award,
} from 'lucide-react';
import type { StorefrontTemplateProps } from './types';

export const KidsFamilyTemplate: React.FC<StorefrontTemplateProps> = ({
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
  const primaryColor = themeConfig.primary_color || '#f97316';
  const storeName = storeSettings?.store_name || tenantInfo?.name || 'Kids & Baby Haven';
  const currency = storeSettings?.currency || 'EGP';

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
      {/* Top Friendly Announcement Bar */}
      <div className="bg-gradient-to-r from-orange-400 via-amber-400 to-rose-400 text-white text-xs sm:text-sm py-2 px-4 text-center font-bold shadow-sm">
        <span>
          {themeConfig.announcement_bar_text ||
            (isAr
              ? '🍼 قطن مصري 100% طبيعي آمن على بشرة طفلك — شحن سريع وتوصيل آمن لجميع المحافظات 🧸'
              : '🍼 100% Gentle Egyptian cotton safe for baby skin — fast nationwide home delivery 🧸')}
        </span>
      </div>

      {/* Playful Header */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${
          isDark ? 'bg-slate-900/90 border-amber-900/40' : 'bg-white/90 border-amber-100 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo with Baby Icon */}
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transform -rotate-3 hover:rotate-3 transition-transform"
            >
              <Baby className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl sm:text-2xl tracking-tight leading-none text-orange-600 dark:text-orange-400">
                {storeName}
              </h1>
              <span className="text-[11px] font-bold text-amber-700/70 dark:text-amber-400/70">
                {isAr ? 'ملابس الأطفال والمواليد بأعلى معايير الأمان' : 'Kids & Baby Safe Comfort Wear'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md mx-4 hidden md:block">
            <div className="relative">
              <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500`} />
              <input
                type="text"
                placeholder={isAr ? 'ابحث عن سالوبيت، بيجامات، فساتين، أطقم خروج...' : 'Search bodysuits, pajamas, dresses...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 text-sm rounded-full transition-all focus:outline-none focus:ring-2 ${
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                } ${
                  isDark
                    ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:ring-orange-500'
                    : 'bg-amber-50 border border-amber-200 text-slate-800 placeholder-amber-400 focus:ring-orange-400'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateToTracking}
              className={`text-xs font-bold px-3 py-2 rounded-full border transition-all ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-amber-200 text-amber-900 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              {isAr ? 'أين طلبي؟ 🚚' : 'Where is my order?'}
            </button>

            {onNavigateToErp && (
              <button
                onClick={onNavigateToErp}
                className="hidden sm:inline-block text-xs font-bold px-3 py-2 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                {isAr ? 'المصنع' : 'ERP'}
              </button>
            )}

            <button onClick={onToggleLang} className="p-2 rounded-full text-slate-400 hover:text-slate-600">
              <Globe className="w-5 h-5" />
            </button>
            <button onClick={onToggleTheme} className="p-2 rounded-full text-slate-400 hover:text-slate-600">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={onOpenCart}
              style={{ backgroundColor: primaryColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-full shadow-lg font-black text-sm hover:scale-105 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAr ? 'سلة التسوق' : 'Cart'}</span>
              <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Warm Hero Banner */}
      <section className="py-10 md:py-16 px-4 max-w-7xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 bg-gradient-to-r from-orange-400 via-amber-300 to-rose-300 text-slate-900 shadow-xl">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-orange-600 shadow-sm">
              <Smile className="w-4 h-4" />
              <span>{isAr ? 'نعومة فائقة وألوان مبهجة تناسب براءة طفلك' : 'Ultra-soft & Gentle Baby Care'}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black leading-tight text-slate-950">
              {storeSettings?.banner_title || (isAr ? 'أجمل إطلالات طفلك من المصنع مباشرة' : 'Pure Comfort for Little Smiles')}
            </h2>
            <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed">
              {storeSettings?.banner_subtitle ||
                (isAr
                  ? 'ملابس أطفال ومواليد مصممة بخيوط قطنية نقية 100% بدون أي مواد كيميائية ضارة. مقاسات دقيقة وتصاميم مريحة للحركة واللعب.'
                  : 'Gentle, 100% natural cotton garments crafted with non-toxic dyes, tagless labels, and stretchy designs for play and nap time.')}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <a
                href="#products"
                className="bg-slate-950 text-white font-black text-xs sm:text-sm px-6 py-3 rounded-full shadow-lg hover:bg-slate-800 transition-all inline-flex items-center gap-2"
              >
                <span>{isAr ? 'تصفح ملابس الأطفال' : 'Explore Outfits'}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </a>
              <span className="text-xs font-bold text-slate-800 bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                {isAr ? '✨ دفع عند الاستلام أو InstaPay' : '✨ COD or InstaPay'}
              </span>
            </div>
          </div>
        </div>
      </section>

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
                      src={v.image}
                      alt={v.model_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
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
                  </div>

                  <div className="pt-3 border-t border-amber-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر' : 'Price'}</span>
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

      {/* Footer */}
      <footer className="py-8 mt-12 border-t border-amber-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {storeName} — {isAr ? 'صنع بكل حب للأطفال' : 'Crafted with Love for Kids'}</p>
          <button onClick={onNavigateToTracking} className="hover:underline font-bold text-orange-600 dark:text-orange-400">
            {isAr ? 'تتبع شحنة طفلك 🚚' : 'Track Baby Delivery 🚚'}
          </button>
        </div>
      </footer>
    </div>
  );
};

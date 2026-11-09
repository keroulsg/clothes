import React from 'react';
import {
  ShoppingBag,
  Search,
  Sparkles,
  ArrowRight,
  Truck,
  ShieldCheck,
  RotateCcw,
  Eye,
  Sun,
  Moon,
  Globe,
  Tag,
} from 'lucide-react';
import type { StorefrontTemplateProps } from './types';

export const FashionBoutiqueTemplate: React.FC<StorefrontTemplateProps> = ({
  lang,
  isDark,
  storeSettings,
  tenantInfo,
  variants,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
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
  const primaryColor = themeConfig.primary_color || '#0284c7';
  const storeName = storeSettings?.store_name || tenantInfo?.name || 'Garment Fashion Direct';
  const announcementText =
    themeConfig.announcement_bar_text ||
    (isAr ? '✨ شحن سريع ومجاني للطلبات فوق 1,000 ج.م في جميع المحافظات' : '✨ Fast & Free shipping on orders over 1,000 EGP nationwide');

  // Categories extraction
  const categories = ['all', 'T-Shirts', 'Polos', 'Pants', 'Dresses'];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 font-sans ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top Announcement Bar */}
      {themeConfig.announcement_bar_enabled !== false && (
        <div
          style={{ backgroundColor: primaryColor }}
          className="text-white text-xs sm:text-sm py-2 px-4 text-center font-medium shadow-sm transition-all"
        >
          <span>{announcementText}</span>
        </div>
      )}

      {/* Header / Nav */}
      <header
        className={`sticky top-0 z-30 backdrop-blur-md border-b transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md transform hover:rotate-6 transition-transform"
            >
              {themeConfig.logo_url ? (
                <img src={themeConfig.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded-xl" />
              ) : (
                storeName.charAt(0)
              )}
            </div>
            <div>
              <h1 className="font-extrabold text-lg sm:text-xl tracking-tight leading-none">{storeName}</h1>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {isAr ? 'المتجر الرسمي للمصنع مباشرة' : 'Direct Factory Boutique'}
              </span>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
              <input
                type="text"
                placeholder={isAr ? 'ابحث عن الموديل، اللون، أو الكود...' : 'Search designs, colors, or SKU...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 text-sm rounded-full transition-all focus:outline-none focus:ring-2 ${
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                } ${
                  isDark
                    ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-sky-500'
                    : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-sky-600'
                }`}
              />
            </div>
          </div>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onNavigateToTracking}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-all ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isAr ? 'تتبع طلبك' : 'Track Order'}
            </button>

            {onNavigateToErp && (
              <button
                onClick={onNavigateToErp}
                className={`hidden sm:inline-block text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isAr ? 'لوحة المصنع' : 'ERP Panel'}
              </button>
            )}

            <button
              onClick={onToggleLang}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Change Language"
            >
              <Globe className="w-5 h-5" />
            </button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              style={{ backgroundColor: primaryColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl shadow-lg font-bold text-sm transform hover:scale-105 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'السلة' : 'Cart'}</span>
              <span className="bg-white/30 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-black">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Editorial Campaign Banner */}
      <section className="relative overflow-hidden py-12 md:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'تشكيلة الموسم الجديد — جودة تصدير' : 'New Season Collection — Export Quality'}</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
              {storeSettings?.banner_title || (isAr ? 'أناقة راقية بأسعار المصنع مباشرة' : 'Refined Fashion Directly from the Workshop')}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
              {storeSettings?.banner_subtitle ||
                (isAr
                  ? 'خامات قطنية 100%، تفصيل متقن، وضمان استبدال فوري. استمتع بأعلى معايير الملابس الجاهزة دون وسطاء.'
                  : '100% natural fabrics, master tailoring, and immediate replacement guarantee. Enjoy top garment standards with zero middlemen.')}
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#products"
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl hover:shadow-2xl hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2"
              >
                <span>{isAr ? 'تصفح التشكيلة الكاملة' : 'Shop Collection'}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </a>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'دفع عند الاستلام أو InstaPay' : 'COD & InstaPay Supported'}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent z-10" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 z-20 text-white">
                <span className="text-xs uppercase tracking-widest text-sky-300 font-bold">
                  {isAr ? 'إصدار محدود' : 'Limited Edition'}
                </span>
                <h3 className="text-xl font-black">{isAr ? 'الأزياء الشبابية والكاجوال' : 'Youth & Casual Attire'}</h3>
                <p className="text-xs text-slate-200 mt-1">
                  {isAr ? 'خامات مصرية ناعمة مقاومة للانكماش' : 'Shrink-resistant ultra-soft Egyptian cotton'}
                </p>
              </div>
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-indigo-600">
                <span className="text-8xl opacity-30 select-none">✨</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
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

      {/* Products Section */}
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'text-white shadow-md'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
                style={selectedCategory === cat ? { backgroundColor: primaryColor } : {}}
              >
                {cat === 'all' ? (isAr ? 'الكل' : 'All') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {variants.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-base font-semibold">{isAr ? 'لا توجد منتجات مطابقة حالياً' : 'No products found'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {variants.map((v) => {
              const inStock = v.in_stock > 0;
              return (
                <div
                  key={v.id}
                  className={`group rounded-3xl overflow-hidden border transition-all duration-300 flex flex-col ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:shadow-2xl'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl'
                  }`}
                >
                  {/* Image Card Top */}
                  <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800 overflow-hidden">
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
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 group-hover:scale-105 transition-transform duration-500">
                        <span className="text-5xl opacity-40 select-none">👕</span>
                      </div>
                    )}

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
                        className="bg-white text-slate-900 text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all hover:bg-slate-100"
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
                      <h4 className="font-extrabold text-base leading-snug line-clamp-1">{v.model_name}</h4>
                      {v.size && (
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <span>{isAr ? 'المقاس:' : 'Size:'}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{v.size}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs text-slate-400 block">{isAr ? 'سعر القطعة' : 'Price'}</span>
                        <span className="text-lg font-black" style={{ color: primaryColor }}>
                          {v.price.toFixed(2)}{' '}
                          <span className="text-xs font-bold text-slate-500">{storeSettings?.currency || 'EGP'}</span>
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectProduct(v)}
                        disabled={!inStock}
                        style={{ backgroundColor: inStock ? primaryColor : undefined }}
                        className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all ${
                          inStock
                            ? 'text-white hover:brightness-110 active:scale-95'
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

      {/* Brand Craftsmanship Story Section */}
      <section className="py-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs uppercase font-extrabold tracking-widest text-sky-600 dark:text-sky-400">
              {isAr ? 'حكاية المصنع والجودة' : 'Our Craft & Heritage'}
            </span>
            <h3 className="text-3xl font-black leading-tight">
              {isAr ? 'صناعة مصرية بمعايير عالمية للملابس الجاهزة' : 'Egyptian Craftsmanship Built for Global Standards'}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? 'نعمل داخل خطوط إنتاج متكاملة تبدأ من غزل خيوط القطن المصري طويل التيلة، مروراً بأحدث ماكينات القص الأوتوماتيكية، ومراحل الخياطة والكي، وصولاً إلى فحص الجودة والتغليف. نصلك بالمنتج مباشرة دون وسطاء لنقدم لك أعلى قيمة وجودة.'
                : 'From long-staple Egyptian cotton yarn to state-of-the-art automated cutting and finishing lines, we manage the entire production cycle under rigorous quality controls, delivering genuine luxury at direct manufacturer pricing.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 text-center">
              <span className="block text-4xl font-black text-sky-500 mb-1">100%</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'قطن مصري أصيل' : 'Pure Egyptian Cotton'}
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 text-center">
              <span className="block text-4xl font-black text-emerald-500 mb-1">48h</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'توصيل لباب منزلك' : 'Doorstep Dispatch'}
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 text-center">
              <span className="block text-4xl font-black text-amber-500 mb-1">0</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'وسطاء أو عمولات' : 'Middlemen Markups'}
              </span>
            </div>
            <div className="p-6 rounded-3xl bg-slate-100 dark:bg-slate-800 text-center">
              <span className="block text-4xl font-black text-rose-500 mb-1">14d</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {isAr ? 'استبدال واسترجاع' : 'Exchange Policy'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {storeName} — {isAr ? 'مدعوم بنظام GarmentOS Cloud' : 'Powered by GarmentOS Cloud'}</p>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateToTracking} className="hover:underline">
              {isAr ? 'تتبع شحنتك' : 'Track Package'}
            </button>
            <span>•</span>
            <span>{isAr ? 'خدمة العملاء: 01000000000' : 'Support: 01000000000'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

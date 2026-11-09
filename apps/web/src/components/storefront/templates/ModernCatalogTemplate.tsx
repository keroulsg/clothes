import React, { useState } from 'react';
import {
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Package,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  Globe,
  Sun,
  Moon,
} from 'lucide-react';
import type { StorefrontTemplateProps } from './types';

export const ModernCatalogTemplate: React.FC<StorefrontTemplateProps> = ({
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
  const primaryColor = themeConfig.primary_color || '#2563eb';
  const storeName = storeSettings?.store_name || tenantInfo?.name || 'Modern Apparel Catalog';
  const currency = storeSettings?.currency || 'EGP';

  const [stockOnlyFilter, setStockOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock'>('default');

  // Filter & sort logic
  const filteredVariants = variants
    .filter((v) => {
      if (stockOnlyFilter && v.in_stock <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock') return b.in_stock - a.in_stock;
      return 0;
    });

  const categories = [
    { id: 'all', name_ar: 'كافة التصنيفات', name_en: 'All Categories' },
    { id: 'casual', name_ar: 'ملابس كاجوال', name_en: 'Casual Wear' },
    { id: 'uniform', name_ar: 'زي موحد ويونيفورم', name_en: 'Uniform & Corporate' },
    { id: 'polo', name_ar: 'بولو وقمصان رجالي', name_en: 'Polos & Shirts' },
    { id: 'workwear', name_ar: 'ملابس عمال ومصانع', name_en: 'Industrial Workwear' },
  ];

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Top B2B / Wholesale Notice Banner */}
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">B2B & WHOLESALE</span>
            <span>
              {isAr
                ? 'كتالوج المصنع المباشر: أسعار تجارية خاصة للمحلات والشركات وتوريدات الملابس الموحدة'
                : 'Direct Factory Catalog: Special trade pricing for retail chains, corporate uniforms & bulk supply'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button onClick={onNavigateToTracking} className="hover:text-white underline">
              {isAr ? 'تتبع طلبيات التوريد' : 'Track Shipments'}
            </button>
            {onNavigateToErp && (
              <button onClick={onNavigateToErp} className="hover:text-white font-bold">
                {isAr ? 'بوابة إدارة المصنع' : 'ERP Portal'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Catalog Header */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              style={{ backgroundColor: primaryColor }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow font-black text-xl"
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none">{storeName}</h1>
              <span className="text-xs font-semibold text-slate-400">
                {isAr ? 'كتالوج التوريدات والملابس الجاهزة' : 'Commercial Catalog & Ready-wear'}
              </span>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <div className="relative">
              <Search className={`absolute ${isAr ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
              <input
                type="text"
                placeholder={isAr ? 'ابحث برقم الكود SKU، اسم الموديل، اللون، أو الباركود...' : 'Search by SKU, Model name, Color or Barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full py-2.5 text-sm rounded-xl transition-all focus:outline-none focus:ring-2 ${
                  isAr ? 'pr-10 pl-4' : 'pl-10 pr-4'
                } ${
                  isDark
                    ? 'bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:ring-blue-500'
                    : 'bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-blue-600'
                }`}
              />
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleLang}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <Globe className="w-5 h-5" />
            </button>
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={onOpenCart}
              style={{ backgroundColor: primaryColor }}
              className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl shadow-md font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAr ? 'أمر الشراء' : 'Purchase Order'}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-black">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Catalog Body: Sidebar + Main Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
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

              {/* Categories */}
              <div className="space-y-1.5 mb-6">
                {categories.map((c) => (
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
                {filteredVariants.map((v) => {
                  const inStock = v.in_stock > 0;
                  return (
                    <div
                      key={v.id}
                      className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
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

                        {/* Product Image */}
                        <div
                          onClick={() => onSelectProduct(v)}
                          className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2.5 cursor-pointer group"
                        >
                          {v.image ? (
                            <img
                              src={v.image}
                              alt={v.model_name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                              <Package className="w-10 h-10" />
                            </div>
                          )}
                          {v.gallery && v.gallery.length > 1 && (
                            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                              +{v.gallery.length}
                            </span>
                          )}
                        </div>

                        {/* Product Title */}
                        <h4
                          onClick={() => onSelectProduct(v)}
                          className="font-extrabold text-base leading-snug cursor-pointer hover:text-blue-600 transition-colors"
                        >
                          {v.model_name}
                        </h4>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isAr ? 'المقاس' : 'Size'}</span>
                            <span className="font-bold">{v.size || 'Standard'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isAr ? 'اللون' : 'Color'}</span>
                            <span className="font-bold">{v.color || 'Standard'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isAr ? 'الحد الأدنى (MOQ)' : 'MOQ'}</span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {isAr ? '1 قطعة' : '1 Piece'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isAr ? 'كود الموديل' : 'Model Code'}</span>
                            <span className="font-mono text-[11px] font-bold">{v.model_code || '---'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Pricing & Order Action */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            {isAr ? 'سعر الجملة والتجزئة' : 'Unit Price'}
                          </span>
                          <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                            {v.price.toFixed(2)}{' '}
                            <span className="text-xs font-semibold text-slate-400">{currency}</span>
                          </span>
                        </div>

                        <button
                          onClick={() => onSelectProduct(v)}
                          disabled={!inStock}
                          style={{ backgroundColor: inStock ? primaryColor : undefined }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
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
      </main>

      {/* Footer */}
      <footer className="py-8 mt-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 text-center sm:text-start flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {storeName} — {isAr ? 'نظام توريدات المصانع GarmentOS' : 'GarmentOS Factory Procurement'}</p>
          <div className="flex items-center gap-4">
            <button onClick={onNavigateToTracking} className="hover:underline">
              {isAr ? 'الاستعلام عن شحنة' : 'Track Order'}
            </button>
            <span>•</span>
            <span>{isAr ? 'الرقم الضريبي وتراخيص التشغيل مسجلة' : 'Registered Commercial Factory'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

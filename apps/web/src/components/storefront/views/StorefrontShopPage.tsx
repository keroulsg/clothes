import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  ShoppingBag,
  Heart,
  Grid3X3,
  LayoutGrid,
  List,
  Check,
  X,
  Package,
  Building2,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';

export const StorefrontShopPage: React.FC = () => {
  const {
    variants,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    addToCart,
    navigateToProduct,
    currency,
    isAr,
    isDark,
    toggleWishlist,
    isInWishlist,
    wholesaleUser,
    setIsCartOpen,
  } = useStorefrontCommerce();

  // Layout view mode
  const [viewMode, setViewMode] = useState<'grid_dense' | 'grid_normal' | 'list'>('grid_normal');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Local filter states
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [selectedColor, setSelectedColor] = useState<string>('all');
  const [priceMax, setPriceMax] = useState<number>(5000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'stock' | 'newest'>('default');

  // Extract unique categories, sizes, colors
  const categories = useMemo(() => {
    return [
      { id: 'all', name_ar: 'كافة التصنيفات', name_en: 'All Categories' },
      { id: 'casual', name_ar: 'ملابس كاجوال', name_en: 'Casual Wear' },
      { id: 'uniform', name_ar: 'زي موحد ويونيفورم', name_en: 'Uniform & Workwear' },
      { id: 'polo', name_ar: 'بولو وقمصان رجالي', name_en: 'Polos & Shirts' },
      { id: 'sportswear', name_ar: 'ملابس رياضية', name_en: 'Sportswear' },
      { id: 'kids', name_ar: 'أطفال وبيبي', name_en: 'Kids & Babies' },
    ];
  }, []);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      if (v.size) set.add(v.size);
    });
    return Array.from(set).length > 0 ? Array.from(set) : ['S', 'M', 'L', 'XL', 'XXL'];
  }, [variants]);

  const allColors = useMemo(() => {
    const set = new Set<string>();
    variants.forEach((v) => {
      if (v.color) set.add(v.color);
    });
    return Array.from(set).length > 0 ? Array.from(set) : ['White', 'Black', 'Navy', 'Grey', 'Red'];
  }, [variants]);

  // Filter & sort logic
  const filteredVariants = useMemo(() => {
    return variants
      .filter((v) => {
        // Search query
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = (v.name || '').toLowerCase().includes(q);
          const matchSku = (v.sku || '').toLowerCase().includes(q);
          const matchColor = (v.color || '').toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchColor) return false;
        }

        // Category filter
        if (selectedCategory && selectedCategory !== 'all') {
          // Check model category or matching keywords
          const text = `${v.name || ''} ${v.description || ''}`.toLowerCase();
          if (selectedCategory === 'casual' && !text.includes('تيشيرت') && !text.includes('shirt') && !text.includes('casual')) return false;
          if (selectedCategory === 'uniform' && !text.includes('يونيفورم') && !text.includes('uniform') && !text.includes('عمل')) return false;
          if (selectedCategory === 'polo' && !text.includes('بولو') && !text.includes('polo')) return false;
        }

        // Size filter
        if (selectedSize !== 'all' && v.size !== selectedSize) {
          return false;
        }

        // Color filter
        if (selectedColor !== 'all' && v.color !== selectedColor) {
          return false;
        }

        // Price filter
        if (v.price > priceMax) {
          return false;
        }

        // Stock only
        if (inStockOnly && (v.in_stock ?? v.stock_quantity ?? 0) <= 0) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'stock') return (b.in_stock ?? 0) - (a.in_stock ?? 0);
        return 0;
      });
  }, [variants, searchQuery, selectedCategory, selectedSize, selectedColor, priceMax, inStockOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSelectedSize('all');
    setSelectedColor('all');
    setPriceMax(5000);
    setInStockOnly(false);
    setSortBy('default');
    setSearchQuery('');
  };

  return (
    <div
      className={`min-h-screen py-8 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'كتالوج المنتجات والأزياء' : 'Shop All Products'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? `عرض ${filteredVariants.length} من إجمالي ${variants.length} منتج جاهز ومصنع بمواصفاتنا القياسية`
                : `Showing ${filteredVariants.length} of ${variants.length} factory-crafted garments`}
            </p>
          </div>

          {/* View mode toggle & Mobile filter trigger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span>{isAr ? 'تصفية النتائج' : 'Filters'}</span>
            </button>

            {/* Sort selector */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="default">{isAr ? 'الترتيب الافتراضي' : 'Default Sorting'}</option>
              <option value="price_asc">{isAr ? 'السعر: من الأقل للأعلى' : 'Price: Low to High'}</option>
              <option value="price_desc">{isAr ? 'السعر: من الأعلى للأقل' : 'Price: High to Low'}</option>
              <option value="stock">{isAr ? 'الأكثر توفراً بالمخزون' : 'Availability / Stock'}</option>
            </select>

            {/* Layout Toggles */}
            <div className="hidden sm:flex items-center border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
              <button
                onClick={() => setViewMode('grid_normal')}
                className={`p-2 transition ${
                  viewMode === 'grid_normal' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View (3 cols)"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid_dense')}
                className={`p-2 transition ${
                  viewMode === 'grid_dense' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Dense Grid (4 cols)"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Catalog Main Layout (Sidebar + Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* FACETED FILTER SIDEBAR (Desktop) */}
          <div className="hidden lg:block space-y-6 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصفية متقدمة' : 'Faceted Filters'}</span>
              </span>
              <button
                onClick={resetFilters}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                {isAr ? 'إعادة ضبط' : 'Reset All'}
              </button>
            </div>

            {/* Categories */}
            <div>
              <h4 className="text-xs font-bold mb-3">{isAr ? 'التصنيفات' : 'Categories'}</h4>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{isAr ? cat.name_ar : cat.name_en}</span>
                    {selectedCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Price Slider */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-2">
                <span>{isAr ? 'أقصى سعر:' : 'Max Price:'}</span>
                <span className="text-blue-600 dark:text-blue-400">
                  {priceMax} {currency}
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Sizes */}
            <div>
              <h4 className="text-xs font-bold mb-2">{isAr ? 'المقاس' : 'Size'}</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedSize('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    selectedSize === 'all'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                {allSizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      selectedSize === sz
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <h4 className="text-xs font-bold mb-2">{isAr ? 'اللون' : 'Color'}</h4>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedColor('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                    selectedColor === 'all'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isAr ? 'الكل' : 'All'}
                </button>
                {allColors.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                      selectedColor === col
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* In Stock Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>{isAr ? 'المتوفر في المخزن فقط' : 'In-Stock Items Only'}</span>
              </label>
            </div>
          </div>

          {/* PRODUCTS GRID (3 Cols of 4) */}
          <div className="lg:col-span-3">
            {filteredVariants.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <Package className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
                  {isAr ? 'لم نعثر على أي منتجات مطابقة للبحث' : 'No matching products found'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr
                    ? 'جرب تقليل معايير التصفية أو البحث عن كلمة دلالية مختلفة.'
                    : 'Try clearing some filters or searching with a different term.'}
                </p>
                <Button
                  variant="outline"
                  className="text-xs rounded-xl mt-2"
                  onClick={resetFilters}
                >
                  {isAr ? 'إلغاء كافة الفلاتر' : 'Clear All Filters'}
                </Button>
              </div>
            ) : (
              <div
                className={`grid gap-5 ${
                  viewMode === 'grid_dense'
                    ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
                    : viewMode === 'list'
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
                }`}
              >
                {filteredVariants.map((item) => {
                  const availableStock = item.in_stock ?? item.stock_quantity ?? 0;
                  const isOutOfStock = availableStock <= 0;

                  return (
                    <div
                      key={item.id}
                      className={`group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex ${
                        viewMode === 'list' ? 'flex-col sm:flex-row' : 'flex-col'
                      }`}
                    >
                      {/* Product Image Area */}
                      <div
                        onClick={() => navigateToProduct(item.id)}
                        className={`bg-slate-100 dark:bg-slate-800 overflow-hidden relative cursor-pointer ${
                          viewMode === 'list' ? 'sm:w-60 aspect-square shrink-0' : 'aspect-[4/5] w-full'
                        }`}
                      >
                        <img
                          src={
                            item.image_url ||
                            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
                          }
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Badges */}
                        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
                          {isOutOfStock ? (
                            <span className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {isAr ? 'نفد' : 'Out of Stock'}
                            </span>
                          ) : availableStock <= 5 ? (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                              {isAr ? `باقي ${availableStock}` : `${availableStock} left`}
                            </span>
                          ) : null}

                          {wholesaleUser?.is_approved && item.moq && item.moq > 1 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                              <Building2 className="w-2.5 h-2.5" />
                              <span>MOQ: {item.moq}</span>
                            </span>
                          )}
                        </div>

                        {/* Floating Wishlist Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWishlist(item.id);
                          }}
                          className={`absolute top-3 end-3 p-2 rounded-full shadow-md backdrop-blur-md transition ${
                            isInWishlist(item.id)
                              ? 'bg-rose-500 text-white'
                              : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-rose-500'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isInWishlist(item.id) ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Info & Add-to-Cart */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span>{item.size || 'Free Size'}</span>
                            <span>{item.color || 'Standard'}</span>
                          </div>

                          <h3
                            onClick={() => navigateToProduct(item.id)}
                            className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 hover:text-blue-600 cursor-pointer transition"
                          >
                            {isAr ? item.name_ar || item.name : item.name}
                          </h3>

                          {/* Wholesale tier summary */}
                          {wholesaleUser?.is_approved && item.wholesale_tiers?.length > 0 && (
                            <div className="mt-1 text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                              {isAr ? 'أسعار جملة مخفضة تبدأ من: ' : 'Bulk tier from: '}
                              {item.wholesale_tiers[item.wholesale_tiers.length - 1].unit_price} {currency}
                            </div>
                          )}
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="text-base font-black text-blue-600 dark:text-blue-400">
                            {item.price.toLocaleString()} {currency}
                          </div>

                          <Button
                            variant="primary"
                            className="text-xs px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 disabled:opacity-50"
                            disabled={isOutOfStock}
                            onClick={() => {
                              const ok = addToCart(item);
                              if (ok) setIsCartOpen(true);
                            }}
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{isAr ? 'إضافة' : 'Add'}</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div
            className={`fixed inset-y-0 max-w-full flex ${isAr ? 'left-0' : 'right-0'}`}
          >
            <div
              className={`w-screen max-w-xs shadow-2xl p-6 flex flex-col justify-between overflow-y-auto ${
                isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'
              }`}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h3 className="font-bold text-sm">{isAr ? 'تصفية المنتجات' : 'Filter Products'}</h3>
                  <button onClick={() => setMobileFilterOpen(false)} className="p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Categories */}
                <div>
                  <h4 className="text-xs font-bold mb-2">{isAr ? 'التصنيف' : 'Category'}</h4>
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setMobileFilterOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium ${
                          selectedCategory === cat.id
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {isAr ? cat.name_ar : cat.name_en}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>{isAr ? 'أقصى سعر:' : 'Max Price:'}</span>
                    <span className="text-blue-600">{priceMax} {currency}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="5000"
                    step="50"
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="primary"
                  className="w-full text-xs py-2.5 rounded-xl font-bold bg-blue-600 text-white"
                  onClick={() => setMobileFilterOpen(false)}
                >
                  {isAr ? 'عرض النتائج' : 'Show Results'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

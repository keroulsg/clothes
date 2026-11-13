import React, { useMemo } from 'react';
import {
  Layers,
  ShoppingBag,
  Heart,
  Package,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';

export const StorefrontCategoryPage: React.FC = () => {
  const {
    variants,
    selectedCategory,
    setSelectedCategory,
    navigateToProduct,
    addToCart,
    currency,
    isAr,
    isDark,
    toggleWishlist,
    isInWishlist,
    setIsCartOpen,
  } = useStorefrontCommerce();

  const categories = [
    {
      id: 'all',
      name_ar: 'كافة التصنيفات',
      name_en: 'All Collections',
      desc_ar: 'استكشف التشكيلة الكاملة لملابس المصنع والملابس الجاهزة والزي الموحد.',
      desc_en: 'Explore the full spectrum of our factory-direct apparel collections.',
      banner_img: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80',
    },
    {
      id: 'casual',
      name_ar: 'ملابس كاجوال يومية',
      name_en: 'Casual Wear',
      desc_ar: 'تيشيرتات وبناطيل قطنية مريحة مصممة للاستخدام اليومي المستمر بأعلى ثبات.',
      desc_en: 'Comfortable cotton tees and casual essentials for daily movement.',
      banner_img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1200&auto=format&fit=crop&q=80',
    },
    {
      id: 'uniform',
      name_ar: 'زي موحد وتوريدات شركات (Uniform)',
      name_en: 'Uniform & Corporate',
      desc_ar: 'توريدات أزياء الشركات والمصانع والمستشفيات مع تطريز وطباعة مخصصة وشروط جملة.',
      desc_en: 'Professional corporate uniform solutions tailored for enterprise teams.',
      banner_img: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200&auto=format&fit=crop&q=80',
    },
    {
      id: 'polo',
      name_ar: 'بولو وقمصان كلاسيك',
      name_en: 'Polos & Oxford Shirts',
      desc_ar: 'بولو قطن بيكيه فائق النعومة مع ياقات متماسكة وتشطيبات إيطالية أنيقة.',
      desc_en: 'Fine piqué cotton polos with structured collars and classic tailoring.',
      banner_img: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=1200&auto=format&fit=crop&q=80',
    },
  ];

  const currentCat = useMemo(
    () => categories.find((c) => c.id === selectedCategory) || categories[0],
    [selectedCategory]
  );

  const categoryProducts = useMemo(() => {
    if (selectedCategory === 'all') return variants;
    return variants.filter((v) => {
      const text = `${v.name || ''} ${v.description || ''}`.toLowerCase();
      if (selectedCategory === 'casual') return text.includes('تيشيرت') || text.includes('shirt') || text.includes('casual');
      if (selectedCategory === 'uniform') return text.includes('يونيفورم') || text.includes('uniform') || text.includes('عمل');
      if (selectedCategory === 'polo') return text.includes('بولو') || text.includes('polo');
      return true;
    });
  }, [variants, selectedCategory]);

  return (
    <div
      className={`min-h-screen py-6 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Category Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl min-h-[220px] sm:min-h-[280px] flex items-center">
          <img
            src={currentCat.banner_img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.35]"
          />
          <div className="relative z-10 p-6 sm:p-10 max-w-2xl text-white space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400">
              <Layers className="w-4 h-4" />
              <span>{isAr ? 'قسم التصنيف' : 'Category Showcase'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
              {isAr ? currentCat.name_ar : currentCat.name_en}
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {isAr ? currentCat.desc_ar : currentCat.desc_en}
            </p>
          </div>
        </div>

        {/* Category Pill Switchers */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              {isAr ? cat.name_ar : cat.name_en}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div>
          {categoryProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <Package className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="font-bold text-base">
                {isAr ? 'لا توجد منتجات مسجلة حالياً في هذا القسم' : 'No items found in this category'}
              </h3>
              <Button
                variant="outline"
                className="text-xs rounded-xl mt-2"
                onClick={() => setSelectedCategory('all')}
              >
                {isAr ? 'عرض كافة المنتجات' : 'View All Products'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {categoryProducts.map((item) => {
                const stock = item.in_stock ?? item.stock_quantity ?? 0;
                const isOutOfStock = stock <= 0;

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div
                      onClick={() => navigateToProduct(item.id)}
                      className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden relative cursor-pointer"
                    >
                      <img
                        src={
                          item.image_url ||
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
                        }
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />

                      {/* Wishlist toggle */}
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

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>{item.size || 'Free Size'}</span>
                          <span>{item.color || 'Standard'}</span>
                        </div>
                        <h4
                          onClick={() => navigateToProduct(item.id)}
                          className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 hover:text-blue-600 cursor-pointer transition"
                        >
                          {isAr ? item.name_ar || item.name : item.name}
                        </h4>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <div className="text-base font-black text-blue-600 dark:text-blue-400">
                          {item.price.toLocaleString()} {currency}
                        </div>
                        <Button
                          variant="primary"
                          className="text-xs px-3 py-1.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                          disabled={isOutOfStock}
                          onClick={() => {
                            const ok = addToCart(item);
                            if (ok) setIsCartOpen(true);
                          }}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{isAr ? 'إضافة' : 'Add'}</span>
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
  );
};

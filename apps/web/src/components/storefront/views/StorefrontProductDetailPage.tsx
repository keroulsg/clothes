import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ShoppingBag,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  Star,
  ChevronDown,
  Building2,
  Package,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';
import { api } from '../../../api/client';

export const StorefrontProductDetailPage: React.FC = () => {
  const {
    selectedProductId,
    variants,
    addToCart,
    currency,
    isAr,
    isDark,
    setActiveView,
    navigateToProduct,
    toggleWishlist,
    isInWishlist,
    wholesaleUser,
    addToast,
    setIsCartOpen,
    storeSettings,
  } = useStorefrontCommerce();

  const themeConfig = storeSettings?.theme_config || {};
  const productPageConfig = themeConfig.product_page || {};

  // Find the current product variant
  const product = useMemo(
    () => variants.find((v) => v.id === selectedProductId) || variants[0],
    [variants, selectedProductId]
  );

  // Group other variants sharing the same product / model
  const siblingVariants = useMemo(() => {
    if (!product) return [];
    return variants.filter(
      (v) => (v.model_id && v.model_id === product.model_id) || v.name === product.name
    );
  }, [variants, product]);

  // Gallery state
  const images = useMemo(() => {
    const rawImage = product?.image_url || product?.image;
    if (Array.isArray(product?.gallery) && product.gallery.length > 0) {
      return product.gallery.map((g: any) => api.getMediaUrl(g.url || g));
    }
    if (rawImage) {
      const full = api.getMediaUrl(rawImage);
      return [full, full, full];
    }
    return [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
    ];
  }, [product]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(product?.size || 'Standard');
  const [selectedColor, setSelectedColor] = useState<string>(product?.color || 'Standard');

  // Accordion tabs state
  const [openTab, setOpenTab] = useState<'details' | 'materials' | 'size_guide' | 'shipping'>('details');

  // Quantity stepper
  const effectiveMoq = wholesaleUser?.is_approved ? product?.moq || 1 : 1;
  const [quantity, setQuantity] = useState<number>(effectiveMoq);

  // Related products
  const relatedProducts = useMemo(() => {
    return variants.filter((v) => v.id !== product?.id).slice(0, 4);
  }, [variants, product]);

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
        <Package className="w-12 h-12 text-slate-400 mb-3" />
        <h3 className="text-lg font-bold">{isAr ? 'المنتج غير موجود' : 'Product Not Found'}</h3>
        <Button
          variant="primary"
          className="mt-4 text-xs rounded-xl"
          onClick={() => setActiveView('shop')}
        >
          {isAr ? 'العودة لجميع المنتجات' : 'Back to Shop'}
        </Button>
      </div>
    );
  }

  const availableStock = product.in_stock ?? product.stock_quantity ?? 0;
  const isOutOfStock = availableStock <= 0;

  // Wholesale tier price resolution
  let unitPrice = product.price;
  let activeTierDiscount = 0;
  if (wholesaleUser?.is_approved && product.wholesale_tiers?.length > 0) {
    const matchedTier = [...product.wholesale_tiers]
      .filter((t: any) => quantity >= t.min_quantity)
      .sort((a: any, b: any) => b.min_quantity - a.min_quantity)[0];
    if (matchedTier) {
      unitPrice = matchedTier.unit_price;
      activeTierDiscount = Math.round(((product.price - unitPrice) / product.price) * 100);
    }
  }

  const handleAddToCart = () => {
    const success = addToCart(product, quantity);
    if (success) {
      setIsCartOpen(true);
    }
  };

  const handleBuyNow = () => {
    const success = addToCart(product, quantity);
    if (success) {
      setActiveView('checkout');
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast(isAr ? 'تم نسخ رابط المنتج إلى الحافظة' : 'Product link copied to clipboard', 'info');
    }
  };

  return (
    <div
      className={`min-h-screen py-6 sm:py-10 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => setActiveView('home')}
            className="hover:text-blue-600 transition"
          >
            {isAr ? 'الرئيسية' : 'Home'}
          </button>
          <span>/</span>
          <button
            onClick={() => setActiveView('shop')}
            className="hover:text-blue-600 transition"
          >
            {isAr ? 'المتجر' : 'Shop'}
          </button>
          <span>/</span>
          <span className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-xs">
            {isAr ? product.name_ar || product.name : product.name}
          </span>
        </nav>

        {/* Product Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT: GALLERY & IMAGES (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Main Stage Image */}
            <div className="aspect-[4/5] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl relative group">
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Badges Overlay */}
              <div className="absolute top-4 start-4 flex flex-col gap-2">
                {isOutOfStock ? (
                  <span className="bg-rose-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                    {isAr ? 'نفد من المخزون' : 'Out of Stock'}
                  </span>
                ) : availableStock <= 5 ? (
                  <span className="bg-amber-500 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                    {isAr ? `متبقي ${availableStock} قطع فقط!` : `Only ${availableStock} left!`}
                  </span>
                ) : (
                  <span className="bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                    {isAr ? 'متوفر وجاهز للشحن' : 'In Stock & Ready'}
                  </span>
                )}

                {wholesaleUser?.is_approved && product.moq && product.moq > 1 && (
                  <span className="bg-blue-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    <span>MOQ: {product.moq} pcs</span>
                  </span>
                )}
              </div>

              {/* Wishlist floating toggle */}
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-4 end-4 p-2.5 rounded-full shadow-md backdrop-blur-md transition ${
                  isInWishlist(product.id)
                    ? 'bg-rose-500 text-white'
                    : 'bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-rose-500'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Thumbnail Carousel */}
            <div className="grid grid-cols-4 gap-3">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden border-2 transition ${
                    activeImageIndex === idx
                      ? 'border-blue-600 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: PRODUCT INFO & PURCHASE CONTROLS (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="font-mono">{product.sku ? `SKU: ${product.sku}` : ''}</span>
                <button
                  onClick={handleShare}
                  className="hover:text-blue-600 flex items-center gap-1 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مشاركة' : 'Share'}</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {isAr ? product.name_ar || product.name : product.name}
              </h1>

              {/* Customer Rating Summary */}
              {productPageConfig.show_ratings !== false && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {productPageConfig.rating_score || '5.0'}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({isAr
                      ? `${productPageConfig.reviews_count || 28} تقييم موثق من المشترين`
                      : `${productPageConfig.reviews_count || 28} verified reviews`})
                  </span>
                </div>
              )}
            </div>

            {/* Price Block */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {unitPrice.toLocaleString()} {currency}
                </span>

                {activeTierDiscount > 0 && (
                  <>
                    <span className="text-base text-slate-400 line-through">
                      {product.price.toLocaleString()} {currency}
                    </span>
                    <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full">
                      {isAr ? `وفرت ${activeTierDiscount}% بالجملة!` : `Save ${activeTierDiscount}% bulk!`}
                    </span>
                  </>
                )}
              </div>

              {/* Wholesale Tier Breakdown Table if B2B user */}
              {wholesaleUser?.is_approved && product.wholesale_tiers?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'جدول شرائح أسعار الجملة للتاجر:' : 'Wholesale Volume Pricing Table:'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {product.wholesale_tiers.map((tier: any, i: number) => {
                      const isCurrent = quantity >= tier.min_quantity;
                      return (
                        <div
                          key={i}
                          className={`p-2 rounded-xl border transition ${
                            isCurrent
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-[11px]">{tier.min_quantity}+ pcs</div>
                          <div className="text-sm font-black mt-0.5">
                            {tier.unit_price} {currency}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Variant Selectors (Size & Color) */}
            <div className="space-y-4">
              {/* Color Swatches */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {isAr ? 'اللون المختار:' : 'Selected Color:'}{' '}
                  <span className="text-slate-900 dark:text-white font-semibold">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {siblingVariants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedColor(v.color || 'Standard');
                        navigateToProduct(v.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        v.id === product.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shadow-sm ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {v.color || 'Standard'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Pills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isAr ? 'المقاس المختار:' : 'Selected Size:'}{' '}
                    <span className="text-slate-900 dark:text-white font-semibold">{selectedSize}</span>
                  </label>
                  <button
                    onClick={() => setOpenTab('size_guide')}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    {isAr ? 'دليل المقاسات' : 'Size Guide'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      className={`min-w-[44px] h-11 px-3 rounded-xl text-xs font-bold border transition ${
                        selectedSize === sz
                          ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quantity Stepper & Add to Cart Actions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {/* Stepper */}
                <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 h-12">
                  <button
                    onClick={() => setQuantity(Math.max(effectiveMoq, quantity - 1))}
                    disabled={quantity <= effectiveMoq || isOutOfStock}
                    className="px-3.5 h-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    -
                  </button>
                  <span className="px-4 text-sm font-bold min-w-[40px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                    disabled={quantity >= availableStock || isOutOfStock}
                    className="px-3.5 h-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <Button
                  variant="primary"
                  className="flex-1 h-12 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isOutOfStock
                      ? isAr
                        ? 'المنتج غير متوفر'
                        : 'Out of Stock'
                      : isAr
                      ? 'إضافة إلى السلة'
                      : 'Add to Cart'}
                  </span>
                </Button>
              </div>

              {/* Instant Buy Now Button */}
              {!isOutOfStock && (
                <button
                  onClick={handleBuyNow}
                  className="w-full h-12 rounded-xl text-sm font-bold border-2 border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center justify-center gap-2"
                >
                  <span>{isAr ? 'شراء فوري مباشر' : 'Buy Now with 1-Click'}</span>
                  <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Quality & Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{isAr ? 'توصيل لباب المنزل في مصر' : 'Doorstep Egyptian Delivery'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>{isAr ? 'ضمان استبدال خلال 14 يوم' : '14-Day Free Exchange'}</span>
              </div>
            </div>

            {/* Product Tabs Accordion */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900">
              {/* Tab 1: Specifications */}
              <div>
                <button
                  onClick={() => setOpenTab(openTab === 'details' ? ('' as any) : 'details')}
                  className="w-full p-4 flex items-center justify-between font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span>{isAr ? 'تفاصيل ومواصفات الموديل' : 'Details & Specifications'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openTab === 'details' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openTab === 'details' && (
                  <div className="p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <p className="whitespace-pre-line">
                      {product.description || (isAr
                        ? 'تم تصميم هذا المنتج وخياطته في مصانعنا باستخدام أجود خامات القطن المصري طويل التيلة مع مراعاة أعلى معايير ضبط الجودة وثبات الألوان ومقاومة الانكماش بعد الغسيل.'
                        : 'Expertly tailored at our manufacturing facilities using premium Egyptian combed cotton, engineered for durability, colorfastness, and shrinkage resistance.')}
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                      <div>
                        <strong>{isAr ? 'كود الموديل:' : 'Model Code:'}</strong> {product.sku || 'N/A'}
                      </div>
                      <div>
                        <strong>{isAr ? 'التصنيف:' : 'Category:'}</strong> {typeof product.category === 'string' ? product.category : product.category?.name || (isAr ? 'ملابس جاهزة' : 'Ready-to-Wear')}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab 2: Materials & Care */}
              <div>
                <button
                  onClick={() => setOpenTab(openTab === 'materials' ? ('' as any) : 'materials')}
                  className="w-full p-4 flex items-center justify-between font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span>{isAr ? 'إرشادات الغسيل والعناية' : 'Fabric Composition & Care'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openTab === 'materials' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openTab === 'materials' && (
                  <div className="p-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 space-y-1">
                    {productPageConfig.care_instructions_ar && isAr ? (
                      <p className="whitespace-pre-line">{productPageConfig.care_instructions_ar}</p>
                    ) : productPageConfig.care_instructions_en && !isAr ? (
                      <p className="whitespace-pre-line">{productPageConfig.care_instructions_en}</p>
                    ) : (
                      <>
                        <p>• {isAr ? '95% قطن مصري ممتاز، 5% ليكرا مرنة' : '95% Premium Egyptian Cotton, 5% Elastane'}</p>
                        <p>• {isAr ? 'غسيل آلي في ماء بارد (30 درجة مئوية)' : 'Machine wash cold (30°C)'}</p>
                        <p>• {isAr ? 'تجنب استخدام مبيضات الكلور للحفاظ على الألوان' : 'Do not bleach'}</p>
                        <p>• {isAr ? 'الكي على درجة حرارة متوسطة من الداخل' : 'Iron on medium heat inside out'}</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Tab 3: Size Guide */}
              <div>
                <button
                  onClick={() => setOpenTab(openTab === 'size_guide' ? ('' as any) : 'size_guide')}
                  className="w-full p-4 flex items-center justify-between font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                >
                  <span>{isAr ? 'جدول المقاسات القياسي (سم)' : 'Size Guide Chart (cm)'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${openTab === 'size_guide' ? 'rotate-180' : ''}`}
                  />
                </button>
                {openTab === 'size_guide' && (
                  <div className="p-4 text-xs border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <th className="p-2 border">{isAr ? 'المقاس' : 'Size'}</th>
                          <th className="p-2 border">{isAr ? 'محيط الصدر' : 'Chest'}</th>
                          <th className="p-2 border">{isAr ? 'الطول' : 'Length'}</th>
                          <th className="p-2 border">{isAr ? 'الكتف' : 'Shoulder'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-2 border font-bold">S</td>
                          <td className="p-2 border">98 cm</td>
                          <td className="p-2 border">68 cm</td>
                          <td className="p-2 border">42 cm</td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold">M</td>
                          <td className="p-2 border">104 cm</td>
                          <td className="p-2 border">70 cm</td>
                          <td className="p-2 border">44 cm</td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold">L</td>
                          <td className="p-2 border">110 cm</td>
                          <td className="p-2 border">72 cm</td>
                          <td className="p-2 border">46 cm</td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold">XL</td>
                          <td className="p-2 border">116 cm</td>
                          <td className="p-2 border">74 cm</td>
                          <td className="p-2 border">48 cm</td>
                        </tr>
                        <tr>
                          <td className="p-2 border font-bold">XXL</td>
                          <td className="p-2 border">122 cm</td>
                          <td className="p-2 border">76 cm</td>
                          <td className="p-2 border">50 cm</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {isAr ? 'منتجات ذات صلة قد تعجبك' : 'Related Products You May Like'}
              </h3>
              <button
                onClick={() => setActiveView('shop')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isAr ? 'عرض الكل' : 'View All'}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((rel) => (
                <div
                  key={rel.id}
                  onClick={() => navigateToProduct(rel.id)}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer group"
                >
                  <div className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                    <img
                      src={
                        (rel.image_url || rel.image)
                          ? api.getMediaUrl(rel.image_url || rel.image)
                          : 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
                      }
                      alt={rel.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                      {isAr ? rel.name_ar || rel.name : rel.name}
                    </h4>
                    <div className="text-sm font-black text-blue-600 dark:text-blue-400 mt-1">
                      {rel.price} {currency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

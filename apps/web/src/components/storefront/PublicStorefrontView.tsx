import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Package,
  Search,
  CheckCircle,
  Truck,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Sparkles,
  Baby,
  Crown,
  Layers,
  Sun,
  Moon,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, StorefrontThemeId } from '../../types';

interface PublicStorefrontViewProps {
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  tenantIdentifier?: string;
  onNavigateToTracking: (orderNumber?: string, phone?: string) => void;
  onNavigateToErp?: () => void;
}

interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  available_stock: number;
}

export const PublicStorefrontView: React.FC<PublicStorefrontViewProps> = ({
  lang,
  onToggleLang,
  isDark,
  onToggleTheme,
  tenantIdentifier,
  onNavigateToTracking,
  onNavigateToErp,
}) => {
  const isAr = lang === 'ar';
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Store data from backend
  const [storeSettings, setStoreSettings] = useState<any | null>(null);
  const [tenantInfo, setTenantInfo] = useState<any | null>(null);
  const [variants, setVariants] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Shopping Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState(isAr ? 'القاهرة' : 'Cairo');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay'>('cod');
  const [instapayRef, setInstapayRef] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Completed Order Modal
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);

  const fetchStoreData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const activeTenant = tenantIdentifier || 'msnaa-aldlta-llmlabs-algahz-429';
      const res = await api.storefront.getPublicStore(activeTenant);
      if (res) {
        setStoreSettings(res.store_settings);
        setTenantInfo(res.tenant);
        setVariants(res.products || res.catalog?.variants || res.variants || []);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر تحميل بيانات المتجر' : 'Failed to load storefront'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [tenantIdentifier]);

  // Compute shipping fee authoritatively
  const calculateEstimatedShipping = (city: string, subtotal: number): number => {
    if (subtotal >= 1500) return 0;
    const c = city.toLowerCase().trim();
    if (['cairo', 'giza', 'القاهرة', 'الجيزة', 'أكتوبر', 'زايد'].some((kw) => c.includes(kw))) return 50;
    if (['alexandria', 'الإسكندرية', 'طنطا', 'المنصورة', 'بورسعيد'].some((kw) => c.includes(kw))) return 60;
    if (['أسوان', 'الأقصر', 'الغردقة', 'قنا', 'سوهاج'].some((kw) => c.includes(kw))) return 80;
    return 50;
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const shippingFee = calculateEstimatedShipping(custCity, cartSubtotal);
  const cartTotal = cartSubtotal + shippingFee;

  const handleAddToCart = (variant: any) => {
    const price = Number(variant.price ?? variant.retail_price ?? 250);
    const available = Number(variant.in_stock ?? variant.available_quantity ?? variant.current_balance ?? 99);

    setCart((prev) => {
      const existing = prev.find((i) => i.variant_id === variant.id);
      if (existing) {
        if (existing.quantity >= available) return prev;
        return prev.map((i) =>
          i.variant_id === variant.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          variant_id: variant.id,
          product_name: variant.model_name || variant.garment_model?.name || variant.sku,
          sku: variant.sku,
          size: variant.size?.name || variant.size_name || variant.size || 'L',
          color: variant.color?.name || variant.color_name || variant.color || 'Navy',
          quantity: 1,
          unit_price: price,
          available_stock: available,
        },
      ];
    });

    setIsCartOpen(true);
  };

  const handleUpdateCartQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id === variantId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.available_stock) return item;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((i) => i.variant_id !== variantId));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!custName.trim() || !custPhone.trim() || !custAddress.trim()) {
      setCheckoutError(isAr ? 'يرجى إكمال بيانات الاسم والهاتف وعنوان التوصيل' : 'Please fill all required fields');
      return;
    }

    if (paymentMethod === 'instapay' && !instapayRef.trim()) {
      setCheckoutError(isAr ? 'يرجى إدخال الرقم المرجعي لعملية تحويل InstaPay' : 'Please enter InstaPay reference number');
      return;
    }

    setIsPlacingOrder(true);
    setCheckoutError(null);

    const orderPayload = {
      customer_name: custName.trim(),
      customer_phone: custPhone.trim(),
      shipping_address: custAddress.trim(),
      city: custCity,
      payment_method: paymentMethod,
      instapay_reference: paymentMethod === 'instapay' ? instapayRef.trim() : null,
      shipping_fee: shippingFee,
      items: cart.map((i) => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: i.unit_price,
      })),
    };

    try {
      const res = await api.storefront.placePublicOrder(orderPayload, tenantIdentifier);
      if (res?.order) {
        setConfirmedOrder(res.order);
        setCart([]);
        setIsCheckoutOpen(false);
      }
    } catch (err: any) {
      setCheckoutError(err?.message || (isAr ? 'فشل تسجيل الطلب، يرجى المحاولة لاحقاً' : 'Failed to place order'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const activeTheme: StorefrontThemeId = storeSettings?.theme_id || 'modern_fashion';

  // Filter products
  const filteredVariants = variants.filter((v) => {
    const name = (v.model_name || v.garment_model?.name || v.sku || '').toLowerCase();
    const matchesSearch = !searchQuery || name.includes(searchQuery.toLowerCase()) || (v.sku && v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === 'all' ||
      (v.garment_model?.category || '').toLowerCase() === selectedCategory.toLowerCase() ||
      name.includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-medium text-sm">
          {isAr ? 'جاري تجهيز متجر المصنع...' : 'Loading factory storefront...'}
        </p>
      </div>
    );
  }

  if (errorMsg || !storeSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {isAr ? 'المتجر غير متاح حالياً' : 'Storefront Unavailable'}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          {errorMsg || (isAr ? 'المتجر الإلكتروني المطلوب غير موجود أو غير مفعل.' : 'Store not found.')}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {isAr ? 'إعادة المحاولة' : 'Try Again'}
        </Button>
      </div>
    );
  }

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen transition-colors ${
        activeTheme === 'premium_brand'
          ? 'bg-[#09090b] text-zinc-100'
          : activeTheme === 'kids_baby'
          ? 'bg-[#fffdfa] text-slate-900 dark:bg-[#120f0d] dark:text-slate-100'
          : 'bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100'
      }`}
    >
      {/* 1. TOP ANNOUNCEMENT & BRAND NAVIGATION */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs ${
                activeTheme === 'kids_baby'
                  ? 'bg-amber-500'
                  : activeTheme === 'premium_brand'
                  ? 'bg-zinc-800 border border-amber-500/40 text-amber-400'
                  : activeTheme === 'wholesale_uniform'
                  ? 'bg-blue-600'
                  : 'bg-primary'
              }`}
            >
              {activeTheme === 'kids_baby' ? (
                <Baby className="w-6 h-6" />
              ) : activeTheme === 'premium_brand' ? (
                <Crown className="w-6 h-6" />
              ) : activeTheme === 'wholesale_uniform' ? (
                <Layers className="w-6 h-6" />
              ) : (
                <Sparkles className="w-6 h-6" />
              )}
            </div>

            <div>
              <h1 className="font-bold text-base sm:text-lg leading-tight line-clamp-1">
                {storeSettings.store_name || tenantInfo?.name || (isAr ? 'متجر المصنع المباشر' : 'Factory Direct Store')}
              </h1>
              <span className="text-[11px] text-slate-400 block font-medium">
                {isAr ? 'بيع مباشر من خط الإنتاج بدون وسيط' : 'Direct from Factory Production Lines'}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTracking()}
              className="text-xs hidden sm:inline-flex"
            >
              <Truck className="w-3.5 h-3.5 me-1" />
              {isAr ? 'تتبع شحنتك' : 'Track Order'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCartOpen(true)}
              className="relative"
            >
              <ShoppingBag className="w-4 h-4 me-1.5" />
              <span>{isAr ? 'السلة' : 'Cart'}</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -end-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </span>
              )}
            </Button>

            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onToggleLang}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300"
            >
              {isAr ? 'EN' : 'عربي'}
            </button>

            {onNavigateToErp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateToErp}
                className="text-xs text-slate-400 hover:text-primary hidden md:inline-flex"
              >
                {isAr ? 'بوابة إدارة المصنع' : 'Factory Portal'}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 2. THEMATIC HERO BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          className={`rounded-3xl p-8 sm:p-12 shadow-md relative overflow-hidden ${
            activeTheme === 'kids_baby'
              ? 'bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 text-white'
              : activeTheme === 'premium_brand'
              ? 'bg-gradient-to-r from-zinc-950 via-neutral-900 to-stone-900 text-amber-300 border border-amber-500/30'
              : activeTheme === 'wholesale_uniform'
              ? 'bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white'
              : 'bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white'
          }`}
        >
          <div className="max-w-2xl relative z-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3">
              {activeTheme === 'kids_baby'
                ? (isAr ? 'قطن مصري 100% ناعم وصحي' : '100% Pure Egyptian Cotton')
                : activeTheme === 'premium_brand'
                ? (isAr ? 'تشكيلة الملابس الفاخرة والتصدير' : 'Luxury Haute Couture & Export')
                : activeTheme === 'wholesale_uniform'
                ? (isAr ? 'أسعار الجملة وتوريدات المصانع والشركات' : 'B2B Wholesale & Commercial Supply')
                : (isAr ? 'أزياء عصرية بأفضل خامات الخياطة' : 'Contemporary High-End Apparel')}
            </span>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              {storeSettings.banner_title || (isAr ? 'منتجات المصنع الفاخرة مباشرة ليدك' : 'Factory Direct High Quality Garments')}
            </h2>

            <p className="mt-3 text-sm sm:text-base opacity-90 leading-relaxed">
              {storeSettings.banner_subtitle ||
                (isAr
                  ? 'تسوق أحدث خطوط الإنتاج بأعلى معايير الجودة الدولية والدفع عند الاستلام أو عبر InstaPay.'
                  : 'Shop factory direct production lines with strict quality inspection and fast delivery.')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/40"
                onClick={() => {
                  const el = document.getElementById('catalog-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {isAr ? 'استعراض التشكيلة كاملة' : 'Explore Catalog'}
                <ArrowRight className="w-4 h-4 ms-1.5" />
              </Button>

              <button
                onClick={() => onNavigateToTracking()}
                className="text-xs font-semibold underline underline-offset-4 opacity-90 hover:opacity-100 py-2 px-3"
              >
                {isAr ? 'لديك طلب بالفعل؟ تتبع شحنتك هنا' : 'Already ordered? Track shipment here'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SEARCH, FILTERS & PRODUCT GRID */}
      <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute start-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث باسم الموديل أو كود SKU...' : 'Search garments by name or SKU...'}
              className="w-full ps-9 pe-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            {['all', 'polo', 'tshirt', 'hoodie', 'kids', 'uniform'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                }`}
              >
                {cat === 'all'
                  ? (isAr ? 'كافة المنتجات' : 'All')
                  : cat === 'polo'
                  ? (isAr ? 'بولو' : 'Polo')
                  : cat === 'kids'
                  ? (isAr ? 'أطفال' : 'Kids')
                  : cat.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredVariants.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 dark:text-slate-300">
              {isAr ? 'لا توجد منتجات مطابقة للبحث' : 'No matching products found'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'جرب البحث بكلمات أخرى أو عرض كافة الفئات' : 'Try searching with different terms'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredVariants.map((v) => {
              const price = Number(v.price ?? v.retail_price ?? 250);
              const inStock = Number(v.in_stock ?? v.available_quantity ?? v.current_balance ?? 10) > 0;

              return (
                <Card
                  key={v.id}
                  className={`p-4 transition-all flex flex-col justify-between ${
                    activeTheme === 'kids_baby'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl hover:shadow-md'
                      : activeTheme === 'premium_brand'
                      ? 'bg-zinc-900 border border-amber-500/20 hover:border-amber-500/60 rounded-xl shadow-sm text-zinc-100'
                      : activeTheme === 'wholesale_uniform'
                      ? 'bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-lg'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:shadow-lg'
                  }`}
                >
                  <div>
                    {/* Visual Placeholder / Mock Garment Image */}
                    <div
                      className={`h-40 rounded-xl flex items-center justify-center relative overflow-hidden mb-3 ${
                        activeTheme === 'kids_baby'
                          ? 'bg-amber-100/70 text-amber-600 dark:bg-amber-900/40'
                          : activeTheme === 'premium_brand'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Package className="w-14 h-14 stroke-[1.2]" />

                      {/* Theme Specific Badges */}
                      {activeTheme === 'kids_baby' && (
                        <span className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                          {isAr ? 'قطن طبيعي آمن' : 'Natural Cotton'}
                        </span>
                      )}

                      {activeTheme === 'wholesale_uniform' && (
                        <span className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-xs">
                          MOQ: 20 pcs
                        </span>
                      )}

                      {activeTheme === 'premium_brand' && (
                        <span className="absolute top-2 start-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          {isAr ? 'خياطة تصدير' : 'Export Grade'}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm line-clamp-1">
                      {v.model_name || v.garment_model?.name || v.sku}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{isAr ? 'المقاس:' : 'Size:'} {v.size?.name || v.size_name || v.size || 'L'}</span>
                      <span>•</span>
                      <span>{isAr ? 'اللون:' : 'Color:'} {v.color?.name || v.color_name || v.color || 'Navy'}</span>
                    </div>

                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      SKU: {v.sku}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر' : 'Price'}</span>
                      <span className="font-black text-base text-primary">
                        {price.toLocaleString()} {tenantInfo?.currency || 'ج.م'}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!inStock}
                      onClick={() => handleAddToCart(v)}
                    >
                      <Plus className="w-3.5 h-3.5 me-1" />
                      {inStock ? (isAr ? 'أضف للسلة' : 'Add') : (isAr ? 'نفذت الكمية' : 'Sold Out')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. CART DRAWER / MODAL */}
      <Modal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        title={isAr ? `سلة مشترياتك (${cart.length})` : `Shopping Cart (${cart.length})`}
      >
        <div className="space-y-4">
          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">{isAr ? 'سلة الشراء فارغة' : 'Your cart is empty'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.variant_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{item.product_name}</h4>
                    <p className="text-slate-400 mt-0.5">
                      {item.size} • {item.color} • {item.unit_price.toLocaleString()} {tenantInfo?.currency || 'ج.م'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                      <button
                        onClick={() => handleUpdateCartQty(item.variant_id, -1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold font-mono">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateCartQty(item.variant_id, 1)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-bold text-primary w-20 text-end">
                      {(item.quantity * item.unit_price).toLocaleString()} {tenantInfo?.currency || 'ج.م'}
                    </span>

                    <button
                      onClick={() => handleRemoveFromCart(item.variant_id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-bold">{cartSubtotal.toLocaleString()} {tenantInfo?.currency || 'ج.م'}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>{isAr ? 'الشحن التقديري:' : 'Estimated Shipping:'}</span>
                <span>{shippingFee === 0 ? (isAr ? 'شحن مجاني' : 'Free') : `${shippingFee} ${tenantInfo?.currency || 'ج.م'}`}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{isAr ? 'الإجمالي الكلي:' : 'Total:'}</span>
                <span className="text-primary font-black">
                  {cartTotal.toLocaleString()} {tenantInfo?.currency || 'ج.م'}
                </span>
              </div>

              <Button
                variant="primary"
                className="w-full mt-4"
                onClick={() => {
                  setIsCartOpen(false);
                  setIsCheckoutOpen(true);
                }}
              >
                {isAr ? 'متابعة الدفع وإنهاء الطلب' : 'Proceed to Checkout'}
                <ArrowRight className="w-4 h-4 ms-1.5" />
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* 5. CHECKOUT MODAL */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title={isAr ? 'إتمام طلب الشراء والشحن' : 'Checkout & Shipping'}
      >
        <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
          {checkoutError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {checkoutError}
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">{isAr ? 'الاسم بالكامل' : 'Full Name'}</label>
            <input
              type="text"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder={isAr ? 'أحمد محمد' : 'Customer Name'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">{isAr ? 'رقم الهاتف (للتواصل والشحن)' : 'Phone Number'}</label>
              <input
                type="tel"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">{isAr ? 'المحافظة / المدينة' : 'City / Governorate'}</label>
              <select
                value={custCity}
                onChange={(e) => setCustCity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value={isAr ? 'القاهرة' : 'Cairo'}>{isAr ? 'القاهرة الكبرى' : 'Cairo'}</option>
                <option value={isAr ? 'الجيزة' : 'Giza'}>{isAr ? 'الجيزة وأكتوبر' : 'Giza & October'}</option>
                <option value={isAr ? 'الإسكندرية' : 'Alexandria'}>{isAr ? 'الإسكندرية والساحل' : 'Alexandria'}</option>
                <option value={isAr ? 'المنصورة' : 'Mansoura'}>{isAr ? 'الدقهلية والمنصورة' : 'Mansoura'}</option>
                <option value={isAr ? 'طنطا' : 'Tanta'}>{isAr ? 'الغربية وطنطا' : 'Tanta'}</option>
                <option value={isAr ? 'أسوان' : 'Aswan'}>{isAr ? 'الصعيد وأسوان' : 'Upper Egypt & Aswan'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">{isAr ? 'عنوان الشحن بالتفصيل' : 'Detailed Delivery Address'}</label>
            <textarea
              rows={2}
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              placeholder={isAr ? 'الشارع، رقم العمارة، الشقة، وأقرب علامة مميزة' : 'Street name, building, apartment'}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              required
            />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block font-semibold mb-1.5">{isAr ? 'طريقة السداد المعتمدة' : 'Payment Method'}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cod')}
                className={`p-3 rounded-xl border text-start transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold">{isAr ? 'الدفع عند الاستلام' : 'Cash on Delivery'}</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isAr ? 'سداد القيمة نقداً لمندوب الشحن عند المعاينة' : 'Pay in cash upon arrival'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('instapay')}
                className={`p-3 rounded-xl border text-start transition-all ${
                  paymentMethod === 'instapay'
                    ? 'border-purple-600 ring-2 ring-purple-600/20 bg-purple-50 dark:bg-purple-950/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <QrCode className="w-4 h-4 text-purple-600" />
                  <span className="font-bold">InstaPay</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isAr ? 'تحويل لحظي مباشر لحساب المصنع' : 'Instant bank transfer'}
                </p>
              </button>
            </div>
          </div>

          {/* InstaPay Instructions & Input */}
          {paymentMethod === 'instapay' && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-800 dark:text-purple-300 font-semibold">{isAr ? 'معرف InstaPay:' : 'Handle:'}</span>
                <span className="font-mono font-bold text-purple-950 dark:text-purple-100">{storeSettings.instapay_handle || 'factory@instapay'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-purple-800 dark:text-purple-300">{isAr ? 'المستفيد:' : 'Beneficiary:'}</span>
                <span className="font-semibold">{storeSettings.instapay_account_name || 'Garment Factory Operations'}</span>
              </div>
              <p className="text-[11px] text-purple-700 dark:text-purple-400">
                {storeSettings.instapay_instructions || (isAr ? 'يرجى تحويل المبلغ ثم إدخال رقم العملية المرجعي لتأكيد وتدقيق الشحن.' : 'Transfer total and enter reference ID.')}
              </p>

              <div>
                <label className="block font-bold text-[11px] text-purple-900 dark:text-purple-200 mb-1">
                  {isAr ? 'الرقم المرجعي للتحويل (Reference ID)' : 'InstaPay Reference ID'}
                </label>
                <input
                  type="text"
                  value={instapayRef}
                  onChange={(e) => setInstapayRef(e.target.value)}
                  placeholder="IPN20261027XXXX"
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 font-mono text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          {/* Totals Summary */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'قيمة المنتجات:' : 'Subtotal:'}</span>
              <span>{cartSubtotal.toLocaleString()} {tenantInfo?.currency || 'ج.م'}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'تكلفة الشحن والتوصيل:' : 'Shipping:'}</span>
              <span>{shippingFee === 0 ? (isAr ? 'مجاني' : 'Free') : `${shippingFee} ${tenantInfo?.currency || 'ج.م'}`}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>{isAr ? 'المبلغ الإجمالي المستحق:' : 'Total Payable:'}</span>
              <span className="text-primary font-black">{cartTotal.toLocaleString()} {tenantInfo?.currency || 'ج.م'}</span>
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={isPlacingOrder} className="w-full mt-2">
            {isPlacingOrder ? (isAr ? 'جاري تأكيد الطلب...' : 'Placing Order...') : (isAr ? 'تأكيد الطلب وشحن الشحنة' : 'Confirm Order & Ship')}
          </Button>
        </form>
      </Modal>

      {/* 6. ORDER CONFIRMED MODAL */}
      <Modal
        isOpen={!!confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        title={isAr ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!'}
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'شكراً لثقتكم بمصنعنا!' : 'Thank you for your order!'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? 'تم تسجيل طلب الشراء وحجز القطع من خط الإنتاج وسيتم التواصل معكم لتأكيد موعد التسليم.'
                : 'Your order is recorded and items are reserved from inventory.'}
            </p>
          </div>

          {confirmedOrder && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-start space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'رقم الطلب للتتبع:' : 'Order Number:'}</span>
                <span className="font-mono font-bold text-primary">{confirmedOrder.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'الإجمالي الكلي:' : 'Total Amount:'}</span>
                <span className="font-bold">{Number(confirmedOrder.total_amount).toLocaleString()} {tenantInfo?.currency || 'ج.م'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{isAr ? 'طريقة السداد:' : 'Payment:'}</span>
                <span className="font-semibold uppercase">{confirmedOrder.payment_method}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                const orderNum = confirmedOrder.order_number;
                const custPhoneNum = confirmedOrder.customer_phone;
                setConfirmedOrder(null);
                onNavigateToTracking(orderNum, custPhoneNum);
              }}
            >
              <Truck className="w-4 h-4 me-1.5" />
              {isAr ? 'متابعة وتتبع خط سير الشحنة' : 'Track Order Progress'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setConfirmedOrder(null)}
            >
              {isAr ? 'متابعة التسوق' : 'Continue Shopping'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

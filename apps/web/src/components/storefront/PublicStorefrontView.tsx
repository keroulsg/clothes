import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  CheckCircle,
  Truck,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language } from '../../types';
import { FashionBoutiqueTemplate } from './templates/FashionBoutiqueTemplate';
import { ModernCatalogTemplate } from './templates/ModernCatalogTemplate';
import { KidsFamilyTemplate } from './templates/KidsFamilyTemplate';
import { PremiumBrandTemplate } from './templates/PremiumBrandTemplate';

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
  const [isPreview, setIsPreview] = useState(false);

  // Selected Product Details & Gallery Quick View Modal
  const [selectedProductDetails, setSelectedProductDetails] = useState<any | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);

  const fetchStoreData = async () => {
    if (!tenantIdentifier) {
      setStoreSettings(null);
      setTenantInfo(null);
      setVariants([]);
      setErrorMsg(isAr
        ? 'رابط المتجر غير مكتمل. افتح رابط المتجر المخصص من لوحة المصنع.'
        : 'Store URL is incomplete. Open the tenant-specific storefront link from the factory dashboard.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const isPreviewRequested =
        window.location.hash.includes('preview=1') || window.location.search.includes('preview=1');
      const res = await api.storefront.getPublicStore(tenantIdentifier, isPreviewRequested);
      if (res) {
        let settings = res.store_settings;
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        const themeOverride = urlParams.get('theme_override') || hashParams.get('theme_override');
        if (themeOverride && settings) {
          settings = { ...settings, theme_id: themeOverride };
        }
        setStoreSettings(settings);
        setTenantInfo(res.tenant);
        setVariants(res.products || res.catalog?.variants || res.variants || []);
        setIsPreview(Boolean(res.is_preview || isPreviewRequested));
      }
    } catch (err: any) {
      if (window.location.search.includes('mock_audit=1') || window.location.hash.includes('mock_audit=1')) {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
        const themeOverride = urlParams.get('theme_override') || hashParams.get('theme_override') || 'fashion_boutique';
        setStoreSettings({
          id: 'mock-1',
          store_name: isAr ? 'مصنع الدلتا للملابس الجاهزة' : 'Delta Apparel Factory',
          theme_id: themeOverride as any,
          theme_config: {
            primary_color:
              themeOverride === 'premium_brand'
                ? '#d97706'
                : themeOverride === 'kids_family'
                ? '#f97316'
                : themeOverride === 'modern_catalog'
                ? '#2563eb'
                : '#0284c7',
            announcement_bar_text: isAr
              ? '✨ شحن سريع ومجاني للطلبات فوق 1,000 ج.م في جميع المحافظات 🚚'
              : '✨ Fast & Free shipping on orders over 1,000 EGP nationwide 🚚',
          },
          is_store_enabled: true,
          allow_cod: true,
          allow_instapay: true,
          instapay_handle: 'delta@instapay',
          currency: 'EGP',
        });
        setTenantInfo({ name: isAr ? 'مصنع الدلتا للملابس الجاهزة' : 'Delta Apparel Factory', subdomain: 'delta-store' });
        setVariants([
          { id: '1', sku: 'POLO-EG-01', model_name: isAr ? 'قميص بولو قطن مصري فاخر' : 'Premium Egyptian Cotton Polo', price: 350, in_stock: 45, size: 'L', color: isAr ? 'كحلي' : 'Navy' },
          { id: '2', sku: 'TSH-CL-02', model_name: isAr ? 'تيشيرت كاجوال قطن 100%' : '100% Pure Cotton Casual T-Shirt', price: 220, in_stock: 80, size: 'M', color: isAr ? 'أبيض' : 'White' },
          { id: '3', sku: 'PNT-DN-03', model_name: isAr ? 'بنطلون جينز تصدير فائق المرونة' : 'Export Stretch Denim Jeans', price: 480, in_stock: 25, size: '34', color: isAr ? 'أزرق داكن' : 'Dark Blue' },
          { id: '4', sku: 'KID-BL-04', model_name: isAr ? 'سالوبيت أطفال قطن طبيعي ناعم' : 'Soft Natural Baby Bodysuit', price: 180, in_stock: 35, size: '2Y', color: isAr ? 'مشمشي' : 'Peach' },
        ]);
        setIsPreview(window.location.search.includes('preview=1') || window.location.hash.includes('preview=1'));
        setErrorMsg(null);
        return;
      }
      setErrorMsg(
        err?.message ||
          (isAr
            ? `تعذر العثور على متجر المصنع المطلوب (${tenantIdentifier}) أو أن المتجر غير مفعل حالياً.`
            : `Failed to load storefront for (${tenantIdentifier}).`)
      );
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

  const normalizedTheme = (() => {
    const raw = (storeSettings?.theme_id || '').toLowerCase();
    if (raw === 'fashion_boutique' || raw === 'modern_fashion') return 'fashion_boutique';
    if (raw === 'modern_catalog' || raw === 'wholesale_uniform') return 'modern_catalog';
    if (raw === 'kids_family' || raw === 'kids_baby') return 'kids_family';
    if (raw === 'premium_brand') return 'premium_brand';
    return 'fashion_boutique';
  })();

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
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              window.location.hash = '#/';
            }}
          >
            {isAr ? 'العودة لموقع GarmentOS الرئيسي' : 'Go to GarmentOS Official Home'}
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {isAr ? 'إعادة المحاولة' : 'Try Again'}
          </Button>
        </div>
      </div>
    );
  }

  const templateProps = {
    lang,
    isDark,
    storeSettings,
    tenantInfo,
    variants: filteredVariants,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
    onOpenCart: () => setIsCartOpen(true),
    onSelectProduct: (v: any) => {
      setSelectedProductDetails(v);
      setActiveGalleryIndex(0);
    },
    onNavigateToTracking: (num?: string, phone?: string) => onNavigateToTracking(num, phone),
    onNavigateToErp,
    onToggleTheme,
    onToggleLang,
    isPreview,
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen">
      {/* Live Preview Mode Banner */}
      {isPreview && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-xs font-black flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-amber-500">
          <div className="flex items-center gap-2">
            <span className="bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
              {isAr ? 'وضع المعاينة الحية' : 'Live Preview Mode'}
            </span>
            <span>
              {isAr
                ? 'أنت تستعرض الآن مسودة التصميم الحالية للمتجر. التعديلات غير مرئية للعملاء حتى يتم نشرها من استوديو التصميم.'
                : 'You are viewing the unpublished design draft. Changes remain hidden from visitors until published.'}
            </span>
          </div>
          {onNavigateToErp && (
            <button
              onClick={onNavigateToErp}
              className="text-slate-950 underline font-extrabold hover:text-white transition-colors cursor-pointer"
            >
              {isAr ? 'العودة للاستوديو' : 'Return to Studio'}
            </button>
          )}
        </div>
      )}

      {/* Dynamic Storefront Template */}
      {normalizedTheme === 'modern_catalog' ? (
        <ModernCatalogTemplate {...templateProps} />
      ) : normalizedTheme === 'kids_family' ? (
        <KidsFamilyTemplate {...templateProps} />
      ) : normalizedTheme === 'premium_brand' ? (
        <PremiumBrandTemplate {...templateProps} />
      ) : (
        <FashionBoutiqueTemplate {...templateProps} />
      )}

      {/* 3.5. PRODUCT DETAILS & GALLERY MODAL */}
      {selectedProductDetails && (
        <Modal
          isOpen={!!selectedProductDetails}
          onClose={() => {
            setSelectedProductDetails(null);
            setActiveGalleryIndex(0);
          }}
          title={isAr ? selectedProductDetails.model_name : (selectedProductDetails.model_name_en || selectedProductDetails.model_name)}
          maxWidth="lg"
        >
          {(() => {
            const rawGallery = selectedProductDetails.gallery;
            const galleryUrls: string[] = (Array.isArray(rawGallery) && rawGallery.length > 0)
              ? rawGallery.map((g: any) => (typeof g === 'string' ? g : g.url)).filter(Boolean)
              : (selectedProductDetails.image ? [selectedProductDetails.image] : []);
            const activeImage = galleryUrls[activeGalleryIndex] || galleryUrls[0] || selectedProductDetails.image;
            const inStock = selectedProductDetails.in_stock > 0;

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Gallery Viewer */}
                  <div className="w-full sm:w-64 flex flex-col items-center gap-2 shrink-0">
                    <div className="w-full aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative">
                      {activeImage ? (
                        <img
                          src={activeImage}
                          alt={selectedProductDetails.model_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                          }}
                        />
                      ) : (
                        <span className="text-5xl opacity-40 select-none">👕</span>
                      )}

                      {inStock && (
                        <span className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                          {isAr ? 'متوفر' : 'In Stock'}
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Strip */}
                    {galleryUrls.length > 1 && (
                      <div className="flex items-center gap-2 overflow-x-auto max-w-full p-1">
                        {galleryUrls.map((url, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveGalleryIndex(idx)}
                            className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                              activeGalleryIndex === idx
                                ? 'border-primary ring-2 ring-primary/20 scale-105'
                                : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Gallery thumb ${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Product Details & Actions */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
                        <span>SKU: {selectedProductDetails.sku}</span>
                        {selectedProductDetails.model_code && (
                          <span>• {selectedProductDetails.model_code}</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                        {selectedProductDetails.model_name}
                      </h3>
                    </div>

                    <div className="text-2xl font-black text-primary font-mono">
                      {Number(selectedProductDetails.price).toLocaleString()} <span className="text-sm font-normal text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>

                    {/* Specs Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      {selectedProductDetails.size && (
                        <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 ml-1">{isAr ? 'المقاس:' : 'Size:'}</span>
                          <span className="font-bold">{selectedProductDetails.size}</span>
                        </div>
                      )}
                      {selectedProductDetails.color && (
                        <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          <span className="text-slate-400 ml-1">{isAr ? 'اللون:' : 'Color:'}</span>
                          <span className="font-bold">{selectedProductDetails.color}</span>
                        </div>
                      )}
                      <div className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono">
                        <span className="text-slate-400 ml-1">{isAr ? 'الرصيد المتاح:' : 'Stock:'}</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedProductDetails.in_stock}</span>
                      </div>
                    </div>

                    {selectedProductDetails.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-2 leading-relaxed">
                        {selectedProductDetails.description}
                      </p>
                    )}

                    <div className="pt-4 flex items-center gap-3">
                      <Button
                        size="md"
                        variant="primary"
                        onClick={() => {
                          handleAddToCart(selectedProductDetails);
                          setSelectedProductDetails(null);
                        }}
                        disabled={!inStock}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md shadow-primary/20"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>{inStock ? (isAr ? 'إضافة إلى سلة الشراء' : 'Add to Shopping Cart') : (isAr ? 'المنتج غير متوفر حالياً' : 'Out of Stock')}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

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
                      {item.size} • {item.color} • {item.unit_price.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
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
                      {(item.quantity * item.unit_price).toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
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
                <span className="font-bold">{cartSubtotal.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
              </div>

              <div className="flex justify-between text-xs text-slate-500">
                <span>{isAr ? 'الشحن التقديري:' : 'Estimated Shipping:'}</span>
                <span>{shippingFee === 0 ? (isAr ? 'شحن مجاني' : 'Free') : `${shippingFee} ${tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}`}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>{isAr ? 'الإجمالي الكلي:' : 'Total:'}</span>
                <span className="text-primary font-black">
                  {cartTotal.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
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
              <span>{cartSubtotal.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>{isAr ? 'تكلفة الشحن والتوصيل:' : 'Shipping:'}</span>
              <span>{shippingFee === 0 ? (isAr ? 'مجاني' : 'Free') : `${shippingFee} ${tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}`}</span>
            </div>
            <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
              <span>{isAr ? 'المبلغ الإجمالي المستحق:' : 'Total Payable:'}</span>
              <span className="text-primary font-black">{cartTotal.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
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
                <span className="font-bold">{Number(confirmedOrder.total_amount).toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
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

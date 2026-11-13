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
  Building2,
  Lock,
  UserCheck,
  Briefcase,
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
  moq?: number;
  wholesale_tiers?: Array<{ min_quantity: number; unit_price: number }>;
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

  // Wholesale state & persistence
  const [wholesaleToken, setWholesaleToken] = useState<string>(() => {
    try {
      return localStorage.getItem('garmentos_wholesale_token') || '';
    } catch {
      return '';
    }
  });
  const [wholesaleUser, setWholesaleUser] = useState<any | null>(null);
  const [isWholesaleModalOpen, setIsWholesaleModalOpen] = useState(false);
  const [wholesaleTab, setWholesaleTab] = useState<'login' | 'register'>('login');
  const [wholesaleLoginEmailOrPhone, setWholesaleLoginEmailOrPhone] = useState('');
  const [wholesaleLoginPassword, setWholesaleLoginPassword] = useState('');
  const [wholesaleRegForm, setWholesaleRegForm] = useState({
    company_name: '',
    business_type: 'retail_store',
    contact_person: '',
    phone: '',
    email: '',
    password: '',
    commercial_register: '',
    tax_id: '',
    city: isAr ? 'القاهرة' : 'Cairo',
    address: '',
    notes: '',
  });
  const [wholesaleAuthLoading, setWholesaleAuthLoading] = useState(false);
  const [wholesaleAuthError, setWholesaleAuthError] = useState<string | null>(null);
  const [wholesaleAuthSuccess, setWholesaleAuthSuccess] = useState<string | null>(null);

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
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const fetchStoreData = async (tokenOverride?: string) => {
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
      const activeToken = tokenOverride !== undefined ? tokenOverride : wholesaleToken;
      const res = await api.storefront.getPublicStore(tenantIdentifier, isPreviewRequested, activeToken || undefined);
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

        if (res.customer) {
          setWholesaleUser(res.customer);
          if (res.customer.name && !custName) setCustName(res.customer.name);
          if (res.customer.phone && !custPhone) setCustPhone(res.customer.phone);
          if (res.customer.address && !custAddress) setCustAddress(res.customer.address);
          if (res.customer.city && !custCity) setCustCity(res.customer.city);
        } else if (!activeToken) {
          setWholesaleUser(null);
        }
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
          { id: '1', sku: 'POLO-EG-01', model_name: isAr ? 'قميص بولو قطن مصري فاخر' : 'Premium Egyptian Cotton Polo', price: 350, in_stock: 45, size: 'L', color: isAr ? 'كحلي' : 'Navy', is_wholesale_eligible: true },
          { id: '2', sku: 'TSH-CL-02', model_name: isAr ? 'تيشيرت كاجوال قطن 100%' : '100% Pure Cotton Casual T-Shirt', price: 220, in_stock: 80, size: 'M', color: isAr ? 'أبيض' : 'White', is_wholesale_eligible: true },
          { id: '3', sku: 'PNT-DN-03', model_name: isAr ? 'بنطلون جينز تصدير فائق المرونة' : 'Export Stretch Denim Jeans', price: 480, in_stock: 25, size: '34', color: isAr ? 'أزرق داكن' : 'Dark Blue', is_wholesale_eligible: true },
          { id: '4', sku: 'KID-BL-04', model_name: isAr ? 'سالوبيت أطفال قطن طبيعي ناعم' : 'Soft Natural Baby Bodysuit', price: 180, in_stock: 35, size: '2Y', color: isAr ? 'مشمشي' : 'Peach', is_wholesale_eligible: true },
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

  // Check wholesale profile on mount if token exists
  useEffect(() => {
    if (wholesaleToken && tenantIdentifier) {
      api.storefront.getWholesaleProfile(wholesaleToken, tenantIdentifier)
        .then((res) => {
          if (res?.customer) {
            setWholesaleUser(res.customer);
            if (res.customer.name && !custName) setCustName(res.customer.name);
            if (res.customer.phone && !custPhone) setCustPhone(res.customer.phone);
            if (res.customer.address && !custAddress) setCustAddress(res.customer.address);
            if (res.customer.city && !custCity) setCustCity(res.customer.city);
          }
        })
        .catch(() => {
          try {
            localStorage.removeItem('garmentos_wholesale_token');
          } catch {}
          setWholesaleToken('');
          setWholesaleUser(null);
        });
    }
  }, [wholesaleToken, tenantIdentifier]);
  // Wholesale Authentication Handlers
  const handleWholesaleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setWholesaleAuthError(null);
    setWholesaleAuthSuccess(null);
    setWholesaleAuthLoading(true);
    try {
      const res = await api.storefront.loginWholesale(
        {
          email_or_phone: wholesaleLoginEmailOrPhone.trim(),
          password: wholesaleLoginPassword,
        },
        tenantIdentifier
      );
      if (res?.token) {
        try {
          localStorage.setItem('garmentos_wholesale_token', res.token);
        } catch {}
        setWholesaleToken(res.token);
        setWholesaleUser(res.customer);
        if (res.customer?.name) setCustName(res.customer.name);
        if (res.customer?.phone) setCustPhone(res.customer.phone);
        if (res.customer?.address) setCustAddress(res.customer.address);
        if (res.customer?.city) setCustCity(res.customer.city);

        if (res.customer?.is_approved) {
          setWholesaleAuthSuccess(isAr ? 'تم تسجيل الدخول بنجاح! تم تفعيل أسعار وخصومات الجملة المعتمدة.' : 'Logged in successfully! Wholesale pricing activated.');
          setTimeout(() => {
            setIsWholesaleModalOpen(false);
            setWholesaleAuthSuccess(null);
          }, 1000);
          await fetchStoreData(res.token);
        } else {
          setWholesaleAuthSuccess(
            isAr
              ? `حسابكم مسجل بحالة (${res.customer?.status === 'rejected' ? 'مرفوض' : res.customer?.status === 'suspended' ? 'موقوف مؤقتاً' : 'قيد المراجعة'}). أسعار الجملة تتطلب اعتماد إدارة المصنع.`
              : `Your account is ${res.customer?.status}. Wholesale pricing requires factory approval.`
          );
        }
      }
    } catch (err: any) {
      setWholesaleAuthError(err?.message || (isAr ? 'فشل تسجيل الدخول، يرجى التحقق من بيانات الحساب.' : 'Login failed.'));
    } finally {
      setWholesaleAuthLoading(false);
    }
  };

  const handleWholesaleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setWholesaleAuthError(null);
    setWholesaleAuthSuccess(null);
    setWholesaleAuthLoading(true);
    try {
      const res = await api.storefront.registerWholesale(
        {
          company_name: wholesaleRegForm.company_name.trim(),
          business_type: wholesaleRegForm.business_type,
          contact_person: wholesaleRegForm.contact_person.trim(),
          phone: wholesaleRegForm.phone.trim(),
          email: wholesaleRegForm.email.trim(),
          password: wholesaleRegForm.password,
          commercial_register: wholesaleRegForm.commercial_register.trim() || null,
          tax_id: wholesaleRegForm.tax_id.trim() || null,
          city: wholesaleRegForm.city,
          address: wholesaleRegForm.address.trim(),
          notes: wholesaleRegForm.notes.trim() || null,
        },
        tenantIdentifier
      );
      if (res?.success) {
        setWholesaleAuthSuccess(
          isAr
            ? 'تم استلام طلب اعتماد حساب الجملة بنجاح! الطلب قيد المراجعة والتدقيق من إدارة المصنع وسيتواصل معكم فريق المبيعات فور الاعتماد.'
            : 'Wholesale application submitted! Awaiting factory review and approval.'
        );
        if (res.token) {
          try {
            localStorage.setItem('garmentos_wholesale_token', res.token);
          } catch {}
          setWholesaleToken(res.token);
          setWholesaleUser(res.customer);
        }
      }
    } catch (err: any) {
      setWholesaleAuthError(err?.message || (isAr ? 'فشل إرسال طلب الاعتماد، يرجى التأكد من ملء الحقول المطلوبة.' : 'Registration failed.'));
    } finally {
      setWholesaleAuthLoading(false);
    }
  };

  const handleLogoutWholesale = async () => {
    try {
      localStorage.removeItem('garmentos_wholesale_token');
    } catch {}
    setWholesaleToken('');
    setWholesaleUser(null);
    await fetchStoreData('');
  };

  // Compute dynamic unit price based on volume tiers
  const resolveItemUnitPrice = (item: { quantity: number; unit_price: number; wholesale_tiers?: any[] }) => {
    if (item.wholesale_tiers && item.wholesale_tiers.length > 0) {
      const sorted = [...item.wholesale_tiers].sort((a, b) => Number(b.min_quantity) - Number(a.min_quantity));
      const matched = sorted.find((t) => item.quantity >= Number(t.min_quantity));
      if (matched) return Number(matched.unit_price);
    }
    return item.unit_price;
  };

  // Compute shipping fee authoritatively
  const calculateEstimatedShipping = (city: string, subtotal: number): number => {
    if (subtotal >= 1500) return 0;
    const c = city.toLowerCase().trim();
    if (['cairo', 'giza', 'القاهرة', 'الجيزة', 'أكتوبر', 'زايد'].some((kw) => c.includes(kw))) return 50;
    if (['alexandria', 'الإسكندرية', 'طنطا', 'المنصورة', 'بورسعيد'].some((kw) => c.includes(kw))) return 60;
    if (['أسوان', 'الأقصر', 'الغردقة', 'قنا', 'سوهاج'].some((kw) => c.includes(kw))) return 80;
    return 50;
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * resolveItemUnitPrice(item), 0);
  const shippingFee = calculateEstimatedShipping(custCity, cartSubtotal);
  const cartTotal = cartSubtotal + shippingFee;

  const handleAddToCart = (variant: any, requestedQty?: number) => {
    const isWholesaleActive = Boolean(wholesaleUser?.is_approved && variant.is_wholesale);
    const moq = isWholesaleActive ? Number(variant.moq || 1) : 1;
    const initialQty = requestedQty && requestedQty >= moq ? requestedQty : Math.max(1, moq);
    const price = Number(variant.price ?? variant.retail_price ?? 250);
    const available = Number(variant.in_stock ?? variant.available_quantity ?? variant.current_balance ?? 99);

    setCart((prev) => {
      const existing = prev.find((i) => i.variant_id === variant.id);
      if (existing) {
        const nextQty = existing.quantity + (requestedQty || 1);
        if (nextQty > available) return prev;
        return prev.map((i) =>
          i.variant_id === variant.id ? { ...i, quantity: nextQty } : i
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
          quantity: initialQty,
          unit_price: price,
          available_stock: available,
          moq: isWholesaleActive ? moq : 1,
          wholesale_tiers: isWholesaleActive ? (variant.wholesale_tiers || []) : [],
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
            if (item.moq && item.moq > 1 && nextQty < item.moq && delta < 0) {
              return null; // Remove item if reduced below MOQ
            }
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

    const isWholesaleCheckout = Boolean(wholesaleUser?.is_approved);

    // Validate MOQs for wholesale orders
    if (isWholesaleCheckout) {
      for (const item of cart) {
        if (item.moq && item.quantity < item.moq) {
          setCheckoutError(
            isAr
              ? `الصنف (${item.product_name}) يتطلب حداً أدنى للطلب ${item.moq} قطعة.`
              : `Item (${item.product_name}) requires minimum order of ${item.moq} pcs.`
          );
          return;
        }
      }
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
      channel: isWholesaleCheckout ? 'wholesale' : 'retail',
      wholesale_token: isWholesaleCheckout ? (wholesaleToken || undefined) : undefined,
      items: cart.map((i) => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: resolveItemUnitPrice(i),
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
      const isWholesaleActive = Boolean(wholesaleUser?.is_approved && v.is_wholesale);
      setSelectedQty(isWholesaleActive && v.moq ? Math.max(1, v.moq) : 1);
    },
    onNavigateToTracking: (num?: string, phone?: string) => onNavigateToTracking(num, phone),
    onNavigateToErp,
    onToggleTheme,
    onToggleLang,
    isPreview,
    wholesaleUser,
    onOpenWholesaleModal: () => {
      setWholesaleAuthError(null);
      setWholesaleAuthSuccess(null);
      setIsWholesaleModalOpen(true);
    },
    onLogoutWholesale: handleLogoutWholesale,
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

                    {/* Wholesale status & Volume Tiers */}
                    {wholesaleUser?.is_approved && selectedProductDetails.is_wholesale ? (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <UserCheck className="w-4 h-4 text-emerald-600" />
                            {isAr ? 'أسعار الجملة المعتمدة' : 'Approved Wholesale Price'}
                          </span>
                          {selectedProductDetails.moq && selectedProductDetails.moq > 1 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold font-mono">
                              MOQ: {selectedProductDetails.moq} {isAr ? 'قطعة' : 'pcs'}
                            </span>
                          )}
                        </div>

                        {selectedProductDetails.wholesale_tiers && selectedProductDetails.wholesale_tiers.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 block">
                              {isAr ? 'جدول شرائح الخصم حسب الكمية:' : 'Volume Pricing Tiers:'}
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-center text-[11px]">
                              {selectedProductDetails.wholesale_tiers.map((tier: any, idx: number) => (
                                <div
                                  key={idx}
                                  className={`p-1.5 rounded-lg border ${
                                    selectedQty >= tier.min_quantity
                                      ? 'bg-emerald-100 dark:bg-emerald-900/50 border-emerald-400 font-bold text-emerald-900 dark:text-emerald-200'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div>+{tier.min_quantity} {isAr ? 'قطعة' : 'pcs'}</div>
                                  <div className="font-mono font-black">{Number(tier.unit_price).toFixed(2)} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedProductDetails.is_wholesale_eligible ? (
                      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="font-bold text-blue-900 dark:text-blue-200 block flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                            {isAr ? 'أسعار وخصومات خاصة لتجار الجملة' : 'Special Wholesale & B2B Tiers'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isAr ? 'سجل كتاجر أو سجل دخولك للاستفادة من أسعار التوريدات المباشرة.' : 'Sign in or apply for trade pricing.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductDetails(null);
                            setWholesaleAuthError(null);
                            setWholesaleAuthSuccess(null);
                            setIsWholesaleModalOpen(true);
                          }}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 transition-colors"
                        >
                          {isAr ? 'بوابة الجملة' : 'B2B Login'}
                        </button>
                      </div>
                    ) : null}

                    {/* Quantity Picker for Details Modal */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {isAr ? 'الكمية المطلوبة:' : 'Quantity:'}
                      </span>
                      <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                        <button
                          type="button"
                          onClick={() => {
                            const minAllowed = wholesaleUser?.is_approved && selectedProductDetails.is_wholesale && selectedProductDetails.moq ? selectedProductDetails.moq : 1;
                            setSelectedQty((prev) => Math.max(minAllowed, prev - 1));
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-10 text-center font-bold font-mono text-sm">{selectedQty}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const maxStock = selectedProductDetails.in_stock || 999;
                            setSelectedQty((prev) => Math.min(maxStock, prev + 1));
                          }}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <Button
                        size="md"
                        variant="primary"
                        onClick={() => {
                          handleAddToCart(selectedProductDetails, selectedQty);
                          setSelectedProductDetails(null);
                        }}
                        disabled={!inStock}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold shadow-md shadow-primary/20"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        <span>
                          {inStock
                            ? isAr
                              ? `إضافة إلى سلة الشراء (${selectedQty} قطعة)`
                              : `Add ${selectedQty} Pcs to Cart`
                            : isAr
                            ? 'المنتج غير متوفر حالياً'
                            : 'Out of Stock'}
                        </span>
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
        title={
          wholesaleUser?.is_approved
            ? isAr
              ? `سلة طلبيات الجملة والتوريدات (${cart.length})`
              : `Wholesale Purchase Cart (${cart.length})`
            : isAr
            ? `سلة مشترياتك (${cart.length})`
            : `Shopping Cart (${cart.length})`
        }
      >
        <div className="space-y-4">
          {wholesaleUser?.is_approved && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs flex items-center justify-between">
              <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                {isAr ? `تاجر جملة معتمد: ${wholesaleUser.company_name}` : `Trade Account: ${wholesaleUser.company_name}`}
              </span>
              <span className="text-[10px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-full font-bold">
                B2B WHOLESALE
              </span>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">{isAr ? 'سلة الشراء فارغة' : 'Your cart is empty'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {cart.map((item) => {
                const effectiveUnitPrice = resolveItemUnitPrice(item);
                const isTierApplied = effectiveUnitPrice < item.unit_price;
                return (
                  <div key={item.variant_id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{item.product_name}</span>
                        {item.moq && item.moq > 1 && (
                          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
                            MOQ: {item.moq}
                          </span>
                        )}
                      </h4>
                      <p className="text-slate-400 mt-0.5">
                        {item.size} • {item.color} • {effectiveUnitPrice.toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
                        {isTierApplied && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold ms-1">
                            ({isAr ? 'سعر شريحة الجملة' : 'Tier Price'})
                          </span>
                        )}
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

                      <span className="font-bold text-primary w-24 text-end">
                        {(item.quantity * effectiveUnitPrice).toLocaleString()} {tenantInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
                      </span>

                      <button
                        onClick={() => handleRemoveFromCart(item.variant_id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
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
                {wholesaleUser?.is_approved
                  ? (isAr ? 'متابعة أمر توريد الجملة' : 'Proceed to Wholesale Checkout')
                  : (isAr ? 'متابعة الدفع وإنهاء الطلب' : 'Proceed to Checkout')}
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
        title={
          wholesaleUser?.is_approved
            ? isAr
              ? 'إتمام أمر توريد الجملة والشحن'
              : 'Wholesale Purchase Order Checkout'
            : isAr
            ? 'إتمام طلب الشراء والشحن'
            : 'Checkout & Shipping'
        }
      >
        <form onSubmit={handlePlaceOrder} className="space-y-4 text-xs">
          {wholesaleUser?.is_approved && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>{isAr ? 'قناة البيع: طلب توريد جملة (Wholesale)' : 'Sales Channel: Wholesale B2B'}</span>
                <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-mono">B2B INVOICE</span>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                {isAr
                  ? `الشركة: ${wholesaleUser.company_name} • المسؤول: ${wholesaleUser.contact_person}`
                  : `Company: ${wholesaleUser.company_name} • Rep: ${wholesaleUser.contact_person}`}
              </p>
            </div>
          )}

          {checkoutError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {checkoutError}
            </div>
          )}

          <div>
            <label className="block font-semibold mb-1">
              {wholesaleUser?.is_approved ? (isAr ? 'اسم الشركة / المسؤول' : 'Company / Contact Person') : (isAr ? 'الاسم بالكامل' : 'Full Name')}
            </label>
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
            <label className="block font-semibold mb-1">{isAr ? 'عنوان الشحن بالتفصيل (أو عنوان المستودع)' : 'Detailed Delivery / Warehouse Address'}</label>
            <textarea
              rows={2}
              value={custAddress}
              onChange={(e) => setCustAddress(e.target.value)}
              placeholder={isAr ? 'الشارع، رقم المقر/المستودع، وأقرب علامة مميزة' : 'Street name, building, warehouse'}
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
            {isPlacingOrder
              ? (isAr ? 'جاري تأكيد الطلب...' : 'Placing Order...')
              : wholesaleUser?.is_approved
              ? (isAr ? 'تأكيد أمر توريد الجملة' : 'Confirm Wholesale Order')
              : (isAr ? 'تأكيد الطلب وشحن الشحنة' : 'Confirm Order & Ship')}
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
              {confirmedOrder?.order_type === 'wholesale'
                ? isAr
                  ? 'تم تسجيل أمر توريد الجملة وحجز الرصيد من المستودع وسيتم التواصل لإصدار الفاتورة الضريبية وتنسيق التسليم.'
                  : 'Wholesale order registered and inventory reserved.'
                : isAr
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
                <span className="text-slate-500">{isAr ? 'نوع الطلب:' : 'Order Channel:'}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                  {confirmedOrder.order_type === 'wholesale' ? (isAr ? 'توريد جملة (Wholesale)' : 'Wholesale') : (isAr ? 'قطاعي (Retail)' : 'Retail')}
                </span>
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

      {/* 7. WHOLESALE PORTAL MODAL (LOGIN & REGISTRATION) */}
      <Modal
        isOpen={isWholesaleModalOpen}
        onClose={() => {
          setIsWholesaleModalOpen(false);
          setWholesaleAuthError(null);
          setWholesaleAuthSuccess(null);
        }}
        title={isAr ? 'بوابة تجار الجملة والتوريدات التجارية (B2B)' : 'Wholesale Trade Portal (B2B)'}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {/* Header tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setWholesaleTab('login');
                setWholesaleAuthError(null);
                setWholesaleAuthSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                wholesaleTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل دخول حساب الجملة' : 'Wholesale Login'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWholesaleTab('register');
                setWholesaleAuthError(null);
                setWholesaleAuthSuccess(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                wholesaleTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{isAr ? 'طلب اعتماد تاجر جديد' : 'Apply for Trade Account'}</span>
            </button>
          </div>

          {/* Feedback messages */}
          {wholesaleAuthError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
              {wholesaleAuthError}
            </div>
          )}
          {wholesaleAuthSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200">
              {wholesaleAuthSuccess}
            </div>
          )}

          {/* Tab 1: Login */}
          {wholesaleTab === 'login' && (
            <form onSubmit={handleWholesaleLogin} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">{isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone'}</label>
                <input
                  type="text"
                  value={wholesaleLoginEmailOrPhone}
                  onChange={(e) => setWholesaleLoginEmailOrPhone(e.target.value)}
                  placeholder={isAr ? 'merchant@example.com أو 010XXXXXXXX' : 'email or phone'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">{isAr ? 'كلمة المرور' : 'Password'}</label>
                <input
                  type="password"
                  value={wholesaleLoginPassword}
                  onChange={(e) => setWholesaleLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-500 text-[11px] leading-relaxed">
                {isAr
                  ? '🔒 تمنح بوابة تجار الجملة الوصول إلى أسعار التوريدات المباشرة من المصنع، شرائح الخصم حسب الكميات، وجدولة طلبيات الإنتاج.'
                  : 'Direct factory pricing, volume discounts and purchase order scheduling for authorized businesses.'}
              </div>

              <Button type="submit" variant="primary" disabled={wholesaleAuthLoading} className="w-full">
                {wholesaleAuthLoading ? (isAr ? 'جاري التحقق...' : 'Checking...') : (isAr ? 'تسجيل الدخول' : 'Sign In')}
              </Button>
            </form>
          )}

          {/* Tab 2: Register Application */}
          {wholesaleTab === 'register' && (
            <form onSubmit={handleWholesaleRegister} className="space-y-3 max-h-96 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'اسم الشركة / المعرض / المحل *' : 'Company Name *'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.company_name}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, company_name: e.target.value })}
                    placeholder={isAr ? 'شركة النور للأزياء' : 'Company Name'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'نوع النشاط التجاري *' : 'Business Type *'}</label>
                  <select
                    value={wholesaleRegForm.business_type}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, business_type: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="retail_store">{isAr ? 'محل / متجر تجزئة' : 'Retail Store'}</option>
                    <option value="chain_stores">{isAr ? 'سلسلة متاجر' : 'Store Chain'}</option>
                    <option value="wholesale_distributor">{isAr ? 'موزع جملة' : 'Wholesale Distributor'}</option>
                    <option value="corporate_buyer">{isAr ? 'شركة توريدات / يونيفورم' : 'Corporate / Uniform'}</option>
                    <option value="online_store">{isAr ? 'متجر إلكتروني' : 'Online Store'}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'اسم المسؤول / المفوض *' : 'Contact Person *'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.contact_person}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, contact_person: e.target.value })}
                    placeholder={isAr ? 'محمد إبراهيم' : 'Contact Person'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'رقم الهاتف للتواصل *' : 'Phone Number *'}</label>
                  <input
                    type="tel"
                    value={wholesaleRegForm.phone}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'البريد الإلكتروني *' : 'Email Address *'}</label>
                  <input
                    type="email"
                    value={wholesaleRegForm.email}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, email: e.target.value })}
                    placeholder="merchant@example.com"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'كلمة المرور للحساب *' : 'Account Password *'}</label>
                  <input
                    type="password"
                    value={wholesaleRegForm.password}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'رقم السجل التجاري' : 'Commercial Registration'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.commercial_register}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, commercial_register: e.target.value })}
                    placeholder="CR-12345"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'الرقم الضريبي' : 'Tax ID'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.tax_id}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, tax_id: e.target.value })}
                    placeholder="TAX-67890"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'المحافظة / المدينة' : 'City'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.city}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, city: e.target.value })}
                    placeholder={isAr ? 'القاهرة' : 'Cairo'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">{isAr ? 'عنوان المعرض أو المستودع' : 'Warehouse / Store Address'}</label>
                  <input
                    type="text"
                    value={wholesaleRegForm.address}
                    onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, address: e.target.value })}
                    placeholder={isAr ? 'المنطقة الصناعية، عمارة 12' : 'Address'}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">{isAr ? 'ملاحظات أو حجم التوريد الشهري المتوقع' : 'Notes / Estimated Monthly Volume'}</label>
                <textarea
                  rows={2}
                  value={wholesaleRegForm.notes}
                  onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, notes: e.target.value })}
                  placeholder={isAr ? 'توريدات دورية لـ 3 فروع ملابس رجالي' : 'Notes'}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <Button type="submit" variant="primary" disabled={wholesaleAuthLoading} className="w-full mt-2">
                {wholesaleAuthLoading ? (isAr ? 'جاري إرسال الطلب...' : 'Submitting...') : (isAr ? 'إرسال طلب اعتماد تاجر الجملة' : 'Submit Trade Application')}
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

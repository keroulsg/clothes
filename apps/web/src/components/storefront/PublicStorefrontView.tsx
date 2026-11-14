import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  Building2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language } from '../../types';

// Commerce Context & Shared Core
import {
  StorefrontCommerceProvider,
  useStorefrontCommerce,
} from './context/StorefrontCommerceContext';
import { StorefrontHeader } from './common/StorefrontHeader';
import { StorefrontFooter } from './common/StorefrontFooter';
import { CartDrawer } from './common/CartDrawer';
import { ToastContainer } from './common/ToastContainer';

// Dedicated Page Views
import { StorefrontProductDetailPage } from './views/StorefrontProductDetailPage';
import { StorefrontShopPage } from './views/StorefrontShopPage';
import { StorefrontCategoryPage } from './views/StorefrontCategoryPage';
import { StorefrontCartPage } from './views/StorefrontCartPage';
import { StorefrontCheckoutPage } from './views/StorefrontCheckoutPage';
import { StorefrontAccountPage } from './views/StorefrontAccountPage';
import { StorefrontOrderTrackingPage } from './views/StorefrontOrderTrackingPage';
import { StorefrontContentPage } from './views/StorefrontContentPage';

// 4 Distinct Presentation Themes
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
  const [rawVariants, setRawVariants] = useState<any[]>([]);
  const [isPreview, setIsPreview] = useState(false);

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

  const fetchStoreData = async (tokenOverride?: string) => {
    if (!tenantIdentifier) {
      setStoreSettings(null);
      setTenantInfo(null);
      setRawVariants([]);
      setErrorMsg(
        isAr
          ? 'رابط المتجر غير مكتمل. افتح رابط المتجر المخصص من لوحة المصنع.'
          : 'Store URL is incomplete. Open the tenant-specific storefront link from the factory dashboard.'
      );
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
        setRawVariants(res.products || res.catalog?.variants || res.variants || []);
        setIsPreview(Boolean(res.is_preview || isPreviewRequested));

        if (res.customer) {
          setWholesaleUser(res.customer);
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
        setRawVariants([
          { id: '1', sku: 'POLO-EG-01', name: 'Premium Egyptian Cotton Polo', name_ar: 'قميص بولو قطن مصري فاخر', price: 350, in_stock: 45, size: 'L', color: isAr ? 'كحلي' : 'Navy', is_wholesale: true, moq: 10, wholesale_tiers: [{ min_quantity: 10, unit_price: 280 }, { min_quantity: 50, unit_price: 250 }] },
          { id: '2', sku: 'TSH-CL-02', name: '100% Pure Cotton Casual T-Shirt', name_ar: 'تيشيرت كاجوال قطن 100%', price: 220, in_stock: 80, size: 'M', color: isAr ? 'أبيض' : 'White', is_wholesale: true, moq: 20, wholesale_tiers: [{ min_quantity: 20, unit_price: 170 }, { min_quantity: 100, unit_price: 150 }] },
          { id: '3', sku: 'PNT-DN-03', name: 'Export Stretch Denim Jeans', name_ar: 'بنطلون جينز تصدير فائق المرونة', price: 480, in_stock: 25, size: '34', color: isAr ? 'أزرق داكن' : 'Dark Blue', is_wholesale: true, moq: 10, wholesale_tiers: [{ min_quantity: 10, unit_price: 390 }] },
          { id: '4', sku: 'KID-BL-04', name: 'Soft Natural Baby Bodysuit', name_ar: 'سالوبيت أطفال قطن طبيعي ناعم', price: 180, in_stock: 35, size: '2Y', color: isAr ? 'مشمشي' : 'Peach', is_wholesale: true, moq: 15, wholesale_tiers: [{ min_quantity: 15, unit_price: 140 }] },
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
        setIsWholesaleModalOpen(false);
        setWholesaleLoginPassword('');
        await fetchStoreData(res.token);
      } else {
        setWholesaleAuthError(res?.message || (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'));
      }
    } catch (err: any) {
      setWholesaleAuthError(
        err.response?.data?.message || (isAr ? 'فشل تسجيل الدخول كتاجر جملة' : 'Login failed')
      );
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
      const res = await api.storefront.registerWholesale(wholesaleRegForm, tenantIdentifier);
      if (res?.success || res?.customer) {
        setWholesaleAuthSuccess(
          res.message ||
            (isAr
              ? 'تم استلام طلب اعتماد حساب التاجر بنجاح! سيقوم فريق المبيعات بمراجعة بياناتك والتفعيل خلال ساعات.'
              : 'Wholesale application submitted! A representative will review and activate your account shortly.')
        );
        setWholesaleRegForm({
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
      } else {
        setWholesaleAuthError(res?.message || (isAr ? 'تعذر إرسال طلب الاعتماد' : 'Registration failed'));
      }
    } catch (err: any) {
      setWholesaleAuthError(
        err.response?.data?.message || (isAr ? 'حدث خطأ أثناء تسجيل طلب التاجر' : 'Submission error')
      );
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

  // Normalize variants for consistent field naming
  const normalizedVariants = useMemo(() => {
    return (rawVariants || []).map((v) => ({
      ...v,
      name: v.name || v.model_name || v.sku || 'Apparel Item',
      name_ar: v.name_ar || v.model_name_ar || v.model_name || v.name,
      in_stock: v.in_stock ?? v.stock_quantity ?? 0,
    }));
  }, [rawVariants]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">
            {isAr ? 'جارٍ تحميل المتجر الإلكتروني...' : 'Loading Storefront...'}
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !storeSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isAr ? 'المتجر غير متاح' : 'Store Unavailable'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
          <Button variant="primary" className="text-xs rounded-xl" onClick={() => { window.location.hash = '#/'; }}>
            {isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <StorefrontCommerceProvider
      lang={lang}
      isDark={isDark}
      onToggleTheme={onToggleTheme}
      onToggleLang={onToggleLang}
      onNavigateToTracking={onNavigateToTracking}
      onNavigateToErp={onNavigateToErp}
      storeSettings={storeSettings}
      tenantInfo={tenantInfo}
      variants={normalizedVariants}
      wholesaleToken={wholesaleToken}
      wholesaleUser={wholesaleUser}
      onWholesaleLogin={(token, user) => {
        try {
          localStorage.setItem('garmentos_wholesale_token', token);
        } catch {}
        setWholesaleToken(token);
        setWholesaleUser(user);
        fetchStoreData(token);
      }}
      onWholesaleLogout={handleLogoutWholesale}
    >
      <StorefrontMainContent
        isPreview={isPreview}
        isAr={isAr}
        onNavigateToErp={onNavigateToErp}
        isWholesaleModalOpen={isWholesaleModalOpen}
        setIsWholesaleModalOpen={setIsWholesaleModalOpen}
        wholesaleTab={wholesaleTab}
        setWholesaleTab={setWholesaleTab}
        wholesaleLoginEmailOrPhone={wholesaleLoginEmailOrPhone}
        setWholesaleLoginEmailOrPhone={setWholesaleLoginEmailOrPhone}
        wholesaleLoginPassword={wholesaleLoginPassword}
        setWholesaleLoginPassword={setWholesaleLoginPassword}
        wholesaleRegForm={wholesaleRegForm}
        setWholesaleRegForm={setWholesaleRegForm}
        wholesaleAuthLoading={wholesaleAuthLoading}
        wholesaleAuthError={wholesaleAuthError}
        wholesaleAuthSuccess={wholesaleAuthSuccess}
        handleWholesaleLogin={handleWholesaleLogin}
        handleWholesaleRegister={handleWholesaleRegister}
      />
    </StorefrontCommerceProvider>
  );
};

// Internal component inside CommerceProvider context
interface StorefrontMainContentProps {
  isPreview: boolean;
  isAr: boolean;
  onNavigateToErp?: () => void;
  isWholesaleModalOpen: boolean;
  setIsWholesaleModalOpen: (open: boolean) => void;
  wholesaleTab: 'login' | 'register';
  setWholesaleTab: (tab: 'login' | 'register') => void;
  wholesaleLoginEmailOrPhone: string;
  setWholesaleLoginEmailOrPhone: (val: string) => void;
  wholesaleLoginPassword: string;
  setWholesaleLoginPassword: (val: string) => void;
  wholesaleRegForm: any;
  setWholesaleRegForm: React.Dispatch<React.SetStateAction<any>>;
  wholesaleAuthLoading: boolean;
  wholesaleAuthError: string | null;
  wholesaleAuthSuccess: string | null;
  handleWholesaleLogin: (e: React.FormEvent) => void;
  handleWholesaleRegister: (e: React.FormEvent) => void;
}

const StorefrontMainContent: React.FC<StorefrontMainContentProps> = ({
  isPreview,
  isAr,
  onNavigateToErp,
  isWholesaleModalOpen,
  setIsWholesaleModalOpen,
  wholesaleTab,
  setWholesaleTab,
  wholesaleLoginEmailOrPhone,
  setWholesaleLoginEmailOrPhone,
  wholesaleLoginPassword,
  setWholesaleLoginPassword,
  wholesaleRegForm,
  setWholesaleRegForm,
  wholesaleAuthLoading,
  wholesaleAuthError,
  wholesaleAuthSuccess,
  handleWholesaleLogin,
  handleWholesaleRegister,
}) => {
  const {
    activeView,
    setActiveView,
    storeSettings,
    tenantInfo,
    variants,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    cartCount,
    setIsCartOpen,
    navigateToProduct,
    onNavigateToTracking,
    onToggleTheme,
    onToggleLang,
    isDark,
    wholesaleUser,
    logoutWholesale,
  } = useStorefrontCommerce();

  const themeId = storeSettings?.theme_id || 'fashion_boutique';
  const normalizedTheme =
    themeId === 'wholesale_uniform' || themeId === 'modern_catalog'
      ? 'modern_catalog'
      : themeId === 'kids_baby' || themeId === 'kids_family'
      ? 'kids_family'
      : themeId === 'premium_brand'
      ? 'premium_brand'
      : 'fashion_boutique';

  // Compatibility props passed to templates
  const templateProps = {
    lang: isAr ? ('ar' as const) : ('en' as const),
    isDark,
    storeSettings,
    tenantInfo,
    variants,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    cartCount,
    onOpenCart: () => setIsCartOpen(true),
    onSelectProduct: (v: any) => navigateToProduct(v.id),
    onNavigateToTracking: () => onNavigateToTracking(),
    onNavigateToShop: () => {
      setActiveView('shop');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onNavigateToCategories: () => {
      setActiveView('category');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onNavigateToAbout: () => {
      setActiveView('about');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onNavigateToContact: () => {
      setActiveView('contact');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onNavigateToPolicies: () => {
      setActiveView('policies');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onNavigateToErp,
    onToggleTheme,
    onToggleLang,
    isPreview,
    wholesaleUser,
    onOpenWholesaleModal: () => setIsWholesaleModalOpen(true),
    onLogoutWholesale: logoutWholesale,
  };

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className="min-h-screen flex flex-col justify-between">
      {/* 1. Live Preview Mode Banner */}
      {isPreview && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-between sticky top-0 z-50 shadow-md border-b border-amber-500">
          <div className="flex items-center gap-2">
            <span className="bg-slate-950 text-amber-300 px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono">
              {isAr ? 'وضع المعاينة الحية' : 'Live Preview Mode'}
            </span>
            <span>
              {isAr
                ? 'أنت تستعرض الآن مسودة التصميم الحالية للمتجر من استوديو التصميم.'
                : 'You are viewing the unpublished design draft from Design Studio.'}
            </span>
          </div>
          {onNavigateToErp && (
            <button
              onClick={onNavigateToErp}
              className="text-slate-950 underline font-extrabold hover:text-white transition"
            >
              {isAr ? 'العودة للاستوديو' : 'Return to Studio'}
            </button>
          )}
        </div>
      )}

      {/* 2. Global Universal Header */}
      <StorefrontHeader />

      {/* 3. Page Router Container */}
      <main className="flex-1">
        {activeView === 'home' && (
          <>
            {normalizedTheme === 'modern_catalog' ? (
              <ModernCatalogTemplate {...templateProps} />
            ) : normalizedTheme === 'kids_family' ? (
              <KidsFamilyTemplate {...templateProps} />
            ) : normalizedTheme === 'premium_brand' ? (
              <PremiumBrandTemplate {...templateProps} />
            ) : (
              <FashionBoutiqueTemplate {...templateProps} />
            )}
          </>
        )}

        {activeView === 'shop' && <StorefrontShopPage />}
        {activeView === 'category' && <StorefrontCategoryPage />}
        {activeView === 'product' && <StorefrontProductDetailPage />}
        {activeView === 'cart' && <StorefrontCartPage />}
        {activeView === 'checkout' && <StorefrontCheckoutPage />}
        {activeView === 'account' && <StorefrontAccountPage />}
        {activeView === 'tracking' && <StorefrontOrderTrackingPage />}
        {activeView === 'about' && <StorefrontContentPage pageType="about" />}
        {activeView === 'contact' && <StorefrontContentPage pageType="contact" />}
        {activeView === 'policies' && <StorefrontContentPage pageType="policies" />}
      </main>

      {/* 4. Global Quick Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* 5. Global Notification Toast Container */}
      <ToastContainer />

      {/* 6. Global Universal Footer */}
      <StorefrontFooter />

      {/* 7. Wholesale B2B Login / Registration Modal */}
      {isWholesaleModalOpen && (
        <Modal
          isOpen={isWholesaleModalOpen}
          onClose={() => setIsWholesaleModalOpen(false)}
          title={isAr ? 'بوابة عملاء وتجار الجملة (B2B)' : 'Wholesale B2B Customer Portal'}
          maxWidth="md"
        >
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWholesaleTab('login')}
                className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 flex items-center justify-center gap-2 ${
                  wholesaleTab === 'login'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل دخول تاجر معتمد' : 'Sign In'}</span>
              </button>
              <button
                type="button"
                onClick={() => setWholesaleTab('register')}
                className={`flex-1 py-2.5 text-xs font-bold transition border-b-2 flex items-center justify-center gap-2 ${
                  wholesaleTab === 'register'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'طلب فتح حساب تجاري جديد' : 'New Application'}</span>
              </button>
            </div>

            {/* Error & Success Alerts */}
            {wholesaleAuthError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{wholesaleAuthError}</span>
              </div>
            )}
            {wholesaleAuthSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{wholesaleAuthSuccess}</span>
              </div>
            )}

            {/* Tab 1: Login Form */}
            {wholesaleTab === 'login' && (
              <form onSubmit={handleWholesaleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {isAr ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone'}
                  </label>
                  <input
                    type="text"
                    required
                    value={wholesaleLoginEmailOrPhone}
                    onChange={(e) => setWholesaleLoginEmailOrPhone(e.target.value)}
                    placeholder={isAr ? 'أدخل بريدك أو رقم هاتفك المسجل' : 'e.g. trade@example.com'}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {isAr ? 'كلمة المرور' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required
                    value={wholesaleLoginPassword}
                    onChange={(e) => setWholesaleLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5"
                  />
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={wholesaleAuthLoading}
                >
                  {wholesaleAuthLoading ? (isAr ? 'جارٍ التحقق...' : 'Signing in...') : isAr ? 'تسجيل الدخول وبدء التسوق' : 'Sign In to Portal'}
                </Button>
              </form>
            )}

            {/* Tab 2: Register Application Form */}
            {wholesaleTab === 'register' && (
              <form onSubmit={handleWholesaleRegister} className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isAr ? 'اسم المنشأة / المحل / العلامة *' : 'Company Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={wholesaleRegForm.company_name}
                      onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, company_name: e.target.value })}
                      placeholder={isAr ? 'شركة أو متجر...' : 'Business name'}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isAr ? 'المسؤول التجاري *' : 'Contact Person *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={wholesaleRegForm.contact_person}
                      onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, contact_person: e.target.value })}
                      placeholder={isAr ? 'اسم المسؤول' : 'Full name'}
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isAr ? 'رقم الهاتف للتواصل *' : 'Phone *'}
                    </label>
                    <input
                      type="tel"
                      required
                      value={wholesaleRegForm.phone}
                      onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, phone: e.target.value })}
                      placeholder="01012345678"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      {isAr ? 'البريد الإلكتروني *' : 'Email *'}
                    </label>
                    <input
                      type="email"
                      required
                      value={wholesaleRegForm.email}
                      onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, email: e.target.value })}
                      placeholder="trade@company.com"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">
                      {isAr ? 'كلمة مرور الحساب *' : 'Account Password *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={wholesaleRegForm.password}
                      onChange={(e) => setWholesaleRegForm({ ...wholesaleRegForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={wholesaleAuthLoading}
                >
                  {wholesaleAuthLoading ? (isAr ? 'جارٍ الإرسال...' : 'Submitting...') : isAr ? 'إرسال طلب فتح الحساب' : 'Submit Application'}
                </Button>
              </form>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

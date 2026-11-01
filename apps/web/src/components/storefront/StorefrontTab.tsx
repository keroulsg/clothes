import React, { useState, useEffect } from 'react';
import {
  Store,
  ShoppingBag,
  Truck,
  ExternalLink,
  CheckCircle,
  Package,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Palette,
  Settings,
  CreditCard,
  QrCode,
  Eye,
  Check,
  X,
  Sparkles,
  Baby,
  Crown,
  Layers,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, StoreOrder, ProductVariant, TenantStoreSetting, StorefrontThemeId } from '../../types';

interface StorefrontTabProps {
  lang?: Language;
  isAr?: boolean;
  variants: ProductVariant[];
}

const THEME_OPTIONS: Array<{
  id: StorefrontThemeId;
  name_ar: string;
  name_en: string;
  desc_ar: string;
  desc_en: string;
  icon: any;
  color: string;
  accent: string;
  badge_ar: string;
  badge_en: string;
}> = [
  {
    id: 'modern_fashion',
    name_ar: 'الموضة العصرية (Modern Fashion)',
    name_en: 'Modern Fashion',
    desc_ar: 'تصميم عصري جذاب للملابس الكاجوال والأزياء مع شبكة منتجات أنيقة وكروت ديناميكية.',
    desc_en: 'Clean, vibrant contemporary fashion with sleek aspect ratios and dynamic badges.',
    icon: Sparkles,
    color: '#0284c7',
    accent: '#f43f5e',
    badge_ar: 'الأكثر شعبية',
    badge_en: 'Most Popular',
  },
  {
    id: 'kids_baby',
    name_ar: 'أطفال ومواليد (Kids & Baby)',
    name_en: 'Kids & Baby',
    desc_ar: 'ألوان دافئة مبهجة، حواف دائرية ناعمة، ووسوم الفئات العمرية ومقاسات الأطفال وشهادات الأمان.',
    desc_en: 'Playful, pastel warm tones, soft rounded borders, friendly age badges and pure cotton tags.',
    icon: Baby,
    color: '#f97316',
    accent: '#10b981',
    badge_ar: 'ملابس قطنية للأطفال',
    badge_en: 'Cotton Kids Apparel',
  },
  {
    id: 'premium_brand',
    name_ar: 'علامة فاخرة (Premium Brand)',
    name_en: 'Premium Brand',
    desc_ar: 'طابع فاخر داكن، لمسات ذهبية وبرونزية راقية، وتنسيق أنيق للملابس الرسمية وفساتين السهرة.',
    desc_en: 'Luxury dark/editorial feel, gold/bronze accents, refined serif typography and high fashion.',
    icon: Crown,
    color: '#d97706',
    accent: '#18181b',
    badge_ar: 'فخامة وتصدير',
    badge_en: 'Luxury & Export',
  },
  {
    id: 'wholesale_uniform',
    name_ar: 'الجملة والزي الموحد (Wholesale & Uniform)',
    name_en: 'Wholesale & Uniform',
    desc_ar: 'مخصص لتجارة الجملة واليونيفورم والشركات، مع عرض كميات الحد الأدنى للطلب (MOQ) وجداول الأسعار.',
    desc_en: 'B2B oriented, dense catalog tables, MOQ badges, bulk tier breakdown and procurement quotation.',
    icon: Layers,
    color: '#2563eb',
    accent: '#059669',
    badge_ar: 'توريدات B2B بالجملة',
    badge_en: 'B2B Wholesale & MOQ',
  },
];

export const StorefrontTab: React.FC<StorefrontTabProps> = ({ lang = 'ar', isAr: propIsAr, variants }) => {
  const isAr = propIsAr !== undefined ? propIsAr : lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'themes' | 'preview' | 'settings'>('orders');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [storeSettings, setStoreSettings] = useState<TenantStoreSetting>({
    id: '',
    store_name: isAr ? 'متجر المصنع المباشر' : 'Factory Direct Store',
    theme_id: 'modern_fashion',
    theme_config: {
      primary_color: '#0284c7',
      direction: 'rtl',
    },
    is_store_enabled: true,
    allow_cod: true,
    allow_card_payment: false,
    allow_instapay: true,
    instapay_account_name: 'Alpha Factory Operations',
    instapay_handle: 'factory@instapay',
    instapay_instructions: 'يرجى التحويل عبر تطبيق InstaPay إلى المعرف أعلاه وإدخال رقم العملية المرجعي.',
    currency: 'EGP',
    direction: 'rtl',
    banner_title: isAr ? 'أرقى منتجات الملابس من خط الإنتاج مباشرة' : 'Premium Garments Direct From Production Lines',
    banner_subtitle: isAr ? 'خامات قطنية 100%، خياطة تصدير، وأسعار جملة وتجزئة مباشرة بدون وسيط.' : '100% Egyptian Cotton, Export Quality, Factory Direct Wholesale & Retail Pricing.',
  });

  const [previewThemeId, setPreviewThemeId] = useState<StorefrontThemeId>('modern_fashion');

  // InstaPay Review Modal
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<StoreOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Storefront preview cart state
  const [storeCart, setStoreCart] = useState<{ variant: ProductVariant; qty: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState(isAr ? 'القاهرة' : 'Cairo');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'instapay'>('cod');
  const [instapayRef, setInstapayRef] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, settingsRes] = await Promise.allSettled([
        api.storefront.getOrders(1),
        api.storefront.getSettings(),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
      if (settingsRes.status === 'fulfilled' && settingsRes.value?.store_settings) {
        setStoreSettings(settingsRes.value.store_settings);
        setPreviewThemeId(settingsRes.value.store_settings.theme_id || 'modern_fashion');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب بيانات المتجر' : 'Failed to load storefront data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: StoreOrder['status']) => {
    try {
      const res = await api.storefront.updateOrderStatus(orderId, nextStatus);
      if (res?.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)));
      }
      setSuccessMsg(isAr ? `تم تحديث حالة الطلب إلى: ${nextStatus}` : `Order status updated to: ${nextStatus}`);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحديث حالة الطلب' : 'Failed to update order status'));
    }
  };

  const handleVerifyPayment = async (approved: boolean) => {
    if (!selectedOrderForReview) return;
    setIsReviewing(true);
    try {
      const res = await api.storefront.verifyPayment(
        selectedOrderForReview.id,
        approved,
        !approved ? rejectionReason : undefined
      );

      if (res?.order) {
        setOrders((prev) => prev.map((o) => (o.id === selectedOrderForReview.id ? res.order : o)));
      }

      setSuccessMsg(
        approved
          ? (isAr ? 'تم اعتماد تحويل InstaPay بنجاح!' : 'InstaPay transfer verified successfully!')
          : (isAr ? 'تم رفض التحويل وتسجيل السبب بنجاح!' : 'InstaPay transfer rejected.')
      );
      setSelectedOrderForReview(null);
      setRejectionReason('');
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل التحقق من التحويل' : 'Failed to verify payment'));
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.storefront.updateSettings(storeSettings);
      if (res?.store_settings) {
        setStoreSettings(res.store_settings);
      }
      setSuccessMsg(isAr ? 'تم حفظ إعدادات وثيم المتجر بنجاح!' : 'Store settings & theme updated successfully!');
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ الإعدادات' : 'Failed to save settings'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateTheme = async (themeId: StorefrontThemeId) => {
    setIsLoading(true);
    try {
      const updated = { ...storeSettings, theme_id: themeId };
      const res = await api.storefront.updateSettings(updated);
      if (res?.store_settings) {
        setStoreSettings(res.store_settings);
      }
      setPreviewThemeId(themeId);
      setSuccessMsg(isAr ? `تم تفعيل ثيم ${THEME_OPTIONS.find(t => t.id === themeId)?.name_ar} بنجاح!` : `Theme ${themeId} activated!`);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تفعيل الثيم' : 'Failed to activate theme'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (v: ProductVariant) => {
    setStoreCart((prev) => {
      const exist = prev.find((i) => i.variant.id === v.id);
      if (exist) {
        return prev.map((i) => (i.variant.id === v.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { variant: v, qty: 1 }];
    });
  };

  const handlePlaceStoreOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (storeCart.length === 0) return;

    try {
      const items = storeCart.map((i) => ({
        variant_id: i.variant.id,
        quantity: i.qty,
      }));

      const payload: any = {
        customer_name: custName || (isAr ? 'عميل المتجر' : 'Store Customer'),
        customer_phone: custPhone || '01000000000',
        shipping_address: custAddress || (isAr ? 'عنوان التوصيل' : 'Delivery Address'),
        city: custCity,
        payment_method: paymentMethod,
        items,
      };

      if (paymentMethod === 'instapay' && instapayRef) {
        payload.instapay_reference = instapayRef;
      }

      const res = await (api as any).request('/storefront/order', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res?.order) {
        setOrders((prev) => [res.order, ...prev]);
        setSuccessMsg(
          isAr
            ? `تم تسجيل طلب الشراء بنجاح برقم: ${res.order.order_number} ${paymentMethod === 'instapay' ? '(بانتظار مراجعة تحويل InstaPay)' : '(الدفع عند الاستلام)'}`
            : `Order placed successfully! Ref: ${res.order.order_number}`
        );
      }

      setStoreCart([]);
      setIsCheckoutOpen(false);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setInstapayRef('');
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الطلب بالمتجر' : 'Failed to place store order'));
    }
  };

  const cartSubtotal = storeCart.reduce((sum, item) => {
    const price = Number(item.variant.retail_price) > 0 ? Number(item.variant.retail_price) : 250;
    return sum + price * item.qty;
  }, 0);

  const activeThemeMeta = THEME_OPTIONS.find((t) => t.id === (activeSubTab === 'preview' ? previewThemeId : storeSettings.theme_id)) || THEME_OPTIONS[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={isAr ? 'المتجر الإلكتروني وهوية المصنع' : 'Multi-Tenant Digital Storefront & Themes'}
        subtitle={
          isAr
            ? 'إدارة المتجر الإلكتروني، اختيار الثيمات والعلامة التجارية، إدارة طلبات الشحن، ومراجعة تحويلات InstaPay.'
            : 'Manage branded factory storefront, 4 theme families, COD & InstaPay payment review, and inventory synchronization.'
        }
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'المتجر الإلكتروني' : 'Storefront' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('#/store/track', '_blank')}
              className="flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4 text-primary" />
              <span>{isAr ? 'تتبع طلبات العملاء' : 'Track Orders'}</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.open((storeSettings as any)?.slug ? `#/store/${(storeSettings as any).slug}` : '#/store', '_blank')}
              className="flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isAr ? 'فتح المتجر الإلكتروني للعملاء' : 'Open Public Store'}</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي طلبات المتجر' : 'Total Store Orders'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{orders.length}</p>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {orders.filter((o) => o.payment_status === 'pending_review').length} {isAr ? 'تحويل InstaPay بانتظار الاعتماد' : 'InstaPay pending review'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Store className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'مبيعات المتجر المحققة' : 'Verified Online Sales'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {orders
                  .filter((o) => o.status !== 'cancelled')
                  .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0)
                  .toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {orders.filter((o) => o.status === 'delivered').length} {isAr ? 'طلب مكتمل ومسلّم' : 'delivered orders'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'الثيم المعتمد حالياً' : 'Active Store Theme'}
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeThemeMeta.color }} />
                {isAr ? activeThemeMeta.name_ar.split('(')[0] : activeThemeMeta.name_en}
              </p>
              <span className="text-xs text-primary font-medium">
                {isAr ? '4 عائلات تصميم متاحة' : '4 theme families ready'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Palette className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'حالة المتجر وبوابات الدفع' : 'Store & Payment Gateways'}
              </p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {storeSettings.is_store_enabled ? (isAr ? 'المتجر نشط' : 'Store Active') : (isAr ? 'مغلق' : 'Disabled')}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                COD {storeSettings.allow_cod ? '✓' : '✗'} | InstaPay {storeSettings.allow_instapay ? '✓' : '✗'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'orders'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4" />
            {isAr ? 'إدارة الطلبات والشحن' : 'Store Orders'}
          </button>

          <button
            onClick={() => setActiveSubTab('themes')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'themes'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            {isAr ? 'ثيمات وهوية المتجر (4 ثيمات)' : 'Theme Architecture (4 Themes)'}
          </button>

          <button
            onClick={() => setActiveSubTab('preview')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'preview'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-4 h-4" />
            {isAr ? 'معاينة متجر المصنع المباشر' : 'Live Storefront Preview'}
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'settings'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isAr ? 'إعدادات InstaPay والدفع' : 'InstaPay & Settings'}
          </button>
        </div>

        <Button size="sm" variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isAr ? 'تحديث' : 'Refresh'}
        </Button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. ORDERS VIEW */}
      {activeSubTab === 'orders' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'طلبات المتجر الإلكتروني ومسار مراجعة المدفوعات' : 'Incoming E-Commerce Store Orders'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? 'دعم الدفع عند الاستلام (COD) وتحويلات InstaPay مع تدقيق بشري صارم بدون أي اعتماد تلقائي من الصور' : 'COD and InstaPay manual review with strict financial audit trail'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                {orders.length} {isAr ? 'طلب إجمالي' : 'Orders'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'العنوان' : 'Address'}</th>
                  <th className="p-3 text-start">{isAr ? 'طريقة الدفع' : 'Payment'}</th>
                  <th className="p-3 text-start">{isAr ? 'حالة الدفع' : 'Payment Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'حالة الشحن' : 'Shipping Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 text-sm">
                      {isAr ? 'لا توجد طلبات متجر إلكتروني حالياً' : 'No store orders found'}
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{o.order_number}</td>
                      <td className="p-3">
                        <p className="font-medium text-slate-900 dark:text-white">{o.customer_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{o.customer_phone}</p>
                      </td>
                      <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {o.city} - {o.shipping_address}
                      </td>
                      <td className="p-3">
                        {o.payment_method === 'instapay' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <QrCode className="w-3 h-3" />
                            InstaPay
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <ShieldCheck className="w-3 h-3" />
                            COD
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {o.payment_status === 'pending_review' && (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 animate-pulse">
                              {isAr ? 'بانتظار المراجعة' : 'Pending Review'}
                            </span>
                            <button
                              onClick={() => setSelectedOrderForReview(o)}
                              className="text-xs text-primary underline hover:text-primary/80"
                            >
                              {isAr ? 'تدقيق' : 'Review'}
                            </button>
                          </div>
                        )}
                        {o.payment_status === 'verified_paid' && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            {isAr ? 'معتمد ومؤكد ✓' : 'Verified Paid'}
                          </span>
                        )}
                        {o.payment_status === 'rejected' && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300" title={o.payment_rejection_reason}>
                            {isAr ? 'مرفوض ✗' : 'Rejected'}
                          </span>
                        )}
                        {o.payment_status === 'cod_pending' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium text-slate-500">
                            {isAr ? 'تحصيل عند التسليم' : 'Collect on Delivery'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {Number(o.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3">
                        {o.status === 'new' && <Badge variant="warning">{isAr ? 'جديد' : 'New'}</Badge>}
                        {o.status === 'confirmed' && <Badge variant="info">{isAr ? 'مؤكد' : 'Confirmed'}</Badge>}
                        {o.status === 'shipped' && <Badge variant="brand">{isAr ? 'مشحون' : 'Shipped'}</Badge>}
                        {o.status === 'delivered' && <Badge variant="success">{isAr ? 'مسلّم' : 'Delivered'}</Badge>}
                        {o.status === 'cancelled' && <Badge variant="danger">{isAr ? 'ملغي' : 'Cancelled'}</Badge>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {o.payment_method === 'instapay' && o.payment_status === 'pending_review' && (
                            <Button size="sm" variant="outline" onClick={() => setSelectedOrderForReview(o)}>
                              <CheckCircle className="w-3.5 h-3.5 me-1 text-amber-600" />
                              {isAr ? 'مراجعة التحويل' : 'Verify'}
                            </Button>
                          )}
                          {o.status === 'new' && (
                            <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'shipped')}>
                              <Truck className="w-3.5 h-3.5 me-1" />
                              {isAr ? 'شحن' : 'Ship'}
                            </Button>
                          )}
                          {o.status === 'shipped' && (
                            <Button size="sm" variant="outline" onClick={() => handleUpdateOrderStatus(o.id, 'delivered')}>
                              <CheckCircle className="w-3.5 h-3.5 me-1 text-emerald-600" />
                              {isAr ? 'تأكيد التسليم' : 'Deliver'}
                            </Button>
                          )}
                          {o.status !== 'cancelled' && o.status !== 'delivered' && (
                            <button
                              onClick={() => handleUpdateOrderStatus(o.id, 'cancelled')}
                              className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. THEMES & BRANDING VIEW */}
      {activeSubTab === 'themes' && (
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                {isAr ? 'معمارية الثيمات المتقدمة (Theme Architecture)' : 'Storefront Theme Families'}
              </span>
              <h2 className="text-xl font-bold mt-1.5">
                {isAr ? '4 عائلات تصميم مخصصة للمصانع والماركات التجارية' : '4 Branded Theme Families Over Shared Catalog'}
              </h2>
              <p className="text-xs text-white/80 mt-1 max-w-2xl">
                {isAr
                  ? 'ثيمات عرض منفصلة تماماً مع مشاركة البيانات والمخزون وحسابات التكاليف والرواتب بدون أي تكرار لقواعد البيانات.'
                  : 'Independent presentation templates over shared tenant inventory, orders, and costing logic.'}
              </p>
            </div>
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              onClick={() => setActiveSubTab('preview')}
            >
              <Eye className="w-4 h-4 me-1.5" />
              {isAr ? 'معاينة حية للمتجر' : 'Live Preview'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {THEME_OPTIONS.map((theme) => {
              const IconComp = theme.icon;
              const isCurrent = storeSettings.theme_id === theme.id;

              return (
                <Card
                  key={theme.id}
                  className={`p-5 transition-all border-2 relative overflow-hidden ${
                    isCurrent
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute top-3 end-3 px-2.5 py-0.5 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1 shadow-sm">
                      <Check className="w-3.5 h-3.5" />
                      {isAr ? 'الثيم المعتمد حالياً' : 'Active Theme'}
                    </div>
                  )}

                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md flex-shrink-0"
                      style={{ backgroundColor: theme.color }}
                    >
                      <IconComp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {isAr ? theme.name_ar : theme.name_en}
                        </h4>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                          {isAr ? theme.badge_ar : theme.badge_en}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                        {isAr ? theme.desc_ar : theme.desc_en}
                      </p>

                      {/* Palette Preview */}
                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-xs text-slate-400">{isAr ? 'اللوحة اللونية:' : 'Palette:'}</span>
                        <div className="flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: theme.color }} />
                          <span className="w-4 h-4 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: theme.accent }} />
                          <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shadow-xs bg-slate-100 dark:bg-slate-800" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPreviewThemeId(theme.id);
                        setActiveSubTab('preview');
                      }}
                    >
                      <Eye className="w-3.5 h-3.5 me-1" />
                      {isAr ? 'معاينة الثيم أولاً' : 'Preview First'}
                    </Button>

                    <Button
                      size="sm"
                      variant={isCurrent ? 'outline' : 'primary'}
                      disabled={isCurrent || isLoading}
                      onClick={() => handleActivateTheme(theme.id)}
                    >
                      {isCurrent ? (isAr ? 'مفعّل بالفعل' : 'Active') : (isAr ? 'تفعيل واعتماد الثيم' : 'Activate Theme')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. LIVE PREVIEW VIEW */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          {/* Preview Controls Bar */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'تبديل المعاينة الحية:' : 'Previewing Theme:'}
              </span>
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPreviewThemeId(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                    previewThemeId === t.id
                      ? 'bg-primary text-white shadow-xs font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isAr ? t.name_ar.split('(')[0] : t.name_en}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleActivateTheme(previewThemeId)}
                disabled={storeSettings.theme_id === previewThemeId}
              >
                <Check className="w-3.5 h-3.5 me-1" />
                {storeSettings.theme_id === previewThemeId
                  ? (isAr ? 'معتمد رسمياً' : 'Current Theme')
                  : (isAr ? `تفعيل ثيم ${THEME_OPTIONS.find(t => t.id === previewThemeId)?.name_ar.split('(')[0]}` : 'Activate This Theme')}
              </Button>
            </div>
          </div>

          {/* DYNAMIC STOREFRONT PREVIEW CONTAINER ACCORDING TO PREVIEW THEME */}
          <div
            className={`rounded-2xl p-6 transition-all shadow-md ${
              previewThemeId === 'modern_fashion'
                ? 'bg-gradient-to-r from-sky-600 to-blue-700 text-white'
                : previewThemeId === 'kids_baby'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-400 text-white'
                : previewThemeId === 'premium_brand'
                ? 'bg-gradient-to-r from-zinc-950 via-neutral-900 to-zinc-900 text-amber-400 border border-amber-500/30'
                : 'bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white'
            }`}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
                  {isAr ? storeSettings.store_name : 'Factory Direct Store'}
                </span>
                <h2 className="text-2xl font-black mt-2">
                  {storeSettings.banner_title || (isAr ? 'أرقى منتجات الملابس مباشرة من المصنع' : 'Premium Garments Direct From Factory')}
                </h2>
                <p className="text-sm opacity-90 mt-1 max-w-2xl">
                  {storeSettings.banner_subtitle || (isAr ? 'خامات قطنية 100% وأسعار الجملة والتجزئة.' : 'Export quality, pure Egyptian cotton.')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30"
                  onClick={() => setIsCheckoutOpen(true)}
                >
                  <ShoppingBag className="w-4 h-4 me-1.5" />
                  {isAr ? `سلة الشراء (${storeCart.length})` : `Cart (${storeCart.length})`}
                </Button>
              </div>
            </div>
          </div>

          {/* Dynamic Product Grid with Theme-Specific Card Styling */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {variants.map((v) => {
              const price = Number(v.retail_price) > 0 ? Number(v.retail_price) : 250;

              return (
                <Card
                  key={v.id}
                  className={`p-4 shadow-sm transition-all flex flex-col justify-between ${
                    previewThemeId === 'modern_fashion'
                      ? 'bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 hover:shadow-lg rounded-xl'
                      : previewThemeId === 'kids_baby'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/60 rounded-3xl hover:scale-[1.02]'
                      : previewThemeId === 'premium_brand'
                      ? 'bg-zinc-900 border border-amber-500/20 text-zinc-100 hover:border-amber-500/50 rounded-lg shadow-md'
                      : 'bg-white dark:bg-[#0f1523]/90 border border-blue-200 dark:border-blue-900 rounded-md'
                  }`}
                >
                  <div>
                    <div
                      className={`h-36 flex items-center justify-center mb-3 relative overflow-hidden ${
                        previewThemeId === 'kids_baby'
                          ? 'rounded-2xl bg-amber-100/70 dark:bg-amber-900/30 text-amber-500'
                          : previewThemeId === 'premium_brand'
                          ? 'rounded-md bg-zinc-800 text-amber-400'
                          : 'rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Package className="w-12 h-12 stroke-[1.2]" />
                      {previewThemeId === 'wholesale_uniform' && (
                        <span className="absolute top-2 start-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-600 text-white">
                          MOQ: 24 pcs
                        </span>
                      )}
                      {previewThemeId === 'kids_baby' && (
                        <span className="absolute top-2 start-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                          {isAr ? '100% قطن آمن' : '100% Safe Cotton'}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm line-clamp-1">
                      {v.garment_model?.name || v.sku}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{v.size?.name || v.size_name || 'L'}</span>
                      <span>•</span>
                      <span>{v.color?.name || v.color_name || 'Navy'}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {v.sku}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'السعر' : 'Price'}</span>
                      <span className="font-bold text-base text-primary">
                        {price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                    <Button size="sm" onClick={() => handleAddToCart(v)}>
                      <ShoppingBag className="w-3.5 h-3.5 me-1" />
                      {isAr ? 'أضف للسلة' : 'Add'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Checkout Modal */}
          <Modal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            title={isAr ? 'إتمام طلب الشراء من متجر المصنع' : 'Storefront Order Checkout'}
          >
            <form onSubmit={handlePlaceStoreOrder} className="space-y-4">
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {storeCart.length === 0 ? (
                  <p className="text-center py-6 text-sm text-slate-400">
                    {isAr ? 'سلة الشراء فارغة' : 'Your cart is empty'}
                  </p>
                ) : (
                  storeCart.map((i, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {i.variant.garment_model?.name || i.variant.sku}
                        </p>
                        <p className="text-slate-400">{i.variant.size?.name || 'L'} - {i.variant.color?.name || 'Color'} × {i.qty}</p>
                      </div>
                      <span className="font-bold text-primary">
                        {((Number(i.variant.retail_price) || 250) * i.qty).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {storeCart.length > 0 && (
                <>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                      <span>{cartSubtotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{isAr ? 'رسوم الشحن والتوصيل:' : 'Shipping:'}</span>
                      <span>{isAr ? '50 ج.م' : '50 EGP'}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>{isAr ? 'الإجمالي النهائي:' : 'Total:'}</span>
                      <span className="text-primary">{(cartSubtotal + 50).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? 'اسم المستلم' : 'Full Name'}
                      </label>
                      <input
                        type="text"
                        required
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder={isAr ? 'سارة أحمد' : 'Sara Ahmed'}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'رقم الهاتف' : 'Phone'}
                        </label>
                        <input
                          type="tel"
                          required
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          placeholder="01012345678"
                          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'المدينة' : 'City'}
                        </label>
                        <input
                          type="text"
                          required
                          value={custCity}
                          onChange={(e) => setCustCity(e.target.value)}
                          placeholder={isAr ? 'القاهرة' : 'Cairo'}
                          className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {isAr ? 'عنوان التوصيل بالتفصيل' : 'Delivery Address'}
                      </label>
                      <input
                        type="text"
                        required
                        value={custAddress}
                        onChange={(e) => setCustAddress(e.target.value)}
                        placeholder={isAr ? 'شارع عباس العقاد، عمارة 14، الدور 3' : 'Street, Building #'}
                        className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {isAr ? 'طريقة الدفع' : 'Payment Method'}
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                            paymentMethod === 'cod'
                              ? 'border-primary bg-primary/10 text-primary font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pay_method"
                            value="cod"
                            checked={paymentMethod === 'cod'}
                            onChange={() => setPaymentMethod('cod')}
                            className="text-primary"
                          />
                          <span>{isAr ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}</span>
                        </label>

                        <label
                          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer text-xs transition-all ${
                            paymentMethod === 'instapay'
                              ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <input
                            type="radio"
                            name="pay_method"
                            value="instapay"
                            checked={paymentMethod === 'instapay'}
                            onChange={() => setPaymentMethod('instapay')}
                            className="text-purple-600"
                          />
                          <span>{isAr ? 'تحويل InstaPay' : 'InstaPay Transfer'}</span>
                        </label>
                      </div>
                    </div>

                    {/* InstaPay Info Box in Checkout */}
                    {paymentMethod === 'instapay' && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-lg text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 dark:text-purple-200">
                            {isAr ? 'معرف InstaPay الخاص بالمصنع:' : 'Factory InstaPay IPA:'}
                          </span>
                          <span className="font-mono bg-purple-200 dark:bg-purple-900 px-2 py-0.5 rounded text-purple-950 dark:text-purple-100 font-bold">
                            {storeSettings.instapay_handle || 'factory@instapay'}
                          </span>
                        </div>
                        <p className="text-purple-700 dark:text-purple-300 text-[11px]">
                          {storeSettings.instapay_instructions || (isAr ? 'حول المبلغ عبر InstaPay ثم اكتب رقم المعاملة المرجعي هنا:' : 'Transfer via InstaPay and enter reference number:')}
                        </p>
                        <input
                          type="text"
                          required
                          value={instapayRef}
                          onChange={(e) => setInstapayRef(e.target.value)}
                          placeholder={isAr ? 'رقم العملية المرجعي (مثال: IP-987654321)' : 'Transaction Reference (e.g. IP-987654321)'}
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded text-slate-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCheckoutOpen(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" disabled={storeCart.length === 0}>
                  {isAr ? 'تأكيد وإرسال الطلب' : 'Place Order'}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* 4. SETTINGS & INSTAPAY VIEW */}
      {activeSubTab === 'settings' && (
        <Card className="p-6 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm max-w-3xl">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {isAr ? 'إعدادات متجر المصنع وبوابات الدفع' : 'Store Settings & Payment Gateways'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAr ? 'التحكم في إتاحة المتجر، بوابات الدفع المعتمدة، ومعلومات تحويل InstaPay.' : 'Configure store activation, supported gateways, and InstaPay instructions.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم المتجر' : 'Store Name'}
                </label>
                <input
                  type="text"
                  value={storeSettings.store_name}
                  onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اتجاه المتجر' : 'Layout Direction'}
                </label>
                <select
                  value={storeSettings.direction || 'rtl'}
                  onChange={(e) => setStoreSettings({ ...storeSettings, direction: e.target.value as 'rtl' | 'ltr' })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="rtl">{isAr ? 'من اليمين لليسار (RTL - عربي)' : 'RTL (Arabic)'}</option>
                  <option value="ltr">{isAr ? 'من اليسار لليمين (LTR - إنجليزي)' : 'LTR (English)'}</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                {isAr ? 'بوابات الدفع المقبولة' : 'Accepted Payment Methods'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeSettings.allow_cod}
                    onChange={(e) => setStoreSettings({ ...storeSettings, allow_cod: e.target.checked })}
                    className="rounded text-primary focus:ring-primary w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {isAr ? 'الدفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {isAr ? 'تحصيل قيمة الطلب نقداً عند تسليم بضاعة المصنع للعميل' : 'Customer pays upon delivery'}
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storeSettings.allow_instapay}
                    onChange={(e) => setStoreSettings({ ...storeSettings, allow_instapay: e.target.checked })}
                    className="rounded text-purple-600 focus:ring-purple-600 w-4 h-4"
                  />
                  <div>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                      {isAr ? 'التحويل عبر InstaPay' : 'InstaPay Direct Transfer'}
                    </span>
                    <span className="text-[11px] text-purple-700 dark:text-purple-400">
                      {isAr ? 'تحويل بنكي فوري مع مراجعة بشرية قبل الشحن' : 'Instant bank transfer with manual review'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* InstaPay Configuration Fields */}
            {storeSettings.allow_instapay && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-4">
                <h5 className="font-bold text-purple-950 dark:text-purple-200 text-xs flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-purple-600" />
                  {isAr ? 'بيانات حساب InstaPay الخاص بالمصنع' : 'Factory InstaPay Account Details'}
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'اسم صاحب الحساب البنكي' : 'Account Beneficiary Name'}
                    </label>
                    <input
                      type="text"
                      value={storeSettings.instapay_account_name || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, instapay_account_name: e.target.value })}
                      placeholder={isAr ? "شركة الفا للملابس الجاهزة" : "Alpha Apparel Co."}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'عنوان الدفع اللحظي (IPA) أو رقم الموبايل' : 'InstaPay Address (IPA) or Mobile'}
                    </label>
                    <input
                      type="text"
                      value={storeSettings.instapay_handle || ''}
                      onChange={(e) => setStoreSettings({ ...storeSettings, instapay_handle: e.target.value })}
                      placeholder="alpha@instapay"
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'تعليمات التحويل للعميل' : 'Customer Transfer Instructions'}
                  </label>
                  <textarea
                    rows={2}
                    value={storeSettings.instapay_instructions || ''}
                    onChange={(e) => setStoreSettings({ ...storeSettings, instapay_instructions: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3">
              <Button type="submit" disabled={isLoading}>
                {isAr ? 'حفظ التعديلات' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* INSTAPAY PAYMENT REVIEW MODAL */}
      <Modal
        isOpen={Boolean(selectedOrderForReview)}
        onClose={() => setSelectedOrderForReview(null)}
        title={isAr ? 'مراجعة وتدقيق تحويل InstaPay' : 'Audit InstaPay Transfer'}
      >
        {selectedOrderForReview && (
          <div className="space-y-4 text-xs">
            {/* Safety Warning Alert */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">
                  {isAr ? 'قاعدة الأمان المالي P0:' : 'Financial Audit Rule P0:'}
                </p>
                <p className="mt-0.5 text-[11px]">
                  {isAr
                    ? 'يمنع منعاً باتاً اعتماد التحويل بناء على صورة الإيصال فقط. يجب على المدير أو المحاسب فتح تطبيق البنك أو InstaPay والتأكد من استلام المبلغ الفعلي ومطابقة الرقم المرجعي.'
                    : 'Never approve transfer based solely on screenshot. Manually verify bank account balance and transaction reference match.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div>
                <span className="text-slate-400 block">{isAr ? 'رقم الطلب:' : 'Order #:'}</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{selectedOrderForReview.order_number}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'العميل:' : 'Customer:'}</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedOrderForReview.customer_name} ({selectedOrderForReview.customer_phone})</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'المبلغ المستحق:' : 'Amount Due:'}</span>
                <span className="font-bold text-primary text-sm">{Number(selectedOrderForReview.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'الرقم المرجعي (Reference):' : 'InstaPay Ref:'}</span>
                <span className="font-bold text-purple-700 dark:text-purple-300 font-mono bg-purple-100 dark:bg-purple-900/50 px-2 py-0.5 rounded">
                  {selectedOrderForReview.instapay_reference || (isAr ? 'لم يرفق' : 'N/A')}
                </span>
              </div>
            </div>

            {selectedOrderForReview.instapay_receipt_url && (
              <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {isAr ? 'إيصال التحويل المرفق من العميل:' : 'Customer Uploaded Receipt:'}
                </span>
                <a
                  href={selectedOrderForReview.instapay_receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline flex items-center gap-1 font-semibold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {isAr ? 'فتح صورة الإيصال' : 'View Receipt'}
                </a>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سبب الرفض (في حال عدم مطابقة التحويل):' : 'Rejection Reason (if rejected):'}
              </label>
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={isAr ? 'مثال: لم يتم العثور على المبلغ في الكشف البنكي اليومي' : 'e.g. Transaction reference not found in bank statement'}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
                disabled={isReviewing}
                onClick={() => handleVerifyPayment(false)}
              >
                <X className="w-3.5 h-3.5 me-1" />
                {isAr ? 'رفض التحويل' : 'Reject Payment'}
              </Button>

              <Button
                type="button"
                variant="primary"
                disabled={isReviewing}
                onClick={() => handleVerifyPayment(true)}
              >
                <Check className="w-3.5 h-3.5 me-1" />
                {isAr ? 'اعتماد التحويل وتأكيد الدفع' : 'Approve & Mark Paid'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, StoreOrder, ProductVariant } from '../../types';

interface StorefrontTabProps {
  lang: Language;
  variants: ProductVariant[];
}

export const StorefrontTab: React.FC<StorefrontTabProps> = ({ lang, variants }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'preview' | 'settings'>('orders');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<StoreOrder[]>([]);

  const loadStoreOrders = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.storefront.getOrders(1);
      if (res?.data) {
        setOrders(res.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب طلبات المتجر' : 'Failed to load storefront orders'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStoreOrders();
  }, []);

  // Storefront preview cart state
  const [storeCart, setStoreCart] = useState<{ variant: ProductVariant; qty: number }[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custCity, setCustCity] = useState(isAr ? 'القاهرة' : 'Cairo');
  const [orderPlacedMsg, setOrderPlacedMsg] = useState<string | null>(null);

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: StoreOrder['status']) => {
    try {
      const res = await api.storefront.updateOrderStatus(orderId, nextStatus);
      if (res?.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? res.order : o))
        );
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحديث حالة الطلب بالسيرفر' : 'Failed to update order status on server'));
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

      const res = await (api as any).request('/storefront/order', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: custName || (isAr ? 'عميل المتجر' : 'Store Customer'),
          customer_phone: custPhone || '01000000000',
          shipping_address: custAddress || (isAr ? 'عنوان التوصيل' : 'Delivery Address'),
          city: custCity,
          payment_method: 'cod',
          items,
        }),
      });

      if (res?.order) {
        setOrders((prev) => [res.order, ...prev]);
        setOrderPlacedMsg(isAr ? `تم تسجيل طلب الشراء بنجاح برقم: ${res.order.order_number}` : `Order placed successfully! Ref: ${res.order.order_number}`);
      } else {
        setOrderPlacedMsg(isAr ? 'تم تسجيل طلب الشراء بنجاح!' : 'Order placed successfully!');
      }

      setStoreCart([]);
      setIsCheckoutOpen(false);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setTimeout(() => setOrderPlacedMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الطلب' : 'Failed to place order'));
    }
  };

  const cartTotal = storeCart.reduce((sum, i) => sum + (Number(i.variant.retail_price) || 180) * i.qty, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAr ? 'المتجر الإلكتروني والمبيعات المباشرة' : 'Multi-Tenant Digital Storefront'}
        subtitle={isAr
          ? 'إدارة المتجر الإلكتروني، معالجة طلبات الأونلاين، تتبع الشحن، وتكامل المخزون الآني.'
          : 'E-commerce orders management, checkout routing, delivery dispatch, and live stock sync.'}
        icon={<Store className="w-5 h-5" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'المتجر الإلكتروني' : 'Storefront' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeSubTab === 'orders' ? 'primary' : 'outline'}
              onClick={() => setActiveSubTab('orders')}
              icon={<ShoppingBag className="w-3.5 h-3.5" />}
            >
              {isAr ? 'سجل الطلبات' : 'Orders'}
            </Button>
            <Button
              size="sm"
              variant={activeSubTab === 'preview' ? 'primary' : 'outline'}
              onClick={() => setActiveSubTab('preview')}
              icon={<Store className="w-3.5 h-3.5" />}
            >
              {isAr ? 'معاينة المتجر' : 'Storefront Preview'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={loadStoreOrders}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              {isAr ? 'تحديث' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadStoreOrders} className="text-xs py-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل طلبات المتجر وسجل المبيعات...' : 'Loading storefront orders...'}</span>
        </div>
      )}

      {/* Top Storefront KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'طلبات المتجر الإلكتروني' : 'Online Store Orders'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{orders.length}</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {orders.filter((o) => o.status === 'new').length} {isAr ? 'طلب جديد بانتظار الشحن' : 'pending dispatch'}
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
                {isAr ? 'مبيعات المتجر الإلكتروني' : 'Online Sales'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0).toLocaleString()} ج.م
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'دفع عند الاستلام (COD)' : 'Cash on Delivery (COD)'}
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
                {isAr ? 'موديلات معروضة بالمتجر' : 'Live Garment Variants'}
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{variants.length}</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'ربط لحظي مع المخازن' : 'Real-time stock sync'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'حالة متجر المصنع' : 'Storefront Status'}
              </p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {isAr ? 'نشط ويعمل' : 'Live & Active'}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">elnasr.garmentos.store</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <ExternalLink className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'orders'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'إدارة طلبات المتجر والشحن' : 'Store Orders'}
          </button>
          <button
            onClick={() => setActiveSubTab('preview')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'preview'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'معاينة متجر المصنع (Customer View)' : 'Live Storefront Preview'}
          </button>
        </div>
      </div>

      {orderPlacedMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{orderPlacedMsg}</span>
        </div>
      )}

      {/* ORDERS VIEW */}
      {activeSubTab === 'orders' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'طلبات المتجر الإلكتروني الواردة ومسار التوصيل' : 'Incoming E-Commerce Store Orders'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الطلب' : 'Order #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="p-3 text-start">{isAr ? 'المدينة والعنوان' : 'Address'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{o.order_number}</td>
                    <td className="p-3">{o.customer_name}</td>
                    <td className="p-3 font-mono text-xs">{o.customer_phone}</td>
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                      {o.city} - {o.shipping_address}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{o.total_amount.toLocaleString()} ج.م</td>
                    <td className="p-3">
                      {o.status === 'new' && <Badge variant="warning">{isAr ? 'طلب جديد' : 'New'}</Badge>}
                      {o.status === 'confirmed' && <Badge variant="info">{isAr ? 'تم التأكيد' : 'Confirmed'}</Badge>}
                      {o.status === 'shipped' && <Badge variant="brand">{isAr ? 'تم الشحن' : 'Shipped'}</Badge>}
                      {o.status === 'delivered' && <Badge variant="success">{isAr ? 'تم التسليم' : 'Delivered'}</Badge>}
                    </td>
                    <td className="p-3 text-center">
                      {o.status === 'new' && (
                        <Button size="sm" onClick={() => handleUpdateOrderStatus(o.id, 'shipped')}>
                          <Truck className="w-3.5 h-3.5 me-1" />
                          {isAr ? 'تسليم لشركة الشحن' : 'Ship'}
                        </Button>
                      )}
                      {o.status === 'shipped' && (
                        <Button size="sm" variant="outline" onClick={() => handleUpdateOrderStatus(o.id, 'delivered')}>
                          <CheckCircle className="w-3.5 h-3.5 me-1" />
                          {isAr ? 'تأكيد التسليم والتحصيل' : 'Mark Delivered'}
                        </Button>
                      )}
                      {o.status === 'delivered' && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {isAr ? 'تم التحصيل نقداً' : 'Collected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PREVIEW VIEW */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          {/* Store Banner */}
          <div className="rounded-2xl p-6 bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
                {isAr ? 'منفذ المصنع المباشر' : 'Factory Direct Store'}
              </span>
              <h2 className="text-2xl font-black mt-2">
                {isAr ? 'أرقى ملابس الأطفال من المصنع مباشرة إلى باب منزلك' : 'Premium Kids Apparel Direct From Factory'}
              </h2>
              <p className="text-sm text-white/80 mt-1">
                {isAr ? 'قطن مصري 100%، خياطة تصدير فائقة، وأسعار جملة وتجزئة بدون وسيط.' : '100% Egyptian Cotton, Export Quality, Factory Direct Pricing.'}
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

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {variants.map((v) => (
              <Card
                key={v.id}
                className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Package className="w-12 h-12 stroke-[1.2]" />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                    {v.garment_model?.name || v.sku}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>{v.size?.name || v.size_name || 'Size'}</span>
                    <span>•</span>
                    <span>{v.color?.name || v.color_name || 'Color'}</span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {v.sku}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">{isAr ? 'السعر' : 'Price'}</span>
                    <span className="font-bold text-primary text-base">
                      {Number(v.retail_price) > 0 ? Number(v.retail_price) : 180} ج.م
                    </span>
                  </div>
                  <Button size="sm" onClick={() => handleAddToCart(v)}>
                    <ShoppingBag className="w-3.5 h-3.5 me-1" />
                    {isAr ? 'أضف للسلة' : 'Add'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Checkout Modal */}
          <Modal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            title={isAr ? 'سلة المشتريات وإتمام الطلب' : 'Shopping Cart & Checkout'}
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
                        <p className="text-slate-400">{i.variant.size?.name || i.variant.size_name || 'Size'} - {i.variant.color?.name || i.variant.color_name || 'Color'} × {i.qty}</p>
                      </div>
                      <span className="font-bold text-primary">
                        {((Number(i.variant.retail_price) || 180) * i.qty).toLocaleString()} ج.م
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
                      <span>{cartTotal.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>{isAr ? 'رسوم الشحن والتوصيل:' : 'Shipping:'}</span>
                      <span>50 ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>{isAr ? 'الإجمالي النهائي:' : 'Total:'}</span>
                      <span className="text-primary">{(cartTotal + 50).toLocaleString()} ج.م</span>
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

                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                      <span>{isAr ? 'طريقة الدفع: الدفع عند الاستلام نقداً بعد فحص الخامات (COD)' : 'Payment: Cash on Delivery (COD)'}</span>
                    </div>
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
    </div>
  );
};

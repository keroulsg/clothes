import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Search,
  CheckCircle,
  Truck,
  DollarSign,
  PackageCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { Language, SalesOrder, SalesInvoice, ProductVariant } from '../../types';

interface SalesTabProps {
  lang: Language;
  variants: ProductVariant[];
}

export const SalesTab: React.FC<SalesTabProps> = ({ lang, variants }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'quotations' | 'invoices' | 'pos'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);

  const loadSalesData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, invRes] = await Promise.allSettled([
        api.sales.getOrders(1),
        api.sales.getInvoices(1),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        setInvoices(invRes.value.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب بيانات المبيعات' : 'Failed to load sales data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSalesData();
  }, []);

  // POS State
  const [posCart, setPosCart] = useState<{ variantId: string; name: string; price: number; qty: number }[]>([]);
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);

  const handleReserveStock = async (orderId: string) => {
    try {
      const res = await api.sales.reserveOrderStock(orderId);
      if (res?.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'reserved' as const } : o))
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حجز المخزون' : 'Failed to reserve stock'));
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    try {
      const res = await api.sales.fulfillOrder(orderId);
      if (res?.order) {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? res.order : o)));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'fulfilled' as const } : o))
        );
      }
      // Reload invoices
      api.sales.getInvoices(1).then((res) => {
        if (res?.data) setInvoices(res.data);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إتمام تسليم الطلب' : 'Failed to fulfill order'));
    }
  };

  const addToPosCart = (v: ProductVariant) => {
    const name = `${v.garment_model?.name || v.sku} (${v.size?.name || v.size_name || 'Std'} - ${v.color?.name || v.color_name || 'Std'})`;
    const price = Number(v.retail_price) > 0 ? Number(v.retail_price) : 180;

    setPosCart((prev) => {
      const exist = prev.find((i) => i.variantId === v.id);
      if (exist) {
        return prev.map((i) => (i.variantId === v.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { variantId: v.id, name, price, qty: 1 }];
    });
  };

  const handlePosCheckout = async () => {
    if (posCart.length === 0) return;

    try {
      const items = posCart.map((i) => ({
        variant_id: i.variantId,
        description: i.name,
        quantity: i.qty,
        unit_price: i.price,
        tax_rate: 0,
      }));

      const res = await api.sales.processPosSale({
        customer_name: isAr ? 'عميل نقدي - منفذ بيع المصنع' : 'Factory Outlet Cash Client',
        payment_method: 'cash',
        items,
      });

      if (res?.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setPosSuccessMsg(isAr ? `تم إتمام عملية البيع بنجاح برقم: ${res.invoice.invoice_number}` : `POS Sale completed! Receipt: ${res.invoice.invoice_number}`);
      } else {
        setPosSuccessMsg(isAr ? 'تم تسجيل الفاتورة النقدية بنجاح!' : 'POS Cash Sale completed successfully!');
      }
      setPosCart([]);
      setTimeout(() => setPosSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل مبيعات الـ POS' : 'Failed to process POS sale'));
    }
  };

  const posTotal = posCart.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadSalesData} className="text-xs py-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل بيانات المبيعات ونقاط البيع...' : 'Loading sales and POS records...'}</span>
        </div>
      )}

      {/* Top KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي المبيعات المؤكدة' : 'Confirmed Sales'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">60,520 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? '+18% عن الأسبوع الماضي' : '+18% vs last week'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'أوامر البيع النشطة' : 'Active Orders'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{orders.length}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? '1 محجوز المخزون، 1 معتمد' : '1 reserved, 1 confirmed'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'قطع تامة محجوزة للعملاء' : 'Reserved Finished Pieces'}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">350 {isAr ? 'قطعة' : 'pcs'}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'مؤمنة ضد البيع المزدوج' : 'Protected from double-sale'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'مبيعات منفذ المصنع (POS)' : 'Outlet POS Sales'}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">14,850 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'تسليم ودفع نقدي فوري' : 'Instant cash checkout'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Receipt className="w-5 h-5" />
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
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'أوامر البيع وحجز المخزون' : 'Sales Orders'}
          </button>
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'pos'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'نقطة البيع السريعة (POS)' : 'Factory Outlet POS'}
          </button>
          <button
            onClick={() => setActiveSubTab('invoices')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'invoices'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'فواتير المبيعات' : 'Invoices'}
          </button>
        </div>
      </div>

      {/* ORDERS VIEW */}
      {activeSubTab === 'orders' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل أوامر البيع وحالة حجز البضاعة التامة' : 'Sales Orders & Finished Stock Reservation'}
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث برقم الأمر أو العميل...' : 'Search by order # or client...'}
                className="ps-9 pe-4 py-1.5 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'حالة المخزون' : 'Stock Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ التسليم' : 'Delivery Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{order.order_number}</td>
                    <td className="p-3">{order.customer_name}</td>
                    <td className="p-3">
                      <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {order.order_type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{order.total_amount.toLocaleString()} ج.م</td>
                    <td className="p-3">
                      {order.status === 'confirmed' && (
                        <Badge variant="warning">{isAr ? 'بانتظار الحجز' : 'Pending Reservation'}</Badge>
                      )}
                      {order.status === 'reserved' && (
                        <Badge variant="info">{isAr ? 'محجوز بالمخزن' : 'Stock Reserved'}</Badge>
                      )}
                      {order.status === 'fulfilled' && (
                        <Badge variant="success">{isAr ? 'تم الصرف والفوترة' : 'Fulfilled'}</Badge>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{order.expected_delivery_date}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {order.status === 'confirmed' && (
                          <Button size="sm" onClick={() => handleReserveStock(order.id)}>
                            <PackageCheck className="w-3.5 h-3.5 me-1" />
                            {isAr ? 'حجز المخزون' : 'Reserve Stock'}
                          </Button>
                        )}
                        {order.status === 'reserved' && (
                          <Button size="sm" variant="outline" onClick={() => handleFulfillOrder(order.id)}>
                            <Truck className="w-3.5 h-3.5 me-1" />
                            {isAr ? 'صرف وفوترة' : 'Fulfill & Invoice'}
                          </Button>
                        )}
                        {order.status === 'fulfilled' && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 me-1" />
                            {isAr ? 'مكتمل' : 'Completed'}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* POS VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Selector */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-3">
                {isAr ? 'منتجات معرض المصنع الجاهزة للتسليم المباشر' : 'Factory Outlet Available Garments'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {variants.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => addToPosCart(v)}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:border-primary/50 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {v.garment_model?.name || v.sku}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{v.size?.name || v.size_name || 'Size'}</span>
                        <span>•</span>
                        <span>{v.color?.name || v.color_name || 'Color'}</span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1">SKU: {v.sku}</p>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-bold text-primary text-sm">
                        {Number(v.retail_price) > 0 ? Number(v.retail_price) : 180} ج.م
                      </span>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {isAr ? 'متاح' : 'In Stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </Card>
          </div>

          {/* POS Cart & Checkout */}
          <div className="space-y-4">
            <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    {isAr ? 'إيصال البيع النقدي' : 'Instant Cash Receipt'}
                  </h3>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded">
                    {posCart.length} {isAr ? 'بنود' : 'items'}
                  </span>
                </div>

                {posSuccessMsg && (
                  <div className="p-3 mb-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{posSuccessMsg}</span>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {posCart.length === 0 ? (
                    <p className="text-center py-8 text-sm text-slate-400">
                      {isAr ? 'اختر المنتجات من القائمة لإضافتها للإيصال' : 'Click garments to add them to receipt'}
                    </p>
                  ) : (
                    posCart.map((item, idx) => (
                      <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                        <div className="flex-1 pe-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                          <p className="text-slate-400">{item.price} ج.م × {item.qty}</p>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(item.price * item.qty).toLocaleString()} ج.م
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 space-y-3">
                <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>{isAr ? 'الإجمالي المطلوب:' : 'Total Due:'}</span>
                  <span className="text-primary text-xl">{posTotal.toLocaleString()} ج.م</span>
                </div>

                <Button
                  className="w-full justify-center text-sm py-2.5 font-bold"
                  disabled={posCart.length === 0}
                  onClick={handlePosCheckout}
                >
                  <DollarSign className="w-4 h-4 me-1" />
                  {isAr ? 'إتمام الدفع وطباعة الإيصال' : 'Complete Cash Sale'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* INVOICES VIEW */}
      {activeSubTab === 'invoices' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'فواتير المبيعات الضريبية وإيصالات نقطة البيع' : 'Tax Sales Invoices & POS Receipts'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                    <td className="p-3">{inv.customer_name}</td>
                    <td className="p-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        {inv.invoice_type}
                      </span>
                    </td>
                    <td className="p-3 capitalize">{inv.payment_method.replace('_', ' ')}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{inv.total_amount.toLocaleString()} ج.م</td>
                    <td className="p-3">
                      <Badge variant="success">{inv.status}</Badge>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{inv.invoice_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

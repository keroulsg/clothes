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
  Plus,
  Eye,
  Printer,
  FileText,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { api } from '../../api/client';
import type { Language, SalesOrder, SalesInvoice, ProductVariant, Quotation } from '../../types';

interface SalesTabProps {
  lang: Language;
  variants: ProductVariant[];
}

export const SalesTab: React.FC<SalesTabProps> = ({ lang, variants }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'quotations' | 'invoices' | 'pos' | 'deliveries'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<SalesOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Order Form State
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderType, setNewOrderType] = useState<'wholesale' | 'retail' | 'outlet' | 'custom'>('wholesale');
  const [newOrderVariantId, setNewOrderVariantId] = useState('');
  const [newOrderQty, setNewOrderQty] = useState<number>(50);
  const [newOrderPrice, setNewOrderPrice] = useState<number>(180);
  const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('');

  // New Quotation Form State
  const [newQuoteCustomer, setNewQuoteCustomer] = useState('');
  const [newQuoteDesc, setNewQuoteDesc] = useState('');
  const [newQuoteQty, setNewQuoteQty] = useState<number>(100);
  const [newQuotePrice, setNewQuotePrice] = useState<number>(165);
  const [newQuoteValidity, setNewQuoteValidity] = useState('');

  const loadSalesData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, invRes, quotesRes, delivRes] = await Promise.allSettled([
        api.sales.getOrders(1),
        api.sales.getInvoices(1),
        api.sales.getQuotations(1),
        api.sales.getDeliveryNotes(1),
      ]);

      if (ordersRes.status === 'fulfilled' && ordersRes.value?.data) {
        setOrders(ordersRes.value.data);
      }
      if (invRes.status === 'fulfilled' && invRes.value?.data) {
        setInvoices(invRes.value.data);
      }
      if (quotesRes.status === 'fulfilled' && quotesRes.value?.data) {
        setQuotations(quotesRes.value.data);
      }
      if (delivRes.status === 'fulfilled' && delivRes.value?.data) {
        setDeliveryNotes(delivRes.value.data);
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

  useEffect(() => {
    if (variants.length > 0 && !newOrderVariantId) {
      setNewOrderVariantId(variants[0].id);
      const p = Number(variants[0].retail_price) > 0 ? Number(variants[0].retail_price) : 180;
      setNewOrderPrice(p);
    }
  }, [variants, newOrderVariantId]);

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
      api.sales.getInvoices(1).then((invRes) => {
        if (invRes?.data) setInvoices(invRes.data);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إتمام تسليم الطلب' : 'Failed to fulfill order'));
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer || !newOrderVariantId || newOrderQty <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const selectedVariant = variants.find((v) => v.id === newOrderVariantId);
      const res = await api.sales.createOrder({
        customer_name: newOrderCustomer,
        order_type: newOrderType,
        expected_delivery_date: newOrderDeliveryDate || undefined,
        items: [
          {
            variant_id: newOrderVariantId,
            description: selectedVariant ? `${selectedVariant.garment_model?.name || selectedVariant.sku}` : 'Garment item',
            ordered_quantity: newOrderQty,
            unit_price: newOrderPrice,
            tax_rate: 0,
          },
        ],
      });

      if (res?.order) {
        setOrders((prev) => [res.order, ...prev]);
      } else {
        await loadSalesData();
      }
      setIsOrderModalOpen(false);
      setNewOrderCustomer('');
      setNewOrderQty(50);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل أمر البيع' : 'Failed to create sales order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteCustomer || !newQuoteDesc || newQuoteQty <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.sales.createQuotation({
        customer_name: newQuoteCustomer,
        valid_until: newQuoteValidity || undefined,
        items: [
          {
            description: newQuoteDesc,
            quantity: newQuoteQty,
            unit_price: newQuotePrice,
            tax_rate: 0,
          },
        ],
      });

      if (res?.quotation) {
        setQuotations((prev) => [res.quotation, ...prev]);
      } else {
        await loadSalesData();
      }
      setIsQuotationModalOpen(false);
      setNewQuoteCustomer('');
      setNewQuoteDesc('');
      setNewQuoteQty(100);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء عرض السعر' : 'Failed to create quotation'));
    } finally {
      setIsSubmitting(false);
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

  // Real server-backed dynamic calculations
  const totalConfirmedSales = orders
    .filter((o) => ['confirmed', 'reserved', 'fulfilled'].includes(o.status))
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const reservedPieces = orders
    .filter((o) => o.status === 'reserved')
    .reduce((sum, o) => {
      const itemsCount = o.items?.reduce((isum, it) => isum + (Number(it.reserved_quantity) || Number(it.ordered_quantity) || 0), 0) || 0;
      return sum + (itemsCount > 0 ? itemsCount : 1);
    }, 0);

  const posSalesTotal = invoices
    .filter((i) => i.invoice_type === 'pos_receipt' || i.payment_method === 'cash')
    .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);

  const filteredOrders = orders.filter((o) =>
    o.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Top Dynamic KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي المبيعات المؤكدة' : 'Confirmed Sales'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalConfirmedSales.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'بيانات حية من السيرفر' : 'Server-backed totals'}
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
                {isAr ? 'أوامر البيع المسجلة' : 'Active Orders'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{orders.length}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {orders.filter((o) => o.status === 'reserved').length} {isAr ? 'محجوز' : 'reserved'} • {orders.filter((o) => o.status === 'confirmed').length} {isAr ? 'معتمد' : 'confirmed'}
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
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {reservedPieces.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
              </p>
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
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {posSalesTotal.toLocaleString()} ج.م
              </p>
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
            onClick={() => setActiveSubTab('quotations')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'quotations'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'عروض الأسعار' : 'Quotations'}
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
          <button
            onClick={() => setActiveSubTab('deliveries')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'deliveries'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'إذون التسليم والشحن' : 'Delivery Notes'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'orders' && (
            <Button size="sm" onClick={() => setIsOrderModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'أمر بيع جديد' : 'New Sales Order'}
            </Button>
          )}
          {activeSubTab === 'quotations' && (
            <Button size="sm" onClick={() => setIsQuotationModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'عرض سعر جديد' : 'New Quotation'}
            </Button>
          )}
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد أوامر بيع مسجلة حالياً' : 'No sales orders found'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{order.order_number}</td>
                      <td className="p-3">{order.customer_name}</td>
                      <td className="p-3">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {order.order_type}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {Number(order.total_amount).toLocaleString()} ج.م
                      </td>
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
                      <td className="p-3 text-slate-500 dark:text-slate-400">{order.expected_delivery_date || '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
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
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
                              {
                                id: 'view',
                                label: isAr ? 'معاينة تفاصيل الأمر' : 'View Details',
                                icon: <Eye className="w-3.5 h-3.5 text-blue-500" />,
                                onClick: () => setSelectedOrderForView(order),
                              },
                              {
                                id: 'print',
                                label: isAr ? 'طباعة بطاقة التعبئة والأمر' : 'Print Order / Slip',
                                icon: <Printer className="w-3.5 h-3.5 text-slate-500" />,
                                onClick: () => {
                                  setSelectedOrderForView(order);
                                  setTimeout(() => window.print(), 300);
                                },
                              },
                              ...(order.status === 'confirmed'
                                ? [
                                    {
                                      id: 'reserve-action',
                                      label: isAr ? 'تأكيد حجز المخزون التام' : 'Reserve Finished Stock',
                                      icon: <PackageCheck className="w-3.5 h-3.5 text-emerald-500" />,
                                      onClick: () => handleReserveStock(order.id),
                                    },
                                  ]
                                : []),
                              ...(order.status === 'reserved'
                                ? [
                                    {
                                      id: 'fulfill-action',
                                      label: isAr ? 'إصدار إذن الصرف والفاتورة' : 'Fulfill & Invoice',
                                      icon: <Truck className="w-3.5 h-3.5 text-primary" />,
                                      onClick: () => handleFulfillOrder(order.id),
                                    },
                                  ]
                                : []),
                            ]}
                          />
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

      {/* QUOTATIONS VIEW */}
      {activeSubTab === 'quotations' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل عروض الأسعار الصادرة للعملاء' : 'Customer Quotations Register'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم العرض' : 'Quote #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'صالح حتى' : 'Valid Until'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد عروض أسعار مسجلة' : 'No quotations recorded'}
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{q.quotation_number}</td>
                      <td className="p-3">{q.customer_name}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {Number(q.total_amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-slate-500">{q.valid_until || '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant="info">{q.status}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-quote',
                              label: isAr ? 'طباعة عرض السعر' : 'Print Quotation',
                              icon: <Printer className="w-3.5 h-3.5 text-slate-500" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'convert-order',
                              label: isAr ? 'تحويل لأمر بيع' : 'Convert to Sales Order',
                              icon: <FileText className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => {
                                setNewOrderCustomer(q.customer_name);
                                setNewOrderPrice(Number(q.total_amount));
                                setIsOrderModalOpen(true);
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* POS VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد فواتير مبيعات مسجلة' : 'No invoices found'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                      <td className="p-3">{inv.customer_name}</td>
                      <td className="p-3">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {inv.invoice_type}
                        </span>
                      </td>
                      <td className="p-3 capitalize">{inv.payment_method?.replace('_', ' ')}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {Number(inv.total_amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3">
                        <Badge variant="success">{inv.status}</Badge>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{inv.invoice_date}</td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-inv',
                              label: isAr ? 'طباعة الفاتورة الضريبية' : 'Print Tax Invoice',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'receipt-note',
                              label: isAr ? 'سند القبض المالي' : 'Linked Receipt',
                              icon: <Receipt className="w-3.5 h-3.5 text-emerald-500" />,
                              onClick: () => {
                                alert(isAr ? `الفاتورة ${inv.invoice_number} مسددة ومسجلة في الحسابات` : `Invoice ${inv.invoice_number} is posted.`);
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* DELIVERIES VIEW */}
      {activeSubTab === 'deliveries' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'إذون تسليم وشحن طلبيات المبيعات' : 'Sales Delivery Notes & Dispatch'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الإذن' : 'Delivery #'}</th>
                  <th className="p-3 text-start">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                  <th className="p-3 text-start">{isAr ? 'شركة الشحن' : 'Carrier'}</th>
                  <th className="p-3 text-start">{isAr ? 'رقم التتبع' : 'Tracking #'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ التسليم' : 'Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {deliveryNotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد إذون تسليم مسجلة' : 'No delivery notes recorded'}
                    </td>
                  </tr>
                ) : (
                  deliveryNotes.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{d.delivery_number}</td>
                      <td className="p-3">{d.sales_order?.order_number || d.sales_order_id}</td>
                      <td className="p-3">{d.shipping_carrier || '—'}</td>
                      <td className="p-3 font-mono text-xs">{d.tracking_number || '—'}</td>
                      <td className="p-3 text-slate-500">{d.delivery_date || '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant="success">{d.status}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-waybill',
                              label: isAr ? 'طباعة بوليصة التسليم' : 'Print Waybill',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: New Sales Order */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={isAr ? 'إنشاء أمر بيع جديد' : 'Create Sales Order'}
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العميل *' : 'Customer Name *'}
            </label>
            <input
              type="text"
              required
              value={newOrderCustomer}
              onChange={(e) => setNewOrderCustomer(e.target.value)}
              placeholder={isAr ? 'مثال: شركة النصر للملابس الجاهزة' : 'e.g. Al-Nasr Apparel'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع الأمر' : 'Order Type'}
              </label>
              <select
                value={newOrderType}
                onChange={(e) => setNewOrderType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="wholesale">{isAr ? 'جملة' : 'Wholesale'}</option>
                <option value="retail">{isAr ? 'تجزئة' : 'Retail'}</option>
                <option value="outlet">{isAr ? 'منفذ بيع' : 'Outlet'}</option>
                <option value="custom">{isAr ? 'تصنيع خاص' : 'Custom'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ التسليم المتوقع' : 'Delivery Date'}
              </label>
              <input
                type="date"
                value={newOrderDeliveryDate}
                onChange={(e) => setNewOrderDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الموديل / المنتج *' : 'Garment Variant *'}
            </label>
            <select
              value={newOrderVariantId}
              onChange={(e) => {
                setNewOrderVariantId(e.target.value);
                const v = variants.find((item) => item.id === e.target.value);
                if (v && Number(v.retail_price) > 0) {
                  setNewOrderPrice(Number(v.retail_price));
                }
              }}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.garment_model?.name || v.sku} ({v.size?.name || v.size_name || 'Std'} - {v.color?.name || v.color_name || 'Std'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية المطلوبة' : 'Quantity'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={newOrderQty}
                onChange={(e) => setNewOrderQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'سعر الوحدة (ج.م)' : 'Unit Price (EGP)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newOrderPrice}
                onChange={(e) => setNewOrderPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs flex justify-between font-bold text-slate-900 dark:text-white">
            <span>{isAr ? 'إجمالي أمر البيع:' : 'Order Total:'}</span>
            <span className="text-primary text-sm">{(newOrderQty * newOrderPrice).toLocaleString()} ج.م</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOrderModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التسجيل...' : 'Creating...'}
                </>
              ) : (
                isAr ? 'تأكيد وحفظ أمر البيع' : 'Save Sales Order'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Quotation */}
      <Modal
        isOpen={isQuotationModalOpen}
        onClose={() => setIsQuotationModalOpen(false)}
        title={isAr ? 'إنشاء عرض سعر جديد' : 'Create Quotation'}
      >
        <form onSubmit={handleCreateQuotation} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العميل / الجهة *' : 'Customer Name *'}
            </label>
            <input
              type="text"
              required
              value={newQuoteCustomer}
              onChange={(e) => setNewQuoteCustomer(e.target.value)}
              placeholder={isAr ? 'مثال: محلات النجوم للملابس' : 'e.g. Stars Garment Retail'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'بيان وتفاصيل العرض *' : 'Quotation Item Description *'}
            </label>
            <input
              type="text"
              required
              value={newQuoteDesc}
              onChange={(e) => setNewQuoteDesc(e.target.value)}
              placeholder={isAr ? 'قميص رجالي قطن مقاسات L/XL/XXL' : 'Men cotton shirt assortment'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية' : 'Quantity'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={newQuoteQty}
                onChange={(e) => setNewQuoteQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'السعر المقترح (ج.م)' : 'Quoted Price (EGP)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={newQuotePrice}
                onChange={(e) => setNewQuotePrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'صلاحية العرض حتى' : 'Valid Until'}
            </label>
            <input
              type="date"
              value={newQuoteValidity}
              onChange={(e) => setNewQuoteValidity(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsQuotationModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الإصدار...' : 'Creating...'}
                </>
              ) : (
                isAr ? 'إصدار عرض السعر' : 'Issue Quotation'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Sales Order Details */}
      {selectedOrderForView && (
        <Modal
          isOpen={!!selectedOrderForView}
          onClose={() => setSelectedOrderForView(null)}
          title={`${isAr ? 'تفاصيل أمر البيع رقم: ' : 'Sales Order Details: '}${selectedOrderForView.order_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'اسم العميل' : 'Customer Name'}</p>
                <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{selectedOrderForView.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'نوع الطلب' : 'Order Type'}</p>
                <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 mt-1 inline-block">
                  {selectedOrderForView.order_type}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'حالة التجهيز والمخزون' : 'Status'}</p>
                <div className="mt-1">
                  {selectedOrderForView.status === 'confirmed' && <Badge variant="warning">{isAr ? 'بانتظار الحجز' : 'Pending'}</Badge>}
                  {selectedOrderForView.status === 'reserved' && <Badge variant="info">{isAr ? 'محجوز بالمخزن' : 'Reserved'}</Badge>}
                  {selectedOrderForView.status === 'fulfilled' && <Badge variant="success">{isAr ? 'تم الصرف والفوترة' : 'Fulfilled'}</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isAr ? 'تاريخ التسليم' : 'Delivery Date'}</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{selectedOrderForView.expected_delivery_date || '—'}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {isAr ? 'بنود الطلبية المحجوزة' : 'Order Items & Variants'}
              </h4>
              {selectedOrderForView.items && selectedOrderForView.items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedOrderForView.items.map((it, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {it.variant ? `${it.variant.size} - ${it.variant.color}` : `Variant #${it.variant_id}`}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {isAr ? 'مطلوب: ' : 'Qty: '}{it.ordered_quantity} • {isAr ? 'محجوز: ' : 'Reserved: '}{it.reserved_quantity}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {Number(it.total_price || (it.ordered_quantity * it.unit_price)).toLocaleString()} ج.م
                        </span>
                        <div className="text-[11px] text-slate-400">@{Number(it.unit_price).toLocaleString()} ج.م</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">
                  {isAr ? 'بند طلبية شامل مخصص للموديلات الجاهزة' : 'Standard catalog line item'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {isAr ? 'إجمالي قيمة الأمر المستحقة:' : 'Total Order Amount:'}
              </span>
              <span className="text-xl font-extrabold text-primary">
                {Number(selectedOrderForView.total_amount).toLocaleString()} ج.م
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                {isAr ? 'طباعة أمر البيع والتسليم' : 'Print Sales Slip'}
              </Button>
              <Button type="button" variant="primary" onClick={() => setSelectedOrderForView(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

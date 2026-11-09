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
  RotateCcw,
  BookOpen,
  Pencil,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { PageHeader } from '../ui/PageHeader';
import { SalesReturnModal } from './SalesReturnModal';
import { PosReceiptModal } from './PosReceiptModal';
import { CreateCustomerModal } from './CreateCustomerModal';
import { CustomerStatementModal } from './CustomerStatementModal';
import { api } from '../../api/client';
import type { Language, SalesOrder, SalesInvoice, ProductVariant, Quotation, SalesReturn, Customer } from '../../types';

interface SalesTabProps {
  lang?: Language;
  isAr?: boolean;
  variants: ProductVariant[];
}

export const SalesTab: React.FC<SalesTabProps> = ({ lang = 'ar', isAr: propIsAr, variants }) => {
  const isAr = propIsAr !== undefined ? propIsAr : lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'quotations' | 'invoices' | 'customers' | 'returns' | 'pos' | 'deliveries' | 'payments'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<any[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);

  // Modals
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCustomerStatementOpen, setIsCustomerStatementOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<Customer | null>(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState<SalesOrder | null>(null);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<SalesInvoice | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<SalesInvoice | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
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

  // Payment Form State
  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'check'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentInvoiceId, setPaymentInvoiceId] = useState('');

  // POS State & Barcode
  const [posCart, setPosCart] = useState<{ variantId: string; name: string; price: number; qty: number }[]>([]);
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const loadSalesData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, invRes, quotesRes, delivRes, returnsRes, custRes, payRes, credRes] = await Promise.allSettled([
        api.sales.getOrders(1),
        api.sales.getInvoices(1),
        api.sales.getQuotations(1),
        api.sales.getDeliveryNotes(1),
        api.sales.getReturns(1),
        api.customers.getCustomers(),
        api.sales.getPayments(1),
        api.sales.getCreditNotes(1),
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
      if (returnsRes.status === 'fulfilled' && returnsRes.value?.data) {
        setSalesReturns(returnsRes.value.data);
      }
      if (custRes.status === 'fulfilled' && custRes.value?.data) {
        setCustomers(custRes.value.data);
      }
      if (payRes.status === 'fulfilled' && payRes.value?.data) {
        setPayments(payRes.value.data);
      }
      if (credRes.status === 'fulfilled' && credRes.value?.data) {
        setCreditNotes(credRes.value.data);
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
    const posPrice = Number(v.pos_price || v.effective_pos_price || v.product?.pos_price);
    const price = posPrice > 0 ? posPrice : (Number(v.retail_price) > 0 ? Number(v.retail_price) : 0);

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
        setSelectedInvoiceForReceipt(res.invoice);
        setIsReceiptModalOpen(true);
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

  const handleConvertQuotation = async (quotationId: string) => {
    if (!confirm(isAr ? 'هل تريد تأكيد تحويل عرض السعر إلى أمر بيع رسمي؟' : 'Convert this quotation into a sales order?')) {
      return;
    }
    setIsLoading(true);
    try {
      await api.sales.convertQuotation(quotationId);
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحويل عرض السعر إلى أمر بيع' : 'Failed to convert quotation'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const reason = prompt(isAr ? 'يرجى إدخال سبب إلغاء أمر البيع:' : 'Please enter cancellation reason:');
    if (reason === null) return;
    setIsLoading(true);
    try {
      await api.sales.cancelOrder(orderId, reason || 'Cancelled by user');
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إلغاء أمر البيع' : 'Failed to cancel sales order'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliverOrder = async (orderId: string) => {
    setIsLoading(true);
    try {
      await api.sales.deliverOrder(orderId, { notes: 'Delivered from sales portal' });
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسليم وشحن الطلب' : 'Failed to deliver order'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDeliveryNote = async (deliveryId: string) => {
    const reason = prompt(isAr ? 'يرجى إدخال سبب إلغاء إذن التسليم:' : 'Please enter delivery cancellation reason:');
    if (reason === null) return;
    setIsLoading(true);
    try {
      await api.sales.cancelDeliveryNote(deliveryId, reason || 'Cancelled by user');
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إلغاء إذن التسليم' : 'Failed to cancel delivery note'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    const reason = prompt(isAr ? 'يرجى إدخال سبب إلغاء الفاتورة:' : 'Please enter invoice cancellation reason:');
    if (reason === null) return;
    setIsLoading(true);
    try {
      await api.sales.cancelInvoice(invoiceId, reason || 'Cancelled by user');
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إلغاء الفاتورة' : 'Failed to cancel invoice'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    try {
      const res = await api.sales.lookupBarcode(barcodeInput.trim());
      const foundVariant = (res as any)?.variant || (res as any)?.item;
      if (foundVariant) {
        addToPosCart(foundVariant);
        setBarcodeInput('');
      } else {
        setErrorMsg(isAr ? 'لم يتم العثور على صنف بالباركود المدخل' : 'Barcode not found');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'باركود غير صالح' : 'Invalid barcode'));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentCustomerId || paymentAmount <= 0) {
      setErrorMsg(isAr ? 'يرجى اختيار العميل وتحديد مبلغ التحصيل' : 'Select customer and amount');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.sales.recordPayment({
        customer_id: paymentCustomerId,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        sales_invoice_id: paymentInvoiceId || undefined,
        notes: paymentNotes || undefined,
      });
      setIsRecordPaymentOpen(false);
      setPaymentCustomerId('');
      setPaymentAmount(0);
      setPaymentNotes('');
      setPaymentInvoiceId('');
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل سند القبض' : 'Failed to record customer payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReversePayment = async (paymentId: string) => {
    const reason = prompt(isAr ? 'يرجى إدخال سبب عكس / إلغاء سند القبض:' : 'Please enter payment reversal reason:');
    if (reason === null) return;
    setIsLoading(true);
    try {
      await api.sales.reversePayment(paymentId, reason || 'Reversed by user');
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل عكس سند القبض' : 'Failed to reverse payment'));
    } finally {
      setIsLoading(false);
    }
  };

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
      <PageHeader
        title={isAr ? 'إدارة المبيعات ونقاط البيع (POS)' : 'Commercial Sales & POS'}
        subtitle={isAr
          ? 'إدارة أوامر البيع للعملاء، إصدار عروض الأسعار، ونقطة بيع فورية (POS).'
          : 'Customer sales orders, quotations, invoices, and factory POS terminal.'}
        icon={<TrendingUp className="w-5 h-5 text-[var(--brand-primary)] dark:text-[#F87171]" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'المبيعات ونقطة البيع' : 'Sales & POS' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsOrderModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {isAr ? '+ أمر بيع جديد' : '+ New Sales Order'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQuotationModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {isAr ? '+ عرض سعر' : '+ New Quote'}
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
                {totalConfirmedSales.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
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
                {posSalesTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
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
            onClick={() => setActiveSubTab('returns')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'returns'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مرتجعات المبيعات والدائن' : 'Returns & Credits'}
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
          <button
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'customers'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'دليل العملاء والحسابات' : 'Customers & Accounts'}
          </button>
          <button
            onClick={() => setActiveSubTab('payments')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'payments'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'سندات القبض والتحصيل' : 'Customer Receipts'}
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
          {activeSubTab === 'customers' && (
            <Button size="sm" onClick={() => {
              setSelectedCustomerForEdit(null);
              setIsCreateCustomerOpen(true);
            }}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'تسجيل عميل جديد' : 'New Customer'}
            </Button>
          )}
          {activeSubTab === 'payments' && (
            <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'تسجيل سند قبض' : 'Record Receipt'}
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
                        {Number(order.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
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
                              ...(order.status === 'confirmed' || order.status === 'reserved'
                                ? [
                                    {
                                      id: 'deliver-action',
                                      label: isAr ? 'تسليم وشحن الطلب' : 'Deliver & Dispatch',
                                      icon: <Truck className="w-3.5 h-3.5 text-blue-500" />,
                                      onClick: () => handleDeliverOrder(order.id),
                                    },
                                    {
                                      id: 'cancel-order',
                                      label: isAr ? 'إلغاء أمر البيع' : 'Cancel Sales Order',
                                      icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500" />,
                                      onClick: () => handleCancelOrder(order.id),
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
                        {Number(q.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
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
                              label: isAr ? 'تحويل لأمر بيع رسمي' : 'Convert to Sales Order',
                              icon: <FileText className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => handleConvertQuotation(q.id),
                              disabled: q.status === 'converted' || q.status === 'rejected',
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
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {isAr ? 'منتجات معرض المصنع الجاهزة للتسليم المباشر' : 'Factory Outlet Available Garments'}
                </h3>
                <form onSubmit={handleBarcodeScan} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder={isAr ? 'مسح الباركود (EAN-13)...' : 'Scan barcode...'}
                    className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-1 focus:ring-primary w-48"
                  />
                  <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">
                    {isAr ? 'إضافة' : 'Scan'}
                  </Button>
                </form>
              </div>
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
                      <div>
                        <span className="font-bold text-primary text-sm">
                          {Number(v.pos_price || v.effective_pos_price || v.product?.pos_price || v.retail_price || 0)} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                        {(v.pos_price || v.effective_pos_price || v.product?.pos_price) ? (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-medium">
                            {isAr ? 'سعر المعرض' : 'POS Price'}
                          </span>
                        ) : null}
                      </div>
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
                          <p className="text-slate-400">{item.price} {isAr ? 'ج.م' : 'EGP'} × {item.qty}</p>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {(item.price * item.qty).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 mt-4 space-y-3">
                <div className="flex items-center justify-between text-base font-bold text-slate-900 dark:text-white">
                  <span>{isAr ? 'الإجمالي المطلوب:' : 'Total Due:'}</span>
                  <span className="text-primary text-xl">{posTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
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
                        {Number(inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            inv.status === 'paid'
                              ? 'success'
                              : inv.status === 'refunded'
                              ? 'danger'
                              : inv.status === 'partially_refunded'
                              ? 'warning'
                              : inv.status === 'credited'
                              ? 'info'
                              : inv.status === 'partially_credited'
                              ? 'warning'
                              : inv.status === 'issued'
                              ? 'neutral'
                              : 'danger'
                          }
                        >
                          {isAr
                            ? inv.status === 'paid'
                              ? 'مسددة'
                              : inv.status === 'refunded'
                              ? 'مستردة نقداً'
                              : inv.status === 'partially_refunded'
                              ? 'مستردة جزئياً نقداً'
                              : inv.status === 'credited'
                              ? 'إشعار دائن (مرتجع)'
                              : inv.status === 'partially_credited'
                              ? 'إشعار دائن جزئي'
                              : inv.status === 'issued'
                              ? 'صادرة'
                              : inv.status === 'void'
                              ? 'ملغاة'
                              : inv.status
                            : inv.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{inv.invoice_date}</td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-receipt-80mm',
                              label: isAr ? 'طباعة إيصال حراري (80mm)' : 'Print POS Receipt (80mm)',
                              icon: <Receipt className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
                              onClick: async () => {
                                setSelectedInvoiceForReceipt(inv);
                                setIsReceiptModalOpen(true);
                                try {
                                  const fresh = await api.sales.getInvoice(inv.id);
                                  if (fresh?.invoice) {
                                    setSelectedInvoiceForReceipt(fresh.invoice);
                                  }
                                } catch {
                                  // Fallback to currently selected invoice
                                }
                              },
                            },
                            {
                              id: 'sales-return',
                              label: isAr ? 'إرجاع مبيعات وإشعار دائن' : 'Sales Return & Credit Note',
                              icon: <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
                              onClick: () => {
                                setSelectedInvoiceForReturn(inv);
                                setIsReturnModalOpen(true);
                              },
                              disabled: inv.status === 'void',
                            },
                            {
                              id: 'print-inv',
                              label: isAr ? 'طباعة الفاتورة الضريبية' : 'Print Tax Invoice',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'cancel-inv',
                              label: isAr ? 'إلغاء الفاتورة' : 'Cancel Invoice',
                              icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500" />,
                              onClick: () => handleCancelInvoice(inv.id),
                              disabled: inv.status === 'void' || Number(inv.paid_amount) > 0,
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
                            {
                              id: 'cancel-delivery',
                              label: isAr ? 'إلغاء إذن التسليم' : 'Cancel Delivery Note',
                              icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500" />,
                              onClick: () => handleCancelDeliveryNote(d.id),
                              disabled: d.status === 'cancelled',
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

      {/* CUSTOMERS VIEW */}
      {activeSubTab === 'customers' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'دليل العملاء التجاريين وكشوف الحسابات المعتمدة' : 'Commercial Customers Directory & Statements'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'متابعة حسابات عملاء الجملة والتجزئة، المديونيات، وسجل الفواتير والمرتجعات.' : 'Manage wholesale/retail customer ledgers, credit balances, and order histories.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => {
                setSelectedCustomerForEdit(null);
                setIsCreateCustomerOpen(true);
              }} icon={<Plus className="w-3.5 h-3.5" />}>
                {isAr ? 'تسجيل عميل جديد' : 'New Customer'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود العميل' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العميل / المتجر' : 'Client Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'مسؤول الاتصال' : 'Contact Person'}</th>
                  <th className="p-3 text-start">{isAr ? 'الهاتف' : 'Phone'}</th>
                  <th className="p-3 text-end">{isAr ? 'إجمالي المبيعات' : 'Total Invoiced'}</th>
                  <th className="p-3 text-end font-bold">{isAr ? 'الرصيد المستحق' : 'Balance Due'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-sans text-xs">
                      {isAr ? 'لا يوجد عملاء مسجلون حالياً. اضغط على "تسجيل عميل جديد" لإضافة أول عميل.' : 'No customers registered yet. Click "New Customer" to add one.'}
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{c.code}</td>
                      <td className="p-3 font-sans font-medium text-slate-800 dark:text-slate-200">{c.name}</td>
                      <td className="p-3 font-sans text-slate-600 dark:text-slate-400">{c.contact_person || '—'}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{c.phone || '—'}</td>
                      <td className="p-3 text-end text-slate-900 dark:text-white font-bold">
                        {c.total_invoiced ? Number(c.total_invoiced).toLocaleString() : '0'} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-end font-bold">
                        <span className={c.current_balance && c.current_balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {Number(c.current_balance || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <Badge variant={c.is_active ? 'success' : 'neutral'}>
                          {c.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setSelectedCustomerForStatement(c);
                              setIsCustomerStatementOpen(true);
                            }}
                            icon={<BookOpen className="w-3 h-3 text-primary" />}
                          >
                            {isAr ? 'كشف الحساب' : 'Statement'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setSelectedCustomerForEdit(c);
                              setIsCreateCustomerOpen(true);
                            }}
                            title={isAr ? 'تعديل بيانات العميل' : 'Edit Customer Profile'}
                          >
                            <Pencil className="w-3 h-3 text-slate-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                            onClick={() => {
                              setNewOrderCustomer(c.name);
                              setIsOrderModalOpen(true);
                            }}
                            title={isAr ? 'إنشاء أمر بيع لهذا العميل' : 'New order for this customer'}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
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

      {/* Modal: New Sales Order */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={isAr ? 'إنشاء أمر بيع جديد' : 'Create Sales Order'}
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'اسم العميل *' : 'Customer Name *'}
              </label>
              <button
                type="button"
                onClick={() => setIsCreateCustomerOpen(true)}
                className="text-xs text-primary hover:underline font-medium"
              >
                {isAr ? '+ تسجيل عميل جديد' : '+ New Customer'}
              </button>
            </div>
            {customers.length > 0 ? (
              <select
                value={newOrderCustomer}
                onChange={(e) => setNewOrderCustomer(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">{isAr ? '— اختر العميل المسجل —' : '— Select Registered Customer —'}</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.code} - {c.name} {c.current_balance ? `(${isAr ? 'رصيد:' : 'Bal:'} ${Number(c.current_balance).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                value={newOrderCustomer}
                onChange={(e) => setNewOrderCustomer(e.target.value)}
                placeholder={isAr ? 'مثال: شركة النصر للملابس الجاهزة' : 'e.g. Al-Nasr Apparel'}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            )}
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
              />
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
            <span className="text-primary text-sm">{(newOrderQty * newOrderPrice).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
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
                          {Number(it.total_price || (it.ordered_quantity * it.unit_price)).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                        <div className="text-[11px] text-slate-400">@{Number(it.unit_price).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</div>
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
                {Number(selectedOrderForView.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
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

      {/* SALES RETURNS VIEW */}
      {activeSubTab === 'returns' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[var(--brand-primary)] dark:text-[#F87171]" />
              {isAr ? 'سجل مرتجعات المبيعات وإشعارات الدائن المعتمدة' : 'Sales Returns & Approved Credit Notes'}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {salesReturns.length} {isAr ? 'مرتجع' : 'returns'} • {creditNotes.length} {isAr ? 'إشعار دائن' : 'credit notes'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم المرتجع' : 'Return #'}</th>
                  <th className="p-3 text-start">{isAr ? 'الفاتورة الأصلية' : 'Source Invoice'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'المخزن المستلم' : 'Warehouse'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ المرتجع' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي القيمة' : 'Credit Amount'}</th>
                  <th className="p-3 text-center">{isAr ? 'حالة المخزن' : 'Restock'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإشعار المالي' : 'Refund / Credit'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {salesReturns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد مرتجعات مبيعات مسجلة حتى الآن' : 'No sales returns on record'}
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((ret: any) => (
                    <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">
                        {ret.return_number}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {ret.sales_invoice?.invoice_number || ret.sales_order?.order_number || '—'}
                      </td>
                      <td className="p-3">{ret.customer?.name || (isAr ? 'عميل تجزئة' : 'Retail Customer')}</td>
                      <td className="p-3 text-xs">{ret.warehouse?.name || (isAr ? 'مخزن تام' : 'Finished Goods WH')}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{ret.return_date}</td>
                      <td className="p-3 font-bold text-[var(--brand-primary)] dark:text-[#F87171] font-mono">
                        {Number(ret.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={ret.is_restocked ? 'success' : 'neutral'}>
                          {ret.is_restocked ? (isAr ? 'مسترجع للمخزن' : 'Restocked') : (isAr ? 'خارج المخزن' : 'No restock')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="success">
                          {ret.refund_status === 'credited' ? (isAr ? 'دائن معتمد' : 'Credited') : ret.refund_status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-credit-note',
                              label: isAr ? 'طباعة إشعار الدائن (Credit Slip)' : 'Print Credit Note Slip',
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

      {/* CUSTOMER PAYMENTS VIEW */}
      {activeSubTab === 'payments' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {isAr ? 'سجل سندات القبض والتحصيل للعملاء (Customer Receipts)' : 'Customer Payment Receipts & Collections'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'إدارة متحصلات عملاء الجملة والتجزئة وتوزيعها على الفواتير وإجراء القيود المحاسبية التلقائية.' : 'Track incoming receipts, allocations to open invoices, and double-entry postings.'}
              </p>
            </div>
            <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)} icon={<Plus className="w-3.5 h-3.5" />}>
              {isAr ? 'تسجيل سند قبض' : 'Record Receipt'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم السند' : 'Receipt #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'طريقة السداد' : 'Method'}</th>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'المبلغ المحصل' : 'Amount'}</th>
                  <th className="p-3 text-start">{isAr ? 'البيان' : 'Notes'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سندات قبض مسجلة حتى الآن' : 'No customer receipts on record'}
                    </td>
                  </tr>
                ) : (
                  payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">{p.voucher_number}</td>
                      <td className="p-3">{p.customer?.name || p.customer_name || '—'}</td>
                      <td className="p-3 capitalize">{p.payment_method?.replace('_', ' ')}</td>
                      <td className="p-3 text-slate-500 font-mono text-xs">{p.payment_date}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-xs text-slate-500 max-w-xs truncate">{p.notes || '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant={p.status === 'posted' ? 'success' : 'danger'}>
                          {p.status === 'posted' ? (isAr ? 'معتمد' : 'Posted') : (isAr ? 'معكوس / ملغى' : 'Reversed')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-receipt-voucher',
                              label: isAr ? 'طباعة سند القبض' : 'Print Receipt Voucher',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'reverse-receipt',
                              label: isAr ? 'عكس / إلغاء سند القبض' : 'Reverse Payment Voucher',
                              icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500" />,
                              onClick: () => handleReversePayment(p.id),
                              disabled: p.status === 'reversed',
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

      {/* RECORD CUSTOMER PAYMENT MODAL */}
      <Modal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title={isAr ? 'تسجيل سند قبض وتحصيل نقدية / بنك' : 'Record Customer Payment Receipt'}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العميل *' : 'Customer *'}
            </label>
            <select
              value={paymentCustomerId}
              onChange={(e) => setPaymentCustomerId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
            >
              <option value="">{isAr ? '— اختر العميل —' : '— Select Customer —'}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name} {c.current_balance ? `(${isAr ? 'مديونية:' : 'Bal:'} ${Number(c.current_balance).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المبلغ المحصل (ج.م) *' : 'Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={paymentAmount || ''}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة التحصيل' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
              >
                <option value="cash">{isAr ? 'نقدي (خزينة)' : 'Cash'}</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="check">{isAr ? 'شيك بنكي' : 'Check'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تخصيص لفاتورة محددة (اختياري - يترك فارغاً للتسوية التلقائية FIFO)' : 'Allocate to Invoice (Optional)'}
            </label>
            <select
              value={paymentInvoiceId}
              onChange={(e) => setPaymentInvoiceId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs"
            >
              <option value="">{isAr ? '— تسوية تلقائية بأقدم الفواتير المستحقة (FIFO) —' : '— Auto FIFO Allocation —'}</option>
              {invoices
                .filter((inv) => inv.status !== 'void' && inv.status !== 'paid')
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} ({inv.customer_name}) - {isAr ? 'إجمالي:' : 'Total:'} {Number(inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات / مرجع التحصيل' : 'Notes / Reference'}
            </label>
            <textarea
              rows={2}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder={isAr ? 'رقم الإيداع البنكي أو رقم الشيك...' : 'Bank deposit slip # or check #...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white text-xs resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsRecordPaymentOpen(false)} disabled={isSubmitting}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري التسجيل...' : 'Recording...') : (isAr ? 'اعتماد سند القبض' : 'Record Receipt')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* SALES RETURN MODAL */}
      <SalesReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedInvoiceForReturn(null);
        }}
        invoice={selectedInvoiceForReturn}
        lang={lang}
        onSuccess={() => {
          loadSalesData();
        }}
      />

      {/* 80mm POS THERMAL RECEIPT MODAL */}
      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedInvoiceForReceipt(null);
        }}
        invoice={selectedInvoiceForReceipt}
        lang={lang}
      />

      {/* CREATE / EDIT CUSTOMER MODAL */}
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        customerToEdit={selectedCustomerForEdit}
        onClose={() => {
          setIsCreateCustomerOpen(false);
          setSelectedCustomerForEdit(null);
        }}
        onSuccess={(savedCust) => {
          setCustomers((prev) => {
            const exists = prev.some((c) => c.id === savedCust.id);
            if (exists) {
              return prev.map((c) => (c.id === savedCust.id ? savedCust : c));
            }
            return [savedCust, ...prev];
          });
          setNewOrderCustomer(savedCust.name);
        }}
        isAr={isAr}
      />

      {/* CUSTOMER STATEMENT MODAL */}
      <CustomerStatementModal
        isOpen={isCustomerStatementOpen}
        onClose={() => {
          setIsCustomerStatementOpen(false);
          setSelectedCustomerForStatement(null);
        }}
        customerId={selectedCustomerForStatement?.id || null}
        customer={selectedCustomerForStatement}
        isAr={isAr}
      />
    </div>
  );
};

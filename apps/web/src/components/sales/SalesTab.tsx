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
  Trash2,
  Minus,
  Tag,
  CreditCard,
  Store,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { RecordSalesReturnModal } from './RecordSalesReturnModal';
import { PrintCreditNoteModal } from './PrintCreditNoteModal';
import { ViewSalesReturnModal } from './ViewSalesReturnModal';
import { PosReceiptModal } from './PosReceiptModal';
import { PrintSalesInvoiceModal, formatCleanDate } from './PrintSalesInvoiceModal';
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
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<SalesOrder | null>(null);
  const [selectedQuoteForPrint, setSelectedQuoteForPrint] = useState<Quotation | null>(null);
  const [autoPrintTrigger, setAutoPrintTrigger] = useState(false);
  const [selectedQuoteForView, setSelectedQuoteForView] = useState<Quotation | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [reservingOrderId, setReservingOrderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<SalesInvoice | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<SalesReturn | null>(null);
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<SalesReturn | null>(null);
  const [isRecordReturnOpen, setIsRecordReturnOpen] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [returnStatusFilter, setReturnStatusFilter] = useState<'all' | 'credited' | 'refunded' | 'pending'>('all');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [refundingReturnId, setRefundingReturnId] = useState<string | null>(null);
  const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<SalesInvoice | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<SalesInvoice | null>(null);
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<SalesInvoice | null>(null);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Order Form State
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderType, setNewOrderType] = useState<'wholesale' | 'retail' | 'outlet' | 'custom'>('wholesale');
  const [newOrderWarehouseId, setNewOrderWarehouseId] = useState<string>('');
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
  const [posCart, setPosCart] = useState<{
    variantId: string;
    name: string;
    price: number;
    qty: number;
    sku?: string;
    modelName?: string;
    sizeName?: string;
    colorName?: string;
  }[]>([]);
  const [posSuccessMsg, setPosSuccessMsg] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posCustomerName, setPosCustomerName] = useState<string>('');
  const [posWarehouseId, setPosWarehouseId] = useState<string>('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [posSearchQuery, setPosSearchQuery] = useState<string>('');
  const [posCategoryFilter, setPosCategoryFilter] = useState<string>('all');

  const loadSalesData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [ordersRes, invRes, quotesRes, delivRes, returnsRes, custRes, payRes, credRes, whRes] = await Promise.allSettled([
        api.sales.getOrders(1),
        api.sales.getInvoices(1),
        api.sales.getQuotations(1),
        api.sales.getDeliveryNotes(1),
        api.sales.getReturns(1),
        api.customers.getCustomers(),
        api.sales.getPayments(1),
        api.sales.getCreditNotes(1),
        api.inventory.getWarehouses(),
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
      if (whRes.status === 'fulfilled' && (whRes.value as any)?.warehouses) {
        setWarehouses((whRes.value as any).warehouses);
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
    if (warehouses && warehouses.length > 0) {
      const defaultWh = warehouses.find(w => w.type === 'finished_goods' || w.name?.includes('تامة') || w.name?.includes('معرض')) || warehouses[0];
      if (defaultWh) {
        if (!posWarehouseId) setPosWarehouseId(defaultWh.id);
        if (!newOrderWarehouseId) setNewOrderWarehouseId(defaultWh.id);
      }
    }
  }, [warehouses, posWarehouseId, newOrderWarehouseId]);

  useEffect(() => {
    if (variants.length > 0 && !newOrderVariantId) {
      setNewOrderVariantId(variants[0].id);
      const p = Number(variants[0].retail_price) > 0 ? Number(variants[0].retail_price) : 180;
      setNewOrderPrice(p);
    }
  }, [variants, newOrderVariantId]);

  const handleReserveStock = async (orderId: string) => {
    setReservingOrderId(orderId);
    setErrorMsg(null);
    try {
      const res = await api.sales.reserveOrderStock(orderId);
      const updatedOrder = res?.order || { id: orderId, status: 'reserved' as const };
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updatedOrder, status: 'reserved' as const } : o)));
      if (selectedOrderForView?.id === orderId) {
        setSelectedOrderForView((prev) => prev ? { ...prev, ...updatedOrder, status: 'reserved' as const } : null);
      }
      setSuccessToast(isAr ? 'تم تأكيد حجز رصيد المخزون التام للطلب بنجاح! 🔒' : 'Stock reserved successfully! 🔒');
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حجز المخزون' : 'Failed to reserve stock'));
    } finally {
      setReservingOrderId(null);
    }
  };

  const handleFulfillOrder = async (orderId: string) => {
    setDeliveringOrderId(orderId);
    setErrorMsg(null);
    try {
      const res = await api.sales.fulfillOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: 'fulfilled' as const } : o)));
      if (selectedOrderForView?.id === orderId) {
        setSelectedOrderForView((prev) => prev ? { ...prev, status: 'fulfilled' as const } : null);
      }
      if (res?.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setSuccessToast(isAr ? `تم صرف البضاعة من المخزن وإصدار فاتورة المبيعات (${res.invoice.invoice_number}) بنجاح! 🚚` : 'Order fulfilled and invoiced successfully!');
      } else {
        setSuccessToast(isAr ? 'تم صرف البضاعة من المخزن التام بنجاح! 🚚' : 'Order fulfilled successfully!');
      }
      setTimeout(() => setSuccessToast(null), 4000);
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إتمام تسليم وصرف الطلب' : 'Failed to fulfill order'));
    } finally {
      setDeliveringOrderId(null);
    }
  };

  const handlePrintOrder = async (order: SalesOrder) => {
    setSelectedOrderForPrint(order);
    setAutoPrintTrigger(true);
    try {
      const res = await api.sales.getOrder(order.id);
      const full = res.order || res.sales_order || res;
      if (full && full.id === order.id) {
        setSelectedOrderForPrint(full);
      }
    } catch (err) {
      console.warn('Could not fetch deep order details for print, using cached order', err);
    }
  };

  const handleProcessReturnRefund = async (salesReturn: SalesReturn) => {
    if (!confirm(isAr ? `تأكيد صرف استرداد نقدي فوري للمرتجع (${salesReturn.return_number}) بقيمة ${Number(salesReturn.total_amount).toLocaleString()} ج.م؟` : `Confirm cash refund for ${salesReturn.return_number}?`)) {
      return;
    }
    setRefundingReturnId(salesReturn.id);
    try {
      await api.sales.refundReturn(salesReturn.id, { payment_method: 'cash' });
      setSuccessToast(isAr ? 'تم صرف الاسترداد النقدي بنجاح وإثبات السند المحاسبي! 💵' : 'Cash refund processed successfully!');
      setTimeout(() => setSuccessToast(null), 4000);
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل صرف الاسترداد النقدي' : 'Failed to process refund'));
    } finally {
      setRefundingReturnId(null);
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
        warehouse_id: newOrderWarehouseId || undefined,
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
    const modelName = v.garment_model?.name || (v as any).garmentModel?.name || v.sku;
    const sizeName = typeof v.size === 'object' ? (v.size as any)?.name : (v.size || v.size_name || 'Std');
    const colorName = typeof v.color === 'object' ? (v.color as any)?.name : (v.color || v.color_name || 'Std');
    const name = `${modelName} (${sizeName} - ${colorName})`;
    const posPrice = Number(v.pos_price || v.effective_pos_price || v.product?.pos_price);
    const price = posPrice > 0 ? posPrice : (Number(v.retail_price) > 0 ? Number(v.retail_price) : 0);

    setPosCart((prev) => {
      const exist = prev.find((i) => i.variantId === v.id);
      if (exist) {
        return prev.map((i) => (i.variantId === v.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { variantId: v.id, name, price, qty: 1, sku: v.sku, modelName, sizeName, colorName }];
    });
  };

  const updatePosCartQty = (variantId: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((i) => {
          if (i.variantId === variantId) {
            const nextQty = i.qty + delta;
            return nextQty > 0 ? { ...i, qty: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as any
    );
  };

  const removePosCartItem = (variantId: string) => {
    setPosCart((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const posSubtotal = posCart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const posTotal = Math.max(0, posSubtotal - posDiscount);

  const handlePosCheckout = async (checkoutType: 'receipt' | 'invoice' = 'receipt') => {
    if (posCart.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const items = posCart.map((i) => ({
        variant_id: i.variantId,
        description: i.name,
        quantity: i.qty,
        unit_price: i.price,
        tax_rate: 0,
      }));

      const res = await api.sales.processPosSale({
        warehouse_id: posWarehouseId || undefined,
        customer_name: posCustomerName.trim() || (isAr ? 'عميل نقدي - منفذ بيع المصنع' : 'Factory Outlet Cash Client'),
        payment_method: posPaymentMethod,
        discount_amount: posDiscount > 0 ? posDiscount : 0,
        items,
      });

      if (res?.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        if (checkoutType === 'invoice') {
          setSelectedInvoiceForPrint(res.invoice);
          setAutoPrintTrigger(true);
        } else {
          setSelectedInvoiceForReceipt(res.invoice);
          setAutoPrintReceipt(true);
          setIsReceiptModalOpen(true);
        }
        setPosSuccessMsg(
          isAr
            ? `تم إتمام عملية البيع النقدي وإصدار السند بنجاح! رقم: ${res.invoice.invoice_number}`
            : `POS Sale completed! Ref: ${res.invoice.invoice_number}`
        );
      } else {
        setPosSuccessMsg(isAr ? 'تم تسجيل الفاتورة النقدية بنجاح!' : 'POS Cash Sale completed successfully!');
      }

      setPosCart([]);
      setPosDiscount(0);
      setPosCustomerName('');
      setTimeout(() => setPosSuccessMsg(null), 4500);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل مبيعات الـ POS' : 'Failed to process POS sale'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertQuotation = async (quotationId: string) => {
    setConvertingQuoteId(quotationId);
    setErrorMsg(null);
    try {
      const res = await api.sales.convertQuotation(quotationId);
      const newOrder = res?.sales_order || res?.order;
      
      setQuotations((prev) =>
        prev.map((q) => (q.id === quotationId ? { ...q, status: 'converted' as const } : q))
      );

      if (newOrder) {
        setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
        setSuccessToast(
          isAr
            ? `تم تحويل عرض السعر وتأكيد أمر البيع الرسمي بنجاح (${newOrder.order_number})! 📑`
            : `Quotation confirmed & converted to sales order (${newOrder.order_number})!`
        );
      } else {
        setSuccessToast(isAr ? 'تم تأكيد تحويل عرض السعر إلى أمر بيع رسمي بنجاح! 📑' : 'Quotation converted successfully!');
      }

      setTimeout(() => setSuccessToast(null), 5000);
      await loadSalesData();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحويل عرض السعر إلى أمر بيع' : 'Failed to convert quotation'));
    } finally {
      setConvertingQuoteId(null);
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
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Ultra-Modern Hero Header & Control Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#000000] via-[#180508] to-[#000000] text-white p-6 sm:p-8 shadow-2xl border border-[#7F1625]/40">
        {/* Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7F1625]/30 text-[#ff8ba0] border border-[#7F1625]/50 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'إدارة المبيعات ونقاط البيع السريعة POS' : 'Commercial Sales & POS Engine'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <PackageCheck className="w-3.5 h-3.5 text-sky-400" />
                {isAr ? 'حجز وتخصيص المخزون التام آلياً' : 'Automated Finished Stock Reservation'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-[#E05265] shrink-0" />
              <span>{isAr ? 'المبيعات ونقطة البيع (POS) والفواتير' : 'Commercial Sales & POS'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'إدارة أوامر البيع للعملاء، حجز المخزون الجاهز، إصدار عروض الأسعار، ونقطة بيع فورية (POS) لصالة العرض والمنافذ مع فواتير ضريبية وسندات قبض.'
                : 'Customer sales orders, quotations, invoices, and factory POS terminal.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => setIsOrderModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? '+ أمر بيع جديد' : '+ New Sales Order'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQuotationModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{isAr ? '+ عرض سعر' : '+ New Quote'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('pos')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'كاشير المعرض (POS)' : 'Open POS'}</span>
            </button>
          </div>
        </div>
      </div>
      {successToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">✕</button>
        </div>
      )}

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

      {/* 3. Luxury Segmented Pill Tab Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="p-1.5 bg-slate-100 dark:bg-[#0a0204] rounded-2xl border border-slate-200/80 dark:border-[#2d080e] flex items-center gap-1 overflow-x-auto shadow-inner text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <span>{isAr ? 'أوامر البيع وحجز المخزون' : 'Sales Orders'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('quotations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'quotations'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <span>{isAr ? 'عروض الأسعار' : 'Quotations'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'quotations' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {quotations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('pos')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'pos'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isAr ? 'نقطة البيع (POS)' : 'Factory POS'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('invoices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'invoices'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{isAr ? 'الفواتير' : 'Invoices'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {invoices.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('returns')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'returns'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <span>{isAr ? 'المرتجعات' : 'Returns'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'returns' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {salesReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('deliveries')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'deliveries'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{isAr ? 'إذون التسليم' : 'Deliveries'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'deliveries' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {deliveryNotes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('customers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'customers'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <span>{isAr ? 'العملاء' : 'Customers'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {customers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeSubTab === 'payments'
                ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{isAr ? 'التحصيلات والقبض' : 'Receipts'}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'payments' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
              {payments.length}
            </span>
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
      {/* ORDERS VIEW */}
      {activeSubTab === 'orders' && (
        <Card className="bg-white dark:bg-[#000000] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#7F1625] via-amber-500 to-[#7F1625]"></div>
          
          <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:bg-[#7F1625]/20 dark:text-[#ff8ba0] flex items-center justify-center font-black">
                  <ShoppingBag className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {isAr ? 'سجل أوامر البيع وحالة حجز البضاعة التامة' : 'Sales Orders & Finished Stock Reservation'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {isAr ? 'تتبع طلبيات الجملة والقطاعي، تأكيد حجز رصيد المخزن، صرف الشحنات، وطباعة الفواتير الرسمية' : 'Manage wholesale & retail orders, reserve stock, fulfill deliveries, and print tax invoices'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative min-w-[260px]">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث برقم الأمر أو العميل أو الموديل...' : 'Search by order #, client, or model...'}
                  className="w-full ps-9 pe-4 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7F1625]/40"
                />
              </div>

              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 shrink-0">
                {filteredOrders.length} {isAr ? 'أمر بيع' : 'orders'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 text-start">{isAr ? 'رقم وتاريخ الأمر' : 'Order # & Date'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'العميل والنشاط' : 'Customer & Class'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'الموديلات والكمية' : 'Garments & Qty'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'الإجمالي الصافي' : 'Net Total'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'حالة المخزون' : 'Stock Status'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'موعد التسليم' : 'Delivery Date'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-bold">{isAr ? 'لا توجد أوامر بيع مطابقة للبحث' : 'No sales orders found'}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{isAr ? 'يمكنك إنشاء أمر بيع جديد من زر (+ أمر بيع جديد) بالأعلى' : 'You can create a new sales order above'}</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isWholesale =
                      order.order_type === 'wholesale' ||
                      order.customer?.classification === 'wholesale' ||
                      order.customer?.classification === 'company' ||
                      (!order.order_type && true);

                    const itemsCount = order.items?.reduce((s, it: any) => s + (Number(it.ordered_quantity || it.quantity) || 0), 0) || 0;
                    const firstItem = order.items?.[0];
                    const v = firstItem?.variant;
                    const modelName =
                      v?.garment_model?.name ||
                      v?.garmentModel?.name ||
                      firstItem?.description ||
                      (isAr ? 'موديل ملابس جاهز' : 'Standard Garment');

                    return (
                      <tr key={order.id} className="hover:bg-[#7F1625]/5 dark:hover:bg-[#7F1625]/10 transition-colors group">
                        {/* 1. Order Number & Date */}
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                          <span className="font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0] block group-hover:underline cursor-pointer" onClick={() => setSelectedOrderForView(order)}>
                            {order.order_number}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {formatCleanDate(order.order_date || order.created_at)}
                          </span>
                        </td>

                        {/* 2. Customer & Classification */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                            {order.customer_name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            {isWholesale ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] dark:bg-[#7F1625]/25 dark:text-[#ff8ba0] border border-[#7F1625]/30">
                                🏢 {isAr ? 'عميل جملة' : 'Wholesale'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200">
                                🛍️ {isAr ? 'عميل قطاعي' : 'Retail'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Items & Qty */}
                        <td className="p-3.5">
                          <div className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[180px]">
                            {modelName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {itemsCount > 0 ? `${itemsCount} ${isAr ? 'قطعة' : 'pcs'}` : (isAr ? 'بند محدد' : '1 item')}
                            {order.items && order.items.length > 1 ? ` • +${order.items.length - 1} ${isAr ? 'موديلات أخرى' : 'more'}` : ''}
                          </div>
                        </td>

                        {/* 4. Type */}
                        <td className="p-3.5">
                          <span className="capitalize text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {order.order_type === 'wholesale' ? (isAr ? 'بيع جملة' : 'Wholesale') :
                             order.order_type === 'retail' ? (isAr ? 'بيع قطاعي' : 'Retail') :
                             order.order_type === 'outlet' ? (isAr ? 'منفذ المصنع' : 'Outlet') :
                             (order.order_type || (isAr ? 'جملة' : 'Wholesale'))}
                          </span>
                        </td>

                        {/* 5. Total */}
                        <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white text-sm">
                          {Number(order.total_amount).toLocaleString()} <span className="text-[11px] font-normal text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                        </td>

                        {/* 6. Stock Status */}
                        <td className="p-3.5">
                          {order.status === 'confirmed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              ⏳ {isAr ? 'بانتظار الحجز' : 'Pending Reservation'}
                            </span>
                          )}
                          {order.status === 'reserved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              🔒 {isAr ? 'محجوز بالمخزن' : 'Stock Reserved'}
                            </span>
                          )}
                          {order.status === 'fulfilled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              🚚 {isAr ? 'تم الصرف والفوترة' : 'Fulfilled'}
                            </span>
                          )}
                          {order.status !== 'confirmed' && order.status !== 'reserved' && order.status !== 'fulfilled' && (
                            <Badge variant="neutral">{order.status}</Badge>
                          )}
                        </td>

                        {/* 7. Delivery Date */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-xs">
                          {formatCleanDate(order.expected_delivery_date)}
                        </td>

                        {/* 8. Direct Icon Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Action 1: View Details */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderForView(order)}
                              title={isAr ? 'معاينة تفاصيل أمر البيع والأصناف' : 'View Order Details'}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Action 2: Reserve Stock (Active when confirmed or re-verifying) */}
                            {order.status === 'confirmed' ? (
                              <button
                                type="button"
                                onClick={() => handleReserveStock(order.id)}
                                disabled={reservingOrderId === order.id}
                                title={isAr ? 'تأكيد حجز رصيد المخزون التام فوراً' : 'Reserve Stock Now'}
                                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {reservingOrderId === order.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <PackageCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : null}

                            {/* Action 3: Fulfill & Deliver (Immediate Stock Deduction & Invoice) */}
                            {order.status !== 'fulfilled' ? (
                              <button
                                type="button"
                                onClick={() => handleFulfillOrder(order.id)}
                                disabled={deliveringOrderId === order.id}
                                title={isAr ? 'صرف البضاعة وخصم المخزن وإصدار الفاتورة' : 'Fulfill & Dispatch (Deduct Stock)'}
                                className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {deliveringOrderId === order.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Truck className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : null}

                            {/* Action 4: Official Tax Sales Invoice Print */}
                            <button
                              type="button"
                              onClick={() => handlePrintOrder(order)}
                              title={isAr ? 'طباعة فاتورة مبيعات ضريبية رسمية A4' : 'Print Official Tax Invoice (A4)'}
                              className="p-2 rounded-xl bg-[#7F1625]/10 hover:bg-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Action 5: Payment Receipt */}
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentCustomerId(order.customer_id || '');
                                setPaymentAmount(Number(order.total_amount));
                                setIsRecordPaymentOpen(true);
                              }}
                              title={isAr ? 'تسجيل سند قبض وتحصيل نقدية' : 'Record Payment Receipt'}
                              className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            {/* Action 6: Dropdown for Additional Actions */}
                            <ActionsMenu
                              variant="icon-horizontal"
                              align={isAr ? 'left' : 'right'}
                              items={[
                                {
                                  id: 'view',
                                  label: isAr ? 'معاينة تفاصيل الأصناف والمخزن' : 'View Details',
                                  icon: <Eye className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => setSelectedOrderForView(order),
                                },
                                {
                                  id: 'print-official',
                                  label: isAr ? 'طباعة الفاتورة الضريبية الرسمية A4' : 'Print Tax Invoice (A4)',
                                  icon: <Printer className="w-3.5 h-3.5 text-[#7F1625]" />,
                                  onClick: () => handlePrintOrder(order),
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
                                        label: isAr ? 'صرف المخزن وإصدار الفاتورة' : 'Fulfill & Invoice',
                                        icon: <Truck className="w-3.5 h-3.5 text-blue-500" />,
                                        onClick: () => handleFulfillOrder(order.id),
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
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* QUOTATIONS VIEW */}
      {activeSubTab === 'quotations' && (
        <Card className="bg-white dark:bg-[#000000] border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-[#7F1625] to-amber-500"></div>

          <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:bg-[#7F1625]/20 dark:text-[#ff8ba0] flex items-center justify-center font-black">
                <FileText className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isAr ? 'سجل عروض الأسعار الصادرة للعملاء' : 'Customer Quotations Register'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isAr ? 'إصدار ومتابعة عروض أسعار الجملة، اعتمادها وتحويلها بنقرة واحدة إلى أوامر بيع رسمية، وطباعتها' : 'Manage wholesale quotes, approve & convert them directly to sales orders, and print official slips'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                {quotations.length} {isAr ? 'عرض سعر' : 'quotes'}
              </span>

              <button
                type="button"
                onClick={() => setIsQuotationModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2d] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ عرض سعر جديد' : '+ New Quote'}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 text-start">{isAr ? 'رقم وتاريخ العرض' : 'Quote # & Date'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'البيان والكمية' : 'Description & Qty'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'الإجمالي الصافي' : 'Net Total'}</th>
                  <th className="p-3.5 text-start">{isAr ? 'صالح حتى' : 'Valid Until'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3.5 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="font-bold">{isAr ? 'لا توجد عروض أسعار مسجلة حالياً' : 'No quotations recorded'}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{isAr ? 'يمكنك إنشاء عرض سعر جديد بنقرة واحدة من الزر بالأعلى' : 'You can issue a new quote from the button above'}</p>
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => {
                    const firstItem = q.items?.[0];
                    const totalPieces = q.items?.reduce((s, it: any) => s + (Number(it.quantity) || 0), 0) || 0;
                    const isConverted = q.status === 'converted';

                    return (
                      <tr key={q.id} className="hover:bg-[#7F1625]/5 dark:hover:bg-[#7F1625]/10 transition-colors group">
                        {/* 1. Quote Number & Date */}
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white">
                          <span
                            className="font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0] block group-hover:underline cursor-pointer"
                            onClick={() => setSelectedQuoteForView(q)}
                          >
                            {q.quotation_number}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {formatCleanDate(q.created_at)}
                          </span>
                        </td>

                        {/* 2. Customer */}
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100 max-w-[200px] truncate">
                            {q.customer_name}
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/20 mt-1">
                            🏢 {isAr ? 'عميل جملة' : 'Wholesale'}
                          </span>
                        </td>

                        {/* 3. Items & Qty */}
                        <td className="p-3.5">
                          <div className="font-medium text-slate-900 dark:text-slate-200 truncate max-w-[200px]">
                            {firstItem?.description || (isAr ? 'تشكيلة موديلات ملابس' : 'Garments Selection')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {totalPieces > 0 ? `${totalPieces} ${isAr ? 'قطعة مطلوبة' : 'pcs'}` : (isAr ? 'بند محدد' : '1 item')}
                            {q.items && q.items.length > 1 ? ` • +${q.items.length - 1} ${isAr ? 'بنود أخرى' : 'more'}` : ''}
                          </div>
                        </td>

                        {/* 4. Total Amount */}
                        <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white text-sm">
                          {Number(q.total_amount).toLocaleString()} <span className="text-[11px] font-normal text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                        </td>

                        {/* 5. Valid Until */}
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 font-mono text-xs">
                          {formatCleanDate(q.valid_until)}
                        </td>

                        {/* 6. Status Badge */}
                        <td className="p-3.5 text-center">
                          {isConverted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30">
                              📑 {isAr ? 'محول لأمر بيع' : 'Converted to Order'}
                            </span>
                          ) : q.status === 'accepted' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              ✅ {isAr ? 'معتمد ومقبول' : 'Accepted'}
                            </span>
                          ) : q.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                              📤 {isAr ? 'مرسل للعميل' : 'Sent'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              📝 {isAr ? 'مسودة جاهزة' : 'Draft'}
                            </span>
                          )}
                        </td>

                        {/* 7. Direct Icon Actions */}
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Action 1: View Details */}
                            <button
                              type="button"
                              onClick={() => setSelectedQuoteForView(q)}
                              title={isAr ? 'معاينة تفاصيل عرض السعر' : 'View Quote Details'}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 cursor-pointer shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Action 2: Convert to Sales Order */}
                            {!isConverted ? (
                              <button
                                type="button"
                                onClick={() => handleConvertQuotation(q.id)}
                                disabled={convertingQuoteId === q.id}
                                title={isAr ? 'تأكيد وتحويل لعرض السعر إلى أمر بيع رسمي' : 'Confirm & Convert to Sales Order'}
                                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs disabled:opacity-50"
                              >
                                {convertingQuoteId === q.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                              </button>
                            ) : null}

                            {/* Action 3: Print Official A4 Quotation */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedQuoteForPrint(q);
                                setAutoPrintTrigger(true);
                              }}
                              title={isAr ? 'طباعة عرض السعر الرسمي A4' : 'Print Official Quotation (A4)'}
                              className="p-2 rounded-xl bg-[#7F1625]/10 hover:bg-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Action 4: Dropdown Menu */}
                            <ActionsMenu
                              variant="icon-horizontal"
                              align={isAr ? 'left' : 'right'}
                              items={[
                                {
                                  id: 'view-quote',
                                  label: isAr ? 'معاينة تفاصيل البنود والأسعار' : 'View Details',
                                  icon: <Eye className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => setSelectedQuoteForView(q),
                                },
                                {
                                  id: 'print-quote-a4',
                                  label: isAr ? 'طباعة عرض السعر الرسمي A4' : 'Print Quotation (A4)',
                                  icon: <Printer className="w-3.5 h-3.5 text-[#7F1625]" />,
                                  onClick: () => {
                                    setSelectedQuoteForPrint(q);
                                    setAutoPrintTrigger(true);
                                  },
                                },
                                ...(!isConverted
                                  ? [
                                      {
                                        id: 'convert-order-action',
                                        label: isAr ? 'تأكيد وتحويل لأمر بيع رسمي' : 'Convert to Sales Order',
                                        icon: <FileText className="w-3.5 h-3.5 text-emerald-500" />,
                                        onClick: () => handleConvertQuotation(q.id),
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* POS VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Product Catalog Section */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-3xl">
              {/* Header: Title & Barcode Scanner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      {isAr ? 'منتجات معرض المصنع الجاهزة للتسليم المباشر' : 'Factory Outlet Available Garments'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr ? 'تسليم فوري، خصم تلقائي من المخزن، وطباعة إيصالات معتمدة' : 'Instant fulfillment, stock auto-deduction, and thermal receipts'}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleBarcodeScan} className="flex items-center gap-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder={isAr ? 'مسح الباركود (EAN-13)...' : 'Scan barcode...'}
                      className="ps-8 pe-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#7F1625] w-48 sm:w-56"
                    />
                    <Receipt className="w-4 h-4 text-slate-400 absolute start-2.5 top-2.5" />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="h-9 px-3 text-xs rounded-xl font-bold">
                    {isAr ? 'مسح' : 'Scan'}
                  </Button>
                </form>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
                  <input
                    type="text"
                    value={posSearchQuery}
                    onChange={(e) => setPosSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث باسم الموديل، المقاس، اللون، أو الكود...' : 'Search model, size, color, SKU...'}
                    className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                  {[
                    { id: 'all', label: isAr ? 'الكل' : 'All' },
                    { id: 'boys', label: isAr ? 'اولادي' : 'Boys' },
                    { id: 'girls', label: isAr ? 'بناتي' : 'Girls' },
                    { id: 'suits', label: isAr ? 'ترينج وسوت' : 'Suits/Sets' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPosCategoryFilter(cat.id)}
                      className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                        posCategoryFilter === cat.id
                          ? 'bg-[#7F1625] text-white shadow-xs font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Garment Variants Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-4 max-h-[640px] overflow-y-auto pe-1">
                {variants
                  .filter((v) => {
                    const modelName = (v.garment_model?.name || (v as any).garmentModel?.name || '').toLowerCase();
                    const sku = (v.sku || '').toLowerCase();
                    const sizeName = (typeof v.size === 'object' ? (v.size as any)?.name : (v.size || v.size_name || '')).toLowerCase();
                    const colorName = (typeof v.color === 'object' ? (v.color as any)?.name : (v.color || v.color_name || '')).toLowerCase();
                    const q = posSearchQuery.trim().toLowerCase();

                    const matchesSearch = !q || modelName.includes(q) || sku.includes(q) || sizeName.includes(q) || colorName.includes(q);
                    if (!matchesSearch) return false;

                    if (posCategoryFilter === 'all') return true;
                    if (posCategoryFilter === 'boys') return modelName.includes('اولاد') || modelName.includes('boy') || sku.includes('BOY');
                    if (posCategoryFilter === 'girls') return modelName.includes('بنات') || modelName.includes('kid') || sku.includes('GIRL');
                    if (posCategoryFilter === 'suits') return modelName.includes('ترينج') || modelName.includes('سوت') || modelName.includes('suit');
                    return true;
                  })
                  .map((v) => {
                    const modelName = v.garment_model?.name || (v as any).garmentModel?.name || v.sku;
                    const sizeName = typeof v.size === 'object' ? (v.size as any)?.name : (v.size || v.size_name || 'Std');
                    const colorName = typeof v.color === 'object' ? (v.color as any)?.name : (v.color || v.color_name || 'Std');
                    const price = Number(v.pos_price || v.effective_pos_price || v.product?.pos_price || v.retail_price || 0);
                    const inCartCount = posCart.find((c) => c.variantId === v.id)?.qty || 0;

                    return (
                      <div
                        key={v.id}
                        onClick={() => addToPosCart(v)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                          inCartCount > 0
                            ? 'border-[#7F1625] bg-[#7F1625]/5 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-[#7F1625]/60 hover:shadow-md'
                        }`}
                      >
                        {inCartCount > 0 && (
                          <span className="absolute top-2 start-2 w-5 h-5 rounded-full bg-[#7F1625] text-white text-[11px] font-black flex items-center justify-center shadow-xs">
                            {inCartCount}
                          </span>
                        )}

                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-[#7F1625] transition-colors line-clamp-1">
                              {modelName}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold">{sizeName}</span>
                            <span>•</span>
                            <span className="truncate">{colorName}</span>
                          </div>

                          <p className="text-[10px] text-slate-400 font-mono mt-1">SKU: {v.sku}</p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="font-black text-sm text-[#7F1625] dark:text-[#ff8ba0] font-mono">
                              {price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </span>
                            <span className="text-[9px] text-purple-600 dark:text-purple-400 block font-semibold">
                              {isAr ? 'سعر المعرض' : 'Outlet Price'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToPosCart(v);
                            }}
                            className="p-1.5 rounded-xl bg-[#7F1625] text-white hover:bg-[#6a121e] transition-transform active:scale-95 shadow-xs cursor-pointer"
                            title={isAr ? 'إضافة للسلة' : 'Add to cart'}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          </div>

          {/* POS Cart & Direct Discount Register */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4">
            <Card className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md rounded-3xl flex flex-col justify-between sticky top-4">
              <div>
                {/* Cart Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-[#7F1625]" />
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {isAr ? 'سلة مشتريات المعرض النقدية' : 'POS Checkout Drawer'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] font-bold px-2 py-0.5 rounded-full">
                      {posCart.reduce((sum, i) => sum + i.qty, 0)} {isAr ? 'قطع' : 'pcs'}
                    </span>
                    {posCart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPosCart([])}
                        className="text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                        title={isAr ? 'إفراغ السلة' : 'Clear cart'}
                      >
                        {isAr ? 'إفراغ' : 'Clear'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Feedback Toast */}
                {posSuccessMsg && (
                  <div className="p-3 my-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-bold">{posSuccessMsg}</span>
                  </div>
                )}

                {/* Cart Items List */}
                <div className="space-y-2 mt-3 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pe-1">
                  {posCart.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                      <p className="text-xs text-slate-400 font-medium">
                        {isAr ? 'اختر منتجات المعرض أو امسح الباركود لإضافتها للإيصال' : 'Click garments to add them to receipt'}
                      </p>
                    </div>
                  ) : (
                    posCart.map((item, idx) => (
                      <div key={idx} className="pt-2 flex items-center justify-between text-xs gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {item.price.toLocaleString()} {isAr ? 'ج.م' : 'EGP'} × {item.qty}
                          </p>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => updatePosCartQty(item.variantId, -1)}
                            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-bold font-mono">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updatePosCartQty(item.variantId, 1)}
                            className="w-5 h-5 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-end shrink-0 min-w-[70px]">
                          <span className="font-bold font-mono text-slate-900 dark:text-white block">
                            {(item.price * item.qty).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removePosCartItem(item.variantId)}
                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px]"
                            title={isAr ? 'حذف الصنف من السلة' : 'Remove item'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{isAr ? 'حذف' : 'Remove'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Bottom Financial Drawer: Customer Name, Discount, & Checkout */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 mt-3 space-y-3">
                {/* Optional Customer Name */}
                <div>
                  <input
                    type="text"
                    value={posCustomerName}
                    onChange={(e) => setPosCustomerName(e.target.value)}
                    placeholder={isAr ? 'اسم العميل (اختياري / افتراضي عميل نقدي)' : 'Customer Name (optional)'}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
                  />
                </div>

                {/* Outlet / Warehouse Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      {isAr ? 'منفذ البيع / المخزن المنصرف منه:' : 'Dispatch Warehouse / Outlet:'}
                    </label>
                    <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isAr ? 'يخصم المخزون فورياً' : 'Auto stock deduction'}
                    </span>
                  </div>
                  <select
                    value={posWarehouseId}
                    onChange={(e) => setPosWarehouseId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-[#7F1625]"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.code ? `(${w.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('cash')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      posPaymentMethod === 'cash'
                        ? 'border-[#7F1625] bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{isAr ? 'كاش نقدي' : 'Cash'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('card')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      posPaymentMethod === 'card'
                        ? 'border-[#7F1625] bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{isAr ? 'فيزا / بطاقة' : 'Card'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosPaymentMethod('bank_transfer')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      posPaymentMethod === 'bank_transfer'
                        ? 'border-[#7F1625] bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0]'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{isAr ? 'تحويل بنكي' : 'Transfer'}</span>
                  </button>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{isAr ? 'المجموع قبل الخصم:' : 'Subtotal:'}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {posSubtotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>

                {/* DIRECT CASH DISCOUNT SECTION */}
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      {isAr ? 'خصم نقدي مباشر للعميل (بالفلوس EGP):' : 'Instant Cash Discount (EGP):'}
                    </span>
                    {posDiscount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPosDiscount(0)}
                        className="text-[10px] text-amber-700 hover:text-rose-600 font-bold underline cursor-pointer"
                      >
                        {isAr ? 'إلغاء الخصم' : 'Clear'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max={posSubtotal}
                        value={posDiscount === 0 ? '' : posDiscount}
                        onChange={(e) => setPosDiscount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0.00"
                        className="w-full ps-3 pe-12 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 border border-amber-500/40 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute end-2.5 top-2 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  </div>

                  {/* Preset Quick Discount Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {[10, 20, 50, 100, 200].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPosDiscount(amt)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                          posDiscount === amt
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-100'
                        }`}
                      >
                        +{amt} {isAr ? 'ج.م' : 'EGP'}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 leading-tight">
                    {isAr
                      ? '⚡ يخصم تلقائياً من الفاتورة ويطبع بالإيصال ويثبت في حساب مصاريف وخصومات المعرض.'
                      : 'Auto-deducted from total, recorded in outlet expense ledger, and printed on receipt.'}
                  </p>
                </div>

                {/* Net Total Due */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 text-white shadow-md">
                  <div>
                    <span className="text-xs text-slate-300 block">{isAr ? 'الصافي المطلوب تحصيله:' : 'Net Total Due:'}</span>
                    {posDiscount > 0 && (
                      <span className="text-[10px] text-amber-300 font-mono block">
                        {isAr ? `(شامل خصم ${posDiscount} ج.م)` : `(Discount of ${posDiscount} EGP applied)`}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-black font-mono text-[#ff8ba0]">
                    {posTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>

                {/* Checkout & Direct Print Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={posCart.length === 0 || isSubmitting}
                    onClick={() => handlePosCheckout('receipt')}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#7F1625] hover:bg-[#6a121e] text-white text-xs font-bold shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isSubmitting ? (isAr ? 'جاري التنفيذ...' : 'Processing...') : (isAr ? 'إتمام الدفع وطباعة إيصال كاشير (80mm)' : 'Complete & Print Receipt (80mm)')}</span>
                  </button>

                  <button
                    type="button"
                    disabled={posCart.length === 0 || isSubmitting}
                    onClick={() => handlePosCheckout('invoice')}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 border border-slate-200 dark:border-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#7F1625]" />
                    <span>{isAr ? 'إتمام البيع وطباعة فاتورة ضريبية رسمية (A4)' : 'Complete & Print Tax Invoice (A4)'}</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* INVOICES VIEW */}
      {activeSubTab === 'invoices' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm rounded-3xl">
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                {isAr ? 'فواتير المبيعات الضريبية وإيصالات منفذ المعرض' : 'Tax Sales Invoices & POS Receipts'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'سجل شامل لجميع فواتير الجملة والتجزئة مع إمكانية الطباعة اللحظية A4 أو حراري 80mm' : 'Official invoice ledger with instant A4 & 80mm thermal reprint'}
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {invoices.length} {isAr ? 'فواتير' : 'Invoices'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs border-collapse">
              <thead className="bg-[#7F1625]/5 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-bold">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'طريقة السداد' : 'Payment'}</th>
                  <th className="p-3 text-start">{isAr ? 'الإجمالي والخصم' : 'Total & Discount'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات والطباعة' : 'Actions & Print'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      {isAr ? 'لا توجد فواتير مبيعات مسجلة حتى الآن' : 'No invoices found'}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="text-[#7F1625] dark:text-[#ff8ba0]">{inv.invoice_number}</span>
                      </td>

                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                        {inv.customer_name}
                      </td>

                      <td className="p-3">
                        {inv.invoice_type === 'pos_receipt' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
                            ⚡ {isAr ? 'إيصال معرض فوري' : 'POS Outlet'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/20 dark:text-[#ff8ba0]">
                            🏢 {isAr ? 'فاتورة بيع ضريبية' : 'Tax Invoice'}
                          </span>
                        )}
                      </td>

                      <td className="p-3 capitalize font-semibold text-slate-600 dark:text-slate-400">
                        {inv.payment_method === 'cash' ? (isAr ? '💵 نقدي' : 'Cash') : inv.payment_method === 'card' ? (isAr ? '💳 فيزا' : 'Card') : (inv.payment_method || '—')}
                      </td>

                      <td className="p-3">
                        <span className="font-mono font-black text-slate-900 dark:text-white block text-sm">
                          {Number(inv.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                        {Number(inv.discount_amount) > 0 && (
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block font-mono">
                            {isAr ? `خصم: -${Number(inv.discount_amount).toLocaleString()} ج.م` : `Disc: -${inv.discount_amount} EGP`}
                          </span>
                        )}
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
                              : inv.status === 'issued'
                              ? 'neutral'
                              : 'danger'
                          }
                        >
                          {isAr
                            ? inv.status === 'paid'
                              ? 'مسددة بالكامل'
                              : inv.status === 'refunded'
                              ? 'مستردة نقداً'
                              : inv.status === 'partially_refunded'
                              ? 'مستردة جزئياً'
                              : inv.status === 'issued'
                              ? 'صادرة'
                              : inv.status === 'void'
                              ? 'ملغاة'
                              : inv.status
                            : inv.status.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-xs">
                        {formatCleanDate(inv.invoice_date)}
                      </td>

                      {/* Direct Actions: 🖨️ A4 Print, 🧾 80mm Receipt, 👁️ View Dossier */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Action 1: View Dossier */}
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedInvoiceForView(inv);
                              try {
                                const fresh = await api.sales.getInvoice(inv.id);
                                if (fresh?.invoice) setSelectedInvoiceForView(fresh.invoice);
                              } catch {}
                            }}
                            title={isAr ? 'معاينة تفاصيل الفاتورة والبنود' : 'View Invoice Details'}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Action 2: Print Official Tax Sales Invoice A4 */}
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedInvoiceForPrint(inv);
                              setAutoPrintTrigger(true);
                              try {
                                const fresh = await api.sales.getInvoice(inv.id);
                                if (fresh?.invoice) setSelectedInvoiceForPrint(fresh.invoice);
                              } catch {}
                            }}
                            title={isAr ? 'طباعة فاتورة مبيعات ضريبية رسمية A4' : 'Print Official Tax Invoice (A4)'}
                            className="p-2 rounded-xl bg-[#7F1625]/10 hover:bg-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Action 3: Print Thermal 80mm Receipt */}
                          <button
                            type="button"
                            onClick={async () => {
                              setSelectedInvoiceForReceipt(inv);
                              setAutoPrintReceipt(true);
                              setIsReceiptModalOpen(true);
                              try {
                                const fresh = await api.sales.getInvoice(inv.id);
                                if (fresh?.invoice) setSelectedInvoiceForReceipt(fresh.invoice);
                              } catch {}
                            }}
                            title={isAr ? 'طباعة إيصال كاشير حراري (80mm)' : 'Print POS Receipt (80mm)'}
                            className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>

                          {/* Action 4: Direct Sales Return & Credit Note */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceForReturn(inv);
                              setIsRecordReturnOpen(true);
                            }}
                            disabled={inv.status === 'void'}
                            title={isAr ? 'تسجيل مرتجع بضاعة وإشعار دائن من هذه الفاتورة' : 'Record Sales Return & Credit Note'}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs disabled:opacity-40"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Action 4: Dropdown Menu */}
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
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
                                id: 'cancel-inv',
                                label: isAr ? 'إلغاء الفاتورة' : 'Cancel Invoice',
                                icon: <RotateCcw className="w-3.5 h-3.5 text-rose-500" />,
                                onClick: () => handleCancelInvoice(inv.id),
                                disabled: inv.status === 'void' || Number(inv.paid_amount) > 0,
                              },
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'مستودع حجز وصرف البضاعة التامة *' : 'Dispatch / Reserve Warehouse *'}
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {isAr ? 'يتم حجز الرصيد وصرفه منه' : 'Stock reserved & fulfilled from here'}
              </span>
            </div>
            <select
              value={newOrderWarehouseId}
              onChange={(e) => setNewOrderWarehouseId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
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
          title={`${isAr ? 'ملف أمر البيع الرقمي الشامل: ' : 'Sales Order File: '}${selectedOrderForView.order_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'اسم العميل' : 'Customer Name'}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{selectedOrderForView.customer_name}</p>
                <div className="mt-1">
                  {selectedOrderForView.order_type === 'wholesale' || selectedOrderForView.customer?.classification === 'wholesale' || selectedOrderForView.customer?.classification === 'company' ? (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/20">
                      🏢 {isAr ? 'عميل جملة' : 'Wholesale'}
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:text-blue-300 border border-blue-200">
                      🛍️ {isAr ? 'عميل قطاعي' : 'Retail'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'نوع المعاملة' : 'Order Type'}</p>
                <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 mt-1 inline-block">
                  {selectedOrderForView.order_type === 'wholesale' ? (isAr ? 'بيع جملة' : 'Wholesale') :
                   selectedOrderForView.order_type === 'retail' ? (isAr ? 'بيع قطاعي' : 'Retail') :
                   (selectedOrderForView.order_type || (isAr ? 'جملة' : 'Wholesale'))}
                </span>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'حالة حجز المخزون' : 'Status'}</p>
                <div className="mt-1">
                  {selectedOrderForView.status === 'confirmed' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      ⏳ {isAr ? 'بانتظار الحجز' : 'Pending'}
                    </span>
                  )}
                  {selectedOrderForView.status === 'reserved' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                      🔒 {isAr ? 'محجوز بالمخزن' : 'Reserved'}
                    </span>
                  )}
                  {selectedOrderForView.status === 'fulfilled' && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 border border-blue-500/30">
                      🚚 {isAr ? 'تم الصرف والفوترة' : 'Fulfilled'}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'موعد التسليم المتوقع' : 'Delivery Date'}</p>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">{formatCleanDate(selectedOrderForView.expected_delivery_date)}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center justify-between">
                <span>{isAr ? 'بنود وموديلات الطلبية المحجوزة' : 'Order Items & Variants'}</span>
                <span className="font-mono text-[11px] text-slate-400 font-normal">
                  {selectedOrderForView.items?.length || 0} {isAr ? 'أصناف مسجلة' : 'items'}
                </span>
              </h4>
              {selectedOrderForView.items && selectedOrderForView.items.length > 0 ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {selectedOrderForView.items.map((it: any, idx: number) => {
                    const v = it.variant;
                    const modelName =
                      v?.garment_model?.name ||
                      v?.garmentModel?.name ||
                      it.description ||
                      (isAr ? 'موديل ملابس جاهز' : 'Garment Model');

                    const sizeName = typeof v?.size === 'object' ? v.size?.name : (v?.size || 'M');
                    const colorName = typeof v?.color === 'object' ? v.color?.name : (v?.color || 'أساسي');
                    const qty = Number(it.ordered_quantity || it.quantity || 0);
                    const reserved = Number(it.reserved_quantity || 0);
                    const fulfilled = Number(it.fulfilled_quantity || 0);
                    const unitPrice = Number(it.unit_price || 0);
                    const lineTotal = Number(it.total_price || (qty * unitPrice));

                    return (
                      <div key={idx} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {modelName}
                          </p>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              {sizeName} / {colorName}
                            </span>
                            {v?.sku && (
                              <span className="font-mono text-slate-400">
                                SKU: {v.sku}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono pt-1">
                            {isAr ? 'مطلوب: ' : 'Ordered: '}<span className="font-bold text-slate-800 dark:text-slate-200">{qty}</span> • {isAr ? 'محجوز: ' : 'Reserved: '}<span className="font-bold text-emerald-600">{reserved}</span> • {isAr ? 'مستلم/مصروف: ' : 'Fulfilled: '}<span className="font-bold text-blue-600">{fulfilled}</span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span className="font-bold font-mono text-sm text-slate-900 dark:text-white block">
                            {lineTotal.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            @{unitPrice.toLocaleString()} {isAr ? 'ج.م' : 'EGP'} / {isAr ? 'قطعة' : 'pc'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {isAr ? 'بند طلبية شامل مخصص للموديلات الجاهزة' : 'Standard catalog line item'}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#7F1625]/10 border border-[#7F1625]/25">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {isAr ? 'صافي القيمة المستحقة الإجمالية للطلب:' : 'Total Order Net Amount:'}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {isAr ? 'شامل الضرائب والخصومات المعتمدة' : 'Tax & discounts included'}
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-[#7F1625] dark:text-[#ff8ba0]">
                {Number(selectedOrderForView.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintOrder(selectedOrderForView)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2d] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة الفاتورة الضريبية الرسمية A4' : 'Print Tax Invoice (A4)'}</span>
                </button>

                {selectedOrderForView.status === 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleReserveStock(selectedOrderForView.id)}
                    disabled={reservingOrderId === selectedOrderForView.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {reservingOrderId === selectedOrderForView.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PackageCheck className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'تأكيد حجز المخزون الآن' : 'Reserve Stock Now'}</span>
                  </button>
                )}

                {selectedOrderForView.status !== 'fulfilled' && (
                  <button
                    type="button"
                    onClick={() => handleFulfillOrder(selectedOrderForView.id)}
                    disabled={deliveringOrderId === selectedOrderForView.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {deliveringOrderId === selectedOrderForView.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'صرف وخصم المخزن وفوترة الطلب' : 'Fulfill & Deduct Stock'}</span>
                  </button>
                )}
              </div>

              <Button type="button" variant="ghost" onClick={() => setSelectedOrderForView(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SALES RETURNS VIEW */}
      {activeSubTab === 'returns' && (() => {
        const totalReturnsCount = salesReturns.length;
        const totalReturnsValue = salesReturns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
        const restockedCount = salesReturns.filter(r => r.is_restocked).length;
        const creditedCount = creditNotes.length || salesReturns.filter(r => r.refund_status === 'credited').length;
        const cashRefundedCount = salesReturns.filter(r => r.refund_status === 'refunded').length;

        const filteredReturns = salesReturns.filter(ret => {
          const q = returnSearchQuery.toLowerCase().trim();
          const matchesQuery = !q ||
            ret.return_number?.toLowerCase().includes(q) ||
            ret.customer?.name?.toLowerCase().includes(q) ||
            (ret as any).customer_name?.toLowerCase().includes(q) ||
            (ret as any).sales_invoice?.invoice_number?.toLowerCase().includes(q) ||
            ret.sales_invoice_id?.toLowerCase().includes(q);

          const matchesStatus = returnStatusFilter === 'all' ||
            (returnStatusFilter === 'credited' && ret.refund_status === 'credited') ||
            (returnStatusFilter === 'refunded' && ret.refund_status === 'refunded') ||
            (returnStatusFilter === 'pending' && ret.refund_status === 'pending');

          return matchesQuery && matchesStatus;
        });

        return (
          <div className="space-y-6">
            {/* Top 4 KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">{isAr ? 'إجمالي المرتجعات' : 'Total Returns'}</span>
                  <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                    {totalReturnsCount}
                  </span>
                  <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                    {isAr ? 'عمليات استرجاع مسجلة' : 'Recorded Returns'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                  <RotateCcw className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">{isAr ? 'إجمالي القيمة الدائنة' : 'Total Returned Value'}</span>
                  <span className="text-2xl font-black font-mono text-[#7F1625] dark:text-[#ff8ba0] mt-1 block">
                    {totalReturnsValue.toLocaleString()} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {creditedCount} {isAr ? 'إشعار دائن معتمد' : 'Credit Notes'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">{isAr ? 'بضائع أُعيدت للمخزن' : 'Restocked to WH'}</span>
                  <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {restockedCount}
                  </span>
                  <span className="text-[10px] text-emerald-600 block mt-0.5 font-bold">
                    {isAr ? 'تم زيادة الرصيد بالمستودع' : 'On-hand stock updated'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <PackageCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-bold">{isAr ? 'مستردات نقدية فورية' : 'Cash Refunds'}</span>
                  <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {cashRefundedCount}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {isAr ? 'سندات صرف نقدية من الخزينة' : 'Disbursed cash vouchers'}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <Receipt className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main Card with Action Header & Search */}
            <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm rounded-3xl">
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-[#7F1625] dark:text-[#ff8ba0]" />
                    <span>{isAr ? 'سجل مرتجعات المبيعات وإشعارات الدائن المعتمدة' : 'Sales Returns & Approved Credit Notes'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr ? 'إدارة وتتبع مرتجعات العملاء، فحص البضاعة، إعادة التخزين للمستودع، وإصدار إشعارات الدائن الرسمية والاسترداد النقدي.' : 'Track returns, inspect items, restock inventory, and issue official credit notes.'}
                  </p>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedInvoiceForReturn(null);
                    setIsRecordReturnOpen(true);
                  }}
                  className="bg-[#7F1625] hover:bg-[#6a121e] text-white shadow-md hover:scale-105 transition-all"
                  icon={<Plus className="w-4 h-4" />}
                >
                  {isAr ? 'تسجيل مرتجع مبيعات جديد' : 'New Sales Return'}
                </Button>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                  <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder={isAr ? 'بحث برقم المرتجع، الفاتورة الأصلية، أو اسم العميل...' : 'Search returns, invoices, customer...'}
                    value={returnSearchQuery}
                    onChange={(e) => setReturnSearchQuery(e.target.value)}
                    className="w-full text-xs ps-9 pe-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">{isAr ? 'الحالة المالية:' : 'Status:'}</span>
                  <select
                    value={returnStatusFilter}
                    onChange={(e) => setReturnStatusFilter(e.target.value as any)}
                    className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
                    <option value="credited">{isAr ? '🏷️ إشعار دائن بحساب العميل' : 'Credited to Ledger'}</option>
                    <option value="refunded">{isAr ? '💵 مسترد نقداً للمشتري' : 'Cash Refunded'}</option>
                    <option value="pending">{isAr ? '⏳ قيد المراجعة' : 'Pending'}</option>
                  </select>
                </div>
              </div>

              {/* Returns Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3 text-start">{isAr ? 'رقم المرتجع' : 'Return #'}</th>
                      <th className="p-3 text-start">{isAr ? 'الفاتورة الأصلية' : 'Source Invoice'}</th>
                      <th className="p-3 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                      <th className="p-3 text-start">{isAr ? 'المخزن المستلم' : 'Warehouse'}</th>
                      <th className="p-3 text-start">{isAr ? 'تاريخ المرتجع' : 'Date'}</th>
                      <th className="p-3 text-start">{isAr ? 'إجمالي القيمة' : 'Credit Amount'}</th>
                      <th className="p-3 text-center">{isAr ? 'حالة المخزن' : 'Restock'}</th>
                      <th className="p-3 text-center">{isAr ? 'الإشعار المالي' : 'Financial Settlement'}</th>
                      <th className="p-3 text-center min-w-[120px]">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {filteredReturns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-12 text-center">
                          <div className="max-w-md mx-auto space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold shadow-inner">
                              <RotateCcw className="w-8 h-8" />
                            </div>
                            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">
                              {isAr ? 'لا توجد مرتجعات مبيعات مسجلة حتى الآن' : 'No Sales Returns Recorded Yet'}
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {isAr
                                ? 'يمكنك بسهولة تسجيل مرتجع مبيعات من فاتورة سابقة أو إرجاع مباشر. يقوم النظام تلقائياً بإعادة البضاعة السليمة إلى رصيد المخزن التام وإصدار إشعار دائن أو صرف نقدي معتمد.'
                                : 'Record sales returns from existing invoices with automatic inventory restocking and credit note generation.'}
                            </p>
                            <div className="pt-2">
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setSelectedInvoiceForReturn(null);
                                  setIsRecordReturnOpen(true);
                                }}
                                className="bg-[#7F1625] hover:bg-[#6a121e] text-white shadow-md hover:scale-105 transition-all"
                                icon={<Plus className="w-4 h-4" />}
                              >
                                {isAr ? 'تسجيل أول مرتجع مبيعات الآن' : 'Record First Return Now'}
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredReturns.map((ret: any) => (
                        <tr key={ret.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-semibold text-slate-900 dark:text-white font-mono">
                            <span className="block font-black text-xs text-[#7F1625] dark:text-[#ff8ba0]">
                              {ret.return_number}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                            {ret.sales_invoice?.invoice_number || ret.sales_order?.order_number || (ret.sales_invoice_id ? 'فاتورة معتمدة' : '—')}
                          </td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {ret.customer?.name || ret.customer_name || (isAr ? 'عميل تجزئة / نقدي' : 'Retail Customer')}
                          </td>
                          <td className="p-3 text-xs text-slate-600 dark:text-slate-400">
                            {ret.warehouse?.name || (isAr ? 'مستودع المنتجات التامة' : 'Finished Goods WH')}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-xs">
                            {formatCleanDate(ret.return_date || ret.created_at)}
                          </td>
                          <td className="p-3 font-bold text-[#7F1625] dark:text-[#ff8ba0] font-mono text-sm">
                            {Number(ret.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={ret.is_restocked ? 'success' : 'neutral'}>
                              {ret.is_restocked ? (isAr ? '✓ مسترجع للمخزن' : 'Restocked') : (isAr ? 'خارج المخزن' : 'No restock')}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={ret.refund_status === 'refunded' ? 'info' : 'success'}>
                              {ret.refund_status === 'refunded'
                                ? (isAr ? '💵 مسدد نقداً' : 'Cash Refunded')
                                : ret.refund_status === 'credited'
                                ? (isAr ? '🏷️ دائن معتمد' : 'Credited')
                                : ret.refund_status}
                            </Badge>
                          </td>

                          {/* Professional Action Icons */}
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Action 1: View Return Details Modal */}
                              <button
                                type="button"
                                onClick={() => setSelectedReturnForView(ret)}
                                title={isAr ? 'معاينة تفاصيل المرتجع وبنود الأصناف' : 'View Return Details'}
                                className="p-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Action 2: Print Official Credit Note A4 */}
                              <button
                                type="button"
                                onClick={() => setSelectedReturnForPrint(ret)}
                                title={isAr ? 'طباعة إشعار دائن رسمي وسند مرتجع A4' : 'Print Credit Note (A4)'}
                                className="p-2 rounded-xl bg-[#7F1625]/10 hover:bg-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30 transition-all hover:scale-105 cursor-pointer shadow-xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Action 3: Process Cash Refund if not yet refunded */}
                              {ret.refund_status !== 'refunded' && (
                                <button
                                  type="button"
                                  onClick={() => handleProcessReturnRefund(ret)}
                                  disabled={refundingReturnId === ret.id}
                                  title={isAr ? 'صرف استرداد نقدي فوري من الخزينة' : 'Disburse Cash Refund'}
                                  className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all hover:scale-105 cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                  {refundingReturnId === ret.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <DollarSign className="w-3.5 h-3.5" />
                                  )}
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
          </div>
        );
      })()}

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

      {/* RECORD SALES RETURN MODAL */}
      <RecordSalesReturnModal
        isOpen={isRecordReturnOpen || isReturnModalOpen}
        onClose={() => {
          setIsRecordReturnOpen(false);
          setIsReturnModalOpen(false);
          setSelectedInvoiceForReturn(null);
        }}
        invoices={invoices}
        customers={customers}
        warehouses={warehouses}
        preselectedInvoice={selectedInvoiceForReturn}
        onSuccess={(createdReturn) => {
          loadSalesData();
          setSelectedReturnForPrint(createdReturn);
        }}
        isAr={isAr}
      />

      {/* PRINT OFFICIAL CREDIT NOTE MODAL (A4) */}
      <PrintCreditNoteModal
        isOpen={!!selectedReturnForPrint}
        onClose={() => setSelectedReturnForPrint(null)}
        salesReturn={selectedReturnForPrint}
        isAr={isAr}
        autoPrint={false}
      />

      {/* VIEW SALES RETURN DETAILS MODAL */}
      <ViewSalesReturnModal
        isOpen={!!selectedReturnForView}
        onClose={() => setSelectedReturnForView(null)}
        salesReturn={selectedReturnForView}
        onPrintCreditNote={(ret) => setSelectedReturnForPrint(ret)}
        onProcessRefund={(ret) => handleProcessReturnRefund(ret)}
        isAr={isAr}
      />

      {/* 80mm POS THERMAL RECEIPT MODAL */}
      <PosReceiptModal
        isOpen={isReceiptModalOpen}
        autoPrint={autoPrintReceipt}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setSelectedInvoiceForReceipt(null);
          setAutoPrintReceipt(false);
        }}
        invoice={selectedInvoiceForReceipt}
        lang={lang}
        onOpenA4Invoice={(inv) => {
          setSelectedInvoiceForPrint(inv);
          setAutoPrintTrigger(true);
        }}
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

      {/* Modal: View Quotation Details */}
      {selectedQuoteForView && (
        <Modal
          isOpen={!!selectedQuoteForView}
          onClose={() => setSelectedQuoteForView(null)}
          title={`${isAr ? 'ملف عرض السعر الرسمي: ' : 'Quotation Dossier: '}${selectedQuoteForView.quotation_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'اسم العميل' : 'Customer Name'}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{selectedQuoteForView.customer_name}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'تاريخ التحرير' : 'Issue Date'}</p>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">{formatCleanDate(selectedQuoteForView.created_at)}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'صالح حتى موعد' : 'Valid Until'}</p>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">{formatCleanDate(selectedQuoteForView.valid_until)}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'حالة العرض' : 'Status'}</p>
                <div className="mt-1">
                  {selectedQuoteForView.status === 'converted' ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] border border-[#7F1625]/30">
                      📑 {isAr ? 'محول لأمر بيع' : 'Converted'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      📝 {selectedQuoteForView.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {isAr ? 'بنود ومواصفات عرض السعر' : 'Quotation Line Items'}
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {selectedQuoteForView.items && selectedQuoteForView.items.length > 0 ? (
                  selectedQuoteForView.items.map((it: any, idx: number) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {it.description || (isAr ? 'موديل ملابس معتمد' : 'Garment Line')}
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {isAr ? 'الكمية: ' : 'Qty: '}{it.quantity} {isAr ? 'قطعة' : 'pcs'}
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {Number(it.total_price || (it.quantity * it.unit_price)).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                        <div className="text-[11px] text-slate-400">@{Number(it.unit_price).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-2">{isAr ? 'لا توجد بنود تفصيلية' : 'No items'}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#7F1625]/10 border border-[#7F1625]/25">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي قيمة عرض السعر:' : 'Total Amount:'}
              </span>
              <span className="text-2xl font-black font-mono text-[#7F1625] dark:text-[#ff8ba0]">
                {Number(selectedQuoteForView.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </span>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuoteForPrint(selectedQuoteForView);
                    setAutoPrintTrigger(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2d] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة عرض السعر الرسمي A4' : 'Print Quotation (A4)'}</span>
                </button>

                {selectedQuoteForView.status !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleConvertQuotation(selectedQuoteForView.id);
                      setSelectedQuoteForView(null);
                    }}
                    disabled={convertingQuoteId === selectedQuoteForView.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {convertingQuoteId === selectedQuoteForView.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span>{isAr ? 'تأكيد وتحويل لأمر بيع الآن' : 'Confirm & Convert to Order'}</span>
                  </button>
                )}
              </div>

              <Button type="button" variant="ghost" onClick={() => setSelectedQuoteForView(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: View Tax Invoice Details Dossier */}
      {selectedInvoiceForView && (
        <Modal
          isOpen={!!selectedInvoiceForView}
          onClose={() => setSelectedInvoiceForView(null)}
          title={`${isAr ? 'ملف فاتورة المبيعات الضريبية: ' : 'Sales Invoice Dossier: '}${selectedInvoiceForView.invoice_number}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'اسم العميل' : 'Customer Name'}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">{selectedInvoiceForView.customer_name}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'تاريخ التحرير' : 'Invoice Date'}</p>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1">{formatCleanDate(selectedInvoiceForView.invoice_date)}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'طريقة السداد' : 'Payment'}</p>
                <p className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-1 capitalize">{selectedInvoiceForView.payment_method?.replace('_', ' ')}</p>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-semibold">{isAr ? 'حالة الفاتورة' : 'Status'}</p>
                <div className="mt-1">
                  <Badge variant={selectedInvoiceForView.status === 'paid' ? 'success' : 'neutral'}>
                    {selectedInvoiceForView.status === 'paid' ? (isAr ? 'مسددة بالكامل' : 'Paid') : selectedInvoiceForView.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <table className="w-full text-start">
                <thead className="bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 text-start">#</th>
                    <th className="p-2.5 text-start">{isAr ? 'بيان الصنف والموديل' : 'Item Description'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                    <th className="p-2.5 text-end">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="p-2.5 text-end">{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {((selectedInvoiceForView.items as any[]) || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        {isAr ? 'لا توجد بنود تفصيلية مسجلة' : 'No items recorded'}
                      </td>
                    </tr>
                  ) : (
                    (selectedInvoiceForView.items as any[]).map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {it.variant?.garment_model?.name || it.variant?.garmentModel?.name || it.description || (isAr ? 'صنف جاهز' : 'Garment item')}
                          {it.variant?.sku && <span className="block font-mono text-[10px] text-slate-400 font-normal">SKU: {it.variant.sku}</span>}
                        </td>
                        <td className="p-2.5 text-center font-bold">{it.quantity} {isAr ? 'قطعة' : 'pcs'}</td>
                        <td className="p-2.5 text-end font-mono">{Number(it.unit_price).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="p-2.5 text-end font-bold font-mono text-[#7F1625]">{Number(it.total_price || (it.quantity * it.unit_price)).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-mono font-bold">{Number(selectedInvoiceForView.subtotal || selectedInvoiceForView.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
              {Number(selectedInvoiceForView.discount_amount) > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>{isAr ? 'خصم نقدي تجاري للعميل:' : 'Customer Discount:'}</span>
                  <span className="font-mono">-{Number(selectedInvoiceForView.discount_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 dark:border-slate-800 text-[#7F1625] dark:text-[#ff8ba0]">
                <span>{isAr ? 'صافي القيمة الإجمالية:' : 'Grand Total:'}</span>
                <span className="font-mono">{Number(selectedInvoiceForView.total_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForPrint(selectedInvoiceForView);
                    setAutoPrintTrigger(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2d] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة فاتورة ضريبية رسمية A4' : 'Print Tax Invoice (A4)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceForReceipt(selectedInvoiceForView);
                    setAutoPrintReceipt(true);
                    setIsReceiptModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>{isAr ? 'طباعة إيصال حراري (80mm)' : 'Print POS Receipt (80mm)'}</span>
                </button>
              </div>

              <Button type="button" variant="ghost" onClick={() => setSelectedInvoiceForView(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* OFFICIAL A4 PRINTABLE INVOICE & QUOTATION MODAL */}
      <PrintSalesInvoiceModal
        isOpen={!!selectedOrderForPrint || !!selectedQuoteForPrint || !!selectedInvoiceForPrint}
        autoPrint={autoPrintTrigger}
        onClose={() => {
          setSelectedOrderForPrint(null);
          setSelectedQuoteForPrint(null);
          setSelectedInvoiceForPrint(null);
          setAutoPrintTrigger(false);
        }}
        order={selectedOrderForPrint}
        invoice={selectedInvoiceForPrint}
        quotation={selectedQuoteForPrint}
        isAr={isAr}
      />
    </div>
  );
};

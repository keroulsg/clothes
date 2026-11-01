import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  QrCode,
  ShieldCheck,
  ArrowRight,
  MessageCircle,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import type { Language } from '../../types';

interface PublicOrderTrackerProps {
  lang: Language;
  onNavigateHome: () => void;
  tenantIdentifier?: string;
  initialOrderNumber?: string;
  initialPhone?: string;
}

export const PublicOrderTracker: React.FC<PublicOrderTrackerProps> = ({
  lang,
  onNavigateHome,
  tenantIdentifier,
  initialOrderNumber = '',
  initialPhone = '',
}) => {
  const isAr = lang === 'ar';
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [phone, setPhone] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [storeInfo, setStoreInfo] = useState<any | null>(null);

  // Receipt submission state
  const [instapayRef, setInstapayRef] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState<string | null>(null);

  const handleTrackOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم الطلب ورقم الهاتف المسجل' : 'Please enter order number and registered phone');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setReceiptSuccessMsg(null);

    try {
      const res = await api.storefront.trackOrder({
        order_number: orderNumber.trim(),
        customer_phone: phone.trim(),
        tenant_id: tenantIdentifier,
      });

      if (res?.order) {
        setOrderData(res.order);
        setStoreInfo(res.store_info);
        if (res.order.instapay_reference) {
          setInstapayRef(res.order.instapay_reference);
        }
      } else {
        setErrorMsg(isAr ? 'تعذر العثور على الطلب' : 'Order not found');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'لم نتمكن من العثور على طلب مطابق للبيانات المدخلة' : 'Could not find a matching order'));
      setOrderData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderNumber && initialPhone) {
      handleTrackOrder();
    }
  }, [initialOrderNumber, initialPhone]);

  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instapayRef.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال رقم عملية التحويل المرجعي لـ InstaPay' : 'Please enter InstaPay reference number');
      return;
    }

    setIsSubmittingReceipt(true);
    setErrorMsg(null);
    setReceiptSuccessMsg(null);

    try {
      const res = await api.storefront.submitReceipt({
        order_number: orderData.order_number,
        customer_phone: phone.trim(),
        instapay_reference: instapayRef.trim(),
        instapay_receipt_url: receiptUrl.trim() || undefined,
        tenant_id: tenantIdentifier,
      });

      setReceiptSuccessMsg(isAr ? 'تم استلام وتحديث بيانات التحويل بنجاح، وسيقوم فريق المراجعة بتأكيد الشحن.' : 'Receipt details submitted successfully!');
      if (res?.order) {
        setOrderData((prev: any) => ({
          ...prev,
          payment_status: res.order.payment_status,
          instapay_reference: res.order.instapay_reference,
          instapay_receipt_url: res.order.instapay_receipt_url,
          payment_rejection_reason: null,
        }));
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إرسال بيانات التحويل' : 'Failed to submit receipt'));
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'new':
      case 'confirmed':
        return 1;
      case 'preparing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return -1;
      default:
        return 1;
    }
  };

  const currentStep = orderData ? getStatusStepIndex(orderData.status) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onNavigateHome}>
            <ArrowRight className="w-4 h-4 me-1.5" />
            {isAr ? 'العودة للمتجر' : 'Back to Store'}
          </Button>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
            {isAr ? 'تتبع طلبات المستهلكين' : 'Customer Order Tracker'}
          </span>
        </div>

        {/* Search Card */}
        <Card className="p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isAr ? 'تتبع حالة شحنتك وطلبك' : 'Track Your Shipment & Order'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'أدخل رقم الطلب المرسل إليك ورقم الهاتف المسجل لمتابعة خط سير الشحنة والدفع'
                  : 'Enter your order number and registered phone to view real-time delivery status'}
              </p>
            </div>
          </div>

          <form onSubmit={handleTrackOrder} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">
                {isAr ? 'رقم الطلب (Order #)' : 'Order Number'}
              </label>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-20261027-XXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                {isAr ? 'رقم الهاتف المسجل' : 'Registered Phone'}
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010XXXXXXXX"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                required
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="primary" disabled={isLoading} className="w-full sm:w-auto">
                <Search className="w-4 h-4 me-1.5" />
                {isLoading ? (isAr ? 'جاري البحث...' : 'Searching...') : (isAr ? 'استعلام وتتبع الطلب' : 'Track Order')}
              </Button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {receiptSuccessMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{receiptSuccessMsg}</span>
            </div>
          )}
        </Card>

        {/* Tracking Results View */}
        {orderData && (
          <div className="space-y-6">
            {/* Status Header Card */}
            <Card className="p-6 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{isAr ? 'طلب رقم:' : 'Order #:'}</span>
                    <span className="font-mono font-bold text-base text-primary">{orderData.order_number}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isAr ? 'تاريخ الطلب:' : 'Order Date:'} {new Date(orderData.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {orderData.status === 'new' && <Badge variant="warning">{isAr ? 'طلب جديد قيد التجهيز' : 'New Order'}</Badge>}
                  {orderData.status === 'confirmed' && <Badge variant="info">{isAr ? 'مؤكد من إدارة المصنع' : 'Confirmed'}</Badge>}
                  {orderData.status === 'preparing' && <Badge variant="brand">{isAr ? 'جاري تجهيز وتغليف الشحنة' : 'Packaging'}</Badge>}
                  {orderData.status === 'shipped' && <Badge variant="brand">{isAr ? 'الشحنة في الطريق إليك' : 'Out for Delivery'}</Badge>}
                  {orderData.status === 'delivered' && <Badge variant="success">{isAr ? 'تم تسليم الشحنة بنجاح' : 'Delivered'}</Badge>}
                  {orderData.status === 'cancelled' && <Badge variant="danger">{isAr ? 'الطلب ملغي' : 'Cancelled'}</Badge>}
                </div>
              </div>

              {/* Progress Steps */}
              {orderData.status !== 'cancelled' ? (
                <div className="mt-8">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                        currentStep >= 1 ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        1
                      </div>
                      <span className={`font-semibold ${currentStep >= 1 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {isAr ? 'استلام الطلب' : 'Received'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                        currentStep >= 2 ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        2
                      </div>
                      <span className={`font-semibold ${currentStep >= 2 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {isAr ? 'التجهيز والتعبئة' : 'Preparing'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                        currentStep >= 3 ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        3
                      </div>
                      <span className={`font-semibold ${currentStep >= 3 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                        {isAr ? 'الشحن' : 'Shipped'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                        currentStep >= 4 ? 'bg-emerald-600 text-white ring-4 ring-emerald-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        4
                      </div>
                      <span className={`font-semibold ${currentStep >= 4 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isAr ? 'تم التسليم' : 'Delivered'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-rose-800 dark:text-rose-200">
                      {isAr ? 'تم إلغاء هذا الطلب واستعادة المخزون' : 'This order has been cancelled'}
                    </h4>
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                      {isAr
                        ? 'إذا كان هذا الإلغاء عن طريق الخطأ أو ترغب في إعادة الطلب، يرجى التواصل مع خدمة عملاء المتجر.'
                        : 'If you believe this is an error, please contact customer support.'}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment Audit & InstaPay Status Card */}
            <Card className="p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                {isAr ? 'حالة الدفع والتدقيق المالي' : 'Payment Status & Verification'}
              </h3>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{isAr ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                  <span className="font-semibold uppercase">{orderData.payment_method}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">{isAr ? 'حالة السداد:' : 'Payment Status:'}</span>
                  <div>
                    {orderData.payment_status === 'verified_paid' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {isAr ? 'معتمد ومؤكد رسمياً ✓' : 'Verified Paid'}
                      </span>
                    )}
                    {orderData.payment_status === 'pending_review' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        {isAr ? 'قيد التدقيق والمراجعة من الإدارة' : 'Pending Audit'}
                      </span>
                    )}
                    {orderData.payment_status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" />
                        {isAr ? 'تم رفض التحويل البنكي' : 'Payment Rejected'}
                      </span>
                    )}
                    {orderData.payment_status === 'cod_pending' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {isAr ? 'تحصيل نقدي عند استلام الشحنة' : 'Cash on Delivery'}
                      </span>
                    )}
                  </div>
                </div>

                {orderData.payment_rejection_reason && (
                  <div className="p-3 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 text-xs">
                    <span className="font-bold">{isAr ? 'سبب الرفض المسجل من المحاسب: ' : 'Rejection Reason: '}</span>
                    {orderData.payment_rejection_reason}
                  </div>
                )}
              </div>

              {/* InstaPay Receipt Submission / Re-submission form */}
              {orderData.payment_method === 'instapay' && orderData.status !== 'cancelled' && orderData.payment_status !== 'verified_paid' && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-xs mb-2 flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                    <QrCode className="w-4 h-4" />
                    {isAr ? 'رفع / تصحيح بيانات تحويل InstaPay' : 'Submit / Update InstaPay Receipt'}
                  </h4>

                  {storeInfo?.instapay_handle && (
                    <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-purple-800 dark:text-purple-300 font-semibold">{isAr ? 'معرف التحويل (Handle):' : 'InstaPay Handle:'}</span>
                        <span className="font-mono font-bold text-purple-900 dark:text-purple-100">{storeInfo.instapay_handle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-800 dark:text-purple-300">{isAr ? 'اسم المستفيد:' : 'Beneficiary:'}</span>
                        <span className="font-semibold">{storeInfo.instapay_account_name}</span>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmitReceipt} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isAr ? 'الرقم المرجعي لعملية التحويل (InstaPay Reference ID)' : 'InstaPay Reference ID'}
                      </label>
                      <input
                        type="text"
                        value={instapayRef}
                        onChange={(e) => setInstapayRef(e.target.value)}
                        placeholder="e.g. IPN20261027XXXX"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        {isAr ? 'رابط صورة إيصال التحويل (اختياري)' : 'Receipt Screenshot URL (Optional)'}
                      </label>
                      <input
                        type="url"
                        value={receiptUrl}
                        onChange={(e) => setReceiptUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>

                    <Button type="submit" size="sm" variant="primary" disabled={isSubmittingReceipt} className="w-full">
                      <RefreshCw className="w-3.5 h-3.5 me-1" />
                      {isSubmittingReceipt ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'إرسال بيانات التحويل للمراجعة' : 'Submit Receipt for Review')}
                    </Button>
                  </form>
                </div>
              )}
            </Card>

            {/* Order Items & Shipping Address */}
            <Card className="p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm mb-3">
                {isAr ? 'تفاصيل المنتجات والعنوان' : 'Order Items & Delivery Details'}
              </h3>

              <div className="text-xs text-slate-500 mb-3">
                <span className="font-semibold text-slate-900 dark:text-white">{orderData.customer_name}</span> • {orderData.city} - {orderData.shipping_address}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {orderData.items?.map((item: any) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.product_name}</p>
                      <div className="flex items-center gap-2 text-slate-400 mt-0.5">
                        <span>{item.size || 'L'}</span>
                        <span>•</span>
                        <span>{item.color || 'Navy'}</span>
                        <span>•</span>
                        <span>{item.quantity} {isAr ? 'قطع' : 'pcs'} × {Number(item.unit_price).toLocaleString()} {storeInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {Number(item.total_price).toLocaleString()} {storeInfo?.currency || (isAr ? 'ج.م' : 'EGP')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span>{Number(orderData.subtotal).toLocaleString()} {storeInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'رسوم الشحن والتوصيل:' : 'Shipping Fee:'}</span>
                  <span>{Number(orderData.shipping_fee).toLocaleString()} {storeInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>{isAr ? 'الإجمالي الكلي:' : 'Total Amount:'}</span>
                  <span className="text-primary">{Number(orderData.total_amount).toLocaleString()} {storeInfo?.currency || (isAr ? 'ج.م' : 'EGP')}</span>
                </div>
              </div>

              {storeInfo?.contact_whatsapp && (
                <div className="mt-6 flex justify-end">
                  <a
                    href={`https://wa.me/${storeInfo.contact_whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      isAr ? `مرحباً، أود الاستفسار بخصوص الطلب رقم ${orderData.order_number}` : `Hello, inquiry regarding order ${orderData.order_number}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {isAr ? 'محادثة المتجر عبر واتساب' : 'Chat via WhatsApp'}
                  </a>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

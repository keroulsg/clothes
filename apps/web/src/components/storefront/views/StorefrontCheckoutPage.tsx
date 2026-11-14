import React, { useState, useMemo, useEffect } from 'react';
import {
  Truck,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  ArrowLeft,
  Copy,
  Check,
  MessageCircle,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';
import { api } from '../../../api/client';

export const StorefrontCheckoutPage: React.FC = () => {
  const {
    cart,
    subtotal,
    shippingQuote,
    setShippingQuote,
    discountAmount,
    total,
    currency,
    isAr,
    isDark,
    setActiveView,
    clearCart,
    wholesaleUser,
    storeSettings,
    tenantInfo,
    addToast,
    onNavigateToTracking,
  } = useStorefrontCommerce();

  // Egyptian Governorates list
  const governorates = useMemo(
    () => [
      { id: 'cairo', name_ar: 'القاهرة', name_en: 'Cairo', zone: 'cairo', rate: 50 },
      { id: 'giza', name_ar: 'الجيزة', name_en: 'Giza', zone: 'cairo', rate: 50 },
      { id: 'alexandria', name_ar: 'الإسكندرية', name_en: 'Alexandria', zone: 'delta', rate: 60 },
      { id: 'qalyubia', name_ar: 'القليوبية', name_en: 'Qalyubia', zone: 'cairo', rate: 50 },
      { id: 'dakahlia', name_ar: 'الدقهلية (المنصورة)', name_en: 'Dakahlia (Mansoura)', zone: 'delta', rate: 60 },
      { id: 'gharbia', name_ar: 'الغربية (طنطا)', name_en: 'Gharbia (Tanta)', zone: 'delta', rate: 60 },
      { id: 'sharqia', name_ar: 'الشرقية (الزقازيق)', name_en: 'Sharqia (Zagazig)', zone: 'delta', rate: 60 },
      { id: 'menofia', name_ar: 'المنوفية', name_en: 'Menofia', zone: 'delta', rate: 60 },
      { id: 'beheira', name_ar: 'البحيرة', name_en: 'Beheira', zone: 'delta', rate: 60 },
      { id: 'ismailia', name_ar: 'الإسماعيلية', name_en: 'Ismailia', zone: 'canal', rate: 60 },
      { id: 'suez', name_ar: 'السويس', name_en: 'Suez', zone: 'canal', rate: 60 },
      { id: 'portsaid', name_ar: 'بورسعيد', name_en: 'Port Said', zone: 'canal', rate: 60 },
      { id: 'fayoum', name_ar: 'الفيوم', name_en: 'Fayoum', zone: 'upper', rate: 80 },
      { id: 'benisuef', name_ar: 'بني سويف', name_en: 'Beni Suef', zone: 'upper', rate: 80 },
      { id: 'minya', name_ar: 'المنيا', name_en: 'Minya', zone: 'upper', rate: 80 },
      { id: 'assiut', name_ar: 'أسيوط', name_en: 'Assiut', zone: 'upper', rate: 80 },
      { id: 'sohag', name_ar: 'سوهاج', name_en: 'Sohag', zone: 'upper', rate: 80 },
      { id: 'qena', name_ar: 'قنا', name_en: 'Qena', zone: 'upper', rate: 80 },
      { id: 'luxor', name_ar: 'الأقصر', name_en: 'Luxor', zone: 'upper', rate: 80 },
      { id: 'aswan', name_ar: 'أسوان', name_en: 'Aswan', zone: 'upper', rate: 80 },
      { id: 'redsea', name_ar: 'البحر الأحمر (الغردقة)', name_en: 'Red Sea (Hurghada)', zone: 'remote', rate: 80 },
      { id: 'matrouh', name_ar: 'مطروح والساحل الشمالي', name_en: 'Matrouh', zone: 'remote', rate: 80 },
    ],
    []
  );

  // Form State
  const [formData, setFormData] = useState({
    customer_name: wholesaleUser ? wholesaleUser.contact_person : '',
    customer_phone: wholesaleUser ? wholesaleUser.phone || '' : '',
    customer_email: wholesaleUser ? wholesaleUser.email || '' : '',
    company_name: wholesaleUser ? wholesaleUser.company_name : '',
    governorate: 'cairo',
    city: 'القاهرة',
    address: '',
    notes: '',
    payment_method: 'cod', // 'cod' | 'instapay'
    instapay_reference: '',
  });

  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyText = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setIsCopied(true);
      addToast(isAr ? `تم نسخ ${label} بنجاح!` : `${label} copied!`, 'success');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  // Order Success Screen State
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  // Recalculate shipping based on governorate selection & free shipping policy (1,500 EGP)
  useEffect(() => {
    if (subtotal >= 1500) {
      setShippingQuote(0);
    } else {
      const selectedGov = governorates.find((g) => g.id === formData.governorate);
      setShippingQuote(selectedGov ? selectedGov.rate : 50);
    }
  }, [formData.governorate, subtotal, governorates, setShippingQuote]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!formData.customer_name.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال اسم المستلم بالكامل' : 'Please provide recipient full name');
      return;
    }

    if (!formData.customer_phone.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال رقم الهاتف للتواصل والشحن' : 'Please provide recipient phone number');
      return;
    }

    if (!formData.address.trim()) {
      setErrorMessage(isAr ? 'يرجى كتابة العنوان التفصيلي للتوصيل' : 'Please enter detailed delivery address');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage(isAr ? 'يجب الموافقة على شروط الشحن والاستبدال' : 'You must accept terms of delivery');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        tenant_id: tenantInfo?.id,
        order_type: wholesaleUser?.is_approved ? 'wholesale' : 'retail',
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone,
        customer_email: formData.customer_email || null,
        shipping_address: `${formData.address}, ${formData.city}, ${formData.governorate}`,
        city: formData.city || formData.governorate || 'Cairo',
        notes: formData.notes || null,
        payment_method: formData.payment_method,
        instapay_reference: formData.instapay_reference.trim() || null,
        items: cart.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      const res = await api.storefront.placePublicOrder(payload, tenantInfo?.id);
      const order = res?.order || res;

      setCreatedOrder(order);
      clearCart();
      addToast(
        isAr ? 'تم استلام طلبك بنجاح وجارٍ تجهيزه في المصنع!' : 'Your order has been placed successfully!',
        'success'
      );
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (isAr ? 'حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة لاحقاً.' : 'Failed to place order. Please try again.');
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order was placed, render Order Confirmation View
  if (createdOrder) {
    return (
      <div
        className={`min-h-[70vh] py-12 flex flex-col items-center justify-center transition-colors duration-200 ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-lg w-full mx-4 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              {isAr ? 'تم تأكيد طلبك بنجاح!' : 'Order Placed Successfully!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? 'شكراً لثقتكم بمصنعنا. تم حجز المنتجات وإصدار أمر البيع الفوري.'
                : 'Thank you for your order. Finished goods have been allocated.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-left space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">{isAr ? 'رقم الطلب:' : 'Order Number:'}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {createdOrder.order_number || createdOrder.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyText(createdOrder.order_number || createdOrder.id, isAr ? 'رقم الطلب' : 'Order number')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition"
                  title={isAr ? 'نسخ رقم الطلب' : 'Copy'}
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'اسم المستلم:' : 'Customer Name:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formData.customer_name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'رقم الهاتف:' : 'Phone:'}</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formData.customer_phone}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'طريقة الدفع:' : 'Payment:'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                {formData.payment_method === 'instapay' ? 'InstaPay Transfer' : 'Cash on Delivery'}
              </span>
            </div>
          </div>

          {/* InstaPay Transfer Instructions Banner if chosen */}
          {formData.payment_method === 'instapay' && (
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 text-left space-y-2">
              <div className="flex items-center justify-between font-bold text-blue-700 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4" />
                  <span>{isAr ? 'بيانات التحويل عبر إنستاباي:' : 'InstaPay Transfer Details:'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(storeSettings?.instapay_handle || '01220821706', isAr ? 'رقم/عنوان إنستاباي' : 'InstaPay Handle')}
                  className="text-[11px] font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>{isAr ? 'نسخ الحساب' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 font-mono text-center font-bold text-blue-600 dark:text-blue-400 text-sm">
                {storeSettings?.instapay_handle || storeSettings?.instapay_identifier || '01220821706'}
              </div>
              <p className="text-[11px] leading-relaxed">
                {storeSettings?.instapay_instructions ||
                  (isAr
                    ? `يرجى إرسال مبلغ ${total} ${currency} إلى الحساب الموضح أعلاه، ثم الضغط على زر التتبع لإرفاق صورة إيصال التحويل مباشرة.`
                    : `Please transfer ${total} ${currency} to the handle above, then track order to submit the payment receipt.`)}
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              variant="primary"
              className="w-full py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              onClick={() => onNavigateToTracking(createdOrder.order_number || createdOrder.id, formData.customer_phone)}
            >
              <Truck className="w-4 h-4" />
              <span>{isAr ? 'تتبع حالة الشحن والتوصيل' : 'Track Order Status'}</span>
            </Button>

            {/* Direct WhatsApp Confirmation to Factory */}
            <Button
              variant="outline"
              className="w-full py-2.5 rounded-xl text-xs font-bold border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center justify-center gap-2"
              onClick={() => {
                const factoryPhone = (storeSettings?.contact_whatsapp || storeSettings?.instapay_handle || '01220821706').replace(/[^0-9]/g, '');
                const intlPhone = factoryPhone.startsWith('0') ? `20${factoryPhone.slice(1)}` : factoryPhone;
                const currentHost = window.location.origin;
                const tenantSlug = tenantInfo?.subdomain || tenantInfo?.code || tenantInfo?.id || '';
                const orderNum = createdOrder.order_number || createdOrder.id;
                const trackingUrl = `${currentHost}/#/store/${tenantSlug}/track?order_number=${encodeURIComponent(orderNum)}&customer_phone=${encodeURIComponent(formData.customer_phone)}`;

                const text = isAr
                  ? `مرحباً، قمت بتسجيل طلب شراء جديد من متجر المصنع:\n\n📦 رقم الطلب: ${orderNum}\n👤 اسم المستلم: ${formData.customer_name}\n📱 رقم الهاتف: ${formData.customer_phone}\n💰 إجمالي الطلب: ${total} ${currency}\n💳 طريقة السداد: ${formData.payment_method === 'instapay' ? 'تحويل إنستاباي' : 'الدفع نقداً عند الاستلام'}\n\n🔍 رابط متابعة الطلب والتتبع:\n${trackingUrl}`
                  : `Hello, I placed an order:\n\n📦 Order #: ${orderNum}\n👤 Name: ${formData.customer_name}\n📱 Phone: ${formData.customer_phone}\n💰 Total: ${total} ${currency}\n\n🔍 Tracking:\n${trackingUrl}`;

                window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(text)}`, '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'إرسال تأكيد الطلب للمصنع عبر واتساب' : 'Send Order to Factory WhatsApp'}</span>
            </Button>

            <Button
              variant="outline"
              className="w-full py-2.5 rounded-xl text-xs"
              onClick={() => {
                setCreatedOrder(null);
                setActiveView('home');
              }}
            >
              {isAr ? 'العودة للصفحة الرئيسية' : 'Back to Storefront'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen py-8 sm:py-12 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button onClick={() => setActiveView('cart')} className="hover:text-blue-600 flex items-center gap-1">
            <ArrowLeft className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
            <span>{isAr ? 'الرجوع لسلة المشتريات' : 'Back to Cart'}</span>
          </button>
          <span>/</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {isAr ? 'إتمام الشراء والدفع' : 'Checkout'}
          </span>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: MULTI-STEP CHECKOUT FORM (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SECTION 1: CUSTOMER CONTACT & IDENTITY */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'بيانات العميل والتواصل' : 'Customer Contact Details'}
                </h3>
              </div>

              {wholesaleUser?.is_approved && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    {isAr
                      ? `تم التعرف على حساب التاجر: ${wholesaleUser.company_name} (تطبيق أسعار التوريد بالجملة)`
                      : `Authenticated Wholesale Account: ${wholesaleUser.company_name}`}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'الاسم بالكامل *' : 'Full Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder={isAr ? 'أدخل اسمك واسم العائلة' : 'e.g. John Doe'}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'رقم الهاتف (للتوصيل وواتساب) *' : 'Phone Number *'}
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    placeholder="01012345678"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'البريد الإلكتروني (اختياري لتأكيد الشحنة)' : 'Email Address (Optional)'}
                  </label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: SHIPPING ADDRESS */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'عنوان الشحن والتوصيل' : 'Delivery Address'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'المحافظة *' : 'Governorate *'}
                  </label>
                  <select
                    value={formData.governorate}
                    onChange={(e) => handleInputChange('governorate', e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    {governorates.map((gov) => (
                      <option key={gov.id} value={gov.id}>
                        {isAr ? gov.name_ar : gov.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'المدينة / المنطقة *' : 'City / Area *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={isAr ? 'مثال: المعادي، الشيخ زايد، مدينة نصر' : 'e.g. New Cairo, Dokki'}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'العنوان التفصيلي (الشارع، رقم العمارة، الشقة) *' : 'Street Address & Apartment *'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder={isAr ? 'اسم الشارع، رقم المبنى، الدور، رقم الشقة، علامة مميزة' : 'Street name, building #, floor, apt'}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    {isAr ? 'ملاحظات خاصة بمندوب الشحن (اختياري)' : 'Delivery Notes (Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder={isAr ? 'مواعيد الاستلام المفضلة أو أي تعليمات إضافية' : 'Preferred delivery times'}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYMENT METHOD */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {isAr ? 'طريقة الدفع وسداد القيمة' : 'Payment Method'}
                </h3>
              </div>

              <div className="space-y-3">
                {/* Cash on Delivery Option */}
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition ${
                    formData.payment_method === 'cod'
                      ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="cod"
                    checked={formData.payment_method === 'cod'}
                    onChange={() => handleInputChange('payment_method', 'cod')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                      <span>{isAr ? 'الدفع نقداً عند الاستلام (COD)' : 'Cash on Delivery (COD)'}</span>
                      <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        {isAr ? 'الأكثر شيوعاً' : 'Popular'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      {isAr
                        ? 'سداد إجمالي المبلغ نقداً لمندوب شركة الشحن بعد معاينة الشحنة عند باب المنزل.'
                        : 'Pay cash to courier upon inspecting your package at your doorstep.'}
                    </p>
                  </div>
                </label>

                {/* InstaPay Option */}
                {storeSettings?.allow_instapay && (
                  <div
                    className={`rounded-xl border transition ${
                      formData.payment_method === 'instapay'
                        ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <label className="flex items-start gap-3.5 p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value="instapay"
                        checked={formData.payment_method === 'instapay'}
                        onChange={() => handleInputChange('payment_method', 'instapay')}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                          <span>{isAr ? 'تحويل لحظي عبر إنستاباي (InstaPay)' : 'InstaPay Bank Transfer'}</span>
                          <span className="bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px] px-2 py-0.2 rounded-full font-bold">
                            {isAr ? 'فوري وآمن' : 'Instant'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {isAr
                            ? 'تحويل مباشر لحساب المصنع البنكي عبر تطبيق إنستاباي مع إمكانية إرفاق إيصال التحويل.'
                            : 'Direct bank transfer via InstaPay app; transfer receipt can be uploaded.'}
                        </p>
                      </div>
                    </label>

                    {formData.payment_method === 'instapay' && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-blue-100 dark:border-blue-900/60 mt-1">
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{isAr ? 'اسم حساب المصنع:' : 'Account Name:'}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {storeSettings?.instapay_account_name || storeSettings?.instapay_display_name || 'Alpha Factory Operations'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">{isAr ? 'عنوان/رقم التحويل (IPA/Phone):' : 'InstaPay Handle/Phone:'}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                {storeSettings?.instapay_handle || storeSettings?.instapay_identifier || '01220821706'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyText(storeSettings?.instapay_handle || storeSettings?.instapay_identifier || '01220821706', isAr ? 'رقم الحساب' : 'Account')}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          {storeSettings?.instapay_instructions && (
                            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                              {storeSettings.instapay_instructions}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {isAr ? 'رقم عملية التحويل أو كود الإشعار (اختياري الآن):' : 'Transaction Reference (Optional):'}
                          </label>
                          <input
                            type="text"
                            value={formData.instapay_reference}
                            onChange={(e) => handleInputChange('instapay_reference', e.target.value)}
                            placeholder={isAr ? 'مثال: TXN-98765432 أو كود التحويل البنكي' : 'e.g. TXN-98765432'}
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY & SUBMIT (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-5 sticky top-24">
              <h3 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                {isAr ? 'تفاصيل المشتريات والرسوم' : 'Order Breakdown'}
              </h3>

              {/* Items Mini List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 pr-1 space-y-2">
                {cart.map((item) => (
                  <div key={item.variant_id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">
                        {item.product_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {item.size} / {item.color} × {item.quantity}
                      </p>
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 shrink-0">
                      {(item.quantity * item.unit_price).toLocaleString()} {currency}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>{isAr ? 'الخصم المطبق:' : 'Discount:'}</span>
                    <span>-{discountAmount.toLocaleString()} {currency}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'مصاريف الشحن الرسمية:' : 'Authoritative Shipping:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {shippingQuote === 0
                      ? isAr
                        ? 'شحن مجاني'
                        : 'FREE'
                      : `${shippingQuote} ${currency}`}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {isAr ? 'المبلغ النهائي المطلوب:' : 'Final Payable:'}
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {total.toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* Terms Acceptance Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 shrink-0"
                  />
                  <span>
                    {isAr
                      ? 'أوافق على سياسة التوصيل وحق الاستبدال خلال 14 يوماً وفق قانون التجارة وحماية المستهلك.'
                      : 'I accept the shipping policy and 14-day exchange rights.'}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 rounded-xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>{isAr ? 'جارٍ تسجيل الطلب بالمصنع...' : 'Processing Order...'}</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد وإرسال الطلب الآن' : 'Place Order Now'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

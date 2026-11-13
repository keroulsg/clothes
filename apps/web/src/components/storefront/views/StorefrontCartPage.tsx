import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';

export const StorefrontCartPage: React.FC = () => {
  const {
    cart,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    shippingQuote,
    couponCode,
    discountAmount,
    applyCoupon,
    total,
    currency,
    isAr,
    isDark,
    setActiveView,
    wholesaleUser,
  } = useStorefrontCommerce();

  const [inputCoupon, setInputCoupon] = useState(couponCode);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    applyCoupon(inputCoupon);
  };

  if (cart.length === 0) {
    return (
      <div
        className={`min-h-[60vh] flex flex-col items-center justify-center text-center p-8 transition-colors duration-200 ${
          isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          {isAr ? 'سلة المشتريات فارغة حالياً' : 'Your Shopping Cart is Empty'}
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mt-2">
          {isAr
            ? 'لم تقم بإضافة أي أزياء أو منتجات إلى السلة حتى الآن. تصفح أحدث التشكيلات وتسوق ما يناسبك.'
            : 'You have not added any items yet. Browse our catalog and discover factory-direct apparel.'}
        </p>
        <Button
          variant="primary"
          className="mt-6 text-xs px-6 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setActiveView('shop')}
        >
          {isAr ? 'ابدأ التسوق الآن' : 'Start Shopping Now'}
        </Button>
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {isAr ? 'مراجعة وتأكيد سلة المشتريات' : 'Shopping Cart Review'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isAr
                ? `لديك ${cart.reduce((s, i) => s + i.quantity, 0)} عنصر جاهز للشحن في سلتك`
                : `You have ${cart.reduce((s, i) => s + i.quantity, 0)} items ready to ship`}
            </p>
          </div>

          <button
            onClick={clearCart}
            className="text-xs text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'تفريغ السلة بالكامل' : 'Clear Entire Cart'}</span>
          </button>
        </div>

        {/* Layout Grid: Items Table + Summary Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: CART ITEMS LIST (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {cart.map((item) => (
                <div
                  key={item.variant_id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Item Description */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                      <img
                        src="https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=300&auto=format&fit=crop&q=80"
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {item.product_name}
                      </h3>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {isAr ? 'المقاس:' : 'Size:'} {item.size}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {isAr ? 'اللون:' : 'Color:'} {item.color}
                        </span>
                        {item.sku && (
                          <span className="font-mono text-[11px] text-slate-400">
                            {item.sku}
                          </span>
                        )}
                      </div>

                      {wholesaleUser?.is_approved && item.moq && item.moq > 1 && (
                        <div className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>MOQ: {item.moq} pcs</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity and Price */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800">
                    {/* Stepper */}
                    <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 h-10">
                      <button
                        onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                        className="px-2.5 h-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        disabled={wholesaleUser?.is_approved && item.moq ? item.quantity <= item.moq : item.quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-bold min-w-[32px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                        className="px-2.5 h-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                        disabled={item.quantity >= item.available_stock}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total Price */}
                    <div className="text-right">
                      <div className="text-base font-black text-blue-600 dark:text-blue-400">
                        {(item.quantity * item.unit_price).toLocaleString()} {currency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.unit_price} {currency} / pc
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => removeFromCart(item.variant_id)}
                      className="text-slate-400 hover:text-rose-500 p-1.5 transition"
                      title={isAr ? 'حذف' : 'Remove'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Back to Shopping Action */}
            <div className="pt-2">
              <button
                onClick={() => setActiveView('shop')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
              >
                <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                <span>{isAr ? 'متابعة تصفح المنتجات' : 'Continue Shopping'}</span>
              </button>
            </div>
          </div>

          {/* RIGHT: ORDER SUMMARY (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md space-y-5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
                {isAr ? 'ملخص الطلب والحساب' : 'Order Summary'}
              </h3>

              {/* Coupon Form */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">
                  {isAr ? 'كوبون الخصم:' : 'Discount Coupon:'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputCoupon}
                    onChange={(e) => setInputCoupon(e.target.value)}
                    placeholder="WELCOME10 / FREESHIP"
                    className="flex-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    className="text-xs px-4 rounded-xl font-bold"
                  >
                    {isAr ? 'تطبيق' : 'Apply'}
                  </Button>
                </div>
              </form>

              {/* Breakdown */}
              <div className="space-y-2 text-xs pt-2">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'المجموع الفرعي للمنتجات:' : 'Items Subtotal:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {subtotal.toLocaleString()} {currency}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <span>{isAr ? 'قيمة الخصم المطبق:' : 'Coupon Discount:'}</span>
                    <span>-{discountAmount.toLocaleString()} {currency}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'مصاريف الشحن التقديرية:' : 'Estimated Delivery:'}</span>
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
                    {isAr ? 'الإجمالي النهائي:' : 'Total Amount:'}
                  </span>
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {total.toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              {/* Checkout Call-to-Action */}
              <Button
                variant="primary"
                className="w-full py-3.5 rounded-xl font-black text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-lg"
                onClick={() => setActiveView('checkout')}
              >
                <span>{isAr ? 'متابعة إلى خطوة الدفع' : 'Proceed to Checkout'}</span>
                <ArrowRight className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`} />
              </Button>

              {/* Trust Badges */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{isAr ? 'توصيل خلال 2-4 أيام عمل' : 'Delivery in 2-4 business days'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isAr ? 'دفع عند الاستلام أو تحويل إنستاباي' : 'Cash on Delivery or InstaPay'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

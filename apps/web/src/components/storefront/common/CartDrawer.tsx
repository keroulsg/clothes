import React from 'react';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateQuantity,
    removeFromCart,
    subtotal,
    currency,
    isAr,
    isDark,
    setActiveView,
    wholesaleUser,
  } = useStorefrontCommerce();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div
        className={`fixed inset-y-0 max-w-full flex ${
          isAr ? 'left-0' : 'right-0'
        }`}
      >
        <div
          className={`w-screen max-w-md shadow-2xl flex flex-col transition-transform transform duration-300 ease-in-out ${
            isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900'
          }`}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-lg">
                {isAr ? 'سلة المشتريات' : 'Shopping Cart'}
              </h2>
              <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShoppingBag className="w-16 h-16 stroke-1 mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'سلة مشترياتك فارغة حالياً' : 'Your cart is empty'}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  {isAr
                    ? 'استكشف تشكيلاتنا الراقية وأضف منتجاتك المفضلة إلى السلة لتسوق فوري.'
                    : 'Explore our collections and add products to start shopping.'}
                </p>
                <Button
                  variant="primary"
                  className="mt-6 text-xs px-5 py-2.5 rounded-xl"
                  onClick={() => {
                    setIsCartOpen(false);
                    setActiveView('shop');
                  }}
                >
                  {isAr ? 'تصفح المتجر الآن' : 'Browse Shop'}
                </Button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.variant_id}
                  className="flex gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 relative group"
                >
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm truncate text-slate-800 dark:text-slate-100">
                        {item.product_name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.variant_id)}
                        className="text-slate-400 hover:text-rose-500 transition p-1"
                        title={isAr ? 'حذف العنصر' : 'Remove item'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {isAr ? 'المقاس:' : 'Size:'} {item.size}
                      </span>
                      <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {isAr ? 'اللون:' : 'Color:'} {item.color}
                      </span>
                      {wholesaleUser?.is_approved && item.moq && item.moq > 1 && (
                        <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">
                          MOQ: {item.moq}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {item.unit_price.toLocaleString()} {currency}
                      </div>

                      {/* Quantity Controller */}
                      <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                        <button
                          onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          disabled={wholesaleUser?.is_approved && item.moq ? item.quantity <= item.moq : item.quantity <= 1}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 py-1 text-xs font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          disabled={item.quantity >= item.available_stock}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Call-to-Action */}
          {cart.length > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50 dark:bg-slate-900/90">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {subtotal.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span>{isAr ? 'الإجمالي المقدر:' : 'Estimated Total:'}</span>
                <span className="text-base text-blue-600 dark:text-blue-400">
                  {subtotal.toLocaleString()} {currency}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
                <span>
                  {isAr
                    ? 'يتم احتساب مصاريف الشحن بدقة بناءً على عنوان التوصيل في صفحة الدفع.'
                    : 'Shipping fees calculated based on destination city at checkout.'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  className="w-full text-xs py-2.5 rounded-xl border-slate-300 dark:border-slate-700"
                  onClick={() => {
                    setIsCartOpen(false);
                    setActiveView('cart');
                  }}
                >
                  {isAr ? 'عرض تفاصيل السلة' : 'View Full Cart'}
                </Button>
                <Button
                  variant="primary"
                  className="w-full text-xs py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                  onClick={() => {
                    setIsCartOpen(false);
                    setActiveView('checkout');
                  }}
                >
                  <span>{isAr ? 'إتمام الشراء' : 'Checkout'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1 text-[10px] text-slate-400">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                <span>
                  {isAr
                    ? 'دفع آمن عند الاستلام أو بتحويل إنستاباي مباشر'
                    : 'Secure Cash on Delivery or Instant InstaPay Transfer'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

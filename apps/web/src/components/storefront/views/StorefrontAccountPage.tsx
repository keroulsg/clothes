import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Heart,
  Building2,
  Package,
  Truck,
  LogOut,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { Button } from '../../ui/Button';
import { api } from '../../../api/client';

export const StorefrontAccountPage: React.FC = () => {
  const {
    wholesaleUser,
    isWholesaleApproved,
    logoutWholesale,
    setIsWholesaleModalOpen,
    wishlist,
    toggleWishlist,
    variants,
    addToCart,
    navigateToProduct,
    currency,
    isAr,
    isDark,
    setActiveView,
    onNavigateToTracking,
    setIsCartOpen,
  } = useStorefrontCommerce();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'profile'>('orders');

  // Filter wishlist products
  const wishlistProducts = useMemo(() => {
    return variants.filter((v) => wishlist.includes(v.id));
  }, [variants, wishlist]);

  // Mock sample customer order history
  const sampleOrders = useMemo(
    () => [
      {
        id: 'ORD-2026-9841',
        created_at: '2026-11-12',
        status: 'shipped',
        total_amount: 1450,
        items_count: 3,
        payment_method: 'cod',
      },
      {
        id: 'ORD-2026-8712',
        created_at: '2026-11-04',
        status: 'delivered',
        total_amount: 3200,
        items_count: 8,
        payment_method: 'instapay',
      },
    ],
    []
  );

  return (
    <div
      className={`min-h-screen py-8 sm:py-12 transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* User Profile Header Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
              {wholesaleUser ? wholesaleUser.company_name[0] : 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {wholesaleUser ? wholesaleUser.company_name : isAr ? 'حساب العميل' : 'Customer Account'}
                </h1>
                {wholesaleUser && isWholesaleApproved && (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {isAr ? 'تاجر جملة معتمد' : 'Verified B2B'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {wholesaleUser
                  ? `${wholesaleUser.contact_person} • ${wholesaleUser.email || wholesaleUser.phone || ''}`
                  : isAr
                  ? 'تسجيل الدخول يتيح لك مراجعة طلباتك السابقة والاستفادة من خصومات الجملة.'
                  : 'Manage your profile, tracked shipments, and saved items.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {wholesaleUser ? (
              <Button
                variant="outline"
                className="text-xs text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                onClick={logoutWholesale}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isAr ? 'تسجيل الخروج' : 'Log Out'}</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                className="text-xs rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setIsWholesaleModalOpen(true)}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'دخول / تسجيل تاجر جملة (B2B)' : 'Wholesale B2B Sign In'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'orders'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>{isAr ? 'سجل الطلبات والشحنات' : 'My Orders & Shipments'}</span>
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'wishlist'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>{isAr ? 'قائمة المفضلة' : 'Saved Wishlist'}</span>
            <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
              {wishlist.length}
            </span>
          </button>

          {wholesaleUser && (
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'profile'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{isAr ? 'بيانات التاجر التجاري' : 'B2B Trade Profile'}</span>
            </button>
          )}
        </div>

        {/* TAB CONTENT: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {sampleOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {ord.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ord.status === 'delivered'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {isAr ? 'تاريخ الطلب:' : 'Order Date:'} {ord.created_at} • {ord.items_count} {isAr ? 'قطع' : 'items'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6">
                    <div className="text-right">
                      <div className="text-base font-black text-slate-900 dark:text-white">
                        {ord.total_amount.toLocaleString()} {currency}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase">
                        {ord.payment_method}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
                      onClick={() => onNavigateToTracking(ord.id)}
                    >
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isAr ? 'تتبع الشحنة' : 'Track Order'}</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-2">
              <Button
                variant="outline"
                className="text-xs rounded-xl"
                onClick={() => onNavigateToTracking()}
              >
                {isAr ? 'بحث عن طلب آخر برقم الهاتف' : 'Lookup Other Order'}
              </Button>
            </div>
          </div>
        )}

        {/* TAB CONTENT: WISHLIST */}
        {activeTab === 'wishlist' && (
          <div>
            {wishlistProducts.length === 0 ? (
              <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <Heart className="w-12 h-12 text-slate-400 mx-auto" />
                <h3 className="font-bold text-base">
                  {isAr ? 'قائمة أمنياتك فارغة' : 'Your Wishlist is Empty'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAr
                    ? 'احفظ الموديلات والأزياء المفضلة لديك بالضغط على أيقونة القلب في أي منتج.'
                    : 'Save products you love by clicking the heart icon on any product.'}
                </p>
                <Button
                  variant="primary"
                  className="text-xs rounded-xl mt-2"
                  onClick={() => setActiveView('shop')}
                >
                  {isAr ? 'استكشف المنتجات الآن' : 'Explore Catalog'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {wishlistProducts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col justify-between"
                  >
                    <div
                      onClick={() => navigateToProduct(item.id)}
                      className="aspect-[4/5] bg-slate-100 dark:bg-slate-800 overflow-hidden relative cursor-pointer"
                    >
                      <img
                        src={
                          (item.image_url || item.image)
                            ? api.getMediaUrl(item.image_url || item.image)
                            : 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
                        }
                        alt={item.name || item.model_name}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWishlist(item.id);
                        }}
                        className="absolute top-3 end-3 p-2 rounded-full bg-rose-500 text-white shadow-md"
                        title={isAr ? 'إزالة من المفضلة' : 'Remove'}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => navigateToProduct(item.id)}
                          className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1 hover:text-blue-600 cursor-pointer"
                        >
                          {isAr ? item.name_ar || item.name : item.name}
                        </h4>
                        <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-1">
                          {item.price.toLocaleString()} {currency}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="primary"
                          className="w-full text-xs py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5"
                          onClick={() => {
                            addToCart(item);
                            setIsCartOpen(true);
                          }}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{isAr ? 'نقل إلى السلة' : 'Move to Cart'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: B2B TRADE PROFILE */}
        {activeTab === 'profile' && wholesaleUser && (
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6 max-w-2xl">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'بيانات الاعتماد التجاري للشركة' : 'B2B Enterprise Credentials'}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">{isAr ? 'اسم المنشأة / الشركة:' : 'Company Name:'}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {wholesaleUser.company_name}
                </p>
              </div>

              <div>
                <span className="text-slate-400">{isAr ? 'المسؤول التجاري:' : 'Contact Representative:'}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {wholesaleUser.contact_person}
                </p>
              </div>

              <div>
                <span className="text-slate-400">{isAr ? 'حالة الاعتماد في المصنع:' : 'Approval Status:'}</span>
                <p className="font-bold text-emerald-600 mt-0.5">
                  {isAr ? 'حساب تاجر معتمد ومفعل' : 'Approved & Active Tier'}
                </p>
              </div>

              <div>
                <span className="text-slate-400">{isAr ? 'نوع التوريدات المتاحة:' : 'Eligible Channels:'}</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {isAr ? 'أسعار الجملة + كميات المصنع (MOQ)' : 'Tiered Pricing & MOQ'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

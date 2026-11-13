import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Heart,
  User,
  Globe,
  Sun,
  Moon,
  Menu,
  X,
  Building2,
  Truck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';

export const StorefrontHeader: React.FC = () => {
  const {
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    cartCount,
    setIsCartOpen,
    wishlist,
    wholesaleUser,
    isWholesaleApproved,
    setIsWholesaleModalOpen,
    logoutWholesale,
    isAr,
    isDark,
    onToggleTheme,
    onToggleLang,
    onNavigateToTracking,
    onNavigateToErp,
    storeSettings,
    tenantInfo,
  } = useStorefrontCommerce();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const themeConfig = storeSettings?.theme_config || {};
  const storeName = storeSettings?.store_name || tenantInfo?.name || 'GarmentOS Store';
  const announcementText =
    themeConfig.announcement_text ||
    (isAr
      ? '🚚 شحن مجاني لكافة محافظات الجمهورية للطلبات بقيمة 1,500 جنيه فأكثر!'
      : '🚚 Free nationwide delivery on all orders over 1,500 EGP!');

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* 1. TOP ANNOUNCEMENT & WHOLESALE BAR */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 truncate">
            <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {isAr ? 'عرض خاص' : 'SPECIAL'}
            </span>
            <span className="truncate">{announcementText}</span>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            {/* Wholesale Trade Account Status / Action */}
            {wholesaleUser ? (
              <div className="flex items-center gap-1.5 bg-blue-950 text-blue-200 border border-blue-800 px-2.5 py-0.5 rounded-full">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-semibold">{wholesaleUser.company_name}</span>
                {isWholesaleApproved && (
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                    {isAr ? 'تاجر معتمد' : 'Verified B2B'}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setIsWholesaleModalOpen(true)}
                className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition font-medium"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{isAr ? 'بوابة تجار الجملة (B2B)' : 'B2B Wholesale Portal'}</span>
              </button>
            )}

            {/* Quick ERP Access Link if open */}
            {onNavigateToErp && (
              <button
                onClick={onNavigateToErp}
                className="flex items-center gap-1 text-slate-300 hover:text-white transition"
                title={isAr ? 'العودة لنظام إدارة المصنع' : 'Back to Factory ERP'}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isAr ? 'لوحة الـ ERP' : 'ERP System'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN NAVIGATION BAR */}
      <div
        className={`px-4 sm:px-6 lg:px-8 transition-colors duration-200 border-b ${
          isDark
            ? 'bg-slate-900/95 text-slate-100 border-slate-800 backdrop-blur-md'
            : 'bg-white/95 text-slate-900 border-slate-200 backdrop-blur-md'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xl sm:text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400 flex items-center gap-2 hover:opacity-90 transition"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                G
              </div>
              <span>{storeName}</span>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => {
                setActiveView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition hover:text-blue-600 ${
                activeView === 'home' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isAr ? 'الرئيسية' : 'Home'}
            </button>
            <button
              onClick={() => {
                setActiveView('shop');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition hover:text-blue-600 ${
                activeView === 'shop' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isAr ? 'جميع المنتجات' : 'Shop All'}
            </button>
            <button
              onClick={() => {
                setActiveView('category');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`transition hover:text-blue-600 ${
                activeView === 'category' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isAr ? 'التصنيفات' : 'Categories'}
            </button>
            <button
              onClick={() => onNavigateToTracking()}
              className="text-slate-600 dark:text-slate-300 hover:text-blue-600 transition flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>{isAr ? 'تتبع طلبك' : 'Track Order'}</span>
            </button>
          </nav>

          {/* Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-xs relative">
            <Search className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== 'shop' && activeView !== 'home') {
                  setActiveView('shop');
                }
              }}
              placeholder={isAr ? 'بحث بالاسم، الكود، أو اللون...' : 'Search by title, SKU, color...'}
              className={`w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            />
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Language Toggle */}
            <button
              onClick={onToggleLang}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isAr ? 'Switch to English' : 'التحويل إلى العربية'}
              aria-label="Language switch"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
              aria-label="Theme toggle"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Wishlist Link */}
            <button
              onClick={() => setActiveView('account')}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title={isAr ? 'قائمة الأمنيات' : 'Wishlist'}
              aria-label="Wishlist"
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer / Wholesale Account Menu */}
            <div className="relative">
              <button
                onClick={() => {
                  if (wholesaleUser) {
                    setAccountMenuOpen(!accountMenuOpen);
                  } else {
                    setIsWholesaleModalOpen(true);
                  }
                }}
                className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                title={wholesaleUser ? wholesaleUser.company_name : isAr ? 'تسجيل الدخول' : 'Sign in'}
                aria-label="Account"
              >
                <User className="w-4 h-4" />
                {wholesaleUser && <ChevronDown className="w-3 h-3" />}
              </button>

              {/* Account Dropdown */}
              {accountMenuOpen && wholesaleUser && (
                <div
                  className={`absolute top-full mt-2 w-48 rounded-xl shadow-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 p-2 z-50 ${
                    isAr ? 'left-0' : 'right-0'
                  }`}
                >
                  <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-700 mb-1">
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                      {wholesaleUser.company_name}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{wholesaleUser.contact_person}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveView('account');
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    {isAr ? 'حسابي وطلباتي' : 'My Account & Orders'}
                  </button>
                  <button
                    onClick={() => {
                      logoutWholesale();
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-medium"
                  >
                    {isAr ? 'تسجيل الخروج' : 'Log Out'}
                  </button>
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-xs shadow-md transition"
              aria-label="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'السلة' : 'Cart'}</span>
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[11px]">
                {cartCount}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className={`w-4 h-4 text-slate-400 absolute top-2.5 ${isAr ? 'right-3' : 'left-3'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالاسم، الكود، أو اللون...' : 'Search catalog...'}
                className={`w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 ${
                  isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                }`}
              />
            </div>
            <nav className="flex flex-col gap-2 text-sm font-medium">
              <button
                onClick={() => {
                  setActiveView('home');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isAr ? 'الرئيسية' : 'Home'}
              </button>
              <button
                onClick={() => {
                  setActiveView('shop');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isAr ? 'جميع المنتجات' : 'Shop All Products'}
              </button>
              <button
                onClick={() => {
                  setActiveView('category');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {isAr ? 'التصنيفات' : 'Categories'}
              </button>
              <button
                onClick={() => {
                  onNavigateToTracking();
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 flex items-center gap-2"
              >
                <Truck className="w-4 h-4" />
                <span>{isAr ? 'تتبع طلبك' : 'Track Order'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('account');
                  setMobileMenuOpen(false);
                }}
                className="text-left py-1.5 px-2 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>{isAr ? 'حسابي وقائمة الأمنيات' : 'My Account & Wishlist'}</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

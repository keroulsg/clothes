
import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Baby,
  Crown,
} from 'lucide-react';
import { useStorefrontCommerce } from '../context/StorefrontCommerceContext';
import { api } from '../../../api/client';

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
    storeSettings,
    tenantInfo,
  } = useStorefrontCommerce();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const themeConfig = storeSettings?.theme_config || {};
  const storeName = storeSettings?.store_name || tenantInfo?.name || (isAr ? 'مصنع الملابس الجاهزة' : 'Apparel Factory');
  const primaryColor = themeConfig.primary_color || '#0284c7';
  const logoUrl = themeConfig.logo_url ? api.getMediaUrl(themeConfig.logo_url) : null;

  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  const themeId = storeSettings?.theme_id || 'fashion_boutique';
  const normalizedTheme =
    themeId === 'wholesale_uniform' || themeId === 'modern_catalog'
      ? 'modern_catalog'
      : themeId === 'kids_baby' || themeId === 'kids_family'
      ? 'kids_family'
      : themeId === 'premium_brand'
      ? 'premium_brand'
      : 'fashion_boutique';

  const announcementEnabled = themeConfig.announcement_bar_enabled !== false;
  const announcementText =
    themeConfig.announcement_bar_text ||
    themeConfig.announcement_text ||
    (normalizedTheme === 'kids_family'
      ? isAr
        ? '🍼 قطن مصري 100% طبيعي آمن على بشرة طفلك — شحن مجاني للطلبات فوق 1,500 ج.م 🧸'
        : '🍼 100% Egyptian Cotton Gentle on Baby Skin — Free Delivery over 1,500 EGP 🧸'
      : normalizedTheme === 'premium_brand'
      ? isAr
        ? '⚜️ تصاميم حصرية من خط الإنتاج بأقمشة راقية وأعلى معايير الحرفية المصرية ⚜️'
        : '⚜️ Exclusive Atelier Editions — Master Craftsmanship in Limited Production ⚜️'
      : normalizedTheme === 'modern_catalog'
      ? isAr
        ? '📦 توريدات الجملة والزي الموحد مباشرة من المصنع بأسعار التكلفة وخصومات الكميات 🏭'
        : '📦 Direct Factory Wholesale & Uniform Supplies with Tiered Bulk Discounts 🏭'
      : isAr
      ? '🚚 شحن سريع لكافة المحافظات لباب المنزل — ضمان استبدال واسترجاع خلال 14 يوماً!'
      : '🚚 Fast nationwide doorstep delivery — 14-day hassle-free exchange & returns!');

  // Custom navigation links from themeConfig or defaults
  const customHeaderLinks = themeConfig.navigation?.header_links || null;

  return (
    <header className="sticky top-0 z-40 w-full shadow-xs select-none">
      {/* 1. TOP ANNOUNCEMENT & WHOLESALE BAR */}
      {announcementEnabled && (
        <div
          className={`text-xs py-1.5 px-4 border-b transition-colors ${
            normalizedTheme === 'premium_brand'
              ? 'bg-stone-950 text-amber-300 border-amber-950/60 font-serif'
              : normalizedTheme === 'kids_family'
              ? 'bg-amber-500 text-white border-amber-600 font-bold'
              : 'bg-slate-900 text-slate-200 border-slate-800'
          }`}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <span
                style={{ backgroundColor: normalizedTheme === 'kids_family' ? '#ea580c' : primaryColor }}
                className="text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0"
              >
                {normalizedTheme === 'kids_family'
                  ? isAr ? 'مواليد وأطفال' : 'KIDS'
                  : normalizedTheme === 'premium_brand'
                  ? isAr ? 'إصدار راقٍ' : 'ATELIER'
                  : isAr ? 'عرض المصنع' : 'FACTORY'}
              </span>
              <span className="truncate">{announcementText}</span>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0">
              {/* Wholesale Trade Account Action */}
              {wholesaleUser ? (
                <div className="flex items-center gap-1.5 bg-blue-950/80 text-blue-200 border border-blue-800 px-2.5 py-0.5 rounded-full">
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
                  className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 transition font-bold"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'بوابة تجار الجملة (B2B)' : 'B2B Wholesale Portal'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN NAVIGATION BAR */}
      <div
        style={{ backgroundColor: themeConfig.layout?.header_bg_color || undefined }}
        className={`px-4 sm:px-6 lg:px-8 transition-colors duration-200 border-b backdrop-blur-md ${
          !themeConfig.layout?.header_bg_color
            ? isDark
              ? normalizedTheme === 'premium_brand'
                ? 'bg-zinc-950/95 text-zinc-100 border-zinc-800'
                : 'bg-slate-900/95 text-slate-100 border-slate-800'
              : normalizedTheme === 'premium_brand'
              ? 'bg-stone-50/95 text-stone-900 border-stone-200'
              : normalizedTheme === 'kids_family'
              ? 'bg-white/95 text-slate-900 border-amber-100'
              : 'bg-white/95 text-slate-900 border-slate-200'
            : ''
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* Logo / Brand Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2.5 text-start hover:opacity-90 transition group"
            >
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={storeName}
                  onError={() => setLogoError(true)}
                  className={`h-10 w-auto max-w-[140px] object-contain ${
                    normalizedTheme === 'kids_family' ? 'rounded-2xl' : 'rounded-lg'
                  }`}
                />
              ) : (
                <div
                  style={{ backgroundColor: primaryColor }}
                  className={`w-10 h-10 flex items-center justify-center text-white font-black text-lg shadow-sm transition-transform group-hover:scale-105 ${
                    normalizedTheme === 'kids_family'
                      ? 'rounded-full -rotate-3'
                      : normalizedTheme === 'premium_brand'
                      ? 'rounded-none border border-amber-500 font-serif'
                      : 'rounded-xl'
                  }`}
                >
                  {normalizedTheme === 'kids_family' ? (
                    <Baby className="w-5 h-5" />
                  ) : normalizedTheme === 'premium_brand' ? (
                    <Crown className="w-5 h-5 text-amber-300" />
                  ) : normalizedTheme === 'modern_catalog' ? (
                    <Building2 className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
              )}
              <div>
                <span
                  className={`block text-lg sm:text-xl font-black tracking-tight leading-none ${
                    normalizedTheme === 'premium_brand' ? 'font-serif tracking-wider uppercase' : ''
                  }`}
                >
                  {storeName}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">
                  {normalizedTheme === 'kids_family'
                    ? isAr ? 'ملابس أطفال ومواليد قطنية' : 'Kids & Baby Cotton Wear'
                    : normalizedTheme === 'premium_brand'
                    ? isAr ? 'دار الأزياء والأناقة الراقية' : 'Haute Couture Atelier'
                    : normalizedTheme === 'modern_catalog'
                    ? isAr ? 'كتالوج المصنع والتوريدات' : 'Direct Factory Catalog'
                    : isAr ? 'المتجر الرسمي للمصنع مباشرة' : 'Direct Factory Store'}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-semibold">
            {customHeaderLinks && Array.isArray(customHeaderLinks) && customHeaderLinks.length > 0 ? (
              customHeaderLinks.map((link: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (link.view) setActiveView(link.view);
                    else if (link.url) window.location.hash = link.url;
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === link.view
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? link.label_ar || link.label : link.label_en || link.label}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => {
                    setActiveView('home');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'home'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'الرئيسية' : 'Home'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('shop');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'shop'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'جميع الموديلات' : 'Shop All'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('category');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'category'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'الأقسام' : 'Categories'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('about');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'about'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'عن المصنع' : 'About Us'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('contact');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'contact'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'تواصل معنا' : 'Contact'}
                </button>
                <button
                  onClick={() => {
                    setActiveView('policies');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`transition py-1 border-b-2 ${
                    activeView === 'policies'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-blue-600'
                  }`}
                >
                  {isAr ? 'سياسات المتجر' : 'Policies'}
                </button>
              </>
            )}
          </nav>

          {/* Quick Search Input */}
          <div className="hidden md:flex items-center flex-1 max-w-xs relative">
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
              placeholder={isAr ? 'بحث بالموديل أو الكود أو اللون...' : 'Search designs, SKU, color...'}
              className={`w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isAr ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
              }`}
            />
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Track Order Direct Button */}
            <button
              onClick={() => {
                setActiveView('tracking');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border hidden sm:flex items-center gap-1.5 transition ${
                isDark
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'تتبع طلبك' : 'Track Order'}</span>
            </button>

            {/* Language Switch */}
            <button
              onClick={onToggleLang}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isAr ? 'English' : 'عربي'}
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isDark ? 'Light' : 'Dark'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Wishlist Link */}
            <button
              onClick={() => setActiveView('account')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
              title={isAr ? 'المفضلة' : 'Wishlist'}
            >
              <Heart className="w-4 h-4" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Customer Account / Sign In */}
            <div className="relative">
              <button
                onClick={() => {
                  if (wholesaleUser) {
                    setAccountMenuOpen(!accountMenuOpen);
                  } else {
                    setIsWholesaleModalOpen(true);
                  }
                }}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                title={wholesaleUser ? wholesaleUser.company_name : isAr ? 'حساب التاجر' : 'Account'}
              >
                <User className="w-4 h-4" />
                {wholesaleUser && <ChevronDown className="w-3 h-3" />}
              </button>

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
                    className="w-full text-start px-2 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    {isAr ? 'حسابي وطلباتي' : 'My Account & Orders'}
                  </button>
                  <button
                    onClick={() => {
                      logoutWholesale();
                      setAccountMenuOpen(false);
                    }}
                    className="w-full text-start px-2 py-1.5 text-xs text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition font-medium"
                  >
                    {isAr ? 'تسجيل الخروج' : 'Log Out'}
                  </button>
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              style={{ backgroundColor: primaryColor }}
              className={`flex items-center gap-2 text-white px-3 sm:px-4 py-2 font-bold text-xs shadow-md transition transform active:scale-95 ${
                normalizedTheme === 'kids_family'
                  ? 'rounded-full'
                  : normalizedTheme === 'premium_brand'
                  ? 'rounded-none uppercase tracking-widest'
                  : 'rounded-xl'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? 'السلة' : 'Cart'}</span>
              <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[11px] font-black">
                {cartCount}
              </span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 lg:hidden rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
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
            <nav className="flex flex-col gap-1 text-xs sm:text-sm font-semibold">
              <button
                onClick={() => {
                  setActiveView('home');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'home' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'الرئيسية' : 'Home'}
              </button>
              <button
                onClick={() => {
                  setActiveView('shop');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'shop' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'جميع الموديلات' : 'Shop All Products'}
              </button>
              <button
                onClick={() => {
                  setActiveView('category');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'category' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'الأقسام والتصنيفات' : 'Categories'}
              </button>
              <button
                onClick={() => {
                  setActiveView('about');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'about' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'عن المصنع والمتجر' : 'About Factory Store'}
              </button>
              <button
                onClick={() => {
                  setActiveView('contact');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'contact' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'تواصل معنا' : 'Contact Us'}
              </button>
              <button
                onClick={() => {
                  setActiveView('policies');
                  setMobileMenuOpen(false);
                }}
                className={`text-start py-2 px-3 rounded-lg ${
                  activeView === 'policies' ? 'bg-blue-50 text-blue-600 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isAr ? 'سياسات وشروط المتجر' : 'Store Policies'}
              </button>
              <button
                onClick={() => {
                  setActiveView('tracking');
                  setMobileMenuOpen(false);
                }}
                className="text-start py-2 px-3 rounded-lg text-emerald-600 dark:text-emerald-400 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Truck className="w-4 h-4" />
                <span>{isAr ? 'تتبع حالة الشحنة' : 'Track Order Status'}</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('account');
                  setMobileMenuOpen(false);
                }}
                className="text-start py-2 px-3 rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
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

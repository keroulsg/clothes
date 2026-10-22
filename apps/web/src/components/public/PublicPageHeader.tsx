import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Menu,
  X,
  Globe,
  Sun,
  Moon,
  LogIn,
  Sparkles,
  ChevronDown,
  Layers,
  Boxes,
  Receipt,
  Users,
  Store,
} from 'lucide-react';
import type { Language } from '../../types';

export interface PublicPageHeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: (tier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const PublicPageHeader: React.FC<PublicPageHeaderProps> = ({
  lang,
  onToggleLang,
  isDark = false,
  onToggleTheme,
  currentPage,
  onNavigate,
  onOpenLogin,
  onOpenRegister,
}) => {
  const isAr = lang === 'ar';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [modulesDropdownOpen, setModulesDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setModulesDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setModulesDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const modulesList = [
    {
      id: 'manufacturing',
      title: isAr ? 'هندسة صالة القص والفرش' : 'Cutting Floor & Markers',
      desc: isAr ? 'كفاءة التعشيق، الراقات، ونسب الهالك' : 'Marker efficiency % and plies',
      icon: <Scissors className="w-4 h-4 text-[#7F1625] dark:text-[#f87171]" />,
    },
    {
      id: 'inventory',
      title: isAr ? 'المخازن والأقمشة والـ GSM' : 'Fabric Inventory & GSM',
      desc: isAr ? 'تتبع أثواب الأقمشة والأمتار المتبقية' : 'Roll meters and shrinkage calculation',
      icon: <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
    },
    {
      id: 'subcontracting',
      title: isAr ? 'التشغيل للغير والـ CMT' : 'Subcontracting & CMT',
      desc: isAr ? 'عزل أمانات العملاء وتتبع المطابع' : 'Customer custody & external ops',
      icon: <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    },
    {
      id: 'costing',
      title: isAr ? 'التكاليف والمالية المزدوجة' : 'Costing & Accounting',
      desc: isAr ? 'شجرة الحسابات وتكلفة القطعة الحقيقية' : 'COA and actual piece costing',
      icon: <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      id: 'workforce',
      title: isAr ? 'أجور القطعة وحزم الإنتاج' : 'Piece-Rate & Workforce',
      desc: isAr ? 'باركود الحزم ومستحقات العمال المعتمدة' : 'Bundle tracking & worker payroll',
      icon: <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />,
    },
    {
      id: 'storefront',
      title: isAr ? 'المتجر الإلكتروني B2B' : 'B2B Wholesale Storefront',
      desc: isAr ? 'كتالوج الموديلات والطلب المباشر' : 'Customer wholesale ordering portal',
      icon: <Store className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 text-start cursor-pointer group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] via-[#8c1929] to-[#941b2d] text-white shadow-xs border border-[#7F1625]/30 group-hover:scale-105 transition-transform shrink-0">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white font-sans">
                  GarmentOS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#7F1625]/25 bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] dark:border-[#9E2A3B]/40 dark:bg-[#9E2A3B]/20">
                  Cloud ERP
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
                {isAr ? 'المنظومة السحابية المتخصصة لمصانع وورش الملابس' : 'Specialized Apparel & Garment Cloud ERP'}
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'home'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الرئيسية' : 'Home'}
          </button>

          {/* Solutions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setModulesDropdownOpen(!modulesDropdownOpen)}
              className="px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span>{isAr ? 'الوحدات والحلول' : 'Solutions & Modules'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {modulesDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setModulesDropdownOpen(false)}
                />
                <div className="absolute top-full mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                    {isAr ? 'وحدات المنظومة الصناعية' : 'Industrial Modules'}
                  </div>
                  {modulesList.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleNavClick(m.id)}
                      className="w-full text-start p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                        {m.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.title}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {m.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => handleNavClick('features')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'features'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الميزات الشاملة' : 'All Features'}
          </button>

          <button
            onClick={() => handleNavClick('pricing')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'pricing'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الأسعار والباقات' : 'Pricing'}
          </button>

          <button
            onClick={() => handleNavClick('about')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'about'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'عن المنظومة' : 'About'}
          </button>

          <button
            onClick={() => handleNavClick('faq')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'faq'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
          </button>

          <button
            onClick={() => handleNavClick('contact')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              currentPage === 'contact'
                ? 'text-[#7F1625] dark:text-[#f87171] bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 font-black'
                : 'hover:text-[#7F1625] dark:hover:text-[#f87171] hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'تواصل معنا' : 'Contact'}
          </button>
        </nav>

        {/* Action Controls & Mobile Menu Toggle */}
        <div className="flex items-center gap-2">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center justify-center cursor-pointer"
              title={isDark ? (isAr ? 'تفعيل الوضع المضيء' : 'Light Mode') : (isAr ? 'تفعيل الوضع الداكن' : 'Dark Mode')}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}

          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1 font-bold cursor-pointer"
            title={isAr ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          <button
            onClick={onOpenLogin}
            className="text-xs font-bold px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            <span className="hidden sm:inline">{isAr ? 'دخول المصنع' : 'Sign In'}</span>
          </button>

          <button
            onClick={() => onOpenRegister('professional')}
            className="btn-brand-primary text-xs font-bold px-3.5 py-2 rounded-xl text-white flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'ابدأ مجاناً 14 يوماً' : 'Start Trial'}</span>
            <span className="sm:hidden">{isAr ? 'تجربة' : 'Trial'}</span>
          </button>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-e border-slate-200 dark:border-slate-800 h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7F1625] text-white">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-black text-base text-slate-900 dark:text-white font-sans">
                    GarmentOS Cloud
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Main Nav */}
              <div className="space-y-1">
                <button
                  onClick={() => handleNavClick('home')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'home'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'الرئيسية' : 'Home'}
                </button>
                <button
                  onClick={() => handleNavClick('features')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'features'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'الميزات الشاملة' : 'All Features'}
                </button>
                <button
                  onClick={() => handleNavClick('pricing')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'pricing'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'الأسعار والباقات' : 'Pricing'}
                </button>
                <button
                  onClick={() => handleNavClick('about')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'about'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'عن المنظومة' : 'About'}
                </button>
                <button
                  onClick={() => handleNavClick('faq')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'faq'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
                </button>
                <button
                  onClick={() => handleNavClick('contact')}
                  className={`w-full text-start px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentPage === 'contact'
                      ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] border-s-4 border-[#7F1625]'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'تواصل معنا' : 'Contact'}
                </button>
              </div>

              {/* Mobile Industrial Modules */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 px-3 uppercase mb-1">
                  {isAr ? 'الوحدات الصناعية المتخصصة' : 'Industrial Modules'}
                </div>
                {modulesList.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleNavClick(m.id)}
                    className={`w-full text-start px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
                      currentPage === m.id
                        ? 'bg-[#7F1625]/10 text-[#7F1625] dark:text-[#f87171] font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Footer CTAs */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
                className="w-full py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <LogIn className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>{isAr ? 'تسجيل دخول المصنع' : 'Sign In'}</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenRegister('professional');
                }}
                className="btn-brand-primary w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'ابدأ مجاناً 14 يوماً' : 'Start Trial'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Scissors,
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Users,
  Store,
  Settings,
  Building2,
  Globe,
  Search,
  LogOut,
  LogIn,
  Layers,
  Shield,
  Menu,
  X,
  Wrench,
  Shirt,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { Language, Direction } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
  onToggleLang: () => void;
  isDark?: boolean;
  onToggleTheme?: () => void;
  tenantName: string;
  tenantCode: string;
  branchName: string;
  onOpenNewCompanyModal: () => void;
  userName?: string;
  userRole?: string;
  isAuthenticated?: boolean;
  onLogout?: () => void;
  onOpenLoginModal?: () => void;
  onSwitchToPublic?: () => void;
  onSwitchToAdmin?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  lang,
  onToggleLang,
  isDark = false,
  onToggleTheme,
  tenantName,
  tenantCode,
  branchName,
  onOpenNewCompanyModal,
  userName = 'مالك المصنع',
  userRole = 'company_owner',
  isAuthenticated = true,
  onLogout,
  onOpenLoginModal,
  onSwitchToPublic,
  onSwitchToAdmin,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('garmentos_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('garmentos_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
  const isAr = lang === 'ar';

  const navGroups: NavGroup[] = [
    {
      groupTitle: isAr ? 'الإنتاج والعمليات' : 'Production & Floor',
      items: [
        {
          id: 'dashboard',
          label: isAr ? 'لوحة القيادة والمصنع' : 'Factory Command',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'models',
          label: isAr ? 'الموديلات وشجرة الـ BOM' : 'Models & BOMs',
          icon: <Shirt className="w-4 h-4" />,
        },
        {
          id: 'cutting',
          label: isAr ? 'صالة القص والتشغيل' : 'Cutting & Bundles',
          icon: <Scissors className="w-4 h-4" />,
          badge: isAr ? 'نشط' : 'Live',
        },
        {
          id: 'subcontracting',
          label: isAr ? 'التشغيل للغير والـ CMT' : 'Subcontracting CMT',
          icon: <Boxes className="w-4 h-4" />,
        },
        {
          id: 'maintenance',
          label: isAr ? 'صيانة الماكينات والأصول' : 'Machine Assets',
          icon: <Wrench className="w-4 h-4" />,
        },
      ],
    },
    {
      groupTitle: isAr ? 'المخازن والتوريد' : 'Supply & Inventory',
      items: [
        {
          id: 'inventory',
          label: isAr ? 'المخازن والأقمشة' : 'Fabric Inventory',
          icon: <Layers className="w-4 h-4" />,
        },
        {
          id: 'purchasing',
          label: isAr ? 'المشتريات والموردين' : 'Procurement & POs',
          icon: <ShoppingCart className="w-4 h-4" />,
        },
      ],
    },
    {
      groupTitle: isAr ? 'المالية والمبيعات' : 'Sales & Finance',
      items: [
        {
          id: 'sales',
          label: isAr ? 'المبيعات ونقطة البيع' : 'Sales & POS',
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          id: 'costing',
          label: isAr ? 'التكاليف والمالية' : 'Costing & Accounts',
          icon: <Receipt className="w-4 h-4" />,
        },
        {
          id: 'piece_rate',
          label: isAr ? 'أجور القطعة والعمال' : 'Piece-Rate & HR',
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: 'storefront',
          label: isAr ? 'المتجر الإلكتروني' : 'B2B Storefront',
          icon: <Store className="w-4 h-4" />,
        },
      ],
    },
    {
      groupTitle: isAr ? 'إدارة النظام' : 'Administration',
      items: [
        {
          id: 'settings',
          label: isAr ? 'إعدادات الشركة والمستخدمين' : 'Tenant Settings',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
    },
  ];

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div
      dir={dir}
      className="h-screen max-h-screen w-full max-w-full overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)] flex flex-col antialiased selection:bg-[#7F1625] selection:text-white transition-colors duration-200"
    >
      {/* Top Navbar: Clean Industrial Enterprise Bar */}
      <header className="h-16 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-header)]/95 backdrop-blur-md z-40 px-3 sm:px-6 flex items-center justify-between shadow-2xs max-w-full overflow-hidden">
        {/* Left: Brand Identity + Mobile Menu + Tenant Context */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] via-[#8c1929] to-[#941b2d] text-white shadow-xs border border-[#7F1625]/30 shrink-0">
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white font-sans">
                  GarmentOS
                </span>
                <span className="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-[#7F1625]/25 bg-[#7F1625]/10 text-[#7F1625] dark:text-[#F87171] dark:border-[#9E2A3B]/40 dark:bg-[#9E2A3B]/20 hidden sm:inline-block">
                  Cloud ERP
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium hidden sm:flex">
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{tenantName}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">{tenantCode}</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {branchName}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Search Field */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-6">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
          <input
            type="text"
            placeholder={isAr ? 'بحث سريع عن أمر، موديل، قماش (Ctrl+K)...' : 'Quick search order, model, fabric (Ctrl+K)...'}
            className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#7F1625] dark:focus:border-[#9E2A3B] transition-all"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Super Admin Quick Link */}
          {userRole === 'platform_admin' && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[#7F1625]/30 text-[#7F1625] dark:text-[#F87171] hover:bg-[#7F1625]/10 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center justify-center cursor-pointer"
              title={isDark ? (isAr ? 'تفعيل الوضع المضيء' : 'Switch to Light Mode') : (isAr ? 'تفعيل الوضع الداكن' : 'Switch to Dark Mode')}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1.5 font-bold cursor-pointer"
            title={isAr ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px] font-mono">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Profile & Auth Controls with Dropdown */}
          {isAuthenticated ? (
            <div className="relative pr-2 rtl:pr-0 rtl:pl-2 border-s border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer text-right rtl:text-right ltr:text-left focus:outline-none"
                aria-expanded={userMenuOpen}
              >
                <div className="hidden lg:block">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">{userName}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans block">
                    {userRole === 'company_owner'
                      ? (isAr ? 'مالك المصنع' : 'Factory Owner')
                      : userRole === 'accountant'
                      ? (isAr ? 'محاسب مالي' : 'Accountant')
                      : userRole === 'production_manager'
                      ? (isAr ? 'مدير إنتاج' : 'Production Manager')
                      : userRole === 'worker'
                      ? (isAr ? 'عامل تشغيل' : 'Operator')
                      : userRole}
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-[#941b2d] text-white text-xs font-black shadow-xs ring-1 ring-white/10 shrink-0">
                  {userName.charAt(0) || 'م'}
                </div>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute left-0 rtl:left-0 rtl:right-auto ltr:right-0 ltr:left-auto mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{userName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{tenantName} ({branchName})</div>
                    </div>

                    <div className="py-1">
                      {onSwitchToPublic && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onSwitchToPublic();
                          }}
                          className="w-full text-start px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer"
                        >
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isAr ? 'الموقع التسويقي العام' : 'Public Marketing Site'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenNewCompanyModal();
                        }}
                        className="w-full text-start px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-center gap-2 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{isAr ? 'تسجيل مصنع جديد' : 'Register New Factory'}</span>
                      </button>
                    </div>

                    {onLogout && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onLogout();
                          }}
                          className="w-full text-start px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            onOpenLoginModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenLoginModal}
                className="btn-brand-primary text-xs font-bold rounded-xl px-2.5 sm:px-3.5"
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                <span className="hidden sm:inline">{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </Button>
            )
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[var(--bg-sidebar)] text-[var(--text-primary)] border-e border-[var(--border-subtle)] h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#7F1625] text-white">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-black text-base text-slate-900 dark:text-white font-sans">GarmentOS ERP</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation groups */}
              <nav className="space-y-4">
                {navGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 uppercase mb-1.5 font-sans">
                      {group.groupTitle}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                              item.disabled
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : isActive
                                ? 'bg-[#7F1625]/10 dark:bg-[#9E2A3B]/20 text-[#7F1625] dark:text-[#F87171] font-bold border-s-4 border-[#7F1625] dark:border-[#9E2A3B]'
                                : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={isActive ? 'text-[#7F1625] dark:text-[#F87171]' : 'text-slate-500'}>
                                {item.icon}
                              </span>
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onSwitchToPublic) onSwitchToPublic();
                }}
                className="w-full text-center py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white cursor-pointer"
              >
                {isAr ? 'العودة للموقع التسويقي' : 'Back to Marketing Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex min-w-0 w-full max-w-full overflow-hidden">
        {/* Desktop Sidebar: Clean Modern Enterprise Navigation */}
        <aside
          className={`border-e border-[var(--border-subtle)] bg-[var(--bg-sidebar)] p-3 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto shadow-2xs transition-all duration-200 ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
        >
          <div className="space-y-4">
            {/* Collapse toggle */}
            <div className="flex items-center justify-end px-2">
              <button
                onClick={handleToggleSidebar}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={sidebarCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
              >
                {sidebarCollapsed ? (
                  isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                ) : (
                  isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            <nav className="space-y-4">
              {navGroups.map((group, gi) => (
                <div key={gi}>
                  {!sidebarCollapsed && (
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 uppercase mb-1.5 font-sans tracking-normal">
                      {group.groupTitle}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          disabled={item.disabled}
                          onClick={() => !item.disabled && onTabChange(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                            sidebarCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
                          } ${
                            item.disabled
                              ? 'opacity-40 cursor-not-allowed text-slate-400'
                              : isActive
                              ? 'bg-[#7F1625]/8 dark:bg-[#9E2A3B]/20 text-[#7F1625] dark:text-[#F87171] font-bold border-s-[3px] border-[#7F1625] dark:border-[#9E2A3B] shadow-2xs'
                              : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <div className={`flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                            <span className={isActive ? 'text-[#7F1625] dark:text-[#F87171]' : 'text-slate-500 dark:text-slate-400'}>
                              {item.icon}
                            </span>
                            {!sidebarCollapsed && <span>{item.label}</span>}
                          </div>
                          {!sidebarCollapsed && item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-sans">
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer info */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-sans">
            {!sidebarCollapsed ? (
              <div className="w-full flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  <span>GarmentOS Cloud</span>
                  <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>Online</span>
                  </span>
                </div>
                {onSwitchToPublic && (
                  <button
                    type="button"
                    onClick={onSwitchToPublic}
                    className="w-full text-start text-[11px] font-medium text-slate-500 hover:text-[#7F1625] dark:text-slate-400 dark:hover:text-[#F87171] transition-colors cursor-pointer py-0.5"
                  >
                    {isAr ? '← زيارة الموقع التعريفي' : 'Visit Marketing Site →'}
                  </button>
                )}
              </div>
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 mx-auto" />
            )}
          </div>
        </aside>

        {/* Content Area with Independent Scroll and Flexbox Overflow Protection */}
        <main className="flex-1 h-full min-w-0 max-w-full w-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 bg-[var(--bg-app)]">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">{children}</div>
        </main>
      </div>
    </div>
  );
};

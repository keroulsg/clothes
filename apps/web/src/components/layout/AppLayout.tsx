import React, { useState } from 'react';
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
  Bell,
  Search,
  LogOut,
  LogIn,
  Layers,
  Shield,
  Menu,
  X,
  Wrench,
  Shirt,
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
  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
  const isAr = lang === 'ar';

  const navGroups: NavGroup[] = [
    {
      groupTitle: isAr ? 'عمليات الإنتاج والقص' : 'Production & Cutting',
      items: [
        {
          id: 'dashboard',
          label: isAr ? 'لوحة القيادة والمصنع' : 'Factory Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
        {
          id: 'models',
          label: isAr ? 'الموديلات وشجرة الـ BOM' : 'Models & BOM Catalog',
          icon: <Shirt className="w-4 h-4" />,
        },
        {
          id: 'cutting',
          label: isAr ? 'صالة القص والإنتاج' : 'Cutting Floor & Lays',
          icon: <Scissors className="w-4 h-4" />,
          badge: isAr ? 'حي' : 'Live',
        },
        {
          id: 'subcontracting',
          label: isAr ? 'التشغيل للغير والـ CMT' : 'Subcontracting & CMT',
          icon: <Boxes className="w-4 h-4" />,
          badge: 'Phase 6',
        },
        {
          id: 'maintenance',
          label: isAr ? 'صيانة الماكينات والأصول' : 'Machine Maintenance',
          icon: <Wrench className="w-4 h-4" />,
          badge: 'Phase 12',
        },
      ],
    },
    {
      groupTitle: isAr ? 'المخازن وسلاسل الإمداد' : 'Inventory & Supply',
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
      groupTitle: isAr ? 'المالية والمبيعات والموارد' : 'Commercial, Finance & HR',
      items: [
        {
          id: 'sales',
          label: isAr ? 'المبيعات ونقطة البيع' : 'Sales & POS',
          icon: <TrendingUp className="w-4 h-4" />,
          badge: 'Phase 7',
        },
        {
          id: 'costing',
          label: isAr ? 'التكاليف والمالية' : 'Costing & Accounts',
          icon: <Receipt className="w-4 h-4" />,
          badge: 'Phase 8',
        },
        {
          id: 'piece_rate',
          label: isAr ? 'أجور القطعة والعمال' : 'Piece-Rate & HR',
          icon: <Users className="w-4 h-4" />,
          badge: 'Phase 9',
        },
        {
          id: 'storefront',
          label: isAr ? 'المتجر الإلكتروني' : 'B2B Storefront',
          icon: <Store className="w-4 h-4" />,
          badge: 'Phase 10',
        },
      ],
    },
    {
      groupTitle: isAr ? 'تهيئة المصنع' : 'Factory Configuration',
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
      className="min-h-screen bg-[#f4f5f8] text-zinc-900 flex flex-col antialiased selection:bg-[#7F1625] selection:text-white"
    >
      {/* Top Navbar: Reference Style (Auto Parts ERP) */}
      <header className="h-16 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs">
        {/* Mobile menu toggle & Brand context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-black text-white shadow-md shadow-[#7F1625]/20 ring-1 ring-white/10 shrink-0">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight text-zinc-950 font-sans">GarmentOS</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#7F1625]/25 bg-[#7F1625]/10 text-[#7F1625]">
                  ERP Cloud
                </span>
              </div>
              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium hidden sm:flex">
                <span className="text-zinc-800 font-semibold">{tenantName}</span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500 font-mono text-[10px]">{tenantCode}</span>
                <span className="text-zinc-300">•</span>
                <span className="text-emerald-700 text-[10px] font-bold">{branchName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search Bar (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-6">
          <Search className="w-4 h-4 text-zinc-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
          <input
            type="text"
            placeholder={isAr ? 'بحث عن أمر إنتاج، موديل، قماش، عميل...' : 'Search orders, models, fabric...'}
            className="w-full bg-zinc-100 border border-zinc-200/90 rounded-xl text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[#7F1625] focus:ring-1 focus:ring-[#7F1625] transition-all shadow-2xs"
          />
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          {onSwitchToPublic && (
            <button
              onClick={onSwitchToPublic}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors hidden sm:block border border-transparent hover:border-zinc-200"
            >
              {isAr ? 'الموقع التسويقي' : 'Marketing Site'}
            </button>
          )}

          {userRole === 'platform_admin' && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-[#7F1625]/30 text-[#7F1625] hover:bg-[#7F1625]/10 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenNewCompanyModal}
            className="text-xs border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-semibold hidden md:inline-flex rounded-xl"
            icon={<Building2 className="w-3.5 h-3.5 text-zinc-500" />}
          >
            {isAr ? 'تسجيل مصنع' : 'New Factory'}
          </Button>

          {/* Lang switcher */}
          <button
            onClick={onToggleLang}
            className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors text-xs flex items-center gap-1 font-bold"
            title={isAr ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-4 h-4 text-zinc-500" />
            <span className="text-[11px]">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition-colors hidden sm:block">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#7F1625]" />
          </button>

          {/* User Profile & Auth Controls */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5 pr-2 rtl:pr-0 rtl:pl-2 border-s border-zinc-200">
              <div className="text-right rtl:text-right ltr:text-left hidden lg:block">
                <span className="text-xs font-bold text-zinc-900 block">{userName}</span>
                <span className="text-[10px] text-zinc-500 font-mono block">
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-black text-white text-xs font-black shadow-sm ring-1 ring-white/10">
                {userName.charAt(0) || 'م'}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title={isAr ? 'تسجيل الخروج' : 'Logout'}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            onOpenLoginModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenLoginModal}
                className="btn-brand-primary text-xs font-bold rounded-xl"
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
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
          <div className="relative w-72 max-w-[85vw] bg-white text-zinc-900 border-e border-zinc-200 h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] to-black text-white">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-black text-base text-zinc-950 font-sans">GarmentOS ERP</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation groups */}
              <nav className="space-y-4">
                {navGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="text-[10px] font-bold text-zinc-400 px-3 uppercase tracking-wider mb-1.5 font-mono">
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
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                              item.disabled
                                ? 'opacity-40 cursor-not-allowed text-zinc-400'
                                : isActive
                                ? 'bg-gradient-to-r from-[#7F1625]/15 to-transparent text-[#7F1625] font-bold border-s-4 border-[#7F1625]'
                                : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={isActive ? 'text-[#7F1625]' : 'text-zinc-500'}>{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isActive ? 'bg-[#7F1625]/20 text-[#7F1625]' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                              }`}>
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

            <div className="pt-4 border-t border-zinc-200 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onSwitchToPublic) onSwitchToPublic();
                }}
                className="w-full text-center py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
              >
                {isAr ? 'العودة للموقع التسويقي' : 'Back to Marketing Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar: Clean White with #7F1625 Accent */}
        <aside className="w-64 border-e border-zinc-200/90 bg-white p-3.5 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto shadow-2xs">
          <nav className="space-y-4">
            {navGroups.map((group, gi) => (
              <div key={gi}>
                <div className="text-[10px] font-bold text-zinc-400 px-3 uppercase tracking-wider mb-1.5 font-mono">
                  {group.groupTitle}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        disabled={item.disabled}
                        onClick={() => !item.disabled && onTabChange(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          item.disabled
                            ? 'opacity-40 cursor-not-allowed text-zinc-400'
                            : isActive
                            ? 'bg-gradient-to-r from-[#7F1625]/10 to-transparent text-[#7F1625] font-bold border-s-4 border-[#7F1625] shadow-xs'
                            : 'text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100/80'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={isActive ? 'text-[#7F1625]' : 'text-zinc-500'}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              isActive
                                ? 'bg-[#7F1625]/20 text-[#7F1625]'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                            }`}
                          >
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

          {/* Sidebar Footer info */}
          <div className="pt-3 border-t border-zinc-200 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
            <span>GarmentOS v2.4</span>
            <span className="flex items-center gap-1.5 text-zinc-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Online</span>
            </span>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

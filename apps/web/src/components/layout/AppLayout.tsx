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
  CheckCircle2,
  LogOut,
  LogIn,
  Layers,
  Shield,
  Sun,
  Moon,
  Menu,
  X,
  Wrench,
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
  isDark = true,
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
      className="min-h-screen bg-slate-100 dark:bg-[#080b12] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-[#4a101d] selection:text-white transition-colors duration-200"
    >
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-4 lg:px-6 flex items-center justify-between">
        {/* Mobile menu toggle & Brand context */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              <Scissors className="w-4 h-4 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">GarmentOS</span>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border"
                  style={{
                    backgroundColor: isDark ? 'rgba(70, 8, 9, 0.25)' : 'rgba(70, 8, 9, 0.08)',
                    color: isDark ? '#fca5a5' : '#460809',
                    borderColor: isDark ? '#871b29' : 'rgba(70, 8, 9, 0.3)',
                  }}
                >
                  ERP
                </span>
              </div>
              <div className="text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-semibold hidden sm:flex">
                <span className="text-slate-900 dark:text-slate-100">{tenantName}</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{tenantCode}</span>
                <span className="text-slate-400 dark:text-slate-600">•</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">{branchName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search Bar (Hidden on Mobile) */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-6">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
          <input
            type="text"
            placeholder={isAr ? 'بحث عن أمر إنتاج، موديل، قماش، عميل...' : 'Search orders, models, fabric...'}
            className="w-full bg-slate-100 dark:bg-[#111726] border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs py-2 pr-9 pl-3 text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onSwitchToPublic && (
            <button
              onClick={onSwitchToPublic}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors hidden sm:block"
            >
              {isAr ? 'الموقع التسويقي' : 'Marketing Site'}
            </button>
          )}

          {userRole === 'platform_admin' && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-colors flex items-center gap-1"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Super Admin</span>
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenNewCompanyModal}
            className="text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold hidden md:inline-flex"
            icon={<Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />}
          >
            {isAr ? 'تسجيل مصنع' : 'New Factory'}
          </Button>

          {/* Theme switcher (Day/Night) */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center justify-center"
              title={isDark ? (isAr ? 'تفعيل الوضع المضيء' : 'Switch to Light Mode') : (isAr ? 'تفعيل الوضع الليلي' : 'Switch to Dark Mode')}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          )}

          {/* Lang switcher */}
          <button
            onClick={onToggleLang}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs flex items-center gap-1"
            title={isAr ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="font-semibold text-[11px]">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden sm:block">
            <Bell className="w-4 h-4" />
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            />
          </button>

          {/* User Profile & Auth Controls */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pr-1 rtl:pr-0 rtl:pl-1 border-s border-slate-200 dark:border-slate-800">
              <div className="text-right rtl:text-right ltr:text-left hidden lg:block">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">{userName}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                  {userRole === 'company_owner'
                    ? (isAr ? 'مالك الشركة' : 'Factory Owner')
                    : userRole === 'accountant'
                    ? (isAr ? 'محاسب مالي' : 'Accountant')
                    : userRole === 'production_manager'
                    ? (isAr ? 'مدير إنتاج' : 'Production Manager')
                    : userRole === 'worker'
                    ? (isAr ? 'عامل تشغيل' : 'Operator')
                    : userRole}
                </span>
              </div>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-sm"
                style={{ backgroundColor: 'var(--brand-primary)' }}
              >
                {userName.charAt(0) || 'م'}
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title={isAr ? 'تسجيل الخروج' : 'Logout'}
                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenLoginModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenLoginModal}
                className="btn-brand-primary text-xs"
                icon={<LogIn className="w-3.5 h-3.5" />}
              >
                {isAr ? 'تسجيل الدخول' : 'Sign In'}
              </Button>
            )
          )}
        </div>
      </header>

      {/* Mobile Drawer (Accessible on Phones & Small Tablets) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-[#0a0e18] border-e border-slate-200 dark:border-slate-800 h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-fade-in">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
                    style={{ backgroundColor: 'var(--brand-primary)' }}
                  >
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-black text-slate-900 dark:text-white">GarmentOS ERP</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation groups in mobile drawer */}
              <nav className="space-y-4">
                {navGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 uppercase tracking-wider mb-2">
                      {group.groupTitle}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => !item.disabled && handleSelectTab(item.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                              item.disabled
                                ? 'opacity-40 cursor-not-allowed text-slate-400'
                                : isActive
                                ? 'text-white border shadow-sm'
                                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/60'
                            }`}
                            style={
                              isActive
                                ? {
                                    backgroundColor: isDark ? '#460809' : '#460809',
                                    borderColor: '#871b29',
                                    color: '#ffffff',
                                  }
                                : {}
                            }
                          >
                            <div className="flex items-center gap-2.5">
                              <span>{item.icon}</span>
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                style={
                                  item.disabled
                                    ? { backgroundColor: '#e2e8f0', color: '#64748b' }
                                    : { backgroundColor: 'rgba(70, 8, 9, 0.25)', color: isDark ? '#fca5a5' : '#ffffff' }
                                }
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
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              {onToggleTheme && (
                <button
                  onClick={onToggleTheme}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
                  <span>{isDark ? (isAr ? 'الوضع المضيء (Day)' : 'Light Mode') : (isAr ? 'الوضع الليلي (Night)' : 'Dark Mode')}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onSwitchToPublic) onSwitchToPublic();
                }}
                className="w-full text-center py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                {isAr ? 'العودة للموقع التسويقي' : 'Back to Marketing Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="w-64 border-e border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#0a0e18]/90 backdrop-blur-sm p-3.5 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto">
          <nav className="space-y-5">
            {navGroups.map((group, gi) => (
              <div key={gi}>
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 uppercase tracking-wider mb-2">
                  {group.groupTitle}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        disabled={item.disabled}
                        onClick={() => !item.disabled && onTabChange(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          item.disabled
                            ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500'
                            : isActive
                            ? 'text-white border shadow-sm'
                            : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800/60'
                        }`}
                        style={
                          isActive
                            ? {
                                backgroundColor: isDark
                                  ? 'rgba(70, 8, 9, 0.35)'
                                  : 'rgba(70, 8, 9, 0.08)',
                                borderColor: isDark
                                  ? '#871b29'
                                  : 'rgba(70, 8, 9, 0.25)',
                                color: isDark ? '#ffffff' : '#460809',
                              }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            style={isActive ? { color: isDark ? '#fca5a5' : '#460809' } : {}}
                          >
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                            style={
                              item.disabled
                                ? { backgroundColor: isDark ? '#1e293b' : '#e2e8f0', color: '#94a3b8' }
                                : {
                                    backgroundColor: 'rgba(70, 8, 9, 0.15)',
                                    color: isDark ? '#fca5a5' : '#460809',
                                  }
                            }
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

          {/* System status footer */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 text-[11px] mt-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{isAr ? 'حالة السحابة' : 'Cloud Status'}</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                <CheckCircle2 className="w-3 h-3" />
                {isAr ? 'متصل ونشط' : 'Active'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              PostgreSQL • Redis • Multi-Tenant
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-slate-50 dark:bg-[#080b12]">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

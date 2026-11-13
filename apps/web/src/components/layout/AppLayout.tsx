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
  CreditCard,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';
import { Button } from '../ui/Button';
import type { Language, Direction } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  disabled?: boolean;
  colorGradient: string;
  colorShadow: string;
  colorBg: string;
}

interface NavGroup {
  groupCode: string;
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
  tenantSlug?: string;
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
  tenantSlug,
  branchName,
  onOpenNewCompanyModal,
  userName: propUserName,
  userRole = 'company_owner',
  isAuthenticated = true,
  onLogout,
  onOpenLoginModal,
  onSwitchToPublic,
  onSwitchToAdmin,
}) => {
  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';
  const isAr = lang === 'ar';
  const userName = propUserName || (isAr ? 'مالك المصنع' : 'Factory Owner');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('navbar-quick-search');
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const isTabAllowedForRole = (tabId: string, role: string): boolean => {
    if (role === 'company_owner' || role === 'platform_admin') return true;
    switch (role) {
      case 'production_manager':
        return ['dashboard', 'models', 'cutting', 'subcontracting', 'waslat_worsh', 'maintenance', 'inventory', 'purchasing', 'piece_rate'].includes(tabId);
      case 'accountant':
        return ['dashboard', 'inventory', 'purchasing', 'sales', 'costing', 'piece_rate', 'subscription'].includes(tabId);
      case 'sales_rep':
        return ['dashboard', 'sales', 'storefront', 'models', 'inventory'].includes(tabId);
      case 'worker':
        return ['cutting', 'piece_rate'].includes(tabId);
      default:
        return true;
    }
  };

  const navGroups: NavGroup[] = [
    {
      groupCode: '01',
      groupTitle: isAr ? 'الإنتاج والتشغيل' : 'Production Floor',
      items: [
        {
          id: 'dashboard',
          label: isAr ? 'لوحة القيادة والمصنع' : 'Factory Command',
          icon: <LayoutDashboard className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('dashboard', userRole),
          colorGradient: 'bg-gradient-to-br from-blue-500 via-indigo-600 to-blue-700',
          colorShadow: 'rgba(59, 130, 246, 0.45)',
          colorBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        },
        {
          id: 'models',
          label: isAr ? 'الموديلات وشجرة BOM' : 'Models & BOMs',
          icon: <Shirt className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('models', userRole),
          colorGradient: 'bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-700',
          colorShadow: 'rgba(139, 92, 246, 0.45)',
          colorBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20',
        },
        {
          id: 'cutting',
          label: isAr ? 'صالة القص والتشغيل' : 'Cutting & Bundles',
          icon: <Scissors className="w-4 h-4" />,
          badge: isAr ? 'نشط' : 'Live',
          disabled: !isTabAllowedForRole('cutting', userRole),
          colorGradient: 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600',
          colorShadow: 'rgba(245, 158, 11, 0.45)',
          colorBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        },
        {
          id: 'subcontracting',
          label: isAr ? 'التشغيل للغير CMT' : 'Subcontracting CMT',
          icon: <Boxes className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('subcontracting', userRole),
          colorGradient: 'bg-gradient-to-br from-cyan-500 via-teal-600 to-emerald-700',
          colorShadow: 'rgba(6, 182, 212, 0.45)',
          colorBg: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20',
        },
        {
          id: 'waslat_worsh',
          label: isAr ? 'منصة وصلة ورش B2B' : 'Waslat Worsh B2B',
          icon: <Building2 className="w-4 h-4" />,
          badge: isAr ? 'سوق' : 'Market',
          disabled: !isTabAllowedForRole('waslat_worsh', userRole),
          colorGradient: 'bg-gradient-to-br from-emerald-500 via-teal-600 to-green-700',
          colorShadow: 'rgba(16, 185, 129, 0.45)',
          colorBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        },
        {
          id: 'maintenance',
          label: isAr ? 'صيانة الماكينات والأصول' : 'Machine Assets',
          icon: <Wrench className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('maintenance', userRole),
          colorGradient: 'bg-gradient-to-br from-rose-500 via-red-600 to-pink-700',
          colorShadow: 'rgba(244, 63, 94, 0.45)',
          colorBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        },
      ],
    },
    {
      groupCode: '02',
      groupTitle: isAr ? 'المخازن والتوريد' : 'Logistics',
      items: [
        {
          id: 'inventory',
          label: isAr ? 'المخازن والأقمشة' : 'Fabric Inventory',
          icon: <Layers className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('inventory', userRole),
          colorGradient: 'bg-gradient-to-br from-sky-500 via-blue-600 to-cyan-700',
          colorShadow: 'rgba(14, 165, 233, 0.45)',
          colorBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20',
        },
        {
          id: 'purchasing',
          label: isAr ? 'المشتريات والموردين' : 'Procurement & POs',
          icon: <ShoppingCart className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('purchasing', userRole),
          colorGradient: 'bg-gradient-to-br from-indigo-500 via-blue-600 to-indigo-800',
          colorShadow: 'rgba(99, 102, 241, 0.45)',
          colorBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
        },
      ],
    },
    {
      groupCode: '03',
      groupTitle: isAr ? 'المالية والمبيعات' : 'Commercial',
      items: [
        {
          id: 'sales',
          label: isAr ? 'المبيعات ونقطة البيع' : 'Sales & POS',
          icon: <TrendingUp className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('sales', userRole),
          colorGradient: 'bg-gradient-to-br from-emerald-400 via-green-600 to-teal-700',
          colorShadow: 'rgba(16, 185, 129, 0.45)',
          colorBg: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
        },
        {
          id: 'costing',
          label: isAr ? 'التكاليف والمالية' : 'Costing & Accounts',
          icon: <Receipt className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('costing', userRole),
          colorGradient: 'bg-gradient-to-br from-teal-500 via-emerald-600 to-green-700',
          colorShadow: 'rgba(20, 184, 166, 0.45)',
          colorBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
        },
        {
          id: 'piece_rate',
          label: isAr ? 'أجور القطعة والعمال' : 'Piece-Rate & HR',
          icon: <Users className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('piece_rate', userRole),
          colorGradient: 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-600',
          colorShadow: 'rgba(251, 191, 36, 0.45)',
          colorBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        },
        {
          id: 'storefront',
          label: isAr ? 'المتجر الإلكتروني' : 'B2B Storefront',
          icon: <Store className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('storefront', userRole),
          colorGradient: 'bg-gradient-to-br from-pink-500 via-rose-600 to-purple-700',
          colorShadow: 'rgba(236, 72, 153, 0.45)',
          colorBg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
        },
      ],
    },
    {
      groupCode: '04',
      groupTitle: isAr ? 'إدارة النظام' : 'System',
      items: [
        {
          id: 'subscription',
          label: isAr ? 'الاشتراك وسعة المصنع' : 'Subscription',
          icon: <CreditCard className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('subscription', userRole),
          colorGradient: 'bg-gradient-to-br from-purple-500 via-indigo-600 to-violet-800',
          colorShadow: 'rgba(168, 85, 247, 0.45)',
          colorBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
        },
        {
          id: 'settings',
          label: isAr ? 'إعدادات الشركة' : 'Settings',
          icon: <Settings className="w-4 h-4" />,
          disabled: !isTabAllowedForRole('settings', userRole),
          colorGradient: 'bg-gradient-to-br from-slate-600 via-zinc-700 to-slate-900',
          colorShadow: 'rgba(100, 116, 139, 0.45)',
          colorBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
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
      className="h-screen max-h-screen w-full max-w-full overflow-hidden bg-slate-50 dark:bg-[var(--bg-app)] text-slate-900 dark:text-slate-100 flex flex-col antialiased selection:bg-[var(--brand-primary)] selection:text-white transition-colors duration-200"
    >
      {/* ───── Top Navbar: Masterpiece Nano-Glass Floating Bar ───── */}
      <header className="h-16 shrink-0 z-40 px-3 sm:px-6 flex items-center justify-between glass-panel border-b border-white/60 dark:border-white/10 max-w-full overflow-hidden">
        {/* Left: Jewel Logo + Live Nano-Pill */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden h-10 w-10 rounded-2xl glass-panel text-slate-700 dark:text-slate-300 hover:shadow-lg transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Gleaming Jewel Brand Logo */}
          <div className="flex items-center gap-3 group cursor-default">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9E2A3B] via-[#7F1625] to-[#450a0a] text-white shadow-[0_4px_20px_rgba(127,22,37,0.45)] ring-2 ring-white/60 dark:ring-white/15 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_6px_28px_rgba(127,22,37,0.65)]">
              <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl pointer-events-none" />
              <Scissors className="w-5 h-5 -rotate-45 relative z-10 drop-shadow-md" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg bg-gradient-to-r from-slate-950 via-slate-800 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent font-sans tracking-tight drop-shadow-xs">
                GarmentOS
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-[0_2px_8px_rgba(244,63,94,0.4)] hidden sm:inline-flex items-center gap-1 font-mono tracking-wider">
                <Sparkles className="w-2.5 h-2.5" />
                CORE PRO
              </span>
            </div>
          </div>

          {/* Futuristic Factory Beacon Nano-Pill */}
          <div
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel border border-emerald-500/30 dark:border-emerald-500/20 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-default"
            title={`${tenantName} • ${tenantCode} • ${branchName}`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-100 truncate max-w-[150px] lg:max-w-[200px]">
              {tenantName}
            </span>
          </div>
        </div>

        {/* Center: Cyber Glass Floating Search Capsule */}
        <div className="hidden lg:flex items-center relative max-w-sm w-full mx-6">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 rtl:left-auto ltr:left-3.5 ltr:right-auto pointer-events-none transition-colors" />
          <input
            id="navbar-quick-search"
            type="text"
            placeholder={isAr ? 'بحث فوري في النظام (Ctrl+K)...' : 'Instant search (Ctrl+K)...'}
            className="w-full glass-panel focus:bg-white dark:focus:bg-slate-900 border border-slate-200/80 dark:border-white/10 focus:border-[var(--brand-primary)] rounded-full text-xs py-2.5 pr-10 pl-14 rtl:pr-10 rtl:pl-14 ltr:pl-10 ltr:pr-14 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-[var(--brand-primary)]/15 shadow-2xs hover:shadow-md focus:shadow-[0_8px_25px_rgba(127,22,37,0.18)] transition-all duration-300"
          />
          <kbd className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 bg-white/90 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-md shadow-2xs pointer-events-none">
            Ctrl+K
          </kbd>
        </div>

        {/* Right: Gemstone Action Controls */}
        <div className="flex items-center gap-2">
          {/* Super Admin Jewel Pod */}
          {userRole === 'platform_admin' && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="h-10 px-3 rounded-2xl glass-panel text-[var(--brand-primary)] dark:text-[#F87171] border border-[var(--brand-border)] hover:shadow-[0_4px_20px_rgba(127,22,37,0.3)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              title={isAr ? 'إدارة المنصة' : 'Admin'}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          {/* Luminous Storefront Gem Pod */}
          <button
            onClick={() => {
              const targetSlug = tenantSlug || tenantCode || 'msnaa-aldlta-llmlabs-algahz-429';
              window.open(`#/store/${targetSlug}`, '_blank');
            }}
            className="h-10 flex items-center gap-2 px-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-[0_4px_16px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.45)] hover:-translate-y-1 hover:scale-105 transition-all duration-200 text-xs font-bold cursor-pointer"
            title={isAr ? `متجر المصنع (${tenantName})` : `Visit Storefront`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            </span>
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isAr ? 'متجر المصنع' : 'Store'}</span>
          </button>

          {/* Theme Orb */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="h-10 w-10 rounded-2xl glass-panel text-slate-600 dark:text-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title={isDark ? (isAr ? 'الوضع المضيء' : 'Light Mode') : (isAr ? 'الوضع الداكن' : 'Dark Mode')}
              aria-label={isDark ? (isAr ? "تفعيل الوضع الفاتح" : "Switch to light mode") : (isAr ? "تفعيل الوضع الداكن" : "Switch to dark mode")}\n              aria-pressed={isDark}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          )}

          {/* Language Gem Pod */}
          <button
            onClick={onToggleLang}
            className="h-10 w-10 sm:w-auto sm:px-3 rounded-2xl glass-panel text-slate-700 dark:text-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-xs flex items-center justify-center gap-1.5 font-bold cursor-pointer"
            title={isAr ? 'Switch to English' : 'التحويل للعربية'}
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline text-[11px] font-mono">{isAr ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Royal Avatar Gem Pod */}
          {isAuthenticated ? (
            <div className="relative ms-1">
              <button
                onClick={() => setUserMenuOpen(prev => !prev)}
                className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9E2A3B] to-[#7F1625] text-white text-xs font-black shadow-[0_4px_16px_rgba(127,22,37,0.35)] ring-2 ring-white/70 dark:ring-white/20 hover:scale-110 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(127,22,37,0.55)] transition-all duration-200 cursor-pointer focus:outline-none"
                aria-expanded={userMenuOpen}
                title={userName}
              >
                <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-2xl pointer-events-none" />
                <span className="relative z-10">{userName.charAt(0) || (isAr ? 'م' : 'O')}</span>
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute left-0 rtl:left-0 rtl:right-auto ltr:right-0 ltr:left-auto mt-2 w-64 rounded-3xl glass-panel shadow-2xl py-3 z-40 animate-in fade-in zoom-in-95 duration-150 border border-white/60 dark:border-white/10">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-extrabold text-slate-900 dark:text-white">{userName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {tenantName} • {branchName}
                      </div>
                    </div>

                    <div className="py-1.5 px-2">
                      {onSwitchToPublic && (
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            onSwitchToPublic();
                          }}
                          className="w-full text-start px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <Globe className="w-4 h-4 text-slate-400" />
                          <span>{isAr ? 'الموقع التسويقي العام' : 'Public Marketing Site'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onOpenNewCompanyModal();
                        }}
                        className="w-full text-start px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800 flex items-center gap-2.5 cursor-pointer transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span>{isAr ? 'تسجيل مصنع جديد' : 'Register New Factory'}</span>
                      </button>
                    </div>

                    {onLogout && (
                      <div className="pt-1.5 px-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false);
                            setIsLogoutModalOpen(true);
                          }}
                          className="w-full text-start px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
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
                className="btn-brand-primary text-xs font-bold rounded-2xl px-4 shadow-[0_4px_16px_rgba(127,22,37,0.35)] hover:shadow-[0_6px_25px_rgba(127,22,37,0.55)]"
                icon={<LogIn className="w-4 h-4" />}
              >
                <span>{isAr ? 'تسجيل الدخول' : 'Sign In'}</span>
              </Button>
            )
          )}
        </div>
      </header>

      {/* ───── Mobile Drawer ───── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] glass-panel h-full p-4 flex flex-col justify-between overflow-y-auto shadow-2xl z-10 animate-in slide-in-from-right duration-200 border-e border-white/20">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[#9E2A3B] to-[#7F1625] text-white shadow-md">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <span className="font-black text-base text-slate-900 dark:text-white font-sans">GarmentOS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Navigation */}
              <nav className="space-y-4">
                {navGroups.map((group, gi) => (
                  <div key={gi}>
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 px-2 uppercase mb-1.5 tracking-wider font-mono">
                      {group.groupCode} // {group.groupTitle}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={() => handleSelectTab(item.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                              item.disabled
                                ? 'opacity-40 cursor-not-allowed'
                                : isActive
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                  isActive
                                    ? `${item.colorGradient} text-white shadow-md`
                                    : item.colorBg
                                }`}
                              >
                                {item.icon}
                              </div>
                              <span>{item.label}</span>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
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

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              {onLogout && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───── Main Workspace Body ───── */}
      <div className="flex-1 flex min-w-0 w-full max-w-full overflow-hidden">
        {/* ───── CoreUI Pro Nano-Glass Sidebar ───── */}
        <aside
          className={`glass-panel dark:bg-[var(--bg-sidebar)] border-e border-white/60 dark:border-[var(--border-subtle)] p-2.5 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto transition-all duration-300 ease-out shadow-[4px_0_30px_-5px_rgba(0,0,0,0.04)] ${
            sidebarCollapsed ? 'w-[78px]' : 'w-64'
          }`}
        >
          <div className="space-y-3">
            {/* Collapse Toggle Switcher Header */}
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between px-2'} pb-2 border-b border-slate-200/50 dark:border-slate-800/60`}>
              {!sidebarCollapsed && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)]" />
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                    {isAr ? 'لوحة التحكم' : 'NAVIGATION'}
                  </span>
                </div>
              )}
              <button
                onClick={handleToggleSidebar}
                className="h-8 w-8 rounded-xl glass-panel text-slate-500 hover:text-slate-900 dark:hover:text-white shadow-2xs hover:shadow-lg hover:-translate-y-0.5 hover:scale-105 transition-all duration-200 flex items-center justify-center cursor-pointer"
                title={sidebarCollapsed ? (isAr ? 'توسيع القائمة' : 'Expand Sidebar') : (isAr ? 'طي القائمة' : 'Collapse Sidebar')}
              >
                {sidebarCollapsed ? (
                  isAr ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />
                ) : (
                  isAr ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* CoreUI Navigation Sections & Jewel-Grade Cards */}
            <nav className="space-y-3.5">
              {navGroups.map((group, gi) => (
                <div key={gi} className="space-y-1">
                  {!sidebarCollapsed ? (
                    <div className="flex items-center gap-2 px-2 pt-1 pb-0.5">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-wider font-mono">
                        {group.groupCode} // {group.groupTitle}
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-slate-200/80 dark:from-slate-800 to-transparent" />
                    </div>
                  ) : (
                    <div className="w-6 mx-auto my-2 border-t border-slate-200/60 dark:border-slate-800" />
                  )}

                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          disabled={item.disabled}
                          onClick={() => !item.disabled && onTabChange(item.id)}
                          title={sidebarCollapsed ? item.label : undefined}
                          className={`group relative w-full flex items-center rounded-2xl transition-all duration-200 cursor-pointer ${
                            sidebarCollapsed
                              ? 'p-2 justify-center'
                              : 'px-2.5 py-1.5 justify-between'
                          } ${
                            item.disabled
                              ? 'opacity-30 cursor-not-allowed'
                              : isActive
                              ? 'bg-white/95 dark:bg-[#120406] text-slate-900 dark:text-white shadow-[0_8px_25px_-4px_rgba(127,22,37,0.35)] border border-[#7F1625]/50 font-extrabold'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/90 dark:hover:bg-slate-800/80 hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_12px_30px_-5px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:scale-[1.02]'
                          }`}
                        >
                          {/* Active Neon Laser Indicator */}
                          {!sidebarCollapsed && isActive && (
                            <span className="absolute start-1 top-2 bottom-2 w-1.5 rounded-full bg-[var(--brand-primary)] shadow-[0_0_12px_var(--brand-primary)]" />
                          )}

                          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : 'ps-1.5'}`}>
                            {/* Jewel Icon Pod with Specular Shine and Glow */}
                            <div
                              style={{ '--gem-shadow': item.colorShadow } as React.CSSProperties}
                              className={`gem-pod w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-115 ${
                                isActive
                                  ? `${item.colorGradient} text-white shadow-[0_4px_18px_var(--gem-shadow)] ring-2 ring-white/50 dark:ring-white/20`
                                  : `${item.colorBg} group-hover:${item.colorGradient} group-hover:text-white group-hover:shadow-[0_8px_25px_var(--gem-shadow)] group-hover:ring-2 group-hover:ring-white/50`
                              }`}
                            >
                              <div className="relative z-10 transition-transform group-hover:rotate-6">
                                {item.icon}
                              </div>
                            </div>

                            {/* Label */}
                            {!sidebarCollapsed && (
                              <span className="text-xs truncate font-semibold group-hover:font-bold transition-all">
                                {item.label}
                              </span>
                            )}
                          </div>

                          {/* Badge when Expanded */}
                          {!sidebarCollapsed && item.badge && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono shrink-0 shadow-2xs">
                              {item.badge}
                            </span>
                          )}

                          {/* Glowing Pip when Collapsed & has Badge */}
                          {sidebarCollapsed && item.badge && (
                            <span className="absolute top-1.5 end-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 shadow-[0_0_8px_#10b981]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* ───── CoreUI Telemetry Footer ───── */}
          <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800">
            {!sidebarCollapsed ? (
              <div className="space-y-2">
                {/* Status Telemetry Pill */}
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl glass-panel text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-[10px]">ENGINE 100%</span>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-black font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    </span>
                    <span>ONLINE</span>
                  </span>
                </div>

                {/* Quick Glass Action Buttons */}
                <div className="flex items-center justify-between gap-1.5">
                  {onSwitchToPublic && (
                    <button
                      type="button"
                      onClick={onSwitchToPublic}
                      className="flex-1 py-2 px-2.5 rounded-xl glass-panel text-slate-700 hover:text-slate-950 dark:hover:text-white text-[11px] font-extrabold hover:shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      title={isAr ? 'الموقع العام' : 'Public Site'}
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isAr ? 'الموقع' : 'Public'}</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => setIsLogoutModalOpen(true)}
                      className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-[11px] font-extrabold hover:shadow-[0_4px_16px_rgba(244,63,94,0.35)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer"
                      title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{isAr ? 'خروج' : 'Exit'}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                </span>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-600 hover:text-white shadow-2xs hover:shadow-[0_6px_20px_rgba(244,63,94,0.45)] hover:-translate-y-1 transition-all duration-200 flex items-center justify-center cursor-pointer"
                    title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ───── Main Content Area ───── */}
        <main className="flex-1 h-full min-w-0 max-w-full w-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 lg:p-8 bg-slate-50/70 dark:bg-[var(--bg-app)]">
          <div className="max-w-7xl mx-auto space-y-6 w-full min-w-0">{children}</div>
        </main>
      </div>

      {/* ───── Logout Confirmation Modal ───── */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
          <div className="glass-panel rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-white/60 dark:border-white/10">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-[0_4px_16px_rgba(244,63,94,0.25)]">
                <LogOut className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-slate-100">
                  {isAr ? 'تأكيد تسجيل الخروج' : 'Confirm Sign Out'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAr ? 'إنهاء جلسة العمل الحالية' : 'Terminate current active session'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {isAr
                ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من منظومة GarmentOS؟ سيتم إبطال رمز الجلسة ومسح بيانات المصنع الحالية بأمان.'
                : 'Are you sure you want to sign out of GarmentOS? Your session token will be revoked and tenant workspace data cleared securely.'}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  if (onLogout) onLogout();
                }}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-[0_4px_16px_rgba(225,29,72,0.4)] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
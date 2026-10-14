import React from 'react';
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
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Language, Direction } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  lang: Language;
  onToggleLang: () => void;
  tenantName: string;
  tenantCode: string;
  branchName: string;
  onOpenNewCompanyModal: () => void;
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
}) => {
  const dir: Direction = lang === 'ar' ? 'rtl' : 'ltr';

  const navItems = [
    { id: 'dashboard', label: lang === 'ar' ? 'لوحة القيادة والمصنع' : 'Factory Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'cutting', label: lang === 'ar' ? 'صالة القص والإنتاج' : 'Cutting & Production', icon: <Scissors className="w-4 h-4" />, badge: 'Live' },
    { id: 'inventory', label: lang === 'ar' ? 'المخازن والخامات' : 'Inventory & Fabric', icon: <Boxes className="w-4 h-4" /> },
    { id: 'purchasing', label: lang === 'ar' ? 'المشتريات والموردين' : 'Purchasing', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'sales', label: lang === 'ar' ? 'المبيعات ونقطة البيع' : 'Sales & POS', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'costing', label: lang === 'ar' ? 'التكاليف والمالية' : 'Costing & Accounts', icon: <Receipt className="w-4 h-4" /> },
    { id: 'piece_rate', label: lang === 'ar' ? 'أجور القطعة والعمال' : 'Piece-Rate & HR', icon: <Users className="w-4 h-4" /> },
    { id: 'storefront', label: lang === 'ar' ? 'المتجر الإلكتروني' : 'Storefront', icon: <Store className="w-4 h-4" /> },
    { id: 'settings', label: lang === 'ar' ? 'إعدادات الشركة' : 'Tenant Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-6 flex items-center justify-between">
        {/* Brand & Tenant Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Scissors className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                  GarmentOS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Cloud
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="text-slate-300 font-medium">{tenantName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-indigo-400 font-mono text-[10px]">{tenantCode}</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 text-[10px]">{branchName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
          <input
            type="text"
            placeholder={lang === 'ar' ? 'بحث عن أمر إنتاج، موديل، قماش، عميل...' : 'Search orders, models, fabric...'}
            className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs py-2 pr-9 pl-3 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenNewCompanyModal}
            icon={<Building2 className="w-3.5 h-3.5 text-indigo-400" />}
          >
            {lang === 'ar' ? 'تسجيل مصنع جديد' : 'New Company'}
          </Button>

          {/* Lang switcher */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleLang}
            icon={<Globe className="w-3.5 h-3.5" />}
          >
            {lang === 'ar' ? 'English (LTR)' : 'العربية (RTL)'}
          </Button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
          </button>

          {/* User profile avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              أ
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-l border-slate-800/80 bg-slate-900/50 backdrop-blur-sm p-4 hidden md:flex flex-col justify-between shrink-0">
          <nav className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
              {lang === 'ar' ? 'وحدات المصنع' : 'Factory Modules'}
            </div>
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="purple" className="text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>

          {/* System status footer */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400">{lang === 'ar' ? 'حالة السحابة' : 'Cloud Status'}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {lang === 'ar' ? 'متصل' : 'Active'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              PostgreSQL • Redis • Multi-Tenant Isolated
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

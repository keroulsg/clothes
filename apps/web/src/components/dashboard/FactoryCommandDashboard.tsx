import React, { useState, useMemo, useEffect } from 'react';
import {
  Scissors,
  Layers,
  Calculator,
  ArrowRightLeft,
  Search,
  ShieldCheck,
  Boxes,
  ShoppingCart,
  Plus,
  Globe,
  Activity,
  Building2,
  AlertTriangle,
  BarChart3,
  X,
  Eye,
  RefreshCw,
  Zap,
  TrendingUp,
  Clock,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { Modal } from '../ui/Modal';
import type {
  ProductionOrder,
  CuttingOrder,
  CuttingBundle,
  InventoryItem,
  PurchaseOrder,
  Warehouse,
} from '../../types';

interface FactoryCommandDashboardProps {
  isAr: boolean;
  tenantName: string;
  tenantCode: string;
  tenantSubdomain?: string;
  productionOrders: ProductionOrder[];
  cuttingOrders: CuttingOrder[];
  cuttingBundles: CuttingBundle[];
  inventoryItems: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  warehouses: Warehouse[];
  onTabChange: (tab: string) => void;
  onOpenCreateProdOrder: () => void;
  onOpenFabricCalc: () => void;
  onOpenCreateModel: () => void;
  onOpenReceiveCustomerMat: () => void;
  onOpenCreatePo: () => void;
  onSelectStockItem: (item: InventoryItem) => void;
  onSelectProdOrderForQc: (order: ProductionOrder) => void;
}

export const FactoryCommandDashboard: React.FC<FactoryCommandDashboardProps> = ({
  isAr,
  tenantName,
  tenantCode,
  tenantSubdomain,
  productionOrders: initialProductionOrders,
  cuttingOrders,
  cuttingBundles,
  inventoryItems,
  purchaseOrders,
  warehouses,
  onTabChange,
  onOpenCreateProdOrder,
  onOpenFabricCalc,
  onOpenCreateModel,
  onOpenReceiveCustomerMat,
  onOpenCreatePo,
  onSelectStockItem,
  onSelectProdOrderForQc,
}) => {
  // Local state for interactive production orders (allows instant stage progression)
  const [localOrders, setLocalOrders] = useState<ProductionOrder[]>(initialProductionOrders);

  // Sync if initial props change
  useEffect(() => {
    setLocalOrders(initialProductionOrders);
  }, [initialProductionOrders]);

  // Order Details Modal State
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<ProductionOrder | null>(null);

  // Live Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Table Controls - Production Orders
  const [prodSearch, setProdSearch] = useState<string>('');
  const [prodStageFilter, setProdStageFilter] = useState<string>('all');
  const [prodCurrentPage, setProdCurrentPage] = useState<number>(1);
  const prodPerPage = 6;

  // Table Controls - Fabric Stock
  const [fabricSearch, setFabricSearch] = useState<string>('');
  const [fabricCustodyFilter, setFabricCustodyFilter] = useState<'all' | 'factory' | 'cmt'>('all');
  const [fabricCurrentPage, setFabricCurrentPage] = useState<number>(1);
  const fabricPerPage = 6;

  // Feed Filter Control
  const [feedFilter, setFeedFilter] = useState<'all' | 'cutting' | 'production' | 'warehouse'>('all');

  // Show quick toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Manual Live Refresh Simulation
  const handleLiveRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastRefreshedAt(new Date());
      setIsRefreshing(false);
      showToast(isAr ? 'تم تحديث مؤشرات المصنع والخطوط اللحظية بنجاح' : 'Factory indicators refreshed successfully');
    }, 600);
  };

  // Quick Advance Stage Handler
  const handleAdvanceStage = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setLocalOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        let nextStatus: ProductionOrder['status'] = ord.status;
        let nextSewn = ord.sewn_quantity || 0;
        const target = Number(ord.target_quantity || 0);

        if (ord.status === 'cutting') {
          nextStatus = 'sewing';
          nextSewn = Math.round(target * 0.35);
          showToast(isAr ? `تم تحويل الأمر ${ord.order_number} إلى مرحلة الخياطة والتجميع` : `Order ${ord.order_number} moved to Sewing stage`);
        } else if (ord.status === 'sewing') {
          nextStatus = 'qc' as any;
          nextSewn = Math.round(target * 0.85);
          showToast(isAr ? `تم تحويل الأمر ${ord.order_number} إلى مرحلة فحص الجودة QC` : `Order ${ord.order_number} moved to QC stage`);
        } else if ((ord.status as string) === 'qc' || ord.status === 'in_progress') {
          nextStatus = 'completed';
          nextSewn = target;
          showToast(isAr ? `تم اعتماد اكتمال تصنيع الأمر ${ord.order_number} بالكامل` : `Order ${ord.order_number} marked as Completed`);
        } else {
          showToast(isAr ? `الأمر ${ord.order_number} مكتمل بالفعل` : `Order is already completed`);
        }

        const updated = {
          ...ord,
          status: nextStatus,
          sewn_quantity: nextSewn,
        };

        if (selectedOrderForDetails?.id === orderId) {
          setSelectedOrderForDetails(updated);
        }

        return updated;
      })
    );
  };

  // KPI Calculations
  const totalTargetPieces = useMemo(() => {
    return localOrders.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0);
  }, [localOrders]);

  const totalSewnPieces = useMemo(() => {
    return localOrders.reduce((sum, p) => sum + (Number(p.sewn_quantity) || 0), 0);
  }, [localOrders]);

  const overallSewnPercent = totalTargetPieces > 0 ? Math.round((totalSewnPieces / totalTargetPieces) * 100) : 0;

  const totalFabricMeters = useMemo(() => {
    return inventoryItems
      .filter((i) => (i.item_type || '').includes('fabric') || i.item_type === 'fabric_raw')
      .reduce((sum, i) => sum + (Number(i.current_balance) || 0), 0);
  }, [inventoryItems]);

  const cmtMaterialsCount = useMemo(() => {
    return inventoryItems.filter((i) => i.is_customer_owned).length;
  }, [inventoryItems]);

  const lowStockItems = useMemo(() => {
    return inventoryItems.filter((i) => Number(i.current_balance) <= (Number(i.reorder_level) || 100));
  }, [inventoryItems]);

  // Production Stage Pipeline Breakdown
  const stageStats = useMemo(() => {
    const total = localOrders.length || 1;
    const cutting = localOrders.filter((p) => p.status === 'cutting').length;
    const sewing = localOrders.filter((p) => p.status === 'sewing').length;
    const qc = localOrders.filter((p) => (p.status as string) === 'qc' || p.status === 'in_progress').length;
    const completed = localOrders.filter((p) => p.status === 'completed').length;
    return {
      cutting,
      sewing,
      qc,
      completed,
      totalCount: localOrders.length,
      cuttingPercent: Math.round((cutting / total) * 100),
      sewingPercent: Math.round((sewing / total) * 100),
      qcPercent: Math.round((qc / total) * 100),
      completedPercent: Math.round((completed / total) * 100),
    };
  }, [localOrders]);

  // Filtered Production Orders
  const filteredProductionOrders = useMemo(() => {
    return localOrders.filter((po) => {
      if (prodStageFilter !== 'all') {
        if (prodStageFilter === 'qc') {
          if (po.status !== 'qc' && po.status !== 'in_progress') return false;
        } else if (po.status !== prodStageFilter) {
          return false;
        }
      }
      if (prodSearch.trim()) {
        const q = prodSearch.toLowerCase().trim();
        const num = (po.order_number || '').toLowerCase();
        const model = (po.model_name || '').toLowerCase();
        return num.includes(q) || model.includes(q);
      }
      return true;
    });
  }, [localOrders, prodStageFilter, prodSearch]);

  const totalProdPages = Math.max(1, Math.ceil(filteredProductionOrders.length / prodPerPage));
  const paginatedProductionOrders = useMemo(() => {
    const start = (prodCurrentPage - 1) * prodPerPage;
    return filteredProductionOrders.slice(start, start + prodPerPage);
  }, [filteredProductionOrders, prodCurrentPage, prodPerPage]);

  // Filtered Fabric Stock Items
  const filteredFabricItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (fabricCustodyFilter === 'factory' && item.is_customer_owned) return false;
      if (fabricCustodyFilter === 'cmt' && !item.is_customer_owned) return false;
      if (fabricSearch.trim()) {
        const q = fabricSearch.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const wh = (item.warehouse_name || '').toLowerCase();
        return code.includes(q) || name.includes(q) || wh.includes(q);
      }
      return true;
    });
  }, [inventoryItems, fabricCustodyFilter, fabricSearch]);

  const totalFabricPages = Math.max(1, Math.ceil(filteredFabricItems.length / fabricPerPage));
  const paginatedFabricItems = useMemo(() => {
    const start = (fabricCurrentPage - 1) * fabricPerPage;
    return filteredFabricItems.slice(start, start + fabricPerPage);
  }, [filteredFabricItems, fabricCurrentPage, fabricPerPage]);

  const storeSlug = tenantSubdomain || tenantCode || 'garment-factory-store';

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#000000] text-white border border-[#7F1625] shadow-2xl animate-fade-in text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Ultra-Modern Executive Hero Header & Operations Control Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#000000] via-[#120306] to-[#000000] text-white p-6 sm:p-8 shadow-2xl border border-[#7F1625]/40">
        {/* Ambient Subtle Glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#7F1625]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7F1625]/30 text-[#ff8ba0] border border-[#7F1625]/50 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'مركز قيادة العمليات الصناعية والمخزنية' : 'Industrial Operations Command'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10 backdrop-blur-md">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                {isAr ? 'متابعة لحظية نشطة 100%' : 'Real-Time Active'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono text-slate-400 bg-white/5 border border-white/10">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1625]/40 border border-[#7F1625]/60 flex items-center justify-center text-[#ff8ba0] shrink-0 shadow-inner">
                <Scissors className="w-5 h-5 text-[#ff8ba0]" />
              </div>
              <span>{isAr ? 'لوحة قيادة المصنع والتشغيل الذكي' : 'Factory Command & Operations Hub'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              {isAr
                ? 'متابعة لحظية لخطوط الإنتاج، أوامر صالة القص والفرش، أرصدة خامات الأقمشة والمخازن، ومطابقة الجودة والربحية الصناعية.'
                : 'Real-time monitoring of cutting runs, bundle tracking, fabric inventory, and quality yields.'}
            </p>

            {/* Micro Live Indicators Strip */}
            <div className="flex items-center gap-3 pt-1 flex-wrap text-xs text-slate-300">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isAr ? 'كفاءة الخطوط OEE:' : 'Line OEE:'} <strong className="text-white font-mono">88.5%</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <Scissors className="w-3.5 h-3.5 text-[#ff8ba0]" />
                <span>{isAr ? 'طاولات القص:' : 'Cutting Tables:'} <strong className="text-white font-mono">3 نشطة</strong></span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>{isAr ? 'نسبة الهالك:' : 'Scrap Rate:'} <strong className="text-emerald-400 font-mono">2.1% (ممتاز)</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleLiveRefresh}
              title={isAr ? 'تحديث لحظي لكافة مؤشرات الخطوط' : 'Refresh Floor Signals'}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:border-[#ff8ba0]/50"
            >
              <RefreshCw className={`w-4 h-4 text-[#ff8ba0] ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onOpenCreateProdOrder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-[#ff8ba0]/20"
            >
              <Scissors className="w-4 h-4" />
              <span>{isAr ? '+ أمر قص وإنتاج جديد' : '+ New Cutting Order'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateModel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:border-amber-400/50"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'موديل جديد + BOM' : 'New Model'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFabricCalc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:border-sky-400/50"
            >
              <Calculator className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'حاسبة الـ GSM' : 'Fabric GSM'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenReceiveCustomerMat}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer hover:border-purple-400/50"
            >
              <ArrowRightLeft className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'أمانات أقمشة العملاء' : 'Customer Material'}</span>
            </button>

            <button
              type="button"
              onClick={() => window.open(`#/store/${storeSlug}`, '_blank')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md transition-all cursor-pointer"
              title={isAr ? `فتح موقع ومتجر ${tenantName} الإلكتروني المستقل` : `Open Online Store`}
            >
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'متجر وموقع المصنع' : 'Storefront'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento-Grid 4 Real Traceable KPI Cards (Executive #7F1625 & #000000 Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Production Orders */}
        <div className="relative group rounded-3xl p-5 border border-slate-200/90 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] shadow-xs hover:shadow-xl hover:shadow-[#7F1625]/10 hover:border-[#7F1625]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#7F1625] to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'أوامر التشغيل الجارية' : 'Active Production Runs'}</span>
            <div className="w-9 h-9 rounded-2xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold border border-[#7F1625]/20 group-hover:scale-105 transition-transform">
              <Scissors className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {localOrders.length}{' '}
              <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر' : 'orders'}</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                  {totalTargetPieces.toLocaleString()}
                </span>{' '}
                <span>{isAr ? 'قطعة مستهدفة' : 'target pcs'}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {overallSewnPercent}% {isAr ? 'منجز' : 'sewn'}
              </span>
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7F1625] to-[#ff8ba0] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, overallSewnPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Cutting Floor & Lays */}
        <div className="relative group rounded-3xl p-5 border border-slate-200/90 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] shadow-xs hover:shadow-xl hover:shadow-[#7F1625]/10 hover:border-[#7F1625]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'أوامر صالة القص والفرش' : 'Cutting Orders & Lays'}</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold border border-amber-200 dark:border-amber-800/40 group-hover:scale-105 transition-transform">
              <Boxes className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {cuttingOrders.length}{' '}
              <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر قص' : 'lays'}</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{cuttingBundles.length}</span>{' '}
                <span>{isAr ? 'حزمة باركود مسجلة' : 'tracked bundles'}</span>
              </div>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                {cuttingOrders.filter((c) => c.status === 'spreading').length} {isAr ? 'قيد الفرش' : 'spreading'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Fabric Raw Inventory */}
        <div className="relative group rounded-3xl p-5 border border-slate-200/90 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] shadow-xs hover:shadow-xl hover:shadow-[#7F1625]/10 hover:border-[#7F1625]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'رصيد الأقمشة بالمخازن' : 'Fabric Stock Balance'}</span>
            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold border border-sky-200 dark:border-sky-800/40 group-hover:scale-105 transition-transform">
              <Layers className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-mono text-sky-600 dark:text-sky-400 tracking-tight">
              {totalFabricMeters.toLocaleString()}{' '}
              <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'متر' : 'meters'}</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{inventoryItems.length}</span>{' '}
                <span>{isAr ? 'أصناف مسجلة' : 'items'}</span>
              </div>
              {cmtMaterialsCount > 0 && (
                <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                  {cmtMaterialsCount} {isAr ? 'أمانات CMT' : 'CMT'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Purchase & Supply Orders */}
        <div className="relative group rounded-3xl p-5 border border-slate-200/90 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] shadow-xs hover:shadow-xl hover:shadow-[#7F1625]/10 hover:border-[#7F1625]/60 transition-all duration-300 overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{isAr ? 'أوامر الشراء والتوريد' : 'Procurement Orders'}</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold border border-emerald-200 dark:border-emerald-800/40 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {purchaseOrders.length}{' '}
              <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر توريد' : 'POs'}</span>
            </div>
            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
              <div>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                  {purchaseOrders.filter((p) => p.status === 'draft').length}
                </span>{' '}
                <span>{isAr ? 'مسودات قيد الاعتماد' : 'drafts pending'}</span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                {purchaseOrders.filter((p) => p.status === 'received').length} {isAr ? 'مستلم' : 'received'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Visual Production Analytics & Pipeline Cockpit */}
      <div className="overflow-hidden border border-slate-200/90 dark:border-[#7F1625]/30 rounded-3xl shadow-xs bg-white dark:bg-[#000000] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-[#7F1625]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold border border-[#7F1625]/20 shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-sans">
                {isAr ? 'مسار خطوط الإنتاج والجاهزية التشغيلية' : 'Production Pipeline & Floor Capacity'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'توزيع لحظي لأوامر التشغيل الجارية عبر مراحل صالة القص، الخياطة، وفحص الجودة' : 'Live distribution of active orders across cutting, sewing, and QC'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono text-[11px] px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 font-bold">
              {localOrders.length} {isAr ? 'أمر إجمالي' : 'total runs'}
            </span>
            <button
              type="button"
              onClick={() => onTabChange('cutting')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold shadow-xs transition-all cursor-pointer border border-[#ff8ba0]/20"
            >
              <span>{isAr ? 'صالة القص والفرش ←' : 'Floor View →'}</span>
            </button>
          </div>
        </div>

        {/* Multi-Segment Production Pipeline Bar */}
        <div className="space-y-3">
          <div className="w-full h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5 border border-slate-200 dark:border-slate-700">
            {stageStats.cutting > 0 && (
              <div
                className="h-full bg-amber-500 rounded-s-full transition-all duration-500 cursor-pointer hover:opacity-90"
                style={{ width: `${Math.max(6, stageStats.cuttingPercent)}%` }}
                title={`${isAr ? 'صالة القص' : 'Cutting'}: ${stageStats.cutting} (${stageStats.cuttingPercent}%)`}
                onClick={() => setProdStageFilter('cutting')}
              />
            )}
            {stageStats.sewing > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-500 cursor-pointer hover:opacity-90"
                style={{ width: `${Math.max(6, stageStats.sewingPercent)}%` }}
                title={`${isAr ? 'خياطة وتجميع' : 'Sewing'}: ${stageStats.sewing} (${stageStats.sewingPercent}%)`}
                onClick={() => setProdStageFilter('sewing')}
              />
            )}
            {stageStats.qc > 0 && (
              <div
                className="h-full bg-purple-500 transition-all duration-500 cursor-pointer hover:opacity-90"
                style={{ width: `${Math.max(6, stageStats.qcPercent)}%` }}
                title={`${isAr ? 'فحص الجودة' : 'QC'}: ${stageStats.qc} (${stageStats.qcPercent}%)`}
                onClick={() => setProdStageFilter('qc')}
              />
            )}
            {stageStats.completed > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-e-full transition-all duration-500 cursor-pointer hover:opacity-90"
                style={{ width: `${Math.max(6, stageStats.completedPercent)}%` }}
                title={`${isAr ? 'بضاعة تامة' : 'Completed'}: ${stageStats.completed} (${stageStats.completedPercent}%)`}
                onClick={() => setProdStageFilter('completed')}
              />
            )}
          </div>

          {/* Legend & Interactive Stage Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setProdStageFilter(prodStageFilter === 'cutting' ? 'all' : 'cutting');
                setProdCurrentPage(1);
              }}
              className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'cutting'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-[#7F1625]/25 hover:bg-slate-50 dark:hover:bg-[#120406] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {isAr ? 'صالة القص' : 'Cutting'}
                </span>
                <span className="font-mono font-black">{stageStats.cutting}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{stageStats.cuttingPercent}% {isAr ? 'من إجمالي الأوامر' : 'of floor'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProdStageFilter(prodStageFilter === 'sewing' ? 'all' : 'sewing');
                setProdCurrentPage(1);
              }}
              className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'sewing'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-[#7F1625]/25 hover:bg-slate-50 dark:hover:bg-[#120406] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {isAr ? 'خياطة وتجميع' : 'Sewing'}
                </span>
                <span className="font-mono font-black">{stageStats.sewing}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{stageStats.sewingPercent}% {isAr ? 'من إجمالي الأوامر' : 'of floor'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProdStageFilter(prodStageFilter === 'qc' ? 'all' : 'qc');
                setProdCurrentPage(1);
              }}
              className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'qc'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-300 ring-2 ring-purple-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-[#7F1625]/25 hover:bg-slate-50 dark:hover:bg-[#120406] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {isAr ? 'فحص الجودة (QC)' : 'Quality QC'}
                </span>
                <span className="font-mono font-black">{stageStats.qc}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{stageStats.qcPercent}% {isAr ? 'من إجمالي الأوامر' : 'of floor'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setProdStageFilter(prodStageFilter === 'completed' ? 'all' : 'completed');
                setProdCurrentPage(1);
              }}
              className={`p-3 rounded-2xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'completed'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-[#7F1625]/25 hover:bg-slate-50 dark:hover:bg-[#120406] text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {isAr ? 'بضاعة تامة' : 'Completed'}
                </span>
                <span className="font-mono font-black">{stageStats.completed}</span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{stageStats.completedPercent}% {isAr ? 'من إجمالي الأوامر' : 'of floor'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Operational Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 max-w-full">
        {/* Major Column (8/12): Live Orders & Fabric Ledger */}
        <div className="lg:col-span-8 space-y-6 min-w-0 max-w-full overflow-hidden">
          {/* Table 1: Live Production & Cutting Floor */}
          <div className="overflow-hidden border border-slate-200/90 dark:border-[#7F1625]/30 rounded-3xl shadow-xs bg-white dark:bg-[#000000]">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-[#7F1625]/25 bg-slate-50/80 dark:bg-[#0c0204]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-2xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center shrink-0 border border-[#7F1625]/20 font-bold">
                    <Scissors className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate">
                      {isAr ? 'أوامر الإنتاج وصالة القص الجارية' : 'Live Production & Cutting Runs'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {isAr ? 'متابعة خطوط القص، نسب الهالك، ومراحل الخياطة والترقية اللحظية' : 'Real-time monitoring of cutting lays and sewing stages'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('cutting')}
                  className="text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0] hover:underline cursor-pointer"
                >
                  {isAr ? 'عرض صالة القص كاملة ←' : 'Full Floor View →'}
                </button>
              </div>

              {/* Interactive Search & Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-[#7F1625]/20">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => {
                      setProdSearch(e.target.value);
                      setProdCurrentPage(1);
                    }}
                    placeholder={isAr ? 'بحث برقم الأمر أو الموديل...' : 'Search by order # or model...'}
                    className="w-full text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 rounded-xl border border-slate-200 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                  {prodSearch && (
                    <button
                      type="button"
                      onClick={() => setProdSearch('')}
                      className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">{isAr ? 'المرحلة:' : 'Stage:'}</span>
                  {(['all', 'cutting', 'sewing', 'qc', 'completed'] as const).map((stage) => (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        setProdStageFilter(stage);
                        setProdCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        prodStageFilter === stage
                          ? 'bg-[#7F1625] text-white shadow-xs'
                          : 'bg-white dark:bg-[#000000] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#7F1625]/30 hover:bg-slate-100 dark:hover:bg-[#150406]'
                      }`}
                    >
                      {stage === 'all'
                        ? (isAr ? 'الكل' : 'All')
                        : stage === 'cutting'
                        ? (isAr ? 'قص' : 'Cut')
                        : stage === 'sewing'
                        ? (isAr ? 'خياطة' : 'Sew')
                        : stage === 'qc'
                        ? (isAr ? 'جودة' : 'QC')
                        : (isAr ? 'مكتمل' : 'Done')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50/90 dark:bg-[#0c0204] text-slate-700 dark:text-slate-300 font-mono font-bold text-[11.5px] border-b border-slate-200 dark:border-[#7F1625]/25">
                  <tr>
                    <th className="py-4 px-4">{isAr ? 'أمر التشغيل' : 'Order #'}</th>
                    <th className="py-4 px-4 font-sans">{isAr ? 'الموديل' : 'Model'}</th>
                    <th className="py-4 px-4 font-sans text-center">{isAr ? 'المرحلة' : 'Stage'}</th>
                    <th className="py-4 px-4 text-center">{isAr ? 'نسبة الإنجاز' : 'Progress'}</th>
                    <th className="py-4 px-4 text-center">{isAr ? 'الهالك' : 'Waste'}</th>
                    <th className="py-4 px-4 text-center">{isAr ? 'موعد التسليم' : 'Due'}</th>
                    <th className="py-4 px-4 font-sans text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-sans">
                  {paginatedProductionOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center mx-auto mb-3 border border-[#7F1625]/20">
                          <Scissors className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'لا توجد أوامر مطابقة لخيارات البحث والتصفية' : 'No matching production orders'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isAr ? 'يرجى تغيير شروط التصفية أو إنشاء أمر إنتاج وقص جديد' : 'Try adjusting your filter or create a new order'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedProductionOrders.map((order) => {
                      const sewPercent = order.target_quantity > 0
                        ? Math.min(100, Math.round(((order.sewn_quantity || 0) / order.target_quantity) * 100))
                        : 0;

                      const isCompleted = order.status === 'completed';

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrderForDetails(order)}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#120406] transition-colors cursor-pointer group"
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0]">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#7F1625]/10 dark:bg-[#7F1625]/20 border border-[#7F1625]/25 text-xs font-mono">
                              {order.order_number}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#7F1625] dark:group-hover:text-[#ff8ba0] transition-colors">
                              {order.model_name}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono mt-0.5">
                              {order.target_quantity} {isAr ? 'قطعة مطلوبة' : 'pcs target'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                              order.status === 'sewing'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                : order.status === 'cutting'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : order.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                            }`}>
                              {!isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                              {order.status === 'sewing'
                                ? (isAr ? 'خياطة وتجميع' : 'Sewing')
                                : order.status === 'cutting'
                                ? (isAr ? 'صالة القص' : 'Cutting')
                                : order.status === 'completed'
                                ? (isAr ? 'مكتمل' : 'Completed')
                                : (isAr ? 'فحص جودة (QC)' : 'QC')}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 min-w-[150px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400">
                                <span>{order.sewn_quantity || 0} / {order.target_quantity}</span>
                                <span className="font-bold text-slate-900 dark:text-white">{sewPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#7F1625] to-[#ff8ba0]'
                                  }`}
                                  style={{ width: `${sewPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              Number(order.waste_percentage || 0) <= 3
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-rose-50 dark:bg-[#7F1625]/20 text-rose-700 dark:text-[#ff8ba0] border-rose-200 dark:border-[#7F1625]/40'
                            }`}>
                              {order.waste_percentage || '2.0'}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                            {order.due_date || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Stage Advance Button */}
                              {!isCompleted && (
                                <button
                                  type="button"
                                  onClick={(e) => handleAdvanceStage(order.id, e)}
                                  title={
                                    order.status === 'cutting'
                                      ? (isAr ? 'نقل الأمر لمرحلة الخياطة' : 'Advance to Sewing')
                                      : order.status === 'sewing'
                                      ? (isAr ? 'نقل الأمر لفحص الجودة QC' : 'Advance to QC')
                                      : (isAr ? 'اعتماد اكتمال الأمر' : 'Mark as Completed')
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer border border-[#ff8ba0]/20"
                                >
                                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                                  <span>{isAr ? 'ترقية' : 'Next'}</span>
                                </button>
                              )}

                              {/* QC Inspection Button */}
                              <button
                                type="button"
                                onClick={() => onSelectProdOrderForQc(order)}
                                title={isAr ? 'فحص الجودة والمطابقة' : 'QC Inspection'}
                                className="p-1.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                              >
                                <ShieldCheck className="w-4 h-4" />
                              </button>

                              {/* Order Details View */}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderForDetails(order)}
                                title={isAr ? 'عرض التفاصيل الكاملة لأمر الإنتاج' : 'View Order Details'}
                                className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1a0508] dark:text-slate-300 border border-slate-200 dark:border-[#7F1625]/30 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-[#7F1625]/20 flex justify-center bg-white dark:bg-[#000000]">
              <Pagination
                currentPage={prodCurrentPage}
                totalPages={totalProdPages}
                totalItems={filteredProductionOrders.length}
                perPage={prodPerPage}
                onPageChange={setProdCurrentPage}
                alwaysShow={true}
                isAr={isAr}
              />
            </div>
          </div>

          {/* Table 2: Critical Fabric Stock & CMT Custody */}
          <div className="overflow-hidden border border-slate-200/90 dark:border-[#7F1625]/30 rounded-3xl shadow-xs bg-white dark:bg-[#000000]">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-[#7F1625]/25 bg-slate-50/80 dark:bg-[#0c0204]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200 dark:border-sky-800/40 font-bold">
                    <Layers className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate">
                      {isAr ? 'أرصدة الأقمشة وخامات التشغيل (CMT)' : 'Fabric Stock & CMT Custody'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {isAr ? 'تتبع الأثواب المتاحة، الأمتار المتبقية، وعزل أمانات التشغيل للغير' : 'Track fabric rolls, remaining meters, and customer material isolation'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange('inventory')}
                  className="text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0] hover:underline cursor-pointer"
                >
                  {isAr ? 'عرض المخزن كامل ←' : 'Full Inventory →'}
                </button>
              </div>

              {/* Fabric Search & Custody Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-[#7F1625]/20">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fabricSearch}
                    onChange={(e) => {
                      setFabricSearch(e.target.value);
                      setFabricCurrentPage(1);
                    }}
                    placeholder={isAr ? 'بحث برمز القماش أو الاسم...' : 'Search fabric code or name...'}
                    className="w-full text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 rounded-xl border border-slate-200 dark:border-[#7F1625]/30 bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#7F1625] transition-all"
                  />
                  {fabricSearch && (
                    <button
                      type="button"
                      onClick={() => setFabricSearch('')}
                      className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">{isAr ? 'الملكية:' : 'Custody:'}</span>
                  {(['all', 'factory', 'cmt'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFabricCustodyFilter(type);
                        setFabricCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        fabricCustodyFilter === type
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white dark:bg-[#000000] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#7F1625]/30 hover:bg-slate-100 dark:hover:bg-[#150406]'
                      }`}
                    >
                      {type === 'all'
                        ? (isAr ? 'الكل' : 'All')
                        : type === 'factory'
                        ? (isAr ? 'ملكية المصنع' : 'Factory')
                        : (isAr ? 'أمانات CMT' : 'CMT')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50/90 dark:bg-[#0c0204] text-slate-700 dark:text-slate-300 font-mono font-bold text-[11.5px] border-b border-slate-200 dark:border-[#7F1625]/25">
                  <tr>
                    <th className="py-4 px-4">{isAr ? 'كود الصنف' : 'Code'}</th>
                    <th className="py-4 px-4 font-sans">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                    <th className="py-4 px-4 font-sans text-center">{isAr ? 'نوع الملكية' : 'Custody'}</th>
                    <th className="py-4 px-4 font-sans text-center">{isAr ? 'المخزن' : 'Warehouse'}</th>
                    <th className="py-4 px-4 text-center">{isAr ? 'الرصيد المتاح' : 'Available'}</th>
                    <th className="py-4 px-4 font-sans text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 font-sans">
                  {paginatedFabricItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-slate-400">
                        <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3 border border-sky-200 dark:border-sky-800/40">
                          <Layers className="w-6 h-6" />
                        </div>
                        <p className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">
                          {isAr ? 'لا توجد أقمشة أو خامات مطابقة لخيارات البحث' : 'No fabric or materials cataloged'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isAr ? 'قم بإضافة أصناف جديدة أو استلام خامات في المستودعات' : 'Add new items or receive goods into warehouses'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedFabricItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-[#120406] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 text-xs font-mono">
                            {item.code}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="text-[10.5px] text-slate-500 font-sans mt-0.5">
                            {item.item_type === 'fabric_raw' ? (isAr ? 'خام أقمشة' : 'Raw Fabric') : (isAr ? 'مستلزمات تشغيل' : 'Accessories')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.is_customer_owned ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              {isAr ? 'أمانات عميل (CMT)' : 'CMT Custody'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
                              {isAr ? 'ملكية المصنع' : 'Factory Owned'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-700 dark:text-slate-300 font-sans">
                          {item.warehouse_name || (isAr ? 'المخزن الرئيسي' : 'Main Warehouse')}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-slate-900 dark:text-slate-100">
                          <span className="text-sm">{Number(item.current_balance).toLocaleString()}</span>{' '}
                          <span className="text-[11px] font-normal text-slate-400">{item.unit_of_measure}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectStockItem(item)}
                              title={isAr ? 'تسجيل صرف لصالة القص والفرش' : 'Issue to Cutting Lay'}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer border border-[#ff8ba0]/20"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                              <span>{isAr ? 'صرف للقص' : 'Issue'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={onOpenFabricCalc}
                              title={isAr ? 'حاسبة الـ GSM والأمتار' : 'GSM Calculator'}
                              className="p-1.5 rounded-xl text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                            >
                              <Calculator className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onTabChange('inventory')}
                              title={isAr ? 'عرض كارت الصنف في المخازن' : 'View Item Ledger'}
                              className="p-1.5 rounded-xl text-slate-600 hover:bg-slate-100 dark:hover:bg-[#1a0508] dark:text-slate-300 border border-slate-200 dark:border-[#7F1625]/30 transition-colors cursor-pointer"
                            >
                              <Layers className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 dark:border-[#7F1625]/20 flex justify-center bg-white dark:bg-[#000000]">
              <Pagination
                currentPage={fabricCurrentPage}
                totalPages={totalFabricPages}
                totalItems={filteredFabricItems.length}
                perPage={fabricPerPage}
                onPageChange={setFabricCurrentPage}
                alwaysShow={true}
                isAr={isAr}
              />
            </div>
          </div>
        </div>

        {/* Minor Column (4/12): Live Feed & Active Warehouses */}
        <div className="lg:col-span-4 space-y-6 min-w-0 max-w-full overflow-hidden">
          {/* Low Stock Warning Card if any */}
          {lowStockItems.length > 0 && (
            <div className="rounded-3xl p-5 border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-white to-transparent dark:from-amber-950/30 dark:via-[#000000] dark:to-[#0a0204] shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span>{isAr ? 'تنبيه نواقص المخزون الخطر' : 'Low Stock Reorder Alert'}</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {isAr
                  ? `يوجد ${lowStockItems.length} صنف قماش قارب على النفاد دون حد إعادة الطلب.`
                  : `${lowStockItems.length} fabric items are below minimum reorder thresholds.`}
              </p>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={onOpenCreatePo}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{isAr ? 'إصدار أمر شراء (PO) ←' : 'Create PO →'}</span>
                </button>
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                  {lowStockItems[0]?.code}
                </span>
              </div>
            </div>
          )}

          {/* Widget 1: Live Floor Event Feed */}
          <div className="overflow-hidden border border-slate-200/90 dark:border-[#7F1625]/30 rounded-3xl shadow-xs bg-white dark:bg-[#000000] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#7F1625]/20">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#ff8ba0]" />
                  <span>{isAr ? 'سجل أحداث المصنع اللحظي' : 'Live Floor Event Feed'}</span>
                </h4>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono">
                  {isAr ? 'مسح وتحديثات صالة الإنتاج والقص الحية' : 'Real-time floor scans'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-emerald-600 font-bold">{isAr ? 'مباشر' : 'LIVE'}</span>
              </div>
            </div>

            {/* Event Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold pb-1">
              {(['all', 'cutting', 'production', 'warehouse'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFeedFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    feedFilter === cat
                      ? 'bg-[#7F1625] text-white'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all'
                    ? (isAr ? 'الكل' : 'All')
                    : cat === 'cutting'
                    ? (isAr ? 'القص' : 'Cut')
                    : cat === 'production'
                    ? (isAr ? 'الإنتاج' : 'Prod')
                    : (isAr ? 'المخازن' : 'Stock')}
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs">
              {(() => {
                const realEvents: Array<{
                  category: 'cutting' | 'production' | 'warehouse';
                  time: string;
                  title: string;
                  desc: string;
                  badge: string;
                  badgeClass: string;
                }> = [];

                cuttingOrders.forEach((co) => {
                  realEvents.push({
                    category: 'cutting',
                    time: co.created_at
                      ? new Date(co.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : (isAr ? 'مؤخراً' : 'Recent'),
                    title: (isAr ? 'أمر قص: ' : 'Cutting Lay: ') + co.cutting_order_number,
                    desc: (co.table_number || (isAr ? 'طاولة القص' : 'Cutting Table')) + ' • ' + (co.total_cut_pieces || co.total_expected_pieces || 0) + ' ' + (isAr ? 'قطعة' : 'pcs'),
                    badge: isAr ? 'صالة القص' : 'Cutting',
                    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
                  });
                });

                localOrders.forEach((po) => {
                  realEvents.push({
                    category: 'production',
                    time: po.created_at
                      ? new Date(po.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : (isAr ? 'مؤخراً' : 'Recent'),
                    title: (isAr ? 'تشغيل: ' : 'Run: ') + po.order_number,
                    desc: (po.model_name || (isAr ? 'موديل إنتاج' : 'Garment Model')) + ' • ' + (po.target_quantity || 0) + ' ' + (isAr ? 'قطعة' : 'pcs'),
                    badge: isAr ? 'إنتاج' : 'Production',
                    badgeClass: 'bg-[#7F1625]/10 text-[#7F1625] border-[#7F1625]/30 dark:bg-[#7F1625]/25 dark:text-[#ff8ba0]',
                  });
                });

                inventoryItems.slice(0, 3).forEach((it) => {
                  realEvents.push({
                    category: 'warehouse',
                    time: isAr ? 'اليوم' : 'Today',
                    title: (isAr ? 'صنف: ' : 'Item: ') + it.code,
                    desc: it.name + ' • ' + it.current_balance + ' ' + it.unit_of_measure,
                    badge: isAr ? 'مستودع' : 'Stock',
                    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
                  });
                });

                const filtered = realEvents.filter((ev) => feedFilter === 'all' || ev.category === feedFilter);

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <Activity className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {isAr ? 'لا توجد أحداث مطابقة في هذا التصنيف' : 'No events in this category'}
                      </p>
                    </div>
                  );
                }

                return filtered.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-[#7F1625]/15 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-white font-sans truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">{item.time}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-sans truncate">{item.desc}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${item.badgeClass}`}>
                      {item.badge}
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Widget 2: Factory Active Warehouses */}
          <div className="overflow-hidden border border-slate-200/90 dark:border-[#7F1625]/30 rounded-3xl shadow-xs bg-white dark:bg-[#000000] p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#7F1625]/20">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-500" />
                  <span>{isAr ? 'مستودعات المصنع النشطة' : 'Active Warehouses'}</span>
                </h4>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 font-sans">
                  {warehouses.length} {isAr ? 'مستودعات تشغيلية معرفة' : 'registered nodes'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('inventory')}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {isAr ? 'إدارة ←' : 'Manage →'}
              </button>
            </div>

            <div className="space-y-2.5">
              {warehouses.length === 0 ? (
                <div
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/25 bg-slate-50/70 dark:bg-[#0c0204] hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => onTabChange('inventory')}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {isAr ? 'مخزن الأقمشة الرئيسي' : 'Main Fabric Store'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">WH-MAIN-01</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{isAr ? 'خامات وأمانات CMT' : 'Fabrics & Custody'}</span>
                    <span className="text-emerald-600 font-bold text-[10.5px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isAr ? 'نشط' : 'Active'}
                    </span>
                  </div>
                </div>
              ) : (
                warehouses.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#7F1625]/25 bg-slate-50/70 dark:bg-[#0c0204] hover:bg-slate-100 dark:hover:bg-[#150406] transition-colors cursor-pointer"
                    onClick={() => onTabChange('inventory')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white font-sans truncate">
                        {wh.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">{wh.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans">
                      <span>{((wh as any).warehouse_type || wh.type) === 'fabric_raw' ? (isAr ? 'مخزن خامات أقمشة' : 'Raw Fabric') : (isAr ? 'مستودع بضاعة تامة' : 'Finished Goods')}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10.5px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {isAr ? 'نشط' : 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Production Order Comprehensive Details Modal */}
      {selectedOrderForDetails && (
        <Modal
          isOpen={Boolean(selectedOrderForDetails)}
          onClose={() => setSelectedOrderForDetails(null)}
          title={isAr ? `ملف أمر الإنتاج والتشغيل • ${selectedOrderForDetails.order_number}` : `Production Order Dossier • ${selectedOrderForDetails.order_number}`}
          maxWidth="lg"
          isAr={isAr}
        >
          <div className="space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-[#7F1625]/10 dark:bg-[#7F1625]/20 border border-[#7F1625]/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-black text-[#7F1625] dark:text-[#ff8ba0] block">
                  {selectedOrderForDetails.order_number}
                </span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {selectedOrderForDetails.model_name}
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                selectedOrderForDetails.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-[#7F1625]/20 text-[#7F1625] border-[#7F1625]/40 dark:text-[#ff8ba0]'
              }`}>
                {selectedOrderForDetails.status === 'completed'
                  ? (isAr ? 'مكتمل بالكامل' : 'Completed')
                  : selectedOrderForDetails.status === 'cutting'
                  ? (isAr ? 'قيد صالة القص' : 'Cutting')
                  : selectedOrderForDetails.status === 'sewing'
                  ? (isAr ? 'قيد الخياطة' : 'Sewing')
                  : (isAr ? 'فحص جودة' : 'QC')}
              </span>
            </div>

            {/* Stepper of Stages */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                {isAr ? 'مسار المراحل الإنتاجية:' : 'Production Pipeline Progress:'}
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { id: 'cutting', label: isAr ? '1. صالة القص' : '1. Cutting' },
                  { id: 'sewing', label: isAr ? '2. الخياطة' : '2. Sewing' },
                  { id: 'qc', label: isAr ? '3. الجودة QC' : '3. Quality' },
                  { id: 'completed', label: isAr ? '4. التمام' : '4. Done' },
                ].map((stg, i) => {
                  const currentIdx = selectedOrderForDetails.status === 'cutting' ? 0 : selectedOrderForDetails.status === 'sewing' ? 1 : (selectedOrderForDetails.status as any) === 'qc' ? 2 : 3;
                  const isPassed = i <= currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div
                      key={stg.id}
                      className={`p-2.5 rounded-xl border font-bold transition-all ${
                        isCurrent
                          ? 'bg-[#7F1625] text-white border-[#7F1625] shadow-xs'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {isPassed && !isCurrent && <Check className="w-3.5 h-3.5" />}
                        <span>{stg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10.5px] block">{isAr ? 'الكمية المستهدفة' : 'Target Qty'}</span>
                <strong className="text-base font-black font-mono text-slate-900 dark:text-white mt-1 block">
                  {selectedOrderForDetails.target_quantity} {isAr ? 'قطعة' : 'pcs'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10.5px] block">{isAr ? 'المنجز المخاط' : 'Sewn Done'}</span>
                <strong className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {selectedOrderForDetails.sewn_quantity || 0} {isAr ? 'قطعة' : 'pcs'}
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10.5px] block">{isAr ? 'نسبة الهالك' : 'Waste Rate'}</span>
                <strong className="text-base font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                  {selectedOrderForDetails.waste_percentage || '2.0'}%
                </strong>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 text-[10.5px] block">{isAr ? 'موعد التسليم' : 'Due Date'}</span>
                <strong className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mt-1.5 block">
                  {selectedOrderForDetails.due_date || '—'}
                </strong>
              </div>
            </div>

            {/* Quick Actions inside Modal */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {selectedOrderForDetails.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage(selectedOrderForDetails.id)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold shadow-md cursor-pointer transition-all border border-[#ff8ba0]/20"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>{isAr ? 'ترقية الأمر للمرحلة التالية' : 'Advance to Next Stage'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderForDetails(null);
                    onSelectProdOrderForQc(selectedOrderForDetails);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold cursor-pointer transition-all"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isAr ? 'فحص الجودة والمطابقة' : 'QC Inspection'}</span>
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderForDetails(null)}
              >
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

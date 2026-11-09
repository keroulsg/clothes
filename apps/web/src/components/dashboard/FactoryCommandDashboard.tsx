import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ActionsMenu } from '../ui/ActionsMenu';
import { Pagination } from '../ui/Pagination';
import { EmptyState } from '../ui/EmptyState';
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
  productionOrders,
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
  // Table Controls - Production Orders
  const [prodSearch, setProdSearch] = useState<string>('');
  const [prodStageFilter, setProdStageFilter] = useState<string>('all');
  const [prodCurrentPage, setProdCurrentPage] = useState<number>(1);
  const prodPerPage = 5;

  // Table Controls - Fabric Stock
  const [fabricSearch, setFabricSearch] = useState<string>('');
  const [fabricCustodyFilter, setFabricCustodyFilter] = useState<'all' | 'factory' | 'cmt'>('all');

  // KPI Calculations
  const totalTargetPieces = useMemo(() => {
    return productionOrders.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0);
  }, [productionOrders]);

  const totalSewnPieces = useMemo(() => {
    return productionOrders.reduce((sum, p) => sum + (Number(p.sewn_quantity) || 0), 0);
  }, [productionOrders]);

  const overallSewnPercent = totalTargetPieces > 0 ? Math.round((totalSewnPieces / totalTargetPieces) * 100) : 0;

  const totalFabricMeters = useMemo(() => {
    return inventoryItems
      .filter((i) => (i.item_type || '').includes('fabric'))
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
    const total = productionOrders.length || 1;
    const cutting = productionOrders.filter((p) => p.status === 'cutting').length;
    const sewing = productionOrders.filter((p) => p.status === 'sewing').length;
    const qc = productionOrders.filter((p) => (p.status as string) === 'qc' || p.status === 'in_progress').length;
    const completed = productionOrders.filter((p) => p.status === 'completed').length;
    return {
      cutting,
      sewing,
      qc,
      completed,
      totalCount: productionOrders.length,
      cuttingPercent: Math.round((cutting / total) * 100),
      sewingPercent: Math.round((sewing / total) * 100),
      qcPercent: Math.round((qc / total) * 100),
      completedPercent: Math.round((completed / total) * 100),
    };
  }, [productionOrders]);

  // Filtered Production Orders
  const filteredProductionOrders = useMemo(() => {
    return productionOrders.filter((po) => {
      if (prodStageFilter !== 'all' && po.status !== prodStageFilter) {
        return false;
      }
      if (prodSearch.trim()) {
        const q = prodSearch.toLowerCase().trim();
        const num = (po.order_number || '').toLowerCase();
        const model = (po.model_name || '').toLowerCase();
        return num.includes(q) || model.includes(q);
      }
      return true;
    });
  }, [productionOrders, prodStageFilter, prodSearch]);

  const totalProdPages = Math.ceil(filteredProductionOrders.length / prodPerPage) || 1;
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

  const storeSlug = tenantSubdomain || tenantCode || 'msnaa-aldlta-llmlabs-algahz-429';

  return (
    <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
      {/* 1. Ultra-Modern Hero Header & Control Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#000000] via-[#180508] to-[#000000] text-white p-6 sm:p-8 shadow-2xl border border-[#7F1625]/40">
        {/* Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#7F1625]/30 text-[#ff8ba0] border border-[#7F1625]/50 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'مركز قيادة العمليات الصناعية والمخزنية' : 'Industrial Operations Command'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                {isAr ? 'ربط سحابي فوري 100%' : 'Cloud Connected'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Scissors className="w-7 h-7 text-[#E05265] shrink-0" />
              <span>{isAr ? 'لوحة قيادة المصنع والتشغيل الذكي' : 'Factory Command & Operations Hub'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'متابعة لحظية لخطوط الإنتاج، أوامر صالة القص والفرش، أرصدة خامات الأقمشة والمخازن، ومطابقة الجودة والربحية الصناعية.'
                : 'Real-time monitoring of cutting runs, bundle tracking, fabric inventory, and quality yields.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenCreateProdOrder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Scissors className="w-4 h-4" />
              <span>{isAr ? '+ أمر قص وإنتاج جديد' : '+ New Cutting Order'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreateModel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'موديل جديد + BOM' : 'New Model'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFabricCalc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'حاسبة الـ GSM' : 'Fabric GSM'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenReceiveCustomerMat}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
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

      {/* Real Traceable KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Production Orders */}
        <Card hover className="p-4.5 border-slate-200/80 dark:border-[#2d080e] bg-white dark:bg-[#0a0204]/90 shadow-2xs hover:shadow-xl hover:border-[#7F1625]/40 transition-all rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
              {isAr ? 'أوامر التشغيل الجارية' : 'Active Production Runs'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center border border-[#7F1625]/20 font-bold">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {productionOrders.length}{' '}
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
        </Card>

        {/* Metric 2: Cutting Floor & Lays */}
        <Card hover className="p-4.5 border-t-[3px] border-t-amber-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
              {isAr ? 'أوامر صالة القص والفرش' : 'Cutting Orders & Lays'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {cuttingOrders.length}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر قص' : 'lays'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
            <div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{cuttingBundles.length}</span>{' '}
              <span>{isAr ? 'حزمة باركود مسجلة' : 'tracked bundles'}</span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
              {cuttingOrders.filter((c) => c.status === 'spreading').length} {isAr ? 'قيد الفرش' : 'spreading'}
            </span>
          </div>
        </Card>

        {/* Metric 3: Fabric Raw Inventory */}
        <Card hover className="p-4.5 border-t-[3px] border-t-blue-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
              {isAr ? 'رصيد الأقمشة بالمخازن' : 'Fabric Stock Balance'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {totalFabricMeters.toLocaleString()}{' '}
            <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'متر' : 'meters'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-sans">
            <div>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{inventoryItems.length}</span>{' '}
              <span>{isAr ? 'أصناف مسجلة' : 'items'}</span>
            </div>
            {cmtMaterialsCount > 0 && (
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                {cmtMaterialsCount} {isAr ? 'أمانات CMT' : 'CMT'}
              </span>
            )}
          </div>
        </Card>

        {/* Metric 4: Purchase & Supply Orders */}
        <Card hover className="p-4.5 border-t-[3px] border-t-emerald-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
              {isAr ? 'أوامر الشراء والتوريد' : 'Procurement Orders'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
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
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              {purchaseOrders.filter((p) => p.status === 'received').length} {isAr ? 'مستلم' : 'received'}
            </span>
          </div>
        </Card>
      </div>

      {/* Visual Production Analytics & Pipeline Cockpit (Zero Dependencies Pure SVG / CSS) */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-light)] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                {isAr ? 'مسار خطوط الإنتاج والجاهزية التشغيلية' : 'Production Pipeline & Floor Capacity'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isAr ? 'توزيع لحظي لأوامر التشغيل الجارية عبر مراحل صالة القص، الخياطة، وفحص الجودة' : 'Live distribution of active orders across cutting, sewing, and QC'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono text-[11px]">
              {productionOrders.length} {isAr ? 'أمر إجمالي' : 'total runs'}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTabChange('cutting')}
              className="text-xs"
            >
              {isAr ? 'إدارة صالة القص ←' : 'Floor View →'}
            </Button>
          </div>
        </div>

        {/* Multi-Segment Production Pipeline Bar */}
        <div className="space-y-3">
          <div className="w-full h-3.5 rounded-full bg-slate-100 dark:bg-slate-800 flex overflow-hidden p-0.5 gap-0.5 border border-slate-200 dark:border-slate-700">
            {stageStats.cutting > 0 && (
              <div
                className="h-full bg-amber-500 rounded-s-full transition-all duration-500 cursor-pointer"
                style={{ width: `${Math.max(5, stageStats.cuttingPercent)}%` }}
                title={`${isAr ? 'صالة القص' : 'Cutting'}: ${stageStats.cutting} (${stageStats.cuttingPercent}%)`}
                onClick={() => setProdStageFilter('cutting')}
              />
            )}
            {stageStats.sewing > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-500 cursor-pointer"
                style={{ width: `${Math.max(5, stageStats.sewingPercent)}%` }}
                title={`${isAr ? 'خياطة وتجميع' : 'Sewing'}: ${stageStats.sewing} (${stageStats.sewingPercent}%)`}
                onClick={() => setProdStageFilter('sewing')}
              />
            )}
            {stageStats.qc > 0 && (
              <div
                className="h-full bg-purple-500 transition-all duration-500 cursor-pointer"
                style={{ width: `${Math.max(5, stageStats.qcPercent)}%` }}
                title={`${isAr ? 'فحص الجودة' : 'QC'}: ${stageStats.qc} (${stageStats.qcPercent}%)`}
                onClick={() => setProdStageFilter('qc')}
              />
            )}
            {stageStats.completed > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-e-full transition-all duration-500 cursor-pointer"
                style={{ width: `${Math.max(5, stageStats.completedPercent)}%` }}
                title={`${isAr ? 'مكتمل' : 'Completed'}: ${stageStats.completed} (${stageStats.completedPercent}%)`}
                onClick={() => setProdStageFilter('completed')}
              />
            )}
          </div>

          {/* Legend & Interactive Stage Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <button
              onClick={() => setProdStageFilter(prodStageFilter === 'cutting' ? 'all' : 'cutting')}
              className={`p-2 rounded-xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'cutting'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-300 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {isAr ? 'صالة القص' : 'Cutting'}
                </span>
                <span className="font-mono font-bold">{stageStats.cutting}</span>
              </div>
              <span className="text-[10px] text-slate-500">{stageStats.cuttingPercent}% {isAr ? 'من الحجم' : 'of floor'}</span>
            </button>

            <button
              onClick={() => setProdStageFilter(prodStageFilter === 'sewing' ? 'all' : 'sewing')}
              className={`p-2 rounded-xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'sewing'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  {isAr ? 'خياطة وتجميع' : 'Sewing'}
                </span>
                <span className="font-mono font-bold">{stageStats.sewing}</span>
              </div>
              <span className="text-[10px] text-slate-500">{stageStats.sewingPercent}% {isAr ? 'من الحجم' : 'of floor'}</span>
            </button>

            <button
              onClick={() => setProdStageFilter(prodStageFilter === 'qc' ? 'all' : 'qc')}
              className={`p-2 rounded-xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'qc'
                  ? 'border-purple-500 bg-purple-500/10 text-purple-800 dark:text-purple-300 ring-2 ring-purple-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  {isAr ? 'فحص الجودة (QC)' : 'Quality QC'}
                </span>
                <span className="font-mono font-bold">{stageStats.qc}</span>
              </div>
              <span className="text-[10px] text-slate-500">{stageStats.qcPercent}% {isAr ? 'من الحجم' : 'of floor'}</span>
            </button>

            <button
              onClick={() => setProdStageFilter(prodStageFilter === 'completed' ? 'all' : 'completed')}
              className={`p-2 rounded-xl border text-right rtl:text-right ltr:text-left transition-all cursor-pointer ${
                prodStageFilter === 'completed'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {isAr ? 'بضاعة تامة' : 'Completed'}
                </span>
                <span className="font-mono font-bold">{stageStats.completed}</span>
              </div>
              <span className="text-[10px] text-slate-500">{stageStats.completedPercent}% {isAr ? 'من الحجم' : 'of floor'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Main Content Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 max-w-full">
        {/* Major Column (8/12): Live Orders & Fabric Ledger */}
        <div className="lg:col-span-8 space-y-6 min-w-0 max-w-full overflow-hidden">
          {/* Table 1: Live Production & Cutting Floor */}
          <Card className="p-0 overflow-hidden max-w-full">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/60">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#F87171] flex items-center justify-center shrink-0">
                    <Scissors className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate">
                      {isAr ? 'أوامر الإنتاج وصالة القص الجارية' : 'Live Production & Cutting Runs'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {isAr ? 'متابعة خطوط القص، نسب الهالك، ومراحل الخياطة' : 'Real-time monitoring of cutting lays and sewing stages'}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTabChange('cutting')}
                  className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#F87171]"
                >
                  {isAr ? 'عرض صالة القص كاملة ←' : 'Full Floor View →'}
                </Button>
              </div>

              {/* Interactive Search & Filter Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 rtl:right-2.5 rtl:left-auto ltr:left-2.5 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={prodSearch}
                    onChange={(e) => {
                      setProdSearch(e.target.value);
                      setProdCurrentPage(1);
                    }}
                    placeholder={isAr ? 'بحث برقم الأمر أو الموديل...' : 'Search by order # or model...'}
                    className="w-full text-xs py-1.5 pr-8 pl-2.5 rtl:pr-8 rtl:pl-2.5 ltr:pl-8 ltr:pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                  {prodSearch && (
                    <button
                      onClick={() => setProdSearch('')}
                      className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">{isAr ? 'المرحلة:' : 'Stage:'}</span>
                  {(['all', 'cutting', 'sewing', 'qc', 'completed'] as const).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => {
                        setProdStageFilter(stage);
                        setProdCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        prodStageFilter === stage
                          ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
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
              <table className="min-w-[620px] w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-sans border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">{isAr ? 'أمر التشغيل' : 'Order #'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'الموديل' : 'Model'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'المرحلة' : 'Stage'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'نسبة الإنجاز' : 'Progress'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'الهالك' : 'Waste'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'موعد التسليم' : 'Due'}</th>
                    <th className="py-3 px-4 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {paginatedProductionOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center">
                        <EmptyState
                          title={isAr ? 'لا توجد أوامر مطابقة لخيارات البحث' : 'No matching production orders'}
                          description={isAr ? 'يرجى تغيير شروط التصفية أو البحث عن رقم أمر آخر' : 'Try adjusting your search query or filter'}
                          icon={<Scissors className="w-8 h-8 text-slate-400" />}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedProductionOrders.map((order) => {
                      const sewPercent = order.target_quantity > 0
                        ? Math.round(((order.sewn_quantity || 0) / order.target_quantity) * 100)
                        : 0;
                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            {order.order_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{order.model_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              {order.target_quantity} {isAr ? 'قطعة' : 'pcs'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                order.status === 'sewing'
                                  ? 'info'
                                  : order.status === 'cutting'
                                  ? 'warning'
                                  : order.status === 'completed'
                                  ? 'success'
                                  : 'brand'
                              }
                              dot
                            >
                              {order.status === 'sewing'
                                ? (isAr ? 'خياطة وتجميع' : 'Sewing')
                                : order.status === 'cutting'
                                ? (isAr ? 'صالة القص' : 'Cutting')
                                : order.status === 'completed'
                                ? (isAr ? 'مكتمل' : 'Completed')
                                : (isAr ? 'فحص جودة' : 'QC')}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="w-28 sm:w-32">
                              <div className="flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                                <span>{order.sewn_quantity || 0} / {order.target_quantity}</span>
                                <span className="font-bold text-slate-900 dark:text-white">{sewPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-light)] rounded-full"
                                  style={{ width: `${sewPercent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              {order.waste_percentage}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                            {order.due_date}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <ActionsMenu
                              label={isAr ? 'إجراءات' : 'Actions'}
                              variant="outline"
                              size="sm"
                              items={[
                                {
                                  id: 'track-bundle',
                                  label: isAr ? 'الانتقال لصالة القص والفرش' : 'Go to Cutting Floor',
                                  icon: <Scissors className="w-3.5 h-3.5 text-[var(--brand-primary)]" />,
                                  onClick: () => onTabChange('cutting'),
                                },
                                {
                                  id: 'qc-stage',
                                  label: isAr ? 'فحص الجودة والمطابقة' : 'QC Inspection',
                                  icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
                                  onClick: () => onSelectProdOrderForQc(order),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalProdPages > 1 && (
              <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  {isAr ? 'عرض' : 'Showing'} {filteredProductionOrders.length} {isAr ? 'أمر' : 'orders'}
                </span>
                <Pagination
                  currentPage={prodCurrentPage}
                  totalPages={totalProdPages}
                  totalItems={filteredProductionOrders.length}
                  perPage={prodPerPage}
                  onPageChange={setProdCurrentPage}
                  isAr={isAr}
                />
              </div>
            )}
          </Card>

          {/* Table 2: Critical Fabric Stock & Allocation */}
          <Card className="p-0 overflow-hidden max-w-full">
            <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] bg-[var(--bg-muted)]/60">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTabChange('inventory')}
                  className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#F87171]"
                >
                  {isAr ? 'عرض المخزن كامل ←' : 'Full Inventory →'}
                </Button>
              </div>

              {/* Fabric Search & Custody Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 rtl:right-2.5 rtl:left-auto ltr:left-2.5 ltr:right-auto top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={fabricSearch}
                    onChange={(e) => setFabricSearch(e.target.value)}
                    placeholder={isAr ? 'بحث برمز القماش أو الاسم...' : 'Search fabric code or name...'}
                    className="w-full text-xs py-1.5 pr-8 pl-2.5 rtl:pr-8 rtl:pl-2.5 ltr:pl-8 ltr:pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                  {fabricSearch && (
                    <button
                      onClick={() => setFabricSearch('')}
                      className="absolute left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">{isAr ? 'الملكية:' : 'Custody:'}</span>
                  {(['all', 'factory', 'cmt'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFabricCustodyFilter(type)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        fabricCustodyFilter === type
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
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
              <table className="min-w-[620px] w-full text-xs text-right rtl:text-right ltr:text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-sans border-b border-slate-200/80 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-bold">{isAr ? 'كود الصنف' : 'Code'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'نوع الملكية' : 'Custody'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'المخزن' : 'Warehouse'}</th>
                    <th className="py-3 px-4 font-bold">{isAr ? 'الرصيد المتاح' : 'Available'}</th>
                    <th className="py-3 px-4 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredFabricItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center">
                        <EmptyState
                          title={isAr ? 'لا توجد أقمشة أو خامات مسجلة بالمخازن' : 'No fabric or materials cataloged'}
                          description={isAr ? 'قم بإضافة أصناف جديدة أو استلام خامات في المستودعات' : 'Add new items or receive goods into warehouses'}
                          icon={<Layers className="w-8 h-8 text-slate-400" />}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredFabricItems.slice(0, 5).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.code}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            {item.item_type === 'fabric_raw' ? (isAr ? 'خام أقمشة' : 'Raw Fabric') : (isAr ? 'مستلزمات تشغيل' : 'Accessories')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.is_customer_owned ? (
                            <Badge variant="brand" dot>
                              {isAr ? 'أمانات عميل (CMT)' : 'CMT Custody'}
                            </Badge>
                          ) : (
                            <Badge variant="neutral">
                              {isAr ? 'ملكية المصنع' : 'Factory Owned'}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                          {item.warehouse_name || (isAr ? 'المخزن الرئيسي' : 'Main Warehouse')}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          <span className="text-sm">{item.current_balance}</span>{' '}
                          <span className="text-[11px] text-slate-500 font-sans">{item.unit_of_measure}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <ActionsMenu
                            label={isAr ? 'إجراءات' : 'Actions'}
                            variant="outline"
                            size="sm"
                            items={[
                              {
                                id: 'issue-cutting',
                                label: isAr ? 'تسجيل صرف لصالة القص' : 'Issue to Cutting Lay',
                                icon: <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--brand-primary)]" />,
                                onClick: () => onSelectStockItem(item),
                              },
                              {
                                id: 'calc-gsm',
                                label: isAr ? 'حاسبة الـ GSM والأمتار' : 'GSM & Meter Calculator',
                                icon: <Calculator className="w-3.5 h-3.5 text-blue-500" />,
                                onClick: onOpenFabricCalc,
                              },
                              {
                                id: 'inv-tab',
                                label: isAr ? 'تفاصيل كارت الصنف' : 'View Item Ledger',
                                icon: <Layers className="w-3.5 h-3.5 text-slate-600" />,
                                onClick: () => onTabChange('inventory'),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Minor Column (4/12): Live Feed & Active Warehouses */}
        <div className="lg:col-span-4 space-y-6 min-w-0 max-w-full overflow-hidden">
          {/* Low Stock Warning Card if any */}
          {lowStockItems.length > 0 && (
            <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{isAr ? 'تنبيه نواقص المخزون الخطر' : 'Low Stock Reorder Alert'}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-3">
                {isAr
                  ? `يوجد ${lowStockItems.length} صنف قماش قارب على النفاد دون حد إعادة الطلب.`
                  : `${lowStockItems.length} fabric items are below minimum reorder thresholds.`}
              </p>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenCreatePo}
                  className="text-xs border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10"
                >
                  {isAr ? 'إصدار أمر شراء (PO) ←' : 'Create PO →'}
                </Button>
                <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                  {lowStockItems[0]?.code}
                </span>
              </div>
            </Card>
          )}

          {/* Widget 1: Live Floor Event Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans">
                  {isAr ? 'سجل أحداث المصنع اللحظي' : 'Live Floor Event Feed'}
                </h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {isAr ? 'مسح وتحديثات صالة الإنتاج اللحظية' : 'Real-time floor scans'}
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            </div>

            <div className="space-y-4 text-xs">
              {(() => {
                const realEvents: Array<{
                  time: string;
                  title: string;
                  desc: string;
                  badge: string;
                  badgeVariant: 'warning' | 'success' | 'brand' | 'info';
                }> = [];

                cuttingOrders.slice(0, 3).forEach((co) => {
                  realEvents.push({
                    time: co.created_at
                      ? new Date(co.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : (isAr ? 'مؤخراً' : 'Recent'),
                    title: (isAr ? 'أمر قص: ' : 'Cutting Lay: ') + co.cutting_order_number,
                    desc: (co.table_number || (isAr ? 'طاولة القص' : 'Cutting Table')) + ' • ' + (co.total_cut_pieces || co.total_expected_pieces || 0) + ' ' + (isAr ? 'قطعة' : 'pcs'),
                    badge: isAr ? 'صالة القص' : 'Cutting',
                    badgeVariant: 'warning',
                  });
                });

                productionOrders.slice(0, 3).forEach((po) => {
                  realEvents.push({
                    time: po.created_at
                      ? new Date(po.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : (isAr ? 'مؤخراً' : 'Recent'),
                    title: (isAr ? 'أمر تشغيل: ' : 'Production Run: ') + po.order_number,
                    desc: (po.model_name || (isAr ? 'موديل إنتاج' : 'Garment Model')) + ' • ' + (po.target_quantity || 0) + ' ' + (isAr ? 'قطعة' : 'pcs'),
                    badge: isAr ? 'إنتاج' : 'Production',
                    badgeVariant: 'info',
                  });
                });

                if (realEvents.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <Activity className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {isAr ? 'لا توجد حركات تشغيلية مسجلة بعد' : 'No floor events recorded yet'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {isAr ? 'ستظهر هنا سجلات أوامر القص والتشغيل فور إصدارها' : 'Cutting runs and production logs will appear here'}
                      </p>
                    </div>
                  );
                }

                return realEvents.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-900 dark:text-white font-sans truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono shrink-0">{item.time}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-sans truncate">{item.desc}</div>
                    </div>
                    <Badge variant={item.badgeVariant}>
                      {item.badge}
                    </Badge>
                  </div>
                ));
              })()}
            </div>
          </Card>

          {/* Widget 2: Factory Active Warehouses */}
          <Card className="p-5">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans">
                  {isAr ? 'مستودعات المصنع النشطة' : 'Active Warehouses'}
                </h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                  {warehouses.length} {isAr ? 'مستودعات معرفة' : 'registered nodes'}
                </span>
              </div>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-3">
              {warehouses.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">
                  {isAr ? 'المستودع الرئيسي الافتراضي' : 'Default Main Warehouse'}
                </p>
              ) : (
                warehouses.map((wh) => (
                  <div
                    key={wh.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[var(--bg-muted)]/40 hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
                    onClick={() => onTabChange('inventory')}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white font-sans truncate">
                        {wh.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{wh.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-sans">
                      <span>{((wh as any).warehouse_type || wh.type) === 'fabric_raw' ? (isAr ? 'مخزن خامات' : 'Raw Fabric') : (isAr ? 'بضاعة تامة' : 'Finished Goods')}</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {isAr ? 'نشط' : 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

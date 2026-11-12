import React, { useState, useMemo } from 'react';
import {
  Scissors,
  Layers,
  Plus,
  Calculator,
  Search,
  QrCode,
  ShieldCheck,
  Printer,
  DollarSign,
  ArrowRightLeft,
  User,
  CheckCircle2,
  Archive,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Pagination } from '../ui/Pagination';
import { ProductionPrintModal, type PrintDocumentType } from './ProductionPrintModal';
import { ArchivedCuttingDossierModal } from './ArchivedCuttingDossierModal';
import { api } from '../../api/client';
import type {
  ProductionOrder,
  CuttingOrder,
  CuttingBundle,
  QualityInspection,
} from '../../types';

export interface ProductionTabProps {
  productionOrders: ProductionOrder[];
  cuttingOrders: CuttingOrder[];
  cuttingBundles: CuttingBundle[];
  qualityInspections: QualityInspection[];
  employees?: any[];
  isAr?: boolean;
  onOpenCreateProdOrder: () => void;
  onOpenFabricCalc: () => void;
  onSelectProdOrderForCut: (order: ProductionOrder) => void;
  onSelectProdOrderForQc: (order: ProductionOrder) => void;
  onSelectBundleForTracker: (bundle: CuttingBundle) => void;
  onSelectBundleForQc: (bundle: CuttingBundle, order?: ProductionOrder) => void;
  onApproveProdOrder: (orderId: string) => Promise<void>;
  onCuttingOrderArchived?: (updatedCut: CuttingOrder) => void;
  onProductionOrderUpdated?: (updatedOrder: ProductionOrder) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const ProductionTab: React.FC<ProductionTabProps> = ({
  productionOrders = [],
  cuttingOrders = [],
  cuttingBundles = [],
  qualityInspections = [],
  employees = [],
  isAr = true,
  onOpenCreateProdOrder,
  onOpenFabricCalc,
  onSelectProdOrderForCut,
  onSelectProdOrderForQc,
  onSelectBundleForTracker,
  onSelectBundleForQc,
  onApproveProdOrder,
  onCuttingOrderArchived,
  onProductionOrderUpdated,
  onNavigateToTab,
}) => {
  // Navigation Sub-Tabs
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'cutting' | 'bundles' | 'qc' | 'archive'>('orders');

  // --- Sub-Tab 1: Production Orders State ---
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const orderPerPage = 6;

  // --- Sub-Tab 2: Cutting Orders State ---
  const [cutSearch, setCutSearch] = useState('');
  const [cutSourceFilter, setCutSourceFilter] = useState('all');
  const [cutPage, setCutPage] = useState(1);
  const cutPerPage = 6;

  // --- Sub-Tab 3: Bundles State ---
  const [bundleStageFilter, setBundleStageFilter] = useState('active');
  const [bundleSearch, setBundleSearch] = useState('');
  const [bundlePage, setBundlePage] = useState(1);
  const bundlePerPage = 9;

  // --- Sub-Tab 4: QC State ---
  const [qcSearch, setQcSearch] = useState('');
  const [qcDecisionFilter, setQcDecisionFilter] = useState('all');
  const [qcPage, setQcPage] = useState(1);
  const qcPerPage = 8;

  // --- Sub-Tab 5: Completed Cuts Archive State ---
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archivePage, setArchivePage] = useState(1);
  const archivePerPage = 6;
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [selectedArchivedCutForDossier, setSelectedArchivedCutForDossier] = useState<any>(null);
  const [isArchiving, setIsArchiving] = useState<string | null>(null);

  // --- Dedicated Single-Document Print State ---
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<PrintDocumentType>('order');
  const [printData, setPrintData] = useState<any>(null);

  const handleOpenPrint = (type: PrintDocumentType, item: any) => {
    setPrintDocType(type);
    setPrintData(item);
    setPrintModalOpen(true);
  };

  // Helper: determine if cutting order is completed / archived
  const isCuttingOrderArchived = (cut: CuttingOrder): boolean => {
    if (cut.status === 'cut_completed' || (cut.status as any) === 'completed' || (cut as any).is_archived) {
      return true;
    }
    const cutBundles = cuttingBundles.filter((b) => b.cutting_order_id === cut.id);
    if (cutBundles.length > 0 && cutBundles.every((b) => b.current_stage_code === 'completed' || b.status === 'completed')) {
      return true;
    }
    return false;
  };

  // Partition into Active and Completed/Archived Cutting Orders
  const { activeCuttingOrders, archivedCuttingOrders } = useMemo(() => {
    const active: CuttingOrder[] = [];
    const archived: CuttingOrder[] = [];

    cuttingOrders.forEach((cut) => {
      if (isCuttingOrderArchived(cut)) {
        archived.push(cut);
      } else {
        active.push(cut);
      }
    });

    return { activeCuttingOrders: active, archivedCuttingOrders: archived };
  }, [cuttingOrders, cuttingBundles]);

  // Actions for Archiving, Restoring, and Opening Dossier
  const handleArchiveCutting = async (cut: CuttingOrder) => {
    const confirmMsg = isAr
      ? `هل أنت متأكد من إنهاء وأرشفة القصة [${cut.cutting_order_number}]؟ سيتم نقلها فوراً إلى سجل "أرشيف القصات المكتملة" وتوثيق ملفها الرقمي الشامل.`
      : `Are you sure you want to finish and archive cutting run [${cut.cutting_order_number}]?`;
    if (!window.confirm(confirmMsg)) return;

    setIsArchiving(cut.id);
    try {
      let updatedCut: CuttingOrder = { ...cut, status: 'cut_completed' as const };
      try {
        const res = await api.production.archiveCuttingOrder(cut.id);
        if (res?.data) {
          updatedCut = res.data;
        }
      } catch (err) {
        console.warn('Backend archive failed, using client fallback:', err);
      }
      if (onCuttingOrderArchived) {
        onCuttingOrderArchived(updatedCut);
      }
    } finally {
      setIsArchiving(null);
    }
  };

  const handleRestoreCutting = async (cut: CuttingOrder) => {
    const confirmMsg = isAr
      ? `هل تريد إعادة فتح واستئناف القصة [${cut.cutting_order_number}] وإعادتها إلى صالة القص النشطة؟`
      : `Restore cut [${cut.cutting_order_number}] back to active cutting floor?`;
    if (!window.confirm(confirmMsg)) return;

    const restoredCut: CuttingOrder = { ...cut, status: 'spreading' as const };
    if (onCuttingOrderArchived) {
      onCuttingOrderArchived(restoredCut);
    }
  };

  const handleOpenDossier = async (cut: CuttingOrder) => {
    const relatedBundles = cuttingBundles.filter(
      (b) => b.cutting_order_id === cut.id || b.production_order_id === cut.production_order_id
    );
    const enrichedCut = {
      ...cut,
      bundles: (cut as any).bundles && (cut as any).bundles.length > 0 ? (cut as any).bundles : relatedBundles,
    };
    setSelectedArchivedCutForDossier(enrichedCut);
    setIsDossierOpen(true);

    try {
      const res = await api.production.getCuttingOrder(cut.id);
      if (res?.data) {
        setSelectedArchivedCutForDossier({
          ...res.data,
          bundles: res.data.bundles && res.data.bundles.length > 0 ? res.data.bundles : relatedBundles,
        });
      }
    } catch {
      // Fallback already set
    }
  };

  // Helper: determine if production order is complete
  const isProdOrderCompleted = (order: ProductionOrder): boolean => {
    if (order.status === 'completed') return true;
    const cutQty = Number((order as any).total_cut_quantity ?? order.cut_quantity) || 0;
    const compQty = Number((order as any).total_completed_quantity ?? order.completed_quantity ?? (order as any).qc_passed_quantity) || 0;

    if (cutQty > 0 && compQty >= cutQty) {
      const orderCuts = cuttingOrders.filter((c) => c.production_order_id === order.id);
      if (
        orderCuts.length > 0 &&
        orderCuts.every(
          (c) =>
            c.status === 'cut_completed' ||
            (c.status as any) === 'completed' ||
            isCuttingOrderArchived(c)
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const handleCompleteProdOrder = async (order: ProductionOrder) => {
    const confirmMsg = isAr
      ? `هل تريد تأكيد واعتماد إتمام أمر الإنتاج [${order.order_number}] بالكامل؟`
      : `Mark production order [${order.order_number}] as completed?`;
    if (!window.confirm(confirmMsg)) return;

    const cutQty = Number(
      (order as any).total_cut_quantity ??
      order.cut_quantity ??
      (order as any).total_planned_quantity ??
      0
    );

    if (!Number.isFinite(cutQty) || cutQty <= 0) {
      window.alert(isAr
        ? 'لا يمكن إكمال أمر الإنتاج دون كمية إنتاج فعلية مسجلة.'
        : 'Cannot complete an order without a recorded production quantity.');
      return;
    }

    try {
      await api.production.completeProductionOrder(order.id);

      const updated: ProductionOrder = {
        ...order,
        status: 'completed' as const,
        completed_quantity: cutQty,
        total_completed_quantity: cutQty,
        actual_completion_date: new Date().toISOString().split('T')[0],
      };

      onProductionOrderUpdated?.(updated);
    } catch (error: any) {
      window.alert(error?.message || (isAr
        ? 'فشل اعتماد إتمام أمر الإنتاج. لم يتم تغيير الحالة.'
        : 'Production completion failed. The order status was not changed.'));
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalOrders = productionOrders.length;
    const activeOrders = productionOrders.filter(
      (p) => p.status === 'in_progress' || p.status === 'cutting' || p.status === 'sewing' || p.status === 'approved'
    ).length;

    // Accurate cut pieces calculation
    const cutPiecesFromOrders = productionOrders.reduce(
      (sum, p) => sum + (Number((p as any).total_cut_quantity ?? p.cut_quantity) || 0),
      0
    );
    const cutPiecesFromCuts = cuttingOrders.reduce((sum, c) => sum + (Number(c.total_cut_pieces) || 0), 0);
    const totalCutPieces = Math.max(cutPiecesFromOrders, cutPiecesFromCuts);

    const totalBundles = cuttingBundles.length;
    const activeBundles = cuttingBundles.filter((b) => b.current_stage_code !== 'completed' && b.status !== 'completed').length;

    const totalFinished = productionOrders.reduce(
      (sum, p) => sum + (Number((p as any).total_completed_quantity ?? p.completed_quantity ?? p.qc_passed_quantity) || 0),
      0
    );

    const inspectedQty = qualityInspections.reduce((sum, q) => sum + (q.inspected_quantity || 0), 0);
    const passedQty = qualityInspections.reduce((sum, q) => sum + (q.passed_quantity || 0), 0);
    const passRate = inspectedQty > 0 ? Math.round((passedQty / inspectedQty) * 100) : 100;

    return {
      totalOrders,
      activeOrders,
      totalCutPieces,
      totalBundles,
      activeBundles,
      totalFinished,
      passRate,
    };
  }, [productionOrders, cuttingOrders, cuttingBundles, qualityInspections]);

  // Filtered Production Orders
  const filteredOrders = useMemo(() => {
    return productionOrders.filter((order) => {
      const isComplete = isProdOrderCompleted(order);
      if (orderStatusFilter !== 'all') {
        if (orderStatusFilter === 'completed') {
          if (!isComplete) return false;
        } else if (orderStatusFilter === 'in_progress') {
          if (isComplete) return false;
          if (order.status !== 'in_progress' && order.status !== 'sewing' && order.status !== 'cutting') return false;
        } else if (orderStatusFilter !== 'in_progress' && order.status !== orderStatusFilter) {
          return false;
        }
      }
      if (orderSearch) {
        const q = orderSearch.toLowerCase();
        const matchNum = order.order_number?.toLowerCase().includes(q);
        const matchModel = order.model_name?.toLowerCase().includes(q);
        const matchCode = order.model_code?.toLowerCase().includes(q);
        if (!matchNum && !matchModel && !matchCode) return false;
      }
      return true;
    });
  }, [productionOrders, orderStatusFilter, orderSearch, cuttingOrders, cuttingBundles]);

  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / orderPerPage));
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * orderPerPage, orderPage * orderPerPage);

  // Filtered Active Cutting Orders
  const filteredCuttingOrders = useMemo(() => {
    return activeCuttingOrders.filter((cut) => {
      if (cutSourceFilter !== 'all' && cut.fabric_source !== cutSourceFilter) return false;
      if (cutSearch) {
        const q = cutSearch.toLowerCase();
        const matchCutNum = cut.cutting_order_number?.toLowerCase().includes(q);
        const matchProdNum = cut.production_order_number?.toLowerCase().includes(q);
        const matchCutter = (cut.assigned_cutter_name || '').toLowerCase().includes(q);
        const matchFabric = (cut.fabric_name || '').toLowerCase().includes(q);
        if (!matchCutNum && !matchProdNum && !matchCutter && !matchFabric) return false;
      }
      return true;
    });
  }, [activeCuttingOrders, cutSourceFilter, cutSearch]);

  const totalCutPages = Math.max(1, Math.ceil(filteredCuttingOrders.length / cutPerPage));
  const paginatedCuttingOrders = filteredCuttingOrders.slice((cutPage - 1) * cutPerPage, cutPage * cutPerPage);

  // Filtered Archived Cutting Orders
  const filteredArchivedCuttingOrders = useMemo(() => {
    return archivedCuttingOrders.filter((cut) => {
      if (archiveSearch) {
        const q = archiveSearch.toLowerCase();
        const matchCutNum = cut.cutting_order_number?.toLowerCase().includes(q);
        const matchProdNum = cut.production_order_number?.toLowerCase().includes(q);
        const matchCutter = (cut.assigned_cutter_name || '').toLowerCase().includes(q);
        const matchFabric = (cut.fabric_name || '').toLowerCase().includes(q);
        const matchModel = ((cut as any).productionOrder?.garmentModel?.name || '').toLowerCase().includes(q);
        if (!matchCutNum && !matchProdNum && !matchCutter && !matchFabric && !matchModel) return false;
      }
      return true;
    });
  }, [archivedCuttingOrders, archiveSearch]);

  const totalArchivePages = Math.max(1, Math.ceil(filteredArchivedCuttingOrders.length / archivePerPage));
  const paginatedArchivedCuttingOrders = filteredArchivedCuttingOrders.slice(
    (archivePage - 1) * archivePerPage,
    archivePage * archivePerPage
  );

  // Filtered Bundles
  const filteredBundles = useMemo(() => {
    return cuttingBundles.filter((b) => {
      if (bundleStageFilter === 'active') {
        if (b.current_stage_code === 'completed' || b.status === 'completed') return false;
      } else if (bundleStageFilter !== 'all') {
        if (b.current_stage_code !== bundleStageFilter) return false;
      }
      if (bundleSearch) {
        const q = bundleSearch.toLowerCase();
        const matchCode = b.bundle_code?.toLowerCase().includes(q);
        const matchWorker = (b.assigned_employee_name || '').toLowerCase().includes(q);
        const matchColor = (b.color_name || '').toLowerCase().includes(q);
        const matchSize = (b.size_name || '').toLowerCase().includes(q);
        if (!matchCode && !matchWorker && !matchColor && !matchSize) return false;
      }
      return true;
    });
  }, [cuttingBundles, bundleStageFilter, bundleSearch]);

  const totalBundlePages = Math.max(1, Math.ceil(filteredBundles.length / bundlePerPage));
  const paginatedBundles = filteredBundles.slice((bundlePage - 1) * bundlePerPage, bundlePage * bundlePerPage);

  // Filtered QC Reports
  const filteredQC = useMemo(() => {
    return qualityInspections.filter((qc) => {
      if (qcDecisionFilter !== 'all' && qc.decision !== qcDecisionFilter) return false;
      if (qcSearch) {
        const q = qcSearch.toLowerCase();
        const matchNum = qc.inspection_number?.toLowerCase().includes(q);
        const matchProd = qc.production_order_number?.toLowerCase().includes(q);
        const matchInspector = qc.inspector_name?.toLowerCase().includes(q);
        if (!matchNum && !matchProd && !matchInspector) return false;
      }
      return true;
    });
  }, [qualityInspections, qcDecisionFilter, qcSearch]);

  const totalQcPages = Math.max(1, Math.ceil(filteredQC.length / qcPerPage));
  const paginatedQC = filteredQC.slice((qcPage - 1) * qcPerPage, qcPage * qcPerPage);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
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
                {isAr ? 'صالة القص وخطوط التشغيل المباشرة' : 'Cutting Floor & Shopfloor Live'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <QrCode className="w-3.5 h-3.5 text-amber-400" />
                {isAr ? 'متابعة الحزم بأكواد التعريف' : 'Bundle ID Tracking'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Scissors className="w-7 h-7 text-[#E05265] shrink-0" />
              <span>{isAr ? 'صالة القص وخطوط التشغيل وبطاقات الحزم' : 'Cutting Floor & Shopfloor Production'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'متابعة أوامر التشغيل المعتمدة، خطط الفرش والطبقات (Lay Planning)، بطاقات الحزم الذكية بالباركود، وتدقيق الجودة (QC) وتسليم المنتج التام للمخازن.'
                : 'Cutting orders, lay planning, QR bundle tracking across shopfloor stages, and quality inspection.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenCreateProdOrder}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'أمر إنتاج وتشغيل جديد' : 'New Production Order'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenFabricCalc}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'حاسبة أطوال الفرش والـ GSM' : 'Lay Calculator'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento-Grid Elevated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Production Orders */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] p-4.5 transition-all duration-200 hover:shadow-xl hover:border-[#7F1625]/40 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'أوامر الإنتاج النشطة' : 'Active Orders'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold border border-[#7F1625]/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {stats.totalOrders}
            </span>
            <span className="text-xs text-slate-400 font-sans">{isAr ? 'أمر إجمالي' : 'total'}</span>
          </div>
          <div className="mt-2 text-xs text-[#7F1625] dark:text-[#ff8ba0] font-medium flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#7F1625] animate-pulse" />
            <span>{stats.activeOrders} {isAr ? 'قيد التشغيل بالورشة' : 'in progress'}</span>
          </div>
        </div>

        {/* Card 2: Pieces Cut */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] p-4.5 transition-all duration-200 hover:shadow-xl hover:border-sky-500/40 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'القطع المقصوصة بصالة القص' : 'Pieces Cut'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-500/20 font-bold">
              <Scissors className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
              {stats.totalCutPieces.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-sans">{isAr ? 'قطعة مقصوصة' : 'pcs cut'}</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span>{isAr ? `عبر ${cuttingOrders.length} أوامر فرش وقص` : `across ${cuttingOrders.length} lay cuts`}</span>
          </div>
        </div>

        {/* Card 3: Active Bundles */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] p-4.5 transition-all duration-200 hover:shadow-xl hover:border-purple-500/40 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'حزم التشغيل النشطة بالباركود' : 'Active QR Bundles'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20 font-bold">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {stats.totalBundles}
            </span>
            <span className="text-xs text-slate-400 font-sans">{isAr ? 'حزمة تشغيل' : 'bundles'}</span>
          </div>
          <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>{stats.activeBundles} {isAr ? 'قيد حركة الخطوط' : 'active on floor'}</span>
          </div>
        </div>

        {/* Card 4: Quality & Finished */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] p-4.5 transition-all duration-200 hover:shadow-xl hover:border-emerald-500/40 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isAr ? 'المنتج التام المجاز والمرحل' : 'Passed QC Stock'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {stats.totalFinished.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-sans">{isAr ? 'قطعة مجازة' : 'pcs finished'}</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{stats.passRate}% {isAr ? 'نسبة الجودة والمطابقة' : 'pass rate'}</span>
          </div>
        </div>
      </div>

      {/* 3. Luxury Segmented Pill Tab Bar */}
      <div className="p-1.5 bg-slate-100 dark:bg-[#0a0204] rounded-2xl border border-slate-200/80 dark:border-[#2d080e] flex items-center gap-1 overflow-x-auto shadow-inner text-xs font-bold">
        {[
          {
            id: 'orders',
            label: isAr ? 'أوامر الإنتاج والتشغيل' : 'Production Orders',
            icon: Layers,
            count: productionOrders.length,
          },
          {
            id: 'cutting',
            label: isAr ? 'صالة القص وخطط الفرش' : 'Lay & Cutting Orders',
            icon: Scissors,
            count: activeCuttingOrders.length,
          },
          {
            id: 'bundles',
            label: isAr ? 'بطاقات الحزم وتتبع الخط' : 'Bundle Floor Tracker',
            icon: QrCode,
            count: stats.activeBundles,
          },
          {
            id: 'qc',
            label: isAr ? 'فحص ومراقبة الجودة' : 'Quality Control (QC)',
            icon: ShieldCheck,
            count: qualityInspections.length,
          },
          {
            id: 'archive',
            label: isAr ? 'أرشيف القصات المكتملة' : 'Completed Cuts Archive',
            icon: Archive,
            count: archivedCuttingOrders.length,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* SUB-TAB 1: PRODUCTION ORDERS */}
      {/* ============================================================== */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          {/* Controls Bar: Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {[
                { id: 'all', label: isAr ? 'كل الحالات' : 'All Status' },
                { id: 'in_progress', label: isAr ? 'قيد التشغيل' : 'In Progress' },
                { id: 'approved', label: isAr ? 'جاهز للقص' : 'Ready to Cut' },
                { id: 'draft', label: isAr ? 'مسودات' : 'Drafts' },
                { id: 'completed', label: isAr ? 'مكتمل' : 'Completed' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setOrderStatusFilter(pill.id);
                    setOrderPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                    orderStatusFilter === pill.id
                      ? 'bg-[#7F1625] text-white font-bold shadow-xs'
                      : 'bg-slate-100 dark:bg-[#180608] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#22070c]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم الأمر، الموديل، الكود...' : 'Search order #, model, code...'}
                value={orderSearch}
                onChange={(e) => {
                  setOrderSearch(e.target.value);
                  setOrderPage(1);
                }}
                className={`bg-slate-50 dark:bg-[#120406] border border-slate-200 dark:border-[#2d080e] rounded-xl ${
                  isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full sm:w-64 focus:outline-none focus:border-[#7F1625] focus:ring-1 focus:ring-[#7F1625]/30`}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                    <th className="py-3 px-4">{isAr ? 'الموديل والنوع' : 'Model & SKU'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المخطط' : 'Target'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المقصوص' : 'Cut'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المنجز التام' : 'Finished'}</th>
                    <th className="py-3 px-4">{isAr ? 'نسبة الإنجاز' : 'Progress'}</th>
                    <th className="py-3 px-4">{isAr ? 'موعد التسليم' : 'Due Date'}</th>
                    <th className="py-3 px-4">{isAr ? 'الأولوية' : 'Priority'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedOrders.map((order) => {
                    const targetQty = Number(
                      (order as any).total_planned_quantity ??
                      order.planned_quantity ??
                      order.target_quantity ??
                      0
                    );
                    const cutQtyFromOrder = Number(
                      (order as any).total_cut_quantity ??
                      order.cut_quantity ??
                      0
                    );
                    const cutQtyFromCuts = cuttingOrders
                      .filter((c) => c.production_order_id === order.id)
                      .reduce((sum, c) => sum + (Number(c.total_cut_pieces) || 0), 0);
                    const cutQty = Math.max(cutQtyFromOrder, cutQtyFromCuts);
                    const isOrderComplete = isProdOrderCompleted(order);
                    const finishedQty = isOrderComplete
                      ? Math.max(Number((order as any).total_completed_quantity ?? order.completed_quantity ?? 0), cutQty)
                      : Number(
                          (order as any).total_completed_quantity ??
                          order.completed_quantity ??
                          order.qc_passed_quantity ??
                          0
                        );
                    const safeTarget = targetQty > 0 ? targetQty : 1;
                    const cutPct = isOrderComplete ? 100 : (targetQty > 0 ? Math.min(100, Math.round((cutQty / safeTarget) * 100)) : 0);
                    const finishPct = isOrderComplete ? 100 : (targetQty > 0 ? Math.min(100, Math.round((finishedQty / safeTarget) * 100)) : 0);

                    const rawDue = order.target_delivery_date || order.due_date || (order as any).delivery_date;
                    const cleanDue = rawDue ? String(rawDue).split('T')[0].split(' ')[0] : '—';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0]">
                          {order.order_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{order.model_name || '—'}</div>
                          <span className="text-[10px] text-slate-400 font-mono">[{order.model_code || 'MOD'}]</span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {targetQty.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-sky-600 dark:text-sky-400">
                          {cutQty.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {finishedQty.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 min-w-[130px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-mono">
                              <span className={isOrderComplete ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                                {finishPct}% {isOrderComplete && (isAr ? '(مكتمل)' : '(Done)')}
                              </span>
                              <span className="text-slate-400">{isAr ? 'المقصوص:' : 'Cut:'} {cutPct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden flex">
                              <div
                                className="bg-emerald-500 h-full transition-all"
                                style={{ width: `${finishPct}%` }}
                                title={`${finishPct}% finished`}
                              />
                              <div
                                className="bg-sky-400 h-full transition-all opacity-60"
                                style={{ width: `${Math.max(0, cutPct - finishPct)}%` }}
                                title={`${cutPct}% cut`}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                          {cleanDue}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              order.priority === 'urgent'
                                ? 'danger'
                                : order.priority === 'high'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {order.priority === 'urgent'
                              ? isAr ? 'عاجل جداً' : 'Urgent'
                              : order.priority === 'high'
                              ? isAr ? 'مرتفع' : 'High'
                              : isAr ? 'عادي' : 'Normal'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              isOrderComplete
                                ? 'success'
                                : order.status === 'in_progress' || order.status === 'sewing'
                                ? 'info'
                                : order.status === 'approved' || order.status === 'cutting'
                                ? 'purple'
                                : 'neutral'
                            }
                            dot={!isOrderComplete && (order.status === 'in_progress' || order.status === 'approved')}
                          >
                            {isOrderComplete
                              ? isAr ? 'مكتمل ومؤرشف' : 'Completed'
                              : order.status === 'in_progress' || order.status === 'sewing'
                              ? isAr ? 'قيد التشغيل' : 'In Progress'
                              : order.status === 'approved'
                              ? isAr ? 'معتمد للقص' : 'Approved'
                              : order.status === 'cutting'
                              ? isAr ? 'صالة القص' : 'Cutting'
                              : isAr ? 'مسودة' : 'Draft'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-center">
                            {order.status === 'draft' && (
                              <button
                                type="button"
                                title={isAr ? 'اعتماد أمر الإنتاج' : 'Approve Order'}
                                onClick={() => onApproveProdOrder(order.id)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {!isOrderComplete && (
                              <button
                                type="button"
                                title={isAr ? 'إنهاء واعتماد اكتمال أمر الإنتاج بالكامل' : 'Mark Production Order Completed'}
                                onClick={() => handleCompleteProdOrder(order)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {isOrderComplete && (
                              <button
                                type="button"
                                title={isAr ? 'عرض ملف القصة المؤرشفة' : 'View Archived Cut Dossier'}
                                onClick={() => {
                                  const cut = cuttingOrders.find((c) => c.production_order_id === order.id);
                                  if (cut) handleOpenDossier(cut);
                                }}
                                className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              type="button"
                              title={isAr ? 'إصدار أمر قص وفرش' : 'Issue Lay & Cut Order'}
                              onClick={() => onSelectProdOrderForCut(order)}
                              className="p-1.5 rounded-lg text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <Scissors className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'تتبع بطاقات الحزم بالباركود' : 'Track QR Bundles'}
                              onClick={() => {
                                const b = cuttingBundles.find((cb) => cb.production_order_id === order.id) || cuttingBundles[0];
                                if (b) onSelectBundleForTracker(b);
                              }}
                              className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'فحص الجودة والمطابقة (QC)' : 'Quality Inspection'}
                              onClick={() => onSelectProdOrderForQc(order)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'حساب تكاليف أمر التشغيل' : 'Job Costing'}
                              onClick={() => onNavigateToTab && onNavigateToTab('costing')}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'طباعة تذكرة أمر التشغيل' : 'Print Job Ticket'}
                              onClick={() => handleOpenPrint('order', order)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedOrders.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                        {isAr ? 'لا توجد أوامر إنتاج مطابقة لمعايير البحث.' : 'No production orders found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <Pagination
                currentPage={orderPage}
                totalPages={totalOrderPages}
                totalItems={filteredOrders.length}
                perPage={orderPerPage}
                onPageChange={setOrderPage}
                isAr={isAr}
                alwaysShow={true}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 2: CUTTING ORDERS (LAY & PLIES) */}
      {/* ============================================================== */}
      {activeSubTab === 'cutting' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {[
                { id: 'all', label: isAr ? 'كل المصادر' : 'All Sources' },
                { id: 'factory_owned', label: isAr ? 'خامات المصنع' : 'Factory Owned' },
                { id: 'customer_supplied', label: isAr ? 'أمانات عملاء CMT' : 'CMT Customer Material' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setCutSourceFilter(pill.id);
                    setCutPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    cutSourceFilter === pill.id
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم الإذن، أمر الإنتاج، المقصدار...' : 'Search cut order #, PO, cutter...'}
                value={cutSearch}
                onChange={(e) => {
                  setCutSearch(e.target.value);
                  setCutPage(1);
                }}
                className={`bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl ${
                  isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full sm:w-64 focus:outline-none focus:border-sky-500`}
              />
            </div>
          </div>

          {/* Cutting Orders Table */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم إذن القص' : 'Cut Order #'}</th>
                    <th className="py-3 px-4">{isAr ? 'أمر الإنتاج' : 'PO #'}</th>
                    <th className="py-3 px-4">{isAr ? 'الطاولة' : 'Table'}</th>
                    <th className="py-3 px-4">{isAr ? 'المقصدار الفني' : 'Master Cutter'}</th>
                    <th className="py-3 px-4">{isAr ? 'الخامة ومصدرها' : 'Fabric & Source'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'طول الفرشة' : 'Lay Length'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الراقات' : 'Plies'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المستهلك' : 'Fabric Used'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'القطع الناتجة' : 'Yield'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedCuttingOrders.map((cut) => {
                    const cutterEmp = cut.assigned_cutter_id ? employees.find(e => e.id === cut.assigned_cutter_id) : null;
                    const cutterName = cut.assigned_cutter_name || (cut as any).assignedCutter?.name || cutterEmp?.name;

                    return (
                      <tr key={cut.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {cut.cutting_order_number}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-[#7F1625] dark:text-[#ff8ba0]">
                          {cut.production_order_number || '—'}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">
                          {cut.table_number || 'Table 1'}
                        </td>
                        <td className="py-3 px-4">
                          {cutterName ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                              <div className="w-5 h-5 rounded-md bg-[#7F1625]/10 dark:bg-[#7F1625]/25 text-[#7F1625] dark:text-[#ff8ba0] text-[10px] flex items-center justify-center font-bold">
                                {cutterName.trim().charAt(0)}
                              </div>
                              <span className="font-medium truncate max-w-[120px]">{cutterName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">{isAr ? 'غير معيّن' : 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{cut.fabric_name || (isAr ? 'قماش التشغيل' : 'Fabric')}</div>
                          <Badge
                            variant={cut.fabric_source === 'customer_deposit' ? 'purple' : 'info'}
                            className="mt-0.5 text-[9px]"
                          >
                            {cut.fabric_source === 'customer_deposit'
                              ? isAr ? 'أمانة عميل CMT' : 'CMT Custody'
                              : isAr ? 'خامات المصنع' : 'Factory Owned'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                          {cut.lay_length_meters} {isAr ? 'م' : 'm'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {cut.layers_count} {isAr ? 'راقة' : 'plies'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {cut.actual_fabric_meters_used} {isAr ? 'م' : 'm'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {cut.total_cut_pieces} {isAr ? 'قطعة' : 'pcs'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="success" dot>
                            {isAr ? 'تم القص وتوليد الحزم' : 'Cut & Generated'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-center">
                            <button
                              type="button"
                              title={isAr ? 'تتبع بطاقات الحزم بالباركود' : 'Track QR Bundles'}
                              onClick={() => {
                                const b = cuttingBundles.find((cb) => cb.cutting_order_id === cut.id) || cuttingBundles[0];
                                if (b) onSelectBundleForTracker(b);
                              }}
                              className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'فحص الجودة والمطابقة (QC)' : 'Quality Inspection'}
                              onClick={() => {
                                const prod = productionOrders.find((p) => p.id === cut.production_order_id);
                                if (prod) onSelectProdOrderForQc(prod);
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'عرض أمر الإنتاج المرتبط' : 'View Linked PO'}
                              onClick={() => {
                                setActiveSubTab('orders');
                                setOrderSearch(cut.production_order_number || '');
                              }}
                              className="p-1.5 rounded-lg text-[#7F1625] hover:text-[#961b2c] hover:bg-[#7F1625]/10 dark:text-[#ff8ba0] dark:hover:bg-[#7F1625]/25 border border-[#7F1625]/30 transition-all cursor-pointer shadow-2xs"
                            >
                              <Layers className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'إنهاء وأرشفة القصة ونقلها للأرشيف الرقمي الشامل' : 'Archive Cut Run'}
                              onClick={() => handleArchiveCutting(cut)}
                              disabled={isArchiving === cut.id}
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                            >
                              <Archive className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              title={isAr ? 'طباعة كارت وإذن طاولة القص' : 'Print Cutting Ticket'}
                              onClick={() => handleOpenPrint('cutting', cut)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedCuttingOrders.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400 text-xs">
                        {isAr ? 'لا توجد أوامر قص وفرش مسجلة مطابقة لمعايير البحث.' : 'No cutting orders found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredCuttingOrders.length > 0 && (
              <Pagination
                currentPage={cutPage}
                totalPages={totalCutPages}
                totalItems={filteredCuttingOrders.length}
                perPage={cutPerPage}
                onPageChange={setCutPage}
                isAr={isAr}
                alwaysShow={true}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 3: BUNDLE FLOOR TRACKER */}
      {/* ============================================================== */}
      {activeSubTab === 'bundles' && (
        <div className="space-y-4">
          {/* Stage Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Stage Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {[
                { id: 'active', label: isAr ? `النشطة بالخطوط (${stats.activeBundles})` : `Active (${stats.activeBundles})` },
                { id: 'all', label: isAr ? `كل الحزم (${cuttingBundles.length})` : `All (${cuttingBundles.length})` },
                { id: 'cutting', label: isAr ? 'صالة القص' : 'Cutting' },
                { id: 'assembly', label: isAr ? 'التجهيز' : 'Assembly' },
                { id: 'sewing', label: isAr ? 'الخياطة' : 'Sewing' },
                { id: 'finishing', label: isAr ? 'التشطيب' : 'Finishing' },
                { id: 'ironing', label: isAr ? 'الكي' : 'Ironing' },
                { id: 'packing', label: isAr ? 'التعبئة' : 'Packing' },
                { id: 'completed', label: isAr ? 'المكتملة' : 'Completed' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setBundleStageFilter(pill.id);
                    setBundlePage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    bundleStageFilter === pill.id
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث بكود الحزمة، العامل، اللون، المقاس...' : 'Search bundle, worker, color, size...'}
                value={bundleSearch}
                onChange={(e) => {
                  setBundleSearch(e.target.value);
                  setBundlePage(1);
                }}
                className={`bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl ${
                  isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full sm:w-64 focus:outline-none focus:border-purple-500`}
              />
            </div>
          </div>

          {/* Bundles Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {paginatedBundles.map((bnd) => (
              <div
                key={bnd.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3 transition-all duration-200 hover:shadow-md hover:border-purple-500/40"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <span>{bnd.bundle_code}</span>
                  </div>
                  <Badge variant="neutral" className="font-mono text-[10px]">
                    {isAr ? `حزمة #${bnd.bundle_number}` : `Bundle #${bnd.bundle_number}`}
                  </Badge>
                </div>

                {/* Specs Pills */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'اللون' : 'Color'}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold">{bnd.color_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'المقاس' : 'Size'}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold font-mono">{bnd.size_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'الكمية' : 'Quantity'}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                      {bnd.quantity} {isAr ? 'ق' : 'pcs'}
                    </span>
                  </div>
                </div>

                {/* Worker Assignment Strip */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <User className="w-3.5 h-3.5 text-[#7F1625] dark:text-[#ff8ba0] shrink-0" />
                    <span className="text-slate-400 text-[10px] shrink-0">{isAr ? 'المسؤول:' : 'Worker:'}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {bnd.assigned_employee_name || (isAr ? 'لم يُعيّن بعد' : 'Unassigned')}
                    </span>
                  </div>
                  {bnd.work_group && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      [{bnd.work_group}]
                    </span>
                  )}
                </div>

                {/* Card Footer: Stage Badge & Fast Action Buttons */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-xs gap-1">
                  <Badge
                    variant={
                      bnd.current_stage_code === 'completed'
                        ? 'success'
                        : bnd.current_stage_code === 'sewing'
                        ? 'info'
                        : bnd.current_stage_code === 'finishing' || bnd.current_stage_code === 'ironing'
                        ? 'purple'
                        : 'warning'
                    }
                    dot
                  >
                    {bnd.current_stage_code === 'cutting'
                      ? isAr ? 'صالة القص' : 'Cutting'
                      : bnd.current_stage_code === 'assembly'
                      ? isAr ? 'التجميع' : 'Assembly'
                      : bnd.current_stage_code === 'sewing'
                      ? isAr ? 'الخياطة' : 'Sewing'
                      : bnd.current_stage_code === 'finishing'
                      ? isAr ? 'التشطيب' : 'Finishing'
                      : bnd.current_stage_code === 'ironing'
                      ? isAr ? 'الكي' : 'Ironing'
                      : bnd.current_stage_code === 'packing'
                      ? isAr ? 'التعبئة' : 'Packing'
                      : isAr ? 'مكتمل' : 'Completed'}
                  </Badge>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={isAr ? 'تسليم ونقل المرحلة وقيد أجر العامل' : 'Transfer Stage & Record Piece Wage'}
                      onClick={() => onSelectBundleForTracker(bnd)}
                      className="p-1.5 rounded-lg text-[#7F1625] hover:text-[#961b2c] hover:bg-[#7F1625]/10 dark:text-[#ff8ba0] dark:hover:bg-[#7F1625]/25 border border-[#7F1625]/30 transition-all cursor-pointer shadow-2xs"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      title={isAr ? 'فحص الجودة والمطابقة (QC)' : 'Quality Inspection'}
                      onClick={() => {
                        const prod = productionOrders.find((p) => p.id === bnd.production_order_id);
                        onSelectBundleForQc(bnd, prod);
                      }}
                      className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                    >
                      <ShieldCheck className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      title={isAr ? 'طباعة باركود وتكت الحزمة' : 'Print Bundle Sticker'}
                      onClick={() => handleOpenPrint('bundle', bnd)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      title={isAr ? 'عرض بطاقة الحزمة كاملة' : 'View Bundle Card'}
                      onClick={() => onSelectBundleForTracker(bnd)}
                      className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200 dark:border-purple-800 transition-all cursor-pointer shadow-2xs"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {paginatedBundles.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                {isAr ? 'لا توجد حزم تشغيل مطابقة لمعايير البحث في هذه المرحلة.' : 'No bundles found.'}
              </div>
            )}
          </div>

          {/* Pagination */}
          {filteredBundles.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <Pagination
                currentPage={bundlePage}
                totalPages={totalBundlePages}
                totalItems={filteredBundles.length}
                perPage={bundlePerPage}
                onPageChange={setBundlePage}
                isAr={isAr}
                alwaysShow={true}
              />
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 4: QUALITY CONTROL HUB */}
      {/* ============================================================== */}
      {activeSubTab === 'qc' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0">
              {[
                { id: 'all', label: isAr ? 'كل التقارير' : 'All Reports' },
                { id: 'passed', label: isAr ? 'مجاز ومطابق' : 'Passed' },
                { id: 'rework_required', label: isAr ? 'إعادة تشغيل' : 'Rework' },
                { id: 'rejected', label: isAr ? 'مرفوض وهالك' : 'Rejected' },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => {
                    setQcDecisionFilter(pill.id);
                    setQcPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    qcDecisionFilter === pill.id
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم التقرير، أمر الإنتاج، المفتش...' : 'Search QC report, PO, inspector...'}
                value={qcSearch}
                onChange={(e) => {
                  setQcSearch(e.target.value);
                  setQcPage(1);
                }}
                className={`bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl ${
                  isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full sm:w-64 focus:outline-none focus:border-emerald-500`}
              />
            </div>
          </div>

          {/* QC Reports Table */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم تقرير الفحص' : 'Report #'}</th>
                    <th className="py-3 px-4">{isAr ? 'أمر الإنتاج' : 'PO #'}</th>
                    <th className="py-3 px-4">{isAr ? 'مفتش الجودة' : 'Inspector'}</th>
                    <th className="py-3 px-4">{isAr ? 'نوع ونقطة الفحص' : 'Inspection Type'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المفحوص' : 'Inspected'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المقبول' : 'Passed'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'إعادة تشغيل' : 'Rework'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المرفوض' : 'Scrap'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'القرار والاعتماد' : 'Decision'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedQC.map((qc) => (
                    <tr key={qc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {qc.inspection_number}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#7F1625] dark:text-[#ff8ba0]">
                        {qc.production_order_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {qc.inspector_name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {qc.inspection_type === 'final_audit'
                          ? isAr ? 'فحص نهائي وترحيل للمخزن' : 'Final Audit'
                          : qc.inspection_type === 'inline'
                          ? isAr ? 'فحص مرحلي بالخط' : 'Inline Audit'
                          : isAr ? 'فحص نهاية الخط' : 'End of Line'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                        {qc.inspected_quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {qc.passed_quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                        {qc.rework_quantity}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-red-600 dark:text-red-400">
                        {qc.rejected_quantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            qc.decision === 'passed'
                              ? 'success'
                              : qc.decision === 'rework_required'
                              ? 'warning'
                              : 'danger'
                          }
                          dot
                        >
                          {qc.decision === 'passed'
                            ? isAr ? 'مطابق ومجاز' : 'Passed & Approved'
                            : qc.decision === 'rework_required'
                            ? isAr ? 'إعادة تشغيل' : 'Rework'
                            : isAr ? 'مرفوض وهالك' : 'Rejected'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            type="button"
                            title={isAr ? 'طباعة شهادة وتقرير الفحص' : 'Print QC Certificate'}
                            onClick={() => handleOpenPrint('qc', qc)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title={isAr ? 'عرض أمر الإنتاج المرتبط' : 'View Linked PO'}
                            onClick={() => {
                              setActiveSubTab('orders');
                              setOrderSearch(qc.production_order_number || '');
                            }}
                            className="p-1.5 rounded-lg text-[#7F1625] hover:text-[#961b2c] hover:bg-[#7F1625]/10 dark:text-[#ff8ba0] dark:hover:bg-[#7F1625]/25 border border-[#7F1625]/30 transition-all cursor-pointer shadow-2xs"
                          >
                            <Layers className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title={isAr ? 'إجراء فحص جودة جديد' : 'New QC Inspection'}
                            onClick={() => {
                              const prod = productionOrders.find((p) => p.order_number === qc.production_order_number);
                              if (prod) onSelectProdOrderForQc(prod);
                            }}
                            className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginatedQC.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                        {isAr ? 'لا توجد تقارير فحص جودة مطابقة للبحث.' : 'No QC reports found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredQC.length > 0 && (
              <Pagination
                currentPage={qcPage}
                totalPages={totalQcPages}
                totalItems={filteredQC.length}
                perPage={qcPerPage}
                onPageChange={setQcPage}
                isAr={isAr}
                alwaysShow={true}
              />
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-TAB 5: COMPLETED CUTS ARCHIVE (FULL DIGITAL DOSSIERS) */}
      {/* ============================================================== */}
      {activeSubTab === 'archive' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#000000] via-[#150407] to-[#000000] border border-[#7F1625]/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#7F1625]/30 border border-[#7F1625]/50 flex items-center justify-center text-[#ff8ba0]">
                  <Archive className="w-4 h-4" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-white">
                  {isAr ? 'أرشيف القصات المكتملة والملف الرقمي الشامل' : 'Completed Cuts Archive & Full Digital Dossiers'}
                </h2>
                <Badge variant="purple" className="text-[10px] bg-[#7F1625]/40 text-[#ff8ba0] border-[#7F1625]">
                  {archivedCuttingOrders.length} {isAr ? 'قصة مؤرشفة' : 'archived'}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {isAr
                  ? 'السجل الرقمي الدائم لكافة أوامر القص المكتملة بورشة التصنيع. يتيح لك استعراض واستدعاء الملف الفني الكامل لأي قصة سابقة: الأقمشة المستخدمة بالأمتار، والكميات المقصوصة، وسجل جميع العمال والفنيين الذين اشتغلوا عليها واستحقاقات أجورهم، وزمن التشغيل الفعلي.'
                  : 'Historical digital dossier for finished cutting runs. Track fabrics used, output pieces, all operators involved, stage wages, and duration.'}
              </p>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 shrink-0">
              <div className="text-center px-2">
                <span className="block text-[10px] text-slate-400 font-semibold">{isAr ? 'إجمالي القطع المؤرشفة' : 'Total Pieces'}</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  {archivedCuttingOrders.reduce((sum, c) => sum + (Number(c.total_cut_pieces) || 0), 0).toLocaleString()}
                </span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center px-2">
                <span className="block text-[10px] text-slate-400 font-semibold">{isAr ? 'الأقمشة المستهلكة' : 'Meters Consumed'}</span>
                <span className="text-base font-black font-mono text-amber-400">
                  {archivedCuttingOrders.reduce((sum, c) => sum + (Number(c.actual_fabric_meters_used) || 0), 0).toLocaleString()} {isAr ? 'م' : 'm'}
                </span>
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Archive className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
              <span>{isAr ? 'قائمة سجلات القصات المؤرشفة' : 'Archived Cutting Orders List'}</span>
              <span className="text-slate-400 font-normal">({filteredArchivedCuttingOrders.length} {isAr ? 'سجل' : 'records'})</span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
              <input
                type="text"
                placeholder={isAr ? 'بحث برقم القصة، أمر الإنتاج، المقصدار، الخامة...' : 'Search cut #, PO, cutter, fabric...'}
                value={archiveSearch}
                onChange={(e) => {
                  setArchiveSearch(e.target.value);
                  setArchivePage(1);
                }}
                className={`bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl ${
                  isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'
                } py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 w-full sm:w-72 focus:outline-none focus:border-[#7F1625]`}
              />
            </div>
          </div>

          {/* Archived Cuts Table */}
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#120406]/5 dark:bg-[#120406]/80 border-b border-slate-200 dark:border-[#2d080e] text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم إذن القص' : 'Cut Order #'}</th>
                    <th className="py-3 px-4">{isAr ? 'أمر الإنتاج والموديل' : 'PO # & Model'}</th>
                    <th className="py-3 px-4">{isAr ? 'الطاولة والمقصدار' : 'Table & Cutter'}</th>
                    <th className="py-3 px-4">{isAr ? 'الخامة ومصدرها' : 'Fabric & Source'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'طول الفرشة' : 'Lay Length'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الراقات' : 'Plies'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المستهلك' : 'Fabric Used'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'القطع الناتجة' : 'Yield Pieces'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والملف' : 'Actions & Dossier'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedArchivedCuttingOrders.map((cut) => {
                    const cutterEmp = cut.assigned_cutter_id ? employees.find((e) => e.id === cut.assigned_cutter_id) : null;
                    const cutterName = cut.assigned_cutter_name || (cut as any).assignedCutter?.name || cutterEmp?.name;
                    const prodOrder = productionOrders.find((p) => p.id === cut.production_order_id);
                    const modelName = prodOrder?.model_name || (cut as any).productionOrder?.garmentModel?.name || (isAr ? 'موديل معتمد' : 'Garment Model');
                    const modelCode = prodOrder?.model_code || (cut as any).productionOrder?.garmentModel?.model_code;

                    return (
                      <tr key={cut.id} className="hover:bg-slate-50/80 dark:hover:bg-[#180508]/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-sky-600 dark:text-sky-400">
                          {cut.cutting_order_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{modelName}</div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="text-[#7F1625] dark:text-[#ff8ba0] font-semibold">{cut.production_order_number || '—'}</span>
                            {modelCode && <span>[{modelCode}]</span>}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{cut.table_number || 'Table 1'}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3 text-[#7F1625] dark:text-[#ff8ba0]" />
                            <span>{cutterName || (isAr ? 'فني القص' : 'Master Cutter')}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{cut.fabric_name || (isAr ? 'قماش التشغيل' : 'Fabric')}</div>
                          <Badge
                            variant={cut.fabric_source === 'customer_deposit' ? 'purple' : 'info'}
                            className="mt-0.5 text-[9px]"
                          >
                            {cut.fabric_source === 'customer_deposit'
                              ? isAr ? 'أمانة عميل CMT' : 'CMT Custody'
                              : isAr ? 'خامات المصنع' : 'Factory Owned'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                          {cut.lay_length_meters} {isAr ? 'م' : 'm'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {cut.layers_count} {isAr ? 'راقة' : 'plies'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-amber-600 dark:text-amber-400 font-bold">
                          {cut.actual_fabric_meters_used} {isAr ? 'م' : 'm'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {cut.total_cut_pieces} {isAr ? 'قطعة' : 'pcs'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            {isAr ? 'مكتملة ومؤرشفة' : 'Completed & Archived'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 justify-center">
                            {/* 1. Main Dossier Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(cut)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7F1625] to-[#9E2A3B] hover:from-[#961b2c] hover:to-[#b03044] text-white text-[11px] font-bold shadow-md shadow-[#7F1625]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                              title={isAr ? 'فتح ملف القصة الشامل (الأقمشة، العمال، المقاسات، الوقت)' : 'Open Full Digital Dossier'}
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>{isAr ? 'ملف القصة الشامل' : 'Dossier'}</span>
                            </button>

                            {/* 2. Print Cutting Ticket */}
                            <button
                              type="button"
                              title={isAr ? 'طباعة كارت وإذن طاولة القص' : 'Print Cutting Ticket'}
                              onClick={() => handleOpenPrint('cutting', cut)}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* 3. Restore to Active Cut */}
                            <button
                              type="button"
                              title={isAr ? 'إعادة فتح القصة واستئنافها بصالة القص النشطة' : 'Restore / Re-open Cut'}
                              onClick={() => handleRestoreCutting(cut)}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-all cursor-pointer shadow-2xs"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedArchivedCuttingOrders.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                        <div className="max-w-md mx-auto space-y-2">
                          <Archive className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                          <p className="font-semibold text-slate-600 dark:text-slate-300">
                            {isAr ? 'لا توجد أوامر قص مؤرشفة مطابقة للبحث' : 'No archived cutting orders match your search'}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {isAr
                              ? 'عند اكتمال كافة مراحل تشغيل القصة أو النقر على "إنهاء وأرشفة القصة" في صالة القص، سيتم حفظها تلقائياً هنا مع كافة بيانات عمالها وأقمشتها وأوقاتها.'
                              : 'When all bundles complete their stages or when you click archive, the cut will be stored here with its complete digital history.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredArchivedCuttingOrders.length > 0 && (
              <Pagination
                currentPage={archivePage}
                totalPages={totalArchivePages}
                totalItems={filteredArchivedCuttingOrders.length}
                perPage={archivePerPage}
                onPageChange={setArchivePage}
                isAr={isAr}
                alwaysShow={true}
              />
            )}
          </div>
        </div>
      )}

      {/* Dedicated Clean Single-Document Print Modal */}
      <ProductionPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        documentType={printDocType}
        data={printData}
        isAr={isAr}
      />

      {/* Comprehensive Digital Dossier Modal for Archived Cut */}
      <ArchivedCuttingDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        cuttingOrder={selectedArchivedCutForDossier}
        employees={employees}
        productionOrders={productionOrders}
        isAr={isAr}
      />
    </div>
  );
};

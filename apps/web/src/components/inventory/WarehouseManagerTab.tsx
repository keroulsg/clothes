import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Layers,
  Shirt,
  Search,
  Plus,
  Printer,
  Calculator,
  ArrowRightLeft,
  AlertTriangle,
  MapPin,
  Building2,
  RefreshCw,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  GitBranch,
  X,
  Store,
  ShoppingBag,
  Truck,
  Edit2,
  Trash2,
  Scissors,
  Phone,
  User,
  Check,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { InventoryItem, Warehouse, CustomerMaterial, InventoryTransaction, Branch } from '../../types';
import { BranchesManagerModal } from './BranchesManagerModal';
import { WarehousesManagerModal } from './WarehousesManagerModal';
import { StockCardModal } from './StockCardModal';
import { StockTransferModal } from './StockTransferModal';
import { StockCountModal } from './StockCountModal';
import { EditInventoryItemModal } from './EditInventoryItemModal';

// Strict check for finished goods: item_type is finished or has a non-null variant_id
const isFinishedGoodItem = (it: InventoryItem): boolean => {
  const type = (it.item_type || '').toLowerCase();
  const hasVariant = Boolean(it.variant_id) && it.variant_id !== null && it.variant_id !== 'null';
  return ['finished_good', 'finished_product'].includes(type) || hasVariant;
};

interface WarehouseManagerTabProps {
  inventoryItems: InventoryItem[];
  warehouses: Warehouse[];
  customerMaterials: CustomerMaterial[];
  stockLedger: InventoryTransaction[];
  branches?: Branch[];
  onOpenCreateItemModal: (category?: 'raw_materials' | 'finished_goods') => void;
  onOpenStockMovementModal: (item: InventoryItem) => void;
  onOpenFabricCalcModal: () => void;
  onOpenReceiveCustomerMatModal: () => void;
  onOpenBarcodeLabelModal: (item: InventoryItem) => void;
  onItemUpdated?: (item: InventoryItem) => void;
  onItemDeleted?: (itemId: string) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
  isAr?: boolean;
}

export const WarehouseManagerTab: React.FC<WarehouseManagerTabProps> = ({
  inventoryItems,
  warehouses,
  customerMaterials,
  stockLedger,
  branches = [],
  onOpenCreateItemModal,
  onOpenStockMovementModal,
  onOpenFabricCalcModal,
  onOpenReceiveCustomerMatModal,
  onOpenBarcodeLabelModal,
  onItemUpdated,
  onItemDeleted,
  onRefreshData,
  isLoading = false,
  isAr = true,
}) => {
  // Main Sub-Tab: 'raw_materials' | 'finished_goods' | 'customer_cmt' | 'ledger'
  const [subTab, setSubTab] = useState<'raw_materials' | 'finished_goods' | 'customer_cmt' | 'ledger'>('raw_materials');

  // Modals state (Batch 2 Enhancements)
  const [isBranchesModalOpen, setIsBranchesModalOpen] = useState(false);
  const [isWarehousesModalOpen, setIsWarehousesModalOpen] = useState(false);
  const [isTransfersModalOpen, setIsTransfersModalOpen] = useState(false);
  const [selectedTransferSourceWhId, setSelectedTransferSourceWhId] = useState<string | undefined>(undefined);
  const [isCountsModalOpen, setIsCountsModalOpen] = useState(false);
  const [selectedStockCardItem, setSelectedStockCardItem] = useState<InventoryItem | null>(null);

  // Edit & Delete Item States
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Branch Direct Edit & Delete States
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState<{
    name: string;
    code: string;
    type: string;
    manager_name: string;
    phone: string;
    address: string;
    is_main: boolean;
  }>({ name: '', code: '', type: 'factory', manager_name: '', phone: '', address: '', is_main: false });
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);

  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);
  const [branchDeleteError, setBranchDeleteError] = useState<string | null>(null);

  // Warehouse Direct Edit & Delete States
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState<{
    name: string;
    code: string;
    branch_id: string;
    type: string;
    address: string;
    allow_negative_stock: boolean;
  }>({ name: '', code: '', branch_id: '', type: 'fabric', address: '', allow_negative_stock: false });
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);
  const [warehouseFormError, setWarehouseFormError] = useState<string | null>(null);

  const [deletingWarehouse, setDeletingWarehouse] = useState<Warehouse | null>(null);
  const [isDeletingWarehouse, setIsDeletingWarehouse] = useState(false);
  const [warehouseDeleteError, setWarehouseDeleteError] = useState<string | null>(null);

  // Customer Material Consumption State
  const [selectedCmtForConsume, setSelectedCmtForConsume] = useState<CustomerMaterial | null>(null);
  const [consumeMeters, setConsumeMeters] = useState<string>('');
  const [wasteMeters, setWasteMeters] = useState<string>('0');
  const [isConsuming, setIsConsuming] = useState<boolean>(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  // Branch and Warehouse mapping
  const activeBranch = useMemo(() => {
    if (selectedBranchId === 'all') return null;
    return branches.find((b) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  const availableWarehouses = useMemo(() => {
    if (selectedBranchId === 'all') return warehouses;
    return warehouses.filter((w) => {
      if (w.branch_id === selectedBranchId) return true;
      if (!w.branch_id && activeBranch?.is_main) return true;
      return false;
    });
  }, [warehouses, selectedBranchId, activeBranch]);

  const branchWarehouseIds = useMemo(() => {
    if (selectedBranchId === 'all') return null;
    return new Set(availableWarehouses.map((w) => w.id));
  }, [availableWarehouses, selectedBranchId]);

  // Branch storage categories breakdown
  const branchCategoriesSummary = useMemo(() => {
    if (!activeBranch) return null;
    const rawWhs = availableWarehouses.filter(
      (w) => ['fabric', 'raw_materials', 'accessories'].includes(w.type) || !['finished_goods', 'wip', 'customer_deposits'].includes(w.type)
    );
    const fgWhs = availableWarehouses.filter((w) => ['finished_goods', 'wip'].includes(w.type));
    const cmtWhs = availableWarehouses.filter((w) => ['customer_deposits'].includes(w.type));

    const rawWhIds = new Set(rawWhs.map((w) => w.id));
    const fgWhIds = new Set(fgWhs.map((w) => w.id));

    const rawCount = (inventoryItems || []).filter((it) => !isFinishedGoodItem(it) && rawWhIds.has(it.warehouse_id)).length;
    const fgCount = (inventoryItems || []).filter((it) => isFinishedGoodItem(it) && fgWhIds.has(it.warehouse_id)).reduce((acc, it) => acc + (Number(it.current_balance) || 0), 0);

    return {
      rawWhs,
      fgWhs,
      cmtWhs,
      rawCount,
      fgCount,
    };
  }, [activeBranch, availableWarehouses, inventoryItems]);

  const activeWarehouse = useMemo(() => {
    if (selectedWarehouseId === 'all') return null;
    return warehouses.find((w) => w.id === selectedWarehouseId) || null;
  }, [warehouses, selectedWarehouseId]);

  const activeWarehouseBranch = useMemo(() => {
    if (!activeWarehouse || !activeWarehouse.branch_id) return null;
    return branches.find((b) => b.id === activeWarehouse.branch_id) || activeWarehouse.branch || null;
  }, [activeWarehouse, branches]);

  const branchTypeLabels: Record<string, string> = {
    factory: isAr ? 'مصنع رئيسي' : 'Main Factory',
    workshop: isAr ? 'ورشة تصنيع' : 'Workshop',
    outlet: isAr ? 'صالة عرض / منفذ بيع' : 'Retail Outlet',
    warehouse: isAr ? 'مجمع مستودعات' : 'Warehouse Hub',
    head_office: isAr ? 'المقر الإداري' : 'Head Office',
    cutting_center: isAr ? 'مركز قص وتجهيز' : 'Cutting Center',
  };

  const warehouseTypeLabels: Record<string, string> = {
    fabric: isAr ? 'أقمشة وغزول' : 'Fabric & Yarn',
    raw_materials: isAr ? 'خامات ومستلزمات' : 'Raw Materials',
    accessories: isAr ? 'إكسسوارات ومستلزمات' : 'Accessories',
    finished_goods: isAr ? 'منتجات جاهزة للبيع' : 'Finished Goods',
    wip: isAr ? 'إنتاج تحت التشغيل' : 'Work in Progress',
    customer_deposits: isAr ? 'أمانات عملاء (CMT)' : 'Customer Deposits',
    returns: isAr ? 'مرتجعات وهوالك' : 'Returns & Scrap',
  };

  // Branch Edit & Delete Handlers
  const startEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      code: branch.code,
      type: branch.type || 'factory',
      manager_name: branch.manager_name || '',
      phone: branch.phone || '',
      address: branch.address || '',
      is_main: Boolean(branch.is_main),
    });
    setBranchFormError(null);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch) return;
    if (!branchForm.name.trim() || !branchForm.code.trim()) {
      setBranchFormError(isAr ? 'يرجى إدخال اسم وكود الفرع' : 'Branch name and code are required');
      return;
    }
    setIsSavingBranch(true);
    setBranchFormError(null);
    try {
      await api.branches.updateBranch(editingBranch.id, branchForm);
      if (onRefreshData) onRefreshData();
      setEditingBranch(null);
    } catch (err: any) {
      setBranchFormError(err.message || (isAr ? 'فشل حفظ بيانات الفرع' : 'Failed to update branch'));
    } finally {
      setIsSavingBranch(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    setIsDeletingBranch(true);
    setBranchDeleteError(null);
    try {
      await api.branches.deleteBranch(deletingBranch.id);
      setSelectedBranchId('all');
      setSelectedWarehouseId('all');
      if (onRefreshData) onRefreshData();
      setDeletingBranch(null);
    } catch (err: any) {
      setBranchDeleteError(err.message || (isAr ? 'تعذر حذف الفرع نظراً لوجود مستودعات تابعة له' : 'Failed to delete branch'));
    } finally {
      setIsDeletingBranch(false);
    }
  };

  // Warehouse Edit & Delete Handlers
  const startEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setWarehouseForm({
      name: wh.name,
      code: wh.code,
      branch_id: wh.branch_id || (branches[0]?.id || ''),
      type: wh.type || 'fabric',
      address: wh.address || '',
      allow_negative_stock: Boolean(wh.allow_negative_stock),
    });
    setWarehouseFormError(null);
  };

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;
    if (!warehouseForm.name.trim() || !warehouseForm.code.trim()) {
      setWarehouseFormError(isAr ? 'يرجى إدخال اسم وكود المستودع' : 'Warehouse name and code are required');
      return;
    }
    setIsSavingWarehouse(true);
    setWarehouseFormError(null);
    try {
      await api.inventory.updateWarehouse(editingWarehouse.id, warehouseForm);
      if (onRefreshData) onRefreshData();
      setEditingWarehouse(null);
    } catch (err: any) {
      setWarehouseFormError(err.message || (isAr ? 'فشل حفظ بيانات المستودع' : 'Failed to update warehouse'));
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async () => {
    if (!deletingWarehouse) return;
    setIsDeletingWarehouse(true);
    setWarehouseDeleteError(null);
    try {
      await api.inventory.deleteWarehouse(deletingWarehouse.id);
      setSelectedWarehouseId('all');
      if (onRefreshData) onRefreshData();
      setDeletingWarehouse(null);
    } catch (err: any) {
      setWarehouseDeleteError(err.message || (isAr ? 'تعذر حذف المستودع لوجود أرصدة أو حركات سابقة' : 'Failed to delete warehouse'));
    } finally {
      setIsDeletingWarehouse(false);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const perPage = 15;

  // Raw materials items (Guaranteed zero contamination from finished goods)
  const rawMaterialItems = useMemo(() => {
    return inventoryItems.filter((it) => !isFinishedGoodItem(it));
  }, [inventoryItems]);

  // Finished goods items (Only finished products or variant-bound items)
  const finishedGoodsItems = useMemo(() => {
    return inventoryItems.filter((it) => isFinishedGoodItem(it));
  }, [inventoryItems]);

  // Available Zones from items
  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    inventoryItems.forEach((it) => {
      const z = it.storage_zone || it.technical_specs?.storage_zone;
      if (z) zones.add(z);
    });
    return Array.from(zones);
  }, [inventoryItems]);

  // Summary Metrics (Scoped to selected branch and warehouse)
  const metrics = useMemo(() => {
    const scopedRaw = branchWarehouseIds
      ? rawMaterialItems.filter((it) => branchWarehouseIds.has(it.warehouse_id) && (selectedWarehouseId === 'all' || it.warehouse_id === selectedWarehouseId))
      : selectedWarehouseId === 'all'
      ? rawMaterialItems
      : rawMaterialItems.filter((it) => it.warehouse_id === selectedWarehouseId);

    const scopedFinished = branchWarehouseIds
      ? finishedGoodsItems.filter((it) => branchWarehouseIds.has(it.warehouse_id) && (selectedWarehouseId === 'all' || it.warehouse_id === selectedWarehouseId))
      : selectedWarehouseId === 'all'
      ? finishedGoodsItems
      : finishedGoodsItems.filter((it) => it.warehouse_id === selectedWarehouseId);

    const scopedAll = [...scopedRaw, ...scopedFinished];

    const rawValuation = scopedRaw.reduce((acc, it) => acc + (it.current_balance * (it.average_cost || 0)), 0);
    const finishedPieces = scopedFinished.reduce((acc, it) => acc + it.current_balance, 0);
    const lowStockItems = scopedAll.filter((it) => it.current_balance <= (it.reorder_level || 0)).length;
    const cmtMeters = customerMaterials
      .filter((cm) => (!branchWarehouseIds || !cm.warehouse_id || branchWarehouseIds.has(cm.warehouse_id)) && (selectedWarehouseId === 'all' || !cm.warehouse_id || cm.warehouse_id === selectedWarehouseId))
      .reduce((acc, cm) => acc + (cm.remaining_meters || 0), 0);

    return {
      rawValuation,
      finishedPieces,
      lowStockItems,
      cmtMeters,
    };
  }, [rawMaterialItems, finishedGoodsItems, customerMaterials, branchWarehouseIds, selectedWarehouseId]);

  // Filtered dataset for the active view
  const currentDataset = useMemo(() => {
    let list: InventoryItem[] = [];
    if (subTab === 'raw_materials') {
      list = rawMaterialItems;
    } else if (subTab === 'finished_goods') {
      list = finishedGoodsItems;
    } else {
      return [];
    }

    return list.filter((item) => {
      // Branch filter
      if (branchWarehouseIds && !branchWarehouseIds.has(item.warehouse_id)) {
        return false;
      }
      // Warehouse filter
      if (selectedWarehouseId !== 'all' && item.warehouse_id !== selectedWarehouseId) {
        return false;
      }
      // Zone filter
      if (selectedZoneFilter !== 'all') {
        const itemZone = item.storage_zone || item.technical_specs?.storage_zone;
        if (itemZone !== selectedZoneFilter) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (item.code || '').toLowerCase();
        const name = (item.name || '').toLowerCase();
        const rack = (item.rack_location || item.technical_specs?.rack_location || '').toLowerCase();
        const bin = (item.shelf_bin_location || item.technical_specs?.shelf_bin_location || '').toLowerCase();
        return code.includes(q) || name.includes(q) || rack.includes(q) || bin.includes(q);
      }
      return true;
    });
  }, [subTab, rawMaterialItems, finishedGoodsItems, branchWarehouseIds, selectedWarehouseId, selectedZoneFilter, searchQuery]);

  const totalPages = Math.ceil(currentDataset.length / perPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return currentDataset.slice(start, start + perPage);
  }, [currentDataset, currentPage, perPage]);

  // Customer Materials filtered
  const filteredCustomerMaterials = useMemo(() => {
    return customerMaterials.filter((cm) => {
      if (branchWarehouseIds && cm.warehouse_id && !branchWarehouseIds.has(cm.warehouse_id)) {
        return false;
      }
      if (selectedWarehouseId !== 'all' && cm.warehouse_id && cm.warehouse_id !== selectedWarehouseId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (cm.customer_name || '').toLowerCase().includes(q) ||
          (cm.fabric_name || '').toLowerCase().includes(q) ||
          (cm.fabric_code || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customerMaterials, branchWarehouseIds, selectedWarehouseId, searchQuery]);

  // Ledger filtered
  const filteredLedger = useMemo(() => {
    if (subTab !== 'ledger') return [];
    return stockLedger.filter((tx) => {
      if (branchWarehouseIds && tx.warehouse_id && !branchWarehouseIds.has(tx.warehouse_id)) {
        return false;
      }
      if (selectedWarehouseId !== 'all' && tx.warehouse_id && tx.warehouse_id !== selectedWarehouseId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          (tx.item_code || '').toLowerCase().includes(q) ||
          (tx.item_name || '').toLowerCase().includes(q) ||
          (tx.reference_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [subTab, stockLedger, branchWarehouseIds, selectedWarehouseId, searchQuery]);

  const ledgerPages = Math.ceil(filteredLedger.length / perPage) || 1;
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredLedger.slice(start, start + perPage);
  }, [filteredLedger, currentPage, perPage]);

  const getTxTypeBadge = (txType: string, refNum?: string) => {
    const ref = (refNum || '').toLowerCase();
    if (txType === 'pos_sale' || ref.startsWith('pos-')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Store className="w-3 h-3" />
          <span>{isAr ? 'كاشير المعرض (POS)' : 'POS Retail'}</span>
        </span>
      );
    }
    if (txType === 'storefront_sale' || ref.includes('web') || ref.includes('so-ord-') || ref.startsWith('so-web')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <ShoppingBag className="w-3 h-3" />
          <span>{isAr ? 'المتجر الإلكتروني (Web)' : 'Online Store'}</span>
        </span>
      );
    }
    if (txType === 'sales_delivery' || ref.startsWith('dn-') || ref.startsWith('so-')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          <Truck className="w-3 h-3" />
          <span>{isAr ? 'مبيعات جملة (B2B)' : 'Wholesale Delivery'}</span>
        </span>
      );
    }
    if (txType === 'opening_balance') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          <span>{isAr ? 'رصيد افتتاحي' : 'Opening'}</span>
        </span>
      );
    }
    if (txType === 'goods_receipt') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
          <Boxes className="w-3 h-3" />
          <span>{isAr ? 'إذن توريد خامات' : 'Goods Receipt'}</span>
        </span>
      );
    }
    if (txType === 'finished_goods_receipt') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <Shirt className="w-3 h-3" />
          <span>{isAr ? 'استلام إنتاج تام' : 'Finished Goods In'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        <span>{txType}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
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
                {isAr ? 'المستودعات والتخزين الفيزيائي المنفصل' : 'Warehouses & Segregated Stock'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                {isAr ? 'تتبع مواضع الرفوف (Rack/Shelf/Bin)' : 'Rack/Shelf/Bin Tracking'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Boxes className="w-7 h-7 text-[#E05265] shrink-0" />
              <span>{isAr ? 'المخازن والأقمشة والتخزين المنفصل' : 'Warehouses & Fabric Inventory'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'فصل تام بين خامات ومستلزمات الإنتاج وبضاعة تامة الصنع، مع تتبع مواضع الرفوف (Rack/Shelf/Bin) وأمانات خامات العملاء المعزولة ودفتر الأستاذ.'
                : 'Segregated raw materials vs finished goods with rack/shelf coordinates and immutable stock ledger.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {subTab === 'raw_materials' && (
              <button
                type="button"
                onClick={() => onOpenCreateItemModal('raw_materials')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ إضافة خامة جديدة' : '+ New Raw Material'}</span>
              </button>
            )}

            {subTab === 'finished_goods' && (
              <button
                type="button"
                onClick={() => onOpenCreateItemModal('finished_goods')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ إضافة منتج تام' : '+ Add Finished Good'}</span>
              </button>
            )}

            {subTab === 'customer_cmt' && (
              <button
                type="button"
                onClick={onOpenReceiveCustomerMatModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ استلام أمانة عميل' : '+ Receive CMT'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsTransfersModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'تحويل مخزني' : 'Transfer'}</span>
            </button>

            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
                title={isAr ? 'تحديث البيانات' : 'Sync'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
                <span>{isAr ? 'تحديث' : 'Sync'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Operations & Warehouses Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Quick Inventory Movement Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 rtl:ml-1 rtl:mr-0 ltr:mr-1">
            {isAr ? 'العمليات المخزنية:' : 'Operations:'}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsTransfersModalOpen(true)}
            icon={<ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />}
          >
            {isAr ? 'تحويل مخزني' : 'Transfer'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCountsModalOpen(true)}
            icon={<ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />}
          >
            {isAr ? 'الجرد الفعلي' : 'Stock Count'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenReceiveCustomerMatModal}
            icon={<Boxes className="w-3.5 h-3.5 text-sky-500" />}
          >
            {isAr ? 'استلام أمانة عميل' : 'Receive CMT'}
          </Button>
        </div>

        {/* Warehouse Setup & Calculators */}
        <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsBranchesModalOpen(true)}
            icon={<GitBranch className="w-3.5 h-3.5 text-blue-500" />}
            title={isAr ? 'إدارة فروع الشركة والمصنع' : 'Branches'}
          >
            {isAr ? 'الفروع' : 'Branches'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsWarehousesModalOpen(true)}
            icon={<Building2 className="w-3.5 h-3.5 text-slate-500" />}
            title={isAr ? 'إدارة المستودعات وأماكن التخزين' : 'Warehouses'}
          >
            {isAr ? 'المستودعات' : 'Warehouses'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenFabricCalcModal}
            icon={<Calculator className="w-3.5 h-3.5 text-indigo-500" />}
            title={isAr ? 'حاسبة أوزان الأقمشة GSM' : 'Fabric GSM Calculator'}
          >
            {isAr ? 'حاسبة GSM' : 'Fabric Calc'}
          </Button>
        </div>
      </div>

      {/* Top Industrial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Raw Materials Valuation */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'تقييم مخزون الخامات' : 'Raw Materials Valuation'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
              {metrics.rawValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
              <span>{rawMaterialItems.length} {isAr ? 'صنف خامة ومستلزمات إنتاج' : 'raw material items'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* 2. Finished Goods Stock */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'إجمالي المنتجات الجاهزة' : 'Finished Goods Stock'}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {metrics.finishedPieces.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">{isAr ? 'قطعة جاهزة' : 'pcs'}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 pt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{finishedGoodsItems.length} {isAr ? 'موديل ومتغير متاح للبيع' : 'SKUs ready'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Shirt className="w-5 h-5" />
          </div>
        </div>

        {/* 3. Low Stock Alerts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-rose-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'تنبيهات انخفاض الرصيد' : 'Low Stock Alerts'}
            </span>
            <div className={`text-2xl font-bold font-mono leading-none ${metrics.lowStockItems > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
              {metrics.lowStockItems}{' '}
              <span className="text-xs font-normal text-slate-400">{isAr ? 'أصناف بلغت حد الطلب' : 'items'}</span>
            </div>
            <div className="text-[11px] font-medium text-rose-600 dark:text-rose-400 pt-1">
              {metrics.lowStockItems > 0 ? (isAr ? 'تتطلب إصدار أمر شراء خامات PO' : 'Requires procurement') : (isAr ? 'جميع الأرصدة آمنة فوق حد الخطر' : 'Stock levels optimal')}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/60 dark:border-rose-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* 4. Customer CMT Fabric */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-sky-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'أمانات خامات العملاء' : 'Customer CMT Fabric'}
            </span>
            <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 leading-none">
              {metrics.cmtMeters.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">{isAr ? 'متر أمانة' : 'meters'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
              {customerMaterials.length} {isAr ? 'إذن أمانة تشغيل للغير' : 'custody records'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Luxury Segmented Pill Tab Bar */}
      <div className="p-1.5 bg-slate-100 dark:bg-[#0a0204] rounded-2xl border border-slate-200/80 dark:border-[#2d080e] flex items-center gap-1.5 overflow-x-auto shadow-inner text-xs font-bold">
        <button
          type="button"
          onClick={() => { setSubTab('raw_materials'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            subTab === 'raw_materials'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Layers className="w-4 h-4 shrink-0" />
          <span>{isAr ? 'مستودع الخامات ومستلزمات الإنتاج' : 'Raw Materials & Trims'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${subTab === 'raw_materials' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {rawMaterialItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSubTab('finished_goods'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            subTab === 'finished_goods'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Shirt className="w-4 h-4 shrink-0" />
          <span>{isAr ? 'مستودع المنتجات تامة الصنع' : 'Finished Goods & POS'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${subTab === 'finished_goods' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {finishedGoodsItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSubTab('customer_cmt'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            subTab === 'customer_cmt'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Boxes className="w-4 h-4 shrink-0" />
          <span>{isAr ? 'أمانات خامات العملاء (CMT)' : 'Customer CMT'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${subTab === 'customer_cmt' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {customerMaterials.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => { setSubTab('ledger'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            subTab === 'ledger'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{isAr ? 'دفتر الأستاذ المخزني (Audit Ledger)' : 'Audit Ledger'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${subTab === 'ledger' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {stockLedger.length}
          </span>
        </button>
      </div>

      {/* Filters & Search Toolbar (Applicable to Raw & Finished Goods) */}
      {(subTab === 'raw_materials' || subTab === 'finished_goods' || subTab === 'ledger') && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="flex flex-1 items-center gap-2 max-w-md w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={isAr ? 'بحث بالكود، الاسم، موضع الرف، أو رقم المستند...' : 'Search code, name, rack/shelf, or ref...'}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Branch Filter */}
            {branches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
                <GitBranch className="w-3.5 h-3.5 text-blue-500" />
                <select
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setSelectedWarehouseId('all');
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? '🏢 كل الفروع والمواقع' : '🏢 All Branches'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Warehouse Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => { setSelectedWarehouseId(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">
                  {selectedBranchId === 'all'
                    ? (isAr ? 'كل المستودعات' : 'All Warehouses')
                    : (isAr ? `كل مستودعات ${activeBranch?.name}` : `All warehouses in ${activeBranch?.name}`)}
                </option>
                {availableWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Zone Filter */}
            {availableZones.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedZoneFilter}
                  onChange={(e) => { setSelectedZoneFilter(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="all">{isAr ? 'كل المناطق' : 'All Zones'}</option>
                  {availableZones.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected Branch Details & Actions Banner */}
      {activeBranch && (
        <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-800/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
              <GitBranch className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                  {isAr ? 'الفرع المحدد حالياً:' : 'Active Branch:'}
                </span>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {activeBranch.name}
                </h3>
                <Badge variant="neutral" className="font-mono text-xs bg-white dark:bg-slate-800">
                  {activeBranch.code}
                </Badge>
                <Badge variant="info" className="text-[11px]">
                  {branchTypeLabels[activeBranch.type] || activeBranch.type}
                </Badge>
                {activeBranch.is_main && (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                    {isAr ? 'المقر الرئيسي' : 'HQ'}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                {activeBranch.manager_name && (
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{isAr ? 'المدير المسؤول:' : 'Manager:'} <strong>{activeBranch.manager_name}</strong></span>
                  </span>
                )}
                {activeBranch.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeBranch.phone}</span>
                  </span>
                )}
                {activeBranch.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeBranch.address}</span>
                  </span>
                )}
                <span className="text-slate-500 dark:text-slate-400">
                  • {isAr ? `المستودعات التابعة: ${availableWarehouses.length} مستودع` : `Warehouses: ${availableWarehouses.length}`}
                </span>
              </div>
            </div>
          </div>

          {/* Branch Actions */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditBranch(activeBranch)}
              icon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
              className="text-xs font-semibold"
            >
              {isAr ? 'تعديل بيانات الفرع' : 'Edit Branch'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeletingBranch(activeBranch);
                setBranchDeleteError(null);
              }}
              icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
              className="text-xs font-semibold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/30"
            >
              {isAr ? 'حذف الفرع' : 'Delete Branch'}
            </Button>
          </div>
        </div>
      )}

      {/* Branch Categories & Storage Units Deck */}
      {activeBranch && branchCategoriesSummary && availableWarehouses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
          {/* Category 1: Raw Materials */}
          <div
            onClick={() => {
              setSubTab('raw_materials');
              if (branchCategoriesSummary.rawWhs[0]) setSelectedWarehouseId(branchCategoriesSummary.rawWhs[0].id);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              subTab === 'raw_materials'
                ? 'bg-amber-500/10 border-amber-500/40 shadow-xs ring-1 ring-amber-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>{isAr ? 'خامات ومستلزمات الإنتاج' : 'Raw Materials'}</span>
              </span>
              <Badge variant="warning" className="text-[10px]">
                {branchCategoriesSummary.rawWhs.length} {isAr ? 'مستودع' : 'wh'}
              </Badge>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {branchCategoriesSummary.rawWhs.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {branchCategoriesSummary.rawWhs.map((w) => w.name).join(' • ')}
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {branchCategoriesSummary.rawCount} {isAr ? 'صنف خامة متاح' : 'raw items'}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 italic">{isAr ? 'لا يوجد مستودع خامات في هذا الفرع' : 'No raw warehouse'}</span>
              )}
            </div>
          </div>

          {/* Category 2: Finished Goods */}
          <div
            onClick={() => {
              setSubTab('finished_goods');
              if (branchCategoriesSummary.fgWhs[0]) setSelectedWarehouseId(branchCategoriesSummary.fgWhs[0].id);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              subTab === 'finished_goods'
                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Shirt className="w-4 h-4" />
                <span>{isAr ? 'منتجات تامة الصنع (جاهز للبيع)' : 'Finished Goods'}</span>
              </span>
              <Badge variant="success" className="text-[10px]">
                {branchCategoriesSummary.fgWhs.length} {isAr ? 'مستودع' : 'wh'}
              </Badge>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {branchCategoriesSummary.fgWhs.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {branchCategoriesSummary.fgWhs.map((w) => w.name).join(' • ')}
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                    {(branchCategoriesSummary.fgCount || 0).toLocaleString()} {isAr ? 'قطعة جاهزة للبيع' : 'ready pcs'}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 italic">{isAr ? 'لا يوجد مستودع منتجات تامة' : 'No finished goods wh'}</span>
              )}
            </div>
          </div>

          {/* Category 3: Customer CMT */}
          <div
            onClick={() => {
              setSubTab('customer_cmt');
              if (branchCategoriesSummary.cmtWhs[0]) setSelectedWarehouseId(branchCategoriesSummary.cmtWhs[0].id);
            }}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              subTab === 'customer_cmt'
                ? 'bg-sky-500/10 border-sky-500/40 shadow-xs ring-1 ring-sky-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                <Boxes className="w-4 h-4" />
                <span>{isAr ? 'أمانات تشغيل للغير (CMT)' : 'Customer CMT'}</span>
              </span>
              <Badge variant="info" className="text-[10px]">
                {branchCategoriesSummary.cmtWhs.length} {isAr ? 'مستودع' : 'wh'}
              </Badge>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {branchCategoriesSummary.cmtWhs.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                    {branchCategoriesSummary.cmtWhs.map((w) => w.name).join(' • ')}
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 italic">{isAr ? 'لا توجد أمانات تشغيل بالفرع' : 'No CMT storage'}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When Branch has No Warehouses yet */}
      {activeBranch && availableWarehouses.length === 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{isAr ? `لا توجد مستودعات مرتبطة بفرع "${activeBranch.name}" حالياً.` : `No warehouses linked to ${activeBranch.name} yet.`}</span>
          </div>
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0"
            onClick={() => setIsWarehousesModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? '+ إضافة مستودع جديد لهذا الفرع' : '+ New Warehouse for Branch'}
          </Button>
        </div>
      )}

      {/* Selected Warehouse Details & Actions Banner */}
      {activeWarehouse && (
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isAr ? 'المستودع المحدد:' : 'Selected Warehouse:'}
                </span>
                <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {activeWarehouse.name}
                </h4>
                <Badge variant="neutral" className="font-mono text-[11px]">
                  {activeWarehouse.code}
                </Badge>
                {activeWarehouseBranch && (
                  <Badge variant="info" className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
                    🏢 {isAr ? `تابع لفرع: ${activeWarehouseBranch.name}` : `Branch: ${activeWarehouseBranch.name}`}
                  </Badge>
                )}
                <Badge variant="neutral" className="text-[10px]">
                  {warehouseTypeLabels[activeWarehouse.type] || activeWarehouse.type}
                </Badge>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {activeWarehouse.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{activeWarehouse.address}</span>
                  </span>
                )}
                <span>• {isAr ? `السماح بالرصيد السالب: ${activeWarehouse.allow_negative_stock ? 'مفعّل' : 'معطّل'}` : `Allow negative: ${activeWarehouse.allow_negative_stock ? 'Yes' : 'No'}`}</span>
              </div>
            </div>
          </div>

          {/* Warehouse Actions */}
          <div className="flex items-center gap-2 self-end md:self-center shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEditWarehouse(activeWarehouse)}
              icon={<Edit2 className="w-3 h-3 text-slate-600" />}
              className="text-xs h-8"
            >
              {isAr ? 'تعديل المستودع' : 'Edit Warehouse'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDeletingWarehouse(activeWarehouse);
                setWarehouseDeleteError(null);
              }}
              icon={<Trash2 className="w-3 h-3 text-rose-500" />}
              className="text-xs h-8 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
            >
              {isAr ? 'حذف المستودع' : 'Delete Warehouse'}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: RAW MATERIALS TABLE */}
      {subTab === 'raw_materials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? 'مستودع الخامات ومستلزمات الإنتاج' : 'Raw Materials & Trims Inventory'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'تتبع أثواب الأقمشة، مواصفات الـ GSM، الإكسسوارات، ومواضع الرفوف (Rack/Bin)' : 'Track fabric rolls, GSM specs, accessories and rack/bin locations'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs border-transparent font-bold shrink-0"
              onClick={() => onOpenCreateItemModal('raw_materials')}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? '+ إضافة خامة أو مستلزم جديد' : '+ Add Raw Material'}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'كود الخامة' : 'Item Code'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم الخامة ومواصفات النسيج' : 'Material Name & Specs'}</th>
                  <th className="py-3 px-4">{isAr ? 'المستودع وموضع الرف (Location)' : 'Warehouse & Bin Location'}</th>
                  <th className="py-3 px-4">{isAr ? 'الرصيد المتاح' : 'Available Balance'}</th>
                  <th className="py-3 px-4">{isAr ? 'متوسط التكلفة' : 'Avg Cost'}</th>
                  <th className="py-3 px-4">{isAr ? 'إجمالي القيمة' : 'Total Valuation'}</th>
                  <th className="py-3 px-4">{isAr ? 'حالة الرصيد' : 'Status'}</th>
                  <th className="py-3 px-4 text-left">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {currentDataset.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold">{isAr ? 'لا توجد خامات ومستلزمات إنتاج مسجلة حالياً.' : 'No raw materials recorded.'}</span>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs border-transparent font-bold"
                          onClick={() => onOpenCreateItemModal('raw_materials')}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          {isAr ? '+ إضافة أول خامة أو قماش' : '+ Add First Raw Material'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isLow = item.current_balance <= (item.reorder_level || 0);
                    const rack = item.rack_location || item.technical_specs?.rack_location || '—';
                    const bin = item.shelf_bin_location || item.technical_specs?.shelf_bin_location || '—';
                    const zone = item.storage_zone || item.technical_specs?.storage_zone || '';
                    const totalVal = (item.current_balance * (item.average_cost || 0));

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                          {item.technical_specs?.gsm && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              GSM: {item.technical_specs.gsm} {isAr ? 'جم/م²' : 'g/m²'} • {isAr ? 'عرض:' : 'Width:'} {item.technical_specs.usable_width_meters} {isAr ? 'م' : 'm'} {item.technical_specs.roll_count ? `• ${item.technical_specs.roll_count} ${isAr ? 'ثوب' : 'rolls'}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-mono font-semibold">{rack} / {bin}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.warehouse_name || (isAr ? 'المستودع الرئيسي' : 'Main Warehouse')} {zone ? `(${zone})` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.current_balance.toLocaleString()} {item.unit_of_measure}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {item.average_cost.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <Badge variant="danger">{isAr ? 'منخفض (إعادة طلب)' : 'Reorder Alert'}</Badge>
                          ) : (
                            <Badge variant="success">{isAr ? 'متوفر' : 'In Stock'}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center gap-1 justify-end">
                            {/* 1. Stock Card */}
                            <button
                              type="button"
                              onClick={() => setSelectedStockCardItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'كارت الصنف وسجل الحركات' : 'Stock Card & Ledger'}
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            {/* 2. Stock Movement */}
                            <button
                              type="button"
                              onClick={() => onOpenStockMovementModal(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-amber-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'تسجيل حركة مخزنية سريعة' : 'Record Stock Movement'}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* 3. Barcode Thermal Label */}
                            <button
                              type="button"
                              onClick={() => onOpenBarcodeLabelModal(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-slate-400 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'طباعة باركود الرف الحراري' : 'Print Thermal Shelf Barcode'}
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                            </button>

                            {/* 4. Fabric GSM Calculator */}
                            <button
                              type="button"
                              onClick={onOpenFabricCalcModal}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-teal-500/50 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'حاسبة تحويل الأقمشة (متر ↔ كجم)' : 'Fabric GSM Calculator'}
                            >
                              <Calculator className="w-3.5 h-3.5 text-teal-500" />
                            </button>

                            {/* 5. Edit Item */}
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-blue-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'تعديل بيانات الصنف وموضع الرف' : 'Edit Item & Location'}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            </button>

                            {/* 6. Delete Item */}
                            <button
                              type="button"
                              onClick={() => { setDeleteError(null); setDeletingItem(item); }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-rose-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'حذف كارت الصنف' : 'Delete Item'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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

          {currentDataset.length > perPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={currentDataset.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      </div>
    )}

      {/* VIEW 2: FINISHED GOODS TABLE */}
      {subTab === 'finished_goods' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? 'مستودع المنتجات تامة الصنع (جاهز للبيع والتوزيع)' : 'Finished Goods & POS Warehouse'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'تتبع المنتجات الجاهزة، أرصدة المعارض ونقاط البيع POS، والمتاح للبيع مع مواضع الرفوف (Rack/Bin)' : 'Track ready apparel, POS stock, and sellable inventory across racks'}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border-transparent font-bold shrink-0"
              onClick={() => onOpenCreateItemModal('finished_goods')}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? '+ إضافة منتج تام للرصيد' : '+ Add Finished Good Stock'}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'كود الصنف / SKU' : 'SKU / Code'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم الموديل والمتغير (Color/Size)' : 'Model & Variant (Color/Size)'}</th>
                  <th className="py-3 px-4">{isAr ? 'موضع الرف (Rack/Bin)' : 'Bin Location (Rack/Bin)'}</th>
                  <th className="py-3 px-4">{isAr ? 'الرصيد الفعلي' : 'Physical Balance'}</th>
                  <th className="py-3 px-4">{isAr ? 'المحجوز للطلبات' : 'Reserved'}</th>
                  <th className="py-3 px-4">{isAr ? 'المتاح للبيع (POS & Web)' : 'Available to Sell'}</th>
                  <th className="py-3 px-4">{isAr ? 'سعر التكلفة' : 'Cost Price'}</th>
                  <th className="py-3 px-4 text-left">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {currentDataset.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Shirt className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold">{isAr ? 'لا توجد منتجات تامة الصنع مسجلة بالمستودع حالياً.' : 'No finished goods in inventory.'}</span>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs border-transparent font-bold"
                          onClick={() => onOpenCreateItemModal('finished_goods')}
                          icon={<Plus className="w-3.5 h-3.5" />}
                        >
                          {isAr ? '+ إضافة أول منتج جاهز للرصيد' : '+ Add First Finished Good'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const rack = item.rack_location || item.technical_specs?.rack_location || '—';
                    const bin = item.shelf_bin_location || item.technical_specs?.shelf_bin_location || '—';
                    const reserved = item.reserved_quantity || 0;
                    const available = item.available_quantity !== undefined ? item.available_quantity : Math.max(0, item.current_balance - reserved);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.code}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{item.name}</div>
                          {item.variant && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {(item.variant.color_name || (isAr ? 'عام' : 'General'))} • {(item.variant.size_name || (isAr ? 'عام' : 'General'))} • SKU: {item.variant.sku}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-mono font-semibold">{rack} / {bin}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.warehouse_name || (isAr ? 'مستودع المعرض والبيع' : 'Showroom & Sales Warehouse')}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.current_balance.toLocaleString()} {item.unit_of_measure}
                        </td>
                        <td className="py-3 px-4 font-mono text-amber-500 font-semibold">
                          {reserved > 0 ? `${reserved.toLocaleString()} ${item.unit_of_measure}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-500">
                          {available.toLocaleString()} {item.unit_of_measure}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {item.average_cost.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center gap-1 justify-end">
                            {/* 1. Stock Card */}
                            <button
                              type="button"
                              onClick={() => setSelectedStockCardItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'كارت الصنف وسجل الحركات' : 'Stock Card & Ledger'}
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            {/* 2. Stock Movement */}
                            <button
                              type="button"
                              onClick={() => onOpenStockMovementModal(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-amber-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'تسجيل حركة تسوية أو صرف' : 'Record Stock Adjustment'}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-500" />
                            </button>

                            {/* 3. Barcode Label */}
                            <button
                              type="button"
                              onClick={() => onOpenBarcodeLabelModal(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-slate-400 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'طباعة ملصق الباركود الحراري للرف' : 'Print Thermal Barcode'}
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                            </button>

                            {/* 4. Edit Item */}
                            <button
                              type="button"
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-blue-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'تعديل بيانات الصنف وموضع الرف' : 'Edit Item & Location'}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                            </button>

                            {/* 5. Delete Item */}
                            <button
                              type="button"
                              onClick={() => { setDeleteError(null); setDeletingItem(item); }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 hover:border-rose-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'حذف كارت الصنف' : 'Delete Item'}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
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

          {currentDataset.length > perPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={currentDataset.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      </div>
    )}

      {/* VIEW 3: CUSTOMER CMT CUSTODY */}
      {subTab === 'customer_cmt' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {isAr ? 'أرصدة خامات العملاء (أمانات تشغيل للغير)' : 'Customer CMT Fabric Balances'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {isAr ? 'خامات لا تسجل كأصول للمصنع ولا تدخل ضمن حسابات تكلفة البضاعة المباعة' : 'Customer-supplied fabrics held in trust; excluded from factory inventory valuation.'}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-sky-600 hover:bg-sky-700 text-white shadow-xs border-transparent font-bold shrink-0"
              onClick={onOpenReceiveCustomerMatModal}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? '+ استلام أمانة عميل جديدة' : '+ Receive CMT'}
            </Button>
          </div>

          {filteredCustomerMaterials.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'لا توجد أمانات خامات عملاء مسجلة حالياً.' : 'No customer-supplied materials recorded.'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {isAr ? 'عند استلام أقمشة لقصها أو تشغيلها للغير، ستظهر هنا كأمانة منفصلة.' : 'Received CMT fabrics for subcontracting will be tracked here.'}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCustomerMaterials.map((cm) => (
                <Card key={cm.id} className="border-amber-500/20 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500">{cm.customer_name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{cm.fabric_code}</span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{cm.fabric_name}</h5>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    {isAr ? 'كثافة النسيج:' : 'GSM:'} <strong className="text-slate-800 dark:text-slate-300 font-mono">{cm.gsm} GSM</strong> • {isAr ? 'العرض الصالح:' : 'Usable Width:'} <strong className="text-slate-800 dark:text-slate-300 font-mono">{cm.usable_width_meters} {isAr ? 'م' : 'm'}</strong>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-[10px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isAr ? 'المستلم' : 'Received'}</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{cm.received_meters} {isAr ? 'م' : 'm'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isAr ? 'المستهلك' : 'Consumed'}</span>
                      <strong className="font-mono text-sky-600 dark:text-sky-400">{cm.consumed_meters} {isAr ? 'م' : 'm'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isAr ? 'الهالك' : 'Scrap'}</span>
                      <strong className="font-mono text-rose-600 dark:text-rose-400">{cm.waste_meters} {isAr ? 'م' : 'm'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">{isAr ? 'المتبقي' : 'Remaining'}</span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{cm.remaining_meters} {isAr ? 'م' : 'm'}</strong>
                    </div>
                  </div>

                  {/* Actions Bar (Icons only) */}
                  <div className="flex items-center justify-between pt-2 border-t border-amber-500/15">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isAr ? 'أمانة تشغيل للغير' : 'Trust Custody'}
                    </span>
                    <div className="flex items-center gap-1 justify-end">
                      {/* 1. Consume / Cut */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCmtForConsume(cm);
                          setConsumeMeters('');
                          setWasteMeters('0');
                          setConsumeError(null);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-sky-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-all shadow-2xs cursor-pointer"
                        title={isAr ? 'صرف واستهلاك للقص' : 'Consume in Cutting'}
                      >
                        <Scissors className="w-3.5 h-3.5 text-sky-500" />
                      </button>

                      {/* 2. Fabric GSM Calculator */}
                      <button
                        type="button"
                        onClick={onOpenFabricCalcModal}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-teal-500/50 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50/50 dark:hover:bg-teal-950/30 transition-all shadow-2xs cursor-pointer"
                        title={isAr ? 'حاسبة تحويل الأقمشة (متر ↔ كجم)' : 'GSM Calculator'}
                      >
                        <Calculator className="w-3.5 h-3.5 text-teal-500" />
                      </button>

                      {/* 3. Print Thermal Barcode / Custody Card */}
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-2xs cursor-pointer"
                        title={isAr ? 'طباعة بطاقة إذن الأمانة' : 'Print CMT Card'}
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: IMMUTABLE STOCK LEDGER */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAr ? 'دفتر الأستاذ المخزني وسجل العمليات المحاسبية' : 'Immutable Stock Audit Ledger'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'سجل محاسبي غير قابل للتعديل يوثق كل إذن إضافة، صرف، جرد، أو تسوية' : 'Immutable tamper-proof ledger tracking all receipts, issues, counts, and transfers'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs border-transparent font-bold"
                onClick={() => setIsTransfersModalOpen(true)}
                icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
              >
                {isAr ? '+ تحويل مخزني' : '+ Stock Transfer'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsCountsModalOpen(true)}
                icon={<ClipboardCheck className="w-3.5 h-3.5 text-emerald-500" />}
              >
                {isAr ? 'جرد فعلي' : 'Stock Count'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                <tr>
                  <th className="py-2.5 px-4">{isAr ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'الصنف المخزني' : 'Item'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'نوع الحركة' : 'Tx Type'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'الاتجاه' : 'Direction'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'الكمية' : 'Quantity'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'قبل الحركة' : 'Before'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'بعد الحركة' : 'After'}</th>
                  <th className="py-2.5 px-4">{isAr ? 'المستند المرجعي' : 'Ref Document'}</th>
                  <th className="py-2.5 px-4 text-left">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center font-sans text-slate-400">
                      {isAr ? 'لا توجد حركات مسجلة في دفتر الأستاذ المخزني بعد.' : 'No movements recorded in the stock ledger yet.'}
                    </td>
                  </tr>
                ) : (
                  paginatedLedger.map((tx) => {
                    const matchedItem = inventoryItems.find((it) => it.code === tx.item_code || it.name === tx.item_name);
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-4 text-slate-400">{tx.created_at}</td>
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">{tx.item_name}</td>
                        <td className="py-2.5 px-4 font-sans">{getTxTypeBadge(tx.transaction_type, tx.reference_number)}</td>
                        <td className="py-2.5 px-4">
                          <Badge variant={tx.direction === 'IN' ? 'success' : 'danger'}>
                            {tx.direction}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{tx.quantity.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-slate-400">{tx.balance_before.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-emerald-400 font-bold">{tx.balance_after.toLocaleString()}</td>
                        <td className="py-2.5 px-4 text-indigo-500 dark:text-indigo-400 font-mono font-semibold">{tx.reference_number || '—'}</td>
                        <td className="py-2.5 px-4 text-left">
                          <div className="flex items-center gap-1 justify-end">
                            {/* 1. Stock Card */}
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedItem) {
                                  setSelectedStockCardItem(matchedItem);
                                } else {
                                  setSelectedStockCardItem({
                                    id: tx.id,
                                    name: tx.item_name,
                                    code: tx.item_code || 'ITEM',
                                    unit_of_measure: '',
                                    current_balance: tx.balance_after,
                                    average_cost: tx.unit_cost || 0,
                                    warehouse_id: '',
                                  } as any);
                                }
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'عرض كارت الصنف وسجل الحركات' : 'View Stock Card'}
                            >
                              <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            </button>

                            {/* 2. Print Voucher */}
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all shadow-2xs cursor-pointer"
                              title={isAr ? 'طباعة قيد الحركة المخزنية' : 'Print Movement Voucher'}
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
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
          {filteredLedger.length > perPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={ledgerPages}
                totalItems={filteredLedger.length}
                perPage={perPage}
                onPageChange={setCurrentPage}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      </div>
    )}

      {/* Batch 2 Modals */}
      <BranchesManagerModal
        isOpen={isBranchesModalOpen}
        onClose={() => setIsBranchesModalOpen(false)}
        isAr={isAr}
        onBranchUpdated={() => onRefreshData && onRefreshData()}
      />

      <WarehousesManagerModal
        isOpen={isWarehousesModalOpen}
        onClose={() => setIsWarehousesModalOpen(false)}
        isAr={isAr}
        onWarehouseUpdated={() => onRefreshData && onRefreshData()}
        onOpenTransfer={(sourceWhId) => {
          setIsWarehousesModalOpen(false);
          setSelectedTransferSourceWhId(sourceWhId);
          setIsTransfersModalOpen(true);
        }}
      />

      <StockTransferModal
        isOpen={isTransfersModalOpen}
        onClose={() => {
          setIsTransfersModalOpen(false);
          setSelectedTransferSourceWhId(undefined);
        }}
        warehouses={warehouses}
        branches={branches}
        items={inventoryItems}
        initialSourceWarehouseId={selectedTransferSourceWhId}
        isAr={isAr}
        onSuccess={() => onRefreshData && onRefreshData()}
      />

      <StockCountModal
        isOpen={isCountsModalOpen}
        onClose={() => setIsCountsModalOpen(false)}
        warehouses={warehouses}
        branches={branches}
        isAr={isAr}
        onSuccess={() => onRefreshData && onRefreshData()}
      />

      {selectedStockCardItem && (
        <StockCardModal
          isOpen={Boolean(selectedStockCardItem)}
          onClose={() => setSelectedStockCardItem(null)}
          itemId={selectedStockCardItem.id}
          itemName={selectedStockCardItem.name}
          isAr={isAr}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditInventoryItemModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onItemUpdated={(updated) => {
            if (onItemUpdated) onItemUpdated(updated);
            if (onRefreshData) onRefreshData();
          }}
          isAr={isAr}
        />
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <Modal
          isOpen={Boolean(deletingItem)}
          onClose={() => { if (!isDeleting) setDeletingItem(null); }}
          title={isAr ? 'تأكيد حذف كارت الصنف المخزني' : 'Confirm Delete Item'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {deleteError}
              </div>
            )}
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {isAr
                ? `هل أنت متأكد من رغبتك في حذف الصنف "${deletingItem.name}" (${deletingItem.code}) نهائياً من المستودع؟`
                : `Are you sure you want to delete item "${deletingItem.name}" (${deletingItem.code})?`}
            </p>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'الرصيد المخزني الحالي:' : 'Current Balance:'}</span>
                <strong className="font-mono text-slate-900 dark:text-white font-bold">{deletingItem.current_balance} {deletingItem.unit_of_measure}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'المستودع:' : 'Warehouse:'}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{deletingItem.warehouse_name || 'المستودع الرئيسي'}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDeletingItem(null)} disabled={isDeleting}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await api.inventory.deleteItem(deletingItem.id);
                    if (onItemDeleted) onItemDeleted(deletingItem.id);
                    if (onRefreshData) onRefreshData();
                    setDeletingItem(null);
                  } catch (err: any) {
                    setDeleteError(err.message || (isAr ? 'تعذر حذف الصنف لوجود رصيد حالي أو قيود سابقة.' : 'Failed to delete item.'));
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                icon={isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              >
                {isDeleting ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'تأكيد الحذف' : 'Confirm Delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Consume Customer Material */}
      {selectedCmtForConsume && (
        <Modal
          isOpen={Boolean(selectedCmtForConsume)}
          onClose={() => { if (!isConsuming) setSelectedCmtForConsume(null); }}
          title={isAr ? `صرف واستهلاك أمانة عميل: ${selectedCmtForConsume.customer_name}` : `Consume CMT Material`}
          maxWidth="md"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const cMeters = Number(consumeMeters);
              if (cMeters <= 0) {
                setConsumeError(isAr ? 'يرجى إدخال عدد أمتار صحيح أكبر من الصفر' : 'Please enter valid meters');
                return;
              }
              setIsConsuming(true);
              setConsumeError(null);
              try {
                await api.inventory.consumeCustomerMaterial(selectedCmtForConsume.id, {
                  consumed_meters: cMeters,
                  waste_meters: Number(wasteMeters) || 0,
                });
                if (onRefreshData) onRefreshData();
                setSelectedCmtForConsume(null);
              } catch (err: any) {
                setConsumeError(err.message || (isAr ? 'فشل تسجيل استهلاك الأمانة' : 'Failed to consume material'));
              } finally {
                setIsConsuming(false);
              }
            }}
            className="space-y-4 text-xs"
          >
            {consumeError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium">
                {consumeError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'اسم الخامة:' : 'Fabric:'}</span>
                <strong className="text-slate-900 dark:text-white font-bold">{selectedCmtForConsume.fabric_name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'الرصيد المتبقي بالأمانة:' : 'Remaining:'}</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{selectedCmtForConsume.remaining_meters} {isAr ? 'متر' : 'meters'}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'الأمتار المستهلكة (للقص/التشغيل)' : 'Consumed Meters'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCmtForConsume.remaining_meters}
                  required
                  value={consumeMeters}
                  onChange={(e) => setConsumeMeters(e.target.value)}
                  placeholder="0.00"
                  className="w-full font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'الهالك / العوادم (متر)' : 'Waste / Scrap Meters'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={wasteMeters}
                  onChange={(e) => setWasteMeters(e.target.value)}
                  placeholder="0.00"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCmtForConsume(null)} disabled={isConsuming}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold min-w-[120px]"
                disabled={isConsuming}
                icon={isConsuming ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
              >
                {isConsuming ? (isAr ? 'جاري الصرف...' : 'Processing...') : (isAr ? 'تأكيد صرف القماش' : 'Confirm Consumption')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditInventoryItemModal
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          item={editingItem}
          onItemUpdated={(updated) => {
            if (onItemUpdated) onItemUpdated(updated);
            if (onRefreshData) onRefreshData();
          }}
          isAr={isAr}
        />
      )}

      {/* Edit Branch Modal */}
      {editingBranch && (
        <Modal
          isOpen={Boolean(editingBranch)}
          onClose={() => { if (!isSavingBranch) setEditingBranch(null); }}
          title={isAr ? `تعديل بيانات الفرع: ${editingBranch.name}` : `Edit Branch: ${editingBranch.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveBranch} className="space-y-4 text-xs">
            {branchFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium">
                {branchFormError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'اسم الفرع / موقع العمل *' : 'Branch Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder={isAr ? 'مثال: فرع اكتوبر' : 'e.g. October Branch'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'كود الفرع *' : 'Branch Code *'}
                </label>
                <input
                  type="text"
                  required
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="BR-01"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'نوع موقع العمل' : 'Branch Type'}
                </label>
                <select
                  value={branchForm.type}
                  onChange={(e) => setBranchForm({ ...branchForm, type: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                >
                  <option value="factory">{isAr ? 'مصنع رئيسي' : 'Factory'}</option>
                  <option value="workshop">{isAr ? 'ورشة تصنيع' : 'Workshop'}</option>
                  <option value="outlet">{isAr ? 'صالة عرض / منفذ بيع' : 'Retail Outlet'}</option>
                  <option value="warehouse">{isAr ? 'مجمع مستودعات' : 'Warehouse Hub'}</option>
                  <option value="head_office">{isAr ? 'المقر الإداري' : 'Head Office'}</option>
                  <option value="cutting_center">{isAr ? 'مركز قص وتجهيز' : 'Cutting Center'}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'المدير / المسؤول' : 'Manager Name'}
                </label>
                <input
                  type="text"
                  value={branchForm.manager_name}
                  onChange={(e) => setBranchForm({ ...branchForm, manager_name: e.target.value })}
                  placeholder={isAr ? 'اسم المدير المسؤول' : 'Manager'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'رقم الهاتف / التواصل' : 'Phone'}
                </label>
                <input
                  type="text"
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'العنوان / الموقع' : 'Address'}
                </label>
                <input
                  type="text"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder={isAr ? 'المنطقة أو الحي...' : 'City, Street...'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="editBranchIsMain"
                checked={branchForm.is_main}
                onChange={(e) => setBranchForm({ ...branchForm, is_main: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="editBranchIsMain" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                {isAr ? 'تعيين هذا الموقع كمقر رئيسي للشركة (HQ)' : 'Set as Headquarter (HQ)'}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingBranch(null)} disabled={isSavingBranch}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[120px]"
                disabled={isSavingBranch}
                icon={isSavingBranch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              >
                {isSavingBranch ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Branch Confirmation Modal */}
      {deletingBranch && (
        <Modal
          isOpen={Boolean(deletingBranch)}
          onClose={() => { if (!isDeletingBranch) setDeletingBranch(null); }}
          title={isAr ? `تأكيد حذف الفرع: ${deletingBranch.name}` : `Confirm Delete Branch`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            {branchDeleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {branchDeleteError}
              </div>
            )}
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {isAr
                ? `هل أنت متأكد من رغبتك في حذف الفرع "${deletingBranch.name}" (${deletingBranch.code})؟`
                : `Are you sure you want to delete branch "${deletingBranch.name}" (${deletingBranch.code})?`}
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'كود الفرع:' : 'Code:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{deletingBranch.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'النوع:' : 'Type:'}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{branchTypeLabels[deletingBranch.type] || deletingBranch.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'المستودعات التابعة:' : 'Warehouses:'}</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {warehouses.filter((w) => w.branch_id === deletingBranch.id).length} {isAr ? 'مستودع' : 'warehouses'}
                </span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
              ⚠️ {isAr ? 'تنبيه: لا يمكن حذف فرع يحتوي على مستودعات مرتبطة به أو سجلات نشطة.' : 'Notice: Cannot delete a branch with linked warehouses.'}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDeletingBranch(null)} disabled={isDeletingBranch}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                disabled={isDeletingBranch}
                onClick={handleDeleteBranch}
                icon={isDeletingBranch ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              >
                {isDeletingBranch ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'تأكيد الحذف' : 'Confirm Delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Warehouse Modal */}
      {editingWarehouse && (
        <Modal
          isOpen={Boolean(editingWarehouse)}
          onClose={() => { if (!isSavingWarehouse) setEditingWarehouse(null); }}
          title={isAr ? `تعديل بيانات المستودع: ${editingWarehouse.name}` : `Edit Warehouse: ${editingWarehouse.name}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveWarehouse} className="space-y-4 text-xs">
            {warehouseFormError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium">
                {warehouseFormError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'اسم المستودع *' : 'Warehouse Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder={isAr ? 'مثال: مخزن الأقمشة الرئيسي' : 'e.g. Main Fabric Warehouse'}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'كود المستودع *' : 'Warehouse Code *'}
                </label>
                <input
                  type="text"
                  required
                  value={warehouseForm.code}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                  placeholder="WH-01"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'الفرع التابع له المستودع (ربط الفرع) *' : 'Linked Branch *'}
                </label>
                <select
                  value={warehouseForm.branch_id}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, branch_id: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-semibold"
                >
                  <option value="">{isAr ? 'بدون فرع محدد (مستودع عام)' : 'General (No Branch)'}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code}) — {branchTypeLabels[b.type] || b.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  {isAr ? 'نوع الصلاحية والتخزين' : 'Warehouse Type'}
                </label>
                <select
                  value={warehouseForm.type}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, type: e.target.value })}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
                >
                  <option value="fabric">{isAr ? 'مستودع أقمشة وغزول' : 'Fabric & Yarn'}</option>
                  <option value="raw_materials">{isAr ? 'خامات ومستلزمات عامة' : 'Raw Materials'}</option>
                  <option value="accessories">{isAr ? 'إكسسوارات ومستلزمات' : 'Accessories'}</option>
                  <option value="finished_goods">{isAr ? 'منتجات جاهزة للبيع' : 'Finished Goods'}</option>
                  <option value="wip">{isAr ? 'إنتاج تحت التشغيل (WIP)' : 'Work in Progress'}</option>
                  <option value="customer_deposits">{isAr ? 'أمانات عملاء (CMT)' : 'Customer Deposits'}</option>
                  <option value="returns">{isAr ? 'مرتجعات وهوالك' : 'Returns & Scrap'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                {isAr ? 'العنوان والموقع الفيزيائي' : 'Address / Location'}
              </label>
              <input
                type="text"
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
                placeholder={isAr ? 'العنبر، الصالة، أو الشارع...' : 'Building, Street...'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="editWhNegativeStock"
                checked={warehouseForm.allow_negative_stock}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, allow_negative_stock: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="editWhNegativeStock" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                {isAr ? 'السماح بالصرف بالسالب عند نفاذ الرصيد' : 'Allow negative stock'}
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingWarehouse(null)} disabled={isSavingWarehouse}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[120px]"
                disabled={isSavingWarehouse}
                icon={isSavingWarehouse ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              >
                {isSavingWarehouse ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Warehouse Confirmation Modal */}
      {deletingWarehouse && (
        <Modal
          isOpen={Boolean(deletingWarehouse)}
          onClose={() => { if (!isDeletingWarehouse) setDeletingWarehouse(null); }}
          title={isAr ? `تأكيد حذف المستودع: ${deletingWarehouse.name}` : `Confirm Delete Warehouse`}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            {warehouseDeleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                {warehouseDeleteError}
              </div>
            )}
            <p className="text-slate-700 dark:text-slate-300 font-medium">
              {isAr
                ? `هل أنت متأكد من رغبتك في حذف المستودع "${deletingWarehouse.name}" (${deletingWarehouse.code}) نهائياً؟`
                : `Are you sure you want to delete warehouse "${deletingWarehouse.name}" (${deletingWarehouse.code})?`}
            </p>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'كود المستودع:' : 'Code:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{deletingWarehouse.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'نوع المستودع:' : 'Type:'}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">{warehouseTypeLabels[deletingWarehouse.type] || deletingWarehouse.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'عدد الأصناف:' : 'Items Count:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{deletingWarehouse.items_count || 0}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
              ⚠️ {isAr ? 'تنبيه: لا يمكن حذف مستودع به أصناف أو أرصدة موجبة أو حركات تحويل مسجلة.' : 'Notice: Cannot delete a warehouse with recorded inventory items or ledger transactions.'}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setDeletingWarehouse(null)} disabled={isDeletingWarehouse}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                disabled={isDeletingWarehouse}
                onClick={handleDeleteWarehouse}
                icon={isDeletingWarehouse ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              >
                {isDeletingWarehouse ? (isAr ? 'جاري الحذف...' : 'Deleting...') : (isAr ? 'تأكيد الحذف' : 'Confirm Delete')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { ActionsMenu } from '../ui/ActionsMenu';
import { Pagination } from '../ui/Pagination';
import type { InventoryItem, Warehouse, CustomerMaterial, InventoryTransaction } from '../../types';

interface WarehouseManagerTabProps {
  inventoryItems: InventoryItem[];
  warehouses: Warehouse[];
  customerMaterials: CustomerMaterial[];
  stockLedger: InventoryTransaction[];
  onOpenCreateItemModal: () => void;
  onOpenStockMovementModal: (item: InventoryItem) => void;
  onOpenFabricCalcModal: () => void;
  onOpenReceiveCustomerMatModal: () => void;
  onOpenBarcodeLabelModal: (item: InventoryItem) => void;
  onRefreshData?: () => void;
  isLoading?: boolean;
  isAr?: boolean;
}

export const WarehouseManagerTab: React.FC<WarehouseManagerTabProps> = ({
  inventoryItems,
  warehouses,
  customerMaterials,
  stockLedger,
  onOpenCreateItemModal,
  onOpenStockMovementModal,
  onOpenFabricCalcModal,
  onOpenReceiveCustomerMatModal,
  onOpenBarcodeLabelModal,
  onRefreshData,
  isLoading = false,
  isAr = true,
}) => {
  // Main Sub-Tab: 'raw_materials' | 'finished_goods' | 'customer_cmt' | 'ledger'
  const [subTab, setSubTab] = useState<'raw_materials' | 'finished_goods' | 'customer_cmt' | 'ledger'>('raw_materials');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const perPage = 15;

  // Raw materials items
  const rawMaterialItems = useMemo(() => {
    return inventoryItems.filter((it) => {
      const type = (it.item_type || '').toLowerCase();
      return ['fabric_raw', 'fabric', 'accessory_raw', 'accessory', 'packaging', 'yarn', 'thread', 'trims'].includes(type) || !type.includes('finished');
    });
  }, [inventoryItems]);

  // Finished goods items
  const finishedGoodsItems = useMemo(() => {
    return inventoryItems.filter((it) => {
      const type = (it.item_type || '').toLowerCase();
      return ['finished_good', 'finished_product'].includes(type) || it.variant_id !== undefined;
    });
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

  // Summary Metrics
  const metrics = useMemo(() => {
    const rawValuation = rawMaterialItems.reduce((acc, it) => acc + (it.current_balance * (it.average_cost || 0)), 0);
    const finishedPieces = finishedGoodsItems.reduce((acc, it) => acc + it.current_balance, 0);
    const lowStockItems = inventoryItems.filter((it) => it.current_balance <= (it.reorder_level || 0)).length;
    const cmtMeters = customerMaterials.reduce((acc, cm) => acc + (cm.remaining_meters || 0), 0);
    return {
      rawValuation,
      finishedPieces,
      lowStockItems,
      cmtMeters,
    };
  }, [rawMaterialItems, finishedGoodsItems, inventoryItems, customerMaterials]);

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
  }, [subTab, rawMaterialItems, finishedGoodsItems, selectedWarehouseId, selectedZoneFilter, searchQuery]);

  const totalPages = Math.ceil(currentDataset.length / perPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return currentDataset.slice(start, start + perPage);
  }, [currentDataset, currentPage, perPage]);

  // Ledger filtered
  const filteredLedger = useMemo(() => {
    if (subTab !== 'ledger') return [];
    if (!searchQuery.trim()) return stockLedger;
    const q = searchQuery.toLowerCase().trim();
    return stockLedger.filter((tx) =>
      (tx.item_code || '').toLowerCase().includes(q) ||
      (tx.item_name || '').toLowerCase().includes(q) ||
      (tx.reference_number || '').toLowerCase().includes(q)
    );
  }, [subTab, stockLedger, searchQuery]);

  const ledgerPages = Math.ceil(filteredLedger.length / perPage) || 1;
  const paginatedLedger = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredLedger.slice(start, start + perPage);
  }, [filteredLedger, currentPage, perPage]);

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Page Header */}
      <PageHeader
        title={isAr ? 'إدارة المستودعات والتخزين الفيزيائي المنفصل' : 'Warehouses & Segregated Inventory'}
        subtitle={isAr
          ? 'فصل تام بين خامات ومستلزمات الإنتاج وبضاعة تامة الصنع، مع تتبع مواضع الرفوف (Rack/Shelf/Bin) وأمانات خامات العملاء.'
          : 'Segregated raw materials vs finished goods with rack/shelf coordinates and immutable stock ledger.'}
        icon={<Boxes className="w-5 h-5" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'المخازن والمستودعات' : 'Inventory & Storage' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenFabricCalcModal}
              icon={<Calculator className="w-3.5 h-3.5 text-indigo-400" />}
            >
              {isAr ? 'حاسبة الـ GSM' : 'Fabric Calc'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenReceiveCustomerMatModal}
              icon={<Layers className="w-3.5 h-3.5 text-amber-500" />}
            >
              {isAr ? 'استلام أمانة عميل' : 'Receive CMT'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenCreateItemModal}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? '+ تعريف صنف وموضع رف' : '+ New Item & Bin'}
            </Button>
            {onRefreshData && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefreshData}
                disabled={isLoading}
                icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              >
                {isAr ? 'تحديث' : 'Sync'}
              </Button>
            )}
          </div>
        }
      />

      {/* Top Industrial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{isAr ? 'تقييم مخزون الخامات' : 'Raw Materials Valuation'}</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
            {metrics.rawValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {rawMaterialItems.length} {isAr ? 'صنف خامة ومستلزمات' : 'raw material items'}
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{isAr ? 'إجمالي المنتجات الجاهزة' : 'Finished Goods Stock'}</span>
            <Shirt className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
            {metrics.finishedPieces.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'قطعة جاهزة' : 'pcs'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {finishedGoodsItems.length} {isAr ? 'موديل ومتغير متاح' : 'SKUs in warehouse'}
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{isAr ? 'تنبيهات انخفاض الرصيد' : 'Low Stock Alerts'}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`font-mono text-lg font-bold ${metrics.lowStockItems > 0 ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
            {metrics.lowStockItems} <span className="text-xs font-normal text-slate-400">{isAr ? 'أصناف بلغت حد الطلب' : 'items'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isAr ? 'تتطلب إصدار أمر توريد PO' : 'Requires procurement'}
          </div>
        </Card>

        <Card className="p-3.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span>{isAr ? 'أمانات خامات العملاء' : 'Customer CMT Fabric'}</span>
            <Building2 className="w-4 h-4 text-sky-500" />
          </div>
          <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
            {metrics.cmtMeters.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'متر أمانة' : 'meters'}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {customerMaterials.length} {isAr ? 'إذن أمانة تشغيل للغير' : 'custody records'}
          </div>
        </Card>
      </div>

      {/* Segregated Workspace Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setSubTab('raw_materials'); setCurrentPage(1); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              subTab === 'raw_materials'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-slate-50/50 dark:bg-slate-800/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'مستودع الخامات ومستلزمات الإنتاج' : 'Raw Materials & Trims'}</span>
            <span className="text-[10px] font-mono py-0.5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {rawMaterialItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSubTab('finished_goods'); setCurrentPage(1); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              subTab === 'finished_goods'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-slate-50/50 dark:bg-slate-800/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shirt className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'مستودع المنتجات تامة الصنع (جاهز للبيع)' : 'Finished Goods & POS Ready'}</span>
            <span className="text-[10px] font-mono py-0.5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {finishedGoodsItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSubTab('customer_cmt'); setCurrentPage(1); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              subTab === 'customer_cmt'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-slate-50/50 dark:bg-slate-800/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-sky-500" />
            <span>{isAr ? 'أمانات خامات العملاء (CMT Custody)' : 'Customer CMT Fabric'}</span>
            <span className="text-[10px] font-mono py-0.5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {customerMaterials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => { setSubTab('ledger'); setCurrentPage(1); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              subTab === 'ledger'
                ? 'border-[var(--brand-primary)] text-[var(--brand-primary)] bg-slate-50/50 dark:bg-slate-800/40'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span>{isAr ? 'دفتر الأستاذ المخزني (Immutable Audit Ledger)' : 'Stock Ledger Audit'}</span>
            <span className="text-[10px] font-mono py-0.5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {stockLedger.length}
            </span>
          </button>
        </div>
      </div>

      {/* Filters & Search Toolbar (Applicable to Raw & Finished Goods) */}
      {(subTab === 'raw_materials' || subTab === 'finished_goods' || subTab === 'ledger') && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 max-w-sm w-full relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder={isAr ? 'بحث بالكود، الاسم، موضع الرف، أو رقم المستند...' : 'Search code, name, rack/shelf, or ref...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs py-2 pr-9 pl-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Warehouse Filter */}
            <select
              value={selectedWarehouseId}
              onChange={(e) => { setSelectedWarehouseId(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs py-1.5 px-3 text-slate-900 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{isAr ? 'كل المستودعات' : 'All Warehouses'}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            {/* Zone Filter */}
            {availableZones.length > 0 && (
              <select
                value={selectedZoneFilter}
                onChange={(e) => { setSelectedZoneFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs py-1.5 px-3 text-slate-900 dark:text-slate-200 focus:outline-none"
              >
                <option value="all">{isAr ? 'كل المناطق (All Zones)' : 'All Zones'}</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: RAW MATERIALS TABLE */}
      {subTab === 'raw_materials' && (
        <Card className="overflow-hidden p-0 border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">كود الخامة</th>
                  <th className="py-3 px-4">اسم الخامة ومواصفات النسيج</th>
                  <th className="py-3 px-4">المستودع وموضع الرف (Location)</th>
                  <th className="py-3 px-4">الرصيد المتاح</th>
                  <th className="py-3 px-4">متوسط التكلفة</th>
                  <th className="py-3 px-4">إجمالي القيمة</th>
                  <th className="py-3 px-4">حالة الرصيد</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {currentDataset.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold">{isAr ? 'لا توجد خامات ومستلزمات إنتاج مسجلة حالياً.' : 'No raw materials recorded.'}</span>
                        <span className="text-[11px] text-slate-400">
                          {isAr ? 'اضغط على "+ تعريف صنف وموضع رف" لإضافة أول كارت خامة.' : 'Click "+ New Item & Bin" to register a fabric or trim.'}
                        </span>
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
                              GSM: {item.technical_specs.gsm} جم/م² • عرض: {item.technical_specs.usable_width_meters} م {item.technical_specs.roll_count ? `• ${item.technical_specs.roll_count} ثوب` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-mono font-semibold">{rack} / {bin}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.warehouse_name || 'المستودع الرئيسي'} {zone ? `(${zone})` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {item.current_balance.toLocaleString()} {item.unit_of_measure}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                          {item.average_cost.toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-3 px-4">
                          {isLow ? (
                            <Badge variant="danger">{isAr ? 'منخفض (إعادة طلب)' : 'Reorder Alert'}</Badge>
                          ) : (
                            <Badge variant="success">{isAr ? 'متوفر' : 'In Stock'}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => onOpenStockMovementModal(item)}
                            >
                              {isAr ? 'حركة' : 'Move'}
                            </Button>
                            <ActionsMenu
                              variant="icon-horizontal"
                              items={[
                                {
                                  id: 'barcode',
                                  label: isAr ? 'طباعة باركود الرف الحراري' : 'Print Thermal Shelf Barcode',
                                  icon: <Printer className="w-3.5 h-3.5" />,
                                  onClick: () => onOpenBarcodeLabelModal(item),
                                },
                                {
                                  id: 'movement',
                                  label: isAr ? 'تسجيل حركة مخزنية سريعة' : 'Record Stock Movement',
                                  icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
                                  onClick: () => onOpenStockMovementModal(item),
                                },
                                {
                                  id: 'calc',
                                  label: isAr ? 'حاسبة تحويل الأقمشة (متر ↔ كجم)' : 'Fabric GSM Calculator',
                                  icon: <Calculator className="w-3.5 h-3.5" />,
                                  onClick: onOpenFabricCalcModal,
                                },
                              ]}
                            />
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
        </Card>
      )}

      {/* VIEW 2: FINISHED GOODS TABLE */}
      {subTab === 'finished_goods' && (
        <Card className="overflow-hidden p-0 border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3 px-4">كود الصنف / SKU</th>
                  <th className="py-3 px-4">اسم الموديل والمتغير (Color/Size)</th>
                  <th className="py-3 px-4">موضع الرف (Rack/Bin)</th>
                  <th className="py-3 px-4">الرصيد الفعلي</th>
                  <th className="py-3 px-4">المحجوز للطلبات</th>
                  <th className="py-3 px-4">المتاح للبيع (POS & Web)</th>
                  <th className="py-3 px-4">سعر التكلفة</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                {currentDataset.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Shirt className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                        <span className="font-semibold">{isAr ? 'لا توجد منتجات تامة الصنع مسجلة بالمستودع حالياً.' : 'No finished goods in inventory.'}</span>
                        <span className="text-[11px] text-slate-400">
                          {isAr ? 'يتم توريد المنتجات تامة الصنع آلياً عند اعتماد فحص الجودة QC أو بإضافتها يدوياً.' : 'Finished goods are auto-stocked upon QC acceptance or manual entry.'}
                        </span>
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
                              {item.variant.color_name || 'عام'} • {item.variant.size_name || 'عام'} • SKU: {item.variant.sku}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="font-mono font-semibold">{rack} / {bin}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.warehouse_name || 'مستودع المعرض والبيع'}
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
                          {item.average_cost.toFixed(2)} ج.م
                        </td>
                        <td className="py-3 px-4 text-left">
                          <div className="flex items-center gap-1.5 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => onOpenBarcodeLabelModal(item)}
                              icon={<Printer className="w-3 h-3" />}
                            >
                              {isAr ? 'ملصق' : 'Label'}
                            </Button>
                            <ActionsMenu
                              variant="icon-horizontal"
                              items={[
                                {
                                  id: 'barcode',
                                  label: isAr ? 'طباعة ملصق الباركود الحراري' : 'Print Thermal Barcode',
                                  icon: <Printer className="w-3.5 h-3.5" />,
                                  onClick: () => onOpenBarcodeLabelModal(item),
                                },
                                {
                                  id: 'movement',
                                  label: isAr ? 'تسجيل حركة تسوية أو صرف' : 'Record Stock Adjustment',
                                  icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
                                  onClick: () => onOpenStockMovementModal(item),
                                },
                              ]}
                            />
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
        </Card>
      )}

      {/* VIEW 3: CUSTOMER CMT CUSTODY */}
      {subTab === 'customer_cmt' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">أرصدة خامات العملاء (أمانات تشغيل للغير)</h4>
              <p className="text-xs text-slate-400">خامات لا تسجل كأصول للمصنع ولا تدخل ضمن حسابات تكلفة البضاعة المباعة</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenReceiveCustomerMatModal}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? 'استلام أمانة عميل جديدة' : 'New CMT Custody'}
            </Button>
          </div>

          {customerMaterials.length === 0 ? (
            <Card className="p-12 text-center text-slate-400">
              <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <div className="font-semibold text-slate-700 dark:text-slate-300">لا توجد أمانات خامات عملاء مسجلة حالياً.</div>
              <div className="text-xs text-slate-400 mt-1">عند استلام أقمشة لقصها أو تشغيلها للغير، ستظهر هنا كأمانة منفصلة.</div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customerMaterials.map((cm) => (
                <Card key={cm.id} className="border-amber-500/20 bg-amber-500/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500">{cm.customer_name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{cm.fabric_code}</span>
                  </div>
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-white">{cm.fabric_name}</h5>
                  <div className="text-[11px] text-slate-400">
                    كثافة النسيج: <strong className="text-slate-300 font-mono">{cm.gsm} GSM</strong> • العرض الصالح: <strong className="text-slate-300 font-mono">{cm.usable_width_meters} م</strong>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 block">المستلم</span>
                      <strong className="font-mono text-slate-200">{cm.received_meters} م</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المستهلك</span>
                      <strong className="font-mono text-sky-400">{cm.consumed_meters} م</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">الهالك</span>
                      <strong className="font-mono text-rose-400">{cm.waste_meters} م</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">المتبقي</span>
                      <strong className="font-mono text-emerald-400 font-bold">{cm.remaining_meters} م</strong>
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
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                <tr>
                  <th className="py-2.5 px-4">الوقت والتاريخ</th>
                  <th className="py-2.5 px-4">الصنف المخزني</th>
                  <th className="py-2.5 px-4">نوع الحركة</th>
                  <th className="py-2.5 px-4">الاتجاه</th>
                  <th className="py-2.5 px-4">الكمية</th>
                  <th className="py-2.5 px-4">قبل الحركة</th>
                  <th className="py-2.5 px-4">بعد الحركة</th>
                  <th className="py-2.5 px-4">المستند المرجعي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center font-sans text-slate-400">
                      لا توجد حركات مسجلة في دفتر الأستاذ المخزني بعد.
                    </td>
                  </tr>
                ) : (
                  paginatedLedger.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/20">
                      <td className="py-2.5 px-4 text-slate-400">{tx.created_at}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">{tx.item_name}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-300">{tx.transaction_type}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={tx.direction === 'IN' ? 'success' : 'danger'}>
                          {tx.direction}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{tx.quantity.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-slate-400">{tx.balance_before.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-emerald-400 font-bold">{tx.balance_after.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-indigo-400">{tx.reference_number || '—'}</td>
                    </tr>
                  ))
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
        </Card>
      )}
    </div>
  );
};

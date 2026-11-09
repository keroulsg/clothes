import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  Calculator,
  Plus,
  Printer,
  Save,
  ShieldCheck,
  CheckCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  FileSpreadsheet,
  Check,
  Layers,
  Shirt,
  Boxes,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Warehouse, Branch } from '../../types';

interface StockCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  branches?: Branch[];
  onCountCompleted?: () => void;
  onSuccess?: () => void;
  isAr?: boolean;
}

export const StockCountModal: React.FC<StockCountModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  branches,
  onCountCompleted,
  onSuccess,
  isAr = true,
}) => {
  const [counts, setCounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCount, setActiveCount] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);

  // New Count Form
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [countCategory, setCountCategory] = useState<'all' | 'raw_materials' | 'finished_goods'>('all');
  const [countDate, setCountDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active Count Items State
  const [itemsEdits, setItemsEdits] = useState<Record<string, number>>({});

  const fetchCounts = async () => {
    setIsLoading(true);
    try {
      const res = await api.inventory.getCounts();
      setCounts(res.data || []);
    } catch (err: any) {
      console.error('Error fetching stock counts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCounts();
      setIsCreating(false);
      setActiveCount(null);
      setIsPrintMode(false);
      setErrorMsg('');
      if (warehouses.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(warehouses[0].id);
      }
    }
  }, [isOpen]);

  const handleCreateCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouseId) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      const res = await api.inventory.createCount({
        warehouse_id: selectedWarehouseId,
        count_date: countDate,
        category: countCategory === 'all' ? undefined : countCategory,
        notes: notes.trim()
          ? `${countCategory !== 'all' ? `[نطاق: ${countCategory === 'raw_materials' ? 'خامات ومستلزمات' : 'منتجات جاهزة'}] ` : ''}${notes.trim()}`
          : undefined,
      });

      await fetchCounts();
      setIsCreating(false);
      setNotes('');
      await loadCountDetails(res.stock_count.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating count session');
    } finally {
      setIsSaving(false);
    }
  };

  const loadCountDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await api.request<any>(`/inventory/counts/${id}`);
      setActiveCount(res.stock_count);
      const initialEdits: Record<string, number> = {};
      (res.stock_count.items || []).forEach((it: any) => {
        initialEdits[it.id] = Number(it.physical_quantity);
      });
      setItemsEdits(initialEdits);
    } catch (err: any) {
      console.error('Error loading count details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Match All or Single Item
  const handleQuickMatchSingle = (itemId: string, systemQty: number) => {
    setItemsEdits((prev) => ({
      ...prev,
      [itemId]: systemQty,
    }));
  };

  const handleQuickMatchAll = () => {
    if (!activeCount || !activeCount.items) return;
    const matchedEdits: Record<string, number> = {};
    activeCount.items.forEach((it: any) => {
      matchedEdits[it.id] = Number(it.system_quantity);
    });
    setItemsEdits(matchedEdits);
  };

  const handleSavePhysicalCounts = async () => {
    if (!activeCount) return;
    setIsSaving(true);
    setErrorMsg('');

    const payloadItems = Object.entries(itemsEdits).map(([itemId, qty]) => ({
      item_id: itemId,
      physical_quantity: Number(qty),
    }));

    try {
      await api.inventory.recordCount(activeCount.id, payloadItems);
      await loadCountDetails(activeCount.id);
      alert(isAr ? 'تم حفظ الكميات الفعلية للجرد واحتساب الفروقات بنجاح.' : 'Physical counts saved successfully.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving counts');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAdjustments = async () => {
    if (!activeCount) return;
    if (
      !window.confirm(
        isAr
          ? 'تنبيه مالي ومخزني: هل أنت متأكد من اعتماد محضر الجرد وترحيل كافة التسويات رسمياً إلى دفتر الأستاذ المخزني الدائم؟'
          : 'Are you sure you want to approve and post stock adjustments to the ledger?'
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      await api.inventory.approveCount(activeCount.id);
      await loadCountDetails(activeCount.id);
      await fetchCounts();
      if (onCountCompleted) onCountCompleted();
      if (onSuccess) onSuccess();
      alert(isAr ? 'تم اعتماد الجرد وترحيل قيود التسوية المخزنية وتعديل الأرصدة بنجاح.' : 'Count adjustments approved and posted.');
    } catch (err: any) {
      alert(err.message || 'Error approving count');
    } finally {
      setIsSaving(false);
    }
  };

  // Dynamic Statistics
  const countStats = useMemo(() => {
    if (!activeCount || !activeCount.items) {
      return { total: 0, matched: 0, deficit: 0, surplus: 0, netVarianceValue: 0 };
    }
    let total = activeCount.items.length;
    let matched = 0;
    let deficit = 0;
    let surplus = 0;
    let netVarianceValue = 0;

    activeCount.items.forEach((it: any) => {
      const currentPhys = itemsEdits[it.id] !== undefined ? itemsEdits[it.id] : Number(it.physical_quantity);
      const diff = roundNumber(currentPhys - Number(it.system_quantity));
      const cost = Number(it.unit_cost) || 0;
      const val = diff * cost;
      netVarianceValue += val;

      if (diff === 0) matched++;
      else if (diff < 0) deficit++;
      else surplus++;
    });

    return { total, matched, deficit, surplus, netVarianceValue: roundNumber(netVarianceValue) };
  }, [activeCount, itemsEdits]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'الجرد الفعلي للمخازن ومحاضر التسويات (Physical Stock Counts)' : 'Physical Stock Counts'}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Printable View */}
        {isPrintMode && activeCount && (
          <div className="p-6 md:p-8 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-xl space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (Hidden in Print) */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary-600" />
                <span className="font-bold text-sm text-slate-800 dark:text-white">
                  {isAr ? 'معاينة محضر الجرد الرسمي للطباعة' : 'Stock Count Report Preview'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => window.print()} variant="primary" size="sm" className="font-bold shadow-xs">
                  <Printer className="w-4 h-4 mr-1.5" />
                  {isAr ? 'طباعة المحضر' : 'Print Report'}
                </Button>
                <Button onClick={() => setIsPrintMode(false)} variant="outline" size="sm">
                  {isAr ? 'عودة لشاشة العمل' : 'Back'}
                </Button>
              </div>
            </div>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold">GarmentOS ERP — Inventory Control & Audit</div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                    {isAr ? 'محضر الجرد الفعلي وتسوية فروقات المخزون' : 'Physical Inventory Count & Discrepancy Sheet'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'وثيقة رسمية معتمدة لمطابقة الرصيد الدفتري والفعلي وترحيل التسويات' : 'Official certified stock count discrepancy sheet'}
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono">
                  <div className="text-xs text-slate-500">{isAr ? 'رقم المحضر:' : 'Count #:'}</div>
                  <div className="text-lg font-black text-primary-700 dark:text-primary-400">
                    {activeCount.count_number}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {isAr ? 'تاريخ الجرد:' : 'Date:'} {activeCount.count_date}
                  </div>
                </div>
              </div>
            </div>

            {/* Session Metadata Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-500 block text-[11px]">{isAr ? 'المستودع موضع الجرد:' : 'Warehouse:'}</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">{activeCount.warehouse?.name}</span>
                <span className="text-[10px] text-slate-500 font-mono block">({activeCount.warehouse?.code})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{isAr ? 'الفرع / المنشأة:' : 'Branch:'}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeCount.warehouse?.branch?.name || (isAr ? 'الفرع الرئيسي' : 'Main Branch')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">{isAr ? 'حالة الاعتماد:' : 'Status:'}</span>
                <Badge variant={activeCount.status === 'approved' ? 'success' : 'warning'}>
                  {activeCount.status === 'approved' ? (isAr ? 'معتمد ومرحل للأستاذ' : 'Approved & Posted') : (isAr ? 'مسودة قيد الحصر' : 'In Progress')}
                </Badge>
              </div>
            </div>

            {/* Summary Statistics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border rounded-xl">
                <div className="text-[11px] text-slate-500">{isAr ? 'إجمالي الأصناف' : 'Total Items'}</div>
                <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">{countStats.total}</div>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{isAr ? 'مطابق تماماً' : 'Matched'}</div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{countStats.matched}</div>
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="text-[11px] text-red-700 dark:text-red-400">{isAr ? 'أصناف بها عجز' : 'Deficit'}</div>
                <div className="text-base font-black text-red-700 dark:text-red-300 mt-0.5">{countStats.deficit}</div>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <div className="text-[11px] text-blue-700 dark:text-blue-400">{isAr ? 'أصناف بها زيادة' : 'Surplus'}</div>
                <div className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">{countStats.surplus}</div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl col-span-2 sm:col-span-1">
                <div className="text-[11px] text-amber-800 dark:text-amber-400">{isAr ? 'صافي أثر الفارق المالي' : 'Net Variance Value'}</div>
                <div className={`text-base font-black font-mono mt-0.5 ${countStats.netVarianceValue < 0 ? 'text-red-600' : countStats.netVarianceValue > 0 ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                  {countStats.netVarianceValue > 0 ? `+${countStats.netVarianceValue.toLocaleString()}` : countStats.netVarianceValue.toLocaleString()} ج.م
                </div>
              </div>
            </div>

            {/* Discrepancies Table */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">{isAr ? 'كود الصنف' : 'Code'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'اسم الصنف والمواصفات' : 'Item Description'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الرصيد الدفتري' : 'System'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الرصيد الفعلي' : 'Physical'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'فارق الكمية' : 'Qty Variance'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'متوسط التكلفة' : 'Unit Cost'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'القيمة المالية للفارق' : 'Variance Value'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {(activeCount.items || []).map((it: any, i: number) => {
                    const currentPhys = itemsEdits[it.id] !== undefined ? itemsEdits[it.id] : Number(it.physical_quantity);
                    const diff = roundNumber(currentPhys - Number(it.system_quantity));
                    const cost = Number(it.unit_cost) || 0;
                    const val = roundNumber(diff * cost);

                    return (
                      <tr key={it.id || i} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-center font-mono">{i + 1}</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-white">
                          {it.inventory_item?.code || '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {it.inventory_item?.name || '—'}
                          {it.inventory_item?.rack_location && (
                            <span className="text-[10px] text-slate-500 font-mono block">
                              📍 {it.inventory_item.rack_location}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-center text-slate-700 dark:text-slate-300">
                          {Number(it.system_quantity).toLocaleString()} {it.inventory_item?.unit_of_measure}
                        </td>
                        <td className="py-2 px-3 font-mono font-black text-center text-slate-900 dark:text-white">
                          {Number(currentPhys).toLocaleString()} {it.inventory_item?.unit_of_measure}
                        </td>
                        <td className={`py-2 px-3 font-mono font-bold text-center ${diff < 0 ? 'text-red-600 bg-red-50/40 dark:bg-red-950/20' : diff > 0 ? 'text-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20' : 'text-slate-400'}`}>
                          {diff > 0 ? `+${diff}` : diff} {it.inventory_item?.unit_of_measure}
                        </td>
                        <td className="py-2 px-3 font-mono text-center text-slate-600 dark:text-slate-400">
                          {cost.toFixed(2)} ج.م
                        </td>
                        <td className={`py-2 px-3 font-mono font-bold text-center ${val < 0 ? 'text-red-600 font-black' : val > 0 ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>
                          {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)} ج.م
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Official 3 Signature Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-center text-xs text-slate-700 dark:text-slate-300 border-t-2 border-slate-200 dark:border-slate-700 mt-6">
              <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? 'عضو / رئيس لجنة الجرد الفعلي' : 'Stock Count Inspector'}</div>
                <div className="text-[10px] text-slate-500 mb-8">{isAr ? '(إقرار بصحة الحصر والعد الفيزيائي)' : '(Verification Signature)'}</div>
                <div className="border-b border-dotted border-slate-400 w-36 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع والاسم ثلاثي' : 'Sign & Name'}</div>
              </div>

              <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? 'أمين المستودع المسؤول' : 'Storekeeper in Charge'}</div>
                <div className="text-[10px] text-slate-500 mb-8">{isAr ? '(إقرار بالعلم بنتيجة الجرد والفروقات)' : '(Storekeeper Acknowledgment)'}</div>
                <div className="border-b border-dotted border-slate-400 w-36 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع والاسم ثلاثي' : 'Sign & Name'}</div>
              </div>

              <div className="p-4 border rounded-xl bg-slate-50/40 dark:bg-slate-800/30">
                <div className="font-bold text-sm text-slate-900 dark:text-white">{isAr ? 'رئيس الحسابات / المدير المالي والعام' : 'Financial Controller / GM'}</div>
                <div className="text-[10px] text-slate-500 mb-8">{isAr ? '(اعتماد التسوية والترحيل لدفتر الأستاذ)' : '(Ledger Adjustment Approval)'}</div>
                <div className="border-b border-dotted border-slate-400 w-36 mx-auto mb-1"></div>
                <div className="text-[10px] text-slate-400 font-mono">{isAr ? 'التوقيع وخاتم الاعتماد' : 'Signature & Official Stamp'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Top Controls */}
        {!isPrintMode && !activeCount && (
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500">
              {isAr ? 'جلسات الجرد المنفذة:' : 'Count Sessions:'} <span className="font-bold text-slate-800 dark:text-white">{counts.length}</span>
            </div>
            {!isCreating && (
              <Button
                onClick={() => setIsCreating(true)}
                variant="primary"
                size="sm"
                className="flex items-center gap-1.5 font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'فتح جلسة جرد جديدة' : 'New Count Session'}</span>
              </Button>
            )}
          </div>
        )}

        {/* Create Count Form */}
        {isCreating && !activeCount && !isPrintMode && (
          <Card className="p-5 border-2 border-primary-500/30 bg-primary-50/10 dark:bg-primary-950/20 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary-600" />
              <span>{isAr ? 'فتح جلسة جرد مخزني وتثبيت الأرصدة الدفترية' : 'Start Stock Count'}</span>
            </h4>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-600 rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCount} className="space-y-4">
              {/* Category Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  {isAr ? 'نطاق وتصنيف الجرد المراد تنفيذه: *' : 'Stock Count Scope / Category: *'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCountCategory('all')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      countCategory === 'all'
                        ? 'border-primary-600 bg-primary-50/60 dark:bg-primary-950/40 text-primary-900 dark:text-primary-200 ring-1 ring-primary-600'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isAr ? 'جرد شامل لكافة الأصناف' : 'All Items'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{isAr ? 'حصر الخامات والمنتجات معاً' : 'Complete warehouse audit'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCountCategory('raw_materials')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      countCategory === 'raw_materials'
                        ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-1 ring-amber-600'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isAr ? 'خامات ومستلزمات إنتاج فقط' : 'Raw Materials Only'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{isAr ? 'أقمشة، خيوط، أزرار، إكسسوار' : 'Fabrics, trims & threads'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCountCategory('finished_goods')}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-right transition-all cursor-pointer ${
                      countCategory === 'finished_goods'
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <Shirt className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold">{isAr ? 'منتجات تامة الصنع فقط' : 'Finished Goods Only'}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{isAr ? 'بضاعة جاهزة للبيع والتسليم' : 'Ready apparel & inventory'}</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Warehouse Selection & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المستودع المراد جرده *' : 'Warehouse *'}
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                    required
                  >
                    {branches && branches.length > 0 ? (
                      branches.map((b) => {
                        const bWarehouses = warehouses.filter((w) => w.branch_id === b.id);
                        if (bWarehouses.length === 0) return null;
                        return (
                          <optgroup key={b.id} label={`🏢 فرع: ${b.name} (${b.code})`}>
                            {bWarehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name} ({w.code})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    ) : null}
                    {/* Unassigned warehouses */}
                    {warehouses.filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id)).length > 0 && (
                      <optgroup label={branches && branches.length > 0 ? (isAr ? 'مستودعات عامة' : 'General Warehouses') : ''}>
                        {warehouses
                          .filter((w) => !w.branch_id || !branches?.some((b) => b.id === w.branch_id))
                          .map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name} ({w.code})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'تاريخ الجرد الرسمي' : 'Count Date'}
                  </label>
                  <input
                    type="date"
                    value={countDate}
                    onChange={(e) => setCountDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'ملاحظات وتوجيهات لجنة الجرد' : 'Count Notes'}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: جرد نهاية الربع الأول لقسم الأقمشة والغزول' : 'e.g. Q1 Fabric count'}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(false)}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={isSaving} className="font-bold">
                  {isSaving ? (isAr ? 'جارِ فتح الجلسة وتثبيت الأرصدة...' : 'Creating...') : (isAr ? 'بدء الجرد وتثبيت الأرصدة الدفترية' : 'Start Count')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Count Details / Active Workspace */}
        {activeCount && !isPrintMode && (
          <div className="space-y-4">
            {/* Session Header Card */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {activeCount.count_number}
                  </h4>
                  <Badge variant={activeCount.status === 'approved' ? 'success' : 'warning'}>
                    {activeCount.status === 'approved' ? (isAr ? 'معتمد ومرحل' : 'Approved') : (isAr ? 'قيد الجرد والتسجيل' : 'In Progress')}
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>🏢 {activeCount.warehouse?.name}</span>
                  <span>•</span>
                  <span>📅 {activeCount.count_date}</span>
                  {activeCount.notes && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{activeCount.notes}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setIsPrintMode(true)} variant="outline" size="sm" className="text-xs">
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  {isAr ? 'طباعة المحضر' : 'Print'}
                </Button>

                {activeCount.status !== 'approved' && (
                  <>
                    <Button onClick={handleQuickMatchAll} variant="outline" size="sm" className="text-xs" title={isAr ? 'تعيين كافة الأرصدة الفعلية لتطابق الدفتري' : 'Quick match all'}>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      {isAr ? 'مطابقة الكل' : 'Match All'}
                    </Button>
                    <Button onClick={handleSavePhysicalCounts} variant="outline" size="sm" disabled={isSaving} className="text-xs">
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {isSaving ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الأرصدة الفعلية' : 'Save')}
                    </Button>
                    <Button onClick={handleApproveAdjustments} variant="primary" size="sm" disabled={isSaving} className="text-xs bg-emerald-600 hover:bg-emerald-700 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                      {isAr ? 'اعتماد وترحيل التسويات' : 'Approve & Adjust'}
                    </Button>
                  </>
                )}

                <Button onClick={() => setActiveCount(null)} variant="outline" size="sm" className="text-xs">
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>

            {/* Dynamic Real-time Variance Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs">
                <div className="text-[11px] text-slate-500 font-medium">{isAr ? 'إجمالي الأصناف' : 'Total Items'}</div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{countStats.total}</div>
              </div>

              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-2xs">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  <span>{isAr ? 'مطابق تماماً' : 'Matched'}</span>
                </div>
                <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{countStats.matched}</div>
              </div>

              <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl shadow-2xs">
                <div className="text-[11px] text-red-700 dark:text-red-400 font-medium flex items-center gap-1">
                  <ArrowDownCircle className="w-3 h-3 text-red-600" />
                  <span>{isAr ? 'عجز (نقص)' : 'Deficit'}</span>
                </div>
                <div className="text-lg font-black text-red-700 dark:text-red-300 mt-0.5">{countStats.deficit}</div>
              </div>

              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl shadow-2xs">
                <div className="text-[11px] text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1">
                  <ArrowUpCircle className="w-3 h-3 text-blue-600" />
                  <span>{isAr ? 'زيادة (فائض)' : 'Surplus'}</span>
                </div>
                <div className="text-lg font-black text-blue-700 dark:text-blue-300 mt-0.5">{countStats.surplus}</div>
              </div>

              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl shadow-2xs col-span-2 sm:col-span-1">
                <div className="text-[11px] text-amber-800 dark:text-amber-400 font-medium">{isAr ? 'صافي القيمة للتسوية' : 'Net Adjustment'}</div>
                <div className={`text-base font-black font-mono mt-0.5 ${countStats.netVarianceValue < 0 ? 'text-red-600' : countStats.netVarianceValue > 0 ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                  {countStats.netVarianceValue > 0 ? `+${countStats.netVarianceValue.toLocaleString()}` : countStats.netVarianceValue.toLocaleString()} ج.م
                </div>
              </div>
            </div>

            {/* Items Discrepancy Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">{isAr ? 'كود الصنف' : 'Code'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'اسم الصنف والموضع' : 'Item & Location'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الرصيد الدفتري' : 'System'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الرصيد الفعلي المعدود' : 'Physical Actual'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'فارق الكمية' : 'Qty Variance'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'قيمة التسوية (ج.م)' : 'Variance Val'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'حالة القيد' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(activeCount.items || []).map((it: any, i: number) => {
                    const currentPhys = itemsEdits[it.id] !== undefined ? itemsEdits[it.id] : Number(it.physical_quantity);
                    const diff = roundNumber(currentPhys - Number(it.system_quantity));
                    const cost = Number(it.unit_cost) || 0;
                    const val = roundNumber(diff * cost);

                    return (
                      <tr key={it.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-center font-mono">{i + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                          {it.inventory_item?.code || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {it.inventory_item?.name || '—'}
                          </div>
                          {it.inventory_item?.rack_location && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              📍 {it.inventory_item.rack_location}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-center text-slate-700 dark:text-slate-300">
                          {Number(it.system_quantity).toLocaleString()} {it.inventory_item?.unit_of_measure}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {activeCount.status === 'approved' ? (
                            <span className="font-mono font-bold">{Number(it.physical_quantity).toLocaleString()}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                step="0.0001"
                                min="0"
                                value={currentPhys}
                                onChange={(e) =>
                                  setItemsEdits((prev) => ({
                                    ...prev,
                                    [it.id]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-24 px-2 py-1 text-xs font-mono font-bold text-center bg-white dark:bg-slate-800 border rounded-lg focus:ring-1 focus:ring-primary-500"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickMatchSingle(it.id, Number(it.system_quantity))}
                                className="px-1.5 py-0.5 text-[10px] h-6 text-slate-500 hover:text-emerald-600"
                                title={isAr ? 'تعيين الرصيد الفعلي = الدفتري' : 'Match System'}
                              >
                                ✓
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-center">
                          <span
                            className={
                              diff < 0
                                ? 'text-red-600 bg-red-50 dark:bg-red-950/30 px-1.5 py-0.5 rounded'
                                : diff > 0
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded'
                                : 'text-slate-400'
                            }
                          >
                            {diff > 0 ? `+${diff}` : diff} {it.inventory_item?.unit_of_measure}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-center">
                          <span className={val < 0 ? 'text-red-600' : val > 0 ? 'text-emerald-600' : 'text-slate-400'}>
                            {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)} ج.م
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={it.adjustment_status === 'adjusted' ? 'success' : 'neutral'}>
                            {it.adjustment_status === 'adjusted' ? (isAr ? 'تمت التسوية' : 'Adjusted') : (isAr ? 'معلق' : 'Pending')}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Counts Sessions List */}
        {!activeCount && !isPrintMode && (
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'رقم محضر الجرد' : 'Count #'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'المستودع' : 'Warehouse'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'تاريخ الجرد' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الأصناف' : 'Items'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-2.5 px-3 text-center">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      {isAr ? 'جارِ تحميل الجلسات...' : 'Loading sessions...'}
                    </td>
                  </tr>
                ) : counts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      {isAr ? 'لا توجد جلسات جرد مسجلة حتى الآن' : 'No count sessions found'}
                    </td>
                  </tr>
                ) : (
                  counts.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {c.count_number}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        <div>{c.warehouse?.name}</div>
                        {c.warehouse?.branch && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                            {c.warehouse.branch.name}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{c.count_date}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {c.items_count || (c.items ? c.items.length : 0)} {isAr ? 'صنف' : 'items'}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={c.status === 'approved' ? 'success' : 'warning'}>
                          {c.status === 'approved' ? (isAr ? 'معتمد ومرحل للأستاذ' : 'Approved') : (isAr ? 'مسودة قيد الجرد' : 'In Progress')}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button onClick={() => loadCountDetails(c.id)} variant="outline" size="sm" className="text-xs py-1">
                          {isAr ? 'فتح جلسة الجرد' : 'Open'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

function roundNumber(num: number): number {
  return Math.round(num * 10000) / 10000;
}

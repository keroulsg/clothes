import React, { useState, useEffect } from 'react';
import {
  Calculator,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Users,
  Building,
  TrendingDown,
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { EmptyState } from '../ui/EmptyState';
import type { ProductionCostSheet } from '../../types';

interface CalculateCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (costSheet: ProductionCostSheet) => void;
  isAr?: boolean;
}

interface ProductionOrderOption {
  id: string;
  order_number: string;
  garment_model_id?: string;
  model_name?: string;
  planned_quantity: number;
  total_cut_pieces?: number;
  status: string;
  created_at?: string;
}

export const CalculateCostModal: React.FC<CalculateCostModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isAr = true,
}) => {
  const [orders, setOrders] = useState<ProductionOrderOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [calculatedSheet, setCalculatedSheet] = useState<ProductionCostSheet | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProductionOrders();
      setSelectedOrderId(null);
      setCalculatedSheet(null);
      setErrorMsg(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadProductionOrders = async () => {
    setIsLoadingOrders(true);
    setErrorMsg(null);
    try {
      const res = await api.production.getProductionOrders();
      const list = res.data || (Array.isArray(res) ? res : []);
      const mapped: ProductionOrderOption[] = list.map((po: any) => ({
        id: po.id,
        order_number: po.order_number || `PO-${po.id.slice(0, 8)}`,
        garment_model_id: po.garment_model_id,
        model_name: po.garment_model?.name || po.model_name || (isAr ? 'موديل مصنعي' : 'Garment Model'),
        planned_quantity: Number(po.planned_quantity || 0),
        total_cut_pieces: Number(po.total_cut_pieces || po.planned_quantity || 0),
        status: po.status || 'in_progress',
        created_at: po.created_at ? new Date(po.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US') : '',
      }));
      setOrders(mapped);
      if (mapped.length > 0) {
        setSelectedOrderId(mapped[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب أوامر الإنتاج' : 'Failed to fetch production orders'));
    } finally {
      setIsLoadingOrders(false);
    }
  };

  const handleExecuteCalculation = async () => {
    if (!selectedOrderId) return;
    setIsCalculating(true);
    setErrorMsg(null);

    try {
      const res = await api.accounting.calculateCost(selectedOrderId);
      if (res?.cost_sheet) {
        setCalculatedSheet(res.cost_sheet);
        onSuccess(res.cost_sheet);
      } else {
        throw new Error(isAr ? 'لم يتم استرجاع بطاقة التكلفة من الخادم' : 'No cost sheet returned from server');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل احتساب التكلفة الفعلية لأمر الإنتاج' : 'Failed to calculate production order cost'));
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isOpen) return null;

  const filteredOrders = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.model_name && o.model_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#F87171] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isAr ? 'احتساب التكلفة الصناعية الفعلية لأمر الإنتاج' : 'Calculate Production Order Actual Cost'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr
                  ? 'تجميع تكاليف الأقمشة والمستلزمات المصروفة + أجور عمال الخياطة + تحميل المصاريف'
                  : 'Aggregate issued fabric + verified piece-rate wages + allocated overheads'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200 text-xs">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-xs">{isAr ? 'تنبيه خطأ' : 'Error Alert'}</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {!calculatedSheet ? (
            <>
              {/* Step 1: Select Production Order */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {isAr ? '1. اختر أمر الإنتاج المراد احتساب تكلفته:' : '1. Select Production Order to Cost:'}
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {filteredOrders.length} {isAr ? 'أوامر متوفرة' : 'available'}
                  </span>
                </div>

                {/* Search Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-2.5 start-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث برقم أمر الإنتاج أو اسم الموديل...' : 'Search by order # or model name...'}
                    className="w-full ps-9 pe-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
                  />
                </div>

                {/* Orders List */}
                {isLoadingOrders ? (
                  <LoadingSkeleton count={3} />
                ) : filteredOrders.length === 0 ? (
                  <EmptyState
                    title={isAr ? 'لا توجد أوامر إنتاج مسجلة' : 'No Production Orders Found'}
                    description={isAr ? 'لم يتم العثور على أوامر إنتاج مطابقة للبحث' : 'No orders matched your criteria'}
                  />
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.map((order) => {
                      const isSelected = order.id === selectedOrderId;
                      return (
                        <div
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[var(--brand-subtle)]/50 border-s-4 border-[var(--brand-primary)]'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {order.order_number}
                              </span>
                              <Badge variant={order.status === 'completed' ? 'success' : 'neutral'}>
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {order.model_name}
                            </p>
                          </div>
                          <div className="text-end font-mono">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {order.planned_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                            </span>
                            <span className="text-[10px] text-slate-400">{order.created_at}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Order Summary Card */}
              {selectedOrder && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">{isAr ? 'الأمر المحدد' : 'Target Order'}</span>
                    <span className="font-mono font-bold text-[var(--brand-primary)] dark:text-[#F87171]">
                      {selectedOrder.order_number}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'الموديل' : 'Model'}</span>
                      <strong className="text-slate-800 dark:text-slate-200">{selectedOrder.model_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'الكمية المستهدفة' : 'Planned Qty'}</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">
                        {selectedOrder.planned_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Informational Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 space-y-1">
                <p className="font-bold text-xs flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{isAr ? 'قواعد الاحتساب الصناعي الدقيق:' : 'Exact Industrial Costing Formula:'}</span>
                </p>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  {isAr
                    ? 'يتم استخراج كميات الأقمشة والمستلزمات المصروفة من المخازن لأمر الإنتاج مضروبة في متوسط التكلفة المرجح، وتضاف إليها أجور القطعة المسجلة والمعتمدة لعمال الخياطة، ثم تحميل المصاريف الصناعية غير المباشرة وفق نسبة الطاقة المعتمدة.'
                    : 'Aggregates exact fabric & trim issuances at weighted-average cost, verified piece-rate operator earnings, and applied factory overhead rates.'}
                </p>
              </div>
            </>
          ) : (
            /* Step 2: Calculation Results & Cost Breakdown */
            <div className="space-y-4 animate-in zoom-in-95 duration-200">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">
                    {isAr ? 'تم احتساب وترحيل بطاقة التكلفة بنجاح' : 'Cost Sheet Recorded Successfully'}
                  </h4>
                  <p className="text-[11px] opacity-90">
                    {isAr
                      ? 'تم تسجيل قيود التكاليف واعتماد تكلفة القطعة في السجلات المالية للمصنع'
                      : 'Production costs aggregated and unit cost recorded in accounting records'}
                  </p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="flex items-center justify-center text-blue-500 mb-1">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'تكلفة الخامات' : 'Materials'}</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {Number(calculatedSheet.direct_materials_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="flex items-center justify-center text-purple-500 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'أجور العمال المباشرة' : 'Direct Labor'}</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {Number(calculatedSheet.direct_labor_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="flex items-center justify-center text-amber-500 mb-1">
                    <Building className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'مصاريف غير مباشرة' : 'Overheads'}</span>
                  <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                    {Number(calculatedSheet.allocated_overhead_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </strong>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                  <div className="flex items-center justify-center text-emerald-500 mb-1">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                    {isAr ? 'تكلفة القطعة' : 'Unit Cost'}
                  </span>
                  <strong className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                    {Number(calculatedSheet.cost_per_piece).toFixed(4)} {isAr ? 'ج.م' : 'EGP'}
                  </strong>
                </div>
              </div>

              {/* Total Summary Row */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-xs block">{isAr ? 'إجمالي تكلفة أمر الإنتاج' : 'Total Order Cost'}</span>
                  <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {Number(calculatedSheet.total_cost).toLocaleString()} {isAr ? 'جنيه مصري' : 'EGP'}
                  </strong>
                </div>
                <div className="text-end">
                  <span className="text-slate-500 text-xs block">{isAr ? 'الكمية المحسوبة' : 'Produced Pieces'}</span>
                  <strong className="text-base font-bold font-mono text-slate-900 dark:text-white">
                    {Number(calculatedSheet.total_produced_pieces).toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          {!calculatedSheet ? (
            <Button
              type="button"
              variant="primary"
              disabled={!selectedOrderId || isCalculating}
              onClick={handleExecuteCalculation}
              className="btn-brand-primary text-xs font-bold"
              icon={isCalculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Calculator className="w-3.5 h-3.5" />}
            >
              {isCalculating
                ? (isAr ? 'جاري الاحتساب الدقيق...' : 'Computing...')
                : (isAr ? 'احتساب التكلفة الفعلية وترحيلها' : 'Calculate & Record Cost')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCalculatedSheet(null);
                loadProductionOrders();
              }}
              className="text-xs"
            >
              {isAr ? 'احتساب أمر آخر' : 'Cost Another Order'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

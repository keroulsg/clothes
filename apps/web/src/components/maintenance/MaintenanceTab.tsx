import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  ShieldAlert,
  Cpu,
  Package,
  RefreshCw,
  AlertCircle,
  Printer,
  Eye,
  Search,
  X,
  MapPin,
  Activity,
  Scissors,
  Zap,
  Sliders,
  Sparkles,
  Coins,
  Boxes,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, Machine, MaintenanceWorkOrder, MaintenanceSparePart, DowntimeSummary } from '../../types';

interface MaintenanceTabProps {
  lang: Language;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'machines' | 'workorders' | 'spareparts'>('machines');
  
  // Modals state
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isSparePartModalOpen, setIsSparePartModalOpen] = useState(false);
  const [isAddSparePartStockModalOpen, setIsAddSparePartStockModalOpen] = useState(false);
  const [viewingMachineDetails, setViewingMachineDetails] = useState<Machine | null>(null);
  const [viewingMachineBarcode, setViewingMachineBarcode] = useState<Machine | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceWorkOrder | null>(null);
  const [orderToPrint, setOrderToPrint] = useState<MaintenanceWorkOrder | null>(null);

  // Subtab 3 view mode: warehouse stock vs issued usage ledger
  const [sparePartsViewMode, setSparePartsViewMode] = useState<'stock' | 'issued'>('stock');

  // Spare parts stock & warehouses from backend
  const [sparePartsStock, setSparePartsStock] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Submitting debounce states
  const [isSubmittingPart, setIsSubmittingPart] = useState(false);
  const [isSubmittingStockPart, setIsSubmittingStockPart] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [machineStatusFilter, setMachineStatusFilter] = useState<'all' | 'operational' | 'breakdown' | 'under_maintenance'>('all');
  const [machineTypeFilter, setMachineTypeFilter] = useState('all');
  const [workOrderFilter, setWorkOrderFilter] = useState<'all' | 'breakdown' | 'preventive' | 'in_progress' | 'completed'>('all');

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Data
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [downtimeSummary, setDowntimeSummary] = useState<DowntimeSummary | null>(null);

  const loadMaintenanceData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [mchRes, woRes, dtRes, spRes, whRes] = await Promise.allSettled([
        api.maintenance.getMachines(1),
        api.maintenance.getWorkOrders(1),
        api.maintenance.getDowntimeSummary(),
        api.maintenance.getSparePartsStock(),
        api.inventory.getWarehouses(),
      ]);

      if (mchRes.status === 'fulfilled' && mchRes.value?.data) {
        setMachines(mchRes.value.data);
      }
      if (woRes.status === 'fulfilled' && woRes.value?.data) {
        setWorkOrders(woRes.value.data);
      }
      if (dtRes.status === 'fulfilled' && dtRes.value) {
        setDowntimeSummary(dtRes.value);
      }
      if (spRes.status === 'fulfilled' && (spRes.value as any)?.spare_parts) {
        setSparePartsStock((spRes.value as any).spare_parts);
      }
      if (whRes.status === 'fulfilled') {
        const whList = (whRes.value as any)?.warehouses || (Array.isArray(whRes.value) ? whRes.value : []);
        setWarehouses(whList);
        if (whList.length > 0) {
          setNewStockPart((prev) => ({
            ...prev,
            warehouse_id: prev.warehouse_id || whList[0].id,
          }));
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب بيانات الصيانة والماكينات' : 'Failed to load maintenance data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  // Spare parts ledger derived directly from server-backed work orders
  const spareParts: (MaintenanceSparePart & { work_order_number?: string; machine_name?: string })[] = workOrders.flatMap((wo) =>
    (wo.spare_parts || []).map((sp) => {
      const mch = machines.find((m) => m.id === wo.machine_id);
      return {
        ...sp,
        work_order_id: wo.id,
        work_order_number: wo.order_number,
        machine_name: mch?.name,
      };
    })
  );

  // Form States
  const [selectedWoForPart, setSelectedWoForPart] = useState('');
  const [partSource, setPartSource] = useState<'stock' | 'custom'>('stock');
  const [selectedInventoryItemId, setSelectedInventoryItemId] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartUnitCost, setNewPartUnitCost] = useState<number>(150);

  // Add new spare part into warehouse stock
  const [newStockPart, setNewStockPart] = useState({
    name: '',
    part_number: '',
    warehouse_id: '',
    unit_of_measure: 'قطعة',
    initial_balance: 10,
    unit_cost: 150,
    reorder_level: 2,
    description: '',
  });

  const [newMachine, setNewMachine] = useState({
    machine_code: '',
    name: '',
    model_number: '',
    serial_number: '',
    machine_type: 'sewing',
    location: '',
    maintenance_interval_days: 30,
    notes: '',
  });

  const [newOrder, setNewOrder] = useState({
    machine_id: '',
    work_type: 'breakdown',
    priority: 'high',
    issue_description: '',
    reported_by: '',
    technician_name: '',
    labor_cost: 100,
  });

  const [completeData, setCompleteData] = useState({
    resolution_notes: '',
    downtime_hours: 1.5,
    labor_cost: 120,
  });

  // Handlers
  const handleAddMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.name || !newMachine.machine_code) return;

    try {
      const res = await api.maintenance.createMachine({
        machine_code: newMachine.machine_code.trim(),
        name: newMachine.name.trim(),
        model_number: newMachine.model_number.trim() || undefined,
        serial_number: newMachine.serial_number.trim() || undefined,
        machine_type: newMachine.machine_type,
        location: newMachine.location.trim() || undefined,
        maintenance_interval_days: Number(newMachine.maintenance_interval_days) || 30,
        notes: newMachine.notes.trim() || undefined,
      });

      if (res?.machine) {
        setMachines([res.machine, ...machines]);
      } else {
        await loadMaintenanceData();
      }
      setIsAddMachineModalOpen(false);
      setNewMachine({
        machine_code: '',
        name: '',
        model_number: '',
        serial_number: '',
        machine_type: 'sewing',
        location: '',
        maintenance_interval_days: 30,
        notes: '',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الماكينة' : 'Failed to register machine'));
    }
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.machine_id || !newOrder.issue_description) return;

    try {
      const res = await api.maintenance.createWorkOrder({
        machine_id: newOrder.machine_id,
        work_type: newOrder.work_type,
        priority: newOrder.priority,
        issue_description: newOrder.issue_description.trim(),
        reported_by: newOrder.reported_by.trim() || undefined,
        technician_name: newOrder.technician_name.trim() || undefined,
        labor_cost: Number(newOrder.labor_cost) || 0,
      });

      if (res?.work_order) {
        setWorkOrders([res.work_order, ...workOrders]);
      } else {
        await loadMaintenanceData();
      }
      setIsWorkOrderModalOpen(false);
      setNewOrder({
        machine_id: '',
        work_type: 'breakdown',
        priority: 'high',
        issue_description: '',
        reported_by: '',
        technician_name: '',
        labor_cost: 100,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء أمر الصيانة' : 'Failed to create work order'));
    }
  };

  const handleCompleteWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.maintenance.completeWorkOrder(selectedOrder.id, {
        resolution_notes: completeData.resolution_notes.trim(),
        downtime_hours: Number(completeData.downtime_hours) || 0,
      });

      await loadMaintenanceData();
      setSelectedOrder(null);
      setCompleteData({ resolution_notes: '', downtime_hours: 1.5, labor_cost: 120 });
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إغلاق أمر الصيانة' : 'Failed to complete work order'));
    }
  };

  const handleAddSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingPart) return;
    if (!selectedWoForPart || !newPartName || newPartQty <= 0) return;

    setIsSubmittingPart(true);
    try {
      await api.maintenance.addSparePart(selectedWoForPart, {
        part_name: newPartName.trim(),
        part_number: newPartNumber.trim() || undefined,
        quantity: Number(newPartQty),
        unit_cost: Number(newPartUnitCost),
        inventory_item_id: partSource === 'stock' && selectedInventoryItemId ? selectedInventoryItemId : undefined,
      });

      await loadMaintenanceData();
      setIsSparePartModalOpen(false);
      setNewPartName('');
      setNewPartNumber('');
      setNewPartQty(1);
      setSelectedInventoryItemId('');
      setPartSource('stock');
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة وصرف قطعة الغيار' : 'Failed to add spare part'));
    } finally {
      setIsSubmittingPart(false);
    }
  };

  const handleAddSparePartStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingStockPart) return;
    if (!newStockPart.name || !newStockPart.warehouse_id) return;

    setIsSubmittingStockPart(true);
    try {
      await api.maintenance.createSparePartStock({
        name: newStockPart.name.trim(),
        part_number: newStockPart.part_number.trim() || undefined,
        warehouse_id: newStockPart.warehouse_id,
        unit_of_measure: newStockPart.unit_of_measure,
        initial_balance: Number(newStockPart.initial_balance) || 0,
        unit_cost: Number(newStockPart.unit_cost) || 0,
        reorder_level: Number(newStockPart.reorder_level) || 0,
        description: newStockPart.description.trim() || undefined,
      });

      await loadMaintenanceData();
      setIsAddSparePartStockModalOpen(false);
      setNewStockPart({
        name: '',
        part_number: '',
        warehouse_id: warehouses[0]?.id || '',
        unit_of_measure: 'قطعة',
        initial_balance: 10,
        unit_cost: 150,
        reorder_level: 2,
        description: '',
      });
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة قطعة الغيار إلى المخزن' : 'Failed to add spare part to stock'));
    } finally {
      setIsSubmittingStockPart(false);
    }
  };

  const handleOpenIssueForStockItem = (item: any) => {
    setPartSource('stock');
    setSelectedInventoryItemId(item.id);
    setNewPartName(item.name);
    setNewPartNumber(item.item_code || item.code || '');
    setNewPartUnitCost(Number(item.unit_cost || item.average_cost || 0));
    setNewPartQty(1);
    setIsSparePartModalOpen(true);
  };

  // Authoritative server-backed metrics
  const totalMachines = downtimeSummary?.total_machines ?? machines.length;
  const operationalCount = downtimeSummary?.operational_machines ?? machines.filter((m) => m.status === 'operational').length;
  const breakdownCount = downtimeSummary?.down_machines ?? machines.filter((m) => m.status === 'breakdown').length;
  const underMaintenanceCount = machines.filter((m) => m.status === 'under_maintenance').length;
  const totalDowntimeHours = downtimeSummary?.total_downtime_hours ?? workOrders.reduce((sum, wo) => sum + (Number(wo.downtime_hours) || 0), 0);
  const totalMaintenanceExpense = downtimeSummary?.total_maintenance_cost ?? workOrders.reduce((sum, wo) => sum + (Number(wo.total_cost) || 0), 0);

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter((m) => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          (m.machine_code && m.machine_code.toLowerCase().includes(q)) ||
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.model_number && m.model_number.toLowerCase().includes(q)) ||
          (m.serial_number && m.serial_number.toLowerCase().includes(q)) ||
          (m.location && m.location.toLowerCase().includes(q));
        if (!matches) return false;
      }
      // Status
      if (machineStatusFilter !== 'all' && m.status !== machineStatusFilter) {
        return false;
      }
      // Type
      if (machineTypeFilter !== 'all' && m.machine_type !== machineTypeFilter) {
        return false;
      }
      return true;
    });
  }, [machines, searchQuery, machineStatusFilter, machineTypeFilter]);

  // Filtered Work Orders
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const mch = machines.find((m) => m.id === wo.machine_id);
        const matches =
          (wo.order_number && wo.order_number.toLowerCase().includes(q)) ||
          (wo.issue_description && wo.issue_description.toLowerCase().includes(q)) ||
          (wo.technician_name && wo.technician_name.toLowerCase().includes(q)) ||
          (mch?.name && mch.name.toLowerCase().includes(q)) ||
          (mch?.machine_code && mch.machine_code.toLowerCase().includes(q));
        if (!matches) return false;
      }
      if (workOrderFilter === 'breakdown' && wo.work_type !== 'breakdown') return false;
      if (workOrderFilter === 'preventive' && wo.work_type !== 'preventive') return false;
      if (workOrderFilter === 'in_progress' && wo.status !== 'in_progress') return false;
      if (workOrderFilter === 'completed' && wo.status !== 'completed') return false;
      return true;
    });
  }, [workOrders, machines, searchQuery, workOrderFilter]);

  // Filtered Spare Parts Stock in Warehouse
  const filteredSparePartsStock = useMemo(() => {
    if (!searchQuery) return sparePartsStock;
    const q = searchQuery.toLowerCase();
    return sparePartsStock.filter((item) => {
      return (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.item_code && item.item_code.toLowerCase().includes(q)) ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.warehouse?.name && item.warehouse.name.toLowerCase().includes(q))
      );
    });
  }, [sparePartsStock, searchQuery]);

  // Filtered Issued Spare Parts Ledger
  const filteredSparePartsIssued = useMemo(() => {
    if (!searchQuery) return spareParts;
    const q = searchQuery.toLowerCase();
    return spareParts.filter((sp) => {
      return (
        (sp.part_name && sp.part_name.toLowerCase().includes(q)) ||
        (sp.part_number && sp.part_number.toLowerCase().includes(q)) ||
        (sp.work_order_number && sp.work_order_number.toLowerCase().includes(q)) ||
        (sp.machine_name && sp.machine_name.toLowerCase().includes(q))
      );
    });
  }, [spareParts, searchQuery]);

  const getMachineTypeBadge = (type: string) => {
    switch (type) {
      case 'sewing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <Zap className="w-3 h-3 text-indigo-600" />
            <span>{isAr ? 'حياكة سنجر' : 'Sewing'}</span>
          </span>
        );
      case 'cutting':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Scissors className="w-3 h-3 text-amber-600" />
            <span>{isAr ? 'مقص ومعدات قص' : 'Cutting'}</span>
          </span>
        );
      case 'overlock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Sliders className="w-3 h-3 text-purple-600" />
            <span>{isAr ? 'أوفرلوك وسرفلة' : 'Overlock'}</span>
          </span>
        );
      case 'buttonhole':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            <Cpu className="w-3 h-3 text-sky-600" />
            <span>{isAr ? 'عراوي وأزرار' : 'Buttonhole'}</span>
          </span>
        );
      case 'interlock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Activity className="w-3 h-3 text-blue-600" />
            <span>{isAr ? 'أورليه كولاريت' : 'Interlock'}</span>
          </span>
        );
      case 'pressing':
      case 'ironing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <Clock className="w-3 h-3 text-orange-600" />
            <span>{isAr ? 'مكبس كي وبخار' : 'Pressing'}</span>
          </span>
        );
      case 'embroidery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
            <Sparkles className="w-3 h-3 text-pink-600" />
            <span>{isAr ? 'تطريز كمبيوتر' : 'Embroidery'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Cpu className="w-3 h-3 text-slate-500" />
            <span>{type}</span>
          </span>
        );
    }
  };

  const getMachineStatusBadge = (status: string) => {
    if (status === 'operational') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isAr ? 'جاهزة للعمل' : 'Operational'}</span>
        </span>
      );
    }
    if (status === 'breakdown') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300/80 dark:border-rose-800 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <span>{isAr ? 'عطل وتوقف' : 'Breakdown'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800 shadow-2xs">
        <Wrench className="w-3 h-3 text-amber-600 animate-spin" />
        <span>{isAr ? 'تحت الصيانة' : 'In Maintenance'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir={isAr ? 'rtl' : 'ltr'}>
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
                {isAr ? 'صيانة الماكينات والأصول الصناعية 4.0' : 'Machinery & Assets 4.0'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {isAr ? 'تتبع لحظي لزمن التوقف والإنتاجية' : 'Zero Downtime Architecture'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Wrench className="w-7 h-7 text-[#E05265] shrink-0" />
              <span>{isAr ? 'صيانة الماكينات والأصول الصناعية' : 'Machine Assets & Maintenance'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'سجل ماكينات الخياطة والقص، أوامر الصيانة الدورية والطارئة، وتتبع ساعات التوقف، واستعواض قطع الغيار بالمخازن.'
                : 'Machine asset registry, emergency & preventative work orders, downtime logs, and spare parts.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                setNewOrder((prev) => ({ ...prev, work_type: 'breakdown', priority: 'critical' }));
                setIsWorkOrderModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isAr ? '+ بلاغ عطل طارئ' : '+ Emergency Ticket'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNewOrder((prev) => ({ ...prev, work_type: 'preventive', priority: 'medium' }));
                setIsWorkOrderModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Wrench className="w-4 h-4" />
              <span>{isAr ? '+ أمر صيانة' : '+ Work Order'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddMachineModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>{isAr ? '+ تسجيل ماكينة' : '+ New Machine'}</span>
            </button>

            <button
              type="button"
              onClick={loadMaintenanceData}
              disabled={isLoading}
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all backdrop-blur-md cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#ff8ba0]' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={loadMaintenanceData}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isAr ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        </div>
      )}

      {/* 2. Top 4 Interactive Modern KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Operational Assets */}
        <div
          onClick={() => {
            setActiveSubTab('machines');
            setMachineStatusFilter('operational');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            machineStatusFilter === 'operational' && activeSubTab === 'machines'
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'الماكينات العاملة' : 'Operational Assets'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs border border-emerald-200/60 dark:border-emerald-800/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {operationalCount} <span className="text-xs font-normal text-slate-400">/ {totalMachines}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{Math.round((operationalCount / (totalMachines || 1)) * 100)}% {isAr ? 'جاهزية تشغيلية' : 'Availability'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">{isAr ? 'خطوط الإنتاج' : 'Floor Assets'}</span>
          </div>
        </div>

        {/* Card 2: Active Breakdowns & Maintenance */}
        <div
          onClick={() => {
            setActiveSubTab('machines');
            setMachineStatusFilter('breakdown');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            machineStatusFilter === 'breakdown' && activeSubTab === 'machines'
              ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/30 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'أعطال متوقفة حالياً' : 'Active Breakdowns'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs border border-rose-200/60 dark:border-rose-800/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            {breakdownCount + underMaintenanceCount}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'ماكينة' : 'machines'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="text-rose-600 font-bold">{breakdownCount} {isAr ? 'عطل حرج' : 'Critical'}</span>
            <span className="text-slate-400 font-bold">•</span>
            <span className="text-amber-600 font-bold">{underMaintenanceCount} {isAr ? 'تحت الصيانة' : 'In Service'}</span>
          </div>
        </div>

        {/* Card 3: Downtime Hours */}
        <div
          onClick={() => {
            setActiveSubTab('workorders');
            setWorkOrderFilter('breakdown');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            workOrderFilter === 'breakdown' && activeSubTab === 'workorders'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'ساعات التوقف الكلية' : 'Total Downtime'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs border border-amber-200/60 dark:border-amber-800/40">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {totalDowntimeHours.toFixed(1)}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'ساعة عمل' : 'hrs'}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1 truncate">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>{isAr ? 'فاقد إنتاجي مقدّر للورديات' : 'Lost floor production'}</span>
          </div>
        </div>

        {/* Card 4: Maintenance Expense */}
        <div
          onClick={() => setActiveSubTab('spareparts')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            activeSubTab === 'spareparts'
              ? 'bg-gradient-to-br from-[#7F1625]/10 to-[#9E2A3B]/10 dark:from-[#7F1625]/25 dark:to-[#000000] border-[#7F1625] ring-2 ring-[#7F1625]/30'
              : 'bg-white dark:bg-[#0a0204]/90 border-slate-200/90 dark:border-[#2d080e] hover:border-[#7F1625]/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'تكلفة الصيانة وقطع الغيار' : 'Maintenance Expense'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#7F1625]/10 dark:bg-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center shadow-2xs border border-[#7F1625]/20 font-bold">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#7F1625] dark:text-[#ff8ba0] mt-1">
            {totalMaintenanceExpense.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
            {isAr ? 'شاملة أجور الفنيين والقطع' : 'Spare parts & labor cost'}
          </div>
        </div>
      </div>

      {/* 3. Luxury Segmented Pill Tab Bar */}
      <div className="p-1.5 bg-slate-100 dark:bg-[#0a0204] rounded-2xl border border-slate-200/80 dark:border-[#2d080e] flex items-center gap-1.5 overflow-x-auto shadow-inner text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('machines')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'machines'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>{isAr ? 'سجل الماكينات والمعدات' : 'Asset Register'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'machines' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {machines.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('workorders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'workorders'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>{isAr ? 'أوامر الصيانة وبلاغات الأعطال' : 'Work Orders & Tickets'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'workorders' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {workOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('spareparts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'spareparts'
              ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#180608]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>{isAr ? 'قطع الغيار ومستودع الصيانة' : 'Spare Parts Stock'}</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${activeSubTab === 'spareparts' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-[#22070c] text-slate-700 dark:text-slate-300'}`}>
            {sparePartsStock.length}
          </span>
        </button>
      </div>

      {/* 4. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSubTab === 'machines'
                ? (isAr ? 'بحث بكود الماكينة، الاسم، الموديل، أو الموقع...' : 'Search asset code, name, location...')
                : activeSubTab === 'workorders'
                ? (isAr ? 'بحث برقم الإذن، وصف العطل، الفني، أو الماكينة...' : 'Search order #, issue, technician...')
                : (isAr ? 'بحث باسم قطعة الغيار، أو رقم القطعة...' : 'Search part name or part number...')
            }
            className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute end-2.5 top-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tab-Specific Filters */}
        {activeSubTab === 'machines' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMachineStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  machineStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {isAr ? 'كافة الحالات' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('operational')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  machineStatusFilter === 'operational'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                {isAr ? 'جاهزة للعمل' : 'Operational'}
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('breakdown')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  machineStatusFilter === 'breakdown'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                {isAr ? 'أعطال وتوقف' : 'Breakdowns'}
              </button>
              <button
                type="button"
                onClick={() => setMachineStatusFilter('under_maintenance')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  machineStatusFilter === 'under_maintenance'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                {isAr ? 'تحت الصيانة' : 'Service'}
              </button>
            </div>

            <select
              value={machineTypeFilter}
              onChange={(e) => setMachineTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300"
            >
              <option value="all">{isAr ? 'كافة أنواع المعدات' : 'All Equipment'}</option>
              <option value="sewing">{isAr ? 'ماكينات خياطة (سنجر)' : 'Sewing'}</option>
              <option value="cutting">{isAr ? 'مقصات صالة القص' : 'Cutting'}</option>
              <option value="overlock">{isAr ? 'أوفرلوك وسرفلة' : 'Overlock'}</option>
              <option value="buttonhole">{isAr ? 'عراوي وأزرار' : 'Buttonhole'}</option>
              <option value="interlock">{isAr ? 'أورليه كولاريت' : 'Interlock'}</option>
              <option value="pressing">{isAr ? 'مكابس كي وبخار' : 'Pressing'}</option>
              <option value="embroidery">{isAr ? 'تطريز كمبيوتر' : 'Embroidery'}</option>
            </select>
          </div>
        )}

        {activeSubTab === 'workorders' && (
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setWorkOrderFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                workOrderFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {isAr ? 'الكل' : 'All'}
            </button>
            <button
              type="button"
              onClick={() => setWorkOrderFilter('breakdown')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                workOrderFilter === 'breakdown'
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {isAr ? '🚨 أعطال مفاجئة' : 'Breakdown'}
            </button>
            <button
              type="button"
              onClick={() => setWorkOrderFilter('preventive')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                workOrderFilter === 'preventive'
                  ? 'bg-indigo-500 text-white shadow-2xs'
                  : 'text-indigo-700 dark:text-indigo-400'
              }`}
            >
              {isAr ? '📅 صيانة دورية' : 'Preventative'}
            </button>
            <button
              type="button"
              onClick={() => setWorkOrderFilter('in_progress')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                workOrderFilter === 'in_progress'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {isAr ? '⏳ جارية' : 'In Progress'}
            </button>
            <button
              type="button"
              onClick={() => setWorkOrderFilter('completed')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                workOrderFilter === 'completed'
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {isAr ? '✓ تم الإصلاح' : 'Closed'}
            </button>
          </div>
        )}
      </div>

      {/* 5. Subtab 1: Machines Register */}
      {activeSubTab === 'machines' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'كود الماكينة' : 'Asset Code'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم المعدة / الموديل' : 'Machine & Model'}</th>
                  <th className="py-3 px-4">{isAr ? 'النوع والموقع' : 'Type & Location'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الحالة التشغيلية' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'دورية الصيانة' : 'Interval'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الصيانة القادمة' : 'Next Due'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMachines.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Cpu className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-semibold text-xs">
                          {isAr ? 'لا توجد ماكينات مطابقة لمعايير البحث.' : 'No machines found.'}
                        </span>
                        {(searchQuery || machineStatusFilter !== 'all' || machineTypeFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setMachineStatusFilter('all');
                              setMachineTypeFilter('all');
                            }}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            {isAr ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMachines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {m.machine_code}
                        </span>
                      </td>

                      {/* Name & Model */}
                      <td className="py-3 px-4">
                        <div
                          onClick={() => setViewingMachineDetails(m)}
                          className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                        >
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {m.model_number || 'Model: N/A'} {m.serial_number ? `• SN: ${m.serial_number}` : ''}
                        </div>
                      </td>

                      {/* Type & Location */}
                      <td className="py-3 px-4">
                        <div>{getMachineTypeBadge(m.machine_type)}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{m.location || (isAr ? 'عنبر التشغيل العام' : 'General Floor')}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {getMachineStatusBadge(m.status)}
                      </td>

                      {/* Interval */}
                      <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                        {m.maintenance_interval_days} {isAr ? 'يوم' : 'd'}
                      </td>

                      {/* Next Due */}
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={
                          m.status === 'breakdown'
                            ? 'text-rose-600'
                            : m.status === 'under_maintenance'
                            ? 'text-amber-600'
                            : 'text-slate-800 dark:text-slate-200'
                        }>
                          {m.next_maintenance_date || '—'}
                        </span>
                      </td>

                      {/* Modern Actions as Icons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Request Service Icon */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewOrder((prev) => ({
                                ...prev,
                                machine_id: m.id,
                                work_type: m.status === 'breakdown' ? 'breakdown' : 'preventive',
                                priority: m.status === 'breakdown' ? 'critical' : 'high',
                              }));
                              setIsWorkOrderModalOpen(true);
                            }}
                            title={isAr ? `إصدار أمر صيانة للماكينة (${m.machine_code})` : 'New Work Order'}
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Machine Details / History Icon */}
                          <button
                            type="button"
                            onClick={() => setViewingMachineDetails(m)}
                            title={isAr ? 'عرض بطاقة وسجل أعطال الماكينة الشامل' : 'View Asset Profile'}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 3. Print QR / Barcode Label Icon */}
                          <button
                            type="button"
                            onClick={() => setViewingMachineBarcode(m)}
                            title={isAr ? 'طباعة بطاقة الأصل والباركود' : 'Print Asset QR Label'}
                            className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. Subtab 2: Work Orders & Breakdown Tickets */}
      {activeSubTab === 'workorders' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الإذن وتاريخه' : 'Order #'}</th>
                  <th className="py-3 px-4">{isAr ? 'الماكينة المستهدفة' : 'Machine Asset'}</th>
                  <th className="py-3 px-4">{isAr ? 'نوع العمل والأولوية' : 'Type & Priority'}</th>
                  <th className="py-3 px-4">{isAr ? 'وصف العطل والفني المسؤول' : 'Issue & Tech'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'التكلفة وساعات التوقف' : 'Cost & Downtime'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredWorkOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-semibold text-xs">
                          {isAr ? 'لا توجد أوامر صيانة تطابق المعايير.' : 'No work orders found.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWorkOrders.map((wo) => {
                    const mch = machines.find((m) => m.id === wo.machine_id);
                    const isClosed = wo.status === 'completed';

                    return (
                      <tr key={wo.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Order # */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <span className="block">{wo.order_number}</span>
                          <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                            {wo.scheduled_date || wo.created_at || '—'}
                          </span>
                        </td>

                        {/* Machine */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {mch ? mch.name : (isAr ? 'ماكينة غير محددة' : 'Unknown Machine')}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono mt-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{mch?.machine_code}</span>
                            <span>• {mch?.location}</span>
                          </div>
                        </td>

                        {/* Work Type & Priority */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={wo.work_type === 'breakdown' ? 'danger' : 'neutral'}>
                              {wo.work_type === 'breakdown'
                                ? (isAr ? '🚨 عطل وتوقف' : 'Breakdown')
                                : (isAr ? '📅 صيانة وقائية' : 'Preventative')}
                            </Badge>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              wo.priority === 'critical'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : wo.priority === 'high'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}>
                              {wo.priority === 'critical' ? 'حرجة' : wo.priority === 'high' ? 'عالية' : 'عادية'}
                            </span>
                          </div>
                        </td>

                        {/* Issue & Tech */}
                        <td className="py-3 px-4 max-w-xs">
                          <p className="text-slate-800 dark:text-slate-200 font-medium truncate" title={wo.issue_description}>
                            {wo.issue_description}
                          </p>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {isAr ? 'الفني: ' : 'Tech: '} <strong>{wo.technician_name || (isAr ? 'غير مسند' : 'Unassigned')}</strong>
                          </div>
                        </td>

                        {/* Cost & Downtime */}
                        <td className="py-3 px-4 text-center">
                          <div className="font-mono font-bold text-slate-900 dark:text-white">
                            {Number(wo.total_cost || 0).toLocaleString()} ج.م
                          </div>
                          <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                            {wo.downtime_hours || 0} {isAr ? 'ساعة توقف' : 'hrs lost'}
                          </div>
                          {isClosed && (
                            <div
                              className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                              title={isAr ? 'تم ترحيل وتوجيه تكلفة الصيانة آلياً إلى حساب مصروفات المصنع (6010: مصاريف صناعية غير مباشرة واستهلاك)' : 'Posted to GL 6010'}
                            >
                              <span>✓ {isAr ? 'مصروفات المصنع (حساب 6010)' : 'GL 6010'}</span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <Badge variant={isClosed ? 'success' : wo.status === 'in_progress' ? 'warning' : 'neutral'}>
                            {isClosed
                              ? (isAr ? '✓ تم الإصلاح' : 'Completed')
                              : wo.status === 'in_progress'
                              ? (isAr ? '⏳ قيد التنفيذ' : 'In Progress')
                              : (isAr ? 'مجدول' : 'Scheduled')}
                          </Badge>
                        </td>

                        {/* Actions Icons */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Complete Icon */}
                            {!isClosed ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedOrder(wo);
                                }}
                                title={isAr ? 'إتمام وإغلاق أمر الصيانة' : 'Complete Work Order'}
                                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 transition-all cursor-pointer shadow-2xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30">
                                {isAr ? 'مغلق' : 'Closed'}
                              </span>
                            )}

                            {/* Add Spare Part Icon */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWoForPart(wo.id);
                                setIsSparePartModalOpen(true);
                              }}
                              title={isAr ? 'صرف قطعة غيار لهذا الإذن' : 'Add Spare Part'}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Package className="w-3.5 h-3.5" />
                            </button>

                            {/* Print Voucher Icon */}
                            <button
                              type="button"
                              onClick={() => setOrderToPrint(wo)}
                              title={isAr ? 'طباعة إذن الصيانة الرسمي' : 'Print Work Order'}
                              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
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
        </Card>
      )}

      {/* 7. Subtab 3: Spare Parts Inventory & Stock Management */}
      {activeSubTab === 'spareparts' && (
        <div className="space-y-4">
          {/* A. Financial & Inventory Accounting Integration Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 dark:border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {isAr ? 'التكامل المالي والمخزني المعتمد للمصنع' : 'Factory Accounting & Inventory Integration'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    {isAr ? '✓ حساب 6010: مصاريف صناعية غير مباشرة' : 'GL 6010 Synced'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {isAr
                    ? 'أي قطعة غيار تُصرف يتم خصمها آلياً من رصيد المستودع (إذن صرف OUT)، وتُسجل تكلفتها مع أجور الفنيين مباشرة في مصروفات تشغيل المصنع بدفتر الأستاذ العام عند إغلاق أمر الصيانة.'
                    : 'Issued spare parts automatically decrement warehouse stock (OUT) and post with technician labor into factory indirect expenses (GL 6010).'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-semibold">{isAr ? 'إجمالي قيمة قطع الغيار بالمستودع' : 'Stock Value'}</div>
                <div className="text-sm font-mono font-black text-emerald-700 dark:text-emerald-400">
                  {sparePartsStock.reduce((sum, item) => sum + (Number(item.current_balance || 0) * Number(item.unit_cost || item.average_cost || 0)), 0).toLocaleString()} ج.م
                </div>
              </div>
              <div className="h-7 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-semibold">{isAr ? 'إجمالي المنصرف للصيانة' : 'Total Issued'}</div>
                <div className="text-sm font-mono font-black text-amber-600 dark:text-amber-400">
                  {spareParts.reduce((sum, sp) => sum + (Number(sp.total_cost) || (Number(sp.quantity) * Number(sp.unit_cost))), 0).toLocaleString()} ج.م
                </div>
              </div>
            </div>
          </div>

          {/* B. Sub-navigation View Switcher and Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            {/* View Mode Pills */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSparePartsViewMode('stock')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sparePartsViewMode === 'stock'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>{isAr ? 'رصيد المخزون المتوفر' : 'Available Stock'}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  {sparePartsStock.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSparePartsViewMode('issued')}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  sparePartsViewMode === 'issued'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{isAr ? 'سجل القطع المنصرفة للأوامر' : 'Issued Usage Ledger'}</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold">
                  {spareParts.length}
                </span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddSparePartStockModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? '+ إضافة قطعة غيار للمخزن' : '+ Add Part to Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartSource('stock');
                  setIsSparePartModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-2xs transition-all cursor-pointer"
              >
                <Package className="w-3.5 h-3.5" />
                <span>{isAr ? '+ صرف قطعة غيار' : '+ Issue Part'}</span>
              </button>
            </div>
          </div>

          {/* C. View 1: Warehouse Available Stock */}
          {sparePartsViewMode === 'stock' && (
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-3 px-4">{isAr ? 'كود القطعة (Part #)' : 'Item Code'}</th>
                      <th className="py-3 px-4">{isAr ? 'اسم قطعة الغيار والمواصفات' : 'Part Name & Specs'}</th>
                      <th className="py-3 px-4">{isAr ? 'المستودع' : 'Warehouse'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الرصيد المتاح' : 'Available Stock'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'سعر الوحدة' : 'Unit Cost'}</th>
                      <th className="py-3 px-4 text-center text-emerald-700 dark:text-emerald-300">{isAr ? 'إجمالي القيمة التقديرية' : 'Total Value'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'حد إعادة الطلب' : 'Reorder Level'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSparePartsStock.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <span className="font-semibold text-xs">
                              {isAr ? 'لا توجد قطع غيار مسجلة في المخزن.' : 'No spare parts in stock.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsAddSparePartStockModalOpen(true)}
                              className="text-xs text-emerald-600 font-bold hover:underline"
                            >
                              {isAr ? '+ إضافة أول قطعة غيار للمستودع الآن' : '+ Add first spare part'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSparePartsStock.map((item) => {
                        const balance = Number(item.current_balance || 0);
                        const reorder = Number(item.reorder_level || 0);
                        const isLow = balance <= reorder;
                        const isOut = balance <= 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            {/* Code */}
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              <span className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                {item.item_code || item.code}
                              </span>
                            </td>

                            {/* Name & Desc */}
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                              {item.description && (
                                <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                                  {item.description}
                                </div>
                              )}
                            </td>

                            {/* Warehouse */}
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                              {item.warehouse?.name || (isAr ? 'المستودع الرئيسي' : 'Main Warehouse')}
                            </td>

                            {/* Current Balance */}
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${
                                  isOut
                                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    : isLow
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                <span>{balance}</span>
                                <span className="text-[10px] font-normal">{item.unit_of_measure || 'قطعة'}</span>
                              </span>
                            </td>

                            {/* Unit Cost */}
                            <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                              {Number(item.unit_cost || item.average_cost || 0).toLocaleString()} ج.م
                            </td>

                            {/* Total Stock Value */}
                            <td className="py-3 px-4 text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {(balance * Number(item.unit_cost || item.average_cost || 0)).toLocaleString()} ج.م
                            </td>

                            {/* Reorder Level */}
                            <td className="py-3 px-4 text-center font-mono text-slate-500">
                              {reorder} {item.unit_of_measure || 'قطعة'}
                            </td>

                            {/* Action: Issue directly */}
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                disabled={isOut}
                                onClick={() => handleOpenIssueForStockItem(item)}
                                title={isOut ? (isAr ? 'الرصيد نفد من المستودع' : 'Out of stock') : (isAr ? 'صرف هذه القطعة فوراً لماكينة أو أمر صيانة' : 'Issue to Work Order')}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                                  isOut
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-700/60 cursor-pointer shadow-2xs'
                                }`}
                              >
                                <Package className="w-3 h-3" />
                                <span>{isAr ? 'صرف لماكينة' : 'Issue'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* D. View 2: Issued Parts Usage Ledger */}
          {sparePartsViewMode === 'issued' && (
            <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="py-3 px-4">{isAr ? 'اسم قطعة الغيار' : 'Part Name'}</th>
                      <th className="py-3 px-4">{isAr ? 'رقم القطعة (Part #)' : 'Part Number'}</th>
                      <th className="py-3 px-4">{isAr ? 'أمر الصيانة / الماكينة' : 'Work Order & Machine'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'الكمية المنصرفة' : 'Quantity'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'سعر الوحدة' : 'Unit Cost'}</th>
                      <th className="py-3 px-4 text-center text-amber-700 dark:text-amber-300">{isAr ? 'القيمة الإجمالية' : 'Total Cost'}</th>
                      <th className="py-3 px-4 text-center">{isAr ? 'التأثير المالي والمخزني' : 'GL & Stock Impact'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSparePartsIssued.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                            <span className="font-semibold text-xs">
                              {isAr ? 'لا توجد قطع غيار منصرفة مسجلة حتى الآن.' : 'No spare parts logged.'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredSparePartsIssued.map((sp, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {sp.part_name}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">
                            {sp.part_number || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold block">
                              {sp.work_order_number || '—'}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {sp.machine_name || (isAr ? 'ماكينة خط إنتاج' : 'Line Asset')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                            {sp.quantity}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                            {Number(sp.unit_cost).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-black text-amber-700 dark:text-amber-400 text-sm">
                            {(Number(sp.total_cost) || (Number(sp.quantity) * Number(sp.unit_cost))).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                title="تم خصم الكمية من رصيد المستودع الفعلي آلياً"
                              >
                                <span>✓ {isAr ? 'مخصوم من المستودع' : 'Stock Deducted'}</span>
                              </span>
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                title="التكلفة مرحلة لمصروفات المصنع (حساب 6010: مصاريف صناعية غير مباشرة واستهلاك ماكينات)"
                              >
                                <span>✓ {isAr ? 'مرحل لمصروفات المصنع (6010)' : 'GL 6010 Posted'}</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* 8. MODAL 1: REGISTER NEW MACHINE */}
      <Modal
        isOpen={isAddMachineModalOpen}
        onClose={() => setIsAddMachineModalOpen(false)}
        title={isAr ? 'تسجيل ماكينة ومعدة جديدة بالمصنع' : 'Register New Machine Asset'}
        maxWidth="md"
      >
        <form onSubmit={handleAddMachine} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'كود الماكينة الداخلي *' : 'Asset Code *'}
              </label>
              <input
                type="text"
                required
                placeholder="مثال: MCH-SEW-09"
                value={newMachine.machine_code}
                onChange={(e) => setNewMachine({ ...newMachine, machine_code: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم الماكينة / المعدة *' : 'Machine Name *'}
              </label>
              <input
                type="text"
                required
                placeholder="مثال: ماكينة خياطة سنجر 1 إبرة"
                value={newMachine.name}
                onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع المعدة' : 'Equipment Type'}
              </label>
              <select
                value={newMachine.machine_type}
                onChange={(e) => setNewMachine({ ...newMachine, machine_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="sewing">{isAr ? 'ماكينة خياطة (سنجر/سراجة)' : 'Sewing Machine'}</option>
                <option value="cutting">{isAr ? 'مقص ومعدات صالة القص' : 'Cutting Equipment'}</option>
                <option value="overlock">{isAr ? 'ماكينة أوفرلوك' : 'Overlock Machine'}</option>
                <option value="ironing">{isAr ? 'مكبس ومعدات كي وبخار' : 'Fusing & Ironing'}</option>
                <option value="buttonhole">{isAr ? 'عراوي وأزرار' : 'Buttonhole / Button Attach'}</option>
                <option value="interlock">{isAr ? 'ماكينة أورليه كولاريت' : 'Interlock Machine'}</option>
                <option value="embroidery">{isAr ? 'ماكينة تطريز كمبيوتر' : 'Embroidery Machine'}</option>
                <option value="other">{isAr ? 'أخرى' : 'Other Equipment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'موقع الماكينة بالمصنع' : 'Floor Location'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'مثال: خط إنتاج 1 - مرحلة الحياكة' : 'Floor 1 - Line B'}
                value={newMachine.location}
                onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الموديل' : 'Model #'}
              </label>
              <input
                type="text"
                placeholder="e.g. DDL-9000C"
                value={newMachine.model_number}
                onChange={(e) => setNewMachine({ ...newMachine, model_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الرقم التسلسلي (SN)' : 'Serial #'}
              </label>
              <input
                type="text"
                placeholder="SN-9941"
                value={newMachine.serial_number}
                onChange={(e) => setNewMachine({ ...newMachine, serial_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'دورية الصيانة (أيام)' : 'Interval (Days)'}
              </label>
              <input
                type="number"
                min="1"
                value={newMachine.maintenance_interval_days}
                onChange={(e) => setNewMachine({ ...newMachine, maintenance_interval_days: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات ومواصفات التشغيل' : 'Notes & Specs'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: تعمل بكهرباء 220 فولت، سرعة دوران 5000 غرزة/دقيقة' : 'Technical notes...'}
              value={newMachine.notes}
              onChange={(e) => setNewMachine({ ...newMachine, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAddMachineModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" icon={<Plus className="w-3.5 h-3.5" />}>
              {isAr ? 'حفظ وتسجيل الماكينة' : 'Save Machine'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 9. MODAL 2: REPORT BREAKDOWN / WORK ORDER */}
      <Modal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        title={isAr ? 'إبلاغ عن عطل / إنشاء أمر صيانة جديد' : 'Report Breakdown / Work Order'}
        maxWidth="md"
      >
        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الماكينة المستهدفة *' : 'Target Machine *'}
            </label>
            <select
              required
              value={newOrder.machine_id}
              onChange={(e) => setNewOrder({ ...newOrder, machine_id: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">{isAr ? '-- اختر الماكينة المستهدفة --' : '-- Select Machine --'}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_code} - {m.name} ({m.location || 'خط الإنتاج'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع العمل والصيانة' : 'Work Type'}
              </label>
              <select
                value={newOrder.work_type}
                onChange={(e) => setNewOrder({ ...newOrder, work_type: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="breakdown">{isAr ? '🚨 عطل وتوقف مفاجئ (Breakdown)' : 'Breakdown'}</option>
                <option value="preventive">{isAr ? '📅 صيانة دورية وقائية (Preventive)' : 'Preventive'}</option>
                <option value="emergency">{isAr ? '⚡ طوارئ وسلامة مهنية (Emergency)' : 'Emergency'}</option>
                <option value="calibration">{isAr ? '⚙️ معايرة وضبط جودة (Calibration)' : 'Calibration'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مستوى الأولوية' : 'Priority Level'}
              </label>
              <select
                value={newOrder.priority}
                onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="critical">{isAr ? '🔥 حرجة (توقف خط الإنتاج)' : 'Critical (Line Down)'}</option>
                <option value="high">{isAr ? 'عالية' : 'High'}</option>
                <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'وصف العطل بالتفصيل *' : 'Issue Description *'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={isAr ? 'اذكر الأعراض، مكان العطل، وملاحظات المشغل وتأثيره على خط الإنتاج...' : 'Describe fault symptoms, line impact...'}
              value={newOrder.issue_description}
              onChange={(e) => setNewOrder({ ...newOrder, issue_description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مبلغ العطل / المشرف' : 'Reported By'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'مثال: مشرف الوردية أسامة' : 'Line Supervisor'}
                value={newOrder.reported_by}
                onChange={(e) => setNewOrder({ ...newOrder, reported_by: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم الفني المسند إليه' : 'Assigned Technician'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'مثال: م. أحمد عبد الفتاح' : 'Maintenance Tech'}
                value={newOrder.technician_name}
                onChange={(e) => setNewOrder({ ...newOrder, technician_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsWorkOrderModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" icon={<Wrench className="w-3.5 h-3.5" />}>
              {isAr ? 'إصدار أمر الصيانة' : 'Dispatch Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 10. MODAL 3: COMPLETE WORK ORDER */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={isAr ? `إتمام وإغلاق أمر الصيانة: ${selectedOrder.order_number}` : `Complete Work Order: ${selectedOrder.order_number}`}
          maxWidth="md"
        >
          <form onSubmit={handleCompleteWorkOrder} className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'وصف العطل المسجل:' : 'Issue:'}
              </div>
              <p className="text-slate-600 dark:text-slate-300">{selectedOrder.issue_description}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تقرير الإصلاح والإجراءات المتخذة *' : 'Resolution Notes *'}
              </label>
              <textarea
                required
                rows={3}
                placeholder={isAr ? 'تم استبدال الكروشيه، تنظيف حوض الزيت، وضبط المعايرة واختبار 50 قطعة بنجاح...' : 'Parts replaced, tested under load...'}
                value={completeData.resolution_notes}
                onChange={(e) => setCompleteData({ ...completeData, resolution_notes: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'ساعات توقف الماكينة الفعلية' : 'Actual Downtime (Hours)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={completeData.downtime_hours}
                  onChange={(e) => setCompleteData({ ...completeData, downtime_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تكلفة المصنعية وأجر الفني (ج.م)' : 'Labor Cost (EGP)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={completeData.labor_cost}
                  onChange={(e) => setCompleteData({ ...completeData, labor_cost: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => setSelectedOrder(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button type="submit" variant="primary" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                {isAr ? 'تأكيد اكتمال الصيانة وتشغيل الماكينة' : 'Confirm Completion'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 11. MODAL 4: ISSUE SPARE PART & STOCK AUTO-DEDUCTION */}
      <Modal
        isOpen={isSparePartModalOpen}
        onClose={() => {
          if (!isSubmittingPart) {
            setIsSparePartModalOpen(false);
          }
        }}
        title={isAr ? 'صرف قطعة غيار وخصمها من المستودع لأمر صيانة' : 'Issue Spare Part & Deduct from Stock'}
        maxWidth="md"
      >
        <form onSubmit={handleAddSparePart} className="space-y-4">
          {/* Target Work Order */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'أمر الصيانة المستهدف *' : 'Target Work Order *'}
            </label>
            <select
              required
              value={selectedWoForPart}
              onChange={(e) => setSelectedWoForPart(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">{isAr ? '-- اختر أمر الشغل المرتبط --' : '-- Select Work Order --'}</option>
              {workOrders.map((wo) => {
                const mch = machines.find((m) => m.id === wo.machine_id);
                return (
                  <option key={wo.id} value={wo.id}>
                    {wo.order_number} — {mch?.name || (isAr ? 'ماكينة' : 'Machine')} ({wo.issue_description?.slice(0, 35)}...)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Part Source Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'مصدر قطعة الغيار' : 'Part Source'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPartSource('stock')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  partSource === 'stock'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAr ? 'سحب من المستودع (خصم فوري آلي)' : 'From Warehouse Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPartSource('custom');
                  setSelectedInventoryItemId('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  partSource === 'custom'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>{isAr ? 'بند مباشر / شراء طارئ' : 'Direct / Manual Entry'}</span>
              </button>
            </div>
          </div>

          {/* If Stock Mode: Pick from Warehouse Inventory */}
          {partSource === 'stock' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'اختر قطعة الغيار من رصيد المستودع *' : 'Select Part from Inventory *'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddSparePartStockModalOpen(true)}
                  className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isAr ? 'إضافة قطعة جديدة للمخزن' : 'Add new item'}</span>
                </button>
              </div>

              <select
                required
                value={selectedInventoryItemId}
                onChange={(e) => {
                  const itemId = e.target.value;
                  setSelectedInventoryItemId(itemId);
                  const found = sparePartsStock.find((item) => item.id === itemId);
                  if (found) {
                    setNewPartName(found.name);
                    setNewPartNumber(found.item_code || found.code || '');
                    setNewPartUnitCost(Number(found.unit_cost || found.average_cost || 0));
                  } else {
                    setNewPartName('');
                    setNewPartNumber('');
                    setNewPartUnitCost(0);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">{isAr ? '-- اختر قطعة الغيار المتوفرة بالمخزن --' : '-- Select Stock Item --'}</option>
                {sparePartsStock.map((item) => {
                  const balance = Number(item.current_balance || 0);
                  return (
                    <option key={item.id} value={item.id} disabled={balance <= 0}>
                      {item.name} ({item.item_code || item.code}) — {isAr ? 'المتاح بالمخزن:' : 'Stock:'} {balance} {item.unit_of_measure || 'قطعة'} [{item.warehouse?.name || 'المستودع الرئيسي'}] {balance <= 0 ? (isAr ? '(نفد)' : '(Out)') : ''}
                    </option>
                  );
                })}
              </select>

              {/* Live Stock Notification */}
              {selectedInventoryItemId && (() => {
                const found = sparePartsStock.find((item) => item.id === selectedInventoryItemId);
                if (!found) return null;
                const balance = Number(found.current_balance || 0);
                const isOver = newPartQty > balance;

                return (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                      isOver
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 shrink-0" />
                      <span>
                        {isAr ? 'الرصيد المتاح حالياً بالمستودع:' : 'Warehouse Balance:'}{' '}
                        <strong>
                          {balance} {found.unit_of_measure || 'قطعة'}
                        </strong>
                      </span>
                    </div>
                    {isOver && (
                      <span className="font-bold text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded">
                        {isAr ? '⚠️ الكمية تتجاوز الرصيد!' : 'Exceeds Stock!'}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم قطعة الغيار المستهلكة *' : 'Part Name *'}
              </label>
              <input
                type="text"
                required
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder={isAr ? 'مثال: كروشيه أصلي، سير سحب، طقم إبر' : 'e.g. Needle plate, Timing belt'}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم / كود القطعة (Part #)' : 'Part Number'}
              </label>
              <input
                type="text"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                placeholder="e.g. SP-NDL-14"
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكمية المنصرفة *' : 'Quantity *'}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={newPartQty}
                onChange={(e) => setNewPartQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تكلفة الوحدة (ج.م) *' : 'Unit Cost (EGP) *'}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={newPartUnitCost}
              onChange={(e) => setNewPartUnitCost(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* GL Accounting summary box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
              <span>{isAr ? 'إجمالي تكلفة الصرف:' : 'Total Cost:'}</span>
              <span className="font-mono text-sm text-amber-600 dark:text-amber-400">
                {(Number(newPartQty) * Number(newPartUnitCost)).toLocaleString()} ج.م
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {isAr
                  ? 'يتم ترحيل هذه التكلفة مباشرة إلى حساب مصروفات المصنع (6010: مصاريف صناعية غير مباشرة واستهلاك) عند إتمام الصيانة.'
                  : 'Posted to Factory GL Account 6010 upon work order completion.'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmittingPart}
              onClick={() => setIsSparePartModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={
                isSubmittingPart ||
                (partSource === 'stock' && !selectedInventoryItemId) ||
                (partSource === 'stock' && (() => {
                  const found = sparePartsStock.find((item) => item.id === selectedInventoryItemId);
                  return found && newPartQty > Number(found.current_balance || 0);
                })())
              }
              icon={<Package className={`w-3.5 h-3.5 ${isSubmittingPart ? 'animate-spin' : ''}`} />}
            >
              {isSubmittingPart
                ? (isAr ? 'جاري الصرف والخصم...' : 'Processing...')
                : (isAr ? 'تأكيد الصرف والخصم من المستودع' : 'Confirm Issue & Deduct')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 12. MODAL 6: ADD NEW SPARE PART TO WAREHOUSE STOCK */}
      <Modal
        isOpen={isAddSparePartStockModalOpen}
        onClose={() => {
          if (!isSubmittingStockPart) {
            setIsAddSparePartStockModalOpen(false);
          }
        }}
        title={isAr ? 'إضافة وتوريد قطعة غيار جديدة إلى مخزن المصنع' : 'Register New Spare Part to Warehouse'}
        maxWidth="md"
      >
        <form onSubmit={handleAddSparePartStock} className="space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <Boxes className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              {isAr
                ? 'إضافة قطع الغيار إلى المخزن يتيح لك الصرف الفوري مع الخصم التلقائي من الرصيد والربط التلقائي بدفتر مصروفات المصنع.'
                : 'Items added to inventory can be issued with automatic stock deduction and accounting synchronization.'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم قطعة الغيار *' : 'Part Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: كروشيه أصلي ماكينة سنجر' : 'e.g. Rotary Hook'}
                value={newStockPart.name}
                onChange={(e) => setNewStockPart({ ...newStockPart, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'كود / رقم القطعة (Part #) *' : 'Part Number / SKU *'}
              </label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: SP-CHK-01' : 'e.g. SP-CHK-01'}
                value={newStockPart.part_number}
                onChange={(e) => setNewStockPart({ ...newStockPart, part_number: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المستودع المستهدف *' : 'Target Warehouse *'}
              </label>
              <select
                required
                value={newStockPart.warehouse_id}
                onChange={(e) => setNewStockPart({ ...newStockPart, warehouse_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                {warehouses.length === 0 ? (
                  <option value="">{isAr ? 'المستودع الرئيسي' : 'Main Warehouse'}</option>
                ) : (
                  warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} {wh.code ? `(${wh.code})` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وحدة القياس *' : 'Unit of Measure *'}
              </label>
              <select
                value={newStockPart.unit_of_measure}
                onChange={(e) => setNewStockPart({ ...newStockPart, unit_of_measure: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="قطعة">{isAr ? 'قطعة (Pcs)' : 'Pcs'}</option>
                <option value="طقم">{isAr ? 'طقم (Set)' : 'Set'}</option>
                <option value="لتر">{isAr ? 'لتر (Litre)' : 'Litre'}</option>
                <option value="علبة">{isAr ? 'علبة / باكو (Pack)' : 'Pack'}</option>
                <option value="متر">{isAr ? 'متر (Meter)' : 'Meter'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الرصيد الافتتاحي *' : 'Initial Stock *'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={newStockPart.initial_balance}
                onChange={(e) => setNewStockPart({ ...newStockPart, initial_balance: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تكلفة الشراء للوحدة (ج.م) *' : 'Unit Cost (EGP) *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                required
                value={newStockPart.unit_cost}
                onChange={(e) => setNewStockPart({ ...newStockPart, unit_cost: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حد إعادة الطلب *' : 'Reorder Level *'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={newStockPart.reorder_level}
                onChange={(e) => setNewStockPart({ ...newStockPart, reorder_level: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الوصف وملاحظات الاستخدام' : 'Description & Notes'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: مناسبة لماكينات الخياطة الأوتوماتيك وسنجر موديل 8700' : 'e.g. Compatible with DDL-8700'}
              value={newStockPart.description}
              onChange={(e) => setNewStockPart({ ...newStockPart, description: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmittingStockPart}
              onClick={() => setIsAddSparePartStockModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingStockPart || !newStockPart.name}
              icon={<Boxes className={`w-3.5 h-3.5 ${isSubmittingStockPart ? 'animate-spin' : ''}`} />}
            >
              {isSubmittingStockPart
                ? (isAr ? 'جاري الحفظ في المخزن...' : 'Saving to Stock...')
                : (isAr ? 'إضافة القطعة للمخزن' : 'Add to Warehouse')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 13. MODAL 5: MACHINE DETAILS & HISTORY CARD */}
      {viewingMachineDetails && (
        <Modal
          isOpen={Boolean(viewingMachineDetails)}
          onClose={() => setViewingMachineDetails(null)}
          title={isAr ? `الملف الفني للماكينة: ${viewingMachineDetails.name}` : `Asset Profile: ${viewingMachineDetails.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Header Micro Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-md">
                    {viewingMachineDetails.machine_code}
                  </span>
                  <h3 className="text-base font-bold">{viewingMachineDetails.name}</h3>
                </div>
                <p className="text-xs text-slate-300 font-mono mt-1">
                  {viewingMachineDetails.model_number || 'Model: N/A'} • SN: {viewingMachineDetails.serial_number || 'N/A'}
                </p>
              </div>
              <div>{getMachineStatusBadge(viewingMachineDetails.status)}</div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'نوع المعدة:' : 'Type:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{viewingMachineDetails.machine_type}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'موقع خط الإنتاج:' : 'Location:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{viewingMachineDetails.location || '—'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'دورية الصيانة:' : 'Interval:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">{viewingMachineDetails.maintenance_interval_days} يوم</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px]">{isAr ? 'الصيانة القادمة:' : 'Next Due:'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block font-mono">{viewingMachineDetails.next_maintenance_date || '—'}</span>
              </div>
            </div>

            {/* Breakdown History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                <span>{isAr ? 'سجل أوامر الصيانة والأعطال السابقة لهذه الماكينة:' : 'Maintenance History:'}</span>
              </h4>

              {workOrders.filter((wo) => wo.machine_id === viewingMachineDetails.id).length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400">
                  {isAr ? 'لا توجد بلاغات أعطال سابقة مسجلة لهذه الماكينة (سجل نظيف).' : 'No work orders logged for this machine.'}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {workOrders
                    .filter((wo) => wo.machine_id === viewingMachineDetails.id)
                    .map((wo) => (
                      <div
                        key={wo.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">{wo.order_number}</span>
                            <span className="text-[10px] text-slate-400">{wo.scheduled_date || wo.created_at}</span>
                            <Badge variant={wo.status === 'completed' ? 'success' : 'warning'}>
                              {wo.status === 'completed' ? 'تم الإصلاح' : 'قيد التنفيذ'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 truncate max-w-md">
                            {wo.issue_description}
                          </p>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-bold text-slate-900 dark:text-white block">{Number(wo.total_cost).toLocaleString()} ج.م</span>
                          <span className="text-[10px] text-amber-600 block">{wo.downtime_hours || 0} س توقف</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const mch = viewingMachineDetails;
                  setViewingMachineDetails(null);
                  setViewingMachineBarcode(mch);
                }}
                className="text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة باركود وبطاقة الماكينة' : 'Print Asset QR'}</span>
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setViewingMachineDetails(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 13. MODAL 6: PRINTABLE ASSET CARD / BARCODE */}
      {viewingMachineBarcode && (
        <Modal
          isOpen={Boolean(viewingMachineBarcode)}
          onClose={() => setViewingMachineBarcode(null)}
          title={isAr ? `بطاقة أصل صناعي: ${viewingMachineBarcode.machine_code}` : `Asset Card: ${viewingMachineBarcode.machine_code}`}
          maxWidth="md"
        >
          <div className="printable-voucher space-y-4">
            <div className="border-2 border-slate-900 dark:border-slate-300 p-5 rounded-2xl bg-white text-slate-900 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black tracking-tight">{isAr ? 'مصنع الملابس الجاهزة' : 'Garment Factory'}</h3>
                  <span className="text-[11px] font-mono text-slate-500 block">{isAr ? 'بطاقة تعريف أصل صناعي رسمي' : 'Industrial Equipment Asset Tag'}</span>
                </div>
                <div className="text-left">
                  <span className="font-mono text-lg font-black text-indigo-700 block">{viewingMachineBarcode.machine_code}</span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {viewingMachineBarcode.id.slice(0, 8)}</span>
                </div>
              </div>

              {/* Machine Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'اسم المعدة:' : 'Equipment:'}</span>
                  <strong className="text-slate-900 text-xs block mt-0.5">{viewingMachineBarcode.name}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'الموديل والسيريال:' : 'Model & SN:'}</span>
                  <strong className="text-slate-900 text-xs font-mono block mt-0.5">
                    {viewingMachineBarcode.model_number || 'N/A'} • {viewingMachineBarcode.serial_number || 'N/A'}
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'موقع خط الإنتاج:' : 'Location:'}</span>
                  <strong className="text-slate-900 text-xs block mt-0.5">{viewingMachineBarcode.location || 'General Floor'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'دورية الصيانة:' : 'Interval:'}</span>
                  <strong className="text-slate-900 text-xs font-mono block mt-0.5">{viewingMachineBarcode.maintenance_interval_days} يوم</strong>
                </div>
              </div>

              {/* QR Mock Pattern & Barcode */}
              <div className="p-3 bg-slate-100 rounded-xl text-center space-y-1">
                <div className="font-mono text-xs font-black tracking-widest text-slate-800">
                  * {viewingMachineBarcode.machine_code} *
                </div>
                <div className="h-9 w-48 mx-auto bg-[repeating-linear-gradient(90deg,#000,#000_2px,transparent_2px,transparent_4px)] opacity-85" />
                <span className="text-[9px] text-slate-500 font-mono block">SCAN FOR WORK ORDER / BREAKDOWN LOG</span>
              </div>

              {/* Stamp & Verification */}
              <div className="flex justify-between items-center pt-2 text-[10px] text-slate-500 border-t">
                <span>{isAr ? 'اعتماد إدارة الصيانة والتشغيل' : 'Maintenance Dept Stamp'}</span>
                <span className="font-mono font-bold text-emerald-700">✓ CERTIFIED ASSET</span>
              </div>
            </div>

            <div className="flex justify-between items-center print:hidden no-print">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة البطاقة' : 'Print Label'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewingMachineBarcode(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 14. MODAL 7: PRINTABLE WORK ORDER */}
      {orderToPrint && (
        <Modal
          isOpen={Boolean(orderToPrint)}
          onClose={() => setOrderToPrint(null)}
          title={isAr ? `إذن صيانة رسمي: ${orderToPrint.order_number}` : `Work Order: ${orderToPrint.order_number}`}
          maxWidth="md"
        >
          <div className="printable-voucher space-y-4">
            <div className="border border-slate-300 p-5 rounded-2xl bg-white text-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{isAr ? 'مصنع الملابس الجاهزة' : 'Garment Factory'}</h3>
                  <p className="text-xs text-slate-500 font-mono">{isAr ? 'إذن وأمر صيانة ماكينات صناعي' : 'Industrial Maintenance Work Order'}</p>
                </div>
                <div className="text-left font-mono">
                  <span className="font-bold text-indigo-700 block text-sm">{orderToPrint.order_number}</span>
                  <span className="text-xs text-slate-400">{orderToPrint.scheduled_date || orderToPrint.created_at}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'الماكينة المستهدفة:' : 'Machine:'}</span>
                  <strong className="text-slate-900">{machines.find((m) => m.id === orderToPrint.machine_id)?.name || 'ماكينة خط الإنتاج'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'نوع الصيانة والأولوية:' : 'Type & Priority:'}</span>
                  <strong className="text-slate-900">
                    {orderToPrint.work_type === 'breakdown' ? 'عطل مفاجئ' : 'صيانة وقائية'} ({orderToPrint.priority})
                  </strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'الفني المسند إليه:' : 'Technician:'}</span>
                  <strong className="text-slate-900">{orderToPrint.technician_name || 'غير مسند'}</strong>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
                  <strong className="text-slate-900 font-mono text-sm">{Number(orderToPrint.total_cost || 0).toLocaleString()} ج.م</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] text-slate-400 block">{isAr ? 'وصف العطل / المشكلة:' : 'Issue:'}</span>
                <p className="mt-0.5 font-medium">{orderToPrint.issue_description}</p>
              </div>

              {orderToPrint.resolution_notes && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-[10px] text-emerald-700 block font-bold">{isAr ? 'تقرير الإصلاح والإجراءات:' : 'Resolution:'}</span>
                  <p className="mt-0.5 text-emerald-900">{orderToPrint.resolution_notes}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center text-[10px] text-slate-500">
                <div>
                  <span>{isAr ? 'مشرف الخط' : 'Supervisor'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <span>{isAr ? 'الفني المنفذ' : 'Technician'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
                <div>
                  <span>{isAr ? 'اعتماد مدير الصيانة' : 'Maintenance Mgr'}</span>
                  <div className="mt-6 border-b border-dashed border-slate-300"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center print:hidden no-print">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="font-bold flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? 'طباعة الإذن' : 'Print Order'}</span>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOrderToPrint(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

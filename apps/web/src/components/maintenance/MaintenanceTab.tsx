import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  ShieldAlert,
  Cpu,
  Package,
  RefreshCw,
  AlertCircle,
  Printer,
  Eye,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { api } from '../../api/client';
import type { Language, Machine, MaintenanceWorkOrder, MaintenanceSparePart, DowntimeSummary } from '../../types';

interface MaintenanceTabProps {
  lang: Language;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'machines' | 'workorders' | 'spareparts' | 'analytics'>('machines');
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSparePartModalOpen, setIsSparePartModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceWorkOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initial State for Machines
  const [machines, setMachines] = useState<Machine[]>([]);
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([]);
  const [downtimeSummary, setDowntimeSummary] = useState<DowntimeSummary | null>(null);

  const loadMaintenanceData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [mchRes, woRes, dtRes] = await Promise.allSettled([
        api.maintenance.getMachines(1),
        api.maintenance.getWorkOrders(1),
        api.maintenance.getDowntimeSummary(),
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
  const spareParts: (MaintenanceSparePart & { work_order_number?: string })[] = workOrders.flatMap((wo) =>
    (wo.spare_parts || []).map((sp) => ({
      ...sp,
      work_order_id: wo.id,
      work_order_number: wo.order_number,
    }))
  );

  // New Spare Part Form State
  const [selectedWoForPart, setSelectedWoForPart] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartUnitCost, setNewPartUnitCost] = useState<number>(150);

  // New Machine Form State
  const [newMachine, setNewMachine] = useState({
    machine_code: '',
    name: '',
    model_number: '',
    machine_type: 'sewing',
    location: '',
    maintenance_interval_days: 30,
  });

  // New Work Order Form State
  const [newOrder, setNewOrder] = useState({
    machine_id: '',
    work_type: 'breakdown',
    priority: 'high',
    issue_description: '',
    reported_by: '',
    technician_name: '',
    labor_cost: 100,
  });

  // Complete Order Form State
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
        machine_code: newMachine.machine_code,
        name: newMachine.name,
        model_number: newMachine.model_number,
        machine_type: newMachine.machine_type,
        location: newMachine.location,
        maintenance_interval_days: Number(newMachine.maintenance_interval_days) || 30,
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
        machine_type: 'sewing',
        location: '',
        maintenance_interval_days: 30,
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
        issue_description: newOrder.issue_description,
        reported_by: newOrder.reported_by,
        technician_name: newOrder.technician_name,
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
        resolution_notes: completeData.resolution_notes,
        downtime_hours: Number(completeData.downtime_hours) || 0,
      });

      await loadMaintenanceData();
      setIsCompleteModalOpen(false);
      setSelectedOrder(null);
      setCompleteData({ resolution_notes: '', downtime_hours: 1.5, labor_cost: 120 });
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إغلاق أمر الصيانة' : 'Failed to complete work order'));
    }
  };

  const handleAddSparePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWoForPart || !newPartName || newPartQty <= 0) return;

    try {
      await (api as any).request(`/maintenance/work-orders/${selectedWoForPart}/spare-parts`, {
        method: 'POST',
        body: JSON.stringify({
          part_name: newPartName,
          part_number: newPartNumber || undefined,
          quantity: newPartQty,
          unit_cost: newPartUnitCost,
        }),
      });

      await loadMaintenanceData();
      setIsSparePartModalOpen(false);
      setNewPartName('');
      setNewPartNumber('');
      setNewPartQty(1);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة قطعة الغيار' : 'Failed to add spare part'));
    }
  };

  // Authoritative server-backed metrics
  const totalMachines = downtimeSummary?.total_machines ?? machines.length;
  const operationalCount = downtimeSummary?.operational_machines ?? machines.filter((m) => m.status === 'operational').length;
  const breakdownCount = downtimeSummary?.down_machines ?? machines.filter((m) => m.status === 'breakdown').length;
  const underMaintenanceCount = machines.filter((m) => m.status === 'under_maintenance').length;
  const totalDowntimeHours = downtimeSummary?.total_downtime_hours ?? workOrders.reduce((sum, wo) => sum + (Number(wo.downtime_hours) || 0), 0);
  const totalMaintenanceExpense = downtimeSummary?.total_maintenance_cost ?? workOrders.reduce((sum, wo) => sum + (Number(wo.total_cost) || 0), 0);

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadMaintenanceData} className="text-xs py-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل سجلات الصيانة والماكينات...' : 'Loading asset maintenance records...'}</span>
        </div>
      )}

      {/* Top Banner / Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-emerald-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {isAr ? 'الماكينات العاملة' : 'Operational Assets'}
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {operationalCount} / {totalMachines}
              </h3>
              <p className="text-xs text-emerald-600 mt-1 font-semibold">
                {Math.round((operationalCount / (totalMachines || 1)) * 100)}% {isAr ? 'كفاءة تشغيلية' : 'Availability'}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-rose-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {isAr ? 'أعطال متوقفة حالياً' : 'Active Breakdowns'}
              </p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">
                {breakdownCount + underMaintenanceCount}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {breakdownCount} {isAr ? 'عطل حرج' : 'Critical'} | {underMaintenanceCount} {isAr ? 'صيانة جارية' : 'In Service'}
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-amber-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {isAr ? 'ساعات التوقف الكلية' : 'Total Downtime'}
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {totalDowntimeHours.toFixed(1)} {isAr ? 'ساعة' : 'Hrs'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'تأثير خطوط الإنتاج' : 'Lost floor production'}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {isAr ? 'تكلفة الصيانة وقطع الغيار' : 'Maintenance Expense'}
              </p>
              <h3 className="text-2xl font-bold text-foreground mt-1">
                {totalMaintenanceExpense.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {isAr ? 'شاملة أجور الفنيين والقطع' : 'Spare parts & labor'}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Action Bar & Subtabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeSubTab === 'machines' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('machines')}
            className="flex items-center gap-2"
          >
            <Cpu className="w-4 h-4" />
            {isAr ? 'سجل الماكينات والمعدات' : 'Asset Register'}
          </Button>

          <Button
            variant={activeSubTab === 'workorders' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('workorders')}
            className="flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            {isAr ? 'أوامر الصيانة وبلاغات الأعطال' : 'Work Orders & Tickets'}
          </Button>

          <Button
            variant={activeSubTab === 'spareparts' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setActiveSubTab('spareparts')}
            className="flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            {isAr ? 'مخزون قطع الغيار' : 'Spare Parts'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {activeSubTab === 'spareparts' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSparePartModalOpen(true)}
              className="flex items-center gap-1 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4" />
              {isAr ? 'صرف قطعة غيار لأمر صيانة' : 'Add Spare Part'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWorkOrderModalOpen(true)}
            className="flex items-center gap-1 border-rose-600/30 text-rose-600 hover:bg-rose-500/10"
          >
            <ShieldAlert className="w-4 h-4" />
            {isAr ? 'إبلاغ عن عطل / طلب صيانة' : 'Report Breakdown'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddMachineModalOpen(true)}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {isAr ? 'تسجيل ماكينة جديدة' : 'Add Machine'}
          </Button>
        </div>
      </div>

      {/* Subtab 1: Machines Register */}
      {activeSubTab === 'machines' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-semibold">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود الماكينة' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم المعدة / الموديل' : 'Asset Name & Model'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع والموقع' : 'Type & Location'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'دورية الصيانة' : 'Interval'}</th>
                  <th className="p-3 text-start">{isAr ? 'الصيانة القادمة' : 'Next Due'}</th>
                  <th className="p-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {machines.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono font-semibold text-xs text-primary">
                      {m.machine_code}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-foreground">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.model_number || 'N/A'} • SN: {m.serial_number || 'N/A'}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="capitalize font-medium text-foreground">{m.machine_type}</span>
                      <div className="text-xs text-muted-foreground">{m.location || 'General Floor'}</div>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          m.status === 'operational'
                            ? 'success'
                            : m.status === 'breakdown'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {m.status === 'operational'
                          ? isAr
                            ? 'جاهزة للعمل'
                            : 'Operational'
                          : m.status === 'breakdown'
                          ? isAr
                            ? 'عطل وتوقف'
                            : 'Breakdown'
                          : isAr
                          ? 'تحت الصيانة'
                          : 'In Maintenance'}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {m.maintenance_interval_days} {isAr ? 'يوم' : 'Days'}
                    </td>
                    <td className="p-3 text-xs">
                      <span className="font-semibold text-foreground">{m.next_maintenance_date || 'N/A'}</span>
                    </td>
                    <td className="p-3 text-end">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewOrder((prev) => ({ ...prev, machine_id: m.id }));
                            setIsWorkOrderModalOpen(true);
                          }}
                          className="text-xs py-1"
                        >
                          <Wrench className="w-3.5 h-3.5 me-1" />
                          {isAr ? 'طلب صيانة' : 'Service'}
                        </Button>
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'barcode',
                              label: isAr ? 'طباعة باركود الماكينة' : 'Print Asset QR',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'orders',
                              label: isAr ? 'سجل أعطال الماكينة' : 'Asset Breakdown History',
                              icon: <Eye className="w-3.5 h-3.5 text-blue-500" />,
                              onClick: () => setActiveSubTab('workorders'),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subtab 2: Maintenance Work Orders */}
      {activeSubTab === 'workorders' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-semibold">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم الإذن' : 'Order #'}</th>
                  <th className="p-3 text-start">{isAr ? 'الماكينة المستهدفة' : 'Machine Asset'}</th>
                  <th className="p-3 text-start">{isAr ? 'نوع العمل والأولوية' : 'Type & Priority'}</th>
                  <th className="p-3 text-start">{isAr ? 'وصف المشكلة / الفني' : 'Issue & Tech'}</th>
                  <th className="p-3 text-start">{isAr ? 'التكلفة الإجمالية' : 'Total Cost'}</th>
                  <th className="p-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-end">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {workOrders.map((wo) => {
                  const mch = machines.find((m) => m.id === wo.machine_id);
                  return (
                    <tr key={wo.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-xs text-foreground">
                        {wo.order_number}
                        <div className="text-[11px] text-muted-foreground">{wo.created_at}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-foreground">{mch ? mch.name : 'Unknown Machine'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{mch?.machine_code}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant={wo.work_type === 'breakdown' ? 'danger' : 'neutral'}>
                          {wo.work_type === 'breakdown'
                            ? isAr
                              ? 'عطل مفاجئ'
                              : 'Breakdown'
                            : isAr
                            ? 'صيانة دورية'
                            : 'Preventive'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1 capitalize">
                          {isAr ? 'أولوية: ' : 'Priority: '}
                          <span
                            className={
                              wo.priority === 'critical'
                                ? 'text-rose-600 font-bold'
                                : wo.priority === 'high'
                                ? 'text-amber-600 font-semibold'
                                : 'text-foreground'
                            }
                          >
                            {wo.priority}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="text-xs text-foreground font-medium truncate">{wo.issue_description}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {isAr ? 'الفني: ' : 'Tech: '} {wo.technician_name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-foreground">
                          {wo.total_cost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {wo.downtime_hours} {isAr ? 'ساعة توقف' : 'Hrs Downtime'}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            wo.status === 'completed'
                              ? 'success'
                              : wo.status === 'in_progress'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {wo.status === 'completed'
                            ? isAr
                              ? 'تم الإصلاح'
                              : 'Completed'
                            : wo.status === 'in_progress'
                            ? isAr
                              ? 'قيد التنفيذ'
                              : 'In Progress'
                            : isAr
                            ? 'مجدول'
                            : 'Scheduled'}
                        </Badge>
                      </td>
                      <td className="p-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {wo.status !== 'completed' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(wo);
                                setIsCompleteModalOpen(true);
                              }}
                              className="text-xs py-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5 me-1" />
                              {isAr ? 'إتمام وإغلاق' : 'Complete'}
                            </Button>
                          ) : (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                              <CheckCircle className="w-3.5 h-3.5 me-1" />
                              {isAr ? 'تم الإصلاح' : 'Closed'}
                            </span>
                          )}
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
                              {
                                id: 'print-wo',
                                label: isAr ? 'طباعة إذن الصيانة' : 'Print Work Order',
                                icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                                onClick: () => window.print(),
                              },
                              {
                                id: 'add-part',
                                label: isAr ? 'صرف قطعة غيار لهذا الإذن' : 'Issue Spare Part',
                                icon: <Package className="w-3.5 h-3.5 text-amber-500" />,
                                onClick: () => {
                                  setSelectedWoForPart(wo.id);
                                  setIsSparePartModalOpen(true);
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Subtab 3: Spare Parts Inventory */}
      {activeSubTab === 'spareparts' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-semibold">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'اسم قطعة الغيار' : 'Part Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'رقم القطعة (Part #)' : 'Part Number'}</th>
                  <th className="p-3 text-start">{isAr ? 'الكمية المتوفرة' : 'Stock Qty'}</th>
                  <th className="p-3 text-start">{isAr ? 'سعر الوحدة' : 'Unit Cost'}</th>
                  <th className="p-3 text-start">{isAr ? 'القيمة الإجمالية' : 'Total Asset Value'}</th>
                  <th className="p-3 text-end">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spareParts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      {isAr ? 'لا توجد قطع غيار منصرفة لأوامر الصيانة حالياً' : 'No spare parts logged to work orders'}
                    </td>
                  </tr>
                ) : (
                  spareParts.map((sp, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium text-foreground">
                        {sp.part_name}
                        {sp.work_order_number && (
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {isAr ? 'أمر صيانة: ' : 'Order: '} {sp.work_order_number}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{sp.part_number || '—'}</td>
                      <td className="p-3 font-semibold text-foreground">{sp.quantity}</td>
                      <td className="p-3">
                        {Number(sp.unit_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 font-semibold text-primary">
                        {(Number(sp.total_cost) || (Number(sp.quantity) * Number(sp.unit_cost))).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-end">
                        <Badge variant={Number(sp.quantity) > 5 ? 'success' : 'warning'}>
                          {Number(sp.quantity) > 5
                            ? isAr
                              ? 'منصرف وموثق'
                              : 'Logged'
                            : isAr
                            ? 'منصرف'
                            : 'Logged'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Register Machine */}
      <Modal
        isOpen={isAddMachineModalOpen}
        onClose={() => setIsAddMachineModalOpen(false)}
        title={isAr ? 'تسجيل ماكينة ومعدة جديدة بالمصنع' : 'Register New Machine Asset'}
      >
        <form onSubmit={handleAddMachine} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'كود الماكينة الداخلي *' : 'Asset Code *'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SEW-BROTHER-04"
                value={newMachine.machine_code}
                onChange={(e) => setNewMachine({ ...newMachine, machine_code: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'اسم الماكينة / المعدة *' : 'Machine Name *'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Brother S-7200C"
                value={newMachine.name}
                onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'نوع المعدة' : 'Equipment Type'}
              </label>
              <select
                value={newMachine.machine_type}
                onChange={(e) => setNewMachine({ ...newMachine, machine_type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="sewing">{isAr ? 'ماكينة خياطة (سنجر/سراجة)' : 'Sewing Machine'}</option>
                <option value="cutting">{isAr ? 'مقص ومعدات صالة القص' : 'Cutting Equipment'}</option>
                <option value="overlock">{isAr ? 'ماكينة أوفرلوك' : 'Overlock Machine'}</option>
                <option value="ironing">{isAr ? 'مكبس ومعدات كي وبخار' : 'Fusing & Ironing'}</option>
                <option value="buttonhole">{isAr ? 'عراوي وأزرار' : 'Buttonhole / Button Attach'}</option>
                <option value="boiler">{isAr ? 'غلاية بخار مركزية' : 'Steam Boiler'}</option>
                <option value="compressor">{isAr ? 'كمبروسر هواء مضغوط' : 'Air Compressor'}</option>
                <option value="other">{isAr ? 'أخرى' : 'Other Equipment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'موقع الماكينة بالمصنع' : 'Floor Location'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'عنبر 1 - خط ب' : 'Floor 1 - Line B'}
                value={newMachine.location}
                onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'رقم الموديل' : 'Model Number'}
              </label>
              <input
                type="text"
                placeholder="e.g. S-7200C-403"
                value={newMachine.model_number}
                onChange={(e) => setNewMachine({ ...newMachine, model_number: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'دورية الصيانة الوقائية (أيام)' : 'Preventive Interval (Days)'}
              </label>
              <input
                type="number"
                min="1"
                value={newMachine.maintenance_interval_days}
                onChange={(e) => setNewMachine({ ...newMachine, maintenance_interval_days: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsAddMachineModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary">
              {isAr ? 'حفظ الماكينة' : 'Register Machine'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Report Breakdown / Work Order */}
      <Modal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        title={isAr ? 'إبلاغ عن عطل / إنشاء أمر صيانة' : 'Report Breakdown / Maintenance Order'}
      >
        <form onSubmit={handleCreateWorkOrder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'الماكينة المتعطلة *' : 'Target Machine Asset *'}
            </label>
            <select
              required
              value={newOrder.machine_id}
              onChange={(e) => setNewOrder({ ...newOrder, machine_id: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            >
              <option value="">{isAr ? '-- اختر الماكينة --' : '-- Select Machine --'}</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.machine_code} - {m.name} ({m.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'نوع العمل' : 'Work Type'}
              </label>
              <select
                value={newOrder.work_type}
                onChange={(e) => setNewOrder({ ...newOrder, work_type: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="breakdown">{isAr ? 'عطل وتوقف مفاجئ (Breakdown)' : 'Breakdown'}</option>
                <option value="preventive">{isAr ? 'صيانة دورية وقائية (Preventive)' : 'Preventive'}</option>
                <option value="emergency">{isAr ? 'طوارئ وسلامة مهنية (Emergency)' : 'Emergency'}</option>
                <option value="calibration">{isAr ? 'معايرة وضبط جودة (Calibration)' : 'Calibration'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'مستوى الأولوية' : 'Priority Level'}
              </label>
              <select
                value={newOrder.priority}
                onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              >
                <option value="critical">{isAr ? 'حرجة (توقف خط الإنتاج)' : 'Critical (Line Down)'}</option>
                <option value="high">{isAr ? 'عالية' : 'High'}</option>
                <option value="medium">{isAr ? 'متوسطة' : 'Medium'}</option>
                <option value="low">{isAr ? 'منخفضة' : 'Low'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'وصف العطل بالتفصيل *' : 'Issue Description *'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={isAr ? 'اذكر الأعراض، مكان العطل، وملاحظات المشغل...' : 'Describe fault symptoms, line impact...'}
              value={newOrder.issue_description}
              onChange={(e) => setNewOrder({ ...newOrder, issue_description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'مبلغ العطل / المشرف' : 'Reported By'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'مشرف الخط' : 'Line Supervisor'}
                value={newOrder.reported_by}
                onChange={(e) => setNewOrder({ ...newOrder, reported_by: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'اسم الفني المسند إليه' : 'Assigned Technician'}
              </label>
              <input
                type="text"
                placeholder={isAr ? 'فني الميكانيكا / الكهرباء' : 'Maintenance Tech'}
                value={newOrder.technician_name}
                onChange={(e) => setNewOrder({ ...newOrder, technician_name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsWorkOrderModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary">
              {isAr ? 'إصدار أمر الشغل' : 'Dispatch Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Complete Work Order */}
      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        title={isAr ? 'إتمام وإغلاق أمر الصيانة' : 'Complete Maintenance Work Order'}
      >
        <form onSubmit={handleCompleteWorkOrder} className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-foreground">
              {isAr ? 'رقم الإذن: ' : 'Order: '} {selectedOrder?.order_number}
            </div>
            <div className="text-muted-foreground">{selectedOrder?.issue_description}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'تقرير الإصلاح والإجراءات المتخذة *' : 'Resolution Notes *'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={isAr ? 'تم استبدال القطع، تنظيف الحوض، وضبط المعايرة...' : 'Parts replaced, tested under load...'}
              value={completeData.resolution_notes}
              onChange={(e) => setCompleteData({ ...completeData, resolution_notes: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'ساعات توقف الماكينة الفعلية' : 'Actual Downtime (Hours)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={completeData.downtime_hours}
                onChange={(e) => setCompleteData({ ...completeData, downtime_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'تكلفة المصنعية / أجر الفني (ج.م)' : 'Labor Cost (EGP)'}
              </label>
              <input
                type="number"
                min="0"
                value={completeData.labor_cost}
                onChange={(e) => setCompleteData({ ...completeData, labor_cost: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCompleteModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary">
              {isAr ? 'تأكيد اكتمال الصيانة وتشغيل الماكينة' : 'Confirm Completion'}
            </Button>
          </div>
        </form>
      </Modal>
      {/* Modal: Add Spare Part */}
      <Modal
        isOpen={isSparePartModalOpen}
        onClose={() => setIsSparePartModalOpen(false)}
        title={isAr ? 'صرف وتسجيل قطعة غيار لأمر الصيانة' : 'Add Spare Part to Work Order'}
      >
        <form onSubmit={handleAddSparePart} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'أمر الصيانة المستهدف *' : 'Work Order *'}
            </label>
            <select
              required
              value={selectedWoForPart}
              onChange={(e) => setSelectedWoForPart(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            >
              <option value="">{isAr ? '-- اختر أمر الشغل --' : '-- Select Work Order --'}</option>
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  {wo.order_number} - {wo.issue_description?.slice(0, 40)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'اسم قطعة الغيار *' : 'Part Name *'}
            </label>
            <input
              type="text"
              required
              value={newPartName}
              onChange={(e) => setNewPartName(e.target.value)}
              placeholder="e.g. Needle plate, Timing belt"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'رقم القطعة (Part #)' : 'Part Number'}
              </label>
              <input
                type="text"
                value={newPartNumber}
                onChange={(e) => setNewPartNumber(e.target.value)}
                placeholder="e.g. JK-NP-900"
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isAr ? 'الكمية المستهلكة *' : 'Quantity *'}
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                required
                value={newPartQty}
                onChange={(e) => setNewPartQty(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              {isAr ? 'تكلفة الوحدة (ج.م) *' : 'Unit Cost (EGP) *'}
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={newPartUnitCost}
              onChange={(e) => setNewPartUnitCost(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsSparePartModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary">
              {isAr ? 'تسجيل وخصم القطعة' : 'Record Spare Part'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

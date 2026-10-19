import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  ShieldAlert,
  Cpu,
  Package,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { Language, Machine, MaintenanceWorkOrder, MaintenanceSparePart } from '../../types';

interface MaintenanceTabProps {
  lang: Language;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'machines' | 'workorders' | 'spareparts' | 'analytics'>('machines');
  const [isAddMachineModalOpen, setIsAddMachineModalOpen] = useState(false);
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<MaintenanceWorkOrder | null>(null);

  // Initial State for Machines
  const [machines, setMachines] = useState<Machine[]>([
    {
      id: 'mch-1',
      machine_code: 'SEW-JUKI-01',
      name: isAr ? 'ماكينة سنجر جوكي كمبيوتر - خط 1' : 'Juki DDL-9000C Direct Drive Lockstitch',
      model_number: 'DDL-9000C',
      serial_number: 'JK-2024-8841',
      machine_type: 'sewing',
      location: isAr ? 'عنبر الخياطة - خط الإنتاج أ' : 'Sewing Floor - Line A',
      status: 'operational',
      maintenance_interval_days: 30,
      last_maintenance_date: '2026-09-20',
      next_maintenance_date: '2026-10-20',
      work_orders_count: 3,
    },
    {
      id: 'mch-2',
      machine_code: 'CUT-EAST-02',
      name: isAr ? 'مقص قماش كهربائي رأسي إيستمان 10 بوصة' : 'Eastman 10-Inch Straight Knife Cutting Machine',
      model_number: '629X Blue Streak',
      serial_number: 'EM-2023-1102',
      machine_type: 'cutting',
      location: isAr ? 'صالة القص - طاولة 2' : 'Cutting Room - Table 2',
      status: 'breakdown',
      maintenance_interval_days: 15,
      last_maintenance_date: '2026-10-01',
      next_maintenance_date: '2026-10-16',
      work_orders_count: 5,
    },
    {
      id: 'mch-3',
      machine_code: 'OVL-PEG-03',
      name: isAr ? 'ماكينة أوفرلوك بيجاسوس 5 فتلة' : 'Pegasus 5-Thread Heavy Duty Overlock Machine',
      model_number: 'M900-5',
      serial_number: 'PG-2025-4519',
      machine_type: 'overlock',
      location: isAr ? 'عنبر الخياطة - خط الإنتاج ب' : 'Sewing Floor - Line B',
      status: 'under_maintenance',
      maintenance_interval_days: 45,
      last_maintenance_date: '2026-09-10',
      next_maintenance_date: '2026-10-25',
      work_orders_count: 2,
    },
    {
      id: 'mch-4',
      machine_code: 'FUS-HASH-04',
      name: isAr ? 'ماكينة لصق الحشو المستمر هشيما' : 'Hashima Continuous Fusing Press 450mm',
      model_number: 'HP-450MS',
      serial_number: 'HS-2022-7731',
      machine_type: 'ironing',
      location: isAr ? 'قسم الحشو والتحضير' : 'Fusing & Prep Department',
      status: 'operational',
      maintenance_interval_days: 60,
      last_maintenance_date: '2026-08-30',
      next_maintenance_date: '2026-10-30',
      work_orders_count: 1,
    },
  ]);

  // Initial State for Work Orders
  const [workOrders, setWorkOrders] = useState<MaintenanceWorkOrder[]>([
    {
      id: 'wo-1',
      machine_id: 'mch-2',
      order_number: 'MNT-20261018-001',
      work_type: 'breakdown',
      priority: 'critical',
      status: 'in_progress',
      issue_description: isAr ? 'سخونة مفرطة في موتور المقص وتوقف حزام المسننات أثناء فرد طبقات الجينز' : 'Motor overheating and timing belt slippage during denim spread cut.',
      reported_by: isAr ? 'م. كريم - مشرف القص' : 'Eng. Kareem - Cutting Lead',
      technician_name: isAr ? 'فني / تامر عبد العزيز' : 'Tamer Abdelaziz (Senior Tech)',
      downtime_hours: 4.5,
      spare_parts_cost: 320,
      labor_cost: 150,
      total_cost: 470,
      created_at: '2026-10-18',
    },
    {
      id: 'wo-2',
      machine_id: 'mch-3',
      order_number: 'MNT-20261019-002',
      work_type: 'preventive',
      priority: 'medium',
      status: 'scheduled',
      issue_description: isAr ? 'صيانة دورية لتغيير كستبان الزيت وفحص ضبط الكروشيهات ومشدات الخيوط' : 'Preventive oil pump flush, looper alignment, and tension calibration.',
      reported_by: isAr ? 'نظام الصيانة التلقائي' : 'Automated Maintenance Scheduler',
      technician_name: isAr ? 'فني / سمير صبحي' : 'Sameer Sobhy',
      downtime_hours: 1.0,
      spare_parts_cost: 110,
      labor_cost: 80,
      total_cost: 190,
      created_at: '2026-10-19',
    },
    {
      id: 'wo-3',
      machine_id: 'mch-1',
      order_number: 'MNT-20260920-098',
      work_type: 'preventive',
      priority: 'low',
      status: 'completed',
      issue_description: isAr ? 'استبدال مشط التغذية وبلاطة الإبرة بعد تشغيل 20,000 قطعة قميص' : 'Feed dog and needle plate replacement after 20,000 shirt run.',
      resolution_notes: isAr ? 'تم استبدال المشط والبلاطة، ومعايرة حساس قص الخيط الإلكتروني بنجاح.' : 'Replaced feed dog, calibrated electronic thread trimmer.',
      reported_by: isAr ? 'مشرف خط 1' : 'Line 1 Supervisor',
      technician_name: isAr ? 'فني / تامر عبد العزيز' : 'Tamer Abdelaziz',
      downtime_hours: 0.75,
      spare_parts_cost: 85,
      labor_cost: 50,
      total_cost: 135,
      created_at: '2026-09-20',
      completion_time: '2026-09-20 14:30:00',
    },
  ]);

  // Spare parts ledger
  const [spareParts] = useState<MaintenanceSparePart[]>([
    {
      id: 'sp-1',
      part_name: isAr ? 'سير مسنن لمقص إيستمان 10 بوصة' : 'Eastman 10" Timing Belt',
      part_number: 'ET-TB-102',
      quantity: 12,
      unit_cost: 160,
      total_cost: 1920,
      work_order_id: 'wo-1',
    },
    {
      id: 'sp-2',
      part_name: isAr ? 'بلاطة إبرة ماكينة سنجر جوكي DDL-9000' : 'Juki DDL-9000 Needle Plate E-18',
      part_number: 'JK-NP-900',
      quantity: 25,
      unit_cost: 85,
      total_cost: 2125,
      work_order_id: 'wo-3',
    },
    {
      id: 'sp-3',
      part_name: isAr ? 'كروشيه علوي ماكينة أوفرلوك بيجاسوس' : 'Pegasus Upper Looper M900',
      part_number: 'PG-UL-550',
      quantity: 8,
      unit_cost: 110,
      total_cost: 880,
      work_order_id: 'wo-2',
    },
    {
      id: 'sp-4',
      part_name: isAr ? 'عنصر تسخين سيراميك لمكبس هشيما' : 'Hashima Ceramic Heating Element 450mm',
      part_number: 'HS-HE-450',
      quantity: 4,
      unit_cost: 450,
      total_cost: 1800,
      work_order_id: 'wo-1',
    },
  ]);

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
  const handleAddMachine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMachine.name || !newMachine.machine_code) return;

    const created: Machine = {
      id: `mch-${Date.now()}`,
      machine_code: newMachine.machine_code,
      name: newMachine.name,
      model_number: newMachine.model_number,
      machine_type: newMachine.machine_type as any,
      location: newMachine.location,
      status: 'operational',
      maintenance_interval_days: Number(newMachine.maintenance_interval_days) || 30,
      last_maintenance_date: new Date().toISOString().split('T')[0],
      next_maintenance_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      work_orders_count: 0,
    };

    setMachines([created, ...machines]);
    setIsAddMachineModalOpen(false);
    setNewMachine({
      machine_code: '',
      name: '',
      model_number: '',
      machine_type: 'sewing',
      location: '',
      maintenance_interval_days: 30,
    });
  };

  const handleCreateWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.machine_id || !newOrder.issue_description) return;

    const created: MaintenanceWorkOrder = {
      id: `wo-${Date.now()}`,
      machine_id: newOrder.machine_id,
      order_number: `MNT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      work_type: newOrder.work_type as any,
      priority: newOrder.priority as any,
      status: 'in_progress',
      issue_description: newOrder.issue_description,
      reported_by: newOrder.reported_by,
      technician_name: newOrder.technician_name,
      downtime_hours: 0,
      spare_parts_cost: 0,
      labor_cost: Number(newOrder.labor_cost) || 0,
      total_cost: Number(newOrder.labor_cost) || 0,
      created_at: new Date().toISOString().split('T')[0],
    };

    // Update machine status to breakdown if critical or breakdown
    if (newOrder.work_type === 'breakdown' || newOrder.priority === 'critical') {
      setMachines(machines.map((m) => (m.id === newOrder.machine_id ? { ...m, status: 'breakdown' } : m)));
    } else {
      setMachines(machines.map((m) => (m.id === newOrder.machine_id ? { ...m, status: 'under_maintenance' } : m)));
    }

    setWorkOrders([created, ...workOrders]);
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
  };

  const handleCompleteWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    const downtime = Number(completeData.downtime_hours) || 0;
    const labor = Number(completeData.labor_cost) || selectedOrder.labor_cost;
    const total = labor + selectedOrder.spare_parts_cost;

    setWorkOrders(
      workOrders.map((wo) =>
        wo.id === selectedOrder.id
          ? {
              ...wo,
              status: 'completed',
              resolution_notes: completeData.resolution_notes,
              downtime_hours: downtime,
              labor_cost: labor,
              total_cost: total,
              completion_time: new Date().toISOString(),
            }
          : wo
      )
    );

    // Restore machine status to operational
    setMachines(
      machines.map((m) =>
        m.id === selectedOrder.machine_id
          ? {
              ...m,
              status: 'operational',
              last_maintenance_date: new Date().toISOString().split('T')[0],
              next_maintenance_date: new Date(Date.now() + m.maintenance_interval_days * 86400000).toISOString().split('T')[0],
            }
          : m
      )
    );

    setIsCompleteModalOpen(false);
    setSelectedOrder(null);
    setCompleteData({ resolution_notes: '', downtime_hours: 1.5, labor_cost: 120 });
  };

  // Metrics
  const totalMachines = machines.length;
  const operationalCount = machines.filter((m) => m.status === 'operational').length;
  const breakdownCount = machines.filter((m) => m.status === 'breakdown').length;
  const underMaintenanceCount = machines.filter((m) => m.status === 'under_maintenance').length;
  const totalDowntimeHours = workOrders.reduce((sum, wo) => sum + wo.downtime_hours, 0);
  const totalMaintenanceExpense = workOrders.reduce((sum, wo) => sum + wo.total_cost, 0);

  return (
    <div className="space-y-6">
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

        <div className="flex gap-2 w-full sm:w-auto">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewOrder((prev) => ({ ...prev, machine_id: m.id }));
                          setIsWorkOrderModalOpen(true);
                        }}
                      >
                        {isAr ? 'طلب صيانة' : 'Service'}
                      </Button>
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
                        {wo.status !== 'completed' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(wo);
                              setIsCompleteModalOpen(true);
                            }}
                          >
                            {isAr ? 'إتمام وإغلاق' : 'Complete'}
                          </Button>
                        )}
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
                {spareParts.map((sp) => (
                  <tr key={sp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium text-foreground">{sp.part_name}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{sp.part_number}</td>
                    <td className="p-3 font-semibold text-foreground">{sp.quantity}</td>
                    <td className="p-3">
                      {sp.unit_cost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="p-3 font-semibold text-primary">
                      {(sp.total_cost || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="p-3 text-end">
                      <Badge variant={sp.quantity > 5 ? 'success' : 'warning'}>
                        {sp.quantity > 5
                          ? isAr
                            ? 'متوفر'
                            : 'In Stock'
                          : isAr
                          ? 'حد إعادة الطلب'
                          : 'Low Stock'}
                      </Badge>
                    </td>
                  </tr>
                ))}
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
    </div>
  );
};

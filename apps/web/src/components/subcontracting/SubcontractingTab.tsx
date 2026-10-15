import React, { useState } from 'react';
import {
  Scissors,
  Layers,
  Plus,
  Boxes,
  Truck,
  Receipt,
  Users,
  Search,
  Eye,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type {
  Customer,
  JobOrder,
  CustomerMaterialReceipt,
  ExternalOperation,
  JobDeliveryNote,
  JobInvoice,
} from '../../types';

interface SubcontractingTabProps {
  customers: Customer[];
  jobOrders: JobOrder[];
  customerMaterialReceipts: CustomerMaterialReceipt[];
  externalOperations: ExternalOperation[];
  jobDeliveryNotes: JobDeliveryNote[];
  jobInvoices: JobInvoice[];
  onOpenCreateJob: () => void;
  onOpenReceiveMaterial: () => void;
  onOpenExternalOp: () => void;
  onSelectOpForReceive: (op: ExternalOperation) => void;
  onSelectJobForDelivery: (job: JobOrder) => void;
  onSelectJobForInvoice: (job: JobOrder) => void;
  onSelectJobForDetails: (job: JobOrder) => void;
  onConfirmJob: (jobId: string) => void;
  onPayInvoice: (invoiceId: string) => void;
}

export const SubcontractingTab: React.FC<SubcontractingTabProps> = ({
  customers,
  jobOrders,
  customerMaterialReceipts,
  externalOperations,
  jobDeliveryNotes,
  jobInvoices,
  onOpenCreateJob,
  onOpenReceiveMaterial,
  onOpenExternalOp,
  onSelectOpForReceive,
  onSelectJobForDelivery,
  onSelectJobForInvoice,
  onSelectJobForDetails,
  onConfirmJob,
  onPayInvoice,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'receipts' | 'external_ops' | 'deliveries' | 'invoices' | 'customers'>('jobs');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'contract_cutting' | 'cmt'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // KPIs
  const activeJobsCount = jobOrders.filter((j) => j.status !== 'completed' && j.status !== 'cancelled').length;
  const totalCustodyMeters = customerMaterialReceipts.reduce((acc, curr) => acc + (Number(curr.received_meters) || 0), 0);
  const totalDeliveredPieces = jobDeliveryNotes.reduce((acc, curr) => acc + (Number(curr.total_delivered_pieces) || 0), 0);
  const totalInvoicedRevenue = jobInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  // Filtered jobs
  const filteredJobs = jobOrders.filter((j) => {
    if (serviceTypeFilter !== 'all' && j.service_type !== serviceTypeFilter) return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = j.order_number.toLowerCase().includes(term);
      const matchCust = j.customer_name.toLowerCase().includes(term);
      const matchModel = (j.model_name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchModel) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">
              خدمات القص للغير والتصنيع الكامل (Subcontracting & CMT)
            </h2>
            <Badge variant="info">المرحلة 6</Badge>
          </div>
          <p className="text-xs text-slate-400">
            إدارة عقود تشغيل الغير، الفصل الصارم لأمانات خامات العملاء، وتتبع عمليات التطريز والطباعة والتسليم والفوترة.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={onOpenCreateJob}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            أمر تشغيل جديد
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenReceiveMaterial}
            icon={<Boxes className="w-3.5 h-3.5 text-indigo-400" />}
          >
            استلام أمانة قماش
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={onOpenExternalOp}
            icon={<Scissors className="w-3.5 h-3.5 text-amber-400" />}
          >
            تشغيل خارجي (مطبعة/تطريز)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">أوامر التشغيل النشطة</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-100 font-mono">{activeJobsCount}</span>
            <span className="text-[11px] text-slate-500">أمر قيد التنفيذ</span>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">أمانات خامات العملاء</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-400 font-mono">
              {totalCustodyMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-[11px] text-slate-500">متر في العهدة</span>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">القطع المسلمة للعملاء</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalDeliveredPieces.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">قطعة تم تسليمها</span>
          </div>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">إيراد خدمات التشغيل</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {totalInvoicedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500">ج.م مفوترة</span>
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>أوامر التشغيل ({jobOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'receipts'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>أمانات الخامات ({customerMaterialReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('external_ops')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'external_ops'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>التشغيل الخارجي ({externalOperations.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deliveries')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'deliveries'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>أذون التسليم ({jobDeliveryNotes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'invoices'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>فواتير الخدمات ({jobInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeSubTab === 'customers'
              ? 'bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>العملاء ({customers.length})</span>
        </button>
      </div>

      {/* VIEW 1: Job Orders Table */}
      {activeSubTab === 'jobs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث برقم الأمر أو العميل أو الموديل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-850 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-64 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">كل الخدمات</option>
                <option value="contract_cutting">قص للغير فقط</option>
                <option value="cmt">تصنيع كامل CMT</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-850 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة (Draft)</option>
                <option value="confirmed">مؤكد (Confirmed)</option>
                <option value="in_progress">قيد التشغيل (In Progress)</option>
                <option value="partially_delivered">تسليم جزئي</option>
                <option value="completed">مكتمل ومسلّم</option>
              </select>
            </div>
          </div>

          <Card className="border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-850 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">رقم الأمر</th>
                    <th className="py-3 px-4 font-semibold">العميل</th>
                    <th className="py-3 px-4 font-semibold">نوع الخدمة</th>
                    <th className="py-3 px-4 font-semibold">الموديل</th>
                    <th className="py-3 px-4 font-semibold">المطلوب</th>
                    <th className="py-3 px-4 font-semibold">المسلم</th>
                    <th className="py-3 px-4 font-semibold">سعر الوحدة</th>
                    <th className="py-3 px-4 font-semibold">الحالة</th>
                    <th className="py-3 px-4 font-semibold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{job.order_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-200">{job.customer_name}</td>
                      <td className="py-3 px-4">
                        <Badge variant={job.service_type === 'contract_cutting' ? 'info' : 'purple'}>
                          {job.service_type === 'contract_cutting' ? 'قص للغير' : 'تصنيع CMT'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{job.model_name || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-100">{job.total_target_quantity}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{job.total_delivered_quantity}</td>
                      <td className="py-3 px-4 font-mono text-slate-200">{job.unit_rate} ج.م</td>
                      <td className="py-3 px-4">
                        <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'neutral'}>
                          {job.status === 'draft' ? 'مسودة' : job.status === 'confirmed' ? 'مؤكد' : job.status === 'in_progress' ? 'قيد التشغيل' : job.status === 'completed' ? 'مكتمل' : job.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {job.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onConfirmJob(job.id)}
                            >
                              تأكيد الأمر
                            </Button>
                          )}

                          {job.status !== 'draft' && job.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectJobForDelivery(job)}
                            >
                              إذن تسليم
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectJobForInvoice(job)}
                          >
                            فاتورة
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onSelectJobForDetails(job)}
                            icon={<Eye className="w-3.5 h-3.5 text-slate-400" />}
                          >
                            ملف الأمر
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredJobs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        لا توجد أوامر تشغيل مطابقة للفلاتر المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: Customer Material Receipts */}
      {activeSubTab === 'receipts' && (
        <Card className="border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-200">محاضر استلام أمانات خامات العملاء</h4>
              <p className="text-xs text-slate-400">سجل عهد الأقمشة الموردة من العملاء المفصولة عن مخزون المصنع المملوك</p>
            </div>
            <Button size="sm" onClick={onOpenReceiveMaterial} icon={<Plus className="w-3.5 h-3.5" />}>
              إذن استلام جديد
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-4">رقم الإذن</th>
                  <th className="py-2.5 px-4 font-sans">العميل المودع</th>
                  <th className="py-2.5 px-4 font-sans">القماش والنوع</th>
                  <th className="py-2.5 px-4">الأمتار المستلمة</th>
                  <th className="py-2.5 px-4">الوزن (كجم)</th>
                  <th className="py-2.5 px-4">الأثواب</th>
                  <th className="py-2.5 px-4 font-sans">المخزن</th>
                  <th className="py-2.5 px-4 font-sans">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {customerMaterialReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-bold text-sky-400">{r.receipt_number}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-200">{r.customer_name}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{r.fabric_name}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-100">{r.received_meters} م</td>
                    <td className="py-2.5 px-4 text-slate-400">{r.received_weight_kg || '—'} كجم</td>
                    <td className="py-2.5 px-4 text-slate-300">{r.rolls_count} رول</td>
                    <td className="py-2.5 px-4 font-sans text-slate-400">{r.warehouse_name || 'مخزن الأمانات'}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant={r.condition_status === 'accepted' ? 'success' : 'warning'}>
                        {r.condition_status === 'accepted' ? 'مقبول وسليم' : 'معيب'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 3: External Operations */}
      {activeSubTab === 'external_ops' && (
        <Card className="border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-200">عمليات التشغيل الخارجي لمقاولي الباطن</h4>
              <p className="text-xs text-slate-400">تتبع خروج القطع للمطابع والمغاسل وورش التطريز وفحص المرتجع والهالك</p>
            </div>
            <Button size="sm" onClick={onOpenExternalOp} icon={<Plus className="w-3.5 h-3.5" />}>
              إرسال تشغيل جديد
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-4">رقم الحركة</th>
                  <th className="py-2.5 px-4 font-sans">المقاول / الورشة</th>
                  <th className="py-2.5 px-4 font-sans">العملية</th>
                  <th className="py-2.5 px-4">المرسل</th>
                  <th className="py-2.5 px-4">السليم</th>
                  <th className="py-2.5 px-4">الهالك</th>
                  <th className="py-2.5 px-4">التكلفة</th>
                  <th className="py-2.5 px-4 font-sans">الحالة</th>
                  <th className="py-2.5 px-4 font-sans text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {externalOperations.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-bold text-amber-400">{op.operation_number}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-200">{op.subcontractor_name}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">
                      {op.operation_type === 'embroidery' ? 'تطريز آلي' : op.operation_type === 'printing' ? 'طباعة' : op.operation_type}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-100">{op.sent_quantity}</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold">{op.received_accepted_quantity}</td>
                    <td className="py-2.5 px-4 text-rose-400">{op.scrap_quantity}</td>
                    <td className="py-2.5 px-4 text-slate-300">{op.total_cost.toLocaleString()} ج.م</td>
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant={op.status === 'completed' ? 'success' : 'warning'}>
                        {op.status === 'completed' ? 'مكتمل' : 'مرسل بالخارج'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {op.status !== 'completed' && (
                        <Button size="sm" variant="outline" onClick={() => onSelectOpForReceive(op)}>
                          استلام وفحص
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 4: Delivery Notes */}
      {activeSubTab === 'deliveries' && (
        <Card className="border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h4 className="text-sm font-bold text-slate-200">أذون تسليم المشغولات ومصالحة خامات الأمانة</h4>
            <p className="text-xs text-slate-400">سجل تسليم المنتجات المقصوصة والمصنعة للعميل وإرجاع الأقمشة الفائضة وعوادم القص</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-4">رقم إذن التسليم</th>
                  <th className="py-2.5 px-4 font-sans">العميل</th>
                  <th className="py-2.5 px-4">تاريخ التسليم</th>
                  <th className="py-2.5 px-4">القطع المسلمة</th>
                  <th className="py-2.5 px-4">قماش مرتجع للعميل</th>
                  <th className="py-2.5 px-4">عوادم مسلّمة</th>
                  <th className="py-2.5 px-4 font-sans">المستلم</th>
                  <th className="py-2.5 px-4 font-sans">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {jobDeliveryNotes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-bold text-emerald-400">{d.delivery_number}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-200">{d.customer_name}</td>
                    <td className="py-2.5 px-4 text-slate-400">{d.delivery_date}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-100">{d.total_delivered_pieces} قطعة</td>
                    <td className="py-2.5 px-4 text-indigo-400">{d.returned_unused_fabric_meters} م</td>
                    <td className="py-2.5 px-4 text-slate-400">{d.scrap_fabric_meters} م</td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{d.received_by_customer || '—'}</td>
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant="success">تم التسليم</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 5: Invoices */}
      {activeSubTab === 'invoices' && (
        <Card className="border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h4 className="text-sm font-bold text-slate-200">فواتير أجور وخدمات التشغيل للغير</h4>
            <p className="text-xs text-slate-400">إيرادات خدمة القص والتصنيع مع الإضافات والخصومات المعتمدة (بدون خامات العميل)</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-4">رقم الفاتورة</th>
                  <th className="py-2.5 px-4 font-sans">العميل</th>
                  <th className="py-2.5 px-4">تاريخ الاستحقاق</th>
                  <th className="py-2.5 px-4">أجر الخدمة</th>
                  <th className="py-2.5 px-4">إضافات</th>
                  <th className="py-2.5 px-4">خصومات</th>
                  <th className="py-2.5 px-4">الإجمالي المستحق</th>
                  <th className="py-2.5 px-4 font-sans">حالة السداد</th>
                  <th className="py-2.5 px-4 font-sans text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {jobInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/20">
                    <td className="py-2.5 px-4 font-bold text-indigo-400">{inv.invoice_number}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-200">{inv.customer_name}</td>
                    <td className="py-2.5 px-4 text-slate-400">{inv.due_date || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-300">{inv.service_amount.toLocaleString()} ج.م</td>
                    <td className="py-2.5 px-4 text-emerald-400">+{inv.additional_charges}</td>
                    <td className="py-2.5 px-4 text-rose-400">-{inv.deductions}</td>
                    <td className="py-2.5 px-4 font-bold text-emerald-400">{inv.total_amount.toLocaleString()} ج.م</td>
                    <td className="py-2.5 px-4 font-sans">
                      <Badge variant={inv.status === 'paid' ? 'success' : 'neutral'}>
                        {inv.status === 'paid' ? 'مسددة بالكامل' : 'غير مسددة'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {inv.status !== 'paid' && (
                        <Button size="sm" variant="outline" onClick={() => onPayInvoice(inv.id)}>
                          تسجيل سداد
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 6: Customers Directory */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customers.map((c) => (
              <Card key={c.id} className="border-slate-800 space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-100 text-sm">{c.name}</span>
                  <span className="font-mono text-xs text-indigo-400">{c.code}</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>مسؤول الاتصال: <strong className="text-slate-300">{c.contact_person || '—'}</strong></span>
                  <span>الهاتف: <strong className="text-slate-300 font-mono">{c.phone || '—'}</strong></span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <span>السجل الضريبي: <strong className="text-slate-300 font-mono">{c.tax_id || '—'}</strong></span>
                  <Badge variant="success">نشط</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

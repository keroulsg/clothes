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
  UserCheck,
  Building,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
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
  employees?: any[];
  onOpenCreateJob: () => void;
  onOpenReceiveMaterial: () => void;
  onOpenExternalOp: () => void;
  onSelectOpForReceive: (op: ExternalOperation) => void;
  onSelectJobForDelivery: (job: JobOrder) => void;
  onSelectJobForInvoice: (job: JobOrder) => void;
  onSelectJobForDetails: (job: JobOrder) => void;
  onConfirmJob: (jobId: string) => void;
  onPayInvoice: (invoiceId: string) => void;
  isAr?: boolean;
}

export const SubcontractingTab: React.FC<SubcontractingTabProps> = ({
  customers,
  jobOrders,
  customerMaterialReceipts,
  externalOperations,
  jobDeliveryNotes,
  jobInvoices,
  employees = [],
  onOpenCreateJob,
  onOpenReceiveMaterial,
  onOpenExternalOp,
  onSelectOpForReceive,
  onSelectJobForDelivery,
  onSelectJobForInvoice,
  onSelectJobForDetails,
  onConfirmJob,
  onPayInvoice,
  isAr = true,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'jobs' | 'receipts' | 'external_ops' | 'deliveries' | 'invoices' | 'customers'>('jobs');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'contract_cutting' | 'cmt'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination states
  const [jobPage, setJobPage] = useState(1);
  const jobPerPage = 8;
  const [receiptPage, setReceiptPage] = useState(1);
  const receiptPerPage = 8;
  const [opPage, setOpPage] = useState(1);
  const opPerPage = 8;
  const [deliveryPage, setDeliveryPage] = useState(1);
  const deliveryPerPage = 8;
  const [invoicePage, setInvoicePage] = useState(1);
  const invoicePerPage = 8;
  const [customerPage, setCustomerPage] = useState(1);
  const customerPerPage = 8;

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
      const matchEmp = (j.assigned_employee_name || (j as any).assigned_employee?.name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchModel && !matchEmp) return false;
    }
    return true;
  });

  // Paginated Slices
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobPerPage));
  const paginatedJobs = filteredJobs.slice((jobPage - 1) * jobPerPage, jobPage * jobPerPage);

  const totalReceiptPages = Math.max(1, Math.ceil(customerMaterialReceipts.length / receiptPerPage));
  const paginatedReceipts = customerMaterialReceipts.slice((receiptPage - 1) * receiptPerPage, receiptPage * receiptPerPage);

  const totalOpPages = Math.max(1, Math.ceil(externalOperations.length / opPerPage));
  const paginatedOps = externalOperations.slice((opPage - 1) * opPerPage, opPage * opPerPage);

  const totalDeliveryPages = Math.max(1, Math.ceil(jobDeliveryNotes.length / deliveryPerPage));
  const paginatedDeliveries = jobDeliveryNotes.slice((deliveryPage - 1) * deliveryPerPage, deliveryPage * deliveryPerPage);

  const totalInvoicePages = Math.max(1, Math.ceil(jobInvoices.length / invoicePerPage));
  const paginatedInvoices = jobInvoices.slice((invoicePage - 1) * invoicePerPage, invoicePage * invoicePerPage);

  const totalCustomerPages = Math.max(1, Math.ceil(customers.length / customerPerPage));
  const paginatedCustomers = customers.slice((customerPage - 1) * customerPerPage, customerPage * customerPerPage);

  return (
    <div className="space-y-6">
      {/* Enterprise Page Header */}
      <PageHeader
        title={isAr ? 'خدمات القص للغير والتصنيع الكامل (Subcontracting & CMT)' : 'Subcontracting & CMT Operations'}
        subtitle={isAr ? 'إدارة عقود تشغيل الغير، ربط العمليات بالعمال لاحتساب الأجور، عزل أمانات خامات العملاء، وتتبع التطريز والطباعة والتسليم.' : 'Manage third-party cutting & CMT contracts, worker wage integration, customer fabric custody, external embellishments, deliveries, and invoicing.'}
        icon={<Boxes className="w-5 h-5" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'التشغيل والتصنيع للغير' : 'Subcontracting & CMT' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              onClick={onOpenCreateJob}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? 'أمر تشغيل جديد' : 'New Job Order'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenReceiveMaterial}
              icon={<Boxes className="w-3.5 h-3.5 text-primary" />}
            >
              {isAr ? 'استلام أمانة قماش' : 'Receive Custody Fabric'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenExternalOp}
              icon={<Scissors className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />}
            >
              {isAr ? 'تشغيل خارجي (مطبعة/تطريز)' : 'External Operation'}
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-50/40 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900 dark:to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'أوامر التشغيل النشطة' : 'Active Job Orders'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">{activeJobsCount}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'أمر قيد التنفيذ' : 'in progress'}
            </span>
          </div>
        </Card>

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-sky-50/40 via-white to-transparent dark:from-sky-950/20 dark:via-slate-900 dark:to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'أمانات خامات العملاء' : 'Customer Fabric Custody'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
              {totalCustodyMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'متر في العهدة' : 'meters in custody'}
            </span>
          </div>
        </Card>

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-emerald-50/40 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-900 dark:to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'القطع المسلمة للعملاء' : 'Delivered Pieces'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{totalDeliveredPieces.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'قطعة تم تسليمها' : 'pieces delivered'}
            </span>
          </div>
        </Card>

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {isAr ? 'إيراد خدمات التشغيل' : 'Subcontracting Revenue'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {totalInvoicedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'ج.م مفوترة' : 'EGP invoiced'}
            </span>
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-300 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? `أوامر التشغيل (${jobOrders.length})` : `Job Orders (${jobOrders.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'receipts'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{isAr ? `أمانات الخامات (${customerMaterialReceipts.length})` : `Material Custody (${customerMaterialReceipts.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('external_ops')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'external_ops'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{isAr ? `التشغيل الخارجي (${externalOperations.length})` : `External Operations (${externalOperations.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deliveries')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'deliveries'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? `أذون التسليم (${jobDeliveryNotes.length})` : `Delivery Notes (${jobDeliveryNotes.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'invoices'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAr ? `فواتير الخدمات (${jobInvoices.length})` : `Service Invoices (${jobInvoices.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
            activeSubTab === 'customers'
              ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? `العملاء (${customers.length})` : `Customers (${customers.length})`}</span>
        </button>
      </div>

      {/* VIEW 1: Job Orders Table */}
      {activeSubTab === 'jobs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 absolute ${isAr ? 'right-2.5' : 'left-2.5'} top-2.5 pointer-events-none`} />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث برقم الأمر، العميل، الموديل، الفني...' : 'Search order #, client, model, technician...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`bg-white dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-lg ${isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-64 focus:outline-none focus:border-indigo-500`}
                />
              </div>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="bg-white dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الخدمات' : 'All Services'}</option>
                <option value="contract_cutting">{isAr ? 'قص للغير فقط' : 'Cutting Only'}</option>
                <option value="cmt">{isAr ? 'تصنيع كامل CMT' : 'Full CMT'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-[#111726] border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="draft">{isAr ? 'مسودة (Draft)' : 'Draft'}</option>
                <option value="confirmed">{isAr ? 'مؤكد (Confirmed)' : 'Confirmed'}</option>
                <option value="in_progress">{isAr ? 'قيد التشغيل (In Progress)' : 'In Progress'}</option>
                <option value="partially_delivered">{isAr ? 'تسليم جزئي' : 'Partially Delivered'}</option>
                <option value="completed">{isAr ? 'مكتمل ومسلّم' : 'Completed'}</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                    <th className="py-3 px-4">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="py-3 px-4">{isAr ? 'نوع الخدمة' : 'Service Type'}</th>
                    <th className="py-3 px-4">{isAr ? 'الموديل' : 'Model'}</th>
                    <th className="py-3 px-4">{isAr ? 'الفني / المشرف' : 'Lead Technician'}</th>
                    <th className="py-3 px-4">{isAr ? 'المطلوب' : 'Target Qty'}</th>
                    <th className="py-3 px-4">{isAr ? 'المسلم' : 'Delivered Qty'}</th>
                    <th className="py-3 px-4">{isAr ? 'سعر الوحدة' : 'Unit Rate'}</th>
                    <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                  {paginatedJobs.map((job) => {
                    const empFromList = job.assigned_employee_id ? employees.find(e => e.id === job.assigned_employee_id) : null;
                    const empName = job.assigned_employee_name || (job as any).assigned_employee?.name || (job as any).assignedEmployee?.name || empFromList?.name;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">{job.order_number}</td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">{job.customer_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={job.service_type === 'contract_cutting' ? 'info' : 'purple'}>
                            {job.service_type === 'contract_cutting' ? (isAr ? 'قص للغير' : 'Cutting') : (isAr ? 'تصنيع CMT' : 'CMT')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{job.model_name || '—'}</td>
                        <td className="py-3 px-4">
                          {empName ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                              <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                                {empName.trim().charAt(0)}
                              </div>
                              <span className="font-medium truncate max-w-[120px]">{empName}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">{isAr ? 'غير معيّن' : 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">{job.total_target_quantity}</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{job.total_delivered_quantity}</td>
                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">{job.unit_rate} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-3 px-4">
                          <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'neutral'}>
                            {job.status === 'draft' ? (isAr ? 'مسودة' : 'Draft') : job.status === 'confirmed' ? (isAr ? 'مؤكد' : 'Confirmed') : job.status === 'in_progress' ? (isAr ? 'قيد التشغيل' : 'In Progress') : job.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : job.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {job.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-bold"
                                onClick={() => onConfirmJob(job.id)}
                              >
                                {isAr ? 'تأكيد الأمر' : 'Confirm'}
                              </Button>
                            )}

                            {job.status !== 'draft' && job.status !== 'completed' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-bold text-emerald-600 border-emerald-500/30"
                                onClick={() => onSelectJobForDelivery(job)}
                              >
                                {isAr ? 'إذن تسليم' : 'Delivery'}
                              </Button>
                            )}

                            {job.total_delivered_quantity > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-bold text-indigo-600 border-indigo-500/30"
                                onClick={() => onSelectJobForInvoice(job)}
                              >
                                {isAr ? 'فاتورة' : 'Invoice'}
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => onSelectJobForDetails(job)}
                              title={isAr ? 'عرض التفاصيل والربحية' : 'View Details & Profitability'}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedJobs.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        {isAr ? 'لا توجد أوامر تشغيل مطابقة للفلاتر المحددة.' : 'No job orders match the selected filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredJobs.length > jobPerPage && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                <Pagination
                  currentPage={jobPage}
                  totalPages={totalJobPages}
                  totalItems={filteredJobs.length}
                  perPage={jobPerPage}
                  onPageChange={setJobPage}
                  isAr={isAr}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* VIEW 2: Customer Material Receipts */}
      {activeSubTab === 'receipts' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'محاضر استلام أمانات خامات العملاء' : 'Customer Material Custody Receipts'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'سجل عهد الأقمشة الموردة من العملاء المفصولة عن مخزون المصنع المملوك' : 'Log of client-provided fabrics held in custody, segregated from factory-owned inventory'}
              </p>
            </div>
            <Button size="sm" onClick={onOpenReceiveMaterial} icon={<Plus className="w-3.5 h-3.5" />}>
              {isAr ? 'إذن استلام جديد' : 'New Intake'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الإذن' : 'Receipt #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل المودع' : 'Depositing Client'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'القماش والنوع' : 'Fabric & Type'}</th>
                  <th className="py-3 px-4">{isAr ? 'الأمتار المستلمة' : 'Received Meters'}</th>
                  <th className="py-3 px-4">{isAr ? 'الوزن (كجم)' : 'Weight (kg)'}</th>
                  <th className="py-3 px-4">{isAr ? 'الأثواب' : 'Rolls'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'المخزن' : 'Warehouse'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {paginatedReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-sky-600 dark:text-sky-400">{r.receipt_number}</td>
                    <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-200">{r.customer_name}</td>
                    <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">{r.fabric_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{r.received_meters} {isAr ? 'م' : 'm'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.received_weight_kg || '—'} {isAr ? 'كجم' : 'kg'}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.rolls_count} {isAr ? 'رول' : 'rolls'}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">{r.warehouse_name || (isAr ? 'مخزن الأمانات' : 'Custody Warehouse')}</td>
                    <td className="py-3 px-4 font-sans">
                      <Badge variant={r.condition_status === 'accepted' ? 'success' : 'warning'}>
                        {r.condition_status === 'accepted' ? (isAr ? 'مقبول وسليم' : 'Accepted') : (isAr ? 'معيب' : 'Defective')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {customerMaterialReceipts.length > receiptPerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={receiptPage}
                totalPages={totalReceiptPages}
                totalItems={customerMaterialReceipts.length}
                perPage={receiptPerPage}
                onPageChange={setReceiptPage}
                isAr={isAr}
              />
            </div>
          )}
        </Card>
      )}

      {/* VIEW 3: External Operations */}
      {activeSubTab === 'external_ops' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'عمليات التشغيل الخارجي لمقاولي الباطن' : 'Outsourced Operations (Subcontractors)'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'تتبع خروج القطع للمطابع والمغاسل وورش التطريز، وتعيين فني الفحص لاحتساب أجره بالقطعة' : 'Track batches dispatched to embroidery, print, or laundry vendors, and credit inspecting technician'}
              </p>
            </div>
            <Button size="sm" onClick={onOpenExternalOp} icon={<Plus className="w-3.5 h-3.5" />}>
              {isAr ? 'إرسال تشغيل جديد' : 'New Dispatch'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الحركة' : 'Operation #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'المقاول / الورشة' : 'Subcontractor'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العملية' : 'Operation'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الفني المستلم' : 'Technician'}</th>
                  <th className="py-3 px-4">{isAr ? 'المرسل' : 'Sent Qty'}</th>
                  <th className="py-3 px-4">{isAr ? 'السليم' : 'Accepted'}</th>
                  <th className="py-3 px-4">{isAr ? 'الهالك' : 'Scrap'}</th>
                  <th className="py-3 px-4">{isAr ? 'التكلفة' : 'Cost'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {paginatedOps.map((op) => {
                  const empName = (op as any).assigned_employee?.name || (op as any).assignedEmployee?.name || (op as any).assigned_employee_name;
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">{op.operation_number}</td>
                      <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-200">{op.subcontractor_name}</td>
                      <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">
                        {op.operation_type === 'embroidery' ? (isAr ? 'تطريز آلي' : 'Embroidery') : op.operation_type === 'printing' ? (isAr ? 'طباعة' : 'Printing') : op.operation_type}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        {empName ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-medium truncate max-w-[100px]">{empName}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">{isAr ? 'غير معيّن' : '—'}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{op.sent_quantity}</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">{op.received_accepted_quantity}</td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400">{op.scrap_quantity}</td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{op.total_cost.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 font-sans">
                        <Badge variant={op.status === 'completed' ? 'success' : 'warning'}>
                          {op.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'مرسل بالخارج' : 'Dispatched')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        {op.status !== 'completed' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs font-bold text-indigo-600 border-indigo-500/30" onClick={() => onSelectOpForReceive(op)}>
                            {isAr ? 'استلام وفحص' : 'Receive & QC'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {externalOperations.length > opPerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={opPage}
                totalPages={totalOpPages}
                totalItems={externalOperations.length}
                perPage={opPerPage}
                onPageChange={setOpPage}
                isAr={isAr}
              />
            </div>
          )}
        </Card>
      )}

      {/* VIEW 4: Delivery Notes */}
      {activeSubTab === 'deliveries' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? 'أذون تسليم المشغولات ومصالحة خامات الأمانة' : 'Job Delivery Notes & Fabric Reconciliation'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'سجل تسليم المنتجات المقصوصة والمصنعة للعميل وإرجاع الأقمشة الفائضة وعوادم القص' : 'Log of delivered cut/finished garments and reconciliation of leftover custody fabric and scrap'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم إذن التسليم' : 'Delivery #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4">{isAr ? 'تاريخ التسليم' : 'Delivery Date'}</th>
                  <th className="py-3 px-4">{isAr ? 'القطع المسلمة' : 'Delivered Pieces'}</th>
                  <th className="py-3 px-4">{isAr ? 'قماش مرتجع للعميل' : 'Returned Fabric'}</th>
                  <th className="py-3 px-4">{isAr ? 'عوادم مسلّمة' : 'Returned Scrap'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'المستلم' : 'Received By'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {paginatedDeliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{d.delivery_number}</td>
                    <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-200">{d.customer_name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{d.delivery_date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{d.total_delivered_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400">{d.returned_unused_fabric_meters} {isAr ? 'م' : 'm'}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{d.scrap_fabric_meters} {isAr ? 'م' : 'm'}</td>
                    <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">{d.received_by_customer || '—'}</td>
                    <td className="py-3 px-4 font-sans">
                      <Badge variant="success">{isAr ? 'تم التسليم' : 'Delivered'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {jobDeliveryNotes.length > deliveryPerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={deliveryPage}
                totalPages={totalDeliveryPages}
                totalItems={jobDeliveryNotes.length}
                perPage={deliveryPerPage}
                onPageChange={setDeliveryPage}
                isAr={isAr}
              />
            </div>
          )}
        </Card>
      )}

      {/* VIEW 5: Invoices */}
      {activeSubTab === 'invoices' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isAr ? 'فواتير أجور وخدمات التشغيل للغير' : 'Subcontracting Service Invoices'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'إيرادات خدمة القص والتصنيع مع الإضافات والخصومات المعتمدة (بدون خامات العميل)' : 'Service fees for cutting & CMT with approved surcharges and deductions (excluding client fabric)'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="py-3 px-4">{isAr ? 'أجر الخدمة' : 'Service Fee'}</th>
                  <th className="py-3 px-4">{isAr ? 'إضافات' : 'Charges'}</th>
                  <th className="py-3 px-4">{isAr ? 'خصومات' : 'Deductions'}</th>
                  <th className="py-3 px-4">{isAr ? 'الإجمالي المستحق' : 'Total Due'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'حالة السداد' : 'Payment Status'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {paginatedInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{inv.invoice_number}</td>
                    <td className="py-3 px-4 font-sans text-slate-900 dark:text-slate-200">{inv.customer_name}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{inv.due_date || '—'}</td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-300">{inv.service_amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400">+{inv.additional_charges}</td>
                    <td className="py-3 px-4 text-rose-600 dark:text-rose-400">-{inv.deductions}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{inv.total_amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="py-3 px-4 font-sans">
                      <Badge variant={inv.status === 'paid' ? 'success' : 'neutral'}>
                        {inv.status === 'paid' ? (isAr ? 'مسددة بالكامل' : 'Paid') : (isAr ? 'غير مسددة' : 'Unpaid')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      {inv.status !== 'paid' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs font-bold" onClick={() => onPayInvoice(inv.id)}>
                          {isAr ? 'تسجيل سداد' : 'Record Payment'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {jobInvoices.length > invoicePerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={invoicePage}
                totalPages={totalInvoicePages}
                totalItems={jobInvoices.length}
                perPage={invoicePerPage}
                onPageChange={setInvoicePage}
                isAr={isAr}
              />
            </div>
          )}
        </Card>
      )}

      {/* VIEW 6: Customers Directory */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedCustomers.map((c) => (
              <Card key={c.id} hover className="space-y-3 p-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">{c.name}</span>
                      <span className="font-mono text-xs text-slate-400">{c.code}</span>
                    </div>
                  </div>
                  <Badge variant="success">{isAr ? 'عميل نشط' : 'Active Client'}</Badge>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>{isAr ? 'مسؤول الاتصال:' : 'Contact:'} <strong className="text-slate-800 dark:text-slate-200">{c.contact_person || '—'}</strong></span>
                  <span>{isAr ? 'الهاتف:' : 'Phone:'} <strong className="text-slate-800 dark:text-slate-200 font-mono">{c.phone || '—'}</strong></span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <span>{isAr ? 'السجل الضريبي:' : 'Tax ID:'} <strong className="text-slate-800 dark:text-slate-200 font-mono">{c.tax_id || '—'}</strong></span>
                  <span className="text-[10px] text-slate-400 font-mono">{c.id.slice(0, 8)}</span>
                </div>
              </Card>
            ))}
          </div>
          {customers.length > customerPerPage && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={customerPage}
                totalPages={totalCustomerPages}
                totalItems={customers.length}
                perPage={customerPerPage}
                onPageChange={setCustomerPage}
                isAr={isAr}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

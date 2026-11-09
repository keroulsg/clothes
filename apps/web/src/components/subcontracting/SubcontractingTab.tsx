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
  Printer,
  CheckCircle2,
  DollarSign,
  Download,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
import { CustomerDossierModal } from './CustomerDossierModal';
import { SubcontractPrintModal, type SubcontractPrintType } from './SubcontractPrintModal';
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

  // Customer Dossier Modal State
  const [selectedCustomerIdForDossier, setSelectedCustomerIdForDossier] = useState<string | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);

  // Single-Document Print Modal State
  const [selectedPrintDoc, setSelectedPrintDoc] = useState<{ type: SubcontractPrintType; data: any } | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // Clean date helper
  const formatDate = (raw: string | undefined | null) => {
    if (!raw) return '—';
    return String(raw).split('T')[0].split(' ')[0];
  };

  const handleOpenDossier = (customerId: string) => {
    setSelectedCustomerIdForDossier(customerId);
    setIsDossierOpen(true);
  };

  const handlePrintDocument = (type: SubcontractPrintType, docData: any) => {
    setSelectedPrintDoc({ type, data: docData });
    setIsPrintModalOpen(true);
  };

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
      const matchCust = (j.customer_name || '').toLowerCase().includes(term);
      const matchModel = (j.model_name || '').toLowerCase().includes(term);
      const matchEmp = (j.assigned_employee_name || (j as any).assigned_employee?.name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchModel && !matchEmp) return false;
    }
    return true;
  });

  // Filtered receipts
  const filteredReceipts = customerMaterialReceipts.filter((r) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = (r.receipt_number || '').toLowerCase().includes(term);
      const matchCust = (r.customer_name || '').toLowerCase().includes(term);
      const matchFabric = (r.fabric_name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchFabric) return false;
    }
    return true;
  });

  // Filtered invoices
  const filteredInvoices = jobInvoices.filter((inv) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = (inv.invoice_number || '').toLowerCase().includes(term);
      const matchCust = (inv.customer_name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust) return false;
    }
    return true;
  });

  // Filtered customers
  const filteredCustomers = customers.filter((c) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (c.name || '').toLowerCase().includes(term);
      const matchCode = (c.code || '').toLowerCase().includes(term);
      const matchPhone = (c.phone || '').toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchPhone) return false;
    }
    return true;
  });

  // Paginated Slices
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobPerPage));
  const paginatedJobs = filteredJobs.slice((jobPage - 1) * jobPerPage, jobPage * jobPerPage);

  const totalReceiptPages = Math.max(1, Math.ceil(filteredReceipts.length / receiptPerPage));
  const paginatedReceipts = filteredReceipts.slice((receiptPage - 1) * receiptPerPage, receiptPage * receiptPerPage);

  const totalOpPages = Math.max(1, Math.ceil(externalOperations.length / opPerPage));
  const paginatedOps = externalOperations.slice((opPage - 1) * opPerPage, opPage * opPerPage);

  const totalDeliveryPages = Math.max(1, Math.ceil(jobDeliveryNotes.length / deliveryPerPage));
  const paginatedDeliveries = jobDeliveryNotes.slice((deliveryPage - 1) * deliveryPerPage, deliveryPage * deliveryPerPage);

  const totalInvoicePages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePerPage));
  const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * invoicePerPage, invoicePage * invoicePerPage);

  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomers.length / customerPerPage));
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * customerPerPage, customerPage * customerPerPage);

  return (
    <div className="space-y-6">
      {/* Enterprise Page Header */}
      <PageHeader
        title={isAr ? 'خدمات القص للغير والتصنيع الكامل (Subcontracting & CMT)' : 'Subcontracting & CMT Operations'}
        subtitle={isAr ? 'إدارة عقود تشغيل الغير، ربط العمليات بالعمال لاحتساب الأجور، عزل أمانات خامات العملاء، وتتبع التطريز والطباعة والتسليم.' : 'Manage third-party cutting & CMT contracts, worker wage integration, customer fabric custody, external embellishments, deliveries, and invoicing.'}
        icon={<Boxes className="w-5 h-5 text-indigo-600" />}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isAr ? 'أمر تشغيل وقص جديد' : 'New Job Order'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenReceiveMaterial}
              icon={<Boxes className="w-3.5 h-3.5 text-sky-600" />}
              className="text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-50 dark:hover:bg-sky-950/40"
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
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-50/40 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900 dark:to-transparent rounded-2xl shadow-2xs">
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

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-sky-50/40 via-white to-transparent dark:from-sky-950/20 dark:via-slate-900 dark:to-transparent rounded-2xl shadow-2xs">
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

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-emerald-50/40 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-900 dark:to-transparent rounded-2xl shadow-2xs">
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

        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-amber-50/40 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 dark:to-transparent rounded-2xl shadow-2xs">
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
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? `أوامر التشغيل (${jobOrders.length})` : `Job Orders (${jobOrders.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'receipts'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{isAr ? `أمانات الخامات (${customerMaterialReceipts.length})` : `Material Custody (${customerMaterialReceipts.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('external_ops')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'external_ops'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{isAr ? `التشغيل الخارجي (${externalOperations.length})` : `External Operations (${externalOperations.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('deliveries')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'deliveries'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? `أذون التسليم (${jobDeliveryNotes.length})` : `Delivery Notes (${jobDeliveryNotes.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAr ? `فواتير الخدمات (${jobInvoices.length})` : `Service Invoices (${jobInvoices.length})`}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'customers'
              ? 'bg-indigo-600 text-white font-bold shadow-xs'
              : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? `العملاء وبروفايلاتهم (${customers.length})` : `Customers & Dossiers (${customers.length})`}</span>
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
                  className={`bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl ${isAr ? 'pr-8 pl-3' : 'pl-8 pr-3'} py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-64 focus:outline-none focus:border-indigo-500`}
                />
              </div>

              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الخدمات' : 'All Services'}</option>
                <option value="contract_cutting">{isAr ? 'قص للغير فقط' : 'Cutting Only'}</option>
                <option value="cmt">{isAr ? 'تصنيع كامل CMT' : 'Full CMT'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                <option value="confirmed">{isAr ? 'مؤكد' : 'Confirmed'}</option>
                <option value="materials_received">{isAr ? 'تم استلام الأمانة' : 'Materials Received'}</option>
                <option value="in_progress">{isAr ? 'قيد التشغيل' : 'In Progress'}</option>
                <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
              </select>
            </div>

            <span className="text-[11px] text-slate-500 font-mono">
              {filteredJobs.length} {isAr ? 'أمر متاح' : 'orders found'}
            </span>
          </div>

          {/* Jobs Table */}
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="overflow-x-auto">
              <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                    <th className="py-3 px-4">{isAr ? 'العميل' : 'Customer'}</th>
                    <th className="py-3 px-4">{isAr ? 'نوع الخدمة' : 'Service Type'}</th>
                    <th className="py-3 px-4">{isAr ? 'الموديل' : 'Model'}</th>
                    <th className="py-3 px-4">{isAr ? 'الفني / المشرف' : 'Lead Tech'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المطلوب' : 'Target'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المقصوص' : 'Cut'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'المسلم' : 'Delivered'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'سعر الوحدة' : 'Rate'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-sans">
                  {paginatedJobs.map((job) => {
                    const empFromList = job.assigned_employee_id ? employees.find(e => e.id === job.assigned_employee_id) : null;
                    const empName = job.assigned_employee_name || (job as any).assigned_employee?.name || (job as any).assignedEmployee?.name || empFromList?.name;
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {job.order_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-200">
                          <button
                            type="button"
                            onClick={() => job.customer_id && handleOpenDossier(job.customer_id)}
                            className="font-bold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-right cursor-pointer flex items-center gap-1"
                            title={isAr ? 'فتح بروفايل العميل' : 'Open Customer Dossier'}
                          >
                            <span>{job.customer_name}</span>
                            <UserCheck className="w-3 h-3 text-indigo-400 opacity-60" />
                          </button>
                        </td>
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
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-900 dark:text-slate-100">{job.total_target_quantity}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">{job.total_cut_quantity || 0}</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">{job.total_delivered_quantity}</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-800 dark:text-slate-200">{Number(job.unit_rate).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant={job.status === 'completed' ? 'success' : job.status === 'in_progress' ? 'info' : 'neutral'}>
                            {job.status === 'draft' ? (isAr ? 'مسودة' : 'Draft') : job.status === 'confirmed' ? (isAr ? 'مؤكد' : 'Confirmed') : job.status === 'in_progress' ? (isAr ? 'قيد التشغيل' : 'In Progress') : job.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : job.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {job.status === 'draft' && (
                              <button
                                type="button"
                                onClick={() => onConfirmJob(job.id)}
                                title={isAr ? 'تأكيد أمر التشغيل' : 'Confirm Order'}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {job.status !== 'draft' && job.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={() => onSelectJobForDelivery(job)}
                                title={isAr ? 'تحرير إذن تسليم مشغولات' : 'Create Delivery Note'}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800 transition-colors"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {job.total_delivered_quantity > 0 && (
                              <button
                                type="button"
                                onClick={() => onSelectJobForInvoice(job)}
                                title={isAr ? 'إصدار فاتورة خدمات' : 'Create Service Invoice'}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-colors"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handlePrintDocument('job', job)}
                              title={isAr ? 'طباعة تذكرة أمر التشغيل والقص' : 'Print Job Ticket'}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectJobForDetails(job)}
                              title={isAr ? 'عرض التفاصيل وتحليل الربحية' : 'View Details & Profitability'}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedJobs.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-slate-400">
                        {isAr ? 'لا توجد أوامر تشغيل مطابقة للفلاتر المحددة.' : 'No job orders match the selected filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
              <Pagination
                currentPage={jobPage}
                totalPages={totalJobPages}
                totalItems={filteredJobs.length}
                perPage={jobPerPage}
                onPageChange={setJobPage}
                alwaysShow={true}
                isAr={isAr}
              />
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 2: Customer Material Receipts */}
      {activeSubTab === 'receipts' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-sky-600" />
                <span>{isAr ? 'محاضر استلام أمانات خامات العملاء' : 'Customer Material Custody Receipts'}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'أمانات أقمشة العملاء تسجل هنا وتسمع بالمستودع والخزينة العامة كعهدة تشغيل منفصلة تماماً' : 'Customer fabric custody segregated from factory-owned inventory'}
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
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'نوع القماش' : 'Fabric'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الأمتار' : 'Meters'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الوزن (كجم)' : 'Weight (kg)'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الأثواب' : 'Rolls'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'حالة القماش' : 'Condition'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الفني الفاحص' : 'Inspector'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {paginatedReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-sky-600 dark:text-sky-400">{r.receipt_number}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => r.customer_id && handleOpenDossier(r.customer_id)}
                        className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer"
                        title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                      >
                        {r.customer_name}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-700 dark:text-slate-300">{r.fabric_name}</td>
                    <td className="py-3 px-4 text-center font-black text-sky-600 dark:text-sky-400">{Number(r.received_meters).toFixed(1)} م</td>
                    <td className="py-3 px-4 text-center">{r.received_weight_kg ? `${r.received_weight_kg} كجم` : '—'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{r.rolls_count || 1}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <Badge variant={r.condition_status === 'accepted' ? 'success' : 'warning'}>
                        {r.condition_status === 'accepted' ? (isAr ? 'مقبول سليم' : 'Accepted') : r.condition_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">{r.inspector_name || '—'}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrintDocument('receipt', r)}
                          title={isAr ? 'طباعة محضر استلام أمانة الخامات' : 'Print Receipt'}
                          className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200 dark:border-sky-800 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {r.customer_id && (
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(r.customer_id!)}
                            title={isAr ? 'بروفايل العميل' : 'Customer Dossier'}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedReceipts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {isAr ? 'لا توجد محاضر استلام خامات مسجلة.' : 'No material receipts found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <Pagination
              currentPage={receiptPage}
              totalPages={totalReceiptPages}
              totalItems={filteredReceipts.length}
              perPage={receiptPerPage}
              onPageChange={setReceiptPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* VIEW 3: External Operations */}
      {activeSubTab === 'external_ops' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-amber-500" />
                <span>{isAr ? 'عمليات التشغيل الخارجي لمقاولي الباطن' : 'Outsourced Operations (Subcontractors)'}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
                  <th className="py-3 px-4 text-center">{isAr ? 'المرسل' : 'Sent Qty'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'السليم' : 'Accepted'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الهالك' : 'Scrap'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'التكلفة' : 'Cost'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
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
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">{op.sent_quantity}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400 font-bold">{op.received_accepted_quantity}</td>
                      <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">{op.scrap_quantity}</td>
                      <td className="py-3 px-4 text-center text-slate-800 dark:text-slate-300">{Number(op.total_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <Badge variant={op.status === 'completed' ? 'success' : 'warning'}>
                          {op.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'مرسل بالخارج' : 'Dispatched')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          {op.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => onSelectOpForReceive(op)}
                              title={isAr ? 'استلام وفحص الجودة' : 'Receive & QC'}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedOps.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      {isAr ? 'لا توجد حركات تشغيل خارجي مسجلة.' : 'No external operations found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <Pagination
              currentPage={opPage}
              totalPages={totalOpPages}
              totalItems={externalOperations.length}
              perPage={opPerPage}
              onPageChange={setOpPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* VIEW 4: Delivery Notes */}
      {activeSubTab === 'deliveries' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>{isAr ? 'أذون تسليم المشغولات ومصالحة خامات الأمانة' : 'Job Delivery Notes & Fabric Reconciliation'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'سجل تسليم المنتجات المقصوصة والمصنعة للعميل وإرجاع الأقمشة الفائضة وعوادم القص' : 'Log of delivered cut/finished garments and reconciliation of leftover custody fabric and scrap'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم إذن التسليم' : 'Delivery #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'تاريخ التسليم' : 'Delivery Date'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'القطع المسلمة' : 'Delivered Pieces'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'قماش مرتجع للعميل' : 'Returned Fabric'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'عوادم مسلّمة' : 'Returned Scrap'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'المستلم' : 'Received By'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {paginatedDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{del.delivery_number}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => del.customer_id && handleOpenDossier(del.customer_id)}
                        className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer"
                        title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                      >
                        {del.customer_name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{formatDate(del.delivery_date)}</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 dark:text-emerald-400">{del.total_delivered_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{Number(del.returned_fabric_meters || 0).toFixed(1)} م</td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300">{Number(del.returned_scrap_kg || 0).toFixed(1)} كجم</td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">{del.recipient_name || '—'}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <Badge variant="success">{isAr ? 'مسلم للعميل' : 'Delivered'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handlePrintDocument('delivery', del)}
                          title={isAr ? 'طباعة إذن التسليم ومصالحة الخامات' : 'Print Delivery Note'}
                          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedDeliveries.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      {isAr ? 'لا توجد أذون تسليم مسجلة.' : 'No delivery notes found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <Pagination
              currentPage={deliveryPage}
              totalPages={totalDeliveryPages}
              totalItems={jobDeliveryNotes.length}
              perPage={deliveryPerPage}
              onPageChange={setDeliveryPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* VIEW 5: Service Invoices */}
      {activeSubTab === 'invoices' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>{isAr ? 'فواتير ومطالبات خدمات التشغيل للغير والأقساط' : 'Subcontracting Invoices & Tranches'}</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isAr ? 'متابعة الفواتير المحررة، مبالغ السداد، الدفعات، والأرصدة المستحقة على العملاء' : 'Manage issued service invoices, payments, deposits, and outstanding customer balances'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الاستحقاق' : 'Due Date'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الخدمة' : 'Base'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'إضافي' : 'Extra'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'خصومات' : 'Deductions'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المسدد' : 'Paid'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {paginatedInvoices.map((inv) => {
                  const total = Number(inv.total_amount || 0);
                  const paid = Number(inv.paid_amount || 0);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{inv.invoice_number}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                        <button
                          type="button"
                          onClick={() => inv.customer_id && handleOpenDossier(inv.customer_id)}
                          className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer"
                          title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                        >
                          {inv.customer_name}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{formatDate(inv.due_date)}</td>
                      <td className="py-3 px-4 text-center text-slate-800 dark:text-slate-300">{Number(inv.service_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">+{inv.additional_charges}</td>
                      <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">-{inv.deductions}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">{total.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{paid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'partially_paid' ? 'warning' : 'neutral'}>
                          {inv.status === 'paid' ? (isAr ? 'مسددة بالكامل' : 'Paid') : inv.status === 'partially_paid' ? (isAr ? 'مسددة جزئياً' : 'Partial') : (isAr ? 'غير مسددة' : 'Unpaid')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center font-sans">
                        <div className="flex items-center justify-center gap-1">
                          {inv.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => onPayInvoice(inv.id)}
                              title={isAr ? 'تسجيل سداد دفعة' : 'Record Payment Tranche'}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePrintDocument('invoice', inv)}
                            title={isAr ? 'طباعة الفاتورة المستقلة' : 'Print Invoice'}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginatedInvoices.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      {isAr ? 'لا توجد فواتير خدمات مسجلة.' : 'No invoices found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <Pagination
              currentPage={invoicePage}
              totalPages={totalInvoicePages}
              totalItems={filteredInvoices.length}
              perPage={invoicePerPage}
              onPageChange={setInvoicePage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* VIEW 6: Customers Directory & Dossiers */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginatedCustomers.map((c) => (
              <Card key={c.id} hover className="space-y-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">{c.name}</span>
                      <span className="font-mono text-xs text-slate-400">{c.code || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      c.payment_terms === 'installments'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {c.payment_terms === 'installments' ? (isAr ? 'دفعات وأقساط' : 'Installments') : (isAr ? 'كاش فوري' : 'Cash')}
                    </span>
                    <Badge variant="success">{isAr ? 'عميل نشط' : 'Active Client'}</Badge>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1">
                  <span>{isAr ? 'مسؤول الاتصال:' : 'Contact:'} <strong className="text-slate-800 dark:text-slate-200">{c.contact_person || '—'}</strong></span>
                  <span>{isAr ? 'الهاتف:' : 'Phone:'} <strong className="text-slate-800 dark:text-slate-200 font-mono">{c.phone || '—'}</strong></span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-mono">{isAr ? 'السجل الضريبي:' : 'Tax ID:'} <strong className="text-slate-800 dark:text-slate-200">{c.tax_id || '—'}</strong></span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenDossier(c.id)}
                      title={isAr ? 'فتح البروفايل الشامل وكشف الحساب والقصات' : 'Open Complete Customer Dossier'}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'بروفايل العميل' : 'Dossier'}</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {paginatedCustomers.length === 0 && (
              <div className="col-span-2 py-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                {isAr ? 'لا يوجد عملاء مطابقين للبحث.' : 'No customers found.'}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
            <Pagination
              currentPage={customerPage}
              totalPages={totalCustomerPages}
              totalItems={filteredCustomers.length}
              perPage={customerPerPage}
              onPageChange={setCustomerPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </div>
      )}

      {/* Customer Complete Dossier Modal */}
      <CustomerDossierModal
        isOpen={isDossierOpen}
        onClose={() => {
          setIsDossierOpen(false);
          setSelectedCustomerIdForDossier(null);
        }}
        customerId={selectedCustomerIdForDossier}
        onPrintDocument={handlePrintDocument}
        isAr={isAr}
      />

      {/* Single Document Print Modal */}
      {selectedPrintDoc && (
        <SubcontractPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSelectedPrintDoc(null);
          }}
          documentType={selectedPrintDoc.type}
          data={selectedPrintDoc.data}
          isAr={isAr}
        />
      )}
    </div>
  );
};

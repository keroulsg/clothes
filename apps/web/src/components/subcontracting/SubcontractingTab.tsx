import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
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
  const customerPerPage = 6;

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
  const completedJobsCount = jobOrders.filter((j) => j.status === 'completed').length;
  const totalCustodyMeters = customerMaterialReceipts.reduce((acc, curr) => acc + (Number(curr.received_meters) || 0), 0);
  const totalDeliveredPieces = jobDeliveryNotes.reduce((acc, curr) => acc + (Number(curr.total_delivered_pieces) || 0), 0);
  const totalTargetPieces = jobOrders.reduce((acc, curr) => acc + (Number(curr.total_target_quantity) || 0), 0);
  const totalInvoicedRevenue = jobInvoices.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  const totalPaidRevenue = jobInvoices.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
  const totalOutstandingBalance = Math.max(0, totalInvoicedRevenue - totalPaidRevenue);

  // Precompute per-customer stats for the Customers View
  const customerStatsMap = useMemo(() => {
    const map = new Map<string, {
      totalJobs: number;
      totalDelivered: number;
      totalInvoiced: number;
      totalPaid: number;
      remainingBalance: number;
      custodyMeters: number;
    }>();

    customers.forEach((c) => {
      const cJobs = jobOrders.filter((j) => j.customer_id === c.id || j.customer_name === c.name);
      const cInvoices = jobInvoices.filter((inv) => inv.customer_id === c.id || inv.customer_name === c.name);
      const cReceipts = customerMaterialReceipts.filter((r) => r.customer_id === c.id || r.customer_name === c.name);

      const totalInvoiced = cInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0);
      const totalPaid = cInvoices.reduce((sum, i) => sum + (Number(i.paid_amount) || 0), 0);

      map.set(c.id, {
        totalJobs: cJobs.length,
        totalDelivered: cJobs.reduce((sum, j) => sum + (Number(j.total_delivered_quantity) || 0), 0),
        totalInvoiced,
        totalPaid,
        remainingBalance: Math.max(0, totalInvoiced - totalPaid),
        custodyMeters: cReceipts.reduce((sum, r) => sum + (Number(r.received_meters) || 0), 0),
      });
    });

    return map;
  }, [customers, jobOrders, jobInvoices, customerMaterialReceipts]);

  // Filtered jobs
  const filteredJobs = jobOrders.filter((j) => {
    if (serviceTypeFilter !== 'all' && j.service_type !== serviceTypeFilter) return false;
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = (j.order_number || '').toLowerCase().includes(term);
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

  // Filtered operations
  const filteredOps = externalOperations.filter((op) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = (op.operation_number || '').toLowerCase().includes(term);
      const matchSub = (op.subcontractor_name || '').toLowerCase().includes(term);
      const matchType = (op.operation_type || '').toLowerCase().includes(term);
      if (!matchNum && !matchSub && !matchType) return false;
    }
    return true;
  });

  // Filtered deliveries
  const filteredDeliveries = jobDeliveryNotes.filter((del) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchNum = (del.delivery_number || '').toLowerCase().includes(term);
      const matchCust = (del.customer_name || '').toLowerCase().includes(term);
      const matchRec = (del.recipient_name || '').toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchRec) return false;
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
      const matchPerson = (c.contact_person || '').toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchPhone && !matchPerson) return false;
    }
    return true;
  });

  // Paginated Slices
  const totalJobPages = Math.max(1, Math.ceil(filteredJobs.length / jobPerPage));
  const paginatedJobs = filteredJobs.slice((jobPage - 1) * jobPerPage, jobPage * jobPerPage);

  const totalReceiptPages = Math.max(1, Math.ceil(filteredReceipts.length / receiptPerPage));
  const paginatedReceipts = filteredReceipts.slice((receiptPage - 1) * receiptPerPage, receiptPage * receiptPerPage);

  const totalOpPages = Math.max(1, Math.ceil(filteredOps.length / opPerPage));
  const paginatedOps = filteredOps.slice((opPage - 1) * opPerPage, opPage * opPerPage);

  const totalDeliveryPages = Math.max(1, Math.ceil(filteredDeliveries.length / deliveryPerPage));
  const paginatedDeliveries = filteredDeliveries.slice((deliveryPage - 1) * deliveryPerPage, deliveryPage * deliveryPerPage);

  const totalInvoicePages = Math.max(1, Math.ceil(filteredInvoices.length / invoicePerPage));
  const paginatedInvoices = filteredInvoices.slice((invoicePage - 1) * invoicePerPage, invoicePage * invoicePerPage);

  const totalCustomerPages = Math.max(1, Math.ceil(filteredCustomers.length / customerPerPage));
  const paginatedCustomers = filteredCustomers.slice((customerPage - 1) * customerPerPage, customerPage * customerPerPage);

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* 1. Ultra-Modern Hero Header & Control Center */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        {/* Glow Effects */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isAr ? 'منظومة التشغيل والقص للغير (CMT 2.0)' : 'Subcontracting & CMT Hub'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                {isAr ? 'أمانات أقمشة العملاء معزولة ومحمية' : 'Segregated Fabric Custody'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <Scissors className="w-7 h-7 text-indigo-400 shrink-0" />
              <span>{isAr ? 'خدمات القص للغير والتصنيع الكامل' : 'Subcontracting & CMT Operations'}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isAr
                ? 'إدارة عقود تشغيل الغير، ربط عمليات القص والأورليه والخياطة بأجور العمال بالقطعة، متابعة أمانات الخامات بالمستودع، تتبع المطابع والمغاسل، ونظام فواتير مرن كاش أو على دفعات وأقساط.'
                : 'Enterprise hub for CMT & contract cutting, worker piece-rate crediting, isolated fabric custody, outsourced embellishments, and installment billing.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={onOpenCreateJob}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'أمر قص وتشغيل جديد' : 'New Cut Order'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenReceiveMaterial}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Boxes className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'استلام أمانة قماش' : 'Intake Fabric'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenExternalOp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md transition-all cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'تشغيل خارجي (مطبعة/تطريز)' : 'Outsourced Op'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Bento-Grid Elevated KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Jobs */}
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-indigo-50/50 via-white to-transparent dark:from-indigo-950/20 dark:via-slate-900 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? 'أوامر التشغيل' : 'Job Orders'}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
            {jobOrders.length}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{activeJobsCount} {isAr ? 'قيد التنفيذ' : 'in progress'}</span>
            <span>{completedJobsCount} {isAr ? 'مكتمل' : 'done'}</span>
          </div>
        </Card>

        {/* Card 2: Custody Fabric Meters */}
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-sky-50/50 via-white to-transparent dark:from-sky-950/20 dark:via-slate-900 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? 'أمانات أقمشة العملاء' : 'Custody Fabric'}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
            {totalCustodyMeters.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-normal">متر</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{customerMaterialReceipts.length} {isAr ? 'إذن استلام معتمد' : 'receipt notes'}</span>
          </div>
        </Card>

        {/* Card 3: Delivered Pieces */}
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-blue-50/50 via-white to-transparent dark:from-blue-950/20 dark:via-slate-900 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? 'القطع المسلمة' : 'Delivered Pieces'}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {totalDeliveredPieces.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {totalTargetPieces > 0 ? (
              <span>{Math.round((totalDeliveredPieces / totalTargetPieces) * 100)}% {isAr ? 'من إجمالي المطلوب' : 'fulfilled'}</span>
            ) : (
              <span>{isAr ? 'جاهزة للشحن' : 'ready'}</span>
            )}
          </div>
        </Card>

        {/* Card 4: Invoiced Revenue */}
        <Card hover className="p-4 border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-amber-50/50 via-white to-transparent dark:from-amber-950/20 dark:via-slate-900 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? 'إجمالي المفوتر' : 'Invoiced Revenue'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-slate-900 dark:text-slate-100">
            {totalInvoicedRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
            {totalPaidRevenue.toLocaleString()} {isAr ? 'ج.م مسدد فعلياً' : 'EGP paid'}
          </div>
        </Card>

        {/* Card 5: Outstanding Balance */}
        <Card hover className={`p-4 border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs ${
          totalOutstandingBalance > 0
            ? 'bg-gradient-to-br from-rose-50/60 via-white to-transparent dark:from-rose-950/30 dark:via-slate-900'
            : 'bg-gradient-to-br from-emerald-50/50 via-white to-transparent dark:from-emerald-950/20 dark:via-slate-900'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>{isAr ? 'الرصيد المتبقي المستحق' : 'Outstanding Due'}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
              totalOutstandingBalance > 0 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2 text-xl font-black font-mono ${totalOutstandingBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="mt-1 text-[11px] font-semibold">
            {totalOutstandingBalance > 0 ? (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {isAr ? 'مستحق تحت التحصيل' : 'due from clients'}
              </span>
            ) : (
              <span className="text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAr ? 'حسابات العملاء مسواة' : 'all settled'}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* 3. Luxury Segmented Pill Tab Bar */}
      <div className="p-1.5 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1 overflow-x-auto shadow-inner text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubTab('jobs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'jobs'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'أوامر التشغيل والقص' : 'Job Orders'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'jobs' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {jobOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('receipts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'receipts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>{isAr ? 'أمانات الخامات' : 'Material Custody'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {customerMaterialReceipts.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('external_ops')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'external_ops'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{isAr ? 'التشغيل الخارجي (الباطن)' : 'External Ops'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'external_ops' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {externalOperations.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('deliveries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'deliveries'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? 'أذون التسليم والمصالحات' : 'Delivery Notes'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'deliveries' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {jobDeliveryNotes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAr ? 'الفواتير والأقساط' : 'Invoices & Tranches'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {jobInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'customers'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'العملاء وبروفايلاتهم' : 'Clients & Dossiers'}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeSubTab === 'customers' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
            {customers.length}
          </span>
        </button>
      </div>

      {/* 4. Enhanced Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[260px]">
            <Search className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'right-3' : 'left-3'} top-2.5 pointer-events-none`} />
            <input
              type="text"
              placeholder={isAr ? 'بحث برقم الأمر، العميل، الموديل، الفني، الخامة...' : 'Search order #, client, model, fabric...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl ${isAr ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all`}
            />
          </div>

          {activeSubTab === 'jobs' && (
            <>
              <select
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value as any)}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الخدمات (قص وتصنيع)' : 'All Services'}</option>
                <option value="contract_cutting">{isAr ? '✂️ قص للغير فقط' : 'Cutting Only'}</option>
                <option value="cmt">{isAr ? '🏭 تصنيع كامل CMT' : 'Full CMT'}</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
                <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                <option value="confirmed">{isAr ? 'مؤكد' : 'Confirmed'}</option>
                <option value="materials_received">{isAr ? 'تم استلام الأمانة' : 'Materials Received'}</option>
                <option value="in_progress">{isAr ? 'قيد التشغيل' : 'In Progress'}</option>
                <option value="completed">{isAr ? 'مكتمل' : 'Completed'}</option>
              </select>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end text-slate-500 text-xs font-mono">
          <span>
            {activeSubTab === 'jobs' && `${filteredJobs.length} ${isAr ? 'أمر متاح' : 'orders'}`}
            {activeSubTab === 'receipts' && `${filteredReceipts.length} ${isAr ? 'إذن أمانة' : 'receipts'}`}
            {activeSubTab === 'external_ops' && `${filteredOps.length} ${isAr ? 'حركة خارجية' : 'operations'}`}
            {activeSubTab === 'deliveries' && `${filteredDeliveries.length} ${isAr ? 'إذن تسليم' : 'deliveries'}`}
            {activeSubTab === 'invoices' && `${filteredInvoices.length} ${isAr ? 'فاتورة' : 'invoices'}`}
            {activeSubTab === 'customers' && `${filteredCustomers.length} ${isAr ? 'عميل' : 'clients'}`}
          </span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="text-xs text-indigo-600 hover:underline font-bold"
            >
              {isAr ? 'مسح الفلتر' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* 5. VIEW 1: Job Orders Table */}
      {activeSubTab === 'jobs' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-bold text-[11.5px]">
                <tr>
                  <th className="py-3.5 px-4">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'نوع الخدمة' : 'Service Type'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'الموديل' : 'Model'}</th>
                  <th className="py-3.5 px-4">{isAr ? 'الفني المسؤول' : 'Lead Technician'}</th>
                  <th className="py-3.5 px-4 text-center">{isAr ? 'نسبة الإنجاز والتسليم' : 'Progress'}</th>
                  <th className="py-3.5 px-4 text-center">{isAr ? 'سعر الوحدة' : 'Unit Rate'}</th>
                  <th className="py-3.5 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3.5 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-sans">
                {paginatedJobs.map((job) => {
                  const empFromList = job.assigned_employee_id ? employees.find(e => e.id === job.assigned_employee_id) : null;
                  const empName = job.assigned_employee_name || (job as any).assigned_employee?.name || (job as any).assignedEmployee?.name || empFromList?.name;
                  
                  const targetQty = Number(job.total_target_quantity || 0);
                  const cutQty = Number(job.total_cut_quantity || 0);
                  const deliveredQty = Number(job.total_delivered_quantity || 0);
                  const cutPercent = targetQty > 0 ? Math.min(100, Math.round((cutQty / targetQty) * 100)) : 0;
                  const delPercent = targetQty > 0 ? Math.min(100, Math.round((deliveredQty / targetQty) * 100)) : 0;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Order Number */}
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{job.order_number}</span>
                        </div>
                      </td>

                      {/* Customer Name Clickable to Dossier */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => job.customer_id && handleOpenDossier(job.customer_id)}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-right cursor-pointer flex items-center gap-1.5 group"
                          title={isAr ? 'فتح بروفايل العميل الشامل وكشف الحساب' : 'Open Customer Dossier'}
                        >
                          <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 shrink-0" />
                          <span className="group-hover:underline">{job.customer_name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>

                      {/* Service Type */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          job.service_type === 'contract_cutting'
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
                            : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        }`}>
                          {job.service_type === 'contract_cutting' ? '✂️ ' + (isAr ? 'قص للغير' : 'Cutting') : '🏭 ' + (isAr ? 'تصنيع CMT' : 'CMT')}
                        </span>
                      </td>

                      {/* Model Name */}
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {job.model_name || '—'}
                      </td>

                      {/* Lead Technician */}
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

                      {/* Progress Bar Cell */}
                      <td className="py-3 px-4 min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10.5px] font-mono">
                            <span className="text-slate-500">{isAr ? 'مطلوب:' : 'Target:'} <strong>{targetQty}</strong></span>
                            <span className="text-emerald-600 font-bold">{isAr ? 'مسلم:' : 'Del:'} {deliveredQty} ({delPercent}%)</span>
                          </div>
                          {/* Dual Progress Bar: Cut (indigo) & Delivered (emerald) */}
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${delPercent}%` }}
                              className="bg-emerald-500 h-full rounded-r-full"
                              title={`${isAr ? 'مسلم:' : 'Delivered:'} ${delPercent}%`}
                            />
                            <div
                              style={{ width: `${Math.max(0, cutPercent - delPercent)}%` }}
                              className="bg-indigo-500/70 h-full"
                              title={`${isAr ? 'مقصوص قيد التشغيل:' : 'Cut in progress:'} ${cutPercent}%`}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Unit Rate */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {Number(job.unit_rate).toFixed(2)} <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          job.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : job.status === 'in_progress'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300'
                            : job.status === 'confirmed'
                            ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {job.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                          {job.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : job.status === 'in_progress' ? (isAr ? 'قيد التشغيل' : 'In Progress') : job.status === 'confirmed' ? (isAr ? 'مؤكد' : 'Confirmed') : (isAr ? 'مسودة' : 'Draft')}
                        </span>
                      </td>

                      {/* Actions */}
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
                              title={isAr ? 'إصدار فاتورة خدمات وأقساط' : 'Create Service Invoice'}
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
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Scissors className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-xs">{isAr ? 'لا توجد أوامر تشغيل مطابقة للفلاتر.' : 'No job orders found.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/40 dark:bg-slate-900/40">
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
      )}

      {/* 6. VIEW 2: Customer Material Receipts */}
      {activeSubTab === 'receipts' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-sky-600" />
                <span>{isAr ? 'محاضر استلام أمانات خامات العملاء' : 'Customer Material Custody Receipts'}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAr ? 'أمانات أقمشة العملاء تسجل كعهدة منفصلة وتسمع تلقائياً في المخزن العام تحت حسابات أمانات CMT' : 'Segregated customer fabrics tracked in inventory under client-owned custody accounts'}
              </p>
            </div>
            <Button size="sm" onClick={onOpenReceiveMaterial} icon={<Plus className="w-3.5 h-3.5" />}>
              {isAr ? 'إذن استلام أمانة جديد' : 'New Custody Intake'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-mono font-semibold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الإذن' : 'Receipt #'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'نوع القماش والخامة' : 'Fabric Name'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الأمتار المستلمة' : 'Meters'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الوزن (كجم)' : 'Weight (kg)'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الأثواب' : 'Rolls'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'حالة القماش' : 'Condition'}</th>
                  <th className="py-3 px-4 font-sans">{isAr ? 'الفاحص المستلم' : 'Inspector'}</th>
                  <th className="py-3 px-4 font-sans text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {paginatedReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-sky-600 dark:text-sky-400">{r.receipt_number}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => r.customer_id && handleOpenDossier(r.customer_id)}
                        className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer flex items-center gap-1 group"
                        title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                      >
                        <span className="group-hover:underline">{r.customer_name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="py-3 px-4 font-sans text-slate-800 dark:text-slate-200 font-medium">
                      {r.fabric_name}
                      {r.fabric_code && <span className="block text-[10px] text-slate-400 font-mono">{r.fabric_code}</span>}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-sky-600 dark:text-sky-400 text-sm">
                      {Number(r.received_meters).toFixed(1)} م
                    </td>
                    <td className="py-3 px-4 text-center">{r.received_weight_kg ? `${r.received_weight_kg} كجم` : '—'}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">{r.rolls_count || 1}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        {r.condition_status === 'accepted' ? (isAr ? 'مقبول سليم' : 'Accepted') : r.condition_status}
                      </span>
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
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Boxes className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-xs">{isAr ? 'لا توجد محاضر استلام خامات مسجلة.' : 'No receipts found.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/40 dark:bg-slate-900/40">
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

      {/* 7. VIEW 3: External Operations */}
      {activeSubTab === 'external_ops' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between flex-wrap gap-3">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {paginatedOps.map((op) => {
                  const empName = (op as any).assigned_employee?.name || (op as any).assignedEmployee?.name || (op as any).assigned_employee_name;
                  return (
                    <tr key={op.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-amber-600 dark:text-amber-400">{op.operation_number}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">{op.subcontractor_name}</td>
                      <td className="py-3 px-4 font-sans">
                        <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {op.operation_type === 'embroidery' ? (isAr ? '🪡 تطريز آلي' : 'Embroidery') : op.operation_type === 'printing' ? (isAr ? '🎨 طباعة' : 'Printing') : (isAr ? '💧 غسيل وتجهيز' : op.operation_type)}
                        </span>
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
                      <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400 font-bold">{op.scrap_quantity}</td>
                      <td className="py-3 px-4 text-center text-slate-800 dark:text-slate-300 font-bold">{Number(op.total_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${op.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {op.status === 'completed' ? (isAr ? 'مكتمل' : 'Completed') : (isAr ? 'مرسل بالخارج' : 'Dispatched')}
                        </span>
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
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Scissors className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-xs">{isAr ? 'لا توجد حركات تشغيل خارجي مسجلة.' : 'No operations found.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/40 dark:bg-slate-900/40">
            <Pagination
              currentPage={opPage}
              totalPages={totalOpPages}
              totalItems={filteredOps.length}
              perPage={opPerPage}
              onPageChange={setOpPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* 8. VIEW 4: Delivery Notes */}
      {activeSubTab === 'deliveries' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {paginatedDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{del.delivery_number}</td>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-slate-200">
                      <button
                        type="button"
                        onClick={() => del.customer_id && handleOpenDossier(del.customer_id)}
                        className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer flex items-center gap-1 group"
                        title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                      >
                        <span className="group-hover:underline">{del.customer_name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{formatDate(del.delivery_date)}</td>
                    <td className="py-3 px-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">{del.total_delivered_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-bold">{Number(del.returned_fabric_meters || 0).toFixed(1)} م</td>
                    <td className="py-3 px-4 text-center text-slate-700 dark:text-slate-300 font-bold">{Number(del.returned_scrap_kg || 0).toFixed(1)} كجم</td>
                    <td className="py-3 px-4 font-sans text-slate-600 dark:text-slate-400">{del.recipient_name || '—'}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {isAr ? 'مسلم للعميل' : 'Delivered'}
                      </span>
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
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-xs">{isAr ? 'لا توجد أذون تسليم مسجلة.' : 'No delivery notes found.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/40 dark:bg-slate-900/40">
            <Pagination
              currentPage={deliveryPage}
              totalPages={totalDeliveryPages}
              totalItems={filteredDeliveries.length}
              perPage={deliveryPerPage}
              onPageChange={setDeliveryPage}
              alwaysShow={true}
              isAr={isAr}
            />
          </div>
        </Card>
      )}

      {/* 9. VIEW 5: Service Invoices & Installments */}
      {activeSubTab === 'invoices' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm bg-white dark:bg-slate-900">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
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
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
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
                          className="font-bold hover:text-indigo-600 transition-colors text-right cursor-pointer flex items-center gap-1 group"
                          title={isAr ? 'فتح بروفايل العميل' : 'Open Dossier'}
                        >
                          <span className="group-hover:underline">{inv.customer_name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400">{formatDate(inv.due_date)}</td>
                      <td className="py-3 px-4 text-center text-slate-800 dark:text-slate-300">{Number(inv.service_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">+{inv.additional_charges}</td>
                      <td className="py-3 px-4 text-center text-rose-600 dark:text-rose-400">-{inv.deductions}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-slate-100">{total.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">{paid.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : inv.status === 'partially_paid'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {inv.status === 'paid' ? (isAr ? 'مسددة بالكامل' : 'Paid') : inv.status === 'partially_paid' ? (isAr ? 'مسددة جزئياً' : 'Partial') : (isAr ? 'غير مسددة' : 'Unpaid')}
                        </span>
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
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="font-bold text-xs">{isAr ? 'لا توجد فواتير خدمات مسجلة.' : 'No invoices found.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-slate-50/40 dark:bg-slate-900/40">
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

      {/* 10. VIEW 6: Customers Directory & Dossiers (Bento Cards) */}
      {activeSubTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.map((c) => {
              const stats = customerStatsMap.get(c.id) || {
                totalJobs: 0,
                totalDelivered: 0,
                totalInvoiced: 0,
                totalPaid: 0,
                remainingBalance: 0,
                custodyMeters: 0,
              };

              return (
                <div
                  key={c.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden group"
                >
                  {/* Subtle top accent line */}
                  <div className={`absolute top-0 inset-x-0 h-1.5 ${stats.remainingBalance > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />

                  {/* Header: Avatar, Name, Code, Payment System */}
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-lg border border-indigo-100 dark:border-indigo-900 shrink-0">
                        {c.name.trim().charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block truncate group-hover:text-indigo-600 transition-colors">
                          {c.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] text-slate-400 font-bold">{c.code || '—'}</span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                            c.payment_terms === 'installments'
                              ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}>
                            {c.payment_terms === 'installments' ? (isAr ? '📑 دفعات وأقساط' : 'Installments') : (isAr ? '💵 كاش فوري' : 'Cash')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Chips */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    {c.contact_person && (
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.contact_person}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-slate-400 text-[11px]">📞</span>
                        <span>{c.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 Micro-Stats Box */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'أوامر القص والتشغيل' : 'Cut Jobs'}</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-mono text-sm block mt-0.5">
                        {stats.totalJobs} {isAr ? 'أوامر' : 'jobs'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'أمانات القماش بالعهدة' : 'Custody Fabric'}</span>
                      <strong className="text-sky-600 dark:text-sky-400 font-mono text-sm block mt-0.5">
                        {stats.custodyMeters.toFixed(1)} م
                      </strong>
                    </div>

                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'إجمالي المفوتر' : 'Invoiced'}</span>
                      <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs block mt-0.5">
                        {stats.totalInvoiced.toLocaleString()} ج.م
                      </strong>
                    </div>

                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'المتبقي المستحق' : 'Balance'}</span>
                      <strong className={`font-mono text-xs block mt-0.5 ${stats.remainingBalance > 0 ? 'text-rose-600 font-black' : 'text-emerald-600'}`}>
                        {stats.remainingBalance.toLocaleString()} ج.م
                      </strong>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleOpenDossier(c.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 text-xs font-bold transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'بروفايل العميل وكشف الحساب' : 'Client Dossier'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {paginatedCustomers.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-xs">{isAr ? 'لا يوجد عملاء مطابقين للبحث.' : 'No clients found.'}</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center bg-white dark:bg-slate-900 rounded-2xl">
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

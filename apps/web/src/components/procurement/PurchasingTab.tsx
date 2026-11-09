import React, { useState, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import {
  ShoppingCart,
  Plus,
  Truck,
  Receipt,
  Printer,
  Search,
  Building2,
  User,
  Phone,
  CheckCircle2,
  Clock,
  FileText,
  DollarSign,
  Boxes,
  ShieldCheck,
  Check,
  X,
  Eye,
  Calculator,
} from 'lucide-react';
import { PurchaseRequisitionsSection } from './PurchaseRequisitionsSection';
import { SupplierProfileView } from './SupplierProfileView';
import { api } from '../../api/client';
import type { PurchaseOrder, Supplier, GoodsReceiptNote, SupplierInvoice, Warehouse } from '../../types';

interface PurchasingTabProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  goodsReceiptNotes: GoodsReceiptNote[];
  supplierInvoices: SupplierInvoice[];
  warehouses: Warehouse[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setSuppliers?: React.Dispatch<React.SetStateAction<Supplier[]>>;
  setGoodsReceiptNotes?: React.Dispatch<React.SetStateAction<GoodsReceiptNote[]>>;
  setSupplierInvoices?: React.Dispatch<React.SetStateAction<SupplierInvoice[]>>;
  onOpenCreateSupplier: () => void;
  onOpenCreatePo: () => void;
  onSelectPoForReceipt: (po: PurchaseOrder) => void;
  onSelectPoForInvoice: (po: PurchaseOrder) => void;
  onSelectSupplierForStatement: (supplier: Supplier) => void;
  isAr?: boolean;
}

export const PurchasingTab: React.FC<PurchasingTabProps> = ({
  purchaseOrders,
  suppliers,
  goodsReceiptNotes,
  supplierInvoices,
  warehouses,
  setPurchaseOrders,
  onOpenCreateSupplier,
  onOpenCreatePo,
  onSelectPoForReceipt,
  onSelectPoForInvoice,
  onSelectSupplierForStatement,
  isAr = true,
}) => {
  // Active Sub-Tab
  const [subTab, setSubTab] = useState<'orders' | 'requisitions' | 'receipts' | 'invoices' | 'suppliers'>('orders');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  // Selected PO for Details Modal / Printable Sheet
  const [viewingPo, setViewingPo] = useState<PurchaseOrder | null>(null);

  // Selected Supplier for Dedicated Internal Profile Page
  const [selectedSupplierProfile, setSelectedSupplierProfile] = useState<Supplier | null>(null);

  // Selected Supplier for Balance Calculation Breakdown Modal
  const [calculationSupplier, setCalculationSupplier] = useState<Supplier | null>(null);

  // Helper formatting functions
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split('T')[0] || dateStr;
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // KPI Computations
  const stats = useMemo(() => {
    const totalPos = purchaseOrders.length;
    const inDeliveryPos = purchaseOrders.filter(
      (p) => p.status === 'approved' || p.status === 'partially_received'
    ).length;
    const draftPos = purchaseOrders.filter((p) => p.status === 'draft').length;
    const totalPoValue = purchaseOrders.reduce((acc, p) => acc + (Number(p.total_amount) || 0), 0);

    const totalPayables = suppliers.reduce((acc, s) => acc + (Number(s.current_balance) || 0), 0);

    const matchedInvoices = supplierInvoices.filter((i) => i.matching_status === 'matched').length;
    const matchComplianceRate =
      supplierInvoices.length > 0 ? Math.round((matchedInvoices / supplierInvoices.length) * 100) : 100;

    const totalAcceptedQty = goodsReceiptNotes.reduce((acc, g) => acc + (Number(g.accepted_quantity) || 0), 0);
    const totalRejectedQty = goodsReceiptNotes.reduce((acc, g) => acc + (Number(g.rejected_quantity) || 0), 0);
    const totalReceivedQty = totalAcceptedQty + totalRejectedQty;
    const acceptanceRate =
      totalReceivedQty > 0 ? Math.round((totalAcceptedQty / totalReceivedQty) * 100) : 100;

    return {
      totalPos,
      inDeliveryPos,
      draftPos,
      totalPoValue,
      totalPayables,
      matchedInvoices,
      matchComplianceRate,
      totalGrns: goodsReceiptNotes.length,
      totalAcceptedQty,
      totalRejectedQty,
      acceptanceRate,
    };
  }, [purchaseOrders, suppliers, supplierInvoices, goodsReceiptNotes]);

  // Filtered Purchase Orders
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = searchQuery.toLowerCase();
      const poNum = (po.po_number || '').toLowerCase();
      const supName = (po.supplier_name || po.supplier?.name || '').toLowerCase();
      const whName = (po.warehouse_name || po.warehouse?.name || '').toLowerCase();

      const matchesQuery = !searchQuery || poNum.includes(q) || supName.includes(q) || whName.includes(q);
      const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
      const matchesSupplier = supplierFilter === 'all' || po.supplier_id === supplierFilter;

      return matchesQuery && matchesStatus && matchesSupplier;
    });
  }, [purchaseOrders, searchQuery, statusFilter, supplierFilter]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q))
      );
    });
  }, [suppliers, searchQuery]);

  // Filtered GRNs
  const filteredGrns = useMemo(() => {
    return goodsReceiptNotes.filter((g) => {
      const q = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        g.grn_number.toLowerCase().includes(q) ||
        (g.po_number && g.po_number.toLowerCase().includes(q)) ||
        (g.supplier_name && g.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [goodsReceiptNotes, searchQuery]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return supplierInvoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      return (
        !searchQuery ||
        inv.invoice_number.toLowerCase().includes(q) ||
        (inv.po_number && inv.po_number.toLowerCase().includes(q)) ||
        (inv.supplier_name && inv.supplier_name.toLowerCase().includes(q))
      );
    });
  }, [supplierInvoices, searchQuery]);

  // Approve PO Handler
  const handleApprovePo = async (po: PurchaseOrder) => {
    if (!window.confirm(isAr ? `هل أنت متأكد من اعتماد أمر الشراء ${po.po_number} وبدء دورة التوريد؟` : `Approve PO ${po.po_number}?`)) {
      return;
    }

    try {
      if (po.id.length > 20 && !po.id.startsWith('po-')) {
        await api.procurement.approvePurchaseOrder(po.id);
      }
      setPurchaseOrders((prev) =>
        prev.map((p) => (p.id === po.id ? { ...p, status: 'approved' } : p))
      );
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل اعتماد أمر الشراء' : 'Failed to approve purchase order'));
    }
  };

  const getPoStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return (
          <Badge variant="success" dot>
            {isAr ? 'مستلم بالكامل' : 'Fully Received'}
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="info" dot>
            {isAr ? 'معتمد (قيد التوريد)' : 'Approved (In Delivery)'}
          </Badge>
        );
      case 'partially_received':
        return (
          <Badge variant="warning" dot>
            {isAr ? 'مستلم جزئياً' : 'Partially Received'}
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger">
            {isAr ? 'ملغى' : 'Cancelled'}
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral">
            {isAr ? 'مسودة جاهزة' : 'Draft'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
      {/* Page Header */}
      <PageHeader
        title={isAr ? 'المشتريات والموردين وفحص الاستلام والمطابقة الثلاثية' : 'Procurement, GRN & 3-Way Matching'}
        subtitle={
          isAr
            ? 'إدارة دورة الشراء الكاملة: أوامر الشراء (PO)، أذون استلام وفحص الجودة (GRN)، مطابقة الفواتير الثلاثية، وأرصدة الموردين.'
            : 'End-to-end procurement: purchase orders, goods receipt notes (GRN), 3-way invoice matching, and vendor ledgers.'
        }
        icon={<ShoppingCart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'المشتريات والموردون' : 'Procurement' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCreateSupplier}
              title={isAr ? 'تسجيل مورد جديد في الدليل' : 'New Supplier'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-2xs transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{isAr ? 'مورد جديد' : 'New Supplier'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('requisitions')}
              title={isAr ? 'عرض طلبات الاحتياج الداخلي (PR)' : 'Requisitions (PR)'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>{isAr ? 'طلبات الاحتياج (PR)' : 'Requisitions (PR)'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreatePo}
              title={isAr ? 'إصدار أمر شراء رسمي جديد (PO)' : 'New Purchase Order'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAr ? 'أمر شراء جديد' : 'New PO'}</span>
            </button>
          </div>
        }
      />

      {/* 4 Interactive KPI Cards Deck */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Active POs */}
        <div
          onClick={() => {
            setSubTab('orders');
            setStatusFilter('all');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            subTab === 'orders'
              ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border-indigo-400 dark:border-indigo-700 ring-1 ring-indigo-400/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'أوامر الشراء النشطة' : 'Active POs'}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {stats.totalPos}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'أمر شراء' : 'orders'}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40">
              {isAr ? `منها ${stats.inDeliveryPos} قيد التوريد` : `${stats.inDeliveryPos} in delivery`}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-mono">{formatCurrency(stats.totalPoValue)} {isAr ? 'ج.م' : 'EGP'}</span>
          </div>
        </div>

        {/* Card 2: Vendor Payables */}
        <div
          onClick={() => setSubTab('suppliers')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            subTab === 'suppliers'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-400 dark:border-amber-700 ring-1 ring-amber-400/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'إجمالي مستحقات الموردين' : 'Vendor Payables'}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {formatCurrency(stats.totalPayables)}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-amber-500" />
            <span>{isAr ? `رصيد ${suppliers.length} مورد معتمد` : `${suppliers.length} approved vendors`}</span>
          </div>
        </div>

        {/* Card 3: 3-Way Match Invoices */}
        <div
          onClick={() => setSubTab('invoices')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            subTab === 'invoices'
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-400 dark:border-emerald-700 ring-1 ring-emerald-400/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'المطابقة الثلاثية (3-Way Match)' : '3-Way Match'}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {supplierInvoices.length}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'فاتورة' : 'invoices'}</span>
          </div>
          <div className="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? `${stats.matchComplianceRate}% مطابقة مع المخزن وPO` : `${stats.matchComplianceRate}% matched`}</span>
          </div>
        </div>

        {/* Card 4: Quality & GRN Logs */}
        <div
          onClick={() => setSubTab('receipts')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${
            subTab === 'receipts'
              ? 'bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/30 dark:to-blue-950/30 border-sky-400 dark:border-sky-700 ring-1 ring-sky-400/40'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{isAr ? 'أذون فحص واستلام المخزن' : 'GRN Inspection'}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
            {stats.totalGrns}{' '}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'إذن استلام' : 'GRNs'}</span>
          </div>
          <div className="mt-2 text-[11px] font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isAr ? `معدل القبول والجودة: ${stats.acceptanceRate}%` : `${stats.acceptanceRate}% pass rate`}</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setSubTab('orders')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            subTab === 'orders'
              ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>{isAr ? 'أوامر الشراء والتوريد' : 'Purchase Orders'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${subTab === 'orders' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {purchaseOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('requisitions')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            subTab === 'requisitions'
              ? 'bg-purple-600 text-white ring-2 ring-purple-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{isAr ? 'طلبات الاحتياج الداخلي (PR)' : 'Requisitions (PR)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('receipts')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            subTab === 'receipts'
              ? 'bg-sky-600 text-white ring-2 ring-sky-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>{isAr ? 'أذون فحص واستلام البضاعة (GRN)' : 'Goods Receipts (GRN)'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${subTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {goodsReceiptNotes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('invoices')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            subTab === 'invoices'
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>{isAr ? 'فواتير الموردين والمطابقة الثلاثية' : '3-Way Match Invoices'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${subTab === 'invoices' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {supplierInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('suppliers')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            subTab === 'suppliers'
              ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>{isAr ? 'دليل وسجل الموردين المعتمدين' : 'Suppliers Directory'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${subTab === 'suppliers' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* Filter Toolbar (Applicable for Orders, Receipts, Invoices, Suppliers) */}
      {subTab !== 'requisitions' && !(subTab === 'suppliers' && selectedSupplierProfile) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-850 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                subTab === 'orders'
                  ? (isAr ? 'بحث برقم الأمر، اسم المورد، أو المخزن...' : 'Search POs...')
                  : subTab === 'suppliers'
                  ? (isAr ? 'بحث باسم المورد، الكود، أو رقم الهاتف...' : 'Search suppliers...')
                  : subTab === 'receipts'
                  ? (isAr ? 'بحث برقم الإذن GRN أو أمر الشراء...' : 'Search GRNs...')
                  : (isAr ? 'بحث برقم الفاتورة أو المورد...' : 'Search invoices...')
              }
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter for POs */}
            {subTab === 'orders' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">{isAr ? 'كافة حالات الأوامر' : 'All Statuses'}</option>
                <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                <option value="approved">{isAr ? 'معتمد قيد التوريد' : 'Approved'}</option>
                <option value="partially_received">{isAr ? 'مستلم جزئياً' : 'Partially Received'}</option>
                <option value="received">{isAr ? 'مستلم بالكامل' : 'Received'}</option>
                <option value="cancelled">{isAr ? 'ملغى' : 'Cancelled'}</option>
              </select>
            )}

            {/* Supplier Filter for POs */}
            {subTab === 'orders' && suppliers.length > 0 && (
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <option value="all">{isAr ? 'كل الموردين المعتمدين' : 'All Suppliers'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            )}

            {searchQuery && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSupplierFilter('all');
                }}
                className="text-xs h-8 px-2 text-slate-500"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                <span>{isAr ? 'مسح الفلاتر' : 'Reset'}</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 1: PURCHASE ORDERS */}
      {subTab === 'orders' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم أمر الشراء' : 'PO #'}</th>
                  <th className="py-3 px-4">{isAr ? 'المورد المعتمد' : 'Approved Supplier'}</th>
                  <th className="py-3 px-4">{isAr ? 'المستودع المستهدف' : 'Target Warehouse'}</th>
                  <th className="py-3 px-4">{isAr ? 'تاريخ الأمر والتسليم' : 'Order & Due Date'}</th>
                  <th className="py-3 px-4">{isAr ? 'الإجمالي (شامل الضريبة)' : 'Total (Inc. VAT)'}</th>
                  <th className="py-3 px-4">{isAr ? 'حالة التوريد' : 'Status'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions & Operations'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredPurchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ShoppingCart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <span className="font-semibold text-sm">
                          {isAr ? 'لا توجد أوامر شراء مطابقة لمعايير البحث' : 'No matching purchase orders found'}
                        </span>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={onOpenCreatePo}
                          className="mt-2 text-xs font-bold"
                        >
                          + {isAr ? 'إصدار أمر شراء جديد' : 'New PO'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchaseOrders.map((po) => {
                    const supName = po.supplier_name || po.supplier?.name || (isAr ? 'مورد معتمد' : 'Supplier');
                    const whName = po.warehouse_name || po.warehouse?.name || (isAr ? 'المستودع الرئيسي' : 'Main Warehouse');

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        {/* PO Number */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setViewingPo(po)}
                            className="font-mono font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer block text-xs"
                          >
                            {po.po_number}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            {po.items?.length || po.items_count || 1} {isAr ? 'بنود أصناف' : 'items'}
                          </span>
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            const matchedSupplier = po.supplier || suppliers.find((s) => s.id === po.supplier_id);
                            return (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (matchedSupplier) {
                                      setSelectedSupplierProfile(matchedSupplier);
                                      setSubTab('suppliers');
                                    }
                                  }}
                                  title={isAr ? 'عرض البروفايل المالي والتشغيلي للمورد' : 'View Supplier Profile'}
                                  className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer text-right group"
                                >
                                  <Building2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
                                  <span className="group-hover:underline">{supName}</span>
                                </button>
                                {po.supplier?.contact_person && (
                                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-400" />
                                    <span>{po.supplier.contact_person}</span>
                                    {po.supplier.phone && (
                                      <span className="font-mono text-slate-400">({po.supplier.phone})</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        {/* Warehouse */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                            <Boxes className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{whName}</span>
                          </div>
                          {po.warehouse?.branch && (
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                              🏢 {po.warehouse.branch.name}
                            </span>
                          )}
                        </td>

                        {/* Dates */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                          <div className="font-bold">{formatDate(po.order_date)}</div>
                          {po.expected_delivery_date && (
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{isAr ? 'تسليم:' : 'Due:'} {formatDate(po.expected_delivery_date)}</span>
                            </div>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-black text-slate-900 dark:text-white text-sm">
                            {formatCurrency(po.total_amount)}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {isAr ? 'ج.م (شامل الضريبة)' : 'EGP (Inc VAT)'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getPoStatusBadge(po.status)}
                        </td>

                        {/* Actions & Operations as sleek icon buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. View PO Details Modal */}
                            <button
                              type="button"
                              title={isAr ? 'معاينة بنود وتفاصيل أمر الشراء' : 'View PO Details'}
                              onClick={() => setViewingPo(po)}
                              className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs"
                              aria-label={isAr ? 'معاينة البنود' : 'View PO'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Approve PO (Only for draft) */}
                            {po.status === 'draft' && (
                              <button
                                type="button"
                                title={isAr ? 'اعتماد أمر الشراء وبدء دورة التوريد' : 'Approve PO'}
                                onClick={() => handleApprovePo(po)}
                                className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-300/80 dark:border-emerald-800/40 transition-all cursor-pointer shadow-2xs"
                                aria-label={isAr ? 'اعتماد أمر الشراء' : 'Approve PO'}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3. GRN Inspection & Receiving */}
                            {(po.status === 'approved' || po.status === 'partially_received') && (
                              <button
                                type="button"
                                title={isAr ? 'فحص واستلام البضاعة بالمخزن (GRN)' : 'Receive & Inspect Goods (GRN)'}
                                onClick={() => onSelectPoForReceipt(po)}
                                className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-sky-600 dark:text-sky-400 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-300/80 dark:border-sky-800/40 transition-all cursor-pointer shadow-2xs"
                                aria-label={isAr ? 'فحص واستلام GRN' : 'Receive GRN'}
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 4. 3-Way Match & Supplier Invoice */}
                            {(po.status === 'received' || po.status === 'partially_received' || po.status === 'approved') && (
                              <button
                                type="button"
                                title={isAr ? 'تسجيل فاتورة ومطابقة ثلاثية (3-Way Match)' : 'Match Invoice (3-Way Match)'}
                                onClick={() => onSelectPoForInvoice(po)}
                                className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-purple-600 dark:text-purple-400 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-300/80 dark:border-purple-800/40 transition-all cursor-pointer shadow-2xs"
                                aria-label={isAr ? 'مطابقة الفاتورة' : '3-Way Match'}
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 5. Print PO Voucher */}
                            <button
                              type="button"
                              title={isAr ? 'طباعة أمر الشراء الرسمي' : 'Print PO Voucher'}
                              onClick={() => {
                                setViewingPo(po);
                                setTimeout(() => window.print(), 300);
                              }}
                              className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                              aria-label={isAr ? 'طباعة أمر الشراء' : 'Print PO'}
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

      {/* SUB-TAB 2: PURCHASE REQUISITIONS (PR) */}
      {subTab === 'requisitions' && (
        <PurchaseRequisitionsSection
          isAr={isAr}
          warehouses={warehouses}
          suppliers={suppliers}
          onPoCreated={(newPo) => {
            setPurchaseOrders((prev) => [newPo, ...prev]);
            setSubTab('orders');
          }}
        />
      )}

      {/* SUB-TAB 3: GOODS RECEIPT NOTES LOG (GRN) */}
      {subTab === 'receipts' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم إذن الاستلام' : 'GRN #'}</th>
                  <th className="py-3 px-4">{isAr ? 'أمر الشراء المرجعي' : 'Ref PO #'}</th>
                  <th className="py-3 px-4">{isAr ? 'المورد المعتمد' : 'Supplier'}</th>
                  <th className="py-3 px-4">{isAr ? 'مسؤول فحص الجودة' : 'QC Inspector'}</th>
                  <th className="py-3 px-4">{isAr ? 'نتيجة الفحص' : 'Inspection'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الكمية المقبولة (للمخزن)' : 'Accepted'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المرفوض (تالف/رد)' : 'Rejected'}</th>
                  <th className="py-3 px-4">{isAr ? 'ملاحظات الفحص والرفض' : 'QC Notes'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredGrns.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      {isAr ? 'لا توجد أذون استلام وفحص مسجلة حتى الآن' : 'No GRNs recorded yet'}
                    </td>
                  </tr>
                ) : (
                  filteredGrns.map((grn) => (
                    <tr key={grn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {grn.grn_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                        {grn.po_number || grn.purchase_order?.po_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {grn.supplier_name || grn.supplier?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {grn.quality_inspector_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={grn.inspection_status === 'passed' ? 'success' : 'warning'}>
                          {grn.inspection_status === 'passed'
                            ? (isAr ? 'مطابق واجتاز الفحص' : 'Passed Inspection')
                            : (isAr ? 'اجتياز جزئي' : 'Partial Pass')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-center text-sm">
                        +{Number(grn.accepted_quantity || 0).toLocaleString()} {isAr ? 'م' : 'm'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-center">
                        {Number(grn.rejected_quantity) > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            -{Number(grn.rejected_quantity).toLocaleString()} {isAr ? 'م' : 'm'}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {grn.rejection_reason || grn.notes || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title={isAr ? 'طباعة إذن استلام المخزن' : 'Print GRN Voucher'}
                            onClick={() => window.print()}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            aria-label={isAr ? 'طباعة إذن الاستلام' : 'Print GRN'}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title={isAr ? 'مطابقة الفاتورة الثلاثية (3-Way Match)' : '3-Way Invoice Match'}
                            onClick={() => {
                              const relatedPo = purchaseOrders.find((p) => p.po_number === grn.po_number);
                              if (relatedPo) onSelectPoForInvoice(relatedPo);
                            }}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800/40 transition-all cursor-pointer shadow-2xs"
                            aria-label={isAr ? 'مطابقة الفاتورة' : 'Match Invoice'}
                          >
                            <Receipt className="w-3.5 h-3.5" />
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

      {/* SUB-TAB 4: 3-WAY MATCHED INVOICES */}
      {subTab === 'invoices' && (
        <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-3 px-4">{isAr ? 'رقم الفاتورة الضريبية' : 'Tax Invoice #'}</th>
                  <th className="py-3 px-4">{isAr ? 'المرجع الداخلي' : 'Internal Ref'}</th>
                  <th className="py-3 px-4">{isAr ? 'المورد المعتمد' : 'Supplier'}</th>
                  <th className="py-3 px-4">{isAr ? 'أمر الشراء المرجعي' : 'Ref PO #'}</th>
                  <th className="py-3 px-4">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  <th className="py-3 px-4">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                  <th className="py-3 px-4">{isAr ? 'نتيجة المطابقة الثلاثية' : '3-Way Match'}</th>
                  <th className="py-3 px-4">{isAr ? 'حالة السداد' : 'Payment'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-slate-500">
                      {isAr ? 'لا توجد فواتير موردين مسجلة حتى الآن' : 'No supplier invoices recorded yet'}
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {inv.internal_reference || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {(() => {
                          const matchedSup = inv.supplier || suppliers.find((s) => s.id === inv.supplier_id);
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                if (matchedSup) {
                                  setSelectedSupplierProfile(matchedSup);
                                  setSubTab('suppliers');
                                }
                              }}
                              title={isAr ? 'عرض بروفايل المورد' : 'View Supplier Profile'}
                              className="hover:text-amber-600 dark:hover:text-amber-400 font-semibold hover:underline transition-colors cursor-pointer text-right"
                            >
                              {inv.supplier_name || inv.supplier?.name || '—'}
                            </button>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {inv.po_number || inv.purchase_order?.po_number || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatCurrency(inv.total_amount)} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={inv.matching_status === 'matched' ? 'success' : 'warning'}>
                          {inv.matching_status === 'matched'
                            ? (isAr ? 'مطابقة تامة 100%' : '100% Matched')
                            : (isAr ? 'فرق في السعر' : 'Price Discrepancy')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={inv.payment_status === 'paid' ? 'success' : 'neutral'}>
                          {inv.payment_status === 'paid' ? (isAr ? 'مدفوعة' : 'Paid') : (isAr ? 'غير مسددة' : 'Unpaid')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title={isAr ? 'طباعة بيان الفاتورة والمطابقة' : 'Print Invoice Match'}
                            onClick={() => window.print()}
                            className="inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                            aria-label={isAr ? 'طباعة بيان الفاتورة' : 'Print Invoice'}
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

      {/* SUB-TAB 5: APPROVED SUPPLIERS DIRECTORY OR DEDICATED INTERNAL PROFILE */}
      {subTab === 'suppliers' && selectedSupplierProfile ? (
        <SupplierProfileView
          supplier={selectedSupplierProfile}
          initialInvoices={supplierInvoices.filter(
            (inv) => (inv as any).supplier_id === selectedSupplierProfile.id || inv.supplier_name === selectedSupplierProfile.name
          )}
          initialPurchaseOrders={purchaseOrders.filter(
            (po) => po.supplier_id === selectedSupplierProfile.id || po.supplier?.name === selectedSupplierProfile.name
          )}
          onBack={() => setSelectedSupplierProfile(null)}
          onOpenCreatePo={onOpenCreatePo}
          isAr={isAr}
        />
      ) : subTab === 'suppliers' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredSuppliers.map((s) => {
              const formatPaymentTerms = (term: string) => {
                if (!term) return isAr ? 'نقدي' : 'Cash';
                if (term === 'net_30' || term === '30_days') return isAr ? 'آجل 30 يوم' : 'Net 30';
                if (term === 'net_60' || term === '60_days') return isAr ? 'آجل 60 يوم' : 'Net 60';
                if (term === 'net_15' || term === '15_days') return isAr ? 'آجل 15 يوم' : 'Net 15';
                if (term === 'cash' || term === 'cod') return isAr ? 'نقدي عند الاستلام' : 'COD';
                return term;
              };

              // Associated invoices and financial calculations
              const supInvoices = supplierInvoices.filter(
                (inv) => (inv as any).supplier_id === s.id || inv.supplier_name === s.name
              );
              const totalInvoiced = supInvoices.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);
              const currentBalance = Number(s.current_balance) || 0;
              const totalSettled = Math.max(0, totalInvoiced - currentBalance);
              const hasBalance = currentBalance > 0;

              return (
                <div
                  key={s.id}
                  className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-400/80 dark:hover:border-amber-500/60 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                >
                  {/* Subtle Top Accent Indicator */}
                  <div className={`absolute top-0 inset-x-0 h-1 transition-all ${hasBalance ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                  {/* Top Header: Avatar + Info + Balance */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        onClick={() => setSelectedSupplierProfile(s)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                        title={isAr ? 'اضغط لعرض البروفايل الشامل للمورد' : 'Click to view full supplier profile'}
                      >
                        {/* Initial Avatar */}
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-base shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          {s.name ? s.name.charAt(0) : <Building2 className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {s.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              {s.code}
                            </span>
                            {s.tax_id && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                • {s.tax_id}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Outstanding Balance Pill with interactive calculation popup */}
                      <button
                        type="button"
                        onClick={() => setCalculationSupplier(s)}
                        title={isAr ? 'اضغط لمعرفة كيف تم احتساب وتكوين هذا الرصيد بالتفصيل' : 'Click to see how this balance is calculated'}
                        className="text-left shrink-0 cursor-pointer group/pill focus:outline-none"
                      >
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-xs font-black px-2.5 py-1 rounded-xl border transition-all ${
                            hasBalance
                              ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 group-hover/pill:ring-2 group-hover/pill:ring-amber-400/30'
                              : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          }`}
                        >
                          <Calculator className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 opacity-70 group-hover/pill:opacity-100" />
                          <span>{formatCurrency(s.current_balance)} {isAr ? 'ج.م' : 'EGP'}</span>
                        </span>
                        <span className="block text-[9px] text-slate-400 text-center mt-0.5 font-medium group-hover/pill:text-amber-600 dark:group-hover/pill:text-amber-400 transition-colors">
                          {hasBalance ? (isAr ? 'رصيد مستحق (آجل) ℹ️' : 'Payable ℹ️') : (isAr ? 'حساب خالص' : 'Settled')}
                        </span>
                      </button>
                    </div>

                    {/* Middle Micro-Data Chips */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                      {/* Contact Person */}
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 min-w-0">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block leading-tight">{isAr ? 'المسؤول' : 'Contact'}</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 text-[11px] truncate block">
                            {s.contact_person || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 min-w-0">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block leading-tight">{isAr ? 'الهاتف' : 'Phone'}</span>
                          <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate block" dir="ltr">
                            {s.phone || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Terms & Micro Calculation Ribbon */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                        <span className="text-[11px] font-medium">{isAr ? 'شروط السداد المعتمدة:' : 'Terms:'}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-600 shadow-2xs">
                          {formatPaymentTerms(s.payment_terms)}
                        </span>
                      </div>

                      {/* Quick Calculation Formula Mini Ribbon */}
                      <button
                        type="button"
                        onClick={() => setCalculationSupplier(s)}
                        title={isAr ? 'اضغط لعرض تفاصيل معادلة احتساب الرصيد' : 'Click to view calculation breakdown'}
                        className="w-full flex items-center justify-between px-2.5 py-1 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-200/50 dark:border-amber-800/40 text-[10px] transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
                      >
                        <span className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                          <Calculator className="w-3 h-3" />
                          <span>{isAr ? 'تكوين الرصيد:' : 'Composition:'}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {formatCurrency(totalInvoiced)} {isAr ? 'فواتير' : 'inv'} - {formatCurrency(totalSettled)} {isAr ? 'مسدد/خصم' : 'paid/disc'} = {formatCurrency(currentBalance)} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer - ALL CLEAN MODERN ICONS */}
                  <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      {/* 1. Full Profile Icon */}
                      <button
                        type="button"
                        onClick={() => setSelectedSupplierProfile(s)}
                        title={isAr ? 'عرض البروفايل الشامل للمورد (فواتير، كاش، فيزا، آجل، خصومات، كشف حساب)' : 'Full Supplier Profile'}
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/70 shadow-2xs hover:shadow-xs transition-all hover:scale-105 cursor-pointer"
                        aria-label={isAr ? 'البروفايل الشامل للمورد' : 'Profile'}
                      >
                        <User className="w-4 h-4" />
                      </button>

                      {/* 2. Statement Icon */}
                      <button
                        type="button"
                        onClick={() => onSelectSupplierForStatement(s)}
                        title={isAr ? 'عرض وتحميل كشف حساب المورد التراكمي' : 'Supplier Statement'}
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/70 shadow-2xs hover:shadow-xs transition-all hover:scale-105 cursor-pointer"
                        aria-label={isAr ? 'كشف الحساب' : 'Statement'}
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {/* 3. Calculation Breakdown Icon */}
                      <button
                        type="button"
                        onClick={() => setCalculationSupplier(s)}
                        title={isAr ? 'تفاصيل ومعادلة احتساب الرصيد المستحق (كيف تم تكوين واحتساب الرصيد)' : 'Balance Calculation Breakdown'}
                        className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/70 shadow-2xs hover:shadow-xs transition-all hover:scale-105 cursor-pointer"
                        aria-label={isAr ? 'معادلة احتساب الرصيد' : 'Calculation'}
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 4. New Purchase Order Icon */}
                    <button
                      type="button"
                      onClick={onOpenCreatePo}
                      title={isAr ? 'إصدار أمر شراء خامات جديد لهذا المورد' : 'Issue New PO'}
                      className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs hover:shadow-md transition-all hover:scale-105 cursor-pointer"
                      aria-label={isAr ? 'أمر شراء جديد' : 'New PO'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* MODAL: BALANCE CALCULATION & COMPOSITION BREAKDOWN */}
      {calculationSupplier && (() => {
        const supInvoices = supplierInvoices.filter(
          (inv) => (inv as any).supplier_id === calculationSupplier.id || inv.supplier_name === calculationSupplier.name
        );
        const totalInvoiced = supInvoices.reduce((acc, inv) => acc + (Number(inv.total_amount) || 0), 0);
        const invPaidSum = supInvoices.reduce((acc, inv) => acc + (Number(inv.paid_amount) || 0), 0);
        const currentBalance = Number(calculationSupplier.current_balance) || 0;
        const totalSettled = Math.max(0, totalInvoiced - currentBalance);
        const totalPaid = invPaidSum > 0 ? invPaidSum : totalSettled;
        const totalDiscounts = Math.max(0, totalInvoiced - totalPaid - currentBalance);

        return (
          <Modal
            isOpen={Boolean(calculationSupplier)}
            onClose={() => setCalculationSupplier(null)}
            title={isAr ? `معادلة وتفاصيل احتساب الرصيد المستحق: ${calculationSupplier.name}` : `Balance Calculation Breakdown: ${calculationSupplier.name}`}
            maxWidth="md"
          >
            <div className="space-y-4">
              {/* Top Equation Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">{isAr ? 'المعادلة المحاسبية المعتمدة:' : 'Accounting Formula:'}</span>
                  <span className="font-mono text-amber-300 font-bold">{calculationSupplier.code}</span>
                </div>
                <div className="text-center font-mono py-2 text-sm sm:text-base font-bold text-amber-200 bg-white/5 rounded-xl border border-white/10" dir="ltr">
                  <span>{formatCurrency(totalInvoiced)}</span>
                  <span className="text-slate-400 mx-1.5">-</span>
                  <span>{formatCurrency(totalPaid)}</span>
                  <span className="text-slate-400 mx-1.5">-</span>
                  <span>{formatCurrency(totalDiscounts)}</span>
                  <span className="text-slate-400 mx-1.5">=</span>
                  <span className="text-emerald-400 font-black text-lg">{formatCurrency(currentBalance)} ج.م</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 text-center px-1">
                  <span>{isAr ? 'الفواتير المعتمدة' : 'Invoices'}</span>
                  <span>{isAr ? 'المسدد' : 'Paid'}</span>
                  <span>{isAr ? 'الخصومات' : 'Discounts'}</span>
                  <span className="text-emerald-300 font-bold">{isAr ? 'الرصيد المستحق' : 'Payable'}</span>
                </div>
              </div>

              {/* Step by Step Breakdown */}
              <div className="space-y-2.5 text-xs">
                {/* Step 1: Invoices */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">1</span>
                      <span>{isAr ? 'فواتير التوريد المعتمدة (المطابقة الثلاثية):' : 'Matched Invoices:'}</span>
                    </span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black">
                      + {formatCurrency(totalInvoiced)} ج.م
                    </span>
                  </div>

                  {supInvoices.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      {isAr ? 'لا توجد فواتير توريد مسجلة حتى الآن.' : 'No invoices recorded.'}
                    </p>
                  ) : (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      {supInvoices.map((inv) => (
                        <div key={inv.id} className="p-2 rounded-lg bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-xs">
                              {inv.invoice_number}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isAr ? 'صافي الخامات:' : 'Subtotal:'} {formatCurrency(inv.subtotal || 0)} ج.م • {isAr ? 'ضريبة 14%:' : 'VAT:'} +{formatCurrency(inv.tax_amount || 0)} ج.م
                            </span>
                          </div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                            {formatCurrency(inv.total_amount)} ج.م
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Step 2: Payments */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span className="w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-black">2</span>
                    <div>
                      <span>{isAr ? 'سندات السداد والدفعات الصادرة للمورد:' : 'Recorded Payments:'}</span>
                      <span className="text-[10px] font-normal text-slate-500 block">
                        {totalPaid > 0 ? (isAr ? 'تم سدادها كاش أو فيزا أو تحويل' : 'Paid') : (isAr ? 'لم تسجل أي دفعات مسددة حتى الآن' : 'No payments yet')}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-black">
                    - {formatCurrency(totalPaid)} ج.م
                  </span>
                </div>

                {/* Step 3: Discounts */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs font-black">3</span>
                    <div>
                      <span>{isAr ? 'الخصومات والتسويات الممنوحة:' : 'Discounts & Rebates:'}</span>
                      <span className="text-[10px] font-normal text-slate-500 block">
                        {totalDiscounts > 0 ? (isAr ? 'خصم تعجيل دفع أو سماح عيوب' : 'Discounts') : (isAr ? 'لا توجد خصومات تجارية مسجلة' : 'None')}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-black">
                    - {formatCurrency(totalDiscounts)} ج.م
                  </span>
                </div>

                {/* Step 4: Final Net Balance */}
                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                    <span className="w-5 h-5 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black">✓</span>
                    <div>
                      <span className="font-bold">{isAr ? 'الرصيد المستحق النهائي القائم على المصنع:' : 'Net Payable Balance:'}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {isAr ? 'مديونية آجلة مستحقة السداد للمورد' : 'Deferred Credit Balance'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-amber-700 dark:text-amber-300 font-black text-base">
                    {formatCurrency(currentBalance)} ج.م
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const sup = calculationSupplier;
                    setCalculationSupplier(null);
                    setSelectedSupplierProfile(sup);
                  }}
                  className="text-xs font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{isAr ? 'فتح البروفايل الشامل للمورد' : 'Open Full Profile'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCalculationSupplier(null)}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* PO View & Print Modal */}
      {viewingPo && (
        <Modal
          isOpen={Boolean(viewingPo)}
          onClose={() => setViewingPo(null)}
          title={isAr ? `أمر الشراء الرسمي: ${viewingPo.po_number}` : `Purchase Order: ${viewingPo.po_number}`}
          maxWidth="lg"
        >
          <div className="printable-sheet space-y-6 print:m-0 print:p-0">
            {/* Printable Official Header */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">{isAr ? 'مصنع الملابس الجاهزة' : 'Garment Factory'}</h2>
                <span className="text-xs text-slate-600 block">{isAr ? 'إدارة المشتريات والتوريدات والمستودعات' : 'Procurement & Warehouse Dept'}</span>
              </div>
              <div className="text-left font-mono">
                <span className="text-base font-black text-slate-900 block">{viewingPo.po_number}</span>
                <span className="text-xs text-slate-600">{formatDate(viewingPo.order_date)}</span>
              </div>
            </div>

            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b">
              <div>
                <span className="text-xs text-slate-500">{isAr ? 'المورد المعتمد:' : 'Supplier:'}</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {viewingPo.supplier_name || viewingPo.supplier?.name}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {isAr ? 'تاريخ الأمر:' : 'Order Date:'} {formatDate(viewingPo.order_date)}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500">{isAr ? 'المستودع المستهدف:' : 'Destination Warehouse:'}</span>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {viewingPo.warehouse_name || viewingPo.warehouse?.name}
                </div>
                <div className="mt-1">{getPoStatusBadge(viewingPo.status)}</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">{isAr ? 'كود الصنف' : 'Item Code'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'اسم الصنف والمواصفات' : 'Item Description'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الكمية المطلوبة' : 'Ordered Qty'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(viewingPo.items || []).map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold">{it.item_code || (it as any).item?.code || (it as any).sku || 'MAT-01'}</td>
                      <td className="py-2.5 px-3 font-semibold">{it.item_name || (it as any).item?.name || (it as any).description || 'خامات توريد'}</td>
                      <td className="py-2.5 px-3 font-mono font-black text-center text-sm">
                        {Number(it.ordered_quantity).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-center">
                        {formatCurrency(it.unit_price)} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-center">
                        {formatCurrency(it.total_price || (it.ordered_quantity * it.unit_price))} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end">
              <div className="w-64 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>{isAr ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                  <span className="font-mono">{formatCurrency(viewingPo.subtotal || viewingPo.total_amount)} ج.م</span>
                </div>
                {Number(viewingPo.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>{isAr ? 'ضريبة القيمة المضافة:' : 'VAT:'}</span>
                    <span className="font-mono">{formatCurrency(viewingPo.tax_amount)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 dark:text-white font-black text-sm border-t pt-1.5">
                  <span>{isAr ? 'الإجمالي النهائي:' : 'Total Amount:'}</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatCurrency(viewingPo.total_amount)} ج.م
                  </span>
                </div>
              </div>
            </div>

            {/* Printable Signatures */}
            <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-400 text-center text-xs">
              <div>
                <span className="font-bold block">{isAr ? 'مسؤول المشتريات' : 'Purchasing Officer'}</span>
                <div className="mt-8 border-b border-dashed border-slate-400"></div>
              </div>
              <div>
                <span className="font-bold block">{isAr ? 'أمين المخزن المستلم' : 'Receiving Warehouse'}</span>
                <div className="mt-8 border-b border-dashed border-slate-400"></div>
              </div>
              <div>
                <span className="font-bold block">{isAr ? 'اعتماد المدير المالي' : 'Finance Director'}</span>
                <div className="mt-8 border-b border-dashed border-slate-400"></div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-4 border-t no-print">
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.print()}
                className="font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{isAr ? 'طباعة أمر الشراء' : 'Print PO'}</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setViewingPo(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

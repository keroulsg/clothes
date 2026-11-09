import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import {
  Truck,
  Calendar,
  Download,
  Printer,
  ArrowDownRight,
  Filter,
  Search,
  Phone,
  FileText,
  ShoppingCart,
  Clock,
  Edit2,
  Trash2,
  Building2,
  X,
  DollarSign,
} from 'lucide-react';
import { api } from '../../api/client';
import type { Supplier } from '../../types';

interface SupplierStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string | null;
  supplier?: Supplier | null;
  isAr?: boolean;
}

export const SupplierStatementModal: React.FC<SupplierStatementModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  supplier,
  isAr = true,
}) => {
  const [statement, setStatement] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewTab, setViewTab] = useState<'ledger' | 'pos'>('ledger');

  // Payment Form States
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'visa' | 'bank_transfer' | 'cheque'>('cash');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentTime, setPaymentTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Direct Invoice Form States
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState<number | ''>('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [invoiceRef, setInvoiceRef] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Edit Transaction States
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<number | ''>('');
  const [editMethod, setEditMethod] = useState<'cash' | 'visa' | 'bank_transfer' | 'cheque'>('cash');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Printable Voucher State
  const [voucherToPrint, setVoucherToPrint] = useState<any | null>(null);

  const fetchStatement = async () => {
    if (!supplierId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.suppliers.getSupplierStatement(supplierId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatement(res);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر جلب كشف حساب المورد' : 'Failed to fetch supplier statement'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplierId) {
      fetchStatement();
      setIsPaymentFormOpen(false);
      setIsInvoiceFormOpen(false);
      setEditingTransaction(null);
      setVoucherToPrint(null);
    } else {
      setStatement(null);
      setErrorMsg(null);
    }
  }, [isOpen, supplierId]);

  const handleExportCsv = () => {
    if (!statement || !statement.lines.length) return;

    const headers = [
      isAr ? 'التاريخ والساعة' : 'Date & Time',
      isAr ? 'نوع المستند' : 'Type',
      isAr ? 'طريقة السداد' : 'Payment Method',
      isAr ? 'رقم المرجع' : 'Reference #',
      isAr ? 'البيان والتفاصيل' : 'Description',
      isAr ? 'مستحق للمورد (+)' : 'Invoiced (+)',
      isAr ? 'سداد المصنع (-)' : 'Paid (-)',
      isAr ? 'الرصيد المستحق' : 'Balance Payable',
      isAr ? 'حالة السداد' : 'Payment Status',
    ];

    const rows = statement.lines.map((l: any) => [
      `"${l.date || ''} ${l.time || ''}"`,
      `"${l.type_label || l.type}"`,
      `"${l.payment_method || '—'}"`,
      `"${l.reference || '—'}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.credit.toFixed(2),
      l.debit.toFixed(2),
      l.running_balance.toFixed(2),
      l.payment_status || '—',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `supplier_statement_${supplier?.code || statement.supplier?.code || 'vendor'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Record Payment Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !paymentAmount || Number(paymentAmount) <= 0) {
      setPaymentError(isAr ? 'يرجى إدخال مبلغ سداد صحيح' : 'Please enter a valid payment amount');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError(null);
    try {
      const fullNotes = paymentNotes
        ? `${paymentNotes} (${isAr ? 'توقيت السداد' : 'Time'}: ${paymentTime})`
        : `(${isAr ? 'توقيت السداد' : 'Time'}: ${paymentTime})`;

      await api.suppliers.recordPayment(supplierId, {
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        voucher_date: paymentDate,
        reference_number: paymentRef || undefined,
        notes: fullNotes,
      });

      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNotes('');
      setIsPaymentFormOpen(false);
      await fetchStatement();
    } catch (err: any) {
      setPaymentError(err.message || (isAr ? 'فشل تسجيل سند الصرف' : 'Failed to record payment voucher'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Record Direct Invoice Handler
  const handleRecordInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceAmount || Number(invoiceAmount) <= 0 || !invoiceNumber.trim()) {
      setInvoiceError(isAr ? 'يرجى إدخال رقم الفاتورة والقيمة الإجمالية' : 'Please enter valid invoice details');
      return;
    }

    setIsSubmittingInvoice(true);
    setInvoiceError(null);
    try {
      await api.suppliers.recordInvoice(supplierId, {
        invoice_number: invoiceNumber.trim(),
        total_amount: Number(invoiceAmount),
        invoice_date: invoiceDate,
        due_date: invoiceDueDate || undefined,
        internal_reference: invoiceRef.trim() || undefined,
        notes: invoiceNotes.trim() || undefined,
      });

      setInvoiceNumber('');
      setInvoiceAmount('');
      setInvoiceRef('');
      setInvoiceNotes('');
      setIsInvoiceFormOpen(false);
      await fetchStatement();
    } catch (err: any) {
      setInvoiceError(err.message || (isAr ? 'فشل تسجيل فاتورة التوريد' : 'Failed to record supplier invoice'));
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Start Edit Transaction
  const handleStartEdit = (line: any) => {
    setEditingTransaction(line);
    setEditAmount(line.type === 'payment' ? line.debit : line.credit);
    setEditMethod(line.payment_method || 'cash');
    setEditDate(line.date || new Date().toISOString().split('T')[0]);
    setEditNotes(line.notes || line.description || '');
    setEditError(null);
  };

  // Save Edit Transaction
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !editingTransaction || !editAmount || Number(editAmount) <= 0) return;

    setIsSubmittingEdit(true);
    setEditError(null);
    try {
      if (editingTransaction.type === 'payment') {
        await api.suppliers.updatePayment(supplierId, editingTransaction.raw_id, {
          amount: Number(editAmount),
          payment_method: editMethod,
          voucher_date: editDate,
          notes: editNotes,
        });
      }
      setEditingTransaction(null);
      await fetchStatement();
    } catch (err: any) {
      setEditError(err.message || (isAr ? 'فشل تعديل السند' : 'Failed to update transaction'));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (line: any) => {
    if (!supplierId || !line.raw_id) return;
    const isPayment = line.type === 'payment';
    const confirmMsg = isAr
      ? `هل أنت متأكد من حذف ${isPayment ? 'سند الصرف' : 'فاتورة التوريد'} رقم (${line.reference})؟ سيتم تلقائياً عكس المبلغ وتحديث رصيد المورد.`
      : `Delete ${isPayment ? 'payment' : 'invoice'} (${line.reference})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isPayment) {
        await api.suppliers.deletePayment(supplierId, line.raw_id);
      } else {
        await api.suppliers.deleteInvoice(supplierId, line.raw_id);
      }
      await fetchStatement();
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حذف الحركة' : 'Failed to delete transaction'));
    }
  };

  const formatDateTime = (dateStr?: string, timeStr?: string, rawDatetime?: string) => {
    if (!dateStr && !rawDatetime) return { date: '—', time: '—' };

    let dStr = dateStr || '';
    let tStr = timeStr || '';

    try {
      const source = rawDatetime || (dateStr ? (dateStr.includes('T') ? dateStr : `${dateStr}T${timeStr || '12:00:00'}`) : '');
      const d = new Date(source);
      if (!isNaN(d.getTime())) {
        dStr = d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        tStr = d.toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {}

    return { date: dStr || dateStr || '—', time: tStr || timeStr || '—' };
  };

  const getPaymentMethodBadge = (method?: string, type?: string) => {
    if (type === 'invoice') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
          📜 {isAr ? 'توريد آجل (التزام)' : 'Credit Invoice'}
        </span>
      );
    }

    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
            💵 {isAr ? 'نقداً (كاش خزينة)' : 'Cash'}
          </span>
        );
      case 'card':
      case 'visa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
            💳 {isAr ? 'فيزا / بطاقة بنكية' : 'Visa / Card'}
          </span>
        );
      case 'bank_transfer':
      case 'instapay':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
            🏦 {isAr ? 'تحويل بنكي / إنستاباي' : 'Transfer'}
          </span>
        );
      case 'check':
      case 'cheque':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
            📑 {isAr ? 'شيك بنكي' : 'Cheque'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {isAr ? 'سداد على الحساب' : 'Payment'}
          </span>
        );
    }
  };

  const filteredLines = (statement?.lines || []).filter((l: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.reference || '').toLowerCase().includes(term) ||
      (l.description || '').toLowerCase().includes(term) ||
      (l.type_label || '').toLowerCase().includes(term)
    );
  });

  const activeSup = statement?.supplier || supplier;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAr
          ? `كشف حساب المورد: ${activeSup?.name || ''} (${activeSup?.code || ''})`
          : `Supplier Statement: ${activeSup?.name || ''} (${activeSup?.code || ''})`
      }
      maxWidth="xl"
    >
      <div className="space-y-4 printable-sheet">
        {/* Supplier Header Info Card */}
        {activeSup && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                {activeSup.name ? activeSup.name.charAt(0) : <Building2 className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{activeSup.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                    {activeSup.code}
                  </span>
                  {activeSup.tax_id && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      • {isAr ? 'السجل الضريبي:' : 'Tax ID:'} {activeSup.tax_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              {activeSup.contact_person && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{isAr ? 'المسؤول:' : 'Contact:'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{activeSup.contact_person}</span>
                </div>
              )}
              {activeSup.phone && (
                <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-200" dir="ltr">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeSup.phone}</span>
                </div>
              )}
              {activeSup.payment_terms && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">{isAr ? 'الشروط:' : 'Terms:'}</span>
                  <Badge variant="neutral" className="text-[10px]">
                    {activeSup.payment_terms === 'net_30' ? (isAr ? 'آجل 30 يوم' : 'Net 30') : activeSup.payment_terms}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial KPI Summary Cards Deck */}
        {statement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                {isAr ? 'إجمالي أوامر الشراء' : 'Total POs'}
              </span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-base">
                <ShoppingCart className="w-4 h-4 text-blue-500" />
                <span>{Number(statement.summary.total_po_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/40 shadow-2xs">
              <span className="text-[11px] text-purple-700 dark:text-purple-300 block font-medium">
                {isAr ? 'إجمالي الفواتير الآجلة' : 'Total Invoiced'}
              </span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-purple-700 dark:text-purple-300 text-base">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>{Number(statement.summary.total_invoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 shadow-2xs">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 block font-medium">
                {isAr ? 'إجمالي المسدد للمورد (-)' : 'Total Paid (-)'}
              </span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                <span>{Number(statement.summary.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
              <span className="text-[11px] text-amber-800 dark:text-amber-300 block font-bold">
                {isAr ? 'الرصيد الصافي المتبقي' : 'Balance Payable'}
              </span>
              <div className="mt-1 flex items-center gap-1 font-mono font-black text-amber-700 dark:text-amber-300 text-lg">
                <span>{Number(statement.summary.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>
          </div>
        )}

        {/* View Switcher Tabs & Quick Add Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 no-print">
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setViewTab('ledger')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewTab === 'ledger'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isAr ? 'كشف الحركات والدفعات' : 'Ledger & Payments'}
            </button>
            <button
              onClick={() => setViewTab('pos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                viewTab === 'pos'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isAr ? `أوامر الشراء (${statement?.purchase_orders?.length || 0})` : `POs (${statement?.purchase_orders?.length || 0})`}
            </button>
          </div>

          {/* Quick Create Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsInvoiceFormOpen(!isInvoiceFormOpen);
                setIsPaymentFormOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              <span>{isAr ? '+ تسجيل فاتورة توريد' : '+ New Invoice'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPaymentFormOpen(!isPaymentFormOpen);
                setIsInvoiceFormOpen(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>{isAr ? '+ سداد دفعة للمورد' : '+ Record Payment'}</span>
            </button>
          </div>
        </div>

        {/* 1. RECORD PAYMENT PANEL */}
        {isPaymentFormOpen && (
          <form onSubmit={handleRecordPayment} className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'تسجيل سند صرف وسداد دفعة للمورد' : 'Record Supplier Payment Voucher'}</span>
              </h5>
              <button
                type="button"
                onClick={() => setIsPaymentFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                {paymentError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'المبلغ المسدد (ج.م) *' : 'Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || '')}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'طريقة السداد المعتمدة *' : 'Payment Method *'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-semibold cursor-pointer"
                >
                  <option value="cash">{isAr ? '💵 نقداً (كاش - خزينة المصنع)' : 'Cash'}</option>
                  <option value="visa">{isAr ? '💳 فيزا / بطاقة بنكية (Card)' : 'Visa / Card'}</option>
                  <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي / إنستاباي' : 'Bank Transfer'}</option>
                  <option value="cheque">{isAr ? '📜 شيك بنكي (Cheque)' : 'Cheque'}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ السداد *' : 'Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{isAr ? 'ساعة وتوقيت السداد' : 'Time'}</span>
                </label>
                <input
                  type="time"
                  value={paymentTime}
                  onChange={(e) => setPaymentTime(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'رقم الإيصال / الشيك / التحويل (اختياري)' : 'Reference / Cheque #'}
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder={isAr ? 'مثال: CHQ-50912 أو إيصال بنكي رقم 440' : 'e.g. Cheque #'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'ملاحظات وتفاصيل الدفعة' : 'Payment Notes'}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: دفعة تحت حساب أقمشة القطن' : 'Notes...'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentFormOpen(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingPayment}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isAr ? 'تأكيد السداد وترحيل السند' : 'Confirm & Post Payment'}
              </Button>
            </div>
          </form>
        )}

        {/* 2. RECORD INVOICE PANEL */}
        {isInvoiceFormOpen && (
          <form onSubmit={handleRecordInvoice} className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <h5 className="text-xs font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>{isAr ? 'تسجيل فاتورة توريد خامات جديدة (إثبات مديونية)' : 'Record Supplier Purchase Invoice'}</span>
              </h5>
              <button
                type="button"
                onClick={() => setIsInvoiceFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {invoiceError && (
              <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                {invoiceError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم الفاتورة الضريبية *' : 'Invoice Number *'}
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder={isAr ? 'مثال: INV-2026-001' : 'INV-001'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'القيمة الإجمالية (ج.م) *' : 'Total Amount (EGP) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invoiceAmount}
                  onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || '')}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold text-purple-600 dark:text-purple-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ الفاتورة *' : 'Invoice Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ استحقاق الآجل' : 'Due Date'}
                </label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'المرجع الداخلي / رقم إذن المخزن' : 'Internal Ref / GRN #'}
                </label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder={isAr ? 'مثال: GRN-2026-101' : 'GRN-101'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'ملاحظات ووصف الخامات الموردة' : 'Invoice Notes'}
                </label>
                <input
                  type="text"
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  placeholder={isAr ? 'مثال: توريد 500 متر قماش جبردين تركي' : 'Notes...'}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsInvoiceFormOpen(false)}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingInvoice}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isAr ? 'تأكيد وحفظ الفاتورة' : 'Confirm & Save Invoice'}
              </Button>
            </div>
          </form>
        )}

        {/* 3. EDIT TRANSACTION MODAL */}
        {editingTransaction && (
          <Modal
            isOpen={Boolean(editingTransaction)}
            onClose={() => setEditingTransaction(null)}
            title={isAr ? `تعديل سند الصرف: ${editingTransaction.reference}` : `Edit Voucher: ${editingTransaction.reference}`}
            maxWidth="md"
          >
            <form onSubmit={handleSaveEdit} className="space-y-4">
              {editError && (
                <div className="p-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  {editError}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المبلغ المسدد (ج.م) *' : 'Amount (EGP) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(parseFloat(e.target.value) || '')}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'طريقة السداد *' : 'Payment Method *'}
                  </label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-semibold"
                  >
                    <option value="cash">{isAr ? '💵 نقداً (كاش خزينة)' : 'Cash'}</option>
                    <option value="visa">{isAr ? '💳 فيزا / بطاقة بنكية' : 'Visa / Card'}</option>
                    <option value="bank_transfer">{isAr ? '🏦 تحويل بنكي / إنستاباي' : 'Bank Transfer'}</option>
                    <option value="cheque">{isAr ? '📜 شيك بنكي' : 'Cheque'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'تاريخ السند *' : 'Date *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    {isAr ? 'ملاحظات وبيان الصرف' : 'Notes'}
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingTransaction(null)}
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={isSubmittingEdit}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {isAr ? 'حفظ التعديلات' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* 4. PRINTABLE VOUCHER MODAL */}
        {voucherToPrint && (
          <Modal
            isOpen={Boolean(voucherToPrint)}
            onClose={() => setVoucherToPrint(null)}
            title={isAr ? `إيصال معاملة رسمي: ${voucherToPrint.reference}` : `Voucher: ${voucherToPrint.reference}`}
            maxWidth="md"
          >
            <div className="printable-voucher space-y-5 print:p-0">
              <div className="border border-slate-200 dark:border-slate-700 p-5 rounded-2xl bg-white dark:bg-slate-900 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {isAr ? 'مصنع الملابس الجاهزة' : 'Garment Factory'}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {voucherToPrint.type === 'payment'
                        ? (isAr ? 'سند صرف وسداد دفعة مورد' : 'Supplier Payment Voucher')
                        : (isAr ? 'فاتورة توريد خامات معتمدة' : 'Supplier Purchase Invoice')}
                    </p>
                  </div>
                  <div className="text-left font-mono text-xs">
                    <span className="font-bold text-indigo-600 block">{voucherToPrint.reference}</span>
                    <span className="text-slate-400">{voucherToPrint.date}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'اسم المورد:' : 'Supplier:'}</span>
                    <strong className="text-slate-900 dark:text-white">{activeSup?.name}</strong>
                    <span className="font-mono text-[10px] text-slate-400 block mt-0.5">({activeSup?.code})</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'تاريخ ووقت الحركة:' : 'Date & Time:'}</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{voucherToPrint.date}</strong>
                    <span className="font-mono text-[10px] text-slate-500 block mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{voucherToPrint.time || '12:00 م'}</span>
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'طريقة السداد / الدفع:' : 'Payment Method:'}</span>
                    <div className="mt-1">{getPaymentMethodBadge(voucherToPrint.payment_method, voucherToPrint.type)}</div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'المبلغ المالي:' : 'Amount:'}</span>
                    <strong className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 block">
                      {Number(voucherToPrint.type === 'payment' ? voucherToPrint.debit : voucherToPrint.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                    </strong>
                  </div>
                </div>

                {/* Description */}
                <div className="p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 text-xs text-slate-700 dark:text-slate-300">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'البيان والملاحظات:' : 'Notes:'}</span>
                  <p className="mt-0.5 font-medium">{voucherToPrint.description || '—'}</p>
                </div>

                {/* Balance after voucher */}
                <div className="flex justify-between items-center px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 text-xs">
                  <span className="font-bold text-amber-800 dark:text-amber-300">{isAr ? 'الرصيد المتبقي على المصنع بعد هذه الحركة:' : 'Remaining Balance:'}</span>
                  <strong className="font-mono font-black text-sm text-amber-700 dark:text-amber-400">
                    {Number(voucherToPrint.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م
                  </strong>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t text-center text-[10px] text-slate-500">
                  <div>
                    <span>{isAr ? 'أمين الخزينة' : 'Cashier'}</span>
                    <div className="mt-6 border-b border-dashed border-slate-300"></div>
                  </div>
                  <div>
                    <span>{isAr ? 'المستلم (المورد/المندوب)' : 'Recipient'}</span>
                    <div className="mt-6 border-b border-dashed border-slate-300"></div>
                  </div>
                  <div>
                    <span>{isAr ? 'اعتماد الإدارة المالية' : 'Finance Manager'}</span>
                    <div className="mt-6 border-b border-dashed border-slate-300"></div>
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-between items-center print:hidden no-print">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => window.print()}
                  className="font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>{isAr ? 'طباعة السند' : 'Print Voucher'}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVoucherToPrint(null)}
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Filters and Actions Toolbar */}
        {viewTab === 'ledger' && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs shadow-2xs no-print">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  placeholder={isAr ? 'من تاريخ' : 'From date'}
                />
              </div>
              <span className="text-slate-400">—</span>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  placeholder={isAr ? 'إلى تاريخ' : 'To date'}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchStatement}
                className="h-7 text-xs rounded-xl"
                icon={<Filter className="w-3 h-3" />}
              >
                {isAr ? 'تطبيق' : 'Filter'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute top-2 start-2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث برقم الفاتورة أو السند...' : 'Search ref...'}
                  className="ps-7 pe-2 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs w-48"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                disabled={!statement || !statement.lines.length}
                className="h-7 text-xs rounded-xl"
                icon={<Download className="w-3 h-3" />}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                disabled={!statement || !statement.lines.length}
                className="h-7 text-xs rounded-xl"
                icon={<Printer className="w-3 h-3" />}
              >
                {isAr ? 'طباعة الكشف' : 'Print'}
              </Button>
            </div>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="p-4 space-y-2">
            <LoadingSkeleton count={5} />
          </div>
        ) : errorMsg ? (
          <ErrorState
            title={isAr ? 'خطأ في جلب كشف حساب المورد' : 'Error Loading Statement'}
            message={errorMsg}
            onRetry={fetchStatement}
          />
        ) : viewTab === 'ledger' ? (
          !statement || filteredLines.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-10 h-10 text-slate-400" />}
              title={isAr ? 'لا توجد فواتير أو حركات مسجلة لهذا المورد' : 'No Transactions Recorded'}
              description={
                searchTerm || fromDate || toDate
                  ? (isAr ? 'لم يتم العثور على حركات تطابق معايير الفلترة.' : 'No transactions matched the selected filter.')
                  : (isAr ? 'لم تسجل أي فواتير توريد أو سندات سداد لهذا المورد بعد. اضغط على الأزرار بالأعلى لبدء تسجيل الفواتير أو الدفعات.' : 'No invoices or payments recorded yet. Click the buttons above to record.')
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-3">{isAr ? 'التاريخ والساعة' : 'Date & Time'}</th>
                    <th className="py-3 px-3">{isAr ? 'نوع المستند' : 'Type'}</th>
                    <th className="py-3 px-3">{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
                    <th className="py-3 px-3">{isAr ? 'رقم المرجع' : 'Ref #'}</th>
                    <th className="py-3 px-3">{isAr ? 'البيان والتفاصيل' : 'Description'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'مستحق للمورد (+)' : 'Invoiced (+)'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'سداد المصنع (-)' : 'Paid (-)'}</th>
                    <th className="py-3 px-3 text-end font-bold">{isAr ? 'الرصيد المستحق' : 'Balance Payable'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredLines.map((line: any) => {
                    const dt = formatDateTime(line.date, line.time, line.datetime);

                    return (
                      <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        {/* Date and exact time */}
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <div className="font-bold">{dt.date}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{dt.time}</span>
                          </div>
                        </td>

                        {/* Document type */}
                        <td className="py-2.5 px-3 font-sans">
                          <Badge variant={line.type === 'invoice' ? 'warning' : 'success'}>
                            {line.type_label}
                          </Badge>
                        </td>

                        {/* Payment method */}
                        <td className="py-2.5 px-3 font-sans">
                          {getPaymentMethodBadge(line.payment_method, line.type)}
                        </td>

                        {/* Reference Number */}
                        <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {line.reference}
                        </td>

                        {/* Description */}
                        <td className="py-2.5 px-3 font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate" title={line.description}>
                          {line.description}
                        </td>

                        {/* Invoiced Credit */}
                        <td className="py-2.5 px-3 text-end font-bold text-purple-700 dark:text-purple-300 whitespace-nowrap">
                          {line.credit > 0 ? `+${Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>

                        {/* Paid Debit */}
                        <td className="py-2.5 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {line.debit > 0 ? `-${Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                        </td>

                        {/* Running Balance */}
                        <td className="py-2.5 px-3 text-end font-black text-slate-900 dark:text-white whitespace-nowrap">
                          {Number(line.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                        </td>

                        {/* Actions: Print, Edit, Delete */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. Print Receipt Voucher */}
                            <button
                              type="button"
                              title={isAr ? 'طباعة إيصال وسند الحركة' : 'Print Voucher'}
                              onClick={() => setVoucherToPrint(line)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
                              aria-label={isAr ? 'طباعة السند' : 'Print Voucher'}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Edit (Available for payment vouchers) */}
                            {line.type === 'payment' && (
                              <button
                                type="button"
                                title={isAr ? 'تعديل سند الصرف' : 'Edit Voucher'}
                                onClick={() => handleStartEdit(line)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 transition-all cursor-pointer shadow-2xs"
                                aria-label={isAr ? 'تعديل السند' : 'Edit Voucher'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 3. Delete / Void */}
                            <button
                              type="button"
                              title={isAr ? 'حذف الحركة وعكس الرصيد' : 'Delete / Void'}
                              onClick={() => handleDeleteTransaction(line)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 transition-all cursor-pointer shadow-2xs"
                              aria-label={isAr ? 'حذف الحركة' : 'Delete'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Purchase Orders Tab */
          !statement?.purchase_orders || statement.purchase_orders.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart className="w-10 h-10 text-slate-400" />}
              title={isAr ? 'لا توجد أوامر شراء لهذا المورد' : 'No Purchase Orders'}
              description={isAr ? 'لم يصدر أي أمر شراء لهذا المورد بعد.' : 'No purchase orders have been created for this vendor.'}
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-3">{isAr ? 'رقم أمر الشراء' : 'PO #'}</th>
                    <th className="py-3 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {statement.purchase_orders.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{po.po_number}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{po.order_date || '—'}</td>
                      <td className="py-2.5 px-3 text-end font-bold text-slate-900 dark:text-white">
                        {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <Badge variant={po.status === 'received' ? 'success' : po.status === 'approved' ? 'info' : 'neutral'}>
                          {po.status === 'received' ? (isAr ? 'مستلم' : 'Received') : po.status === 'approved' ? (isAr ? 'معتمد' : 'Approved') : (isAr ? 'مسودة' : 'Draft')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div className="pt-2 flex justify-end no-print">
          <Button variant="outline" size="sm" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

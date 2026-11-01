import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { Truck, Calendar, Download, Printer, ArrowDownRight, Filter, Search, Phone, FileText, ShoppingCart } from 'lucide-react';
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
    } else {
      setStatement(null);
      setErrorMsg(null);
    }
  }, [isOpen, supplierId]);

  const handleExportCsv = () => {
    if (!statement || !statement.lines.length) return;

    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'نوع المستند' : 'Type',
      isAr ? 'رقم المرجع' : 'Reference #',
      isAr ? 'البيان' : 'Description',
      isAr ? 'مستحق للمورد (+)' : 'Invoiced (+)',
      isAr ? 'سداد المصنع (-)' : 'Paid (-)',
      isAr ? 'الرصيد المستحق' : 'Balance Payable',
      isAr ? 'حالة السداد' : 'Payment Status',
    ];

    const rows = statement.lines.map((l: any) => [
      l.date || '—',
      `"${l.type_label || l.type}"`,
      l.reference || '—',
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
      `supplier_statement_${supplier?.code || statement.supplier.code || 'vendor'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      <div className="space-y-4">
        {/* Supplier Header Info */}
        {activeSup && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{activeSup.name}</h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{activeSup.code}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
              {activeSup.contact_person && (
                <div>
                  <span className="text-slate-400">{isAr ? 'مسؤول الاتصال: ' : 'Contact: '}</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{activeSup.contact_person}</span>
                </div>
              )}
              {activeSup.phone && (
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{activeSup.phone}</span>
                </div>
              )}
              {activeSup.payment_terms && (
                <div>
                  <span className="text-slate-400">{isAr ? 'شروط الدفع: ' : 'Terms: '}</span>
                  <Badge variant="neutral">{activeSup.payment_terms}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        {statement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي أوامر الشراء' : 'Total POs'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-sm">
                <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                <span>{Number(statement.summary.total_po_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي الفواتير المعتمدة' : 'Total Invoiced'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-sm">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>{Number(statement.summary.total_invoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي المسدد للمورد' : 'Total Paid'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{Number(statement.summary.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30">
              <span className="text-[11px] text-primary dark:text-[#fca5a5] block font-medium">{isAr ? 'الرصيد المستحق للمورد' : 'Balance Payable'}</span>
              <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white text-base">
                {Number(statement.summary.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mx-1">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 text-xs">
          <button
            onClick={() => setViewTab('ledger')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewTab === 'ledger'
                ? 'bg-primary text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'كشف الحركات والفواتير' : 'Ledger & Invoices'}
          </button>
          <button
            onClick={() => setViewTab('pos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              viewTab === 'pos'
                ? 'bg-primary text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? `أوامر الشراء (${statement?.purchase_orders?.length || 0})` : `Purchase Orders (${statement?.purchase_orders?.length || 0})`}
          </button>
        </div>

        {/* Filters and Actions Toolbar */}
        {viewTab === 'ledger' && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  placeholder={isAr ? 'من تاريخ' : 'From date'}
                />
              </div>
              <span className="text-slate-400">—</span>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs"
                  placeholder={isAr ? 'إلى تاريخ' : 'To date'}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchStatement}
                className="h-7 text-xs"
                icon={<Filter className="w-3 h-3" />}
              >
                {isAr ? 'تطبيق الفلترة' : 'Filter'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute top-2 start-2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={isAr ? 'بحث برقم الفاتورة...' : 'Search invoice #...'}
                  className="ps-7 pe-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs w-44"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCsv}
                disabled={!statement || !statement.lines.length}
                className="h-7 text-xs"
                icon={<Download className="w-3 h-3" />}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                disabled={!statement || !statement.lines.length}
                className="h-7 text-xs"
                icon={<Printer className="w-3 h-3" />}
              >
                {isAr ? 'طباعة' : 'Print'}
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
                  : (isAr ? 'لم تسجل أي فواتير توريد لهذا المورد بعد.' : 'No supplier invoices have been recorded yet.')
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'نوع المستند' : 'Type'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'البيان' : 'Description'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'مستحق للمورد (+)' : 'Invoiced (+)'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'المسدد (-)' : 'Paid (-)'}</th>
                    <th className="py-2.5 px-3 text-end font-bold">{isAr ? 'الرصيد المستحق' : 'Balance Payable'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {filteredLines.map((line: any) => (
                    <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{line.date || '—'}</td>
                      <td className="py-2 px-3 font-sans">
                        <Badge variant="neutral">{line.type_label}</Badge>
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{line.reference}</td>
                      <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200 max-w-xs truncate" title={line.description}>
                        {line.description}
                      </td>
                      <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                      </td>
                      <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {Number(line.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <Badge variant={line.payment_status === 'paid' ? 'success' : 'warning'}>
                          {line.payment_status === 'paid' ? (isAr ? 'مسددة' : 'Paid') : (isAr ? 'مستحقة' : 'Unpaid')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
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
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'رقم أمر الشراء' : 'PO #'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-end">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                    <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {statement.purchase_orders.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">{po.po_number}</td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{po.order_date || '—'}</td>
                      <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white">
                        {Number(po.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="py-2 px-3 text-center font-sans">
                        <Badge variant={po.status === 'received' ? 'success' : po.status === 'approved' ? 'info' : 'neutral'}>
                          {po.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

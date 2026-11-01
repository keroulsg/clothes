import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { User, Calendar, Download, Printer, ArrowDownRight, Filter, Search, Phone, MapPin, Receipt, RotateCcw } from 'lucide-react';
import { api } from '../../api/client';
import type { Customer, CustomerStatement } from '../../types';

interface CustomerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customer?: Customer | null;
  isAr?: boolean;
}

export const CustomerStatementModal: React.FC<CustomerStatementModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customer,
  isAr = true,
}) => {
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatement = async () => {
    if (!customerId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.customers.getCustomerStatement(customerId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatement(res);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر جلب كشف حساب العميل' : 'Failed to fetch customer statement'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchStatement();
    } else {
      setStatement(null);
      setErrorMsg(null);
    }
  }, [isOpen, customerId]);

  const handleExportCsv = () => {
    if (!statement || !statement.lines.length) return;

    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'نوع الحركة' : 'Type',
      isAr ? 'رقم المستند' : 'Reference #',
      isAr ? 'البيان' : 'Description',
      isAr ? 'مدين (+)' : 'Debit (+)',
      isAr ? 'دائن (-)' : 'Credit (-)',
      isAr ? 'الرصيد التراكمي' : 'Running Balance',
      isAr ? 'حالة السداد' : 'Payment Status',
    ];

    const rows = statement.lines.map((l) => [
      l.date || '—',
      `"${l.type_label || l.type}"`,
      l.reference || '—',
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.debit.toFixed(2),
      l.credit.toFixed(2),
      l.running_balance.toFixed(2),
      l.payment_status || '—',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `customer_statement_${customer?.code || statement.customer.code || 'client'}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLines = (statement?.lines || []).filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.reference || '').toLowerCase().includes(term) ||
      (l.description || '').toLowerCase().includes(term) ||
      (l.type_label || '').toLowerCase().includes(term)
    );
  });

  const activeCust = statement?.customer || customer;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isAr
          ? `كشف حساب العميل: ${activeCust?.name || ''} (${activeCust?.code || ''})`
          : `Customer Statement: ${activeCust?.name || ''} (${activeCust?.code || ''})`
      }
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Customer Header Info */}
        {activeCust && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white">{activeCust.name}</h4>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{activeCust.code}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 dark:text-slate-300">
              {activeCust.phone && (
                <div className="flex items-center gap-1 font-mono">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{activeCust.phone}</span>
                </div>
              )}
              {activeCust.address && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{activeCust.address}</span>
                </div>
              )}
              {activeCust.tax_id && (
                <div>
                  <span className="text-slate-400">{isAr ? 'الرقم الضريبي: ' : 'Tax ID: '}</span>
                  <span className="font-mono font-medium">{activeCust.tax_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financial KPI Summary Cards */}
        {statement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي المبيعات المفوترة' : 'Total Invoiced'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-slate-900 dark:text-white text-sm">
                <Receipt className="w-3.5 h-3.5 text-blue-500" />
                <span>{Number(statement.summary.total_invoiced).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي المدفوعات المسددة' : 'Total Paid'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{Number(statement.summary.total_paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي المرتجعات المعتمدة' : 'Total Returns'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{Number(statement.summary.total_refunded).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30">
              <span className="text-[11px] text-primary dark:text-[#fca5a5] block font-medium">{isAr ? 'صافي الرصيد المستحق (المديونية)' : 'Current Balance Due'}</span>
              <div className="mt-1 font-mono font-bold text-slate-900 dark:text-white text-base">
                {Number(statement.summary.closing_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 mx-1">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Filters and Actions Toolbar */}
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
                placeholder={isAr ? 'بحث برقم الفاتورة أو المرتجع...' : 'Search invoice # or return #...'}
                className="ps-7 pe-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs w-48"
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

        {/* Content Area */}
        {isLoading ? (
          <div className="p-4 space-y-2">
            <LoadingSkeleton count={5} />
          </div>
        ) : errorMsg ? (
          <ErrorState
            title={isAr ? 'خطأ في جلب كشف حساب العميل' : 'Error Loading Customer Statement'}
            message={errorMsg}
            onRetry={fetchStatement}
          />
        ) : !statement || filteredLines.length === 0 ? (
          <EmptyState
            icon={<User className="w-10 h-10 text-slate-400" />}
            title={isAr ? 'لا توجد معاملات مسجلة لهذا العميل' : 'No Transactions Recorded'}
            description={
              searchTerm || fromDate || toDate
                ? (isAr ? 'لم يتم العثور على فواتير أو مرتجعات تطابق معايير الفلترة.' : 'No invoices or returns matched the selected date or search filter.')
                : (isAr ? 'لم يتم إصدار أي فواتير مبيعات أو تسجيل مرتجعات لهذا العميل حتى الآن.' : 'No sales invoices or returns have been issued for this client yet.')
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'نوع المستند' : 'Doc Type'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'رقم المرجع' : 'Reference #'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'البيان' : 'Description'}</th>
                  <th className="py-2.5 px-3 text-end">{isAr ? 'مفوتر (+)' : 'Invoiced (+)'}</th>
                  <th className="py-2.5 px-3 text-end">{isAr ? 'مسدد / مرتجع (-)' : 'Paid / Returned (-)'}</th>
                  <th className="py-2.5 px-3 text-end font-bold">{isAr ? 'الرصيد المستحق' : 'Balance Due'}</th>
                  <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {filteredLines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{line.date || '—'}</td>
                    <td className="py-2 px-3 font-sans">
                      <Badge variant={line.type === 'invoice' ? 'neutral' : 'warning'}>
                        {line.type_label}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{line.reference}</td>
                    <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200 max-w-xs truncate" title={line.description}>
                      {line.description}
                    </td>
                    <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-end font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {Number(line.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <Badge
                        variant={
                          line.payment_status === 'paid' || line.payment_status === 'settled'
                            ? 'success'
                            : line.payment_status === 'partially_paid'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {line.payment_status === 'paid'
                          ? (isAr ? 'مسدد' : 'Paid')
                          : line.payment_status === 'settled'
                          ? (isAr ? 'تمت التسوية' : 'Settled')
                          : line.payment_status === 'partially_paid'
                          ? (isAr ? 'سداد جزئي' : 'Partial')
                          : (isAr ? 'مستحق' : 'Unpaid')}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

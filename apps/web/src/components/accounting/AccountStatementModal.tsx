import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorState } from '../ui/ErrorState';
import { EmptyState } from '../ui/EmptyState';
import { BookOpen, Calendar, Download, Printer, ArrowDownRight, ArrowUpRight, Filter, Search } from 'lucide-react';
import { api } from '../../api/client';
import type { AccountStatement } from '../../types';

interface AccountStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  accountName?: string;
  accountCode?: string;
  isAr?: boolean;
}

export const AccountStatementModal: React.FC<AccountStatementModalProps> = ({
  isOpen,
  onClose,
  accountId,
  accountName = '',
  accountCode = '',
  isAr = true,
}) => {
  const [statement, setStatement] = useState<AccountStatement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchStatement = async () => {
    if (!accountId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.accounting.getAccountStatement(accountId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatement(res);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر جلب كشف حركة الحساب من الخادم' : 'Failed to fetch account statement'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accountId) {
      fetchStatement();
    } else {
      setStatement(null);
      setErrorMsg(null);
    }
  }, [isOpen, accountId]);

  const handleExportCsv = () => {
    if (!statement || !statement.lines.length) return;

    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'رقم القيد' : 'Entry #',
      isAr ? 'البيان' : 'Description',
      isAr ? 'مدين' : 'Debit',
      isAr ? 'دائن' : 'Credit',
      isAr ? 'الرصيد التراكمي' : 'Running Balance',
    ];

    const rows = statement.lines.map((l) => [
      l.entry_date || '—',
      l.entry_number || '—',
      `"${(l.description || '').replace(/"/g, '""')}"`,
      l.debit.toFixed(2),
      l.credit.toFixed(2),
      l.running_balance.toFixed(2),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `statement_${accountCode || 'account'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLines = (statement?.lines || []).filter((l) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (l.entry_number || '').toLowerCase().includes(term) ||
      (l.description || '').toLowerCase().includes(term)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `كشف حركة الحساب التحليلي: ${accountCode} - ${accountName}` : `Account Statement Ledger: ${accountCode} - ${accountName}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Account Info & Summary Cards */}
        {statement && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'نوع وطبيعة الحساب' : 'Account Type'}</span>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="neutral">{statement.account.category}</Badge>
                <Badge variant={statement.account.type === 'asset' || statement.account.type === 'expense' ? 'info' : 'warning'}>
                  {statement.account.type}
                </Badge>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي الحركات المدينة' : 'Total Debits'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{Number(statement.summary.total_debit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{isAr ? 'إجمالي الحركات الدائنة' : 'Total Credits'}</span>
              <div className="mt-1 flex items-center gap-1 font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>{Number(statement.summary.total_credit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
              </div>
            </Card>

            <Card className="p-3 bg-primary/10 dark:bg-primary/20 border border-primary/30">
              <span className="text-[11px] text-primary dark:text-[#fca5a5] block font-medium">{isAr ? 'الرصيد الختامي الحالي' : 'Closing Balance'}</span>
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
                placeholder={isAr ? 'بحث برقم القيد أو البيان...' : 'Search entry # or description...'}
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

        {/* Content Area */}
        {isLoading ? (
          <div className="p-4 space-y-2">
            <LoadingSkeleton count={5} />
          </div>
        ) : errorMsg ? (
          <ErrorState
            title={isAr ? 'خطأ في جلب كشف الحساب' : 'Error Loading Statement'}
            message={errorMsg}
            onRetry={fetchStatement}
          />
        ) : !statement || filteredLines.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-10 h-10 text-slate-400" />}
            title={isAr ? 'لا توجد حركات مقيدة لهذا الحساب' : 'No Transactions Recorded'}
            description={
              searchTerm || fromDate || toDate
                ? (isAr ? 'لم يتم العثور على حركات تطابق معايير الفلترة المحددة.' : 'No transactions matched the selected date or search filter.')
                : (isAr ? 'هذا الحساب لم يسجل عليه أي قيود يومية مرحلة بعد.' : 'No posted journal entries exist for this account yet.')
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'رقم القيد' : 'Entry #'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'البيان المحاسبي' : 'Description'}</th>
                  <th className="py-2.5 px-3 text-end">{isAr ? 'مدين (+)' : 'Debit (+)'}</th>
                  <th className="py-2.5 px-3 text-end">{isAr ? 'دائن (-)' : 'Credit (-)'}</th>
                  <th className="py-2.5 px-3 text-end font-bold">{isAr ? 'الرصيد التراكمي' : 'Running Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                {filteredLines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{line.entry_date || '—'}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{line.entry_number || '—'}</td>
                    <td className="py-2 px-3 font-sans text-slate-800 dark:text-slate-200 max-w-xs truncate" title={line.description}>
                      {line.description || '—'}
                    </td>
                    <td className="py-2 px-3 text-end text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                      {line.debit > 0 ? Number(line.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-end text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">
                      {line.credit > 0 ? Number(line.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="py-2 px-3 text-end font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {Number(line.running_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
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

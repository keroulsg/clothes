import React, { useState, useEffect } from 'react';
import { X, Printer, Calendar, Building2, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
import type { CostCenter } from '../../types';

interface CostCenterStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  costCenter: CostCenter | null;
  isAr?: boolean;
}

export const CostCenterStatementModal: React.FC<CostCenterStatementModalProps> = ({
  isOpen,
  onClose,
  costCenter,
  isAr = true,
}) => {
  const [statementData, setStatementData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadStatement = async () => {
    if (!costCenter) return;
    try {
      setLoading(true);
      const res = await api.accounting.getCostCenterStatement(costCenter.id, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatementData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && costCenter) {
      loadStatement();
    } else {
      setStatementData(null);
      setFromDate('');
      setToDate('');
    }
  }, [isOpen, costCenter]);

  if (!isOpen || !costCenter) return null;

  const handlePrint = () => {
    window.print();
  };

  const lines = statementData?.lines || [];
  const totalDebit = Number(statementData?.total_debit || 0);
  const totalCredit = Number(statementData?.total_credit || 0);
  const netExpense = Number(statementData?.net_expense || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-[#111217] border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'كشف الحساب التحليلي لمركز التكلفة' : 'Cost Center Analytical Statement'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {costCenter.code}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {costCenter.name} {costCenter.parent ? `(${isAr ? 'تابع لـ:' : 'Parent:'} ${costCenter.parent.name})` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-xl text-xs shadow-lg shadow-amber-900/20 flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة كشف الحساب' : 'Print Statement'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-white/5 bg-black/20 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'من تاريخ:' : 'From:'}</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <span>{isAr ? 'إلى تاريخ:' : 'To:'}</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
            <button
              onClick={loadStatement}
              disabled={loading}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 text-neutral-200 rounded-lg font-bold flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {isAr ? 'تصفية' : 'Filter'}
            </button>
          </div>

          <div className="text-xs text-neutral-400">
            {isAr ? 'عدد العمليات المسجلة:' : 'Records count:'}{' '}
            <span className="font-bold text-amber-400 font-mono">{lines.length}</span>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 sm:p-8 space-y-6 text-neutral-200 bg-[#0c0d12] print:bg-white print:text-black print:p-6" dir="rtl">
          {/* Header */}
          <div className="border-b-2 border-amber-500/30 pb-4 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black">مصنع البطل الروماني للملابس الجاهزة</h1>
                <p className="text-xs text-amber-400 print:text-neutral-700 font-semibold">
                  {isAr ? 'كشف تفصيلي بتحليلات تكاليف مركز النشاط' : 'Cost Center Expense Breakdown'}
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-0.5">
              <div className="text-neutral-400 print:text-neutral-600">
                كود المركز: <span className="font-bold text-white print:text-black font-mono">{costCenter.code}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                اسم المركز: <span className="font-bold text-white print:text-black">{costCenter.name}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                التاريخ: <span className="font-mono">{new Date().toLocaleDateString('ar-EG')}</span>
              </div>
            </div>
          </div>

          {/* 3 KPI Summary Blocks */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-center">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">
                {isAr ? 'إجمالي المصروفات المحملة (مدين)' : 'Total Debited Expenses'}
              </div>
              <div className="text-base font-black font-mono text-amber-400 print:text-black mt-1">
                {totalDebit.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-center">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">
                {isAr ? 'التسويات والاسترداد (دائن)' : 'Credits & Adjustments'}
              </div>
              <div className="text-base font-black font-mono text-neutral-300 print:text-black mt-1">
                {totalCredit.toLocaleString()} ج.م
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-center">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">
                {isAr ? 'صافي التكلفة الفعلية المحملة' : 'Net Allocated Cost'}
              </div>
              <div className="text-base font-black font-mono text-primary print:text-black mt-1">
                {netExpense.toLocaleString()} ج.م
              </div>
            </div>
          </div>

          {/* Statement Table */}
          <div className="border border-white/10 print:border-neutral-300 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                <tr>
                  <th className="py-2 px-3">التاريخ</th>
                  <th className="py-2 px-3">رقم القيد / المرجع</th>
                  <th className="py-2 px-3">الحساب المحاسبي</th>
                  <th className="py-2 px-3">البيان والشرح</th>
                  <th className="py-2 px-3 text-left">مدين (مصروف)</th>
                  <th className="py-2 px-3 text-left">دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                {lines.length > 0 ? (
                  lines.map((l: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-2 px-3 font-mono text-neutral-300 print:text-black">
                        {formatCleanDate(l.journal_entry?.entry_date || l.created_at)}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-400 print:text-black">
                        {l.journal_entry?.entry_number || '-'}
                      </td>
                      <td className="py-2 px-3 font-medium text-white print:text-black">
                        {l.account ? `[${l.account.code}] ${l.account.name}` : '-'}
                      </td>
                      <td className="py-2 px-3 text-neutral-300 print:text-neutral-700">
                        {l.description || l.journal_entry?.description || '-'}
                      </td>
                      <td className="py-2 px-3 text-left font-mono font-bold text-amber-400 print:text-black">
                        {Number(l.debit) > 0 ? `${Number(l.debit).toLocaleString()} ج.م` : '-'}
                      </td>
                      <td className="py-2 px-3 text-left font-mono text-neutral-400 print:text-neutral-600">
                        {Number(l.credit) > 0 ? `${Number(l.credit).toLocaleString()} ج.م` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-neutral-500 text-xs">
                      {isAr
                        ? 'لم يتم تسجيل أي قيود أو مصاريف محملة على هذا المركز حتى الآن.'
                        : 'No expenses recorded for this cost center yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-white/5 print:bg-neutral-100 font-bold border-t border-white/10 print:border-neutral-300 text-xs">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right">
                    {isAr ? 'الإجمالي الصافي المحمل على المركز:' : 'Net Total Cost:'}
                  </td>
                  <td className="py-2 px-3 text-left font-mono text-amber-300 print:text-black font-bold">
                    {netExpense.toLocaleString()} ج.م
                  </td>
                  <td className="py-2 px-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Footer note in print */}
          <div className="pt-4 border-t border-white/10 print:border-black text-center text-[11px] text-neutral-500 print:text-neutral-600">
            نظام GarmentOS لإدارة مصانع الملابس الجاهزة • وحدة محاسبة التكاليف الصناعية
          </div>
        </div>
      </div>
    </div>
  );
};

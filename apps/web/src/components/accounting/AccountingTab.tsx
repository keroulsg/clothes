import React, { useState, useEffect } from 'react';
import {
  Receipt,
  DollarSign,
  CheckCircle,
  Plus,
  Scale,
  PieChart,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';

import type { Language, ChartOfAccount, JournalEntry, ProductionCostSheet } from '../../types';

interface AccountingTabProps {
  lang: Language;
}

export const AccountingTab: React.FC<AccountingTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'journals' | 'vouchers' | 'costing'>('accounts');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [costSheets, setCostSheets] = useState<ProductionCostSheet[]>([]);

  // Load accounting data from server
  const loadAccountingData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [accsRes, journalsRes, costSheetsRes] = await Promise.allSettled([
        api.accounting.getAccounts(),
        api.accounting.getJournalEntries(1),
        api.accounting.getCostSheets(1),
      ]);

      if (accsRes.status === 'fulfilled' && Array.isArray(accsRes.value)) {
        setAccounts(accsRes.value);
      }
      if (journalsRes.status === 'fulfilled' && journalsRes.value?.data) {
        setJournals(journalsRes.value.data);
      }
      if (costSheetsRes.status === 'fulfilled' && costSheetsRes.value?.data) {
        setCostSheets(costSheetsRes.value.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب البيانات المحاسبية' : 'Failed to load accounting data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountingData();
  }, []);

  // Modal State for New Balanced Journal Entry
  const [newDesc, setNewDesc] = useState('');
  const [debitAcc, setDebitAcc] = useState('1010');
  const [creditAcc, setCreditAcc] = useState('4010');
  const [entryAmount, setEntryAmount] = useState<number>(5000);

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      // Find matching accounts
      const debitAccount = accounts.find((a) => a.code === debitAcc || a.id === debitAcc);
      const creditAccount = accounts.find((a) => a.code === creditAcc || a.id === creditAcc);

      const debitId = debitAccount ? debitAccount.id : debitAcc;
      const creditId = creditAccount ? creditAccount.id : creditAcc;

      const res = await api.accounting.createJournalEntry({
        description: newDesc || (isAr ? 'قيد تسوية عام' : 'General Adjustment Entry'),
        entry_date: new Date().toISOString().split('T')[0],
        lines: [
          { account_id: debitId, debit: entryAmount, credit: 0, description: newDesc },
          { account_id: creditId, debit: 0, credit: entryAmount, description: newDesc },
        ],
      });

      if (res?.entry) {
        setJournals((prev) => [res.entry, ...prev]);
      }
      setIsJournalModalOpen(false);
      setNewDesc('');
      // Reload accounts balances
      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ قيد اليومية' : 'Failed to post journal entry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={loadAccountingData} className="text-xs py-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل البيانات المحاسبية...' : 'Loading accounting records...'}</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي الأصول المتداولة والنقدية' : 'Total Current Assets & Cash'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">752,000 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'خزينة + بنوك + مخزون + عملاء' : 'Cash + Bank + Stock + AR'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إيرادات المبيعات المحققة' : 'Garment Sales Revenue'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">290,000 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'جملة + قطاعي منفذ المصنع' : 'Wholesale + Outlet POS'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'التكاليف المباشرة (خامات وأجور)' : 'Direct Production Costs'}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">217,000 ج.م</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'قماش 175k + أجور قطعة 42k' : 'Fabric 175k + Labor 42k'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'مجمل الربح الصناعي التقديري' : 'Gross Manufacturing Profit'}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">73,000 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'هامش ربح صناعي 25.1%' : '25.1% Gross Margin'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('accounts')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'accounts'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'شجرة الحسابات (COA)' : 'Chart of Accounts'}
          </button>
          <button
            onClick={() => setActiveSubTab('journals')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'journals'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'قيود اليومية العامة (Double-Entry)' : 'Journal Entries'}
          </button>
          <button
            onClick={() => setActiveSubTab('costing')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'costing'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'بطاقات التكلفة الصناعية للقطعة' : 'Cost Sheets'}
          </button>
        </div>

        {activeSubTab === 'journals' && (
          <Button size="sm" onClick={() => setIsJournalModalOpen(true)}>
            <Plus className="w-4 h-4 me-1" />
            {isAr ? 'إضافة قيد يومية متوازن' : 'New Journal Entry'}
          </Button>
        )}
      </div>

      {/* CHART OF ACCOUNTS VIEW */}
      {activeSubTab === 'accounts' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'شجرة الحسابات المعتمدة لمصنع الملابس والتشغيل' : 'Apparel Manufacturing Chart of Accounts'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">15 Standard Industrial Accounts</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود الحساب' : 'Account Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع الرئيسي' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'التصنيف الصناعي' : 'Category'}</th>
                  <th className="p-3 text-end">{isAr ? 'الرصيد الدفتري الحالي' : 'Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{acc.code}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{acc.name}</td>
                    <td className="p-3 capitalize">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        acc.type === 'asset' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                        acc.type === 'liability' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                        acc.type === 'revenue' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{acc.category.replace('_', ' ')}</td>
                    <td className="p-3 text-end font-bold text-slate-900 dark:text-white">
                      {acc.current_balance.toLocaleString()} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* JOURNALS VIEW */}
      {activeSubTab === 'journals' && (
        <div className="space-y-4">
          {journals.map((j) => (
            <Card key={j.id} className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary text-sm">{j.entry_number}</span>
                  <span className="text-xs text-slate-400">{j.entry_date}</span>
                  <Badge variant="success">{j.status.toUpperCase()}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-slate-900 dark:text-white">
                  <span>{isAr ? 'المدين:' : 'Debit:'} {j.total_debit.toLocaleString()} ج.م</span>
                  <span>=</span>
                  <span>{isAr ? 'الدائن:' : 'Credit:'} {j.total_credit.toLocaleString()} ج.م</span>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 py-2">{j.description}</p>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2 text-xs divide-y divide-slate-200/50 dark:divide-slate-700/50">
                {j.lines?.map((line, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">{line.description}</span>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        {line.debit > 0 ? `+${line.debit.toLocaleString()} ج.م` : '-'}
                      </span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                        {line.credit > 0 ? `-${line.credit.toLocaleString()} ج.م` : '-'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* COSTING VIEW */}
      {activeSubTab === 'costing' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'بطاقات التكلفة الصناعية الفعلية للقطعة (Cost Sheets)' : 'Actual Production Costing Breakdown'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'أمر الإنتاج' : 'PO #'}</th>
                  <th className="p-3 text-start">{isAr ? 'الكمية التامة' : 'Pieces'}</th>
                  <th className="p-3 text-start">{isAr ? 'تكلفة الخامات' : 'Materials'}</th>
                  <th className="p-3 text-start">{isAr ? 'أجور القطعة' : 'Direct Labor'}</th>
                  <th className="p-3 text-start">{isAr ? 'المصاريف غير المباشرة' : 'Overheads'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                  <th className="p-3 text-end">{isAr ? 'تكلفة القطعة الواحدة' : 'Cost / Piece'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {costSheets.map((cs) => (
                  <tr key={cs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{cs.production_order_id}</td>
                    <td className="p-3 font-bold">{cs.total_produced_pieces.toLocaleString()}</td>
                    <td className="p-3">{cs.direct_materials_cost.toLocaleString()} ج.م</td>
                    <td className="p-3">{cs.direct_labor_cost.toLocaleString()} ج.م</td>
                    <td className="p-3">{cs.allocated_overhead_cost.toLocaleString()} ج.م</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{cs.total_cost.toLocaleString()} ج.م</td>
                    <td className="p-3 text-end font-bold text-primary text-base">
                      {cs.cost_per_piece.toFixed(2)} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Balanced Journal Entry Modal */}
      <Modal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        title={isAr ? 'تسجيل قيد محاسبي مزدوج متوازن' : 'Record Balanced Double-Entry Journal'}
      >

        <form onSubmit={handleCreateJournal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'شرح القيد المحاسبي' : 'Description'}
            </label>
            <input
              type="text"
              required
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder={isAr ? 'مثال: إثبات سداد دفعة مورد نقداً' : 'e.g. Supplier payment in cash'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                {isAr ? 'الطرف المدين (Debit)' : 'Debit Account'}
              </label>
              <select
                value={debitAcc}
                onChange={(e) => setDebitAcc(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                {isAr ? 'الطرف الدائن (Credit)' : 'Credit Account'}
              </label>
              <select
                value={creditAcc}
                onChange={(e) => setCreditAcc(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.code}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المبلغ (جنيه مصري)' : 'Amount (EGP)'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={entryAmount}
              onChange={(e) => setEntryAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-500 flex items-center justify-between">
            <span>{isAr ? 'فحص توازن القيد:' : 'Double-Entry Balance Check:'}</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> {isAr ? 'متوازن 100%' : '100% Balanced'}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsJournalModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الترحيل...' : 'Posting...'}
                </>
              ) : (
                isAr ? 'ترحيل القيد' : 'Post Journal'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

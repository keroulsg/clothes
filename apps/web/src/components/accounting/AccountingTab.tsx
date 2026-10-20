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
  FileCheck,
  Calculator,
  Printer,
  Eye,
  BookOpen,
  RotateCw,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { api } from '../../api/client';
import type { Language, ChartOfAccount, JournalEntry, ProductionCostSheet, PaymentVoucher } from '../../types';

interface AccountingTabProps {
  lang: Language;
}

export const AccountingTab: React.FC<AccountingTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'journals' | 'vouchers' | 'costing'>('accounts');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isCalcCostModalOpen, setIsCalcCostModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [costSheets, setCostSheets] = useState<ProductionCostSheet[]>([]);

  // Load accounting data from server
  const loadAccountingData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [accsRes, journalsRes, vouchersRes, costSheetsRes] = await Promise.allSettled([
        api.accounting.getAccounts(),
        api.accounting.getJournalEntries(1),
        api.accounting.getPaymentVouchers(1),
        api.accounting.getCostSheets(1),
      ]);

      if (accsRes.status === 'fulfilled' && Array.isArray(accsRes.value)) {
        setAccounts(accsRes.value);
      }
      if (journalsRes.status === 'fulfilled' && journalsRes.value?.data) {
        setJournals(journalsRes.value.data);
      }
      if (vouchersRes.status === 'fulfilled' && vouchersRes.value?.data) {
        setVouchers(vouchersRes.value.data);
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
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');
  const [entryAmount, setEntryAmount] = useState<number>(5000);

  useEffect(() => {
    if (accounts.length > 1 && !debitAcc) {
      const assetAcc = accounts.find((a) => a.type === 'asset');
      const revOrLiabAcc = accounts.find((a) => a.type === 'revenue' || a.type === 'liability');
      setDebitAcc(assetAcc ? assetAcc.id : accounts[0].id);
      setCreditAcc(revOrLiabAcc ? revOrLiabAcc.id : accounts[1].id);
    }
  }, [accounts, debitAcc]);

  // Modal State for Payment Voucher
  const [voucherType, setVoucherType] = useState<'receipt' | 'payment'>('receipt');
  const [voucherPartyType, setVoucherPartyType] = useState<'customer' | 'supplier' | 'employee' | 'other'>('customer');
  const [voucherPartyName, setVoucherPartyName] = useState('');
  const [voucherAccountId, setVoucherAccountId] = useState('');
  const [voucherAmount, setVoucherAmount] = useState<number>(2500);
  const [voucherMethod, setVoucherMethod] = useState<'cash' | 'bank_transfer' | 'card' | 'check'>('cash');
  const [voucherNotes, setVoucherNotes] = useState('');

  // Cost calculation state
  const [calcOrderId, setCalcOrderId] = useState('');

  const handleCreateJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryAmount <= 0 || !debitAcc || !creditAcc) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.accounting.createJournalEntry({
        description: newDesc || (isAr ? 'قيد تسوية عام' : 'General Adjustment Entry'),
        entry_date: new Date().toISOString().split('T')[0],
        lines: [
          { account_id: debitAcc, debit: entryAmount, credit: 0, description: newDesc },
          { account_id: creditAcc, debit: 0, credit: entryAmount, description: newDesc },
        ],
      });

      if (res?.entry) {
        setJournals((prev) => [res.entry, ...prev]);
      } else {
        await loadAccountingData();
      }
      setIsJournalModalOpen(false);
      setNewDesc('');
      setSuccessMsg(isAr ? 'تم ترحيل قيد اليومية بنجاح وتحديث أرصدة الحسابات' : 'Journal entry posted successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

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

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherPartyName || voucherAmount <= 0) return;

    const targetAccId = voucherAccountId || accounts.find((a) => a.type === 'asset')?.id || accounts[0]?.id;
    if (!targetAccId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.accounting.createPaymentVoucher({
        voucher_type: voucherType,
        party_type: voucherPartyType,
        party_name: voucherPartyName,
        account_id: targetAccId,
        amount: voucherAmount,
        payment_method: voucherMethod,
        voucher_date: new Date().toISOString().split('T')[0],
        notes: voucherNotes || undefined,
      });

      if (res?.voucher) {
        setVouchers((prev) => [res.voucher, ...prev]);
      } else {
        await loadAccountingData();
      }
      setIsVoucherModalOpen(false);
      setVoucherPartyName('');
      setVoucherNotes('');
      setSuccessMsg(isAr ? 'تم إصدار السند المالي بنجاح' : 'Payment voucher issued successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

      // Reload accounts balances
      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل السند المالي' : 'Failed to create payment voucher'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateCost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcOrderId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.accounting.calculateCost(calcOrderId);
      if (res?.cost_sheet) {
        setCostSheets((prev) => [res.cost_sheet, ...prev.filter((cs) => cs.id !== res.cost_sheet.id)]);
      } else {
        await loadAccountingData();
      }
      setIsCalcCostModalOpen(false);
      setCalcOrderId('');
      setSuccessMsg(isAr ? 'تم احتساب التكلفة الفعلية لأمر الإنتاج بنجاح' : 'Production cost sheet calculated successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل احتساب التكلفة' : 'Failed to calculate production cost'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real server-backed dynamic calculations
  const totalAssets = accounts
    .filter((a) => a.type === 'asset')
    .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const totalRevenues = accounts
    .filter((a) => a.type === 'revenue')
    .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const directExpenses = accounts
    .filter((a) => a.type === 'expense')
    .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);

  const grossProfit = totalRevenues - directExpenses;
  const grossMarginPct = totalRevenues > 0 ? ((grossProfit / totalRevenues) * 100).toFixed(1) : '0.0';

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

      {successMsg && (
        <div className="p-3 mb-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل البيانات المحاسبية...' : 'Loading accounting records...'}</span>
        </div>
      )}

      {/* Dynamic Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي الأصول المتداولة والنقدية' : 'Total Current Assets & Cash'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalAssets.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {accounts.filter((a) => a.type === 'asset').length} {isAr ? 'حسابات أصول نشطة' : 'active asset accounts'}
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
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalRevenues.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'أرصدة قيود الإيرادات الدفترية' : 'Ledger revenue accounts'}
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
                {isAr ? 'التكاليف والمصروفات المباشرة' : 'Direct Expenses & Cost'}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {directExpenses.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {costSheets.length} {isAr ? 'أوامر إنتاج محسوبة' : 'costed orders'}
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
                {isAr ? 'صافي الربح الدفتري' : 'Net Book Profit'}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {grossProfit.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? `هامش ربح ${grossMarginPct}%` : `${grossMarginPct}% profit margin`}
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
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'شجرة الحسابات (COA)' : 'Chart of Accounts'}
          </button>
          <button
            onClick={() => setActiveSubTab('journals')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'journals'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'قيود اليومية العامة (Double-Entry)' : 'Journal Entries'}
          </button>
          <button
            onClick={() => setActiveSubTab('vouchers')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'vouchers'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'سندات الصرف والقبض' : 'Payment Vouchers'}
          </button>
          <button
            onClick={() => setActiveSubTab('costing')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'costing'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'بطاقات التكلفة الصناعية للقطعة' : 'Cost Sheets'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'journals' && (
            <Button size="sm" onClick={() => setIsJournalModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'إضافة قيد يومية متوازن' : 'New Journal Entry'}
            </Button>
          )}
          {activeSubTab === 'vouchers' && (
            <Button size="sm" onClick={() => setIsVoucherModalOpen(true)}>
              <FileCheck className="w-4 h-4 me-1" />
              {isAr ? 'إصدار سند مالي' : 'New Voucher'}
            </Button>
          )}
          {activeSubTab === 'costing' && (
            <Button size="sm" onClick={() => setIsCalcCostModalOpen(true)}>
              <Calculator className="w-4 h-4 me-1" />
              {isAr ? 'احتساب تكلفة أمر إنتاج' : 'Calculate Cost'}
            </Button>
          )}
        </div>
      </div>

      {/* CHART OF ACCOUNTS VIEW */}
      {activeSubTab === 'accounts' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'شجرة الحسابات المعتمدة لمصنع الملابس والتشغيل' : 'Apparel Manufacturing Chart of Accounts'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {accounts.length} {isAr ? 'حساب معتمد' : 'Accounts Configured'}
            </span>
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
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
                      {Number(acc.current_balance).toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-center">
                      <ActionsMenu
                        variant="icon-horizontal"
                        align={isAr ? 'left' : 'right'}
                        items={[
                          {
                            id: 'ledger',
                            label: isAr ? 'كشف حركة الحساب' : 'Account Ledger',
                            icon: <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
                            onClick: () => {
                              alert(isAr ? `كشف حساب تحليلي: ${acc.code} - ${acc.name}\nالرصيد: ${Number(acc.current_balance).toLocaleString()} ج.م` : `Ledger for ${acc.name}: ${Number(acc.current_balance).toLocaleString()} EGP`);
                            },
                          },
                          {
                            id: 'adj',
                            label: isAr ? 'إجراء قيد تسوية' : 'Adjustment Entry',
                            icon: <Scale className="w-3.5 h-3.5 text-primary" />,
                            onClick: () => {
                              setDebitAcc(acc.id);
                              setNewDesc(isAr ? `قيد تسوية لحساب ${acc.name}` : `Adjustment entry for ${acc.name}`);
                              setIsJournalModalOpen(true);
                            },
                          },
                        ]}
                      />
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
          {journals.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
              {isAr ? 'لا توجد قيود يومية مسجلة حالياً' : 'No journal entries found'}
            </Card>
          ) : (
            journals.map((j) => (
              <Card key={j.id} className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-primary text-sm">{j.entry_number}</span>
                    <span className="text-xs text-slate-400">{j.entry_date}</span>
                    <Badge variant="success">{j.status.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{isAr ? 'المدين:' : 'Debit:'} {Number(j.total_debit).toLocaleString()} ج.م</span>
                    <span>=</span>
                    <span>{isAr ? 'الدائن:' : 'Credit:'} {Number(j.total_credit).toLocaleString()} ج.م</span>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <ActionsMenu
                      variant="icon-horizontal"
                      align={isAr ? 'left' : 'right'}
                      items={[
                        {
                          id: 'print-journal',
                          label: isAr ? 'طباعة سند القيد اليومي' : 'Print Journal Voucher',
                          icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                          onClick: () => window.print(),
                        },
                        {
                          id: 'copy-num',
                          label: isAr ? 'نسخ رقم القيد' : 'Copy Entry #',
                          icon: <Eye className="w-3.5 h-3.5 text-slate-500" />,
                          onClick: () => {
                            navigator.clipboard?.writeText(j.entry_number);
                            setSuccessMsg(isAr ? `تم نسخ رقم القيد: ${j.entry_number}` : `Copied entry #${j.entry_number}`);
                            setTimeout(() => setSuccessMsg(null), 3000);
                          },
                        },
                      ]}
                    />
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 py-2">{j.description}</p>
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2 text-xs divide-y divide-slate-200/50 dark:divide-slate-700/50">
                  {j.lines?.map((line, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300">
                        {line.account ? `${line.account.code} - ${line.account.name}` : line.description || 'Account line'}
                      </span>
                      <div className="flex items-center gap-6">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {Number(line.debit) > 0 ? `+${Number(line.debit).toLocaleString()} ج.م` : '-'}
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {Number(line.credit) > 0 ? `-${Number(line.credit).toLocaleString()} ج.م` : '-'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* VOUCHERS VIEW */}
      {activeSubTab === 'vouchers' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل سندات الصرف والقبض المالية' : 'Receipt & Payment Vouchers Register'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'رقم السند' : 'Voucher #'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'الطرف المستفيد / المسدد' : 'Party Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'طريقة السداد' : 'Payment Method'}</th>
                  <th className="p-3 text-start">{isAr ? 'المبلغ' : 'Amount'}</th>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'البيان' : 'Notes'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سندات مالية مسجلة' : 'No payment vouchers found'}
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-slate-900 dark:text-white">{v.voucher_number}</td>
                      <td className="p-3">
                        <Badge variant={v.voucher_type === 'receipt' ? 'success' : 'warning'}>
                          {v.voucher_type === 'receipt' ? (isAr ? 'سند قبض' : 'Receipt') : (isAr ? 'سند صرف' : 'Payment')}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">
                        {v.party_name}
                        <span className="text-xs text-slate-400 block capitalize">{v.party_type}</span>
                      </td>
                      <td className="p-3 capitalize">{v.payment_method?.replace('_', ' ')}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {Number(v.amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-slate-500">{v.voucher_date}</td>
                      <td className="p-3 text-slate-500 text-xs">{v.notes || '—'}</td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-voucher',
                              label: isAr ? 'طباعة السند المالي' : 'Print Voucher',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {costSheets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد بطاقات تكلفة مسجلة' : 'No cost sheets recorded'}
                    </td>
                  </tr>
                ) : (
                  costSheets.map((cs) => (
                    <tr key={cs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{cs.production_order_id}</td>
                      <td className="p-3 font-bold">{Number(cs.total_produced_pieces).toLocaleString()}</td>
                      <td className="p-3">{Number(cs.direct_materials_cost).toLocaleString()} ج.م</td>
                      <td className="p-3">{Number(cs.direct_labor_cost).toLocaleString()} ج.م</td>
                      <td className="p-3">{Number(cs.allocated_overhead_cost).toLocaleString()} ج.م</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{Number(cs.total_cost).toLocaleString()} ج.م</td>
                      <td className="p-3 text-end font-bold text-primary text-base">
                        {Number(cs.cost_per_piece).toFixed(2)} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'print-cost',
                              label: isAr ? 'طباعة بطاقة التكلفة' : 'Print Cost Sheet',
                              icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => window.print(),
                            },
                            {
                              id: 'recalc',
                              label: isAr ? 'إعادة احتساب التكلفة' : 'Recalculate Cost',
                              icon: <RotateCw className="w-3.5 h-3.5 text-blue-500" />,
                              onClick: async () => {
                                try {
                                  setIsLoading(true);
                                  await api.accounting.calculateCost(cs.production_order_id);
                                  await loadAccountingData();
                                  setSuccessMsg(isAr ? 'تمت إعادة احتساب التكلفة بنجاح' : 'Cost recalculated successfully');
                                  setTimeout(() => setSuccessMsg(null), 3000);
                                } catch (e: any) {
                                  setErrorMsg(e?.message || 'Calculation failed');
                                } finally {
                                  setIsLoading(false);
                                }
                              },
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
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
                  <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
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
                  <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
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

      {/* Payment Voucher Modal */}
      <Modal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title={isAr ? 'إصدار سند مالي (صرف / قبض)' : 'Issue Payment Voucher'}
      >
        <form onSubmit={handleCreateVoucher} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع السند *' : 'Voucher Type *'}
              </label>
              <select
                value={voucherType}
                onChange={(e) => setVoucherType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="receipt">{isAr ? 'سند قبض (Receipt)' : 'Receipt'}</option>
                <option value="payment">{isAr ? 'سند صرف (Payment)' : 'Payment'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع الطرف *' : 'Party Type *'}
              </label>
              <select
                value={voucherPartyType}
                onChange={(e) => setVoucherPartyType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="customer">{isAr ? 'عميل' : 'Customer'}</option>
                <option value="supplier">{isAr ? 'مورد' : 'Supplier'}</option>
                <option value="employee">{isAr ? 'عامل / موظف' : 'Employee'}</option>
                <option value="other">{isAr ? 'أخرى' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الطرف المسدد / المستلم *' : 'Party Name *'}
            </label>
            <input
              type="text"
              required
              value={voucherPartyName}
              onChange={(e) => setVoucherPartyName(e.target.value)}
              placeholder={isAr ? 'مثال: شركة الأصيل للأقمشة' : 'e.g. Al-Aseel Fabrics'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الحساب المالي (الخزينة/البنك) *' : 'Account *'}
              </label>
              <select
                value={voucherAccountId}
                onChange={(e) => setVoucherAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                {accounts.filter((a) => a.type === 'asset').map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة السداد' : 'Method'}
              </label>
              <select
                value={voucherMethod}
                onChange={(e) => setVoucherMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="cash">{isAr ? 'نقداً (خزينة)' : 'Cash'}</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="check">{isAr ? 'شيك مصرفي' : 'Check'}</option>
                <option value="card">{isAr ? 'بطاقة إلكترونية' : 'Card'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المبلغ (جنيه مصري) *' : 'Amount (EGP) *'}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={voucherAmount}
              onChange={(e) => setVoucherAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات وبيان السند' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={voucherNotes}
              onChange={(e) => setVoucherNotes(e.target.value)}
              placeholder={isAr ? 'دفعة تحت الحساب لفاتورة توريد خامات...' : 'Advance payment against invoice...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsVoucherModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الإصدار...' : 'Issuing...'}
                </>
              ) : (
                isAr ? 'إصدار السند وترحيله' : 'Issue Voucher'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Calculate Cost Modal */}
      <Modal
        isOpen={isCalcCostModalOpen}
        onClose={() => setIsCalcCostModalOpen(false)}
        title={isAr ? 'احتساب التكلفة الصناعية الفعلية لأمر الإنتاج' : 'Calculate Production Order Cost'}
      >
        <form onSubmit={handleCalculateCost} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'معرف أمر الإنتاج (Production Order ID) *' : 'Production Order ID *'}
            </label>
            <input
              type="text"
              required
              value={calcOrderId}
              onChange={(e) => setCalcOrderId(e.target.value)}
              placeholder="e.g. PO-2026-001 or UUID"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <p className="text-xs text-slate-500">
            {isAr
              ? 'سيقوم النظام بجمع أثمان الخامات المصروفة + أجور القطعة لعمال الخياطة + تحميل المصاريف الصناعية غير المباشرة واحتساب تكلفة القطعة الواحدة بدقة 4 خانات عشرية.'
              : 'The system will aggregate material issuances + verified piece wages + allocated overheads to compute exact unit cost.'}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCalcCostModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الاحتساب...' : 'Calculating...'}
                </>
              ) : (
                isAr ? 'احتساب وترحيل بطاقة التكلفة' : 'Calculate & Record'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

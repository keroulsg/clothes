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
  RotateCw,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Lock,
  Unlock,
  ShieldCheck,
  FolderTree,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { api } from '../../api/client';
import { FinancialReportsView } from './FinancialReportsView';
import { AccountStatementModal } from './AccountStatementModal';
import { CalculateCostModal } from './CalculateCostModal';
import type {
  Language,
  ChartOfAccount,
  JournalEntry,
  ProductionCostSheet,
  PaymentVoucher,
  FinancialAccount,
  FinancialAccountTransfer,
  CostCenter,
  FiscalYear,
  FiscalPeriod,
  ReconciliationResult,
} from '../../types';

interface AccountingTabProps {
  lang: Language;
}

export const AccountingTab: React.FC<AccountingTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<
    'accounts' | 'journals' | 'financial_accounts' | 'reconciliation' | 'cost_centers' | 'fiscal_periods' | 'vouchers' | 'costing' | 'reports'
  >('accounts');

  // Modals visibility
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isCalcCostModalOpen, setIsCalcCostModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isFinancialAccModalOpen, setIsFinancialAccModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCostCenterModalOpen, setIsCostCenterModalOpen] = useState(false);
  const [isFiscalYearModalOpen, setIsFiscalYearModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [isPeriodReopenModalOpen, setIsPeriodReopenModalOpen] = useState(false);

  const [selectedAccountForStatement, setSelectedAccountForStatement] = useState<ChartOfAccount | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<{ type: 'journal' | 'transfer'; id: string; number: string } | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [selectedPeriodForReopen, setSelectedPeriodForReopen] = useState<FiscalPeriod | null>(null);
  const [periodReopenReason, setPeriodReopenReason] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Core Data Lists
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [costSheets, setCostSheets] = useState<ProductionCostSheet[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [transfers, setTransfers] = useState<FinancialAccountTransfer[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [arReconciliation, setArReconciliation] = useState<ReconciliationResult | null>(null);
  const [apReconciliation, setApReconciliation] = useState<ReconciliationResult | null>(null);

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

  const loadFinancialAccounts = async () => {
    try {
      const [accs, trfs] = await Promise.all([
        api.accounting.getFinancialAccounts(),
        api.accounting.getTransfers(1),
      ]);
      if (Array.isArray(accs)) setFinancialAccounts(accs);
      if (trfs?.data) setTransfers(trfs.data);
    } catch (err) {}
  };

  const loadCostCenters = async () => {
    try {
      const res = await api.accounting.getCostCenters();
      if (Array.isArray(res)) setCostCenters(res);
    } catch (err) {}
  };

  const loadFiscalYears = async () => {
    try {
      const res = await api.accounting.getFiscalYears();
      if (Array.isArray(res)) setFiscalYears(res);
    } catch (err) {}
  };

  const loadReconciliation = async () => {
    try {
      const [ar, ap] = await Promise.all([
        api.accounting.reconcileAR(),
        api.accounting.reconcileAP(),
      ]);
      setArReconciliation(ar);
      setApReconciliation(ap);
    } catch (err) {}
  };

  useEffect(() => {
    loadAccountingData();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'financial_accounts') loadFinancialAccounts();
    if (activeSubTab === 'cost_centers') loadCostCenters();
    if (activeSubTab === 'fiscal_periods') loadFiscalYears();
    if (activeSubTab === 'reconciliation') loadReconciliation();
  }, [activeSubTab]);

  // Modal State for New Balanced Journal Entry
  const [newDesc, setNewDesc] = useState('');
  const [debitAcc, setDebitAcc] = useState('');
  const [creditAcc, setCreditAcc] = useState('');
  const [entryAmount, setEntryAmount] = useState<number>(5000);
  const [entryCostCenter, setEntryCostCenter] = useState<string>('');

  useEffect(() => {
    if (accounts.length > 1 && !debitAcc) {
      const assetAcc = accounts.find((a) => a.type === 'asset' && a.is_postable !== false);
      const revOrLiabAcc = accounts.find((a) => (a.type === 'revenue' || a.type === 'liability') && a.is_postable !== false);
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

  // Modal State for New Account
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccNameEn, setNewAccNameEn] = useState('');
  const [newAccType, setNewAccType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  const [newAccCategory, setNewAccCategory] = useState('current_asset');
  const [newAccParentId, setNewAccParentId] = useState('');
  const [newAccIsPostable, setNewAccIsPostable] = useState(true);

  // Modal State for Financial Account (Vault/Bank)
  const [finAccCode, setFinAccCode] = useState('');
  const [finAccName, setFinAccName] = useState('');
  const [finAccType, setFinAccType] = useState<'cash' | 'bank' | 'wallet'>('cash');
  const [finAccCoaId, setFinAccCoaId] = useState('');
  const [finAccBankName, setFinAccBankName] = useState('');
  const [finAccNumber, setFinAccNumber] = useState('');
  const [finAccOpeningBal, setFinAccOpeningBal] = useState(0);

  // Modal State for Transfer
  const [trfFromAccId, setTrfFromAccId] = useState('');
  const [trfToAccId, setTrfToAccId] = useState('');
  const [trfAmount, setTrfAmount] = useState<number>(1000);
  const [trfNotes, setTrfNotes] = useState('');

  // Modal State for Cost Center
  const [ccCode, setCcCode] = useState('');
  const [ccName, setCcName] = useState('');
  const [ccDesc, setCcDesc] = useState('');

  // Modal State for Fiscal Year
  const [fyName, setFyName] = useState('السنة المالية ' + new Date().getFullYear());
  const [fyStart, setFyStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [fyEnd, setFyEnd] = useState(`${new Date().getFullYear()}-12-31`);

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
          { account_id: debitAcc, debit: entryAmount, credit: 0, description: newDesc, cost_center_id: entryCostCenter || undefined },
          { account_id: creditAcc, debit: 0, credit: entryAmount, description: newDesc },
        ],
      });

      if (res?.journal_entry) {
        setJournals((prev) => [res.journal_entry, ...prev]);
      } else {
        await loadAccountingData();
      }
      setIsJournalModalOpen(false);
      setNewDesc('');
      setSuccessMsg(isAr ? 'تم ترحيل قيد اليومية بنجاح وتحديث أرصدة الحسابات' : 'Journal entry posted successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ قيد اليومية' : 'Failed to post journal entry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (reversalTarget.type === 'journal') {
        await api.accounting.reverseJournalEntry(reversalTarget.id, reversalReason);
        setSuccessMsg(isAr ? 'تم عكس القيد المحاسبي بنجاح' : 'Journal entry reversed successfully');
        await loadAccountingData();
      } else {
        await api.accounting.reverseTransfer(reversalTarget.id, reversalReason);
        setSuccessMsg(isAr ? 'تم عكس التحويل المالي وإلغاء أثره بنجاح' : 'Transfer reversed successfully');
        await loadFinancialAccounts();
      }
      setIsReversalModalOpen(false);
      setReversalReason('');
      setReversalTarget(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إجراء العكس' : 'Reversal failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode || !newAccName) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.createAccount({
        code: newAccCode,
        name: newAccName,
        name_en: newAccNameEn || undefined,
        type: newAccType,
        category: newAccCategory,
        parent_id: newAccParentId || undefined,
        is_postable: newAccIsPostable,
      });

      setSuccessMsg(isAr ? 'تمت إضافة الحساب في دليل الحسابات بنجاح' : 'Account created successfully');
      setIsAccountModalOpen(false);
      setNewAccCode('');
      setNewAccName('');
      setNewAccNameEn('');
      await loadAccountingData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء الحساب' : 'Failed to create account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitDefaultCOA = async () => {
    if (!window.confirm(isAr ? 'هل تريد بالتأكيد تهيئة شجرة الحسابات الافتراضية وحسابات الربط لمصنع الملابس؟' : 'Initialize default standard Chart of Accounts?')) {
      return;
    }
    setIsLoading(true);
    try {
      await api.accounting.initDefaultAccounts();
      await loadAccountingData();
      setSuccessMsg(isAr ? 'تمت تهيئة دليل الحسابات بنجاح' : 'Chart of accounts initialized successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFinancialAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finAccCode || !finAccName || !finAccCoaId) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.createFinancialAccount({
        chart_of_account_id: finAccCoaId,
        code: finAccCode,
        name: finAccName,
        type: finAccType,
        bank_name: finAccBankName || undefined,
        account_number: finAccNumber || undefined,
        opening_balance: Number(finAccOpeningBal) || 0,
      });

      setSuccessMsg(isAr ? 'تم إنشاء الحساب المالي (خزينة/بنك) بنجاح' : 'Financial account created successfully');
      setIsFinancialAccModalOpen(false);
      setFinAccCode('');
      setFinAccName('');
      await loadFinancialAccounts();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء الحساب المالي' : 'Failed to create financial account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trfFromAccId || !trfToAccId || trfAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.createTransfer({
        from_financial_account_id: trfFromAccId,
        to_financial_account_id: trfToAccId,
        amount: Number(trfAmount),
        notes: trfNotes || undefined,
      });

      setSuccessMsg(isAr ? 'تم التحويل المالي الداخلي وترحيل القيد آلياً بنجاح' : 'Transfer completed and posted successfully');
      setIsTransferModalOpen(false);
      setTrfNotes('');
      await loadFinancialAccounts();
      await loadAccountingData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل التحويل المالي' : 'Transfer failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ccCode || !ccName) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.createCostCenter({
        code: ccCode,
        name: ccName,
        description: ccDesc || undefined,
      });

      setSuccessMsg(isAr ? 'تم إنشاء مركز التكلفة بنجاح' : 'Cost center created successfully');
      setIsCostCenterModalOpen(false);
      setCcCode('');
      setCcName('');
      setCcDesc('');
      await loadCostCenters();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء مركز التكلفة' : 'Failed to create cost center'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFiscalYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyName || !fyStart || !fyEnd) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.createFiscalYear({
        name: fyName,
        start_date: fyStart,
        end_date: fyEnd,
        periods_count: 12,
      });

      setSuccessMsg(isAr ? 'تم إنشاء السنة المالية والفترات الشهرية بنجاح' : 'Fiscal year created successfully');
      setIsFiscalYearModalOpen(false);
      await loadFiscalYears();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إنشاء السنة المالية' : 'Failed to create fiscal year'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClosePeriod = async (id: string) => {
    if (!window.confirm(isAr ? 'هل تريد إغلاق هذه الفترة المحاسبية ومنع الترحيل فيها؟' : 'Close this fiscal period?')) return;
    try {
      await api.accounting.closeFiscalPeriod(id);
      await loadFiscalYears();
      setSuccessMsg(isAr ? 'تم إغلاق الفترة المالية' : 'Period closed');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to close period');
    }
  };

  const handleReopenPeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodForReopen || !periodReopenReason.trim()) return;

    setIsSubmitting(true);
    try {
      await api.accounting.reopenFiscalPeriod(selectedPeriodForReopen.id, periodReopenReason);
      setSuccessMsg(isAr ? 'تمت إعادة فتح الفترة المالية وتسجيل التدقيق' : 'Period reopened successfully');
      setIsPeriodReopenModalOpen(false);
      setSelectedPeriodForReopen(null);
      setPeriodReopenReason('');
      await loadFiscalYears();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reopen period');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherPartyName || voucherAmount <= 0) return;

    const targetAccId = voucherAccountId || accounts.find((a) => a.type === 'asset' && a.is_postable !== false)?.id || accounts[0]?.id;
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
      setSuccessMsg(isAr ? 'تم إصدار السند المالي وترحيل القيد بنجاح' : 'Payment voucher issued and posted successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل السند المالي' : 'Failed to create payment voucher'));
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
      {/* ─── Ultra-Modern Hero Header & Control Center (#7F1625 & #000000) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#000000] via-[#180508] to-[#000000] border border-[#7F1625]/40 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#7F1625]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#9E2A3B]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7F1625]/30 border border-[#7F1625]/50 text-[#ff8ba0] text-xs font-bold tracking-wide backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-[#ff4d6d] animate-pulse" />
              {isAr ? 'الإدارة المالية والتكاليف الصناعية • قيود وأستاذ عام' : 'Financial Accounting & Industrial Costing • Active Ledger'}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#7F1625] flex items-center justify-center shadow-lg shadow-[#7F1625]/50">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              {isAr ? 'المالية والتكاليف الصناعية والأستاذ العام' : 'Financial Accounting & Costing'}
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              {isAr
                ? 'دليل الحسابات الشجري، القيود المتوازنة، الخزائن والبنوك، التحويلات، المطابقة، ومراكز التكلفة وبطاقات التكلفة الصناعية.'
                : 'Chart of accounts, general ledger, cash/banks, balanced vouchers, reconciliation, and industrial costing sheets.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsJournalModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/40 transition-all flex items-center gap-2 active:scale-95 border border-[#ff4d6d]/30"
            >
              <Plus className="w-4 h-4" />
              {isAr ? '+ قيد يومية متوازن' : '+ Journal Entry'}
            </button>
            <button
              onClick={() => setIsVoucherModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
            >
              <FileCheck className="w-4 h-4 text-[#ff8ba0]" />
              {isAr ? '+ سند مالي' : '+ Voucher'}
            </button>
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
              {isAr ? 'تحويل مالي' : 'Transfer'}
            </button>
            <button
              onClick={() => setIsCalcCostModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              {isAr ? 'احتساب تكلفة أمر' : 'Cost Order'}
            </button>
          </div>
        </div>
      </div>

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
        <div className="p-2.5 rounded-xl bg-[#7F1625]/10 border border-[#7F1625]/20 text-[#7F1625] dark:text-[#ff8ba0] text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل البيانات المحاسبية...' : 'Loading accounting records...'}</span>
        </div>
      )}

      {/* Dynamic Financial KPI Cards Bento-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-emerald-500 rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي الأصول والنقدية' : 'Total Assets & Cash'}
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 tracking-tight">
                {totalAssets.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-block">
                {accounts.filter((a) => a.type === 'asset').length} {isAr ? 'حسابات أصول معتمدة' : 'asset accounts'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#7F1625] rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'إيرادات المبيعات المحققة' : 'Garment Sales Revenue'}
              </p>
              <p className="text-2xl font-black text-[#7F1625] dark:text-[#ff8ba0] mt-1 tracking-tight">
                {totalRevenues.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 inline-block">
                {isAr ? 'أرصدة قيود الإيرادات' : 'Ledger revenue accounts'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#7F1625]/10 border border-[#7F1625]/20 flex items-center justify-center text-[#7F1625] dark:text-[#ff8ba0] group-hover:scale-110 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'التكاليف والمصروفات' : 'Direct Expenses & Cost'}
              </p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 tracking-tight">
                {directExpenses.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 inline-block">
                {costSheets.length} {isAr ? 'أوامر إنتاج محسوبة' : 'costed orders'}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-1.5 h-full bg-[#7F1625] rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {isAr ? 'صافي الربح الدفتري' : 'Net Book Profit'}
              </p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 tracking-tight">
                {grossProfit.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 inline-block">
                {isAr ? `هامش ربح ${grossMarginPct}%` : `${grossMarginPct}% profit margin`}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <PieChart className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Luxury Segmented Pill Tab Bar (#7F1625 & #000000) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-[#0a0204] rounded-2xl border border-slate-200/80 dark:border-[#2d080e]">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'accounts', labelAr: 'دليل الحسابات (COA)', labelEn: 'Chart of Accounts', count: accounts.length },
            { id: 'journals', labelAr: 'قيود اليومية العامة', labelEn: 'Journal Entries', count: journals.length },
            { id: 'financial_accounts', labelAr: 'الخزائن والبنوك والتحويلات', labelEn: 'Cash & Banks', count: financialAccounts.length },
            { id: 'reconciliation', labelAr: 'مطابقة الأستاذ (Reconciliation)', labelEn: 'Reconciliation', count: null },
            { id: 'cost_centers', labelAr: 'مراكز التكلفة', labelEn: 'Cost Centers', count: costCenters.length },
            { id: 'fiscal_periods', labelAr: 'السنوات والفترات المالية', labelEn: 'Fiscal Periods', count: fiscalYears.length },
            { id: 'vouchers', labelAr: 'سندات القبض والصرف', labelEn: 'Payment Vouchers', count: vouchers.length },
            { id: 'costing', labelAr: 'بطاقات التكلفة الصناعية', labelEn: 'Cost Sheets', count: costSheets.length },
            { id: 'reports', labelAr: 'التقارير والقوائم الختامية', labelEn: 'Financial Reports', count: null },
          ].map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#7F1625] text-white shadow-md shadow-[#7F1625]/30 font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
                }`}
              >
                <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                {tab.count !== null && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'accounts' && (
            <>
              <Button size="sm" variant="outline" onClick={handleInitDefaultCOA}>
                <FolderTree className="w-4 h-4 me-1" />
                {isAr ? 'تهيئة الدليل الافتراضي' : 'Init Default COA'}
              </Button>
              <Button size="sm" onClick={() => setIsAccountModalOpen(true)}>
                <Plus className="w-4 h-4 me-1" />
                {isAr ? '+ حساب جديد' : '+ New Account'}
              </Button>
            </>
          )}
          {activeSubTab === 'financial_accounts' && (
            <>
              <Button size="sm" variant="outline" onClick={() => setIsFinancialAccModalOpen(true)}>
                <Plus className="w-4 h-4 me-1" />
                {isAr ? '+ خزينة / بنك' : '+ Cash/Bank'}
              </Button>
              <Button size="sm" onClick={() => setIsTransferModalOpen(true)}>
                <ArrowRightLeft className="w-4 h-4 me-1" />
                {isAr ? 'تحويل مالي داخلي' : 'Internal Transfer'}
              </Button>
            </>
          )}
          {activeSubTab === 'cost_centers' && (
            <Button size="sm" onClick={() => setIsCostCenterModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? '+ مركز تكلفة جديد' : '+ Cost Center'}
            </Button>
          )}
          {activeSubTab === 'fiscal_periods' && (
            <Button size="sm" onClick={() => setIsFiscalYearModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? '+ سنة مالية جديدة' : '+ Fiscal Year'}
            </Button>
          )}
        </div>
      </div>

      {/* 1. CHART OF ACCOUNTS VIEW */}
      {activeSubTab === 'accounts' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'شجرة الحسابات الهرمية لمصنع الملابس والتشغيل' : 'Apparel Manufacturing Hierarchical Chart of Accounts'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {accounts.length} {isAr ? 'حساب مسجل' : 'Accounts'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود الحساب' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'المستوى' : 'Level'}</th>
                  <th className="p-3 text-start">{isAr ? 'النوع الرئيسي' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'قابلية الترحيل' : 'Postable'}</th>
                  <th className="p-3 text-end">{isAr ? 'الرصيد الدفتري الحالي' : 'Balance'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{acc.code}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white" style={{ paddingInlineStart: `${((acc.level || 1) - 1) * 20 + 12}px` }}>
                      {(acc.level || 1) > 1 && <span className="text-slate-400 me-1.5">└─</span>}
                      {acc.name}
                      {acc.name_en && <span className="text-xs text-slate-400 block font-normal">{acc.name_en}</span>}
                    </td>
                    <td className="p-3 font-mono text-xs">{acc.level || 1}</td>
                    <td className="p-3 capitalize">
                      <Badge
                        variant={
                          acc.type === 'asset'
                            ? 'success'
                            : acc.type === 'liability'
                            ? 'warning'
                            : acc.type === 'equity'
                            ? 'info'
                            : acc.type === 'revenue'
                            ? 'success'
                            : 'danger'
                        }
                      >
                        {acc.type}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {acc.is_postable !== false ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {isAr ? 'يقبل الترحيل' : 'Postable'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> {isAr ? 'حساب تجميعي' : 'Header'}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-end font-mono font-bold">
                      {Number(acc.current_balance).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="p-3 text-center">
                      <ActionsMenu
                        variant="icon-horizontal"
                        align={isAr ? 'left' : 'right'}
                        items={[
                          {
                            id: 'stmt',
                            label: isAr ? 'كشف حساب الأستاذ العام' : 'Account Statement',
                            icon: <Eye className="w-3.5 h-3.5 text-primary" />,
                            onClick: () => {
                              setSelectedAccountForStatement(acc);
                              setIsStatementModalOpen(true);
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

      {/* 2. JOURNALS VIEW */}
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
                    <Badge variant={j.status === 'reversed' ? 'danger' : 'success'}>
                      {j.status === 'reversed' ? (isAr ? 'معكوس ملغي' : 'REVERSED') : (isAr ? 'مرحل نهائي' : 'POSTED')}
                    </Badge>
                    {j.reversal_reason && (
                      <span className="text-xs text-rose-500 font-medium">({j.reversal_reason})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-900 dark:text-white">
                    <span>{isAr ? 'المدين:' : 'Debit:'} {Number(j.total_debit).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    <span>=</span>
                    <span>{isAr ? 'الدائن:' : 'Credit:'} {Number(j.total_credit).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
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
                        ...(j.status === 'posted' && !j.reversed_entry_id
                          ? [
                              {
                                id: 'reverse-journal',
                                label: isAr ? 'عكس القيد المحاسبي' : 'Reverse Journal Entry',
                                icon: <RotateCw className="w-3.5 h-3.5 text-rose-500" />,
                                onClick: () => {
                                  setReversalTarget({ type: 'journal', id: j.id, number: j.entry_number });
                                  setIsReversalModalOpen(true);
                                },
                              },
                            ]
                          : []),
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
                        {line.cost_center_id && <span className="text-primary font-mono text-[11px] ms-2">[مركز تكلفة]</span>}
                      </span>
                      <div className="flex items-center gap-6">
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {Number(line.debit) > 0 ? `+${Number(line.debit).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : '-'}
                        </span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {Number(line.credit) > 0 ? `-${Number(line.credit).toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : '-'}
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

      {/* 3. FINANCIAL ACCOUNTS (CASH & BANKS & TRANSFERS) */}
      {activeSubTab === 'financial_accounts' && (
        <div className="space-y-6">
          <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <h3 className="font-bold text-slate-900 dark:text-white mb-3">
              {isAr ? 'حسابات الخزائن والبنوك والمحافظ الإلكترونية' : 'Cash Desks & Bank Accounts'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {financialAccounts.map((fa) => (
                <div key={fa.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{fa.code}</span>
                      <Badge variant={fa.type === 'cash' ? 'success' : 'info'}>{fa.type.toUpperCase()}</Badge>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white mt-1">{fa.name}</p>
                    {fa.bank_name && <p className="text-xs text-slate-400">{fa.bank_name} {fa.account_number ? `(${fa.account_number})` : ''}</p>}
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-slate-400">{isAr ? 'الرصيد الفعلي' : 'Current Balance'}</p>
                    <p className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400">
                      {Number(fa.current_balance).toLocaleString()} {fa.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'سجل التحويلات المالية الداخلية بين الخزائن والبنوك' : 'Internal Funds Transfers Log'}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3 text-start">{isAr ? 'رقم التحويل' : 'Transfer #'}</th>
                    <th className="p-3 text-start">{isAr ? 'من حساب' : 'From Account'}</th>
                    <th className="p-3 text-start">{isAr ? 'إلى حساب' : 'To Account'}</th>
                    <th className="p-3 text-end">{isAr ? 'المبلغ المحول' : 'Amount'}</th>
                    <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {transfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        {isAr ? 'لا توجد تحويلات مالية مسجلة' : 'No transfers recorded'}
                      </td>
                    </tr>
                  ) : (
                    transfers.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-mono font-bold text-primary">{t.transfer_number}</td>
                        <td className="p-3 font-semibold">{t.from_account?.name || t.from_financial_account_id}</td>
                        <td className="p-3 font-semibold">{t.to_account?.name || t.to_financial_account_id}</td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          {Number(t.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 text-xs text-slate-400">{t.transfer_date}</td>
                        <td className="p-3 text-center">
                          <Badge variant={t.status === 'completed' ? 'success' : 'danger'}>
                            {t.status === 'completed' ? (isAr ? 'مكتمل ومرحل' : 'Completed') : (isAr ? 'ملغي معكوس' : 'Reversed')}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          {t.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-rose-500 hover:text-rose-600 text-xs py-1"
                              onClick={() => {
                                setReversalTarget({ type: 'transfer', id: t.id, number: t.transfer_number });
                                setIsReversalModalOpen(true);
                              }}
                            >
                              <RotateCw className="w-3.5 h-3.5 me-1" />
                              {isAr ? 'عكس التحويل' : 'Reverse'}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* 4. GENERAL LEDGER RECONCILIATION VIEW */}
      {activeSubTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AR Reconciliation */}
            <Card className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {isAr ? 'مطابقة مراقبة العملاء (AR Reconciliation)' : 'Accounts Receivable Reconciliation'}
                  </h4>
                </div>
                {arReconciliation && (
                  <Badge variant={arReconciliation.is_matched ? 'success' : 'danger'}>
                    {arReconciliation.is_matched ? (isAr ? 'متطابق 100%' : 'Matched') : (isAr ? 'يوجد انحراف' : 'Discrepancy')}
                  </Badge>
                )}
              </div>

              {arReconciliation && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isAr ? 'رصيد حساب المراقبة بالأستاذ (1110):' : 'GL Control Balance (1110):'}</span>
                    <span className="font-mono font-bold">{Number(arReconciliation.control_account.gl_balance).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isAr ? 'إجمالي كشوف العملاء الفرعية:' : 'Subledger Total:'}</span>
                    <span className="font-mono font-bold">{Number(arReconciliation.subledger_total).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 font-semibold">{isAr ? 'قيمة الفرق والانحراف:' : 'Variance Amount:'}</span>
                    <span className={`font-mono font-bold ${Math.abs(arReconciliation.variance) < 0.001 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {Number(arReconciliation.variance).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* AP Reconciliation */}
            <Card className="p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {isAr ? 'مطابقة مراقبة الموردين (AP Reconciliation)' : 'Accounts Payable Reconciliation'}
                  </h4>
                </div>
                {apReconciliation && (
                  <Badge variant={apReconciliation.is_matched ? 'success' : 'danger'}>
                    {apReconciliation.is_matched ? (isAr ? 'متطابق 100%' : 'Matched') : (isAr ? 'يوجد انحراف' : 'Discrepancy')}
                  </Badge>
                )}
              </div>

              {apReconciliation && (
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isAr ? 'رصيد حساب المراقبة بالأستاذ (2010):' : 'GL Control Balance (2010):'}</span>
                    <span className="font-mono font-bold">{Number(apReconciliation.control_account.gl_balance).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">{isAr ? 'إجمالي كشوف الموردين الفرعية:' : 'Subledger Total:'}</span>
                    <span className="font-mono font-bold">{Number(apReconciliation.subledger_total).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 font-semibold">{isAr ? 'قيمة الفرق والانحراف:' : 'Variance Amount:'}</span>
                    <span className={`font-mono font-bold ${Math.abs(apReconciliation.variance) < 0.001 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {Number(apReconciliation.variance).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* 5. COST CENTERS VIEW */}
      {activeSubTab === 'cost_centers' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'دليل مراكز التكلفة التحليلية للمصنع' : 'Analytical Cost Centers'}
            </h3>
            <span className="text-xs text-slate-500 font-mono">{costCenters.length} {isAr ? 'مركز' : 'Centers'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود المركز' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم مركز التكلفة' : 'Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'الوصف والنشاط' : 'Description'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {costCenters.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد مراكز تكلفة مسجلة' : 'No cost centers recorded'}
                    </td>
                  </tr>
                ) : (
                  costCenters.map((cc) => (
                    <tr key={cc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-3 font-mono font-bold text-primary">{cc.code}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{cc.name}</td>
                      <td className="p-3 text-xs text-slate-400">{cc.description || '—'}</td>
                      <td className="p-3 text-center">
                        <Badge variant="success">{isAr ? 'نشط' : 'Active'}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 6. FISCAL YEARS & PERIODS VIEW */}
      {activeSubTab === 'fiscal_periods' && (
        <div className="space-y-6">
          {fiscalYears.map((fy) => (
            <Card key={fy.id} className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base">{fy.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{fy.start_date} ── {fy.end_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={fy.status === 'open' ? 'success' : 'danger'}>
                    {fy.status === 'open' ? (isAr ? 'سنة مالية مفتوحة' : 'OPEN') : (isAr ? 'سنة مقفلة نهائياً' : 'CLOSED')}
                  </Badge>
                  {fy.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-rose-500 hover:text-rose-600 py-1"
                      onClick={async () => {
                        if (window.confirm(isAr ? 'هل تريد إغلاق السنة المالية وترحيل الأرباح والخسائر إلى الأرباح المحتجزة؟' : 'Close fiscal year?')) {
                          await api.accounting.closeFiscalYear(fy.id);
                          await loadFiscalYears();
                        }
                      }}
                    >
                      <Lock className="w-3.5 h-3.5 me-1" />
                      {isAr ? 'إقفال السنة السنوي' : 'Close Year'}
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
                {fy.periods?.map((p) => (
                  <div key={p.id} className={`p-3 rounded-lg border ${p.status === 'open' ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20' : 'border-slate-200 dark:border-slate-800 bg-slate-50/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">{p.name}</span>
                      <Badge variant={p.status === 'open' ? 'success' : 'danger'}>
                        {p.status === 'open' ? (isAr ? 'مفتوحة' : 'Open') : (isAr ? 'مقفلة' : 'Closed')}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{p.start_date} إلى {p.end_date}</p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      {p.status === 'open' ? (
                        <button
                          onClick={() => handleClosePeriod(p.id)}
                          className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          {isAr ? 'إغلاق الفترة' : 'Close'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPeriodForReopen(p);
                            setIsPeriodReopenModalOpen(true);
                          }}
                          className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                        >
                          <Unlock className="w-3 h-3" />
                          {isAr ? 'إعادة الفتح' : 'Reopen'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 7. VOUCHERS VIEW */}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سندات مالية مسجلة' : 'No payment vouchers found'}
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
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
                        {Number(v.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-slate-500">{v.voucher_date}</td>
                      <td className="p-3 text-slate-500 text-xs">{v.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 8. COSTING VIEW */}
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
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {costSheets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد بطاقات تكلفة مسجلة' : 'No cost sheets recorded'}
                    </td>
                  </tr>
                ) : (
                  costSheets.map((cs) => (
                    <tr key={cs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{cs.production_order_id}</td>
                      <td className="p-3 font-bold">{Number(cs.total_produced_pieces).toLocaleString()}</td>
                      <td className="p-3">{Number(cs.direct_materials_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="p-3">{Number(cs.direct_labor_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="p-3">{Number(cs.allocated_overhead_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{Number(cs.total_cost).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="p-3 text-end font-bold text-primary text-base">
                        {Number(cs.cost_per_piece).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                      </td>
                      <td className="p-3 text-center">
                        {cs.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isAr ? 'معتمدة نهائياً' : 'Approved & Locked'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5" />
                            {isAr ? 'مسودة محسوبة' : 'Calculated'}
                          </span>
                        )}
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
                            ...(cs.status !== 'approved'
                              ? [
                                  {
                                    id: 'approve-cost',
                                    label: isAr ? 'اعتماد نهائي وإقفال' : 'Approve & Lock',
                                    icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
                                    onClick: async () => {
                                      try {
                                        setIsLoading(true);
                                        await api.accounting.approveCostSheet(cs.id);
                                        await loadAccountingData();
                                        setSuccessMsg(isAr ? 'تم اعتماد بطاقة التكلفة الصناعية بنجاح' : 'Cost sheet approved successfully');
                                        setTimeout(() => setSuccessMsg(null), 3500);
                                      } catch (e: any) {
                                        setErrorMsg(e?.message || 'Approval failed');
                                      } finally {
                                        setIsLoading(false);
                                      }
                                    },
                                  },
                                ]
                              : []),
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

      {/* 9. FINANCIAL REPORTS VIEW */}
      {activeSubTab === 'reports' && (
        <FinancialReportsView lang={lang} />
      )}

      {/* MODALS */}

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
                {accounts.filter((a) => a.is_postable !== false).map((a) => (
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
                {accounts.filter((a) => a.is_postable !== false).map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name} ({a.type})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المبلغ (جنيه مصري)' : 'Amount (EGP)'}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={entryAmount}
                onChange={(e) => setEntryAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مركز التكلفة (اختياري)' : 'Cost Center (Optional)'}
              </label>
              <select
                value={entryCostCenter}
                onChange={(e) => setEntryCostCenter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">{isAr ? '-- بدون مركز تكلفة --' : '-- None --'}</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>{cc.code} - {cc.name}</option>
                ))}
              </select>
            </div>
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
              {isSubmitting ? (isAr ? 'جاري الترحيل...' : 'Posting...') : (isAr ? 'ترحيل القيد' : 'Post Journal')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reversal Reason Modal */}
      <Modal
        isOpen={isReversalModalOpen}
        onClose={() => setIsReversalModalOpen(false)}
        title={isAr ? `عكس وإلغاء: ${reversalTarget?.number || ''}` : `Reverse Transaction: ${reversalTarget?.number || ''}`}
      >
        <form onSubmit={handleReverseAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب العكس والإلغاء (مطلوب لأغراض الرقابة المالية) *' : 'Reversal Reason *'}
            </label>
            <textarea
              required
              rows={3}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder={isAr ? 'مثال: خطأ في تحديد قيمة الإيداع أو إدخال مكرر...' : 'e.g. Incorrect amount entered...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsReversalModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري العكس...' : 'Reversing...') : (isAr ? 'تأكيد العكس والتسوية' : 'Confirm Reversal')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Internal Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={isAr ? 'تحويل مالي داخلي بين الخزائن والبنوك' : 'Internal Funds Transfer'}
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'من الحساب المالي (المرسل) *' : 'From Financial Account *'}
            </label>
            <select
              required
              value={trfFromAccId}
              onChange={(e) => setTrfFromAccId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? '-- اختر الحساب المرسل --' : '-- Select From Account --'}</option>
              {financialAccounts.map((fa) => (
                <option key={fa.id} value={fa.id}>{fa.code} - {fa.name} (رصيد: {Number(fa.current_balance).toLocaleString()} {fa.currency})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'إلى الحساب المالي (المستلم) *' : 'To Financial Account *'}
            </label>
            <select
              required
              value={trfToAccId}
              onChange={(e) => setTrfToAccId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? '-- اختر الحساب المستلم --' : '-- Select To Account --'}</option>
              {financialAccounts.filter((fa) => fa.id !== trfFromAccId).map((fa) => (
                <option key={fa.id} value={fa.id}>{fa.code} - {fa.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مبلغ التحويل (جنيه مصري) *' : 'Transfer Amount (EGP) *'}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={trfAmount}
              onChange={(e) => setTrfAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البيان والملاحظات' : 'Notes'}
            </label>
            <input
              type="text"
              value={trfNotes}
              onChange={(e) => setTrfNotes(e.target.value)}
              placeholder={isAr ? 'مثال: تغذية خزينة المعرض من البنك...' : 'e.g. Cash withdrawal to vault...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsTransferModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري التحويل...' : 'Transferring...') : (isAr ? 'تنفيذ التحويل وترحيل القيد' : 'Execute Transfer')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Account Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title={isAr ? 'إضافة حساب جديد إلى دليل الحسابات' : 'Create Account'}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'كود الحساب *' : 'Code *'}
              </label>
              <input
                type="text"
                required
                value={newAccCode}
                onChange={(e) => setNewAccCode(e.target.value)}
                placeholder="1011"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الحساب الرئيسي الأب' : 'Parent Account'}
              </label>
              <select
                value={newAccParentId}
                onChange={(e) => setNewAccParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">{isAr ? '-- بدون أب (مستوى رئيسي) --' : '-- Top Level --'}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الحساب بالعربية *' : 'Account Name (AR) *'}
            </label>
            <input
              type="text"
              required
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder={isAr ? 'مثال: خزينة منفذ البيع' : 'e.g. Retail Outlet Cash'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع الحساب *' : 'Type *'}
              </label>
              <select
                value={newAccType}
                onChange={(e) => setNewAccType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="asset">{isAr ? 'أصول (Assets)' : 'Asset'}</option>
                <option value="liability">{isAr ? 'خصوم / التزامات (Liabilities)' : 'Liability'}</option>
                <option value="equity">{isAr ? 'حقوق ملكية (Equity)' : 'Equity'}</option>
                <option value="revenue">{isAr ? 'إيرادات (Revenue)' : 'Revenue'}</option>
                <option value="expense">{isAr ? 'مصروفات (Expense)' : 'Expense'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'التصنيف' : 'Category'}
              </label>
              <input
                type="text"
                value={newAccCategory}
                onChange={(e) => setNewAccCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_postable_chk"
              checked={newAccIsPostable}
              onChange={(e) => setNewAccIsPostable(e.target.checked)}
              className="w-4 h-4 rounded text-primary border-slate-300"
            />
            <label htmlFor="is_postable_chk" className="text-xs text-slate-700 dark:text-slate-300">
              {isAr ? 'حساب نهائي يقبل الترحيل المباشر (Leaf Postable Account)' : 'Postable Leaf Account'}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAccountModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الحساب' : 'Save Account')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Financial Account Modal */}
      <Modal
        isOpen={isFinancialAccModalOpen}
        onClose={() => setIsFinancialAccModalOpen(false)}
        title={isAr ? 'إضافة خزينة أو حساب بنكي جديد' : 'New Cash Desk / Bank Account'}
      >
        <form onSubmit={handleCreateFinancialAccount} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الكود التعريفي *' : 'Code *'}
              </label>
              <input
                type="text"
                required
                value={finAccCode}
                onChange={(e) => setFinAccCode(e.target.value)}
                placeholder="VLT-02"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'النوع *' : 'Type *'}
              </label>
              <select
                value={finAccType}
                onChange={(e) => setFinAccType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="cash">{isAr ? 'خزينة نقدية (Cash Vault)' : 'Cash Vault'}</option>
                <option value="bank">{isAr ? 'حساب بنكي جاري (Bank Account)' : 'Bank Account'}</option>
                <option value="wallet">{isAr ? 'محفظة إلكترونية (Digital Wallet)' : 'Digital Wallet'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الخزينة / الحساب *' : 'Account Name *'}
            </label>
            <input
              type="text"
              required
              value={finAccName}
              onChange={(e) => setFinAccName(e.target.value)}
              placeholder={isAr ? 'مثال: خزينة صالة الإنتاج' : 'e.g. Production Floor Vault'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الحساب المحاسبي المرتبط في الدليل *' : 'Linked GL Account *'}
            </label>
            <select
              required
              value={finAccCoaId}
              onChange={(e) => setFinAccCoaId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? '-- اختر حساب النقدية / البنك --' : '-- Select GL Account --'}</option>
              {accounts.filter((a) => a.is_cash_bank || a.code.startsWith('10')).map((a) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>

          {finAccType === 'bank' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم البنك' : 'Bank Name'}
                </label>
                <input
                  type="text"
                  value={finAccBankName}
                  onChange={(e) => setFinAccBankName(e.target.value)}
                  placeholder="CIB Egypt"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم الحساب البنكي' : 'Account #'}
                </label>
                <input
                  type="text"
                  value={finAccNumber}
                  onChange={(e) => setFinAccNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الرصيد الافتتاحي (جنيه مصري)' : 'Opening Balance (EGP)'}
            </label>
            <input
              type="number"
              min="0"
              value={finAccOpeningBal}
              onChange={(e) => setFinAccOpeningBal(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsFinancialAccModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ الحساب المالي' : 'Save Account')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Cost Center Modal */}
      <Modal
        isOpen={isCostCenterModalOpen}
        onClose={() => setIsCostCenterModalOpen(false)}
        title={isAr ? 'إضافة مركز تكلفة تحليلي جديد' : 'New Cost Center'}
      >
        <form onSubmit={handleCreateCostCenter} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود المركز *' : 'Code *'}
            </label>
            <input
              type="text"
              required
              value={ccCode}
              onChange={(e) => setCcCode(e.target.value)}
              placeholder="CC-SEW"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم مركز التكلفة *' : 'Name *'}
            </label>
            <input
              type="text"
              required
              value={ccName}
              onChange={(e) => setCcName(e.target.value)}
              placeholder={isAr ? 'قسم الخياطة والتجميع' : 'Sewing Line'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الوصف' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={ccDesc}
              onChange={(e) => setCcDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCostCenterModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ مركز التكلفة' : 'Save Center')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Fiscal Year Modal */}
      <Modal
        isOpen={isFiscalYearModalOpen}
        onClose={() => setIsFiscalYearModalOpen(false)}
        title={isAr ? 'إنشاء سنة مالية وفترات محاسبية جديدة' : 'New Fiscal Year'}
      >
        <form onSubmit={handleCreateFiscalYear} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم السنة المالية *' : 'Fiscal Year Name *'}
            </label>
            <input
              type="text"
              required
              value={fyName}
              onChange={(e) => setFyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ البداية *' : 'Start Date *'}
              </label>
              <input
                type="date"
                required
                value={fyStart}
                onChange={(e) => setFyStart(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ النهاية *' : 'End Date *'}
              </label>
              <input
                type="date"
                required
                value={fyEnd}
                onChange={(e) => setFyEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsFiscalYearModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الإنشاء...' : 'Creating...') : (isAr ? 'إنشاء السنة والفترات' : 'Create Year')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reopen Fiscal Period Modal */}
      <Modal
        isOpen={isPeriodReopenModalOpen}
        onClose={() => setIsPeriodReopenModalOpen(false)}
        title={isAr ? `إعادة فتح الفترة المالية: ${selectedPeriodForReopen?.name || ''}` : `Reopen Fiscal Period: ${selectedPeriodForReopen?.name || ''}`}
      >
        <form onSubmit={handleReopenPeriodSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب إعادة الفتح (مطلوب للتدقيق الرقابي) *' : 'Reopening Reason *'}
            </label>
            <textarea
              required
              rows={3}
              value={periodReopenReason}
              onChange={(e) => setPeriodReopenReason(e.target.value)}
              placeholder={isAr ? 'مثال: تسوية فواتير المبيعات المتأخرة بموافقة الإدارة المالية...' : 'e.g. Late adjustments authorized by management...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsPeriodReopenModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الفتح...' : 'Reopening...') : (isAr ? 'تأكيد إعادة الفتح' : 'Confirm Reopen')}
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
                {accounts.filter((a) => a.type === 'asset' && a.is_postable !== false).map((a) => (
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
              {isSubmitting ? (isAr ? 'جاري الإصدار...' : 'Issuing...') : (isAr ? 'إصدار السند وترحيله' : 'Issue Voucher')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Calculate Cost Modal */}
      <CalculateCostModal
        isOpen={isCalcCostModalOpen}
        onClose={() => setIsCalcCostModalOpen(false)}
        isAr={isAr}
        onSuccess={(newSheet) => {
          setCostSheets((prev) => [newSheet, ...prev.filter((s) => s.id !== newSheet.id)]);
          setSuccessMsg(isAr ? 'تم احتساب التكلفة الفعلية وترحيل بطاقة التكلفة بنجاح' : 'Actual production cost sheet calculated successfully');
          setTimeout(() => setSuccessMsg(null), 4000);
        }}
      />

      {/* Account Statement & Ledger Modal */}
      <AccountStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => {
          setIsStatementModalOpen(false);
          setSelectedAccountForStatement(null);
        }}
        accountId={selectedAccountForStatement?.id || null}
        accountName={selectedAccountForStatement?.name}
        accountCode={selectedAccountForStatement?.code}
        isAr={isAr}
      />
    </div>
  );
};

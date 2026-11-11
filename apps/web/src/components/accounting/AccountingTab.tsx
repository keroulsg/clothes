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
  ChevronDown,
  ChevronLeft,
  Search,
  HelpCircle,
  Folder,
  FolderOpen,
  Pencil,
  Sparkles,
  ShieldAlert,
  Layers,
  Trash2,
  X,
  Building2,
  Landmark,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Smartphone,
  CreditCard,
  Calendar,
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
import { PrintJournalVoucherModal } from './PrintJournalVoucherModal';
import { PrintTransferVoucherModal } from './PrintTransferVoucherModal';
import { PrintLoanScheduleModal } from './PrintLoanScheduleModal';
import { formatCleanDate } from '../sales/PrintSalesInvoiceModal';
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
  BankLoan,
  BankLoanInstallment,
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

  // Journal Entries States & Modals
  const [selectedJournalForPrint, setSelectedJournalForPrint] = useState<JournalEntry | null>(null);
  const [journalSearchQuery, setJournalSearchQuery] = useState('');
  const [journalFilterType, setJournalFilterType] = useState<'all' | 'system' | 'expenses' | 'opening' | 'manual' | 'reversed'>('all');

  // Mode 1: Quick Daily Expense Modal
  const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false);
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [expensePaymentAccountId, setExpensePaymentAccountId] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number>(500);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseCostCenterId, setExpenseCostCenterId] = useState('');

  // Mode 2: Advanced Multi-Line Journal Entry Modal
  const [isAdvancedJournalModalOpen, setIsAdvancedJournalModalOpen] = useState(false);
  const [advJournalDesc, setAdvJournalDesc] = useState('');
  const [advJournalDate, setAdvJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [advJournalLines, setAdvJournalLines] = useState<
    Array<{ account_id: string; debit: number; credit: number; description: string; cost_center_id?: string }>
  >([
    { account_id: '', debit: 0, credit: 0, description: '' },
    { account_id: '', debit: 0, credit: 0, description: '' },
  ]);

  // Financial Accounts & Transfers States
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<FinancialAccountTransfer | null>(null);
  const [finSearchQuery, setFinSearchQuery] = useState('');
  const [finFilterType, setFinFilterType] = useState<'all' | 'cash' | 'bank' | 'wallet'>('all');
  const [trfSearchQuery, setTrfSearchQuery] = useState('');
  const [trfFilterStatus, setTrfFilterStatus] = useState<'all' | 'completed' | 'reversed'>('all');

  // Bank Loans & Credit Facilities States
  const [finSectionView, setFinSectionView] = useState<'all' | 'accounts' | 'transfers' | 'loans'>('all');
  const [bankLoans, setBankLoans] = useState<BankLoan[]>(() => {
    try {
      const saved = localStorage.getItem('garmentos_bank_loans');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'loan-nbe-01',
        loan_number: 'LOAN-NBE-2026-001',
        name: 'قرض تمويل ماكينات خياطة وقص وتحديث خطوط الإنتاج (مبادرة دعم الصناعة)',
        bank_name: 'البنك الأهلي المصري - فرع المصانع',
        contract_number: 'CTR-NBE-88921',
        financial_account_id: 'BNK-01',
        principal_amount: 360000,
        interest_rate: 8,
        interest_amount: 28800,
        total_loan_amount: 388800,
        paid_amount: 97200,
        remaining_amount: 291600,
        installments_count: 12,
        frequency: 'monthly',
        start_date: '2026-08-01',
        maturity_date: '2027-07-01',
        status: 'active',
        notes: 'تمويل شراء 10 ماكينات سنجر ياباني كمبيوتر ومقص قماش رأسي 10 بوصة بضمان خطوط الإنتاج',
        installments: [
          { id: 'inst-1', installment_number: 1, due_date: '2026-09-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 32400, status: 'paid', paid_at: '2026-09-01', payment_reference: 'TRF-NBE-0901' },
          { id: 'inst-2', installment_number: 2, due_date: '2026-10-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 32400, status: 'paid', paid_at: '2026-10-01', payment_reference: 'TRF-NBE-1001' },
          { id: 'inst-3', installment_number: 3, due_date: '2026-11-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 32400, status: 'paid', paid_at: '2026-11-01', payment_reference: 'TRF-NBE-1101' },
          { id: 'inst-4', installment_number: 4, due_date: '2026-12-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-5', installment_number: 5, due_date: '2027-01-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-6', installment_number: 6, due_date: '2027-02-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-7', installment_number: 7, due_date: '2027-03-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-8', installment_number: 8, due_date: '2027-04-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-9', installment_number: 9, due_date: '2027-05-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-10', installment_number: 10, due_date: '2027-06-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-11', installment_number: 11, due_date: '2027-07-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
          { id: 'inst-12', installment_number: 12, due_date: '2027-08-01', principal_amount: 30000, interest_amount: 2400, total_amount: 32400, paid_amount: 0, status: 'pending' },
        ],
      },
    ];
  });

  const [selectedLoanForSchedule, setSelectedLoanForSchedule] = useState<BankLoan | null>(null);
  const [selectedLoanForPrint, setSelectedLoanForPrint] = useState<BankLoan | null>(null);
  const [isNewLoanModalOpen, setIsNewLoanModalOpen] = useState(false);
  const [isPayInstallmentModalOpen, setIsPayInstallmentModalOpen] = useState(false);
  const [selectedInstallmentForPay, setSelectedInstallmentForPay] = useState<{ loan: BankLoan; installment: BankLoanInstallment } | null>(null);

  // New Loan Form State
  const [loanName, setLoanName] = useState('');
  const [loanBankName, setLoanBankName] = useState('البنك الأهلي المصري');
  const [loanContractNum, setLoanContractNum] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState<number>(300000);
  const [loanInterestRate, setLoanInterestRate] = useState<number>(8);
  const [loanInstallmentsCount, setLoanInstallmentsCount] = useState<number>(12);
  const [loanFrequency, setLoanFrequency] = useState<'monthly' | 'quarterly'>('monthly');
  const [loanStartDate, setLoanStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loanNotes, setLoanNotes] = useState('');
  const [loanFinancialAccId, setLoanFinancialAccId] = useState('');

  // Pay Installment Form State
  const [payInstDate, setPayInstDate] = useState(new Date().toISOString().split('T')[0]);
  const [payInstPaymentAccId, setPayInstPaymentAccId] = useState('');
  const [payInstRef, setPayInstRef] = useState('');
  const [payInstNotes, setPayInstNotes] = useState('');

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

  // COA Interactive States & Filters
  const [accountSearchQuery, setAccountSearchQuery] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('all');
  const [accountPostableFilter, setAccountPostableFilter] = useState<'all' | 'postable' | 'header'>('all');
  const [isCoaGuideOpen, setIsCoaGuideOpen] = useState(false);
  const [expandedAccountIds, setExpandedAccountIds] = useState<Set<string>>(new Set());
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

  // Edit Account Modal State
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<ChartOfAccount | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccNameEn, setEditAccNameEn] = useState('');
  const [editAccNotes, setEditAccNotes] = useState('');
  const [editAccIsActive, setEditAccIsActive] = useState(true);
  const [editAccIsPostable, setEditAccIsPostable] = useState(true);

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

  useEffect(() => {
    if (accounts.length > 0) {
      if (!expenseAccountId) {
        const exp = accounts.find((a) => a.type === 'expense' && a.is_postable !== false);
        if (exp) setExpenseAccountId(exp.id);
      }
      if (!expensePaymentAccountId) {
        const pay =
          accounts.find((a) => a.is_cash_bank && a.is_postable !== false) ||
          accounts.find((a) => a.code === '1011' || a.code === '1010' || a.code === '1012') ||
          accounts.find((a) => a.type === 'asset' && a.is_postable !== false);
        if (pay) setExpensePaymentAccountId(pay.id);
      }
    }
  }, [accounts, expenseAccountId, expensePaymentAccountId]);

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

  const handleCreateQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0 || !expenseAccountId || !expensePaymentAccountId) {
      setErrorMsg(isAr ? 'يرجى اختيار بند المصروف وحساب السداد والمبلغ' : 'Please select expense account, payment vault/bank, and amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const expAcc = accounts.find((a) => a.id === expenseAccountId);
      const payAcc = accounts.find((a) => a.id === expensePaymentAccountId);
      const defaultDesc =
        expenseNotes ||
        (isAr
          ? `إثبات مصروف: ${expAcc?.name || 'مصروفات تشغيل'}`
          : `Expense: ${expAcc?.name || 'Operating expense'}`);

      const res = await api.accounting.createJournalEntry({
        description: defaultDesc,
        entry_date: expenseDate || new Date().toISOString().split('T')[0],
        reference_type: 'expense_voucher',
        lines: [
          {
            account_id: expenseAccountId,
            debit: Number(expenseAmount),
            credit: 0,
            description: defaultDesc,
            cost_center_id: expenseCostCenterId || undefined,
          },
          {
            account_id: expensePaymentAccountId,
            debit: 0,
            credit: Number(expenseAmount),
            description: isAr
              ? `صرف من: ${payAcc?.name || 'الخزينة النقدية'}`
              : `Paid from: ${payAcc?.name || 'Vault'}`,
          },
        ],
      });

      if (res?.journal_entry) {
        setJournals((prev) => [res.journal_entry, ...prev]);
      } else {
        await loadAccountingData();
      }

      setIsQuickExpenseModalOpen(false);
      setExpenseNotes('');
      setExpenseAmount(500);
      setSuccessMsg(isAr ? 'تم تسجيل وترحيل المصروف بنجاح وتحديث أرصدة الخزينة والحسابات' : 'Expense posted successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل المصروف' : 'Failed to record expense'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdvancedJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const validLines = advJournalLines.filter(
      (l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0)
    );
    if (validLines.length < 2) {
      setErrorMsg(isAr ? 'يجب إدخال طرفين على الأقل للقيد المحاسبي' : 'At least two lines required');
      return;
    }

    const totalDeb = validLines.reduce((sum, l) => sum + Number(l.debit || 0), 0);
    const totalCred = validLines.reduce((sum, l) => sum + Number(l.credit || 0), 0);
    if (Math.abs(totalDeb - totalCred) > 0.01) {
      setErrorMsg(
        isAr
          ? `القيد غير متوازن! إجمالي المدين: ${totalDeb.toLocaleString()} ≠ إجمالي الدائن: ${totalCred.toLocaleString()}`
          : 'Journal entry is unbalanced!'
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.accounting.createJournalEntry({
        description: advJournalDesc || (isAr ? 'قيد محاسبي عام متوازن' : 'General Balanced Journal Entry'),
        entry_date: advJournalDate || new Date().toISOString().split('T')[0],
        reference_type: 'manual_journal',
        lines: validLines.map((l) => ({
          account_id: l.account_id,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || advJournalDesc,
          cost_center_id: l.cost_center_id || undefined,
        })),
      });

      if (res?.journal_entry) {
        setJournals((prev) => [res.journal_entry, ...prev]);
      } else {
        await loadAccountingData();
      }

      setIsAdvancedJournalModalOpen(false);
      setAdvJournalDesc('');
      setAdvJournalLines([
        { account_id: '', debit: 0, credit: 0, description: '' },
        { account_id: '', debit: 0, credit: 0, description: '' },
      ]);
      setSuccessMsg(isAr ? 'تم ترحيل قيد اليومية المركب بنجاح' : 'Journal entry posted successfully');
      setTimeout(() => setSuccessMsg(null), 4000);

      api.accounting.getAccounts().then((accs) => {
        if (Array.isArray(accs)) setAccounts(accs);
      }).catch(() => {});
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل ترحيل القيد' : 'Failed to post journal entry'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAdvLine = () => {
    setAdvJournalLines((prev) => [
      ...prev,
      { account_id: '', debit: 0, credit: 0, description: '' },
    ]);
  };

  const removeAdvLine = (index: number) => {
    if (advJournalLines.length <= 2) return;
    setAdvJournalLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateAdvLine = (index: number, field: string, value: any) => {
    setAdvJournalLines((prev) =>
      prev.map((line, idx) => {
        if (idx !== index) return line;
        const updated = { ...line, [field]: value };
        if (field === 'debit' && Number(value) > 0) updated.credit = 0;
        if (field === 'credit' && Number(value) > 0) updated.debit = 0;
        return updated;
      })
    );
  };

  const advTotalDebit = advJournalLines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
  const advTotalCredit = advJournalLines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
  const advDiff = Math.abs(advTotalDebit - advTotalCredit);
  const isAdvBalanced = advTotalDebit > 0 && advDiff < 0.01;

  const expenseAccountsList = accounts.filter(
    (a) => a.type === 'expense' || a.category === 'cost_of_goods_sold' || a.code.startsWith('5') || a.code.startsWith('6')
  );
  const availableExpenseAccounts = expenseAccountsList.length > 0 ? expenseAccountsList : accounts;

  const paymentAccountsList = accounts.filter(
    (a) => a.is_cash_bank || a.category === 'cash_and_banks' || a.code.startsWith('1010') || a.code.startsWith('1020')
  );
  const availablePaymentAccounts = paymentAccountsList.length > 0 ? paymentAccountsList : accounts.filter((a) => a.type === 'asset');

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

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForEdit || !editAccName) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.accounting.updateAccount(selectedAccountForEdit.id, {
        name: editAccName,
        name_en: editAccNameEn || undefined,
        notes: editAccNotes || undefined,
        is_active: editAccIsActive,
        is_postable: editAccIsPostable,
      });

      setSuccessMsg(isAr ? 'تم تحديث بيانات الحساب بنجاح' : 'Account updated successfully');
      setIsEditAccountModalOpen(false);
      setSelectedAccountForEdit(null);
      await loadAccountingData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحديث الحساب' : 'Failed to update account'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditAccount = (acc: ChartOfAccount) => {
    setSelectedAccountForEdit(acc);
    setEditAccName(acc.name);
    setEditAccNameEn(acc.name_en || '');
    setEditAccNotes(acc.notes || '');
    setEditAccIsActive(acc.is_active !== false);
    setEditAccIsPostable(acc.is_postable !== false);
    setIsEditAccountModalOpen(true);
  };

  const openAddSubAccount = (parent: ChartOfAccount) => {
    setNewAccParentId(parent.id);
    setNewAccType(parent.type as any);
    setNewAccCategory(parent.category || 'current_asset');
    setNewAccIsPostable(true);

    const children = accounts.filter((a) => a.parent_id === parent.id);
    let nextCode = `${parent.code}01`;
    if (children.length > 0) {
      const numericCodes = children
        .map((c) => parseInt(c.code.replace(/\D/g, ''), 10))
        .filter((n) => !isNaN(n));
      if (numericCodes.length > 0) {
        const maxCode = Math.max(...numericCodes);
        nextCode = String(maxCode + 1);
      }
    }
    setNewAccCode(nextCode);
    setNewAccName('');
    setNewAccNameEn('');
    setIsAccountModalOpen(true);
  };

  const toggleAccountExpand = (id: string) => {
    setExpandedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAllAccounts = () => {
    setExpandedAccountIds(new Set(accounts.map((a) => a.id)));
  };

  const collapseAllAccounts = () => {
    setExpandedAccountIds(new Set());
  };

  // Expand headers by default when accounts load
  useEffect(() => {
    if (accounts.length > 0 && expandedAccountIds.size === 0) {
      const headerIds = new Set(
        accounts
          .filter((a) => (a.level || 1) <= 2 || a.is_postable === false)
          .map((a) => a.id)
      );
      setExpandedAccountIds(headerIds);
    }
  }, [accounts]);

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

  useEffect(() => {
    try {
      localStorage.setItem('garmentos_bank_loans', JSON.stringify(bankLoans));
    } catch (e) {}
  }, [bankLoans]);

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanName || loanPrincipal <= 0 || loanInstallmentsCount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const calculatedInterest = Math.round(loanPrincipal * (loanInterestRate / 100));
      const totalAmount = loanPrincipal + calculatedInterest;
      const principalPerInst = Math.round(loanPrincipal / loanInstallmentsCount);
      const interestPerInst = Math.round(calculatedInterest / loanInstallmentsCount);
      const totalPerInst = principalPerInst + interestPerInst;

      const generatedInstallments: BankLoanInstallment[] = [];
      const baseDate = new Date(loanStartDate || new Date());

      for (let i = 1; i <= loanInstallmentsCount; i++) {
        const instDate = new Date(baseDate);
        if (loanFrequency === 'monthly') {
          instDate.setMonth(instDate.getMonth() + i);
        } else {
          instDate.setMonth(instDate.getMonth() + i * 3);
        }

        generatedInstallments.push({
          id: `inst-${Date.now()}-${i}`,
          installment_number: i,
          due_date: instDate.toISOString().split('T')[0],
          principal_amount: i === loanInstallmentsCount ? (loanPrincipal - principalPerInst * (loanInstallmentsCount - 1)) : principalPerInst,
          interest_amount: i === loanInstallmentsCount ? (calculatedInterest - interestPerInst * (loanInstallmentsCount - 1)) : interestPerInst,
          total_amount: totalPerInst,
          paid_amount: 0,
          status: 'pending',
        });
      }

      const maturity = generatedInstallments[generatedInstallments.length - 1]?.due_date || loanStartDate;

      const newLoanObj: BankLoan = {
        id: `loan-${Date.now()}`,
        loan_number: `LOAN-${(loanBankName.includes('الأهلي') ? 'NBE' : loanBankName.includes('مصر') ? 'BM' : 'BNK')}-${new Date().getFullYear()}-${String(bankLoans.length + 1).padStart(3, '0')}`,
        name: loanName,
        bank_name: loanBankName,
        contract_number: loanContractNum || `CTR-${Math.floor(10000 + Math.random() * 90000)}`,
        financial_account_id: loanFinancialAccId || undefined,
        principal_amount: loanPrincipal,
        interest_rate: loanInterestRate,
        interest_amount: calculatedInterest,
        total_loan_amount: totalAmount,
        paid_amount: 0,
        remaining_amount: totalAmount,
        installments_count: loanInstallmentsCount,
        frequency: loanFrequency,
        start_date: loanStartDate,
        maturity_date: maturity,
        status: 'active',
        notes: loanNotes,
        installments: generatedInstallments,
      };

      setBankLoans((prev) => [newLoanObj, ...prev]);

      try {
        const loanLiabilityAcc = accounts.find((a) => a.code === '2110' || a.code === '2210');
        const selectedFinAcc = financialAccounts.find((fa) => fa.id === loanFinancialAccId);
        const bankAssetAcc = accounts.find((a) => a.id === selectedFinAcc?.chart_of_account_id || a.code === '1021');

        if (loanLiabilityAcc && bankAssetAcc) {
          await api.accounting.createJournalEntry({
            description: `إثبات استلام وتسييل تمويل بنكي: ${loanName} (${newLoanObj.loan_number})`,
            entry_date: loanStartDate,
            reference_type: 'bank_loan_disbursement',
            lines: [
              {
                account_id: bankAssetAcc.id,
                debit: Number(loanPrincipal),
                credit: 0,
                description: `إيداع مبلغ القرض بحساب ${bankAssetAcc.name}`,
              },
              {
                account_id: loanLiabilityAcc.id,
                debit: 0,
                credit: Number(loanPrincipal),
                description: `إثبات التزام قرض وتسهيل بنكي - ${loanBankName}`,
              },
            ],
          });
          await loadAccountingData();
          await loadFinancialAccounts();
        }
      } catch (jeErr) {}

      setIsNewLoanModalOpen(false);
      setLoanName('');
      setLoanContractNum('');
      setLoanNotes('');
      setSuccessMsg(isAr ? 'تم تسجيل القرض وتوليد جدول الأقساط الشهرية وترحيل القيد آلياً بنجاح' : 'Bank loan registered and amortization schedule generated successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل القرض' : 'Failed to register loan'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallmentForPay) return;

    const { loan, installment } = selectedInstallmentForPay;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const updatedLoans = bankLoans.map((l) => {
        if (l.id !== loan.id) return l;
        const updatedInsts = l.installments.map((inst) => {
          if (inst.id !== installment.id) return inst;
          return {
            ...inst,
            status: 'paid' as const,
            paid_amount: inst.total_amount,
            paid_at: payInstDate || new Date().toISOString().split('T')[0],
            payment_account_id: payInstPaymentAccId || undefined,
            payment_reference: payInstRef || undefined,
            notes: payInstNotes || undefined,
          };
        });

        const newPaid = updatedInsts.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
        const newRemaining = Math.max(0, l.total_loan_amount - newPaid);

        return {
          ...l,
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status: newRemaining <= 0 ? ('completed' as const) : ('active' as const),
          installments: updatedInsts,
        };
      });

      setBankLoans(updatedLoans);

      try {
        const loanLiabilityAcc = accounts.find((a) => a.code === '2110' || a.code === '2120' || a.code === '2210');
        const interestAcc = accounts.find((a) => a.code === '6040' || a.category?.includes('interest') || a.code.startsWith('6'));
        const payFinAcc = financialAccounts.find((fa) => fa.id === payInstPaymentAccId);
        const payCoaAcc = accounts.find((a) => a.id === payFinAcc?.chart_of_account_id || a.code === '1021' || a.code === '1010');

        if (loanLiabilityAcc && payCoaAcc) {
          const lines: any[] = [
            {
              account_id: loanLiabilityAcc.id,
              debit: Number(installment.principal_amount),
              credit: 0,
              description: `سداد أصل القسط رقم (${installment.installment_number}) - ${loan.loan_number}`,
            },
          ];

          if (Number(installment.interest_amount) > 0 && interestAcc) {
            lines.push({
              account_id: interestAcc.id,
              debit: Number(installment.interest_amount),
              credit: 0,
              description: `فائدة القسط رقم (${installment.installment_number}) - ${loan.bank_name}`,
            });
          }

          lines.push({
            account_id: payCoaAcc.id,
            debit: 0,
            credit: Number(installment.total_amount),
            description: `خصم سداد القسط البنكي من: ${payCoaAcc.name}`,
          });

          await api.accounting.createJournalEntry({
            description: `سداد قسط بنكي رقم ${installment.installment_number} لقرض [${loan.name}]`,
            entry_date: payInstDate || new Date().toISOString().split('T')[0],
            reference_type: 'bank_loan_repayment',
            lines,
          });

          await loadAccountingData();
          await loadFinancialAccounts();
        }
      } catch (jeErr) {}

      const currLoan = updatedLoans.find((l) => l.id === loan.id);
      if (currLoan && selectedLoanForSchedule?.id === loan.id) {
        setSelectedLoanForSchedule(currLoan);
      }

      setIsPayInstallmentModalOpen(false);
      setSelectedInstallmentForPay(null);
      setPayInstRef('');
      setPayInstNotes('');
      setSuccessMsg(isAr ? 'تم سداد القسط البنكي بنجاح وترحيل القيد المحاسبي المزدوج وتحديث الأرصدة' : 'Installment paid successfully and journal entry posted');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل سداد القسط' : 'Failed to pay installment'));
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
      {activeSubTab === 'accounts' && (() => {
        // Build hierarchical tree
        interface AccountTreeNode extends ChartOfAccount {
          children?: AccountTreeNode[];
        }

        const map = new Map<string, AccountTreeNode>();
        const roots: AccountTreeNode[] = [];

        accounts.forEach((a) => {
          map.set(a.id, { ...a, children: [] });
        });

        accounts.forEach((a) => {
          const node = map.get(a.id)!;
          if (a.parent_id && map.has(a.parent_id)) {
            map.get(a.parent_id)!.children!.push(node);
          } else {
            roots.push(node);
          }
        });

        const sortTreeNodes = (nodes: AccountTreeNode[]) => {
          nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
          nodes.forEach((n) => {
            if (n.children && n.children.length > 0) sortTreeNodes(n.children);
          });
        };

        sortTreeNodes(roots);

        // Filter and search logic
        const q = accountSearchQuery.trim().toLowerCase();
        const hasFilters = q !== '' || accountTypeFilter !== 'all' || accountPostableFilter !== 'all';

        const matchingIds = new Set<string>();
        if (hasFilters) {
          accounts.forEach((acc) => {
            const matchesSearch =
              !q ||
              acc.code.toLowerCase().includes(q) ||
              acc.name.toLowerCase().includes(q) ||
              (acc.name_en && acc.name_en.toLowerCase().includes(q));

            const matchesType = accountTypeFilter === 'all' || acc.type === accountTypeFilter;

            const matchesPostable =
              accountPostableFilter === 'all' ||
              (accountPostableFilter === 'postable' && acc.is_postable !== false) ||
              (accountPostableFilter === 'header' && acc.is_postable === false);

            if (matchesSearch && matchesType && matchesPostable) {
              matchingIds.add(acc.id);
              let curr = acc;
              while (curr.parent_id) {
                matchingIds.add(curr.parent_id);
                const parent = accounts.find((p) => p.id === curr.parent_id);
                if (!parent) break;
                curr = parent;
              }
            }
          });
        }

        // Flatten visible tree nodes according to expansion and filtering
        const visibleRows: Array<{ node: AccountTreeNode; hasChildren: boolean; isExpanded: boolean }> = [];

        const traverse = (nodes: AccountTreeNode[]) => {
          nodes.forEach((node) => {
            if (hasFilters && !matchingIds.has(node.id)) {
              return;
            }

            const hasChildren = !!(node.children && node.children.length > 0);
            const isExpanded = hasFilters || expandedAccountIds.has(node.id);

            visibleRows.push({ node, hasChildren, isExpanded });

            if (hasChildren && isExpanded) {
              traverse(node.children!);
            }
          });
        };

        traverse(roots);

        // Required vital account codes check for health audit
        const vitalMappings = [
          { key: 'cash', code: '1010', nameAr: 'نقدية بالصندوق والخزينة', icon: '💵' },
          { key: 'bank', code: '1020', nameAr: 'حسابات البنوك الجارية', icon: '🏦' },
          { key: 'ar', code: '1110', nameAr: 'العملاء والمدينون التجاريون', icon: '👥' },
          { key: 'raw_materials', code: '1210', nameAr: 'مخزون الأقمشة والخامات', icon: '🧵' },
          { key: 'wip', code: '1220', nameAr: 'مخزون الإنتاج تحت التشغيل (WIP)', icon: '⚙️' },
          { key: 'finished_goods', code: '1230', nameAr: 'مخزون المنتجات التامة', icon: '📦' },
          { key: 'ap', code: '2010', nameAr: 'الموردون والدائنون التجاريون', icon: '🏭' },
          { key: 'sales', code: '4010', nameAr: 'إيراد مبيعات الملابس والإنتاج التام', icon: '📈' },
          { key: 'cogs', code: '5010', nameAr: 'تكلفة البضاعة المباعة (COGS)', icon: '🏷️' },
          { key: 'labor', code: '5020', nameAr: 'أجور عمال الإنتاج المباشرة (أجر القطعة)', icon: '✂️' },
        ];

        const healthStatus = vitalMappings.map((v) => ({
          ...v,
          found: accounts.some((a) => a.code === v.code),
          account: accounts.find((a) => a.code === v.code),
        }));

        const healthyCount = healthStatus.filter((h) => h.found).length;

        // Statistics
        const postableCount = accounts.filter((a) => a.is_postable !== false).length;
        const headerCount = accounts.filter((a) => a.is_postable === false).length;

        return (
          <div className="space-y-4">
            {/* ─── EDUCATIONAL & HOW-TO GUIDE PANEL ─── */}
            <div className="rounded-2xl border border-[#7F1625]/20 bg-gradient-to-r from-[#7F1625]/5 via-white to-amber-500/5 dark:from-[#7F1625]/10 dark:via-[#0c121e] dark:to-amber-500/10 p-4 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7F1625]/10 dark:bg-[#7F1625]/20 text-[#7F1625] dark:text-red-400 flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                      <span>{isAr ? 'دليل فهم والتعامل مع شجرة الحسابات (COA Guide)' : 'Chart of Accounts Guide'}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#7F1625]/10 text-[#7F1625] dark:text-red-300">
                        {isAr ? 'إرشادات المحاسبة الصناعية' : 'Industrial Accounting'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr
                        ? 'تعرف على تركيبة شجرة حسابات المصنع، كيف تُقرأ الأرقام، والفرق بين الحساب الرئيسي والفرعي.'
                        : 'Learn the factory chart of accounts hierarchy, number schemes, and automated posting.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsHealthCheckOpen(!isHealthCheckOpen)}
                    className="px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{isAr ? `فحص جاهزية الربط (${healthyCount}/10)` : `Health Audit (${healthyCount}/10)`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCoaGuideOpen(!isCoaGuideOpen)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0c121e] text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <span>{isCoaGuideOpen ? (isAr ? 'إخفاء الإرشادات ▲' : 'Hide Guide ▲') : (isAr ? 'عرض الإرشادات ▼' : 'Show Guide ▼')}</span>
                  </button>
                </div>
              </div>

              {/* EXPANDABLE EXPLANATION BODY */}
              {isCoaGuideOpen && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-300">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <p className="font-bold text-[#7F1625] dark:text-red-400 flex items-center gap-1.5">
                      <FolderTree className="w-4 h-4" />
                      {isAr ? '1. ما هي الأرقام الستة القياسية؟' : '1. Core Number Structure'}
                    </p>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      <li>• <strong>1: الأصول:</strong> النقدية، البنوك، العملاء، ومخازن الأقمشة والمنتجات.</li>
                      <li>• <strong>2: الالتزامات:</strong> مستحقات الموردين، أجور العمال، والضرائب.</li>
                      <li>• <strong>3: حقوق الملكية:</strong> رأس المال والأرباح المحتجزة / المرحلة.</li>
                      <li>• <strong>4: الإيرادات:</strong> مبيعات الملابس وخدمات القص والتشغيل للغير (CMT).</li>
                      <li>• <strong>5: تكاليف مباشرة:</strong> تكلفة البضاعة، أجور عمال الخياطة، والتشغيل الخارجي.</li>
                      <li>• <strong>6: مصروفات غير مباشرة:</strong> صيانة الماكينات، استهلاك، وكهرباء المصنع.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Layers className="w-4 h-4" />
                      {isAr ? '2. الفرق بين الرئيسي والفرعي' : '2. Header vs. Postable'}
                    </p>
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      <p>
                        <strong>🔒 حساب تجميعي (Header):</strong> مثل «11 الأصول المتداولة». وظيفته تجميع أرصدة الحسابات المتفرعة منه لعرضها في الميزانية وقائمة الدخل ولا يُسجل عليه قيد مباشر.
                      </p>
                      <p>
                        <strong>✓ حساب فرعي يقبل الترحيل (Postable):</strong> مثل «1010 نقدية بالخزينة» أو «1110 العملاء». هو الحساب الفعلي الذي يستقبل حركات السداد، القبض، والفواتير.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      {isAr ? '3. كيف يعمل الترحيل الآلي؟' : '3. Automated Posting'}
                    </p>
                    <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                      <p>
                        <strong>لا تحتاج لتسجيل قيود يدوية لكل حركة!</strong>
                      </p>
                      <p>
                        بمجرد إصدار فاتورة مبيعات، تسجيل سند قبض نقدي، صرف أثواب قماش من المخزن لأمر قص، أو تسليم شحنة، يقوم النظام فوراً بترحيل القيد المزدوج المتوازن في الحسابات المربوطة هنا تلقائياً.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPANDABLE HEALTH AUDIT PANEL */}
              {isHealthCheckOpen && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      {isAr ? 'فحص جاهزية حسابات الربط الآلي لنظام المصنع:' : 'Automated Accounting Integration Health:'}
                    </h4>
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {healthyCount === vitalMappings.length
                        ? (isAr ? '✓ جاهزية مكتملة 100%' : '100% Ready')
                        : `${healthyCount}/${vitalMappings.length}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {healthStatus.map((item) => (
                      <div
                        key={item.key}
                        className={`p-2 rounded-xl border text-[11px] flex items-center justify-between transition-all ${
                          item.found
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-800/60 text-slate-800 dark:text-slate-200'
                            : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300/60 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1 font-mono font-bold text-[10px]">
                            <span>{item.icon}</span>
                            <span>{item.code}</span>
                          </div>
                          <p className="truncate text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{item.nameAr}</p>
                        </div>
                        <div>
                          {item.found ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ─── MAIN COA CARD & TREE VIEW ─── */}
            <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* HEADER & TOP STATS */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#7F1625] text-white flex items-center justify-center shadow-xs">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{isAr ? 'شجرة الحسابات الهرمية لمصنع الملابس والتشغيل' : 'Apparel Manufacturing Hierarchical Chart of Accounts'}</span>
                      <span className="text-xs font-mono font-medium text-slate-500">({accounts.length} حساب)</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isAr
                        ? `${headerCount} حسابات رئيسية تجميعية • ${postableCount} حسابات فرعية تقبل الترحيل`
                        : `${headerCount} Header Accounts • ${postableCount} Postable Leaf Accounts`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleInitDefaultCOA}>
                    <RotateCw className="w-3.5 h-3.5 me-1" />
                    {isAr ? 'تهيئة / تحديث الدليل الافتراضي' : 'Init / Reset Default COA'}
                  </Button>
                  <Button size="sm" onClick={() => setIsAccountModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5 me-1" />
                    {isAr ? '+ حساب جديد' : '+ New Account'}
                  </Button>
                </div>
              </div>

              {/* SEARCH & FILTERS TOOLBAR */}
              <div className="p-3 bg-white dark:bg-[#0c121e] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {/* SEARCH INPUT */}
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={accountSearchQuery}
                    onChange={(e) => setAccountSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث بالكود أو الاسم العربي أو الإنجليزي...' : 'Search by code or name...'}
                    className="w-full ps-9 pe-8 py-1.5 text-xs bg-slate-50 dark:bg-[#0d131f] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#7F1625]"
                  />
                  {accountSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAccountSearchQuery('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* ACCOUNT TYPE PILLS */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-medium me-1">{isAr ? 'النوع:' : 'Type:'}</span>
                  {(
                    [
                      { id: 'all', label: isAr ? 'الكل' : 'All' },
                      { id: 'asset', label: isAr ? '🏛️ الأصول (1)' : 'Assets' },
                      { id: 'liability', label: isAr ? '📑 الالتزامات (2)' : 'Liabilities' },
                      { id: 'equity', label: isAr ? '💼 حقوق الملكية (3)' : 'Equity' },
                      { id: 'revenue', label: isAr ? '📈 الإيرادات (4)' : 'Revenue' },
                      { id: 'expense', label: isAr ? '🧵 تكاليف ومصروفات (5/6)' : 'Costs' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setAccountTypeFilter(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        accountTypeFilter === t.id
                          ? 'bg-[#7F1625] text-white shadow-xs font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* POSTABLE FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[11px] text-slate-400 font-medium me-1">{isAr ? 'الترحيل:' : 'Posting:'}</span>
                  {(
                    [
                      { id: 'all', label: isAr ? 'الكل' : 'All' },
                      { id: 'postable', label: isAr ? '✓ فرعي مرحل' : 'Postable' },
                      { id: 'header', label: isAr ? '🔒 تجميعي' : 'Header' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAccountPostableFilter(p.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                        accountPostableFilter === p.id
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* TREE EXPAND/COLLAPSE BUTTONS */}
                <div className="flex items-center gap-1.5 ms-auto">
                  <button
                    type="button"
                    onClick={expandAllAccounts}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#7F1625] dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                    title={isAr ? 'فتح جميع مستويات الشجرة' : 'Expand All'}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح الكل' : 'Expand All'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={collapseAllAccounts}
                    className="px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-[#7F1625] dark:hover:text-red-400 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors flex items-center gap-1"
                    title={isAr ? 'طي جميع المستويات' : 'Collapse All'}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>{isAr ? 'طي الكل' : 'Collapse All'}</span>
                  </button>
                </div>
              </div>

              {/* TREE TABLE VIEW */}
              <div className="overflow-x-auto">
                <table className="w-full text-start text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3 text-start w-36">{isAr ? 'كود الحساب' : 'Code'}</th>
                      <th className="p-3 text-start">{isAr ? 'اسم الحساب في الشجرة' : 'Account Tree Hierarchy'}</th>
                      <th className="p-3 text-center">{isAr ? 'المستوى' : 'Level'}</th>
                      <th className="p-3 text-start">{isAr ? 'النوع الرئيسي' : 'Type'}</th>
                      <th className="p-3 text-center">{isAr ? 'طبيعة الرصيد' : 'Normal'}</th>
                      <th className="p-3 text-center">{isAr ? 'حالة الترحيل' : 'Posting'}</th>
                      <th className="p-3 text-end">{isAr ? 'الرصيد الدفتري الحالي' : 'Balance'}</th>
                      <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {visibleRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          {accounts.length === 0 ? (
                            <div className="space-y-3">
                              <p className="font-bold text-slate-600 dark:text-slate-300">
                                {isAr ? 'شجرة الحسابات فارغة حالياً!' : 'Chart of accounts is empty!'}
                              </p>
                              <p className="text-xs">
                                {isAr
                                  ? 'اضغط على زر «تهيئة الدليل الافتراضي» لإنشاء دليل الحسابات القياسي المتكامل لمصانع الملابس.'
                                  : 'Click "Init Default COA" to generate the standard manufacturing chart of accounts.'}
                              </p>
                              <Button onClick={handleInitDefaultCOA} icon={<FolderTree className="w-4 h-4" />}>
                                {isAr ? 'تهيئة شجرة الحسابات الآن' : 'Initialize COA Now'}
                              </Button>
                            </div>
                          ) : (
                            <p>{isAr ? 'لا توجد حسابات مطابقة لمعايير البحث الحالية' : 'No accounts match your search'}</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      visibleRows.map(({ node: acc, hasChildren, isExpanded }) => {
                        const level = Number(acc.level) || 1;
                        const isHeader = acc.is_postable === false;

                        // Type styling
                        let typeBadgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
                        let typeLabel: string = acc.type;
                        if (acc.type === 'asset') {
                          typeBadgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
                          typeLabel = isAr ? 'أصول (Assets)' : 'Asset';
                        } else if (acc.type === 'liability') {
                          typeBadgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
                          typeLabel = isAr ? 'التزامات (Liabilities)' : 'Liability';
                        } else if (acc.type === 'equity') {
                          typeBadgeClass = 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20';
                          typeLabel = isAr ? 'حقوق ملكية (Equity)' : 'Equity';
                        } else if (acc.type === 'revenue') {
                          typeBadgeClass = 'bg-emerald-600/15 text-emerald-800 dark:text-emerald-200 border-emerald-600/30 font-bold';
                          typeLabel = isAr ? 'إيرادات (Revenue)' : 'Revenue';
                        } else if (acc.type === 'expense') {
                          typeBadgeClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
                          typeLabel = isAr ? 'تكاليف ومصروفات (Expense)' : 'Expense';
                        }

                        const indentPixels = (level - 1) * 24 + 8;

                        return (
                          <tr
                            key={acc.id}
                            className={`transition-colors ${
                              isHeader
                                ? 'bg-slate-50/70 dark:bg-slate-800/30 font-bold'
                                : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                            }`}
                          >
                            {/* CODE */}
                            <td className="p-3 font-mono font-bold text-xs">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md border font-mono ${
                                  level === 1
                                    ? 'bg-[#7F1625] text-white border-[#7F1625]'
                                    : level === 2
                                    ? 'bg-red-50 dark:bg-red-950/40 text-[#7F1625] dark:text-red-400 border-red-200 dark:border-red-900/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {acc.code}
                              </span>
                            </td>

                            {/* ACCOUNT NAME WITH TREE CONNECTOR & EXPAND BUTTON */}
                            <td className="p-3">
                              <div className="flex items-center" style={{ paddingInlineStart: `${indentPixels}px` }}>
                                {hasChildren ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleAccountExpand(acc.id)}
                                    className="p-1 rounded-md text-slate-500 hover:text-[#7F1625] hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors me-1.5 shrink-0"
                                    title={isExpanded ? (isAr ? 'طي الفرع' : 'Collapse') : (isAr ? 'فتح الفرع' : 'Expand')}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-[#7F1625] dark:text-red-400" />
                                    ) : (
                                      <ChevronLeft className="w-4 h-4" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="w-4 me-1.5 inline-block text-slate-300 dark:text-slate-600 text-center font-mono">
                                    {level > 1 ? '└─' : '•'}
                                  </span>
                                )}

                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-xs truncate ${
                                        level === 1
                                          ? 'font-black text-sm text-[#7F1625] dark:text-red-400'
                                          : level === 2
                                          ? 'font-bold text-slate-900 dark:text-white'
                                          : 'font-semibold text-slate-800 dark:text-slate-200'
                                      }`}
                                    >
                                      {acc.name}
                                    </span>
                                    {hasChildren && (
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        ({acc.children?.length} {isAr ? 'فرعي' : 'subs'})
                                      </span>
                                    )}
                                  </div>
                                  {acc.name_en && (
                                    <span className="text-[11px] text-slate-400 block font-normal font-sans">
                                      {acc.name_en}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* LEVEL */}
                            <td className="p-3 text-center font-mono text-xs">
                              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                L{level}
                              </span>
                            </td>

                            {/* TYPE */}
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${typeBadgeClass}`}>
                                {typeLabel}
                              </span>
                            </td>

                            {/* NORMAL BALANCE (DEBIT / CREDIT) */}
                            <td className="p-3 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  acc.normal_balance === 'debit'
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                }`}
                              >
                                {acc.normal_balance === 'debit' ? (isAr ? 'مدين (Dr)' : 'Debit') : (isAr ? 'دائن (Cr)' : 'Credit')}
                              </span>
                            </td>

                            {/* POSTABLE STATUS */}
                            <td className="p-3 text-center">
                              {!isHeader ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{isAr ? 'يقبل الترحيل' : 'Postable'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  <Lock className="w-3 h-3" />
                                  <span>{isAr ? 'رئيسي تجميعي' : 'Header'}</span>
                                </span>
                              )}
                            </td>

                            {/* CURRENT BALANCE */}
                            <td className="p-3 text-end font-mono font-bold text-xs">
                              <span className={Number(acc.current_balance) !== 0 ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                                {Number(acc.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
                            </td>

                            {/* ACTIONS */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* STATEMENT */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAccountForStatement(acc);
                                    setIsStatementModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-[#7F1625] dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={isAr ? 'كشف حساب الأستاذ العام' : 'Account Statement'}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* ADD SUB ACCOUNT */}
                                <button
                                  type="button"
                                  onClick={() => openAddSubAccount(acc)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={isAr ? 'إضافة حساب فرعي متفرع من هذا الحساب' : 'Add Sub-Account'}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>

                                {/* EDIT ACCOUNT */}
                                <button
                                  type="button"
                                  onClick={() => openEditAccount(acc)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title={isAr ? 'تعديل بيانات الحساب' : 'Edit Account'}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
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
          </div>
        );
      })()}

      {/* 2. JOURNALS VIEW */}
      {activeSubTab === 'journals' && (() => {
        // Calculations
        const totalDebitVolume = journals.reduce((sum, j) => sum + Number(j.total_debit || 0), 0);
        const activeJournalsCount = journals.filter((j) => j.status !== 'reversed').length;
        const autoSystemCount = journals.filter(
          (j) =>
            (j.reference_type &&
              !['manual_journal', 'expense_voucher'].includes(j.reference_type)) ||
            j.entry_number?.startsWith('JE-')
        ).length;
        const manualExpenseCount = journals.length - autoSystemCount;

        // Filtering
        const q = journalSearchQuery.trim().toLowerCase();
        const filteredJournals = journals.filter((j) => {
          const num = (j.entry_number || '').toLowerCase();
          const desc = (j.description || '').toLowerCase();
          const ref = (j.reference_type || '').toLowerCase();
          const linesMatch = j.lines?.some(
            (l) =>
              (l.account?.code || '').toLowerCase().includes(q) ||
              (l.account?.name || '').toLowerCase().includes(q) ||
              (l.description || '').toLowerCase().includes(q)
          );

          const matchesSearch = !q || num.includes(q) || desc.includes(q) || ref.includes(q) || linesMatch;

          let matchesType = true;
          const isRev = j.status === 'reversed';
          const isOpening = j.reference_type === 'opening_balance' || desc.includes('افتتاحي') || num.includes('OPENING');
          const isExpense = j.reference_type === 'expense_voucher' || desc.includes('مصروف') || desc.includes('سداد');
          const isSystem = (j.reference_type && !['manual_journal', 'expense_voucher'].includes(j.reference_type)) || num.startsWith('JE-');

          if (journalFilterType === 'system') matchesType = isSystem && !isOpening;
          else if (journalFilterType === 'expenses') matchesType = isExpense;
          else if (journalFilterType === 'opening') matchesType = isOpening;
          else if (journalFilterType === 'manual') matchesType = !isSystem && !isOpening && !isExpense;
          else if (journalFilterType === 'reversed') matchesType = isRev;

          return matchesSearch && matchesType;
        });

        // Helper for Journal Badge
        const getJournalBadge = (j: JournalEntry) => {
          const desc = (j.description || '').toLowerCase();
          const ref = (j.reference_type || '').toLowerCase();
          const num = (j.entry_number || '').toUpperCase();

          if (ref === 'opening_balance' || desc.includes('افتتاحي') || num.includes('OPENING')) {
            return {
              label: isAr ? '🏛️ قيد افتتاحي' : 'Opening Entry',
              badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
            };
          }
          if (ref === 'cutting_order' || num.includes('CUT') || desc.includes('قص')) {
            return {
              label: isAr ? '✂️ صرف خامات أمر قص' : 'Cutting Order Issue',
              badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
            };
          }
          if (ref === 'maintenance' || num.includes('MNT') || desc.includes('صيانة')) {
            return {
              label: isAr ? '🔧 مصروفات صيانة' : 'Maintenance Expense',
              badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
            };
          }
          if (ref === 'receipt_voucher' || num.includes('RCV') || desc.includes('قبض') || desc.includes('تحصيل')) {
            return {
              label: isAr ? '💵 سند تحصيل وقبض' : 'Customer Receipt',
              badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
            };
          }
          if (ref === 'sales_return' || num.includes('SRT') || desc.includes('مرتجع')) {
            return {
              label: isAr ? '↩️ مرتجع مبيعات' : 'Sales Return',
              badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
            };
          }
          if (ref === 'refund' || num.includes('REF') || desc.includes('استرداد')) {
            return {
              label: isAr ? '💸 صرف استرداد نقدي' : 'Cash Refund',
              badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
            };
          }
          if (ref === 'expense_voucher' || desc.includes('مصروف') || desc.includes('سداد')) {
            return {
              label: isAr ? '💸 مصروف وسداد يومي' : 'Daily Expense',
              badgeClass: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
            };
          }
          return {
            label: isAr ? '📑 قيد تسوية عام' : 'Journal Entry',
            badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
          };
        };

        return (
          <div className="space-y-4">
            {/* ─── TOP 4 KPI CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr ? 'إجمالي حركة القيود اليومية' : 'Total Journal Turnover'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {totalDebitVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? `${journals.length} قيد مسجل في الأستاذ العام` : `${journals.length} total entries`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr ? 'القيود المعتمدة والمقيدة' : 'Active Verified Entries'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {activeJournalsCount}
                  </span>
                  <span className="text-xs text-slate-400">{isAr ? 'قيد ساري' : 'Entries'}</span>
                </div>
                <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {isAr ? 'جميعها متوازنة (المدين = الدائن)' : 'All entries 100% balanced'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr ? 'قيود النظام التلقائية' : 'Automated System Entries'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {autoSystemCount}
                  </span>
                  <span className="text-xs text-slate-400">{isAr ? 'قيد آلي' : 'Auto Entries'}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'مبيعات، قص، صيانة، وتحصيلات' : 'Sales, cutting, maintenance'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isAr ? 'المصروفات والقيود اليومية' : 'Daily Expenses & Manual'}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:text-red-400 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {manualExpenseCount}
                  </span>
                  <span className="text-xs text-slate-400">{isAr ? 'قيد' : 'Entries'}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'سدادات ومصروفات ونثريات المصنع' : 'Factory payments & adjustments'}
                </p>
              </div>
            </div>

            {/* ─── MAIN JOURNALS CARD ─── */}
            <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              {/* HEADER TOOLBAR WITH 2 ADD BUTTONS */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#7F1625] dark:text-red-400" />
                    <span>{isAr ? 'دفتر قيود اليومية العامة (General Journal Ledger)' : 'General Journal Ledger'}</span>
                    <span className="text-xs font-mono font-medium text-slate-500">({filteredJournals.length} قيد)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAr
                      ? 'سجل القيود المحاسبية المزدوجة المتوازنة، القيود الآلية من خطوط الإنتاج والمبيعات، وطباعة سندات القيد الرسمية A4.'
                      : 'Double-entry ledger with automated factory postings and official A4 voucher printing.'}
                  </p>
                </div>

                {/* THE TWO BUTTONS FOR ADDING */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* METHOD 1: QUICK EXPENSE */}
                  <Button
                    size="sm"
                    onClick={() => setIsQuickExpenseModalOpen(true)}
                    className="bg-[#7F1625] hover:bg-[#961b2c] text-white shadow-xs font-bold"
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {isAr ? '+ تسجيل مصروف وسداد يومي' : '+ Quick Expense'}
                  </Button>

                  {/* METHOD 2: ADVANCED BALANCED JOURNAL ENTRY */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAdvancedJournalModalOpen(true)}
                    icon={<Receipt className="w-3.5 h-3.5" />}
                  >
                    {isAr ? '+ قيد محاسبي مركب' : '+ Advanced Journal'}
                  </Button>
                </div>
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="p-3 bg-white dark:bg-[#0c121e] border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                {/* SEARCH */}
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={journalSearchQuery}
                    onChange={(e) => setJournalSearchQuery(e.target.value)}
                    placeholder={isAr ? 'بحث برقم القيد، البيان، اسم الحساب...' : 'Search by entry #, desc, account...'}
                    className="w-full ps-9 pe-8 py-1.5 text-xs bg-slate-50 dark:bg-[#0d131f] border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#7F1625]"
                  />
                  {journalSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setJournalSearchQuery('')}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* FILTER PILLS */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-medium me-1">{isAr ? 'نوع القيد:' : 'Filter:'}</span>
                  {(
                    [
                      { id: 'all', label: isAr ? 'الكل' : 'All' },
                      { id: 'system', label: isAr ? '⚡ قيود النظام الآلية' : 'Auto System' },
                      { id: 'expenses', label: isAr ? '💸 مصروفات وسدادات' : 'Expenses' },
                      { id: 'opening', label: isAr ? '🏛️ قيود افتتاحية' : 'Opening' },
                      { id: 'manual', label: isAr ? '✏️ قيود يدوية' : 'Manual' },
                      { id: 'reversed', label: isAr ? '↩️ معكوس ملغي' : 'Reversed' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setJournalFilterType(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                        journalFilterType === f.id
                          ? 'bg-[#7F1625] text-white shadow-xs font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── JOURNAL ENTRY BENTO CARDS ─── */}
              <div className="p-4 space-y-4 bg-slate-50/40 dark:bg-[#0a0f19]/40">
                {filteredJournals.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <p className="font-bold text-slate-600 dark:text-slate-300">
                      {isAr ? 'لا توجد قيود يومية مطابقة لمعايير البحث' : 'No journal entries found'}
                    </p>
                    <p className="text-xs mt-1">
                      {isAr
                        ? 'يمكنك تسجيل مصروف وسداد سريع من زر «+ تسجيل مصروف وسداد يومي» بالأعلى.'
                        : 'Record a quick expense using the button above.'}
                    </p>
                  </div>
                ) : (
                  filteredJournals.map((j) => {
                    const badge = getJournalBadge(j);
                    const isReversed = j.status === 'reversed';
                    const cleanDate = formatCleanDate(j.entry_date || (j as any).created_at);
                    const totalDebit = Number(j.total_debit || 0);
                    const totalCredit = Number(j.total_credit || 0);

                    return (
                      <div
                        key={j.id}
                        className="rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-all hover:border-[#7F1625]/40"
                      >
                        {/* CARD HEADER */}
                        <div className="p-3.5 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* ENTRY NUMBER (CLICKABLE TO PRINT) */}
                            <button
                              type="button"
                              onClick={() => setSelectedJournalForPrint(j)}
                              className="font-mono font-black text-xs text-[#7F1625] dark:text-red-400 hover:underline px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 flex items-center gap-1.5 transition-colors"
                              title={isAr ? 'معاينة وطباعة سند قيد اليومية A4' : 'Print Voucher'}
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{j.entry_number}</span>
                            </button>

                            {/* TYPE BADGE */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.badgeClass}`}>
                              {badge.label}
                            </span>

                            {/* DATE */}
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{cleanDate}</span>
                            </span>

                            {/* STATUS BADGE */}
                            {isReversed ? (
                              <Badge variant="danger" className="text-[11px] gap-1">
                                <RotateCw className="w-3 h-3" />
                                <span>{isAr ? 'معكوس / ملغي' : 'Reversed'}</span>
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[11px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <CheckCircle className="w-3 h-3" />
                                <span>{isAr ? 'معتمد ومقيد' : 'Posted'}</span>
                              </Badge>
                            )}

                            {j.reversal_reason && (
                              <span className="text-xs text-rose-500 font-medium truncate max-w-xs">
                                ({j.reversal_reason})
                              </span>
                            )}
                          </div>

                          {/* ACTIONS & TOTALS ON HEADER */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-slate-400">=</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                            </div>

                            {/* QUICK PRINT BUTTON */}
                            <button
                              type="button"
                              onClick={() => setSelectedJournalForPrint(j)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#7F1625] dark:hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                              title={isAr ? 'طباعة سند القيد A4' : 'Print Voucher A4'}
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* DROPDOWN ACTIONS */}
                            <ActionsMenu
                              variant="icon-horizontal"
                              align={isAr ? 'left' : 'right'}
                              items={[
                                {
                                  id: 'print-voucher',
                                  label: isAr ? 'طباعة سند القيد الرسمي (A4)' : 'Print Official Voucher (A4)',
                                  icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                                  onClick: () => setSelectedJournalForPrint(j),
                                },
                                ...(j.status === 'posted' && !j.reversed_entry_id
                                  ? [
                                      {
                                        id: 'reverse-journal',
                                        label: isAr ? 'عكس وإلغاء القيد المحاسبي' : 'Reverse Journal Entry',
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

                        {/* GENERAL DESCRIPTION */}
                        <div className="px-4 py-2.5 text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0c121e]">
                          <span className="font-bold text-slate-500 dark:text-slate-400 me-1.5">{isAr ? 'البيان:' : 'Desc:'}</span>
                          <span className="font-medium">{j.description || '—'}</span>
                        </div>

                        {/* BALANCED LINES TABLE */}
                        <div className="overflow-x-auto border-t border-slate-100 dark:border-slate-800/80">
                          <table className="w-full text-start text-xs">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                <th className="p-2.5 text-start w-32">{isAr ? 'كود الحساب' : 'Code'}</th>
                                <th className="p-2.5 text-start">{isAr ? 'اسم الحساب في الدليل' : 'Account'}</th>
                                <th className="p-2.5 text-start">{isAr ? 'البيان وملاحظات السطر' : 'Line Notes'}</th>
                                <th className="p-2.5 text-end w-36">{isAr ? 'الطرف المدين (+)' : 'Debit (+)'}</th>
                                <th className="p-2.5 text-end w-36">{isAr ? 'الطرف الدائن (-)' : 'Credit (-)'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                              {j.lines?.map((line, idx) => {
                                const debit = Number(line.debit || 0);
                                const credit = Number(line.credit || 0);
                                const accCode = line.account?.code || (line as any).account_code || '—';
                                const accName = line.account?.name || (line as any).account_name || line.description || '—';

                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                      {accCode}
                                    </td>
                                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                                      {accName}
                                      {line.cost_center_id && (
                                        <span className="text-[10px] text-[#7F1625] dark:text-red-400 ms-1.5 font-mono">
                                          [مركز تكلفة]
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-xs">
                                      {line.description || j.description || '—'}
                                    </td>
                                    <td className="p-2.5 text-end font-mono">
                                      {debit > 0 ? (
                                        <span className="inline-block px-2 py-0.5 rounded-md font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                                          +{debit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                      )}
                                    </td>
                                    <td className="p-2.5 text-end font-mono">
                                      {credit > 0 ? (
                                        <span className="inline-block px-2 py-0.5 rounded-md font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20">
                                          {credit.toLocaleString(undefined, { minimumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                                        </span>
                                      ) : (
                                        <span className="text-slate-300 dark:text-slate-600">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        );
      })()}

      {/* 3. FINANCIAL ACCOUNTS (CASH & BANKS & TRANSFERS & LOANS) */}
      {activeSubTab === 'financial_accounts' && (() => {
        // KPI calculations
        const totalLiquidity = financialAccounts.reduce((sum, fa) => sum + Number(fa.current_balance || 0), 0);
        const totalBankBalances = financialAccounts.filter((fa) => fa.type === 'bank').reduce((sum, fa) => sum + Number(fa.current_balance || 0), 0);
        const totalVaultBalances = financialAccounts.filter((fa) => fa.type === 'cash').reduce((sum, fa) => sum + Number(fa.current_balance || 0), 0);
        const completedTransfers = transfers.filter((t) => t.status === 'completed');
        const totalTransfersVolume = completedTransfers.reduce((sum, t) => sum + Number(t.amount || 0), 0);

        // Bank Loans KPIs
        const totalLoanObligations = bankLoans.reduce((sum, l) => sum + Number(l.total_loan_amount || 0), 0);
        const totalLoanPaid = bankLoans.reduce((sum, l) => sum + Number(l.paid_amount || 0), 0);
        const totalLoanRemaining = bankLoans.reduce((sum, l) => sum + Number(l.remaining_amount || 0), 0);

        const allPendingInstallments = bankLoans.flatMap((l) =>
          l.installments.filter((i) => i.status === 'pending').map((i) => ({ ...i, loan: l }))
        ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        const nextUpcomingInstallment = allPendingInstallments[0] || null;

        // Filter financial accounts
        const filteredFinancialAccounts = financialAccounts.filter((fa) => {
          if (finFilterType !== 'all' && fa.type !== finFilterType) return false;
          if (finSearchQuery.trim()) {
            const q = finSearchQuery.toLowerCase();
            const matchName = fa.name?.toLowerCase().includes(q);
            const matchCode = fa.code?.toLowerCase().includes(q);
            const matchBank = fa.bank_name?.toLowerCase().includes(q);
            const matchAccNum = fa.account_number?.toLowerCase().includes(q);
            if (!matchName && !matchCode && !matchBank && !matchAccNum) return false;
          }
          return true;
        });

        // Filter transfers
        const filteredTransfers = transfers.filter((t) => {
          if (trfFilterStatus !== 'all' && t.status !== trfFilterStatus) return false;
          if (trfSearchQuery.trim()) {
            const q = trfSearchQuery.toLowerCase();
            const matchNum = t.transfer_number?.toLowerCase().includes(q);
            const matchFrom = t.from_account?.name?.toLowerCase().includes(q);
            const matchTo = t.to_account?.name?.toLowerCase().includes(q);
            const matchNotes = t.notes?.toLowerCase().includes(q);
            if (!matchNum && !matchFrom && !matchTo && !matchNotes) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Top View Selector Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', labelAr: 'الكل (خزائن وبنوك وقروض)', labelEn: 'All Overview', icon: Landmark, count: financialAccounts.length + bankLoans.length },
                  { id: 'accounts', labelAr: '🏛️ حسابات الخزائن والبنوك', labelEn: 'Cash & Banks', icon: Building2, count: financialAccounts.length },
                  { id: 'transfers', labelAr: '🔄 سجل التحويلات الداخلية', labelEn: 'Internal Transfers', icon: ArrowRightLeft, count: transfers.length },
                  { id: 'loans', labelAr: '💳 قروض وتسهيلات البنوك والأقساط', labelEn: 'Bank Loans & Facilities', icon: CreditCard, count: bankLoans.length },
                ].map((v) => {
                  const Icon = v.icon;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setFinSectionView(v.id as any)}
                      className={`px-3.5 py-1.5 text-xs rounded-xl font-bold transition-all cursor-pointer flex items-center gap-2 ${
                        finSectionView === v.id
                          ? 'bg-[#7F1625] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{isAr ? v.labelAr : v.labelEn}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                        {v.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsNewLoanModalOpen(true)}
                  className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold text-xs"
                  icon={<CreditCard className="w-3.5 h-3.5" />}
                >
                  {isAr ? '+ تسجيل قرض بنكي جديد' : '+ New Loan'}
                </Button>
              </div>
            </div>

            {/* Top 4 Treasury Liquidity KPI Bento Cards */}
            {(finSectionView === 'all' || finSectionView === 'accounts' || finSectionView === 'transfers') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Liquidity */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-[#7F1625]/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isAr ? 'إجمالي السيولة النقدية والمصرفية' : 'Total Treasury Liquidity'}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold">
                      <Landmark className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                      {totalLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ms-1.5">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                    <span>{financialAccounts.length} {isAr ? 'حسابات وخزائن مفعلة' : 'Active accounts'}</span>
                  </p>
                </div>

                {/* Card 2: Bank Balances */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-500/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isAr ? 'أرصدة الحسابات المصرفية' : 'Bank Accounts Balances'}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-2xl font-black text-blue-600 dark:text-blue-400">
                      {totalBankBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ms-1.5">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                    <span>{financialAccounts.filter((f) => f.type === 'bank').length} {isAr ? 'حسابات بنكية جارية' : 'Bank accounts'}</span>
                  </p>
                </div>

                {/* Card 3: Vault Cash */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isAr ? 'النقدية بالخزائن والعهد' : 'Vault Cash On Hand'}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {totalVaultBalances.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ms-1.5">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                    <span>{financialAccounts.filter((f) => f.type === 'cash').length} {isAr ? 'خزائن كاش رئيسية وفرعية' : 'Cash vaults'}</span>
                  </p>
                </div>

                {/* Card 4: Transfers Volume */}
                <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs hover:border-purple-500/40 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isAr ? 'إجمالي التحويلات الداخلية' : 'Internal Transfers Volume'}
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="font-mono text-2xl font-black text-purple-600 dark:text-purple-400">
                      {totalTransfersVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-bold text-slate-400 ms-1.5">{isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
                    <span>{completedTransfers.length} {isAr ? 'حركة تحويل مرحلة بنجاح' : 'Completed transfers'}</span>
                  </p>
                </div>
              </div>
            )}

            {/* SECTION 1: FINANCIAL ACCOUNTS (BANKS & VAULTS CARDS) */}
            {(finSectionView === 'all' || finSectionView === 'accounts') && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Landmark className="w-5 h-5 text-[#7F1625] dark:text-[#ff8ba0]" />
                      {isAr ? 'حسابات الخزائن والبنوك والمحافظ الإلكترونية' : 'Cash Desks, Banks & E-Wallets'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {isAr ? 'متابعة الأرصدة النقدية الفعلية، وإدارة السحب والإيداع والتحويلات اللحظية' : 'Manage actual balances, deposits, withdrawals and transfers'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={finSearchQuery}
                        onChange={(e) => setFinSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث بالاسم أو الكود أو البنك...' : 'Search accounts...'}
                        className="ps-9 pe-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F1625] w-48 sm:w-60 font-medium"
                      />
                    </div>

                    {/* Add New Financial Account Button */}
                    <Button
                      size="sm"
                      onClick={() => setIsFinancialAccModalOpen(true)}
                      className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold text-xs shadow-xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? '+ إضافة حساب / خزينة' : '+ New Account'}
                    </Button>
                  </div>
                </div>

                {/* Filter pills */}
                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {(
                    [
                      { id: 'all', labelAr: 'جميع الحسابات', labelEn: 'All', count: financialAccounts.length },
                      { id: 'cash', labelAr: '💵 الخزائن النقدية (كاش)', labelEn: 'Cash Desks', count: financialAccounts.filter((f) => f.type === 'cash').length },
                      { id: 'bank', labelAr: '🏛️ حسابات بنكية جارية', labelEn: 'Bank Accounts', count: financialAccounts.filter((f) => f.type === 'bank').length },
                      { id: 'wallet', labelAr: '📱 محافظ إلكترونية', labelEn: 'E-Wallets', count: financialAccounts.filter((f) => f.type === 'wallet').length },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFinFilterType(tab.id)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        finFilterType === tab.id
                          ? 'bg-[#7F1625] text-white shadow-xs'
                          : 'bg-white dark:bg-[#0c121e] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Grid of Financial Account Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFinancialAccounts.map((fa) => {
                    const linkedCoa = accounts.find((a) => a.id === fa.chart_of_account_id);
                    const isBank = fa.type === 'bank';
                    const isCash = fa.type === 'cash';

                    return (
                      <div
                        key={fa.id}
                        className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 hover:border-[#7F1625]/60 dark:hover:border-[#7F1625]/60 transition-all p-5 shadow-xs flex flex-col justify-between"
                      >
                        {/* Ambient gradient */}
                        <div className="absolute top-0 end-0 w-32 h-32 bg-[#7F1625]/5 rounded-full blur-2xl group-hover:bg-[#7F1625]/10 transition-colors pointer-events-none"></div>

                        <div className="space-y-3 relative z-10">
                          {/* Top Badge & Code */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                                  isBank
                                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                    : isCash
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {isBank ? <Building2 className="w-5 h-5" /> : isCash ? <Wallet className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                              </div>
                              <div>
                                <span className="font-mono text-xs font-black text-slate-900 dark:text-white">
                                  {fa.code}
                                </span>
                                <span className="block text-[10px] text-slate-400">
                                  {isBank ? (isAr ? 'حساب بنكي' : 'Bank Account') : isCash ? (isAr ? 'خزينة نقدية' : 'Cash Vault') : (isAr ? 'محفظة إلكترونية' : 'E-Wallet')}
                                </span>
                              </div>
                            </div>

                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {isAr ? 'نشط ومتاح' : 'Active'}
                            </span>
                          </div>

                          {/* Account Name */}
                          <div>
                            <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                              {fa.name}
                            </h4>
                            {fa.bank_name ? (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {fa.bank_name} {fa.account_number ? `(${fa.account_number})` : ''}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {isAr ? 'خزينة معتمدة للنقدية والمتحصلات' : 'Certified cash desk for payments and receipts'}
                              </p>
                            )}
                          </div>

                          {/* Linked COA Account */}
                          {linkedCoa && (
                            <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                              <span className="text-slate-400 font-medium">{isAr ? 'دليل الحسابات:' : 'COA:'}</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                [{linkedCoa.code}] {linkedCoa.name}
                              </span>
                            </div>
                          )}

                          {/* Balance Highlight Box */}
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                              {isAr ? 'الرصيد الفعلي المتاح:' : 'Actual Available Balance:'}
                            </span>
                            <div className="flex items-baseline justify-between">
                              <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                {Number(fa.current_balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                              <span className="font-bold text-xs text-[#7F1625] dark:text-[#ff8ba0]">
                                {fa.currency || 'EGP'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions Footer */}
                        <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 relative z-10">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTrfFromAccId(fa.id);
                              setIsTransferModalOpen(true);
                            }}
                            className="w-full text-xs font-bold border-slate-200 dark:border-slate-700 hover:border-[#7F1625] hover:text-[#7F1625] dark:hover:text-[#ff8ba0]"
                            icon={<ArrowRightLeft className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'تحويل مالي' : 'Transfer'}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (linkedCoa) {
                                setSelectedAccountForStatement(linkedCoa);
                                setIsStatementModalOpen(true);
                              } else {
                                api.accounting.getAccounts().then((accs) => {
                                  const matched = accs.find((a: any) => a.id === fa.chart_of_account_id);
                                  if (matched) {
                                    setSelectedAccountForStatement(matched);
                                    setIsStatementModalOpen(true);
                                  }
                                });
                              }
                            }}
                            className="w-full text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            icon={<Receipt className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'كشف حركة' : 'Statement'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SECTION 2: INTERNAL TRANSFERS LOG */}
            {(finSectionView === 'all' || finSectionView === 'transfers') && (
              <Card className="bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                {/* Header with Title and Actions */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5 text-[#7F1625] dark:text-[#ff8ba0]" />
                      {isAr ? 'سجل التحويلات المالية الداخلية بين الخزائن والبنوك' : 'Internal Funds Transfers Ledger'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAr ? 'سجل تداول السيولة النقدية والمصرفية مع القيود المحاسبية التلقائية وتوثيق السندات المعتمدة' : 'Treasury transfers ledger with automatic double entries and printable vouchers'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search Transfers */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={trfSearchQuery}
                        onChange={(e) => setTrfSearchQuery(e.target.value)}
                        placeholder={isAr ? 'بحث برقم السند أو الحساب...' : 'Search transfers...'}
                        className="ps-9 pe-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#7F1625] w-48 sm:w-60 font-medium"
                      />
                    </div>

                    {/* New Transfer Button */}
                    <Button
                      size="sm"
                      onClick={() => setIsTransferModalOpen(true)}
                      className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold text-xs shadow-xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? '+ تحويل مالي جديد' : '+ New Transfer'}
                    </Button>
                  </div>
                </div>

                {/* Status Filter Tabs */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: 'all', labelAr: 'جميع التحويلات', labelEn: 'All', count: transfers.length },
                      { id: 'completed', labelAr: '✓ مكتملة ومرحلة', labelEn: 'Completed', count: completedTransfers.length },
                      { id: 'reversed', labelAr: '✕ ملغاة ومعكوسة', labelEn: 'Reversed', count: transfers.filter((t) => t.status === 'reversed').length },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setTrfFilterStatus(tab.id)}
                      className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        trfFilterStatus === tab.id
                          ? 'bg-[#7F1625] text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 font-mono">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Transfers List / Bento Rows */}
                <div className="p-4 sm:p-5 space-y-3">
                  {filteredTransfers.length === 0 ? (
                    <div className="py-12 text-center space-y-3 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      <div className="w-12 h-12 rounded-2xl bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] mx-auto flex items-center justify-center font-bold">
                        <ArrowRightLeft className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {isAr ? 'لا توجد حركات تحويل مالي مطابقة' : 'No funds transfers found'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAr ? 'يمكنك تحويل مبالغ نقدية بين الخزائن والمصارف بسهولة وترحيل القيود آلياً' : 'Transfer funds between cash desks and banks with auto-balancing'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsTransferModalOpen(true)}
                        className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold text-xs"
                        icon={<Plus className="w-3.5 h-3.5" />}
                      >
                        {isAr ? '+ إجراء أول تحويل مالي' : '+ Record First Transfer'}
                      </Button>
                    </div>
                  ) : (
                    filteredTransfers.map((t) => {
                      const isReversed = t.status === 'reversed';
                      const trfDateClean = formatCleanDate(t.transfer_date || (t as any).created_at);

                      return (
                        <div
                          key={t.id}
                          className={`rounded-2xl border transition-all p-4 ${
                            isReversed
                              ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 opacity-75'
                              : 'bg-white dark:bg-[#0c121e] border-slate-200 dark:border-slate-800 hover:border-[#7F1625]/50 shadow-2xs'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Left: Transfer info & visual movement flow */}
                            <div className="space-y-3 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                  {t.transfer_number}
                                </span>

                                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                  <Clock className="w-3.5 h-3.5" />
                                  {trfDateClean}
                                </span>

                                <Badge variant={isReversed ? 'danger' : 'success'}>
                                  {isReversed ? (isAr ? 'ملغي ومعكوس' : 'Reversed') : (isAr ? 'مكتمل ومرحل بنجاح' : 'Completed')}
                                </Badge>

                                {t.journal_entry_id && (
                                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                    {isAr ? 'قيد آلي: ' : 'JE: '}
                                    {t.journal_entry?.entry_number || t.journal_entry_id.slice(0, 8)}
                                  </span>
                                )}
                              </div>

                              {/* Movement Flow Visualizer */}
                              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                {/* Source (Debit / Out) */}
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">
                                      {isAr ? 'من حساب (صرف):' : 'From:'}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {t.from_account?.name || t.from_financial_account_id}
                                    </span>
                                    {t.from_account?.code && (
                                      <span className="font-mono text-[10px] text-slate-400 ms-1 font-bold">
                                        ({t.from_account.code})
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Direction arrow in middle */}
                                <div className="hidden sm:flex items-center justify-center px-4">
                                  <ArrowRightLeft className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
                                </div>

                                {/* Destination (Credit / In) */}
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">
                                      {isAr ? 'إلى حساب (إيداع):' : 'To:'}
                                    </span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {t.to_account?.name || t.to_financial_account_id}
                                    </span>
                                    {t.to_account?.code && (
                                      <span className="font-mono text-[10px] text-slate-400 ms-1 font-bold">
                                        ({t.to_account.code})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Memo / Notes */}
                              {t.notes && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium ps-1">
                                  <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'البيان: ' : 'Memo: '}</span>
                                  {t.notes}
                                </p>
                              )}
                            </div>

                            {/* Right: Amount & Action Buttons */}
                            <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                              <div className="text-start lg:text-end">
                                <span className="text-[10px] text-slate-400 font-medium block">
                                  {isAr ? 'قيمة التحويل' : 'Transfer Amount'}
                                </span>
                                <div className="flex items-baseline gap-1">
                                  <span className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                                    {Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0]">
                                    {isAr ? 'ج.م' : 'EGP'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Print Voucher Button */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedTransferForPrint(t)}
                                  className="text-xs font-bold border-slate-200 dark:border-slate-700 hover:border-[#7F1625] hover:text-[#7F1625] dark:hover:text-[#ff8ba0]"
                                  icon={<Printer className="w-3.5 h-3.5" />}
                                >
                                  {isAr ? 'طباعة السند' : 'Print'}
                                </Button>

                                {/* Reverse Action Button */}
                                {!isReversed && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setReversalTarget({ type: 'transfer', id: t.id, number: t.transfer_number });
                                      setIsReversalModalOpen(true);
                                    }}
                                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    icon={<RotateCw className="w-3.5 h-3.5" />}
                                  >
                                    {isAr ? 'عكس التحويل' : 'Reverse'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}

            {/* SECTION 3: BANK LOANS & CREDIT FACILITIES */}
            {(finSectionView === 'all' || finSectionView === 'loans') && (
              <div className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                {/* Header with Title and Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-[#7F1625] dark:text-[#ff8ba0]" />
                      {isAr ? 'قروض وتسهيلات البنوك وجدول سداد الأقساط' : 'Bank Loans & Credit Facilities'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {isAr
                        ? 'متابعة خطوط التمويل المصرفي الممنوحة للمصنع، مواعيد استحقاق الأقساط، والسداد اللحظي مع إثبات القيود'
                        : 'Track factory bank financing, installment maturities, and direct accounting payments'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => setIsNewLoanModalOpen(true)}
                      className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold text-xs shadow-xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? '+ تسجيل قرض أو تسهيل جديد' : '+ New Bank Loan'}
                    </Button>
                  </div>
                </div>

                {/* Loans Top 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Obligations */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isAr ? 'إجمالي الالتزامات والتمويل' : 'Total Financing Obligations'}
                      </span>
                      <CreditCard className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-xl font-black text-slate-900 dark:text-white">
                        {totalLoanObligations.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {bankLoans.length} {isAr ? 'عقود تمويل بنكي' : 'Loan contracts'}
                    </p>
                  </div>

                  {/* Total Paid */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isAr ? 'إجمالي الأقساط المسددة' : 'Total Paid Installments'}
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                        {totalLoanPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {totalLoanObligations > 0
                        ? `${Math.round((totalLoanPaid / totalLoanObligations) * 100)}% ${isAr ? 'نسبة السداد الكلي' : 'Paid'}`
                        : '0%'}
                    </p>
                  </div>

                  {/* Remaining Balance */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isAr ? 'الرصيد المتبقي للبنوك' : 'Remaining Loan Debt'}
                      </span>
                      <Landmark className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-xl font-black text-rose-600 dark:text-rose-400">
                        {totalLoanRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs font-bold text-slate-400 ms-1">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isAr ? 'شامل أصل الدين والفوائد' : 'Principal & Interest'}
                    </p>
                  </div>

                  {/* Next Upcoming Installment */}
                  <div className="p-4 rounded-2xl bg-linear-to-br from-[#7F1625]/10 to-[#7F1625]/5 border border-[#7F1625]/30 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0]">
                          {isAr ? '⏰ القسط القادم الأقرب:' : 'Next Due Installment:'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#7F1625] text-white">
                          {nextUpcomingInstallment ? `${formatCleanDate(nextUpcomingInstallment.due_date)}` : '—'}
                        </span>
                      </div>
                      {nextUpcomingInstallment ? (
                        <div className="mt-1">
                          <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                            {Number(nextUpcomingInstallment.total_amount).toLocaleString()} ج.م
                          </span>
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 truncate">
                            قسط ({nextUpcomingInstallment.installment_number}) — {nextUpcomingInstallment.loan.name}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                          {isAr ? 'لا توجد أقساط معلقة حالياً' : 'No pending installments'}
                        </p>
                      )}
                    </div>
                    {nextUpcomingInstallment && (
                      <button
                        onClick={() => {
                          setSelectedInstallmentForPay({
                            loan: nextUpcomingInstallment.loan,
                            installment: nextUpcomingInstallment,
                          });
                          setIsPayInstallmentModalOpen(true);
                        }}
                        className="mt-2 w-full py-1 text-center text-xs font-bold rounded-lg bg-[#7F1625] hover:bg-[#961b2c] text-white transition-colors cursor-pointer"
                      >
                        {isAr ? 'سداد هذا القسط الآن' : 'Pay This Installment'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Loans Bento Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bankLoans.map((loan) => {
                    const percentPaid = loan.total_loan_amount > 0 ? Math.round((loan.paid_amount / loan.total_loan_amount) * 100) : 0;
                    const pendingInsts = loan.installments.filter((i) => i.status === 'pending');
                    const nextInst = pendingInsts[0] || null;

                    return (
                      <div
                        key={loan.id}
                        className="rounded-2xl bg-white dark:bg-[#0c121e] border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 hover:border-[#7F1625]/40 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                                  {loan.loan_number}
                                </span>
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                                  {loan.bank_name}
                                </span>
                              </div>
                              <h4 className="font-black text-sm text-slate-900 dark:text-white">
                                {loan.name}
                              </h4>
                              {loan.contract_number && (
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {isAr ? 'رقم العقد:' : 'Contract:'} {loan.contract_number}
                                </p>
                              )}
                            </div>

                            <Badge variant={loan.status === 'completed' ? 'success' : 'info'}>
                              {loan.status === 'completed'
                                ? (isAr ? 'مسدد بالكامل ✓' : 'Paid Off')
                                : (isAr ? 'نشط وجاري السداد' : 'Active')}
                            </Badge>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">{isAr ? 'نسبة الوفاء بالقرض:' : 'Payoff Progress:'}</span>
                              <span className="font-mono font-bold text-[#7F1625] dark:text-[#ff8ba0]">{percentPaid}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                style={{ width: `${percentPaid}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                              <span>{isAr ? 'مسدد:' : 'Paid:'} {Number(loan.paid_amount).toLocaleString()} ج.م</span>
                              <span>{isAr ? 'متبقي:' : 'Rem:'} {Number(loan.remaining_amount).toLocaleString()} ج.م</span>
                            </div>
                          </div>

                          {/* Loan Numbers Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                              <span className="text-[10px] text-slate-400 block">{isAr ? 'أصل التمويل:' : 'Principal:'}</span>
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {Number(loan.principal_amount).toLocaleString()} ج.م
                              </span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80">
                              <span className="text-[10px] text-slate-400 block">{isAr ? 'الفائدة الإجمالية:' : 'Total Interest:'}</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                {loan.interest_rate}% ({Number(loan.interest_amount).toLocaleString()} ج.م)
                              </span>
                            </div>
                          </div>

                          {/* Next Installment Banner */}
                          {nextInst ? (
                            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-xs">
                              <div>
                                <span className="text-[10px] text-amber-800 dark:text-amber-300 font-bold block">
                                  {isAr ? `القسط القادم (${nextInst.installment_number} من ${loan.installments_count}):` : `Next (${nextInst.installment_number}/${loan.installments_count}):`}
                                </span>
                                <span className="font-mono font-black text-slate-900 dark:text-white">
                                  {Number(nextInst.total_amount).toLocaleString()} ج.م
                                </span>
                                <span className="text-[10px] text-slate-500 ms-1.5 font-mono">
                                  ({formatCleanDate(nextInst.due_date)})
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedInstallmentForPay({ loan, installment: nextInst });
                                  setIsPayInstallmentModalOpen(true);
                                }}
                                className="px-3 py-1 rounded-lg bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                              >
                                {isAr ? 'سداد القسط' : 'Pay'}
                              </button>
                            </div>
                          ) : (
                            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300">
                              ✓ {isAr ? 'تم سداد جميع الأقساط بالكامل وإغلاق القرض' : 'All installments paid in full'}
                            </div>
                          )}
                        </div>

                        {/* Card Actions Footer */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedLoanForSchedule(loan)}
                            className="w-full text-xs font-bold border-slate-200 dark:border-slate-700 hover:border-[#7F1625]"
                            icon={<Calendar className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'جدول الأقساط' : 'Schedule'}
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedLoanForPrint(loan)}
                            className="w-full text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            icon={<Printer className="w-3.5 h-3.5" />}
                          >
                            {isAr ? 'طباعة الجدول A4' : 'Print A4'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* Edit Account Modal */}
      <Modal
        isOpen={isEditAccountModalOpen}
        onClose={() => {
          setIsEditAccountModalOpen(false);
          setSelectedAccountForEdit(null);
        }}
        title={
          isAr
            ? `تعديل الحساب: ${selectedAccountForEdit?.code || ''} - ${selectedAccountForEdit?.name || ''}`
            : `Edit Account: ${selectedAccountForEdit?.code || ''} - ${selectedAccountForEdit?.name || ''}`
        }
      >
        <form onSubmit={handleUpdateAccount} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الحساب باللغة العربية *' : 'Account Name (Arabic) *'}
            </label>
            <input
              type="text"
              required
              value={editAccName}
              onChange={(e) => setEditAccName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الحساب بالإنجليزية (اختياري)' : 'Account Name (English)'}
            </label>
            <input
              type="text"
              value={editAccNameEn}
              onChange={(e) => setEditAccNameEn(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البيان والملاحظات' : 'Notes'}
            </label>
            <textarea
              rows={2}
              value={editAccNotes}
              onChange={(e) => setEditAccNotes(e.target.value)}
              placeholder={isAr ? 'ملاحظات إضافية حول طبيعة استخدام هذا الحساب...' : 'Notes...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_postable_chk"
                checked={editAccIsPostable}
                onChange={(e) => setEditAccIsPostable(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-slate-300"
              />
              <label htmlFor="edit_is_postable_chk" className="text-xs text-slate-700 dark:text-slate-300">
                {isAr ? 'يقبل الترحيل المباشر لقيود اليومية (Postable)' : 'Postable Account'}
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_is_active_chk"
                checked={editAccIsActive}
                onChange={(e) => setEditAccIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-primary border-slate-300"
              />
              <label htmlFor="edit_is_active_chk" className="text-xs text-slate-700 dark:text-slate-300">
                {isAr ? 'حساب نشط في النظام' : 'Active Account'}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsEditAccountModalOpen(false);
                setSelectedAccountForEdit(null);
              }}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
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

      {/* Mode 1: Quick Daily Expense Modal */}
      <Modal
        isOpen={isQuickExpenseModalOpen}
        onClose={() => setIsQuickExpenseModalOpen(false)}
        title={isAr ? 'تسجيل مصروف وسداد يومي سريع (Direct Expense)' : 'Record Quick Daily Expense'}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateQuickExpense} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              {isAr
                ? 'نموذج الصرف السريع لغير المحاسبين: حدد بند المصروف (كهرباء، بوفيه، بنزين، صيانة...) والخزينة أو البنك المسدد منه، وسيتم إنشاء وترحيل قيد اليومية المزدوج المتوازن تلقائياً.'
                : 'Direct cash-out form: Select expense account, payment vault/bank, and amount. Double-entry journal voucher is automatically created and posted.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'بند المصروف المستحق (الطرف المدين) *' : 'Expense Account (Debit) *'}
              </label>
              <select
                required
                value={expenseAccountId}
                onChange={(e) => setExpenseAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="">{isAr ? '-- اختر بند المصروف --' : '-- Select Expense Account --'}</option>
                {availableExpenseAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {isAr ? acc.name : (acc.name_en || acc.name)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وسيلة أو حساب الدفع (الطرف الدائن) *' : 'Paid From / Vault (Credit) *'}
              </label>
              <select
                required
                value={expensePaymentAccountId}
                onChange={(e) => setExpensePaymentAccountId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="">{isAr ? '-- اختر الخزينة أو البنك --' : '-- Select Vault / Bank --'}</option>
                {availablePaymentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {isAr ? acc.name : (acc.name_en || acc.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المبلغ المنصرف (ج.م) *' : 'Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ السداد والصرف *' : 'Payment Date *'}
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مركز التكلفة التحليلي (اختياري)' : 'Cost Center (Optional)'}
              </label>
              <select
                value={expenseCostCenterId}
                onChange={(e) => setExpenseCostCenterId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="">{isAr ? 'بدون مركز تكلفة محدد' : 'None / General'}</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} - {cc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'شرح وبيان المصروف *' : 'Expense Memo / Notes *'}
            </label>
            <input
              type="text"
              required
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              placeholder={isAr ? 'مثال: فاتورة كهرباء عنابر التشغيل لشهر نوفمبر / سلفة بوفيه / صيانة مقص' : 'e.g. Electricity bill / Factory lunch buffet / Machine parts'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {/* Double entry live preview */}
          {expenseAmount > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                <span>{isAr ? 'المعاينة المحاسبية للقيد المزدوج الآلي:' : 'Automatic Double-Entry Preview:'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isAr ? 'متوازن تلقائياً 100%' : '100% Balanced'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  [من حـ/ {accounts.find((a) => a.id === expenseAccountId)?.name || (isAr ? 'حساب المصروف' : 'Expense')}]:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  +{Number(expenseAmount).toLocaleString()} ج.م (مدين)
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-rose-700 dark:text-rose-300 font-bold">
                  [إلى حـ/ {accounts.find((a) => a.id === expensePaymentAccountId)?.name || (isAr ? 'حساب الخزينة/البنك' : 'Payment Vault')}]:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  -{Number(expenseAmount).toLocaleString()} ج.م (دائن)
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsQuickExpenseModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !expenseAccountId || !expensePaymentAccountId || expenseAmount <= 0}
              className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold"
            >
              {isSubmitting ? (isAr ? 'جاري الترحيل...' : 'Posting...') : (isAr ? 'ترحيل المصروف وإثبات القيد' : 'Post Expense Voucher')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mode 2: Advanced Multi-Line Journal Entry Modal */}
      <Modal
        isOpen={isAdvancedJournalModalOpen}
        onClose={() => setIsAdvancedJournalModalOpen(false)}
        title={isAr ? 'قيد محاسبي مركب متوازن (Advanced Multi-Line Journal Entry)' : 'New Multi-Line Journal Entry'}
        maxWidth="xl"
      >
        <form onSubmit={handleCreateAdvancedJournal} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'البيان العام للقيد *' : 'General Journal Memo *'}
              </label>
              <input
                type="text"
                required
                value={advJournalDesc}
                onChange={(e) => setAdvJournalDesc(e.target.value)}
                placeholder={isAr ? 'مثال: تسوية فروق الجرد / قيد استحقاق رواتب وأجور نوفمبر / سداد موردين متعدد' : 'e.g. End of month inventory adjustment / Payroll allocation'}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ القيد *' : 'Entry Date *'}
              </label>
              <input
                type="date"
                required
                value={advJournalDate}
                onChange={(e) => setAdvJournalDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Dynamic Lines Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'أطراف القيد اليومية (المدين والدائن):' : 'Journal Entry Lines (Debits & Credits):'}
              </span>
              <button
                type="button"
                onClick={addAdvLine}
                className="text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {isAr ? 'إضافة سطر طرف جديد' : 'Add Line'}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 text-start font-bold w-[34%]">{isAr ? 'الحساب المالي *' : 'Account *'}</th>
                    <th className="p-2.5 text-start font-bold w-[16%]">{isAr ? 'مدين (+)' : 'Debit (+)'}</th>
                    <th className="p-2.5 text-start font-bold w-[16%]">{isAr ? 'دائن (-)' : 'Credit (-)'}</th>
                    <th className="p-2.5 text-start font-bold w-[22%]">{isAr ? 'شرح السطر' : 'Line Memo'}</th>
                    <th className="p-2.5 text-center font-bold w-[8%]">{isAr ? 'مركز تكلفة' : 'CC'}</th>
                    <th className="p-2.5 text-center font-bold w-[4%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {advJournalLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="p-2">
                        <select
                          required
                          value={line.account_id}
                          onChange={(e) => updateAdvLine(idx, 'account_id', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                        >
                          <option value="">{isAr ? '-- اختر الحساب --' : '-- Select Account --'}</option>
                          {accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit || ''}
                          onChange={(e) => updateAdvLine(idx, 'debit', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-emerald-600 dark:text-emerald-400 text-end"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit || ''}
                          onChange={(e) => updateAdvLine(idx, 'credit', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-rose-600 dark:text-rose-400 text-end"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={line.description || ''}
                          onChange={(e) => updateAdvLine(idx, 'description', e.target.value)}
                          placeholder={isAr ? 'شرح خاص بالسطر...' : 'Line description...'}
                          className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={line.cost_center_id || ''}
                          onChange={(e) => updateAdvLine(idx, 'cost_center_id', e.target.value)}
                          className="w-full px-1.5 py-1.5 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white"
                        >
                          <option value="">-</option>
                          {costCenters.map((cc) => (
                            <option key={cc.id} value={cc.id}>
                              {cc.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-center">
                        {advJournalLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeAdvLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real-time verification box */}
          <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60">
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold block">
                  {isAr ? 'إجمالي المدين' : 'Total Debit'}
                </span>
                <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {advTotalDebit.toLocaleString()} ج.م
                </span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40">
                <span className="text-[11px] text-rose-800 dark:text-rose-300 font-bold block">
                  {isAr ? 'إجمالي الدائن' : 'Total Credit'}
                </span>
                <span className="font-mono text-sm font-black text-rose-600 dark:text-rose-400">
                  {advTotalCredit.toLocaleString()} ج.م
                </span>
              </div>
              <div
                className={`p-2 rounded-lg border flex flex-col justify-center items-center ${
                  isAdvBalanced
                    ? 'bg-emerald-100/50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-100/50 dark:bg-rose-900/30 border-rose-400 text-rose-800 dark:text-rose-200'
                }`}
              >
                <span className="text-[11px] font-bold">
                  {isAdvBalanced ? (isAr ? 'حالة التوازن: متطابق ✓' : 'Balanced ✓') : (isAr ? 'فارق عدم التوازن' : 'Imbalance')}
                </span>
                <span className="font-mono text-xs font-bold">
                  {isAdvBalanced ? (isAr ? '0.00 ج.م' : '0.00 EGP') : `${advDiff.toLocaleString()} ج.م`}
                </span>
              </div>
            </div>
            {!isAdvBalanced && advTotalDebit > 0 && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold mt-2 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {isAr
                  ? 'لا يمكن ترحيل القيد لأن أطراف المدين لا تتساوى مع أطراف الدائن.'
                  : 'Total Debits must equal Total Credits before posting.'}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsAdvancedJournalModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isAdvBalanced}
              className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold"
            >
              {isSubmitting ? (isAr ? 'جاري الاعتماد...' : 'Posting...') : (isAr ? 'ترحيل واعتماد قيد اليومية' : 'Post Journal Entry')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Official A4 Print Journal Voucher Modal */}
      <PrintJournalVoucherModal
        isOpen={!!selectedJournalForPrint}
        onClose={() => setSelectedJournalForPrint(null)}
        journalEntry={selectedJournalForPrint}
        isAr={isAr}
      />

      {/* Official A4 Print Transfer Voucher Modal */}
      <PrintTransferVoucherModal
        isOpen={!!selectedTransferForPrint}
        onClose={() => setSelectedTransferForPrint(null)}
        transfer={selectedTransferForPrint}
        isAr={isAr}
      />

      {/* New Bank Loan Modal */}
      <Modal
        isOpen={isNewLoanModalOpen}
        onClose={() => setIsNewLoanModalOpen(false)}
        title={isAr ? 'تسجيل قرض أو تسهيل بنكي جديد للمصنع' : 'Register New Bank Loan / Facility'}
        maxWidth="lg"
      >
        <form onSubmit={handleCreateLoan} className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p>
              {isAr
                ? 'إدارة التسهيلات الائتمانية: أدخل بيانات القرض ومعدل الفائدة وعدد الأقساط، وسيقوم النظام تلقائياً باحتساب الفائدة وتوليد جدول الأقساط وتواريخ استحقاقها وترحيل قيد تسييل التمويل في الحساب البنكي.'
                : 'Credit Facilities: Enter loan amount, interest rate, and installments. System automatically generates repayment schedule.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم القرض أو الغرض الاستثماري *' : 'Loan Purpose / Name *'}
              </label>
              <input
                type="text"
                required
                value={loanName}
                onChange={(e) => setLoanName(e.target.value)}
                placeholder={isAr ? 'مثال: تمويل شراء خط ماكينات خياطة سنجر كمبيوتر' : 'e.g. Machinery Financing Loan'}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'البنك المقرض / جهة التمويل *' : 'Lender Bank *'}
              </label>
              <select
                value={loanBankName}
                onChange={(e) => setLoanBankName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="البنك الأهلي المصري - فرع المصانع">البنك الأهلي المصري (NBE)</option>
                <option value="بنك مصر - قطاع تمويل المشروعات">بنك مصر (Banque Misr)</option>
                <option value="البنك التجاري الدولي (CIB)">البنك التجاري الدولي (CIB)</option>
                <option value="بنك قطر الوطني (QNB)">بنك قطر الوطني (QNB AlAhli)</option>
                <option value="بنك القاهرة">بنك القاهرة (Banque du Caire)</option>
                <option value="بنك الإسكندرية">بنك الإسكندرية (Bank of Alexandria)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم العقد أو حساب التسهيل (اختياري)' : 'Contract / Facility # (Optional)'}
              </label>
              <input
                type="text"
                value={loanContractNum}
                onChange={(e) => setLoanContractNum(e.target.value)}
                placeholder="CTR-NBE-88921"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'أصل مبلغ القرض (جنيه مصري) *' : 'Principal Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={loanPrincipal}
                onChange={(e) => setLoanPrincipal(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'معدل الفائدة الإجمالي % *' : 'Interest Rate % *'}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={loanInterestRate}
                onChange={(e) => setLoanInterestRate(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'عدد الأقساط *' : 'Number of Installments *'}
              </label>
              <input
                type="number"
                min="1"
                max="120"
                required
                value={loanInstallmentsCount}
                onChange={(e) => setLoanInstallmentsCount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'دورية السداد *' : 'Frequency *'}
              </label>
              <select
                value={loanFrequency}
                onChange={(e) => setLoanFrequency(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="monthly">{isAr ? 'أقساط شهرية (Monthly)' : 'Monthly'}</option>
                <option value="quarterly">{isAr ? 'أقساط ربع سنوية (Quarterly)' : 'Quarterly'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ بدء القرض وتسييل التمويل *' : 'Disbursement Date *'}
              </label>
              <input
                type="date"
                required
                value={loanStartDate}
                onChange={(e) => setLoanStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الحساب البنكي المودع به التمويل' : 'Deposit Bank Account'}
              </label>
              <select
                value={loanFinancialAccId}
                onChange={(e) => setLoanFinancialAccId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="">{isAr ? '-- اختر الحساب البنكي للإيداع --' : '-- Select Bank Account --'}</option>
                {financialAccounts.filter((fa) => fa.type === 'bank').map((fa) => (
                  <option key={fa.id} value={fa.id}>
                    {fa.code} - {fa.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time Calculation Summary Box */}
          {loanPrincipal > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 block border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                {isAr ? 'المعاينة الحسابية التلقائية للقرض والأقساط:' : 'Automatic Amortization Preview:'}
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'إجمالي الفائدة:' : 'Interest:'}</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {Math.round(loanPrincipal * (loanInterestRate / 100)).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'إجمالي الالتزام:' : 'Total Debt:'}</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {(loanPrincipal + Math.round(loanPrincipal * (loanInterestRate / 100))).toLocaleString()} ج.م
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">{isAr ? 'قيمة القسط الدوري:' : 'Installment:'}</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {loanInstallmentsCount > 0
                      ? Math.round((loanPrincipal + Math.round(loanPrincipal * (loanInterestRate / 100))) / loanInstallmentsCount).toLocaleString()
                      : 0} ج.م
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsNewLoanModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !loanName || loanPrincipal <= 0}
              className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold"
            >
              {isSubmitting ? (isAr ? 'جاري التسجيل...' : 'Registering...') : (isAr ? 'تسجيل القرض وتوليد الأقساط' : 'Save Loan & Schedule')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Full Loan Schedule Modal */}
      {selectedLoanForSchedule && (
        <Modal
          isOpen={!!selectedLoanForSchedule}
          onClose={() => setSelectedLoanForSchedule(null)}
          title={isAr ? `جدول استحقاقات وأقساط: ${selectedLoanForSchedule.name}` : `Amortization Schedule: ${selectedLoanForSchedule.name}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#7F1625] text-white">
                  {selectedLoanForSchedule.loan_number}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedLoanForSchedule.bank_name}</span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span>{isAr ? 'المسدد:' : 'Paid:'} <b className="text-emerald-600">{Number(selectedLoanForSchedule.paid_amount).toLocaleString()} ج.م</b></span>
                <span>{isAr ? 'المتبقي:' : 'Rem:'} <b className="text-rose-600">{Number(selectedLoanForSchedule.remaining_amount).toLocaleString()} ج.م</b></span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh] rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-100 dark:bg-slate-800/80 sticky top-0 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 text-center font-bold w-12">{isAr ? 'م' : '#'}</th>
                    <th className="p-2.5 text-start font-bold">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                    <th className="p-2.5 text-end font-bold">{isAr ? 'أصل القسط' : 'Principal'}</th>
                    <th className="p-2.5 text-end font-bold">{isAr ? 'الفائدة' : 'Interest'}</th>
                    <th className="p-2.5 text-end font-bold">{isAr ? 'إجمالي القسط' : 'Total'}</th>
                    <th className="p-2.5 text-center font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="p-2.5 text-end font-bold">{isAr ? 'الإجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedLoanForSchedule.installments.map((inst) => {
                    const isPaid = inst.status === 'paid';
                    return (
                      <tr key={inst.id} className={isPaid ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''}>
                        <td className="p-2 text-center font-mono font-bold">{inst.installment_number}</td>
                        <td className="p-2 font-mono font-bold text-slate-900 dark:text-white">{formatCleanDate(inst.due_date)}</td>
                        <td className="p-2 text-end font-mono">{Number(inst.principal_amount).toLocaleString()}</td>
                        <td className="p-2 text-end font-mono text-slate-400">{Number(inst.interest_amount).toLocaleString()}</td>
                        <td className="p-2 text-end font-mono font-black text-slate-900 dark:text-white">
                          {Number(inst.total_amount).toLocaleString()} ج.م
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isPaid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                            }`}
                          >
                            {isPaid ? (isAr ? 'مسدد بنجاح' : 'Paid') : (isAr ? 'مستحق للسداد' : 'Due')}
                          </span>
                        </td>
                        <td className="p-2 text-end">
                          {!isPaid ? (
                            <button
                              onClick={() => {
                                setSelectedInstallmentForPay({ loan: selectedLoanForSchedule, installment: inst });
                                setIsPayInstallmentModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-md bg-[#7F1625] hover:bg-[#961b2c] text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                            >
                              {isAr ? 'سداد القسط 💳' : 'Pay'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatCleanDate(inst.paid_at || '')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedLoanForPrint(selectedLoanForSchedule)}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                {isAr ? 'طباعة الجدول A4' : 'Print A4'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedLoanForSchedule(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pay Installment Modal */}
      {selectedInstallmentForPay && (
        <Modal
          isOpen={isPayInstallmentModalOpen}
          onClose={() => {
            setIsPayInstallmentModalOpen(false);
            setSelectedInstallmentForPay(null);
          }}
          title={isAr ? `سداد القسط البنكي: قسط رقم (${selectedInstallmentForPay.installment.installment_number})` : `Pay Loan Installment #${selectedInstallmentForPay.installment.installment_number}`}
        >
          <form onSubmit={handlePayInstallment} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isAr ? 'القرض المعني:' : 'Loan:'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedInstallmentForPay.loan.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">{isAr ? 'تاريخ الاستحقاق الرسمي:' : 'Due Date:'}</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCleanDate(selectedInstallmentForPay.installment.due_date)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="font-bold text-slate-700 dark:text-slate-300">{isAr ? 'إجمالي قيمة القسط المطلوب سداده:' : 'Total Installment Due:'}</span>
                <span className="font-mono text-base font-black text-[#7F1625] dark:text-[#ff8ba0]">
                  {Number(selectedInstallmentForPay.installment.total_amount).toLocaleString()} ج.م
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الحساب البنكي أو الخزينة المسدد منها *' : 'Paid From Account *'}
              </label>
              <select
                required
                value={payInstPaymentAccId}
                onChange={(e) => setPayInstPaymentAccId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-medium"
              >
                <option value="">{isAr ? '-- اختر حساب السداد --' : '-- Select Payment Account --'}</option>
                {financialAccounts.map((fa) => (
                  <option key={fa.id} value={fa.id}>
                    {fa.code} - {fa.name} (رصيد: {Number(fa.current_balance).toLocaleString()} {fa.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ السداد الفعلي *' : 'Payment Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={payInstDate}
                  onChange={(e) => setPayInstDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'رقم الإشعار أو الشيك' : 'Reference / Check #'}
                </label>
                <input
                  type="text"
                  value={payInstRef}
                  onChange={(e) => setPayInstRef(e.target.value)}
                  placeholder="TRF-NBE-99120"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400 block border-b border-slate-200 dark:border-slate-700 pb-1">
                {isAr ? 'القيد المحاسبي المزدوج الآلي الناتج:' : 'Resulting Double-Entry:'}
              </span>
              <p className="font-mono text-emerald-700 dark:text-emerald-300">
                [من حـ/ قروض وتسهيلات بنكية]: +{Number(selectedInstallmentForPay.installment.principal_amount).toLocaleString()} ج.م
              </p>
              {Number(selectedInstallmentForPay.installment.interest_amount) > 0 && (
                <p className="font-mono text-amber-700 dark:text-amber-300">
                  [من حـ/ فوائد ومصاريف بنكية]: +{Number(selectedInstallmentForPay.installment.interest_amount).toLocaleString()} ج.م
                </p>
              )}
              <p className="font-mono text-rose-700 dark:text-rose-300">
                [إلى حـ/ الحساب البنكي المسدد منه]: -{Number(selectedInstallmentForPay.installment.total_amount).toLocaleString()} ج.م
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsPayInstallmentModalOpen(false);
                  setSelectedInstallmentForPay(null);
                }}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !payInstPaymentAccId}
                className="bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold"
              >
                {isSubmitting ? (isAr ? 'جاري السداد...' : 'Processing...') : (isAr ? 'تأكيد السداد وترحيل القيد' : 'Confirm Payment')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Official A4 Print Loan Schedule Modal */}
      <PrintLoanScheduleModal
        isOpen={!!selectedLoanForPrint}
        onClose={() => setSelectedLoanForPrint(null)}
        loan={selectedLoanForPrint}
        isAr={isAr}
      />
    </div>
  );
};

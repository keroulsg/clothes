import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Scale,
  TrendingUp,
  Building2,
  Layers,
  RefreshCw,
  Info,
  Settings,
  Sliders,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Printer,
  Search,
  Filter,
  Eye,
  Coins,
  Boxes,
  Users,
  Wallet,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { Language } from '../../types';
import { AccountStatementModal } from './AccountStatementModal';
import { PrintFinancialReportModal } from './PrintFinancialReportModal';

interface FinancialReportsViewProps {
  lang: Language;
}

type ReportType = 'trial-balance' | 'income-statement' | 'balance-sheet' | 'vat-summary' | 'cost-variance';

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  const [activeReport, setActiveReport] = useState<ReportType>('trial-balance');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [asOfDate, setAsOfDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);

  // Comparative Statement Analysis Mode
  const [isComparative, setIsComparative] = useState<boolean>(false);
  const [compareFromDate, setCompareFromDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [compareToDate, setCompareToDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [comparativeData, setComparativeData] = useState<any | null>(null);

  const setPriorYearPreset = () => {
    const f = new Date(fromDate);
    f.setFullYear(f.getFullYear() - 1);
    const t = new Date(toDate);
    t.setFullYear(t.getFullYear() - 1);
    setCompareFromDate(f.toISOString().slice(0, 10));
    setCompareToDate(t.toISOString().slice(0, 10));
  };

  const setPriorMonthPreset = () => {
    const f = new Date(fromDate);
    f.setMonth(f.getMonth() - 1);
    const t = new Date(toDate);
    t.setMonth(t.getMonth() - 1);
    setCompareFromDate(f.toISOString().slice(0, 10));
    setCompareToDate(t.toISOString().slice(0, 10));
  };

  // Configurable Overhead Rate (Phase 09B)
  const [overheadRate, setOverheadRate] = useState<number>(0.15);
  const [isEditingOverhead, setIsEditingOverhead] = useState<boolean>(false);
  const [tempOverheadPercent, setTempOverheadPercent] = useState<number>(15);
  const [overheadSaving, setOverheadSaving] = useState<boolean>(false);

  // Smart Filters for Trial Balance
  const [hideZeroAccounts, setHideZeroAccounts] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<'all' | '1' | '2' | '4'>('all');
  const [searchAccount, setSearchAccount] = useState<string>('');

  // Drill-down Account Statement Modal
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccountName, setSelectedAccountName] = useState<string>('');
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('');
  const [isStatementModalOpen, setIsStatementModalOpen] = useState<boolean>(false);

  // Official A4 Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const fetchReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let res: any;
      let compRes: any = null;
      if (activeReport === 'trial-balance') {
        if (isComparative) {
          const [currentRes, priorRes] = await Promise.all([
            api.accounting.getTrialBalance({ from_date: fromDate, to_date: toDate }),
            api.accounting.getTrialBalance({ from_date: compareFromDate, to_date: compareToDate }),
          ]);
          res = currentRes;
          compRes = priorRes;
        } else {
          res = await api.accounting.getTrialBalance({ from_date: fromDate, to_date: toDate });
        }
      } else if (activeReport === 'income-statement') {
        if (isComparative) {
          const [currentRes, priorRes] = await Promise.all([
            api.accounting.getIncomeStatement({ from_date: fromDate, to_date: toDate }),
            api.accounting.getIncomeStatement({ from_date: compareFromDate, to_date: compareToDate }),
          ]);
          res = currentRes;
          compRes = priorRes;
        } else {
          res = await api.accounting.getIncomeStatement({ from_date: fromDate, to_date: toDate });
        }
      } else if (activeReport === 'balance-sheet') {
        res = await api.accounting.getBalanceSheet({ as_of_date: asOfDate });
      } else if (activeReport === 'vat-summary') {
        res = await api.accounting.getVatSummary({ from_date: fromDate, to_date: toDate });
      } else if (activeReport === 'cost-variance') {
        const [varianceRes, costingRes] = await Promise.allSettled([
          api.accounting.getCostVariance(),
          api.tenant.getCostingSettings(),
        ]);
        if (varianceRes.status === 'fulfilled') {
          res = varianceRes.value;
        }
        if (costingRes.status === 'fulfilled' && costingRes.value) {
          setOverheadRate(costingRes.value.manufacturing_overhead_rate);
          setTempOverheadPercent(costingRes.value.manufacturing_overhead_percentage);
        }
      }
      setReportData(res);
      setComparativeData(compRes);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل بيانات التقرير المالي' : 'Failed to load report data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveOverheadRate = async () => {
    if (tempOverheadPercent < 0 || tempOverheadPercent > 100) {
      alert(isAr ? 'يجب أن تكون النسبة بين 0% و 100%' : 'Rate must be between 0% and 100%');
      return;
    }
    setOverheadSaving(true);
    try {
      const rate = tempOverheadPercent / 100;
      const res = await api.tenant.updateCostingSettings({ manufacturing_overhead_rate: rate });
      setOverheadRate(res.manufacturing_overhead_rate);
      setIsEditingOverhead(false);
      await fetchReport();
    } catch (err: any) {
      alert(err?.message || (isAr ? 'فشل تحديث نسبة التكاليف غير المباشرة' : 'Failed to update overhead rate'));
    } finally {
      setOverheadSaving(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeReport]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params: Record<string, string> = {};
      if (activeReport === 'balance-sheet') {
        params.as_of_date = asOfDate;
      } else {
        params.from_date = fromDate;
        params.to_date = toDate;
      }
      await api.accounting.downloadReportCsv(activeReport, params);
    } catch (err: any) {
      alert(err?.message || (isAr ? 'تعذر تصدير ملف CSV' : 'Failed to export CSV'));
    } finally {
      setIsExporting(false);
    }
  };

  const reportsList = [
    {
      id: 'trial-balance' as ReportType,
      nameAr: 'ميزان المراجعة الآلي',
      nameEn: 'Trial Balance',
      icon: Scale,
      descAr: 'أرصدة الحسابات الدفترية وحركات الفترة ورصيد الإقفال المتوازن',
      descEn: 'Ledger balances, period activity, and balanced closing positions',
    },
    {
      id: 'income-statement' as ReportType,
      nameAr: 'قائمة الدخل والأرباح (P&L)',
      nameEn: 'Income Statement',
      icon: TrendingUp,
      descAr: 'الإيرادات، تكلفة المبيعات، ومجمل وصافي الربح التشغيلي',
      descEn: 'Revenues, COGS, gross margin, operating expenses, and net profit',
    },
    {
      id: 'balance-sheet' as ReportType,
      nameAr: 'الميزانية العمومية',
      nameEn: 'Balance Sheet',
      icon: Building2,
      descAr: 'الأصول والخصوم وحقوق الملكية والأرباح المحتجزة حتى تاريخ محدد',
      descEn: 'Assets, liabilities, equity, and retained earnings as of date',
    },
    {
      id: 'vat-summary' as ReportType,
      nameAr: 'إقرار ضريبة القيمة المضافة',
      nameEn: 'VAT Return Summary',
      icon: FileSpreadsheet,
      descAr: 'ملخص ضريبة المخرجات وضريبة المدخلات وصافي الضريبة المستحقة (نموذج 10)',
      descEn: 'Output VAT, input VAT, and net tax payable or refundable credit',
    },
    {
      id: 'cost-variance' as ReportType,
      nameAr: 'انحرافات تكلفة التصنيع',
      nameEn: 'Cost Variance Sheet',
      icon: Layers,
      descAr: 'مقارنة التكلفة المعيارية (BOM) بالتكاليف الفعلية ومطابقة أجور المرحلة 9',
      descEn: 'Standard BOM vs actual production costs with Phase 09 labor check',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isSelected = activeReport === rep.id;
          return (
            <button
              key={rep.id}
              onClick={() => setActiveReport(rep.id)}
              className={`text-start p-3.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary text-primary font-semibold shadow-sm dark:bg-primary/20 dark:border-primary'
                  : 'bg-white dark:bg-[#0f1523]/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {isAr ? rep.nameAr : rep.nameEn}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {isAr ? rep.descAr : rep.descEn}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter and Action Bar */}
      <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{isAr ? 'نطاق التقرير:' : 'Period Range:'}</span>
            </div>

            {activeReport === 'balance-sheet' ? (
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">{isAr ? 'كما في تاريخ:' : 'As of date:'}</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{isAr ? 'من:' : 'From:'}</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{isAr ? 'إلى:' : 'To:'}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={fetchReport}
              disabled={isLoading}
              className="text-xs py-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              {isAr ? 'تطبيق الفلتر' : 'Apply Filter'}
            </Button>

            {(activeReport === 'income-statement' || activeReport === 'trial-balance') && (
              <button
                type="button"
                onClick={() => setIsComparative(!isComparative)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isComparative
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-500 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isAr ? 'نمط المقارنة الفترية' : 'Comparative Mode'}</span>
                {isComparative && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={isLoading || !reportData}
              className="text-xs py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-0 shadow-sm font-bold"
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              {isAr ? 'طباعة التقرير المعتمد (A4)' : 'Print Statement (A4)'}
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm font-bold"
              icon={<Download className="w-3.5 h-3.5" />}
            >
              {isExporting
                ? (isAr ? 'جاري التصدير...' : 'Exporting...')
                : (isAr ? 'تصدير إكسيل / CSV' : 'Export Excel / CSV')}
            </Button>
          </div>
        </div>

        {/* Comparative Period Sub-Bar */}
        {isComparative && (activeReport === 'income-statement' || activeReport === 'trial-balance') && (
          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                {isAr ? 'الفترة المقارنة (Prior Period):' : 'Comparative Range:'}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'من:' : 'From:'}</span>
                <input
                  type="date"
                  value={compareFromDate}
                  onChange={(e) => setCompareFromDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 dark:text-slate-400">{isAr ? 'إلى:' : 'To:'}</span>
                <input
                  type="date"
                  value={compareToDate}
                  onChange={(e) => setCompareToDate(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">{isAr ? 'تحديد سريع:' : 'Presets:'}</span>
              <button
                type="button"
                onClick={setPriorYearPreset}
                className="px-2.5 py-1 rounded-md text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                {isAr ? 'نفس الفترة العام السابق' : 'Prior Year'}
              </button>
              <button
                type="button"
                onClick={setPriorMonthPreset}
                className="px-2.5 py-1 rounded-md text-[11px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-amber-500/10 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                {isAr ? 'الشهر السابق' : 'Prior Month'}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Error state */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <Button size="sm" variant="outline" onClick={fetchReport} className="text-xs py-1">
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary mb-3 animate-pulse">
            <Scale className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isAr ? 'جاري احتساب وتجميع السجلات المحاسبية وقوائم الأستاذ...' : 'Calculating financial statement metrics and ledger journals...'}
          </p>
        </div>
      )}

      {/* Report Data Display */}
      {!isLoading && reportData && (
        <div className="space-y-6">
          {/* 1. TRIAL BALANCE VIEW */}
          {activeReport === 'trial-balance' && (() => {
            const rawRows = reportData.rows || [];
            const totalAccountsCount = rawRows.length;

            // Calculate KPIs
            const cashAndBanks = rawRows
              .filter((r: any) => String(r.code).startsWith('10'))
              .reduce((acc: number, r: any) => acc + (Number(r.closing_debit || 0) - Number(r.closing_credit || 0)), 0);

            const receivables = rawRows
              .filter((r: any) => String(r.code).startsWith('11'))
              .reduce((acc: number, r: any) => acc + (Number(r.closing_debit || 0) - Number(r.closing_credit || 0)), 0);

            const inventoryValuation = rawRows
              .filter((r: any) => String(r.code).startsWith('12'))
              .reduce((acc: number, r: any) => acc + (Number(r.closing_debit || 0) - Number(r.closing_credit || 0)), 0);

            const payables = rawRows
              .filter((r: any) => String(r.code).startsWith('20') || String(r.code).startsWith('21'))
              .reduce((acc: number, r: any) => acc + (Number(r.closing_credit || 0) - Number(r.closing_debit || 0)), 0);

            // Filter rows
            const filteredRows = rawRows.filter((r: any) => {
              if (hideZeroAccounts) {
                const hasOpen = Number(r.opening_debit || 0) !== 0 || Number(r.opening_credit || 0) !== 0;
                const hasPeriod = Number(r.period_debit || 0) !== 0 || Number(r.period_credit || 0) !== 0;
                const hasClosing = Number(r.closing_debit || 0) !== 0 || Number(r.closing_credit || 0) !== 0;
                if (!hasOpen && !hasPeriod && !hasClosing) return false;
              }
              const codeStr = String(r.code || '');
              if (selectedLevel === '1' && codeStr.length !== 1) return false;
              if (selectedLevel === '2' && codeStr.length > 2) return false;
              if (selectedLevel === '4' && codeStr.length < 4) return false;

              if (searchAccount.trim()) {
                const q = searchAccount.toLowerCase();
                const matchesCode = codeStr.toLowerCase().includes(q);
                const matchesName = String(r.name || '').toLowerCase().includes(q);
                if (!matchesCode && !matchesName) return false;
              }
              return true;
            });

            return (
              <div className="space-y-4">
                {/* 5 Smart Financial Health KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Card 1: Balance Status */}
                  <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <span>{isAr ? 'حالة التوازن المحاسبي' : 'Balance Status'}</span>
                      <Scale className="w-4 h-4 text-primary" />
                    </div>
                    <div className="mt-2">
                      {reportData.is_balanced ? (
                        <Badge variant="success" className="text-xs font-black py-1 px-2.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                          {isAr ? 'متوازن تماماً 100%' : 'Strictly Balanced'}
                        </Badge>
                      ) : (
                        <Badge variant="danger" className="text-xs font-black py-1 px-2.5">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          {isAr ? `فرق: ${reportData.difference} ج.م` : `Discrepancy: ${reportData.difference}`}
                        </Badge>
                      )}
                    </div>
                  </Card>

                  {/* Card 2: Cash & Banks Liquidity */}
                  <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <span>{isAr ? 'السيولة النقدية والبنكية' : 'Cash & Bank Balances'}</span>
                      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {cashAndBanks.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">{isAr ? 'خزائن المصنع + البنك الأهلي' : 'Cash & Banks'}</p>
                    </div>
                  </Card>

                  {/* Card 3: Receivables */}
                  <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <span>{isAr ? 'مديونيات العملاء التجارية' : 'Accounts Receivable'}</span>
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-black font-mono text-blue-600 dark:text-blue-400">
                        {receivables.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">{isAr ? 'مستحقات على عملاء الجملة' : 'Receivables'}</p>
                    </div>
                  </Card>

                  {/* Card 4: Inventory */}
                  <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <span>{isAr ? 'مخزون الخامات والإنتاج التام' : 'Inventory Valuation'}</span>
                      <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-black font-mono text-amber-600 dark:text-amber-400">
                        {inventoryValuation.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">{isAr ? 'أقمشة + مستلزمات + تام' : 'Raw & Finished'}</p>
                    </div>
                  </Card>

                  {/* Card 5: Payables */}
                  <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                      <span>{isAr ? 'التزامات الموردين والأجور' : 'Accounts Payable'}</span>
                      <Coins className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="mt-2">
                      <p className="text-lg font-black font-mono text-purple-600 dark:text-purple-400">
                        {payables.toLocaleString()} <span className="text-xs font-bold text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-semibold">{isAr ? 'مستحقات موردين وأجور' : 'Due to Suppliers'}</p>
                    </div>
                  </Card>
                </div>

                {/* Smart Interactive Control Bar for Trial Balance */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Search */}
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative w-full">
                      <Search className="w-4 h-4 absolute top-2.5 right-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder={isAr ? 'بحث سريع برقم الحساب أو اسمه...' : 'Search by account code or name...'}
                        value={searchAccount}
                        onChange={(e) => setSearchAccount(e.target.value)}
                        className="w-full pl-3 pr-9 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* Level Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-500 px-2">{isAr ? 'المستوى:' : 'Level:'}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedLevel('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedLevel === 'all'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'الكل (تفصيلي)' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLevel('1')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedLevel === '1'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'مستوى 1 (رئيسي)' : 'Level 1'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLevel('2')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedLevel === '2'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'مستوى 2 (مجموعات)' : 'Level 2'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedLevel('4')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        selectedLevel === '4'
                          ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {isAr ? 'مستوى 4 (فرعي / تشغيلي)' : 'Level 4'}
                    </button>
                  </div>

                  {/* Zero-Balance Toggle */}
                  <button
                    type="button"
                    onClick={() => setHideZeroAccounts(!hideZeroAccounts)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                      hideZeroAccounts
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إخفاء الحسابات الصفرية' : 'Hide Zero Accounts'}</span>
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      {filteredRows.length} / {totalAccountsCount}
                    </span>
                  </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                  <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1.5 text-primary font-bold">
                      <Eye className="w-3.5 h-3.5" />
                      {isAr ? 'نصيحة ذكية: اضغط على أي سطر في الجدول لعرض كشف حساب الأستاذ العام وحركات اليومية بالتفصيل' : 'Click any row to drill-down into detailed general ledger statement'}
                    </span>
                    <span>{isAr ? `عدد الحسابات المعروضة: ${filteredRows.length}` : `Accounts shown: ${filteredRows.length}`}</span>
                  </div>
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-black">
                        <th className="py-3 px-3 font-black text-start">{isAr ? 'الكود' : 'Code'}</th>
                        <th className="py-3 px-3 font-black text-start">{isAr ? 'اسم الحساب المحاسبي' : 'Account Name'}</th>
                        <th className="py-3 px-3 font-black text-center">{isAr ? 'النوع' : 'Type'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono">{isAr ? 'أول المدة (مدين)' : 'Open Dr'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono">{isAr ? 'أول المدة (دائن)' : 'Open Cr'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono">{isAr ? 'حركة الفترة (مدين)' : 'Period Dr'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono">{isAr ? 'حركة الفترة (دائن)' : 'Period Cr'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono text-emerald-700 dark:text-emerald-400">{isAr ? 'الإقفال (مدين)' : 'Closing Dr'}</th>
                        <th className="py-3 px-3 font-black text-end font-mono text-emerald-700 dark:text-emerald-400">{isAr ? 'الإقفال (دائن)' : 'Closing Cr'}</th>
                        <th className="py-3 px-3 font-black text-center">{isAr ? 'كشف الأستاذ' : 'Ledger'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-medium">
                      {filteredRows.map((row: any) => (
                        <tr
                          key={row.account_id || row.code}
                          onClick={() => {
                            if (row.account_id) {
                              setSelectedAccountId(row.account_id);
                              setSelectedAccountName(row.name);
                              setSelectedAccountCode(row.code);
                              setIsStatementModalOpen(true);
                            }
                          }}
                          className="hover:bg-amber-500/10 dark:hover:bg-amber-500/15 cursor-pointer transition group"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                            {row.code}
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-950 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              row.type === 'asset' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                              row.type === 'liability' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                              row.type === 'equity' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300' :
                              row.type === 'revenue' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                              'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                            }`}>
                              {row.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {Number(row.opening_debit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {Number(row.opening_credit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                            {Number(row.period_debit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                            {Number(row.period_credit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                            {Number(row.closing_debit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-end font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                            {Number(row.closing_credit || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white transition">
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{isAr ? 'عرض' : 'View'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-800/90 font-black border-t-2 border-slate-300 dark:border-slate-700">
                        <td colSpan={3} className="py-3 px-3 text-start text-slate-950 dark:text-white font-black">{isAr ? 'الإجمالي العام لميزان المراجعة' : 'Grand Total'}</td>
                        <td className="py-3 px-3 text-end font-mono">{Number(reportData.totals?.opening_debit || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-end font-mono">{Number(reportData.totals?.opening_credit || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-end font-mono">{Number(reportData.totals?.period_debit || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-end font-mono">{Number(reportData.totals?.period_credit || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-end font-mono text-emerald-700 dark:text-emerald-400">{Number(reportData.totals?.closing_debit || 0).toLocaleString()}</td>
                        <td className="py-3 px-3 text-end font-mono text-emerald-700 dark:text-emerald-400">{Number(reportData.totals?.closing_credit || 0).toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* 2. INCOME STATEMENT VIEW */}
          {activeReport === 'income-statement' && (
            <div className="space-y-4">
              {/* Comparative Analysis Table if Active */}
              {isComparative && comparativeData && (() => {
                const compItems = [
                  {
                    title: isAr ? 'صافي إيرادات المبيعات (Net Revenue)' : 'Net Sales Revenue',
                    cur: Number(reportData.revenue?.total_net_revenue || 0),
                    prev: Number(comparativeData.revenue?.total_net_revenue || 0),
                  },
                  {
                    title: isAr ? 'تكلفة المبيعات والتصنيع (COGS)' : 'Cost of Goods Sold',
                    cur: Number(reportData.cost_of_goods_sold?.total_cogs || 0),
                    prev: Number(comparativeData.cost_of_goods_sold?.total_cogs || 0),
                    inverse: true,
                  },
                  {
                    title: isAr ? 'مجمل الربح (Gross Profit)' : 'Gross Profit',
                    cur: Number(reportData.gross_profit || 0),
                    prev: Number(comparativeData.gross_profit || 0),
                  },
                  {
                    title: isAr ? 'المصروفات التشغيلية (OpEx)' : 'Operating Expenses',
                    cur: Number(reportData.operating_expenses?.total_operating_expenses || 0),
                    prev: Number(comparativeData.operating_expenses?.total_operating_expenses || 0),
                    inverse: true,
                  },
                  {
                    title: isAr ? 'الدخل التشغيلي (Operating Income)' : 'Operating Income',
                    cur: Number(reportData.operating_income || 0),
                    prev: Number(comparativeData.operating_income || 0),
                  },
                  {
                    title: isAr ? 'صافي الربح النهائي (Net Profit)' : 'Net Profit',
                    cur: Number(reportData.net_profit || 0),
                    prev: Number(comparativeData.net_profit || 0),
                    highlight: true,
                  },
                ];

                return (
                  <Card className="p-0 overflow-hidden border border-amber-500/30 bg-white dark:bg-[#0f1523]/90 shadow-md">
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                          {isAr ? 'التحليل المالي المقارن لقائمة الدخل' : 'Comparative Income Statement Analysis'}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span>{fromDate} : {toDate}</span>
                        <span className="text-amber-500 font-bold">vs</span>
                        <span>{compareFromDate} : {compareToDate}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="p-2.5">{isAr ? 'البند المالي' : 'Line Item'}</th>
                            <th className="p-2.5 text-center">{isAr ? 'الفترة الحالية (ج.م)' : 'Current (EGP)'}</th>
                            <th className="p-2.5 text-center">{isAr ? 'الفترة المقارنة (ج.م)' : 'Prior (EGP)'}</th>
                            <th className="p-2.5 text-center">{isAr ? 'مبلغ الفرق والانحراف' : 'Variance (EGP)'}</th>
                            <th className="p-2.5 text-center">{isAr ? 'نسبة التغير %' : 'Growth %'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {compItems.map((c, idx) => {
                            const diff = c.cur - c.prev;
                            const pct = c.prev !== 0 ? ((diff / Math.abs(c.prev)) * 100).toFixed(1) : (diff > 0 ? '+100' : '0');
                            const isPositive = c.inverse ? diff < 0 : diff >= 0;

                            return (
                              <tr key={idx} className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${c.highlight ? 'bg-amber-500/5 font-bold' : ''}`}>
                                <td className="p-2.5 font-medium text-slate-900 dark:text-white">{c.title}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">{c.cur.toLocaleString()}</td>
                                <td className="p-2.5 text-center font-mono text-slate-500">{c.prev.toLocaleString()}</td>
                                <td className={`p-2.5 text-center font-mono font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} ج.م
                                </td>
                                <td className="p-2.5 text-center font-mono">
                                  <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                    isPositive
                                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    <span>{pct}%</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي إيرادات المبيعات' : 'Net Sales Revenue'}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {Number(reportData.revenue?.total_net_revenue || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {isAr ? `إجمالي: ${Number(reportData.revenue?.total_gross_revenue || 0).toLocaleString()} - مردودات: ${Number(reportData.revenue?.total_returns_discounts || 0).toLocaleString()}` : ''}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'تكلفة المبيعات والتصنيع (COGS)' : 'Cost of Goods Sold'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.cost_of_goods_sold?.total_cogs || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'مجمل الربح (Gross Profit)' : 'Gross Profit'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.gross_profit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {reportData.gross_margin_percent}% {isAr ? 'هامش مجمل الربح' : 'Margin'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الربح النهائي (Net Profit)' : 'Net Profit'}</p>
                  <p className={`text-xl font-bold mt-1 ${reportData.is_profitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {Number(reportData.net_profit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className={`text-[11px] font-medium ${reportData.is_profitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {reportData.net_margin_percent}% {isAr ? 'هامش صافي الربح' : 'Net Margin'}
                  </span>
                </Card>
              </div>

              {/* Detailed Breakdown Card */}
              <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {/* 1. Revenue */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mb-2">
                    <span>{isAr ? '1. إيرادات النشاط والمبيعات' : '1. Revenues'}</span>
                    <span className="font-mono text-emerald-600">{Number(reportData.revenue?.total_net_revenue || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  {reportData.revenue?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.net_revenue || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  ))}
                  {Number(reportData.revenue?.total_returns_discounts || 0) > 0 && (
                    <div className="flex items-center justify-between py-1 text-rose-500">
                      <span>{isAr ? '(-) مردودات ومسموحات المبيعات (Contra-Revenue)' : '(-) Sales Returns & Discounts'}</span>
                      <span className="font-mono">({Number(reportData.revenue?.total_returns_discounts || 0).toLocaleString()}) {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  )}
                </div>

                {/* 2. COGS */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mb-2">
                    <span>{isAr ? '2. تكلفة البضاعة المباعة والتكاليف الصناعية المباشرة' : '2. Cost of Goods Sold'}</span>
                    <span className="font-mono text-amber-600">({Number(reportData.cost_of_goods_sold?.total_cogs || 0).toLocaleString()}) {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  {reportData.cost_of_goods_sold?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.amount || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  ))}
                </div>

                {/* 3. Operating Expenses */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mb-2">
                    <span>{isAr ? '3. المصروفات التشغيلية والصناعية غير المباشرة' : '3. Operating & Indirect Expenses'}</span>
                    <span className="font-mono text-rose-600">({Number(reportData.operating_expenses?.total_operating_expenses || 0).toLocaleString()}) {isAr ? 'ج.م' : 'EGP'}</span>
                  </div>
                  {reportData.operating_expenses?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.amount || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  ))}
                </div>

                {/* Net Income Summary */}
                <div className="pt-3 flex items-center justify-between font-bold text-base text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                  <span>{isAr ? 'صافي أرباح / (خسائر) الفترة المحاسبية:' : 'Net Income / (Loss) for the Period:'}</span>
                  <span className={`font-mono ${reportData.is_profitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(reportData.net_profit || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </Card>
            </div>
          )}

          {/* 3. BALANCE SHEET VIEW */}
          {activeReport === 'balance-sheet' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي الأصول' : 'Total Assets'}</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {Number(reportData.assets?.total_assets || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي الخصوم والالتزامات' : 'Total Liabilities'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.liabilities?.total_liabilities || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي حقوق الملكية والأرباح' : 'Total Equity & Profit'}</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {Number(reportData.equity?.total_equity || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'تطابق المعادلة المحاسبية' : 'Balance Equation Check'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {reportData.is_balanced ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {isAr ? 'الأصول = الخصوم + الملكية' : 'Balanced'}
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        {isAr ? `فرق: ${reportData.discrepancy} ج.م` : `Discrepancy: ${reportData.discrepancy} EGP`}
                      </Badge>
                    )}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Assets Column */}
                <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 text-xs">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>{isAr ? 'الأصول (Assets)' : 'Assets'}</span>
                    <span className="font-mono text-blue-600">{Number(reportData.assets?.total_assets || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-500 mb-1.5">{isAr ? 'الأصول المتداولة (النقدية، المدينون، المخزون)' : 'Current Assets'}</p>
                      <div className="space-y-1">
                        {reportData.assets?.current_assets?.map((a: any) => (
                          <div key={a.account_id} className="flex justify-between text-slate-700 dark:text-slate-300 py-0.5">
                            <span>{a.code} - {a.name}</span>
                            <span className="font-mono font-medium">{Number(a.balance || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Liabilities & Equity Column */}
                <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 text-xs">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>{isAr ? 'الخصوم وحقوق الملكية' : 'Liabilities & Equity'}</span>
                    <span className="font-mono text-purple-600">{Number(reportData.total_liabilities_and_equity || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-500 mb-1.5">{isAr ? 'الالتزامات والخصوم المتداولة' : 'Liabilities'}</p>
                      <div className="space-y-1">
                        {reportData.liabilities?.current_liabilities?.map((l: any) => (
                          <div key={l.account_id} className="flex justify-between text-slate-700 dark:text-slate-300 py-0.5">
                            <span>{l.code} - {l.name}</span>
                            <span className="font-mono font-medium">{Number(l.balance || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="font-semibold text-slate-500 mb-1.5">{isAr ? 'حقوق الملكية والأرباح' : 'Equity & Retained Earnings'}</p>
                      <div className="space-y-1">
                        {reportData.equity?.items?.map((e: any) => (
                          <div key={e.account_id} className="flex justify-between text-slate-700 dark:text-slate-300 py-0.5">
                            <span>{e.code} - {e.name}</span>
                            <span className="font-mono font-medium">{Number(e.balance || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-emerald-600 font-semibold py-0.5 bg-emerald-500/5 px-2 rounded">
                          <span>{isAr ? 'الأرباح المحتجزة / أرباح الفترة المتراكمة' : 'Retained Earnings / Period Net Income'}</span>
                          <span className="font-mono">{Number(reportData.equity?.retained_earnings || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* 4. VAT SUMMARY VIEW */}
          {activeReport === 'vat-summary' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي ضريبة المخرجات (مبيعات)' : 'Output VAT (Sales)'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.output_vat?.net_output_vat || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {reportData.output_vat?.invoices_count} {isAr ? 'فواتير بيع معتمدة' : 'invoices'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي ضريبة المدخلات (مشتريات)' : 'Input VAT (Purchases)'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.input_vat?.net_input_vat || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {reportData.input_vat?.invoices_count} {isAr ? 'فواتير موردين مرحلة' : 'invoices'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الضريبة المستحقة للسداد' : 'Net Tax Due'}</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {Number(reportData.summary?.net_vat_payable || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    {reportData.summary?.vat_status === 'payable' ? (isAr ? 'مستحقة السداد للمصلحة' : 'Payable') : (isAr ? 'رصيد دائن مرحل' : 'Credit')}
                  </span>
                </Card>
              </div>

              {/* Regulatory Notice Banner */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-amber-600" />
                <span>{reportData.disclaimer}</span>
              </div>
            </div>
          )}

          {/* 5. COST VARIANCE VIEW */}
          {activeReport === 'cost-variance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'أوامر الإنتاج المفحوصة' : 'Production Orders'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {reportData.totals?.orders_count || 0}
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي التكلفة المعيارية (BOM)' : 'Total Standard Cost'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.totals?.total_standard_cost || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي التكلفة الفعلية الصناعية' : 'Total Actual Cost'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.totals?.total_actual_cost || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الانحراف المالي الكلي' : 'Total Net Variance'}</p>
                  <p className={`text-xl font-bold mt-1 ${reportData.totals?.total_variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(reportData.totals?.total_variance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                  </p>
                  <span className={`text-[11px] font-semibold ${reportData.totals?.total_variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {reportData.totals?.total_variance >= 0 ? (isAr ? 'وفر إيجابي في التكلفة' : 'Favorable') : (isAr ? 'تجاوز في التكلفة' : 'Unfavorable')}
                  </span>
                </Card>
              </div>

              {/* Phase 09B Configurable Manufacturing Overhead Settings Card */}
              <Card className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {isAr ? 'نسبة التكاليف الصناعية غير المباشرة المعتمدة للشركة:' : 'Configured Manufacturing Overhead Rate:'}
                        <span className="text-primary font-mono font-extrabold text-sm">
                          {Number(overheadRate * 100).toFixed(1)}%
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isAr
                          ? 'تطبق هذه النسبة على بطاقات التكلفة الجديدة. بطاقات التكلفة المعتمدة تاريخياً مثبتة بلقطة غير قابلة للتغيير.'
                          : 'Applied to newly calculated cost sheets. Finalized historical cost sheets remain strictly snapshot-immutable.'}
                      </p>
                    </div>
                  </div>

                  {!isEditingOverhead ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditingOverhead(true)}
                      className="text-xs py-1"
                    >
                      <Settings className="w-3.5 h-3.5 me-1" />
                      {isAr ? 'تعديل النسبة' : 'Change Rate'}
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={tempOverheadPercent}
                        onChange={(e) => setTempOverheadPercent(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center"
                      />
                      <span className="text-xs font-bold">%</span>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={overheadSaving}
                        onClick={handleSaveOverheadRate}
                        className="text-xs py-1"
                      >
                        {overheadSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5 me-1" />}
                        {isAr ? 'حفظ' : 'Save'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTempOverheadPercent(overheadRate * 100);
                          setIsEditingOverhead(false);
                        }}
                        className="text-xs py-1"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Table of Orders Variance */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1523]/90 shadow-sm">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3 font-semibold text-start">{isAr ? 'أمر الإنتاج' : 'Order #'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{isAr ? 'الموديل' : 'Garment Model'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{isAr ? 'الكمية التامة' : 'Pieces'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'معياري / قطعة' : 'Std/Piece'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'إجمالي المعياري' : 'Total Std'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'إجمالي الفعلي' : 'Total Actual'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'نسبة غير المباشرة' : 'Overhead %'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'الانحراف (وفر/عجز)' : 'Variance'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{isAr ? 'مطابقة أجور المرحلة 9' : 'Phase 09 Labor Reconciled'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.orders?.map((ord: any) => (
                      <tr key={ord.production_order_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">{ord.order_number}</td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200">
                          {ord.garment_model?.name || ord.garment_model?.code || '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{ord.completed_pieces}</td>
                        <td className="py-2 px-3 text-end font-mono">{Number(ord.standard_cost_per_piece || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-2 px-3 text-end font-mono">{Number(ord.standard_total_cost || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-2 px-3 text-end font-mono font-medium">{Number(ord.actual_total_cost || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="py-2 px-3 text-end font-mono text-slate-500">
                          {Number(((ord.actual_cost_breakdown?.applied_overhead_rate ?? 0.15) * 100)).toFixed(1)}%
                        </td>
                        <td className={`py-2 px-3 text-end font-mono font-bold ${ord.variance_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {ord.variance_amount >= 0 ? `+${Number(ord.variance_amount).toLocaleString()}` : Number(ord.variance_amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {ord.labor_dependency?.status === 'verified' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              {isAr ? 'مطابق ومعتمد بالكامل' : 'Verified & Reconciled'}
                            </span>
                          )}
                          {ord.labor_dependency?.status === 'partially_verified' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600" title={ord.labor_dependency?.note}>
                              {isAr ? 'توثيق أجور جزئي' : 'Partially Verified'}
                            </span>
                          )}
                          {ord.labor_dependency?.status === 'incomplete_dependency_phase_09' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600" title={ord.labor_dependency?.note}>
                              {isAr ? 'معلق على المرحلة 9' : 'Phase 09 Pending'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drill-down Individual Account Statement Modal */}
      <AccountStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => {
          setIsStatementModalOpen(false);
          setSelectedAccountId(null);
        }}
        accountId={selectedAccountId}
        accountName={selectedAccountName}
        accountCode={selectedAccountCode}
        isAr={isAr}
      />

      {/* Official A4 Print Financial Report Modal */}
      <PrintFinancialReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportType={activeReport}
        reportData={reportData}
        fromDate={fromDate}
        toDate={toDate}
        asOfDate={asOfDate}
        isAr={isAr}
      />
    </div>
  );
};

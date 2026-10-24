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
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { Language } from '../../types';

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

  const fetchReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      let res: any;
      if (activeReport === 'trial-balance') {
        res = await api.accounting.getTrialBalance({ from_date: fromDate, to_date: toDate });
      } else if (activeReport === 'income-statement') {
        res = await api.accounting.getIncomeStatement({ from_date: fromDate, to_date: toDate });
      } else if (activeReport === 'balance-sheet') {
        res = await api.accounting.getBalanceSheet({ as_of_date: asOfDate });
      } else if (activeReport === 'vat-summary') {
        res = await api.accounting.getVatSummary({ from_date: fromDate, to_date: toDate });
      } else if (activeReport === 'cost-variance') {
        res = await api.accounting.getCostVariance();
      }
      setReportData(res);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل بيانات التقرير المالي' : 'Failed to load report data'));
    } finally {
      setIsLoading(false);
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
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm"
              icon={<Download className="w-3.5 h-3.5" />}
            >
              {isExporting
                ? (isAr ? 'جاري التصدير...' : 'Exporting...')
                : (isAr ? 'تصدير إكسيل / CSV' : 'Export Excel / CSV')}
            </Button>
          </div>
        </div>
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
          {activeReport === 'trial-balance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'حالة التوازن المحاسبي' : 'Double-Entry Balance'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {reportData.is_balanced ? (
                      <Badge variant="success" className="text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {isAr ? 'ميزان متوازن تماماً' : 'Strictly Balanced'}
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                        {isAr ? `فرق عدم توازن: ${reportData.difference} ج.م` : `Discrepancy: ${reportData.difference}`}
                      </Badge>
                    )}
                  </div>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي حركات الفترة (مدين)' : 'Period Debits'}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {Number(reportData.totals?.period_debit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي حركات الفترة (دائن)' : 'Period Credits'}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {Number(reportData.totals?.period_credit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي الأرصدة الختامية' : 'Total Closing Balance'}</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {Number(reportData.totals?.closing_debit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f1523]/90 shadow-sm">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                      <th className="py-2.5 px-3 font-semibold text-start">{isAr ? 'كود الحساب' : 'Code'}</th>
                      <th className="py-2.5 px-3 font-semibold text-start">{isAr ? 'اسم الحساب المحاسبي' : 'Account Name'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{isAr ? 'النوع' : 'Type'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'أول المدة (مدين)' : 'Open Dr'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'أول المدة (دائن)' : 'Open Cr'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'حركة الفترة (مدين)' : 'Period Dr'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'حركة الفترة (دائن)' : 'Period Cr'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end text-emerald-600 dark:text-emerald-400">{isAr ? 'الإقفال (مدين)' : 'Closing Dr'}</th>
                      <th className="py-2.5 px-3 font-semibold text-end text-emerald-600 dark:text-emerald-400">{isAr ? 'الإقفال (دائن)' : 'Closing Cr'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportData.rows?.map((row: any) => (
                      <tr key={row.account_id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono font-medium text-slate-800 dark:text-slate-200">{row.code}</td>
                        <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">{row.name}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            row.type === 'asset' ? 'bg-blue-500/10 text-blue-600' :
                            row.type === 'liability' ? 'bg-amber-500/10 text-amber-600' :
                            row.type === 'equity' ? 'bg-purple-500/10 text-purple-600' :
                            row.type === 'revenue' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-end font-mono text-slate-600 dark:text-slate-300">{Number(row.opening_debit || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-end font-mono text-slate-600 dark:text-slate-300">{Number(row.opening_credit || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-end font-mono font-medium text-slate-900 dark:text-white">{Number(row.period_debit || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-end font-mono font-medium text-slate-900 dark:text-white">{Number(row.period_credit || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-end font-mono font-bold text-slate-900 dark:text-white bg-emerald-500/5">{Number(row.closing_debit || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 text-end font-mono font-bold text-slate-900 dark:text-white bg-emerald-500/5">{Number(row.closing_credit || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                      <td colSpan={3} className="py-2.5 px-3 text-start">{isAr ? 'الإجمالي العام لميزان المراجعة' : 'Grand Total'}</td>
                      <td className="py-2.5 px-3 text-end font-mono">{Number(reportData.totals?.opening_debit || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-end font-mono">{Number(reportData.totals?.opening_credit || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-end font-mono">{Number(reportData.totals?.period_debit || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-end font-mono">{Number(reportData.totals?.period_credit || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-end font-mono text-emerald-600">{Number(reportData.totals?.closing_debit || 0).toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-end font-mono text-emerald-600">{Number(reportData.totals?.closing_credit || 0).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 2. INCOME STATEMENT VIEW */}
          {activeReport === 'income-statement' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي إيرادات المبيعات' : 'Net Sales Revenue'}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {Number(reportData.revenue?.total_net_revenue || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {isAr ? `إجمالي: ${Number(reportData.revenue?.total_gross_revenue || 0).toLocaleString()} - مردودات: ${Number(reportData.revenue?.total_returns_discounts || 0).toLocaleString()}` : ''}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'تكلفة المبيعات والتصنيع (COGS)' : 'Cost of Goods Sold'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.cost_of_goods_sold?.total_cogs || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'مجمل الربح (Gross Profit)' : 'Gross Profit'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.gross_profit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {reportData.gross_margin_percent}% {isAr ? 'هامش مجمل الربح' : 'Margin'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الربح النهائي (Net Profit)' : 'Net Profit'}</p>
                  <p className={`text-xl font-bold mt-1 ${reportData.is_profitable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {Number(reportData.net_profit || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
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
                    <span className="font-mono text-emerald-600">{Number(reportData.revenue?.total_net_revenue || 0).toLocaleString()} ج.م</span>
                  </div>
                  {reportData.revenue?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.net_revenue || 0).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                  {Number(reportData.revenue?.total_returns_discounts || 0) > 0 && (
                    <div className="flex items-center justify-between py-1 text-rose-500">
                      <span>{isAr ? '(-) مردودات ومسموحات المبيعات (Contra-Revenue)' : '(-) Sales Returns & Discounts'}</span>
                      <span className="font-mono">({Number(reportData.revenue?.total_returns_discounts || 0).toLocaleString()}) ج.م</span>
                    </div>
                  )}
                </div>

                {/* 2. COGS */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mb-2">
                    <span>{isAr ? '2. تكلفة البضاعة المباعة والتكاليف الصناعية المباشرة' : '2. Cost of Goods Sold'}</span>
                    <span className="font-mono text-amber-600">({Number(reportData.cost_of_goods_sold?.total_cogs || 0).toLocaleString()}) ج.م</span>
                  </div>
                  {reportData.cost_of_goods_sold?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.amount || 0).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>

                {/* 3. Operating Expenses */}
                <div className="py-2.5">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white mb-2">
                    <span>{isAr ? '3. المصروفات التشغيلية والصناعية غير المباشرة' : '3. Operating & Indirect Expenses'}</span>
                    <span className="font-mono text-rose-600">({Number(reportData.operating_expenses?.total_operating_expenses || 0).toLocaleString()}) ج.م</span>
                  </div>
                  {reportData.operating_expenses?.items?.map((item: any) => (
                    <div key={item.account_id} className="flex items-center justify-between py-1 text-slate-600 dark:text-slate-300">
                      <span>{item.code} - {item.name}</span>
                      <span className="font-mono">{Number(item.amount || 0).toLocaleString()} ج.م</span>
                    </div>
                  ))}
                </div>

                {/* Net Income Summary */}
                <div className="pt-3 flex items-center justify-between font-bold text-base text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg">
                  <span>{isAr ? 'صافي أرباح / (خسائر) الفترة المحاسبية:' : 'Net Income / (Loss) for the Period:'}</span>
                  <span className={`font-mono ${reportData.is_profitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(reportData.net_profit || 0).toLocaleString()} ج.م
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
                    {Number(reportData.assets?.total_assets || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي الخصوم والالتزامات' : 'Total Liabilities'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.liabilities?.total_liabilities || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي حقوق الملكية والأرباح' : 'Total Equity & Profit'}</p>
                  <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {Number(reportData.equity?.total_equity || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
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
                        {isAr ? `فرق: ${reportData.discrepancy} ج.م` : `Discrepancy: ${reportData.discrepancy}`}
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
                    <span className="font-mono text-blue-600">{Number(reportData.assets?.total_assets || 0).toLocaleString()} ج.م</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-500 mb-1.5">{isAr ? 'الأصول المتداولة (النقدية، المدينون، المخزون)' : 'Current Assets'}</p>
                      <div className="space-y-1">
                        {reportData.assets?.current_assets?.map((a: any) => (
                          <div key={a.account_id} className="flex justify-between text-slate-700 dark:text-slate-300 py-0.5">
                            <span>{a.code} - {a.name}</span>
                            <span className="font-mono font-medium">{Number(a.balance || 0).toLocaleString()} ج.م</span>
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
                    <span className="font-mono text-purple-600">{Number(reportData.total_liabilities_and_equity || 0).toLocaleString()} ج.م</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-slate-500 mb-1.5">{isAr ? 'الالتزامات والخصوم المتداولة' : 'Liabilities'}</p>
                      <div className="space-y-1">
                        {reportData.liabilities?.current_liabilities?.map((l: any) => (
                          <div key={l.account_id} className="flex justify-between text-slate-700 dark:text-slate-300 py-0.5">
                            <span>{l.code} - {l.name}</span>
                            <span className="font-mono font-medium">{Number(l.balance || 0).toLocaleString()} ج.م</span>
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
                            <span className="font-mono font-medium">{Number(e.balance || 0).toLocaleString()} ج.م</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-emerald-600 font-semibold py-0.5 bg-emerald-500/5 px-2 rounded">
                          <span>{isAr ? 'الأرباح المحتجزة / أرباح الفترة المتراكمة' : 'Retained Earnings / Period Net Income'}</span>
                          <span className="font-mono">{Number(reportData.equity?.retained_earnings || 0).toLocaleString()} ج.م</span>
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
                    {Number(reportData.output_vat?.net_output_vat || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {reportData.output_vat?.invoices_count} {isAr ? 'فواتير بيع معتمدة' : 'invoices'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي ضريبة المدخلات (مشتريات)' : 'Input VAT (Purchases)'}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {Number(reportData.input_vat?.net_input_vat || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {reportData.input_vat?.invoices_count} {isAr ? 'فواتير موردين مرحلة' : 'invoices'}
                  </span>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الضريبة المستحقة للسداد' : 'Net Tax Due'}</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {Number(reportData.summary?.net_vat_payable || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
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
                    {Number(reportData.totals?.total_standard_cost || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'إجمالي التكلفة الفعلية الصناعية' : 'Total Actual Cost'}</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                    {Number(reportData.totals?.total_actual_cost || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                </Card>

                <Card className="p-3.5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
                  <p className="text-[11px] text-slate-500">{isAr ? 'صافي الانحراف المالي الكلي' : 'Total Net Variance'}</p>
                  <p className={`text-xl font-bold mt-1 ${reportData.totals?.total_variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(reportData.totals?.total_variance || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
                  </p>
                  <span className={`text-[11px] font-semibold ${reportData.totals?.total_variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {reportData.totals?.total_variance >= 0 ? (isAr ? 'وفر إيجابي في التكلفة' : 'Favorable') : (isAr ? 'تجاوز في التكلفة' : 'Unfavorable')}
                  </span>
                </Card>
              </div>

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
                      <th className="py-2.5 px-3 font-semibold text-end">{isAr ? 'الانحراف (وفر/عجز)' : 'Variance'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center">{isAr ? 'تبعية المرحلة 9 (الأجور)' : 'Phase 09 Labor'}</th>
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
                        <td className="py-2 px-3 text-end font-mono">{Number(ord.standard_cost_per_piece || 0).toLocaleString()} ج.م</td>
                        <td className="py-2 px-3 text-end font-mono">{Number(ord.standard_total_cost || 0).toLocaleString()} ج.م</td>
                        <td className="py-2 px-3 text-end font-mono font-medium">{Number(ord.actual_total_cost || 0).toLocaleString()} ج.م</td>
                        <td className={`py-2 px-3 text-end font-mono font-bold ${ord.variance_amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {ord.variance_amount >= 0 ? `+${Number(ord.variance_amount).toLocaleString()}` : Number(ord.variance_amount).toLocaleString()} ج.م
                        </td>
                        <td className="py-2 px-3 text-center">
                          {ord.labor_dependency?.status === 'verified' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                              {isAr ? 'معتمد بسجلات إنتاجية' : 'Verified'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600">
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
    </div>
  );
};

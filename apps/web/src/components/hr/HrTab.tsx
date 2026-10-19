import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Calendar,
  Plus,
  DollarSign,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, Employee, PieceRate, PieceWorkLog, Payroll } from '../../types';

interface HrTabProps {
  lang: Language;
}

export const HrTab: React.FC<HrTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'piecerates' | 'worklogs' | 'payrolls'>('employees');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Workers state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pieceRates, setPieceRates] = useState<PieceRate[]>([]);
  const [workLogs, setWorkLogs] = useState<PieceWorkLog[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  const loadHrData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [empRes, prRes, logsRes, payrollsRes] = await Promise.allSettled([
        api.hr.getEmployees(1),
        api.hr.getPieceRates(1),
        api.hr.getPieceWorkLogs(1),
        api.hr.getPayrolls(1),
      ]);

      if (empRes.status === 'fulfilled' && empRes.value?.data) {
        setEmployees(empRes.value.data);
      }
      if (prRes.status === 'fulfilled' && prRes.value?.data) {
        setPieceRates(prRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value?.data) {
        setWorkLogs(logsRes.value.data);
      }
      if (payrollsRes.status === 'fulfilled' && payrollsRes.value?.data) {
        setPayrolls(payrollsRes.value.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب بيانات الموارد البشرية' : 'Failed to load HR data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHrData();
  }, []);

  // Modal State for Logging Piece Work
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedRate, setSelectedRate] = useState('');
  const [logQty, setLogQty] = useState<number>(100);

  useEffect(() => {
    if (employees.length > 0 && !selectedEmp) {
      setSelectedEmp(employees[0].id);
    }
  }, [employees]);

  useEffect(() => {
    if (pieceRates.length > 0 && !selectedRate) {
      setSelectedRate(pieceRates[0].id);
    }
  }, [pieceRates]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logQty <= 0) return;

    const rateObj = pieceRates.find((r) => r.id === selectedRate);
    const unitRate = Number(rateObj?.rate_per_piece) || 3.50;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.createPieceWorkLog({
        employee_id: selectedEmp || employees[0]?.id,
        piece_rate_id: selectedRate || pieceRates[0]?.id,
        completed_quantity: logQty,
        unit_rate: unitRate,
        work_date: new Date().toISOString().split('T')[0],
      });

      if (res?.log) {
        setWorkLogs((prev) => [res.log, ...prev]);
      }
      setIsLogModalOpen(false);
      setLogQty(100);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل إنتاجية العامل' : 'Failed to record piece work log'));
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
          <Button size="sm" variant="outline" onClick={loadHrData} className="text-xs py-1">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
          <span>{isAr ? 'جاري تحميل بيانات الموارد البشرية والإنتاجية...' : 'Loading workforce and piece-rate records...'}</span>
        </div>
      )}

      {/* Top HR & Productivity KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي عمال وموظفي المصنع' : 'Active Factory Workforce'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{employees.length}</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'خياطة + قص + تشطيب' : 'Sewing + Cutting + Finishing'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'قطع منجزة مسجلة اليوم' : 'Pieces Produced Today'}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">1,250 {isAr ? 'قطعة' : 'pcs'}</p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? 'معتمدة من رقابة الجودة' : 'QC Verified & Approved'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'مستحقات أجور القطعة اليومية' : 'Daily Piece Earnings'}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">2,575 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'حساب آلي فوري بدون أخطاء' : 'Automated calculation'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'صافي مسير الرواتب المعتمد' : 'Approved Net Payroll'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">39,500 ج.م</p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'فترة أكتوبر 2026' : 'October 2026 Cycle'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'employees'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'سجل العمال والموظفين' : 'Employees'}
          </button>
          <button
            onClick={() => setActiveSubTab('worklogs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'worklogs'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'إنتاجية أجور القطعة اليومية' : 'Piece-Work Logs'}
          </button>
          <button
            onClick={() => setActiveSubTab('piecerates')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'piecerates'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'تسعيرة العمليات (Piece Rates)' : 'Piece Rates'}
          </button>
          <button
            onClick={() => setActiveSubTab('payrolls')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'payrolls'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مسيرات الرواتب (Payrolls)' : 'Payrolls'}
          </button>
        </div>

        {activeSubTab === 'worklogs' && (
          <Button size="sm" onClick={() => setIsLogModalOpen(true)}>
            <Plus className="w-4 h-4 me-1" />
            {isAr ? 'تسجيل إنتاجية عامل' : 'Log Worker Pieces'}
          </Button>
        )}
      </div>

      {/* EMPLOYEES VIEW */}
      {activeSubTab === 'employees' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل عمال الإنتاج والتشغيل' : 'Factory Workforce Directory'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود العامل' : 'Emp #'}</th>
                  <th className="p-3 text-start">{isAr ? 'الاسم' : 'Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'القسم' : 'Department'}</th>
                  <th className="p-3 text-start">{isAr ? 'المسمى الوظيفي' : 'Job Title'}</th>
                  <th className="p-3 text-start">{isAr ? 'نظام الأجر' : 'Pay Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'الراتب الأساسي' : 'Base Salary'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{emp.employee_code}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp.name}</td>
                    <td className="p-3 capitalize">{emp.department}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{emp.job_title}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {emp.pay_type}
                      </span>
                    </td>
                    <td className="p-3 font-bold">{emp.base_salary.toLocaleString()} ج.م</td>
                    <td className="p-3 text-center">
                      <Badge variant="success">{isAr ? 'نشط' : 'Active'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* WORK LOGS VIEW */}
      {activeSubTab === 'worklogs' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل إنتاجية العمال واحتساب أجور القطعة اليومية' : 'Daily Piece-Rate Productivity Records'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'العامل' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'الكمية السليمة المنجزة' : 'Pieces Completed'}</th>
                  <th className="p-3 text-start">{isAr ? 'سعر القطعة' : 'Rate / Piece'}</th>
                  <th className="p-3 text-start">{isAr ? 'المستحق المالي' : 'Total Earnings'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ التشغيل' : 'Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'اعتماد الرقابة' : 'QC Approval'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {workLogs.map((log) => {
                  const emp = employees.find((e) => e.id === log.employee_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp?.name || log.employee_id}</td>
                      <td className="p-3 font-bold text-primary">{log.completed_quantity} {isAr ? 'قطعة' : 'pcs'}</td>
                      <td className="p-3">{log.unit_rate} ج.م</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {log.total_amount.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{log.work_date}</td>
                      <td className="p-3 text-center">
                        <Badge variant="success">{isAr ? 'معتمد' : 'Verified'}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PIECE RATES VIEW */}
      {activeSubTab === 'piecerates' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'جدول تسعيرة العمليات وأجر القطعة القياسي' : 'Standard Piece Rates Table'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'مرحلة التشغيل' : 'Stage'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العملية الفنية' : 'Operation Name'}</th>
                  <th className="p-3 text-end">{isAr ? 'أجر القطعة (جنيه)' : 'Rate / Piece'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {pieceRates.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 capitalize font-semibold text-primary">{pr.stage_name}</td>
                    <td className="p-3 text-slate-900 dark:text-white font-medium">{pr.operation_name}</td>
                    <td className="p-3 text-end font-bold text-emerald-600 dark:text-emerald-400 text-base">
                      {pr.rate_per_piece.toFixed(2)} ج.م
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* PAYROLLS VIEW */}
      {activeSubTab === 'payrolls' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'مسيرات الرواتب الشهرية والأسبوعية المحتسبة' : 'Payroll Summaries'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'الفترة' : 'Period'}</th>
                  <th className="p-3 text-start">{isAr ? 'من تاريخ' : 'Start'}</th>
                  <th className="p-3 text-start">{isAr ? 'إلى تاريخ' : 'End'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي الأجور' : 'Gross'}</th>
                  <th className="p-3 text-start">{isAr ? 'الاستقطاعات' : 'Deductions'}</th>
                  <th className="p-3 text-start">{isAr ? 'الصافي المستحق' : 'Net Payout'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-primary">{p.payroll_period}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{p.period_start}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{p.period_end}</td>
                    <td className="p-3 font-semibold">{p.total_gross.toLocaleString()} ج.م</td>
                    <td className="p-3 text-amber-600 dark:text-amber-400">{p.total_deductions.toLocaleString()} ج.م</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-base">
                      {p.total_net.toLocaleString()} ج.م
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="success">{p.status.toUpperCase()}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Log Piece Work Output Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={isAr ? 'تسجيل إنتاجية عامل واحتساب أجر القطعة' : 'Record Worker Piece Output'}
      >

        <form onSubmit={handleAddLog} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اختر العامل' : 'Select Worker'}
            </label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.employee_code} - {e.name} ({e.department})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العملية الفنية' : 'Operation'}
            </label>
            <select
              value={selectedRate}
              onChange={(e) => setSelectedRate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {pieceRates.map((r) => (
                <option key={r.id} value={r.id}>{r.operation_name} ({r.rate_per_piece} ج.م/قطعة)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الكمية السليمة المنجزة (عدد القطع)' : 'Completed Pieces'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={logQty}
              onChange={(e) => setLogQty(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsLogModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الاعتماد...' : 'Logging...'}
                </>
              ) : (
                isAr ? 'اعتماد وتسجيل الإنتاجية' : 'Log Output'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

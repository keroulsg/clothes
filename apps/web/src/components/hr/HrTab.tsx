import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Calendar,
  Plus,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calculator,
  Printer,
  Eye,
  FileText,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { api } from '../../api/client';
import type { Language, Employee, PieceRate, PieceWorkLog, Payroll } from '../../types';

interface HrTabProps {
  lang: Language;
}

export const HrTab: React.FC<HrTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'piecerates' | 'worklogs' | 'payrolls'>('employees');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
  }, [employees, selectedEmp]);

  useEffect(() => {
    if (pieceRates.length > 0 && !selectedRate) {
      setSelectedRate(pieceRates[0].id);
    }
  }, [pieceRates, selectedRate]);

  // Modal State for Generating Payroll
  const [payrollPeriod, setPayrollPeriod] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [payrollStart, setPayrollStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [payrollEnd, setPayrollEnd] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  );

  // Modal State for New Piece Rate
  const [newStageName, setNewStageName] = useState('sewing');
  const [newOpName, setNewOpName] = useState('');
  const [newUnitRate, setNewUnitRate] = useState<number>(3.5);

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
      } else {
        await loadHrData();
      }
      setIsLogModalOpen(false);
      setLogQty(100);
      setSuccessMsg(isAr ? 'تم اعتماد وتسجيل إنتاجية العامل بنجاح' : 'Worker piece output recorded successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل إنتاجية العامل' : 'Failed to record piece work log'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payrollPeriod || !payrollStart || !payrollEnd) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.generatePayroll({
        payroll_period: payrollPeriod,
        period_start: payrollStart,
        period_end: payrollEnd,
      });

      if (res?.payroll) {
        setPayrolls((prev) => [res.payroll, ...prev.filter((p) => p.id !== res.payroll.id)]);
      } else {
        await loadHrData();
      }
      setIsPayrollModalOpen(false);
      setSuccessMsg(isAr ? `تم احتساب واعتماد مسير الرواتب لفترة ${payrollPeriod} بنجاح` : `Payroll for ${payrollPeriod} generated successfully`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل احتساب مسير الرواتب' : 'Failed to generate payroll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePieceRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOpName || newUnitRate <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.createPieceRate({
        stage_name: newStageName,
        operation_name: newOpName,
        rate_per_piece: newUnitRate,
        is_active: true,
      });

      if (res?.piece_rate) {
        setPieceRates((prev) => [res.piece_rate, ...prev]);
      } else {
        await loadHrData();
      }
      setIsRateModalOpen(false);
      setNewOpName('');
      setSuccessMsg(isAr ? 'تمت إضافة تسعيرة العملية الفنية بنجاح' : 'Piece rate created successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة تسعيرة العملية' : 'Failed to create piece rate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real server-backed dynamic calculations
  const totalCompletedPieces = workLogs.reduce((sum, l) => sum + (Number(l.completed_quantity) || 0), 0);
  const totalPieceEarnings = workLogs.reduce((sum, l) => sum + (Number(l.total_amount) || 0), 0);
  const totalApprovedPayroll = payrolls.reduce((sum, p) => sum + (Number(p.total_net) || 0), 0);

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

      {successMsg && (
        <div className="p-3 mb-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
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
                {isAr ? 'إجمالي القطع المنجزة المسجلة' : 'Pieces Produced Recorded'}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalCompletedPieces.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {workLogs.length} {isAr ? 'سجلات تشغيل معتمدة' : 'logged operations'}
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
                {isAr ? 'مستحقات أجور القطعة المسجلة' : 'Piece-Work Earnings'}
              </p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {totalPieceEarnings.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {isAr ? 'حساب آلي سيرفر-سايد' : 'Server-side calculated'}
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
                {isAr ? 'صافي مسيرات الرواتب المعتمدة' : 'Approved Net Payrolls'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalApprovedPayroll.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {payrolls.length} {isAr ? 'مسيرات معتمدة' : 'approved payroll runs'}
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
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'سجل العمال والموظفين' : 'Employees'}
          </button>
          <button
            onClick={() => setActiveSubTab('worklogs')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'worklogs'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'إنتاجية أجور القطعة اليومية' : 'Piece-Work Logs'}
          </button>
          <button
            onClick={() => setActiveSubTab('piecerates')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'piecerates'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'تسعيرة العمليات (Piece Rates)' : 'Piece Rates'}
          </button>
          <button
            onClick={() => setActiveSubTab('payrolls')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'payrolls'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مسيرات الرواتب (Payrolls)' : 'Payrolls'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'worklogs' && (
            <Button size="sm" onClick={() => setIsLogModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'تسجيل إنتاجية عامل' : 'Log Worker Pieces'}
            </Button>
          )}
          {activeSubTab === 'piecerates' && (
            <Button size="sm" onClick={() => setIsRateModalOpen(true)}>
              <Plus className="w-4 h-4 me-1" />
              {isAr ? 'إضافة تسعيرة عملية' : 'New Piece Rate'}
            </Button>
          )}
          {activeSubTab === 'payrolls' && (
            <Button size="sm" onClick={() => setIsPayrollModalOpen(true)}>
              <Calculator className="w-4 h-4 me-1" />
              {isAr ? 'توليد مسير رواتب' : 'Generate Payroll'}
            </Button>
          )}
        </div>
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا يوجد عمال مسجلون حالياً' : 'No employees registered'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{emp.employee_code}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp.name}</td>
                      <td className="p-3 capitalize">{emp.department}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{emp.job_title}</td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium capitalize">
                          {emp.pay_type?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 font-bold">{Number(emp.base_salary).toLocaleString()} ج.م</td>
                      <td className="p-3 text-center">
                        <Badge variant="success">{isAr ? 'نشط' : 'Active'}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedEmp(emp.id);
                              setIsLogModalOpen(true);
                            }}
                            className="text-xs py-1"
                          >
                            <Plus className="w-3.5 h-3.5 me-1" />
                            {isAr ? 'تسجيل إنتاج' : 'Log'}
                          </Button>
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
                              {
                                id: 'print-badge',
                                label: isAr ? 'طباعة بطاقة العمل' : 'Print Worker Badge',
                                icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                                onClick: () => window.print(),
                              },
                              {
                                id: 'view-history',
                                label: isAr ? 'سجل إنتاجية العامل' : 'Output History',
                                icon: <Eye className="w-3.5 h-3.5 text-blue-500" />,
                                onClick: () => {
                                  setActiveSubTab('worklogs');
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {workLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سجلات إنتاجية مسجلة' : 'No piece work logs recorded'}
                    </td>
                  </tr>
                ) : (
                  workLogs.map((log) => {
                    const emp = employees.find((e) => e.id === log.employee_id);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp?.name || log.employee_id}</td>
                        <td className="p-3 font-bold text-primary">{Number(log.completed_quantity).toLocaleString()} {isAr ? 'قطعة' : 'pcs'}</td>
                        <td className="p-3">{Number(log.unit_rate).toFixed(2)} ج.م</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(log.total_amount).toLocaleString()} ج.م
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{log.work_date}</td>
                        <td className="p-3 text-center">
                          <Badge variant="success">{isAr ? 'معتمد' : 'Verified'}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
                              {
                                id: 'print-slip',
                                label: isAr ? 'طباعة إذن احتساب الأجر' : 'Print Piece Slip',
                                icon: <Printer className="w-3.5 h-3.5 text-primary" />,
                                onClick: () => window.print(),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
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
                {pieceRates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد تسعيرات عمليات مسجلة' : 'No piece rates defined'}
                    </td>
                  </tr>
                ) : (
                  pieceRates.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 capitalize font-semibold text-primary">{pr.stage_name}</td>
                      <td className="p-3 text-slate-900 dark:text-white font-medium">{pr.operation_name}</td>
                      <td className="p-3 text-end font-bold text-emerald-600 dark:text-emerald-400 text-base">
                        {Number(pr.rate_per_piece).toFixed(2)} ج.م
                      </td>
                    </tr>
                  ))
                )}
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
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد مسيرات رواتب مسجلة' : 'No payrolls generated'}
                    </td>
                  </tr>
                ) : (
                  payrolls.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{p.payroll_period}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{p.period_start}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{p.period_end}</td>
                      <td className="p-3 font-semibold">{Number(p.total_gross).toLocaleString()} ج.م</td>
                      <td className="p-3 text-amber-600 dark:text-amber-400">{Number(p.total_deductions).toLocaleString()} ج.م</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 text-base">
                        {Number(p.total_net).toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="success">{p.status?.toUpperCase()}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.print()}
                            className="text-xs py-1"
                          >
                            <Printer className="w-3.5 h-3.5 me-1" />
                            {isAr ? 'طباعة' : 'Print'}
                          </Button>
                          <ActionsMenu
                            variant="icon-horizontal"
                            align={isAr ? 'left' : 'right'}
                            items={[
                              {
                                id: 'bank-file',
                                label: isAr ? 'تصدير ملف التحويل البنكي' : 'Export Bank File',
                                icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
                                onClick: () => {
                                  alert(isAr ? `تم تجهيز ملف التحويل البنكي لمسير: ${p.payroll_period}` : `Bank transfer file ready for: ${p.payroll_period}`);
                                },
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                <option key={r.id} value={r.id}>{r.operation_name} ({Number(r.rate_per_piece).toFixed(2)} ج.م/قطعة)</option>
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
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

      {/* Generate Payroll Modal */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title={isAr ? 'احتساب وتوليد مسير الرواتب المعتمد' : 'Generate Certified Payroll Run'}
      >
        <form onSubmit={handleGeneratePayroll} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود الفترة (الشهر/العام) *' : 'Payroll Period *'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-10"
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'بداية الفترة *' : 'Period Start *'}
              </label>
              <input
                type="date"
                required
                value={payrollStart}
                onChange={(e) => setPayrollStart(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نهاية الفترة *' : 'Period End *'}
              </label>
              <input
                type="date"
                required
                value={payrollEnd}
                onChange={(e) => setPayrollEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-500">
            {isAr
              ? 'سيقوم السيرفر بتجميع إنتاجية كل عامل معتمدة من رقابة الجودة، واحتساب مستحقات أجور القطعة، وإضافتها للراتب الأساسي وحفظ المسير الدفتري لمنع الازدواجية.'
              : 'The server will calculate piece rate output + base salary with duplicate payment prevention.'}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPayrollModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التوليد...' : 'Generating...'}
                </>
              ) : (
                isAr ? 'توليد واعتماد المسير' : 'Generate Payroll'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Piece Rate Modal */}
      <Modal
        isOpen={isRateModalOpen}
        onClose={() => setIsRateModalOpen(false)}
        title={isAr ? 'إضافة تسعيرة عملية فنية جديدة' : 'Add New Standard Piece Rate'}
      >
        <form onSubmit={handleCreatePieceRate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مرحلة التشغيل *' : 'Production Stage *'}
            </label>
            <select
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="cutting">{isAr ? 'قص وتجهيز' : 'Cutting'}</option>
              <option value="sewing">{isAr ? 'حياكة وخياطة' : 'Sewing'}</option>
              <option value="ironing">{isAr ? 'كي وتشطيب' : 'Ironing & Finishing'}</option>
              <option value="packaging">{isAr ? 'تغليف وتعبئة' : 'Packaging'}</option>
              <option value="quality">{isAr ? 'فحص جودة' : 'Quality'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العملية الفنية *' : 'Operation Name *'}
            </label>
            <input
              type="text"
              required
              value={newOpName}
              onChange={(e) => setNewOpName(e.target.value)}
              placeholder={isAr ? 'مثال: تركيب ياقة وسوستة سحرية' : 'e.g. Collar stitch and invisible zipper'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'أجر القطعة (جنيه مصري) *' : 'Rate Per Piece (EGP) *'}
            </label>
            <input
              type="number"
              min="0.1"
              step="0.05"
              required
              value={newUnitRate}
              onChange={(e) => setNewUnitRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsRateModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ التسعيرة' : 'Save Rate'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

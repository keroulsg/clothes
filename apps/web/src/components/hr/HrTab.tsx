import React, { useState } from 'react';
import {
  Users,
  Award,
  Calendar,
  Plus,
  DollarSign,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import type { Language, Employee, PieceRate, PieceWorkLog, Payroll } from '../../types';

interface HrTabProps {
  lang: Language;
}

export const HrTab: React.FC<HrTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'piecerates' | 'worklogs' | 'payrolls'>('employees');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Workers state
  const [employees] = useState<Employee[]>([

    {
      id: 'emp-1',
      employee_code: 'EMP-001',
      name: isAr ? 'محمد حسن إبراهيم' : 'Mohamed Hassan',
      department: 'sewing',
      job_title: isAr ? 'صنايعي خياطة (سنجر/أوفر)' : 'Sewing Machine Operator',
      pay_type: 'piece_rate',
      base_salary: 1500,
      phone: '01012345678',
      is_active: true,
    },
    {
      id: 'emp-2',
      employee_code: 'EMP-002',
      name: isAr ? 'محمود علي فتحي' : 'Mahmoud Ali',
      department: 'cutting',
      job_title: isAr ? 'مساعد مقصدار أول' : 'Senior Cutter Assistant',
      pay_type: 'hybrid',
      base_salary: 3000,
      phone: '01123456789',
      is_active: true,
    },
    {
      id: 'emp-3',
      employee_code: 'EMP-003',
      name: isAr ? 'فاطمة الزهراء أحمد' : 'Fatima Al-Zahra',
      department: 'finishing',
      job_title: isAr ? 'مشرفة تشطيب وكوي' : 'Ironing & Finishing Lead',
      pay_type: 'piece_rate',
      base_salary: 1200,
      phone: '01234567890',
      is_active: true,
    },
  ]);

  const [pieceRates] = useState<PieceRate[]>([
    { id: 'pr-1', stage_name: 'sewing', operation_name: isAr ? 'تركيب ياقة البولو مع الشريطة' : 'Polo Collar & Tape Assembly', rate_per_piece: 3.50, is_active: true },
    { id: 'pr-2', stage_name: 'sewing', operation_name: isAr ? 'خياطة الجانبين وتسكير التيشيرت' : 'Side Seam Overlock', rate_per_piece: 1.80, is_active: true },
    { id: 'pr-3', stage_name: 'sewing', operation_name: isAr ? 'تركيب السوستة وتثبيت الجرار' : 'Zipper Attachment', rate_per_piece: 2.20, is_active: true },
    { id: 'pr-4', stage_name: 'ironing', operation_name: isAr ? 'كوي نهائي على البخار وتغليف' : 'Steam Ironing & Polybag Packing', rate_per_piece: 1.25, is_active: true },
  ]);

  const [workLogs, setWorkLogs] = useState<PieceWorkLog[]>([
    {
      id: 'log-1',
      employee_id: 'emp-1',
      completed_quantity: 450,
      unit_rate: 3.50,
      total_amount: 1575,
      work_date: '2026-10-19',
      status: 'verified',
    },
    {
      id: 'log-2',
      employee_id: 'emp-3',
      completed_quantity: 800,
      unit_rate: 1.25,
      total_amount: 1000,
      work_date: '2026-10-19',
      status: 'verified',
    },
  ]);

  const [payrolls] = useState<Payroll[]>([

    {
      id: 'pay-1',
      payroll_period: '2026-10',
      period_start: '2026-10-01',
      period_end: '2026-10-31',
      total_gross: 42000,
      total_deductions: 2500,
      total_net: 39500,
      status: 'approved',
    },
  ]);

  // Modal State for Logging Piece Work
  const [selectedEmp, setSelectedEmp] = useState(employees[0].id);
  const [selectedRate, setSelectedRate] = useState(pieceRates[0].id);
  const [logQty, setLogQty] = useState<number>(100);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const rateObj = pieceRates.find((r) => r.id === selectedRate);
    const rate = rateObj ? rateObj.rate_per_piece : 3.50;
    const total = logQty * rate;

    const newLog: PieceWorkLog = {
      id: `log-${Date.now()}`,
      employee_id: selectedEmp,
      completed_quantity: logQty,
      unit_rate: rate,
      total_amount: total,
      work_date: new Date().toISOString().split('T')[0],
      status: 'verified',
    };

    setWorkLogs([newLog, ...workLogs]);
    setIsLogModalOpen(false);
  };

  return (
    <div className="space-y-6">
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
            <Button type="submit">
              {isAr ? 'اعتماد وتسجيل الإنتاجية' : 'Log Output'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

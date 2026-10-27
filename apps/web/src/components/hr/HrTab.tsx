import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  Plus,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calculator,
  Printer,
  FileText,
  ShieldAlert,
  Check,
  X,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ActionsMenu } from '../ui/ActionsMenu';
import { PageHeader } from '../ui/PageHeader';
import { api } from '../../api/client';
import type { Language, Employee, PieceRate, PieceWorkLog, Payroll, QualityDefectAdjustment } from '../../types';

interface HrTabProps {
  lang: Language;
}

export const HrTab: React.FC<HrTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<'employees' | 'piecerates' | 'worklogs' | 'payrolls' | 'defects'>('employees');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [isObjectionModalOpen, setIsObjectionModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'reject_log' | 'reject_defect' | 'reverse_defect' | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState<QualityDefectAdjustment | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [objectionNotes, setObjectionNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Workers state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pieceRates, setPieceRates] = useState<PieceRate[]>([]);
  const [workLogs, setWorkLogs] = useState<PieceWorkLog[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [defectAdjustments, setDefectAdjustments] = useState<QualityDefectAdjustment[]>([]);

  const loadHrData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [empRes, prRes, logsRes, payrollsRes, defectsRes] = await Promise.allSettled([
        api.hr.getEmployees(1),
        api.hr.getPieceRates(1),
        api.hr.getPieceWorkLogs(1),
        api.hr.getPayrolls(1),
        api.hr.getDefectAdjustments(1),
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
      if (defectsRes.status === 'fulfilled' && defectsRes.value?.data) {
        setDefectAdjustments(defectsRes.value.data);
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

  // Modal State for New Defect Adjustment (Phase 09B)
  const [defectEmpId, setDefectEmpId] = useState('');
  const [defectOrderId, setDefectOrderId] = useState('');
  const [defectReason, setDefectReason] = useState('');
  const [defectProposedAmount, setDefectProposedAmount] = useState<number>(100);
  const [defectInvestigationNotes, setDefectInvestigationNotes] = useState('');

  useEffect(() => {
    if (employees.length > 0 && !defectEmpId) {
      setDefectEmpId(employees[0].id);
    }
  }, [employees, defectEmpId]);

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
      setSuccessMsg(isAr ? 'تم تسجيل إنتاجية العامل بنجاح' : 'Worker piece output recorded successfully');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل إنتاجية العامل' : 'Failed to record piece work log'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveLog = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await api.hr.approvePieceWorkLog(id);
      setSuccessMsg(res.message || (isAr ? 'تم اعتماد سجل الإنتاجية' : 'Log approved'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل اعتماد سجل الإنتاجية' : 'Failed to approve log'));
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

  const handlePayPayroll = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من صرف مسير الرواتب؟ سيتم قفل المسير نهائياً ولن يمكن إعادة احتسابه.' : 'Confirm payroll payment? Paid payrolls are locked and cannot be recalculated.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.hr.markPayrollPaid(id);
      setSuccessMsg(res.message || (isAr ? 'تم صرف مسير الرواتب وقفله بنجاح' : 'Payroll marked as paid'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إتمام صرف المسير' : 'Failed to mark payroll paid'));
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

  // Phase 09B Defect Adjustments Handlers
  const handleCreateDefectAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectEmpId || !defectOrderId || !defectReason || defectProposedAmount < 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.createDefectAdjustment({
        employee_id: defectEmpId,
        production_order_id: defectOrderId,
        adjustment_reason: defectReason,
        proposed_penalty_amount: defectProposedAmount,
        investigation_notes: defectInvestigationNotes,
      });

      setSuccessMsg(res.message || (isAr ? 'تم تسجيل تقرير عيب الجودة بنجاح' : 'Defect report recorded'));
      setIsDefectModalOpen(false);
      setDefectReason('');
      setDefectInvestigationNotes('');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل تقرير عيب الجودة' : 'Failed to report defect'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAdjustment = async (adj: QualityDefectAdjustment) => {
    setIsSubmitting(true);
    try {
      const res = await api.hr.approveDefectAdjustment(adj.id);
      setSuccessMsg(res.message || (isAr ? 'تم اعتماد الخصم رسمياً بواسطة مدير الإنتاج' : 'Defect deduction approved'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل اعتماد الخصم' : 'Failed to approve deduction'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenObjectionModal = (adj: QualityDefectAdjustment) => {
    setSelectedAdjustment(adj);
    setObjectionNotes(adj.worker_objection_notes || '');
    setIsObjectionModalOpen(true);
  };

  const handleSubmitObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment || !objectionNotes) return;

    setIsSubmitting(true);
    try {
      const res = await api.hr.recordWorkerObjection(selectedAdjustment.id, {
        objection_notes: objectionNotes,
      });
      setSuccessMsg(res.message || (isAr ? 'تم توثيق تظلم واعتراض العامل بنجاح' : 'Objection recorded'));
      setIsObjectionModalOpen(false);
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل التظلم' : 'Failed to record objection'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenActionModal = (type: 'reject_log' | 'reject_defect' | 'reverse_defect', id: string, adj?: QualityDefectAdjustment) => {
    setActionType(type);
    setSelectedLogId(id);
    setSelectedAdjustment(adj || null);
    setActionReason('');
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionReason) return;

    setIsSubmitting(true);
    try {
      if (actionType === 'reject_log' && selectedLogId) {
        const res = await api.hr.rejectPieceWorkLog(selectedLogId, actionReason);
        setSuccessMsg(res.message || (isAr ? 'تم رفض سجل الإنتاجية' : 'Log rejected'));
      } else if (actionType === 'reject_defect' && selectedAdjustment) {
        const res = await api.hr.rejectDefectAdjustment(selectedAdjustment.id, {
          rejection_reason: actionReason,
        });
        setSuccessMsg(res.message || (isAr ? 'تم رفض الخصم وإسقاط العقوبة' : 'Deduction rejected'));
      } else if (actionType === 'reverse_defect' && selectedAdjustment) {
        const res = await api.hr.reverseDefectAdjustment(selectedAdjustment.id, {
          reversal_reason: actionReason,
        });
        setSuccessMsg(res.message || (isAr ? 'تم إلغاء الخصم بقيد تعويضي' : 'Deduction reversed'));
      }
      setIsActionModalOpen(false);
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Real server-backed dynamic calculations
  const totalCompletedPieces = workLogs.reduce((sum, l) => sum + (Number(l.completed_quantity) || 0), 0);
  const totalPieceEarnings = workLogs.reduce((sum, l) => sum + (Number(l.total_amount) || 0), 0);
  const totalApprovedPayroll = payrolls.reduce((sum, p) => sum + (Number(p.total_net) || 0), 0);
  const pendingDefectCount = defectAdjustments.filter((d) => d.status === 'pending_approval' || d.status === 'objected').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAr ? 'إدارة الموارد البشرية وأجور القطعة' : 'Workforce & Piece-Rate Payroll'}
        subtitle={isAr
          ? 'إدارة عمال الإنتاج، تسعير العمليات، تسجيل سجلات إنتاجية القطعة، تسويات عيوب الجودة والخصومات المعتمدة، وإصدار مسيرات الرواتب.'
          : 'Worker registry, operation piece-rate pricing, work logs, defect adjustments, and payroll runs.'}
        icon={<Users className="w-5 h-5 text-[#7F1625] dark:text-[#F87171]" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'أجور القطعة والعمال' : 'Workforce & Piece-Rate' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsLogModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {isAr ? '+ تسجيل إنتاجية عامل' : '+ Log Piece-Work'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDefectModalOpen(true)}
              icon={<ShieldAlert className="w-4 h-4 text-amber-600" />}
            >
              {isAr ? '+ بلاغ عيب جودة وخصم' : '+ Defect Adjustment'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRateModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {isAr ? '+ تسعيرة عملية' : '+ Piece Rate'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPayrollModalOpen(true)}
              icon={<Calculator className="w-4 h-4" />}
            >
              {isAr ? 'إصدار مسير رواتب' : 'Generate Payroll'}
            </Button>
          </div>
        }
      />

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
                {isAr ? 'إجمالي القطع المنجزة المعتمدة' : 'Completed Verified Pieces'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalCompletedPieces.toLocaleString()}
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {workLogs.length} {isAr ? 'سجل تشغيل' : 'production logs'}
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
                {isAr ? 'إجمالي مستحقات القطعة الفعلية' : 'Direct Piece Earnings'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {totalPieceEarnings.toLocaleString()} ج.م
              </p>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {isAr ? `المسيرات: ${totalApprovedPayroll.toLocaleString()} ج.م` : `Payrolls: ${totalApprovedPayroll.toLocaleString()} EGP`}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'بلاغات عيوب الجودة المعلقة' : 'Pending Defect Adjustments'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${pendingDefectCount > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                {pendingDefectCount}
              </p>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                {isAr ? 'تتطلب مراجعة واعتماد صريح' : 'Awaiting manager approval'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <ShieldAlert className="w-5 h-5" />
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
            {isAr ? 'إنتاجية أجور القطعة' : 'Piece-Work Logs'}
          </button>
          <button
            onClick={() => setActiveSubTab('defects')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
              activeSubTab === 'defects'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'تسويات عيوب الجودة والخصومات' : 'Defect Adjustments'}
            {pendingDefectCount > 0 && (
              <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingDefectCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('piecerates')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'piecerates'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'لائحة أسعار العمليات' : 'Piece Rates'}
          </button>
          <button
            onClick={() => setActiveSubTab('payrolls')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'payrolls'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-800 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مسيرات الرواتب والمستحقات' : 'Payrolls'}
          </button>
        </div>
      </div>

      {/* EMPLOYEES VIEW */}
      {activeSubTab === 'employees' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجل عمال الإنتاج والموظفين النشطين' : 'Active Factory Workforce Registry'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'الكود' : 'Code'}</th>
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
                      {isAr ? 'لا يوجد عمال مسجلين بعد' : 'No employees registered'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{emp.employee_code}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{emp.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {emp.department}
                        </span>
                      </td>
                      <td className="p-3">{emp.job_title}</td>
                      <td className="p-3">
                        <Badge variant={emp.pay_type === 'piece_rate' ? 'brand' : 'neutral'}>
                          {emp.pay_type === 'piece_rate' ? (isAr ? 'أجر بالقطعة' : 'Piece-Rate') : emp.pay_type}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono">{Number(emp.base_salary).toLocaleString()} ج.م</td>
                      <td className="p-3 text-center">
                        <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                          {emp.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <ActionsMenu
                          variant="icon-horizontal"
                          align={isAr ? 'left' : 'right'}
                          items={[
                            {
                              id: 'log-worker-piece',
                              label: isAr ? 'تسجيل إنتاجية لهذا العامل' : 'Log Piece Work',
                              icon: <Plus className="w-3.5 h-3.5 text-primary" />,
                              onClick: () => {
                                setSelectedEmp(emp.id);
                                setIsLogModalOpen(true);
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
                  <th className="p-3 text-start">{isAr ? 'الكمية السليمة' : 'Pieces Completed'}</th>
                  <th className="p-3 text-start">{isAr ? 'سعر القطعة' : 'Rate / Piece'}</th>
                  <th className="p-3 text-start">{isAr ? 'المستحق المالي' : 'Total Earnings'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ التشغيل' : 'Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'حالة الاعتماد' : 'Approval Status'}</th>
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
                          {log.status === 'approved' && <Badge variant="success">{isAr ? 'معتمد' : 'Approved'}</Badge>}
                          {log.status === 'verified' && <Badge variant="brand">{isAr ? 'موثق رقابياً' : 'Verified'}</Badge>}
                          {log.status === 'rejected' && <Badge variant="danger">{isAr ? 'مرفوض' : 'Rejected'}</Badge>}
                          {log.status === 'paid' && <Badge variant="neutral">{isAr ? 'مدفوع' : 'Paid'}</Badge>}
                          {log.status === 'pending' && <Badge variant="warning">{isAr ? 'معلق' : 'Pending'}</Badge>}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {log.status !== 'approved' && log.status !== 'paid' && log.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveLog(log.id)}
                                className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                              >
                                <Check className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'اعتماد' : 'Approve'}
                              </Button>
                            )}
                            {log.status !== 'paid' && log.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenActionModal('reject_log', log.id)}
                                className="text-xs py-1 text-rose-600 hover:text-rose-700"
                              >
                                <X className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'رفض' : 'Reject'}
                              </Button>
                            )}
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
      )}

      {/* PHASE 09B DEFECT ADJUSTMENTS VIEW */}
      {activeSubTab === 'defects' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                {isAr ? 'سجل تسويات عيوب الجودة والخصومات المعتمدة' : 'Quality Defect Adjustments & Auditable Deductions'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {isAr
                  ? 'القاعدة الرقابية: تسجيل العيب لا يخصم من أجر العامل تلقائياً قط، بل يتطلب تحقيقاً موثقاً واعتماداً صريحاً من مدير الإنتاج مع إتاحة تظلم العامل.'
                  : 'Critical Rule: Defect reporting NEVER automatically deducts worker wages. Explicit authorized approval required.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsDefectModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              {isAr ? '+ تسجيل بلاغ عيب وخصم' : '+ Report Defect'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'العامل' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'سبب العيب والتحقيق' : 'Reason & Investigation'}</th>
                  <th className="p-3 text-start">{isAr ? 'الخصم المقترح' : 'Proposed Deduction'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة الرقابية' : 'Control Status'}</th>
                  <th className="p-3 text-start">{isAr ? 'تظلم العامل' : 'Worker Objection'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {defectAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد تسويات عيوب جودة مسجلة' : 'No defect adjustments recorded'}
                    </td>
                  </tr>
                ) : (
                  defectAdjustments.map((adj) => {
                    const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{emp?.name || adj.employee_id}</p>
                          <span className="text-xs text-slate-400 font-mono">{emp?.employee_code}</span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{adj.adjustment_reason}</p>
                          {adj.investigation_notes && (
                            <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{adj.investigation_notes}</p>
                          )}
                        </td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          {Number(adj.proposed_penalty_amount).toFixed(2)} ج.م
                        </td>
                        <td className="p-3 text-center">
                          {adj.status === 'pending_approval' && (
                            <Badge variant="warning">{isAr ? 'معلق للاعتماد (لم يخصم)' : 'Pending Approval'}</Badge>
                          )}
                          {adj.status === 'approved' && (
                            <Badge variant="success">{isAr ? 'معتمد للخصم بالمسير' : 'Approved'}</Badge>
                          )}
                          {adj.status === 'rejected' && (
                            <Badge variant="danger">{isAr ? 'مرفوض / ساقط' : 'Rejected'}</Badge>
                          )}
                          {adj.status === 'objected' && (
                            <Badge variant="info">{isAr ? 'محل تظلم واعتراض' : 'Objected'}</Badge>
                          )}
                          {adj.status === 'settled' && (
                            <Badge variant="neutral">{isAr ? 'تمت التسوية بالمسير' : 'Settled'}</Badge>
                          )}
                          {adj.status === 'reversed' && (
                            <Badge variant="neutral">{isAr ? 'ملغي بقيد تعويضي' : 'Reversed'}</Badge>
                          )}
                        </td>
                        <td className="p-3 max-w-xs text-xs">
                          {adj.worker_objection_notes ? (
                            <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
                              <span className="font-semibold flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {isAr ? 'تظلم العامل:' : 'Objection:'}
                              </span>
                              <p className="mt-0.5 line-clamp-2">{adj.worker_objection_notes}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">{isAr ? 'لا يوجد تظلم' : 'None'}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {(adj.status === 'pending_approval' || adj.status === 'objected') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveAdjustment(adj)}
                                className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                              >
                                <Check className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'اعتماد الخصم' : 'Approve'}
                              </Button>
                            )}

                            {(adj.status === 'pending_approval' || adj.status === 'objected') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenActionModal('reject_defect', adj.id, adj)}
                                className="text-xs py-1 text-rose-600 hover:text-rose-700"
                              >
                                <X className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'رفض' : 'Reject'}
                              </Button>
                            )}

                            {adj.status !== 'settled' && adj.status !== 'reversed' && adj.status !== 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenObjectionModal(adj)}
                                className="text-xs py-1 text-blue-600 hover:text-blue-700"
                              >
                                <MessageSquare className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'تظلم' : 'Object'}
                              </Button>
                            )}

                            {(adj.status === 'settled' || adj.status === 'approved') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenActionModal('reverse_defect', adj.id, adj)}
                                className="text-xs py-1 text-purple-600 hover:text-purple-700"
                              >
                                <RotateCcw className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'إلغاء تعويضي' : 'Reverse'}
                              </Button>
                            )}
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
      )}

      {/* PIECE RATES VIEW */}
      {activeSubTab === 'piecerates' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'لائحة أسعار العمليات الفنية للأجر بالقطعة' : 'Standard Piece-Rate Pricing Catalogue'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'المرحلة' : 'Stage'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العملية الفنية' : 'Operation Name'}</th>
                  <th className="p-3 text-start">{isAr ? 'أجر القطعة القياسي' : 'Standard Rate / Piece'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {pieceRates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد تسعيرات عمليات مضافة' : 'No piece rates configured'}
                    </td>
                  </tr>
                ) : (
                  pieceRates.map((rate) => (
                    <tr key={rate.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-primary">{rate.stage_name}</td>
                      <td className="p-3 font-medium text-slate-900 dark:text-white">{rate.operation_name}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(rate.rate_per_piece).toFixed(2)} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={rate.is_active ? 'success' : 'neutral'}>
                          {rate.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </Badge>
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
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'مسيرات الرواتب الدفترية المعتمدة للمصنع' : 'Certified Payroll Runs & Factory Settlements'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود الفترة' : 'Period Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'من تاريخ' : 'Start'}</th>
                  <th className="p-3 text-start">{isAr ? 'إلى تاريخ' : 'End'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي المستحق' : 'Gross Total'}</th>
                  <th className="p-3 text-start">{isAr ? 'الاستقطاعات والخصومات' : 'Total Deductions'}</th>
                  <th className="p-3 text-start">{isAr ? 'صافي المسير' : 'Net Salary'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد مسيرات رواتب مصدرة بعد' : 'No payroll runs generated'}
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
                        <Badge variant={p.status === 'paid' ? 'brand' : p.status === 'approved' ? 'success' : 'warning'}>
                          {p.status === 'paid' ? (isAr ? 'مدفوع ومقفل' : 'PAID') : p.status?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayPayroll(p.id)}
                              className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                            >
                              <Lock className="w-3.5 h-3.5 me-1" />
                              {isAr ? 'تأكيد الصرف' : 'Pay'}
                            </Button>
                          )}
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
                  {isAr ? 'جاري الحفظ...' : 'Logging...'}
                </>
              ) : (
                isAr ? 'تسجيل الإنتاجية' : 'Log Output'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PHASE 09B: Report Defect & Propose Deduction Modal */}
      <Modal
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        title={isAr ? 'تسجيل بلاغ عيب جودة وخصم مقترح' : 'Report Quality Defect & Propose Deduction'}
      >
        <form onSubmit={handleCreateDefectAdjustment} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <span>
              {isAr
                ? 'قاعدة نظام GarmentOS: بلاغ عيب الجودة لا ينفذ خصماً تلقائياً قط. يبدأ البلاغ بحالة معلقة تتطلب اعتماداً صريحاً من مدير الإنتاج بعد التحقيق الفني.'
                : 'Defect reporting NEVER automatically deducts worker wages. Explicit production manager approval required.'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العامل المتسبب *' : 'Responsible Worker *'}
            </label>
            <select
              value={defectEmpId}
              onChange={(e) => setDefectEmpId(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.employee_code} - {e.name} ({e.department})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'معرف أو كود أمر الإنتاج المرتبط *' : 'Production Order ID / Code *'}
            </label>
            <input
              type="text"
              required
              value={defectOrderId}
              onChange={(e) => setDefectOrderId(e.target.value)}
              placeholder="e.g. PO-2026-001 or Order UUID"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب العيب الفني ومبرر الخصم *' : 'Defect Reason & Justification *'}
            </label>
            <input
              type="text"
              required
              value={defectReason}
              onChange={(e) => setDefectReason(e.target.value)}
              placeholder={isAr ? 'مثال: إتلاف 5 ياقات بسبب شد خاطئ لمكوك الخيط' : 'e.g. 5 collars damaged due to incorrect bobbin tension'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'قيمة الخصم المقترحة (جنيه مصري) *' : 'Proposed Deduction Amount (EGP) *'}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={defectProposedAmount}
              onChange={(e) => setDefectProposedAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات التحقيق والمعاينة الفنية' : 'Investigation & Inspection Notes'}
            </label>
            <textarea
              rows={2}
              value={defectInvestigationNotes}
              onChange={(e) => setDefectInvestigationNotes(e.target.value)}
              placeholder={isAr ? 'تفاصيل فحص مراقب الجودة وتحديد المسؤولية...' : 'Inspection details and responsibility analysis...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsDefectModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التسجيل...' : 'Submitting...'}
                </>
              ) : (
                isAr ? 'تسجيل البلاغ (معلق للاعتماد)' : 'Submit for Approval'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Worker Objection Modal */}
      <Modal
        isOpen={isObjectionModalOpen}
        onClose={() => setIsObjectionModalOpen(false)}
        title={isAr ? 'تسجيل تظلم واعتراض العامل' : 'Record Worker Objection'}
      >
        <form onSubmit={handleSubmitObjection} className="space-y-4">
          <p className="text-xs text-slate-500">
            {isAr
              ? `تسجيل تظلم واعتراض رسمي للعامل بخصوص خصم مبلغ ${selectedAdjustment?.proposed_penalty_amount} ج.م لسبب: "${selectedAdjustment?.adjustment_reason}".`
              : `Submit formal worker objection against deduction of ${selectedAdjustment?.proposed_penalty_amount} EGP for: "${selectedAdjustment?.adjustment_reason}".`}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'نص تظلم ودفاع العامل *' : 'Worker Objection & Defense Statement *'}
            </label>
            <textarea
              rows={3}
              required
              value={objectionNotes}
              onChange={(e) => setObjectionNotes(e.target.value)}
              placeholder={isAr ? 'أسباب عدم مسؤولية العامل عن العيب (مثل عيب خامة، خلل ميكانيكي بالماكينة...)' : 'Worker grounds for contesting the defect (e.g. fabric defect, machine malfunction)...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsObjectionModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التوثيق...' : 'Submitting...'}
                </>
              ) : (
                isAr ? 'توثيق التظلم' : 'Save Objection'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Action / Rejection / Reversal Modal */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'reject_log'
            ? (isAr ? 'رفض سجل إنتاجية العامل' : 'Reject Piece Work Log')
            : actionType === 'reject_defect'
            ? (isAr ? 'رفض وإسقاط خصم عيب الجودة' : 'Reject Defect Deduction')
            : (isAr ? 'إلغاء الخصم بقيد تسوية تعويضي' : 'Reverse Deduction via Compensating Entry')
        }
      >
        <form onSubmit={handleExecuteAction} className="space-y-4">
          <p className="text-xs text-slate-500">
            {actionType === 'reverse_defect'
              ? (isAr
                ? 'الحماية المالية: لن يتم حذف السجل الأصلي، بل سيتم إصدار قيد تعويضي دفتري يوثق استرداد المبلغ للعامل مع إدراج سبب الإلغاء في سجل الرقابة والتدقيق.'
                : 'Financial protection: Original record will NOT be deleted. A compensating audit credit will be generated.')
              : (isAr
                ? 'يرجى تدوين سبب الرفض الصريح لحفظه في سجل الرقابة والتدقيق.'
                : 'Please state the explicit reason for the audit trail.')}
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'السبب الموثق *' : 'Documented Reason *'}
            </label>
            <textarea
              rows={3}
              required
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder={isAr ? 'اكتب مبررات القرار الرقابي...' : 'Enter justification...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsActionModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="danger">
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التنفيذ...' : 'Executing...'}
                </>
              ) : (
                isAr ? 'تأكيد الإجراء' : 'Confirm Action'
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
              ? 'سيقوم السيرفر بتجميع إنتاجية كل عامل معتمدة، واحتساب مستحقات أجور القطعة، وخصم تسويات عيوب الجودة المعتمدة حصراً، وإضافتها للراتب الأساسي مع منع التكرار.'
              : 'The server will calculate piece rate output + base salary, deduct approved defect penalties, and prevent duplicate deductions.'}
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

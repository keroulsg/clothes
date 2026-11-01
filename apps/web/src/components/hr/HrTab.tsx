import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  DollarSign,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Calculator,
  Printer,
  ShieldAlert,
  Check,
  X,
  RotateCcw,
  MessageSquare,
  AlertTriangle,
  Lock,
  Calendar,
  Clock,
  CreditCard,
  Eye,
  Edit2,
  Search,
  Filter,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { api } from '../../api/client';
import type {
  Language,
  Employee,
  PieceRate,
  PieceWorkLog,
  Payroll,
  QualityDefectAdjustment,
  Attendance,
  EmployeeAdjustment,
} from '../../types';

interface HrTabProps {
  lang: Language;
}

export const HrTab: React.FC<HrTabProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [activeSubTab, setActiveSubTab] = useState<
    'employees' | 'attendance' | 'worklogs' | 'adjustments' | 'defects' | 'piecerates' | 'payrolls'
  >('employees');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [isObjectionModalOpen, setIsObjectionModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isEditEmployeeModalOpen, setIsEditEmployeeModalOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isCorrectAttendanceModalOpen, setIsCorrectAttendanceModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPayrollDetailModalOpen, setIsPayrollDetailModalOpen] = useState(false);
  const [isPrintSlipModalOpen, setIsPrintSlipModalOpen] = useState(false);

  // General loading & message state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Entities state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pieceRates, setPieceRates] = useState<PieceRate[]>([]);
  const [workLogs, setWorkLogs] = useState<PieceWorkLog[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [defectAdjustments, setDefectAdjustments] = useState<QualityDefectAdjustment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [adjustments, setAdjustments] = useState<EmployeeAdjustment[]>([]);

  // Filter state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all');
  const [employeePayTypeFilter, setEmployeePayTypeFilter] = useState('all');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Selected item states
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<Employee | null>(null);
  const [selectedAttendanceForEdit, setSelectedAttendanceForEdit] = useState<Attendance | null>(null);
  const [selectedPayrollForView, setSelectedPayrollForView] = useState<Payroll | null>(null);
  const [selectedAdjustment, setSelectedAdjustment] = useState<QualityDefectAdjustment | null>(null);
  const [actionType, setActionType] = useState<'reject_log' | 'reject_defect' | 'reverse_defect' | 'reject_adjustment' | 'reject_payroll' | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [objectionNotes, setObjectionNotes] = useState('');

  // Form States - Employee Create/Edit
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDepartment, setEmpDepartment] = useState('sewing');
  const [empJobTitle, setEmpJobTitle] = useState('');
  const [empPayType, setEmpPayType] = useState<'piece_rate' | 'fixed_salary' | 'hourly' | 'daily' | 'hybrid'>('piece_rate');
  const [empBaseSalary, setEmpBaseSalary] = useState<number>(0);
  const [empHourlyRate, setEmpHourlyRate] = useState<number>(0);
  const [empDailyRate, setEmpDailyRate] = useState<number>(0);
  const [empShiftName, setEmpShiftName] = useState('morning');
  const [empHireDate, setEmpHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [empPhone, setEmpPhone] = useState('');
  const [empNationalId, setEmpNationalId] = useState('');
  const [empIsActive, setEmpIsActive] = useState(true);

  // Form States - Attendance
  const [attEmployeeId, setAttEmployeeId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attCheckIn, setAttCheckIn] = useState('08:00');
  const [attCheckOut, setAttCheckOut] = useState('16:30');
  const [attStatus, setAttStatus] = useState<'present' | 'absent' | 'leave' | 'late' | 'half_day'>('present');
  const [attIsPayable, setAttIsPayable] = useState(true);
  const [attCorrectionReason, setAttCorrectionReason] = useState('');

  // Form States - Adjustments
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjType, setAdjType] = useState<'advance' | 'bonus' | 'allowance' | 'deduction'>('advance');
  const [adjAmount, setAdjAmount] = useState<number>(500);
  const [adjEffectiveDate, setAdjEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjReason, setAdjReason] = useState('');

  // Form States - Payroll Payment
  const [paymentPayroll, setPaymentPayroll] = useState<Payroll | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'instapay' | 'cheque'>('cash');
  const [paymentRefNumber, setPaymentRefNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentEmployeeId, setPaymentEmployeeId] = useState<string>('');

  // Modal State for Logging Piece Work
  const [selectedEmp, setSelectedEmp] = useState('');
  const [selectedRate, setSelectedRate] = useState('');
  const [logQty, setLogQty] = useState<number>(100);

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

  const loadHrData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [empRes, prRes, logsRes, payrollsRes, defectsRes, attRes, adjRes] = await Promise.allSettled([
        api.hr.getEmployees(1, { search: employeeSearch, department: employeeDeptFilter, pay_type: employeePayTypeFilter }),
        api.hr.getPieceRates(1),
        api.hr.getPieceWorkLogs(1),
        api.hr.getPayrolls(1),
        api.hr.getDefectAdjustments(1),
        api.hr.getAttendances(1, { attendance_date: attendanceDateFilter }),
        api.hr.getAdjustments(1),
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
      if (attRes.status === 'fulfilled' && attRes.value?.data) {
        setAttendances(attRes.value.data);
      }
      if (adjRes.status === 'fulfilled' && adjRes.value?.data) {
        setAdjustments(adjRes.value.data);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر جلب بيانات الموارد البشرية' : 'Failed to load HR data'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHrData();
  }, [attendanceDateFilter]);

  useEffect(() => {
    if (employees.length > 0) {
      if (!selectedEmp) setSelectedEmp(employees[0].id);
      if (!defectEmpId) setDefectEmpId(employees[0].id);
      if (!attEmployeeId) setAttEmployeeId(employees[0].id);
      if (!adjEmployeeId) setAdjEmployeeId(employees[0].id);
    }
  }, [employees]);

  useEffect(() => {
    if (pieceRates.length > 0 && !selectedRate) {
      setSelectedRate(pieceRates[0].id);
    }
  }, [pieceRates]);

  // Handle Employee Store
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empCode || !empName) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.createEmployee({
        employee_code: empCode,
        name: empName,
        department: empDepartment,
        job_title: empJobTitle,
        pay_type: empPayType,
        base_salary: Number(empBaseSalary) || 0,
        hourly_rate: Number(empHourlyRate) || 0,
        daily_rate: Number(empDailyRate) || 0,
        shift_name: empShiftName,
        hire_date: empHireDate,
        phone: empPhone,
        national_id: empNationalId,
        is_active: empIsActive,
      });

      setIsEmployeeModalOpen(false);
      setSuccessMsg(isAr ? 'تم إضافة العامل / الموظف وتحديد هيكل الأجر بنجاح' : 'Employee added successfully');
      resetEmployeeForm();
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة الموظف' : 'Failed to add employee'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeForEdit) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.updateEmployee(selectedEmployeeForEdit.id, {
        name: empName,
        department: empDepartment,
        job_title: empJobTitle,
        pay_type: empPayType,
        base_salary: Number(empBaseSalary) || 0,
        hourly_rate: Number(empHourlyRate) || 0,
        daily_rate: Number(empDailyRate) || 0,
        shift_name: empShiftName,
        hire_date: empHireDate,
        phone: empPhone,
        national_id: empNationalId,
        is_active: empIsActive,
      });

      setIsEditEmployeeModalOpen(false);
      setSuccessMsg(isAr ? 'تم تحديث بيانات وهيكل أجر العامل بنجاح' : 'Employee updated successfully');
      setSelectedEmployeeForEdit(null);
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحديث بيانات العامل' : 'Failed to update employee'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditEmployee = (emp: Employee) => {
    setSelectedEmployeeForEdit(emp);
    setEmpCode(emp.employee_code);
    setEmpName(emp.name);
    setEmpDepartment(emp.department);
    setEmpJobTitle(emp.job_title);
    setEmpPayType(emp.pay_type);
    setEmpBaseSalary(emp.base_salary || 0);
    setEmpHourlyRate(emp.hourly_rate || 0);
    setEmpDailyRate(emp.daily_rate || 0);
    setEmpShiftName(emp.shift_name || 'morning');
    setEmpHireDate(emp.hire_date || new Date().toISOString().split('T')[0]);
    setEmpPhone(emp.phone || '');
    setEmpNationalId(emp.national_id || '');
    setEmpIsActive(emp.is_active);
    setIsEditEmployeeModalOpen(true);
  };

  const resetEmployeeForm = () => {
    setEmpCode('');
    setEmpName('');
    setEmpDepartment('sewing');
    setEmpJobTitle('');
    setEmpPayType('piece_rate');
    setEmpBaseSalary(0);
    setEmpHourlyRate(0);
    setEmpDailyRate(0);
    setEmpShiftName('morning');
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpPhone('');
    setEmpNationalId('');
    setEmpIsActive(true);
  };

  // Handle Attendance Store
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmployeeId || !attDate) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.recordAttendance({
        employee_id: attEmployeeId,
        attendance_date: attDate,
        check_in: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckIn,
        check_out: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckOut,
        status: attStatus,
        is_payable: attIsPayable,
      });

      setIsAttendanceModalOpen(false);
      setSuccessMsg(isAr ? 'تم تسجيل حركة الحضور بنجاح واحتساب الساعات والأوفرتايم' : 'Attendance recorded successfully');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الحضور' : 'Failed to record attendance'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCorrectAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttendanceForEdit || !attCorrectionReason) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.updateAttendance(selectedAttendanceForEdit.id, {
        check_in: attCheckIn,
        check_out: attCheckOut,
        status: attStatus,
        is_payable: attIsPayable,
        correction_reason: attCorrectionReason,
      });

      setIsCorrectAttendanceModalOpen(false);
      setSuccessMsg(isAr ? 'تم تعديل حركة الحضور وتوثيق سبب التصحيح في سجل التدقيق' : 'Attendance corrected successfully');
      setSelectedAttendanceForEdit(null);
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تعديل حركة الحضور' : 'Failed to correct attendance'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCorrectAttendance = (att: Attendance) => {
    setSelectedAttendanceForEdit(att);
    setAttCheckIn(att.check_in || '08:00');
    setAttCheckOut(att.check_out || '16:30');
    setAttStatus(att.status);
    setAttIsPayable(att.is_payable);
    setAttCorrectionReason(att.correction_reason || '');
    setIsCorrectAttendanceModalOpen(true);
  };

  // Handle Adjustments (Advances / Bonuses / Deductions)
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjEmployeeId || adjAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.createAdjustment({
        employee_id: adjEmployeeId,
        type: adjType,
        amount: adjAmount,
        effective_date: adjEffectiveDate,
        reason: adjReason,
      });

      setIsAdjustmentModalOpen(false);
      setSuccessMsg(isAr ? 'تم قيد طلب التسوية المالية / السلفة بنجاح وهو بانتظار الاعتماد' : 'Adjustment submitted successfully');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل قيد السلفة / التسوية' : 'Failed to create adjustment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveAdjustment = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await api.hr.approveAdjustment(id);
      setSuccessMsg(res.message || (isAr ? 'تم اعتماد التسوية المالية' : 'Adjustment approved'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل اعتماد التسوية' : 'Failed to approve adjustment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Piece Work Log
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logQty <= 0) return;

    const rateObj = pieceRates.find((r) => r.id === selectedRate);
    const unitRate = Number(rateObj?.rate_per_piece) || 3.50;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.createPieceWorkLog({
        employee_id: selectedEmp || employees[0]?.id,
        piece_rate_id: selectedRate || pieceRates[0]?.id,
        completed_quantity: logQty,
        unit_rate: unitRate,
        work_date: new Date().toISOString().split('T')[0],
      });

      setIsLogModalOpen(false);
      setLogQty(100);
      setSuccessMsg(isAr ? 'تم تسجيل إنتاجية العامل بنجاح' : 'Worker piece output recorded successfully');
      await loadHrData();
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

  // Handle Payroll Lifecycle
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

      setIsPayrollModalOpen(false);
      setSuccessMsg(
        res.message ||
          (isAr
            ? `تم احتساب مسير الرواتب ${payrollPeriod} بنجاح وفق محرك الأجور متعدد النظم`
            : 'Payroll generated successfully')
      );
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل توليد مسير الرواتب' : 'Failed to generate payroll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePayroll = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await api.hr.approvePayroll(id);
      setSuccessMsg(res.message || (isAr ? 'تم اعتماد مسير الرواتب بنجاح' : 'Payroll approved'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل اعتماد مسير الرواتب' : 'Failed to approve payroll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizePayroll = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من الإقفال النهائي للمسير؟ سيتم تجميده ضد أي تعديل مستقبلي لحماية النزاهة التاريخية.' : 'Are you sure you want to finalize this payroll? It will become immutable.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.hr.finalizePayroll(id);
      setSuccessMsg(res.message || (isAr ? 'تم إقفال مسير الرواتب نهائياً وتحصينه ضد أي تعديل بأثر رجعي' : 'Payroll finalized and locked'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إقفال مسير الرواتب' : 'Failed to finalize payroll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPaymentModal = (payroll: Payroll) => {
    setPaymentPayroll(payroll);
    const balance = payroll.remaining_balance !== undefined ? Number(payroll.remaining_balance) : Number(payroll.total_net) - (Number(payroll.total_paid) || 0);
    setPaymentAmount(balance > 0 ? balance : 0);
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentRefNumber('');
    setPaymentNotes('');
    setPaymentEmployeeId('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPayroll || paymentAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.markPayrollPaid(paymentPayroll.id, {
        amount: Number(paymentAmount),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: paymentRefNumber || undefined,
        notes: paymentNotes || undefined,
        employee_id: paymentEmployeeId || undefined,
      });

      setIsPaymentModalOpen(false);
      setSuccessMsg(res.message || (isAr ? 'تم تسجيل سند الصرف وتحديث الرصيد المتبقي بنجاح' : 'Payment recorded successfully'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الدفعة' : 'Failed to record payment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayrollDetails = async (payroll: Payroll) => {
    try {
      setIsLoading(true);
      const res = await api.hr.getPayroll(payroll.id);
      setSelectedPayrollForView(res.payroll || payroll);
      setIsPayrollDetailModalOpen(true);
    } catch (err) {
      setSelectedPayrollForView(payroll);
      setIsPayrollDetailModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Quality Defect Modals (Phase 09B)
  const handleCreateDefectAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectEmpId || !defectOrderId || !defectReason || defectProposedAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.createDefectAdjustment({
        employee_id: defectEmpId,
        production_order_id: defectOrderId,
        proposed_penalty_amount: defectProposedAmount,
        adjustment_reason: defectReason,
        investigation_notes: defectInvestigationNotes,
      });

      setIsDefectModalOpen(false);
      setSuccessMsg(res.message || (isAr ? 'تم رفع بلاغ عيب الجودة وهو بانتظار الاعتماد الصريح' : 'Defect adjustment submitted'));
      setDefectReason('');
      setDefectInvestigationNotes('');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل بلاغ عيب الجودة' : 'Failed to report defect'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveDefect = async (id: string) => {
    setIsSubmitting(true);
    try {
      const res = await api.hr.approveDefectAdjustment(id);
      setSuccessMsg(res.message || (isAr ? 'تم اعتماد خصم عيب الجودة' : 'Defect adjustment approved'));
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل اعتماد خصم عيب الجودة' : 'Failed to approve defect'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenActionModal = (
    type: 'reject_log' | 'reject_defect' | 'reverse_defect' | 'reject_adjustment' | 'reject_payroll',
    id: string,
    defect?: QualityDefectAdjustment
  ) => {
    setActionType(type);
    setActionId(id);
    setSelectedAdjustment(defect || null);
    setActionReason('');
    setIsActionModalOpen(true);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionId || !actionReason.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (actionType === 'reject_log') {
        await api.hr.rejectPieceWorkLog(actionId, actionReason);
        setSuccessMsg(isAr ? 'تم رفض سجل الإنتاجية' : 'Log rejected');
      } else if (actionType === 'reject_defect') {
        await api.hr.rejectDefectAdjustment(actionId, { rejection_reason: actionReason });
        setSuccessMsg(isAr ? 'تم رفض خصم عيب الجودة وحماية العامل' : 'Defect penalty rejected');
      } else if (actionType === 'reverse_defect') {
        await api.hr.reverseDefectAdjustment(actionId, { reversal_reason: actionReason });
        setSuccessMsg(isAr ? 'تم إلغاء الخصم تعويضياً وإعادة المستحق للعامل' : 'Deduction reversed');
      } else if (actionType === 'reject_adjustment') {
        await api.hr.rejectAdjustment(actionId, actionReason);
        setSuccessMsg(isAr ? 'تم رفض التسوية المالية' : 'Adjustment rejected');
      } else if (actionType === 'reject_payroll') {
        await api.hr.rejectPayroll(actionId, actionReason);
        setSuccessMsg(isAr ? 'تم رفض مسير الرواتب وإعادته كمسودة مع ذكر السبب' : 'Payroll rejected');
      }

      setIsActionModalOpen(false);
      setActionId(null);
      setActionReason('');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تنفيذ الإجراء' : 'Action failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment || !objectionNotes.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.recordWorkerObjection(selectedAdjustment.id, { objection_notes: objectionNotes });
      setIsObjectionModalOpen(false);
      setSelectedAdjustment(null);
      setObjectionNotes('');
      setSuccessMsg(isAr ? 'تم توثيق اعتراض العامل وتجميد الخصم مؤقتاً للتحقيق' : 'Objection recorded');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تسجيل الاعتراض' : 'Failed to record objection'));
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
      await api.hr.createPieceRate({
        stage_name: newStageName,
        operation_name: newOpName,
        rate_per_piece: newUnitRate,
      });

      setIsRateModalOpen(false);
      setNewOpName('');
      setNewUnitRate(3.5);
      setSuccessMsg(isAr ? 'تم إضافة تسعيرة العملية الفنية بنجاح' : 'Standard piece rate created successfully');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة التسعيرة' : 'Failed to create piece rate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics
  const pendingDefectCount = defectAdjustments.filter((d) => d.status === 'pending_approval').length;
  const pendingAdjustmentsCount = adjustments.filter((a) => a.status === 'pending').length;
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter((e) => e.is_active).length;
  const presentCount = attendances.filter((a) => a.status === 'present').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAr ? 'إدارة القوى العاملة والحضور ومسيرات الرواتب (Phase C)' : 'Workforce, Attendance & Payroll (Phase C)'}
        subtitle={
          isAr
            ? 'سجل العمال الموحد، ساعات الحضور والورديات، أجور القطعة، السلف والخصومات، ومحرك الرواتب المعتمد'
            : 'Unified worker registry, time & attendance, piece rates, advances, defect adjustments, and certified payroll engine'
        }
        badge={<Badge variant="brand">{isAr ? 'إصدار مؤسسي متكامل' : 'Enterprise Phase C'}</Badge>}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadHrData}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 me-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isAr ? 'تحديث' : 'Refresh'}
            </Button>

            {activeSubTab === 'employees' && (
              <Button
                size="sm"
                onClick={() => {
                  resetEmployeeForm();
                  setIsEmployeeModalOpen(true);
                }}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'إضافة عامل / موظف جديد' : 'New Employee'}
              </Button>
            )}

            {activeSubTab === 'attendance' && (
              <Button
                size="sm"
                onClick={() => setIsAttendanceModalOpen(true)}
                className="text-xs"
              >
                <Clock className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'تسجيل حركة حضور' : 'Record Attendance'}
              </Button>
            )}

            {activeSubTab === 'worklogs' && (
              <Button
                size="sm"
                onClick={() => setIsLogModalOpen(true)}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'تسجيل إنتاجية قطعة' : 'Log Piece Work'}
              </Button>
            )}

            {activeSubTab === 'adjustments' && (
              <Button
                size="sm"
                onClick={() => setIsAdjustmentModalOpen(true)}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'طلب سلفة / مكافأة / خصم' : 'New Adjustment'}
              </Button>
            )}

            {activeSubTab === 'defects' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsDefectModalOpen(true)}
                className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
              >
                <ShieldAlert className="w-3.5 h-3.5 me-1.5 text-amber-500" />
                {isAr ? 'بلاغ عيب جودة وخصم مقترح' : 'Report Defect Deduction'}
              </Button>
            )}

            {activeSubTab === 'piecerates' && (
              <Button
                size="sm"
                onClick={() => setIsRateModalOpen(true)}
                className="text-xs"
              >
                <Plus className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'إضافة تسعيرة عملية' : 'New Piece Rate'}
              </Button>
            )}

            {activeSubTab === 'payrolls' && (
              <Button
                size="sm"
                onClick={() => setIsPayrollModalOpen(true)}
                className="text-xs"
              >
                <Calculator className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'توليد مسير رواتب جديد' : 'Generate Payroll'}
              </Button>
            )}
          </div>
        }
      />

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-800 dark:text-rose-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'إجمالي العمال والموظفين' : 'Total Employees'}
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalEmployeesCount}</p>
              <span className="text-xs text-emerald-600 font-medium">
                {activeEmployeesCount} {isAr ? 'على رأس العمل' : 'Active'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'حضور اليوم' : "Today's Attendance"}
              </p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {presentCount}
              </p>
              <span className="text-xs text-slate-400 font-medium">
                {attendances.length} {isAr ? 'حركات مسجلة' : 'records recorded'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'السلف والتسويات المعلقة' : 'Pending Adjustments'}
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pendingAdjustmentsCount}
              </p>
              <span className="text-xs text-slate-400 font-medium">
                {isAr ? 'بانتظار موافقة الإدارة' : 'Pending manager approval'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {isAr ? 'بلاغات عيوب الجودة المعلقة' : 'Pending Defect Deductions'}
              </p>
              <p className={`text-2xl font-bold mt-1 ${pendingDefectCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                {pendingDefectCount}
              </p>
              <span className="text-xs text-rose-500 dark:text-rose-400 font-medium">
                {isAr ? 'تتطلب اعتماداً صريحاً' : 'Requires explicit approval'}
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
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'employees'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'سجل العمال والموظفين' : 'Employees'}
          </button>

          <button
            onClick={() => setActiveSubTab('attendance')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'attendance'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'الحضور وساعات العمل' : 'Attendance & Time'}
          </button>

          <button
            onClick={() => setActiveSubTab('worklogs')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'worklogs'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'إنتاجية أجور القطعة' : 'Piece-Work Logs'}
          </button>

          <button
            onClick={() => setActiveSubTab('adjustments')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
              activeSubTab === 'adjustments'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'السلف والمكافآت والخصومات' : 'Advances & Adjustments'}
            {pendingAdjustmentsCount > 0 && (
              <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingAdjustmentsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('defects')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
              activeSubTab === 'defects'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'تسويات عيوب الجودة' : 'Defect Deductions'}
            {pendingDefectCount > 0 && (
              <span className="ms-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                {pendingDefectCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('piecerates')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'piecerates'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'لائحة أسعار العمليات' : 'Piece Rates'}
          </button>

          <button
            onClick={() => setActiveSubTab('payrolls')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeSubTab === 'payrolls'
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {isAr ? 'مسيرات الرواتب والمستحقات' : 'Payrolls'}
          </button>
        </div>
      </div>

      {/* 1. EMPLOYEES VIEW */}
      {activeSubTab === 'employees' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالاسم، الكود، الوظيفة...' : 'Search worker...'}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="ps-9 pe-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-48 sm:w-64"
                />
              </div>

              <select
                value={employeeDeptFilter}
                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="all">{isAr ? 'كل الأقسام' : 'All Departments'}</option>
                <option value="cutting">{isAr ? 'صالة القص' : 'Cutting'}</option>
                <option value="sewing">{isAr ? 'خطوط الحياكة' : 'Sewing'}</option>
                <option value="finishing">{isAr ? 'التشطيب والكي' : 'Finishing'}</option>
                <option value="quality">{isAr ? 'مراقبة الجودة' : 'Quality'}</option>
                <option value="maintenance">{isAr ? 'الصيانة والورش' : 'Maintenance'}</option>
                <option value="packaging">{isAr ? 'التعبئة والمستودع' : 'Packaging'}</option>
              </select>

              <select
                value={employeePayTypeFilter}
                onChange={(e) => setEmployeePayTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="all">{isAr ? 'كل نظم التعويض' : 'All Pay Types'}</option>
                <option value="piece_rate">{isAr ? 'أجر بالقطعة' : 'Piece Rate'}</option>
                <option value="hourly">{isAr ? 'أجر بالساعة' : 'Hourly'}</option>
                <option value="daily">{isAr ? 'أجر يومي' : 'Daily'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Salary'}</option>
                <option value="hybrid">{isAr ? 'هجين (أساسي + إنتاجية)' : 'Hybrid'}</option>
              </select>

              <Button size="sm" variant="outline" onClick={loadHrData} className="text-xs py-1">
                <Filter className="w-3 h-3 me-1" />
                {isAr ? 'تطبيق الفلتر' : 'Filter'}
              </Button>
            </div>

            <span className="text-xs text-slate-500 font-medium">
              {employees.length} {isAr ? 'عامل مسجل' : 'employees found'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود العامل' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'الاسم والمهنة' : 'Name & Job'}</th>
                  <th className="p-3 text-start">{isAr ? 'القسم والوردية' : 'Department & Shift'}</th>
                  <th className="p-3 text-start">{isAr ? 'نظام التعويض والأجر' : 'Compensation Model'}</th>
                  <th className="p-3 text-start">{isAr ? 'تاريخ التعيين' : 'Hire Date'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا يوجد عمال مسجلين يطابقون معايير البحث' : 'No employees found matching criteria'}
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-primary">{emp.employee_code}</td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.job_title}</p>
                      </td>
                      <td className="p-3">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {emp.department}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {isAr ? 'وردية:' : 'Shift:'} {emp.shift_name || (isAr ? 'صباحية' : 'Morning')}
                        </p>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            emp.pay_type === 'piece_rate'
                              ? 'brand'
                              : emp.pay_type === 'hourly'
                              ? 'info'
                              : emp.pay_type === 'daily'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {emp.pay_type === 'piece_rate'
                            ? (isAr ? 'أجر بالقطعة' : 'Piece Rate')
                            : emp.pay_type === 'hourly'
                            ? (isAr ? `ساعي: ${emp.hourly_rate || 0} ج.م/س` : `Hourly: ${emp.hourly_rate || 0}`)
                            : emp.pay_type === 'daily'
                            ? (isAr ? `يومي: ${emp.daily_rate || 0} ج.م/يوم` : `Daily: ${emp.daily_rate || 0}`)
                            : emp.pay_type === 'fixed_salary'
                            ? (isAr ? `راتب: ${Number(emp.base_salary).toLocaleString()} ج.م` : `Fixed: ${emp.base_salary}`)
                            : (isAr ? 'هجين' : 'Hybrid')}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {emp.hire_date || '-'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                          {emp.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditEmployee(emp)}
                          className="text-xs py-1"
                        >
                          <Edit2 className="w-3.5 h-3.5 me-1 text-blue-500" />
                          {isAr ? 'تعديل والأجر' : 'Edit & Rates'}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* 2. ATTENDANCE & WORKING TIME VIEW */}
      {activeSubTab === 'attendance' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400" />
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isAr ? 'تاريخ الحضور المعروض:' : 'Attendance Date:'}
              </label>
              <input
                type="date"
                value={attendanceDateFilter}
                onChange={(e) => setAttendanceDateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <Button size="sm" onClick={() => setIsAttendanceModalOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'تسجيل حضور عامل' : 'Record Attendance'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود العامل' : 'Code'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العامل' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'وقت الدخول' : 'Check In'}</th>
                  <th className="p-3 text-start">{isAr ? 'وقت الخروج' : 'Check Out'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي الساعات' : 'Total Hours'}</th>
                  <th className="p-3 text-start">{isAr ? 'الأوفرتايم' : 'Overtime'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'مستحق للأجر' : 'Payable'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات والتصحيح' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد حركات حضور مسجلة لهذا التاريخ' : 'No attendance recorded for this date'}
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => {
                    const emp = employees.find((e) => e.id === att.employee_id) || att.employee;
                    return (
                      <tr key={att.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">{emp?.employee_code || '-'}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {emp?.name || att.employee_id}
                        </td>
                        <td className="p-3 font-mono text-xs">{att.check_in || '-'}</td>
                        <td className="p-3 font-mono text-xs">{att.check_out || '-'}</td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {Number(att.total_hours).toFixed(1)} {isAr ? 'ساعة' : 'hrs'}
                        </td>
                        <td className="p-3 font-semibold text-amber-600 dark:text-amber-400">
                          {Number(att.overtime_hours) > 0 ? `+${Number(att.overtime_hours).toFixed(1)} ${isAr ? 'س' : 'h'}` : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              att.status === 'present'
                                ? 'success'
                                : att.status === 'late'
                                ? 'warning'
                                : att.status === 'leave'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {att.status === 'present'
                              ? (isAr ? 'حاضر' : 'Present')
                              : att.status === 'late'
                              ? (isAr ? 'متأخر' : 'Late')
                              : att.status === 'leave'
                              ? (isAr ? 'إجازة' : 'Leave')
                              : (isAr ? 'غائب' : 'Absent')}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              att.is_payable
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            {att.is_payable ? (isAr ? 'مدفوع' : 'Payable') : (isAr ? 'غير مدفوع' : 'Unpaid')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openCorrectAttendance(att)}
                            className="text-xs py-1"
                          >
                            <Edit2 className="w-3.5 h-3.5 me-1 text-slate-500" />
                            {isAr ? 'تصحيح معتمد' : 'Correct'}
                          </Button>
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

      {/* 3. WORK LOGS VIEW */}
      {activeSubTab === 'worklogs' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'سجلات إنتاجية أجور القطعة اليومية للعمال' : 'Daily Piece-Rate Production Logbook'}
            </h3>
            <Button size="sm" onClick={() => setIsLogModalOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'تسجيل إنتاجية جديد' : 'New Output Log'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العامل' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'الكمية المنجزة' : 'Quantity'}</th>
                  <th className="p-3 text-start">{isAr ? 'فئة أجر القطعة' : 'Unit Rate'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي المستحق' : 'Total Amount'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {workLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سجلات إنتاجية مسجلة بعد' : 'No piece-work records logged'}
                    </td>
                  </tr>
                ) : (
                  workLogs.map((log) => {
                    const emp = employees.find((e) => e.id === log.employee_id) || log.employee;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{log.work_date}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {emp?.name || log.employee_id}
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {log.completed_quantity} {isAr ? 'قطعة' : 'pcs'}
                        </td>
                        <td className="p-3 font-mono">{Number(log.unit_rate).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(log.total_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              log.status === 'approved'
                                ? 'success'
                                : log.status === 'rejected'
                                ? 'neutral'
                                : log.status === 'paid'
                                ? 'brand'
                                : 'warning'
                            }
                          >
                            {log.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {log.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveLog(log.id)}
                                  className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'اعتماد' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenActionModal('reject_log', log.id)}
                                  className="text-xs py-1 text-rose-600 hover:text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                              </>
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

      {/* 4. ADJUSTMENTS VIEW (Advances / Bonuses / Deductions) */}
      {activeSubTab === 'adjustments' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'سجل السلف والمكافآت والبدلات والخصومات المالية' : 'Financial Adjustments, Advances & Bonuses'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr ? 'تُخصم السلف وتُضاف البدلات في مسير الرواتب تلقائياً بعد الاعتماد الصريح' : 'Approved advances and allowances flow directly into payroll engine'}
              </p>
            </div>
            <Button size="sm" onClick={() => setIsAdjustmentModalOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'طلب سلفة / تسوية جديدة' : 'New Adjustment'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'اسم العامل' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'نوع الحركة' : 'Type'}</th>
                  <th className="p-3 text-start">{isAr ? 'المبلغ (ج.م)' : 'Amount'}</th>
                  <th className="p-3 text-start">{isAr ? 'البيان والسبب' : 'Reason'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد سلف أو تسويات مالية مسجلة' : 'No financial adjustments found'}
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => {
                    const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-xs text-slate-500">{adj.effective_date}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {emp?.name || adj.employee_id}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              adj.type === 'advance'
                                ? 'warning'
                                : adj.type === 'bonus'
                                ? 'success'
                                : adj.type === 'allowance'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {adj.type === 'advance'
                              ? (isAr ? 'سلفة نقدية' : 'Advance')
                              : adj.type === 'bonus'
                              ? (isAr ? 'مكافأة' : 'Bonus')
                              : adj.type === 'allowance'
                              ? (isAr ? 'بدل انتقال/وجبة' : 'Allowance')
                              : (isAr ? 'خصم إداري' : 'Deduction')}
                          </Badge>
                        </td>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          {Number(adj.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {adj.reason}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              adj.status === 'approved'
                                ? 'success'
                                : adj.status === 'applied'
                                ? 'brand'
                                : adj.status === 'rejected'
                                ? 'neutral'
                                : 'warning'
                            }
                          >
                            {adj.status === 'pending'
                              ? (isAr ? 'معلق' : 'Pending')
                              : adj.status === 'approved'
                              ? (isAr ? 'معتمد' : 'Approved')
                              : adj.status === 'applied'
                              ? (isAr ? 'تم الخصم بالمسير' : 'Settled')
                              : (isAr ? 'مرفوض' : 'Rejected')}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {adj.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveAdjustment(adj.id)}
                                  className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'اعتماد' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenActionModal('reject_adjustment', adj.id)}
                                  className="text-xs py-1 text-rose-600 hover:text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                              </>
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

      {/* 5. QUALITY DEFECT DEDUCTIONS VIEW (Phase 09B) */}
      {activeSubTab === 'defects' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'تسويات عيوب الجودة والخصومات المعتمدة' : 'Quality Defect Penalties & Settlement'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'حماية العمال: لا ينفذ الخصم في المسير إلا بعد موافقة صريحة من إدارة الإنتاج، مع إمكانية الاعتراض والإلغاء التعويضي'
                  : 'Zero automatic deduction policy. Explicit approval, objections & reversals supported.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDefectModalOpen(true)}
              className="text-xs border-amber-500/50 text-amber-700 dark:text-amber-300"
            >
              <ShieldAlert className="w-3.5 h-3.5 me-1.5 text-amber-500" />
              {isAr ? 'بلاغ عيب جودة جديد' : 'Report Defect'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                  <th className="p-3 text-start">{isAr ? 'العامل المتسبب' : 'Worker'}</th>
                  <th className="p-3 text-start">{isAr ? 'أمر التشغيل' : 'Order'}</th>
                  <th className="p-3 text-start">{isAr ? 'الخصم المقترح' : 'Penalty'}</th>
                  <th className="p-3 text-start">{isAr ? 'السبب والتحقيق' : 'Reason'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات والاعتراض' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {defectAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      {isAr ? 'لا توجد بلاغات عيوب جودة مسجلة' : 'No defect adjustments found'}
                    </td>
                  </tr>
                ) : (
                  defectAdjustments.map((adj) => {
                    const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono text-xs text-slate-500">
                          {adj.created_at ? adj.created_at.split('T')[0] : '-'}
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-900 dark:text-white">{emp?.name || adj.employee_id}</p>
                          <span className="text-xs text-slate-400 font-mono">{emp?.employee_code}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{adj.production_order_id}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          {Number(adj.proposed_penalty_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{adj.adjustment_reason}</p>
                          {adj.worker_objection_notes && (
                            <p className="text-[11px] text-amber-600 mt-0.5 truncate">
                              {isAr ? 'اعتراض العامل:' : 'Objection:'} {adj.worker_objection_notes}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              adj.status === 'approved'
                                ? 'warning'
                                : adj.status === 'settled'
                                ? 'brand'
                                : adj.status === 'objected'
                                ? 'danger'
                                : adj.status === 'reversed'
                                ? 'info'
                                : 'neutral'
                            }
                          >
                            {adj.status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {adj.status === 'pending_approval' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApproveDefect(adj.id)}
                                  className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'اعتماد الخصم' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenActionModal('reject_defect', adj.id, adj)}
                                  className="text-xs py-1 text-rose-600 hover:text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAdjustment(adj);
                                    setObjectionNotes('');
                                    setIsObjectionModalOpen(true);
                                  }}
                                  className="text-xs py-1 text-amber-600 hover:text-amber-700"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'اعتراض' : 'Object'}
                                </Button>
                              </>
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

      {/* 6. PIECE RATES CATALOGUE VIEW */}
      {activeSubTab === 'piecerates' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <h3 className="font-bold text-slate-900 dark:text-white">
              {isAr ? 'لائحة أسعار العمليات الفنية للأجر بالقطعة' : 'Standard Piece-Rate Catalogue'}
            </h3>
            <Button size="sm" onClick={() => setIsRateModalOpen(true)} className="text-xs">
              <Plus className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'إضافة تسعيرة جديدة' : 'New Piece Rate'}
            </Button>
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
                        {Number(rate.rate_per_piece).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
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

      {/* 7. PAYROLLS VIEW (Complete Lifecycle & Immutability) */}
      {activeSubTab === 'payrolls' && (
        <Card className="bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                {isAr ? 'مسيرات الرواتب الدفترية ومستحقات العمال' : 'Certified Payroll Runs & Factory Settlements'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'دورة الاعتماد: مسودة -> اعتماد -> إقفال نهائي محصن -> صرف دفعات جزئية أو كاملة'
                  : 'Lifecycle: Draft -> Approved -> Finalized (Immutable) -> Partial / Full Payments'}
              </p>
            </div>
            <Button size="sm" onClick={() => setIsPayrollModalOpen(true)} className="text-xs">
              <Calculator className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'توليد مسير جديد' : 'Generate Payroll'}
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 text-start">{isAr ? 'كود الفترة' : 'Period'}</th>
                  <th className="p-3 text-start">{isAr ? 'النطاق الزمني' : 'Dates'}</th>
                  <th className="p-3 text-start">{isAr ? 'إجمالي المستحق' : 'Gross'}</th>
                  <th className="p-3 text-start">{isAr ? 'الاستقطاعات' : 'Deductions'}</th>
                  <th className="p-3 text-start">{isAr ? 'الصافي' : 'Net'}</th>
                  <th className="p-3 text-start">{isAr ? 'المدفوع / المتبقي' : 'Paid / Balance'}</th>
                  <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="p-3 text-center">{isAr ? 'الإجراءات ودورة الاعتماد' : 'Actions'}</th>
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
                  payrolls.map((p) => {
                    const balance = p.remaining_balance !== undefined ? Number(p.remaining_balance) : Number(p.total_net) - (Number(p.total_paid) || 0);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-mono font-bold text-primary">{p.payroll_period}</td>
                        <td className="p-3 text-xs text-slate-500 font-mono">
                          {p.period_start} <span className="text-slate-400">→</span> {p.period_end}
                        </td>
                        <td className="p-3 font-semibold">{Number(p.total_gross).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                        <td className="p-3 text-amber-600 dark:text-amber-400 font-semibold">
                          {Number(p.total_deductions).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(p.total_net).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </td>
                        <td className="p-3">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {Number(p.total_paid || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </p>
                          <span
                            className={`text-xs font-mono ${
                              balance <= 0 ? 'text-emerald-500' : 'text-rose-500 font-bold'
                            }`}
                          >
                            {isAr ? 'متبقي:' : 'Rem:'} {balance.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <Badge
                            variant={
                              p.status === 'paid'
                                ? 'brand'
                                : p.status === 'partially_paid'
                                ? 'warning'
                                : p.status === 'finalized'
                                ? 'success'
                                : p.status === 'approved'
                                ? 'info'
                                : p.status === 'rejected'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {p.status === 'paid'
                              ? (isAr ? 'مدفوع بالكامل' : 'Paid in Full')
                              : p.status === 'partially_paid'
                              ? (isAr ? 'مدفوع جزئياً' : 'Partially Paid')
                              : p.status === 'finalized'
                              ? (isAr ? 'مقفل ونهائي' : 'Finalized & Locked')
                              : p.status === 'approved'
                              ? (isAr ? 'معتمد' : 'Approved')
                              : p.status === 'rejected'
                              ? (isAr ? 'مرفوض' : 'Rejected')
                              : (isAr ? 'مسودة' : 'Draft')}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Breakdown & Items */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openPayrollDetails(p)}
                              className="text-xs py-1"
                              title={isAr ? 'عرض تفاصيل الأجور لكل عامل' : 'View Worker Breakdown'}
                            >
                              <Eye className="w-3.5 h-3.5 me-1 text-blue-500" />
                              {isAr ? 'التفاصيل' : 'Breakdown'}
                            </Button>

                            {/* Lifecycle: Approve or Reject (if draft) */}
                            {p.status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleApprovePayroll(p.id)}
                                  className="text-xs py-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'اعتماد' : 'Approve'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenActionModal('reject_payroll', p.id)}
                                  className="text-xs py-1 text-rose-600 hover:text-rose-700"
                                >
                                  <X className="w-3.5 h-3.5 me-1" />
                                  {isAr ? 'رفض' : 'Reject'}
                                </Button>
                              </>
                            )}

                            {/* Lifecycle: Finalize (if approved) */}
                            {p.status === 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFinalizePayroll(p.id)}
                                className="text-xs py-1 text-purple-600 hover:text-purple-700"
                                title={isAr ? 'إقفال نهائي وتحصين تاريخي ضد أي تعديل' : 'Finalize & Lock'}
                              >
                                <Lock className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'إقفال نهائي' : 'Finalize'}
                              </Button>
                            )}

                            {/* Lifecycle: Record Payment (if approved, finalized, or partially_paid) */}
                            {(p.status === 'approved' || p.status === 'finalized' || p.status === 'partially_paid') && balance > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPaymentModal(p)}
                                className="text-xs py-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                              >
                                <CreditCard className="w-3.5 h-3.5 me-1" />
                                {isAr ? 'صرف دفعة' : 'Record Pay'}
                              </Button>
                            )}

                            {/* Print Voucher */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPayrollForView(p);
                                setIsPrintSlipModalOpen(true);
                              }}
                              className="text-xs py-1"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
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

      {/* ========================================================================= */}
      {/* MODALS SECTION */}
      {/* ========================================================================= */}

      {/* 1. Add Employee Modal */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title={isAr ? 'إضافة عامل / موظف جديد وتحديد هيكل الأجر' : 'Add Employee & Compensation Model'}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'كود الموظف الفريد *' : 'Employee Code *'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EMP-101"
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم العامل الكامل *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: أحمد محمود إبراهيم' : 'e.g. Ahmed Mahmoud'}
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'القسم *' : 'Department *'}
              </label>
              <select
                value={empDepartment}
                onChange={(e) => setEmpDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="cutting">{isAr ? 'صالة القص' : 'Cutting'}</option>
                <option value="sewing">{isAr ? 'خطوط الحياكة' : 'Sewing'}</option>
                <option value="finishing">{isAr ? 'التشطيب والكي' : 'Finishing'}</option>
                <option value="quality">{isAr ? 'مراقبة الجودة' : 'Quality'}</option>
                <option value="packaging">{isAr ? 'التعبئة والتغليف' : 'Packaging'}</option>
                <option value="maintenance">{isAr ? 'الصيانة' : 'Maintenance'}</option>
                <option value="management">{isAr ? 'الإدارة' : 'Management'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المسمى الوظيفي / الحرفة *' : 'Job Title / Craft *'}
              </label>
              <input
                type="text"
                required
                placeholder={isAr ? 'مثال: فني أوفرلوك، مساعد قصار' : 'e.g. Overlock Operator'}
                value={empJobTitle}
                onChange={(e) => setEmpJobTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              {isAr ? 'هيكل التعويض وطريقة احتساب الأجر' : 'Compensation & Wage Structure'}
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة احتساب الأجر *' : 'Pay Type *'}
              </label>
              <select
                value={empPayType}
                onChange={(e) => setEmpPayType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              >
                <option value="piece_rate">{isAr ? 'أجر بالقطعة (حسب إنتاجية العمليات والحزم)' : 'Piece Rate (By Output)'}</option>
                <option value="hourly">{isAr ? 'أجر بالساعة (حسب ساعات الحضور وساعات الأوفرتايم)' : 'Hourly (By Attendance Hours & Overtime)'}</option>
                <option value="daily">{isAr ? 'أجر يومي (حسب أيام الحضور المسجلة)' : 'Daily Wage (By Attended Days)'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Monthly Salary'}</option>
                <option value="hybrid">{isAr ? 'هجين (راتب أساسي ثابت + إنتاجية قطعة)' : 'Hybrid (Base + Piece Rate)'}</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'الراتب الأساسي (ج.م)' : 'Base Salary'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={empBaseSalary}
                  onChange={(e) => setEmpBaseSalary(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'سعر الساعة (ج.م/س)' : 'Hourly Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={empHourlyRate}
                  onChange={(e) => setEmpHourlyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر اليوم (ج.م/يوم)' : 'Daily Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={empDailyRate}
                  onChange={(e) => setEmpDailyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الوردية الافتراضية' : 'Shift'}
              </label>
              <select
                value={empShiftName}
                onChange={(e) => setEmpShiftName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="morning">{isAr ? 'صباحية (08:00 - 16:30)' : 'Morning'}</option>
                <option value="evening">{isAr ? 'مسائية (16:30 - 00:30)' : 'Evening'}</option>
                <option value="night">{isAr ? 'ليلية (00:30 - 08:30)' : 'Night'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ بداية العمل' : 'Hire Date'}
              </label>
              <input
                type="date"
                value={empHireDate}
                onChange={(e) => setEmpHireDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEmployeeModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ العامل' : 'Save Employee'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Edit Employee & Rates Modal */}
      <Modal
        isOpen={isEditEmployeeModalOpen}
        onClose={() => setIsEditEmployeeModalOpen(false)}
        title={isAr ? `تعديل بيانات العامل وهيكل الأجر: ${empCode}` : `Edit Worker & Rates: ${empCode}`}
      >
        <form onSubmit={handleUpdateEmployee} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العامل الكامل *' : 'Full Name *'}
            </label>
            <input
              type="text"
              required
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'القسم *' : 'Department *'}
              </label>
              <select
                value={empDepartment}
                onChange={(e) => setEmpDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="cutting">{isAr ? 'صالة القص' : 'Cutting'}</option>
                <option value="sewing">{isAr ? 'خطوط الحياكة' : 'Sewing'}</option>
                <option value="finishing">{isAr ? 'التشطيب والكي' : 'Finishing'}</option>
                <option value="quality">{isAr ? 'مراقبة الجودة' : 'Quality'}</option>
                <option value="packaging">{isAr ? 'التعبئة والتغليف' : 'Packaging'}</option>
                <option value="maintenance">{isAr ? 'الصيانة' : 'Maintenance'}</option>
                <option value="management">{isAr ? 'الإدارة' : 'Management'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المسمى الوظيفي' : 'Job Title'}
              </label>
              <input
                type="text"
                value={empJobTitle}
                onChange={(e) => setEmpJobTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              {isAr ? 'تعديل فئات التعويض' : 'Update Compensation Rates'}
            </h4>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة احتساب الأجر *' : 'Pay Type *'}
              </label>
              <select
                value={empPayType}
                onChange={(e) => setEmpPayType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-semibold"
              >
                <option value="piece_rate">{isAr ? 'أجر بالقطعة' : 'Piece Rate'}</option>
                <option value="hourly">{isAr ? 'أجر بالساعة' : 'Hourly'}</option>
                <option value="daily">{isAr ? 'أجر يومي' : 'Daily'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Monthly Salary'}</option>
                <option value="hybrid">{isAr ? 'هجين (أساسي + إنتاجية)' : 'Hybrid'}</option>
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'الراتب الأساسي' : 'Base Salary'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={empBaseSalary}
                  onChange={(e) => setEmpBaseSalary(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'سعر الساعة' : 'Hourly Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={empHourlyRate}
                  onChange={(e) => setEmpHourlyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر اليوم' : 'Daily Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={empDailyRate}
                  onChange={(e) => setEmpDailyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="empIsActive"
              checked={empIsActive}
              onChange={(e) => setEmpIsActive(e.target.checked)}
              className="rounded border-slate-300 text-primary"
            />
            <label htmlFor="empIsActive" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isAr ? 'العامل نشط وعلى رأس العمل (يستبعد من المسيرات القادمة إذا تم تعطيله مع حفظ تاريخه)' : 'Employee is Active'}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsEditEmployeeModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التحديث...' : 'Updating...'}
                </>
              ) : (
                isAr ? 'حفظ التعديلات' : 'Update Worker'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Record Attendance Modal */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title={isAr ? 'تسجيل حركة حضور وانصراف وساعات عمل' : 'Record Worker Attendance'}
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اختر العامل *' : 'Select Worker *'}
            </label>
            <select
              value={attEmployeeId}
              onChange={(e) => setAttEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} - {e.name} ({e.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'التاريخ *' : 'Date *'}
              </label>
              <input
                type="date"
                required
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حالة الحضور *' : 'Status *'}
              </label>
              <select
                value={attStatus}
                onChange={(e) => setAttStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="present">{isAr ? 'حاضر (يوم عمل كامل)' : 'Present'}</option>
                <option value="late">{isAr ? 'تأخير في الحضور' : 'Late'}</option>
                <option value="half_day">{isAr ? 'نصف يوم عمل' : 'Half Day'}</option>
                <option value="leave">{isAr ? 'إجازة معتمدة' : 'Approved Leave'}</option>
                <option value="absent">{isAr ? 'غياب بدون إذن' : 'Absent'}</option>
              </select>
            </div>
          </div>

          {attStatus !== 'absent' && attStatus !== 'leave' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'وقت الدخول' : 'Check In Time'}
                </label>
                <input
                  type="time"
                  value={attCheckIn}
                  onChange={(e) => setAttCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'وقت الخروج' : 'Check Out Time'}
                </label>
                <input
                  type="time"
                  value={attCheckOut}
                  onChange={(e) => setAttCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="attIsPayable"
              checked={attIsPayable}
              onChange={(e) => setAttIsPayable(e.target.checked)}
              className="rounded border-slate-300 text-primary"
            />
            <label htmlFor="attIsPayable" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isAr ? 'يوم مستحق للأجر (يحتسب ضمن مسير الراتب والأجر اليومي)' : 'Payable Day / Hours'}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAttendanceModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التسجيل...' : 'Recording...'}
                </>
              ) : (
                isAr ? 'تسجيل الحضور' : 'Record Attendance'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Correct Attendance Modal */}
      <Modal
        isOpen={isCorrectAttendanceModalOpen}
        onClose={() => setIsCorrectAttendanceModalOpen(false)}
        title={isAr ? 'تصحيح حركة حضور مسجلة (تدقيق ومسؤولية)' : 'Correct Attendance Record'}
      >
        <form onSubmit={handleCorrectAttendance} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            {isAr
              ? 'تتطلب معايير التدقيق المالي توثيق سبب التصحيح، ويسجل في السجل الدائم اسم المشرف وتاريخ التصحيح.'
              : 'Audit integrity: Correction reason is mandatory and permanently logged.'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وقت الدخول المعدل' : 'Corrected Check In'}
              </label>
              <input
                type="time"
                value={attCheckIn}
                onChange={(e) => setAttCheckIn(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'وقت الخروج المعدل' : 'Corrected Check Out'}
              </label>
              <input
                type="time"
                value={attCheckOut}
                onChange={(e) => setAttCheckOut(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب التصحيح الدفترى (إلزامي للتدقيق) *' : 'Correction Reason (Mandatory) *'}
            </label>
            <textarea
              required
              rows={2}
              placeholder={isAr ? 'مثال: نسيان تسجيل الخروج بسبب عطل بصمة، إذن عمل خارجي...' : 'Reason for correction...'}
              value={attCorrectionReason}
              onChange={(e) => setAttCorrectionReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsCorrectAttendanceModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ التصحيح' : 'Save Correction'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 5. Request Adjustment / Advance Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={isAr ? 'قيد سلفة مالية أو مكافأة أو خصم إداري' : 'New Advance or Financial Adjustment'}
      >
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العامل المستفيد / المعني *' : 'Worker *'}
            </label>
            <select
              value={adjEmployeeId}
              onChange={(e) => setAdjEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} - {e.name} ({e.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'نوع التسوية *' : 'Adjustment Type *'}
              </label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="advance">{isAr ? 'سلفة نقدية على الراتب' : 'Salary Advance'}</option>
                <option value="bonus">{isAr ? 'مكافأة تشجيعية / حافز' : 'Incentive Bonus'}</option>
                <option value="allowance">{isAr ? 'بدل انتقال / وجبة / إضافي' : 'Allowance'}</option>
                <option value="deduction">{isAr ? 'خصم إداري معتمد' : 'Administrative Deduction'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المبلغ (جنيه مصري) *' : 'Amount (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                step="5"
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تاريخ السريان *' : 'Effective Date *'}
            </label>
            <input
              type="date"
              required
              value={adjEffectiveDate}
              onChange={(e) => setAdjEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البيان والسبب التوضيحي *' : 'Reason & Explanation *'}
            </label>
            <textarea
              required
              rows={2}
              placeholder={isAr ? 'مثال: سلفة لمصاريف علاجية، مكافأة إنجاز تشغيلة مستعجلة...' : 'Reason...'}
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsAdjustmentModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري القيد...' : 'Submitting...'}
                </>
              ) : (
                isAr ? 'قيد التسوية' : 'Submit Adjustment'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 6. Record Payroll Payment (Partial or Full) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={isAr ? `صرف دفعة لمسير الرواتب: ${paymentPayroll?.payroll_period}` : `Record Payroll Payment: ${paymentPayroll?.payroll_period}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex justify-between items-center text-emerald-900 dark:text-emerald-100">
            <div>
              <p className="font-semibold">{isAr ? 'صافي المسير الكلي:' : 'Total Net Payroll:'}</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {Number(paymentPayroll?.total_net || 0).toLocaleString()} ج.م
              </p>
            </div>
            <div className="text-end">
              <p className="font-semibold">{isAr ? 'الرصيد المتبقي للصرف:' : 'Outstanding Balance:'}</p>
              <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                {(paymentPayroll?.remaining_balance !== undefined
                  ? Number(paymentPayroll.remaining_balance)
                  : Number(paymentPayroll?.total_net || 0) - (Number(paymentPayroll?.total_paid) || 0)
                ).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'صرف لعامل محدد (اختياري - اتركه فارغاً لصرف عام للمسير)' : 'Pay Specific Worker (Optional)'}
            </label>
            <select
              value={paymentEmployeeId}
              onChange={(e) => setPaymentEmployeeId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? '-- صرف مجمع للمسير ككل --' : '-- Batch Payroll Payment --'}</option>
              {paymentPayroll?.items?.map((item) => (
                <option key={item.employee_id} value={item.employee_id}>
                  {item.employee?.employee_code} - {item.employee?.name} (مستحق: {Number(item.net_salary).toLocaleString()} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مبلغ الدفعة الحالية (ج.م) *' : 'Payment Amount *'}
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'طريقة الدفع *' : 'Payment Method *'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="cash">{isAr ? 'نقداً (خزينة المصنع)' : 'Cash'}</option>
                <option value="instapay">{isAr ? 'انستاباي / محفظة إلكترونية' : 'InstaPay / Wallet'}</option>
                <option value="bank_transfer">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="cheque">{isAr ? 'شيك بنكي' : 'Cheque'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تاريخ الصرف *' : 'Payment Date *'}
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الإيصال / المرجع' : 'Reference / Receipt No'}
              </label>
              <input
                type="text"
                placeholder="e.g. REC-9921"
                value={paymentRefNumber}
                onChange={(e) => setPaymentRefNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري قيد الصرف...' : 'Recording...'}
                </>
              ) : (
                isAr ? 'تأكيد وقيد الصرف' : 'Confirm Payment'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 7. Detailed Worker-by-Worker Payroll Breakdown Modal */}
      <Modal
        isOpen={isPayrollDetailModalOpen}
        onClose={() => setIsPayrollDetailModalOpen(false)}
        title={isAr ? `كشف تفصيلي لمسير الرواتب: ${selectedPayrollForView?.payroll_period}` : `Payroll Itemized Breakdown: ${selectedPayrollForView?.payroll_period}`}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pe-1">
          <div className="grid grid-cols-4 gap-2 text-center p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-400">{isAr ? 'الإجمالي المستحق' : 'Gross Total'}</span>
              <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                {Number(selectedPayrollForView?.total_gross || 0).toLocaleString()} ج.م
              </p>
            </div>
            <div>
              <span className="text-slate-400">{isAr ? 'إجمالي الاستقطاعات' : 'Deductions'}</span>
              <p className="font-bold text-amber-600 mt-0.5">
                {Number(selectedPayrollForView?.total_deductions || 0).toLocaleString()} ج.م
              </p>
            </div>
            <div>
              <span className="text-slate-400">{isAr ? 'الصافي' : 'Net Salary'}</span>
              <p className="font-bold text-emerald-600 mt-0.5">
                {Number(selectedPayrollForView?.total_net || 0).toLocaleString()} ج.م
              </p>
            </div>
            <div>
              <span className="text-slate-400">{isAr ? 'الرصيد المتبقي' : 'Balance'}</span>
              <p className="font-bold text-rose-600 mt-0.5">
                {(selectedPayrollForView?.remaining_balance !== undefined
                  ? Number(selectedPayrollForView.remaining_balance)
                  : Number(selectedPayrollForView?.total_net || 0) - (Number(selectedPayrollForView?.total_paid) || 0)
                ).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {isAr ? 'مستحقات وتفاصيل كل عامل (شفافية كاملة):' : 'Individual Worker Calculations:'}
            </h4>

            {selectedPayrollForView?.items?.map((item, idx) => {
              const breakdown = item.calculation_breakdown;
              return (
                <div
                  key={item.id || idx}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 text-xs"
                >
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-primary font-bold">{item.employee?.employee_code}</span>
                      <span className="ms-2 font-bold text-slate-900 dark:text-white">{item.employee?.name}</span>
                      <span className="ms-2 text-slate-400">({item.employee?.job_title})</span>
                    </div>
                    <Badge variant={item.is_paid ? 'success' : 'warning'}>
                      {item.is_paid ? (isAr ? 'تم الصرف' : 'Paid') : (isAr ? 'معلق للصرف' : 'Unpaid')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                    <div>
                      <span>{isAr ? 'إنتاجية القطعة:' : 'Piece Earnings:'}</span>{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {Number(item.piece_rate_earnings || 0).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                      </strong>
                    </div>
                    <div>
                      <span>{isAr ? 'أجر ساعي/يومي:' : 'Time Wages:'}</span>{' '}
                      <strong className="text-slate-900 dark:text-white">
                        {(Number(item.hourly_earnings || 0) + Number(item.daily_earnings || 0)).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                      </strong>
                    </div>
                    <div>
                      <span>{isAr ? 'أوفرتايم وبدلات:' : 'OT & Bonuses:'}</span>{' '}
                      <strong className="text-emerald-600">
                        +{(Number(item.overtime_earnings || 0) + Number(item.allowances_and_bonuses || 0)).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                      </strong>
                    </div>
                    <div>
                      <span>{isAr ? 'سلف وخصم عيوب:' : 'Advances & Defects:'}</span>{' '}
                      <strong className="text-rose-600">
                        -{(Number(item.advances_repaid || 0) + Number(item.defect_deductions || 0) + Number(item.general_deductions || 0)).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 font-mono text-[10px]">
                      {breakdown?.pay_type ? (isAr ? `نظام: ${breakdown.pay_type}` : `Type: ${breakdown.pay_type}`) : ''}
                    </span>
                    <div>
                      <span className="text-slate-500 me-1.5">{isAr ? 'الصافي المستحق:' : 'Net Salary:'}</span>
                      <strong className="text-emerald-600 font-bold text-sm">
                        {Number(item.net_salary).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setIsPayrollDetailModalOpen(false)}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 8. Printable Payroll Slip Modal */}
      <Modal
        isOpen={isPrintSlipModalOpen}
        onClose={() => setIsPrintSlipModalOpen(false)}
        title={isAr ? 'طباعة كشف ومفردات مسير الرواتب' : 'Print Payroll Voucher'}
      >
        <div className="space-y-4">
          <div className="p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono space-y-2">
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold">GARMENTOS CLOUD ERP</h2>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'إيصال مسير الرواتب الدفتري للمصنع' : 'Official Factory Payroll Settlement Voucher'}
              </p>
              <p className="font-bold mt-1 text-primary">{selectedPayrollForView?.payroll_period}</p>
            </div>

            <div className="flex justify-between text-[11px]">
              <span>{isAr ? 'الفترة:' : 'Period:'} {selectedPayrollForView?.period_start} → {selectedPayrollForView?.period_end}</span>
              <span>{isAr ? 'الحالة:' : 'Status:'} {selectedPayrollForView?.status?.toUpperCase()}</span>
            </div>

            <div className="py-2 border-y border-slate-200 dark:border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span>{isAr ? 'إجمالي مستحقات الإنتاج والأجور:' : 'Gross Total:'}</span>
                <strong>{Number(selectedPayrollForView?.total_gross || 0).toLocaleString()} EGP</strong>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>{isAr ? 'إجمالي السلف والاستقطاعات:' : 'Total Deductions:'}</span>
                <strong>-{Number(selectedPayrollForView?.total_deductions || 0).toLocaleString()} EGP</strong>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-600 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>{isAr ? 'صافي مسير الرواتب:' : 'Net Payable:'}</span>
                <span>{Number(selectedPayrollForView?.total_net || 0).toLocaleString()} EGP</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>{isAr ? 'المدفوع فعلياً:' : 'Paid:'} {Number(selectedPayrollForView?.total_paid || 0).toLocaleString()} EGP</span>
                <span>{isAr ? 'المتبقي:' : 'Balance:'} {(Number(selectedPayrollForView?.total_net || 0) - (Number(selectedPayrollForView?.total_paid) || 0)).toLocaleString()} EGP</span>
              </div>
            </div>

            <div className="pt-2 text-[10px] text-slate-400 text-center">
              {isAr ? 'تم التوليد والحساب آلياً بواسطة محرك أجور GarmentOS Cloud' : 'Generated by GarmentOS Cloud Wage Engine'}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsPrintSlipModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'طباعة الكشف' : 'Print Voucher'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 9. Generate Payroll Modal */}
      <Modal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
        title={isAr ? 'توليد مسير رواتب دوري جديد' : 'Generate New Periodic Payroll'}
      >
        <form onSubmit={handleGeneratePayroll} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود الفترة (الشهر / الدورة) *' : 'Period Code *'}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2026-10"
              value={payrollPeriod}
              onChange={(e) => setPayrollPeriod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
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
              ? 'يقوم محرك الرواتب تلقائياً باحتساب أجور القطعة المعتمدة، وساعات العمل والأوفرتايم، وأيام الحضور، وخصم السلف المعتمدة وعيوب الجودة المعتمدة حصراً مع منع التكرار.'
              : 'The payroll engine processes piece-work outputs, attendance hours & overtime, daily wages, and approved adjustments.'}
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
                isAr ? 'توليد واحتساب المسير' : 'Generate Payroll'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 10. Log Piece Work Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={isAr ? 'تسجيل إنتاجية عامل واحتساب أجر القطعة' : 'Record Worker Piece Output'}
      >
        <form onSubmit={handleAddLog} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اختر العامل *' : 'Select Worker *'}
            </label>
            <select
              value={selectedEmp}
              onChange={(e) => setSelectedEmp(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} - {e.name} ({e.department})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'العملية الفنية *' : 'Operation *'}
            </label>
            <select
              value={selectedRate}
              onChange={(e) => setSelectedRate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {pieceRates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.operation_name} ({Number(r.rate_per_piece).toFixed(2)} {isAr ? 'ج.م/قطعة' : 'EGP/pc'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الكمية السليمة المنجزة (عدد القطع) *' : 'Completed Pieces *'}
            </label>
            <input
              type="number"
              min="1"
              required
              value={logQty}
              onChange={(e) => setLogQty(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
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

      {/* 11. Report Defect Adjustment Modal (Phase 09B) */}
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employee_code} - {e.name} ({e.department})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'أمر التشغيل المرتبط *' : 'Production Order ID *'}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PO-2026-001"
                value={defectOrderId}
                onChange={(e) => setDefectOrderId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الخصم المقترح (ج.م) *' : 'Proposed Penalty (EGP) *'}
              </label>
              <input
                type="number"
                min="1"
                step="5"
                required
                value={defectProposedAmount}
                onChange={(e) => setDefectProposedAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'وصف العيب وسبب الخصم *' : 'Defect Reason *'}
            </label>
            <input
              type="text"
              required
              placeholder={isAr ? 'مثال: خطأ في خياطة السحاب أدى لتلف 10 قطع' : 'e.g. Zipper seam defect'}
              value={defectReason}
              onChange={(e) => setDefectReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات التحقيق الفني ومعاينة القطع' : 'Technical Investigation Notes'}
            </label>
            <textarea
              rows={2}
              value={defectInvestigationNotes}
              onChange={(e) => setDefectInvestigationNotes(e.target.value)}
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
                  {isAr ? 'جاري الرفع...' : 'Reporting...'}
                </>
              ) : (
                isAr ? 'رفع البلاغ للاعتماد' : 'Submit Defect'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 12. Add Piece Rate Modal */}
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold"
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

      {/* 13. General Action Modal (Rejection / Reversal with reason) */}
      <Modal
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        title={
          actionType === 'reject_log'
            ? (isAr ? 'رفض سجل إنتاجية أجر القطعة' : 'Reject Piece Work Log')
            : actionType === 'reject_defect'
            ? (isAr ? 'رفض خصم عيب الجودة المقترح' : 'Reject Defect Adjustment')
            : actionType === 'reverse_defect'
            ? (isAr ? 'إلغاء الخصم تعويضياً وإعادة المبلغ للعامل' : 'Reverse Defect Deduction')
            : actionType === 'reject_adjustment'
            ? (isAr ? 'رفض التسوية المالية / السلفة' : 'Reject Financial Adjustment')
            : (isAr ? 'رفض مسير الرواتب وإعادته كمسودة' : 'Reject Payroll Run')
        }
      >
        <form onSubmit={handleExecuteAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب الإجراء (إلزامي للتدقيق والمسؤولية) *' : 'Reason (Mandatory) *'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={isAr ? 'اكتب بالتفصيل سبب الرفض أو الإلغاء التعويضي...' : 'State the reason...'}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsActionModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={actionType === 'reverse_defect' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-rose-600 hover:bg-rose-700'}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري المعالجة...' : 'Processing...'}
                </>
              ) : (
                isAr ? 'تأكيد الإجراء' : 'Confirm Action'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 14. Worker Objection Modal */}
      <Modal
        isOpen={isObjectionModalOpen}
        onClose={() => setIsObjectionModalOpen(false)}
        title={isAr ? 'تسجيل اعتراض العامل على خصم الجودة' : 'Record Worker Objection'}
      >
        <form onSubmit={handleRecordObjection} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            {isAr
              ? 'تسجيل اعتراض العامل يجمد تنفيذ الخصم في مسيرات الرواتب لحين إعادة فتح تحقيق فني من قبل الإدارة.'
              : 'Recording objection freezes deduction in payroll pending technical re-investigation.'}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ملاحظات ودفاع العامل *' : 'Worker Defense & Notes *'}
            </label>
            <textarea
              required
              rows={3}
              placeholder={isAr ? 'مثال: العيب ناتج عن خيط رديء من المورد وليس من الماكينة...' : 'Worker explanation...'}
              value={objectionNotes}
              onChange={(e) => setObjectionNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsObjectionModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700">
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                  {isAr ? 'جاري التوثيق...' : 'Recording...'}
                </>
              ) : (
                isAr ? 'توثيق الاعتراض وتجميد الخصم' : 'Submit Objection'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
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
  UserPlus,
  Scissors,
  Zap,
  Sparkles,
  Wrench,
  Package,
  Award,
  CheckCircle2,
  Activity,
  Coins,
  FileSpreadsheet,
  Tag,
  Trash2,
  ArrowRight,
  FileText,
  Building,
  Phone,
  FileDown,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { PageHeader } from '../ui/PageHeader';
import { Pagination } from '../ui/Pagination';
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
  const [empPayType, setEmpPayType] = useState<'piece_rate' | 'fixed_salary' | 'hourly' | 'daily' | 'weekly' | 'shift_based' | 'hybrid'>('piece_rate');
  const [empBaseSalary, setEmpBaseSalary] = useState<number>(0);
  const [empHourlyRate, setEmpHourlyRate] = useState<number>(0);
  const [empDailyRate, setEmpDailyRate] = useState<number>(0);
  const [empWeeklyRate, setEmpWeeklyRate] = useState<number>(0);
  const [empShiftRate, setEmpShiftRate] = useState<number>(0);
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
  const [attWorkingHours, setAttWorkingHours] = useState<number | string>(8.0);
  const [attOvertimeHours, setAttOvertimeHours] = useState<number | string>(0.5);
  const [attLateMinutes, setAttLateMinutes] = useState<number | string>(0);
  const [attNotes, setAttNotes] = useState('');
  const [attIsPayable, setAttIsPayable] = useState(true);
  const [attCorrectionReason, setAttCorrectionReason] = useState('');

  const calculateHoursFromTimes = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return;
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) return;
    let diffM = (outH * 60 + outM) - (inH * 60 + inM);
    if (diffM < 0) diffM += 24 * 60;
    const totalH = Math.round((diffM / 60) * 100) / 100;
    if (totalH > 8) {
      setAttWorkingHours(8.0);
      setAttOvertimeHours(Math.round((totalH - 8.0) * 100) / 100);
    } else {
      setAttWorkingHours(totalH);
      setAttOvertimeHours(0);
    }
  };

  // Form States - Adjustments
  const [adjEmployeeId, setAdjEmployeeId] = useState('');
  const [adjType, setAdjType] = useState<'advance' | 'bonus' | 'allowance' | 'deduction'>('advance');
  const [adjAmount, setAdjAmount] = useState<number>(500);
  const [adjInstallments, setAdjInstallments] = useState<number>(1);
  const [adjEffectiveDate, setAdjEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [adjReason, setAdjReason] = useState('');

  // Pagination States for Tabs (10 items per page)
  const ITEMS_PER_PAGE = 10;
  const [empPage, setEmpPage] = useState(1);
  const [attPage, setAttPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [adjPage, setAdjPage] = useState(1);
  const [defectPage, setDefectPage] = useState(1);
  const [ratePage, setRatePage] = useState(1);
  const [payrollPage, setPayrollPage] = useState(1);

  // Pagination States inside Worker Dossier Subpage
  const [workerAttPage, setWorkerAttPage] = useState(1);
  const [workerPiecePage, setWorkerPiecePage] = useState(1);
  const [workerAdjPage, setWorkerAdjPage] = useState(1);
  const [workerCutPage, setWorkerCutPage] = useState(1);
  const [workerPayrollPage, setWorkerPayrollPage] = useState(1);

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

  // Feature Extensions States: Garment Models & BOM, Slips, Worker Profile, Internal Page View
  const [garmentModels, setGarmentModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedAdjustmentForPrint, setSelectedAdjustmentForPrint] = useState<EmployeeAdjustment | null>(null);
  const [isPrintAdjustmentModalOpen, setIsPrintAdjustmentModalOpen] = useState(false);
  const [selectedEmployeeForProfile, setSelectedEmployeeForProfile] = useState<Employee | null>(null);
  const [isWorkerProfileModalOpen, setIsWorkerProfileModalOpen] = useState(false);
  const [profileMonthFilter, setProfileMonthFilter] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  // Dedicated Full Internal Page View for Worker & Detailed Payslips
  const [selectedWorkerForFullView, setSelectedWorkerForFullView] = useState<Employee | null>(null);
  const [workerFullData, setWorkerFullData] = useState<any | null>(null);
  const [isWorkerDataLoading, setIsWorkerDataLoading] = useState(false);
  const [workerActiveSubTab, setWorkerActiveSubTab] = useState<'contract' | 'attendance' | 'piece_work' | 'advances' | 'cutting' | 'payroll'>('contract');
  const [selectedItemForIndividualPayslip, setSelectedItemForIndividualPayslip] = useState<any | null>(null);
  const [isIndividualPayslipModalOpen, setIsIndividualPayslipModalOpen] = useState(false);

  const loadHrData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [empRes, prRes, logsRes, payrollsRes, defectsRes, attRes, adjRes, modelsRes] = await Promise.allSettled([
        api.hr.getEmployees(1, { search: employeeSearch, department: employeeDeptFilter, pay_type: employeePayTypeFilter }),
        api.hr.getPieceRates(1),
        api.hr.getPieceWorkLogs(1),
        api.hr.getPayrolls(1),
        api.hr.getDefectAdjustments(1),
        api.hr.getAttendances(1, { attendance_date: attendanceDateFilter === 'all' ? undefined : attendanceDateFilter }),
        api.hr.getAdjustments(1),
        api.models.getModels({ per_page: 100 }),
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
      if (modelsRes.status === 'fulfilled' && modelsRes.value?.data) {
        const raw = modelsRes.value.data;
        setGarmentModels(Array.isArray(raw) ? raw : (raw.data || []));
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
        weekly_rate: Number(empWeeklyRate) || 0,
        shift_rate: Number(empShiftRate) || 0,
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
        weekly_rate: Number(empWeeklyRate) || 0,
        shift_rate: Number(empShiftRate) || 0,
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
    setEmpWeeklyRate((emp as any).weekly_rate || 0);
    setEmpShiftRate((emp as any).shift_rate || 0);
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
    setEmpWeeklyRate(0);
    setEmpShiftRate(0);
    setEmpShiftName('morning');
    setEmpHireDate(new Date().toISOString().split('T')[0]);
    setEmpPhone('');
    setEmpNationalId('');
    setEmpIsActive(true);
  };

  const loadWorkerDetailedData = async (empId: string) => {
    setIsWorkerDataLoading(true);
    try {
      const res = await api.hr.getEmployee(empId);
      setWorkerFullData(res);
    } catch (err: any) {
      console.error('Failed to load employee details', err);
    } finally {
      setIsWorkerDataLoading(false);
    }
  };

  const openWorkerFullProfile = async (emp: Employee) => {
    setSelectedWorkerForFullView(emp);
    setSelectedEmployeeForProfile(emp);
    setWorkerActiveSubTab('contract');
    await loadWorkerDetailedData(emp.id);
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    const confirmText = isAr
      ? `هل أنت متأكد من رغبتك في حذف أو أرشفة العامل (${emp.name} - ${emp.employee_code})؟\n\n- إذا لم تكن هناك مسيرات رواتب مرتبطة به، سيتم حذفه وسجلاته الأولية بالكامل.\n- إذا كانت هناك مسيرات رواتب سابقة، سيتم تعطيل حسابه وأرشفته بأمان لضمان سلامة الدفاتر المحاسبية.`
      : `Are you sure you want to delete / archive worker (${emp.name} - ${emp.employee_code})?`;

    if (!window.confirm(confirmText)) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.deleteEmployee(emp.id);
      setSuccessMsg(res.message || (isAr ? 'تمت معالجة العامل بنجاح' : 'Worker processed successfully'));
      if (selectedWorkerForFullView?.id === emp.id) {
        setSelectedWorkerForFullView(null);
      }
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'تعذر حذف العامل' : 'Failed to delete worker'));
    } finally {
      setIsLoading(false);
    }
  };

  // Tafqeet Helper: Convert Number to Arabic Words for Egyptian Pounds
  const tafqeetAmount = (num: number): string => {
    if (!num || num === 0) return 'صفر جنيه مصري لا غير';
    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    const intPart = Math.floor(Math.abs(num));
    const decPart = Math.round((Math.abs(num) - intPart) * 100);

    const convertGroup = (n: number): string => {
      const h = Math.floor(n / 100);
      const remainder = n % 100;
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;

      const groupParts: string[] = [];
      if (h > 0) groupParts.push(hundreds[h]);

      if (remainder >= 10 && remainder <= 19) {
        groupParts.push(teens[remainder - 10]);
      } else {
        if (o > 0) groupParts.push(ones[o]);
        if (t > 0) groupParts.push(tens[t]);
      }
      return groupParts.join(' و');
    };

    const parts: string[] = [];
    const thousandsCount = Math.floor(intPart / 1000);
    const remainder1000 = intPart % 1000;

    if (thousandsCount > 0) {
      if (thousandsCount === 1) {
        parts.push('ألف');
      } else if (thousandsCount === 2) {
        parts.push('ألفان');
      } else if (thousandsCount >= 3 && thousandsCount <= 10) {
        parts.push(`${convertGroup(thousandsCount)} آلاف`);
      } else {
        parts.push(`${convertGroup(thousandsCount)} ألفاً`);
      }
    }

    if (remainder1000 > 0) {
      parts.push(convertGroup(remainder1000));
    }

    let result = parts.join(' و');
    if (!result) result = 'صفر';
    result = `فقط ${result} جنيه مصري لا غير`;

    if (decPart > 0) {
      result += ` و ${decPart} قرشاً`;
    }
    return result;
  };

  // Export Factory Payrolls to CSV
  const exportPayrollsToCsv = () => {
    if (payrolls.length === 0) return;
    const headers = ['كود الفترة', 'بداية الفترة', 'نهاية الفترة', 'إجمالي المستحق (ج.م)', 'الاستقطاعات (ج.م)', 'صافي المسير (ج.م)', 'المدفوع (ج.م)', 'المتبقي (ج.م)', 'الحالة'];
    const rows = payrolls.map((p) => {
      const balance = p.remaining_balance !== undefined ? Number(p.remaining_balance) : Number(p.total_net) - (Number(p.total_paid) || 0);
      return [
        `"${p.payroll_period}"`,
        `"${p.period_start}"`,
        `"${p.period_end}"`,
        Number(p.total_gross || 0).toFixed(2),
        Number(p.total_deductions || 0).toFixed(2),
        Number(p.total_net || 0).toFixed(2),
        Number(p.total_paid || 0).toFixed(2),
        balance.toFixed(2),
        `"${p.status}"`,
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `مسيرات_رواتب_المصنع_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Worker Attendance to CSV
  const exportWorkerAttendanceToCsv = (emp: Employee, targetMonth: string) => {
    const filtered = attendances.filter((a) => a.employee_id === emp.id && a.attendance_date.startsWith(targetMonth));
    const headers = ['كود العامل', 'اسم العامل', 'التاريخ', 'اليوم', 'تسجيل الدخول', 'تسجيل الخروج', 'إجمالي الساعات', 'ساعات الأوفرتايم', 'الحالة', 'خاضع للأجر'];
    const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const rows = filtered.map((a) => {
      const dayName = daysOfWeek[new Date(a.attendance_date).getDay()] || '';
      const statusText = a.status === 'present' ? 'حاضر' : a.status === 'absent' ? 'غائب' : a.status === 'late' ? 'متأخر' : a.status === 'half_day' ? 'نصف يوم' : 'إجازة';
      return [
        `"${emp.employee_code}"`,
        `"${emp.name}"`,
        `"${a.attendance_date}"`,
        `"${dayName}"`,
        `"${a.check_in || '-'}"`,
        `"${a.check_out || '-'}"`,
        Number(a.total_hours ?? a.hours_worked ?? 0).toFixed(2),
        Number(a.overtime_hours || 0).toFixed(2),
        `"${statusText}"`,
        a.is_payable ? 'نعم' : 'لا',
      ];
    });
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `سجل_حضور_${emp.employee_code}_${emp.name}_${targetMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openNewAttendanceModalForWorker = (empId?: string) => {
    if (empId) {
      setAttEmployeeId(empId);
    } else if (employees.length > 0 && !attEmployeeId) {
      setAttEmployeeId(employees[0].id);
    }
    setAttDate(new Date().toISOString().split('T')[0]);
    setAttCheckIn('08:00');
    setAttCheckOut('16:30');
    setAttStatus('present');
    setAttWorkingHours(8.0);
    setAttOvertimeHours(0.5);
    setAttLateMinutes(0);
    setAttNotes('');
    setAttIsPayable(true);
    setIsAttendanceModalOpen(true);
  };

  // Handle Attendance Store
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmpId = attEmployeeId || employees[0]?.id;
    if (!targetEmpId || !attDate) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.hr.recordAttendance({
        employee_id: targetEmpId,
        attendance_date: attDate,
        check_in: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckIn,
        check_out: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckOut,
        status: attStatus,
        working_hours: attStatus === 'absent' || attStatus === 'leave' ? 0 : Number(attWorkingHours || 0),
        overtime_hours: attStatus === 'absent' || attStatus === 'leave' ? 0 : Number(attOvertimeHours || 0),
        late_minutes: Number(attLateMinutes || 0),
        is_payable: attIsPayable,
        notes: attNotes || undefined,
      });

      setIsAttendanceModalOpen(false);
      setSuccessMsg(isAr ? 'تم تسجيل حركة الحضور بنجاح واحتساب الساعات والأوفرتايم' : 'Attendance recorded successfully');
      await loadHrData();
      if (selectedWorkerForFullView) {
        await loadWorkerDetailedData(selectedWorkerForFullView.id);
      }
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
        check_in: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckIn,
        check_out: attStatus === 'absent' || attStatus === 'leave' ? undefined : attCheckOut,
        status: attStatus,
        working_hours: attStatus === 'absent' || attStatus === 'leave' ? 0 : Number(attWorkingHours || 0),
        overtime_hours: attStatus === 'absent' || attStatus === 'leave' ? 0 : Number(attOvertimeHours || 0),
        late_minutes: Number(attLateMinutes || 0),
        is_payable: attIsPayable,
        correction_reason: attCorrectionReason,
      });

      setIsCorrectAttendanceModalOpen(false);
      setSuccessMsg(isAr ? 'تم تعديل حركة الحضور وتوثيق سبب التصحيح في سجل التدقيق' : 'Attendance corrected successfully');
      setSelectedAttendanceForEdit(null);
      await loadHrData();
      if (selectedWorkerForFullView) {
        await loadWorkerDetailedData(selectedWorkerForFullView.id);
      }
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
    setAttWorkingHours(Number(att.total_hours ?? (att as any).hours_worked ?? (att as any).working_hours ?? 8.0));
    setAttOvertimeHours(Number(att.overtime_hours ?? 0));
    setAttLateMinutes(Number(att.late_minutes ?? 0));
    setAttIsPayable(att.is_payable);
    setAttCorrectionReason(att.correction_reason || '');
    setIsCorrectAttendanceModalOpen(true);
  };

  // Handle Adjustments (Advances / Bonuses / Deductions)
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmpId = adjEmployeeId || employees[0]?.id;
    if (!targetEmpId || adjAmount <= 0) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const installmentsCount = adjType === 'advance' ? Math.max(1, Number(adjInstallments || 1)) : 1;
      const installmentAmount = Number((Number(adjAmount) / installmentsCount).toFixed(4));

      await api.hr.createAdjustment({
        employee_id: targetEmpId,
        type: adjType,
        amount: Number(adjAmount),
        installments_count: installmentsCount,
        installment_amount: installmentAmount,
        effective_date: adjEffectiveDate,
        adjustment_date: adjEffectiveDate,
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

  const handleRecalculatePayroll = async (id: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.recalculatePayroll(id);
      setSuccessMsg(res.message || (isAr ? 'تمت إعادة احتساب مسير الرواتب وتحديث كافة السلف والخصومات بنجاح' : 'Payroll recalculated successfully'));
      if (selectedPayrollForView?.id === id) {
        setSelectedPayrollForView(res.payroll);
      }
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إعادة احتساب مسير الرواتب' : 'Failed to recalculate payroll'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayroll = async (id: string) => {
    if (!confirm(isAr ? 'هل أنت متأكد من حذف هذا المسير؟ سيتم فك كافة السلف وإعادتها لحالتها المعتمدة السابقة.' : 'Are you sure you want to delete this payroll?')) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.hr.deletePayroll(id);
      setSuccessMsg(res.message || (isAr ? 'تم حذف مسير الرواتب وفك تسوياته بنجاح' : 'Payroll deleted successfully'));
      setIsPayrollDetailModalOpen(false);
      setSelectedPayrollForView(null);
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حذف مسير الرواتب' : 'Failed to delete payroll'));
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
        garment_model_id: selectedModelId || undefined,
      });

      setIsRateModalOpen(false);
      setNewOpName('');
      setNewUnitRate(3.5);
      setSelectedModelId('');
      setSuccessMsg(isAr ? 'تم إضافة تسعيرة العملية الفنية بنجاح وربطها بنظام القطعة' : 'Standard piece rate created successfully');
      await loadHrData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل إضافة التسعيرة' : 'Failed to create piece rate'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics & Calculations
  const pendingDefectCount = defectAdjustments.filter((d) => d.status === 'pending_approval').length;
  const pendingAdjustmentsCount = adjustments.filter((a) => a.status === 'pending' || a.status === 'pending_approval').length;
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter((e) => e.is_active).length;
  const presentCount = attendances.filter((a) => a.status === 'present').length;
  const lateCount = attendances.filter((a) => a.status === 'late').length;
  const attendanceRate = totalEmployeesCount > 0 ? Math.round((presentCount / totalEmployeesCount) * 100) : 0;
  const totalPendingAdvancesAmount = adjustments
    .filter((a) => (a.status === 'pending' || a.status === 'pending_approval') && a.type === 'advance')
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  // Filtered employees for instant search & department filtering
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (employeeSearch) {
        const q = employeeSearch.toLowerCase();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchCode = emp.employee_code?.toLowerCase().includes(q);
        const matchJob = emp.job_title?.toLowerCase().includes(q);
        const matchPhone = emp.phone?.includes(q);
        if (!matchName && !matchCode && !matchJob && !matchPhone) return false;
      }
      if (employeeDeptFilter !== 'all' && emp.department !== employeeDeptFilter) return false;
      if (employeePayTypeFilter !== 'all' && emp.pay_type !== employeePayTypeFilter) return false;
      return true;
    });
  }, [employees, employeeSearch, employeeDeptFilter, employeePayTypeFilter]);

  // Paginated collections for each of the 7 module tabs
  const paginatedEmployees = useMemo(() => {
    const start = (empPage - 1) * ITEMS_PER_PAGE;
    return filteredEmployees.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEmployees, empPage]);

  const paginatedAttendances = useMemo(() => {
    const start = (attPage - 1) * ITEMS_PER_PAGE;
    return attendances.slice(start, start + ITEMS_PER_PAGE);
  }, [attendances, attPage]);

  const paginatedWorkLogs = useMemo(() => {
    const start = (logPage - 1) * ITEMS_PER_PAGE;
    return workLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [workLogs, logPage]);

  const paginatedAdjustments = useMemo(() => {
    const start = (adjPage - 1) * ITEMS_PER_PAGE;
    return adjustments.slice(start, start + ITEMS_PER_PAGE);
  }, [adjustments, adjPage]);

  const paginatedDefects = useMemo(() => {
    const start = (defectPage - 1) * ITEMS_PER_PAGE;
    return defectAdjustments.slice(start, start + ITEMS_PER_PAGE);
  }, [defectAdjustments, defectPage]);

  const paginatedPieceRates = useMemo(() => {
    const start = (ratePage - 1) * ITEMS_PER_PAGE;
    return pieceRates.slice(start, start + ITEMS_PER_PAGE);
  }, [pieceRates, ratePage]);

  const paginatedPayrolls = useMemo(() => {
    const start = (payrollPage - 1) * ITEMS_PER_PAGE;
    return payrolls.slice(start, start + ITEMS_PER_PAGE);
  }, [payrolls, payrollPage]);

  useEffect(() => {
    setEmpPage(1);
  }, [employeeSearch, employeeDeptFilter, employeePayTypeFilter]);

  useEffect(() => {
    setAttPage(1);
  }, [attendanceDateFilter]);

  const getDepartmentBadge = (dept: string) => {
    switch (dept) {
      case 'cutting':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
            <Scissors className="w-3.5 h-3.5 text-amber-600" />
            <span>{isAr ? 'صالة القص' : 'Cutting'}</span>
          </span>
        );
      case 'sewing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isAr ? 'خطوط الحياكة' : 'Sewing'}</span>
          </span>
        );
      case 'finishing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/60 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>{isAr ? 'التشطيب والكي' : 'Finishing'}</span>
          </span>
        );
      case 'quality':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 shadow-2xs">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{isAr ? 'مراقبة الجودة' : 'Quality'}</span>
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-2xs">
            <Wrench className="w-3.5 h-3.5 text-sky-600" />
            <span>{isAr ? 'الصيانة والورش' : 'Maintenance'}</span>
          </span>
        );
      case 'packaging':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/60 shadow-2xs">
            <Package className="w-3.5 h-3.5 text-teal-600" />
            <span>{isAr ? 'التعبئة والتغليف' : 'Packaging'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>{dept}</span>
          </span>
        );
    }
  };

  const getPayTypeBadge = (payType: string, emp: Employee) => {
    switch (payType) {
      case 'piece_rate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-2xs">
            <Award className="w-3 h-3 text-purple-600" />
            <span>{isAr ? 'أجر بالقطعة (إنتاجية)' : 'Piece Rate'}</span>
          </span>
        );
      case 'fixed_salary':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <Coins className="w-3 h-3 text-emerald-600" />
            <span>{isAr ? `راتب: ${Number(emp.base_salary || 0).toLocaleString()} ج.م` : `Fixed: ${emp.base_salary}`}</span>
          </span>
        );
      case 'daily':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>{isAr ? `يومي: ${emp.daily_rate || 0} ج.م / يوم` : `Daily: ${emp.daily_rate}`}</span>
          </span>
        );
      case 'hourly':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
            <Activity className="w-3 h-3 text-sky-600" />
            <span>{isAr ? `ساعي: ${emp.hourly_rate || 0} ج.م / س` : `Hourly: ${emp.hourly_rate}`}</span>
          </span>
        );
      case 'hybrid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
            <Zap className="w-3 h-3 text-indigo-600" />
            <span>{isAr ? `هجين (${Number(emp.base_salary || 0).toLocaleString()} أساسي + إنتاج)` : 'Hybrid'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span>{payType}</span>
          </span>
        );
    }
  };

  const exportAttendanceCsv = (workerName: string, attList: any[]) => {
    const headers = [
      isAr ? 'التاريخ' : 'Date',
      isAr ? 'الحالة' : 'Status',
      isAr ? 'وقت الحضور' : 'Check In',
      isAr ? 'وقت الانصراف' : 'Check Out',
      isAr ? 'ساعات العمل' : 'Working Hours',
      isAr ? 'ساعات إضافية' : 'Overtime Hours',
      isAr ? 'دقائق التأخير' : 'Late Minutes',
      isAr ? 'ملاحظات' : 'Notes',
    ];
    const rows = attList.map((a) => [
      a.attendance_date ? a.attendance_date.split('T')[0] : '',
      a.status,
      a.check_in || '',
      a.check_out || '',
      a.total_hours ?? a.hours_worked ?? a.working_hours ?? 0,
      a.overtime_hours ?? 0,
      a.late_minutes ?? 0,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_حضور_${workerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Page Header */}
      <PageHeader
        title={isAr ? 'إدارة القوى العاملة والحضور ومسيرات الرواتب' : 'Workforce, Attendance & Payroll'}
        subtitle={
          isAr
            ? 'سجل العمال الموحد، ساعات الحضور والورديات، أجور القطعة، السلف والخصومات، ومحرك الرواتب المعتمد.'
            : 'Unified worker registry, time & attendance, piece rates, advances, defect adjustments, and certified payroll engine.'
        }
        icon={<Users className="w-5 h-5 text-indigo-500" />}
        breadcrumbs={[
          { label: isAr ? 'الرئيسية' : 'Home' },
          { label: isAr ? 'القوى العاملة والرواتب' : 'Workforce & Payroll' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                resetEmployeeForm();
                setIsEmployeeModalOpen(true);
              }}
              title={isAr ? 'تسجيل عامل أو موظف جديد بالمصنع' : 'Register New Worker'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isAr ? '+ عامل جديد' : '+ New Worker'}</span>
            </button>

            <button
              type="button"
              onClick={() => openNewAttendanceModalForWorker()}
              title={isAr ? 'تسجيل حركة حضور وانصراف' : 'Record Attendance'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>{isAr ? '+ تسجيل حضور' : '+ Attendance'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              title={isAr ? 'طلب سلفة أو مكافأة أو بدل مالي' : 'New Advance or Allowance'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs transition-all cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isAr ? '+ سلفة / مكافأة' : '+ Adjustment'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPayrollModalOpen(true)}
              title={isAr ? 'توليد واحتساب مسير رواتب دوري جديد' : 'Generate Payroll'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 shadow-xs transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4" />
              <span>{isAr ? '+ مسير رواتب' : '+ Payroll'}</span>
            </button>

            <button
              type="button"
              onClick={loadHrData}
              title={isAr ? 'تحديث البيانات' : 'Refresh'}
              className="inline-flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW SWITCHER: DEDICATED WORKER INTERNAL PAGE VIEW VS WORKFORCE DASHBOARD */}
      {/* ========================================================================= */}
      {selectedWorkerForFullView ? (() => {
        const emp = workerFullData?.employee || selectedWorkerForFullView;
        const stats = workerFullData?.statistics || {};
        const cuttingOrders: any[] = workerFullData?.cutting_orders || [];
        const attendancesList: any[] = emp?.attendances || [];
        const pieceLogsList: any[] = emp?.piece_work_logs || [];
        const adjustmentsList: any[] = emp?.adjustments || [];
        const payrollItemsList: any[] = emp?.payroll_items || [];

        // Month filter for timesheet
        const filteredWorkerAttendances = attendancesList.filter(
          (a: any) => !profileMonthFilter || (a.attendance_date && a.attendance_date.startsWith(profileMonthFilter))
        );
        const daysPresent = filteredWorkerAttendances.filter((a: any) => a.status === 'present').length;
        const daysLate = filteredWorkerAttendances.filter((a: any) => a.status === 'late').length;
        const totalWorkedHours = filteredWorkerAttendances.reduce((sum: number, a: any) => sum + (Number(a.total_hours ?? a.hours_worked ?? a.working_hours) || 0), 0);
        const totalOvertimeHours = filteredWorkerAttendances.reduce((sum: number, a: any) => sum + (Number(a.overtime_hours) || 0), 0);

        const paginatedWorkerAttendances = filteredWorkerAttendances.slice(
          (workerAttPage - 1) * ITEMS_PER_PAGE,
          workerAttPage * ITEMS_PER_PAGE
        );

        const paginatedWorkerPieceLogs = pieceLogsList.slice(
          (workerPiecePage - 1) * ITEMS_PER_PAGE,
          workerPiecePage * ITEMS_PER_PAGE
        );

        const paginatedWorkerAdjustments = adjustmentsList.slice(
          (workerAdjPage - 1) * ITEMS_PER_PAGE,
          workerAdjPage * ITEMS_PER_PAGE
        );

        const paginatedWorkerCuttingOrders = cuttingOrders.slice(
          (workerCutPage - 1) * ITEMS_PER_PAGE,
          workerCutPage * ITEMS_PER_PAGE
        );

        const paginatedWorkerPayrollItems = payrollItemsList.slice(
          (workerPayrollPage - 1) * ITEMS_PER_PAGE,
          workerPayrollPage * ITEMS_PER_PAGE
        );

        return (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 1. Subpage Navigation & Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedWorkerForFullView(null);
                    loadHrData();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  <ArrowRight className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" />
                  <span>{isAr ? '« العودة لسجل العمال' : '« Back to Workforce'}</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{isAr ? 'الملف التشغيلي والشامل:' : 'Worker File:'}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{emp.name}</span>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {emp.employee_code}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openNewAttendanceModalForWorker(emp.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isAr ? '+ تسجيل حضور' : '+ Attendance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjEmployeeId(emp.id);
                    setIsAdjustmentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{isAr ? '+ سلفة / مكافأة' : '+ Advance'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmp(emp.id);
                    setIsLogModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs cursor-pointer"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>{isAr ? '+ إنتاجية قطعة' : '+ Piece Work'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditEmployee(emp)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  title={isAr ? 'تعديل بيانات العامل' : 'Edit Worker'}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteEmployee(emp)}
                  className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-all cursor-pointer"
                  title={isAr ? 'حذف أو أرشفة العامل' : 'Delete / Archive'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => loadWorkerDetailedData(emp.id)}
                  className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
                  title={isAr ? 'تحديث البيانات' : 'Refresh'}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isWorkerDataLoading ? 'animate-spin text-indigo-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* 2. Worker Identity Hero Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-md">
                    {emp.name ? emp.name.trim().charAt(0) : 'ع'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-black text-slate-900 dark:text-white">{emp.name}</h1>
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700">
                        {emp.employee_code}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                        emp.is_active
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{emp.is_active ? (isAr ? 'على رأس العمل' : 'Active') : (isAr ? 'معطل' : 'Inactive')}</span>
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex flex-wrap items-center gap-3">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{emp.job_title}</span>
                      <span>•</span>
                      <span>{getDepartmentBadge(emp.department)}</span>
                      <span>•</span>
                      <span>وردية: {emp.shift_name || (isAr ? 'صباحية' : 'Morning')}</span>
                      <span>•</span>
                      <span>تعيين: {emp.hire_date ? emp.hire_date.split('T')[0] : '-'}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
                      {emp.phone && (
                        <a href={`tel:${emp.phone}`} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                          <Phone className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{emp.phone}</span>
                        </a>
                      )}
                      {emp.national_id && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>🆔 {emp.national_id}</span>
                        </span>
                      )}
                      {emp.branch?.name && (
                        <span className="flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.branch.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getPayTypeBadge(emp.pay_type, emp)}
                </div>
              </div>
            </div>

            {/* 3. Top 5 Key Metric Cards for This Worker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Card 1: Completed Pieces */}
              <div
                onClick={() => setWorkerActiveSubTab('piece_work')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  workerActiveSubTab === 'piece_work'
                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-purple-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{isAr ? 'إجمالي القطع المنجزة' : 'Pieces Produced'}</span>
                  <Scissors className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {Number(stats.total_pieces_completed ?? 0).toLocaleString()}
                </div>
                <div className="text-[10.5px] text-purple-600 dark:text-purple-400 font-bold mt-0.5 font-mono">
                  +{Number(stats.total_piece_earnings ?? 0).toFixed(2)} {isAr ? 'ج.م أرباح' : 'EGP'}
                </div>
              </div>

              {/* Card 2: Cash Advances Taken & Remaining Balance */}
              <div
                onClick={() => setWorkerActiveSubTab('advances')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  workerActiveSubTab === 'advances'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{isAr ? 'إجمالي السلف النقدية' : 'Advances Taken'}</span>
                  <DollarSign className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {Number(stats.total_advances_taken ?? 0).toLocaleString()} <span className="text-xs font-bold text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="text-[10.5px] mt-0.5">
                  {(Number(stats.remaining_advances_balance ?? emp.remaining_advances_balance) || 0) > 0 ? (
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {isAr ? 'متبقي للسداد:' : 'Remaining:'} {Number(stats.remaining_advances_balance ?? emp.remaining_advances_balance).toLocaleString()} ج.م
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{isAr ? 'خالص ومسدد بالكامل' : 'Fully Settled'}</span>
                  )}
                </div>
              </div>

              {/* Card 3: Attendance Records */}
              <div
                onClick={() => setWorkerActiveSubTab('attendance')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                  workerActiveSubTab === 'attendance'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{isAr ? 'سجل الحضور' : 'Attendances'}</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {stats.attendances_count ?? attendancesList.length} <span className="text-xs font-normal text-slate-400">{isAr ? 'يوم' : 'days'}</span>
                </div>
                <div className="text-[10.5px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">
                  {daysPresent} {isAr ? 'حضور' : 'present'} | {daysLate} {isAr ? 'تأخير' : 'late'}
                </div>
              </div>

              {/* Card 4: Active Bundles */}
              <div className="p-3.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{isAr ? 'الحزم النشطة' : 'Active Bundles'}</span>
                  <Package className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {stats.active_bundles_count ?? 0} <span className="text-xs font-normal text-slate-400">{isAr ? 'حزمة' : 'bundles'}</span>
                </div>
                <div className="text-[10.5px] text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                  {isAr ? 'قيد التشغيل بالخط' : 'Under Work'}
                </div>
              </div>

              {/* Card 5: Cutting & CMT Orders - The Key Feature! */}
              <div
                onClick={() => setWorkerActiveSubTab('cutting')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs col-span-2 sm:col-span-1 ${
                  workerActiveSubTab === 'cutting'
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-700'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                }`}
              >
                <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                  <span>{isAr ? 'صالة القص والقص للغير' : 'Cutting & CMT'}</span>
                  <Scissors className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                  {cuttingOrders.length} <span className="text-xs font-normal text-slate-400">{isAr ? 'أمر قص' : 'orders'}</span>
                </div>
                <div className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">
                  {isAr ? 'ربط مباشر بالصالة والـ CMT' : 'Direct Link to CMT & Hall'}
                </div>
              </div>
            </div>

            {/* 4. Sub-Navigation Tabs inside Worker Profile */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('contract')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'contract'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>{isAr ? 'الهيكل المالي والتعاقدي' : 'Contract & Compensation'}</span>
              </button>

              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('attendance')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'attendance'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{isAr ? 'شيت الحضور الشهري' : 'Attendance Timesheet'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono">
                  {attendancesList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('piece_work')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'piece_work'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>{isAr ? 'سجل إنتاجية القطعة' : 'Piece Work Logs'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono">
                  {pieceLogsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('advances')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'advances'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>{isAr ? 'السلف والتسويات المالية' : 'Advances & Adjustments'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-mono">
                  {adjustmentsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('cutting')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'cutting'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span>{isAr ? 'أوامر صالة القص والتشغيل للغير (CMT)' : 'Cutting & CMT Orders'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                  {cuttingOrders.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWorkerActiveSubTab('payroll')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer ${
                  workerActiveSubTab === 'payroll'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calculator className="w-4 h-4" />
                <span>{isAr ? 'مسيرات الرواتب والمستحقات' : 'Payroll History'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono">
                  {payrollItemsList.length}
                </span>
              </button>
            </div>

            {/* 5. Sub-Tab Content Views */}

            {/* 5.1 CONTRACT & COMPENSATION TAB */}
            {workerActiveSubTab === 'contract' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? 'تفاصيل هيكل الأجر والتعويض' : 'Compensation Structure'}</span>
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'نظام احتساب الأجر:' : 'Wage Model:'}</span>
                      <div>{getPayTypeBadge(emp.pay_type, emp)}</div>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'الراتب الأساسي الشهري:' : 'Base Salary:'}</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{Number(emp.base_salary || 0).toLocaleString()} ج.م</strong>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'أجر الساعة الأساسي:' : 'Hourly Rate:'}</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{Number(emp.hourly_rate || 0).toFixed(2)} ج.م / س</strong>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'أجر اليومية المعتمد:' : 'Daily Rate:'}</span>
                      <strong className="font-mono text-slate-900 dark:text-white">{Number(emp.daily_rate || 0).toFixed(2)} ج.م / يوم</strong>
                    </div>
                    {(emp as any).weekly_rate > 0 && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">{isAr ? 'أجر الأسبوع:' : 'Weekly Rate:'}</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{Number((emp as any).weekly_rate).toLocaleString()} ج.م</strong>
                      </div>
                    )}
                    {(emp as any).shift_rate > 0 && (
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500">{isAr ? 'أجر الوردية:' : 'Shift Rate:'}</span>
                        <strong className="font-mono text-slate-900 dark:text-white">{Number((emp as any).shift_rate).toLocaleString()} ج.م</strong>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-500" />
                    <span>{isAr ? 'الوردية، المهارات وبيانات العمل' : 'Shift, Skills & Employment'}</span>
                  </h3>
                  <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'القسم والخط الإنتاجي:' : 'Department:'}</span>
                      <div>{getDepartmentBadge(emp.department)}</div>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'الوردية المخصصة:' : 'Shift:'}</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{emp.shift_name || (isAr ? 'وردية صباحية (08:00 - 16:30)' : 'Morning Shift')}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">{isAr ? 'تاريخ التعيين الرسمي:' : 'Hire Date:'}</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{emp.hire_date ? emp.hire_date.split('T')[0] : 'غير محدد'}</span>
                    </div>
                    <div className="py-2 space-y-1">
                      <span className="text-slate-500 block mb-1">{isAr ? 'المهارات والعمليات الفنية المسجلة:' : 'Skills:'}</span>
                      {Array.isArray(emp.skills) && emp.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emp.skills.map((skill: string, sIdx: number) => (
                            <span key={sIdx} className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">{isAr ? 'لا توجد مهارات مسجلة' : 'No skills specified'}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* 5.2 ATTENDANCE TIMESHEET TAB */}
            {workerActiveSubTab === 'attendance' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {isAr ? 'تصفية بالشهر:' : 'Month:'}
                    </label>
                    <input
                      type="month"
                      value={profileMonthFilter}
                      onChange={(e) => setProfileMonthFilter(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-emerald-600 font-bold">✓ {daysPresent} {isAr ? 'حضور' : 'present'}</span>
                    <span className="text-amber-600 font-bold">⏱ {daysLate} {isAr ? 'تأخير' : 'late'}</span>
                    <span className="text-indigo-600 font-bold">⚡ {totalWorkedHours.toFixed(1)} {isAr ? 'ساعة عمل' : 'hrs'}</span>
                    <span className="text-purple-600 font-bold">+{totalOvertimeHours.toFixed(1)} {isAr ? 'إضافي' : 'OT'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openNewAttendanceModalForWorker(emp.id)}
                      className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? '+ تسجيل حضور لهذا العامل' : '+ Record Attendance'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => exportAttendanceCsv(emp.name, filteredWorkerAttendances)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400"
                      icon={<FileDown className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'تصدير شيت الحضور (Excel/CSV)' : 'Export CSV'}
                    </Button>
                  </div>
                </div>

                <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                          <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'حضور' : 'Check In'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'انصراف' : 'Check Out'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'ساعات العمل' : 'Hours'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'إضافي' : 'Overtime'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'تأخير' : 'Late'}</th>
                          <th className="py-2.5 px-3 text-start">{isAr ? 'ملاحظات' : 'Notes'}</th>
                          <th className="py-2.5 px-3 text-center">{isAr ? 'إجراء' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredWorkerAttendances.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-8 text-center text-slate-400">
                              {isAr ? 'لا توجد حركات حضور مسجلة لهذا الشهر.' : 'No attendance logged for this month.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedWorkerAttendances.map((att: any) => (
                            <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {att.attendance_date ? att.attendance_date.split('T')[0] : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  att.status === 'present'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 border border-emerald-200'
                                    : att.status === 'late'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 border border-rose-200'
                                }`}>
                                  {att.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{att.check_in || '-'}</td>
                              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400">{att.check_out || '-'}</td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                {Number(att.total_hours ?? att.hours_worked ?? att.working_hours ?? 0).toFixed(1)} س
                              </td>
                              <td className="py-2 px-3 font-mono text-emerald-600 font-bold">
                                +{Number(att.overtime_hours ?? 0).toFixed(1)} س
                              </td>
                              <td className="py-2 px-3 font-mono text-amber-600">
                                {att.late_minutes ?? 0} د
                              </td>
                              <td className="py-2 px-3 text-slate-500 text-[11px] truncate max-w-xs">{att.notes || '-'}</td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => openCorrectAttendance(att)}
                                  title={isAr ? 'تصحيح حركة الحضور' : 'Correct'}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={workerAttPage}
                    totalPages={Math.ceil(filteredWorkerAttendances.length / ITEMS_PER_PAGE) || 1}
                    totalItems={filteredWorkerAttendances.length}
                    perPage={ITEMS_PER_PAGE}
                    onPageChange={setWorkerAttPage}
                    isAr={isAr}
                  />
                </Card>
              </div>
            )}

            {/* 5.3 PIECE WORK LOGS TAB */}
            {workerActiveSubTab === 'piece_work' && (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'الكمية المنجزة' : 'Quantity'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'سعر القطعة' : 'Unit Rate'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'إجمالي الأجر' : 'Total Amount'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pieceLogsList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            {isAr ? 'لا توجد سجلات إنتاجية بالقطعة مسجلة لهذا العامل بعد.' : 'No piece work logs for this worker.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedWorkerPieceLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {log.work_date ? log.work_date.split('T')[0] : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-900 dark:text-white">
                              {log.completed_quantity} {isAr ? 'قطعة' : 'pcs'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400">
                              {Number(log.unit_rate).toFixed(2)} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-emerald-600">
                              +{Number(log.total_amount).toFixed(2)} ج.م
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {log.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  {isAr ? 'معتمد' : 'Approved'}
                                </span>
                              ) : log.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  {isAr ? 'مسدد بالمسير' : 'Settled'}
                                </span>
                              ) : log.status === 'rejected' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <X className="w-3 h-3 text-rose-500" />
                                  {isAr ? 'مرفوض' : 'Rejected'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  {isAr ? 'قيد المراجعة' : 'Pending'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {log.status === 'pending' || log.status === 'pending_approval' || log.status === 'verified' ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await handleApproveLog(log.id);
                                      await loadWorkerDetailedData(emp.id);
                                    }}
                                    title={isAr ? 'اعتماد الإنتاجية' : 'Approve'}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenActionModal('reject_log', log.id)}
                                    title={isAr ? 'رفض السجل' : 'Reject'}
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={workerPiecePage}
                  totalPages={Math.ceil(pieceLogsList.length / ITEMS_PER_PAGE) || 1}
                  totalItems={pieceLogsList.length}
                  perPage={ITEMS_PER_PAGE}
                  onPageChange={setWorkerPiecePage}
                  isAr={isAr}
                />
              </Card>
            )}

            {/* 5.4 ADVANCES & ADJUSTMENTS TAB */}
            {workerActiveSubTab === 'advances' && (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'نوع الحركة' : 'Type'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'المبلغ الكلي' : 'Total Amount'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'نظام الأقساط' : 'Installments'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'المسدد' : 'Paid'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'الرصيد المتبقي' : 'Remaining'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'البيان والسبب' : 'Reason'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {adjustmentsList.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400">
                            {isAr ? 'لا توجد سلف أو تسويات مالية مسجلة لهذا العامل بعد.' : 'No adjustments logged for this worker.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedWorkerAdjustments.map((adj: any) => (
                          <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {(adj.effective_date || adj.adjustment_date)?.split('T')[0] || '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {adj.type === 'advance' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <DollarSign className="w-3 h-3 text-amber-600" />
                                  <span>{isAr ? 'سلفة نقدية' : 'Advance'}</span>
                                </span>
                              ) : adj.type === 'bonus' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Award className="w-3 h-3 text-emerald-600" />
                                  <span>{isAr ? 'مكافأة' : 'Bonus'}</span>
                                </span>
                              ) : adj.type === 'allowance' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                  <Sparkles className="w-3 h-3 text-sky-600" />
                                  <span>{isAr ? 'بدل' : 'Allowance'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>{isAr ? 'خصم' : 'Deduction'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-black font-mono text-slate-900 dark:text-white">
                              {Number(adj.amount).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {adj.type === 'advance' ? (
                                adj.installments_count && adj.installments_count > 1 ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                    <span>{adj.installments_count} أقساط</span>
                                    <span className="text-[10px] text-slate-400">({Number(adj.installment_amount).toLocaleString()} ج.م/ش)</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[11px]">{isAr ? 'دفعة واحدة' : 'Lump sum'}</span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                              {adj.type === 'advance' ? `${Number(adj.paid_amount || 0).toLocaleString()} ج.م` : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              {adj.type === 'advance' ? (
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                                  {Number(adj.remaining_balance ?? adj.amount).toLocaleString()} ج.م
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 text-xs truncate max-w-xs">{adj.reason}</td>
                            <td className="py-2.5 px-3 text-center">
                              {adj.status === 'pending' || adj.status === 'pending_approval' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  {isAr ? 'قيد الاعتماد' : 'Pending'}
                                </span>
                              ) : adj.status === 'approved' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  {isAr ? 'معتمد' : 'Approved'}
                                </span>
                              ) : adj.status === 'applied' || adj.status === 'settled' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Check className="w-3 h-3 text-purple-500" />
                                  {isAr ? 'تم الخصم بالمسير' : 'Settled'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <X className="w-3 h-3 text-rose-500" />
                                  {isAr ? 'مرفوض' : 'Rejected'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAdjustmentForPrint(adj);
                                    setIsPrintAdjustmentModalOpen(true);
                                  }}
                                  title={isAr ? 'طباعة سند صرف سلفة ورقي للمصنع وتوقيع العامل' : 'Print Voucher'}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                {(adj.status === 'pending' || adj.status === 'pending_approval') && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await handleApproveAdjustment(adj.id);
                                        await loadWorkerDetailedData(emp.id);
                                      }}
                                      title={isAr ? 'اعتماد الطلب' : 'Approve'}
                                      className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenActionModal('reject_adjustment', adj.id)}
                                      title={isAr ? 'رفض الطلب' : 'Reject'}
                                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={workerAdjPage}
                  totalPages={Math.ceil(adjustmentsList.length / ITEMS_PER_PAGE) || 1}
                  totalItems={adjustmentsList.length}
                  perPage={ITEMS_PER_PAGE}
                  onPageChange={setWorkerAdjPage}
                  isAr={isAr}
                />
              </Card>
            )}

            {/* 5.5 CUTTING HALL & CMT ORDERS TAB (Direct Link to Cutting Hall & CMT) */}
            {workerActiveSubTab === 'cutting' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 text-xs">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                    <Scissors className="w-4 h-4 text-indigo-600" />
                    <span>{isAr ? 'ربط العامل بصالة القص وأوامر التشغيل للغير (CMT):' : 'Cutting Hall & CMT Subcontracting Direct Links:'}</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-[11.5px]">
                    {isAr
                      ? 'يتم تتبع وربط الفني تلقائياً بكافة أوامر صالة القص عبر حزم القص المنسوبة إليه (Assigned Cutting Bundles) وكذلك الأوامر التي تم تكليفه بها في صالة القص للغير لحساب العملاء.'
                      : 'Technician is linked to all cutting orders via assigned cutting bundles and CMT production orders.'}
                  </p>
                </div>

                {cuttingOrders.length === 0 ? (
                  <Card className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Scissors className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      {isAr ? 'لم يتم ربط حزم أو أوامر قص بهذا الفني حتى الآن.' : 'No cutting orders linked to this worker yet.'}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1 max-w-md mx-auto">
                      {isAr
                        ? 'عند إسناد حزم القص في تبويب صالة القص أو عند تسجيل اسم/كود الفني في أمر القص الداخلي أو قص التشغيل للغير (CMT)، ستظهر جميع الأوامر والحزم هنا فوراً.'
                        : 'Assigning bundles in Cutting tab or noting worker code on orders will reflect here automatically.'}
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {paginatedWorkerCuttingOrders.map((order: any) => {
                      const isCmt = Boolean(order.customer_material_id || order.fabric_source === 'customer');
                      const bundlesForWorker = order.bundles?.filter((b: any) => b.assigned_employee_id === emp.id) || [];

                      return (
                        <Card key={order.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                {order.cutting_order_number}
                              </span>
                              {isCmt ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  <Scissors className="w-3.5 h-3.5 text-amber-600" />
                                  <span>{isAr ? '✂️ صالة القص للغير (تشغيل عميل CMT)' : '✂️ CMT Cutting (Customer Material)'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  <Building className="w-3.5 h-3.5 text-blue-600" />
                                  <span>{isAr ? '🏭 صالة القص الداخلية للمصنع' : '🏭 Internal Factory Cutting'}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-slate-400">{order.created_at ? order.created_at.split('T')[0] : ''}</span>
                              <Badge variant={order.status === 'completed' ? 'success' : order.status === 'in_progress' ? 'warning' : 'info'}>
                                {order.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10.5px]">{isAr ? 'الخامة / القماش' : 'Fabric / Color'}</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {order.fabric_color?.color_name || (isCmt ? order.customer_material?.material_name : 'قماش أساسي')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10.5px]">{isAr ? 'طبقات الفرش والقص' : 'Layers & Length'}</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {order.layers_count || 0} طبقة | {order.lay_length_meters || 0} متر
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10.5px]">{isAr ? 'إجمالي القطع المقصوصة' : 'Cut Pieces'}</span>
                              <span className="font-mono font-black text-emerald-600">
                                {Number(order.total_cut_pieces || order.total_expected_pieces || 0).toLocaleString()} قطعة
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[10.5px]">{isAr ? 'كفاءة الماركر / الطاولة' : 'Marker & Table'}</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {order.marker_efficiency_percent || 0}% | طاولة {order.table_number || 1}
                              </span>
                            </div>
                          </div>

                          {/* Sub-bundles assigned to this worker */}
                          {bundlesForWorker.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                {isAr ? `الحزم المسندة لهذا العامل (${bundlesForWorker.length} حزمة):` : `Assigned Bundles (${bundlesForWorker.length}):`}
                              </span>
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {bundlesForWorker.map((b: any) => (
                                  <span key={b.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    <Package className="w-3 h-3 text-slate-400" />
                                    <strong>{b.bundle_code}</strong> ({b.quantity} قطعة - {b.status})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}

                    <Pagination
                      currentPage={workerCutPage}
                      totalPages={Math.ceil(cuttingOrders.length / ITEMS_PER_PAGE) || 1}
                      totalItems={cuttingOrders.length}
                      perPage={ITEMS_PER_PAGE}
                      onPageChange={setWorkerCutPage}
                      isAr={isAr}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 5.6 PAYROLL HISTORY TAB */}
            {workerActiveSubTab === 'payroll' && (
              <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3 text-start">{isAr ? 'فترة المسير' : 'Period'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'الأجر الأساسي والإنتاج' : 'Base & Piece'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'إضافي وبدلات' : 'OT & Allowances'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'استقطاع سلف وعيوب' : 'Deductions'}</th>
                        <th className="py-2.5 px-3 text-start">{isAr ? 'صافي الراتب' : 'Net Salary'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'حالة الصرف' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-center">{isAr ? 'طباعة القسيمة' : 'Print'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payrollItemsList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400">
                            {isAr ? 'لا توجد مسيرات رواتب مسجلة لهذا العامل بعد.' : 'No payroll history for this worker.'}
                          </td>
                        </tr>
                      ) : (
                        paginatedWorkerPayrollItems.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                              {item.payroll?.payroll_period || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                              {(Number(item.base_amount || 0) + Number(item.piece_rate_earnings || 0)).toFixed(2)} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600">
                              +{(Number(item.overtime_earnings || 0) + Number(item.allowances_and_bonuses || 0)).toFixed(2)} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-mono text-rose-600">
                              -{(Number(item.advances_repaid || 0) + Number(item.defect_deductions || 0) + Number(item.general_deductions || 0)).toFixed(2)} ج.م
                            </td>
                            <td className="py-2.5 px-3 font-black font-mono text-emerald-600">
                              {Number(item.net_salary).toLocaleString()} ج.م
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={item.is_paid ? 'success' : 'warning'}>
                                {item.is_paid ? (isAr ? 'تم الصرف' : 'Paid') : (isAr ? 'معلق' : 'Unpaid')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemForIndividualPayslip(item);
                                  setIsIndividualPayslipModalOpen(true);
                                }}
                                title={isAr ? 'طباعة قسيمة الراتب الرسمية لهذا المسير' : 'Print Payslip'}
                                className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={workerPayrollPage}
                  totalPages={Math.ceil(payrollItemsList.length / ITEMS_PER_PAGE) || 1}
                  totalItems={payrollItemsList.length}
                  perPage={ITEMS_PER_PAGE}
                  onPageChange={setWorkerPayrollPage}
                  isAr={isAr}
                />
              </Card>
            )}
          </div>
        );
      })() : (
        <div className="space-y-5">
      {/* 2. Top 4 Interactive Modern KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Employees */}
        <div
          onClick={() => {
            setActiveSubTab('employees');
            setEmployeeDeptFilter('all');
            setEmployeePayTypeFilter('all');
            setEmployeeSearch('');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            activeSubTab === 'employees'
              ? 'bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border-indigo-400 dark:border-indigo-700 ring-2 ring-indigo-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'إجمالي القوى العاملة والعمال' : 'Total Workforce'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs border border-indigo-200/60 dark:border-indigo-800/40">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
            {totalEmployeesCount}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'عامل وموظف' : 'workers'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{activeEmployeesCount} {isAr ? 'على رأس العمل' : 'Active'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {totalEmployeesCount - activeEmployeesCount > 0
                ? `${totalEmployeesCount - activeEmployeesCount} ${isAr ? 'غير نشط' : 'inactive'}`
                : (isAr ? '100% جاهزية' : '100% Active')}
            </span>
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div
          onClick={() => {
            setActiveSubTab('attendance');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            activeSubTab === 'attendance'
              ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-400 dark:border-emerald-700 ring-2 ring-emerald-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'حضور اليوم والتشغيل' : "Today's Attendance"}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs border border-emerald-200/60 dark:border-emerald-800/40">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {presentCount}{' '}
            <span className="text-xs font-normal text-slate-400">/ {totalEmployeesCount || 0}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>{attendanceRate}% {isAr ? 'نسبة الحضور' : 'Rate'}</span>
              {lateCount > 0 && <span className="text-amber-600 font-normal">({lateCount} {isAr ? 'متأخر' : 'late'})</span>}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {attendances.length} {isAr ? 'حركة مسجلة' : 'records'}
            </span>
          </div>
        </div>

        {/* Card 3: Pending Adjustments */}
        <div
          onClick={() => {
            setActiveSubTab('adjustments');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            activeSubTab === 'adjustments'
              ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border-amber-400 dark:border-amber-700 ring-2 ring-amber-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'السلف والتسويات المعلقة' : 'Pending Adjustments'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs border border-amber-200/60 dark:border-amber-800/40">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {pendingAdjustmentsCount}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'طلب معلق' : 'pending'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className="text-amber-700 dark:text-amber-400 font-bold truncate">
              {totalPendingAdvancesAmount > 0
                ? `${totalPendingAdvancesAmount.toLocaleString()} ${isAr ? 'ج.م سلف معلقة' : 'EGP pending'}`
                : (isAr ? 'بانتظار موافقة الإدارة' : 'Pending Approval')}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {adjustments.length} {isAr ? 'حركة إجمالية' : 'total'}
            </span>
          </div>
        </div>

        {/* Card 4: Quality Defect Deductions */}
        <div
          onClick={() => {
            setActiveSubTab('defects');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
            activeSubTab === 'defects'
              ? 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/40 dark:to-red-950/30 border-rose-400 dark:border-rose-700 ring-2 ring-rose-400/30'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {isAr ? 'بلاغات عيوب الجودة المعلقة' : 'Quality Defect Penalties'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs border border-rose-200/60 dark:border-rose-800/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono mt-1 ${pendingDefectCount > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
            {pendingDefectCount}{' '}
            <span className="text-xs font-normal text-slate-400">{isAr ? 'بلاغ معلق' : 'pending'}</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
            <span className={`font-bold flex items-center gap-1 ${pendingDefectCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pendingDefectCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'}`} />
              <span>{pendingDefectCount > 0 ? (isAr ? 'تتطلب اعتماداً صريحاً' : 'Action Required') : (isAr ? 'لا توجد بلاغات حرجة' : 'All Clear')}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {defectAdjustments.length} {isAr ? 'بلاغ' : 'tickets'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Sub-Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('employees')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'employees'
              ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAr ? 'سجل العمال والموظفين' : 'Employees'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'employees' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {employees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('attendance')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'attendance'
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{isAr ? 'الحضور وساعات العمل' : 'Attendance & Time'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'attendance' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {attendances.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('worklogs')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'worklogs'
              ? 'bg-sky-600 text-white ring-2 ring-sky-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{isAr ? 'إنتاجية أجور القطعة' : 'Piece-Work Logs'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'worklogs' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {workLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('adjustments')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'adjustments'
              ? 'bg-amber-600 text-white ring-2 ring-amber-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{isAr ? 'السلف والمكافآت والخصومات' : 'Advances & Adjustments'}</span>
          {pendingAdjustmentsCount > 0 ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
              {pendingAdjustmentsCount}
            </span>
          ) : (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'adjustments' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {adjustments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('defects')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'defects'
              ? 'bg-rose-600 text-white ring-2 ring-rose-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{isAr ? 'تسويات عيوب الجودة' : 'Defect Deductions'}</span>
          {pendingDefectCount > 0 ? (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
              {pendingDefectCount}
            </span>
          ) : (
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'defects' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              {defectAdjustments.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('piecerates')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'piecerates'
              ? 'bg-purple-600 text-white ring-2 ring-purple-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{isAr ? 'لائحة أسعار العمليات' : 'Piece Rates'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'piecerates' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {pieceRates.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payrolls')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-xs ${
            activeSubTab === 'payrolls'
              ? 'bg-teal-600 text-white ring-2 ring-teal-500/30'
              : 'bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>{isAr ? 'مسيرات الرواتب والمستحقات' : 'Payrolls'}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${activeSubTab === 'payrolls' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
            {payrolls.length}
          </span>
        </button>
      </div>

      {/* 4. Subtab 1: Employees Register */}
      {activeSubTab === 'employees' && (
        <div className="space-y-3">
          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder={isAr ? 'بحث بالاسم، الكود، الوظيفة، أو الهاتف...' : 'Search name, code, job...'}
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full ps-9 pe-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={employeeDeptFilter}
                onChange={(e) => setEmployeeDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">{isAr ? 'كل الأقسام الإنتاجية' : 'All Departments'}</option>
                <option value="cutting">{isAr ? 'صالة القص' : 'Cutting'}</option>
                <option value="sewing">{isAr ? 'خطوط الحياكة' : 'Sewing'}</option>
                <option value="finishing">{isAr ? 'التشطيب والكي' : 'Finishing'}</option>
                <option value="quality">{isAr ? 'مراقبة الجودة' : 'Quality'}</option>
                <option value="maintenance">{isAr ? 'الصيانة والورش' : 'Maintenance'}</option>
                <option value="packaging">{isAr ? 'التعبئة والمستودع' : 'Packaging'}</option>
              </select>

              {/* Compensation Filter */}
              <select
                value={employeePayTypeFilter}
                onChange={(e) => setEmployeePayTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">{isAr ? 'كل نظم التعويض والأجر' : 'All Pay Types'}</option>
                <option value="piece_rate">{isAr ? 'أجر بالقطعة' : 'Piece Rate'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Salary'}</option>
                <option value="daily">{isAr ? 'أجر يومي' : 'Daily'}</option>
                <option value="hourly">{isAr ? 'أجر بالساعة' : 'Hourly'}</option>
                <option value="hybrid">{isAr ? 'هجين (أساسي + إنتاجية)' : 'Hybrid'}</option>
              </select>

              {(employeeSearch || employeeDeptFilter !== 'all' || employeePayTypeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setEmployeeSearch('');
                    setEmployeeDeptFilter('all');
                    setEmployeePayTypeFilter('all');
                  }}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline px-2 cursor-pointer"
                >
                  {isAr ? 'إلغاء الفلاتر' : 'Reset'}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {filteredEmployees.length} {isAr ? 'عامل معروض' : 'workers'}
              </span>
              <button
                type="button"
                onClick={() => {
                  resetEmployeeForm();
                  setIsEmployeeModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'عامل جديد' : 'New Worker'}</span>
              </button>
            </div>
          </div>

          {/* Employees Table Card */}
          <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'كود العامل' : 'Code'}</th>
                    <th className="py-3 px-4">{isAr ? 'الاسم والمهنة' : 'Worker & Job'}</th>
                    <th className="py-3 px-4">{isAr ? 'القسم والوردية' : 'Department & Shift'}</th>
                    <th className="py-3 px-4">{isAr ? 'نظام التعويض والأجر' : 'Compensation'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'تاريخ التعيين' : 'Hire Date'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات والعمليات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا يوجد عمال مسجلين يطابقون معايير البحث.' : 'No employees found.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              resetEmployeeForm();
                              setIsEmployeeModalOpen(true);
                            }}
                            className="text-xs text-indigo-600 font-bold hover:underline"
                          >
                            {isAr ? '+ إضافة عامل جديد الآن' : '+ Add worker'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Code */}
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          <span className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            {emp.employee_code}
                          </span>
                        </td>

                        {/* Name & Job Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => openWorkerFullProfile(emp)}
                              title={isAr ? 'عرض الملف الداخلي الشامل وسجل الحضور' : 'View Full Profile & Attendance'}
                              className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-950/60 dark:to-blue-900/40 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs cursor-pointer hover:scale-105 transition-transform"
                            >
                              {emp.name ? emp.name.trim().charAt(0) : 'ع'}
                            </div>
                            <div className="min-w-0">
                              <div
                                onClick={() => openWorkerFullProfile(emp)}
                                title={isAr ? 'عرض الملف الداخلي الشامل للعامل وسجل حضوره وأوامر القص' : 'View Full Profile'}
                                className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors truncate flex items-center gap-1.5"
                              >
                                <span>{emp.name}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                {emp.job_title || (isAr ? 'عامل إنتاج' : 'Operator')}
                              </div>
                              {(emp.phone || emp.national_id) && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                                  {emp.phone && <span>📞 {emp.phone}</span>}
                                  {emp.national_id && <span>🆔 {emp.national_id}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department & Shift */}
                        <td className="py-3 px-4">
                          <div>{getDepartmentBadge(emp.department)}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{isAr ? 'وردية:' : 'Shift:'} {emp.shift_name || (isAr ? 'صباحية' : 'Morning')}</span>
                          </div>
                        </td>

                        {/* Compensation Model */}
                        <td className="py-3 px-4">
                          {getPayTypeBadge(emp.pay_type, emp)}
                        </td>

                        {/* Hire Date */}
                        <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">
                          {emp.hire_date ? emp.hire_date.split('T')[0] : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                              emp.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{emp.is_active ? (isAr ? 'على رأس العمل' : 'Active') : (isAr ? 'معطل' : 'Inactive')}</span>
                          </span>
                        </td>

                        {/* Actions Icons */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 0. Full Worker Profile Internal View */}
                            <button
                              type="button"
                              onClick={() => openWorkerFullProfile(emp)}
                              title={isAr ? `الملف الداخلي الشامل وسجل الحضور والقص (${emp.name})` : 'Full Worker Profile & History'}
                              className="p-1.5 rounded-lg text-sky-600 dark:text-sky-400 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 border border-sky-200/80 dark:border-sky-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* 1. Edit & Rates */}
                            <button
                              type="button"
                              onClick={() => openEditEmployee(emp)}
                              title={isAr ? `تعديل بيانات وهيكل أجر العامل (${emp.name})` : 'Edit Worker & Rates'}
                              className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* 2. Quick Attendance Check */}
                            <button
                              type="button"
                              onClick={() => openNewAttendanceModalForWorker(emp.id)}
                              title={isAr ? `تسجيل حضور وانصراف للعامل (${emp.name})` : 'Record Attendance'}
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>

                            {/* 3. Quick Financial Advance / Bonus */}
                            <button
                              type="button"
                              onClick={() => {
                                setAdjEmployeeId(emp.id);
                                setIsAdjustmentModalOpen(true);
                              }}
                              title={isAr ? `طلب سلفة أو مكافأة للعامل (${emp.name})` : 'Add Advance / Bonus'}
                              className="p-1.5 rounded-lg text-amber-600 dark:text-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>

                            {/* 4. Log Piece-Rate Production */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedEmp(emp.id);
                                setIsLogModalOpen(true);
                              }}
                              title={isAr ? `تسجيل إنتاجية أجور قطعة للعامل (${emp.name})` : 'Log Piece Production'}
                              className="p-1.5 rounded-lg text-purple-600 dark:text-purple-400 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 border border-purple-200/80 dark:border-purple-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </button>

                            {/* 5. Delete or Archive Worker */}
                            <button
                              type="button"
                              onClick={() => handleDeleteEmployee(emp)}
                              title={isAr ? `حذف أو أرشفة العامل (${emp.name})` : 'Delete / Archive Worker'}
                              className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 transition-all cursor-pointer shadow-2xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={empPage}
              totalPages={Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE) || 1}
              totalItems={filteredEmployees.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setEmpPage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 2. ATTENDANCE & WORKING TIME VIEW */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-3">
          {/* Controls & Quick Stats */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'التاريخ:' : 'Date:'}
                </span>
                <input
                  type="date"
                  value={attendanceDateFilter}
                  onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                />
              </div>

              {/* Quick Date Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setAttendanceDateFilter(new Date().toISOString().split('T')[0])}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    attendanceDateFilter === new Date().toISOString().split('T')[0]
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isAr ? 'اليوم' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setAttendanceDateFilter(d.toISOString().split('T')[0]);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-all cursor-pointer"
                >
                  {isAr ? 'أمس' : 'Yesterday'}
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceDateFilter('all')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    attendanceDateFilter === 'all'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isAr ? 'كل التواريخ' : 'All Dates'}
                </button>
              </div>

              {/* Summary pills */}
              <div className="hidden lg:flex items-center gap-2 ms-2 ps-2 border-s border-slate-200 dark:border-slate-800 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {attendances.filter((a) => a.status === 'present').length} {isAr ? 'حاضر' : 'Present'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-800/40">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {attendances.filter((a) => a.status === 'late').length} {isAr ? 'متأخر' : 'Late'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold border border-purple-200/60 dark:border-purple-800/40">
                  <Zap className="w-3 h-3 text-purple-500" />
                  {attendances.reduce((acc, a) => acc + Number(a.overtime_hours || 0), 0).toFixed(1)} {isAr ? 'س أوفرتايم' : 'hrs OT'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openNewAttendanceModalForWorker()}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-xs transition-all cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>{isAr ? '+ تسجيل حركة حضور' : '+ Record Attendance'}</span>
            </button>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'كود العامل' : 'Code'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'العامل والوردية' : 'Worker & Shift'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الدخول' : 'Check In'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الخروج' : 'Check Out'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'ساعات العمل' : 'Total Hours'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الأوفرتايم' : 'Overtime'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'مستحق الأجر' : 'Payable'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {attendances.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا توجد حركات حضور مسجلة لهذا التاريخ.' : 'No attendance recorded for this date.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => openNewAttendanceModalForWorker()}
                            className="text-xs text-emerald-600 font-bold hover:underline"
                          >
                            {isAr ? '+ تسجيل أول حركة حضور اليوم' : '+ Record first attendance'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAttendances.map((att) => {
                      const emp = employees.find((e) => e.id === att.employee_id) || att.employee;
                      return (
                        <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400 font-semibold text-xs whitespace-nowrap">
                            {(att.attendance_date || '').split('T')[0]}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            <span className="bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              {emp?.employee_code || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {emp?.name ? emp.name.trim().charAt(0) : 'ع'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {emp?.name || att.employee_id}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {emp?.job_title || (isAr ? 'عامل إنتاج' : 'Worker')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
                              <Clock className="w-3 h-3 text-emerald-500" />
                              {att.check_in || '--:--'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-xs font-semibold border border-slate-200 dark:border-slate-700">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {att.check_out || '--:--'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {Number(att.total_hours ?? (att as any).working_hours ?? 0).toFixed(1)} {isAr ? 'ساعة' : 'hrs'}
                          </td>
                          <td className="py-3 px-4">
                            {Number(att.overtime_hours) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold border border-amber-200 dark:border-amber-800/50">
                                <Zap className="w-3 h-3 text-amber-500" />
                                +{Number(att.overtime_hours).toFixed(1)} {isAr ? 'س' : 'h'}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {att.status === 'present' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {isAr ? 'حاضر' : 'Present'}
                              </span>
                            ) : att.status === 'late' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {isAr ? 'متأخر' : 'Late'}
                              </span>
                            ) : att.status === 'leave' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                                {isAr ? 'إجازة' : 'Leave'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                {isAr ? 'غائب' : 'Absent'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${
                                att.is_payable
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {att.is_payable ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {att.is_payable ? (isAr ? 'مستحق للأجر' : 'Payable') : (isAr ? 'غير مدفوع' : 'Unpaid')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openCorrectAttendance(att)}
                                title={isAr ? 'تصحيح معتمد لساعات الحضور' : 'Correct Attendance'}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
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
            <Pagination
              currentPage={attPage}
              totalPages={Math.ceil(attendances.length / ITEMS_PER_PAGE) || 1}
              totalItems={attendances.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setAttPage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 3. WORK LOGS VIEW */}
      {activeSubTab === 'worklogs' && (
        <div className="space-y-3">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-sky-500" />
                {isAr ? 'سجلات إنتاجية أجور القطعة اليومية للعمال' : 'Daily Piece-Rate Production Logbook'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'يتم احتساب المستحقات ودمجها بمسير الرواتب تلقائياً بعد الاعتماد الفني' : 'Approved output is integrated directly into certified payroll'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLogModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? '+ تسجيل إنتاجية جديد' : '+ New Output Log'}</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'اسم العامل والكود' : 'Worker'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الكمية المنجزة' : 'Quantity'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'فئة أجر القطعة' : 'Unit Rate'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'إجمالي المستحق' : 'Total Amount'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {workLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Scissors className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا توجد سجلات إنتاجية مسجلة بعد.' : 'No piece-work records logged.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsLogModalOpen(true)}
                            className="text-xs text-sky-600 font-bold hover:underline"
                          >
                            {isAr ? '+ تسجيل أول عملية إنتاجية' : '+ Log first production output'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkLogs.map((log) => {
                      const emp = employees.find((e) => e.id === log.employee_id) || log.employee;
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                            {log.work_date ? log.work_date.split('T')[0] : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {emp?.name ? emp.name.trim().charAt(0) : 'ع'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {emp?.name || log.employee_id}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {emp?.employee_code || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                              <Package className="w-3 h-3 text-slate-400" />
                              {log.completed_quantity} {isAr ? 'قطعة' : 'pcs'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {Number(log.unit_rate).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {Number(log.total_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {log.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {isAr ? 'معتمد' : 'Approved'}
                              </span>
                            ) : log.status === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {isAr ? 'مسدد بالمسير' : 'Settled'}
                              </span>
                            ) : log.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <X className="w-3 h-3 text-rose-500" />
                                {isAr ? 'مرفوض' : 'Rejected'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {isAr ? 'قيد المراجعة' : 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {log.status === 'pending' || log.status === 'pending_approval' || log.status === 'verified' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveLog(log.id)}
                                    title={isAr ? 'اعتماد الإنتاجية' : 'Approve Output'}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenActionModal('reject_log', log.id)}
                                    title={isAr ? 'رفض السجل' : 'Reject'}
                                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <span className="text-slate-400 font-mono text-[11px]">-</span>
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
            <Pagination
              currentPage={logPage}
              totalPages={Math.ceil(workLogs.length / ITEMS_PER_PAGE) || 1}
              totalItems={workLogs.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setLogPage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 4. ADJUSTMENTS VIEW (Advances / Bonuses / Deductions) */}
      {activeSubTab === 'adjustments' && (
        <div className="space-y-3">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-500" />
                {isAr ? 'سجل السلف والمكافآت والبدلات والخصومات المالية' : 'Financial Adjustments, Advances & Bonuses'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'تُخصم السلف وتُضاف البدلات في مسير الرواتب تلقائياً بعد الاعتماد الصريح' : 'Approved advances and allowances flow directly into payroll engine'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsAdjustmentModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-xs transition-all cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>{isAr ? '+ طلب سلفة / تسوية جديدة' : '+ New Adjustment'}</span>
            </button>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'العامل والكود' : 'Worker'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'نوع الحركة' : 'Type'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'المبلغ الكلي' : 'Total Amount'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'نظام الأقساط' : 'Installments'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'المسدد' : 'Paid'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الرصيد المتبقي' : 'Remaining'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'البيان والسبب' : 'Reason'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <DollarSign className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا توجد سلف أو تسويات مالية مسجلة.' : 'No financial adjustments found.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAdjustmentModalOpen(true)}
                            className="text-xs text-amber-600 font-bold hover:underline"
                          >
                            {isAr ? '+ تسجيل أول سلفة أو مكافأة' : '+ Register first adjustment'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAdjustments.map((adj) => {
                      const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
                      return (
                        <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                            {adj.effective_date}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {emp?.name ? emp.name.trim().charAt(0) : 'ع'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {emp?.name || adj.employee_id}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {emp?.employee_code || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {adj.type === 'advance' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
                                <DollarSign className="w-3 h-3 text-amber-600" />
                                <span>{isAr ? 'سلفة نقدية' : 'Advance'}</span>
                              </span>
                            ) : adj.type === 'bonus' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                                <Award className="w-3 h-3 text-emerald-600" />
                                <span>{isAr ? 'مكافأة' : 'Bonus'}</span>
                              </span>
                            ) : adj.type === 'allowance' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
                                <Sparkles className="w-3 h-3 text-sky-600" />
                                <span>{isAr ? 'بدل انتقال/وجبة' : 'Allowance'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>{isAr ? 'خصم إداري' : 'Deduction'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-black font-mono text-slate-900 dark:text-white">
                            {Number(adj.amount).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                            {adj.type === 'advance' ? (
                              adj.installments_count && adj.installments_count > 1 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                  <span>{adj.installments_count} أقساط</span>
                                  <span className="text-[10px] text-slate-400">({Number(adj.installment_amount).toLocaleString()} ج.م/ش)</span>
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">{isAr ? 'دفعة واحدة' : 'Lump sum'}</span>
                              )
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            {adj.type === 'advance' ? `${Number(adj.paid_amount || 0).toLocaleString()} ج.م` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {adj.type === 'advance' ? (
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800">
                                {Number(adj.remaining_balance ?? adj.amount).toLocaleString()} ج.م
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate" title={adj.reason}>
                            {adj.reason}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {adj.status === 'pending' || adj.status === 'pending_approval' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                                <Clock className="w-3 h-3 text-amber-500" />
                                {isAr ? 'قيد الاعتماد' : 'Pending'}
                              </span>
                            ) : adj.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                {isAr ? 'معتمد' : 'Approved'}
                              </span>
                            ) : adj.status === 'applied' || adj.status === 'settled' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {isAr ? 'تم الخصم بالمسير' : 'Settled'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {isAr ? 'مرفوض' : 'Rejected'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Print Official Advance Voucher */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAdjustmentForPrint(adj);
                                  setIsPrintAdjustmentModalOpen(true);
                                }}
                                title={isAr ? 'طباعة سند صرف سلفة ورقي للمصنع وتوقيع العامل' : 'Print Advance Voucher'}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {adj.status === 'pending' || adj.status === 'pending_approval' ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAdjustment(adj.id)}
                                    title={isAr ? 'اعتماد الطلب' : 'Approve'}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenActionModal('reject_adjustment', adj.id)}
                                    title={isAr ? 'رفض الطلب' : 'Reject'}
                                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={adjPage}
              totalPages={Math.ceil(adjustments.length / ITEMS_PER_PAGE) || 1}
              totalItems={adjustments.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setAdjPage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 5. QUALITY DEFECT DEDUCTIONS VIEW (Phase 09B) */}
      {activeSubTab === 'defects' && (
        <div className="space-y-3">
          {/* Header Card with Policy Alert */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                {isAr ? 'تسويات عيوب الجودة والخصومات المعتمدة' : 'Quality Defect Penalties & Settlement'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr
                  ? 'حماية العمال: لا ينفذ الخصم في المسير إلا بعد موافقة صريحة من إدارة الإنتاج، مع إمكانية الاعتراض والإلغاء التعويضي'
                  : 'Zero automatic deduction policy. Explicit approval, objections & reversals supported.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDefectModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-xs transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{isAr ? '+ بلاغ عيب جودة جديد' : '+ Report Defect'}</span>
            </button>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'التاريخ' : 'Date'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'العامل المتسبب' : 'Worker'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'أمر التشغيل' : 'Order'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الخصم المقترح' : 'Penalty'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'السبب والتحقيق' : 'Reason'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {defectAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                          <span className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                            {isAr ? 'ممتاز! لا توجد بلاغات عيوب جودة أو خصومات معلقة.' : 'All clear! No defect adjustments found.'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {isAr ? 'خطوط الإنتاج تعمل بجودة مطابقة للمواصفات القياسية' : 'Production lines operating within target quality standards'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedDefects.map((adj) => {
                      const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
                      return (
                        <tr key={adj.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-500 text-xs">
                            {adj.created_at ? adj.created_at.split('T')[0] : '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {emp?.name ? emp.name.trim().charAt(0) : 'ع'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 dark:text-white truncate">
                                  {emp?.name || adj.employee_id}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {emp?.employee_code || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                              {adj.production_order_id || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-black font-mono text-rose-600 dark:text-rose-400">
                            {Number(adj.proposed_penalty_amount).toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs">
                            <p className="font-medium text-slate-900 dark:text-white truncate">{adj.adjustment_reason}</p>
                            {adj.worker_objection_notes && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 truncate bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200/50">
                                {isAr ? 'اعتراض العامل:' : 'Objection:'} {adj.worker_objection_notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {adj.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {adj.status === 'pending_approval' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveDefect(adj.id)}
                                    title={isAr ? 'اعتماد الخصم' : 'Approve Penalty'}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenActionModal('reject_defect', adj.id, adj)}
                                    title={isAr ? 'رفض الخصم' : 'Reject'}
                                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedAdjustment(adj);
                                      setObjectionNotes('');
                                      setIsObjectionModalOpen(true);
                                    }}
                                    title={isAr ? 'تسجيل اعتراض العامل' : 'Record Objection'}
                                    className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-transparent hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {(adj.status === 'settled' || adj.status === 'approved') && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenActionModal('reverse_defect', adj.id, adj)}
                                  title={isAr ? 'إلغاء تعويضي وإعادة المبلغ' : 'Reverse Settlement'}
                                  className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all cursor-pointer shadow-2xs"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
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
            <Pagination
              currentPage={defectPage}
              totalPages={Math.ceil(defectAdjustments.length / ITEMS_PER_PAGE) || 1}
              totalItems={defectAdjustments.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setDefectPage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 6. PIECE RATES CATALOGUE VIEW */}
      {activeSubTab === 'piecerates' && (
        <div className="space-y-3">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-500" />
                {isAr ? 'لائحة أسعار العمليات الفنية للأجر بالقطعة' : 'Standard Piece-Rate Catalogue'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isAr ? 'التسعيرة القياسية المعتمدة لحساب مستحقات عمال الإنتاج والتشطيب' : 'Standard benchmark piece rates across factory production stages'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsRateModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? '+ إضافة تسعيرة جديدة' : '+ New Piece Rate'}</span>
            </button>
          </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'المرحلة الإنتاجية' : 'Stage'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الموديل / قصة المنتج' : 'Garment Model'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'اسم العملية الفنية' : 'Operation Name'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'أجر القطعة القياسي' : 'Standard Rate / Piece'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pieceRates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Award className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا توجد تسعيرات عمليات مضافة.' : 'No piece rates configured.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsRateModalOpen(true)}
                            className="text-xs text-purple-600 font-bold hover:underline"
                          >
                            {isAr ? '+ إضافة تسعيرة عملية جديدة' : '+ Add piece rate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPieceRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs">
                            <Scissors className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{rate.stage_name}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {rate.garment_model ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              <Tag className="w-3 h-3 text-purple-500" />
                              <span>{rate.garment_model.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                              {isAr ? 'عام لكافة الموديلات' : 'Generic'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {rate.operation_name}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                            {Number(rate.rate_per_piece).toFixed(2)} {isAr ? 'ج.م / قطعة' : 'EGP / pc'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                              rate.is_active
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${rate.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {rate.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={ratePage}
              totalPages={Math.ceil(pieceRates.length / ITEMS_PER_PAGE) || 1}
              totalItems={pieceRates.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setRatePage}
              isAr={isAr}
            />
          </Card>
        </div>
      )}

      {/* 7. PAYROLLS VIEW (Complete Lifecycle & Immutability) */}
      {activeSubTab === 'payrolls' && (() => {
        const payrollTotalGross = payrolls.reduce((sum, p) => sum + (Number(p.total_gross) || 0), 0);
        const payrollTotalDeductions = payrolls.reduce((sum, p) => sum + (Number(p.total_deductions) || 0), 0);
        const payrollTotalNet = payrolls.reduce((sum, p) => sum + (Number(p.total_net) || 0), 0);
        const payrollTotalPaid = payrolls.reduce((sum, p) => sum + (Number(p.total_paid) || 0), 0);
        const payrollTotalRemaining = payrolls.reduce((sum, p) => {
          const bal = p.remaining_balance !== undefined ? Number(p.remaining_balance) : Number(p.total_net) - (Number(p.total_paid) || 0);
          return sum + (bal > 0 ? bal : 0);
        }, 0);

        return (
          <div className="space-y-3">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-teal-500" />
                  {isAr ? 'مسيرات الرواتب الدفترية ومستحقات العمال' : 'Certified Payroll Runs & Factory Settlements'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isAr
                    ? 'دورة الاعتماد: مسودة -> اعتماد -> إقفال نهائي محصن -> صرف دفعات جزئية أو كاملة'
                    : 'Lifecycle: Draft -> Approved -> Finalized (Immutable) -> Partial / Full Payments'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportPayrollsToCsv}
                  disabled={payrolls.length === 0}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  title={isAr ? 'تصدير جدول المسيرات إلى ملف إكسل CSV' : 'Export Payrolls to CSV'}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>{isAr ? 'تصدير إكسل' : 'Excel CSV'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPayrollModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-xs transition-all cursor-pointer"
                >
                  <Calculator className="w-4 h-4" />
                  <span>{isAr ? '+ توليد مسير جديد' : '+ Generate Payroll'}</span>
                </button>
              </div>
            </div>

            {/* Factory Grand Total Summary Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  {isAr ? 'إجمالي الاستحقاق الشامل (Gross)' : 'Factory Gross Total'}
                </span>
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {payrollTotalGross.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isAr ? 'شامل الأجور الثابتة والإنتاجية' : 'Fixed wages + piece output'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/60 dark:border-amber-900/40 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-0.5">
                  {isAr ? 'إجمالي الاستقطاعات والسلف' : 'Deductions & Advances'}
                </span>
                <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">
                  {payrollTotalDeductions.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isAr ? 'سلف مستردة وخصومات جودة' : 'Recovered advances & defect cuts'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/60 dark:border-emerald-900/40 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                  {isAr ? 'صافي أجور العمال (Net Outflow)' : 'Net Factory Payroll'}
                </span>
                <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {payrollTotalNet.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isAr ? 'صافي مستحق الصرف للخزينة' : 'Total net payable from treasury'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/30 dark:from-sky-950/20 dark:to-blue-950/20 border border-sky-200/60 dark:border-sky-900/40 shadow-2xs">
                <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 block mb-0.5">
                  {isAr ? 'المصروف فعلياً / المتبقي' : 'Paid / Outstanding'}
                </span>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                    {payrollTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400">/</span>
                  <span className={`text-xs font-bold ${payrollTotalRemaining <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {payrollTotalRemaining <= 0 ? (isAr ? 'خالص' : 'Settled') : `${payrollTotalRemaining.toLocaleString()} ${isAr ? 'متبقي' : 'rem'}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  {isAr ? 'سندات الصرف المسجلة بالخزينة' : 'Verified disbursement vouchers'}
                </span>
              </div>
            </div>

          {/* Table */}
          <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4 text-start">{isAr ? 'كود الفترة' : 'Period'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'النطاق الزمني' : 'Dates'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'إجمالي المستحق' : 'Gross'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الاستقطاعات' : 'Deductions'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'الصافي' : 'Net'}</th>
                    <th className="py-3 px-4 text-start">{isAr ? 'المدفوع / المتبقي' : 'Paid / Balance'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {payrolls.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Calculator className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          <span className="font-semibold text-xs">
                            {isAr ? 'لا توجد مسيرات رواتب مصدرة بعد.' : 'No payroll runs generated.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsPayrollModalOpen(true)}
                            className="text-xs text-teal-600 font-bold hover:underline"
                          >
                            {isAr ? '+ توليد أول مسير رواتب' : '+ Generate first payroll'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayrolls.map((p) => {
                      const balance = p.remaining_balance !== undefined ? Number(p.remaining_balance) : Number(p.total_net) - (Number(p.total_paid) || 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                              {p.payroll_period}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                            {p.period_start} <span className="text-slate-400">→</span> {p.period_end}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-mono">
                            {Number(p.total_gross).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 text-amber-600 dark:text-amber-400 font-bold font-mono">
                            {Number(p.total_deductions).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4 font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {Number(p.total_net).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-mono text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {Number(p.total_paid || 0).toLocaleString()}
                              </span>
                              <span className="text-slate-400 mx-1">/</span>
                              <span className={balance <= 0 ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-bold'}>
                                {balance <= 0 ? (isAr ? 'خالص' : 'Settled') : `${balance.toLocaleString()} ${isAr ? 'متبقي' : 'rem'}`}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {p.status?.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => openPayrollDetails(p)}
                                title={isAr ? 'عرض تفاصيل الأجور لكل عامل' : 'View Worker Breakdown'}
                                className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Lifecycle: Approve / Reject (draft) */}
                              {p.status === 'draft' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayroll(p.id)}
                                    title={isAr ? 'اعتماد المسير' : 'Approve'}
                                    className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenActionModal('reject_payroll', p.id)}
                                    title={isAr ? 'رفض المسير' : 'Reject'}
                                    className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Lifecycle: Finalize (if approved) */}
                              {p.status === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleFinalizePayroll(p.id)}
                                  title={isAr ? 'إقفال نهائي وتحصين تاريخي ضد أي تعديل' : 'Finalize & Lock'}
                                  className="p-1.5 rounded-lg text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Lifecycle: Record Payment */}
                              {(p.status === 'approved' || p.status === 'finalized' || p.status === 'partially_paid') && balance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPaymentModal(p)}
                                  title={isAr ? 'صرف دفعة أو سداد كامل' : 'Record Pay'}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all cursor-pointer shadow-2xs"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Print Slip */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPayrollForView(p);
                                  setIsPrintSlipModalOpen(true);
                                }}
                                title={isAr ? 'طباعة كشف ومفردات المرتب' : 'Print Slip'}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Recalculate Payroll */}
                              {p.status !== 'finalized' && p.status !== 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => handleRecalculatePayroll(p.id)}
                                  title={isAr ? 'إعادة احتساب وتحديث المسير بخصم السلف المعتمدة' : 'Recalculate Payroll'}
                                  className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer shadow-2xs"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Draft Payroll */}
                              {p.status === 'draft' && (
                                <button
                                  type="button"
                                  onClick={() => handleDeletePayroll(p.id)}
                                  title={isAr ? 'حذف مسير المسودة وفك السلف' : 'Delete Draft'}
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800 transition-all cursor-pointer shadow-2xs"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
            <Pagination
              currentPage={payrollPage}
              totalPages={Math.ceil(payrolls.length / ITEMS_PER_PAGE) || 1}
              totalItems={payrolls.length}
              perPage={ITEMS_PER_PAGE}
              onPageChange={setPayrollPage}
              isAr={isAr}
            />
          </Card>
        </div>
      );
    })()}
        </div>
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
                <option value="weekly">{isAr ? 'أجر أسبوعي (حسب أسابيع العمل)' : 'Weekly Wage'}</option>
                <option value="shift_based">{isAr ? 'أجر بالوردية (حسب الورديات المنجزة)' : 'Shift Based'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Monthly Salary'}</option>
                <option value="hybrid">{isAr ? 'هجين (راتب أساسي ثابت + إنتاجية قطعة)' : 'Hybrid (Base + Piece Rate)'}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر الأسبوع (ج.م/أسبوع)' : 'Weekly Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={empWeeklyRate}
                  onChange={(e) => setEmpWeeklyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر الوردية (ج.م/وردية)' : 'Shift Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={empShiftRate}
                  onChange={(e) => setEmpShiftRate(Number(e.target.value))}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}
              </label>
              <input
                type="tel"
                placeholder={isAr ? '01xxxxxxxxx' : '01xxxxxxxxx'}
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الرقم القومي (14 رقم)' : 'National ID'}
              </label>
              <input
                type="text"
                maxLength={14}
                placeholder="2xxxxxxxxxxxxx"
                value={empNationalId}
                onChange={(e) => setEmpNationalId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
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
                <option value="weekly">{isAr ? 'أجر أسبوعي' : 'Weekly'}</option>
                <option value="shift_based">{isAr ? 'أجر بالوردية' : 'Shift Based'}</option>
                <option value="fixed_salary">{isAr ? 'راتب شهري ثابت' : 'Fixed Monthly Salary'}</option>
                <option value="hybrid">{isAr ? 'هجين (أساسي + إنتاجية)' : 'Hybrid'}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر الأسبوع' : 'Weekly Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={empWeeklyRate}
                  onChange={(e) => setEmpWeeklyRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'أجر الوردية' : 'Shift Rate'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={empShiftRate}
                  onChange={(e) => setEmpShiftRate(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رقم الهاتف / الواتساب' : 'Phone / WhatsApp'}
              </label>
              <input
                type="tel"
                placeholder="01xxxxxxxxx"
                value={empPhone}
                onChange={(e) => setEmpPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الرقم القومي (14 رقم)' : 'National ID'}
              </label>
              <input
                type="text"
                maxLength={14}
                placeholder="2xxxxxxxxxxxxx"
                value={empNationalId}
                onChange={(e) => setEmpNationalId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'الوردية' : 'Shift'}
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
              value={attEmployeeId || (employees[0]?.id ?? '')}
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
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'وقت الدخول' : 'Check In Time'}
                  </label>
                  <input
                    type="time"
                    value={attCheckIn}
                    onChange={(e) => {
                      setAttCheckIn(e.target.value);
                      calculateHoursFromTimes(e.target.value, attCheckOut);
                    }}
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
                    onChange={(e) => {
                      setAttCheckOut(e.target.value);
                      calculateHoursFromTimes(attCheckIn, e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Working Hours & Overtime Controls */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? 'احتساب ساعات العمل والـ Overtime' : 'Hours & Overtime Calculation'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => calculateHoursFromTimes(attCheckIn, attCheckOut)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isAr ? 'إعادة احتساب تلقائي' : 'Recalculate'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {isAr ? 'ساعات العمل الأساسية' : 'Base Hours'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={attWorkingHours}
                        onChange={(e) => setAttWorkingHours(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      {isAr ? '⚡ إضافي (أوفرتايم)' : '⚡ Overtime'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={attOvertimeHours}
                        onChange={(e) => setAttOvertimeHours(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-600 dark:text-emerald-400"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-emerald-500 font-bold">س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {isAr ? '⏱ تأخير بالدقائق' : '⏱ Late Minutes'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="600"
                        value={attLateMinutes}
                        onChange={(e) => setAttLateMinutes(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-600 dark:text-amber-400"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-amber-500 font-bold">د</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'ملاحظات الحركة (اختياري)' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={isAr ? 'أي ملاحظات تشغيلية أو إدارية...' : 'Optional notes...'}
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </>
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
        title={isAr ? 'تصحيح حركة حضور مسجلة (تدقيق وتعديل ساعات وأوفرتايم)' : 'Correct Attendance Record'}
      >
        <form onSubmit={handleCorrectAttendance} className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-800 dark:text-amber-200">
            {isAr
              ? 'تتطلب معايير التدقيق المالي توثيق سبب التصحيح، ويسجل في السجل الدائم اسم المشرف وتاريخ التصحيح وساعات العمل والأوفرتايم المعدلة.'
              : 'Audit integrity: Correction reason is mandatory and permanently logged.'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حالة الحضور المعدلة *' : 'Corrected Status *'}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'استحقاق الأجر *' : 'Payable *'}
              </label>
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="attEditIsPayable"
                  checked={attIsPayable}
                  onChange={(e) => setAttIsPayable(e.target.checked)}
                  className="rounded border-slate-300 text-primary"
                />
                <label htmlFor="attEditIsPayable" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'يوم مستحق للأجر' : 'Payable'}
                </label>
              </div>
            </div>
          </div>

          {attStatus !== 'absent' && attStatus !== 'leave' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'وقت الدخول المعدل' : 'Corrected Check In'}
                  </label>
                  <input
                    type="time"
                    value={attCheckIn}
                    onChange={(e) => {
                      setAttCheckIn(e.target.value);
                      calculateHoursFromTimes(e.target.value, attCheckOut);
                    }}
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
                    onChange={(e) => {
                      setAttCheckOut(e.target.value);
                      calculateHoursFromTimes(attCheckIn, e.target.value);
                    }}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Working Hours, Overtime, Late Inputs */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span>{isAr ? 'تعديل الساعات والأوفرتايم والتأخير' : 'Adjust Hours & Overtime'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => calculateHoursFromTimes(attCheckIn, attCheckOut)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {isAr ? 'إعادة احتساب من الوقت' : 'Recalculate'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {isAr ? 'ساعات العمل الأساسية' : 'Base Hours'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={attWorkingHours}
                        onChange={(e) => setAttWorkingHours(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-slate-400 font-bold">س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      {isAr ? '⚡ إضافي (أوفرتايم)' : '⚡ Overtime'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="24"
                        value={attOvertimeHours}
                        onChange={(e) => setAttOvertimeHours(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-600 dark:text-emerald-400"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-emerald-500 font-bold">س</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
                      {isAr ? '⏱ تأخير بالدقائق' : '⏱ Late Minutes'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="600"
                        value={attLateMinutes}
                        onChange={(e) => setAttLateMinutes(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-600 dark:text-amber-400"
                      />
                      <span className="absolute left-2 top-2 text-[10px] text-amber-500 font-bold">د</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سبب التصحيح الدفترى (إلزامي للتدقيق) *' : 'Correction Reason (Mandatory) *'}
            </label>
            <textarea
              required
              rows={2}
              placeholder={isAr ? 'مثال: نسيان تسجيل الخروج بسبب عطل بصمة، إذن عمل خارجي، تصحيح أوفرتايم...' : 'Reason for correction...'}
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
              value={adjEmployeeId || (employees[0]?.id ?? '')}
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
                min="0.01"
                step="any"
                required
                value={adjAmount}
                onChange={(e) => setAdjAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
              </input>
            </div>
          </div>

          {adjType === 'advance' && (
            <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isAr ? 'عدد الأقساط الشهرية للسداد *' : 'Installments Count *'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    required
                    value={adjInstallments}
                    onChange={(e) => setAdjInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 block">
                    {isAr ? 'اختر 1 لخصمها كاملة، أو أكثر لتقسيطها شهرياً' : '1 for lump-sum or multiple for monthly installments'}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                    {isAr ? 'قيمة القسط الشهري المستقطع' : 'Monthly Installment'}
                  </label>
                  <div className="px-3 py-2 text-sm bg-amber-100/60 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-900 dark:text-amber-200 font-mono font-black">
                    {(Number(adjAmount) / Math.max(1, adjInstallments)).toFixed(2)} {isAr ? 'ج.م / شهر' : 'EGP/mo'}
                  </div>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 block">
                    {isAr ? 'تخصم تلقائياً وتتبع الرصيد المتبقي' : 'Auto-deducted with balance tracking'}
                  </span>
                </div>
              </div>
            </div>
          )}

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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedItemForIndividualPayslip(item);
                          setIsIndividualPayslipModalOpen(true);
                        }}
                        title={isAr ? `طباعة مفردات وقسيمة راتب العامل (${item.employee?.name}) شاملة تفاصيل السلف` : 'Print Worker Payslip'}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-all cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{isAr ? 'طباعة القسيمة' : 'Print Payslip'}</span>
                      </button>
                      <Badge variant={item.is_paid ? 'success' : 'warning'}>
                        {item.is_paid ? (isAr ? 'تم الصرف' : 'Paid') : (isAr ? 'معلق للصرف' : 'Unpaid')}
                      </Badge>
                    </div>
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

                  {/* تفاصيل السلف النقدية المنصرفة والمستقطعة من مسير الراتب */}
                  {(Number(item.advances_repaid) > 0 || (breakdown?.advances_list && breakdown.advances_list.length > 0)) && (
                    <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-800 dark:text-amber-300">
                        <span className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isAr ? 'السلف النقدية المنصرفة والمستقطعة من الراتب:' : 'Advances Deducted:'}</span>
                        </span>
                        <span className="font-mono font-bold text-rose-600">
                          -{Number(item.advances_repaid || 0).toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                        </span>
                      </div>
                      {breakdown?.advances_list && breakdown.advances_list.length > 0 ? (
                        <div className="space-y-1.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 text-slate-700 dark:text-slate-300">
                          {breakdown.advances_list.map((adv: any, aIdx: number) => (
                            <div key={adv.id || aIdx} className="flex justify-between items-center text-[10.5px]">
                              <div>
                                <span className="font-semibold">• سلفة نقدية ({adv.reason})</span>
                                {adv.installments_count && adv.installments_count > 1 ? (
                                  <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 block ps-2">
                                    (نظام تقسيط: {adv.installments_count} أشهر | الرصيد المتبقي بعد هذا المسير: {Number(adv.remaining_after ?? 0).toLocaleString()} ج.م)
                                  </span>
                                ) : (
                                  adv.remaining_after !== undefined && (
                                    <span className="text-[9.5px] text-slate-500 block ps-2">
                                      (الرصيد المتبقي: {Number(adv.remaining_after).toLocaleString()} ج.م)
                                    </span>
                                  )
                                )}
                              </div>
                              <strong className="font-mono text-rose-600">-{Number(adv.deducted_amount ?? adv.amount).toLocaleString()} ج.م</strong>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

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

          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {selectedPayrollForView?.status !== 'finalized' && selectedPayrollForView?.status !== 'paid' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => selectedPayrollForView && handleRecalculatePayroll(selectedPayrollForView.id)}
                  title={isAr ? 'إعادة احتساب وتحديث المسير بخصم السلف وحركات الإنتاج الجديدة' : 'Recalculate and update payroll'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isAr ? 'إعادة احتساب وتحديث المسير' : 'Recalculate Payroll'}</span>
                </button>
              )}

              {selectedPayrollForView?.status === 'draft' && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => selectedPayrollForView && handleDeletePayroll(selectedPayrollForView.id)}
                  title={isAr ? 'حذف مسير المسودة وفك السلف المرتبطة' : 'Delete draft payroll'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حذف المسير' : 'Delete Draft'}</span>
                </button>
              )}
            </div>

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

      {/* 8B. Individual Worker Official Printable Payslip Modal */}
      <Modal
        isOpen={isIndividualPayslipModalOpen}
        onClose={() => setIsIndividualPayslipModalOpen(false)}
        title={isAr ? `مفردات وقسيمة راتب العامل: ${selectedItemForIndividualPayslip?.employee?.name || ''}` : `Individual Worker Payslip: ${selectedItemForIndividualPayslip?.employee?.name || ''}`}
        maxWidth="xl"
      >
        {selectedItemForIndividualPayslip && (() => {
          const item = selectedItemForIndividualPayslip;
          const emp = item.employee;
          const breakdown = item.calculation_breakdown;
          const advancesList: any[] = breakdown?.advances_list || [];

          return (
            <div className="space-y-4">
              <div
                id="printable-worker-payslip"
                className="p-5 border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-950 text-slate-900 dark:text-white space-y-4 shadow-sm"
              >
                {/* Official Header */}
                <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white">GARMENTOS CLOUD ERP</h2>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {isAr ? 'قسيمة ومفردات راتب العامل الرسمية (إشعار صرف معتمد)' : 'Official Worker Payslip & Wage Statement'}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {isAr ? 'فترة المسير:' : 'Period:'} {selectedPayrollForView?.payroll_period}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      {isAr ? 'تاريخ الطباعة:' : 'Date:'} {new Date().toLocaleDateString('ar-EG')}
                    </p>
                  </div>
                </div>

                {/* Worker Bio Information Card */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'كود العامل' : 'Employee Code'}</span>
                    <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-xs">{emp?.employee_code}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'اسم العامل' : 'Full Name'}</span>
                    <strong className="text-slate-900 dark:text-white text-xs">{emp?.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'القسم والوظيفة' : 'Dept / Job'}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{emp?.department} - {emp?.job_title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'نظام الأجر' : 'Wage System'}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">{emp?.pay_type}</span>
                  </div>
                  {emp?.phone && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{emp.phone}</span>
                    </div>
                  )}
                  {emp?.national_id && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">{isAr ? 'الرقم القومي' : 'National ID'}</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 text-xs">{emp.national_id}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'أيام العمل المسجلة' : 'Payable Days'}</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">{breakdown?.payable_days ?? '-'} يوم</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{isAr ? 'ساعات العمل / إضافي' : 'Hours / OT'}</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">{breakdown?.working_hours ?? 0} س | +{breakdown?.overtime_hours ?? 0} إضافي</span>
                  </div>
                </div>

                {/* Financial Breakdown Table: Gross vs Deductions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Left Column: الاستحقاقات (Gross Earnings) */}
                  <div className="border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl overflow-hidden">
                    <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold border-b border-emerald-200/80 dark:border-emerald-800/60 flex justify-between items-center">
                      <span>{isAr ? '١. الاستحقاقات والأجور الإجمالية' : '1. Gross Earnings'}</span>
                      <span className="font-mono">{Number(item.gross_amount).toFixed(2)} ج.م</span>
                    </div>
                    <div className="p-3 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'الراتب / الأجر الأساسي المعتمد:' : 'Base Salary:'}</span>
                        <strong className="font-mono">{Number(item.base_amount || 0).toFixed(2)} ج.م</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'مستحقات إنتاجية أجور القطعة:' : 'Piece Rate Earnings:'}</span>
                        <strong className="font-mono text-emerald-600">+{Number(item.piece_rate_earnings || 0).toFixed(2)} ج.م</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'أجر ساعات وأيام العمل:' : 'Time Wages:'}</span>
                        <strong className="font-mono">+{(Number(item.hourly_earnings || 0) + Number(item.daily_earnings || 0)).toFixed(2)} ج.م</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'أجر ساعات إضافية (أوفرتايم):' : 'Overtime Wages:'}</span>
                        <strong className="font-mono text-emerald-600">+{Number(item.overtime_earnings || 0).toFixed(2)} ج.م</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'البدلات والمكافآت المعتمدة:' : 'Bonuses & Allowances:'}</span>
                        <strong className="font-mono text-emerald-600">+{Number(item.allowances_and_bonuses || 0).toFixed(2)} ج.م</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: الاستقطاعات والسلف (Deductions & Advances) */}
                  <div className="border border-rose-200/80 dark:border-rose-800/60 rounded-xl overflow-hidden">
                    <div className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 font-bold border-b border-rose-200/80 dark:border-rose-800/60 flex justify-between items-center">
                      <span>{isAr ? '٢. الاستقطاعات والسلف المنصرفة' : '2. Deductions & Advances'}</span>
                      <span className="font-mono text-rose-600">-{Number(item.deductions_and_advances).toFixed(2)} ج.م</span>
                    </div>
                    <div className="p-3 space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {/* السلف النقدية المنصرفة والمستقطعة */}
                      <div className="py-1">
                        <div className="flex justify-between items-center font-bold text-slate-800 dark:text-slate-200">
                          <span>{isAr ? 'سداد سلف نقدية منصرفة:' : 'Cash Advances Repaid:'}</span>
                          <strong className="font-mono text-rose-600">-{Number(item.advances_repaid || 0).toFixed(2)} ج.م</strong>
                        </div>
                        {/* تفاصيل السلف بالتواريخ والأسباب */}
                        {advancesList.length > 0 ? (
                          <div className="mt-1 space-y-1 ps-2 text-[10px] text-slate-500 border-s-2 border-amber-300">
                            {advancesList.map((adv: any, aIdx: number) => (
                              <div key={adv.id || aIdx} className="flex justify-between items-center py-0.5">
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">• سلفة {adv.adjustment_date ? adv.adjustment_date.split('T')[0] : ''} ({adv.reason})</span>
                                  {adv.installments_count && adv.installments_count > 1 ? (
                                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block ps-2">
                                      (نظام تقسيط: {adv.installments_count} أشهر | الرصيد المتبقي على العامل بعد هذا المسير: {Number(adv.remaining_after ?? 0).toLocaleString()} ج.م)
                                    </span>
                                  ) : (
                                    adv.remaining_after !== undefined && (
                                      <span className="text-[9px] text-slate-500 block ps-2">
                                        (الرصيد المتبقي: {Number(adv.remaining_after).toLocaleString()} ج.م)
                                      </span>
                                    )
                                  )}
                                </div>
                                <span className="font-mono font-bold text-rose-600">-{Number(adv.deducted_amount ?? adv.amount).toLocaleString()} ج.م</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'خصومات عيوب الجودة المعتمدة:' : 'Defect Penalties:'}</span>
                        <strong className="font-mono text-rose-600">-{Number(item.defect_deductions || 0).toFixed(2)} ج.م</strong>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-600 dark:text-slate-400">{isAr ? 'خصومات إدارية وتأمينات:' : 'General Deductions:'}</span>
                        <strong className="font-mono text-rose-600">-{Number(item.general_deductions || 0).toFixed(2)} ج.م</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Net Payout Highlight Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-2 border-emerald-500/40 flex flex-col sm:flex-row justify-between items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      {isAr ? 'صافي المبلغ المستحق للصرف للعامل' : 'Net Salary Payable'}
                    </span>
                    <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {Number(item.net_salary).toLocaleString()} <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{isAr ? 'جنيه مصري' : 'EGP'}</span>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                      item.is_paid
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${item.is_paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span>{item.is_paid ? (isAr ? 'تم الصرف نقداً بالخزينة' : 'Paid in Cash') : (isAr ? 'جاهز ومعلق للصرف' : 'Pending Disbursement')}</span>
                    </span>
                  </div>
                </div>

                {/* Official Signatures Triplet */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-10">
                      {isAr ? 'توقيع وبصمة العامل المستلم' : 'Worker Signature'}
                    </span>
                    <div className="border-b border-dashed border-slate-400 dark:border-slate-600 w-3/4 mx-auto"></div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {isAr ? 'أقر باستلام كامل مستحقاتي' : 'Received in full'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-10">
                      {isAr ? 'توقيع الصراف / أمين الخزينة' : 'Cashier Signature'}
                    </span>
                    <div className="border-b border-dashed border-slate-400 dark:border-slate-600 w-3/4 mx-auto"></div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {isAr ? 'تم صرف القيمة نقداً' : 'Disbursed'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block mb-10">
                      {isAr ? 'اعتماد المدير المالي / المصنع' : 'Factory / HR Manager'}
                    </span>
                    <div className="border-b border-dashed border-slate-400 dark:border-slate-600 w-3/4 mx-auto"></div>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {isAr ? 'معتمد رسمياً' : 'Authorized'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => setIsIndividualPayslipModalOpen(false)}>
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
                <Button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  icon={<Printer className="w-4 h-4" />}
                >
                  {isAr ? 'طباعة القسيمة (Ctrl + P)' : 'Print Payslip'}
                </Button>
              </div>
            </div>
          );
        })()}
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
              value={selectedEmp || (employees[0]?.id ?? '')}
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
              value={selectedRate || (pieceRates[0]?.id ?? '')}
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
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-bold font-mono"
            />
          </div>

          {/* Live Calculation Preview */}
          {(() => {
            const currentRateObj = pieceRates.find((r) => r.id === (selectedRate || pieceRates[0]?.id));
            const unitRate = Number(currentRateObj?.rate_per_piece) || 0;
            const calculatedTotal = (Number(logQty) || 0) * unitRate;
            return (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">
                    {isAr ? 'الاحتساب الفوري لقيمة الإنتاجية:' : 'Live Output Amount:'}
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">
                    {logQty} {isAr ? 'قطعة' : 'pcs'} × {unitRate.toFixed(2)} {isAr ? 'ج.م/قطعة' : 'EGP/pc'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'المستحق للعامل' : 'Total Due'}</span>
                  <span className="text-sm font-mono font-black text-purple-600 dark:text-purple-400">
                    {calculatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>
            );
          })()}

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
              {isAr ? 'الموديل / قصة المنتج (BOM) - اختياري' : 'Garment Model / BOM (Optional)'}
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            >
              <option value="">{isAr ? 'عام لكافة الموديلات والمنتجات' : 'Generic for all models'}</option>
              {garmentModels.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.name}
                </option>
              ))}
            </select>
          </div>

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

      {/* 15. Print Advance Voucher Modal */}
      <Modal
        isOpen={isPrintAdjustmentModalOpen}
        onClose={() => setIsPrintAdjustmentModalOpen(false)}
        title={isAr ? 'إيصال وسند صرف سلفة نقدية معتمدة' : 'Official Advance Voucher'}
        maxWidth="xl"
      >
        {selectedAdjustmentForPrint && (() => {
          const adj = selectedAdjustmentForPrint;
          const emp = employees.find((e) => e.id === adj.employee_id) || adj.employee;
          const amountNum = Number(adj.amount) || 0;
          return (
            <div className="space-y-4">
              <div id="advance-voucher-print-area" className="p-6 bg-white text-slate-900 rounded-2xl border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0">
                {/* Factory Voucher Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-4">
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900 font-sans">
                      {isAr ? 'مصنع جارمينتوس للملابس الجاهزة' : 'GarmentOS Apparel Factory'}
                    </h2>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      {isAr ? 'إدارة الموارد البشرية والشؤون المالية والمحاسبية' : 'HR & Financial Affairs Directorate'}
                    </p>
                  </div>
                  <div className="text-left font-mono">
                    <div className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-bold text-xs text-slate-800">
                      سند صرف: #{adj.id.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {adj.effective_date}
                    </div>
                  </div>
                </div>

                <div className="text-center my-3">
                  <h3 className="text-sm font-black underline underline-offset-4 tracking-wide text-slate-900">
                    {isAr ? 'إيصال استلام سلفة نقدية على الراتب' : 'CASH ADVANCE RECEIPT & VOUCHER'}
                  </h3>
                </div>

                {/* Worker Details Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-4">
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isAr ? 'اسم العامل / المستفيد:' : 'Worker Name:'}</span>
                    <span className="font-bold text-slate-900 text-sm">{emp?.name || adj.employee_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isAr ? 'كود العامل:' : 'Employee Code:'}</span>
                    <span className="font-mono font-bold text-indigo-700">{emp?.employee_code || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isAr ? 'القسم والوظيفة:' : 'Dept & Craft:'}</span>
                    <span className="font-medium text-slate-800">{emp?.department || '-'} — {emp?.job_title || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">{isAr ? 'الرقم القومي / الهاتف:' : 'National ID / Phone:'}</span>
                    <span className="font-mono text-slate-700">{emp?.national_id || '-'} {emp?.phone ? `| 📞 ${emp.phone}` : ''}</span>
                  </div>
                </div>

                {/* Financial Details Box */}
                <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700">{isAr ? 'مبلغ السلفة المقبوض بالأرقام:' : 'Amount in Numbers:'}</span>
                    <span className="text-lg font-black font-mono text-amber-700 bg-amber-100/80 px-3 py-0.5 rounded-lg border border-amber-300">
                      {amountNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {isAr ? 'جنيه مصري (EGP)' : 'EGP'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-amber-200/80">
                    <span className="font-bold text-slate-700 text-[11px] block mb-0.5">{isAr ? 'المبلغ بالحروف (فقط وتفقيطاً):' : 'Amount in Words:'}</span>
                    <span className="font-bold text-slate-900 font-sans text-xs bg-white px-2.5 py-1 rounded border border-amber-200 inline-block w-full">
                      {tafqeetAmount(amountNum)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-600 text-[11px] block">{isAr ? 'البيان والسبب:' : 'Reason / Note:'}</span>
                    <span className="text-slate-800 italic">{adj.reason || (isAr ? 'سلفة شخصية بطلب العامل' : 'Cash advance request')}</span>
                  </div>
                </div>

                {/* Acknowledgment Statement */}
                <div className="p-3 bg-slate-100/60 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-slate-700 mb-6">
                  <p className="font-bold text-slate-900 mb-1">{isAr ? 'إقرار وتعهد العامل المستلم:' : 'Worker Acknowledgment:'}</p>
                  <p>
                    {isAr
                      ? `أقر أنا العامل المذكور بياناتي أعلاه بأنني استلمت المبلغ الموضح أعلاه نقداً وعداً من خزينة المصنع كسلفة على ذمة مستحقاتي، وأفوّض إدارة المصنع بخصم هذا المبلغ بالكامل من مسير رواتبي القادم تلقائياً دون أدنى اعتراض مني.`
                      : `I acknowledge the receipt of the above cash amount as an advance against my salary, and hereby authorize the management to deduct it in full from my upcoming payroll.`}
                  </p>
                </div>

                {/* Signature Triplet */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-300 text-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-8">{isAr ? 'توقيع وبصمة العامل المستلم' : 'Worker Signature'}</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-8">{isAr ? 'توقيع الصراف / أمين الخزينة' : 'Cashier Signature'}</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block mb-8">{isAr ? 'اعتماد المدير المالي / المصنع' : 'Factory Manager / Director'}</span>
                    <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsPrintAdjustmentModalOpen(false)}>
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  icon={<Printer className="w-4 h-4" />}
                >
                  {isAr ? 'طباعة السند (Ctrl + P)' : 'Print Voucher'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* 16. Worker Full Profile & Monthly Attendance Sheet Modal */}
      <Modal
        isOpen={isWorkerProfileModalOpen}
        onClose={() => setIsWorkerProfileModalOpen(false)}
        title={isAr ? `الملف الشامل للعامل وسجل الحضور: ${selectedEmployeeForProfile?.name || ''}` : `Worker Profile & Sheet: ${selectedEmployeeForProfile?.name || ''}`}
        maxWidth="xl"
      >
        {selectedEmployeeForProfile && (() => {
          const emp = selectedEmployeeForProfile;
          const empAttendances = attendances.filter(
            (a) => a.employee_id === emp.id && a.attendance_date.startsWith(profileMonthFilter)
          );

          const totalDaysPresent = empAttendances.filter((a) => a.status === 'present').length;
          const totalDaysAbsent = empAttendances.filter((a) => a.status === 'absent').length;
          const totalDaysLate = empAttendances.filter((a) => a.status === 'late').length;
          const totalHoursWorked = empAttendances.reduce((acc, a) => acc + (Number(a.total_hours ?? a.hours_worked) || 0), 0);
          const totalOvertime = empAttendances.reduce((acc, a) => acc + (Number(a.overtime_hours) || 0), 0);

          const daysOfWeek = isAr
            ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

          return (
            <div className="space-y-4">
              {/* Profile Header Pod */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-slate-50 dark:from-slate-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md">
                    {emp.name ? emp.name.trim().charAt(0) : 'ع'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{emp.name}</h3>
                      <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                        {emp.employee_code}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          emp.is_active
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {emp.is_active ? (isAr ? 'على رأس العمل' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                      <span>{emp.department ? getDepartmentBadge(emp.department) : ''}</span>
                      <span>{emp.job_title || (isAr ? 'عامل إنتاج' : 'Operator')}</span>
                      <span>وردية: {emp.shift_name || (isAr ? 'صباحية' : 'Morning')}</span>
                      <span>تاريخ التعيين: {emp.hire_date ? emp.hire_date.split('T')[0] : '—'}</span>
                    </div>
                    {(emp.phone || emp.national_id) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 flex items-center gap-3">
                        {emp.phone && <span>📞 {emp.phone}</span>}
                        {emp.national_id && <span>🆔 الرقم القومي: {emp.national_id}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs min-w-[180px]">
                  <span className="text-[10px] text-slate-400 block mb-0.5">{isAr ? 'هيكل التعويض المعتمد:' : 'Compensation:'}</span>
                  <div className="font-bold text-slate-900 dark:text-white">{getPayTypeBadge(emp.pay_type, emp)}</div>
                  {Number(emp.base_salary) > 0 && <div className="text-[11px] text-slate-500 font-mono mt-1">{isAr ? 'أساسي:' : 'Base:'} {Number(emp.base_salary).toLocaleString()} ج.م</div>}
                  {Number(emp.daily_rate) > 0 && <div className="text-[11px] text-slate-500 font-mono">{isAr ? 'يومية:' : 'Daily:'} {Number(emp.daily_rate).toLocaleString()} ج.م</div>}
                  {Number(emp.hourly_rate) > 0 && <div className="text-[11px] text-slate-500 font-mono">{isAr ? 'ساعة:' : 'Hourly:'} {Number(emp.hourly_rate).toLocaleString()} ج.م</div>}
                </div>
              </div>

              {/* Monthly Attendance Sheet Header & Month Filter */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {isAr ? 'سجل الحضور والانصراف الشهري' : 'Monthly Attendance Sheet'}
                  </span>
                  <input
                    type="month"
                    value={profileMonthFilter}
                    onChange={(e) => setProfileMonthFilter(e.target.value)}
                    className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportWorkerAttendanceToCsv(emp, profileMonthFilter)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs transition-all cursor-pointer"
                    title={isAr ? 'تصدير شيت حضور العامل إلى إكسل' : 'Export Sheet to Excel'}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{isAr ? 'تصدير إكسل' : 'Export Excel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttEmployeeId(emp.id);
                      setIsAttendanceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-2xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAr ? '+ تسجيل يوم' : '+ Record'}</span>
                  </button>
                </div>
              </div>

              {/* Attendance Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-bold">{isAr ? 'أيام الحضور' : 'Present Days'}</span>
                  <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">{totalDaysPresent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-center">
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-bold">{isAr ? 'أيام التأخير' : 'Late Days'}</span>
                  <span className="text-base font-black font-mono text-amber-600 dark:text-amber-400">{totalDaysLate}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 text-center">
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-bold">{isAr ? 'أيام الغياب' : 'Absent Days'}</span>
                  <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">{totalDaysAbsent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40 text-center">
                  <span className="text-[10px] text-sky-700 dark:text-sky-400 block font-bold">{isAr ? 'ساعات العمل' : 'Worked Hours'}</span>
                  <span className="text-base font-black font-mono text-sky-600 dark:text-sky-400">{totalHoursWorked.toFixed(1)} س</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 text-center">
                  <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-bold">{isAr ? 'أوفرتايم إضافي' : 'Overtime'}</span>
                  <span className="text-base font-black font-mono text-purple-600 dark:text-purple-400">{totalOvertime.toFixed(1)} س</span>
                </div>
              </div>

              {/* Monthly Attendance Sheet Table */}
              <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-start text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'التاريخ واليوم' : 'Date & Day'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'تسجيل الدخول' : 'In'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'تسجيل الخروج' : 'Out'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'الساعات' : 'Hours'}</th>
                      <th className="py-2.5 px-3 text-start">{isAr ? 'أوفرتايم' : 'Overtime'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="py-2.5 px-3 text-center">{isAr ? 'تعديل' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {empAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                          {isAr ? `لا توجد حركات حضور مسجلة للعامل خلال شهر ${profileMonthFilter}.` : 'No attendance recorded.'}
                        </td>
                      </tr>
                    ) : (
                      empAttendances.map((att) => {
                        const dayName = daysOfWeek[new Date(att.attendance_date).getDay()] || '';
                        return (
                          <tr key={att.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 font-medium text-slate-800 dark:text-slate-200">
                              <span>{att.attendance_date}</span>
                              <span className="text-slate-400 font-sans text-[10px] mx-1.5">({dayName})</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{att.check_in || '-'}</td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{att.check_out || '-'}</td>
                            <td className="py-2 px-3 font-bold text-slate-900 dark:text-white">
                              {Number(att.total_hours ?? att.hours_worked ?? 0).toFixed(1)} {isAr ? 'س' : 'h'}
                            </td>
                            <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                              {Number(att.overtime_hours || 0) > 0 ? `+${Number(att.overtime_hours).toFixed(1)} س` : '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-sans">
                              {att.status === 'present' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {isAr ? 'حاضر' : 'Present'}
                                </span>
                              ) : att.status === 'absent' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  {isAr ? 'غائب' : 'Absent'}
                                </span>
                              ) : att.status === 'late' ? (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {isAr ? 'تأخير' : 'Late'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300">
                                  {att.status}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsWorkerProfileModalOpen(false);
                                  openCorrectAttendance(att);
                                }}
                                title={isAr ? 'تصحيح حركة الحضور' : 'Correct'}
                                className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsWorkerProfileModalOpen(false)}>
                  {isAr ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  ArrowRightLeft,
  User,
  DollarSign,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export interface CmtBundle {
  id: string;
  bundle_code: string;
  bundle_number: number;
  job_order_id: string;
  job_order_number: string;
  customer_id?: string;
  customer_name: string;
  model_name: string;
  color_name: string;
  size_name: string;
  quantity: number;
  current_stage_code: 'cutting' | 'sewing' | 'external_op' | 'finishing' | 'packing' | 'completed';
  status: 'active' | 'completed' | 'rework' | 'scrapped';
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  unit_rate: number;
  total_wage: number;
  work_group?: string;
  logs?: Array<{
    operator_name: string;
    stage_name: string;
    accepted_qty: number;
    wage: number;
    logged_at: string;
  }>;
}

interface CmtBundleTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: CmtBundle | null;
  employees?: any[];
  onTransferSuccess: (updated: CmtBundle, wageEntry?: any) => void;
  isAr?: boolean;
}

export const CmtBundleTransferModal: React.FC<CmtBundleTransferModalProps> = ({
  isOpen,
  onClose,
  bundle,
  employees = [],
  onTransferSuccess,
  isAr = true,
}) => {
  if (!bundle) return null;

  const [targetStage, setTargetStage] = useState<'cutting' | 'sewing' | 'external_op' | 'finishing' | 'packing' | 'completed'>('sewing');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [operatorName, setOperatorName] = useState<string>('');
  const [acceptedQty, setAcceptedQty] = useState<number>(bundle.quantity || 20);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [unitRate, setUnitRate] = useState<number>(bundle.unit_rate || 10.0);
  const [workLine, setWorkLine] = useState<string>('خط التشغيل الرئيسي (CMT)');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (bundle) {
      setAcceptedQty(bundle.quantity || 20);
      setRejectedQty(0);
      setReworkQty(0);
      setUnitRate(bundle.unit_rate || 10.0);
      setNotes('');

      // Auto-advance to next reasonable stage
      if (bundle.current_stage_code === 'cutting') setTargetStage('sewing');
      else if (bundle.current_stage_code === 'sewing') setTargetStage('external_op');
      else if (bundle.current_stage_code === 'external_op') setTargetStage('finishing');
      else if (bundle.current_stage_code === 'finishing') setTargetStage('packing');
      else if (bundle.current_stage_code === 'packing') setTargetStage('completed');
      else setTargetStage('completed');

      if (bundle.assigned_employee_id) {
        setSelectedEmpId(bundle.assigned_employee_id);
      } else if (employees.length > 0) {
        setSelectedEmpId(employees[0].id);
        setOperatorName(employees[0].name);
      }

      if (bundle.assigned_employee_name) {
        setOperatorName(bundle.assigned_employee_name);
      }
    }
  }, [bundle, employees]);

  const handleEmployeeChange = (eId: string) => {
    setSelectedEmpId(eId);
    const emp = employees.find((e) => e.id === eId);
    if (emp) {
      setOperatorName(emp.name);
    }
  };

  const calculatedTotalWage = Math.max(0, acceptedQty * unitRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle) return;

    setIsSubmitting(true);
    try {
      const stageNameMap: Record<string, string> = {
        cutting: isAr ? 'صالة القص للغير' : 'Contract Cutting',
        sewing: isAr ? 'خياطة وتجميع CMT' : 'CMT Sewing',
        external_op: isAr ? 'تطريز / طباعة خارجية' : 'Outsourced Embellishment',
        finishing: isAr ? 'التشطيب والكي' : 'Finishing & Ironing',
        packing: isAr ? 'التعبئة والتسليم المجاز' : 'Packing & Quality Approved',
        completed: isAr ? 'اكتملت بالكامل (جاهز للتسليم)' : 'Fully Completed',
      };

      const newLog = {
        operator_name: operatorName || (isAr ? 'عامل التشغيل' : 'Operator'),
        stage_name: stageNameMap[targetStage] || targetStage,
        accepted_qty: acceptedQty,
        wage: calculatedTotalWage,
        logged_at: new Date().toISOString(),
      };

      const updatedBundle: CmtBundle = {
        ...bundle,
        current_stage_code: targetStage,
        status: targetStage === 'completed' ? 'completed' : 'active',
        assigned_employee_id: selectedEmpId,
        assigned_employee_name: operatorName,
        quantity: Math.max(1, acceptedQty),
        unit_rate: unitRate,
        total_wage: (bundle.total_wage || 0) + calculatedTotalWage,
        logs: [...(bundle.logs || []), newLog],
      };

      const wageEntry = {
        employee_id: selectedEmpId,
        employee_name: operatorName,
        job_order_id: bundle.job_order_id,
        job_order_number: bundle.job_order_number,
        customer_name: bundle.customer_name,
        bundle_code: bundle.bundle_code,
        stage: stageNameMap[targetStage],
        accepted_quantity: acceptedQty,
        unit_rate: unitRate,
        total_wage: calculatedTotalWage,
        recorded_at: new Date().toISOString(),
      };

      onTransferSuccess(updatedBundle, wageEntry);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-slate-900 dark:text-slate-100" dir={isAr ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200/80 dark:border-[#2d080e]">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7F1625] to-[#9E2A3B] text-white flex items-center justify-center shadow-lg shadow-[#7F1625]/25">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isAr ? 'تسليم الحزمة ونقلها للمرحلة التالية' : 'Transfer CMT Bundle Stage'}
              </h2>
              <Badge variant="purple" className="text-[10px] font-mono">
                {bundle.bundle_code}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {bundle.customer_name} • أمر التشغيل: {bundle.job_order_number}
            </p>
          </div>
        </div>

        {/* Bundle Specs Strip */}
        <div className="grid grid-cols-4 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] text-xs">
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">{isAr ? 'الموديل' : 'Model'}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{bundle.model_name}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">{isAr ? 'المقاس' : 'Size'}</span>
            <span className="font-bold font-mono text-purple-600 dark:text-purple-400">{bundle.size_name}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">{isAr ? 'اللون' : 'Color'}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">{bundle.color_name}</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-medium">{isAr ? 'العدد بالحزمة' : 'Quantity'}</span>
            <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">{bundle.quantity} {isAr ? 'قطعة' : 'pcs'}</span>
          </div>
        </div>

        {/* Target Stage & Line */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'المرحلة المستهدفة للتشغيل' : 'Target Stage'} *
            </label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#7F1625]"
            >
              <option value="cutting">{isAr ? 'صالة القص للغير' : 'Contract Cutting'}</option>
              <option value="sewing">{isAr ? 'خياطة وتجميع CMT' : 'CMT Sewing'}</option>
              <option value="external_op">{isAr ? 'تطريز / طباعة خارجية (مطبعة)' : 'Outsourced Embellishment'}</option>
              <option value="finishing">{isAr ? 'التشطيب والكي' : 'Finishing & Ironing'}</option>
              <option value="packing">{isAr ? 'التعبئة والتسليم المجاز' : 'Packing & Quality Approved'}</option>
              <option value="completed">{isAr ? 'اكتملت بالكامل (جاهزة للتسليم للعميل)' : 'Completed'}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'خط الإنتاج / الورشة' : 'Work Line'}
            </label>
            <input
              type="text"
              value={workLine}
              onChange={(e) => setWorkLine(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7F1625]"
            />
          </div>
        </div>

        {/* Worker Assignment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#7F1625] dark:text-[#ff8ba0]" />
              <span>{isAr ? 'اختيار العامل المسؤول (قاعدة بيانات العمال)' : 'Assign Worker'} *</span>
            </label>
            <select
              value={selectedEmpId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7F1625]"
            >
              <option value="">{isAr ? 'اختر العامل المسلم إليه...' : 'Select employee...'}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_code || emp.id.slice(0, 5)}) - {emp.job_title || (isAr ? 'فني تشغيل' : 'Operator')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {isAr ? 'اسم المشغل أو المستلم المباشر' : 'Operator Name'}
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder={isAr ? 'اسم العامل أو المشغل الفعلي' : 'Operator name'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#7F1625]"
            />
          </div>
        </div>

        {/* Quantity Breakdown */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            {isAr ? 'مطابقة الكميات المسلمة والمقبولة والهالك' : 'Quantities'}
          </span>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                {isAr ? 'مقبول سليم' : 'Accepted'}
              </span>
              <input
                type="number"
                min="0"
                max={bundle.quantity || 1000}
                value={acceptedQty}
                onChange={(e) => setAcceptedQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono font-bold text-center text-emerald-600"
              />
            </div>
            <div>
              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold mb-1">
                {isAr ? 'إعادة تشغيل' : 'Rework'}
              </span>
              <input
                type="number"
                min="0"
                value={reworkQty}
                onChange={(e) => setReworkQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono text-center text-amber-600"
              />
            </div>
            <div>
              <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-1">
                {isAr ? 'هالك نهائي' : 'Scrap'}
              </span>
              <input
                type="number"
                min="0"
                value={rejectedQty}
                onChange={(e) => setRejectedQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono text-center text-rose-600"
              />
            </div>
          </div>
        </div>

        {/* Piece-Rate Wage Calculation Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#7F1625]/10 via-[#7F1625]/5 to-transparent border border-[#7F1625]/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#7F1625] dark:text-[#ff8ba0]">
              <DollarSign className="w-4 h-4" />
              <span>{isAr ? 'أجر القطعة المستحق للعامل عن الحزمة' : 'Worker Piece Wage'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-medium">{isAr ? 'سعر القطعة:' : 'Unit Rate:'}</span>
              <div className="relative w-20">
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  value={unitRate}
                  onChange={(e) => setUnitRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center focus:outline-none focus:border-[#7F1625]"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#7F1625]/20">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {acceptedQty} {isAr ? 'قطعة سليمة' : 'pcs'} × {unitRate.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
            </span>
            <div className="text-lg font-black font-mono text-[#7F1625] dark:text-[#ff8ba0]">
              {calculatedTotalWage.toFixed(2)} <span className="text-xs font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5 leading-relaxed bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? 'يتم تقييد هذا الاستحقاق آلياً في شيت إنتاجية العامل ومسير الرواتب المعتمد لحساب تشغيل الغير (CMT) فور حفظ الحركة.'
                : 'This piece rate will be automatically recorded in the operator production timesheet and CMT payroll log.'}
            </span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات المشرف وتدقيق الجودة:' : 'QC & Supervisor Notes:'}
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'أي ملاحظات تشغيلية خاصة بالحزمة...' : 'Any stage notes...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#7F1625]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80 dark:border-[#2d080e]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isAr ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-black shadow-lg shadow-[#7F1625]/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isAr ? 'حفظ الحركة وقيد أجر العامل ونقل المرحلة' : 'Save & Transfer Stage'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldCheck, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ProductionOrder, CuttingBundle, QualityInspection, QualityDefect } from '../../types';
import { api } from '../../api/client';

interface QualityInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrder: ProductionOrder | null;
  bundle?: CuttingBundle | null;
  onSuccess: (newInspection: QualityInspection) => void;
  isAr?: boolean;
}

export const QualityInspectionModal: React.FC<QualityInspectionModalProps> = ({
  isOpen,
  onClose,
  productionOrder,
  bundle,
  onSuccess,
  isAr = true,
}) => {
  if (!productionOrder) return null;

  const defaultTotal = bundle ? bundle.quantity : (productionOrder.target_quantity || 100);

  const [inspectorName, setInspectorName] = useState(isAr ? 'م. نادية سمير (مديرة الجودة)' : 'QC Manager');
  const [inspectionType, setInspectionType] = useState<'inline' | 'end_of_line' | 'final_audit'>('final_audit');
  const [inspectedQuantity, setInspectedQuantity] = useState(defaultTotal);
  const [passedQuantity, setPassedQuantity] = useState(defaultTotal - 2);
  const [reworkQuantity, setReworkQuantity] = useState(2);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const [defects, setDefects] = useState<QualityDefect[]>([
    {
      defect_type: 'skip_stitch',
      severity: 'minor',
      quantity: 2,
      corrective_action: isAr ? 'إعادة خياطة الحلية والياقة' : 'Resew trim and collar',
    },
  ]);

  const sumCheck = passedQuantity + reworkQuantity + rejectedQuantity;
  const isQuantityValid = sumCheck === inspectedQuantity;

  const handleAddDefect = () => {
    setDefects((prev) => [
      ...prev,
      {
        defect_type: 'fabric_flaw',
        severity: 'major',
        quantity: 1,
        corrective_action: isAr ? 'إعادة فحص الخامة واستبدال القطعة' : 'Inspect fabric and replace piece',
      },
    ]);
  };

  const handleRemoveDefect = (index: number) => {
    setDefects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDefectChange = (index: number, field: keyof QualityDefect, value: any) => {
    setDefects((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const decision: 'passed' | 'rework_required' | 'rejected' =
    rejectedQuantity > 0 ? 'rejected' : reworkQuantity > 0 ? 'rework_required' : 'passed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQuantityValid) return;

    setIsSubmitting(true);
    setApiError(null);

    const payload = {
      production_order_id: productionOrder.id,
      cutting_bundle_id: bundle?.id && bundle.id.length > 20 && !bundle.id.startsWith('bnd-') ? bundle.id : undefined,
      inspector_name: inspectorName,
      inspection_type: inspectionType,
      inspected_quantity: inspectedQuantity,
      passed_quantity: passedQuantity,
      rework_quantity: reworkQuantity,
      rejected_quantity: rejectedQuantity,
      decision,
      notes: notes || undefined,
      defects: defects.map(d => ({
        defect_type: d.defect_type,
        severity: d.severity,
        quantity: d.quantity,
        corrective_action: d.corrective_action,
      })),
    };

    try {
      const res = await api.production.createQualityInspection(payload);
      const created = res.data;
      const formattedInspection: QualityInspection = {
        id: created.id,
        inspection_number: created.inspection_number || ('QC-' + Date.now().toString().slice(-6)),
        production_order_id: created.production_order_id || productionOrder.id,
        production_order_number: productionOrder.order_number,
        bundle_code: bundle?.bundle_code,
        inspector_name: created.inspector_name || inspectorName,
        inspection_type: created.inspection_type || inspectionType,
        inspected_quantity: created.inspected_quantity || inspectedQuantity,
        passed_quantity: created.passed_quantity || passedQuantity,
        rework_quantity: created.rework_quantity || reworkQuantity,
        rejected_quantity: created.rejected_quantity || rejectedQuantity,
        decision: created.decision || decision,
        defects: created.defects || defects,
        created_at: created.created_at || new Date().toISOString().split('T')[0],
      };

      onSuccess(formattedInspection);
      onClose();
    } catch (err: any) {
      setApiError(err.message || (isAr ? 'حدث خطأ أثناء حفظ محضر الفحص' : 'An error occurred while saving the QC report'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `محضر فحص الجودة والتفتيش: ${productionOrder.order_number}` : `Quality Inspection & Audit: ${productionOrder.order_number}`}
      maxWidth="lg"
    >
      {apiError && (
        <div className="mb-4 p-3 bg-red-950/60 border border-red-700/60 text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>{apiError}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner with Target */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">{isAr ? 'أمر الإنتاج / الحزمة:' : 'Production Order / Bundle:'}</span>
            <span className="font-bold text-slate-200">
              {productionOrder.model_name} {bundle ? `(${isAr ? 'حزمة:' : 'Bundle:'} ${bundle.bundle_code})` : ''}
            </span>
          </div>
          <div>
            <Badge
              variant={
                decision === 'passed'
                  ? 'success'
                  : decision === 'rework_required'
                  ? 'warning'
                  : 'danger'
              }
            >
              {decision === 'passed'
                ? (isAr ? 'اجتياز الجودة (Passed)' : 'Passed')
                : decision === 'rework_required'
                ? (isAr ? 'إعادة تشغيل (Rework)' : 'Rework Required')
                : (isAr ? 'مرفوض نهائياً (Rejected)' : 'Rejected')}
            </Badge>
          </div>
        </div>

        {/* Final Audit Storage Notice */}
        {inspectionType === 'final_audit' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <span className="font-bold block">{isAr ? 'الفحص النهائي للمنتج التام (Final Audit):' : 'Final Audit & Finished Goods Posting:'}</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isAr
                  ? `القطع المقبولة (${passedQuantity} قطعة) سيتم ترحيلها رسمياً كبضاعة تامة الصنع إلى مخزن المنتج النهائي، وتحديث حالة أمر الإنتاج.`
                  : `Accepted pieces (${passedQuantity} pcs) will be officially posted as finished goods into the warehouse and order status updated.`}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم مسؤول / مهندس الجودة' : 'Quality Inspector / Engineer Name'}
            </label>
            <input
              type="text"
              required
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'نوع نقطة الفحص' : 'Inspection Checkpoint Type'}
            </label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="inline">{isAr ? 'فحص مرحلي أثناء الخياطة (Inline Inspection)' : 'Inline Inspection (Sewing)'}</option>
              <option value="end_of_line">{isAr ? 'فحص نهاية الخط والكي (End-of-Line Inspection)' : 'End-of-Line / Ironing Inspection'}</option>
              <option value="final_audit">{isAr ? 'فحص تدقيق الجودة النهائي والاعتماد (Final Audit)' : 'Final Quality Audit & Release'}</option>
            </select>
          </div>
        </div>

        {/* Quantities breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-300 block">
            {isAr ? 'نتائج الفحص والفرز الفعلي' : 'Actual Inspection & Sorting Counts'}
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'إجمالي المفحوص' : 'Total Inspected'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={inspectedQuantity}
                onChange={(e) => setInspectedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-slate-900 dark:text-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-emerald-600 dark:text-emerald-400 mb-1">
                {isAr ? 'مقبول مطابق (Pass)' : 'Passed'}
              </label>
              <input
                type="number"
                min="0"
                value={passedQuantity}
                onChange={(e) => setPassedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-amber-600 dark:text-amber-400 mb-1">
                {isAr ? 'إعادة تشغيل (Rework)' : 'Rework'}
              </label>
              <input
                type="number"
                min="0"
                value={reworkQuantity}
                onChange={(e) => setReworkQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-amber-600 dark:text-amber-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-red-600 dark:text-red-400 mb-1">
                {isAr ? 'مرفوض نهائي (Reject)' : 'Rejected'}
              </label>
              <input
                type="number"
                min="0"
                value={rejectedQuantity}
                onChange={(e) => setRejectedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-red-600 dark:text-red-400 font-mono font-bold"
              />
            </div>
          </div>

          {!isQuantityValid && (
            <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] pt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {isAr
                  ? `مجموع النتائج (${sumCheck}) لا يطابق إجمالي القطع المفحوصة (${inspectedQuantity}).`
                  : `Sum of results (${sumCheck}) does not match inspected pieces (${inspectedQuantity}).`}
              </span>
            </div>
          )}
        </div>

        {/* Defects Log Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isAr ? 'سجل تفاصيل العيوب والإجراءات التصحيحية' : 'Defect Breakdown & Corrective Actions'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDefect}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              {isAr ? 'إضافة عيب' : 'Add Defect'}
            </Button>
          </div>

          {defects.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl">
              {isAr ? 'لا توجد عيوب مسجلة — الدفعة مطابقة بالكامل.' : 'No defects recorded — Batch fully compliant.'}
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'نوع العيب' : 'Defect Type'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الخطورة' : 'Severity'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'العدد' : 'Qty'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'الإجراء التصحيحي' : 'Corrective Action'}</th>
                    <th className="py-2.5 px-2 text-center">{isAr ? 'حذف' : 'Remove'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                  {defects.map((def, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <select
                          value={def.defect_type}
                          onChange={(e) => handleDefectChange(idx, 'defect_type', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                        >
                          <option value="skip_stitch">{isAr ? 'تنسيل أو غرزة ساقطة (Skip Stitch)' : 'Skip Stitch / Unraveling'}</option>
                          <option value="fabric_flaw">{isAr ? 'عيب نسيج أو خامة (Fabric Flaw)' : 'Fabric Flaw'}</option>
                          <option value="size_measurement">{isAr ? 'عدم مطابقة المقاس والباترون' : 'Measurement / Pattern Out of Spec'}</option>
                          <option value="stain">{isAr ? 'بقعة زيت أو اتساخ ماكينات' : 'Oil Stain / Machine Dirt'}</option>
                          <option value="broken_needle">{isAr ? 'كسر إبرة أو ثقب' : 'Broken Needle / Hole'}</option>
                          <option value="color_shading">{isAr ? 'اختلاف درجات اللون بين الأجزاء' : 'Color Shading / Panel Mismatch'}</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={def.severity}
                          onChange={(e) => handleDefectChange(idx, 'severity', e.target.value as any)}
                          className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                        >
                          <option value="minor">{isAr ? 'طفيف (Minor)' : 'Minor'}</option>
                          <option value="major">{isAr ? 'جسيم (Major)' : 'Major'}</option>
                          <option value="critical">{isAr ? 'حرج (Critical)' : 'Critical'}</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min="1"
                          value={def.quantity}
                          onChange={(e) =>
                            handleDefectChange(idx, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-20 bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={def.corrective_action || ''}
                          onChange={(e) =>
                            handleDefectChange(idx, 'corrective_action', e.target.value)
                          }
                          className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDefect(idx)}
                          className="text-slate-500 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات وتوصيات التفتيش' : 'Inspection Notes & Recommendations'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'ملاحظات فحص القياسات أو درجات الشد...' : 'Tension notes, seam elasticity checks...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            disabled={!isQuantityValid}
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            {isAr ? 'اعتماد تقرير الفحص' : 'Approve QC Report'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

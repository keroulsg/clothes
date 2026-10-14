import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ShieldCheck, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ProductionOrder, CuttingBundle, QualityInspection, QualityDefect } from '../../types';

interface QualityInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrder: ProductionOrder | null;
  bundle?: CuttingBundle | null;
  onSuccess: (newInspection: QualityInspection) => void;
}

export const QualityInspectionModal: React.FC<QualityInspectionModalProps> = ({
  isOpen,
  onClose,
  productionOrder,
  bundle,
  onSuccess,
}) => {
  if (!productionOrder) return null;

  const defaultTotal = bundle ? bundle.quantity : (productionOrder.target_quantity || 100);

  const [inspectorName, setInspectorName] = useState('م. نادية سمير (مديرة الجودة)');
  const [inspectionType, setInspectionType] = useState<'inline' | 'end_of_line' | 'final_audit'>('final_audit');
  const [inspectedQuantity, setInspectedQuantity] = useState(defaultTotal);
  const [passedQuantity, setPassedQuantity] = useState(defaultTotal - 2);
  const [reworkQuantity, setReworkQuantity] = useState(2);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [defects, setDefects] = useState<QualityDefect[]>([
    {
      defect_type: 'skip_stitch',
      severity: 'minor',
      quantity: 2,
      corrective_action: 'إعادة خياطة الحلية والياقة',
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
        corrective_action: 'إعادة فحص الخامة واستبدال القطعة',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQuantityValid) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const inspectionNum =
        'QC-' +
        new Date().getFullYear() +
        String(new Date().getMonth() + 1).padStart(2, '0') +
        '-' +
        Math.floor(1000 + Math.random() * 9000);

      const newInspection: QualityInspection = {
        id: 'qc-' + Date.now(),
        inspection_number: inspectionNum,
        production_order_id: productionOrder.id,
        production_order_number: productionOrder.order_number,
        bundle_code: bundle?.bundle_code,
        inspector_name: inspectorName,
        inspection_type: inspectionType,
        inspected_quantity: inspectedQuantity,
        passed_quantity: passedQuantity,
        rework_quantity: reworkQuantity,
        rejected_quantity: rejectedQuantity,
        decision,
        defects,
        created_at: new Date().toISOString().split('T')[0],
      };

      onSuccess(newInspection);
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`محضر فحص الجودة والتفتيش: ${productionOrder.order_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Banner with Target */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">أمر الإنتاج / الحزمة:</span>
            <span className="font-bold text-slate-200">
              {productionOrder.model_name} {bundle ? `(حزمة: ${bundle.bundle_code})` : ''}
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
                ? 'اجتياز الجودة (Passed)'
                : decision === 'rework_required'
                ? 'إعادة تشغيل (Rework)'
                : 'مرفوض نهائياً (Rejected)'}
            </Badge>
          </div>
        </div>

        {/* Final Audit Storage Notice */}
        {inspectionType === 'final_audit' && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div>
              <span className="font-bold block">الفحص النهائي للمنتج التام (Final Audit):</span>
              <p className="text-[11px] opacity-90 mt-0.5">
                القطع المقبولة ({passedQuantity} قطعة) سيتم ترحيلها رسمياً كبضاعة تامة الصنع إلى مخزن المنتج النهائي، وتحديث حالة أمر الإنتاج.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              اسم مسؤول / مهندس الجودة
            </label>
            <input
              type="text"
              required
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              نوع نقطة الفحص
            </label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="inline">فحص مرحلي أثناء الخياطة (Inline Inspection)</option>
              <option value="end_of_line">فحص نهاية الخط والكي (End-of-Line Inspection)</option>
              <option value="final_audit">فحص تدقيق الجودة النهائي والاعتماد (Final Audit)</option>
            </select>
          </div>
        </div>

        {/* Quantities breakdown */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <span className="text-xs font-bold text-slate-300 block">
            نتائج الفحص والفرز الفعلي
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">إجمالي المفحوص</label>
              <input
                type="number"
                min="1"
                required
                value={inspectedQuantity}
                onChange={(e) => setInspectedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-slate-200 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-emerald-400 mb-1">مقبول مطابق (Pass)</label>
              <input
                type="number"
                min="0"
                value={passedQuantity}
                onChange={(e) => setPassedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-emerald-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-amber-400 mb-1">إعادة تشغيل (Rework)</label>
              <input
                type="number"
                min="0"
                value={reworkQuantity}
                onChange={(e) => setReworkQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-amber-400 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-red-400 mb-1">مرفوض نهائي (Reject)</label>
              <input
                type="number"
                min="0"
                value={rejectedQuantity}
                onChange={(e) => setRejectedQuantity(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-red-400 font-mono font-bold"
              />
            </div>
          </div>

          {!isQuantityValid && (
            <div className="flex items-center gap-1.5 text-red-400 text-[11px] pt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                مجموع النتائج ({sumCheck}) لا يطابق إجمالي القطع المفحوصة ({inspectedQuantity}).
              </span>
            </div>
          )}
        </div>

        {/* Defects Log Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              سجل تفاصيل العيوب والإجراءات التصحيحية
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDefect}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              إضافة عيب
            </Button>
          </div>

          {defects.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500 border border-slate-800 rounded-xl">
              لا توجد عيوب مسجلة — الدفعة مطابقة بالكامل.
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2.5 px-3">نوع العيب</th>
                    <th className="py-2.5 px-3">الخطورة</th>
                    <th className="py-2.5 px-3">العدد</th>
                    <th className="py-2.5 px-3">الإجراء التصحيحي</th>
                    <th className="py-2.5 px-2 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {defects.map((def, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <select
                          value={def.defect_type}
                          onChange={(e) => handleDefectChange(idx, 'defect_type', e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs"
                        >
                          <option value="skip_stitch">تنسيل أو غرزة ساقطة (Skip Stitch)</option>
                          <option value="fabric_flaw">عيب نسيج أو خامة (Fabric Flaw)</option>
                          <option value="size_measurement">عدم مطابقة المقاس والباترون</option>
                          <option value="stain">بقعة زيت أو اتساخ ماكينات</option>
                          <option value="broken_needle">كسر إبرة أو ثقب</option>
                          <option value="color_shading">اختلاف درجات اللون بين الأجزاء</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={def.severity}
                          onChange={(e) => handleDefectChange(idx, 'severity', e.target.value as any)}
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs"
                        >
                          <option value="minor">طفيف (Minor)</option>
                          <option value="major">جسيم (Major)</option>
                          <option value="critical">حرج (Critical)</option>
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
                          className="w-20 bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 font-mono text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={def.corrective_action || ''}
                          onChange={(e) =>
                            handleDefectChange(idx, 'corrective_action', e.target.value)
                          }
                          className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-slate-200 text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveDefect(idx)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
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
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            ملاحظات وتوصيات التفتيش
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات فحص القياسات أو درجات الشد..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={!isQuantityValid}
            isLoading={isSubmitting}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            اعتماد تقرير الفحص
          </Button>
        </div>
      </form>
    </Modal>
  );
};

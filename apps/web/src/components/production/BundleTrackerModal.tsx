import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { QrCode, ArrowRightLeft, User, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { CuttingBundle } from '../../types';
import { api } from '../../api/client';

interface BundleTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: CuttingBundle | null;
  onTransferSuccess: (updatedBundle: CuttingBundle) => void;
  isAr?: boolean;
}

export const BundleTrackerModal: React.FC<BundleTrackerModalProps> = ({
  isOpen,
  onClose,
  bundle,
  onTransferSuccess,
  isAr = true,
}) => {
  if (!bundle) return null;

  const [toStageCode, setToStageCode] = useState<'assembly' | 'sewing' | 'finishing' | 'ironing' | 'packing' | 'completed'>('sewing');
  const [operatorName, setOperatorName] = useState(isAr ? 'الأسطى إبراهيم حسن' : 'Ibrahim Hassan');
  const [workLine, setWorkLine] = useState(isAr ? 'خط أولادي 1' : 'Boys Line 1');
  const inputQuantity = bundle.quantity;
  const [acceptedQuantity, setAcceptedQuantity] = useState(bundle.quantity);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [scrapQuantity, setScrapQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sumCheck = acceptedQuantity + rejectedQuantity + scrapQuantity;
  const isQuantityValid = sumCheck === inputQuantity;

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQuantityValid) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await api.production.transferBundle(bundle.id, {
        to_stage_code: toStageCode,
        operator_name: operatorName || undefined,
        work_line: workLine || undefined,
        input_quantity: Number(inputQuantity),
        output_accepted_quantity: Number(acceptedQuantity),
        output_rejected_quantity: Number(rejectedQuantity),
        scrap_quantity: Number(scrapQuantity),
      });

      const updatedBundle: CuttingBundle = {
        ...bundle,
        current_stage_code: toStageCode,
        quantity: acceptedQuantity,
        status: scrapQuantity >= bundle.quantity ? 'scrapped' : rejectedQuantity > 0 ? 'held_for_qc' : 'active',
      };

      onTransferSuccess(updatedBundle);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر تسجيل نقل الحزمة على الخادم.' : 'Failed to transfer bundle on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `بطاقة الحزمة ومسار التشغيل: ${bundle.bundle_code}` : `Bundle Tracking Card: ${bundle.bundle_code}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {/* Printable Bundle Card Look */}
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary dark:text-[#fca5a5]" />
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{bundle.bundle_code}</span>
            </div>
            <Badge variant="info">{isAr ? `حزمة رقم #${bundle.bundle_number}` : `Bundle #${bundle.bundle_number}`}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{isAr ? 'اللون' : 'Color'}</span>
              <span className="text-slate-800 dark:text-slate-200 font-bold">{bundle.color_name}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{isAr ? 'المقاس' : 'Size'}</span>
              <span className="text-primary dark:text-[#fca5a5] font-bold text-sm">{bundle.size_name}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{isAr ? 'العدد بالحزمة' : 'Quantity'}</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{bundle.quantity} {isAr ? 'قطعة' : 'pcs'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 dark:text-slate-400">
            <span>{isAr ? 'المرحلة الحالية:' : 'Current Stage:'} [{bundle.current_stage_code}]</span>
            <span className="text-slate-500 dark:text-slate-400">{isAr ? 'باركود تتبع خطوط الإنتاج' : 'Production Floor Tracking'}</span>
          </div>
        </div>

        {/* Stage Transfer Form */}
        <form onSubmit={handleTransfer} className="space-y-3">
          <div className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5 pt-1">
            <ArrowRightLeft className="w-4 h-4 text-primary dark:text-[#fca5a5]" />
            <span>{isAr ? 'تسليم الحزمة ونقلها للمرحلة التالية' : 'Handover & Advance Bundle to Next Stage'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المرحلة المستهدفة للتشغيل' : 'Target Production Stage'}
              </label>
              <select
                value={toStageCode}
                onChange={(e) => setToStageCode(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="assembly">{isAr ? 'التجهيز والتجميع (Assembly)' : 'Assembly & Preparation'}</option>
                <option value="sewing">{isAr ? 'خط الخياطة والتجميع (Sewing)' : 'Sewing Line'}</option>
                <option value="finishing">{isAr ? 'التشطيب وإزالة الخيوط (Finishing)' : 'Finishing & Trimming'}</option>
                <option value="ironing">{isAr ? 'الكي بالبخار (Ironing)' : 'Steam Ironing'}</option>
                <option value="packing">{isAr ? 'الفحص النهائي والتعبئة (Packing)' : 'Final QC & Packing'}</option>
                <option value="completed">{isAr ? 'اكتملت بالكامل (Completed)' : 'Completed'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'خط الإنتاج / الورشة' : 'Production Line / Workshop'}
              </label>
              <input
                type="text"
                required
                value={workLine}
                onChange={(e) => setWorkLine(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم العامل / رئيس المرحلة المستلم' : 'Operator / Stage Lead Name'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <User className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'left-3' : 'right-3'} top-3 pointer-events-none`} />
            </div>
          </div>

          {/* Quantities Breakdown */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-300 block">
              {isAr ? 'مطابقة الكميات المسلمة والمقبولة والهالك' : 'Quantity Reconciliation (Accepted / Rejected / Scrap)'}
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'قطع مقبولة سليمة' : 'Accepted Sound'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={acceptedQuantity}
                  onChange={(e) => setAcceptedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'معيب (إعادة تشغيل)' : 'Defective (Rework)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={rejectedQuantity}
                  onChange={(e) => setRejectedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-amber-600 dark:text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'هالك نهائي (Scrap)' : 'Scrap Final'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={scrapQuantity}
                  onChange={(e) => setScrapQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded text-xs p-2 text-red-600 dark:text-red-400 font-mono font-bold"
                />
              </div>
            </div>

            {!isQuantityValid && (
              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 text-[11px] pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  {isAr
                    ? `مجموع الكميات (${sumCheck}) لا يساوي رصيد الحزمة الحالي (${inputQuantity}).`
                    : `Total sum (${sumCheck}) does not match current bundle quantity (${inputQuantity}).`}
                </span>
              </div>
            )}
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
              {isAr ? 'تسجيل الحركة ونقل الحزمة' : 'Post Movement & Transfer Bundle'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

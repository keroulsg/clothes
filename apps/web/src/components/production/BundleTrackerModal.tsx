import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { QrCode, ArrowRightLeft, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CuttingBundle } from '../../types';

interface BundleTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: CuttingBundle | null;
  onTransferSuccess: (updatedBundle: CuttingBundle) => void;
}

export const BundleTrackerModal: React.FC<BundleTrackerModalProps> = ({
  isOpen,
  onClose,
  bundle,
  onTransferSuccess,
}) => {
  if (!bundle) return null;

  const [toStageCode, setToStageCode] = useState<'assembly' | 'sewing' | 'finishing' | 'ironing' | 'packing' | 'completed'>('sewing');
  const [operatorName, setOperatorName] = useState('الأسطى إبراهيم حسن');
  const [workLine, setWorkLine] = useState('خط أولادي 1');
  const inputQuantity = bundle.quantity;
  const [acceptedQuantity, setAcceptedQuantity] = useState(bundle.quantity);
  const [rejectedQuantity, setRejectedQuantity] = useState(0);
  const [scrapQuantity, setScrapQuantity] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sumCheck = acceptedQuantity + rejectedQuantity + scrapQuantity;
  const isQuantityValid = sumCheck === inputQuantity;

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isQuantityValid) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const updatedBundle: CuttingBundle = {
        ...bundle,
        current_stage_code: toStageCode,
        quantity: acceptedQuantity,
        status: scrapQuantity >= bundle.quantity ? 'scrapped' : rejectedQuantity > 0 ? 'held_for_qc' : 'active',
      };

      onTransferSuccess(updatedBundle);
      onClose();
    }, 500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`بطاقة الحزمة ومسار التشغيل: ${bundle.bundle_code}`}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Printable Bundle Card Look */}
        <div className="p-4 rounded-xl bg-slate-900 border-2 border-dashed border-slate-700 space-y-3 font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-sm text-slate-100">{bundle.bundle_code}</span>
            </div>
            <Badge variant="info">حزمة رقم #{bundle.bundle_number}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block text-[10px]">اللون</span>
              <span className="text-slate-200 font-bold">{bundle.color_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">المقاس</span>
              <span className="text-indigo-400 font-bold text-sm">{bundle.size_name}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">العدد بالحزمة</span>
              <span className="text-emerald-400 font-bold text-sm">{bundle.quantity} قطعة</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span>المرحلة الحالية: [{bundle.current_stage_code}]</span>
            <span className="text-slate-500">باركود تتبع خطوط الإنتاج</span>
          </div>
        </div>

        {/* Stage Transfer Form */}
        <form onSubmit={handleTransfer} className="space-y-3">
          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pt-1">
            <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
            <span>تسليم الحزمة ونقلها للمرحلة التالية</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                المرحلة المستهدفة للتشغيل
              </label>
              <select
                value={toStageCode}
                onChange={(e) => setToStageCode(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="assembly">التجهيز والتجميع (Assembly)</option>
                <option value="sewing">خط الخياطة والتجميع (Sewing)</option>
                <option value="finishing">التشطيب وإزالة الخيوط (Finishing)</option>
                <option value="ironing">الكي بالبخار (Ironing)</option>
                <option value="packing">الفحص النهائي والتعبئة (Packing)</option>
                <option value="completed">اكتملت بالكامل (Completed)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                خط الإنتاج / الورشة
              </label>
              <input
                type="text"
                required
                value={workLine}
                onChange={(e) => setWorkLine(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              اسم العامل / رئيس المرحلة المستلم
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Quantities Breakdown */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[11px] font-semibold text-slate-300 block">
              مطابقة الكميات المسلمة والمقبولة والهالك
            </span>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">قطع مقبولة سليمة</label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={acceptedQuantity}
                  onChange={(e) => setAcceptedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-emerald-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">معيب (إعادة تشغيل)</label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={rejectedQuantity}
                  onChange={(e) => setRejectedQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-amber-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">هالك نهائي (Scrap)</label>
                <input
                  type="number"
                  min="0"
                  max={inputQuantity}
                  value={scrapQuantity}
                  onChange={(e) => setScrapQuantity(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-xs p-2 text-red-400 font-mono font-bold"
                />
              </div>
            </div>

            {!isQuantityValid && (
              <div className="flex items-center gap-1.5 text-red-400 text-[11px] pt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>
                  مجموع الكميات ({sumCheck}) لا يساوي رصيد الحزمة الحالي ({inputQuantity}).
                </span>
              </div>
            )}
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
              تسجيل الحركة ونقل الحزمة
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

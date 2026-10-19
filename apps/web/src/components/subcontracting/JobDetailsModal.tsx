import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TrendingUp, Scissors } from 'lucide-react';
import type { JobOrder, JobProfitability } from '../../types';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrder: JobOrder | null;
  profitability?: JobProfitability | null;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  isOpen,
  onClose,
  jobOrder,
  profitability,
}) => {
  if (!jobOrder) return null;

  const deliveredPercentage = jobOrder.total_target_quantity > 0
    ? Math.min(100, Math.round((jobOrder.total_delivered_quantity / jobOrder.total_target_quantity) * 100))
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`ملف أمر التشغيل الشامل — ${jobOrder.order_number}`}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Header summary banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{jobOrder.customer_name}</span>
                <Badge variant={jobOrder.status === 'completed' ? 'success' : jobOrder.status === 'in_progress' ? 'info' : 'neutral'}>
                  {jobOrder.status}
                </Badge>
              </div>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                نوع الخدمة: {jobOrder.service_type === 'contract_cutting' ? 'خدمة قص للغير (Contract Cutting)' : 'تصنيع كامل للغير (CMT)'}
              </span>
            </div>
            <div className="text-left font-mono">
              <span className="text-xs text-slate-600 dark:text-slate-400 block">سعر الوحدة المتفق عليه</span>
              <strong className="text-primary dark:text-[#fca5a5] text-base">{jobOrder.unit_rate} ج.م</strong>
              <span className="text-[10px] text-slate-500 block">/{jobOrder.pricing_basis}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>نسبة الإنجاز والتسليم:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{deliveredPercentage}% ({jobOrder.total_delivered_quantity} من {jobOrder.total_target_quantity} قطعة)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#460809] to-emerald-500 transition-all duration-500"
                style={{ width: `${deliveredPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Profitability metrics card */}
        {profitability && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary dark:text-[#fca5a5] text-xs font-bold">
                <TrendingUp className="w-4 h-4" />
                <span>مؤشرات الربحية الصناعية للأمر (Job Profitability)</span>
              </div>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">هامش: {profitability.margin_percentage}%</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 shadow-xs">
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">إيراد الخدمة</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{profitability.service_revenue.toLocaleString()} ج.م</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 shadow-xs">
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">تشغيل خارجي</span>
                <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">{profitability.external_operations_cost.toLocaleString()} ج.م</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 shadow-xs">
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">خامات العميل</span>
                <strong className="text-slate-700 dark:text-slate-300 font-mono text-sm">0.00 ج.م (أمانة)</strong>
              </div>
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/40 shadow-xs">
                <span className="text-slate-600 dark:text-slate-400 block mb-0.5">هامش الربح المباشر</span>
                <strong className="text-primary dark:text-[#fca5a5] font-mono text-sm">{profitability.gross_margin.toLocaleString()} ج.م</strong>
              </div>
            </div>

            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
              *{profitability.notes}
            </p>
          </div>
        )}

        {/* Size/color matrix */}
        {jobOrder.items && jobOrder.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-primary dark:text-[#fca5a5]" />
              <span>مصفوفة المقاسات والألوان</span>
            </h4>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3">المقاس</th>
                    <th className="py-2 px-3">اللون</th>
                    <th className="py-2 px-3">المطلوب</th>
                    <th className="py-2 px-3">المسلم</th>
                    <th className="py-2 px-3">سعر القطعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                  {jobOrder.items.map((it) => (
                    <tr key={it.id || it.size_name}>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-200">{it.size_name || '—'}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{it.color_name || '—'}</td>
                      <td className="py-2 px-3 font-mono text-slate-900 dark:text-slate-200">{it.target_quantity}</td>
                      <td className="py-2 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold">{it.delivered_quantity || 0}</td>
                      <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">{it.unit_rate} ج.م</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Dates and terms */}
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block">تاريخ البدء المخطط:</span>
            <strong className="text-slate-900 dark:text-slate-200 font-mono">{jobOrder.planned_start_date || '—'}</strong>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400 block">تاريخ التسليم المستهدف:</span>
            <strong className="text-slate-900 dark:text-slate-200 font-mono">{jobOrder.target_delivery_date || '—'}</strong>
          </div>
        </div>

        {jobOrder.notes && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
            <span className="text-slate-600 dark:text-slate-400 block mb-1 font-semibold">ملاحظات وشروط الاتفاق:</span>
            <p className="whitespace-pre-wrap">{jobOrder.notes}</p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};

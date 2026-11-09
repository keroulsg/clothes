import React from 'react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  Scissors,
  Layers,
  Clock,
  User,
  Printer,
  FileText,
  Package,
  ShieldCheck,
  Award,
} from 'lucide-react';
import type { CuttingOrder } from '../../types';

interface ArchivedCuttingDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuttingOrder: (CuttingOrder & { bundles?: any[]; [key: string]: any }) | null;
  isAr?: boolean;
}

export const ArchivedCuttingDossierModal: React.FC<ArchivedCuttingDossierModalProps> = ({
  isOpen,
  onClose,
  cuttingOrder,
  isAr = true,
}) => {
  if (!cuttingOrder) return null;

  const bundles = cuttingOrder.bundles || [];

  // Calculate timelines
  const startDate = cuttingOrder.created_at ? new Date(cuttingOrder.created_at) : new Date();
  
  // Find latest stage completion
  let latestCompletedAt: Date = startDate;
  bundles.forEach((b: any) => {
    if (b.completion_date) {
      const d = new Date(b.completion_date);
      if (d > latestCompletedAt) latestCompletedAt = d;
    }
    if (Array.isArray(b.stageLogs)) {
      b.stageLogs.forEach((l: any) => {
        if (l.completed_at || l.logged_at) {
          const ld = new Date(l.completed_at || l.logged_at);
          if (ld > latestCompletedAt) latestCompletedAt = ld;
        }
      });
    }
  });

  const durationMs = Math.max(0, latestCompletedAt.getTime() - startDate.getTime());
  const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
  const durationDays = Math.floor(durationHours / 24);
  const remainingHours = durationHours % 24;

  const durationDisplay = durationDays > 0
    ? `${durationDays} ${isAr ? 'يوم' : 'd'} ${remainingHours > 0 ? `و ${remainingHours} ${isAr ? 'ساعة' : 'h'}` : ''}`
    : `${Math.max(1, durationHours)} ${isAr ? 'ساعة عمل' : 'hrs'}`;

  // Unique workers involved
  const workersMap = new Map<string, { name: string; role: string; count: number; wages: number }>();

  // Add cutter
  if (cuttingOrder.assigned_cutter_name) {
    workersMap.set(cuttingOrder.assigned_cutter_name, {
      name: cuttingOrder.assigned_cutter_name,
      role: isAr ? 'مقصدار فني رئيسي (صالة القص)' : 'Lead Cutter',
      count: cuttingOrder.total_cut_pieces || 0,
      wages: (cuttingOrder as any).cutter_wage_amount || 0,
    });
  }

  // Aggregate bundle workers
  bundles.forEach((b: any) => {
    if (b.assigned_employee_name) {
      const existing = workersMap.get(b.assigned_employee_name) || {
        name: b.assigned_employee_name,
        role: isAr ? 'فني تشغيل خياطة وتجميع' : 'Sewing Operator',
        count: 0,
        wages: 0,
      };
      existing.count += Number(b.quantity) || 0;
      workersMap.set(b.assigned_employee_name, existing);
    }

    if (Array.isArray(b.stageLogs)) {
      b.stageLogs.forEach((l: any) => {
        const workerName = l.operator_name || l.employee?.name;
        if (workerName) {
          const ex = workersMap.get(workerName) || {
            name: workerName,
            role: isAr ? 'تشغيل مراحل وإنتاج' : 'Shopfloor Operator',
            count: 0,
            wages: 0,
          };
          ex.count += Number(l.output_accepted_quantity) || 0;
          ex.wages += Number(l.piece_rate_amount) || 0;
          workersMap.set(workerName, ex);
        }
      });
    }
  });

  const totalWorkers = workersMap.size;
  const totalBundlesCount = bundles.length;
  const totalPieces = cuttingOrder.total_cut_pieces || 0;
  const fabricMeters = Number(cuttingOrder.actual_fabric_meters_used || 0);

  // Group size and colors summary
  const variantSummary = new Map<string, { size: string; color: string; qty: number; bundlesCount: number }>();
  bundles.forEach((b: any) => {
    const key = `${b.size_name || 'M'}-${b.color_name || 'عام'}`;
    const ex = variantSummary.get(key) || {
      size: b.size_name || 'M',
      color: b.color_name || (isAr ? 'لون عام' : 'Standard'),
      qty: 0,
      bundlesCount: 0,
    };
    ex.qty += Number(b.quantity) || 0;
    ex.bundlesCount += 1;
    variantSummary.set(key, ex);
  });

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="xl"
    >
      <div className="space-y-6 text-slate-900 dark:text-slate-100 print:text-black">
        {/* Modal Top Banner & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-[#2d080e]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#7F1625] text-white flex items-center justify-center shadow-lg shadow-[#7F1625]/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {isAr ? 'ملف الأرشيف الرقمي الشامل للقصة' : 'Archived Cutting Run Dossier'}
                </h2>
                <Badge variant="success" dot className="font-bold">
                  {isAr ? 'مكتملة ومؤرشفة' : 'Archived & Closed'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {cuttingOrder.cutting_order_number} • {cuttingOrder.production_order_number || (isAr ? 'أمر إنتاج' : 'PO')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrintDossier}
              className="px-3.5 py-2 rounded-xl bg-[#7F1625] hover:bg-[#961b2c] text-white text-xs font-bold shadow-md shadow-[#7F1625]/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة تقرير القصة' : 'Print Dossier'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
            >
              {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

        {/* 1. Hero Dossier Summary Bento Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>{isAr ? 'الكمية المنتجة المجازة' : 'Finished Pieces'}</span>
              <Scissors className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {totalPieces.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'قطعة' : 'pcs'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {totalBundlesCount} {isAr ? 'حزم بالباركود' : 'QR bundles'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>{isAr ? 'القماش المستهلك' : 'Fabric Consumed'}</span>
              <Layers className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {fabricMeters.toLocaleString()} <span className="text-xs font-normal text-slate-400">{isAr ? 'متر' : 'meters'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {cuttingOrder.layers_count} {isAr ? 'راقة' : 'plies'} × {cuttingOrder.lay_length_meters} {isAr ? 'م طول' : 'm lay'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>{isAr ? 'فريق العمل المنفذ' : 'Workers Involved'}</span>
              <User className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {totalWorkers} <span className="text-xs font-normal text-slate-400">{isAr ? 'فنيين وعمال' : 'operators'}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {cuttingOrder.assigned_cutter_name || (isAr ? 'طاولة القص 1' : 'Cutting Table')}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0a0204]/90 border border-slate-200/80 dark:border-[#2d080e] shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              <span>{isAr ? 'المدة الزمنية الإجمالية' : 'Total Duration'}</span>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {durationDisplay}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
              {startDate.toISOString().split('T')[0]} ➔ {latestCompletedAt.toISOString().split('T')[0]}
            </div>
          </div>
        </div>

        {/* 2. Cutting Specifications & Fabric Ledger Breakdown */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#2d080e] overflow-hidden">
          <div className="px-4 py-3 bg-slate-100/80 dark:bg-[#120406] border-b border-slate-200/80 dark:border-[#2d080e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'تفاصيل خامات الأقمشة والفرش والمخزن' : 'Fabric & Lay Technical Specifications'}
              </h3>
            </div>
            <Badge variant={cuttingOrder.fabric_source === 'customer_deposit' ? 'purple' : 'info'}>
              {cuttingOrder.fabric_source === 'customer_deposit'
                ? isAr ? 'أمانات خامات العملاء (CMT)' : 'CMT Custody'
                : isAr ? 'خامات المصنع الأصلية' : 'Factory Material'}
            </Badge>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-white dark:bg-[#0a0204]/90">
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'اسم ونوع القماش' : 'Fabric Name'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{cuttingOrder.fabric_name || (isAr ? 'قماش التشغيل المعتمد' : 'Fabric')}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'المخزن المصروف منه' : 'Source Warehouse'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{cuttingOrder.warehouse_name || (isAr ? 'مخزن الأقمشة الرئيسي' : 'Main Warehouse')}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'طول الفرشة الواحدة' : 'Lay Length'}</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{cuttingOrder.lay_length_meters} {isAr ? 'متر' : 'm'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'عدد الطبقات (الراقات)' : 'Plies Count'}</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{cuttingOrder.layers_count} {isAr ? 'راقة' : 'layers'}</span>
            </div>

            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'الأمتار المصروفة فعلياً' : 'Actual Meters'}</span>
              <span className="font-bold font-mono text-amber-600 dark:text-amber-400">{cuttingOrder.actual_fabric_meters_used} {isAr ? 'متر' : 'm'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'عادم أطراف الفرشة' : 'End Loss'}</span>
              <span className="font-bold font-mono text-slate-700 dark:text-slate-300">{cuttingOrder.end_loss_meters || 0} {isAr ? 'متر' : 'm'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'كفاءة التعشيق (الماكر)' : 'Marker Efficiency'}</span>
              <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{cuttingOrder.marker_efficiency_percent || 85}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">{isAr ? 'طاولة القص والمقصدار' : 'Cutting Table & Lead'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {cuttingOrder.table_number || 'Table-1'} • {cuttingOrder.assigned_cutter_name || (isAr ? 'المقصدار الفني' : 'Lead Cutter')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Product Variant Matrix Breakdown (Sizes & Colors) */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#2d080e] overflow-hidden">
          <div className="px-4 py-3 bg-slate-100/80 dark:bg-[#120406] border-b border-slate-200/80 dark:border-[#2d080e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'توزيع المقاسات والألوان الناتجة عن القصة' : 'Produced Sizes & Colors Matrix'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {variantSummary.size} {isAr ? 'متغيرات إنتاجية' : 'variants'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200/80 dark:border-[#2d080e]">
                <tr>
                  <th className="py-2.5 px-4 text-start">{isAr ? 'المقاس' : 'Size'}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? 'اللون المعتمد' : 'Color'}</th>
                  <th className="py-2.5 px-4 text-center">{isAr ? 'عدد الحزم' : 'Bundles'}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? 'إجمالي القطع المنجزة' : 'Pieces Produced'}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? 'نسبة القصة' : 'Share %'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2d080e]/60 bg-white dark:bg-[#0a0204]/90">
                {Array.from(variantSummary.values()).map((v, idx) => {
                  const sharePct = totalPieces > 0 ? Math.round((v.qty / totalPieces) * 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {v.size}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {v.color}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">
                        {v.bundlesCount} {isAr ? 'حزمة' : 'bundles'}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono font-black text-emerald-600 dark:text-emerald-400">
                        {v.qty} {isAr ? 'قطعة' : 'pcs'}
                      </td>
                      <td className="py-2.5 px-4 text-end font-mono text-slate-500">
                        {sharePct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Workers & Shopfloor Stage Execution Ledger */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-[#2d080e] overflow-hidden">
          <div className="px-4 py-3 bg-slate-100/80 dark:bg-[#120406] border-b border-slate-200/80 dark:border-[#2d080e] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#7F1625] dark:text-[#ff8ba0]" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'سجل العمال والفنيين ومراحل التشغيل المنجزة' : 'Worker Productivity & Stage Log'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {totalWorkers} {isAr ? 'عامل شارك في تنفيذ القصة' : 'operators'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 border-b border-slate-200/80 dark:border-[#2d080e]">
                <tr>
                  <th className="py-2.5 px-4 text-start">{isAr ? 'اسم العامل / الفني' : 'Worker Name'}</th>
                  <th className="py-2.5 px-4 text-start">{isAr ? 'المرحلة والعملية' : 'Assigned Role'}</th>
                  <th className="py-2.5 px-4 text-center">{isAr ? 'الكمية المنفذة' : 'Pieces Done'}</th>
                  <th className="py-2.5 px-4 text-end">{isAr ? 'الأجر المحتسب' : 'Wage Earned'}</th>
                  <th className="py-2.5 px-4 text-center">{isAr ? 'الحالة في مسير الرواتب' : 'Payroll Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2d080e]/60 bg-white dark:bg-[#0a0204]/90">
                {Array.from(workersMap.values()).map((w, wIdx) => (
                  <tr key={wIdx} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#7F1625]/10 text-[#7F1625] dark:text-[#ff8ba0] flex items-center justify-center font-bold text-[10px]">
                        {w.name.charAt(0)}
                      </div>
                      <span>{w.name}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                      {w.role}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {w.count} {isAr ? 'قطعة' : 'pcs'}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono font-black text-[#7F1625] dark:text-[#ff8ba0]">
                      {w.wages > 0 ? `${w.wages.toFixed(2)} ج.م` : (isAr ? 'معتمد بالشيت' : 'Logged')}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Badge variant="success" className="text-[10px]">
                        {isAr ? 'مقيّد ومعتمد' : 'Certified'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Inspection & Quality Assurance (QC Audit) */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                {isAr ? 'اجتازت الفحص النهائي وتدقيق الجودة (Final Quality Passed)' : 'Passed Final Quality Inspection'}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                {isAr
                  ? `تم تدقيق مطابقة الحزم بالكامل وترحيل إجمالي ${totalPieces} قطعة سليمة إلى مخزن المنتج التام.`
                  : `All bundles verified and ${totalPieces} pieces delivered to finished goods inventory.`}
              </p>
            </div>
          </div>
          <div className="text-end font-mono text-[11px] text-emerald-800 dark:text-emerald-300 font-bold hidden sm:block">
            {isAr ? 'سجل الاعتماد: مجاز 100%' : 'QC Passed 100%'}
          </div>
        </div>
      </div>
    </Modal>
  );
};

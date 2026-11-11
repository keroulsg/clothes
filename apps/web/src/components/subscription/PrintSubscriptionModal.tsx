import React from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import type { TenantSubscriptionReport } from '../../types';

interface PrintSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TenantSubscriptionReport;
  activeOverrides?: any[];
  isAr?: boolean;
}

export const PrintSubscriptionModal: React.FC<PrintSubscriptionModalProps> = ({
  isOpen,
  onClose,
  report,
  activeOverrides = [],
  isAr = true,
}) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  const metersList = report.meters ? Object.values(report.meters) : [];
  const printDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 print:my-0 print:border-none print:shadow-none print:w-full print:max-w-none print:rounded-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#7F1625] flex items-center justify-center text-white font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {isAr ? 'شهادة اعتماد سعة المصنع والاشتراك السحابي' : 'Factory Subscription & Capacity Certificate'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {report.subscription.plan_code.toUpperCase()} • {report.tenant_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#7F1625] hover:bg-[#961b2c] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>{isAr ? 'طباعة الشهادة (A4)' : 'Print Certificate (A4)'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ─── Printable Document Area (A4 Spec) ─── */}
        <div className="p-8 sm:p-12 print:p-6 space-y-6 bg-white text-slate-900 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
            <div className="space-y-1">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 mb-1">
                {isAr ? 'منظومة إدارة مصانع الملابس الجاهزة • GarmentOS' : 'Garment Factory OS • Subscription Certificate'}
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {isAr ? 'مصنع البطل الروماني لصناعة الملابس الجاهزة' : 'Al-Batal Al-Romany Garment Factory'}
              </h1>
              <p className="text-xs text-slate-600">
                {isAr ? 'السجل الصناعي: 104928 • مصلحة الضرائب المصرية: 593-201-944 • جمهورية مصر العربية' : 'Industrial Reg: 104928 • Tax ID: 593-201-944 • Arab Republic of Egypt'}
              </p>
            </div>

            <div className="text-left space-y-1">
              <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-1 bg-slate-50">
                <QrCode className="w-10 h-10 text-slate-700" />
                <span className="text-[8px] font-mono text-slate-500">VERIFIED</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Ref: CERT-{new Date().getFullYear()}-{report.tenant_id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Certificate Title Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-2">
            <div className="text-xs uppercase tracking-widest text-[#7F1625] font-black">
              {isAr ? 'وثيقة اعتماد تشغيلية رسمية' : 'OFFICIAL OPERATIONAL CAPACITY ACCREDITATION'}
            </div>
            <h2 className="text-xl font-black text-slate-900">
              {isAr ? 'شهادة تسجيل وتفعيل السعات التشغيلية للمصنع' : 'Certificate of Factory Cloud Capacity & Quota Allocation'}
            </h2>
            <p className="text-xs text-slate-600 max-w-xl mx-auto">
              {isAr
                ? 'تشهد إدارة المنصة بأن المنشأة الصناعية مسجلة ومفعلة بالسعات والمقاييس المعتمدة أدناه وفق شروط التشغيل وضمان الحصانة لخطوط القص.'
                : 'This certifies that the manufacturing tenant has been allocated active cloud resources and production quotas in accordance with the Soft Limit Operational Policy.'}
            </p>
          </div>

          {/* Plan & Cycle Summary Cards */}
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="p-3 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] text-slate-500">{isAr ? 'الباقة المفعلة' : 'Active Plan'}</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {isAr ? report.subscription.plan_name_ar : report.subscription.plan_name_en}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] text-slate-500">{isAr ? 'دورة الاشتراك' : 'Billing Cycle'}</div>
              <div className="text-sm font-black text-slate-900 mt-0.5">
                {report.subscription.billing_cycle === 'annual' ? (isAr ? 'سنوي' : 'Annual') : (isAr ? 'شهري' : 'Monthly')}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] text-slate-500">{isAr ? 'تاريخ التجديد' : 'Renewal Date'}</div>
              <div className="text-sm font-black text-slate-900 mt-0.5 font-mono">
                {report.subscription.current_period_end || '2026-12-04'}
              </div>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg bg-white">
              <div className="text-[11px] text-slate-500">{isAr ? 'حالة السريان' : 'Status'}</div>
              <div className="text-sm font-black text-emerald-700 mt-0.5 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isAr ? 'ساري ومعتمد' : 'ACTIVE'}</span>
              </div>
            </div>
          </div>

          {/* Active Overrides Notice (if any) */}
          {activeOverrides.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-1">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <span>⚠️ {isAr ? 'استثناءات تشغيلية طارئة سارية المفعول:' : 'Active Emergency Operational Overrides:'}</span>
              </div>
              {activeOverrides.map((ov, idx) => (
                <div key={idx} className="text-amber-800 text-[11px]">
                  • {ov.meter_key}: حد مؤقت {ov.temporary_limit} (ينتهي في: {ov.expires_at ? new Date(ov.expires_at).toLocaleDateString('ar-EG') : 'خلال أيام'}) - السبب: {ov.reason}
                </div>
              ))}
            </div>
          )}

          {/* 12 Meters Capacity Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {isAr ? 'جدول السعات والعدادات المعتمدة (12 Meter Dimensions):' : 'Approved Factory Resource & Capacity Allocations:'}
            </h3>
            <table className="w-full text-xs border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-2 text-right">{isAr ? 'م' : '#'}</th>
                  <th className="p-2 text-right">{isAr ? 'بيان العداد / السعة' : 'Meter Dimension'}</th>
                  <th className="p-2 text-center">{isAr ? 'الاستهلاك الفعلي' : 'Current Usage'}</th>
                  <th className="p-2 text-center">{isAr ? 'السعة القصوى المعتمدة' : 'Approved Limit'}</th>
                  <th className="p-2 text-center">{isAr ? 'نسبة الاستهلاك' : '% Used'}</th>
                  <th className="p-2 text-center">{isAr ? 'نوع الحماية' : 'Limit Type'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {metersList.map((m, idx) => (
                  <tr key={m.meter_key} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                    <td className="p-2 font-medium">
                      <div>{isAr ? m.name_ar : m.name_en}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{m.meter_key}</div>
                    </td>
                    <td className="p-2 text-center font-bold font-mono">
                      {m.current_usage} <span className="font-normal text-slate-500 text-[10px]">{m.unit}</span>
                    </td>
                    <td className="p-2 text-center font-bold font-mono">
                      {m.limit >= 999999 ? (isAr ? 'غير محدود (∞)' : 'Unlimited') : `${m.limit} ${m.unit}`}
                    </td>
                    <td className="p-2 text-center font-mono">
                      {m.limit >= 999999 ? '0%' : `${m.percent_used}%`}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.limit_type === 'hard'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.limit_type === 'hard' ? (isAr ? 'حد حاسم (Hard)' : 'Hard Limit') : (isAr ? 'حصانة إنتاج (Soft)' : 'Soft Limit')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Operational Soft-Limit Guarantee Note */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-[11px] text-slate-700 leading-relaxed">
            <span className="font-bold">{isAr ? 'بند الحصانة التشغيلية لصالة القص والإنتاج:' : 'Operational Immunity Clause:'} </span>
            {isAr
              ? 'يتمتع المصنع بحصانة تشغيلية تلقائية، تضمن عدم توقف فرشات القص وأوامر الإنتاج المعتمدة أثناء الوردية في حال وصول عداد الاستهلاك إلى الحد الأقصى، مع إتاحة فترة سماح لتسوية الترقية.'
              : 'The manufacturing tenant is granted operational immunity ensuring mid-shift cutting operations and approved production runs will not be suspended upon hitting limits.'}
          </div>

          {/* Signatures & Accreditation Footer */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs text-slate-700 border-t border-slate-200">
            <div>
              <div className="font-bold text-slate-900">{isAr ? 'مدير صالة الإنتاج والقص' : 'Production Floor Manager'}</div>
              <div className="h-12 border-b border-dashed border-slate-300 mt-2" />
              <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'التوقيع والاعتماد' : 'Signature'}</div>
            </div>
            <div>
              <div className="font-bold text-slate-900">{isAr ? 'ختم المصنع الرسمي' : 'Official Factory Stamp'}</div>
              <div className="h-12 flex items-center justify-center mt-2">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center text-[9px] text-slate-400 text-center">
                  {isAr ? 'خاتم الاعتماد' : 'STAMP'}
                </div>
              </div>
            </div>
            <div>
              <div className="font-bold text-slate-900">{isAr ? 'إدارة المنظومة السحابية' : 'GarmentOS Cloud Authority'}</div>
              <div className="h-12 border-b border-dashed border-slate-300 mt-2 flex items-center justify-center">
                <span className="font-mono text-emerald-800 text-[10px] font-bold">DIGITALLY CERTIFIED • {printDate}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">{isAr ? 'اعتماد سحابي آلي' : 'Automated Verification'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

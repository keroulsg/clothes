import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, AlertTriangle, Building2, ShieldCheck } from 'lucide-react';

interface PrintReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  arData: any;
  apData: any;
  treasuryData?: any;
  inventoryData?: any;
  factoryName?: string;
}

export const PrintReconciliationModal: React.FC<PrintReconciliationModalProps> = ({
  isOpen,
  onClose,
  arData,
  apData,
  treasuryData,
  inventoryData,
  factoryName = 'مصنع البطل الروماني للملابس الجاهزة',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isAllMatched =
    Boolean(arData?.is_matched) &&
    Boolean(apData?.is_matched) &&
    (!treasuryData || Boolean(treasuryData?.is_matched)) &&
    (!inventoryData || Boolean(inventoryData?.is_matched));

  const formatEGP = (val: number | undefined | null) => {
    const num = Number(val || 0);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ج.م';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-[#111217] border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">معاينة وطباعة تقرير التدقيق والمطابقة المحاسبية (A4)</h2>
              <p className="text-xs text-neutral-400">شهادة مطابقة حسابات المراقبة بالأستاذ العام مع الكشوف الفرعية</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-xl text-sm shadow-lg shadow-amber-900/20 flex items-center gap-2 transition"
            >
              <Printer className="w-4 h-4" />
              طباعة التقرير (Print A4)
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          className="p-8 sm:p-10 space-y-6 text-neutral-200 bg-[#0c0d12] print:bg-white print:text-black print:p-6 print:space-y-4"
          dir="rtl"
        >
          {/* Header */}
          <div className="border-b-2 border-amber-500/30 pb-6 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white print:text-black tracking-tight">{factoryName}</h1>
                <p className="text-xs font-semibold text-amber-400 print:text-neutral-700 mt-0.5">
                  الإدارة المالية والحسابات العامة • قسم المراجعة والرقابة الداخلية
                </p>
                <p className="text-[11px] text-neutral-400 print:text-neutral-600">
                  نظام GarmentOS الصناعي المتكامل لإدارة مصانع الملابس الجاهزة
                </p>
              </div>
            </div>

            <div className="text-left text-xs space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 print:border-black print:text-black print:bg-neutral-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                تقرير تدقيق رسمي معتمد
              </div>
              <div className="text-neutral-400 print:text-neutral-600 pt-1">
                التاريخ: <span className="font-semibold text-white print:text-black">{currentDate}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                الوقت: <span className="font-semibold text-white print:text-black">{currentTime}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600 font-mono text-[10px]">
                Ref: AUD-REC-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}-GL
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="text-center py-2 bg-gradient-to-r from-transparent via-amber-950/20 to-transparent border-y border-amber-500/20 print:border-neutral-300 print:bg-neutral-50">
            <h2 className="text-lg font-black text-amber-400 print:text-black">
              محضر مطابقة حسابات المراقبة بالأستاذ العام مع الدفاتر المساعدة (Subledger Reconciliation)
            </h2>
            <p className="text-xs text-neutral-400 print:text-neutral-600 mt-0.5">
              فحص التوازن المالي ومطابقة ذمم العملاء والموردين وأرصدة السيولة النقدية والمخزون
            </p>
          </div>

          {/* KPI Summary 4 Bento Blocks */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* AR Card */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">مراقبة العملاء (AR)</div>
              <div className="text-xs font-bold text-neutral-300 print:text-black mt-1">
                الأستاذ: {formatEGP(arData?.control_account?.gl_balance)}
              </div>
              <div className="text-xs font-bold text-neutral-300 print:text-black">
                الكشوف: {formatEGP(arData?.subledger_total)}
              </div>
              <div
                className={`text-xs font-black mt-1.5 pt-1 border-t border-white/10 print:border-neutral-300 flex items-center justify-between ${
                  arData?.is_matched ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'
                }`}
              >
                <span>الانحراف:</span>
                <span>{formatEGP(arData?.variance)}</span>
              </div>
            </div>

            {/* AP Card */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">مراقبة الموردين (AP)</div>
              <div className="text-xs font-bold text-neutral-300 print:text-black mt-1">
                الأستاذ: {formatEGP(apData?.control_account?.gl_balance)}
              </div>
              <div className="text-xs font-bold text-neutral-300 print:text-black">
                الكشوف: {formatEGP(apData?.subledger_total)}
              </div>
              <div
                className={`text-xs font-black mt-1.5 pt-1 border-t border-white/10 print:border-neutral-300 flex items-center justify-between ${
                  apData?.is_matched ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'
                }`}
              >
                <span>الانحراف:</span>
                <span>{formatEGP(apData?.variance)}</span>
              </div>
            </div>

            {/* Treasury Card */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">الخزائن والبنوك (Treasury)</div>
              <div className="text-xs font-bold text-neutral-300 print:text-black mt-1">
                الأستاذ: {formatEGP(treasuryData?.gl_total)}
              </div>
              <div className="text-xs font-bold text-neutral-300 print:text-black">
                الفعلي: {formatEGP(treasuryData?.actual_treasury_total)}
              </div>
              <div
                className={`text-xs font-black mt-1.5 pt-1 border-t border-white/10 print:border-neutral-300 flex items-center justify-between ${
                  treasuryData?.is_matched
                    ? 'text-emerald-400 print:text-emerald-700'
                    : 'text-amber-400 print:text-amber-700'
                }`}
              >
                <span>الانحراف:</span>
                <span>{formatEGP(treasuryData?.variance)}</span>
              </div>
            </div>

            {/* Inventory Card */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50">
              <div className="text-[11px] font-semibold text-neutral-400 print:text-neutral-700">مخزون المستودعات (Inventory)</div>
              <div className="text-xs font-bold text-neutral-300 print:text-black mt-1">
                الأستاذ: {formatEGP(inventoryData?.gl_inventory_total)}
              </div>
              <div className="text-xs font-bold text-neutral-300 print:text-black">
                الجرد: {formatEGP(inventoryData?.warehouse_valuation_total)}
              </div>
              <div
                className={`text-xs font-black mt-1.5 pt-1 border-t border-white/10 print:border-neutral-300 flex items-center justify-between ${
                  inventoryData?.is_matched
                    ? 'text-emerald-400 print:text-emerald-700'
                    : 'text-amber-400 print:text-amber-700'
                }`}
              >
                <span>الانحراف:</span>
                <span>{formatEGP(inventoryData?.variance)}</span>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-3 text-xs font-bold ${
              isAllMatched
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 print:text-emerald-800 print:bg-emerald-50 print:border-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 print:text-rose-800 print:bg-rose-50 print:border-rose-300'
            }`}
          >
            {isAllMatched ? (
              <>
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  الحالة العامة: جميع حسابات المراقبة مطابقة 100% مع الدفاتر الفرعية وسجلات الخزينة والمخزون دون أي
                  فروق معلقة.
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>
                  تنبيه تدقيق: توجد فروق محاسبية بين رصيد الأستاذ العام والدفاتر الفرعية تتطلب اعتماد قيود تسوية ومطابقة
                  آلية أو ترحيل الفواتير المعلقة.
                </span>
              </>
            )}
          </div>

          {/* Section 1: Customers Subledger Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 print:text-black flex items-center gap-1.5">
              <span>1. كشف حسابات العملاء المكونة لرصيد كشوف الحسابات (AR Subledger Breakdown)</span>
            </h3>
            <div className="border border-white/10 print:border-neutral-300 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                  <tr>
                    <th className="py-1.5 px-3">كود العميل</th>
                    <th className="py-1.5 px-3">اسم العميل / الشركة</th>
                    <th className="py-1.5 px-3">هاتف الاتصال</th>
                    <th className="py-1.5 px-3">المسؤول</th>
                    <th className="py-1.5 px-3 text-left">فواتير مستحقة</th>
                    <th className="py-1.5 px-3 text-left">رصيد أول</th>
                    <th className="py-1.5 px-3 text-left">إجمالي المديونية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                  {arData?.breakdown?.length > 0 ? (
                    arData.breakdown.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                        <td className="py-1.5 px-3 font-mono text-[11px] text-amber-300 print:text-black">{c.code}</td>
                        <td className="py-1.5 px-3 font-medium text-white print:text-black">{c.name}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-400 print:text-neutral-600">
                          {c.phone || '-'}
                        </td>
                        <td className="py-1.5 px-3 text-neutral-400 print:text-neutral-600">{c.contact_person || '-'}</td>
                        <td className="py-1.5 px-3 text-left font-mono">{formatEGP(c.invoices_due)}</td>
                        <td className="py-1.5 px-3 text-left font-mono">{formatEGP(c.opening_balance)}</td>
                        <td className="py-1.5 px-3 text-left font-mono font-bold text-amber-400 print:text-black">
                          {formatEGP(c.total_balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-neutral-500 print:text-neutral-600 text-xs">
                        لا توجد مديونيات عملاء مستحقة (الرصيد 0.00 ج.م)
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-white/5 print:bg-neutral-100 font-bold border-t border-white/10 print:border-neutral-300">
                  <tr>
                    <td colSpan={6} className="py-1.5 px-3 text-right">
                      إجمالي كشوف العملاء الفرعية:
                    </td>
                    <td className="py-1.5 px-3 text-left font-mono text-amber-300 print:text-black">
                      {formatEGP(arData?.subledger_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 2: Suppliers Subledger Breakdown */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 print:text-black flex items-center gap-1.5">
              <span>2. كشف مستحقات الموردين المكونة لرصيد كشوف الحسابات (AP Subledger Breakdown)</span>
            </h3>
            <div className="border border-white/10 print:border-neutral-300 rounded-lg overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                  <tr>
                    <th className="py-1.5 px-3">كود المورد</th>
                    <th className="py-1.5 px-3">اسم المورد / الشركة</th>
                    <th className="py-1.5 px-3">هاتف الاتصال</th>
                    <th className="py-1.5 px-3">المسؤول</th>
                    <th className="py-1.5 px-3 text-left">فواتير غير مسددة</th>
                    <th className="py-1.5 px-3 text-left">رصيد حساب المورد</th>
                    <th className="py-1.5 px-3 text-left">إجمالي المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                  {apData?.breakdown?.length > 0 ? (
                    apData.breakdown.map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] print:hover:bg-transparent">
                        <td className="py-1.5 px-3 font-mono text-[11px] text-amber-300 print:text-black">{s.code}</td>
                        <td className="py-1.5 px-3 font-medium text-white print:text-black">{s.name}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-neutral-400 print:text-neutral-600">
                          {s.phone || '-'}
                        </td>
                        <td className="py-1.5 px-3 text-neutral-400 print:text-neutral-600">{s.contact_person || '-'}</td>
                        <td className="py-1.5 px-3 text-left font-mono">{formatEGP(s.invoices_due)}</td>
                        <td className="py-1.5 px-3 text-left font-mono">{formatEGP(s.current_balance)}</td>
                        <td className="py-1.5 px-3 text-left font-mono font-bold text-amber-400 print:text-black">
                          {formatEGP(s.total_balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-neutral-500 print:text-neutral-600 text-xs">
                        لا توجد مستحقات موردين معلقة (الرصيد 0.00 ج.م)
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-white/5 print:bg-neutral-100 font-bold border-t border-white/10 print:border-neutral-300">
                  <tr>
                    <td colSpan={6} className="py-1.5 px-3 text-right">
                      إجمالي كشوف الموردين الفرعية:
                    </td>
                    <td className="py-1.5 px-3 text-left font-mono text-amber-300 print:text-black">
                      {formatEGP(apData?.subledger_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Treasury Breakdown */}
          {treasuryData?.breakdown && treasuryData.breakdown.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-amber-400 print:text-black flex items-center gap-1.5">
                <span>3. كشف أرصدة الخزائن والبنوك والمطابقة مع الأستاذ العام (Treasury Accounts)</span>
              </h3>
              <div className="border border-white/10 print:border-neutral-300 rounded-lg overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                    <tr>
                      <th className="py-1.5 px-3">الحساب المالي</th>
                      <th className="py-1.5 px-3">النوع</th>
                      <th className="py-1.5 px-3">حساب الأستاذ العام</th>
                      <th className="py-1.5 px-3 text-left">الرصيد الفعلي</th>
                      <th className="py-1.5 px-3 text-left">رصيد الأستاذ</th>
                      <th className="py-1.5 px-3 text-left">الفارق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                    {treasuryData.breakdown.map((t: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-3 font-medium text-white print:text-black">{t.name}</td>
                        <td className="py-1.5 px-3 text-neutral-400 print:text-neutral-600">
                          {t.type === 'bank' ? 'بنكي' : 'خزينة نقدية'}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-amber-300 print:text-black">
                          {t.gl_account_code ? `[${t.gl_account_code}] ${t.gl_account_name}` : 'غير مربوط'}
                        </td>
                        <td className="py-1.5 px-3 text-left font-mono font-bold text-white print:text-black">
                          {formatEGP(t.actual_balance)}
                        </td>
                        <td className="py-1.5 px-3 text-left font-mono">{formatEGP(t.gl_balance)}</td>
                        <td
                          className={`py-1.5 px-3 text-left font-mono font-bold ${
                            t.is_matched ? 'text-emerald-400 print:text-emerald-700' : 'text-rose-400 print:text-rose-700'
                          }`}
                        >
                          {formatEGP(t.variance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Official Signatures & Certifications */}
          <div className="pt-6 border-t-2 border-white/10 print:border-black print:pt-4">
            <div className="text-center text-xs font-semibold text-neutral-400 print:text-neutral-700 mb-6">
              تم فحص ومراجعة وتدقيق البيانات المحاسبية أعلاه وفقاً لمعايير المحاسبة المصرية والدولية ذات الصلة.
            </div>
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-12">
                <div className="font-bold text-neutral-300 print:text-black">المحاسب المالي المختص</div>
                <div className="border-t border-dashed border-white/20 print:border-black pt-1 text-[11px] text-neutral-400 print:text-neutral-600">
                  التوقيع: ............................
                </div>
              </div>
              <div className="space-y-12">
                <div className="font-bold text-neutral-300 print:text-black">مدقق الحسابات والمراجع الداخلي</div>
                <div className="border-t border-dashed border-white/20 print:border-black pt-1 text-[11px] text-neutral-400 print:text-neutral-600">
                  التوقيع: ............................
                </div>
              </div>
              <div className="space-y-12">
                <div className="font-bold text-neutral-300 print:text-black">المدير المالي ورئيس الحسابات (CFO)</div>
                <div className="border-t border-dashed border-white/20 print:border-black pt-1 text-[11px] text-neutral-400 print:text-neutral-600">
                  التوقيع والخاتم: ............................
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

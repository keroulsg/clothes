import React from 'react';
import {
  Printer,
  X,
  Building2,
  Layers,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface PrintCostSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  costSheet: any;
  isAr: boolean;
}

export const PrintCostSheetModal: React.FC<PrintCostSheetModalProps> = ({
  isOpen,
  onClose,
  costSheet,
  isAr,
}) => {
  if (!isOpen || !costSheet) return null;

  const po = costSheet.production_order || {};
  const model = costSheet.garment_model || po.garment_model || {};
  const orderNumber = po.order_number || costSheet.production_order_id?.slice(0, 8) || 'PO-BATCH';
  const modelName = model.name || (isAr ? 'موديل مصنعي جاهز' : 'Garment Model');
  const modelCode = model.code || '-';
  const totalPieces = Number(costSheet.total_produced_pieces || 0);

  const materialsCost = Number(costSheet.direct_materials_cost || 0);
  const laborCost = Number(costSheet.direct_labor_cost || 0);
  const subcontractCost = Number(costSheet.subcontracted_services_cost || 0);
  const overheadCost = Number(costSheet.allocated_overhead_cost || 0);
  const totalCost = Number(costSheet.total_cost || 0);
  const unitCost = Number(costSheet.cost_per_piece || 0);

  const plannedTotal = Number(costSheet.planned_total_cost || 0);
  const varianceAmt = Number(costSheet.variance_amount || 0);
  const variancePct = Number(costSheet.variance_percentage || 0);

  const materialsPct = totalCost > 0 ? ((materialsCost / totalCost) * 100).toFixed(1) : '0';
  const laborPct = totalCost > 0 ? ((laborCost / totalCost) * 100).toFixed(1) : '0';
  const subcontractPct = totalCost > 0 ? ((subcontractCost / totalCost) * 100).toFixed(1) : '0';
  const overheadPct = totalCost > 0 ? ((overheadCost / totalCost) * 100).toFixed(1) : '0';

  const formattedDate = costSheet.created_at
    ? new Date(costSheet.created_at).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US');

  const handlePrint = () => {
    const printContent = document.getElementById('printable-cost-sheet-document');
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <meta charset="utf-8">
        <title>بطاقة التكلفة الصناعية - ${orderNumber} - ${modelName}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.5;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .factory-name {
            font-size: 18px;
            font-weight: 900;
            margin: 0;
            color: #000;
          }
          .doc-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e293b;
            margin: 2px 0 0 0;
          }
          .badge {
            display: inline-block;
            padding: 3px 8px;
            border: 1px solid #0f172a;
            border-radius: 6px;
            font-family: monospace;
            font-weight: bold;
            font-size: 11px;
            background: #f8fafc;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px;
          }
          .field-label {
            font-size: 9.5px;
            color: #64748b;
            display: block;
          }
          .field-value {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 14px;
          }
          th {
            background-color: #f1f5f9;
            border: 1px solid #94a3b8;
            padding: 7px 10px;
            text-align: inherit;
            font-weight: 800;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
          }
          .golden-box {
            background: #f0fdf4;
            border: 2px solid #16a34a;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
          }
          .golden-unit-cost {
            font-size: 22px;
            font-weight: 900;
            font-family: monospace;
            color: #15803d;
          }
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 14px;
            text-align: center;
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px dashed #94a3b8;
          }
          .sig-title {
            font-size: 10.5px;
            font-weight: bold;
            color: #334155;
            margin-bottom: 35px;
            display: block;
          }
          .sig-line {
            border-bottom: 1px solid #000;
            width: 75%;
            margin: 0 auto 4px auto;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-[#111217] border border-amber-900/40 rounded-2xl shadow-2xl overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:bg-white print:text-black">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isAr ? 'بطاقة التكلفة الصناعية الفعلية للقطعة' : 'Actual Production Cost Sheet'}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {orderNumber}
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                {modelName} ({modelCode}) • {totalPieces.toLocaleString()} {isAr ? 'قطعة منتجة' : 'units'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold rounded-xl text-xs shadow-lg shadow-amber-900/30 flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              {isAr ? 'طباعة بطاقة التكلفة (A4)' : 'Print Cost Sheet (A4)'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div
          id="printable-cost-sheet-document"
          className="p-6 sm:p-8 space-y-6 text-neutral-200 bg-[#0c0d12] print:bg-white print:text-black print:p-0"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="border-b-2 border-amber-500/30 pb-4 print:border-black flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 print:border-black print:text-black">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white print:text-black">
                  {isAr ? 'مصنع البطل الروماني للملابس الجاهزة' : 'Al-Batal Al-Romany Apparel Factory'}
                </h1>
                <p className="text-xs text-amber-400 print:text-neutral-700 font-bold">
                  {isAr ? 'كشف وتوثيق التكاليف الصناعية الفعلية وتكلفة القطعة' : 'Actual Unit Production Cost Statement'}
                </p>
              </div>
            </div>
            <div className="text-left text-xs space-y-1 print:text-left">
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'أمر الإنتاج:' : 'Order No:'}{' '}
                <span className="font-bold text-white print:text-black font-mono">{orderNumber}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'تاريخ الاحتساب:' : 'Date:'}{' '}
                <span className="font-bold text-white print:text-black">{formattedDate}</span>
              </div>
              <div className="text-neutral-400 print:text-neutral-600">
                {isAr ? 'حالة الاعتماد:' : 'Status:'}{' '}
                <span className="font-bold text-emerald-400 print:text-black">
                  {costSheet.status === 'approved' ? (isAr ? 'معتمدة نهائياً ومقفلة' : 'Approved & Locked') : (isAr ? 'مسودة محسوبة' : 'Calculated')}
                </span>
              </div>
            </div>
          </div>

          {/* Bio Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-white/5 print:border-neutral-300 print:bg-neutral-50 text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'اسم الموديل الصناعي:' : 'Model Name:'}</span>
              <strong className="text-sm text-white print:text-black block font-bold">{modelName}</strong>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'كود الموديل / التصنيف:' : 'Model Code / Cat:'}</span>
              <span className="font-mono text-neutral-200 print:text-neutral-800">{modelCode} • {model.category || (isAr ? 'ملابس عامة' : 'Apparel')}</span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'الكمية التامة المنتجة:' : 'Total Pieces Produced:'}</span>
              <strong className="font-mono text-sm text-amber-400 print:text-black">{totalPieces.toLocaleString()} {isAr ? 'قطعة' : 'Units'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block">{isAr ? 'طريقة التحميل والتكلفة:' : 'Costing Method:'}</span>
              <span className="font-bold text-neutral-200 print:text-neutral-800">{isAr ? 'تكلفة فعلية مباشرة (Actual)' : 'Actual Cost'}</span>
            </div>
          </div>

          {/* Cost Elements Breakdown Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-white print:text-black">
              {isAr ? 'هيكل عناصر التكلفة الصناعية المباشرة وغير المباشرة:' : 'Cost Elements Breakdown:'}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-white/10 print:border-neutral-300">
              <table className="w-full text-xs text-right">
                <thead className="bg-white/5 print:bg-neutral-100 text-neutral-400 print:text-neutral-700 font-bold border-b border-white/10 print:border-neutral-300">
                  <tr>
                    <th className="p-2.5">#</th>
                    <th className="p-2.5">{isAr ? 'عنصر التكلفة الصناعي' : 'Cost Element'}</th>
                    <th className="p-2.5">{isAr ? 'تفاصيل التحميل المحاسبي' : 'Allocation Basis'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'النسبة من الإجمالي %' : 'Share %'}</th>
                    <th className="p-2.5 text-center">{isAr ? 'نصيب القطعة (ج.م)' : 'Per Piece (EGP)'}</th>
                    <th className="p-2.5 text-left font-mono">{isAr ? 'إجمالي التكلفة (ج.م)' : 'Total Cost (EGP)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-neutral-200">
                  {/* 1. Materials */}
                  <tr className="hover:bg-white/5 print:hover:bg-transparent">
                    <td className="p-2.5 font-mono text-neutral-500">1</td>
                    <td className="p-2.5 font-bold text-white print:text-black">{isAr ? 'الخامات ومستلزمات الإنتاج المباشرة' : 'Direct Materials'}</td>
                    <td className="p-2.5 text-neutral-400 print:text-neutral-600">{isAr ? 'أقمشة، خيوط، سوست، أزرار، تيكت، وتغليف' : 'Fabrics, trims & accessories'}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-neutral-300 print:text-black">{materialsPct}%</td>
                    <td className="p-2.5 text-center font-mono text-neutral-300 print:text-black">
                      {totalPieces > 0 ? (materialsCost / totalPieces).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-amber-400 print:text-black">{materialsCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</td>
                  </tr>

                  {/* 2. Direct Labor */}
                  <tr className="hover:bg-white/5 print:hover:bg-transparent">
                    <td className="p-2.5 font-mono text-neutral-500">2</td>
                    <td className="p-2.5 font-bold text-white print:text-black">{isAr ? 'أجور العمالة والتشغيل المباشر بالقطعة' : 'Direct Piece-Rate Labor'}</td>
                    <td className="p-2.5 text-neutral-400 print:text-neutral-600">{isAr ? 'مستحقات مراحل القص، الخياطة، الأوفرلوك، والتجهيز' : 'Cutting, sewing & finishing piece-rates'}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-neutral-300 print:text-black">{laborPct}%</td>
                    <td className="p-2.5 text-center font-mono text-neutral-300 print:text-black">
                      {totalPieces > 0 ? (laborCost / totalPieces).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-emerald-400 print:text-black">{laborCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</td>
                  </tr>

                  {/* 3. Subcontracting */}
                  {subcontractCost > 0 && (
                    <tr className="hover:bg-white/5 print:hover:bg-transparent">
                      <td className="p-2.5 font-mono text-neutral-500">3</td>
                      <td className="p-2.5 font-bold text-white print:text-black">{isAr ? 'خدمات التشغيل للغير والورش الخارجية' : 'Subcontracted CMT Services'}</td>
                      <td className="p-2.5 text-neutral-400 print:text-neutral-600">{isAr ? 'مغاسل جينز، صباغة، طباعة سلك سكرين، تطريز' : 'Washing, dyeing & printing'}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-neutral-300 print:text-black">{subcontractPct}%</td>
                      <td className="p-2.5 text-center font-mono text-neutral-300 print:text-black">
                        {totalPieces > 0 ? (subcontractCost / totalPieces).toFixed(2) : '0.00'}
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-purple-400 print:text-black">{subcontractCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</td>
                    </tr>
                  )}

                  {/* 4. Overheads */}
                  <tr className="hover:bg-white/5 print:hover:bg-transparent">
                    <td className="p-2.5 font-mono text-neutral-500">{subcontractCost > 0 ? 4 : 3}</td>
                    <td className="p-2.5 font-bold text-white print:text-black">{isAr ? 'المصاريف الصناعية غير المباشرة المحملة' : 'Allocated Manufacturing Overheads'}</td>
                    <td className="p-2.5 text-neutral-400 print:text-neutral-600">{isAr ? 'كهرباء المصنع، إهلاك ماكينات الحياكة، صيانة، وإيجار الصالة' : 'Factory power, depreciation & maintenance'}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-neutral-300 print:text-black">{overheadPct}%</td>
                    <td className="p-2.5 text-center font-mono text-neutral-300 print:text-black">
                      {totalPieces > 0 ? (overheadCost / totalPieces).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-cyan-400 print:text-black">{overheadCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</td>
                  </tr>
                </tbody>
                <tfoot className="bg-white/10 print:bg-neutral-100 font-bold border-t-2 border-white/20 print:border-neutral-300">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-white print:text-black">{isAr ? 'الإجمالي العام لتكاليف أمر الإنتاج' : 'Grand Total Batch Cost'}</td>
                    <td className="p-2.5 text-center font-mono">100%</td>
                    <td className="p-2.5 text-center font-mono text-emerald-400 print:text-black">{unitCost.toFixed(2)} ج.م</td>
                    <td className="p-2.5 text-left font-mono text-emerald-400 print:text-black text-sm">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })} ج.م</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Golden Unit Cost Banner */}
          <div className="p-4 rounded-xl border-2 border-emerald-500/40 bg-emerald-950/20 print:border-black print:bg-neutral-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold text-neutral-400 print:text-neutral-600 uppercase block">
                {isAr ? 'التكلفة الصناعية الفعلية للقطعة الواحدة' : 'Actual Unit Cost Per Piece'}
              </span>
              <div className="text-3xl font-black font-mono text-emerald-400 print:text-black mt-0.5">
                {unitCost.toFixed(2)} <span className="text-sm font-bold text-neutral-300 print:text-black">{isAr ? 'جنيه مصري / قطعة' : 'EGP / unit'}</span>
              </div>
            </div>

            <div className="text-right sm:text-left text-xs space-y-1">
              {plannedTotal > 0 && (
                <div className="text-neutral-400 print:text-neutral-600">
                  {isAr ? 'التكلفة المعيارية المخططة (BOM):' : 'BOM Planned Cost:'}{' '}
                  <span className="font-mono font-bold text-white print:text-black">
                    {(plannedTotal / (totalPieces || 1)).toFixed(2)} ج.م
                  </span>
                </div>
              )}
              {variancePct !== 0 && (
                <div className="flex items-center gap-1.5 font-bold">
                  <span>{isAr ? 'انحراف التكلفة الفعلية:' : 'Cost Variance:'}</span>
                  <span className={`inline-flex items-center gap-0.5 font-mono ${variancePct < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {variancePct < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    <span>{variancePct > 0 ? `+${variancePct}% زيادة (+${varianceAmt.toLocaleString()} ج.م)` : `${variancePct}% توفير (${Math.abs(varianceAmt).toLocaleString()} ج.م)`}</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Triplet Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-5 border-t border-white/10 print:border-black text-center text-xs">
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'مهندس صالة القص والإنتاج' : 'Production Floor Lead'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'مطابق للكميات الفعلية المنجزة' : 'Quantities Verified'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'محاسب التكاليف الصناعية' : 'Cost Accountant'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'تم تدقيق واحتساب الخامات والأجور' : 'Calculated & Audited'}
              </span>
            </div>
            <div>
              <span className="font-bold text-neutral-300 print:text-black block mb-12">
                {isAr ? 'اعتماد المدير المالي / المصنع' : 'Factory / Managing Director'}
              </span>
              <div className="border-b border-dashed border-neutral-500 print:border-black w-3/4 mx-auto"></div>
              <span className="text-[10px] text-neutral-400 print:text-neutral-600 block mt-1">
                {isAr ? 'معتمد رسمي لتسعير البيع' : 'Approved & Locked'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

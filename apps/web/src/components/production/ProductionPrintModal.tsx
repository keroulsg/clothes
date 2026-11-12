import React from 'react';
import {
  Printer,
  Scissors,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type {
  ProductionOrder,
  CuttingOrder,
  CuttingBundle,
  QualityInspection,
} from '../../types';

export type PrintDocumentType = 'order' | 'cutting' | 'bundle' | 'qc';

export interface ProductionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: PrintDocumentType;
  data: ProductionOrder | CuttingOrder | CuttingBundle | QualityInspection | null;
  isAr?: boolean;
}

export const ProductionPrintModal: React.FC<ProductionPrintModalProps> = ({
  isOpen,
  onClose,
  documentType,
  data,
  isAr = true,
}) => {
  if (!isOpen || !data) return null;

  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name || (isAr ? 'مصنع الملابس الجاهزة والتشغيل الفني' : 'Garment Manufacturing Factory');

  const printDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printTime = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  // Render Document Based on Type
  const renderDocumentContent = () => {
    switch (documentType) {
      case 'order': {
        const order = data as ProductionOrder;
        const targetQty = Number(
          (order as any).total_planned_quantity ?? order.planned_quantity ?? order.target_quantity ?? 0
        );
        const cutQty = Number((order as any).total_cut_quantity ?? order.cut_quantity ?? 0);
        const completedQty = Number(
          (order as any).total_completed_quantity ?? order.completed_quantity ?? order.qc_passed_quantity ?? 0
        );
        const rawDue = order.target_delivery_date || order.due_date || (order as any).delivery_date;
        const cleanDue = rawDue ? String(rawDue).split('T')[0].split(' ')[0] : '—';
        const items = order.items || [];

        return (
          <div className="space-y-6">
            {/* Document Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2 text-indigo-700 font-black text-lg">
                  <Building2 className="w-5 h-5" />
                  <span>{factoryName}</span>
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-1">
                  {isAr ? 'تذكرة تشغيل أمر الإنتاج وتفصيل المقاسات' : 'Production Order Job Ticket'}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {isAr ? 'تاريخ الطباعة:' : 'Print Date:'} {printDate} - {printTime}
                </p>
              </div>

              <div className="text-left font-mono">
                <div className="inline-block p-2 border-2 border-slate-900 rounded-lg text-center bg-slate-50">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    {isAr ? 'رقم أمر الإنتاج' : 'Order Number'}
                  </span>
                  <span className="text-base font-black text-indigo-700">{order.order_number}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 text-center font-bold">
                  {isAr ? 'الأولوية:' : 'Priority:'}{' '}
                  {order.priority === 'urgent'
                    ? isAr ? 'عاجل جداً' : 'Urgent'
                    : order.priority === 'high'
                    ? isAr ? 'مرتفع' : 'High'
                    : isAr ? 'عادي' : 'Normal'}
                </div>
              </div>
            </div>

            {/* Core PO Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'الموديل / الكود' : 'Model & Code'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {order.model_name || (order as any).garment_model?.name || '—'}
                </span>
                <span className="text-[10px] text-slate-500 block font-mono">
                  [{order.model_code || (order as any).garment_model?.code || 'MOD'}]
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'إجمالي المخطط' : 'Target Quantity'}</span>
                <span className="font-bold font-mono text-base text-slate-900">
                  {targetQty.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'المقصوص حتى الآن' : 'Cut Yield'}</span>
                <span className="font-bold font-mono text-base text-sky-700">
                  {cutQty.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'موعد التسليم النهائي' : 'Delivery Date'}</span>
                <span className="font-bold font-mono text-sm text-slate-900">{cleanDue}</span>
              </div>
            </div>

            {/* Sizes & Colors Breakdown */}
            <div>
              <h3 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">
                {isAr ? 'تفصيل المقاسات والكميات المعتمدة' : 'Size & Color Breakdown'}
              </h3>
              <table className="w-full text-xs text-right border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">{isAr ? 'اللون' : 'Color'}</th>
                    <th className="py-2 px-3">{isAr ? 'المقاس' : 'Size'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'الكمية المطلوبة' : 'Planned Qty'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'المقصوص' : 'Cut Qty'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'المنجز النهائي' : 'Completed'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.length > 0 ? (
                    items.map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold">{it.color?.name || it.color_name || '—'}</td>
                        <td className="py-2 px-3 font-mono font-bold">{it.size?.name || it.size_name || '—'}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold">
                          {(it.planned_quantity || it.quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-sky-700">
                          {(it.cut_quantity || 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                          {(it.completed_quantity || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2 px-3 font-semibold">{isAr ? 'عام لكافة الألوان' : 'All Colors'}</td>
                      <td className="py-2 px-3 font-mono font-bold">{isAr ? 'مقاسات مجمعة' : 'All Sizes'}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold">{targetQty.toLocaleString()}</td>
                      <td className="py-2 px-3 text-center font-mono text-sky-700">{cutQty.toLocaleString()}</td>
                      <td className="py-2 px-3 text-center font-mono font-bold text-emerald-700">
                        {completedQty.toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Notes & Special Instructions */}
            {(order as any).notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">
                  {isAr ? 'ملاحظات وتشغيل فني خاص:' : 'Special Instructions:'}
                </span>
                <p className="text-amber-800">{(order as any).notes}</p>
              </div>
            )}

            {/* Official Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'تخطيط ومتابعة الإنتاج' : 'Planning Officer'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'مشرف صالة القص' : 'Cutting Supervisor'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'اعتماد مدير المصنع' : 'Factory Director'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      }

      case 'cutting': {
        const cut = data as CuttingOrder;
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2 text-sky-700 font-black text-lg">
                  <Scissors className="w-5 h-5" />
                  <span>{factoryName}</span>
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-1">
                  {isAr ? 'إذن تشغيل وكارت طاولة القص والفرش' : 'Cutting Lay & Plies Floor Ticket'}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {isAr ? 'تاريخ الطباعة:' : 'Print Date:'} {printDate} - {printTime}
                </p>
              </div>

              <div className="text-left font-mono">
                <div className="inline-block p-2 border-2 border-slate-900 rounded-lg text-center bg-slate-50">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    {isAr ? 'رقم إذن القص' : 'Cut Order #'}
                  </span>
                  <span className="text-base font-black text-sky-700">{cut.cutting_order_number}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1 text-center font-bold">
                  {isAr ? 'أمر الإنتاج:' : 'PO #'} {cut.production_order_number || '—'}
                </div>
              </div>
            </div>

            {/* Cutting Specs Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'رقم طاولة القص' : 'Table Number'}</span>
                <span className="font-bold text-slate-900 text-sm">{cut.table_number || 'طاولة 1'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'المقصدار الفني المسؤول' : 'Master Cutter'}</span>
                <span className="font-bold text-slate-900 text-sm">{cut.assigned_cutter_name || 'معين بالصالة'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'الخامة والقماش' : 'Fabric'}</span>
                <span className="font-bold text-slate-900 text-sm">{cut.fabric_name || 'قماش التشغيل'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'مصدر الخامة' : 'Source'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {cut.fabric_source === 'customer_deposit'
                    ? isAr ? 'أمانات عملاء CMT' : 'CMT Custody'
                    : isAr ? 'خامات المصنع' : 'Factory Owned'}
                </span>
              </div>
            </div>

            {/* Lay Metrics Table */}
            <div>
              <h3 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">
                {isAr ? 'بيانات الفرش ومطابقة الأمتار مع القطع الناتجة' : 'Lay Length, Plies & Output Yield'}
              </h3>
              <table className="w-full text-xs text-right border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">{isAr ? 'طول الفرشة (متر)' : 'Lay Length (m)'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'عدد الراقات (طبقات)' : 'Plies Count'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'إجمالي الأمتار المصروفة' : 'Meters Used'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'إجمالي القطع المقصوصة' : 'Total Cut Pieces'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono text-sm">
                    <td className="py-2.5 px-3 font-bold">{cut.lay_length_meters} م</td>
                    <td className="py-2.5 px-3 text-center font-bold">{cut.layers_count} راقة</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">
                      {cut.actual_fabric_meters_used} م
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-emerald-700">
                      {cut.total_cut_pieces} قطعة
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'فني المقصدار (القص)' : 'Master Cutter'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'أمين مخزن الأقمشة' : 'Fabric Storekeeper'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'مراقب جودة الصالة' : 'QC Supervisor'}</span>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      }

      case 'bundle': {
        const bnd = data as CuttingBundle;
        return (
          <div className="space-y-5">
            {/* Sticker / Card Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="w-6 h-6 text-purple-700" />
                <div>
                  <h1 className="text-base font-black text-slate-900">{factoryName}</h1>
                  <span className="text-[11px] font-bold text-purple-700">
                    {isAr ? 'بطاقة تعريف الحزمة وتتبع خطوط التشغيل' : 'Bundle Identification & Tracking Sticker'}
                  </span>
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-1 rounded">
                  #{bnd.bundle_number}
                </span>
              </div>
            </div>

            {/* Barcode & Core Identifier Box */}
            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-400 rounded-xl text-center space-y-2">
              <div className="text-2xl font-black font-mono tracking-wider text-slate-900">
                *{bnd.bundle_code}*
              </div>
              <div className="text-xs font-mono font-bold text-slate-600">
                CODE: {bnd.bundle_code}
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-3 gap-2 text-center border border-slate-300 rounded-xl p-3 bg-white">
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'اللون' : 'Color'}</span>
                <span className="font-bold text-slate-900 text-sm">{bnd.color_name}</span>
              </div>
              <div className="border-x border-slate-200">
                <span className="text-slate-500 block text-[10px]">{isAr ? 'المقاس' : 'Size'}</span>
                <span className="font-black font-mono text-base text-indigo-700">{bnd.size_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'عدد القطع' : 'Quantity'}</span>
                <span className="font-black font-mono text-base text-emerald-700">
                  {bnd.quantity} {isAr ? 'قطعة' : 'pcs'}
                </span>
              </div>
            </div>

            {/* Stages Route Stamp Checklist */}
            <div>
              <h3 className="font-bold text-xs text-slate-900 mb-2">
                {isAr ? 'مسار المراحل الفنية وختم المشغلين' : 'Stage Routing & Operator Signatures'}
              </h3>
              <table className="w-full text-[11px] text-right border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-1.5 px-2">#</th>
                    <th className="py-1.5 px-2">{isAr ? 'المرحلة' : 'Stage'}</th>
                    <th className="py-1.5 px-2 text-center">{isAr ? 'سليم' : 'Accepted'}</th>
                    <th className="py-1.5 px-2 text-center">{isAr ? 'هالك' : 'Scrap'}</th>
                    <th className="py-1.5 px-2 text-center">{isAr ? 'ختم المشغل' : 'Operator'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {[
                    { id: '1', name: isAr ? 'صالة القص والترقيم' : 'Cutting' },
                    { id: '2', name: isAr ? 'التجهيز والتجميع' : 'Assembly' },
                    { id: '3', name: isAr ? 'خط الخياطة الرئيسي' : 'Sewing' },
                    { id: '4', name: isAr ? 'التشطيب وإزالة الخيوط' : 'Finishing' },
                    { id: '5', name: isAr ? 'الكي بالبخار' : 'Ironing' },
                    { id: '6', name: isAr ? 'الفحص والتعبئة النهائية' : 'QC & Packing' },
                  ].map((stg) => (
                    <tr key={stg.id}>
                      <td className="py-1.5 px-2 font-mono text-slate-400">{stg.id}</td>
                      <td className="py-1.5 px-2 font-semibold text-slate-800">{stg.name}</td>
                      <td className="py-1.5 px-2 text-center font-mono">______</td>
                      <td className="py-1.5 px-2 text-center font-mono">______</td>
                      <td className="py-1.5 px-2 text-center font-mono text-slate-400">[  ختم  ]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      case 'qc': {
        const qc = data as QualityInspection;
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 font-black text-lg">
                  <ShieldCheck className="w-5 h-5" />
                  <span>{factoryName}</span>
                </div>
                <h1 className="text-xl font-black text-slate-900 mt-1">
                  {isAr ? 'شهادة وتقرير الفحص الفني وضبط الجودة (QC)' : 'Quality Inspection Certificate'}
                </h1>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {isAr ? 'تاريخ الفحص والطباعة:' : 'Audit Date:'} {printDate} - {printTime}
                </p>
              </div>

              <div className="text-left font-mono">
                <div className="inline-block p-2 border-2 border-slate-900 rounded-lg text-center bg-slate-50">
                  <span className="block text-[10px] uppercase font-bold text-slate-500">
                    {isAr ? 'رقم تقرير الفحص' : 'Report #'}
                  </span>
                  <span className="text-base font-black text-emerald-700">{qc.inspection_number}</span>
                </div>
                <div className="text-xs text-slate-600 mt-1 text-center font-bold">
                  {isAr ? 'أمر الإنتاج:' : 'PO #'} {qc.production_order_number || '—'}
                </div>
              </div>
            </div>

            {/* Inspector & Scope */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'مفتش الجودة' : 'Inspector'}</span>
                <span className="font-bold text-slate-900 text-sm">{qc.inspector_name || 'فاحص الجودة'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'نوع ونقطة الفحص' : 'Inspection Type'}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {qc.inspection_type === 'final_audit'
                    ? isAr ? 'فحص نهائي للمنتج التام' : 'Final Audit'
                    : qc.inspection_type === 'inline'
                    ? isAr ? 'فحص مرحلي بالخط' : 'Inline Audit'
                    : isAr ? 'فحص نهاية الخط' : 'End of Line'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">{isAr ? 'القرار الفني النهائي' : 'Decision'}</span>
                <span className="font-black text-sm text-emerald-700">
                  {qc.decision === 'passed'
                    ? isAr ? 'مطابق ومجاز للمخازن' : 'Passed & Approved'
                    : qc.decision === 'rework_required'
                    ? isAr ? 'إعادة تشغيل (Rework)' : 'Rework'
                    : isAr ? 'مرفوض وهالك (Rejected)' : 'Rejected'}
                </span>
              </div>
            </div>

            {/* Quantities Audit Box */}
            <div>
              <h3 className="font-bold text-xs text-slate-900 mb-2 border-b pb-1">
                {isAr ? 'نتائج مطابقة العينات المفحوصة' : 'Inspection Sample Results'}
              </h3>
              <table className="w-full text-xs text-right border border-slate-300">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3 text-center">{isAr ? 'إجمالي المفحوص' : 'Inspected'}</th>
                    <th className="py-2 px-3 text-center text-emerald-700">{isAr ? 'المقبول السليم' : 'Passed'}</th>
                    <th className="py-2 px-3 text-center text-amber-700">{isAr ? 'إعادة التشغيل' : 'Rework'}</th>
                    <th className="py-2 px-3 text-center text-rose-700">{isAr ? 'المرفوض الهالك' : 'Scrap'}</th>
                    <th className="py-2 px-3 text-center">{isAr ? 'نسبة المطابقة' : 'Pass Rate'}</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  <tr>
                    <td className="py-2.5 px-3 text-center font-bold">{qc.inspected_quantity}</td>
                    <td className="py-2.5 px-3 text-center font-black text-emerald-700">{qc.passed_quantity}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-700">{qc.rework_quantity}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-700">{qc.rejected_quantity}</td>
                    <td className="py-2.5 px-3 text-center font-black text-indigo-700">
                      {qc.inspected_quantity > 0
                        ? `${Math.round((qc.passed_quantity / qc.inspected_quantity) * 100)}%`
                        : '100%'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'توقيع مفتش الجودة' : 'QC Inspector'}</span>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
              </div>
              <div className="space-y-8">
                <span className="font-bold text-slate-800 block">{isAr ? 'اعتماد مدير توكيد الجودة (QA)' : 'Quality Assurance Manager'}</span>
                <div className="border-b border-dashed border-slate-400 w-36 mx-auto"></div>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const getModalTitle = () => {
    switch (documentType) {
      case 'order':
        return isAr ? 'معاينة وطباعة أمر الإنتاج' : 'Print Production Order';
      case 'cutting':
        return isAr ? 'معاينة وطباعة إذن طاولة القص' : 'Print Cutting Ticket';
      case 'bundle':
        return isAr ? 'معاينة وطباعة بطاقة تعريف الحزمة' : 'Print Bundle ID Card';
      case 'qc':
        return isAr ? 'معاينة وطباعة شهادة فحص الجودة' : 'Print QC Certificate';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getModalTitle()} maxWidth="lg">
      <div className="space-y-4">
        {/* Scoped Print CSS: Ensures ONLY the document is printed */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #production-print-sheet, #production-print-sheet * {
              visibility: visible !important;
            }
            #production-print-sheet {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 28px !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              z-index: 9999999 !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Printable Document Sheet Container */}
        <div
          id="production-print-sheet"
          className="p-6 bg-white rounded-2xl border border-slate-200 text-slate-900 shadow-xs"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {renderDocumentContent()}
        </div>

        {/* Action Buttons (Hidden on Print) */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          <Button
            variant="primary"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>{isAr ? 'طباعة المستند الآن' : 'Print Document Now'}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import {
  Printer,
  QrCode,
  Scissors,
  Receipt,
  Truck,
  Boxes,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type {
  JobOrder,
  CustomerMaterialReceipt,
  JobDeliveryNote,
  JobInvoice,
} from '../../types';

export type SubcontractPrintType = 'job' | 'receipt' | 'delivery' | 'invoice';

export interface SubcontractPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: SubcontractPrintType;
  data: JobOrder | CustomerMaterialReceipt | JobDeliveryNote | JobInvoice | any | null;
  isAr?: boolean;
}

export const SubcontractPrintModal: React.FC<SubcontractPrintModalProps> = ({
  isOpen,
  onClose,
  documentType,
  data,
  isAr = true,
}) => {
  if (!isOpen || !data) return null;

  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name || (isAr ? 'مصنع الملابس الجاهزة والتشغيل للغير (CMT)' : 'Garment Manufacturing & CMT Center');

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

  const renderDocumentContent = () => {
    switch (documentType) {
      case 'job': {
        const job = data as JobOrder;
        const targetQty = Number(job.total_target_quantity || 0);
        const cutQty = Number(job.total_cut_quantity || 0);
        const deliveredQty = Number(job.total_delivered_quantity || 0);
        const unitRate = Number(job.unit_rate || 0);
        const estimatedTotal = targetQty * unitRate;

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Scissors className="w-6 h-6 text-indigo-700" />
                  <h2 className="text-xl font-black text-slate-900 font-mono">
                    {isAr ? 'تذكرة أمر تشغيل وقص للغير' : 'CMT / Contract Job Ticket'}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-mono font-bold">
                  {job.order_number}
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isAr ? 'تاريخ الإنشاء:' : 'Date:'} {String(job.created_at || '').split('T')[0]}
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm font-bold block">{factoryName}</span>
                <span className="text-xs text-slate-500">
                  {isAr ? 'قسم التشغيل والتصنيع للغير (CMT)' : 'Subcontracting Division'}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{job.order_number}</span>
                </div>
              </div>
            </div>

            {/* Core Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'العميل المتعاقد:' : 'Customer:'}</span>
                <strong className="text-slate-900 text-sm block mt-0.5">{job.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'نوع الخدمة:' : 'Service Type:'}</span>
                <strong className="text-indigo-700 font-bold block mt-0.5">
                  {job.service_type === 'contract_cutting' ? (isAr ? 'قص للغير فقط' : 'Cutting Only') : (isAr ? 'تصنيع وتشغيل كامل CMT' : 'Full CMT')}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'الموديل المعتمد:' : 'Model:'}</span>
                <strong className="text-slate-900 block mt-0.5">{job.model_name || '—'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'الفني / المقصدار المسؤول:' : 'Lead Technician:'}</span>
                <strong className="text-slate-900 block mt-0.5">
                  {job.assigned_employee_name || (job as any).assigned_employee?.name || (isAr ? 'غير محدد' : 'Unassigned')}
                </strong>
              </div>
            </div>

            {/* Targets & Quantities */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">{isAr ? 'بيان البند والعملية' : 'Description'}</th>
                    <th className="p-3 text-center">{isAr ? 'الكمية المخططة' : 'Target Qty'}</th>
                    <th className="p-3 text-center">{isAr ? 'الكمية المقصوصة' : 'Cut Qty'}</th>
                    <th className="p-3 text-center">{isAr ? 'الكمية المسلمة' : 'Delivered'}</th>
                    <th className="p-3 text-center">{isAr ? 'سعر الوحدة' : 'Unit Rate'}</th>
                    <th className="p-3 text-center">{isAr ? 'الإجمالي التقديري' : 'Est. Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-center">
                  <tr>
                    <td className="p-3 text-right font-sans font-bold text-slate-800">
                      {job.service_type === 'contract_cutting' ? (isAr ? 'خدمات قص وفرش الأقمشة المعتمدة' : 'Contract Fabric Cutting') : (isAr ? 'تشغيل وتصنيع وخياطة كاملة CMT' : 'Full CMT Manufacturing')}
                      {job.model_name ? ` - [${job.model_name}]` : ''}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{targetQty} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="p-3 text-indigo-700 font-bold">{cutQty} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="p-3 text-emerald-700 font-bold">{deliveredQty} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="p-3">{unitRate.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="p-3 font-bold text-slate-900">{estimatedTotal.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Custody Materials Applied */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              <span className="font-bold text-amber-900 block mb-1">
                {isAr ? '📌 عهد وأمانات الأقمشة المرتبطة بأمر التشغيل:' : 'Custody Fabric Terms:'}
              </span>
              <p className="text-amber-800 text-[11px]">
                {isAr
                  ? `إجمالي الأمتار المستلمة لحساب هذا الأمر: ${Number(job.total_received_meters || 0).toFixed(1)} متر. الأقمشة مستلمة على سبيل الأمانة ولا تدرج ضمن المخزون المملوك للمصنع، ويتم احتساب الهالك والمتبقي طبقاً لخطط الفرش المعتمدة.`
                  : `Customer fabric custody: ${Number(job.total_received_meters || 0).toFixed(1)} meters received. All fabrics remain client property and are held in segregated custody.`}
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-3 gap-6 text-center text-xs font-bold text-slate-700 border-t border-slate-200">
              <div>
                <span className="block mb-10">{isAr ? 'فني القص والتشغيل (المستلم)' : 'Lead Cutter / Technician'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  {job.assigned_employee_name || '............................'}
                </span>
              </div>
              <div>
                <span className="block mb-10">{isAr ? 'مدير صالة الإنتاج والتشغيل' : 'Production Manager'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  ............................
                </span>
              </div>
              <div>
                <span className="block mb-10">{isAr ? 'اعتماد العميل / المفوض' : 'Customer Acceptance'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  {job.customer_name}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'receipt': {
        const receipt = data as CustomerMaterialReceipt;
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Boxes className="w-6 h-6 text-sky-700" />
                  <h2 className="text-xl font-black text-slate-900 font-mono">
                    {isAr ? 'محضر استلام أمانة خامات عميل' : 'Customer Fabric Custody Receipt'}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-mono font-bold">
                  {receipt.receipt_number}
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isAr ? 'تاريخ الاستلام:' : 'Intake Date:'} {String(receipt.created_at || '').split('T')[0]}
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm font-bold block">{factoryName}</span>
                <span className="text-xs text-slate-500">
                  {isAr ? 'إدارة المستودعات وأمانات العملاء' : 'Warehouse & Custody Operations'}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{receipt.receipt_number}</span>
                </div>
              </div>
            </div>

            {/* Custody Legal Statement */}
            <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs">
              <p className="text-sky-950 font-bold mb-1">
                {isAr ? 'إشعار أمانة عهدة خامات (Segregated Client Custody):' : 'Legal Custody Acknowledgment:'}
              </p>
              <p className="text-sky-800 text-[11px] leading-relaxed">
                {isAr
                  ? 'يقر المصنع باستلام الخامات الموضحة أدناه على سبيل الأمانة والعهدة المؤقتة لأغراض التشغيل والتصنيع لحساب العميل، ولا تعد هذه الخامات ملكاً للمصنع ولا يجوز إدخالها في أصول المصنع أو التصرف فيها لغير الغرض المتفق عليه.'
                  : 'The factory acknowledges receipt of the fabrics specified below strictly in temporary custody for cutting and manufacturing services on behalf of the customer. These items remain client-owned.'}
              </p>
            </div>

            {/* Receipt Details Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">{isAr ? 'العميل المورد' : 'Customer'}</th>
                    <th className="p-3">{isAr ? 'نوع الخامة والقماش' : 'Fabric Name'}</th>
                    <th className="p-3 text-center">{isAr ? 'كود الخامة' : 'Fabric Code'}</th>
                    <th className="p-3 text-center">{isAr ? 'عدد الأثواب / الرولات' : 'Rolls'}</th>
                    <th className="p-3 text-center">{isAr ? 'الكمية بالمتر' : 'Meters'}</th>
                    <th className="p-3 text-center">{isAr ? 'الوزن (كجم)' : 'Weight (kg)'}</th>
                    <th className="p-3 text-center">{isAr ? 'حالة القماش' : 'Condition'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-center">
                  <tr>
                    <td className="p-3 text-right font-sans font-bold text-slate-900">{receipt.customer_name}</td>
                    <td className="p-3 text-right font-sans font-medium text-slate-800">{receipt.fabric_name}</td>
                    <td className="p-3 text-slate-600">{receipt.fabric_code || '—'}</td>
                    <td className="p-3 font-bold text-slate-900">{receipt.rolls_count || 1}</td>
                    <td className="p-3 font-black text-sky-700 text-sm">{Number(receipt.received_meters).toFixed(2)} م</td>
                    <td className="p-3">{receipt.received_weight_kg ? `${receipt.received_weight_kg} كجم` : '—'}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {receipt.condition_status === 'accepted' ? (isAr ? 'مقبول سليم' : 'Accepted') : receipt.condition_status}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Technical Specs */}
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'العرض الصافي الصالح:' : 'Usable Width:'}</span>
                <strong className="text-slate-900 font-mono">{receipt.usable_width_meters || 1.6} م</strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'الجراماج التقديري (GSM):' : 'GSM:'}</span>
                <strong className="text-slate-900 font-mono">{receipt.gsm || 180} g/m²</strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'فني الفحص والاستلام:' : 'Inspector:'}</span>
                <strong className="text-slate-900">{receipt.inspector_name || (isAr ? 'أمين المستودع' : 'Warehouse Keeper')}</strong>
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">{isAr ? 'ملاحظات الفحص:' : 'Notes:'}</span>
                <p className="text-slate-600">{receipt.notes}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-10 text-center text-xs font-bold text-slate-700 border-t border-slate-200">
              <div>
                <span className="block mb-10">{isAr ? 'أمين مستودع الأمانات (المستلم)' : 'Storekeeper (Receiver)'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  {receipt.inspector_name || '............................'}
                </span>
              </div>
              <div>
                <span className="block mb-10">{isAr ? 'مندوب / سائق التوريد من طرف العميل' : 'Customer Dispatcher'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  ............................
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'delivery': {
        const del = data as JobDeliveryNote;
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-6 h-6 text-emerald-700" />
                  <h2 className="text-xl font-black text-slate-900 font-mono">
                    {isAr ? 'إذن تسليم مشغولات ومصالحة خامات' : 'Delivery Note & Reconciliation'}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-mono font-bold">
                  {del.delivery_number}
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isAr ? 'تاريخ التسليم:' : 'Delivery Date:'} {String(del.delivery_date || del.created_at || '').split('T')[0]}
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm font-bold block">{factoryName}</span>
                <span className="text-xs text-slate-500">
                  {isAr ? 'قسم الشحن والتسليمات الفنية' : 'Shipping & Customer Delivery'}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{del.delivery_number}</span>
                </div>
              </div>
            </div>

            {/* Core Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'العميل المستلم:' : 'Customer:'}</span>
                <strong className="text-slate-900 text-sm block mt-0.5">{del.customer_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'إجمالي القطع المسلمة:' : 'Delivered Pieces:'}</span>
                <strong className="text-emerald-700 text-base font-bold font-mono block mt-0.5">
                  {Number(del.total_delivered_pieces || 0).toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'أقمشة مرتجعة فائضة:' : 'Returned Fabric:'}</span>
                <strong className="text-slate-900 font-mono block mt-0.5">
                  {Number(del.returned_fabric_meters || 0).toFixed(2)} م
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">{isAr ? 'عوادم مقصوصة مسلمة:' : 'Returned Scrap:'}</span>
                <strong className="text-slate-900 font-mono block mt-0.5">
                  {Number(del.returned_scrap_kg || 0).toFixed(2)} كجم
                </strong>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">{isAr ? 'بيان المشغولات المنجزة' : 'Description'}</th>
                    <th className="p-3 text-center">{isAr ? 'الكمية المسلمة' : 'Qty'}</th>
                    <th className="p-3 text-center">{isAr ? 'العبوات / الكراتين' : 'Packages'}</th>
                    <th className="p-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-center">
                  <tr>
                    <td className="p-3 text-right font-sans font-bold text-slate-900">
                      {isAr ? 'مشغولات تامة الصنع / مقصوصة طبقاً للمواصفة المعتمدة' : 'Finished / Cut Garments per approved tech pack'}
                    </td>
                    <td className="p-3 font-black text-emerald-700 text-sm">{del.total_delivered_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                    <td className="p-3">{del.packages_count || 1} {isAr ? 'طرد' : 'pkgs'}</td>
                    <td className="p-3 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {isAr ? 'تم التسليم السليم' : 'Delivered'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Customer Declaration */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
              <span className="font-bold text-emerald-950 block mb-0.5">
                {isAr ? 'إقرار ومطابقة استلام المشغولات والخامات:' : 'Customer Delivery Acceptance:'}
              </span>
              <p className="text-emerald-800 text-[11px]">
                {isAr
                  ? 'يقر العميل أو من يفوضه باستلام كامل المشغولات المذكورة أعلاه سليمة وخالية من العيوب، ومطابقة لأمر التشغيل، كما يقر بمطابقة رصيد الأقمشة المرتجعة والعوادم المسلمة.'
                  : 'The recipient confirms receipt of the complete finished garments and reconciliation of leftover custody materials in sound condition.'}
              </p>
            </div>

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-10 text-center text-xs font-bold text-slate-700 border-t border-slate-200">
              <div>
                <span className="block mb-10">{isAr ? 'مسؤول التسليمات بالمصنع' : 'Factory Dispatcher'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  ............................
                </span>
              </div>
              <div>
                <span className="block mb-10">{isAr ? 'المستلم المفوض من العميل' : 'Authorized Recipient'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  {del.recipient_name || del.customer_name}
                </span>
              </div>
            </div>
          </div>
        );
      }

      case 'invoice': {
        const inv = data as JobInvoice;
        const serviceAmount = Number(inv.service_amount || 0);
        const additional = Number(inv.additional_charges || 0);
        const deductions = Number(inv.deductions || 0);
        const totalAmount = Number(inv.total_amount || 0);
        const paidAmount = Number(inv.paid_amount || 0);
        const remaining = Math.max(0, totalAmount - paidAmount);

        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-black text-slate-900 font-mono">
                    {isAr ? 'فاتورة خدمات تشغيل وقص للغير' : 'Subcontracting Service Invoice'}
                  </h2>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-mono font-bold">
                  {inv.invoice_number}
                </p>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {isAr ? 'تاريخ الفاتورة:' : 'Invoice Date:'} {String(inv.invoice_date || inv.created_at || '').split('T')[0]}
                  {inv.due_date && ` | ${isAr ? 'تاريخ الاستحقاق:' : 'Due Date:'} ${String(inv.due_date).split('T')[0]}`}
                </div>
              </div>
              <div className="text-left font-mono">
                <span className="text-sm font-bold block">{factoryName}</span>
                <span className="text-xs text-slate-500">
                  {isAr ? 'الإدارة المالية والحسابات' : 'Finance & Accounting'}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold border border-slate-300">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{inv.invoice_number}</span>
                </div>
              </div>
            </div>

            {/* Customer & Bill-To */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">{isAr ? 'السادة / العميل:' : 'Billed To:'}</span>
                <strong className="text-slate-900 text-base block mt-0.5">{inv.customer_name}</strong>
              </div>
              <div className="text-left font-mono">
                <span className="text-slate-500 block">{isAr ? 'حالة السداد:' : 'Payment Status:'}</span>
                <strong className={`text-sm block mt-0.5 font-bold ${paidAmount >= totalAmount ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {paidAmount >= totalAmount ? (isAr ? 'مسددة بالكامل (Paid)' : 'Fully Paid') : paidAmount > 0 ? (isAr ? 'مسددة جزئياً (Partial)' : 'Partially Paid') : (isAr ? 'مستحقة غير مسددة (Unpaid)' : 'Unpaid')}
                </strong>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-100 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-3">{isAr ? 'بيان الخدمة' : 'Service Description'}</th>
                    <th className="p-3 text-center">{isAr ? 'القيمة الأساسية' : 'Service Amount'}</th>
                    <th className="p-3 text-center">{isAr ? 'مصاريف إضافية' : 'Charges'}</th>
                    <th className="p-3 text-center">{isAr ? 'خصومات' : 'Deductions'}</th>
                    <th className="p-3 text-center">{isAr ? 'صافي القيمة' : 'Net Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-center">
                  <tr>
                    <td className="p-3 text-right font-sans font-bold text-slate-900">
                      {isAr ? 'أتعاب خدمات قص وتشغيل وتصنيع CMT' : 'Subcontracting & CMT services'}
                    </td>
                    <td className="p-3">{serviceAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="p-3 text-emerald-700">+{additional.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="p-3 text-rose-700">-{deductions.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                    <td className="p-3 font-bold text-slate-900">{totalAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Financial Totals Breakdown & Tranches */}
            <div className="flex justify-end">
              <div className="w-72 space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>{isAr ? 'إجمالي الفاتورة:' : 'Invoice Total:'}</span>
                  <span className="font-bold text-slate-900">{totalAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>{isAr ? 'المسدد فعلياً:' : 'Paid Amount:'}</span>
                  <span>{paidAmount.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-black border-t border-slate-300 pt-2 text-sm">
                  <span className={remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {isAr ? 'المتبقي المستحق:' : 'Remaining Balance:'}
                  </span>
                  <span className={remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {remaining.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {inv.notes && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block mb-0.5">{isAr ? 'ملاحظات وشروط السداد:' : 'Payment Terms:'}</span>
                <p className="text-slate-600">{inv.notes}</p>
              </div>
            )}

            {/* Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-10 text-center text-xs font-bold text-slate-700 border-t border-slate-200">
              <div>
                <span className="block mb-10">{isAr ? 'المحاسب المسؤول / الخزينة' : 'Accountant / Cashier'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  ............................
                </span>
              </div>
              <div>
                <span className="block mb-10">{isAr ? 'اعتماد الإدارة المالية' : 'Financial Approval'}</span>
                <span className="border-t border-slate-400 block pt-1 text-[11px] font-normal text-slate-500">
                  ............................
                </span>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title={isAr ? 'معاينة وطباعة المستند المستقل' : 'Print Document Preview'}
      isAr={isAr}
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {isAr ? 'معاينة وطباعة المستند المستقل' : 'Print Document Preview'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr ? 'طباعة مباشرة بالمقاس القياسي A4 ومطابق للأصول' : 'A4 Standard printable official document'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onClose}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
            <Button size="sm" onClick={handlePrint} icon={<Printer className="w-4 h-4" />}>
              {isAr ? 'طباعة المستند الآن' : 'Print Document'}
            </Button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div
          id="subcontract-print-sheet"
          className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {renderDocumentContent()}

          {/* Printable Footer with timestamp */}
          <div className="mt-8 pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
            <span>{factoryName} - {isAr ? 'منظومة GarmentOS الذكية' : 'GarmentOS Subcontracting ERP'}</span>
            <span>{printDate} | {printTime}</span>
          </div>
        </div>

        {/* Scoped Print CSS */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #subcontract-print-sheet, #subcontract-print-sheet * {
              visibility: visible !important;
            }
            #subcontract-print-sheet {
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
            }
          }
        `}</style>
      </div>
    </Modal>
  );
};

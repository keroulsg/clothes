import React, { useState } from 'react';
import {
  Scissors,
  Layers,
  FileText,
  Truck,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  Send,
  XCircle,
  DollarSign,
  Check,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import type { Rfq } from '../../types';

interface CuttingRequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rfq: Rfq | null;
  isAr?: boolean;
  onPublishSuccess?: (updatedRfq: Rfq) => void;
  onCancelSuccess?: (updatedRfq: Rfq) => void;
  onOpenBidModal?: (rfq: Rfq) => void;
  onEditDraft?: (rfq: Rfq) => void;
  onAcceptBid?: (rfqId: string, bidId: string) => void;
  onCompleteOrder?: (rfqId: string) => void;
}

export const CuttingRequestDetailsModal: React.FC<CuttingRequestDetailsModalProps> = ({
  isOpen,
  onClose,
  rfq,
  isAr = true,
  onPublishSuccess,
  onCancelSuccess,
  onOpenBidModal,
  onEditDraft,
  onAcceptBid,
  onCompleteOrder,
}) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!rfq) return null;

  const isOwner = rfq.is_owner === true;
  const isDraft = rfq.status === 'draft';
  const isPublished = rfq.status === 'open' || rfq.status === 'published';
  const isCancelled = rfq.status === 'cancelled';

  const handlePublish = async () => {
    if (!confirm(isAr ? 'هل أنت متأكد من نشر هذا الطلب في سوق وصلة ورش لاستقبال عروض الأسعار؟' : 'Publish this RFQ to marketplace?')) {
      return;
    }
    setIsPublishing(true);
    setStatusMsg(null);
    try {
      const res = await api.waslatWorsh.publishRfq(rfq.id, { accept_terms: true });
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم نشر الطلب في السوق بنجاح!' : 'RFQ published successfully!',
      });
      if (onPublishSuccess) onPublishSuccess(res.rfq);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل نشر الطلب' : 'Failed to publish RFQ'),
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt(isAr ? 'يرجى إدخال سبب الإلغاء:' : 'Reason for cancellation:');
    if (reason === null) return;

    setIsCancelling(true);
    setStatusMsg(null);
    try {
      const res = await api.waslatWorsh.cancelRfq(rfq.id, reason);
      setStatusMsg({
        type: 'success',
        text: isAr ? 'تم إلغاء الطلب بنجاح.' : 'RFQ cancelled.',
      });
      if (onCancelSuccess) onCancelSuccess(res.rfq);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err?.message || (isAr ? 'فشل إلغاء الطلب' : 'Failed to cancel RFQ'),
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const token = localStorage.getItem('token') || '';
      const url = `/api/waslat-worsh/rfqs/${rfq.id}/attachments/${attachment.id}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.message || 'فشل تحميل الملف');
        return;
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = attachment.file_name || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || 'تعذر تحميل الملف');
    }
  };

  const fabric = rfq.fabric_details || {};
  const production = rfq.production_details || {};
  const logistics = rfq.logistics || {};
  const sizeBreakdown = production.size_breakdown || {};
  const colorBreakdown = production.color_breakdown || {};

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isAr ? 'المواصفات الفنية لطلب القص' : 'Cutting Request Specifications'} [${rfq.rfq_number}]`}
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs text-slate-800 dark:text-slate-200">
        {statusMsg && (
          <div
            className={`p-3 rounded-xl flex items-center gap-2 border ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
        )}

        {/* Header Summary Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={isDraft ? 'neutral' : isPublished ? 'success' : isCancelled ? 'danger' : 'brand'}>
                  {isDraft
                    ? (isAr ? 'مسودة خاصة' : 'Draft')
                    : isPublished
                    ? (isAr ? 'منشور في السوق' : 'Published')
                    : isCancelled
                    ? (isAr ? 'ملغي' : 'Cancelled')
                    : (isAr ? 'تمت الترسية' : 'Awarded')}
                </Badge>
                {rfq.priority === 'urgent' && (
                  <Badge variant="warning">{isAr ? 'عاجل' : 'Urgent'}</Badge>
                )}
                {isOwner && (
                  <Badge variant="neutral" className="border-primary/40 text-primary">
                    {isAr ? 'طلبي الخاص' : 'My RFQ'}
                  </Badge>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {rfq.title}
              </h2>
              {rfq.model_name && (
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {isAr ? 'الموديل: ' : 'Model: '}
                  <span className="text-slate-800 dark:text-slate-200">{rfq.model_name}</span>
                  {rfq.garment_category && ` (${rfq.garment_category})`}
                </p>
              )}
            </div>

            <div className="sm:text-end bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 block">{isAr ? 'الكمية المطلوبة' : 'Quantity'}</span>
              <span className="text-lg font-bold font-mono text-primary">
                {rfq.target_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
              </span>
              {rfq.max_budget_per_piece ? (
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {isAr ? 'الميزانية: ' : 'Budget: '}{rfq.max_budget_per_piece} {isAr ? 'ج.م/قطعة' : 'EGP/pc'}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <div>
              <span className="block text-slate-400">{isAr ? 'الموعد الأقصى' : 'Deadline'}</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {rfq.expected_delivery_date || '-'}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">{isAr ? 'تاريخ الطرح' : 'Published'}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {rfq.published_at ? new Date(rfq.published_at).toLocaleDateString() : (isAr ? 'غير منشور بعد' : 'Not published')}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">{isAr ? 'طالب الخدمة' : 'Requester'}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isOwner
                  ? (rfq.tenant?.name || (isAr ? 'مصنعي الخاص' : 'My Factory'))
                  : (rfq.requester_masked?.governorate ? `${rfq.requester_masked.governorate} (${rfq.requester_masked.masked_code || 'مصنع معتمد'})` : (isAr ? 'مصنع معتمد' : 'Verified Factory'))}
              </span>
            </div>
            <div>
              <span className="block text-slate-400">{isAr ? 'العروض المقدمة' : 'Bids'}</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {rfq.bids ? rfq.bids.length : 0} {isAr ? 'عروض' : 'bids'}
              </span>
            </div>
          </div>
        </div>

        {/* 1. Fabric Specifications */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>{isAr ? 'مواصفات القماش والخامات' : 'Fabric Specifications'}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'نوع الخامة' : 'Type'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {fabric.fabric_type || (isAr ? 'غير محدد' : 'N/A')}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'التركيب النسيجي' : 'Composition'}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {fabric.fabric_composition || (isAr ? 'غير محدد' : 'N/A')}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'عرض القماش' : 'Width'}</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {fabric.fabric_width_cm ? `${fabric.fabric_width_cm} cm` : '-'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'وزن المتر (GSM)' : 'Weight'}</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {fabric.fabric_weight_gsm ? `${fabric.fabric_weight_gsm} GSM` : '-'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px]">
            <div>
              <span className="text-slate-500 font-medium">
                {isAr ? 'جهة توفير وتدبير القماش: ' : 'Fabric Source: '}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {fabric.fabric_supplied_by_requester !== false
                  ? (isAr ? 'مقدم من طالب الخدمة (أمانة تشغيل)' : 'Supplied by requester')
                  : (isAr ? 'مسؤولية تدبير الورشة' : 'Sourced by workshop')}
              </span>
            </div>
            {fabric.fabric_quantity && (
              <div>
                <span className="text-slate-500 font-medium">{isAr ? 'الكمية المتوفرة: ' : 'Supplied Quantity: '}</span>
                <span className="font-mono font-bold text-primary">
                  {fabric.fabric_quantity} {fabric.fabric_unit || 'kg'}
                </span>
              </div>
            )}
          </div>

          {fabric.fabric_notes && (
            <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-slate-700 dark:text-slate-300">
              <span className="font-bold text-amber-700 dark:text-amber-400 block mb-0.5">{isAr ? 'ملاحظات القماش والانكماش:' : 'Fabric notes:'}</span>
              <p>{fabric.fabric_notes}</p>
            </div>
          )}
        </div>

        {/* 2. Production & Cutting Breakdown */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scissors className="w-4 h-4 text-primary" />
            <span>{isAr ? 'خطة القص والمقاسات وتوزيع الألوان' : 'Cutting & Sizing Breakdown'}</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'ماكينة القص المطلوبة' : 'Machine Preference'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {production.cutting_machine_preference || 'CNC Auto'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'طبقات الفرشة (Layers)' : 'Layers / Spread'}</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {production.layers_per_spread || '-'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'ملف الماركر والتعشيق' : 'Marker Provided'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {production.marker_provided !== false ? (isAr ? 'متوفر وجاهز' : 'Yes') : (isAr ? 'مطلوب تعشيقه' : 'No')}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">{isAr ? 'عينة ما قبل الإنتاج' : 'Approved Sample'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {production.sample_approved !== false ? (isAr ? 'معتمدة' : 'Approved') : (isAr ? 'قيد الاعتماد' : 'Pending')}
              </span>
            </div>
          </div>

          {/* Size Breakdown Pills */}
          {Object.keys(sizeBreakdown).length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'توزيع المقاسات المعتمد:' : 'Size Breakdown:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Object.entries(sizeBreakdown).map(([sz, qty]) => (
                  <div key={sz} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-center">
                    <span className="font-bold text-xs text-slate-900 dark:text-white block">{sz}</span>
                    <span className="font-mono text-xs text-primary font-bold">{Number(qty).toLocaleString()} {isAr ? 'ق' : 'pcs'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color Breakdown Pills */}
          {Object.keys(colorBreakdown).length > 0 && (
            <div className="space-y-1.5 pt-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                {isAr ? 'توزيع الألوان المعتمد:' : 'Color Breakdown:'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(colorBreakdown).map(([col, qty]) => (
                  <div key={col} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-900 dark:text-white">{col}</span>
                    <span className="font-mono text-xs text-primary font-bold">{Number(qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {production.special_cutting_instructions && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px]">
              <span className="font-bold text-slate-800 dark:text-slate-200 block mb-0.5">{isAr ? 'تعليمات القص الخاصة:' : 'Special cutting instructions:'}</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{production.special_cutting_instructions}</p>
            </div>
          )}
        </div>

        {/* 3. Logistics & Privacy */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <span>{isAr ? 'مواقع الاستلام والتسليم والنقل' : 'Logistics & Transport'}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{isAr ? 'موقع استلام القماش (Pickup)' : 'Pickup Location'}</span>
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {logistics.pickup_governorate || '-'} {logistics.pickup_city ? `• ${logistics.pickup_city}` : ''}
              </p>
              {isOwner && logistics.pickup_address_private ? (
                <p className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-amber-500 font-bold block">{isAr ? 'العنوان الخاص (مخفي عن الغير):' : 'Private address:'}</span>
                  {logistics.pickup_address_private}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'العنوان التفصيلي مخفي حتى قبول العرض' : 'Exact address revealed on award'}</span>
                </p>
              )}
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-1.5">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'موقع تسليم قطع القص (Delivery)' : 'Delivery Location'}</span>
              </span>
              <p className="font-semibold text-slate-900 dark:text-white">
                {logistics.delivery_governorate || '-'} {logistics.delivery_city ? `• ${logistics.delivery_city}` : ''}
              </p>
              {isOwner && logistics.delivery_address_private ? (
                <p className="text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                  <span className="text-amber-500 font-bold block">{isAr ? 'العنوان الخاص (مخفي عن الغير):' : 'Private address:'}</span>
                  {logistics.delivery_address_private}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'العنوان التفصيلي مخفي حتى قبول العرض' : 'Exact address revealed on award'}</span>
                </p>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-[11px]">
            <span className="text-slate-500 font-medium">{isAr ? 'مسؤولية النقل والشحن: ' : 'Transport Responsibility: '}</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {logistics.transport_responsibility === 'requester'
                ? (isAr ? 'صاحب الطلب' : 'Requester')
                : logistics.transport_responsibility === 'provider'
                ? (isAr ? 'الورشة / مقدم الخدمة' : 'Provider')
                : (isAr ? 'مناصفة / حسب الاتفاق' : 'Shared')}
            </span>
          </div>
        </div>

        {/* 4. Secure Technical Attachments */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <span>{isAr ? 'الملفات الفنية والباترونات المرفقة' : 'Technical Attachments'}</span>
            <Badge variant="neutral" className="font-mono text-[10px]">
              {rfq.attachments ? rfq.attachments.length : 0}
            </Badge>
          </h3>

          {(!rfq.attachments || rfq.attachments.length === 0) ? (
            <p className="text-slate-400 text-xs py-2 text-center">
              {isAr ? 'لا توجد مرفقات فنية مرفوعة لهذا الطلب.' : 'No technical attachments provided.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rfq.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                        {att.file_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {att.file_type} • {(att.file_size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadAttachment(att)}
                    className="text-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 me-1" />
                    {isAr ? 'تحميل' : 'Download'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Received Bids & Operation Progress (P3 & P5) */}
        {(isOwner || rfq.status === 'offer_selected' || rfq.status === 'awarded' || rfq.status === 'in_progress' || rfq.status === 'delivered' || rfq.status === 'completed') && (
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span>{isAr ? 'عروض الأسعار ومسار التشغيل' : 'Offers & Operational Status'}</span>
              </div>
              <Badge variant="brand" className="text-[10px]">
                {rfq.bids ? rfq.bids.length : 0} {isAr ? 'عرض' : 'bids'}
              </Badge>
            </h3>

            {/* Operation Progress Steps */}
            {(rfq.status === 'offer_selected' || rfq.status === 'awarded' || rfq.status === 'in_progress' || rfq.status === 'delivered' || rfq.status === 'completed') && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                  {isAr ? 'المسار التشغيلي للطلب:' : 'Order Lifecycle Progress:'}
                </span>
                <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                  <div className={`p-1.5 rounded-lg font-bold ${['offer_selected', 'awarded', 'in_progress', 'delivered', 'completed'].includes(rfq.status) ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {isAr ? '1. اختيار العرض' : '1. Selected'}
                  </div>
                  <div className={`p-1.5 rounded-lg font-bold ${['in_progress', 'delivered', 'completed'].includes(rfq.status) ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {isAr ? '2. قيد القص' : '2. Cutting'}
                  </div>
                  <div className={`p-1.5 rounded-lg font-bold ${['delivered', 'completed'].includes(rfq.status) ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {isAr ? '3. تم التسليم' : '3. Delivered'}
                  </div>
                  <div className={`p-1.5 rounded-lg font-bold ${rfq.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                    {isAr ? '4. مكتمل ومؤكد' : '4. Completed'}
                  </div>
                </div>

                {isOwner && rfq.status === 'delivered' && onCompleteOrder && (
                  <div className="pt-2 flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => onCompleteOrder(rfq.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 me-1.5" />
                      <span>{isAr ? 'تأكيد استلام قطع القص وإنهاء الطلب' : 'Confirm Receipt & Complete Order'}</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Received Bids Listing for Owner */}
            {isOwner && (
              <>
                {(!rfq.bids || rfq.bids.length === 0) ? (
                  <p className="text-slate-400 text-xs py-3 text-center">
                    {isAr ? 'لم تتلق هذا الطلب أي عروض أسعار بعد.' : 'No offers received yet.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rfq.bids.map((b: any) => {
                      const isAwardedBid = rfq.awarded_bid_id === b.id || b.status === 'accepted';
                      const canAccept = (rfq.status === 'open' || rfq.status === 'published') && b.status === 'submitted';
                      return (
                        <div
                          key={b.id}
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isAwardedBid
                              ? 'border-emerald-500/50 bg-emerald-50/15 dark:bg-emerald-950/20'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-xs">
                                {b.workshop?.workshop_name || (isAr ? 'ورشة تصنيع معتمدة' : 'Verified Workshop')}
                              </span>
                              {isAwardedBid && (
                                <Badge variant="success" className="text-[10px]">
                                  {isAr ? 'العرض المعتمد الفائز' : 'Awarded Winner'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                              <span>
                                {isAr ? 'سعر القطعة:' : 'Unit Rate:'}{' '}
                                <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{b.unit_rate} ج.م</strong>
                              </span>
                              <span>•</span>
                              <span>
                                {isAr ? 'إجمالي العرض:' : 'Total:'}{' '}
                                <strong className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                                  {(Math.round(Number(b.unit_rate) * Number(rfq.target_quantity) * 100) / 100).toLocaleString()} ج.م
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                {isAr ? 'مدة التوريد:' : 'Lead:'}{' '}
                                <strong className="font-mono text-slate-700 dark:text-slate-300">{b.promised_lead_days} {isAr ? 'أيام' : 'days'}</strong>
                              </span>
                            </div>
                            {b.notes && (
                              <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">{b.notes}</p>
                            )}
                          </div>

                          {canAccept && onAcceptBid && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => onAcceptBid(rfq.id, b.id)}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-bold"
                            >
                              <Check className="w-3.5 h-3.5 me-1" />
                              <span>{isAr ? 'قبول هذا العرض' : 'Accept Offer'}</span>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            {isAr ? 'إغلاق' : 'Close'}
          </Button>

          <div className="flex items-center gap-2">
            {isOwner && isDraft && (
              <>
                {onEditDraft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEditDraft(rfq);
                    }}
                  >
                    {isAr ? 'تعديل المسودة' : 'Edit Draft'}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  <Send className="w-3.5 h-3.5 me-1.5" />
                  {isAr ? 'طرح ونشر في السوق الآن' : 'Publish RFQ'}
                </Button>
              </>
            )}

            {isOwner && (isDraft || isPublished) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isCancelling}
                className="text-rose-600 hover:text-rose-700 hover:border-rose-300"
              >
                <XCircle className="w-3.5 h-3.5 me-1" />
                {isAr ? 'إلغاء الطلب' : 'Cancel RFQ'}
              </Button>
            )}

            {!isOwner && isPublished && onOpenBidModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenBidModal(rfq);
                }}
              >
                <Scissors className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'تقديم عرض سعر' : 'Submit Bid'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

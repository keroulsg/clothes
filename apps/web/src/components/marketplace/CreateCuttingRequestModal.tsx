import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Layers,
  FileText,
  Truck,
  Upload,
  Trash2,
  AlertCircle,
  Save,
  Send,
  Lock,
  Eye,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { api } from '../../api/client';
import type { Rfq } from '../../types';

interface CreateCuttingRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAr?: boolean;
  editingRfq?: Rfq | null;
  onSuccess: (rfq: Rfq, published: boolean) => void;
}

export const CreateCuttingRequestModal: React.FC<CreateCuttingRequestModalProps> = ({
  isOpen,
  onClose,
  isAr = true,
  editingRfq,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState<'basic' | 'fabric' | 'production' | 'logistics' | 'attachments' | 'preview'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available Garment Models from ERP
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // 1. Basic Information
  const [title, setTitle] = useState('');
  const [garmentModelId, setGarmentModelId] = useState('');
  const [modelName, setModelName] = useState('');
  const [garmentCategory, setGarmentCategory] = useState<'men' | 'women' | 'kids' | 'uniform' | 'other'>('men');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [targetQuantity, setTargetQuantity] = useState<number>(1000);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
  const [specifications, setSpecifications] = useState('');

  // 2. Fabric Details
  const [fabricType, setFabricType] = useState('قطن سينجل جيرسي (Single Jersey)');
  const [fabricWidthCm, setFabricWidthCm] = useState<number | undefined>(180);
  const [fabricGsm, setFabricGsm] = useState<number | undefined>(180);
  const [fabricComposition, setFabricComposition] = useState('100% قطن مصري ممشط');
  const [fabricQuantity, setFabricQuantity] = useState<number | undefined>(300);
  const [fabricUnit, setFabricUnit] = useState('kg');
  const [fabricSupplied, setFabricSupplied] = useState(true);
  const [fabricNotes, setFabricNotes] = useState('');

  // 3. Production & Cutting Details
  const [cuttingMachinePref, setCuttingMachinePref] = useState('cnc_automatic');
  const [layersPerSpread, setLayersPerSpread] = useState<number | undefined>(100);
  const [markerProvided, setMarkerProvided] = useState(true);
  const [sampleApproved, setSampleApproved] = useState(true);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Size breakdown rows
  const [sizeRows, setSizeRows] = useState<Array<{ size: string; qty: number }>>([
    { size: 'S', qty: 200 },
    { size: 'M', qty: 300 },
    { size: 'L', qty: 300 },
    { size: 'XL', qty: 200 },
  ]);

  // Color breakdown rows
  const [colorRows, setColorRows] = useState<Array<{ color: string; qty: number }>>([
    { color: 'أسود (Black)', qty: 500 },
    { color: 'أبيض (White)', qty: 500 },
  ]);

  // 4. Logistics Details
  const [pickupGov, setPickupGov] = useState('القاهرة');
  const [pickupCity, setPickupCity] = useState('مدينة نصر');
  const [pickupPrivateAddress, setPickupPrivateAddress] = useState('');
  const [deliveryGov, setDeliveryGov] = useState('القليوبية');
  const [deliveryCity, setDeliveryCity] = useState('شبرا الخيمة');
  const [deliveryPrivateAddress, setDeliveryPrivateAddress] = useState('');
  const [transportResponsibility, setTransportResponsibility] = useState<'requester' | 'provider' | 'shared'>('provider');

  // 5. Attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);

  // 6. Publishing Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Initialize data on open / edit
  useEffect(() => {
    if (isOpen) {
      loadModels();
      if (editingRfq) {
        setTitle(editingRfq.title || '');
        setGarmentModelId(editingRfq.garment_model_id || '');
        setModelName(editingRfq.model_name || '');
        setGarmentCategory(editingRfq.garment_category || 'men');
        setPriority(editingRfq.priority || 'normal');
        setTargetQuantity(editingRfq.target_quantity || 1000);
        setExpectedDeliveryDate(editingRfq.expected_delivery_date || '');
        setMaxBudget(editingRfq.max_budget_per_piece);
        setSpecifications(editingRfq.specifications || '');

        if (editingRfq.fabric_details) {
          setFabricType(editingRfq.fabric_details.fabric_type || '');
          setFabricWidthCm(editingRfq.fabric_details.fabric_width_cm);
          setFabricGsm(editingRfq.fabric_details.fabric_weight_gsm);
          setFabricComposition(editingRfq.fabric_details.fabric_composition || '');
          setFabricQuantity(editingRfq.fabric_details.fabric_quantity);
          setFabricUnit(editingRfq.fabric_details.fabric_unit || 'kg');
          setFabricSupplied(editingRfq.fabric_details.fabric_supplied_by_requester !== false);
          setFabricNotes(editingRfq.fabric_details.fabric_notes || '');
        }

        if (editingRfq.production_details) {
          setCuttingMachinePref(editingRfq.production_details.cutting_machine_preference || 'cnc_automatic');
          setLayersPerSpread(editingRfq.production_details.layers_per_spread);
          setMarkerProvided(editingRfq.production_details.marker_provided !== false);
          setSampleApproved(editingRfq.production_details.sample_approved !== false);
          setSpecialInstructions(editingRfq.production_details.special_cutting_instructions || '');

          if (editingRfq.production_details.size_breakdown) {
            setSizeRows(
              Object.entries(editingRfq.production_details.size_breakdown).map(([size, qty]) => ({
                size,
                qty: Number(qty),
              }))
            );
          }

          if (editingRfq.production_details.color_breakdown) {
            setColorRows(
              Object.entries(editingRfq.production_details.color_breakdown).map(([color, qty]) => ({
                color,
                qty: Number(qty),
              }))
            );
          }
        }

        if (editingRfq.logistics) {
          setPickupGov(editingRfq.logistics.pickup_governorate || 'القاهرة');
          setPickupCity(editingRfq.logistics.pickup_city || '');
          setPickupPrivateAddress(editingRfq.logistics.pickup_address_private || '');
          setDeliveryGov(editingRfq.logistics.delivery_governorate || 'القليوبية');
          setDeliveryCity(editingRfq.logistics.delivery_city || '');
          setDeliveryPrivateAddress(editingRfq.logistics.delivery_address_private || '');
          setTransportResponsibility(editingRfq.logistics.transport_responsibility || 'provider');
        }

        setExistingAttachments(editingRfq.attachments || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, editingRfq]);

  const loadModels = async () => {
    try {
      const res = await api.models.getModels({ per_page: 50 });
      setAvailableModels(res.data || []);
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setTitle('');
    setGarmentModelId('');
    setModelName('');
    setGarmentCategory('men');
    setPriority('normal');
    setTargetQuantity(1000);
    setExpectedDeliveryDate('');
    setMaxBudget(undefined);
    setSpecifications('');
    setTermsAccepted(false);
    setPendingFiles([]);
    setExistingAttachments([]);
    setSizeRows([
      { size: 'S', qty: 200 },
      { size: 'M', qty: 300 },
      { size: 'L', qty: 300 },
      { size: 'XL', qty: 200 },
    ]);
    setColorRows([
      { color: 'أسود', qty: 500 },
      { color: 'أبيض', qty: 500 },
    ]);
  };

  // Tallies
  const totalSizeQty = sizeRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const totalColorQty = colorRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const sizeMatches = totalSizeQty === Number(targetQuantity);
  const colorMatches = totalColorQty === Number(targetQuantity);

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setGarmentModelId(id);
    const m = availableModels.find((mod) => mod.id === id);
    if (m) {
      setModelName(m.name);
      if (!title) {
        setTitle(`طلب قص تشغيل موديل: ${m.name}`);
      }
    }
  };

  const handleAddSizeRow = () => {
    setSizeRows([...sizeRows, { size: '', qty: 0 }]);
  };

  const handleRemoveSizeRow = (idx: number) => {
    setSizeRows(sizeRows.filter((_, i) => i !== idx));
  };

  const handleAddColorRow = () => {
    setColorRows([...colorRows, { color: '', qty: 0 }]);
  };

  const handleRemoveColorRow = (idx: number) => {
    setColorRows(colorRows.filter((_, i) => i !== idx));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles([...pendingFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleRemovePendingFile = (idx: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== idx));
  };

  const handleDeleteExistingAttachment = async (attachmentId: string) => {
    if (!editingRfq?.id) return;
    try {
      await api.waslatWorsh.deleteAttachment(editingRfq.id, attachmentId);
      setExistingAttachments(existingAttachments.filter((att) => att.id !== attachmentId));
    } catch (err: any) {
      setErrorMessage(err.message || 'فشل حذف الملف');
    }
  };

  // Build Payload
  const buildPayload = (isPublish: boolean) => {
    const sizeBreakdown: Record<string, number> = {};
    sizeRows.forEach((r) => {
      if (r.size.trim()) {
        sizeBreakdown[r.size.trim()] = Number(r.qty) || 0;
      }
    });

    const colorBreakdown: Record<string, number> = {};
    colorRows.forEach((r) => {
      if (r.color.trim()) {
        colorBreakdown[r.color.trim()] = Number(r.qty) || 0;
      }
    });

    return {
      title: title.trim(),
      service_type: 'cutting',
      garment_model_id: garmentModelId || null,
      model_name: modelName.trim() || null,
      garment_category: garmentCategory,
      priority,
      target_quantity: Number(targetQuantity),
      expected_delivery_date: expectedDeliveryDate,
      max_budget_per_piece: maxBudget ? Number(maxBudget) : null,
      specifications: specifications.trim() || `طلب قص وتشغيل صالة قص صناعية لكمية ${targetQuantity} قطعة`,
      fabric_responsibility: fabricSupplied ? 'seeker_provided' : 'workshop_sourced',
      publish: isPublish,
      accept_terms: isPublish ? termsAccepted : false,
      fabric_details: {
        fabric_type: fabricType,
        fabric_width_cm: fabricWidthCm ? Number(fabricWidthCm) : null,
        fabric_weight_gsm: fabricGsm ? Number(fabricGsm) : null,
        fabric_composition: fabricComposition,
        fabric_quantity: fabricQuantity ? Number(fabricQuantity) : null,
        fabric_unit: fabricUnit,
        fabric_supplied_by_requester: fabricSupplied,
        fabric_notes: fabricNotes,
      },
      production_details: {
        cutting_machine_preference: cuttingMachinePref,
        layers_per_spread: layersPerSpread ? Number(layersPerSpread) : null,
        marker_provided: markerProvided,
        sample_approved: sampleApproved,
        special_cutting_instructions: specialInstructions,
        size_breakdown: Object.keys(sizeBreakdown).length > 0 ? sizeBreakdown : null,
        color_breakdown: Object.keys(colorBreakdown).length > 0 ? colorBreakdown : null,
      },
      logistics: {
        pickup_governorate: pickupGov,
        pickup_city: pickupCity,
        pickup_address_private: pickupPrivateAddress,
        delivery_governorate: deliveryGov,
        delivery_city: deliveryCity,
        delivery_address_private: deliveryPrivateAddress,
        transport_responsibility: transportResponsibility,
      },
    };
  };

  const handleSubmit = async (isPublish: boolean) => {
    setErrorMessage(null);

    // Validation
    if (!title.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال عنوان الطلب والموديل' : 'Title is required');
      setActiveStep('basic');
      return;
    }
    if (!targetQuantity || Number(targetQuantity) <= 0) {
      setErrorMessage(isAr ? 'يرجى إدخال كمية صحيحة أكبر من صفر' : 'Invalid quantity');
      setActiveStep('basic');
      return;
    }
    if (!expectedDeliveryDate) {
      setErrorMessage(isAr ? 'يرجى تحديد تاريخ التسليم الأقصى' : 'Deadline is required');
      setActiveStep('basic');
      return;
    }

    if (sizeRows.length > 0 && !sizeMatches) {
      setErrorMessage(
        isAr
          ? `إجمالي مقاسات التوزيع (${totalSizeQty}) لا يطابق الكمية الكلية المطلوبة (${targetQuantity})!`
          : `Size breakdown sum (${totalSizeQty}) must match total quantity (${targetQuantity})!`
      );
      setActiveStep('production');
      return;
    }

    if (colorRows.length > 0 && !colorMatches) {
      setErrorMessage(
        isAr
          ? `إجمالي توزيع الألوان (${totalColorQty}) لا يطابق الكمية الكلية المطلوبة (${targetQuantity})!`
          : `Color breakdown sum (${totalColorQty}) must match total quantity (${targetQuantity})!`
      );
      setActiveStep('production');
      return;
    }

    if (isPublish && !termsAccepted) {
      setErrorMessage(
        isAr
          ? 'يجب الموافقة على شروط منصة وصلة ورش لحفظ خصوصية وبيانات الطرفين والالتزام بالعمولة 3%.'
          : 'You must accept Waslat Worsh marketplace terms before publishing.'
      );
      setActiveStep('preview');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildPayload(isPublish);
      let resRfq: any;

      if (editingRfq?.id) {
        // Update draft
        const updateRes = await api.waslatWorsh.updateRfq(editingRfq.id, payload);
        resRfq = updateRes.rfq;

        // If publish requested on update
        if (isPublish) {
          const pubRes = await api.waslatWorsh.publishRfq(editingRfq.id, { accept_terms: true });
          resRfq = pubRes.rfq;
        }
      } else {
        // Create new RFQ (draft or publish)
        const createRes = await api.waslatWorsh.createRfq(payload);
        resRfq = createRes.rfq;
      }

      // Upload pending attachments if any
      if (pendingFiles.length > 0 && resRfq?.id) {
        for (const file of pendingFiles) {
          try {
            await api.waslatWorsh.uploadAttachment(resRfq.id, file, 'tech_spec');
          } catch (uploadErr) {
            console.error('Failed uploading attachment:', uploadErr);
          }
        }
      }

      onSuccess(resRfq, isPublish);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || (isAr ? 'حدث خطأ أثناء حفظ الطلب' : 'Failed to save cutting request'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        editingRfq
          ? (isAr ? `تعديل مسودة طلب القص: ${editingRfq.rfq_number}` : `Edit Cutting Draft: ${editingRfq.rfq_number}`)
          : (isAr ? 'إنشاء طلب قص فني جديد (Cutting Request)' : 'New Technical Cutting Request')
      }
      maxWidth="xl"
    >
      <div className="space-y-5 text-xs text-slate-800 dark:text-slate-200">
        {/* Step Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto gap-2">
          {[
            { id: 'basic', label: isAr ? '1. البيانات الأساسية' : '1. Basics', icon: FileText },
            { id: 'fabric', label: isAr ? '2. مواصفات القماش' : '2. Fabric Specs', icon: Layers },
            { id: 'production', label: isAr ? '3. خطة القص والمقاسات' : '3. Cutting & Sizes', icon: Scissors },
            { id: 'logistics', label: isAr ? '4. اللوجستيات والنقل' : '4. Logistics', icon: Truck },
            { id: 'attachments', label: isAr ? '5. المرفقات الفنية' : '5. Files', icon: Upload },
            { id: 'preview', label: isAr ? '6. المعاينة والنشر' : '6. Preview', icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeStep === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveStep(tab.id as any)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg font-bold transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-primary text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: BASICS */}
        {activeStep === 'basic' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'ربط بموديل جاهز من الـ ERP (اختياري)' : 'Link Garment Model (Optional)'}
                </label>
                <select
                  value={garmentModelId}
                  onChange={handleModelSelect}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="">{isAr ? '-- بدون ربط / موديل خارجي --' : '-- No Model Link --'}</option>
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.code ? `[${m.code}] ` : ''}{m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'اسم أو كود الموديل *' : 'Model Name/Code *'}
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder={isAr ? 'مثال: هودي قطن كابيشو شتوي 2026' : 'e.g. Winter Fleece Hoodie 2026'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'عنوان طلب القص العام *' : 'Request Title *'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isAr ? 'مثال: تشغيل صالة قص لـ 3,000 قطعة هودي ميلتون مبطن' : 'e.g. Contract cutting 3,000 pcs'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'فئة المنتج' : 'Garment Category'}
                </label>
                <select
                  value={garmentCategory}
                  onChange={(e) => setGarmentCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="men">{isAr ? 'رجالي (Men)' : 'Men'}</option>
                  <option value="women">{isAr ? 'حريمي (Women)' : 'Women'}</option>
                  <option value="kids">{isAr ? 'أطفالي (Kids)' : 'Kids'}</option>
                  <option value="uniform">{isAr ? 'يونيفورم وموحد (Uniform)' : 'Uniform'}</option>
                  <option value="other">{isAr ? 'أخرى (Other)' : 'Other'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'أولوية التشغيل' : 'Priority'}
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="normal">{isAr ? 'عادي (Normal)' : 'Normal'}</option>
                  <option value="urgent">{isAr ? 'عاجل جداً (Urgent)' : 'Urgent'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الكمية الإجمالية (قطعة) *' : 'Total Quantity (pcs) *'}
                </label>
                <input
                  type="number"
                  min="1"
                  value={targetQuantity}
                  onChange={(e) => setTargetQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تاريخ التسليم النهائي المطلوب *' : 'Delivery Deadline *'}
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الحد الأقصى للتكلفة للقطعة (ج.م) اختياري' : 'Max Budget / Pc (EGP)'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={maxBudget !== undefined ? maxBudget : ''}
                  onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder={isAr ? 'اترك فارغاً لتفاوض حر' : 'Open negotiation'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'ملاحظات وتفاصيل عامة' : 'General Notes'}
              </label>
              <textarea
                rows={2}
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder={isAr ? 'أية متطلبات إضافية لورش القص...' : 'Extra instructions...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 2: FABRIC SPECS */}
        {activeStep === 'fabric' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  {isAr ? 'جهة توريد القماش' : 'Fabric Supplier'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {fabricSupplied
                    ? (isAr ? 'القماش يتم توريده وتوصيله من طرف الطالب (أمانات تشغيل)' : 'Fabric supplied by requester')
                    : (isAr ? 'المشغل مسؤول عن توفير وتدبير خام القماش' : 'Workshop sources fabric')}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={fabricSupplied}
                  onChange={(e) => setFabricSupplied(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'نوع خامة القماش *' : 'Fabric Type *'}
                </label>
                <input
                  type="text"
                  value={fabricType}
                  onChange={(e) => setFabricType(e.target.value)}
                  placeholder={isAr ? 'مثال: سنجل جيرسي، ميلتون، بيكيه، جينز' : 'e.g. Single Jersey, Fleece, Denim'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'التركيب النسيجي (Composition)' : 'Composition'}
                </label>
                <input
                  type="text"
                  value={fabricComposition}
                  onChange={(e) => setFabricComposition(e.target.value)}
                  placeholder={isAr ? 'مثال: 95% قطن + 5% ليكرا' : 'e.g. 100% Cotton'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'عرض القماش (سم)' : 'Fabric Width (cm)'}
                </label>
                <input
                  type="number"
                  value={fabricWidthCm || ''}
                  onChange={(e) => setFabricWidthCm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="180"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'وزن المتر المربع (GSM)' : 'Weight (GSM)'}
                </label>
                <input
                  type="number"
                  value={fabricGsm || ''}
                  onChange={(e) => setFabricGsm(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="200"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'كمية القماش المتوفرة' : 'Supplied Quantity'}
                </label>
                <input
                  type="number"
                  value={fabricQuantity || ''}
                  onChange={(e) => setFabricQuantity(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="300"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'وحدة القياس' : 'Unit'}
                </label>
                <select
                  value={fabricUnit}
                  onChange={(e) => setFabricUnit(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="kg">{isAr ? 'كيلوجرام (kg)' : 'kg'}</option>
                  <option value="meters">{isAr ? 'متر طولي (meters)' : 'meters'}</option>
                  <option value="rolls">{isAr ? 'توب / رول (rolls)' : 'rolls'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'شروط خاصة بالقماش (نسبة الانكماش / الشد / الراحة)' : 'Fabric Handling & Shrinkage Notes'}
              </label>
              <textarea
                rows={2}
                value={fabricNotes}
                onChange={(e) => setFabricNotes(e.target.value)}
                placeholder={isAr ? 'مثال: يحتاج القماش راحة 24 ساعة قبل الفرش، نسبة الانكماش 4%...' : 'Fabric needs 24h rest before spreading...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 3: PRODUCTION & SIZES */}
        {activeStep === 'production' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'نوع ماكينة القص المفضلة' : 'Cutting Machine Preference'}
                </label>
                <select
                  value={cuttingMachinePref}
                  onChange={(e) => setCuttingMachinePref(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
                >
                  <option value="cnc_automatic">{isAr ? 'مقص آلي أوتوماتيكي بالكمبيوتر (CNC Auto Cutter)' : 'CNC Automatic Cutter'}</option>
                  <option value="manual_straight">{isAr ? 'مقص كهربائي مستقيم يدوي (Straight Knife)' : 'Straight Knife Manual'}</option>
                  <option value="laser">{isAr ? 'قص ليزر دقيق (Laser Cutting)' : 'Laser Cutting'}</option>
                  <option value="band_knife">{isAr ? 'مقص شريطي (Band Knife)' : 'Band Knife'}</option>
                  <option value="no_preference">{isAr ? 'لا يوجد تفضيل محدد (أي تقنية معتمدة)' : 'No Preference'}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'أقصى عدد رقات في الفرشة (Layers/Spread)' : 'Layers Per Spread'}
                </label>
                <input
                  type="number"
                  value={layersPerSpread || ''}
                  onChange={(e) => setLayersPerSpread(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="80 - 120"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markerProvided}
                  onChange={(e) => setMarkerProvided(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isAr ? 'الماركر / التعشيق مرسل وجاهز من الطالب' : 'Marker/Nesting file provided'}
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sampleApproved}
                  onChange={(e) => setSampleApproved(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {isAr ? 'العينة الأولى معتمدة ومطابقة للباترون' : 'Approved pre-production sample ready'}
                </span>
              </label>
            </div>

            {/* Size Breakdown */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isAr ? 'توزيع المقاسات (Size Breakdown)' : 'Size Breakdown'}</span>
                    <Badge variant={sizeMatches ? 'success' : 'warning'} className="font-mono text-[11px]">
                      {totalSizeQty} / {targetQuantity}
                    </Badge>
                  </h4>
                  {!sizeMatches && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      {isAr
                        ? `يجب أن يتطابق مجموع المقاسات (${totalSizeQty}) تماماً مع الكمية الإجمالية (${targetQuantity}).`
                        : `Sum of sizes must equal ${targetQuantity}.`}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleAddSizeRow} type="button">
                  {isAr ? '+ إضافة مقاس' : '+ Add Size'}
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {sizeRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <input
                      type="text"
                      value={row.size}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx].size = e.target.value;
                        setSizeRows(next);
                      }}
                      placeholder={isAr ? 'المقاس' : 'Size'}
                      className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-center font-bold text-xs text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      value={row.qty}
                      onChange={(e) => {
                        const next = [...sizeRows];
                        next[idx].qty = Number(e.target.value) || 0;
                        setSizeRows(next);
                      }}
                      placeholder="Qty"
                      className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-center font-mono font-bold text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSizeRow(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Breakdown */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{isAr ? 'توزيع الألوان (Color Breakdown)' : 'Color Breakdown'}</span>
                    <Badge variant={colorMatches ? 'success' : 'warning'} className="font-mono text-[11px]">
                      {totalColorQty} / {targetQuantity}
                    </Badge>
                  </h4>
                  {!colorMatches && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      {isAr
                        ? `يجب أن يتطابق مجموع الألوان (${totalColorQty}) تماماً مع الكمية الإجمالية (${targetQuantity}).`
                        : `Sum of colors must equal ${targetQuantity}.`}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleAddColorRow} type="button">
                  {isAr ? '+ إضافة لون' : '+ Add Color'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {colorRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <input
                      type="text"
                      value={row.color}
                      onChange={(e) => {
                        const next = [...colorRows];
                        next[idx].color = e.target.value;
                        setColorRows(next);
                      }}
                      placeholder={isAr ? 'اسم اللون / الكود' : 'Color Name'}
                      className="flex-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 px-2 text-xs text-slate-900 dark:text-white font-medium"
                    />
                    <input
                      type="number"
                      min="0"
                      value={row.qty}
                      onChange={(e) => {
                        const next = [...colorRows];
                        next[idx].qty = Number(e.target.value) || 0;
                        setColorRows(next);
                      }}
                      placeholder="Qty"
                      className="w-24 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 text-center font-mono font-bold text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveColorRow(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'تعليمات خاصة بصالة القص (فروق الاتجاهات / النوتشات / الحزم)' : 'Special Cutting Instructions'}
              </label>
              <textarea
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder={isAr ? 'مثال: مراعاة اتجاه الوبر، عمل نوتش في منتصف الظهر، تكتكة كل حزمة 25 قطعة...' : 'Notch placements, bundle size...'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}

        {/* STEP 4: LOGISTICS */}
        {activeStep === 'logistics' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">
                  {isAr ? 'مبدأ الخصوصية الصارمة في وصلة ورش:' : 'Privacy Protection Notice:'}
                </span>
                <span className="text-[11px] leading-relaxed">
                  {isAr
                    ? 'يتم عرض المحافظة والمدينة فقط لمقدمي العروض في السوق. العناوين الدقيقة وأرقام الهواتف تظل مشفرة ومحجوبة تماماً ولا تُكشف إلا بعد قبول العرض وسداد عمولة المنصة 3%.'
                    : 'Only governorate & city are visible in marketplace. Exact addresses stay masked until award.'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-primary" />
                <span>{isAr ? 'موقع استلام القماش الخام (Pickup)' : 'Pickup Location'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'المحافظة (علني)' : 'Governorate (Public)'}</label>
                  <input
                    type="text"
                    value={pickupGov}
                    onChange={(e) => setPickupGov(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'المدينة / المنطقة (علني)' : 'City (Public)'}</label>
                  <input
                    type="text"
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'العنوان التفصيلي ومخزن الاستلام (خاص ومخفي)' : 'Exact Address (Private & Hidden)'}</span>
                </label>
                <input
                  type="text"
                  value={pickupPrivateAddress}
                  onChange={(e) => setPickupPrivateAddress(e.target.value)}
                  placeholder={isAr ? 'العنوان الدقيق ورقم المخزن (لن يظهر في السوق قبل الترسية)' : 'Exact address hidden'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isAr ? 'موقع تسليم قطع القص الجاهزة (Delivery)' : 'Delivery Location'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'المحافظة (علني)' : 'Governorate (Public)'}</label>
                  <input
                    type="text"
                    value={deliveryGov}
                    onChange={(e) => setDeliveryGov(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">{isAr ? 'المدينة / المنطقة (علني)' : 'City (Public)'}</label>
                  <input
                    type="text"
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'العنوان التفصيلي وموقع الاستلام النهائي (خاص ومخفي)' : 'Exact Address (Private & Hidden)'}</span>
                </label>
                <input
                  type="text"
                  value={deliveryPrivateAddress}
                  onChange={(e) => setDeliveryPrivateAddress(e.target.value)}
                  placeholder={isAr ? 'عنوان المصنع النهائي أو صالة التجميع' : 'Final factory address hidden'}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'مسؤولية النقل والشحن' : 'Transport Responsibility'}
              </label>
              <select
                value={transportResponsibility}
                onChange={(e) => setTransportResponsibility(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="provider">{isAr ? 'الورشة / مقدم الخدمة مسؤول عن استلام وتسليم البضاعة' : 'Provider transports'}</option>
                <option value="requester">{isAr ? 'صاحب الطلب مسؤول عن توريد واستلام البضاعة بسياراته' : 'Requester transports'}</option>
                <option value="shared">{isAr ? 'مناصفة / حسب الاتفاق في العرض' : 'Shared / negotiable'}</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 5: ATTACHMENTS */}
        {activeStep === 'attachments' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">
                {isAr ? 'الملفات الفنية والباترونات المرفقة (مخزنة بأمان وخاصة)' : 'Private Technical Attachments'}
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isAr
                  ? 'يمكنك إرفاق ملفات الباترون، الماركر (DXF/HPGL/PLT)، جدول المقاسات الفني (Tech Pack PDF)، أو صور العينة. تخزن الملفات مشفرة ولا تتاح للتحميل إلا لمقدمي العروض المؤهلين فقط.'
                  : 'Upload Tech Packs, DXF/HPGL cutting markers, specs, and photos.'}
              </p>
            </div>

            {/* Existing Attachments */}
            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'الملفات المحفوظة حالياً:' : 'Existing Files:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {existingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <div className="truncate">
                          <span className="font-medium text-xs text-slate-900 dark:text-white truncate block">
                            {att.file_name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {att.file_type} • {(att.file_size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingAttachment(att.id)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Files */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {isAr ? 'ملفات جاهزة للرفع مع الحفظ:' : 'Pending Uploads:'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pendingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-xl bg-primary/5 border border-primary/20"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Upload className="w-4 h-4 text-primary shrink-0" />
                        <div className="truncate">
                          <span className="font-medium text-xs text-slate-900 dark:text-white truncate block">
                            {file.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePendingFile(idx)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
              <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <label className="cursor-pointer">
                <span className="text-primary font-bold hover:underline">
                  {isAr ? 'انقر لاختيار ملفات لرفعها' : 'Click to select files'}
                </span>
                <span className="text-slate-500 block text-[11px] mt-1">
                  PDF, DXF, HPGL, PLT, ZIP, PNG, JPG (حتى 20 ميجابايت)
                </span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 6: PREVIEW & PUBLISH */}
        {activeStep === 'preview' && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{isAr ? 'طلب قص فني' : 'Cutting'}</Badge>
                    <Badge variant={priority === 'urgent' ? 'warning' : 'neutral'}>
                      {priority === 'urgent' ? (isAr ? 'عاجل' : 'Urgent') : (isAr ? 'عادي' : 'Normal')}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                    {title || (isAr ? 'بدون عنوان' : 'Untitled')}
                  </h3>
                  {modelName && (
                    <span className="text-xs text-slate-500 font-mono">
                      {isAr ? 'الموديل: ' : 'Model: '}{modelName}
                    </span>
                  )}
                </div>
                <div className="text-end">
                  <span className="text-slate-400 block text-[10px]">{isAr ? 'الكمية المستهدفة' : 'Target Quantity'}</span>
                  <span className="font-mono font-bold text-base text-primary">
                    {Number(targetQuantity).toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block">{isAr ? 'الخامة' : 'Fabric'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{fabricType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? 'ماكينة القص' : 'Cutter'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{cuttingMachinePref}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? 'موقع الاستلام' : 'Pickup'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{pickupGov} ({pickupCity})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isAr ? 'موقع التسليم' : 'Delivery'}</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{deliveryGov} ({deliveryCity})</span>
                </div>
              </div>
            </div>

            {/* Terms Acceptance */}
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
                />
                <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  <span className="font-bold block text-slate-900 dark:text-white">
                    {isAr ? 'الإقرار والموافقة على شروط سوق وصلة ورش الصناعي:' : 'Terms & Conditions Acceptance:'}
                  </span>
                  <span>
                    {isAr
                      ? 'أوافق على طرح هذا الطلب في السوق الداخلي الحصري لمشتركي باقة Enterprise، وأقر بصحة المواصفات الفنية وتطابق المقاسات والكميات، وألتزم بسداد عمولة المنصة 3% فور قبول وترسية العرض الفائز قبل كشف بيانات الاتصال.'
                      : 'I accept GarmentOS Waslat Worsh marketplace terms, 3% commission on award, and technical specification accuracy.'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {activeStep !== 'basic' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const steps: Array<'basic' | 'fabric' | 'production' | 'logistics' | 'attachments' | 'preview'> = [
                    'basic',
                    'fabric',
                    'production',
                    'logistics',
                    'attachments',
                    'preview',
                  ];
                  const curIdx = steps.indexOf(activeStep);
                  if (curIdx > 0) setActiveStep(steps[curIdx - 1]);
                }}
                disabled={isSubmitting}
                type="button"
              >
                {isAr ? 'السابق' : 'Back'}
              </Button>
            )}

            {activeStep !== 'preview' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const steps: Array<'basic' | 'fabric' | 'production' | 'logistics' | 'attachments' | 'preview'> = [
                    'basic',
                    'fabric',
                    'production',
                    'logistics',
                    'attachments',
                    'preview',
                  ];
                  const curIdx = steps.indexOf(activeStep);
                  if (curIdx < steps.length - 1) setActiveStep(steps[curIdx + 1]);
                }}
                disabled={isSubmitting}
                type="button"
              >
                {isAr ? 'التالي' : 'Next'}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              type="button"
              className="text-slate-700 dark:text-slate-300"
            >
              <Save className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'حفظ كمسودة خاصة' : 'Save Draft'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || (activeStep === 'preview' && !termsAccepted)}
              type="button"
            >
              <Send className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'طرح ونشر في السوق الآن' : 'Publish to Marketplace'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

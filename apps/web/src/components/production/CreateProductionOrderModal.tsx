import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Plus, Trash2, Calendar, Scissors, AlertCircle } from 'lucide-react';
import type { GarmentModel, ProductionOrder, ProductionOrderItem } from '../../types';
import { api } from '../../api/client';

interface CreateProductionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: GarmentModel[];
  onSuccess: (newOrder: ProductionOrder) => void;
  isAr?: boolean;
}

export const CreateProductionOrderModal: React.FC<CreateProductionOrderModalProps> = ({
  isOpen,
  onClose,
  models,
  onSuccess,
  isAr = true,
}) => {
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sizesList, setSizesList] = useState<any[]>([]);
  const [colorsList, setColorsList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      Promise.all([api.models.getSizes(), api.models.getColors()])
        .then(([sRes, cRes]) => {
          setSizesList(sRes.sizes || []);
          setColorsList(cRes.colors || []);
          if (!(sRes.sizes || []).length || !(cRes.colors || []).length) {
            setErrorMsg(isAr
              ? 'لا يمكن تخطيط الإنتاج قبل تسجيل المقاسات والألوان الفعلية في بيانات المصنع.'
              : 'Production planning requires real sizes and colors configured in factory data.');
          }
        })
        .catch((error: any) => {
          setSizesList([]);
          setColorsList([]);
          setErrorMsg(error?.message || (isAr ? 'تعذر تحميل المقاسات والألوان من الخادم.' : 'Could not load sizes and colors from the server.'));
        });
    }
  }, [isOpen]);

  const [items, setItems] = useState<ProductionOrderItem[]>([]);

  const totalPlannedQuantity = items.reduce((sum, it) => sum + (Number(it.planned_quantity) || 0), 0);

  const handleAddItem = () => {
    if (!colorsList.length || !sizesList.length) {
      setErrorMsg(isAr
        ? 'أضف الألوان والمقاسات الحقيقية أولاً من إعدادات المصنع.'
        : 'Configure real factory colors and sizes before adding a production line.');
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: 'poi-' + Date.now() + '-' + prev.length,
        color_id: colorsList[0].id,
        color_name: colorsList[0].name,
        size_id: sizesList[0].id,
        size_name: sizesList[0].name,
        planned_quantity: 100,
        cut_quantity: 0,
        completed_quantity: 0,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleItemChange = (id: string, field: keyof ProductionOrderItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelId || !models.some((model) => model.id === selectedModelId)) {
      setErrorMsg(isAr ? 'اختر موديل ملابس صحيحاً.' : 'Select a valid garment model.');
      return;
    }
    if (!items.length || items.some((item) =>
      !colorsList.some((color) => color.id === item.color_id) ||
      !sizesList.some((size) => size.id === item.size_id) ||
      !Number.isInteger(Number(item.planned_quantity)) ||
      Number(item.planned_quantity) <= 0
    )) {
      setErrorMsg(isAr
        ? 'أضف سطراً واحداً على الأقل واختر لوناً ومقاساً مسجلين وكمية صحيحة لكل سطر.'
        : 'Add at least one line with configured color, size, and a positive whole-number quantity.');
      return;
    }
    if (totalPlannedQuantity <= 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

    try {
      const res = await api.production.createProductionOrder({
        garment_model_id: selectedModel?.id,
        planned_start_date: new Date().toISOString().split('T')[0],
        target_delivery_date: targetDeliveryDate,
        priority,
        responsible_person: responsiblePerson || undefined,
        notes: notes || undefined,
        items: items.map(it => ({
          color_id: it.color_id.startsWith('col-') && colorsList[0]?.id ? colorsList[0].id : it.color_id,
          size_id: it.size_id.startsWith('sz-') && sizesList[0]?.id ? sizesList[0].id : it.size_id,
          planned_quantity: Number(it.planned_quantity),
        })),
      });

      if (res?.success && res.data) {
        onSuccess(res.data);
        onClose();
      } else {
        throw new Error(res?.message || (isAr ? 'لم يؤكد الخادم إنشاء أمر الإنتاج.' : 'The server did not confirm production order creation.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر إصدار أمر الإنتاج على الخادم.' : 'Failed to issue production order on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'تخطيط وإصدار أمر إنتاج جديد (Production Order)' : 'Plan & Issue New Production Order'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'موديل الملابس المستهدف للإنتاج' : 'Target Garment Model'}
            </label>
            <select
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} — ({m.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'أولوية التشغيل' : 'Production Priority'}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="normal">{isAr ? 'عادية (Normal)' : 'Normal'}</option>
              <option value="high">{isAr ? 'مرتفعة (High)' : 'High'}</option>
              <option value="urgent">{isAr ? 'عاجلة جداً (Urgent)' : 'Urgent'}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'موعد التسليم والجاهزية المستهدف' : 'Target Delivery & Completion Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={targetDeliveryDate}
                onChange={(e) => setTargetDeliveryDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
              />
              <Calendar className={`w-4 h-4 text-slate-400 absolute ${isAr ? 'left-3' : 'right-3'} top-3 pointer-events-none`} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'المسؤول عن أمر التشغيل' : 'Responsible Person'}
            </label>
            <input
              type="text"
              placeholder={isAr ? 'مثال: المهندس مصطفى كامل' : 'e.g. Eng. Mostafa'}
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Color and Size Breakdown Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
              {isAr ? 'تفصيل كميات الإنتاج حسب الألوان والمقاسات (Size/Color Matrix)' : 'Production Quantities Matrix (Size / Color)'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              {isAr ? 'إضافة مقاس/لون' : 'Add Size/Color'}
            </Button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">{isAr ? 'اللون' : 'Color'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'المقاس' : 'Size'}</th>
                  <th className="py-2.5 px-3">{isAr ? 'الكمية المخططة (قطعة)' : 'Planned Qty (pcs)'}</th>
                  <th className="py-2.5 px-2 text-center">{isAr ? 'حذف' : 'Remove'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                {!items.length && (
                  <tr><td colSpan={4} className="py-6 px-3 text-center text-slate-500">
                    {isAr ? 'لم تتم إضافة مقاسات وألوان للإنتاج بعد. اضغط «إضافة مقاس/لون» بعد تحميل البيانات الفعلية.' : 'No production lines yet. Add a size/color line after real factory data loads.'}
                  </td></tr>
                )}
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3">
                      <select
                        value={it.color_id}
                        onChange={(e) => {
                          const color = colorsList.find((option) => option.id === e.target.value);
                          setItems((prev) => prev.map((item) => item.id === it.id
                            ? { ...item, color_id: color?.id || '', color_name: color?.name || '' }
                            : item));
                        }}
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                      >
                        <option value="">{isAr ? 'اختر اللون' : 'Select color'}</option>
                        {colorsList.map((color) => <option key={color.id} value={color.id}>{color.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select
                        value={it.size_id}
                        onChange={(e) => {
                          const size = sizesList.find((option) => option.id === e.target.value);
                          setItems((prev) => prev.map((item) => item.id === it.id
                            ? { ...item, size_id: size?.id || '', size_name: size?.name || '' }
                            : item));
                        }}
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                      >
                        <option value="">{isAr ? 'اختر المقاس' : 'Select size'}</option>
                        {sizesList.map((size) => <option key={size.id} value={size.id}>{size.name}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        min="1"
                        value={it.planned_quantity}
                        onChange={(e) =>
                          handleItemChange(it.id, 'planned_quantity', parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-primary dark:text-[#fca5a5] font-mono font-bold text-xs"
                      />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        disabled={items.length <= 1}
                        className="text-slate-500 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Total Quantity Card */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'إجمالي الكمية المستهدفة لأمر الإنتاج:' : 'Total Target Planned Quantity:'}
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {isAr ? 'مجموع المقاسات والألوان المجدولة' : 'Sum of scheduled sizes and colors'}
            </span>
          </div>
          <div className={isAr ? 'text-left' : 'text-right'}>
            <span className="text-base font-mono font-bold text-primary dark:text-[#fca5a5]">
              {totalPlannedQuantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {isAr ? 'ملاحظات وتوجيهات تشغيل الورشة' : 'Workshop Production Notes'}
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isAr ? 'تعليمات خاصة بالتطريز، ونوع الخيط، أو مواعيد تسليم العينات...' : 'Special embellishment notes, thread specs, sample sign-offs...'}
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<Scissors className="w-3.5 h-3.5" />}>
            {isAr ? 'إنشاء أمر الإنتاج' : 'Create Production Order'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

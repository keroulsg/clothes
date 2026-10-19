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
}

export const CreateProductionOrderModal: React.FC<CreateProductionOrderModalProps> = ({
  isOpen,
  onClose,
  models,
  onSuccess,
}) => {
  const [selectedModelId, setSelectedModelId] = useState(models[0]?.id || '');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sizesList, setSizesList] = useState<any[]>([]);
  const [colorsList, setColorsList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.models.getSizes().catch(() => ({ sizes: [] })),
        api.models.getColors().catch(() => ({ colors: [] })),
      ]).then(([sRes, cRes]) => {
        if (sRes.sizes) setSizesList(sRes.sizes);
        if (cRes.colors) setColorsList(cRes.colors);
      });
    }
  }, [isOpen]);

  const [items, setItems] = useState<ProductionOrderItem[]>([
    {
      id: 'poi-' + Date.now(),
      color_id: 'col-1',
      color_name: 'أحمر زاهي',
      size_id: 'sz-1',
      size_name: '2Y (سنتين)',
      planned_quantity: 150,
      cut_quantity: 0,
      completed_quantity: 0,
    },
    {
      id: 'poi-' + (Date.now() + 1),
      color_id: 'col-2',
      color_name: 'كحلي غامق',
      size_id: 'sz-2',
      size_name: '4Y (4 سنوات)',
      planned_quantity: 150,
      cut_quantity: 0,
      completed_quantity: 0,
    },
  ]);

  const totalPlannedQuantity = items.reduce((sum, it) => sum + (Number(it.planned_quantity) || 0), 0);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: 'poi-' + Date.now() + Math.random(),
        color_id: colorsList[0]?.id || 'col-1',
        color_name: colorsList[0]?.name || 'أحمر زاهي',
        size_id: sizesList[0]?.id || 'sz-3',
        size_name: sizesList[0]?.name || '6Y (6 سنوات)',
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
        notes: notes || undefined,
        items: items.map(it => ({
          color_id: it.color_id.startsWith('col-') && colorsList[0]?.id ? colorsList[0].id : it.color_id,
          size_id: it.size_id.startsWith('sz-') && sizesList[0]?.id ? sizesList[0].id : it.size_id,
          planned_quantity: Number(it.planned_quantity),
        })),
      });

      if (res.data) {
        onSuccess(res.data);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إصدار أمر الإنتاج على الخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تخطيط وإصدار أمر إنتاج جديد (Production Order)"
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
              موديل الملابس المستهدف للإنتاج
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">أولوية التشغيل</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="normal">عادية (Normal)</option>
              <option value="high">مرتفعة (High)</option>
              <option value="urgent">عاجلة جداً (Urgent)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            موعد التسليم والجاهزية المستهدف
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={targetDeliveryDate}
              onChange={(e) => setTargetDeliveryDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Color and Size Breakdown Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
              تفصيل كميات الإنتاج حسب الألوان والمقاسات (Size/Color Matrix)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-7"
            >
              إضافة مقاس/لون
            </Button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">اللون</th>
                  <th className="py-2.5 px-3">المقاس</th>
                  <th className="py-2.5 px-3">الكمية المخططة (قطعة)</th>
                  <th className="py-2.5 px-2 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/40">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.color_name}
                        onChange={(e) => handleItemChange(it.id, 'color_name', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={it.size_name}
                        onChange={(e) => handleItemChange(it.id, 'size_name', e.target.value)}
                        className="w-full bg-white dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded px-2 py-1 text-slate-900 dark:text-slate-200 text-xs"
                      />
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
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">إجمالي الكمية المستهدفة لأمر الإنتاج:</span>
            <span className="text-slate-700 dark:text-slate-300">مجموع المقاسات والألوان المجدولة</span>
          </div>
          <div className="text-left">
            <span className="text-base font-mono font-bold text-primary dark:text-[#fca5a5]">
              {totalPlannedQuantity.toLocaleString()} قطعة
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            ملاحظات وتوجيهات تشغيل الورشة
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="تعليمات خاصة بالتطريز، ونوع الخيط، أو مواعيد تسليم العينات..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<Scissors className="w-3.5 h-3.5" />}>
            إنشاء أمر الإنتاج
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Check, Layers, AlertCircle } from 'lucide-react';
import type { GarmentModel } from '../../types';
import { api } from '../../api/client';

interface CreateModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newModel: GarmentModel) => void;
}

const AVAILABLE_SIZES = [
  { id: 'sz-1', name: 'حديثي ولادة (0-3M)', category: 'infant' },
  { id: 'sz-2', name: 'رضّع (3-6M)', category: 'infant' },
  { id: 'sz-3', name: 'أطفال (6-12M)', category: 'infant' },
  { id: 'sz-4', name: 'دارجين (1-2Y)', category: 'toddler' },
  { id: 'sz-5', name: 'أطفال (2-4Y)', category: 'kids' },
  { id: 'sz-6', name: 'صغار (4-6Y)', category: 'kids' },
];

const AVAILABLE_COLORS = [
  { id: 'clr-1', name: 'أزرق كحلي', hex: '#0f2744' },
  { id: 'clr-2', name: 'أبيض ناصع', hex: '#ffffff' },
  { id: 'clr-3', name: 'أحمر قاني', hex: '#b91c1c' },
  { id: 'clr-4', name: 'وردي أطفال', hex: '#f472b6' },
  { id: 'clr-5', name: 'رمادي مائل للفضي', hex: '#94a3b8' },
  { id: 'clr-6', name: 'أصفر ليموني', hex: '#facc15' },
];

export const CreateModelModal: React.FC<CreateModelModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('MOD-KID-' + Math.floor(100 + Math.random() * 900));
  const [name, setName] = useState('');
  const [category, setCategory] = useState('طقم أولادي قطن');
  const [season, setSeason] = useState('صيف 2026');
  const [targetCost, setTargetCost] = useState(85);
  const [wholesalePrice, setWholesalePrice] = useState(135);
  const [retailPrice, setRetailPrice] = useState(195);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['sz-1', 'sz-2', 'sz-4']);
  const [selectedColors, setSelectedColors] = useState<string[]>(['clr-1', 'clr-2']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizesList, setSizesList] = useState<any[]>(AVAILABLE_SIZES);
  const [colorsList, setColorsList] = useState<any[]>(AVAILABLE_COLORS);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.models.getSizes().catch(() => ({ sizes: [] })),
        api.models.getColors().catch(() => ({ colors: [] })),
      ]).then(([sizesRes, colorsRes]) => {
        if (sizesRes.sizes && sizesRes.sizes.length > 0) {
          setSizesList(sizesRes.sizes);
          setSelectedSizes(sizesRes.sizes.slice(0, 3).map((s: any) => s.id));
        }
        if (colorsRes.colors && colorsRes.colors.length > 0) {
          setColorsList(colorsRes.colors);
          setSelectedColors(colorsRes.colors.slice(0, 2).map((c: any) => c.id));
        }
      });
    }
  }, [isOpen]);

  const toggleSize = (id: string) => {
    setSelectedSizes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleColor = (id: string) => {
    setSelectedColors(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const variantsCount = selectedSizes.length * selectedColors.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || variantsCount === 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.models.createModel({
        code: code.toUpperCase(),
        name,
        category,
        season,
        target_cost: targetCost,
        wholesale_price: wholesalePrice,
        retail_price: retailPrice,
        size_ids: selectedSizes,
        color_ids: selectedColors,
      });

      if (res.model) {
        onSuccess({
          id: res.model.id,
          code: res.model.code,
          name: res.model.name,
          category: res.model.category,
          season: res.model.season,
          target_cost: Number(res.model.target_cost),
          wholesale_price: Number(res.model.wholesale_price),
          retail_price: Number(res.model.retail_price),
          variants_count: res.generated_variants_count || variantsCount,
          status: res.model.status || 'active',
          created_at: res.model.created_at || new Date().toISOString(),
        });
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر حفظ الموديل على الخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تعريف موديل ملابس جديد وتوليد المتغيرات" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">كود الموديل</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">اسم الموديل والتوصيف</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: طقم أطفال تيشيرت قطن جيرسي وشورت جبردين"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">الموسم</label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تصنيف الموديل</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="طقم أولادي قطن">طقم أولادي قطن</option>
              <option value="سالوبيت مواليد">سالوبيت مواليد</option>
              <option value="فستان بناتي تول">فستان بناتي تول</option>
              <option value="بيجاما أطفال منزلية">بيجاما أطفال منزلية</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">التكلفة المستهدفة (ج.م)</label>
            <input
              type="number"
              step="any"
              value={targetCost}
              onChange={(e) => setTargetCost(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سعر بيع الجملة (ج.م)</label>
            <input
              type="number"
              step="any"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">سعر بيع التجزئة (ج.م)</label>
            <input
              type="number"
              step="any"
              value={retailPrice}
              onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Sizes Multi-Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            تحديد المقاسات المطلوب إنتاجها لهذا الموديل ({selectedSizes.length} محددة)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {sizesList.map((size) => {
              const isSelected = selectedSizes.includes(size.id);
              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => toggleSize(size.id)}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:text-rose-300'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>{size.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary dark:text-rose-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Colors Multi-Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            تحديد ألوان الموديل ({selectedColors.length} محددة)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colorsList.map((color) => {
              const isSelected = selectedColors.includes(color.id);
              const colorHex = color.color_code || color.hex || '#6366f1';
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => toggleColor(color.id)}
                  className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                    isSelected
                      ? 'bg-brand-primary/10 border-brand-primary text-brand-primary dark:text-rose-300'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-slate-400 dark:border-slate-600 shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />
                  <span className="flex-1 text-right">{color.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary dark:text-rose-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Variant Matrix Preview */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-primary dark:text-rose-400" />
            <span className="text-slate-800 dark:text-slate-300 font-medium">عدد المتغيرات الناتجة (Variants Matrix):</span>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {variantsCount} متغير (SKU + باركود فريد)
          </span>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting} disabled={variantsCount === 0}>
            توليد الموديل والمتغيرات
          </Button>
        </div>
      </form>
    </Modal>
  );
};

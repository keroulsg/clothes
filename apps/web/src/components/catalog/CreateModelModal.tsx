import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Check, Layers, AlertCircle, Plus } from 'lucide-react';
import type { GarmentModel } from '../../types';
import { api } from '../../api/client';

interface CreateModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newModel: GarmentModel) => void;
  modelToEdit?: GarmentModel | null;
  isAr?: boolean;
}

export const CreateModelModal: React.FC<CreateModelModalProps> = ({ isOpen, onClose, onSuccess, modelToEdit, isAr = true }) => {
  const [code, setCode] = useState('MOD-' + Math.floor(1000 + Math.random() * 9000));
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [season, setSeason] = useState(isAr ? 'صيف 2026' : 'Summer 2026');
  const [targetCost, setTargetCost] = useState(0);
  const [wholesalePrice, setWholesalePrice] = useState(0);
  const [retailPrice, setRetailPrice] = useState(0);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [sizesList, setSizesList] = useState<any[]>([]);
  const [sizeCategoriesList, setSizeCategoriesList] = useState<any[]>([]);
  const [colorsList, setColorsList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Inline Quick Add state
  const [showQuickAddSize, setShowQuickAddSize] = useState(false);
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizeCategoryId, setNewSizeCategoryId] = useState('');

  const [showQuickAddColor, setShowQuickAddColor] = useState(false);
  const [newColorName, setNewColorName] = useState('');
  const [newColorCode, setNewColorCode] = useState('#0f2744');

  const loadMasterData = async () => {
    setErrorMsg('');
    try {
      const [sizesRes, sizeCatsRes, colorsRes, catsRes] = await Promise.all([
        api.models.getSizes().catch(() => ({ sizes: [] })),
        api.models.getSizeCategories().catch(() => ({ categories: [] })),
        api.models.getColors().catch(() => ({ colors: [] })),
        api.categories.getCategories().catch(() => ({ categories: [] })),
      ]);

      const loadedSizes = sizesRes.sizes || [];
      const loadedSizeCats = sizeCatsRes.categories || [];
      const loadedColors = colorsRes.colors || [];
      const loadedCats = catsRes.categories || [];

      setSizesList(loadedSizes);
      setSizeCategoriesList(loadedSizeCats);
      if (loadedSizeCats.length > 0 && !newSizeCategoryId) {
        setNewSizeCategoryId(loadedSizeCats[0].id);
      }
      setColorsList(loadedColors);
      setCategoriesList(loadedCats);

      if (loadedCats.length > 0 && !category) {
        setCategory(loadedCats[0].name_ar || loadedCats[0].name_en);
      }
    } catch (err: any) {
      console.error('Failed to load master data for model', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMasterData();
      if (modelToEdit) {
        setCode(modelToEdit.code);
        setName(modelToEdit.name);
        setCategory(modelToEdit.category || '');
        setSeason(modelToEdit.season || (isAr ? 'صيف 2026' : 'Summer 2026'));
        setTargetCost(Number(modelToEdit.target_cost || 0));
        setWholesalePrice(Number(modelToEdit.wholesale_price || 0));
        setRetailPrice(Number(modelToEdit.retail_price || 0));
      } else {
        setCode('MOD-' + Math.floor(1000 + Math.random() * 9000));
        setName('');
        setSeason(isAr ? 'صيف 2026' : 'Summer 2026');
        setTargetCost(0);
        setWholesalePrice(0);
        setRetailPrice(0);
        setSelectedSizes([]);
        setSelectedColors([]);
      }
    }
  }, [isOpen, modelToEdit]);

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

  const handleQuickAddSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeName.trim()) return;
    try {
      const selectedCat = sizeCategoriesList.find(c => c.id === newSizeCategoryId);
      const res = await api.models.createSize({
        name: newSizeName.trim(),
        size_category_id: newSizeCategoryId || undefined,
        category: selectedCat ? (selectedCat.name_ar || selectedCat.name_en) : 'general',
      });
      if (res.size) {
        setSizesList(prev => [...prev, res.size]);
        setSelectedSizes(prev => [...prev, res.size.id]);
        setNewSizeName('');
        setShowQuickAddSize(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة المقاس السريع');
    }
  };

  const handleQuickAddColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColorName.trim()) return;
    try {
      const res = await api.models.createColor({
        name: newColorName.trim(),
        color_code: newColorCode,
      });
      if (res.color) {
        setColorsList(prev => [...prev, res.color]);
        setSelectedColors(prev => [...prev, res.color.id]);
        setNewColorName('');
        setShowQuickAddColor(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل إضافة اللون السريع');
    }
  };

  const variantsCount = selectedSizes.length * selectedColors.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم الموديل' : 'Please provide model name');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (modelToEdit) {
        const res = await api.models.updateModel(modelToEdit.id, {
          name: name.trim(),
          category: category || (isAr ? 'ملابس جاهزة' : 'Apparel'),
          season,
          target_cost: targetCost,
          wholesale_price: wholesalePrice,
          retail_price: retailPrice,
        });

        if (res.model) {
          onSuccess({
            ...modelToEdit,
            ...res.model,
            target_cost: Number(res.model.target_cost ?? targetCost),
            wholesale_price: Number(res.model.wholesale_price ?? wholesalePrice),
            retail_price: Number(res.model.retail_price ?? retailPrice),
          });
          onClose();
        }
      } else {
        if (selectedSizes.length === 0) {
          setErrorMsg(isAr ? 'يجب تحديد مقاس واحد على الأقل للموديل' : 'Select at least one size');
          setIsSubmitting(false);
          return;
        }
        if (selectedColors.length === 0) {
          setErrorMsg(isAr ? 'يجب تحديد لون واحد على الأقل للموديل' : 'Select at least one color');
          setIsSubmitting(false);
          return;
        }

        const res = await api.models.createModel({
          code: code.toUpperCase().trim(),
          name: name.trim(),
          category: category || (isAr ? 'ملابس جاهزة' : 'Apparel'),
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
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر حفظ الموديل على الخادم.' : 'Failed to save model on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modelToEdit ? (isAr ? 'تعديل بيانات الموديل والتسعير' : 'Edit Garment Style & Pricing') : (isAr ? 'تعريف موديل ملابس جديد وتوليد المتغيرات' : 'Define New Garment Model & Generate Variants')}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto px-1">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود الموديل' : 'Model Code'} *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الموديل والتوصيف' : 'Model Name & Description'} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثال: قميص أكسفورد كلاسيك رجالي أو بنطلون جينز' : 'e.g. Classic Men Oxford Shirt or Denim Pants'}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الموسم' : 'Season'}
            </label>
            <input
              type="text"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تصنيف الموديل' : 'Category'}
            </label>
            {categoriesList.length > 0 ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {categoriesList.map(c => (
                  <option key={c.id} value={c.name_ar}>
                    {c.name_ar} {c.name_en ? `(${c.name_en})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={isAr ? 'مثال: قمصان / بنطلونات / عبايات' : 'e.g. Shirts / Pants / Abayas'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'التكلفة المستهدفة (ج.م)' : 'Target Cost'}
            </label>
            <input
              type="number"
              step="any"
              value={targetCost}
              onChange={(e) => setTargetCost(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سعر الجملة (ج.م)' : 'Wholesale Price'}
            </label>
            <input
              type="number"
              step="any"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'سعر القطاعي (ج.م)' : 'Retail Price'}
            </label>
            <input
              type="number"
              step="any"
              value={retailPrice}
              onChange={(e) => setRetailPrice(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {modelToEdit ? (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{isAr ? `الموديل مرتبط بالفعل بمصفوفة ${modelToEdit.variants_count || 0} متغيرات (SKU) بأكواد باركود دولية معتمدة.` : `This style is configured with ${modelToEdit.variants_count || 0} active SKUs.`}</span>
            </div>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{modelToEdit.variants_count || 0} SKUs</span>
          </div>
        ) : (
          <>
        {/* Sizes Multi-Select */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? `تحديد المقاسات المطلوب إنتاجها لهذا الموديل (${selectedSizes.length} محددة)` : `Select Sizes (${selectedSizes.length} selected)`} *
            </label>
            <button
              type="button"
              onClick={() => setShowQuickAddSize(!showQuickAddSize)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? 'إضافة مقاس جديد' : 'Add Size'}
            </button>
          </div>

          {showQuickAddSize && (
            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-blue-200 mb-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? 'اسم المقاس (مثال: XL أو 38 أو 3-6M)' : 'Size Name'}
                value={newSizeName}
                onChange={e => setNewSizeName(e.target.value)}
                className="text-xs p-1.5 border rounded-lg flex-1 min-w-[120px]"
              />
              <select
                value={newSizeCategoryId}
                onChange={e => setNewSizeCategoryId(e.target.value)}
                className="text-xs p-1.5 border rounded-lg bg-white dark:bg-slate-800"
              >
                {sizeCategoriesList.length > 0 ? (
                  sizeCategoriesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} {c.name_en ? `(${c.name_en})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="">{isAr ? 'تصنيف افتراضي (عام)' : 'General Category'}</option>
                )}
              </select>
              <Button type="button" size="sm" onClick={handleQuickAddSize} className="text-xs bg-blue-600 text-white">
                {isAr ? 'حفظ واختيار' : 'Save & Select'}
              </Button>
            </div>
          )}

          {sizesList.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
              <span>{isAr ? 'لا توجد مقاسات مسجلة للمصنع. أضف مقاسك الأول أعلاه للمتابعة.' : 'No sizes registered yet. Add your first size above.'}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(
                sizesList.reduce((acc: Record<string, any[]>, size: any) => {
                  const catName = size.size_category?.name_ar || size.size_category?.name_en || size.category || (isAr ? 'عام' : 'General');
                  if (!acc[catName]) acc[catName] = [];
                  acc[catName].push(size);
                  return acc;
                }, {})
              ).map(([catName, sizes]) => (
                <div key={catName}>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    {catName}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {sizes.map((size) => {
                      const isSelected = selectedSizes.includes(size.id);
                      return (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => toggleSize(size.id)}
                          className={`p-2 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{size.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colors Multi-Select */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              {isAr ? `تحديد ألوان الموديل (${selectedColors.length} محددة)` : `Select Colors (${selectedColors.length} selected)`} *
            </label>
            <button
              type="button"
              onClick={() => setShowQuickAddColor(!showQuickAddColor)}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {isAr ? 'إضافة لون جديد' : 'Add Color'}
            </button>
          </div>

          {showQuickAddColor && (
            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-indigo-200 mb-3 flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder={isAr ? 'اسم اللون (مثال: أحمر قاني)' : 'Color Name'}
                value={newColorName}
                onChange={e => setNewColorName(e.target.value)}
                className="text-xs p-1.5 border rounded-lg flex-1 min-w-[120px]"
              />
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={newColorCode}
                  onChange={e => setNewColorCode(e.target.value)}
                  className="w-7 h-7 rounded border cursor-pointer"
                />
                <input
                  type="text"
                  value={newColorCode}
                  onChange={e => setNewColorCode(e.target.value)}
                  className="text-xs font-mono p-1.5 border rounded-lg w-20"
                />
              </div>
              <Button type="button" size="sm" onClick={handleQuickAddColor} className="text-xs bg-indigo-600 text-white">
                {isAr ? 'حفظ واختيار' : 'Save & Select'}
              </Button>
            </div>
          )}

          {colorsList.length === 0 ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center justify-between">
              <span>{isAr ? 'لا توجد ألوان مسجلة للمصنع. أضف لونك الأول أعلاه للمتابعة.' : 'No colors registered yet. Add your first color above.'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {colorsList.map((color) => {
                const isSelected = selectedColors.includes(color.id);
                const colorHex = color.color_code || '#6366f1';
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => toggleColor(color.id)}
                    className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm font-bold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className={`flex-1 truncate ${isAr ? 'text-right' : 'text-left'}`}>{color.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Variant Matrix Preview */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-slate-800 dark:text-slate-300 font-medium">
              {isAr ? 'عدد المتغيرات الناتجة (Variants Matrix):' : 'Generated Variants Count:'}
            </span>
          </div>
          <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {variantsCount} {isAr ? 'متغير (SKU + باركود فريد)' : 'variants (SKU + unique barcode)'}
          </span>
        </div>
          </>
        )}

        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={(!modelToEdit && variantsCount === 0) || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {modelToEdit ? (isAr ? 'حفظ التعديلات' : 'Save Changes') : (isAr ? 'توليد الموديل والمتغيرات' : 'Generate Model & Variants')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

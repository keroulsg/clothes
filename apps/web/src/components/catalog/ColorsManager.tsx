import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Palette, Check, AlertCircle, RefreshCw, Sparkles, Hash, Layers, Tag } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ColorItem {
  id: string;
  tenant_id: string;
  name: string;
  color_code: string;
  pantone_ref?: string | null;
  variants_count?: number;
  created_at?: string;
  updated_at?: string;
}

const COMMON_PRESET_COLORS = [
  { name: 'أبيض ناصع', color_code: '#ffffff', pantone_ref: 'PANTONE 11-0601 TCX' },
  { name: 'أسود كربوني', color_code: '#18181b', pantone_ref: 'PANTONE 19-4008 TCX' },
  { name: 'كحلي داكن', color_code: '#0f2744', pantone_ref: 'PANTONE 19-4024 TCX' },
  { name: 'رمادي مائل للفضي', color_code: '#94a3b8', pantone_ref: 'PANTONE 14-4102 TCX' },
  { name: 'أحمر قاني', color_code: '#b91c1c', pantone_ref: 'PANTONE 19-1763 TCX' },
  { name: 'وردي أطفال', color_code: '#f472b6', pantone_ref: 'PANTONE 13-2804 TCX' },
  { name: 'أزرق سماوي', color_code: '#38bdf8', pantone_ref: 'PANTONE 14-4115 TCX' },
  { name: 'زيتي عسكري', color_code: '#3f4f34', pantone_ref: 'PANTONE 18-0317 TCX' },
  { name: 'بيج هادئ', color_code: '#e2d9cc', pantone_ref: 'PANTONE 12-0710 TCX' },
  { name: 'عنابي خمري', color_code: '#6b1124', pantone_ref: 'PANTONE 19-1650 TCX' },
];

export const ColorsManager: React.FC<{ isAr: boolean }> = ({ isAr }) => {
  const [colors, setColors] = useState<ColorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<ColorItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [colorCode, setColorCode] = useState('#2563eb');
  const [pantoneRef, setPantoneRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter & Alert states
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadColors = async () => {
    setIsLoading(true);
    try {
      const data = await api.colors.getColors();
      setColors(Array.isArray(data) ? data : (data as any)?.colors || (data as any)?.data || []);
      setErrorMsg(null);
    } catch (err: any) {
      console.error('Failed to load colors', err);
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل قائمة الألوان' : 'Failed to load colors'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadColors();
  }, []);

  const openCreateModal = () => {
    setEditingColor(null);
    setName('');
    setColorCode('#2563eb');
    setPantoneRef('');
    setIsModalOpen(true);
  };

  const openEditModal = (color: ColorItem) => {
    setEditingColor(color);
    setName(color.name);
    setColorCode(color.color_code || '#000000');
    setPantoneRef(color.pantone_ref || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم اللون' : 'Please provide color name');
      return;
    }
    if (!colorCode) {
      setErrorMsg(isAr ? 'يرجى اختيار كود اللون (HEX)' : 'Please select HEX color');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const payload = {
        name: name.trim(),
        color_code: colorCode.trim(),
        pantone_ref: pantoneRef.trim() || undefined,
      };

      if (editingColor) {
        await api.colors.updateColor(editingColor.id, payload);
        setSuccessMsg(isAr ? 'تم تعديل اللون بنجاح' : 'Color updated successfully');
      } else {
        await api.colors.createColor(payload);
        setSuccessMsg(isAr ? 'تمت إضافة اللون بنجاح' : 'Color created successfully');
      }

      setIsModalOpen(false);
      await loadColors();
    } catch (err: any) {
      console.error('Save color error', err);
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ اللون' : 'Failed to save color'));
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleDelete = async (color: ColorItem) => {
    if ((color.variants_count ?? 0) > 0) {
      if (!window.confirm(
        isAr 
          ? `تنبيه: هذا اللون مرتبط بـ (${color.variants_count}) متغير ملابس. هل أنت متأكد من حذفه؟ قد يؤثر على فواتير الموديلات.`
          : `Warning: This color is linked to ${color.variants_count} variants. Delete anyway?`
      )) {
        return;
      }
    } else {
      if (!window.confirm(isAr ? `هل أنت متأكد من حذف اللون "${color.name}"؟` : `Delete color "${color.name}"?`)) {
        return;
      }
    }

    try {
      await api.colors.deleteColor(color.id);
      setSuccessMsg(isAr ? 'تم حذف اللون بنجاح' : 'Color deleted successfully');
      await loadColors();
    } catch (err: any) {
      console.error('Delete color error', err);
      setErrorMsg(err?.message || (isAr ? 'فشل حذف اللون' : 'Failed to delete color'));
    } finally {
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleApplyPresets = async () => {
    if (!window.confirm(
      isAr 
        ? 'هل ترغب في إضافة لوحة الألوان الأساسية للملابس (10 ألوان قياسية) إلى كتالوج المصنع؟' 
        : 'Add standard apparel color palette (10 base colors) to factory catalog?'
    )) {
      return;
    }

    setIsLoading(true);
    let addedCount = 0;
    try {
      for (const preset of COMMON_PRESET_COLORS) {
        const exists = colors.some(
          c => c.color_code.toLowerCase() === preset.color_code.toLowerCase() ||
               c.name.trim().toLowerCase() === preset.name.trim().toLowerCase()
        );
        if (!exists) {
          await api.colors.createColor(preset);
          addedCount++;
        }
      }
      setSuccessMsg(
        isAr 
          ? `تم استيراد ${addedCount} لون جديد بنجاح إلى كتالوج المصنع` 
          : `Successfully imported ${addedCount} base colors`
      );
      await loadColors();
    } catch (err: any) {
      console.error('Error applying presets', err);
      setErrorMsg(err?.message || (isAr ? 'فشل استيراد الألوان الأساسية' : 'Failed to import base colors'));
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const filteredColors = colors.filter(color => {
    const matchesSearch = 
      color.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (color.pantone_ref && color.pantone_ref.toLowerCase().includes(searchTerm.toLowerCase())) ||
      color.color_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {isAr ? 'دليل الألوان المعتمدة' : 'Colors Catalog & Swatches'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr 
                ? 'إدارة درجات الألوان القياسية للمصنع، أكواد الـ HEX ومرجعيات الـ Pantone المعتمدة'
                : 'Manage factory standard color palettes, HEX codes, and Pantone references'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleApplyPresets}
            className="hover:border-indigo-400 text-slate-700 dark:text-slate-300"
            icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            title={isAr ? 'إضافة لوحة ألوان ملابس أساسية' : 'Add basic color palette'}
          >
            {isAr ? 'إضافة ألوان ملابس أساسية' : 'Add Basic Palette'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white border-transparent"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? 'إضافة لون جديد' : 'New Color'}
          </Button>
        </div>
      </div>

      {/* Colors KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'إجمالي درجات الألوان' : 'Total Palette Colors'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
              {colors.length} <span className="text-xs font-medium text-slate-400">{isAr ? 'لون' : 'colors'}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{isAr ? 'معتمدة في لوحة الإنتاج' : 'ready for production'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Palette className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'أكواد HEX القياسية' : 'Standard HEX Codes'}
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 leading-none">
              {colors.filter(c => c.color_code).length} <span className="text-xs font-medium text-slate-400">{isAr ? 'كود' : 'codes'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
              <Hash className="w-3 h-3 text-slate-400" />
              <span>{isAr ? 'بدقة تدرج رقمي كاملة' : 'exact digital swatches'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Hash className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'ألوان بمرجعية Pantone' : 'Pantone References'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
              {colors.filter(c => !!c.pantone_ref).length} <span className="text-xs font-medium text-slate-400">{isAr ? 'مرجع' : 'refs'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
              {isAr ? 'لمطابقة الصباغة وموردي الأقمشة' : 'for dye matching & suppliers'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'المتغيرات المرتبطة (SKUs)' : 'Linked Variants (SKUs)'}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {colors.reduce((acc, c) => acc + (c.variants_count || 0), 0)} <span className="text-xs font-medium text-slate-400">{isAr ? 'متغير' : 'SKUs'}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 pt-1">
              {isAr ? 'في كتالوج الموديلات الحالي' : 'in active model matrix'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter and search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، كود HEX أو Pantone...' : 'Search name, HEX or Pantone...'}
            className="w-full pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {isAr ? `إجمالي الألوان المعروضة: ${filteredColors.length}` : `Showing: ${filteredColors.length}`}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadColors}
            className="text-slate-500 dark:text-slate-400 p-2"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Colors View: Cards Grid + Table */}
      {isLoading && colors.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{isAr ? 'جاري تحميل الألوان...' : 'Loading colors...'}</p>
        </div>
      ) : filteredColors.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Palette className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
            {isAr ? 'لا توجد ألوان مطابقة لبحثك' : 'No colors found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            {isAr
              ? 'لم يتم العثور على ألوان مسجلة. يمكنك إضافة لون مخصص أو استخدام لوحة الألوان الأساسية بنقرة واحدة.'
              : 'No colors configured yet. Add a custom color or apply the basic palette.'}
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyPresets}
              icon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
            >
              {isAr ? 'إضافة ألوان أساسية' : 'Apply Palette'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {isAr ? 'إضافة أول لون' : 'Add First Color'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredColors.map(color => (
            <div
              key={color.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all relative group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl shadow-inner border border-slate-300 dark:border-slate-700 shrink-0"
                      style={{ backgroundColor: color.color_code }}
                    />
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{color.name}</h4>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        <Hash className="w-3 h-3 text-slate-400" />
                        <span>{color.color_code.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {color.pantone_ref && (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 mb-3 font-mono border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                    <span className="text-slate-400">Pantone:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{color.pantone_ref}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {color.variants_count ?? 0} {isAr ? 'موديل/متغير' : 'variants'}
                </span>

                <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(color)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    title={isAr ? 'تعديل' : 'Edit'}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(color)}
                    className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingColor ? (isAr ? 'تعديل بيانات اللون' : 'Edit Color') : (isAr ? 'إضافة لون جديد للكتالوج' : 'Add New Color')}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم اللون بالعربية' : 'Color Name'} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={isAr ? 'مثال: أسود كربوني، كحلي داكن...' : 'e.g. Midnight Blue'}
              className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود اللون (HEX)' : 'HEX Color Code'} *
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorCode}
                onChange={e => setColorCode(e.target.value)}
                className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-800"
              />
              <input
                type="text"
                required
                value={colorCode}
                onChange={e => setColorCode(e.target.value)}
                placeholder="#000000"
                className="flex-1 px-3 py-2 text-xs font-mono uppercase border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مرجع الـ Pantone (اختياري للصباغة والموردين)' : 'Pantone Reference (Optional)'}
            </label>
            <input
              type="text"
              value={pantoneRef}
              onChange={e => setPantoneRef(e.target.value)}
              placeholder={isAr ? 'مثال: PANTONE 19-4024 TCX' : 'e.g. PANTONE 19-4024 TCX'}
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              {isAr ? 'حفظ اللون' : 'Save Color'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

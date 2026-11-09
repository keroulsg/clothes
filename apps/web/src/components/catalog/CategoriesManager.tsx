import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  Layers,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { api } from '../../api/client';

export interface ClothingCategoryItem {
  id: string;
  name_ar: string;
  name_en?: string;
  code?: string;
  parent_id?: string;
  parent?: { id: string; name_ar: string };
  children?: Array<{ id: string; name_ar: string; code?: string }>;
  description?: string;
  is_active: boolean;
  models_count?: number;
  products_count?: number;
  created_at?: string;
}

type Category = ClothingCategoryItem;

interface CategoriesManagerProps {
  isAr?: boolean;
}

export const CategoriesManager: React.FC<CategoriesManagerProps> = ({ isAr = true }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form State
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.categories.getCategories({ search });
      if (res?.categories) {
        setCategories(res.categories);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل تصنيفات الملابس' : 'Failed to load categories'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [search]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setNameAr('');
    setNameEn('');
    setCode('');
    setParentId('');
    setDescription('');
    setIsActive(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setNameAr(cat.name_ar);
    setNameEn(cat.name_en || '');
    setCode(cat.code || '');
    setParentId(cat.parent_id || '');
    setDescription(cat.description || '');
    setIsActive(cat.is_active);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم التصنيف بالعربية' : 'Please enter Arabic category name');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingCategory) {
        await api.categories.updateCategory(editingCategory.id, {
          name_ar: nameAr,
          name_en: nameEn || undefined,
          code: code || undefined,
          parent_id: parentId || undefined,
          description: description || undefined,
          is_active: isActive,
        });
        setSuccessMsg(isAr ? 'تم تحديث التصنيف بنجاح' : 'Category updated successfully');
      } else {
        await api.categories.createCategory({
          name_ar: nameAr,
          name_en: nameEn || undefined,
          code: code || undefined,
          parent_id: parentId || undefined,
          description: description || undefined,
          is_active: isActive,
        });
        setSuccessMsg(isAr ? 'تم إنشاء التصنيف بنجاح' : 'Category created successfully');
      }

      setIsModalOpen(false);
      await loadCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ التصنيف' : 'Failed to save category'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(isAr ? `هل أنت متأكد من حذف أو إيقاف تصنيف (${name})؟` : `Delete or deactivate (${name})?`)) {
      return;
    }

    try {
      const res = await api.categories.deleteCategory(id);
      if (res?.deactivated) {
        setSuccessMsg(isAr ? 'تم إيقاف تفعيل التصنيف لوجود منتجات مرتبطة به' : 'Category deactivated (has linked items)');
      } else {
        setSuccessMsg(isAr ? 'تم حذف التصنيف بنجاح' : 'Category deleted successfully');
      }
      await loadCategories();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حذف التصنيف' : 'Failed to delete category'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'إجمالي التصنيفات' : 'Total Categories'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
              {categories.length} <span className="text-xs font-medium text-slate-400">{isAr ? 'تصنيف' : 'cats'}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{categories.filter(c => c.is_active).length} {isAr ? 'نشط ومعتمد' : 'active'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'التصنيفات الرئيسية' : 'Root Categories'}
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 leading-none">
              {categories.filter(c => !c.parent_id).length} <span className="text-xs font-medium text-slate-400">{isAr ? 'رئيسي' : 'root'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
              <span>{categories.filter(c => !!c.parent_id).length} {isAr ? 'تصنيف فرعي مشتق' : 'sub-categories'}</span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'الموديلات المرتبطة' : 'Linked Models'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
              {categories.reduce((acc, c) => acc + (c.models_count || 0), 0)} <span className="text-xs font-medium text-slate-400">{isAr ? 'موديل' : 'models'}</span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
              {isAr ? 'موزعة على خطوط التصنيع' : 'in production'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'المنتجات التجارية المرتبطة' : 'Linked Products'}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {categories.reduce((acc, c) => acc + (c.products_count || 0), 0)} <span className="text-xs font-medium text-slate-400">{isAr ? 'منتج' : 'products'}</span>
            </div>
            <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 pt-1">
              {isAr ? 'جاهزة للعرض في المتجر والـ POS' : 'ready for POS & store'}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action and Search Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 max-w-sm w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث في تصنيفات الملابس أو الكود...' : 'Search categories or code...'}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadCategories} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            {isAr ? 'تحديث' : 'Refresh'}
          </Button>
          <Button size="sm" variant="primary" onClick={handleOpenCreate} icon={<Plus className="w-3.5 h-3.5" />}>
            {isAr ? '+ تصنيف ملابس جديد' : '+ New Category'}
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Categories Table */}
      <Card className="p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              <tr>
                <th className="py-3 px-4">{isAr ? 'اسم التصنيف (عربي / English)' : 'Category Name'}</th>
                <th className="py-3 px-4">{isAr ? 'الكود' : 'Code'}</th>
                <th className="py-3 px-4">{isAr ? 'التصنيف الرئيسي' : 'Parent Category'}</th>
                <th className="py-3 px-4">{isAr ? 'الموديلات المرتبطة' : 'Linked Models'}</th>
                <th className="py-3 px-4">{isAr ? 'المنتجات التجارية' : 'Products'}</th>
                <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                    <span>{isAr ? 'جاري تحميل التصنيفات...' : 'Loading categories...'}</span>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <FolderTree className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      {isAr ? 'لم يتم إضافة أي تصنيفات ملابس حتى الآن' : 'No clothing categories added yet'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {isAr ? 'ابدأ بإنشاء تصنيفات مصنعك الخاصة بحرية تامة دون أي قيود مفروضة' : 'Create your custom clothing categories'}
                    </p>
                    <Button size="sm" variant="primary" onClick={handleOpenCreate} className="mt-3">
                      {isAr ? 'إضافة أول تصنيف الآن' : 'Add First Category'}
                    </Button>
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FolderTree className="w-3.5 h-3.5 text-[var(--brand-primary)] dark:text-[#f87171]" />
                        <span>{cat.name_ar}</span>
                      </div>
                      {cat.name_en && (
                        <div className="text-[11px] text-slate-500 font-sans mt-0.5">{cat.name_en}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {cat.code || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                      {cat.parent?.name_ar || (isAr ? 'تصنيف رئيسي' : 'Root Category')}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="neutral">
                        <Layers className="w-3 h-3 inline-block mr-1 rtl:ml-1" />
                        {cat.models_count || 0} {isAr ? 'موديل' : 'models'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="info">
                        <ShoppingBag className="w-3 h-3 inline-block mr-1 rtl:ml-1" />
                        {cat.products_count || 0} {isAr ? 'منتج' : 'products'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={cat.is_active ? 'success' : 'neutral'} dot>
                        {cat.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(cat)}
                          title={isAr ? 'تعديل التصنيف' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(cat.id, cat.name_ar)}
                          title={isAr ? 'حذف / إيقاف' : 'Delete'}
                          className="hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create / Edit Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? (isAr ? 'تعديل تصنيف الملابس' : 'Edit Category') : (isAr ? 'إضافة تصنيف ملابس جديد' : 'New Clothing Category')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم التصنيف بالعربية *' : 'Category Name (Arabic) *'}
            </label>
            <input
              type="text"
              required
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={isAr ? 'مثال: أطقم أطفال، بنطلونات جينز، قمصان رجالي...' : 'e.g. Kids Sets, Denim...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم التصنيف بالإنجليزية (اختياري)' : 'Category Name (English)'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Children Sets, Denim Trousers..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-[var(--brand-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'كود التصنيف (اختياري)' : 'Category Code'}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CAT-KID"
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'التصنيف الرئيسي الأب' : 'Parent Category'}
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="">{isAr ? '— تصنيف رئيسي (Root) —' : '— Root Category —'}</option>
                {categories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_ar} {c.code ? `(${c.code})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الوصف وملاحظات التصنيف' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isAr ? 'ملاحظات حول الموديلات أو الفئات التابعة...' : 'Notes...'}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="catIsActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--brand-primary)]"
            />
            <label htmlFor="catIsActive" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              {isAr ? 'التصنيف نشط ومتاح لاختيار الموديلات والمنتجات' : 'Category is active'}
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5 rtl:ml-1.5" />
                  {isAr ? 'جارِ الحفظ...' : 'Saving...'}
                </>
              ) : editingCategory ? (
                isAr ? 'حفظ التعديلات' : 'Save Changes'
              ) : (
                isAr ? 'إنشاء التصنيف' : 'Create Category'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

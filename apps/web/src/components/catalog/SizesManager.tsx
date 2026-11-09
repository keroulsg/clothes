import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Tag, Check, AlertCircle, 
  RefreshCw, FolderPlus, Eye, Layers, ChevronLeft, ChevronRight,
  FolderTree, CheckCircle 
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface SizeCategoryItem {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
  sizes_count?: number;
  sizes?: SizeItem[];
  created_at?: string;
  updated_at?: string;
}

export interface SizeItem {
  id: string;
  tenant_id: string;
  size_category_id?: string | null;
  name: string;
  category: string;
  sort_order: number;
  is_active?: boolean;
  variants_count?: number;
  size_category?: SizeCategoryItem | null;
  created_at?: string;
  updated_at?: string;
}

export const SizesManager: React.FC<{ isAr?: boolean }> = ({ isAr = true }) => {
  const [categories, setCategories] = useState<SizeCategoryItem[]>([]);
  const [sizes, setSizes] = useState<SizeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Size Modal states
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<SizeItem | null>(null);
  const [sizeName, setSizeName] = useState('');
  const [sizeCategoryId, setSizeCategoryId] = useState('');
  const [sizeSortOrder, setSizeSortOrder] = useState<number>(1);
  const [sizeIsActive, setSizeIsActive] = useState(true);

  // Category Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SizeCategoryItem | null>(null);
  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSortOrder, setCatSortOrder] = useState<number>(1);
  const [catIsActive, setCatIsActive] = useState(true);

  // View associated details modal
  const [viewingSize, setViewingSize] = useState<SizeItem | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [catsRes, sizesRes] = await Promise.all([
        api.models.getSizeCategories().catch(() => ({ categories: [] })),
        api.models.getSizes().catch(() => ({ sizes: [] })),
      ]);

      const loadedCats = catsRes.categories || [];
      const loadedSizes = sizesRes.sizes || [];

      setCategories(loadedCats);
      setSizes(loadedSizes);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل تحميل بيانات المقاسات' : 'Failed to load sizes and categories'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Size Modal Handlers ---
  const openCreateSizeModal = (presetCategoryId?: string) => {
    setEditingSize(null);
    setSizeName('');
    setSizeCategoryId(presetCategoryId || categories[0]?.id || '');
    setSizeSortOrder(sizes.length > 0 ? Math.max(...sizes.map(s => s.sort_order || 0)) + 1 : 1);
    setSizeIsActive(true);
    setErrorMsg('');
    setIsSizeModalOpen(true);
  };

  const openEditSizeModal = (size: SizeItem) => {
    setEditingSize(size);
    setSizeName(size.name);
    setSizeCategoryId(size.size_category_id || categories.find(c => c.name === size.category)?.id || '');
    setSizeSortOrder(size.sort_order || 1);
    setSizeIsActive(size.is_active ?? true);
    setErrorMsg('');
    setIsSizeModalOpen(true);
  };

  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sizeName.trim()) {
      setErrorMsg(isAr ? 'يرجى كتابة اسم أو رمز المقاس' : 'Please enter size name');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const selectedCat = categories.find(c => c.id === sizeCategoryId);
      const payload: any = {
        name: sizeName.trim(),
        size_category_id: sizeCategoryId || null,
        category: selectedCat?.name || (sizeCategoryId ? undefined : 'general'),
        sort_order: sizeSortOrder,
        is_active: sizeIsActive,
      };

      if (editingSize) {
        await api.models.updateSize(editingSize.id, payload);
        setSuccessMsg(isAr ? 'تم تعديل المقاس بنجاح' : 'Size updated successfully');
      } else {
        await api.models.createSize(payload);
        setSuccessMsg(isAr ? 'تم إضافة المقاس بنجاح' : 'Size created successfully');
      }
      setIsSizeModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ المقاس' : 'Failed to save size'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSize = async (size: SizeItem) => {
    if (size.variants_count && size.variants_count > 0) {
      alert(isAr 
        ? `لا يمكن حذف المقاس "${size.name}" نظراً لاستخدامه في ${size.variants_count} من متغيرات الموديلات الإنتاجية بالمصنع. يمكنك إيقاف تفعيله بدلاً من حذفه.`
        : `Cannot delete size "${size.name}" because it is referenced by ${size.variants_count} production variants. You can deactivate it instead.`
      );
      return;
    }

    if (!confirm(isAr ? `هل أنت متأكد من حذف المقاس "${size.name}" نهائياً؟` : `Delete size "${size.name}" permanently?`)) {
      return;
    }

    try {
      await api.models.deleteSize(size.id);
      setSuccessMsg(isAr ? 'تم حذف المقاس بنجاح' : 'Size deleted successfully');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حذف المقاس' : 'Failed to delete size'));
    }
  };

  // --- Category Modal Handlers ---
  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDescription('');
    setCatSortOrder(categories.length > 0 ? Math.max(...categories.map(c => c.sort_order || 0)) + 1 : 1);
    setCatIsActive(true);
    setErrorMsg('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: SizeCategoryItem) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatDescription(cat.description || '');
    setCatSortOrder(cat.sort_order || 1);
    setCatIsActive(cat.is_active ?? true);
    setErrorMsg('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم تصنيف المقاسات' : 'Please provide category name');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload: any = {
        name: catName.trim(),
        description: catDescription.trim() || null,
        sort_order: catSortOrder,
        is_active: catIsActive,
      };

      if (editingCategory) {
        await api.models.updateSizeCategory(editingCategory.id, payload);
        setSuccessMsg(isAr ? 'تم تحديث تصنيف المقاسات بنجاح' : 'Size category updated');
      } else {
        await api.models.createSizeCategory(payload);
        setSuccessMsg(isAr ? 'تم إنشاء تصنيف المقاسات بنجاح' : 'Size category created');
      }
      setIsCategoryModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ تصنيف المقاسات' : 'Failed to save size category'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: SizeCategoryItem) => {
    if (!confirm(isAr 
      ? `هل أنت متأكد من حذف التصنيف "${cat.name}"؟ سيتم حذف المقاسات التابعة له غير المستخدمة إنتاجياً.` 
      : `Delete category "${cat.name}"? Unused sizes in this category will also be removed.`
    )) {
      return;
    }

    try {
      await api.models.deleteSizeCategory(cat.id);
      setSuccessMsg(isAr ? 'تم حذف تصنيف المقاسات بنجاح' : 'Category deleted');
      if (selectedCategory === cat.id) {
        setSelectedCategory('all');
      }
      await loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حذف تصنيف المقاسات' : 'Failed to delete category'));
    }
  };

  // Filtered Sizes
  const filteredSizes = sizes.filter(size => {
    const matchesSearch = size.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = 
      selectedCategory === 'all' || 
      size.size_category_id === selectedCategory ||
      (size.size_category && size.size_category.id === selectedCategory);
    
    const matchesStatus = 
      selectedStatus === 'all' || 
      (selectedStatus === 'active' && size.is_active !== false) ||
      (selectedStatus === 'inactive' && size.is_active === false);

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredSizes.length / pageSize) || 1;
  const paginatedSizes = filteredSizes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Statistics
  const totalSizesCount = sizes.length;
  const usedSizesCount = sizes.filter(s => (s.variants_count || 0) > 0).length;
  const activeSizesCount = sizes.filter(s => s.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {isAr ? 'دليل المقاسات الديناميكي وتدريج الإنتاج' : 'Dynamic Size Guide & Production Grading'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAr 
                  ? 'إدارة تصنيفات ومقاسات المصنع بحرية كاملة (رجالي، حريمي، رياضي، زي موحد، أطفال أو مخصص)'
                  : 'Manage custom factory size categories (Men, Women, Sportswear, Uniforms, Kids) with production safeguards'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateCategoryModal}
            className="hover:border-blue-400 text-slate-700 dark:text-slate-200"
            icon={<FolderPlus className="w-3.5 h-3.5 text-blue-500" />}
          >
            {isAr ? 'إضافة تصنيف مقاسات' : 'New Size Category'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreateSizeModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white border-transparent"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? 'إضافة مقاس جديد' : 'New Size'}
          </Button>
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
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl flex items-center gap-2 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'إجمالي المقاسات' : 'Total Sizes'}
            </span>
            <div className="text-2xl font-bold font-mono text-slate-800 dark:text-white leading-none">
              {totalSizesCount}
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              {isAr ? 'معرفة بالنظام' : 'In catalog'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200/60 dark:border-slate-700/60 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'تصنيفات المقاسات' : 'Categories'}
            </span>
            <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 leading-none">
              {categories.length}
            </div>
            <span className="text-[11px] text-blue-600/80 block pt-1">
              {isAr ? 'تصنيف مقاسات مستقل' : 'Grading groups'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <FolderTree className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'مستخدمة في الإنتاج' : 'In Production'}
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {usedSizesCount}
            </div>
            <span className="text-[11px] text-emerald-600/80 block pt-1">
              {isAr ? 'مرتبطة بموديلات نشطة' : 'Linked to styles'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'المقاسات النشطة' : 'Active Sizes'}
            </span>
            <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 leading-none">
              {activeSizesCount}
            </div>
            <span className="text-[11px] text-indigo-600/80 block pt-1">
              {isAr ? 'جاهزة لإصدار أوامر القص' : 'Ready for cutting'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Dynamic Size Categories Section */}
      {categories.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
              {isAr ? 'تصنيفات المقاسات المعرفة للمصنع' : 'Factory Size Categories'}
            </h3>
            <span className="text-xs text-slate-400">
              {categories.length} {isAr ? 'تصنيف' : 'categories'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map(cat => {
              const catSizes = sizes.filter(s => s.size_category_id === cat.id || s.category === cat.name);
              return (
                <div 
                  key={cat.id} 
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-all ${
                    cat.is_active 
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700' 
                      : 'bg-slate-100/50 dark:bg-slate-800/30 border-dashed border-slate-300 opacity-60'
                  }`}
                >
                  <span className="font-bold text-slate-800 dark:text-slate-100">{cat.name}</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                    {catSizes.length}
                  </span>
                  <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-0.5">
                    <button
                      onClick={() => openEditCategoryModal(cat)}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title={isAr ? 'تعديل التصنيف' : 'Edit category'}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title={isAr ? 'حذف التصنيف' : 'Delete category'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder={isAr ? 'بحث عن مقاس...' : 'Search size...'}
            className="w-full pr-9 pl-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isAr ? 'جميع التصنيفات' : 'All Categories'} ({sizes.length})
          </button>

          {categories.map(cat => {
            const count = sizes.filter(s => s.size_category_id === cat.id || s.category === cat.name).length;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}

          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All Status'}</option>
            <option value="active">{isAr ? 'النشطة فقط' : 'Active Only'}</option>
            <option value="inactive">{isAr ? 'المعطلة' : 'Inactive'}</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="text-slate-500 p-2"
            title={isAr ? 'تحديث' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading && sizes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {isAr ? 'جاري تحميل دليل المقاسات...' : 'Loading size catalog...'}
            </p>
          </div>
        ) : filteredSizes.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Tag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto stroke-[1.5]" />
            <h4 className="text-base font-bold text-slate-700 dark:text-slate-200">
              {isAr ? 'دليل المقاسات فارغ حالياً' : 'No Sizes Found'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {isAr 
                ? 'لم يتم إنشاء أي مقاسات في هذا التصنيف بعد. يمكنك إضافة مقاس جديد أو إنشاء تصنيف مخصص مثل (رجالي، حريمي، رياضي، أطفال) وتحديد المقاسات التابعة له.'
                : 'No sizes have been created for this category yet. Add a new size or create a custom category.'}
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button onClick={() => openCreateSizeModal(selectedCategory !== 'all' ? selectedCategory : undefined)}>
                <Plus className="w-4 h-4 ml-1.5" />
                {isAr ? 'إضافة أول مقاس' : 'Add First Size'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">{isAr ? 'الترتيب' : 'Order'}</th>
                  <th className="py-3 px-4">{isAr ? 'اسم / رمز المقاس' : 'Size Name / Code'}</th>
                  <th className="py-3 px-4">{isAr ? 'تصنيف المقاس' : 'Category'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'المتغيرات المرتبطة' : 'Linked Variants'}</th>
                  <th className="py-3 px-4 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 text-center w-32">{isAr ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedSizes.map(size => {
                  const categoryName = size.size_category?.name || size.category || 'عام';
                  const isUsed = (size.variants_count || 0) > 0;

                  return (
                    <tr 
                      key={size.id} 
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        #{size.sort_order}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {size.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isUsed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[11px]">
                            <Layers className="w-3 h-3" />
                            {size.variants_count} {isAr ? 'متغير' : 'variants'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">
                            {isAr ? 'غير مستخدم' : 'Unused'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          size.is_active !== false
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {size.is_active !== false ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingSize(size)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                            title={isAr ? 'معاينة التفاصيل' : 'View details'}
                            aria-label={isAr ? 'معاينة المقاس' : 'View size'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditSizeModal(size)}
                            className="inline-flex items-center justify-center p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                            title={isAr ? 'تعديل المقاس' : 'Edit size'}
                            aria-label={isAr ? 'تعديل المقاس' : 'Edit size'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSize(size)}
                            disabled={isUsed}
                            className={`inline-flex items-center justify-center p-2 rounded-xl transition-all ${
                              isUsed 
                                ? 'text-slate-300 dark:text-slate-700 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-800 cursor-not-allowed' 
                                : 'text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer'
                            }`}
                            title={isUsed ? (isAr ? 'لا يمكن حذف مقاس مستخدم في الإنتاج' : 'Cannot delete size in use') : (isAr ? 'حذف المقاس' : 'Delete size')}
                            aria-label={isAr ? 'حذف المقاس' : 'Delete size'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredSizes.length > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {isAr ? 'عرض' : 'Showing'} {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredSizes.length)} {isAr ? 'من أصل' : 'of'} {filteredSizes.length} {isAr ? 'مقاس' : 'sizes'}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-7 px-2 text-xs"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Size */}
      <Modal
        isOpen={isSizeModalOpen}
        onClose={() => setIsSizeModalOpen(false)}
        title={editingSize ? (isAr ? 'تعديل المقاس' : 'Edit Size') : (isAr ? 'إضافة مقاس جديد' : 'New Size')}
      >
        <form onSubmit={handleSaveSize} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم أو رمز المقاس' : 'Size Name / Label'} *
            </label>
            <input
              type="text"
              required
              value={sizeName}
              onChange={e => setSizeName(e.target.value)}
              placeholder={isAr ? 'مثال: M أو XL أو 42 أو 3-4Y أو مخصص' : 'e.g. M, XL, 42, 3-4Y, etc.'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'تصنيف المقاس' : 'Size Category'}
            </label>
            <select
              value={sizeCategoryId}
              onChange={e => setSizeCategoryId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            >
              <option value="">{isAr ? '-- تصنيف عام --' : '-- General Category --'}</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.description ? `(${c.description})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'ترتيب العرض' : 'Sort Order'}
              </label>
              <input
                type="number"
                min="0"
                value={sizeSortOrder}
                onChange={e => setSizeSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={sizeIsActive}
                  onChange={e => setSizeIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'المقاس مفعل ونشط' : 'Active for Production'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsSizeModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1.5" />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ المقاس' : 'Save Size'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create / Edit Category */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? (isAr ? 'تعديل تصنيف المقاسات' : 'Edit Category') : (isAr ? 'إضافة تصنيف مقاسات جديد' : 'New Size Category')}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم التصنيف' : 'Category Name'} *
            </label>
            <input
              type="text"
              required
              value={catName}
              onChange={e => setCatName(e.target.value)}
              placeholder={isAr ? 'مثال: رجالي، حريمي، ملابس رياضية، زي موحد، أطفال' : 'e.g. Men, Women, Sportswear, Uniforms, Kids'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'الوصف وملاحظات التدريج' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={catDescription}
              onChange={e => setCatDescription(e.target.value)}
              placeholder={isAr ? 'تفاصيل جدول التدريج والفئة المستهدفة...' : 'Grading notes and targeted fit...'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'ترتيب العرض' : 'Sort Order'}
              </label>
              <input
                type="number"
                min="0"
                value={catSortOrder}
                onChange={e => setCatSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <input
                  type="checkbox"
                  checked={catIsActive}
                  onChange={e => setCatIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isAr ? 'التصنيف مفعل' : 'Active Category'}
                </span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setIsCategoryModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin ml-1.5" />
                  {isAr ? 'جاري الحفظ...' : 'Saving...'}
                </>
              ) : (
                isAr ? 'حفظ التصنيف' : 'Save Category'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: View Size Details & Usage */}
      <Modal
        isOpen={viewingSize !== null}
        onClose={() => setViewingSize(null)}
        title={isAr ? `تفاصيل المقاس: ${viewingSize?.name || ''}` : `Size Details: ${viewingSize?.name || ''}`}
      >
        {viewingSize && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block">{isAr ? 'رمز المقاس' : 'Size Name'}</span>
                <span className="font-bold text-slate-800 dark:text-white text-base">{viewingSize.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'التصنيف' : 'Category'}</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {viewingSize.size_category?.name || viewingSize.category || 'عام'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'الترتيب' : 'Sort Order'}</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">#{viewingSize.sort_order}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{isAr ? 'المتغيرات المرتبطة' : 'Linked Variants'}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{viewingSize.variants_count || 0}</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl text-xs text-blue-900 dark:text-blue-300">
              <p className="font-semibold mb-1">
                {isAr ? 'الحماية والأمان الإنتاجي:' : 'Production Safety Rules:'}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                {viewingSize.variants_count && viewingSize.variants_count > 0
                  ? (isAr 
                      ? 'هذا المقاس مرتبط بمتغيرات أوامر إنتاج فعلية بالمصنع، لذلك يتم تقييد حذفه التدميري للحفاظ على سلامة الحسابات وأوامر القص، مع إمكانية إيقاف تفعيله.'
                      : 'This size is used in active production records and cannot be hard deleted.')
                  : (isAr 
                      ? 'هذا المقاس غير مرتبط بأي موديلات أو أوامر قص ويمكن حذفه بأمان.'
                      : 'This size is not used in any active records and can be safely deleted.')}
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setViewingSize(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

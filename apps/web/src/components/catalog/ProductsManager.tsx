import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Search, Edit2, Trash2, ShoppingBag, Check, AlertCircle, 
  RefreshCw, Image as ImageIcon, Layers, Upload, X, Eye, 
  DollarSign, Store, ChevronLeft, ChevronRight,
  Package, Printer, Grid, List, ChevronDown, ChevronUp, AlertTriangle,
  Star, ArrowLeft, ArrowRight
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ProductPrintModal } from './ProductPrintModal';
import type { ClothingCategoryItem } from './CategoriesManager';

export interface GalleryItem {
  id: string;
  url: string;
  path?: string;
  filename?: string;
  is_primary?: boolean;
  sort_order?: number;
}

export interface ProductItem {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  garment_model_id?: string | null;
  name: string;
  name_en?: string | null;
  slug: string;
  description?: string | null;
  main_image?: string | null;
  gallery?: Array<GalleryItem | string> | null;
  base_cost: number;
  selling_price: number;
  wholesale_price?: number | null;
  pos_price?: number | null;
  is_pos_available?: boolean;
  stock_visibility: 'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder';
  status: 'draft' | 'active' | 'archived';
  specifications?: any;
  category?: { id: string; name_ar: string; name_en?: string };
  garment_model?: { id: string; code: string; name: string };
  variants_count?: number;
  created_at?: string;
  updated_at?: string;
}

export const ProductsManager: React.FC<{ isAr?: boolean }> = ({ isAr = true }) => {
  // Products & Master Data
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ClothingCategoryItem[]>([]);
  const [garmentModels, setGarmentModels] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStock, setSelectedStock] = useState<string>('all');

  // View Mode: 'grid' (cards) vs 'table'
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Real Backend Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Modals & Action States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(null);
  const [printingProduct, setPrintingProduct] = useState<ProductItem | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formGarmentModelId, setFormGarmentModelId] = useState('');
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formPosPrice, setFormPosPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formBaseCost, setFormBaseCost] = useState<number>(0);
  const [formDescription, setFormDescription] = useState('');
  const [formMainImage, setFormMainImage] = useState('');
  const [formGallery, setFormGallery] = useState<GalleryItem[]>([]);
  const [formIsPosAvailable, setFormIsPosAvailable] = useState<boolean>(true);
  const [formStockVisibility, setFormStockVisibility] = useState<'in_stock' | 'low_stock' | 'out_of_stock' | 'backorder'>('in_stock');
  const [formStatus, setFormStatus] = useState<'draft' | 'active' | 'archived'>('active');

  // Warehouse & Finished Goods Auto-Sync Fields
  const [formWarehouseId, setFormWarehouseId] = useState('');
  const [formInitialStock, setFormInitialStock] = useState<number>(0);
  const [formStorageZone, setFormStorageZone] = useState('');
  const [formRackLocation, setFormRackLocation] = useState('');
  const [formShelfBin, setFormShelfBin] = useState('');

  // Viewing product image carousel state
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(0);

  // Secondary Image URL Accordion
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Image Upload & Drag-and-Drop State
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Submission & Toast Messages
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Debounce search term to prevent excessive backend queries
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Load Categories, Garment Models & Warehouses once
  const loadMasterData = async () => {
    try {
      const [catRes, modRes, whRes] = await Promise.all([
        api.categories.getCategories().catch(() => ({ categories: [] })),
        api.models.getModels().catch(() => ({ data: [] })),
        api.inventory.getWarehouses().catch(() => ({ warehouses: [] })),
      ]);
      setCategories(catRes.categories || []);
      setGarmentModels(modRes.data || (Array.isArray(modRes) ? modRes : []));
      setWarehouses(whRes.warehouses || []);
    } catch (err) {
      console.error('Failed to load master data', err);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Fetch Products using Real Backend Pagination & Filters
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const params: any = {
        page: currentPage,
        per_page: pageSize,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (selectedStock !== 'all') {
        params.stock_visibility = selectedStock;
      }

      const res = await api.products.getProducts(params);

      if (res && res.data) {
        // Standard Laravel LengthAwarePaginator
        setProducts(res.data);
        setTotalRecords(res.total ?? res.data.length);
        setTotalPages(res.last_page ?? 1);
      } else if (Array.isArray(res)) {
        setProducts(res);
        setTotalRecords(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / pageSize)));
      } else {
        setProducts([]);
        setTotalRecords(0);
        setTotalPages(1);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل تحميل المنتجات من الخادم' : 'Failed to load products from server'));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedCategory, selectedStatus, selectedStock, isAr]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Open Create Product Modal
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormNameEn('');
    setFormSlug('');
    setFormCategoryId(categories[0]?.id || '');
    setFormGarmentModelId('');
    setFormSellingPrice(0);
    setFormPosPrice(0);
    setFormWholesalePrice(0);
    setFormBaseCost(0);
    setFormDescription('');
    setFormMainImage('');
    setFormGallery([]);
    setFormIsPosAvailable(true);
    setFormStockVisibility('in_stock');
    setFormStatus('active');
    setFormWarehouseId(warehouses[0]?.id || '');
    setFormInitialStock(0);
    setFormStorageZone('');
    setFormRackLocation('');
    setFormShelfBin('');
    setShowUrlInput(false);
    setImageUploadError('');
    setErrorMsg('');
    setIsFormModalOpen(true);
  };

  // Open Edit Product Modal
  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormNameEn(p.name_en || '');
    setFormSlug(p.slug || '');
    setFormCategoryId(p.category_id || '');
    setFormGarmentModelId(p.garment_model_id || '');
    setFormSellingPrice(Number(p.selling_price) || 0);
    setFormPosPrice(Number(p.pos_price) || 0);
    setFormWholesalePrice(Number(p.wholesale_price) || 0);
    setFormBaseCost(Number(p.base_cost) || 0);
    setFormDescription(p.description || '');
    setFormMainImage(p.main_image || '');
    setFormWarehouseId(warehouses[0]?.id || '');
    setFormInitialStock(0);
    setFormStorageZone('');
    setFormRackLocation('');
    setFormShelfBin('');

    // Normalize gallery items
    const rawGallery = p.gallery;
    let initialGallery: GalleryItem[] = [];
    if (Array.isArray(rawGallery) && rawGallery.length > 0) {
      initialGallery = rawGallery.map((g: any, idx: number) => {
        if (typeof g === 'string') {
          return {
            id: `img_${idx}`,
            url: g,
            is_primary: g === p.main_image || idx === 0,
            sort_order: idx,
          };
        }
        return {
          id: g.id || `img_${idx}`,
          url: g.url || '',
          path: g.path || '',
          filename: g.filename || '',
          is_primary: g.is_primary ?? (g.url === p.main_image || idx === 0),
          sort_order: g.sort_order ?? idx,
        };
      });
    } else if (p.main_image) {
      initialGallery = [{
        id: 'img_primary',
        url: p.main_image,
        is_primary: true,
        sort_order: 0,
      }];
    }
    setFormGallery(initialGallery);

    setFormIsPosAvailable(p.is_pos_available !== undefined ? Boolean(p.is_pos_available) : true);
    setFormStockVisibility(p.stock_visibility || 'in_stock');
    setFormStatus(p.status || 'active');
    setShowUrlInput(Boolean(p.main_image && !p.main_image.startsWith('/storage/')));
    setImageUploadError('');
    setErrorMsg('');
    setIsFormModalOpen(true);
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0621-\u064A\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProduct && !formSlug) {
      setFormSlug(generateSlugFromName(val));
    }
  };

  // Multi-Image File Upload Handler
  const processImageFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(f.type));
    if (fileArray.length === 0) {
      setImageUploadError(isAr ? 'يرجى اختيار صور صالحة بصيغة JPEG أو PNG أو WEBP' : 'Please select JPEG, PNG, or WEBP images');
      return;
    }

    for (const f of fileArray) {
      if (f.size > 5 * 1024 * 1024) {
        setImageUploadError(isAr ? `الصورة "${f.name}" تتجاوز الحد الأقصى 5 ميجابايت` : `Image "${f.name}" exceeds 5MB`);
        return;
      }
    }

    setIsUploadingImage(true);
    setImageUploadError('');

    try {
      const res = await api.products.uploadImages(fileArray, editingProduct?.id);
      if (res?.images && Array.isArray(res.images)) {
        setFormGallery((prev) => {
          const combined = [...prev, ...res.images];
          const hasPrimary = combined.some(x => x.is_primary);
          if (!hasPrimary && combined.length > 0) {
            combined[0].is_primary = true;
          }
          const primaryItem = combined.find(x => x.is_primary) || combined[0];
          setFormMainImage(primaryItem?.url || '');
          return combined;
        });
      } else if (res?.url) {
        const newItem: GalleryItem = {
          id: 'img_' + Date.now(),
          url: res.url,
          is_primary: formGallery.length === 0,
          sort_order: formGallery.length,
        };
        setFormGallery((prev) => [...prev, newItem]);
        if (!formMainImage) setFormMainImage(res.url);
      }
    } catch (err: any) {
      setImageUploadError(err.message || (isAr ? 'فشل رفع الصور على الخادم' : 'Failed to upload images'));
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const setPrimaryImage = (id: string) => {
    setFormGallery((prev) => {
      const updated = prev.map((img) => ({
        ...img,
        is_primary: img.id === id,
      }));
      const primary = updated.find(x => x.is_primary);
      if (primary) setFormMainImage(primary.url);
      return updated;
    });
  };

  const removeGalleryImage = async (id: string) => {
    const item = formGallery.find(x => x.id === id);
    if (!item) return;

    if (item.url && editingProduct?.id && item.url.startsWith('/storage/')) {
      try {
        await api.products.deleteImage({ url: item.url, product_id: editingProduct.id });
      } catch (e) {
        console.warn('Backend image delete warning:', e);
      }
    }

    setFormGallery((prev) => {
      const remaining = prev.filter(x => x.id !== id);
      const hasPrimary = remaining.some(x => x.is_primary);
      if (!hasPrimary && remaining.length > 0) {
        remaining[0].is_primary = true;
      }
      const primary = remaining.find(x => x.is_primary) || remaining[0];
      setFormMainImage(primary?.url || '');
      return remaining;
    });
  };

  const moveGalleryImage = (index: number, direction: 'left' | 'right') => {
    setFormGallery((prev) => {
      const newArr = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;
      return newArr.map((item, idx) => ({ ...item, sort_order: idx }));
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processImageFiles(files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Save (Create or Update) Product
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formSellingPrice <= 0) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم المنتج وسعر بيع صحيح أكبر من الصفر' : 'Please provide product name and valid selling price');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const primaryItem = formGallery.find(g => g.is_primary) || formGallery[0];
      const finalMainImage = primaryItem?.url || formMainImage.trim() || null;

      const payload: any = {
        name: formName.trim(),
        name_en: formNameEn.trim() || null,
        slug: formSlug.trim() || generateSlugFromName(formName),
        category_id: formCategoryId || null,
        garment_model_id: formGarmentModelId || null,
        selling_price: formSellingPrice,
        pos_price: formPosPrice > 0 ? formPosPrice : formSellingPrice,
        wholesale_price: formWholesalePrice || null,
        base_cost: formBaseCost || 0,
        is_pos_available: formIsPosAvailable,
        description: formDescription.trim() || null,
        main_image: finalMainImage,
        gallery: formGallery.length > 0 ? formGallery : (finalMainImage ? [{ id: 'primary', url: finalMainImage, is_primary: true, sort_order: 0 }] : null),
        stock_visibility: formStockVisibility,
        status: formStatus,
      };

      if (editingProduct) {
        await api.products.updateProduct(editingProduct.id, payload);
        setSuccessMsg(isAr ? 'تم تعديل بيانات المنتج بنجاح' : 'Product updated successfully');
      } else {
        const createRes = await api.products.createProduct(payload);
        setSuccessMsg(isAr ? 'تم إنشاء المنتج التجاري وتوثيقه بنجاح' : 'Product created successfully');

        // Automatically create Finished Goods inventory record if warehouse or stock or rack is specified
        if (formInitialStock > 0 || formRackLocation.trim() || formShelfBin.trim() || formWarehouseId) {
          try {
            const targetWarehouseId = formWarehouseId || (warehouses[0]?.id);
            if (targetWarehouseId) {
              await api.inventory.createItem({
                warehouse_id: targetWarehouseId,
                item_type: 'finished_good',
                code: payload.slug ? payload.slug.toUpperCase() : `PRD-${Date.now().toString().slice(-4)}`,
                name: formName.trim(),
                unit_of_measure: isAr ? 'قطعة' : 'piece',
                initial_balance: Number(formInitialStock) || 0,
                average_cost: Number(formBaseCost) || 0,
                reorder_level: 5,
                storage_zone: formStorageZone.trim() || undefined,
                rack_location: formRackLocation.trim() || undefined,
                shelf_bin_location: formShelfBin.trim() || undefined,
                technical_specs: {
                  product_id: createRes?.product?.id,
                  selling_price: formSellingPrice,
                  pos_price: formPosPrice,
                },
              });
            }
          } catch (invErr) {
            console.warn('Auto finished goods sync notice:', invErr);
          }
        }
      }

      setIsFormModalOpen(false);
      loadProducts();
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ المنتج' : 'Failed to save product'));
    } finally {
      setIsSaving(false);
    }
  };

  // Safe Deletion Handler
  const confirmDelete = async () => {
    if (!deletingProduct) return;

    setIsDeleting(true);
    try {
      const res = await api.products.deleteProduct(deletingProduct.id);

      if (res && res.action_taken === 'archived') {
        setSuccessMsg(
          isAr
            ? `المنتج "${deletingProduct.name}" مرتبط بسجلات تشغيلية أو مبيعات، تم أرشفته وتعطيله بأمان لحماية البيانات.`
            : `Product "${deletingProduct.name}" is referenced by active records; it was safely archived instead.`
        );
      } else {
        setSuccessMsg(
          isAr
            ? `تم حذف المنتج "${deletingProduct.name}" بنجاح.`
            : `Product "${deletingProduct.name}" was deleted successfully.`
        );
      }

      setDeletingProduct(null);
      loadProducts();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حذف المنتج' : 'Failed to delete product'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear all filters & search
  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedStock('all');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedStock !== 'all');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isAr ? 'كتالوج المنتجات التجارية والمعارض' : 'Commercial Products & Omnichannel Catalog'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr 
                ? 'إدارة أسعار المتجر ونقاط البيع (POS)، رفع صور المنتجات، والربط الدقيق بموديلات الإنتاج وبطاقات التكلفة'
                : 'Manage independent POS/Storefront/Wholesale prices, direct device image uploads, and BOM links'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={openCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {isAr ? 'إضافة منتج تجاري جديد' : 'New Product'}
          </Button>
        </div>
      </div>

      {/* KPI Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'إجمالي المنتجات' : 'Total Products'}
            </span>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono leading-none">
              {totalRecords}
            </div>
            <span className="text-[11px] text-slate-400 block pt-1">
              {isAr ? 'مسجلة في قاعدة البيانات' : 'In catalog'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'معروض في المتجر' : 'Active Online'}
            </span>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono leading-none">
              {products.filter(p => p.status === 'active').length}
            </div>
            <span className="text-[11px] text-emerald-600/80 block pt-1">
              {isAr ? 'جاهز للشراء أونلاين' : 'Purchasable'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'متاح بنقاط البيع (POS)' : 'POS Ready'}
            </span>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono leading-none">
              {products.filter(p => p.is_pos_available !== false).length}
            </div>
            <span className="text-[11px] text-purple-600/80 block pt-1">
              {isAr ? 'تسعير كاونتر مخصص' : 'Custom POS price'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
              {isAr ? 'مرتبط بأوامر تشغيل (BOM)' : 'Linked to BOM'}
            </span>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono leading-none">
              {products.filter(p => Boolean(p.garment_model_id)).length}
            </div>
            <span className="text-[11px] text-blue-600/80 block pt-1">
              {isAr ? 'تتبع تكاليف وقص' : 'Tracked production'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl flex items-center gap-2 text-xs">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search, Filter & Controls Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث بالاسم، الكود، أو موديل التشغيل...' : 'Search name, SKU, or linked model...'}
            className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">{isAr ? 'جميع التصنيفات' : 'All Categories'}</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
            <option value="active">{isAr ? 'نشط في المتجر' : 'Active'}</option>
            <option value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
            <option value="archived">{isAr ? 'مؤرشف' : 'Archived'}</option>
          </select>

          {/* Stock Filter */}
          <select
            value={selectedStock}
            onChange={e => {
              setSelectedStock(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">{isAr ? 'حالة المخزون (الكل)' : 'All Stock'}</option>
            <option value="in_stock">{isAr ? 'متوفر' : 'In Stock'}</option>
            <option value="low_stock">{isAr ? 'كمية محدودة' : 'Low Stock'}</option>
            <option value="out_of_stock">{isAr ? 'نفذت الكمية' : 'Out of Stock'}</option>
          </select>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            title={isAr ? 'عدد العناصر بالصفحة' : 'Page size'}
          >
            <option value="10">10 {isAr ? 'لكل صفحة' : '/ page'}</option>
            <option value="20">20 {isAr ? 'لكل صفحة' : '/ page'}</option>
            <option value="50">50 {isAr ? 'لكل صفحة' : '/ page'}</option>
            <option value="100">100 {isAr ? 'لكل صفحة' : '/ page'}</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title={isAr ? 'عرض البطاقات' : 'Grid Cards View'}
              aria-label={isAr ? 'عرض شبكي بالبطاقات' : 'Grid view'}
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
              title={isAr ? 'عرض الجدول' : 'Table View'}
              aria-label={isAr ? 'عرض جدول تفصيلي' : 'Table view'}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs text-slate-500 hover:text-red-600 border-dashed"
            >
              <X className="w-3 h-3 ml-1" />
              {isAr ? 'مسح الفلاتر' : 'Reset'}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={loadProducts}
            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 p-1.5"
            title={isAr ? 'تحديث البيانات' : 'Refresh'}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Content: Cards Grid or Table */}
      {isLoading && products.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-slate-500 text-xs">{isAr ? 'جاري تحميل منتجات الكتالوج...' : 'Loading commercial catalog...'}</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            {hasActiveFilters
              ? (isAr ? 'لا توجد نتائج مطابقة لشروط البحث' : 'No products match search criteria')
              : (isAr ? 'لا توجد منتجات تجارية مسجلة بالكتالوج' : 'No commercial products found in catalog')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-5">
            {hasActiveFilters
              ? (isAr ? 'جرب تغيير شروط الفلترة أو مسح حقل البحث لعرض المنتجات.' : 'Try adjusting your filters or search terms.')
              : (isAr ? 'أضف أول منتج تجاري للبدء في البيع عبر المتجر الإلكتروني أو كاونتر المعرض (POS).' : 'Create your first finished product to begin selling online or in-store.')}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
              {isAr ? 'مسح الفلاتر والبحث' : 'Clear Filters'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
            >
              <Plus className="w-3.5 h-3.5 ml-1.5" />
              {isAr ? 'إضافة أول منتج للبيع' : 'Create First Product'}
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Redesigned Minimal SaaS Product Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => {
            const hasBOM = Boolean(p.garment_model);
            const posPrice = Number(p.pos_price || p.selling_price) || 0;
            const sellingPrice = Number(p.selling_price) || 0;
            const wholesalePrice = Number(p.wholesale_price) || 0;

            return (
              <div
                key={p.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Product Image Header with Aspect Ratio & Badges */}
                <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 overflow-hidden border-b border-slate-100 dark:border-slate-800">
                  {p.main_image ? (
                    <img
                      src={p.main_image}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}

                  {/* Fallback Icon if image missing or broken */}
                  <div className={`absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-600 ${p.main_image ? '-z-10' : ''}`}>
                    <ShoppingBag className="w-12 h-12 stroke-[1.2]" />
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                      p.status === 'active'
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : p.status === 'draft'
                        ? 'bg-slate-800/80 text-white border-slate-700 backdrop-blur-xs'
                        : 'bg-red-500 text-white border-red-600'
                    }`}>
                      {p.status === 'active' ? (isAr ? 'نشط' : 'Active') : p.status === 'draft' ? (isAr ? 'مسودة' : 'Draft') : (isAr ? 'مؤرشف' : 'Archived')}
                    </span>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                      p.stock_visibility === 'in_stock'
                        ? 'bg-white/90 text-emerald-800 border-emerald-200'
                        : p.stock_visibility === 'low_stock'
                        ? 'bg-white/90 text-amber-800 border-amber-200'
                        : 'bg-white/90 text-red-800 border-red-200'
                    }`}>
                      {p.stock_visibility === 'in_stock' ? (isAr ? 'متوفر' : 'In Stock')
                        : p.stock_visibility === 'low_stock' ? (isAr ? 'محدود' : 'Low Stock')
                        : (isAr ? 'نفذت الكمية' : 'Out of Stock')}
                    </span>
                  </div>

                  {/* POS Available Indicator Tag */}
                  {p.is_pos_available && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-purple-900/80 text-purple-200 text-[10px] font-mono font-bold backdrop-blur-xs">
                        POS Ready
                      </span>
                    </div>
                  )}

                  {/* Multi-Image Gallery Count Badge */}
                  {p.gallery && p.gallery.length > 1 && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-mono font-medium backdrop-blur-xs flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>{p.gallery.length}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Details Body */}
                <div className="p-3.5 space-y-2.5 flex-1">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] mb-1">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium truncate">
                        {p.category?.name_ar || (isAr ? 'عام' : 'General')}
                      </span>
                      <span className="font-mono text-slate-400 text-[10px] truncate max-w-[100px]">
                        /{p.slug}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={p.name}>
                      {p.name}
                    </h3>
                    {p.name_en && (
                      <p className="text-[11px] text-slate-400 font-sans line-clamp-1" title={p.name_en}>
                        {p.name_en}
                      </p>
                    )}
                  </div>

                  {/* Linked BOM Model Pill */}
                  <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    {hasBOM ? (
                      <div className="flex items-center justify-between text-[11px] bg-blue-50/70 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-lg border border-blue-200/60 dark:border-blue-900/50">
                        <div className="flex items-center gap-1.5 truncate">
                          <Layers className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                          <span className="truncate">{p.garment_model?.name}</span>
                        </div>
                        <span className="font-mono font-bold text-[10px] bg-white dark:bg-slate-900 px-1 rounded border border-blue-200 dark:border-blue-800">
                          {p.garment_model?.code}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">
                        {isAr ? 'غير مرتبط بموديل إنتاج' : 'No BOM linked'}
                      </div>
                    )}
                  </div>

                  {/* Multi-Price Grid */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">
                        {isAr ? 'سعر المتجر أونلاين' : 'Storefront Price'}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-xs font-mono">
                        {sellingPrice.toLocaleString()} <span className="text-[9px] font-normal text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40">
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-medium">
                        {isAr ? 'سعر المعرض (POS)' : 'POS Price'}
                      </span>
                      <span className="font-bold text-purple-800 dark:text-purple-300 text-xs font-mono">
                        {posPrice.toLocaleString()} <span className="text-[9px] font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
                      </span>
                    </div>
                  </div>

                  {wholesalePrice > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
                      <span>{isAr ? 'سعر الجملة:' : 'Wholesale:'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {wholesalePrice.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Controls Footer */}
                <div className="p-3 bg-slate-50/90 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingProduct(p)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                      title={isAr ? 'معاينة بطاقة المنتج' : 'View Details'}
                      aria-label={isAr ? 'معاينة المنتج' : 'View product'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrintingProduct(p)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                      title={isAr ? 'طباعة بطاقة المنتج' : 'Print Product Sheet'}
                      aria-label={isAr ? 'طباعة بطاقة المنتج' : 'Print product sheet'}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                      title={isAr ? 'تعديل بيانات المنتج' : 'Edit Product'}
                      aria-label={isAr ? 'تعديل المنتج' : 'Edit product'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingProduct(p)}
                      className="inline-flex items-center justify-center p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                      title={isAr ? 'حذف أو أرشفة المنتج' : 'Delete or Archive Product'}
                      aria-label={isAr ? 'حذف المنتج' : 'Delete product'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View Alternative */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <th className="py-3 px-4 font-semibold">{isAr ? 'المنتج' : 'Product'}</th>
                  <th className="py-3 px-3 font-semibold">{isAr ? 'التصنيف' : 'Category'}</th>
                  <th className="py-3 px-3 font-semibold">{isAr ? 'موديل التشغيل' : 'Linked Model'}</th>
                  <th className="py-3 px-3 font-semibold text-center">{isAr ? 'سعر المتجر' : 'Web Price'}</th>
                  <th className="py-3 px-3 font-semibold text-center">{isAr ? 'سعر المعرض' : 'POS Price'}</th>
                  <th className="py-3 px-3 font-semibold text-center">{isAr ? 'سعر الجملة' : 'Wholesale'}</th>
                  <th className="py-3 px-3 font-semibold text-center">{isAr ? 'المخزون' : 'Stock'}</th>
                  <th className="py-3 px-3 font-semibold text-center">{isAr ? 'الحالة' : 'Status'}</th>
                  <th className="py-3 px-4 font-semibold text-center">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 text-slate-400">
                          {p.main_image ? (
                            <img src={p.main_image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">{p.name}</div>
                          <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">/{p.slug}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="text-slate-600 dark:text-slate-300">
                        {p.category?.name_ar || (isAr ? 'عام' : 'General')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      {p.garment_model ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-blue-700 dark:text-blue-300">
                          <Layers className="w-3.5 h-3.5 shrink-0" />
                          <span>{p.garment_model.code}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900 dark:text-slate-100">
                      {Number(p.selling_price).toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{isAr ? 'ج.م' : 'EGP'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-bold font-mono text-purple-700 dark:text-purple-300">
                      {Number(p.pos_price || p.selling_price).toLocaleString()} <span className="text-[9px] font-normal">{isAr ? 'ج.م' : 'EGP'}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono text-slate-600 dark:text-slate-400">
                      {p.wholesale_price ? `${Number(p.wholesale_price).toLocaleString()} ج.م` : '-'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        p.stock_visibility === 'in_stock'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : p.stock_visibility === 'low_stock'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {p.stock_visibility === 'in_stock' ? (isAr ? 'متوفر' : 'In Stock')
                          : p.stock_visibility === 'low_stock' ? (isAr ? 'محدود' : 'Low Stock')
                          : (isAr ? 'نفذ' : 'Out')}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        p.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : p.status === 'draft'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}>
                        {p.status === 'active' ? (isAr ? 'نشط' : 'Active') : p.status === 'draft' ? (isAr ? 'مسودة' : 'Draft') : (isAr ? 'مؤرشف' : 'Archived')}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingProduct(p)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                          title={isAr ? 'معاينة' : 'View'}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPrintingProduct(p)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                          title={isAr ? 'طباعة' : 'Print'}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(p)}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Real Multi-Page Pagination Bar */}
      {totalRecords > 0 && (
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div>
            {isAr
              ? `عرض ${(currentPage - 1) * pageSize + 1} - ${Math.min(currentPage * pageSize, totalRecords)} من إجمالي ${totalRecords} منتج (صفحة ${currentPage} من ${totalPages})`
              : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(currentPage * pageSize, totalRecords)} of ${totalRecords} products (Page ${currentPage} of ${totalPages})`}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="h-8 px-2.5 text-xs"
            >
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
              {isAr ? 'السابق' : 'Prev'}
            </Button>

            {/* Smart Numbered Pages */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((pageNum, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsisBefore && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        disabled={isLoading}
                        className={`w-7 h-8 rounded-lg text-xs font-semibold font-mono transition-all ${
                          pageNum === currentPage
                            ? 'bg-emerald-600 text-white shadow-xs font-bold'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="h-8 px-2.5 text-xs"
            >
              {isAr ? 'التالي' : 'Next'}
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            </Button>
          </div>
        </div>
      )}

      {/* View Detail Modal */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => {
            setViewingProduct(null);
            setViewingImageIndex(0);
          }}
          title={isAr ? `معاينة المنتج: ${viewingProduct.name}` : `Product: ${viewingProduct.name}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {(() => {
              const viewImages: string[] = viewingProduct ? (
                Array.isArray(viewingProduct.gallery) && viewingProduct.gallery.length > 0
                  ? viewingProduct.gallery.map((g: any) => (typeof g === 'string' ? g : g.url)).filter(Boolean)
                  : (viewingProduct.main_image ? [viewingProduct.main_image] : [])
              ) : [];
              const activeViewImage = viewImages[viewingImageIndex] || viewImages[0] || viewingProduct.main_image || null;

              return (
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex flex-col items-center gap-2 w-full sm:w-48 shrink-0">
                    <div className="w-full h-48 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center relative">
                      {activeViewImage ? (
                        <img src={activeViewImage} alt={viewingProduct.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                    {viewImages.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                        {viewImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setViewingImageIndex(idx)}
                            className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                              viewingImageIndex === idx
                                ? 'border-emerald-500 scale-105 shadow-xs'
                                : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={imgUrl} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {viewingProduct.name}
                    </h3>
                    {viewingProduct.name_en && (
                      <p className="text-xs text-slate-400 font-sans">{viewingProduct.name_en}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border">
                        /{viewingProduct.slug}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        viewingProduct.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {viewingProduct.status}
                      </span>
                      {viewingProduct.is_pos_available && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                          POS
                        </span>
                      )}
                    </div>

                    {viewingProduct.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                        {viewingProduct.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Pricing Matrix Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center font-mono">
              <div>
                <span className="text-[10px] text-slate-500 block mb-1 font-sans">{isAr ? 'سعر المتجر' : 'Store Price'}</span>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {Number(viewingProduct.selling_price).toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-600 block mb-1 font-sans">{isAr ? 'سعر المعرض (POS)' : 'POS Price'}</span>
                <span className="font-bold text-sm text-purple-700 dark:text-purple-300">
                  {Number(viewingProduct.pos_price || viewingProduct.selling_price).toLocaleString()} ج.م
                </span>
              </div>
              <div>
                <span className="text-[10px] text-blue-600 block mb-1 font-sans">{isAr ? 'سعر الجملة' : 'Wholesale'}</span>
                <span className="font-bold text-sm text-blue-700 dark:text-blue-300">
                  {viewingProduct.wholesale_price ? `${Number(viewingProduct.wholesale_price).toLocaleString()} ج.م` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-amber-600 block mb-1 font-sans">{isAr ? 'تكلفة الإنتاج' : 'Base Cost'}</span>
                <span className="font-bold text-sm text-amber-700 dark:text-amber-300">
                  {viewingProduct.base_cost ? `${Number(viewingProduct.base_cost).toLocaleString()} ج.م` : '-'}
                </span>
              </div>
            </div>

            {viewingProduct.garment_model && (
              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    {isAr ? 'موديل التشغيل المرتبط:' : 'Linked Model:'}
                  </span>
                  <span>{viewingProduct.garment_model.name}</span>
                </div>
                <span className="font-mono bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-bold">
                  {viewingProduct.garment_model.code}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintingProduct(viewingProduct);
                }}
                className="text-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 ml-1" />
                {isAr ? 'طباعة بطاقة المنتج' : 'Print Product'}
              </Button>

              <Button variant="ghost" size="sm" onClick={() => setViewingProduct(null)}>
                {isAr ? 'إغلاق' : 'Close'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Dedicated Print Sheet Modal */}
      {printingProduct && (
        <ProductPrintModal
          isOpen={Boolean(printingProduct)}
          onClose={() => setPrintingProduct(null)}
          product={printingProduct}
          isAr={isAr}
        />
      )}

      {/* Safe Deletion Confirmation Modal */}
      {deletingProduct && (
        <Modal
          isOpen={Boolean(deletingProduct)}
          onClose={() => setDeletingProduct(null)}
          title={isAr ? 'تأكيد حذف أو أرشفة المنتج' : 'Confirm Delete or Archive'}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold mb-1">
                  {isAr
                    ? `هل أنت متأكد من رغبتك في حذف المنتج: "${deletingProduct.name}"؟`
                    : `Are you sure you want to delete product "${deletingProduct.name}"?`}
                </p>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  {isAr
                    ? 'إذا كان المنتج مرتبطاً بمخزون حالي أو طلبيات مبيعات، فسيقوم النظام بأرشفته وتعطيله بدلاً من حذفه نهائياً لحماية دقة التقارير المحاسبية والمخزنية.'
                    : 'If this product is referenced by inventory balances or sales orders, it will be safely archived instead of permanently deleted to protect audit trails.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                isLoading={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white min-w-[90px]"
              >
                {isAr ? 'تأكيد الحذف' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal (Upload First, URL Optional) */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={
          editingProduct
            ? (isAr ? `تعديل المنتج: ${editingProduct.name}` : `Edit Product: ${editingProduct.name}`)
            : (isAr ? 'إضافة منتج تجاري جديد للمتجر والمعارض' : 'Add New Commercial Product')
        }
        maxWidth="xl"
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[78vh] overflow-y-auto px-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم المنتج بالعربية' : 'Product Name (Ar)'} *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => handleNameChange(e.target.value)}
                placeholder={isAr ? 'مثال: قميص أكسفورد قطن كلاسيك رجالي' : 'e.g. Classic Oxford Cotton Shirt'}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'اسم المنتج بالإنجليزية (اختياري)' : 'Product Name (En)'}
              </label>
              <input
                type="text"
                value={formNameEn}
                onChange={e => setFormNameEn(e.target.value)}
                placeholder="e.g. Men Oxford Classic Shirt"
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'رابط المنتج (Slug في المتجر الإلكتروني)' : 'URL Slug'} *
              </label>
              <input
                type="text"
                required
                value={formSlug}
                onChange={e => setFormSlug(e.target.value)}
                placeholder="classic-oxford-shirt"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'التصنيف' : 'Category'}
              </label>
              <select
                value={formCategoryId}
                onChange={e => setFormCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
              >
                <option value="">{isAr ? '-- بدون تصنيف --' : '-- No Category --'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name_ar} {c.name_en ? `(${c.name_en})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'ربط بموديل إنتاج داخلي (BOM & Cost Sheet)' : 'Link to Production Garment Model'}
            </label>
            <select
              value={formGarmentModelId}
              onChange={e => setFormGarmentModelId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option value="">{isAr ? '-- غير مرتبط بموديل إنتاج داخلي --' : '-- No linked model --'}</option>
              {garmentModels.map(m => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} ({m.season || ''})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {isAr ? 'ربط المنتج بموديل الإنتاج يربط مخزون المتجر والمعارض مباشرة بمخرجات المصنع وأوامر القص.' : 'Links finished product directly to bills of materials and cutting sheets.'}
            </p>
          </div>

          {/* Pricing Architecture (POS, Website, Wholesale, Cost) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              {isAr ? 'هيكل التسعير التجاري المنفصل' : 'Commercial Omnichannel Pricing'}
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'سعر المتجر' : 'Web Price'} *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={formSellingPrice}
                    onChange={e => setFormSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-bold font-mono border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">ج.م</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'أونلاين' : 'Online'}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1">
                  {isAr ? 'سعر المعرض' : 'POS Price'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formPosPrice}
                    onChange={e => setFormPosPrice(parseFloat(e.target.value) || 0)}
                    placeholder={formSellingPrice > 0 ? String(formSellingPrice) : '0'}
                    className="w-full px-2.5 py-1.5 text-xs font-bold font-mono border border-purple-200 dark:border-purple-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white dark:bg-slate-900 text-purple-900 dark:text-purple-300"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-purple-400">ج.م</span>
                </div>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block mt-0.5">{isAr ? 'كاونتر POS' : 'POS Counter'}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                  {isAr ? 'سعر الجملة' : 'Wholesale'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formWholesalePrice}
                    onChange={e => setFormWholesalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">ج.م</span>
                </div>
                <span className="text-[10px] text-blue-500 block mt-0.5">{isAr ? 'تجار الجملة' : 'B2B'}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'تكلفة الإنتاج' : 'Base Cost'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formBaseCost}
                    onChange={e => setFormBaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                  <span className="absolute left-2 top-1.5 text-[10px] text-slate-400">ج.م</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">{isAr ? 'من الموديل' : 'BOM Cost'}</span>
              </div>
            </div>
          </div>

          {/* Product Multi-Image Gallery Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? `معرض صور المنتج (${formGallery.length} صور مرفوعة)` : `Product Gallery (${formGallery.length} uploaded)`}
              </label>
              <span className="text-[10px] text-slate-400">
                {isAr ? 'يدعم صور متعددة • JPEG, PNG, WEBP حتى 5 ميجابايت' : 'Multi-image • JPEG, PNG, WEBP up to 5MB'}
              </span>
            </div>

            {imageUploadError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{imageUploadError}</span>
              </div>
            )}

            {/* Gallery Grid (Existing & Newly Uploaded Images) */}
            {formGallery.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                {formGallery.map((img, idx) => (
                  <div
                    key={img.id}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all bg-slate-50 dark:bg-slate-800 shadow-2xs ${
                      img.is_primary
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`Product image ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                      }}
                    />

                    {/* Primary Badge */}
                    {img.is_primary && (
                      <span className="absolute top-1 right-1 rtl:right-1 rtl:left-auto ltr:left-1 ltr:right-auto px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold shadow-xs">
                        {isAr ? 'الرئيسية' : 'Primary'}
                      </span>
                    )}

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 text-white">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(img.id)}
                          className={`p-1 rounded-md transition-colors ${
                            img.is_primary ? 'text-amber-400' : 'text-white/80 hover:text-amber-400'
                          }`}
                          title={isAr ? 'تعيين كصورة رئيسية' : 'Set as primary'}
                        >
                          <Star className={`w-3.5 h-3.5 ${img.is_primary ? 'fill-amber-400' : ''}`} />
                        </button>

                        <button
                          type="button"
                          onClick={() => removeGalleryImage(img.id)}
                          className="p-1 rounded-md text-red-400 hover:text-red-300 transition-colors"
                          title={isAr ? 'حذف هذه الصورة' : 'Delete image'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Reorder Arrows */}
                      <div className="flex items-center justify-center gap-2">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveGalleryImage(idx, 'left')}
                            className="p-1 rounded bg-white/20 hover:bg-white/40 transition-colors"
                            title={isAr ? 'تحريك للأمام' : 'Move left'}
                          >
                            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                          </button>
                        )}
                        {idx < formGallery.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveGalleryImage(idx, 'right')}
                            className="p-1 rounded bg-white/20 hover:bg-white/40 transition-colors"
                            title={isAr ? 'تحريك للخلف' : 'Move right'}
                          >
                            <ArrowLeft className="w-3 h-3 rtl:rotate-180" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drag & Drop Multi-File Upload Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-right rtl:text-right ltr:text-left">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {isAr ? 'رفع صور للمنتج من الجهاز (تحديد متعدد متاح)' : 'Upload Product Photos (Multi-select)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? 'اسحب الصور وأفلتها هنا، أو اضغط لاختيار عدة ملفات معاً' : 'Drag & drop photos here, or click to choose files'}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="catalog-image-upload"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="text-xs flex items-center gap-1.5 shrink-0"
              >
                {isUploadingImage ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{isUploadingImage ? (isAr ? 'جاري رفع الصور...' : 'Uploading...') : (isAr ? 'اختيار صور من الجهاز' : 'Select Photos')}</span>
              </Button>
            </div>

            {/* Expandable Secondary Image URL Accordion */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-medium transition-colors"
              >
                {showUrlInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{isAr ? 'إدخال رابط صورة يدوي خارجي (اختياري)' : 'External Image URL (Optional)'}</span>
              </button>

              {showUrlInput && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={formMainImage}
                    onChange={e => setFormMainImage(e.target.value)}
                    placeholder={isAr ? 'https://example.com/photos/item.jpg أو /storage/...' : 'https://example.com/photo.jpg'}
                    className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => {
                      if (formMainImage.trim()) {
                        const newItem: GalleryItem = {
                          id: 'url_' + Date.now(),
                          url: formMainImage.trim(),
                          is_primary: formGallery.length === 0,
                          sort_order: formGallery.length,
                        };
                        setFormGallery(prev => [...prev, newItem]);
                      }
                    }}
                  >
                    {isAr ? 'إدراج بالمعرض' : 'Add'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'وصف المنتج وتفاصيل الخامة' : 'Description & Fabric Details'}
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder={isAr ? 'تفاصيل القماش، نسب الألياف، المقاسات المتوافقة، وإرشادات الغسيل...' : 'Fabric details, composition, care instructions...'}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Warehouse & Storage Location (Auto-sync to Finished Goods) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                {isAr ? 'التخزين الفيزيائي ومستودع المنتجات تامة الصنع (جاهز للبيع & POS)' : 'Finished Goods Warehouse & Rack Location'}
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                {isAr ? 'يتم الربط التلقائي بمستودع تامة الصنع' : 'Auto-synced to Warehouse'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'المستودع المخصص' : 'Assigned Warehouse'}
                </label>
                <select
                  value={formWarehouseId}
                  onChange={e => setFormWarehouseId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">{isAr ? '— اختر المستودع —' : 'Select warehouse'}</option>
                  {warehouses.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? 'الرصيد الافتتاحي بالمستودع (قطعة)' : 'Initial Balance (Pieces)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={formInitialStock}
                  onChange={e => setFormInitialStock(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                  {isAr ? 'المنطقة (Zone)' : 'Zone'}
                </label>
                <input
                  type="text"
                  value={formStorageZone}
                  onChange={e => setFormStorageZone(e.target.value)}
                  placeholder={isAr ? 'مثال: صالة أ' : 'e.g. Zone A'}
                  className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                  {isAr ? 'الحامل (Rack)' : 'Rack'}
                </label>
                <input
                  type="text"
                  value={formRackLocation}
                  onChange={e => setFormRackLocation(e.target.value)}
                  placeholder="R-01"
                  className="w-full px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                  {isAr ? 'الرف / الصندوق (Shelf/Bin)' : 'Shelf/Bin'}
                </label>
                <input
                  type="text"
                  value={formShelfBin}
                  onChange={e => setFormShelfBin(e.target.value)}
                  placeholder="BIN-05"
                  className="w-full px-2 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حالة المخزون' : 'Stock Status'}
              </label>
              <select
                value={formStockVisibility}
                onChange={e => setFormStockVisibility(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="in_stock">{isAr ? 'متوفر وجاهز للتسليم (In Stock)' : 'In Stock'}</option>
                <option value="low_stock">{isAr ? 'كمية محدودة (Low Stock)' : 'Low Stock'}</option>
                <option value="out_of_stock">{isAr ? 'نفذت الكمية (Out of Stock)' : 'Out of Stock'}</option>
                <option value="backorder">{isAr ? 'حجز مسبق (Backorder)' : 'Backorder'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'حالة النشر والعرض' : 'Publication Status'}
              </label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              >
                <option value="active">{isAr ? 'نشط ومعروض للبيع (Active)' : 'Active'}</option>
                <option value="draft">{isAr ? 'مسودة داخلية مخفية (Draft)' : 'Draft'}</option>
                <option value="archived">{isAr ? 'مؤرشف ومخفي (Archived)' : 'Archived'}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormModalOpen(false)}
              disabled={isSaving}
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin mx-auto" />
              ) : editingProduct ? (
                isAr ? 'حفظ التعديلات' : 'Save Changes'
              ) : (
                isAr ? 'إنشاء المنتج' : 'Create Product'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

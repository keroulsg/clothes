import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  Boxes,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  User,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  CheckCircle2,
  Link2,
} from 'lucide-react';
import { api } from '../../api/client';

interface WarehousesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWarehouseUpdated?: () => void;
  onOpenTransfer?: (sourceWhId: string) => void;
  isAr?: boolean;
}

export const WarehousesManagerModal: React.FC<WarehousesManagerModalProps> = ({
  isOpen,
  onClose,
  onWarehouseUpdated,
  onOpenTransfer,
  isAr = true,
}) => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouseTypes, setWarehouseTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWh, setEditingWh] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState('raw_materials');
  const [managerName, setManagerName] = useState('');
  const [address, setAddress] = useState('');
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick Action & Direct Linking States
  const [updatingWhId, setUpdatingWhId] = useState<string | null>(null);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');
  const [quickLinkBranchId, setQuickLinkBranchId] = useState('');
  const [quickLinkWhId, setQuickLinkWhId] = useState('');
  const [isQuickLinking, setIsQuickLinking] = useState(false);

  // Custom Type Form
  const [customTypeCode, setCustomTypeCode] = useState('');
  const [customTypeName, setCustomTypeName] = useState('');
  const [customTypeNameEn, setCustomTypeNameEn] = useState('');
  const [customTypeError, setCustomTypeError] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [whRes, brRes, typesRes] = await Promise.all([
        api.inventory.getWarehouses(),
        api.branches.getBranches(),
        api.inventory.getWarehouseTypes(),
      ]);
      setWarehouses(whRes.warehouses || []);
      setBranches(brRes.branches || []);
      setWarehouseTypes(typesRes.all_types || []);
      if (brRes.branches?.[0]) setBranchId(brRes.branches[0].id);
    } catch (err: any) {
      console.error('Error fetching warehouse data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      resetForm();
      setQuickSuccessMsg('');
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setCode('');
    setType(warehouseTypes[0]?.code || 'raw_materials');
    setManagerName('');
    setAddress('');
    setAllowNegativeStock(false);
    setIsActive(true);
    setEditingWh(null);
    setIsCreating(false);
    setErrorMsg('');
  };

  const startEdit = (wh: any) => {
    setEditingWh(wh);
    setName(wh.name);
    setCode(wh.code);
    setBranchId(wh.branch_id || '');
    setType(wh.type);
    setManagerName(wh.manager_name || '');
    setAddress(wh.address || '');
    setAllowNegativeStock(Boolean(wh.allow_negative_stock));
    setIsActive(Boolean(wh.is_active));
    setIsCreating(true);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم المستودع والكود' : 'Warehouse name and code are required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        name,
        code,
        branch_id: branchId || undefined,
        type,
        manager_name: managerName || undefined,
        address: address || undefined,
        allow_negative_stock: allowNegativeStock,
        is_active: isActive,
      };

      if (editingWh) {
        await api.inventory.updateWarehouse(editingWh.id, payload);
      } else {
        await api.inventory.createWarehouse(payload);
      }

      await fetchData();
      if (onWarehouseUpdated) onWarehouseUpdated();
      resetForm();
      setQuickSuccessMsg(isAr ? 'تم حفظ بيانات المستودع بنجاح' : 'Warehouse saved successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ بيانات المستودع' : 'Failed to save warehouse'));
    } finally {
      setIsSaving(false);
    }
  };

  // Instant 1-Click Branch Linking
  const handleQuickAssignBranch = async (whId: string, newBranchId: string) => {
    setUpdatingWhId(whId);
    try {
      await api.inventory.updateWarehouse(whId, {
        branch_id: newBranchId || null,
      });
      await fetchData();
      if (onWarehouseUpdated) onWarehouseUpdated();
      setQuickSuccessMsg(isAr ? '✓ تم تحديث ربط المستودع بالفرع فوراً وبنجاح' : 'Warehouse linked to branch successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل ربط المستودع بالفرع' : 'Failed to link branch'));
    } finally {
      setUpdatingWhId(null);
    }
  };

  const handleDirectLinkSubmit = async () => {
    if (!quickLinkWhId) return;
    setIsQuickLinking(true);
    try {
      await api.inventory.updateWarehouse(quickLinkWhId, {
        branch_id: quickLinkBranchId || null,
      });
      await fetchData();
      if (onWarehouseUpdated) onWarehouseUpdated();
      setQuickSuccessMsg(isAr ? '✓ تم ربط المستودع بالفرع المختار بنجاح تام' : 'Warehouse linked to branch successfully');
      setQuickLinkWhId('');
      setTimeout(() => setQuickSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل ربط المستودع بالفرع' : 'Failed to link warehouse to branch'));
    } finally {
      setIsQuickLinking(false);
    }
  };

  const handleSaveCustomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTypeCode || !customTypeName) return;

    try {
      await api.inventory.createWarehouseType({
        code: customTypeCode,
        name: customTypeName,
        name_en: customTypeNameEn || customTypeName,
      });

      const typesRes = await api.inventory.getWarehouseTypes();
      setWarehouseTypes(typesRes.all_types || []);
      setType(customTypeCode);
      setIsAddingCustomType(false);
      setCustomTypeCode('');
      setCustomTypeName('');
      setCustomTypeNameEn('');
    } catch (err: any) {
      setCustomTypeError(err.message || (isAr ? 'فشل إضافة نوع المستودع' : 'Failed to add warehouse type'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا المستودع نهائياً؟' : 'Are you sure you want to delete this warehouse?')) {
      return;
    }

    try {
      await api.inventory.deleteWarehouse(id);
      await fetchData();
      if (onWarehouseUpdated) onWarehouseUpdated();
      setQuickSuccessMsg(isAr ? 'تم حذف المستودع بنجاح' : 'Warehouse deleted successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حذف المستودع' : 'Failed to delete warehouse'));
    }
  };

  const filteredWarehouses = warehouses.filter((wh) => {
    const q = searchTerm.toLowerCase();
    return (
      wh.name.toLowerCase().includes(q) ||
      wh.code.toLowerCase().includes(q) ||
      (wh.manager_name && wh.manager_name.toLowerCase().includes(q)) ||
      (wh.branch?.name && wh.branch.name.toLowerCase().includes(q))
    );
  });

  const getTypeVariant = (typeCode: string): 'warning' | 'success' | 'info' | 'neutral' => {
    if (['fabric', 'raw_materials', 'accessories'].includes(typeCode)) return 'warning';
    if (['finished_goods', 'wip'].includes(typeCode)) return 'success';
    if (['customer_deposits'].includes(typeCode)) return 'info';
    return 'neutral';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'إدارة المستودعات والتخزين (Warehouses Management)' : 'Warehouses Management'}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Quick Success Toast / Alert */}
        {quickSuccessMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{quickSuccessMsg}</span>
          </div>
        )}

        {/* Quick Branch-Warehouse Direct Linking Card */}
        <div className="p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                  {isAr ? 'مركز الربط المباشر السريع: اختر الفرع وأمامه المستودع لربطهما فوراً' : 'Quick Branch-Warehouse Associator'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'حدد الفرع والمستودع المطلوب ربطه ثم اضغط زر "ربط الآن" لتثبيت التبعية مباشرة' : 'Choose branch and warehouse, then click link to bind them'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/40">
            {/* Branch Selector */}
            <div className="sm:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {isAr ? '1. الفرع المستهدف (الموقع):' : '1. Target Branch:'}
              </label>
              <select
                value={quickLinkBranchId}
                onChange={(e) => setQuickLinkBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">{isAr ? '🏢 اختر الفرع المراد ربطه به...' : 'Select Branch...'}</option>
                <option value="">{isAr ? '🏢 المصنع الرئيسي (HQ-01) — الفرع العام' : 'Head Factory (HQ-01)'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏢 {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden sm:flex sm:col-span-1 items-center justify-center pt-4">
              <span className="text-base text-blue-500 font-black">⇄</span>
            </div>

            {/* Warehouse Selector */}
            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {isAr ? '2. المستودع المراد ربطه:' : '2. Warehouse to link:'}
              </label>
              <select
                value={quickLinkWhId}
                onChange={(e) => setQuickLinkWhId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">{isAr ? '📦 اختر المستودع...' : 'Select Warehouse...'}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    📦 {w.name} ({w.code}) {w.branch ? `— مرتبط بـ: ${w.branch.name}` : `— [عام]`}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Link Button */}
            <div className="sm:col-span-2 pt-0 sm:pt-4">
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={!quickLinkWhId || isQuickLinking}
                onClick={handleDirectLinkSubmit}
                className="w-full text-xs font-black bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center justify-center gap-1.5 py-2.5"
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                <span>{isQuickLinking ? (isAr ? 'جارِ الربط...' : 'Linking...') : (isAr ? 'ربط الآن 🔗' : 'Link Now')}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isAr ? 'بحث باسم المستودع أو الكود أو الفرع...' : 'Search warehouses...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {!isCreating && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsAddingCustomType(true)}
                variant="outline"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'نوع مستودع مخصص' : 'Custom Type'}</span>
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreating(true);
                }}
                variant="primary"
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>{isAr ? 'مستودع جديد' : 'New Warehouse'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Custom Type Modal / Box */}
        {isAddingCustomType && (
          <Card className="p-4 border-2 border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/20">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'إضافة نوع مستودع مخصص للشركة' : 'Add Custom Warehouse Type'}</span>
              </h4>
              <button onClick={() => setIsAddingCustomType(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {customTypeError && <div className="text-xs text-red-600 mb-2">{customTypeError}</div>}

            <form onSubmit={handleSaveCustomType} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder={isAr ? 'الكود (مثال: chemicals)' : 'Code (e.g. chemicals)'}
                value={customTypeCode}
                onChange={(e) => setCustomTypeCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder={isAr ? 'الاسم بالعربية' : 'Name (Arabic)'}
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                required
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isAr ? 'الاسم بالإنجليزية (اختياري)' : 'Name (English)'}
                  value={customTypeNameEn}
                  onChange={(e) => setCustomTypeNameEn(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border rounded-lg"
                />
                <Button type="submit" variant="primary" size="sm">
                  {isAr ? 'إضافة' : 'Add'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Create / Edit Form */}
        {isCreating && (
          <Card className="p-5 border-2 border-primary-500/30 bg-primary-50/10 dark:bg-primary-950/20">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary-600" />
              <span>{editingWh ? (isAr ? 'تعديل بيانات المستودع' : 'Edit Warehouse') : (isAr ? 'تسجيل مستودع جديد' : 'New Warehouse')}</span>
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'اسم المستودع *' : 'Warehouse Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isAr ? 'مثال: مستودع الأقمشة والغزول' : 'e.g. Raw Fabric Warehouse'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'كود المستودع *' : 'Warehouse Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="WH-01"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'الفرع التابع له' : 'Associated Branch'}
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    <option value="">{isAr ? 'المصنع الرئيسي (HQ-01)' : 'Head Factory'}</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏢 {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'نوع المستودع' : 'Warehouse Type'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {warehouseTypes.map((t) => (
                      <option key={t.code} value={t.code}>
                        {isAr ? t.name : t.name_en || t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'أمين المستودع / المسؤول' : 'Warehouse Manager'}
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder={isAr ? 'اسم أمين المخزن' : 'Storekeeper Name'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'العنوان / الموقع داخل المصنع' : 'Location / Zone'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={isAr ? 'المبنى B - الدور الأرضي' : 'Building B, Ground Floor'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={allowNegativeStock}
                    onChange={(e) => setAllowNegativeStock(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span>
                    {isAr
                      ? 'السماح بالصرف بالسالب استثنائياً (Negative Stock Policy)'
                      : 'Allow Exceptional Negative Stock'}
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{isAr ? 'المستودع نشط وجاهز للتشغيل' : 'Active Warehouse'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ المستودع' : 'Save Warehouse')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Warehouses Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5">{isAr ? 'المستودع والموقع' : 'Warehouse'}</th>
                <th className="py-3 px-3">{isAr ? 'الكود' : 'Code'}</th>
                <th className="py-3 px-3.5">{isAr ? 'الفرع التابع له (ربط مباشر)' : 'Branch Link'}</th>
                <th className="py-3 px-3">{isAr ? 'نوع التخزين' : 'Type'}</th>
                <th className="py-3 px-3">{isAr ? 'أمين المستودع' : 'Keeper'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الأصناف' : 'Items'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-3.5 text-center">{isAr ? 'الإجراءات والتحويل' : 'Actions & Transfer'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {isAr ? 'جارِ تحميل المستودعات...' : 'Loading warehouses...'}
                  </td>
                </tr>
              ) : filteredWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {isAr ? 'لا توجد مستودعات مسجلة حتى الآن' : 'No warehouses registered yet'}
                  </td>
                </tr>
              ) : (
                filteredWarehouses.map((wh) => {
                  const typeObj = warehouseTypes.find((t) => t.code === wh.type);
                  return (
                    <tr key={wh.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      {/* Name & Location */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{wh.name}</span>
                          {wh.allow_negative_stock && (
                            <Badge variant="warning" className="text-[10px]">
                              {isAr ? 'صرف سالب' : 'Neg Stock'}
                            </Badge>
                          )}
                        </div>
                        {wh.address && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{wh.address}</span>
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {wh.code}
                      </td>

                      {/* Branch Direct 1-Click Linker */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <select
                            value={wh.branch_id || ''}
                            disabled={updatingWhId === wh.id}
                            onChange={(e) => handleQuickAssignBranch(wh.id, e.target.value)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                              wh.branch_id
                                ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                            title={isAr ? 'اختر الفرع لربطه بهذا المستودع فوراً وبنقرة واحدة' : 'Select branch to link instantly'}
                          >
                            <option value="">{isAr ? '🏢 المصنع الرئيسي (HQ-01)' : 'Head Factory (HQ-01)'}</option>
                            {branches.map((b) => (
                              <option key={b.id} value={b.id}>
                                🏢 {b.name} ({b.code})
                              </option>
                            ))}
                          </select>
                          {updatingWhId === wh.id && (
                            <span className="text-[10px] text-blue-600 font-bold animate-pulse">
                              {isAr ? 'جارِ الربط...' : 'Linking...'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        <Badge variant={getTypeVariant(wh.type)} className="text-[11px]">
                          {isAr ? typeObj?.name || wh.type : typeObj?.name_en || wh.type}
                        </Badge>
                      </td>

                      {/* Storekeeper */}
                      <td className="py-3 px-3 text-xs text-slate-700 dark:text-slate-300">
                        {wh.manager_name ? (
                          <span className="flex items-center gap-1 font-medium">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{wh.manager_name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-3 text-center">
                        <Badge variant="brand" className="font-mono text-xs">
                          {wh.items_count || 0} {isAr ? 'صنف' : 'items'}
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <Badge variant={wh.is_active ? 'success' : 'neutral'} className="text-[10px]">
                          {wh.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </Badge>
                      </td>

                      {/* Action Buttons: Transfer, Edit, Delete */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Transfer Action Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (onOpenTransfer) {
                                onOpenTransfer(wh.id);
                              }
                            }}
                            className="h-7 px-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800 shadow-2xs gap-1"
                            title={isAr ? 'بدء أمر تحويل مخزني من هذا المستودع' : 'Transfer from warehouse'}
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isAr ? 'تحويل' : 'Transfer'}</span>
                          </Button>

                          {/* Edit Action Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(wh)}
                            className="h-7 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 border-slate-200 dark:border-slate-700 shadow-2xs gap-1"
                            title={isAr ? 'تعديل بيانات المستودع' : 'Edit Warehouse'}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </Button>

                          {/* Delete Action Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(wh.id)}
                            disabled={wh.items_count > 0}
                            className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 shadow-2xs gap-1 disabled:opacity-40"
                            title={wh.items_count > 0 ? (isAr ? 'لا يمكن حذف مستودع به أصناف مخزنة' : 'Has stock items') : (isAr ? 'حذف المستودع' : 'Delete')}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>{isAr ? 'حذف' : 'Delete'}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
};

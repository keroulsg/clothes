import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Building2, Plus, Edit2, Trash2, Search, MapPin, Phone, User, Boxes, Link2, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';

interface BranchesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchUpdated?: () => void;
  isAr?: boolean;
}

export const BranchesManagerModal: React.FC<BranchesManagerModalProps> = ({
  isOpen,
  onClose,
  onBranchUpdated,
  isAr = true,
}) => {
  const [branches, setBranches] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Quick Direct Linking State
  const [quickLinkBranchId, setQuickLinkBranchId] = useState('');
  const [quickLinkWhId, setQuickLinkWhId] = useState('');
  const [isQuickLinking, setIsQuickLinking] = useState(false);
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');

  // Form fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('factory');
  const [isMain, setIsMain] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [brRes, whRes] = await Promise.all([
        api.branches.getBranches(),
        api.inventory.getWarehouses(),
      ]);
      setBranches(brRes.branches || []);
      setWarehouses(whRes.warehouses || []);
    } catch (err: any) {
      console.error('Error fetching branches/warehouses:', err);
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
    setType('factory');
    setIsMain(false);
    setIsActive(true);
    setAddress('');
    setPhone('');
    setManagerName('');
    setEditingBranch(null);
    setIsCreating(false);
    setErrorMsg('');
  };

  const startEdit = (branch: any) => {
    setEditingBranch(branch);
    setName(branch.name);
    setCode(branch.code);
    setType(branch.type);
    setIsMain(Boolean(branch.is_main));
    setIsActive(Boolean(branch.is_active));
    setAddress(branch.address || '');
    setPhone(branch.phone || '');
    setManagerName(branch.manager_name || '');
    setIsCreating(true);
    setErrorMsg('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      setErrorMsg(isAr ? 'يرجى إدخال اسم الفرع وكود الفرع' : 'Branch name and code are required');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        name,
        code,
        type,
        is_main: isMain,
        is_active: isActive,
        address: address || undefined,
        phone: phone || undefined,
        manager_name: managerName || undefined,
      };

      if (editingBranch) {
        await api.branches.updateBranch(editingBranch.id, payload);
      } else {
        await api.branches.createBranch(payload);
      }

      await fetchData();
      if (onBranchUpdated) onBranchUpdated();
      resetForm();
      setQuickSuccessMsg(isAr ? 'تم حفظ بيانات الفرع بنجاح' : 'Branch saved successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ بيانات الفرع' : 'Failed to save branch'));
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Link Warehouse to Branch
  const handleQuickAssignWhToBranch = async (whId: string, branchId: string) => {
    if (!whId) return;
    setIsQuickLinking(true);
    try {
      await api.inventory.updateWarehouse(whId, {
        branch_id: branchId || null,
      });
      await fetchData();
      if (onBranchUpdated) onBranchUpdated();
      setQuickSuccessMsg(isAr ? '✓ تم ربط المستودع بالفرع فوراً وبنجاح' : 'Warehouse linked to branch successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3500);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل ربط المستودع بالفرع' : 'Failed to link branch'));
    } finally {
      setIsQuickLinking(false);
    }
  };

  const handleDirectLinkSubmit = async () => {
    if (!quickLinkBranchId || !quickLinkWhId) return;
    setIsQuickLinking(true);
    try {
      await api.inventory.updateWarehouse(quickLinkWhId, {
        branch_id: quickLinkBranchId,
      });
      await fetchData();
      if (onBranchUpdated) onBranchUpdated();
      setQuickSuccessMsg(isAr ? '✓ تم ربط المستودع بالفرع المختار بنجاح تام' : 'Warehouse linked to branch successfully');
      setQuickLinkWhId('');
      setTimeout(() => setQuickSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل ربط المستودع بالفرع' : 'Failed to link warehouse to branch'));
    } finally {
      setIsQuickLinking(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الفرع نهائياً؟' : 'Are you sure you want to delete this branch?')) {
      return;
    }

    try {
      await api.branches.deleteBranch(id);
      await fetchData();
      if (onBranchUpdated) onBranchUpdated();
      setQuickSuccessMsg(isAr ? 'تم حذف الفرع بنجاح' : 'Branch deleted successfully');
      setTimeout(() => setQuickSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل حذف الفرع' : 'Failed to delete branch'));
    }
  };

  const branchTypes: Record<string, string> = {
    factory: isAr ? 'مصنع رئيسي' : 'Main Factory',
    workshop: isAr ? 'ورشة تصنيع' : 'Workshop',
    outlet: isAr ? 'صالة عرض / منفذ بيع' : 'Retail Outlet',
    warehouse: isAr ? 'مجمع مستودعات' : 'Warehouse Hub',
    head_office: isAr ? 'المقر الإداري' : 'Head Office',
    cutting_center: isAr ? 'مركز قص وتجهيز' : 'Cutting Center',
  };

  const filteredBranches = branches.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.manager_name && b.manager_name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q))
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'إدارة الفروع ومواقع العمل (Branches Management)' : 'Branches Management'}
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

        {/* Quick Branch-Warehouse Direct Associator Card */}
        <div className="p-4 rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-950/30 dark:to-indigo-950/30 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-950 dark:text-blue-200">
                  {isAr ? 'مركز الربط المباشر: اختر الفرع والمستودع واضغط ربط فوراً' : 'Quick Branch-Warehouse Associator'}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isAr ? 'قائمة الفروع المتاحة وقائمة المستودعات المتاحة لتسهيل الربط المباشر بينهما' : 'Select branch and warehouse, then link them directly'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/40">
            {/* Branch Selector */}
            <div className="sm:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {isAr ? '1. اختر الفرع المتاح:' : '1. Select Branch:'}
              </label>
              <select
                value={quickLinkBranchId}
                onChange={(e) => setQuickLinkBranchId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">{isAr ? '🏢 اختر الفرع المراد ربطه به...' : 'Select Branch...'}</option>
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
                {isAr ? '2. اختر المستودع المتاح:' : '2. Select Warehouse:'}
              </label>
              <select
                value={quickLinkWhId}
                onChange={(e) => setQuickLinkWhId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">{isAr ? '📦 اختر المستودع...' : 'Select Warehouse...'}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    📦 {w.name} ({w.code}) {w.branch ? `— مرتبط بـ: ${w.branch.name}` : `— [عام/غير مرتبط]`}
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
                disabled={!quickLinkBranchId || !quickLinkWhId || isQuickLinking}
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
              placeholder={isAr ? 'بحث باسم الفرع أو الكود أو المدير...' : 'Search branches...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          {!isCreating && (
            <Button
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
              variant="primary"
              className="flex items-center gap-2 text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>{isAr ? 'فرع جديد' : 'New Branch'}</span>
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        {isCreating && (
          <Card className="p-5 border-2 border-primary-500/30 bg-primary-50/10 dark:bg-primary-950/20">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" />
              <span>{editingBranch ? (isAr ? 'تعديل بيانات الفرع' : 'Edit Branch') : (isAr ? 'تسجيل فرع وموقع عمل جديد' : 'New Branch')}</span>
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'اسم الفرع / المنشأة *' : 'Branch Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isAr ? 'مثال: مصنع العاشر من رمضان' : 'Branch Name'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'كود الفرع *' : 'Branch Code *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="HQ-01"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'نوع الفرع' : 'Branch Type'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  >
                    {Object.entries(branchTypes).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'المدير / المسؤول' : 'Responsible Manager'}
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder={isAr ? 'اسم المدير المسئول' : 'Manager Name'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'رقم الهاتف' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010XXXXXXXX"
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {isAr ? 'العنوان' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={isAr ? 'المدينة، المنطقة الصناعية' : 'City, Industrial Zone'}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isMain}
                    onChange={(e) => setIsMain(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{isAr ? 'فرع رئيسي للشركة (Main Branch)' : 'Main Branch'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>{isAr ? 'فرع نشط (Active)' : 'Active Branch'}</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <Button type="button" variant="outline" onClick={resetForm}>
                  {isAr ? 'إلغاء' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" disabled={isSaving}>
                  {isSaving ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الفرع' : 'Save Branch')}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Branches Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5">{isAr ? 'الفرع' : 'Branch'}</th>
                <th className="py-3 px-3">{isAr ? 'الكود' : 'Code'}</th>
                <th className="py-3 px-3">{isAr ? 'النوع' : 'Type'}</th>
                <th className="py-3 px-3.5">{isAr ? 'المسؤول والاتصال' : 'Manager & Contact'}</th>
                <th className="py-3 px-3.5">{isAr ? 'المستودعات المربوطة (ربط سريع)' : 'Linked Warehouses'}</th>
                <th className="py-3 px-3 text-center">{isAr ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-3.5 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {isAr ? 'جارِ تحميل الفروع...' : 'Loading branches...'}
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {isAr ? 'لا توجد فروع مسجلة حتى الآن' : 'No branches registered yet'}
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => {
                  const linkedWhs = warehouses.filter((w) => w.branch_id === b.id || (!w.branch_id && b.is_main));
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{b.name}</span>
                          {b.is_main && (
                            <Badge variant="brand" className="text-[10px]">
                              {isAr ? 'الرئيسي' : 'Main'}
                            </Badge>
                          )}
                        </div>
                        {b.address && (
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{b.address}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {b.code}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-semibold">
                        {branchTypes[b.type] || b.type}
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">
                        {b.manager_name && (
                          <div className="flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200">
                            <User className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{b.manager_name}</span>
                          </div>
                        )}
                        {b.phone && (
                          <div className="flex items-center gap-1 text-slate-500 mt-0.5 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span dir="ltr">{b.phone}</span>
                          </div>
                        )}
                      </td>

                      {/* Warehouses Linked + Quick Bind */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1.5 min-w-[200px]">
                          {linkedWhs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {linkedWhs.map((w) => (
                                <span
                                  key={w.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                                >
                                  <Boxes className="w-3 h-3" />
                                  <span>{w.name}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic block">{isAr ? 'لا توجد مستودعات مربوطة' : 'No warehouses'}</span>
                          )}

                          {/* Quick Add Warehouse to this Branch */}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickAssignWhToBranch(e.target.value, b.id);
                                e.target.value = '';
                              }
                            }}
                            className="text-[11px] font-bold px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:border-blue-500 cursor-pointer w-full"
                          >
                            <option value="">{isAr ? '+ ربط مستودع بهذا الفرع...' : '+ Link Warehouse...'}</option>
                            {warehouses.map((w) => (
                              <option key={w.id} value={w.id}>
                                📦 {w.name} ({w.code}) {w.branch_id === b.id ? `✓ [مربوط حالياً]` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <Badge variant={b.is_active ? 'success' : 'neutral'} className="text-[10px]">
                          {b.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                        </Badge>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(b)}
                            className="h-7 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 border-slate-200 dark:border-slate-700 shadow-2xs gap-1"
                            title={isAr ? 'تعديل الفرع' : 'Edit Branch'}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>{isAr ? 'تعديل' : 'Edit'}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(b.id)}
                            disabled={b.warehouses_count > 0}
                            className="h-7 px-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 shadow-2xs gap-1 disabled:opacity-40"
                            title={b.warehouses_count > 0 ? (isAr ? 'لا يمكن حذف فرع به مستودعات مربوطة' : 'Has warehouses') : (isAr ? 'حذف الفرع' : 'Delete')}
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

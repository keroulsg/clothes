import React, { useState, useEffect } from 'react';
import { X, Layers, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import type { CostCenter } from '../../types';

interface CostCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  costCenterToEdit?: CostCenter | null;
  existingCenters: CostCenter[];
  isAr?: boolean;
}

export const CostCenterModal: React.FC<CostCenterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  costCenterToEdit,
  existingCenters,
  isAr = true,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (costCenterToEdit) {
      setCode(costCenterToEdit.code || '');
      setName(costCenterToEdit.name || '');
      setNameEn(costCenterToEdit.name_en || '');
      setParentId(costCenterToEdit.parent_id || '');
      setDescription(costCenterToEdit.description || '');
      setIsActive(costCenterToEdit.is_active ?? true);
    } else {
      // Auto-suggest next code
      const nextNum = (existingCenters.length + 1) * 10;
      setCode(String(nextNum));
      setName('');
      setNameEn('');
      setParentId('');
      setDescription('');
      setIsActive(true);
    }
    setErrorMsg(null);
  }, [costCenterToEdit, isOpen, existingCenters.length]);

  if (!isOpen) return null;

  // Potential parents: centers that are not this center itself
  const parentOptions = existingCenters.filter(
    (c) => !costCenterToEdit || c.id !== costCenterToEdit.id
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setErrorMsg(isAr ? 'يرجى إدخال كود واسم مركز التكلفة' : 'Code and Name are required');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const payload = {
        code: code.trim(),
        name: name.trim(),
        name_en: nameEn.trim() || undefined,
        parent_id: parentId || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
      };

      if (costCenterToEdit) {
        await api.accounting.updateCostCenter(costCenterToEdit.id, payload);
      } else {
        await api.accounting.createCostCenter(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(
        err?.response?.data?.message || err?.message || (isAr ? 'حدث خطأ أثناء الحفظ' : 'Failed to save')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#111217] border border-amber-900/30 rounded-2xl shadow-2xl overflow-hidden my-8 text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {costCenterToEdit
                  ? isAr ? 'تعديل بيانات مركز التكلفة' : 'Edit Cost Center'
                  : isAr ? 'إضافة مركز تكلفة جديد' : 'New Cost Center'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isAr ? 'تحديد كود وقسم مركز التكلفة لربطه بالمصروفات' : 'Define cost center code and hierarchy'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                {isAr ? 'كود المركز *' : 'Center Code *'}
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثال: 101"
                className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                {isAr ? 'المركز الأب (الرئيسي)' : 'Parent Cost Center'}
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="">{isAr ? '— مركز رئيسي مستقل —' : '— Main Center (No Parent) —'}</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              {isAr ? 'اسم مركز التكلفة بالعربية *' : 'Name (Arabic) *'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: خط إنتاج قمصان رجالي / قسم القص"
              className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              {isAr ? 'الاسم بالإنجليزية (اختياري)' : 'Name (English)'}
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="e.g. Cutting & Spreading Department"
              className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              {isAr ? 'الوصف والنشاط المستهدف' : 'Description'}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isAr ? 'وصف طبيعة التكاليف والمصاريف التي يتم تحميلها على هذا المركز...' : 'Description...'}
              className="w-full bg-neutral-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          {costCenterToEdit && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="is_active" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                {isAr ? 'مركز نشط ومتاح لتحميل القيود والمصروفات' : 'Active and available for journal allocations'}
              </label>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs py-2 px-4"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs py-2 px-5 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ مركز التكلفة' : 'Save Center')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

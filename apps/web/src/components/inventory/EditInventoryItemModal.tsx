import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { Edit2, MapPin, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { InventoryItem } from '../../types';

interface EditInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onItemUpdated: (item: InventoryItem) => void;
  isAr?: boolean;
}

export const EditInventoryItemModal: React.FC<EditInventoryItemModalProps> = ({
  isOpen,
  onClose,
  item,
  onItemUpdated,
  isAr = true,
}) => {
  const [name, setName] = useState<string>('');
  const [averageCost, setAverageCost] = useState<string>('');
  const [reorderLevel, setReorderLevel] = useState<string>('');

  // Storage location
  const [storageZone, setStorageZone] = useState<string>('');
  const [rackLocation, setRackLocation] = useState<string>('');
  const [shelfBinLocation, setShelfBinLocation] = useState<string>('');

  // Technical specs
  const [gsm, setGsm] = useState<string>('');
  const [usableWidth, setUsableWidth] = useState<string>('');
  const [rollCount, setRollCount] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name || '');
      setAverageCost(item.average_cost !== undefined ? String(item.average_cost) : '');
      setReorderLevel(item.reorder_level !== undefined ? String(item.reorder_level) : '');

      const zone = item.storage_zone || item.technical_specs?.storage_zone || '';
      const rack = item.rack_location || item.technical_specs?.rack_location || '';
      const bin = item.shelf_bin_location || item.technical_specs?.shelf_bin_location || '';

      setStorageZone(zone);
      setRackLocation(rack);
      setShelfBinLocation(bin);

      const specs = item.technical_specs || {};
      setGsm(specs.gsm !== undefined ? String(specs.gsm) : '');
      setUsableWidth(specs.usable_width_meters !== undefined ? String(specs.usable_width_meters) : '');
      setRollCount(specs.roll_count !== undefined ? String(specs.roll_count) : '');

      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [item, isOpen]);

  if (!item) return null;

  const isRaw = !['finished_good', 'finished_product'].includes((item.item_type || '').toLowerCase()) && !item.variant_id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(isAr ? 'اسم الصنف حقل إلزامي.' : 'Item name is required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const technical_specs: Record<string, any> = {
        ...(item.technical_specs || {}),
        storage_zone: storageZone.trim() || undefined,
        rack_location: rackLocation.trim() || undefined,
        shelf_bin_location: shelfBinLocation.trim() || undefined,
      };

      if (isRaw) {
        if (gsm) technical_specs.gsm = Number(gsm);
        if (usableWidth) technical_specs.usable_width_meters = Number(usableWidth);
        if (rollCount) technical_specs.roll_count = Number(rollCount);
      }

      const res = await api.inventory.updateItem(item.id, {
        name: name.trim(),
        average_cost: averageCost ? Number(averageCost) : undefined,
        reorder_level: reorderLevel ? Number(reorderLevel) : undefined,
        storage_zone: storageZone.trim() || undefined,
        rack_location: rackLocation.trim() || undefined,
        shelf_bin_location: shelfBinLocation.trim() || undefined,
        technical_specs,
      });

      if (res.item) {
        setSuccessMsg(isAr ? 'تم تعديل بيانات كارت الصنف وموضع الرف بنجاح.' : 'Item updated successfully.');
        const updated: InventoryItem = {
          ...item,
          name: name.trim(),
          average_cost: averageCost ? Number(averageCost) : item.average_cost,
          reorder_level: reorderLevel ? Number(reorderLevel) : item.reorder_level,
          storage_zone: storageZone.trim() || undefined,
          rack_location: rackLocation.trim() || undefined,
          shelf_bin_location: shelfBinLocation.trim() || undefined,
          technical_specs,
        };
        onItemUpdated(updated);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر حفظ تعديلات الصنف.' : 'Failed to update item.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `تعديل كارت الصنف: ${item.code}` : `Edit Inventory Item: ${item.code}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Read-only Code & Warehouse Info */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
          <div>
            <span className="text-[10px] text-slate-400 block">{isAr ? 'كود الصنف' : 'Code'}</span>
            <strong className="font-mono text-slate-900 dark:text-white font-bold">{item.code}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">{isAr ? 'المستودع' : 'Warehouse'}</span>
            <span className="text-slate-800 dark:text-slate-200 font-medium">{item.warehouse_name || 'المستودع الرئيسي'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">{isAr ? 'الرصيد الحالي' : 'Balance'}</span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{item.current_balance} {item.unit_of_measure}</strong>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
            {isAr ? 'اسم الصنف والمواصفات' : 'Item Name & Description'} <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Cost & Reorder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'متوسط التكلفة (ج.م)' : 'Average Cost'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'حد إعادة الطلب (تنبيه النواقص)' : 'Reorder Level'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Storage Location Coordinates */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            <span>{isAr ? 'تعديل موضع التخزين الفيزيائي (Zone / Rack / Shelf / Bin)' : 'Storage Location'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'المنطقة / الصالة (Zone)' : 'Zone'}
              </label>
              <input
                type="text"
                value={storageZone}
                onChange={(e) => setStorageZone(e.target.value)}
                placeholder={isAr ? 'مثال: صالة أ' : 'Zone A'}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'رقم الحامل (Rack)' : 'Rack'}
              </label>
              <input
                type="text"
                value={rackLocation}
                onChange={(e) => setRackLocation(e.target.value)}
                placeholder="R-01"
                className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                {isAr ? 'رقم الرف / الصندوق (Shelf / Bin)' : 'Shelf / Bin'}
              </label>
              <input
                type="text"
                value={shelfBinLocation}
                onChange={(e) => setShelfBinLocation(e.target.value)}
                placeholder="BIN-01"
                className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Raw Materials Extra Specs */}
        {isRaw && (
          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
            <span className="font-bold text-amber-700 dark:text-amber-400 text-xs block">
              {isAr ? 'مواصفات النسيج والقماش' : 'Fabric Specs'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'كثافة النسيج (GSM)' : 'GSM'}
                </label>
                <input
                  type="number"
                  value={gsm}
                  onChange={(e) => setGsm(e.target.value)}
                  placeholder="180"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'عرض القماش (متر)' : 'Width (m)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={usableWidth}
                  onChange={(e) => setUsableWidth(e.target.value)}
                  placeholder="1.65"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  {isAr ? 'عدد الأثواب' : 'Roll count'}
                </label>
                <input
                  type="number"
                  value={rollCount}
                  onChange={(e) => setRollCount(e.target.value)}
                  placeholder="1"
                  className="w-full font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[110px]"
            icon={isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Edit2 className="w-3.5 h-3.5" />}
          >
            {isLoading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ التعديلات' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};


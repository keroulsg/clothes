import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { api } from '../../api/client';
import { Boxes, MapPin, Layers, CheckCircle } from 'lucide-react';
import type { Warehouse, InventoryItem } from '../../types';

interface CreateInventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  onItemCreated: (item: InventoryItem) => void;
  defaultCategory?: 'raw_materials' | 'finished_goods';
  isAr?: boolean;
}

export const CreateInventoryItemModal: React.FC<CreateInventoryItemModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  onItemCreated,
  defaultCategory = 'raw_materials',
  isAr = true,
}) => {
  const [targetCategory, setTargetCategory] = useState<'raw_materials' | 'finished_goods'>(defaultCategory);
  const [warehouseId, setWarehouseId] = useState<string>(warehouses[0]?.id || '');
  const [itemType, setItemType] = useState<string>(defaultCategory === 'raw_materials' ? 'fabric_raw' : 'finished_good');
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<string>(defaultCategory === 'raw_materials' ? 'kg' : 'piece');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [averageCost, setAverageCost] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(10);
  
  // Storage location
  const [storageZone, setStorageZone] = useState<string>('منطقة أ');
  const [rackLocation, setRackLocation] = useState<string>('R-01');
  const [shelfBinLocation, setShelfBinLocation] = useState<string>('BIN-01');

  // Specs
  const [gsm, setGsm] = useState<number>(180);
  const [usableWidth, setUsableWidth] = useState<number>(1.65);
  const [rollCount, setRollCount] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCategorySwitch = (cat: 'raw_materials' | 'finished_goods') => {
    setTargetCategory(cat);
    if (cat === 'raw_materials') {
      setItemType('fabric_raw');
      setUnitOfMeasure('kg');
      if (!code.startsWith('FAB-') && !code.startsWith('ACC-')) {
        setCode(`FAB-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } else {
      setItemType('finished_good');
      setUnitOfMeasure('piece');
      if (!code.startsWith('FG-')) {
        setCode(`FG-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      setErrorMsg(isAr ? 'يرجى اختيار المستودع التابع له الصنف.' : 'Please select a warehouse.');
      return;
    }
    if (!name.trim() || !code.trim()) {
      setErrorMsg(isAr ? 'اسم الصنف والكود حقول إلزامية.' : 'Item name and code are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const technical_specs: Record<string, any> = {
        storage_zone: storageZone,
        rack_location: rackLocation,
        shelf_bin_location: shelfBinLocation,
      };

      if (targetCategory === 'raw_materials') {
        technical_specs.gsm = Number(gsm);
        technical_specs.usable_width_meters = Number(usableWidth);
        technical_specs.roll_count = Number(rollCount);
      }

      const res = await api.inventory.createItem({
        warehouse_id: warehouseId,
        item_type: itemType,
        code: code.trim(),
        name: name.trim(),
        unit_of_measure: unitOfMeasure,
        reorder_level: Number(reorderLevel),
        average_cost: Number(averageCost),
        initial_balance: Number(initialBalance),
        storage_zone: storageZone,
        rack_location: rackLocation,
        shelf_bin_location: shelfBinLocation,
        technical_specs,
      });

      if (res.item) {
        setSuccessMsg(isAr ? 'تم حفظ الصنف وتوثيق موضع التخزين بنجاح.' : 'Item created successfully.');
        onItemCreated(res.item);
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر إنشاء كارت الصنف المخزني.' : 'Failed to create inventory item.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isAr ? 'تعريف كارت صنف مخزني وموضع التخزين' : 'New Inventory Item & Bin Location'} maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Category Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => handleCategorySwitch('raw_materials')}
            className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              targetCategory === 'raw_materials'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>{isAr ? 'خامات ومستلزمات إنتاج (Raw)' : 'Raw Materials & Trims'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleCategorySwitch('finished_goods')}
            className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${
              targetCategory === 'finished_goods'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4 text-emerald-500" />
            <span>{isAr ? 'منتج تام الصنع (Finished Goods)' : 'Finished Goods Variant'}</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'المستودع الرئيسي' : 'Warehouse'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">{isAr ? '— اختر المستودع —' : 'Select warehouse'}</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'نوع الصنف المخزني' : 'Item Type'} <span className="text-rose-500">*</span>
            </label>
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
            >
              {targetCategory === 'raw_materials' ? (
                <>
                  <option value="fabric_raw">{isAr ? 'قماش خام (طاقات / أثواب)' : 'Raw Fabric'}</option>
                  <option value="accessory_raw">{isAr ? 'إكسسوارات وسوست وأزرار' : 'Trims & Zippers'}</option>
                  <option value="thread">{isAr ? 'خيوط حياكة وتطريز' : 'Sewing Threads'}</option>
                  <option value="packaging">{isAr ? 'أكياس وكراتين وتغليف' : 'Packaging'}</option>
                </>
              ) : (
                <>
                  <option value="finished_good">{isAr ? 'ملابس جاهزة للبيع والتوزيع' : 'Finished Apparel'}</option>
                  <option value="finished_product">{isAr ? 'طقم / بدلة كاملة' : 'Complete Set'}</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Code & Name */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'كود الصنف / الباركود' : 'Item Code / Barcode'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="FAB-1001"
              required
              className="w-full font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'اسم الصنف والمواصفات' : 'Item Name & Specs'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isAr ? 'مثال: قماش سينجل جيرسي قطن 100% كحلي' : 'e.g. Single Jersey 100% Cotton Navy'}
              required
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Physical Storage Location in Warehouse */}
        <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-indigo-900 dark:text-indigo-300">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span>{isAr ? 'موضع التخزين الفيزيائي (Zone / Rack / Shelf / Bin)' : 'Warehouse Storage Coordinates'}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'المنطقة / الصالة (Zone)' : 'Zone'}
              </label>
              <input
                type="text"
                value={storageZone}
                onChange={(e) => setStorageZone(e.target.value)}
                placeholder="Zone A"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'رقم الستاند / الحامل (Rack)' : 'Rack Location'}
              </label>
              <input
                type="text"
                value={rackLocation}
                onChange={(e) => setRackLocation(e.target.value)}
                placeholder="RACK-04"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'رقم الرف / الصندوق (Shelf / Bin)' : 'Shelf / Bin Location'}
              </label>
              <input
                type="text"
                value={shelfBinLocation}
                onChange={(e) => setShelfBinLocation(e.target.value)}
                placeholder="BIN-18"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Quantities & Pricing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'وحدة القياس' : 'Unit'}
            </label>
            <input
              type="text"
              value={unitOfMeasure}
              onChange={(e) => setUnitOfMeasure(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'الرصيد الافتتاحي' : 'Initial Stock'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={initialBalance}
              onChange={(e) => setInitialBalance(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'متوسط التكلفة (ج.م)' : 'Cost Price (EGP)'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={averageCost}
              onChange={(e) => setAverageCost(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
              {isAr ? 'حد إعادة الطلب' : 'Reorder Alert Level'}
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-slate-100 font-mono"
            />
          </div>
        </div>

        {/* Category-Specific Attributes */}
        {targetCategory === 'raw_materials' && (
          <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'كثافة النسيج (GSM جم/م²)' : 'Fabric GSM'}
              </label>
              <input
                type="number"
                step="any"
                value={gsm}
                onChange={(e) => setGsm(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عرض القماش الصالح (متر)' : 'Usable Width (m)'}
              </label>
              <input
                type="number"
                step="any"
                value={usableWidth}
                onChange={(e) => setUsableWidth(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عدد الأثواب / الطاقات' : 'Rolls Count'}
              </label>
              <input
                type="number"
                min="1"
                value={rollCount}
                onChange={(e) => setRollCount(Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
            {isLoading ? (isAr ? 'جارِ الحفظ...' : 'Saving...') : (isAr ? 'حفظ الصنف وتوثيق الرصيد' : 'Save Item')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { Supplier, Warehouse, InventoryItem, PurchaseOrder } from '../../types';
import { api } from '../../api/client';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  items: InventoryItem[];
  onSuccess: (newPo: PurchaseOrder) => void;
}

export const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  warehouses,
  items,
  onSuccess,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState([
    {
      inventory_item_id: items[0]?.id || '',
      ordered_quantity: 500,
      unit_price: 100,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const addItemRow = () => {
    setPoItems([
      ...poItems,
      {
        inventory_item_id: items[0]?.id || '',
        ordered_quantity: 100,
        unit_price: 50,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index));
    }
  };

  const updateItemRow = (index: number, field: string, val: any) => {
    setPoItems(poItems.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  const subtotal = poItems.reduce((acc, curr) => acc + (curr.ordered_quantity * curr.unit_price), 0);
  const taxAmount = subtotal * 0.14;
  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId || poItems.length === 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.procurement.createPurchaseOrder({
        supplier_id: supplierId,
        warehouse_id: warehouseId,
        order_date: orderDate,
        expected_delivery_date: expectedDate || undefined,
        notes: notes || undefined,
        items: poItems.map(it => ({
          inventory_item_id: it.inventory_item_id,
          ordered_quantity: Number(it.ordered_quantity),
          unit_price: Number(it.unit_price),
          tax_rate: 14.0,
        })),
      });

      if (res.purchase_order) {
        onSuccess(res.purchase_order);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إنشاء أمر الشراء على الخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إصدار أمر شراء خامات جديد (Purchase Order)" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">المورد المعتمد</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">مخزن الاستلام المستهدف</label>
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ أمر الشراء</label>
            <input
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">تاريخ التوريد المتوقع</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">بنود الأصناف المطلوبة</label>
            <Button type="button" size="sm" variant="outline" onClick={addItemRow} icon={<Plus className="w-3.5 h-3.5" />}>
              إضافة بند
            </Button>
          </div>

          <div className="space-y-2">
            {poItems.map((row, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center">
                <div className="col-span-5">
                  <select
                    value={row.inventory_item_id}
                    onChange={(e) => updateItemRow(index, 'inventory_item_id', e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>{it.name} ({it.unit_of_measure})</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    placeholder="الكمية"
                    value={row.ordered_quantity}
                    onChange={(e) => updateItemRow(index, 'ordered_quantity', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="سعر الوحدة"
                    value={row.unit_price}
                    onChange={(e) => updateItemRow(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={poItems.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وشروط التوريد</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شروط مطابقة عينات المعمل، مواصفات لف الثياب..."
            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Financial Summary */}
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>المجموع قبل الضريبة:</span>
            <span className="font-mono text-slate-900 dark:text-slate-200">{subtotal.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>ضريبة القيمة المضافة (14%):</span>
            <span className="font-mono text-slate-900 dark:text-slate-200">{taxAmount.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1.5 border-t border-slate-200 dark:border-slate-800">
            <span>إجمالي أمر الشراء المستهدف:</span>
            <span className="font-mono text-brand-primary dark:text-rose-400 text-sm">{totalAmount.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            إنشاء أمر الشراء (مسودة)
          </Button>
        </div>
      </form>
    </Modal>
  );
};

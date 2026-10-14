import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Plus, Trash2 } from 'lucide-react';
import type { Supplier, Warehouse, InventoryItem, PurchaseOrder } from '../../types';

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId || poItems.length === 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const selectedSupplier = suppliers.find(s => s.id === supplierId);
      const selectedWarehouse = warehouses.find(w => w.id === warehouseId);

      const createdPo: PurchaseOrder = {
        id: 'po-' + Date.now(),
        po_number: 'PO-' + dateToCode() + '-' + Math.floor(100 + Math.random() * 900),
        supplier_id: supplierId,
        supplier_name: selectedSupplier?.name || 'مورد خامات',
        warehouse_id: warehouseId,
        warehouse_name: selectedWarehouse?.name || 'مخزن الأقمشة',
        order_date: orderDate,
        expected_delivery_date: expectedDate || undefined,
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        items: poItems.map((item, idx) => {
          const invItem = items.find(it => it.id === item.inventory_item_id);
          return {
            id: 'poi-' + idx + '-' + Date.now(),
            inventory_item_id: item.inventory_item_id,
            item_name: invItem?.name || 'خامة نسيج',
            item_code: invItem?.code || 'FAB-RAW',
            ordered_quantity: item.ordered_quantity,
            received_quantity: 0,
            remaining_quantity: item.ordered_quantity,
            unit_price: item.unit_price,
            total_price: item.ordered_quantity * item.unit_price * 1.14,
          };
        }),
      };

      onSuccess(createdPo);
      onClose();
    }, 600);
  };

  function dateToCode() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="إصدار أمر شراء خامات جديد (Purchase Order)" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">المورد المعتمد</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">مخزن الاستلام المستهدف</label>
            <select
              required
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ أمر الشراء</label>
            <input
              type="date"
              required
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">تاريخ التوريد المتوقع</label>
            <input
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-200">بنود الأصناف المطلوبة</label>
            <Button type="button" size="sm" variant="outline" onClick={addItemRow} icon={<Plus className="w-3.5 h-3.5" />}>
              إضافة بند
            </Button>
          </div>

          <div className="space-y-2">
            {poItems.map((row, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 items-center">
                <div className="col-span-5">
                  <select
                    value={row.inventory_item_id}
                    onChange={(e) => updateItemRow(index, 'inventory_item_id', e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100 focus:outline-none focus:border-indigo-500"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="col-span-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="سعر الوحدة"
                    value={row.unit_price}
                    onChange={(e) => updateItemRow(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2 text-slate-100 font-mono text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItemRow(index)}
                    disabled={poItems.length === 1}
                    className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">ملاحظات وشروط التوريد</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="شروط مطابقة عينات المعمل، مواصفات لف الثياب..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Financial Summary */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>المجموع قبل الضريبة:</span>
            <span className="font-mono text-slate-200">{subtotal.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>ضريبة القيمة المضافة (14%):</span>
            <span className="font-mono text-slate-200">{taxAmount.toLocaleString()} ج.م</span>
          </div>
          <div className="flex justify-between font-bold text-slate-100 pt-1.5 border-t border-slate-800">
            <span>إجمالي أمر الشراء المستهدف:</span>
            <span className="font-mono text-indigo-400 text-sm">{totalAmount.toLocaleString()} ج.م</span>
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

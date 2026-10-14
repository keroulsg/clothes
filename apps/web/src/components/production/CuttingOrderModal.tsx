import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Scissors, Layers } from 'lucide-react';
import type { ProductionOrder, Warehouse, InventoryItem, CustomerMaterial, CuttingOrder, CuttingBundle } from '../../types';

interface CuttingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrder: ProductionOrder | null;
  warehouses: Warehouse[];
  fabricItems: InventoryItem[];
  customerMaterials: CustomerMaterial[];
  onSuccess: (newCuttingOrder: CuttingOrder, generatedBundles: CuttingBundle[]) => void;
}

export const CuttingOrderModal: React.FC<CuttingOrderModalProps> = ({
  isOpen,
  onClose,
  productionOrder,
  warehouses,
  fabricItems,
  customerMaterials,
  onSuccess,
}) => {
  if (!productionOrder) return null;

  const [tableNumber, setTableNumber] = useState('طاولة القص 1');
  const [fabricSource, setFabricSource] = useState<'factory_owned' | 'customer_deposit'>('factory_owned');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [selectedFabricId, setSelectedFabricId] = useState(fabricItems[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerMaterials[0]?.id || '');

  const [layLengthMeters, setLayLengthMeters] = useState(2.2);
  const [layersCount, setLayersCount] = useState(50);
  const [endLossMeters, setEndLossMeters] = useState(0.05);
  const [remnantMeters, setRemnantMeters] = useState(1.5);
  const [usableWidthMeters, setUsableWidthMeters] = useState(1.60);
  const [markerEfficiency, setMarkerEfficiency] = useState(86.5);
  const [relaxationHours, setRelaxationHours] = useState(24);
  const [shrinkagePercent, setShrinkagePercent] = useState(3.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculations
  const theoreticalFabricMeters = Math.round(layLengthMeters * layersCount * 100) / 100;
  const actualFabricMetersUsed = Math.round((theoreticalFabricMeters + (endLossMeters * layersCount) + remnantMeters) * 100) / 100;
  const totalCutPieces = layersCount * (productionOrder.items?.length || 2);

  const selectedFabric = fabricItems.find((f) => f.id === selectedFabricId) || fabricItems[0];
  const selectedCustMat = customerMaterials.find((c) => c.id === selectedCustomerId) || customerMaterials[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (layersCount <= 0 || layLengthMeters <= 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const cuttingOrderNum = 'CUT-' + new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000);

      const newCutOrder: CuttingOrder = {
        id: 'cut-' + Date.now(),
        cutting_order_number: cuttingOrderNum,
        production_order_id: productionOrder.id,
        production_order_number: productionOrder.order_number,
        model_name: productionOrder.model_name,
        table_number: tableNumber,
        fabric_name: fabricSource === 'factory_owned' ? selectedFabric?.name : selectedCustMat?.fabric_name,
        fabric_source: fabricSource,
        customer_material_name: fabricSource === 'customer_deposit' ? selectedCustMat?.customer_name : undefined,
        warehouse_name: warehouses.find((w) => w.id === warehouseId)?.name || 'مخزن الأقمشة',
        lay_length_meters: layLengthMeters,
        layers_count: layersCount,
        marker_efficiency_percent: markerEfficiency,
        actual_fabric_meters_used: actualFabricMetersUsed,
        theoretical_fabric_meters: theoreticalFabricMeters,
        end_loss_meters: endLossMeters,
        total_cut_pieces: totalCutPieces,
        status: 'cut_completed',
        created_at: new Date().toISOString().split('T')[0],
      };

      // Generate Bundle Cards automatically for workshop floor
      const generatedBundles: CuttingBundle[] = [];
      let bNum = 1;
      const orderItems = productionOrder.items || [
        { id: '1', color_name: 'أحمر زاهي', size_name: '2Y', planned_quantity: 50, cut_quantity: 0, completed_quantity: 0, color_id: '1', size_id: '1' },
        { id: '2', color_name: 'كحلي غامق', size_name: '4Y', planned_quantity: 50, cut_quantity: 0, completed_quantity: 0, color_id: '2', size_id: '2' },
      ];

      orderItems.forEach((item) => {
        let remaining = layersCount;
        while (remaining > 0) {
          const qty = Math.min(remaining, 25);
          generatedBundles.push({
            id: 'bnd-' + Date.now() + '-' + bNum,
            bundle_code: `BND-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(bNum).padStart(4, '0')}`,
            cutting_order_id: newCutOrder.id,
            production_order_id: productionOrder.id,
            bundle_number: bNum,
            color_name: item.color_name,
            size_name: item.size_name,
            quantity: qty,
            current_stage_code: 'cutting',
            status: 'active',
          });
          remaining -= qty;
          bNum++;
        }
      });

      onSuccess(newCutOrder, generatedBundles);
      onClose();
    }, 600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`صالة القص والفرش لأمر الإنتاج: ${productionOrder.order_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Production Order Summary Banner */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">الموديل المطلوب قصه:</span>
            <span className="font-bold text-slate-200">
              [{productionOrder.model_code}] {productionOrder.model_name}
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-400 block text-[11px]">الكمية المستهدفة بالأمر:</span>
            <span className="font-mono font-bold text-indigo-400">
              {productionOrder.target_quantity.toLocaleString()} قطعة
            </span>
          </div>
        </div>

        {/* Source of Fabric */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">مصدر القماش</label>
            <select
              value={fabricSource}
              onChange={(e) => setFabricSource(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="factory_owned">خامات مملوكة للمصنع (خصم من مخزن الأقمشة)</option>
              <option value="customer_deposit">أمانة خامة عميل (تصنيع وتشغيل للغير CMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">طاولة القص</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Fabric Item selection */}
        {fabricSource === 'factory_owned' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">صنف القماش في المخزن</label>
              <select
                value={selectedFabricId}
                onChange={(e) => setSelectedFabricId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {fabricItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — (رصيد: {item.current_balance} {item.unit_of_measure})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">المخزن المستهدف للصرف</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">محضر أمانة خامة العميل</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {customerMaterials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} — {c.fabric_name} (رصيد متبقي: {c.remaining_meters} متر)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lay and Marker Parameters */}
        <div className="border border-slate-800 rounded-xl p-3.5 bg-slate-950/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>معايير الفرشة والمخطط الهندسي (Lay & Marker Parameters)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                طول الفرشة (متر)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={layLengthMeters}
                onChange={(e) => setLayLengthMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                عدد الطبقات (الراقات)
              </label>
              <input
                type="number"
                min="1"
                required
                value={layersCount}
                onChange={(e) => setLayersCount(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-indigo-400 font-mono font-bold focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                عادم أطراف الفرشة (متر)
              </label>
              <input
                type="number"
                step="0.01"
                value={endLossMeters}
                onChange={(e) => setEndLossMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                عوادم وبواقي (متر)
              </label>
              <input
                type="number"
                step="0.01"
                value={remnantMeters}
                onChange={(e) => setRemnantMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                عرض القماش الفعلي (م)
              </label>
              <input
                type="number"
                step="0.01"
                value={usableWidthMeters}
                onChange={(e) => setUsableWidthMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                كفاءة الماركر %
              </label>
              <input
                type="number"
                step="0.1"
                value={markerEfficiency}
                onChange={(e) => setMarkerEfficiency(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                زمن راحة القماش (ساعات)
              </label>
              <input
                type="number"
                value={relaxationHours}
                onChange={(e) => setRelaxationHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                الانكماش المقاس %
              </label>
              <input
                type="number"
                step="0.1"
                value={shrinkagePercent}
                onChange={(e) => setShrinkagePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg text-xs p-2 text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Realtime Yield & Stock Deduction Card */}
        <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">الاستهلاك النظري للفرشة:</span>
            <span className="font-mono font-bold text-slate-200 text-sm">
              {theoreticalFabricMeters.toLocaleString()} متر
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">الاستهلاك الفعلي المخصوم:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              {actualFabricMetersUsed.toLocaleString()} متر
            </span>
            <span className="text-[10px] text-slate-500 block">شامل عادم الأطراف والبواقي</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">إجمالي القطع المقصوصة:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {totalCutPieces.toLocaleString()} قطعة
            </span>
            <span className="text-[10px] text-emerald-400/80 block">توليد بطاقات الحزم فورياً</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<Scissors className="w-3.5 h-3.5" />}>
            تنفيذ القص وصرف الخام وتوليد الحزم
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Scissors, Layers, AlertCircle } from 'lucide-react';
import type { ProductionOrder, Warehouse, InventoryItem, CustomerMaterial, CuttingOrder, CuttingBundle } from '../../types';
import { api } from '../../api/client';

interface CuttingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionOrder: ProductionOrder | null;
  warehouses: Warehouse[];
  fabricItems: InventoryItem[];
  customerMaterials: CustomerMaterial[];
  onSuccess: (newCuttingOrder: CuttingOrder, generatedBundles: CuttingBundle[]) => void;
  isAr?: boolean;
}

export const CuttingOrderModal: React.FC<CuttingOrderModalProps> = ({
  isOpen,
  onClose,
  productionOrder,
  warehouses,
  fabricItems,
  customerMaterials,
  onSuccess,
  isAr = true,
}) => {
  if (!productionOrder) return null;

  const [tableNumber, setTableNumber] = useState(isAr ? 'طاولة القص 1' : 'Cutting Table 1');
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
  const [errorMsg, setErrorMsg] = useState('');

  // Calculations
  const theoreticalFabricMeters = Math.round(layLengthMeters * layersCount * 100) / 100;
  const actualFabricMetersUsed = Math.round((theoreticalFabricMeters + (endLossMeters * layersCount) + remnantMeters) * 100) / 100;
  const totalCutPieces = layersCount * (productionOrder.items?.length || 2);

  const selectedFabric = fabricItems.find((f) => f.id === selectedFabricId) || fabricItems[0];
  const selectedCustMat = customerMaterials.find((c) => c.id === selectedCustomerId) || customerMaterials[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (layersCount <= 0 || layLengthMeters <= 0) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.production.createCuttingOrder({
        production_order_id: productionOrder.id,
        table_number: tableNumber,
        warehouse_id: warehouseId,
        fabric_source: fabricSource,
        fabric_inventory_item_id: fabricSource === 'factory_owned' ? selectedFabric?.id : undefined,
        customer_material_id: fabricSource === 'customer_deposit' ? selectedCustMat?.id : undefined,
        lay_length_meters: Number(layLengthMeters),
        layers_count: Number(layersCount),
        marker_efficiency_percent: Number(markerEfficiency),
        end_loss_meters: Number(endLossMeters),
        remnant_meters: Number(remnantMeters),
        fabric_relaxation_hours_actual: Number(relaxationHours),
        measured_shrinkage_percent: Number(shrinkagePercent),
        total_cut_pieces: Number(totalCutPieces),
      });

      if (res.data) {
        const orderData = res.data;
        const bundles = orderData.bundles || [];
        onSuccess(orderData, bundles);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'تعذر تسجيل أمر القص وصرف الأقمشة على الخادم.' : 'Failed to register cutting order on server.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `صالة القص والفرش لأمر الإنتاج: ${productionOrder.order_number}` : `Cutting & Spreading Room: ${productionOrder.order_number}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {/* Production Order Summary Banner */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">{isAr ? 'الموديل المطلوب قصه:' : 'Target Garment Model:'}</span>
            <span className="font-bold text-slate-200">
              [{productionOrder.model_code}] {productionOrder.model_name}
            </span>
          </div>
          <div className={isAr ? 'text-left' : 'text-right'}>
            <span className="text-slate-400 block text-[11px]">{isAr ? 'الكمية المستهدفة بالأمر:' : 'Target Order Qty:'}</span>
            <span className="font-mono font-bold text-primary dark:text-[#fca5a5]">
              {productionOrder.target_quantity.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
            </span>
          </div>
        </div>

        {/* Source of Fabric */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'مصدر القماش' : 'Fabric Source'}
            </label>
            <select
              value={fabricSource}
              onChange={(e) => setFabricSource(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="factory_owned">
                {isAr ? 'خامات مملوكة للمصنع (خصم من مخزن الأقمشة)' : 'Factory Owned (Deducted from Stock)'}
              </option>
              <option value="customer_deposit">
                {isAr ? 'أمانة خامة عميل (تصنيع وتشغيل للغير CMT)' : 'Customer Deposit (Subcontracting / CMT)'}
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'طاولة القص' : 'Cutting Table'}
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Fabric Item selection */}
        {fabricSource === 'factory_owned' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'صنف القماش في المخزن' : 'Fabric Item in Stock'}
              </label>
              <select
                value={selectedFabricId}
                onChange={(e) => setSelectedFabricId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                {fabricItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — ({isAr ? 'رصيد:' : 'Stock:'} {item.current_balance} {item.unit_of_measure})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {isAr ? 'المخزن المستهدف للصرف' : 'Issuing Warehouse'}
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
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
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'محضر أمانة خامة العميل' : 'Customer Fabric Custody Intake'}
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {customerMaterials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.customer_name} — {c.fabric_name} ({isAr ? 'رصيد متبقي:' : 'Remaining:'} {c.remaining_meters} {isAr ? 'متر' : 'm'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lay and Marker Parameters */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 bg-slate-50 dark:bg-slate-950/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-200">
            <Layers className="w-4 h-4 text-primary dark:text-[#fca5a5]" />
            <span>{isAr ? 'معايير الفرشة والمخطط الهندسي (Lay & Marker Parameters)' : 'Lay & Marker Engineering Parameters'}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'طول الفرشة (متر)' : 'Lay Length (m)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={layLengthMeters}
                onChange={(e) => setLayLengthMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عدد الطبقات (الراقات)' : 'Layers / Plies Count'}
              </label>
              <input
                type="number"
                min="1"
                required
                value={layersCount}
                onChange={(e) => setLayersCount(parseInt(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-primary dark:text-[#fca5a5] font-mono font-bold focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عادم أطراف الفرشة (متر)' : 'End Loss (m)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={endLossMeters}
                onChange={(e) => setEndLossMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عوادم وبواقي (متر)' : 'Remnants (m)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={remnantMeters}
                onChange={(e) => setRemnantMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'عرض القماش الفعلي (م)' : 'Usable Fabric Width (m)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={usableWidthMeters}
                onChange={(e) => setUsableWidthMeters(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'كفاءة الماركر %' : 'Marker Efficiency %'}
              </label>
              <input
                type="number"
                step="0.1"
                value={markerEfficiency}
                onChange={(e) => setMarkerEfficiency(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'زمن راحة القماش (ساعات)' : 'Relaxation Time (hrs)'}
              </label>
              <input
                type="number"
                value={relaxationHours}
                onChange={(e) => setRelaxationHours(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                {isAr ? 'الانكماش المقاس %' : 'Measured Shrinkage %'}
              </label>
              <input
                type="number"
                step="0.1"
                value={shrinkagePercent}
                onChange={(e) => setShrinkagePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-xs p-2 text-slate-900 dark:text-slate-100 font-mono focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Realtime Yield & Stock Deduction Card */}
        <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'الاستهلاك النظري للفرشة:' : 'Theoretical Lay Consumption:'}
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-200 text-sm">
              {theoreticalFabricMeters.toLocaleString()} {isAr ? 'متر' : 'm'}
            </span>
          </div>

          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'الاستهلاك الفعلي المخصوم:' : 'Actual Stock Deducted:'}
            </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
              {actualFabricMetersUsed.toLocaleString()} {isAr ? 'متر' : 'm'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {isAr ? 'شامل عادم الأطراف والبواقي' : 'Includes end loss and remnants'}
            </span>
          </div>

          <div>
            <span className="text-slate-600 dark:text-slate-400 block text-[11px]">
              {isAr ? 'إجمالي القطع المقصوصة:' : 'Total Cut Pieces:'}
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {totalCutPieces.toLocaleString()} {isAr ? 'قطعة' : 'pcs'}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400/80 block">
              {isAr ? 'توليد بطاقات الحزم فورياً' : 'Immediate bundle ticket generation'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" isLoading={isSubmitting} icon={<Scissors className="w-3.5 h-3.5" />}>
            {isAr ? 'تنفيذ القص وصرف الخام وتوليد الحزم' : 'Execute Cut, Deduct Stock & Generate Bundles'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

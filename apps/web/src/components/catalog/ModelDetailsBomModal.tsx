import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import {
  Layers,
  Barcode,
  CheckCircle,
  Plus,
  RefreshCw,
  AlertCircle,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import type { GarmentModel, InventoryItem } from '../../types';
import { api } from '../../api/client';

interface ModelDetailsBomModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: GarmentModel | null;
  inventoryItems?: InventoryItem[];
}

export const ModelDetailsBomModal: React.FC<ModelDetailsBomModalProps> = ({
  isOpen,
  onClose,
  model,
  inventoryItems = [],
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'bom'>('bom');
  const [boms, setBoms] = useState<any[]>([]);
  const [isLoadingBom, setIsLoadingBom] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form for adding a new BOM
  const [isAddingBom, setIsAddingBom] = useState(false);
  const [bomVersion, setBomVersion] = useState('v1.0');
  const [bomName, setBomName] = useState('');
  const [bomItems, setBomItems] = useState<Array<{
    inventory_item_id: string;
    component_type: string;
    consumption_per_unit: number;
    unit_of_measure: string;
    waste_tolerance_percent: number;
    unit_cost: number;
  }>>([
    {
      inventory_item_id: '',
      component_type: 'fabric',
      consumption_per_unit: 1.2,
      unit_of_measure: 'meter',
      waste_tolerance_percent: 3.5,
      unit_cost: 95.0,
    },
  ]);
  const [isSubmittingBom, setIsSubmittingBom] = useState(false);

  // Fetch BOM for this model when opened
  useEffect(() => {
    if (isOpen && model?.id) {
      setBomName(`شجرة مكونات ${model.name}`);
      fetchBoms();
    }
  }, [isOpen, model]);

  const fetchBoms = async () => {
    if (!model?.id) return;
    setIsLoadingBom(true);
    setErrorMsg('');
    try {
      const res = await api.production.getBoms({ garment_model_id: model.id });
      if (res?.data) {
        setBoms(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load BOMs:', err);
    } finally {
      setIsLoadingBom(false);
    }
  };

  if (!model) return null;

  const handleApproveBom = async (bomId: string) => {
    try {
      await api.production.approveBom(bomId);
      setSuccessMsg('تم اعتماد شجرة المكونات والـ BOM رسميًا للإنتاج!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchBoms();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل اعتماد شجرة المكونات');
    }
  };

  const handleAddBomItemRow = () => {
    setBomItems((prev) => [
      ...prev,
      {
        inventory_item_id: inventoryItems[0]?.id || '',
        component_type: 'accessory',
        consumption_per_unit: 1,
        unit_of_measure: 'piece',
        waste_tolerance_percent: 1,
        unit_cost: 0.5,
      },
    ]);
  };

  const handleSaveBom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.id) return;

    const validItems = bomItems.filter((i) => i.consumption_per_unit > 0);
    if (validItems.length === 0) {
      setErrorMsg('يجب إضافة مكون واحد على الأقل باستهلاك سليم.');
      return;
    }

    setIsSubmittingBom(true);
    setErrorMsg('');
    try {
      await api.production.createBom({
        garment_model_id: model.id,
        version: bomVersion,
        bom_code: `BOM-${model.code}-${bomVersion}`,
        name: bomName || `BOM ${model.name}`,
        items: validItems.map((it) => ({
          ...it,
          inventory_item_id: it.inventory_item_id || inventoryItems[0]?.id || model.id,
        })),
      });

      setSuccessMsg('تم حفظ شجرة المكونات بنجاح!');
      setIsAddingBom(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchBoms();
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل حفظ شجرة المكونات');
    } finally {
      setIsSubmittingBom(false);
    }
  };

  // Mocked variants calculation if model has variants_count
  const generatedVariants = Array.from({ length: Math.max(1, model.variants_count || 4) }).map((_, idx) => {
    const sizes = ['2Y', '4Y', '6Y', '8Y', '10Y'];
    const colors = ['كحلي', 'أحمر', 'أبيض', 'رمادي'];
    const size = sizes[idx % sizes.length];
    const color = colors[idx % colors.length];
    return {
      id: `var-${model.id}-${idx + 1}`,
      size,
      color,
      sku: `${model.code}-${color === 'كحلي' ? 'NVY' : color === 'أحمر' ? 'RED' : 'WHT'}-${size}`,
      barcode: `6221${Math.floor(100000 + idx * 1111)}`,
      wholesale_price: model.wholesale_price,
      retail_price: model.retail_price,
    };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`بطاقة المواصفات الفنية وشجرة المكونات (BOM) — ${model.name}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Model Snapshot Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#7F1625]/10 text-[#7F1625] border border-[#7F1625]/20 flex items-center justify-center font-bold text-lg font-mono">
              {model.code.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                  {model.code}
                </span>
                <Badge variant="success">نشط بالكتالوج</Badge>
              </div>
              <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50 mt-1">{model.name}</h4>
              <p className="text-xs text-zinc-500">
                {model.category} • {model.season}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-zinc-500 block">التكلفة المعيارية</span>
              <strong className="text-zinc-950 dark:text-zinc-100 text-sm">{model.target_cost} ج.م</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">سعر الجملة</span>
              <strong className="text-zinc-950 dark:text-zinc-100 text-sm">{model.wholesale_price} ج.م</strong>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block">سعر التجزئة</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{model.retail_price} ج.م</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('bom')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'bom'
                ? 'bg-[#7F1625] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>شجرة المكونات واستهلاك الخامات (BOM)</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-[#7F1625] text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>مصفوفة المقاسات والألوان والباركود الدولي</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: BOM (Bill of Materials) */}
        {activeTab === 'bom' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  شجرة المواد المعتمدة لكل قطعة (Bill of Materials)
                </h5>
                <p className="text-xs text-zinc-500">
                  تحدد كمية الأقمشة، الخيوط، السوست، والأزرار اللازمة لإنتاج القطعة الواحدة مع نسبة الهالك
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchBoms}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingBom ? 'animate-spin' : ''}`} />}
                >
                  تحديث
                </Button>
                {!isAddingBom && (
                  <Button size="sm" onClick={() => setIsAddingBom(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                    إضافة إصدار BOM جديد
                  </Button>
                )}
              </div>
            </div>

            {/* Form for Creating New BOM */}
            {isAddingBom && (
              <form onSubmit={handleSaveBom} className="p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                  <h6 className="text-xs font-bold text-zinc-950 dark:text-zinc-100">تعريف إصدار شجرة مواد جديد</h6>
                  <button
                    type="button"
                    onClick={() => setIsAddingBom(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    إلغاء
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      اسم الإصدار / الوصف
                    </label>
                    <input
                      type="text"
                      required
                      value={bomName}
                      onChange={(e) => setBomName(e.target.value)}
                      placeholder="مثال: شجرة خامات صيف 2026 - إنتاج أساسي"
                      className="w-full text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      رقم الإصدار (Version)
                    </label>
                    <input
                      type="text"
                      required
                      value={bomVersion}
                      onChange={(e) => setBomVersion(e.target.value)}
                      placeholder="v1.0"
                      className="w-full text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">بنود ومكونات القطعة:</span>
                    <button
                      type="button"
                      onClick={handleAddBomItemRow}
                      className="text-xs text-[#7F1625] font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة خامة / مستلزم</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {bomItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs items-center">
                        <div className="col-span-4">
                          <label className="text-[10px] text-zinc-500 block">نوع المكون / الخامة</label>
                          <input
                            type="text"
                            value={item.component_type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, component_type: val } : it)));
                            }}
                            placeholder="قماش أساسي / أزرار / تكت"
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-zinc-500 block">الاستهلاك لكل قطعة</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={item.consumption_per_unit}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, consumption_per_unit: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-zinc-500 block">الوحدة</label>
                          <select
                            value={item.unit_of_measure}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_of_measure: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700"
                          >
                            <option value="meter">متر (m)</option>
                            <option value="kg">كيلوجرام (kg)</option>
                            <option value="piece">قطعة (pcs)</option>
                            <option value="yard">ياردة (yd)</option>
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-zinc-500 block">سماحية الهالك %</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.waste_tolerance_percent}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, waste_tolerance_percent: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingBom(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSubmittingBom}>
                    حفظ شجرة المكونات
                  </Button>
                </div>
              </form>
            )}

            {/* Existing BOMs Display */}
            {boms.length === 0 ? (
              <Card className="p-8 text-center text-zinc-400 border-dashed">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">لا توجد شجرة مكونات مسجلة لهذا الموديل بعد.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  يمكنك تعريف شجرة المكونات لربط استهلاك الأقمشة بحسابات التكلفة وأوامر التشغيل.
                </p>
                {!isAddingBom && (
                  <Button size="sm" className="mt-3" onClick={() => setIsAddingBom(true)}>
                    تعريف BOM الآن
                  </Button>
                )}
              </Card>
            ) : (
              boms.map((bom: any) => (
                <Card key={bom.id} className="p-4 border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                        {bom.version || 'v1.0'}
                      </span>
                      <h6 className="text-xs font-bold text-zinc-950 dark:text-zinc-100">{bom.name || 'شجرة المكونات القياسية'}</h6>
                      {bom.is_active ? (
                        <Badge variant="success">معتمد للإنتاج</Badge>
                      ) : (
                        <Badge variant="warning">مسودة قيد المراجعة</Badge>
                      )}
                    </div>

                    {!bom.is_active && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveBom(bom.id)}
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        اعتماد الـ BOM للإنتاج
                      </Button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                        <tr>
                          <th className="py-2 px-3">المكون والخامة</th>
                          <th className="py-2 px-3">نوع المكون</th>
                          <th className="py-2 px-3">الاستهلاك لكل قطعة</th>
                          <th className="py-2 px-3">الوحدة</th>
                          <th className="py-2 px-3">سماحية الهالك</th>
                          <th className="py-2 px-3">تكلفة الوحدة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
                        {(bom.items || []).map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-sans font-medium text-zinc-900 dark:text-zinc-100">
                              {it.inventory_item?.name || it.component_type || 'خامة أساسية'}
                            </td>
                            <td className="py-2 px-3 font-sans text-zinc-500">{it.component_type}</td>
                            <td className="py-2 px-3 font-bold text-zinc-950 dark:text-zinc-50">
                              {Number(it.consumption_per_unit)}
                            </td>
                            <td className="py-2 px-3 font-sans text-zinc-500">{it.unit_of_measure || 'متر'}</td>
                            <td className="py-2 px-3 text-amber-600 font-semibold">
                              {Number(it.waste_tolerance_percent || 0)}%
                            </td>
                            <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                              {Number(it.unit_cost || 0) > 0 ? `${Number(it.unit_cost).toFixed(2)} ج.م` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* TAB 2: Variant Matrix & International Barcodes */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  مصفوفة المقاسات والألوان وتوليد الباركود الدولي
                </h5>
                <p className="text-xs text-zinc-500">
                  توليد تلقائي للأكواد المعيارية SKU والباركود العالمي EAN-13 لكل متغير للطباعة على تيكيت الملابس
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                طباعة بطاقات الباركود
              </Button>
            </div>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-700">
                  <tr>
                    <th className="py-3 px-4">المقاس</th>
                    <th className="py-3 px-4">اللون</th>
                    <th className="py-3 px-4">كود التخزين (SKU)</th>
                    <th className="py-3 px-4">الباركود الدولي (EAN-13)</th>
                    <th className="py-3 px-4">سعر الجملة</th>
                    <th className="py-3 px-4">سعر التجزئة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium">
                  {generatedVariants.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-950 dark:text-zinc-100">{v.size}</td>
                      <td className="py-3 px-4">{v.color}</td>
                      <td className="py-3 px-4 font-mono text-[#7F1625] dark:text-rose-400 font-bold">{v.sku}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          <Barcode className="w-4 h-4 text-zinc-400" />
                          <span>{v.barcode}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-400">{v.wholesale_price} ج.م</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {v.retail_price} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
};

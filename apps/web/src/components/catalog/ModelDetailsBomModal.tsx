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
  isAr?: boolean;
}

export const ModelDetailsBomModal: React.FC<ModelDetailsBomModalProps> = ({
  isOpen,
  onClose,
  model,
  inventoryItems = [],
  isAr = true,
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
  const [actualVariants, setActualVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Fetch BOM for this model when opened
  useEffect(() => {
    if (isOpen && model?.id) {
      setBomName(isAr ? `شجرة مكونات ${model.name}` : `BOM for ${model.name}`);
      fetchBoms();
      setIsLoadingVariants(true);
      api.models.getModel(model.id)
        .then((response) => {
          const variants = response?.model?.variants;
          setActualVariants(Array.isArray(variants) ? variants : []);
        })
        .catch((error) => {
          setActualVariants([]);
          setErrorMsg(error?.message || (isAr ? 'تعذر تحميل متغيرات الموديل' : 'Failed to load model variants'));
        })
        .finally(() => setIsLoadingVariants(false));
    }
  }, [isOpen, model, isAr]);

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
      setSuccessMsg(isAr ? 'تم اعتماد شجرة المكونات والـ BOM رسميًا للإنتاج!' : 'BOM officially approved for production!');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchBoms();
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل اعتماد شجرة المكونات' : 'Failed to approve BOM'));
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
      setErrorMsg(isAr ? 'يجب إضافة مكون واحد على الأقل باستهلاك سليم.' : 'At least one component with valid consumption is required.');
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

      setSuccessMsg(isAr ? 'تم حفظ شجرة المكونات بنجاح!' : 'BOM created successfully!');
      setIsAddingBom(false);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchBoms();
    } catch (err: any) {
      setErrorMsg(err.message || (isAr ? 'فشل حفظ شجرة المكونات' : 'Failed to save BOM'));
    } finally {
      setIsSubmittingBom(false);
    }
  };

  // Display only variants persisted by the backend; never synthesize sizes, colors, SKUs, or barcodes.
  const generatedVariants = actualVariants;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `بطاقة المواصفات الفنية وشجرة المكونات (BOM) — ${model.name}` : `Technical Specs & Bill of Materials (BOM) — ${model.name}`}
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Model Snapshot Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] border border-[var(--brand-border)] flex items-center justify-center font-bold text-lg font-mono">
              {model.code.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                  {model.code}
                </span>
                <Badge variant="success">{isAr ? 'نشط بالكتالوج' : 'Catalog Active'}</Badge>
              </div>
              <h4 className="text-base font-bold text-slate-950 dark:text-slate-50 mt-1">{model.name}</h4>
              <p className="text-xs text-slate-500">
                {model.category} • {model.season}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'التكلفة المعيارية' : 'Standard Cost'}</span>
              <strong className="text-slate-950 dark:text-slate-100 text-sm">{model.target_cost} {isAr ? 'ج.م' : 'EGP'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'سعر الجملة' : 'Wholesale Price'}</span>
              <strong className="text-slate-950 dark:text-slate-100 text-sm">{model.wholesale_price} {isAr ? 'ج.م' : 'EGP'}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block">{isAr ? 'سعر التجزئة' : 'Retail Price'}</span>
              <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{model.retail_price} {isAr ? 'ج.م' : 'EGP'}</strong>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('bom')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'bom'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isAr ? 'شجرة المكونات واستهلاك الخامات (BOM)' : 'Bill of Materials (BOM)'}</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>{isAr ? 'مصفوفة المقاسات والألوان والباركود الدولي' : 'Variant Matrix & Barcodes'}</span>
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
                  {isAr ? 'شجرة المواد المعتمدة لكل قطعة (Bill of Materials)' : 'Approved Bill of Materials (BOM) per Piece'}
                </h5>
                <p className="text-xs text-zinc-500">
                  {isAr
                    ? 'تحدد كمية الأقمشة، الخيوط، السوست، والأزرار اللازمة لإنتاج القطعة الواحدة مع نسبة الهالك'
                    : 'Defines fabrics, threads, zippers, and trims consumption per garment unit including scrap tolerance'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchBoms}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingBom ? 'animate-spin' : ''}`} />}
                >
                  {isAr ? 'تحديث' : 'Refresh'}
                </Button>
                {!isAddingBom && (
                  <Button size="sm" onClick={() => setIsAddingBom(true)} icon={<Plus className="w-3.5 h-3.5" />}>
                    {isAr ? 'إضافة إصدار BOM جديد' : 'New BOM Version'}
                  </Button>
                )}
              </div>
            </div>

            {/* Form for Creating New BOM */}
            {isAddingBom && (
              <form onSubmit={handleSaveBom} className="p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <h6 className="text-xs font-bold text-slate-950 dark:text-slate-100">
                    {isAr ? 'تعريف إصدار شجرة مواد جديد' : 'Define New BOM Version'}
                  </h6>
                  <button
                    type="button"
                    onClick={() => setIsAddingBom(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {isAr ? 'اسم الإصدار / الوصف' : 'Version Name / Description'}
                    </label>
                    <input
                      type="text"
                      required
                      value={bomName}
                      onChange={(e) => setBomName(e.target.value)}
                      placeholder={isAr ? 'مثال: شجرة خامات صيف 2026 - إنتاج أساسي' : 'e.g. Summer 2026 Main BOM'}
                      className="w-full text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      {isAr ? 'رقم الإصدار (Version)' : 'Version Number'}
                    </label>
                    <input
                      type="text"
                      required
                      value={bomVersion}
                      onChange={(e) => setBomVersion(e.target.value)}
                      placeholder="v1.0"
                      className="w-full text-xs p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {isAr ? 'بنود ومكونات القطعة:' : 'Components & Consumption:'}
                    </span>
                    <button
                      type="button"
                      onClick={handleAddBomItemRow}
                      className="text-xs text-[var(--brand-primary)] font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إضافة خامة / مستلزم' : 'Add Component'}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {bomItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs items-center">
                        <div className="col-span-4">
                          <label className="text-[10px] text-zinc-500 block">{isAr ? 'نوع المكون / الخامة' : 'Component Type / Item'}</label>
                          <input
                            type="text"
                            value={item.component_type}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, component_type: val } : it)));
                            }}
                            placeholder={isAr ? 'قماش أساسي / أزرار / تكت' : 'Main fabric / Buttons / Label'}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-zinc-500 block">{isAr ? 'الاستهلاك لكل قطعة' : 'Unit Consumption'}</label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={item.consumption_per_unit}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, consumption_per_unit: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-slate-900 dark:text-slate-100"
                          />
                        </div>

                        <div className="col-span-2">
                          <label className="text-[10px] text-zinc-500 block">{isAr ? 'الوحدة' : 'Unit'}</label>
                          <select
                            value={item.unit_of_measure}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_of_measure: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-slate-900 dark:text-slate-100"
                          >
                            <option value="meter">{isAr ? 'متر (m)' : 'meter (m)'}</option>
                            <option value="kg">{isAr ? 'كيلوجرام (kg)' : 'kilogram (kg)'}</option>
                            <option value="piece">{isAr ? 'قطعة (pcs)' : 'piece (pcs)'}</option>
                            <option value="yard">{isAr ? 'ياردة (yd)' : 'yard (yd)'}</option>
                          </select>
                        </div>

                        <div className="col-span-3">
                          <label className="text-[10px] text-zinc-500 block">{isAr ? 'سماحية الهالك %' : 'Waste Tolerance %'}</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={item.waste_tolerance_percent}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setBomItems((prev) => prev.map((it, i) => (i === idx ? { ...it, waste_tolerance_percent: val } : it)));
                            }}
                            className="w-full text-xs p-1.5 rounded bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 font-mono text-slate-900 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddingBom(false)}>
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button type="submit" size="sm" isLoading={isSubmittingBom}>
                    {isAr ? 'حفظ شجرة المكونات' : 'Save BOM'}
                  </Button>
                </div>
              </form>
            )}

            {/* Existing BOMs Display */}
            {boms.length === 0 ? (
              <Card className="p-8 text-center text-slate-400 border-dashed">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs">{isAr ? 'لا توجد شجرة مكونات مسجلة لهذا الموديل بعد.' : 'No BOM registered for this model yet.'}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isAr
                    ? 'يمكنك تعريف شجرة المكونات لربط استهلاك الأقمشة بحسابات التكلفة وأوامر التشغيل.'
                    : 'You can define a BOM to connect fabric consumption with costing and production orders.'}
                </p>
                {!isAddingBom && (
                  <Button size="sm" className="mt-3" onClick={() => setIsAddingBom(true)}>
                    {isAr ? 'تعريف BOM الآن' : 'Define BOM Now'}
                  </Button>
                )}
              </Card>
            ) : (
              boms.map((bom: any) => (
                <Card key={bom.id} className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {bom.version || 'v1.0'}
                      </span>
                      <h6 className="text-xs font-bold text-slate-950 dark:text-slate-100">{bom.name || (isAr ? 'شجرة المكونات القياسية' : 'Standard BOM')}</h6>
                      {bom.is_active ? (
                        <Badge variant="success">{isAr ? 'معتمد للإنتاج' : 'Production Approved'}</Badge>
                      ) : (
                        <Badge variant="warning">{isAr ? 'مسودة قيد المراجعة' : 'Draft Under Review'}</Badge>
                      )}
                    </div>

                    {!bom.is_active && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveBom(bom.id)}
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        {isAr ? 'اعتماد الـ BOM للإنتاج' : 'Approve BOM'}
                      </Button>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2 px-3">{isAr ? 'المكون والخامة' : 'Component / Item'}</th>
                          <th className="py-2 px-3">{isAr ? 'نوع المكون' : 'Type'}</th>
                          <th className="py-2 px-3">{isAr ? 'الاستهلاك لكل قطعة' : 'Unit Consumption'}</th>
                          <th className="py-2 px-3">{isAr ? 'الوحدة' : 'Unit'}</th>
                          <th className="py-2 px-3">{isAr ? 'سماحية الهالك' : 'Waste Tolerance'}</th>
                          <th className="py-2 px-3">{isAr ? 'تكلفة الوحدة' : 'Unit Cost'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {(bom.items || []).map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-sans font-medium text-slate-900 dark:text-slate-100">
                              {it.inventory_item?.name || it.component_type || (isAr ? 'خامة أساسية' : 'Main Material')}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-500">{it.component_type}</td>
                            <td className="py-2 px-3 font-bold text-slate-950 dark:text-slate-50">
                              {Number(it.consumption_per_unit)}
                            </td>
                            <td className="py-2 px-3 font-sans text-slate-500">{it.unit_of_measure || (isAr ? 'متر' : 'm')}</td>
                            <td className="py-2 px-3 text-amber-600 font-semibold">
                              {Number(it.waste_tolerance_percent || 0)}%
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              {Number(it.unit_cost || 0) > 0 ? `${Number(it.unit_cost).toFixed(2)} ${isAr ? 'ج.م' : 'EGP'}` : '—'}
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
                <h5 className="text-sm font-bold text-slate-950 dark:text-slate-100">
                  {isAr ? 'مصفوفة المقاسات والألوان وتوليد الباركود الدولي' : 'Variant Matrix & International Barcodes'}
                </h5>
                <p className="text-xs text-slate-500">
                  {isAr
                    ? 'توليد تلقائي للأكواد المعيارية SKU والباركود العالمي EAN-13 لكل متغير للطباعة على تيكيت الملابس'
                    : 'Automatic generation of SKU standard codes and international EAN-13 barcodes for garment hangtags'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                {isAr ? 'طباعة بطاقات الباركود' : 'Print Barcode Labels'}
              </Button>
            </div>

            <div className="printable-sheet overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className={`w-full text-xs ${isAr ? 'text-right' : 'text-left'}`}>
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'المقاس' : 'Size'}</th>
                    <th className="py-3 px-4">{isAr ? 'اللون' : 'Color'}</th>
                    <th className="py-3 px-4">{isAr ? 'كود التخزين (SKU)' : 'SKU'}</th>
                    <th className="py-3 px-4">{isAr ? 'الباركود الدولي (EAN-13)' : 'Barcode (EAN-13)'}</th>
                    <th className="py-3 px-4">{isAr ? 'سعر الجملة' : 'Wholesale Price'}</th>
                    <th className="py-3 px-4">{isAr ? 'سعر التجزئة' : 'Retail Price'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {isLoadingVariants ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">{isAr ? 'جارٍ تحميل المتغيرات...' : 'Loading variants...'}</td></tr>
                  ) : generatedVariants.length === 0 ? (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">{isAr ? 'لا توجد متغيرات مسجلة لهذا الموديل.' : 'No persisted variants are registered for this model.'}</td></tr>
                  ) : generatedVariants.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-950 dark:text-slate-100">{v.size}</td>
                      <td className="py-3 px-4">{v.color}</td>
                      <td className="py-3 px-4 font-mono text-[var(--brand-primary)] dark:text-rose-400 font-bold">{v.sku}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                          <Barcode className="w-4 h-4 text-slate-400" />
                          <span>{v.barcode}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{v.wholesale_price} {isAr ? 'ج.م' : 'EGP'}</td>
                      <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {v.retail_price} {isAr ? 'ج.م' : 'EGP'}
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
            {isAr ? 'إغلاق' : 'Close'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

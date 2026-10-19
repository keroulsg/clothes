import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Calculator, ArrowRightLeft, Info, CheckCircle2 } from 'lucide-react';
import type { FabricConversionResult } from '../../types';

interface FabricCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FabricCalculatorModal: React.FC<FabricCalculatorModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'meters_to_kg' | 'kg_to_meters'>('meters_to_kg');
  const [inputValue, setInputValue] = useState<number>(500);
  const [usableWidth, setUsableWidth] = useState<number>(1.6); // 160 cm = 1.6 m
  const [gsm, setGsm] = useState<number>(180); // 180 g/m2
  const [result, setResult] = useState<FabricConversionResult | null>(null);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue <= 0 || usableWidth <= 0 || gsm <= 0) return;

    const linearWeightGrams = usableWidth * gsm;

    if (mode === 'meters_to_kg') {
      const weightKg = (inputValue * usableWidth * gsm) / 1000;
      setResult({
        meters: inputValue,
        usable_width_meters: usableWidth,
        gsm: gsm,
        linear_weight_grams_per_meter: Math.round(linearWeightGrams * 100) / 100,
        calculated_weight_kg: Math.round(weightKg * 100) / 100,
        formula: 'الوزن (كجم) = الطول (متر) × عرض القماش الصالح (متر) × (GSM / 1000)',
        technical_note: 'تم احتساب الوزن الصافي بناءً على العرض الصالح للقص (1.60 م) بعد استبعاد البراسل (Selvedges). في حال الأقمشة الدائرية المفتوحة أو المقفولة يجب مطابقة العرض الفعلي للفرش.',
      });
    } else {
      const meters = (inputValue * 1000) / (usableWidth * gsm);
      setResult({
        weight_kg: inputValue,
        usable_width_meters: usableWidth,
        gsm: gsm,
        linear_weight_grams_per_meter: Math.round(linearWeightGrams * 100) / 100,
        calculated_meters: Math.round(meters * 100) / 100,
        formula: 'الطول (متر) = (الوزن بالكجم × 1000) / (عرض القماش الصالح بالمتر × GSM)',
        technical_note: 'هذا الطول يمثل الأمتار النظرية الناتجة. في صالة القص يلزم تطبيق سماحية راحة القماش (Relaxation) لتفادي قصر الباترون بعد القص.',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="حاسبة تحويل الأقمشة المعيارية (متر ↔ كجم)" maxWidth="lg">
      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Toggle Mode */}
        <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700">
          <button
            type="button"
            onClick={() => { setMode('meters_to_kg'); setResult(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'meters_to_kg'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            تحويل من أمتار إلى كيلوجرامات
          </button>
          <button
            type="button"
            onClick={() => { setMode('kg_to_meters'); setResult(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'kg_to_meters'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            تحويل من كيلوجرامات إلى أمتار
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {mode === 'meters_to_kg' ? 'الكمية بالأمتار (م)' : 'الوزن بالكيلوجرام (كجم)'}
            </label>
            <input
              type="number"
              step="any"
              required
              value={inputValue}
              onChange={(e) => setInputValue(parseFloat(e.target.value) || 0)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              عرض القماش الصالح للقص (متر)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={usableWidth}
              onChange={(e) => setUsableWidth(parseFloat(e.target.value) || 0)}
              placeholder="مثال: 1.6 (يعادل 160 سم)"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block">160 سم = 1.60 م</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              كثافة النسيج GSM (جم/م²)
            </label>
            <input
              type="number"
              step="any"
              required
              value={gsm}
              onChange={(e) => setGsm(parseFloat(e.target.value) || 0)}
              placeholder="مثال: 180"
              className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block">وزن المتر المربع</span>
          </div>
        </div>

        <Button type="submit" size="sm" icon={<Calculator className="w-3.5 h-3.5" />} className="w-full">
          احتساب النتيجة الهندسية
        </Button>

        {/* Output card */}
        {result && (
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">الناتج المحسوب بدقة:</span>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {mode === 'meters_to_kg'
                  ? `${result.calculated_weight_kg?.toLocaleString()} كجم`
                  : `${result.calculated_meters?.toLocaleString()} متر`}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div>
                الوزن الطولي للمتر: <strong className="font-mono text-brand-primary dark:text-rose-400">{result.linear_weight_grams_per_meter} جم/م</strong>
              </div>
              <div>
                المعادلة المطبقة: <span className="font-mono text-slate-600 dark:text-slate-400 text-[10px]">{result.formula}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-200/60 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>{result.technical_note}</span>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};

import React, { useRef, useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Printer, Copy, Check } from 'lucide-react';
import { api } from '../../api/client';
import type { InventoryItem } from '../../types';

interface ItemBarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  tenantName?: string;
  isAr?: boolean;
}

export const ItemBarcodeLabelModal: React.FC<ItemBarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  item,
  tenantName = 'GarmentOS Cloud',
  isAr = true,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [labelData, setLabelData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [labelFormat, setLabelFormat] = useState<'thermal_50x25' | 'thermal_80x50'>('thermal_80x50');

  useEffect(() => {
    if (isOpen && item) {
      setIsLoading(true);
      api.inventory.getItemLabel(item.id)
        .then((res) => {
          if (res.label) setLabelData(res.label);
        })
        .catch(() => {
          // Fallback to local item properties
          setLabelData({
            item_id: item.id,
            company_name: tenantName,
            item_code: item.code,
            item_name: item.name,
            item_type: item.item_type,
            unit_of_measure: item.unit_of_measure,
            current_balance: item.current_balance,
            storage_zone: item.storage_zone || 'المنطقة الرئيسية',
            rack_location: item.rack_location || 'R-01',
            shelf_bin_location: item.shelf_bin_location || 'BIN-01',
            warehouse_name: item.warehouse_name || 'المخزن الرئيسي',
            barcode_value: item.code,
            generated_at: new Date().toISOString(),
          });
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, item, tenantName]);

  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyCode = () => {
    const val = labelData?.barcode_value || item.code;
    navigator.clipboard.writeText(val);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const barcodeVal = labelData?.barcode_value || item.code;
  const zone = labelData?.storage_zone || item.storage_zone || 'منطقة أ';
  const rack = labelData?.rack_location || item.rack_location || 'R-01';
  const bin = labelData?.shelf_bin_location || item.shelf_bin_location || 'BIN-01';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'طباعة باركود الرف وبطاقة الصنف (Thermal Label)' : 'Print Shelf Barcode & Item Label'}
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Label Format Selector */}
        <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {isAr ? 'مقاس ملصق الطابعة الحرارية:' : 'Label Format:'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLabelFormat('thermal_80x50')}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold ${
                labelFormat === 'thermal_80x50'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isAr ? '80 × 50 mm (قياسي)' : '80 × 50 mm (Standard)'}
            </button>
            <button
              type="button"
              onClick={() => setLabelFormat('thermal_50x25')}
              className={`py-1 px-2.5 rounded-lg text-xs font-semibold ${
                labelFormat === 'thermal_50x25'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              {isAr ? '50 × 25 mm (صغير)' : '50 × 25 mm (Compact)'}
            </button>
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="flex justify-center p-4 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <div
            ref={printRef}
            id="printable-barcode-label"
            className={`printable-voucher bg-white text-black p-3 rounded-lg border-2 border-dashed border-slate-400 shadow-md flex flex-col justify-between font-sans ${
              labelFormat === 'thermal_80x50' ? 'w-[320px] min-h-[200px]' : 'w-[250px] min-h-[140px]'
            }`}
            style={{ color: '#000000', backgroundColor: '#ffffff' }}
          >
            {/* Header */}
            <div className="border-b border-black/40 pb-1.5 mb-1.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold block uppercase tracking-wider">{tenantName}</span>
                <span className="text-[9px] text-gray-700">{labelData?.warehouse_name || item.warehouse_name || 'Warehouse'}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono bg-black text-white px-1.5 py-0.5 rounded font-bold">
                  {rack} / {bin}
                </span>
              </div>
            </div>

            {/* Item Name & Code */}
            <div className="space-y-0.5">
              <h4 className="font-bold text-xs leading-tight line-clamp-2">{item.name}</h4>
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono font-bold text-black">{item.code}</span>
                <span className="text-gray-800 font-medium">
                  {item.unit_of_measure} ({item.current_balance})
                </span>
              </div>
            </div>

            {/* Barcode Visual Simulation */}
            <div className="my-2 py-1 flex flex-col items-center justify-center bg-gray-50 border border-black/10 rounded">
              {/* Simulated 1D Barcode stripes */}
              <div className="flex items-end h-8 gap-[1.5px] px-2 w-full justify-center overflow-hidden">
                {barcodeVal.split('').map((char: string, idx: number) => {
                  const codeNum = char.charCodeAt(0);
                  const isFat = (codeNum + idx) % 2 === 0;
                  const isTall = (codeNum + idx) % 3 === 0;
                  return (
                    <div
                      key={idx}
                      className={`bg-black shrink-0 ${isFat ? 'w-[3px]' : 'w-[1.5px]'} ${isTall ? 'h-8' : 'h-6'}`}
                    />
                  );
                })}
              </div>
              <span className="font-mono font-bold text-[10px] tracking-widest mt-0.5">{barcodeVal}</span>
            </div>

            {/* Storage Coordinates Footer */}
            <div className="pt-1 border-t border-black/40 flex items-center justify-between text-[9px] font-semibold text-gray-800">
              <span>Zone: {zone}</span>
              <span>Rack: {rack}</span>
              <span>Shelf: {bin}</span>
            </div>
          </div>
        </div>

        {/* Print Stylesheet injection for print isolation */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-barcode-label, #printable-barcode-label * {
                visibility: visible !important;
              }
              #printable-barcode-label {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 80mm !important;
                margin: 0 !important;
                padding: 4mm !important;
                border: none !important;
                box-shadow: none !important;
              }
            }
          `
        }} />

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyCode}
            icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {copied ? (isAr ? 'تم نسخ الكود' : 'Copied!') : (isAr ? 'نسخ كود الباركود' : 'Copy Barcode')}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              {isAr ? 'إغلاق' : 'Close'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              disabled={isLoading}
              icon={<Printer className="w-3.5 h-3.5" />}
            >
              {isLoading ? (isAr ? 'جارِ التحميل...' : 'Loading...') : (isAr ? 'طباعة الملصق الحراري' : 'Print Thermal Label')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

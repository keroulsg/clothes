import React from 'react';
import { Printer, ShoppingBag, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { ProductItem } from './ProductsManager';

interface ProductPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  isAr?: boolean;
}

export const ProductPrintModal: React.FC<ProductPrintModalProps> = ({
  isOpen,
  onClose,
  product,
  isAr = true,
}) => {
  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  const storedTenant = api.auth.getStoredTenant();
  const factoryName =
    storedTenant?.name ||
    (isAr ? 'مصنع الملابس الجاهزة' : 'Garment Manufacturing Facility');

  const currentDate = new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const currentTime = new Date().toLocaleTimeString(isAr ? 'ar-EG' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const sellingPrice = Number(product.selling_price) || 0;
  const posPrice = Number(product.pos_price || product.selling_price) || 0;
  const wholesalePrice = Number(product.wholesale_price) || 0;
  const baseCost = Number(product.base_cost) || 0;
  const grossMargin = sellingPrice > 0 && baseCost > 0 ? sellingPrice - baseCost : 0;
  const marginPercent = sellingPrice > 0 && baseCost > 0 ? Math.round((grossMargin / sellingPrice) * 100) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? `طباعة بطاقة المنتج: ${product.name}` : `Print Product Sheet: ${product.name}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Scoped Print CSS */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #product-print-sheet, #product-print-sheet * {
              visibility: visible;
            }
            #product-print-sheet {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 24px;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              z-index: 999999;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Printable Product Sheet */}
        <div
          id="product-print-sheet"
          className="p-6 bg-white rounded-2xl border border-slate-200 text-slate-800 space-y-6 text-sm"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{factoryName}</h1>
                <p className="text-xs text-slate-500 font-sans">
                  {isAr ? 'نظام GarmentOS لإدارة مصانع وكتالوجات الملابس' : 'GarmentOS Cloud Omnichannel Catalog'}
                </p>
              </div>
            </div>

            <div className="text-left font-mono text-xs text-slate-500">
              <div>{currentDate}</div>
              <div className="text-[11px] text-slate-400">{currentTime}</div>
              <div className="mt-1 inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">
                DOC-PRD-{product.id.slice(0, 8).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Product Overview: Image & Titles */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-40 h-40 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
              {product.main_image ? (
                <img
                  src={product.main_image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <ShoppingBag className="w-8 h-8 mb-1" />
                  <span className="text-[11px]">{isAr ? 'بدون صورة' : 'No Image'}</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {product.category?.name_ar || (isAr ? 'عام' : 'General')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  product.status === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {product.status === 'active' ? (isAr ? 'نشط في المتجر' : 'Active') : (isAr ? 'مسودة داخلية' : 'Draft')}
                </span>
                {product.is_pos_available && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                    {isAr ? 'متاح بالمعرض (POS)' : 'POS Available'}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
              {product.name_en && (
                <p className="text-sm text-slate-500 font-sans">{product.name_en}</p>
              )}

              <div className="text-xs font-mono text-slate-600 pt-1">
                <span className="text-slate-400">{isAr ? 'كود الرابط (Slug): ' : 'Slug: '}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">/{product.slug}</span>
              </div>

              {product.garment_model && (
                <div className="flex items-center gap-2 pt-2 text-xs text-blue-800">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{isAr ? 'موديل التشغيل المرتبط:' : 'Linked BOM Model:'}</span>
                  <span>{product.garment_model.name}</span>
                  <span className="font-mono bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                    {product.garment_model.code}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Architecture Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isAr ? 'هيكل التسعير التجاري المعتمد' : 'Commercial Pricing Breakdown'}
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="py-2.5 px-3">{isAr ? 'سعر المتجر أونلاين' : 'Storefront Price'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'سعر كاونتر المعرض (POS)' : 'POS Counter Price'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'سعر بيع الجملة' : 'Wholesale Price'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'تكلفة الإنتاج التقديرية' : 'Base Cost'}</th>
                    <th className="py-2.5 px-3">{isAr ? 'هامش الربح المتوقع' : 'Estimated Margin'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                      {sellingPrice.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-purple-700">
                      {posPrice.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {wholesalePrice > 0 ? `${wholesalePrice.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      {baseCost > 0 ? `${baseCost.toLocaleString()} ${isAr ? 'ج.م' : 'EGP'}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">
                      {grossMargin > 0 ? `+${grossMargin.toLocaleString()} (${marginPercent}%)` : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Description & Specifications */}
          {product.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {isAr ? 'وصف المنتج وتفاصيل الخامة' : 'Description & Composition'}
              </h3>
              <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Barcode & Verification Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-3 py-1 rounded text-slate-800 tracking-widest text-sm font-bold border">
                * {product.slug.toUpperCase()} *
              </span>
            </div>

            <div className="text-center sm:text-left text-[11px] text-slate-400">
              <span>{isAr ? 'مستند رسمي معتمد من نظام GarmentOS Cloud' : 'Official GarmentOS Cloud Specification Sheet'}</span>
            </div>
          </div>
        </div>

        {/* Modal Buttons (Hidden on Print) */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 no-print">
          <Button variant="ghost" onClick={onClose}>
            {isAr ? 'إلغاء' : 'Close'}
          </Button>

          <Button
            variant="primary"
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 ml-1" />
            {isAr ? 'طباعة المستند الفوري' : 'Print Document'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

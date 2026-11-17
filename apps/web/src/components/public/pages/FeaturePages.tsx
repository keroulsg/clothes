import React from 'react';
import {
  Scissors,
  Layers,
  Calculator,
  Boxes,
  Receipt,
  Users,
  Store,
  ShieldCheck,
  Palette,
  Truck,
  CreditCard,
} from 'lucide-react';
import type { Language } from '../../../types';

interface FeaturePageProps {
  lang: Language;
  onNavigate?: (page: string) => void;
  onOpenRegister?: (tier?: 'starter' | 'professional' | 'enterprise') => void;
}

export const ManufacturingPage: React.FC<FeaturePageProps> = ({ lang, onOpenRegister }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--brand-border)] bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#f87171] text-xs font-bold font-sans">
          <Scissors className="w-4 h-4" />
          <span>{isAr ? 'الوحدة الصناعية رقم 1' : 'Industrial Core Module'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'هندسة صالة القص وتخطيط الفرش الذكي' : 'Cutting Floor Engineering & Marker Planning'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'التحكم الهندسي الدقيق في استهلاك الأقمشة، حساب كفاءة التعشيق (Marker Efficiency %)، عدد الطبقات والراقات (Plies)، والتحكم الصارم في نسب الهالك المسموح بها مع توليد بطاقات الحزم بالباركود الذكي.'
            : 'Optimize marker yield, streamline multi-ply cutting lays, enforce waste thresholds, and generate smart QR barcode bundle tags.'}
        </p>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#f87171] flex items-center justify-center font-bold">
            1
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'تخطيط الفرش وحساب الأمتار' : 'Lay Planning & Meter Allocation'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'تحديد طول الفرشة بالسنتيمتر، عدد الراقات، الأمتار المصروفة من المخزن، وحساب عوادم الأطراف (Ends Loss) لمنع الهدر قبل تحريك المقص.'
              : 'Calculate lay length, plies, total issued meters, and end waste tolerances before cutting starts.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            2
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'توليد باركود حزم الإنتاج (Smart Bundles)' : 'Smart Barcode Bundle Tagging'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'طباعة أوتوماتيكية لتذاكر الحزم المرقمة تسلسلياً (Bundle Tickets) مع الباركود وتفاصيل المقاس واللون لربطها مباشرة بخطوط الخياطة والتشطيب.'
              : 'Automated generation of serialized bundle tickets with barcodes, sizes, and colors directly mapped to sewing lines.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            3
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'محطة فحص وتدقيق الجودة (QC Hub)' : 'Quality Inspection & Scrap Gate'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'تسجيل دقيق للقطع السليمة، المعاد تشغيلها (Rework)، والمرفوضة (Scrap)، مع تقييد ترحيل أي حزمة للمخزن إلا بعد اعتماد الفاحص.'
              : 'Strict tracking of passed, reworked, and scrap pieces. No bundle advances without authorized QC sign-off.'}
          </p>
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-8 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] via-[#65101c] to-black text-white text-center space-y-4">
        <h3 className="text-xl font-black font-sans">
          {isAr ? 'وفر حتى 12% من تكلفة القماش عبر ضبط صالة القص' : 'Save up to 12% on raw fabric costs with optimized cutting'}
        </h3>
        <p className="text-xs text-slate-200 max-w-xl mx-auto">
          {isAr
            ? 'جرب منظومة صالة القص والفرش مجاناً لمدة 14 يوماً مع بيانات حية متوافقة مع مصنعك.'
            : 'Test our cutting and lay planning engine free for 14 days with live factory-ready models.'}
        </p>
        <button
          onClick={() => onOpenRegister?.('professional')}
          className="px-6 py-2.5 rounded-xl bg-white text-[var(--brand-primary)] font-black text-xs hover:bg-slate-100 transition-all cursor-pointer shadow-md"
        >
          {isAr ? 'بدء التجربة لصالة القص' : 'Start Cutting Trial'}
        </button>
      </div>
    </div>
  );
};

export const InventoryPage: React.FC<FeaturePageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold font-sans">
          <Layers className="w-4 h-4" />
          <span>{isAr ? 'إدارة الخامات والمخازن' : 'Fabric Stock & Inventory'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'مخازن الأقمشة الذكية وحاسبة الـ GSM' : 'Fabric Inventory & Smart GSM Engine'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'تتبع أثواب القماش بالرقم واللوت (Roll & Lot Numbers)، تحويل هندسي دقيق بين الأمتار والأوزان، دفتر أستاذ مخزني غير قابل للتعديل (Audit Ledger)، ومطابقة ثلاثية لفواتير الموردين.'
            : 'Manage fabric rolls, lots, shrinkage, unit conversions between meters and kilograms, and immutable stock audit ledgers.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Calculator className="w-8 h-8 text-[var(--brand-primary)] dark:text-[#f87171]" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'حاسبة الـ GSM واستهلاك الأثواب' : 'Fabric GSM & Roll Calculator'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'حساب الأمتار الفعلية لكل كيلوجرام وفقاً لوزن المتر المربع وعرض القماش، مما يمنع العجز الخفي بين الكمية المشتراة بالكيلو والكمية المقصوصة بالمتر.'
              : 'Instant conversion between kilograms and linear meters based on GSM and fabric width to eliminate hidden shortages.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isAr ? 'دفتر الأستاذ المخزني غير القابل للتعديل' : 'Immutable Stock Audit Ledger'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'تسجيل كل حركة صرف أو إضافة مع إثبات الرصيد السابق واللاحق والمستند المرجعي واسم المستخدم لمنع أي تلاعب أو شطب في رصيد الخامات.'
              : 'Every movement records before/after balance, reference document, and user signature with zero retroactive alterations.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const SubcontractingPage: React.FC<FeaturePageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold font-sans">
          <Boxes className="w-4 h-4" />
          <span>{isAr ? 'عقود التشغيل للغير' : 'CMT Subcontracting'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'خدمات القص والتصنيع للغير (CMT) وعزل الأمانات' : 'CMT Subcontracting & Customer Material Custody'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'فصل قانوني ومخزني صارم بين أقمشة المصنع وأمانات العملاء، إدارة أوامر تشغيل القص والخياطة، تتبع المطابع والمطرزات الخارجية، وفواتير أجور الخدمات.'
            : 'Segregate internal fabrics from customer material custody, track external embroidery/print shops, and issue service wage invoices.'}
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          {isAr ? 'دورة عمل التشغيل للغير في GarmentOS:' : 'Complete CMT Workflow:'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] block mb-1">
              {isAr ? '1. إذن استلام أمانة' : '1. Custody Receipt'}
            </span>
            {isAr ? 'استلام قماش العميل وإصدار إيصال أمانة معزول عن مخزون المصنع.' : 'Receive customer fabric under isolated custody receipt.'}
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] block mb-1">
              {isAr ? '2. أمر تشغيل خارجي' : '2. Job Order'}
            </span>
            {isAr ? 'صرف الحزم للمطبعة أو ورشة التطريز وتتبع التسليم.' : 'Dispatch bundles to embroidery or print shops.'}
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] block mb-1">
              {isAr ? '3. إذن تسليم منجز' : '3. Delivery Note'}
            </span>
            {isAr ? 'فحص القطع وتسليم العميل إنتاجه مع توثيق التوالف.' : 'Deliver finished pieces with scrap reconciliation.'}
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-[var(--brand-primary)] dark:text-[#f87171] block mb-1">
              {isAr ? '4. فاتورة أجور خدمات' : '4. Service Invoice'}
            </span>
            {isAr ? 'إصدار فاتورة أتعاب قص وتصنيع بدون خلط أسعار القماش.' : 'Issue labor & service fee invoice without fabric cost mixing.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CostingPage: React.FC<FeaturePageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-sans">
          <Receipt className="w-4 h-4" />
          <span>{isAr ? 'التكاليف والمالية' : 'Costing & Double-Entry Accounting'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'حساب تكلفة الموديل وشجرة الحسابات المالية' : 'Production Costing & Double-Entry Financials'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'شجرة حسابات مالية مخصصة لصناعة الملابس، قيود يومية آلية متوازنة، وتحديد تكلفة القطعة الفعلية بمطابقة استهلاك الأقمشة وأجور العمال مع المصروفات العامة.'
            : 'Integrated Chart of Accounts, balanced double-entry vouchers, and actual cost-per-piece tracking.'}
        </p>
      </div>
    </div>
  );
};

export const WorkforcePage: React.FC<FeaturePageProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold font-sans">
          <Users className="w-4 h-4" />
          <span>{isAr ? 'إدارة العمال وأجور القطعة' : 'Piece-Rate Workforce & HR'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'أجور القطعة المعتمدة وتتبع باركود الحزم' : 'Piece-Rate Wages & Bundle Production Logging'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'تحديد تسعيرة كل عملية خياطة أو تشطيب لكل موديل، مسح باركود الحزم لمنع تكرار الصرف، وحساب الرواتب والإنتاجية بدقة متناهية.'
            : 'Define operation piece rates per model, scan bundle tickets to prevent duplicate claims, and approve accurate payroll runs.'}
        </p>
      </div>
    </div>
  );
};

export const StorefrontPage: React.FC<FeaturePageProps> = ({ lang, onOpenRegister }) => {
  const isAr = lang === 'ar';

  const templates = [
    {
      name: 'Modern Boutique',
      category: isAr ? 'براندات الأزياء والموضة' : 'Retail & Fashion Brands',
      desc: isAr ? 'تصميم عصري جذاب مخصص للماركات الراقية والمستهلك النهائي، مع عرض صور تفاعلي واختيار الألوان والمقاسات بسهولة.' : 'Sleek luxury design for fashion apparel and D2C brands with interactive color & size selectors.',
      color: 'border-indigo-500/30 bg-indigo-50/30 dark:bg-indigo-950/20',
      badge: 'B2C / D2C',
    },
    {
      name: 'Clean Wholesale',
      category: isAr ? 'تجارة الجملة والموزعين' : 'Wholesale & B2B Distribution',
      desc: isAr ? 'واجهة مخصصة لتجار الجملة مع إمكانية الشراء السريع بالكرتونة والدستة، وجدول المقاسات والألوان المجمعة.' : 'Engineered for bulk carton and dozen ordering with matrix bulk add-to-cart.',
      color: 'border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20',
      badge: 'B2B Wholesale',
    },
    {
      name: 'Streetwear / Activewear',
      category: isAr ? 'الملابس الرياضية والكاجوال' : 'Athleisure & Streetwear',
      desc: isAr ? 'طابع شبابي جريء وبانرات عريضة تبرز خامات الأقمشة وتفاصيل التشطيب والطباعة.' : 'High-energy layout with immersive visuals emphasizing technical fabrics and prints.',
      color: 'border-rose-500/30 bg-rose-50/30 dark:bg-rose-950/20',
      badge: 'Active & Street',
    },
    {
      name: 'Industrial & Uniform Supply',
      category: isAr ? 'الزي الموحد واليونيفورم' : 'Workwear & Institutional Uniforms',
      desc: isAr ? 'مخصص للمصانع والشركات والزي الطبي والفندقي، مع خيارات طلب كميات وتخصيص الشعارات والتطريز.' : 'Structured catalogue for institutional RFQs, corporate workwear, and medical scrubs.',
      color: 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20',
      badge: 'Corporate B2B',
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold font-sans">
          <Store className="w-4 h-4" />
          <span>{isAr ? 'منظومة المتاجر الإلكترونية المتصلة (WOOC Storefront)' : 'Integrated B2B & B2C Storefront Engine'}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'متجرك الإلكتروني مربوط لحظياً بصالة الإنتاج والمخازن' : 'Online Storefront Wired Live to Production & Inventory'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'لا داعي لشراء منصات تجارة إلكترونية منفصلة أو إدخال رصيد المخزون يدوياً. يوفر لك GarmentOS متجراً إلكترونياً متكاملاً لكل مصنع، مربوط مباشرة برصيد الموديلات الجاهزة والكراتين في المخزن.'
            : 'Eliminate separate e-commerce platforms and manual inventory synchronization. Each factory tenant gets an instant high-performance storefront connected directly to warehouse finished goods.'}
        </p>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Palette className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'محرر المظهر المرئي (Design Studio)' : 'Live Visual Design Studio'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'تخصيص كامل للهيدر واللوجو والألوان وبانرات العروض الترويجية بدون أي سطر برمجي، مع حفظ ونشر فوري.'
              : 'Customize logos, typography, accent colors, and promotional banners with zero code and instantaneous publishing.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'دفع آمن بالإنستاباي وعند الاستلام' : 'InstaPay Transfer & COD'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'دعم وسائل الدفع الأكثر استخداماً في مصر: التحويل البنكي الفوري عبر InstaPay مع رفع إيصال التحويل، أو الدفع نقداً عند استلام الشحنة.'
              : 'Built for Egypt with native InstaPay receipt verification and Cash on Delivery order processing.'}
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
            {isAr ? 'تتبع فوري لحالة الشحنات' : 'Live Order & Shipment Tracking'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {isAr
              ? 'صفحة تتبع عامة تمكن المشتري من متابعة حالة طلبه برقم الطلب ورقم الهاتف فور خروجه من المخزن.'
              : 'Dedicated public tracking portal where buyers verify dispatch status by order number and phone.'}
          </p>
        </div>
      </div>

      {/* 4 Templates Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans">
            {isAr ? '4 قوالب احترافية جاهزة للاستخدام' : '4 Industry-Tailored Storefront Templates'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isAr ? 'اختر القالب الأنسب لطبيعة مبيعات مصنعك وبدّل بينها بضغطة زر واحدة من لوحة التحكم.' : 'Switch between templates anytime from your admin dashboard.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl, i) => (
            <div
              key={i}
              className={`p-6 rounded-2xl border ${tpl.color} space-y-3 shadow-xs`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-slate-900 dark:text-white">{tpl.name}</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                  {tpl.badge}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{tpl.category}</div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {tpl.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Box */}
      <div className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-start">
          <h3 className="text-lg sm:text-xl font-black font-sans">
            {isAr ? 'ابدأ في بيع منتجاتك مباشرة من المصنع' : 'Start Selling Directly From Your Factory'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300">
            {isAr ? 'ميزة المتجر الإلكتروني متوفرة ومدمجة في باقتي Pro و Enterprise بدون أي رسوم إضافية.' : 'Included in Pro and Enterprise plans with zero added transaction commissions.'}
          </p>
        </div>
        <button
          onClick={() => onOpenRegister?.('professional')}
          className="btn-brand-primary px-6 py-3 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md cursor-pointer shrink-0"
        >
          {isAr ? 'بدء التجربة المجانية' : 'Start 14-Day Free Trial'}
        </button>
      </div>
    </div>
  );
};

export const AllFeaturesPage: React.FC<FeaturePageProps> = ({ lang, onNavigate }) => {
  const isAr = lang === 'ar';
  const featuresList = [
    { id: 'manufacturing', title: isAr ? 'صالة القص والفرش' : 'Cutting & Lays', icon: <Scissors className="w-5 h-5 text-[var(--brand-primary)]" />, desc: isAr ? 'حساب التعشيق، أطوال الفرش، والتحكم في الهالك' : 'Marker efficiency and lay waste control' },
    { id: 'inventory', title: isAr ? 'المخازن وخامات الأقمشة' : 'Fabric Inventory', icon: <Layers className="w-5 h-5 text-blue-600" />, desc: isAr ? 'أثواب القماش، حاسبة الـ GSM، والمطابقة الثلاثية' : 'Roll meters, GSM calculator, and 3-way PO matching' },
    { id: 'subcontracting', title: isAr ? 'التشغيل للغير والـ CMT' : 'Subcontracting & CMT', icon: <Boxes className="w-5 h-5 text-amber-600" />, desc: isAr ? 'عزل أمانات العملاء وتتبع المطابع والتطريز' : 'Customer fabric custody and external operations' },
    { id: 'costing', title: isAr ? 'التكاليف والمالية المزدوجة' : 'Costing & Accounts', icon: <Receipt className="w-5 h-5 text-emerald-600" />, desc: isAr ? 'شجرة الحسابات وتكلفة القطعة الحقيقية' : 'COA and actual cost-per-piece tracking' },
    { id: 'workforce', title: isAr ? 'أجور القطعة والعمال' : 'Piece-Rate & HR', icon: <Users className="w-5 h-5 text-purple-600" />, desc: isAr ? 'تسعير العمليات ومسح باركود الحزم' : 'Operation tariffs and bundle barcode scans' },
    { id: 'storefront', title: isAr ? 'المتجر الإلكتروني B2B' : 'B2B Storefront', icon: <Store className="w-5 h-5 text-rose-600" />, desc: isAr ? 'كتالوج بيع الجملة وحجز الأوامر' : 'Wholesale ordering portal and COD orders' },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-sans">
          {isAr ? 'كافة قدرات منظومة GarmentOS السحابية' : 'Complete GarmentOS Cloud Feature Suite'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {isAr
            ? 'منظومة صناعية شاملة صممت خصيصاً لمصانع وورش الملابس في جمهورية مصر العربية والشرق الأوسط لتوحيد صالة القص والمخازن والمالية.'
            : 'Integrated apparel manufacturing command system uniting cutting, inventory, subcontracting, and financial accounts.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuresList.map((f) => (
          <div
            key={f.id}
            onClick={() => onNavigate?.(f.id)}
            className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[var(--brand-border)] hover:shadow-md transition-all cursor-pointer space-y-3 group"
          >
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit group-hover:scale-105 transition-transform">
              {f.icon}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[var(--brand-primary)] dark:group-hover:text-[#f87171] transition-colors">
              {f.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {f.desc}
            </p>
            <div className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#f87171] flex items-center gap-1 pt-1">
              <span>{isAr ? 'عرض التفاصيل' : 'Explore Module'}</span>
              <span>←</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

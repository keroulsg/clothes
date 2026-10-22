import React from 'react';
import { Scissors, ShieldCheck } from 'lucide-react';
import type { Language } from '../../types';

export interface PublicPageFooterProps {
  lang: Language;
  onNavigate: (page: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export const PublicPageFooter: React.FC<PublicPageFooterProps> = ({
  lang,
  onNavigate,
  onOpenLogin,
  onOpenRegister,
}) => {
  const isAr = lang === 'ar';

  const handleNavClick = (page: string, e: React.MouseEvent) => {
    e.preventDefault();
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-sans transition-colors duration-200">
      {/* Upper 4-Column Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Col (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7F1625] via-[#8c1929] to-[#941b2d] text-white shadow-xs">
                <Scissors className="w-4 h-4 -rotate-45" />
              </div>
              <span className="font-black text-lg text-slate-950 dark:text-white font-sans">
                GarmentOS Cloud ERP
              </span>
            </div>

            <p className="text-xs leading-relaxed max-w-sm text-slate-600 dark:text-slate-400">
              {isAr
                ? 'المنظومة السحابية المتخصصة في هندسة صالات القص، تتبع حزم الإنتاج بالباركود، إدارة المخازن والأقمشة، وعقود التشغيل للغير CMT مع عزل آمن لبيانات المصانع.'
                : 'Enterprise cloud operating system tailored for garment manufacturers: cutting floor optimization, barcode bundle tracking, and tenant data isolation.'}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isAr ? 'عزل مستأجرين آمن (Tenant Isolation Guaranteed)' : 'Guaranteed Tenant Data Isolation'}</span>
            </div>
          </div>

          {/* Col 1: Solutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-sans tracking-normal">
              {isAr ? 'الوحدات الصناعية' : 'Industrial Modules'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#/features/cutting"
                  onClick={(e) => handleNavClick('manufacturing', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'صالة القص والفرش' : 'Cutting Floor & Lays'}
                </a>
              </li>
              <li>
                <a
                  href="#/features/inventory"
                  onClick={(e) => handleNavClick('inventory', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'المخازن والأقمشة والـ GSM' : 'Fabric Stock & GSM'}
                </a>
              </li>
              <li>
                <a
                  href="#/features/subcontracting"
                  onClick={(e) => handleNavClick('subcontracting', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'التشغيل للغير والـ CMT' : 'Subcontracting & CMT'}
                </a>
              </li>
              <li>
                <a
                  href="#/features/costing"
                  onClick={(e) => handleNavClick('costing', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'التكاليف وشجرة الحسابات' : 'Costing & Accounts'}
                </a>
              </li>
              <li>
                <a
                  href="#/features/workforce"
                  onClick={(e) => handleNavClick('workforce', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'أجور القطعة والعمال' : 'Piece-Rate & Payroll'}
                </a>
              </li>
              <li>
                <a
                  href="#/features/storefront"
                  onClick={(e) => handleNavClick('storefront', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'المتجر الإلكتروني B2B' : 'B2B Wholesale Portal'}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Platform & Pricing */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-sans tracking-normal">
              {isAr ? 'المنصة والأسعار' : 'Platform & Pricing'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#/features"
                  onClick={(e) => handleNavClick('features', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'نظرة عامة على الميزات' : 'Platform Overview'}
                </a>
              </li>
              <li>
                <a
                  href="#/pricing"
                  onClick={(e) => handleNavClick('pricing', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'الأسعار وباقات الاشتراك' : 'Pricing & Plans'}
                </a>
              </li>
              <li>
                <a
                  href="#/about"
                  onClick={(e) => handleNavClick('about', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'عن GarmentOS Cloud' : 'About GarmentOS'}
                </a>
              </li>
              <li>
                <a
                  href="#/faq"
                  onClick={(e) => handleNavClick('faq', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'الأسئلة الشائعة والإجابات' : 'FAQ'}
                </a>
              </li>
              <li>
                <a
                  href="#/contact"
                  onClick={(e) => handleNavClick('contact', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'طلب استشارة أو ديمو' : 'Request Demo'}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white font-sans tracking-normal">
              {isAr ? 'السياسات والضمانات' : 'Legal & Trust'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="#/privacy"
                  onClick={(e) => handleNavClick('privacy', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'سياسة الخصوصية وأمان البيانات' : 'Privacy Policy'}
                </a>
              </li>
              <li>
                <a
                  href="#/terms"
                  onClick={(e) => handleNavClick('terms', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'شروط الخدمة والاستخدام' : 'Terms of Service'}
                </a>
              </li>
              <li>
                <a
                  href="#/refund"
                  onClick={(e) => handleNavClick('refund', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'سياسة الإلغاء والاسترداد' : 'Refund & Cancellation'}
                </a>
              </li>
              <li>
                <a
                  href="#/cookies"
                  onClick={(e) => handleNavClick('cookies', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'سياسة ملفات الارتباط (Cookies)' : 'Cookie Policy'}
                </a>
              </li>
              <li>
                <a
                  href="#/ip"
                  onClick={(e) => handleNavClick('ip', e)}
                  className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors"
                >
                  {isAr ? 'الملكية الفكرية والبيانات' : 'Intellectual Property'}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Sub-Bar */}
      <div className="border-t border-slate-200/80 dark:border-slate-800/80 py-6 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div>
            © 2026 GarmentOS Cloud ERP. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </div>
          <div className="flex items-center gap-4 font-sans font-semibold text-xs">
            <button
              onClick={onOpenLogin}
              className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors cursor-pointer"
            >
              {isAr ? 'دخول المصنع' : 'Sign In'}
            </button>
            <span>•</span>
            <button
              onClick={onOpenRegister}
              className="hover:text-[#7F1625] dark:hover:text-[#f87171] transition-colors cursor-pointer text-[#7F1625] dark:text-[#f87171] font-bold"
            >
              {isAr ? 'تسجيل مصنع جديد' : 'Register Factory'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

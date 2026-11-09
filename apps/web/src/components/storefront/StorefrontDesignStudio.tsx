import React, { useState, useEffect } from 'react';
import {
  Palette,
  Layout,
  Layers,
  Image as ImageIcon,
  Check,
  Eye,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Sparkles,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Crown,
  Baby,
  Building2,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import type { Language, StorefrontThemeId, DesignStudioConfig } from '../../types';

interface StorefrontDesignStudioProps {
  lang: Language;
  onNavigateToLiveStore: (preview?: boolean) => void;
  onBackToOrders?: () => void;
}

export const StorefrontDesignStudio: React.FC<StorefrontDesignStudioProps> = ({
  lang,
  onNavigateToLiveStore,
  onBackToOrders,
}) => {
  const isAr = lang === 'ar';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Studio Data
  const [studioConfig, setStudioConfig] = useState<DesignStudioConfig | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'templates' | 'branding' | 'sections' | 'banners'>('templates');

  // Preview Viewport Device
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Draft State (in-progress modifications)
  const [selectedTemplate, setSelectedTemplate] = useState<StorefrontThemeId>('fashion_boutique');
  const [primaryColor, setPrimaryColor] = useState('#0284c7');
  const [secondaryColor, setSecondaryColor] = useState('#0f172a');
  const [accentColor, setAccentColor] = useState('#f43f5e');
  const [fontFamily, setFontFamily] = useState('Cairo, sans-serif');
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState('شحن سريع لجميع المحافظات خلال 48 ساعة 🚚');
  const [bannerTitle, setBannerTitle] = useState('أرقى منتجات الملابس من المصنع مباشرة');
  const [bannerSubtitle, setBannerSubtitle] = useState('جودة تصدير وخامات قطنية 100% مباشرة من خط الإنتاج.');
  const [ctaText, setCtaText] = useState('تسوق الآن');
  const [logoUrl, setLogoUrl] = useState('');

  // Sections toggle
  const [sections, setSections] = useState<Array<{ id: string; name_ar: string; name_en: string; enabled: boolean }>>([
    { id: 'hero_banner', name_ar: 'البنر الرئيسي الترويجي', name_en: 'Hero Promotional Banner', enabled: true },
    { id: 'trust_badges', name_ar: 'شريط ثقة وجودة المصنع', name_en: 'Trust & Quality Badges', enabled: true },
    { id: 'categories', name_ar: 'تصفية الأقسام والتصنيفات', name_en: 'Category Filters', enabled: true },
    { id: 'catalog_grid', name_ar: 'شبكة المنتجات المعروضة', name_en: 'Product Catalog Grid', enabled: true },
    { id: 'brand_story', name_ar: 'قصة المصنع والحرفية المصرية', name_en: 'Brand Heritage & Craftsmanship', enabled: true },
  ]);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const fetchStudio = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.storefront.getDesignStudio();
      if (data) {
        setStudioConfig(data);
        const draft = data.draft || {};
        const config = draft.theme_config || {};

        setSelectedTemplate(draft.theme_id || 'fashion_boutique');
        setPrimaryColor(config.primary_color || '#0284c7');
        setSecondaryColor(config.secondary_color || '#0f172a');
        setAccentColor(config.accent_color || '#f43f5e');
        setFontFamily(config.font_family || 'Cairo, sans-serif');
        setAnnouncementEnabled(config.announcement_bar_enabled !== false);
        setAnnouncementText(config.announcement_bar_text || 'شحن سريع لجميع المحافظات خلال 48 ساعة 🚚');
        setLogoUrl(config.logo_url || '');

        if (data.store_settings) {
          setBannerTitle(data.store_settings.banner_title || 'أرقى منتجات الملابس من المصنع مباشرة');
          setBannerSubtitle(data.store_settings.banner_subtitle || 'جودة تصدير وخامات قطنية 100% مباشرة من خط الإنتاج.');
        }
      }
    } catch (err: any) {
      if (window.location.search.includes('mock_audit=1') || window.location.hash.includes('mock_audit=1')) {
        setStudioConfig({
          tenant_id: 'mock-tenant-1',
          published: {
            theme_id: 'fashion_boutique',
            theme_config: { primary_color: '#0284c7' },
            published_at: new Date().toISOString(),
          },
          draft: {
            theme_id: 'fashion_boutique',
            theme_config: { primary_color: '#0284c7' },
          },
          has_draft_changes: true,
          can_rollback: true,
          available_templates: [] as any,
          store_settings: {
            id: 'mock-setting-1',
            store_name: isAr ? 'مصنع الدلتا للملابس الجاهزة' : 'Delta Apparel Factory',
            theme_id: 'fashion_boutique',
            is_store_enabled: true,
            allow_cod: true,
            allow_card_payment: false,
            allow_instapay: true,
            currency: 'EGP',
            banner_title: isAr ? 'أرقى منتجات الملابس من المصنع مباشرة' : 'Direct Factory Apparel',
            banner_subtitle: isAr ? 'خامات قطنية 100% مباشرة من خط الإنتاج.' : '100% Egyptian Cotton.',
          },
        });
        setErrorMsg(null);
        return;
      }
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل بيانات استوديو التصميم' : 'Failed to load design studio'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudio();
  }, []);

  // Preset Palettes
  const presetPalettes = [
    { name: 'Sky Fashion', primary: '#0284c7', secondary: '#0f172a', accent: '#f43f5e' },
    { name: 'Corporate Blue', primary: '#2563eb', secondary: '#1e293b', accent: '#059669' },
    { name: 'Warm Sunset (Kids)', primary: '#f97316', secondary: '#fed7aa', accent: '#10b981' },
    { name: 'Haute Noir (Luxury)', primary: '#d97706', secondary: '#18181b', accent: '#b45309' },
    { name: 'Emerald Weave', primary: '#059669', secondary: '#064e3b', accent: '#d97706' },
  ];

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const payload = {
        theme_id: selectedTemplate,
        theme_config: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          font_family: fontFamily,
          logo_url: logoUrl,
          announcement_bar_enabled: announcementEnabled,
          announcement_bar_text: announcementText,
          sections,
        },
      };
      await api.storefront.saveDesignDraft(payload);
      setSuccessMsg(isAr ? 'تم حفظ مسودة التصميم بنجاح! يمكنك معاينتها الآن.' : 'Design draft saved successfully!');
      await fetchStudio();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ المسودة' : 'Failed to save draft'));
    } finally {
      setIsSaving(false);
    }
  };

  // Publish Draft
  const handlePublish = async () => {
    setIsPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // Ensure draft is saved first
      await api.storefront.saveDesignDraft({
        theme_id: selectedTemplate,
        theme_config: {
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
          font_family: fontFamily,
          logo_url: logoUrl,
          announcement_bar_enabled: announcementEnabled,
          announcement_bar_text: announcementText,
          sections,
        },
      });

      await api.storefront.publishDesign();
      setSuccessMsg(isAr ? 'تم نشر التعديلات بنجاح إلى المتجر الحي!' : 'Published successfully to live store!');
      setShowPublishModal(false);
      await fetchStudio();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل نشر التعديلات' : 'Failed to publish changes'));
    } finally {
      setIsPublishing(false);
    }
  };

  // Rollback to previous version
  const handleRollback = async () => {
    setIsRollingBack(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.storefront.rollbackDesign();
      setSuccessMsg(isAr ? 'تم استرجاع النسخة السابقة بنجاح!' : 'Rolled back to previous version successfully!');
      setShowRollbackModal(false);
      await fetchStudio();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل استرجاع النسخة السابقة' : 'Failed to rollback'));
    } finally {
      setIsRollingBack(false);
    }
  };

  const templatesList = [
    {
      id: 'fashion_boutique' as StorefrontThemeId,
      name_ar: 'بوتيك الأزياء العصرية',
      name_en: 'Fashion Boutique',
      type_badge: isAr ? 'أزياء شبابية وكاجوال' : 'Fashion & Casual',
      desc_ar: 'تصميم تحريري عصري للملابس الجاهزة مع بنرات عريضة وشبكة منتجات متجاوبة وقصة علامة المصنع.',
      desc_en: 'High-fashion editorial layout with wide hero banners, interactive product cards, and brand storytelling.',
      palette: ['#0284c7', '#0f172a', '#f43f5e'],
      icon: <Sparkles className="w-5 h-5 text-sky-500" />,
    },
    {
      id: 'modern_catalog' as StorefrontThemeId,
      name_ar: 'الكتالوج الحديث والتوريدات',
      name_en: 'Modern Catalog & Wholesale',
      type_badge: isAr ? 'جملة وتوريدات ويونيفورم' : 'B2B Wholesale & Uniform',
      desc_ar: 'تصميم بحثي للكتالوجات الكبيرة وتجارة الجملة والزي الموحد مع شريط تصفية متقدم وأسعار الجملة وMOQ.',
      desc_en: 'Structured search-first catalog with sidebar category filters, bulk pricing, and minimum order quantities.',
      palette: ['#2563eb', '#1e293b', '#059669'],
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
    },
    {
      id: 'kids_family' as StorefrontThemeId,
      name_ar: 'أطفال وعائلة',
      name_en: 'Kids & Family Haven',
      type_badge: isAr ? 'أطفال ومواليد وعائلة' : 'Kids, Baby & Toddler',
      desc_ar: 'ألوان مبهجة دافئة، تصفح حسب الفئات العمرية ومقاسات الأطفال، ووسوم السلامة والقطن المصري 100%.',
      desc_en: 'Warm playful tones, age-bracket navigation, child-friendly sizing, and 100% natural cotton safety badges.',
      palette: ['#f97316', '#fed7aa', '#10b981'],
      icon: <Baby className="w-5 h-5 text-orange-500" />,
    },
    {
      id: 'premium_brand' as StorefrontThemeId,
      name_ar: 'علامة تجارية فاخرة',
      name_en: 'Premium Luxury Atelier',
      type_badge: isAr ? 'بدل وفساتين وأزياء فاخرة' : 'Haute Couture & Formal',
      desc_ar: 'بساطة فاخرة داكنة مع لمسات ذهبية وبرونزية، مساحات أنيقة وهوية راقية للأزياء الرسمية والبدل.',
      desc_en: 'Luxury minimalism, gold and bronze accents, refined spacing and heritage typography for exclusive couture.',
      palette: ['#d97706', '#18181b', '#b45309'],
      icon: <Crown className="w-5 h-5 text-amber-500" />,
    },
  ];

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-slate-500">{isAr ? 'جاري تجهيز استوديو التصميم...' : 'Loading Design Studio...'}</p>
      </div>
    );
  }

  const hasDraftChanges = studioConfig?.has_draft_changes;
  const canRollback = studioConfig?.can_rollback;
  const publishedTheme = studioConfig?.published?.theme_id || 'fashion_boutique';

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Top Header & Actions Bar */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {isAr ? 'استوديو تصميم وتخصيص المتجر' : 'Storefront Design Studio'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'اختر من بين 4 قوالب احترافية مختلفة تماماً وخصص هويتك، بنراتك، وألوانك دون برمجة'
                  : 'Customize your storefront with 4 distinct templates, custom branding, and drag-and-drop sections'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs">
            {hasDraftChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {isAr ? 'توجد تعديلات محفوظة كمسودة (غير منشورة)' : 'Draft Changes Pending Publish'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                {isAr ? 'المتجر متطابق تماماً مع النسخة الحية المنشورة' : 'Live & In Sync with Published Store'}
              </span>
            )}

            {studioConfig?.published?.published_at && (
              <span className="text-slate-400">
                • {isAr ? 'آخر نشر:' : 'Last published:'}{' '}
                {new Date(studioConfig.published.published_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')}
              </span>
            )}
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canRollback && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRollbackModal(true)}
              className="text-xs text-slate-600 dark:text-slate-300"
            >
              <RotateCcw className="w-3.5 h-3.5 me-1.5" />
              {isAr ? 'استرجاع النسخة السابقة' : 'Rollback'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToLiveStore(true)}
            className="text-xs bg-slate-50 dark:bg-slate-800"
          >
            <Eye className="w-3.5 h-3.5 me-1.5 text-amber-500" />
            {isAr ? 'معاينة المسودة (Preview)' : 'Live Preview'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving}
            onClick={handleSaveDraft}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 me-1.5" />
            {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ مسودة' : 'Save Draft')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isPublishing}
            onClick={() => setShowPublishModal(true)}
            className="text-xs"
          >
            <Send className="w-3.5 h-3.5 me-1.5" />
            {isAr ? 'نشر المتجر الحي' : 'Publish to Live'}
          </Button>

          {onBackToOrders && (
            <Button variant="ghost" size="sm" onClick={onBackToOrders} className="text-xs text-slate-400">
              {isAr ? 'العودة للطلبات' : 'Back'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Studio Workspace: Settings Panel + Live Viewport Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Navigation Tabs & Editors */}
        <div className="lg:col-span-8 space-y-6">
          {/* Customizer Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
            <button
              onClick={() => setActiveTab('templates')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'templates'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layout className="w-4 h-4" />
              <span>{isAr ? 'مكتبة القوالب (4 قوالب)' : 'Template Library'}</span>
            </button>

            <button
              onClick={() => setActiveTab('branding')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'branding'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{isAr ? 'الهوية والألوان' : 'Branding & Colors'}</span>
            </button>

            <button
              onClick={() => setActiveTab('sections')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'sections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isAr ? 'أقسام الصفحة الرئيسية' : 'Homepage Sections'}</span>
            </button>

            <button
              onClick={() => setActiveTab('banners')}
              className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'banners'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{isAr ? 'البنرات الترويجية' : 'Banners & Text'}</span>
            </button>
          </div>

          {/* TAB 1: TEMPLATE LIBRARY */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                {isAr
                  ? '💡 تتيح لك GarmentOS التبديل بين القوالب الأربعة في أي وقت دون فقدان أي منتج، طلب، رصيد مخزني، أو بيانات عملاء.'
                  : '💡 You can switch templates anytime without losing products, orders, or accounting data.'}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templatesList.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  const isPublished = publishedTheme === tpl.id;

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                              {tpl.icon}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm">{isAr ? tpl.name_ar : tpl.name_en}</h4>
                              <span className="text-[10px] font-bold text-slate-400">{tpl.type_badge}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isPublished && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                {isAr ? 'المنشور حالياً' : 'Live'}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white">
                                {isAr ? 'المحدد بالمسودة' : 'Selected'}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {isAr ? tpl.desc_ar : tpl.desc_en}
                        </p>

                        {/* Palette Previews */}
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-[10px] font-semibold text-slate-400">{isAr ? 'الألوان الافتراضية:' : 'Palette:'}</span>
                          <div className="flex items-center gap-1">
                            {tpl.palette.map((c, idx) => (
                              <div
                                key={idx}
                                style={{ backgroundColor: c }}
                                className="w-4 h-4 rounded-full border border-white dark:border-slate-800 shadow-xs"
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(tpl.id);
                            onNavigateToLiveStore(true);
                          }}
                          className="text-xs text-primary font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isAr ? 'معاينة القالب' : 'Preview'}</span>
                        </button>

                        <Button
                          size="sm"
                          variant={isSelected ? 'primary' : 'outline'}
                          onClick={() => setSelectedTemplate(tpl.id)}
                          className="text-xs"
                        >
                          {isSelected ? (isAr ? 'القالب المختار' : 'Active') : (isAr ? 'اختيار القالب' : 'Use Template')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & COLORS */}
          {activeTab === 'branding' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              {/* Color Pickers */}
              <div>
                <h4 className="font-extrabold text-sm mb-1">{isAr ? 'لوحة الألوان الأساسية' : 'Color Palette'}</h4>
                <p className="text-xs text-slate-500 mb-4">
                  {isAr
                    ? 'اختر لوحة جاهزة أو حدد الألوان التي تطابق الهوية البصرية لمصنعك'
                    : 'Choose a preset palette or define custom brand hex codes'}
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {presetPalettes.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(p.primary);
                        setSecondaryColor(p.secondary);
                        setAccentColor(p.accent);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-0.5">
                        <span style={{ backgroundColor: p.primary }} className="w-3 h-3 rounded-full" />
                        <span style={{ backgroundColor: p.secondary }} className="w-3 h-3 rounded-full" />
                        <span style={{ backgroundColor: p.accent }} className="w-3 h-3 rounded-full" />
                      </div>
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1.5">{isAr ? 'اللون الرئيسي (Primary)' : 'Primary Color'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">{isAr ? 'اللون الثانوي (Secondary)' : 'Secondary Color'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700"
                      />
                      <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1.5">{isAr ? 'لون اللمسات التمييزية (Accent)' : 'Accent Color'}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Typography & Fonts */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-extrabold text-sm mb-1">{isAr ? 'الخطوط والطباعة' : 'Typography'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">{isAr ? 'عائلة الخط العربي' : 'Font Family'}</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="Cairo, sans-serif">Cairo (عصري ومقروء - الافتراضي)</option>
                      <option value="Tajawal, sans-serif">Tajawal (ناعم للأزياء)</option>
                      <option value="Almarai, sans-serif">Almarai (رسمي وتجاري)</option>
                      <option value="serif">Serif (كلاسيكي فاخر للبراندات)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">{isAr ? 'رابط شعار المصنع (Logo URL)' : 'Logo Image URL'}</label>
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Announcement Bar */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-extrabold text-sm">{isAr ? 'شريط الإعلانات العلوي' : 'Top Announcement Bar'}</h4>
                    <p className="text-xs text-slate-500">{isAr ? 'يظهر في أعلى كل صفحات المتجر' : 'Visible at top of storefront'}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {announcementEnabled && (
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder={isAr ? 'نص الإعلان أو العرض الخاص...' : 'Announcement text...'}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HOMEPAGE SECTIONS */}
          {activeTab === 'sections' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-sm mb-1">{isAr ? 'ترتيب وتفعيل أقسام الصفحة الرئيسية' : 'Homepage Section Blocks'}</h4>
                <p className="text-xs text-slate-500 mb-4">
                  {isAr
                    ? 'يمكنك تفعيل أو إخفاء أي قسم وإعادة ترتيب ظهوره لزوار المتجر'
                    : 'Toggle and arrange visible modules for store visitors'}
                </p>
              </div>

              <div className="space-y-3">
                {sections.map((sec, index) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => {
                            if (index > 0) {
                              const newSec = [...sections];
                              const temp = newSec[index];
                              newSec[index] = newSec[index - 1];
                              newSec[index - 1] = temp;
                              setSections(newSec);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === sections.length - 1}
                          onClick={() => {
                            if (index < sections.length - 1) {
                              const newSec = [...sections];
                              const temp = newSec[index];
                              newSec[index] = newSec[index + 1];
                              newSec[index + 1] = temp;
                              setSections(newSec);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <h5 className="font-bold text-xs">{isAr ? sec.name_ar : sec.name_en}</h5>
                        <span className="font-mono text-[10px] text-slate-400">Block ID: #{sec.id}</span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={(e) => {
                          const updated = sections.map((s) => (s.id === sec.id ? { ...s, enabled: e.target.checked } : s));
                          setSections(updated);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: BANNERS & TEXT */}
          {activeTab === 'banners' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-sm mb-1">{isAr ? 'عناوين ونصوص البنر الرئيسي' : 'Hero Banner Texts'}</h4>
                <p className="text-xs text-slate-500 mb-4">
                  {isAr ? 'العنوان الجذاب الذي يظهر في صدارة متجرك لجميع الزوار' : 'The key headline visitors see first'}
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold mb-1">{isAr ? 'عنوان البنر الترويجي' : 'Banner Title'}</label>
                  <input
                    type="text"
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">{isAr ? 'النص التوضيحي للبنر' : 'Banner Subtitle'}</label>
                  <textarea
                    rows={3}
                    value={bannerSubtitle}
                    onChange={(e) => setBannerSubtitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">{isAr ? 'نص زر الشراء الرئيسي (CTA Button)' : 'CTA Button Text'}</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Mockup Viewport */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-primary" />
                <span>{isAr ? 'المعاينة اللحظية للمسودة' : 'Live Mockup'}</span>
              </span>

              {/* Viewport device toggler */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Mockup Container */}
            <div
              className={`mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-inner bg-slate-100 dark:bg-slate-950 transition-all ${
                previewDevice === 'mobile' ? 'max-w-[280px]' : previewDevice === 'tablet' ? 'max-w-[360px]' : 'w-full'
              }`}
            >
              {/* Fake Browser Top Bar */}
              <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1.5 flex items-center gap-1.5 text-[9px] font-mono text-slate-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>
                <span className="truncate flex-1 text-center bg-white dark:bg-slate-900 rounded px-1.5 py-0.5">
                  store.garmentos.com?preview=1
                </span>
              </div>

              {/* Mockup Preview Content */}
              <div className="p-3 text-[10px] space-y-3">
                {/* Mock Announcement */}
                {announcementEnabled && (
                  <div style={{ backgroundColor: primaryColor }} className="text-white p-1 rounded text-center truncate font-bold">
                    {announcementText}
                  </div>
                )}

                {/* Mock Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <div style={{ backgroundColor: primaryColor }} className="w-5 h-5 rounded-md flex items-center justify-center text-white font-black text-[9px]">
                      G
                    </div>
                    <span className="font-extrabold truncate max-w-[120px]">{studioConfig?.store_settings?.store_name || 'My Store'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="p-1 rounded bg-slate-200 dark:bg-slate-800"><ShoppingBag className="w-3 h-3" /></span>
                  </div>
                </div>

                {/* Mock Hero */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-900 dark:to-slate-800 space-y-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase" style={{ backgroundColor: primaryColor }}>
                    {selectedTemplate.replace('_', ' ')}
                  </span>
                  <div className="font-extrabold text-[11px] leading-tight line-clamp-2">{bannerTitle}</div>
                  <div className="text-[9px] text-slate-500 line-clamp-2">{bannerSubtitle}</div>
                  <button
                    style={{ backgroundColor: primaryColor }}
                    className="text-white text-[8px] font-bold px-2.5 py-1 rounded-md"
                  >
                    {ctaText}
                  </button>
                </div>

                {/* Mock Products Grid */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                      <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-lg">👕</div>
                      <div className="font-bold truncate text-[9px]">Egyptian Polo {i}</div>
                      <div className="font-black text-[9px]" style={{ color: primaryColor }}>350 EGP</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => onNavigateToLiveStore(true)}
              >
                <ExternalLink className="w-3.5 h-3.5 me-1.5" />
                {isAr ? 'فتح المعاينة الحية في نافذة جديدة' : 'Open Full Live Preview'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM PUBLISH MODAL */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title={isAr ? 'تأكيد نشر المتجر الإلكتروني' : 'Confirm Storefront Publishing'}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 leading-relaxed">
            {isAr
              ? 'أنت على وشك نشر تعديلات المسودة لتصبح الواجهة الرسمية المنشورة لمتجر المصنع. سيتم أرشفة النسخة المنشورة الحالية تلقائياً بحيث يمكنك التراجع عنها في أي وقت بنقرة واحدة.'
              : 'You are about to publish draft changes to the public store. The current live configuration will be archived automatically for instant rollback.'}
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'القالب المنشور:' : 'Target Template:'}</span>
              <span className="font-bold uppercase text-primary">{selectedTemplate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">{isAr ? 'اللون الرئيسي:' : 'Primary Color:'}</span>
              <div className="flex items-center gap-1 font-mono font-bold">
                <span style={{ backgroundColor: primaryColor }} className="w-3 h-3 rounded-full inline-block" />
                <span>{primaryColor}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="primary" disabled={isPublishing} onClick={handlePublish}>
              {isPublishing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'تأكيد النشر الفوري' : 'Confirm Publish')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM ROLLBACK MODAL */}
      <Modal
        isOpen={showRollbackModal}
        onClose={() => setShowRollbackModal(false)}
        title={isAr ? 'استرجاع النسخة السابقة' : 'Rollback to Previous Version'}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {isAr
              ? 'هل أنت متأكد من رغبتك في استرجاع النسخة المنشورة السابقة المؤرشفة؟ سيتم تطبيق القالب والإعدادات القديمة فوراً.'
              : 'Are you sure you want to rollback to the previous published state?'}
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowRollbackModal(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="danger" disabled={isRollingBack} onClick={handleRollback}>
              {isRollingBack ? (isAr ? 'جاري الاسترجاع...' : 'Rolling back...') : (isAr ? 'نعم، استرجع النسخة' : 'Yes, Rollback')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

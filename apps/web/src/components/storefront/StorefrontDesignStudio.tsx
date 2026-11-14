import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  Trash2,
  Copy,
  Plus,
  Compass,
  FileText,
  Link,
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
  const [activeTab, setActiveTab] = useState<'templates' | 'banners' | 'sections' | 'media' | 'navigation' | 'content' | 'branding'>('templates');

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
  const [logoUrl, setLogoUrl] = useState('');

  // Hero Banner State
  const [heroBanner, setHeroBanner] = useState({
    title: 'أرقى منتجات الملابس من المصنع مباشرة',
    subtitle: 'جودة تصدير وخامات قطنية 100% مباشرة من خط الإنتاج.',
    cta_text: 'تسوق الآن',
    cta_destination: 'shop',
    desktop_image: '',
    mobile_image: '',
    start_date: '',
    end_date: '',
    enabled: true,
  });

  // Multiple Promotional Banners
  const [promoBanners, setPromoBanners] = useState<Array<{
    id: string;
    title: string;
    subtitle: string;
    image_url: string;
    link_url: string;
    badge_text: string;
    enabled: boolean;
  }>>([
    {
      id: 'promo-1',
      title: 'خصم خاص 20% على تشكيلة الصيف',
      subtitle: 'استخدم كود FACTORY20 عند إتمام الطلب',
      image_url: '',
      link_url: 'shop',
      badge_text: 'عرض محدود',
      enabled: true,
    },
  ]);

  // Homepage Sections toggle & order
  const [sections, setSections] = useState<Array<{
    id: string;
    name_ar: string;
    name_en: string;
    enabled: boolean;
    alignment: 'start' | 'center' | 'end';
  }>>([
    { id: 'hero_banner', name_ar: 'البنر الرئيسي الترويجي', name_en: 'Hero Promotional Banner', enabled: true, alignment: 'start' },
    { id: 'trust_badges', name_ar: 'شريط ثقة وجودة المصنع', name_en: 'Trust & Quality Badges', enabled: true, alignment: 'center' },
    { id: 'categories', name_ar: 'تصفية الأقسام والتصنيفات', name_en: 'Category Filters & Showcase', enabled: true, alignment: 'start' },
    { id: 'catalog_grid', name_ar: 'شبكة المنتجات المعروضة', name_en: 'Product Catalog Grid', enabled: true, alignment: 'start' },
    { id: 'new_arrivals', name_ar: 'وصل حديثاً من خط الإنتاج', name_en: 'New Arrivals Collection', enabled: true, alignment: 'start' },
    { id: 'promo_banner', name_ar: 'بنر العروض والخصومات الخاصة', name_en: 'Promotional Discount Banner', enabled: true, alignment: 'center' },
    { id: 'brand_story', name_ar: 'قصة المصنع والحرفية المصرية', name_en: 'Brand Heritage & Craftsmanship', enabled: true, alignment: 'start' },
  ]);

  // Navigation Links
  const [headerLinks, setHeaderLinks] = useState<Array<{
    label_ar: string;
    label_en: string;
    view: string;
    enabled: boolean;
  }>>([
    { label_ar: 'الرئيسية', label_en: 'Home', view: 'home', enabled: true },
    { label_ar: 'جميع الموديلات', label_en: 'Shop All', view: 'shop', enabled: true },
    { label_ar: 'الأقسام', label_en: 'Categories', view: 'category', enabled: true },
    { label_ar: 'عن المصنع', label_en: 'About Us', view: 'about', enabled: true },
    { label_ar: 'تواصل معنا', label_en: 'Contact', view: 'contact', enabled: true },
    { label_ar: 'سياسات المتجر', label_en: 'Policies', view: 'policies', enabled: true },
  ]);

  // Content Pages & Factory Contact Info
  const [contactInfo, setContactInfo] = useState({
    phone: '+20 100 000 0000',
    whatsapp: '+20 100 000 0000',
    email: 'support@delta-garments.com',
    address: 'المنطقة الصناعية، جمهورية مصر العربية',
    working_hours: 'السبت - الخميس: من 9:00 صباحاً حتى 6:00 مساءً',
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    tiktok: 'https://tiktok.com',
  });

  const [aboutStory, setAboutStory] = useState(
    'نحن صرح صناعي متكامل متخصص في تصميم وتصنيع الملابس الجاهزة واليونيفورم والمنسوجات القطنية عالية الجودة. نوفر منتجاتنا مباشرة للمستهلكين والشركات دون وسطاء لضمان أعلى معايير الجودة وأفضل قيمة سعرية.'
  );

  // Media Library
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  // Fetch Studio Data
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

        if (config.hero_banner) {
          setHeroBanner((prev) => ({ ...prev, ...config.hero_banner }));
        } else if (data.store_settings) {
          setHeroBanner((prev) => ({
            ...prev,
            title: data.store_settings.banner_title || prev.title,
            subtitle: data.store_settings.banner_subtitle || prev.subtitle,
          }));
        }

        if (config.promo_banners && Array.isArray(config.promo_banners)) {
          setPromoBanners(config.promo_banners);
        }

        if (config.sections && Array.isArray(config.sections)) {
          setSections(config.sections);
        }

        if (config.navigation?.header_links && Array.isArray(config.navigation.header_links)) {
          setHeaderLinks(config.navigation.header_links);
        }

        if (config.contact) {
          setContactInfo((prev) => ({ ...prev, ...config.contact }));
        }

        if (config.pages?.about_story) {
          setAboutStory(config.pages.about_story);
        }

        if (config.media_library && Array.isArray(config.media_library)) {
          setMediaList(config.media_library);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل بيانات استوديو التصميم' : 'Failed to load design studio'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStudio();
  }, []);

  // Fetch Media List
  const loadMedia = async () => {
    try {
      const res = await api.storefront.listMedia();
      if (res?.media) {
        setMediaList(res.media);
      }
    } catch {}
  };

  // Upload Media Handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(isAr ? 'حجم الملف يتجاوز الحد المسموح به (5 ميجابايت)' : 'File exceeds 5MB size limit');
      return;
    }

    // Validate type
    if (!file.type.match(/^image\/(jpeg|png|webp|svg\+xml|jpg|gif)$/i)) {
      setErrorMsg(isAr ? 'نوع الملف غير مدعوم. يرجى رفع صورة JPG أو PNG أو WebP أو SVG' : 'Unsupported file type');
      return;
    }

    setIsUploadingMedia(true);
    setUploadProgress(isAr ? 'جاري رفع الملف إلى الخادم بأمان...' : 'Uploading file securely...');
    setErrorMsg(null);

    try {
      const res = await api.storefront.uploadMedia(file, 'general', file.name);
      if (res?.media) {
        setSuccessMsg(isAr ? `تم رفع "${file.name}" بنجاح إلى مكتبة الوسائط!` : 'File uploaded successfully!');
        setMediaList((prev) => [res.media, ...prev]);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل رفع الملف إلى الخادم' : 'Failed to upload image'));
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Delete Media Handler
  const handleDeleteMedia = async (pathOrUrl: string) => {
    try {
      await api.storefront.deleteMedia(pathOrUrl);
      setMediaList((prev) => prev.filter((m) => m.path !== pathOrUrl && m.url !== pathOrUrl));
      setSuccessMsg(isAr ? 'تم حذف الصورة من مكتبة الوسائط بنجاح.' : 'Media deleted successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حذف الصورة' : 'Failed to delete image'));
    }
  };

  // Preset Palettes
  const presetPalettes = [
    { name: 'Sky Fashion', primary: '#0284c7', secondary: '#0f172a', accent: '#f43f5e' },
    { name: 'Corporate Blue (B2B)', primary: '#2563eb', secondary: '#1e293b', accent: '#059669' },
    { name: 'Warm Sunset (Kids)', primary: '#f97316', secondary: '#fed7aa', accent: '#10b981' },
    { name: 'Haute Noir (Luxury)', primary: '#d97706', secondary: '#18181b', accent: '#b45309' },
    { name: 'Emerald Weave', primary: '#059669', secondary: '#064e3b', accent: '#d97706' },
  ];

  // Build Payload
  const getFullPayload = () => ({
    theme_id: selectedTemplate,
    theme_config: {
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      accent_color: accentColor,
      font_family: fontFamily,
      logo_url: logoUrl,
      announcement_bar_enabled: announcementEnabled,
      announcement_bar_text: announcementText,
      hero_banner: heroBanner,
      promo_banners: promoBanners,
      sections,
      navigation: {
        header_links: headerLinks,
      },
      contact: contactInfo,
      pages: {
        about_story: aboutStory,
      },
      media_library: mediaList,
    },
  });

  // Save Draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.storefront.saveDesignDraft(getFullPayload());
      setSuccessMsg(isAr ? 'تم حفظ مسودة التصميم بنجاح! يمكنك معاينتها في أي وقت.' : 'Design draft saved successfully!');
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
      await api.storefront.saveDesignDraft(getFullPayload());
      await api.storefront.publishDesign();
      setSuccessMsg(isAr ? 'تم نشر التعديلات بنجاح إلى المتجر الإلكتروني الحي!' : 'Published successfully to live store!');
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
      setSuccessMsg(isAr ? 'تم استرجاع النسخة المنشورة السابقة بنجاح!' : 'Rolled back to previous version successfully!');
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
      name_ar: 'بوتيك الأزياء العصرية (Fashion Boutique)',
      name_en: 'Fashion Boutique',
      type_badge: isAr ? 'أزياء شبابية وكاجوال' : 'Fashion & Casual',
      desc_ar: 'تصميم تحريري عصري للملابس الجاهزة مع بنرات عريضة وشبكة منتجات أنيقة وقصة علامة المصنع.',
      desc_en: 'High-fashion editorial layout with wide hero banners, interactive product cards, and brand storytelling.',
      palette: ['#0284c7', '#0f172a', '#f43f5e'],
      icon: <Sparkles className="w-5 h-5 text-sky-500" />,
    },
    {
      id: 'modern_catalog' as StorefrontThemeId,
      name_ar: 'الكتالوج الحديث والتوريدات (Modern Catalog)',
      name_en: 'Modern Catalog & Wholesale',
      type_badge: isAr ? 'جملة وتوريدات ويونيفورم' : 'B2B Wholesale & Uniform',
      desc_ar: 'تصميم بحثي للكتالوجات الكبيرة وتجارة الجملة والزي الموحد مع شريط تصفية متقدم وأسعار الجملة وMOQ.',
      desc_en: 'Structured search-first catalog with sidebar category filters, bulk pricing, and minimum order quantities.',
      palette: ['#2563eb', '#1e293b', '#059669'],
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
    },
    {
      id: 'kids_family' as StorefrontThemeId,
      name_ar: 'أطفال وعائلة (Kids & Family Haven)',
      name_en: 'Kids & Family Haven',
      type_badge: isAr ? 'أطفال ومواليد وعائلة' : 'Kids, Baby & Toddler',
      desc_ar: 'ألوان مبهجة دافئة، تصفح حسب الفئات العمرية ومقاسات الأطفال، ووسوم السلامة والقطن المصري 100%.',
      desc_en: 'Warm playful tones, age-bracket navigation, child-friendly sizing, and 100% natural cotton safety badges.',
      palette: ['#f97316', '#fed7aa', '#10b981'],
      icon: <Baby className="w-5 h-5 text-orange-500" />,
    },
    {
      id: 'premium_brand' as StorefrontThemeId,
      name_ar: 'علامة تجارية فاخرة (Premium Luxury)',
      name_en: 'Premium Luxury Atelier',
      type_badge: isAr ? 'بدل وفساتين وأزياء راقية' : 'Haute Couture & Formal',
      desc_ar: 'بساطة فاخرة مع لمسات ذهبية وبرونزية، مساحات أنيقة وهوية راقية للأزياء الرسمية والبدل.',
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
                {isAr ? 'استوديو التحكم وإدارة المتجر الإلكتروني' : 'Storefront Control & Design Studio'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'إدارة كاملة للبنرات، الصور، الأقسام، الهوية، والقوائم مع حفظ سحابي آمن وتحديث فوري للمتجر'
                  : 'Manage banners, media, sections, branding & navigation with safe versioning'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 text-xs">
            {hasDraftChanges ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                {isAr ? 'توجد تعديلات مسودة غير منشورة' : 'Unpublished Draft Changes'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" />
                {isAr ? 'المتجر الحي متطابق مع التعديلات' : 'Live Store in Sync'}
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
            {isAr ? 'نشر للمتجر الحي' : 'Publish to Live'}
          </Button>

          {onBackToOrders && (
            <Button variant="ghost" size="sm" onClick={onBackToOrders} className="text-xs text-slate-400">
              {isAr ? 'العودة للطلبات' : 'Back'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Studio Workspace: 7-Tab Panel + Live Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customizer Tabs & Editors */}
        <div className="lg:col-span-8 space-y-6">
          {/* Navigation Tabs Header */}
          <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-1 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xs">
            {[
              { id: 'templates', label: isAr ? 'القوالب (4)' : 'Templates', icon: Layout },
              { id: 'banners', label: isAr ? 'البنرات والعروض' : 'Hero & Banners', icon: ImageIcon },
              { id: 'sections', label: isAr ? 'ترتيب الأقسام' : 'Sections', icon: Layers },
              { id: 'media', label: isAr ? 'مكتبة الوسائط' : 'Media Library', icon: Upload },
              { id: 'navigation', label: isAr ? 'القوائم والشعار' : 'Navigation', icon: Compass },
              { id: 'content', label: isAr ? 'المحتوى والتواصل' : 'Pages & Contact', icon: FileText },
              { id: 'branding', label: isAr ? 'الألوان والخطوط' : 'Branding', icon: Palette },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id === 'media') loadMedia();
                  }}
                  className={`py-2 px-3 sm:px-4 text-xs font-bold transition-all rounded-xl flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ==================== TAB 1: TEMPLATES ==================== */}
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
                          ? 'border-blue-600 ring-2 ring-blue-600/20 bg-blue-50/10 dark:bg-blue-950/20 shadow-md'
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
                          {isPublished && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {isAr ? 'المنشور حالياً' : 'Live'}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 leading-relaxed">
                          {isAr ? tpl.desc_ar : tpl.desc_en}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {tpl.palette.map((c, i) => (
                            <span key={i} style={{ backgroundColor: c }} className="w-4 h-4 rounded-full inline-block border border-white shadow-xs" />
                          ))}
                        </div>
                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                          {isSelected ? (isAr ? '✓ القالب المختار' : '✓ Selected') : (isAr ? 'اختيار القالب' : 'Select')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==================== TAB 2: BANNERS & HERO ==================== */}
          {activeTab === 'banners' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h4 className="font-extrabold text-base mb-1">{isAr ? 'إدارة البنر الرئيسي الترويجي (Hero Banner)' : 'Main Hero Banner Manager'}</h4>
                <p className="text-xs text-slate-500">
                  {isAr ? 'البنر الأكبر الذي يظهر في صدارة متجرك لجميع زوار المتجر مع دعم صور الديسكتوب والموبايل' : 'Key promotional banner displayed at the top of the storefront with mobile & desktop variants'}
                </p>
              </div>

              {/* Main Banner Inputs */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5">{isAr ? 'عنوان البنر الرئيسي' : 'Banner Headline'} *</label>
                    <input
                      type="text"
                      value={heroBanner.title}
                      onChange={(e) => setHeroBanner({ ...heroBanner, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1.5">{isAr ? 'نص زر الشراء (CTA Button)' : 'Button CTA Text'} *</label>
                    <input
                      type="text"
                      value={heroBanner.cta_text}
                      onChange={(e) => setHeroBanner({ ...heroBanner, cta_text: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5">{isAr ? 'النص التوضيحي للبنر' : 'Banner Subtitle'}</label>
                  <textarea
                    rows={2}
                    value={heroBanner.subtitle}
                    onChange={(e) => setHeroBanner({ ...heroBanner, subtitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1.5">{isAr ? 'وجهة زر البنر (Destination)' : 'CTA Destination'}</label>
                    <select
                      value={heroBanner.cta_destination}
                      onChange={(e) => setHeroBanner({ ...heroBanner, cta_destination: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                    >
                      <option value="shop">{isAr ? 'صفحة جميع المنتجات (Shop)' : 'Shop Page'}</option>
                      <option value="category">{isAr ? 'صفحة الأقسام (Categories)' : 'Categories'}</option>
                      <option value="contact">{isAr ? 'صفحة التواصل (Contact)' : 'Contact Page'}</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                    <div>
                      <span className="font-bold block">{isAr ? 'تفعيل ظهور البنر' : 'Banner Visibility'}</span>
                      <span className="text-[10px] text-slate-400">{isAr ? 'إظهار البنر لزوار المتجر' : 'Show to visitors'}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heroBanner.enabled}
                        onChange={(e) => setHeroBanner({ ...heroBanner, enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                {/* Desktop & Mobile Banner Images */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <h5 className="font-bold text-xs">{isAr ? 'صور البنر المخصصة (Desktop & Mobile)' : 'Banner Media Images'}</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1">{isAr ? 'صورة الشاشات الكبيرة (Desktop Image URL)' : 'Desktop Image URL'}</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={heroBanner.desktop_image}
                          onChange={(e) => setHeroBanner({ ...heroBanner, desktop_image: e.target.value })}
                          placeholder="https://.../banner-desktop.jpg"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        {heroBanner.desktop_image && (
                          <button
                            type="button"
                            onClick={() => setHeroBanner({ ...heroBanner, desktop_image: '' })}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {heroBanner.desktop_image && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 flex items-center justify-center">
                          <img src={api.getMediaUrl(heroBanner.desktop_image)} alt="Desktop Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1">{isAr ? 'صورة الموبايل (Mobile Image URL)' : 'Mobile Image URL'}</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={heroBanner.mobile_image}
                          onChange={(e) => setHeroBanner({ ...heroBanner, mobile_image: e.target.value })}
                          placeholder="https://.../banner-mobile.jpg"
                          className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                        />
                        {heroBanner.mobile_image && (
                          <button
                            type="button"
                            onClick={() => setHeroBanner({ ...heroBanner, mobile_image: '' })}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {heroBanner.mobile_image && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 flex items-center justify-center">
                          <img src={api.getMediaUrl(heroBanner.mobile_image)} alt="Mobile Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Promotional Banners */}
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-xs">{isAr ? 'بنرات العروض والخصومات الإضافية' : 'Promotional Sale Banners'}</h5>
                      <p className="text-[10px] text-slate-400">{isAr ? 'تظهر كبطاقات عروض تفاعلية أسفل الصفحة' : 'Secondary promotional cards'}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const newId = 'promo-' + Date.now();
                        setPromoBanners([
                          ...promoBanners,
                          {
                            id: newId,
                            title: isAr ? 'عرض موسمي جديد' : 'New Seasonal Offer',
                            subtitle: isAr ? 'خصم فوري عند الشراء المباشر' : 'Direct factory discount',
                            image_url: '',
                            link_url: 'shop',
                            badge_text: isAr ? 'خصم خاص' : 'SPECIAL',
                            enabled: true,
                          },
                        ]);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 me-1" />
                      <span>{isAr ? 'إضافة بنر عرض' : 'Add Banner'}</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {promoBanners.map((promo, idx) => (
                      <div
                        key={promo.id}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{isAr ? `بنر إعلاني #${idx + 1}` : `Banner #${idx + 1}`}</span>
                          <button
                            type="button"
                            onClick={() => setPromoBanners(promoBanners.filter((p) => p.id !== promo.id))}
                            className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isAr ? 'حذف' : 'Remove'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder={isAr ? 'عنوان العرض...' : 'Offer title...'}
                            value={promo.title}
                            onChange={(e) => {
                              const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, title: e.target.value } : p));
                              setPromoBanners(updated);
                            }}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                          />
                          <input
                            type="text"
                            placeholder={isAr ? 'نص الشارة (Badge)...' : 'Badge text...'}
                            value={promo.badge_text}
                            onChange={(e) => {
                              const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, badge_text: e.target.value } : p));
                              setPromoBanners(updated);
                            }}
                            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: SECTIONS ==================== */}
          {activeTab === 'sections' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h4 className="font-extrabold text-base mb-1">{isAr ? 'ترتيب وتفعيل أقسام الصفحة الرئيسية' : 'Homepage Section Blocks'}</h4>
                <p className="text-xs text-slate-500 mb-4">
                  {isAr
                    ? 'يمكنك تفعيل أو إخفاء أي قسم وإعادة ترتيب ترتيب ظهوره بالأسهم لزوار المتجر'
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

                    <div className="flex items-center gap-4">
                      {/* Alignment Selector */}
                      <select
                        value={sec.alignment || 'start'}
                        onChange={(e) => {
                          const updated = sections.map((s) => (s.id === sec.id ? { ...s, alignment: e.target.value as any } : s));
                          setSections(updated);
                        }}
                        className="text-[11px] px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="start">{isAr ? 'محاذاة البداية' : 'Start'}</option>
                        <option value="center">{isAr ? 'توسيط' : 'Center'}</option>
                        <option value="end">{isAr ? 'محاذاة النهاية' : 'End'}</option>
                      </select>

                      {/* Enable Switch */}
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
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: MEDIA LIBRARY ==================== */}
          {activeTab === 'media' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-base mb-1">{isAr ? 'مكتبة وسائط المتجر والصور' : 'Storefront Media Library'}</h4>
                  <p className="text-xs text-slate-500">
                    {isAr ? 'رفع صور البنرات، الشعار، والمنتجات وتخزينها سحابياً بأمان مع ربطها المباشر بالقوالب' : 'Upload and manage banner, logo & catalog assets securely'}
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadFile}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isUploadingMedia}
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingMedia ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع صورة جديدة' : 'Upload Image')}</span>
                  </Button>
                </div>
              </div>

              {/* Upload Progress Alert */}
              {uploadProgress && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>{uploadProgress}</span>
                </div>
              )}

              {/* Media Grid */}
              {mediaList.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500">{isAr ? 'لا توجد صور مرفوعة في مكتبة الوسائط حتى الآن' : 'No media uploaded yet'}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    {isAr ? 'اضغط لرفع أول صورة' : 'Click to upload first image'}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaList.map((media, idx) => (
                    <div
                      key={media.id || idx}
                      className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/50 flex flex-col justify-between"
                    >
                      <div className="h-28 w-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
                        <img
                          src={api.getMediaUrl(media.url)}
                          alt={media.filename || 'Media'}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="p-2.5 space-y-2">
                        <p className="text-[10px] font-bold truncate">{media.original_name || media.filename}</p>
                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span>{media.size ? `${Math.round(media.size / 1024)} KB` : 'Image'}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(api.getMediaUrl(media.url));
                              setSuccessMsg(isAr ? 'تم نسخ رابط الصورة إلى الحافظة' : 'Image URL copied!');
                            }}
                            className="hover:text-blue-500 flex items-center gap-1"
                            title="Copy URL"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{isAr ? 'نسخ' : 'Copy'}</span>
                          </button>
                        </div>

                        {/* Quick Assign Buttons */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1 text-[9px]">
                          <button
                            type="button"
                            onClick={() => {
                              setHeroBanner({ ...heroBanner, desktop_image: media.url });
                              setSuccessMsg(isAr ? 'تم تعيين الصورة كبنر رئيسي للديسكتوب' : 'Set as Desktop Banner');
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold hover:bg-blue-100"
                          >
                            {isAr ? 'بنر رئيسي' : 'Hero'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setHeroBanner({ ...heroBanner, mobile_image: media.url });
                              setSuccessMsg(isAr ? 'تم تعيين الصورة كبنر للموبايل' : 'Set as Mobile Banner');
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-600 font-bold hover:bg-amber-100"
                          >
                            {isAr ? 'موبايل' : 'Mobile'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLogoUrl(media.url);
                              setSuccessMsg(isAr ? 'تم تعيين الصورة كشعار المتجر' : 'Set as Logo');
                            }}
                            className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold hover:bg-emerald-100"
                          >
                            {isAr ? 'شعار' : 'Logo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMedia(media.path || media.url)}
                            className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-600 hover:bg-rose-100 ms-auto"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 5: NAVIGATION & LOGO ==================== */}
          {activeTab === 'navigation' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h4 className="font-extrabold text-base mb-1">{isAr ? 'إدارة القوائم والشعار والهيدر' : 'Navigation & Header Configuration'}</h4>
                <p className="text-xs text-slate-500">
                  {isAr ? 'التحكم في روابط القائمة الرئيسية، شريط الإعلانات، والشعار الرسمي' : 'Manage navigation menus, links and top announcement'}
                </p>
              </div>

              {/* Logo URL */}
              <div className="space-y-2 text-xs">
                <label className="block font-bold">{isAr ? 'رابط شعار المصنع (Logo Image URL)' : 'Logo Image URL'}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Announcement Bar */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs">{isAr ? 'شريط الإعلانات العلوي' : 'Top Announcement Bar'}</h5>
                    <p className="text-[10px] text-slate-400">{isAr ? 'يظهر في أعلى صفحات المتجر' : 'Top bar across storefront'}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={announcementEnabled}
                      onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {announcementEnabled && (
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder={isAr ? 'نص الإعلان أو العرض...' : 'Announcement text...'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                )}
              </div>

              {/* Navigation Links List */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h5 className="font-bold text-xs">{isAr ? 'روابط القائمة الرئيسية (Main Menu)' : 'Header Navigation Links'}</h5>
                <div className="space-y-2">
                  {headerLinks.map((link, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Link className="w-4 h-4 text-slate-400" />
                        <span className="font-bold">{isAr ? link.label_ar : link.label_en}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({link.view})</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={link.enabled}
                          onChange={(e) => {
                            const updated = headerLinks.map((l, i) => (i === idx ? { ...l, enabled: e.target.checked } : l));
                            setHeaderLinks(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: CONTENT & PAGES ==================== */}
          {activeTab === 'content' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h4 className="font-extrabold text-base mb-1">{isAr ? 'محتوى الصفحات وبيانات التواصل' : 'Pages Content & Factory Details'}</h4>
                <p className="text-xs text-slate-500">
                  {isAr ? 'تعديل قصة المصنع، أرقام خدمة العملاء والواتساب، والعناوين' : 'Manage About us, direct WhatsApp lines and showroom contact'}
                </p>
              </div>

              {/* About Us Story */}
              <div className="space-y-2 text-xs">
                <label className="block font-bold">{isAr ? 'قصة ورسالة المصنع (About Page Story)' : 'Factory Story'}</label>
                <textarea
                  rows={4}
                  value={aboutStory}
                  onChange={(e) => setAboutStory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>

              {/* Direct Contact Numbers */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 text-xs">
                <h5 className="font-bold text-xs">{isAr ? 'أرقام التواصل وقنوات الدعم' : 'Direct Contact & Social Media'}</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1">{isAr ? 'رقم الواتساب السريع' : 'WhatsApp Number'}</label>
                    <input
                      type="text"
                      value={contactInfo.whatsapp}
                      onChange={(e) => setContactInfo({ ...contactInfo, whatsapp: e.target.value })}
                      placeholder="+201XXXXXXXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{isAr ? 'هاتف خدمة العملاء' : 'Customer Phone'}</label>
                    <input
                      type="text"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      placeholder="+201XXXXXXXXX"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{isAr ? 'البريد الإلكتروني' : 'Support Email'}</label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{isAr ? 'مواعيد العمل الرسمية' : 'Working Hours'}</label>
                    <input
                      type="text"
                      value={contactInfo.working_hours}
                      onChange={(e) => setContactInfo({ ...contactInfo, working_hours: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1">{isAr ? 'عنوان المصنع والمقر الرئيسي' : 'Factory Physical Address'}</label>
                  <input
                    type="text"
                    value={contactInfo.address}
                    onChange={(e) => setContactInfo({ ...contactInfo, address: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 7: BRANDING & FONTS ==================== */}
          {activeTab === 'branding' && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div>
                <h4 className="font-extrabold text-base mb-1">{isAr ? 'الألوان والخطوط وهوية المتجر' : 'Branding & Color Palettes'}</h4>
                <p className="text-xs text-slate-500">
                  {isAr ? 'تخصيص الألوان الأساسية ونوع الخط العربي للمتجر' : 'Select color theme and typography'}
                </p>
              </div>

              {/* Preset Color Schemes */}
              <div>
                <label className="block text-xs font-bold mb-2">{isAr ? 'أنظمة الألوان الجاهزة (Quick Presets)' : 'Preset Palettes'}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {presetPalettes.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setPrimaryColor(p.primary);
                        setSecondaryColor(p.secondary);
                        setAccentColor(p.accent);
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-400 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-[11px] truncate">{p.name}</span>
                      <div className="flex gap-1 shrink-0">
                        <span style={{ backgroundColor: p.primary }} className="w-3.5 h-3.5 rounded-full inline-block border border-white" />
                        <span style={{ backgroundColor: p.secondary }} className="w-3.5 h-3.5 rounded-full inline-block border border-white" />
                        <span style={{ backgroundColor: p.accent }} className="w-3.5 h-3.5 rounded-full inline-block border border-white" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Color Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <label className="block font-bold mb-1.5">{isAr ? 'اللون الرئيسي (Primary)' : 'Primary Color'}</label>
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
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5">{isAr ? 'اللون الثانوي (Secondary)' : 'Secondary Color'}</label>
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
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold mb-1.5">{isAr ? 'لون اللمسات التمييزية (Accent)' : 'Accent Color'}</label>
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
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-xs uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Typography */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold mb-1.5">{isAr ? 'عائلة الخط العربي (Font Family)' : 'Arabic Font Family'}</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                >
                  <option value="Cairo, sans-serif">Cairo (عصري ومقروء - الافتراضي للمصانع)</option>
                  <option value="Tajawal, sans-serif">Tajawal (ناعم وأنيق للأزياء)</option>
                  <option value="Almarai, sans-serif">Almarai (رسمي وجريء للكتالوجات)</option>
                  <option value="serif">Playfair / Serif (فاخر وكلاسيكي للبراندات)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ==================== RIGHT COLUMN: LIVE MOCKUP VIEWPORT ==================== */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm sticky top-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600" />
                <span>{isAr ? 'المعاينة اللحظية للمسودة' : 'Live Mockup Viewport'}</span>
              </span>

              {/* Viewport device toggler */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`p-1 rounded ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('tablet')}
                  className={`p-1 rounded ${previewDevice === 'tablet' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                  title="Tablet View"
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`p-1 rounded ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'}`}
                  title="Mobile View"
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
              {/* Browser Address Bar */}
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
              <div className="p-3 text-[10px] space-y-3" style={{ fontFamily }}>
                {/* Mock Announcement */}
                {announcementEnabled && (
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="text-white text-[9px] px-2 py-1 rounded text-center truncate font-bold"
                  >
                    {announcementText}
                  </div>
                )}

                {/* Mock Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {logoUrl ? (
                      <img src={api.getMediaUrl(logoUrl)} alt="Logo" className="w-5 h-5 object-contain rounded" />
                    ) : (
                      <div
                        style={{ backgroundColor: primaryColor }}
                        className="w-5 h-5 rounded flex items-center justify-center text-white font-black text-[9px]"
                      >
                        {selectedTemplate === 'kids_family' ? <Baby className="w-3 h-3" /> : selectedTemplate === 'premium_brand' ? <Crown className="w-3 h-3" /> : 'G'}
                      </div>
                    )}
                    <span className="font-extrabold text-[10px] truncate max-w-[120px]">
                      {studioConfig?.store_settings?.store_name || (isAr ? 'مصنع الملابس' : 'Store')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-[8px] font-bold">
                      {isAr ? 'سلة' : 'Cart'} (0)
                    </span>
                  </div>
                </div>

                {/* Mock Hero Banner */}
                {heroBanner.enabled && (
                  <div
                    style={{
                      backgroundColor: selectedTemplate === 'premium_brand' ? '#18181b' : `${primaryColor}15`,
                      borderColor: primaryColor,
                    }}
                    className="p-3 rounded-xl border text-center space-y-2 relative overflow-hidden"
                  >
                    {heroBanner.desktop_image && (
                      <img
                        src={api.getMediaUrl(heroBanner.desktop_image)}
                        alt="Hero"
                        className="w-full h-16 object-cover rounded-lg mb-1"
                      />
                    )}
                    <p className={`font-black text-[11px] leading-tight ${selectedTemplate === 'premium_brand' ? 'text-amber-400 font-serif' : ''}`}>
                      {heroBanner.title}
                    </p>
                    <p className="text-[9px] text-slate-500 leading-tight line-clamp-2">
                      {heroBanner.subtitle}
                    </p>
                    <button
                      type="button"
                      style={{ backgroundColor: primaryColor }}
                      className="text-white text-[9px] font-bold px-3 py-1 rounded-lg shadow-xs inline-block"
                    >
                      {heroBanner.cta_text}
                    </button>
                  </div>
                )}

                {/* Mock Ordered Section Pills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] font-bold text-slate-400 block">{isAr ? 'تسلسل الأقسام المفعلة:' : 'Active Sections Flow:'}</span>
                  {sections
                    .filter((s) => s.enabled)
                    .map((s, idx) => (
                      <div
                        key={s.id}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[9px]"
                      >
                        <span className="font-semibold">{idx + 1}. {isAr ? s.name_ar : s.name_en}</span>
                        <span className="text-emerald-500 font-bold">✓</span>
                      </div>
                    ))}
                </div>

                {/* Live Preview Button */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] py-1.5"
                    onClick={() => onNavigateToLiveStore(true)}
                  >
                    <Eye className="w-3 h-3 me-1 text-amber-500" />
                    <span>{isAr ? 'فتح المعاينة في تبويب جديد' : 'Open Preview in New Tab'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <Modal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          title={isAr ? 'تأكيد نشر المتجر الإلكتروني الحي' : 'Confirm Live Publish'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? 'سيتم تطبيق كافة التعديلات المحفوظة كمسودة (القالب، البنرات، الأقسام، الشعار، الألوان) ذرياً على المتجر الإلكتروني العام ليراها جميع الزوار فوراً.'
                : 'All draft modifications will be atomically applied to the live public store.'}
            </p>
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
              <span className="font-bold block mb-1">
                {isAr ? 'حماية النسخ السابقة:' : 'Safe Rollback Guarantee:'}
              </span>
              <span>
                {isAr
                  ? 'يتم أرشفة النسخة الحالية تلقائياً، ويمكنك استرجاعها بضغطة زر واحدة في أي وقت.'
                  : 'The current published version is automatically archived and can be restored anytime.'}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowPublishModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="primary" size="sm" disabled={isPublishing} onClick={handlePublish}>
                {isPublishing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'نشر الآن للمتجر الحي' : 'Publish Live Now')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rollback Confirmation Modal */}
      {showRollbackModal && (
        <Modal
          isOpen={showRollbackModal}
          onClose={() => setShowRollbackModal(false)}
          title={isAr ? 'استرجاع النسخة المنشورة السابقة' : 'Rollback to Previous Version'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {isAr
                ? 'هل تريد بالتأكيد التراجع عن آخر نسخة منشورة واستعادة التكوين السابق للمتجر؟'
                : 'Are you sure you want to rollback to the previously archived version?'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowRollbackModal(false)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button variant="outline" size="sm" disabled={isRollingBack} onClick={handleRollback}>
                {isRollingBack ? (isAr ? 'جاري الاسترجاع...' : 'Rolling back...') : (isAr ? 'تأكيد الاسترجاع' : 'Confirm Rollback')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

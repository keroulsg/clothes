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
  Store,
  Plus,
  Compass,
  FileText,
  Link,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { api } from '../../api/client';
import { FashionBoutiqueTemplate } from './templates/FashionBoutiqueTemplate';
import { ModernCatalogTemplate } from './templates/ModernCatalogTemplate';
import { KidsFamilyTemplate } from './templates/KidsFamilyTemplate';
import { PremiumBrandTemplate } from './templates/PremiumBrandTemplate';
import { DEFAULT_HOMEPAGE_SECTIONS, normalizeSectionId } from './common/StorefrontSectionRegistry';
import { StorefrontErrorBoundary } from './common/StorefrontErrorBoundary';
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
    name_ar?: string;
    name_en?: string;
    enabled: boolean;
    alignment?: 'start' | 'center' | 'end';
  }>>(() =>
    DEFAULT_HOMEPAGE_SECTIONS.map((s) => ({
      id: s.id,
      name_ar: s.name_ar,
      name_en: s.name_en,
      enabled: s.enabled,
      alignment: 'start',
    }))
  );

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
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const [importUrlInput, setImportUrlInput] = useState('');
  const [isImportingUrl, setIsImportingUrl] = useState(false);

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

        if (config.sections && Array.isArray(config.sections) && config.sections.length > 0) {
          const seen = new Set<string>();
          const normalized = config.sections
            .map((sec: any, idx: number) => {
              const canonicalId = normalizeSectionId(sec.id);
              const defaultRef = DEFAULT_HOMEPAGE_SECTIONS.find((d) => d.id === canonicalId);
              return {
                ...sec,
                id: canonicalId,
                name_ar: sec.name_ar || sec.name || defaultRef?.name_ar || canonicalId,
                name_en: sec.name_en || sec.name || defaultRef?.name_en || canonicalId,
                enabled: sec.enabled !== false,
                alignment: sec.alignment || 'start',
                order: sec.order ?? idx + 1,
              };
            })
            .filter((sec: any) => {
              if (seen.has(sec.id)) return false;
              seen.add(sec.id);
              return true;
            })
            .sort((a: any, b: any) => a.order - b.order);
          setSections(normalized);
        } else {
          setSections(DEFAULT_HOMEPAGE_SECTIONS as any);
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

      // Fetch representative store products for the live preview
      try {
        const tenantId = data?.store_settings?.tenant_id;
        const storeRes = await api.storefront.getPublicStore(tenantId || undefined, true);
        if (storeRes?.products && Array.isArray(storeRes.products)) {
          setPreviewVariants(storeRes.products);
        }
      } catch {}
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل تحميل بيانات استوديو التصميم' : 'Failed to load design studio'));
    } finally {
      setIsLoading(false);
    }
  };

  const [previewVariants, setPreviewVariants] = useState<any[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [deleteInUseData, setDeleteInUseData] = useState<{ path: string; message: string; used_in: string[] } | null>(null);

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

  // Upload Single or Multiple Media Files Handler
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate size & type for all files
    const validFiles: File[] = [];
    for (const file of fileArray) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg(isAr ? `الملف "${file.name}" يتجاوز الحد المسموح به (5 ميجابايت)` : `File "${file.name}" exceeds 5MB size limit`);
        return;
      }
      if (!file.type.match(/^image\/(jpeg|png|webp|jpg)$/i)) {
        setErrorMsg(isAr ? `نوع الملف "${file.name}" غير مدعوم. يرجى رفع صور JPG أو PNG أو WebP` : `Unsupported file type for "${file.name}"`);
        return;
      }
      validFiles.push(file);
    }

    setIsUploadingMedia(true);
    setUploadProgress(isAr ? `جاري رفع ${validFiles.length} صورة إلى الخادم...` : `Uploading ${validFiles.length} images...`);
    setErrorMsg(null);

    try {
      if (validFiles.length === 1) {
        const res = await api.storefront.uploadMedia(validFiles[0], 'general', validFiles[0].name);
        if (res?.media) {
          setSuccessMsg(isAr ? `تم رفع "${validFiles[0].name}" بنجاح إلى مكتبة الوسائط!` : 'File uploaded successfully!');
          setMediaList((prev) => [res.media, ...prev]);
        }
      } else {
        const res = await api.storefront.uploadMultipleMedia(validFiles, 'general');
        if (res?.media && Array.isArray(res.media)) {
          setSuccessMsg(isAr ? `تم رفع ${res.media.length} صور بنجاح إلى مكتبة الوسائط!` : `${res.media.length} images uploaded successfully!`);
          setMediaList((prev) => [...res.media, ...prev]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل رفع الملفات إلى الخادم' : 'Failed to upload images'));
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
    }
  };

  // Delete Media Handler with In-Use Reference Verification
  const handleDeleteMedia = async (pathOrUrl: string, force = false) => {
    try {
      await api.storefront.deleteMedia(pathOrUrl, force);
      setMediaList((prev) => prev.filter((m) => m.path !== pathOrUrl && m.url !== pathOrUrl));
      setSuccessMsg(isAr ? 'تم حذف الصورة من مكتبة الوسائط بنجاح.' : 'Media deleted successfully.');
      setDeleteInUseData(null);
    } catch (err: any) {
      if (err?.error === 'MediaInUse' || err?.data?.error === 'MediaInUse') {
        setDeleteInUseData({
          path: pathOrUrl,
          message: err?.message || err?.data?.message || (isAr ? 'هذه الصورة قيد الاستخدام حالياً' : 'This media is currently in use'),
          used_in: err?.used_in || err?.data?.used_in || [],
        });
      } else {
        setErrorMsg(err?.message || (isAr ? 'فشل حذف الصورة' : 'Failed to delete image'));
      }
    }
  };

  // Import Media from URL (supports Pinterest, direct image URLs, etc.)
  const handleImportMediaUrl = async (url: string, category = 'general', asLogo = false) => {
    if (!url || !url.trim()) return;
    setIsImportingUrl(true);
    setErrorMsg(null);
    try {
      const res = await api.storefront.importMediaFromUrl(url.trim(), category, asLogo ? 'Store Logo' : undefined);
      if (res?.media) {
        setMediaList((prev) => [res.media, ...prev]);
        if (asLogo) {
          setLogoUrl(res.media.url);
          setSuccessMsg(isAr ? 'تم استيراد الصورة وتعيينها كشعار رسمي للمتجر بنجاح!' : 'Logo imported and updated successfully!');
        } else {
          setSuccessMsg(isAr ? 'تم استيراد الصورة وحفظها في مكتبة الوسائط بنجاح!' : 'Media imported successfully!');
        }
        setImportUrlInput('');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل استيراد الصورة من الرابط' : 'Failed to import media from URL'));
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Upload Logo directly from local file
  const handleUploadLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingMedia(true);
    setUploadProgress(isAr ? 'جاري رفع ملف الشعار...' : 'Uploading logo...');
    setErrorMsg(null);
    try {
      const res = await api.storefront.uploadMedia(file, 'logo', 'Store Logo');
      if (res?.media) {
        setMediaList((prev) => [res.media, ...prev]);
        setLogoUrl(res.media.url);
        setSuccessMsg(isAr ? 'تم رفع الشعار وتعيينه للمتجر بنجاح!' : 'Logo uploaded successfully!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل رفع ملف الشعار' : 'Failed to upload logo'));
    } finally {
      setIsUploadingMedia(false);
      setUploadProgress(null);
      if (e.target) e.target.value = '';
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
      logo_url: logoUrl?.trim() || '',
      announcement_bar_enabled: announcementEnabled,
      announcement_bar_text: announcementText,
      hero_banner: {
        ...heroBanner,
        desktop_image: heroBanner.desktop_image?.trim() || '',
        mobile_image: heroBanner.mobile_image?.trim() || '',
      },
      promo_banners: promoBanners.map((p: any) => ({
        ...p,
        image_url: (p.image_url || p.image || '')?.trim(),
      })),
      sections: sections.map((s: any, idx: number) => ({
        id: normalizeSectionId(s.id),
        name_ar: s.name_ar,
        name_en: s.name_en,
        enabled: s.enabled !== false,
        order: idx + 1,
        alignment: s.alignment || 'start',
      })),
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

  // Direct 1-Click Save & Publish Live
  const handleSaveAndPublishDirect = async () => {
    setIsPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await api.storefront.saveDesignDraft(getFullPayload());
      await api.storefront.publishDesign();
      setSuccessMsg(
        isAr
          ? 'تم حفظ ونشر التعديلات بنجاح إلى المتجر الإلكتروني الحي! الصور والروابط معروضة الآن.'
          : 'Successfully saved and published to live store! Images and banners are now live.'
      );
      await fetchStudio();
    } catch (err: any) {
      setErrorMsg(err?.message || (isAr ? 'فشل حفظ ونشر التعديلات' : 'Failed to publish changes'));
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

  const displayVariants = previewVariants.length > 0 ? previewVariants : [
    {
      id: 'demo-1',
      model_name: isAr ? 'تيشيرت قطن مصري فاخر' : '100% Egyptian Cotton Tee',
      category: isAr ? 'ملابس كاجوال' : 'Casual Wear',
      price: 380,
      in_stock: 45,
      sku: 'TSH-COT-01',
      size: 'L',
      color: isAr ? 'كحلي داكن' : 'Navy',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'demo-2',
      model_name: isAr ? 'قميص بولو كلاسيك' : 'Classic Polo Shirt',
      category: isAr ? 'بولو وتيشرتات' : 'Polos & Tees',
      price: 520,
      in_stock: 30,
      sku: 'POL-CLS-02',
      size: 'XL',
      color: isAr ? 'أبيض' : 'White',
      image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'demo-3',
      model_name: isAr ? 'بنطلون جبردين تصدير' : 'Export Gabardine Trousers',
      category: isAr ? 'بناطيل وجينز' : 'Pants & Denim',
      price: 690,
      in_stock: 18,
      sku: 'PNT-GAB-03',
      size: '34',
      color: isAr ? 'بيج' : 'Beige',
      image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const currentDraftSettings = {
    ...studioConfig?.store_settings,
    store_name: studioConfig?.store_settings?.store_name || (isAr ? 'مصنع الملابس' : 'Store'),
    theme_id: selectedTemplate,
    theme_config: getFullPayload().theme_config,
  };

  const commonTemplateProps = {
    lang,
    isDark: false,
    storeSettings: currentDraftSettings,
    tenantInfo: { name: currentDraftSettings.store_name },
    variants: displayVariants,
    searchQuery: '',
    setSearchQuery: () => {},
    selectedCategory: 'all',
    setSelectedCategory: () => {},
    cartCount: 0,
    onOpenCart: () => {},
    onSelectProduct: () => {},
    onNavigateToTracking: () => {},
    onNavigateToShop: () => {},
    onNavigateToCategories: () => {},
    onNavigateToAbout: () => {},
    onNavigateToContact: () => {},
    onNavigateToPolicies: () => {},
    onToggleTheme: () => {},
    onToggleLang: () => {},
    isPreview: true,
  };

  const renderActiveLiveTemplate = () => {
    let content: React.ReactNode = null;
    switch (selectedTemplate) {
      case 'fashion_boutique':
        content = <FashionBoutiqueTemplate {...commonTemplateProps} />;
        break;
      case 'modern_catalog':
        content = <ModernCatalogTemplate {...commonTemplateProps} />;
        break;
      case 'kids_family':
        content = <KidsFamilyTemplate {...commonTemplateProps} />;
        break;
      case 'premium_brand':
        content = <PremiumBrandTemplate {...commonTemplateProps} />;
        break;
      default:
        content = null;
    }
    return (
      <StorefrontErrorBoundary isAr={isAr}>
        {content}
      </StorefrontErrorBoundary>
    );
  };

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
            title={isAr ? 'معاينة التعديلات غير المنشورة' : 'Preview draft changes'}
          >
            <Eye className="w-3.5 h-3.5 me-1.5 text-amber-500" />
            {isAr ? 'معاينة المسودة' : 'Live Preview'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToLiveStore(false)}
            className="text-xs bg-slate-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400"
            title={isAr ? 'زيارة المتجر الإلكتروني المنشور حالياً' : 'Visit live published store'}
          >
            <Store className="w-3.5 h-3.5 me-1.5" />
            {isAr ? 'زيارة المتجر الحي' : 'Live Store'}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            disabled={isSaving || isPublishing}
            onClick={handleSaveDraft}
            className="text-xs"
          >
            <Save className="w-3.5 h-3.5 me-1.5" />
            {isSaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ مسودة' : 'Save Draft')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isPublishing || isSaving}
            onClick={handleSaveAndPublishDirect}
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold"
            title={isAr ? 'حفظ ونشر التعديلات فوراً على المتجر ليراها العملاء' : 'Save & publish directly to live store'}
          >
            <Send className="w-3.5 h-3.5 me-1.5" />
            {isPublishing ? (isAr ? 'جاري النشر...' : 'Publishing...') : (isAr ? 'حفظ ونشر فوري للمتجر' : 'Save & Publish Live')}
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
                      {mediaList.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'أو اختر من مكتبة الوسائط المرفوعة:' : 'Or pick from uploaded media:'}</span>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {mediaList.slice(0, 6).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setHeroBanner({ ...heroBanner, desktop_image: m.url })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-blue-500 transition cursor-pointer"
                                title={m.title || m.filename}
                              >
                                <img src={api.getMediaUrl(m.url)} alt="thumb" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
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
                      {mediaList.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] text-slate-400 block">{isAr ? 'أو اختر من مكتبة الوسائط المرفوعة:' : 'Or pick from uploaded media:'}</span>
                          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {mediaList.slice(0, 6).map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setHeroBanner({ ...heroBanner, mobile_image: m.url })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-amber-500 transition cursor-pointer"
                                title={m.title || m.filename}
                              >
                                <img src={api.getMediaUrl(m.url)} alt="thumb" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
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
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">{isAr ? 'عنوان العرض' : 'Offer Title'}</label>
                            <input
                              type="text"
                              placeholder={isAr ? 'عنوان العرض...' : 'Offer title...'}
                              value={promo.title}
                              onChange={(e) => {
                                const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, title: e.target.value } : p));
                                setPromoBanners(updated);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">{isAr ? 'كود الخصم أو نص الشارة (Badge)' : 'Coupon Code / Badge'}</label>
                            <input
                              type="text"
                              placeholder={isAr ? 'مثال: FACTORY20 أو خصم 20%...' : 'e.g. FACTORY20 or 20% OFF...'}
                              value={promo.badge_text}
                              onChange={(e) => {
                                const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, badge_text: e.target.value } : p));
                                setPromoBanners(updated);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تفاصيل العرض' : 'Details / Subtitle'}</label>
                            <input
                              type="text"
                              placeholder={isAr ? 'تفاصيل العرض...' : 'Offer details...'}
                              value={promo.subtitle || ''}
                              onChange={(e) => {
                                const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, subtitle: e.target.value } : p));
                                setPromoBanners(updated);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold mb-1">{isAr ? 'وجهة الرابط' : 'Link Destination'}</label>
                            <input
                              type="text"
                              placeholder="shop, categories, https://..."
                              value={promo.link_url || 'shop'}
                              onChange={(e) => {
                                const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, link_url: e.target.value } : p));
                                setPromoBanners(updated);
                              }}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 font-mono"
                            />
                          </div>
                        </div>

                        {/* Promo Banner Image URL with Live Preview & Quick Picker */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {isAr ? 'رابط صورة العرض (Promo Image URL)' : 'Promo Image URL'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={promo.image_url || (promo as any).image || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, image_url: val, image: val } : p));
                                setPromoBanners(updated);
                              }}
                              placeholder="https://... أو /storage/..."
                              className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 font-mono"
                            />
                            {(promo.image_url || (promo as any).image) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, image_url: '', image: '' } : p));
                                  setPromoBanners(updated);
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                title={isAr ? 'مسح الصورة' : 'Clear Image'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {(promo.image_url || (promo as any).image) && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-20 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <img
                                src={api.getMediaUrl(promo.image_url || (promo as any).image)}
                                alt="Promo Preview"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}

                          {mediaList.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 block">
                                {isAr ? 'أو اختر صورة للبنر من مكتبة الوسائط:' : 'Or pick an image from media library:'}
                              </span>
                              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                {mediaList.slice(0, 6).map((m) => (
                                  <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => {
                                      const updated = promoBanners.map((p) => (p.id === promo.id ? { ...p, image_url: m.url, image: m.url } : p));
                                      setPromoBanners(updated);
                                    }}
                                    className="w-9 h-9 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-emerald-500 transition cursor-pointer"
                                    title={m.title || m.filename}
                                  >
                                    <img src={api.getMediaUrl(m.url)} alt="thumb" className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
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
                        <h5 className="font-bold text-xs">{isAr ? sec.name_ar || sec.name_en || sec.id : sec.name_en || sec.name_ar || sec.id}</h5>
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
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg"
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
                    <span>{isUploadingMedia ? (isAr ? 'جاري الرفع...' : 'Uploading...') : (isAr ? 'رفع صور جديدة' : 'Upload Images')}</span>
                  </Button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleUploadFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 shadow-inner'
                    : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-400'
                }`}
              >
                <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-80" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {isAr ? 'اضغط لاختيار الصور أو اسحبها وأفلتها هنا مباشرة' : 'Click to select or drag and drop images here'}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {isAr ? 'يدعم JPG, PNG, WebP حتى 5 ميجابايت لكل صورة — إمكانية رفع عدة صور دفعة واحدة' : 'Supports JPG, PNG, WebP up to 5MB each — multi-file upload ready'}
                </p>
              </div>

              {/* Import from Web URL or Pinterest */}
              <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {isAr ? 'استيراد صورة من رابط ويب أو Pinterest' : 'Import from Web URL or Pinterest'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold px-2 py-0.5 rounded-full">
                    {isAr ? 'يدعم روابط Pinterest الذكية' : 'Pinterest Smart Resolver'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={importUrlInput}
                    onChange={(e) => setImportUrlInput(e.target.value)}
                    placeholder={
                      isAr
                        ? 'ضع رابط Pinterest (مثل: https://pin.it/...) أو رابط صورة مباشر (.jpg, .png, .webp)'
                        : 'Paste Pinterest link (e.g. https://pin.it/...) or direct image URL'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={isImportingUrl || !importUrlInput.trim()}
                    onClick={() => handleImportMediaUrl(importUrlInput, 'general')}
                    className="text-xs shrink-0 flex items-center gap-1.5"
                  >
                    {isImportingUrl ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{isAr ? 'جاري الاستيراد...' : 'Importing...'}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isAr ? 'استيراد وحفظ' : 'Import & Save'}</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-slate-500">
                  {isAr
                    ? '💡 نصيحة: عند وضع رابط من Pinterest، يقوم النظام تلقائياً بفك الرابط وتحميل الصورة الأصلية بأعلى جودة وحفظها في خادمك.'
                    : '💡 Tip: Pasting a Pinterest link will automatically resolve and download the original high-res image.'}
                </p>
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
                        {media.width && media.height && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white font-mono text-[9px] backdrop-blur-xs">
                            {media.width}x{media.height}
                          </span>
                        )}
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
              <div className="space-y-3 text-xs p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleUploadLogoFile}
                />
                <div className="flex items-center justify-between">
                  <label className="block font-bold">{isAr ? 'شعار المتجر الرسمي (Official Store Logo)' : 'Official Store Logo'}</label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حذف الشعار' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Direct Upload Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingMedia}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1.5 border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingMedia ? (isAr ? 'جاري رفع الشعار...' : 'Uploading...') : (isAr ? 'رفع ملف شعار من جهازك' : 'Upload Logo from PC')}</span>
                  </Button>
                  <span className="text-[10px] text-slate-400">{isAr ? 'أو ضع رابط صورة أو Pinterest أدناه:' : 'Or enter URL below:'}</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png أو رابط من Pinterest أو مكتبة الوسائط"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                  {logoUrl && (logoUrl.includes('pin.it') || logoUrl.includes('pinterest.com') || logoUrl.startsWith('http')) && !logoUrl.startsWith('/storage') && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isImportingUrl}
                      onClick={() => handleImportMediaUrl(logoUrl, 'logo', true)}
                      className="text-xs shrink-0 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                      title={isAr ? 'تحميل وحفظ الصورة في الخادم وتعيينها كشعار' : 'Download and save as logo'}
                    >
                      {isImportingUrl ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{isAr ? 'جاري الاستيراد...' : 'Importing...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isAr ? 'استيراد وحفظ كشعار' : 'Import as Logo'}</span>
                        </>
                      )}
                    </Button>
                  )}
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

                {/* Pinterest Detection Tip */}
                {logoUrl && (logoUrl.includes('pin.it') || logoUrl.includes('pinterest.com')) && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] flex items-center justify-between">
                    <span>{isAr ? '💡 تم اكتشاف رابط Pinterest! اضغط على زر "استيراد وحفظ كشعار" لتحميل الصورة الأصلية فوراً.' : '💡 Pinterest link detected! Click "Import as Logo" to download.'}</span>
                  </div>
                )}

                {logoUrl && (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="h-12 w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 overflow-hidden">
                      <img
                        src={api.getMediaUrl(logoUrl)}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{isAr ? 'معاينة الشعار الحالي' : 'Current Logo Preview'}</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'يظهر في أعلى الهيدر بجميع صفحات المتجر' : 'Displays in header across all storefront pages'}</p>
                    </div>
                  </div>
                )}

                {mediaList.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'أو اختر الشعار من مكتبة الوسائط المرفوعة:' : 'Or pick logo from uploaded media:'}</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {mediaList.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLogoUrl(m.url)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-blue-500 transition cursor-pointer p-0.5 bg-white dark:bg-slate-900"
                          title={m.title || m.filename}
                        >
                          <img src={api.getMediaUrl(m.url)} alt="thumb" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                  {isAr ? 'تخصيص الألوان الأساسية، الشعار الرسمي، ونوع الخط العربي للمتجر' : 'Select color theme, official logo, and typography'}
                </p>
              </div>

              {/* Official Store Logo */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold">{isAr ? 'شعار المتجر الرسمي (Official Store Logo)' : 'Official Store Logo'}</label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1 font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حذف الشعار' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Direct Upload Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingMedia}
                    onClick={() => logoFileInputRef.current?.click()}
                    className="text-xs flex items-center gap-1.5 border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingMedia ? (isAr ? 'جاري رفع الشعار...' : 'Uploading...') : (isAr ? 'رفع ملف شعار من جهازك' : 'Upload Logo from PC')}</span>
                  </Button>
                  <span className="text-[10px] text-slate-400">{isAr ? 'أو ضع رابط صورة أو Pinterest أدناه:' : 'Or enter URL below:'}</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png أو رابط من Pinterest أو مكتبة الوسائط"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-xs"
                  />
                  {logoUrl && (logoUrl.includes('pin.it') || logoUrl.includes('pinterest.com') || logoUrl.startsWith('http')) && !logoUrl.startsWith('/storage') && (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isImportingUrl}
                      onClick={() => handleImportMediaUrl(logoUrl, 'logo', true)}
                      className="text-xs shrink-0 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                      title={isAr ? 'تحميل وحفظ الصورة في الخادم وتعيينها كشعار' : 'Download and save as logo'}
                    >
                      {isImportingUrl ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>{isAr ? 'جاري الاستيراد...' : 'Importing...'}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{isAr ? 'استيراد وحفظ كشعار' : 'Import as Logo'}</span>
                        </>
                      )}
                    </Button>
                  )}
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

                {/* Pinterest Detection Tip */}
                {logoUrl && (logoUrl.includes('pin.it') || logoUrl.includes('pinterest.com')) && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] flex items-center justify-between">
                    <span>{isAr ? '💡 تم اكتشاف رابط Pinterest! اضغط على زر "استيراد وحفظ كشعار" لتحميل الصورة الأصلية فوراً.' : '💡 Pinterest link detected! Click "Import as Logo" to download.'}</span>
                  </div>
                )}

                {logoUrl && (
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="h-12 w-28 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center p-1 overflow-hidden">
                      <img
                        src={api.getMediaUrl(logoUrl)}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{isAr ? 'معاينة الشعار الحالي' : 'Current Logo Preview'}</p>
                      <p className="text-[10px] text-slate-400">{isAr ? 'يظهر في أعلى الهيدر بجميع صفحات المتجر' : 'Displays in header across all storefront pages'}</p>
                    </div>
                  </div>
                )}

                {mediaList.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-slate-400 block">{isAr ? 'أو اختر الشعار من مكتبة الوسائط المرفوعة:' : 'Or pick logo from uploaded media:'}</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      {mediaList.slice(0, 6).map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setLogoUrl(m.url)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0 hover:ring-2 hover:ring-blue-500 transition cursor-pointer p-0.5 bg-white dark:bg-slate-900"
                          title={m.title || m.filename}
                        >
                          <img src={api.getMediaUrl(m.url)} alt="thumb" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* Interactive Real Live Template Container */}
            <div
              className={`mx-auto rounded-2xl overflow-hidden border-2 border-slate-300 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-950 transition-all ${
                previewDevice === 'mobile' ? 'max-w-[320px]' : previewDevice === 'tablet' ? 'max-w-[480px]' : 'w-full'
              }`}
            >
              {/* Browser Address Bar with Live Route & Device indicator */}
              <div className="bg-slate-200 dark:bg-slate-800 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-300 border-b border-slate-300 dark:border-slate-700">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                </div>
                <span className="truncate flex-1 text-center bg-white dark:bg-slate-900 rounded px-1.5 py-0.5 mx-2 text-[9px]">
                  store.garmentos.com/#/store?preview=1
                </span>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {previewDevice}
                </span>
              </div>

              {/* Announcement Bar if enabled */}
              {announcementEnabled && (
                <div
                  style={{ backgroundColor: primaryColor }}
                  className="text-white text-[10px] py-1 px-2 text-center font-bold"
                >
                  {announcementText}
                </div>
              )}

              {/* Scrollable Live Template Render Canvas */}
              <div className="max-h-[620px] overflow-y-auto overflow-x-hidden text-start">
                {renderActiveLiveTemplate()}
              </div>

              {/* Viewport Footer Bar */}
              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{isAr ? 'معاينة حية متزامنة فورياً مع التعديلات' : 'Live Connected Preview'}</span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-[10px] py-1 px-2 h-auto"
                  onClick={() => onNavigateToLiveStore(true)}
                >
                  <Eye className="w-3 h-3 me-1 text-amber-500" />
                  <span>{isAr ? 'فتح بنافذة كاملة' : 'Full Window'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media In Use Warning Modal */}
      {deleteInUseData && (
        <Modal
          isOpen={!!deleteInUseData}
          onClose={() => setDeleteInUseData(null)}
          title={isAr ? 'تنبيه: الصورة قيد الاستخدام حالياً' : 'Warning: Media in Active Use'}
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
              <span className="font-bold block mb-1">
                {isAr ? 'هذه الصورة مستخدمة في الأماكن التالية:' : 'This image is currently used in:'}
              </span>
              <ul className="list-disc list-inside space-y-0.5 font-semibold">
                {deleteInUseData.used_in.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              {isAr
                ? 'إذا قمت بالحذف، قد تظهر أماكن استخدام الصورة فارغة في المتجر. يمكنك تأكيد الحذف القسري أو استبدالها أولاً.'
                : 'Deleting will remove the image from the store. You may force delete or replace it first.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteInUseData(null)}>
                {isAr ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => handleDeleteMedia(deleteInUseData.path, true)}
              >
                {isAr ? 'حذف قسري على أي حال' : 'Force Delete Anyway'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

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

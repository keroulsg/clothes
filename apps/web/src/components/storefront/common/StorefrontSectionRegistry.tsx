export type StorefrontSectionId =
  | 'hero'
  | 'trust_badges'
  | 'categories'
  | 'featured_products'
  | 'new_arrivals'
  | 'promotions'
  | 'wholesale_cta'
  | 'story'
  | 'contact_info'
  | 'newsletter'
  | 'custom_content';

export interface StorefrontSectionConfig {
  id: StorefrontSectionId | string;
  name?: string;
  name_ar?: string;
  name_en?: string;
  enabled: boolean;
  order: number;
}

/**
 * Normalizes any section identifier (including legacy aliases) to a canonical section ID
 */
export function normalizeSectionId(rawId: string): StorefrontSectionId {
  const clean = (rawId || '').toLowerCase().trim();
  switch (clean) {
    case 'hero':
    case 'hero_banner':
    case 'banner':
      return 'hero';
    case 'trust_badges':
    case 'badges':
    case 'trust':
      return 'trust_badges';
    case 'categories':
    case 'featured_categories':
    case 'category_filters':
    case 'category':
      return 'categories';
    case 'featured_products':
    case 'catalog_grid':
    case 'products':
    case 'product_grid':
    case 'catalog':
      return 'featured_products';
    case 'new_arrivals':
    case 'latest_drops':
      return 'new_arrivals';
    case 'promotions':
    case 'promo_banner':
    case 'promo_banners':
    case 'banners':
    case 'deals':
      return 'promotions';
    case 'wholesale_cta':
    case 'b2b_cta':
    case 'wholesale':
      return 'wholesale_cta';
    case 'story':
    case 'brand_story':
    case 'about_facility':
    case 'about':
      return 'story';
    case 'contact_info':
    case 'contact':
      return 'contact_info';
    case 'newsletter':
    case 'subscribe':
      return 'newsletter';
    default:
      return clean as StorefrontSectionId;
  }
}

export const DEFAULT_HOMEPAGE_SECTIONS: StorefrontSectionConfig[] = [
  { id: 'hero', name_ar: 'البانر الترويجي الرئيسي', name_en: 'Hero Promotional Banner', enabled: true, order: 1 },
  { id: 'trust_badges', name_ar: 'شارات الجودة وثقة المصنع', name_en: 'Trust & Quality Badges', enabled: true, order: 2 },
  { id: 'categories', name_ar: 'أقسام وتصنيفات الموديلات', name_en: 'Category Filters & Showcase', enabled: true, order: 3 },
  { id: 'featured_products', name_ar: 'الموديلات الجاهزة للشحن', name_en: 'Product Catalog Grid', enabled: true, order: 4 },
  { id: 'promotions', name_ar: 'العروض والخصومات الخاصة', name_en: 'Special Promotions', enabled: true, order: 5 },
  { id: 'wholesale_cta', name_ar: 'دعوة تجار وشركات الجملة', name_en: 'B2B Wholesale Callout', enabled: true, order: 6 },
  { id: 'story', name_ar: 'قصة المصنع والحرفية المصرية', name_en: 'Brand Heritage Story', enabled: true, order: 7 },
  { id: 'contact_info', name_ar: 'بيانات التواصل المباشر', name_en: 'Direct Contact Info', enabled: true, order: 8 },
];

/**
 * Returns sorted active sections according to theme configuration, safely normalizing IDs.
 */
export function getActiveSortedSections(
  configuredSections?: StorefrontSectionConfig[] | null
): StorefrontSectionConfig[] {
  if (!configuredSections || !Array.isArray(configuredSections) || configuredSections.length === 0) {
    return DEFAULT_HOMEPAGE_SECTIONS;
  }

  // Deduplicate and normalize configured sections
  const seenIds = new Set<string>();
  const normalized = configuredSections
    .filter((sec) => sec.enabled !== false)
    .map((sec) => {
      const canonicalId = normalizeSectionId(sec.id);
      return {
        ...sec,
        id: canonicalId,
        order: sec.order ?? 999,
      };
    })
    .filter((sec) => {
      if (seenIds.has(sec.id)) return false;
      seenIds.add(sec.id);
      return true;
    })
    .sort((a, b) => a.order - b.order);

  // If all configured sections ended up disabled or invalid, provide defaults
  if (normalized.length === 0) {
    return DEFAULT_HOMEPAGE_SECTIONS;
  }

  return normalized;
}

/**
 * Safely extracts a clean string from any category representation:
 * string, object ({ name_ar, name, name_en, title, label, id }), number, etc.
 * Never throws, always returns a clean trimmed string.
 */
export function getCategoryString(category: any): string {
  if (category == null) return '';
  if (typeof category === 'string') return category.trim();
  if (typeof category === 'object') {
    const val =
      category.name_ar ||
      category.name ||
      category.name_en ||
      category.title ||
      category.label ||
      category.id ||
      '';
    return typeof val === 'string' ? val.trim() : String(val).trim();
  }
  return String(category).trim();
}


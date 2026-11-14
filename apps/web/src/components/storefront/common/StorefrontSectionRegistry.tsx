export type StorefrontSectionId =
  | 'hero'
  | 'categories'
  | 'promotions'
  | 'featured_products'
  | 'story'
  | 'contact_info'
  | 'newsletter'
  | 'custom_content';

export interface StorefrontSectionConfig {
  id: StorefrontSectionId | string;
  name: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_HOMEPAGE_SECTIONS: StorefrontSectionConfig[] = [
  { id: 'hero', name: 'البانر الترويجي الرئيسي (Hero Banner)', enabled: true, order: 1 },
  { id: 'categories', name: 'تصنيفات المنتجات (Categories Grid)', enabled: true, order: 2 },
  { id: 'promotions', name: 'البانرات الترويجية والعروض (Promotions)', enabled: true, order: 3 },
  { id: 'featured_products', name: 'تشكيلة الموديلات والمنتجات (Products)', enabled: true, order: 4 },
  { id: 'story', name: 'قصة المصنع والجودة (Brand Story)', enabled: true, order: 5 },
  { id: 'contact_info', name: 'بيانات التواصل والمصنع (Contact)', enabled: true, order: 6 },
];

/**
 * Returns sorted active sections according to theme configuration
 */
export function getActiveSortedSections(
  configuredSections?: StorefrontSectionConfig[] | null
): StorefrontSectionConfig[] {
  if (!configuredSections || !Array.isArray(configuredSections) || configuredSections.length === 0) {
    return DEFAULT_HOMEPAGE_SECTIONS;
  }

  // Ensure all configured sections have valid enabled flag and order
  return [...configuredSections]
    .filter((sec) => sec.enabled !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

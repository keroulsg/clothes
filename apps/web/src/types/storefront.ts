export interface StorefrontTenant {
  id: string;
  name: string;
  code?: string;
  subdomain?: string;
  custom_domain?: string | null;
  currency?: string;
}

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
  | 'newsletter';

export interface StorefrontSection {
  id: StorefrontSectionId | string;
  name_ar?: string;
  name_en?: string;
  name?: string;
  enabled: boolean;
  order: number;
}

export interface StorefrontHeroBanner {
  enabled?: boolean;
  badge?: string;
  title?: string;
  subtitle?: string;
  cta_text?: string;
  cta_destination?: string;
  cta_url?: string;
  desktop_image?: string;
  mobile_image?: string;
}

export interface StorefrontPromoBanner {
  id: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  discount_code?: string;
  image_url?: string;
  image?: string;
  link_url?: string;
  bg_color?: string;
  enabled?: boolean;
}

export interface StorefrontThemeConfig {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  bg_color?: string;
  font_family?: string;
  direction?: 'rtl' | 'ltr';
  announcement_bar_enabled?: boolean;
  announcement_bar_text?: string;
  logo_url?: string;
  hero_banner?: StorefrontHeroBanner;
  promo_banners?: StorefrontPromoBanner[];
  sections?: StorefrontSection[];
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  navigation?: {
    header_links?: Array<{ label_ar: string; label_en: string; view: string; enabled: boolean }>;
    footer_links?: Array<{ label_ar: string; label_en: string; view: string; enabled: boolean }>;
  };
  media_library?: Array<{
    id: string;
    filename: string;
    path: string;
    url: string;
    size: number;
    mime_type: string;
    width?: number;
    height?: number;
    created_at: string;
  }>;
}

export interface StorefrontSettings {
  id?: string;
  tenant_id?: string;
  store_name?: string;
  theme_id?: string;
  draft_theme_id?: string | null;
  theme_config?: StorefrontThemeConfig;
  draft_theme_config?: StorefrontThemeConfig | null;
  is_store_enabled?: boolean;
  allow_cod?: boolean;
  allow_instapay?: boolean;
  instapay_handle?: string;
  instapay_account_name?: string;
  currency?: string;
  direction?: 'rtl' | 'ltr';
  banner_title?: string;
  banner_subtitle?: string;
  banner_image?: string;
  contact_whatsapp?: string;
  published_at?: string | null;
}

export interface StorefrontWholesaleTier {
  id?: string;
  min_quantity: number;
  max_quantity?: number | null;
  unit_price: number;
}

export interface StorefrontProductVariant {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  name_ar?: string;
  model_name?: string;
  model_code?: string;
  category?: string;
  description?: string;
  image?: string | null;
  image_url?: string | null;
  gallery?: string[];
  size?: string;
  color?: string;
  price: number;
  in_stock: number;
  is_wholesale?: boolean;
  is_wholesale_eligible?: boolean;
  wholesale_price?: number;
  moq?: number;
  wholesale_tiers?: StorefrontWholesaleTier[];
}

export interface StorefrontCategory {
  id: string;
  name: string;
  name_ar?: string;
  name_en?: string;
  count?: number;
}

export interface StorefrontWholesaleUser {
  id: string;
  company_name: string;
  contact_person: string;
  is_approved: boolean;
  email?: string;
  phone?: string;
}

export interface StorefrontPublicResponse {
  tenant?: StorefrontTenant;
  store_settings?: StorefrontSettings;
  is_preview?: boolean;
  has_draft_changes?: boolean;
  available_themes?: Record<string, any>;
  products: StorefrontProductVariant[];
  variants?: StorefrontProductVariant[];
  catalog?: {
    variants: StorefrontProductVariant[];
    count: number;
  };
  categories?: StorefrontCategory[];
  wholesale_user?: StorefrontWholesaleUser | null;
}

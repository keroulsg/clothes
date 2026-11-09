export interface StorefrontTemplateProps {
  lang: 'ar' | 'en';
  isDark: boolean;
  storeSettings: any;
  tenantInfo: any;
  variants: any[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  onSelectProduct: (product: any) => void;
  onNavigateToTracking: () => void;
  onNavigateToErp?: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  isPreview?: boolean;
}


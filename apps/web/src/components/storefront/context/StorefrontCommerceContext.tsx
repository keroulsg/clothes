import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Language } from '../../../types';

export type StorefrontView =
  | 'home'
  | 'shop'
  | 'category'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'account'
  | 'tracking';

export interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  unit_price: number;
  available_stock: number;
  moq?: number;
  wholesale_tiers?: Array<{ min_quantity: number; unit_price: number }>;
}

export interface WholesaleUser {
  id: string;
  company_name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  is_approved: boolean;
}

export interface CommerceFilters {
  priceMin?: number;
  priceMax?: number;
  size?: string;
  color?: string;
  inStockOnly?: boolean;
  sortBy?: 'default' | 'price_asc' | 'price_desc' | 'stock' | 'newest';
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface StorefrontCommerceContextType {
  // Navigation & Routing
  activeView: StorefrontView;
  setActiveView: (view: StorefrontView) => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: CommerceFilters;
  setFilters: React.Dispatch<React.SetStateAction<CommerceFilters>>;
  navigateToProduct: (productId: string) => void;
  navigateToCategory: (categoryId: string) => void;

  // Cart Management
  cart: CartItem[];
  addToCart: (variant: any, quantity?: number) => boolean;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  cartCount: number;
  subtotal: number;
  shippingQuote: number;
  setShippingQuote: (quote: number) => void;
  couponCode: string;
  setCouponCode: (code: string) => void;
  discountAmount: number;
  applyCoupon: (code: string) => boolean;
  total: number;

  // Wishlist
  wishlist: string[];
  toggleWishlist: (variantId: string) => void;
  isInWishlist: (variantId: string) => boolean;

  // Wholesale / Customer Authentication
  wholesaleUser: WholesaleUser | null;
  isWholesaleApproved: boolean;
  wholesaleToken: string;
  loginWholesale: (token: string, user: WholesaleUser) => void;
  logoutWholesale: () => void;
  isWholesaleModalOpen: boolean;
  setIsWholesaleModalOpen: (open: boolean) => void;

  // Notification Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // General Store State
  currency: string;
  isAr: boolean;
  lang: Language;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onNavigateToTracking: (orderNumber?: string, phone?: string) => void;
  onNavigateToErp?: () => void;
  storeSettings: any;
  tenantInfo: any;
  variants: any[];
}

const StorefrontCommerceContext = createContext<StorefrontCommerceContextType | undefined>(undefined);

interface StorefrontCommerceProviderProps {
  children: ReactNode;
  lang: Language;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onNavigateToTracking: (orderNumber?: string, phone?: string) => void;
  onNavigateToErp?: () => void;
  storeSettings: any;
  tenantInfo: any;
  variants: any[];
  wholesaleToken: string;
  wholesaleUser: WholesaleUser | null;
  onWholesaleLogin: (token: string, user: WholesaleUser) => void;
  onWholesaleLogout: () => void;
}

export const StorefrontCommerceProvider: React.FC<StorefrontCommerceProviderProps> = ({
  children,
  lang,
  isDark,
  onToggleTheme,
  onToggleLang,
  onNavigateToTracking,
  onNavigateToErp,
  storeSettings,
  tenantInfo,
  variants,
  wholesaleToken,
  wholesaleUser,
  onWholesaleLogin,
  onWholesaleLogout,
}) => {
  const isAr = lang === 'ar';
  const currency = storeSettings?.currency || 'EGP';

  // Navigation State
  const [activeView, setActiveView] = useState<StorefrontView>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<CommerceFilters>({
    sortBy: 'default',
    inStockOnly: false,
  });

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [shippingQuote, setShippingQuote] = useState<number>(50);
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Modal State
  const [isWholesaleModalOpen, setIsWholesaleModalOpen] = useState<boolean>(false);

  // Wishlist State (persisted in localStorage)
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('garmentos_storefront_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('garmentos_storefront_wishlist', JSON.stringify(wishlist));
    } catch {
      // Ignore localStorage write errors
    }
  }, [wishlist]);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleWishlist = (variantId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(variantId);
      if (exists) {
        addToast(isAr ? 'تمت الإزالة من المفضلة' : 'Removed from wishlist', 'info');
        return prev.filter((id) => id !== variantId);
      } else {
        addToast(isAr ? 'تمت الإضافة إلى المفضلة' : 'Added to wishlist', 'success');
        return [...prev, variantId];
      }
    });
  };

  const isInWishlist = (variantId: string) => wishlist.includes(variantId);

  // Quick navigation helpers
  const navigateToProduct = (productId: string) => {
    setSelectedProductId(productId);
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setActiveView('category');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart operations with stock limit & wholesale tier calculation
  const addToCart = (variant: any, quantity: number = 1): boolean => {
    const moq = wholesaleUser?.is_approved ? variant.moq || 1 : 1;
    const addQty = Math.max(quantity, moq);
    const available = variant.in_stock ?? variant.stock_quantity ?? 0;

    if (available <= 0) {
      addToast(
        isAr ? 'عذراً، هذا المنتج غير متوفر حالياً في المخزون' : 'Sorry, this product is currently out of stock',
        'error'
      );
      return false;
    }

    const existingIndex = cart.findIndex((item) => item.variant_id === variant.id);
    let newQty = addQty;
    if (existingIndex > -1) {
      newQty = cart[existingIndex].quantity + addQty;
    }

    if (newQty > available) {
      addToast(
        isAr
          ? `الكمية المطلوبة (${newQty}) تتجاوز الرصيد الجاهز المتاح بالمستودع (${available})`
          : `Requested quantity (${newQty}) exceeds available warehouse stock (${available})`,
        'warning'
      );
      return false;
    }

    // Resolve wholesale unit price if applicable
    let unitPrice = variant.price;
    if (wholesaleUser?.is_approved && variant.wholesale_tiers?.length > 0) {
      const applicableTier = [...variant.wholesale_tiers]
        .filter((t: any) => newQty >= t.min_quantity)
        .sort((a: any, b: any) => b.min_quantity - a.min_quantity)[0];
      if (applicableTier) {
        unitPrice = applicableTier.unit_price;
      }
    }

    if (existingIndex > -1) {
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: newQty, unit_price: unitPrice }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          variant_id: variant.id,
          product_name: isAr ? variant.name_ar || variant.name : variant.name,
          sku: variant.sku || '',
          size: variant.size || 'Standard',
          color: variant.color || 'Standard',
          quantity: newQty,
          unit_price: unitPrice,
          available_stock: available,
          moq: moq,
          wholesale_tiers: variant.wholesale_tiers,
        },
      ]);
    }

    addToast(
      isAr ? `تمت إضافة "${variant.name}" إلى سلة المشتريات` : `Added "${variant.name}" to your cart`,
      'success'
    );
    return true;
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart((prev) =>
      prev.map((item) => {
        if (item.variant_id !== variantId) return item;

        const effectiveMoq = wholesaleUser?.is_approved ? item.moq || 1 : 1;
        const clampedQty = Math.max(quantity, effectiveMoq);
        const finalQty = Math.min(clampedQty, item.available_stock);

        // Recalculate tier price
        let unitPrice = item.unit_price;
        if (wholesaleUser?.is_approved && item.wholesale_tiers && item.wholesale_tiers.length > 0) {
          const tier = [...item.wholesale_tiers]
            .filter((t) => finalQty >= t.min_quantity)
            .sort((a, b) => b.min_quantity - a.min_quantity)[0];
          if (tier) {
            unitPrice = tier.unit_price;
          }
        }

        return { ...item, quantity: finalQty, unit_price: unitPrice };
      })
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variantId));
    addToast(isAr ? 'تم حذف العنصر من السلة' : 'Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setCouponCode('');
  };

  const applyCoupon = (code: string): boolean => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return false;

    // Built-in discount coupons (e.g., WELCOME10 for 10% off)
    if (cleanCode === 'WELCOME10') {
      const discount = Math.round(subtotal * 0.1);
      setDiscountAmount(discount);
      addToast(isAr ? 'تم تطبيق كود الخصم (10% خصم)' : 'Coupon applied (10% off)', 'success');
      return true;
    }

    if (cleanCode === 'FREESHIP') {
      setShippingQuote(0);
      addToast(isAr ? 'تم تطبيق كود الشحن المجاني' : 'Free shipping coupon applied', 'success');
      return true;
    }

    addToast(isAr ? 'كود الخصم غير صالح أو منتهي الصلاحية' : 'Invalid or expired coupon code', 'error');
    return false;
  };

  // Cart financial aggregates
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [cart]
  );

  const total = useMemo(
    () => Math.max(0, subtotal + shippingQuote - discountAmount),
    [subtotal, shippingQuote, discountAmount]
  );

  const isWholesaleApproved = !!(wholesaleUser && wholesaleUser.is_approved);

  return (
    <StorefrontCommerceContext.Provider
      value={{
        activeView,
        setActiveView,
        selectedProductId,
        setSelectedProductId,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        filters,
        setFilters,
        navigateToProduct,
        navigateToCategory,
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        cartCount,
        subtotal,
        shippingQuote,
        setShippingQuote,
        couponCode,
        setCouponCode,
        discountAmount,
        applyCoupon,
        total,
        wishlist,
        toggleWishlist,
        isInWishlist,
        wholesaleUser,
        isWholesaleApproved,
        wholesaleToken,
        loginWholesale: onWholesaleLogin,
        logoutWholesale: onWholesaleLogout,
        isWholesaleModalOpen,
        setIsWholesaleModalOpen,
        toasts,
        addToast,
        removeToast,
        currency,
        isAr,
        lang,
        isDark,
        onToggleTheme,
        onToggleLang,
        onNavigateToTracking,
        onNavigateToErp,
        storeSettings,
        tenantInfo,
        variants,
      }}
    >
      {children}
    </StorefrontCommerceContext.Provider>
  );
};

export const useStorefrontCommerce = () => {
  const context = useContext(StorefrontCommerceContext);
  if (!context) {
    throw new Error('useStorefrontCommerce must be used within a StorefrontCommerceProvider');
  }
  return context;
};

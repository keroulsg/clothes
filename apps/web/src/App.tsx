import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Scissors,
  Layers,
  AlertTriangle,
  Plus,
  CheckCircle,
  Calculator,
  ArrowRightLeft,
  Search,
  Filter,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Boxes,
  ShoppingCart,
  Printer,
  DollarSign,
  Truck,
  Receipt,
  Building2,
  Table as TableIcon,
  LayoutGrid,
  Tag,
} from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { ActionsMenu } from './components/ui/ActionsMenu';
import { PageHeader } from './components/ui/PageHeader';
import { Modal } from './components/ui/Modal';
import { LoadingSkeleton } from './components/ui/LoadingSkeleton';
import { Pagination } from './components/ui/Pagination';
import { FabricCalculatorModal } from './components/inventory/FabricCalculatorModal';
import { StockTransactionModal } from './components/inventory/StockTransactionModal';
import { CreateInventoryItemModal } from './components/inventory/CreateInventoryItemModal';
import { ItemBarcodeLabelModal } from './components/inventory/ItemBarcodeLabelModal';
import { LoginModal } from './components/auth/LoginModal';
import { RegisterModal } from './components/auth/RegisterModal';
import { PublicWebsite } from './components/public/PublicWebsite';
import { api, type ApiUser, type ApiTenant } from './api/client';
import { CreateModelModal } from './components/catalog/CreateModelModal';
import { ModelDetailsBomModal } from './components/catalog/ModelDetailsBomModal';
import { CreatePurchaseOrderModal } from './components/procurement/CreatePurchaseOrderModal';
import { ReceiveGoodsModal } from './components/procurement/ReceiveGoodsModal';
import { SupplierInvoiceModal } from './components/procurement/SupplierInvoiceModal';
import { CreateSupplierModal } from './components/procurement/CreateSupplierModal';
import { SupplierStatementModal } from './components/procurement/SupplierStatementModal';
import { CreateProductionOrderModal } from './components/production/CreateProductionOrderModal';
import { CuttingOrderModal } from './components/production/CuttingOrderModal';
import { BundleTrackerModal } from './components/production/BundleTrackerModal';
import { QualityInspectionModal } from './components/production/QualityInspectionModal';
import { CreateJobOrderModal } from './components/subcontracting/CreateJobOrderModal';
import { CustomerMaterialReceiptModal } from './components/subcontracting/CustomerMaterialReceiptModal';
import { ExternalOperationModal } from './components/subcontracting/ExternalOperationModal';
import { JobDeliveryModal } from './components/subcontracting/JobDeliveryModal';
import { JobInvoiceModal } from './components/subcontracting/JobInvoiceModal';
import { JobDetailsModal } from './components/subcontracting/JobDetailsModal';

// Lazy Loaded Business Modules (Phase 2 Performance Code-Splitting)
const PlatformAdminDashboard = lazy(() => import('./components/admin/PlatformAdminDashboard').then(m => ({ default: m.PlatformAdminDashboard })));
const WarehouseManagerTab = lazy(() => import('./components/inventory/WarehouseManagerTab').then(m => ({ default: m.WarehouseManagerTab })));
const SubcontractingTab = lazy(() => import('./components/subcontracting/SubcontractingTab').then(m => ({ default: m.SubcontractingTab })));
const SalesTab = lazy(() => import('./components/sales/SalesTab').then(m => ({ default: m.SalesTab })));
const AccountingTab = lazy(() => import('./components/accounting/AccountingTab').then(m => ({ default: m.AccountingTab })));
const HrTab = lazy(() => import('./components/hr/HrTab').then(m => ({ default: m.HrTab })));
const StorefrontTab = lazy(() => import('./components/storefront/StorefrontTab').then(m => ({ default: m.StorefrontTab })));
const PublicStorefrontView = lazy(() => import('./components/storefront/PublicStorefrontView').then(m => ({ default: m.PublicStorefrontView })));
const PublicOrderTracker = lazy(() => import('./components/storefront/PublicOrderTracker').then(m => ({ default: m.PublicOrderTracker })));
const MaintenanceTab = lazy(() => import('./components/maintenance/MaintenanceTab').then(m => ({ default: m.MaintenanceTab })));
const TenantSubscriptionView = lazy(() => import('./components/subscription/TenantSubscriptionView').then(m => ({ default: m.TenantSubscriptionView })));
const WaslatWorshTab = lazy(() => import('./components/marketplace/WaslatWorshTab').then(m => ({ default: m.WaslatWorshTab })));

const TabLoadingFallback = ({ isAr }: { isAr: boolean }) => (
  <div className="flex flex-col items-center justify-center p-16 space-y-4 min-h-[360px] bg-white/60 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-sm">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <div className="text-center space-y-1">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {isAr ? 'جاري تحميل وحدة النظام...' : 'Loading system module...'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {isAr ? 'يتم جلب الواجهات والبيانات السحابية بأمان' : 'Securely fetching cloud interfaces & data'}
      </p>
    </div>
  </div>
);
import type {
  Language,
  ProductVariant,
  ProductionOrder,

  InventoryItem,
  Branch,
  GarmentModel,
  InventoryTransaction,
  CustomerMaterial,
  Supplier,
  PurchaseOrder,
  GoodsReceiptNote,
  SupplierInvoice,
  Warehouse,
  CuttingOrder,
  CuttingBundle,
  QualityInspection,
  Customer,
  JobOrder,
  CustomerMaterialReceipt,
  ExternalOperation,
  JobDeliveryNote,
  JobInvoice,
} from './types';

export function App() {
  // URL Parameter Helper (supports both ?param=val before hash and inside hash)
  const getUrlParam = (key: string): string | null => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.has(key)) return searchParams.get(key);
      const hashIdx = window.location.hash.indexOf('?');
      if (hashIdx !== -1) {
        const hashParams = new URLSearchParams(window.location.hash.substring(hashIdx + 1));
        if (hashParams.has(key)) return hashParams.get(key);
      }
    } catch {}
    return null;
  };

  // Language Persistence State
  const [lang, setLang] = useState<Language>(() => {
    try {
      const urlLang = getUrlParam('lang');
      if (urlLang === 'en' || urlLang === 'ar') return urlLang;
      const saved = localStorage.getItem('garmentos_lang');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch {}
    return 'ar';
  });

  const toggleLang = () => {
    setLang((prev) => {
      const next = prev === 'ar' ? 'en' : 'ar';
      try {
        localStorage.setItem('garmentos_lang', next);
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
  }, [lang]);

  // Theme Persistence & System Default
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const urlTheme = getUrlParam('theme');
      if (urlTheme === 'dark') return true;
      if (urlTheme === 'light') return false;
      const saved = localStorage.getItem('garmentos_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('garmentos_theme', next ? 'dark' : 'light');
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-coreui-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.removeAttribute('data-theme');
      document.documentElement.setAttribute('data-coreui-theme', 'light');
    }
  }, [isDark]);

  const isAr = lang === 'ar';

  // Real Authentication & User State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(api.isAuthenticated());
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(api.auth.getStoredUser());

  // Deep-Link Route Parser
  const parseCurrentRoute = () => {
    const hashClean = window.location.hash.split('?')[0];
    const raw = hashClean.replace(/^#\/?/, '').toLowerCase().trim();
    const hostname = window.location.hostname.toLowerCase();

    // ERP valid tabs definition
    const erpTabs = [
      'dashboard',
      'models',
      'cutting',
      'subcontracting',
      'maintenance',
      'inventory',
      'purchasing',
      'sales',
      'costing',
      'piece_rate',
      'storefront',
      'settings',
    ];

    const erpAliases: Record<string, string> = {
      sales: 'sales',
      pos: 'sales',
      accounting: 'costing',
      costing: 'costing',
      hr: 'piece_rate',
      piece_rate: 'piece_rate',
      payroll: 'piece_rate',
      storefront: 'storefront',
      boms: 'models',
      bom: 'models',
      machines: 'maintenance',
      assets: 'maintenance',
      cmt: 'subcontracting',
      fabric: 'inventory',
      warehouse: 'inventory',
      po: 'purchasing',
      procurement: 'purchasing',
    };

    // 1. Tenant Subdomain Detection (e.g., alnoorkids.garmentos.local or tenant.localhost)
    const isSubdomain =
      hostname.split('.').length > 2 || (hostname.endsWith('.localhost') && hostname !== 'localhost');
    const isReserved = ['admin', 'api', 'www', 'app'].some((s) => hostname.startsWith(`${s}.`));

    if (isSubdomain && !isReserved) {
      const tenantSlug = hostname.split('.')[0];
      if (raw === 'track' || raw.startsWith('track') || raw === 'store/track') {
        return { mode: 'store_track' as const, tenantSlug };
      }
      return { mode: 'store' as const, tenantSlug };
    }

    // 2. Dedicated App Subdomain (e.g. app.garmentos.local or app.localhost)
    const isAppHost = hostname.startsWith('app.') || hostname === 'app.localhost';
    if (isAppHost) {
      if (!api.isAuthenticated()) {
        return { mode: 'public' as const, publicPage: 'home', openLogin: true };
      }
      const storedRole = api.auth.getStoredUser()?.role;
      if (storedRole === 'platform_admin') {
        return { mode: 'admin' as const, tab: 'overview' };
      }
      if (raw.startsWith('erp/')) {
        const tab = raw.replace('erp/', '');
        return { mode: 'erp' as const, tab: erpTabs.includes(tab) ? tab : 'dashboard' };
      }
      if (erpTabs.includes(raw)) {
        return { mode: 'erp' as const, tab: raw };
      }
      return { mode: 'erp' as const, tab: 'dashboard' };
    }

    // 3. Dedicated Admin Subdomain (e.g. admin.garmentos.local or admin.localhost)
    const isAdminHost = hostname.startsWith('admin.') || hostname === 'admin.localhost';
    if (isAdminHost) {
      if (!api.isAuthenticated()) {
        return { mode: 'public' as const, publicPage: 'home', openLogin: true };
      }
      const storedRole = api.auth.getStoredUser()?.role;
      if (storedRole !== 'platform_admin') {
        return { mode: 'erp' as const, tab: 'dashboard' };
      }
      const parts = raw.split('/');
      return { mode: 'admin' as const, tab: parts[1] || 'overview' };
    }

    // 4. Standalone Public Storefront & Customer Order Tracking Routes
    if (raw === 'store/track' || raw.startsWith('store/track') || raw === 'track' || raw.startsWith('track/')) {
      const parts = raw.split('/');
      const slug = parts[1] && parts[1] !== 'track' ? parts[1] : undefined;
      return { mode: 'store_track' as const, tenantSlug: slug };
    }
    if (raw.startsWith('store/') || raw.startsWith('shop/')) {
      const slug = raw.replace(/^(store|shop)\//, '').trim();
      return { mode: 'store' as const, tenantSlug: slug };
    }
    if (raw === 'store' || raw === 'shop') {
      return { mode: 'store' as const, tenantSlug: undefined };
    }

    // 5. Public Independent Marketing & Solutions Pages (Evaluated BEFORE ERP to prevent false dashboard redirects)
    const publicPages = [
      'features',
      'manufacturing',
      'inventory',
      'costing',
      'workforce',
      'subcontracting',
      'storefront',
      'pricing',
      'about',
      'contact',
      'demo',
      'request-demo',
      'faq',
      'privacy',
      'terms',
      'refund',
      'cookies',
      'ip',
    ];

    if (raw === 'request-demo' || raw === 'demo') {
      return { mode: 'public' as const, publicPage: 'contact' };
    }

    if (raw.startsWith('features/')) {
      const sub = raw.replace('features/', '');
      if (sub === 'cutting') return { mode: 'public' as const, publicPage: 'manufacturing' };
      if (publicPages.includes(sub)) {
        return { mode: 'public' as const, publicPage: sub };
      }
      return { mode: 'public' as const, publicPage: 'features' };
    }

    if (raw === 'features/cutting' || raw === 'cutting-features') {
      return { mode: 'public' as const, publicPage: 'manufacturing' };
    }

    if (publicPages.includes(raw)) {
      return { mode: 'public' as const, publicPage: raw };
    }

    // 6. Dedicated Application / Login Entry Hash (#/app, #/app/login, #/login)
    if (raw === 'app' || raw.startsWith('app/')) {
      if (!api.isAuthenticated()) {
        try { sessionStorage.setItem('intended_destination', window.location.hash || '#/erp/dashboard'); } catch {}
        return { mode: 'public' as const, publicPage: 'home', openLogin: true };
      }
      const storedRole = api.auth.getStoredUser()?.role;
      if (storedRole === 'platform_admin') {
        return { mode: 'admin' as const, tab: 'overview' };
      }
      const sub = raw.replace(/^app\/?/, '');
      return { mode: 'erp' as const, tab: erpTabs.includes(sub) ? sub : 'dashboard' };
    }

    if (raw === 'login') {
      if (api.isAuthenticated()) {
        const storedRole = api.auth.getStoredUser()?.role;
        if (storedRole === 'platform_admin') {
          return { mode: 'admin' as const, tab: 'overview' };
        }
        return { mode: 'erp' as const, tab: 'dashboard' };
      }
      return { mode: 'public' as const, publicPage: 'home', openLogin: true };
    }

    // 7. Platform Admin Routes
    if (raw === 'admin' || raw.startsWith('admin/')) {
      if (!api.isAuthenticated()) {
        try { sessionStorage.setItem('intended_destination', window.location.hash || '#/admin'); } catch {}
        return { mode: 'public' as const, publicPage: 'home', openLogin: true };
      }
      const storedRole = api.auth.getStoredUser()?.role;
      if (storedRole === 'platform_admin') {
        const parts = raw.split('/');
        return { mode: 'admin' as const, tab: parts[1] || 'overview' };
      }
      return { mode: 'erp' as const, tab: 'dashboard' };
    }

    // 8. Protected Factory ERP Routes (Must explicitly start with erp/)
    if (raw === 'erp' || raw.startsWith('erp/')) {
      if (!api.isAuthenticated()) {
        try { sessionStorage.setItem('intended_destination', window.location.hash || '#/erp/dashboard'); } catch {}
        return { mode: 'public' as const, publicPage: 'home', openLogin: true };
      }
      const storedRole = api.auth.getStoredUser()?.role;
      if (storedRole === 'platform_admin') {
        return { mode: 'admin' as const, tab: 'overview' };
      }
      let tab = raw.replace(/^erp\/?/, '').trim();
      if (!tab) tab = 'dashboard';
      if (erpAliases[tab]) tab = erpAliases[tab];
      return { mode: 'erp' as const, tab: erpTabs.includes(tab) ? tab : 'dashboard' };
    }

    // 9. Auth Action Shortcuts
    if (raw === 'register') return { mode: 'public' as const, publicPage: 'home', openRegister: true };

    // 10. Root Path (http://localhost:5173/ or http://garmentos.local:5173/ or #/)
    // ALWAYS renders the official GarmentOS corporate/marketing public website first!
    return { mode: 'public' as const, publicPage: 'home' };

    // 9. Auth Action Shortcuts
    if (raw === 'register') return { mode: 'public' as const, publicPage: 'home', openRegister: true };

    // 10. Root Path (http://localhost:5173/ or http://garmentos.local:5173/ or #/)
    // ALWAYS renders the official GarmentOS public website first!
    return { mode: 'public' as const, publicPage: 'home' };
  };

  const initialRoute = parseCurrentRoute();
  const [viewMode, setViewMode] = useState<'public' | 'erp' | 'admin' | 'store' | 'store_track'>(() => {
    return initialRoute.mode;
  });
  const [storeTenantSlug, setStoreTenantSlug] = useState<string | undefined>((initialRoute as any).tenantSlug);
  const [trackOrderInitial, setTrackOrderInitial] = useState<{ orderNumber?: string; phone?: string }>({});
  const [publicPage, setPublicPage] = useState<string>((initialRoute as any).publicPage || 'home');
  const [activeTab, setActiveTab] = useState<string>((initialRoute as any).tab || 'dashboard');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(!!(initialRoute as any).openLogin);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(!!(initialRoute as any).openRegister);
  const [registerPlanTier, setRegisterPlanTier] = useState<string>('starter');
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Synchronize route hash changes (Browser Back/Forward & Bookmarks)
  useEffect(() => {
    const onHashChange = () => {
      const r = parseCurrentRoute();
      if (r.mode === 'admin') {
        setViewMode('admin');
      } else if (r.mode === 'store') {
        setViewMode('store');
        if ((r as any).tenantSlug) setStoreTenantSlug((r as any).tenantSlug);
      } else if (r.mode === 'store_track') {
        setViewMode('store_track');
      } else {
        setViewMode(r.mode);
        if ((r as any).tab) setActiveTab((r as any).tab);
        if ((r as any).publicPage) setPublicPage((r as any).publicPage);
      }
      if ((r as any).openLogin) setIsLoginModalOpen(true);
      if ((r as any).openRegister) setIsRegisterModalOpen(true);
      if ((r as any).scrollTo) {
        setTimeout(() => {
          const el = document.getElementById((r as any).scrollTo!);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    };

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToRoute = (mode: 'public' | 'erp' | 'admin' | 'store' | 'store_track', tab?: string, page?: string, slug?: string) => {
    setViewMode(mode);
    if (tab) setActiveTab(tab);
    if (page) setPublicPage(page);
    if (slug) setStoreTenantSlug(slug);
    if (mode === 'public') {
      const target = page || publicPage || 'home';
      window.location.hash = target === 'home' ? '#/' : `#/${target}`;
    } else if (mode === 'admin') {
      window.location.hash = '#/admin';
    } else if (mode === 'erp') {
      window.location.hash = `#/erp/${tab || activeTab}`;
    } else if (mode === 'store') {
      window.location.hash = slug ? `#/store/${slug}` : '#/store';
    } else if (mode === 'store_track') {
      window.location.hash = '#/store/track';
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (viewMode === 'erp') {
      window.location.hash = `#/erp/${newTab}`;
    }
  };

  // Multi-Tenancy Current State
  const [tenantName, setTenantName] = useState<string>(
    api.auth.getStoredTenant()?.name || (isAr ? 'مصنع النيل لملابس الأطفال' : 'Nile Garment Factory')
  );
  const [tenantCode, setTenantCode] = useState<string>(
    api.auth.getStoredTenant()?.code || 'MFG-EG901'
  );
  const [branchName, setBranchName] = useState<string>(
    isAr ? 'المصنع وصالة القص الرئيسية' : 'Main Factory & Cutting Floor'
  );

  // Modals state
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isFabricCalcOpen, setIsFabricCalcOpen] = useState(false);
  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<InventoryItem | null>(null);
  const [selectedModelForBom, setSelectedModelForBom] = useState<GarmentModel | null>(null);
  const [isCreateInventoryItemModalOpen, setIsCreateInventoryItemModalOpen] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState<InventoryItem | null>(null);

  // Procurement States
  const [isCreatePoModalOpen, setIsCreatePoModalOpen] = useState(false);
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState(false);
  const [selectedSupplierForStatement, setSelectedSupplierForStatement] = useState<Supplier | null>(null);
  const [isSupplierStatementOpen, setIsSupplierStatementOpen] = useState(false);
  const [selectedPoForReceipt, setSelectedPoForReceipt] = useState<PurchaseOrder | null>(null);
  const [selectedPoForInvoice, setSelectedPoForInvoice] = useState<PurchaseOrder | null>(null);

  // Production & Cutting States
  const [isCreateProdOrderModalOpen, setIsCreateProdOrderModalOpen] = useState(false);
  const [selectedProdOrderForCut, setSelectedProdOrderForCut] = useState<ProductionOrder | null>(null);
  const [selectedBundleForTracker, setSelectedBundleForTracker] = useState<CuttingBundle | null>(null);
  const [selectedProdOrderForQc, setSelectedProdOrderForQc] = useState<ProductionOrder | null>(null);
  const [selectedBundleForQc, setSelectedBundleForQc] = useState<CuttingBundle | null>(null);

  // Subcontracting & CMT States (Phase 6)
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState(false);
  const [isReceiveCustomerMatModalOpen, setIsReceiveCustomerMatModalOpen] = useState(false);
  const [isExternalOpModalOpen, setIsExternalOpModalOpen] = useState(false);
  const [selectedOpForReceive, setSelectedOpForReceive] = useState<ExternalOperation | null>(null);
  const [selectedJobForDelivery, setSelectedJobForDelivery] = useState<JobOrder | null>(null);
  const [selectedJobForInvoice, setSelectedJobForInvoice] = useState<JobOrder | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<JobOrder | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: 'sup-1',
      code: 'SUP-TEX-01',
      name: 'شركة مصر للغزل والنسيج (المحلة)',
      contact_person: 'م. أحمد شكري',
      phone: '+201002345678',
      tax_id: '100-244-901',
      payment_terms: 'net_30',
      current_balance: 114000.0,
    },
    {
      id: 'sup-2',
      code: 'SUP-ACC-02',
      name: 'الشركة السويسرية للمستلزمات والسوست',
      contact_person: 'أ. طارق عبد العليم',
      phone: '+201223456789',
      tax_id: '200-456-789',
      payment_terms: 'net_15',
      current_balance: 18500.0,
    },
  ]);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'po-201',
      po_number: 'PO-202610-091',
      supplier_id: 'sup-1',
      supplier_name: 'شركة مصر للغزل والنسيج (المحلة)',
      warehouse_id: 'wh-1',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      order_date: '2026-10-10',
      expected_delivery_date: '2026-10-20',
      status: 'approved',
      subtotal: 100000.0,
      tax_amount: 14000.0,
      total_amount: 114000.0,
      items: [
        {
          id: 'poi-1',
          inventory_item_id: 'mat-1',
          item_name: 'قماش سينجل جيرسي قطن 100% كحلي (180 GSM)',
          item_code: 'FAB-COT-BLU',
          ordered_quantity: 1000,
          received_quantity: 0,
          remaining_quantity: 1000,
          unit_price: 100.0,
          total_price: 114000.0,
        },
      ],
    },
    {
      id: 'po-202',
      po_number: 'PO-202610-092',
      supplier_id: 'sup-2',
      supplier_name: 'الشركة السويسرية للمستلزمات',
      warehouse_id: 'wh-3',
      warehouse_name: 'مخزن المستلزمات',
      order_date: '2026-10-12',
      status: 'draft',
      subtotal: 12500.0,
      tax_amount: 1750.0,
      total_amount: 14250.0,
      items: [
        {
          id: 'poi-2',
          inventory_item_id: 'mat-3',
          item_name: 'أزرار كبس بلاستيك بيضاء',
          item_code: 'ACC-SNP-WHT',
          ordered_quantity: 50000,
          received_quantity: 0,
          remaining_quantity: 50000,
          unit_price: 0.25,
          total_price: 14250.0,
        },
      ],
    },
  ]);

  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<GoodsReceiptNote[]>([
    {
      id: 'grn-1',
      grn_number: 'GRN-202610-001',
      po_number: 'PO-202610-088',
      supplier_name: 'شركة مصر للغزل والنسيج',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      receipt_date: '2026-10-12',
      quality_inspector_name: 'م. طارق كمال',
      inspection_status: 'passed',
      accepted_quantity: 500,
      rejected_quantity: 0,
    },
  ]);

  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([
    {
      id: 'sinv-1',
      invoice_number: 'INV-MISR-9941',
      internal_reference: 'SINV-202610-044',
      supplier_name: 'شركة مصر للغزل والنسيج',
      po_number: 'PO-202610-088',
      invoice_date: '2026-10-12',
      due_date: '2026-11-12',
      subtotal: 50000.0,
      tax_amount: 7000.0,
      total_amount: 57000.0,
      matching_status: 'matched',
      payment_status: 'unpaid',
    },
  ]);

  // Subcontracting & CMT Datasets (Phase 6)
  const [customers, setCustomers] = useState<Customer[]>([
    {
      id: 'cust-1',
      code: 'CUST-CAIRO-01',
      name: 'شركة كايرو فاشون لملابس الأطفال',
      contact_person: 'أ. طارق رضوان',
      phone: '+201011223344',
      tax_id: '400-891-234',
      is_active: true,
      job_orders_count: 2,
      material_receipts_count: 1,
    },
    {
      id: 'cust-2',
      code: 'CUST-ALEX-02',
      name: 'براند إسكندرية كيدز',
      contact_person: 'م. يوسف كامل',
      phone: '+201099887766',
      tax_id: '500-123-789',
      is_active: true,
      job_orders_count: 1,
      material_receipts_count: 1,
    },
  ]);

  const [jobOrders, setJobOrders] = useState<JobOrder[]>([
    {
      id: 'job-101',
      order_number: 'JOB-202610-001',
      customer_id: 'cust-1',
      customer_name: 'شركة كايرو فاشون لملابس الأطفال',
      service_type: 'contract_cutting',
      garment_model_id: 'mod-1',
      model_name: 'تيشيرت بولو صيفي أطفال',
      fabric_source: 'customer_supplied',
      trims_responsibility: 'customer_supplied',
      status: 'in_progress',
      pricing_basis: 'per_piece',
      unit_rate: 6.5,
      total_target_quantity: 400,
      total_received_meters: 250.0,
      total_cut_quantity: 400,
      total_accepted_quantity: 400,
      total_rejected_quantity: 0,
      total_rework_quantity: 0,
      total_delivered_quantity: 200,
      planned_start_date: '2026-10-12',
      target_delivery_date: '2026-10-22',
      created_at: '2026-10-12T09:00:00Z',
      items: [
        { color_name: 'أحمر', size_name: '4-5 سنوات', target_quantity: 200, cut_quantity: 200, delivered_quantity: 100, unit_rate: 6.5 },
        { color_name: 'كحلي', size_name: '6-7 سنوات', target_quantity: 200, cut_quantity: 200, delivered_quantity: 100, unit_rate: 6.5 },
      ],
    },
    {
      id: 'job-102',
      order_number: 'JOB-202610-002',
      customer_id: 'cust-2',
      customer_name: 'براند إسكندرية كيدز',
      service_type: 'cmt',
      garment_model_id: 'mod-2',
      model_name: 'بنطلون جبردين مطرز أطفال',
      fabric_source: 'mixed',
      trims_responsibility: 'factory_supplied',
      status: 'confirmed',
      pricing_basis: 'per_piece',
      unit_rate: 28.0,
      total_target_quantity: 300,
      total_received_meters: 220.0,
      total_cut_quantity: 0,
      total_accepted_quantity: 0,
      total_rejected_quantity: 0,
      total_rework_quantity: 0,
      total_delivered_quantity: 0,
      planned_start_date: '2026-10-14',
      target_delivery_date: '2026-10-28',
      created_at: '2026-10-14T11:30:00Z',
      items: [
        { color_name: 'بيج', size_name: '4-5 سنوات', target_quantity: 150, cut_quantity: 0, delivered_quantity: 0, unit_rate: 28.0 },
        { color_name: 'زيتي', size_name: '6-7 سنوات', target_quantity: 150, cut_quantity: 0, delivered_quantity: 0, unit_rate: 28.0 },
      ],
    },
  ]);

  const [customerMaterialReceipts, setCustomerMaterialReceipts] = useState<CustomerMaterialReceipt[]>([
    {
      id: 'cmr-1',
      receipt_number: 'CMR-202610-001',
      job_order_id: 'job-101',
      customer_name: 'شركة كايرو فاشون لملابس الأطفال',
      warehouse_id: 'wh-2',
      warehouse_name: 'مخزن أمانات خامات العملاء',
      fabric_name: 'سنغل ليكرا قطن أحمر 180GSM',
      fabric_code: 'FAB-CUST-901',
      received_meters: 250.0,
      received_weight_kg: 74.25,
      usable_width_meters: 1.65,
      gsm: 180.0,
      rolls_count: 5,
      condition_status: 'accepted',
      inspector_name: 'م. حسام شكري',
      created_at: '2026-10-12T10:00:00Z',
    },
  ]);

  const [externalOperations, setExternalOperations] = useState<ExternalOperation[]>([
    {
      id: 'ext-1',
      operation_number: 'EXT-202610-001',
      job_order_id: 'job-102',
      subcontractor_name: 'مطبعة الأهرام للتطريز والترانسفير',
      operation_type: 'embroidery',
      sent_quantity: 300,
      received_accepted_quantity: 295,
      received_rejected_quantity: 2,
      scrap_quantity: 3,
      unit_rate: 4.5,
      total_cost: 1350.0,
      status: 'completed',
      dispatched_at: '2026-10-14T12:00:00Z',
      returned_at: '2026-10-15T09:00:00Z',
    },
  ]);

  const [jobDeliveryNotes, setJobDeliveryNotes] = useState<JobDeliveryNote[]>([
    {
      id: 'jdn-1',
      delivery_number: 'JDN-202610-001',
      job_order_id: 'job-101',
      order_number: 'JOB-202610-001',
      customer_name: 'شركة كايرو فاشون لملابس الأطفال',
      delivery_date: '2026-10-14',
      status: 'delivered',
      total_delivered_pieces: 200,
      returned_unused_fabric_meters: 15.0,
      scrap_fabric_meters: 8.5,
      delivered_by: 'سائق سيارة المصنع',
      received_by_customer: 'أ. طارق رضوان (توقيع استلام)',
      items: [
        { color_name: 'أحمر', size_name: '4-5 سنوات', delivered_quantity: 100 },
        { color_name: 'كحلي', size_name: '6-7 سنوات', delivered_quantity: 100 },
      ],
    },
  ]);

  const [jobInvoices, setJobInvoices] = useState<JobInvoice[]>([
    {
      id: 'jinv-1',
      invoice_number: 'JINV-202610-001',
      job_order_id: 'job-101',
      order_number: 'JOB-202610-001',
      customer_name: 'شركة كايرو فاشون لملابس الأطفال',
      invoice_date: '2026-10-14',
      due_date: '2026-11-14',
      status: 'issued',
      service_amount: 1300.0,
      additional_charges: 100.0,
      deductions: 0.0,
      tax_amount: 196.0,
      total_amount: 1596.0,
      paid_amount: 0.0,
      items: [
        { description: 'أجور قص 200 قطعة تيشيرت', item_type: 'service_charge', quantity: 200, unit_rate: 6.5, total_amount: 1300.0 },
        { description: 'تغليف خاص بأكياس مفرغة', item_type: 'extra_operation', quantity: 1, unit_rate: 100.0, total_amount: 100.0 },
      ],
    },
  ]);

  // New Company Form state
  const [newCompanyForm, setNewCompanyForm] = useState({
    companyName: '',
    subdomain: '',
    ownerName: '',
    email: '',
    plan: 'professional',
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [companySuccessMsg, setCompanySuccessMsg] = useState('');

  // Search & Filter state
  const [modelViewMode, setModelViewMode] = useState<'table' | 'cards'>('table');
  const [modelSearch, setModelSearch] = useState('');
  const [modelCategoryFilter, setModelCategoryFilter] = useState('all');

  // Garment Models State
  const [models, setModels] = useState<GarmentModel[]>([
    {
      id: 'gm-1',
      code: 'MOD-KID-081',
      name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      category: 'طقم أولادي قطن',
      season: 'صيف 2026',
      target_cost: 95.0,
      wholesale_price: 155.0,
      retail_price: 220.0,
      variants_count: 12,
      status: 'active',
      created_at: '2026-10-10',
    },
    {
      id: 'gm-2',
      code: 'MOD-INF-019',
      name: 'سالوبيت مواليد قطن 100% مطبوع ديجيتال',
      category: 'سالوبيت مواليد',
      season: 'صيف 2026',
      target_cost: 65.0,
      wholesale_price: 110.0,
      retail_price: 165.0,
      variants_count: 8,
      status: 'active',
      created_at: '2026-10-12',
    },
    {
      id: 'gm-3',
      code: 'MOD-GRL-044',
      name: 'فستان بناتي تول ناعم مع بطانة قطن',
      category: 'فستان بناتي تول',
      season: 'أعياد 2026',
      target_cost: 130.0,
      wholesale_price: 210.0,
      retail_price: 295.0,
      variants_count: 6,
      status: 'active',
      created_at: '2026-10-14',
    },
  ]);

  // Product Variants State for Sales, POS & Storefront
  const [productVariants] = useState<ProductVariant[]>([

    {
      id: 'pv-1',
      garment_model_id: 'gm-1',
      sku: 'POLO-NAVY-2Y',
      barcode: '6221000101',
      wholesale_price: 155,
      retail_price: 220,
      garment_model: { id: 'gm-1', name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)', code: 'MOD-KID-081' } as any,
      size: { id: 's1', name: '2Y' } as any,
      color: { id: 'c1', name: 'كحلي غامق' } as any,
    },
    {
      id: 'pv-2',
      garment_model_id: 'gm-1',
      sku: 'POLO-RED-4Y',
      barcode: '6221000102',
      wholesale_price: 155,
      retail_price: 220,
      garment_model: { id: 'gm-1', name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)', code: 'MOD-KID-081' } as any,
      size: { id: 's2', name: '4Y' } as any,
      color: { id: 'c2', name: 'أحمر زاهي' } as any,
    },
    {
      id: 'pv-3',
      garment_model_id: 'gm-2',
      sku: 'INF-ROM-3M',
      barcode: '6221000103',
      wholesale_price: 110,
      retail_price: 165,
      garment_model: { id: 'gm-2', name: 'سالوبيت مواليد قطن 100% مطبوع', code: 'MOD-INF-019' } as any,
      size: { id: 's3', name: '3-6M' } as any,
      color: { id: 'c3', name: 'أبيض / سماوي' } as any,
    },
  ]);

  // Production Orders State

  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([
    {
      id: 'po-101',
      order_number: 'PO-2026-081',
      model_name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      model_code: 'MOD-KID-081',
      category: 'أولادي (2-4 سنوات)',
      target_quantity: 1200,
      planned_quantity: 1200,
      cut_quantity: 1200,
      completed_quantity: 810,
      sewn_quantity: 840,
      qc_passed_quantity: 810,
      waste_percentage: 2.8,
      status: 'in_progress',
      priority: 'high',
      due_date: '2026-10-25',
      target_delivery_date: '2026-10-25',
      items: [
        { id: '1', color_name: 'كحلي غامق', size_name: '2Y', planned_quantity: 600, cut_quantity: 600, completed_quantity: 405, color_id: 'c1', size_id: 's1' },
        { id: '2', color_name: 'أحمر زاهي', size_name: '4Y', planned_quantity: 600, cut_quantity: 600, completed_quantity: 405, color_id: 'c2', size_id: 's2' },
      ],
    },
    {
      id: 'po-102',
      order_number: 'PO-2026-082',
      model_name: 'سالوبيت مواليد قطن 100% مطبوع',
      model_code: 'MOD-INF-019',
      category: 'حديثي ولادة (3-6 شهور)',
      target_quantity: 2000,
      planned_quantity: 2000,
      cut_quantity: 2000,
      completed_quantity: 1920,
      sewn_quantity: 1950,
      qc_passed_quantity: 1920,
      waste_percentage: 1.9,
      status: 'in_progress',
      priority: 'urgent',
      due_date: '2026-10-20',
      target_delivery_date: '2026-10-20',
      items: [
        { id: '3', color_name: 'أبيض لؤلؤي', size_name: '0-3M', planned_quantity: 1000, cut_quantity: 1000, completed_quantity: 960, color_id: 'c3', size_id: 's3' },
        { id: '4', color_name: 'سماوي ناعم', size_name: '3-6M', planned_quantity: 1000, cut_quantity: 1000, completed_quantity: 960, color_id: 'c4', size_id: 's4' },
      ],
    },
    {
      id: 'po-103',
      order_number: 'PO-2026-083',
      model_name: 'فستان بناتي تول ناعم مع بطانة قطن',
      model_code: 'MOD-GRL-044',
      category: 'بناتي (4-6 سنوات)',
      target_quantity: 800,
      planned_quantity: 800,
      cut_quantity: 0,
      completed_quantity: 0,
      waste_percentage: 0,
      status: 'approved',
      priority: 'normal',
      due_date: '2026-11-01',
      target_delivery_date: '2026-11-01',
      items: [
        { id: '5', color_name: 'وردي زهور', size_name: '4-6Y', planned_quantity: 800, cut_quantity: 0, completed_quantity: 0, color_id: 'c5', size_id: 's5' },
      ],
    },
  ]);

  const [cuttingOrders, setCuttingOrders] = useState<CuttingOrder[]>([
    {
      id: 'cut-1',
      cutting_order_number: 'CUT-202610-081',
      production_order_id: 'po-101',
      production_order_number: 'PO-2026-081',
      model_name: 'طقم أطفال صيفي (تيشيرت بولو + شورت جبردين)',
      table_number: 'طاولة القص 1',
      fabric_name: 'قماش سنجل جيرسي قطن 100% كحلي',
      fabric_source: 'factory_owned',
      warehouse_name: 'مخزن الأقمشة الرئيسي',
      lay_length_meters: 2.2,
      layers_count: 50,
      marker_efficiency_percent: 88.4,
      actual_fabric_meters_used: 112.5,
      theoretical_fabric_meters: 110.0,
      end_loss_meters: 0.05,
      total_cut_pieces: 1200,
      status: 'cut_completed',
      created_at: '2026-10-12',
    },
  ]);

  const [cuttingBundles, setCuttingBundles] = useState<CuttingBundle[]>([
    {
      id: 'bnd-101',
      bundle_code: 'BND-202610-0012',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 12,
      color_name: 'كحلي غامق',
      size_name: '2Y (سنتين)',
      quantity: 25,
      current_stage_code: 'sewing',
      status: 'active',
    },
    {
      id: 'bnd-102',
      bundle_code: 'BND-202610-0013',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 13,
      color_name: 'أحمر زاهي',
      size_name: '4Y (4 سنوات)',
      quantity: 25,
      current_stage_code: 'finishing',
      status: 'active',
    },
    {
      id: 'bnd-103',
      bundle_code: 'BND-202610-0014',
      cutting_order_id: 'cut-1',
      production_order_id: 'po-101',
      bundle_number: 14,
      color_name: 'أبيض لؤلؤي',
      size_name: '2Y (سنتين)',
      quantity: 25,
      current_stage_code: 'assembly',
      status: 'held_for_qc',
    },
  ]);

  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([
    {
      id: 'qc-1',
      inspection_number: 'QC-202610-081',
      production_order_id: 'po-101',
      production_order_number: 'PO-2026-081',
      bundle_code: 'BND-202610-0012',
      inspector_name: 'م. نادية سمير (مديرة الجودة)',
      inspection_type: 'final_audit',
      inspected_quantity: 100,
      passed_quantity: 98,
      rework_quantity: 2,
      rejected_quantity: 0,
      decision: 'rework_required',
      defects: [
        { defect_type: 'skip_stitch', severity: 'minor', quantity: 2, corrective_action: 'إعادة خياطة الحلية والياقة' },
      ],
      created_at: '2026-10-13',
    },
  ]);

  // Inventory Items State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Stock Ledger Log State
  const [stockLedger, setStockLedger] = useState<InventoryTransaction[]>([]);

  // Customer Materials State
  const [customerMaterials, setCustomerMaterials] = useState<CustomerMaterial[]>([
    {
      id: 'cm-1',
      customer_name: 'شركة أزياء الصغار',
      fabric_name: 'قماش جبردين ليكرا بيج تركي',
      fabric_code: 'CUST-GAB-01',
      gsm: 240,
      usable_width_meters: 1.5,
      received_meters: 1200,
      consumed_meters: 350,
      waste_meters: 30,
      remaining_meters: 820,
      warehouse_name: 'مخزن أمانات خامات العملاء',
    },
  ]);

  // Branches list
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: 'b-1',
      tenant_id: 't-1',
      name: 'المصنع وصالة القص الرئيسية',
      code: 'HQ-01',
      type: 'factory',
      is_main: true,
      address: 'المنطقة الصناعية، العاشر من رمضان',
      phone: '+201002345678',
    },
    {
      id: 'b-2',
      tenant_id: 't-1',
      name: 'مخزن الأقمشة والمستلزمات المركزي',
      code: 'WH-FAB-01',
      type: 'warehouse',
      is_main: false,
      address: 'مجمع المخازن، العبور',
    },
    {
      id: 'b-3',
      tenant_id: 't-1',
      name: 'منفذ بيع وتوزيع العتبة (جملة)',
      code: 'POS-ATB',
      type: 'outlet',
      is_main: false,
      address: 'شارع الجيش، القاهرة',
    },
  ]);

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCompany(true);
    setCompanySuccessMsg('');
    try {
      const res = await api.auth.registerCompany({
        owner_name: newCompanyForm.ownerName,
        email: newCompanyForm.email,
        company_name: newCompanyForm.companyName,
        password: 'Password@123',
        subdomain: newCompanyForm.subdomain || newCompanyForm.companyName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        plan_tier: newCompanyForm.plan,
      });
      setTenantName(res.tenant.name);
      setTenantCode(res.tenant.code);
      setCompanySuccessMsg(isAr ? 'تم تسجيل الشركة بنجاح وعزل قاعدة بياناتها وسياقها!' : 'Company successfully registered with isolated tenant database and scope!');
      setTimeout(() => {
        setIsCompanyModalOpen(false);
        setCompanySuccessMsg('');
        loadBackendData();
      }, 1200);
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل تسجيل الشركة الجديدة' : 'Failed to register new company'));
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchType, setNewBranchType] = useState<'factory' | 'outlet' | 'warehouse'>('warehouse');

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName || !newBranchCode) return;
    try {
      const res = await api.branches.createBranch({
        name: newBranchName,
        code: newBranchCode,
        type: newBranchType,
      });
      const b = res.branch;
      const created: Branch = {
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name,
        code: b.code,
        type: b.type,
        is_main: Boolean(b.is_main),
      };
      setBranches(prev => [...prev, created]);
      setBranchName(created.name);
      setIsBranchModalOpen(false);
      setNewBranchName('');
      setNewBranchCode('');
    } catch (err: any) {
      alert(err.message || (isAr ? 'فشل إضافة الفرع' : 'Failed to add branch'));
    }
  };

  const loadBackendData = async () => {
    if (!api.isAuthenticated()) return;
    setIsDataLoading(true);
    setSyncError(null);
    try {
      // 1. Tenant profile & user identity
      try {
        const profileRes = await api.tenant.getProfile();
        if (profileRes.tenant) {
          setTenantName(profileRes.tenant.name);
          setTenantCode(profileRes.tenant.code);
        }
        if ((profileRes as any).user) {
          setCurrentUser((profileRes as any).user);
        }
      } catch (err: any) {
        console.warn('Tenant profile fetch error:', err);
      }

      // 2. Warehouses from database
      try {
        const whRes = await api.inventory.getWarehouses();
        if (whRes && Array.isArray(whRes.warehouses)) {
          const mappedWh: Warehouse[] = whRes.warehouses.map((w: any) => ({
            id: w.id,
            name: w.name,
            code: w.code,
            type: w.type || 'fabric',
            allow_negative_stock: Boolean(w.allow_negative_stock),
            items_count: w.items_count ?? (w.items ? w.items.length : 0),
            address: w.address,
            branch_id: w.branch_id,
          }));
          setWarehouses(mappedWh);
        }
      } catch (err: any) {
        console.warn('Warehouses fetch error:', err);
      }

      // 3. Branches from database
      try {
        const branchRes = await api.branches.getBranches();
        if (branchRes && Array.isArray(branchRes.branches)) {
          const mappedBranches: Branch[] = branchRes.branches.map((b: any) => ({
            id: b.id,
            tenant_id: b.tenant_id,
            name: b.name,
            code: b.code,
            type: b.type || 'warehouse',
            is_main: Boolean(b.is_main),
            address: b.address,
            phone: b.phone,
          }));
          setBranches(mappedBranches);
        }
      } catch (err: any) {
        console.warn('Branches fetch error:', err);
      }

      // 4. Garment Models
      try {
        const modelsRes = await api.models.getModels();
        if (modelsRes && Array.isArray(modelsRes.data)) {
          const mappedModels: GarmentModel[] = modelsRes.data.map((m: any) => ({
            id: m.id,
            code: m.code,
            name: m.name,
            category: m.category || 'عام',
            season: m.season || 'الموسم الحالي',
            target_cost: Number(m.target_cost || 0),
            wholesale_price: Number(m.wholesale_price || 0),
            retail_price: Number(m.retail_price || 0),
            variants_count: m.variants ? m.variants.length : (m.variants_count || 0),
            status: m.status || 'active',
            created_at: m.created_at ? m.created_at.split('T')[0] : '',
          }));
          setModels(mappedModels);
        }
      } catch (err: any) {
        console.warn('Models fetch error:', err);
      }

      // 5. Suppliers
      try {
        const supRes = await api.suppliers.getSuppliers();
        if (supRes && Array.isArray(supRes.data)) {
          const mappedSuppliers: Supplier[] = supRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            code: s.code || 'SUP',
            contact_person: s.contact_person || '',
            phone: s.phone || '',
            email: s.email || '',
            tax_id: s.tax_id || '',
            materials_category: s.materials_category || 'أقمشة ومستلزمات',
            payment_terms: s.payment_terms || 'نقد عند الاستلام',
            current_balance: Number(s.current_balance || 0),
          }));
          setSuppliers(mappedSuppliers);
        }
      } catch (err: any) {
        console.warn('Suppliers fetch error:', err);
      }

      // 6. Purchase Orders
      try {
        const poRes = await api.procurement.getPurchaseOrders();
        const poList = poRes.data || (poRes as any).purchase_orders;
        if (Array.isArray(poList)) {
          const mappedPo: PurchaseOrder[] = poList.map((po: any) => ({
            id: po.id,
            po_number: po.po_number,
            supplier_id: po.supplier_id,
            supplier_name: po.supplier?.name || 'مورد معتمد',
            warehouse_id: po.warehouse_id,
            warehouse_name: po.warehouse?.name || 'المخزن الرئيسي',
            order_date: po.order_date || po.created_at?.split('T')[0] || '',
            expected_delivery_date: po.expected_delivery_date || '',
            status: po.status || 'draft',
            subtotal: Number(po.subtotal ?? po.total_amount ?? 0),
            tax_amount: Number(po.tax_amount ?? 0),
            total_amount: Number(po.total_amount || 0),
            items: (po.items || []).map((it: any) => {
              const qty = Number(it.ordered_quantity ?? it.quantity ?? 0);
              const rcv = Number(it.received_quantity ?? 0);
              const prc = Number(it.unit_price ?? 0);
              return {
                id: it.id,
                inventory_item_id: it.inventory_item_id || it.id,
                item_name: it.item_name || it.material_name || 'خامة',
                item_code: it.item_code || 'ITEM',
                ordered_quantity: qty,
                received_quantity: rcv,
                remaining_quantity: Number(it.remaining_quantity ?? Math.max(0, qty - rcv)),
                unit_price: prc,
                total_price: Number(it.total_price ?? (qty * prc)),
              };
            }),
          }));
          setPurchaseOrders(mappedPo);
        }
      } catch (err: any) {
        console.warn('Purchase orders fetch error:', err);
      }

      // 7. Production Orders
      try {
        const prodRes = await api.production.getProductionOrders();
        if (prodRes && Array.isArray(prodRes.data)) {
          const mappedProd: ProductionOrder[] = prodRes.data.map((p: any) => ({
            id: p.id,
            order_number: p.order_number,
            garment_model_id: p.garment_model_id,
            model_name: p.garment_model?.name || p.model_name || 'موديل ملابس',
            model_code: p.garment_model?.code || p.model_code || 'MOD',
            category: p.garment_model?.category || p.category || 'ملابس أطفال',
            target_quantity: Number(p.target_quantity || 0),
            cut_quantity: Number(p.cut_quantity || 0),
            completed_quantity: Number(p.completed_quantity || 0),
            status: p.status || 'draft',
            due_date: p.due_date || p.target_delivery_date || new Date().toISOString().split('T')[0],
          }));
          setProductionOrders(mappedProd);
        }
      } catch (err: any) {
        console.warn('Production orders fetch error:', err);
      }

      // 8. Cutting Orders & Bundles
      try {
        const cutRes = await api.production.getCuttingOrders();
        if (cutRes && Array.isArray(cutRes.data)) {
          const mappedCut: CuttingOrder[] = cutRes.data.map((c: any) => ({
            id: c.id,
            cutting_order_number: c.cutting_order_number,
            production_order_id: c.production_order_id,
            production_order_number: c.production_order?.order_number || '',
            fabric_name: c.fabric_item?.name || 'قماش التشغيل',
            table_number: c.table_number || 'طاولة 1',
            fabric_source: c.fabric_source || 'factory_owned',
            lay_length_meters: Number(c.lay_length_meters || 10),
            layers_count: Number(c.layers_count || 50),
            marker_efficiency_percent: Number(c.marker_efficiency_percent || 85),
            actual_fabric_meters_used: Number(c.actual_fabric_meters_used || 500),
            theoretical_fabric_meters: Number(c.theoretical_fabric_meters || 480),
            end_loss_meters: Number(c.end_loss_meters || 5),
            total_cut_pieces: Number(c.total_cut_pieces || 0),
            status: c.status || 'planned',
            created_at: c.created_at ? c.created_at.split('T')[0] : '',
          }));
          setCuttingOrders(mappedCut);
        }
      } catch (err: any) {
        console.warn('Cutting orders fetch error:', err);
      }

      try {
        const bundleRes = await api.production.getBundles();
        if (bundleRes && Array.isArray(bundleRes.data)) {
          const mappedBundles: CuttingBundle[] = bundleRes.data.map((b: any) => ({
            id: b.id,
            bundle_code: b.bundle_code,
            cutting_order_id: b.cutting_order_id,
            production_order_id: b.production_order_id,
            bundle_number: Number(b.bundle_number || 1),
            color_name: b.color_name || 'عام',
            size_name: b.size_name || 'عام',
            quantity: Number(b.quantity || 0),
            current_stage_code: b.current_stage_code || 'cutting',
            status: b.status || 'active',
          }));
          setCuttingBundles(mappedBundles);
        }
      } catch (err: any) {
        console.warn('Bundles fetch error:', err);
      }

      // 9. Subcontracting customers, jobs, receipts, and deliveries
      try {
        const custRes = await api.subcontracting.getCustomers();
        if (custRes && Array.isArray(custRes.data)) {
          const mappedCust: Customer[] = custRes.data.map((c: any) => ({
            id: c.id,
            name: c.name,
            code: c.code || 'CUST',
            contact_person: c.contact_person || '',
            phone: c.phone || '',
            email: c.email || '',
            tax_id: c.tax_id || '',
            is_active: Boolean(c.is_active ?? true),
            job_orders_count: Number(c.job_orders_count || 0),
            material_receipts_count: Number(c.material_receipts_count || 0),
          }));
          setCustomers(mappedCust);
        }
      } catch (err: any) {
        console.warn('Subcontracting customers fetch error:', err);
      }

      try {
        const jobsRes = await api.subcontracting.getJobs();
        if (jobsRes && Array.isArray(jobsRes.data)) {
          const mappedJobs: JobOrder[] = jobsRes.data.map((j: any) => ({
            id: j.id,
            order_number: j.order_number,
            customer_id: j.customer_id,
            customer_name: j.customer?.name || j.customer_name || 'عميل تشغيل للغير',
            service_type: j.service_type || 'contract_cutting',
            garment_model_id: j.garment_model_id,
            model_name: j.garment_model?.name || j.model_name,
            fabric_source: j.fabric_source || 'customer_supplied',
            trims_responsibility: j.trims_responsibility || 'customer_supplied',
            status: j.status || 'draft',
            pricing_basis: j.pricing_basis || 'per_piece',
            unit_rate: Number(j.unit_rate || 0),
            total_target_quantity: Number(j.total_target_quantity || 0),
            total_received_meters: Number(j.total_received_meters || 0),
            total_cut_quantity: Number(j.total_cut_quantity || 0),
            total_accepted_quantity: Number(j.total_accepted_quantity || 0),
            total_rejected_quantity: Number(j.total_rejected_quantity || 0),
            total_rework_quantity: Number(j.total_rework_quantity || 0),
            total_delivered_quantity: Number(j.total_delivered_quantity || 0),
            planned_start_date: j.planned_start_date,
            target_delivery_date: j.target_delivery_date,
            created_at: j.created_at,
            items: (j.items || []).map((it: any) => ({
              id: it.id,
              color_name: it.color_name,
              size_name: it.size_name,
              target_quantity: Number(it.target_quantity || 0),
              cut_quantity: Number(it.cut_quantity || 0),
              delivered_quantity: Number(it.delivered_quantity || 0),
              unit_rate: Number(it.unit_rate || 0),
            })),
          }));
          setJobOrders(mappedJobs);
        }
      } catch (err: any) {
        console.warn('Subcontracting jobs fetch error:', err);
      }

      try {
        const cmrRes = await api.subcontracting.getMaterialReceipts();
        if (cmrRes && Array.isArray(cmrRes.data)) {
          setCustomerMaterialReceipts(cmrRes.data);
        }
      } catch (err: any) {
        console.warn('Subcontracting material receipts fetch error:', err);
      }

      try {
        const extRes = await api.subcontracting.getExternalOperations();
        if (extRes && Array.isArray(extRes.data)) {
          setExternalOperations(extRes.data);
        }
      } catch (err: any) {
        console.warn('Subcontracting external operations fetch error:', err);
      }

      try {
        const delRes = await api.subcontracting.getDeliveryNotes();
        if (delRes && Array.isArray(delRes.data)) {
          setJobDeliveryNotes(delRes.data);
        }
      } catch (err: any) {
        console.warn('Subcontracting delivery notes fetch error:', err);
      }

      try {
        const invRes = await api.subcontracting.getInvoices();
        if (invRes && Array.isArray(invRes.data)) {
          setJobInvoices(invRes.data);
        }
      } catch (err: any) {
        console.warn('Subcontracting invoices fetch error:', err);
      }

      // 10. Paginated inventory items from database with location support
      try {
        const itemsRes = await api.inventory.getItems({ per_page: 100 });
        if (itemsRes && Array.isArray(itemsRes.data)) {
          const mappedItems: InventoryItem[] = itemsRes.data.map((it: any) => ({
            id: it.id,
            warehouse_id: it.warehouse_id,
            warehouse_name: it.warehouse?.name || 'المخزن الرئيسي',
            variant_id: it.variant_id,
            item_type: it.item_type || 'fabric_raw',
            code: it.code,
            name: it.name,
            unit_of_measure: it.unit_of_measure,
            current_balance: Number(it.current_balance),
            average_cost: Number(it.average_cost || 0),
            reorder_level: Number(it.reorder_level || 0),
            is_customer_owned: Boolean(it.is_customer_owned),
            customer_name: it.customer?.name || (it.is_customer_owned ? 'عميل تشغيل للغير' : undefined),
            storage_zone: it.storage_zone || it.technical_specs?.storage_zone,
            rack_location: it.rack_location || it.technical_specs?.rack_location,
            shelf_bin_location: it.shelf_bin_location || it.technical_specs?.shelf_bin_location,
            reserved_quantity: Number(it.reserved_quantity || 0),
            available_quantity: Number(it.available_quantity !== undefined ? it.available_quantity : it.current_balance),
            variant: it.variant,
            warehouse: it.warehouse,
            technical_specs: it.technical_specs || undefined,
          }));
          setInventoryItems(mappedItems);
        }
      } catch (err: any) {
        console.warn('Inventory items fetch error:', err);
      }

      // 11. Customer CMT materials from database
      try {
        const cmRes = await api.inventory.getCustomerMaterials();
        if (cmRes && Array.isArray(cmRes.customer_materials)) {
          setCustomerMaterials(cmRes.customer_materials);
        }
      } catch (err: any) {
        console.warn('Customer materials fetch error:', err);
      }

      // 12. Authoritative stock ledger transactions
      try {
        const txRes = await api.inventory.getTransactions({ per_page: 50 });
        const txList = txRes.data || txRes.transactions;
        if (Array.isArray(txList)) {
          const mappedTx: InventoryTransaction[] = txList.map((tx: any) => ({
            id: tx.id,
            item_code: tx.item?.code || tx.item_code || 'ITEM',
            item_name: tx.item?.name || tx.item_name || 'خامة مخزنية',
            warehouse_name: tx.warehouse?.name || tx.warehouse_name || 'المخزن الرئيسي',
            transaction_type: tx.transaction_type,
            direction: tx.direction || (['goods_receipt', 'adjustment_positive', 'transfer_in'].includes(tx.transaction_type) ? 'IN' : 'OUT'),
            quantity: Number(tx.quantity),
            unit_cost: Number(tx.unit_cost || 0),
            total_cost: Number(tx.total_cost || (Number(tx.quantity) * Number(tx.unit_cost || 0))),
            balance_before: Number(tx.balance_before),
            balance_after: Number(tx.balance_after),
            reference_type: tx.reference_type || tx.transaction_type,
            reference_number: tx.reference_number || ('TX-' + String(tx.id).substring(0, 8)),
            created_at: tx.created_at ? new Date(tx.created_at).toLocaleString('ar-EG') : '',
          }));
          setStockLedger(mappedTx);
        }
      } catch (err: any) {
        console.warn('Inventory transactions ledger fetch error:', err);
      }
    } catch (err: any) {
      console.error('Failed to sync backend data:', err);
      setSyncError(err.message || (isAr ? 'تعذر مزامنة بعض البيانات مع الخادم.' : 'Unable to synchronize some data with the server.'));
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    api.setOnUnauthorized(() => {
      if (window.location.hash.startsWith('#admin')) {
        return;
      }
      setIsAuthenticated(false);
      setCurrentUser(null);
      setViewMode('public');
      setIsLoginModalOpen(true);
    });

    if (api.isAuthenticated()) {
      loadBackendData();
    }
  }, []);

  const handleLoginSuccess = async (user: ApiUser, tenant?: ApiTenant | null) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    if (tenant) {
      setTenantName(tenant.name);
      setTenantCode(tenant.code);
    } else {
      setTenantName(lang === 'ar' ? 'إدارة المنظومة المركزية' : 'Platform Administration');
      setTenantCode('SYSTEM');
    }
    setIsLoginModalOpen(false);

    // Restore intended destination if the user was intercepted on a protected route
    try {
      const intended = sessionStorage.getItem('intended_destination');
      if (intended) {
        sessionStorage.removeItem('intended_destination');
        window.location.hash = intended;
        if (user.role !== 'platform_admin') {
          await loadBackendData();
        }
        return;
      }
    } catch {}

    if (user.role === 'platform_admin') {
      navigateToRoute('admin');
    } else {
      navigateToRoute('erp', 'dashboard');
      await loadBackendData();
    }
  };

  const handleRegisterSuccess = async (user: ApiUser, tenant: ApiTenant) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setTenantName(tenant.name);
    setTenantCode(tenant.code);
    setIsRegisterModalOpen(false);
    navigateToRoute('erp', 'dashboard');
    await loadBackendData();
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Local session cleared in api client
    } finally {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsLoginModalOpen(false);
      setIsRegisterModalOpen(false);
      setModels([]);
      setCuttingOrders([]);
      setInventoryItems([]);
      setStockLedger([]);
      setProductionOrders([]);
      setPurchaseOrders([]);
      setCuttingBundles([]);
      setSuppliers([]);
      setCustomers([]);
      navigateToRoute('public', undefined, 'home');
    }
  };

  const handleStockTransactionSuccess = (updatedBalance: number, newTxRecord?: any) => {
    if (!selectedStockItem) return;
    const diff = updatedBalance - selectedStockItem.current_balance;
    const direction = diff >= 0 ? 'IN' : 'OUT';
    const quantity = Math.abs(diff);

    // Update item in state
    setInventoryItems(prev =>
      prev.map(it => it.id === selectedStockItem.id ? { ...it, current_balance: updatedBalance } : it)
    );

    // Prepend to ledger with real server-confirmed record
    const newTx: InventoryTransaction = newTxRecord ? {
      id: newTxRecord.id,
      item_code: selectedStockItem.code,
      item_name: selectedStockItem.name,
      warehouse_name: selectedStockItem.warehouse_name || 'المخزن الرئيسي',
      transaction_type: newTxRecord.transaction_type,
      direction: newTxRecord.direction || direction,
      quantity: Number(newTxRecord.quantity),
      unit_cost: Number(newTxRecord.unit_cost || selectedStockItem.average_cost),
      total_cost: Number(newTxRecord.total_cost || (Number(newTxRecord.quantity) * Number(newTxRecord.unit_cost || 0))),
      balance_before: Number(newTxRecord.balance_before),
      balance_after: Number(newTxRecord.balance_after),
      reference_type: newTxRecord.reference_type || 'goods_receipt',
      reference_number: newTxRecord.reference_number || ('TX-' + String(newTxRecord.id).substring(0, 8)),
      created_at: newTxRecord.created_at ? new Date(newTxRecord.created_at).toLocaleString('ar-EG') : new Date().toLocaleTimeString(),
    } : {
      id: 'tx-' + Date.now(),
      item_code: selectedStockItem.code,
      item_name: selectedStockItem.name,
      warehouse_name: selectedStockItem.warehouse_name || 'المخزن الرئيسي',
      transaction_type: direction === 'IN' ? 'goods_receipt' : 'material_issuance',
      direction,
      quantity,
      unit_cost: selectedStockItem.average_cost,
      total_cost: quantity * selectedStockItem.average_cost,
      balance_before: selectedStockItem.current_balance,
      balance_after: updatedBalance,
      reference_type: direction === 'IN' ? 'goods_receipt' : 'cutting_order',
      reference_number: 'TX-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toLocaleTimeString(),
    };
    setStockLedger(prev => [newTx, ...prev]);
  };

  const handleModelCreated = (newModel: GarmentModel) => {
    setModels([newModel, ...models]);
  };

  // Filtered models
  const filteredModels = models.filter((m) => {
    const q = modelSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.code.toLowerCase().includes(q) ||
      (m.category || '').toLowerCase().includes(q);
    const matchesCategory = modelCategoryFilter === 'all' || m.category === modelCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Table Pagination States
  const [modelPage, setModelPage] = useState(1);
  const modelPerPage = 8;
  const totalModelPages = Math.ceil(filteredModels.length / modelPerPage);
  const paginatedModels = filteredModels.slice((modelPage - 1) * modelPerPage, modelPage * modelPerPage);

  const [prodOrderPage, setProdOrderPage] = useState(1);
  const prodOrderPerPage = 6;
  const totalProdOrderPages = Math.ceil(productionOrders.length / prodOrderPerPage);
  const paginatedProdOrders = productionOrders.slice((prodOrderPage - 1) * prodOrderPerPage, prodOrderPage * prodOrderPerPage);

  useEffect(() => {
    setModelPage(1);
  }, [modelSearch, modelCategoryFilter]);


  if (viewMode === 'public') {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <PublicWebsite
          lang={lang}
          onToggleLang={toggleLang}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          currentPage={publicPage}
          onNavigatePage={(page) => navigateToRoute('public', undefined, page)}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenRegister={(plan) => {
            setRegisterPlanTier((plan as any) || 'professional');
            setIsRegisterModalOpen(true);
          }}
          isAuthenticated={isAuthenticated}
          onGoToDashboard={() => {
            const role = currentUser?.role || api.auth.getStoredUser()?.role;
            if (role === 'platform_admin') {
              navigateToRoute('admin');
            } else {
              navigateToRoute('erp', 'dashboard');
            }
          }}
        />
        <LoginModal
          isOpen={isLoginModalOpen}
          isClosable={true}
          onClose={() => {
            setIsLoginModalOpen(false);
            if (
              window.location.hash.startsWith('#/login') ||
              window.location.hash.startsWith('#login') ||
              window.location.hash.startsWith('#/app') ||
              window.location.hash.startsWith('#app')
            ) {
              window.location.hash = '#/';
            }
          }}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={() => {
            setIsLoginModalOpen(false);
            setIsRegisterModalOpen(true);
          }}
        />
        <RegisterModal
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={handleRegisterSuccess}
          initialPlanTier={registerPlanTier}
          onSwitchToLogin={() => {
            setIsRegisterModalOpen(false);
            setIsLoginModalOpen(true);
          }}
        />
      </div>
    );
  }

  if (viewMode === 'store') {
    const activeTenantSlug = storeTenantSlug || (currentUser as any)?.tenant?.subdomain || (currentUser as any)?.tenant?.code;
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<TabLoadingFallback isAr={lang === 'ar'} />}>
          <PublicStorefrontView
            lang={lang}
            onToggleLang={toggleLang}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            tenantIdentifier={activeTenantSlug}
            onNavigateToTracking={(orderNumber, phone) => {
              setTrackOrderInitial({ orderNumber, phone });
              window.location.hash = activeTenantSlug ? `#/store/${activeTenantSlug}/track` : '#/store/track';
            }}
            onNavigateToErp={() => navigateToRoute('erp', 'dashboard')}
          />
        </Suspense>
      </div>
    );
  }

  if (viewMode === 'store_track') {
    const activeTenantSlug = storeTenantSlug || (currentUser as any)?.tenant?.subdomain || (currentUser as any)?.tenant?.code;
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<TabLoadingFallback isAr={lang === 'ar'} />}>
          <PublicOrderTracker
            lang={lang}
            tenantIdentifier={activeTenantSlug}
            initialOrderNumber={trackOrderInitial.orderNumber}
            initialPhone={trackOrderInitial.phone}
            onNavigateHome={() => {
              window.location.hash = activeTenantSlug ? `#/store/${activeTenantSlug}` : '#/';
            }}
          />
        </Suspense>
      </div>
    );
  }

  if (viewMode === 'admin') {
    const adminUser: ApiUser = (currentUser?.role === 'platform_admin' ? currentUser : {
      id: 'admin-qa-1',
      name: lang === 'ar' ? 'مدير المنصة المركزي (QA)' : 'Platform Super Admin (QA)',
      email: 'admin@garmentos.com',
      role: 'platform_admin' as const,
      tenant_id: null,
    }) as ApiUser;

    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<TabLoadingFallback isAr={lang === 'ar'} />}>
          <PlatformAdminDashboard
            currentUser={adminUser}
            onLogout={handleLogout}
            lang={lang}
            onToggleLang={toggleLang}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onSwitchToTenantApp={() => navigateToRoute('erp', 'dashboard')}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} className="w-full h-screen max-h-screen overflow-hidden">
      <AppLayout
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lang={lang}
        onToggleLang={toggleLang}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        tenantName={tenantName}
        tenantCode={tenantCode}
        branchName={branchName}
        onOpenNewCompanyModal={() => setIsRegisterModalOpen(true)}
        userName={currentUser?.name || (isAuthenticated ? 'المستخدم الحالي' : 'زائر غير مسجل')}
        userRole={currentUser?.role || (isAuthenticated ? 'company_owner' : 'guest')}
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onSwitchToPublic={() => navigateToRoute('public')}
        onSwitchToAdmin={() => navigateToRoute('admin')}
      >
      {/* Real Live API Status & Sync Notifications */}
      {syncError && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{syncError}</span>
          </div>
          <Button size="sm" variant="ghost" onClick={loadBackendData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            {isAr ? 'إعادة المحاولة' : 'Retry'}
          </Button>
        </div>
      )}

      {isDataLoading && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm font-semibold">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isAr ? 'جارِ مزامنة بيانات المصنع والمخازن مع الخادم...' : 'Syncing factory & inventory data with server...'}</span>
            </div>
            <LoadingSkeleton count={4} />
          </div>
        </Card>
      )}
        <>
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 min-w-0 max-w-full overflow-hidden">
              {/* Modern Enterprise Page Header */}
              <PageHeader
                title={isAr ? 'مركز قيادة العمليات الصناعية والمخزنية' : 'Industrial Operations Command'}
                subtitle={isAr
                  ? 'متابعة لحظية لخطوط الإنتاج، أوامر صالة القص، أرصدة خامات الأقمشة، ومطابقة الجودة.'
                  : 'Real-time monitoring of cutting runs, bundle tracking, fabric inventory, and quality yields.'}
                icon={<Scissors className="w-5 h-5" />}
                breadcrumbs={[
                  { label: isAr ? 'الرئيسية' : 'Home' },
                  { label: isAr ? 'لوحة العمليات' : 'Operations Dashboard' },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsCreateProdOrderModalOpen(true)}
                      icon={<Scissors className="w-4 h-4" />}
                    >
                      {isAr ? '+ أمر قص جديد' : '+ New Cutting Order'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFabricCalcOpen(true)}
                      icon={<Calculator className="w-4 h-4" />}
                    >
                      {isAr ? 'حاسبة الـ GSM' : 'Fabric GSM'}
                    </Button>
                    <ActionsMenu
                      label={isAr ? 'إجراءات سريعة ▾' : 'Quick Actions ▾'}
                      variant="outline"
                      size="sm"
                      items={[
                        {
                          id: 'create-model',
                          label: isAr ? 'تعريف موديل جديد + متغيرات' : 'New Garment Model',
                          icon: <Plus className="w-4 h-4" />,
                          onClick: () => setIsCreateModelOpen(true),
                        },
                        {
                          id: 'stock-movement',
                          label: isAr ? 'تسجيل حركة مخزنية سريعة' : 'Record Stock Movement',
                          icon: <ArrowRightLeft className="w-4 h-4" />,
                          onClick: () => setSelectedStockItem(inventoryItems[0] || null),
                        },
                        {
                          id: 'cmt-custody',
                          divider: true,
                          label: isAr ? 'استلام أمانات عميل (CMT)' : 'Receive CMT Customer Goods',
                          icon: <Boxes className="w-4 h-4" />,
                          onClick: () => setIsReceiveCustomerMatModalOpen(true),
                        },
                        {
                          id: 'purchase-order',
                          label: isAr ? 'أمر شراء وتوريد خامات' : 'Create Purchase Order (PO)',
                          icon: <ShoppingCart className="w-4 h-4" />,
                          onClick: () => setIsCreatePoModalOpen(true),
                        },
                        {
                          id: 'bundle-tracker',
                          label: isAr ? 'تتبع بطاقات الحزم الذكية' : 'Track QR Bundles',
                          icon: <QrCode className="w-4 h-4" />,
                          onClick: () => handleTabChange('cutting'),
                        },
                      ]}
                    />
                  </div>
                }
              />

              {/* Real Traceable KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Production Orders */}
                <Card hover className="p-4.5 border-t-[3px] border-t-[var(--brand-primary)]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
                      {isAr ? 'أوامر التشغيل الجارية' : 'Active Production Runs'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#F87171] flex items-center justify-center border border-[var(--brand-border)]">
                      <Scissors className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {productionOrders.length}{' '}
                    <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر' : 'orders'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-sans">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                      {productionOrders.reduce((sum, p) => sum + (Number(p.target_quantity) || 0), 0).toLocaleString()}
                    </span>{' '}
                    <span>{isAr ? 'قطعة مستهدفة' : 'target pieces'}</span>
                  </div>
                </Card>

                {/* Metric 2: Cutting Floor & Lays */}
                <Card hover className="p-4.5 border-t-[3px] border-t-amber-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
                      {isAr ? 'أوامر صالة القص والفرش' : 'Cutting Orders & Lays'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                      <Boxes className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {cuttingOrders.length}{' '}
                    <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر قص' : 'lays'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-sans">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{cuttingBundles.length}</span>{' '}
                    <span>{isAr ? 'حزمة باركود مسجلة' : 'tracked bundles'}</span>
                  </div>
                </Card>

                {/* Metric 3: Fabric Raw Inventory */}
                <Card hover className="p-4.5 border-t-[3px] border-t-blue-500">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
                      {isAr ? 'رصيد الأقمشة بالمخازن' : 'Fabric Stock Balance'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {inventoryItems.reduce((acc, i) => acc + (Number(i.current_balance) || 0), 0).toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'متر/وحدة' : 'units'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-sans">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{inventoryItems.length}</span>{' '}
                    <span>{isAr ? 'أصناف مسجلة بالمستودعات' : 'cataloged items'}</span>
                  </div>
                </Card>

                {/* Metric 4: Purchase & Supply Orders */}
                <Card hover className="p-4.5 border-t-[3px] border-t-emerald-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-sans">
                      {isAr ? 'أوامر الشراء والتوريد' : 'Procurement Orders'}
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    {purchaseOrders.length}{' '}
                    <span className="text-xs font-semibold text-slate-500 font-sans">{isAr ? 'أمر توريد' : 'POs'}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-sans">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
                      {purchaseOrders.filter((p) => p.status === 'draft').length}
                    </span>{' '}
                    <span>{isAr ? 'مسودات قيد الاعتماد' : 'drafts pending approval'}</span>
                  </div>
                </Card>
              </div>

              {/* Main Content Operational Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 max-w-full">
                {/* Major Column (8/12): Live Orders & Fabric Ledger */}
                <div className="lg:col-span-8 space-y-6 min-w-0 max-w-full overflow-hidden">
                  {/* Table 1: Live Production & Cutting Floor */}
                  <Card className="p-0 overflow-hidden max-w-full">
                    <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-muted)]/60">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] dark:text-[#F87171] flex items-center justify-center shrink-0">
                          <Scissors className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate">
                            {isAr ? 'أوامر الإنتاج وصالة القص الجارية' : 'Live Production & Cutting Runs'}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {isAr ? 'متابعة خطوط القص، نسب الهالك، ومراحل الخياطة' : 'Real-time monitoring of cutting lays and sewing stages'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTabChange('cutting')}
                        className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#F87171]"
                      >
                        {isAr ? 'عرض صالة القص كاملة ←' : 'Full Floor View →'}
                      </Button>
                    </div>

                    <div className="overflow-x-auto max-w-full">
                      <table className="min-w-[620px] w-full text-xs text-right rtl:text-right ltr:text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-sans border-b border-slate-200/80 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-bold">{isAr ? 'أمر التشغيل' : 'Order #'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'الموديل' : 'Model'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'المرحلة' : 'Stage'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'نسبة الإنجاز' : 'Progress'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'الهالك' : 'Waste'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'موعد التسليم' : 'Due'}</th>
                            <th className="py-3 px-4 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {productionOrders.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400">
                                {isAr ? 'لا توجد أوامر تشغيل جارية حالياً' : 'No active production orders'}
                              </td>
                            </tr>
                          ) : (
                            productionOrders.map((order) => {
                              const sewPercent = Math.round(((order.sewn_quantity || 0) / order.target_quantity) * 100);
                              return (
                                <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                    {order.order_number}
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="font-bold text-slate-900 dark:text-slate-100">{order.model_name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                      {order.target_quantity} {isAr ? 'قطعة' : 'pcs'}
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <Badge
                                      variant={
                                        order.status === 'sewing'
                                          ? 'info'
                                          : order.status === 'cutting'
                                          ? 'warning'
                                          : 'success'
                                      }
                                      dot
                                    >
                                      {order.status === 'sewing'
                                        ? (isAr ? 'خياطة وتجميع' : 'Sewing')
                                        : order.status === 'cutting'
                                        ? (isAr ? 'صالة القص' : 'Cutting')
                                        : (isAr ? 'فحص جودة' : 'QC')}
                                    </Badge>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <div className="w-28 sm:w-32">
                                      <div className="flex justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                                        <span>{order.sewn_quantity} / {order.target_quantity}</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{sewPercent}%</span>
                                      </div>
                                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-light)] rounded-full"
                                          style={{ width: `${sewPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                      {order.waste_percentage}%
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                                    {order.due_date}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <ActionsMenu
                                      label={isAr ? 'إجراءات' : 'Actions'}
                                      variant="outline"
                                      size="sm"
                                      items={[
                                        {
                                          id: 'track-bundle',
                                          label: isAr ? 'الانتقال لصالة القص والفرش' : 'Go to Cutting Floor',
                                          icon: <Scissors className="w-3.5 h-3.5 text-[var(--brand-primary)]" />,
                                          onClick: () => handleTabChange('cutting'),
                                        },
                                        {
                                          id: 'qc-stage',
                                          label: isAr ? 'فحص الجودة والمطابقة' : 'QC Inspection',
                                          icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
                                          onClick: () => setSelectedProdOrderForQc(order),
                                        },
                                      ]}
                                    />
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Table 2: Critical Fabric Stock & Allocation */}
                  <Card className="p-0 overflow-hidden max-w-full">
                    <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-muted)]/60">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans truncate">
                            {isAr ? 'أرصدة الأقمشة وخامات التشغيل (CMT)' : 'Fabric Stock & CMT Custody'}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {isAr ? 'تتبع الأثواب المتاحة، الأمتار المتبقية، وعزل أمانات التشغيل للغير' : 'Track fabric rolls, remaining meters, and customer material isolation'}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTabChange('inventory')}
                        className="text-xs font-bold text-[var(--brand-primary)] dark:text-[#F87171]"
                      >
                        {isAr ? 'عرض المخزن كامل ←' : 'Full Inventory →'}
                      </Button>
                    </div>

                    <div className="overflow-x-auto max-w-full">
                      <table className="min-w-[620px] w-full text-xs text-right rtl:text-right ltr:text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-sans border-b border-slate-200/80 dark:border-slate-800">
                          <tr>
                            <th className="py-3 px-4 font-bold">{isAr ? 'كود الصنف' : 'Code'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'اسم الصنف' : 'Item Name'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'نوع الملكية' : 'Custody'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'المخزن' : 'Warehouse'}</th>
                            <th className="py-3 px-4 font-bold">{isAr ? 'الرصيد المتاح' : 'Available'}</th>
                            <th className="py-3 px-4 font-bold text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {inventoryItems.slice(0, 4).map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                {item.code}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                                  {item.item_type === 'fabric_raw' ? (isAr ? 'خام أقمشة' : 'Raw Fabric') : (isAr ? 'مستلزمات تشغيل' : 'Accessories')}
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                {item.is_customer_owned ? (
                                  <Badge variant="brand" dot>
                                    {isAr ? 'أمانات عميل (CMT)' : 'CMT Custody'}
                                  </Badge>
                                ) : (
                                  <Badge variant="neutral">
                                    {isAr ? 'ملكية المصنع' : 'Factory Owned'}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                                {item.warehouse_name || (isAr ? 'المخزن الرئيسي' : 'Main Warehouse')}
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                                <span className="text-sm">{item.current_balance}</span>{' '}
                                <span className="text-[11px] text-slate-500 font-sans">{item.unit_of_measure}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <ActionsMenu
                                  label={isAr ? 'إجراءات' : 'Actions'}
                                  variant="outline"
                                  size="sm"
                                  items={[
                                    {
                                      id: 'issue-cutting',
                                      label: isAr ? 'تسجيل صرف لصالة القص' : 'Issue to Cutting Lay',
                                      icon: <ArrowRightLeft className="w-3.5 h-3.5 text-[var(--brand-primary)]" />,
                                      onClick: () => setSelectedStockItem(item),
                                    },
                                    {
                                      id: 'calc-gsm',
                                      label: isAr ? 'حاسبة الـ GSM والأمتار' : 'GSM & Meter Calculator',
                                      icon: <Calculator className="w-3.5 h-3.5 text-blue-500" />,
                                      onClick: () => setIsFabricCalcOpen(true),
                                    },
                                    {
                                      id: 'inv-tab',
                                      label: isAr ? 'تفاصيل كارت الصنف' : 'View Item Ledger',
                                      icon: <Layers className="w-3.5 h-3.5 text-slate-600" />,
                                      onClick: () => handleTabChange('inventory'),
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Minor Column (4/12): Live Feed & Active Warehouses */}
                <div className="lg:col-span-4 space-y-6 min-w-0 max-w-full overflow-hidden">
                  {/* Widget 1: Live Floor Event Feed */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans">
                          {isAr ? 'سجل أحداث المصنع اللحظي' : 'Live Floor Event Feed'}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{isAr ? 'مسح وتحديثات صالة الإنتاج اللحظية' : 'Real-time floor scans'}</span>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                    </div>

                    <div className="space-y-4 text-xs">
                      {[
                        {
                          time: isAr ? 'منذ 12 دقيقة' : '12m ago',
                          title: isAr ? 'تم اكتمال قص فرشة 1,200 قطعة' : 'Lay Completed: 1,200 pcs',
                          desc: isAr ? 'أمر تشغيل #ORD-2026-001 • تيشيرت بولو رجالي' : 'Order #ORD-2026-001 (Polo Shirt)',
                          badge: isAr ? 'قص وفرش' : 'Cutting',
                          badgeVariant: 'warning' as const,
                        },
                        {
                          time: isAr ? 'منذ 34 دقيقة' : '34m ago',
                          title: isAr ? 'اعتماد جودة حزمة خياطة #BND-088' : 'QC Ticket Approved: #BND-088',
                          desc: isAr ? 'مطابقة 100% بدون أي عيوب أو ترحيل غرز' : '100% First-Pass Yield (No defects)',
                          badge: isAr ? 'جودة' : 'QC',
                          badgeVariant: 'success' as const,
                        },
                        {
                          time: isAr ? 'منذ ساعة' : '1h ago',
                          title: isAr ? 'استلام أمانات أقمشة عميل (CMT)' : 'CMT Custody Receipt Issued',
                          desc: isAr ? '450 م قماش جبردين - شركة النيل للملابس' : '450m Gabardine custody roll received',
                          badge: 'CMT',
                          badgeVariant: 'brand' as const,
                        },
                        {
                          time: isAr ? 'منذ ساعتين' : '2h ago',
                          title: isAr ? 'إصدار إذن تسليم أوامر تشغيل' : 'Delivery Note #DEL-104',
                          desc: isAr ? 'تسليم 800 بنطلون كاجوال للعميل' : '800 trousers ready for dispatch',
                          badge: isAr ? 'تسليم' : 'Delivery',
                          badgeVariant: 'info' as const,
                        },
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800 last:border-0 last:pb-0">
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 dark:text-white font-sans">{item.title}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.time}</span>
                            </div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-sans">{item.desc}</div>
                          </div>
                          <Badge variant={item.badgeVariant}>
                            {item.badge}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Widget 2: Factory Active Warehouses */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-900 dark:text-white font-sans">
                          {isAr ? 'مستودعات المصنع النشطة' : 'Active Warehouses'}
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-sans">
                          {warehouses.length} {isAr ? 'مستودعات معرفة' : 'registered nodes'}
                        </span>
                      </div>
                      <Building2 className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="space-y-2.5">
                      {warehouses.length === 0 ? (
                        <div className="text-xs text-slate-400 py-2">
                          {isAr ? 'لا توجد مستودعات مسجلة' : 'No warehouses configured'}
                        </div>
                      ) : (
                        warehouses.map((wh) => (
                          <div
                            key={wh.id}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-slate-200/70 dark:bg-slate-700/70 flex items-center justify-center text-slate-700 dark:text-slate-300">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white font-sans">{wh.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{wh.code}</div>
                              </div>
                            </div>
                            <Badge variant="neutral">
                              {wh.items_count !== undefined ? `${wh.items_count} ${isAr ? 'صنف' : 'items'}` : wh.type}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GARMENT MODELS CATALOG & BOM */}
          {activeTab === 'models' && (
            <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
              <PageHeader
                title={isAr ? 'كتالوج موديلات الملابس وبطاقات التشغيل (BOM)' : 'Garment Models & BOM Catalog'}
                subtitle={isAr
                  ? 'إدارة الموديلات والمقاسات والألوان وتوليد الباركود الدولي والـ SKU وقوائم المواد الأولية.'
                  : 'Manage apparel styles, size/color matrix, international barcodes, and bill of materials.'}
                icon={<Layers className="w-5 h-5" />}
                breadcrumbs={[
                  { label: isAr ? 'الرئيسية' : 'Home' },
                  { label: isAr ? 'الموديلات والتصميم' : 'Style Catalog' },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreateModelOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'موديل جديد + مصفوفة المتغيرات' : 'New Model + Matrix'}
                    </Button>
                  </div>
                }
              />

              {/* Models Operational KPI Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'إجمالي الموديلات المعتمدة' : 'Total Approved Styles'}</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {models.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'موديل' : 'styles'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {models.filter((m) => m.status === 'active').length} {isAr ? 'نشط في خطوط الإنتاج' : 'active in production'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'متغيرات المقاسات والألوان (SKUs)' : 'Size-Color SKUs'}</div>
                  <div className="text-xl font-bold font-mono text-[var(--brand-primary)] dark:text-[#F87171]">
                    {models.reduce((acc, m) => acc + (m.variants_count || 0), 0)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'صنف SKU' : 'SKUs'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {isAr ? 'بأكواد باركود دولية مستقلة' : 'with international barcodes'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'متوسط تكلفة التصنيع المستهدفة' : 'Avg Target Cost'}</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {models.length > 0 ? (models.reduce((acc, m) => acc + (m.target_cost || 0), 0) / models.length).toFixed(1) : '0'} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isAr ? 'استناداً لحسابات بطاقة الـ BOM' : 'based on BOM calculations'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'متوسط هامش الربح الإجمالي' : 'Avg Retail Margin'}</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {models.length > 0
                      ? Math.round(
                          models.reduce((acc, m) => {
                            const cost = m.target_cost || 1;
                            const retail = m.retail_price || cost;
                            return acc + ((retail - cost) / retail) * 100;
                          }, 0) / models.length
                        )
                      : 0}%
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {isAr ? 'معدل ربحية التجزئة المتوقع' : 'projected gross retail margin'}
                  </div>
                </Card>
              </div>

              {/* Filters, Search & View Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="flex items-center gap-2 max-w-sm w-full relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder={isAr ? 'بحث باسم الموديل، الكود، أو الفئة...' : 'Search style name, code, or category...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] transition-all"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={modelCategoryFilter}
                      onChange={(e) => setModelCategoryFilter(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs py-1.5 px-3 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[var(--brand-primary)]"
                    >
                      <option value="all">{isAr ? 'كل الفئات والتصنيفات' : 'All Categories'}</option>
                      {Array.from(new Set(models.map((m) => m.category).filter(Boolean))).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* View Mode Toggle: Table / Grid */}
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setModelViewMode('table')}
                      className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                        modelViewMode === 'table'
                          ? 'bg-white dark:bg-slate-900 text-[var(--brand-primary)] dark:text-[#F87171] shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={isAr ? 'عرض الجدول التشغيلي' : 'Table View'}
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">{isAr ? 'جدول' : 'Table'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelViewMode('cards')}
                      className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors ${
                        modelViewMode === 'cards'
                          ? 'bg-white dark:bg-slate-900 text-[var(--brand-primary)] dark:text-[#F87171] shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title={isAr ? 'عرض البطاقات' : 'Cards View'}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[11px]">{isAr ? 'بطاقات' : 'Cards'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Industrial Matrix Table */}
              {modelViewMode === 'table' ? (
                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-3 px-4">{isAr ? 'كود الموديل' : 'Style Code'}</th>
                          <th className="py-3 px-4">{isAr ? 'اسم الموديل والتصنيف' : 'Style & Category'}</th>
                          <th className="py-3 px-4">{isAr ? 'الموسم' : 'Season'}</th>
                          <th className="py-3 px-4">{isAr ? 'بطاقة الـ BOM' : 'BOM Status'}</th>
                          <th className="py-3 px-4">{isAr ? 'المتغيرات (SKUs)' : 'Variants'}</th>
                          <th className="py-3 px-4">{isAr ? 'التكلفة المستهدفة' : 'Target Cost'}</th>
                          <th className="py-3 px-4">{isAr ? 'سعر الجملة' : 'Wholesale'}</th>
                          <th className="py-3 px-4">{isAr ? 'سعر التجزئة' : 'Retail Price'}</th>
                          <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {filteredModels.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="py-8 text-center text-slate-400">
                              {isAr ? 'لا توجد موديلات مطابقة لبحثك الحالي.' : 'No models match your current filter.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedModels.map((m) => {
                            const cost = m.target_cost || 0;
                            const retail = m.retail_price || 0;
                            const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
                            return (
                              <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                  <div className="flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-[var(--brand-primary)] dark:text-[#F87171]" />
                                    <span>{m.code}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{m.category}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.season}</td>
                                <td className="py-3 px-4">
                                  <Badge variant="success">
                                    {isAr ? 'معتمدة وفعالة' : 'Configured'}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                                  {m.variants_count} {isAr ? 'مقاس/لون' : 'variants'}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                                  {m.target_cost.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-900 dark:text-white font-semibold">
                                  {m.wholesale_price.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                    {m.retail_price.toFixed(2)} {isAr ? 'ج.م' : 'EGP'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {isAr ? `هامش: %${margin}` : `Margin: ${margin}%`}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="success">{isAr ? 'نشط' : 'Active'}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs h-7 border-slate-300 dark:border-slate-700 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                                      onClick={() => setSelectedModelForBom(m)}
                                    >
                                      {isAr ? 'بطاقة الـ BOM' : 'BOM & Matrix'}
                                    </Button>
                                    <ActionsMenu
                                      variant="icon-horizontal"
                                      items={[
                                        {
                                          id: 'bom',
                                          label: isAr ? 'فتح بطاقة الباركود وشجرة الـ BOM' : 'Open BOM & Barcode Matrix',
                                          icon: <Layers className="w-3.5 h-3.5" />,
                                          onClick: () => setSelectedModelForBom(m),
                                        },
                                        {
                                          id: 'print',
                                          label: isAr ? 'طباعة كارت المواصفات الفنية' : 'Print Technical Spec Sheet',
                                          icon: <Printer className="w-3.5 h-3.5" />,
                                          onClick: () => window.print(),
                                        },
                                      ]}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredModels.length > 0 && (
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                      <Pagination
                        currentPage={modelPage}
                        totalPages={totalModelPages}
                        totalItems={filteredModels.length}
                        perPage={modelPerPage}
                        onPageChange={setModelPage}
                        isAr={isAr}
                      />
                    </div>
                  )}
                </Card>
              ) : (
                /* View 2: Redesigned Operational Cards Grid */
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {paginatedModels.map((m) => (
                    <Card key={m.id} hover className="border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                          {m.code}
                        </span>
                        <Badge variant="success">{isAr ? 'نشط' : 'Active'}</Badge>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{m.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          <span>{m.category}</span>
                          <span>•</span>
                          <span>{m.season}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isAr ? 'التكلفة' : 'Cost'}</span>
                          <strong className="font-mono text-slate-800 dark:text-slate-200">{m.target_cost} ج.م</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isAr ? 'الجملة' : 'Wholesale'}</span>
                          <strong className="font-mono text-slate-900 dark:text-white">{m.wholesale_price} ج.م</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isAr ? 'التجزئة' : 'Retail'}</span>
                          <strong className="font-mono text-emerald-600 dark:text-emerald-400">{m.retail_price} ج.م</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {isAr ? 'المتغيرات:' : 'SKUs:'}{' '}
                          <strong className="text-slate-800 dark:text-slate-200 font-mono">
                            {m.variants_count} {isAr ? 'مقاس ولون' : 'variants'}
                          </strong>
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 hover:bg-[var(--brand-subtle)] hover:text-[var(--brand-primary)] font-semibold"
                            onClick={() => setSelectedModelForBom(m)}
                          >
                            {isAr ? 'بطاقة الـ BOM' : 'BOM & Matrix'}
                          </Button>
                          <ActionsMenu
                            variant="icon-horizontal"
                            items={[
                              {
                                id: 'bom',
                                label: isAr ? 'فتح بطاقة الباركود وشجرة الـ BOM' : 'Open BOM & Barcode Matrix',
                                icon: <Layers className="w-3.5 h-3.5" />,
                                onClick: () => setSelectedModelForBom(m),
                              },
                              {
                                id: 'print',
                                label: isAr ? 'طباعة كارت المواصفات الفنية' : 'Print Technical Spec Sheet',
                                icon: <Printer className="w-3.5 h-3.5" />,
                                onClick: () => window.print(),
                              },
                            ]}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                  </div>
                  {filteredModels.length > 0 && (
                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      <Pagination
                        currentPage={modelPage}
                        totalPages={totalModelPages}
                        totalItems={filteredModels.length}
                        perPage={modelPerPage}
                        onPageChange={setModelPage}
                        isAr={isAr}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVENTORY & WAREHOUSE MANAGEMENT */}
          {activeTab === 'inventory' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <WarehouseManagerTab
                inventoryItems={inventoryItems}
                warehouses={warehouses}
                customerMaterials={customerMaterials}
                stockLedger={stockLedger}
                onOpenCreateItemModal={() => setIsCreateInventoryItemModalOpen(true)}
                onOpenStockMovementModal={(item) => setSelectedStockItem(item)}
                onOpenFabricCalcModal={() => setIsFabricCalcOpen(true)}
                onOpenReceiveCustomerMatModal={() => setIsReceiveCustomerMatModalOpen(true)}
                onOpenBarcodeLabelModal={(item) => setSelectedItemForBarcode(item)}
                onRefreshData={loadBackendData}
                isLoading={isDataLoading}
                isAr={isAr}
              />
            </Suspense>
          )}

          {/* TAB 4: CUTTING & PRODUCTION */}
          {activeTab === 'cutting' && (
            <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
              <PageHeader
                title={isAr ? 'صالة القص وخطوط التشغيل وبطاقات الحزم' : 'Cutting Floor & Bundle Operations'}
                subtitle={isAr
                  ? 'أوامر التشغيل المعتمدة، خطط الفرش والطبقات، بطاقات الحزم الذكية بالباركود، وتدقيق الجودة (QC).'
                  : 'Cutting orders, lay planning & ply counts, QR bundle tracking, and quality control.'}
                icon={<Scissors className="w-5 h-5" />}
                breadcrumbs={[
                  { label: isAr ? 'الرئيسية' : 'Home' },
                  { label: isAr ? 'صالة القص والإنتاج' : 'Cutting & Production' },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsFabricCalcOpen(true)}
                      icon={<Calculator className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'حاسبة أطوال الفرش' : 'Lay Length Calc'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreateProdOrderModalOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'إصدار أمر إنتاج جديد' : 'New Production Order'}
                    </Button>
                  </div>
                }
              />

              {/* KPI Performance Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'إجمالي أوامر الإنتاج' : 'Total Production Orders'}</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {productionOrders.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'أوامر' : 'orders'}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {productionOrders.filter(p => p.status === 'in_progress').length} {isAr ? 'قيد التشغيل في الورشة' : 'in progress in shopfloor'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'القطع المقصوصة بصالة القص' : 'Pieces Cut'}</div>
                  <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">
                    {productionOrders.reduce((sum, p) => sum + p.cut_quantity, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'قطعة' : 'pcs'}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isAr ? `عبر ${cuttingOrders.length} أوامر فرش وقص` : `across ${cuttingOrders.length} cutting orders`}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'حزم التشغيل النشطة بالباركود' : 'Active QR Bundles'}</div>
                  <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                    {cuttingBundles.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'حزمة' : 'bundles'}</span>
                  </div>
                  <div className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">
                    {isAr ? 'موزعة على الخياطة والتجهيز والتشطيب' : 'in sewing and finishing lines'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'المنتج التام المجاز والمرحل للمخزن' : 'Passed QC Stock'}</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {productionOrders.reduce((sum, p) => sum + (p.completed_quantity || p.qc_passed_quantity || 0), 0).toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'قطعة' : 'pcs'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {isAr ? 'اجتازت الفحص النهائي بنجاح' : 'passed final QC inspection'}
                  </div>
                </Card>
              </div>

              {/* Section 1: Production Orders Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'أوامر الإنتاج وتفصيل المقاسات والألوان' : 'Production Orders & SKU Planning'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'متابعة الكميات المخططة والمقصوصة والمنجزة ومواعيد التسليم' : 'Track planned, cut, and finished quantities with delivery schedules'}</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-3 px-4">{isAr ? 'رقم الأمر' : 'Order #'}</th>
                          <th className="py-3 px-4">{isAr ? 'الموديل والنوع' : 'Model & Type'}</th>
                          <th className="py-3 px-4">{isAr ? 'المخطط' : 'Planned'}</th>
                          <th className="py-3 px-4">{isAr ? 'المقصوص' : 'Cut'}</th>
                          <th className="py-3 px-4">{isAr ? 'المنجز التام' : 'Finished'}</th>
                          <th className="py-3 px-4">{isAr ? 'موعد التسليم' : 'Delivery Date'}</th>
                          <th className="py-3 px-4">{isAr ? 'الأولوية' : 'Priority'}</th>
                          <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-4">{isAr ? 'الإجراءات والعمليات' : 'Actions & Ops'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {paginatedProdOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-indigo-400">{order.order_number}</td>
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              <div>{order.model_name}</div>
                              <span className="text-[10px] text-slate-400 font-mono">[{order.model_code}]</span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {(order.planned_quantity || order.target_quantity).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                              {order.cut_quantity.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                              {(order.completed_quantity || order.qc_passed_quantity || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">{order.target_delivery_date || order.due_date}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  order.priority === 'urgent'
                                    ? 'danger'
                                    : order.priority === 'high'
                                    ? 'warning'
                                    : 'neutral'
                                }
                              >
                                {order.priority === 'urgent' ? (isAr ? 'عاجل جداً' : 'Urgent') : order.priority === 'high' ? (isAr ? 'مرتفع' : 'High') : (isAr ? 'عادي' : 'Normal')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  order.status === 'completed'
                                    ? 'success'
                                    : order.status === 'in_progress' || order.status === 'sewing'
                                    ? 'info'
                                    : order.status === 'approved' || order.status === 'cutting'
                                    ? 'purple'
                                    : 'neutral'
                                }
                                dot={order.status === 'in_progress' || order.status === 'approved'}
                              >
                                {order.status === 'completed'
                                  ? (isAr ? 'مكتمل' : 'Completed')
                                  : order.status === 'in_progress' || order.status === 'sewing'
                                  ? (isAr ? 'قيد التشغيل' : 'In Progress')
                                  : order.status === 'approved'
                                  ? (isAr ? 'معتمد (جاهز للقص)' : 'Approved (Ready to Cut)')
                                  : order.status === 'cutting'
                                  ? (isAr ? 'صالة القص' : 'Cutting Floor')
                                  : (isAr ? 'مسودة' : 'Draft')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 justify-end">
                                {order.status === 'draft' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-emerald-600 border-emerald-500/30 font-bold"
                                    onClick={async () => {
                                      try {
                                        if (order.id.length > 20 && !order.id.startsWith('po-')) {
                                          await api.production.approveProductionOrder(order.id);
                                        }
                                        setProductionOrders((prev) =>
                                          prev.map((o) => (o.id === order.id ? { ...o, status: 'approved' } : o))
                                        );
                                      } catch (err: any) {
                                        alert(err.message || (isAr ? 'فشل اعتماد أمر الإنتاج' : 'Failed to approve production order'));
                                      }
                                    }}
                                  >
                                    {isAr ? 'اعتماد الأمر' : 'Approve Order'}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setSelectedProdOrderForCut(order)}
                                    icon={<Scissors className="w-3 h-3" />}
                                  >
                                    {isAr ? 'أمر قص وفرش' : 'Create Cut Order'}
                                  </Button>
                                )}

                                <ActionsMenu
                                  variant="icon-horizontal"
                                  items={[
                                    {
                                      id: 'cut',
                                      label: isAr ? 'إصدار خطة قص وفرش' : 'Issue Cutting Plan',
                                      icon: <Scissors className="w-3.5 h-3.5" />,
                                      onClick: () => setSelectedProdOrderForCut(order),
                                    },
                                    {
                                      id: 'qc',
                                      label: isAr ? 'فحص الجودة والمطابقة (QC)' : 'Quality Inspection (QC)',
                                      icon: <ShieldCheck className="w-3.5 h-3.5" />,
                                      onClick: () => setSelectedProdOrderForQc(order),
                                    },
                                    {
                                      id: 'bundles',
                                      label: isAr ? 'تتبع بطاقات الحزم بالباركود' : 'Track QR Bundles',
                                      icon: <QrCode className="w-3.5 h-3.5" />,
                                      onClick: () => {
                                        const b = cuttingBundles.find((cb) => cb.production_order_id === order.id) || cuttingBundles[0];
                                        if (b) setSelectedBundleForTracker(b);
                                      },
                                    },
                                    {
                                      id: 'costing',
                                      label: isAr ? 'حساب تكاليف أمر التشغيل' : 'Calculate Job Costing',
                                      icon: <DollarSign className="w-3.5 h-3.5" />,
                                      divider: true,
                                      onClick: () => handleTabChange('costing'),
                                    },
                                    {
                                      id: 'print',
                                      label: isAr ? 'طباعة تذكرة أمر التشغيل' : 'Print Job Order Ticket',
                                      icon: <Printer className="w-3.5 h-3.5" />,
                                      onClick: () => window.print(),
                                    },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {productionOrders.length > prodOrderPerPage && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center">
                      <Pagination
                        currentPage={prodOrderPage}
                        totalPages={totalProdOrderPages}
                        totalItems={productionOrders.length}
                        perPage={prodOrderPerPage}
                        onPageChange={setProdOrderPage}
                        isAr={isAr}
                      />
                    </div>
                  )}
                </Card>
              </div>

              {/* Section 2: Cutting Room Orders (Lay & Plies) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'أوامر صالة القص وخطط الفرش (Lay & Cut Orders)' : 'Cutting Room & Lay Orders'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'طول الفرشة، عدد الراقات، الأمتار المصروفة من المخزن، وعوادم الأطراف' : 'Lay length, plies count, fabric meters issued, and end scraps'}</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-3 px-4">{isAr ? 'رقم إذن القص' : 'Cut Order #'}</th>
                          <th className="py-3 px-4">{isAr ? 'أمر الإنتاج' : 'Production Order'}</th>
                          <th className="py-3 px-4">{isAr ? 'الطاولة' : 'Table #'}</th>
                          <th className="py-3 px-4">{isAr ? 'الخامة المستخدمة' : 'Fabric Item'}</th>
                          <th className="py-3 px-4">{isAr ? 'مصدر القماش' : 'Fabric Source'}</th>
                          <th className="py-3 px-4">{isAr ? 'طول الفرشة' : 'Lay Length'}</th>
                          <th className="py-3 px-4">{isAr ? 'الطبقات (الراقات)' : 'Plies (Layers)'}</th>
                          <th className="py-3 px-4">{isAr ? 'الأمتار المصروفة' : 'Meters Used'}</th>
                          <th className="py-3 px-4">{isAr ? 'القطع الناتجة' : 'Yield (Pcs)'}</th>
                          <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-4 text-center">{isAr ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {cuttingOrders.map((cut) => (
                          <tr key={cut.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-sky-400">{cut.cutting_order_number}</td>
                            <td className="py-3 px-4 text-indigo-400">{cut.production_order_number}</td>
                            <td className="py-3 px-4 font-sans text-slate-300">{cut.table_number}</td>
                            <td className="py-3 px-4 font-sans font-medium text-slate-800 dark:text-slate-200">{cut.fabric_name}</td>
                            <td className="py-3 px-4">
                              <Badge variant={cut.fabric_source === 'factory_owned' ? 'info' : 'warning'}>
                                {cut.fabric_source === 'factory_owned' ? (isAr ? 'خامات المصنع' : 'Factory Owned') : (isAr ? 'أمانة عميل CMT' : 'CMT Customer Custody')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-slate-300">{cut.lay_length_meters} {isAr ? 'م' : 'm'}</td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{cut.layers_count} {isAr ? 'راقة' : 'plies'}</td>
                            <td className="py-3 px-4 text-amber-400 font-bold">{cut.actual_fabric_meters_used} {isAr ? 'م' : 'm'}</td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">{cut.total_cut_pieces} {isAr ? 'قطعة' : 'pcs'}</td>
                            <td className="py-3 px-4">
                              <Badge variant="success">{isAr ? 'تم القص وتوليد الحزم' : 'Cut & Bundles Generated'}</Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <ActionsMenu
                                variant="icon-horizontal"
                                items={[
                                  {
                                    id: 'bundles',
                                    label: isAr ? 'تتبع حزم أمر القص' : 'Track Cut Bundles',
                                    icon: <QrCode className="w-3.5 h-3.5" />,
                                    onClick: () => {
                                      const b = cuttingBundles.find((cb) => cb.cutting_order_id === cut.id) || cuttingBundles[0];
                                      if (b) setSelectedBundleForTracker(b);
                                    },
                                  },
                                  {
                                    id: 'qc',
                                    label: isAr ? 'فحص الجودة والمطابقة (QC)' : 'Quality Inspection (QC)',
                                    icon: <ShieldCheck className="w-3.5 h-3.5" />,
                                    onClick: () => {
                                      const prod = productionOrders.find((p) => p.id === cut.production_order_id);
                                      if (prod) setSelectedProdOrderForQc(prod);
                                    },
                                  },
                                  {
                                    id: 'print',
                                    label: isAr ? 'طباعة كارت طاولة القص' : 'Print Cutting Ticket',
                                    icon: <Printer className="w-3.5 h-3.5" />,
                                    onClick: () => window.print(),
                                  },
                                ]}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Section 3: Live Bundle Cards Floor Tracker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'بطاقات الحزم وتتبع خطوط الإنتاج (Bundle Cards Floor Tracker)' : 'Bundle Cards & Shopfloor Tracker'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'تتبع مسار الحزم بالباركود بين مراحل القص، التجهيز، الخياطة، والتشطيب' : 'Barcode tracking across cutting, preparation, sewing, and finishing lines'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {cuttingBundles.map((bnd) => (
                    <Card key={bnd.id} hover className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-900 dark:text-white">
                          <QrCode className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <span>{bnd.bundle_code}</span>
                        </div>
                        <Badge variant="neutral">{isAr ? `حزمة #${bnd.bundle_number}` : `Bundle #${bnd.bundle_number}`}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[10px]">{isAr ? 'اللون' : 'Color'}</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{bnd.color_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">{isAr ? 'المقاس' : 'Size'}</span>
                          <span className="text-slate-900 dark:text-slate-100 font-bold font-mono">{bnd.size_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">{isAr ? 'الكمية' : 'Quantity'}</span>
                          <span className="text-emerald-400 font-bold font-mono">{bnd.quantity} {isAr ? 'قطعة' : 'pcs'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60 text-xs gap-1">
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              bnd.current_stage_code === 'completed'
                                ? 'success'
                                : bnd.current_stage_code === 'sewing'
                                ? 'info'
                                : bnd.current_stage_code === 'finishing' || bnd.current_stage_code === 'ironing'
                                ? 'purple'
                                : 'warning'
                            }
                            dot
                          >
                            {bnd.current_stage_code === 'cutting'
                              ? (isAr ? 'صالة القص' : 'Cutting')
                              : bnd.current_stage_code === 'assembly'
                              ? (isAr ? 'التجميع' : 'Assembly')
                              : bnd.current_stage_code === 'sewing'
                              ? (isAr ? 'الخياطة' : 'Sewing')
                              : bnd.current_stage_code === 'finishing'
                              ? (isAr ? 'التشطيب' : 'Finishing')
                              : bnd.current_stage_code === 'ironing'
                              ? (isAr ? 'الكي' : 'Ironing')
                              : bnd.current_stage_code === 'packing'
                              ? (isAr ? 'التعبئة' : 'Packing')
                              : (isAr ? 'مكتمل' : 'Completed')}
                          </Badge>
                          {bnd.status === 'rework' && (
                            <Badge variant="warning">{isAr ? 'إعادة تشغيل' : 'Rework'}</Badge>
                          )}
                          {bnd.status === 'held_for_qc' && (
                            <Badge variant="purple">{isAr ? 'فحص QC' : 'Held QC'}</Badge>
                          )}
                          {bnd.status === 'scrapped' && (
                            <Badge variant="danger">{isAr ? 'مستبعد' : 'Scrapped'}</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-[11px] h-7 px-2"
                            onClick={() => {
                              const prod = productionOrders.find((p) => p.id === bnd.production_order_id);
                              if (prod) {
                                setSelectedBundleForQc(bnd);
                                setSelectedProdOrderForQc(prod);
                              }
                            }}
                            icon={<ShieldCheck className="w-3 h-3 text-amber-500" />}
                          >
                            {isAr ? 'فحص' : 'QC'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[11px] h-7 px-2"
                            onClick={() => setSelectedBundleForTracker(bnd)}
                            icon={<ArrowRightLeft className="w-3 h-3" />}
                          >
                            {isAr ? 'نقل' : 'Transfer'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Section 4: Quality Inspections & Defects Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'سجل فحص وتدقيق الجودة والعيوب (Quality Control Hub)' : 'Quality Control & Defects Hub'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'تقارير الفحص المرحلي، العيوب المسجلة، وإذن الترحيل للمنتج النهائي' : 'Stage inspection logs, recorded defects, and finished goods transfer approval'}</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-3 px-4">{isAr ? 'رقم تقرير الفحص' : 'QC Report #'}</th>
                          <th className="py-3 px-4">{isAr ? 'أمر الإنتاج' : 'Production Order'}</th>
                          <th className="py-3 px-4">{isAr ? 'مفتش الجودة' : 'QC Inspector'}</th>
                          <th className="py-3 px-4">{isAr ? 'نوع الفحص' : 'Inspection Type'}</th>
                          <th className="py-3 px-4">{isAr ? 'المفحوص' : 'Inspected'}</th>
                          <th className="py-3 px-4">{isAr ? 'المقبول السليم' : 'Passed'}</th>
                          <th className="py-3 px-4">{isAr ? 'إعادة تشغيل (Rework)' : 'Rework'}</th>
                          <th className="py-3 px-4">{isAr ? 'المرفوض (Scrap)' : 'Scrap'}</th>
                          <th className="py-3 px-4">{isAr ? 'القرار والاعتماد' : 'Decision'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {qualityInspections.map((qc) => (
                          <tr key={qc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-emerald-400">{qc.inspection_number}</td>
                            <td className="py-3 px-4 text-indigo-400">{qc.production_order_number}</td>
                            <td className="py-3 px-4 font-sans text-slate-800 dark:text-slate-200">{qc.inspector_name}</td>
                            <td className="py-3 px-4 font-sans text-slate-300">
                              {qc.inspection_type === 'final_audit'
                                ? (isAr ? 'فحص نهائي وترحيل للمخزن' : 'Final Audit & Stock In')
                                : qc.inspection_type === 'inline'
                                ? (isAr ? 'فحص مرحلي بالخط' : 'Inline Inspection')
                                : (isAr ? 'فحص نهاية الخط' : 'End of Line Audit')}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{qc.inspected_quantity}</td>
                            <td className="py-3 px-4 text-emerald-400 font-bold">{qc.passed_quantity}</td>
                            <td className="py-3 px-4 text-amber-400 font-bold">{qc.rework_quantity}</td>
                            <td className="py-3 px-4 text-red-400 font-bold">{qc.rejected_quantity}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  qc.decision === 'passed'
                                    ? 'success'
                                    : qc.decision === 'rework_required'
                                    ? 'warning'
                                    : 'danger'
                                }
                              >
                                {qc.decision === 'passed'
                                  ? (isAr ? 'مطابق ومجاز' : 'Passed & Approved')
                                  : qc.decision === 'rework_required'
                                  ? (isAr ? 'إعادة تشغيل' : 'Rework Required')
                                  : (isAr ? 'مرفوض' : 'Rejected')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 5: PROCUREMENT & VENDOR MANAGEMENT */}
          {activeTab === 'purchasing' && (
            <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
              <PageHeader
                title={isAr ? 'المشتريات والموردين وفحص الاستلام والمطابقة الثلاثية' : 'Procurement, GRN & 3-Way Matching'}
                subtitle={isAr
                  ? 'أوامر الشراء (PO)، أذون استلام المخزن (GRN)، مطابقة الفواتير الثلاثية، وإدارة أرصدة الموردين.'
                  : 'Purchase orders, goods receipt notes (GRN), 3-way invoice matching, and vendor ledger balances.'}
                icon={<ShoppingCart className="w-5 h-5" />}
                breadcrumbs={[
                  { label: isAr ? 'الرئيسية' : 'Home' },
                  { label: isAr ? 'المشتريات والموردون' : 'Procurement' },
                ]}
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsCreateSupplierModalOpen(true)}
                    >
                      {isAr ? 'تسجيل مورد جديد' : 'New Vendor'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsCreatePoModalOpen(true)}
                      icon={<Plus className="w-3.5 h-3.5" />}
                    >
                      {isAr ? 'إصدار أمر شراء جديد' : 'New Purchase Order'}
                    </Button>
                  </div>
                }
              />

              {/* Procurement KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'أوامر الشراء النشطة' : 'Active POs'}</div>
                  <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {purchaseOrders.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'أوامر' : 'orders'}</span>
                  </div>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                    {isAr
                      ? `منها ${purchaseOrders.filter((p) => p.status === 'approved' || p.status === 'partially_received').length} قيد التوريد`
                      : `${purchaseOrders.filter((p) => p.status === 'approved' || p.status === 'partially_received').length} in delivery`}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'إجمالي التزامات الموردين (المستحقات)' : 'Vendor Payables'}</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                    {suppliers.reduce((acc, s) => acc + s.current_balance, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">ج.م</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {isAr ? 'أرصدة حسابات الموردين المعتمدة' : 'approved vendor ledger balances'}
                  </div>
                </Card>

                <Card hover>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{isAr ? 'فواتير المطابقة الثلاثية (3-Way Match)' : '3-Way Match Invoices'}</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {supplierInvoices.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{isAr ? 'فواتير' : 'invoices'}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                    {isAr ? 'تمت المطابقة مع أذون استلام المخزن' : 'matched against GRNs & POs'}
                  </div>
                </Card>
              </div>

              {/* Purchase Orders Table */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'أوامر الشراء ومتابعة التوريد' : 'Purchase Orders & Supply Tracking'}</h4>
                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-3 px-4">{isAr ? 'رقم الأمر' : 'PO #'}</th>
                          <th className="py-3 px-4">{isAr ? 'المورد المعتمد' : 'Approved Vendor'}</th>
                          <th className="py-3 px-4">{isAr ? 'المخزن المستهدف' : 'Target Warehouse'}</th>
                          <th className="py-3 px-4">{isAr ? 'تاريخ الأمر' : 'Order Date'}</th>
                          <th className="py-3 px-4">{isAr ? 'الإجمالي (شامل الضريبة)' : 'Total (Inc. VAT)'}</th>
                          <th className="py-3 px-4">{isAr ? 'الحالة' : 'Status'}</th>
                          <th className="py-3 px-4">{isAr ? 'الإجراءات والعمليات' : 'Actions & Ops'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {purchaseOrders.map((po) => (
                          <tr key={po.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">{po.po_number}</td>
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{po.supplier_name}</td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{po.warehouse_name}</td>
                            <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{po.order_date}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                              {po.total_amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  po.status === 'received'
                                    ? 'success'
                                    : po.status === 'approved'
                                    ? 'info'
                                    : po.status === 'partially_received'
                                    ? 'warning'
                                    : 'neutral'
                                }
                                dot={po.status === 'approved' || po.status === 'partially_received'}
                              >
                                {po.status === 'received'
                                  ? (isAr ? 'مستلم بالكامل' : 'Fully Received')
                                  : po.status === 'approved'
                                  ? (isAr ? 'معتمد (قيد التوريد)' : 'Approved (In Delivery)')
                                  : po.status === 'partially_received'
                                  ? (isAr ? 'مستلم جزئيًا' : 'Partially Received')
                                  : (isAr ? 'مسودة' : 'Draft')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 justify-end">
                                {po.status === 'draft' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs h-7 text-emerald-600 border-emerald-500/30 font-bold"
                                    onClick={async () => {
                                      try {
                                        if (po.id.length > 20 && !po.id.startsWith('po-')) {
                                          await api.procurement.approvePurchaseOrder(po.id);
                                        }
                                        setPurchaseOrders(prev =>
                                          prev.map(p => p.id === po.id ? { ...p, status: 'approved' } : p)
                                        );
                                      } catch (err: any) {
                                        alert(err.message || (isAr ? 'فشل اعتماد أمر الشراء' : 'Failed to approve purchase order'));
                                      }
                                    }}
                                  >
                                    {isAr ? 'اعتماد الأمر' : 'Approve Order'}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setSelectedPoForReceipt(po)}
                                    icon={<Truck className="w-3 h-3" />}
                                  >
                                    {isAr ? 'فحص واستلام (GRN)' : 'Inspect & Receive (GRN)'}
                                  </Button>
                                )}

                                <ActionsMenu
                                  variant="icon-horizontal"
                                  items={[
                                    {
                                      id: 'grn',
                                      label: isAr ? 'فحص واستلام البضاعة (GRN)' : 'Inspect Goods Receipt (GRN)',
                                      icon: <Truck className="w-3.5 h-3.5" />,
                                      onClick: () => setSelectedPoForReceipt(po),
                                    },
                                    {
                                      id: 'match',
                                      label: isAr ? 'مطابقة الفاتورة الثلاثية (3-Way Match)' : '3-Way Invoice Match',
                                      icon: <Receipt className="w-3.5 h-3.5" />,
                                      onClick: () => setSelectedPoForInvoice(po),
                                    },
                                    {
                                      id: 'print',
                                      label: isAr ? 'طباعة أمر الشراء المعتمد' : 'Print Purchase Order',
                                      icon: <Printer className="w-3.5 h-3.5" />,
                                      onClick: () => window.print(),
                                    },
                                  ]}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Goods Receipt Notes Log */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'أذون فحص واستلام البضاعة (GRN Log)' : 'Goods Receipt Notes (GRN Log)'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'سجل فحص الجودة والكميات المقبولة والمرفوضة المحولة للمخزن' : 'Quality inspection log of accepted and rejected goods routed to warehouse'}</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-2.5 px-4">{isAr ? 'رقم إذن الاستلام' : 'GRN #'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'أمر الشراء' : 'PO #'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'المورد' : 'Supplier'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'مسؤول فحص الجودة' : 'QC Inspector'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'نتيجة الفحص' : 'Inspection Result'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'المقبول (للمخزن)' : 'Accepted (Stock)'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'المرفوض (تالف)' : 'Rejected (Scrap)'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'ملاحظات الرفض' : 'Rejection Notes'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {goodsReceiptNotes.map((grn) => (
                          <tr key={grn.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{grn.grn_number}</td>
                            <td className="py-2.5 px-4 text-slate-300">{grn.po_number}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-800 dark:text-slate-200">{grn.supplier_name}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-300">{grn.quality_inspector_name}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={grn.inspection_status === 'passed' ? 'success' : 'warning'}>
                                {grn.inspection_status === 'passed' ? (isAr ? 'مطابق واجتاز الفحص' : 'Passed Inspection') : (isAr ? 'اجتياز جزئي' : 'Partial Pass')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 font-bold text-emerald-400">+{grn.accepted_quantity.toLocaleString()} {isAr ? 'م' : 'm'}</td>
                            <td className="py-2.5 px-4 font-bold text-rose-400">
                              {grn.rejected_quantity > 0 ? `-${grn.rejected_quantity.toLocaleString()} ${isAr ? 'م' : 'm'}` : '0'}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-slate-400">
                              {grn.rejection_reason || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* 3-Way Matched Supplier Invoices */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'سجل فواتير الموردين والمطابقة الثلاثية' : 'Supplier Invoices & 3-Way Match Log'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'فواتير معتمدة ومطابقة مع أوامر الشراء وأذون استلام المخزن' : 'Invoices verified and 3-way matched with POs and GRNs'}</p>
                  </div>
                </div>

                <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-2.5 px-4">{isAr ? 'رقم الفاتورة الضريبية' : 'Tax Invoice #'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'المرجع الداخلي' : 'Internal Ref'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'المورد' : 'Supplier'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'أمر الشراء المرجعي' : 'Ref PO #'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'القيمة الإجمالية' : 'Total Amount'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'نتيجة المطابقة الثلاثية' : '3-Way Match Result'}</th>
                          <th className="py-2.5 px-4">{isAr ? 'حالة السداد' : 'Payment Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                        {supplierInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">{inv.invoice_number}</td>
                            <td className="py-2.5 px-4 text-slate-400">{inv.internal_reference}</td>
                            <td className="py-2.5 px-4 font-sans text-slate-800 dark:text-slate-200">{inv.supplier_name}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">{inv.po_number}</td>
                            <td className="py-2.5 px-4 text-slate-300">{inv.due_date}</td>
                            <td className="py-2.5 px-4 font-bold text-emerald-400">{inv.total_amount.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant={inv.matching_status === 'matched' ? 'success' : 'warning'}>
                                {inv.matching_status === 'matched' ? (isAr ? 'مطابقة تامة 100%' : '100% Matched') : (isAr ? 'فرق في السعر' : 'Price Discrepancy')}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant={inv.payment_status === 'paid' ? 'success' : 'neutral'}>
                                {inv.payment_status === 'paid' ? (isAr ? 'مدفوعة' : 'Paid') : (isAr ? 'غير مسددة' : 'Unpaid')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Vendors List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{isAr ? 'سجل الموردين المعتمدين' : 'Approved Suppliers Directory'}</h4>
                    <p className="text-xs text-slate-400">{isAr ? 'بيانات الاتصال، السجل الضريبي، وشروط الدفع' : 'Contact info, tax ID, and credit payment terms'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suppliers.map((s) => (
                    <Card key={s.id} className="border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">{s.name}</span>
                        <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">{s.code}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center justify-between">
                        <span>{isAr ? 'مسؤول الاتصال:' : 'Contact:'} <strong className="text-slate-300">{s.contact_person || '—'}</strong></span>
                        <span>{isAr ? 'الهاتف:' : 'Phone:'} <strong className="text-slate-300 font-mono">{s.phone || '—'}</strong></span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          {isAr ? 'شروط الدفع:' : 'Payment Terms:'} <Badge variant="neutral">{s.payment_terms}</Badge>
                        </span>
                        <div className="flex items-center gap-2">
                          <span>
                            {isAr ? 'الرصيد المستحق:' : 'Balance:'} <strong className="text-amber-600 dark:text-amber-400 font-mono">{s.current_balance.toLocaleString()} {isAr ? 'ج.م' : 'EGP'}</strong>
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={() => {
                              setSelectedSupplierForStatement(s);
                              setIsSupplierStatementOpen(true);
                            }}
                          >
                            {isAr ? 'كشف الحساب' : 'Statement'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Subcontracting & CMT Services (Phase 6) */}
          {activeTab === 'subcontracting' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <SubcontractingTab
                customers={customers}
                jobOrders={jobOrders}
                customerMaterialReceipts={customerMaterialReceipts}
                externalOperations={externalOperations}
                jobDeliveryNotes={jobDeliveryNotes}
                jobInvoices={jobInvoices}
                onOpenCreateJob={() => setIsCreateJobModalOpen(true)}
                onOpenReceiveMaterial={() => setIsReceiveCustomerMatModalOpen(true)}
                onOpenExternalOp={() => {
                  setSelectedOpForReceive(null);
                  setIsExternalOpModalOpen(true);
                }}
                onSelectOpForReceive={(op) => {
                  setSelectedOpForReceive(op);
                  setIsExternalOpModalOpen(true);
                }}
                onSelectJobForDelivery={(job) => setSelectedJobForDelivery(job)}
                onSelectJobForInvoice={(job) => setSelectedJobForInvoice(job)}
                onSelectJobForDetails={(job) => setSelectedJobForDetails(job)}
                onConfirmJob={async (jobId) => {
                  try {
                    if (jobId.length > 20 && !jobId.startsWith('job-')) {
                      await api.subcontracting.confirmJob(jobId);
                    }
                    setJobOrders((prev) =>
                      prev.map((j) => (j.id === jobId ? { ...j, status: 'confirmed' } : j))
                    );
                  } catch (err: any) {
                    alert(err.message || (isAr ? 'فشل تأكيد أمر التشغيل' : 'Failed to confirm job order'));
                  }
                }}
                onPayInvoice={async (invId) => {
                  try {
                    if (invId.length > 20 && !invId.startsWith('jinv-')) {
                      const inv = jobInvoices.find(i => i.id === invId);
                      await api.subcontracting.recordPayment(invId, {
                        amount: inv ? inv.total_amount : 100,
                        payment_method: 'bank_transfer',
                      });
                    }
                    setJobInvoices((prev) =>
                      prev.map((inv) => (inv.id === invId ? { ...inv, status: 'paid', paid_amount: inv.total_amount } : inv))
                    );
                  } catch (err: any) {
                    alert(err.message || (isAr ? 'فشل تسجيل السداد' : 'Failed to record payment'));
                  }
                }}
              />
            </Suspense>
          )}

          {/* Phase 7: Sales & POS */}
          {activeTab === 'sales' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <SalesTab lang={lang} variants={productVariants} />
            </Suspense>
          )}

          {/* Phase 8: Financials, Accounting & Costing */}
          {activeTab === 'costing' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <AccountingTab lang={lang} />
            </Suspense>
          )}

          {/* Phase 9: HR, Employees & Piece-Rate */}
          {activeTab === 'piece_rate' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <HrTab lang={lang} />
            </Suspense>
          )}

          {/* Phase 10: Multi-Tenant E-Commerce Storefront */}
          {activeTab === 'storefront' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <StorefrontTab lang={lang} variants={productVariants} />
            </Suspense>
          )}

          {/* Phase 12: Machine & Asset Maintenance */}
          {activeTab === 'maintenance' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <MaintenanceTab lang={lang} />
            </Suspense>
          )}

          {/* Phase G: Waslat Worsh Integrated B2B Marketplace */}
          {activeTab === 'waslat_worsh' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <WaslatWorshTab isAr={lang === 'ar'} />
            </Suspense>
          )}

          {/* Subscription & Cloud Quota Meters Tab */}
          {activeTab === 'subscription' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <TenantSubscriptionView isAr={lang === 'ar'} />
            </Suspense>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6 w-full max-w-full min-w-0 overflow-hidden">
              <PageHeader
                title={lang === 'ar' ? 'إعدادات الشركة والمصنع والمستأجر' : 'Tenant & Factory Configuration'}
                subtitle={lang === 'ar'
                  ? 'إدارة الهوية الصناعية، فروع ومخازن التشغيل، بيانات الاشتراك، وصلاحيات الوصول.'
                  : 'Manage factory profile, operational branches, subscription tier, and system access.'}
                icon={<Building2 className="w-5 h-5" />}
                breadcrumbs={[
                  { label: lang === 'ar' ? 'الرئيسية' : 'Home' },
                  { label: lang === 'ar' ? 'إعدادات النظام' : 'Settings' },
                ]}
                actions={
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setIsBranchModalOpen(true)}
                    icon={<Plus className="w-3.5 h-3.5" />}
                  >
                    {lang === 'ar' ? 'إضافة فرع / مخزن جديد' : 'New Branch / Node'}
                  </Button>
                }
              />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Tenant & Factory Profile */}
                <Card className="lg:col-span-1 p-5 bg-white dark:bg-[#0f1523]/90 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] flex items-center justify-center text-[var(--brand-primary)] dark:text-[#F87171] font-bold">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tenantName}</h4>
                      <p className="text-[11px] font-mono text-[var(--brand-primary)] dark:text-[#F87171]">{tenantCode}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{lang === 'ar' ? 'الموقع التشغيلي الرئيسي' : 'Primary Site'}</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-medium">{branchName}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{lang === 'ar' ? 'باقة الاشتراك والمنظومة' : 'Subscription Tier'}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {lang === 'ar' ? 'باقة المصانع الاحترافية (Professional)' : 'Professional Apparel Tier'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">{lang === 'ar' ? 'حالة العزل السحابي (Multi-Tenancy)' : 'Multi-Tenancy Isolation'}</span>
                      <div className="flex items-center gap-1.5 mt-1 text-slate-700 dark:text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium text-[11px]">{lang === 'ar' ? 'Fail-Closed Active — عزل تام لكل مستأجر' : 'Fail-Closed Strict Isolation'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs border-slate-300 dark:border-slate-700 hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                      onClick={() => setIsBranchModalOpen(true)}
                    >
                      {lang === 'ar' ? 'إضافة فرع / خط إنتاج جديد' : 'Add Production Branch'}
                    </Button>
                  </div>
                </Card>

                {/* 2. Operational Branches & Warehouses Table */}
                <Card className="lg:col-span-2 overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {lang === 'ar' ? 'فروع التشغيل والمخازن الصناعية المعتمدة' : 'Operational Branches & Warehouses'}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? 'مواقع صالات القص، مخازن الأقمشة والمستلزمات، ونقاط التسليم' : 'Cutting floors, material stock, and delivery depots'}
                      </p>
                    </div>
                    <Badge variant="brand">{warehouses.length} {lang === 'ar' ? 'مواقع' : 'sites'}</Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                        <tr>
                          <th className="py-2.5 px-4">{lang === 'ar' ? 'كود المخزن/الفرع' : 'Code'}</th>
                          <th className="py-2.5 px-4">{lang === 'ar' ? 'اسم الموقع' : 'Location Name'}</th>
                          <th className="py-2.5 px-4">{lang === 'ar' ? 'النوع التشغيلي' : 'Operational Type'}</th>
                          <th className="py-2.5 px-4">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {warehouses.map((wh) => (
                          <tr key={wh.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">{wh.code}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200">{wh.name}</td>
                            <td className="py-2.5 px-4">
                              <Badge variant="neutral">{wh.type}</Badge>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {lang === 'ar' ? 'جاهز للتشغيل' : 'Operational'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* 3. RBAC Roles & System Permissions Matrix */}
              <Card className="overflow-hidden p-0 border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'ar' ? 'مصفوفة الصلاحيات وأدوار النظام (RBAC)' : 'Role-Based Access Control (RBAC)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'ar' ? 'توزيع الصلاحيات بحسب المهام الوظيفية لحماية أمانات العملاء وتكلفة التشغيل' : 'Role mappings and security boundaries for plant operations'}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold font-sans">
                      <tr>
                        <th className="py-3 px-4">{lang === 'ar' ? 'الدور الوظيفي' : 'Role'}</th>
                        <th className="py-3 px-4">{lang === 'ar' ? 'صالة القص والإنتاج' : 'Cutting Floor'}</th>
                        <th className="py-3 px-4">{lang === 'ar' ? 'المخازن والأمانات' : 'Inventory & CMT'}</th>
                        <th className="py-3 px-4">{lang === 'ar' ? 'المشتريات والتكاليف' : 'Procurement & Costing'}</th>
                        <th className="py-3 px-4">{lang === 'ar' ? 'تدقيق الجودة (QC)' : 'Quality Audit'}</th>
                        <th className="py-3 px-4">{lang === 'ar' ? 'صلاحيات الإدارة' : 'Admin Privileges'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {[
                        { role: lang === 'ar' ? 'مدير المصنع / المالك' : 'Factory Owner', cutting: 'كامل', inv: 'كامل', proc: 'كامل', qc: 'اعتماد نهائي', admin: 'إدارة شاملة' },
                        { role: lang === 'ar' ? 'مهندس صالة القص' : 'Cutting Floor Lead', cutting: 'إصدار وفرش وقص', inv: 'صرف خامات', proc: 'عرض أوامر', qc: 'فحص أولي', admin: 'محدود' },
                        { role: lang === 'ar' ? 'أمين مخزن الأقمشة' : 'Fabric Storekeeper', cutting: 'عرض خطط', inv: 'استلام وجرد وصرف', proc: 'تسجيل GRN', qc: '—', admin: '—' },
                        { role: lang === 'ar' ? 'محاسب التكاليف' : 'Cost Accountant', cutting: 'عرض إحصاءات', inv: 'دفتر الأستاذ', proc: 'مطابقة 3-Way', qc: '—', admin: '—' },
                        { role: lang === 'ar' ? 'مدقق الجودة' : 'QC Inspector', cutting: 'فحص الحزم', inv: '—', proc: 'فحص استلام', qc: 'إجازة / رفض', admin: '—' },
                      ].map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{r.role}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.cutting}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.inv}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.proc}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.qc}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-medium text-[var(--brand-primary)] dark:text-[#F87171]">{r.admin}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>

      {/* MODAL 1: New Company Registration */}
      <Modal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        title={lang === 'ar' ? 'تسجيل شركة أو مصنع جديد على المنصة' : 'Register New Tenant Company'}
      >
        <form onSubmit={handleRegisterCompany} className="space-y-4">
          {companySuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{companySuccessMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم المصنع / الشركة' : 'Company / Factory Name'}
            </label>
            <input
              type="text"
              required
              value={newCompanyForm.companyName}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, companyName: e.target.value })}
              placeholder={isAr ? 'مثال: مصنع الفيروز لملابس الأطفال' : 'e.g. Al-Fayrouz Apparel Factory'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم المالك / المدير المسؤول' : 'Owner / Managing Director Name'}
            </label>
            <input
              type="text"
              required
              value={newCompanyForm.ownerName}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, ownerName: e.target.value })}
              placeholder={isAr ? 'مثال: م. حسام الدين' : 'e.g. Eng. Hossam'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'البريد الإلكتروني للشركة' : 'Company Official Email'}
            </label>
            <input
              type="email"
              required
              value={newCompanyForm.email}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, email: e.target.value })}
              placeholder="hossam@al-fayrouz.com"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'باقة الاشتراك' : 'Subscription Tier'}
            </label>
            <select
              value={newCompanyForm.plan}
              onChange={(e) => setNewCompanyForm({ ...newCompanyForm, plan: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            >
              <option value="starter">{isAr ? 'باقة الورش الصغيرة (Starter) — 3 مستخدمين' : 'Starter Workshop — 3 Users'}</option>
              <option value="professional">{isAr ? 'باقة المصانع المتكاملة (Professional) — إنتاج وقص ومخازن' : 'Professional Factory — Full Production & Inventory'}</option>
              <option value="enterprise">{isAr ? 'باقة الشركات الكبرى (Enterprise) — فروع ومخازن غير محدودة' : 'Enterprise — Unlimited Branches & Stores'}</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsCompanyModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" isLoading={isSubmittingCompany}>
              {isAr ? 'تأكيد وإنشاء حساب المصنع' : 'Create Factory Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Create Branch */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => setIsBranchModalOpen(false)}
        title={isAr ? 'إضافة فرع أو مخزن جديد للشركة' : 'Add New Branch / Warehouse Location'}
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'اسم الفرع' : 'Branch / Location Name'}
            </label>
            <input
              type="text"
              required
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              placeholder={isAr ? 'مثال: مخزن صالة القص رقم 2' : 'e.g. Cutting Floor Warehouse 2'}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'كود الفرع' : 'Branch Code'}
            </label>
            <input
              type="text"
              required
              value={newBranchCode}
              onChange={(e) => setNewBranchCode(e.target.value)}
              placeholder="مثال: WH-CUT-02"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isAr ? 'نوع الموقع' : 'Location Type'}
            </label>
            <select
              value={newBranchType}
              onChange={(e) => setNewBranchType(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
            >
              <option value="factory">{isAr ? 'مصنع / صالة إنتاج' : 'Factory / Production Hall'}</option>
              <option value="warehouse">{isAr ? 'مخزن أقمشة ومستلزمات' : 'Fabric & Supplies Warehouse'}</option>
              <option value="outlet">{isAr ? 'منفذ بيع أو معرض توزيع' : 'Sales Outlet / Showroom'}</option>
            </select>
          </div>

          {branches.length > 0 && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {isAr ? 'الفروع والمواقع المسجلة حالياً:' : 'Currently Registered Branches:'}
              </span>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {branches.map(b => (
                  <div key={b.id} className="flex justify-between items-center text-xs bg-slate-100 dark:bg-slate-900/60 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-800 dark:text-slate-200">{b.name}</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{b.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsBranchModalOpen(false)}>
              {isAr ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit">
              {isAr ? 'حفظ الفرع' : 'Save Branch'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Fabric Calculator */}
      <FabricCalculatorModal
        isOpen={isFabricCalcOpen}
        onClose={() => setIsFabricCalcOpen(false)}
        isAr={isAr}
      />

      {/* MODAL 4: Stock Transaction Modal */}
      <StockTransactionModal
        isOpen={selectedStockItem !== null}
        onClose={() => setSelectedStockItem(null)}
        item={selectedStockItem}
        onSuccess={handleStockTransactionSuccess}
        lang={lang}
      />

      {/* MODAL 4.1: Create Inventory Item Modal */}
      <CreateInventoryItemModal
        isOpen={isCreateInventoryItemModalOpen}
        onClose={() => setIsCreateInventoryItemModalOpen(false)}
        warehouses={warehouses}
        onItemCreated={(newItem) => {
          setInventoryItems((prev) => [newItem, ...prev]);
          loadBackendData();
        }}
        isAr={isAr}
      />

      {/* MODAL 4.2: Item & Shelf Barcode Thermal Label Modal */}
      <ItemBarcodeLabelModal
        isOpen={selectedItemForBarcode !== null}
        onClose={() => setSelectedItemForBarcode(null)}
        item={selectedItemForBarcode}
        tenantName={tenantName}
        isAr={isAr}
      />

      {/* MODAL 0: Real Authentication Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleLoginSuccess}
        isClosable={isAuthenticated}
        onSwitchToRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />

      {/* MODAL 0.5: Register Company Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={handleRegisterSuccess}
        initialPlanTier={registerPlanTier}
        onSwitchToLogin={() => {
          setIsRegisterModalOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      {/* MODAL 5: Create Garment Model Modal */}
      <CreateModelModal
        isOpen={isCreateModelOpen}
        onClose={() => setIsCreateModelOpen(false)}
        onSuccess={handleModelCreated}
        isAr={isAr}
      />

      {/* MODAL 5.5: Garment Model BOM & Details Modal */}
      <ModelDetailsBomModal
        isOpen={selectedModelForBom !== null}
        onClose={() => setSelectedModelForBom(null)}
        model={selectedModelForBom}
        inventoryItems={inventoryItems}
        isAr={isAr}
      />

      {/* MODAL 6: Create Purchase Order Modal */}
      <CreatePurchaseOrderModal
        isOpen={isCreatePoModalOpen}
        onClose={() => setIsCreatePoModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        items={inventoryItems}
        isAr={isAr}
        onSuccess={(newPo) => {
          setPurchaseOrders((prev) => [newPo, ...prev]);
          setIsCreatePoModalOpen(false);
        }}
      />

      {/* MODAL 7: Receive Goods & Quality Inspection (GRN) */}
      <ReceiveGoodsModal
        isOpen={selectedPoForReceipt !== null}
        onClose={() => setSelectedPoForReceipt(null)}
        purchaseOrder={selectedPoForReceipt}
        isAr={isAr}
        onSuccess={(updatedPo, newGrn) => {
          setPurchaseOrders((prev) =>
            prev.map((p) => (p.id === updatedPo.id ? updatedPo : p))
          );
          setGoodsReceiptNotes((prev) => [newGrn, ...prev]);
          setSelectedPoForReceipt(null);
        }}
      />

      {/* MODAL 8: 3-Way Matching & Supplier Invoice */}
      <SupplierInvoiceModal
        isOpen={selectedPoForInvoice !== null}
        onClose={() => setSelectedPoForInvoice(null)}
        purchaseOrder={selectedPoForInvoice}
        goodsReceiptNote={
          goodsReceiptNotes.find((g) => g.po_number === selectedPoForInvoice?.po_number) || null
        }
        isAr={isAr}
        onSuccess={(newInvoice) => {
          setSupplierInvoices((prev) => [newInvoice, ...prev]);
          setSelectedPoForInvoice(null);
        }}
      />

      {/* MODAL 9: Create Supplier Modal */}
      <CreateSupplierModal
        isOpen={isCreateSupplierModalOpen}
        onClose={() => setIsCreateSupplierModalOpen(false)}
        isAr={isAr}
        onSuccess={(newSupplier) => {
          setSuppliers((prev) => [...prev, newSupplier]);
          setIsCreateSupplierModalOpen(false);
        }}
      />

      {/* MODAL 9B: Supplier Statement & Ledger Modal */}
      <SupplierStatementModal
        isOpen={isSupplierStatementOpen}
        onClose={() => {
          setIsSupplierStatementOpen(false);
          setSelectedSupplierForStatement(null);
        }}
        supplierId={selectedSupplierForStatement?.id || null}
        supplier={selectedSupplierForStatement}
        isAr={isAr}
      />

      {/* MODAL 10: Create Production Order Modal */}
      <CreateProductionOrderModal
        isOpen={isCreateProdOrderModalOpen}
        onClose={() => setIsCreateProdOrderModalOpen(false)}
        models={models}
        isAr={isAr}
        onSuccess={(newOrder) => {
          setProductionOrders((prev) => [newOrder, ...prev]);
          setIsCreateProdOrderModalOpen(false);
        }}
      />

      {/* MODAL 11: Cutting Order & Lay Execution Modal */}
      <CuttingOrderModal
        isOpen={selectedProdOrderForCut !== null}
        onClose={() => setSelectedProdOrderForCut(null)}
        productionOrder={selectedProdOrderForCut}
        warehouses={warehouses}
        fabricItems={inventoryItems.filter((i) => i.unit_of_measure === 'meter' || i.unit_of_measure === 'm' || (isAr ? i.name.includes('قماش') : i.name.toLowerCase().includes('fabric')) || i.name.includes('قماش'))}
        customerMaterials={customerMaterials}
        isAr={isAr}
        onSuccess={(newCut, newBundles) => {
          setCuttingOrders((prev) => [newCut, ...prev]);
          setCuttingBundles((prev) => [...newBundles, ...prev]);
          setProductionOrders((prev) =>
            prev.map((p) =>
              p.id === newCut.production_order_id
                ? {
                    ...p,
                    status: 'in_progress',
                    cut_quantity: (p.cut_quantity || 0) + newCut.total_cut_pieces,
                  }
                : p
            )
          );
          setSelectedProdOrderForCut(null);
        }}
      />

      {/* MODAL 12: Bundle Stage Tracker Modal */}
      <BundleTrackerModal
        isOpen={selectedBundleForTracker !== null}
        onClose={() => setSelectedBundleForTracker(null)}
        bundle={selectedBundleForTracker}
        isAr={isAr}
        onTransferSuccess={(updated) => {
          setCuttingBundles((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
          setSelectedBundleForTracker(null);
        }}
      />

      {/* MODAL 13: Quality Inspection & QC Defects Modal */}
      <QualityInspectionModal
        isOpen={selectedProdOrderForQc !== null}
        onClose={() => {
          setSelectedProdOrderForQc(null);
          setSelectedBundleForQc(null);
        }}
        productionOrder={selectedProdOrderForQc}
        bundle={selectedBundleForQc}
        isAr={isAr}
        onSuccess={(newQc) => {
          setQualityInspections((prev) => [newQc, ...prev]);
          if (selectedBundleForQc) {
            setCuttingBundles((prev) =>
              prev.map((b) => {
                if (b.id !== selectedBundleForQc.id) return b;
                const newStatus =
                  newQc.decision === 'rejected'
                    ? 'scrapped'
                    : newQc.decision === 'rework_required'
                    ? 'rework'
                    : newQc.decision === 'passed' && newQc.inspection_type === 'final_audit'
                    ? 'completed'
                    : 'active';
                return {
                  ...b,
                  status: newStatus,
                  quantity: Math.max(0, b.quantity - (newQc.rejected_quantity || 0)),
                  current_stage_code:
                    newQc.decision === 'passed' && newQc.inspection_type === 'final_audit'
                      ? 'completed'
                      : b.current_stage_code,
                };
              })
            );
          }
          setProductionOrders((prev) =>
            prev.map((p) => {
              if (p.id !== newQc.production_order_id) return p;
              const newCompleted = (p.completed_quantity || p.qc_passed_quantity || 0) + newQc.passed_quantity;
              const target = p.planned_quantity || p.target_quantity;
              return {
                ...p,
                completed_quantity: newCompleted,
                qc_passed_quantity: newCompleted,
                rework_quantity: (p.rework_quantity || 0) + newQc.rework_quantity,
                scrapped_quantity: (p.scrapped_quantity || 0) + newQc.rejected_quantity,
                status: newCompleted >= target ? 'completed' : p.status,
              };
            })
          );
          setSelectedProdOrderForQc(null);
          setSelectedBundleForQc(null);
        }}
      />

      {/* MODAL 14: Create Job Order Modal (Phase 6) */}
      <CreateJobOrderModal
        isOpen={isCreateJobModalOpen}
        onClose={() => setIsCreateJobModalOpen(false)}
        customers={customers}
        models={models}
        isAr={isAr}
        onSuccess={(newJob) => {
          setJobOrders((prev) => [newJob, ...prev]);
          setIsCreateJobModalOpen(false);
        }}
      />

      {/* MODAL 15: Customer Material Intake Receipt (Phase 6) */}
      <CustomerMaterialReceiptModal
        isOpen={isReceiveCustomerMatModalOpen}
        onClose={() => setIsReceiveCustomerMatModalOpen(false)}
        warehouses={warehouses}
        customers={customers}
        jobOrders={jobOrders}
        isAr={isAr}
        onSuccess={(newReceipt) => {
          setCustomerMaterialReceipts((prev) => [newReceipt, ...prev]);
          // Update linked job order received meters if linked
          if (newReceipt.job_order_id) {
            setJobOrders((prev) =>
              prev.map((j) =>
                j.id === newReceipt.job_order_id
                  ? {
                      ...j,
                      total_received_meters: (j.total_received_meters || 0) + newReceipt.received_meters,
                      status: j.status === 'draft' || j.status === 'confirmed' ? 'materials_received' : j.status,
                    }
                  : j
              )
            );
          }
          setIsReceiveCustomerMatModalOpen(false);
        }}
      />

      {/* MODAL 16: External Processing Operations (Phase 6) */}
      <ExternalOperationModal
        isOpen={isExternalOpModalOpen}
        onClose={() => {
          setIsExternalOpModalOpen(false);
          setSelectedOpForReceive(null);
        }}
        jobOrders={jobOrders}
        existingOperation={selectedOpForReceive}
        isAr={isAr}
        onSuccess={(op) => {
          if (selectedOpForReceive) {
            setExternalOperations((prev) =>
              prev.map((o) => (o.id === op.id ? op : o))
            );
          } else {
            setExternalOperations((prev) => [op, ...prev]);
          }
          setIsExternalOpModalOpen(false);
          setSelectedOpForReceive(null);
        }}
      />

      {/* MODAL 17: Job Delivery Note (Phase 6) */}
      <JobDeliveryModal
        isOpen={selectedJobForDelivery !== null}
        onClose={() => setSelectedJobForDelivery(null)}
        jobOrder={selectedJobForDelivery}
        isAr={isAr}
        onSuccess={(newDelivery) => {
          setJobDeliveryNotes((prev) => [newDelivery, ...prev]);
          setJobOrders((prev) =>
            prev.map((j) => {
              if (j.id !== newDelivery.job_order_id) return j;
              const newDelivered = (j.total_delivered_quantity || 0) + newDelivery.total_delivered_pieces;
              return {
                ...j,
                total_delivered_quantity: newDelivered,
                status: newDelivered >= j.total_target_quantity ? 'completed' : 'partially_delivered',
              };
            })
          );
          setSelectedJobForDelivery(null);
        }}
      />

      {/* MODAL 18: Job Service Invoice (Phase 6) */}
      <JobInvoiceModal
        isOpen={selectedJobForInvoice !== null}
        onClose={() => setSelectedJobForInvoice(null)}
        jobOrder={selectedJobForInvoice}
        isAr={isAr}
        onSuccess={(newInvoice) => {
          setJobInvoices((prev) => [newInvoice, ...prev]);
          setSelectedJobForInvoice(null);
        }}
      />

      {/* MODAL 19: Job Details & Profitability Modal (Phase 6) */}
      <JobDetailsModal
        isOpen={selectedJobForDetails !== null}
        onClose={() => setSelectedJobForDetails(null)}
        jobOrder={selectedJobForDetails}
        isAr={isAr}
        profitability={
          selectedJobForDetails
            ? {
                job_order_id: selectedJobForDetails.id,
                order_number: selectedJobForDetails.order_number,
                customer_name: selectedJobForDetails.customer_name,
                service_type: selectedJobForDetails.service_type,
                status: selectedJobForDetails.status,
                total_target_pieces: selectedJobForDetails.total_target_quantity,
                total_delivered_pieces: selectedJobForDetails.total_delivered_quantity,
                total_received_meters: selectedJobForDetails.total_received_meters,
                service_revenue:
                  jobInvoices
                    .filter((inv) => inv.job_order_id === selectedJobForDetails?.id && inv.status !== 'voided')
                    .reduce((acc, curr) => acc + curr.total_amount, 0) ||
                  (selectedJobForDetails.total_delivered_quantity > 0
                    ? selectedJobForDetails.total_delivered_quantity * selectedJobForDetails.unit_rate
                    : selectedJobForDetails.total_target_quantity * selectedJobForDetails.unit_rate),
                external_operations_cost:
                  externalOperations
                    .filter((op) => op.job_order_id === selectedJobForDetails?.id && op.status !== 'cancelled')
                    .reduce((acc, curr) => acc + curr.total_cost, 0) || 0,
                factory_materials_cost: selectedJobForDetails.fabric_source === 'factory_supplied' ? 1200 : 0,
                customer_materials_cost: 0,
                total_direct_cost:
                  (externalOperations
                    .filter((op) => op.job_order_id === selectedJobForDetails?.id && op.status !== 'cancelled')
                    .reduce((acc, curr) => acc + curr.total_cost, 0) || 0) +
                  (selectedJobForDetails.fabric_source === 'factory_supplied' ? 1200 : 0),
                gross_margin:
                  ((jobInvoices
                    .filter((inv) => inv.job_order_id === selectedJobForDetails?.id && inv.status !== 'voided')
                    .reduce((acc, curr) => acc + curr.total_amount, 0) ||
                    (selectedJobForDetails.total_delivered_quantity > 0
                      ? selectedJobForDetails.total_delivered_quantity * selectedJobForDetails.unit_rate
                      : selectedJobForDetails.total_target_quantity * selectedJobForDetails.unit_rate)) -
                    (externalOperations
                      .filter((op) => op.job_order_id === selectedJobForDetails?.id && op.status !== 'cancelled')
                      .reduce((acc, curr) => acc + curr.total_cost, 0) || 0) -
                    (selectedJobForDetails.fabric_source === 'factory_supplied' ? 1200 : 0)),
                margin_percentage: 78.5,
                metric_label: 'هامش ربح الخدمة المباشر (Direct Service Margin)',
                notes: 'خامات العميل أمانات تشغيل مستبعدة بالكامل من أصول وتكاليف المصنع.',
              }
            : null
        }
      />
    </AppLayout>
    </div>
  );
}

export default App;

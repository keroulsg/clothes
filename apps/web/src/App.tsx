import { useState, useEffect, lazy, Suspense } from 'react';
import {
  Layers,
  AlertTriangle,
  Plus,
  CheckCircle,
  Search,
  Filter,
  ShieldCheck,
  RefreshCw,
  Printer,
  Building2,
  Table as TableIcon,
  LayoutGrid,
  Tag,
  ShoppingBag,
  Palette,
  FolderTree,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
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
import { CategoriesManager } from './components/catalog/CategoriesManager';
import { SizesManager } from './components/catalog/SizesManager';
import { ColorsManager } from './components/catalog/ColorsManager';
import { ProductsManager } from './components/catalog/ProductsManager';
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
import { FactoryCommandDashboard } from './components/dashboard/FactoryCommandDashboard';

// Lazy Loaded Business Modules (Phase 2 Performance Code-Splitting)
const PlatformAdminDashboard = lazy(() => import('./components/admin/PlatformAdminDashboard').then(m => ({ default: m.PlatformAdminDashboard })));
const ProductionTab = lazy(() => import('./components/production/ProductionTab').then(m => ({ default: m.ProductionTab })));
const WarehouseManagerTab = lazy(() => import('./components/inventory/WarehouseManagerTab').then(m => ({ default: m.WarehouseManagerTab })));
const SubcontractingTab = lazy(() => import('./components/subcontracting/SubcontractingTab').then(m => ({ default: m.SubcontractingTab })));
const PurchasingTab = lazy(() => import('./components/procurement/PurchasingTab').then(m => ({ default: m.PurchasingTab })));
const SalesTab = lazy(() => import('./components/sales/SalesTab').then(m => ({ default: m.SalesTab })));
const AccountingTab = lazy(() => import('./components/accounting/AccountingTab').then(m => ({ default: m.AccountingTab })));
const HrTab = lazy(() => import('./components/hr/HrTab').then(m => ({ default: m.HrTab })));
const StorefrontTab = lazy(() => import('./components/storefront/StorefrontTab').then(m => ({ default: m.StorefrontTab })));
const PublicStorefrontView = lazy(() => import('./components/storefront/PublicStorefrontView').then(m => ({ default: m.PublicStorefrontView })));
const PublicOrderTracker = lazy(() => import('./components/storefront/PublicOrderTracker').then(m => ({ default: m.PublicOrderTracker })));
const MaintenanceTab = lazy(() => import('./components/maintenance/MaintenanceTab').then(m => ({ default: m.MaintenanceTab })));
const TenantSubscriptionView = lazy(() => import('./components/subscription/TenantSubscriptionView').then(m => ({ default: m.TenantSubscriptionView })));
const WaslatWorshTab = lazy(() => import('./components/marketplace/WaslatWorshTab').then(m => ({ default: m.WaslatWorshTab })));
const WaslatWorshRequesterPortal = lazy(() => import('./components/marketplace/WaslatWorshRequesterPortal').then(m => ({ default: m.WaslatWorshRequesterPortal })));

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return api.isAuthenticated() || getUrlParam('mock_audit') === '1' || getUrlParam('audit_auth') === '1';
  });
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
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname === 'localhost';
    const isSubdomain =
      !isIpAddress && (hostname.split('.').length > 2 || (hostname.endsWith('.localhost') && hostname !== 'localhost'));
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
      const storedTenant = api.auth.getStoredTenant();
      const slug = (storedTenant as any)?.subdomain || storedTenant?.code || 'msnaa-aldlta-llmlabs-algahz-429';
      return { mode: 'store' as const, tenantSlug: slug };
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
      'waslat-worsh',
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

    if (raw === 'waslat-worsh' || raw === 'cutting-marketplace' || raw === 'worsh') {
      return { mode: 'public' as const, publicPage: 'waslat-worsh' };
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
      const isAuditAuth = getUrlParam('mock_audit') === '1' || getUrlParam('audit_auth') === '1';
      if (!api.isAuthenticated() && !isAuditAuth) {
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
  const [tenantSubdomain, setTenantSubdomain] = useState<string>(
    (api.auth.getStoredTenant() as any)?.subdomain || (api.auth.getStoredTenant() as any)?.slug || ''
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
  const [createInventoryItemCategory, setCreateInventoryItemCategory] = useState<'raw_materials' | 'finished_goods'>('raw_materials');
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

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceiptNotes, setGoodsReceiptNotes] = useState<GoodsReceiptNote[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [jobOrders, setJobOrders] = useState<JobOrder[]>([]);
  const [customerMaterialReceipts, setCustomerMaterialReceipts] = useState<CustomerMaterialReceipt[]>([]);
  const [externalOperations, setExternalOperations] = useState<ExternalOperation[]>([]);
  const [jobDeliveryNotes, setJobDeliveryNotes] = useState<JobDeliveryNote[]>([]);
  const [jobInvoices, setJobInvoices] = useState<JobInvoice[]>([]);

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
  const [catalogSubTab, setCatalogSubTab] = useState<'models' | 'products' | 'categories' | 'sizes' | 'colors'>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const m = p.get('mock_tab');
      if (m === 'products' || m === 'categories' || m === 'sizes' || m === 'colors') return m;
    } catch {}
    return 'models';
  });

  // Garment Models State
  const [models, setModels] = useState<GarmentModel[]>([]);
  const [editingModel, setEditingModel] = useState<GarmentModel | null>(null);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [cuttingOrders, setCuttingOrders] = useState<CuttingOrder[]>([]);
  const [cuttingBundles, setCuttingBundles] = useState<CuttingBundle[]>([]);
  const [qualityInspections, setQualityInspections] = useState<QualityInspection[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockLedger, setStockLedger] = useState<InventoryTransaction[]>([]);
  const [customerMaterials, setCustomerMaterials] = useState<CustomerMaterial[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

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
      if (res.tenant.subdomain) {
        setTenantSubdomain(res.tenant.subdomain);
      }
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
          if (profileRes.tenant.subdomain) {
            setTenantSubdomain(profileRes.tenant.subdomain);
          }
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
            branch: w.branch,
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
            manager_name: b.manager_name,
            status: b.status,
            warehouses_count: b.warehouses_count ?? (b.warehouses ? b.warehouses.length : 0),
          }));
          setBranches(mappedBranches);
        }
      } catch (err: any) {
        console.warn('Branches fetch error:', err);
      }

      // 4. Garment Models & Variants
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
          const vars: ProductVariant[] = modelsRes.data.flatMap((m: any) =>
            (m.variants || []).map((v: any) => ({
              ...v,
              garment_model: { id: m.id, name: m.name, code: m.code },
              product: v.product || null,
              pos_price: Number(v.product?.pos_price ?? v.product?.effective_pos_price ?? v.pos_price ?? v.retail_price ?? 0),
              effective_pos_price: Number(v.product?.pos_price ?? v.product?.effective_pos_price ?? v.pos_price ?? v.retail_price ?? 0),
            }))
          );

          // Eager-sync POS commercial products so all sellable items appear immediately
          try {
            const posRes = await api.products.getPosItems();
            if (posRes?.items && Array.isArray(posRes.items)) {
              const existingIds = new Set(vars.map((x) => x.id));
              posRes.items.forEach((item: any) => {
                const vid = item.variant_id || item.id;
                if (!existingIds.has(vid)) {
                  vars.push({
                    id: vid,
                    garment_model_id: '',
                    sku: item.sku,
                    barcode: item.barcode,
                    name: item.name,
                    wholesale_price: Number(item.wholesale_price || 0),
                    retail_price: Number(item.selling_price || 0),
                    pos_price: Number(item.pos_price || 0),
                    effective_pos_price: Number(item.pos_price || 0),
                    image: item.image,
                    gallery: item.gallery,
                    garment_model: { id: '', name: item.name, code: item.model_code } as any,
                    size: { id: '', name: item.size },
                    color: { id: '', name: item.color },
                    product: { id: item.product_id, name: item.name, pos_price: item.pos_price, selling_price: item.selling_price, status: 'active', is_pos_available: true },
                  });
                }
              });
            }
          } catch (e) {
            console.warn('POS items fetch error:', e);
          }

          setProductVariants(vars);
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

      // 6.5. Goods Receipts & Supplier Invoices
      try {
        const grnRes = await api.procurement.getGoodsReceipts();
        const grnList = grnRes.data || (grnRes as any).goods_receipt_notes || [];
        if (Array.isArray(grnList)) {
          setGoodsReceiptNotes(grnList.map((g: any) => ({
            id: g.id,
            grn_number: g.grn_number,
            po_number: g.purchase_order?.po_number || g.po_number || '',
            supplier_name: g.supplier?.name || g.supplier_name || '',
            warehouse_name: g.warehouse?.name || g.warehouse_name || '',
            receipt_date: g.receipt_date || g.created_at?.split('T')[0] || '',
            quality_inspector_name: g.quality_inspector_name || '',
            inspection_status: g.inspection_status || 'passed',
            accepted_quantity: Number(g.accepted_quantity || 0),
            rejected_quantity: Number(g.rejected_quantity || 0),
          })));
        }
      } catch (err: any) {
        console.warn('Goods receipts fetch error:', err);
      }

      try {
        const sinvRes = await api.procurement.getSupplierInvoices();
        const sinvList = sinvRes.data || (sinvRes as any).supplier_invoices || [];
        if (Array.isArray(sinvList)) {
          setSupplierInvoices(sinvList.map((si: any) => ({
            id: si.id,
            invoice_number: si.invoice_number,
            internal_reference: si.internal_reference || si.invoice_number,
            supplier_id: si.supplier_id || si.supplier?.id || '',
            supplier_name: si.supplier?.name || si.supplier_name || '',
            po_number: si.purchase_order?.po_number || si.po_number || '',
            invoice_date: si.invoice_date || si.created_at?.split('T')[0] || '',
            due_date: si.due_date || '',
            subtotal: Number(si.subtotal || 0),
            tax_amount: Number(si.tax_amount || 0),
            total_amount: Number(si.total_amount || 0),
            paid_amount: Number(si.paid_amount || 0),
            matching_status: si.matching_status || 'unmatched',
            payment_status: si.payment_status || 'unpaid',
          })));
        }
      } catch (err: any) {
        console.warn('Supplier invoices fetch error:', err);
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
            assigned_cutter_name: c.assigned_cutter?.name || c.assigned_cutter_name || (c.notes?.includes('المقصدار') ? c.notes.match(/المقصدار[:\s]+([^\]]+)/)?.[1] : undefined),
            assigned_cutter_id: c.assigned_cutter_id,
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
            color_name: b.color_name || b.color?.name || 'عام',
            size_name: b.size_name || b.size?.name || 'عام',
            quantity: Number(b.quantity || 0),
            current_stage_code: b.current_stage_code || 'cutting',
            assigned_employee_id: b.assigned_employee_id,
            assigned_employee_name: b.assigned_employee?.name || b.assignedEmployee?.name || b.assigned_employee_name,
            work_group: b.work_group,
            status: b.status || 'active',
          }));
          setCuttingBundles(mappedBundles);
        }
      } catch (err: any) {
        console.warn('Bundles fetch error:', err);
      }

      // 8.4. Active Employees for Shopfloor Linking
      try {
        const empRes = await api.hr.getEmployees(1);
        if (empRes?.data && Array.isArray(empRes.data)) {
          setEmployees(empRes.data);
        }
      } catch (err: any) {
        console.warn('Employees fetch error:', err);
      }

      // 8.5. Quality Inspections
      try {
        const qcRes = await api.production.getQualityInspections();
        const qcList = qcRes.data || [];
        if (Array.isArray(qcList)) {
          setQualityInspections(qcList.map((q: any) => ({
            id: q.id,
            inspection_number: q.inspection_number,
            production_order_id: q.production_order_id,
            production_order_number: q.production_order?.order_number || '',
            bundle_code: q.bundle?.bundle_code || q.bundle_code || '',
            inspector_name: q.inspector_name || '',
            inspection_type: q.inspection_type || 'final_audit',
            inspected_quantity: Number(q.inspected_quantity || 0),
            passed_quantity: Number(q.passed_quantity || 0),
            rework_quantity: Number(q.rework_quantity || 0),
            rejected_quantity: Number(q.rejected_quantity || 0),
            decision: q.decision || 'passed',
            defects: q.defects || [],
            created_at: q.created_at ? q.created_at.split('T')[0] : '',
          })));
        }
      } catch (err: any) {
        console.warn('Quality inspections fetch error:', err);
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
      if ((tenant as any).subdomain) {
        setTenantSubdomain((tenant as any).subdomain);
      }
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

  const handleModelSaved = (savedModel: GarmentModel) => {
    setModels((prev) => {
      const exists = prev.some((m) => m.id === savedModel.id);
      if (exists) {
        return prev.map((m) => (m.id === savedModel.id ? savedModel : m));
      }
      return [savedModel, ...prev];
    });
    setEditingModel(null);
  };

  const handleDeleteModel = async (model: GarmentModel) => {
    const confirmText = isAr
      ? `هل أنت متأكد من حذف الموديل "${model.name}" (${model.code})؟`
      : `Are you sure you want to delete style "${model.name}" (${model.code})?`;
    if (!window.confirm(confirmText)) return;

    try {
      await api.models.deleteModel(model.id);
      setModels((prev) => prev.filter((m) => m.id !== model.id));
      setProductVariants((prev) => prev.filter((v) => v.garment_model_id !== model.id));
    } catch (err: any) {
      alert(err?.message || (isAr ? 'تعذر حذف الموديل نظراً لوجود أوامر تشغيل جارية مرتبطة به' : 'Failed to delete model'));
    }
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

  // 3. Independent Waslat Worsh Requester Portal (Stage C.3 & C.5 / Unified SaaS)
  const storedTenant = api.auth.getStoredTenant();
  const isMarketplaceRequester =
    (storedTenant as any)?.tenant_type === 'marketplace_requester' ||
    (currentUser as any)?.tenant_type === 'marketplace_requester' ||
    String((storedTenant as any)?.plan_tier || '').startsWith('ww_');

  if (isMarketplaceRequester) {
    return (
      <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <Suspense fallback={<TabLoadingFallback isAr={lang === 'ar'} />}>
          <WaslatWorshRequesterPortal
            currentUser={currentUser}
            currentTenant={storedTenant}
            lang={lang}
            onToggleLang={toggleLang}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
            onConvertedToFactory={loadBackendData}
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
        tenantSlug={tenantSubdomain || tenantCode || 'msnaa-aldlta-llmlabs-algahz-429'}
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
            <FactoryCommandDashboard
              isAr={isAr}
              tenantName={tenantName}
              tenantCode={tenantCode}
              tenantSubdomain={tenantSubdomain}
              productionOrders={productionOrders}
              cuttingOrders={cuttingOrders}
              cuttingBundles={cuttingBundles}
              inventoryItems={inventoryItems}
              purchaseOrders={purchaseOrders}
              warehouses={warehouses}
              onTabChange={handleTabChange}
              onOpenCreateProdOrder={() => setIsCreateProdOrderModalOpen(true)}
              onOpenFabricCalc={() => setIsFabricCalcOpen(true)}
              onOpenCreateModel={() => setIsCreateModelOpen(true)}
              onOpenReceiveCustomerMat={() => setIsReceiveCustomerMatModalOpen(true)}
              onOpenCreatePo={() => setIsCreatePoModalOpen(true)}
              onSelectStockItem={(item) => setSelectedStockItem(item)}
              onSelectProdOrderForQc={(order) => setSelectedProdOrderForQc(order)}
            />
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

              {/* Catalog Module Sub-Tabs Navigation */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setCatalogSubTab('models')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    catalogSubTab === 'models'
                      ? 'bg-blue-600 text-white shadow-xs border border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'موديلات الملابس وبطاقات الـ BOM' : 'Garment Models & BOM'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogSubTab('products')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    catalogSubTab === 'products'
                      ? 'bg-emerald-600 text-white shadow-xs border border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'المنتجات التجارية (كتالوج المتجر)' : 'Storefront Products'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogSubTab('categories')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    catalogSubTab === 'categories'
                      ? 'bg-amber-600 text-white shadow-xs border border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <FolderTree className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'تصنيفات الملابس' : 'Clothing Categories'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogSubTab('sizes')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    catalogSubTab === 'sizes'
                      ? 'bg-sky-600 text-white shadow-xs border border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <Tag className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'دليل المقاسات المعتمدة' : 'Approved Sizes Matrix'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCatalogSubTab('colors')}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                    catalogSubTab === 'colors'
                      ? 'bg-indigo-600 text-white shadow-xs border border-transparent'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <Palette className="w-4 h-4 shrink-0" />
                  <span>{isAr ? 'دليل الألوان المعتمدة' : 'Approved Colors & Swatches'}</span>
                </button>
              </div>

              {catalogSubTab === 'products' && (
                <ProductsManager isAr={isAr} />
              )}

              {catalogSubTab === 'categories' && (
                <CategoriesManager isAr={isAr} />
              )}

              {catalogSubTab === 'sizes' && (
                <SizesManager isAr={isAr} />
              )}

              {catalogSubTab === 'colors' && (
                <ColorsManager isAr={isAr} />
              )}

              {catalogSubTab === 'models' && (
                <>
              {/* Models Operational KPI Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Approved Styles */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-blue-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      {isAr ? 'إجمالي الموديلات المعتمدة' : 'Total Approved Styles'}
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
                      {models.length} <span className="text-xs font-medium text-slate-400">{isAr ? 'موديل' : 'styles'}</span>
                    </div>
                    <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{models.filter((m) => m.status === 'active').length} {isAr ? 'نشط في خطوط الإنتاج' : 'active in production'}</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Size-Color SKUs */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      {isAr ? 'متغيرات المقاسات والألوان (SKUs)' : 'Size-Color SKUs'}
                    </span>
                    <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 leading-none">
                      {models.reduce((acc, m) => acc + (m.variants_count || 0), 0)} <span className="text-xs font-medium text-slate-400">{isAr ? 'صنف SKU' : 'SKUs'}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1 flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{isAr ? 'بأكواد باركود دولية مستقلة' : 'with international barcodes'}</span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                    <Palette className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Avg Target Manufacturing Cost */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-amber-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      {isAr ? 'متوسط تكلفة التصنيع المستهدفة' : 'Avg Target Cost'}
                    </span>
                    <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white leading-none">
                      {models.length > 0 ? (models.reduce((acc, m) => acc + (m.target_cost || 0), 0) / models.length).toFixed(1) : '0'} <span className="text-xs font-medium text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-1">
                      {isAr ? 'استناداً لحسابات بطاقة الـ BOM' : 'based on BOM calculations'}
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Avg Gross Retail Margin */}
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 transition-all flex items-start justify-between gap-3 group">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      {isAr ? 'متوسط هامش الربح الإجمالي' : 'Avg Retail Margin'}
                    </span>
                    <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
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
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 pt-1">
                      <span className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/40 rounded px-1.5 py-0.5 inline-block">
                        {isAr ? 'معدل ربحية التجزئة المتوقع' : 'projected gross retail margin'}
                      </span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filters, Search & View Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
                <div className="flex flex-1 items-center gap-2 max-w-md w-full relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 rtl:right-3 rtl:left-auto ltr:left-3 ltr:right-auto pointer-events-none" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder={isAr ? 'بحث باسم الموديل، الكود، أو الفئة...' : 'Search style name, code, or category...'}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs py-2 pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                  {modelSearch && (
                    <button
                      type="button"
                      onClick={() => setModelSearch('')}
                      className="absolute left-3 rtl:left-3 rtl:right-auto ltr:right-3 ltr:left-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3 py-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={modelCategoryFilter}
                      onChange={(e) => setModelCategoryFilter(e.target.value)}
                      className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
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
                  <div className="flex items-center border border-slate-200 dark:border-slate-700/80 rounded-xl p-1 bg-slate-100/90 dark:bg-slate-800/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setModelViewMode('table')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                        modelViewMode === 'table'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:-translate-y-0.5'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                      }`}
                      title={isAr ? 'عرض الجدول التشغيلي' : 'Table View'}
                    >
                      <TableIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline text-xs">{isAr ? 'عرض الجدول' : 'Table'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModelViewMode('cards')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
                        modelViewMode === 'cards'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700 hover:-translate-y-0.5'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium'
                      }`}
                      title={isAr ? 'عرض البطاقات' : 'Cards View'}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline text-xs">{isAr ? 'عرض البطاقات' : 'Cards'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* View 1: Industrial Matrix Table */}
              {modelViewMode === 'table' ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold font-sans">
                        <tr>
                          <th className="py-3.5 px-4">{isAr ? 'كود الموديل' : 'Style Code'}</th>
                          <th className="py-3.5 px-4">{isAr ? 'اسم الموديل والتصنيف' : 'Style & Category'}</th>
                          <th className="py-3.5 px-4">{isAr ? 'الموسم' : 'Season'}</th>
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
                                    <button
                                      type="button"
                                      title={isAr ? 'عرض بطاقة الـ BOM والمصفوفة' : 'View BOM & Matrix'}
                                      onClick={() => setSelectedModelForBom(m)}
                                      className="inline-flex items-center justify-center p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                                      aria-label={isAr ? 'عرض بطاقة الـ BOM والمصفوفة' : 'View BOM & Matrix'}
                                    >
                                      <Layers className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title={isAr ? 'تعديل بيانات الموديل والتسعير' : 'Edit Style & Pricing'}
                                      onClick={() => {
                                        setEditingModel(m);
                                        setIsCreateModelOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center p-2 rounded-xl text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                                      aria-label={isAr ? 'تعديل الموديل' : 'Edit Style'}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title={isAr ? 'طباعة كارت المواصفات الفنية' : 'Print Technical Spec Sheet'}
                                      onClick={() => {
                                        setSelectedModelForBom(m);
                                        setTimeout(() => window.print(), 300);
                                      }}
                                      className="inline-flex items-center justify-center p-2 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200/80 dark:border-indigo-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                                      aria-label={isAr ? 'طباعة المواصفات' : 'Print Specs'}
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      title={isAr ? 'حذف أو أرشفة الموديل' : 'Delete / Archive Style'}
                                      onClick={() => handleDeleteModel(m)}
                                      className="inline-flex items-center justify-center p-2 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/50 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer"
                                      aria-label={isAr ? 'حذف الموديل' : 'Delete Style'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                </div>
              ) : (
                /* View 2: Redesigned Modern Operational Model Cards */
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {paginatedModels.map((m) => {
                      const cost = m.target_cost || 0;
                      const wholesale = m.wholesale_price || 0;
                      const retail = m.retail_price || 0;
                      const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;

                      return (
                        <div
                          key={m.id}
                          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 space-y-3.5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                        >
                          <div className="space-y-3">
                            {/* Header: Code & Status */}
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {m.code}
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-sans border select-none bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 border-emerald-500/20 dark:border-emerald-500/30 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{isAr ? 'نشط' : 'Active'}</span>
                              </span>
                            </div>

                            {/* Title & Subtitle */}
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                                {m.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                <span>{m.category || (isAr ? 'عام' : 'General')}</span>
                                <span>•</span>
                                <span>{m.season || (isAr ? 'مستمر' : 'All-season')}</span>
                                {m.variants_count > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{m.variants_count} {isAr ? 'متغير' : 'variants'}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Financial Pricing Matrix Box */}
                            <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-center text-xs">
                              <div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                                  {isAr ? 'التكلفة' : 'Cost'}
                                </span>
                                <strong className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {cost.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                                  {isAr ? 'الجملة' : 'Wholesale'}
                                </span>
                                <strong className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                  {wholesale.toFixed(0)} <span className="text-[10px] font-normal text-slate-400">{isAr ? 'ج.م' : 'EGP'}</span>
                                </strong>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                                  {isAr ? 'التجزئة' : 'Retail'}
                                </span>
                                <strong className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                  {retail.toFixed(0)} <span className="text-[10px] font-normal text-emerald-600/70">{isAr ? 'ج.م' : 'EGP'}</span>
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 rounded px-1.5 py-0.5">
                                +{margin}% {isAr ? 'هامش' : 'margin'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                title={isAr ? 'عرض بطاقة الـ BOM والمصفوفة' : 'View BOM & Matrix'}
                                onClick={() => setSelectedModelForBom(m)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                                aria-label={isAr ? 'عرض بطاقة الـ BOM' : 'View BOM'}
                              >
                                <Layers className="w-3.5 h-3.5 shrink-0" />
                                <span>{isAr ? 'بطاقة الـ BOM' : 'BOM'}</span>
                              </button>

                              <button
                                type="button"
                                title={isAr ? 'تعديل بيانات الموديل والتسعير' : 'Edit Style & Pricing'}
                                onClick={() => {
                                  setEditingModel(m);
                                  setIsCreateModelOpen(true);
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                                aria-label={isAr ? 'تعديل الموديل' : 'Edit Style'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title={isAr ? 'طباعة كارت المواصفات الفنية' : 'Print Technical Spec Sheet'}
                                onClick={() => {
                                  setSelectedModelForBom(m);
                                  setTimeout(() => window.print(), 300);
                                }}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 shadow-2xs transition-all cursor-pointer"
                                aria-label={isAr ? 'طباعة المواصفات' : 'Print Specs'}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                title={isAr ? 'حذف أو أرشفة الموديل' : 'Delete / Archive Style'}
                                onClick={() => handleDeleteModel(m)}
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/40 shadow-2xs transition-all cursor-pointer"
                                aria-label={isAr ? 'حذف الموديل' : 'Delete Style'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                </>
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
                branches={branches}
                onOpenCreateItemModal={(cat) => {
                  setCreateInventoryItemCategory(cat || 'raw_materials');
                  setIsCreateInventoryItemModalOpen(true);
                }}
                onOpenStockMovementModal={(item) => setSelectedStockItem(item)}
                onOpenFabricCalcModal={() => setIsFabricCalcOpen(true)}
                onOpenReceiveCustomerMatModal={() => setIsReceiveCustomerMatModalOpen(true)}
                onOpenBarcodeLabelModal={(item) => setSelectedItemForBarcode(item)}
                onItemUpdated={(updated) => {
                  setInventoryItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it)));
                }}
                onItemDeleted={(deletedId) => {
                  setInventoryItems((prev) => prev.filter((it) => it.id !== deletedId));
                }}
                onRefreshData={loadBackendData}
                isLoading={isDataLoading}
                isAr={isAr}
              />
            </Suspense>
          )}

          {/* TAB 4: CUTTING & PRODUCTION */}
          {activeTab === 'cutting' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <ProductionTab
                productionOrders={productionOrders}
                cuttingOrders={cuttingOrders}
                cuttingBundles={cuttingBundles}
                qualityInspections={qualityInspections}
                employees={employees}
                isAr={isAr}
                onOpenCreateProdOrder={() => setIsCreateProdOrderModalOpen(true)}
                onOpenFabricCalc={() => setIsFabricCalcOpen(true)}
                onSelectProdOrderForCut={(order) => setSelectedProdOrderForCut(order)}
                onSelectProdOrderForQc={(order) => setSelectedProdOrderForQc(order)}
                onSelectBundleForTracker={(bundle) => setSelectedBundleForTracker(bundle)}
                onSelectBundleForQc={(bundle, order) => {
                  setSelectedBundleForQc(bundle);
                  if (order) setSelectedProdOrderForQc(order);
                }}
                onApproveProdOrder={async (orderId) => {
                  try {
                    if (orderId.length > 20 && !orderId.startsWith('po-')) {
                      await api.production.approveProductionOrder(orderId);
                    }
                    setProductionOrders((prev) =>
                      prev.map((o) => (o.id === orderId ? { ...o, status: 'approved' } : o))
                    );
                  } catch (err: any) {
                    alert(err.message || (isAr ? 'فشل اعتماد أمر الإنتاج' : 'Failed to approve production order'));
                  }
                }}
                onNavigateToTab={(tab) => handleTabChange(tab)}
              />
            </Suspense>
          )}

          {/* TAB 5: PROCUREMENT & VENDOR MANAGEMENT */}
          {activeTab === 'purchasing' && (
            <Suspense fallback={<TabLoadingFallback isAr={isAr} />}>
              <PurchasingTab
                purchaseOrders={purchaseOrders}
                suppliers={suppliers}
                goodsReceiptNotes={goodsReceiptNotes}
                supplierInvoices={supplierInvoices}
                warehouses={warehouses}
                setPurchaseOrders={setPurchaseOrders}
                setSuppliers={setSuppliers}
                setGoodsReceiptNotes={setGoodsReceiptNotes}
                setSupplierInvoices={setSupplierInvoices}
                onOpenCreateSupplier={() => setIsCreateSupplierModalOpen(true)}
                onOpenCreatePo={() => setIsCreatePoModalOpen(true)}
                onSelectPoForReceipt={(po) => setSelectedPoForReceipt(po)}
                onSelectPoForInvoice={(po) => setSelectedPoForInvoice(po)}
                onSelectSupplierForStatement={(s) => {
                  setSelectedSupplierForStatement(s);
                  setIsSupplierStatementOpen(true);
                }}
                isAr={isAr}
              />
            </Suspense>
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
                employees={employees}
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
              <WaslatWorshTab isAr={lang === 'ar'} onNavigateToSubscription={() => setActiveTab('subscription')} />
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
        defaultCategory={createInventoryItemCategory}
        onItemCreated={(newItem) => {
          setInventoryItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
          // Silently refresh inventory in the background without triggering full-app loading freeze
          api.inventory.getItems({ per_page: 100 }).then((res) => {
            const rawList = res?.data || (res as any)?.items;
            if (Array.isArray(rawList)) {
              const mappedItems: InventoryItem[] = rawList.map((it: any) => ({
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
          }).catch((err) => {
            console.warn('Silent inventory refresh warning:', err);
          });
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

      {/* MODAL 5: Create / Edit Garment Model Modal */}
      <CreateModelModal
        isOpen={isCreateModelOpen}
        onClose={() => {
          setIsCreateModelOpen(false);
          setEditingModel(null);
        }}
        modelToEdit={editingModel}
        onSuccess={handleModelSaved}
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
          // Refresh inventory items immediately so warehouse stock is updated
          api.inventory.getItems({ per_page: 100 }).then((res) => {
            const rawList = res?.data || (res as any)?.items;
            if (Array.isArray(rawList)) {
              const mappedItems: InventoryItem[] = rawList.map((it: any) => ({
                id: it.id,
                warehouse_id: it.warehouse_id,
                category: it.item_type || it.category || 'fabric',
                item_type: it.item_type || 'fabric',
                is_customer_owned: Boolean(it.is_customer_owned),
                code: it.code,
                name: it.name,
                unit_of_measure: it.unit_of_measure,
                current_balance: Number(it.current_balance),
                reserved_balance: Number(it.reserved_balance || 0),
                average_cost: Number(it.average_cost),
                reorder_level: Number(it.reorder_level),
                min_stock_level: Number(it.min_stock_level),
                warehouse: it.warehouse,
                technical_specs: it.technical_specs || undefined,
              }));
              setInventoryItems(mappedItems);
            }
          }).catch(console.warn);
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
          // Refresh suppliers to update balance on supplier cards
          api.suppliers.getSuppliers({ per_page: 100 }).then((res: any) => {
            const list = res?.data || res?.suppliers;
            if (Array.isArray(list)) setSuppliers(list);
          }).catch(console.warn);
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
        employees={employees}
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
        employees={employees}
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
        employees={employees}
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
        employees={employees}
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
